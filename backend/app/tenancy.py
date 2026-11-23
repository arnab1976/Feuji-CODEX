"""Tenant resolution, seed data, and chart metering.

Each organisation is a tenant. Charts, the subscription, and usage never cross tenants.
Missing X-Tenant-Id uses the Harbor Health Plan demo tenant so older clients keep working.
"""
import uuid
from datetime import timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import SessionLocal, Subscription, Tenant, UsageEvent, get_db, utcnow
from .pricing import MONTHS, PLAN_BY_ID, PLANS, plan_public, price

DEFAULT_TENANT = "harbor"

TENANTS = [
    {
        "id": "harbor",
        "name": "Harbor Health Plan",
        "kind": "plan",
        "kind_label": "Medicare Advantage plan",
        "summary": "A private insurer paid by Medicare for each member. Buys CODEX as its own coder.",
        "plan_id": "retrospective",
        "duration": "year",
        "quantity": 250000,
    },
    {
        "id": "northline",
        "name": "Northline Coding",
        "kind": "vendor",
        "kind_label": "Coding company",
        "summary": "Codes charts for insurers under its own brand. CODEX is the engine behind that service.",
        "plan_id": "platform",
        "duration": "year",
        "quantity": 40000,
    },
    {
        "id": "lumen",
        "name": "Lumen Medical Group",
        "kind": "group",
        "kind_label": "Doctor group on a risk contract",
        "summary": "Paid a monthly amount per member by an insurer. Wants coding at the visit, not a year-end chart pile.",
        "plan_id": "point_of_care",
        "duration": "year",
        "quantity": 18000,
    },
    {
        "id": "casa",
        "name": "Casa Home Care",
        "kind": "caregiver",
        "kind_label": "Caregiver organisation",
        "summary": "Home-visit notes arrive from the organisation's own document feed. CODEX codes them on its own and returns a problem list.",
        "plan_id": "covered_life",
        "duration": "year",
        "quantity": 6000,
    },
]


def seed():
    db = SessionLocal()
    try:
        if db.get(Tenant, DEFAULT_TENANT):
            return
        started = utcnow()
        for row in TENANTS:
            db.add(Tenant(id=row["id"], name=row["name"], kind=row["kind"], kind_label=row["kind_label"], summary=row["summary"]))
            db.add(Subscription(tenant_id=row["id"], plan_id=row["plan_id"], duration=row["duration"], quantity=row["quantity"], started_at=started))
        db.commit()
    finally:
        db.close()


def tenant_id(x_tenant_id: str | None = Header(default=None), db: Session = Depends(get_db)) -> str:
    tid = (x_tenant_id or DEFAULT_TENANT).strip()[:64] or DEFAULT_TENANT
    if not db.get(Tenant, tid):
        raise HTTPException(404, "Unknown organisation")
    return tid


def meter_chart(db: Session, rec) -> None:
    """Count a coded chart once. Re-running the pipeline does not bill it again."""
    if not rec.tenant_id:
        return
    if db.scalar(select(UsageEvent.id).where(UsageEvent.record_id == rec.id)):
        return
    db.add(UsageEvent(id=str(uuid.uuid4()), tenant_id=rec.tenant_id, record_id=rec.id, kind="chart"))


def charts_this_term(db: Session, sub: Subscription) -> int:
    return int(db.scalar(
        select(func.count()).select_from(UsageEvent).where(
            UsageEvent.tenant_id == sub.tenant_id, UsageEvent.created_at >= sub.started_at)) or 0)


def account_view(db: Session, tid: str) -> dict:
    tenant = db.get(Tenant, tid)
    sub = db.get(Subscription, tid)
    if not tenant or not sub:
        raise HTTPException(404, "Unknown organisation")
    used = charts_this_term(db, sub)
    quoted = price(sub.plan_id, sub.duration, sub.quantity, measured=used)
    ends = sub.started_at + timedelta(days=30 * MONTHS[sub.duration])
    plans = []
    for plan in PLANS:
        item = plan_public(plan)
        item["fits_tenant"] = tenant.kind in plan["fits"]
        plans.append(item)
    return {
        "tenant": {"id": tenant.id, "name": tenant.name, "kind": tenant.kind, "kind_label": tenant.kind_label, "summary": tenant.summary},
        "subscription": {
            "plan_id": sub.plan_id,
            "duration": sub.duration,
            "quantity": sub.quantity,
            "started_at": sub.started_at.isoformat(),
            "ends_at": ends.isoformat(),
            "price": quoted,
        },
        "usage": {"charts": used},
        "plans": plans,
    }


def set_subscription(db: Session, tid: str, plan_id: str, duration: str, quantity: int) -> dict:
    if plan_id not in PLAN_BY_ID:
        raise HTTPException(422, "Unknown pricing option")
    if duration not in MONTHS:
        raise HTTPException(422, "Term must be month, quarter, or year")
    sub = db.get(Subscription, tid)
    if not sub:
        raise HTTPException(404, "Unknown organisation")
    sub.plan_id = plan_id
    sub.duration = duration
    sub.quantity = quantity
    sub.started_at = utcnow()
    db.commit()
    return account_view(db, tid)


def list_tenants(db: Session) -> list[dict]:
    rows = db.scalars(select(Tenant).order_by(Tenant.name)).all()
    return [{"id": t.id, "name": t.name, "kind": t.kind, "kind_label": t.kind_label, "summary": t.summary} for t in rows]
