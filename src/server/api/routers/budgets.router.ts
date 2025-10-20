// src/server/api/routers/budgets.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const budgetsRouter = router({
  // Create a new budget for a category and month
  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().min(1),
        amount: z.number().positive('Amount must be positive'),
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
        rollover: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if budget already exists for this category and month
      const existing = await ctx.prisma.budget.findUnique({
        where: {
          userId_categoryId_month: {
            userId: ctx.user.id,
            categoryId: input.categoryId,
            month: input.month,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Budget already exists for this category and month',
        })
      }

      // Verify category exists and user has access
      const category = await ctx.prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [
            { userId: ctx.user.id }, // User's custom category
            { userId: null, isDefault: true }, // Default category
          ],
        },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }

      // Create budget
      const budget = await ctx.prisma.budget.create({
        data: {
          userId: ctx.user.id,
          categoryId: input.categoryId,
          amount: input.amount,
          month: input.month,
          rollover: input.rollover,
        },
        include: {
          category: true,
        },
      })

      // Create budget alerts (75%, 90%, 100%)
      await ctx.prisma.budgetAlert.createMany({
        data: [
          { budgetId: budget.id, threshold: 75 },
          { budgetId: budget.id, threshold: 90 },
          { budgetId: budget.id, threshold: 100 },
        ],
      })

      return budget
    }),

  // Get budget for specific category and month
  get: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: {
          userId_categoryId_month: {
            userId: ctx.user.id,
            categoryId: input.categoryId,
            month: input.month,
          },
        },
        include: {
          category: true,
          alerts: true,
        },
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      return budget
    }),

  // List all budgets for a specific month
  listByMonth: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: {
          userId: ctx.user.id,
          month: input.month,
        },
        include: {
          category: true,
          alerts: true,
        },
        orderBy: {
          category: {
            name: 'asc',
          },
        },
      })

      return budgets
    }),

  // Get budget progress for a specific month with spending calculations
  progress: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: {
          userId: ctx.user.id,
          month: input.month,
        },
        include: {
          category: true,
        },
      })

      // Parse month to get date range
      const parts = input.month.split('-')
      const year = Number(parts[0])
      const month = Number(parts[1])

      if (isNaN(year) || isNaN(month)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid month format: ${input.month}`,
        })
      }

      const startDate = startOfMonth(new Date(year, month - 1))
      const endDate = endOfMonth(new Date(year, month - 1))

      // Calculate progress for each budget
      const budgetsWithProgress = await Promise.all(
        budgets.map(async (budget) => {
          // Get sum of expenses for this category in this month
          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: budget.categoryId,
              date: { gte: startDate, lte: endDate },
              amount: { lt: 0 }, // Only expenses (negative amounts)
            },
            _sum: { amount: true },
          })

          const spentAmount = Math.abs(Number(spent._sum.amount || 0))
          const budgetAmount = Number(budget.amount)
          const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
          const remainingAmount = budgetAmount - spentAmount

          // Determine status based on percentage
          let status: 'good' | 'warning' | 'over'
          if (percentage > 95) {
            status = 'over'
          } else if (percentage > 75) {
            status = 'warning'
          } else {
            status = 'good'
          }

          return {
            id: budget.id,
            categoryId: budget.categoryId,
            category: budget.category.name,
            categoryColor: budget.category.color,
            categoryIcon: budget.category.icon,
            budgetAmount,
            spentAmount,
            remainingAmount,
            percentage: Math.min(percentage, 100),
            status,
          }
        })
      )

      return { budgets: budgetsWithProgress }
    }),

  // Update budget amount
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        rollover: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify budget exists and user owns it
      const existing = await ctx.prisma.budget.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found',
        })
      }

      const budget = await ctx.prisma.budget.update({
        where: { id: input.id },
        data: {
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.rollover !== undefined && { rollover: input.rollover }),
        },
        include: {
          category: true,
        },
      })

      return budget
    }),

  // Delete budget
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.budget.findUnique({
      where: { id: input.id },
    })

    if (!existing || existing.userId !== ctx.user.id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Budget not found',
      })
    }

    await ctx.prisma.budget.delete({
      where: { id: input.id },
    })

    return { success: true }
  }),

  // Budget vs actual comparison across multiple months
  comparison: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        startMonth: z.string().regex(/^\d{4}-\d{2}$/),
        endMonth: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      // Generate list of months between start and end
      const startDate = new Date(input.startMonth)
      const endDate = new Date(input.endMonth)

      const months: string[] = []
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        months.push(format(currentDate, 'yyyy-MM'))
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      // Get budget and spending for each month
      const comparison = await Promise.all(
        months.map(async (month) => {
          const budget = await ctx.prisma.budget.findUnique({
            where: {
              userId_categoryId_month: {
                userId: ctx.user.id,
                categoryId: input.categoryId,
                month: month,
              },
            },
          })

          const parts = month.split('-')
          const year = Number(parts[0])
          const monthNum = Number(parts[1])

          if (isNaN(year) || isNaN(monthNum)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid month format: ${month}`,
            })
          }

          const startDate = startOfMonth(new Date(year, monthNum - 1))
          const endDate = endOfMonth(new Date(year, monthNum - 1))

          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: input.categoryId,
              date: { gte: startDate, lte: endDate },
              amount: { lt: 0 },
            },
            _sum: { amount: true },
          })

          return {
            month,
            budgeted: budget ? Number(budget.amount) : 0,
            spent: Math.abs(Number(spent._sum.amount || 0)),
          }
        })
      )

      return { comparison }
    }),

  // Get budget summary (total budgeted, total spent, categories count)
  summary: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: {
          userId: ctx.user.id,
          month: input.month,
        },
      })

      const totalBudgeted = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0)

      const parts = input.month.split('-')
      const year = Number(parts[0])
      const month = Number(parts[1])

      if (isNaN(year) || isNaN(month)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid month format: ${input.month}`,
        })
      }

      const startDate = startOfMonth(new Date(year, month - 1))
      const endDate = endOfMonth(new Date(year, month - 1))

      const spent = await ctx.prisma.transaction.aggregate({
        where: {
          userId: ctx.user.id,
          date: { gte: startDate, lte: endDate },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      })

      const totalSpent = Math.abs(Number(spent._sum.amount || 0))

      return {
        totalBudgeted,
        totalSpent,
        remaining: totalBudgeted - totalSpent,
        budgetCount: budgets.length,
        percentageUsed: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
      }
    }),
})
