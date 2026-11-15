import { useMemo, useState } from 'react'
import { MarsMap, type ViewFocus } from './MarsMap'
import { formatMarsCoordinate } from './marsCatalog'
import { useBackendHealth, type BackendStatus } from './useBackendHealth'
import { useMarsData } from './useMarsData'
import { ScenarioPanel } from './ScenarioPanel'
import { extentOf } from './scenarioLayers'
import { useScenario } from './useScenario'

const SCENARIO_ID = 'hawksbill-gap'
const FOCUS_BUTTON =
  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400'

const STATUS_STYLES: Record<BackendStatus, { label: string; dot: string; text: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-amber-400', text: 'text-amber-300' },
  connected: { label: 'Connected', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  disconnected: { label: 'Disconnected', dot: 'bg-red-500', text: 'text-red-400' },
}

function App() {
  const { status, error } = useBackendHealth()
  const { catalog, landmarks, dataSource } = useMarsData()
  const style = STATUS_STYLES[status]
  const scenarioState = useScenario(SCENARIO_ID)
  const { scenario } = scenarioState
  // Off by default: every drive in the track is already part of a route option, so
  // showing it at first doubles each line. It is an opt-in provenance view by sol.
  const [showRoverTrack, setShowRoverTrack] = useState(false)

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
    () => new Set(['jezero-ctx-ortho', 'jezero-hirise-ortho']),
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-tight text-orange-500 sm:text-xl">
            CrimsonHorizon
          </h1>
          <span className="hidden text-xs uppercase tracking-wider text-slate-400 sm:inline">
            Jezero Crater · {catalog.crs}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="rounded border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-slate-300">
            {cursorCoords
              ? formatMarsCoordinate(cursorCoords[0], cursorCoords[1])
              : formatMarsCoordinate(catalog.default_center[0], catalog.default_center[1])}
            {' · '}z{zoom.toFixed(1)}
          </span>

          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
            title={error ?? undefined}
          >
            <span className="text-slate-400">API:</span>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
            <span className={`font-semibold ${style.text}`}>{style.label}</span>
            <span className="text-slate-500">
              ({dataSource === 'backend' ? 'live catalog' : 'built-in catalog'})
            </span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-slate-800 bg-slate-900/75 p-4 md:w-80 md:border-r md:border-b-0">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Focus
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!scenario}
                onClick={() => {
                  if (scenario) setFocusTarget({ extent: extentOf(scenario), nonce: Date.now() })
                }}
                className={`${FOCUS_BUTTON} border-orange-500/40 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500`}
              >
                Hawksbill Gap
              </button>
              <button
                type="button"
                onClick={() => jumpTo(catalog.default_center, catalog.default_zoom)}
                className={`${FOCUS_BUTTON} border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800`}
              >
                Jezero overview
              </button>
              <button
                type="button"
                onClick={() => jumpTo([0, 0], 2)}
                className={`${FOCUS_BUTTON} border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800`}
              >
                Global Mars
              </button>
            </div>
          </section>

          <ScenarioPanel
            status={scenarioState.status}
            scenario={scenario}
            error={scenarioState.error}
            canRetry={scenarioState.canRetry}
            showRoverTrack={showRoverTrack}
            onRetry={scenarioState.retry}
            onToggleRoverTrack={() => setShowRoverTrack((on) => !on)}
          />

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Global Base Layer
            </h2>
            <div className="mt-2 space-y-1.5">
              {globalLayers.map((layer) => (
                <label
                  key={layer.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-xs hover:border-slate-700"
                >
                  <input
                    type="radio"
                    name="mars-base-layer"
                    checked={activeBaseLayerId === layer.id}
                    onChange={() => setActiveBaseLayerId(layer.id)}
                    className="accent-orange-500"
                  />
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Jezero Overlays
            </h2>
            <div className="mt-2 space-y-1.5">
              {overlayLayers.map((layer) => (
                <label
                  key={layer.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-xs hover:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={visibleOverlayIds.has(layer.id)}
                    onChange={() => toggleOverlay(layer.id)}
                    className="accent-orange-500"
                  />
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Jezero Reference Points
            </h2>
            <div className="mt-2 space-y-1.5">
              {landmarks.features.map((feature) => {
                const isSelected = feature.id === selectedLandmarkId
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => jumpTo(feature.geometry.coordinates, 14, feature.id)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? 'border-orange-500/60 bg-orange-500/15 text-orange-200'
                        : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold">{feature.properties.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {formatMarsCoordinate(
                        feature.geometry.coordinates[0],
                        feature.geometry.coordinates[1],
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedLandmark && (
            <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
              <div className="font-semibold text-orange-300">
                {selectedLandmark.properties.name}
              </div>
              <p className="mt-1 text-slate-300">{selectedLandmark.properties.summary}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Source: {selectedLandmark.properties.source}
              </p>
            </section>
          )}
        </aside>

        <main className="relative min-h-72 flex-1">
          <MarsMap
            catalog={catalog}
            landmarks={landmarks}
            activeBaseLayerId={activeBaseLayerId}
            visibleOverlayIds={visibleOverlayIds}
            selectedLandmarkId={selectedLandmarkId}
            focusTarget={focusTarget}
            scenario={scenario}
            showRoverTrack={showRoverTrack}
            onSelectLandmark={setSelectedLandmarkId}
            onCursorMove={setCursorCoords}
            onZoomChange={setZoom}
          />
        </main>
      </div>
    </div>
  )
}

export default App
