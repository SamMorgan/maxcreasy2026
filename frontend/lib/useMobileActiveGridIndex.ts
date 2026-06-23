import {useCallback, useEffect, useRef, useState} from 'react'

const MOBILE_MQ = '(max-width: 767px)'

function centerBandRootMargin(bandPercent: number) {
  const inset = (100 - bandPercent) / 2
  return `-${inset}% 0px -${inset}% 0px`
}

export function useMobileActiveGridIndex(itemCount: number, centerBandPercent = 10) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map())
  const intersectionRatiosRef = useRef<Map<number, number>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const enabledRef = useRef(false)

  const register = useCallback((index: number, element: HTMLElement | null) => {
    const observer = observerRef.current
    const previous = elementsRef.current.get(index)

    if (previous && observer) {
      observer.unobserve(previous)
    }

    if (element) {
      elementsRef.current.set(index, element)
      observer?.observe(element)
    } else {
      elementsRef.current.delete(index)
      intersectionRatiosRef.current.delete(index)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MQ)

    const pickActiveFromRatios = () => {
      if (!enabledRef.current) return

      let bestIndex: number | null = null
      let bestRatio = 0

      intersectionRatiosRef.current.forEach((ratio, index) => {
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestIndex = index
        }
      })

      setFocusedIndex((current) => (current === bestIndex ? current : bestIndex))
    }

    const onMediaChange = () => {
      enabledRef.current = mediaQuery.matches
      if (!mediaQuery.matches) {
        intersectionRatiosRef.current.clear()
        setFocusedIndex(null)
      }
    }

    enabledRef.current = mediaQuery.matches
    mediaQuery.addEventListener('change', onMediaChange)

    const observer = new IntersectionObserver(
      (entries) => {
        if (!enabledRef.current) return

        entries.forEach((entry) => {
          let index: number | undefined
          elementsRef.current.forEach((element, elementIndex) => {
            if (element === entry.target) {
              index = elementIndex
            }
          })
          if (index === undefined) return

          intersectionRatiosRef.current.set(index, entry.intersectionRatio)
        })

        pickActiveFromRatios()
      },
      {
        root: null,
        rootMargin: centerBandRootMargin(centerBandPercent),
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    )
    observerRef.current = observer

    elementsRef.current.forEach((element) => observer.observe(element))

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange)
      observer.disconnect()
      observerRef.current = null
      intersectionRatiosRef.current.clear()
    }
  }, [itemCount, centerBandPercent])

  return {focusedIndex, register}
}
