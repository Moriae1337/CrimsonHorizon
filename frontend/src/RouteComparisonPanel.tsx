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
  const { options } = buildRouteComparison(scenario)

  const rows = [
    {
      label: 'Round trip',
      values: options.map((option) => option.roundTrip),
    },
    {
      label: 'Ascent (5 m)',
      values: options.map((option) => option.ascent),
    },
    ...GRADE_STEPS.map((step, index) => ({
      label: `Max grade (${step} m)`,
      values: options.map((option) => option.maxGrades[index]),
    })),
    {
      label: 'Elevation coverage',
      values: options.map((option) => option.coverage),
    },
    {
      label: 'Turnaround',
      values: options.map((option) => option.turnaround),
    },
    {
      label: 'Farthest from start',
      values: options.map((option) => option.farthestFromStart),
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
      className="rounded-xl border border-card-border bg-input p-3 text-xs text-text-main shadow-xs"
    >
      <h3 id={headingId} className="font-semibold">
        Route comparison
      </h3>

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
                  <th key={id} scope="col" className="px-2 pb-1.5">
                    {onSelectOption ? (
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectOption(isSelected ? null : id)}
                        className={`cursor-pointer rounded-md border px-2 py-1 hover:border-secondary ${
                          isSelected
                            ? 'border-accent bg-accent text-text-main'
                            : 'border-card-border'
                        }`}
                      >
                        Option {id}
                      </button>
                    ) : (
                      `Option ${id}`
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, values }) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {options.map(({ id, observations, openZones }) => (
          <section key={id} className="rounded-lg border border-card-border bg-card p-2.5">
            <h4 className="font-semibold">Option {id} · Science</h4>
            <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-text-secondary">
              {observations.map((obs) => (
                <li key={obs}>{obs}</li>
              ))}
            </ul>
            <p className="mt-2 text-text-secondary">
              {openZones === null
                ? 'Caution review unavailable'
                : `${openZones.length} open cautions`}
            </p>
          </section>
        ))}
      </div>

      {sources.length > 0 && (
        <details className="mt-2.5 pt-2 border-t border-card-border/60 text-[11px] text-text-muted">
          <summary className="cursor-pointer hover:text-text-secondary">
            Sources ({sources.length})
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
