'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BankProvider, AccountType } from '@prisma/client'
import { Landmark, CreditCard } from 'lucide-react'

interface BankSelectionStepProps {
  selectedBank: BankProvider | null
  selectedAccountType: AccountType | null
  onNext: (bank: BankProvider, accountType: AccountType) => void
}

export function BankSelectionStep({
  selectedBank,
  selectedAccountType,
  onNext,
}: BankSelectionStepProps) {
  const [bank, setBank] = useState<BankProvider | null>(selectedBank)
  const [accountType, setAccountType] = useState<AccountType | null>(selectedAccountType)

  const handleNext = () => {
    if (bank && accountType) {
      onNext(bank, accountType)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Select your bank</Label>
          <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-1">
            Choose the bank or credit card you want to connect
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setBank('FIBI')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              bank === 'FIBI'
                ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                : 'border-warm-gray-200 hover:border-warm-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-sage-600 dark:text-sage-400" />
              </div>
              <div>
                <div className="font-semibold">First International Bank (FIBI)</div>
                <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                  Bank Otsar Ha-Hayal
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBank('VISA_CAL')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              bank === 'VISA_CAL'
                ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                : 'border-warm-gray-200 hover:border-warm-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-sage-600 dark:text-sage-400" />
              </div>
              <div>
                <div className="font-semibold">Visa CAL Credit Card</div>
                <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                  CAL credit card services
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {bank && (
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Account type</Label>
            <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-1">
              Select the type of account
            </p>
          </div>

          <div className="grid gap-3">
            {bank === 'FIBI' && (
              <button
                type="button"
                onClick={() => setAccountType('CHECKING')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  accountType === 'CHECKING'
                    ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                    : 'border-warm-gray-200 hover:border-warm-gray-300'
                }`}
              >
                <div className="font-semibold">Checking Account</div>
                <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                  Your primary bank account
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAccountType('CREDIT')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                accountType === 'CREDIT'
                  ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                  : 'border-warm-gray-200 hover:border-warm-gray-300'
              }`}
            >
              <div className="font-semibold">Credit Card</div>
              <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                Credit card transactions
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> We use screen scraping to access your transactions. While your
          credentials are encrypted with AES-256-GCM, this method may violate your bank&apos;s terms
          of service. Use at your own risk.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!bank || !accountType}>
          Next
        </Button>
      </div>
    </div>
  )
}
