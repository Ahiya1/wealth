// src/components/goals/GoalList.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { GoalCard } from './GoalCard'
import { GoalForm } from './GoalForm'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { type Goal } from '@prisma/client'
import { Trophy } from 'lucide-react'

interface GoalListProps {
  includeCompleted?: boolean
}

export function GoalList({ includeCompleted = false }: GoalListProps) {
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  const { data: goals, isLoading, error } = trpc.goals.list.useQuery({ includeCompleted })

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      toast.success('Goal deleted successfully')
      utils.goals.list.invalidate()
      setDeletingGoalId(null)
    },
    onError: (error) => {
      toast.error('Error deleting goal', {
        description: error.message,
      })
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-coral/20 bg-coral/10 p-4">
        <p className="text-sm text-warm-gray-800">Error loading goals: {error.message}</p>
      </div>
    )
  }

  if (!goals || goals.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No goals yet"
        description={
          includeCompleted
            ? 'Set your first financial goal and track your progress!'
            : 'Create a goal to start tracking your financial journey!'
        }
        action={null}
      />
    )
  }

  const activeGoals = goals.filter((g) => !g.isCompleted)
  const completedGoals = goals.filter((g) => g.isCompleted)

  return (
    <>
      <div className="space-y-6">
        {activeGoals.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-warm-gray-900">Active Goals</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditingGoal(goal)}
                  onDelete={() => setDeletingGoalId(goal.id)}
                />
              ))}
            </div>
          </div>
        )}

        {includeCompleted && completedGoals.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-warm-gray-900">Completed Goals</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditingGoal(goal)}
                  onDelete={() => setDeletingGoalId(goal.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <GoalForm goal={editingGoal} onSuccess={() => setEditingGoal(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={(open) => !open && setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGoalId && deleteGoal.mutate({ id: deletingGoalId })}
              loading={deleteGoal.isPending}
              className="bg-coral hover:bg-coral/90"
            >
              {deleteGoal.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
