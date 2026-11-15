import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  DEFAULT_LOCALE,
  EN_TRANSLATIONS,
  SUPPORTED_LOCALES,
  UK_TRANSLATIONS,
  createTranslator,
  getLocale,
  setLocale,
  subscribeLocale,
  t,
} from '../src/i18n/index.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const enJsonPath = path.resolve(__dirname, '../src/i18n/en.json')
const ukJsonPath = path.resolve(__dirname, '../src/i18n/uk.json')

test('en.json and uk.json exist and parse to match TypeScript dictionaries', () => {
  assert.ok(fs.existsSync(enJsonPath), 'en.json must exist')
  assert.ok(fs.existsSync(ukJsonPath), 'uk.json must exist')

  const enRaw = fs.readFileSync(enJsonPath, 'utf8')
  const ukRaw = fs.readFileSync(ukJsonPath, 'utf8')

  const enParsed = JSON.parse(enRaw)
  const ukParsed = JSON.parse(ukRaw)

  assert.deepEqual(enParsed, EN_TRANSLATIONS)
  assert.deepEqual(ukParsed, UK_TRANSLATIONS)
})

test('en and uk dictionaries have identical key structures', () => {
  function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...collectKeys(v as Record<string, unknown>, fullPath))
      } else {
        keys.push(fullPath)
      }
    }
    return keys.sort()
  }

  const enKeys = collectKeys(EN_TRANSLATIONS as unknown as Record<string, unknown>)
  const ukKeys = collectKeys(UK_TRANSLATIONS as unknown as Record<string, unknown>)

  assert.deepEqual(enKeys, ukKeys)
})

test('contains required science terms with exact specified Ukrainian translations', () => {
  // bedrock -> корінна порода
  assert.equal(t('bedrock', 'uk'), 'корінна порода')
  assert.equal(t('science.bedrock', 'uk'), 'корінна порода')
  assert.equal(t('bedrock', 'en'), 'bedrock')

  // float block -> елювіальний/зсувний уламок
  assert.equal(t('float block', 'uk'), 'елювіальний/зсувний уламок')
  assert.equal(t('science.floatBlock', 'uk'), 'елювіальний/зсувний уламок')
  assert.equal(t('float block', 'en'), 'float block')

  // contact continuity -> безперервність контакту
  assert.equal(t('contact continuity', 'uk'), 'безперервність контакту')
  assert.equal(t('science.contactContinuity', 'uk'), 'безперервність контакту')
  assert.equal(t('contact continuity', 'en'), 'contact continuity')

  // unresolved -> невизначено
  assert.equal(t('unresolved', 'uk'), 'невизначено')
  assert.equal(t('science.unresolved', 'uk'), 'невизначено')
  assert.equal(t('unresolved', 'en'), 'unresolved')

  // abrasion patch -> пляма шліфування
  assert.equal(t('abrasion patch', 'uk'), 'пляма шліфування')
  assert.equal(t('science.abrasionPatch', 'uk'), 'пляма шліфування')
  assert.equal(t('abrasion patch', 'en'), 'abrasion patch')

  // sulfate veins -> сульфатні жили
  assert.equal(t('sulfate veins', 'uk'), 'сульфатні жили')
  assert.equal(t('science.sulfateVeins', 'uk'), 'сульфатні жили')
  assert.equal(t('sulfate veins', 'en'), 'sulfate veins')
})

test('contains required route labels with exact specified translations', () => {
  // Option A (Direct to Wildcat Ridge with standoff look)
  assert.equal(
    t('Option A (Direct to Wildcat Ridge with standoff look)', 'en'),
    'Option A (Direct to Wildcat Ridge with standoff look)',
  )
  assert.equal(
    t('Option A (Direct to Wildcat Ridge with standoff look)', 'uk'),
    'Варіант A (Прямий до хребта Вайлдкет із дистанційним оглядом)',
  )
  assert.equal(
    t('routes.optionA.name', 'uk'),
    'Варіант A (Прямий до хребта Вайлдкет із дистанційним оглядом)',
  )

  // Option B (Loop via Skinner Ridge and Wildcat Ridge)
  assert.equal(
    t('Option B (Loop via Skinner Ridge and Wildcat Ridge)', 'en'),
    'Option B (Loop via Skinner Ridge and Wildcat Ridge)',
  )
  assert.equal(
    t('Option B (Loop via Skinner Ridge and Wildcat Ridge)', 'uk'),
    'Варіант B (Кільце через хребет Скіннер та хребет Вайлдкет)',
  )
  assert.equal(
    t('routes.optionB.name', 'uk'),
    'Варіант B (Кільце через хребет Скіннер та хребет Вайлдкет)',
  )
})

test('contains caution zones terms and turnaround point', () => {
  // turnaround point -> точка розвороту
  assert.equal(t('turnaround point', 'uk'), 'точка розвороту')
  assert.equal(t('caution.turnaroundPoint', 'uk'), 'Точка розвороту')
  assert.equal(t('turnaround point', 'en'), 'turnaround point')
  assert.equal(t('caution.turnaroundPoint', 'en'), 'Turnaround point')

  // slope/grade thresholds
  assert.equal(t('slope/grade thresholds', 'uk'), 'порогові значення схилу / крутизни')
  assert.equal(t('caution.slopeGradeThresholds', 'uk'), 'Порогові значення схилу / крутизни')

  // obstacle caution
  assert.equal(t('obstacle caution', 'uk'), 'попередження про перешкоди')
  assert.equal(t('caution.obstacleCaution', 'uk'), 'Попередження про перешкоди')

  // data gaps
  assert.equal(t('data gaps', 'uk'), 'прогалини в даних')
  assert.equal(t('caution.dataGaps', 'uk'), 'Прогалини в даних')
})

test('contains weather and radiation terms', () => {
  assert.equal(t('atmospheric pressure', 'uk'), 'атмосферний тиск')
  assert.equal(t('weather.atmosphericPressure', 'uk'), 'Атмосферний тиск')
  assert.equal(t('atmospheric pressure', 'en'), 'atmospheric pressure')

  assert.equal(t('temperature range', 'uk'), 'температурний діапазон')
  assert.equal(t('weather.temperatureRange', 'uk'), 'Температурний діапазон')
  assert.equal(t('temperature range', 'en'), 'temperature range')

  assert.equal(t('radiation dose baseline', 'uk'), 'базовий рівень дози радіації')
  assert.equal(t('weather.radiationDoseBaseline', 'uk'), 'Базовий рівень дози радіації')
  assert.equal(t('radiation dose baseline', 'en'), 'radiation dose baseline')
})

test('translation helper falls back to English when key is missing in target locale', () => {
  // Delete a key from uk temporarily
  const originalTerms = { ...UK_TRANSLATIONS.terms }
  // @ts-expect-error test simulation of missing key
  delete UK_TRANSLATIONS.terms['temporary_test_key']
  // @ts-expect-error test simulation of missing key
  EN_TRANSLATIONS.terms['temporary_test_key'] = 'English Fallback Value'

  try {
    assert.equal(t('temporary_test_key', 'uk'), 'English Fallback Value')
  } finally {
    // Restore
    // @ts-expect-error cleanup
    delete EN_TRANSLATIONS.terms['temporary_test_key']
    // @ts-expect-error cleanup
    UK_TRANSLATIONS.terms = originalTerms
  }
})

test('translation helper returns key itself when key is unknown in all locales', () => {
  assert.equal(t('completely.nonexistent.key.xyz', 'uk'), 'completely.nonexistent.key.xyz')
  assert.equal(t('completely.nonexistent.key.xyz', 'en'), 'completely.nonexistent.key.xyz')
})

test('translation helper performs parameter interpolation', () => {
  assert.equal(t('brief.returnLegAscent', 'en', { ascent: 17.8 }), 'Return leg ascent: 17.8 m')
  assert.equal(
    t('brief.returnLegAscent', 'uk', { ascent: '17,8' }),
    'Підйом на зворотному шляху: 17,8 м',
  )
  assert.equal(
    t('brief.totalDistance', 'uk', { distance: 345 }),
    'Загальна дистанція в обидва кінці: 345 м',
  )
})

test('createTranslator binds to requested locale', () => {
  const tUk = createTranslator('uk')
  const tEn = createTranslator('en')

  assert.equal(tUk('bedrock'), 'корінна порода')
  assert.equal(tEn('bedrock'), 'bedrock')
  assert.equal(tUk('turnaround point'), 'точка розвороту')
  assert.equal(tEn('turnaround point'), 'turnaround point')
})

test('locale store notifies subscribers on locale change', () => {
  setLocale('en')
  assert.equal(getLocale(), 'en')

  let notified = 0
  const unsubscribe = subscribeLocale(() => {
    notified++
  })

  setLocale('uk')
  assert.equal(getLocale(), 'uk')
  assert.equal(notified, 1)

  // Setting the same locale does not trigger subscriber
  setLocale('uk')
  assert.equal(notified, 1)

  // Switch back
  setLocale('en')
  assert.equal(getLocale(), 'en')
  assert.equal(notified, 2)

  unsubscribe()
  setLocale('uk')
  assert.equal(notified, 2) // No more notifications after unsubscribe

  // Reset to default
  setLocale(DEFAULT_LOCALE)
})

test('supported locales list contains en and uk', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['en', 'uk'])
  assert.equal(DEFAULT_LOCALE, 'en')
})
