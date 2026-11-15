import { useState } from 'react'
import { ElevationProfile } from './ElevationProfile.tsx'
import { EvaBudgetCard } from './EvaBudgetCard.tsx'
import { formatMarsCoordinate } from './marsCatalog.ts'
import { RouteComparisonPanel } from './RouteComparisonPanel.tsx'
import { formatMeters, type Scenario, type ScenarioStatus } from './scenario.ts'
import { ScienceStopCard } from './ScienceStopCard.tsx'
import { STOP_COLOR, formatSamples, optionStyle, stopLabel } from './scenarioLayers.ts'
import type { EnvironmentContext } from './environment.ts'

export interface ScenarioPanelProps {
  status: ScenarioStatus
  scenario: Scenario | null
  error: string | null
  canRetry: boolean
  showRoverTrack: boolean
  selectedStopId: string | null
  selectedOptionId: string | null
  onRetry: () => void
  onToggleRoverTrack: () => void
  onSelectStop: (id: string) => void
  onSelectOption: (id: string | null) => void

  // Integrated tabs props (MOMAR architecture)
  globalLayers?: Array<{ id: string; name: string }>
  overlayLayers?: Array<{ id: string; name: string }>
  activeBaseLayerId?: string
  onSelectBaseLayer?: (id: string) => void
  visibleOverlayIds?: Set<string>
  onToggleOverlay?: (id: string) => void
  landmarks?: {
    features: Array<{
      id: string
      properties: { name: string; summary: string; source: string }
      geometry: { coordinates: [number, number] }
    }>
  }
  selectedLandmarkId?: string | null
  onSelectLandmark?: (id: string) => void
  selectedLandmark?: {
    properties: { name: string; summary: string; source: string }
  } | null
  onFocusScenario?: () => void
  onFocusJezero?: () => void
  onFocusGlobal?: () => void

  // Environment state
  environment?: EnvironmentContext | null
  sampleSols?: Set<number>

  // Export
  onExportGeoJson?: () => void
}

type TabType = 'plan' | 'science' | 'safety' | 'layers'

const STATUS_TEXT: Record<ScenarioStatus, string> = {
  loading: 'Loading scenario…',
  ready: 'Scenario loaded.',
  unavailable: 'Scenario unavailable. The base map still works.',
  unsupported: 'Scenario version not supported. The base map still works.',
}

function StopDiamond() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <polygon
        points="9,1 17,9 9,17 1,9"
        fill={STOP_COLOR}
        stroke="rgba(2, 6, 23, 0.85)"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="9" r="1.8" fill="#020617" />
    </svg>
  )
}

export function ScenarioPanel({
  status,
  scenario,
  error,
  canRetry,
  showRoverTrack,
  selectedStopId,
  selectedOptionId,
  onRetry,
  onToggleRoverTrack,
  onSelectStop,
  onSelectOption,
  globalLayers = [],
  overlayLayers = [],
  activeBaseLayerId,
  onSelectBaseLayer,
  visibleOverlayIds = new Set(),
  onToggleOverlay,
  landmarks,
  selectedLandmarkId,
  onSelectLandmark,
  selectedLandmark,
  onFocusScenario,
  onFocusJezero,
  onFocusGlobal,
  environment: _environment,
  onExportGeoJson,
}: ScenarioPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('plan')
  const failed = status === 'unavailable' || status === 'unsupported'

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'plan', label: 'Plan', icon: '🗺️' },
    { id: 'science', label: 'Science', icon: '🔬' },
    { id: 'safety', label: 'Safety', icon: '⚠️' },
    { id: 'layers', label: 'Layers', icon: '🛰️' },
  ]

  return (
    <div className="flex flex-col h-full text-xs text-text-main">
      {/* Top Tab Bar (MOMAR Navigation) */}
      <nav
        aria-label="Planner panels"
        className="flex border-b border-card-border bg-input shrink-0"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-1 text-center font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'border-b-2 border-accent bg-card text-text-main'
                  : 'text-text-muted hover:bg-card-elevated hover:text-text-secondary'
              }`}
            >
              <span className="text-[13px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Loading or Failure Banners */}
      {failed && (
        <div
          role="status"
          aria-live="polite"
          className="m-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-200"
        >
          <p className="font-medium">{STATUS_TEXT[status]}</p>
          {error && <p className="mt-1 text-[11px] text-red-300/90">{error}</p>}
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 w-full rounded border border-red-400/40 bg-red-950/40 py-1 text-xs font-semibold text-red-200 hover:bg-red-900/50 cursor-pointer"
            >
              Retry loading scenario
            </button>
          )}
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* ================= TAB 1: PLAN ================= */}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            {scenario && (
              <>
                {/* 1. Route Selector Cards */}
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                    1 · Select Excursion Route
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scenario.route_options.map((option) => {
                      const style = optionStyle(scenario.route_options, option.id)
                      const isSelected = option.id === selectedOptionId
                      const isOptionA = option.id === 'A'
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onSelectOption(option.id)}
                          className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-accent bg-accent/20 ring-1 ring-accent shadow-sm'
                              : 'border-card-border bg-input hover:border-card-border/90 hover:bg-card-elevated'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-canvas uppercase"
                              style={{ backgroundColor: style.color }}
                            >
                              Option {option.id}
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-text-main">
                              {formatMeters(option.round_trip_m)}
                            </span>
                          </div>
                          <div className="font-medium text-text-main text-[11px] line-clamp-1">
                            {isOptionA ? 'Direct to Wildcat Ridge' : 'Loop via Skinner Ridge'}
                          </div>
                          <div className="mt-1 text-[10px] text-text-secondary flex justify-between">
                            <span>
                              Ascent: {option.ascent_m ? `${option.ascent_m.toFixed(1)} m` : '—'}
                            </span>
                            <span className="text-text-muted">
                              {isOptionA ? 'Standoff View' : 'Contact Direct'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Route Comparison Table (MOMAR A/B Matrix) */}
                <RouteComparisonPanel
                  scenario={scenario}
                  selectedOptionId={selectedOptionId}
                  onSelectOption={onSelectOption}
                />

                {/* 3. Interactive SVG Elevation Profile Chart */}
                <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-text-main flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-secondary"
                        aria-hidden="true"
                      />
                      Elevation Profile (1 m USGS DTM)
                    </h4>
                  </div>
                  <ElevationProfile
                    selectedOptionId={selectedOptionId}
                    onSelectOption={onSelectOption}
                  />
                </div>

                {/* 4. EVA Time Budget Progress */}
                <EvaBudgetCard selectedOptionId={selectedOptionId} scenario={scenario} />

                {/* 5. Stops Sequence Timeline */}
                <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                  <h4 className="font-semibold text-text-main mb-2">Marswalk Stops Sequence</h4>
                  <div className="space-y-2 text-[11px]">
                    {/* Start point */}
                    <div className="flex items-center gap-2 text-text-secondary">
                      <div className="h-4 w-4 rounded-full border border-card-border bg-card-elevated flex items-center justify-center font-mono text-[9px] text-text-main">
                        0
                      </div>
                      <span className="font-medium text-text-main">{scenario.start.label}</span>
                      <span className="text-text-muted font-mono text-[10px] ml-auto">
                        Departure
                      </span>
                    </div>

                    {/* Stops */}
                    {scenario.stops.map((stop) => {
                      const isSelected = stop.id === selectedStopId
                      const isSkinner = stop.id === 'skinner-ridge'
                      const isIncluded = selectedOptionId !== 'A' || !isSkinner
                      return (
                        <div
                          key={stop.id}
                          onClick={() => onSelectStop(stop.id)}
                          className={`flex items-start gap-2 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-accent bg-accent/20'
                              : 'border-card-border/60 bg-card hover:border-card-border'
                          } ${!isIncluded ? 'opacity-50' : ''}`}
                        >
                          <div className="mt-0.5">
                            <StopDiamond />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-text-main">
                                {stopLabel(stop)}
                              </span>
                              {!isIncluded && (
                                <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                                  Option B Only
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-secondary mt-0.5">
                              Cores: {formatSamples(stop.samples)}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Return leg */}
                    <div className="flex items-center gap-2 text-text-secondary pt-1 border-t border-card-border/50">
                      <div className="h-4 w-4 rounded-full border border-card-border bg-card-elevated flex items-center justify-center font-mono text-[9px] text-text-main">
                        R
                      </div>
                      <span className="font-medium text-text-main">
                        Return Leg to Habitat Standpoint
                      </span>
                      <span className="text-text-muted font-mono text-[10px] ml-auto">
                        Turnaround
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRoverTrack}
                      onChange={onToggleRoverTrack}
                      className="accent-accent cursor-pointer"
                    />
                    <span>Perseverance Rover Track (Sols 490–516)</span>
                  </label>

                  {onExportGeoJson && (
                    <button
                      type="button"
                      onClick={onExportGeoJson}
                      className="rounded-lg border border-card-border bg-card px-2.5 py-1 text-[11px] font-medium text-text-main hover:border-secondary hover:bg-card-elevated cursor-pointer"
                    >
                      Export GeoJSON
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 2: SCIENCE ================= */}
        {activeTab === 'science' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main mb-1">Hawksbill Gap Field Campaign</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Evaluating the ancient Jezero delta front. Compare rock textures, sample cores, and
                decide whether to invest EVA time testing the origin of the Skinner Ridge sandstone.
              </p>
            </div>

            {/* Science Stops Cards */}
            <div className="space-y-3">
              <ScienceStopCard stopId="wildcat-ridge" />
              <ScienceStopCard stopId="skinner-ridge" />
            </div>
          </div>
        )}

        {/* ================= TAB 3: SAFETY & WEATHER ================= */}
        {activeTab === 'safety' && (
          <div className="space-y-3">
            {/* Caution Zones */}
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main flex items-center gap-1.5 mb-2">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
                Route Caution Zones & Obstacles
              </h3>
              <div className="space-y-2 text-[11px]">
                <div className="rounded border border-card-border bg-card p-2">
                  <div className="font-semibold text-text-main">Proposed Connector (Option A)</div>
                  <div className="text-[10px] text-text-muted font-mono">
                    Distance: 107.96–113.15 m (5.2 m)
                  </div>
                  <p className="mt-1 text-text-secondary">
                    Connector between rover drives. Terrain models show steep slope divergence (7°
                    vs 22°). Footing inspection required.
                  </p>
                </div>

                <div className="rounded border border-card-border bg-card p-2">
                  <div className="font-semibold text-text-main">Steep Slope Segments (&gt;15°)</div>
                  <div className="text-[10px] text-text-muted font-mono">
                    Max grade: 20.7° (Opt A) · 22.1° (Opt B)
                  </div>
                  <p className="mt-1 text-text-secondary">
                    Local scarp margins exceed nominal 15° suit mobility threshold at 2 m sampling.
                    Requires deliberate crew footing.
                  </p>
                </div>

                <div className="rounded border border-card-border bg-card p-2">
                  <div className="font-semibold text-text-main">
                    Obstacles: Betty's Rock & Fractures
                  </div>
                  <p className="mt-1 text-text-secondary">
                    Large detached float boulder (Betty's Rock) and eastern fracture/overhang at
                    Skinner Ridge block face.
                  </p>
                </div>

                <div className="rounded border border-card-border bg-card p-2">
                  <div className="font-semibold text-text-main">Terrain DTM Coverage</div>
                  <p className="mt-1 text-text-secondary">
                    100% valid USGS 1 m DTM coverage across all outbound and return legs. 0 m data
                    gap.
                  </p>
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main mb-2">
                Environmental & Weather Baseline (MEDA / RAD)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-card-border bg-card p-2">
                  <span className="text-[10px] text-text-muted block uppercase">
                    Atmospheric Pressure
                  </span>
                  <span className="font-semibold font-mono text-text-main">~610–760 Pa</span>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    Jezero diurnal cycle
                  </span>
                </div>
                <div className="rounded border border-card-border bg-card p-2">
                  <span className="text-[10px] text-text-muted block uppercase">
                    Surface Temperature
                  </span>
                  <span className="font-semibold font-mono text-text-main">−83°C to −14°C</span>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    Sol 490–516 baseline
                  </span>
                </div>
              </div>
              <div className="mt-2 rounded border border-card-border bg-card p-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted uppercase">
                    GCR Radiation Baseline
                  </span>
                  <span className="font-mono text-text-main font-semibold">~200 µSv/day</span>
                </div>
                <p className="mt-1 text-[10px] text-text-secondary">
                  Curiosity RAD Gale Crater baseline provided as planetary analog context.
                  Historical archival data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: LAYERS & MAP ================= */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            {/* Quick Focus Jumps */}
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main mb-2">Quick Focus Views</h3>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={onFocusScenario}
                  className="rounded-lg border border-accent bg-accent/20 px-2 py-1.5 text-center text-[11px] font-semibold text-text-main hover:bg-accent/30 cursor-pointer"
                >
                  Hawksbill Gap
                </button>
                <button
                  type="button"
                  onClick={onFocusJezero}
                  className="rounded-lg border border-card-border bg-card px-2 py-1.5 text-center text-[11px] font-semibold text-text-main hover:bg-card-elevated cursor-pointer"
                >
                  Jezero Overview
                </button>
                <button
                  type="button"
                  onClick={onFocusGlobal}
                  className="rounded-lg border border-card-border bg-card px-2 py-1.5 text-center text-[11px] font-semibold text-text-main hover:bg-card-elevated cursor-pointer"
                >
                  Global Mars
                </button>
              </div>
            </div>

            {/* Base Layer Radio Group */}
            {globalLayers.length > 0 && (
              <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                <h3 className="font-semibold text-text-main mb-2">Base Map Layer</h3>
                <div className="space-y-1.5">
                  {globalLayers.map((layer) => {
                    const isSelected = activeBaseLayerId === layer.id
                    return (
                      <label
                        key={layer.id}
                        className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/15 text-text-main'
                            : 'border-card-border bg-card text-text-secondary hover:border-card-border/80 hover:text-text-main'
                        }`}
                      >
                        <input
                          type="radio"
                          name="base-layer"
                          checked={isSelected}
                          onChange={() => onSelectBaseLayer?.(layer.id)}
                          className="accent-accent cursor-pointer"
                        />
                        <span className="font-medium">{layer.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Overlays Checkboxes */}
            {overlayLayers.length > 0 && (
              <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                <h3 className="font-semibold text-text-main mb-2">Jezero Overlays</h3>
                <div className="space-y-1.5">
                  {overlayLayers.map((layer) => {
                    const isChecked = visibleOverlayIds.has(layer.id)
                    return (
                      <label
                        key={layer.id}
                        className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                          isChecked
                            ? 'border-accent bg-accent/15 text-text-main'
                            : 'border-card-border bg-card text-text-secondary hover:border-card-border/80 hover:text-text-main'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleOverlay?.(layer.id)}
                          className="accent-accent cursor-pointer"
                        />
                        <span className="font-medium">{layer.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reference Landmarks */}
            {landmarks && landmarks.features.length > 0 && (
              <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                <h3 className="font-semibold text-text-main mb-2">Reference Points & Landmarks</h3>
                <div className="space-y-1.5">
                  {landmarks.features.map((feature) => {
                    const isSelected = feature.id === selectedLandmarkId
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => onSelectLandmark?.(feature.id)}
                        className={`w-full rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/20 text-text-main'
                            : 'border-card-border bg-card text-text-secondary hover:border-card-border/80 hover:text-text-main'
                        }`}
                      >
                        <div className="font-semibold">{feature.properties.name}</div>
                        <div className="font-mono text-[10px] text-text-muted mt-0.5">
                          {formatMarsCoordinate(
                            feature.geometry.coordinates[0],
                            feature.geometry.coordinates[1],
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedLandmark && (
                  <div className="mt-2.5 rounded-lg border border-card-border bg-card p-2 text-[11px] text-text-secondary">
                    <div className="font-semibold text-text-main">
                      {selectedLandmark.properties.name}
                    </div>
                    <p className="mt-0.5 leading-relaxed">{selectedLandmark.properties.summary}</p>
                    <p className="mt-1 font-mono text-[10px] text-text-muted">
                      Source: {selectedLandmark.properties.source}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
