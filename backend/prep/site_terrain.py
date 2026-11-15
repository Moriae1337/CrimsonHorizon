"""Terrain packages for the 3D site view and the route planner.

Each package is a small elevation grid in a local azimuthal-equidistant (AEQD)
metric frame plus a HiRISE orthoimage texture on the same grid. Both are
committed under data/sites/<site_id>/ and served by app.sites.

Sources (all public, read over HTTP range requests with GDAL /vsicurl/):

- columbia-hills (Gusev crater): USGS/UArizona HiRISE DTM
  DTEEC_001513_1655_001777_1650_U01 (CC0-1.0, USGS STAC collection
  mro_hirise_socet_dtms; rationale recorded by the producer: "Possible location
  of Spirit Rover in Columbia Hills") and its orthoimage
  PSP_001513_1655_RED_A_01_ORTHO.
- hawksbill-gap (Jezero crater): a 4 x 4 km window of the USGS Mars 2020 TRN
  HiRISE DTM mosaic (DOI 10.5066/P9REJ9JN), the same elevation source as the
  scenario, textured with the matching TRN HiRISE orthomosaic
  (DOI 10.5066/P9QJDP48).
- jezero-crater (regional): a 10 x 10 km window of the USGS Mars 2020 TRN CTX
  DTM mosaic, 20 m (DOI 10.5066/P906QQT8), centred on the Octavia E. Butler
  landing site, textured with the TRN CTX orthomosaic (DOI 10.5066/P9GV1ND3).

The window, grid spacing and texture resolution are planning choices, not data.
NoData stays NoData (never filled). Elevations are encoded as uint16 steps of
`scale_m` above `offset_m`; 65535 marks NoData.

Run from backend/: uv run --group prep python -m prep.site_terrain
"""

import base64
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import array_bounds
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window, from_bounds

from prep.common import utc_now, write_json

MARS_RADIUS_M = 3_396_190.0
# The TRN mosaic is an uncompressed 1-row-strip GeoTIFF without overviews: direct
# I/O fetches only the window's bytes of each row instead of whole 85 KB strips.
os.environ.setdefault("GTIFF_DIRECT_IO", "YES")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
SITES_DIR = Path(__file__).resolve().parents[1] / "data" / "sites"
NODATA_U16 = 65535
STAC = "https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm"

SITES: dict[str, dict[str, Any]] = {
    "columbia-hills": {
        "name": "Columbia Hills",
        "region": "Gusev crater",
        "center_lon_lat": (175.51, -14.6),
        # 4 km east-west by 6 km north-south, along the north-south DTM strip.
        "half_size_m": (2000.0, 3000.0),
        "cell_size_m": 8.0,
        "texture_cell_m": 2.5,
        "dtm_url": f"{STAC}/PSP_001513_1655_PSP_001777_1650/"
        "DTEEC_001513_1655_001777_1650_U01.tif",
        "ortho_url": f"{STAC}/PSP_001513_1655_PSP_001777_1650/"
        "PSP_001513_1655_RED_A_01_ORTHO.tif",
        "sources": [
            {
                "label": "HiRISE DTM DTEEC_001513_1655_001777_1650_U01 "
                "(USGS / University of Arizona, CC0-1.0)",
                "url": "https://stac.astrogeology.usgs.gov/api/collections/"
                "mro_hirise_socet_dtms/items/DTEEC_001513_1655_001777_1650_U01",
            },
            {
                "label": "HiRISE orthoimage PSP_001513_1655_RED_A_01_ORTHO",
                "url": "https://www.uahirise.org/PSP_001513_1655",
            },
        ],
        "notes": [
            (
                "Spirit (MER-A) explored the Columbia Hills from 2004 to 2010; "
                "Home Plate lies in their inner basin."
            ),
            "Window and grid spacing are planning choices; NoData is never filled.",
        ],
    },
    "hawksbill-gap": {
        "name": "Hawksbill Gap",
        "region": "Jezero crater",
        "center_lon_lat": (77.406, 18.459),
        "half_size_m": (2000.0, 2000.0),
        "cell_size_m": 8.0,
        "texture_cell_m": 2.5,
        # Same USGS TRN mosaic as the Hawksbill Gap scenario, so elevations agree.
        "dtm_url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/"
        "JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif",
        "ortho_url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/"
        "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first.tif",
        "sources": [
            {
                "label": "USGS TRN HiRISE DTM mosaic, 1 m (DOI 10.5066/P9REJ9JN)",
                "url": "https://doi.org/10.5066/P9REJ9JN",
            },
            {
                "label": "USGS TRN HiRISE orthomosaic, 25 cm (DOI 10.5066/P9QJDP48)",
                "url": "https://doi.org/10.5066/P9QJDP48",
            },
        ],
        "notes": [
            "Window and grid spacing are planning choices; NoData is never filled.",
        ],
    },
    "jezero-crater": {
        "name": "Jezero crater floor and delta",
        "region": "Jezero crater (regional, CTX)",
        # Octavia E. Butler landing site (NASA Mars Trek Perseverance traverse, FID 0),
        # the same point as the map's landing-site landmark. The 10 x 10 km window also
        # covers the western delta front and Hawksbill Gap.
        "center_lon_lat": (77.452019, 18.444796),
        "half_size_m": (5000.0, 5000.0),
        "cell_size_m": 20.0,
        "texture_cell_m": 10.0,
        "dtm_url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/"
        "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif",
        "ortho_url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/"
        "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif",
        "sources": [
            {
                "label": "USGS Mars 2020 TRN CTX DTM mosaic, 20 m (DOI 10.5066/P906QQT8)",
                "url": "https://doi.org/10.5066/P906QQT8",
            },
            {
                "label": "USGS Mars 2020 TRN CTX orthomosaic, 6 m (DOI 10.5066/P9GV1ND3)",
                "url": "https://doi.org/10.5066/P9GV1ND3",
            },
        ],
        "notes": [
            (
                "Regional planning only: 20 m cells smooth out boulders and small "
                "scarps, so local slopes can be steeper than shown. Use the Hawksbill "
                "Gap HiRISE site for detail."
            ),
            "Window and grid spacing are planning choices; NoData is never filled.",
        ],
    },
}


def aeqd_proj4(lon: float, lat: float) -> str:
    return (
        f"+proj=aeqd +lat_0={lat} +lon_0={lon} +x_0=0 +y_0=0 "
        f"+R={MARS_RADIUS_M:g} +units=m +no_defs"
    )


def encode_elevation(z: np.ndarray) -> dict[str, Any]:
    """Quantize to uint16 centimetre-ish steps; NaN becomes NODATA_U16."""
    valid = np.isfinite(z)
    if not valid.any():
        raise ValueError("terrain window has no valid cells")
    lo = float(np.floor(z[valid].min()))
    hi = float(np.ceil(z[valid].max()))
    scale = max((hi - lo) / (NODATA_U16 - 1), 0.001)
    q = np.full(z.shape, NODATA_U16, dtype="<u2")
    q[valid] = np.round((z[valid] - lo) / scale).astype("<u2")
    return {
        "encoding": "uint16-le-base64",
        "offset_m": lo,
        "scale_m": scale,
        "nodata": NODATA_U16,
        "data": base64.b64encode(q.tobytes()).decode("ascii"),
        "min_m": round(float(z[valid].min()), 2),
        "max_m": round(float(z[valid].max()), 2),
        "valid_fraction": round(float(valid.mean()), 4),
    }


def _read_window(
    src: Any, window: Window, step: int = 1, block_rows: int = 512
) -> np.ndarray:
    """Read band 1 of `window`, keeping every `step`-th row and column.

    Reads go in row blocks, retrying blocks whose HTTP range requests fail. With
    GTIFF_DIRECT_IO, a subsampled read of an uncompressed strip GeoTIFF fetches only
    the kept rows and columns.
    """
    height, width = int(window.height) // step, int(window.width) // step
    out = np.empty((height, width), dtype=src.dtypes[0])
    rows_per_block = max(block_rows // step, 1)
    for r0 in range(0, height, rows_per_block):
        n = min(rows_per_block, height - r0)
        block = Window(
            window.col_off, window.row_off + r0 * step, width * step, n * step
        )
        for attempt in range(5):
            try:
                out[r0 : r0 + n] = src.read(
                    1, window=block, out_shape=(n, width), resampling=Resampling.nearest
                )
                break
            except rasterio.errors.RasterioIOError:
                if attempt == 4:
                    raise
                time.sleep(2 * (attempt + 1))
    return out


def warp_to_grid(
    src_path: str | Path,
    dst_crs: CRS,
    transform: rasterio.Affine,
    shape: tuple[int, int],
    resampling: Resampling,
    dtype: str = "float32",
) -> np.ndarray:
    dst = np.full(shape, np.nan, dtype=dtype)
    with rasterio.open(src_path) as src:
        nodata = src.nodata
        # Read only the source window covering the destination (plus a margin) in
        # one call, then warp from memory: far fewer remote reads than letting the
        # warper chunk through a large remote mosaic.
        rows, cols = shape
        dst_bounds = array_bounds(rows, cols, transform)
        sl, sb, sr, st = transform_bounds(dst_crs, src.crs, *dst_bounds, densify_pts=21)
        window = (
            from_bounds(sl, sb, sr, st, src.transform)
            .round_offsets()
            .round_lengths()
            .intersection(Window(0, 0, src.width, src.height))
        )
        window = Window(
            max(window.col_off - 4, 0),
            max(window.row_off - 4, 0),
            min(window.width + 8, src.width - max(window.col_off - 4, 0)),
            min(window.height + 8, src.height - max(window.row_off - 4, 0)),
        )
        # Keep about two source samples per output cell for the averaging warp.
        step = max(1, int(abs(transform.a) / abs(src.res[0]) // 2))
        data = _read_window(src, window, step)
        reproject(
            source=data,
            destination=dst,
            src_transform=src.window_transform(window) * rasterio.Affine.scale(step),
            src_crs=src.crs,
            src_nodata=nodata,
            dst_transform=transform,
            dst_crs=dst_crs,
            dst_nodata=np.nan,
            resampling=resampling,
        )
    return dst


def write_texture(ortho: np.ndarray, path: Path) -> None:
    valid = np.isfinite(ortho) & (ortho > 0)
    lo, hi = np.percentile(ortho[valid], [0.5, 99.5])
    g = np.zeros(ortho.shape, dtype="uint8")
    g[valid] = np.clip((ortho[valid] - lo) / (hi - lo) * 255, 1, 255).astype("uint8")
    path.parent.mkdir(parents=True, exist_ok=True)
    profile = {
        "driver": "JPEG",
        "width": g.shape[1],
        "height": g.shape[0],
        "count": 1,
        "dtype": "uint8",
        "QUALITY": 82,
    }
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(g, 1)
    aux = path.with_suffix(path.suffix + ".aux.xml")
    if aux.exists():
        aux.unlink()


def build_site(site_id: str) -> dict[str, Any]:
    cfg = SITES[site_id]
    lon, lat = cfg["center_lon_lat"]
    crs = CRS.from_proj4(aeqd_proj4(lon, lat))
    cell = cfg["cell_size_m"]

    hx, hy = cfg["half_size_m"]
    left, right, bottom, top = -hx, hx, -hy, hy
    dtm_src = "/vsicurl/" + cfg["dtm_url"]

    cols = round((right - left) / cell)
    rows = round((top - bottom) / cell)
    transform = rasterio.Affine(cell, 0, left, 0, -cell, top)
    z = warp_to_grid(dtm_src, crs, transform, (rows, cols), Resampling.average)

    tcell = cfg["texture_cell_m"]
    tcols = round((right - left) / tcell)
    trows = round((top - bottom) / tcell)
    ttransform = rasterio.Affine(tcell, 0, left, 0, -tcell, top)
    ortho = warp_to_grid(
        "/vsicurl/" + cfg["ortho_url"],
        crs,
        ttransform,
        (trows, tcols),
        Resampling.average,
    )
    site_dir = SITES_DIR / site_id.replace("-", "_")
    write_texture(ortho, site_dir / "texture.jpg")

    doc = {
        "version": 1,
        "site_id": site_id,
        "name": cfg["name"],
        "region": cfg["region"],
        "created_at": utc_now(),
        "crs_proj4": aeqd_proj4(lon, lat),
        "center_lon_lat": [lon, lat],
        "radius_m": MARS_RADIUS_M,
        "bounds_m": {"left": left, "right": right, "bottom": bottom, "top": top},
        "cell_size_m": cell,
        "shape": [rows, cols],
        "elevation": encode_elevation(z),
        "texture": {
            "path": "texture.jpg",
            "cell_size_m": tcell,
            "shape": [trows, tcols],
        },
        "sources": cfg["sources"],
        "notes": cfg["notes"],
    }
    write_json(site_dir / "terrain.json", doc)
    return doc


def main() -> None:
    for site_id in sys.argv[1:] or SITES:
        doc = build_site(site_id)
        e = doc["elevation"]
        print(
            f"{site_id}: {doc['shape']} @ {doc['cell_size_m']} m, "
            f"z {e['min_m']}..{e['max_m']} m, valid {e['valid_fraction']:.1%}"
        )


if __name__ == "__main__":
    main()
