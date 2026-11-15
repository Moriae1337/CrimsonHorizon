# Hawksbill Gap route-grade scale sensitivity

The table gives the maximum absolute along-route grade at each sampling window. The analysis covers both complete routes from `25_446` to `26_1222` and back. Option A includes its proposed 5.2 m connector and measures 258.01 m round trip. Option B follows the historical traverse via `26_1004` near Skinner Ridge and measures 345.28 m round trip. The return retraces the outbound path, so it has the same absolute grades and coverage in reverse order. [NASA/JPL traverse][traverse] · [Rover waypoints][waypoints]

| Route | Nominal window | Actual interval | Max absolute grade | Steepest interval from outbound start |
| ----- | -------------: | --------------: | -----------------: | ------------------------------------: |
| A     |            2 m |        1.9847 m |             20.69° |                         45.65–47.63 m |
| A     |            5 m |        4.9617 m |             14.82° |                         44.66–49.62 m |
| A     |           10 m |        9.9234 m |             14.15° |                         19.85–29.77 m |
| B     |            2 m |        1.9843 m |             22.13° |                       150.81–152.79 m |
| B     |            5 m |        4.9325 m |             14.93° |                         44.39–49.33 m |
| B     |           10 m |        9.5910 m |             13.95° |                         19.18–28.77 m |

The ~2 m window raises the maximum by 5.87° on A and 7.20° on B relative to ~5 m. A's fine-window peak falls inside its ~5 m peak interval. B's fine-window peak occurs about 151 m into the route, while its ~5 m peak occurs about 44 m in. Longer intervals spread local elevation changes over more distance and can combine rises and falls into a smaller net change. The sample endpoints also shift between windows. B has the higher observed maximum at ~2 m and ~5 m, and A has the higher maximum at ~10 m by 0.20°. These grades describe the centerline at the specified scales. The ~2 m spacing is close to the DTM's 1 m cell size, so local relief, raster resolution, and sample placement affect the peak.

All six runs had zero missing samples and zero uncovered sampled intervals. An interval with a missing endpoint is excluded from the grade maximum and counted as uncovered. Coverage is evaluated at the sample positions for each window.

## Reproduce the analysis

The script reuses `prep.profiles` to join all outbound pieces, divide cumulative Mars great-circle path length into `ceil(length / nominal window)` equal intervals, and bilinearly interpolate the primary 1 m USGS crop at each sample. Grade is `degrees(atan(abs(end elevation − start elevation) / interval length))`. The script checks the crop's pixel hash, dimensions, transform, and NoData value against the tracked crop record. [USGS primary DTM GeoTIFF][dtm] · [Crop record](../../backend/data/hawksbill_gap/dtm_primary_window.json)

From `backend/`, with the local `data/hawksbill_gap/derived/dtm_primary_window.tif` in place, run:

```sh
uv run --group prep python -m prep.grade_sensitivity
```

If the crop is missing, `uv run --group prep python -m prep.dtm_window` extracts it using HTTP range access to USGS. The analysis itself runs offline with installed dependencies and local inputs. It regenerates [route_grade_sensitivity.json](../../backend/data/hawksbill_gap/route_grade_sensitivity.json).

[dtm]: https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif
[traverse]: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json
[waypoints]: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
