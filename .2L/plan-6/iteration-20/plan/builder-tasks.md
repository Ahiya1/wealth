# Builder Task Breakdown - Iteration 20

## Overview

2 primary builders will work in parallel on distinct feature domains.
Estimated total effort: 8-10 hours (4-5 hours per builder).

## Builder Assignment Strategy

- **Builder 1** focuses on budget integration and real-time UI updates (user-facing features)
- **Builder 2** focuses on production infrastructure and monitoring (DevOps/reliability)
- Minimal file overlap - only SyncButton.tsx modified by both (Builder 1 first, Builder 2 reviews)
- Dependencies clearly marked - Builder 2 can start immediately (no blocking)

---

## Builder-1: Budget Integration & Real-Time Updates

### Scope

Implement the automated budget alert system and enhance dashboard with real-time sync status. This builder connects the transaction import pipeline (Iteration 3) to the budget system (Iterations 1-2), creating a seamless feedback loop where imported transactions automatically trigger budget alerts and update the UI.

### Complexity Estimate

**MEDIUM**

**Rationale:**
- Budget alert logic has edge cases (threshold crossing detection, idempotency)
- Cache invalidation requires comprehensive testing (8 caches to invalidate)
- Dashboard components follow established patterns (low risk)
- tRPC endpoint creation is straightforward (existing examples)

**Estimated Time:** 4-5 hours

### Success Criteria

- [ ] Budget alerts trigger when thresholds crossed (75%, 90%, 100%)
- [ ] Budget alerts display on dashboard with dismiss action
- [ ] Budget alerts are idempotent (only trigger once per threshold per month)
- [ ] Dashboard shows "Last Synced" timestamp for connected banks
- [ ] Budget progress updates within 1 minute of sync completion
- [ ] All 8 caches invalidate after sync (transactions, budgets, alerts, analytics, accounts, connections, sync history)
- [ ] Unit tests pass for alert triggering logic (20+ test cases)
- [ ] Integration test passes for end-to-end sync → alert flow

### Files to Create

1. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/services/budget-alerts.service.ts`**
   - Core alert triggering logic
   - `checkBudgetAlerts()` function
   - `resetBudgetAlerts()` function
   - Export ALERT_THRESHOLDS constant

2. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/services/__tests__/budget-alerts.service.test.ts`**
   - Unit tests for alert logic (20+ test cases)
   - Test threshold crossing (75%, 90%, 100%)
   - Test multiple thresholds in single import
   - Test idempotency (alerts already sent)
   - Test edge cases (refunds, budget deleted, zero budget)

3. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/dashboard/BudgetAlertsCard.tsx`**
   - Dashboard component to display active alerts
   - Use Alert component with variant based on threshold
   - Loading skeleton and empty state
   - Dismiss button for unsent alerts

4. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/types/budget-alerts.ts`**
   - Type definitions for BudgetAlertResult
   - Type for AlertThreshold
   - Export types for use across files

### Files to Modify

1. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/services/transaction-import.service.ts`**
   - Import `checkBudgetAlerts` function
   - Call `checkBudgetAlerts()` after categorization (line ~195)
   - Add `alertsTriggered` to return type
   - Log alert count for debugging

2. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/budgets.router.ts`**
   - Add `activeAlerts` tRPC endpoint (query procedure)
   - Fetch budgets with unsent or recently sent alerts (last 24 hours)
   - Calculate current spending for each budget
   - Return alert details with category name, percentage, amounts

3. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/bank-connections/SyncButton.tsx`**
   - Add 3 new cache invalidations:
     - `utils.budgets.activeAlerts.invalidate()`
     - `utils.analytics.dashboardSummary.invalidate()`
     - `utils.accounts.list.invalidate()`
   - Update success toast to show alert count (optional)

4. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/app/(dashboard)/dashboard/page.tsx`**
   - Import BudgetAlertsCard component
   - Add BudgetAlertsCard below FinancialHealthIndicator
   - Position: Between FinancialHealthIndicator and UpcomingBills

5. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/dashboard/FinancialHealthIndicator.tsx`**
   - Add "Last Synced" timestamp display
   - Query `bankConnections.list` to get connection sync times
   - Use `formatDistanceToNow()` for relative time ("2 minutes ago")
   - Display in CardHeader (top-right corner)

### Dependencies

**Depends on:** None - can start immediately

**Blocks:** Builder 2 needs to review SyncButton.tsx after Builder 1 completes (merge conflict prevention)

### Implementation Notes

#### 1. Budget Alert Triggering Logic

**Critical Edge Cases:**
- **Threshold Crossing Detection:** Compare old vs new percentage, only trigger if crossed threshold
  - Budget at 70% → import 10% expenses → crossed 75% → trigger alert
  - Budget at 80% → import 20% expenses → crossed 90% AND 100% → trigger BOTH alerts
- **Idempotency:** Only trigger alerts where `sent = false`
  - Use `updateMany` with `where: { sent: false }` to prevent duplicates
  - Multiple syncs should not create duplicate alerts
- **Refunds:** If refund causes percentage to drop, do NOT trigger alert
  - Budget at 80% → import -10% (refund) → now 70% → no alert
- **Zero Budget:** If budget amount is 0, percentage is 0 (avoid division by zero)

**Performance Considerations:**
- Use aggregate query for spending calculation (not findMany + reduce)
- Batch alert updates with `updateMany` (not individual updates)
- Only fetch budgets for affected categories (not all budgets)

#### 2. Active Alerts Endpoint

**Query Strategy:**
- Fetch budgets with alerts for current month (default) or specified month
- Filter alerts: `sent = false` OR `sent = true AND sentAt > 24 hours ago`
- Order by threshold descending (100% alerts first, then 90%, then 75%)
- Include category name for display

**Data Structure:**
```typescript
{
  alerts: [
    {
      id: 'alert-1',
      budgetId: 'budget-1',
      categoryId: 'cat-groceries',
      categoryName: 'Groceries',
      threshold: 100,
      percentage: 105,
      spentAmount: 525.00,
      budgetAmount: 500.00,
      sent: true,
      sentAt: '2025-11-18T14:32:00Z',
    }
  ]
}
```

#### 3. Dashboard Component

**UI Variants:**
- **100% threshold:** Red alert (destructive variant) with XCircle icon
- **90% threshold:** Yellow alert (warning variant) with AlertTriangle icon
- **75% threshold:** Blue alert (default variant) with AlertTriangle icon

**Loading State:**
- Show 2 skeleton alerts (gray rounded rectangles)
- Animate pulse effect

**Empty State:**
- Show CheckCircle icon + "All budgets are on track" message
- Green sage-600 color for positive feedback

#### 4. Last Synced Display

**Data Source:**
```typescript
const { data: connections } = trpc.bankConnections.list.useQuery()

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
```

**Display Location:**
- FinancialHealthIndicator CardHeader (top-right corner)
- Use `text-xs text-muted-foreground` for subtle display
- Updates automatically when cache invalidates

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 1:** Budget Alert Service (checkBudgetAlerts function)
- **Pattern 2:** Integrate Alert Check in Transaction Import
- **Pattern 3:** Active Alerts tRPC Endpoint
- **Pattern 4:** Budget Alerts Dashboard Component
- **Pattern 5:** Comprehensive Cache Invalidation After Sync
- **Pattern 12:** Last Synced Timestamp Display
- **Pattern 13:** Unit Test for Budget Alert Logic

### Testing Requirements

#### Unit Tests (20+ test cases)

**File:** `budget-alerts.service.test.ts`

1. **Threshold Crossing:**
   - Single threshold crossed (75%)
   - Multiple thresholds crossed (90% and 100%)
   - Threshold not crossed (60%)

2. **Idempotency:**
   - Alert already sent (should not trigger again)
   - Alert sent in previous month (should trigger for new month)

3. **Edge Cases:**
   - Zero budget amount (avoid division by zero)
   - Negative spending (refund reduces percentage)
   - No transactions for category (0% usage)
   - Budget deleted (graceful handling)

4. **Parallel Syncs:**
   - Multiple syncs trigger same alert (only one sent)
   - Different categories trigger different alerts (no conflict)

#### Integration Tests

**File:** `budgets.router.test.ts`

1. End-to-end sync → alert flow:
   - Import transactions → check budget alerts → query active alerts → verify results

2. Cache invalidation:
   - Sync completes → invalidate caches → refetch queries → verify updated data

#### Manual Testing Checklist

- [ ] Import 10 transactions for "Groceries" category (budget: $500)
- [ ] Verify alert triggered when spending crosses 75% ($375)
- [ ] Verify alert appears on dashboard
- [ ] Click dismiss button (if implemented)
- [ ] Import more transactions to cross 90% threshold
- [ ] Verify second alert triggered
- [ ] Refresh page and verify alerts persist
- [ ] Import refund transaction → verify no alert (percentage drops)

### Potential Split Strategy

**Not Recommended** - Task is cohesive and well-scoped

If complexity proves higher than expected (unlikely), consider splitting:

**Foundation (Builder 1A - 2-3 hours):**
- Create budget-alerts.service.ts
- Add checkBudgetAlerts call to transaction-import.service.ts
- Write unit tests for alert logic

**UI Components (Builder 1B - 2 hours):**
- Create BudgetAlertsCard.tsx
- Add activeAlerts tRPC endpoint
- Enhance FinancialHealthIndicator with last synced

**Integration (Builder 1 final - 1 hour):**
- Add cache invalidations to SyncButton.tsx
- Add BudgetAlertsCard to dashboard page
- Integration testing

---

## Builder-2: Production Monitoring & Security Compliance

### Scope

Set up production error monitoring with Sentry, create health check endpoint for uptime monitoring, and implement security compliance features (disclaimers, data deletion flow). This builder focuses on production readiness and reliability infrastructure.

### Complexity Estimate

**MEDIUM-HIGH**

**Rationale:**
- Sentry integration requires careful configuration (PII sanitization critical)
- PII sanitization has security implications (must test thoroughly)
- Health check endpoint is straightforward (low complexity)
- Compliance features (disclaimers, data deletion) are UI-focused (medium complexity)
- Performance query optimization requires careful testing (avoid breaking existing logic)

**Estimated Time:** 4-5 hours

### Success Criteria

- [ ] Sentry captures 100% of server and client errors
- [ ] Sentry PII sanitization removes all sensitive fields (amount, payee, accountNumber)
- [ ] Health check endpoint returns 200 OK when database up, 503 when down
- [ ] UptimeRobot monitor configured (ping /api/health every 5 minutes)
- [ ] Financial disclaimer modal displays on first login (stored in localStorage)
- [ ] Bank scraper consent checkbox required in connection wizard
- [ ] Data deletion flow completes successfully (cascade deletes all user data)
- [ ] Budget progress query optimization reduces query time by 50%+ (N+1 pattern eliminated)
- [ ] Unit tests pass for PII sanitization (10+ test cases)
- [ ] Integration test passes for data deletion cascade

### Files to Create

1. **`/home/ahiya/Ahiya/2L/Prod/wealth/sentry.client.config.ts`**
   - Sentry client configuration (created by wizard)
   - PII sanitization in beforeSend hook
   - 10% sample rate for performance monitoring
   - Session replay configuration

2. **`/home/ahiya/Ahiya/2L/Prod/wealth/sentry.server.config.ts`**
   - Sentry server configuration (created by wizard)
   - Same PII sanitization as client
   - Environment and release tracking

3. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/health/route.ts`**
   - Health check endpoint
   - Test Prisma connection with `SELECT 1`
   - Return 200 OK or 503 Service Unavailable
   - Disable caching (force-dynamic)

4. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/legal/FinancialDisclaimer.tsx`**
   - Modal component for financial disclaimer
   - Display on first login (check localStorage)
   - Require "I Understand" button click
   - Store acknowledgment in localStorage

5. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/legal/BankScraperConsent.tsx`**
   - Checkbox component for bank scraper consent
   - Display in bank connection wizard
   - Require explicit consent before connecting
   - Show disclaimer text (screen scraping, ToS violation, encryption)

6. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/__tests__/sentry.test.ts`**
   - Unit tests for Sentry PII sanitization
   - Test beforeSend hook removes sensitive fields
   - Test user ID sanitization (first 3 chars only)
   - Test breadcrumb sanitization

### Files to Modify

1. **`/home/ahiya/Ahiya/2L/Prod/wealth/next.config.js`**
   - Add Sentry webpack plugin configuration (created by wizard)
   - Configure source map upload
   - Add environment variables

2. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/trpc.ts`**
   - Add Sentry error middleware
   - Capture all tRPC errors with context
   - Sanitize user ID before sending to Sentry

3. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/budgets.router.ts`**
   - Optimize budget progress query (eliminate N+1 pattern)
   - Use Promise.all for parallel aggregate queries
   - Maintain backward compatibility with existing logic

4. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/analytics.router.ts`**
   - Replace in-memory reduce with aggregate queries
   - Optimize income/expense calculations
   - Use Promise.all for parallel execution

5. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/users.router.ts`** (create if doesn't exist)
   - Add `deleteAccount` mutation
   - Implement password verification
   - Execute cascade delete (Prisma handles via schema)
   - Return success confirmation

6. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/app/(dashboard)/settings/page.tsx`** (or create settings page)
   - Add "Delete My Account" button
   - Add confirmation modal with password input
   - Optional: Export data before deletion
   - Show success message and redirect to home

7. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/components/bank-connections/BankConnectionWizard.tsx`**
   - Add BankScraperConsent checkbox before credential input
   - Disable "Connect" button until consent checked
   - Store consent timestamp in database (optional)

8. **`/home/ahiya/Ahiya/2L/Prod/wealth/src/app/layout.tsx`**
   - Add FinancialDisclaimer modal (conditional rendering)
   - Check localStorage for acknowledgment
   - Display modal on first visit only

### Dependencies

**Depends on:** None - can start immediately

**Blocks:** None - works in parallel with Builder 1

**Coordination Point:** Review Builder 1's SyncButton.tsx changes to avoid merge conflict

### Implementation Notes

#### 1. Sentry Setup

**Installation:**
```bash
npx @sentry/wizard@latest -i nextjs
```

**Wizard Actions:**
- Creates sentry.client.config.ts and sentry.server.config.ts
- Modifies next.config.js (adds Sentry webpack plugin)
- Adds environment variables to .env.local.example
- Creates sentry.properties (gitignored)

**Manual Steps:**
1. Create Sentry account and project at sentry.io
2. Copy DSN from project settings
3. Add environment variables to Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN` (for source maps)
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
4. Configure beforeSend hook (PII sanitization)
5. Test error capture with manual error trigger

#### 2. PII Sanitization

**Sensitive Fields to Remove:**
- `amount` (transaction amounts)
- `payee` (merchant names)
- `accountNumber` (bank account numbers)
- `balance` (account balances)
- `credentials` (bank login credentials)
- `password` (user passwords)
- `userId` (sanitize to first 3 chars + ***)
- `userPassword` (Israeli bank scraper field)

**Sanitization Code:**
```typescript
beforeSend(event) {
  if (event.request?.data) {
    const sensitiveFields = [
      'amount', 'payee', 'accountNumber', 'balance',
      'credentials', 'password', 'userId', 'userPassword',
    ]
    for (const field of sensitiveFields) {
      delete event.request.data[field]
    }
  }

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
}
```

**Testing:**
- Create unit tests that trigger errors with sensitive data
- Verify sanitized event does not contain sensitive fields
- Test with real error in preview environment

#### 3. Health Check Endpoint

**Implementation:**
```typescript
// src/app/api/health/route.ts
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString(), checks: { database: 'ok' } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString(), checks: { database: 'error' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
```

**UptimeRobot Configuration:**
1. Create account at uptimerobot.com (free tier)
2. Add HTTP(s) monitor:
   - URL: `https://wealth.vercel.app/api/health`
   - Interval: 5 minutes
   - Expected status code: 200
3. Configure alert contacts (email, Slack webhook)
4. Set response time threshold: >2s = warning

#### 4. Financial Disclaimer

**Disclaimer Text:**
```
Wealth is a personal finance tracking tool and is provided for informational
purposes only. The information and features provided by Wealth should not be
construed as financial, investment, tax, or legal advice.

- This app does NOT provide financial advice or recommendations
- Transaction categorization is automated and may contain errors
- Budget calculations are estimates based on your data
- Wealth is not a licensed financial advisor or institution
- Always consult with qualified professionals for financial decisions

By using Wealth, you acknowledge that you understand these limitations and
agree to use the app at your own risk.
```

**Modal Implementation:**
- Display on first app visit (check localStorage key: `wealth_disclaimer_acknowledged`)
- Block UI interaction until acknowledged (modal backdrop)
- "I Understand" button stores acknowledgment in localStorage
- Never show again unless localStorage cleared

#### 5. Bank Scraper Consent

**Consent Text:**
```
By connecting your bank account, you authorize Wealth to:

✓ Access your bank account data via screen scraping technology
✓ Store your encrypted bank credentials on our servers (AES-256-GCM encryption)
✓ Import your transaction history (last 30-90 days)

⚠️ Important Disclaimers:

• Screen scraping may violate your bank's Terms of Service
• We are NOT affiliated with or endorsed by your bank
• Bank account access can be revoked at any time in Settings
• Your credentials are encrypted but stored on our servers
• We will NEVER share your credentials with third parties

□ I understand and authorize Wealth to access my bank account
```

**Implementation:**
- Checkbox in BankConnectionWizard (before credential input)
- Disable "Connect" button until checked
- Optional: Store consent timestamp in database (BankConnection.consentedAt field)

#### 6. Performance Optimization

**Budget Progress Query (budgets.router.ts:190-231):**

**Before (N+1 pattern):**
```typescript
for (const budget of budgets) {
  const spent = await prisma.transaction.aggregate(...)
  budgetsWithProgress.push({ ...budget, spent })
}
```

**After (parallel aggregates):**
```typescript
const budgetsWithProgress = await Promise.all(
  budgets.map(async (budget) => {
    const spent = await prisma.transaction.aggregate(...)
    return { ...budget, spent }
  })
)
```

**Analytics Dashboard (analytics.router.ts:43-52):**

**Before (in-memory reduce):**
```typescript
const transactions = await prisma.transaction.findMany(...)
const income = transactions.filter(t => t.amount > 0).reduce(...)
const expenses = transactions.filter(t => t.amount < 0).reduce(...)
```

**After (parallel aggregates):**
```typescript
const [incomeResult, expensesResult] = await Promise.all([
  prisma.transaction.aggregate({ where: { amount: { gt: 0 } }, _sum: { amount: true } }),
  prisma.transaction.aggregate({ where: { amount: { lt: 0 } }, _sum: { amount: true } }),
])
const income = Number(incomeResult._sum.amount || 0)
const expenses = Math.abs(Number(expensesResult._sum.amount || 0))
```

**Performance Target:**
- Budget progress query: <500ms (currently ~1,500ms)
- Dashboard summary: <200ms (currently ~800ms)
- Measure before/after with Sentry APM or console.time

### Patterns to Follow

Reference patterns from `patterns.md`:

- **Pattern 6:** Sentry Client Configuration
- **Pattern 7:** Sentry Server Configuration
- **Pattern 8:** tRPC Error Middleware with Sentry
- **Pattern 9:** Health Check Endpoint
- **Pattern 10:** Budget Progress Aggregate Query Optimization
- **Pattern 11:** Dashboard Analytics Aggregate Optimization

### Testing Requirements

#### Unit Tests

**File:** `sentry.test.ts`

1. **PII Sanitization:**
   - Test beforeSend removes transaction amounts
   - Test beforeSend removes payee names
   - Test beforeSend removes account numbers
   - Test beforeSend sanitizes user ID
   - Test breadcrumb sanitization

2. **Health Check:**
   - Test returns 200 OK when database up
   - Test returns 503 when database down
   - Test response includes timestamp
   - Test cache headers set correctly

#### Integration Tests

**File:** `users.router.test.ts`

1. **Data Deletion:**
   - Create user with transactions, budgets, accounts
   - Call deleteAccount mutation
   - Verify all related data deleted (cascade)
   - Verify user cannot login after deletion

#### Manual Testing Checklist

- [ ] Trigger client error → verify appears in Sentry dashboard
- [ ] Trigger server error (tRPC) → verify appears in Sentry
- [ ] Check Sentry event payload → verify no PII (amounts, payees)
- [ ] Visit /api/health → verify returns 200 OK
- [ ] Stop Supabase (test mode) → verify /api/health returns 503
- [ ] Configure UptimeRobot → verify monitor pings endpoint
- [ ] First visit to app → verify disclaimer modal displays
- [ ] Click "I Understand" → verify modal dismissed and not shown again
- [ ] Add bank connection → verify consent checkbox required
- [ ] Delete account → verify confirmation modal appears
- [ ] Confirm deletion → verify redirect to home and cannot login

### Potential Split Strategy

**Recommended** if time runs short:

**Foundation (Builder 2A - 3 hours):**
- Install Sentry via wizard
- Configure PII sanitization
- Add error middleware to tRPC
- Create health check endpoint
- Write unit tests for PII sanitization

**Compliance & UX (Builder 2B - 2 hours):**
- Create FinancialDisclaimer modal
- Create BankScraperConsent checkbox
- Implement data deletion flow
- Performance query optimizations

**Priority:** Foundation (2A) is CRITICAL - must complete before launch. Compliance (2B) is IMPORTANT but can be added post-launch if time constrained.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

- **Builder 1:** Budget Integration & Real-Time Updates
- **Builder 2:** Production Monitoring & Security Compliance

Both builders can start immediately and work in parallel.

### Integration Notes

**Shared Files:**
- `SyncButton.tsx` - Builder 1 modifies first (add cache invalidations), Builder 2 reviews after
- `budgets.router.ts` - Builder 1 adds activeAlerts endpoint, Builder 2 optimizes progress query (different functions, no conflict)

**Merge Strategy:**
1. Builder 1 completes budget alert features and commits
2. Builder 2 pulls latest changes before modifying SyncButton.tsx
3. Builder 2 reviews Builder 1's cache invalidations (ensure comprehensive)
4. Both builders test in preview environment before merging to main

**Potential Conflict Areas:**
- SyncButton.tsx cache invalidation section (Builder 1 adds 3 lines, Builder 2 may review)
- budgets.router.ts exports (Builder 1 adds endpoint, Builder 2 optimizes existing - should not conflict)

**Conflict Prevention:**
- Builder 1 creates feature branch: `iteration-20-budget-alerts`
- Builder 2 creates feature branch: `iteration-20-production-monitoring`
- Integration builder merges both branches and resolves conflicts (if any)

### Integration Testing Plan

**After Both Builders Complete:**

1. **End-to-End User Journey:**
   - Sign up new user
   - Connect bank account (verify consent checkbox)
   - Trigger sync (verify progress indicators)
   - Verify transactions imported
   - Verify budget alerts triggered (if thresholds crossed)
   - View dashboard (verify alerts display)
   - Check Sentry dashboard (verify errors captured)
   - Trigger test error (verify PII sanitized)

2. **Performance Validation:**
   - Measure budget progress query time (should be <500ms)
   - Measure dashboard load time (should be <2s)
   - Run Lighthouse CI (performance score >90)

3. **Security Validation:**
   - Check Sentry event payloads (verify no PII)
   - Test health check endpoint (200 OK, 503 on failure)
   - Test data deletion cascade (all related data deleted)

4. **Cache Invalidation Validation:**
   - Sync transactions
   - Verify all 8 caches invalidate
   - Verify dashboard auto-refreshes
   - Verify budget alerts appear without manual refresh

## Final Deployment Checklist

Before deploying to production:

- [ ] All unit tests pass (budget alerts, PII sanitization)
- [ ] All integration tests pass (sync → alert, data deletion)
- [ ] E2E test passes (signup → sync → alert display)
- [ ] Performance benchmarks met (budget queries <500ms, dashboard <2s)
- [ ] Sentry configured in Vercel (environment variables set)
- [ ] UptimeRobot monitor configured (ping /api/health)
- [ ] Source maps uploaded to Sentry (automatic via webhook)
- [ ] Financial disclaimer displays on first login
- [ ] Bank scraper consent required in connection wizard
- [ ] Data deletion flow completes successfully
- [ ] No PII in Sentry events (manual verification)
- [ ] Preview deployment tested by product owner
- [ ] Merge to main branch
- [ ] Production deployment successful
- [ ] Monitor Sentry dashboard for 1 hour (verify no errors)

## Estimated Timeline

**Builder 1 (Budget Integration):**
- Budget alert service: 2 hours
- Dashboard components: 1.5 hours
- Cache invalidation: 30 minutes
- Testing: 1 hour
- **Total: 5 hours**

**Builder 2 (Production Monitoring):**
- Sentry setup: 1.5 hours
- Health check: 30 minutes
- Compliance features: 1.5 hours
- Performance optimization: 1 hour
- Testing: 30 minutes
- **Total: 5 hours**

**Integration:**
- Merge branches: 15 minutes
- Resolve conflicts (if any): 15 minutes
- End-to-end testing: 30 minutes
- **Total: 1 hour**

**Grand Total: 11 hours** (includes buffer for unexpected issues)

**Note:** Master plan estimates 8-10 hours. If time pressure, prioritize:
1. Budget alerts (critical user feature)
2. Sentry integration (critical production requirement)
3. Health check (essential for monitoring)
4. Defer: Compliance features (can add post-launch)

## Success Metrics

Track these metrics post-deployment:

1. **Budget Alert Accuracy:**
   - Target: 100% of thresholds trigger correctly (no false positives/negatives)
   - Measure: Manual testing with controlled data

2. **Error Capture Rate:**
   - Target: 100% of errors appear in Sentry dashboard
   - Measure: Trigger test errors, verify in Sentry

3. **Performance Improvement:**
   - Target: Budget progress query <500ms (50% reduction from baseline)
   - Measure: Sentry APM or Vercel Analytics

4. **Uptime:**
   - Target: 99.9% uptime (measured by UptimeRobot)
   - Measure: Monthly uptime report

5. **PII Protection:**
   - Target: 0 PII leaks in Sentry events
   - Measure: Manual audit of 100 error events

## Post-Launch Enhancements

Defer to future iterations:

1. **Dashboard Animations:**
   - Budget progress bar animations
   - Celebration animations on budget underspend
   - Estimated effort: 4-5 hours

2. **Structured Logging Migration:**
   - Replace console.log with Pino
   - Add request ID tracking
   - Estimated effort: 3-4 hours

3. **Playwright E2E Tests:**
   - Critical flow automation
   - Production smoke tests
   - Estimated effort: 6-8 hours

4. **Redis Caching Layer:**
   - Cache budget calculations
   - 10x cache performance improvement
   - Estimated effort: 8-10 hours

5. **Mobile Bottom Navigation:**
   - Fixed bottom nav for key actions
   - Improved mobile UX
   - Estimated effort: 3-4 hours

These enhancements can be addressed in a dedicated "polish" iteration post-MVP launch.
