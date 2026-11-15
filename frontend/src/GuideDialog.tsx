import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from './i18n/useTranslation.ts'

export type GuideTarget = 'planner' | 'scenario' | 'site3d' | 'globe'

type Lang = 'en' | 'uk'
type Section = 'start' | 'views' | 'map' | 'data'

const TEXT = {
  en: {
    button: 'Guide',
    title: 'How to use CrimsonHorizon',
    close: 'Close',
    intro:
      'CrimsonHorizon plans walking and driving routes on real Mars terrain. It covers two craters where NASA rovers have driven: Jezero (Perseverance) and Gusev (Spirit). Elevation comes from orbital stereo models (DTMs), so every route has a real length, climb and slope.',
    tabs: { start: 'Quick start', views: 'Views', map: 'Map legend', data: 'Data & limits' },
    stepsTitle: 'Plan your first route in three steps',
    steps: [
      [
        'Open the route planner',
        '2D Map → “Route planner” in the left panel. Pick a site: “regional” sites (CTX, 20 m) cover the whole rover drive for long routes; HiRISE sites (8 m) show detail.',
      ],
      [
        'Place the points',
        'Click the map once for A (start), once more for B (finish). Or press “Follow the rover’s path” to start from the real rover traverse. Add stops with “+ Add stop” or by clicking the small rover-stop dots. Drag any point to move it.',
      ],
      [
        'Compare and explore',
        'Two routes appear: Shortest (dashed) and Lower-risk (solid); with “Follow the rover’s path” a third, dotted one is the rover’s real drive. The table shows length, time, climb and slopes with the difference (Δ); the profile shows elevation along the selected route. Switch to 3D Site to fly over the same routes and press Play.',
      ],
    ],
    tryPlanner: 'Open the route planner',
    views: [
      [
        '2D Map',
        'The main map. The left panel has two modes: “Route planner” (your own routes on any site) and “Hawksbill scenario” (a prepared, fully documented crew traverse at Hawksbill Gap with science stops, safety and environment tabs). The map’s Layers tab switches the base imagery.',
        'planner',
      ],
      [
        '3D Site',
        'The same site, points and routes on the 3D terrain. Drag to orbit, right-drag to pan, wheel to zoom. Play walks the selected route; vertical exaggeration makes relief easier to read. Clicking the terrain places points like on the 2D map.',
        'site3d',
      ],
      [
        'Globe',
        'The whole planet with 644 IAU feature names. Click any name to see its card with a close-up CTX image and “Open on 2D map”. The Jezero and Gusev markers open the crater cards with “Plan routes (2D)” and “Open in 3D”.',
        'globe',
      ],
    ],
    legend: [
      ['A / B', 'Start and finish of your route. S1, S2 … are stops in between.'],
      ['Dashed line', 'Shortest route: the least distance that respects the grade limit.'],
      ['Solid line', 'Lower-risk route: longer, but avoids steep and rough ground.'],
      [
        'Dotted line',
        'Rover’s path: the drive the rover really made between A and B (appears when A and B are on its traverse, e.g. after “Follow the rover’s path”).',
      ],
      ['Arrows', 'Direction of travel on the selected route.'],
      ['Thin light line', 'The rover’s real traverse (NASA/JPL for Perseverance, PDS for Spirit).'],
      [
        'Small terracotta dots',
        'Rover stops, labelled with their sols (Mars days). Click one to add it to your route.',
      ],
      ['Dashed frame', 'The site window: routes can only be planned inside it.'],
    ],
    gradeTitle: 'Grade limit',
    grade:
      'The slider sets the steepest slope a route may use. Lower it to force gentler routes; if no route exists, the planner says so. It is a planning parameter, not a certified spacesuit or rover limit.',
    data: [
      'All imagery and elevation are published NASA, USGS and university data; every source is linked in the panel under “Data sources”.',
      'Regional sites use 20 m CTX cells, which smooth out boulders and small scarps: real local slopes can be steeper than shown. Use the HiRISE sites (8 m) for detail.',
      'Times assume a constant walking pace adjusted for slope; they are estimates for comparing routes.',
      'No route is declared safe. CrimsonHorizon is a planning and learning tool, not mission software.',
    ],
    footer: 'You can reopen this guide any time with the “Guide” button at the top.',
  },
  uk: {
    button: 'Довідка',
    title: 'Як користуватися CrimsonHorizon',
    close: 'Закрити',
    intro:
      'CrimsonHorizon прокладає пішохідні й транспортні маршрути по справжньому рельєфу Марса. Він охоплює два кратери, де їздили марсоходи NASA: Єзеро (Perseverance) і Ґусєв (Spirit). Висоти взято з орбітальних стереомоделей (DTM), тож кожен маршрут має реальну довжину, набір висоти й ухили.',
    tabs: {
      start: 'Швидкий старт',
      views: 'Режими',
      map: 'Легенда карти',
      data: 'Дані й обмеження',
    },
    stepsTitle: 'Перший маршрут за три кроки',
    steps: [
      [
        'Відкрийте планувальник',
        '2D Map → «Route planner» у лівій панелі. Оберіть ділянку: «regional» (CTX, 20 м) охоплюють увесь шлях марсохода для довгих маршрутів; ділянки HiRISE (8 м) показують деталі.',
      ],
      [
        'Поставте точки',
        'Клацніть по карті раз — це A (старт), ще раз — B (фініш). Або натисніть «Пройти шляхом марсохода», щоб почати від справжнього траверсу. Зупинки додаються кнопкою «+ Add stop» або кліком по маленьких точках-зупинках марсохода. Будь-яку точку можна перетягнути.',
      ],
      [
        'Порівнюйте й досліджуйте',
        'З’являться два маршрути: найкоротший (пунктир) і менш ризиковий (суцільна лінія); після «Пройти шляхом марсохода» є ще третій, з крапок, — справжній шлях марсохода. У таблиці — довжина, час, набір висоти й ухили з різницею (Δ); профіль показує висоти вздовж вибраного маршруту. Перейдіть у 3D Site, щоб облетіти ті самі маршрути й натиснути Play.',
      ],
    ],
    tryPlanner: 'Відкрити планувальник',
    views: [
      [
        '2D Map',
        'Основна карта. Ліва панель має два режими: «Route planner» (ваші маршрути на будь-якій ділянці) і «Hawksbill scenario» (підготовлений і задокументований маршрут екіпажу в Hawksbill Gap з науковими зупинками, вкладками безпеки й середовища). Вкладка Layers перемикає базові знімки.',
        'planner',
      ],
      [
        '3D Site',
        'Та сама ділянка, точки й маршрути на 3D-рельєфі. Тягніть — обертання, правою кнопкою — зсув, колесо — масштаб. Play проводить фігурку вибраним маршрутом; вертикальне перебільшення робить рельєф виразнішим. Клік по рельєфу ставить точки так само, як на 2D-карті.',
        'site3d',
      ],
      [
        'Globe',
        'Уся планета з 644 назвами IAU. Клацніть будь-яку назву — відкриється картка зі знімком CTX зблизька і кнопкою «Open on 2D map». Маркери Єзеро й Ґусєва відкривають картки кратерів з кнопками «Планувати маршрути (2D)» і «Відкрити в 3D».',
        'globe',
      ],
    ],
    legend: [
      ['A / B', 'Старт і фініш маршруту. S1, S2 … — проміжні зупинки.'],
      ['Пунктир', 'Найкоротший маршрут: найменша відстань у межах обмеження ухилу.'],
      ['Суцільна лінія', 'Менш ризиковий маршрут: довший, але оминає круті й нерівні ділянки.'],
      [
        'Лінія з крапок',
        'Шлях марсохода: як марсохід справді проїхав між A і B (з’являється, коли A і B лежать на його траверсі, наприклад після «Пройти шляхом марсохода»).',
      ],
      ['Стрілки', 'Напрямок руху вибраним маршрутом.'],
      [
        'Тонка світла лінія',
        'Справжній шлях марсохода (NASA/JPL для Perseverance, PDS для Spirit).',
      ],
      [
        'Маленькі теракотові точки',
        'Зупинки марсохода з солами (марсіанськими добами). Клік додає зупинку до маршруту.',
      ],
      ['Пунктирна рамка', 'Межі ділянки: маршрути можна планувати лише всередині.'],
    ],
    gradeTitle: 'Обмеження ухилу',
    grade:
      'Повзунок задає найкрутіший схил, яким може пройти маршрут. Зменшіть його, щоб отримати пологіші маршрути; якщо маршруту немає, планувальник так і скаже. Це параметр планування, а не сертифікована межа скафандра чи марсохода.',
    data: [
      'Усі знімки й висоти — опубліковані дані NASA, USGS та університетів; кожне джерело є в панелі в розділі «Data sources».',
      'Регіональні ділянки мають клітинки CTX 20 м, які згладжують валуни й дрібні уступи: справжні локальні ухили можуть бути крутішими. Для деталей беріть ділянки HiRISE (8 м).',
      'Час рахується за сталого темпу з поправкою на ухил; це оцінка для порівняння маршрутів.',
      'Жоден маршрут не оголошується безпечним. CrimsonHorizon — інструмент для планування й навчання, а не програма для місій.',
    ],
    footer: 'Відкрити довідку знову можна будь-коли кнопкою «Довідка» вгорі.',
  },
} as const

const SEEN_KEY = 'crimson-horizon.guide-seen'

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return true // storage blocked: don't pop up on every visit
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // ignore: the guide is still reachable from the header
  }
}

/** Header button plus the guide dialog; opens by itself on the first visit. */
export function Guide({ onGo }: { onGo: (target: GuideTarget) => void }) {
  const { locale } = useTranslation()
  const lang: Lang = locale === 'uk' ? 'uk' : 'en'
  const T = TEXT[lang]
  const [open, setOpen] = useState(() => !readSeen())
  const [section, setSection] = useState<Section>('start')
  const dialogRef = useRef<HTMLDivElement>(null)

  const close = () => {
    markSeen()
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (target: GuideTarget) => {
    close()
    onGo(target)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSection('start')
          setOpen(true)
        }}
        className="flex items-center gap-1.5 rounded-lg border border-card-border bg-input px-2 py-1 text-xs font-semibold hover:border-secondary cursor-pointer"
        aria-haspopup="dialog"
      >
        <span
          aria-hidden="true"
          className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-text-main"
        >
          ?
        </span>
        {T.button}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            tabIndex={-1}
            className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-strong bg-card-elevated text-sm shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-card-border p-4">
              <div className="flex flex-col gap-1.5">
                <h2 id="guide-title" className="text-base font-bold text-text-main">
                  {T.title}
                </h2>
                <p className="text-text-secondary">{T.intro}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={T.close}
                className="text-text-muted hover:text-text-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-b border-card-border px-4 pt-2">
              {(Object.keys(T.tabs) as Section[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={section === id}
                  onClick={() => setSection(id)}
                  className={`whitespace-nowrap border-b-2 px-2.5 pb-2 text-xs font-semibold cursor-pointer ${
                    section === id
                      ? 'border-accent text-text-main'
                      : 'border-transparent text-text-secondary hover:text-text-main'
                  }`}
                >
                  {T.tabs[id]}
                </button>
              ))}
            </nav>

            <div className="flex flex-col gap-3 overflow-y-auto p-4 text-text-secondary">
              {section === 'start' && (
                <>
                  <h3 className="font-semibold text-text-main">{T.stepsTitle}</h3>
                  <ol className="flex flex-col gap-3">
                    {T.steps.map(([title, body], i) => (
                      <li key={title} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-text-main">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-text-main">{title}</p>
                          <p>{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <GoButton onClick={() => go('planner')}>{T.tryPlanner}</GoButton>
                </>
              )}

              {section === 'views' &&
                T.views.map(([title, body, target]) => (
                  <div
                    key={title}
                    className="flex flex-col gap-2 rounded-lg border border-card-border bg-input p-3"
                  >
                    <p className="font-semibold text-text-main">{title}</p>
                    <p>{body}</p>
                    <GoButton onClick={() => go(target)}>
                      {lang === 'uk' ? 'Перейти' : 'Go there'} → {title}
                    </GoButton>
                  </div>
                ))}

              {section === 'map' && (
                <>
                  <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2">
                    {T.legend.map(([term, desc]) => (
                      <div key={term} className="contents">
                        <dt className="font-semibold text-text-main">{term}</dt>
                        <dd>{desc}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3 className="mt-1 font-semibold text-text-main">{T.gradeTitle}</h3>
                  <p>{T.grade}</p>
                </>
              )}

              {section === 'data' && (
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  {T.data.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="border-t border-card-border px-4 py-2.5 text-[11px] text-text-muted">
              {T.footer}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function GoButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-text-main hover:bg-accent-hover cursor-pointer"
    >
      {children}
    </button>
  )
}
