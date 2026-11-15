import 'ol/ol.css'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { ScaleLine, Zoom } from 'ol/control'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Polygon from 'ol/geom/Polygon'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { useEffect, useRef } from 'react'
import {
  DEFAULT_MAP_CATALOG,
  GLOBAL_CTX_LAYER,
  MARS_CRS,
  MARS_RADIUS_M,
  MARS_WORLD_EXTENT,
} from './marsCatalog'
import { createWmtsLayer, getOrCreateMarsProjection } from './marsTiles'

const DARK = '#212121'
const LIGHT = '#EBEBEB'
const KM_PER_DEG = (Math.PI * MARS_RADIUS_M) / 180 / 1000

/**
 * A small map of one place, loaded when the place is opened on the globe: Viking colour
 * underneath and the global CTX mosaic (to about 10 m/px) on top, framed on the
 * feature's IAU size. Craters get their rim drawn as a circle of the IAU diameter.
 */
export function PlaceMap({
  lon,
  lat,
  diameterKm,
  isCrater,
}: {
  lon: number
  lat: number
  diameterKm: number
  isCrater: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const projection = getOrCreateMarsProjection(MARS_CRS, MARS_RADIUS_M)
    const viking = DEFAULT_MAP_CATALOG.layers.find((l) => l.id === 'viking-mdim21')
    const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180))

    const source = new VectorSource()
    const radiusKm = Math.max(diameterKm, 0.5) / 2
    if (isCrater) {
      const ring: number[][] = []
      for (let i = 0; i <= 72; i++) {
        const t = (i / 72) * 2 * Math.PI
        ring.push([
          lon + (radiusKm * Math.sin(t)) / KM_PER_DEG / cosLat,
          lat + (radiusKm * Math.cos(t)) / KM_PER_DEG,
        ])
      }
      source.addFeature(new Feature(new Polygon([ring])))
    } else {
      source.addFeature(new Feature(new Point([lon, lat])))
    }

    const map = new OlMap({
      target: host,
      controls: [new Zoom(), new ScaleLine({ units: 'metric' })],
      layers: [
        ...(viking ? [createWmtsLayer(viking, projection, 0)] : []),
        createWmtsLayer(GLOBAL_CTX_LAYER, projection, 1),
        new VectorLayer({
          source,
          zIndex: 2,
          style: [
            new Style({ stroke: new Stroke({ color: DARK, width: 4 }) }),
            new Style({
              stroke: new Stroke({ color: LIGHT, width: 1.5, lineDash: [6, 4] }),
              image: new CircleStyle({
                radius: 5,
                fill: new Fill({ color: LIGHT }),
                stroke: new Stroke({ color: DARK, width: 2 }),
              }),
            }),
          ],
        }),
      ],
      view: new View({
        projection,
        center: [lon, lat],
        zoom: 4,
        maxZoom: GLOBAL_CTX_LAYER.max_zoom + 2,
        extent: MARS_WORLD_EXTENT,
        constrainResolution: false,
      }),
    })
    // Frame the feature with some margin; small features get at least a 10 km view.
    const halfKm = Math.max(radiusKm * 1.35, 5)
    const dLat = halfKm / KM_PER_DEG
    const dLon = dLat / cosLat
    map.getView().fit([lon - dLon, lat - dLat, lon + dLon, lat + dLat], {
      size: [host.clientWidth || 300, host.clientHeight || 180],
    })
    return () => map.setTarget(undefined)
  }, [lon, lat, diameterKm, isCrater])

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={hostRef}
        className="place-map h-44 w-full overflow-hidden rounded-lg border border-card-border bg-canvas"
      />
      <span className="text-[10px] leading-tight text-text-muted">
        {GLOBAL_CTX_LAYER.attribution}
      </span>
    </div>
  )
}
