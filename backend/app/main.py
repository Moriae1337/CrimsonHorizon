import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_cors_origins
from app.environment import ENVIRONMENT_PATHS, load_environment
from app.scenario import (
    SCENARIO_PATHS,
    SLOPE_PATHS,
    load_scenario,
    load_slope_overlay,
)
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
    """Return a prepared field scenario (contract: specs/scenario-api.md)."""
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


@app.get("/scenarios/{scenario_id}/environment")
def scenario_environment(scenario_id: str) -> dict[str, Any]:
    """Return archival MEDA weather and RAD context (specs/environment-api.md)."""
    if scenario_id not in ENVIRONMENT_PATHS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    try:
        return load_environment(scenario_id)
    except (OSError, ValueError):
        logger.exception("Environment context for %r is unavailable", scenario_id)
        raise HTTPException(
            status_code=503, detail="Environment context temporarily unavailable"
        ) from None


@app.get(
    "/api/scenario/{scenario_id}/slope",
    summary="Get precomputed slope overlay",
    description=(
        "Return precomputed slope metadata, grid resolution (1.0 m), bounds, "
        "units, statistics (min, max, mean, median, p95), and 2D values grid."
    ),
)
@app.get(
    "/api/scenarios/{scenario_id}/slope",
    include_in_schema=False,
)
@app.get(
    "/scenarios/{scenario_id}/slope",
    summary="Get precomputed slope overlay (alias)",
)
def scenario_slope(scenario_id: str, response: Response) -> dict[str, Any]:
    """Return precomputed slope overlay (specs/scenario-api.md)."""
    if scenario_id not in SCENARIO_PATHS and scenario_id not in SLOPE_PATHS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if scenario_id not in SLOPE_PATHS:
        raise HTTPException(status_code=404, detail="Slope overlay not found")
    try:
        data = load_slope_overlay(scenario_id)
    except FileNotFoundError:
        logger.warning("Slope overlay file missing for scenario %r", scenario_id)
        raise HTTPException(status_code=404, detail="Slope overlay not found") from None
    except (OSError, ValueError):
        logger.exception("Slope overlay for %r is unavailable", scenario_id)
        raise HTTPException(
            status_code=503, detail="Slope overlay temporarily unavailable"
        ) from None

    response.headers["Cache-Control"] = "public, max-age=86400"
    return data
