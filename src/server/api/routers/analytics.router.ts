import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const analyticsRouter = router({
  // Dashboard summary with key metrics
  dashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id
    const currentMonth = new Date()

    // Parallel queries for performance (optimized with aggregates)
    const [accounts, incomeResult, expensesResult, budgets, recentTransactions] = await Promise.all([
      ctx.prisma.account.findMany({
        where: { userId, isActive: true },
      }),
      // Use aggregate for income calculation
      ctx.prisma.transaction.aggregate({
        where: {
          userId,
          date: {
            gte: startOfMonth(currentMonth),
            lte: endOfMonth(currentMonth),
          },
          amount: { gt: 0 }, // Only income
        },
        _sum: { amount: true },
      }),
      // Use aggregate for expenses calculation
      ctx.prisma.transaction.aggregate({
        where: {
          userId,
          date: {
            gte: startOfMonth(currentMonth),
            lte: endOfMonth(currentMonth),
          },
          amount: { lt: 0 }, // Only expenses
        },
        _sum: { amount: true },
      }),
      ctx.prisma.budget.findMany({
        where: {
          userId,
          month: format(currentMonth, 'yyyy-MM'),
        },
      }),
      ctx.prisma.transaction.findMany({
        where: { userId },
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ])

    // Calculate net worth
    const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // Extract aggregated values
    const income = Number(incomeResult._sum.amount || 0)
    const expenses = Math.abs(Number(expensesResult._sum.amount || 0))

    // Fetch top spending categories (still need transaction details for grouping)
    const categoryTransactions = await ctx.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth(currentMonth),
          lte: endOfMonth(currentMonth),
        },
        amount: { lt: 0 },
      },
      include: { category: true },
    })

    // Top spending categories
    const categorySpending = Object.entries(
      categoryTransactions.reduce((acc, t) => {
        const cat = t.category.name
        acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.amount))
        return acc
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }))

    return {
      netWorth,
      income,
      expenses,
      topCategories: categorySpending,
      recentTransactions,
      budgetCount: budgets.length,
    }
  }),

  // Spending by category for pie chart
  spendingByCategory: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: input.startDate, lte: input.endDate },
          amount: { lt: 0 }, // Only expenses
        },
        include: { category: true },
      })

      const categoryTotals = transactions.reduce((acc, txn) => {
        const cat = txn.category.name
        const color = txn.category.color || '#9ca3af'

        if (!acc[cat]) {
          acc[cat] = { category: cat, amount: 0, color }
        }
        acc[cat].amount += Math.abs(Number(txn.amount))
        return acc
      }, {} as Record<string, { category: string; amount: number; color: string }>)

      return Object.values(categoryTotals).sort((a, b) => b.amount - a.amount)
    }),

  // Spending trends over time for line chart
  spendingTrends: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(['day', 'week', 'month']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: input.startDate, lte: input.endDate },
          amount: { lt: 0 }, // Only expenses
        },
        orderBy: { date: 'asc' },
      })

      // Group transactions by period
      const grouped = transactions.reduce((acc, txn) => {
        let key: string
        if (input.groupBy === 'day') {
          key = format(txn.date, 'yyyy-MM-dd')
        } else if (input.groupBy === 'week') {
          key = format(txn.date, 'yyyy-ww')
        } else {
          key = format(txn.date, 'yyyy-MM')
        }

        acc[key] = (acc[key] || 0) + Math.abs(Number(txn.amount))
        return acc
      }, {} as Record<string, number>)

      return Object.entries(grouped).map(([date, amount]) => ({
        date,
        amount,
      }))
    }),

  // Month-over-month comparison for bar chart
  monthOverMonth: protectedProcedure
    .input(
      z.object({
        months: z.number().min(3).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const months = Array.from({ length: input.months }, (_, i) => {
        const date = subMonths(new Date(), input.months - 1 - i)
        return format(date, 'yyyy-MM')
      })

      const data = await Promise.all(
        months.map(async (month) => {
          const parts = month.split('-')
          const year = Number(parts[0])
          const monthNum = Number(parts[1])

          if (isNaN(year) || isNaN(monthNum)) {
            throw new Error(`Invalid month format: ${month}`)
          }

          const startDate = startOfMonth(new Date(year, monthNum - 1))
          const endDate = endOfMonth(new Date(year, monthNum - 1))

          // Use parallel aggregates instead of findMany + reduce
          const [incomeResult, expensesResult] = await Promise.all([
            ctx.prisma.transaction.aggregate({
              where: {
                userId: ctx.user.id,
                date: { gte: startDate, lte: endDate },
                amount: { gt: 0 }, // Only income
              },
              _sum: { amount: true },
            }),
            ctx.prisma.transaction.aggregate({
              where: {
                userId: ctx.user.id,
                date: { gte: startDate, lte: endDate },
                amount: { lt: 0 }, // Only expenses
              },
              _sum: { amount: true },
            }),
          ])

          const income = Number(incomeResult._sum.amount || 0)
          const expenses = Math.abs(Number(expensesResult._sum.amount || 0))

          return {
            month: format(new Date(year, monthNum - 1), 'MMM yyyy'),
            income,
            expenses,
          }
        })
      )

      return data
    }),

  // Net worth over time (current snapshot only for MVP)
  netWorthHistory: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.account.findMany({
      where: { userId: ctx.user.id, isActive: true },
    })

    const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // MVP: Single data point for current net worth
    // Post-MVP: Store historical snapshots
    return [{ date: format(new Date(), 'yyyy-MM-dd'), value: currentNetWorth }]
  }),

  // Income analysis by source
  incomeBySource: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: input.startDate, lte: input.endDate },
          amount: { gt: 0 }, // Only income
        },
        include: { category: true },
      })

      const incomeByCategory = transactions.reduce((acc, txn) => {
        const cat = txn.category.name
        const color = txn.category.color || '#10b981'

        if (!acc[cat]) {
          acc[cat] = { category: cat, amount: 0, color }
        }
        acc[cat].amount += Number(txn.amount)
        return acc
      }, {} as Record<string, { category: string; amount: number; color: string }>)

      return Object.values(incomeByCategory).sort((a, b) => b.amount - a.amount)
    }),
})
