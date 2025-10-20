// src/server/services/currency.service.ts
import { type PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { TRPCError } from '@trpc/server'

const RATE_CACHE_TTL_HOURS = 24

// Helper to get API key (allows for better testing)
function getApiKey(): string | undefined {
  return process.env.EXCHANGE_RATE_API_KEY
}

/**
 * Result type for currency conversion
 */
export interface ConversionResult {
  success: boolean
  logId: string
  transactionCount: number
  accountCount: number
  budgetCount: number
  goalCount: number
}

/**
 * Fetch exchange rate with caching
 * Uses 24-hour TTL for current rates, indefinite for historical rates
 */
export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: Date,
  prisma?: PrismaClient
): Promise<Decimal> {
  // Import prisma if not provided
  const db = prisma || (await import('@/lib/prisma')).prisma

  const targetDate = date || new Date()
  // Normalize date to start of day for consistent caching
  targetDate.setHours(0, 0, 0, 0)

  // 1. Check cache first
  const cached = await db.exchangeRate.findUnique({
    where: {
      date_fromCurrency_toCurrency: {
        date: targetDate,
        fromCurrency,
        toCurrency,
      },
    },
  })

  // 2. Return cached rate if not expired
  if (cached && cached.expiresAt > new Date()) {
    return cached.rate
  }

  // 3. Fetch from external API
  const apiRate = await fetchRateFromAPI(fromCurrency, toCurrency, targetDate, db)

  // 4. Cache for future use
  const expiresAt = new Date()

  // Historical rates (older than today) never expire
  // Current rates expire after 24 hours
  if (targetDate < new Date(new Date().setHours(0, 0, 0, 0))) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 10) // 10 years for historical
  } else {
    expiresAt.setHours(expiresAt.getHours() + RATE_CACHE_TTL_HOURS)
  }

  await db.exchangeRate.upsert({
    where: {
      date_fromCurrency_toCurrency: {
        date: targetDate,
        fromCurrency,
        toCurrency,
      },
    },
    create: {
      date: targetDate,
      fromCurrency,
      toCurrency,
      rate: apiRate,
      expiresAt,
    },
    update: {
      rate: apiRate,
      expiresAt,
    },
  })

  return apiRate
}

/**
 * Fetch exchange rate from external API with retry logic
 */
async function fetchRateFromAPI(
  fromCurrency: string,
  toCurrency: string,
  date?: Date,
  prisma?: PrismaClient
): Promise<Decimal> {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Exchange rate API key not configured',
    })
  }

  // Build API URL based on whether we need historical or current rate
  let url: string
  if (date && date < new Date(new Date().setHours(0, 0, 0, 0))) {
    // Historical rate
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    url = `https://v6.exchangerate-api.com/v6/${apiKey}/history/${fromCurrency}/${year}/${month}/${day}`
  } else {
    // Current rate
    url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`
  }

  try {
    const response = await fetchWithRetry(url, 3)
    const data = await response.json()

    if (data.result !== 'success') {
      throw new Error(`Exchange rate API error: ${data['error-type'] || 'Unknown error'}`)
    }

    const rate = data.conversion_rates?.[toCurrency]
    if (!rate) {
      throw new Error(`No conversion rate found for ${fromCurrency} to ${toCurrency}`)
    }

    return new Decimal(rate)
  } catch (error) {
    // Log error server-side
    console.error('Exchange rate API error:', error)

    // Try fallback: use most recent cached rate
    const db = prisma || (await import('@/lib/prisma')).prisma
    const cachedRate = await db.exchangeRate.findFirst({
      where: { fromCurrency, toCurrency },
      orderBy: { createdAt: 'desc' },
    })

    if (cachedRate) {
      const daysOld = Math.floor(
        (Date.now() - cachedRate.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysOld < 7) {
        console.warn(`Using cached rate (${daysOld} days old)`)
        return cachedRate.rate
      }
    }

    // No fallback available, throw user-friendly error
    throw new TRPCError({
      code: 'SERVICE_UNAVAILABLE',
      message:
        'Unable to fetch exchange rates at this time. Please try again in a few minutes.',
    })
  }
}

/**
 * Retry logic with exponential backoff
 */
async function fetchWithRetry(url: string, maxRetries: number): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      const isLastAttempt = attempt === maxRetries

      if (isLastAttempt) {
        throw new Error(
          `Failed to fetch exchange rate after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }

      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Should not reach here')
}

/**
 * Batch fetch historical rates for all transaction dates
 * Optimizes from 1,000+ API calls to 30-90 API calls
 */
async function fetchHistoricalRatesForTransactions(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  prisma: PrismaClient
): Promise<Map<string, Decimal>> {
  // 1. Get unique transaction dates
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
  })

  // Extract unique dates (YYYY-MM-DD format)
  const uniqueDates = [
    ...new Set(
      transactions.map((t) => {
        const d = new Date(t.date)
        d.setHours(0, 0, 0, 0)
        return d.toISOString().split('T')[0]
      })
    ),
  ]

  // 2. Fetch rates for each unique date in parallel
  const rateMap = new Map<string, Decimal>()

  await Promise.all(
    uniqueDates.map(async (dateStr) => {
      if (!dateStr) return
      const date = new Date(dateStr)
      const rate = await fetchExchangeRate(fromCurrency, toCurrency, date, prisma)
      rateMap.set(date.toISOString(), rate)
    })
  )

  return rateMap
}

/**
 * Main currency conversion function
 * Converts all user financial data atomically using Prisma transaction
 */
export async function convertUserCurrency(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  prisma: PrismaClient
): Promise<ConversionResult> {
  // 1. Pre-flight checks (outside transaction for performance)
  const existingConversion = await prisma.currencyConversionLog.findFirst({
    where: { userId, status: 'IN_PROGRESS' },
  })

  if (existingConversion) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Currency conversion already in progress',
    })
  }

  // 2. Create conversion log (establishes lock)
  const log = await prisma.currencyConversionLog.create({
    data: {
      userId,
      fromCurrency,
      toCurrency,
      status: 'IN_PROGRESS',
      exchangeRate: new Decimal(0), // Will be updated
    },
  })

  const startTime = Date.now()

  try {
    // 3. Fetch exchange rates (outside transaction to avoid long-running transaction)
    const currentRate = await fetchExchangeRate(fromCurrency, toCurrency, undefined, prisma)
    const historicalRates = await fetchHistoricalRatesForTransactions(
      userId,
      fromCurrency,
      toCurrency,
      prisma
    )

    // 4. Atomic conversion in transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Convert transactions (using historical rates for accuracy)
        const transactions = await tx.transaction.findMany({
          where: { userId },
        })

        for (const txn of transactions) {
          const txnDate = new Date(txn.date)
          txnDate.setHours(0, 0, 0, 0)
          const historicalRate = historicalRates.get(txnDate.toISOString()) || currentRate

          await tx.transaction.update({
            where: { id: txn.id },
            data: {
              amount: txn.amount.mul(historicalRate),
            },
          })
        }

        // Convert accounts (current rate + set originalCurrency for Plaid accounts)
        const accounts = await tx.account.findMany({ where: { userId } })

        for (const account of accounts) {
          await tx.account.update({
            where: { id: account.id },
            data: {
              balance: account.balance.mul(currentRate),
              // Set originalCurrency for Plaid accounts
              originalCurrency: account.plaidAccountId ? fromCurrency : null,
            },
          })
        }

        // Convert budgets (current rate)
        const budgets = await tx.budget.findMany({ where: { userId } })

        for (const budget of budgets) {
          await tx.budget.update({
            where: { id: budget.id },
            data: {
              amount: budget.amount.mul(currentRate),
            },
          })
        }

        // Convert goals (current rate)
        const goals = await tx.goal.findMany({ where: { userId } })

        for (const goal of goals) {
          await tx.goal.update({
            where: { id: goal.id },
            data: {
              targetAmount: goal.targetAmount.mul(currentRate),
              currentAmount: goal.currentAmount.mul(currentRate),
            },
          })
        }

        // Update user currency
        await tx.user.update({
          where: { id: userId },
          data: { currency: toCurrency },
        })

        const durationMs = Date.now() - startTime

        // Mark conversion complete
        await tx.currencyConversionLog.update({
          where: { id: log.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            durationMs,
            transactionCount: transactions.length,
            accountCount: accounts.length,
            budgetCount: budgets.length,
            goalCount: goals.length,
            exchangeRate: currentRate,
          },
        })

        return {
          success: true,
          logId: log.id,
          transactionCount: transactions.length,
          accountCount: accounts.length,
          budgetCount: budgets.length,
          goalCount: goals.length,
        }
      },
      {
        maxWait: 10000, // 10 seconds max wait to acquire transaction
        timeout: 60000, // 60 seconds max execution time
      }
    )

    return result
  } catch (error) {
    // 5. Error handling: Mark conversion as failed
    const durationMs = Date.now() - startTime

    await prisma.currencyConversionLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
        durationMs,
      },
    })

    throw error // Re-throw for tRPC error handling
  }
}
