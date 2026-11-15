import 'ol/ol.css'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { ScaleLine, defaults as defaultControls } from 'ol/control'
import { DoubleClickZoom, Pointer as PointerInteraction } from 'ol/interaction'
import GeoJSON from 'ol/format/GeoJSON'
import Feature, { type FeatureLike } from 'ol/Feature'
import LineString from 'ol/geom/LineString'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import ImageStatic from 'ol/source/ImageStatic'
import VectorLayer from 'ol/layer/Vector'
import Projection from 'ol/proj/Projection'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import { useEffect, useRef, useState } from 'react'
import type { Scenario } from './scenario'
import {
  ROUTE_COLORS,
  aeqdForward,
  aeqdInverse,
  type PlannedRoute,
  type RouteId,
  type RoverTraverse,
  type TerrainPackage,
} from './sites'
import {
  TERRAIN_GAP_DASH,
  directionArrows,
  TERRAIN_GAP_LABEL,
  buildRouteFeatures,
  buildStopFeatures,
  buildTrackFeatures,
  featureOptionId,
  routeStyle,
  stopStyle,
  trackStyle,
} from './scenarioLayers'
import {
  MARS_MAX_VIEW_ZOOM,
  MARS_WORLD_EXTENT,
  type MapCatalog,
  type MarsLandmarksGeoJson,
} from './marsCatalog'
import { createWmtsLayer, getOrCreateMarsProjection } from './marsTiles'

export type ViewFocus =
  | { center: [number, number]; zoom: number; nonce: number }
  | { extent: [number, number, number, number]; nonce: number }

/** Route-planner overlay shared with the 3D site view (useRoutePlanner). */
export interface PlannerOverlay {
  pkg: TerrainPackage
  textureUrl: string | null
  routes: PlannedRoute[]
  selectedRouteId: RouteId
  waypoints: [number, number][]
  hasEnd: boolean
  picking: boolean
  /** Short status shown on the map: what a click does now, planning progress or an error. */
  status: string | null
  /** Shown briefly when a click or drag lands outside the site window. */
  outsideMessage: string
  onPick: (x: number, y: number) => boolean
  onMoveWaypoint: (index: number, x: number, y: number) => boolean
  onSelectRoute: (id: RouteId) => void
  /** Rover traverse inside the window: drawn as context, its stops are clickable. */
  traverse: RoverTraverse | null
  /** Tooltip suffix for a rover stop, e.g. "click to add as a stop". */
  roverStopTip: string
  onAddStop: (x: number, y: number) => void
}

const PLAN_CASING = '#212121'
const PLAN_LIGHT = '#EBEBEB'
const PLAN_ACCENT = '#8F5A53'

function plannerStyle(selectedRouteId: () => RouteId) {
  return (feature: FeatureLike, resolution: number): Style[] => {
    const role = feature.get('role')
    if (role === 'window') {
      return [
        new Style({ stroke: new Stroke({ color: PLAN_LIGHT, width: 1.5, lineDash: [6, 5] }) }),
      ]
    }
    if (role === 'rover-line') {
      return [
        new Style({
          zIndex: 6,
          stroke: new Stroke({ color: PLAN_CASING, width: 4, lineJoin: 'round', lineCap: 'round' }),
        }),
        new Style({
          zIndex: 7,
          stroke: new Stroke({
            color: PLAN_LIGHT,
            width: 1.5,
            lineJoin: 'round',
            lineCap: 'round',
          }),
        }),
      ]
    }
    if (role === 'rover-stop') {
      return [
        new Style({
          zIndex: 8,
          image: new CircleStyle({
            radius: resolution > 40 ? 2.5 : 3.5,
            fill: new Fill({ color: PLAN_ACCENT }),
            stroke: new Stroke({ color: PLAN_LIGHT, width: 1.2 }),
          }),
        }),
      ]
    }
    if (role === 'waypoint') {
      const kind = feature.get('kind') as 'start' | 'end' | 'stop'
      const fill = kind === 'start' ? PLAN_LIGHT : kind === 'end' ? PLAN_ACCENT : PLAN_CASING
      return [
        new Style({
          zIndex: 30,
          image: new CircleStyle({
            radius: 11,
            fill: new Fill({ color: fill }),
            stroke: new Stroke({ color: kind === 'start' ? PLAN_CASING : PLAN_LIGHT, width: 2 }),
          }),
          text: new Text({
            text: String(feature.get('label')),
            font: '700 11px ui-sans-serif, system-ui, sans-serif',
            fill: new Fill({ color: kind === 'start' ? PLAN_CASING : PLAN_LIGHT }),
          }),
        }),
      ]
    }
    const id = feature.get('routeId') as RouteId
    const selected = id === selectedRouteId()
    const width = selected ? 4 : 2.5
    const styles = [
      new Style({
        zIndex: selected ? 21 : 11,
        stroke: new Stroke({
          color: PLAN_CASING,
          width: width + 3,
          lineJoin: 'round',
          lineCap: 'round',
        }),
      }),
      new Style({
        zIndex: selected ? 22 : 12,
        stroke: new Stroke({
          color: ROUTE_COLORS[id],
          width,
          lineJoin: 'round',
          lineCap: id === 'shortest' ? 'butt' : 'round',
          lineDash: id === 'shortest' ? [8, 6] : id === 'rover' ? [1, width + 4] : undefined,
        }),
      }),
    ]
    return selected ? [...styles, ...directionArrows(feature, resolution, 23)] : styles
  }
}

interface MarsMapProps {
  catalog: MapCatalog
  landmarks: MarsLandmarksGeoJson
  activeBaseLayerId: string
  visibleOverlayIds: ReadonlySet<string>
  selectedLandmarkId: string | null
  focusTarget: ViewFocus | null
  scenario: Scenario | null
  showRoverTrack: boolean
  selectedStopId: string | null
  selectedOptionId: string | null
  onSelectLandmark: (id: string | null) => void
  onSelectStop: (id: string | null) => void
  onSelectOption: (id: string) => void
  onCursorMove: (coords: [number, number] | null) => void
  onZoomChange: (zoom: number) => void
  planner?: PlannerOverlay | null
}

export function MarsMap({
  catalog,
  landmarks,
  activeBaseLayerId,
  visibleOverlayIds,
  selectedLandmarkId,
  focusTarget,
  scenario,
  showRoverTrack,
  selectedStopId,
  selectedOptionId,
  onSelectLandmark,
  onSelectStop,
  onSelectOption,
  onCursorMove,
  onZoomChange,
  planner = null,
}: MarsMapProps) {
  const plannerRef = useRef<PlannerOverlay | null>(planner)
  const plannerLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const plannerImageRef = useRef<ImageLayer<ImageStatic> | null>(null)
  const selectedRouteRef = useRef<RouteId>(planner?.selectedRouteId ?? 'lower_risk')
  const dblClickZoomRef = useRef<DoubleClickZoom | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const showNoticeRef = useRef((text: string) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    setNotice(text)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2500)
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const tileLayersRef = useRef<globalThis.Map<string, TileLayer<XYZ>>>(new globalThis.Map())
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const projectionRef = useRef<Projection | null>(null)
  const routeLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const trackLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const stopLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const selectedStopIdRef = useRef<string | null>(selectedStopId)
  const selectedOptionIdRef = useRef<string | null>(selectedOptionId)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const selectedIdRef = useRef<string | null>(selectedLandmarkId)
  const callbacksRef = useRef({
    onSelectLandmark,
    onSelectStop,
    onSelectOption,
    onCursorMove,
    onZoomChange,
  })

  useEffect(() => {
    callbacksRef.current = {
      onSelectLandmark,
      onSelectStop,
      onSelectOption,
      onCursorMove,
      onZoomChange,
    }
  }, [onSelectLandmark, onSelectStop, onSelectOption, onCursorMove, onZoomChange])

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
            fill: new Fill({ color: isSelected ? '#8F5A53' : '#EBEBEB' }),
            stroke: new Stroke({ color: isSelected ? '#EBEBEB' : '#212121', width: 2 }),
          }),
          text: new Text({
            text: label,
            offsetY: -15,
            font: '600 12px ui-sans-serif, system-ui, sans-serif',
            fill: new Fill({ color: '#EBEBEB' }),
            stroke: new Stroke({ color: '#212121', width: 3 }),
          }),
        })
      },
    })

    olLayers.push(vectorLayer)

    // Scenario layers sit above the base map and stay empty until a scenario loads, so a
    // failed scenario request leaves the Mars layers untouched.
    const routeLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 11,
      properties: { layerId: 'scenario-routes' },
    })
    const trackLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 12,
      visible: false,
      declutter: true,
      style: trackStyle,
      properties: { layerId: 'scenario-rover-track' },
    })
    // Science stops sit above every line and the Start point so they are always clickable.
    const stopLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 13,
      style: stopStyle(() => selectedStopIdRef.current),
      properties: { layerId: 'scenario-stops' },
    })
    olLayers.push(routeLayer, trackLayer, stopLayer)

    // Route planner: site imagery under the vectors, routes and waypoints above them.
    const plannerImage = new ImageLayer<ImageStatic>({
      zIndex: 5,
      properties: { layerId: 'planner-image' },
    })
    const plannerLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 14,
      style: plannerStyle(() => selectedRouteRef.current),
      properties: { layerId: 'planner' },
    })

    const map = new OlMap({
      target: container,
      layers: [...olLayers, plannerImage, plannerLayer],
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

    let moveRafId: number | null = null
    let lastCoords: [number, number] | null = null
    let lastPixel: [number, number] | null = null

    map.on('pointermove', (event) => {
      if (event.dragging) return
      lastCoords = event.coordinate as [number, number]
      lastPixel = event.pixel as [number, number]

      if (moveRafId === null) {
        moveRafId = requestAnimationFrame(() => {
          moveRafId = null
          if (lastCoords) {
            callbacksRef.current.onCursorMove(lastCoords)
          }
          const pixel = lastPixel
          if (!pixel) return
          const hasClickable =
            map.forEachFeatureAtPixel(
              pixel,
              (feature, layer) =>
                layer === vectorLayer || layer === stopLayer || featureOptionId(feature) !== null,
              {
                hitTolerance: 6,
                layerFilter: (layer) =>
                  layer === vectorLayer || layer === stopLayer || layer === routeLayer,
              },
            ) === true
          const plannerHit = plannerRef.current
            ? map.forEachFeatureAtPixel(
                pixel,
                (feature) => feature.get('role') as string | undefined,
                { hitTolerance: 6, layerFilter: (layer) => layer === plannerLayer },
              )
            : undefined
          container.style.cursor =
            plannerHit === 'waypoint'
              ? 'grab'
              : plannerRef.current?.picking
                ? 'crosshair'
                : hasClickable || plannerHit === 'route' || plannerHit === 'rover-stop'
                  ? 'pointer'
                  : ''

          const tooltip = tooltipRef.current
          if (!tooltip) return
          // Prefer coverage information where the gap overlaps tracks or route lines.
          const gapHint = map.forEachFeatureAtPixel(
            pixel,
            (feature) =>
              feature.get('role') === 'terrain-gap'
                ? (feature.get('tooltip') as string)
                : undefined,
            { hitTolerance: 5, layerFilter: (layer) => layer === routeLayer },
          )
          const hint =
            gapHint ??
            map.forEachFeatureAtPixel(
              pixel,
              (feature) => feature.get('tooltip') as string | undefined,
              {
                hitTolerance: 5,
                layerFilter: (layer) =>
                  layer === stopLayer ||
                  layer === routeLayer ||
                  layer === trackLayer ||
                  layer === plannerLayer,
              },
            )
          if (hint) {
            tooltip.textContent = hint
            tooltip.style.transform = `translate(${pixel[0] + 14}px, ${pixel[1] + 14}px)`
            tooltip.hidden = false
          } else {
            tooltip.hidden = true
          }
        })
      }
    })

    const toSiteXy = (plan: PlannerOverlay, coordinate: number[]) => {
      const [lon0, lat0] = plan.pkg.center_lon_lat
      return aeqdForward(coordinate[0], coordinate[1], lon0, lat0, plan.pkg.radius_m)
    }

    // Route planner picks on the immediate click (no 250 ms single-click wait, and two
    // quick clicks place A then B instead of zooming); the single-click handler below
    // then skips that click.
    const plannerClicks = new WeakSet<Event>()
    const roverStopAt = (pixel: number[]) =>
      map.forEachFeatureAtPixel(
        pixel,
        (f) => (f.get('role') === 'rover-stop' ? (f.get('xy') as [number, number]) : undefined),
        { hitTolerance: 5, layerFilter: (layer) => layer === plannerLayer },
      ) ?? null
    map.on('click', (event) => {
      const plan = plannerRef.current
      if (!plan?.picking) return
      plannerClicks.add(event.originalEvent)
      const snapped = roverStopAt(event.pixel)
      const [x, y] = snapped ?? toSiteXy(plan, event.coordinate)
      if (!plan.onPick(x, y)) showNoticeRef.current(plan.outsideMessage)
    })

    // Drag A, B and stops; the route is replanned when the point is dropped.
    let drag: { index: number; point: Point; origin: number[]; moved: boolean } | null = null
    map.addInteraction(
      new PointerInteraction({
        handleDownEvent: (event) => {
          if (!plannerRef.current) return false
          const feature = map.forEachFeatureAtPixel(
            event.pixel,
            (f) => (f.get('role') === 'waypoint' ? f : undefined),
            { hitTolerance: 6, layerFilter: (layer) => layer === plannerLayer },
          )
          const point = feature?.getGeometry()
          if (!feature || !(point instanceof Point)) return false
          drag = {
            index: feature.get('index') as number,
            point,
            origin: point.getCoordinates(),
            moved: false,
          }
          container.style.cursor = 'grabbing'
          return true
        },
        handleDragEvent: (event) => {
          if (!drag) return
          drag.moved = true
          drag.point.setCoordinates(event.coordinate)
        },
        handleUpEvent: (event) => {
          const plan = plannerRef.current
          if (drag?.moved && plan) {
            const [x, y] = toSiteXy(plan, event.coordinate)
            if (!plan.onMoveWaypoint(drag.index, x, y)) {
              drag.point.setCoordinates(drag.origin)
              showNoticeRef.current(plan.outsideMessage)
            }
          }
          drag = null
          container.style.cursor = 'grab'
          return false
        },
      }),
    )
    dblClickZoomRef.current =
      map
        .getInteractions()
        .getArray()
        .find((i): i is DoubleClickZoom => i instanceof DoubleClickZoom) ?? null

    map.on('singleclick', (event) => {
      if (plannerClicks.has(event.originalEvent)) return
      // Route planner: a click on a planned route selects it.
      const plan = plannerRef.current
      if (plan) {
        const routeId = map.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature.get('routeId') as RouteId | undefined,
          { hitTolerance: 6, layerFilter: (layer) => layer === plannerLayer },
        )
        if (routeId) {
          plan.onSelectRoute(routeId)
          return
        }
        const roverStop = roverStopAt(event.pixel)
        if (roverStop) {
          plan.onAddStop(roverStop[0], roverStop[1])
          return
        }
      }
      // A science stop takes the click first and leaves the landmark selection as it is.
      const stop = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature.get('stopId') as string | undefined,
        { hitTolerance: 6, layerFilter: (layer) => layer === stopLayer },
      )
      if (stop) {
        callbacksRef.current.onSelectStop(stop)
        return
      }
      // Then a route option's line, connector or badge selects that option.
      const option = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => featureOptionId(feature) ?? undefined,
        { hitTolerance: 5, layerFilter: (layer) => layer === routeLayer },
      )
      if (option) {
        callbacksRef.current.onSelectOption(option)
        return
      }
      callbacksRef.current.onSelectStop(null)
      const clicked = map.forEachFeatureAtPixel(event.pixel, (feature) => feature.getId(), {
        hitTolerance: 8,
        layerFilter: (layer) => layer === vectorLayer,
      })
      callbacksRef.current.onSelectLandmark(typeof clicked === 'string' ? clicked : null)
    })

    let zoomRafId: number | null = null
    map.getView().on('change:resolution', () => {
      if (zoomRafId === null) {
        zoomRafId = requestAnimationFrame(() => {
          zoomRafId = null
          const z = map.getView().getZoom()
          if (typeof z === 'number') {
            callbacksRef.current.onZoomChange(z)
          }
        })
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
    routeLayerRef.current = routeLayer
    trackLayerRef.current = trackLayer
    stopLayerRef.current = stopLayer
    plannerLayerRef.current = plannerLayer
    plannerImageRef.current = plannerImage

    return () => {
      if (moveRafId !== null) cancelAnimationFrame(moveRafId)
      if (zoomRafId !== null) cancelAnimationFrame(zoomRafId)
      container.style.cursor = ''
      map.setTarget(undefined)
      map.dispose()
      mapRef.current = null
      tileLayersRef.current.clear()
      vectorSourceRef.current = null
      vectorLayerRef.current = null
      routeLayerRef.current = null
      trackLayerRef.current = null
      stopLayerRef.current = null
      plannerLayerRef.current = null
      plannerImageRef.current = null
    }
  }, [catalog])

  useEffect(() => {
    plannerRef.current = planner
  }, [planner])

  // In the route planner a double click is two picks, not a zoom.
  const plannerActive = planner !== null
  useEffect(() => {
    dblClickZoomRef.current?.setActive(!plannerActive)
  }, [catalog, plannerActive])

  useEffect(
    () => () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    },
    [],
  )

  // Site imagery (the same HiRISE texture as the 3D view) under the planner vectors.
  const plannerPkg = planner?.pkg ?? null
  const plannerTexture = planner?.textureUrl ?? null
  useEffect(() => {
    const image = plannerImageRef.current
    if (!image) return
    if (!plannerPkg || !plannerTexture) {
      image.setSource(null)
      return
    }
    const [lon0, lat0] = plannerPkg.center_lon_lat
    const b = plannerPkg.bounds_m
    // Over a few km the local AEQD frame and lon/lat differ by well under a metre.
    const [west, south] = aeqdInverse(b.left, b.bottom, lon0, lat0, plannerPkg.radius_m)
    const [east, north] = aeqdInverse(b.right, b.top, lon0, lat0, plannerPkg.radius_m)
    image.setSource(
      new ImageStatic({
        url: plannerTexture,
        imageExtent: [west, south, east, north],
        projection: projectionRef.current ?? undefined,
        crossOrigin: 'anonymous',
        attributions: 'HiRISE (USGS / University of Arizona)',
      }),
    )
    // Show the whole site window whenever the planner opens or switches site.
    mapRef.current?.getView().fit([west, south, east, north], {
      padding: [40, 40, 40, 40],
      duration: 450,
    })
  }, [catalog, plannerPkg, plannerTexture])

  // Window outline, planned routes and waypoints.
  const plannerRoutes = planner?.routes
  const plannerWaypoints = planner?.waypoints
  const plannerHasEnd = planner?.hasEnd ?? false
  const plannerTraverse = planner?.traverse ?? null
  const plannerStopTip = planner?.roverStopTip ?? ''
  useEffect(() => {
    const source = plannerLayerRef.current?.getSource()
    if (!source) return
    source.clear()
    if (!plannerPkg) return
    const [lon0, lat0] = plannerPkg.center_lon_lat
    const ll = (x: number, y: number) => aeqdInverse(x, y, lon0, lat0, plannerPkg.radius_m)
    const b = plannerPkg.bounds_m
    const outline = new Feature(
      new Polygon([
        [
          ll(b.left, b.bottom),
          ll(b.right, b.bottom),
          ll(b.right, b.top),
          ll(b.left, b.top),
          ll(b.left, b.bottom),
        ],
      ]),
    )
    outline.set('role', 'window')
    source.addFeature(outline)
    if (plannerTraverse) {
      for (const run of plannerTraverse.lines) {
        if (run.length < 2) continue
        const f = new Feature(new LineString(run.map(([x, y]) => ll(x, y))))
        f.set('role', 'rover-line')
        f.set('tooltip', `${plannerTraverse.name}`)
        source.addFeature(f)
      }
      for (const st of plannerTraverse.stops) {
        const f = new Feature(new Point(ll(st.x, st.y)))
        f.set('role', 'rover-stop')
        f.set('xy', [st.x, st.y])
        const sols =
          st.sol_start === st.sol_end ? `${st.sol_start}` : `${st.sol_start}–${st.sol_end}`
        f.set('tooltip', `${plannerTraverse.name} · sol ${sols} · ${plannerStopTip}`)
        source.addFeature(f)
      }
    }
    for (const route of plannerRoutes ?? []) {
      const f = new Feature(new LineString(route.path_lon_lat))
      f.set('role', 'route')
      f.set('routeId', route.id)
      source.addFeature(f)
    }
    const wps = plannerWaypoints ?? []
    wps.forEach(([x, y], i) => {
      const isStart = i === 0
      const isEnd = plannerHasEnd && i === wps.length - 1
      const f = new Feature(new Point(ll(x, y)))
      f.set('role', 'waypoint')
      f.set('kind', isStart ? 'start' : isEnd ? 'end' : 'stop')
      f.set('index', i)
      f.set('label', isStart ? 'A' : isEnd ? 'B' : `S${i}`)
      source.addFeature(f)
    })
  }, [
    catalog,
    plannerPkg,
    plannerRoutes,
    plannerWaypoints,
    plannerHasEnd,
    plannerTraverse,
    plannerStopTip,
  ])

  const plannerSelected = planner?.selectedRouteId ?? 'lower_risk'
  useEffect(() => {
    selectedRouteRef.current = plannerSelected
    plannerLayerRef.current?.changed()
  }, [plannerSelected])

  useEffect(() => {
    const routeLayer = routeLayerRef.current
    const trackLayer = trackLayerRef.current
    const stopSource = stopLayerRef.current?.getSource()
    if (!routeLayer || !trackLayer) return
    const routeSource = routeLayer.getSource()
    const trackSource = trackLayer.getSource()
    routeSource?.clear()
    trackSource?.clear()
    stopSource?.clear()
    if (tooltipRef.current) tooltipRef.current.hidden = true
    if (!scenario) return
    routeLayer.setStyle(routeStyle(scenario.route_options, () => selectedOptionIdRef.current))
    routeSource?.addFeatures(buildRouteFeatures(scenario))
    trackSource?.addFeatures(buildTrackFeatures(scenario))
    stopSource?.addFeatures(buildStopFeatures(scenario))
  }, [catalog, scenario])

  useEffect(() => {
    selectedStopIdRef.current = selectedStopId
    stopLayerRef.current?.changed()
  }, [selectedStopId])

  useEffect(() => {
    selectedOptionIdRef.current = selectedOptionId
    routeLayerRef.current?.changed()
  }, [selectedOptionId])

  useEffect(() => {
    trackLayerRef.current?.setVisible(showRoverTrack)
  }, [catalog, showRoverTrack])

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
    if ('extent' in focusTarget) {
      map.getView().fit(focusTarget.extent, { padding: [32, 32, 32, 32], duration: 450 })
      return
    }
    map.getView().animate({
      center: focusTarget.center,
      zoom: focusTarget.zoom,
      duration: 450,
    })
  }, [focusTarget])

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full bg-canvas"
        aria-label="Interactive Mars surface map"
        onMouseLeave={() => {
          onCursorMove(null)
          if (tooltipRef.current) tooltipRef.current.hidden = true
        }}
      />
      {scenario?.caution_zones.some(({ properties }) => properties.kind === 'terrain-gap') && (
        <div className="border-card-border bg-card text-text-main pointer-events-none absolute top-2 left-1/2 z-10 flex w-max max-w-[calc(100%-5rem)] -translate-x-1/2 items-center gap-2 rounded border px-2 py-1 text-xs">
          <svg viewBox="0 0 34 10" width="34" height="10" className="shrink-0" aria-hidden="true">
            <path
              d="M0 5h34"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={TERRAIN_GAP_DASH.join(' ')}
            />
          </svg>
          <span>{TERRAIN_GAP_LABEL}</span>
        </div>
      )}
      {planner && (notice ?? planner.status) && (
        <div
          role="status"
          className="border-card-border bg-card/95 text-text-main pointer-events-none absolute top-2 left-1/2 z-10 w-max max-w-[calc(100%-5rem)] -translate-x-1/2 rounded border px-3 py-1.5 text-xs shadow"
        >
          {notice ?? planner.status}
        </div>
      )}
      <div
        ref={tooltipRef}
        hidden
        aria-hidden="true"
        className="border-card-border bg-card/95 text-text-main pointer-events-none absolute top-0 left-0 z-10 max-w-72 rounded border px-2 py-1 text-xs shadow"
      />
    </div>
  )
}
