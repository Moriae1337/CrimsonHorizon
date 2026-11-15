import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  ROUTE_COLORS,
  pointAlong,
  sampleElevation,
  type PlannedRoute,
  type RouteId,
  type TerrainGrid,
} from './sites.ts'

// Palette (specs/design-system.md): Accent = nominal / lower-risk route,
// Secondary = alternative / shortest route (drawn dashed in 2D, thinner here).
const ACCENT = '#8F5A53'
const SECONDARY = '#EBEBEB'
const MAIN = '#212121'
const CANVAS = '#171717'

export interface OverlayLine {
  id: string
  label: string
  color: string
  points: [number, number][]
}

export interface OverlayPin {
  id: string
  label: string
  x: number
  y: number
}

export interface Terrain3DViewProps {
  grid: TerrainGrid
  textureUrl: string
  exaggeration: number
  routes: PlannedRoute[]
  selectedRouteId: RouteId
  waypoints: [number, number][]
  overlayLines?: OverlayLine[]
  overlayPins?: OverlayPin[]
  picking: boolean
  playing: boolean
  speed: number
  follow: boolean
  onPick: (x: number, y: number) => void
  onProgress: (progress: number) => void
  onPlaybackEnd: () => void
  /** Bumped by the parent to restart playback from 0. */
  restartNonce: number
}

interface SceneState {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  terrain: THREE.Mesh | null
  routeGroup: THREE.Group
  pinGroup: THREE.Group
  overlayGroup: THREE.Group
  walker: THREE.Group
  raycaster: THREE.Raycaster
  progress: number
  lastTime: number
  frame: number
}

function labelSprite(text: string, fill: string, ink: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = '600 30px ui-sans-serif, system-ui, sans-serif'
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + 28
  canvas.width = Math.max(48, w)
  canvas.height = 48
  ctx.font = font
  ctx.fillStyle = fill
  ctx.strokeStyle = MAIN
  ctx.lineWidth = 4
  const r = 22
  ctx.beginPath()
  ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, r)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }),
  )
  const h = 0.03
  sprite.scale.set((h * canvas.width) / canvas.height, h, 1)
  sprite.renderOrder = 10
  return sprite
}

function disposeGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child)
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      mesh.geometry?.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        const map = (m as THREE.MeshBasicMaterial).map
        map?.dispose()
        m.dispose()
      }
    })
  }
}

/** Site size in metres (longest side), used to scale markers and route tubes. */
function siteSize(grid: TerrainGrid): number {
  return Math.max(grid.cols, grid.rows) * grid.cell
}

function buildWalker(scale: number): THREE.Group {
  const g = new THREE.Group()
  const suit = new THREE.MeshStandardMaterial({ color: SECONDARY, roughness: 0.6 })
  const visor = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.2, metalness: 0.4 })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 10), suit)
  body.position.y = 0.95
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), suit)
  head.position.y = 1.72
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), visor)
  face.position.set(0.14, 1.74, 0)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.5), suit)
  pack.position.set(-0.36, 1.1, 0)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.15, 40),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.05
  ring.renderOrder = 5
  ring.name = 'ring'
  g.add(body, head, face, pack, ring)
  g.scale.setScalar(scale)
  g.visible = false
  return g
}

export function Terrain3DView(props: Terrain3DViewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<SceneState | null>(null)
  const propsRef = useRef(props)
  useLayoutEffect(() => {
    propsRef.current = props
  })

  // --- Scene setup (once) --------------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(CANVAS)
    host.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(CANVAS, 1, 1e6)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1e6)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.49

    scene.add(new THREE.HemisphereLight('#f3e2d8', '#3a2a26', 0.9))
    const sun = new THREE.DirectionalLight('#fff4ea', 2.0)
    sun.position.set(-1, 1.1, -0.6)
    scene.add(sun)

    const routeGroup = new THREE.Group()
    const pinGroup = new THREE.Group()
    const overlayGroup = new THREE.Group()
    const walker = buildWalker(1)
    scene.add(routeGroup, pinGroup, overlayGroup, walker)

    const state: SceneState = {
      renderer,
      scene,
      camera,
      controls,
      terrain: null,
      routeGroup,
      pinGroup,
      overlayGroup,
      walker,
      raycaster: new THREE.Raycaster(),
      progress: 0,
      lastTime: performance.now(),
      frame: 0,
    }
    stateRef.current = state

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    // Click (not drag) on the terrain picks a point.
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      const p = propsRef.current
      if (!down || !p.picking || !state.terrain) return
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      state.raycaster.setFromCamera(ndc, camera)
      const hit = state.raycaster.intersectObject(state.terrain)[0]
      if (hit) p.onPick(hit.point.x, -hit.point.z)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    let lastReport = 0
    const tick = (now: number) => {
      state.frame = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - state.lastTime) / 1000)
      state.lastTime = now
      const p = propsRef.current
      const route = p.routes.find((r) => r.id === p.selectedRouteId)
      if (route && route.path_xy.length > 1) {
        if (p.playing) {
          // Replays the modelled walk: 1x = 60 simulated minutes per real minute... scaled
          // so a whole route takes ~24 s at speed 1.
          state.progress = Math.min(1, state.progress + (dt * p.speed) / 24)
          if (now - lastReport > 80 || state.progress >= 1) {
            lastReport = now
            p.onProgress(state.progress)
          }
          if (state.progress >= 1) p.onPlaybackEnd()
        }
        const pt = pointAlong(route.path_xy, state.progress)
        const grid = p.grid
        const z = sampleElevation(grid, pt.x, pt.y)
        walker.visible = state.progress > 0 || p.playing
        walker.position.set(pt.x, (Number.isFinite(z) ? z - grid.min : 0) * p.exaggeration, -pt.y)
        walker.rotation.y = pt.heading
        const ring = walker.getObjectByName('ring')
        if (ring) ring.scale.setScalar(1 + 0.15 * Math.sin(now / 250))
        if (p.follow && walker.visible) {
          const delta = walker.position.clone().sub(controls.target).multiplyScalar(0.08)
          controls.target.add(delta)
          camera.position.add(delta)
        }
      } else {
        walker.visible = false
      }
      controls.update()
      renderer.render(scene, camera)
    }
    state.frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(state.frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      disposeGroup(routeGroup)
      disposeGroup(pinGroup)
      disposeGroup(overlayGroup)
      if (state.terrain) {
        state.terrain.geometry.dispose()
        ;(state.terrain.material as THREE.MeshStandardMaterial).map?.dispose()
        ;(state.terrain.material as THREE.Material).dispose()
      }
      renderer.dispose()
      host.removeChild(renderer.domElement)
      stateRef.current = null
    }
  }, [])

  // --- Terrain mesh --------------------------------------------------------
  const { grid, textureUrl } = props
  useEffect(() => {
    const state = stateRef.current
    if (!state) return
    if (state.terrain) {
      state.scene.remove(state.terrain)
      state.terrain.geometry.dispose()
      ;(state.terrain.material as THREE.MeshStandardMaterial).map?.dispose()
      ;(state.terrain.material as THREE.Material).dispose()
    }
    const width = (grid.cols - 1) * grid.cell
    const height = (grid.rows - 1) * grid.cell
    const geom = new THREE.PlaneGeometry(width, height, grid.cols - 1, grid.rows - 1)
    geom.rotateX(-Math.PI / 2)
    const pos = geom.attributes.position as THREE.BufferAttribute
    // NoData edges (display only) take the nearest valid height in the row, so the
    // mesh has no artificial cliffs; the planner still never routes across them.
    for (let r = 0; r < grid.rows; r++) {
      let last = Number.NaN
      const row = r * grid.cols
      for (let c = 0; c < grid.cols; c++) {
        const z = grid.z[row + c]
        if (Number.isFinite(z)) last = z
        pos.setY(row + c, Number.isFinite(last) ? last - grid.min : 0)
      }
    }
    geom.computeVertexNormals()
    const tex = new THREE.TextureLoader().load(textureUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = state.renderer.capabilities.getMaxAnisotropy()
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: '#e6d2c9',
      roughness: 0.95,
      metalness: 0,
    })
    const mesh = new THREE.Mesh(geom, mat)
    // Plane is centred on the origin; move it so vertices sit on cell centres.
    mesh.position.set(
      grid.left + grid.cell / 2 + width / 2,
      0,
      -(grid.top - grid.cell / 2 - height / 2),
    )
    state.terrain = mesh
    state.scene.add(mesh)

    const size = siteSize(grid)
    const relief = grid.max - grid.min
    state.camera.near = size / 2000
    state.camera.far = size * 20
    state.camera.updateProjectionMatrix()
    state.scene.fog = new THREE.Fog(CANVAS, size * 1.6, size * 6)
    const cx = mesh.position.x
    const cz = mesh.position.z
    state.controls.target.set(cx, relief * 0.3, cz)
    state.camera.position.set(cx - size * 0.35, size * 0.55, cz + size * 0.75)
    state.controls.maxDistance = size * 4
    state.controls.minDistance = size / 200
    state.walker.scale.setScalar(Math.max(1, size / 120))
    state.progress = 0
  }, [grid, textureUrl])

  // --- Vertical exaggeration ----------------------------------------------
  const { exaggeration } = props
  useEffect(() => {
    const state = stateRef.current
    if (state?.terrain) state.terrain.scale.y = exaggeration
  }, [exaggeration, grid])

  // --- Routes, waypoints and overlays --------------------------------------
  const { routes, selectedRouteId, waypoints, overlayLines, overlayPins } = props
  useEffect(() => {
    const state = stateRef.current
    if (!state) return
    disposeGroup(state.routeGroup)
    disposeGroup(state.pinGroup)
    disposeGroup(state.overlayGroup)
    const size = siteSize(grid)
    const lift = size / 900
    const yAt = (x: number, y: number) => {
      const z = sampleElevation(grid, x, y)
      return (Number.isFinite(z) ? z - grid.min : 0) * exaggeration + lift
    }

    const tubeFor = (
      pts: [number, number][],
      radius: number,
      color: string,
      opacity: number,
      dy = 0,
    ) => {
      // Densify so the tube follows the surface between sparse vertices.
      const dense: THREE.Vector3[] = []
      const step = grid.cell
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[i + 1]
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step))
        for (let k = 0; k < n; k++) {
          const t = k / n
          const x = ax + (bx - ax) * t
          const y = ay + (by - ay) * t
          dense.push(new THREE.Vector3(x, yAt(x, y) + dy, -y))
        }
      }
      const last = pts[pts.length - 1]
      dense.push(new THREE.Vector3(last[0], yAt(last[0], last[1]) + dy, -last[1]))
      if (dense.length < 2) return null
      const curve = new THREE.CatmullRomCurve3(dense, false, 'centripetal', 0)
      const geom = new THREE.TubeGeometry(curve, Math.min(4000, dense.length * 2), radius, 8, false)
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthTest: true,
      })
      return new THREE.Mesh(geom, mat)
    }

    // Selected route last so it draws on top; casing tube underneath for contrast.
    const ordered = [...routes].sort((a) => (a.id === selectedRouteId ? 1 : -1))
    for (const route of ordered) {
      const selected = route.id === selectedRouteId
      const r = (selected ? size / 420 : size / 700) * 1
      // Casing sits lower so the coloured tube shows on top with a dark edge.
      const casing = tubeFor(route.path_xy, r * 1.6, MAIN, selected ? 0.85 : 0.5, -r * 0.9)
      const line = tubeFor(route.path_xy, r, ROUTE_COLORS[route.id], selected ? 1 : 0.55)
      if (casing) state.routeGroup.add(casing)
      if (line) state.routeGroup.add(line)
    }

    for (const [idx, ol] of (overlayLines ?? []).entries()) {
      const line = tubeFor(ol.points, size / 900, ol.color, 0.9)
      if (line) state.overlayGroup.add(line)
      // Stagger labels along each line so neighbouring options don't overlap.
      const mid = ol.points[Math.floor(ol.points.length * (0.3 + 0.35 * (idx % 2)))]
      if (mid && ol.label) {
        const label = labelSprite(ol.label, MAIN, SECONDARY)
        label.position.set(mid[0], yAt(mid[0], mid[1]) + size / 60, -mid[1])
        state.overlayGroup.add(label)
      }
    }

    const pin = (
      x: number,
      y: number,
      text: string,
      fill: string,
      ink: string,
      group: THREE.Group,
    ) => {
      const base = yAt(x, y)
      const h = size / 25
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(size / 2500, size / 2500, h, 6),
        new THREE.MeshBasicMaterial({ color: fill }),
      )
      stem.position.set(x, base + h / 2, -y)
      const label = labelSprite(text, fill, ink)
      label.position.set(x, base + h, -y)
      group.add(stem, label)
    }
    waypoints.forEach(([x, y], i) => {
      const isStart = i === 0
      const isEnd = i === waypoints.length - 1 && waypoints.length > 1
      const text = isStart ? 'A' : isEnd ? 'B' : `S${i}`
      const fill = isStart ? SECONDARY : isEnd ? ACCENT : MAIN
      const ink = isStart ? MAIN : SECONDARY
      pin(x, y, text, fill, ink, state.pinGroup)
    })
    for (const p of overlayPins ?? []) pin(p.x, p.y, p.label, MAIN, SECONDARY, state.overlayGroup)
  }, [routes, selectedRouteId, waypoints, overlayLines, overlayPins, grid, exaggeration])

  // --- Playback restart ------------------------------------------------------
  const { restartNonce } = props
  useEffect(() => {
    const state = stateRef.current
    if (state) state.progress = 0
  }, [restartNonce, selectedRouteId, routes])

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 ${props.picking ? 'cursor-crosshair' : 'cursor-grab'}`}
      aria-label="3D terrain view"
      role="img"
    />
  )
}
