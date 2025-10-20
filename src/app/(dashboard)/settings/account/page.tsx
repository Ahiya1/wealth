'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'

export default function AccountSettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/account')
  }, [router])

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-warm-gray-600 leading-relaxed">Redirecting to account settings...</p>
        </div>
      </div>
    </PageTransition>
  )
}
