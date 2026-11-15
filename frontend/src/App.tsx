import { useMemo, useState } from 'react'
import { MarsMap, type ViewFocus } from './MarsMap'
import { formatMarsCoordinate } from './marsCatalog'
import { useBackendHealth, type BackendStatus } from './useBackendHealth'
import { useMarsData } from './useMarsData'
import { ScenarioPanel } from './ScenarioPanel'
import { extentOf, optionExtent } from './scenarioLayers'
import { useScenario } from './useScenario'

const SCENARIO_ID = 'hawksbill-gap'
const FOCUS_BUTTON =
  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8F5A53]'

const STATUS_CONFIG: Record<
  BackendStatus,
  { label: string; dot: string; text: string; badge: string }
> = {
  connecting: {
    label: 'Connecting',
    dot: 'bg-[#8F5A53] animate-pulse',
    text: 'text-[#A3A3A3]',
    badge: 'border-[#8F5A53]/30 bg-[#8F5A53]/20 text-[#EBEBEB]',
  },
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-400',
    text: 'text-[#EBEBEB]',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-[#8F5A53]',
    text: 'text-[#A3A3A3]',
    badge: 'border-[#8F5A53]/40 bg-[#8F5A53]/20 text-[#EBEBEB]',
  },
}

function App() {
  const { status, error } = useBackendHealth()
  const { catalog, landmarks, dataSource } = useMarsData()
  const statusInfo = STATUS_CONFIG[status]
  const scenarioState = useScenario(SCENARIO_ID)
  const { scenario } = scenarioState
  // Off by default: every drive in the track is already part of a route option, so
  // showing it at first doubles each line. It is an opt-in provenance view by sol.
  const [showRoverTrack, setShowRoverTrack] = useState(false)
  // Kept separate from the landmark selection: picking a stop never clears a landmark.
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  // The planner's chosen route option, shared by the panel list and the map lines.
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#171717] text-[#EBEBEB]">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#333333] bg-[#212121] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-[#8F5A53]/25 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#EBEBEB]">
            UI PLAYGROUND
          </span>
          <h1 className="text-lg font-bold tracking-tight text-[#EBEBEB] sm:text-xl">
            CrimsonHorizon
          </h1>
          <span className="hidden text-xs text-[#A3A3A3] sm:inline">
            Jezero Crater · {catalog.crs}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-lg border border-[#333333] bg-[#1A1A1A] px-2.5 py-1 font-mono text-[#EBEBEB]">
            {cursorCoords
              ? formatMarsCoordinate(cursorCoords[0], cursorCoords[1])
              : formatMarsCoordinate(catalog.default_center[0], catalog.default_center[1])}
            {' · '}z{zoom.toFixed(1)}
          </span>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.badge}`}
            role="status"
            aria-live="polite"
            title={error ?? undefined}
          >
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
            <span>API: {statusInfo.label}</span>
            <span className="text-[#A3A3A3]">
              ({dataSource === 'backend' ? 'live catalog' : 'built-in catalog'})
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar & Map Canvas */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-[#333333] bg-[#212121] p-4 md:w-80 md:border-r md:border-b-0">
          {/* Quick Focus Section */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              01 — Quick Focus
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!scenario}
                onClick={() => {
                  if (scenario) setFocusTarget({ extent: extentOf(scenario), nonce: Date.now() })
                }}
                className={`${FOCUS_BUTTON} cursor-pointer border-transparent bg-[#8F5A53] text-[#EBEBEB] shadow-sm hover:bg-[#9F665E] active:bg-[#7E4D46] disabled:cursor-not-allowed disabled:bg-[#282828] disabled:text-[#737373]`}
              >
                Hawksbill Gap
              </button>
              <button
                type="button"
                onClick={() => jumpTo(catalog.default_center, catalog.default_zoom)}
                className={`${FOCUS_BUTTON} cursor-pointer border-transparent bg-[#EBEBEB] text-[#212121] shadow-sm hover:bg-white active:bg-[#D6D6D6]`}
              >
                Jezero overview
              </button>
              <button
                type="button"
                onClick={() => jumpTo([0, 0], 2)}
                className={`${FOCUS_BUTTON} cursor-pointer border-[#3E3E3E] bg-transparent text-[#EBEBEB] hover:border-[#EBEBEB] hover:bg-[#2A2A2A]`}
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
            selectedStopId={selectedStopId}
            onRetry={scenarioState.retry}
            onToggleRoverTrack={() => setShowRoverTrack((on) => !on)}
            onSelectStop={(id) => {
              const stop = scenario?.stops.find((s) => s.id === id)
              setSelectedStopId(id)
              if (stop) jumpTo([stop.coordinates[0], stop.coordinates[1]], 18)
            }}
            selectedOptionId={selectedOptionId}
            onSelectOption={(id) => {
              // Pressing the selected option again clears it, like a toggle button.
              const next = id === selectedOptionId ? null : id
              setSelectedOptionId(next)
              const extent = next && scenario ? optionExtent(scenario, next) : null
              if (extent) setFocusTarget({ extent, nonce: Date.now() })
            }}
          />

          {/* Global Base Layer */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              02 — Base Layer
            </h2>
            <div className="mt-2 space-y-1.5">
              {globalLayers.map((layer) => {
                const isSelected = activeBaseLayerId === layer.id
                return (
                  <label
                    key={layer.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'border-[#8F5A53] bg-[#8F5A53]/15 text-[#EBEBEB]'
                        : 'border-[#333333] bg-[#1A1A1A] text-[#A3A3A3] hover:border-[#4A4A4A] hover:text-[#EBEBEB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mars-base-layer"
                      checked={isSelected}
                      onChange={() => setActiveBaseLayerId(layer.id)}
                      className="accent-[#8F5A53]"
                    />
                    <span>{layer.name}</span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Jezero Overlays */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              03 — Jezero Overlays
            </h2>
            <div className="mt-2 space-y-1.5">
              {overlayLayers.map((layer) => {
                const isChecked = visibleOverlayIds.has(layer.id)
                return (
                  <label
                    key={layer.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                      isChecked
                        ? 'border-[#8F5A53] bg-[#8F5A53]/15 text-[#EBEBEB]'
                        : 'border-[#333333] bg-[#1A1A1A] text-[#A3A3A3] hover:border-[#4A4A4A] hover:text-[#EBEBEB]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOverlay(layer.id)}
                      className="accent-[#8F5A53]"
                    />
                    <span>{layer.name}</span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Jezero Reference Points */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              04 — Reference Points
            </h2>
            <div className="mt-2 space-y-1.5">
              {landmarks.features.map((feature) => {
                const isSelected = feature.id === selectedLandmarkId
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => jumpTo(feature.geometry.coordinates, 14, feature.id)}
                    className={`w-full cursor-pointer rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-[#8F5A53] bg-[#8F5A53]/25 text-[#EBEBEB] shadow-sm'
                        : 'border-[#333333] bg-[#1A1A1A] text-[#EBEBEB] hover:border-[#4A4A4A]'
                    }`}
                  >
                    <div className="font-semibold">{feature.properties.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#A3A3A3]">
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

          {/* Selected Landmark Details */}
          {selectedLandmark && (
            <section className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-3.5 text-xs">
              <div className="font-semibold text-[#EBEBEB]">{selectedLandmark.properties.name}</div>
              <p className="mt-1 leading-relaxed text-[#A3A3A3]">
                {selectedLandmark.properties.summary}
              </p>
              <p className="mt-2 font-mono text-[11px] text-[#737373]">
                Source: {selectedLandmark.properties.source}
              </p>
            </section>
          )}
        </aside>

        {/* Map Viewport */}
        <main className="relative min-h-72 flex-1 bg-[#171717]">
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
          />
        </main>
      </div>
    </div>
  )
}

export default App
