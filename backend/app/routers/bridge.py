"""Patient 360 / Healthcare 360 bridge.

Browser side: the React app exchanges postMessage events with the parent portal (see frontend/src/lib/bridge.js).
Server side: POST /api/bridge/result/{id} builds the `codex:result` message and, if CODEX_PATIENT360_WEBHOOK_URL is
set, forwards it to the Patient 360 backend.
"""
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..services.results import patient360_message
from .records import _processed, session_id
from ..tenancy import tenant_id

router = APIRouter(prefix="/api/bridge", tags=["patient360"])


@router.post("/result/{rid}")
def send_result(rid: str, db: Session = Depends(get_db), sid: str = Depends(session_id), tid: str = Depends(tenant_id)):
    msg = patient360_message(_processed(db, sid, tid, rid))
    s = get_settings()
    delivered = None
    if s.patient360_webhook_url:
        headers = {"Authorization": f"Bearer {s.patient360_webhook_token}"} if s.patient360_webhook_token else {}
        try:
            r = httpx.post(s.patient360_webhook_url, json=msg, headers=headers, timeout=10)
            delivered = {"status_code": r.status_code}
        except httpx.HTTPError as exc:
            delivered = {"error": str(exc)}
    return {"message": msg, "webhook": delivered}
