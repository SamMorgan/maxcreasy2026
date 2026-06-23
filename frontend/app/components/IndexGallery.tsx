'use client'

import {useCallback, useEffect, useState} from 'react'

import Image from 'next/image'
import {useMobileActiveGridIndex} from '@/lib/useMobileActiveGridIndex'
import {IndexQueryResult} from '@/sanity.types'
import Link from 'next/link'

export type IndexImage = NonNullable<NonNullable<IndexQueryResult>['images']>[number] & {
  asset: NonNullable<NonNullable<NonNullable<IndexQueryResult>['images']>[number]['asset']>
}

type IndexGalleryProps = {
  images: IndexImage[]
}

const MD_COLUMNS = 6
const XL_COLUMNS = 7

function spacerCount(count: number, columns: number) {
  return (columns - (count % columns)) % columns
}

function GridSpacers({count, breakpoint}: {count: number; breakpoint: 'md' | 'xl'}) {
  if (count === 0) return null

  return Array.from({length: count}, (_, index) => (
    <li
      key={`spacer-${breakpoint}-${index}`}
      aria-hidden
      className={`pointer-events-none invisible max-md:hidden w-auto px-4.5 md:mb-9 md:shrink-0 ${
        breakpoint === 'md' ? 'xl:hidden' : 'hidden xl:block'
      }`}
    >
      <span
        className={
          breakpoint === 'md'
            ? 'block md:w-[16.667vw]'
            : 'block w-[14.285vw]'
        }
      />
    </li>
  ))
}

function markUrlLoaded(url: string, setLoadedUrls: (fn: (prev: Set<string>) => Set<string>) => void) {
  setLoadedUrls((prev) => {
    if (prev.has(url)) return prev
    const next = new Set(prev)
    next.add(url)
    return next
  })
}

export default function IndexGallery({images}: IndexGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(new Set())
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())
  const {focusedIndex: focusedGridIndex, register: registerGridItem} = useMobileActiveGridIndex(
    images.length,
  )

  const close = useCallback(() => {
    setActiveIndex(null)
    setMountedIndices(new Set())
  }, [])

  const openImage = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

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

    const count = images.length
    setMountedIndices((prev) => {
      const next = new Set(prev)
      next.add(activeIndex)
      next.add((activeIndex + 1) % count)
      next.add((activeIndex - 1 + count) % count)
      return next
    })
  }, [activeIndex, images.length])

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
  const mdSpacerCount = spacerCount(images.length, MD_COLUMNS)
  const xlSpacerCount = spacerCount(images.length, XL_COLUMNS)

  return (
    <>
      {activeImage?.asset?._id && activeIndex !== null ? (
        <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center">
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
            className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-arrow-left"
          />
          <button
            type="button"
            aria-label="Next image"
            onClick={() => goTo('next')}
            className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-arrow-right"
          />

          <div className="relative m-auto h-full w-full max-h-[calc(100vh-20rem)] max-w-[calc(100vw-4.5rem)]">
            {[...mountedIndices].map((index) => {
              const image = images[index]
              const url = image?.asset?.url
              if (!url) return null

              const isActive = index === activeIndex
              const isLoaded = loadedUrls.has(url)

              return (
                <Image
                  key={image._key}
                  src={url}
                  alt={image.alt ?? image.caption ?? ''}
                  fill
                  sizes="calc(100vw - 4.5rem)"
                  aria-hidden={!isActive}
                  className={`absolute inset-0 object-contain pointer-events-none ${
                    isActive && isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => markUrlLoaded(url, setLoadedUrls)}
                />
              )
            })}
          </div>

          {activeImage.caption && (
            <div className="absolute bottom-0 left-0 flex h-40 w-full items-center justify-center text-center">
              <span className="whitespace-pre-wrap">{activeImage.caption}</span>
            </div>
          )}
        </div>
      ) : (
        <ul className="md:flex w-full flex-wrap justify-center gap-y-9 px-4.5 py-25 md:pt-9 max-md:pb-above-dot [container-type:inline-size] md:justify-between">
          {images.map((image, index) => {
            if (!image.asset?._id || !image.asset?.metadata?.dimensions?.width || !image.asset?.metadata?.dimensions?.height) return null
            const dimensions = image.asset.metadata.dimensions

            return (
              <li
                key={image._key}
                ref={(element) => registerGridItem(index, element)}
                className="w-auto px-4.5 md:mb-9 mb-25 md:shrink-0"
              >
                <button
                  type="button"
                  className="group relative m-auto block cursor-pointer"
                  onClick={() => openImage(index)}
                  aria-label={image.alt || `View image ${index + 1}`}
                >
                  <div className={`relative ${dimensions.height > dimensions.width
                      ? 'block h-[50vw] w-auto xl:h-[12.5vw] lg:h-[14.285vw] md:h-[25vw]'
                      : 'block h-auto w-[50vw] xl:w-[12.5vw] lg:w-[14.285vw] md:w-[25vw]'
                  }`} style={{aspectRatio: dimensions.width / dimensions.height}}>
                  <Image
                    src={image.asset.url}
                    alt={image.alt ?? ''}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 14.285vw, 12.5vw"
                    onLoad={() => markUrlLoaded(image.asset.url, setLoadedUrls)}
                    className='block'
                  />
                  </div>
                  {image.caption && (
                    <span
                      className={`absolute top-full left-0 w-full pt-2 text-center text-xs leading-tight max-md:opacity-0 md:opacity-100 md:can-hover:opacity-0 md:can-hover:group-hover:opacity-100 ${
                        focusedGridIndex === index ? 'max-md:opacity-100' : ''
                      }`}
                    >
                      {image.caption}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          <GridSpacers count={mdSpacerCount} breakpoint="md" />
          <GridSpacers count={xlSpacerCount} breakpoint="xl" />
        </ul>
      )}
      <div className="dot-pos">
        <Link href="/info" className="dot">
          <span className="sr-only">Info</span>
        </Link>
      </div>
    </>
  )
}
