// src/components/budgets/BudgetList.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { BudgetCard } from './BudgetCard'
import { BudgetForm } from './BudgetForm'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Target, Plus } from 'lucide-react'

interface BudgetListProps {
  month: string
  onAddBudget?: () => void
}

export function BudgetList({ month, onAddBudget }: BudgetListProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null)

  const { data, isLoading, error } = trpc.budgets.progress.useQuery({ month })
  const { data: budgetsList } = trpc.budgets.listByMonth.useQuery({ month })

  const deleteBudget = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget deleted successfully' })
      utils.budgets.invalidate()
      setDeletingBudgetId(null)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleEdit = (budgetId: string) => {
    setEditingBudgetId(budgetId)
  }

  const handleDelete = (budgetId: string) => {
    setDeletingBudgetId(budgetId)
  }

  const confirmDelete = () => {
    if (deletingBudgetId) {
      deleteBudget.mutate({ id: deletingBudgetId })
    }
  }

  const getEditingBudget = () => {
    if (!editingBudgetId || !budgetsList) return null
    return budgetsList.find((b) => b.id === editingBudgetId)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Error loading budgets: {error.message}</p>
      </div>
    )
  }

  if (!data?.budgets || data.budgets.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Let's set your first budget!"
        description="Create spending limits for your categories to stay mindful of your financial goals"
        action={
          onAddBudget && (
            <Button onClick={onAddBudget} className="bg-sage-600 hover:bg-sage-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          )
        }
      />
    )
  }

  const editingBudget = getEditingBudget()

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBudgetId} onOpenChange={(open) => !open && setEditingBudgetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>Update the budget amount or rollover setting</DialogDescription>
          </DialogHeader>
          {editingBudget && (
            <BudgetForm
              month={month}
              existingBudget={{
                id: editingBudget.id,
                categoryId: editingBudget.categoryId,
                amount: Number(editingBudget.amount),
                rollover: editingBudget.rollover,
              }}
              onSuccess={() => setEditingBudgetId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingBudgetId}
        onOpenChange={(open) => !open && setDeletingBudgetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              loading={deleteBudget.isPending}
              className="bg-coral text-white hover:bg-coral/90"
            >
              {deleteBudget.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
