'use client'

import type { OnboardingProgressProps } from './types'

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div className="mb-6 flex justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i + 1 === currentStep ? 'bg-sage-600' : 'bg-warm-gray-300'
          }`}
          role="status"
          aria-label={`Step ${i + 1} of ${totalSteps}${
            i + 1 === currentStep ? ' (current)' : ''
          }`}
        />
      ))}
    </div>
  )
}
