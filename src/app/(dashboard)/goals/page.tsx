//src/app/(dashboard)/goals/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsPageClient } from '@/components/goals/GoalsPageClient'

export default async function GoalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <GoalsPageClient />
}
