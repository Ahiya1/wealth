'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth } from 'date-fns'
import { PageTransition } from '@/components/ui/page-transition'
import { TransactionList } from './TransactionList'
import { TransactionForm } from './TransactionForm'
import { RecurringTransactionForm } from '@/components/recurring/RecurringTransactionForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Repeat, Calendar } from 'lucide-react'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'
import { trpc } from '@/lib/trpc'

export function TransactionListPageClient() {
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false)

  // Date range filter state (defaults to current month for export)
  const [startDate] = useState(startOfMonth(new Date()))
  const [endDate] = useState(endOfMonth(new Date()))

  // Get transaction count for export preview
  // We'll use a simple query to get the count without fetching all data
  const { data: transactionList } = trpc.transactions.list.useInfiniteQuery(
    {
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  // Calculate total transaction count from loaded pages
  // Note: This is an approximation based on currently loaded transactions
  // The actual export will fetch ALL transactions from the server
  const transactionCount = transactionList?.pages.reduce(
    (total, page) => total + page.transactions.length,
    0
  ) || 0

  // Export mutation
  const exportMutation = trpc.exports.exportTransactions.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({
      format,
      startDate,
      endDate,
    }),
    dataType: 'transactions',
  })

  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600 dark:text-sage-400">Transactions</h1>
            <p className="mt-2 text-warm-gray-700 dark:text-warm-gray-300">
              View and manage all your transactions
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/recurring')}
              className="border-sage-300 text-sage-700 hover:bg-sage-50"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Manage Recurring
            </Button>

            <Dialog open={isAddRecurringDialogOpen} onOpenChange={setIsAddRecurringDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                  <Repeat className="mr-2 h-4 w-4" />
                  Add Recurring
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Recurring Transaction</DialogTitle>
                </DialogHeader>
                <RecurringTransactionForm onSuccess={() => setIsAddRecurringDialogOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-sage-600 hover:bg-sage-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <TransactionForm onSuccess={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Export Section */}
        <div className="flex items-center gap-3 flex-wrap">
          <FormatSelector
            value={exportHook.format}
            onChange={exportHook.setFormat}
            disabled={exportHook.isLoading}
          />

          <ExportButton
            onClick={exportHook.handleExport}
            loading={exportHook.isLoading}
            recordCount={transactionCount}
          >
            Export Transactions
          </ExportButton>

          {transactionCount === 0 && (
            <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
              No transactions to export
            </p>
          )}
        </div>

        <TransactionList />
      </div>
    </PageTransition>
  )
}
