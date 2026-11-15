import { useEffect, useRef } from 'react'
import { formatMarsCoordinate } from './marsCatalog'
import { formatMeters, formatSols, type Scenario, type ScenarioStatus } from './scenario'
import {
  CONNECTOR_DASH,
  STOP_COLOR,
  TRACK_DASH,
  TRACK_STYLE,
  formatSamples,
  optionStyle,
  stopLabel,
} from './scenarioLayers'

interface ScenarioPanelProps {
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
  onSelectOption: (id: string) => void
}

// Selected list items use the design-system Accent (specs/design-system.md §2.4).
const SELECTABLE =
  'flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8F5A53]'
const SELECTED = 'border-[#8F5A53] bg-[#8F5A53]/20'
const UNSELECTED = 'border-slate-800 bg-slate-950/50 hover:border-slate-700'

const STATUS_TEXT: Record<ScenarioStatus, string> = {
  loading: 'Loading scenario…',
  ready: 'Scenario loaded.',
  unavailable: 'Scenario unavailable. The base map still works.',
  unsupported: 'Scenario version not supported. The base map still works.',
}

function StopSwatch() {
  return (
    <svg width="36" height="18" viewBox="0 0 36 18" aria-hidden="true" className="shrink-0">
      <polygon
        points="18,1 26,9 18,17 10,9"
        fill={STOP_COLOR}
        stroke="rgba(2, 6, 23, 0.85)"
        strokeWidth="2"
      />
      <circle cx="18" cy="9" r="2.2" fill="#020617" />
    </svg>
  )
}

function LineSwatch({
  color,
  width,
  dash,
  casing = true,
}: {
  color: string
  width: number
  dash?: number[]
  casing?: boolean
}) {
  return (
    <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden="true" className="shrink-0">
      {casing && (
        <line x1="2" y1="7" x2="34" y2="7" stroke="rgba(2, 6, 23, 0.85)" strokeWidth={width + 3} />
      )}
      <line
        x1="2"
        y1="7"
        x2="34"
        y2="7"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash?.join(' ')}
        strokeLinecap={dash === TRACK_DASH ? 'round' : 'butt'}
      />
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
}: ScenarioPanelProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  // A selection made on the map brings its panel entry into view.
  useEffect(() => {
    const ids = [
      selectedStopId && `stop:${selectedStopId}`,
      selectedOptionId && `option:${selectedOptionId}`,
    ]
    for (const id of ids) {
      if (!id) continue
      listRef.current
        ?.querySelector(`[data-selection-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedStopId, selectedOptionId])

  const failed = status === 'unavailable' || status === 'unsupported'
  const connectorOption = scenario?.route_options.find((o) => o.proposed_m > 0)
  const trackSols = scenario?.rover_track.features.map((f) => f.properties.sol) ?? []

  return (
    <section aria-labelledby="scenario-heading">
      <h2
        id="scenario-heading"
        className="text-xs font-semibold uppercase tracking-wider text-slate-400"
      >
        Hawksbill Gap Scenario
      </h2>

      <div
        role="status"
        aria-live="polite"
        className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
          failed
            ? 'border-red-500/40 bg-red-500/10 text-red-200'
            : 'border-slate-800 bg-slate-950/50 text-slate-300'
        }`}
      >
        <p className="font-medium">{STATUS_TEXT[status]}</p>
        {failed && error && <p className="mt-1 text-[11px] text-red-300/90">{error}</p>}
      </div>

      {failed && canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          Retry loading scenario
        </button>
      )}

      {scenario && (
        <div ref={listRef}>
          <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Science stops
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-xs">
            {scenario.stops.map((stop) => {
              const selected = stop.id === selectedStopId
              return (
                <li key={stop.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    data-selection-id={`stop:${stop.id}`}
                    onClick={() => onSelectStop(stop.id)}
                    className={`${SELECTABLE} ${selected ? SELECTED : UNSELECTED}`}
                  >
                    <StopSwatch />
                    <span>
                      <span className="font-semibold text-slate-100">{stopLabel(stop)}</span>
                      {stop.samples.length > 0 && (
                        <span className="block text-slate-400">
                          Cores: {formatSamples(stop.samples)}
                        </span>
                      )}
                    </span>
                  </button>
                  {selected && (
                    <div className="mt-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-slate-300">
                      {stop.summary && <p>{stop.summary}</p>}
                      <p className="mt-1 font-mono text-[11px] text-slate-400">
                        {formatMarsCoordinate(stop.coordinates[0], stop.coordinates[1])}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Pin marks the drill site, not where the rover or crew stood
                        {stop.nearest_rmc && ` (rover parked at localization ${stop.nearest_rmc})`}.
                        Source:{' '}
                        {stop.source_ids
                          .map((id) => scenario.sources.find((s) => s.id === id)?.title ?? id)
                          .join('; ')}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Route options (round trip)
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-xs">
            {scenario.route_options.map((option) => {
              const style = optionStyle(scenario.route_options, option.id)
              const selected = option.id === selectedOptionId
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    data-selection-id={`option:${option.id}`}
                    onClick={() => onSelectOption(option.id)}
                    className={`${SELECTABLE} ${selected ? SELECTED : UNSELECTED}`}
                  >
                    <LineSwatch color={style.color} width={style.width} />
                    <span>
                      <span
                        className="mr-1 inline-block rounded px-1 text-[11px] font-bold text-slate-950"
                        style={{ backgroundColor: style.color }}
                        aria-hidden="true"
                      >
                        {option.id}
                      </span>
                      <span className="text-slate-200">{option.label}</span>
                      <span className="block text-slate-400">
                        {formatMeters(option.round_trip_m)} round trip
                        {option.proposed_m > 0 &&
                          `, includes ${option.proposed_m} m proposed each way`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
            {connectorOption && (
              <li className="flex items-start gap-2">
                <LineSwatch
                  color={optionStyle(scenario.route_options, connectorOption.id).color}
                  width={4}
                  dash={CONNECTOR_DASH}
                />
                <span className="text-slate-200">
                  Proposed connector (dashed): not driven by the rover
                </span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <svg width="36" height="14" viewBox="0 0 36 14" aria-hidden="true">
                <circle
                  cx="18"
                  cy="7"
                  r="5"
                  fill="#f8fafc"
                  stroke="rgba(2, 6, 23, 0.85)"
                  strokeWidth="2.5"
                />
              </svg>
              <span className="text-slate-200">{scenario.start.label}</span>
            </li>
          </ul>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Return legs retrace the outbound line and are not drawn twice. Lines follow Perseverance
            drives; only the dashed piece is proposed.
          </p>

          <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-xs hover:border-slate-700">
            <input
              type="checkbox"
              checked={showRoverTrack}
              onChange={onToggleRoverTrack}
              className="mt-0.5 accent-orange-500"
            />
            <LineSwatch
              color={TRACK_STYLE.color}
              width={TRACK_STYLE.width}
              dash={TRACK_DASH}
              casing={false}
            />
            <span>
              <span className="text-slate-200">Historical Perseverance track</span>
              <span className="block text-slate-400">
                {trackSols.length} drives, {formatSols(trackSols)} (dotted, labeled by sol)
              </span>
            </span>
          </label>
        </div>
      )}
    </section>
  )
}
