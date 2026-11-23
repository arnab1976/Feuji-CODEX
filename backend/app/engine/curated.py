"""Curated demo charts A, B and C (hand-built, production-like outputs)."""
import json
from pathlib import Path

from .parser import meta_header

CURATED: dict = json.loads((Path(__file__).resolve().parent.parent / "data" / "curated.json").read_text(encoding="utf-8"))


def chart_text(key: str) -> str:
    c = CURATED[key]
    out = meta_header(c["meta"])
    for s in c["chart"]["sections"]:
        out += f"\n{s['title']}:\n"
        for ln in s["lines"]:
            out += "".join(seg["t"] for seg in ln["segs"]) + "\n"
    return out
