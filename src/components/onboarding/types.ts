export interface OnboardingStepProps {
  onNext?: () => void
  onBack?: () => void
  onSkip?: () => void
  onComplete?: () => void
}

export interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

export interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}
