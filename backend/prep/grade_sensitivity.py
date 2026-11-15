"""Compare route grades on the primary DTM at 2, 5, and 10 m (CH26-029)."""

import json
from typing import Any

from prep import profiles
from prep.common import SCENARIO_DIR, load_manifest, sha256_bytes, write_json
from prep.dtm_window import CROP_PATH, RECORD_PATH
from prep.local_grid import relative
from prep.routes import ROUTES_PATH

OUTPUT_PATH = SCENARIO_DIR / "route_grade_sensitivity.json"


def window_metrics(
    coords: list[profiles.Point], grid: profiles.Grid, radius_m: float, step_m: float
) -> dict[str, Any]:
    samples = profiles.sample_path(coords, grid, step_m, radius_m)
    distances, elevations = samples["distance_m"], samples["elevation_m"]
    intervals = profiles.graded_intervals(distances, elevations)
    best = profiles.steepest(intervals)
    covered_m = sum(end - start for start, end, _ in intervals)
    return {
        "nominal_window_m": step_m,
        "interval_m": round(distances[1], 4),
        "outbound_samples": len(elevations),
        "missing_samples": elevations.count(None),
        "covered_outbound_m": round(covered_m, 2),
        "missing_outbound_m": round(distances[-1] - covered_m, 2),
        "steepest": (
            None
            if best is None
            else {
                "from_outbound_m": round(best[0], 2),
                "to_outbound_m": round(best[1], 2),
                "grade_deg": round(best[2], 2),
            }
        ),
    }


def main() -> None:
    import rasterio

    if not CROP_PATH.is_file():
        raise SystemExit(
            f"Missing {CROP_PATH}. Prepare it with python -m prep.dtm_window."
        )
    record = json.loads(RECORD_PATH.read_text(encoding="utf-8"))
    manifest = load_manifest()
    radius_m = manifest["conventions"]["geographic"]["reference_sphere_radius_m"]
    bounds = record["bounds_m"]
    size = record["pixel_size_m"]
    expected_transform = (size, 0, bounds["left"], 0, -size, bounds["top"])
    with rasterio.open(CROP_PATH) as src:
        data = src.read(1)
        transform = tuple(src.transform)[:6]
        nodata = src.nodata
    digest = sha256_bytes(data.astype("<f4").tobytes())
    if (
        digest != record["data_sha256"]
        or transform != expected_transform
        or nodata != record["nodata"]
        or data.shape != (record["window"]["height"], record["window"]["width"])
    ):
        raise SystemExit(
            f"{CROP_PATH} differs from {RECORD_PATH}. Check the source crop."
        )

    grid = profiles.Grid(data, transform, nodata, profiles.eqc(radius_m))
    route_text = ROUTES_PATH.read_text(encoding="utf-8")
    routes = json.loads(route_text)
    options = {}
    for option in routes["options"]:
        coords = profiles.outbound_line(routes, option)
        length_m = profiles.cumulative_m(coords, radius_m)[-1]
        options[option] = {
            "outbound_m": round(length_m, 2),
            "round_trip_m": round(2 * length_m, 2),
            "windows": [
                window_metrics(coords, grid, radius_m, step)
                for step in profiles.STEPS_M
            ],
        }

    write_json(
        OUTPUT_PATH,
        {
            "dtm": {
                "input_id": record["input_id"],
                "source_url": record["source_url"],
                "crop_record": relative(RECORD_PATH),
                "data_sha256": digest,
            },
            "routes_file": relative(ROUTES_PATH),
            "routes_sha256_utf8_lf": sha256_bytes(route_text.encode("utf-8")),
            "sphere_radius_m": radius_m,
            "options": options,
        },
    )
    print(f"Wrote {relative(OUTPUT_PATH)}")


if __name__ == "__main__":
    main()
