import {headers} from 'next/headers'

import InfoPage from '@/app/components/InfoPage'
import {localeFromAcceptLanguage, localeFromCountry, type Locale} from '@/lib/locale'
import {infoQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

function getSuggestedLocale(headerList: Headers): Locale {
  const country =
    headerList.get('x-vercel-ip-country') ||
    headerList.get('cf-ipcountry') ||
    headerList.get('x-country-code')

  const fromCountry = country ? localeFromCountry(country) : null
  if (fromCountry === 'no') return 'no'

  const fromLanguage = localeFromAcceptLanguage(headerList.get('accept-language'))
  if (fromLanguage) return fromLanguage

  return 'en'
}

export default async function Page() {
  const {data: info} = await sanityFetch({
    query: infoQuery,
  })

  if (!info) return null

  const suggestedLocale = getSuggestedLocale(await headers())

  return <InfoPage info={info} suggestedLocale={suggestedLocale} />
}
