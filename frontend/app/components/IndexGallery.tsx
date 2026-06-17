'use client'

import {useCallback, useEffect, useState} from 'react'

import Image from 'next/image'
import {IndexQueryResult} from '@/sanity.types'
import Link from 'next/link'

export type IndexImage = NonNullable<NonNullable<IndexQueryResult>['images']>[number] & {
  asset: NonNullable<NonNullable<NonNullable<IndexQueryResult>['images']>[number]['asset']>
}

type IndexGalleryProps = {
  images: IndexImage[]
}

export default function IndexGallery({images}: IndexGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const close = useCallback(() => setActiveIndex(null), [])

  const goTo = useCallback(
    (direction: 'prev' | 'next') => {
      setActiveIndex((current) => {
        if (current === null || images.length === 0) return current
        return direction === 'next'
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length
      })
    },
    [images.length],
  )

  useEffect(() => {
    if (activeIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') goTo('next')
      if (event.key === 'ArrowLeft') goTo('prev')
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, close, goTo])

  if (images.length === 0) return null

  const activeImage = activeIndex !== null ? images[activeIndex] : null

  return (
    <>
      <ul className="flex w-full flex-wrap md:justify-between justify-center gap-y-9 px-4.5 [container-type:inline-size]">
        {images.map((image, index) => {
          if (!image.asset?._id || !image.asset?.metadata?.dimensions?.width || !image.asset?.metadata?.dimensions?.height) return null
          const dimensions = image.asset.metadata.dimensions

          return (
            <li key={image._key} className="w-auto md:shrink-0 px-4.5 pb-9">
              <button
                type="button"
                className="inline-block cursor-pointer group relative"
                onClick={() => setActiveIndex(index)}
                aria-label={image.alt || `View image ${index + 1}`}
              >
                <Image
                  src={image.asset.url}
                  alt={image.alt ?? ''}
                  width={dimensions.width}
                  height={dimensions.height}
                  sizes="(max-width: 768px) 100vw, 16.666vw"
                  className={
                    dimensions.height > dimensions.width
                      // ? 'block h-auto w-full md:h-[calc((100cqw-11.25rem)/6)] md:w-auto'
                      // : 'block h-auto w-full md:w-[calc((100cqw-11.25rem)/6)]'
                      ? 'block md:h-[16.667vw] h-[50vw] w-auto'
                      : 'block md:w-[16.667vw] w-[50vw] h-auto'
                  }
                />
                {image.caption && (
                  <span className="absolute w-full top-full pt-2 left-0 text-center text-sm leading-tight opacity-0 group-hover:opacity-100">
                    {image.caption}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {activeImage?.asset?._id && activeIndex !== null && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <button
            type="button"
            onClick={close}
            className="absolute top-6 left-6 z-20 cursor-pointer text-sm tracking-wide uppercase"
          >
            Index
          </button>

          <div className="relative flex flex-1 items-center justify-center px-6 pt-24 pb-24">
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => goTo('prev')}
              className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-w-resize"
            />
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo('next')}
              className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-e-resize"
            />

            <Image
              src={activeImage.asset.url}
              alt={activeImage.alt ?? ''}
              width={activeImage.asset.metadata?.dimensions?.width || 1600}
              height={activeImage.asset.metadata?.dimensions?.height || 1600}
              className="relative z-0 max-h-[80vh] max-w-[80vw] object-contain"
            />
          </div>

          {activeImage.caption && (
            <p className="absolute right-6 bottom-6 left-6 text-center text-sm">
              {activeImage.caption}
            </p>
          )}
        </div>
      )}
      <div className="fixed bottom-9 left-9 z-50 flex items-center gap-4">
        <Link href="/info" className="block h-4 w-4 rounded-full bg-[#f0ff00]">
          <span className="sr-only">Info</span>
        </Link>
      </div>
    </>
  )
}
