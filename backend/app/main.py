import logging
import math
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import get_cors_origins
from app.environment import ENVIRONMENT_PATHS, load_environment
from app.routing import RouteError, plan_routes
from app.scenario import (
    SCENARIO_PATHS,
    SLOPE_PATHS,
    load_scenario,
    load_slope_overlay,
)
from app.sites import SITE_DIRS, load_grid, load_site, site_summaries, texture_path
from app.terrain import get_jezero_landmarks, get_map_catalog, get_nomenclature

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


@app.get("/terrain/nomenclature")
def terrain_nomenclature(response: Response) -> dict[str, Any]:
    """Return IAU-named Mars features for globe labels (USGS Gazetteer)."""
    try:
        doc = get_nomenclature()
    except (OSError, ValueError):
        logger.exception("Nomenclature is unavailable")
        raise HTTPException(
            status_code=503, detail="Nomenclature unavailable"
        ) from None
    response.headers["Cache-Control"] = "public, max-age=86400"
    return doc


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


@app.get("/scenarios/{scenario_id}/environment")
def scenario_environment(scenario_id: str) -> dict[str, Any]:
    """Return archival MEDA weather and RAD context."""
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
    """Return precomputed slope overlay."""
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


def _site_or_404(site_id: str) -> None:
    if site_id not in SITE_DIRS:
        raise HTTPException(status_code=404, detail="Site not found")


def _parse_points(raw: str, label: str) -> list[tuple[float, float]]:
    points = []
    for chunk in filter(None, raw.split(";")):
        try:
            x_text, y_text = chunk.split(",")
            point = (float(x_text), float(y_text))
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"{label} must be 'x,y' pairs in metres"
            ) from None
        if not all(map(math.isfinite, point)):
            raise HTTPException(status_code=422, detail=f"{label} must be finite")
        points.append(point)
    return points


@app.get("/sites")
def sites() -> dict[str, Any]:
    """List 3D terrain sites."""
    try:
        return {"sites": site_summaries()}
    except (OSError, ValueError):
        logger.exception("Terrain sites are unavailable")
        raise HTTPException(status_code=503, detail="Sites unavailable") from None


@app.get("/sites/{site_id}/terrain")
def site_terrain(site_id: str, response: Response) -> dict[str, Any]:
    """Return the encoded elevation grid and metadata for one site."""
    _site_or_404(site_id)
    try:
        doc = load_site(site_id)
    except (OSError, ValueError):
        logger.exception("Terrain for %r is unavailable", site_id)
        raise HTTPException(status_code=503, detail="Terrain unavailable") from None
    response.headers["Cache-Control"] = "public, max-age=86400"
    return doc


@app.get("/sites/{site_id}/texture.jpg")
def site_texture(site_id: str) -> FileResponse:
    """Return the HiRISE orthoimage texture on the terrain grid."""
    _site_or_404(site_id)
    try:
        path = texture_path(site_id)
    except (OSError, ValueError):
        raise HTTPException(status_code=503, detail="Texture unavailable") from None
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Texture not found")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/sites/{site_id}/routes")
def site_routes(
    site_id: str,
    start: str = Query(..., description="x,y in site metres"),
    end: str = Query(..., description="x,y in site metres"),
    stops: str = Query("", description="up to 8 'x,y' pairs separated by ';'"),
    max_grade_deg: float = Query(25.0, ge=5.0, le=45.0),
) -> dict[str, Any]:
    """Plan the shortest and the lower-risk route through optional stops."""
    _site_or_404(site_id)
    a = _parse_points(start, "start")
    b = _parse_points(end, "end")
    mid = _parse_points(stops, "stops")
    if len(a) != 1 or len(b) != 1:
        raise HTTPException(status_code=422, detail="start and end take one point")
    try:
        grid = load_grid(site_id)
    except (OSError, ValueError):
        logger.exception("Terrain for %r is unavailable", site_id)
        raise HTTPException(status_code=503, detail="Terrain unavailable") from None
    try:
        return plan_routes(grid, [*a, *mid, *b], max_grade_deg=max_grade_deg)
    except RouteError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
