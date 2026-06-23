'use client'

import {useEffect, useState} from 'react'

import CustomPortableText from '@/app/components/PortableText'
import {
  type Locale,
  readStoredLocale,
  storeLocale,
} from '@/lib/locale'
import type {BlockContentTextOnly, InfoQueryResult} from '@/sanity.types'
import {dataAttr} from '@/sanity/lib/utils'
import Link from 'next/link'

type InfoPageProps = {
  info: NonNullable<InfoQueryResult>
  suggestedLocale: Locale
}

function InfoSection({
  value,
  documentId,
  path,
}: {
  value?: BlockContentTextOnly | null
  documentId: string
  path: string
}) {
  if (!value?.length) return null

  return (
    <section data-sanity={dataAttr({id: documentId, type: 'info', path})}>
      <CustomPortableText value={value} />
    </section>
  )
}

export default function InfoPage({info, suggestedLocale}: InfoPageProps) {
  const [locale, setLocale] = useState<Locale>(suggestedLocale)

  useEffect(() => {
    const stored = readStoredLocale()
    if (stored) {
      setLocale(stored)
      return
    }

    if (typeof navigator !== 'undefined') {
      const browserLanguages = navigator.languages?.length
        ? navigator.languages.join(',')
        : navigator.language
      if (
        browserLanguages &&
        ['no', 'nb', 'nn'].some(
          (code) =>
            browserLanguages.toLowerCase().includes(code) ||
            browserLanguages.toLowerCase().includes(`${code}-`),
        )
      ) {
        setLocale('no')
      }
    }
  }, [])

  const setLocalePreference = (nextLocale: Locale) => {
    setLocale(nextLocale)
    storeLocale(nextLocale)
  }

  const contact = locale === 'no' ? info.contactNO : info.contact
  const bio = locale === 'no' ? info.bioNO : info.bio

  return (
    <>
      <article className="px-9 py-25 md:flex gap-24 md:py-6 max-md:pb-above-dot md:[&>div]:max-w-[min(42ch,33vw)] flex-1 [&_p]:mb-4.5 [&_a]:hover:opacity-30">
        <div className="max-md:fixed max-md:top-6 max-md:left-9 max-md:z-50">
          <Link href="/">Index</Link>
        </div>
        <div>
          <InfoSection value={contact} documentId={info._id} path={locale === 'no' ? 'contactNO' : 'contact'} />
        </div>
        <div className="flex-1">
          <InfoSection value={bio} documentId={info._id} path={locale === 'no' ? 'bioNO' : 'bio'} />
        </div>
        <div className="flex-1 flex flex-col">
          <InfoSection value={info.clientList} documentId={info._id} path="clientList" />
          <div className="mt-auto">
          Design: <a href="https://daly-lyon.co.uk/" target='_blank'>Daly & Lyon</a><br />
          Development: <a href="https://svmorgan.com/" target='_blank'>svmorgan</a>
          </div>
        </div>
      </article>

      <div className="dot-pos">
        <Link href="/" className="dot">
          <span className="sr-only">Index</span>
        </Link>
        <button
          type="button"
          onClick={() => setLocalePreference('en')}
          aria-pressed={locale === 'en'}
          className={locale === 'en' ? 'opacity-100' : 'opacity-30'}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocalePreference('no')}
          aria-pressed={locale === 'no'}
          className={locale === 'no' ? 'opacity-100' : 'opacity-30'}
        >
          NO
        </button>
      </div>
    </>
  )
}
