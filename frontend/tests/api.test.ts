import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkHealth } from '../src/api.ts'

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
  await assert.rejects(checkHealth('http://localhost:8000', new AbortController().signal), /HTTP 503/)
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
  t.mock.method(globalThis, 'fetch', async () => { throw error })
  await assert.rejects(checkHealth('http://localhost:8000', new AbortController().signal), error)
})
