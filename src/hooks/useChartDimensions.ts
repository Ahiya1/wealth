'use client'

import { useMediaQuery } from './useMediaQuery'

/**
 * Responsive chart dimensions hook for mobile optimization
 * Provides consistent responsive behavior across all chart components
 *
 * Mobile (≤768px): 250px height, minimal margins, hide pie labels
 * Desktop (>768px): 350px height, standard margins, show pie labels
 *
 * @returns ChartDimensions object with height, margin, and hidePieLabels
 *
 * @example
 * const { height, margin, hidePieLabels } = useChartDimensions()
 *
 * <ResponsiveContainer width="100%" height={height}>
 *   <LineChart margin={margin}>
 *     ...
 *   </LineChart>
 * </ResponsiveContainer>
 */

export interface ChartDimensions {
  /** Chart height in pixels (250px mobile, 350px desktop) */
  height: number
  /** Chart margins (smaller on mobile to maximize space) */
  margin: {
    top: number
    right: number
    left: number
    bottom: number
  }
  /** Whether to hide pie chart labels (true on mobile to prevent collisions) */
  hidePieLabels: boolean
}

export function useChartDimensions(): ChartDimensions {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return {
    height: isMobile ? 250 : 350,
    margin: isMobile
      ? { top: 5, right: 10, left: 0, bottom: 5 }
      : { top: 5, right: 20, left: 10, bottom: 5 },
    hidePieLabels: isMobile
  }
}
