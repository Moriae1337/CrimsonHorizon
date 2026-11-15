import Feature, { type FeatureLike } from 'ol/Feature'
import LineString from 'ol/geom/LineString'
import Point from 'ol/geom/Point'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import { formatSols, type RouteOption, type Scenario } from './scenario'

// Route options: color plus a width/layer cue. The first option is drawn narrow on top,
// later options wider underneath, so a shared approach shows both lines side by side.
const OPTION_COLORS = ['#fbbf24', '#22d3ee', '#a3e635', '#f472b6']
const CASING = 'rgba(2, 6, 23, 0.85)'
const TRACK_COLOR = '#f8fafc'
const LABEL_FONT = '600 12px ui-sans-serif, system-ui, sans-serif'

// Map labels (badges, connector note, sol tags) appear from about zoom 15 (~1.2 m/px)
// down, where they no longer cover the lines they describe.
const LABEL_MAX_RESOLUTION = 2.2e-5

export const CONNECTOR_DASH = [7, 6]
export const TRACK_DASH = [0.1, 6]

export interface OptionStyle {
  color: string
  width: number
  zIndex: number
}

export function optionStyle(options: readonly RouteOption[], optionId: string): OptionStyle {
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === optionId),
  )
  return {
    color: OPTION_COLORS[index % OPTION_COLORS.length],
    width: 3 + index * 5,
    zIndex: (options.length - index) * 10,
  }
}

export const TRACK_STYLE = { color: TRACK_COLOR, width: 2.5 }

function midpoint(line: LineString): Point {
  return new Point(line.getCoordinateAt(0.5))
}

/** Finds the vertex of `own` farthest from every vertex of `others` (the option's own part). */
function distinctiveVertex(own: number[][], others: number[][]): number[] {
  if (others.length === 0) return own[Math.floor(own.length / 2)]
  let best = own[Math.floor(own.length / 2)]
  let bestDistance = 0
  for (const [x, y] of own) {
    let nearest = Infinity
    for (const [ox, oy] of others) {
      nearest = Math.min(nearest, (x - ox) ** 2 + (y - oy) ** 2)
    }
    if (nearest > bestDistance) {
      bestDistance = nearest
      best = [x, y]
    }
  }
  return best
}

/** Builds the route-option features: outbound legs, option badges, and the start marker. */
export function buildRouteFeatures(scenario: Scenario): Feature[] {
  // Return legs retrace the outbound geometry, so only outbound legs are drawn.
  const outbound = scenario.routes.features.filter((f) => f.properties.leg === 'outbound')
  const features: Feature[] = []
  const labels = new Map(scenario.route_options.map((o) => [o.id, o.label]))

  for (const route of outbound) {
    const p = route.properties
    const feature = new Feature({
      geometry: new LineString(route.geometry.coordinates.map(([lon, lat]) => [lon, lat])),
    })
    feature.setId(route.id)
    feature.setProperties({
      role: p.proposed ? 'connector' : 'route',
      option: p.option,
      tooltip: p.proposed
        ? `Option ${p.option}: proposed connector, ${p.length_m} m. Not driven by the rover.`
        : `Option ${p.option} outbound: Perseverance-driven ground, ${formatSols(p.sols)}, ${Math.round(p.length_m)} m`,
      label: labels.get(p.option),
    })
    features.push(feature)
  }

  for (const option of scenario.route_options) {
    const own = outbound
      .filter((f) => f.properties.option === option.id)
      .flatMap((f) => f.geometry.coordinates)
    if (own.length === 0) continue
    const others = outbound
      .filter((f) => f.properties.option !== option.id)
      .flatMap((f) => f.geometry.coordinates)
    const badge = new Feature({ geometry: new Point(distinctiveVertex(own, others).slice(0, 2)) })
    badge.setProperties({ role: 'badge', option: option.id, tooltip: option.label })
    features.push(badge)
  }

  const start = new Feature({ geometry: new Point(scenario.start.coordinates.slice(0, 2)) })
  start.setId(`scenario-${scenario.start.id}`)
  start.setProperties({
    role: 'start',
    tooltip: scenario.start.rmc
      ? `${scenario.start.label} (rover localization ${scenario.start.rmc})`
      : scenario.start.label,
    label: scenario.start.label,
  })
  features.push(start)
  return features
}

export function buildTrackFeatures(scenario: Scenario): Feature[] {
  return scenario.rover_track.features.map((drive) => {
    const p = drive.properties
    const feature = new Feature({
      geometry: new LineString(drive.geometry.coordinates.map(([lon, lat]) => [lon, lat])),
    })
    feature.setId(drive.id)
    const length = p.length_m === null ? '' : `, ${p.length_m} m`
    feature.setProperties({
      role: 'track',
      sol: p.sol,
      tooltip: `Historical Perseverance drive, sol ${p.sol}${length}`,
    })
    return feature
  })
}

export function routeStyle(options: readonly RouteOption[]) {
  return (feature: FeatureLike, resolution: number): Style[] => {
    const role = feature.get('role')
    const labelled = resolution <= LABEL_MAX_RESOLUTION
    if (role === 'start') {
      return [
        new Style({
          zIndex: 100,
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: '#f8fafc' }),
            stroke: new Stroke({ color: CASING, width: 3 }),
          }),
          text: new Text({
            text: labelled ? String(feature.get('label') ?? 'Start') : '',
            offsetY: 16,
            font: LABEL_FONT,
            fill: new Fill({ color: '#f8fafc' }),
            stroke: new Stroke({ color: '#020617', width: 3 }),
          }),
        }),
      ]
    }

    const option = optionStyle(options, String(feature.get('option')))
    if (role === 'badge') {
      if (!labelled) return []
      return [
        new Style({
          zIndex: 90,
          text: new Text({
            text: String(feature.get('option')),
            font: '700 13px ui-sans-serif, system-ui, sans-serif',
            fill: new Fill({ color: '#020617' }),
            backgroundFill: new Fill({ color: option.color }),
            backgroundStroke: new Stroke({ color: CASING, width: 2 }),
            padding: [2, 6, 1, 6],
          }),
        }),
      ]
    }

    if (role === 'connector') {
      const lines = [
        new Style({ zIndex: 50, stroke: new Stroke({ color: CASING, width: 7 }) }),
        new Style({
          zIndex: 51,
          stroke: new Stroke({
            color: option.color,
            width: 4,
            lineDash: CONNECTOR_DASH,
            lineCap: 'butt',
          }),
        }),
        new Style({
          zIndex: 95,
          geometry: (f) => midpoint(f.getGeometry() as LineString),
          text: new Text({
            text: 'Proposed connector\n(not driven)',
            font: '600 11px ui-sans-serif, system-ui, sans-serif',
            textAlign: 'left',
            offsetX: 14,
            fill: new Fill({ color: '#f8fafc' }),
            backgroundFill: new Fill({ color: 'rgba(2, 6, 23, 0.82)' }),
            padding: [2, 4, 2, 4],
          }),
        }),
      ]
      return labelled ? lines : lines.slice(0, 2)
    }

    return [
      new Style({
        zIndex: option.zIndex,
        stroke: new Stroke({ color: CASING, width: option.width + 3, lineJoin: 'round' }),
      }),
      new Style({
        zIndex: option.zIndex + 1,
        stroke: new Stroke({ color: option.color, width: option.width, lineJoin: 'round' }),
      }),
    ]
  }
}

export function trackStyle(feature: FeatureLike, resolution: number): Style[] {
  const styles = [
    new Style({
      stroke: new Stroke({
        color: TRACK_COLOR,
        width: TRACK_STYLE.width,
        lineDash: TRACK_DASH,
        lineCap: 'round',
      }),
    }),
    new Style({
      geometry: (f) => midpoint(f.getGeometry() as LineString),
      text: new Text({
        text: `sol ${feature.get('sol')}`,
        font: 'italic 500 10px ui-sans-serif, system-ui, sans-serif',
        // Left of the line, so sol tags never cover the connector note on the right.
        offsetX: -10,
        textAlign: 'right',
        fill: new Fill({ color: '#e2e8f0' }),
        stroke: new Stroke({ color: '#020617', width: 3 }),
      }),
    }),
  ]
  return resolution <= LABEL_MAX_RESOLUTION ? styles : styles.slice(0, 1)
}

export function extentOf(scenario: Scenario): [number, number, number, number] {
  const { lon_min, lat_min, lon_max, lat_max } = scenario.extent
  return [lon_min, lat_min, lon_max, lat_max]
}
