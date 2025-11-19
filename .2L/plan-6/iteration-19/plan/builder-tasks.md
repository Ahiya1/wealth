# Builder Task Breakdown - Iteration 19

## Overview

**2 primary builders** will work in parallel on isolated features.

**Split Strategy:** Builder-1 may split into sub-builder (1A) if duplicate detection testing proves complex (20+ test scenarios). Builder-2 remains single (UI components are straightforward).

**Estimated Total Time:** 6-8 hours

---

## Builder-1: Import Service & Duplicate Detection Engine

### Scope

Build the core transaction import pipeline with intelligent duplicate detection, integrating existing bank scraper (Iteration 18) and AI categorization services. This builder creates the orchestration service that coordinates scraping, deduplication, batch insertion, categorization, and account balance updates.

### Complexity Estimate

**HIGH** (may require SPLIT)

**Rationale:**
- Multi-step orchestration (scrape → dedupe → insert → categorize)
- Duplicate detection algorithm with fuzzy matching (new library integration)
- Atomic transaction handling for balance updates
- Comprehensive test suite required (20+ duplicate scenarios)
- Integration with 3 external services (bank scraper, categorization, encryption)

**Estimated LOC:** 400-600 lines (service + duplicate detection + tests)

### Success Criteria

- [x] Import 200+ real transactions from FIBI + Visa CAL with zero duplicate imports
- [x] Duplicate detection accuracy >95% (verified with 50 test cases)
- [x] AI categorization accuracy >80% via MerchantCategoryCache integration
- [x] MerchantCategoryCache hit rate >70% on second sync
- [x] Batch insert completes in <1 second for 100 transactions (Prisma createMany)
- [x] Account balance updates atomically (Prisma $transaction)
- [x] All 20+ duplicate detection test scenarios pass
- [x] Integration tests pass with mocked bank scraper and categorization
- [x] No credentials leaked in logs or error messages
- [x] TypeScript compiles with zero errors

### Files to Create

**Services:**
- `/src/server/services/transaction-import.service.ts` - Main orchestration service
  - `importTransactions(bankConnectionId, userId, dates, prisma): ImportResult`
  - `deduplicateTransactions(scraped, existing): { new, skipped }`
  - `insertTransactionsBatch(transactions, userId, accountId, prisma): number`
  - `categorizeImportedTransactions(transactions, userId, prisma): number`

- `/src/lib/services/duplicate-detection.service.ts` - Fuzzy matching utilities
  - `isDuplicate(newTxn, existingTxns): boolean`
  - `isMerchantSimilar(merchant1, merchant2): boolean`
  - `normalizeMerchant(name): string`

**Tests:**
- `/src/server/services/__tests__/transaction-import.service.test.ts` - Integration tests
  - Test successful import with mocked scraper
  - Test duplicate detection skips existing transactions
  - Test categorization integration (cache hit/miss)
  - Test account balance update
  - Test error handling (scraper failures, categorization failures)
  - ~15 test cases

- `/src/lib/services/__tests__/duplicate-detection.test.ts` - Unit tests
  - Test exact duplicate detection (all factors match)
  - Test timezone tolerance (±1 day)
  - Test merchant name variations (fuzzy matching)
  - Test false positive prevention (different merchants)
  - Test recurring subscriptions (same merchant, different dates)
  - Test split payments (same merchant, same date, different amounts)
  - Test refunds (opposite amount sign)
  - ~20+ test cases (as specified in master plan)

**Dependencies Installation:**
- Add to `package.json`:
  ```json
  {
    "dependencies": {
      "string-similarity": "^4.0.1"
    },
    "devDependencies": {
      "@types/string-similarity": "^4.0.1"
    }
  }
  ```
- Run: `npm install string-similarity @types/string-similarity`

### Dependencies

**Depends on:**
- Iteration 17: Database schema (BankConnection, SyncLog, Transaction models complete)
- Iteration 18: Bank scraper service (`bank-scraper.service.ts` working)
- Existing: AI categorization service (`categorize.service.ts`)
- Existing: Encryption utilities (`encryption.ts`)

**Blocks:**
- Builder-2 (needs import service to wire tRPC mutation)

### Implementation Notes

**Key Architectural Decisions:**

1. **Service Location:** `/src/server/services/` (same directory as existing services)
2. **Duplicate Detection Library:** `string-similarity` (Dice coefficient, 80% threshold)
3. **Date Tolerance:** ±1 day (handles timezone issues from bank processing)
4. **Categorization Strategy:** Import all as Miscellaneous → batch categorize immediately
5. **Account Balance Update:** Atomic transaction (Prisma `$transaction`) with single balance update
6. **Error Handling:** Catch BankScraperError separately, map to user-friendly messages

**Critical Patterns to Follow:**

```typescript
// Pattern 1: Atomic batch insert with balance update
await prisma.$transaction(async (tx) => {
  // Insert transactions
  await tx.transaction.createMany({ data: transactions })

  // Update balance (single operation)
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { increment: totalAmount } }
  })
})

// Pattern 2: Three-factor duplicate detection
function isDuplicate(newTxn, existingTxns) {
  return existingTxns.some(existing => {
    const dateMatch = Math.abs(newTxn.date - existing.date) <= 1 day
    const amountMatch = Math.abs(newTxn.amount - existing.amount) < 0.01
    const merchantMatch = isMerchantSimilar(newTxn.merchant, existing.merchant)
    return dateMatch && amountMatch && merchantMatch
  })
}

// Pattern 3: Fuzzy merchant matching
import { compareTwoStrings } from 'string-similarity'

function isMerchantSimilar(merchant1, merchant2) {
  const normalized1 = merchant1.toLowerCase().trim()
  const normalized2 = merchant2.toLowerCase().trim()

  if (normalized1 === normalized2) return true

  return compareTwoStrings(normalized1, normalized2) >= 0.8 // 80% threshold
}
```

**Integration Points:**

1. **Bank Scraper Service:**
   - Import: `import { scrapeBank } from './bank-scraper.service'`
   - Call: `const result = await scrapeBank({ bank, encryptedCredentials, startDate, endDate })`
   - Returns: `{ success, transactions: ImportedTransaction[] }`

2. **Categorization Service:**
   - Import: `import { categorizeTransactions } from './categorize.service'`
   - Call: `const results = await categorizeTransactions(userId, txnsToCategorize, prisma)`
   - Returns: `CategorizationResult[] { transactionId, categoryId, confidence }`

3. **Encryption Utilities:**
   - Import: `import { decryptBankCredentials } from '@/lib/encryption'`
   - Used internally by bank scraper (no changes needed)

**Testing Requirements:**

- **Unit Tests (20+ scenarios for duplicate detection):**
  - Exact duplicates
  - Timezone edge cases (UTC vs local time)
  - Merchant name variations ("SuperSol" vs "SuperSol JLM")
  - Recurring subscriptions (same merchant, 30 days apart)
  - Split payments (same merchant, same day, different amounts)
  - Refunds (positive vs negative amounts)
  - False positive prevention (similar merchants, different names)

- **Integration Tests (15+ scenarios for import service):**
  - Successful import with 50 transactions
  - Skip duplicates (10 new, 5 existing)
  - Categorization via cache (70% hit rate)
  - Categorization via Claude API (30% miss rate)
  - Account balance update verification
  - Error handling: scraper failure (BankScraperError)
  - Error handling: categorization failure (partial success)
  - Empty transaction list (no new transactions)

**Code Quality Checklist:**

- TypeScript strict mode (no `any` types)
- All exported functions have JSDoc comments
- Error messages user-friendly (no technical jargon)
- Sanitized logging (no credentials, first 3 chars only for IDs)
- Constants at top of file (`SIMILARITY_THRESHOLD = 0.8`, `DATE_TOLERANCE_MS = 24*60*60*1000`)
- Step-by-step comments in orchestration function

### Potential Split Strategy

**If complexity exceeds 500 LOC or testing becomes overwhelming:**

**Foundation (Primary Builder-1):**
- `/src/server/services/transaction-import.service.ts` - Import orchestration (without tests)
- `/src/lib/services/duplicate-detection.service.ts` - Duplicate detection logic (without tests)
- Install `string-similarity` dependency
- Basic smoke test (imports 10 transactions successfully)

**Sub-builder 1A: Testing & Validation**
- `/src/lib/services/__tests__/duplicate-detection.test.ts` - 20+ unit tests
- `/src/server/services/__tests__/transaction-import.service.test.ts` - 15+ integration tests
- Test fixtures and mocks
- Coverage report (target: 80%+)
- E2E testing with real FIBI/CAL accounts

**Split Recommendation:** Only split if Builder-1 estimates >6 hours for implementation + testing. Testing suite is substantial (35+ test cases total).

---

## Builder-2: tRPC Sync Mutation & UI Components

### Scope

Create the tRPC API layer for manual sync trigger with progress polling, and build React UI components for sync button with real-time progress feedback. Integrates with Builder-1's import service to orchestrate backend sync operations and display results to users.

### Complexity Estimate

**MEDIUM**

**Rationale:**
- Follows existing tRPC mutation pattern (`bankConnections.test` from Iteration 18)
- UI components use established shadcn/ui patterns (Button, Dialog, Toast)
- Polling pattern proven in codebase (exports feature)
- No complex algorithms (mostly wiring and UI state management)

**Estimated LOC:** 300-400 lines (router + 2 components + tests)

### Success Criteria

- [x] Manual sync completes in <60 seconds for 50 transactions
- [x] Sync status updates via polling every 2 seconds (tRPC query with refetchInterval)
- [x] Toast notifications appear for sync start, progress, completion, errors
- [x] React Query caches invalidate correctly (transactions, budgets, bankConnections)
- [x] SyncLog created for every sync attempt with accurate counts
- [x] Ownership verification prevents syncing other users' connections
- [x] Error handling covers BankScraperError types with user-friendly messages
- [x] UI loading states work correctly (disabled button during sync, spinner icon)
- [x] Last synced timestamp updates on dashboard and settings page
- [x] All tRPC endpoint tests pass (authorization, sync flow, error scenarios)

### Files to Create

**tRPC Router:**
- `/src/server/api/routers/syncTransactions.router.ts` - Sync endpoints
  - `trigger(bankConnectionId, dates?): mutation → { syncLogId, imported, skipped }`
  - `status(syncLogId): query → { status, transactionsImported, transactionsSkipped, errorDetails }`
  - `history(bankConnectionId): query → SyncLog[]`

**Components:**
- `/src/components/bank-connections/SyncButton.tsx` - Manual sync trigger
  - Props: `{ bankConnectionId, disabled? }`
  - Features: Loading state, polling, toast notifications, cache invalidation

- `/src/components/bank-connections/SyncProgressModal.tsx` - Progress display (optional)
  - Props: `{ syncLogId, onClose }`
  - Features: Real-time progress counts, status indicators

**Page Modifications:**
- `/src/app/dashboard/page.tsx` - Add sync button to dashboard header
- `/src/app/settings/bank-connections/page.tsx` - Add sync button per connection (may already exist from Iteration 18)

**Tests:**
- `/src/server/api/routers/__tests__/syncTransactions.router.test.ts` - API tests
  - Test authentication required (unauthorized user fails)
  - Test ownership verification (cannot sync other user's connection)
  - Test successful sync flow (trigger → status → complete)
  - Test error handling (invalid connection, scraper failure)
  - Test SyncLog creation and updates
  - ~12 test cases

### Dependencies

**Depends on:**
- Builder-1: Import service (`transaction-import.service.ts`)
- Iteration 18: BankConnection model and status enums
- Existing: tRPC router pattern, shadcn/ui components

**Blocks:** None (last builder in sequence)

### Implementation Notes

**Key Architectural Decisions:**

1. **Router File:** Create new `syncTransactions.router.ts` (don't extend `bankConnections.router.ts` to keep routers focused)
2. **Polling Interval:** 2 seconds (balance responsiveness vs API load)
3. **Toast Strategy:** Show toast on sync start, update on completion, error toast on failure
4. **Cache Invalidation:** Invalidate 5 queries (transactions, budgets.progress, budgets.summary, bankConnections, syncTransactions.history)
5. **Progress Modal:** Optional enhancement (build SyncButton first, then modal if time permits)

**Critical Patterns to Follow:**

```typescript
// Pattern 1: tRPC mutation with pessimistic SyncLog
trigger: protectedProcedure
  .input(z.object({ bankConnectionId: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify ownership
    const connection = await ctx.prisma.bankConnection.findUnique(...)
    if (!connection || connection.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    // 2. Create SyncLog (default to FAILED)
    const syncLog = await ctx.prisma.syncLog.create({
      data: { bankConnectionId, startedAt: new Date(), status: 'FAILED' }
    })

    try {
      // 3. Call import service
      const result = await importTransactions(...)

      // 4. Update SyncLog to SUCCESS
      await ctx.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          transactionsImported: result.imported,
          transactionsSkipped: result.skipped
        }
      })

      return { success: true, syncLogId: syncLog.id, ...result }
    } catch (error) {
      // 5. Update SyncLog on failure
      await ctx.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'FAILED', errorDetails: error.message }
      })

      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
  })

// Pattern 2: React Query polling with conditional refetch
const { data: status } = trpc.syncTransactions.status.useQuery(
  { syncLogId: syncLogId! },
  {
    refetchInterval: 2000,  // Poll every 2 seconds
    enabled: !!syncLogId && status?.status === 'IN_PROGRESS'  // Stop on completion
  }
)

// Pattern 3: Multi-cache invalidation on success
const utils = trpc.useUtils()

const triggerSync = trpc.syncTransactions.trigger.useMutation({
  onSuccess: () => {
    utils.transactions.list.invalidate()
    utils.budgets.progress.invalidate()
    utils.budgets.summary.invalidate()
    utils.bankConnections.list.invalidate()
    utils.syncTransactions.history.invalidate()

    toast({ title: 'Sync complete', description: `Imported ${result.imported} transactions` })
  }
})
```

**Integration Points:**

1. **Import Service (Builder-1):**
   - Import: `import { importTransactions } from '@/server/services/transaction-import.service'`
   - Call in tRPC mutation: `const result = await importTransactions(bankConnectionId, userId, dates, ctx.prisma)`
   - Returns: `{ imported, skipped, categorized, errors }`

2. **Existing tRPC Pattern:**
   - Reference: `/src/server/api/routers/bankConnections.router.ts` → `test` mutation
   - Copy pessimistic SyncLog pattern, ownership verification, error handling

3. **shadcn/ui Components:**
   - Button: `import { Button } from '@/components/ui/button'`
   - Toast: `import { toast } from '@/components/ui/use-toast'`
   - Dialog: `import { Dialog, DialogContent } from '@/components/ui/dialog'`
   - Icons: `import { Loader2 } from 'lucide-react'`

**Testing Requirements:**

- **tRPC Router Tests (12+ scenarios):**
  - Authentication: Unauthorized user cannot trigger sync
  - Authorization: User cannot sync other user's connection
  - Successful sync: Returns syncLogId, imported/skipped counts
  - Error handling: Invalid bankConnectionId throws NOT_FOUND
  - Error handling: Scraper failure updates SyncLog to FAILED
  - Ownership verification on status query
  - Sync history query returns last 10 logs
  - Polling: Status query returns correct data structure

- **UI Component Tests (Manual QA - no automated tests required for MVP):**
  - Sync button disables during sync
  - Loading spinner appears during sync
  - Toast notifications display correctly (start, success, error)
  - Progress modal shows real-time counts
  - Cache invalidation triggers UI refresh

**Code Quality Checklist:**

- TypeScript strict mode (no `any` types)
- All tRPC inputs validated with Zod schemas
- Error messages user-friendly (map BankScraperError types)
- Ownership verification on all endpoints
- Polling stops on sync completion (no infinite loops)
- Toast messages clear and actionable

### Potential Split Strategy

**No split recommended** - Builder-2 complexity is MEDIUM and well-scoped. Tasks are linear (router → components → integration) with no recursive complexity.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Builder-1: Import Service & Duplicate Detection**
- Can start immediately (depends only on Iteration 17-18 completed work)
- Estimated: 4-5 hours (may split to 1A for testing if >6 hours)

### Sequential Group 2 (Depends on Group 1)

**Builder-2: tRPC Sync Mutation & UI Components**
- Must wait for Builder-1 to complete import service
- Can start once `transaction-import.service.ts` is available
- Estimated: 3-4 hours

### Total Timeline

**Best Case:** 5 hours (Builder-1: 4h + Builder-2 starts early with interface: 1h parallel, then 2h sequential)

**Typical Case:** 6-8 hours (Builder-1: 5h sequential, then Builder-2: 3h sequential)

**With Split (1A):** 7-9 hours (Builder-1: 4h, Builder-1A: 3h parallel with Builder-2: 3h)

---

## Integration Notes

### How Builder Outputs Come Together

**Step 1: Builder-1 Completes**
- `/src/server/services/transaction-import.service.ts` exports `importTransactions()` function
- `/src/lib/services/duplicate-detection.service.ts` exports helper functions (used internally)
- Tests pass locally (npm test)

**Step 2: Builder-2 Integrates**
- Imports Builder-1's service: `import { importTransactions } from '@/server/services/transaction-import.service'`
- Creates tRPC mutation that calls `importTransactions()`
- Builds UI components that call tRPC mutation
- Modifies dashboard/settings pages to add sync buttons

**Step 3: Integration Testing**
- Integrator runs full test suite (npm test)
- Integrator tests E2E flow: Click "Sync Now" → verify transactions imported → verify budgets updated
- Integrator validates with real FIBI/CAL accounts (manual QA)

### Shared Files

**No shared file edits** - Both builders work on completely isolated files except:

**Potential Conflict:** Dashboard page modification (Builder-2)
- `/src/app/dashboard/page.tsx` - Add sync button
- **Resolution:** Trivial merge (adding single component import + JSX element)

### Shared Types

**Export from Builder-1's service:**

```typescript
// /src/server/services/transaction-import.service.ts
export interface ImportResult {
  imported: number
  skipped: number
  categorized: number
  errors: string[]
}
```

**Import in Builder-2's router:**

```typescript
// /src/server/api/routers/syncTransactions.router.ts
import type { ImportResult } from '@/server/services/transaction-import.service'
```

### Dependency Installation

**Builder-1 Responsibility:**
- Install `string-similarity` and `@types/string-similarity`
- Update `package.json` and commit
- Builder-2 runs `npm install` to get new dependencies

**Verification:**
```bash
# After Builder-1 completes
npm install
npm run build  # Verify TypeScript compiles
npm test       # Verify tests pass
```

---

## Post-Building Validation

### Integrator Checklist

**Code Review:**
- [x] All files follow patterns.md conventions
- [x] TypeScript compiles with zero errors (npm run build)
- [x] All tests pass (npm test)
- [x] No `any` types or TypeScript errors
- [x] ESLint passes (npm run lint)
- [x] No credentials in logs or error messages

**Functional Testing:**
- [x] Sync button appears on dashboard and settings pages
- [x] Click "Sync Now" → loading state appears
- [x] Polling updates show progress (imported count increases)
- [x] Sync completes successfully → toast notification displays
- [x] Transaction list updates automatically (React Query invalidation)
- [x] Budget progress bars update automatically
- [x] "Last synced: X minutes ago" timestamp updates

**E2E Testing with Real Banks:**
- [x] Import from FIBI checking account (30 transactions, verify no duplicates)
- [x] Import from Visa CAL credit card (20 transactions, verify categorization >80%)
- [x] Second sync (verify MerchantCategoryCache hit rate >70%, skips duplicates)
- [x] Test error scenarios (invalid credentials, network error, bank maintenance)

**Performance Validation:**
- [x] 50 transactions sync in <30 seconds
- [x] 100 transactions sync in <60 seconds (Vercel Pro tier)
- [x] Duplicate detection completes in <2 seconds (in-memory comparison)
- [x] Categorization uses batch API calls (50 transactions per call)

**Security Validation:**
- [x] Credentials never logged (grep logs for sensitive data)
- [x] Ownership verification works (cannot sync other user's connection)
- [x] SyncLog error details sanitized (no credentials in errorDetails)
- [x] Encryption key not exposed in error messages

---

## Builder Communication Protocol

**Builder-1 → Builder-2 Interface:**

**When Builder-1 completes, provide:**

1. **Import Service Interface:**
   ```typescript
   // Function signature
   importTransactions(
     bankConnectionId: string,
     userId: string,
     startDate?: Date,
     endDate?: Date,
     prismaClient: PrismaClient
   ): Promise<ImportResult>

   // Return type
   interface ImportResult {
     imported: number
     skipped: number
     categorized: number
     errors: string[]
   }
   ```

2. **Example Usage:**
   ```typescript
   const result = await importTransactions(
     'conn_123',
     'user_456',
     new Date('2025-10-15'),
     new Date('2025-11-15'),
     ctx.prisma
   )

   console.log(`Imported ${result.imported}, skipped ${result.skipped}`)
   ```

3. **Error Handling:**
   ```typescript
   try {
     const result = await importTransactions(...)
   } catch (error) {
     if (error.message.includes('not found')) {
       // Handle missing connection
     } else if (error.message.includes('unauthorized')) {
       // Handle authorization failure
     } else {
       // Handle unknown error
     }
   }
   ```

**Builder-2 Questions for Builder-1:**

1. What errors can `importTransactions()` throw? (Answer: Error with message, no custom error types)
2. Is userId validation done in service or router? (Answer: Router, service assumes valid userId)
3. Are dates optional or required? (Answer: Optional, defaults to last 30 days)
4. Does service create SyncLog or should router? (Answer: Router creates/updates SyncLog)

---

## Success Metrics

**Builder-1 Success:**
- Import service imports 200+ transactions successfully
- Duplicate detection accuracy >95% (manual verification)
- All 20+ duplicate test scenarios pass
- MerchantCategoryCache hit rate >70% on second sync
- Account balance updates correctly (verified in tests)

**Builder-2 Success:**
- Manual sync completes in <60 seconds
- Polling updates every 2 seconds
- Toast notifications display correctly
- React Query caches invalidate (UI updates automatically)
- All tRPC tests pass (12+ scenarios)

**Integration Success:**
- Full sync flow works end-to-end (click button → transactions import → budgets update)
- No TypeScript errors
- All tests pass (35+ total: 20 duplicate + 15 import service + 12 tRPC)
- Real bank testing successful (FIBI + CAL)

---

## Risk Mitigation

### Builder-1 Risks

**Risk:** Duplicate detection false positives (legitimate transactions skipped)
- **Mitigation:** Start with conservative 80% threshold, comprehensive test suite, detailed SyncLog logging
- **Fallback:** If >5% false positives, reduce threshold to 75% or add manual "Force Import" UI

**Risk:** Categorization accuracy below 80%
- **Mitigation:** Leverage existing MerchantCategoryCache (70-80% hit rate proven), batch Claude API calls
- **Fallback:** Users can manually correct categories (updates cache for future imports)

**Risk:** Testing suite takes too long (>3 hours for 35+ tests)
- **Mitigation:** Split to Builder-1A for testing if needed, run tests in parallel (Vitest supports)
- **Fallback:** Reduce test count to critical scenarios only (15 instead of 35)

### Builder-2 Risks

**Risk:** Polling spams API (too many requests)
- **Mitigation:** 2-second interval with conditional refetch (only when IN_PROGRESS), 5-minute timeout
- **Fallback:** Increase interval to 5 seconds if server load too high

**Risk:** React Query cache invalidation doesn't work (stale UI)
- **Mitigation:** Test with React Query Devtools, invalidate all affected queries explicitly
- **Fallback:** Add manual "Refresh" button as fallback if invalidation unreliable

**Risk:** UI components don't match design (no mockups provided)
- **Mitigation:** Follow existing shadcn/ui patterns from dashboard, reference similar components
- **Fallback:** Minimal UI (just button + toast, no modal) if time constrained

---

## Definition of Done

**Builder-1 Complete When:**
- [x] Import service exports `importTransactions()` function
- [x] Duplicate detection service exports helper functions
- [x] All 20+ duplicate test scenarios pass
- [x] All 15+ import service integration tests pass
- [x] TypeScript compiles with zero errors
- [x] Code follows patterns.md conventions
- [x] JSDoc comments on all exported functions
- [x] No credentials in logs

**Builder-2 Complete When:**
- [x] tRPC router exports 3 endpoints (trigger, status, history)
- [x] SyncButton component renders with loading state
- [x] Dashboard page has sync button
- [x] Settings page has sync button per connection
- [x] All 12+ tRPC tests pass
- [x] TypeScript compiles with zero errors
- [x] Toast notifications work correctly
- [x] Polling stops on sync completion

**Iteration 19 Complete When:**
- [x] All builder tasks complete (Builder-1 + Builder-2)
- [x] Integration testing passes (E2E flow works)
- [x] Real bank testing successful (FIBI + CAL)
- [x] Performance targets met (<60s for 100 transactions)
- [x] All 47+ tests pass (20 duplicate + 15 import + 12 tRPC)
- [x] Deployed to production (Vercel)
- [x] Smoke test on production passes

---

**Builder Task Breakdown Status:** COMPLETE
**Ready for:** Builder Execution
**Estimated Completion:** 6-8 hours (8-10 hours with split)
