from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_cors_origins
from app.terrain import get_jezero_landmarks, get_map_catalog

app = FastAPI(title="CrimsonHorizon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Hello, Mars!"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/terrain/layers")
def terrain_layers() -> dict[str, Any]:
    """Return Mars coordinate reference metadata and cited WMTS layers."""
    return get_map_catalog()


@app.get("/terrain/landmarks")
def terrain_landmarks() -> dict[str, Any]:
    """Return verified Jezero Crater reference points as GeoJSON."""
    return get_jezero_landmarks()
