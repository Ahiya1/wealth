/**
 * Shared TypeScript types for UI components
 * Foundation for Builder-1A, Builder-1B, Builder-1C
 */

import { type LucideIcon } from 'lucide-react'

// StatCard component types
export interface StatCardProps {
  title: string
  value: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon: LucideIcon
  variant?: 'default' | 'elevated'
  className?: string
}

// AffirmationCard - no props needed (self-contained)

// EmptyState component types
export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

// EncouragingProgress component types
export interface EncouragingProgressProps {
  percentage: number
  spent: number
  budget: number
  className?: string
}

export type ProgressVariant = 'excellent' | 'good' | 'approaching' | 'nearLimit' | 'attention'

// ProgressRing component types
export interface ProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  className?: string
}

// PageTransition wrapper types
export interface PageTransitionProps {
  children: React.ReactNode
}

// Common component patterns
export type ComponentVariant = 'default' | 'elevated' | 'muted' | 'accent'

// Trend direction (financial data)
export type TrendDirection = 'up' | 'down' | 'neutral'

export interface TrendIndicator {
  value: string
  direction: TrendDirection
}
