'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function RecentTransactionsCard() {
  const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground dark:text-warm-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const transactions = data?.recentTransactions || []

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Start tracking your spending and income to see your activity here"
            action={
              <Button asChild className="bg-sage-600 dark:bg-sage-500 hover:bg-sage-700 dark:hover:bg-sage-600">
                <Link href="/transactions">
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </>
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-serif">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300">
          <Link href="/transactions">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((txn) => {
            const amount = Number(txn.amount)
            const isExpense = amount < 0

            return (
              <div key={txn.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{txn.payee}</p>
                  <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400">
                    {format(new Date(txn.date), 'MMM d, yyyy')} · {txn.category.name}
                  </p>
                </div>
                <div className={`text-sm font-semibold ml-2 tabular-nums ${isExpense ? 'text-warm-gray-700 dark:text-warm-gray-300' : 'text-sage-600 dark:text-sage-400'}`}>
                  {isExpense ? '-' : '+'}
                  {formatCurrency(Math.abs(amount))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
