"""Route elevation profiles, ascent, grade and DTM coverage (CH26-024/025/027).

Inputs: routes.geojson (prep.routes) and the source crop of the primary USGS
DTM (prep.dtm_window, derived/dtm_primary_window.tif, git-ignored), which is in
the DTM's own equirectangular projection (lat_ts = 0, lon_0 = 0, 1 m cells).
The 1 m local grid (prep.local_grid) is only used for a cross-check.
Output: data/hawksbill_gap/route_metrics.json.

Sampling (#42)
- The outbound path of an option is its outbound pieces joined in file order
  (A: historical, proposed connector, historical).
- Distance along the path is the sum of great-circle arcs between vertices on
  the Mars sphere (R = 3,396,190 m), as in prep.routes.
- For a step s and outbound length L, the path gets n = ceil(L / s) equal
  intervals of L / n <= s meters, so samples are evenly spaced, the first is
  the start vertex and the last is the final vertex. Inside a vertex segment
  the position is interpolated linearly by the fraction of the segment's
  great-circle length; on the equirectangular crop that is linear in lon/lat,
  so each sample sits at its true lon/lat position.
- Elevation is one bilinear interpolation on the source crop
  (local_grid.bilinear), with no prior resampling. If any of the four
  neighbouring cells is NoData, or the point is off the grid, the sample is
  null. Nulls break the series: nothing is interpolated across a gap and no
  gap is ever 0.
- The round-trip profile is the outbound series followed by its mirror; the
  return distance continues from the outbound length to the round trip.

Metrics (#43), taken only between consecutive samples that are both valid
- Round-trip ascent, meters: sum of |dz| over consecutive outbound samples at
  the nominal 5 m step. Each outbound descent is a climb on the return, so
  this equals outbound climb + return climb.
- Max absolute grade, degrees: max of degrees(atan(|dz| / dd)), with dz the
  elevation change in meters and dd the horizontal great-circle distance in
  meters between the two samples (the interval L / n above).

Coverage (#45)
- An interval between consecutive nominal samples is covered when both of its
  samples are valid. Covered length / outbound length gives the percentage.
  Runs of uncovered intervals become gap segments, cut from the outbound
  geometry as [lon, lat] LineStrings for the map.

The served values reproduce the scope's locked table. The record also keeps
local_grid_check: the same sampling on the 1 m local aeqd grid. That grid is a
second bilinear resampling of the crop, which smooths short relief, so its
2 m grades come out lower.
"""

import itertools
import math
from collections.abc import Callable
from typing import Any

from prep.common import SCENARIO_DIR, sha256_bytes, utc_now, write_json
from prep.local_grid import LOCAL_PATH, aeqd_forward, bilinear, relative
from prep.local_grid import RECORD_PATH as LOCAL_RECORD_PATH
from prep.routes import ROUTES_PATH, distance_m, join

METRICS_PATH = SCENARIO_DIR / "route_metrics.json"
STEPS_M = (2.0, 5.0, 10.0)
NOMINAL_STEP_M = 5.0

Point = list[float]
Transform = tuple[float, float, float, float, float, float]
ToXY = Callable[[float, float], tuple[float, float]]


class Grid:
    """North-up raster rows, their transform and NoData, plus lon/lat -> x/y."""

    def __init__(
        self, data: Any, transform: Transform, nodata: float, to_xy: ToXY
    ) -> None:
        self.data, self.transform, self.nodata, self.to_xy = (
            data,
            transform,
            nodata,
            to_xy,
        )

    def sample(self, x: float, y: float) -> float | None:
        a, _, c, _, e, f = self.transform
        return bilinear(self.data, self.nodata, (y - f) / e, (x - c) / a)


def aeqd(center: tuple[float, float], radius_m: float) -> ToXY:
    return lambda lon, lat: aeqd_forward(lon, lat, *center, radius_m)


def eqc(radius_m: float) -> ToXY:
    """Equirectangular with lat_ts = 0 and lon_0 = 0, as in the USGS DTM."""
    return lambda lon, lat: (
        radius_m * math.radians(lon),
        radius_m * math.radians(lat),
    )


def outbound_line(routes: dict[str, Any], option: str) -> list[Point]:
    """Outbound pieces of one option joined in their file order."""
    pieces = [
        f["geometry"]["coordinates"]
        for f in routes["features"]
        if f["properties"]["option"] == option and f["properties"]["leg"] == "outbound"
    ]
    return join(pieces)


def cumulative_m(coords: list[Point], radius_m: float) -> list[float]:
    out = [0.0]
    for a, b in itertools.pairwise(coords):
        out.append(out[-1] + distance_m(a, b, radius_m))
    return out


def sample_distances(length_m: float, step_m: float) -> list[float]:
    """n = ceil(length / step) equal intervals; includes both end vertices."""
    n = max(1, math.ceil(length_m / step_m - 1e-9))
    return [length_m * k / n for k in range(n + 1)]


def locate(cumulative: list[float], d: float) -> tuple[int, float]:
    """Segment index and fraction along it for a distance along the path."""
    last = len(cumulative) - 2
    if last < 0:
        raise ValueError("path needs at least two vertices")
    for i in range(last + 1):
        if d <= cumulative[i + 1] or i == last:
            seg = cumulative[i + 1] - cumulative[i]
            t = 0.0 if seg == 0 else (d - cumulative[i]) / seg
            return i, min(1.0, max(0.0, t))
    raise AssertionError("unreachable")


def lerp(a: Any, b: Any, t: float) -> list[float]:
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]


def sample_path(
    coords: list[Point], grid: Grid, step_m: float, radius_m: float
) -> dict[str, list]:
    """Outbound samples: distance and elevation (None where NoData)."""
    cumulative = cumulative_m(coords, radius_m)
    xy = [grid.to_xy(p[0], p[1]) for p in coords]
    distances = sample_distances(cumulative[-1], step_m)
    elevations = []
    for d in distances:
        i, t = locate(cumulative, d)
        elevations.append(grid.sample(*lerp(xy[i], xy[i + 1], t)))
    return {"distance_m": distances, "elevation_m": elevations}


def valid_pairs(distances: list[float], elevations: list[float | None]):
    """(dd, dz) for consecutive samples that are both valid."""
    for (d0, z0), (d1, z1) in itertools.pairwise(zip(distances, elevations)):
        if z0 is not None and z1 is not None:
            yield d1 - d0, z1 - z0


def round_trip_ascent_m(
    distances: list[float], elevations: list[float | None]
) -> float:
    """Sum of |dz| over the outbound: outbound climbs + return climbs."""
    return sum(abs(dz) for _, dz in valid_pairs(distances, elevations))


def max_grade_deg(
    distances: list[float], elevations: list[float | None]
) -> float | None:
    """Max degrees(atan(|dz| / dd)) over consecutive valid samples."""
    grades = [
        math.degrees(math.atan(abs(dz) / dd))
        for dd, dz in valid_pairs(distances, elevations)
        if dd > 0
    ]
    return max(grades) if grades else None


def round_trip(
    distances: list[float], elevations: list[float | None]
) -> tuple[list[float], list[float | None]]:
    """Outbound followed by its mirror; the turnaround sample is not repeated."""
    total = distances[-1]
    back = [2 * total - d for d in reversed(distances[:-1])]
    return distances + back, elevations + list(reversed(elevations[:-1]))


def cut_line(
    coords: list[Point], cumulative: list[float], start: float, end: float
) -> list[list[float]]:
    """Sub-line between two distances along the path, as [lon, lat] points."""
    i, t = locate(cumulative, start)
    j, u = locate(cumulative, end)
    points = [lerp(coords[i], coords[i + 1], t)]
    points += [list(coords[k][:2]) for k in range(i + 1, j + 1)]
    points.append(lerp(coords[j], coords[j + 1], u))
    out = [points[0]]
    for p in points[1:]:
        if p != out[-1]:
            out.append(p)
    return out


def coverage(
    coords: list[Point],
    distances: list[float],
    elevations: list[float | None],
    radius_m: float,
) -> dict[str, Any]:
    """Covered length and gap segments; an interval is covered if both ends are."""
    cumulative = cumulative_m(coords, radius_m)
    total = cumulative[-1]
    spans: list[list[float]] = []
    for (d0, z0), (d1, z1) in itertools.pairwise(zip(distances, elevations)):
        if z0 is not None and z1 is not None:
            continue
        if spans and spans[-1][1] == d0:
            spans[-1][1] = d1
        else:
            spans.append([d0, d1])
    gap_m = sum(b - a for a, b in spans)
    return {
        "length_m": total,
        "covered_m": total - gap_m,
        "gap_m": gap_m,
        "covered_pct": 100 * (total - gap_m) / total if total else 0.0,
        "gaps": [
            {
                "from_m": a,
                "to_m": b,
                "length_m": b - a,
                "coordinates": cut_line(coords, cumulative, a, b),
            }
            for a, b in spans
        ],
    }


def r(value: float | None, digits: int) -> float | None:
    return None if value is None else round(value, digits)


def summary(coords: list[Point], grid: Grid, radius_m: float) -> dict[str, Any]:
    """Ascent and max grade at each step, plus the raw samples."""
    by_step = {step: sample_path(coords, grid, step, radius_m) for step in STEPS_M}
    return {
        "by_step": by_step,
        "ascent_m": {
            f"{step:g}": round(
                round_trip_ascent_m(s["distance_m"], s["elevation_m"]), 2
            )
            for step, s in by_step.items()
        },
        "max_grade_deg": {
            f"{step:g}": r(max_grade_deg(s["distance_m"], s["elevation_m"]), 2)
            for step, s in by_step.items()
        },
        "spacing_m": {
            f"{step:g}": round(s["distance_m"][1], 4) for step, s in by_step.items()
        },
        "samples": {
            f"{step:g}": {
                "count": len(s["elevation_m"]),
                "valid": sum(z is not None for z in s["elevation_m"]),
            }
            for step, s in by_step.items()
        },
    }


def option_metrics(coords: list[Point], grid: Grid, radius_m: float) -> dict:
    stats = summary(coords, grid, radius_m)
    nominal = stats.pop("by_step")[NOMINAL_STEP_M]
    distances, elevations = round_trip(nominal["distance_m"], nominal["elevation_m"])
    cover = coverage(coords, nominal["distance_m"], nominal["elevation_m"], radius_m)
    nominal_key = f"{NOMINAL_STEP_M:g}"
    return {
        "outbound_m": round(nominal["distance_m"][-1], 2),
        "round_trip_m": round(distances[-1], 2),
        "ascent_m": stats["ascent_m"][nominal_key],
        "max_grade_deg": stats["max_grade_deg"],
        "by_step": {
            "ascent_m": stats["ascent_m"],
            "spacing_m": stats["spacing_m"],
            "samples": stats["samples"],
        },
        "coverage": {
            "step_m": NOMINAL_STEP_M,
            "length_m": round(cover["length_m"], 2),
            "covered_m": round(cover["covered_m"], 2),
            "gap_m": round(cover["gap_m"], 2),
            "covered_pct": round(cover["covered_pct"], 2),
        },
        "gaps": [
            {
                "from_m": round(g["from_m"], 2),
                "to_m": round(g["to_m"], 2),
                "length_m": round(g["length_m"], 2),
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[round(v, 8) for v in p] for p in g["coordinates"]],
                },
            }
            for g in cover["gaps"]
        ],
        "profile": {
            "step_m": NOMINAL_STEP_M,
            "spacing_m": stats["spacing_m"][nominal_key],
            "distance_m": [round(d, 2) for d in distances],
            "elevation_m": [r(z, 3) for z in elevations],
        },
    }


METHOD = {
    "path": "Outbound pieces joined in order (A includes the proposed connector); "
    "the return retraces the outbound path.",
    "sampling": "n = ceil(L / step) equal intervals of L / n <= step meters over "
    "the outbound length L, from the start vertex to the final vertex. Distance is "
    "great-circle on the Mars sphere; within a vertex segment the position is "
    "linear in lon/lat (the true sample position on the equirectangular crop).",
    "elevation": "One bilinear interpolation on the primary DTM source crop "
    "(equirectangular, 1 m cells), no prior resampling. A sample whose four "
    "neighbouring cells include NoData, or that falls off the crop, is null and "
    "breaks the series; gaps are never interpolated or set to 0.",
    "profile": "Outbound samples at the nominal 5 m step followed by their mirror; "
    "return distance continues from the outbound length to the round trip.",
    "ascent_m": "Round-trip ascent in meters: sum of |dz| between consecutive "
    "valid outbound samples at 5 m (each outbound descent is a climb on return).",
    "max_grade_deg": "Degrees: max over consecutive valid samples of "
    "degrees(atan(|dz| / dd)), dz in meters, dd the horizontal great-circle "
    "distance in meters between the two samples (the interval L / n).",
    "coverage": "An interval between consecutive 5 m samples is covered when both "
    "samples are valid. Gaps are runs of uncovered intervals as lon/lat "
    "LineStrings.",
    "local_grid_check": "Same sampling on the 1 m local aeqd grid (prep.local_grid); "
    "a second bilinear resampling smooths short relief, lowering the 2 m grades most.",
}


def build(
    routes: dict[str, Any],
    grid: Grid,
    radius_m: float,
    dtm: dict[str, Any],
    check_grid: Grid | None = None,
) -> dict[str, Any]:
    options = {}
    checks = {}
    for option in routes["options"]:
        coords = outbound_line(routes, option)
        options[option] = option_metrics(coords, grid, radius_m)
        if check_grid is not None:
            stats = summary(coords, check_grid, radius_m)
            checks[option] = {
                "ascent_m": stats["ascent_m"][f"{NOMINAL_STEP_M:g}"],
                "max_grade_deg": stats["max_grade_deg"],
            }
    record = {
        "input_id": "dtm-primary",
        "dtm": dtm,
        "routes_file": relative(ROUTES_PATH),
        "sphere_radius_m": radius_m,
        "steps_m": list(STEPS_M),
        "nominal_step_m": NOMINAL_STEP_M,
        "units": {
            "distance": "m",
            "elevation": "m",
            "ascent": "m",
            "grade": "degrees",
        },
        "method": METHOD,
        "options": options,
    }
    if check_grid is not None:
        record["local_grid_check"] = checks
    return record


def main() -> None:
    import json

    import rasterio

    from prep.common import load_manifest
    from prep.dtm_window import CROP_PATH
    from prep.dtm_window import RECORD_PATH as CROP_RECORD_PATH

    manifest = load_manifest()
    radius_m = manifest["conventions"]["geographic"]["reference_sphere_radius_m"]
    local_record = json.loads(LOCAL_RECORD_PATH.read_text(encoding="utf-8"))
    crop_record = json.loads(CROP_RECORD_PATH.read_text(encoding="utf-8"))

    def read(path: Any, record: dict[str, Any]) -> tuple[Any, Transform, float]:
        with rasterio.open(path) as src:
            data = src.read(1)
            transform, nodata = tuple(src.transform)[:6], src.nodata
        digest = sha256_bytes(data.astype("<f4").tobytes())
        if digest != record["data_sha256"]:
            raise SystemExit(
                f"{path.name}: data hash {digest} does not match its record "
                f"({record['data_sha256']}); rebuild it."
            )
        return data, transform, nodata

    crop, crop_transform, crop_nodata = read(CROP_PATH, crop_record)
    local, local_transform, local_nodata = read(LOCAL_PATH, local_record)
    center = tuple(local_record["local"]["center_lon_lat"])
    grid = Grid(crop, crop_transform, crop_nodata, eqc(radius_m))
    check = Grid(local, local_transform, local_nodata, aeqd(center, radius_m))
    dtm = {
        "file": relative(CROP_PATH),
        "record": relative(CROP_RECORD_PATH),
        "data_sha256": crop_record["data_sha256"],
        "source_url": crop_record["source_url"],
        "window": crop_record["window"],
        "crs_proj4": local_record["source"]["crs_proj4"],
        "transform": list(crop_transform),
        "shape": list(crop.shape),
        "nodata": crop_nodata,
        "vertical_reference": crop_record["vertical_reference"],
        "local_grid": {
            "file": relative(LOCAL_PATH),
            "record": relative(LOCAL_RECORD_PATH),
            "data_sha256": local_record["data_sha256"],
            "crs_proj4": local_record["local"]["crs_proj4"],
            "transform": list(local_transform),
            "shape": list(local.shape),
        },
    }
    routes = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    result = {"created_at": utc_now(), **build(routes, grid, radius_m, dtm, check)}
    write_json(METRICS_PATH, result)
    for option, info in result["options"].items():
        print(
            option,
            "crop:",
            info["round_trip_m"],
            info["ascent_m"],
            info["max_grade_deg"],
            f"{info['coverage']['covered_pct']}% covered,",
            len(info["gaps"]),
            "gaps | local grid:",
            result["local_grid_check"][option],
        )


if __name__ == "__main__":
    main()
