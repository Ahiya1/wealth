'use client'

import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DangerZone } from '@/components/settings/DangerZone'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Key, Shield } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export default function SecurityPage() {
  return (
    <PageTransition>
      <div className="space-y-6 pb-16">
        <Breadcrumb pathname="/account/security" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground dark:text-warm-gray-50">Security</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Manage your account security and authentication settings
          </p>
        </div>

      <Separator />

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>
            Change your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Password management is handled by Supabase Auth
            </p>
            <Button disabled variant="outline">
              Change Password (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Two-factor authentication coming in a future update
            </p>
            <Button disabled variant="outline">
              Enable 2FA (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            View and manage your active login sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Session management coming soon
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

        {/* Danger Zone */}
        <DangerZone />
      </div>
    </PageTransition>
  )
}
