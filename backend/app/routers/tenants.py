"""Organisations and the price of their current term."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..pricing import PLAN_BY_ID, price
from ..schemas import SubscribeIn
from ..tenancy import account_view, list_tenants, set_subscription, tenant_id

router = APIRouter(prefix="/api", tags=["tenants"])


@router.get("/tenants")
def tenants(db: Session = Depends(get_db)):
    return list_tenants(db)


@router.get("/account")
def account(db: Session = Depends(get_db), tid: str = Depends(tenant_id)):
    return account_view(db, tid)


@router.post("/account/subscription")
def subscribe(body: SubscribeIn, db: Session = Depends(get_db), tid: str = Depends(tenant_id)):
    return set_subscription(db, tid, body.plan_id, body.duration, body.quantity)


@router.get("/pricing/quote")
def quote(plan_id: str = Query(...), duration: str = Query("year"), quantity: int = Query(1, ge=1, le=5_000_000),
          measured: int | None = Query(None, ge=0)):
    if plan_id not in PLAN_BY_ID:
        raise HTTPException(422, "Unknown pricing option")
    try:
        return price(plan_id, duration, quantity, measured)
    except KeyError:
        raise HTTPException(422, "Term must be month, quarter, or year") from None
