import { useTranslation } from './i18n/useTranslation.ts'
import type { SiteId } from './sites.ts'

export const PLANNER_TEXT = {
  en: {
    site: 'Site',
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
    compare: 'Route comparison',
    metric: 'Metric',
    shortest: 'Shortest',
    lowerRisk: 'Lower-risk',
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
    compare: 'Порівняння маршрутів',
    metric: 'Показник',
    shortest: 'Найкоротший',
    lowerRisk: 'Менш ризиковий',
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
  'columbia-hills': { name: 'Columbia Hills', region: 'Gusev crater · Spirit' },
  'hawksbill-gap': { name: 'Hawksbill Gap', region: 'Jezero crater · Perseverance' },
}

export const SECTION = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
export const BTN =
  'rounded-lg border border-card-border bg-card-elevated px-2.5 py-1 text-xs font-medium text-text-main hover:border-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
export const BTN_ACTIVE =
  'rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-text-main hover:bg-accent-hover cursor-pointer'
