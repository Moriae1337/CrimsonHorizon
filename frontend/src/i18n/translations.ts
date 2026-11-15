// Localization dictionary and translation helpers for CrimsonHorizon (Issue #88 [CH26-070]).

export const SUPPORTED_LOCALES = ['en', 'uk'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'en'

export const EN_TRANSLATIONS = {
  terms: {
    'Option A (Direct to Wildcat Ridge with standoff look)':
      'Option A (Direct to Wildcat Ridge with standoff look)',
    'Option B (Loop via Skinner Ridge and Wildcat Ridge)':
      'Option B (Loop via Skinner Ridge and Wildcat Ridge)',
    bedrock: 'bedrock',
    'float block': 'float block',
    'contact continuity': 'contact continuity',
    unresolved: 'unresolved',
    'abrasion patch': 'abrasion patch',
    'sulfate veins': 'sulfate veins',
    'slope/grade thresholds': 'slope/grade thresholds',
    'obstacle caution': 'obstacle caution',
    'data gaps': 'data gaps',
    'turnaround point': 'turnaround point',
    'atmospheric pressure': 'atmospheric pressure',
    'temperature range': 'temperature range',
    'radiation dose baseline': 'radiation dose baseline',
  },
  routes: {
    optionA: {
      id: 'A',
      label: 'Option A',
      name: 'Option A (Direct to Wildcat Ridge with standoff look)',
      description: 'Direct to Wildcat Ridge with standoff look',
      summary:
        'Direct 258 m round-trip route to Wildcat Ridge with a stand-off view of Skinner Ridge.',
      standoffLook: 'Standoff look',
      distance: '258 m round trip',
      ascent: '13.3 m ascent',
      connectorNote: 'Includes 5.2 m proposed connector',
    },
    optionB: {
      id: 'B',
      label: 'Option B',
      name: 'Option B (Loop via Skinner Ridge and Wildcat Ridge)',
      description: 'Loop via Skinner Ridge and Wildcat Ridge',
      summary: 'Extended 345 m route enabling close-range contact inspection at Skinner Ridge.',
      loop: 'Loop via Skinner Ridge and Wildcat Ridge',
      distance: '345 m round trip',
      ascent: '17.8 m ascent',
      tradeoffNote: '+87 m extra distance for contact inspection',
    },
    roundTrip: 'round trip',
    outbound: 'outbound',
    return: 'return',
    connector: 'Proposed connector (dashed): not driven by the rover',
    historicalTrack: 'Historical Perseverance track',
    startPoint: 'Start point',
    selectionPrompt: 'Select a route option to compare distance, grade, and caution zones.',
  },
  science: {
    bedrock: 'bedrock',
    floatBlock: 'float block',
    contactContinuity: 'contact continuity',
    unresolved: 'unresolved',
    abrasionPatch: 'abrasion patch',
    sulfateVeins: 'sulfate veins',
    inPlace: 'in place',
    separated: 'separated',
    continuous: 'continuous',
    facies: 'facies',
    upperRockytop: 'Upper Rockytop',
    lowerRockytop: 'Lower Rockytop',
    hogwallowFlats: 'Hogwallow Flats',
    wildcatRidge: 'Wildcat Ridge',
    skinnerRidge: 'Skinner Ridge',
    bettysRock: "Betty's Rock",
    thorntonGap: 'Thornton Gap',
    berryHollow: 'Berry Hollow',
    swiftRun: 'Swift Run',
    skyland: 'Skyland',
    hazeltop: 'Hazeltop',
    bearwallow: 'Bearwallow',
    fieldObjective: 'Field objective',
    fieldQuestion:
      'Is the Skinner Ridge block part of the lower Rockytop bedrock beside it, or a float block that came down from upper Rockytop?',
    decidingObservation:
      'Contact observation decides the question. Facies comparison is supporting evidence.',
    competingInterpretations: 'Competing interpretations',
    inPlaceHypothesis:
      'Initial mission report: in-place bedrock based on bedding parallel to Rockytop.',
    floatHypothesis:
      'Williams et al. (2026): displaced float block from Upper Rockytop based on alternating protruding/recessive layering.',
    unresolvedGuidance:
      'If regolith talus or shadows obscure the contact, designate strictly as unresolved — do not guess from parallel bedding.',
    wildcatTask:
      'Record whether calcium-sulfate veins cut across depositional bedding to test for post-depositional alteration.',
    skinnerTask:
      'Inspect contact continuity where the block meets adjacent bedrock. Document bedding orientation, thickness, and grain size.',
  },
  caution: {
    zones: 'Caution zones',
    slopeGradeThresholds: 'Slope / grade thresholds',
    slopeThresholdsDescription:
      'Along-route grade spikes from 15° at 5 m baseline up to 21–22° at 2 m sampling.',
    baseline2m: '2 m baseline grade (up to 21–22°)',
    baseline5m: '5 m baseline grade (~15°)',
    baseline10m: '10 m baseline grade (~14°)',
    dtmDiscordance: 'DTM model discordance on 5.2 m connector (~7° primary vs ~22° fallback)',
    obstacleCaution: 'Obstacle caution',
    obstacleDescription:
      "Large boulders at Betty's Rock, steep scarp talus, and eastern crack/overhang at Skinner Ridge.",
    dataGaps: 'Data gaps',
    dataGapsDescription: 'Segments lacking valid terrain elevation coverage.',
    turnaroundPoint: 'Turnaround point',
    turnaroundDescription:
      'Farthest point from start and commitment to return leg before consumables deplete.',
    clearanceRequired: 'Option cleared only after every caution zone has been reviewed.',
    noClearance: 'Not recommended: unresolved caution zones or hazards along route.',
  },
  weather: {
    atmosphericPressure: 'Atmospheric pressure',
    pressureRange: 'Diurnal surface pressure: 740–760 Pa',
    temperatureRange: 'Temperature range',
    diurnalTemp: 'Diurnal air temperature range: −81°C to −18°C',
    radiationDoseBaseline: 'Radiation dose baseline',
    radiationBaselineValue: '~0.64 mSv/day GCR background (Gale RAD baseline)',
    archivalNote:
      'Archival MEDA weather in Jezero Crater (sols 490–516). Historical record, not a forecast.',
    radDisclaimer:
      'RAD measurements acquired at Gale Crater (~4.5° S), serving as contextual planetary baseline, not a localized Jezero forecast.',
  },
  brief: {
    title: 'Crew Field Brief',
    subtitle: 'Hawksbill Gap Surface Excursion',
    targetAudience: 'Astronaut field geologist and crewmate',
    preDepartureDecision: 'Decision before departure',
    decisionClearedA:
      'Option A Cleared (Wildcat Ridge direct; Skinner Ridge contact inspection deferred)',
    decisionClearedB: 'Option B Cleared (+87 m walk for Skinner Ridge contact observation)',
    decisionNeither: 'Neither route cleared: caution zones require line-of-sight review',
    protocolTitle: 'Field observation protocol',
    unresolvedProtocol:
      "If regolith talus, sand, or shadows obscure the contact edge, log strictly as 'Unresolved' — never infer continuity from parallel bedding.",
    scalePhotoRequired: 'Scale photography required with metric scale bar (~2 cm).',
    viewpointLogging:
      'Log observer standpoint and viewing direction separately from sample coordinates.',
    turnaroundMilestone:
      'Turnaround point milestone: confirm life-support reserves before return leg.',
    returnLegAscent: 'Return leg ascent: {ascent} m',
    totalDistance: 'Total round-trip distance: {distance} m',
  },
  ui: {
    appName: 'CrimsonHorizon',
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    loadingScenario: 'Loading scenario…',
    scenarioLoaded: 'Scenario loaded.',
    scenarioUnavailable: 'Scenario unavailable. The base map still works.',
    scenarioUnsupported: 'Scenario version not supported. The base map still works.',
    retryLoading: 'Retry loading scenario',
    scienceStops: 'Science stops',
    routeOptions: 'Route options (round trip)',
    baseLayer: '02 — Base Layer',
    jezeroOverlays: '03 — Jezero Overlays',
    referencePoints: '04 — Reference Points',
    cores: 'Cores',
    sol: 'Sol',
    sols: 'Sols',
    distance: 'Distance',
    elevation: 'Elevation',
    ascent: 'Ascent',
    maxGrade: 'Max grade',
    meters: 'm',
    degrees: '°',
    language: 'Language',
    english: 'English',
    ukrainian: 'Українська',
    close: 'Close',
    open: 'Open',
    source: 'Source',
    sources: 'Sources',
  },
} as const

export type DeepString<T> = T extends string
  ? string
  : {
      [K in keyof T]: DeepString<T[K]>
    }

export type TranslationDictionary = DeepString<typeof EN_TRANSLATIONS>

export const UK_TRANSLATIONS: TranslationDictionary = {
  terms: {
    'Option A (Direct to Wildcat Ridge with standoff look)':
      'Варіант A (Прямий до хребта Вайлдкет із дистанційним оглядом)',
    'Option B (Loop via Skinner Ridge and Wildcat Ridge)':
      'Варіант B (Кільце через хребет Скіннер та хребет Вайлдкет)',
    bedrock: 'корінна порода',
    'float block': 'елювіальний/зсувний уламок',
    'contact continuity': 'безперервність контакту',
    unresolved: 'невизначено',
    'abrasion patch': 'пляма шліфування',
    'sulfate veins': 'сульфатні жили',
    'slope/grade thresholds': 'порогові значення схилу / крутизни',
    'obstacle caution': 'попередження про перешкоди',
    'data gaps': 'прогалини в даних',
    'turnaround point': 'точка розвороту',
    'atmospheric pressure': 'атмосферний тиск',
    'temperature range': 'температурний діапазон',
    'radiation dose baseline': 'базовий рівень дози радіації',
  },
  routes: {
    optionA: {
      id: 'A',
      label: 'Варіант A',
      name: 'Варіант A (Прямий до хребта Вайлдкет із дистанційним оглядом)',
      description: 'Прямий до хребта Вайлдкет із дистанційним оглядом',
      summary:
        'Прямий круговий маршрут 258 м до хребта Вайлдкет із дистанційним оглядом хребта Скіннер.',
      standoffLook: 'Дистанційний огляд',
      distance: '258 м в обидва кінці',
      ascent: '13,3 м підйому',
      connectorNote: 'Включає 5,2 м запропонованої сполучної ділянки',
    },
    optionB: {
      id: 'B',
      label: 'Варіант B',
      name: 'Варіант B (Кільце через хребет Скіннер та хребет Вайлдкет)',
      description: 'Кільце через хребет Скіннер та хребет Вайлдкет',
      summary:
        'Подовжений круговий маршрут 345 м, що дозволяє провести огляд контакту з близької відстані на хребті Скіннер.',
      loop: 'Кільце через хребет Скіннер та хребет Вайлдкет',
      distance: '345 м в обидва кінці',
      ascent: '17,8 м підйому',
      tradeoffNote: '+87 м додаткової відстані для огляду контакту',
    },
    roundTrip: 'в обидва кінці',
    outbound: 'туди',
    return: 'назад',
    connector: 'Запропонована сполучна ділянка (пунктир): марсохід тут не рухався',
    historicalTrack: 'Історичний трек марсохода Perseverance',
    startPoint: 'Точка старту',
    selectionPrompt:
      'Оберіть варіант маршруту для порівняння відстані, крутизни та зон підвищеної уваги.',
  },
  science: {
    bedrock: 'корінна порода',
    floatBlock: 'елювіальний/зсувний уламок',
    contactContinuity: 'безперервність контакту',
    unresolved: 'невизначено',
    abrasionPatch: 'пляма шліфування',
    sulfateVeins: 'сульфатні жили',
    inPlace: 'в корінному заляганні',
    separated: 'відокремлений',
    continuous: 'безперервний',
    facies: 'фації',
    upperRockytop: 'Верхній Рокітоп',
    lowerRockytop: 'Нижній Рокітоп',
    hogwallowFlats: 'Гоґволлоу Флетс',
    wildcatRidge: 'хребет Вайлдкет',
    skinnerRidge: 'хребет Скіннер',
    bettysRock: 'Скеля Бетті',
    thorntonGap: 'Торнтон Геп',
    berryHollow: 'Беррі Голлоу',
    swiftRun: 'Свіфт Ран',
    skyland: 'Скайленд',
    hazeltop: 'Хейзелтоп',
    bearwallow: 'Беарволлоу',
    fieldObjective: 'Польова мета',
    fieldQuestion:
      'Чи є блок хребта Скіннер частиною корінної породи Нижнього Рокітопа, чи це елювіальний/зсувний уламок, що зійшов із Верхнього Рокітопа?',
    decidingObservation:
      'Спостереження контакту є вирішальним. Порівняння фацій — допоміжний доказ.',
    competingInterpretations: 'Конкуруючі інтерпретації',
    inPlaceHypothesis:
      'Початковий звіт місії: корінна порода на місці через паралельність шаруватості до Рокітопа.',
    floatHypothesis:
      'Williams et al. (2026): зміщений елювіальний/зсувний уламок із Верхнього Рокітопа через чергування виступних і заглиблених шарів.',
    unresolvedGuidance:
      "Якщо осип реголіту або тіні закривають контакт, кваліфікувати суворо як 'невизначено' — не робити припущень на основі паралельної шаруватості.",
    wildcatTask:
      'Зафіксувати, чи перетинають сульфатні жили осадову шаруватість, для перевірки постседиментаційних змін.',
    skinnerTask:
      'Перевірити безперервність контакту у місці прилягання блоку до корінної породи. Задокументувати орієнтацію шарів, потужність та розмір зерен.',
  },
  caution: {
    zones: 'Зони підвищеної уваги',
    slopeGradeThresholds: 'Порогові значення схилу / крутизни',
    slopeThresholdsDescription:
      'Крутизна вздовж маршруту зростає з 15° на базі 5 м до 21–22° при вибірці 2 м.',
    baseline2m: 'Крутизна на базі 2 м (до 21–22°)',
    baseline5m: 'Крутизна на базі 5 м (~15°)',
    baseline10m: 'Крутизна на базі 10 м (~14°)',
    dtmDiscordance:
      'Розбіжність моделей ЦМР на сполучній ділянці 5,2 м (~7° за основною проти ~22° за резервною)',
    obstacleCaution: 'Попередження про перешкоди',
    obstacleDescription:
      'Великі валуни біля Скелі Бетті, круті осипи уступу та східна тріщина з нависом на хребті Скіннер.',
    dataGaps: 'Прогалини в даних',
    dataGapsDescription: 'Ділянки без достовірних даних висоти рельєфу.',
    turnaroundPoint: 'Точка розвороту',
    turnaroundDescription:
      'Найвіддаленіша точка від старту та перехід до зворотного шляху до вичерпання ресурсів життєзабезпечення.',
    clearanceRequired: 'Варіант схвалюється лише після перевірки кожної зони підвищеної уваги.',
    noClearance: 'Не рекомендовано: неперевірені зони підвищеної уваги або перешкоди на маршруті.',
  },
  weather: {
    atmosphericPressure: 'Атмосферний тиск',
    pressureRange: 'Добовий тиск на поверхні: 740–760 Па',
    temperatureRange: 'Температурний діапазон',
    diurnalTemp: 'Добовий діапазон температури повітря: від −81°C до −18°C',
    radiationDoseBaseline: 'Базовий рівень дози радіації',
    radiationBaselineValue: '~0,64 мЗв/добу фонового ГКВ (базовий рівень RAD у кратері Ґейл)',
    archivalNote:
      'Архівні дані погоди MEDA в кратері Єзеро (соли 490–516). Історичні дані, не прогноз.',
    radDisclaimer:
      'Вимірювання RAD отримані в кратері Ґейл (~4,5° пд. ш.) як контекстний планетарний базовий рівень, а не локальний прогноз для кратера Єзеро.',
  },
  brief: {
    title: 'Польовий інструктаж екіпажу',
    subtitle: 'Вихід на поверхню в районі Гоксбілл Геп',
    targetAudience: 'Астронавт-польовий геолог та напарник',
    preDepartureDecision: 'Рішення перед виходом',
    decisionClearedA:
      'Варіант A Схвалено (прямий до хребта Вайлдкет; огляд контакту на хребті Скіннер відкладено)',
    decisionClearedB:
      'Варіант B Схвалено (+87 м пішого переходу для спостереження контакту на хребті Скіннер)',
    decisionNeither:
      'Жоден маршрут не схвалено: зони підвищеної уваги потребують візуальної перевірки прямої видимості',
    protocolTitle: 'Протокол польових спостережень',
    unresolvedProtocol:
      "Якщо осип реголіту, пісок або тіні закривають край контакту, реєструвати суворо як 'Невизначено' — у жодному разі не робити висновків на основі паралельної шаруватості.",
    scalePhotoRequired: "Обов'язкова масштабна фотозйомка з метричною шкалою (~2 см).",
    viewpointLogging:
      'Фіксувати позицію спостерігача та напрямок огляду окремо від координат зразка.',
    turnaroundMilestone:
      'Контрольна точка розвороту: перевірити запаси систем життєзабезпечення перед зворотним шляхом.',
    returnLegAscent: 'Підйом на зворотному шляху: {ascent} м',
    totalDistance: 'Загальна дистанція в обидва кінці: {distance} м',
  },
  ui: {
    appName: 'CrimsonHorizon',
    connecting: "З'єднання",
    connected: 'Підключено',
    disconnected: 'Відключено',
    loadingScenario: 'Завантаження сценарію…',
    scenarioLoaded: 'Сценарій завантажено.',
    scenarioUnavailable: 'Сценарій недоступний. Базова карта продовжує працювати.',
    scenarioUnsupported: 'Версія сценарію не підтримується. Базова карта продовжує працювати.',
    retryLoading: 'Повторити завантаження сценарію',
    scienceStops: 'Наукові зупинки',
    routeOptions: 'Варіанти маршруту (в обидва кінці)',
    baseLayer: '02 — Базовий шар',
    jezeroOverlays: '03 — Оверлеї кратера Єзеро',
    referencePoints: '04 — Опорні точки',
    cores: 'Керни',
    sol: 'Сол',
    sols: 'Соли',
    distance: 'Відстань',
    elevation: 'Висота',
    ascent: 'Підйом',
    maxGrade: 'Макс. крутизна',
    meters: 'м',
    degrees: '°',
    language: 'Мова',
    english: 'English',
    ukrainian: 'Українська',
    close: 'Закрити',
    open: 'Відкрити',
    source: 'Джерело',
    sources: 'Джерела',
  },
}

export const translations: Record<SupportedLocale, TranslationDictionary> = {
  en: EN_TRANSLATIONS,
  uk: UK_TRANSLATIONS,
}

type NestedPath<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedPath<T[K]>}`
    }[keyof T & string]

export type TranslationKey =
  NestedPath<TranslationDictionary> | keyof TranslationDictionary['terms']

let currentLocale: SupportedLocale = DEFAULT_LOCALE
const listeners = new Set<() => void>()

export function getLocale(): SupportedLocale {
  return currentLocale
}

export function setLocale(locale: SupportedLocale): void {
  if (currentLocale !== locale && SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale
    listeners.forEach((fn) => fn())
  }
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | null {
  // 1. Direct top-level match
  if (path in obj && typeof obj[path] === 'string') {
    return obj[path] as string
  }
  // 2. Direct term in 'terms'
  if ('terms' in obj && typeof obj.terms === 'object' && obj.terms !== null) {
    const terms = obj.terms as Record<string, unknown>
    if (path in terms && typeof terms[path] === 'string') {
      return terms[path] as string
    }
  }
  // 3. Dot-separated path
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return null
    }
  }
  return typeof current === 'string' ? current : null
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}|\{\{(\w+)\}\}/g, (_, k1, k2) => {
    const key = k1 ?? k2
    return key in params ? String(params[key]) : `{${key}}`
  })
}

/**
 * Type-safe translation helper with English fallback.
 */
export function t(
  key: TranslationKey | (string & {}),
  locale: SupportedLocale = currentLocale,
  params?: Record<string, string | number>,
): string {
  const requestedDict = translations[locale] ?? translations[DEFAULT_LOCALE]
  let text = getNestedValue(requestedDict as unknown as Record<string, unknown>, key)

  // English fallback if missing in requested locale
  if (text === null && locale !== DEFAULT_LOCALE) {
    text = getNestedValue(translations[DEFAULT_LOCALE] as unknown as Record<string, unknown>, key)
  }

  if (text === null) {
    return key
  }

  return interpolate(text, params)
}

/**
 * Creates a translation function bound to a specific locale.
 */
export function createTranslator(locale: SupportedLocale) {
  return (key: TranslationKey | (string & {}), params?: Record<string, string | number>) =>
    t(key, locale, params)
}
