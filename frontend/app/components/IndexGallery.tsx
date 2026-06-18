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

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, close, goTo])

  if (images.length === 0) return null

  const activeImage = activeIndex !== null ? images[activeIndex] : null

  return (
    <>
      {activeImage?.asset?._id && activeIndex !== null ? (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col flex items-center justify-center">
          <button
            type="button"
            onClick={close}
            className="absolute top-6 left-9 z-20 cursor-pointer"
          >
            Index
          </button>

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
            className="relative z-0 max-h-[calc(100vh-20rem)] max-w-[calc(100vw-4.5rem)] object-contain"
            sizes="100vw"
          />

          {activeImage.caption && (
            <div className="absolute bottom-0 left-0 w-full text-center flex items-center justify-center h-40">
              <span className="whitespace-pre-wrap">
                {activeImage.caption}
              </span>
            </div>
          )}
        </div>
      ) : (
        <ul className="md:flex w-full flex-wrap justify-center gap-y-9 px-4.5 py-25 md:py-0 md:pt-9 max-md:pb-above-dot [container-type:inline-size] md:justify-between">
          {images.map((image, index) => {
            if (!image.asset?._id || !image.asset?.metadata?.dimensions?.width || !image.asset?.metadata?.dimensions?.height) return null
            const dimensions = image.asset.metadata.dimensions

            return (
              <li key={image._key} className="w-auto px-4.5 md:mb-9 mb-25 md:shrink-0">
                <button
                  type="button"
                  className="group relative block cursor-pointer m-auto"
                  onClick={() => setActiveIndex(index)}
                  aria-label={image.alt || `View image ${index + 1}`}
                >
                  <Image
                    src={image.asset.url}
                    alt={image.alt ?? ''}
                    width={dimensions.width}
                    height={dimensions.height}
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 16.666vw, 14.285vw"
                    className={`block
                      ${dimensions.height > dimensions.width
                        ? 'block h-[50vw] w-auto xl:h-[14.285vw] md:h-[16.667vw]'
                        : 'block h-auto w-[50vw] xl:w-[14.285vw] md:w-[16.667vw]'
                      }`}
                  />
                  {image.caption && (
                    <span className="absolute top-full left-0 w-full pt-2 text-center text-xs leading-tight opacity-100 md:can-hover:opacity-0 md:can-hover:group-hover:opacity-100">
                      {image.caption}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="dot-pos">
        <Link href="/info" className="dot bg-[#f0ff00]">
          <span className="sr-only">Info</span>
        </Link>
      </div>
    </>
  )
}
