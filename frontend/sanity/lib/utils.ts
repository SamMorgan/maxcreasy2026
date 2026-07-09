//import {Link} from '@/sanity.types'
import {dataset, projectId, studioUrl} from '@/sanity/lib/api'
import {createDataAttribute, CreateDataAttributeProps} from 'next-sanity'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
//import {DereferencedLink} from '@/sanity/lib/types'

const builder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

// Create an image URL builder using the client
export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/** Grid thumbnails — high quality JPEG, single Sanity CDN pass (no Next recompression). */
export function gridImageUrl(source: SanityImageSource) {
  return urlFor(source).width(800).quality(92).format('jpg').fit('max').url()
}

/** Lightbox srcset widths — browser picks based on sizes + device pixel ratio. */
export const LIGHTBOX_IMAGE_WIDTHS = [1200, 1800, 2400, 2800] as const

/** Must match the lightbox container width in IndexGallery. */
export const LIGHTBOX_IMAGE_SIZES = '(min-width: 48rem) calc(100vw - 4.5rem), calc(100vw - 3rem)'

function lightboxImageAtWidth(source: SanityImageSource, width: number) {
  return urlFor(source).width(width).quality(95).format('jpg').fit('max').url()
}

/** Lightbox srcset — responsive JPEGs at q95 to reduce gradient banding. */
export function lightboxImageSrcSet(source: SanityImageSource) {
  return LIGHTBOX_IMAGE_WIDTHS.map((width) => `${lightboxImageAtWidth(source, width)} ${width}w`).join(
    ', ',
  )
}

/** Lightbox fallback src — largest candidate for browsers without srcset. */
export function lightboxImageSrc(source: SanityImageSource) {
  const largest = LIGHTBOX_IMAGE_WIDTHS[LIGHTBOX_IMAGE_WIDTHS.length - 1]
  return lightboxImageAtWidth(source, largest)
}

/** @deprecated Use lightboxImageSrcSet — kept for any single-URL callers. */
export function lightboxImageUrl(source: SanityImageSource) {
  return lightboxImageSrc(source)
}

export function resolveOpenGraphImage(
  image?: SanityImageSource | null,
  width = 1200,
  height = 627,
) {
  if (!image) return
  const url = urlFor(image).width(1200).height(627).fit('crop').quality(90).format('jpg').url()
  if (!url) return
  return {url, alt: (image as {alt?: string})?.alt || '', width, height}
}

// Depending on the type of link, we need to fetch the corresponding page, post, or URL.  Otherwise return null.
// export function linkResolver(link: Link | DereferencedLink | undefined) {
//   if (!link) return null

//   // If linkType is not set but href is, lets set linkType to "href".  This comes into play when pasting links into the portable text editor because a link type is not assumed.
//   if (!link.linkType && link.href) {
//     link.linkType = 'href'
//   }

//   switch (link.linkType) {
//     case 'href':
//       return link.href || null
//     case 'page':
//       if (link?.page && typeof link.page === 'string') {
//         return `/${link.page}`
//       }
//     case 'post':
//       if (link?.post && typeof link.post === 'string') {
//         return `/posts/${link.post}`
//       }
//     default:
//       return null
//   }
// }

type DataAttributeConfig = CreateDataAttributeProps &
  Required<Pick<CreateDataAttributeProps, 'id' | 'type' | 'path'>>

export function dataAttr(config: DataAttributeConfig): string {
  return createDataAttribute({
    projectId,
    dataset,
    baseUrl: studioUrl,
  })
    .combine(config)
    .toString()
}
