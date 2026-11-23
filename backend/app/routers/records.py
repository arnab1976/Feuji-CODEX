"""Journey API: records in → pipeline → coder decisions → result."""
import csv
import io
import json
import uuid

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agents.pipeline import gate_agent, ocr_agent, run_pipeline
from ..config import get_settings
from ..db import Record, get_db
from ..tenancy import meter_chart, tenant_id
from ..engine.curated import CURATED, chart_text
from ..engine.parser import default_meta, norm_meta, parse_text
from ..engine.simulator import sim_chart
from ..schemas import DecisionIn, DeleteOverrideIn, QueryResponseIn, RecordPatch, SimulateIn, TextRecordIn
from ..services.results import build_result, now_iso

router = APIRouter(prefix="/api", tags=["records"])
settings = get_settings()


def session_id(x_session_id: str | None = Header(default=None)) -> str:
    return (x_session_id or "default")[:64]


def serialize(rec: Record, full: bool = True) -> dict:
    elig = gate_agent.eligibility(rec.meta)
    out = {"id": rec.id, "name": rec.name, "source": rec.source, "curated_key": rec.curated_key, "meta": rec.meta,
           "stage": rec.stage, "processed": rec.chart is not None and rec.stage >= 3, "threshold": rec.threshold,
           "eligibility": elig, "created_at": rec.created_at.isoformat() if rec.created_at else None}
    if out["processed"]:
        s = build_result(rec)["summary"]
        out["summary"] = {k: (len(v) if isinstance(v, list) else v) for k, v in s.items()}
    if full:
        out.update(text=chart_text(rec.curated_key) if rec.curated_key else rec.text, chart=rec.chart,
                   decisions=rec.decisions, delete_overrides=rec.delete_overrides, query_response=rec.query_response,
                   preview=[{"title": s["title"], "lines": s["lines"]} for s in parse_text(chart_text(rec.curated_key) if rec.curated_key else rec.text)[1]])
        if out["processed"]:
            out["result"] = build_result(rec)
    return out


def scope(sid: str, tid: str):
    return (Record.session_id == sid) & (Record.tenant_id == tid)


def create_record(db: Session, sid: str, tid: str, text: str, source: str, name: str | None = None, meta: dict | None = None,
                  curated_key: str | None = None, patient360_id: str | None = None) -> Record:
    if curated_key:
        meta = dict(CURATED[curated_key]["meta"])
        text = chart_text(curated_key)
        name = CURATED[curated_key]["meta"]["patient"]
    else:
        header_meta, _ = parse_text(text)
        meta = default_meta(norm_meta({**header_meta, **(meta or {})}), patient360_id)
    rec = Record(id=str(uuid.uuid4()), session_id=sid, tenant_id=tid, name=name or meta.get("patient", "Record"), source=source,
                 curated_key=curated_key, text=text, meta=meta, threshold=settings.default_threshold,
                 decisions={}, delete_overrides={})
    db.add(rec)
    return rec


def get_rec(db: Session, sid: str, tid: str, rid: str) -> Record:
    rec = db.get(Record, rid)
    if not rec or rec.session_id != sid or rec.tenant_id != tid:
        raise HTTPException(404, "Record not found")
    return rec


def reset_processing(rec: Record):
    rec.chart, rec.stage, rec.decisions, rec.delete_overrides, rec.query_response = None, 0, {}, {}, None


def from_obj(o: dict) -> tuple[str, dict, str | None]:
    """CSV row / JSON object → (text, meta, name)."""
    meta = {k: v for k, v in {
        "patient": o.get("patient"), "member": o.get("member_id") or o.get("member"), "prism": o.get("patient_id") or o.get("prism_id") or o.get("prism"),
        "enc": o.get("encounter_id") or o.get("enc"), "dos": o.get("date_of_service") or o.get("dos"),
        "prov": o.get("provider") or o.get("prov"), "ptype": o.get("provider_type") or o.get("ptype"),
        "visit": o.get("visit_type") or o.get("visit"), "quality": o.get("source_quality") or o.get("quality"),
        "signed": o.get("signed"), **(o.get("meta") or {})}.items() if v not in (None, "")}
    text = o.get("text") or o.get("note_text") or ""
    if o.get("claim_dx"):
        text += f"\n\nClaim submitted for this encounter:\nDx on claim: {o['claim_dx']}\n"
    return text, norm_meta(meta), o.get("name") or o.get("record_id")


# ---------------------------------------------------------------- list / create
@router.get("/records")
def list_records(db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    recs = db.scalars(select(Record).where(scope(sid, tid)).order_by(Record.created_at)).all()
    return [serialize(r, full=False) for r in recs]


@router.post("/records/upload")
async def upload(files: list[UploadFile] = File(...), document_type: str = Form(""), db: Session = Depends(get_db), sid: str = Depends(session_id),
                 tid: str = Depends(tenant_id), x_patient_id: str | None = Header(default=None)):
    created, pending, errors = [], [], []
    kind = (document_type or "").strip()

    def stamp(label, meta):
        meta = dict(meta or {})
        if not kind:
            return label, meta
        meta["documentType"] = kind
        if "handwritten" in kind.lower() and not meta.get("quality"):
            meta["quality"] = "Handwritten"
        return f"{label} · {kind}", meta

    for f in files:
        data = await f.read()
        if len(data) > settings.max_upload_mb * 1024 * 1024:
            errors.append({"file": f.filename, "error": "File too large"})
            continue
        ext = (f.filename or "").rsplit(".", 1)[-1].lower()
        try:
            if ext == "csv":
                rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
                for row in rows:
                    row = {(k or "").strip().lower(): v for k, v in row.items()}
                    if not any((v or "").strip() for v in row.values()):
                        continue
                    text, meta, name = from_obj(row)
                    label, meta = stamp("Local upload (.csv)", meta)
                    created.append(create_record(db, sid, tid, text, label, name, meta, patient360_id=x_patient_id))
            elif ext == "json":
                j = json.loads(data.decode("utf-8"))
                items = j.get("records", j) if isinstance(j, dict) else j
                for o in (items if isinstance(items, list) else [items]):
                    text, meta, name = from_obj(o)
                    label, meta = stamp("Local upload (.json)", meta)
                    created.append(create_record(db, sid, tid, text, label, name, meta, patient360_id=x_patient_id))
            else:
                r = ocr_agent.extract_text(f.filename or "file", data)
                if r["needs_text"]:
                    pending.append({"file": f.filename, "quality": r["quality"], "note": r["note"]})
                else:
                    meta = {"quality": r["quality"]} if r["quality"] else {}
                    label, meta = stamp(f"Local upload (.{ext})", meta)
                    created.append(create_record(db, sid, tid, r["text"], label, f.filename, meta, patient360_id=x_patient_id))
        except Exception as exc:  # noqa: BLE001
            errors.append({"file": f.filename, "error": str(exc)})
    db.commit()
    return {"created": [serialize(r, full=False) for r in created], "pending": pending, "errors": errors}


@router.post("/records/text")
def add_text(body: TextRecordIn, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id), x_patient_id: str | None = Header(default=None)):
    rec = create_record(db, sid, tid, body.text, body.source, body.name, norm_meta(body.meta), patient360_id=x_patient_id)
    db.commit()
    return serialize(rec)


def _source_label(given: str | None, fallback: str) -> str:
    return ((given or "").strip() or fallback)[:120]


@router.post("/records/simulate")
def simulate(body: SimulateIn, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id), x_patient_id: str | None = Header(default=None)):
    out = []
    if body.kind == "curated":
        if not body.key:
            raise HTTPException(422, "key required")
        label = _source_label(body.source, "Simulated (curated)")
        existing = db.scalars(select(Record).where(scope(sid, tid), Record.curated_key == body.key)).first()
        if existing:
            if body.source:
                existing.source = label
            fresh = CURATED[body.key]["meta"].get("prism")
            if fresh and str(existing.meta.get("prism", "")).startswith("PRISM-"):
                existing.meta = {**existing.meta, "prism": fresh}
            out.append(existing)
        else:
            out.append(create_record(db, sid, tid, "", label, curated_key=body.key))
    else:
        label = _source_label(body.source, "Simulated (random)" if body.count == 1 else "Simulated (batch)")
        for _ in range(body.count):
            s = sim_chart(uuid.uuid4().int % 10**9, x_patient_id)
            out.append(create_record(db, sid, tid, s["text"], label, s["meta"]["patient"], patient360_id=x_patient_id))
    db.commit()
    return [serialize(r, full=False) for r in out]


@router.delete("/records")
def clear(db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    for r in db.scalars(select(Record).where(scope(sid, tid))).all():
        db.delete(r)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- one record
@router.get("/records/{rid}")
def get_record(rid: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    return serialize(get_rec(db, sid, tid, rid))


@router.patch("/records/{rid}")
def patch_record(rid: str, body: RecordPatch, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = get_rec(db, sid, tid, rid)
    if body.meta is not None:
        rec.meta = {**rec.meta, **norm_meta(body.meta)}
        if "signed" in body.meta:
            rec.meta["signed"] = body.meta["signed"] in (True, "yes", "true", 1)
        if body.meta.get("ptype"):
            rec.meta["ptype"] = body.meta["ptype"]
        reset_processing(rec)
    if body.name:
        rec.name = body.name
    if body.threshold is not None:
        rec.threshold = round(body.threshold, 2)
    db.commit()
    return serialize(rec)


@router.delete("/records/{rid}")
def delete_record(rid: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    db.delete(get_rec(db, sid, tid, rid))
    db.commit()
    return {"ok": True}


@router.post("/records/{rid}/process")
def process(rid: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = get_rec(db, sid, tid, rid)
    reset_processing(rec)
    rec.chart = run_pipeline(rec.text, rec.meta, rec.curated_key)
    rec.stage = 3
    meter_chart(db, rec)
    db.commit()
    return serialize(rec)


@router.post("/records/process-all")
def process_all(db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    recs = db.scalars(select(Record).where(scope(sid, tid))).all()
    for rec in recs:
        if rec.chart is None or rec.stage < 3:
            rec.chart, rec.stage = run_pipeline(rec.text, rec.meta, rec.curated_key), 3
            meter_chart(db, rec)
    db.commit()
    return [serialize(r, full=False) for r in recs]


def _processed(db, sid, tid, rid) -> Record:
    rec = get_rec(db, sid, tid, rid)
    if rec.chart is None:
        raise HTTPException(409, "Run the pipeline first (POST /process)")
    return rec


@router.post("/records/{rid}/decisions")
def decide(rid: str, body: DecisionIn, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = _processed(db, sid, tid, rid)
    d = dict(rec.decisions or {})
    if body.decision == "clear":
        d.pop(body.code, None)
    else:
        d[body.code] = {"d": "acc" if body.decision == "accept" else "rej", "t": now_iso()}
    rec.decisions = d
    db.commit()
    return serialize(rec)


@router.post("/records/{rid}/deletes")
def delete_override(rid: str, body: DeleteOverrideIn, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = _processed(db, sid, tid, rid)
    rec.delete_overrides = {**(rec.delete_overrides or {}), body.code: body.keep}
    db.commit()
    return serialize(rec)


@router.post("/records/{rid}/query-response")
def query_response(rid: str, body: QueryResponseIn, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = _processed(db, sid, tid, rid)
    rec.query_response = body.response
    db.commit()
    return serialize(rec)


@router.get("/records/{rid}/result")
def result(rid: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    return build_result(_processed(db, sid, tid, rid))
