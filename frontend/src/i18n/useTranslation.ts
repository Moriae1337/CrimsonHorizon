import { useMemo, useSyncExternalStore } from 'react'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  createTranslator,
  getLocale,
  setLocale,
  subscribeLocale,
  type SupportedLocale,
  type TranslationKey,
} from './translations.ts'

export function useTranslation(preferredLocale?: SupportedLocale) {
  const storeLocale = useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE)
  const locale = preferredLocale ?? storeLocale
  const translator = useMemo(() => createTranslator(locale), [locale])

  return {
    t: (key: TranslationKey | (string & {}), params?: Record<string, string | number>) =>
      translator(key, params),
    locale,
    setLocale,
    locales: SUPPORTED_LOCALES,
  }
}
