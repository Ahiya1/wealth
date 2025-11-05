'use client'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, TrendingDown, Wallet, Target, Plus } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'

export function DashboardStats() {
  const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    )
  }

  // Check if user has any data (check for record existence, not values)
  const hasData = data && data.recentTransactions.length > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={Wallet}
        title="Start tracking your finances"
        description="Add your first account or transaction to see your financial dashboard come to life."
        action={
          <div className="flex gap-3">
            <Button asChild className="bg-sage-600 dark:bg-sage-500 hover:bg-sage-700 dark:hover:bg-sage-600">
              <Link href="/accounts">
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/transactions">
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </>
              </Link>
            </Button>
          </div>
        }
      />
    )
  }

  // Calculate metrics
  const netWorth = data?.netWorth || 0
  const income = data?.income || 0
  const expenses = data?.expenses || 0
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Net Worth */}
      <motion.div variants={staggerItem}>
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth)}
          trend={
            netWorth >= 0
              ? { value: 'Total across all accounts', direction: 'neutral' as const }
              : undefined
          }
          icon={DollarSign}
          variant="elevated"
        />
      </motion.div>

      {/* Monthly Income */}
      <motion.div variants={staggerItem}>
        <StatCard
          title="Monthly Income"
          value={formatCurrency(income)}
          trend={
            income > 0
              ? { value: 'This month', direction: 'up' as const }
              : { value: 'No income this month', direction: 'neutral' as const }
          }
          icon={TrendingUp}
        />
      </motion.div>

      {/* Monthly Expenses */}
      <motion.div variants={staggerItem}>
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(expenses)}
          trend={
            expenses > 0
              ? { value: 'This month', direction: 'neutral' as const }
              : { value: 'No expenses this month', direction: 'neutral' as const }
          }
          icon={TrendingDown}
        />
      </motion.div>

      {/* Savings Rate */}
      <motion.div variants={staggerItem}>
        <StatCard
          title="Savings Rate"
          value={`${Math.round(savingsRate)}%`}
          trend={
            savingsRate > 0
              ? {
                  value: `${formatCurrency(income - expenses)} saved`,
                  direction: 'up' as const,
                }
              : savingsRate < 0
              ? {
                  value: 'Spending more than earning',
                  direction: 'down' as const,
                }
              : { value: 'Breaking even', direction: 'neutral' as const }
          }
          icon={Target}
        />
      </motion.div>
    </motion.div>
  )
}
