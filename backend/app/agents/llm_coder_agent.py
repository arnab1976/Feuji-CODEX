"""Agent 03 — LLM HCC Coder Agent: produces the complete ICD-10 / CMS-HCC V28 code set with rationale.

rules mode : deterministic coder that applies MEAT evidence, specificity, ICD-10-CM combination rules
             (I11/I12/I13), BMI and cancer-status logic, two-way coding against the claim, documentation-gap
             detection (lab evidence without a diagnosis) and V28 interaction flags.
production : TODO(production) send record + NER candidates + prior submissions + V28 maps to the fine-tuned
             LLM (settings.llm_provider / llm_model) and require the JSON schema returned by `code()`.
             Every code MUST cite a source line id; drop uncited codes.
"""
import re

from ..engine.dictionary import ARE, CLAIM_CODE, CODEINFO, ERE, KGTXT, MEDG, MRE, TRE, ACTIVE_TX
from .base import Agent

MEAT_WORDS = {"M": "monitored", "E": "evaluated", "A": "assessed", "T": "treated"}
DEMENTIA_MAP = {"F03.90": ("F02.80", "Dementia in other diseases classified elsewhere, unspecified severity"),
                "F03.B0": ("F02.B0", "Dementia in other diseases classified elsewhere, moderate"),
                "F03.C0": ("F02.C0", "Dementia in other diseases classified elsewhere, severe")}


def meat_of(line: dict) -> set:
    t, s = line["t"], set()
    if MRE.search(t): s.add("M")
    if ERE.search(t): s.add("E")
    if line["ap"] or ARE.search(t): s.add("A")
    if TRE.search(t): s.add("T")
    return s


class LLMHCCCoderAgent(Agent):
    name = "LLM HCC Coder Agent"
    role = "Fine-tuned clinical chart coder"

    def code(self, layout: dict, ner: dict, meta: dict) -> dict:
        if self.mode("coder_mode") == "production":
            return self._code_with_llm(layout, ner, meta)
        return self._code_with_rules(layout, ner, meta)

    def _code_with_llm(self, layout, ner, meta):  # pragma: no cover - integration hook
        raise NotImplementedError(
            "TODO(production): call the fine-tuned LLM. Prompt with numbered source lines (id: text), the NER "
            "candidates and V28 maps; require JSON {codes:[{icd10,description,hcc,hcc_label,confidence,meat,"
            "source_line,rationale}], deletes:[...], gap:{...}|null}. Validate every source_line exists.")

    # ------------------------------------------------------------------ rules
    def _code_with_rules(self, layout: dict, ner: dict, meta: dict) -> dict:
        q = layout["penalty"]
        full = ner["full_text"]
        groups: dict[str, list] = {}
        for c in ner["candidates"]:
            groups.setdefault(c["entry"]["g"], []).append(c)
        codes, notes = [], []
        principal_given = False
        for g, arr in groups.items():
            best = sorted(arr, key=lambda c: c["ei"])[0]
            src = sorted([c for c in arr if c["ei"] == best["ei"]], key=lambda c: 0 if c["line"]["ap"] else 1)[0]
            e = dict(best["entry"])
            meat = set()
            for c in arr:
                meat |= meat_of(c["line"])
            if g in MEDG and MEDG[g].search(full):
                meat.add("T")
            ap = any(c["line"]["ap"] for c in arr)
            hist = all(c["hist"] for c in arr)
            if e.get("cancer"):
                if ACTIVE_TX.search(full):
                    hist = False
                elif hist:
                    e.update(c=e["histC"], d=e["histD"], h=None, hn="No V28 HCC (personal history)")
                if e["g"] == "brca" and e["h"]:
                    t = src["line"]["t"]
                    if re.search(r"\bleft\b|\bL\s+breast|breast ca\s*L\b|\(L\)", t, re.I):
                        e.update(c="C50.912", d="Malignant neoplasm of unspecified site of left female breast")
                    elif re.search(r"\bright\b|\bR\s+breast|breast ca\s*R\b|\(R\)", t, re.I):
                        e.update(c="C50.911", d="Malignant neoplasm of unspecified site of right female breast")
            if g == "dem" and "alz" in groups and e["c"] in DEMENTIA_MAP:
                code, desc = DEMENTIA_MAP[e["c"]]
                e.update(c=code, d=desc + ", without behavioural disturbance")
            n = len(meat)
            spec = 0.14 if e.get("spec") == 1 else (e.get("spec") or 0) * 0.14
            p = 0.66 + 0.06 * n + (0.1 if ap else 0) - spec - (0.2 if hist else 0) - q
            p = round(max(0.3, min(0.98, p)), 2)
            ml = [l for l in "MEAT" if l in meat]
            r = ", ".join(MEAT_WORDS[l] for l in ml) or "mentioned only"
            r = r[0].upper() + r[1:] + (" in the assessment & plan." if ap else " in the note.")
            if e.get("spec") == 1: r += " Documentation is unspecified; a specificity query may help."
            if e.get("cancer") and e["h"]: r += " Active treatment documented, so coded as current cancer (ICD-10-CM I.C.2.d)."
            if e.get("cancer") and not e["h"]: r += " No current treatment found, so coded as history of cancer."
            if not e["h"]: r += " Not risk-adjusting under V28."
            why = ("Unspecified documentation; consider a specificity query." if e.get("spec") == 1 else
                   "Historical mention; confirm current status." if hist else
                   "Handwritten source; verify against the image." if q >= 0.1 else
                   "Limited MEAT evidence in the note." if n < 3 else "Below threshold; evidence pre-assembled.")
            flag = "Principal" if ap and not principal_given else "Secondary"
            principal_given = principal_given or ap
            codes.append({"icd10": e["c"], "description": e["d"], "hcc": e["h"], "hcc_label": e["hn"], "confidence": p,
                          "meat": "".join(ml), "source_line": src["line"]["id"], "rationale": r, "review_reason": why,
                          "group": g, "matched_text": src["match"], "flag": flag})

        def has(g):
            return next((x for x in codes if x["group"] == g), None)

        htn, hf, ckd = has("htn"), has("hf"), has("ckd")
        if htn and hf and ckd:
            htn.update(icd10="I13.0", description="Hypertensive heart and CKD with heart failure and stage 1–4 / unspecified CKD",
                       hcc="226", hcc_label="Heart Failure (same HCC; no extra weight)", confidence=round(max(0.3, htn["confidence"] - 0.08), 2),
                       review_reason="Guideline-based combination code; coder confirms.",
                       rationale="Hypertension, heart failure and CKD documented together; ICD-10-CM I.C.9.a presumes linkage. Replaces I10.")
            notes.append("I10 replaced by combination code I13.0 (ICD-10-CM I.C.9.a).")
        elif htn and hf:
            htn.update(icd10="I11.0", description="Hypertensive heart disease with heart failure", hcc="226", hcc_label="Heart Failure (same HCC)",
                       confidence=round(max(0.3, htn["confidence"] - 0.08), 2), review_reason="Guideline-based combination code; coder confirms.",
                       rationale="Hypertension and heart failure documented together; ICD-10-CM presumes linkage. Replaces I10.")
            notes.append("I10 replaced by combination code I11.0.")
        elif htn and ckd and ckd["icd10"] != "N18.6":
            htn.update(icd10="I12.9", description="Hypertensive CKD with stage 1–4 or unspecified CKD", hcc=None, hcc_label="No V28 HCC",
                       rationale="Hypertension and CKD documented together; ICD-10-CM presumes linkage. Replaces I10.")
            notes.append("I10 replaced by combination code I12.9.")

        lines = layout["lines"]
        ob = has("obes")
        if ob:
            b = re.search(r"bmi[^0-9\n]{0,6}(\d{2}(\.\d)?)", full, re.I)
            if b and float(b.group(1)) >= 40:
                v = float(b.group(1))
                z = (("Z68.41", "40.0–44.9") if v < 45 else ("Z68.42", "45.0–49.9") if v < 50 else
                     ("Z68.43", "50.0–59.9") if v < 60 else ("Z68.44", "60.0–69.9") if v < 70 else ("Z68.45", "70 or greater"))
                ln = next((x for x in lines if re.search("bmi", x["t"], re.I) and not x["claim"]), None)
                codes.append({"icd10": z[0], "description": f"Body mass index {z[1]}, adult", "hcc": "48", "hcc_label": "Morbid Obesity (hierarchy: counted once)",
                              "confidence": round(max(0.3, ob["confidence"] - 0.02), 2), "meat": "ME", "source_line": ln["id"] if ln else ob["source_line"],
                              "rationale": "BMI from the record; codable because the clinician documented morbid obesity.",
                              "review_reason": "Below threshold; evidence pre-assembled.", "group": "bmi", "matched_text": b.group(0), "flag": "Secondary"})
        bc = has("brca")
        if bc and bc["hcc"]:
            ai = re.search(r"anastrozole|letrozole|exemestane", full, re.I)
            tm = re.search(r"tamoxifen", full, re.I)
            if ai or tm:
                rx = r"anastrozole|letrozole|exemestane" if ai else "tamoxifen"
                ln = next((x for x in lines if re.search(rx, x["t"], re.I)), None)
                codes.append({"icd10": "Z79.811" if ai else "Z79.810",
                              "description": "Long-term (current) use of aromatase inhibitors" if ai else "Long-term (current) use of selective estrogen receptor modulators",
                              "hcc": None, "hcc_label": "No V28 HCC", "confidence": 0.93, "meat": "T", "source_line": ln["id"] if ln else bc["source_line"],
                              "rationale": "Supports active-treatment status of the cancer.", "review_reason": "", "group": "zrx",
                              "matched_text": (ai or tm).group(0), "flag": "Secondary"})
        dep = has("dep")
        if dep and dep["icd10"] == "F32.A" and re.search(r"recurrent|second episode|2nd episode", full, re.I) and re.search(r"phq-?9[^0-9]{0,10}(1\d|2\d)", full, re.I):
            notes.append("Depression: the note suggests a recurrent episode and an elevated PHQ-9, but severity is not provider-documented. "
                         "Coded F32.A (no HCC); consider a specificity query. Severity is never inferred from a score.")
        if has("alz") and has("dem"):
            notes.append("Dementia hierarchy: the Alzheimer's and dementia codes are both reported; only the highest-severity dementia HCC counts.")
        if has("pvd"):
            notes.append("PVD (I73.9) is documented for care but not risk-adjusting under V28.")

        # documentation gaps (evidence without a diagnosis) → Addendum AI, never a code
        gap = None
        eg = [int(m.group(1)) for m in re.finditer(r"egfr[^0-9\n]{0,12}(\d{1,3})", full, re.I) if 0 < int(m.group(1)) < 200]
        if not has("ckd") and len([v for v in eg if 15 <= v < 60]) >= 2:
            last = eg[-1]
            st = ("N18.31", "329", "3a") if last >= 45 else ("N18.32", "328", "3b") if last >= 30 else ("N18.4", "327", "4")
            gap = {"finding": f"eGFR values {', '.join(map(str, eg))} are recorded without a documented renal diagnosis.",
                   "code": st[0], "hcc": st[1], "kind": "CKD", "stage": st[2], "indicators": [f"eGFR {v} mL/min/1.73m²" for v in eg]}
        elif not has("dm"):
            a = re.search(r"(hba1c|a1c)[^0-9\n]{0,10}(\d{1,2}(\.\d)?)\s*%", full, re.I)
            if a and float(a.group(2)) >= 6.5:
                gap = {"finding": f"HbA1c {a.group(2)}% is recorded without a documented diabetes diagnosis.", "code": "E11.9", "hcc": "38",
                       "kind": "diabetes", "stage": None, "indicators": [f"HbA1c {a.group(2)}%"]}

        # two-way coding: claim diagnoses without support → delete
        deletes = []
        for x in (l for l in lines if l["claim"]):
            for cd in CLAIM_CODE.findall(x["t"]):
                if any(k["icd10"] == cd or k["icd10"][:3] == cd[:3] for k in codes) or any(d["icd10"] == cd for d in deletes):
                    continue
                info = CODEINFO.get(cd)
                if info and info["h"]:
                    deletes.append({"icd10": cd, "description": info["d"], "hcc": info["h"], "support": 0.05, "source_line": x["id"],
                                    "rationale": "On the submitted claim, but there is no documentation, assessment or treatment of this condition anywhere in the note. Recommend deleting it from the encounter submission."})
                else:
                    notes.append(f"{cd} appears on the claim but is not documented in the note. It is non-HCC, so it is flagged for billing review only.")

        inter = []
        def hc(g):
            x = has(g)
            return x and x["hcc"]
        if hc("hf"):
            if hc("dm"): inter.append("DIABETES × HF")
            if hc("copd"): inter.append("HF × CHR LUNG")
            if hc("ckd"): inter.append("HF × KIDNEY")
            if hc("af"): inter.append("HF × HCC238")
        kg = list(dict.fromkeys(KGTXT[x["group"]] for x in codes if x["group"] in KGTXT)) or ["No risk-adjusting concepts found in the knowledge graph for this note."]
        return {"codes": codes, "deletes": deletes, "gap": gap, "notes": notes, "interactions": inter, "kg": kg}
