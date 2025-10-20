'use client'

import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OnboardingStepProps } from './types'

export function OnboardingStep4Complete({
  onComplete,
}: OnboardingStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-sage-600" />
        <h2 className="text-3xl font-bold text-sage-600">You&apos;re All Set!</h2>

        <div className="rounded-lg border border-sage-200 bg-gradient-to-br from-sage-50 to-warm-gray-50 p-6">
          <p className="font-serif text-lg italic leading-relaxed text-warm-gray-800">
            &ldquo;The journey of a thousand miles begins with a single step.&rdquo;
          </p>
        </div>

        <div className="mx-auto max-w-md space-y-3 text-left text-warm-gray-700">
          <p>
            You&apos;re ready to start your journey toward conscious money management.
          </p>
          <p>
            Remember: Wealth isn&apos;t about perfection - it&apos;s about progress and intention.
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-warm-gray-100 p-4 text-left">
          <h3 className="font-semibold text-sm text-warm-gray-900 mb-2">
            Next steps:
          </h3>
          <ul className="space-y-1 text-sm text-warm-gray-700">
            <li>• Add your first account</li>
            <li>• Set up a budget for common categories</li>
            <li>• Create a savings goal</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={onComplete} className="bg-sage-600 hover:bg-sage-700 px-8">
          Get Started
        </Button>
      </div>
    </div>
  )
}
