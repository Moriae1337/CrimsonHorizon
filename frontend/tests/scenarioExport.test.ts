import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildScenarioGeoJson } from '../src/scenarioExport.ts'
import { parseScenario } from '../src/scenario.ts'
import { makeScenarioPayload } from './scenarioFixture.ts'

const payload = JSON.parse(
  readFileSync(new URL('../../backend/data/hawksbill_gap/scenario.json', import.meta.url), 'utf8'),
)

test('exports the scenario positions, both routes and caution zones with per-feature provenance', () => {
  const plan = buildScenarioGeoJson(parseScenario(payload), 'A')
  assert.equal(plan.type, 'FeatureCollection')
  assert.equal(plan.selected_option_id, 'A')
  assert.equal(plan.crs.properties.name, 'IAU_2015:49900')

  const expected = [
    ...[payload.start, ...payload.stops].map(({ id, coordinates, source_ids }) => ({
      id,
      geometry: { type: 'Point', coordinates },
      source_ids,
    })),
    ...payload.routes.features.map(({ id, geometry, properties }) => ({
      id,
      geometry,
      option: properties.option,
      source_ids: properties.source_ids,
    })),
    ...payload.unknowns,
  ]
  assert.equal(plan.features.length, expected.length)
  for (const [index, feature] of plan.features.entries()) {
    const original = expected[index]
    assert.equal(feature.id, original.id)
    assert.deepEqual(feature.geometry, original.geometry)
    assert.equal(feature.properties.scenario_version, payload.schema_version)
    assert.deepEqual(feature.properties.source_ids, original.source_ids)
    assert.deepEqual(
      feature.properties.credits,
      original.source_ids.map((id) => payload.sources.find((source) => source.id === id).credit),
    )
    assert.equal(feature.properties.selected, original.option === 'A')
  }
})

test('exports older scenarios and supports switching or clearing the selection', () => {
  const scenario = parseScenario(makeScenarioPayload())
  const switched = buildScenarioGeoJson(scenario, 'B')
  assert.deepEqual(
    switched.features.filter((f) => f.properties.selected).map((f) => f.id),
    ['b-outbound-1'],
  )
  const cleared = buildScenarioGeoJson(scenario, null)
  assert.equal(cleared.selected_option_id, null)
  assert.equal(
    cleared.features.some((f) => f.properties.selected),
    false,
  )
  assert.equal(cleared.features.length, 6)
})

test('skips unsupported caution kinds and validates geometry and provenance on known kinds', () => {
  const fixture = makeScenarioPayload()
  const zone = payload.unknowns[0]
  fixture.unknowns = [{ kind: 'future-kind' }]
  assert.deepEqual(parseScenario(fixture).caution_zones, [])
  fixture.unknowns = [{ ...zone, geometry: { type: 'LineString', coordinates: [[77, 18]] } }]
  assert.throws(() => parseScenario(fixture), /needs at least two positions/)
  fixture.unknowns = [{ ...zone, source_ids: ['not-in-sources'] }]
  assert.throws(() => parseScenario(fixture), /not listed in sources/)
})
