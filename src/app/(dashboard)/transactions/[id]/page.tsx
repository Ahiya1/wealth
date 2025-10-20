import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TransactionDetailClient } from '@/components/transactions/TransactionDetailClient'

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string }
}) {
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

  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      account: true,
    },
  })

  if (!transaction || transaction.userId !== user.id) {
    notFound()
  }

  // Serialize transaction for client component
  const serializedTransaction = {
    ...transaction,
    amount: transaction.amount.toString(),
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    category: transaction.category ? {
      ...transaction.category,
      createdAt: transaction.category.createdAt.toISOString(),
      updatedAt: transaction.category.updatedAt.toISOString(),
    } : null,
    account: {
      ...transaction.account,
      balance: transaction.account.balance.toString(),
      createdAt: transaction.account.createdAt.toISOString(),
      updatedAt: transaction.account.updatedAt.toISOString(),
      lastSynced: transaction.account.lastSynced?.toISOString() || null,
    },
  }

  return <TransactionDetailClient transaction={serializedTransaction} />
}
