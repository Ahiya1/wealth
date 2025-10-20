import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { AccountType } from '@prisma/client'

export const accountsRouter = router({
  // List all user accounts (active by default)
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return accounts
    }),

  // Get single account
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.id },
      })

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return account
    }),

  // Create manual account
  create: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(AccountType),
        name: z.string().min(1, 'Account name is required'),
        institution: z.string().min(1, 'Institution name is required'),
        balance: z.number().default(0),
        currency: z.string().default('USD'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          name: input.name,
          institution: input.institution,
          balance: input.balance,
          currency: input.currency,
          isManual: true,
        },
      })

      return account
    }),

  // Update account
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        institution: z.string().min(1).optional(),
        balance: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.account.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const account = await ctx.prisma.account.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.institution && { institution: input.institution }),
          ...(input.balance !== undefined && { balance: input.balance }),
        },
      })

      return account
    }),

  // Manually update account balance
  updateBalance: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        balance: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.account.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const account = await ctx.prisma.account.update({
        where: { id: input.id },
        data: {
          balance: input.balance,
        },
      })

      return account
    }),

  // Archive account (soft delete)
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.account.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const account = await ctx.prisma.account.update({
        where: { id: input.id },
        data: {
          isActive: false,
        },
      })

      return account
    }),

  // Calculate net worth (sum of all active account balances)
  netWorth: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.account.findMany({
      where: {
        userId: ctx.user.id,
        isActive: true,
      },
    })

    const netWorth = accounts.reduce((sum, account) => {
      return sum + Number(account.balance)
    }, 0)

    return {
      netWorth,
      accountCount: accounts.length,
      accountsByType: accounts.reduce((acc, account) => {
        const type = account.type
        if (!acc[type]) {
          acc[type] = { count: 0, total: 0 }
        }
        acc[type].count++
        acc[type].total += Number(account.balance)
        return acc
      }, {} as Record<string, { count: number; total: number }>),
    }
  }),
})
