'use client'

import { useMediaQuery } from './useMediaQuery'

/**
 * Custom hook to detect if user prefers reduced motion
 * @returns boolean - true if user prefers reduced motion, false otherwise
 *
 * Respects the user's system-level motion preferences (WCAG 2.1 requirement)
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion()
 * // Use to conditionally disable animations
 * variants={prefersReducedMotion ? undefined : staggerContainer}
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
