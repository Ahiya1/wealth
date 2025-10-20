'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function FinancialHealthIndicator() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const { data, isLoading } = trpc.budgets.progress.useQuery({ month: currentMonth })

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />
  }

  const budgets = data?.budgets || []
  const budgetCount = budgets.length

  // Calculate overall health
  const onTrack = budgets.filter((b) => b.status === 'good').length
  const warning = budgets.filter((b) => b.status === 'warning').length
  const over = budgets.filter((b) => b.status === 'over').length

  // Determine supportive message and color (sage tones only, no red/green)
  let healthMessage = 'No budgets set'
  let healthColor = 'text-warm-gray-600 dark:text-warm-gray-400'
  let gaugePercentage = 0

  if (budgetCount > 0) {
    gaugePercentage = (onTrack / budgetCount) * 100
    if (gaugePercentage >= 75) {
      healthMessage = 'Looking good'
      healthColor = 'text-sage-600 dark:text-sage-400'
    } else if (gaugePercentage >= 50) {
      healthMessage = 'Making progress'
      healthColor = 'text-sage-500 dark:text-sage-400'
    } else {
      healthMessage = 'Needs attention'
      healthColor = 'text-warm-gray-600 dark:text-warm-gray-400'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 dark:from-warm-gray-900 dark:to-warm-gray-800 shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600 rounded-warmth">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">Financial Health</CardTitle>
        <Target className="h-5 w-5 text-sage-500 dark:text-sage-400" />
      </CardHeader>
      <CardContent>
        {budgetCount === 0 ? (
          <div className="text-center py-4">
            <p className="text-warm-gray-600 dark:text-warm-gray-400 mb-3 leading-relaxed">
              Set budgets to track your financial health
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/budgets">Create Budget</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Circular Gauge (SVG-based) */}
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg className="transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className="stroke-warm-gray-200 dark:stroke-warm-gray-700"
                  strokeWidth="8"
                />
                {/* Progress circle (sage tone only, no red/green) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className="stroke-sage-500 dark:stroke-sage-400"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 40 * (1 - gaugePercentage / 100)
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-100 font-sans tabular-nums">
                  {onTrack}/{budgetCount}
                </span>
              </div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <p className={`text-lg font-semibold ${healthColor} leading-relaxed`}>
                {healthMessage}
              </p>
              <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-1 leading-relaxed">
                {onTrack} of {budgetCount} budgets on track
              </p>
              {(warning > 0 || over > 0) && (
                <p className="text-xs text-warm-gray-500 dark:text-warm-gray-500 mt-1 leading-relaxed">
                  {warning > 0 && `${warning} approaching limit`}
                  {warning > 0 && over > 0 && ' · '}
                  {over > 0 && `${over} need attention`}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
