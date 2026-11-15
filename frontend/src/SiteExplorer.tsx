import { useMemo, useState } from 'react'
import { useTranslation } from './i18n/useTranslation.ts'
import { BTN, BTN_ACTIVE, SECTION, usePlannerText } from './plannerText.ts'
import { RoutePlannerPanel } from './RoutePlannerPanel.tsx'
import type { Scenario } from './scenario.ts'
import { aeqdForward, formatMinutes, textureUrl } from './sites.ts'
import { Terrain3DView, type OverlayLine, type OverlayPin } from './Terrain3DView.tsx'
import type { RoutePlanner } from './useRoutePlanner.ts'

const TEXT = {
  en: {
    playback: '3D playback',
    play: '▶ Play',
    pause: '❚❚ Pause',
    restart: '↺ Restart',
    follow: 'Follow walker',
    exaggeration: 'Vertical exaggeration',
    elapsed: 'Mission clock',
    walkerNote: 'Walker drawn enlarged for visibility (illustrative scale).',
    prepared: 'Grey lines: prepared scenario options A/B',
    hint: 'Drag to orbit · right-drag to pan · wheel to zoom',
  },
  uk: {
    playback: '3D-програвання',
    play: '▶ Старт',
    pause: '❚❚ Пауза',
    restart: '↺ Спочатку',
    follow: 'Стежити за астронавтом',
    exaggeration: 'Вертикальне перебільшення',
    elapsed: 'Годинник місії',
    walkerNote: 'Астронавт збільшений для наочності (ілюстративний масштаб).',
    prepared: 'Сірі лінії: підготовлені варіанти сценарію A/B',
    hint: 'Тягніть — обертання · правою — зсув · колесо — масштаб',
  },
} as const

export interface SiteExplorerProps {
  planner: RoutePlanner
  scenario: Scenario | null
}

export function SiteExplorer({ planner, scenario }: SiteExplorerProps) {
  const { locale } = useTranslation()
  const T = TEXT[locale === 'uk' ? 'uk' : 'en']
  const PT = usePlannerText()
  const { siteId, pkg, grid, routes, selectedRouteId, apiUrl } = planner

  const [exaggeration, setExaggeration] = useState(1.5)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [follow, setFollow] = useState(false)
  // Progress is tied to the plan it was measured on, so a new plan starts at 0.
  const [progressState, setProgressState] = useState({ key: '', value: 0 })
  const [restartNonce, setRestartNonce] = useState(0)
  const progressKey = `${planner.planKey}|${selectedRouteId}|${restartNonce}`
  const progress = progressState.key === progressKey ? progressState.value : 0
  const selected = routes.find((r) => r.id === selectedRouteId)

  // Context: the rover's traverse (every site) and, on Hawksbill Gap, the prepared
  // scenario options and stops.
  const traverse = planner.traverse
  const places = planner.places
  const lang = locale === 'uk' ? 'uk' : 'en'
  // When the rover's own path is a planned route, it is drawn as that route instead.
  const hasRoverRoute = routes.some((r) => r.id === 'rover')
  const { overlayLines, overlayPins } = useMemo(() => {
    const lines: OverlayLine[] = []
    const pins: OverlayPin[] = []
    if (traverse) {
      if (!hasRoverRoute)
        traverse.lines.forEach((run, i) => {
          if (run.length > 1)
            lines.push({
              id: `rover-${i}`,
              label: i === 0 ? traverse.name : '',
              color: '#EBEBEB',
              points: run,
            })
        })
      if (places.length > 0) {
        // Key mission places, numbered as in the planner panel.
        for (const pl of places)
          pins.push({ id: pl.id, label: `${pl.n}. ${pl.name[lang]}`, x: pl.x, y: pl.y })
      } else {
        const first = traverse.stops[0]
        const last = traverse.stops[traverse.stops.length - 1]
        if (first)
          pins.push({ id: 'rover-first', label: `Sol ${first.sol_start}`, x: first.x, y: first.y })
        if (last && last !== first)
          pins.push({ id: 'rover-last', label: `Sol ${last.sol_end}`, x: last.x, y: last.y })
      }
    }
    if (siteId !== 'hawksbill-gap' || !scenario || !pkg)
      return { overlayLines: lines, overlayPins: pins }
    const [lon0, lat0] = pkg.center_lon_lat
    const proj = (c: number[]) => aeqdForward(c[0], c[1], lon0, lat0, pkg.radius_m)
    for (const option of scenario.route_options) {
      const pts = scenario.routes.features
        .filter((f) => f.properties.option === option.id && f.properties.leg === 'outbound')
        .sort((a, b) => a.properties.order - b.properties.order)
        .flatMap((f) => f.geometry.coordinates.map(proj))
      if (pts.length > 1)
        lines.push({ id: option.id, label: `Option ${option.id}`, color: '#A3A3A3', points: pts })
    }
    for (const s of scenario.stops) {
      const [x, y] = proj(s.coordinates as number[])
      pins.push({ id: s.id, label: s.name, x, y })
    }
    return { overlayLines: lines, overlayPins: pins }
  }, [siteId, scenario, pkg, traverse, hasRoverRoute, places, lang])

  const restart = () => setRestartNonce((n) => n + 1)

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="z-10 flex max-h-[45%] w-full shrink-0 flex-col overflow-y-auto border-b border-card-border bg-card p-4 md:max-h-none md:w-[420px] md:border-r md:border-b-0 lg:w-[460px]">
        <RoutePlannerPanel planner={planner} progress={progress}>
          {selected && (
            <section className="flex flex-col gap-2 text-xs">
              <h2 className={SECTION}>{T.playback}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={BTN_ACTIVE}
                  onClick={() => {
                    if (progress >= 1) restart()
                    setPlaying((v) => !v)
                  }}
                >
                  {playing ? T.pause : T.play}
                </button>
                <button type="button" className={BTN} onClick={restart}>
                  {T.restart}
                </button>
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={speed === s ? BTN_ACTIVE : BTN}
                    onClick={() => setSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={follow}
                    onChange={(e) => setFollow(e.target.checked)}
                    className="accent-accent"
                  />
                  {T.follow}
                </label>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-card-border bg-input px-2 py-1.5 font-mono">
                <span className="text-text-secondary">{T.elapsed}</span>
                <span>
                  {formatMinutes(progress * selected.metrics.walk_minutes)} /{' '}
                  {formatMinutes(selected.metrics.walk_minutes)} ·{' '}
                  {(progress * selected.metrics.length_m).toFixed(0)} m
                </span>
              </div>
            </section>
          )}
          <section className="flex flex-col gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="flex justify-between">
                <span className="font-semibold">{T.exaggeration}</span>
                <span className="font-mono">{exaggeration.toFixed(1)}×</span>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={exaggeration}
                onChange={(e) => setExaggeration(Number(e.target.value))}
                className="accent-accent"
              />
            </label>
            {overlayLines.length > 0 && (
              <p className="text-[11px] text-text-secondary">{T.prepared}</p>
            )}
            {selected && <p className="text-xs text-text-secondary">{T.walkerNote}</p>}
          </section>
        </RoutePlannerPanel>
      </aside>

      <main className="relative min-h-0 flex-1 bg-canvas">
        {grid && pkg && apiUrl ? (
          <>
            <Terrain3DView
              grid={grid}
              textureUrl={textureUrl(apiUrl, pkg)}
              exaggeration={exaggeration}
              routes={routes}
              selectedRouteId={selectedRouteId}
              waypoints={planner.waypoints}
              overlayLines={overlayLines}
              overlayPins={overlayPins}
              picking={planner.pickTarget !== null}
              playing={playing}
              speed={speed}
              follow={follow}
              onPick={(x, y) => {
                planner.pick(x, y)
              }}
              onProgress={(value) => setProgressState({ key: progressKey, value })}
              onPlaybackEnd={() => setPlaying(false)}
              restartNonce={restartNonce}
            />
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded-lg border border-card-border bg-card/90 px-3 py-2 text-xs">
              <span className="text-[11px] text-text-secondary">
                {pkg.cell_size_m >= 15 ? 'CTX' : 'HiRISE'} DTM · {pkg.cell_size_m} m
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-card-border bg-card/90 px-2.5 py-1 text-[11px] text-text-secondary">
              {T.hint}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-text-secondary">
            {apiUrl ? (planner.loadError ?? PT.loading) : PT.noApi}
          </div>
        )}
      </main>
    </div>
  )
}
