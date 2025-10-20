'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardHover } from '@/lib/animations'

interface StatCardProps {
  title: string
  value: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon: LucideIcon
  variant?: 'default' | 'elevated'
  className?: string
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <motion.div {...cardHover}>
      <Card
        className={cn(
          'transition-all duration-300',
          variant === 'elevated' &&
            'bg-gradient-to-br from-sage-50 to-warm-gray-50 dark:from-warm-gray-900 dark:to-warm-gray-800 border-sage-200 dark:border-warm-gray-600 rounded-warmth',
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-warm-gray-600 dark:text-warm-gray-400">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-sage-500 dark:text-sage-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-sans tabular-nums text-warm-gray-900 dark:text-warm-gray-100">
            {value}
          </div>

          {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-sage-600 dark:text-sage-400" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-4 w-4 text-warm-gray-500 dark:text-warm-gray-400" />
              ) : null}
              <span
                className={cn(
                  trend.direction === 'up' && 'text-sage-600 dark:text-sage-400',
                  trend.direction === 'down' && 'text-warm-gray-600 dark:text-warm-gray-400',
                  trend.direction === 'neutral' && 'text-warm-gray-500 dark:text-warm-gray-400'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
