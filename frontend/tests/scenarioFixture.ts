// Small hand-made payload that follows specs/scenario-api.md (v1). Coordinates are
// rounded points near the Hawksbill Gap start; lengths are illustrative, not data.

export function makeScenarioPayload(): Record<string, unknown> {
  return {
    schema_version: '1.0',
    scenario_id: 'hawksbill-gap',
    title: 'Hawksbill Gap',
    generated_at: '2026-11-14T12:00:00Z',
    conventions: { body: 'Mars', coordinate_order: ['lon', 'lat', 'elev_m'] },
    extent: { lon_min: 77.402, lon_max: 77.41, lat_min: 18.455, lat_max: 18.463 },
    start: {
      id: 'start',
      rmc: '25_446',
      label: 'Start',
      coordinates: [77.4063, 18.4574],
      source_ids: ['m20-waypoints'],
    },
    stops: [
      {
        id: 'wildcat-ridge',
        name: 'Wildcat Ridge',
        kind: 'sample-location',
        coordinates: [77.4059, 18.4586],
        nearest_rmc: '26_1222',
        samples: [{ name: 'Hazeltop', sol: 509 }],
        summary: 'Fine-grained, sulfate-bearing rock.',
        source_ids: ['m20-waypoints'],
      },
    ],
    route_options: [
      {
        id: 'A',
        label: 'Option A: Wildcat Ridge via a proposed connector',
        stop_ids: ['wildcat-ridge'],
        outbound_m: 20,
        round_trip_m: 40,
        proposed_m: 5,
      },
      {
        id: 'B',
        label: 'Option B: Wildcat Ridge on driven ground',
        stop_ids: ['wildcat-ridge'],
        outbound_m: 30,
        round_trip_m: 60,
        proposed_m: 0,
      },
    ],
    routes: {
      type: 'FeatureCollection',
      features: [
        route('a-outbound-1', 'A', 'outbound', 1, 'historical', [449]),
        route('a-outbound-2', 'A', 'outbound', 2, 'connector', []),
        route('a-return-1', 'A', 'return', 1, 'connector', []),
        route('b-outbound-1', 'B', 'outbound', 1, 'historical', [449, 455]),
      ],
    },
    rover_track: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'drive-sol-449',
          geometry: {
            type: 'LineString',
            coordinates: [
              [77.4063, 18.4574, -2535.5],
              [77.4062, 18.4578, -2534.9],
            ],
          },
          properties: {
            sol: 449,
            from_rmc: '25_446',
            to_rmc: '26_0',
            length_m: 8.27,
            source_ids: ['m20-traverse'],
          },
        },
      ],
    },
    evidence: [],
    profiles: [],
    unknowns: [],
    pending_sections: ['evidence', 'profiles', 'unknowns'],
    sources: [
      {
        id: 'm20-traverse',
        title: 'Mars 2020 traverse segments by sol (MMGIS)',
        url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
        credit: 'NASA/JPL-Caltech',
        license: 'NASA/JPL image and data use policy',
        doi: null,
      },
      {
        id: 'm20-waypoints',
        title: 'Mars 2020 rover localizations (MMGIS)',
        url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
        credit: 'NASA/JPL-Caltech',
        license: 'NASA/JPL image and data use policy',
        doi: null,
      },
    ],
  }
}

function route(
  id: string,
  option: string,
  leg: string,
  order: number,
  kind: string,
  sols: number[],
) {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [77.4063, 18.4574, -2535.5],
        [77.4059, 18.4586, -2523.1],
      ],
    },
    properties: {
      option,
      leg,
      order,
      kind,
      proposed: kind === 'connector',
      length_m: 10,
      sols,
      note: null,
      source_ids: ['m20-traverse'],
    },
  }
}
