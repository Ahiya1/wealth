'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useState } from 'react'

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  payee: z.string().min(1, 'Payee is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

interface AddTransactionFormProps {
  initialData?: Partial<TransactionFormData> & { id?: string }
  accounts?: Array<{ id: string; name: string; institution: string }>
  categories?: Array<{ id: string; name: string; color?: string | null }>
  onSubmit: (data: TransactionFormData) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function AddTransactionForm({
  initialData,
  accounts = [],
  categories = [],
  onSubmit,
  onCancel,
  isSubmitting,
}: AddTransactionFormProps) {
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])

  const isEditing = !!initialData?.id

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: initialData?.accountId || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      amount: initialData?.amount || 0,
      payee: initialData?.payee || '',
      categoryId: initialData?.categoryId || '',
      notes: initialData?.notes || '',
      tags: initialData?.tags || [],
    },
  })

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag]
      setTags(newTags)
      setValue('tags', newTags)
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(newTags)
    setValue('tags', newTags)
  }

  const handleFormSubmit = (data: TransactionFormData) => {
    onSubmit({
      ...data,
      tags,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pb-20">
      {/* Account Selection */}
      <div className="space-y-2">
        <Label htmlFor="accountId">
          Account <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watch('accountId')}
          onValueChange={(value) => setValue('accountId', value)}
        >
          <SelectTrigger id="accountId">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.institution})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.accountId && (
          <p className="text-sm text-destructive">{errors.accountId.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">
          Date <span className="text-destructive">*</span>
        </Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          Amount <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            inputMode="decimal"
            className="pl-7"
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter positive for income, negative for expenses
        </p>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Payee */}
      <div className="space-y-2">
        <Label htmlFor="payee">
          Payee <span className="text-destructive">*</span>
        </Label>
        <Input
          id="payee"
          placeholder="e.g., Whole Foods, Netflix, Salary"
          {...register('payee')}
        />
        {errors.payee && <p className="text-sm text-destructive">{errors.payee.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="categoryId">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watch('categoryId')}
          onValueChange={(value) => setValue('categoryId', value)}
        >
          <SelectTrigger id="categoryId">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  {category.color && (
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-sm text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes about this transaction..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tagInput">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tagInput"
            placeholder="Add a tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 rounded-full hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="sticky bottom-4 pt-4 border-t bg-background">
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-initial">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Transaction' : 'Create Transaction'}
          </Button>
        </div>
      </div>
    </form>
  )
}
