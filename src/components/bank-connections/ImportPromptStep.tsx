'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download } from 'lucide-react'

interface ImportPromptStepProps {
  shouldImport: boolean
  onComplete: (shouldImport: boolean) => void
  onBack: () => void
}

export function ImportPromptStep({ shouldImport: initialShouldImport, onComplete, onBack }: ImportPromptStepProps) {
  const [shouldImport, setShouldImport] = useState(initialShouldImport)

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle className="h-12 w-12 text-green-600" />
        <div className="text-center">
          <h3 className="text-xl font-semibold">Connection Successful!</h3>
          <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-2">
            Your bank account has been connected successfully.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-3">Import transactions?</h4>
          <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mb-4">
            Would you like to import your recent transactions now? We&apos;ll import the last 30 days of
            completed transactions.
          </p>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setShouldImport(true)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                shouldImport
                  ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                  : 'border-warm-gray-200 hover:border-warm-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-sage-600" />
                <div>
                  <div className="font-semibold">Yes, import now</div>
                  <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                    Import last 30 days of transactions
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShouldImport(false)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                !shouldImport
                  ? 'border-sage-600 bg-sage-50 dark:bg-sage-900/20'
                  : 'border-warm-gray-200 hover:border-warm-gray-300'
              }`}
            >
              <div>
                <div className="font-semibold">Skip for now</div>
                <div className="text-sm text-warm-gray-600 dark:text-warm-gray-400">
                  You can sync later from the settings page
                </div>
              </div>
            </button>
          </div>
        </div>

        {shouldImport && (
          <div className="rounded-md bg-sage-50 dark:bg-sage-900/20 p-4 border border-sage-200 dark:border-sage-800">
            <p className="text-sm text-sage-800 dark:text-sage-200">
              <strong>Note:</strong> Transaction import is coming in Iteration 19. For now, the
              connection is saved and ready. You&apos;ll be able to sync transactions once the import
              pipeline is complete.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => onComplete(shouldImport)}>
          {shouldImport ? 'Import Transactions' : 'Finish'}
        </Button>
      </div>
    </div>
  )
}
