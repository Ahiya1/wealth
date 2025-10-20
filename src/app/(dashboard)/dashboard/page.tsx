import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'
import { AffirmationCard } from '@/components/ui/affirmation-card'
import { FinancialHealthIndicator } from '@/components/dashboard/FinancialHealthIndicator'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Get time-based greeting
  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'there'

  return (
    <PageTransition duration="slow">
      <div className="space-y-6">
        {/* 1. AFFIRMATION FIRST - Hero element */}
        <AffirmationCard />

        {/* 2. GREETING BELOW - Smaller, secondary */}
        <div>
          <h2 className="text-2xl font-serif font-semibold text-warm-gray-900 dark:text-warm-gray-100">
            {greeting}, {userName}!
          </h2>
          <p className="text-warm-gray-600 dark:text-warm-gray-400 mt-1 leading-relaxed">
            Here&apos;s your financial overview
          </p>
        </div>

        {/* 3. FINANCIAL HEALTH INDICATOR - New component */}
        <FinancialHealthIndicator />

        {/* 4. RECENT TRANSACTIONS */}
        <RecentTransactionsCard />

        {/* 5. STATS CARDS - Moved lower */}
        <DashboardStats />
      </div>
    </PageTransition>
  )
}
