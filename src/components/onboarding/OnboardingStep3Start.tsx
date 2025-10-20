'use client'

import { Plus, Upload, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingStepProps } from './types'

export function OnboardingStep3Start({ onNext, onBack }: OnboardingStepProps) {
  const quickActions = [
    {
      icon: Plus,
      title: 'Add an Account',
      description: 'Go to Accounts section and create your first checking, savings, or credit card',
      action: 'Start here',
    },
    {
      icon: Upload,
      title: 'Log Transactions',
      description: 'Add transactions manually or import via CSV from your bank',
      action: 'Next step',
    },
    {
      icon: Zap,
      title: 'Set Budgets & Goals',
      description: 'Create monthly budgets and savings goals to track progress',
      action: 'Then explore',
    },
  ]

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-sage-600 text-center">
          Recommended Next Steps
        </h2>

        <p className="text-center text-warm-gray-600 max-w-md mx-auto">
          Here&apos;s how to get started with tracking your finances
        </p>

        <div className="space-y-3 mt-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <div
                key={action.title}
                className="rounded-lg border border-warm-gray-200 bg-white p-4 hover:border-sage-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-sage-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-warm-gray-900">
                      {action.title}
                    </h3>
                    <p className="text-xs text-warm-gray-600 mt-1">
                      {action.description}
                    </p>
                    <p className="text-xs text-sage-600 mt-2 font-medium">
                      {action.action}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} className="bg-sage-600 hover:bg-sage-700">
          Continue
        </Button>
      </div>
    </div>
  )
}
