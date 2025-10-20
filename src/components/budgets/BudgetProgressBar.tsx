// src/components/budgets/BudgetProgressBar.tsx
'use client'

import { EncouragingProgress } from '@/components/ui/encouraging-progress'

interface BudgetProgressBarProps {
  percentage: number
  status?: 'good' | 'warning' | 'over'  // Keep for backwards compatibility but not used
  spent: number
  budget: number
  className?: string
}

export function BudgetProgressBar({ percentage, spent, budget, className }: BudgetProgressBarProps) {
  return (
    <EncouragingProgress
      percentage={percentage}
      spent={spent}
      budget={budget}
      className={className}
    />
  )
}
