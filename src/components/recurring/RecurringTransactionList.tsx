'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Pause, Play, Trash2, Calendar } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function RecurringTransactionList() {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: recurringTransactions, isLoading } = trpc.recurring.list.useQuery({})

  const pauseMutation = trpc.recurring.pause.useMutation({
    onSuccess: () => {
      toast({ title: 'Recurring transaction paused' })
      utils.recurring.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const resumeMutation = trpc.recurring.resume.useMutation({
    onSuccess: () => {
      toast({ title: 'Recurring transaction resumed' })
      utils.recurring.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Recurring transaction deleted' })
      utils.recurring.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const frequencyLabels = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Bi-weekly',
    MONTHLY: 'Monthly',
    YEARLY: 'Yearly',
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    PAUSED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    CANCELLED: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!recurringTransactions || recurringTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-warm-gray-400 mx-auto mb-4" />
          <p className="text-warm-gray-600">No recurring transactions yet</p>
          <p className="text-sm text-warm-gray-500 mt-2">
            Create one to automatically generate transactions on a schedule
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {recurringTransactions.map((recurring) => (
        <Card key={recurring.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-serif">{recurring.payee}</CardTitle>
                <p className="text-sm text-warm-gray-600 mt-1">{recurring.category.name}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xl font-semibold ${Number(recurring.amount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                >
                  {Number(recurring.amount) < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(Number(recurring.amount)))}
                </p>
                <Badge className={statusColors[recurring.status]} variant="secondary">
                  {recurring.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-warm-gray-600">Frequency</p>
                <p className="font-medium">{frequencyLabels[recurring.frequency]}</p>
              </div>
              <div>
                <p className="text-sm text-warm-gray-600">Account</p>
                <p className="font-medium">{recurring.account.name}</p>
              </div>
              <div>
                <p className="text-sm text-warm-gray-600">Next Payment</p>
                <p className="font-medium">
                  {format(new Date(recurring.nextScheduledDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-warm-gray-600">Last Generated</p>
                <p className="font-medium">
                  {recurring.lastGeneratedDate
                    ? format(new Date(recurring.lastGeneratedDate), 'MMM d, yyyy')
                    : 'Never'}
                </p>
              </div>
            </div>

            {recurring.notes && (
              <p className="text-sm text-warm-gray-600 mb-4 italic">{recurring.notes}</p>
            )}

            <div className="flex gap-2 justify-end border-t border-warm-gray-200 dark:border-warm-gray-700 pt-4">
              {recurring.status === 'ACTIVE' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pauseMutation.mutate({ id: recurring.id })}
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : recurring.status === 'PAUSED' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resumeMutation.mutate({ id: recurring.id })}
                  disabled={resumeMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to delete this recurring transaction? This will not affect already generated transactions.'
                    )
                  ) {
                    deleteMutation.mutate({ id: recurring.id })
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
