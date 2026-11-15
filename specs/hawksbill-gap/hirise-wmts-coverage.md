# HiRISE WMTS coverage over Hawksbill Gap (CH26-013)

Checked 2026-11-14 against the public NASA Mars Trek tile service used by the
map's `jezero-hirise-ortho` layer (`frontend/src/marsCatalog.ts`).
Machine-readable record: [`backend/data/hawksbill_gap/hirise_wmts_coverage.json`](../../backend/data/hawksbill_gap/hirise_wmts_coverage.json).

## Result

The layer covers the start, Skinner Ridge, Wildcat Ridge and every vertex of
routes A and B with real imagery at every zoom the map requests it (z8–z17).
No tile failed and no gaps were found. No configuration change is needed.

| Zoom | Tiles over scenario extent | Start | Skinner Ridge | Wildcat Ridge | Route A vertices | Route B vertices |
| ---- | -------------------------- | ----- | ------------- | ------------- | ---------------- | ---------------- |
| 8    | 1/1                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 9    | 1/1                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 10   | 2/2                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 11   | 2/2                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 12   | 2/2                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 13   | 4/4                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 14   | 4/4                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 15   | 9/9                        | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 16   | 16/16                      | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 17   | 49/49                      | ✓     | ✓             | ✓             | 109/109          | 167/167          |
| 18   | — (HTTP 404, expected)     |       |               |               |                  |                  |

“✓” and vertex counts mean the sampled pixel has non-zero alpha (alpha 0 is
the mosaic's no-data). At z8–z10 the tiles reach past the mosaic edge, so only
13.7 %, 50.5 % and 72.6 % of their pixels are valid; the scenario area itself
is fully covered. From z11 every tile over the scenario extent is 100 % valid.

## Tile matrix

| Property           | Value                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Layer              | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`                           |
| Tile matrix set    | `default028mm`, CRS `urn:ogc:def:crs:EPSG::104905` (Mars 2000 sphere, equirectangular)   |
| Grid               | Top-left `-180, 90`; 256 px tiles; z0 is 2 × 1 tiles; z17 is 262144 × 131072 tiles       |
| Levels             | 18 (`0`–`17`); max zoom **17**, matching `max_zoom: 17` in `marsCatalog.ts`              |
| Pixel size at z17  | 180° / (256 · 2¹⁷) = 5.36 × 10⁻⁶ ° ≈ 0.32 m N–S (0.30 m E–W at 18.46° N)                 |
| Bounds (WGS84 box) | 77.2229331–77.583964° E, 18.3067994–18.669315° N                                         |
| Format             | `image/png`, 8-bit gray + alpha                                                          |
| Cross-origin       | `Access-Control-Allow-Origin: *` on capabilities and tiles; 404s carry no CORS header    |
| Tile URL           | `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{y}/{x}.png` |

Notes:

- z17 slightly undersamples the 0.25 m/px source mosaic (≈ 0.32 m/px). The
  map's view zoom goes to `MARS_MAX_VIEW_ZOOM = 19` by upscaling z17 tiles.
- The capabilities `ScaleDenominator` values use an Earth metres-per-degree
  factor (z17: 2130.34 × 0.28 mm ≈ 0.60 m). Ignore them; the grid is defined
  by `buildMarsResolutions` (`180 / (256 · 2^z)` degrees per pixel), which
  matches the matrix widths and heights above.
- Requests outside the matrix or past z17 return HTTP 404 HTML without a CORS
  header, so the browser reports them as CORS errors. That is expected only
  outside the scenario area.

## Credits

HiRISE orthomosaic: USGS Astrogeology Science Center / NASA / JPL / University
of Arizona; Fergason et al., 2020, Mars 2020 Terrain Relative Navigation
HiRISE orthorectified image mosaic, DOI
[10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN). Tiles served by NASA
Mars Trek ([capabilities](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml)).
Public domain.

## Test procedure

Read-only; standard library only; no user data in requests (fixed
`Origin: http://localhost:5173` and a generic User-Agent).

```sh
cd backend
uv run python -m prep.hirise_wmts_coverage   # ~100 tile requests, ~2 min
uv run pytest tests/test_hirise_wmts.py       # offline check of the record
```

The script:

1. Reads `WMTSCapabilities.xml` and records the tile matrix set, bounds and
   deepest level.
2. For each zoom from 8 (where `MarsMap.tsx` starts showing local layers) to
   the deepest level, requests every tile over the scenario extent
   (`scenario.json` `extent`) and records HTTP status, CORS header and
   content type. Any failure is listed under `failures` and `findings`.
3. Decodes each PNG and samples alpha at the start, both stops and every
   route vertex (`scenario.json` routes). Any point on no-data is listed in
   `findings`.
4. Requests one tile past the deepest level, which must not return 200.

The script prints `OK` or `GAPS FOUND` with each finding. Rerun it if the
scenario extent, stops or routes change, and commit the updated record.
