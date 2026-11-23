"""Agent 04 — Confidence Gate Agent: eligibility check + calibrated routing.

Eligibility always runs BEFORE confidence: a diagnosis from an ineligible source is never submitted.
Lanes: auto (≥ threshold) · rev (coder review) · blocked (ineligible). Deletes are handled separately.
production : TODO(production) replace the rule-based confidence with Platt-calibrated XGBoost acceptance
             probabilities (scikit-learn CalibratedClassifierCV) trained on historical acceptance; recalibrate quarterly.
"""
import re

from .base import Agent

ACCEPTABLE_PROVIDERS = ["MD", "DO", "NP", "PA"]


class ConfidenceGateAgent(Agent):
    name = "Confidence Gate Agent"
    role = "QA router & submission decision engine"

    def eligibility(self, m: dict) -> dict:
        checks = []
        ok_p = m.get("ptype") in ACCEPTABLE_PROVIDERS
        checks.append({"check": "Acceptable provider type", "status": "ok" if ok_p else "bad",
                       "detail": f"{m.get('ptype')} is an acceptable risk-adjustment provider type" if ok_p
                       else f"{m.get('ptype') or 'Unknown'} notes cannot be a source of risk-adjustment diagnoses"})
        v = m.get("visit")
        vs = "ok" if v in ("Face-to-face", "Telehealth (video)") else "warn" if v == "Audio-only" else "bad"
        checks.append({"check": "Encounter type", "status": vs, "detail": f"{v} encounter" if vs == "ok" else
                       "Audio-only: acceptability depends on the payment-year rules, so every code goes to coder review" if vs == "warn" else
                       "No linkable encounter. Diagnoses cannot be submitted (unlinked chart reviews are excluded from CY2027 risk scores)"})
        d = bool(re.search(r"\d", str(m.get("dos") or "")))
        checks.append({"check": "Date of service", "status": "ok" if d else "bad", "detail": m.get("dos") if d else "Missing date of service"})
        checks.append({"check": "Note signed / authenticated", "status": "ok" if m.get("signed") else "bad",
                       "detail": "Signed by the rendering clinician" if m.get("signed") else "Unsigned note, so nothing can be submitted"})
        checks.append({"check": "Encounter ID (for linked submission)", "status": "ok" if m.get("enc") else "bad", "detail": m.get("enc") or "Missing encounter ID"})
        return {"passed": not any(c["status"] == "bad" for c in checks), "warning": any(c["status"] == "warn" for c in checks), "checks": checks}

    def route(self, chart: dict, elig: dict, threshold: float, decisions: dict) -> list[dict]:
        out = []
        for x in chart["codes"]:
            lane = "blocked" if not elig["passed"] else "auto" if (x["confidence"] >= threshold and not elig["warning"]) else "rev"
            dec = (decisions.get(x["icd10"]) or {}).get("d")
            final = ("submit" if lane == "auto" else "blocked" if lane == "blocked" else
                     "submit" if dec == "acc" else "rejected" if dec == "rej" else "held")
            why = ("Audio-only encounter: coder confirms acceptability." if lane == "rev" and elig["warning"] and x["confidence"] >= threshold
                   else x.get("review_reason") or "Below threshold; evidence pre-assembled.")
            out.append({**x, "lane": lane, "final_status": final, "review_reason": why, "coder_decision": dec})
        return out
