import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_LANDMARKS,
  DEFAULT_MAP_CATALOG,
  buildMarsResolutions,
  formatMarsCoordinate,
  getMarsPointResolution,
} from '../src/marsCatalog.ts'

test('builds equirectangular 2x1 WMTS resolutions for Mars Trek', () => {
  const resolutions = buildMarsResolutions(3)
  assert.equal(resolutions.length, 4)
  assert.equal(resolutions[0], 180 / 256)
  assert.equal(resolutions[3], 180 / (256 * 8))
})

test('adjusts Mars point resolution by cosine of planetocentric latitude', () => {
  assert.equal(getMarsPointResolution(1, [77.45, 0]), 1)
  const jezeroScale = getMarsPointResolution(1, [77.45, 18.4448])
  assert.ok(jezeroScale < 1 && jezeroScale > 0.94)
})

test('formats planetocentric Mars coordinates with N/S and E/W hemispheres', () => {
  assert.equal(formatMarsCoordinate(77.452019, 18.444796), '18.4448° N, 77.4520° E')
  assert.equal(formatMarsCoordinate(282.5, -14.5), '14.5000° S, 77.5000° W')
})

test('default catalog and landmarks contain cited Jezero coordinates', () => {
  assert.equal(DEFAULT_MAP_CATALOG.crs, 'IAU2000:104905')
  assert.equal(DEFAULT_MAP_CATALOG.radius_m, 3_396_190.0)
  assert.ok(DEFAULT_MAP_CATALOG.layers.length >= 4)
  assert.equal(DEFAULT_LANDMARKS.type, 'FeatureCollection')
  assert.ok(DEFAULT_LANDMARKS.features.length >= 4)
})
