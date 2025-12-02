'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface UpcomingBillsProps {
  days?: number
}

export function UpcomingBills({ days = 30 }: UpcomingBillsProps) {
  const { data: upcomingTransactions, isLoading } = trpc.recurring.getUpcoming.useQuery({ days })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">Upcoming Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-warm-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!upcomingTransactions || upcomingTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">Upcoming Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-warm-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming bills in the next {days} days</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const today = new Date()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">Upcoming Bills</CardTitle>
        <Link href="/recurring">
          <Button variant="ghost" size="sm" className="text-sage-700 hover:text-sage-800">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingTransactions.slice(0, 5).map((recurring) => {
            const daysUntil = differenceInDays(
              new Date(recurring.nextScheduledDate),
              startOfDay(today)
            )
            const isOverdue = daysUntil < 0
            const isDueToday = daysUntil === 0
            const isDueSoon = daysUntil > 0 && daysUntil <= 7

            function startOfDay(date: Date) {
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              return d
            }

            return (
              <div
                key={recurring.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isOverdue
                    ? 'border-red-200 bg-red-50'
                    : isDueToday
                      ? 'border-orange-200 bg-orange-50'
                      : isDueSoon
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-warm-gray-200 bg-warm-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isOverdue
                        ? 'bg-red-100'
                        : isDueToday
                          ? 'bg-orange-100'
                          : isDueSoon
                            ? 'bg-yellow-100'
                            : 'bg-warm-gray-200'
                    }`}
                  >
                    <DollarSign
                      className={`h-5 w-5 ${
                        isOverdue
                          ? 'text-red-600'
                          : isDueToday
                            ? 'text-orange-600'
                            : isDueSoon
                              ? 'text-yellow-600'
                              : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{recurring.payee}</p>
                    <p className="text-sm text-muted-foreground">
                      {isOverdue
                        ? `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`
                        : isDueToday
                          ? 'Due today'
                          : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${Number(recurring.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {Number(recurring.amount) < 0 ? '-' : '+'}
                    {formatCurrency(Math.abs(Number(recurring.amount)))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(recurring.nextScheduledDate), 'MMM d')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {upcomingTransactions.length > 5 && (
          <Link href="/recurring">
            <Button variant="outline" className="w-full mt-4" size="sm">
              View All {upcomingTransactions.length} Upcoming Bills
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
