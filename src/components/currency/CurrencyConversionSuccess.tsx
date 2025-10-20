'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import type { ConversionResult } from '@/types/currency'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ConversionResult
  fromCurrency: string
  toCurrency: string
}

export function CurrencyConversionSuccess({
  open,
  onOpenChange,
  result,
  fromCurrency,
  toCurrency,
}: Props) {
  const toCurrencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === toCurrency)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="rounded-full bg-sage-100 p-4">
              <CheckCircle className="h-10 w-10 text-sage-600" />
            </div>
            <DialogTitle className="text-2xl text-center">
              Currency Converted Successfully!
            </DialogTitle>
          </div>
          <DialogDescription className="text-center text-base">
            Your financial data has been converted to{' '}
            <strong className="text-warm-gray-900">{toCurrencyInfo?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Summary Card */}
          <div className="rounded-lg bg-sage-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-sage-900">Conversion Summary</p>
            <div className="space-y-2 text-sm text-warm-gray-700">
              <div className="flex justify-between">
                <span>From:</span>
                <span className="font-medium text-warm-gray-900">{fromCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span>To:</span>
                <span className="font-medium text-warm-gray-900">
                  {toCurrency} ({toCurrencyInfo?.symbol})
                </span>
              </div>
              <div className="border-t border-sage-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span>Transactions converted:</span>
                  <span className="font-medium text-warm-gray-900">
                    {result.transactionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Accounts updated:</span>
                  <span className="font-medium text-warm-gray-900">
                    {result.accountCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Budgets updated:</span>
                  <span className="font-medium text-warm-gray-900">
                    {result.budgetCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Goals updated:</span>
                  <span className="font-medium text-warm-gray-900">
                    {result.goalCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info message */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-900">
              All amounts throughout the app are now displayed in {toCurrency}.
              Future transactions from linked accounts will be automatically converted.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-sage-600 hover:bg-sage-700"
            size="lg"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
