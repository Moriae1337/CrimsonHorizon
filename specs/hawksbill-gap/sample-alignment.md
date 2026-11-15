# Hawksbill Gap: sample-point alignment review

This review closes [issue #34](https://github.com/Moriae1337/martian-map/issues/34). It checks that the published sample coordinates land in the right place in the map convention, and explains why the sample point, the rover position, and a crew standing position are different points.

## Convention

The map, the scenario API, and every coordinate below use Mars planetocentric latitude, positive-east longitude, and a sphere of radius 3,396,190 m, stored as `[lon, lat]`. [Scenario API contract](../scenario-api.md) · [Source manifest](../../backend/data/hawksbill_gap/manifest.json)

- The PDS Initial Reports list sample positions as Latitude (N), Longitude (E). They are converted to `[lon, lat]` without any datum change. [PDS Initial Reports][pds]
- MMGIS rover localizations are read from their `lon` and `lat` (and the identical GeoJSON point). Their `easting` and `northing` fields are not in the DTM projection and are not used. [MMGIS waypoints][waypoints] · [Source manifest](../../backend/data/hawksbill_gap/manifest.json)

## Offsets

Distances are great-circle distances on the 3,396,190 m sphere. Bearing is from the rover localization to the sample, clockwise from north. The pin is the science-stop coordinate in [`scenario.json`](../../backend/data/hawksbill_gap/scenario.json).

| Sample     | Stop          | Nearest localization (sol) | Sample to localization | Bearing | Rover heading (`yaw`) | Sample to stop pin |
| ---------- | ------------- | -------------------------- | ---------------------: | ------: | --------------------: | -----------------: |
| Swift Run  | Skinner Ridge | `26_1004` (477)            |                 2.12 m |      5° |                    8° |             0.00 m |
| Skyland    | Skinner Ridge | `26_1004` (477)            |                 2.12 m |      5° |                    8° |             0.00 m |
| Hazeltop   | Wildcat Ridge | `26_1222` (502)            |                 2.14 m |    254° |                  252° |             0.00 m |
| Bearwallow | Wildcat Ridge | `26_1222` (502)            |                 2.21 m |    256° |                  252° |             0.12 m |

The table is reproduced by [`backend/tests/test_sample_alignment.py`](../../backend/tests/test_sample_alignment.py) (`uv run python tests/test_sample_alignment.py` from `backend/`). Its tests confirm that:

- the Skinner Ridge pin equals the Swift Run coordinate `[77.40617078, 18.458931]` and the Wildcat Ridge pin equals the Hazeltop coordinate `[77.40588851, 18.45863707]`, exactly as in the PDS report headers;
- each sample lies within 3 m of the localization named in the stop's `nearest_rmc`;
- that localization ends the last drive before the first core (sol 477 before sols 490 and 495; sol 502 before sols 509 and 516);
- each pin lies within 1 m of both cores at its stop.

The sample coordinates come from the stop records, which cite the PDS report headers for sections 11, 12, 14 and 15. Skyland and Bearwallow were taken from those records and were not re-read from the PDS PDF for this review. Skyland has the same coordinate as Swift Run to eight decimals, so the report appears to give one position for both holes in the same ~1 m block. [Skinner Ridge](skinner-ridge.md) · [Wildcat Ridge](wildcat-ridge.md) · [PDS Initial Reports][pds]

## Placement review

- **Both pins are placed correctly.** At both stops the sample lies about 2.1 to 2.2 m from the rover localization, almost straight ahead of the rover: the bearing to the sample differs from the rover's heading by 3° to 4°. This matches a rover that drove up to the outcrop, parked, and reached forward with its 2.1 m robotic arm. It also confirms that the PDS coordinates and the MMGIS localizations share one frame; a datum, sign, or axis-order error would show as tens of meters or more, not 2 m. [Rover components][arm] · [MMGIS waypoints][waypoints]
- **The two stops relate to each other as the context image shows.** Skinner Ridge lies 23.6 m from Wildcat Ridge at a bearing of about 42° (north-east). NASA's Mastcam-Z mosaic PIA24924, taken on sol 518, two sols after the Bearwallow core, shows Wildcat Ridge in the lower left and Skinner Ridge in the upper right and says the outcrops are within about 20 m of each other. The image is an oblique view and is not georeferenced, so this is a qualitative check only. [PIA24924][pia24924] · [Source manifest](../../backend/data/hawksbill_gap/manifest.json)
- **The Wildcat Ridge holes match the annotated outcrop.** PIA24928 (sol 518) shows the two drill holes and the Berry Hollow abrasion patch side by side on one outcrop. The two PDS coordinates are 0.12 m apart, consistent with that view. [PIA24928][pia24928]
- **The route ends serve the stops.** Both route options end at `26_1222`, 2.14 m from the Wildcat Ridge pin. Option B passes through `26_1004`, 2.12 m from the Skinner Ridge pin. Routes follow rover localizations, so they end where the rover stood, not on the sample.

## Why the three points differ

| Point                  | What it marks                                                      | Example                                               | Source                                                  |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------- |
| Sample point           | Where the drill entered the rock: the target                       | Swift Run `[77.40617078, 18.458931]`                  | [PDS Initial Reports][pds]                              |
| Rover localization     | Rover body position at the end of a drive, where it parked to work | `26_1004` `[77.40616768, 18.45889532]`, 2.1 m south   | [MMGIS waypoints][waypoints]                            |
| Crew standing position | Where a person stands to observe, on stable footing                | Skinner standpoint `[77.406155, 18.458908]`, 1.6 m SW | [Field observation record](field-observation-record.md) |

- The **sample point** is on the rock itself. A person should not stand there: the holes, abrasion patch, and tailings are what the crew documents, and at Skinner Ridge the target is a loose or in-place block about 1 m across.
- The **rover localization** is where Perseverance's body was. The arm reaches forward from it, so the sample sits about 2 m ahead. Routes are built from these points, so a route ends near, not on, the sample.
- A **crew standing position** is chosen for footing, line of sight, and lighting on the feature the crew must judge, such as the basal contact at Skinner Ridge or a vein crossing layers at Wildcat Ridge. It is offset from the sample and need not match the rover's position. [Field objective](field-objective.md) · [Field observation record](field-observation-record.md)

The map therefore draws the science stop at the sample point and labels it as a sample site, and keeps rover positions (route ends, Start) and any crew standpoint as separate points.

## Open items

- The field observation record describes the Skinner standpoint as about 2.7 m southwest of Swift Run. The coordinates given there are 1.63 m apart on the 3,396,190 m sphere, bearing about 213°. The direction is right; the distance text should be checked when that record is next edited. [Field observation record](field-observation-record.md)
- Skyland and Bearwallow coordinates are taken from the repository stop records and were not re-verified against PDS sections 12 and 15 directly.
- The MMGIS `yaw` field is read here as the rover heading clockwise from north. Its definition is not documented in the file; the close agreement with the bearing to each sample supports this reading.

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
[waypoints]: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
[pia24924]: https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/
[pia24928]: https://www.jpl.nasa.gov/images/pia24928-sample-collection-and-rock-analysis-at-wildcat-ridge/
[arm]: https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/
