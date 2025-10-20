'use client'

import { Separator } from '@/components/ui/separator'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageTransition } from '@/components/ui/page-transition'

export default function ProfilePage() {
  return (
    <PageTransition>
      <div className="space-y-6 pb-16">
        <Breadcrumb pathname="/account/profile" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900 dark:text-warm-gray-50">Profile</h1>
          <p className="text-warm-gray-600 dark:text-warm-gray-400 mt-2 leading-relaxed">
            Manage your personal information and contact details
          </p>
        </div>

        <Separator />

        <ProfileSection />
      </div>
    </PageTransition>
  )
}
