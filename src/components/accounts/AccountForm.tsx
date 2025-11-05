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
import { type Account, AccountType } from '@prisma/client'
import { getAccountTypeLabel } from './AccountTypeIcon'

const accountSchema = z.object({
  type: z.nativeEnum(AccountType),
  name: z.string().min(1, 'Account name is required'),
  institution: z.string().min(1, 'Institution name is required'),
  balance: z.number().default(0),
  currency: z.string().default('NIS'),
})

type AccountFormData = z.infer<typeof accountSchema>

type SerializedAccount = Omit<Account, 'balance' | 'createdAt' | 'updatedAt' | 'lastSynced'> & {
  balance: string
  createdAt: string
  updatedAt: string
  lastSynced: string | null
}

interface AccountFormProps {
  account?: Account | SerializedAccount
  onSuccess?: () => void
}

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const createAccount = trpc.accounts.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Account created successfully' })
      utils.accounts.list.invalidate()
      utils.accounts.netWorth.invalidate()
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

  const updateAccount = trpc.accounts.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Account updated successfully' })
      utils.accounts.list.invalidate()
      utils.accounts.netWorth.invalidate()
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
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          type: account.type,
          name: account.name,
          institution: account.institution,
          balance: Number(account.balance),
          currency: account.currency,
        }
      : {
          balance: 0,
          currency: 'NIS',
        },
  })

  const onSubmit = (data: AccountFormData) => {
    if (account) {
      updateAccount.mutate({
        id: account.id,
        name: data.name,
        institution: data.institution,
        balance: data.balance,
      })
    } else {
      createAccount.mutate(data)
    }
  }

  const isLoading = createAccount.isPending || updateAccount.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="type">Account Type</Label>
        <Select
          onValueChange={(value) => setValue('type', value as AccountType)}
          defaultValue={account?.type}
          disabled={!!account}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AccountType).map((type) => (
              <SelectItem key={type} value={type}>
                {getAccountTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      <div>
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Main Checking"
          disabled={isLoading}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="institution">Institution</Label>
        <Input
          id="institution"
          {...register('institution')}
          placeholder="e.g., Chase Bank"
          disabled={isLoading}
        />
        {errors.institution && (
          <p className="mt-1 text-sm text-red-600">{errors.institution.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="balance">Current Balance</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register('balance', { valueAsNumber: true })}
          placeholder="0.00"
          disabled={isLoading}
        />
        {errors.balance && <p className="mt-1 text-sm text-red-600">{errors.balance.message}</p>}
        <p className="mt-1 text-sm text-muted-foreground">
          For credit cards, enter negative amount if you owe money (e.g., -500.00)
        </p>
      </div>

      <div>
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          value="NIS (₪)"
          disabled
          className="bg-muted"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          All accounts use NIS (Israeli Shekel)
        </p>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        {isLoading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
      </Button>
    </form>
  )
}
