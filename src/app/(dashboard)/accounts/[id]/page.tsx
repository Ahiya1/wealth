import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AccountDetailClient } from '@/components/accounts/AccountDetailClient'

interface AccountDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: AccountDetailPageProps) {
  const account = await prisma.account.findUnique({
    where: { id: params.id },
  })

  if (!account) {
    return { title: 'Account Not Found | Wealth' }
  }

  return {
    title: `${account.name} | Wealth`,
    description: `View details for ${account.name} at ${account.institution}`,
  }
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (!supabaseUser) {
    redirect('/signin')
  }

  // Get Prisma user
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
  })

  if (!user) {
    redirect('/signin')
  }

  const account = await prisma.account.findUnique({
    where: { id: params.id },
  })

  if (!account || account.userId !== user.id) {
    notFound()
  }

  // Serialize account for client component
  const serializedAccount = {
    ...account,
    balance: account.balance.toString(),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    lastSynced: account.lastSynced?.toISOString() || null,
  }

  return <AccountDetailClient account={serializedAccount} />
}
