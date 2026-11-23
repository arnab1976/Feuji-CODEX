"""Agent 02 — NLP Coding Agent: BioBERT / Med-BERT clinical entity extractor.

rules mode : dictionary + regex extraction with negation / history detection (engine/dictionary.py).
production : TODO(production) call the BioBERT/Med-BERT NER service and map spans to the same candidate shape:
             {entry, entry_index, line, match, hist}.
"""
from ..engine.dictionary import DICT, HIST, LABRE, MEDRE, NEG
from .base import Agent


def segment_line(t: str) -> list[dict]:
    """Split a line into highlighted segments: cond / med / lab (used by the record viewer)."""
    ranges = []
    for e in DICT:
        m = e["rx"].search(t)
        if m and m.end() > m.start():
            ranges.append((m.start(), m.end(), "cond"))
    ranges += [(m.start(), m.end(), "med") for m in MEDRE.finditer(t)]
    ranges += [(m.start(), m.end(), "lab") for m in LABRE.finditer(t)]
    ranges.sort(key=lambda r: (r[0], -(r[1] - r[0])))
    segs, pos = [], 0
    for a, b, k in ranges:
        if a < pos:
            continue
        if a > pos:
            segs.append({"t": t[pos:a], "e": None})
        segs.append({"t": t[a:b], "e": k})
        pos = b
    if pos < len(t):
        segs.append({"t": t[pos:], "e": None})
    return segs


class NLPCodingAgent(Agent):
    name = "NLP Coding Agent"
    role = "BioBERT / Med-BERT HCC code extractor"

    def extract(self, layout: dict) -> dict:
        if self.mode("ner_mode") == "production":
            raise NotImplementedError("TODO(production): call BioBERT / Med-BERT NER service")
        candidates = []
        for x in layout["lines"]:
            if x["claim"]:
                continue
            seen = set()
            for ei, e in enumerate(DICT):
                if e["g"] in seen:
                    continue
                m = e["rx"].search(x["t"])
                if not m:
                    continue
                pre = x["t"][max(0, m.start() - 40):m.start()]
                if NEG.search(pre):
                    continue
                seen.add(e["g"])
                window = x["t"][max(0, m.start() - 25):m.end() + 12]
                candidates.append({"entry": e, "ei": ei, "line": x, "match": m.group(0), "hist": bool(HIST.search(window))})
        full = "\n".join(x["t"] for x in layout["lines"] if not x["claim"])
        q = layout["penalty"]
        meds, seen = [], set()
        for m in MEDRE.finditer(full):
            k = m.group(1).lower()
            if k not in seen:
                seen.add(k)
                meds.append({"text": m.group(0), "type": "Medication", "flag": "—", "preliminary": "treatment evidence", "confidence": round(0.98 - q, 2)})
        labs = [{"text": m.group(0), "type": "Lab / exam", "flag": "—", "preliminary": "clinical evidence", "confidence": round(0.97 - q, 2)} for m in LABRE.finditer(full)]
        return {"candidates": candidates, "meds": meds, "labs": labs, "full_text": full}
