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
      <article className="px-9 pb-9 grid grid-cols-12 gap-9">
        <div>
          <Link href="/">Index</Link>
        </div>
        <div className="col-span-2">
          <InfoSection value={contact} documentId={info._id} path={locale === 'no' ? 'contactNO' : 'contact'} />
        </div>
        <div className="col-span-4">
          <InfoSection value={bio} documentId={info._id} path={locale === 'no' ? 'bioNO' : 'bio'} />
        </div>
        <div className="col-span-3">
          <InfoSection value={info.clientList} documentId={info._id} path="clientList" />
        </div>
      </article>

      <div className="fixed bottom-9 left-9 z-50 flex items-center gap-4">
        <Link href="/" className="block h-4 w-4 rounded-full bg-black">
          <span className="sr-only">Index</span>
        </Link>
        <button
          type="button"
          onClick={() => setLocalePreference('en')}
          aria-pressed={locale === 'en'}
          className={locale === 'en' ? 'opacity-100' : 'opacity-50'}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocalePreference('no')}
          aria-pressed={locale === 'no'}
          className={locale === 'no' ? 'opacity-100' : 'opacity-50'}
        >
          NO
        </button>
      </div>
    </>
  )
}
