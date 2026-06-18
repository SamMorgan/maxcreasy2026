import IndexGallery, {type IndexImage} from '@/app/components/IndexGallery'
import {shuffle} from '@/lib/shuffle'
import {indexQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import {connection} from 'next/server'

export default async function Page() {
  await connection()

  const {data: index} = await sanityFetch({
    query: indexQuery,
  })

  if (!index?.images?.length) return null

  const images = shuffle(
    index.images.filter((image): image is IndexImage => Boolean(image._key && image.asset?._id)),
  )

  return <IndexGallery images={images} />
}
