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
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: summary } = trpc.budgets.summary.useQuery({ month: selectedMonth })
  const { data: budgetsList } = trpc.budgets.listByMonth.useQuery({ month: selectedMonth })

  // Get budget count for export preview
  const budgetCount = budgetsList?.length || 0

  // Export mutation (exports ALL budgets, not just current month)
  const exportMutation = trpc.exports.exportBudgets.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({
      format,
      // Future enhancement: filter by month
    }),
    dataType: 'budgets',
  })

  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold text-sage-600">Budgets</h1>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-sage-600 hover:bg-sage-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>

      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      {/* Export Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector
          value={exportHook.format}
          onChange={exportHook.setFormat}
          disabled={exportHook.isLoading}
        />

        <ExportButton
          onClick={exportHook.handleExport}
          loading={exportHook.isLoading}
          recordCount={budgetCount}
        >
          Export Budgets
        </ExportButton>

        {budgetCount === 0 && (
          <p className="text-sm text-warm-gray-600">
            No budgets to export
          </p>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
