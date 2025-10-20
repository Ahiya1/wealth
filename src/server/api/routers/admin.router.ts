import { z } from 'zod'
import { router, adminProcedure } from '../trpc'

export const adminRouter = router({
  // System-wide metrics (no input)
  systemMetrics: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Parallel queries for performance
    const [
      totalUsers,
      totalTransactions,
      totalAccounts,
      activeUsers30d,
      activeUsers90d,
      adminCount,
      premiumCount,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.transaction.count(),
      ctx.prisma.account.count(),
      ctx.prisma.user.count({
        where: {
          transactions: {
            some: { date: { gte: thirtyDaysAgo } }
          }
        }
      }),
      ctx.prisma.user.count({
        where: {
          transactions: {
            some: { date: { gte: ninetyDaysAgo } }
          }
        }
      }),
      ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
      ctx.prisma.user.count({ where: { subscriptionTier: 'PREMIUM' } }),
    ])

    return {
      totalUsers,
      totalTransactions,
      totalAccounts,
      activeUsers30d,
      activeUsers90d,
      adminCount,
      premiumCount,
      freeCount: totalUsers - premiumCount,
    }
  }),

  // User list with search/filter/pagination
  userList: adminProcedure
    .input(
      z.object({
        search: z.string().max(100).optional(),
        role: z.enum(['USER', 'ADMIN']).optional(),
        tier: z.enum(['FREE', 'PREMIUM']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          ...(input.search && {
            OR: [
              { email: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
          ...(input.role && { role: input.role }),
          ...(input.tier && { subscriptionTier: input.tier }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
          _count: {
            select: { transactions: true }
          },
          transactions: {
            select: { date: true },
            orderBy: { date: 'desc' },
            take: 1,
          }
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined = undefined
      if (users.length > input.limit) {
        const nextItem = users.pop()
        nextCursor = nextItem!.id
      }

      return {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          createdAt: user.createdAt,
          transactionCount: user._count.transactions,
          lastActivityAt: user.transactions[0]?.date || null,
        })),
        nextCursor,
      }
    }),
})
