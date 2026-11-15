// 3D terrain sites and the route planner API.
// Pure helpers only (no three.js), so Node's test runner can load this module.

export type SiteId = 'columbia-hills' | 'hawksbill-gap' | 'jezero-crater'
export const SITE_IDS: readonly SiteId[] = ['columbia-hills', 'hawksbill-gap', 'jezero-crater']

export interface SiteSource {
  label: string
  url: string
}

export interface TerrainPackage {
  site_id: SiteId
  created_at?: string
  name: string
  region: string
  center_lon_lat: [number, number]
  radius_m: number
  bounds_m: { left: number; right: number; bottom: number; top: number }
  cell_size_m: number
  shape: [number, number]
  elevation: {
    encoding: 'uint16-le-base64'
    offset_m: number
    scale_m: number
    nodata: number
    data: string
    min_m: number
    max_m: number
    valid_fraction: number
  }
  texture: { path: string; cell_size_m: number; shape: [number, number] }
  sources: SiteSource[]
  notes: string[]
}

/** Decoded grid: row-major, row 0 is the northern edge. NaN marks NoData. */
export interface TerrainGrid {
  rows: number
  cols: number
  cell: number
  left: number
  top: number
  z: Float32Array
  min: number
  max: number
}

export type RouteId = 'shortest' | 'lower_risk'

// Palette: Accent = nominal / lower-risk route,
// Secondary = alternative / shortest route.
export const ROUTE_COLORS: Record<RouteId, string> = {
  lower_risk: '#8F5A53',
  shortest: '#EBEBEB',
}

export interface RouteMetrics {
  length_m: number
  length_3d_m: number
  ascent_m: number
  descent_m: number
  max_grade_deg: number
  mean_surface_slope_deg: number
  max_surface_slope_deg: number
  walk_minutes: number
  grade_class_m: Record<string, number>
}

export interface ProfileSample {
  d: number
  z: number | null
  x: number
  y: number
  slope: number | null
}

export interface PlannedRoute {
  id: RouteId
  metrics: RouteMetrics
  path_xy: [number, number][]
  path_lon_lat: [number, number][]
  profile: ProfileSample[]
}

export interface RoutePlan {
  max_grade_deg: number
  waypoints_xy: [number, number][]
  routes: PlannedRoute[]
  model: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseTerrainPackage(data: unknown, siteId: SiteId): TerrainPackage {
  if (
    !isRecord(data) ||
    data.version !== 1 ||
    data.site_id !== siteId ||
    typeof data.name !== 'string' ||
    !Array.isArray(data.shape) ||
    !isRecord(data.elevation) ||
    data.elevation.encoding !== 'uint16-le-base64' ||
    typeof data.elevation.data !== 'string' ||
    !isRecord(data.bounds_m) ||
    !isNum(data.cell_size_m) ||
    !isRecord(data.texture)
  ) {
    throw new Error('Terrain package has an unexpected format.')
  }
  return data as unknown as TerrainPackage
}

export function decodeTerrain(pkg: TerrainPackage): TerrainGrid {
  const [rows, cols] = pkg.shape
  const { offset_m, scale_m, nodata, data } = pkg.elevation
  const bin = atob(data)
  if (bin.length !== rows * cols * 2) throw new Error('Terrain grid size mismatch.')
  const z = new Float32Array(rows * cols)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < rows * cols; i++) {
    const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)
    if (v === nodata) {
      z[i] = Number.NaN
    } else {
      const e = offset_m + v * scale_m
      z[i] = e
      if (e < min) min = e
      if (e > max) max = e
    }
  }
  return {
    rows,
    cols,
    cell: pkg.cell_size_m,
    left: pkg.bounds_m.left,
    top: pkg.bounds_m.top,
    z,
    min,
    max,
  }
}

/** Bilinear elevation at local (x, y) metres; NaN outside or over NoData. */
export function sampleElevation(grid: TerrainGrid, x: number, y: number): number {
  const fc = (x - grid.left) / grid.cell - 0.5
  const fr = (grid.top - y) / grid.cell - 0.5
  if (fc < -0.5 || fr < -0.5 || fc > grid.cols - 0.5 || fr > grid.rows - 0.5) return Number.NaN
  const c0 = Math.max(0, Math.min(grid.cols - 2, Math.floor(fc)))
  const r0 = Math.max(0, Math.min(grid.rows - 2, Math.floor(fr)))
  const tc = Math.max(0, Math.min(1, fc - c0))
  const tr = Math.max(0, Math.min(1, fr - r0))
  const i = r0 * grid.cols + c0
  const top = grid.z[i] + (grid.z[i + 1] - grid.z[i]) * tc
  const bottom = grid.z[i + grid.cols] + (grid.z[i + grid.cols + 1] - grid.z[i + grid.cols]) * tc
  return top + (bottom - top) * tr
}

/** Spherical azimuthal-equidistant forward projection (matches the package CRS). */
export function aeqdForward(
  lon: number,
  lat: number,
  lon0: number,
  lat0: number,
  radius: number,
): [number, number] {
  const rad = Math.PI / 180
  const phi = lat * rad
  const phi0 = lat0 * rad
  const dl = (lon - lon0) * rad
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dl)
  const c = Math.acos(Math.max(-1, Math.min(1, cosC)))
  const k = c < 1e-12 ? 1 : c / Math.sin(c)
  return [
    radius * k * Math.cos(phi) * Math.sin(dl),
    radius * k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dl)),
  ]
}

export function aeqdInverse(
  x: number,
  y: number,
  lon0: number,
  lat0: number,
  radius: number,
): [number, number] {
  const rad = Math.PI / 180
  const phi0 = lat0 * rad
  const rho = Math.hypot(x, y)
  if (rho < 1e-9) return [lon0, lat0]
  const c = rho / radius
  const phi = Math.asin(Math.cos(c) * Math.sin(phi0) + (y * Math.sin(c) * Math.cos(phi0)) / rho)
  const lam =
    lon0 * rad +
    Math.atan2(
      x * Math.sin(c),
      rho * Math.cos(phi0) * Math.cos(c) - y * Math.sin(phi0) * Math.sin(c),
    )
  return [((((lam / rad + 180) % 360) + 360) % 360) - 180, phi / rad]
}

/** Point along a polyline at fraction t (0..1) of its 2D length, plus heading (rad). */
export function pointAlong(
  path: readonly [number, number][],
  t: number,
): { x: number; y: number; heading: number } {
  if (path.length === 0) return { x: 0, y: 0, heading: 0 }
  if (path.length === 1) return { x: path[0][0], y: path[0][1], heading: 0 }
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
    lengths.push(l)
    total += l
  }
  let target = Math.max(0, Math.min(1, t)) * total
  for (let i = 0; i < lengths.length; i++) {
    const [ax, ay] = path[i]
    const [bx, by] = path[i + 1]
    if (target <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : Math.min(1, target / lengths[i])
      return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, heading: Math.atan2(by - ay, bx - ax) }
    }
    target -= lengths[i]
  }
  const last = path[path.length - 1]
  return { x: last[0], y: last[1], heading: 0 }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes - h * 60)
  return `${h} h ${m.toString().padStart(2, '0')} min`
}

/** "Δ" helper for the comparison table: signed difference with unit. */
export function formatDelta(a: number, b: number, unit: string, digits = 1): string {
  const d = b - a
  if (Math.abs(d) < 10 ** -digits / 2) return '—'
  return `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(digits)}${unit === '°' ? '' : ' '}${unit}`
}

export function routesQuery(
  waypoints: readonly [number, number][],
  maxGradeDeg: number,
): URLSearchParams {
  if (waypoints.length < 2) throw new Error('A route needs a start and an end.')
  const fmt = (p: readonly [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`
  const params = new URLSearchParams({
    start: fmt(waypoints[0]),
    end: fmt(waypoints[waypoints.length - 1]),
    max_grade_deg: String(maxGradeDeg),
  })
  const stops = waypoints.slice(1, -1)
  if (stops.length > 0) params.set('stops', stops.map(fmt).join(';'))
  return params
}

export function parseRoutePlan(data: unknown): RoutePlan {
  if (
    !isRecord(data) ||
    !Array.isArray(data.routes) ||
    !data.routes.every(
      (r) =>
        isRecord(r) &&
        (r.id === 'shortest' || r.id === 'lower_risk') &&
        isRecord(r.metrics) &&
        Array.isArray(r.path_xy) &&
        Array.isArray(r.profile),
    )
  ) {
    throw new Error('Route planner returned an unexpected response.')
  }
  return data as unknown as RoutePlan
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && typeof body.detail === 'string') return body.detail
  } catch {
    // fall through
  }
  return `HTTP ${response.status}`
}

export async function fetchTerrainPackage(
  apiUrl: string,
  siteId: SiteId,
  signal: AbortSignal,
): Promise<TerrainPackage> {
  const response = await fetch(`${apiUrl}/sites/${siteId}/terrain`, { signal })
  if (!response.ok) throw new Error(`Terrain request failed: ${await errorDetail(response)}.`)
  return parseTerrainPackage(await response.json(), siteId)
}

export async function fetchRoutePlan(
  apiUrl: string,
  siteId: SiteId,
  waypoints: readonly [number, number][],
  maxGradeDeg: number,
  signal: AbortSignal,
): Promise<RoutePlan> {
  const query = routesQuery(waypoints, maxGradeDeg)
  const response = await fetch(`${apiUrl}/sites/${siteId}/routes?${query}`, { signal })
  if (!response.ok) throw new Error(await errorDetail(response))
  return parseRoutePlan(await response.json())
}

/** Texture URL versioned by the package build, so a cached image never pairs with a newer grid. */
export function textureUrl(
  apiUrl: string,
  pkg: Pick<TerrainPackage, 'site_id' | 'created_at'>,
): string {
  const version = pkg.created_at ? `?v=${encodeURIComponent(pkg.created_at)}` : ''
  return `${apiUrl}/sites/${pkg.site_id}/texture.jpg${version}`
}

// --- IAU nomenclature (globe labels) ---------------------------------------

export interface IauFeature {
  name: string
  type: string
  category: string
  lon: number
  lat: number
  diameter_km: number
  link: string
}

export async function fetchNomenclature(
  apiUrl: string,
  signal: AbortSignal,
): Promise<IauFeature[]> {
  const response = await fetch(`${apiUrl}/terrain/nomenclature`, { signal })
  if (!response.ok) throw new Error(`Nomenclature request failed with HTTP ${response.status}.`)
  const data: unknown = await response.json()
  if (!isRecord(data) || !Array.isArray(data.features)) {
    throw new Error('Nomenclature returned an unexpected response.')
  }
  return data.features.filter(
    (f): f is IauFeature =>
      isRecord(f) && typeof f.name === 'string' && isNum(f.lon) && isNum(f.lat),
  )
}

/**
 * Inserts a stop where it lengthens the straight-line A→…→B chain the least, so a
 * stop clicked anywhere lands between the waypoints it belongs between. Without an
 * end point yet, the stop is appended.
 */
export function insertStop(
  waypoints: readonly [number, number][],
  hasEnd: boolean,
  p: [number, number],
): [number, number][] {
  if (!hasEnd || waypoints.length < 2) return [...waypoints, p]
  const d = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  let best = 1
  let bestCost = Infinity
  for (let i = 1; i < waypoints.length; i++) {
    const cost = d(waypoints[i - 1], p) + d(p, waypoints[i]) - d(waypoints[i - 1], waypoints[i])
    if (cost < bestCost) {
      bestCost = cost
      best = i
    }
  }
  return [...waypoints.slice(0, best), p, ...waypoints.slice(best)]
}
