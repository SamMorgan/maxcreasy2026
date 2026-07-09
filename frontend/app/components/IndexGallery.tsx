'use client'

import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react'

import Image from 'next/image'
import CustomPortableText from '@/app/components/PortableText'
import {gridImageUrl, lightboxImageSrc, lightboxImageSrcSet, LIGHTBOX_IMAGE_SIZES} from '@/sanity/lib/utils'
import {IndexQueryResult, type BlockContentTextOnly} from '@/sanity.types'
import Link from 'next/link'

export type IndexImage = NonNullable<NonNullable<IndexQueryResult>['images']>[number] & {
  asset: NonNullable<NonNullable<NonNullable<IndexQueryResult>['images']>[number]['asset']>
}

type IndexGalleryProps = {
  images: IndexImage[]
}

function mobileGridImageHalfHeight(width: number, height: number) {
  if (height > width) {
    //return 'calc((100vw - 10rem) / 2)'
    return '200px'
  }

  //return `calc((100vw - 10rem) * ${height} / ${width} / 2)`
  return `calc(200px * ${height} / ${width} / 2)`
}

function imageDimensions(image: IndexImage) {
  const width = image.asset?.metadata?.dimensions?.width
  const height = image.asset?.metadata?.dimensions?.height
  if (!width || !height) return null
  return {width, height}
}

function isRenderableGridImage(image: IndexImage) {
  return imageDimensions(image) !== null && Boolean(image.asset?._id)
}

function wrapIndex(index: number, count: number) {
  return ((index % count) + count) % count
}

export default function IndexGallery({images}: IndexGalleryProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const activeIndexRef = useRef<number | null>(null)
  const loadedSlideIndicesRef = useRef(new Set<number>())
  const preloadingSlideIndicesRef = useRef(new Set<number>())
  const [loadedSlideIndices, setLoadedSlideIndices] = useState<Set<number>>(new Set())

  const markSlideLoaded = useCallback((index: number) => {
    if (loadedSlideIndicesRef.current.has(index)) return
    loadedSlideIndicesRef.current.add(index)
    setLoadedSlideIndices((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  const preloadLightboxAtIndex = useCallback(
    (index: number) => {
      const image = images[index]
      if (!image?.asset?._id) return
      if (
        loadedSlideIndicesRef.current.has(index) ||
        preloadingSlideIndicesRef.current.has(index)
      ) {
        return
      }

      preloadingSlideIndicesRef.current.add(index)
      const img = new window.Image()
      img.sizes = LIGHTBOX_IMAGE_SIZES
      img.srcset = lightboxImageSrcSet(image)
      img.src = lightboxImageSrc(image)
      img.onload = () => {
        preloadingSlideIndicesRef.current.delete(index)
        markSlideLoaded(index)
      }
      img.onerror = () => preloadingSlideIndicesRef.current.delete(index)
    },
    [images, markSlideLoaded],
  )

  const isSlideLoaded = useCallback(
    (index: number) => loadedSlideIndices.has(index),
    [loadedSlideIndices],
  )

  const imageCount = images.length
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(() => {
    const index = images.findIndex(isRenderableGridImage)
    return index === -1 ? null : index
  })
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(new Set())

  const mountAndPreload = useCallback(
    (indices: number[]) => {
      indices.forEach(preloadLightboxAtIndex)
      setMountedIndices((prev) => {
        const next = new Set(prev)
        indices.forEach((index) => next.add(index))
        return next
      })
    },
    [preloadLightboxAtIndex],
  )

  // Keep prev, current, and next preloaded whenever the active slide changes.
  const ensureAdjacentLoaded = useCallback(
    (centerIndex: number) => {
      if (imageCount === 0) return
      mountAndPreload([
        centerIndex,
        wrapIndex(centerIndex + 1, imageCount),
        wrapIndex(centerIndex - 1, imageCount),
      ])
    },
    [imageCount, mountAndPreload],
  )

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    if (activeIndex === null) return
    ensureAdjacentLoaded(activeIndex)
  }, [activeIndex, ensureAdjacentLoaded])

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
        if (current === null || imageCount === 0) return current
        return direction === 'next'
          ? wrapIndex(current + 1, imageCount)
          : wrapIndex(current - 1, imageCount)
      })
    },
    [imageCount],
  )

  const handleNavPointerDown = useCallback(
    (direction: 'prev' | 'next') => {
      const current = activeIndexRef.current
      if (current === null || imageCount === 0) return

      const destination =
        direction === 'next'
          ? wrapIndex(current + 1, imageCount)
          : wrapIndex(current - 1, imageCount)

      const beyond =
        direction === 'next'
          ? wrapIndex(destination + 1, imageCount)
          : wrapIndex(destination - 1, imageCount)

      // Destination should already be preloaded; fetch one more in travel direction.
      mountAndPreload([destination, beyond])
    },
    [imageCount, mountAndPreload],
  )

  const handleGridPreload = useCallback(
    (index: number) => {
      if (imageCount === 0) return
      mountAndPreload([
        index,
        wrapIndex(index + 1, imageCount),
        wrapIndex(index - 1, imageCount),
      ])
    },
    [imageCount, mountAndPreload],
  )

  useEffect(() => {
    if (activeIndex !== null) {
      setFocusedIndex(null)
      return
    }

    const markers = listRef.current?.querySelectorAll<HTMLElement>('[data-grid-marker]')
    if (!markers?.length) return

    // Detection band is the top half of the viewport (top edge → vertical centre).
    // The observer callback only reports markers whose intersection *changed*, so we
    // track all currently-intersecting markers and pick the lowest one (closest to the
    // centre line) using a fresh measurement. Never clear, so only one caption shows.
    const intersecting = new Set<HTMLElement>()
    const observer = new IntersectionObserver(
      (entries) => {
        if (window.matchMedia('(min-width: 48rem)').matches) return

        for (const entry of entries) {
          const target = entry.target as HTMLElement
          if (entry.isIntersecting) intersecting.add(target)
          else intersecting.delete(target)
        }

        let next: number | null = null
        let nextY = -Infinity

        for (const target of intersecting) {
          const y = target.getBoundingClientRect().top
          if (y > nextY) {
            nextY = y
            next = Number(target.dataset.gridMarker)
          }
        }

        if (next !== null) setFocusedIndex(next)
      },
      {rootMargin: '0px 0px -50% 0px'},
    )

    markers.forEach((marker) => observer.observe(marker))

    return () => observer.disconnect()
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
  const firstDimensions = images.map(imageDimensions).find((dimensions) => dimensions !== null)
  const lastDimensions = [...images]
    .reverse()
    .map(imageDimensions)
    .find((dimensions) => dimensions !== null)
  const mobileEdgePaddingStyle =
    firstDimensions && lastDimensions
      ? ({
          '--first-half-h': mobileGridImageHalfHeight(
            firstDimensions.width,
            firstDimensions.height,
          ),
          '--last-half-h': mobileGridImageHalfHeight(
            lastDimensions.width,
            lastDimensions.height,
          ),
        } as CSSProperties)
      : undefined
  const lastRenderableIndex = images.findLastIndex(isRenderableGridImage)

  return (
    <>
      {activeImage?.asset?._id && activeIndex !== null ? (
        <div className="fixed inset-0 z-50 flex h-svh flex-col items-center justify-center">
          <button
            type="button"
            onClick={close}
            className="absolute top-6 md:left-9 left-6 z-20 cursor-pointer"
          >
            Index
          </button>

          <button
            type="button"
            aria-label="Previous image"
            onPointerDown={() => handleNavPointerDown('prev')}
            onClick={() => goTo('prev')}
            className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-arrow-left"
          />
          <button
            type="button"
            aria-label="Next image"
            onPointerDown={() => handleNavPointerDown('next')}
            onClick={() => goTo('next')}
            className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-arrow-right"
          />

          <div className="relative m-auto md:h-[calc(100%-20rem)] h-[calc(100%-10rem)] md:w-[calc(100%-4.5rem)] w-[calc(100%-3rem)]">
            {[...mountedIndices].map((index) => {
              const image = images[index]
              if (!image?.asset?._id) return null

              const src = lightboxImageSrc(image)
              const srcSet = lightboxImageSrcSet(image)
              const isActive = index === activeIndex
              const isLoaded = isSlideLoaded(index)

              return (
                <img
                  key={image._key}
                  src={src}
                  srcSet={srcSet}
                  sizes={LIGHTBOX_IMAGE_SIZES}
                  alt={image.alt ?? ''}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 h-full w-full object-contain pointer-events-none ${
                    isActive && isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => markSlideLoaded(index)}
                />
              )
            })}
          </div>

          {(() => {
            const lightboxCaption = activeImage.carouselCaption?.length
              ? activeImage.carouselCaption
              : activeImage.caption
            return lightboxCaption?.length ? (
              <div className="absolute md:bottom-0 bottom-6.5 left-0 md:flex md:h-40 w-full items-center justify-center text-center [&_a]:hover:opacity-30">
                <CustomPortableText value={lightboxCaption as BlockContentTextOnly} />
              </div>
            ) : null
          })()}
        </div>
      ) : (
        <ul
          ref={listRef}
          className="mobile-grid-edge-padding md:flex w-full flex-wrap justify-center px-4.5 md:pb-18 md:pt-9 [container-type:inline-size] md:justify-between"
          style={mobileEdgePaddingStyle}
        >
          {images.map((image, index) => {
            if (!isRenderableGridImage(image)) return null

            const dimensions = image.asset!.metadata!.dimensions!
            const gridUrl = gridImageUrl(image)

            return (
              <li
                key={image._key}
                data-grid-index={index}
                className={`w-auto px-4.5 md:mb-18 md:shrink-0 ${index !== lastRenderableIndex ? 'mb-25' : ''}`}
              >
                <button
                  type="button"
                  className="group relative m-auto block cursor-pointer opacity-0"
                  onPointerDown={() => handleGridPreload(index)}
                  onPointerEnter={() => handleGridPreload(index)}
                  onClick={() => openImage(index)}
                  aria-label={image.alt || `View image ${index + 1}`}
                >
                  <Image
                    src={gridUrl}
                    alt={image.alt ?? ''}
                    width={dimensions.width}
                    height={dimensions.height}
                    unoptimized
                    //sizes="(max-width: 768px) 100vw, 12.5rem"
                    sizes="(max-width: 768px) 60vw, 12.5rem"
                    onLoad={(e) => {
                      e.currentTarget.closest('.opacity-0')?.classList.remove('opacity-0')
                    }}
                    loading="eager"
                    // className={
                    //   dimensions.height <= dimensions.width
                    //     ? 'block h-auto md:w-50 w-[calc(100vw-10rem)]'
                    //     : 'block md:h-50 h-[calc(100vw-10rem)] w-auto'
                    // }
                    className={
                      dimensions.height <= dimensions.width
                        ? 'block h-auto w-[200px]'
                        : 'block w-auto h-[200px]'
                    }
                  />
                  <span
                    data-grid-marker={index}
                    className="pointer-events-none absolute top-1/2 left-1/2 h-px w-px -translate-1/2 opacity-0 md:hidden"
                    aria-hidden
                  />
                  {image.caption?.length ? (
                    <div
                      data-active={focusedIndex === index ? 'true' : undefined}
                      className="grid-caption [&_a]:hover:opacity-30"
                    >
                      <CustomPortableText value={image.caption as BlockContentTextOnly} />
                    </div>
                  ) : null}
                </button>
              </li>
            )
          })}
          {Array.from({length: 8}, (_, index) => (
            <li
              key={`spacer-${index}`}
              aria-hidden
              className="pointer-events-none invisible max-md:hidden w-auto px-4.5 md:shrink-0"
            >
              <span className="block md:w-50" />
            </li>
          ))}
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
