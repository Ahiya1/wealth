import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountListClient } from '@/components/accounts/AccountListClient'

export const metadata = {
  title: 'Accounts | Wealth',
  description: 'Manage your financial accounts',
}

export default async function AccountsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <AccountListClient />
}
