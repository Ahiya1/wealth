'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Transaction {
  date: string
  amount: number
  payee: string
  category: { id: string; name: string; color: string | null }
  status: 'new' | 'duplicate' | 'uncertain'
  confidence?: 'high' | 'low'
}

interface TransactionPreviewProps {
  transactions: Transaction[]
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
  creditCardBills?: Transaction[]
}

export function TransactionPreview({
  transactions,
  onConfirm,
  onCancel,
  isProcessing = false,
  creditCardBills,
}: TransactionPreviewProps) {
  const summary = {
    new: transactions.filter((t) => t.status === 'new').length,
    duplicate: transactions.filter((t) => t.status === 'duplicate').length,
    uncertain: transactions.filter((t) => t.status === 'uncertain').length,
  }

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction Import Preview</span>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-sage-500 text-white">
              {summary.new} NEW
            </Badge>
            {summary.duplicate > 0 && (
              <Badge
                variant="outline"
                className="border-warm-gray-400 text-warm-gray-600"
              >
                {summary.duplicate} DUPLICATE
              </Badge>
            )}
            {summary.uncertain > 0 && (
              <Badge
                variant="outline"
                className="border-orange-500 text-orange-600"
              >
                {summary.uncertain} UNCERTAIN
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Credit Card Bills Warning */}
        {creditCardBills && creditCardBills.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-800 dark:text-amber-200">Credit Card Bills Detected</h4>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {creditCardBills.length} transaction(s) appear to be credit card bill payments.
              These are excluded to prevent double-counting.
            </p>
            <details className="mt-2">
              <summary className="text-sm text-amber-700 dark:text-amber-300 cursor-pointer">View excluded bills</summary>
              <ul className="mt-2 text-sm space-y-1">
                {creditCardBills.map((bill, i) => (
                  <li key={i} className="text-amber-600 dark:text-amber-400">
                    {bill.payee}: ₪{Math.abs(Number(bill.amount)).toFixed(2)}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {/* Summary */}
        <div className="mb-4 p-3 bg-warm-gray-50 dark:bg-warm-gray-800 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Found <strong>{transactions.length}</strong> transactions.{' '}
            <strong>{summary.new}</strong> will be imported,{' '}
            <strong>{summary.duplicate}</strong> will be skipped as duplicates.
          </p>
        </div>

        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((txn, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                txn.status === 'duplicate' &&
                  'opacity-50 bg-warm-gray-50 dark:bg-warm-gray-800',
                txn.status === 'new' && 'bg-white dark:bg-warm-gray-900',
                txn.status === 'uncertain' &&
                  'border-orange-300 dark:border-orange-700'
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mr-3">
                {txn.status === 'new' && (
                  <CheckCircle className="h-5 w-5 text-sage-600" />
                )}
                {txn.status === 'duplicate' && (
                  <XCircle className="h-5 w-5 text-warm-gray-400" />
                )}
                {txn.status === 'uncertain' && (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{txn.payee}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: txn.category.color
                        ? `${txn.category.color}15`
                        : undefined,
                      color: txn.category.color || undefined,
                    }}
                  >
                    {txn.category.name}
                  </Badge>
                  {txn.confidence === 'low' && (
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-500 text-orange-600"
                    >
                      Low confidence
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(txn.date), 'MMM d, yyyy')}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right ml-4">
                <div
                  className={cn(
                    'font-semibold',
                    txn.amount < 0
                      ? 'text-warm-gray-700 dark:text-warm-gray-300'
                      : 'text-sage-600'
                  )}
                >
                  {txn.amount < 0 ? '-' : '+'}₪
                  {Math.abs(txn.amount).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || summary.new === 0}
            className="flex-1"
          >
            {isProcessing
              ? 'Importing...'
              : `Import ${summary.new} Transaction${summary.new !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
