import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'
import { BottomNavigation } from '@/components/mobile/BottomNavigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-950">
      <OnboardingTrigger />
      <div className="flex">
        {/* Sidebar Navigation */}
        <DashboardSidebar user={user} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto w-full lg:w-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl pt-16 lg:pt-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation (mobile only) */}
      <BottomNavigation autoHide />
    </div>
  )
}
