import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchScenario } from '../src/api.ts'
import {
  ScenarioFormatError,
  ScenarioVersionError,
  describeScenarioFailure,
  formatMeters,
  formatSols,
  parseScenario,
} from '../src/scenario.ts'
import { makeScenarioPayload } from './scenarioFixture.ts'

const API = 'http://localhost:8000'

type Payload = Record<string, any>

function withPayload(change: (payload: Payload) => void): Payload {
  const payload = makeScenarioPayload() as Payload
  change(payload)
  return payload
}

test('loads a valid scenario from the API', async (t) => {
  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, `${API}/scenarios/hawksbill-gap`)
    assert.equal(options.signal, signal)
    return Response.json(makeScenarioPayload())
  })
  const scenario = await fetchScenario(API, 'hawksbill-gap', signal)
  assert.equal(scenario.scenario_id, 'hawksbill-gap')
  assert.deepEqual(
    scenario.route_options.map((o) => o.id),
    ['A', 'B'],
  )
  assert.equal(scenario.routes.features.length, 4)
  assert.equal(scenario.routes.features[1].properties.proposed, true)
  assert.deepEqual(scenario.start.coordinates, [77.4063, 18.4574])
  assert.deepEqual(
    scenario.rover_track.features[0].geometry.coordinates[0],
    [77.4063, 18.4574, -2535.5],
  )
})

test('accepts any MINOR version of MAJOR 1 and ignores unknown fields', () => {
  const scenario = parseScenario(
    withPayload((p) => {
      p.schema_version = '1.7'
      p.future_section = [{ anything: true }]
      p.routes.features[0].properties.surface = 'sand'
      p.extent.note = 'extra'
    }),
  )
  assert.equal(scenario.schema_version, '1.7')
  assert.equal('future_section' in scenario, false)
  assert.equal('surface' in scenario.routes.features[0].properties, false)
})

for (const version of ['2.0', '0.9', '10.0']) {
  test(`rejects schema_version ${version} as unsupported`, async (t) => {
    // A different MAJOR may change the shape entirely; the version check comes first.
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ schema_version: version, routes: 'reshaped' }),
    )
    await assert.rejects(
      fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
      (err: unknown) => err instanceof ScenarioVersionError && err.version === version,
    )
  })
}

for (const version of [undefined, 1, '1', 'v1.0', '1.0.0']) {
  test(`rejects malformed schema_version ${JSON.stringify(version)} as invalid`, () => {
    assert.throws(
      () => parseScenario(withPayload((p) => (p.schema_version = version))),
      ScenarioFormatError,
    )
  })
}

const malformedCoordinates: Array<[string, (p: Payload) => void]> = [
  ['a one-number position', (p) => (p.start.coordinates = [77.4])],
  ['a four-number position', (p) => (p.start.coordinates = [77.4, 18.4, -2500, 1])],
  ['a string coordinate', (p) => (p.stops[0].coordinates = ['77.4', 18.4])],
  ['a null elevation', (p) => (p.routes.features[0].geometry.coordinates[0][2] = null)],
  ['a latitude-first pair', (p) => (p.routes.features[0].geometry.coordinates[1] = [18.4, 277.4])],
  [
    'an out-of-range longitude',
    (p) => (p.rover_track.features[0].geometry.coordinates[0][0] = 200),
  ],
  ['a single-vertex line', (p) => (p.routes.features[0].geometry.coordinates = [[77.4, 18.4]])],
  ['a non-line geometry', (p) => (p.routes.features[0].geometry.type = 'Point')],
]

for (const [name, change] of malformedCoordinates) {
  test(`rejects ${name}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(withPayload(change)))
    await assert.rejects(
      fetchScenario(API, 'hawksbill-gap', new AbortController().signal),
      ScenarioFormatError,
    )
  })
}

const malformedFields: Array<[string, (p: Payload) => void]> = [
  ['a non-kebab feature id', (p) => (p.routes.features[0].id = 'A_outbound')],
  ['duplicate feature ids', (p) => (p.routes.features[1].id = 'a-outbound-1')],
  ['an unknown route option', (p) => (p.routes.features[0].properties.option = 'C')],
  ['an unknown leg', (p) => (p.routes.features[0].properties.leg = 'sideways')],
  ['an unknown kind', (p) => (p.routes.features[0].properties.kind = 'planned')],
  ['a proposed historical piece', (p) => (p.routes.features[0].properties.proposed = true)],
  ['a connector not marked proposed', (p) => (p.routes.features[1].properties.proposed = false)],
  ['a missing route length', (p) => delete p.routes.features[0].properties.length_m],
  ['a negative route length', (p) => (p.routes.features[0].properties.length_m = -1)],
  ['an unresolved source id', (p) => (p.routes.features[0].properties.source_ids = ['nope'])],
  ['empty source ids', (p) => (p.rover_track.features[0].properties.source_ids = [])],
  ['an unknown stop in an option', (p) => (p.route_options[0].stop_ids = ['nowhere'])],
  ['a missing route option length', (p) => (p.route_options[1].round_trip_m = null)],
  ['an inverted extent', (p) => (p.extent.lon_min = 78)],
  ['a missing pending section list', (p) => delete p.evidence],
  ['a different scenario id', (p) => (p.scenario_id = 'other-place')],
]

for (const [name, change] of malformedFields) {
  test(`rejects ${name}`, () => {
    assert.throws(() => parseScenario(withPayload(change), 'hawksbill-gap'), ScenarioFormatError)
  })
}

test('reports HTTP failures such as an unknown scenario', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ detail: 'Not Found' }, { status: 404 }),
  )
  await assert.rejects(
    fetchScenario(API, 'nowhere', new AbortController().signal),
    (err: unknown) => err instanceof Error && /HTTP 404/.test(err.message),
  )
})

test('an abort during the request leaves no result behind', async (t) => {
  const controller = new AbortController()
  let resolveBody: (value: unknown) => void = () => {}
  t.mock.method(globalThis, 'fetch', async () => {
    // The response arrives, but its body only resolves after the caller aborted.
    return {
      ok: true,
      status: 200,
      json: () => new Promise((resolve) => (resolveBody = resolve)),
    } as unknown as Response
  })
  const pending = fetchScenario(API, 'hawksbill-gap', controller.signal)
  await new Promise((resolve) => setImmediate(resolve))
  controller.abort()
  resolveBody(makeScenarioPayload())
  await assert.rejects(pending, (err: unknown) => (err as Error).name === 'AbortError')
})

test('an abort before the request rejects with AbortError', async (t) => {
  const controller = new AbortController()
  controller.abort()
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    options.signal?.throwIfAborted()
    return Response.json(makeScenarioPayload())
  })
  await assert.rejects(
    fetchScenario(API, 'hawksbill-gap', controller.signal),
    (err: unknown) => (err as Error).name === 'AbortError',
  )
})

test('formats legend lengths and sol ranges', () => {
  assert.equal(formatMeters(258.01), '258 m')
  assert.equal(formatMeters(345.28), '345 m')
  assert.equal(formatSols([449, 455, 456, 460, 461]), 'sols 449–461')
  assert.equal(formatSols([460]), 'sol 460')
  assert.equal(formatSols([]), 'no sols')
})

test('maps load failures to unsupported or unavailable states', () => {
  assert.equal(
    describeScenarioFailure(new ScenarioVersionError('2.0'), false).status,
    'unsupported',
  )
  assert.equal(describeScenarioFailure(new ScenarioFormatError('bad'), false).status, 'unavailable')
  assert.match(describeScenarioFailure(new Error('x'), true).message, /in time/)
  assert.match(describeScenarioFailure(new TypeError('Failed'), false).message, /network/)
})
