"""Agent 01 — OCR Extraction Agent: document parser & layout processor.

rules mode : text files are read directly; PDFs with a text layer are read with pypdf; images use
             pytesseract if it is installed, otherwise the user is asked to paste the text.
production : TODO(production) call AWS Textract (AnalyzeDocument, LAYOUT+TABLES) and LayoutLMv3, with a
             Google Document AI handwriting fallback; keep per-block confidence.
"""
import io
import re

from ..engine.parser import parse_text
from .base import Agent

QUALITY_PENALTY = {"Digital text": 0.0, "Scanned": 0.04, "Handwritten": 0.12}
AP_RX = re.compile(r"assess|plan|a/p|impression|diagnos|problem", re.I)
CLAIM_SEC_RX = re.compile(r"claim|billed", re.I)
CLAIM_LINE_RX = re.compile(r"(dx on claim|claim dx|billed dx|diagnos[ie]s on claim)", re.I)


class OCRExtractionAgent(Agent):
    name = "OCR Extraction Agent"
    role = "Document parser & layout processor"

    # ---------- file → text ----------
    def extract_text(self, filename: str, data: bytes) -> dict:
        """Returns {text, quality, needs_text, note}."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in ("txt", "md"):
            return {"text": data.decode("utf-8", errors="replace"), "quality": None, "needs_text": False, "note": ""}
        if ext == "pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(data))
                text = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
                if len(text) > 40:
                    return {"text": text, "quality": "Digital text", "needs_text": False, "note": f"Text layer read from {len(reader.pages)} PDF page(s)."}
            except Exception as exc:  # noqa: BLE001
                return {"text": "", "quality": "Scanned", "needs_text": True, "note": f"PDF could not be parsed ({exc}); paste the text."}
            return {"text": "", "quality": "Scanned", "needs_text": True, "note": "Scanned PDF without a text layer: OCR required."}
        if ext in ("png", "jpg", "jpeg", "tif", "tiff"):
            if self.mode("ocr_mode") == "production":
                raise NotImplementedError("TODO(production): call AWS Textract / Document AI here")
            try:
                import pytesseract  # optional dependency
                from PIL import Image
                text = pytesseract.image_to_string(Image.open(io.BytesIO(data)))
                if text.strip():
                    return {"text": text, "quality": "Scanned", "needs_text": False, "note": "OCR by Tesseract (demo)."}
            except Exception:  # noqa: BLE001
                pass
            return {"text": "", "quality": "Scanned", "needs_text": True, "note": "Image received: OCR runs server-side in production; paste the text for the demo."}
        raise ValueError(f"Unsupported file type: .{ext}")

    # ---------- text → layout ----------
    def layout(self, text: str, meta: dict) -> dict:
        _, secs = parse_text(text)
        q = QUALITY_PENALTY.get(meta.get("quality"), 0.0)
        lines, sections, n = [], [], 0
        for s in secs:
            ap = bool(AP_RX.search(s["title"]))
            claim_sec = bool(CLAIM_SEC_RX.search(s["title"]))
            items = []
            for t in s["lines"]:
                n += 1
                item = {"id": f"u{n}", "t": t, "ap": ap, "claim": claim_sec or bool(CLAIM_LINE_RX.search(t))}
                items.append(item)
                lines.append(item)
            sections.append({"title": s["title"], "ap": ap, "claim": claim_sec, "items": items})
        quality = meta.get("quality", "Digital text")
        engine = ("Digital text received; OCR skipped, layout parsed from headings" if quality == "Digital text"
                  else "LayoutLMv3 + handwriting model (simulated for text input)" if quality == "Handwritten"
                  else "AWS Textract → LayoutLMv3 (simulated for text input)")
        blocks = [{"block": s["title"], "type": "Narrative (A&P)" if s["ap"] else "Claim data" if s["claim"] else "Narrative",
                   "confidence": round(0.99 - q - (0.01 if s["ap"] else 0), 2)} for s in sections]
        return {"sections": sections, "lines": lines, "penalty": q,
                "ocr": {"engine": engine, "mean_confidence": round(0.99 - q, 2), "blocks": blocks}}
