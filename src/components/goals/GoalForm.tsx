// src/components/goals/GoalForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { type Goal } from '@prisma/client'

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative'),
  targetDate: z.string().min(1, 'Target date is required'),
  linkedAccountId: z.string().optional(),
  type: z.enum(['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT']),
})

type GoalFormData = z.infer<typeof goalSchema>

interface GoalFormProps {
  goal?: Goal
  onSuccess?: () => void
}

export function GoalForm({ goal, onSuccess }: GoalFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: accounts } = trpc.accounts.list.useQuery({})

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Goal created successfully' })
      utils.goals.list.invalidate()
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Goal updated successfully' })
      utils.goals.list.invalidate()
      utils.goals.get.invalidate({ id: goal?.id })
      utils.goals.projections.invalidate({ goalId: goal?.id })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          targetAmount: Number(goal.targetAmount),
          currentAmount: Number(goal.currentAmount),
          targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
          linkedAccountId: goal.linkedAccountId || undefined,
          type: goal.type,
        }
      : {
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          targetDate: '',
          type: 'SAVINGS',
        },
  })

  const goalType = watch('type')

  const onSubmit = (data: GoalFormData) => {
    if (goal) {
      updateGoal.mutate({
        id: goal.id,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        targetDate: new Date(data.targetDate),
        linkedAccountId: data.linkedAccountId || undefined,
        type: data.type,
      })
    } else {
      createGoal.mutate({
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        targetDate: new Date(data.targetDate),
        linkedAccountId: data.linkedAccountId,
        type: data.type,
      })
    }
  }

  const isLoading = createGoal.isPending || updateGoal.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Goal Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Emergency Fund, Down Payment, Pay off Credit Card"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="type">Goal Type</Label>
        <Select onValueChange={(value) => setValue('type', value as 'SAVINGS' | 'DEBT_PAYOFF')} defaultValue={goalType}>
          <SelectTrigger>
            <SelectValue placeholder="Select goal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SAVINGS">Savings Goal</SelectItem>
            <SelectItem value="DEBT_PAYOFF">Debt Payoff</SelectItem>
            <SelectItem value="INVESTMENT">Investment Goal</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="targetAmount">Target Amount</Label>
          <Input
            id="targetAmount"
            type="number"
            step="0.01"
            {...register('targetAmount', { valueAsNumber: true })}
            placeholder="10000.00"
          />
          {errors.targetAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.targetAmount.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currentAmount">Current Amount</Label>
          <Input
            id="currentAmount"
            type="number"
            step="0.01"
            {...register('currentAmount', { valueAsNumber: true })}
            placeholder="0.00"
          />
          {errors.currentAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.currentAmount.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="targetDate">Target Date</Label>
        <Input id="targetDate" type="date" {...register('targetDate')} />
        {errors.targetDate && (
          <p className="mt-1 text-sm text-red-600">{errors.targetDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="linkedAccountId">Linked Account (Optional)</Label>
        <Select
          onValueChange={(value) => setValue('linkedAccountId', value === 'none' ? undefined : value)}
          defaultValue={goal?.linkedAccountId || 'none'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No linked account</SelectItem>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.institution})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Link to an account to track savings rate and get better projections
        </p>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        {isLoading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
      </Button>
    </form>
  )
}
