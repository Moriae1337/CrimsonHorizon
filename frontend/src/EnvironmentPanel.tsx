import { formatMarsCoordinate } from './marsCatalog'
import {
  formatMeasurement,
  formatUtcDate,
  missingSols,
  type EnvironmentContext,
  type EnvironmentSource,
  type ParameterStats,
} from './environment'
import type { EnvironmentStatus } from './useEnvironment'

interface EnvironmentPanelProps {
  status: EnvironmentStatus
  environment: EnvironmentContext | null
  /** Sols on which a stop was sampled; highlighted in the weather table. */
  sampleSols: ReadonlySet<number>
}

const CARD = 'rounded-xl border border-card-border bg-input p-3.5 text-xs'
const BADGE =
  'inline-flex items-center rounded-md border border-accent/40 bg-accent/20 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-main'

function range(stats: ParameterStats | null, digits = 0) {
  if (!stats) return <span className="text-text-secondary">no data</span>
  return `${stats.min.toFixed(digits)}–${stats.max.toFixed(digits)}`
}

function SourceLinks({ ids, sources }: { ids: string[]; sources: EnvironmentSource[] }) {
  return (
    <ul className="mt-2 space-y-1 text-[11px] text-text-secondary">
      {ids.map((id) => {
        const source = sources.find((s) => s.id === id)
        if (!source) return null
        return (
          <li key={id}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-accent underline-offset-2 hover:text-text-main focus-visible:outline-1 focus-visible:outline-accent"
            >
              {source.title}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function WeatherCard({
  environment,
  sampleSols,
}: {
  environment: EnvironmentContext
  sampleSols: ReadonlySet<number>
}) {
  const { weather, sources } = environment
  const dated = weather.sols.filter((s) => s.utc_start)
  const first = dated[0]?.utc_start ?? null
  const last = dated[dated.length - 1]?.utc_stop ?? null
  const missingP = missingSols(weather.sols, 'pressure')
  const missingT = missingSols(weather.sols, 'air_temperature')
  const units = Object.fromEntries(weather.parameters.map((p) => [p.id, p.unit]))

  return (
    <section className={CARD} aria-labelledby="meda-weather-title">
      <div className="flex flex-wrap items-center gap-2">
        <span className={BADGE}>Archival</span>
        <h3 id="meda-weather-title" className="font-semibold text-text-main">
          MEDA weather, Jezero
        </h3>
      </div>
      <p className="mt-1 leading-relaxed text-text-secondary">
        Recorded by Perseverance in {weather.place}, sols {weather.sol_range[0]}–
        {weather.sol_range[1]} ({formatUtcDate(first)} to {formatUtcDate(last)} UTC). Historical
        record, not a forecast for a crew walk.
      </p>

      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-card-border">
        <table className="w-full whitespace-nowrap text-left font-mono text-[11px]">
          <caption className="sr-only">
            Daily range of surface pressure and air temperature per sol, with LMST hours of the sol
            covered by pressure samples
          </caption>
          <thead className="sticky top-0 bg-card text-text-secondary">
            <tr>
              <th scope="col" className="px-1 py-1 align-bottom font-medium whitespace-normal">
                Sol
              </th>
              <th scope="col" className="px-1 py-1 align-bottom font-medium whitespace-normal">
                UTC start{first ? ` (${first.slice(0, 4)})` : ''}
              </th>
              <th scope="col" className="px-1 py-1 align-bottom font-medium whitespace-normal">
                {units.pressure ?? 'Pa'}
              </th>
              <th scope="col" className="px-1 py-1 align-bottom font-medium whitespace-normal">
                {units.air_temperature ?? 'K'}
              </th>
              <th
                scope="col"
                className="px-1 py-1 align-bottom font-medium whitespace-normal"
                title="LMST hours covered (24 minus gaps of 15 min or more)"
              >
                Cov. h
              </th>
            </tr>
          </thead>
          <tbody>
            {weather.sols.map((s) => {
              const sampled = sampleSols.has(s.sol)
              return (
                <tr
                  key={s.sol}
                  className={`border-t border-card-border ${sampled ? 'bg-accent/15 text-text-main' : 'text-text-secondary'}`}
                >
                  <th scope="row" className="px-1 py-0.5 font-normal">
                    {s.sol}
                    {sampled && (
                      <span className="text-accent" title="Sample collected this sol">
                        {' '}
                        ◆
                      </span>
                    )}
                  </th>
                  <td className="px-1 py-0.5">{s.utc_start ? s.utc_start.slice(5, 10) : '—'}</td>
                  <td className="px-1 py-0.5">{range(s.pressure)}</td>
                  <td className="px-1 py-0.5">{range(s.air_temperature)}</td>
                  <td className="px-1 py-0.5">
                    {s.pressure ? s.pressure.covered_h.toFixed(1) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <dl className="mt-2 space-y-1 text-[11px] text-text-secondary">
        <div>
          <dt className="inline text-text-main">Sols without pressure: </dt>
          <dd className="inline">{missingP || 'none'}</dd>
        </div>
        <div>
          <dt className="inline text-text-main">Sols without air temperature: </dt>
          <dd className="inline">{missingT || 'none'}</dd>
        </div>
      </dl>

      <details className="mt-2 text-[11px] text-text-secondary">
        <summary className="cursor-pointer text-text-main focus-visible:outline-1 focus-visible:outline-accent">
          Missing intervals within each sol (LMST)
        </summary>
        <ul className="mt-1 space-y-0.5 font-mono">
          {weather.sols.flatMap((s) =>
            s.pressure
              ? [
                  <li key={s.sol}>
                    {s.sol}:{' '}
                    {s.pressure.lmst_gaps.map((g) => `${g.from_lmst}–${g.to_lmst}`).join(', ') ||
                      'none'}
                  </li>,
                ]
              : [],
          )}
        </ul>
        <p className="mt-1">Pressure gaps shown. {weather.method}</p>
      </details>

      <p className="mt-2 text-[11px] text-text-secondary">
        {weather.parameters.map((p) => `${p.label} (${p.unit}, ${p.processing_level})`).join('; ')}.
      </p>
      <SourceLinks ids={weather.source_ids} sources={sources} />
    </section>
  )
}

function RadiationCard({ environment }: { environment: EnvironmentContext }) {
  const { radiation, sources } = environment
  const [lon, lat] = radiation.place.coordinates
  return (
    <section className={CARD} aria-labelledby="rad-gale-title">
      <div className="flex flex-wrap items-center gap-2">
        <span className={BADGE}>Archival</span>
        <span className={BADGE}>Gale, not Jezero</span>
      </div>
      <h3 id="rad-gale-title" className="mt-1.5 font-semibold text-text-main">
        Radiation context: Curiosity RAD at {radiation.place.name}
      </h3>
      <dl className="mt-1.5 space-y-1 text-text-secondary">
        <div>
          <dt className="inline text-text-main">Place: </dt>
          <dd className="inline">
            {radiation.place.name} ({radiation.place.mission}),{' '}
            <span className="font-mono">{formatMarsCoordinate(lon, lat)}</span>
            {radiation.place.elevation_m !== null &&
              `, about ${(radiation.place.elevation_m / 1000).toFixed(1)} km (MOLA)`}
          </dd>
        </div>
        <div>
          <dt className="inline text-text-main">Window: </dt>
          <dd className="inline">
            {radiation.window.utc_start} to {radiation.window.utc_stop}. {radiation.window.note}
          </dd>
        </div>
        <div>
          <dt className="inline text-text-main">Instrument: </dt>
          <dd className="inline">{radiation.instrument}</dd>
        </div>
      </dl>
      <ul className="mt-2 space-y-1">
        {radiation.measurements.map((m) => (
          <li key={m.id} className="rounded-lg border border-card-border px-2 py-1.5">
            <div className="text-text-secondary">{m.label}</div>
            <div className="font-mono text-text-main">{formatMeasurement(m)}</div>
          </li>
        ))}
      </ul>
      <h4 className="mt-2 font-semibold text-text-main">Limits for a Jezero walk</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 leading-relaxed text-text-secondary">
        {radiation.limits.map((limit) => (
          <li key={limit}>{limit}</li>
        ))}
      </ul>
      <SourceLinks ids={radiation.source_ids} sources={sources} />
    </section>
  )
}

export function EnvironmentPanel({ status, environment, sampleSols }: EnvironmentPanelProps) {
  return (
    <section aria-labelledby="environment-heading">
      <h2
        id="environment-heading"
        className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
      >
        Environment context
      </h2>
      {status === 'loading' && (
        <p className="mt-2 text-xs text-text-secondary" role="status">
          Loading archival weather and radiation…
        </p>
      )}
      {status === 'unavailable' && (
        <p className="mt-2 text-xs text-text-secondary" role="status">
          Environment context unavailable. The map and scenario still work.
        </p>
      )}
      {environment && (
        <div className="mt-2 space-y-3">
          <WeatherCard environment={environment} sampleSols={sampleSols} />
          <RadiationCard environment={environment} />
        </div>
      )}
    </section>
  )
}
