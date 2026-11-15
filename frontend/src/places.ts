import type { CraterId } from './craters.ts'
import type { RoverStop } from './sites.ts'

/**
 * Key places along each rover's drive, in mission order. Each is tied to a sol, and
 * drawn at the rover's own stop on that sol (from the traverse data), so positions
 * come from NASA/JPL MMGIS (Perseverance) and the PDS Analyst's Notebook (Spirit),
 * not from hand-placed points. Sols and facts come from the linked sources:
 * NASA's Perseverance rock-sample table (sol each tube was sealed) and the Spirit
 * mission timeline.
 */
export interface Place {
  id: string
  crater: CraterId
  sol: number
  kind: 'landing' | 'sample' | 'science' | 'milestone'
  name: { en: string; uk: string }
  text: { en: string; uk: string }
  source: { label: string; url: string }
}

const M20_SAMPLES = {
  label: 'NASA: Perseverance rock samples',
  url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/',
}
const M20 = {
  label: 'NASA Mars 2020 Perseverance',
  url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
}
const INGENUITY = {
  label: 'NASA Ingenuity Mars Helicopter',
  url: 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/',
}
const SPIRIT = { label: 'NASA Spirit (MER-A)', url: 'https://science.nasa.gov/mission/mer-spirit/' }
const SPIRIT_TIMELINE = {
  label: 'Timeline of Spirit',
  url: 'https://en.wikipedia.org/wiki/Timeline_of_Spirit',
}

export const PLACES: readonly Place[] = [
  // --- Jezero · Perseverance -------------------------------------------------
  {
    id: 'j-landing',
    crater: 'jezero',
    sol: 0,
    kind: 'landing',
    name: { en: 'Landing & first flight', uk: 'Посадка й перший політ' },
    text: {
      en: 'Perseverance landed here, at Octavia E. Butler Landing, on 18 February 2021. On 19 April 2021 the Ingenuity helicopter made the first powered, controlled flight on another planet from “Wright Brothers Field” nearby, watched by the rover.',
      uk: 'Тут, у місці Octavia E. Butler Landing, Perseverance сів 18 лютого 2021 року. 19 квітня 2021 року неподалік, з «Поля братів Райт», гелікоптер Ingenuity здійснив перший керований політ з двигуном на іншій планеті; марсохід за ним спостерігав.',
    },
    source: INGENUITY,
  },
  {
    id: 'j-roubion',
    crater: 'jezero',
    sol: 164,
    kind: 'sample',
    name: { en: 'Roubion: first sample', uk: 'Roubion: перший зразок' },
    text: {
      en: 'The first coring attempt, in Polygon Valley (sol 164). The rock crumbled to powder, so tube 1 holds Martian air instead: the first sample of the atmosphere sealed for return to Earth.',
      uk: 'Перша спроба буріння в Polygon Valley (сол 164). Порода розсипалася на порох, тож у пробірці №1 лишилося марсіанське повітря — перший зразок атмосфери, запечатаний для доставки на Землю.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-rochette',
    crater: 'jezero',
    sol: 194,
    kind: 'sample',
    name: { en: 'Rochette: first rock cores', uk: 'Rochette: перші керни' },
    text: {
      en: 'On Artuby Ridge the rover drilled its first rock cores, Montdenier and Montagnac, from the rock Rochette (sols 194–196, September 2021).',
      uk: 'На хребті Artuby марсохід пробурив свої перші керни породи — Montdenier і Montagnac — з каменя Rochette (соли 194–196, вересень 2021).',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-seitah',
    crater: 'jezero',
    sol: 262,
    kind: 'sample',
    name: { en: 'South Séítah', uk: 'Південний Séítah' },
    text: {
      en: 'A field of ridges and sand dunes on the crater floor. Four cores came from the rocks Brac and Issole (sols 262–337): igneous rock rich in olivine, showing the crater floor is volcanic, not lake mud.',
      uk: 'Ділянка хребтів і піщаних дюн на дні кратера. Чотири керни взято з каменів Brac та Issole (соли 262–337): магматична порода, багата на олівін, — дно кратера вулканічне, а не озерний мул.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-chal',
    crater: 'jezero',
    sol: 371,
    kind: 'sample',
    name: { en: 'Back at the landing site', uk: 'Повернення до місця посадки' },
    text: {
      en: 'Before heading to the delta the rover returned near its landing site and cored the rock Sid at the Ch’ał outcrop: samples Ha’ahóni and Atsá (sols 371–377).',
      uk: 'Перед поїздкою до дельти марсохід повернувся до місця посадки й пробурив камінь Sid на відслоненні Ch’ał: зразки Ha’ahóni та Atsá (соли 371–377).',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-delta-front',
    crater: 'jezero',
    sol: 490,
    kind: 'sample',
    name: { en: 'Delta front: Wildcat Ridge', uk: 'Фронт дельти: Wildcat Ridge' },
    text: {
      en: 'At the foot of the ancient river delta (Hawksbill Gap) the rover cored sedimentary rock for the first time: Skinner Ridge (sols 490–495) and Wildcat Ridge (sols 509–516), mudstone laid down in the old lake. At Wildcat Ridge SHERLOC found organic molecules alongside sulfate minerals.',
      uk: 'Біля підніжжя давньої річкової дельти (Hawksbill Gap) марсохід уперше пробурив осадову породу: Skinner Ridge (соли 490–495) і Wildcat Ridge (соли 509–516) — аргіліт, що відклався в давньому озері. У Wildcat Ridge прилад SHERLOC знайшов органічні молекули разом із сульфатними мінералами.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-three-forks',
    crater: 'jezero',
    sol: 653,
    kind: 'milestone',
    name: { en: 'Three Forks sample depot', uk: 'Склад зразків Three Forks' },
    text: {
      en: 'From December 2022 to January 2023 Perseverance set 10 sealed tubes down on the ground here, a backup cache in case the samples it carries cannot be collected from the rover.',
      uk: 'З грудня 2022 по січень 2023 року Perseverance залишив тут на поверхні 10 запечатаних пробірок — резервний склад на випадок, якщо зразки не вдасться забрати з самого марсохода.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-upper-fan',
    crater: 'jezero',
    sol: 749,
    kind: 'sample',
    name: { en: 'Upper fan', uk: 'Верхня частина дельти' },
    text: {
      en: 'On top of the delta, in deposits left by the river that fed the lake, the rover cored Melyn from the rock Berea (sol 749) and later Otis Peak and Pilot Mountain.',
      uk: 'На верхівці дельти, у відкладах річки, що живила озеро, марсохід пробурив Melyn з каменя Berea (сол 749), а згодом Otis Peak і Pilot Mountain.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-margin',
    crater: 'jezero',
    sol: 923,
    kind: 'sample',
    name: { en: 'Margin unit', uk: 'Крайова смуга (margin unit)' },
    text: {
      en: 'A band of rock along the inside of the crater rim. Cores Pelican Point (sol 923), Lefroy Bay (sol 949) and Comet Geyser (sol 1088) came from here.',
      uk: 'Смуга порід уздовж внутрішнього боку краю кратера. Звідси керни Pelican Point (сол 923), Lefroy Bay (сол 949) і Comet Geyser (сол 1088).',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-cheyava',
    crater: 'jezero',
    sol: 1215,
    kind: 'science',
    name: { en: 'Cheyava Falls', uk: 'Cheyava Falls' },
    text: {
      en: 'In Neretva Vallis, an old river channel into the crater, the rover cored a rock with “leopard spot” patterns (sample Sapphire Canyon, sol 1215). In September 2025 NASA called it a potential biosignature: features that could have been made by life but need study in labs on Earth.',
      uk: 'У Neretva Vallis — давньому руслі, що впадало в кратер, — марсохід пробурив камінь із «леопардовими плямами» (зразок Sapphire Canyon, сол 1215). У вересні 2025 року NASA назвало це потенційною біосигнатурою: ознаки, які могло залишити життя, але їх треба досліджувати в лабораторіях на Землі.',
    },
    source: M20_SAMPLES,
  },
  {
    id: 'j-rim',
    crater: 'jezero',
    sol: 1401,
    kind: 'sample',
    name: { en: 'Crater rim: Witch Hazel Hill', uk: 'Край кратера: Witch Hazel Hill' },
    text: {
      en: 'Perseverance climbed out of the crater onto its rim in December 2024. On Witch Hazel Hill it cored Silver Mountain, Green Gardens and Main River (sols 1401–1441), rocks from the rim that formed before the lake did.',
      uk: 'У грудні 2024 року Perseverance вибрався з кратера на його край. На пагорбі Witch Hazel Hill він пробурив Silver Mountain, Green Gardens і Main River (соли 1401–1441) — породи краю, які утворилися раніше за озеро.',
    },
    source: M20,
  },

  // --- Gusev · Spirit ----------------------------------------------------------
  {
    id: 'g-landing',
    crater: 'gusev',
    sol: 1,
    kind: 'landing',
    name: { en: 'Columbia Memorial Station', uk: 'Columbia Memorial Station' },
    text: {
      en: 'Spirit landed here on 4 January 2004; the site honours the crew of Space Shuttle Columbia. Its first rock target, Adirondack, turned out to be volcanic basalt, not the lake sediment the team had hoped for.',
      uk: 'Spirit сів тут 4 січня 2004 року; місце названо на честь екіпажу шатла «Колумбія». Перша ціль, камінь Adirondack, виявилася вулканічним базальтом, а не озерними відкладами, на які сподівалися.',
    },
    source: SPIRIT,
  },
  {
    id: 'g-bonneville',
    crater: 'gusev',
    sol: 66,
    kind: 'science',
    name: { en: 'Bonneville crater', uk: 'Кратер Бонневіль' },
    text: {
      en: 'A crater about 200 m wide, reached on sol 66 (11 March 2004). With nothing worth the risk inside, Spirit drove around its southern rim and on towards the Columbia Hills.',
      uk: 'Кратер завширшки близько 200 м, до якого Spirit дістався на сол 66 (11 березня 2004). Всередині не було цілей, вартих ризику, тож марсохід обʼїхав південний край і рушив до пагорбів Колумбія.',
    },
    source: SPIRIT_TIMELINE,
  },
  {
    id: 'g-west-spur',
    crater: 'gusev',
    sol: 159,
    kind: 'science',
    name: { en: 'Columbia Hills: West Spur', uk: 'Пагорби Колумбія: West Spur' },
    text: {
      en: 'After about 3 km across the plains, Spirit reached the foot of the Columbia Hills on sol 159 (June 2004). Rocks here were far more altered by water than the basalts of the plains.',
      uk: 'Подолавши близько 3 км рівниною, Spirit дістався підніжжя пагорбів Колумбія на сол 159 (червень 2004). Породи тут значно сильніше змінені водою, ніж базальти рівнини.',
    },
    source: SPIRIT_TIMELINE,
  },
  {
    id: 'g-husband',
    crater: 'gusev',
    sol: 582,
    kind: 'milestone',
    name: { en: 'Husband Hill summit', uk: 'Вершина пагорба Гасбенд' },
    text: {
      en: 'On sol 582 (21 August 2005) Spirit reached the summit of Husband Hill, about 82 m above the plains, and took a panorama of the crater. The hill is named after Rick Husband, commander of Columbia.',
      uk: 'На сол 582 (21 серпня 2005) Spirit піднявся на вершину пагорба Гасбенд, приблизно на 82 м над рівниною, і зняв панораму кратера. Пагорб названо на честь Ріка Гасбенда, командира «Колумбії».',
    },
    source: SPIRIT_TIMELINE,
  },
  {
    id: 'g-home-plate',
    crater: 'gusev',
    sol: 744,
    kind: 'science',
    name: { en: 'Home Plate', uk: 'Гоум-Плейт' },
    text: {
      en: 'A layered plateau Spirit first spotted from the summit and reached on sol 744 (February 2006). In 2007, soil churned up next to it by a dragging wheel proved to be almost pure silica, strong evidence of past hot springs or steam vents.',
      uk: 'Шарувате плато, яке Spirit помітив з вершини й досяг на сол 744 (лютий 2006). У 2007 році ґрунт поруч, розритий колесом, що волочилося, виявився майже чистим кремнеземом — вагомим доказом давніх гарячих джерел або парових виходів.',
    },
    source: SPIRIT,
  },
  {
    id: 'g-low-ridge',
    crater: 'gusev',
    sol: 805,
    kind: 'milestone',
    name: { en: 'Low Ridge winter', uk: 'Зимівля на Low Ridge' },
    text: {
      en: 'With its right front wheel no longer turning, Spirit spent the Martian winter of 2006 parked on Low Ridge, tilted so its solar panels faced the Sun, and did not drive again until November.',
      uk: 'Коли переднє праве колесо перестало обертатися, Spirit провів марсіанську зиму 2006 року на хребті Low Ridge, нахилившись так, щоб сонячні панелі дивилися на Сонце, і не їздив до листопада.',
    },
    source: SPIRIT_TIMELINE,
  },
  {
    id: 'g-troy',
    crater: 'gusev',
    sol: 1892,
    kind: 'milestone',
    name: { en: 'Troy: the last stop', uk: 'Troy: остання зупинка' },
    text: {
      en: 'On 1 May 2009, beside Home Plate, Spirit’s wheels broke through a crust into soft sand at “Troy” and it never got free. It worked on as a stationary station until its last contact on sol 2208 (22 March 2010).',
      uk: '1 травня 2009 року біля Гоум-Плейт колеса Spirit пробили кірку й загрузли в м’якому піску в місці «Troy»; вибратися він так і не зміг. Марсохід працював як нерухома станція до останнього зв’язку на сол 2208 (22 березня 2010).',
    },
    source: SPIRIT_TIMELINE,
  },
]

/** A place's number in its crater's mission order (1-based), the same on every view. */
export function placeNumber(p: Place): number {
  return PLACES.filter((q) => q.crater === p.crater).indexOf(p) + 1
}

export interface PlacedPlace extends Place {
  /** Mission-order number within the crater (see `placeNumber`). */
  n: number
  x: number
  y: number
  lon: number
  lat: number
}

/**
 * Places that fall inside a site window, at the rover's stop on their sol (the stop
 * whose sols include it; the landing may use the first stop). `stops` are the
 * window's rover stops, so places outside the window are left out.
 */
export function placesInWindow(crater: CraterId, stops: readonly RoverStop[]): PlacedPlace[] {
  const out: PlacedPlace[] = []
  for (const p of PLACES) {
    if (p.crater !== crater || stops.length === 0) continue
    let best: RoverStop | null = null
    let gap = Infinity
    for (const s of stops) {
      const g =
        p.sol < s.sol_start ? s.sol_start - p.sol : p.sol > s.sol_end ? p.sol - s.sol_end : 0
      if (g < gap) {
        gap = g
        best = s
      }
    }
    // Only a stop whose sols include the place counts, so a place outside the window
    // is never pulled onto a nearby stop inside it. The traverse data start a few sols
    // after landing, so the landing may use the first stop.
    const allowed = p.kind === 'landing' && best === stops[0] ? 80 : 0
    if (best && gap <= allowed)
      out.push({ ...p, n: placeNumber(p), x: best.x, y: best.y, lon: best.lon, lat: best.lat })
  }
  return out
}
