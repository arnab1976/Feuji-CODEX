"""Simulated sample data: curated chart cards, individual sample files and the sample-pack ZIP."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..engine.curated import CURATED
from ..engine.simulator import sample_pack
from ..services.exporter import make_zip

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.get("/curated")
def curated_cards():
    return [{"key": k, "title": c["title"], "sub": c["sub"], "blurb": c["blurb"]} for k, c in CURATED.items()]


@router.get("")
def list_samples():
    return sorted(sample_pack().keys())


@router.get("/pack.zip")
def pack():
    return Response(make_zip(list(sample_pack().items())), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="CODEX_simulated_sample_pack.zip"'})


@router.get("/{name}")
def sample(name: str):
    p = sample_pack()
    if name not in p:
        raise HTTPException(404, "Unknown sample")
    return Response(p[name], media_type="text/plain; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{name}"'})
