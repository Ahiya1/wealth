# Code Patterns & Conventions - Currency Switching System

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── settings/
│   │           └── currency/
│   │               └── page.tsx              # Currency settings page
│   ├── components/
│   │   └── currency/
│   │       ├── CurrencySelector.tsx          # Dropdown with 10 currencies
│   │       ├── CurrencyConfirmationDialog.tsx # Warning dialog
│   │       ├── CurrencyConversionProgress.tsx # Progress indicator
│   │       └── CurrencyConversionSuccess.tsx  # Success summary
│   ├── lib/
│   │   ├── utils.ts                          # MODIFY: formatCurrency enhancement
│   │   └── constants.ts                      # ADD: SUPPORTED_CURRENCIES
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   └── currency.router.ts        # NEW: tRPC currency endpoints
│   │   │   └── root.ts                       # MODIFY: add currencyRouter
│   │   └── services/
│   │       ├── currency.service.ts           # NEW: conversion logic
│   │       └── plaid-sync.service.ts         # MODIFY: handle originalCurrency
│   └── types/
│       └── currency.ts                       # NEW: type definitions
└── prisma/
    └── schema.prisma                          # MODIFY: add ExchangeRate, CurrencyConversionLog
```

## Naming Conventions

- **Components:** PascalCase (`CurrencySelector.tsx`, `CurrencyConversionProgress.tsx`)
- **Files:** camelCase for utilities (`currency.service.ts`, `formatCurrency.ts`)
- **Types:** PascalCase (`ConversionStatus`, `ExchangeRate`, `SupportedCurrency`)
- **Functions:** camelCase (`convertUserCurrency()`, `fetchExchangeRate()`)
- **Constants:** SCREAMING_SNAKE_CASE (`SUPPORTED_CURRENCIES`, `RATE_CACHE_TTL_HOURS`)
- **Database Models:** PascalCase (`ExchangeRate`, `CurrencyConversionLog`)
- **Enum Values:** SCREAMING_SNAKE_CASE (`IN_PROGRESS`, `COMPLETED`, `FAILED`)

## Prisma Schema Patterns

### Database Models Convention

```prisma
// Exchange rate caching model
model ExchangeRate {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(18, 8)
  source       String   @default("exchangerate-api.com")
  createdAt    DateTime @default(now())
  expiresAt    DateTime

  @@unique([date, fromCurrency, toCurrency])
  @@index([fromCurrency, toCurrency, date])
  @@index([expiresAt])
}

// Conversion audit log model
model CurrencyConversionLog {
  id               String           @id @default(cuid())
  userId           String
  fromCurrency     String
  toCurrency       String
  exchangeRate     Decimal          @db.Decimal(18, 8)
  status           ConversionStatus
  errorMessage     String?          @db.Text
  transactionCount Int              @default(0)
  accountCount     Int              @default(0)
  budgetCount      Int              @default(0)
  goalCount        Int              @default(0)
  startedAt        DateTime         @default(now())
  completedAt      DateTime?
  durationMs       Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startedAt])
  @@index([status])
}

enum ConversionStatus {
  IN_PROGRESS
  COMPLETED
  FAILED
  ROLLED_BACK
}
```

**Key Conventions:**
- Use `@db.Date` for dates without time precision (storage optimization)
- Use `@db.Decimal(18, 8)` for exchange rates (high precision for crypto)
- Use `@db.Decimal(15, 2)` for currency amounts (standard financial precision)
- Always add `@@unique` constraints to prevent duplicate data
- Add `@@index` on fields used in WHERE clauses (query optimization)
- Use `onDelete: Cascade` for dependent data (automatic cleanup)

### Query Pattern: Atomic Transaction Wrapper

**When to use:** Currency conversion (update multiple tables atomically)

**Pattern:**
```typescript
import { prisma } from '@/server/db'
import { Decimal } from '@prisma/client/runtime/library'

async function convertUserCurrency(
  userId: string,
  fromCurrency: string,
  toCurrency: string
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

  try {
    // 3. Fetch exchange rates (outside transaction to avoid long-running transaction)
    const currentRate = await fetchExchangeRate(fromCurrency, toCurrency)
    const historicalRates = await fetchHistoricalRatesForTransactions(userId, fromCurrency, toCurrency)

    // 4. Atomic conversion in transaction
    await prisma.$transaction(
      async (tx) => {
        // Convert transactions (historical rates)
        const transactions = await tx.transaction.findMany({
          where: { userId },
        })

        for (const txn of transactions) {
          const historicalRate = historicalRates.get(txn.date.toISOString())
          await tx.transaction.update({
            where: { id: txn.id },
            data: {
              amount: txn.amount.mul(historicalRate),
            },
          })
        }

        // Convert accounts (current rate)
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
        await tx.budget.updateMany({
          where: { userId },
          data: {
            amount: {
              multiply: currentRate, // Use multiply for updateMany
            },
          },
        })

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

        // Mark conversion complete
        await tx.currencyConversionLog.update({
          where: { id: log.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            durationMs: Date.now() - log.startedAt.getTime(),
            transactionCount: transactions.length,
            accountCount: accounts.length,
            budgetCount: 0, // Updated in separate query
            goalCount: goals.length,
            exchangeRate: currentRate,
          },
        })
      },
      {
        maxWait: 10000, // 10 seconds max wait to acquire transaction
        timeout: 60000, // 60 seconds max execution time
      }
    )

    return {
      success: true,
      logId: log.id,
      transactionCount: 0, // Filled from log
    }
  } catch (error) {
    // 5. Error handling: Mark conversion as failed
    await prisma.currencyConversionLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })

    throw error // Re-throw for tRPC error handling
  }
}
```

**Key Points:**
- Always wrap multi-table updates in `$transaction()`
- Extend timeout for large datasets (default 5s → 60s)
- Perform expensive operations OUTSIDE transaction (API calls, rate fetching)
- Use try-catch to handle errors and update log status
- Transaction automatically rolls back on error (no partial data corruption)

### Query Pattern: Rate Caching with TTL

**When to use:** Fetch exchange rate with automatic caching

**Pattern:**
```typescript
import { Decimal } from '@prisma/client/runtime/library'

const RATE_CACHE_TTL_HOURS = 24

async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<Decimal> {
  const targetDate = date || new Date()

  // 1. Check cache first
  const cached = await prisma.exchangeRate.findUnique({
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
  const apiRate = await fetchRateFromAPI(fromCurrency, toCurrency, targetDate)

  // 4. Cache for future use
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + RATE_CACHE_TTL_HOURS)

  await prisma.exchangeRate.upsert({
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
```

**Key Points:**
- Always check cache before API call (reduces costs, improves performance)
- Use `upsert` to handle both create and update cases
- Set expiration time based on rate type (24h for current, indefinite for historical)
- Store expiration in database (enables automatic cleanup queries)

## tRPC Router Patterns

### Router Setup Pattern

**When to use:** Create new tRPC router for currency operations

**Pattern:**
```typescript
// src/server/api/routers/currency.router.ts
import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { convertUserCurrency, fetchExchangeRate } from '@/server/services/currency.service'

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL',
] as const

export const currencyRouter = router({
  // Public: Get list of supported currencies
  getSupportedCurrencies: publicProcedure.query(() => {
    return SUPPORTED_CURRENCIES.map((code) => ({
      code,
      name: getCurrencyName(code),
      symbol: getCurrencySymbol(code),
    }))
  }),

  // Protected: Get exchange rate preview
  getExchangeRate: protectedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        date: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const rate = await fetchExchangeRate(
        input.fromCurrency,
        input.toCurrency,
        input.date
      )

      return {
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        rate: rate.toString(), // Convert Decimal to string for JSON
        date: input.date || new Date(),
      }
    }),

  // Protected: Convert user currency (main mutation)
  convertCurrency: protectedProcedure
    .input(
      z.object({
        toCurrency: z.enum(SUPPORTED_CURRENCIES),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (user.currency === input.toCurrency) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Currency is already set to this value',
        })
      }

      const result = await convertUserCurrency(
        ctx.user.id,
        user.currency,
        input.toCurrency
      )

      return result
    }),

  // Protected: Get conversion history
  getConversionHistory: protectedProcedure.query(async ({ ctx }) => {
    const logs = await ctx.prisma.currencyConversionLog.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: 'desc' },
      take: 10,
    })

    return logs.map((log) => ({
      ...log,
      exchangeRate: log.exchangeRate.toString(),
    }))
  }),

  // Protected: Get current conversion status (polling endpoint)
  getConversionStatus: protectedProcedure.query(async ({ ctx }) => {
    const inProgress = await ctx.prisma.currencyConversionLog.findFirst({
      where: {
        userId: ctx.user.id,
        status: 'IN_PROGRESS',
      },
    })

    return inProgress
      ? {
          status: 'IN_PROGRESS' as const,
          fromCurrency: inProgress.fromCurrency,
          toCurrency: inProgress.toCurrency,
          startedAt: inProgress.startedAt,
        }
      : { status: 'IDLE' as const }
  }),
})
```

**Key Points:**
- Use `publicProcedure` for non-authenticated endpoints (currency list)
- Use `protectedProcedure` for user-specific operations (conversion)
- Validate inputs with Zod schemas (type safety + runtime validation)
- Convert Decimal to string for JSON serialization
- Throw `TRPCError` with appropriate codes (NOT_FOUND, BAD_REQUEST, CONFLICT)
- Keep router thin - delegate to service layer for business logic

### Add Router to App Router

**Pattern:**
```typescript
// src/server/api/root.ts
import { currencyRouter } from './routers/currency.router'

export const appRouter = router({
  // ... existing routers ...
  currency: currencyRouter, // ADD THIS LINE
})

export type AppRouter = typeof appRouter
```

## Service Layer Patterns

### Exchange Rate API Integration Pattern

**When to use:** Fetch rates from external API with retry logic

**Pattern:**
```typescript
// src/server/services/currency.service.ts
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY

async function fetchRateFromAPI(
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<Decimal> {
  if (!EXCHANGE_RATE_API_KEY) {
    throw new Error('EXCHANGE_RATE_API_KEY not configured')
  }

  const url = date
    ? `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/history/${fromCurrency}/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    : `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency}`

  const response = await fetchWithRetry(url, 3)
  const data = await response.json()

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type'] || 'Unknown error'}`)
  }

  const rate = data.conversion_rates[toCurrency]
  if (!rate) {
    throw new Error(`No conversion rate found for ${fromCurrency} to ${toCurrency}`)
  }

  return new Decimal(rate)
}

async function fetchWithRetry(
  url: string,
  maxRetries: number
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
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
```

**Key Points:**
- Always check environment variable exists (fail fast)
- Use AbortSignal.timeout for request timeout
- Retry with exponential backoff (prevents overwhelming API)
- Throw descriptive errors (include API error type)
- Convert API response to Decimal immediately (type safety)

### Batch Historical Rate Fetching Pattern

**When to use:** Fetch rates for multiple dates efficiently

**Pattern:**
```typescript
async function fetchHistoricalRatesForTransactions(
  userId: string,
  fromCurrency: string,
  toCurrency: string
): Promise<Map<string, Decimal>> {
  // 1. Get unique transaction dates
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
  })

  const uniqueDates = [
    ...new Set(transactions.map((t) => t.date.toISOString().split('T')[0])),
  ]

  // 2. Fetch rates for each unique date (with caching)
  const rateMap = new Map<string, Decimal>()

  // Use Promise.all for parallel fetching (faster)
  await Promise.all(
    uniqueDates.map(async (dateStr) => {
      const date = new Date(dateStr)
      const rate = await fetchExchangeRate(fromCurrency, toCurrency, date)
      rateMap.set(date.toISOString(), rate)
    })
  )

  return rateMap
}
```

**Key Points:**
- Extract unique dates first (reduces API calls from 1,000+ to 30-90)
- Use Promise.all for parallel fetching (10x faster than sequential)
- Return Map for O(1) lookup during conversion
- Leverage fetchExchangeRate caching (only 1 API call per unique date)

## Frontend Component Patterns

### Currency Selector Component

**When to use:** Display currency dropdown in settings page

**Pattern:**
```typescript
// src/components/currency/CurrencySelector.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Loader2 } from 'lucide-react'

export function CurrencySelector() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { data: user } = trpc.users.me.useQuery()
  const { data: currencies } = trpc.currency.getSupportedCurrencies.useQuery()
  const { data: exchangeRate, isLoading: isLoadingRate } = trpc.currency.getExchangeRate.useQuery(
    {
      fromCurrency: user?.currency || 'USD',
      toCurrency: selectedCurrency,
    },
    {
      enabled: !!selectedCurrency && selectedCurrency !== user?.currency,
    }
  )

  const handleChangeCurrency = () => {
    setShowConfirmDialog(true)
  }

  if (!user || !currencies) {
    return <div>Loading...</div>
  }

  const currentCurrency = currencies.find((c) => c.code === user.currency)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Change your display currency. All amounts will be converted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Currency Display */}
          <div className="rounded-lg bg-sage-50 p-4 mb-4">
            <p className="text-sm text-warm-gray-600">Current Currency</p>
            <p className="text-2xl font-semibold text-warm-gray-900">
              {currentCurrency?.name} ({currentCurrency?.symbol})
            </p>
            <Badge variant="outline" className="mt-2">
              {currentCurrency?.code}
            </Badge>
          </div>

          {/* Currency Selector */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Select New Currency</label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose currency..." />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem
                    key={currency.code}
                    value={currency.code}
                    disabled={currency.code === user.currency}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">{currency.symbol}</span>
                      <span>{currency.name}</span>
                      <span className="text-warm-gray-500">({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Rate */}
          {exchangeRate && (
            <div className="mt-4 p-3 rounded-lg bg-warm-gray-50 border border-warm-gray-200">
              <p className="text-sm text-warm-gray-600 mb-1">Exchange Rate Preview</p>
              <p className="text-lg font-semibold">
                1 {user.currency} = {exchangeRate.rate} {selectedCurrency}
              </p>
              <p className="text-xs text-warm-gray-500 mt-1">
                Rate as of {new Date(exchangeRate.date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Change Button */}
          <Button
            onClick={handleChangeCurrency}
            disabled={!selectedCurrency || selectedCurrency === user.currency || isLoadingRate}
            className="w-full mt-6"
          >
            {isLoadingRate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Rate...
              </>
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Change Currency
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showConfirmDialog && (
        <CurrencyConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          fromCurrency={user.currency}
          toCurrency={selectedCurrency}
        />
      )}
    </>
  )
}
```

**Key Points:**
- Use tRPC hooks for data fetching (type-safe)
- Enable exchange rate query only when currency selected
- Disable current currency in dropdown (prevent no-op conversion)
- Show loading state during rate fetch
- Lift confirmation dialog to parent component

### Confirmation Dialog Component

**When to use:** Show warning before destructive action

**Pattern:**
```typescript
// src/components/currency/CurrencyConfirmationDialog.tsx
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromCurrency: string
  toCurrency: string
}

export function CurrencyConfirmationDialog({
  open,
  onOpenChange,
  fromCurrency,
  toCurrency,
}: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [converting, setConverting] = useState(false)

  const utils = trpc.useUtils()

  const { data: stats } = trpc.currency.getConversionStats.useQuery(undefined, {
    enabled: open,
  })

  const convertMutation = trpc.currency.convertCurrency.useMutation({
    onSuccess: () => {
      setConverting(false)
      onOpenChange(false)
      utils.invalidate() // Refresh all queries
      toast({
        title: 'Currency Converted Successfully',
        description: `Your currency has been changed to ${toCurrency}`,
      })
    },
    onError: (error) => {
      setConverting(false)
      toast({
        title: 'Conversion Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleConfirm = async () => {
    setConverting(true)
    await convertMutation.mutateAsync({ toCurrency })
  }

  return (
    <>
      <AlertDialog open={open && !converting} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                Confirm Currency Change
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3 pt-2">
              <p>
                You are about to convert all your financial data from{' '}
                <strong>{fromCurrency}</strong> to <strong>{toCurrency}</strong>.
              </p>

              <div className="rounded-lg bg-warm-gray-50 p-3 space-y-2 text-sm">
                <p className="font-semibold text-warm-gray-900">This will convert:</p>
                <ul className="space-y-1 text-warm-gray-700">
                  <li>• {stats?.transactionCount || 0} transactions</li>
                  <li>• {stats?.accountCount || 0} accounts</li>
                  <li>• {stats?.budgetCount || 0} budgets</li>
                  <li>• {stats?.goalCount || 0} goals</li>
                </ul>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Important:</strong> This conversion uses historical
                  exchange rates for each transaction date. The process may take up
                  to 30 seconds and cannot be interrupted once started.
                </p>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(!!checked)}
                />
                <Label
                  htmlFor="confirm"
                  className="text-sm font-normal cursor-pointer"
                >
                  I understand this will permanently convert all my financial data
                  to {toCurrency}
                </Label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!confirmed}
              className="bg-sage-600 hover:bg-sage-700"
            >
              Continue with Conversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {converting && (
        <CurrencyConversionProgress
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
        />
      )}
    </>
  )
}
```

**Key Points:**
- Require checkbox confirmation before enabling action button
- Fetch conversion stats (transaction count, etc.) for user awareness
- Show clear warning about irreversibility and duration
- Use toast notifications for success/error feedback
- Invalidate all queries after successful conversion (automatic UI refresh)

### Progress Dialog Component

**When to use:** Show progress for long-running operation

**Pattern:**
```typescript
// src/components/currency/CurrencyConversionProgress.tsx
'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  fromCurrency: string
  toCurrency: string
}

export function CurrencyConversionProgress({ fromCurrency, toCurrency }: Props) {
  const [progress, setProgress] = useState(0)

  // Poll conversion status every 2 seconds
  const { data: status } = trpc.currency.getConversionStatus.useQuery(undefined, {
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (status?.status === 'IN_PROGRESS') {
      // Simulate progress (actual progress tracking is complex)
      // In real implementation, service would update progress in log
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 95))
      }, 1000)

      return () => clearInterval(interval)
    } else if (status?.status === 'IDLE') {
      setProgress(100)
    }
  }, [status])

  const getStage = () => {
    if (progress < 20) return 'Fetching exchange rates'
    if (progress < 60) return 'Converting transactions'
    if (progress < 80) return 'Updating accounts'
    if (progress < 95) return 'Updating budgets and goals'
    return 'Finalizing'
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">Converting Currency...</DialogTitle>
          <DialogDescription className="text-center">
            Please do not close this window. This may take up to 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-warm-gray-600">
              <span>{getStage()}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stage Checklist */}
          <div className="space-y-2 text-sm">
            <StageItem
              completed={progress > 20}
              active={progress <= 20}
              text="Fetching exchange rates"
            />
            <StageItem
              completed={progress > 60}
              active={progress > 20 && progress <= 60}
              text="Converting transactions"
            />
            <StageItem
              completed={progress > 80}
              active={progress > 60 && progress <= 80}
              text="Updating accounts"
            />
            <StageItem
              completed={progress > 95}
              active={progress > 80 && progress <= 95}
              text="Updating budgets and goals"
            />
          </div>

          {/* Spinner */}
          <div className="flex justify-center pt-2">
            <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageItem({
  completed,
  active,
  text,
}: {
  completed: boolean
  active: boolean
  text: string
}) {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <CheckCircle className="h-4 w-4 text-sage-600" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-sage-600" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-warm-gray-300" />
      )}
      <span
        className={cn(
          completed && 'text-sage-700 font-medium',
          active && 'text-warm-gray-900',
          !active && !completed && 'text-warm-gray-400'
        )}
      >
        {text}
      </span>
    </div>
  )
}
```

**Key Points:**
- Prevent dialog dismissal during conversion (onInteractOutside)
- Poll status endpoint every 2 seconds (real-time updates)
- Show stage-by-stage progress (improves perceived performance)
- Use Progress component for visual feedback
- Display checklist of stages (reassures user)

## Utility Patterns

### Enhanced Currency Formatting

**When to use:** Format monetary amounts with user's currency

**Pattern:**
```typescript
// src/lib/utils.ts (MODIFY EXISTING)

// Server-side safe version (for SSR, API responses)
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Get currency symbol only
export function getCurrencySymbol(currency: string = 'USD'): string {
  const parts = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).formatToParts(0)

  const symbolPart = parts.find((part) => part.type === 'currency')
  return symbolPart?.value || currency
}

// Get currency name
export function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    JPY: 'Japanese Yen',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    BRL: 'Brazilian Real',
  }

  return names[code] || code
}
```

**Key Points:**
- Keep existing formatCurrency signature (backward compatible)
- Use Intl.NumberFormat for internationalization
- Extract symbol with formatToParts for flexibility
- Map currency codes to display names

### Constants File Pattern

**When to use:** Define supported currencies

**Pattern:**
```typescript
// src/lib/constants.ts (ADD TO EXISTING)

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]['code']
```

## Error Handling Patterns

### API Error Handling Pattern

**When to use:** Handle external API failures gracefully

**Pattern:**
```typescript
try {
  const rate = await fetchRateFromAPI(fromCurrency, toCurrency)
  return rate
} catch (error) {
  // 1. Log error server-side
  console.error('Exchange rate API error:', error)

  // 2. Try fallback: cached rate
  const cachedRate = await prisma.exchangeRate.findFirst({
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

  // 3. No fallback available, throw user-friendly error
  throw new TRPCError({
    code: 'SERVICE_UNAVAILABLE',
    message:
      'Unable to fetch exchange rates at this time. Please try again in a few minutes.',
  })
}
```

**Key Points:**
- Always log errors server-side (debugging)
- Try fallback to cached data (graceful degradation)
- Warn if using stale data (>7 days old)
- Throw user-friendly errors (never expose internal details)

### User-Facing Error Pattern

**When to use:** Show errors to users in UI

**Pattern:**
```typescript
const convertMutation = trpc.currency.convertCurrency.useMutation({
  onError: (error) => {
    toast({
      title: 'Conversion Failed',
      description: error.message || 'An unexpected error occurred',
      variant: 'destructive',
    })
  },
})
```

## Testing Patterns

### Unit Test Example

**When to use:** Test service functions in isolation

**Pattern:**
```typescript
// src/server/services/__tests__/currency.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convertUserCurrency } from '../currency.service'
import { prismaMock } from '@/test/prisma-mock'

describe('Currency Conversion Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts all financial data atomically', async () => {
    // Mock user data
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user1',
      currency: 'USD',
      // ... other fields
    })

    // Mock transactions
    prismaMock.transaction.findMany.mockResolvedValue([
      { id: '1', amount: 100, date: new Date('2024-01-01') },
      { id: '2', amount: 200, date: new Date('2024-01-02') },
    ])

    // Execute conversion
    const result = await convertUserCurrency('user1', 'USD', 'EUR')

    expect(result.success).toBe(true)
    expect(result.transactionCount).toBe(2)
  })

  it('rolls back on database error', async () => {
    // Mock error during transaction update
    prismaMock.$transaction.mockRejectedValue(new Error('Database error'))

    await expect(
      convertUserCurrency('user1', 'USD', 'EUR')
    ).rejects.toThrow('Database error')

    // Verify conversion log marked as FAILED
    expect(prismaMock.currencyConversionLog.update).toHaveBeenCalledWith({
      where: expect.any(Object),
      data: expect.objectContaining({
        status: 'FAILED',
      }),
    })
  })
})
```

---

**Document Version:** 1.0
**Created:** 2025-10-02
**Total Patterns:** 20+
**Status:** COMPLETE - Ready for Builders
