'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Download, Trash2 } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export default function DataSettingsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings/data" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Data & Privacy</h1>
          <p className="text-warm-gray-600 mt-2 leading-relaxed">
            Manage your data and privacy settings
          </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download all your financial data in JSON format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-8 text-center">
            <Download className="h-8 w-8 text-warm-gray-400 mx-auto mb-3" />
            <p className="text-sm text-warm-gray-600 mb-4">
              Data export functionality coming soon
            </p>
            <Button disabled variant="outline">
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Manage your stored data and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-warm-gray-200 p-4">
            <h4 className="font-serif font-medium text-warm-gray-900 mb-2">Clear Cache</h4>
            <p className="text-sm text-warm-gray-600 mb-3 leading-relaxed">
              Clear locally cached data to free up space
            </p>
            <Button disabled variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>

          <div className="rounded-lg border border-warm-gray-200 p-4">
            <h4 className="font-serif font-medium text-warm-gray-900 mb-2">Privacy Settings</h4>
            <p className="text-sm text-warm-gray-600 leading-relaxed">
              Privacy settings and data retention policies coming soon
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageTransition>
  )
}
