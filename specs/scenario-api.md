# Scenario API contract (v1)

Read-only contract for one prepared field scenario. The frontend loads it next to
the existing map catalog (`/terrain/layers`, `/terrain/landmarks`), which stays
unchanged. Tracking issue: CH26-031 (#49).

## Endpoint

`GET /scenarios/{scenario_id}`. The first and only scenario is `hawksbill-gap`.

- `200`: the scenario document below, served from a file committed under
  `backend/data/` with no upstream request at runtime.
- `404`: unknown `scenario_id`, with FastAPI's default `{"detail": "..."}` body.
- `503`: the committed file is missing, unreadable, invalid JSON, or has an
  unsupported MAJOR, or fails the contract checks in `backend/app/scenario_schema.py`
  (required fields, `[lon, lat]` tuples, units, unique IDs, cross-references);
  body `{"detail": "Scenario temporarily unavailable"}`. Unknown extra fields are allowed.

## Versioning

`schema_version` is a `"MAJOR.MINOR"` string; this document defines `"1.3"`.

- Adding an optional field or a new pending section bumps MINOR. Clients ignore
  fields they do not know.
- Renaming, removing, or changing the meaning or units of a field bumps MAJOR.
- Clients accept MAJOR `1` with any MINOR, and they reject any other MAJOR with a
  "scenario version not supported" state, without crashing the base map.

| Version | Change                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `1.0`   | First contract. `evidence`, `profiles`, and `unknowns` pending.                                      |
| `1.1`   | Fills `profiles`; defines `terrain-gap` unknowns; adds terrain metrics to route options (see below). |
| `1.2`   | Fills `unknowns` with caution zones; adds `obstacles`, `grade_class_m`, `caution_review` (#46).      |
| `1.3`   | Fills `evidence` with NASA images and verified SuperCam products (#50).                              |

## Conventions

| Topic          | Rule                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body and CRS   | Mars, planetocentric latitude, positive-east longitude in −180..180 degrees, sphere R = 3,396,190 m.                                                                                           |
| Coordinates    | GeoJSON order: `[lon, lat]` or `[lon, lat, elev_m]`. Never `[lat, lon]`. GeoJSON `crs` members are not used.                                                                                   |
| Elevation      | Meters. Route and track vertices carry the rover localization `elev_geoid`. `vertical_reference` explains the datum.                                                                           |
| Units          | Lengths in meters (`*_m`), angles in degrees (`*_deg`), dates ISO 8601. Field names carry the unit suffix.                                                                                     |
| Missing values | A missing number is JSON `null`, never `0`, `-9999`, or NaN. A section that is not prepared yet is listed in `pending_sections` and is present as a list, empty or partly filled.              |
| IDs            | Lowercase kebab-case strings, stable across MINOR versions. Rover localizations keep their mission `RMC` (`"26_1004"`). Source IDs match `backend/data/hawksbill_gap/manifest.json` input IDs. |
| Sources        | Every stop, route feature, track feature, profile, unknown, obstacle, and evidence item has `source_ids`, a non-empty list of IDs from `sources`.                                              |

## Document

```jsonc
{
  "schema_version": "1.3",
  "scenario_id": "hawksbill-gap",
  "title": "Hawksbill Gap",
  "generated_at": "2026-11-14T12:00:00Z",
  "conventions": {
    "body": "Mars",
    "latitude": "planetocentric",
    "longitude": "positive_east",
    "sphere_radius_m": 3396190,
    "coordinate_order": ["lon", "lat", "elev_m"],
    "vertical_reference": "Rover localization elevation relative to the Mars geoid (elev_geoid).",
  },
  "extent": { "lon_min": 77.402, "lon_max": 77.41, "lat_min": 18.455, "lat_max": 18.463 },
  "start": {
    "id": "start",
    "rmc": "25_446",
    "label": "Start",
    "coordinates": [77.40633801, 18.45744513],
    "source_ids": ["m20-waypoints"],
  },
  "stops": [
    {
      "id": "skinner-ridge",
      "name": "Skinner Ridge",
      "kind": "sample-location",
      "coordinates": [77.40617078, 18.458931],
      "nearest_rmc": "26_1004",
      "samples": [
        { "name": "Swift Run", "sol": 490 },
        { "name": "Skyland", "sol": 495 },
      ],
      "summary": "Lower Rockytop sandstone block; is it in place or float?",
      "source_ids": ["pds-initial-reports"],
    },
    {
      "id": "wildcat-ridge",
      "name": "Wildcat Ridge",
      "kind": "sample-location",
      "coordinates": [77.40588851, 18.45863707],
      "nearest_rmc": "26_1222",
      "samples": [
        { "name": "Hazeltop", "sol": 509 },
        { "name": "Bearwallow", "sol": 516 },
      ],
      "summary": "Fine-grained, sulfate-bearing rock with calcium-sulfate veins (Hogwallow Flats).",
      "source_ids": ["pds-initial-reports"],
    },
  ],
  "route_options": [
    {
      "id": "A",
      "label": "Option A: Wildcat Ridge via a proposed connector",
      "stop_ids": ["wildcat-ridge"],
      "outbound_m": 129.0,
      "round_trip_m": 258.01,
      "proposed_m": 5.2,
      "ascent_m": 13.34, // round-trip ascent at the 5 m step
      "max_grade_deg": { "2": 20.69, "5": 14.82, "10": 14.15 }, // keyed by sampling step in meters
      "dtm_covered_pct": 100.0, // share of the outbound length with valid DTM elevation
      "grade_class_m": {
        // covered outbound meters per grade class, keyed by window; no "safe" class
        "2": {
          "0-5": 59.54,
          "5-10": 39.69,
          "10-15": 23.82,
          "15-20": 3.97,
          "20-25": 1.98,
          "25+": 0,
        },
        "5": { "0-5": 69.46, "5-10": 29.77, "10-15": 29.77, "15-20": 0, "20-25": 0, "25+": 0 },
      },
      "caution_review": {
        "zones": 5, // caution zones (unknowns) on this option
        "obstacles": 2, // obstacles whose option_ids include this option
        "open_zone_ids": ["connector-a-1", "observation-approach-a-skinner-ridge"],
        "open_obstacle_ids": ["bettys-rock", "skinner-ridge-east-crack-overhang"],
        "cleared": false, // true only when nothing is open
        "safety_verdict": null, // stays null until a cited spacesuit grade threshold exists
      },
    },
    {
      "id": "B",
      "label": "Option B: Skinner Ridge, then Wildcat Ridge",
      "stop_ids": ["skinner-ridge", "wildcat-ridge"],
      "outbound_m": 172.64,
      "round_trip_m": 345.28,
      "proposed_m": 0,
      "ascent_m": 17.8,
      "max_grade_deg": { "2": 22.13, "5": 14.93, "10": 13.95 },
      "dtm_covered_pct": 100.0,
    },
  ],
  "routes": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "a-outbound-1",
        "geometry": { "type": "LineString", "coordinates": [[77.40633801, 18.45744513, -2535.58]] },
        "properties": {
          "option": "A", // "A" | "B"
          "leg": "outbound", // "outbound" | "return"
          "order": 1, // 1-based order within option + leg
          "kind": "historical", // "historical" | "connector"
          "proposed": false, // true only for connector pieces
          "length_m": 107.96,
          "sols": [449, 455, 456, 460, 461], // [] for connectors
          "note": null,
          "source_ids": ["m20-traverse"],
        },
      },
    ],
  },
  "rover_track": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "drive-sol-449",
        "geometry": { "type": "LineString", "coordinates": [[77.40633801, 18.45744513, -2535.58]] },
        "properties": {
          "sol": 449,
          "from_rmc": "25_446",
          "to_rmc": "26_0",
          "length_m": 8.27,
          "source_ids": ["m20-traverse"],
        },
      },
    ],
  },
  "evidence": [
    {
      "id": "img-skinner-ridge-context",
      "kind": "image",
      "stop_id": "skinner-ridge",
      "role": "two-stop-context",
      "source_ids": ["context-image-pia24924"],
      "sols": [518],
      "product_id": "PIA24924",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "instrument": "Mastcam-Z",
      "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia24/pia24924/figures/PIA24924_figA.jpg",
      "panel": "full; Skinner Ridge label upper right",
      "subject": "Hawksbill Gap: Wildcat Ridge and Skinner Ridge about 20 m apart",
      "alt": "A slope of pale rock slabs with labels for Wildcat Ridge and Skinner Ridge.",
    },
  ],
  "profiles": [
    {
      "id": "profile-a",
      "option": "A",
      "step_m": 5, // nominal step; samples are never farther apart
      "spacing_m": 4.9617, // actual even spacing: outbound_m / ceil(outbound_m / step_m)
      "outbound_m": 129.0, // turnaround; the second half mirrors the outbound
      "distance_m": [0, 4.96, 9.92], // round trip, from 0 to round_trip_m
      "elevation_m": [-2535.608, -2534.69, null], // null = DTM gap (illustrative), breaks the line
      "source_ids": ["dtm-primary"],
    },
  ],
  "unknowns": [
    {
      "id": "terrain-gap-a-1", // illustrative: the current routes have no DTM gaps
      "option": "A",
      "kind": "terrain-gap", // "terrain-gap" | "connector" | "observation-approach" | "steep-segment"
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [77.4061, 18.4581],
          [77.4062, 18.4582],
        ],
      },
      "from_m": 4.96, // outbound distance; the return retraces the span
      "to_m": 14.88,
      "length_m": 9.92,
      "review_status": "open", // "open" | "reviewed" (since 1.2)
      "summary": "No valid DTM elevation on this span; grade and ascent are unknown.",
      "source_ids": ["dtm-primary"],
    },
    {
      "id": "connector-a-1",
      "option": "A",
      "kind": "connector",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [77.40632, 18.45822],
          [77.40627, 18.45826],
        ],
      },
      "from_m": 107.96,
      "to_m": 113.15,
      "length_m": 5.2,
      "review_status": "open",
      "summary": "Proposed straight connector, not driven by the rover. ...",
      "uncertainty": {
        "kind": "terrain-model-disagreement",
        "step_m": 2,
        "max_grade_deg": { "dtm-primary": 7.11, "dtm-fallback": 22 },
        "computed": ["dtm-primary"], // recomputed by prep/profiles.py
        "reported": ["dtm-fallback"], // quoted from the project scope
      },
      "source_ids": ["m20-traverse", "dtm-primary", "dtm-fallback"],
    },
    {
      "id": "steep-segment-a-2m",
      "option": "A",
      "kind": "steep-segment",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [77.4062, 18.4579],
          [77.4062, 18.45792],
        ],
      },
      "from_m": 45.65,
      "to_m": 47.63,
      "length_m": 1.98,
      "review_status": "open",
      "summary": "Steepest along-route interval at the 2 m window: 20.69 deg. Grade class only. ...",
      "step_m": 2,
      "grade_deg": 20.69,
      "grade_class": "20-25",
      "source_ids": ["dtm-primary"],
    },
  ],
  "obstacles": [
    {
      "id": "bettys-rock",
      "name": "Betty's Rock",
      "kind": "boulder", // "boulder" | "crack-overhang"
      "stop_id": "skinner-ridge",
      "description": "Large float block beside the Skinner Ridge block, described in the mission report.",
      "position": "Beside the Skinner Ridge block; the report gives no coordinates.",
      "coordinates": null, // [lon, lat] once a cited position exists
      "option_ids": ["A", "B"],
      "review_status": "open",
      "figure": {
        "source_id": "pds-initial-reports",
        "section": "11",
        "figure": "5",
        "label": "PDS Initial Reports, section 11 (Swift Run), fig. 5",
        "url": "https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf",
      },
      "source_ids": ["pds-initial-reports"],
    },
  ],
  "pending_sections": [],
  "sources": [
    {
      "id": "m20-traverse",
      "title": "Mars 2020 traverse segments by sol (MMGIS)",
      "url": "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json",
      "credit": "NASA/JPL-Caltech",
      "license": "NASA/JPL image and data use policy",
      "doi": null,
    },
    {
      "id": "context-image-pia24924",
      "title": "2 Perseverance Sampling Locations in Jezero's Delta",
      "url": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/",
      "credit": "NASA/JPL-Caltech/ASU/MSSS",
      "license": "NASA/JPL image use policy",
      "doi": null,
      "product_id": "PIA24924",
      "source_page": "https://science.nasa.gov/photojournal/2-perseverance-sampling-locations-in-jezeros-delta/",
    },
  ],
}
```

The values above are an example. The served file is generated by
`backend/prep/scenario_bundle.py` from committed inputs (`manifest.json`,
`routes.geojson`, `inputs/rover_traverse.geojson`, `inputs/rover_waypoints.geojson`,
`route_metrics.json`) and the stop specs in `specs/hawksbill-gap/`; caution zones
and obstacles come from `backend/prep/caution.py`.

## Terrain fields (v1.1)

Computed by `backend/prep/profiles.py` on the primary USGS DTM source crop
(`dtm-primary`, its own equirectangular projection, 1 m cells) with a single
bilinear interpolation at each sample's lon/lat; there is no prior resampling.
`backend/data/hawksbill_gap/route_metrics.json` records the method, the 2 m and
10 m series counts, the crop's `data_sha256`, and a cross-check on the 1 m local
grid (a second bilinear resampling, which smooths short relief). Profile elevations use
the DTM's vertical reference (MOLA-tied, relative to the Mars geoid), not the
rover `elev_geoid` stored on route vertices.

- **Sampling.** Each option's outbound path (A includes the proposed connector)
  is split into `ceil(L / step_m)` equal intervals of `spacing_m`, from the start
  vertex to the final vertex. Distances are great-circle on the Mars sphere.
  Elevation is bilinear; a sample whose neighbouring cells include NoData is `null`.
- **`profiles[]`.** One item per route option: `id`, `option`, `step_m`,
  `spacing_m`, `outbound_m`, the parallel arrays `distance_m` and `elevation_m`,
  and `source_ids`. The series is the outbound samples followed by their mirror,
  so it starts and ends at the same elevation. A `null` elevation inside the
  series is a gap: draw a break, never interpolate across it or plot it as 0.
- **`route_options[].ascent_m`.** Round-trip ascent in meters at the 5 m step: the
  sum of absolute elevation changes between consecutive valid outbound samples
  (each outbound descent is a climb on the return).
- **`route_options[].max_grade_deg`.** Object keyed by sampling step in meters
  (`"2"`, `"5"`, `"10"`). Each value is the maximum, over consecutive valid
  samples, of `atan(|dz| / dd)` in degrees: `dz` is the elevation change in
  meters and `dd` the horizontal distance in meters between the two samples (the
  even spacing for that step). `null` when no pair is valid.
- **`route_options[].dtm_covered_pct`.** Percent of the outbound length whose
  5 m intervals have a valid elevation at both ends.
- **`unknowns[]` with `kind: "terrain-gap"`.** One item per run of uncovered
  intervals: `id`, `option`, `kind`, a `[lon, lat]` LineString `geometry` along
  the outbound path, `from_m` and `to_m` (outbound distance), `length_m`, and
  `source_ids`. The return retraces the same span. Since v1.2 every `unknowns`
  item is a caution zone (below); clients skip a `kind` they do not know.

## Caution zones and obstacles (v1.2)

Built by `backend/prep/caution.py` from `routes.geojson`, `route_metrics.json`
and the stops (#46). Every `unknowns[]` item is a caution zone on one option,
with the `terrain-gap` fields above plus `review_status` (`"open"` or
`"reviewed"`; all are `"open"` today) and a `summary`. The scope clears an
option only when every caution zone on it has been reviewed, and gives no
"safe" verdict until a cited grade threshold for walking in a loaded spacesuit
exists ([scope, Crew safety](martian-map-scope-2026.md#crew-safety)).

- **`terrain-gap`**: no valid DTM elevation (see above). None on the current
  routes.
- **`connector`**: a proposed piece (A's 5.2 m connector, never driven).
  `uncertainty.kind` is `"terrain-model-disagreement"`, with `max_grade_deg`
  per DTM at `step_m` 2. The primary value is the max grade of the 2 m
  intervals that overlap the connector (7.11°). The fallback value (22°) is
  reported from the scope's model-sensitivity check, because the fallback DTM
  is not prepared here; `computed` and `reported` say which is which.
- **`observation-approach`**: the last 10 m of outbound path before the point
  closest to a stop pin (two nominal 5 m steps; a display convention, not a
  limit). Extra fields: `stop_id`, `approach` (`"visit"` or `"stand-off"`) and
  `closest_offset_m`. A stand-off (A at Skinner Ridge) carries
  `uncertainty.kind: "contact-visibility"` from the scope's rough line-of-sight
  check, with `follow_up: "#48"` for the DTM check.
- **`steep-segment`**: the steepest interval between consecutive valid samples
  at each caution window, `step_m` 2 and 5. `grade_deg` equals
  `route_options[].max_grade_deg` for that window; `grade_class` is a display
  bin.

Grade classes are 5° bins, `"0-5"`, `"5-10"`, `"10-15"`, `"15-20"`, `"20-25"`,
`"25+"`, lower bound inclusive. They are display bins, not safety limits.

- **`route_options[].grade_class_m`.** Covered outbound meters per class,
  keyed by window (`"2"`, `"5"`); each window sums to the covered length.
- **`route_options[].caution_review`.** `zones` and `obstacles` count what
  applies to the option. `open_zone_ids` and `open_obstacle_ids` list what is
  still open in document order, so a panel can list open caution zones per
  option. `cleared` is true only when both lists are empty. `safety_verdict` is
  always `null`.
- **`obstacles[]`.** Obstacles the mission report describes: Betty's Rock
  beside the Skinner Ridge block, and the crack and overhang on the block's
  eastern side ([PDS Initial Reports, section 11, fig. 5][pds]). Fields: `id`,
  `name`, `kind`, `stop_id`, `description`, `position` (text), `coordinates`,
  `option_ids`, `review_status`, `figure` (`source_id`, `section`, `figure`,
  `label`, `url`) and `source_ids`. `coordinates` is `null` because the report
  gives none: place the obstacle at its stop and say so. A passes Skinner Ridge
  at its stand-off view, so both options list both obstacles.

## Stop evidence (v1.3)

Each `evidence[]` record has a unique `id`, one `stop_id` from `stops`, a
non-empty `source_ids` list, and the product's `sols`, `product_id`, and
`credit`. The first source is the primary product. Later sources provide
supporting material. Use `sources[].url` for the cited page or archive item and
`source_page` for the publication or archive landing page. Both `product_id`
and `source_page` are additive fields on `sources[]`.

- **`kind: "image"`** adds `role` (`two-stop-context`, `abrasion`, `cores`,
  or `workspace`), `subject`, `alt`, `instrument`, `url` (direct image),
  and `panel` (the relevant part of the image). Composite images can have
  several sols, or one sol when the evidence refers to a single panel. The two
  stops have separate entries for shared images and cite the same released
  products. See the [NASA image selections](hawksbill-gap/source-images.md).
- **`kind: "supercam"`** adds `product_version` (PDS label version),
  `target`, `measurement_condition`, `data_url` (calibrated FITS),
  `wavelength_um` (minimum and maximum), `spectral_channels`, and `quality`
  (`saturated`, `glitch`, and `spike` channel counts and `flagged_um`
  wavelengths). `sols` contains the observation sol. The primary source
  URL is the XML product label. See the
  [SuperCam verification](hawksbill-gap/supercam-products.md).

The v1.3 Hawksbill Gap bundle has no pending sections. Older bundles can carry
an empty `evidence` list and name it in `pending_sections`.

## Client rules

- Validate `schema_version`, the IDs, and the coordinate tuples before use. An invalid
  payload is an error state, not a partial render.
- A failed scenario request never blocks the base Mars layers. The UI offers a retry.
- Draw `kind: "connector"` features as visibly proposed (for example dashed), never as
  rover-driven geometry.
- Show `rover_track` as historical rover movement, separate from crew route options.

[pds]: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf
