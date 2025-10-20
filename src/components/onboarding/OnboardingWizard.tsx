'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { OnboardingProgress } from './OnboardingProgress'
import { OnboardingStep1Welcome } from './OnboardingStep1Welcome'
import { OnboardingStep2Features } from './OnboardingStep2Features'
import { OnboardingStep3Start } from './OnboardingStep3Start'
import { OnboardingStep4Complete } from './OnboardingStep4Complete'
import type { OnboardingWizardProps } from './types'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const utils = trpc.useUtils()

  const completeOnboarding = trpc.users.completeOnboarding.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate()
      onClose()
    },
  })

  const skipOnboarding = trpc.users.skipOnboarding.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate()
      onClose()
    },
  })

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))
  const handleComplete = () => completeOnboarding.mutate()
  const handleSkip = () => skipOnboarding.mutate()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <OnboardingProgress currentStep={currentStep} totalSteps={4} />

        {currentStep === 1 && (
          <OnboardingStep1Welcome onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === 2 && (
          <OnboardingStep2Features onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <OnboardingStep3Start onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && (
          <OnboardingStep4Complete onComplete={handleComplete} />
        )}
      </DialogContent>
    </Dialog>
  )
}
