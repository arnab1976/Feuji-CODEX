"""ZIP / file exports for one record or the whole session."""
import io
import json
import zipfile
from datetime import datetime

from ..db import Record
from .results import audit_csv, base_name, build_result, codes_csv, input_text


def record_files(rec: Record, prefix: str = "") -> list[tuple[str, str]]:
    res, b = build_result(rec), base_name(rec)
    files = [(f"{prefix}{b}_results.json", json.dumps(res, indent=2, ensure_ascii=False)),
             (f"{prefix}{b}_codes.csv", codes_csv(res)),
             (f"{prefix}{b}_audit_log.csv", audit_csv(res)),
             (f"{prefix}{b}_eds_payload.json", json.dumps(res["eds_payload"], indent=2, ensure_ascii=False)),
             (f"{prefix}{b}_input_record.txt", input_text(rec))]
    if res["physician_query"]:
        files.append((f"{prefix}{b}_physician_query.txt", res["physician_query"]["text"]))
    return files


def make_zip(files: list[tuple[str, str]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files:
            z.writestr(name, content)
    return buf.getvalue()


def session_zip(records: list[Record], version: str) -> bytes:
    import csv
    files, s = [], io.StringIO()
    w = csv.writer(s, lineterminator="\n")
    w.writerow(["record_id", "name", "source", "prism_id", "encounter_id", "dos", "provider_type", "eligible", "codes_found",
                "submitted", "held_for_review", "rejected", "deleted", "queries"])
    for i, rec in enumerate(records, 1):
        res = build_result(rec)
        files += record_files(rec, f"{i:02d}_{base_name(rec)}/")
        sm, m = res["summary"], rec.meta
        w.writerow([rec.id, rec.name, rec.source, m.get("prism"), m.get("enc"), m.get("dos"), m.get("ptype"),
                    "yes" if res["eligibility"]["passed"] else "no", len(res["codes"]), " ".join(sm["submitted"]),
                    " ".join(sm["held_for_review"]), " ".join(sm["rejected_by_coder"]), " ".join(sm["deleted"]), sm["queries"]])
    readme = (f"CODEX session export (v{version}, {datetime.utcnow().isoformat()}Z)\nOne folder per record: results.json, codes.csv, "
              "audit_log.csv, eds_payload.json, input_record.txt, physician_query.txt (if any).\nSynthetic / demo data. "
              "Codes still pending coder review are listed as held_for_review.\n")
    return make_zip([("session_summary.csv", s.getvalue()), ("README.txt", readme)] + files)
