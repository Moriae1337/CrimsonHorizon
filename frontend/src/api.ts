import type {
  MapCatalog,
  MapLayer,
  MarsLandmarkFeature,
  MarsLandmarksGeoJson,
} from './marsCatalog.ts'
import { parseScenario, type Scenario } from './scenario.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTupleOfNumbers(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  )
}

function isValidMapLayer(value: unknown): value is MapLayer {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.scope === 'global' || value.scope === 'regional' || value.scope === 'local') &&
    typeof value.resolution_m === 'number' &&
    typeof value.tile_url === 'string' &&
    (value.format === 'image/jpeg' || value.format === 'image/png') &&
    typeof value.min_zoom === 'number' &&
    typeof value.max_zoom === 'number' &&
    isTupleOfNumbers(value.extent, 4) &&
    typeof value.attribution === 'string' &&
    typeof value.source_url === 'string'
  )
}

function isValidLandmarkFeature(value: unknown): value is MarsLandmarkFeature {
  if (!isRecord(value) || value.type !== 'Feature' || typeof value.id !== 'string') {
    return false
  }
  if (!isRecord(value.geometry) || value.geometry.type !== 'Point') {
    return false
  }
  if (!isTupleOfNumbers(value.geometry.coordinates, 2)) {
    return false
  }
  if (!isRecord(value.properties)) {
    return false
  }
  return (
    typeof value.properties.name === 'string' &&
    typeof value.properties.category === 'string' &&
    typeof value.properties.summary === 'string' &&
    typeof value.properties.source === 'string'
  )
}

export async function checkHealth(apiUrl: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(`${apiUrl}/health`, { signal })
  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  if (!isRecord(data) || data.status !== 'ok') {
    throw new Error('Health check returned an unexpected response.')
  }
}

export async function fetchMapCatalog(apiUrl: string, signal: AbortSignal): Promise<MapCatalog> {
  const response = await fetch(`${apiUrl}/terrain/layers`, { signal })
  if (!response.ok) {
    throw new Error(`Map catalog request failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    typeof data.crs !== 'string' ||
    typeof data.radius_m !== 'number' ||
    !isTupleOfNumbers(data.default_center, 2) ||
    typeof data.default_zoom !== 'number' ||
    !Array.isArray(data.layers) ||
    data.layers.length === 0 ||
    !data.layers.every(isValidMapLayer)
  ) {
    throw new Error('Map catalog returned an unexpected response.')
  }
  return data as unknown as MapCatalog
}

export async function fetchLandmarks(
  apiUrl: string,
  signal: AbortSignal,
): Promise<MarsLandmarksGeoJson> {
  const response = await fetch(`${apiUrl}/terrain/landmarks`, { signal })
  if (!response.ok) {
    throw new Error(`Landmarks request failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  if (
    !isRecord(data) ||
    data.type !== 'FeatureCollection' ||
    !Array.isArray(data.features) ||
    !data.features.every(isValidLandmarkFeature)
  ) {
    throw new Error('Landmarks endpoint returned an unexpected response.')
  }
  return data as unknown as MarsLandmarksGeoJson
}

/**
 * Loads one prepared scenario (contract v1, specs/scenario-api.md). Rejects with
 * ScenarioVersionError for another MAJOR version, ScenarioFormatError for an invalid
 * payload, and an AbortError when `signal` aborts, even after the body arrived.
 */
export async function fetchScenario(
  apiUrl: string,
  scenarioId: string,
  signal: AbortSignal,
): Promise<Scenario> {
  const response = await fetch(`${apiUrl}/scenarios/${encodeURIComponent(scenarioId)}`, {
    signal,
  })
  if (!response.ok) {
    throw new Error(`Scenario request failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  signal.throwIfAborted()
  return parseScenario(data, scenarioId)
}
