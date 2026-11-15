import type { ReactNode } from 'react'
import {
  ROUTE_COLORS,
  SITE_IDS,
  formatDelta,
  formatMinutes,
  type PlannedRoute,
  type RouteId,
} from './sites.ts'
import { BTN, BTN_ACTIVE, SECTION, SITE_LABELS, usePlannerText } from './plannerText.ts'
import { MAX_STOPS, type RoutePlanner } from './useRoutePlanner.ts'

function steepMeters(route: PlannedRoute): number {
  const g = route.metrics.grade_class_m
  return (g['15-20'] ?? 0) + (g['20-25'] ?? 0) + (g['25+'] ?? 0)
}

export function ProfileChart({
  routes,
  selectedId,
  progress = 0,
}: {
  routes: PlannedRoute[]
  selectedId: RouteId
  progress?: number
}) {
  const W = 400
  const H = 140
  const pad = { l: 40, r: 8, t: 8, b: 22 }
  const all = routes.flatMap((r) => r.profile.filter((p) => p.z !== null))
  if (all.length < 2) return null
  const maxD = Math.max(...routes.map((r) => r.profile[r.profile.length - 1]?.d ?? 0))
  const zs = all.map((p) => p.z as number)
  const minZ = Math.min(...zs)
  const span = Math.max(1, Math.max(...zs) - minZ)
  const sx = (d: number) => pad.l + (d / Math.max(1, maxD)) * (W - pad.l - pad.r)
  const sy = (z: number) => pad.t + (1 - (z - minZ) / span) * (H - pad.t - pad.b)
  const ordered = [...routes].sort((a) => (a.id === selectedId ? 1 : -1))
  const sel = routes.find((r) => r.id === selectedId)
  let marker: { x: number; y: number } | null = null
  if (sel && progress > 0) {
    const target = progress * (sel.profile[sel.profile.length - 1]?.d ?? 0)
    const s = sel.profile.find((p) => p.d >= target) ?? sel.profile[sel.profile.length - 1]
    if (s && s.z !== null) marker = { x: sx(s.d), y: sy(s.z) }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Elevation profile">
      <rect x="0" y="0" width={W} height={H} fill="#1A1A1A" rx="6" />
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={sy(minZ + f * span)}
            y2={sy(minZ + f * span)}
            stroke="#2A2A2A"
          />
          <text
            x={pad.l - 4}
            y={sy(minZ + f * span) + 3}
            fill="#737373"
            fontSize="9"
            textAnchor="end"
          >
            {(minZ + f * span).toFixed(0)}
          </text>
        </g>
      ))}
      <text x={W - pad.r} y={H - 6} fill="#737373" fontSize="9" textAnchor="end">
        {maxD.toFixed(0)} m
      </text>
      <text x={pad.l} y={H - 6} fill="#737373" fontSize="9">
        0
      </text>
      {ordered.map((r) => {
        const d = r.profile
          .filter((p) => p.z !== null)
          .map((p, i) => `${i ? 'L' : 'M'}${sx(p.d).toFixed(1)},${sy(p.z as number).toFixed(1)}`)
          .join('')
        const selected = r.id === selectedId
        return (
          <path
            key={r.id}
            d={d}
            fill="none"
            stroke={ROUTE_COLORS[r.id]}
            strokeWidth={selected ? 2.2 : 1.3}
            strokeDasharray={r.id === 'shortest' ? '5 3' : undefined}
            opacity={selected ? 1 : 0.6}
          />
        )
      })}
      {marker && (
        <circle
          cx={marker.x}
          cy={marker.y}
          r="4.5"
          fill="#EBEBEB"
          stroke="#8F5A53"
          strokeWidth="2"
        />
      )}
    </svg>
  )
}

export interface RoutePlannerPanelProps {
  planner: RoutePlanner
  /** Playback progress (0..1) for the profile marker; 3D view only. */
  progress?: number
  /** Extra sections rendered after the profile (3D playback controls). */
  children?: ReactNode
}

export function RoutePlannerPanel({ planner: p, progress = 0, children }: RoutePlannerPanelProps) {
  const T = usePlannerText()
  const byId = Object.fromEntries(p.routes.map((r) => [r.id, r])) as Partial<
    Record<RouteId, PlannedRoute>
  >
  const nStops = Math.max(0, p.waypoints.length - (p.hasEnd ? 2 : 1))
  const rows: Array<{
    label: string
    get: (r: PlannedRoute) => number
    unit: string
    fmt: (v: number) => string
    digits?: number
  }> = [
    {
      label: T.length,
      get: (r) => r.metrics.length_m,
      unit: 'm',
      fmt: (v) => `${v.toFixed(0)} m`,
      digits: 0,
    },
    { label: T.ascent, get: (r) => r.metrics.ascent_m, unit: 'm', fmt: (v) => `${v.toFixed(1)} m` },
    {
      label: T.descent,
      get: (r) => r.metrics.descent_m,
      unit: 'm',
      fmt: (v) => `${v.toFixed(1)} m`,
    },
    {
      label: T.maxGrade,
      get: (r) => r.metrics.max_grade_deg,
      unit: '°',
      fmt: (v) => `${v.toFixed(1)}°`,
    },
    {
      label: T.meanSlope,
      get: (r) => r.metrics.mean_surface_slope_deg,
      unit: '°',
      fmt: (v) => `${v.toFixed(1)}°`,
    },
    { label: T.steep, get: steepMeters, unit: 'm', fmt: (v) => `${v.toFixed(0)} m`, digits: 0 },
    {
      label: T.walk,
      get: (r) => r.metrics.walk_minutes,
      unit: 'min',
      fmt: formatMinutes,
      digits: 0,
    },
  ]

  return (
    <div className="flex flex-col gap-4 text-xs">
      <section className="flex flex-col gap-2">
        <h2 className={SECTION}>{T.site}</h2>
        <div className="grid grid-cols-3 gap-2">
          {SITE_IDS.map((id) => {
            const s = SITE_LABELS[id]
            const active = id === p.siteId
            return (
              <button
                key={id}
                type="button"
                onClick={() => p.setSiteId(id)}
                aria-pressed={active}
                className={`rounded-lg border p-2 text-left cursor-pointer transition-colors ${
                  active
                    ? 'border-accent bg-accent/20'
                    : 'border-card-border bg-input hover:border-border-strong'
                }`}
              >
                <span className="block font-semibold text-text-main">{s.name}</span>
                <span className="text-[11px] text-text-secondary">{s.region}</span>
              </button>
            )
          })}
        </div>
        {p.pkg && (
          <p className="text-[11px] text-text-secondary">
            {T.coverage} · {(p.pkg.shape[1] * p.pkg.cell_size_m) / 1000} ×{' '}
            {(p.pkg.shape[0] * p.pkg.cell_size_m) / 1000} km · {p.pkg.cell_size_m} m DTM
          </p>
        )}
        {p.siteId === 'jezero-crater' && <p className="text-text-secondary">{T.regionalNote}</p>}
        {p.siteId === 'columbia-hills' && (
          <div className="space-y-1 text-text-secondary">
            <p>{T.gusevContext}</p>
            <a
              className="underline hover:text-text-main"
              href="https://science.nasa.gov/mission/mer-spirit/"
              target="_blank"
              rel="noreferrer"
            >
              {T.spiritSources}
            </a>
          </div>
        )}
      </section>

      {!p.apiUrl && (
        <p className="rounded-lg border border-accent/40 bg-accent/20 p-2">{T.noApi}</p>
      )}
      {p.loadError && (
        <p className="rounded-lg border border-accent/40 bg-accent/20 p-2">{p.loadError}</p>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className={SECTION}>{T.plan}</h2>
          <button
            type="button"
            className="text-[11px] text-text-secondary hover:text-text-main cursor-pointer"
            onClick={p.clear}
          >
            {T.clear}
          </button>
        </div>
        {p.loadExample && p.waypoints.length === 0 && (
          <div className="space-y-1 rounded-lg border border-card-border bg-input p-2">
            <button type="button" className={BTN} onClick={p.loadExample}>
              {T.loadExample}
            </button>
            <p className="text-[11px] text-text-secondary">{T.exampleNote}</p>
            <a
              className="text-[11px] text-text-secondary underline hover:text-text-main"
              href="https://an.rsl.wustl.edu/mera/AN/pages/mer/mer_traverse.htm"
              target="_blank"
              rel="noreferrer"
            >
              {T.spiritTraverse}
            </a>
          </div>
        )}
        <ol className="flex flex-col gap-1.5">
          {p.waypoints.map((pt, i) => {
            const isStart = i === 0
            const isEnd = p.hasEnd && i === p.waypoints.length - 1
            const [lon, lat] = p.toLonLat(pt)
            return (
              <li
                key={`${i}-${pt[0]}-${pt[1]}`}
                className="flex items-center gap-2 rounded-lg border border-card-border bg-input px-2 py-1.5"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isStart
                      ? 'bg-secondary text-main'
                      : isEnd
                        ? 'bg-accent text-text-main'
                        : 'border border-border-strong bg-card text-text-main'
                  }`}
                >
                  {isStart ? 'A' : isEnd ? 'B' : `S${i}`}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">
                    {isStart ? T.start : isEnd ? T.end : `${T.stop} ${i}`}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    {lat.toFixed(5)}°, {lon.toFixed(5)}°E
                  </span>
                </span>
                {!isStart && !isEnd && (
                  <button
                    type="button"
                    className="px-1 text-text-muted hover:text-text-main cursor-pointer"
                    onClick={() => p.removeStop(i)}
                    aria-label="Remove stop"
                  >
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={p.pickTarget === 'start' ? BTN_ACTIVE : BTN}
            onClick={() => p.setPickTarget('start')}
            disabled={!p.grid}
          >
            {T.pickStart}
          </button>
          <button
            type="button"
            className={p.pickTarget === 'end' ? BTN_ACTIVE : BTN}
            onClick={() => p.setPickTarget('end')}
            disabled={!p.grid || p.waypoints.length === 0}
          >
            {T.pickEnd}
          </button>
          <button
            type="button"
            className={p.pickTarget === 'stop' ? BTN_ACTIVE : BTN}
            onClick={() => p.setPickTarget('stop')}
            disabled={!p.grid || !p.hasEnd || nStops >= MAX_STOPS}
          >
            {T.addStop}
          </button>
          <span className="self-center text-[11px] text-text-muted">
            {nStops}/{MAX_STOPS}
          </span>
        </div>
        {p.pickTarget && p.grid && (
          <p className="text-[11px] text-text-secondary">
            {T.clickTerrain}:{' '}
            <strong>
              {p.pickTarget === 'start' ? 'A' : p.pickTarget === 'end' ? 'B' : T.stop}
            </strong>
          </p>
        )}
        <label className="mt-1 flex flex-col gap-1">
          <span className="flex justify-between">
            <span className="font-semibold">{T.gradeLimit}</span>
            <span className="font-mono">{p.maxGrade}°</span>
          </span>
          <input
            type="range"
            min={10}
            max={35}
            step={1}
            value={p.maxGrade}
            onChange={(e) => p.setMaxGrade(Number(e.target.value))}
            className="accent-accent"
          />
          <span className="text-[10px] text-text-muted">{T.gradeNote}</span>
        </label>
        {p.planning && <p className="text-text-secondary">{T.planning}</p>}
        {p.planError && (
          <p className="rounded-lg border border-accent/40 bg-accent/20 p-2">{p.planError}</p>
        )}
      </section>

      {byId.shortest && byId.lower_risk && (
        <section className="flex flex-col gap-2">
          <h2 className={SECTION}>{T.compare}</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['lower_risk', 'shortest'] as RouteId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => p.setSelectedRouteId(id)}
                aria-pressed={p.selectedRouteId === id}
                className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer ${
                  p.selectedRouteId === id
                    ? 'border-accent bg-accent/20'
                    : 'border-card-border bg-input'
                }`}
              >
                <svg width="26" height="8" aria-hidden="true">
                  <line
                    x1="1"
                    x2="25"
                    y1="4"
                    y2="4"
                    stroke={ROUTE_COLORS[id]}
                    strokeWidth="3"
                    strokeDasharray={id === 'shortest' ? '5 3' : undefined}
                  />
                </svg>
                <span className="text-left">
                  <span className="block font-semibold">
                    {id === 'shortest' ? T.shortest : T.lowerRisk}
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    {byId[id]!.metrics.length_m.toFixed(0)} m ·{' '}
                    {formatMinutes(byId[id]!.metrics.walk_minutes)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-card-border">
            <thead className="bg-input text-[10px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="p-1.5 text-left">{T.metric}</th>
                <th className="p-1.5 text-right">{T.shortest}</th>
                <th className="p-1.5 text-right">{T.lowerRisk}</th>
                <th className="p-1.5 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const a = row.get(byId.shortest!)
                const b = row.get(byId.lower_risk!)
                return (
                  <tr key={row.label} className="odd:bg-card even:bg-input/50">
                    <td className="p-1.5 text-text-secondary">{row.label}</td>
                    <td className="p-1.5 text-right font-mono">{row.fmt(a)}</td>
                    <td className="p-1.5 text-right font-mono">{row.fmt(b)}</td>
                    <td className="p-1.5 text-right font-mono text-text-secondary">
                      {formatDelta(a, b, row.unit, row.digits ?? 1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-text-muted">{T.method}</p>
          <h2 className={`${SECTION} mt-2`}>{T.profile}</h2>
          <ProfileChart routes={p.routes} selectedId={p.selectedRouteId} progress={progress} />
          <button type="button" className={BTN} onClick={p.exportGeoJson}>
            {T.export}
          </button>
        </section>
      )}

      {children}

      {p.pkg && (
        <section className="flex flex-col gap-1.5 border-t border-card-border pt-3">
          <h2 className={SECTION}>{T.sources}</h2>
          {p.pkg.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-text-secondary underline decoration-accent underline-offset-2 hover:text-text-main"
            >
              {s.label}
            </a>
          ))}
          {p.pkg.notes.map((n) => (
            <p key={n} className="text-[10px] text-text-muted">
              {n}
            </p>
          ))}
        </section>
      )}
    </div>
  )
}
