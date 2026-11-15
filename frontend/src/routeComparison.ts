import { getDistance } from 'ol/sphere.js'
import { formatMarsCoordinate, MARS_RADIUS_M } from './marsCatalog.ts'
import {
  formatMeters,
  type CautionZoneProperties,
  type Position,
  type Scenario,
} from './scenario.ts'

export const GRADE_STEPS = [5, 2, 10]

function withUnit(value: number | null | undefined, unit: string): string {
  return value == null ? 'Unknown' : `${value.toFixed(2)}${unit}`
}

function zoneLabel(zone: CautionZoneProperties, stopName: string | undefined): string {
  switch (zone.kind) {
    case 'connector':
      return 'Proposed connector'
    case 'terrain-gap':
      return 'Elevation coverage gap'
    case 'observation-approach':
      return stopName ? `${stopName} approach` : 'Observation approach'
    case 'steep-segment':
      return zone.step_m == null ? 'Steepest segment' : `Steepest segment · ${zone.step_m} m window`
  }
}

function farthestPoint(start: Position, vertices: Position[]): string {
  let farthest: { point: Position; distance: number } | undefined
  for (const point of vertices) {
    const distance = getDistance(start, point, MARS_RADIUS_M)
    if (!farthest || distance > farthest.distance) farthest = { point, distance }
  }
  if (!farthest) return 'Unknown'
  const [lon, lat] = farthest.point
  return `${withUnit(farthest.distance, ' m')} · ${formatMarsCoordinate(lon, lat)}`
}

export function buildRouteComparison(scenario: Scenario) {
  const stopNames = new Map(scenario.stops.map((stop) => [stop.id, stop.name]))
  const options = scenario.route_options.map((option) => {
    const zones = scenario.caution_zones.filter((zone) => zone.properties.option === option.id)
    const outbound = scenario.routes.features
      .filter(({ properties }) => properties.option === option.id && properties.leg === 'outbound')
      .sort((a, b) => a.properties.order - b.properties.order)
    const endpoint = outbound.at(-1)?.geometry.coordinates.at(-1)

    const observations = new Map<string, { label: string; distance: number }>()
    const approaches = new Map(
      zones
        .map(({ properties }) => properties)
        .filter((zone) => zone.kind === 'observation-approach')
        .map((zone) => [zone.stop_id, zone]),
    )
    for (const id of option.stop_ids) {
      const name = stopNames.get(id)
      if (!name) continue
      const task =
        id === 'skinner-ridge'
          ? 'close inspection of the block contact'
          : id === 'wildcat-ridge'
            ? 'outcrop inspection'
            : 'site visit'
      observations.set(id, {
        label: `${name} ${task}`,
        distance: approaches.get(id)?.to_m ?? Infinity,
      })
    }
    for (const [stopId, zone] of approaches) {
      if (zone.approach !== 'stand-off' || !stopId) continue
      const name = stopNames.get(stopId)
      if (name) {
        const caveat = stopId === 'skinner-ridge' ? ' · contact may be obscured' : ''
        observations.set(stopId, {
          label: `${name} stand-off view${caveat}`,
          distance: zone.to_m,
        })
      }
    }

    return {
      id: option.id,
      roundTrip: formatMeters(option.round_trip_m),
      ascent: withUnit(option.ascent_m, ' m'),
      maxGrades: GRADE_STEPS.map((step) => withUnit(option.max_grade_deg?.[step], '°')),
      coverage: option.dtm_covered_pct == null ? 'Unknown' : `${option.dtm_covered_pct}%`,
      turnaround: endpoint
        ? `${formatMeters(option.outbound_m)} along route · ${formatMarsCoordinate(endpoint[0], endpoint[1])}`
        : 'Unknown',
      farthestFromStart: farthestPoint(
        scenario.start.coordinates,
        outbound.flatMap(({ geometry }) => geometry.coordinates),
      ),
      observations: Array.from(observations.values())
        .sort((a, b) => a.distance - b.distance)
        .map(({ label }) => label),
      openZones:
        option.open_zone_ids?.map((id) => {
          const zone = zones.find((candidate) => candidate.id === id)?.properties
          if (!zone) return { id, label: `${id} · details unavailable` }
          return {
            id,
            label: zoneLabel(zone, stopNames.get(zone.stop_id ?? '')),
            span: `${zone.from_m}–${zone.to_m} m`,
            summary: zone.summary,
          }
        }) ?? null,
    }
  })
  const a = scenario.route_options.find((option) => option.id === 'A')
  const b = scenario.route_options.find((option) => option.id === 'B')
  return {
    options,
    distanceDifference: a && b ? formatMeters(Math.abs(b.round_trip_m - a.round_trip_m)) : null,
  }
}
