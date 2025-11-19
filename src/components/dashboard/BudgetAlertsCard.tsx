'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

export function BudgetAlertsCard() {
  const { data, isLoading } = trpc.budgets.activeAlerts.useQuery({
    month: format(new Date(), 'yyyy-MM'),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded bg-warm-gray-200 dark:bg-warm-gray-800" />
            <div className="h-20 rounded bg-warm-gray-200 dark:bg-warm-gray-800" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-sage-600" />
            <span>All budgets are on track</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Budget Alerts
          <Badge variant="secondary">{data.alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.alerts.map((alert) => {
          const variant =
            alert.threshold === 100
              ? 'destructive'
              : alert.threshold === 90
              ? 'default'
              : 'default'

          const Icon =
            alert.threshold === 100 ? XCircle : AlertTriangle

          return (
            <Alert key={alert.id} variant={variant as any} className="relative">
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <AlertTitle>
                  {alert.categoryName} Budget at {alert.percentage}%
                </AlertTitle>
                <AlertDescription>
                  You&apos;ve spent ₪{alert.spentAmount.toFixed(2)} of ₪
                  {alert.budgetAmount.toFixed(2)} ({alert.threshold}% threshold
                  exceeded)
                </AlertDescription>
              </div>
            </Alert>
          )
        })}
      </CardContent>
    </Card>
  )
}
