# Hawksbill Gap: DTM elevation cross-check with rover localizations

This report closes [issue #35](https://github.com/Moriae1337/martian-map/issues/35). It compares the primary DTM that the route pipeline samples with the `elev_geoid` field of Perseverance's own localizations along the scenario drives.

**This is a consistency check, not an accuracy assessment.** Rover localizations are placed against orbital maps of Jezero, so they may share an elevation reference with the primary DTM. Agreement shows that the two datasets use the same vertical datum and line up horizontally. It does not show that either one is correct in absolute terms. [Project scope](../martian-map-scope-2026.md)

## Result

| Quantity                              |                            Value |
| ------------------------------------- | -------------------------------: |
| Sample count                          |   25 localizations, sols 439–502 |
| Residual (DTM − `elev_geoid`), median |                         −0.010 m |
| Residual, mean                        |                         −0.006 m |
| Residual, standard deviation          |                          0.066 m |
| Residual, RMS                         |                          0.065 m |
| Residual, range                       |               −0.097 to +0.210 m |
| Vertical datum (both)                 | Mars areoid (MOLA geoid), metres |

**Conclusion.** The primary DTM and the rover localizations share one vertical datum, the areoid, with no measurable offset: the median residual is 1 cm and all 25 points agree within 0.21 m. Route elevations, ascent and grades from the DTM can be read on the same vertical scale as mission elevations. No correction is applied, and the route pipeline is unchanged.

The scope reports a median of about −0.03 m for this check. That figure is reproduced exactly with nearest-cell sampling (median −0.030 m, RMS 0.099 m). The table above uses bilinear interpolation, the same sampling the route pipeline uses. [Project scope](../martian-map-scope-2026.md) · [`route_metrics` sampling](../../backend/prep/profiles.py)

## Vertical datum

- **DTM.** The USGS product page does not state the vertical reference. The file name, `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_…`, indicates heights tied to MOLA topography relative to the Mars geoid (areoid). The DTM is part of the Mars 2020 Terrain Relative Navigation products (Fergason et al., 2020, DOI [10.5066/P9REJ9JN][doi]). [USGS Jezero data products][usgs] · [DTM file][dtm]
- **Rover localizations.** The MMGIS waypoint file gives `elev_geoid`, `elev_radii` and `radius` for each localization but does not document them. At all 25 points, `elev_radii` equals `radius` minus 3,396,190 m (the Mars reference sphere) to within 1 cm. So `elev_geoid − elev_radii` is the height of the reference surface for `elev_geoid` above that sphere. It is 1,684.89 to 1,685.39 m across the scenario, a smooth surface well above the sphere, as expected for the areoid at Jezero. `elev_geoid` is therefore areoid-referenced. [MMGIS waypoints][waypoints]
- A sphere-referenced value would sit about 1,685 m away from the DTM. The observed offsets are centimetres, which confirms that both use the areoid.

## Method

Reproduce with `uv run --group prep python -m prep.elevation_check` from `backend/`. It needs the DTM crop from `prep.dtm_window` (`derived/`, git-ignored) and writes [`elevation_check.json`](../../backend/data/hawksbill_gap/elevation_check.json). [`tests/test_elevation_check.py`](../../backend/tests/test_elevation_check.py) checks the committed record without rasterio.

1. **DTM.** The 474 × 474 crop of the primary USGS DTM, read by `prep.dtm_window`. Before sampling, the script checks the crop's pixel hash against [`dtm_primary_window.json`](../../backend/data/hawksbill_gap/dtm_primary_window.json). [DTM file][dtm]
2. **Positions.** Every localization from sol 439 to sol 502 in the waypoint snapshot from `prep.rover_inputs`: 25 points from `24_4308` to `26_1222`, both mid-drive (`m`) and end-of-drive (`y`). These are the historical drives that routes A and B follow, and they include the route start `25_446` and the stop localizations `26_1004` and `26_1222`. Positions are read from `lon` and `lat`; the `easting` and `northing` fields are not in the DTM projection and are not used. [MMGIS waypoints][waypoints] · [Source manifest](../../backend/data/hawksbill_gap/manifest.json)
3. **Projection and sampling.** Each `[lon, lat]` is projected with the DTM's own equirectangular projection (sphere 3,396,190 m, standard parallel 0°, central meridian 0°) and sampled by bilinear interpolation on the crop. These are the same functions the route pipeline uses (`prep.profiles.eqc`, `prep.local_grid.bilinear`). All 25 points fall on valid cells.
4. **Residual.** DTM minus `elev_geoid`, in metres. Positive means the DTM is higher than the rover's reported elevation.

## Per-localization residuals

| Localization | Sol | Type | `elev_geoid` (m) |   DTM (m) | Residual (m) |
| ------------ | --: | :--: | ---------------: | --------: | -----------: |
| `24_4308`    | 439 |  m   |        −2539.059 | −2539.065 |       −0.006 |
| `24_4358`    | 439 |  y   |        −2538.755 | −2538.765 |       −0.010 |
| `24_4412`    | 441 |  m   |        −2536.414 | −2536.383 |       +0.031 |
| `24_4470`    | 441 |  m   |        −2536.003 | −2536.055 |       −0.053 |
| `24_4516`    | 441 |  m   |        −2535.614 | −2535.665 |       −0.051 |
| `25_0`       | 441 |  y   |        −2535.630 | −2535.704 |       −0.074 |
| `25_94`      | 443 |  m   |        −2536.147 | −2536.098 |       +0.049 |
| `25_214`     | 443 |  y   |        −2535.996 | −2536.093 |       −0.097 |
| `25_294`     | 448 |  m   |        −2534.589 | −2534.551 |       +0.038 |
| `25_446`     | 448 |  y   |        −2535.580 | −2535.608 |       −0.028 |
| `26_0`       | 449 |  y   |        −2534.778 | −2534.836 |       −0.058 |
| `26_96`      | 455 |  y   |        −2530.027 | −2529.983 |       +0.044 |
| `26_160`     | 456 |  m   |        −2528.698 | −2528.641 |       +0.057 |
| `26_218`     | 456 |  y   |        −2527.392 | −2527.448 |       −0.056 |
| `26_282`     | 460 |  m   |        −2526.648 | −2526.579 |       +0.069 |
| `26_470`     | 460 |  y   |        −2524.211 | −2524.192 |       +0.019 |
| `26_522`     | 461 |  m   |        −2523.912 | −2523.955 |       −0.043 |
| `26_630`     | 461 |  y   |        −2523.304 | −2523.325 |       −0.021 |
| `26_694`     | 464 |  m   |        −2522.730 | −2522.685 |       +0.045 |
| `26_756`     | 464 |  y   |        −2522.083 | −2522.169 |       −0.086 |
| `26_850`     | 474 |  y   |        −2521.591 | −2521.381 |       +0.210 |
| `26_1004`    | 477 |  y   |        −2520.853 | −2520.909 |       −0.056 |
| `26_1110`    | 501 |  m   |        −2522.764 | −2522.812 |       −0.047 |
| `26_1154`    | 501 |  y   |        −2522.828 | −2522.838 |       −0.010 |
| `26_1222`    | 502 |  y   |        −2523.168 | −2523.176 |       −0.008 |

`26_850` (sol 474) is the only point beyond ±0.1 m. It is on option B only. Its residual is still small next to the 13 to 18 m round-trip ascent of the routes.

## Horizontal sensitivity

To see what the check can detect, the script repeats the comparison with every position moved by one DTM cell (1 m):

| Shift     | Residual RMS (m) |
| --------- | ---------------: |
| None      |            0.065 |
| 1 m east  |            0.099 |
| 1 m west  |            0.076 |
| 1 m north |            0.236 |
| 1 m south |            0.213 |

Any 1 m shift makes the fit worse, and the unshifted positions fit best. A north–south shift triples the RMS because the drives climb mostly northward. An east–west shift of 1 m changes it only slightly, so this check alone cannot rule out a sub-metre east–west misregistration. The sample-point review found the rover localizations and the PDS sample coordinates consistent to about 2 m horizontally. [Sample alignment](sample-alignment.md)

## Limits

- **Not independent.** Both datasets may derive their heights from the same orbital products, so this check cannot measure absolute DTM error. Independent accuracy still needs evaluation. [Project scope](../martian-map-scope-2026.md)
- **Rover body, not ground.** `elev_geoid` is the elevation of the rover's localization reference point, and its exact definition is not documented in the MMGIS file. The centimetre-level agreement suggests it is close to the ground surface the DTM models, but the check does not establish this.
- **Only along the drives.** The 25 points lie on the historical drives, not on the 5.2 m proposed connector of option A, which has no rover localization.
- **Fallback DTM not covered.** The fallback COG is compared with the primary in #38. The scope reports a median difference of about +9.26 m against `elev_geoid` for the fallback. [Project scope](../martian-map-scope-2026.md)

[usgs]: https://astrogeology.usgs.gov/search/map/mars-2020-jezero-crater-landing-site-products
[dtm]: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif
[doi]: https://doi.org/10.5066/P9REJ9JN
[waypoints]: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
