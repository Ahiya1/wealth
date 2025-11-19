# Code Patterns & Conventions - Iteration 19

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx                      # Add sync button (MODIFY)
│   │   └── settings/
│   │       └── bank-connections/
│   │           └── page.tsx                   # Add sync button (MODIFY)
│   ├── components/
│   │   ├── ui/
│   │   │   └── use-toast.tsx                  # EXISTING (shadcn/ui)
│   │   └── bank-connections/
│   │       ├── SyncButton.tsx                 # NEW
│   │       └── SyncProgressModal.tsx          # NEW
│   ├── lib/
│   │   ├── encryption.ts                      # EXISTING (Iteration 17)
│   │   └── services/
│   │       ├── duplicate-detection.service.ts # NEW
│   │       └── __tests__/
│   │           └── duplicate-detection.test.ts # NEW
│   └── server/
│       ├── api/
│       │   └── routers/
│       │       ├── syncTransactions.router.ts  # NEW
│       │       └── __tests__/
│       │           └── syncTransactions.router.test.ts # NEW
│       └── services/
│           ├── bank-scraper.service.ts         # EXISTING (Iteration 18)
│           ├── categorize.service.ts           # EXISTING
│           ├── transaction-import.service.ts   # NEW
│           └── __tests__/
│               └── transaction-import.service.test.ts # NEW
├── prisma/
│   └── schema.prisma                           # EXISTING (no changes)
└── package.json                                # Add string-similarity
```

## Naming Conventions

**Files:**
- Services: `kebab-case.service.ts` (e.g., `transaction-import.service.ts`)
- Components: `PascalCase.tsx` (e.g., `SyncButton.tsx`)
- Tests: `same-name.test.ts` (e.g., `duplicate-detection.test.ts`)

**Functions:**
- Exported functions: `camelCase` (e.g., `importTransactions`, `isDuplicate`)
- Helper functions: `camelCase` with underscore prefix if private (e.g., `_normalizeMerchant`)

**Types:**
- Interfaces: `PascalCase` (e.g., `ImportResult`, `DuplicateCheckParams`)
- Enums: `PascalCase` values (e.g., `SyncStatus.IN_PROGRESS`)

**Constants:**
- `SCREAMING_SNAKE_CASE` (e.g., `MAX_BATCH_SIZE`, `SIMILARITY_THRESHOLD`)

## Import Order Convention

```typescript
// 1. External libraries (React, Next.js, npm packages)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { compareTwoStrings } from 'string-similarity'

// 2. Internal utilities (lib/)
import { encryptBankCredentials, decryptBankCredentials } from '@/lib/encryption'
import { isDuplicate } from '@/lib/services/duplicate-detection.service'

// 3. Server services
import { scrapeBank } from '@/server/services/bank-scraper.service'
import { categorizeTransactions } from '@/server/services/categorize.service'

// 4. tRPC
import { trpc } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'

// 5. Prisma
import { PrismaClient } from '@prisma/client'

// 6. Components
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'

// 7. Types
import type { ImportedTransaction, SyncResult } from '@/types'

// 8. Constants
import { MAX_BATCH_SIZE, SIMILARITY_THRESHOLD } from '@/constants'
```

---

## Service Patterns

### Pattern 1: Import Orchestration Service

**File:** `/src/server/services/transaction-import.service.ts`

**When to use:** Main orchestration logic for scrape → dedupe → import → categorize pipeline

**Code example:**

```typescript
import { PrismaClient } from '@prisma/client'
import { scrapeBank } from './bank-scraper.service'
import { categorizeTransactions } from './categorize.service'
import { isDuplicate } from '@/lib/services/duplicate-detection.service'
import { decryptBankCredentials } from '@/lib/encryption'

// Constants
const DEFAULT_LOOKBACK_DAYS = 30
const MISCELLANEOUS_CATEGORY_NAME = 'Miscellaneous'

// Types
export interface ImportResult {
  imported: number
  skipped: number
  categorized: number
  errors: string[]
}

export interface ImportedTransaction {
  date: Date
  processedDate: Date
  amount: number
  description: string
  memo?: string
  status: 'completed' | 'pending'
}

// Main orchestration function
export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  prismaClient: PrismaClient
): Promise<ImportResult> {
  const errors: string[] = []

  try {
    // Step 1: Fetch bank connection + decrypt credentials
    const connection = await prismaClient.bankConnection.findUnique({
      where: { id: bankConnectionId },
      include: { user: true }
    })

    if (!connection || connection.userId !== userId) {
      throw new Error('Bank connection not found or unauthorized')
    }

    // Step 2: Determine date range (default: last 30 days)
    const endDateResolved = endDate || new Date()
    const startDateResolved = startDate || new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

    // Step 3: Scrape transactions from bank
    const scrapeResult = await scrapeBank({
      bank: connection.bank,
      encryptedCredentials: connection.encryptedCredentials,
      startDate: startDateResolved,
      endDate: endDateResolved
    })

    if (!scrapeResult.success || scrapeResult.transactions.length === 0) {
      return { imported: 0, skipped: 0, categorized: 0, errors: ['No transactions found'] }
    }

    // Step 4: Load existing transactions for duplicate detection (last 90 days)
    const existingTransactions = await prismaClient.transaction.findMany({
      where: {
        userId,
        accountId: connection.accountId, // Assuming accountId is linked
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        date: true,
        amount: true,
        rawMerchantName: true,
        payee: true
      }
    })

    // Step 5: Run duplicate detection
    const { newTransactions, skippedCount } = await deduplicateTransactions(
      scrapeResult.transactions,
      existingTransactions
    )

    if (newTransactions.length === 0) {
      return { imported: 0, skipped: skippedCount, categorized: 0, errors: [] }
    }

    // Step 6: Get Miscellaneous category for initial import
    const miscCategory = await prismaClient.category.findFirst({
      where: { name: MISCELLANEOUS_CATEGORY_NAME, isDefault: true }
    })

    if (!miscCategory) {
      throw new Error('Miscellaneous category not found')
    }

    // Step 7: Batch insert transactions + update account balance (atomic)
    const insertedCount = await insertTransactionsBatch(
      newTransactions,
      userId,
      connection.accountId,
      miscCategory.id,
      connection.bank,
      prismaClient
    )

    // Step 8: Fetch newly inserted transactions for categorization
    const syncStartTime = new Date()
    const uncategorizedTransactions = await prismaClient.transaction.findMany({
      where: {
        userId,
        accountId: connection.accountId,
        importedAt: { gte: syncStartTime },
        categoryId: miscCategory.id
      }
    })

    // Step 9: Batch categorize using existing AI service
    const categorizedCount = await categorizeImportedTransactions(
      uncategorizedTransactions,
      userId,
      prismaClient
    )

    return {
      imported: insertedCount,
      skipped: skippedCount,
      categorized: categorizedCount,
      errors
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// Helper: Deduplicate transactions
async function deduplicateTransactions(
  scrapedTransactions: ImportedTransaction[],
  existingTransactions: { date: Date; amount: any; rawMerchantName: string | null; payee: string }[]
): Promise<{ newTransactions: ImportedTransaction[]; skippedCount: number }> {
  const newTransactions: ImportedTransaction[] = []
  let skippedCount = 0

  for (const scraped of scrapedTransactions) {
    const isDupe = isDuplicate(
      {
        date: scraped.date,
        amount: scraped.amount,
        merchant: scraped.description
      },
      existingTransactions.map(e => ({
        date: e.date,
        amount: Number(e.amount),
        merchant: e.rawMerchantName || e.payee
      }))
    )

    if (isDupe) {
      skippedCount++
    } else {
      newTransactions.push(scraped)
    }
  }

  return { newTransactions, skippedCount }
}

// Helper: Batch insert transactions
async function insertTransactionsBatch(
  transactions: ImportedTransaction[],
  userId: string,
  accountId: string,
  categoryId: string,
  importSource: 'FIBI' | 'CAL',
  prisma: PrismaClient
): Promise<number> {
  // Use Prisma $transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Batch insert transactions
    const insertResult = await tx.transaction.createMany({
      data: transactions.map(t => ({
        userId,
        accountId,
        date: t.date,
        amount: t.amount,
        payee: t.description,
        rawMerchantName: t.description,
        categoryId,
        importSource,
        importedAt: new Date(),
        isManual: false,
        tags: []
      })),
      skipDuplicates: true // Skip if unique constraint violated
    })

    // Step 2: Calculate total amount for balance update
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

    // Step 3: Update account balance (single operation)
    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: { increment: totalAmount },
        lastSynced: new Date()
      }
    })

    return insertResult.count
  })

  return result
}

// Helper: Categorize imported transactions
async function categorizeImportedTransactions(
  transactions: any[],
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  if (transactions.length === 0) return 0

  // Prepare for categorization
  const txnsToCategorize = transactions.map(t => ({
    id: t.id,
    payee: t.rawMerchantName || t.payee,
    amount: Number(t.amount)
  }))

  // Call existing categorization service
  const results = await categorizeTransactions(userId, txnsToCategorize, prisma)

  // Batch update transactions with categories
  const updates = results
    .filter(r => r.categoryId !== null)
    .map(r => {
      const confidence = r.confidence === 'high' ? 'HIGH' : 'MEDIUM'
      const source = r.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED'

      return prisma.transaction.update({
        where: { id: r.transactionId },
        data: {
          categoryId: r.categoryId!,
          categorizedBy: source,
          categorizationConfidence: confidence
        }
      })
    })

  await Promise.all(updates)

  return updates.length
}
```

**Key points:**
- Clear step-by-step orchestration with comments
- Error handling at top level (try-catch)
- Helper functions for each major operation
- Atomic transaction for insert + balance update
- Reuses existing categorize service (no modifications)

---

### Pattern 2: Duplicate Detection Service

**File:** `/src/lib/services/duplicate-detection.service.ts`

**When to use:** Check if imported transaction already exists in database

**Code example:**

```typescript
import { compareTwoStrings } from 'string-similarity'

// Constants
const SIMILARITY_THRESHOLD = 0.8 // 80% merchant name similarity
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000 // ±1 day

// Types
export interface DuplicateCheckParams {
  date: Date
  amount: number
  merchant: string
}

// Main duplicate detection function
export function isDuplicate(
  newTransaction: DuplicateCheckParams,
  existingTransactions: DuplicateCheckParams[]
): boolean {
  for (const existing of existingTransactions) {
    // Factor 1: Date match (±1 day tolerance for timezone issues)
    const dateDiff = Math.abs(newTransaction.date.getTime() - existing.date.getTime())
    const dateMatch = dateDiff <= DATE_TOLERANCE_MS

    // Factor 2: Amount exact match (within 0.01 for floating point precision)
    const amountMatch = Math.abs(newTransaction.amount - existing.amount) < 0.01

    // Factor 3: Merchant fuzzy match (80% similarity)
    const merchantMatch = isMerchantSimilar(newTransaction.merchant, existing.merchant)

    // All three factors must match
    if (dateMatch && amountMatch && merchantMatch) {
      return true // DUPLICATE FOUND
    }
  }

  return false // UNIQUE TRANSACTION
}

// Helper: Fuzzy merchant name matching
export function isMerchantSimilar(merchant1: string, merchant2: string): boolean {
  const normalized1 = normalizeMerchant(merchant1)
  const normalized2 = normalizeMerchant(merchant2)

  // Exact match after normalization
  if (normalized1 === normalized2) return true

  // Fuzzy match (Dice coefficient similarity)
  const similarity = compareTwoStrings(normalized1, normalized2)
  return similarity >= SIMILARITY_THRESHOLD
}

// Helper: Normalize merchant name
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}
```

**Test cases (20+ scenarios):**

```typescript
// /src/lib/services/__tests__/duplicate-detection.test.ts
import { describe, it, expect } from 'vitest'
import { isDuplicate, isMerchantSimilar } from '../duplicate-detection.service'

describe('isDuplicate', () => {
  it('detects exact duplicates (all factors match)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: -127.5,
      merchant: 'SuperSol Jerusalem'
    }

    const existing = [{
      date: new Date('2025-11-15'),
      amount: -127.5,
      merchant: 'SuperSol Jerusalem'
    }]

    expect(isDuplicate(newTxn, existing)).toBe(true)
  })

  it('handles timezone differences (±1 day tolerance)', () => {
    const newTxn = {
      date: new Date('2025-11-15T23:00:00Z'),
      amount: -127.5,
      merchant: 'SuperSol'
    }

    const existing = [{
      date: new Date('2025-11-16T01:00:00Z'), // 2 hours later (next day UTC)
      amount: -127.5,
      merchant: 'SuperSol'
    }]

    expect(isDuplicate(newTxn, existing)).toBe(true)
  })

  it('handles merchant name variations (fuzzy match)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: -127.5,
      merchant: 'SuperSol Jerusalem'
    }

    const existing = [{
      date: new Date('2025-11-15'),
      amount: -127.5,
      merchant: 'SuperSol JLM' // Similar but not exact
    }]

    expect(isDuplicate(newTxn, existing)).toBe(true)
  })

  it('prevents false positives (different merchants, similar names)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: -50.0,
      merchant: 'Starbucks Tel Aviv'
    }

    const existing = [{
      date: new Date('2025-11-15'),
      amount: -50.0,
      merchant: 'Coffee Bar Tel Aviv' // Similar amount/date, different merchant
    }]

    expect(isDuplicate(newTxn, existing)).toBe(false)
  })

  it('handles recurring subscriptions (same merchant, different dates)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: -29.99,
      merchant: 'Netflix'
    }

    const existing = [{
      date: new Date('2025-10-15'), // 1 month earlier
      amount: -29.99,
      merchant: 'Netflix'
    }]

    expect(isDuplicate(newTxn, existing)).toBe(false) // Date outside ±1 day
  })

  it('handles split payments (same merchant, same date, different amounts)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: -50.0,
      merchant: 'Restaurant ABC'
    }

    const existing = [{
      date: new Date('2025-11-15'),
      amount: -75.0, // Different amount
      merchant: 'Restaurant ABC'
    }]

    expect(isDuplicate(newTxn, existing)).toBe(false)
  })

  it('handles refunds (same merchant, same amount, opposite sign)', () => {
    const newTxn = {
      date: new Date('2025-11-15'),
      amount: 127.5, // Positive (refund)
      merchant: 'SuperSol'
    }

    const existing = [{
      date: new Date('2025-11-15'),
      amount: -127.5, // Negative (purchase)
      merchant: 'SuperSol'
    }]

    expect(isDuplicate(newTxn, existing)).toBe(false) // Different amount
  })
})

describe('isMerchantSimilar', () => {
  it('matches exact names', () => {
    expect(isMerchantSimilar('Starbucks', 'Starbucks')).toBe(true)
  })

  it('matches case-insensitive', () => {
    expect(isMerchantSimilar('Starbucks', 'STARBUCKS')).toBe(true)
  })

  it('matches with extra whitespace', () => {
    expect(isMerchantSimilar('  Starbucks  ', 'Starbucks')).toBe(true)
  })

  it('matches similar names (>80% similarity)', () => {
    expect(isMerchantSimilar('Starbucks Coffee', 'Starbucks')).toBe(true)
  })

  it('rejects dissimilar names (<80% similarity)', () => {
    expect(isMerchantSimilar('Starbucks', 'Dominos')).toBe(false)
  })
})
```

**Key points:**
- Three-factor matching (date + amount + merchant)
- ±1 day date tolerance handles timezone issues
- 80% merchant similarity threshold (tunable via constant)
- Comprehensive test suite covers edge cases

---

## tRPC Patterns

### Pattern 3: Sync Mutation with Progress Tracking

**File:** `/src/server/api/routers/syncTransactions.router.ts`

**When to use:** Long-running sync operation with real-time progress updates

**Code example:**

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { importTransactions } from '@/server/services/transaction-import.service'

export const syncTransactionsRouter = router({
  // Trigger manual sync
  trigger: protectedProcedure
    .input(z.object({
      bankConnectionId: z.string().cuid(),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify connection ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.bankConnectionId }
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bank connection not found or unauthorized'
        })
      }

      // 2. Create SyncLog (pessimistic default: FAILED)
      const syncLog = await ctx.prisma.syncLog.create({
        data: {
          bankConnectionId: connection.id,
          startedAt: new Date(),
          status: 'FAILED' // Will update on success
        }
      })

      try {
        // 3. Call import service
        const result = await importTransactions(
          input.bankConnectionId,
          ctx.user.id,
          input.startDate,
          input.endDate,
          ctx.prisma
        )

        // 4. Update connection status
        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            lastSynced: new Date(),
            lastSuccessfulSync: new Date(),
            status: 'ACTIVE',
            errorMessage: null
          }
        })

        // 5. Update SyncLog to SUCCESS
        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'SUCCESS',
            transactionsImported: result.imported,
            transactionsSkipped: result.skipped
          }
        })

        // 6. Return result for UI
        return {
          success: true,
          syncLogId: syncLog.id,
          imported: result.imported,
          skipped: result.skipped,
          categorized: result.categorized
        }
      } catch (error) {
        // 7. Handle errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'FAILED',
            errorDetails: errorMessage
          }
        })

        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            status: 'ERROR',
            errorMessage
          }
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sync failed: ${errorMessage}`
        })
      }
    }),

  // Get sync status (for polling)
  status: protectedProcedure
    .input(z.object({ syncLogId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const log = await ctx.prisma.syncLog.findUnique({
        where: { id: input.syncLogId }
      })

      if (!log) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sync log not found' })
      }

      // Verify ownership via bankConnection
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: log.bankConnectionId }
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      return {
        status: log.status,
        transactionsImported: log.transactionsImported,
        transactionsSkipped: log.transactionsSkipped,
        errorDetails: log.errorDetails,
        startedAt: log.startedAt,
        completedAt: log.completedAt
      }
    }),

  // Get sync history (last 10 syncs)
  history: protectedProcedure
    .input(z.object({ bankConnectionId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.bankConnectionId }
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch last 10 sync logs
      const logs = await ctx.prisma.syncLog.findMany({
        where: { bankConnectionId: input.bankConnectionId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      return logs
    })
})
```

**Key points:**
- Pessimistic SyncLog creation (default to FAILED, update on success)
- Ownership verification on all endpoints
- Comprehensive error handling with status updates
- Returns syncLogId for progress polling
- Follows pattern from existing `bankConnections.router.ts`

---

## React Component Patterns

### Pattern 4: Sync Button with Polling

**File:** `/src/components/bank-connections/SyncButton.tsx`

**When to use:** Manual sync trigger with real-time progress feedback

**Code example:**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'
import { Loader2 } from 'lucide-react'

interface SyncButtonProps {
  bankConnectionId: string
  disabled?: boolean
}

export function SyncButton({ bankConnectionId, disabled }: SyncButtonProps) {
  const [syncLogId, setSyncLogId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  // Trigger sync mutation
  const triggerSync = trpc.syncTransactions.trigger.useMutation({
    onSuccess: (result) => {
      setSyncLogId(result.syncLogId)
      toast({
        title: 'Sync started',
        description: 'Fetching transactions from bank...'
      })
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Poll for sync status (every 2 seconds)
  const { data: status } = trpc.syncTransactions.status.useQuery(
    { syncLogId: syncLogId! },
    {
      refetchInterval: 2000, // 2 seconds
      enabled: !!syncLogId && status?.status === 'IN_PROGRESS',
      onSuccess: (data) => {
        // Stop polling on completion
        if (data.status === 'SUCCESS') {
          setSyncLogId(null)

          // Invalidate all related caches
          utils.transactions.list.invalidate()
          utils.budgets.progress.invalidate()
          utils.budgets.summary.invalidate()
          utils.bankConnections.list.invalidate()

          toast({
            title: 'Sync complete',
            description: `Imported ${data.transactionsImported} new transactions`
          })
        } else if (data.status === 'FAILED') {
          setSyncLogId(null)

          toast({
            title: 'Sync failed',
            description: data.errorDetails || 'Unknown error',
            variant: 'destructive'
          })
        }
      }
    }
  )

  const handleSync = () => {
    triggerSync.mutate({ bankConnectionId })
  }

  const isSyncing = triggerSync.isPending || !!syncLogId

  return (
    <Button
      onClick={handleSync}
      disabled={disabled || isSyncing}
      variant="outline"
      size="sm"
    >
      {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </Button>
  )
}
```

**Key points:**
- Conditional polling (only when syncLogId exists and status is IN_PROGRESS)
- Automatic cache invalidation on success
- Toast notifications for start, success, error states
- Loading state with spinner icon
- Disabled button during sync (prevents concurrent syncs)

---

### Pattern 5: Progress Modal (Optional Enhancement)

**File:** `/src/components/bank-connections/SyncProgressModal.tsx`

**When to use:** Show detailed progress during sync

**Code example:**

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { trpc } from '@/lib/trpc'

interface SyncProgressModalProps {
  syncLogId: string | null
  onClose: () => void
}

export function SyncProgressModal({ syncLogId, onClose }: SyncProgressModalProps) {
  const { data: status } = trpc.syncTransactions.status.useQuery(
    { syncLogId: syncLogId! },
    {
      refetchInterval: 2000,
      enabled: !!syncLogId
    }
  )

  const isOpen = !!syncLogId && status?.status === 'IN_PROGRESS'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Syncing Transactions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Importing transactions from bank...
            </p>
            <Progress value={50} className="w-full" />
          </div>

          {status && (
            <div className="text-sm space-y-1">
              <p>Imported: {status.transactionsImported} transactions</p>
              <p>Skipped: {status.transactionsSkipped} duplicates</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Key points:**
- Modal only opens when sync is IN_PROGRESS
- Shows real-time counts from polling
- Auto-closes on success/failure
- Simple progress bar (indeterminate or percentage-based)

---

## React Query Cache Invalidation Pattern

**When to use:** After any mutation that affects multiple data sets

**Code example:**

```typescript
const utils = trpc.useUtils()

const triggerSync = trpc.syncTransactions.trigger.useMutation({
  onSuccess: () => {
    // Invalidate all affected queries (triggers automatic refetch)
    utils.transactions.list.invalidate()       // Transaction list page
    utils.budgets.progress.invalidate()        // Budget progress bars
    utils.budgets.summary.invalidate()         // Budget summary widget
    utils.bankConnections.list.invalidate()    // Update lastSynced timestamp
    utils.syncTransactions.history.invalidate() // Sync log history

    toast({ title: 'Sync complete', description: `Imported ${result.imported} transactions` })
  }
})
```

**Key points:**
- Multiple invalidations in single callback
- React Query batches refetch requests automatically
- Budget queries depend on transactions - always invalidate both
- Invalidation triggers refetch only for mounted queries

---

## Error Handling Patterns

### Pattern 6: BankScraperError Handling

**When to use:** Catch and translate bank scraper errors to user-friendly messages

**Code example:**

```typescript
import { BankScraperError } from '@/server/services/bank-scraper.service'
import { TRPCError } from '@trpc/server'

try {
  const result = await importTransactions(...)
} catch (error) {
  // Handle BankScraperError (typed errors from israeli-bank-scrapers)
  if (error instanceof BankScraperError) {
    const userMessage = {
      INVALID_CREDENTIALS: 'Invalid credentials. Please update in Settings.',
      OTP_REQUIRED: 'SMS code required. Check your phone and try again.',
      OTP_TIMEOUT: 'SMS code expired. Please retry sync.',
      NETWORK_ERROR: 'Network error. Please check connection and retry.',
      SCRAPER_BROKEN: 'Bank website changed. Please contact support.',
      BANK_MAINTENANCE: 'Bank website under maintenance. Try again later.',
      ACCOUNT_BLOCKED: 'Your bank account is blocked. Contact your bank.',
      PASSWORD_EXPIRED: 'Your bank password expired. Update credentials in Settings.'
    }[error.errorType] || 'Unknown error occurred'

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: userMessage
    })
  }

  // Handle categorization errors (partial success)
  if (error.message.includes('categorization')) {
    // Transactions imported but not categorized - partial success
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Transactions imported but categorization failed. Try categorizing manually.'
    })
  }

  // Handle unknown errors
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Sync failed unexpectedly'
  })
}
```

**Key points:**
- Map BankScraperError types to user-friendly messages
- Distinguish partial success (imported but not categorized)
- Never expose internal details or credentials in error messages

---

## Testing Patterns

### Pattern 7: Unit Test Structure

**File:** `/src/lib/services/__tests__/duplicate-detection.test.ts`

**When to use:** Test pure functions with no external dependencies

**Code example:**

```typescript
import { describe, it, expect } from 'vitest'
import { isDuplicate, isMerchantSimilar } from '../duplicate-detection.service'

describe('Duplicate Detection Service', () => {
  describe('isDuplicate', () => {
    it('should detect exact duplicates', () => {
      // Arrange
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'SuperSol'
      }

      const existing = [{
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'SuperSol'
      }]

      // Act
      const result = isDuplicate(newTxn, existing)

      // Assert
      expect(result).toBe(true)
    })

    // ... more test cases (20+ total)
  })

  describe('isMerchantSimilar', () => {
    it('should match exact names', () => {
      expect(isMerchantSimilar('Starbucks', 'Starbucks')).toBe(true)
    })

    it('should match case-insensitive', () => {
      expect(isMerchantSimilar('Starbucks', 'STARBUCKS')).toBe(true)
    })

    // ... more test cases
  })
})
```

**Key points:**
- Arrange-Act-Assert pattern
- Descriptive test names (`should ...`)
- Group related tests with `describe` blocks
- Test edge cases (timezone, fuzzy matching, refunds, etc.)

---

### Pattern 8: Integration Test with Mocks

**File:** `/src/server/services/__tests__/transaction-import.service.test.ts`

**When to use:** Test service integration with mocked external dependencies

**Code example:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importTransactions } from '../transaction-import.service'
import * as bankScraperService from '../bank-scraper.service'
import * as categorizeService from '../categorize.service'
import { mockPrisma } from '@/test-utils/prisma-mock'

// Mock external dependencies
vi.mock('../bank-scraper.service')
vi.mock('../categorize.service')

describe('Transaction Import Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should import new transactions successfully', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol',
          status: 'completed'
        }
      ]
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)
    vi.mocked(categorizeService.categorizeTransactions).mockResolvedValue([
      {
        transactionId: 'txn1',
        categoryName: 'Groceries',
        categoryId: 'cat1',
        confidence: 'high'
      }
    ])

    // Mock Prisma responses
    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      encryptedCredentials: 'encrypted',
      accountId: 'acc1'
    })

    mockPrisma.transaction.findMany.mockResolvedValue([]) // No existing transactions
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'misc', name: 'Miscellaneous' })

    // Act
    const result = await importTransactions('conn1', 'user1', undefined, undefined, mockPrisma)

    // Assert
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.categorized).toBe(1)
    expect(bankScraperService.scrapeBank).toHaveBeenCalledTimes(1)
    expect(categorizeService.categorizeTransactions).toHaveBeenCalledTimes(1)
  })

  it('should skip duplicate transactions', async () => {
    // ... similar test for duplicate detection
  })
})
```

**Key points:**
- Mock external services (bank scraper, categorization)
- Mock Prisma client for database operations
- Test both success and error scenarios
- Verify function calls with `toHaveBeenCalledTimes`

---

## Performance Optimization Patterns

### Pattern 9: Batch Operations with Prisma

**When to use:** Inserting multiple records or calculating aggregates

**Code example:**

```typescript
// BAD: Loop with individual creates (100x slower)
for (const txn of transactions) {
  await prisma.transaction.create({
    data: {
      userId,
      accountId,
      date: txn.date,
      amount: txn.amount,
      // ...
    }
  })
}

// GOOD: Batch insert with createMany (single query)
const result = await prisma.transaction.createMany({
  data: transactions.map(txn => ({
    userId,
    accountId,
    date: txn.date,
    amount: txn.amount,
    payee: txn.description,
    categoryId: miscCategoryId,
    // ...
  })),
  skipDuplicates: true // Skip if unique constraint violated
})

console.log(`Inserted ${result.count} transactions`) // Returns count only, not records

// If you need created records, use $transaction with individual creates
const createdRecords = await prisma.$transaction(
  transactions.map(txn =>
    prisma.transaction.create({
      data: { /* ... */ }
    })
  )
)
```

**Key points:**
- Use `createMany` for bulk inserts (10-100x faster)
- `skipDuplicates: true` prevents errors on unique constraint violations
- `createMany` returns count only, not created records
- For created records, use `$transaction` with array of `create` calls

---

### Pattern 10: Aggregate Queries for Budget Calculations

**When to use:** Calculate sum, count, average without loading all records

**Code example:**

```typescript
// BAD: Load all transactions and reduce (N+1 problem)
const transactions = await prisma.transaction.findMany({
  where: {
    userId,
    categoryId,
    date: { gte: startDate, lte: endDate },
    amount: { lt: 0 } // Only expenses
  }
})

const spentAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

// GOOD: Use aggregate (single query)
const spent = await prisma.transaction.aggregate({
  where: {
    userId,
    categoryId,
    date: { gte: startDate, lte: endDate },
    amount: { lt: 0 } // Only expenses
  },
  _sum: { amount: true }
})

const spentAmount = Math.abs(Number(spent._sum.amount || 0))
```

**Key points:**
- `aggregate` returns single value (sum, count, avg, min, max)
- No need to load all records into memory
- Works with existing indexes for fast queries
- Budget service already uses this pattern (no changes needed)

---

## Code Quality Standards

**TypeScript Strict Mode:**
- All new code uses TypeScript strict mode
- No `any` types (use `unknown` or proper types)
- Explicit return types on exported functions
- Null checks required (`strictNullChecks`)

**Error Handling:**
- Always use try-catch for async operations
- Type-specific error handling (BankScraperError, TRPCError)
- User-friendly error messages (no technical jargon)
- Never expose credentials or sensitive data in errors

**Logging:**
- Use `console.log` for development only
- Sanitize all logs (no credentials, first 3 chars only for IDs)
- Log errors with context (user ID, connection ID, error type)
- No sensitive data in production logs

**Comments:**
- Use step-by-step comments for complex logic
- Document "why" not "what" (code explains what)
- Add JSDoc for exported functions
- Keep comments concise and up-to-date

**Example:**

```typescript
/**
 * Import transactions from bank scraper with duplicate detection and AI categorization.
 *
 * @param bankConnectionId - Bank connection to sync
 * @param userId - User ID (for authorization)
 * @param startDate - Optional start date (defaults to 30 days ago)
 * @param endDate - Optional end date (defaults to today)
 * @param prismaClient - Prisma client instance
 * @returns Import result with counts (imported, skipped, categorized)
 * @throws Error if connection not found or unauthorized
 */
export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  prismaClient: PrismaClient
): Promise<ImportResult> {
  // Implementation...
}
```

---

## Summary

**Key Patterns for Iteration 19:**

1. **Import Orchestration Service** - Central pipeline for scrape → dedupe → import → categorize
2. **Duplicate Detection** - Three-factor matching (date + amount + fuzzy merchant)
3. **tRPC Sync Mutation** - Long-running operation with progress tracking
4. **Sync Button Component** - Polling-based progress updates with toast notifications
5. **React Query Invalidation** - Multi-cache invalidation on sync success
6. **BankScraperError Handling** - User-friendly error messages
7. **Unit Testing** - Comprehensive test suite (20+ duplicate scenarios)
8. **Integration Testing** - Mocked external services
9. **Batch Operations** - Prisma createMany for performance
10. **Aggregate Queries** - Efficient budget calculations

**Follow these patterns for consistency, performance, and maintainability.**
