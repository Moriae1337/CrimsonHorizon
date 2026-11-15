import TileLayer from 'ol/layer/Tile'
import { addProjection, get as getProjection } from 'ol/proj'
import Projection from 'ol/proj/Projection'
import XYZ from 'ol/source/XYZ'
import WMTSTileGrid from 'ol/tilegrid/WMTS'
import {
  MARS_EQUATORIAL_METERS_PER_DEGREE,
  MARS_WORLD_EXTENT,
  buildMarsResolutions,
  getMarsPointResolution,
  type MapLayer,
} from './marsCatalog'

/** Mars projection and equirectangular WMTS tile layers, shared by the 2D map and the globe card. */

export function getOrCreateMarsProjection(crs: string, radiusM: number): Projection {
  const existing = getProjection(crs)
  if (existing) return existing

  const metersPerUnit = radiusM > 0 ? (Math.PI * radiusM) / 180 : MARS_EQUATORIAL_METERS_PER_DEGREE
  const projection = new Projection({
    code: crs,
    units: 'degrees',
    extent: MARS_WORLD_EXTENT,
    global: true,
    metersPerUnit,
    getPointResolution: getMarsPointResolution,
  })
  addProjection(projection)
  return projection
}

export function createWmtsLayer(
  layer: MapLayer,
  projection: Projection,
  zIndex: number,
): TileLayer<XYZ> {
  const tileSize = layer.tile_size ?? 256
  const resolutions = buildMarsResolutions(layer.max_zoom, tileSize)
  const matrixIds = resolutions.map((_, idx) => String(idx))
  const tileGrid = new WMTSTileGrid({
    origin: [-180, 90],
    extent: MARS_WORLD_EXTENT,
    resolutions,
    matrixIds,
    tileSize,
  })

  const minZoom = layer.scope === 'local' ? 8 : layer.scope === 'regional' ? 4 : undefined

  return new TileLayer({
    extent: layer.extent,
    minZoom,
    // No layer maxZoom: past the source's last level OpenLayers upscales its tiles,
    // which the Hawksbill Gap view (up to MARS_MAX_VIEW_ZOOM) relies on. A layer
    // maxZoom would hide the imagery and leave a black map there.
    zIndex,
    properties: { layerId: layer.id, scope: layer.scope },
    source: new XYZ({
      projection,
      tileGrid,
      url: layer.tile_url,
      attributions: layer.attribution,
      crossOrigin: 'anonymous',
      wrapX: layer.scope === 'global',
    }),
  })
}
