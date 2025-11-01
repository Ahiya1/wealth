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
import type { Transaction } from '@prisma/client'

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }),
  payee: z.string().min(1, 'Payee is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string, will be converted to array
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface TransactionFormProps {
  transaction?: Transaction & {
    category: { id: string; name: string }
    account: { id: string; name: string }
  }
  onSuccess?: () => void
}

export function TransactionForm({ transaction, onSuccess }: TransactionFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: accounts } = trpc.accounts.list.useQuery({})
  const { data: categories } = trpc.categories.list.useQuery()

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Transaction created successfully' })
      utils.transactions.list.invalidate()
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

  const updateTransaction = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Transaction updated successfully' })
      utils.transactions.list.invalidate()
      utils.transactions.get.invalidate({ id: transaction?.id })
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
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          accountId: transaction.accountId,
          date: format(new Date(transaction.date), 'yyyy-MM-dd'),
          amount: Number(transaction.amount),
          payee: transaction.payee,
          categoryId: transaction.categoryId,
          notes: transaction.notes || '',
          tags: transaction.tags.join(', '),
        }
      : {
          date: format(new Date(), 'yyyy-MM-dd'),
          amount: 0,
          tags: '',
        },
  })

  const amount = watch('amount')
  const isIncome = amount > 0

  const onSubmit = (data: TransactionFormData) => {
    const tags = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : []

    if (transaction) {
      updateTransaction.mutate({
        id: transaction.id,
        date: new Date(data.date),
        amount: data.amount,
        payee: data.payee,
        categoryId: data.categoryId,
        notes: data.notes,
        tags,
      })
    } else {
      createTransaction.mutate({
        accountId: data.accountId,
        date: new Date(data.date),
        amount: data.amount,
        payee: data.payee,
        categoryId: data.categoryId,
        notes: data.notes,
        tags,
      })
    }
  }

  const isLoading = createTransaction.isPending || updateTransaction.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!transaction && (
        <div>
          <Label htmlFor="accountId">Account</Label>
          <Select
            onValueChange={(value) => setValue('accountId', value)}
            defaultValue={watch('accountId')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.institution})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="mt-1 text-sm text-red-600">{errors.accountId.message}</p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
      </div>

      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="e.g., -45.00 for expense, 500.00 for income"
          {...register('amount', { valueAsNumber: true })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use negative amounts for expenses (e.g., -50.00), positive for income (e.g., 2000.00)
        </p>
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="payee">
          {isIncome ? 'Source' : 'Payee/Description'}
        </Label>
        <Input
          id="payee"
          {...register('payee')}
          placeholder={isIncome ? 'e.g., Salary, Freelance Client' : 'e.g., Whole Foods, Coffee Shop'}
        />
        {errors.payee && <p className="mt-1 text-sm text-red-600">{errors.payee.message}</p>}
      </div>

      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select
          onValueChange={(value) => setValue('categoryId', value)}
          defaultValue={watch('categoryId')}
        >
          <SelectTrigger>
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
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Add a note..." rows={3} />
      </div>

      <div>
        <Label htmlFor="tags">Tags (Optional)</Label>
        <Input
          id="tags"
          {...register('tags')}
          placeholder="e.g., vacation, business, gift (comma-separated)"
        />
        <p className="mt-1 text-xs text-muted-foreground">Separate multiple tags with commas</p>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        {isLoading ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
      </Button>
    </form>
  )
}
