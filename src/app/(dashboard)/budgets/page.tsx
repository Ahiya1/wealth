// src/app/(dashboard)/budgets/page.tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { BudgetList } from '@/components/budgets/BudgetList'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { MonthSelector } from '@/components/budgets/MonthSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageTransition } from '@/components/ui/page-transition'
import { EncouragingProgress } from '@/components/ui/encouraging-progress'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/lib/utils'

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: summary } = trpc.budgets.summary.useQuery({ month: selectedMonth })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif font-bold text-sage-600">Budgets</h1>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-sage-600 hover:bg-sage-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>

      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-gray-600">
                Total Budgeted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-warm-gray-900">{formatCurrency(summary.totalBudgeted)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-gray-600">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-warm-gray-900">{formatCurrency(summary.totalSpent)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-gray-600">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  summary.remaining < 0 ? 'text-coral' : 'text-sage-600'
                }`}
              >
                {formatCurrency(Math.abs(summary.remaining))}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-gray-600">
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EncouragingProgress
                percentage={summary.percentageUsed}
                spent={summary.totalSpent}
                budget={summary.totalBudgeted}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <BudgetList month={selectedMonth} onAddBudget={() => setAddDialogOpen(true)} />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
            <DialogDescription>
              Set a spending limit for a category for {format(new Date(selectedMonth), 'MMMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          <BudgetForm month={selectedMonth} onSuccess={() => setAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  )
}
