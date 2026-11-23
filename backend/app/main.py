"""CODEX API — FastAPI application entry point.

Run (dev):  uvicorn app.main:app --reload --port 8000
Docs:       http://localhost:8000/docs
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agents.pipeline import addendum_agent, coder_agent, gate_agent, ner_agent, ocr_agent
from .config import get_settings
from .db import init_db
from .routers import bridge, exports, records, samples, tenants

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.version)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
                   allow_methods=["*"], allow_headers=["*"], expose_headers=["Content-Disposition"])
init_db()

app.include_router(records.router)
app.include_router(exports.router)
app.include_router(samples.router)
app.include_router(bridge.router)
app.include_router(tenants.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.version,
            "agents": [{"name": a.name, "role": a.role} for a in (ocr_agent, ner_agent, coder_agent, gate_agent, addendum_agent)],
            "modes": {"ocr": settings.ocr_mode, "ner": settings.ner_mode, "coder": settings.coder_mode}}


# ---- optionally serve the built React app (single-container deployment) ----
dist = (Path(__file__).resolve().parent.parent / settings.frontend_dist).resolve()
if settings.serve_frontend and (dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = dist / path
        return FileResponse(f if path and f.is_file() else dist / "index.html")
