"""Local surface-slope calculation for the Hawksbill Gap DTM window (CH26-026).

Calculates surface slope in degrees using a 3x3 window (Horn 1981 or
Zevenbergen-Thorne 1987). Cells adjacent to borders or NoData cells are marked
invalid (None in grid, null in JSON).

Saves the precomputed slope overlay to backend/data/hawksbill_gap/slope_overlay.json.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from prep.common import (
    DERIVED_DIR,
    SCENARIO_DIR,
    utc_now,
)
from prep.dtm_window import CROP_PATH
from prep.dtm_window import RECORD_PATH as DTM_RECORD_PATH

SLOPE_OVERLAY_JSON = SCENARIO_DIR / "slope_overlay.json"
SLOPE_OVERLAY_TIF = DERIVED_DIR / "slope_overlay.tif"


def calculate_slope(
    elevation: list[list[float | None]] | Any,
    cell_size_m: float | tuple[float, float] = 1.0,
    nodata: float | None = None,
    method: str = "horn",
) -> list[list[float | None]]:
    """Calculate surface slope in degrees over an elevation grid.

    Args:
        elevation: 2D nested list of elevations (height x width).
        cell_size_m: Pixel dimension in meters. Either a single float (dx = dy)
            or a (dx, dy) tuple.
        nodata: Value indicating missing data (in addition to None/NaN/inf).
        method: Slope algorithm - "horn" (default) or "zevenbergen_thorne".

    Returns:
        2D nested list of slopes in degrees, with same shape as input.
        Border cells and cells with any missing/NoData neighbor in their 3x3
        neighborhood are None.
    """
    if hasattr(elevation, "tolist"):
        elevation = elevation.tolist()

    if not isinstance(elevation, (list, tuple)) or len(elevation) == 0:
        raise ValueError("elevation grid must be a non-empty 2D grid")

    rows = len(elevation)
    if not isinstance(elevation[0], (list, tuple)):
        raise TypeError(f"elevation must be 2D, got 1D sequence of length {rows}")

    cols = len(elevation[0])
    if rows < 3 or cols < 3:
        raise ValueError(f"elevation grid must be at least 3x3, got {rows}x{cols}")

    if isinstance(cell_size_m, (tuple, list)):
        dx, dy = float(cell_size_m[0]), float(cell_size_m[1])
    else:
        dx = dy = float(cell_size_m)

    if dx <= 0 or dy <= 0:
        raise ValueError(f"cell_size_m must be positive, got dx={dx}, dy={dy}")

    if method not in ("horn", "zevenbergen_thorne"):
        raise ValueError(
            f"Unknown slope method: {method!r}. Expected 'horn' or 'zevenbergen_thorne'."
        )

    def is_valid(val: Any) -> bool:
        if val is None:
            return False
        try:
            f = float(val)
        except (TypeError, ValueError):
            return False
        if not math.isfinite(f):
            return False
        return not (nodata is not None and abs(f - nodata) < 1e-5)

    out: list[list[float | None]] = [[None] * cols for _ in range(rows)]

    for r in range(1, rows - 1):
        row_prev = elevation[r - 1]
        row_curr = elevation[r]
        row_next = elevation[r + 1]

        for c in range(1, cols - 1):
            a, b, c_val = row_prev[c - 1], row_prev[c], row_prev[c + 1]
            d, e, f = row_curr[c - 1], row_curr[c], row_curr[c + 1]
            g, h, i = row_next[c - 1], row_next[c], row_next[c + 1]

            if not (
                is_valid(a)
                and is_valid(b)
                and is_valid(c_val)
                and is_valid(d)
                and is_valid(e)
                and is_valid(f)
                and is_valid(g)
                and is_valid(h)
                and is_valid(i)
            ):
                continue

            fa, fb, fc = float(a), float(b), float(c_val)
            fd, ff = float(d), float(f)
            fg, fh, fi = float(g), float(h), float(i)

            if method == "horn":
                dz_dx = ((fc + 2.0 * ff + fi) - (fa + 2.0 * fd + fg)) / (8.0 * dx)
                dz_dy = ((fa + 2.0 * fb + fc) - (fg + 2.0 * fh + fi)) / (8.0 * dy)
            else:  # zevenbergen_thorne
                dz_dx = (ff - fd) / (2.0 * dx)
                dz_dy = (fb - fh) / (2.0 * dy)

            rise_run = math.hypot(dz_dx, dz_dy)
            out[r][c] = math.degrees(math.atan(rise_run))

    return out


def slope_to_json_grid(
    slope_array: list[list[float | None]], decimals: int = 2
) -> list[list[float | None]]:
    """Convert a 2D slope grid to rounded floats or None."""
    grid: list[list[float | None]] = []
    for row in slope_array:
        grid.append(
            [
                None
                if v is None or not math.isfinite(float(v))
                else round(float(v), decimals)
                for v in row
            ]
        )
    return grid


def write_compact_slope_json(path: Path, record: dict[str, Any]) -> None:
    """Write slope record with compact row serialization for the 2D values array."""
    path.parent.mkdir(parents=True, exist_ok=True)
    meta = {k: v for k, v in record.items() if k != "values"}
    meta_json = json.dumps(meta, indent=2, ensure_ascii=False)

    if "values" not in record:
        path.write_text(meta_json + "\n", encoding="utf-8", newline="\n")
        return

    assert meta_json.endswith("\n}")
    prefix = meta_json[:-2]

    rows = record["values"]
    row_lines: list[str] = []
    for row in rows:
        cells = ["null" if v is None else str(round(float(v), 2)) for v in row]
        row_lines.append("    [" + ",".join(cells) + "]")

    values_block = ',\n  "values": [\n' + ",\n".join(row_lines) + "\n  ]\n}\n"
    path.write_text(prefix + values_block, encoding="utf-8", newline="\n")


def build_slope_overlay(
    dtm_tif: Path = CROP_PATH,
    dtm_meta: Path = DTM_RECORD_PATH,
    output_json: Path = SLOPE_OVERLAY_JSON,
    output_tif: Path = SLOPE_OVERLAY_TIF,
    method: str = "horn",
) -> dict[str, Any]:
    """Compute and persist the slope overlay from the primary DTM window."""
    import rasterio

    dtm_record = json.loads(dtm_meta.read_text(encoding="utf-8"))
    with rasterio.open(dtm_tif) as src:
        raw_elevation = src.read(1)
        elevation = raw_elevation.tolist()
        profile = src.profile.copy()
        crs_wkt = src.crs.to_wkt()
        bounds_m = {
            "left": src.bounds.left,
            "right": src.bounds.right,
            "top": src.bounds.top,
            "bottom": src.bounds.bottom,
        }
        res_m = float(src.res[0])
        nodata = src.nodata

    slope_arr = calculate_slope(
        elevation, cell_size_m=res_m, nodata=nodata, method=method
    )

    rows = len(slope_arr)
    cols = len(slope_arr[0])
    total_count = rows * cols

    valid_slopes = [v for row in slope_arr for v in row if v is not None]
    valid_count = len(valid_slopes)
    nodata_count = total_count - valid_count
    valid_slopes.sort()

    mean_val = sum(valid_slopes) / valid_count if valid_count else 0.0
    variance = (
        sum((x - mean_val) ** 2 for x in valid_slopes) / valid_count
        if valid_count
        else 0.0
    )
    std_val = math.sqrt(variance)

    def percentile(p: float) -> float:
        if not valid_slopes:
            return 0.0
        idx = round((len(valid_slopes) - 1) * (p / 100.0))
        return valid_slopes[idx]

    values_grid = slope_to_json_grid(slope_arr, decimals=2)

    record: dict[str, Any] = {
        "input_id": dtm_record.get("input_id", "dtm-primary"),
        "source_file": str(dtm_tif.relative_to(SCENARIO_DIR.parents[1])).replace(
            "\\", "/"
        ),
        "created_at": utc_now(),
        "method": method,
        "kernel": (
            "Horn 3x3 kernel (1981)"
            if method == "horn"
            else "Zevenbergen-Thorne 3x3 kernel (1987)"
        ),
        "grid": {
            "width": cols,
            "height": rows,
            "cell_size_m": res_m,
            "resolution_m": res_m,
            "shape": [rows, cols],
        },
        "bounds_m": bounds_m,
        "bounds_deg": dtm_record.get("bounds_deg", {}),
        "crs_wkt": crs_wkt,
        "units": "degrees",
        "cells": total_count,
        "valid_cells": valid_count,
        "nodata_cells": nodata_count,
        "nodata_value": None,
        "slope_degrees": {
            "min": round(valid_slopes[0], 2) if valid_slopes else 0.0,
            "max": round(valid_slopes[-1], 2) if valid_slopes else 0.0,
            "mean": round(mean_val, 2),
            "median": round(percentile(50.0), 2),
            "std": round(std_val, 2),
            "p90": round(percentile(90.0), 2),
            "p95": round(percentile(95.0), 2),
        },
        "values": values_grid,
    }

    write_compact_slope_json(output_json, record)

    try:
        import numpy as np

        output_tif.parent.mkdir(parents=True, exist_ok=True)
        tif_profile = profile.copy()
        for k in ("blockxsize", "blockysize", "tiled"):
            tif_profile.pop(k, None)
        tif_profile.update(
            driver="GTiff",
            dtype="float32",
            nodata=-9999.0,
            count=1,
            compress="deflate",
        )
        tif_arr = np.full((rows, cols), -9999.0, dtype=np.float32)
        for r in range(rows):
            for c in range(cols):
                val = slope_arr[r][c]
                if val is not None:
                    tif_arr[r, c] = val

        with rasterio.open(output_tif, "w", **tif_profile) as dst:
            dst.write(tif_arr, 1)
        record["output_tif"] = str(
            output_tif.relative_to(SCENARIO_DIR.parents[1])
        ).replace("\\", "/")
    except (OSError, ImportError) as exc:
        print(f"Warning: could not write GeoTIFF {output_tif}: {exc}")

    return record


def main() -> None:
    print(f"Calculating surface slope from {CROP_PATH}...")
    record = build_slope_overlay()
    stats = record["slope_degrees"]
    print(
        f"OK: {record['valid_cells']}/{record['cells']} valid slope cells -> {SLOPE_OVERLAY_JSON}"
    )
    print(
        f"Slope range: {stats['min']}° to {stats['max']}° "
        f"(mean {stats['mean']}°, median {stats['median']}°, p95 {stats['p95']}°)"
    )


if __name__ == "__main__":
    main()
