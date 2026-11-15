import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkHealth, fetchLandmarks, fetchMapCatalog } from '../src/api.ts'
import { DEFAULT_LANDMARKS, DEFAULT_MAP_CATALOG } from '../src/marsCatalog.ts'

test('accepts the backend health response', async (t) => {
  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:8000/health')
    assert.equal(options.signal, signal)
    return Response.json({ status: 'ok' })
  })
  await checkHealth('http://localhost:8000', signal)
})

test('reports HTTP failures', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  await assert.rejects(
    checkHealth('http://localhost:8000', new AbortController().signal),
    /HTTP 503/,
  )
})

for (const payload of [null, {}, { status: 'error' }, 'ok', [{ status: 'ok' }]]) {
  test(`rejects unexpected health response: ${JSON.stringify(payload)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(payload))
    await assert.rejects(
      checkHealth('http://localhost:8000', new AbortController().signal),
      /unexpected response/,
    )
  })
}

test('preserves network errors', async (t) => {
  const error = new TypeError('Failed to fetch')
  t.mock.method(globalThis, 'fetch', async () => {
    throw error
  })
  await assert.rejects(checkHealth('http://localhost:8000', new AbortController().signal), error)
})

test('fetches and validates the Mars map catalog', async (t) => {
  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:8000/terrain/layers')
    assert.equal(options.signal, signal)
    return Response.json(DEFAULT_MAP_CATALOG)
  })
  const catalog = await fetchMapCatalog('http://localhost:8000', signal)
  assert.equal(catalog.crs, 'IAU2000:104905')
  assert.equal(catalog.layers.length, DEFAULT_MAP_CATALOG.layers.length)
})

test('rejects malformed Mars map catalog payloads', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ crs: 'IAU2000:104905', layers: [] }),
  )
  await assert.rejects(
    fetchMapCatalog('http://localhost:8000', new AbortController().signal),
    /unexpected response/,
  )
})

test('fetches and validates Jezero GeoJSON landmarks', async (t) => {
  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:8000/terrain/landmarks')
    assert.equal(options.signal, signal)
    return Response.json(DEFAULT_LANDMARKS)
  })
  const landmarks = await fetchLandmarks('http://localhost:8000', signal)
  assert.equal(landmarks.type, 'FeatureCollection')
  assert.equal(landmarks.features.length, DEFAULT_LANDMARKS.features.length)
})

test('rejects malformed Jezero landmark payloads', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ type: 'Feature', features: [] }))
  await assert.rejects(
    fetchLandmarks('http://localhost:8000', new AbortController().signal),
    /unexpected response/,
  )
})
