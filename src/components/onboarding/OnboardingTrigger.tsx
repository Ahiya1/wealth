'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { OnboardingWizard } from './OnboardingWizard'

export function OnboardingTrigger() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: user } = trpc.users.me.useQuery()

  useEffect(() => {
    // Show onboarding if:
    // 1. User exists (logged in)
    // 2. Has not completed onboarding
    // 3. Has not explicitly skipped
    if (
      user &&
      !user.onboardingCompletedAt &&
      !user.onboardingSkipped
    ) {
      setIsOpen(true)
    }
  }, [user])

  return <OnboardingWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
}
