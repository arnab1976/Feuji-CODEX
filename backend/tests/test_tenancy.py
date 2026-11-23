"""Tenants stay separate, and a longer term costs less per unit."""
from fastapi.testclient import TestClient

from app.main import app
from app.pricing import price

c = TestClient(app)


def test_longer_term_lowers_the_chart_price():
    month = price("retrospective", "month", 1000)
    year = price("retrospective", "year", 1000)
    assert month["unit_price"] > year["unit_price"]
    assert year["total"] < month["total"]


def test_platform_overage_starts_after_the_included_charts():
    inside = price("platform", "year", 10000, measured=10000)
    over = price("platform", "year", 10000, measured=10002)
    assert inside["overage"] == 0
    assert over["extra_units"] == 2
    assert over["total"] == inside["total"] + 6


def test_tenants_do_not_see_each_others_charts():
    h = {"X-Session-Id": "tenant-check", "X-Tenant-Id": "lumen"}
    other = {"X-Session-Id": "tenant-check", "X-Tenant-Id": "harbor"}
    made = c.post("/api/records/text", headers=h, json={"text": "Patient: Isolation check\nAssessment: COPD stable.", "name": "Isolation"}).json()
    ids = [r["id"] for r in c.get("/api/records", headers=other).json()]
    assert made["id"] not in ids
    assert c.get(f"/api/records/{made['id']}", headers=other).status_code == 404


def test_processing_counts_a_chart_once():
    h = {"X-Session-Id": "meter-check", "X-Tenant-Id": "casa"}
    before = c.get("/api/account", headers=h).json()["usage"]["charts"]
    rec = c.post("/api/records/text", headers=h, json={"text": "Patient: Meter\nAssessment: diabetes, continue metformin.", "name": "Meter"}).json()
    c.post(f"/api/records/{rec['id']}/process", headers=h)
    c.post(f"/api/records/{rec['id']}/process", headers=h)
    after = c.get("/api/account", headers=h).json()["usage"]["charts"]
    assert after == before + 1
