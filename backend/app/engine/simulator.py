"""Synthetic (simulated) medical records and the downloadable sample pack."""
import csv
import io
import json
import random
from pathlib import Path

from .curated import chart_text
from .parser import meta_header

_BANK = json.loads((Path(__file__).resolve().parent.parent / "data" / "simbank.json").read_text(encoding="utf-8"))
SIMBANK, SNAMES, SPROV = _BANK["SIMBANK"], _BANK["SNAMES"], _BANK["SPROV"]

CSV_COLUMNS = ["record_id", "patient", "member_id", "prism_id", "encounter_id", "date_of_service", "provider",
               "provider_type", "visit_type", "source_quality", "signed", "note_text", "claim_dx"]


def sim_chart(seed: int | None = None, patient360_id: str | None = None) -> dict:
    r = random.Random(seed)
    n = 3 + r.randrange(3)
    bank = SIMBANK[:]
    r.shuffle(bank)
    items, groups = [], set()
    for b in bank:
        g = b["g"].rstrip("2")
        if g in groups:
            continue
        groups.add(g)
        items.append(b)
        if len(items) >= n:
            break
    v = {"a1c": f"{7 + r.random() * 2.5:.1f}", "egfr": str(30 + r.randrange(14)), "bmi": f"{40 + r.random() * 6:.1f}",
         "phq": str(10 + r.randrange(9)), "bp": f"{124 + r.randrange(16)}/{72 + r.randrange(10)}"}
    fill = lambda s: s.format(**v) if s else s  # noqa: E731
    pv = r.choice(SPROV[:4]) if r.random() < 0.85 else SPROV[4]
    mm, dd = f"{1 + r.randrange(10):02d}", f"{1 + r.randrange(27):02d}"
    meta = {"patient": r.choice(SNAMES), "member": f"MA-{200000 + r.randrange(99999)}",
            "prism": patient360_id or f"PT-{70000 + r.randrange(29999)}", "enc": f"ENC-2026-{mm}{dd}-{10000 + r.randrange(89999)}",
            "dos": f"2026-{mm}-{dd}", "prov": pv[0], "ptype": pv[1],
            "visit": "Face-to-face" if r.random() < 0.8 else ("Telehealth (video)" if r.random() < 0.6 else "Audio-only"),
            "quality": r.choice(["Digital text", "Digital text", "Scanned", "Handwritten"]), "signed": r.random() < 0.93}
    labs = list(dict.fromkeys(fill(b["lab"]) for b in items if b.get("lab")))
    if "ckd" not in groups and r.random() < 0.4:
        labs.append(f"eGFR {46 + r.randrange(12)} (Jun 2026) · eGFR {41 + r.randrange(14)} (Sep 2026)")
    meds = [fill(b["med"]) for b in items if b.get("med")]
    vit = [f"BP {v['bp']} · HR {62 + r.randrange(20)}"] + [fill(b["vit"]) for b in items if b.get("vit")]
    hpi = r.choice(["Feels generally well.", "Reports more fatigue this month.",
                    "Accompanied by daughter; reports adherence to medications.", "Mild dyspnoea on exertion, otherwise well."])
    body = f"History of present illness:\nFollow-up of chronic conditions. {hpi}\n\nVitals:\n{' · '.join(vit)}\n"
    if labs:
        body += "\nLabs reviewed today:\n" + "\n".join(labs) + "\n"
    if meds:
        body += "\nMedications:\n" + ", ".join(meds) + "\n"
    body += "\nAssessment & plan:\n" + "\n".join(f"{i + 1}. {fill(b['ap'])}" for i, b in enumerate(items)) + "\n"
    claim = ""
    if r.random() < 0.45:
        extra = [c for c in ["I50.9", "E11.9", "J44.9", "I48.91", "F33.1"] if not any(b["code"][:3] == c[:3] for b in items)]
        claim = ", ".join([b["code"] for b in items] + [r.choice(extra)])
    text = meta_header(meta) + "\n" + body + (f"\nClaim submitted for this encounter:\nDx on claim: {claim}\n" if claim else "")
    return {"meta": meta, "body": body, "claim": claim, "text": text}


def batch_csv(seeds: list[int]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(CSV_COLUMNS)
    for i, s in enumerate(seeds):
        c = sim_chart(s)
        m = c["meta"]
        w.writerow([f"REC-{i + 1:03d}", m["patient"], m["member"], m["prism"], m["enc"], m["dos"], m["prov"], m["ptype"],
                    m["visit"], m["quality"], "yes" if m["signed"] else "no", c["body"], c["claim"]])
    return buf.getvalue()


README = """CODEX simulated sample data (synthetic, not real patients)

Upload any of these files in Journey > Step 1 > "Upload from your computer".

.txt / .md : one visit note. Optional header lines at the top:
  Patient:, Member ID:, External patient ID:, Encounter ID:, Date of service:, Provider:, Provider type: (MD/DO/NP/PA/RN/aide),
  Visit type: (Face-to-face / Telehealth video / Audio-only), Source quality: (Digital text / Scanned / Handwritten), Signed: (yes/no)
  Section headings end with a colon, e.g. "Assessment & plan:"
  A line starting "Dx on claim:" lists diagnosis codes already on the claim (used for two-way coding).

.csv  : batch, one record per row. Columns: """ + ", ".join(CSV_COLUMNS) + """
.json : one record or an array of records, each {"name":..., "meta":{...}, "text":"..."} or the CSV column names.
.pdf  : PDFs with a text layer are read automatically; scanned PDFs / images need OCR (production) or pasted text (demo).
"""


def sample_pack() -> dict[str, str]:
    one = sim_chart(201)
    single = {"name": "Simulated record (seed 201)", "meta": one["meta"],
              "text": one["body"] + (f"\nClaim submitted for this encounter:\nDx on claim: {one['claim']}\n" if one["claim"] else "")}
    template = "\n".join(batch_csv([301]).split("\n")[:2]) + "\n"
    return {
        "README_input_format.txt": README,
        "chart_A_clean_office_visit.txt": chart_text("A"),
        "chart_B_fax_with_claim.txt": chart_text("B"),
        "chart_C_handwritten_np_home_visit.txt": chart_text("C"),
        "batch_5_records.csv": batch_csv([101, 102, 103, 104, 105]),
        "single_record.json": json.dumps(single, indent=2),
        "record_template.csv": template,
    }
