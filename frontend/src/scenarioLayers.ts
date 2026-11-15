// Explicit module files (not the `ol/style` index) so Node's test runner can load them.
import Feature, { type FeatureLike } from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import RegularShape from 'ol/style/RegularShape.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import Text from 'ol/style/Text.js'
import { formatSols, type RouteOption, type Scenario, type ScenarioStop } from './scenario.ts'

// Route options: color plus a width/layer cue. The first option is drawn narrow on top,
// later options wider underneath, so a shared approach shows both lines side by side.
const OPTION_COLORS = ['#fbbf24', '#22d3ee', '#a3e635', '#f472b6']
const CASING = 'rgba(2, 6, 23, 0.85)'
const TRACK_COLOR = '#f8fafc'
const LABEL_FONT = '600 12px ui-sans-serif, system-ui, sans-serif'
// Selection highlight (specs/design-system.md): Accent halo with a Secondary outline.
export const SELECTION_ACCENT = '#8F5A53'
export const SELECTION_OUTLINE = '#EBEBEB'

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

/** Route option a clicked map feature belongs to (lines, connector, badge), or null. */
export function featureOptionId(feature: FeatureLike): string | null {
  const option = feature.get('option')
  return typeof option === 'string' ? option : null
}

/** Bounding box of an option's outbound lines, for fitting the map to the selected option. */
export function optionExtent(
  scenario: Scenario,
  optionId: string,
): [number, number, number, number] | null {
  const coords = scenario.routes.features
    .filter((f) => f.properties.option === optionId && f.properties.leg === 'outbound')
    .flatMap((f) => f.geometry.coordinates)
  if (coords.length === 0) return null
  const lons = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

export function routeStyle(
  options: readonly RouteOption[],
  selectedOptionId: () => string | null = () => null,
) {
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
    const selected = featureOptionId(feature) === selectedOptionId()
    // Drawn beneath the casing; above every unselected option so the pick reads first.
    const halo = (width: number) =>
      new Style({
        zIndex: 40 + options.length * 10,
        stroke: new Stroke({
          color: SELECTION_ACCENT,
          width: width + 10,
          lineJoin: 'round',
          lineCap: 'round',
        }),
      })
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
            backgroundStroke: new Stroke({
              color: selected ? SELECTION_OUTLINE : CASING,
              width: selected ? 3 : 2,
            }),
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
      const drawn = labelled ? lines : lines.slice(0, 2)
      return selected ? [...drawn, halo(4)] : drawn
    }

    const lines = [
      new Style({
        zIndex: selected ? 45 + options.length * 10 : option.zIndex,
        stroke: new Stroke({ color: CASING, width: option.width + 3, lineJoin: 'round' }),
      }),
      new Style({
        zIndex: selected ? 46 + options.length * 10 : option.zIndex + 1,
        stroke: new Stroke({ color: option.color, width: option.width, lineJoin: 'round' }),
      }),
    ]
    return selected ? [...lines, halo(option.width)] : lines
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

// Science stops: a diamond (not a circle like Start and the Jezero landmarks), a color no
// route option uses, and an always-boxed text label, so shape and words carry the meaning.
export const STOP_COLOR = '#e879f9'
const STOP_LABEL_MAX_RESOLUTION = 4.5e-5

export interface LabelPlacement {
  side: 'left' | 'right'
  vertical: 'up' | 'down' | 'level'
}

/** Map label for a science stop, e.g. "Skinner Ridge — sample site". */
export function stopLabel(stop: Pick<ScenarioStop, 'name' | 'kind'>): string {
  return stop.kind === 'sample-location' ? `${stop.name} — sample site` : stop.name
}

/** Lists cores with their sols, e.g. "Swift Run (sol 490), Skyland (sol 495)". */
export function formatSamples(samples: ScenarioStop['samples']): string {
  return samples.map((s) => `${s.name} (sol ${s.sol})`).join(', ')
}

/** One-line hover text: label, cores with sols, and the stop summary. */
export function stopTooltip(stop: ScenarioStop): string {
  const parts = [stopLabel(stop)]
  if (stop.samples.length > 0) parts.push(`Cores: ${formatSamples(stop.samples)}`)
  if (stop.summary) parts.push(stop.summary)
  return parts.join('. ')
}

/**
 * Places each stop's label on the side facing away from the other stops (west stops left,
 * east stops right; north stops raised, south stops lowered), so labels of stops a few
 * meters apart, and the route notes between them, do not overlap. A lone stop is labeled
 * level on the right.
 */
export function stopLabelPlacement(stops: readonly ScenarioStop[], stopId: string): LabelPlacement {
  const stop = stops.find((s) => s.id === stopId)
  if (!stop || stops.length < 2) return { side: 'right', vertical: 'level' }
  const mean = (axis: 0 | 1) =>
    stops.reduce((sum, s) => sum + s.coordinates[axis], 0) / stops.length
  return {
    side: stop.coordinates[0] < mean(0) ? 'left' : 'right',
    vertical: stop.coordinates[1] > mean(1) ? 'up' : 'down',
  }
}

export function stopFeatureId(stopId: string): string {
  return `stop-${stopId}`
}

/** Builds one point feature per science stop at the stop's payload coordinates. */
export function buildStopFeatures(scenario: Scenario): Feature[] {
  return scenario.stops.map((stop) => {
    const feature = new Feature({ geometry: new Point(stop.coordinates.slice(0, 2)) })
    feature.setId(stopFeatureId(stop.id))
    feature.setProperties({
      role: 'stop',
      stopId: stop.id,
      label: stopLabel(stop),
      labelPlacement: stopLabelPlacement(scenario.stops, stop.id),
      tooltip: stopTooltip(stop),
    })
    return feature
  })
}

export function stopStyle(selectedStopId: () => string | null) {
  return (feature: FeatureLike, resolution: number): Style[] => {
    const selected = feature.get('stopId') === selectedStopId()
    const placement: LabelPlacement = feature.get('labelPlacement') ?? {
      side: 'right',
      vertical: 'level',
    }
    const left = placement.side === 'left'
    const radius = selected ? 11 : 9
    const marker = new Style({
      zIndex: selected ? 210 : 200,
      image: new RegularShape({
        points: 4,
        radius,
        angle: 0,
        fill: new Fill({ color: STOP_COLOR }),
        stroke: new Stroke({
          color: selected ? SELECTION_OUTLINE : CASING,
          width: selected ? 3 : 2.5,
        }),
      }),
    })
    // Accent ring behind the selected diamond (the design system's selection color).
    const halo = new Style({
      zIndex: 209,
      image: new CircleStyle({
        radius: radius + 4,
        stroke: new Stroke({ color: SELECTION_ACCENT, width: 4 }),
      }),
    })
    // Inner dot: the drill-hole cue, readable without color.
    const hole = new Style({
      zIndex: selected ? 211 : 201,
      image: new CircleStyle({ radius: 2.5, fill: new Fill({ color: '#020617' }) }),
    })
    const extra = selected ? [halo] : []
    if (resolution > STOP_LABEL_MAX_RESOLUTION) return [marker, hole, ...extra]
    const label = new Style({
      zIndex: selected ? 212 : 202,
      text: new Text({
        text: String(feature.get('label') ?? ''),
        font: LABEL_FONT,
        textAlign: left ? 'right' : 'left',
        offsetX: left ? -(radius + 4) : radius + 4,
        offsetY: { up: -(radius + 4), down: radius + 4, level: 0 }[placement.vertical],
        fill: new Fill({ color: '#020617' }),
        backgroundFill: new Fill({ color: STOP_COLOR }),
        backgroundStroke: new Stroke({
          color: selected ? SELECTION_ACCENT : CASING,
          width: selected ? 3 : 1.5,
        }),
        padding: [2, 5, 1, 5],
      }),
    })
    return [marker, hole, label, ...extra]
  }
}

export function extentOf(scenario: Scenario): [number, number, number, number] {
  const { lon_min, lat_min, lon_max, lat_max } = scenario.extent
  return [lon_min, lat_min, lon_max, lat_max]
}
