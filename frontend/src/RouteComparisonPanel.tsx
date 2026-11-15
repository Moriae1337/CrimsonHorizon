import { useId } from 'react'
import { buildRouteComparison, GRADE_STEPS } from './routeComparison'
import type { Scenario } from './scenario'

export function RouteComparisonPanel({ scenario }: { scenario: Scenario }) {
  const headingId = useId()
  const { options, distanceDifference } = buildRouteComparison(scenario)
  const rows = [
    { label: 'Round trip', values: options.map((option) => option.roundTrip) },
    { label: 'Ascent (5 m)', values: options.map((option) => option.ascent) },
    ...GRADE_STEPS.map((step, index) => ({
      label: `Max grade (${step} m)`,
      values: options.map((option) => option.maxGrades[index]),
    })),
    { label: 'Elevation coverage (outbound)', values: options.map((option) => option.coverage) },
    { label: 'Turnaround', values: options.map((option) => option.turnaround) },
    { label: 'Farthest from start', values: options.map((option) => option.farthestFromStart) },
  ]
  const sources = scenario.sources.filter(
    ({ id, url }) =>
      ['dtm-primary', 'dtm-fallback', 'm20-traverse', 'pds-initial-reports'].includes(id) &&
      url.startsWith('https://'),
  )

  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 rounded-lg border border-card-border bg-card px-2.5 py-2 text-xs text-text-main"
    >
      <h3 id={headingId} className="font-semibold">
        Route comparison
      </h3>
      {distanceDifference && (
        <p className="mt-1 text-text-secondary">
          A/B round-trip difference <strong className="text-text-main">{distanceDifference}</strong>
        </p>
      )}
      <div className="mt-2 overflow-x-auto">
        <table aria-labelledby={headingId} className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-card-border">
              <th scope="col" className="w-[40%] pb-1 font-medium text-text-secondary">
                Metric
              </th>
              {options.map(({ id }) => (
                <th key={id} scope="col" className="px-1 pb-1 font-semibold">
                  Option {id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, values }) => (
              <tr key={label} className="border-b border-card-border align-top">
                <th scope="row" className="py-1 pr-1 font-medium text-text-secondary">
                  {label}
                </th>
                {values.map((value, index) => (
                  <td key={options[index].id} className="px-1 py-1 tabular-nums">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {options.map(({ id, observations, openZones }) => (
        <div key={id} className="mt-3 border-l-2 border-accent pl-2">
          <h4 className="font-semibold">Option {id}</h4>
          <p className="mt-1 font-medium text-text-secondary">Enabled observations</p>
          {observations.length > 0 ? (
            <ul className="ml-4 list-disc space-y-0.5">
              {observations.map((observation) => (
                <li key={observation}>{observation}</li>
              ))}
            </ul>
          ) : (
            <p>Unknown</p>
          )}
          <p className="mt-2 font-medium text-text-secondary">
            Open caution zones{openZones && ` (${openZones.length})`}
          </p>
          {openZones === null ? (
            <p>Unknown</p>
          ) : openZones.length === 0 ? (
            <p>None open</p>
          ) : (
            <ul className="ml-4 list-disc space-y-0.5">
              {openZones.map(({ id, label, span, summary }) => (
                <li key={id}>
                  {summary ? (
                    <details>
                      <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-accent">
                        {label}
                        {span && ` · ${span}`}
                      </summary>
                      <p className="mb-1 mt-0.5 text-text-secondary">{summary}</p>
                    </details>
                  ) : (
                    <span>
                      {label}
                      {span && ` · ${span}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {sources.length > 0 && (
        <ul aria-label="Route comparison sources" className="mt-3 space-y-0.5 text-text-secondary">
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
      )}
    </section>
  )
}
