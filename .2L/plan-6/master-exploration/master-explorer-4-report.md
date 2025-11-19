# Master Exploration Report

## Explorer ID
master-explorer-4

## Focus Area
Scalability & Performance Considerations

## Vision Summary
Building automatic transaction sync with Israeli bank scrapers (FIBI + Visa CAL) to eliminate manual entry, with AI-powered categorization and real-time budget tracking.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 11 features (6 must-have MVP, 5 should-have post-MVP)
- **User stories/acceptance criteria:** 42+ acceptance criteria across MVP features
- **Estimated total work:** 24-32 hours across 4 proposed implementation phases

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **External dependency fragility:** Screen scraping with `israeli-bank-scrapers` is inherently unstable (bank UI changes break sync)
- **Real-time sync requirements:** Manual "Sync Now" button needs responsive feedback (target: <1 minute for sync + categorization)
- **AI categorization at scale:** Batch processing up to 50 transactions per sync with Claude API (30-90 day historical imports on first connection)
- **Security-critical operations:** AES-256-GCM encryption for banking credentials, session-based decryption, no plaintext credential logging
- **Database transaction complexity:** Multiple atomic operations (import → duplicate detection → categorization → budget updates → balance adjustments)

---

## Performance Bottlenecks

### Critical Performance Concerns

1. **Bank Scraper Latency (HIGH IMPACT)**
   - **Issue:** `israeli-bank-scrapers` performs headless browser automation (Puppeteer/Playwright)
   - **Expected duration:** 10-45 seconds per account (FIBI checking + CAL credit card = 20-90 seconds total)
   - **Bottleneck factors:**
     - 2FA/OTP handling (SMS code entry adds 30-60 seconds)
     - Network latency to Israeli banking servers
     - Rate limiting from banks (anti-scraping measures)
   - **Impact:** Users experience 1-2 minute wait during "Sync Now" operation
   - **Mitigation:**
     - Implement streaming progress updates (WebSocket or Server-Sent Events)
     - Show detailed status: "Connecting to bank..." → "Authenticating..." → "Fetching transactions..." → "Categorizing..."
     - Timeout after 90 seconds with clear error message
     - Cache credentials to avoid re-authentication on every sync

2. **AI Categorization Batch Processing (MEDIUM IMPACT)**
   - **Issue:** Claude API categorizes up to 50 transactions per batch (30-day import = ~100-200 transactions = 2-4 API calls)
   - **Expected duration:** 2-5 seconds per batch (50 transactions), 10-20 seconds for full 30-day import
   - **Bottleneck factors:**
     - API latency (Anthropic Claude: ~3s avg response time for 50 transactions)
     - Sequential processing (batch 1 → cache → batch 2 → cache)
     - MerchantCategoryCache lookup (N queries before batch call)
   - **Current optimization:** Cache hit rate reduces API calls (existing code already implements this)
   - **Impact:** First-time sync for new user: 90s bank scrape + 20s categorization = **110 seconds total**
   - **Mitigation:**
     - Parallelize cache lookups (single query with `IN` clause instead of N queries)
     - Increase batch size to 100 transactions (reduce API calls by 50%)
     - Background processing: Return sync success immediately, categorize async with notification when complete

3. **Database Write Operations During Import (MEDIUM IMPACT)**
   - **Issue:** Each transaction import triggers 4-5 database writes:
     - Transaction insert/upsert
     - Account balance update
     - MerchantCategoryCache upsert
     - Budget progress recalculation (query all transactions for category/month)
     - BudgetAlert check (75%, 90%, 100% thresholds)
   - **Expected duration:** 50-100ms per transaction (200 transactions = 10-20 seconds of DB writes)
   - **Bottleneck factors:**
     - Sequential writes (not batched)
     - Missing indexes on `Transaction(userId, categoryId, date)` composite query
     - Budget progress query scans all transactions for month (no aggregation table)
   - **Impact:** 30-day import creates 200+ transactions = 20-30 seconds of database load
   - **Mitigation:**
     - Batch insert transactions (Prisma `createMany` instead of loop)
     - Add composite index: `@@index([userId, categoryId, date])`
     - Defer budget recalculation to end of import (single query per category)
     - Use database transactions to ensure atomicity (already partially implemented)

4. **Duplicate Transaction Detection (LOW-MEDIUM IMPACT)**
   - **Issue:** Current vision suggests "date + amount + merchant fuzzy match" but no algorithm specified
   - **Expected complexity:** O(N*M) where N = imported transactions, M = existing transactions in date range
   - **Bottleneck factors:**
     - Fuzzy matching (Levenshtein distance) is CPU-intensive
     - Query all existing transactions for 30-day window (could be 1000+ records)
   - **Impact:** 200 new transactions × 1000 existing = 200K comparisons (unacceptable)
   - **Mitigation:**
     - Add unique constraint on `(userId, date, amount, payee)` for exact match detection
     - Use database query for exact matches first (fast)
     - Only fuzzy match on remaining candidates within ±1 day, ±5% amount
     - Limit fuzzy matching to 100 candidates max per transaction

---

## Scalability Concerns

### Concurrent User Capacity

**Current architecture limitations:**
- **Database connection pooling:** Supabase Transaction Pooler (pgBouncer) with `connection_limit=1` per serverless function
- **Expected concurrent users (MVP):** <100 users, <10 concurrent sync operations
- **Bottleneck:** Each "Sync Now" operation holds database connection for 90-120 seconds (scraping + categorization)
- **Connection exhaustion risk:** Supabase free tier = 60 connections, pgBouncer pooler = 15 transaction slots
- **Impact:** 15 concurrent syncs saturate pooler → 16th user gets "no available connections" error

**Recommendations:**
- **Immediate (Iteration 17-18):** Implement connection release strategy
  - Release connection during bank scraping (long-running external API call)
  - Reacquire connection for database writes
  - Pattern: `prisma.$disconnect()` after reading credentials, reconnect for import
- **Post-MVP (Iteration 23+):** Queue-based sync system
  - Add sync to background job queue (BullMQ, Inngest, or Vercel Queue)
  - User triggers sync → job queued → poll for completion (avoid long-running serverless function)
  - Enables 100+ users to queue syncs without connection exhaustion

### Data Volume Growth Projections

**Transaction volume assumptions:**
- **Per user:** 100-200 transactions/month (credit card + checking account)
- **100 users × 200 txn/month × 12 months = 240,000 transactions/year**
- **1,000 users × 200 txn/month × 12 months = 2.4M transactions/year**

**Database growth:**
- **Transaction table:** 2.4M rows/year @ ~500 bytes/row = **1.2 GB/year** (for 1,000 users)
- **MerchantCategoryCache:** ~5,000 unique merchants = 500 KB (negligible)
- **SyncLog:** 1,000 users × 30 syncs/month × 12 months = 360K logs/year @ 200 bytes/row = **72 MB/year**

**Query performance degradation:**
- **Current indexes:** 36 indexes (well-indexed schema)
- **Missing critical index:** `Transaction(userId, categoryId, date)` composite for budget queries
- **Expected degradation:** Budget progress query (monthly category spending) scans 20K rows for active user after 6 months
  - **Without index:** 500ms+ query time (unacceptable for dashboard load)
  - **With index:** <50ms query time (acceptable)

**Recommendations:**
- **Immediate (Iteration 17):** Add composite index `@@index([userId, categoryId, date(sort: Desc)])` on Transaction table
- **6 months post-launch:** Implement transaction archival (move >12 months old to archive table)
- **1 year post-launch:** Consider partitioning Transaction table by month (PostgreSQL native partitioning)

### Israeli Bank Scraper Reliability

**Success rate assumptions (based on `israeli-bank-scrapers` library):**
- **Active maintenance:** Library has 1.2K stars, last updated 2 months ago (healthy)
- **Expected success rate:** 85-95% for stable banks (FIBI, CAL)
- **Failure modes:**
  - Bank UI changes (break scraper selectors) - 5-10% failure rate
  - 2FA timeouts (user doesn't enter OTP in time) - 5% failure rate
  - Rate limiting (bank blocks automated access) - 2-3% failure rate
  - Network errors (transient) - 1-2% failure rate

**Impact on user experience:**
- **1 in 10 syncs fails** → User must retry manually → Frustration
- **Credential expiration:** Banks force password reset every 90 days → Sync fails → User must re-enter credentials
- **No automatic retry:** Vision specifies manual "Sync Now" only (no background retry)

**Recommendations:**
- **Immediate (Iteration 19-20):** Implement exponential backoff retry (3 attempts with 5s, 10s, 20s delays)
- **Immediate (Iteration 19-20):** Detailed error logging to `SyncLog` table with error codes:
  - `BANK_UI_CHANGE` → Show message: "Bank website updated, sync temporarily unavailable"
  - `2FA_TIMEOUT` → Prompt user to re-enter OTP
  - `CREDENTIALS_EXPIRED` → Redirect to settings to update password
  - `RATE_LIMITED` → Show cooldown timer: "Try again in 15 minutes"
- **Post-MVP (Iteration 23):** Monitor scraper library updates, auto-update when bank support changes
- **Long-term:** Apply for PSD2 Open Banking API license (eliminates scraping fragility)

---

## Database Optimization Needs

### Indexing Strategy

**Current state:** 36 indexes across schema (strong foundation)

**Missing critical indexes:**

1. **Transaction composite index for budget queries**
   ```prisma
   @@index([userId, categoryId, date(sort: Desc)])
   ```
   - **Reason:** Budget progress queries filter by `userId + categoryId + month range`
   - **Impact:** 10x faster budget dashboard load (500ms → 50ms)

2. **Transaction payee index for duplicate detection**
   ```prisma
   @@index([userId, payee, date])
   ```
   - **Reason:** Duplicate detection queries `WHERE payee LIKE '%merchant%' AND date BETWEEN ...`
   - **Impact:** Enables fast fuzzy matching candidate lookup

3. **BankConnection status index** (new table)
   ```prisma
   @@index([userId, status])
   ```
   - **Reason:** Settings page queries `WHERE userId = X AND status = 'ACTIVE'`
   - **Impact:** Fast connection list rendering

4. **SyncLog recent syncs index** (new table)
   ```prisma
   @@index([bankConnectionId, startedAt(sort: Desc)])
   ```
   - **Reason:** Dashboard shows "Last synced: 5 minutes ago" → `ORDER BY startedAt DESC LIMIT 1`
   - **Impact:** Sub-10ms last sync timestamp lookup

**Recommendation:** Add all 4 indexes in Iteration 17 schema migration (before import engine implementation).

### Query Optimization

**Problematic query patterns identified:**

1. **Budget progress calculation (current implementation)**
   ```typescript
   // budgets.router.ts - fetches ALL transactions for month
   const transactions = await ctx.prisma.transaction.findMany({
     where: {
       userId: ctx.user.id,
       categoryId: input.categoryId,
       date: { gte: startOfMonth, lte: endOfMonth },
     },
   })
   const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
   ```
   - **Issue:** Fetches full transaction records (500 bytes each) when only SUM needed
   - **Impact:** 1000 transactions × 500 bytes = 500 KB transferred, 100ms+ query time
   - **Solution:** Use Prisma aggregation:
     ```typescript
     const { _sum } = await ctx.prisma.transaction.aggregate({
       where: { userId, categoryId, date: { gte, lte } },
       _sum: { amount: true },
     })
     const spent = _sum.amount || 0
     ```
   - **Expected improvement:** 100ms → 10ms (10x faster), 500 KB → 50 bytes (10,000x less data)

2. **Dashboard summary query (current implementation)**
   ```typescript
   // analytics.router.ts - 4 parallel queries with includes
   const [accounts, currentMonthTransactions, budgets, recentTransactions] = await Promise.all([...])
   ```
   - **Issue:** `currentMonthTransactions` fetches full records with `include: { category: true }` for aggregation
   - **Impact:** 200 transactions × 600 bytes (with category join) = 120 KB transferred
   - **Solution:** Split into aggregation query + recent transactions query:
     ```typescript
     const spending = await ctx.prisma.transaction.groupBy({
       by: ['categoryId'],
       where: { userId, date: { gte, lte }, amount: { lt: 0 } },
       _sum: { amount: true },
     })
     ```
   - **Expected improvement:** 120 KB → 2 KB (60x less data)

3. **N+1 queries in transaction list**
   - **Current:** Transaction list includes `category` and `account` (good - uses Prisma join)
   - **No issue detected:** Already optimized with `include: { category: true, account: true }`

**Recommendation:** Refactor budget and analytics queries to use Prisma aggregation in Iteration 22 (post-import implementation).

### Connection Pooling

**Current configuration (from .env.example):**
- **DATABASE_URL:** `postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- **Connection limit:** 1 per serverless function (correct for pgBouncer)
- **Pooler type:** Transaction pooling (releases connection after each query)

**Concerns for sync operations:**
1. **Long-running sync transactions:** Bank scraping (90s) + import writes (30s) = 120s total
2. **Connection held during scraping:** If connection not released, blocks other queries
3. **Serverless function timeout:** Vercel free tier = 10s, Pro = 60s (sync exceeds timeout!)

**Critical finding:** **Sync operation will timeout on Vercel Hobby plan!**

**Recommendations:**
- **Architecture change required:** Cannot run 90-second sync in serverless function
- **Solution 1 (Iteration 19-20):** Split sync into phases
  1. **Phase 1 (serverless):** Decrypt credentials, initiate scraper, return immediately
  2. **Phase 2 (background):** Scraper runs in separate long-running process (Vercel Cron, external worker)
  3. **Phase 3 (serverless):** Poll for completion, import transactions when ready
- **Solution 2 (simpler, Iteration 19-20):** Run scraper on client-side (browser)
  - **Pros:** No serverless timeout, credentials never leave client
  - **Cons:** Requires browser extension or CORS workarounds, bank sites block client-side scraping
  - **Verdict:** Not feasible for Israeli banks (CORS, CSP headers block client scraping)
- **Recommended approach:** Use Vercel Cron for background sync
  - User clicks "Sync Now" → Create pending sync job in database → Return immediately
  - Vercel Cron (runs every 5 minutes) → Pick up pending jobs → Execute scraper → Import transactions
  - Client polls `/api/sync/status` every 5 seconds → Show progress → Notify when complete

---

## Caching Strategies

### Application-Level Caching

**Existing caching (already implemented):**
1. **MerchantCategoryCache table**
   - **Purpose:** Cache merchant → category mappings to avoid Claude API calls
   - **Hit rate:** Expected 70-90% after 30 days of usage (repeating merchants)
   - **Performance impact:** 3s Claude API call → <10ms cache lookup (300x faster)
   - **No changes needed:** Already well-designed

**Missing caching opportunities:**

1. **Budget progress caching**
   - **Issue:** Dashboard recalculates budget progress on every load (aggregates all month transactions)
   - **Solution:** Add `spent` column to Budget table, update incrementally on transaction create/update/delete
   - **Implementation:**
     ```prisma
     model Budget {
       spent Decimal @default(0) @db.Decimal(15, 2) // Cached value
     }
     ```
   - **Maintenance:** Update `spent` in transaction mutation hooks (already uses `ctx.prisma.$transaction`)
   - **Expected improvement:** Dashboard load 300ms → 50ms (6x faster)
   - **Trade-off:** Adds write complexity (must update budget on every transaction change)
   - **Recommendation:** Implement in Iteration 22 (budget integration phase)

2. **Analytics dashboard caching**
   - **Issue:** Dashboard summary fetches 4 parallel queries on every load (accounts, transactions, budgets, recent)
   - **Solution:** Use React Query with 5-minute stale time (already configured)
   - **Current state:** React Query used in 45 files (already implemented!)
   - **No changes needed:** Trust React Query cache for analytics

3. **Session-level credential caching**
   - **Issue:** Credentials decrypted from database on every sync (AES-256-GCM decryption = 5-10ms)
   - **Solution:** Cache decrypted credentials in server-side session (Redis, Vercel KV)
   - **Security concern:** Storing decrypted credentials in memory increases attack surface
   - **Recommendation:** NOT recommended - 10ms decryption is acceptable, security > performance

### CDN & Static Asset Optimization

**Current state (from next.config.js):**
- **Output:** `standalone` (optimized for Vercel deployment)
- **Build size:** 855 MB (.next directory)
- **Bundle chunks:** Minimal code splitting detected (only 9 instances of `Suspense/lazy/dynamic`)

**Optimization opportunities:**

1. **Code splitting for heavy dependencies**
   - **Issue:** `israeli-bank-scrapers` (if imported client-side) is 5-10 MB with Puppeteer
   - **Solution:** Dynamic import for scraper (server-side only, never bundle for client)
   - **Implementation:**
     ```typescript
     // DON'T: import scrapers from 'israeli-bank-scrapers' (bundles in client)
     // DO: const scrapers = await import('israeli-bank-scrapers') in API route only
     ```
   - **Expected improvement:** Client bundle size -5 MB
   - **Recommendation:** Verify in Iteration 19 that scraper is server-only

2. **Radix UI component tree shaking**
   - **Current:** 10+ Radix UI components imported (Alert, Dialog, Dropdown, etc.)
   - **Bundle impact:** Each component adds 10-20 KB (total ~200 KB)
   - **Solution:** Already using named imports (tree shaking enabled)
   - **No changes needed:** Next.js + Radix UI tree shaking works well

3. **Anthropic SDK bundle size**
   - **Issue:** `@anthropic-ai/sdk` is 500 KB (used for categorization)
   - **Solution:** Server-side only (never import in client components)
   - **Current state:** Used in `categorize.service.ts` (server-only)
   - **No changes needed:** Already optimized

**Recommendation:** Minimal changes needed - existing bundle optimization is adequate for MVP.

### Database-Level Caching

**Supabase/PostgreSQL caching:**
- **Query plan caching:** PostgreSQL caches execution plans (automatic)
- **Connection pooling:** pgBouncer caches connections (configured correctly)
- **No custom caching needed:** Rely on PostgreSQL defaults

**Recommendation:** No database-level caching changes needed for MVP.

---

## Infrastructure Requirements

### Server Sizing

**Vercel deployment (current platform):**
- **Tier:** Unknown (likely Hobby or Pro)
- **Limits:**
  - **Hobby:** 10s function timeout, 100 GB bandwidth/month, 1 GB serverless function memory
  - **Pro:** 60s function timeout, 1 TB bandwidth/month, 1 GB serverless function memory

**Critical finding:** **Hobby tier insufficient for sync operations (90s scraping > 10s timeout)**

**Recommendations:**
- **Minimum tier:** Vercel Pro ($20/month) for 60s function timeout
- **Alternative:** Use background jobs (Vercel Cron + database queue) to bypass timeout
  - Pro: Works on Hobby tier
  - Con: Adds complexity (polling, job queue management)
- **Recommended approach:** Start with Pro tier, migrate to background jobs if cost becomes issue

### Database Capacity

**Supabase configuration (from .env.example):**
- **Tier:** Unknown (likely Free or Pro)
- **Free tier limits:**
  - **Storage:** 500 MB database
  - **Connections:** 60 direct, 15 pooler slots
  - **Egress:** 5 GB/month
- **Pro tier limits ($25/month):**
  - **Storage:** 8 GB database
  - **Connections:** 200 direct, 40 pooler slots
  - **Egress:** 50 GB/month

**Capacity projections:**
- **100 users:** 240K transactions/year × 500 bytes = **120 MB storage** (Free tier sufficient)
- **1,000 users:** 2.4M transactions/year × 500 bytes = **1.2 GB storage** (Requires Pro tier)
- **Concurrent syncs:** 15 pooler slots on Free tier = **15 concurrent users max**
- **Egress:** Dashboard load = 50 KB/load, 1,000 users × 10 loads/day = **500 MB/day** (15 GB/month, requires Pro tier)

**Recommendations:**
- **MVP (0-100 users):** Supabase Free tier sufficient
- **Growth (100-1,000 users):** Upgrade to Supabase Pro ($25/month) within 3 months
- **Scale (1,000+ users):** Consider dedicated PostgreSQL instance (AWS RDS, DigitalOcean Managed Postgres)

### CDN Strategy

**Current state:**
- **Vercel CDN:** Automatic for static assets (enabled by default)
- **Edge caching:** Next.js Image Optimization uses Vercel Edge Network
- **No custom CDN needed:** Vercel handles all static asset distribution

**Image optimization:**
- **Usage:** Only 4 instances of `next/image` detected
- **Impact:** Minimal (no user-uploaded images, no heavy graphics)
- **Recommendation:** No changes needed

---

## Deployment Complexity

### CI/CD Pipeline

**Current state:**
- **Platform:** Vercel (detected from `vercel.json`)
- **Deployment:** Git push → Vercel auto-deploy (zero-config)
- **Database migrations:** Manual `prisma migrate deploy` (not automated)
- **Cron jobs:** Configured in `vercel.json` (recurring transactions, export cleanup)

**Risks:**
1. **Schema migration failures:** If Prisma migration fails mid-deploy, app breaks
2. **Zero-downtime migrations:** No strategy for additive schema changes (add column, then deploy code)
3. **Rollback complexity:** Cannot rollback database migration easily (Prisma doesn't support down migrations)

**Recommendations:**
- **Iteration 17 (schema changes):** Implement migration safety checklist:
  - Always make additive changes first (add columns with defaults, mark old columns nullable)
  - Deploy code compatible with both old and new schema
  - Run migration after code deploy succeeds
  - Remove old columns in separate migration 1 week later
- **Post-MVP:** Implement database migration automation with GitHub Actions
  ```yaml
  - name: Run migrations
    run: npx prisma migrate deploy
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
  ```

### Blue-Green Deployments

**Current state:**
- **Vercel deployments:** Atomic (new deployment replaces old instantly)
- **No blue-green:** Single production environment (no staging → production promotion)
- **Preview deployments:** Automatic for pull requests (good for testing)

**Risks:**
1. **Breaking changes:** If new code incompatible with existing data, users see errors immediately
2. **No rollback window:** If deploy breaks, must fix forward (no instant rollback to previous version)

**Recommendations:**
- **MVP:** Rely on Vercel instant rollback (available in dashboard)
- **Post-MVP:** Implement staging environment workflow:
  - `main` branch → Production
  - `staging` branch → Staging (test with real Supabase database clone)
  - Merge staging → main only after QA pass

---

## Monitoring and Observability Requirements

### Logging Strategy

**Current state:**
- **Console logs:** `console.error()` in categorize.service.ts (detected)
- **No structured logging:** No logging framework (Winston, Pino)
- **No log aggregation:** Logs lost after Vercel function shutdown (12-hour retention)

**Critical gaps:**
1. **Sync operation tracking:** No visibility into sync success/failure rates
2. **Bank scraper errors:** No structured error logs for debugging bank UI changes
3. **Performance metrics:** No query timing logs (cannot identify slow queries)

**Recommendations:**
- **Iteration 17-18 (Foundation):** Add `SyncLog` table (already in vision schema)
  - Log every sync attempt: `startedAt`, `completedAt`, `status`, `transactionsImported`, `errorDetails`
  - Query for stats: "Last 7 days sync success rate: 87%"
- **Iteration 19-20 (Import Engine):** Add structured error logging
  ```typescript
  await prisma.syncLog.create({
    data: {
      bankConnectionId,
      startedAt: new Date(),
      status: 'FAILED',
      errorDetails: JSON.stringify({
        errorCode: 'BANK_UI_CHANGE',
        bank: 'FIBI',
        message: 'Selector not found: .transaction-row',
        timestamp: new Date().toISOString(),
      }),
    },
  })
  ```
- **Post-MVP (Iteration 23+):** Integrate external logging (Vercel Log Drains, Sentry)

### Metrics Collection

**Current state:**
- **No metrics:** No performance monitoring (APM)
- **Vercel Analytics:** Available but not configured (requires opt-in)

**Critical metrics to track:**
1. **Sync operation metrics:**
   - Sync duration (p50, p95, p99)
   - Success rate (% successful syncs)
   - Transactions imported per sync (avg, max)
   - Error breakdown (by error code)
2. **Database query metrics:**
   - Budget progress query time (p50, p95)
   - Dashboard summary query time
   - Transaction list query time
3. **API latency metrics:**
   - Claude categorization API (p50, p95)
   - Bank scraper duration (p50, p95)
   - tRPC endpoint response times

**Recommendations:**
- **Immediate (Iteration 17):** Enable Vercel Web Analytics (1-click enable in dashboard)
- **Iteration 19-20:** Add custom timing logs
  ```typescript
  const start = Date.now()
  const transactions = await scrapeBankTransactions()
  const duration = Date.now() - start
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: { scrapeDurationMs: duration },
  })
  ```
- **Post-MVP (Iteration 23+):** Integrate APM tool (Vercel Speed Insights, Sentry Performance)

### Alerting Setup

**Current state:**
- **No alerting:** No automated alerts for failures
- **BudgetAlert table:** Exists for user-facing budget threshold alerts (75%, 90%, 100%)
- **No system alerts:** No ops team notifications

**Critical alerts needed:**
1. **Sync failure spike:** If >20% of syncs fail in 1 hour → Alert ops team
2. **Database connection exhaustion:** If connection pool saturated → Alert immediately
3. **Claude API errors:** If categorization fails >10 times/hour → Alert (check API key, quota)
4. **Bank scraper failures:** If FIBI or CAL scraper fails 5 times in row → Alert (likely bank UI change)

**Recommendations:**
- **MVP:** Manual monitoring (check `SyncLog` table daily)
- **Post-MVP (Iteration 23+):** Implement Vercel Monitoring alerts
  - Alert on 500 errors (>10/hour)
  - Alert on function timeouts (>5/hour)
  - Alert on slow database queries (>1s p95)
- **Long-term:** Integrate PagerDuty or Opsgenie for on-call rotation

---

## Resource Optimization Strategies

### Lazy Loading

**Current state:**
- **Code splitting:** Minimal (9 instances of `Suspense/lazy/dynamic`)
- **Route-based splitting:** Next.js App Router automatic code splitting (enabled)
- **Component-level splitting:** Not widely used

**Optimization opportunities:**

1. **Heavy dashboard components**
   - **Component:** Analytics charts (Recharts library = 200 KB)
   - **Solution:** Lazy load charts on tab switch
     ```typescript
     const SpendingChart = dynamic(() => import('./SpendingChart'), {
       loading: () => <Skeleton />,
     })
     ```
   - **Expected improvement:** Initial dashboard load -200 KB
   - **Recommendation:** Implement in Iteration 22 (dashboard enhancements)

2. **Export functionality**
   - **Component:** Export modal (includes XLSX library = 300 KB)
   - **Solution:** Lazy load export modal on button click
     ```typescript
     const ExportModal = dynamic(() => import('./ExportModal'))
     ```
   - **Expected improvement:** Dashboard load -300 KB
   - **Recommendation:** Already implemented (export system complete in Iteration 14-16)

**Recommendation:** Add lazy loading for analytics charts in Iteration 22.

### Code Splitting

**Current state:**
- **Next.js automatic splitting:** Each page is separate chunk (good)
- **Vendor splitting:** Next.js splits node_modules into vendor chunks (good)
- **Total chunks:** ~10-15 chunks (typical for Next.js app)

**No major issues detected.** Next.js handles code splitting well out of the box.

### Image Optimization

**Current state:**
- **next/image usage:** Only 4 instances (minimal images in app)
- **No user-uploaded images:** No avatar uploads, no document scans
- **Static assets:** Likely just logos, icons

**No optimization needed** - minimal image usage.

---

## Load Testing Requirements

### Performance Acceptance Criteria

**Critical user flows to test:**

1. **Sync operation (90th percentile targets):**
   - **Bank scraping:** <60 seconds (FIBI + CAL combined)
   - **Transaction import:** <30 seconds (200 transactions)
   - **AI categorization:** <20 seconds (200 transactions, 4 Claude API calls)
   - **Total end-to-end:** <110 seconds (1.8 minutes)
   - **User expectation:** "Sync Now" completes in <2 minutes

2. **Dashboard load (95th percentile targets):**
   - **Initial page load:** <2 seconds (including all API calls)
   - **Budget progress fetch:** <200ms (aggregate query)
   - **Recent transactions fetch:** <100ms (simple SELECT with LIMIT 5)
   - **Analytics charts:** <500ms (monthly aggregations)
   - **Total Time to Interactive (TTI):** <3 seconds

3. **Transaction list pagination (95th percentile targets):**
   - **First page load:** <300ms (50 transactions with includes)
   - **Scroll to next page:** <200ms (cursor-based pagination)
   - **Filter by category:** <400ms (indexed query)
   - **Search by payee:** <500ms (LIKE query, may need full-text search)

**Recommendations:**
- **Iteration 22 (Budget integration):** Run manual load tests with 1,000 seeded transactions
- **Pre-launch:** Run automated load tests with k6 or Artillery
  - Simulate 50 concurrent users browsing dashboard
  - Simulate 10 concurrent sync operations
  - Monitor database connection pool saturation

### Load Testing Tools

**Recommended tools:**
1. **k6 (open-source):** Script-based load testing
   ```javascript
   import http from 'k6/http';
   export default function() {
     http.post('https://wealth.vercel.app/api/trpc/transactions.list', {
       headers: { 'Authorization': 'Bearer ...' },
     });
   }
   ```
2. **Vercel Speed Insights:** Real user monitoring (RUM)
3. **Prisma query logging:** Enable with `log: ['query', 'info', 'warn', 'error']` in dev

**Recommendation:** Run k6 load tests before production launch (Iteration 22+).

---

## Cost Optimization Opportunities

### Serverless Function Optimization

**Current state:**
- **Function memory:** 1 GB (Vercel default)
- **Function duration:** Varies by endpoint (dashboard: <1s, sync: 90s+)
- **Pricing model:** Vercel Pro = $20/month + $40/100 GB-hours

**Cost projections:**
- **100 users × 2 syncs/day × 90s = 300 minutes/day = 150 GB-seconds/day = 4.5 GB-hours/day**
- **Monthly cost:** 4.5 GB-hours/day × 30 days = 135 GB-hours = **$54/month** (on top of $20 base)
- **Total Vercel cost:** $74/month for 100 users

**Optimization opportunities:**

1. **Reduce function memory for lightweight endpoints**
   - **Dashboard API:** Reduce from 1 GB → 512 MB (halves cost)
   - **Budget queries:** Reduce to 256 MB (queries are fast)
   - **Savings:** ~30% reduction in total function cost

2. **Move sync to background workers**
   - **Current:** Sync runs in 1 GB serverless function for 90s = 0.025 GB-hours per sync
   - **Alternative:** Use Vercel Cron (free) + database queue (no compute cost during wait)
   - **Savings:** Eliminates 90% of sync compute cost (only pay for import phase, not scraping wait time)

**Recommendation:** Implement function memory optimization in Iteration 20, background workers in Iteration 23.

### Database Query Optimization (Cost Impact)

**Supabase pricing:**
- **Free tier:** 500 MB storage, 5 GB egress
- **Pro tier:** $25/month for 8 GB storage, 50 GB egress
- **Overage:** $0.125/GB storage, $0.09/GB egress

**Cost projections:**
- **1,000 users × 50 KB dashboard load × 10 loads/day = 500 MB/day egress = 15 GB/month**
- **Overage cost:** 15 GB - 5 GB free = 10 GB × $0.09 = **$0.90/month overage** (negligible)
- **Storage:** 1.2 GB for 1,000 users < 8 GB Pro tier limit (no overage)

**Optimization impact:**
- **Budget aggregation optimization:** 500 KB → 2 KB per dashboard load (250x reduction)
- **Egress savings:** 15 GB/month → 60 MB/month (stays in free tier!)
- **Cost savings:** Delay Supabase Pro upgrade from 100 users to 500 users (saves $25/month × 6 months = **$150**)

**Recommendation:** Prioritize aggregation query optimization in Iteration 22 (high ROI).

### API Rate Limiting

**Anthropic Claude API:**
- **Pricing:** $3 per million input tokens, $15 per million output tokens
- **Usage:** 50 transactions per batch = ~2,000 input tokens, ~500 output tokens
- **Cost per batch:** (2,000 × $3/1M) + (500 × $15/1M) = $0.006 + $0.0075 = **$0.0135 per 50 transactions**

**Cost projections:**
- **100 users × 200 txn/month × (1 - 80% cache hit rate) = 4,000 new transactions needing categorization**
- **4,000 txn ÷ 50 per batch = 80 batches/month**
- **Monthly cost:** 80 × $0.0135 = **$1.08/month** for 100 users
- **1,000 users:** ~**$10/month** for Claude API

**Rate limiting needs:**
- **No rate limiting needed** - Claude API allows 10,000 requests/minute (far exceeds our ~100/day)
- **Cost control:** Implement max categorization limit (e.g., 500 transactions per sync) to prevent abuse

**Recommendation:** Add soft limit (500 txn per sync) in Iteration 21 to prevent runaway costs.

---

## Recommendations for Master Plan

### Phase-Specific Guidance

1. **Iteration 17-18 (Foundation & Database Schema)**
   - **Performance priority:** Add critical indexes BEFORE building import engine
     - `Transaction(userId, categoryId, date)`
     - `Transaction(userId, payee, date)`
   - **Infrastructure decision:** Choose sync architecture (serverless vs background jobs)
     - If Vercel Hobby: Must implement background jobs (10s timeout insufficient)
     - If Vercel Pro: Can use direct serverless sync (60s timeout sufficient)
   - **Monitoring foundation:** Implement `SyncLog` table with detailed error tracking

2. **Iteration 19-20 (Import Engine)**
   - **Performance priority:** Batch database writes (avoid N individual inserts)
     - Use `prisma.transaction.createMany()` instead of loop
     - Defer budget updates to end of import (single calculation per category)
   - **Reliability priority:** Implement exponential backoff retry for bank scraper
     - 3 attempts with 5s, 10s, 20s delays
     - Log detailed error codes to `SyncLog`
   - **User experience priority:** Streaming progress updates
     - WebSocket or Server-Sent Events for "Connecting..." → "Fetching..." → "Categorizing..."
     - Timeout after 90 seconds with clear error message

3. **Iteration 21 (Auto-Categorization Integration)**
   - **Performance priority:** Optimize cache lookup pattern
     - Change from N queries to single `WHERE merchant IN (...)` query
     - Increase batch size from 50 → 100 transactions
   - **Cost control:** Implement rate limiting (max 500 transactions per sync)

4. **Iteration 22 (Budget Integration & Polish)**
   - **Performance priority:** Refactor budget queries to use aggregation
     - Replace `findMany()` + `reduce()` with `aggregate({ _sum })`
     - Add cached `spent` column to Budget table (optional, adds write complexity)
   - **User experience priority:** Real-time budget updates via optimistic UI
     - Update budget progress immediately in React Query cache
     - Background sync to database confirms update
   - **Load testing:** Seed 1,000 transactions, measure dashboard load time (<2s target)

### Critical Decision Points

1. **Sync Architecture (Decide in Iteration 17)**
   - **Option A:** Direct serverless sync (requires Vercel Pro, 60s timeout)
   - **Option B:** Background job queue (works on Hobby tier, adds complexity)
   - **Recommendation:** Start with Option A (simpler), migrate to B if cost becomes issue

2. **Budget Caching Strategy (Decide in Iteration 22)**
   - **Option A:** Cached `spent` column in Budget table (faster reads, slower writes)
   - **Option B:** Aggregation query on every load (slower reads, simpler code)
   - **Recommendation:** Start with Option B (simpler), migrate to A if dashboard >2s load time

3. **Israeli Bank Scraper Maintenance (Ongoing)**
   - **Who monitors library updates?** Assign owner to check `israeli-bank-scrapers` releases weekly
   - **Who fixes broken scrapers?** Decide if this is dev team responsibility or outsourced
   - **Fallback plan:** If scraper breaks for >7 days, show message: "Sync temporarily unavailable, use manual entry"

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5.7
- **Backend:** tRPC 11, Prisma 5.22, Supabase (PostgreSQL + Auth)
- **UI:** Radix UI, Tailwind CSS, Framer Motion
- **AI:** Anthropic Claude 3.5 Sonnet (categorization)
- **State:** React Query (tanstack-query)
- **Build:** SWC, Vercel deployment

**Patterns observed:**
- **API layer:** tRPC routers (~3,358 lines of router code, well-structured)
- **Database access:** Prisma ORM with 36 indexes (well-optimized schema)
- **Authentication:** Supabase Auth (email/password, magic link, OAuth)
- **Performance:** React Query caching in 45 files (good)
- **Code organization:** Services pattern (`categorize.service.ts`, `plaid-sync.service.ts`)

**Strengths:**
- Strong type safety (TypeScript + tRPC + Prisma)
- Good separation of concerns (routers → services → Prisma)
- Existing performance optimizations (React Query, indexes, parallel queries)
- Serverless-first architecture (Vercel + Supabase)

**Weaknesses:**
- Minimal code splitting (only 9 instances)
- No structured logging (console.error only)
- No APM/monitoring integration
- Build size large (855 MB, likely includes dev artifacts)

**Recommendations:**
- **Keep existing stack** - well-architected, modern, scalable
- **Add:** Structured logging (SyncLog table + external drain)
- **Add:** APM monitoring (Vercel Speed Insights)
- **Optimize:** Lazy load analytics charts (Recharts = 200 KB)

### Library Additions Needed

**For Iteration 17-20 (Import Engine):**

1. **israeli-bank-scrapers** (already in vision)
   - **Purpose:** Scrape FIBI + Visa CAL transactions
   - **Version:** Latest from npm (check for FIBI/CAL support)
   - **Size:** ~10 MB with Puppeteer (server-side only, never bundle for client)
   - **Alternative:** Playwright-based scraper (lighter weight)

2. **Encryption library** (likely already exists)
   - **Purpose:** AES-256-GCM encryption for credentials
   - **Options:** `crypto` (Node.js built-in) or `@aws-crypto/client-node`
   - **Recommendation:** Use Node.js `crypto` module (no dependencies)
   - **Implementation pattern:** See `lib/encryption.ts` (referenced in plaid-sync.service.ts)

3. **WebSocket or Server-Sent Events** (for progress updates)
   - **Purpose:** Stream sync progress to client ("Connecting..." → "Fetching...")
   - **Options:**
     - Server-Sent Events (SSE) - simpler, HTTP-based
     - WebSocket (Pusher, Ably) - bi-directional, requires paid service
     - Polling - fallback if SSE not supported
   - **Recommendation:** Use SSE with `EventSource` API (free, simple)
   - **Implementation:** `/api/sync/[id]/stream` endpoint yields progress events

**For Iteration 23+ (Post-MVP):**

1. **Background job queue**
   - **Options:**
     - Vercel Cron + database queue (simplest, no new dependencies)
     - BullMQ + Redis (robust, requires Redis hosting)
     - Inngest (serverless queue, $20/month)
   - **Recommendation:** Start with Vercel Cron + database queue (free)

2. **Logging aggregation**
   - **Options:**
     - Vercel Log Drains → Datadog (expensive)
     - Sentry (error tracking + performance)
     - Logtail (affordable, $10/month)
   - **Recommendation:** Sentry (error tracking + APM in one)

---

## Notes & Observations

### Key Performance Risks

1. **Serverless function timeout is showstopper for Hobby tier**
   - Must upgrade to Vercel Pro ($20/month) OR implement background jobs
   - Background jobs add 2-3 days of development time (queue, polling, status API)

2. **Bank scraper unreliability will frustrate users**
   - 10-15% failure rate expected (bank UI changes, 2FA issues)
   - Requires proactive monitoring and fast response to scraper breakage
   - Consider hiring Israeli developer familiar with bank websites for maintenance

3. **Database connection exhaustion is real risk at 15+ concurrent users**
   - Supabase Free tier pooler = 15 slots
   - Each sync holds connection for 90-120 seconds
   - Must release connection during scraping OR upgrade to Pro tier (40 slots)

### Opportunities for Future Optimization

1. **Open Banking API migration (12+ months out)**
   - Apply for Bank of Israel PSD2 license (eliminates scraper fragility)
   - Official APIs have 99.9% uptime vs 85-90% for scrapers
   - Trade-off: 6-12 month approval process, compliance overhead

2. **Transaction archival (6+ months out)**
   - Move transactions >12 months old to archive table
   - Reduces active table size by 50% after 2 years
   - Keeps dashboard queries fast (query only active table)

3. **Budget progress materialized view (if dashboard >2s)**
   - PostgreSQL materialized view for budget aggregations
   - Refresh every 5 minutes (acceptable staleness)
   - Eliminates per-load aggregation queries

4. **Real-time sync via webhooks (post-MVP)**
   - If/when banks support webhooks, eliminate polling
   - Instant transaction import (vs 30-minute delay with scheduled sync)
   - Requires official API partnership (not available with scraping)

---

## Final Verdict

**Scalability & Performance Assessment: MEDIUM-HIGH COMPLEXITY**

**This plan is buildable with acceptable performance IF:**

1. **Vercel Pro tier used** ($20/month base + ~$50/month compute for 100 users)
   - OR background job queue implemented (adds 3-4 days development time)

2. **Database indexes added in Iteration 17** (before import engine built)
   - Critical for budget queries to stay <200ms

3. **Query aggregation refactored in Iteration 22** (budget integration phase)
   - Required for dashboard load <2s target

4. **Bank scraper monitoring implemented** (Iteration 19-20)
   - Without this, sync failures will silently accumulate and frustrate users

**Estimated infrastructure cost for MVP (100 users):**
- Vercel Pro: $74/month ($20 base + $54 compute)
- Supabase Free: $0/month (sufficient for 100 users)
- Anthropic Claude API: $1/month (categorization)
- **Total: $75/month**

**Estimated infrastructure cost at scale (1,000 users):**
- Vercel Pro: $200/month (10x compute)
- Supabase Pro: $25/month (egress + storage)
- Anthropic Claude API: $10/month
- **Total: $235/month**

**Performance targets achievable:** YES, with optimizations outlined above.

**Risk level:** MEDIUM (bank scraper unreliability is primary risk, mitigated by detailed error logging and fast response time)

---

*Exploration completed: 2025-11-19*
*This report informs master planning decisions for scalability and performance*
