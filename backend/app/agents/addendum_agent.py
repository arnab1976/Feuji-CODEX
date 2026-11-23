"""Agent 05 — Addendum AI Agent: compliant, non-leading physician documentation queries.

Guardrails (see Compliance tab): multiple-choice, includes "not assessed / undetermined", no payment language,
sent within 24 h, amendment only if it reflects the assessment at that visit.
production : TODO(production) draft with the LLM using the same template, then send via the physician portal
             API / AWS SES and track the response in PostgreSQL.
"""
from .base import Agent


class AddendumAIAgent(Agent):
    name = "Addendum AI Agent"
    role = "Physician documentation query"

    RESPONSES = {
        "yes": "Condition documented; addendum signed and dated, code added to the same linked encounter",
        "next": "Not assessed at that visit; nothing coded. The condition stays on the coder worklist for a later encounter",
        "und": "Clinically undetermined; query closed, nothing coded",
    }

    def draft(self, gap: dict, meta: dict) -> str:
        first = ("Diabetes mellitus (please specify type and any complications)" if gap.get("kind") == "diabetes"
                 else "Chronic kidney disease (please specify stage)")
        ind = "\n".join(f" - {x}" for x in (gap.get("indicators") or [gap.get("finding", "")]))
        return (f"PHYSICIAN DOCUMENTATION QUERY (non-leading)\nTo: {meta.get('prov')}\n"
                f"Re: {meta.get('patient')} · DOS {meta.get('dos')} · Encounter {meta.get('enc')}\n"
                f"Sent: within 24 hours of the encounter\n\nThe record for this visit includes the following clinical indicators:\n{ind}\n\n"
                "Based on your clinical judgement at the time of this visit, please clarify the significance of these findings:\n"
                f" [ ] {first}\n [ ] Other condition (please specify)\n [ ] Not clinically significant\n"
                " [ ] Not assessed at this visit / clinically undetermined\n\n"
                "This query does not relate to payment. Please amend the note only if the amendment reflects your assessment at this visit.\n")
