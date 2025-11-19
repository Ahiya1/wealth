'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BankSelectionStep } from './BankSelectionStep'
import { CredentialsStep } from './CredentialsStep'
import { OtpModal } from './OtpModal'
import { ConnectionTestStep } from './ConnectionTestStep'
import { ImportPromptStep } from './ImportPromptStep'
import type { BankProvider, AccountType } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

interface WizardData {
  // Step 1
  bank: BankProvider | null
  accountType: AccountType | null

  // Step 2
  userId: string
  password: string
  accountIdentifier: string

  // Step 3 (OTP - conditional)
  otp?: string

  // Step 4 (Connection Test Result)
  connectionId?: string
  accountNumber?: string

  // Step 5
  shouldImport: boolean
}

interface BankConnectionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ============================================================================
// Main Component
// ============================================================================

export function BankConnectionWizard({ isOpen, onClose, onSuccess }: BankConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<WizardData>>({
    shouldImport: true, // Default to Yes
    userId: '',
    password: '',
    accountIdentifier: '',
  })
  const [showOtpModal, setShowOtpModal] = useState(false)

  // Navigation
  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 5))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  // Update form data
  const updateFormData = (partial: Partial<WizardData>) => {
    setFormData((prev) => ({ ...prev, ...partial }))
  }

  // OTP flow
  const handleOtpRequired = () => {
    setShowOtpModal(true)
  }

  const handleOtpSubmit = (otp: string) => {
    updateFormData({ otp })
    setShowOtpModal(false)
    // ConnectionTestStep will auto-retry with OTP via useEffect
  }

  // Wizard completion
  const handleComplete = () => {
    onSuccess?.()
    onClose()
    // Reset state
    setCurrentStep(1)
    setFormData({
      shouldImport: true,
      userId: '',
      password: '',
      accountIdentifier: '',
    })
  }

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose()
      // Reset state
      setCurrentStep(1)
      setFormData({
        shouldImport: true,
        userId: '',
        password: '',
        accountIdentifier: '',
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Bank Connection</DialogTitle>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-sage-600' : 'bg-warm-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Bank Selection */}
          {currentStep === 1 && (
            <BankSelectionStep
              selectedBank={formData.bank || null}
              selectedAccountType={formData.accountType || null}
              onNext={(bank, accountType) => {
                updateFormData({ bank, accountType })
                handleNext()
              }}
            />
          )}

          {/* Step 2: Credentials Entry */}
          {currentStep === 2 && (
            <CredentialsStep
              initialData={{
                userId: formData.userId || '',
                password: formData.password || '',
                accountIdentifier: formData.accountIdentifier || '',
              }}
              onNext={(userId, password, accountIdentifier) => {
                updateFormData({ userId, password, accountIdentifier })
                handleNext()
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 3: Connection Test (Step 3 is OTP modal, shown conditionally) */}
          {currentStep === 3 && (
            <ConnectionTestStep
              bank={formData.bank!}
              accountType={formData.accountType!}
              userId={formData.userId!}
              password={formData.password!}
              accountIdentifier={formData.accountIdentifier!}
              otp={formData.otp}
              onSuccess={(connectionId, accountNumber) => {
                updateFormData({ connectionId, accountNumber })
                handleNext()
              }}
              onOtpRequired={handleOtpRequired}
              onBack={handleBack}
            />
          )}

          {/* Step 4: Initial Import Prompt */}
          {currentStep === 4 && (
            <ImportPromptStep
              shouldImport={formData.shouldImport || true}
              onComplete={(shouldImport) => {
                updateFormData({ shouldImport })
                // TODO: Trigger initial import if shouldImport === true (Iteration 19)
                handleComplete()
              }}
              onBack={handleBack}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* OTP Modal (overlay on wizard) */}
      <OtpModal isOpen={showOtpModal} onSubmit={handleOtpSubmit} onCancel={() => setShowOtpModal(false)} />
    </>
  )
}
