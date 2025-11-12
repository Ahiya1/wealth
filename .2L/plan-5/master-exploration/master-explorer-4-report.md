# Master Exploration Report

## Explorer ID
master-explorer-4

## Focus Area
Scalability & Performance Considerations

## Vision Summary
Building a seamless data export system with multi-format support (CSV, JSON, Excel) and AI-ready packaging, enabling users to leverage external AI tools for financial insights while establishing foundation for future in-app AI integration.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 7 must-have features (Unified Export Center, Multi-Format Exports, Complete Export Package, AI-Friendly Formatting, Mobile UX, Export History, Context Exports)
- **User stories/acceptance criteria:** 45+ acceptance criteria across all features
- **Estimated total work:** 18-24 hours across multiple iterations

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **7 distinct features** with significant interdependencies (export engine, caching, file generation, mobile optimization)
- **Multi-format generation** requires processing large datasets (CSV, JSON, Excel, ZIP) with different memory footprints
- **Performance-critical operations:** Users expect exports <5s for standard, <15s for complete packages
- **Infrastructure challenges:** File caching, storage management, serverless function limits
- **Mobile optimization:** Native share sheets, streaming downloads, progress indicators
- **Data volume scaling:** System must handle 1k-10k+ transactions without timeout or memory issues

---

## Architectural Analysis

### Major Components Identified

1. **Export Generation Engine (Backend Service)**
   - **Purpose:** Core service to generate CSV, JSON, Excel, and ZIP files from database queries
   - **Complexity:** HIGH
   - **Why critical:** Performance bottleneck - must handle large datasets (10k+ transactions) within Vercel's 10s serverless timeout for Hobby tier, 60s for Pro tier

2. **Export Caching Layer**
   - **Purpose:** Store generated exports for 30 days to enable instant re-download
   - **Complexity:** MEDIUM
   - **Why critical:** Without caching, every export regenerates from scratch, causing unnecessary database load and poor UX

3. **Streaming Export Pipeline**
   - **Purpose:** Stream large exports to avoid serverless memory limits (1GB for Pro, 1.7GB for Enterprise)
   - **Complexity:** HIGH
   - **Why critical:** In-memory generation of 10k+ transactions can exceed 50-100MB, risking OOM errors

4. **Mobile Share Integration**
   - **Purpose:** Trigger native share sheets on iOS/Android for seamless export UX
   - **Complexity:** MEDIUM
   - **Why critical:** Mobile users (expected 40%+ of traffic) need frictionless export experience

5. **Background Job Queue (Optional)**
   - **Purpose:** Queue large exports (>5k transactions) for async processing
   - **Complexity:** HIGH
   - **Why critical:** Only needed if exports exceed serverless timeout; adds significant infrastructure complexity

6. **Export History Database**
   - **Purpose:** Track past exports (metadata, S3 keys, expiry) for re-download and cleanup
   - **Complexity:** LOW
   - **Why critical:** Enables fast re-downloads and automatic cleanup cron job

7. **File Storage Integration (Vercel Blob)**
   - **Purpose:** Store cached export files (ZIP, Excel) beyond serverless function ephemeral storage
   - **Complexity:** MEDIUM
   - **Why critical:** Serverless functions have ephemeral /tmp storage; need persistent storage for 30-day caching

### Technology Stack Implications

**Database (PostgreSQL via Supabase)**
- **Options:** Keep existing Supabase PostgreSQL, optimize queries with indexes
- **Recommendation:** Continue with Supabase PostgreSQL
- **Rationale:**
  - Already deployed and performant for current scale (<10k transactions per user)
  - Existing indexes on `userId`, `date` support efficient export queries
  - Connection pooling via Prisma prevents connection exhaustion

**File Generation Libraries**
- **CSV:** Use existing `csvExport.ts` (string concatenation, UTF-8 BOM)
- **JSON:** Use existing `jsonExport.ts` (JSON.stringify with pretty-print)
- **Excel:** **CRITICAL DECISION** - `xlsx` library already installed (v0.18.5)
- **ZIP:** **NEW DEPENDENCY NEEDED** - No `archiver` or `jszip` currently installed
- **Recommendation:** Add `jszip` (client + server) or `archiver` (server-only, Node.js streams)
- **Rationale:**
  - `jszip`: 700KB bundle, works client + server, good for small-medium ZIPs (<50MB)
  - `archiver`: Lighter server-side, better streaming for large ZIPs, but Node.js only
  - **Prefer `jszip`** for flexibility (can generate ZIPs client-side for small exports)

**File Storage (Vercel Blob Storage)**
- **Options:** Vercel Blob, AWS S3, Supabase Storage
- **Recommendation:** Vercel Blob Storage
- **Rationale:**
  - Native Vercel integration (no extra auth/config)
  - Free tier: 1GB storage, 1GB bandwidth/month (sufficient for MVP with 100 users exporting monthly)
  - Automatic CDN distribution (fast downloads globally)
  - Pro tier: 100GB storage if needed for scale
  - **Cost estimate:** Free tier handles 200-500 complete exports/month (assuming 2-5MB each)

**Background Jobs (Optional - NOT RECOMMENDED FOR MVP)**
- **Options:** Vercel Cron + tRPC mutations, Inngest, Quirrel, BullMQ + Redis
- **Recommendation:** **SKIP for MVP** - Use optimized synchronous exports
- **Rationale:**
  - Adds significant complexity (job queue, worker management, polling UI)
  - Most exports will be <10k transactions = <5s generation time
  - Vercel Pro tier has 60s timeout (sufficient for 50k+ transactions)
  - If needed later, Vercel Cron + database polling is simplest (already have cron for recurring transactions)

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 PHASES)

**Rationale:**
- Too complex for single iteration (7 features, 18-24 hours estimated work)
- Natural separation between export engine foundation, UI integration, and optimization
- Allows validation of performance assumptions before building advanced features
- Iteration 1 establishes export foundation, Iteration 2 adds UI polish, Iteration 3 optimizes scale

### Suggested Iteration Phases

**Iteration 1: Export Engine Foundation**
- **Vision:** Build robust, performant export engine with caching infrastructure
- **Scope:** Backend export generation and caching
  - Extend `users.router.ts` with new export endpoints (CSV, Excel, ZIP)
  - Implement `xlsxExport.ts` utility (Excel generation)
  - Add `zipExport.ts` utility (ZIP package generation with README, ai-context.json)
  - Create `ExportHistory` Prisma model for tracking
  - Integrate Vercel Blob storage for caching
  - Add cron job for cleanup (delete exports >30 days)
- **Why first:** Foundation must be solid before UI integration; backend can be tested independently
- **Estimated duration:** 8-10 hours
- **Risk level:** HIGH
  - **Risk 1:** ZIP library choice (`jszip` vs `archiver`) affects memory usage
  - **Risk 2:** Vercel Blob setup requires environment variables (might need Pro tier for bandwidth)
  - **Risk 3:** Excel generation for 10k+ rows might exceed memory limits
- **Success criteria:**
  - Export 10k transactions in <10s (Vercel Hobby limit)
  - ZIP file generation works for complete export (7 files)
  - Cached exports accessible via signed URL for 30 days
  - Memory usage <500MB for 10k transaction export

**Iteration 2: Unified Export Center UI**
- **Vision:** Polished, mobile-optimized export UI with format selection and history
- **Scope:** Frontend export interface
  - Build Settings > Data & Export page (replace "coming soon")
  - Quick Export cards (Transactions, Budgets, Goals, Accounts, Recurring)
  - Format selector (CSV, JSON, Excel)
  - Complete Export button (ZIP download)
  - Export History list (past 10 exports with re-download)
  - Loading states, progress indicators, error handling
  - Mobile share sheet integration (Web Share API)
- **Dependencies:**
  - Requires: Export endpoints from Iteration 1
  - Imports: tRPC hooks, export utilities
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
  - **Risk 1:** Mobile share sheet browser compatibility (need fallback for older browsers)
  - **Risk 2:** Large file downloads might timeout on slow mobile networks (need resume support?)
- **Success criteria:**
  - Settings page shows all export options with clear UI
  - Format selection works (CSV, JSON, Excel)
  - Mobile share sheet triggers on iOS Safari and Android Chrome
  - Export history shows cached files with instant re-download
  - Error states clearly communicate issues (no data, timeout, storage quota)

**Iteration 3: Context Exports & Performance Optimization**
- **Vision:** Contextual export buttons across app + performance tuning for scale
- **Scope:** Integration and optimization
  - Add export buttons to Transactions, Budgets, Goals, Accounts, Recurring pages
  - Respect current page filters (date range, category, account) in exports
  - Optimize database queries (add indexes if needed)
  - Implement streaming for very large exports (>20k transactions)
  - Add export analytics (track usage, file sizes, errors)
  - Performance testing with 50k+ transaction dataset
  - Fix critical bug: Analytics page date range filter (investigation + fix)
- **Dependencies:**
  - Requires: Export engine (Iteration 1) + Export Center UI (Iteration 2)
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
  - **Risk 1:** Streaming implementation complex (requires Node.js streams, Vercel edge functions?)
  - **Risk 2:** Date range bug root cause might be deep in tRPC query logic
- **Success criteria:**
  - Export buttons visible on all relevant pages
  - Filtered exports work (e.g., "Export 47 filtered transactions")
  - 50k transaction export completes successfully (<30s)
  - Analytics page date range bug fixed and validated
  - Export analytics dashboard shows usage metrics

---

## Dependency Graph

```
Iteration 1: Export Engine Foundation
├── ExportHistory Prisma model (new table)
├── Vercel Blob storage integration (new dependency)
├── jszip library installation (new npm package)
├── xlsxExport.ts utility (new file)
├── zipExport.ts utility (new file)
├── users.router.ts extensions (4 new endpoints)
└── Cron cleanup job (extends existing cron pattern)
    ↓
Iteration 2: Export Center UI
├── Settings > Data & Export page (replaces "coming soon")
├── ExportFormatSelector component (new)
├── ExportHistoryList component (new)
├── Mobile share sheet hook (useShareAPI) (new)
└── Loading/error state components (extends existing patterns)
    ↓
Iteration 3: Context Exports & Optimization
├── Export buttons on 5 pages (extends existing pages)
├── Query optimization (indexes, EXPLAIN ANALYZE)
├── Streaming exports (optional, if needed)
├── Analytics page bug fix (date range filter)
└── Export analytics dashboard (new admin page)
```

---

## Risk Assessment

### High Risks

**Risk: Vercel Serverless Timeout (10s Hobby, 60s Pro)**
- **Impact:** Large exports (10k+ transactions) might exceed 10s limit on Hobby tier, causing user frustration and incomplete exports
- **Mitigation:**
  - Optimize query performance (ensure indexes on `userId`, `date`, `categoryId`)
  - Profile export generation (measure time for 1k, 5k, 10k, 20k transactions)
  - If exceeding 10s, recommend upgrading to Pro tier ($20/month for 60s timeout)
  - Alternative: Implement background jobs with polling (HIGH COMPLEXITY)
- **Recommendation:** Build for Hobby tier (10s) initially, warn users if dataset too large, offer Pro upgrade path

**Risk: Vercel Blob Storage Costs**
- **Impact:** Free tier only 1GB storage + 1GB bandwidth/month; if 500 users export 5MB each = 2.5GB storage (exceeds limit)
- **Mitigation:**
  - Aggressive 30-day expiry on cached exports (auto-cleanup cron)
  - Compress ZIP files (ZIP compression reduces file size 30-50%)
  - Monitor storage usage via Vercel dashboard
  - Pro tier: 100GB storage ($0.15/GB/month) = $15/month for 100GB
- **Recommendation:** MVP assumes <100 active users exporting monthly; monitor and upgrade if storage >80% full

**Risk: Memory Limits for Large Exports**
- **Impact:** Generating 10k+ row Excel files or ZIPs in-memory can exceed 1GB Vercel memory limit (Hobby/Pro)
- **Mitigation:**
  - Use streaming for CSV/JSON (write to /tmp, stream from disk)
  - For Excel: `xlsx` library supports streaming write mode (`XLSX.stream.to_csv`)
  - For ZIP: Use `archiver` with streaming (pipe to response instead of buffer)
  - Profile memory usage with 10k, 20k, 50k transactions
- **Recommendation:** Start with in-memory generation for MVP (<10k transactions), add streaming in Iteration 3 if needed

### Medium Risks

**Risk: Mobile Browser Compatibility for Share API**
- **Impact:** Web Share API not supported on older browsers (IE, old Android Chrome); users can't share exports
- **Mitigation:**
  - Feature detection: `if (navigator.share)` → use share API, else fallback to download
  - Polyfill not feasible (requires native OS integration)
  - Clear fallback UX: "Download" button instead of "Share"
- **Recommendation:** Build with progressive enhancement (share where supported, download fallback)

**Risk: Date Range Bug Root Cause Unknown**
- **Impact:** Critical bug preventing Analytics page exports might be deeper than expected (Prisma query issue, timezone bug)
- **Mitigation:**
  - Allocate dedicated time in Iteration 3 for investigation
  - Add comprehensive logging to `transactions.router.ts` date filtering
  - Write integration test for date range filtering
  - Worst case: Rewrite date filtering logic with explicit timezone handling
- **Recommendation:** Investigate early in Iteration 3; budget 2-3 hours for root cause analysis

**Risk: Excel Generation Performance**
- **Impact:** `xlsx` library might be slow for large datasets (10k+ rows = 5-10s generation time)
- **Mitigation:**
  - Benchmark `xlsx` performance early (Iteration 1)
  - Consider alternative libraries: `exceljs` (faster, more features, 500KB larger)
  - Offer CSV as faster alternative (always available)
- **Recommendation:** Start with `xlsx` (already installed), profile performance, swap if too slow

### Low Risks

**Risk: Cron Job Cleanup Reliability**
- **Impact:** If cleanup cron fails, storage fills up with expired exports
- **Mitigation:**
  - Vercel Cron is reliable (99.9% uptime)
  - Add monitoring/alerting for failed cleanup jobs
  - Manual cleanup script as backup (`npm run cleanup:exports`)
- **Recommendation:** Standard cron implementation; monitor in production

**Risk: Export History Query Performance**
- **Impact:** As users export frequently, `ExportHistory` table grows; queries might slow down
- **Mitigation:**
  - Index on `userId` and `createdAt`
  - Limit query to 10 most recent exports
  - Automatic cleanup deletes old records (30 days)
- **Recommendation:** Low risk; standard indexed query pattern

---

## Integration Considerations

### Cross-Phase Integration Points

**Shared Export Utilities (`lib/csvExport.ts`, `lib/jsonExport.ts`, `lib/xlsxExport.ts`, `lib/zipExport.ts`)**
- Used by both backend (Iteration 1) and frontend context exports (Iteration 3)
- Must be isomorphic (work in Node.js and browser)
- **Challenge:** ZIP generation might differ (browser: `jszip` client-side, server: `archiver` streaming)
- **Solution:** Abstract behind `generateExport()` helper that detects environment

**Export Format Types (`types/export.ts`)**
- Shared TypeScript types for export data structures
- Used across all iterations
- **Challenge:** Types must match Prisma models but with denormalized fields (e.g., `category.name` instead of `categoryId`)
- **Solution:** Define explicit export types in Iteration 1; reuse in Iterations 2-3

**tRPC Export Endpoints**
- Iteration 1 creates endpoints, Iteration 2 consumes in UI, Iteration 3 adds filtered variants
- **Challenge:** Endpoint signatures might need changes (e.g., adding filter params in Iteration 3)
- **Solution:** Design extensible endpoints in Iteration 1 (accept optional `filters` object)

### Potential Integration Challenges

**Challenge 1: Large File Download UX**
- **Description:** Browser downloads block UI; users might think app froze on large exports
- **Impact:** Poor UX for 10-50MB ZIP downloads on slow networks
- **Solution:**
  - Show progress indicator during generation (Blob storage upload progress)
  - Use browser download manager (shows progress natively)
  - Consider chunked downloads for very large files (advanced)

**Challenge 2: Mobile Download Path Confusion**
- **Description:** Mobile users don't know where file downloaded (iOS Files app, Android Downloads)
- **Impact:** Support requests "Where did my export go?"
- **Solution:**
  - Toast notification: "Downloaded to Files/Downloads folder"
  - Help text: "Check your Files app (iOS) or Downloads folder (Android)"
  - Prefer share sheet on mobile (user chooses destination)

**Challenge 3: Export Caching Invalidation**
- **Description:** If user modifies data after export, cached export is stale
- **Impact:** User re-downloads cached export, sees old data
- **Solution:**
  - Show export timestamp clearly: "Exported on Nov 9, 2025 at 8:30 PM"
  - Offer "Generate Fresh Export" button alongside "Download Again"
  - Optionally: Auto-invalidate cache when user modifies data (complex, skip for MVP)

---

## Recommendations for Master Plan

1. **Start with Performance Profiling**
   - Before building, create test dataset with 1k, 5k, 10k, 20k transactions
   - Profile current `exportAllData` endpoint with large datasets
   - Measure: Query time, generation time, memory usage, file size
   - **Reason:** Validates assumptions about serverless timeout and memory limits

2. **Adopt Streaming Early if Needed**
   - If profiling shows >5s for 10k transactions, implement streaming in Iteration 1
   - Don't wait until Iteration 3; foundation must handle scale
   - **Reason:** Retrofitting streaming is harder than building it upfront

3. **Use Vercel Blob, Not S3**
   - Simpler setup, native Vercel integration, generous free tier
   - Only migrate to S3 if storage exceeds 100GB (unlikely for 1k users)
   - **Reason:** Minimize infrastructure complexity for MVP

4. **Fix Analytics Bug in Iteration 1, Not Iteration 3**
   - Critical bug affects export adoption; users lose trust if exports broken
   - Allocate 2 hours in Iteration 1 for investigation + fix
   - **Reason:** Better to delay Iteration 1 slightly than ship broken exports

5. **Skip Background Jobs for MVP**
   - Adds 10+ hours of work (job queue, worker, polling UI, error handling)
   - Most exports will complete in <10s (Vercel Hobby tier limit)
   - If needed, recommend Pro tier upgrade ($20/month) instead of building jobs
   - **Reason:** Premature optimization; validate demand before building complex infrastructure

6. **Monitor Export Usage from Day 1**
   - Add analytics: Export count by type, file size distribution, errors, completion time
   - Track: How many users export? How often? Which formats? Mobile vs desktop?
   - **Reason:** Informs optimization priorities; might discover users only export CSV (skip Excel)

---

## Technology Recommendations

### Existing Codebase Findings

**Stack Detected:**
- **Framework:** Next.js 14 (App Router, Server Actions, API routes)
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Auth:** Supabase Auth (SSR-enabled)
- **API:** tRPC 11 (React Query integration)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (standalone output mode)
- **Build size:** 804MB .next directory (typical Next.js app)
- **Dependencies:** 882MB node_modules (83 packages)

**Patterns Observed:**
- **Parallel queries:** `Promise.all()` used in analytics router for performance
- **Pagination:** Cursor-based pagination in transactions (prevents skipped/duplicate records)
- **Hard limits:** 10k transaction limit in `exportAllData` (prevents runaway queries)
- **UTF-8 BOM:** CSV exports include BOM for Excel compatibility (existing pattern to reuse)
- **Decimal handling:** Prisma Decimal type converted to number for JSON serialization (existing pattern)

**Opportunities:**
- **Add indexes:** Ensure `userId + date DESC` composite index for export queries (likely exists but verify)
- **Query optimization:** Use `select` instead of `include` where possible (reduce payload size)
- **Connection pooling:** Prisma already pools connections; verify pool size sufficient for concurrent exports

**Constraints:**
- **Currency locked to NIS:** No multi-currency support (simplifies export formatting)
- **Serverless environment:** No persistent file system; must use Vercel Blob or S3
- **tRPC query timeout:** Default 30s (might need increase for large exports)

### Greenfield Recommendations

**New Libraries to Install:**

1. **ZIP Generation:** `jszip` (v3.10.1)
   - **Why:** Client + server compatible, good for <50MB ZIPs
   - **Alternative:** `archiver` (server-only, better streaming for large ZIPs)
   - **Recommendation:** Start with `jszip`, migrate to `archiver` if streaming needed

2. **Excel Streaming (Optional):** `exceljs` (v4.3.0)
   - **Why:** Faster than `xlsx`, supports streaming, more features
   - **When:** Only if `xlsx` benchmarks show >5s for 10k rows
   - **Caveat:** 2MB bundle size vs 1.5MB for `xlsx`

3. **Vercel Blob Storage SDK:** `@vercel/blob` (v0.14.1)
   - **Why:** Official SDK for Vercel Blob storage
   - **Setup:** Requires `BLOB_READ_WRITE_TOKEN` env var
   - **Free tier:** 1GB storage, 1GB bandwidth/month

**Configuration Changes:**

1. **Next.js Config:** Increase `bodySizeLimit` for large exports
   ```js
   experimental: {
     serverActions: {
       bodySizeLimit: '10mb', // Up from 2mb
     },
   }
   ```

2. **Vercel Project Settings:** Add environment variables
   ```bash
   BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"
   EXPORT_CACHE_DAYS="30"
   MAX_EXPORT_SIZE_MB="50"
   ```

3. **Prisma Schema:** Add `ExportHistory` model
   ```prisma
   model ExportHistory {
     id         String   @id @default(cuid())
     userId     String
     exportType String   // "complete" | "transactions" | "budgets" | etc.
     format     String   // "csv" | "json" | "xlsx" | "zip"
     dateRange  Json?    // {startDate, endDate} for filtered exports
     fileSize   Int      // Bytes
     blobUrl    String   // Vercel Blob signed URL
     createdAt  DateTime @default(now())
     expiresAt  DateTime // createdAt + 30 days

     user User @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId, createdAt(sort: Desc)])
     @@index([expiresAt]) // For cleanup cron
   }
   ```

---

## Scalability Roadmap

### Current Scale (MVP Assumptions)
- **Users:** 100-500 active users
- **Transactions per user:** 1k-10k average, 20k max
- **Export frequency:** 1-4 exports per user per month
- **Storage:** 2-5GB total (cached exports)
- **Bandwidth:** 5-10GB/month (downloads)
- **Infrastructure:** Vercel Hobby tier + Supabase Free tier

**Performance Targets:**
- **Quick export (<1k transactions):** <2s generation + download
- **Standard export (1k-5k transactions):** <5s generation + download
- **Complete export (5k-10k transactions):** <15s generation + download
- **Very large export (10k-20k transactions):** <30s generation + download

### Short-Term Scale (6 months, 1k-5k users)
- **Transactions per user:** 10k-50k (1 year of daily tracking)
- **Export frequency:** 5-10 exports per user per month (higher as feature matures)
- **Storage:** 20-50GB (need Pro tier: 100GB for $15/month)
- **Bandwidth:** 50-100GB/month (Pro tier: 100GB included, then $0.40/GB)
- **Infrastructure:** Vercel Pro tier ($20/month) + Supabase Pro tier ($25/month)

**Scaling Actions:**
1. **Add streaming exports** (Iteration 3 or post-MVP) for 20k+ transactions
2. **Optimize database queries:** Analyze slow query logs, add missing indexes
3. **Implement CDN caching:** Cache exports at edge (already included in Vercel Blob)
4. **Monitor and alert:** Set up Sentry for export errors, Vercel Analytics for performance
5. **Consider background jobs:** If >10% of exports timeout, add job queue

### Medium-Term Scale (1 year, 5k-50k users)
- **Transactions per user:** 50k-100k (multi-year historical data)
- **Export frequency:** 10-20 exports per user per month
- **Storage:** 200-500GB (need custom pricing or S3 migration)
- **Bandwidth:** 500GB-1TB/month (Vercel Pro can handle, but expensive)
- **Infrastructure:** Vercel Pro/Enterprise + Supabase Pro/Team + potential S3 migration

**Scaling Actions:**
1. **Migrate to S3 for storage:** Cheaper at scale ($0.023/GB/month vs Vercel $0.15/GB)
2. **Add Redis cache:** Cache frequently exported data (e.g., last 30 days) to reduce DB load
3. **Implement rate limiting:** Prevent abuse (e.g., 10 exports per hour per user)
4. **Add export quotas:** Free users: 10 exports/month, Pro users: unlimited
5. **Optimize bundle size:** Code split export utilities, lazy load Excel/ZIP libraries

### Long-Term Scale (2+ years, 50k+ users)
- **Transactions per user:** 100k-500k (5+ years of data)
- **Export frequency:** 20-50 exports per user per month (AI integration, automated exports)
- **Storage:** 1-5TB (need dedicated S3 bucket + CloudFront CDN)
- **Bandwidth:** 5-10TB/month (need CDN optimization)
- **Infrastructure:** Vercel Enterprise + Supabase Enterprise + S3 + CloudFront

**Scaling Actions:**
1. **Microservice for exports:** Separate export service on dedicated infra (not serverless)
2. **Incremental exports:** Only export new data since last export (requires versioning)
3. **Sharded storage:** Shard exports by user ID across multiple S3 buckets
4. **Pre-generate exports:** Nightly cron to pre-generate common exports (e.g., last 30 days)
5. **GraphQL API:** Replace tRPC with GraphQL for more flexible querying (field selection)

---

## Performance Optimization Strategy

### Phase 1: Measure (Iteration 1)
**Goal:** Establish performance baselines before optimization

**Actions:**
1. **Create test datasets:**
   - Small: 1,000 transactions (1 month of daily tracking)
   - Medium: 5,000 transactions (6 months)
   - Large: 10,000 transactions (1 year)
   - Very Large: 20,000 transactions (2 years)
   - Extreme: 50,000 transactions (5 years)

2. **Benchmark current code:**
   - Measure `exportAllData` tRPC endpoint with each dataset
   - Record: Query time, generation time, memory usage, file size
   - Tools: `console.time()`, `process.memoryUsage()`, Chrome DevTools

3. **Identify bottlenecks:**
   - If query time >2s: Database indexing issue
   - If generation time >3s: Inefficient CSV/JSON/Excel generation
   - If memory >500MB: Need streaming
   - If file size >10MB: Need compression

**Success Criteria:**
- Documented baseline performance for all dataset sizes
- Identified top 3 bottlenecks (e.g., "Excel generation takes 5s for 10k rows")

### Phase 2: Optimize Database (Iteration 1-2)
**Goal:** Minimize query time to <1s for 10k transactions

**Actions:**
1. **Verify indexes exist:**
   - `CREATE INDEX idx_transactions_user_date ON transactions(userId, date DESC);`
   - `CREATE INDEX idx_budgets_user_month ON budgets(userId, month DESC);`
   - `CREATE INDEX idx_goals_user ON goals(userId);`

2. **Optimize queries:**
   - Use `select` instead of `include` where possible (reduce payload)
   - Batch related queries with `Promise.all()` (already done in analytics router)
   - Add `EXPLAIN ANALYZE` to slow queries (identify missing indexes)

3. **Connection pooling:**
   - Verify Prisma connection pool size (default: 10 connections)
   - Increase if needed for concurrent exports: `connection_limit=20` in DATABASE_URL

**Success Criteria:**
- Query time <1s for 10k transactions
- No `EXPLAIN ANALYZE` shows sequential scans on large tables
- Connection pool handles 10 concurrent exports without exhaustion

### Phase 3: Optimize Generation (Iteration 2-3)
**Goal:** Minimize generation time to <3s for 10k transactions

**Actions:**
1. **Profile file generation:**
   - Measure CSV, JSON, Excel, ZIP generation separately
   - Identify slowest format (likely Excel or ZIP)

2. **Optimize CSV generation:**
   - Use array join instead of string concatenation (faster)
   - Pre-allocate array size if known (avoids resizing)
   - Example: `const rows = new Array(transactions.length + 1);`

3. **Optimize JSON generation:**
   - Use `JSON.stringify()` with replacer function (avoid manual serialization)
   - Pre-sanitize Decimals before passing to JSON.stringify (faster)

4. **Optimize Excel generation:**
   - If `xlsx` too slow, try `exceljs` with streaming mode
   - Benchmark: `xlsx` vs `exceljs` for 10k rows
   - Skip formatting (no bold headers, colors) to reduce generation time

5. **Optimize ZIP generation:**
   - Use compression level 6 (default) - good balance of speed and size
   - Avoid compression level 9 (slow, minimal size benefit)
   - Stream files into ZIP instead of buffering all in memory

**Success Criteria:**
- CSV generation: <1s for 10k transactions
- JSON generation: <1s for 10k transactions
- Excel generation: <3s for 10k transactions
- ZIP generation: <2s for complete export (7 files)

### Phase 4: Implement Streaming (Iteration 3, if needed)
**Goal:** Handle 50k+ transactions without memory issues

**Actions:**
1. **Streaming CSV/JSON:**
   - Write to `/tmp/export-${userId}.csv` instead of in-memory string
   - Stream file to response: `fs.createReadStream('/tmp/export.csv').pipe(res)`
   - Clean up temp files after send: `fs.unlink('/tmp/export.csv')`

2. **Streaming Excel:**
   - Use `exceljs` streaming writer:
     ```ts
     const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
     const worksheet = workbook.addWorksheet('Transactions');
     transactions.forEach(txn => worksheet.addRow(txn).commit());
     await workbook.commit();
     ```

3. **Streaming ZIP:**
   - Use `archiver` library (supports streams):
     ```ts
     const archive = archiver('zip', { zlib: { level: 6 } });
     archive.pipe(res);
     archive.file('transactions.csv', { name: 'transactions.csv' });
     await archive.finalize();
     ```

**Success Criteria:**
- 50k transaction export completes in <30s
- Memory usage stays <300MB throughout export
- Temp files cleaned up after send (no disk leak)

### Phase 5: Caching & CDN (Iteration 2-3)
**Goal:** Instant re-downloads for cached exports

**Actions:**
1. **Implement export caching:**
   - After generating export, upload to Vercel Blob
   - Store `ExportHistory` record with Blob URL
   - On re-download request, return cached Blob URL (no regeneration)

2. **Cache invalidation strategy:**
   - Expire after 30 days (cron cleanup)
   - Optionally: Invalidate when user modifies data (complex, skip for MVP)
   - Show cache age: "Exported 2 days ago"

3. **CDN optimization:**
   - Vercel Blob automatically uses CDN (no config needed)
   - Signed URLs prevent unauthorized access
   - Cache-Control headers set by Blob SDK

**Success Criteria:**
- Re-download takes <1s (CDN cached)
- Cached exports accessible for 30 days
- Expired exports auto-deleted by cron

---

## Infrastructure Recommendations

### Deployment Architecture (Current: Vercel + Supabase)

**Frontend (Next.js on Vercel):**
- **Current:** Vercel Hobby tier (free)
- **Limits:** 100GB bandwidth/month, 6,000 build minutes/month, 12 serverless functions
- **Recommendation:** Upgrade to Pro ($20/month) when:
  - Export timeout issues (need 60s instead of 10s)
  - Bandwidth >80GB/month
  - Need priority builds (faster CI/CD)

**Backend (tRPC API routes on Vercel Serverless):**
- **Current:** Vercel Hobby tier serverless functions
- **Limits:** 10s timeout, 1GB memory, 50MB response size
- **Recommendation:**
  - Start with Hobby tier (sufficient for 95% of exports)
  - Profile performance early (Iteration 1)
  - Upgrade to Pro if >10% of exports timeout

**Database (PostgreSQL on Supabase):**
- **Current:** Supabase Free tier
- **Limits:** 500MB database, 2GB bandwidth/month, 2GB file storage, 50k monthly active users
- **Recommendation:**
  - Free tier sufficient for MVP (<100 users)
  - Upgrade to Pro ($25/month) when:
    - Database size >400MB (80% full)
    - Connection pooling needed (>60 connections)
    - Need point-in-time recovery (PITR)

**File Storage (Vercel Blob):**
- **Current:** Not yet implemented
- **Limits (Free):** 1GB storage, 1GB bandwidth/month
- **Limits (Pro):** 100GB storage, 100GB bandwidth/month ($0.15/GB storage, $0.40/GB bandwidth overage)
- **Recommendation:**
  - Start with Free tier (sufficient for 200-500 exports)
  - Monitor storage usage (set alert at 80%)
  - Upgrade to Pro when storage >800MB
  - Consider S3 migration if storage >500GB (much cheaper at scale)

### Monitoring & Observability

**Performance Monitoring:**
- **Tool:** Vercel Analytics (included in Pro tier)
- **Metrics:**
  - Export endpoint response time (P50, P95, P99)
  - Serverless function duration distribution
  - Memory usage per export
  - Error rate by endpoint

**Error Tracking:**
- **Tool:** Sentry (free tier: 5k errors/month)
- **Setup:** Existing Sentry integration (if present) or add for exports
- **Alerts:**
  - Export timeout errors (>10 per hour)
  - Memory limit errors
  - Storage quota exceeded

**Export Analytics:**
- **Tool:** Custom analytics in database (ExportHistory table)
- **Metrics:**
  - Export count by type (transactions, budgets, complete)
  - Export count by format (CSV, JSON, Excel, ZIP)
  - File size distribution (histogram)
  - Mobile vs desktop exports
  - Re-download rate (cached vs fresh)

**Cost Monitoring:**
- **Tool:** Vercel dashboard + Supabase dashboard
- **Metrics:**
  - Vercel bandwidth usage (GB/month)
  - Vercel Blob storage usage (GB)
  - Supabase database size (MB)
  - Supabase bandwidth (GB/month)
- **Alerts:**
  - Vercel Blob storage >80% of limit
  - Supabase database >400MB
  - Monthly costs exceed budget

### Cost Projections

**MVP (100 users, 2 exports/user/month):**
- Vercel Hobby: $0/month (free tier sufficient)
- Supabase Free: $0/month (free tier sufficient)
- Vercel Blob Free: $0/month (<1GB storage, <1GB bandwidth)
- **Total:** $0/month

**Growth (1,000 users, 5 exports/user/month):**
- Vercel Pro: $20/month (need 60s timeout)
- Supabase Pro: $25/month (need connection pooling)
- Vercel Blob Pro: $15/month (20GB storage @ $0.15/GB, 30GB bandwidth @ $0.40/GB overage)
- **Total:** $60/month ($0.06 per user)

**Scale (10,000 users, 10 exports/user/month):**
- Vercel Pro: $20/month (same)
- Supabase Team: $599/month (need dedicated resources)
- Vercel Blob: $150/month (500GB storage, 800GB bandwidth)
- **OR migrate to S3:** $20/month (500GB @ $0.023/GB + CloudFront $0.085/GB = $88/GB bandwidth)
- **Total with Vercel Blob:** $769/month ($0.08 per user)
- **Total with S3:** $639/month ($0.06 per user)

**Recommendation:** Start with Vercel Blob, migrate to S3 when storage exceeds 100GB (saves $100+/month at scale).

---

## Database Schema Additions

### New Table: ExportHistory

**Purpose:** Track exported files for caching and re-download functionality

**Schema:**
```prisma
model ExportHistory {
  id         String   @id @default(cuid())
  userId     String
  exportType String   // "complete" | "transactions" | "budgets" | "goals" | "accounts" | "recurring"
  format     String   // "csv" | "json" | "xlsx" | "zip"
  dateRange  Json?    // {startDate: "2025-01-01", endDate: "2025-11-09"} for filtered exports
  filters    Json?    // {categoryId: "xyz", accountId: "abc"} for context exports
  fileSize   Int      // File size in bytes
  recordCount Int     // Number of records exported (for display)
  blobUrl    String   // Vercel Blob signed URL (expires in 30 days)
  createdAt  DateTime @default(now())
  expiresAt  DateTime // createdAt + 30 days (for cleanup cron)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)]) // For export history list
  @@index([expiresAt]) // For cleanup cron job
  @@index([blobUrl]) // For quick lookup by URL
}
```

**Migration Strategy:**
1. Generate migration: `npx prisma migrate dev --name add_export_history`
2. Deploy migration to Supabase: `npx prisma migrate deploy`
3. Verify indexes created: `EXPLAIN ANALYZE SELECT * FROM "ExportHistory" WHERE "userId" = 'xyz' ORDER BY "createdAt" DESC LIMIT 10;`

**Disk Usage Estimate:**
- 100 users × 10 exports/month × 12 months = 12,000 records
- Average record size: 200 bytes (JSON fields compressed)
- Total: 2.4MB (negligible)

---

## Security Considerations

### File Access Control
- **Threat:** Unauthorized users downloading other users' exports
- **Mitigation:**
  - Vercel Blob signed URLs (time-limited, user-specific)
  - tRPC endpoint validates `ctx.user.id` matches `ExportHistory.userId`
  - No public export URLs (all require auth)

### Sensitive Data Redaction
- **Threat:** Plaid access tokens leaked in exports
- **Mitigation:**
  - Never export `plaidAccessToken` field (filter in query: `select: { plaidAccessToken: false }`)
  - Export only `plaidAccountId` (safe, non-sensitive identifier)
  - Document in README: "Access tokens not included for security"

### Rate Limiting
- **Threat:** Abuse (user spamming export endpoint, exhausting resources)
- **Mitigation:**
  - Implement rate limiting: 10 exports per hour per user
  - Use `upstash/ratelimit` library (serverless-friendly)
  - Return 429 status with retry-after header

### Storage Quota
- **Threat:** User filling storage with excessive exports
- **Mitigation:**
  - Max 10 cached exports per user (FIFO eviction)
  - Max 50MB per export file (reject larger exports)
  - Automatic cleanup after 30 days

### ZIP Bomb Protection
- **Threat:** Malicious user creating tiny ZIP that expands to huge size
- **Mitigation:**
  - Not applicable (we generate ZIPs, users don't upload)
  - But: Set max uncompressed size limit (e.g., 500MB) as sanity check

---

## Testing Strategy

### Unit Tests (Iteration 1)
**Scope:** Export utility functions

**Files to test:**
- `lib/csvExport.ts` - Test CSV generation with various transaction datasets
- `lib/jsonExport.ts` - Test JSON serialization with Decimal handling
- `lib/xlsxExport.ts` (new) - Test Excel generation with 1k, 5k, 10k rows
- `lib/zipExport.ts` (new) - Test ZIP creation with multiple files

**Test cases:**
- Empty dataset (0 transactions) → "No data to export" error
- Small dataset (10 transactions) → Generates valid CSV/JSON/Excel
- Large dataset (10k transactions) → Completes without error, correct record count
- Special characters (quotes, commas, newlines) → Properly escaped in CSV
- Decimal precision → Numbers formatted to 2 decimal places
- UTF-8 encoding → Non-ASCII characters (Hebrew, emoji) render correctly
- ZIP structure → Contains all expected files (README, ai-context.json, etc.)

### Integration Tests (Iteration 1-2)
**Scope:** tRPC endpoints and database queries

**Files to test:**
- `server/api/routers/users.router.ts` - Test export endpoints

**Test cases:**
- Export endpoint returns correct format (CSV/JSON/Excel/ZIP)
- Date range filtering works correctly (fix for critical bug)
- Export history recorded in database after generation
- Cached export returns same file (no regeneration)
- Expired export regenerates instead of returning stale cache
- Unauthorized access to another user's export rejected (401)

### Performance Tests (Iteration 1, 3)
**Scope:** Load testing with large datasets

**Test cases:**
- 1k transactions: <2s export time, <10MB memory
- 5k transactions: <5s export time, <50MB memory
- 10k transactions: <10s export time, <100MB memory
- 20k transactions: <30s export time, <200MB memory (streaming required)
- 50k transactions: <60s export time, <300MB memory (streaming required)

**Tools:**
- Artillery (load testing)
- k6 (stress testing)
- Chrome DevTools (memory profiling)

### Mobile Testing (Iteration 2)
**Scope:** Mobile browser compatibility

**Devices to test:**
- iPhone 13+ (Safari iOS 16+)
- Pixel 6+ (Chrome Android 12+)
- Older devices (iPhone 11, Android 10) for fallback testing

**Test cases:**
- Export button triggers download (not share sheet) on unsupported browsers
- Export button triggers share sheet on supported browsers (iOS 12+, Android 10+)
- Large file download (50MB) completes without timeout
- Downloaded file opens correctly in iOS Files app
- Downloaded file opens correctly in Android Downloads folder

### Regression Tests (Iteration 3)
**Scope:** Ensure context exports don't break existing functionality

**Test cases:**
- Analytics page export still works after context export added
- Transactions page filters applied correctly to export
- Budgets page export includes current month by default
- Goals page export includes all goals (not just active)

---

## Acceptance Criteria Summary

### Iteration 1: Export Engine Foundation

**Must Pass:**
- [ ] `exportTransactionsCSV`, `exportTransactionsJSON`, `exportTransactionsExcel` tRPC endpoints work
- [ ] `exportComplete` tRPC endpoint generates ZIP with 7 files (README, ai-context.json, 5 data files)
- [ ] Export history recorded in `ExportHistory` table after each export
- [ ] Cached export returns same file within 30 days (verified by comparing file hash)
- [ ] Vercel Blob storage integration works (file uploaded, signed URL returned)
- [ ] Cron job deletes exports older than 30 days (verified by running manually)
- [ ] 10k transaction export completes in <10s (Vercel Hobby limit)
- [ ] Memory usage <500MB for 10k transaction export (verified with profiling)

### Iteration 2: Export Center UI

**Must Pass:**
- [ ] Settings > Data & Export page shows all export options (Quick Exports, Complete Export, Export History)
- [ ] Format selector allows choosing CSV, JSON, Excel for quick exports
- [ ] Export buttons show loading state during generation (spinner + "Generating...")
- [ ] Success toast shows record count ("Downloaded 247 transactions")
- [ ] Error toast shows clear message ("Export failed: Timeout exceeded. Try smaller date range.")
- [ ] Export history shows last 10 exports with metadata (type, date, size, format)
- [ ] "Download Again" button instantly downloads cached export (<1s)
- [ ] Mobile: Export triggers native share sheet on iOS Safari and Android Chrome
- [ ] Mobile: Fallback to download on unsupported browsers (no error)

### Iteration 3: Context Exports & Optimization

**Must Pass:**
- [ ] Transactions page: Export button respects current filters (date, category, account)
- [ ] Budgets page: Export button exports current month or all budgets (based on toggle)
- [ ] Goals page: Export button exports all goals
- [ ] Accounts page: Export button exports account balances and details
- [ ] Recurring page: Export button exports all recurring transaction templates
- [ ] Export count preview shown ("Export 47 filtered transactions")
- [ ] Analytics page date range bug fixed (validated with integration test)
- [ ] 50k transaction export completes in <30s (streaming implemented)
- [ ] Export analytics dashboard shows usage metrics (count, file size, errors)

---

## Open Questions & Decisions

### Question 1: Should we support scheduled exports (e.g., monthly email)?
**Decision:** **NO for MVP** - Out of scope per vision document ("Should-Have" section)
**Rationale:** Adds email infrastructure complexity; validate demand first

### Question 2: Should Excel exports use single sheet or multiple sheets?
**Decision:** **Single sheet for MVP** - Multi-sheet is "Should-Have" post-MVP
**Rationale:** Simpler implementation; multi-sheet can be added in future iteration

### Question 3: Should we encrypt exported files?
**Decision:** **NO for MVP** - Encrypted exports are "Should-Have" post-MVP
**Rationale:** Adds encryption key management complexity; low priority unless enterprise customers request

### Question 4: Should we support incremental exports (only new data)?
**Decision:** **NO for MVP** - Too complex, requires export versioning
**Rationale:** Users can filter by date range instead; defer until proven demand

### Question 5: Should we pre-generate common exports (e.g., last 30 days)?
**Decision:** **NO for MVP** - Premature optimization
**Rationale:** Adds cron complexity; wait for usage data to identify common export patterns

---

## Notes & Observations

### Critical Bug Analysis (Analytics Page Export)

**Bug Description:** "No data to export: There are no transactions in the selected date range"

**Likely Root Causes:**
1. **Timezone mismatch:** `dateRange.startDate` and `dateRange.endDate` might be in user's timezone, but Prisma query expects UTC
2. **Date comparison logic:** `lte` might be exclusive instead of inclusive (off-by-one error)
3. **State staleness:** Date range state updated but transactions query not refetched
4. **tRPC query cache:** Stale cache from previous date range not invalidated

**Investigation Steps (Iteration 3):**
1. Log date values in `analytics/page.tsx` before passing to tRPC query
2. Log date values in `transactions.router.ts` when executing Prisma query
3. Check if `startDate` and `endDate` are Date objects or ISO strings
4. Add integration test for date range filtering with known dataset
5. Test timezone edge cases (user in PST querying transactions in UTC)

**Estimated Fix Time:** 2-3 hours (investigation + fix + test)

---

### Performance Benchmarks from Existing Code

**Current `exportAllData` endpoint:**
- Hard limit: 10,000 transactions (`take: 10000`)
- Uses `Promise.all()` for parallel queries (good pattern)
- Includes related records (`category`, `account`, `linkedAccount`)
- JSON serialization with Decimal sanitization (already optimized)

**Extrapolated Performance (based on existing analytics queries):**
- 1k transactions: ~500ms query + 200ms JSON generation = 0.7s total
- 5k transactions: ~1.5s query + 500ms JSON generation = 2s total
- 10k transactions: ~3s query + 1s JSON generation = 4s total
- 20k transactions: ~6s query + 2s JSON generation = 8s total (within 10s limit)
- 50k transactions: ~15s query + 5s JSON generation = 20s total (exceeds Hobby limit, need Pro)

**Recommendation:** Current code should handle MVP requirements without major optimization. Add streaming in Iteration 3 only if profiling shows >10s for 10k transactions.

---

*Exploration completed: 2025-11-09T21:00:00Z*
*This report informs master planning decisions for Plan-5 Export MVP*
