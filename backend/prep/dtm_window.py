"""Extract the Hawksbill Gap window from the primary USGS DTM (CH26-014).

Reads only the 474 x 474 window over HTTP range requests (GDAL /vsicurl/),
writes the crop to data/hawksbill_gap/derived/ (git-ignored), and writes a
metadata record next to the manifest so the crop can be checked or rebuilt.
"""

import math
import urllib.request
from typing import Any

from prep.common import (
    DERIVED_DIR,
    SCENARIO_DIR,
    load_manifest,
    manifest_input,
    sha256_bytes,
    utc_now,
    write_json,
)

EXPECTED_VALID_CELLS = 224_676
CROP_PATH = DERIVED_DIR / "dtm_primary_window.tif"
RECORD_PATH = SCENARIO_DIR / "dtm_primary_window.json"


def window_bounds(
    bounds_m: list[float], pixel_size_m: float, window: dict[str, int]
) -> dict[str, float]:
    """Projected bounds of a pixel window, given the raster's outer bounds."""
    left, _, _, top = bounds_m
    return {
        "left": left + window["col_off"] * pixel_size_m,
        "right": left + (window["col_off"] + window["width"]) * pixel_size_m,
        "top": top - window["row_off"] * pixel_size_m,
        "bottom": top - (window["row_off"] + window["height"]) * pixel_size_m,
    }


def to_degrees(bounds: dict[str, float], meters_per_degree: float) -> dict[str, float]:
    return {
        "lon_min": bounds["left"] / meters_per_degree,
        "lon_max": bounds["right"] / meters_per_degree,
        "lat_min": bounds["bottom"] / meters_per_degree,
        "lat_max": bounds["top"] / meters_per_degree,
    }


def source_version(url: str) -> dict[str, Any]:
    """HTTP validators that identify the remote file version."""
    request = urllib.request.Request(
        url, headers={"User-Agent": "crimson-horizon-prep", "Range": "bytes=0-0"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        headers = response.headers
        content_range = headers.get("Content-Range") or ""
        total = content_range.rpartition("/")[2]
        return {
            "last_modified": headers.get("Last-Modified"),
            "etag": headers.get("ETag"),
            "content_length": int(total) if total.isdigit() else None,
        }


def findings(
    valid_cells: int, header: dict[str, Any], expected: dict[str, Any]
) -> list[str]:
    """Differences between the remote source and what the manifest pinned."""
    notes = []
    if valid_cells != EXPECTED_VALID_CELLS:
        notes.append(
            f"valid cells {valid_cells} differ from the expected {EXPECTED_VALID_CELLS}"
        )
    for key in ("raster_size", "bounds_m", "pixel_size_m"):
        if header[key] != expected[key]:
            notes.append(f"{key} {header[key]} differs from manifest {expected[key]}")
    nodata = header["nodata"]
    if nodata is None or not math.isclose(nodata, expected["nodata"], rel_tol=1e-6):
        notes.append(f"nodata {nodata} differs from manifest {expected['nodata']}")
    return notes


def main() -> None:
    import numpy as np
    import rasterio
    from rasterio.windows import Window

    manifest = load_manifest()
    dtm = manifest_input(manifest, "dtm-primary")
    conv = dtm["convention"]
    win = dtm["window"]
    m_per_deg = manifest["conventions"]["projected"]["meters_per_degree"]

    with rasterio.open("/vsicurl/" + dtm["url"]) as src:
        window = Window(win["col_off"], win["row_off"], win["width"], win["height"])
        data = src.read(1, window=window)
        transform = src.window_transform(window)
        header = {
            "raster_size": [src.width, src.height],
            "bounds_m": list(src.bounds),
            "pixel_size_m": src.res[0],
            "nodata": src.nodata,
        }
        profile = src.profile.copy()
        crs_wkt = src.crs.to_wkt()

    valid = data != header["nodata"]
    valid &= np.isfinite(data)
    valid_cells = int(valid.sum())
    values = data[valid]

    for key in ("blockxsize", "blockysize", "tiled"):
        profile.pop(key, None)
    profile.update(
        driver="GTiff",
        width=win["width"],
        height=win["height"],
        transform=transform,
        compress="deflate",
    )
    CROP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(CROP_PATH, "w", **profile) as dst:
        dst.write(data, 1)

    bounds = window_bounds(header["bounds_m"], header["pixel_size_m"], win)
    record = {
        "input_id": "dtm-primary",
        "source_url": dtm["url"],
        "source_version": source_version(dtm["url"]),
        "extracted_at": utc_now(),
        "access": "GDAL /vsicurl/ windowed read via rasterio",
        "window": win,
        "bounds_m": bounds,
        "bounds_deg": to_degrees(bounds, m_per_deg),
        "crs_wkt": crs_wkt,
        "pixel_size_m": header["pixel_size_m"],
        "dtype": str(data.dtype),
        "nodata": header["nodata"],
        "vertical_units": conv["vertical_units"],
        "vertical_reference": conv["vertical_reference"],
        "cells": int(data.size),
        "valid_cells": valid_cells,
        "expected_valid_cells": EXPECTED_VALID_CELLS,
        "elevation_m": {
            "min": round(float(values.min()), 3),
            "max": round(float(values.max()), 3),
            "mean": round(float(values.mean()), 3),
        },
        "data_sha256": sha256_bytes(data.astype("<f4").tobytes()),
        "output_file": str(CROP_PATH.relative_to(SCENARIO_DIR.parents[1])).replace(
            "\\", "/"
        ),
        "findings": findings(valid_cells, header, conv),
    }
    write_json(RECORD_PATH, record)
    status = "OK" if not record["findings"] else "CHANGED SOURCE"
    print(f"{status}: {valid_cells}/{data.size} valid cells -> {CROP_PATH}")
    for note in record["findings"]:
        print(" -", note)


if __name__ == "__main__":
    main()
