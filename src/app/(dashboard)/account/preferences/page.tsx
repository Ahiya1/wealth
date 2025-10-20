'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { trpc } from '@/lib/trpc'
import { Clock, Bell, Globe } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export default function PreferencesPage() {
  const { data: userData } = trpc.users.me.useQuery()

  return (
    <PageTransition>
      <div className="space-y-6 pb-16">
        <Breadcrumb pathname="/account/preferences" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Preferences</h1>
          <p className="text-warm-gray-600 mt-2 leading-relaxed">
            Configure your personal preferences and settings
          </p>
        </div>

      {/* Timezone Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your local timezone for accurate date and time display
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Current Timezone</Label>
            <Input
              id="timezone"
              value={userData?.timezone || 'America/New_York'}
              disabled
              className="max-w-md"
            />
            <p className="text-xs text-warm-gray-500">
              Timezone configuration coming in a future update
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage your email and in-app notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-warm-gray-600 mb-3">
              Notification preferences coming soon
            </p>
            <p className="text-xs text-warm-gray-500">
              Configure alerts for budgets, goals, and account activity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language & Region
          </CardTitle>
          <CardDescription>
            Set your preferred language and regional formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-warm-gray-600 mb-3">
              Language and localization settings coming soon
            </p>
            <p className="text-xs text-warm-gray-500">
              Currently available in English only
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageTransition>
  )
}
