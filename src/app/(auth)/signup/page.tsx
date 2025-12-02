'use client'

import { SignUpForm } from '@/components/auth/SignUpForm'
import Link from 'next/link'
import { PageTransition } from '@/components/ui/page-transition'

export default function SignUpPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-foreground">Get Started</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account to start tracking your finances
          </p>
        </div>

        <SignUpForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/signin" className="text-sage-600 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
