import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_cors_origins
from app.scenario import SCENARIO_PATHS, load_scenario
from app.terrain import get_jezero_landmarks, get_map_catalog

logger = logging.getLogger(__name__)

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


@app.get("/scenarios/{scenario_id}")
def scenario(scenario_id: str) -> dict[str, Any]:
    """Return a prepared field scenario."""
    if scenario_id not in SCENARIO_PATHS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    try:
        return load_scenario(scenario_id)
    except (OSError, ValueError):
        # Missing, unreadable, malformed, or unsupported-version bundle.
        logger.exception("Scenario %r is unavailable", scenario_id)
        raise HTTPException(
            status_code=503, detail="Scenario temporarily unavailable"
        ) from None
