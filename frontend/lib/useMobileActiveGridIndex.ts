import {useCallback, useEffect, useRef, useState} from 'react'

const MOBILE_MQ = '(max-width: 767px)'

export function useMobileActiveGridIndex(itemCount: number, targetY = 0.33) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const enabledRef = useRef(false)
  const pickActiveRef = useRef<() => void>(() => {})

  const register = useCallback((index: number, element: HTMLElement | null) => {
    const observer = observerRef.current
    const previous = elementsRef.current.get(index)

    if (previous && observer) {
      observer.unobserve(previous)
    }

    if (element) {
      elementsRef.current.set(index, element)
      observer?.observe(element)
      if (enabledRef.current) {
        requestAnimationFrame(() => pickActiveRef.current())
      }
    } else {
      elementsRef.current.delete(index)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MQ)

    const pickActive = () => {
      if (!enabledRef.current) return

      const target = window.innerHeight * targetY
      let bestIndex: number | null = null
      let bestDistance = Infinity

      elementsRef.current.forEach((element, index) => {
        const rect = element.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return

        const centerY = rect.top + rect.height / 2
        const distance = Math.abs(centerY - target)

        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
        }
      })

      setFocusedIndex((current) => (current === bestIndex ? current : bestIndex))
    }

    pickActiveRef.current = pickActive

    const onMediaChange = () => {
      enabledRef.current = mediaQuery.matches
      if (!mediaQuery.matches) {
        setFocusedIndex(null)
      }
      pickActive()
    }

    enabledRef.current = mediaQuery.matches
    mediaQuery.addEventListener('change', onMediaChange)

    const observer = new IntersectionObserver(() => pickActive(), {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    })
    observerRef.current = observer

    elementsRef.current.forEach((element) => observer.observe(element))

    window.addEventListener('scroll', pickActive, {passive: true})
    window.addEventListener('resize', pickActive, {passive: true})
    pickActive()

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange)
      observer.disconnect()
      observerRef.current = null
      window.removeEventListener('scroll', pickActive)
      window.removeEventListener('resize', pickActive)
    }
  }, [itemCount, targetY])

  return {focusedIndex, register}
}
