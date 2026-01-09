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
      duration = 1200,
      easing = 'easeInOutCubic',
      blur = true
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

    // Add blur effect to body
    if (blur) {
      document.body.style.transition = 'filter 0.3s ease-out'
      document.body.style.filter = 'blur(2px)'
    }

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
        // Remove blur effect
        if (blur) {
          document.body.style.filter = 'none'
        }
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
      document.body.style.filter = 'none'
    }
  }, [])

  return { handleClick, smoothScrollTo }
}
