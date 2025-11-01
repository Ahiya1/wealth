'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export function TransactionListPageClient() {
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600 dark:text-sage-400">Transactions</h1>
            <p className="mt-2 text-warm-gray-700 dark:text-warm-gray-300">
              View and manage all your transactions
            </p>
          </div>

          <div className="flex gap-2">
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

        <TransactionList />
      </div>
    </PageTransition>
  )
}
