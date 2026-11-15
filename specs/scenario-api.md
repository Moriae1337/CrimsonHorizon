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
  unsupported MAJOR; body `{"detail": "Scenario temporarily unavailable"}`.

## Versioning

`schema_version` is a `"MAJOR.MINOR"` string; this document defines `"1.0"`.

- Adding an optional field or a new pending section bumps MINOR. Clients ignore
  fields they do not know.
- Renaming, removing, or changing the meaning or units of a field bumps MAJOR.
- Clients accept MAJOR `1` with any MINOR, and they reject any other MAJOR with a
  "scenario version not supported" state, without crashing the base map.

## Conventions

| Topic          | Rule                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body and CRS   | Mars, planetocentric latitude, positive-east longitude in −180..180 degrees, sphere R = 3,396,190 m.                                                                                           |
| Coordinates    | GeoJSON order: `[lon, lat]` or `[lon, lat, elev_m]`. Never `[lat, lon]`. GeoJSON `crs` members are not used.                                                                                   |
| Elevation      | Meters. Route and track vertices carry the rover localization `elev_geoid`. `vertical_reference` explains the datum.                                                                           |
| Units          | Lengths in meters (`*_m`), angles in degrees (`*_deg`), dates ISO 8601. Field names carry the unit suffix.                                                                                     |
| Missing values | A missing number is JSON `null`, never `0`, `-9999`, or NaN. A section that is not prepared yet is listed in `pending_sections` and is present as an empty list.                               |
| IDs            | Lowercase kebab-case strings, stable across MINOR versions. Rover localizations keep their mission `RMC` (`"26_1004"`). Source IDs match `backend/data/hawksbill_gap/manifest.json` input IDs. |
| Sources        | Every stop, route feature, track feature, and evidence item has `source_ids`, a non-empty list of IDs from `sources`.                                                                          |

## Document

```jsonc
{
  "schema_version": "1.0",
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
    },
    {
      "id": "B",
      "label": "Option B: Skinner Ridge, then Wildcat Ridge",
      "stop_ids": ["skinner-ridge", "wildcat-ridge"],
      "outbound_m": 172.64,
      "round_trip_m": 345.28,
      "proposed_m": 0,
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
  "evidence": [],
  "profiles": [],
  "unknowns": [],
  "pending_sections": ["evidence", "profiles", "unknowns"],
  "sources": [
    {
      "id": "m20-traverse",
      "title": "Mars 2020 traverse segments by sol (MMGIS)",
      "url": "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json",
      "credit": "NASA/JPL-Caltech",
      "license": "NASA/JPL image and data use policy",
      "doi": null,
    },
  ],
}
```

The values above are an example. The served file is generated by
`backend/prep/scenario_bundle.py` from committed inputs (`manifest.json`,
`routes.geojson`, `inputs/rover_traverse.geojson`, `inputs/rover_waypoints.geojson`)
and the stop specs in `specs/hawksbill-gap/`.

## Sections planned for later MINOR versions

These fields are already in v1.0 as empty lists so clients can render a
"not prepared yet" state. Their item shapes are defined when they are filled.

| Field      | Will hold                                                                 | Tracking issues    |
| ---------- | ------------------------------------------------------------------------- | ------------------ |
| `evidence` | Images and SuperCam items, each with one `stop_id` and its `source_ids`.  | #50                |
| `profiles` | Per-option elevation series along distance; DTM gaps as `null`.           | #42, #43, #51      |
| `unknowns` | Caution zones, coverage gaps, and connector uncertainty along each route. | #45, #46, #47, #51 |

## Client rules

- Validate `schema_version`, the IDs, and the coordinate tuples before use. An invalid
  payload is an error state, not a partial render.
- A failed scenario request never blocks the base Mars layers. The UI offers a retry.
- Draw `kind: "connector"` features as visibly proposed (for example dashed), never as
  rover-driven geometry.
- Show `rover_track` as historical rover movement, separate from crew route options.
