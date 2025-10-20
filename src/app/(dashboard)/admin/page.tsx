import { Metadata } from 'next'
import { SystemMetrics } from '@/components/admin/SystemMetrics'
import { PageTransition } from '@/components/ui/page-transition'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Wealth',
  description: 'System-wide metrics and administration',
}

export default function AdminDashboardPage() {
  return (
    <PageTransition>
      <div className="p-8">
        <Breadcrumb pathname="/admin" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif text-warm-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-warm-gray-600 mt-1">
            System-wide metrics and user management
          </p>
        </div>

        <SystemMetrics />
      </div>
    </PageTransition>
  )
}
