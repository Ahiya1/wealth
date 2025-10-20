'use client'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import Link from 'next/link'
import { PageTransition } from '@/components/ui/page-transition'

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Reset Password</h1>
          <p className="mt-2 text-sm text-warm-gray-600">
            Enter your email to receive a password reset link
          </p>
        </div>

        <ResetPasswordForm />

        <div className="text-center text-sm">
          <Link href="/signin" className="text-sage-600 hover:underline font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
