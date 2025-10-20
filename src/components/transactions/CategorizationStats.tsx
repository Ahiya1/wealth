// Categorization statistics component - Builder-5C
'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, TrendingUp } from 'lucide-react'

/**
 * Displays AI categorization statistics
 * Shows cache hit rate and efficiency metrics
 */
export function CategorizationStats() {
  const { data: stats, isLoading } = trpc.transactions.categorizationStats.useQuery()

  if (isLoading) {
    return (
      <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5" />
            AI Categorization Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const hitRate = stats.cacheHitRate.toFixed(1)
  const hitRateColor =
    stats.cacheHitRate > 70 ? 'text-green-600 dark:text-green-400' : stats.cacheHitRate > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'

  return (
    <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5" />
          AI Categorization Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Merchants Cached</span>
          <span className="font-semibold">{stats.totalCached}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Transactions</span>
          <span className="font-semibold">{stats.totalTransactions}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${hitRateColor}`} />
            <span className={`font-semibold ${hitRateColor}`}>{hitRate}%</span>
          </div>
        </div>

        {stats.cacheHitRate > 0 && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              {stats.cacheHitRate > 70
                ? 'Excellent! Most transactions are using cached categories, minimizing API costs.'
                : stats.cacheHitRate > 40
                ? 'Good caching efficiency. API costs are being optimized.'
                : 'Consider manually categorizing common merchants to improve cache efficiency.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
