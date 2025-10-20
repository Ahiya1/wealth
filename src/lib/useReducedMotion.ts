'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect user's motion preference for accessibility.
 * Returns true if user prefers reduced motion (WCAG 2.1 AA compliance).
 *
 * CRITICAL: Use this hook before any animation implementation to ensure
 * animations can be disabled for users with vestibular disorders or
 * motion sensitivity.
 *
 * @example
 * ```tsx
 * const reducedMotion = useReducedMotion()
 * const animation = getPageTransition(reducedMotion)
 * return <motion.div {...animation}>{children}</motion.div>
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}
