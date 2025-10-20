// src/server/api/routers/currency.router.ts
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { fetchExchangeRate, convertUserCurrency } from '@/server/services/currency.service'

// Zod schemas for input validation
const currencyCodeSchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'CNY',
  'INR',
  'BRL',
])

export const currencyRouter = router({
  /**
   * Get list of supported currencies (public endpoint)
   */
  getSupportedCurrencies: publicProcedure.query(() => {
    return SUPPORTED_CURRENCIES.map((currency) => ({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
    }))
  }),

  /**
   * Get exchange rate between two currencies
   * Used for preview before conversion
   */
  getExchangeRate: protectedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3, 'Currency code must be 3 characters'),
        toCurrency: z.string().length(3, 'Currency code must be 3 characters'),
        date: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Validate currencies are supported
      const supportedCodes = SUPPORTED_CURRENCIES.map((c) => c.code) as string[]
      if (!supportedCodes.includes(input.fromCurrency)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency: ${input.fromCurrency}`,
        })
      }
      if (!supportedCodes.includes(input.toCurrency)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency: ${input.toCurrency}`,
        })
      }

      // Prevent same currency conversion
      if (input.fromCurrency === input.toCurrency) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot convert currency to itself',
        })
      }

      // Validate date is not in future
      if (input.date && input.date > new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot fetch exchange rates for future dates',
        })
      }

      try {
        const rate = await fetchExchangeRate(
          input.fromCurrency,
          input.toCurrency,
          input.date,
          ctx.prisma
        )

        return {
          fromCurrency: input.fromCurrency,
          toCurrency: input.toCurrency,
          rate: rate.toString(), // Convert Decimal to string for JSON
          date: input.date || new Date(),
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error // Already formatted
        }

        // eslint-disable-next-line no-console
        console.error('Unexpected error fetching exchange rate:', error)
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Unable to fetch exchange rates at this time. Please try again.',
        })
      }
    }),

  /**
   * Convert user's currency - main mutation
   * Converts all transactions, accounts, budgets, and goals
   */
  convertCurrency: protectedProcedure
    .input(
      z.object({
        toCurrency: currencyCodeSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch user to get current currency
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, currency: true },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Prevent conversion to same currency
      if (user.currency === input.toCurrency) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Currency is already set to ${input.toCurrency}`,
        })
      }

      // Check for existing IN_PROGRESS conversion (lock mechanism)
      const existingConversion = await ctx.prisma.currencyConversionLog.findFirst(
        {
          where: {
            userId: ctx.user.id,
            status: 'IN_PROGRESS',
          },
        }
      )

      if (existingConversion) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Currency conversion already in progress. Please wait for it to complete.',
        })
      }

      try {
        const result = await convertUserCurrency(
          ctx.user.id,
          user.currency,
          input.toCurrency,
          ctx.prisma
        )

        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error // Already formatted
        }

        // eslint-disable-next-line no-console
        console.error('Unexpected conversion error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Currency conversion failed. Please try again.',
        })
      }
    }),

  /**
   * Get user's conversion history
   * Returns last 10 conversion logs
   */
  getConversionHistory: protectedProcedure.query(async ({ ctx }) => {
    const logs = await ctx.prisma.currencyConversionLog.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: 'desc' },
      take: 10,
    })

    return logs.map((log) => ({
      id: log.id,
      fromCurrency: log.fromCurrency,
      toCurrency: log.toCurrency,
      exchangeRate: log.exchangeRate.toString(), // Convert Decimal to string
      status: log.status,
      errorMessage: log.errorMessage,
      transactionCount: log.transactionCount,
      accountCount: log.accountCount,
      budgetCount: log.budgetCount,
      goalCount: log.goalCount,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      durationMs: log.durationMs,
    }))
  }),

  /**
   * Get current conversion status
   * Used for polling during conversion
   */
  getConversionStatus: protectedProcedure.query(async ({ ctx }) => {
    const inProgress = await ctx.prisma.currencyConversionLog.findFirst({
      where: {
        userId: ctx.user.id,
        status: 'IN_PROGRESS',
      },
      orderBy: { startedAt: 'desc' },
    })

    if (inProgress) {
      return {
        status: 'IN_PROGRESS' as const,
        fromCurrency: inProgress.fromCurrency,
        toCurrency: inProgress.toCurrency,
        startedAt: inProgress.startedAt,
      }
    }

    return {
      status: 'IDLE' as const,
    }
  }),
})
