"""Pricing catalog. Amounts are illustrative proposal figures, not a live rate card.

Usage is what gets counted. Duration is how long the organisation commits.
A longer commitment uses a lower unit price.
"""
MONTHS = {"month": 1, "quarter": 3, "year": 12}

PLANS = [
    {
        "id": "retrospective",
        "name": "Retrospective chart coding",
        "usage": "chart",
        "unit": "chart",
        "blurb": "Each visit note coded in the term has a price. A year-long commitment costs less per chart than a month-to-month one.",
        "fits": ["plan", "vendor"],
        "example": 10000,
        "rates": {"month": 4.50, "quarter": 4.05, "year": 3.60},
    },
    {
        "id": "point_of_care",
        "name": "Point of care",
        "usage": "member",
        "unit": "member",
        "blurb": "A price per member per month, for a brief before the visit and coding when the note is signed. Charts are activity. The bill follows the member count and the term.",
        "fits": ["plan", "group"],
        "example": 8000,
        "rates": {"month": 2.40, "quarter": 2.16, "year": 1.92},
    },
    {
        "id": "platform",
        "name": "Coding platform",
        "usage": "platform",
        "unit": "chart",
        "blurb": "A platform fee for the term, with a bundle of charts included. Charts past the bundle are billed one by one. A year includes more charts than twelve separate months.",
        "fits": ["vendor"],
        "example": 20000,
        "base": {"month": 5000, "quarter": 14000, "year": 48000},
        "included": {"month": 800, "quarter": 2500, "year": 10000},
        "overage": 3.00,
    },
    {
        "id": "covered_life",
        "name": "Covered-life add-on",
        "usage": "life",
        "unit": "covered life",
        "blurb": "A small price per covered life for a caregiver organisation already on Healthcare 360. The term length lowers the monthly amount.",
        "fits": ["caregiver"],
        "example": 4000,
        "rates": {"month": 0.80, "quarter": 0.72, "year": 0.64},
    },
]
PLAN_BY_ID = {p["id"]: p for p in PLANS}


def plan_public(plan: dict) -> dict:
    return {k: v for k, v in plan.items() if k in ("id", "name", "usage", "unit", "blurb", "fits", "example", "rates", "base", "included", "overage")}


def price(plan_id: str, duration: str, quantity: int, measured: int | None = None) -> dict:
    """Price a commitment. `measured` is actual chart usage this term; omit it to price the commitment alone."""
    plan = PLAN_BY_ID[plan_id]
    if duration not in MONTHS:
        raise KeyError(duration)
    months = MONTHS[duration]
    qty = max(0, int(quantity))
    used = qty if measured is None else max(0, int(measured))
    if plan["usage"] == "chart":
        unit = plan["rates"][duration]
        committed = round(qty * unit, 2)
        extra_n = max(0, used - qty)
        overage = round(extra_n * unit, 2)
        total = round(committed + overage, 2)
        line = f"{qty:,} charts × ${unit:.2f}"
        included = qty
    elif plan["usage"] == "platform":
        unit = plan["overage"]
        committed = float(plan["base"][duration])
        included = plan["included"][duration]
        extra_n = max(0, used - included)
        overage = round(extra_n * unit, 2)
        total = round(committed + overage, 2)
        line = f"${committed:,.0f} platform fee, {included:,} charts included"
    else:
        unit = plan["rates"][duration]
        monthly = round(qty * unit, 2)
        committed = round(monthly * months, 2)
        extra_n = 0
        overage = 0.0
        total = committed
        included = qty
        noun = "covered lives" if plan["unit"] == "covered life" else plan["unit"] + "s"
        line = f"{qty:,} {noun} × ${unit:.2f} per month × {months} month{'s' if months != 1 else ''}"
    return {
        "plan_id": plan_id,
        "plan_name": plan["name"],
        "usage": plan["usage"],
        "unit": plan["unit"],
        "duration": duration,
        "months": months,
        "quantity": qty,
        "unit_price": plan["rates"][duration] if "rates" in plan else plan["overage"],
        "committed": committed if plan["usage"] != "chart" else round(qty * plan["rates"][duration], 2),
        "included": included,
        "measured": used,
        "extra_units": extra_n,
        "overage": overage,
        "total": total,
        "monthly_equivalent": round(total / months, 2),
        "line": line,
    }
