'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CreditCard, FolderOpen, FileText, Tag, Edit, Trash2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

export interface TransactionDetailData {
  id: string
  date: Date
  payee: string
  amount: number
  category: {
    id: string
    name: string
    color?: string | null
    icon?: string | null
  }
  account: {
    id: string
    name: string
    institution: string
    type: string
  }
  notes?: string | null
  tags?: string[]
  isManual: boolean
  plaidTransactionId?: string | null
  createdAt: Date
  updatedAt: Date
}

interface TransactionDetailProps {
  transaction: TransactionDetailData
  onEdit?: () => void
  onDelete?: () => void
}

export function TransactionDetail({ transaction, onEdit, onDelete }: TransactionDetailProps) {
  const isExpense = transaction.amount < 0
  const absAmount = Math.abs(transaction.amount)

  return (
    <div className="space-y-6">
      {/* Header with Amount */}
      <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{transaction.payee}</CardTitle>
              <CardDescription>
                {format(new Date(transaction.date), 'MMMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  'text-3xl font-bold',
                  isExpense
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                )}
              >
                {isExpense ? '-' : '+'}
                {formatCurrency(absAmount)}
              </div>
              <Badge variant={transaction.isManual ? 'default' : 'secondary'} className="mt-2">
                {transaction.isManual ? 'Manual Entry' : 'Imported'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{transaction.account.name}</p>
              <p className="text-sm text-muted-foreground">{transaction.account.institution}</p>
              <Badge variant="outline" className="mt-2">
                {transaction.account.type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Category Info */}
        <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className="text-base"
              style={{
                borderColor: transaction.category.color
                  ? `${transaction.category.color}40`
                  : undefined,
                backgroundColor: transaction.category.color
                  ? `${transaction.category.color}10`
                  : undefined,
              }}
            >
              {transaction.category.name}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {transaction.notes && (
        <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{transaction.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {transaction.tags && transaction.tags.length > 0 && (
        <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {transaction.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
        <CardHeader>
          <CardTitle className="text-base">Transaction Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono text-xs">{transaction.id}</span>
          </div>
          {transaction.plaidTransactionId && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plaid ID</span>
              <span className="font-mono text-xs">{transaction.plaidTransactionId}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{format(new Date(transaction.updatedAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {onEdit && (
          <Button onClick={onEdit} className="flex-1 gap-2">
            <Edit className="h-4 w-4" />
            Edit Transaction
          </Button>
        )}
        {onDelete && (
          <Button onClick={onDelete} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
