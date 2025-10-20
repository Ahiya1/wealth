'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function BudgetSummaryCard() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const { data: summaryData, isLoading: summaryLoading } = trpc.budgets.summary.useQuery({ month: currentMonth })
  const { data: progressData, isLoading: progressLoading } = trpc.budgets.progress.useQuery({ month: currentMonth })

  const isLoading = summaryLoading || progressLoading

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budgets</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  const budgetCount = summaryData?.budgetCount || 0
  const budgets = progressData?.budgets || []

  // Count budgets by status
  const overBudget = budgets.filter((b) => b.status === 'over').length
  const warning = budgets.filter((b) => b.status === 'warning').length
  const onTrack = budgets.filter((b) => b.status === 'good').length

  if (budgetCount === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budgets</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No budgets set</p>
          <Button variant="link" size="sm" asChild className="px-0 mt-1">
            <Link href="/budgets">Create budget</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Budgets</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/budgets">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{budgetCount}</div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          {onTrack > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">{onTrack} on track</span>
            </div>
          )}
          {warning > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">{warning} warning</span>
            </div>
          )}
          {overBudget > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">{overBudget} over</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
