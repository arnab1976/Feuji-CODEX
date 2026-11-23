"""Orchestrates the five agents for one record and returns the `chart` JSON stored on the record."""
from ..engine.curated import CURATED
from .addendum_agent import AddendumAIAgent
from .gate_agent import ConfidenceGateAgent
from .llm_coder_agent import LLMHCCCoderAgent
from .ner_agent import NLPCodingAgent, segment_line
from .ocr_agent import OCRExtractionAgent

ocr_agent = OCRExtractionAgent()
ner_agent = NLPCodingAgent()
coder_agent = LLMHCCCoderAgent()
gate_agent = ConfidenceGateAgent()
addendum_agent = AddendumAIAgent()


def run_pipeline(text: str, meta: dict, curated_key: str | None = None) -> dict:
    if curated_key:  # curated demo charts carry hand-built, production-like output
        import copy
        return copy.deepcopy(CURATED[curated_key]["chart"])
    layout = ocr_agent.layout(text, meta)                       # stage 01
    ner = ner_agent.extract(layout)                             # stage 02
    coded = coder_agent.code(layout, ner, meta)                 # stage 03
    q = layout["penalty"]
    hand = meta.get("quality") == "Handwritten"
    entities = [{"text": c["matched_text"], "type": "Condition", "flag": c["flag"], "preliminary": c["icd10"],
                 "confidence": min(0.99, round(c["confidence"] + 0.03, 2))} for c in coded["codes"] if not c["icd10"].startswith("Z")]
    entities += ner["meds"] + ner["labs"]
    sections = [{"title": s["title"], "lines": [{"id": x["id"], "hand": hand and not x["claim"],
                                                 "segs": [{"t": x["t"], "e": None}] if x["claim"] else segment_line(x["t"])}
                                                for x in s["items"]]} for s in layout["sections"]]
    n = len(coded["codes"])
    return {"engine": "rules", "scan": meta.get("quality") != "Digital text", "hand": hand,
            "fmt": f"{meta.get('quality')} · {len(layout['lines'])} lines · {len(layout['sections'])} sections",
            "ocr": layout["ocr"], "kg": coded["kg"], "sections": sections, "entities": entities,
            "codes": coded["codes"], "deletes": coded["deletes"], "gap": coded["gap"],
            "interactions": coded["interactions"], "notes": coded["notes"],
            "time": {"human_min": 6 + 3 * n, "codex_min": round(0.8 + 0.1 * n, 1), "review_min": 2.5}, "penalty": q}
