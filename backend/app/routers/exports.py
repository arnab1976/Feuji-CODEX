"""Downloads: per-record files, per-record ZIP, whole-session ZIP."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agents.pipeline import run_pipeline
from ..config import get_settings
from ..db import Record, get_db
from ..services.exporter import make_zip, record_files, session_zip
from ..services.results import audit_csv, base_name, build_result, codes_csv, input_text
from .records import _processed, get_rec, scope, session_id
from ..tenancy import meter_chart, tenant_id

router = APIRouter(prefix="/api", tags=["exports"])
MEDIA = {"json": "application/json", "csv": "text/csv", "txt": "text/plain", "zip": "application/zip"}


def file_response(name: str, content, ext: str) -> Response:
    return Response(content, media_type=MEDIA[ext] + ("" if ext == "zip" else "; charset=utf-8"),
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("/records/{rid}/export/{kind}")
def export_record(rid: str, kind: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    rec = get_rec(db, sid, tid, rid)
    if kind == "input":  # available before processing
        return file_response(f"{base_name(rec)}_input_record.txt", input_text(rec), "txt")
    rec = _processed(db, sid, tid, rid)
    res, b = build_result(rec), base_name(rec)
    if kind == "zip":
        return file_response(f"{b}_outputs.zip", make_zip(record_files(rec)), "zip")
    if kind == "json":
        return file_response(f"{b}_results.json", json.dumps(res, indent=2, ensure_ascii=False), "json")
    if kind == "codes":
        return file_response(f"{b}_codes.csv", codes_csv(res), "csv")
    if kind == "audit":
        return file_response(f"{b}_audit_log.csv", audit_csv(res), "csv")
    if kind == "eds":
        return file_response(f"{b}_eds_payload.json", json.dumps(res["eds_payload"], indent=2), "json")
    if kind == "input":
        return file_response(f"{b}_input_record.txt", input_text(rec), "txt")
    if kind == "query" and res["physician_query"]:
        return file_response(f"{b}_physician_query.txt", res["physician_query"]["text"], "txt")
    raise HTTPException(404, "Unknown export")


@router.get("/session/export")
def export_session(db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    recs = db.scalars(select(Record).where(scope(sid, tid)).order_by(Record.created_at)).all()
    if not recs:
        raise HTTPException(404, "No records in this session")
    for rec in recs:
        if rec.chart is None:
            rec.chart, rec.stage = run_pipeline(rec.text, rec.meta, rec.curated_key), 3
            meter_chart(db, rec)
    db.commit()
    stamp = datetime.now().strftime("%Y-%m-%d-%H-%M")
    return file_response(f"CODEX_session_{stamp}.zip", session_zip(recs, get_settings().version), "zip")
