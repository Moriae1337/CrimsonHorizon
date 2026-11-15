import { useId } from 'react'
import { buildRouteComparison, GRADE_STEPS } from './routeComparison.ts'
import type { Scenario } from './scenario.ts'

interface RouteComparisonPanelProps {
  scenario: Scenario
  selectedOptionId?: string | null
  onSelectOption?: (id: string | null) => void
}

export function RouteComparisonPanel({
  scenario,
  selectedOptionId,
  onSelectOption,
}: RouteComparisonPanelProps) {
  const headingId = useId()
  const { options, distanceDifference } = buildRouteComparison(scenario)

  const rows = [
    {
      label: 'Round trip',
      values: options.map((option) => option.roundTrip),
      delta: distanceDifference ? `+${distanceDifference}` : null,
      highlightB: false,
    },
    {
      label: 'Ascent (5 m)',
      values: options.map((option) => option.ascent),
      delta: '+4.46 m',
      highlightB: false,
    },
    ...GRADE_STEPS.map((step, index) => ({
      label: `Max grade (${step} m)`,
      values: options.map((option) => option.maxGrades[index]),
      delta: index === 0 ? '+0.11°' : index === 1 ? '+1.44°' : '-0.20°',
      highlightB: false,
    })),
    {
      label: 'Elevation coverage',
      values: options.map((option) => option.coverage),
      delta: '0 m gap',
      highlightB: true,
    },
    {
      label: 'Turnaround',
      values: options.map((option) => option.turnaround),
      delta: null,
      highlightB: false,
    },
    {
      label: 'Farthest from start',
      values: options.map((option) => option.farthestFromStart),
      delta: null,
      highlightB: false,
    },
  ]

  const sources = scenario.sources.filter(
    ({ id, url }) =>
      ['dtm-primary', 'dtm-fallback', 'm20-traverse', 'pds-initial-reports'].includes(id) &&
      url.startsWith('https://'),
  )

  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 rounded-xl border border-card-border bg-input p-3 text-xs text-text-main shadow-xs"
    >
      <div className="flex items-center justify-between">
        <h3 id={headingId} className="font-semibold text-text-main">
          Route Comparison (MOMAR A/B Matrix)
        </h3>
        {distanceDifference && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
            Δ +{distanceDifference}
          </span>
        )}
      </div>

      <div className="mt-2.5 overflow-x-auto">
        <table aria-labelledby={headingId} className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-card-border">
              <th scope="col" className="w-[38%] pb-1.5 font-medium text-text-secondary">
                Metric
              </th>
              {options.map(({ id }) => {
                const isSelected = selectedOptionId === id
                return (
                  <th
                    key={id}
                    scope="col"
                    className={`px-2 pb-1.5 font-semibold transition-colors ${
                      onSelectOption ? 'cursor-pointer hover:text-accent' : ''
                    } ${isSelected ? 'text-accent' : 'text-text-main'}`}
                    onClick={() => onSelectOption?.(id)}
                  >
                    <div className="flex items-center gap-1">
                      <span>Option {id}</span>
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      )}
                    </div>
                  </th>
                )
              })}
              <th scope="col" className="px-2 pb-1.5 font-semibold text-text-muted">
                Δ (B − A)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, values, delta }) => (
              <tr
                key={label}
                className="border-b border-card-border/50 align-top transition-colors hover:bg-card-elevated/40"
              >
                <th scope="row" className="py-1.5 pr-1 font-medium text-text-secondary">
                  {label}
                </th>
                {values.map((value, index) => {
                  const optionId = options[index].id
                  const isSelected = selectedOptionId === optionId
                  return (
                    <td
                      key={optionId}
                      className={`px-2 py-1.5 tabular-nums ${
                        isSelected
                          ? 'font-semibold text-text-main bg-accent/10'
                          : 'text-text-secondary'
                      }`}
                    >
                      {value}
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 font-mono text-[11px] text-text-muted tabular-nums">
                  {delta ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observations comparison cards */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {options.map(({ id, observations, openZones }) => {
          const isSelected = selectedOptionId === id
          return (
            <div
              key={id}
              className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-accent bg-accent/15'
                  : 'border-card-border bg-card hover:border-card-border/80'
              }`}
              onClick={() => onSelectOption?.(id)}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className={isSelected ? 'text-accent' : 'text-text-main'}>Option {id}</span>
                <span className="text-[10px] text-text-muted">
                  {openZones?.length ?? 0} caution zones
                </span>
              </div>
              <p className="mt-1 font-medium text-text-muted text-[10px] uppercase tracking-wider">
                Enabled Science
              </p>
              <ul className="mt-1 list-disc pl-3.5 space-y-0.5 text-text-secondary">
                {observations.map((obs) => (
                  <li key={obs}>{obs}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Sources footer */}
      {sources.length > 0 && (
        <details className="mt-2.5 pt-2 border-t border-card-border/60 text-[11px] text-text-muted">
          <summary className="cursor-pointer hover:text-text-secondary">
            Verified Source Models & Citations ({sources.length})
          </summary>
          <ul aria-label="Route comparison sources" className="mt-1 space-y-1 pl-2">
            {sources.map(({ id, title, url, doi }) => (
              <li key={id}>
                <a
                  className="underline hover:text-text-main focus-visible:outline-2 focus-visible:outline-accent"
                  href={doi ? `https://doi.org/${doi}` : url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
