import io
import zipfile

from fastapi.testclient import TestClient

from app.engine.curated import chart_text
from app.main import app

c = TestClient(app)
H = {"X-Session-Id": "pytest"}


def test_full_journey():
    c.delete("/api/records", headers=H)
    up = c.post("/api/records/upload", headers=H, files=[("files", ("chart_B.txt", chart_text("B").encode(), "text/plain")),
                                                         ("files", ("batch.csv", c.get("/api/samples/batch_5_records.csv").content, "text/csv"))]).json()
    assert len(up["created"]) == 6 and not up["errors"]
    rid = up["created"][0]["id"]
    r = c.post(f"/api/records/{rid}/process", headers=H).json()
    assert r["processed"] and r["result"]["summary"]["deleted"] == ["I50.9"]
    held = r["result"]["summary"]["held_for_review"]
    if held:
        r = c.post(f"/api/records/{rid}/decisions", headers=H, json={"code": held[0], "decision": "accept"}).json()
        assert held[0] in r["result"]["summary"]["submitted"]
    r = c.post(f"/api/records/{rid}/query-response", headers=H, json={"response": "yes"}).json()
    assert "N18.32" in r["result"]["summary"]["submitted"]
    z = zipfile.ZipFile(io.BytesIO(c.get(f"/api/records/{rid}/export/zip", headers=H).content))
    assert len(z.namelist()) == 6
    s = zipfile.ZipFile(io.BytesIO(c.get("/api/session/export", headers=H).content))
    assert "session_summary.csv" in s.namelist()
    msg = c.post(f"/api/bridge/result/{rid}", headers=H).json()["message"]
    assert msg["type"] == "codex:result" and msg["patientId"] == "PT-90417"


def test_meta_patch_invalidates_and_blocks():
    rec = c.post("/api/records/simulate", headers=H, json={"kind": "curated", "key": "A"}).json()[0]
    c.post(f"/api/records/{rec['id']}/process", headers=H)
    r = c.patch(f"/api/records/{rec['id']}", headers=H, json={"meta": {"ptype": "Chatbot"}}).json()
    assert not r["processed"] and not r["eligibility"]["passed"]


def test_session_isolation():
    assert c.get("/api/records", headers={"X-Session-Id": "someone-else"}).json() == []
