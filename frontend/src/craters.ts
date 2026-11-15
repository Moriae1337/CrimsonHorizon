import type { SiteId } from './sites.ts'

/**
 * The two craters the planner covers. Each has a regional site (CTX, 20 m, long
 * traverses) and a detail site (HiRISE, 8 m). Sizes come from the IAU Gazetteer
 * (data/iau_mars_nomenclature.json); mission facts from the linked NASA pages.
 * Traverse length and sols are not stored here: they come from the traverse data.
 */
export type CraterId = 'jezero' | 'gusev'

export interface CraterInfo {
  id: CraterId
  iauName: string
  regional: SiteId
  detail: SiteId
  rover: string
  lon: number
  lat: number
  facts: Array<{ label: { en: string; uk: string }; value: { en: string; uk: string } }>
  summary: { en: string; uk: string }
  regionalNote: { en: string; uk: string }
  links: Array<{ label: string; url: string }>
}

export const CRATERS: Record<CraterId, CraterInfo> = {
  jezero: {
    id: 'jezero',
    iauName: 'Jezero',
    regional: 'jezero-crater',
    detail: 'hawksbill-gap',
    rover: 'Perseverance',
    lon: 77.6873,
    lat: 18.4082,
    summary: {
      en: 'Jezero is a 47.5 km impact crater on the western edge of Isidis Planitia. Billions of years ago it held a lake, fed by a river that built the fan-shaped delta on its western side. NASA’s Perseverance rover landed on the crater floor on 18 February 2021 to look for signs of ancient microbial life and to collect rock samples; it has since crossed the delta and climbed to the crater rim.',
      uk: 'Єзеро — ударний кратер діаметром 47,5 км на західному краю рівнини Ісіда. Мільярди років тому в ньому було озеро, яке живила річка; вона наклала віялоподібну дельту на західному боці. Марсохід NASA Perseverance сів на дно кратера 18 лютого 2021 року, щоб шукати сліди давнього мікробного життя й збирати зразки порід; відтоді він перетнув дельту й піднявся на край кратера.',
    },
    facts: [
      {
        label: { en: 'Diameter (IAU)', uk: 'Діаметр (IAU)' },
        value: { en: '47.5 km', uk: '47,5 км' },
      },
      {
        label: { en: 'Rover', uk: 'Марсохід' },
        value: { en: 'Perseverance (Mars 2020)', uk: 'Perseverance (Mars 2020)' },
      },
      { label: { en: 'Landed', uk: 'Посадка' }, value: { en: '18 Feb 2021', uk: '18 лют. 2021' } },
    ],
    regionalNote: {
      en: 'Regional site for long traverses: the whole localized Perseverance traverse, from the landing site across the delta to the crater rim. The 20 m CTX grid smooths out boulders and small scarps, so local slopes can be steeper than shown; use Hawksbill Gap (HiRISE) for detail.',
      uk: 'Регіональна ділянка для довгих маршрутів: увесь локалізований траверс Perseverance, від місця посадки через дельту до краю кратера. Сітка CTX 20 м згладжує валуни й дрібні уступи, тож локальні нахили можуть бути крутішими, ніж показано; для деталей беріть Hawksbill Gap (HiRISE).',
    },
    links: [
      {
        label: 'NASA Mars 2020 Perseverance',
        url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
      },
      { label: 'IAU Gazetteer: Jezero', url: 'https://planetarynames.wr.usgs.gov/Feature/14300' },
    ],
  },
  gusev: {
    id: 'gusev',
    iauName: 'Gusev',
    regional: 'gusev-crater',
    detail: 'columbia-hills',
    rover: 'Spirit',
    lon: 175.5244,
    lat: -14.5308,
    summary: {
      en: 'Gusev is a 158 km impact crater. Ma’adim Vallis, a valley about 900 km long, cuts through its southern rim, which is why Gusev was thought to have held a lake. NASA’s Spirit rover landed on the crater floor on 4 January 2004, crossed the volcanic plains to the Columbia Hills, climbed Husband Hill and, near Home Plate, found almost pure silica, evidence of past hot springs or steam vents. Spirit last communicated on 22 March 2010.',
      uk: 'Ґусєв — ударний кратер діаметром 158 км. Його південний край прорізає долина Маадім завдовжки близько 900 км, тому вважалося, що в кратері було озеро. Марсохід NASA Spirit сів на дно кратера 4 січня 2004 року, перетнув вулканічну рівнину до пагорбів Колумбія, піднявся на пагорб Гасбенд і біля плато Гоум-Плейт знайшов майже чистий кремнезем — свідчення давніх гарячих джерел або парових виходів. Останній зв’язок зі Spirit був 22 березня 2010 року.',
    },
    facts: [
      {
        label: { en: 'Diameter (IAU)', uk: 'Діаметр (IAU)' },
        value: { en: '158.1 km', uk: '158,1 км' },
      },
      {
        label: { en: 'Rover', uk: 'Марсохід' },
        value: { en: 'Spirit (MER-A)', uk: 'Spirit (MER-A)' },
      },
      { label: { en: 'Landed', uk: 'Посадка' }, value: { en: '4 Jan 2004', uk: '4 січ. 2004' } },
      {
        label: { en: 'Last contact', uk: 'Останній зв’язок' },
        value: { en: '22 Mar 2010', uk: '22 бер. 2010' },
      },
    ],
    regionalNote: {
      en: 'Regional site for long traverses: the whole localized Spirit traverse with the plains around it, Bonneville crater and the Columbia Hills. The 20 m CTX grid smooths out boulders and small scarps, so local slopes can be steeper than shown; use Columbia Hills (HiRISE) for detail.',
      uk: 'Регіональна ділянка для довгих маршрутів: увесь локалізований траверс Spirit разом із рівниною довкола, кратером Бонневіль і пагорбами Колумбія. Сітка CTX 20 м згладжує валуни й дрібні уступи, тож локальні нахили можуть бути крутішими, ніж показано; для деталей беріть Columbia Hills (HiRISE).',
    },
    links: [
      { label: 'NASA Spirit (MER-A)', url: 'https://science.nasa.gov/mission/mer-spirit/' },
      { label: 'IAU Gazetteer: Gusev', url: 'https://planetarynames.wr.usgs.gov/Feature/2289' },
    ],
  },
}

export const CRATER_IDS: readonly CraterId[] = ['jezero', 'gusev']

export function craterOfSite(siteId: SiteId): CraterInfo {
  return (
    Object.values(CRATERS).find((c) => c.regional === siteId || c.detail === siteId) ??
    CRATERS.jezero
  )
}

export function craterByIauName(name: string): CraterInfo | null {
  return Object.values(CRATERS).find((c) => c.iauName === name) ?? null
}
