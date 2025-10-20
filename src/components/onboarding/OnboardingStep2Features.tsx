'use client'

import { Wallet, PieChart, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingStepProps } from './types'

export function OnboardingStep2Features({
  onNext,
  onBack,
}: OnboardingStepProps) {
  const features = [
    {
      icon: Wallet,
      title: 'Accounts',
      description: 'Track checking, savings, credit cards, and investment accounts with real-time balances.',
    },
    {
      icon: TrendingUp,
      title: 'Transactions',
      description: 'Log every transaction manually or via CSV import. Categorize and tag for insights.',
    },
    {
      icon: PieChart,
      title: 'Budgets',
      description: 'Set monthly budgets by category, track progress, and see what\'s working.',
    },
    {
      icon: Target,
      title: 'Goals & Analytics',
      description: 'Create savings goals and visualize spending patterns with charts and trends.',
    },
  ]

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-sage-600 text-center">
          Your Dashboard Sections
        </h2>
        <p className="text-center text-warm-gray-600 text-sm">
          Navigate between these sections using the sidebar
        </p>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-lg border border-warm-gray-200 bg-white p-4 space-y-2"
              >
                <Icon className="h-6 w-6 text-sage-600" />
                <h3 className="font-semibold text-sm text-warm-gray-900">
                  {feature.title}
                </h3>
                <p className="text-xs text-warm-gray-600">
                  {feature.description}
                </p>
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
