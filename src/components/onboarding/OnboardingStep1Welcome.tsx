'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingStepProps } from './types'

export function OnboardingStep1Welcome({
  onNext,
  onSkip,
}: OnboardingStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-gold" />
        <h2 className="text-3xl font-bold text-sage-600">Welcome to Wealth</h2>

        <div className="rounded-lg border border-sage-200 bg-gradient-to-br from-sage-50 to-warm-gray-50 p-6">
          <p className="font-serif text-xl italic leading-relaxed text-warm-gray-800">
            &ldquo;Your worth is not your net worth.&rdquo;
          </p>
        </div>

        <div className="mx-auto max-w-md space-y-3 text-left text-warm-gray-700">
          <p>
            Wealth helps you manage money mindfully with tools for tracking accounts,
            budgets, transactions, and goals.
          </p>
          <p>
            Let&apos;s take a quick tour of what you can do. Takes about 1 minute.
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} className="bg-sage-600 hover:bg-sage-700">
          Continue
        </Button>
      </div>
    </div>
  )
}
