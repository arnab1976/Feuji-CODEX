"""Builds the full CODEX result for a record (routing, summary, EDS payload, audit log) and CSV exports."""
import csv
import io
import re
from datetime import datetime, timezone

from ..agents.pipeline import addendum_agent, gate_agent
from ..config import get_settings
from ..db import Record
from ..engine.curated import chart_text
from ..engine.parser import meta_header


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def line_text(chart: dict, line_id: str) -> str:
    for s in chart["sections"]:
        for ln in s["lines"]:
            if ln["id"] == line_id:
                return "".join(seg["t"] for seg in ln["segs"])
    return ""


def input_text(rec: Record) -> str:
    return chart_text(rec.curated_key) if rec.curated_key else meta_header(rec.meta) + "\n" + rec.text


def build_result(rec: Record) -> dict:
    chart, meta = rec.chart, rec.meta
    elig = gate_agent.eligibility(meta)
    lanes = gate_agent.route(chart, elig, rec.threshold, rec.decisions or {})
    keep = rec.delete_overrides or {}
    submitted = [x["icd10"] for x in lanes if x["final_status"] == "submit"]
    gap = chart.get("gap")
    if rec.query_response == "yes" and gap and elig["passed"]:
        submitted.append(gap["code"])
    deleted = [d["icd10"] for d in chart["deletes"] if not keep.get(d["icd10"])]
    held = [x["icd10"] for x in lanes if x["final_status"] == "held"]
    rejected = [x["icd10"] for x in lanes if x["final_status"] == "rejected"]
    if elig["passed"]:
        eds = {"submission": "EDS encounter (837P), linked", "encounter_id": meta.get("enc"), "member_id": meta.get("member"),
               "prism_patient_id": meta.get("prism"), "date_of_service": meta.get("dos"), "rendering_provider": meta.get("prov"),
               "provider_type": meta.get("ptype"), "add_dx": submitted, "delete_dx": deleted, "held_for_review": held}
    else:
        eds = {"submission": "NONE: eligibility gate closed", "encounter_id": meta.get("enc"),
               "reasons": [c["detail"] for c in elig["checks"] if c["status"] == "bad"]}
    query = {"text": addendum_agent.draft(gap, meta), "response": rec.query_response} if gap else None
    codes = [{"icd10": x["icd10"], "description": x["description"], "hcc_v28": x["hcc"], "hcc_label": x["hcc_label"],
              "confidence": x["confidence"], "meat": x["meat"], "source_line": x["source_line"],
              "source_text": line_text(chart, x["source_line"]), "rationale": x["rationale"], "review_reason": x["review_reason"],
              "lane": x["lane"], "final_status": x["final_status"], "coder_decision": x["coder_decision"]} for x in lanes]
    deletes = [{"icd10": d["icd10"], "description": d["description"], "hcc_v28": d["hcc"], "support_score": d["support"],
                "source_line": d["source_line"], "status": "kept (coder override)" if keep.get(d["icd10"]) else "delete submitted",
                "rationale": d["rationale"]} for d in chart["deletes"]]
    return {
        "codex_version": get_settings().version,
        "generated_at": now_iso(),
        "engine": "Curated demo chart" if rec.curated_key else f"CODEX agent pipeline ({chart.get('engine', 'rules')} mode)",
        "record": {"id": rec.id, "name": rec.name, "source": rec.source, "meta": meta},
        "eligibility": elig, "threshold": rec.threshold,
        "ocr": chart["ocr"], "knowledge_graph_context": chart["kg"], "entities": chart["entities"],
        "codes": codes, "deletes": deletes, "documentation_gap": gap, "physician_query": query,
        "interactions": chart["interactions"], "notes": chart["notes"],
        "summary": {"submitted": submitted, "held_for_review": held, "rejected_by_coder": rejected, "deleted": deleted, "queries": 1 if gap else 0},
        "eds_payload": eds,
        "audit_log": audit_rows(rec, elig, lanes),
    }


def audit_rows(rec: Record, elig: dict, lanes: list) -> list[dict]:
    t0, chart, rows = now_iso(), rec.chart, []
    add = lambda ev, code, detail, ts=None: rows.append({"timestamp": ts or t0, "event": ev, "code": code or "", "detail": detail})  # noqa: E731
    add("ingested", "", f"{rec.source}; {chart['fmt']}")
    add("eligibility", "", "; ".join(f"{c['check']}: {c['status']}" for c in elig["checks"]))
    for x in lanes:
        add("routed", x["icd10"], f"{x['lane']} (confidence {x['confidence']:.2f}, threshold {rec.threshold:.2f}, MEAT {x['meat'] or '-'}, source {x['source_line']})")
        d = (rec.decisions or {}).get(x["icd10"])
        if d:
            add("coder_decision", x["icd10"], "accepted" if d["d"] == "acc" else "rejected", d.get("t"))
    for d in chart["deletes"]:
        add("delete_overridden" if (rec.delete_overrides or {}).get(d["icd10"]) else "delete_flagged", d["icd10"], d["rationale"])
    if chart.get("gap"):
        add("query_sent", chart["gap"]["code"], "Non-leading physician query sent")
        if rec.query_response:
            add("query_response", chart["gap"]["code"], addendum_agent.RESPONSES[rec.query_response])
    add("submission", "", "Encounter-linked EDS payload prepared" if elig["passed"] else "No submission: eligibility gate closed")
    return rows


def _csv(rows: list[list]) -> str:
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerows(rows)
    return buf.getvalue()


def codes_csv(res: dict) -> str:
    rows = [["icd10", "description", "hcc_v28", "hcc_label", "confidence", "meat", "lane", "final_status", "coder_decision",
             "source_line", "source_text", "rationale"]]
    rows += [[x["icd10"], x["description"], x["hcc_v28"] or "", x["hcc_label"], x["confidence"], x["meat"], x["lane"],
              x["final_status"], x["coder_decision"] or "", x["source_line"], x["source_text"], x["rationale"]] for x in res["codes"]]
    rows += [[x["icd10"], x["description"], x["hcc_v28"], "", x["support_score"], "", "delete", x["status"], "", x["source_line"], "", x["rationale"]] for x in res["deletes"]]
    return _csv(rows)


def audit_csv(res: dict) -> str:
    return _csv([["timestamp", "event", "code", "detail"]] + [[a["timestamp"], a["event"], a["code"], a["detail"]] for a in res["audit_log"]])


def base_name(rec: Record) -> str:
    return "CODEX_" + re.sub(r"[^A-Za-z0-9-]", "_", str(rec.meta.get("enc") or rec.id))


def patient360_message(rec: Record) -> dict:
    res = build_result(rec)
    return {"type": "codex:result", "version": get_settings().version, "patientId": rec.meta.get("prism"),
            "encounterId": rec.meta.get("enc"), "dateOfService": rec.meta.get("dos"), "eligibility": res["eligibility"]["passed"],
            "submitted": res["summary"]["submitted"], "heldForReview": res["summary"]["held_for_review"], "deleted": res["summary"]["deleted"],
            "query": {"sent": True, "response": rec.query_response} if res["physician_query"] else None,
            "problemList": [{"icd10": x["icd10"], "description": x["description"], "hcc": x["hcc_v28"], "status": x["final_status"]} for x in res["codes"]]}
