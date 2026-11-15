import { formatMeters, formatSols, type Scenario, type ScenarioStatus } from './scenario'
import { CONNECTOR_DASH, TRACK_DASH, TRACK_STYLE, optionStyle } from './scenarioLayers'

interface ScenarioPanelProps {
  status: ScenarioStatus
  scenario: Scenario | null
  error: string | null
  canRetry: boolean
  showRoverTrack: boolean
  onRetry: () => void
  onToggleRoverTrack: () => void
}

const STATUS_TEXT: Record<ScenarioStatus, string> = {
  loading: 'Loading scenario…',
  ready: 'Scenario loaded.',
  unavailable: 'Scenario unavailable. The base map still works.',
  unsupported: 'Scenario version not supported. The base map still works.',
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
  onRetry,
  onToggleRoverTrack,
}: ScenarioPanelProps) {
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
        <>
          <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Route options (round trip)
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-xs">
            {scenario.route_options.map((option) => {
              const style = optionStyle(scenario.route_options, option.id)
              return (
                <li key={option.id} className="flex items-start gap-2">
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
        </>
      )}
    </section>
  )
}
