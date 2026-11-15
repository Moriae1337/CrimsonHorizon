import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DEFAULT_MAP_CATALOG } from './marsCatalog.ts'
import { CRATERS, CRATER_IDS, craterByIauName, type CraterInfo } from './craters.ts'
import { SITE_LABELS } from './plannerText.ts'
import { PlaceMap } from './PlaceMap.tsx'
import { fetchNomenclature, type IauFeature, type SiteId } from './sites.ts'
import { useTranslation } from './i18n/useTranslation.ts'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const GLOBE_LAYERS = ['viking-mdim21', 'mola-color-hillshade'] as const
type GlobeLayerId = (typeof GLOBE_LAYERS)[number]

const CATEGORY_LABEL: Record<string, string> = {
  crater: 'Crater',
  mons: 'Volcano / mountain',
  planitia: 'Plain',
  planum: 'Plateau',
  terra: 'Highland region',
  vallis: 'Valley / canyon',
  fossa: 'Trough',
  other: 'Feature',
}

const TEXT = {
  en: {
    textureError: 'Globe imagery unavailable.',
    labels: 'IAU names',
    drag: 'Drag to rotate · wheel to zoom',
    open3d: 'Open in 3D',
    plan2d: 'Plan routes (2D)',
    rover: 'Rover',
    sites: 'Sites with DTM',
    open2d: 'Open on 2D map',
    gazetteer: 'Gazetteer entry',
    diameter: 'Diameter',
    noLabels: 'IAU names need the API (VITE_API_URL).',
    source: 'Names: USGS Gazetteer of Planetary Nomenclature (IAU)',
    search: 'Find a feature…',
  },
  uk: {
    textureError: 'Зображення глобуса недоступне.',
    labels: 'Назви IAU',
    drag: 'Тягніть — обертання · колесо — масштаб',
    open3d: 'Відкрити в 3D',
    plan2d: 'Планувати маршрути (2D)',
    rover: 'Марсохід',
    sites: 'Ділянки з DTM',
    open2d: 'Відкрити на 2D-мапі',
    gazetteer: 'Запис у Gazetteer',
    diameter: 'Діаметр',
    noLabels: 'Назви IAU потребують API (VITE_API_URL).',
    source: 'Назви: USGS Gazetteer of Planetary Nomenclature (IAU)',
    search: 'Знайти об’єкт…',
  },
} as const

/** Unit-sphere position for planetocentric lon/lat, matching THREE.SphereGeometry UVs. */
function lonLatToVec(lon: number, lat: number, r = 1): THREE.Vector3 {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return new THREE.Vector3(
    r * Math.cos(la) * Math.cos(lo),
    r * Math.sin(la),
    -r * Math.cos(la) * Math.sin(lo),
  )
}

export interface MarsGlobeProps {
  onOpenSite: (id: SiteId) => void
  /** Opens the 2D route planner on a site. */
  onOpenPlanner: (id: SiteId) => void
  onOpenMap: (lon: number, lat: number, zoom: number) => void
}

export function MarsGlobe({ onOpenSite, onOpenPlanner, onOpenMap }: MarsGlobeProps) {
  const { locale } = useTranslation()
  const lang = locale === 'uk' ? 'uk' : 'en'
  const T = TEXT[lang]
  const hostRef = useRef<HTMLDivElement>(null)
  const labelHostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<THREE.Mesh | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const flyRef = useRef<((lon: number, lat: number, dist: number) => void) | null>(null)
  const [features, setFeatures] = useState<IauFeature[]>([])
  const [labelError, setLabelError] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [baseId, setBaseId] = useState<GlobeLayerId>('viking-mdim21')
  const [shownBaseId, setShownBaseId] = useState<GlobeLayerId | null>(null)
  const [failedBaseId, setFailedBaseId] = useState<GlobeLayerId | null>(null)
  const [selected, setSelected] = useState<IauFeature | null>(null)
  const [query, setQuery] = useState('')
  const showLabelsRef = useRef(showLabels)
  useLayoutEffect(() => {
    showLabelsRef.current = showLabels
  }, [showLabels])

  const attribution = DEFAULT_MAP_CATALOG.layers.find(({ id }) => id === shownBaseId)?.attribution

  useEffect(() => {
    if (!API_URL) return
    const controller = new AbortController()
    fetchNomenclature(API_URL, controller.signal)
      .then(setFeatures)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setLabelError(e instanceof Error ? e.message : String(e))
      })
    return () => controller.abort()
  }, [])

  // Scene, camera, controls and label projection loop.
  useEffect(() => {
    const host = hostRef.current
    const labelHost = labelHostRef.current
    if (!host || !labelHost) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    rendererRef.current = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor('#0d0d0d')
    host.prepend(renderer.domElement)
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    camera.position.copy(lonLatToVec(110, 10, 3.4))
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 1.15
    controls.maxDistance = 6
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.addEventListener('start', () => {
      controls.autoRotate = false
    })

    scene.add(new THREE.AmbientLight('#ffffff', 0.55))
    const sun = new THREE.DirectionalLight('#fff3e8', 2.2)
    sun.position.set(5, 2, 4)
    scene.add(sun)

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 64),
      new THREE.MeshStandardMaterial({ color: '#8F5A53', roughness: 1, metalness: 0 }),
    )
    globeRef.current = globe
    scene.add(globe)

    // Faint atmosphere rim.
    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 64, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: { color: { value: new THREE.Color('#8F5A53') } },
        vertexShader:
          'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
        fragmentShader:
          'uniform vec3 color; varying vec3 vN; void main(){ float i = pow(0.65 - dot(vN, vec3(0,0,1.0)), 3.0); gl_FragColor = vec4(color, clamp(i,0.0,1.0)); }',
      }),
    )
    scene.add(rim)

    // Graticule every 30°.
    const gratMat = new THREE.LineBasicMaterial({
      color: '#EBEBEB',
      transparent: true,
      opacity: 0.12,
    })
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = Array.from({ length: 121 }, (_, i) => lonLatToVec(-180 + i * 3, lat, 1.002))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratMat))
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = Array.from({ length: 61 }, (_, i) => lonLatToVec(lon, -90 + i * 3, 1.002))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratMat))
    }

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight)
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    // Fly-to animation.
    let fly: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null
    flyRef.current = (lon, lat, dist) => {
      controls.autoRotate = false
      fly = { from: camera.position.clone(), to: lonLatToVec(lon, lat, dist), t: 0 }
    }

    const tmp = new THREE.Vector3()
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (fly) {
        fly.t = Math.min(1, fly.t + 0.02)
        const e = fly.t < 0.5 ? 2 * fly.t * fly.t : 1 - (-2 * fly.t + 2) ** 2 / 2
        const len = THREE.MathUtils.lerp(fly.from.length(), fly.to.length(), e)
        camera.position.copy(
          fly.from
            .clone()
            .normalize()
            .lerp(fly.to.clone().normalize(), e)
            .normalize()
            .multiplyScalar(len),
        )
        if (fly.t >= 1) fly = null
      }
      controls.update()
      renderer.render(scene, camera)

      // Project labels: visible hemisphere, size threshold by distance, greedy no-overlap.
      const w = host.clientWidth
      const h = host.clientHeight
      const dist = camera.position.length()
      const minDiameter = dist > 3 ? 900 : dist > 2.2 ? 400 : dist > 1.6 ? 180 : 0
      const camDir = camera.position.clone().normalize()
      const taken: Array<[number, number, number, number]> = []
      for (const el of Array.from(labelHost.children) as HTMLElement[]) {
        const lon = Number(el.dataset.lon)
        const lat = Number(el.dataset.lat)
        const d = Number(el.dataset.d)
        const always = el.dataset.site === '1'
        const p = lonLatToVec(lon, lat)
        const facing = p.dot(camDir)
        let show = facing > 0.15 && (always || (showLabelsRef.current && d >= minDiameter))
        if (show) {
          tmp.copy(p).project(camera)
          const x = (tmp.x * 0.5 + 0.5) * w
          const y = (-tmp.y * 0.5 + 0.5) * h
          const bw = el.offsetWidth || 60
          const bh = el.offsetHeight || 16
          const box: [number, number, number, number] = [
            x - bw / 2,
            y - bh / 2,
            x + bw / 2,
            y + bh / 2,
          ]
          if (
            !always &&
            taken.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])
          ) {
            show = false
          } else {
            taken.push(box)
            el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
            el.style.opacity = String(Math.min(1, (facing - 0.15) * 4))
          }
        }
        el.style.display = show ? '' : 'none'
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      globe.material.map?.dispose()
      globe.material.dispose()
      globe.geometry.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
      globeRef.current = null
      rendererRef.current = null
      flyRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}globe/${baseId}.webp`,
      (texture) => {
        const globe = globeRef.current
        if (cancelled || !globe) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1
        const material = globe.material as THREE.MeshStandardMaterial
        material.map?.dispose()
        material.map = texture
        material.color.set('#ffffff')
        material.needsUpdate = true
        setShownBaseId(baseId)
        setFailedBaseId(null)
      },
      undefined,
      () => {
        if (!cancelled) setFailedBaseId(baseId)
      },
    )
    return () => {
      cancelled = true
    }
  }, [baseId])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return features.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6)
  }, [features, query])

  const pick = (f: IauFeature) => {
    setSelected(f)
    setQuery('')
    flyRef.current?.(f.lon, f.lat, f.diameter_km > 1500 ? 2.6 : 1.7)
  }

  // Jezero and Gusev markers: the IAU entry when loaded, else the crater's own data.
  const pickCrater = (c: CraterInfo) => {
    const f = features.find((x) => x.name === c.iauName)
    pick(
      f ?? {
        name: c.iauName,
        type: 'Crater, craters',
        category: 'crater',
        lon: c.lon,
        lat: c.lat,
        diameter_km: c.id === 'jezero' ? 47.5 : 158.1,
        link: c.links[c.links.length - 1].url,
      },
    )
  }
  const crater = selected ? craterByIauName(selected.name) : null

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      <div ref={labelHostRef} className="pointer-events-none absolute inset-0">
        {CRATER_IDS.map((id) => CRATERS[id]).map((c) => (
          <button
            key={c.id}
            type="button"
            data-lon={c.lon}
            data-lat={c.lat}
            data-d={1e9}
            data-site="1"
            onClick={() => pickCrater(c)}
            className="pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-secondary bg-accent px-2 py-0.5 text-[11px] font-semibold text-text-main shadow-lg cursor-pointer hover:bg-accent-hover"
            title={`${c.iauName} · ${c.rover}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            {c.iauName} · {c.rover}
          </button>
        ))}
        {features.map((f) => (
          <button
            key={`${f.name}-${f.lon}`}
            type="button"
            data-lon={f.lon}
            data-lat={f.lat}
            data-d={f.diameter_km}
            onClick={() => pick(f)}
            className={`pointer-events-auto absolute left-0 top-0 whitespace-nowrap rounded px-1 text-center leading-tight cursor-pointer hover:text-white ${
              ['terra', 'planitia', 'planum'].includes(f.category)
                ? 'text-[12px] font-semibold uppercase tracking-[0.18em] text-secondary/85'
                : f.category === 'crater'
                  ? 'text-[10.5px] text-secondary/90'
                  : 'text-[11px] italic text-secondary/90'
            }`}
            style={{ textShadow: '0 0 3px #000, 0 0 6px #000' }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute left-3 top-3 flex w-64 flex-col gap-2 rounded-lg border border-card-border bg-card/90 p-2.5 text-xs">
        <div className="flex gap-1.5">
          {GLOBE_LAYERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBaseId(id)}
              aria-pressed={baseId === id}
              className={`flex-1 rounded-lg px-2 py-1 font-medium cursor-pointer ${
                baseId === id
                  ? 'bg-accent text-text-main'
                  : 'border border-card-border bg-input text-text-secondary hover:border-secondary'
              }`}
            >
              {id === 'viking-mdim21' ? 'Viking color' : 'MOLA relief'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="accent-accent"
          />
          {T.labels}{' '}
          {features.length > 0 && <span className="text-text-muted">({features.length})</span>}
        </label>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.search}
            className="w-full rounded-lg border border-input-border bg-input px-2 py-1 text-text-main placeholder:text-[#666666] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {matches.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-card-border bg-card-elevated">
              {matches.map((f) => (
                <li key={`${f.name}-${f.lon}`}>
                  <button
                    type="button"
                    onClick={() => pick(f)}
                    className="flex w-full justify-between px-2 py-1 text-left hover:bg-accent cursor-pointer"
                  >
                    <span>{f.name}</span>
                    <span className="text-text-muted">{f.diameter_km.toFixed(0)} km</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {failedBaseId === baseId && (
          <p className="text-text-secondary" role="status">
            {T.textureError}
          </p>
        )}
        {(API_URL ? labelError : T.noLabels) && (
          <p className="text-text-muted">{API_URL ? labelError : T.noLabels}</p>
        )}
      </div>

      {selected && (
        <div className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto rounded-lg border border-card-border bg-card/95 p-3 text-xs shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">{selected.name}</h3>
              <p className="text-text-secondary">
                {CATEGORY_LABEL[selected.category] ?? selected.type} · {selected.type}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-text-muted hover:text-text-main cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
            <dt className="text-text-muted">{T.diameter}</dt>
            <dd>{selected.diameter_km.toFixed(0)} km</dd>
            <dt className="text-text-muted">Lat / Lon</dt>
            <dd>
              {selected.lat.toFixed(2)}°, {selected.lon.toFixed(2)}°E
            </dd>
          </dl>
          <div className="mt-2">
            <PlaceMap
              key={`${selected.name}-${selected.lon}`}
              lon={selected.lon}
              lat={selected.lat}
              diameterKm={selected.diameter_km}
              isCrater={selected.category === 'crater'}
            />
          </div>
          {crater && (
            <div className="mt-2 flex flex-col gap-2 text-text-secondary">
              <p>{crater.summary[lang]}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
                {crater.facts.slice(1).map((f) => (
                  <Fragment key={f.label.en}>
                    <dt className="text-text-muted">{f.label[lang]}</dt>
                    <dd className="text-text-main">{f.value[lang]}</dd>
                  </Fragment>
                ))}
              </dl>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {T.sites}
              </span>
              {[crater.regional, crater.detail].map((id) => (
                <div
                  key={id}
                  className="flex flex-col gap-1 rounded-lg border border-card-border p-2"
                >
                  <span className="text-text-main">
                    <span className="font-semibold">{SITE_LABELS[id].name}</span> ·{' '}
                    {SITE_LABELS[id].region}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPlanner(id)}
                      className="rounded-lg bg-accent px-2.5 py-1 font-medium text-text-main hover:bg-accent-hover cursor-pointer"
                    >
                      {T.plan2d}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSite(id)}
                      className="rounded-lg border border-card-border px-2.5 py-1 font-medium text-text-main hover:border-secondary cursor-pointer"
                    >
                      {T.open3d}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onOpenMap(
                  selected.lon,
                  selected.lat,
                  Math.max(3, Math.min(10, 12 - Math.log2(selected.diameter_km))),
                )
              }
              className="rounded-lg bg-accent px-2.5 py-1 font-medium hover:bg-accent-hover cursor-pointer"
            >
              {T.open2d}
            </button>
            <a
              href={selected.link}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-card-border px-2.5 py-1 font-medium hover:border-secondary"
            >
              {T.gazetteer} ↗
            </a>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-0.5 rounded-lg border border-card-border bg-card/90 px-2.5 py-1.5 text-[10px] text-text-secondary">
        <span>{T.drag}</span>
        <span>
          {attribution && `${attribution} · `}
          {T.source}
        </span>
      </div>
    </div>
  )
}
