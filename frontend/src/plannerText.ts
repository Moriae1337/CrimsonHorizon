import { useTranslation } from './i18n/useTranslation.ts'
import type { SiteId } from './sites.ts'

export const PLANNER_TEXT = {
  en: {
    site: 'Site',
    newSite: 'new',
    loading: 'Loading terrain…',
    noApi: 'Set VITE_API_URL to load terrain and plan routes.',
    plan: 'Where should the crew go?',
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
    sameIn3d: 'The same site, points and routes appear in the 2D map and the 3D view.',
  },
  uk: {
    site: 'Ділянка',
    newSite: 'нова',
    loading: 'Завантаження рельєфу…',
    noApi: 'Вкажіть VITE_API_URL, щоб завантажити рельєф і планувати маршрути.',
    plan: 'Куди йде екіпаж?',
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
    sameIn3d: 'Та сама ділянка, точки й маршрути показуються і на 2D-мапі, і в 3D.',
  },
} as const

export function usePlannerText() {
  const { locale } = useTranslation()
  return PLANNER_TEXT[locale === 'uk' ? 'uk' : 'en']
}

export const SITE_LABELS: Record<SiteId, { name: string; region: string; isNew: boolean }> = {
  'columbia-hills': { name: 'Columbia Hills', region: 'Gusev crater · Spirit', isNew: true },
  'hawksbill-gap': { name: 'Hawksbill Gap', region: 'Jezero crater · Perseverance', isNew: false },
}

export const SECTION = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
export const BTN =
  'rounded-lg border border-card-border bg-card-elevated px-2.5 py-1 text-xs font-medium text-text-main hover:border-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
export const BTN_ACTIVE =
  'rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-text-main hover:bg-accent-hover cursor-pointer'
