"""Resample the DTM crop onto a local metric grid (CH26-039).

The source crop (prep.dtm_window) is in the global Mars equirectangular
projection. At 18.46 N its east-west cells are about 5% narrower on the ground
than its north-south cells. Route sampling (#41, #42) needs true meters in both
directions, so this script resamples the crop onto a 1 m grid in a local
azimuthal equidistant projection centered on the working extent.

- Bilinear resampling. NoData stays NoData; it is never filled or set to 0.
- Cells outside the source crop are NoData.
- The record keeps both projections, both transforms, the NoData value and the
  vertical reference, plus two self-checks: control samples (rover waypoints
  and the extent center) must land in the intended cells and match the source
  elevation, and a synthetic NoData hole must stay missing after resampling.
"""

import math
from typing import Any

from prep.common import (
    DERIVED_DIR,
    INPUTS_DIR,
    SCENARIO_DIR,
    load_manifest,
    manifest_input,
    sha256_bytes,
    utc_now,
    write_json,
)
from prep.dtm_window import CROP_PATH

LOCAL_PATH = DERIVED_DIR / "dtm_local.tif"
RECORD_PATH = SCENARIO_DIR / "dtm_local.json"
CELL_SIZE_M = 1.0
CONTROL_RMCS = ("25_446", "26_1004", "26_1222")
# Resampled values may differ from the source, sampled bilinearly at the same
# point, only by floating-point noise.
ELEVATION_TOLERANCE_M = 0.01
HOLE = {"row_off": 230, "col_off": 230, "size": 12}

Transform = tuple[float, float, float, float, float, float]


def center_of(extent: dict[str, float]) -> tuple[float, float]:
    return (
        (extent["lon_min"] + extent["lon_max"]) / 2,
        (extent["lat_min"] + extent["lat_max"]) / 2,
    )


def local_proj(lon0: float, lat0: float, radius_m: float) -> str:
    return (
        f"+proj=aeqd +lat_0={lat0} +lon_0={lon0} +x_0=0 +y_0=0 "
        f"+R={radius_m} +units=m +no_defs"
    )


def aeqd_forward(
    lon: float, lat: float, lon0: float, lat0: float, radius_m: float
) -> tuple[float, float]:
    """Spherical azimuthal equidistant projection (Snyder 1987, eqs. 25-2 to 25-4)."""
    lam, phi, lam0, phi0 = map(math.radians, (lon, lat, lon0, lat0))
    dlam = lam - lam0
    cos_c = math.sin(phi0) * math.sin(phi) + math.cos(phi0) * math.cos(phi) * math.cos(
        dlam
    )
    c = math.acos(max(-1.0, min(1.0, cos_c)))
    k = 1.0 if c == 0 else c / math.sin(c)
    x = radius_m * k * math.cos(phi) * math.sin(dlam)
    y = (
        radius_m
        * k
        * (
            math.cos(phi0) * math.sin(phi)
            - math.sin(phi0) * math.cos(phi) * math.cos(dlam)
        )
    )
    return x, y


def cell_of(transform: Transform, x: float, y: float) -> tuple[int, int]:
    """(row, col) of the north-up cell containing a projected point."""
    a, _, c, _, e, f = transform
    return math.floor((y - f) / e), math.floor((x - c) / a)


def cell_center(transform: Transform, row: int, col: int) -> tuple[float, float]:
    a, _, c, _, e, f = transform
    return c + (col + 0.5) * a, f + (row + 0.5) * e


def snap_grid(
    bounds: tuple[float, float, float, float], cell_m: float
) -> tuple[Transform, int, int]:
    """North-up grid aligned to whole cells that covers the given bounds."""
    left, bottom, right, top = bounds
    left = math.floor(left / cell_m) * cell_m
    bottom = math.floor(bottom / cell_m) * cell_m
    right = math.ceil(right / cell_m) * cell_m
    top = math.ceil(top / cell_m) * cell_m
    width = round((right - left) / cell_m)
    height = round((top - bottom) / cell_m)
    return (cell_m, 0.0, left, 0.0, -cell_m, top), width, height


def bilinear(data: Any, nodata: float, row_f: float, col_f: float) -> float | None:
    """Bilinear sample at fractional cell coordinates (0.5 = cell center).

    Returns None near the edge or when any neighbour is NoData.
    """
    r, c = row_f - 0.5, col_f - 0.5
    r0, c0 = math.floor(r), math.floor(c)
    if r0 < 0 or c0 < 0 or r0 + 1 >= len(data) or c0 + 1 >= len(data[0]):
        return None
    dr, dc = r - r0, c - c0
    total = 0.0
    for rr, cc, weight in (
        (r0, c0, (1 - dr) * (1 - dc)),
        (r0, c0 + 1, (1 - dr) * dc),
        (r0 + 1, c0, dr * (1 - dc)),
        (r0 + 1, c0 + 1, dr * dc),
    ):
        value = float(data[rr][cc])
        if value == nodata or not math.isfinite(value):
            return None
        total += weight * value
    return total


def control_points(
    waypoints: list[dict[str, Any]], center: tuple[float, float]
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = [
        {"id": "extent-center", "lon": center[0], "lat": center[1]}
    ]
    for feature in waypoints:
        props = feature["properties"]
        if props["RMC"] in CONTROL_RMCS:
            points.append(
                {
                    "id": props["RMC"],
                    "lon": props["lon"],
                    "lat": props["lat"],
                    "rover_elev_geoid_m": props["elev_geoid"],
                }
            )
    return points


def control_findings(
    samples: list[dict[str, Any]], mask_check: dict[str, Any]
) -> list[str]:
    notes = []
    for s in samples:
        name = s["id"]
        if not s["round_trip_same_cell"]:
            notes.append(f"{name}: cell center does not map back to the same cell")
        if s["local_value_m"] is None:
            notes.append(f"{name}: local grid has NoData at the control cell")
        elif s["local_minus_source_m"] is None:
            notes.append(f"{name}: source has no value at the control point")
        elif abs(s["local_minus_source_m"]) > ELEVATION_TOLERANCE_M:
            diff = s["local_minus_source_m"]
            notes.append(f"{name}: local value differs from source by {diff} m")
    if mask_check["cells_checked"] == 0:
        notes.append("NoData hole check covered no output cells")
    if mask_check["filled_cells"]:
        filled = mask_check["filled_cells"]
        notes.append(f"{filled} cells inside the NoData hole got values")
    if mask_check["zero_cells"]:
        notes.append(f"{mask_check['zero_cells']} output cells are exactly 0")
    return notes


def relative(path: Any) -> str:
    return str(path.relative_to(SCENARIO_DIR.parents[1])).replace("\\", "/")


def main() -> None:
    import json

    import numpy as np
    import rasterio
    from rasterio.crs import CRS
    from rasterio.transform import Affine
    from rasterio.warp import Resampling, reproject, transform, transform_bounds

    manifest = load_manifest()
    dtm = manifest_input(manifest, "dtm-primary")
    radius_m = manifest["conventions"]["geographic"]["reference_sphere_radius_m"]
    center = center_of(manifest["extent"])
    dst_crs = CRS.from_proj4(local_proj(*center, radius_m))
    geographic = CRS.from_proj4(f"+proj=longlat +R={radius_m} +no_defs")

    with rasterio.open(CROP_PATH) as src:
        source = src.read(1)
        src_crs, src_transform, nodata = src.crs, src.transform, src.nodata
        src_bounds = src.bounds

    dst_tuple, width, height = snap_grid(
        transform_bounds(src_crs, dst_crs, *src_bounds, densify_pts=21), CELL_SIZE_M
    )
    dst_transform = Affine(*dst_tuple)

    def resample(data: Any) -> Any:
        out = np.full((height, width), nodata, dtype="float32")
        reproject(
            data,
            out,
            src_transform=src_transform,
            src_crs=src_crs,
            src_nodata=nodata,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            dst_nodata=nodata,
            resampling=Resampling.bilinear,
        )
        return out

    local = resample(source)
    valid = (local != nodata) & np.isfinite(local)

    # Control samples: lon/lat -> local cell -> cell center -> lon/lat -> cell.
    waypoints = json.loads(
        (INPUTS_DIR / "rover_waypoints.geojson").read_text(encoding="utf-8")
    )["features"]
    samples = []
    for point in control_points(waypoints, center):
        (x,), (y,) = transform(geographic, dst_crs, [point["lon"]], [point["lat"]])
        fx, fy = aeqd_forward(point["lon"], point["lat"], *center, radius_m)
        row, col = cell_of(dst_tuple, x, y)
        cx, cy = cell_center(dst_tuple, row, col)
        (clon,), (clat,) = transform(dst_crs, geographic, [cx], [cy])
        (bx,), (by,) = transform(geographic, dst_crs, [clon], [clat])
        (sx,), (sy,) = transform(geographic, src_crs, [clon], [clat])
        src_col_f, src_row_f = ~src_transform * (sx, sy)
        expected = bilinear(source, nodata, src_row_f, src_col_f)
        value = float(local[row, col]) if valid[row, col] else None
        sample = {
            **point,
            "local_xy_m": [round(x, 3), round(y, 3)],
            "proj_vs_formula_m": round(math.hypot(x - fx, y - fy), 6),
            "cell": [row, col],
            "round_trip_same_cell": cell_of(dst_tuple, bx, by) == (row, col),
            "local_value_m": None if value is None else round(value, 3),
            "source_value_m": None if expected is None else round(expected, 3),
            "local_minus_source_m": None
            if value is None or expected is None
            else round(value - expected, 4),
        }
        if "rover_elev_geoid_m" in point and value is not None:
            diff = point["rover_elev_geoid_m"] - value
            sample["rover_minus_local_m"] = round(diff, 3)
        samples.append(sample)

    # Mask check: punch a NoData hole in a copy of the source and resample it.
    holed = source.copy()
    r0, c0, size = HOLE["row_off"], HOLE["col_off"], HOLE["size"]
    holed[r0 : r0 + size, c0 : c0 + size] = nodata
    holed_local = resample(holed)
    rows, cols = np.mgrid[0:height, 0:width]
    xs, ys = dst_transform * (cols + 0.5, rows + 0.5)
    lon, lat = transform(dst_crs, geographic, xs.ravel(), ys.ravel())
    sx, sy = transform(geographic, src_crs, lon, lat)
    scol, srow = ~src_transform * (np.asarray(sx), np.asarray(sy))
    # Output cells whose center lies at least one source cell inside the hole.
    inside = (
        (srow >= r0 + 1)
        & (srow < r0 + size - 1)
        & (scol >= c0 + 1)
        & (scol < c0 + size - 1)
    ).reshape(height, width)
    mask_check = {
        **HOLE,
        "cells_checked": int(inside.sum()),
        "filled_cells": int((holed_local[inside] != nodata).sum()),
        "zero_cells": int((local == 0).sum()),
    }

    profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "width": width,
        "height": height,
        "crs": dst_crs,
        "transform": dst_transform,
        "nodata": nodata,
        "compress": "deflate",
    }
    LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(LOCAL_PATH, "w", **profile) as dst:
        dst.write(local, 1)

    values = local[valid]
    record = {
        "input_id": "dtm-primary",
        "source_file": relative(CROP_PATH),
        "created_at": utc_now(),
        "source": {
            "crs_proj4": src_crs.to_proj4(),
            "transform": list(src_transform)[:6],
            "shape": list(source.shape),
        },
        "local": {
            "crs_proj4": dst_crs.to_proj4(),
            "crs_wkt": dst_crs.to_wkt(),
            "center_lon_lat": list(center),
            "transform": list(dst_tuple),
            "shape": [height, width],
            "cell_size_m": CELL_SIZE_M,
        },
        "resampling": "bilinear; NoData excluded, never filled",
        "dtype": "float32",
        "nodata": nodata,
        "vertical_units": dtm["convention"]["vertical_units"],
        "vertical_reference": dtm["convention"]["vertical_reference"],
        "cells": int(local.size),
        "valid_cells": int(valid.sum()),
        "nodata_cells": int((~valid).sum()),
        "nodata_note": "NoData cells are grid corners outside the source crop.",
        "elevation_m": {
            "min": round(float(values.min()), 3),
            "max": round(float(values.max()), 3),
            "mean": round(float(values.mean()), 3),
        },
        "data_sha256": sha256_bytes(local.astype("<f4").tobytes()),
        "output_file": relative(LOCAL_PATH),
        "control_samples": samples,
        "mask_check": mask_check,
    }
    record["findings"] = control_findings(samples, mask_check)
    write_json(RECORD_PATH, record)
    status = "OK" if not record["findings"] else "PROBLEMS"
    print(f"{status}: {record['valid_cells']}/{local.size} valid cells -> {LOCAL_PATH}")
    for note in record["findings"]:
        print(" -", note)


if __name__ == "__main__":
    main()
