import { Metadata } from 'next'
import { UserListTable } from '@/components/admin/UserListTable'
import { PageTransition } from '@/components/ui/page-transition'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'User Management - Admin - Wealth',
  description: 'Manage users and view user details',
}

export default function AdminUsersPage() {
  return (
    <PageTransition>
      <div className="p-8">
        <Breadcrumb pathname="/admin/users" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Search, filter, and view user information
          </p>
        </div>

        <UserListTable />
      </div>
    </PageTransition>
  )
}
