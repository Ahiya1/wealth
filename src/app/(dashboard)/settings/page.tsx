'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info, ChevronRight, Palette, Database, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageTransition } from '@/components/ui/page-transition'

export default function SettingsPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  const settingsSections = [
    {
      title: 'Categories',
      description: 'Manage income and expense categories',
      href: '/settings/categories',
      icon: Tags,
    },
    {
      title: 'Appearance',
      description: 'Customize theme and visual preferences',
      href: '/settings/appearance',
      icon: Palette,
    },
    {
      title: 'Data & Privacy',
      description: 'Export data and manage privacy settings',
      href: '/settings/data',
      icon: Database,
    },
  ]

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Settings</h1>
          <p className="mt-2 text-warm-gray-600 leading-relaxed">
            Configure application settings and preferences
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-semibold text-warm-gray-900">
            Application Settings
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsSections.map((section) => {
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

        {/* Help & Support */}
        <div className="space-y-4 pt-6 border-t border-warm-gray-200">
          <h2 className="text-lg font-serif font-semibold text-warm-gray-900">
            Help & Support
          </h2>
        <Button
          variant="outline"
          onClick={() => setShowOnboarding(true)}
          className="w-full justify-start gap-3"
        >
          <Info className="h-4 w-4" />
          Replay Product Tour
        </Button>
      </div>

        {/* Onboarding Wizard */}
        {showOnboarding && (
          <OnboardingWizard
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </div>
    </PageTransition>
  )
}
