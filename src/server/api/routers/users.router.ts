import { z } from 'zod'
import { format } from 'date-fns'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { generateCompleteDataJSON } from '@/lib/jsonExport'

export const usersRouter = router({
  // Get current user with onboarding status
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null
    }

    return await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        currency: true,
        timezone: true,
        isDemoUser: true,
        onboardingCompletedAt: true,
        onboardingSkipped: true,
        createdAt: true,
        role: true,
        subscriptionTier: true,
      },
    })
  }),

  // Mark onboarding as completed
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    return await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingSkipped: false, // Clear skip flag if set
      },
    })
  }),

  // Mark onboarding as skipped
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    return await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        onboardingSkipped: true,
      },
    })
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100).optional(),
        // Currency removed - always NIS, immutable after user creation
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          // Currency not updatable - NIS only
          ...(input.timezone !== undefined && { timezone: input.timezone }),
        },
      })

      return updatedUser
    }),

  // Export all user data as JSON
  exportAllData: protectedProcedure
    .query(async ({ ctx }) => {
      const [accounts, transactions, budgets, goals, categories] = await Promise.all([
        ctx.prisma.account.findMany({
          where: { userId: ctx.user.id },
          orderBy: { name: 'asc' },
        }),
        ctx.prisma.transaction.findMany({
          where: { userId: ctx.user.id },
          include: { category: true, account: true },
          orderBy: { date: 'desc' },
          take: 10000, // Hard limit
        }),
        ctx.prisma.budget.findMany({
          where: { userId: ctx.user.id },
          include: { category: true },
          orderBy: { month: 'desc' },
        }),
        ctx.prisma.goal.findMany({
          where: { userId: ctx.user.id },
          include: { linkedAccount: true },
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.category.findMany({
          where: { userId: ctx.user.id },
          orderBy: { name: 'asc' },
        }),
      ])

      const exportData = {
        user: {
          email: ctx.user.email,
          name: ctx.user.name,
          currency: ctx.user.currency,
          timezone: ctx.user.timezone,
        },
        accounts,
        transactions,
        budgets,
        goals,
        categories,
      }

      const json = generateCompleteDataJSON(exportData)
      const filename = `wealth-data-${format(new Date(), 'yyyy-MM-dd')}.json`

      return { json, filename }
    }),

  // Delete user account and all data
  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id
      const supabaseAuthId = ctx.user.supabaseAuthId

      // 1. Delete from Prisma (cascade handles all relationships)
      await ctx.prisma.user.delete({
        where: { id: userId },
      })

      // 2. Delete from Supabase Auth (admin API)
      if (supabaseAuthId) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          )

          const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseAuthId)

          if (error) {
            console.error('Supabase auth deletion failed:', error)
            // Don't throw - user data already deleted from Prisma
          }
        } catch (error) {
          console.error('Error deleting from Supabase:', error)
          // Don't throw - user data already deleted from Prisma
        }
      }

      return { success: true }
    }),
})
