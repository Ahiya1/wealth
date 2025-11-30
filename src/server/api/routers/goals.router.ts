// src/server/api/routers/goals.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { differenceInDays, addDays, subDays } from 'date-fns'

export const goalsRouter = router({
  // List all goals (optionally include completed)
  list: protectedProcedure
    .input(
      z.object({
        includeCompleted: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.goal.findMany({
        where: {
          userId: ctx.user!.id,
          ...(input.includeCompleted ? {} : { isCompleted: false }),
        },
        include: { linkedAccount: true },
        orderBy: { targetDate: 'asc' },
      })
    }),

  // Get single goal by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({
        where: { id: input.id },
        include: { linkedAccount: true },
      })

      if (!goal || goal.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return goal
    }),

  // Create new goal
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Goal name is required'),
        targetAmount: z.number().positive('Target amount must be positive'),
        currentAmount: z.number().min(0, 'Current amount cannot be negative').default(0),
        targetDate: z.date(),
        linkedAccountId: z.string().optional(),
        type: z.enum(['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT']).default('SAVINGS'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.goal.create({
        data: {
          userId: ctx.user!.id,
          name: input.name,
          targetAmount: input.targetAmount,
          currentAmount: input.currentAmount,
          targetDate: input.targetDate,
          linkedAccountId: input.linkedAccountId,
          type: input.type,
        },
        include: { linkedAccount: true },
      })
    }),

  // Update goal
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        targetAmount: z.number().positive().optional(),
        currentAmount: z.number().min(0).optional(),
        targetDate: z.date().optional(),
        linkedAccountId: z.string().optional(),
        type: z.enum(['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.goal.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const goal = await ctx.prisma.goal.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.targetAmount !== undefined && { targetAmount: input.targetAmount }),
          ...(input.currentAmount !== undefined && { currentAmount: input.currentAmount }),
          ...(input.targetDate && { targetDate: input.targetDate }),
          ...(input.linkedAccountId !== undefined && { linkedAccountId: input.linkedAccountId }),
          ...(input.type && { type: input.type }),
        },
        include: { linkedAccount: true },
      })

      return goal
    }),

  // Update progress
  updateProgress: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        currentAmount: z.number().min(0, 'Current amount cannot be negative'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({
        where: { id: input.goalId },
      })

      if (!goal || goal.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const isCompleted = input.currentAmount >= Number(goal.targetAmount)

      return ctx.prisma.goal.update({
        where: { id: input.goalId },
        data: {
          currentAmount: input.currentAmount,
          isCompleted,
          completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt,
        },
        include: { linkedAccount: true },
      })
    }),

  // Delete goal
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.goal.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.goal.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get goal projections and analytics
  projections: protectedProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({
        where: { id: input.goalId },
        include: { linkedAccount: true },
      })

      if (!goal || goal.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const currentAmount = Number(goal.currentAmount)
      const targetAmount = Number(goal.targetAmount)
      const remaining = targetAmount - currentAmount
      const daysUntilTarget = differenceInDays(goal.targetDate, new Date())
      const percentComplete = (currentAmount / targetAmount) * 100

      // Calculate recent savings rate (last 90 days)
      const ninetyDaysAgo = subDays(new Date(), 90)
      let savingsRate = 0
      let projectedDate: Date | null = null
      let onTrack = false

      if (goal.linkedAccountId) {
        const deposits = await ctx.prisma.transaction.aggregate({
          where: {
            userId: ctx.user!.id,
            accountId: goal.linkedAccountId,
            date: { gte: ninetyDaysAgo },
            amount: { gt: 0 }, // Only deposits
          },
          _sum: { amount: true },
        })

        savingsRate = Number(deposits._sum.amount || 0) / 90 // Per day

        if (savingsRate > 0) {
          const projectedDays = Math.ceil(remaining / savingsRate)
          projectedDate = addDays(new Date(), projectedDays)
          onTrack = projectedDate <= goal.targetDate
        }
      }

      const suggestedMonthlyContribution =
        daysUntilTarget > 0 ? remaining / (daysUntilTarget / 30) : 0

      return {
        goal,
        remaining,
        daysUntilTarget,
        projectedDate,
        onTrack,
        percentComplete: Math.min(percentComplete, 100),
        suggestedMonthlyContribution,
        dailySavingsRate: savingsRate,
      }
    }),
})
