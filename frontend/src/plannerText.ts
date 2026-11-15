import { useTranslation } from './i18n/useTranslation.ts'
import type { SiteId } from './sites.ts'

export const PLANNER_TEXT = {
  en: {
    site: 'Site',
    crater: 'Crater',
    story: 'What happened here',
    storyHint:
      'Key moments of the mission in this window, in order. Numbers match the markers on the map; “+ Stop” adds the place to your route.',
    addAsStop: '+ Stop',
    sol: 'Sol',
    storyMore: 'Source',
    roverTraverse: 'Rover traverse',
    localized: 'localized traverse',
    sols: 'sols',
    roverStopsHint:
      'Small dots on the map are the rover’s stops; click one to add it to your route as a stop.',
    followRover: 'Follow the rover’s path',
    followNote:
      'Shows the rover’s real drive (dotted) from its first to its last stop in this window, so you can walk it in 3D. For comparison, the two planned routes go through up to 8 of its stops. Long routes take a few seconds.',
    roverStop: 'Rover stop',
    roverStops: 'Stops',
    roverStopTip: 'click to add as a stop',
    openPlanner: 'Plan routes (2D)',
    open3d: 'Open in 3D',
    coverage: 'Routing area',
    gusevContext:
      'Spirit explored the Columbia Hills inside Gusev crater. It climbed Husband Hill and found silica near Home Plate, evidence of past hot springs or steam vents.',
    spiritSources: 'NASA Spirit mission',
    spiritTraverse: 'Spirit position data',
    loadExample: 'Load Husband Hill → Home Plate',
    exampleNote: 'One-way crew route calculated between two archived Spirit positions.',
    loading: 'Loading terrain…',
    noApi: 'Set VITE_API_URL to load terrain and plan routes.',
    plan: 'Waypoints',
    pickStart: 'Pick A',
    pickEnd: 'Pick B',
    addStop: '+ Add stop',
    clickTerrain: 'Click inside the site window to place',
    start: 'Start',
    end: 'Destination',
    stop: 'Stop',
    clear: 'Clear',
    gradeLimit: 'Grade limit',
    gradeNote: 'Planning parameter, not a cited spacesuit limit. No route is declared safe.',
    planning: 'Planning routes…',
    mapPlaceStart: 'Click the map to place A',
    mapPlaceEnd: 'Click the map to place B',
    mapPlaceStop: 'Click the map to add a stop (it goes between the nearest points)',
    mapAdjust: 'Drag A, B or a stop to move it · click a route to select it',
    outside: 'Outside the site DTM window: pick a point inside the dashed outline',
    compare: 'Route comparison',
    metric: 'Metric',
    shortest: 'Shortest',
    lowerRisk: 'Lower-risk',
    roverPath: 'Rover’s path',
    roverPathNote:
      'Rover’s path is the drive the rover actually made between A and B, measured on this terrain. It ignores your stops and the grade limit.',
    length: 'Distance',
    ascent: 'Ascent',
    descent: 'Descent',
    maxGrade: 'Max grade (along route)',
    meanSlope: 'Mean surface slope',
    walk: 'Walk time (suit, Tobler)',
    steep: 'Distance ≥ 15° grade',
    profile: 'Elevation profile',
    export: 'Export GeoJSON',
    sources: 'Data sources',
    method:
      'A* search on the HiRISE DTM grid with line-of-sight shortening. Lower-risk weights surface slope and roughness.',
  },
  uk: {
    site: 'Ділянка',
    crater: 'Кратер',
    story: 'Що тут відбувалося',
    storyHint:
      'Ключові моменти місії в цьому вікні, по черзі. Номери збігаються з мітками на карті; «+ Зупинка» додає місце до маршруту.',
    addAsStop: '+ Зупинка',
    sol: 'Сол',
    storyMore: 'Джерело',
    roverTraverse: 'Траверс марсохода',
    localized: 'локалізований траверс',
    sols: 'соли',
    roverStopsHint:
      'Маленькі точки на карті — зупинки марсохода; клацніть точку, щоб додати її до маршруту як зупинку.',
    followRover: 'Пройти шляхом марсохода',
    followNote:
      'Показує справжній шлях марсохода (пунктир з крапок) від першої до останньої зупинки в цьому вікні — його можна пройти в 3D. Для порівняння два сплановані маршрути йдуть через до 8 його зупинок. Довгі маршрути рахуються кілька секунд.',
    roverStop: 'Зупинка марсохода',
    roverStops: 'Зупинок',
    roverStopTip: 'клацніть, щоб додати як зупинку',
    openPlanner: 'Планувати маршрути (2D)',
    open3d: 'Відкрити в 3D',
    coverage: 'Зона планування',
    gusevContext:
      'Марсохід Spirit досліджував пагорби Колумбія в кратері Ґусєв. Він піднявся на пагорб Гасбенд і знайшов кремнезем біля плато Гоум-Плейт, що свідчить про давні гарячі джерела або парові виходи.',
    spiritSources: 'Місія Spirit на сайті NASA',
    spiritTraverse: 'Координати Spirit',
    loadExample: 'Завантажити Гасбенд → Гоум-Плейт',
    exampleNote: 'Односторонній маршрут екіпажу між двома архівними позиціями Spirit.',
    loading: 'Завантаження рельєфу…',
    noApi: 'Вкажіть VITE_API_URL, щоб завантажити рельєф і планувати маршрути.',
    plan: 'Точки маршруту',
    pickStart: 'Обрати A',
    pickEnd: 'Обрати B',
    addStop: '+ Зупинка',
    clickTerrain: 'Клацніть усередині вікна ділянки, щоб поставити',
    start: 'Старт',
    end: 'Ціль',
    stop: 'Зупинка',
    clear: 'Очистити',
    gradeLimit: 'Ліміт ухилу',
    gradeNote:
      'Параметр планування, а не підтверджений ліміт скафандра. Жоден маршрут не оголошується безпечним.',
    planning: 'Розрахунок маршрутів…',
    mapPlaceStart: 'Клацніть на карті, щоб поставити A',
    mapPlaceEnd: 'Клацніть на карті, щоб поставити B',
    mapPlaceStop: 'Клацніть на карті, щоб додати зупинку (вона стане між найближчими точками)',
    mapAdjust: 'Перетягніть A, B чи зупинку, щоб посунути · клацніть маршрут, щоб вибрати',
    outside: 'Поза вікном DTM ділянки: оберіть точку всередині пунктирної рамки',
    compare: 'Порівняння маршрутів',
    metric: 'Показник',
    shortest: 'Найкоротший',
    lowerRisk: 'Менш ризиковий',
    roverPath: 'Шлях марсохода',
    roverPathNote:
      'Шлях марсохода — це те, як марсохід справді проїхав між A і B, виміряне на цьому рельєфі. Ваші зупинки й обмеження ухилу на нього не впливають.',
    length: 'Відстань',
    ascent: 'Набір висоти',
    descent: 'Спуск',
    maxGrade: 'Макс. ухил (вздовж маршруту)',
    meanSlope: 'Середній нахил поверхні',
    walk: 'Час ходьби (скафандр, Тоблер)',
    steep: 'Відстань з ухилом ≥ 15°',
    profile: 'Профіль висот',
    export: 'Експорт GeoJSON',
    sources: 'Джерела даних',
    method:
      'Пошук A* по сітці HiRISE DTM зі спрямленням за прямою видимістю. Менш ризиковий зважує нахил і шорсткість поверхні.',
  },
} as const

export function usePlannerText() {
  const { locale } = useTranslation()
  return PLANNER_TEXT[locale === 'uk' ? 'uk' : 'en']
}

export const SITE_LABELS: Record<SiteId, { name: string; region: string }> = {
  'jezero-crater': { name: 'Jezero · regional', region: 'CTX 20 m · whole rover traverse' },
  'hawksbill-gap': { name: 'Hawksbill Gap', region: 'HiRISE 8 m · detail' },
  'gusev-crater': { name: 'Gusev · regional', region: 'CTX 20 m · whole rover traverse' },
  'columbia-hills': { name: 'Columbia Hills', region: 'HiRISE 8 m · detail' },
}

export const SECTION = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
export const BTN =
  'rounded-lg border border-card-border bg-card-elevated px-2.5 py-1 text-xs font-medium text-text-main hover:border-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
export const BTN_ACTIVE =
  'rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-text-main hover:bg-accent-hover cursor-pointer'
