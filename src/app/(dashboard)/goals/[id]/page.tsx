// src/app/(dashboard)/goals/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GoalDetailPageClient } from '@/components/goals/GoalDetailPageClient'

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
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

  const goal = await prisma.goal.findUnique({
    where: { id: params.id },
    include: { linkedAccount: true },
  })

  if (!goal || goal.userId !== user.id) {
    notFound()
  }

  return <GoalDetailPageClient goalId={params.id} />
}
