// src/components/budgets/BudgetCard.tsx
'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BudgetProgressBar } from './BudgetProgressBar'
import { CategoryBadge } from '@/components/categories/CategoryBadge'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BudgetCardProps {
  budget: {
    id: string
    categoryId: string
    category: string
    categoryColor: string | null
    categoryIcon: string | null
    budgetAmount: number
    spentAmount: number
    remainingAmount: number
    percentage: number
    status: 'good' | 'warning' | 'over'
  }
  onEdit?: (budgetId: string) => void
  onDelete?: (budgetId: string) => void
}

export const BudgetCard = memo(function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  // Memoize expensive calculations
  const { formattedBudget, formattedSpent, formattedRemaining, isNegative } = useMemo(() => ({
    formattedBudget: formatCurrency(budget.budgetAmount),
    formattedSpent: formatCurrency(budget.spentAmount),
    formattedRemaining: formatCurrency(Math.abs(budget.remainingAmount)),
    isNegative: budget.remainingAmount < 0
  }), [budget.budgetAmount, budget.spentAmount, budget.remainingAmount])
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CategoryBadge
            category={{
              name: budget.category,
              icon: budget.categoryIcon,
              color: budget.categoryColor,
            }}
          />
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(budget.id)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit budget</span>
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(budget.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="sr-only">Delete budget</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Budgeted</p>
            <p className="font-semibold">{formattedBudget}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Spent</p>
            <p className="font-semibold">{formattedSpent}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p
              className={`font-semibold ${
                isNegative ? 'text-coral' : 'text-sage-600'
              }`}
            >
              {formattedRemaining}
            </p>
          </div>
        </div>
        <BudgetProgressBar
          percentage={budget.percentage}
          status={budget.status}
          spent={budget.spentAmount}
          budget={budget.budgetAmount}
        />
      </CardContent>
    </Card>
  )
})

BudgetCard.displayName = 'BudgetCard'
