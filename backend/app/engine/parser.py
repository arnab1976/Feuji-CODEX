"""Turn raw note text into metadata + sections + lines."""
import random
import re
from datetime import date

ALIAS = {
    "patient": "patient", "patient name": "patient", "name": "patient",
    "member": "member", "member id": "member", "mbi": "member",
    "prism": "prism", "prism id": "prism", "prism patient id": "prism", "patient id": "prism",
    "external patient id": "prism", "external id": "prism",
    "dos": "dos", "date of service": "dos", "visit date": "dos",
    "provider": "prov", "rendering provider": "prov", "clinician": "prov",
    "provider type": "ptype",
    "visit": "visit", "visit type": "visit", "encounter type": "visit",
    "encounter": "enc", "encounter id": "enc",
    "source quality": "quality", "quality": "quality",
    "signed": "signed",
}
PROVIDER_TYPES = ["MD", "DO", "NP", "PA", "RN", "Caregiver / aide", "Chatbot"]
VISIT_TYPES = ["Face-to-face", "Telehealth (video)", "Audio-only", "No encounter (chart only)"]
QUALITIES = ["Digital text", "Scanned", "Handwritten"]

META_LINE = re.compile(r"^\s*([A-Za-z][A-Za-z /]{1,30}?)\s*:\s*(.+)$")
H_MD = re.compile(r"^#{1,4}\s*(.+)$")
H_COLON = re.compile(r"^([A-Za-z][A-Za-z0-9 &/,()'-]{2,60}):\s*$")
H_CAPS = re.compile(r"^[A-Z][A-Z &/,()'-]+$")


def norm_meta(m: dict) -> dict:
    """Normalise free-text metadata values to the controlled vocabularies."""
    o = {k: v for k, v in (m or {}).items() if v not in (None, "")}
    s = str(o.get("ptype") or o.get("prov") or "")
    if s:
        if re.search(r"\bMD\b", s, re.I): o["ptype"] = "MD"
        elif re.search(r"\bDO\b", s): o["ptype"] = "DO"
        elif re.search(r"\bNP\b|nurse practitioner", s, re.I): o["ptype"] = "NP"
        elif re.search(r"\bPA\b|physician assistant", s, re.I): o["ptype"] = "PA"
        elif re.search(r"\bRN\b|registered nurse|\bnurse\b", s, re.I): o["ptype"] = "RN"
        elif re.search(r"aide|caregiver", s, re.I): o["ptype"] = "Caregiver / aide"
        elif re.search(r"chat|bot", s, re.I): o["ptype"] = "Chatbot"
        elif o.get("ptype") not in PROVIDER_TYPES: o.pop("ptype", None)
    if o.get("visit"):
        v = str(o["visit"])
        o["visit"] = ("Audio-only" if re.search(r"audio|phone|telephone", v, re.I) else
                      "Telehealth (video)" if re.search(r"video|telehealth|virtual", v, re.I) else
                      "No encounter (chart only)" if re.search(r"chart|none|no encounter", v, re.I) else "Face-to-face")
    if o.get("quality"):
        q = str(o["quality"])
        o["quality"] = "Handwritten" if re.search(r"hand", q, re.I) else "Scanned" if re.search(r"scan|fax|tiff|image", q, re.I) else "Digital text"
    if isinstance(o.get("signed"), str):
        o["signed"] = not re.match(r"^(no|false|0|unsigned)", o["signed"], re.I)
    return o


def default_meta(overrides: dict | None = None, patient360_id: str | None = None) -> dict:
    n = random.randint(10000, 99999)
    base = {
        "patient": f"Synthetic patient {n % 1000}",
        "member": f"MA-{random.randint(300000, 399999)}",
        "prism": patient360_id or f"PT-{random.randint(80000, 89999)}",
        "enc": f"ENC-{date.today():%Y%m%d}-{n}",
        "dos": "2026-10-15",
        "prov": "Rendering clinician",
        "ptype": "MD",
        "visit": "Face-to-face",
        "quality": "Digital text",
        "signed": True,
    }
    base.update(overrides or {})
    return base


def parse_text(text: str):
    """Returns (meta_from_header_lines, sections[{title, lines[str]}])."""
    meta, body = {}, []
    for line in str(text or "").replace("\r", "").split("\n"):
        m = META_LINE.match(line)
        if m:
            k = ALIAS.get(m.group(1).strip().lower())
            if k:
                meta[k] = m.group(2).strip()
                continue
        body.append(line)
    secs, cur = [], {"title": "Note", "lines": []}
    for line in body:
        t = line.strip()
        if not t:
            continue
        h = H_MD.match(t) or H_COLON.match(t)
        title = h.group(1) if h else (t if len(t) < 50 and H_CAPS.match(t) else None)
        if title:
            if cur["lines"]:
                secs.append(cur)
            cur = {"title": title.rstrip(":").strip(), "lines": []}
        else:
            cur["lines"].append(t)
    if cur["lines"]:
        secs.append(cur)
    return meta, secs


def meta_header(m: dict) -> str:
    return (f"Patient: {m.get('patient','')}\nMember ID: {m.get('member','')}\nExternal patient ID: {m.get('prism','')}\n"
            f"Encounter ID: {m.get('enc','')}\nDate of service: {m.get('dos','')}\nProvider: {m.get('prov','')}\n"
            f"Provider type: {m.get('ptype','')}\nVisit type: {m.get('visit','')}\nSource quality: {m.get('quality','')}\n"
            f"Signed: {'no' if m.get('signed') is False else 'yes'}\n")
