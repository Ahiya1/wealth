'use client'

import { SignInForm } from '@/components/auth/SignInForm'
import Link from 'next/link'
import { Suspense } from 'react'
import { PageTransition } from '@/components/ui/page-transition'

export default function SignInPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-warm-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <SignInForm />
        </Suspense>

        <div className="text-center text-sm">
          <span className="text-warm-gray-600">Don&apos;t have an account? </span>
          <Link href="/signup" className="text-sage-600 hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
