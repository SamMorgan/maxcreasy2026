'use client'

import useEmblaCarousel from 'embla-carousel-react'
import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent} from 'react'

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

function revealLoadedImage(image: HTMLImageElement) {
  image.closest('[data-grid-item]')?.classList.remove('opacity-0')
}

function GridThumbnail({
  image,
  index,
  isLast,
  focusedIndex,
  onOpen,
}: {
  image: IndexImage
  index: number
  isLast: boolean
  focusedIndex: number | null
  onOpen: (index: number) => void
}) {
  const dimensions = image.asset!.metadata!.dimensions!
  const gridUrl = gridImageUrl(image)

  return (
    <li
      data-grid-index={index}
      className={`w-auto px-4.5 md:mb-18 md:shrink-0 ${!isLast ? 'mb-25' : ''}`}
    >
      <button
        type="button"
        data-grid-item
        className="group relative m-auto block cursor-pointer opacity-0"
        onClick={() => onOpen(index)}
        aria-label={image.alt || `View image ${index + 1}`}
      >
        <Image
          src={gridUrl}
          alt={image.alt ?? ''}
          width={dimensions.width}
          height={dimensions.height}
          unoptimized
          sizes="(max-width: 768px) 60vw, 12.5rem"
          loading={index < 6 ? 'eager' : 'lazy'}
          onLoad={(event) => revealLoadedImage(event.currentTarget)}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) revealLoadedImage(node)
          }}
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
}

type IndexLightboxProps = {
  images: IndexImage[]
  startIndex: number
  onClose: () => void
}

function lightboxCaption(image: IndexImage) {
  return image.carouselCaption?.length ? image.carouselCaption : image.caption
}

function wrapIndex(index: number, count: number) {
  return ((index % count) + count) % count
}

function isLightboxPreloadIndex(index: number, selectedIndex: number, count: number, radius = 2) {
  for (let offset = 1; offset <= radius; offset++) {
    if (index === wrapIndex(selectedIndex + offset, count)) return true
    if (index === wrapIndex(selectedIndex - offset, count)) return true
  }
  return false
}

const LIGHTBOX_PRELOAD_RADIUS = 2
const LIGHTBOX_BURST_WINDOW_MS = 1500
const LIGHTBOX_BURST_MIN_NAVS = 2
const LIGHTBOX_BURST_DIRECTIONAL_RADIUS = 5

function lightboxIndicesToPreload(center: number, count: number, radius = LIGHTBOX_PRELOAD_RADIUS) {
  const indices = [center]
  for (let offset = 1; offset <= radius; offset++) {
    indices.push(wrapIndex(center + offset, count))
    indices.push(wrapIndex(center - offset, count))
  }
  return indices
}

function lightboxIndicesToPreloadDirectionally(
  center: number,
  count: number,
  direction: 'prev' | 'next',
  radius: number,
) {
  const step = direction === 'next' ? 1 : -1
  const indices = [center]
  for (let offset = 1; offset <= radius; offset++) {
    indices.push(wrapIndex(center + step * offset, count))
  }
  return indices
}

function preloadLightboxImage(image: IndexImage) {
  if (!image.asset?._id) return

  const img = new window.Image()
  img.sizes = LIGHTBOX_IMAGE_SIZES
  img.srcset = lightboxImageSrcSet(image)
  img.src = lightboxImageSrc(image)
}

function forceImageLoad(img: HTMLImageElement) {
  if (img.complete) return

  img.loading = 'eager'
  const { src, srcset, sizes } = img
  img.removeAttribute('src')
  if (srcset) img.srcset = srcset
  if (sizes) img.sizes = sizes
  if (src) img.src = src
}

function arrayIndexToSlideIndex(images: IndexImage[], arrayIndex: number) {
  let slideIndex = 0

  for (let index = 0; index < images.length; index++) {
    if (!images[index].asset?._id) continue
    if (index === arrayIndex) return slideIndex
    slideIndex++
  }

  return 0
}

function IndexLightbox({images, startIndex, onClose}: IndexLightboxProps) {
  const lightboxImages = useMemo(
    () => images.filter((image) => Boolean(image.asset?._id)),
    [images],
  )
  const startSlideIndex = useMemo(
    () => arrayIndexToSlideIndex(images, startIndex),
    [images, startIndex],
  )
  const [selectedIndex, setSelectedIndex] = useState(startSlideIndex)
  const pointerStartRef = useRef<{x: number; y: number} | null>(null)
  const imgRefs = useRef(new Map<number, HTMLImageElement>())
  const navTimestampsRef = useRef<number[]>([])
  const lastNavDirectionRef = useRef<'prev' | 'next'>('next')
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 0,
    startIndex: startSlideIndex,
    align: 'start',
    watchDrag: false,
  })

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.scrollTo(startSlideIndex, true)
    setSelectedIndex(startSlideIndex)
  }, [emblaApi, startSlideIndex])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()

    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const isBurstNavigating = useCallback(() => {
    const now = Date.now()
    navTimestampsRef.current = navTimestampsRef.current.filter(
      (timestamp) => now - timestamp < LIGHTBOX_BURST_WINDOW_MS,
    )
    return navTimestampsRef.current.length >= LIGHTBOX_BURST_MIN_NAVS
  }, [])

  const recordNavigation = useCallback((direction: 'prev' | 'next') => {
    lastNavDirectionRef.current = direction
    navTimestampsRef.current.push(Date.now())
  }, [])

  const preloadSlideIndex = useCallback(
    (index: number) => {
      const image = lightboxImages[index]
      if (!image) return

      preloadLightboxImage(image)

      const img = imgRefs.current.get(index)
      if (img && !img.complete) forceImageLoad(img)
    },
    [lightboxImages],
  )

  const preloadAroundIndex = useCallback(
    (center: number, radius = LIGHTBOX_PRELOAD_RADIUS) => {
      if (lightboxImages.length === 0) return

      for (const index of lightboxIndicesToPreload(center, lightboxImages.length, radius)) {
        preloadSlideIndex(index)
      }
    },
    [lightboxImages.length, preloadSlideIndex],
  )

  const preloadDirectionally = useCallback(
    (center: number, direction: 'prev' | 'next', radius: number) => {
      if (lightboxImages.length === 0) return

      for (const index of lightboxIndicesToPreloadDirectionally(
        center,
        lightboxImages.length,
        direction,
        radius,
      )) {
        preloadSlideIndex(index)
      }
    },
    [lightboxImages.length, preloadSlideIndex],
  )

  const preloadForNavigation = useCallback(
    (center: number, direction: 'prev' | 'next') => {
      if (isBurstNavigating()) {
        preloadDirectionally(center, direction, LIGHTBOX_BURST_DIRECTIONAL_RADIUS)
        return
      }

      preloadAroundIndex(center, LIGHTBOX_PRELOAD_RADIUS + 1)
      preloadDirectionally(center, direction, LIGHTBOX_PRELOAD_RADIUS + 1)
    },
    [isBurstNavigating, preloadAroundIndex, preloadDirectionally],
  )

  useEffect(() => {
    if (isBurstNavigating()) {
      preloadDirectionally(
        selectedIndex,
        lastNavDirectionRef.current,
        LIGHTBOX_BURST_DIRECTIONAL_RADIUS,
      )
      return
    }

    preloadAroundIndex(selectedIndex)
  }, [selectedIndex, isBurstNavigating, preloadAroundIndex, preloadDirectionally])

  const goPrev = useCallback(() => {
    const current = emblaApi?.selectedScrollSnap() ?? selectedIndex
    recordNavigation('prev')
    preloadForNavigation(current, 'prev')
    emblaApi?.scrollPrev()
  }, [emblaApi, preloadForNavigation, recordNavigation, selectedIndex])

  const goNext = useCallback(() => {
    const current = emblaApi?.selectedScrollSnap() ?? selectedIndex
    recordNavigation('next')
    preloadForNavigation(current, 'next')
    emblaApi?.scrollNext()
  }, [emblaApi, preloadForNavigation, recordNavigation, selectedIndex])

  const preloadOnNavPointerDown = useCallback(
    (direction: 'prev' | 'next') => {
      if (!emblaApi || lightboxImages.length === 0) return

      const current = emblaApi.selectedScrollSnap()
      const radius = isBurstNavigating()
        ? LIGHTBOX_BURST_DIRECTIONAL_RADIUS
        : LIGHTBOX_PRELOAD_RADIUS + 1

      preloadDirectionally(current, direction, radius)
    },
    [emblaApi, isBurstNavigating, lightboxImages.length, preloadDirectionally],
  )

  useEffect(() => {
    if (!emblaApi) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrev()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [emblaApi, onClose, goNext, goPrev])

  const resetPointer = useCallback(() => {
    pointerStartRef.current = null
  }, [])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerStartRef.current = {x: event.clientX, y: event.clientY}

      const bounds = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - bounds.left
      const direction = clickX < bounds.width / 2 ? 'prev' : 'next'
      const radius = isBurstNavigating()
        ? LIGHTBOX_BURST_DIRECTIONAL_RADIUS
        : LIGHTBOX_PRELOAD_RADIUS + 1

      preloadDirectionally(selectedIndex, direction, radius)
    },
    [isBurstNavigating, preloadDirectionally, selectedIndex],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!emblaApi || !pointerStartRef.current) return
      if ((event.target as HTMLElement).closest('a')) {
        pointerStartRef.current = null
        return
      }

      const dx = event.clientX - pointerStartRef.current.x
      const dy = event.clientY - pointerStartRef.current.y
      pointerStartRef.current = null

      const swipeThreshold = 40

      if (Math.abs(dx) >= swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext()
        else goPrev()
        return
      }

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return

      const bounds = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - bounds.left

      if (clickX < bounds.width / 2) goPrev()
      else goNext()
    },
    [emblaApi, goNext, goPrev],
  )

  return (
    <div className="fixed inset-0 z-50 h-svh">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 md:left-9 left-6 z-20 cursor-pointer"
      >
        Index
      </button>

      <button
        type="button"
        aria-label="Previous image"
        onPointerDown={() => preloadOnNavPointerDown('prev')}
        onClick={goPrev}
        className="absolute inset-y-0 left-0 z-10 hidden w-1/2 cursor-arrow-left can-hover:block"
      />
      <button
        type="button"
        aria-label="Next image"
        onPointerDown={() => preloadOnNavPointerDown('next')}
        onClick={goNext}
        className="absolute inset-y-0 right-0 z-10 hidden w-1/2 cursor-arrow-right can-hover:block"
      />

      <div
        className="h-full w-full overflow-hidden touch-none"
        ref={emblaRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetPointer}
      >
        <div className="flex h-full">
          {lightboxImages.map((image, index) => {
            const isSelected = index === selectedIndex
            const isNeighbor = isLightboxPreloadIndex(index, selectedIndex, lightboxImages.length)
            const caption = lightboxCaption(image)

            return (
              <div
                key={image._key}
                className="h-full min-w-0 flex-[0_0_100%] select-none"
                aria-hidden={!isSelected}
              >
                <div className="relative flex h-full flex-col px-6 md:px-9">
                  <div className="mt-auto flex h-[calc(100svh-9.25rem)] items-center justify-center md:h-[calc(100svh-20rem)] relative">
                    <img
                      ref={(node) => {
                        if (node) imgRefs.current.set(index, node)
                        else imgRefs.current.delete(index)
                      }}
                      src={lightboxImageSrc(image)}
                      srcSet={lightboxImageSrcSet(image)}
                      sizes={LIGHTBOX_IMAGE_SIZES}
                      alt={image.alt ?? ''}
                      draggable={false}
                      loading={isSelected || isNeighbor ? 'eager' : 'lazy'}
                      fetchPriority={isSelected ? 'high' : isNeighbor ? 'low' : 'auto'}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                    {/* {image.asset?.url && (
                    <Image
                      src={image.asset?.url}
                      alt={image.alt ?? ''}
                        fill={true} 
                        sizes="100vw"
                        //unoptimized
                        //sizes={LIGHTBOX_IMAGE_SIZES}
                        loading={isSelected || isNeighbor ? 'eager' : 'lazy'}
                      />
                    )} */}
                  </div>

                  {caption?.length ? (
                    <div className="flex h-18.5 shrink-0 items-center justify-center text-center md:h-40 [&_a]:hover:opacity-30">
                      <CustomPortableText value={caption as BlockContentTextOnly} />
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function IndexGallery({images}: IndexGalleryProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(() => {
    const index = images.findIndex(isRenderableGridImage)
    return index === -1 ? null : index
  })

  const close = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const openImage = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (activeIndex !== null) {
      setFocusedIndex(null)
      return
    }

    const markers = listRef.current?.querySelectorAll<HTMLElement>('[data-grid-marker]')
    if (!markers?.length) return

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

  if (images.length === 0) return null

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
      {activeIndex !== null ? (
        <IndexLightbox images={images} startIndex={activeIndex} onClose={close} />
      ) : (
        <ul
          ref={listRef}
          className="mobile-grid-edge-padding md:flex w-full flex-wrap justify-center px-4.5 md:pb-18 md:pt-9 [container-type:inline-size] md:justify-between"
          style={mobileEdgePaddingStyle}
        >
          {images.map((image, index) => {
            if (!isRenderableGridImage(image)) return null

            return (
              <GridThumbnail
                key={image._key}
                image={image}
                index={index}
                isLast={index === lastRenderableIndex}
                focusedIndex={focusedIndex}
                onOpen={openImage}
              />
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
