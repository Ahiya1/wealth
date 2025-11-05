'use client'

import { useState, useEffect } from 'react'

export type ScrollDirection = 'up' | 'down'

interface UseScrollDirectionOptions {
  threshold?: number // Minimum scroll distance before direction change
  initialDirection?: ScrollDirection
}

interface UseScrollDirectionReturn {
  scrollDirection: ScrollDirection
  scrollY: number
  isAtTop: boolean
  isAtBottom: boolean
}

/**
 * Hook to detect scroll direction for auto-hide bottom navigation
 *
 * Features:
 * - Detects scroll direction (up/down) with configurable threshold
 * - Always shows nav at top of page (isAtTop)
 * - Throttles with requestAnimationFrame for 60fps performance
 * - Ignores small movements (jitter prevention)
 * - Passive scroll listener for better performance
 *
 * @param options - Configuration options
 * @returns Scroll state object
 */
export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionReturn {
  const { threshold = 80, initialDirection = 'up' } = options

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection)
  const [scrollY, setScrollY] = useState(0)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    // Client-side only (SSR safety)
    if (typeof window === 'undefined') return

    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY
      const documentHeight = document.documentElement.scrollHeight
      const windowHeight = window.innerHeight

      // Update scroll position
      setScrollY(currentScrollY)

      // Check if at top (always show nav when at top)
      setIsAtTop(currentScrollY < threshold)

      // Check if at bottom
      setIsAtBottom(currentScrollY + windowHeight >= documentHeight - threshold)

      // Ignore small movements to prevent jitter (10px threshold)
      if (Math.abs(currentScrollY - lastScrollY) < 10) {
        ticking = false
        return
      }

      // Detect overscroll (iOS Safari rubber-band bounce)
      const maxScroll = documentHeight - windowHeight
      const isOverscroll = currentScrollY < 0 || currentScrollY > maxScroll + 10

      if (isOverscroll) {
        // Ignore overscroll events
        ticking = false
        return
      }

      // Determine direction
      const newDirection = currentScrollY > lastScrollY ? 'down' : 'up'

      // Only update if direction actually changed
      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection)
      }

      lastScrollY = currentScrollY > 0 ? currentScrollY : 0
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        // Use requestAnimationFrame for smooth 60fps updates
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    // Passive listener for better scroll performance (no preventDefault)
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial check
    updateScrollDirection()

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollDirection, threshold])

  return {
    scrollDirection,
    scrollY,
    isAtTop,
    isAtBottom,
  }
}
