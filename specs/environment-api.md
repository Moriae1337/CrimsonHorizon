# Environment context contract (v1)

Read-only, optional context for one prepared scenario: archival Perseverance MEDA
weather at Jezero (CH26-095, #113) and Curiosity RAD radiation at Gale (CH26-096,
#114). It is served apart from the scenario document so a failure never affects
the map or the scenario; the client hides the cards.

## Endpoint

`GET /scenarios/{scenario_id}/environment`, served from
`backend/data/hawksbill_gap/environment.json` with no upstream request at runtime.

- `200`: the document below.
- `404`: unknown `scenario_id`.
- `503`: the file is missing, unreadable, invalid JSON, or has an unsupported
  MAJOR; body `{"detail": "Environment context temporarily unavailable"}`.

`schema_version` follows the scenario rules (specs/scenario-api.md): MINOR for
optional additions, MAJOR for renamed or re-defined fields. This defines `"1.0"`.

## Build

`cd backend && uv run python -m prep.environment_context` downloads the MEDA
products for sols 490-516 from the PDS Atmospheres Node, summarizes them, and
writes the JSON. Raw files are not committed; each summary records the product's
PDS logical ID, version, URL and SHA-256.

## `weather` (MEDA, Jezero, archival)

Sols 490-516 span the Hawksbill Gap samples: Swift Run (490) and Skyland (495) at
Skinner Ridge, Hazeltop (509) and Bearwallow (516) at Wildcat Ridge.

| Parameter         | Product                | Unit | Processing                                                                         |
| ----------------- | ---------------------- | ---- | ---------------------------------------------------------------------------------- |
| `pressure`        | `DER_PS` (derived)     | Pa   | `PRESSURE` column.                                                                 |
| `air_temperature` | `CAL_ATS` (calibrated) | K    | Per sample, median of `ATS_LOCAL_TEMP1..3`, the three mast sensors (about 1.45 m). |

Each `sols[]` item has `sol`, `utc_start` and `utc_stop` (from the PDS label of
the first available product; `null` when the sol has none) and, per parameter,
either `null` (no PDS product) or:

- `min`, `max`, `mean` over samples stamped 00:00-24:00 LMST of that sol;
- `samples` and `hours_with_data` (LMST hours with at least one sample);
- `covered_h`: 24 LMST hours minus the `lmst_gaps` below, to 0.1 h;
- `lmst_gaps`: `{from_lmst, to_lmst}` (`"HH:MM"`) for gaps of 15 min or more,
  including before the first and after the last sample;
- `product`: `lid`, `version`, `url`, `sha256`.

MEDA does not sample continuously, so gaps are normal. Never fill them or treat
a missing sol as zero.

## `radiation` (RAD, Gale, archival)

Perseverance has no radiation detector. The card restates published Curiosity
RAD averages and states the place (`place.name`, `coordinates` as `[lon, lat]`,
`elevation_m`), the `window` (UTC dates), `measurements` (`value`,
`uncertainty` or `null`, `unit`, `source_ids`), and `limits`: why the values do
not describe a walk at Jezero. Clients must show the place and the limits with
the values.

## Sources

| ID                | Reference                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pds-meda`        | Mars 2020 MEDA bundle, PDS Atmospheres Node, `urn:nasa:pds:mars2020_meda`                                         |
| `meda-instrument` | Rodriguez-Manfredi et al. (2021), Space Sci. Rev. 217, 48, doi:10.1007/s11214-021-00816-9 (sensor placement)      |
| `hassler-2014`    | Hassler et al. (2014), Science 343, 1244797, doi:10.1126/science.1244797 (0.210 ± 0.040 mGy/day, 7 Aug 2012 on)   |
| `swri-2013-rad`   | SwRI press release, 9 Dec 2013 (average GCR dose equivalent 0.67 mSv/day, August 2012 to June 2013, Gale surface) |
