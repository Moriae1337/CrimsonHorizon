"""Compare the alternate USGS HiRISE COG with the pinned primary crop (#38)."""

import json

from prep.common import load_manifest, manifest_input, sha256_bytes
from prep.dtm_window import CROP_PATH, RECORD_PATH, source_version
from prep.elevation_check import summary


def main() -> None:
    import numpy as np
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT

    primary_record = json.loads(RECORD_PATH.read_text(encoding="utf-8"))
    alternate = manifest_input(load_manifest(), "dtm-fallback")
    url = alternate["url"]

    with (
        rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT="30"),
        rasterio.open(CROP_PATH) as primary,
        rasterio.open("/vsicurl/" + url) as source,
    ):
        data = primary.read(1, masked=True)
        digest = sha256_bytes(data.data.astype("<f4").tobytes())
        bounds = primary_record["bounds_m"]
        expected_bounds = (
            bounds["left"],
            bounds["bottom"],
            bounds["right"],
            bounds["top"],
        )
        if (
            digest != primary_record["data_sha256"]
            or primary.bounds != expected_bounds
            or primary.res != (primary_record["pixel_size_m"],) * 2
            or primary.crs != rasterio.crs.CRS.from_wkt(primary_record["crs_wkt"])
            or primary.nodata != primary_record["nodata"]
        ):
            raise SystemExit("Primary crop differs from dtm_primary_window.json")

        # The two WKT definitions name different Mars realizations, but their
        # spherical equirectangular coordinate formulas are identical here.
        if not source.crs or source.crs.to_dict() != primary.crs.to_dict():
            raise SystemExit("Horizontal CRS parameters differ. Review the alignment.")
        if (
            source.tags().get("PRODUCT_ID", "").strip('"') != alternate["product_id"]
            or source.scales != (1.0,)
            or source.offsets != (0.0,)
            or source.nodata is None
        ):
            raise SystemExit("Alternate product metadata differs. Review the source.")

        with WarpedVRT(
            source,
            src_crs=primary.crs,
            crs=primary.crs,
            transform=primary.transform,
            width=primary.width,
            height=primary.height,
            nodata=float("nan"),
            resampling=Resampling.bilinear,
        ) as aligned:
            alternate_data = aligned.read(1, masked=True)
        alternate_grid = {
            "crs_wkt": source.crs.to_wkt(),
            "transform_affine": list(source.transform)[:6],
            "shape_rows_cols": [source.height, source.width],
            "nodata": source.nodata,
        }

    primary_valid = ~np.ma.getmaskarray(data) & np.isfinite(data.data)
    alternate_valid = ~np.ma.getmaskarray(alternate_data) & np.isfinite(
        alternate_data.data
    )
    overlap = primary_valid & alternate_valid
    residuals = alternate_data.data[overlap].astype("float64") - data.data[overlap]
    if residuals.size < 2:
        raise SystemExit(
            f"Only {residuals.size} paired valid cells in the primary crop"
        )

    print(
        json.dumps(
            {
                "primary_source_url": primary_record["source_url"],
                "primary_source_version": primary_record["source_version"],
                "primary_crop_data_sha256": digest,
                "primary_crop_bounds_m": bounds,
                "alternate_source_url": url,
                "alternate_source_version": source_version(url),
                "alternate_native_grid": alternate_grid,
                "coverage_on_primary_grid": {
                    "crop_cells": data.size,
                    "primary_valid_cells": int(primary_valid.sum()),
                    "alternate_valid_cells": int(alternate_valid.sum()),
                    "paired_valid_cells": int(residuals.size),
                },
                "residual_alternate_minus_primary_m": {
                    **summary(residuals.tolist()),
                    "p05": round(float(np.percentile(residuals, 5)), 3),
                    "p95": round(float(np.percentile(residuals, 95)), 3),
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
