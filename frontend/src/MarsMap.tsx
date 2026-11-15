import 'ol/ol.css'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { ScaleLine, defaults as defaultControls } from 'ol/control'
import GeoJSON from 'ol/format/GeoJSON'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { addProjection, get as getProjection } from 'ol/proj'
import Projection from 'ol/proj/Projection'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import WMTSTileGrid from 'ol/tilegrid/WMTS'
import { useEffect, useRef } from 'react'
import {
  MARS_EQUATORIAL_METERS_PER_DEGREE,
  MARS_MAX_VIEW_ZOOM,
  MARS_WORLD_EXTENT,
  buildMarsResolutions,
  getMarsPointResolution,
  type MapCatalog,
  type MapLayer,
  type MarsLandmarksGeoJson,
} from './marsCatalog'

export interface ViewFocus {
  center: [number, number]
  zoom: number
  nonce: number
}

interface MarsMapProps {
  catalog: MapCatalog
  landmarks: MarsLandmarksGeoJson
  activeBaseLayerId: string
  visibleOverlayIds: ReadonlySet<string>
  selectedLandmarkId: string | null
  focusTarget: ViewFocus | null
  onSelectLandmark: (id: string | null) => void
  onCursorMove: (coords: [number, number] | null) => void
  onZoomChange: (zoom: number) => void
}

function getOrCreateMarsProjection(crs: string, radiusM: number): Projection {
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

function createWmtsLayer(layer: MapLayer, projection: Projection, zIndex: number): TileLayer<XYZ> {
  const resolutions = buildMarsResolutions(layer.max_zoom)
  const matrixIds = resolutions.map((_, idx) => String(idx))
  const tileGrid = new WMTSTileGrid({
    origin: [-180, 90],
    extent: MARS_WORLD_EXTENT,
    resolutions,
    matrixIds,
    tileSize: 256,
  })

  const minZoom = layer.scope === 'local' ? 8 : layer.scope === 'regional' ? 4 : undefined

  return new TileLayer({
    extent: layer.extent,
    minZoom,
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

export function MarsMap({
  catalog,
  landmarks,
  activeBaseLayerId,
  visibleOverlayIds,
  selectedLandmarkId,
  focusTarget,
  onSelectLandmark,
  onCursorMove,
  onZoomChange,
}: MarsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const tileLayersRef = useRef<globalThis.Map<string, TileLayer<XYZ>>>(new globalThis.Map())
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const projectionRef = useRef<Projection | null>(null)
  const selectedIdRef = useRef<string | null>(selectedLandmarkId)
  const callbacksRef = useRef({ onSelectLandmark, onCursorMove, onZoomChange })

  useEffect(() => {
    callbacksRef.current = { onSelectLandmark, onCursorMove, onZoomChange }
  }, [onSelectLandmark, onCursorMove, onZoomChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const projection = getOrCreateMarsProjection(catalog.crs, catalog.radius_m)
    projectionRef.current = projection

    const tileLayers = new globalThis.Map<string, TileLayer<XYZ>>()
    const olLayers: Array<TileLayer<XYZ> | VectorLayer<VectorSource>> = []

    catalog.layers.forEach((layerDef, index) => {
      const zIndex = layerDef.scope === 'global' ? 0 : layerDef.scope === 'regional' ? 1 : 2
      const tileLayer = createWmtsLayer(layerDef, projection, zIndex + index * 0.01)
      tileLayers.set(layerDef.id, tileLayer)
      olLayers.push(tileLayer)
    })

    const vectorSource = new VectorSource()
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10,
      style: (feature) => {
        const isSelected = feature.getId() === selectedIdRef.current
        const label = String(feature.get('name') ?? '')
        return new Style({
          image: new CircleStyle({
            radius: isSelected ? 8 : 6,
            fill: new Fill({ color: isSelected ? '#f97316' : '#38bdf8' }),
            stroke: new Stroke({ color: '#0f172a', width: 2 }),
          }),
          text: new Text({
            text: label,
            offsetY: -15,
            font: '600 12px ui-sans-serif, system-ui, sans-serif',
            fill: new Fill({ color: '#f8fafc' }),
            stroke: new Stroke({ color: '#020617', width: 3 }),
          }),
        })
      },
    })

    olLayers.push(vectorLayer)

    const map = new OlMap({
      target: container,
      layers: olLayers,
      controls: defaultControls({ attributionOptions: { collapsible: false } }).extend([
        new ScaleLine({ units: 'metric', minWidth: 96 }),
      ]),
      view: new View({
        projection,
        center: catalog.default_center,
        zoom: catalog.default_zoom,
        minZoom: 1,
        maxZoom: MARS_MAX_VIEW_ZOOM,
        extent: MARS_WORLD_EXTENT,
        constrainResolution: false,
      }),
    })

    map.on('pointermove', (event) => {
      if (event.dragging) return
      const [lon, lat] = event.coordinate
      callbacksRef.current.onCursorMove([lon, lat])
      const hasFeature = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 6 })
      container.style.cursor = hasFeature ? 'pointer' : ''
    })

    map.on('singleclick', (event) => {
      const clicked = map.forEachFeatureAtPixel(event.pixel, (feature) => feature.getId(), {
        hitTolerance: 8,
      })
      callbacksRef.current.onSelectLandmark(typeof clicked === 'string' ? clicked : null)
    })

    map.getView().on('change:resolution', () => {
      const z = map.getView().getZoom()
      if (typeof z === 'number') {
        callbacksRef.current.onZoomChange(z)
      }
    })

    const initialZoom = map.getView().getZoom()
    if (typeof initialZoom === 'number') {
      callbacksRef.current.onZoomChange(initialZoom)
    }

    mapRef.current = map
    tileLayersRef.current = tileLayers
    vectorSourceRef.current = vectorSource
    vectorLayerRef.current = vectorLayer

    return () => {
      container.style.cursor = ''
      map.setTarget(undefined)
      mapRef.current = null
      tileLayersRef.current.clear()
      vectorSourceRef.current = null
      vectorLayerRef.current = null
    }
  }, [catalog])

  useEffect(() => {
    for (const layerDef of catalog.layers) {
      const layer = tileLayersRef.current.get(layerDef.id)
      if (!layer) continue
      const visible =
        layerDef.scope === 'global'
          ? layerDef.id === activeBaseLayerId
          : visibleOverlayIds.has(layerDef.id)
      layer.setVisible(visible)
    }
  }, [catalog, activeBaseLayerId, visibleOverlayIds])

  useEffect(() => {
    const vectorSource = vectorSourceRef.current
    const projection = projectionRef.current
    if (!vectorSource || !projection) return

    const format = new GeoJSON()
    const features = format.readFeatures(landmarks, {
      dataProjection: projection,
      featureProjection: projection,
    })
    vectorSource.clear()
    vectorSource.addFeatures(features)
  }, [catalog, landmarks])

  useEffect(() => {
    selectedIdRef.current = selectedLandmarkId
    vectorLayerRef.current?.changed()
  }, [selectedLandmarkId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusTarget) return
    map.getView().animate({
      center: focusTarget.center,
      zoom: focusTarget.zoom,
      duration: 450,
    })
  }, [focusTarget])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-slate-950"
      aria-label="Interactive Mars surface map centered on Jezero Crater"
      onMouseLeave={() => onCursorMove(null)}
    />
  )
}
