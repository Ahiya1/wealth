// src/server/api/routers/recurring.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { generatePendingRecurringTransactions } from '@/server/services/recurring.service'

export const recurringRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(RecurringTransactionStatus).optional(),
        accountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const recurringTransactions = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
          ...(input.accountId && { accountId: input.accountId }),
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })

      return recurringTransactions
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recurringTransaction = await ctx.prisma.recurringTransaction.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          account: true,
          generatedTransactions: {
            orderBy: {
              date: 'desc',
            },
            take: 10,
          },
        },
      })

      if (!recurringTransaction || recurringTransaction.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return recurringTransaction
    }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string().min(1, 'Account is required'),
        amount: z.number(),
        payee: z.string().min(1, 'Payee is required'),
        categoryId: z.string().min(1, 'Category is required'),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        frequency: z.nativeEnum(RecurrenceFrequency),
        interval: z.number().min(1).default(1),
        startDate: z.date(),
        endDate: z.date().optional(),
        dayOfMonth: z.number().min(-1).max(31).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.accountId },
      })

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      // Verify category exists
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.categoryId },
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }

      // Calculate next scheduled date based on frequency
      const nextScheduledDate = calculateNextDate(
        input.startDate,
        input.frequency,
        input.interval,
        input.dayOfMonth,
        input.dayOfWeek
      )

      const recurringTransaction = await ctx.prisma.recurringTransaction.create({
        data: {
          userId: ctx.user.id,
          accountId: input.accountId,
          amount: input.amount,
          payee: input.payee,
          categoryId: input.categoryId,
          notes: input.notes,
          tags: input.tags || [],
          frequency: input.frequency,
          interval: input.interval,
          startDate: input.startDate,
          endDate: input.endDate,
          dayOfMonth: input.dayOfMonth,
          dayOfWeek: input.dayOfWeek,
          nextScheduledDate,
          status: RecurringTransactionStatus.ACTIVE,
        },
        include: {
          category: true,
          account: true,
        },
      })

      // Automatically generate any pending transactions
      await generatePendingRecurringTransactions().catch((error) => {
        console.error('Failed to generate pending transactions:', error)
        // Don't throw - we still want to return the created recurring transaction
      })

      return recurringTransaction
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().optional(),
        payee: z.string().min(1).optional(),
        categoryId: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        frequency: z.nativeEnum(RecurrenceFrequency).optional(),
        interval: z.number().min(1).optional(),
        endDate: z.date().optional().nullable(),
        dayOfMonth: z.number().min(-1).max(31).optional().nullable(),
        dayOfWeek: z.number().min(0).max(6).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringTransaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // If categoryId is being updated, verify it exists
      if (input.categoryId) {
        const category = await ctx.prisma.category.findUnique({
          where: { id: input.categoryId },
        })

        if (!category) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found',
          })
        }
      }

      // Recalculate next scheduled date if frequency/interval changed
      let nextScheduledDate = existing.nextScheduledDate
      if (
        input.frequency ||
        input.interval ||
        input.dayOfMonth !== undefined ||
        input.dayOfWeek !== undefined
      ) {
        nextScheduledDate = calculateNextDate(
          existing.lastGeneratedDate || existing.startDate,
          input.frequency || existing.frequency,
          input.interval || existing.interval,
          input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
          input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek
        )
      }

      const recurringTransaction = await ctx.prisma.recurringTransaction.update({
        where: { id: input.id },
        data: {
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.payee && { payee: input.payee }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.tags && { tags: input.tags }),
          ...(input.frequency && { frequency: input.frequency }),
          ...(input.interval && { interval: input.interval }),
          ...(input.endDate !== undefined && { endDate: input.endDate }),
          ...(input.dayOfMonth !== undefined && { dayOfMonth: input.dayOfMonth }),
          ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
          nextScheduledDate,
        },
        include: {
          category: true,
          account: true,
        },
      })

      return recurringTransaction
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringTransaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.recurringTransaction.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringTransaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const recurringTransaction = await ctx.prisma.recurringTransaction.update({
        where: { id: input.id },
        data: {
          status: RecurringTransactionStatus.PAUSED,
        },
        include: {
          category: true,
          account: true,
        },
      })

      return recurringTransaction
    }),

  resume: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringTransaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const recurringTransaction = await ctx.prisma.recurringTransaction.update({
        where: { id: input.id },
        data: {
          status: RecurringTransactionStatus.ACTIVE,
        },
        include: {
          category: true,
          account: true,
        },
      })

      // Automatically generate any pending transactions (especially useful when resuming a paused transaction)
      await generatePendingRecurringTransactions().catch((error) => {
        console.error('Failed to generate pending transactions:', error)
        // Don't throw - we still want to return the resumed recurring transaction
      })

      return recurringTransaction
    }),

  getUpcoming: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + input.days)

      const recurringTransactions = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: {
            lte: endDate,
          },
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })

      return recurringTransactions
    }),

  // Manually generate pending transactions (for testing or manual trigger)
  generatePending: protectedProcedure.mutation(async ({ ctx }) => {
    const { generateRecurringTransactionsForUser } = await import(
      '@/server/services/recurring.service'
    )
    const results = await generateRecurringTransactionsForUser(ctx.user.id)
    return results
  }),
})

// Helper function to calculate next scheduled date
function calculateNextDate(
  fromDate: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const nextDate = new Date(fromDate)

  switch (frequency) {
    case RecurrenceFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + interval)
      break

    case RecurrenceFrequency.WEEKLY:
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        // Find next occurrence of the specified day of week
        const currentDay = nextDate.getDay()
        const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7 || 7
        nextDate.setDate(nextDate.getDate() + daysUntilTarget)
      } else {
        nextDate.setDate(nextDate.getDate() + interval * 7)
      }
      break

    case RecurrenceFrequency.BIWEEKLY:
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay()
        const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7 || 7
        nextDate.setDate(nextDate.getDate() + daysUntilTarget + (interval - 1) * 14)
      } else {
        nextDate.setDate(nextDate.getDate() + interval * 14)
      }
      break

    case RecurrenceFrequency.MONTHLY:
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        if (dayOfMonth === -1) {
          // Last day of month
          nextDate.setMonth(nextDate.getMonth() + interval)
          nextDate.setDate(0) // Sets to last day of previous month
        } else {
          nextDate.setMonth(nextDate.getMonth() + interval)
          nextDate.setDate(dayOfMonth)
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + interval)
      }
      break

    case RecurrenceFrequency.YEARLY:
      nextDate.setFullYear(nextDate.getFullYear() + interval)
      break
  }

  return nextDate
}
