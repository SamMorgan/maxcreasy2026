import {MetadataRoute} from 'next'
import {headers} from 'next/headers'

import {sitemapQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import {SitemapQueryResult} from '@/sanity.types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${protocol}://${host}`

  const {data} = await sanityFetch({
    query: sitemapQuery,
    stega: false,
  })
  const pages = (data ?? []) as SitemapQueryResult

  const lastModified: Partial<Record<'index' | 'info', Date>> = {}
  for (const page of pages) {
    if (page._type === 'index' || page._type === 'info') {
      lastModified[page._type] = new Date(page._updatedAt)
    }
  }

  return [
    {
      url: baseUrl,
      lastModified: lastModified.index ?? new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/info`,
      lastModified: lastModified.info ?? new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
