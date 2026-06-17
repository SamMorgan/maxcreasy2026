export type Locale = 'en' | 'no'

export const LOCALE_STORAGE_KEY = 'max-creasy-locale'

export function localeFromCountry(country: string | null): Locale {
  return country?.toUpperCase() === 'NO' ? 'no' : 'en'
}

export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null

  const languages = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean)

  if (languages.some((lang) => lang === 'no' || lang === 'nb' || lang === 'nn' || lang.startsWith('no-'))) {
    return 'no'
  }

  return null
}

export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return stored === 'en' || stored === 'no' ? stored : null
}

export function storeLocale(locale: Locale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
