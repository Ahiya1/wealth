'use client'

import { PageTransition } from '@/components/ui/page-transition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Transaction, Category, Account } from '@prisma/client'

type SerializedCategory = Omit<Category, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

type SerializedAccount = Omit<Account, 'balance' | 'createdAt' | 'updatedAt' | 'lastSynced'> & {
  balance: string
  createdAt: string
  updatedAt: string
  lastSynced: string | null
}

type SerializedTransaction = Omit<Transaction, 'amount' | 'date' | 'createdAt' | 'updatedAt'> & {
  amount: string
  date: string
  createdAt: string
  updatedAt: string
  category: SerializedCategory | null
  account: SerializedAccount
}

interface TransactionDetailClientProps {
  transaction: SerializedTransaction
}

export function TransactionDetailClient({ transaction }: TransactionDetailClientProps) {
  const isExpense = Number(transaction.amount) < 0
  const absAmount = Math.abs(Number(transaction.amount))

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600 dark:text-sage-400">Transaction Details</h1>
          </div>
        </div>

        <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
          <CardHeader>
            <CardTitle>{transaction.payee || 'Transaction'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <span className={`text-2xl font-bold tabular-nums ${isExpense ? 'text-warm-gray-700 dark:text-warm-gray-300' : 'text-sage-600 dark:text-sage-400'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(absAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{format(new Date(transaction.date), 'PPP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline">{transaction.category?.name || 'Uncategorized'}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account</span>
              <span>{transaction.account.name}</span>
            </div>
            {transaction.notes && (
              <div>
                <span className="text-muted-foreground block mb-2">Notes</span>
                <p className="text-sm">{transaction.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
