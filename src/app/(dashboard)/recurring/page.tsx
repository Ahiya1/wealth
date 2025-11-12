'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { RecurringTransactionForm } from '@/components/recurring/RecurringTransactionForm'
import { RecurringTransactionList } from '@/components/recurring/RecurringTransactionList'
import { trpc } from '@/lib/trpc'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function RecurringTransactionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  // Fetch all recurring transactions for export count
  const { data: recurringTransactions } = trpc.recurring.list.useQuery({})
  const recurringCount = recurringTransactions?.length || 0

  // Export logic
  const exportMutation = trpc.exports.exportRecurringTransactions.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({ format }),
    dataType: 'recurring',
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-warm-gray-900">
              Recurring Transactions
            </h1>
            <p className="text-warm-gray-600 mt-2 leading-relaxed">
              Manage automatic recurring income and expenses
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-sage-600 hover:bg-sage-700">
            <Plus className="mr-2" size={16} />
            New Recurring Transaction
          </Button>
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
            recordCount={recurringCount}
          >
            Export Recurring Transactions
          </ExportButton>
        </div>

        <RecurringTransactionList />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recurring Transaction</DialogTitle>
              <DialogDescription>
                Set up a transaction that automatically generates on a schedule (e.g., monthly rent,
                weekly paycheck, annual subscription).
              </DialogDescription>
            </DialogHeader>
            <RecurringTransactionForm onSuccess={handleCloseDialog} />
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
