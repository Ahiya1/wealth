// src/components/budgets/BudgetForm.tsx
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

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category required'),
  amount: z.number().positive('Amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format'),
  rollover: z.boolean().default(false),
})

type BudgetFormData = z.infer<typeof budgetSchema>

interface BudgetFormProps {
  month: string
  onSuccess?: () => void
  existingBudget?: {
    id: string
    categoryId: string
    amount: number
    rollover: boolean
  }
}

export function BudgetForm({ month, onSuccess, existingBudget }: BudgetFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery()

  const createBudget = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget created successfully' })
      utils.budgets.invalidate()
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

  const updateBudget = trpc.budgets.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Budget updated successfully' })
      utils.budgets.invalidate()
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
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: existingBudget
      ? {
          categoryId: existingBudget.categoryId,
          amount: existingBudget.amount,
          month: month,
          rollover: existingBudget.rollover,
        }
      : {
          month: month,
          amount: 0,
          rollover: false,
        },
  })

  const onSubmit = (data: BudgetFormData) => {
    if (existingBudget) {
      updateBudget.mutate({
        id: existingBudget.id,
        amount: data.amount,
        rollover: data.rollover,
      })
    } else {
      createBudget.mutate(data)
    }
  }

  const isSubmitting = createBudget.isPending || updateBudget.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select
          onValueChange={(value) => setValue('categoryId', value)}
          defaultValue={existingBudget?.categoryId}
          disabled={!!existingBudget || categoriesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={categoriesLoading ? 'Loading...' : 'Select category'} />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Budget Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="month">Month</Label>
        <Input id="month" type="month" {...register('month')} disabled />
        {errors.month && <p className="mt-1 text-sm text-destructive">{errors.month.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="rollover"
          className="h-4 w-4 rounded border-gray-300"
          {...register('rollover')}
        />
        <Label htmlFor="rollover" className="cursor-pointer font-normal">
          Roll over unused budget to next month
        </Label>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        {isSubmitting
          ? (existingBudget ? 'Updating...' : 'Creating...')
          : (existingBudget ? 'Update Budget' : 'Create Budget')}
      </Button>
    </form>
  )
}
