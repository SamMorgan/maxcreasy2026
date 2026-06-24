import {randomBytes} from 'node:crypto'

import {createClient, type SanityClient} from '@sanity/client'
import {getCliClient} from 'sanity/cli'

type IndexImage = {
  _key: string
  _type: string
  caption?: unknown
  alt?: string
  asset?: {_ref: string; _type: string}
}

type IndexDocument = {
  _id: string
  _type: string
  images?: IndexImage[]
}

const API_VERSION = '2025-09-25'

function blockKey() {
  return randomBytes(6).toString('hex')
}

function textToPortableText(text: string) {
  return [
    {
      _type: 'block' as const,
      _key: blockKey(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span' as const,
          _key: blockKey(),
          text,
          marks: [],
        },
      ],
    },
  ]
}

function isPortableText(value: unknown) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item && typeof item === 'object' && item._type === 'block')
  )
}

function migrateImages(images: IndexImage[] | undefined) {
  let migrated = 0
  let skipped = 0

  const nextImages = images?.map((image) => {
    const {caption} = image

    if (caption == null || caption === '') {
      skipped++
      return image
    }

    if (isPortableText(caption)) {
      skipped++
      return image
    }

    if (typeof caption === 'string') {
      migrated++
      return {
        ...image,
        caption: textToPortableText(caption),
      }
    }

    console.warn(`Skipping image ${image._key}: unexpected caption type`)
    skipped++
    return image
  })

  return {nextImages, migrated, skipped}
}

function getClient(): SanityClient {
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

  if (token) {
    const projectId =
      process.env.SANITY_STUDIO_PROJECT_ID ||
      process.env.SANITY_PROJECT_ID ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset =
      process.env.SANITY_STUDIO_DATASET ||
      process.env.SANITY_DATASET ||
      process.env.NEXT_PUBLIC_SANITY_DATASET ||
      'production'

    if (!projectId) {
      throw new Error(
        'Set SANITY_STUDIO_PROJECT_ID (or SANITY_PROJECT_ID) when using SANITY_API_WRITE_TOKEN',
      )
    }

    console.log(`Using API token for project ${projectId} / ${dataset}`)
    return createClient({
      projectId,
      dataset,
      apiVersion: API_VERSION,
      token,
      useCdn: false,
    })
  }

  console.log('Using Sanity CLI login token (run `npx sanity login` if this fails)')
  return getCliClient({apiVersion: API_VERSION})
}

async function migrateIndexCaptions() {
  const client = getClient()

  const docs = await client.fetch<IndexDocument[]>(
    `*[_type == "index" && _id in ["index", "drafts.index"]]{_id, _type, images}`,
  )

  if (!docs.length) {
    console.error('No index documents found (looked for index and drafts.index)')
    process.exit(1)
  }

  let totalMigrated = 0

  for (const doc of docs) {
    const {nextImages, migrated, skipped} = migrateImages(doc.images)

    if (migrated === 0) {
      console.log(`${doc._id}: nothing to migrate (${skipped} skipped)`)
      continue
    }

    await client.patch(doc._id).set({images: nextImages}).commit()
    totalMigrated += migrated
    console.log(`${doc._id}: migrated ${migrated} caption(s), skipped ${skipped}`)
  }

  if (totalMigrated === 0) {
    console.log('All captions are already portable text.')
  } else {
    console.log(`Done. Migrated ${totalMigrated} caption(s) in total.`)
  }
}

migrateIndexCaptions().catch((error: {statusCode?: number; message?: string}) => {
  if (error.statusCode === 401) {
    console.error('\nUnauthorized — your Sanity login expired.\n')
    console.error('Option A: log in again, then re-run:')
    console.error('  npx sanity login')
    console.error('  npm run migrate:index-captions\n')
    console.error('Option B: use a write token instead (sanity.io/manage → API → Tokens):')
    console.error('  SANITY_API_WRITE_TOKEN=sk... npm run migrate:index-captions\n')
  } else {
    console.error(error)
  }
  process.exit(1)
})
