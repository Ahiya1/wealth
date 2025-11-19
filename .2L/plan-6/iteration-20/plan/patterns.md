# Code Patterns & Conventions - Iteration 20

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── dashboard/
│   │   │       └── page.tsx              # Dashboard server component
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts              # NEW: Health check endpoint
│   │   │   └── trpc/[trpc]/
│   │   │       └── route.ts              # tRPC handler
│   │   └── providers.tsx                  # React Query provider
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── BudgetAlertsCard.tsx      # NEW: Budget alerts display
│   │   │   ├── FinancialHealthIndicator.tsx  # MODIFY: Add last synced
│   │   │   └── DashboardStats.tsx
│   │   └── bank-connections/
│   │       └── SyncButton.tsx            # MODIFY: Add alert invalidation
│   ├── lib/
│   │   ├── services/
│   │   │   └── budget-alerts.service.ts  # NEW: Alert triggering logic
│   │   ├── logger.ts                     # NEW: Structured logging (optional)
│   │   └── animations.ts                 # EXISTING: Animation utilities
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── budgets.router.ts     # MODIFY: Add activeAlerts endpoint
│   │   │   │   └── analytics.router.ts   # MODIFY: Optimize aggregations
│   │   │   └── trpc.ts                   # MODIFY: Add Sentry middleware
│   │   └── services/
│   │       └── transaction-import.service.ts  # MODIFY: Add alert triggering
│   └── types/
│       └── budget-alerts.ts               # NEW: Alert type definitions
├── prisma/
│   └── schema.prisma                      # NO CHANGES: Schema already has BudgetAlert
├── sentry.client.config.ts                # NEW: Sentry client config
├── sentry.server.config.ts                # NEW: Sentry server config
└── next.config.js                         # MODIFY: Add Sentry webpack plugin
```

## Naming Conventions

- **Components:** PascalCase (`BudgetAlertsCard.tsx`)
- **Files:** camelCase (`budget-alerts.service.ts`)
- **Types:** PascalCase (`BudgetAlertThreshold`, `SyncStatus`)
- **Functions:** camelCase (`checkBudgetAlerts()`, `triggerAlerts()`)
- **Constants:** SCREAMING_SNAKE_CASE (`ALERT_THRESHOLDS`, `MAX_SYNC_DURATION`)
- **tRPC Procedures:** camelCase (`budgets.activeAlerts`, `budgets.progress`)

## Budget Alert Patterns

### Pattern 1: Budget Alert Service (New)

**When to use:** After transaction import completes, check if budget thresholds exceeded

**File:** `src/lib/services/budget-alerts.service.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth } from 'date-fns'

export const ALERT_THRESHOLDS = [75, 90, 100] as const
export type AlertThreshold = typeof ALERT_THRESHOLDS[number]

interface BudgetAlertResult {
  budgetId: string
  categoryName: string
  threshold: AlertThreshold
  percentage: number
  spentAmount: number
  budgetAmount: number
}

/**
 * Check budget thresholds and trigger alerts for exceeded budgets
 *
 * @param userId - User ID to check budgets for
 * @param affectedCategories - Category IDs from imported transactions
 * @param month - Month in format "YYYY-MM"
 * @param prisma - Prisma client instance
 * @returns Array of triggered alerts
 */
export async function checkBudgetAlerts(
  userId: string,
  affectedCategories: string[],
  month: string,
  prisma: PrismaClient
): Promise<BudgetAlertResult[]> {
  // 1. Fetch budgets for affected categories
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      categoryId: { in: affectedCategories },
      month,
    },
    include: {
      category: true,
      alerts: true,
    },
  })

  if (budgets.length === 0) {
    return []
  }

  // 2. Calculate date range for the month
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = startOfMonth(new Date(year, monthNum - 1))
  const endDate = endOfMonth(new Date(year, monthNum - 1))

  const triggeredAlerts: BudgetAlertResult[] = []

  // 3. Process each budget
  for (const budget of budgets) {
    // 3a. Calculate spent amount using aggregate query
    const spent = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        date: { gte: startDate, lte: endDate },
        amount: { lt: 0 }, // Only expenses
      },
      _sum: { amount: true },
    })

    const spentAmount = Math.abs(Number(spent._sum.amount || 0))
    const budgetAmount = Number(budget.amount)
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0

    // 3b. Check which thresholds were crossed
    const crossedThresholds = ALERT_THRESHOLDS.filter((threshold) => {
      // Find if alert already sent for this threshold
      const existingAlert = budget.alerts.find(
        (alert) => alert.threshold === threshold
      )

      // Trigger if percentage >= threshold AND alert not sent yet
      return percentage >= threshold && existingAlert && !existingAlert.sent
    })

    // 3c. Mark alerts as sent
    if (crossedThresholds.length > 0) {
      await prisma.budgetAlert.updateMany({
        where: {
          budgetId: budget.id,
          threshold: { in: crossedThresholds },
          sent: false,
        },
        data: {
          sent: true,
          sentAt: new Date(),
        },
      })

      // 3d. Add to triggered alerts result
      for (const threshold of crossedThresholds) {
        triggeredAlerts.push({
          budgetId: budget.id,
          categoryName: budget.category.name,
          threshold,
          percentage: Math.round(percentage),
          spentAmount,
          budgetAmount,
        })
      }
    }
  }

  return triggeredAlerts
}

/**
 * Reset all alerts for a budget (when month changes or budget is updated)
 */
export async function resetBudgetAlerts(
  budgetId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.budgetAlert.updateMany({
    where: { budgetId },
    data: { sent: false, sentAt: null },
  })
}
```

**Key points:**
- Use aggregate query for performance (not findMany + reduce)
- Only trigger alerts where `sent = false` (idempotent)
- Use `updateMany` to mark multiple thresholds at once
- Return detailed alert info for UI display

---

### Pattern 2: Integrate Alert Check in Transaction Import

**When to use:** After successful transaction import and categorization

**File:** `src/server/services/transaction-import.service.ts`

```typescript
import { checkBudgetAlerts } from '@/lib/services/budget-alerts.service'

export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  imported: number
  skipped: number
  categorized: number
  alertsTriggered: number  // NEW
}> {
  // ... existing scraping logic ...

  // ... existing duplicate detection ...

  // ... existing batch insert ...

  // ... existing categorization logic ...

  // NEW: Check budget alerts after categorization
  const currentMonth = format(new Date(), 'yyyy-MM')
  const affectedCategories = Array.from(
    new Set(newTransactions.map((t) => t.categoryId))
  )

  const triggeredAlerts = await checkBudgetAlerts(
    userId,
    affectedCategories,
    currentMonth,
    prisma
  )

  console.log(
    `Budget alerts triggered: ${triggeredAlerts.length} for user ${userId.substring(0, 3)}***`
  )

  return {
    imported: newTransactions.length,
    skipped: skippedCount,
    categorized: categorizedCount,
    alertsTriggered: triggeredAlerts.length,  // NEW
  }
}
```

**Key points:**
- Call after categorization (alerts need categoryId)
- Extract unique category IDs from imported transactions
- Use current month for alert check
- Return alert count in response

---

### Pattern 3: Active Alerts tRPC Endpoint

**When to use:** Dashboard needs to fetch and display active budget alerts

**File:** `src/server/api/routers/budgets.router.ts`

```typescript
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const budgetsRouter = createTRPCRouter({
  // ... existing endpoints ...

  /**
   * Get active budget alerts (unsent or recently sent)
   */
  activeAlerts: protectedProcedure
    .input(
      z.object({
        month: z.string().optional(), // Format: "2025-11" (defaults to current month)
      })
    )
    .query(async ({ ctx, input }) => {
      const { user, prisma } = ctx
      const month = input.month || format(new Date(), 'yyyy-MM')

      // Fetch budgets with unsent alerts or alerts sent in last 24 hours
      const budgets = await prisma.budget.findMany({
        where: {
          userId: user.id,
          month,
        },
        include: {
          category: true,
          alerts: {
            where: {
              OR: [
                { sent: false }, // Unsent alerts
                {
                  sent: true,
                  sentAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                  },
                },
              ],
            },
            orderBy: { threshold: 'desc' }, // Show highest threshold first
          },
        },
      })

      // Calculate current spending for each budget with alerts
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = startOfMonth(new Date(year, monthNum - 1))
      const endDate = endOfMonth(new Date(year, monthNum - 1))

      const alerts = []

      for (const budget of budgets) {
        if (budget.alerts.length === 0) continue

        // Calculate current spending
        const spent = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            categoryId: budget.categoryId,
            date: { gte: startDate, lte: endDate },
            amount: { lt: 0 },
          },
          _sum: { amount: true },
        })

        const spentAmount = Math.abs(Number(spent._sum.amount || 0))
        const budgetAmount = Number(budget.amount)
        const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0

        // Add alert details
        for (const alert of budget.alerts) {
          alerts.push({
            id: alert.id,
            budgetId: budget.id,
            categoryId: budget.categoryId,
            categoryName: budget.category.name,
            threshold: alert.threshold,
            percentage: Math.round(percentage),
            spentAmount,
            budgetAmount,
            sent: alert.sent,
            sentAt: alert.sentAt,
            createdAt: alert.createdAt,
          })
        }
      }

      return { alerts }
    }),
})
```

**Key points:**
- Show unsent alerts + recently sent (last 24 hours)
- Calculate current spending for each budget
- Order by threshold descending (100% alerts first)
- Return all data needed for UI display

---

### Pattern 4: Budget Alerts Dashboard Component

**When to use:** Display active budget alerts on dashboard

**File:** `src/components/dashboard/BudgetAlertsCard.tsx`

```typescript
'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react'
import { format } from 'date-fns'

export function BudgetAlertsCard() {
  const { data, isLoading } = trpc.budgets.activeAlerts.useQuery({
    month: format(new Date(), 'yyyy-MM'),
  })

  const utils = trpc.useUtils()

  const dismissAlert = async (alertId: string) => {
    // Mark alert as acknowledged (you may need to add this mutation)
    await utils.budgets.activeAlerts.invalidate()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded bg-warm-gray-200 dark:bg-warm-gray-800" />
            <div className="h-20 rounded bg-warm-gray-200 dark:bg-warm-gray-800" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-sage-600" />
            <span>All budgets are on track</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Budget Alerts
          <Badge variant="secondary">{data.alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.alerts.map((alert) => {
          const variant =
            alert.threshold === 100 ? 'destructive' :
            alert.threshold === 90 ? 'warning' :
            'default'

          const Icon =
            alert.threshold === 100 ? XCircle :
            alert.threshold === 90 ? AlertTriangle :
            AlertTriangle

          return (
            <Alert key={alert.id} variant={variant as any}>
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <AlertTitle>
                  {alert.categoryName} Budget at {alert.percentage}%
                </AlertTitle>
                <AlertDescription>
                  You've spent ${alert.spentAmount.toFixed(2)} of $
                  {alert.budgetAmount.toFixed(2)} ({alert.threshold}% threshold
                  exceeded)
                </AlertDescription>
              </div>
              {!alert.sent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </Alert>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

**Key points:**
- Use Alert component with variant based on threshold
- Show loading skeleton during fetch
- Empty state when no alerts
- Optional dismiss button for unsent alerts
- Color coding: 100% = red, 90% = yellow, 75% = blue

---

## Cache Invalidation Patterns

### Pattern 5: Comprehensive Cache Invalidation After Sync

**When to use:** After successful transaction sync completes

**File:** `src/components/bank-connections/SyncButton.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function SyncButton({
  bankConnectionId,
  disabled = false,
}: {
  bankConnectionId: string
  disabled?: boolean
}) {
  const [syncLogId, setSyncLogId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  const triggerSync = trpc.syncTransactions.trigger.useMutation({
    onSuccess: (data) => {
      setSyncLogId(data.syncLogId)
      toast.loading('Syncing transactions...', { id: 'sync-loading' })
    },
    onError: (error) => {
      toast.error('Sync failed', {
        description: error.message,
      })
    },
  })

  const { data: status } = trpc.syncTransactions.status.useQuery(
    { syncLogId: syncLogId! },
    {
      enabled: !!syncLogId,
      refetchInterval: syncLogId ? 2000 : false, // Poll every 2 seconds
    }
  )

  useEffect(() => {
    if (status?.status === 'SUCCESS') {
      // Invalidate ALL related caches for complete UI refresh
      utils.transactions.list.invalidate()
      utils.budgets.progress.invalidate()
      utils.budgets.summary.invalidate()
      utils.budgets.activeAlerts.invalidate()      // NEW
      utils.analytics.dashboardSummary.invalidate() // NEW
      utils.accounts.list.invalidate()              // NEW
      utils.bankConnections.list.invalidate()
      utils.syncTransactions.history.invalidate()

      // Clear sync state
      setSyncLogId(null)
      toast.dismiss('sync-loading')

      // Show success message with stats
      toast.success('Sync complete', {
        description: `Imported ${status.transactionsImported} new transactions${
          status.transactionsSkipped > 0
            ? `, skipped ${status.transactionsSkipped} duplicates`
            : ''
        }`,
      })
    } else if (status?.status === 'FAILED') {
      setSyncLogId(null)
      toast.dismiss('sync-loading')
      toast.error('Sync failed', {
        description: status.errorDetails || 'Unknown error occurred',
      })
    }
  }, [status, utils])

  const isSyncing = triggerSync.isPending || !!syncLogId

  return (
    <Button
      onClick={() => triggerSync.mutate({ bankConnectionId })}
      disabled={disabled || isSyncing}
      loading={isSyncing}
    >
      {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </Button>
  )
}
```

**Key points:**
- Invalidate 8 caches total (3 new additions)
- Poll status every 2 seconds during sync
- Show loading toast during sync
- Clear sync state on completion or failure
- Display transaction stats in success toast

---

## Sentry Integration Patterns

### Pattern 6: Sentry Client Configuration

**When to use:** Automatically when Next.js app initializes

**File:** `sentry.client.config.ts` (created by wizard)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1, // 10% sample rate for performance monitoring

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // PII Sanitization
  beforeSend(event) {
    // Remove sensitive financial data
    if (event.request?.data) {
      const sensitiveFields = [
        'amount',
        'payee',
        'accountNumber',
        'balance',
        'credentials',
        'password',
        'userId',
        'userPassword',
      ]

      for (const field of sensitiveFields) {
        delete event.request.data[field]
      }
    }

    // Sanitize user ID (only first 3 chars)
    if (event.user?.id) {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    // Sanitize breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data }
          delete sanitized.amount
          delete sanitized.payee
          delete sanitized.accountNumber
          breadcrumb.data = sanitized
        }
        return breadcrumb
      })
    }

    return event
  },

  // Environment tracking
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

  // Release tracking (set by Vercel deployment)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
})
```

**Key points:**
- 10% sample rate for performance (reduce quota usage)
- Remove all sensitive fields in beforeSend hook
- Sanitize user ID to first 3 characters only
- Enable session replay for debugging (10% sample)
- Track environment and release version

---

### Pattern 7: Sentry Server Configuration

**When to use:** Automatically when Next.js server initializes

**File:** `sentry.server.config.ts` (created by wizard)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1, // 10% sample rate

  debug: false,

  beforeSend(event) {
    // Same PII sanitization as client
    if (event.request?.data) {
      const sensitiveFields = [
        'amount',
        'payee',
        'accountNumber',
        'balance',
        'credentials',
        'password',
        'userId',
        'userPassword',
      ]

      for (const field of sensitiveFields) {
        delete event.request.data[field]
      }
    }

    if (event.user?.id) {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    return event
  },

  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
})
```

**Key points:**
- Identical configuration to client config
- Same PII sanitization rules
- Captures server-side errors (API routes, server components)

---

### Pattern 8: tRPC Error Middleware with Sentry

**When to use:** Automatically capture all tRPC errors

**File:** `src/server/api/trpc.ts`

```typescript
import * as Sentry from '@sentry/nextjs'
import { TRPCError } from '@trpc/server'
import { t } from './init'

/**
 * Error logging middleware
 * Captures all errors and sends to Sentry before throwing
 */
const errorMiddleware = t.middleware(async ({ next, ctx, path }) => {
  try {
    return await next({ ctx })
  } catch (error) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      user: ctx.user ? { id: ctx.user.id.substring(0, 3) + '***' } : undefined,
      tags: {
        endpoint: path,
        userId: ctx.user?.id.substring(0, 3) + '***',
      },
      contexts: {
        trpc: {
          path,
          type: ctx.type,
        },
      },
    })

    // Re-throw the error (tRPC will handle HTTP response)
    throw error
  }
})

/**
 * Protected procedure with error logging
 */
export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(errorMiddleware)
```

**Key points:**
- Wrap all protected procedures with error middleware
- Sanitize userId before sending to Sentry
- Add endpoint name and type as tags
- Re-throw error after capturing (don't suppress)

---

## Health Check Pattern

### Pattern 9: Health Check Endpoint

**When to use:** External monitoring services (UptimeRobot) ping this endpoint

**File:** `src/app/api/health/route.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Disable caching

interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
  checks: {
    database: 'ok' | 'error'
  }
  message?: string
}

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`

    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp,
      checks: {
        database: 'ok',
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)

    const response: HealthCheckResponse = {
      status: 'error',
      timestamp,
      checks: {
        database: 'error',
      },
      message: error instanceof Error ? error.message : 'Database connection failed',
    }

    return NextResponse.json(response, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  }
}
```

**Key points:**
- Force dynamic rendering (no caching)
- Return 200 OK if database responsive
- Return 503 Service Unavailable if database down
- Include timestamp for debugging
- Disable caching in response headers

---

## Performance Optimization Patterns

### Pattern 10: Budget Progress Aggregate Query Optimization

**When to use:** Calculate budget spending without fetching all transactions

**File:** `src/server/api/routers/budgets.router.ts`

```typescript
import { startOfMonth, endOfMonth } from 'date-fns'

// BEFORE (N+1 query pattern - SLOW)
const budgetsWithProgress = []
for (const budget of budgets) {
  const transactions = await ctx.prisma.transaction.findMany({
    where: {
      userId: ctx.user.id,
      categoryId: budget.categoryId,
      date: { gte: startDate, lte: endDate },
    },
  })

  const spentAmount = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  budgetsWithProgress.push({ ...budget, spentAmount })
}

// AFTER (Single aggregate query - FAST)
const budgetsWithProgress = await Promise.all(
  budgets.map(async (budget) => {
    const spent = await ctx.prisma.transaction.aggregate({
      where: {
        userId: ctx.user.id,
        categoryId: budget.categoryId,
        date: { gte: startDate, lte: endDate },
        amount: { lt: 0 }, // Only expenses
      },
      _sum: { amount: true },
    })

    const spentAmount = Math.abs(Number(spent._sum.amount || 0))
    const budgetAmount = Number(budget.amount)
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0

    return {
      ...budget,
      spentAmount,
      remainingAmount: budgetAmount - spentAmount,
      percentage: Math.round(percentage),
      status:
        percentage >= 95 ? 'over' :
        percentage >= 75 ? 'warning' :
        'good',
    }
  })
)
```

**Key points:**
- Use `Promise.all` for parallel execution
- Use `aggregate({ _sum: { amount } })` instead of findMany
- Filter expenses in query (`amount: { lt: 0 }`)
- Calculate percentage and status in single pass

---

### Pattern 11: Dashboard Analytics Aggregate Optimization

**When to use:** Calculate income/expense totals for dashboard

**File:** `src/server/api/routers/analytics.router.ts`

```typescript
// BEFORE (fetch all, reduce in-memory - SLOW)
const currentMonthTransactions = await ctx.prisma.transaction.findMany({
  where: {
    userId,
    date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
  },
})

const income = currentMonthTransactions
  .filter((t) => Number(t.amount) > 0)
  .reduce((sum, t) => sum + Number(t.amount), 0)

const expenses = currentMonthTransactions
  .filter((t) => Number(t.amount) < 0)
  .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

// AFTER (parallel aggregates - FAST)
const [incomeResult, expensesResult] = await Promise.all([
  ctx.prisma.transaction.aggregate({
    where: {
      userId,
      date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
      amount: { gt: 0 }, // Only income
    },
    _sum: { amount: true },
  }),
  ctx.prisma.transaction.aggregate({
    where: {
      userId,
      date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
      amount: { lt: 0 }, // Only expenses
    },
    _sum: { amount: true },
  }),
])

const income = Number(incomeResult._sum.amount || 0)
const expenses = Math.abs(Number(expensesResult._sum.amount || 0))
```

**Key points:**
- Run income and expense aggregates in parallel
- Filter in query (not in-memory)
- 3-5x faster for users with 1000+ transactions

---

## Dashboard Enhancement Patterns

### Pattern 12: Last Synced Timestamp Display

**When to use:** Show when accounts were last synced

**File:** `src/components/dashboard/FinancialHealthIndicator.tsx`

```typescript
'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export function FinancialHealthIndicator() {
  const { data: budgetProgress } = trpc.budgets.progress.useQuery({
    month: format(new Date(), 'yyyy-MM'),
  })

  const { data: connections } = trpc.bankConnections.list.useQuery()

  // Calculate most recent sync across all connections
  const lastSynced = connections?.reduce((latest, conn) => {
    if (!conn.lastSynced) return latest
    if (!latest || new Date(conn.lastSynced) > new Date(latest)) {
      return conn.lastSynced
    }
    return latest
  }, null as Date | null)

  const syncStatus = lastSynced
    ? `Last synced ${formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}`
    : 'Never synced'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Financial Health</CardTitle>
        <div className="text-xs text-muted-foreground">{syncStatus}</div>
      </CardHeader>
      <CardContent>
        {/* ... budget health gauge ... */}
      </CardContent>
    </Card>
  )
}
```

**Key points:**
- Use `formatDistanceToNow()` from date-fns for relative time
- Find most recent sync across all connections
- Display in card header (top-right corner)
- Show "Never synced" if no connections

---

## Testing Patterns

### Pattern 13: Unit Test for Budget Alert Logic

**When to use:** Test threshold crossing detection

**File:** `src/lib/services/__tests__/budget-alerts.service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { checkBudgetAlerts } from '../budget-alerts.service'

const prismaMock = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(prismaMock)
})

describe('checkBudgetAlerts', () => {
  it('triggers alert when budget crosses 75% threshold', async () => {
    // Mock budget with 75% threshold alert
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-groceries',
        amount: 1000,
        month: '2025-11',
        category: { id: 'cat-groceries', name: 'Groceries' },
        alerts: [
          { id: 'alert-1', budgetId: 'budget-1', threshold: 75, sent: false },
        ],
      },
    ])

    // Mock spending: $800 out of $1000 (80%)
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -800 },
    })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 1 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-groceries'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(1)
    expect(result[0].threshold).toBe(75)
    expect(result[0].percentage).toBe(80)
    expect(prismaMock.budgetAlert.updateMany).toHaveBeenCalledWith({
      where: {
        budgetId: 'budget-1',
        threshold: { in: [75] },
        sent: false,
      },
      data: {
        sent: true,
        sentAt: expect.any(Date),
      },
    })
  })

  it('triggers multiple alerts when crossing 90% and 100%', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-dining',
        amount: 500,
        month: '2025-11',
        category: { id: 'cat-dining', name: 'Dining Out' },
        alerts: [
          { id: 'alert-90', budgetId: 'budget-1', threshold: 90, sent: false },
          { id: 'alert-100', budgetId: 'budget-1', threshold: 100, sent: false },
        ],
      },
    ])

    // Mock spending: $550 out of $500 (110%)
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -550 },
    })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 2 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-dining'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.threshold)).toEqual([90, 100])
  })

  it('does not trigger alert if already sent', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-transport',
        amount: 300,
        month: '2025-11',
        category: { id: 'cat-transport', name: 'Transportation' },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: true, // Already sent
            sentAt: new Date('2025-11-15'),
          },
        ],
      },
    ])

    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -250 }, // 83%
    })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-transport'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
    expect(prismaMock.budgetAlert.updateMany).not.toHaveBeenCalled()
  })
})
```

**Key points:**
- Mock Prisma client with vitest-mock-extended
- Test threshold crossing (75%, 90%, 100%)
- Test multiple thresholds in single import
- Test idempotency (alerts already sent)

---

## Import Order Convention

```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Next.js imports
import { useRouter } from 'next/navigation'

// 3. External libraries (alphabetical)
import { format, formatDistanceToNow } from 'date-fns'
import { z } from 'zod'

// 4. Internal utilities and services
import { trpc } from '@/lib/trpc'
import { checkBudgetAlerts } from '@/lib/services/budget-alerts.service'

// 5. UI components (alphabetical)
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 6. Icons (alphabetical)
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

// 7. Types
import type { BudgetAlert } from '@prisma/client'
```

## Code Quality Standards

### Error Handling
- Always use try/catch for async operations
- Return structured errors with `TRPCError`
- Log errors to console (or Sentry in production)
- Provide user-friendly error messages

### Type Safety
- Use Zod for input validation
- Infer types from Prisma schema
- Use `as const` for literal types
- Avoid `any` type (use `unknown` if needed)

### Performance
- Use aggregate queries instead of findMany + reduce
- Use Promise.all for parallel operations
- Implement proper loading states
- Cache expensive calculations

### Security
- Sanitize PII in error logs
- Validate user ownership before operations
- Use environment variables for secrets
- Implement rate limiting on sensitive endpoints

This patterns file provides copy-pasteable code for all major operations in Iteration 20. Builders can reference specific patterns by number and adapt examples to their tasks.
