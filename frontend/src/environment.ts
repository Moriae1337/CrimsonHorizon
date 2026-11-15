// Archival environment context (contract: specs/environment-api.md).
// MEDA weather at Jezero for sols 490-516 (CH26-095) and Curiosity RAD at Gale (CH26-096).

export const SUPPORTED_ENVIRONMENT_MAJOR = 1

export interface LmstGap {
  from_lmst: string
  to_lmst: string
}

export interface ParameterStats {
  min: number
  max: number
  mean: number
  samples: number
  hours_with_data: number
  covered_h: number
  lmst_gaps: LmstGap[]
}

export interface WeatherSol {
  sol: number
  utc_start: string | null
  utc_stop: string | null
  pressure: ParameterStats | null
  air_temperature: ParameterStats | null
}

export interface WeatherParameter {
  id: string
  label: string
  unit: string
  processing_level: string
}

export interface WeatherContext {
  title: string
  archival: true
  instrument: string
  place: string
  sol_range: [number, number]
  parameters: WeatherParameter[]
  method: string
  source_ids: string[]
  sols: WeatherSol[]
}

export interface RadiationMeasurement {
  id: string
  label: string
  value: number
  uncertainty: number | null
  unit: string
  source_ids: string[]
}

export interface RadiationContext {
  title: string
  archival: true
  instrument: string
  place: {
    name: string
    mission: string
    coordinates: [number, number]
    elevation_m: number | null
  }
  window: { utc_start: string; utc_stop: string; note: string }
  measurements: RadiationMeasurement[]
  limits: string[]
  source_ids: string[]
}

export interface EnvironmentSource {
  id: string
  title: string
  url: string
  credit: string
  doi: string | null
}

export interface EnvironmentContext {
  schema_version: string
  scenario_id: string
  weather: WeatherContext
  radiation: RadiationContext
  sources: EnvironmentSource[]
}

export class EnvironmentFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentFormatError'
  }
}

type Rec = Record<string, unknown>

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(path: string): never {
  throw new EnvironmentFormatError(`Environment context: invalid ${path}.`)
}

function rec(value: unknown, path: string): Rec {
  return isRecord(value) ? value : fail(path)
}

function str(value: unknown, path: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fail(path)
}

function num(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(path)
}

function nullableNum(value: unknown, path: string): number | null {
  return value === null ? null : num(value, path)
}

function nullableStr(value: unknown, path: string): string | null {
  return value === null ? null : str(value, path)
}

function list(value: unknown, path: string): unknown[] {
  return Array.isArray(value) ? value : fail(path)
}

function ids(value: unknown, path: string, known: Set<string>): string[] {
  const items = list(value, path).map((v, i) => str(v, `${path}[${i}]`))
  if (items.length === 0 || !items.every((id) => known.has(id))) fail(path)
  return items
}

const HHMM = /^\d{2}:\d{2}$/

function parseStats(value: unknown, path: string): ParameterStats | null {
  if (value === null) return null
  const v = rec(value, path)
  const stats = {
    min: num(v.min, `${path}.min`),
    max: num(v.max, `${path}.max`),
    mean: num(v.mean, `${path}.mean`),
    samples: num(v.samples, `${path}.samples`),
    hours_with_data: num(v.hours_with_data, `${path}.hours_with_data`),
    covered_h: num(v.covered_h, `${path}.covered_h`),
    lmst_gaps: list(v.lmst_gaps, `${path}.lmst_gaps`).map((g, i) => {
      const gap = rec(g, `${path}.lmst_gaps[${i}]`)
      const from = str(gap.from_lmst, `${path}.lmst_gaps[${i}].from_lmst`)
      const to = str(gap.to_lmst, `${path}.lmst_gaps[${i}].to_lmst`)
      if (!HHMM.test(from) || !HHMM.test(to)) fail(`${path}.lmst_gaps[${i}]`)
      return { from_lmst: from, to_lmst: to }
    }),
  }
  if (stats.min > stats.max) fail(path)
  return stats
}

/** Validates the environment document. Throws EnvironmentFormatError on any defect. */
export function parseEnvironment(data: unknown): EnvironmentContext {
  const doc = rec(data, 'document')
  const version = str(doc.schema_version, 'schema_version')
  if (Number(version.split('.')[0]) !== SUPPORTED_ENVIRONMENT_MAJOR) fail('schema_version')

  const sources = list(doc.sources, 'sources').map((s, i) => {
    const src = rec(s, `sources[${i}]`)
    const url = str(src.url, `sources[${i}].url`)
    if (!url.startsWith('https://')) fail(`sources[${i}].url`)
    return {
      id: str(src.id, `sources[${i}].id`),
      title: str(src.title, `sources[${i}].title`),
      url,
      credit: str(src.credit, `sources[${i}].credit`),
      doi: nullableStr(src.doi ?? null, `sources[${i}].doi`),
    }
  })
  const known = new Set(sources.map((s) => s.id))

  const w = rec(doc.weather, 'weather')
  if (w.archival !== true) fail('weather.archival')
  const range = list(w.sol_range, 'weather.sol_range').map((n) => num(n, 'weather.sol_range'))
  if (range.length !== 2) fail('weather.sol_range')
  const weather: WeatherContext = {
    title: str(w.title, 'weather.title'),
    archival: true,
    instrument: str(w.instrument, 'weather.instrument'),
    place: str(w.place, 'weather.place'),
    sol_range: [range[0], range[1]],
    parameters: list(w.parameters, 'weather.parameters').map((p, i) => {
      const param = rec(p, `weather.parameters[${i}]`)
      return {
        id: str(param.id, `weather.parameters[${i}].id`),
        label: str(param.label, `weather.parameters[${i}].label`),
        unit: str(param.unit, `weather.parameters[${i}].unit`),
        processing_level: str(param.processing_level, `weather.parameters[${i}].processing_level`),
      }
    }),
    method: str(w.method, 'weather.method'),
    source_ids: ids(w.source_ids, 'weather.source_ids', known),
    sols: list(w.sols, 'weather.sols').map((s, i) => {
      const sol = rec(s, `weather.sols[${i}]`)
      return {
        sol: num(sol.sol, `weather.sols[${i}].sol`),
        utc_start: nullableStr(sol.utc_start, `weather.sols[${i}].utc_start`),
        utc_stop: nullableStr(sol.utc_stop, `weather.sols[${i}].utc_stop`),
        pressure: parseStats(sol.pressure, `weather.sols[${i}].pressure`),
        air_temperature: parseStats(sol.air_temperature, `weather.sols[${i}].air_temperature`),
      }
    }),
  }

  const r = rec(doc.radiation, 'radiation')
  if (r.archival !== true) fail('radiation.archival')
  const place = rec(r.place, 'radiation.place')
  const coords = list(place.coordinates, 'radiation.place.coordinates').map((n) =>
    num(n, 'radiation.place.coordinates'),
  )
  if (coords.length !== 2) fail('radiation.place.coordinates')
  const win = rec(r.window, 'radiation.window')
  const radiation: RadiationContext = {
    title: str(r.title, 'radiation.title'),
    archival: true,
    instrument: str(r.instrument, 'radiation.instrument'),
    place: {
      name: str(place.name, 'radiation.place.name'),
      mission: str(place.mission, 'radiation.place.mission'),
      coordinates: [coords[0], coords[1]],
      elevation_m: nullableNum(place.elevation_m ?? null, 'radiation.place.elevation_m'),
    },
    window: {
      utc_start: str(win.utc_start, 'radiation.window.utc_start'),
      utc_stop: str(win.utc_stop, 'radiation.window.utc_stop'),
      note: str(win.note, 'radiation.window.note'),
    },
    measurements: list(r.measurements, 'radiation.measurements').map((m, i) => {
      const item = rec(m, `radiation.measurements[${i}]`)
      return {
        id: str(item.id, `radiation.measurements[${i}].id`),
        label: str(item.label, `radiation.measurements[${i}].label`),
        value: num(item.value, `radiation.measurements[${i}].value`),
        uncertainty: nullableNum(item.uncertainty, `radiation.measurements[${i}].uncertainty`),
        unit: str(item.unit, `radiation.measurements[${i}].unit`),
        source_ids: ids(item.source_ids, `radiation.measurements[${i}].source_ids`, known),
      }
    }),
    limits: list(r.limits, 'radiation.limits').map((l, i) => str(l, `radiation.limits[${i}]`)),
    source_ids: ids(r.source_ids, 'radiation.source_ids', known),
  }
  if (radiation.limits.length === 0) fail('radiation.limits')

  return {
    schema_version: version,
    scenario_id: str(doc.scenario_id, 'scenario_id'),
    weather,
    radiation,
    sources,
  }
}

export async function fetchEnvironment(
  apiUrl: string,
  scenarioId: string,
  signal: AbortSignal,
): Promise<EnvironmentContext> {
  const response = await fetch(
    `${apiUrl}/scenarios/${encodeURIComponent(scenarioId)}/environment`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Environment request failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  signal.throwIfAborted()
  return parseEnvironment(data)
}

/** "2022-07-06" from an ISO timestamp, or an em dash when the sol has no data. */
export function formatUtcDate(value: string | null): string {
  return value ? value.slice(0, 10) : '—'
}

/** Sols with no product for a parameter, collapsed into ranges like "497–499, 505". */
export function missingSols(sols: readonly WeatherSol[], key: 'pressure' | 'air_temperature') {
  const missing = sols.filter((s) => s[key] === null).map((s) => s.sol)
  const ranges: string[] = []
  for (let i = 0; i < missing.length;) {
    let j = i
    while (j + 1 < missing.length && missing[j + 1] === missing[j] + 1) j++
    ranges.push(i === j ? `${missing[i]}` : `${missing[i]}–${missing[j]}`)
    i = j + 1
  }
  return ranges.join(', ')
}

/** "0.210 ± 0.040 mGy/day" */
export function formatMeasurement(m: RadiationMeasurement): string {
  const digits = m.uncertainty !== null ? 3 : 2
  const value = m.value.toFixed(digits)
  return m.uncertainty !== null
    ? `${value} ± ${m.uncertainty.toFixed(digits)} ${m.unit}`
    : `${value} ${m.unit}`
}
