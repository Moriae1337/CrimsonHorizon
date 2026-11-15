import type { LineFeature, Position, Scenario } from './scenario'

export function buildScenarioGeoJson(scenario: Scenario, selectedOptionId: string | null) {
  const selectedOption = scenario.route_options.find((option) => option.id === selectedOptionId)
  const sources = new Map(scenario.sources.map((source) => [source.id, source]))

  function feature<T extends { source_ids: string[]; option?: string }>(
    id: string,
    geometry: { type: 'Point'; coordinates: Position } | LineFeature<unknown>['geometry'],
    featureRole: 'start' | 'stop' | 'route' | 'caution-zone',
    properties: T,
  ) {
    return {
      type: 'Feature' as const,
      id,
      geometry,
      properties: {
        ...properties,
        feature_role: featureRole,
        scenario_version: scenario.schema_version,
        credits: properties.source_ids.map((id) => sources.get(id)?.credit ?? null),
        selected: selectedOption !== undefined && properties.option === selectedOption.id,
      },
    }
  }

  const { id, coordinates, ...startProperties } = scenario.start
  return {
    type: 'FeatureCollection' as const,
    name: scenario.scenario_id,
    // GDAL/QGIS read this named CRS from GeoJSON. Mars coordinates use the
    // Mars model radius of 3,396,190 m.
    crs: { type: 'name', properties: { name: 'IAU_2015:49900' } },
    selected_option_id: selectedOption?.id ?? null,
    features: [
      feature(id, { type: 'Point', coordinates }, 'start', startProperties),
      ...scenario.stops.map(({ id, coordinates, ...properties }) =>
        feature(id, { type: 'Point', coordinates }, 'stop', properties),
      ),
      ...scenario.routes.features.map(({ id, geometry, properties }) =>
        feature(id, geometry, 'route', properties),
      ),
      ...scenario.caution_zones.map(({ id, geometry, properties }) =>
        feature(id, geometry, 'caution-zone', properties),
      ),
    ],
  }
}

export function downloadScenarioGeoJson(scenario: Scenario, selectedOptionId: string | null) {
  const plan = buildScenarioGeoJson(scenario, selectedOptionId)
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${scenario.scenario_id}.geojson`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
