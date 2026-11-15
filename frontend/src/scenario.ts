// Types and validation for the read-only scenario API, contract v1 (specs/scenario-api.md).

export const SUPPORTED_SCENARIO_MAJOR = 1

/** `[lon, lat]` or `[lon, lat, elev_m]`, planetocentric, positive-east, degrees. */
export type Position = [number, number] | [number, number, number]

export interface ScenarioExtent {
  lon_min: number
  lon_max: number
  lat_min: number
  lat_max: number
}

export interface ScenarioStart {
  id: string
  rmc: string | null
  label: string
  coordinates: Position
  source_ids: string[]
}

export interface StopSample {
  name: string
  sol: number
}

export interface ScenarioStop {
  id: string
  name: string
  kind: string
  coordinates: Position
  /** Rover localization (`RMC`) nearest to the stop, where the rover parked to sample. */
  nearest_rmc: string | null
  samples: StopSample[]
  summary: string | null
  source_ids: string[]
}

export interface RouteOption {
  id: string
  label: string
  stop_ids: string[]
  outbound_m: number
  round_trip_m: number
  proposed_m: number
  ascent_m?: number | null
  max_grade_deg?: Record<string, number | null> | null
  dtm_covered_pct?: number | null
  open_zone_ids?: string[] | null
}

type CautionZoneKind = 'terrain-gap' | 'connector' | 'observation-approach' | 'steep-segment'

export interface CautionZoneProperties {
  option: string
  kind: CautionZoneKind
  from_m: number
  to_m: number
  length_m: number
  review_status: string | null
  summary: string | null
  source_ids: string[]
  stop_id: string | null
  approach: 'visit' | 'stand-off' | null
  step_m: number | null
  closest_offset_m: number | null
  grade_deg: number | null
  grade_class: string | null
  uncertainty: Record<string, unknown> | null
}

export interface LineFeature<P> {
  type: 'Feature'
  id: string
  geometry: { type: 'LineString'; coordinates: Position[] }
  properties: P
}

export interface FeatureCollection<P> {
  type: 'FeatureCollection'
  features: LineFeature<P>[]
}

export interface RouteProperties {
  option: string
  leg: 'outbound' | 'return'
  order: number
  kind: 'historical' | 'connector'
  proposed: boolean
  length_m: number
  sols: number[]
  note: string | null
  source_ids: string[]
}

export interface TrackProperties {
  sol: number
  from_rmc: string | null
  to_rmc: string | null
  length_m: number | null
  source_ids: string[]
}

export interface ScenarioSource {
  id: string
  title: string
  url: string
  credit: string | null
  license: string | null
  doi: string | null
}

export interface Scenario {
  schema_version: string
  scenario_id: string
  title: string
  extent: ScenarioExtent
  start: ScenarioStart
  stops: ScenarioStop[]
  route_options: RouteOption[]
  routes: FeatureCollection<RouteProperties>
  rover_track: FeatureCollection<TrackProperties>
  caution_zones: LineFeature<CautionZoneProperties>[]
  pending_sections: string[]
  sources: ScenarioSource[]
}

/** The payload has a MAJOR version this client does not understand. */
export class ScenarioVersionError extends Error {
  readonly version: string
  constructor(version: string) {
    super(`Scenario version ${version} is not supported (this map reads version 1.x).`)
    this.name = 'ScenarioVersionError'
    this.version = version
  }
}

/** The payload does not follow the v1 contract. */
export class ScenarioFormatError extends Error {
  constructor(detail: string) {
    super(`Scenario payload is invalid: ${detail}.`)
    this.name = 'ScenarioFormatError'
  }
}

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const VERSION = /^(\d+)\.(\d+)$/

type Json = Record<string, unknown>

function fail(detail: string): never {
  throw new ScenarioFormatError(detail)
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown, path: string): Json {
  if (!isRecord(value)) fail(`${path} must be an object`)
  return value
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be a list`)
  return value
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string`)
  return value
}

function optionalText(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') fail(`${path} must be a string or null`)
  return value
}

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be a number`)
  return value
}

function length(value: unknown, path: string): number {
  const n = finite(value, path)
  if (n < 0) fail(`${path} must not be negative`)
  return n
}

function optionalLength(value: unknown, path: string): number | null {
  return value == null ? null : length(value, path)
}

function sol(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) fail(`${path} must be a sol number`)
  return value as number
}

function kebabId(value: unknown, path: string): string {
  if (typeof value !== 'string' || !KEBAB_ID.test(value)) {
    fail(`${path} must be a lowercase kebab-case id`)
  }
  return value
}

function uniqueIds(ids: string[], path: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) fail(`${path} has duplicate id "${id}"`)
    seen.add(id)
  }
}

export function parsePosition(value: unknown, path: string): Position {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) {
    fail(`${path} must be [lon, lat] or [lon, lat, elev_m]`)
  }
  const [lon, lat, elev] = value.map((n, i) => finite(n, `${path}[${i}]`))
  if (lon < -180 || lon > 180) fail(`${path} longitude must be within -180..180`)
  if (lat < -90 || lat > 90) fail(`${path} latitude must be within -90..90`)
  return elev === undefined ? [lon, lat] : [lon, lat, elev]
}

function sourceIds(value: unknown, path: string, known: ReadonlySet<string>): string[] {
  const ids = list(value, path)
  if (ids.length === 0) fail(`${path} must not be empty`)
  return ids.map((id, i) => {
    const sourceId = kebabId(id, `${path}[${i}]`)
    if (!known.has(sourceId)) fail(`${path}[${i}] "${sourceId}" is not listed in sources`)
    return sourceId
  })
}

function lineGeometry(value: unknown, path: string): LineFeature<unknown>['geometry'] {
  const geometry = record(value, `${path}.geometry`)
  if (geometry.type !== 'LineString') fail(`${path}.geometry must be a LineString`)
  const coordinates = list(geometry.coordinates, `${path}.geometry.coordinates`)
  if (coordinates.length < 2) fail(`${path}.geometry needs at least two positions`)
  return {
    type: 'LineString',
    coordinates: coordinates.map((c, i) => parsePosition(c, `${path}.geometry.coordinates[${i}]`)),
  }
}

function lineFeature<P>(
  value: unknown,
  path: string,
  parseProperties: (props: Json, path: string) => P,
): LineFeature<P> {
  const feature = record(value, path)
  if (feature.type !== 'Feature') fail(`${path}.type must be "Feature"`)
  return {
    type: 'Feature',
    id: kebabId(feature.id, `${path}.id`),
    geometry: lineGeometry(feature.geometry, path),
    properties: parseProperties(record(feature.properties, `${path}.properties`), path),
  }
}

function featureCollection<P>(
  value: unknown,
  path: string,
  parseProperties: (props: Json, path: string) => P,
): FeatureCollection<P> {
  const collection = record(value, path)
  if (collection.type !== 'FeatureCollection') fail(`${path}.type must be "FeatureCollection"`)
  const features = list(collection.features, `${path}.features`).map((f, i) =>
    lineFeature(f, `${path}.features[${i}]`, parseProperties),
  )
  uniqueIds(
    features.map((f) => f.id),
    `${path}.features`,
  )
  return { type: 'FeatureCollection', features }
}

/** Reads `schema_version` and rejects any MAJOR other than 1. */
export function checkSchemaVersion(value: unknown): string {
  if (typeof value !== 'string') fail('schema_version must be a "MAJOR.MINOR" string')
  const match = VERSION.exec(value)
  if (!match) fail('schema_version must be a "MAJOR.MINOR" string')
  if (Number(match[1]) !== SUPPORTED_SCENARIO_MAJOR) throw new ScenarioVersionError(value)
  return value
}

/**
 * Validates a scenario payload against contract v1 and returns a copy holding only the
 * fields this client knows. Throws ScenarioVersionError or ScenarioFormatError.
 */
export function parseScenario(data: unknown, expectedId?: string): Scenario {
  const root = record(data, 'scenario')
  // Check the version first: another MAJOR may use a different shape.
  const schemaVersion = checkSchemaVersion(root.schema_version)

  const scenarioId = kebabId(root.scenario_id, 'scenario_id')
  if (expectedId !== undefined && scenarioId !== expectedId) {
    fail(`scenario_id "${scenarioId}" does not match the requested "${expectedId}"`)
  }

  const sources = list(root.sources, 'sources').map((value, i): ScenarioSource => {
    const path = `sources[${i}]`
    const source = record(value, path)
    return {
      id: kebabId(source.id, `${path}.id`),
      title: text(source.title, `${path}.title`),
      url: text(source.url, `${path}.url`),
      credit: optionalText(source.credit, `${path}.credit`),
      license: optionalText(source.license, `${path}.license`),
      doi: optionalText(source.doi, `${path}.doi`),
    }
  })
  uniqueIds(
    sources.map((s) => s.id),
    'sources',
  )
  const known = new Set(sources.map((s) => s.id))

  const extentRecord = record(root.extent, 'extent')
  const extent: ScenarioExtent = {
    lon_min: finite(extentRecord.lon_min, 'extent.lon_min'),
    lon_max: finite(extentRecord.lon_max, 'extent.lon_max'),
    lat_min: finite(extentRecord.lat_min, 'extent.lat_min'),
    lat_max: finite(extentRecord.lat_max, 'extent.lat_max'),
  }
  parsePosition([extent.lon_min, extent.lat_min], 'extent (min corner)')
  parsePosition([extent.lon_max, extent.lat_max], 'extent (max corner)')
  if (extent.lon_min >= extent.lon_max || extent.lat_min >= extent.lat_max) {
    fail('extent minimums must be below maximums')
  }

  const startRecord = record(root.start, 'start')
  const start: ScenarioStart = {
    id: kebabId(startRecord.id, 'start.id'),
    rmc: optionalText(startRecord.rmc, 'start.rmc'),
    label: text(startRecord.label, 'start.label'),
    coordinates: parsePosition(startRecord.coordinates, 'start.coordinates'),
    source_ids: sourceIds(startRecord.source_ids, 'start.source_ids', known),
  }

  const stops = list(root.stops, 'stops').map((value, i): ScenarioStop => {
    const path = `stops[${i}]`
    const stop = record(value, path)
    return {
      id: kebabId(stop.id, `${path}.id`),
      name: text(stop.name, `${path}.name`),
      kind: text(stop.kind, `${path}.kind`),
      coordinates: parsePosition(stop.coordinates, `${path}.coordinates`),
      nearest_rmc: optionalText(stop.nearest_rmc, `${path}.nearest_rmc`),
      samples:
        stop.samples === undefined
          ? []
          : list(stop.samples, `${path}.samples`).map((value, j) => {
              const sample = record(value, `${path}.samples[${j}]`)
              return {
                name: text(sample.name, `${path}.samples[${j}].name`),
                sol: sol(sample.sol, `${path}.samples[${j}].sol`),
              }
            }),
      summary: optionalText(stop.summary, `${path}.summary`),
      source_ids: sourceIds(stop.source_ids, `${path}.source_ids`, known),
    }
  })
  uniqueIds(
    stops.map((s) => s.id),
    'stops',
  )
  const stopIds = new Set(stops.map((s) => s.id))

  const routeOptions = list(root.route_options, 'route_options').map((value, i): RouteOption => {
    const path = `route_options[${i}]`
    const option = record(value, path)
    const gradePath = `${path}.max_grade_deg`
    const grade = option.max_grade_deg == null ? null : record(option.max_grade_deg, gradePath)
    const coveragePath = `${path}.dtm_covered_pct`
    const coverage = optionalLength(option.dtm_covered_pct, coveragePath)
    if (coverage !== null && coverage > 100) fail(`${coveragePath} must not exceed 100`)
    const reviewPath = `${path}.caution_review`
    const review = option.caution_review == null ? null : record(option.caution_review, reviewPath)
    return {
      id: text(option.id, `${path}.id`),
      label: text(option.label, `${path}.label`),
      stop_ids: list(option.stop_ids, `${path}.stop_ids`).map((id, j) => {
        const stopId = kebabId(id, `${path}.stop_ids[${j}]`)
        if (!stopIds.has(stopId)) fail(`${path}.stop_ids[${j}] "${stopId}" is not a stop`)
        return stopId
      }),
      outbound_m: length(option.outbound_m, `${path}.outbound_m`),
      round_trip_m: length(option.round_trip_m, `${path}.round_trip_m`),
      proposed_m: length(option.proposed_m, `${path}.proposed_m`),
      ascent_m: optionalLength(option.ascent_m, `${path}.ascent_m`),
      max_grade_deg:
        grade &&
        Object.fromEntries(
          ['2', '5', '10'].map((step) => [
            step,
            optionalLength(grade[step], `${gradePath}.${step}`),
          ]),
        ),
      dtm_covered_pct: coverage,
      open_zone_ids:
        review?.open_zone_ids == null
          ? null
          : list(review.open_zone_ids, `${reviewPath}.open_zone_ids`).map((id, j) =>
              kebabId(id, `${reviewPath}.open_zone_ids[${j}]`),
            ),
    }
  })
  if (routeOptions.length === 0) fail('route_options must not be empty')
  uniqueIds(
    routeOptions.map((o) => o.id),
    'route_options',
  )
  const optionIds = new Set(routeOptions.map((o) => o.id))

  const routes = featureCollection(root.routes, 'routes', (props, path): RouteProperties => {
    const option = text(props.option, `${path}.properties.option`)
    if (!optionIds.has(option)) fail(`${path}.properties.option "${option}" is not a route option`)
    const { leg, kind, proposed } = props
    if (leg !== 'outbound' && leg !== 'return') {
      fail(`${path}.properties.leg must be "outbound" or "return"`)
    }
    if (kind !== 'historical' && kind !== 'connector') {
      fail(`${path}.properties.kind must be "historical" or "connector"`)
    }
    if (typeof proposed !== 'boolean') fail(`${path}.properties.proposed must be a boolean`)
    if (proposed !== (kind === 'connector')) {
      fail(`${path}.properties.proposed must be true exactly for connector pieces`)
    }
    const order = props.order
    if (!Number.isInteger(order) || (order as number) < 1) {
      fail(`${path}.properties.order must be a positive integer`)
    }
    return {
      option,
      leg,
      order: order as number,
      kind,
      proposed,
      length_m: length(props.length_m, `${path}.properties.length_m`),
      sols: list(props.sols, `${path}.properties.sols`).map((s, j) =>
        sol(s, `${path}.properties.sols[${j}]`),
      ),
      note: optionalText(props.note, `${path}.properties.note`),
      source_ids: sourceIds(props.source_ids, `${path}.properties.source_ids`, known),
    }
  })

  const roverTrack = featureCollection(
    root.rover_track,
    'rover_track',
    (props, path): TrackProperties => ({
      sol: sol(props.sol, `${path}.properties.sol`),
      from_rmc: optionalText(props.from_rmc, `${path}.properties.from_rmc`),
      to_rmc: optionalText(props.to_rmc, `${path}.properties.to_rmc`),
      length_m:
        props.length_m === null ? null : length(props.length_m, `${path}.properties.length_m`),
      source_ids: sourceIds(props.source_ids, `${path}.properties.source_ids`, known),
    }),
  )

  const cautionZones = list(root.unknowns, 'unknowns').flatMap(
    (value, i): LineFeature<CautionZoneProperties>[] => {
      const path = `unknowns[${i}]`
      const zone = record(value, path)
      const { kind, approach } = zone
      if (
        kind !== 'terrain-gap' &&
        kind !== 'connector' &&
        kind !== 'observation-approach' &&
        kind !== 'steep-segment'
      ) {
        return []
      }
      const option = text(zone.option, `${path}.option`)
      const from_m = length(zone.from_m, `${path}.from_m`)
      const to_m = length(zone.to_m, `${path}.to_m`)
      if (kind === 'terrain-gap' && to_m < from_m) fail(`${path}.to_m must be at or after from_m`)
      if (!optionIds.has(option)) fail(`${path}.option "${option}" is not a route option`)
      return [
        {
          type: 'Feature',
          id: kebabId(zone.id, `${path}.id`),
          geometry: lineGeometry(zone.geometry, path),
          properties: {
            option,
            kind,
            source_ids: sourceIds(zone.source_ids, `${path}.source_ids`, known),
            from_m,
            to_m,
            length_m: length(zone.length_m, `${path}.length_m`),
            review_status: optionalText(zone.review_status, `${path}.review_status`),
            summary: optionalText(zone.summary, `${path}.summary`),
            stop_id: optionalText(zone.stop_id, `${path}.stop_id`),
            approach: approach === 'visit' || approach === 'stand-off' ? approach : null,
            step_m: optionalLength(zone.step_m, `${path}.step_m`),
            closest_offset_m: optionalLength(zone.closest_offset_m, `${path}.closest_offset_m`),
            grade_deg: optionalLength(zone.grade_deg, `${path}.grade_deg`),
            grade_class: optionalText(zone.grade_class, `${path}.grade_class`),
            uncertainty:
              zone.uncertainty == null ? null : record(zone.uncertainty, `${path}.uncertainty`),
          },
        },
      ]
    },
  )
  uniqueIds(
    cautionZones.map((zone) => zone.id),
    'unknowns',
  )

  for (const section of ['evidence', 'profiles']) {
    list(root[section], section)
  }
  const pendingSections = list(root.pending_sections, 'pending_sections').map((s, i) =>
    text(s, `pending_sections[${i}]`),
  )

  return {
    schema_version: schemaVersion,
    scenario_id: scenarioId,
    title: text(root.title, 'title'),
    extent,
    start,
    stops,
    route_options: routeOptions,
    routes,
    rover_track: roverTrack,
    caution_zones: cautionZones,
    pending_sections: pendingSections,
    sources,
  }
}

/** Formats a length for the legend, e.g. 258.01 -> "258 m". */
export function formatMeters(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} m`
}

/** Formats a sol list as a compact range text, e.g. [449, 455, 461] -> "sols 449–461". */
export function formatSols(sols: readonly number[]): string {
  if (sols.length === 0) return 'no sols'
  const min = Math.min(...sols)
  const max = Math.max(...sols)
  return min === max ? `sol ${min}` : `sols ${min}–${max}`
}

export type ScenarioStatus = 'loading' | 'ready' | 'unavailable' | 'unsupported'

/** Maps a failed scenario load to the UI state and a short reason. */
export function describeScenarioFailure(
  err: unknown,
  timedOut: boolean,
): { status: 'unavailable' | 'unsupported'; message: string } {
  if (err instanceof ScenarioVersionError) return { status: 'unsupported', message: err.message }
  if (timedOut) return { status: 'unavailable', message: 'The backend did not respond in time.' }
  if (err instanceof TypeError) {
    return { status: 'unavailable', message: 'Could not reach the backend (network error).' }
  }
  return {
    status: 'unavailable',
    message: err instanceof Error ? err.message : 'Unknown error.',
  }
}
