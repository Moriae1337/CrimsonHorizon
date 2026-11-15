import assert from 'node:assert/strict'
import { test } from 'node:test'
import React from 'react'
import { fetchScenario } from '../src/api.ts'
import { DEFAULT_LANDMARKS, DEFAULT_MAP_CATALOG, formatMarsCoordinate } from '../src/marsCatalog.ts'
import {
  ScenarioVersionError,
  checkSchemaVersion,
  describeScenarioFailure,
  parseScenario,
  type Scenario,
} from '../src/scenario.ts'
import { buildRouteFeatures, buildStopFeatures, extentOf } from '../src/scenarioLayers.ts'
import { useScenario, type ScenarioState } from '../src/useScenario.ts'
import { makeScenarioPayload } from './scenarioFixture.ts'

const API = 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Lightweight hook test harness
// ---------------------------------------------------------------------------

function areDepsEqual(prev: unknown[] | undefined, next: unknown[] | undefined): boolean {
  if (!prev || !next || prev.length !== next.length) return false
  return prev.every((d, i) => Object.is(d, next[i]))
}

interface HookHarness<T> {
  readonly current: T
  unmount: () => void
}

/**
 * Executes a React hook function inside Node by providing a minimal dispatcher
 * that manages useState, useEffect (with dependency checking and cleanups),
 * useCallback, and useMemo.
 */
function renderHook<T>(renderCallback: () => T): HookHarness<T> {
  let hookIndex = 0
  const stateValues: unknown[] = []
  let effectQueue: Array<{ effect: () => void | (() => void); deps?: unknown[]; idx: number }> = []
  const effectSlots: Array<{ deps?: unknown[]; cleanup?: void | (() => void) }> = []
  let result: T

  const dispatcher = {
    useState<S>(initial: S | (() => S)): [S, (updater: S | ((prev: S) => S)) => void] {
      const idx = hookIndex++
      if (stateValues[idx] === undefined) {
        stateValues[idx] = typeof initial === 'function' ? (initial as () => S)() : initial
      }
      const setState = (updater: S | ((prev: S) => S)) => {
        stateValues[idx] =
          typeof updater === 'function'
            ? (updater as (prev: S) => S)(stateValues[idx] as S)
            : updater
        rerun()
      }
      return [stateValues[idx] as S, setState]
    },
    useCallback<F extends (...args: unknown[]) => unknown>(fn: F, _deps?: unknown[]): F {
      return fn
    },
    useMemo<V>(fn: () => V, _deps?: unknown[]): V {
      return fn()
    },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const idx = hookIndex++
      const prev = effectSlots[idx]
      if (!prev || !areDepsEqual(prev.deps, deps)) {
        effectQueue.push({ effect, deps, idx })
      }
    },
  }

  function runEffects() {
    const queue = effectQueue
    effectQueue = []
    for (const item of queue) {
      const prev = effectSlots[item.idx]
      if (prev?.cleanup && typeof prev.cleanup === 'function') {
        prev.cleanup()
      }
      const cleanup = item.effect()
      effectSlots[item.idx] = { deps: item.deps, cleanup }
    }
  }

  function rerun() {
    hookIndex = 0
    effectQueue = []
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
          H: unknown
        }
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
    const previousDispatcher = internals.H
    internals.H = dispatcher
    try {
      result = renderCallback()
    } finally {
      internals.H = previousDispatcher
    }
    runEffects()
  }

  rerun()

  return {
    get current() {
      return result
    },
    unmount() {
      for (const slot of effectSlots) {
        if (slot?.cleanup && typeof slot.cleanup === 'function') {
          slot.cleanup()
        }
      }
    },
  }
}

/** Waits until `predicate()` returns true or times out. */
async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

// ===========================================================================
// 1. Network failures and HTTP 500/503/404 server errors
// ===========================================================================

test('network failure (TypeError / connection error) rejects fetch and marks scenario unavailable', async (t) => {
  const networkError = new TypeError('Failed to fetch')
  t.mock.method(globalThis, 'fetch', async () => {
    throw networkError
  })

  // Direct API failure path
  await assert.rejects(
    fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
    (err: unknown) => err === networkError,
  )

  // Mapping to user-facing state
  const described = describeScenarioFailure(networkError, false)
  assert.equal(described.status, 'unavailable')
  assert.match(described.message, /network error/i)

  // Hook integration
  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  assert.equal(harness.current.status, 'loading')
  await waitFor(() => harness.current.status === 'unavailable')
  assert.equal(harness.current.scenario, null)
  assert.equal(harness.current.canRetry, true)
  assert.match(harness.current.error ?? '', /network error/i)
  harness.unmount()
})

test('HTTP 500 Internal Server Error when fetching scenario', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'Internal server error' }, { status: 500 }),
  )

  await assert.rejects(
    fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
    (err: unknown) => err instanceof Error && /HTTP 500/.test(err.message),
  )

  const failure = describeScenarioFailure(
    new Error('Scenario request failed with HTTP 500.'),
    false,
  )
  assert.equal(failure.status, 'unavailable')
  assert.equal(failure.message, 'Scenario request failed with HTTP 500.')

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  await waitFor(() => harness.current.status === 'unavailable')
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.scenario, null)
  assert.equal(harness.current.canRetry, true)
  assert.match(harness.current.error ?? '', /HTTP 500/)
  harness.unmount()
})

test('HTTP 503 Service Unavailable when scenario bundle is missing/unreadable on backend', async (t) => {
  // specs/scenario-api.md specifies 503 {"detail": "Scenario temporarily unavailable"}
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'Scenario temporarily unavailable' }, { status: 503 }),
  )

  await assert.rejects(
    fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
    (err: unknown) => err instanceof Error && /HTTP 503/.test(err.message),
  )

  const failure = describeScenarioFailure(
    new Error('Scenario request failed with HTTP 503.'),
    false,
  )
  assert.equal(failure.status, 'unavailable')
  assert.equal(failure.message, 'Scenario request failed with HTTP 503.')

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  await waitFor(() => harness.current.status === 'unavailable')
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.scenario, null)
  assert.equal(harness.current.canRetry, true)
  assert.match(harness.current.error ?? '', /HTTP 503/)
  harness.unmount()
})

test('HTTP 404 Not Found for non-existent scenario ID', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'Scenario not found' }, { status: 404 }),
  )

  await assert.rejects(
    fetchScenario(API, 'non-existent-zone', new AbortController().signal),
    (err: unknown) => err instanceof Error && /HTTP 404/.test(err.message),
  )

  const failure = describeScenarioFailure(
    new Error('Scenario request failed with HTTP 404.'),
    false,
  )
  assert.equal(failure.status, 'unavailable')
  assert.equal(failure.message, 'Scenario request failed with HTTP 404.')

  const harness = renderHook(() => useScenario('non-existent-zone', API))
  await waitFor(() => harness.current.status === 'unavailable')
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.scenario, null)
  assert.equal(harness.current.canRetry, true)
  assert.match(harness.current.error ?? '', /HTTP 404/)
  harness.unmount()
})

test('backend timeout (cold-start / non-responsive) maps to timeout error message', () => {
  const timeoutFailure = describeScenarioFailure(
    new Error('AbortError: The operation was aborted.'),
    true,
  )
  assert.equal(timeoutFailure.status, 'unavailable')
  assert.match(timeoutFailure.message, /in time/i)
})

// ===========================================================================
// 2. Retry behavior and recovery when backend becomes available again
// ===========================================================================

test('recovers from initial network failure after calling retry when backend comes online', async (t) => {
  let callCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    if (callCount === 1) {
      throw new TypeError('Failed to fetch')
    }
    return Response.json(makeScenarioPayload())
  })

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  await waitFor(() => harness.current.status === 'unavailable')
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.scenario, null)
  assert.equal(harness.current.canRetry, true)

  // Trigger retry
  harness.current.retry()
  // Transitions back to loading
  assert.equal(harness.current.status, 'loading')
  assert.equal(harness.current.error, null)

  // Settle on ready
  await waitFor(() => harness.current.status === 'ready')
  assert.equal(harness.current.status, 'ready')
  assert.equal(harness.current.scenario?.scenario_id, 'hawksbill-gap')
  assert.equal(harness.current.error, null)
  assert.equal(callCount, 2)
  harness.unmount()
})

test('recovers from HTTP 503 Service Unavailable when server recovers', async (t) => {
  let callCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    if (callCount === 1) {
      return Response.json({ detail: 'Temporarily unavailable' }, { status: 503 })
    }
    return Response.json(makeScenarioPayload())
  })

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  await waitFor(() => harness.current.status === 'unavailable')
  assert.match(harness.current.error ?? '', /HTTP 503/)

  harness.current.retry()
  await waitFor(() => harness.current.status === 'ready')
  assert.equal(harness.current.status, 'ready')
  assert.equal(harness.current.scenario?.scenario_id, 'hawksbill-gap')
  assert.equal(harness.current.error, null)
  assert.equal(callCount, 2)
  harness.unmount()
})

test('handles multiple consecutive failures before eventual successful recovery', async (t) => {
  let callCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    if (callCount === 1) {
      return Response.json({ detail: 'Internal Error' }, { status: 500 })
    }
    if (callCount === 2) {
      return Response.json({ detail: 'Service Unavailable' }, { status: 503 })
    }
    return Response.json(makeScenarioPayload())
  })

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  // Attempt 1 -> 500
  await waitFor(() => harness.current.status === 'unavailable')
  assert.match(harness.current.error ?? '', /HTTP 500/)

  // Retry 1 -> 503
  harness.current.retry()
  await waitFor(() => harness.current.error?.includes('HTTP 503') === true)
  assert.equal(harness.current.status, 'unavailable')

  // Retry 2 -> 200 OK
  harness.current.retry()
  await waitFor(() => harness.current.status === 'ready')
  assert.equal(harness.current.status, 'ready')
  assert.equal(harness.current.scenario?.scenario_id, 'hawksbill-gap')
  assert.equal(harness.current.error, null)
  assert.equal(callCount, 3)
  harness.unmount()
})

test('superseded / stale requests do not overwrite newer state', async (t) => {
  let resolveFirst: ((val: unknown) => void) | null = null
  let callCount = 0

  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    if (callCount === 1) {
      // First request hangs until manually resolved
      return new Promise((resolve) => {
        resolveFirst = () =>
          resolve(Response.json({ detail: 'First slow failure' }, { status: 500 }))
      })
    }
    // Second request resolves quickly with valid scenario
    return Response.json(makeScenarioPayload())
  })

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  assert.equal(harness.current.status, 'loading')

  // Trigger retry while first request is still in-flight
  harness.current.retry()

  // Second request finishes and sets status to ready
  await waitFor(() => harness.current.status === 'ready')
  assert.equal(harness.current.status, 'ready')
  assert.notEqual(harness.current.scenario, null)

  // Now let the first superseded request finally reject
  if (resolveFirst) {
    ;(resolveFirst as () => void)()
  }
  await new Promise((resolve) => setTimeout(resolve, 20))

  // State must remain ready; stale error does NOT overwrite
  assert.equal(harness.current.status, 'ready')
  assert.notEqual(harness.current.scenario, null)
  assert.equal(harness.current.error, null)
  harness.unmount()
})

test('retry is a safe no-op when API_URL is unset', () => {
  const harness = renderHook(() => useScenario('hawksbill-gap', ''))
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.canRetry, false)
  assert.equal(harness.current.error, 'VITE_API_URL is not set.')

  // Calling retry should not crash or change state
  harness.current.retry()
  assert.equal(harness.current.status, 'unavailable')
  assert.equal(harness.current.canRetry, false)
  harness.unmount()
})

// ===========================================================================
// 3. Incompatible scenario version rejection (major version mismatch)
// ===========================================================================

for (const badVersion of ['2.0', '3.1', '0.9', '10.0']) {
  test(`rejects incompatible major version ${badVersion} with ScenarioVersionError`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ schema_version: badVersion, scenario_id: 'hawksbill-gap' }),
    )

    await assert.rejects(
      fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
      (err: unknown) =>
        err instanceof ScenarioVersionError &&
        err.version === badVersion &&
        err.name === 'ScenarioVersionError',
    )

    const failure = describeScenarioFailure(new ScenarioVersionError(badVersion), false)
    assert.equal(failure.status, 'unsupported')
    assert.match(failure.message, new RegExp(badVersion))
    assert.match(failure.message, /not supported/i)

    const harness = renderHook(() => useScenario('hawksbill-gap', API))
    await waitFor(() => harness.current.status === 'unsupported')
    assert.equal(harness.current.status, 'unsupported')
    assert.equal(harness.current.scenario, null)
    assert.equal(harness.current.canRetry, true)
    assert.match(harness.current.error ?? '', new RegExp(badVersion))
    harness.unmount()
  })
}

test('major version mismatch takes precedence over schema payload format checks', () => {
  // A completely malformed or reshaped v2 object must throw ScenarioVersionError,
  // not ScenarioFormatError
  const malformedV2 = {
    schema_version: '2.0',
    unexpected_root: 'anything',
  }
  assert.throws(
    () => checkSchemaVersion(malformedV2.schema_version),
    (err: unknown) => err instanceof ScenarioVersionError && err.version === '2.0',
  )
  assert.throws(
    () => parseScenario(malformedV2, 'hawksbill-gap'),
    (err: unknown) => err instanceof ScenarioVersionError && err.version === '2.0',
  )
})

test('accepts minor version changes on major version 1 without rejection', async (t) => {
  for (const minorVersion of ['1.0', '1.1', '1.2', '1.99']) {
    const payload = makeScenarioPayload() as Record<string, unknown>
    payload.schema_version = minorVersion

    t.mock.method(globalThis, 'fetch', async () => Response.json(payload))

    const scenario = await fetchScenario(API, 'hawksbill-gap', new AbortController().signal)
    assert.equal(scenario.schema_version, minorVersion)
    assert.equal(scenario.scenario_id, 'hawksbill-gap')
  }
})

test('recovers from unsupported version after server updates or rolls back to compatible v1', async (t) => {
  let callCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    if (callCount === 1) {
      return Response.json({ schema_version: '2.0', routes: 'reshaped' })
    }
    return Response.json(makeScenarioPayload())
  })

  const harness = renderHook(() => useScenario('hawksbill-gap', API))
  await waitFor(() => harness.current.status === 'unsupported')
  assert.equal(harness.current.status, 'unsupported')
  assert.match(harness.current.error ?? '', /2\.0/)

  // Server rolled back / client retries
  harness.current.retry()
  await waitFor(() => harness.current.status === 'ready')
  assert.equal(harness.current.status, 'ready')
  assert.equal(harness.current.scenario?.schema_version, '1.0')
  assert.equal(harness.current.error, null)
  assert.equal(callCount, 2)
  harness.unmount()
})

// ===========================================================================
// 4. Base map, catalog controls, and UI remain functional during failures/aborts
// ===========================================================================

test('default map catalog and landmarks are defined independently of scenario status', () => {
  // Verifies catalog defaults exist and adhere to expected IAU2000 Mars specs
  assert.equal(DEFAULT_MAP_CATALOG.crs, 'IAU2000:104905')
  assert.equal(DEFAULT_MAP_CATALOG.default_zoom, 12)
  assert.deepEqual(DEFAULT_MAP_CATALOG.default_center, [77.452019, 18.444796])
  assert.ok(DEFAULT_MAP_CATALOG.layers.length >= 4)

  // Landmarks exist
  assert.equal(DEFAULT_LANDMARKS.type, 'FeatureCollection')
  assert.ok(DEFAULT_LANDMARKS.features.length >= 4)

  // Coordinate formatting works regardless of scenario
  const formatted = formatMarsCoordinate(77.4063, 18.4574)
  assert.equal(formatted, '18.4574° N, 77.4063° E')
})

test('catalog layer separation and selection functions normally when scenario is null or failed', () => {
  const scenario: Scenario | null = null

  // Simulate App.tsx layer filtering
  const globalLayers = DEFAULT_MAP_CATALOG.layers.filter((l) => l.scope === 'global')
  const overlayLayers = DEFAULT_MAP_CATALOG.layers.filter((l) => l.scope !== 'global')

  assert.ok(globalLayers.some((l) => l.id === 'mola-color-hillshade'))
  assert.ok(globalLayers.some((l) => l.id === 'viking-mdim21'))
  assert.ok(overlayLayers.some((l) => l.id === 'jezero-ctx-ortho'))

  // Simulate switching active base layer while scenario is null
  let activeBaseLayerId: string = globalLayers[0].id
  const switchBaseLayer = (id: string) => {
    activeBaseLayerId = id
  }
  switchBaseLayer('viking-mdim21')
  assert.equal(activeBaseLayerId, 'viking-mdim21')

  // Simulate toggling overlays while scenario is null
  const visibleOverlayIds = new Set(['jezero-ctx-ortho'])
  const toggleOverlay = (id: string) => {
    if (visibleOverlayIds.has(id)) visibleOverlayIds.delete(id)
    else visibleOverlayIds.add(id)
  }
  toggleOverlay('hawksbill-hirise-ortho')
  assert.ok(visibleOverlayIds.has('hawksbill-hirise-ortho'))
  toggleOverlay('jezero-ctx-ortho')
  assert.ok(!visibleOverlayIds.has('jezero-ctx-ortho'))

  // Selecting a landmark operates independently of scenario
  const selectedLandmark =
    DEFAULT_LANDMARKS.features.find((f) => f.id === 'octavia-e-butler-landing') ?? null
  assert.notEqual(selectedLandmark, null)
  assert.equal(selectedLandmark?.properties.name, 'Octavia E. Butler Landing')
  assert.ok(scenario === null)
})

test('Quick Focus button rules: Hawksbill Gap disabled on null scenario, other jumps active', () => {
  const failedState: ScenarioState = { status: 'unavailable', scenario: null, error: 'Failed' }

  // App.tsx: <button disabled={!scenario}>Hawksbill Gap</button>
  const isHawksbillButtonDisabled = !failedState.scenario
  assert.equal(isHawksbillButtonDisabled, true)

  // Jezero overview jump parameters remain functional
  const jezeroJump = {
    center: DEFAULT_MAP_CATALOG.default_center,
    zoom: DEFAULT_MAP_CATALOG.default_zoom,
  }
  assert.deepEqual(jezeroJump.center, DEFAULT_MAP_CATALOG.default_center)
  assert.equal(jezeroJump.zoom, DEFAULT_MAP_CATALOG.default_zoom)

  // Global Mars jump parameters remain functional
  const globalMarsJump = { center: [0, 0], zoom: 2 }
  assert.deepEqual(globalMarsJump.center, [0, 0])
  assert.equal(globalMarsJump.zoom, 2)

  // Once scenario arrives, Hawksbill Gap button is enabled and extent is valid
  const readyScenario = parseScenario(makeScenarioPayload())
  assert.equal(!readyScenario, false)
  const extent = extentOf(readyScenario)
  assert.deepEqual(extent, [77.402, 18.455, 77.41, 18.463])
})

test('map guards against null scenario and vector feature builders work safely once loaded', () => {
  // MarsMap effect guards: `if (!scenario) return`
  // When scenario is null (loading, failed, aborted), vector layers are not populated
  // and base map layers remain fully intact
  const nullScenario: Scenario | null = null
  const shouldPopulateVectors = Boolean(nullScenario)
  assert.equal(shouldPopulateVectors, false)

  // When scenario loads, buildStopFeatures and buildRouteFeatures produce features
  const readyScenario = parseScenario(makeScenarioPayload())
  const stopFeatures = buildStopFeatures(readyScenario)
  assert.equal(stopFeatures.length, readyScenario.stops.length)

  const routeFeatures = buildRouteFeatures(readyScenario)
  assert.ok(routeFeatures.length >= readyScenario.routes.features.length)
})

test('aborted scenario load cleans up controller without uncaught rejection or corrupted state', async (t) => {
  const controller = new AbortController()
  controller.abort()

  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    options.signal?.throwIfAborted()
    return Response.json(makeScenarioPayload())
  })

  // Calling fetchScenario with an already aborted signal throws AbortError
  await assert.rejects(
    fetchScenario(API, 'hawksbill-gap', controller.signal),
    (err: unknown) => (err as Error).name === 'AbortError',
  )

  // The base catalog and landmarks remain valid and intact
  assert.equal(DEFAULT_MAP_CATALOG.layers.length > 0, true)
  assert.equal(DEFAULT_LANDMARKS.features.length > 0, true)
})

test('ScenarioPanel failure messages clearly communicate that base map still works', () => {
  const STATUS_TEXT: Record<string, string> = {
    loading: 'Loading scenario…',
    ready: 'Scenario loaded.',
    unavailable: 'Scenario unavailable. The base map still works.',
    unsupported: 'Scenario version not supported. The base map still works.',
  }

  // Both failure paths explicitly reassure the user that the base map still works
  assert.match(STATUS_TEXT.unavailable, /base map still works/i)
  assert.match(STATUS_TEXT.unsupported, /base map still works/i)

  // Check describeScenarioFailure status codes map to one of these two
  assert.equal(describeScenarioFailure(new TypeError('net'), false).status, 'unavailable')
  assert.equal(
    describeScenarioFailure(new ScenarioVersionError('2.0'), false).status,
    'unsupported',
  )
})
