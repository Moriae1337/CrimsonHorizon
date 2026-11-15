import assert from 'node:assert/strict'
import { test } from 'node:test'
import type Point from 'ol/geom/Point.js'
import RegularShape from 'ol/style/RegularShape.js'
import { parseScenario, type ScenarioStop } from '../src/scenario.ts'
import {
  buildStopFeatures,
  formatSamples,
  stopLabel,
  stopLabelPlacement,
  stopStyle,
  stopTooltip,
} from '../src/scenarioLayers.ts'
import { makeScenarioPayload } from './scenarioFixture.ts'

function twoStopScenario() {
  const payload = makeScenarioPayload() as Record<string, any>
  payload.stops.push({
    id: 'skinner-ridge',
    name: 'Skinner Ridge',
    kind: 'sample-location',
    coordinates: [77.4062, 18.4589],
    nearest_rmc: '26_1004',
    samples: [
      { name: 'Swift Run', sol: 490 },
      { name: 'Skyland', sol: 495 },
    ],
    summary: 'Lower Rockytop sandstone block; is it in place or float?',
    source_ids: ['m20-waypoints'],
  })
  return parseScenario(payload)
}

function stop(overrides: Partial<ScenarioStop> = {}): ScenarioStop {
  return {
    id: 'skinner-ridge',
    name: 'Skinner Ridge',
    kind: 'sample-location',
    coordinates: [77.4062, 18.4589],
    nearest_rmc: null,
    samples: [],
    summary: null,
    source_ids: ['m20-waypoints'],
    ...overrides,
  }
}

test('labels sample-location stops as sample sites', () => {
  assert.equal(stopLabel(stop()), 'Skinner Ridge — sample site')
  assert.equal(stopLabel(stop({ kind: 'viewpoint' })), 'Skinner Ridge')
})

test('lists cores with their sols and builds the hover text', () => {
  const samples = [
    { name: 'Swift Run', sol: 490 },
    { name: 'Skyland', sol: 495 },
  ]
  assert.equal(formatSamples(samples), 'Swift Run (sol 490), Skyland (sol 495)')
  assert.equal(
    stopTooltip(stop({ samples, summary: 'Is it in place or float?' })),
    'Skinner Ridge — sample site. Cores: Swift Run (sol 490), Skyland (sol 495). Is it in place or float?',
  )
  assert.equal(stopTooltip(stop()), 'Skinner Ridge — sample site')
})

test('puts labels of neighbouring stops on opposite sides', () => {
  const scenario = twoStopScenario()
  // Wildcat Ridge lies south-west of Skinner Ridge, as at Hawksbill Gap.
  assert.deepEqual(stopLabelPlacement(scenario.stops, 'wildcat-ridge'), {
    side: 'left',
    vertical: 'down',
  })
  assert.deepEqual(stopLabelPlacement(scenario.stops, 'skinner-ridge'), {
    side: 'right',
    vertical: 'up',
  })
  assert.deepEqual(stopLabelPlacement([scenario.stops[0]], 'wildcat-ridge'), {
    side: 'right',
    vertical: 'level',
  })
})

test('parses stop samples and the nearest rover localization', () => {
  const scenario = twoStopScenario()
  assert.deepEqual(scenario.stops[1].samples, [
    { name: 'Swift Run', sol: 490 },
    { name: 'Skyland', sol: 495 },
  ])
  assert.equal(scenario.stops[1].nearest_rmc, '26_1004')
  const payload = makeScenarioPayload() as Record<string, any>
  payload.stops[0].samples = [{ name: 'Hazeltop', sol: -1 }]
  assert.throws(() => parseScenario(payload), /samples\[0\]\.sol/)
})

test('places one marker per stop at the payload coordinates', () => {
  const scenario = twoStopScenario()
  const features = buildStopFeatures(scenario)
  assert.deepEqual(
    features.map((f) => f.getId()),
    ['stop-wildcat-ridge', 'stop-skinner-ridge'],
  )
  features.forEach((feature, i) => {
    const point = feature.getGeometry() as Point
    assert.deepEqual(point.getCoordinates(), scenario.stops[i].coordinates.slice(0, 2))
    assert.equal(feature.get('role'), 'stop')
    assert.equal(feature.get('stopId'), scenario.stops[i].id)
  })
  assert.equal(features[1].get('label'), 'Skinner Ridge — sample site')
})

test('draws stops as a diamond and labels them when zoomed in', () => {
  const [feature] = buildStopFeatures(twoStopScenario())
  const style = stopStyle(() => null)
  const far = style(feature, 1e-3)
  assert.equal(far.length, 2)
  const shape = far[0].getImage()
  assert.ok(shape instanceof RegularShape)
  assert.equal(shape.getPoints(), 4)

  const near = style(feature, 1e-5)
  assert.equal(near[2].getText()?.getText(), 'Wildcat Ridge — sample site')
  assert.equal(near[2].getText()?.getTextAlign(), 'right')
  assert.ok((near[2].getText()?.getOffsetY() ?? 0) > 0)

  const selected = stopStyle(() => 'wildcat-ridge')(feature, 1e-5)
  assert.ok((selected[0].getImage() as RegularShape).getRadius() > shape.getRadius())
})
