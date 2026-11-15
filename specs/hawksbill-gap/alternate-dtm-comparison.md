# Hawksbill Gap alternate HiRISE DTM comparison

The alternate USGS HiRISE cloud-optimized GeoTIFF (COG) covers the full primary crop. Its elevations are **6.669 m higher at the median** after resampling to the primary grid. The differences vary across the crop, so keep the primary mosaic as the route-metric source. Any substitution requires a new alignment check and evaluation along both routes. [Issue #38][issue]

## Source versions and coordinate references

| Property                    | Primary TRN HiRISE mosaic                                                     | Alternate USGS HiRISE COG                                         |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Product                     | `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40` | `DTEEC_002387_1985_003798_1985_A01`                               |
| Release                     | Fergason et al. (2020), [USGS DOI 10.5066/P9REJ9JN][primary]                  | UArizona PDS product v1.0, revision `A01`, [USGS STAC item][stac] |
| GeoTIFF last modified (UTC) | 2022-11-10 21:35:06                                                           | 2023-07-08 07:42:06                                               |
| HTTP ETag                   | `"50aff29b9a8b2355e780149fbccbcc24-220"`                                      | `"8d2403f2976521bd36db076e33157ba2-18"`                           |
| File size (bytes)           | 1,839,545,409                                                                 | 144,066,483                                                       |
| Horizontal CRS              | Equirectangular Mars 2000 Sphere IAU                                          | Mars (2015) / Ocentric / Equirectangular (IAU:49910 in GeoTIFF)   |
| Pixel spacing               | 1.000000 projected m                                                          | 1.019625 projected m                                              |

The primary version and crop pixel hash are in the [primary extraction record][crop]. The alternate version was read from the [COG][cog] on 2026-11-14. The alternate raster is 7,111 columns by 11,430 rows. Its native upper-left corner is (4,584,537.218453 m E, 1,101,843.482443 m N). Both rasters are north-up, pixel-is-area Float32 grids with NoData around `-3.4028226550889045e38`.

The CRS labels refer to different Mars realizations. Here both files use the same horizontal projection parameters: a 3,396,190 m sphere, planetocentric latitude, east-positive longitude, a 0° prime meridian, standard parallel and central meridian, and zero false offsets. Their easting and northing can be matched directly after checking those parameters. Their pixel origins and spacing differ. [Primary extraction record][crop] · [USGS STAC item][stac]

The nominal vertical reference for both is the Mars areoid in metres. The alternate's original PDS label specifies metres above the Mars 2000 equipotential surface. The primary filename identifies MOLA topography with a geoid reference, and its earlier check against 25 rover localizations found a median difference of −0.010 m. The metadata and this comparison leave open how the two products were tied to MOLA and how much of the residual comes from vertical control, horizontal registration, stereo processing, mosaicking, or resampling. The rover positions may share control with the primary mosaic. [UArizona HiRISE product and attached PDS label][hirise] · [Primary localization check][elev]

## Method and coverage

1. Verify the primary crop against its recorded pixel hash, bounds, CRS, resolution and NoData. Use its full 474 × 474 grid, spanning E 4,587,980–4,588,454 m and N 1,093,915–1,094,389 m. [Primary extraction record][crop]
2. Read the alternate via HTTP ranges and bilinearly resample to the primary cell centers. The alignment uses the stored grid geometry with zero fitted horizontal or vertical shift. It compares the published COG pixels, which have already been resampled during USGS production. [USGS conversion provenance][provenance]
3. Exclude masked and non-finite values and compute **alternate minus primary** on paired valid cells. All **224,676 of 224,676 cells (100%)** have valid data from both products. This coverage applies to the Hawksbill Gap crop.

| Paired residual statistic |         Value (m) |
| ------------------------- | ----------------: |
| Mean                      |            +6.679 |
| Median                    |            +6.669 |
| Sample standard deviation |             2.353 |
| RMS                       |             7.081 |
| 5th to 95th percentile    | +2.926 to +10.599 |
| Minimum to maximum        | −5.005 to +17.287 |

Subtracting a constant median offset would still leave 2.353 m of standard deviation. Along a route, changes in the residual between neighboring samples change the calculated grade and can change cumulative ascent. The earlier scope analysis also found greater maximum grades with the alternate on both routes. An independent accuracy assessment would require independent control data. [Project scope and route sensitivity][scope]

## Reproduce

From `backend/`, with the primary crop in `data/hawksbill_gap/derived/` (created by `prep.dtm_window`), run:

```sh
uv run --group prep python -m prep.alternate_dtm_check
```

The [comparison script][script] prints JSON with the source identifiers, coverage and residual statistics. It reads the local crop and remote alternate COG using the existing prep dependencies.

[issue]: https://github.com/Moriae1337/martian-map/issues/38
[primary]: https://doi.org/10.5066/P9REJ9JN
[crop]: ../../backend/data/hawksbill_gap/dtm_primary_window.json
[stac]: https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/DTEEC_002387_1985_003798_1985_A01
[cog]: https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_002387_1985_PSP_003798_1985/DTEEC_002387_1985_003798_1985_A01.tif
[provenance]: https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_002387_1985_PSP_003798_1985/provenance.txt
[hirise]: https://www.uahirise.org/dtm/dtm.php?ID=PSP_002387_1985
[elev]: elevation-alignment.md
[scope]: ../martian-map-scope-2026.md
[script]: ../../backend/prep/alternate_dtm_check.py
