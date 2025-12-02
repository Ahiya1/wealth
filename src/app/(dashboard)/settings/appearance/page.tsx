'use client'

import { Separator } from '@/components/ui/separator'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher'
import { PageTransition } from '@/components/ui/page-transition'

export default function AppearanceSettingsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings/appearance" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground dark:text-warm-gray-50">Appearance</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Customize how Wealth looks on your device
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-serif font-semibold text-foreground dark:text-warm-gray-50">Theme</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Select your preferred color scheme
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground dark:text-warm-gray-50">Color Mode</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose between light and dark themes
              </p>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
