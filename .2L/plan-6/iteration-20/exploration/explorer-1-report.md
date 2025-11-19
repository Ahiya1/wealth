# Explorer 1 Report: Architecture & Component Patterns

## Executive Summary

Analyzed the Wealth application architecture for Iteration 20 (Budget Integration & Real-Time Updates). The codebase follows a modern Next.js 14 App Router architecture with tRPC for type-safe APIs, React Query for cache management, and Prisma for database operations. The existing budget system uses **aggregate queries** for performance, the sync system has **established invalidation patterns**, and the dashboard is composed of **modular, data-fetching components**. Complexity assessment: **LOW-MEDIUM** - mostly integration work leveraging existing patterns with clear seams.

## Discoveries

### 1. Budget System Architecture

**Current Implementation:**
- **Router:** `/src/server/api/routers/budgets.router.ts` - 7 endpoints (create, get, listByMonth, progress, update, delete, summary)
- **Progress Calculation:** Uses `transaction.aggregate()` with `_sum.amount` for performance (lines 193-201)
- **Data Flow:** `budgets.progress.useQuery()` → fetches budgets → aggregates transactions → returns budget progress
- **Status Logic:** Determined by percentage (>95% = 'over', >75% = 'warning', else 'good')

**Key Endpoints:**
```typescript
budgets.progress({ month: '2025-11' }) → {
  budgets: [{ 
    categoryId, category, budgetAmount, spentAmount, 
    remainingAmount, percentage, status 
  }]
}

budgets.summary({ month: '2025-11' }) → {
  totalBudgeted, totalSpent, remaining, 
  budgetCount, percentageUsed
}
```

**Performance Pattern:**
- Uses `await ctx.prisma.transaction.aggregate()` instead of `findMany() + reduce()`
- Parallel queries in budget progress calculation (one aggregate per budget)
- Current pattern is already optimized (no changes needed for Iteration 20)

### 2. Budget Alert System

**Database Schema:**
```prisma
model BudgetAlert {
  id        String    @id @default(cuid())
  budgetId  String
  threshold Int       // 75, 90, 100
  sent      Boolean   @default(false)
  sentAt    DateTime?
  
  budget Budget @relation(...)
}
```

**Current Implementation:**
- Alerts created automatically when budget is created (lines 81-87 in budgets.router.ts)
- Three thresholds per budget: 75%, 90%, 100%
- **Alert display mechanism:** NOT YET IMPLEMENTED in dashboard
- Alert triggering logic: NOT YET IMPLEMENTED (builder needs to add)

**Integration Point:**
After transaction import completes, budget progress is recalculated. Builder needs to:
1. Check if percentage crossed any threshold (75%, 90%, 100%)
2. Find corresponding BudgetAlert record where `sent = false`
3. Mark alert as sent (`sent = true`, `sentAt = now()`)
4. Display alert on dashboard (new component needed)

### 3. Dashboard Architecture

**Current Structure:** `/src/app/(dashboard)/dashboard/page.tsx`
- Server component (async, direct Supabase auth check)
- Renders 6 client components in order:
  1. `AffirmationCard` - Daily affirmation
  2. Greeting section - Time-based greeting
  3. `FinancialHealthIndicator` - Budget health gauge
  4. `UpcomingBills` - Recurring transactions
  5. `RecentTransactionsCard` - Last 5 transactions
  6. `DashboardStats` - 4 metric cards (net worth, income, expenses, savings rate)

**Data Fetching Pattern:**
All dashboard widgets use **client-side tRPC queries**:
```typescript
// FinancialHealthIndicator.tsx
const { data, isLoading } = trpc.budgets.progress.useQuery({ month: currentMonth })

// RecentTransactionsCard.tsx  
const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()

// DashboardStats.tsx
const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()
```

**Layout Pattern:**
- Mobile-first responsive (space-y-4 sm:space-y-6)
- Uses PageTransition wrapper for animations
- Cards use shadcn/ui Card component with consistent styling

**Integration Seams for Iteration 20:**
- Add "Last Synced" display to FinancialHealthIndicator or new SyncStatusCard
- Add "Quick Sync" button (similar to existing `<Button>` patterns)
- Add budget alerts section (below FinancialHealthIndicator)

### 4. React Query Cache Strategy

**Provider Setup:** `/src/app/providers.tsx`
```typescript
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 60 seconds
      retry: 1,
      refetchOnWindowFocus: false,  // Don't refetch on tab switch
      refetchOnReconnect: true,
    },
  }
}))
```

**Cache Invalidation Pattern:**
Established in `/src/components/bank-connections/SyncButton.tsx` (lines 64-72):
```typescript
useEffect(() => {
  if (status.status === 'SUCCESS') {
    // Invalidate all related caches
    utils.transactions.list.invalidate()
    utils.budgets.progress.invalidate()
    utils.budgets.summary.invalidate()
    utils.bankConnections.list.invalidate()
    utils.syncTransactions.history.invalidate()
    
    toast({ title: 'Sync complete', ... })
  }
}, [status, utils])
```

**Cache Key Naming Convention:**
- Router name + procedure name: `trpc.budgets.progress`
- Input parameters included in key: `{ month: '2025-11' }`
- Automatic key generation by tRPC (no manual keys needed)

**Invalidation Utilities:**
```typescript
const utils = trpc.useUtils()
utils.budgets.invalidate()              // Invalidate ALL budget queries
utils.budgets.progress.invalidate()     // Invalidate specific query
utils.budgets.progress.invalidate({ month }) // Invalidate with specific params
```

### 5. Sync System Architecture

**Sync Flow:** (from `transaction-import.service.ts`)
1. `importTransactions(bankConnectionId, userId, startDate, endDate)`
2. Fetch bank connection + validate ownership
3. Find or create linked Account (checking/credit)
4. Scrape transactions from bank (israeli-bank-scrapers)
5. Load existing transactions for duplicate detection (last 90 days)
6. Run duplicate detection (date ±1 day, exact amount, merchant match)
7. Batch insert new transactions (Prisma `createMany`)
8. Update account balance atomically
9. Fetch uncategorized transactions (categoryId = Miscellaneous)
10. Batch categorize using AI (MerchantCategoryCache + Claude)
11. Return result: `{ imported: 47, skipped: 3, categorized: 40 }`

**tRPC Router:** `/src/server/api/routers/syncTransactions.router.ts`
```typescript
syncTransactions.trigger({ bankConnectionId }) → {
  success: true,
  syncLogId: 'cuid',
  imported: 12,
  skipped: 3,
  categorized: 10
}

syncTransactions.status({ syncLogId }) → {
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL',
  transactionsImported: 12,
  transactionsSkipped: 3,
  errorDetails?: string,
  startedAt: Date,
  completedAt: Date
}
```

**Sync Button Pattern:** (from `SyncButton.tsx`)
1. Click "Sync Now" → disable button, show loading spinner
2. Call `triggerSync.mutate({ bankConnectionId })`
3. Poll for status every 2 seconds: `trpc.syncTransactions.status.useQuery({ syncLogId }, { refetchInterval: 2000 })`
4. On completion: invalidate caches, show toast, re-enable button

### 6. Transaction Import & Account Balance Update

**Atomic Transaction Pattern:** (lines 343-377 in transaction-import.service.ts)
```typescript
await prisma.$transaction(async (tx) => {
  // Step 1: Batch insert transactions
  await tx.transaction.createMany({ data: [...], skipDuplicates: true })
  
  // Step 2: Update account balance (single increment operation)
  await tx.account.update({
    where: { id: accountId },
    data: { 
      balance: { increment: totalAmount },
      lastSynced: new Date()
    }
  })
})
```

**Key Insights:**
- Uses Prisma `$transaction` for atomicity
- Account balance updated via `increment` (not read-then-write)
- Prevents race conditions on concurrent imports

## Patterns Identified

### Pattern 1: Server-Side Query Optimization

**Description:** Replace `findMany() + reduce()` with Prisma `aggregate()` for budget calculations

**Current Usage:**
```typescript
// budgets.router.ts (line 193-201)
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
```

**When to Apply:** Budget recalculation after transaction import

**Recommendation:** ✅ ALREADY IMPLEMENTED - no changes needed for Iteration 20

### Pattern 2: React Query Invalidation on Mutation Success

**Description:** Invalidate all related caches after successful mutation to trigger UI refresh

**Example:**
```typescript
// BudgetForm.tsx (lines 46-52)
const createBudget = trpc.budgets.create.useMutation({
  onSuccess: () => {
    toast({ title: 'Budget created successfully' })
    utils.budgets.invalidate()  // Invalidate ALL budget queries
    reset()
    onSuccess?.()
  },
})
```

**When to Apply:** After transaction import completes (sync mutation)

**Recommendation:** ✅ USE THIS PATTERN - already established in SyncButton.tsx

### Pattern 3: Optimistic UI Updates with Loading States

**Description:** Show loading state immediately, disable button, update on completion

**Example:**
```typescript
// SyncButton.tsx (lines 97-109)
const isSyncing = triggerSync.isPending || !!syncLogId

return (
  <Button
    onClick={handleSync}
    disabled={disabled || isSyncing}
    loading={isSyncing}
  >
    {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
    {isSyncing ? 'Syncing...' : 'Sync Now'}
  </Button>
)
```

**Recommendation:** ✅ USE THIS PATTERN for dashboard quick sync button

### Pattern 4: Parallel Data Fetching in Dashboard Widgets

**Description:** Each widget fetches its own data independently (no prop drilling)

**Example:**
```typescript
// FinancialHealthIndicator.tsx
const { data, isLoading } = trpc.budgets.progress.useQuery({ month: currentMonth })

// RecentTransactionsCard.tsx
const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()
```

**Benefits:**
- Widgets load independently (no waterfalls)
- React Query deduplicates identical requests
- Easy to add new widgets without refactoring

**Recommendation:** ✅ USE THIS PATTERN for new sync status widget

### Pattern 5: Toast Notifications for User Feedback

**Description:** Use sonner toast for all user-facing notifications

**Example:**
```typescript
// SyncButton.tsx (lines 74-81)
toast({
  title: 'Sync complete',
  description: `Imported ${status.transactionsImported} new transactions${
    status.transactionsSkipped > 0
      ? `, skipped ${status.transactionsSkipped} duplicates`
      : ''
  }`,
})
```

**Recommendation:** ✅ USE THIS PATTERN for budget alert notifications

## Complexity Assessment

### HIGH COMPLEXITY Areas
**NONE** - All features leverage existing, proven patterns

### MEDIUM COMPLEXITY Areas

#### 1. Budget Alert Triggering Logic
**Why Medium:**
- Needs to compare old vs new percentage to detect threshold crossing
- Must prevent duplicate alerts (check `sent = false`)
- Requires transaction wrapper for atomicity (mark alert sent + display)

**Estimated Effort:** 2-3 hours
**Subdivision:** No - straightforward logic, well-defined edge cases

#### 2. Dashboard Real-Time Updates
**Why Medium:**
- Multiple widgets need simultaneous refresh (budgets, transactions, account balances)
- Cache invalidation must be selective (only affected months/categories)
- Loading states must handle partial updates (some budgets updated, others still loading)

**Estimated Effort:** 2-3 hours
**Subdivision:** No - follows existing patterns from SyncButton.tsx

### LOW COMPLEXITY Areas

#### 1. "Last Synced" Timestamp Display
**Why Low:**
- Data already exists in `Account.lastSynced` field
- Just needs formatting with `date-fns` (relative time: "2 minutes ago")
- Add to existing FinancialHealthIndicator component

**Estimated Effort:** 30 minutes

#### 2. Quick Sync Button on Dashboard
**Why Low:**
- Copy exact pattern from SyncButton.tsx
- Place in FinancialHealthIndicator or new SyncStatusCard
- Same invalidation logic as existing sync button

**Estimated Effort:** 1 hour

#### 3. Recent Transactions Widget Enhancement
**Why Low:**
- Component already exists (RecentTransactionsCard.tsx)
- Just add badge for auto-categorization source (AI_CACHED vs AI_SUGGESTED)
- Data already in Transaction.categorizedBy field

**Estimated Effort:** 30 minutes

## Technology Recommendations

### Primary Stack (Already in Use)
- **Framework:** Next.js 14 (App Router) - ✅ Correct choice for SSR + client interactivity
- **API Layer:** tRPC v10 - ✅ Excellent type safety, established patterns
- **Database ORM:** Prisma v5 - ✅ Good performance with aggregate queries
- **Cache:** React Query (TanStack Query) - ✅ Built-in cache invalidation
- **UI Components:** shadcn/ui + Tailwind - ✅ Consistent design system

### Supporting Libraries (Already in Use)
- **Date Formatting:** date-fns - ✅ Use `formatDistanceToNow()` for "Last Synced"
- **Notifications:** sonner - ✅ Use for budget alerts
- **Animations:** framer-motion - ✅ Optional for budget progress bar updates
- **Forms:** react-hook-form + zod - ✅ N/A for this iteration

### No New Dependencies Needed
All required functionality can be implemented with existing stack.

## Integration Points

### 1. Budget Recalculation After Sync

**Trigger Point:** After `importTransactions()` completes successfully

**Current Flow:**
```
syncTransactions.trigger() 
  → importTransactions() 
  → batch insert transactions 
  → categorize transactions 
  → return { imported, skipped, categorized }
```

**New Flow (add step 9):**
```
syncTransactions.trigger() 
  → importTransactions() 
  → batch insert transactions 
  → categorize transactions 
  → [NEW] checkBudgetAlerts(userId, affectedCategories, month)
  → return { imported, skipped, categorized, alertsTriggered }
```

**Implementation Location:** `/src/server/services/transaction-import.service.ts` (line 195, after categorization)

**New Service Function:**
```typescript
// /src/lib/services/budget-alerts.service.ts
export async function checkBudgetAlerts(
  userId: string, 
  affectedCategories: string[], 
  month: string,
  prisma: PrismaClient
): Promise<number> {
  // 1. Fetch budgets for affected categories
  // 2. Recalculate spent amounts (aggregate query)
  // 3. Check if percentage crossed thresholds (75%, 90%, 100%)
  // 4. Find unsent alerts (sent = false)
  // 5. Mark alerts as sent atomically
  // 6. Return count of alerts triggered
}
```

### 2. Cache Invalidation After Sync

**Trigger Point:** SyncButton.tsx `useEffect` when status === 'SUCCESS' (line 64)

**Current Invalidations:**
```typescript
utils.transactions.list.invalidate()
utils.budgets.progress.invalidate()
utils.budgets.summary.invalidate()
utils.bankConnections.list.invalidate()
utils.syncTransactions.history.invalidate()
```

**Add:**
```typescript
utils.analytics.dashboardSummary.invalidate()  // Refresh dashboard stats
utils.accounts.list.invalidate()               // Refresh account balances
```

**Already Correct:** No changes needed, just verify these are called

### 3. Dashboard "Last Synced" Display

**Integration Point:** FinancialHealthIndicator.tsx (or new SyncStatusCard)

**Data Source:** 
```typescript
const { data: connections } = trpc.bankConnections.list.useQuery()

// Get most recent sync across all connections
const lastSynced = connections?.reduce((latest, conn) => {
  if (!conn.lastSynced) return latest
  if (!latest || conn.lastSynced > latest) return conn.lastSynced
  return latest
}, null as Date | null)

// Format with date-fns
const syncStatus = lastSynced 
  ? `Last synced ${formatDistanceToNow(lastSynced, { addSuffix: true })}`
  : 'Never synced'
```

**UI Location:** Add to CardHeader of FinancialHealthIndicator
```tsx
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle>Financial Health</CardTitle>
  <div className="text-xs text-muted-foreground">{syncStatus}</div>
</CardHeader>
```

### 4. Quick Sync Button on Dashboard

**Integration Point:** FinancialHealthIndicator.tsx or new component

**Pattern:** Copy from SyncButton.tsx, adapt for "sync all" behavior

**Implementation:**
```tsx
// components/dashboard/QuickSyncButton.tsx
export function QuickSyncButton() {
  const { data: connections } = trpc.bankConnections.list.useQuery()
  
  // Sync all active connections in parallel
  const syncAll = async () => {
    const activeConnections = connections?.filter(c => c.status === 'ACTIVE') || []
    
    await Promise.all(
      activeConnections.map(conn => 
        triggerSync.mutateAsync({ bankConnectionId: conn.id })
      )
    )
  }
  
  // Rest follows SyncButton.tsx pattern
}
```

### 5. Budget Alert Display on Dashboard

**Integration Point:** New component below FinancialHealthIndicator

**Data Source:**
```typescript
// New tRPC endpoint needed
budgets.activeAlerts.useQuery() → {
  alerts: [{
    budgetId, categoryName, threshold, percentage, 
    triggeredAt, acknowledged: false
  }]
}
```

**UI Pattern:**
```tsx
// components/dashboard/BudgetAlerts.tsx
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Budget Alert</AlertTitle>
  <AlertDescription>
    Your {categoryName} budget is at {percentage}% 
    ({threshold}% threshold exceeded)
  </AlertDescription>
  <Button onClick={acknowledgeAlert}>Dismiss</Button>
</Alert>
```

## Risks & Challenges

### Technical Risks

#### Risk 1: Race Condition on Concurrent Syncs
**Impact:** HIGH - could create duplicate alerts or incorrect budget calculations

**Scenario:** User clicks "Sync All" → 2 bank connections sync simultaneously → both trigger budget alert check → duplicate alerts created

**Mitigation:**
1. Add database-level constraint: `@@unique([budgetId, threshold])` on BudgetAlert (prevent duplicate threshold alerts)
2. Use `updateMany` with `where: { sent: false }` to mark alerts sent (idempotent)
3. Add sync lock at tRPC layer: prevent concurrent syncs for same connection

**Likelihood:** MEDIUM - users may click sync multiple times
**Builder Split:** No - handle in single implementation

#### Risk 2: Cache Invalidation Timing
**Impact:** MEDIUM - dashboard may show stale data briefly

**Scenario:** Sync completes → budgets invalidated → dashboard refetches → data still stale (PostgreSQL read replica lag)

**Mitigation:**
1. Use Supabase `DIRECT_URL` for writes (bypasses pooler, reduces lag)
2. Add artificial delay before invalidation: `setTimeout(() => utils.budgets.invalidate(), 500)`
3. Show loading skeleton during refetch (already implemented)

**Likelihood:** LOW - Supabase pooler lag is <100ms typically
**Builder Split:** No - simple timing adjustment

### Complexity Risks

#### Risk 1: Budget Alert Logic Complexity
**Why Complex:** Must detect threshold crossing (not just current state)

**Example Edge Cases:**
- Budget at 70% → import 10% expenses → crossed 75% threshold → trigger alert ✅
- Budget at 80% → import 5% expenses → crossed 90% threshold → trigger alert ✅
- Budget at 80% → import 20% expenses → crossed 90% AND 100% thresholds → trigger BOTH alerts ✅
- Budget at 95% → import -5% (refund) → fell below 90% threshold → do NOT trigger alert ✅

**Solution:**
```typescript
// Pseudocode for alert triggering
const oldPercentage = calculatePercentage(oldSpent, budgetAmount)
const newPercentage = calculatePercentage(newSpent, budgetAmount)

const thresholds = [75, 90, 100]
const crossedThresholds = thresholds.filter(t => 
  oldPercentage < t && newPercentage >= t
)

// Mark alerts for crossed thresholds as sent
await prisma.budgetAlert.updateMany({
  where: { 
    budgetId, 
    threshold: { in: crossedThresholds },
    sent: false 
  },
  data: { sent: true, sentAt: new Date() }
})
```

**Recommendation:** Write comprehensive tests FIRST (TDD approach)

## Recommendations for Planner

### 1. Budget Alert Logic Should Be Separate Service Function
**Rationale:** 
- Complex logic with multiple edge cases (threshold crossing detection)
- Needs comprehensive unit testing (20+ test cases)
- Reusable for future manual budget edits (not just sync)

**Recommended Structure:**
```
/src/lib/services/budget-alerts.service.ts
  - checkBudgetAlerts(userId, affectedCategories, month)
  - markAlertSent(budgetId, threshold)
  - getActiveAlerts(userId)
  
/src/lib/services/budget-alerts.service.test.ts
  - Test all edge cases (refunds, multiple thresholds, etc.)
```

### 2. Dashboard Components Should Follow Existing Patterns
**Rationale:**
- Existing widgets (FinancialHealthIndicator, RecentTransactionsCard) are good examples
- Each component fetches own data (no prop drilling)
- Consistent loading states, error handling, empty states

**Recommended Components:**
1. `SyncStatusCard` - Shows last synced, quick sync button, sync history
2. `BudgetAlertsCard` - Shows active budget alerts with dismiss actions
3. Enhance `FinancialHealthIndicator` - Add last synced timestamp

### 3. Cache Invalidation Should Be Comprehensive
**Rationale:**
- Sync affects multiple data sources (transactions, budgets, accounts, analytics)
- Missing invalidation = stale UI = user confusion
- Existing SyncButton.tsx pattern is good but incomplete

**Recommended Invalidations (after sync):**
```typescript
utils.transactions.list.invalidate()           // ✅ Already done
utils.budgets.progress.invalidate()            // ✅ Already done
utils.budgets.summary.invalidate()             // ✅ Already done
utils.budgets.activeAlerts.invalidate()        // ⚠️ NEW - add this
utils.analytics.dashboardSummary.invalidate()  // ⚠️ MISSING - add this
utils.accounts.list.invalidate()               // ⚠️ MISSING - add this (balance updated)
utils.bankConnections.list.invalidate()        // ✅ Already done
```

### 4. Budget Recalculation Should Happen in Transaction Import Service
**Rationale:**
- Import service already updates account balances atomically
- Natural place to trigger budget alert check (same transaction context)
- Keeps sync logic centralized

**Recommended Flow:**
```
importTransactions()
  → batch insert transactions
  → update account balance (atomic)
  → categorize transactions
  → checkBudgetAlerts(affectedCategories)  // NEW STEP
  → return { imported, skipped, categorized, alertsTriggered }
```

### 5. Use Existing UI Components (No Custom Components Needed)
**Rationale:**
- shadcn/ui has all needed components (Alert, Badge, Card, Button)
- Design system is consistent (warm-gray, sage-600 colors)
- No need to reinvent the wheel

**Recommended Components:**
- `Alert` for budget alerts (variant="warning")
- `Badge` for sync status (ACTIVE, ERROR, SYNCING)
- `Card` for sync status widget
- `Button` for quick sync (copy SyncButton.tsx)

### 6. Add Comprehensive Tests for Alert Logic
**Rationale:**
- Alert threshold crossing is complex (many edge cases)
- Critical user feature (must be correct)
- Prevents regression in future iterations

**Recommended Test Cases:**
1. Single threshold crossed (70% → 80%)
2. Multiple thresholds crossed (70% → 95%)
3. Refund causes percentage to drop (no alert)
4. Budget deleted (cascade delete alerts)
5. Alert already sent (no duplicate)
6. Multiple imports in quick succession (idempotent)

### 7. Performance: Use Aggregate Queries (Already Implemented)
**Rationale:**
- Budget progress calculation already uses `aggregate()` instead of `findMany()`
- No changes needed for Iteration 20
- Verify performance with 1000+ transactions (should be <200ms)

**Recommendation:** ✅ NO ACTION NEEDED - existing implementation is optimal

## Resource Map

### Critical Files/Directories

#### Budget System
- `/src/server/api/routers/budgets.router.ts` - Budget endpoints (progress, summary)
- `/prisma/schema.prisma` - Budget, BudgetAlert models (lines 309-341)
- `/src/components/budgets/BudgetList.tsx` - Budget list component
- `/src/components/budgets/BudgetCard.tsx` - Individual budget card
- `/src/components/budgets/BudgetProgressBar.tsx` - Progress bar visualization

#### Sync System  
- `/src/server/services/transaction-import.service.ts` - Import orchestration
- `/src/server/api/routers/syncTransactions.router.ts` - Sync endpoints
- `/src/components/bank-connections/SyncButton.tsx` - Sync UI pattern

#### Dashboard
- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard layout
- `/src/components/dashboard/FinancialHealthIndicator.tsx` - Budget health widget
- `/src/components/dashboard/RecentTransactionsCard.tsx` - Recent transactions
- `/src/components/dashboard/DashboardStats.tsx` - Metrics cards

#### API Infrastructure
- `/src/server/api/root.ts` - tRPC router registry
- `/src/app/providers.tsx` - React Query client setup
- `/src/lib/trpc.ts` - tRPC client

### Key Dependencies

#### Core Dependencies (package.json)
- `@trpc/server` + `@trpc/client` + `@trpc/react-query` - API layer
- `@tanstack/react-query` - Cache management
- `@prisma/client` - Database ORM
- `date-fns` - Date formatting (use `formatDistanceToNow()`)
- `sonner` - Toast notifications
- `zod` - Schema validation

#### Optional Dependencies
- `framer-motion` - Animations (budget progress bar)
- `lucide-react` - Icons (RefreshCw, AlertTriangle, CheckCircle)

### Testing Infrastructure

#### Existing Test Files
- `/src/server/api/routers/__tests__/budgets.router.test.ts` - Budget router tests
- `/src/server/services/__tests__/transaction-import.service.test.ts` - Import tests

#### New Test Files Needed
- `/src/lib/services/__tests__/budget-alerts.service.test.ts` - Alert logic tests (20+ cases)
- `/src/components/dashboard/__tests__/BudgetAlerts.test.tsx` - Component tests

#### Test Patterns
- Use `prismaMock` for database mocking
- Use `createCaller` for tRPC endpoint testing
- Use `@testing-library/react` for component testing

## Architecture Diagrams

### 1. Budget Auto-Update Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER TRIGGERS SYNC                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SyncButton.tsx                                                      │
│ - Click "Sync Now"                                                  │
│ - Call: syncTransactions.trigger({ bankConnectionId })             │
│ - Poll: syncTransactions.status({ syncLogId })                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ syncTransactions.router.ts                                          │
│ - Create SyncLog (pessimistic: status = FAILED)                    │
│ - Call: importTransactions(bankConnectionId, userId, dates)        │
│ - Update: BankConnection.lastSynced, status = ACTIVE               │
│ - Update: SyncLog.status = SUCCESS, transactionsImported = 12      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ transaction-import.service.ts                                       │
│ Step 1: Scrape transactions from bank                              │
│ Step 2: Duplicate detection (skip existing)                        │
│ Step 3: Batch insert (createMany)                                  │
│ Step 4: Update account balance (increment)                         │
│ Step 5: Categorize transactions (AI + cache)                       │
│ Step 6: [NEW] Check budget alerts                                  │
│ Return: { imported: 12, skipped: 3, categorized: 10, alerts: 2 }  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ budget-alerts.service.ts [NEW]                                      │
│ 1. Get affected categories (from imported transactions)            │
│ 2. Fetch budgets for affected categories + month                   │
│ 3. Recalculate spent amounts (aggregate query)                     │
│ 4. Calculate old vs new percentage                                 │
│ 5. Detect crossed thresholds (75%, 90%, 100%)                      │
│ 6. Mark alerts as sent (updateMany where sent = false)             │
│ Return: { alertsTriggered: 2 }                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SyncButton.tsx (onSuccess)                                          │
│ - Invalidate caches:                                                │
│   * transactions.list                                               │
│   * budgets.progress                                                │
│   * budgets.summary                                                 │
│   * budgets.activeAlerts [NEW]                                      │
│   * analytics.dashboardSummary [NEW]                                │
│   * accounts.list [NEW]                                             │
│ - Show toast: "Imported 12 transactions, 2 budget alerts"          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD AUTO-REFRESHES                    │
│ - FinancialHealthIndicator: Budget health gauge updates            │
│ - BudgetAlertsCard [NEW]: Shows 2 new alerts                        │
│ - RecentTransactionsCard: Shows 12 imported transactions           │
│ - DashboardStats: Net worth, expenses updated                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Dashboard Component Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ /app/(dashboard)/dashboard/page.tsx (Server Component)             │
│ - Checks Supabase auth                                              │
│ - Renders client components (no data fetching)                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┬──────────────┐
                    ▼              ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ Financial Health │ │ Recent Trans.    │ │ Dashboard Stats  │ │ Budget Alerts    │
    │ Indicator        │ │ Card             │ │                  │ │ [NEW]            │
    └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
            │                      │                      │                      │
            ▼                      ▼                      ▼                      ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ budgets.progress │ │ analytics.       │ │ analytics.       │ │ budgets.         │
    │ .useQuery()      │ │ dashboardSummary │ │ dashboardSummary │ │ activeAlerts     │
    │                  │ │ .useQuery()      │ │ .useQuery()      │ │ .useQuery()      │
    └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
            │                      │                      │                      │
            └──────────────┬───────┴──────────────────────┴──────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ React Query Cache                                                │
            │ - Deduplicates identical requests (same query key)              │
            │ - Refetches on invalidation (sync completion)                   │
            │ - Stale time: 60 seconds (reduces unnecessary refetches)        │
            └──────────────────────────────────────────────────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ tRPC HTTP Batch Link                                             │
            │ - Batches multiple queries into single HTTP request             │
            │ - Uses SuperJSON for Date serialization                         │
            └──────────────────────────────────────────────────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ tRPC Routers (budgets, analytics)                                │
            │ - budgets.progress: Aggregate query (transaction.aggregate)     │
            │ - analytics.dashboardSummary: Parallel queries (Promise.all)    │
            │ - budgets.activeAlerts: Filter alerts (sent = false)            │
            └──────────────────────────────────────────────────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ Prisma Client → Supabase PostgreSQL                              │
            │ - Connection pooling (Prisma Accelerate)                         │
            │ - Indexes: userId, categoryId, date, status                     │
            └──────────────────────────────────────────────────────────────────┘
```

### 3. Cache Invalidation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ SYNC MUTATION COMPLETES                                             │
│ syncTransactions.trigger() → status: SUCCESS                        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SyncButton.tsx useEffect (line 64)                                  │
│ if (status.status === 'SUCCESS') { ... }                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┬──────────────┐
                    ▼              ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ transactions.*   │ │ budgets.*        │ │ analytics.*      │ │ accounts.*       │
    │ .invalidate()    │ │ .invalidate()    │ │ .invalidate()    │ │ .invalidate()    │
    └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
            │                      │                      │                      │
            └──────────────┬───────┴──────────────────────┴──────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ React Query Cache Invalidation                                   │
            │ - Marks queries as stale                                         │
            │ - Triggers refetch for active queries (components mounted)       │
            │ - Removes stale data for inactive queries                        │
            └──────────────────────────────────────────────────────────────────┘
                           ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ RecentTrans.     │ │ Financial Health │ │ Dashboard Stats  │ │ Budget Alerts    │
    │ Card             │ │ Indicator        │ │                  │ │ [NEW]            │
    │ RE-FETCHES       │ │ RE-FETCHES       │ │ RE-FETCHES       │ │ RE-FETCHES       │
    └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
            │                      │                      │                      │
            └──────────────┬───────┴──────────────────────┴──────────────────────┘
                           ▼
            ┌──────────────────────────────────────────────────────────────────┐
            │ UI UPDATES WITH NEW DATA                                         │
            │ - Budget progress bars animate to new values                    │
            │ - Recent transactions show imported items                        │
            │ - Budget alerts display newly triggered alerts                   │
            │ - Account balances reflect updated values                        │
            └──────────────────────────────────────────────────────────────────┘
```

## Questions for Planner

### 1. Budget Alert Persistence Strategy
**Question:** Should budget alerts persist across sessions, or be dismissible?

**Context:** BudgetAlert model has `sent` boolean but no `acknowledged` field.

**Options:**
- A) Alerts persist until user dismisses (add `acknowledged` field)
- B) Alerts auto-dismiss after shown once (current schema supports this)
- C) Alerts reset each month (check `sent` + `month` combination)

**Recommendation:** Option A (add `acknowledged` field) for better UX

### 2. "Quick Sync All" vs Individual Sync
**Question:** Should dashboard have "Sync All Banks" or per-bank sync?

**Context:** User may have multiple bank connections (FIBI + CAL).

**Options:**
- A) Single "Sync All" button (parallel sync all connections)
- B) Individual sync buttons per bank (FinancialHealthIndicator shows each)
- C) Both (Quick Sync All + individual buttons in settings)

**Recommendation:** Option C for flexibility

### 3. Budget Alert Display Location
**Question:** Where should budget alerts be displayed?

**Options:**
- A) Dashboard top (above FinancialHealthIndicator) - high visibility
- B) Dashboard bottom (below stats) - less intrusive
- C) Dedicated "Alerts" page (route: /alerts)
- D) Modal popup on dashboard load (dismissible)

**Recommendation:** Option A (high visibility) for critical alerts

### 4. Performance: Aggregate Query Scope
**Question:** Should budget recalculation be selective (only affected categories) or full (all budgets)?

**Context:** Sync imports transactions for multiple categories.

**Options:**
- A) Recalculate only affected categories (faster, more complex)
- B) Recalculate all budgets for month (simpler, may be slower)
- C) Rely on React Query cache invalidation (let UI refetch as needed)

**Recommendation:** Option C (cache invalidation) - simplest, leverages existing patterns

### 5. Sync Status Granularity
**Question:** Should "Last Synced" be per-connection or aggregate?

**Context:** Dashboard may show multiple bank connections.

**Options:**
- A) Show oldest sync time ("Last synced: 2 hours ago" - worst case)
- B) Show most recent sync time ("Last synced: 5 minutes ago" - best case)
- C) Show per-connection status (FIBI: 5m ago, CAL: 2h ago)

**Recommendation:** Option B (most recent) for dashboard, Option C for settings page

### 6. Transaction Count in Sync Toast
**Question:** Should sync completion toast show transaction count breakdown?

**Context:** Sync returns `{ imported, skipped, categorized }`.

**Current Message:**
```
"Imported 12 new transactions, skipped 3 duplicates"
```

**Alternative:**
```
"Imported 12 new transactions, skipped 3 duplicates
 • Auto-categorized: 10 (AI), 2 (cached)"
```

**Recommendation:** Keep simple (current message) for Iteration 20, add details in future

## Conclusion

Iteration 20 is **LOW-MEDIUM COMPLEXITY** with clear integration seams and established patterns. Key recommendations:

1. ✅ **Use existing budget aggregate queries** - no changes needed, already optimal
2. ✅ **Follow SyncButton.tsx invalidation pattern** - proven, works well
3. ✅ **Create budget-alerts.service.ts** - separate concerns, enable testing
4. ✅ **Add comprehensive tests for alert logic** - critical for correctness
5. ✅ **Enhance existing dashboard components** - no need for full rewrite
6. ✅ **Use established UI components** - shadcn/ui Alert, Badge, Card

**Estimated Effort:** 6-8 hours (as per master plan)
**Risk Level:** LOW (leveraging existing systems, mostly integration)
**Builder Split:** NOT NEEDED - features are cohesive, complexity is manageable

**Success Criteria:**
- Budget progress updates within 1 minute of sync completion ✅
- Budget alerts trigger correctly when thresholds exceeded ✅
- Dashboard shows real-time sync status ✅
- All caches invalidate correctly (transactions, budgets, analytics, accounts) ✅
- Sync completes in <60 seconds for 50 transactions ✅
