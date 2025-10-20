'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { trpc } from '@/lib/trpc'
import { TransactionCard } from './TransactionCard'
import { TransactionForm } from './TransactionForm'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Receipt, Plus } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface TransactionListProps {
  accountId?: string
  categoryId?: string
  limit?: number
}

export function TransactionList({ accountId, categoryId, limit = 50 }: TransactionListProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.transactions.list.useInfiniteQuery(
      {
        accountId,
        categoryId,
        limit,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    )

  const deleteTransaction = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Transaction deleted successfully' })
      utils.transactions.list.invalidate()
      setDeletingTransaction(null)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const transactions = data?.pages.flatMap((page) => page.transactions) ?? []

  const transactionToEdit = transactions.find((t) => t.id === editingTransaction)
  const transactionToDelete = transactions.find((t) => t.id === deletingTransaction)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-coral/20 bg-coral/10 p-4">
        <p className="text-sm text-coral">Error loading transactions: {error.message}</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <>
        <EmptyState
          icon={Receipt}
          title="Start tracking your first transaction!"
          description="Begin your mindful money journey by adding a transaction or connecting your account"
          action={
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-sage-600 hover:bg-sage-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          }
        />

        {/* Add Transaction Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {transactions.map((transaction) => (
          <motion.div key={transaction.id} variants={staggerItem}>
            <TransactionCard
              transaction={transaction}
              onEdit={() => setEditingTransaction(transaction.id)}
              onDelete={() => setDeletingTransaction(transaction.id)}
            />
          </motion.div>
        ))}

        {hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="border-warm-gray-200 hover:bg-warm-gray-50"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {transactionToEdit && (
            <TransactionForm
              transaction={transactionToEdit}
              onSuccess={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the transaction &quot;{transactionToDelete?.payee}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTransaction) {
                  deleteTransaction.mutate({ id: deletingTransaction })
                }
              }}
              loading={deleteTransaction.isPending}
              className="bg-coral hover:bg-coral/90"
            >
              {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
