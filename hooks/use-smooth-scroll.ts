"use client"

import { useEffect, useRef } from 'react'

interface SmoothScrollOptions {
  duration?: number
  easing?: string
  blur?: boolean
}

export const useSmoothScroll = () => {
  const isScrolling = useRef(false)
  const scrollTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const smoothScrollTo = (targetId: string, options: SmoothScrollOptions = {}): void => {
    const {
      duration = 800,
      easing = 'easeInOutCubic',
      blur = false
    } = options

    const targetElement = document.getElementById(targetId)
    if (!targetElement) return

    // Prevent multiple simultaneous scrolls
    if (isScrolling.current) return
    isScrolling.current = true

    const startPosition = window.pageYOffset
    const targetPosition = targetElement.offsetTop - 80 // Account for fixed nav
    const distance = targetPosition - startPosition
    let startTime: number | null = null

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)

      const easeProgress = easing === 'easeInOutCubic'
        ? easeInOutCubic(progress)
        : progress

      window.scrollTo(0, startPosition + distance * easeProgress)

      if (timeElapsed < duration) {
        requestAnimationFrame(animateScroll)
      } else {
        isScrolling.current = false

        // Clear any existing timeout
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }

        // Reset isScrolling after a delay to prevent rapid clicks
        scrollTimeout.current = setTimeout(() => {
          isScrolling.current = false
        }, 100)
      }
    }

    requestAnimationFrame(animateScroll)
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, targetId: string) => {
    e.preventDefault()
    smoothScrollTo(targetId)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [])

  return { handleClick, smoothScrollTo }
}
