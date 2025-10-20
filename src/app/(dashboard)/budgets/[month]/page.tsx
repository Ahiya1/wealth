// src/app/(dashboard)/budgets/[month]/page.tsx
'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { BudgetList } from '@/components/budgets/BudgetList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTransition } from '@/components/ui/page-transition'
import { EncouragingProgress } from '@/components/ui/encouraging-progress'
import { ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface BudgetHistoryPageProps {
  params: Promise<{ month: string }>
}

export default function BudgetHistoryPage({ params }: BudgetHistoryPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const month = resolvedParams.month

  const { data: summary } = trpc.budgets.summary.useQuery({ month })

  const [year, monthNum] = month.split('-').map(Number)
  const monthDate = new Date(year ?? 0, (monthNum ?? 1) - 1)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/budgets')} className="hover:bg-sage-50">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to budgets</span>
          </Button>
          <h1 className="text-3xl font-serif font-bold text-sage-600">Budget History - {format(monthDate, 'MMMM yyyy')}</h1>
        </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
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
                Final Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  summary.remaining < 0 ? 'text-coral' : 'text-sage-600'
                }`}
              >
                {summary.remaining < 0 ? 'Over ' : 'Under '}
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

      <BudgetList month={month} />
      </div>
    </PageTransition>
  )
}
