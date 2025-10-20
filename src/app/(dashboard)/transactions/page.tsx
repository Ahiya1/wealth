import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionListPageClient } from '@/components/transactions/TransactionListPage'

export const metadata = {
  title: 'Transactions | Wealth',
  description: 'View and manage all your transactions',
}

export default async function TransactionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <TransactionListPageClient />
}
