import { useState } from 'react'
import { ElevationProfile } from './elevationProfile.ts'
import { EnvironmentPanel } from './EnvironmentPanel.tsx'
import { EvaBudgetCard } from './EvaBudgetCard.tsx'
import { formatMarsCoordinate } from './marsCatalog.ts'
import { RouteComparisonPanel } from './RouteComparisonPanel.tsx'
import { buildRouteComparison } from './routeComparison.ts'
import { formatSols, type Scenario, type ScenarioStatus } from './scenario.ts'
import { ScienceStopCard } from './ScienceStopCard.tsx'
import { STOP_COLOR, formatSamples, stopLabel } from './scenarioLayers.ts'
import type { EnvironmentState } from './useEnvironment.ts'

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

  environmentState: EnvironmentState
  sampleSols: ReadonlySet<number>

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
        stroke="var(--color-main)"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="9" r="1.8" fill="var(--color-main)" />
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
  environmentState,
  sampleSols,
  onExportGeoJson,
}: ScenarioPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('plan')
  const selectedOption = scenario?.route_options.find(({ id }) => id === selectedOptionId)

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'plan', label: 'Plan' },
    { id: 'science', label: 'Science' },
    { id: 'safety', label: 'Safety' },
    { id: 'layers', label: 'Layers' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col text-xs text-text-main">
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
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-1 text-center font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'border-b-2 border-accent bg-card text-text-main'
                  : 'text-text-muted hover:bg-card-elevated hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-3">
        {!scenario && (activeTab === 'plan' || activeTab === 'safety') && (
          <div className="rounded-lg border border-card-border bg-input p-3">
            <p role="status">{STATUS_TEXT[status]}</p>
            {error && <p className="mt-1 text-text-secondary">{error}</p>}
            {canRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded-lg border border-card-border px-3 py-1.5 hover:border-secondary cursor-pointer"
              >
                Retry loading scenario
              </button>
            )}
          </div>
        )}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            {scenario && (
              <>
                <RouteComparisonPanel
                  scenario={scenario}
                  selectedOptionId={selectedOptionId}
                  onSelectOption={onSelectOption}
                />

                <ElevationProfile
                  selectedOptionId={selectedOptionId}
                  onSelectOption={onSelectOption}
                />

                {selectedOption && <EvaBudgetCard selectedOptionId={selectedOption.id} />}

                <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
                  <h4 className="font-semibold text-text-main mb-2">Route stops</h4>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <div className="h-4 w-4 rounded-full border border-card-border bg-card-elevated flex items-center justify-center font-mono text-[9px] text-text-main">
                        0
                      </div>
                      <span className="font-medium text-text-main">{scenario.start.label}</span>
                      <span className="text-text-muted font-mono text-[10px] ml-auto">
                        Departure
                      </span>
                    </div>

                    {scenario.stops.map((stop) => {
                      const isSelected = stop.id === selectedStopId
                      const isIncluded =
                        !selectedOption || selectedOption.stop_ids.includes(stop.id)
                      return (
                        <button
                          key={stop.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onSelectStop(stop.id)}
                          className={`flex w-full items-start gap-2 rounded-lg border p-1.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-accent bg-accent/20'
                              : 'border-card-border/60 bg-card hover:border-card-border'
                          } ${!isIncluded ? 'opacity-50' : ''}`}
                        >
                          <span className="mt-0.5">
                            <StopDiamond />
                          </span>
                          <span className="flex-1">
                            <span className="flex items-center justify-between">
                              <span className="font-semibold text-text-main">
                                {stopLabel(stop)}
                              </span>
                              {!isIncluded && (
                                <span className="text-[9px] uppercase font-bold text-text-secondary bg-card-elevated px-1 rounded">
                                  Off selected route
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-text-secondary mt-0.5">
                              Cores: {formatSamples(stop.samples)}
                            </span>
                          </span>
                        </button>
                      )
                    })}

                    <div className="flex items-center gap-2 text-text-secondary pt-1 border-t border-card-border/50">
                      <div className="h-4 w-4 rounded-full border border-card-border bg-card-elevated flex items-center justify-center font-mono text-[9px] text-text-main">
                        R
                      </div>
                      <span className="font-medium text-text-main">Return to start</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRoverTrack}
                      onChange={onToggleRoverTrack}
                      className="accent-accent cursor-pointer"
                    />
                    <span>
                      Perseverance track ·{' '}
                      {formatSols(
                        scenario.rover_track.features.map(({ properties }) => properties.sol),
                      )}
                    </span>
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

        {activeTab === 'science' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main mb-1">Hawksbill Gap Field Campaign</h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Evaluating the ancient Jezero delta front. Compare rock textures, sample cores, and
                decide whether to invest EVA time testing the origin of the Skinner Ridge sandstone.
              </p>
            </div>

            <div className="space-y-3">
              <ScienceStopCard stopId="wildcat-ridge" />
              <ScienceStopCard stopId="skinner-ridge" />
            </div>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="space-y-3">
            {scenario && (
              <section className="space-y-2">
                <h3 className="font-semibold">Open route cautions</h3>
                {buildRouteComparison(scenario).options.map(({ id, openZones }) => (
                  <details
                    key={id}
                    open={selectedOptionId === id}
                    className="rounded-lg border border-card-border bg-input p-3"
                  >
                    <summary className="cursor-pointer font-medium">
                      Option {id} ·{' '}
                      {openZones === null ? 'review data unavailable' : openZones.length}
                    </summary>
                    {openZones?.length ? (
                      <ul className="mt-2 space-y-2 text-text-secondary">
                        {openZones.map(({ id: zoneId, label, span, summary }) => (
                          <li key={zoneId} className="border-t border-card-border pt-2">
                            <p className="font-medium text-text-main">
                              {label}
                              {span && ` · ${span}`}
                            </p>
                            {summary && <p className="mt-1">{summary}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      openZones && (
                        <p className="mt-2 text-text-secondary">No open cautions reported.</p>
                      )
                    )}
                  </details>
                ))}
              </section>
            )}
            <EnvironmentPanel {...environmentState} sampleSols={sampleSols} />
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-card-border bg-input p-3 shadow-xs">
              <h3 className="font-semibold text-text-main mb-2">Quick Focus Views</h3>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={onFocusScenario}
                  disabled={!scenario}

                  className="rounded-lg border border-accent bg-accent/20 px-2 py-1.5 text-center text-[11px] font-semibold text-text-main hover:bg-accent/30 cursor-pointer disabled:cursor-default disabled:opacity-50"
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
