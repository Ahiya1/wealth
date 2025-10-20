'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Edit, Trash2 } from 'lucide-react'
import type { Transaction, Category, Account } from '@prisma/client'
import { cardHoverSubtle } from '@/lib/animations'

interface TransactionCardProps {
  transaction: Transaction & {
    category: Category
    account: Account
  }
  onEdit?: () => void
  onDelete?: () => void
}

export function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const isExpense = Number(transaction.amount) < 0
  const absAmount = Math.abs(Number(transaction.amount))

  return (
    <motion.div {...cardHoverSubtle}>
      <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700 hover:bg-warm-gray-50 dark:hover:bg-warm-gray-800 transition-all">
        <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{transaction.payee}</h3>
              {transaction.tags.length > 0 && (
                <div className="flex gap-1">
                  {transaction.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground">
              <span>{format(new Date(transaction.date), 'MMM d, yyyy')}</span>
              <span className="hidden sm:inline">•</span>
              <span className="truncate">{transaction.account.name}</span>
              <span className="hidden sm:inline">•</span>
              <Badge
                variant="secondary"
                className="w-fit"
                style={{
                  backgroundColor: transaction.category.color
                    ? `${transaction.category.color}15`
                    : undefined,
                  color: transaction.category.color || undefined,
                }}
              >
                {transaction.category.name}
              </Badge>
            </div>

            {transaction.notes && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {transaction.notes}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 ml-4">
            <div className="text-right">
              <p
                className={`text-lg font-semibold ${
                  isExpense ? 'text-warm-gray-700 dark:text-warm-gray-300' : 'text-sage-600 dark:text-sage-400'
                }`}
              >
                {isExpense ? '-' : '+'}
                {formatCurrency(absAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {transaction.isManual ? 'Manual' : 'Imported'}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8 text-coral hover:text-coral/90 hover:bg-coral/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
