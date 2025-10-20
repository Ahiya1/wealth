// src/components/goals/GoalDetailPageClient.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GoalForm } from './GoalForm'
import { GoalProgressChart } from './GoalProgressChart'
import { CompletedGoalCelebration } from './CompletedGoalCelebration'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageTransition } from '@/components/ui/page-transition'
import { formatCurrency } from '@/lib/utils'
import { formatDate, formatDistance } from 'date-fns'
import { PiggyBank, TrendingDown, TrendingUp, Calendar, Target, TrendingUpIcon, Edit, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

const GOAL_TYPE_CONFIG = {
  SAVINGS: {
    icon: PiggyBank,
    color: 'hsl(142, 76%, 36%)',
    label: 'Savings Goal',
  },
  DEBT_PAYOFF: {
    icon: TrendingDown,
    color: 'hsl(0, 72%, 51%)',
    label: 'Debt Payoff',
  },
  INVESTMENT: {
    icon: TrendingUp,
    color: 'hsl(217, 91%, 60%)',
    label: 'Investment Goal',
  },
}

export function GoalDetailPageClient({ goalId }: { goalId: string }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [manualProgressAmount, setManualProgressAmount] = useState('')
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: goal, isLoading: goalLoading } = trpc.goals.get.useQuery({ id: goalId })
  const { data: projections, isLoading: projectionsLoading } = trpc.goals.projections.useQuery(
    { goalId },
    { enabled: !!goal }
  )

  const updateProgress = trpc.goals.updateProgress.useMutation({
    onSuccess: (data) => {
      if (data.isCompleted && !goal?.isCompleted) {
        setCelebrationOpen(true)
      }
      toast({ title: 'Progress updated successfully' })
      utils.goals.get.invalidate({ id: goalId })
      utils.goals.projections.invalidate({ goalId })
      utils.goals.list.invalidate()
      setManualProgressAmount('')
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (goalLoading || projectionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!goal || !projections) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Goal not found</p>
      </div>
    )
  }

  const config = GOAL_TYPE_CONFIG[goal.type]
  const Icon = config.icon

  const handleUpdateProgress = () => {
    const amount = parseFloat(manualProgressAmount)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      })
      return
    }
    updateProgress.mutate({ goalId: goal.id, currentAmount: amount })
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/goals">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{goal.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Icon className="h-4 w-4" style={{ color: config.color }} />
                <p className="text-muted-foreground">{config.label}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Goal
          </Button>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatCurrency(Number(goal.currentAmount))} of {formatCurrency(Number(goal.targetAmount))}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {projections.percentComplete.toFixed(0)}%
                </span>
              </div>
              <Progress value={projections.percentComplete} className="h-3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold">{formatCurrency(projections.remaining)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Left</p>
                <p className="text-lg font-semibold">
                  {projections.daysUntilTarget > 0 ? projections.daysUntilTarget : 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Target Date</p>
                <p className="text-lg font-semibold">{formatDate(goal.targetDate, 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {goal.isCompleted ? (
                  <Badge className="bg-green-600">Completed</Badge>
                ) : projections.daysUntilTarget < 0 ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge>In Progress</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Projections */}
          <Card>
            <CardHeader>
              <CardTitle>Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projections.projectedDate ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Projected Completion</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDate(projections.projectedDate, 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDistance(projections.projectedDate, new Date(), { addSuffix: true })}
                  </p>
                  <div className="mt-3">
                    {projections.onTrack ? (
                      <Badge className="bg-green-600">On Track</Badge>
                    ) : (
                      <Badge variant="destructive">Behind Schedule</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    {goal.linkedAccountId
                      ? 'No recent deposits detected. Start saving to see projections.'
                      : 'Link an account to see automatic projections based on your savings rate.'}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Suggested Monthly Contribution</p>
                </div>
                <p className="text-lg font-semibold">
                  {formatCurrency(projections.suggestedMonthlyContribution)}
                </p>
              </div>

              {projections.dailySavingsRate > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Current Savings Rate</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(projections.dailySavingsRate * 30)}/month
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Update Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Update Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manualProgress">Current Amount</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="manualProgress"
                    type="number"
                    step="0.01"
                    placeholder={String(Number(goal.currentAmount))}
                    value={manualProgressAmount}
                    onChange={(e) => setManualProgressAmount(e.target.value)}
                  />
                  <Button
                    onClick={handleUpdateProgress}
                    disabled={updateProgress.isPending}
                  >
                    {updateProgress.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter the current amount saved towards this goal
                </p>
              </div>

              {goal.linkedAccount && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Linked Account:</strong> {goal.linkedAccount.name}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Balance: {formatCurrency(Number(goal.linkedAccount.balance))}
                  </p>
                </div>
              )}

              {goal.isCompleted && (
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-700">
                    Goal completed on {formatDate(goal.completedAt || new Date(), 'MMM d, yyyy')}!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalProgressChart
              currentAmount={Number(goal.currentAmount)}
              targetAmount={Number(goal.targetAmount)}
              projectedDate={projections.projectedDate}
              targetDate={goal.targetDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalForm goal={goal} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Celebration Dialog */}
      <CompletedGoalCelebration
        goal={goal}
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
      />
    </PageTransition>
  )
}
