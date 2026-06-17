import IndexGallery, {type IndexImage} from '@/app/components/IndexGallery'
import {indexQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'

export default async function Page() {
  const {data: index} = await sanityFetch({
    query: indexQuery,
  })

  if (!index?.images?.length) return null

  const images = index.images.filter(
    (image): image is IndexImage => Boolean(image._key && image.asset?._id),
  )

  return <IndexGallery images={images} />
}
