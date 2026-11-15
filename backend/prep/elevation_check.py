"""Cross-check the primary DTM against rover localization elevations (CH26-017).

A consistency check, not an accuracy assessment: Perseverance localizations
are tied to orbital maps of Jezero, so agreement shows the two products share
a vertical reference and grid alignment, not that either is correct.

Inputs (read-only; nothing in the route pipeline is changed):
- derived/dtm_primary_window.tif from prep.dtm_window (git-ignored). Its pixel
  hash is checked against dtm_primary_window.json before sampling.
- inputs/rover_waypoints.geojson from prep.rover_inputs: the MMGIS waypoint
  snapshot, elev_geoid in metres.

Method
- Positions: every localization in the snapshot from sol 439 to sol 502, the
  historical drives used by the scope (25 points, 24_4308 to 26_1222).
- Each [lon, lat] is projected with the DTM's own equirectangular transform
  (sphere 3,396,190 m, lat_ts = 0, lon_0 = 0), exactly as prep.profiles does,
  and sampled with the same bilinear interpolation (local_grid.bilinear).
- Residual = DTM - elev_geoid, metres. Positive means the DTM is higher.
- elev_geoid is checked to be referenced to the areoid: elev_radii is radius
  minus 3,396,190 m, and elev_geoid - elev_radii (the areoid height above the
  sphere) must be nearly constant over a few hundred metres.
Output: data/hawksbill_gap/elevation_check.json.
"""

import math
import statistics
from typing import Any

from prep.common import (
    DERIVED_DIR,
    INPUTS_DIR,
    SCENARIO_DIR,
    load_manifest,
    sha256_bytes,
    utc_now,
    write_json,
)
from prep.local_grid import bilinear

SOL_RANGE = (439, 502)
EXPECTED_COUNT = 25
CROP_PATH = DERIVED_DIR / "dtm_primary_window.tif"
CROP_RECORD_PATH = SCENARIO_DIR / "dtm_primary_window.json"
WAYPOINTS_PATH = INPUTS_DIR / "rover_waypoints.geojson"
CHECK_PATH = SCENARIO_DIR / "elevation_check.json"
SHIFTS_M = {
    "east_1m": (1.0, 0.0),
    "west_1m": (-1.0, 0.0),
    "north_1m": (0.0, 1.0),
    "south_1m": (0.0, -1.0),
}


def select(features: list[dict[str, Any]], sols: tuple[int, int]) -> list[dict]:
    lo, hi = sols
    return [f["properties"] for f in features if lo <= f["properties"]["sol"] <= hi]


def to_xy(lon: float, lat: float, radius_m: float) -> tuple[float, float]:
    return radius_m * math.radians(lon), radius_m * math.radians(lat)


def sample(
    data: Any, transform: tuple[float, ...], nodata: float, x: float, y: float
) -> float | None:
    a, _, c, _, e, f = transform
    return bilinear(data, nodata, (y - f) / e, (x - c) / a)


def summary(values: list[float]) -> dict[str, float]:
    return {
        "mean": round(statistics.fmean(values), 3),
        "median": round(statistics.median(values), 3),
        "std": round(statistics.stdev(values), 3),
        "min": round(min(values), 3),
        "max": round(max(values), 3),
        "rms": round(math.sqrt(statistics.fmean(v * v for v in values)), 3),
        "mean_abs": round(statistics.fmean(abs(v) for v in values), 3),
    }


def compare(
    points: list[dict[str, Any]],
    elevation_at: Any,
    sphere_m: float,
) -> list[dict[str, Any]]:
    rows = []
    for p in points:
        dtm = elevation_at(p["lon"], p["lat"])
        rows.append(
            {
                "rmc": p["RMC"],
                "sol": p["sol"],
                "final": p["final"],
                "lon": p["lon"],
                "lat": p["lat"],
                "elev_geoid_m": round(p["elev_geoid"], 3),
                "dtm_m": None if dtm is None else round(dtm, 3),
                "residual_m": None if dtm is None else round(dtm - p["elev_geoid"], 3),
                "radius_check_m": round(p["radius"] - sphere_m - p["elev_radii"], 3),
                "areoid_above_sphere_m": round(p["elev_geoid"] - p["elev_radii"], 3),
            }
        )
    return rows


def main() -> None:
    import json

    import rasterio

    manifest = load_manifest()
    radius_m = manifest["conventions"]["projected"]["sphere_radius_m"]
    crop_record = json.loads(CROP_RECORD_PATH.read_text(encoding="utf-8"))
    with rasterio.open(CROP_PATH) as src:
        data = src.read(1)
        transform = tuple(src.transform)[:6]
        nodata = src.nodata
    if sha256_bytes(data.astype("<f4").tobytes()) != crop_record["data_sha256"]:
        raise SystemExit("DTM crop differs from dtm_primary_window.json; rerun prep")

    waypoints = json.loads(WAYPOINTS_PATH.read_text(encoding="utf-8"))
    points = select(waypoints["features"], SOL_RANGE)
    rows = compare(
        points,
        lambda lon, lat: sample(data, transform, nodata, *to_xy(lon, lat, radius_m)),
        radius_m,
    )
    residuals = [r["residual_m"] for r in rows if r["residual_m"] is not None]
    areoid = [r["areoid_above_sphere_m"] for r in rows]

    def nearest(lon: float, lat: float) -> float:
        x, y = to_xy(lon, lat, radius_m)
        a, _, c, _, e, f = transform
        return float(data[int((y - f) / e), int((x - c) / a)])

    nearest_residuals = [nearest(p["lon"], p["lat"]) - p["elev_geoid"] for p in points]

    def shifted_rms(dx: float, dy: float) -> float:
        values = []
        for p in points:
            x, y = to_xy(p["lon"], p["lat"], radius_m)
            values.append(sample(data, transform, nodata, x + dx, y + dy))
        diffs = [v - p["elev_geoid"] for v, p in zip(values, points, strict=True)]
        return round(math.sqrt(statistics.fmean(d * d for d in diffs)), 3)

    shifts = {name: shifted_rms(dx, dy) for name, (dx, dy) in SHIFTS_M.items()}

    findings = []
    if len(rows) != EXPECTED_COUNT:
        findings.append(f"{len(rows)} localizations, expected {EXPECTED_COUNT}")
    if len(residuals) != len(rows):
        findings.append(f"{len(rows) - len(residuals)} positions have no DTM value")
    if max(abs(r["radius_check_m"]) for r in rows) > 0.01:
        findings.append("elev_radii is not radius minus the 3,396,190 m sphere")

    write_json(
        CHECK_PATH,
        {
            "check": "consistency of primary DTM with rover localization elevations",
            "issue": "CH26-017 (#35)",
            "computed_at": utc_now(),
            "dtm": {
                "input_id": "dtm-primary",
                "source_url": crop_record["source_url"],
                "crop_data_sha256": crop_record["data_sha256"],
                "vertical_reference": "areoid (MOLA geoid), per file name "
                "'MOLAtopography_DeltaGeoid'; agrees with elev_geoid below",
            },
            "localizations": {
                "input_id": "m20-waypoints",
                "source_url": waypoints_source(),
                "field": "elev_geoid",
                "vertical_reference": "areoid; elev_radii = radius - 3,396,190 m, "
                "elev_geoid - elev_radii = areoid height above that sphere",
                "sols": list(SOL_RANGE),
            },
            "method": "DTM sampled at each localization [lon, lat] with the route "
            "pipeline's equirectangular projection and bilinear interpolation; "
            "residual = DTM - elev_geoid",
            "sample_count": len(residuals),
            "residual_m": summary(residuals),
            "nearest_cell_residual_m": summary(nearest_residuals),
            "sensitivity_rms_m": {
                "note": "Residual RMS after moving every position 1 m (one "
                "DTM cell). The route climbs mostly northward, so a "
                "north-south shift shows clearly and an east-west shift only "
                "weakly.",
                "unshifted": summary(residuals)["rms"],
                **shifts,
            },
            "areoid_above_sphere_m": {
                "min": round(min(areoid), 3),
                "max": round(max(areoid), 3),
            },
            "findings": findings,
            "points": rows,
        },
    )
    s = summary(residuals)
    status = "OK" if not findings else "CHECK"
    print(
        f"{status}: n={len(residuals)} median {s['median']:+.3f} m, "
        f"mean {s['mean']:+.3f} m, std {s['std']:.3f} m, "
        f"range {s['min']:+.3f}..{s['max']:+.3f} m -> {CHECK_PATH.name}"
    )
    for note in findings:
        print(" -", note)


def waypoints_source() -> str:
    import json

    record = json.loads((INPUTS_DIR / "rover_inputs.json").read_text(encoding="utf-8"))
    return record["sources"]["m20-waypoints"]["url"]


if __name__ == "__main__":
    main()
