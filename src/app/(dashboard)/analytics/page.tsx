'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/ui/page-transition'
import { EmptyState } from '@/components/ui/empty-state'
import { trpc } from '@/lib/trpc'
import { ChartSkeleton } from '@/components/analytics/skeletons/ChartSkeleton'
import { subMonths, startOfMonth, endOfMonth, endOfDay, format } from 'date-fns'
import { Download, TrendingUp } from 'lucide-react'
import { generateTransactionCSV, downloadCSV } from '@/lib/csvExport'
import { toast } from 'sonner'

// Dynamic import charts with custom skeleton
const SpendingByCategoryChart = dynamic(
  () => import('@/components/analytics/SpendingByCategoryChart').then(mod => ({ default: mod.SpendingByCategoryChart })),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

const NetWorthChart = dynamic(
  () => import('@/components/analytics/NetWorthChart').then(mod => ({ default: mod.NetWorthChart })),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

const MonthOverMonthChart = dynamic(
  () => import('@/components/analytics/MonthOverMonthChart').then(mod => ({ default: mod.MonthOverMonthChart })),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

const SpendingTrendsChart = dynamic(
  () => import('@/components/analytics/SpendingTrendsChart').then(mod => ({ default: mod.SpendingTrendsChart })),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

const IncomeSourcesChart = dynamic(
  () => import('@/components/analytics/IncomeSourcesChart').then(mod => ({ default: mod.IncomeSourcesChart })),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(subMonths(new Date(), 5)),
    endDate: endOfDay(endOfMonth(new Date())), // Fix: Include last day of month (23:59:59.999)
  })

  // Fetch analytics data
  const { data: spendingByCategory, isLoading: loadingCategory } = trpc.analytics.spendingByCategory.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: spendingTrends, isLoading: loadingTrends } = trpc.analytics.spendingTrends.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy: 'month',
  })

  const { data: monthOverMonth, isLoading: loadingMoM } = trpc.analytics.monthOverMonth.useQuery({
    months: 6,
  })

  const { data: incomeSources, isLoading: _loadingIncome } = trpc.analytics.incomeBySource.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: netWorthHistory, isLoading: loadingNetWorth } = trpc.analytics.netWorthHistory.useQuery()

  // Fetch transactions for export
  const { data: transactions } = trpc.transactions.list.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 1000,
  })

  const handleExportCSV = () => {
    if (!transactions?.transactions || transactions.transactions.length === 0) {
      toast.error('No data to export', {
        description: 'There are no transactions in the selected date range.',
      })
      return
    }

    const csvContent = generateTransactionCSV(transactions.transactions)
    const filename = `transactions-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`
    downloadCSV(csvContent, filename)

    toast.success('Export successful', {
      description: `Downloaded ${transactions.transactions.length} transactions`,
    })
  }

  const handleSetLast30Days = () => {
    setDateRange({
      startDate: startOfMonth(subMonths(new Date(), 0)),
      endDate: endOfDay(endOfMonth(new Date())),
    })
  }

  const handleSetLast6Months = () => {
    setDateRange({
      startDate: startOfMonth(subMonths(new Date(), 5)),
      endDate: endOfDay(endOfMonth(new Date())),
    })
  }

  const handleSetLastYear = () => {
    setDateRange({
      startDate: startOfMonth(subMonths(new Date(), 11)),
      endDate: endOfDay(endOfMonth(new Date())),
    })
  }

  // Check if we have any data at all
  const hasData = (spendingByCategory && spendingByCategory.length > 0) ||
    (spendingTrends && spendingTrends.length > 0) ||
    (monthOverMonth && monthOverMonth.length > 0) ||
    (netWorthHistory && netWorthHistory.length > 0)

  const isLoading = loadingCategory || loadingTrends || loadingMoM || loadingNetWorth

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600">Analytics</h1>
            <p className="text-warm-gray-700">Visualize your spending patterns and trends</p>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-sage-200 hover:bg-sage-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {!isLoading && !hasData ? (
          <EmptyState
            icon={TrendingUp}
            title="No analytics data yet"
            description="Track some transactions to see insights about your spending patterns!"
            action={null}
          />
        ) : (
          <>
            {/* Date Range Selector */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-warm-gray-900">Date Range</CardTitle>
                <CardDescription className="text-warm-gray-600">Select the period you want to analyze</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant={dateRange.startDate.getMonth() === new Date().getMonth() ? 'default' : 'outline'}
                    onClick={handleSetLast30Days}
                    className={dateRange.startDate.getMonth() === new Date().getMonth() ? 'bg-sage-600 hover:bg-sage-700' : 'border-sage-200 hover:bg-sage-50'}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={dateRange.startDate.getMonth() === subMonths(new Date(), 5).getMonth() ? 'default' : 'outline'}
                    onClick={handleSetLast6Months}
                    className={dateRange.startDate.getMonth() === subMonths(new Date(), 5).getMonth() ? 'bg-sage-600 hover:bg-sage-700' : 'border-sage-200 hover:bg-sage-50'}
                  >
                    Last 6 Months
                  </Button>
                  <Button
                    variant={dateRange.startDate.getMonth() === subMonths(new Date(), 11).getMonth() ? 'default' : 'outline'}
                    onClick={handleSetLastYear}
                    className={dateRange.startDate.getMonth() === subMonths(new Date(), 11).getMonth() ? 'bg-sage-600 hover:bg-sage-700' : 'border-sage-200 hover:bg-sage-50'}
                  >
                    Last Year
                  </Button>
                </div>
                <p className="text-sm text-warm-gray-600 mt-2">
                  Showing data from {format(dateRange.startDate, 'MMM d, yyyy')} to {format(dateRange.endDate, 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>

            {/* Insight Card */}
            {!isLoading && hasData && monthOverMonth && monthOverMonth.length >= 2 && (
              <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sage-100 p-2">
                      <TrendingUp className="h-5 w-5 text-sage-600" />
                    </div>
                    <div>
                      <p className="font-serif text-lg text-warm-gray-900 mb-1">You&apos;re doing great!</p>
                      <p className="text-warm-gray-700">Keep tracking your transactions to gain deeper insights into your spending patterns.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Net Worth Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-warm-gray-900">Net Worth</CardTitle>
                <CardDescription className="text-warm-gray-600">Your total net worth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <NetWorthChart data={netWorthHistory || []} />
              </CardContent>
            </Card>

            {/* Month-over-Month Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-warm-gray-900">Income vs Expenses</CardTitle>
                <CardDescription className="text-warm-gray-600">Month-over-month comparison of income and expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthOverMonthChart data={monthOverMonth || []} />
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Spending by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-warm-gray-900">Spending by Category</CardTitle>
                  <CardDescription className="text-warm-gray-600">Where your money goes</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendingByCategoryChart data={spendingByCategory || []} />
                </CardContent>
              </Card>

              {/* Income Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-warm-gray-900">Income Sources</CardTitle>
                  <CardDescription className="text-warm-gray-600">Where your income comes from</CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomeSourcesChart data={incomeSources || []} />
                </CardContent>
              </Card>
            </div>

            {/* Spending Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-warm-gray-900">Spending Trends</CardTitle>
                <CardDescription className="text-warm-gray-600">Your spending over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendingTrendsChart data={spendingTrends || []} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  )
}
