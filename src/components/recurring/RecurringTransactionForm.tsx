'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

const recurringTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }),
  payee: z.string().min(1, 'Payee is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().min(1).default(1),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  dayOfMonth: z.number().min(-1).max(31).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
})

type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>

interface RecurringTransactionFormProps {
  onSuccess?: () => void
}

export function RecurringTransactionForm({ onSuccess }: RecurringTransactionFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: accounts } = trpc.accounts.list.useQuery({})
  const { data: categories } = trpc.categories.list.useQuery()

  const createRecurring = trpc.recurring.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Recurring transaction created successfully' })
      utils.recurring.list.invalidate()
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecurringTransactionFormData>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      frequency: 'MONTHLY',
      interval: 1,
    },
  })

  const frequency = watch('frequency')
  const amount = watch('amount')
  const isIncome = amount > 0

  const onSubmit = async (data: RecurringTransactionFormData) => {
    const payload = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      tags: [],
    }

    createRecurring.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Account */}
      <div className="space-y-2">
        <Label htmlFor="accountId">Account</Label>
        <Select onValueChange={(value) => setValue('accountId', value)}>
          <SelectTrigger id="accountId">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.accountId && (
          <p className="text-sm text-red-500">{errors.accountId.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          placeholder="Use negative for expenses (e.g., -50.00), positive for income (e.g., 2000.00)"
        />
        <p className="text-xs text-muted-foreground">
          Use negative amounts for expenses (e.g., -50.00), positive for income (e.g., 2000.00)
        </p>
        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
      </div>

      {/* Payee/Source */}
      <div className="space-y-2">
        <Label htmlFor="payee">
          {isIncome ? 'Source' : 'Payee'}
        </Label>
        <Input
          id="payee"
          {...register('payee')}
          placeholder={isIncome ? 'e.g., Salary, Freelance Client' : 'e.g., Netflix, Rent'}
        />
        {errors.payee && <p className="text-sm text-red-500">{errors.payee.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <Select onValueChange={(value) => setValue('categoryId', value)}>
          <SelectTrigger id="categoryId">
            <SelectValue placeholder="Select category" />
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
          <p className="text-sm text-red-500">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select
          defaultValue="MONTHLY"
          onValueChange={(value) => setValue('frequency', value as 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY')}
        >
          <SelectTrigger id="frequency">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="YEARLY">Yearly</SelectItem>
          </SelectContent>
        </Select>
        {errors.frequency && (
          <p className="text-sm text-red-500">{errors.frequency.message}</p>
        )}
      </div>

      {/* Start Date */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <Input id="startDate" type="date" {...register('startDate')} />
        {errors.startDate && (
          <p className="text-sm text-red-500">{errors.startDate.message}</p>
        )}
      </div>

      {/* End Date (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="endDate">End Date (Optional)</Label>
        <Input id="endDate" type="date" {...register('endDate')} />
        <p className="text-xs text-warm-gray-600">Leave blank for no end date</p>
        {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
      </div>

      {/* Day of Month (for MONTHLY) */}
      {frequency === 'MONTHLY' && (
        <div className="space-y-2">
          <Label htmlFor="dayOfMonth">Day of Month (Optional)</Label>
          <Input
            id="dayOfMonth"
            type="number"
            min="-1"
            max="31"
            {...register('dayOfMonth', { valueAsNumber: true })}
            placeholder="e.g., 1-31, or -1 for last day"
          />
          <p className="text-xs text-warm-gray-600">
            Leave blank to use start date&apos;s day. Use -1 for last day of month.
          </p>
          {errors.dayOfMonth && (
            <p className="text-sm text-red-500">{errors.dayOfMonth.message}</p>
          )}
        </div>
      )}

      {/* Day of Week (for WEEKLY/BIWEEKLY) */}
      {(frequency === 'WEEKLY' || frequency === 'BIWEEKLY') && (
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">Day of Week (Optional)</Label>
          <Select onValueChange={(value) => setValue('dayOfWeek', parseInt(value))}>
            <SelectTrigger id="dayOfWeek">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-warm-gray-600">
            Leave blank to use start date&apos;s day of week.
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={createRecurring.isPending}
          className="bg-sage-600 hover:bg-sage-700"
        >
          {createRecurring.isPending ? 'Creating...' : 'Create Recurring Transaction'}
        </Button>
      </div>
    </form>
  )
}
