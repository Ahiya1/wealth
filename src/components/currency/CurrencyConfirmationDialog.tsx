'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import { CurrencyConversionProgress } from './CurrencyConversionProgress'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromCurrency: string
  toCurrency: string
  onSuccess?: () => void
}

export function CurrencyConfirmationDialog({
  open,
  onOpenChange,
  fromCurrency,
  toCurrency,
  onSuccess,
}: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [converting, setConverting] = useState(false)

  // Fetch user's data for counts
  const { data: transactionData } = trpc.transactions.list.useQuery(
    { limit: 100 },
    { enabled: open }
  )
  const { data: accountData } = trpc.accounts.list.useQuery({ includeInactive: true }, { enabled: open })
  const { data: goalData } = trpc.goals.list.useQuery({ includeCompleted: true }, { enabled: open })

  const handleConfirm = () => {
    setConverting(true)
    // Progress dialog will handle the actual conversion
  }

  const handleConversionComplete = () => {
    setConverting(false)
    onOpenChange(false)
    setConfirmed(false)
    onSuccess?.()
  }

  const handleConversionError = () => {
    setConverting(false)
    // Keep dialog open on error so user can retry
  }

  // Display counts (transactions shows up to 100 for estimation, actual count may be higher)
  const transactionCount = transactionData?.transactions?.length || 0
  const accountCount = accountData?.length || 0
  const budgetCount = 0 // Will be determined during conversion
  const goalCount = goalData?.length || 0

  return (
    <>
      <AlertDialog open={open && !converting} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                Confirm Currency Change
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3 pt-2">
              <p className="text-warm-gray-700">
                You are about to convert all your financial data from{' '}
                <strong className="text-warm-gray-900">{fromCurrency}</strong> to{' '}
                <strong className="text-warm-gray-900">{toCurrency}</strong>.
              </p>

              <div className="rounded-lg bg-warm-gray-50 p-3 space-y-2 text-sm">
                <p className="font-semibold text-warm-gray-900">This will convert:</p>
                <ul className="space-y-1 text-warm-gray-700">
                  <li>• {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}</li>
                  <li>• {accountCount} account{accountCount !== 1 ? 's' : ''}</li>
                  <li>• {budgetCount || 'All active'} budgets</li>
                  <li>• {goalCount} goal{goalCount !== 1 ? 's' : ''}</li>
                </ul>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Important:</strong> This conversion uses historical
                  exchange rates for each transaction date. The process may take up
                  to 30 seconds and cannot be interrupted once started.
                </p>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(!!checked)}
                />
                <Label
                  htmlFor="confirm"
                  className="text-sm font-normal cursor-pointer leading-relaxed"
                >
                  I understand this will convert all my financial data to {toCurrency}
                </Label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmed(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!confirmed}
              className="bg-sage-600 hover:bg-sage-700"
            >
              Continue with Conversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {converting && (
        <CurrencyConversionProgress
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          onComplete={handleConversionComplete}
          onError={handleConversionError}
        />
      )}
    </>
  )
}
