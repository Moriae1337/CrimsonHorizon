import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EnvironmentFormatError,
  fetchEnvironment,
  formatMeasurement,
  missingSols,
  parseEnvironment,
} from '../src/environment.ts'

const stats = {
  min: 700,
  max: 790,
  mean: 750,
  samples: 100,
  hours_with_data: 12,
  covered_h: 6.5,
  lmst_gaps: [{ from_lmst: '00:00', to_lmst: '01:00' }],
}

function fixture() {
  return {
    schema_version: '1.0',
    scenario_id: 'hawksbill-gap',
    weather: {
      title: 'MEDA',
      archival: true,
      instrument: 'MEDA',
      place: 'Jezero crater',
      sol_range: [490, 493],
      parameters: [
        { id: 'pressure', label: 'P', unit: 'Pa', processing_level: 'DER_PS' },
        { id: 'air_temperature', label: 'T', unit: 'K', processing_level: 'CAL_ATS' },
      ],
      method: 'm',
      source_ids: ['pds-meda'],
      sols: [490, 491, 492, 493].map((sol) => ({
        sol,
        utc_start: sol === 491 ? null : '2022-07-06T15:42:08.708Z',
        utc_stop: sol === 491 ? null : '2022-07-07T15:41:10.388Z',
        pressure: sol === 491 ? null : stats,
        air_temperature: sol === 490 ? stats : null,
      })),
    },
    radiation: {
      title: 'RAD',
      archival: true,
      instrument: 'RAD',
      place: {
        name: 'Gale crater',
        mission: 'MSL',
        coordinates: [137.4417, -4.5895],
        elevation_m: -4400,
      },
      window: { utc_start: '2012-08-07', utc_stop: '2013-06-01', note: 'n' },
      measurements: [
        {
          id: 'd',
          label: 'dose',
          value: 0.21,
          uncertainty: 0.04,
          unit: 'mGy/day',
          source_ids: ['hassler-2014'],
        },
        {
          id: 'h',
          label: 'eq',
          value: 0.67,
          uncertainty: null,
          unit: 'mSv/day',
          source_ids: ['hassler-2014'],
        },
      ],
      limits: ['Measured at Gale crater, not at Jezero crater.'],
      source_ids: ['hassler-2014'],
    },
    sources: [
      { id: 'pds-meda', title: 'PDS', url: 'https://pds', credit: 'NASA', doi: null },
      { id: 'hassler-2014', title: 'H', url: 'https://doi.org/x', credit: 'H', doi: 'x' },
    ],
  }
}

test('parses a valid environment document', () => {
  const env = parseEnvironment(fixture())
  assert.equal(env.radiation.place.name, 'Gale crater')
  assert.equal(env.weather.sols[1].pressure, null)
  assert.equal(env.weather.sols[0].pressure?.lmst_gaps[0].to_lmst, '01:00')
})

test('rejects another major version, unknown sources and non-archival data', () => {
  const cases: ((d: ReturnType<typeof fixture>) => void)[] = [
    (d) => (d.schema_version = '2.0'),
    (d) => (d.weather.source_ids = ['nope']),
    (d) => ((d.weather as { archival: unknown }).archival = false),
    (d) => (d.radiation.limits = []),
    (d) => (d.weather.sols[0].pressure = { ...stats, min: 900 }),
    (d) =>
      (d.weather.sols[0].pressure = { ...stats, lmst_gaps: [{ from_lmst: '1', to_lmst: '2' }] }),
  ]
  for (const mutate of cases) {
    const doc = fixture()
    mutate(doc)
    assert.throws(() => parseEnvironment(doc), EnvironmentFormatError)
  }
})

test('collapses missing sols into ranges', () => {
  const env = parseEnvironment(fixture())
  assert.equal(missingSols(env.weather.sols, 'pressure'), '491')
  assert.equal(missingSols(env.weather.sols, 'air_temperature'), '491–493')
})

test('formats measurements with and without uncertainty', () => {
  const [dose, eq] = parseEnvironment(fixture()).radiation.measurements
  assert.equal(formatMeasurement(dose), '0.210 ± 0.040 mGy/day')
  assert.equal(formatMeasurement(eq), '0.67 mSv/day')
})

test('fetches from the environment endpoint', async (t) => {
  const { signal } = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'http://localhost:8000/scenarios/hawksbill-gap/environment')
    return Response.json(fixture())
  })
  const env = await fetchEnvironment('http://localhost:8000', 'hawksbill-gap', signal)
  assert.equal(env.scenario_id, 'hawksbill-gap')
})
