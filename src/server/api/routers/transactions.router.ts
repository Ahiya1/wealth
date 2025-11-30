// src/server/api/routers/transactions.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  categorizeTransactions,
  categorizeSingleTransaction,
  getCategorizationStats,
} from '@/server/services/categorize.service'

export const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user!.id,
          ...(input.accountId && { accountId: input.accountId }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...((input.startDate || input.endDate) && {
            date: {
              ...(input.startDate && { gte: input.startDate }),
              ...(input.endDate && { lte: input.endDate }),
            },
          }),
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: {
            id: input.cursor,
          },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined = undefined
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop()
        nextCursor = nextItem!.id
      }

      return {
        transactions,
        nextCursor,
      }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          account: true,
        },
      })

      if (!transaction || transaction.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return transaction
    }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string().min(1, 'Account is required'),
        date: z.date(),
        amount: z.number(),
        payee: z.string().min(1, 'Payee is required'),
        categoryId: z.string().min(1, 'Category is required'),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.accountId },
      })

      if (!account || account.userId !== ctx.user!.id) {
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

      // Create transaction and update account balance in a transaction
      const transaction = await ctx.prisma.$transaction(async (prisma) => {
        // Create the transaction
        const newTransaction = await prisma.transaction.create({
          data: {
            userId: ctx.user!.id,
            accountId: input.accountId,
            date: input.date,
            amount: input.amount,
            payee: input.payee,
            categoryId: input.categoryId,
            notes: input.notes,
            tags: input.tags || [],
            isManual: true,
          },
          include: {
            category: true,
            account: true,
          },
        })

        // Update account balance
        // Positive amounts (income) increase balance
        // Negative amounts (expenses) decrease balance
        await prisma.account.update({
          where: { id: input.accountId },
          data: {
            balance: {
              increment: input.amount,
            },
          },
        })

        return newTransaction
      })

      return transaction
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.date().optional(),
        amount: z.number().optional(),
        payee: z.string().min(1).optional(),
        categoryId: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user!.id) {
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

      // Update transaction and adjust account balance if amount changed
      const transaction = await ctx.prisma.$transaction(async (prisma) => {
        const updatedTransaction = await prisma.transaction.update({
          where: { id: input.id },
          data: {
            ...(input.date && { date: input.date }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.payee && { payee: input.payee }),
            ...(input.categoryId && { categoryId: input.categoryId }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.tags && { tags: input.tags }),
          },
          include: {
            category: true,
            account: true,
          },
        })

        // If amount changed, update account balance
        if (input.amount !== undefined) {
          const oldAmount = existing.amount.toNumber()
          const newAmount = input.amount
          const balanceDiff = newAmount - oldAmount

          // Adjust account balance by the difference
          await prisma.account.update({
            where: { id: existing.accountId },
            data: {
              balance: {
                increment: balanceDiff,
              },
            },
          })
        }

        return updatedTransaction
      })

      return transaction
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Delete transaction and reverse its effect on account balance
      await ctx.prisma.$transaction(async (prisma) => {
        // Delete the transaction
        await prisma.transaction.delete({
          where: { id: input.id },
        })

        // Reverse the transaction's effect on the account balance
        // Subtract the transaction amount (which reverses the original operation)
        await prisma.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              decrement: existing.amount.toNumber(),
            },
          },
        })
      })

      return { success: true }
    }),

  // ============================================================================
  // AI CATEGORIZATION - Builder-5C
  // ============================================================================

  /**
   * Categorize a single transaction using Claude AI
   */
  categorize: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findUnique({
        where: { id: input.transactionId },
      })

      if (!transaction || transaction.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
      }

      // Get category suggestion from AI
      const result = await categorizeSingleTransaction(
        ctx.user!.id,
        transaction.payee,
        transaction.amount.toNumber(),
        ctx.prisma
      )

      // Update transaction with suggested category (if found)
      if (result.categoryId) {
        const updated = await ctx.prisma.transaction.update({
          where: { id: input.transactionId },
          data: { categoryId: result.categoryId },
          include: {
            category: true,
            account: true,
          },
        })

        return {
          transaction: updated,
          categoryName: result.categoryName,
          applied: true,
        }
      }

      return {
        transaction,
        categoryName: result.categoryName,
        applied: false,
      }
    }),

  /**
   * Categorize multiple transactions in batch
   */
  categorizeBatch: protectedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.string()).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all transactions belong to user
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          id: { in: input.transactionIds },
          userId: ctx.user!.id,
        },
      })

      if (transactions.length !== input.transactionIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Some transactions not found',
        })
      }

      // Prepare transactions for categorization
      const txnsToCategorize = transactions.map((t) => ({
        id: t.id,
        payee: t.payee,
        amount: t.amount.toNumber(),
      }))

      // Get categorizations from AI
      const results = await categorizeTransactions(
        ctx.user!.id,
        txnsToCategorize,
        ctx.prisma
      )

      // Update transactions with categories
      const updatePromises = results
        .filter((r) => r.categoryId !== null)
        .map((r) =>
          ctx.prisma.transaction.update({
            where: { id: r.transactionId },
            data: { categoryId: r.categoryId! },
          })
        )

      await Promise.all(updatePromises)

      return {
        total: transactions.length,
        categorized: results.filter((r) => r.categoryId !== null).length,
        results: results.map((r) => ({
          transactionId: r.transactionId,
          categoryName: r.categoryName,
          confidence: r.confidence,
        })),
      }
    }),

  /**
   * Auto-categorize all uncategorized transactions
   * (Transactions with categoryId pointing to "Miscellaneous" or null)
   */
  autoCategorizeUncategorized: protectedProcedure.mutation(async ({ ctx }) => {
    // Find Miscellaneous category ID
    const miscCategory = await ctx.prisma.category.findFirst({
      where: {
        name: 'Miscellaneous',
        isDefault: true,
        userId: null,
      },
    })

    if (!miscCategory) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Miscellaneous category not found',
      })
    }

    // Find all uncategorized transactions
    const uncategorizedTransactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.user!.id,
        categoryId: miscCategory.id,
      },
      take: 100, // Limit to 100 at a time to avoid API cost explosion
      orderBy: { date: 'desc' },
    })

    if (uncategorizedTransactions.length === 0) {
      return {
        total: 0,
        categorized: 0,
        message: 'No uncategorized transactions found',
      }
    }

    // Prepare transactions for categorization
    const txnsToCategorize = uncategorizedTransactions.map((t) => ({
      id: t.id,
      payee: t.payee,
      amount: t.amount.toNumber(),
    }))

    // Get categorizations from AI
    const results = await categorizeTransactions(
      ctx.user!.id,
      txnsToCategorize,
      ctx.prisma
    )

    // Update transactions with categories (only if different from Miscellaneous)
    const updatePromises = results
      .filter((r) => r.categoryId !== null && r.categoryId !== miscCategory.id)
      .map((r) =>
        ctx.prisma.transaction.update({
          where: { id: r.transactionId },
          data: { categoryId: r.categoryId! },
        })
      )

    await Promise.all(updatePromises)

    const categorizedCount = results.filter(
      (r) => r.categoryId !== null && r.categoryId !== miscCategory.id
    ).length

    return {
      total: uncategorizedTransactions.length,
      categorized: categorizedCount,
      message: `Categorized ${categorizedCount} out of ${uncategorizedTransactions.length} transactions`,
    }
  }),

  /**
   * Get suggestion for a transaction without applying it
   */
  suggestCategory: protectedProcedure
    .input(
      z.object({
        payee: z.string().min(1),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await categorizeSingleTransaction(
        ctx.user!.id,
        input.payee,
        input.amount,
        ctx.prisma
      )

      return {
        categoryName: result.categoryName,
        categoryId: result.categoryId,
      }
    }),

  /**
   * Get categorization statistics
   */
  categorizationStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getCategorizationStats(ctx.user!.id, ctx.prisma)

    return stats
  }),
})
