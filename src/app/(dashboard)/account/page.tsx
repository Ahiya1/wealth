'use client'

import Link from 'next/link'
import { User, CreditCard, Shield, Settings, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { trpc } from '@/lib/trpc'
import { PageTransition } from '@/components/ui/page-transition'

export default function AccountOverviewPage() {
  const { data: userData } = trpc.users.me.useQuery()

  const accountSections = [
    {
      title: 'Profile',
      description: 'Manage your personal information and contact details',
      href: '/account/profile',
      icon: User,
    },
    {
      title: 'Membership',
      description: 'View your subscription tier and billing information',
      href: '/account/membership',
      icon: CreditCard,
    },
    {
      title: 'Security',
      description: 'Manage password, authentication, and account security',
      href: '/account/security',
      icon: Shield,
    },
    {
      title: 'Preferences',
      description: 'Configure timezone, notifications, and other preferences',
      href: '/account/preferences',
      icon: Settings,
    },
  ]

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/account" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Account</h1>
          <p className="text-warm-gray-600 mt-2 leading-relaxed">
            Manage your personal information and account settings
          </p>
        </div>

      {/* Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
          <CardDescription>Your account information at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-700 font-semibold text-xl">
              {userData?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-lg text-warm-gray-900">
                {userData?.name || 'User'}
              </p>
              <p className="text-sm text-warm-gray-600">{userData?.email}</p>
              <p className="text-xs text-warm-gray-500 mt-1">
                Tier: <span className="font-medium">{userData?.subscriptionTier || 'FREE'}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Account Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-semibold text-warm-gray-900">
            Account Settings
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accountSections.map((section) => {
            const Icon = section.icon
            return (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-start gap-4 rounded-lg border border-warm-gray-200 bg-white p-4 hover:border-sage-300 hover:shadow-sm transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-50 text-sage-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif font-semibold text-warm-gray-900">
                    {section.title}
                  </h3>
                  <p className="text-sm text-warm-gray-600 mt-1 leading-relaxed">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-warm-gray-400 mt-1" />
              </Link>
            )
          })}
        </div>
        </div>
      </div>
    </PageTransition>
  )
}
