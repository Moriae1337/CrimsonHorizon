import { Suspense, lazy, useMemo, useState } from 'react'
import { MarsMap, type ViewFocus } from './MarsMap.tsx'
import { formatMarsCoordinate } from './marsCatalog.ts'
import { useBackendHealth, type BackendStatus } from './useBackendHealth.ts'
import { useMarsData } from './useMarsData.ts'
import { ScenarioPanel } from './ScenarioPanel.tsx'
import { downloadScenarioGeoJson } from './scenarioExport.ts'
import { extentOf, optionExtent } from './scenarioLayers.ts'
import { useEnvironment } from './useEnvironment.ts'
import { useScenario } from './useScenario.ts'
import { useTranslation } from './i18n/useTranslation.ts'
// three.js views load on demand so the 2D map stays light.
const MarsGlobe = lazy(() => import('./MarsGlobe.tsx').then((m) => ({ default: m.MarsGlobe })))
const SiteExplorer = lazy(() =>
  import('./SiteExplorer.tsx').then((m) => ({ default: m.SiteExplorer })),
)
import { RoutePlannerPanel } from './RoutePlannerPanel.tsx'
import { SITE_LABELS } from './plannerText.ts'
import { textureUrl } from './sites.ts'
import { useRoutePlanner } from './useRoutePlanner.ts'

type SidebarMode = 'scenario' | 'planner'

const SIDEBAR_LABELS: Record<SidebarMode, { en: string; uk: string }> = {
  scenario: { en: 'Hawksbill scenario', uk: 'Сценарій Hawksbill' },
  planner: { en: 'Route planner', uk: 'Планувальник маршрутів' },
}

type ViewMode = 'map' | 'site3d' | 'globe'

const VIEW_LABELS: Record<ViewMode, { en: string; uk: string }> = {
  map: { en: '2D Map', uk: '2D-мапа' },
  site3d: { en: '3D Site', uk: '3D-ділянка' },
  globe: { en: 'Globe', uk: 'Глобус' },
}

const SCENARIO_ID = 'hawksbill-gap'

const STATUS_CONFIG: Record<
  BackendStatus,
  { label: string; dot: string; text: string; badge: string }
> = {
  connecting: {
    label: 'Connecting',
    dot: 'bg-accent animate-pulse',
    text: 'text-text-secondary',
    badge: 'border-accent/30 bg-accent/20 text-text-main',
  },
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-400',
    text: 'text-text-main',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-accent',
    text: 'text-text-secondary',
    badge: 'border-accent/40 bg-accent/20 text-text-main',
  },
}

function App() {
  const { status, error } = useBackendHealth()
  const { catalog, landmarks } = useMarsData()
  const statusInfo = STATUS_CONFIG[status]
  const scenarioState = useScenario(SCENARIO_ID)
  const { scenario } = scenarioState
  const environmentState = useEnvironment(SCENARIO_ID)
  const { locale, setLocale } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('planner')
  // One planner for the 2D map and the 3D view: same site, points and routes.
  const planner = useRoutePlanner(
    viewMode === 'site3d' || (viewMode === 'map' && sidebarMode === 'planner'),
  )
  const plannerOn = viewMode === 'map' && sidebarMode === 'planner'
  const site = SITE_LABELS[planner.siteId]

  const sampleSols = useMemo(
    () => new Set(scenario?.stops.flatMap((stop) => stop.samples.map((s) => s.sol)) ?? []),
    [scenario],
  )

  // Rover track visibility toggle
  const [showRoverTrack, setShowRoverTrack] = useState(false)
  // Stop selection
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  // Selected route option (Option A vs Option B)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>('A')

  const globalLayers = useMemo(
    () => catalog.layers.filter((layer) => layer.scope === 'global'),
    [catalog.layers],
  )
  const overlayLayers = useMemo(
    () => catalog.layers.filter((layer) => layer.scope !== 'global'),
    [catalog.layers],
  )

  const [activeBaseLayerId, setActiveBaseLayerId] = useState<string>('mola-color-hillshade')
  const [visibleOverlayIds, setVisibleOverlayIds] = useState<Set<string>>(
    () => new Set(['jezero-ctx-ortho']),
  )
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(
    'octavia-e-butler-landing',
  )
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null)
  const [zoom, setZoom] = useState<number>(catalog.default_zoom)
  const [focusTarget, setFocusTarget] = useState<ViewFocus | null>(null)

  const selectedLandmark = useMemo(
    () => landmarks.features.find((feature) => feature.id === selectedLandmarkId) ?? null,
    [landmarks.features, selectedLandmarkId],
  )

  const toggleOverlay = (id: string) => {
    setVisibleOverlayIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const jumpTo = (
    center: [number, number],
    targetZoom: number,
    landmarkId: string | null = null,
  ) => {
    if (landmarkId !== null) {
      setSelectedLandmarkId(landmarkId)
    }
    setFocusTarget({ center, zoom: targetZoom, nonce: Date.now() })
  }

  const handleExportGeoJson = () => {
    if (scenario) {
      downloadScenarioGeoJson(scenario, selectedOptionId)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-text-main">
      {/* Top Header (MOMAR Style: Clean & Operational) */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded bg-accent/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-text-main">
            EVA PLANNER
          </span>
          <h1 className="text-base font-bold tracking-tight text-text-main sm:text-lg">
            CrimsonHorizon
          </h1>
          <span className="hidden text-xs text-text-secondary lg:inline">
            {viewMode === 'globe'
              ? 'Mars · IAU nomenclature'
              : viewMode === 'site3d' || plannerOn
                ? `${site.name} · ${site.region}`
                : 'Hawksbill Gap · Jezero crater'}
          </span>
          <nav
            aria-label="View mode"
            className="ml-1 inline-flex rounded-lg border border-card-border bg-input p-0.5"
          >
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === mode
                    ? 'bg-accent text-text-main'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {VIEW_LABELS[mode][locale === 'uk' ? 'uk' : 'en']}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Coordinate & Zoom display */}
          <span className="rounded-lg border border-card-border bg-input px-2.5 py-1 font-mono text-[11px] text-text-main">
            {cursorCoords
              ? formatMarsCoordinate(cursorCoords[0], cursorCoords[1])
              : formatMarsCoordinate(catalog.default_center[0], catalog.default_center[1])}
            {' · '}z{zoom.toFixed(1)}
          </span>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'uk' : 'en')}
            className="rounded-lg border border-card-border bg-input px-2 py-1 text-xs font-semibold hover:border-secondary cursor-pointer"
            title="Switch Language / Змінити мову"
          >
            {locale === 'en' ? '🇺🇦 UK' : '🇬🇧 EN'}
          </button>

          {/* Export Action */}
          {scenario && (
            <button
              type="button"
              onClick={handleExportGeoJson}
              className="hidden sm:inline-flex rounded-lg border border-card-border bg-card-elevated px-2.5 py-1 text-xs font-medium text-text-main hover:border-secondary hover:bg-card cursor-pointer"
            >
              Export GeoJSON
            </button>
          )}

          {/* API Status Pill */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.badge}`}
            role="status"
            aria-live="polite"
            title={error ?? undefined}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
            <span>{statusInfo.label}</span>
          </div>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-text-secondary">
            Loading 3D…
          </div>
        }
      >
        {viewMode === 'site3d' && <SiteExplorer planner={planner} scenario={scenario} />}

        {viewMode === 'globe' && (
          <div className="relative min-h-0 flex-1 bg-canvas">
            <MarsGlobe
              layers={globalLayers}
              onOpenSite={(id) => {
                planner.setSiteId(id)
                setViewMode('site3d')
              }}
              onOpenMap={(lon, lat, z) => {
                setFocusTarget({ center: [lon, lat], zoom: z, nonce: Date.now() })
                setViewMode('map')
              }}
            />
          </div>
        )}
      </Suspense>

      {/* Main Layout: MOMAR Sidebar + Map Canvas */}
      {viewMode === 'map' && (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Sidebar Panel (MOMAR Architecture: 420px width) */}
          <aside className="flex w-full shrink-0 flex-col overflow-hidden border-b border-card-border bg-card md:w-[420px] lg:w-[460px] md:border-r md:border-b-0 shadow-lg z-10">
            <nav
              aria-label="Sidebar mode"
              className="flex shrink-0 gap-1 border-b border-card-border bg-input p-1.5"
            >
              {(Object.keys(SIDEBAR_LABELS) as SidebarMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={sidebarMode === mode}
                  onClick={() => setSidebarMode(mode)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold cursor-pointer ${
                    sidebarMode === mode
                      ? 'bg-accent text-text-main'
                      : 'text-text-secondary hover:bg-card-elevated hover:text-text-main'
                  }`}
                >
                  {SIDEBAR_LABELS[mode][locale === 'uk' ? 'uk' : 'en']}
                </button>
              ))}
            </nav>
            {plannerOn ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <RoutePlannerPanel planner={planner} />
              </div>
            ) : (
              <ScenarioPanel
                status={scenarioState.status}
                scenario={scenario}
                error={scenarioState.error}
                canRetry={scenarioState.canRetry}
                showRoverTrack={showRoverTrack}
                selectedStopId={selectedStopId}
                selectedOptionId={selectedOptionId}
                onRetry={scenarioState.retry}
                onToggleRoverTrack={() => setShowRoverTrack((on) => !on)}
                onSelectStop={(id) => {
                  const stop = scenario?.stops.find((s) => s.id === id)
                  setSelectedStopId(id)
                  if (stop) jumpTo([stop.coordinates[0], stop.coordinates[1]], 18)
                }}
                onSelectOption={(id) => {
                  const next = id === selectedOptionId ? null : id
                  setSelectedOptionId(next)
                  const extent = next && scenario ? optionExtent(scenario, next) : null
                  if (extent) setFocusTarget({ extent, nonce: Date.now() })
                }}
                // Layers & Navigation props
                globalLayers={globalLayers}
                overlayLayers={overlayLayers}
                activeBaseLayerId={activeBaseLayerId}
                onSelectBaseLayer={setActiveBaseLayerId}
                visibleOverlayIds={visibleOverlayIds}
                onToggleOverlay={toggleOverlay}
                landmarks={landmarks}
                selectedLandmarkId={selectedLandmarkId}
                onSelectLandmark={(id) => {
                  const feature = landmarks.features.find((f) => f.id === id)
                  if (feature) jumpTo(feature.geometry.coordinates, 14, id)
                }}
                selectedLandmark={selectedLandmark}
                onFocusScenario={() => {
                  if (scenario) setFocusTarget({ extent: extentOf(scenario), nonce: Date.now() })
                }}
                onFocusJezero={() => jumpTo(catalog.default_center, catalog.default_zoom)}
                onFocusGlobal={() => jumpTo([0, 0], 2)}
                // Environment & Export
                environment={environmentState.environment}
                sampleSols={sampleSols}
                onExportGeoJson={handleExportGeoJson}
              />
            )}
          </aside>

          {/* Map Viewport */}
          <main className="relative min-h-72 flex-1 bg-canvas">
            <MarsMap
              catalog={catalog}
              landmarks={landmarks}
              activeBaseLayerId={activeBaseLayerId}
              visibleOverlayIds={visibleOverlayIds}
              selectedLandmarkId={selectedLandmarkId}
              focusTarget={focusTarget}
              scenario={scenario}
              showRoverTrack={showRoverTrack}
              selectedStopId={selectedStopId}
              onSelectLandmark={setSelectedLandmarkId}
              selectedOptionId={selectedOptionId}
              onSelectStop={setSelectedStopId}
              onSelectOption={setSelectedOptionId}
              onCursorMove={setCursorCoords}
              onZoomChange={setZoom}
              planner={
                plannerOn && planner.pkg
                  ? {
                      pkg: planner.pkg,
                      textureUrl: planner.apiUrl ? textureUrl(planner.apiUrl, planner.pkg) : null,
                      routes: planner.routes,
                      selectedRouteId: planner.selectedRouteId,
                      waypoints: planner.waypoints,
                      hasEnd: planner.hasEnd,
                      picking: planner.pickTarget !== null,
                      onPick: (x, y) => {
                        planner.pick(x, y)
                      },
                      onSelectRoute: planner.setSelectedRouteId,
                    }
                  : null
              }
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
