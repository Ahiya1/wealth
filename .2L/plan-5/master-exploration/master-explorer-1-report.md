# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Transform Wealth's fragmented export functionality into a comprehensive, AI-ready data export system with multi-format support (CSV, JSON, Excel), mobile optimization, organized export packages, and structured metadata - enabling users to leverage external AI tools today while establishing the foundation for future in-app AI integration.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 7 must-have features
- **User stories/acceptance criteria:** 45+ acceptance criteria across 7 core features
- **Estimated total work:** 18-24 hours

**Feature Breakdown:**
1. Unified Export Center (6 acceptance criteria)
2. Multi-Format Quick Exports (5 acceptance criteria)
3. Complete Export Package (4 acceptance criteria with complex folder structure)
4. AI-Friendly Formatting (4 acceptance criteria with metadata generation)
5. Mobile-Optimized Export UX (6 acceptance criteria)
6. Export History & Re-Download (6 acceptance criteria with caching)
7. Export from Context (6 acceptance criteria across 5 pages)

**Additional Complexity Factors:**
- Critical bug fix required (Analytics export date range filter)
- 5 should-have features identified for post-MVP
- 4 could-have features for future iterations
- 3 detailed user flows with edge cases and error handling
- New database model required (ExportHistory)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct features with interdependencies:** 7 must-have features span both frontend UI (Export Center, mobile UX) and backend infrastructure (ZIP generation, caching, history tracking)
- **Multi-layer architecture required:** Frontend components (5+ pages need export buttons), backend tRPC endpoints (extend existing + create new), utility libraries (CSV, JSON, Excel, ZIP), file storage (Vercel Blob), and database (new ExportHistory model)
- **Both backend and frontend development needed:** Backend handles data aggregation, format conversion, ZIP generation, caching, and storage; frontend handles UI, mobile share sheets, download flows, and export history display
- **External integration complexity:** Mobile native share sheets (iOS/Android), Vercel Blob Storage API, browser download APIs, ZIP file generation (archiver library)
- **Performance considerations:** Streaming large exports (10k+ transactions), async job processing, 30-second timeout constraints, 50MB file size limits
- **Critical bug requires investigation:** Date range filter bug blocks current export functionality - must diagnose tRPC query, timezone handling, and Prisma date operators

---

## Architectural Analysis

### Major Components Identified

1. **Export Center UI (Frontend)**
   - **Purpose:** Unified Settings > Data & Export page serving as primary export hub
   - **Complexity:** MEDIUM
   - **Why critical:** Central UX for all export operations; replaces current "coming soon" placeholder; must handle multiple export types, format selection, date range filtering, and export history display
   - **Components needed:**
     - Settings page overhaul (`src/app/(dashboard)/settings/data/page.tsx`)
     - Export format selector component (CSV, JSON, Excel toggle)
     - Date range picker integration
     - Export history table with re-download functionality
     - Loading/success/error states for async operations

2. **Context Export Buttons (Frontend)**
   - **Purpose:** Export actions embedded in relevant pages (Transactions, Budgets, Goals, Accounts, Recurring)
   - **Complexity:** MEDIUM
   - **Why critical:** Improves UX by allowing exports directly from filtered views without losing context; 5 pages need modification
   - **Components needed:**
     - Export button component (reusable across pages)
     - Format selector dropdown
     - Filter-aware export logic (preserve current page filters)
     - Toast notifications for success/error feedback

3. **Multi-Format Export Engine (Backend)**
   - **Purpose:** Generate exports in CSV, JSON, and Excel formats with consistent data structure
   - **Complexity:** HIGH
   - **Why critical:** Core export functionality; must handle all data types (transactions, budgets, goals, accounts, recurring transactions, categories) with proper formatting and field normalization
   - **Infrastructure needed:**
     - Extend existing utilities:
       - `src/lib/csvExport.ts` (add recurring transactions, categories support)
       - `src/lib/jsonExport.ts` (enhance with AI context generation)
     - Create new utilities:
       - `src/lib/xlsxExport.ts` (Excel workbook generation using existing `xlsx` library)
       - `src/lib/aiContextGenerator.ts` (generate AI-friendly metadata)
     - tRPC endpoints:
       - Extend `src/server/api/routers/users.router.ts` with new export procedures
       - Add export-specific validation and error handling

4. **Complete Export Package Generator (Backend)**
   - **Purpose:** Create organized ZIP archives with all user data, README, and AI context
   - **Complexity:** HIGH
   - **Why critical:** Flagship feature enabling comprehensive AI analysis; complex folder structure with multiple file types
   - **Infrastructure needed:**
     - ZIP generation service using Node.js `archiver` library
     - File structure orchestrator:
       ```
       wealth-export-2025-11-09/
         README.md (usage instructions, AI prompts)
         transactions.csv
         recurring-transactions.csv
         budgets.csv
         goals.csv
         accounts.csv
         categories.csv
         summary.json (metadata: counts, currency, timezone)
         ai-context.json (field descriptions, category hierarchy, AI prompts)
       ```
     - Streaming implementation for large datasets (prevent memory overflow)
     - Async job queue for exports >5k transactions

5. **Export History & Caching System (Backend + Database)**
   - **Purpose:** Track past exports, enable re-downloads, manage cached files, auto-cleanup
   - **Complexity:** HIGH
   - **Why critical:** Improves UX (instant re-downloads) and reduces server load; requires new database model, file storage integration, and cron job
   - **Infrastructure needed:**
     - New Prisma model: `ExportHistory`
       ```prisma
       model ExportHistory {
         id         String   @id @default(cuid())
         userId     String
         exportType String   // 'transactions' | 'budgets' | 'complete' | etc.
         format     String   // 'csv' | 'json' | 'xlsx' | 'zip'
         dateRange  Json?    // { startDate, endDate } for filtered exports
         fileSize   Int      // bytes
         s3Key      String   // Vercel Blob storage key
         createdAt  DateTime @default(now())
         expiresAt  DateTime // createdAt + 30 days

         user User @relation(fields: [userId], references: [id], onDelete: Cascade)

         @@index([userId])
         @@index([createdAt])
         @@index([expiresAt])
       }
       ```
     - Vercel Blob Storage integration (`@vercel/blob` SDK)
     - Cron job for cleanup (delete exports older than 30 days)
     - Cache hit/miss logic in tRPC endpoints

6. **Mobile Export UX Layer (Frontend)**
   - **Purpose:** Native mobile experience with share sheets, touch-optimized UI, progress indicators
   - **Complexity:** MEDIUM
   - **Why critical:** Mobile-first user base requires native-feeling export flows; complex browser API integration
   - **Infrastructure needed:**
     - Mobile detection utility
     - Web Share API integration (iOS/Android share sheets)
     - Progressive loading indicators for large exports
     - Blob URL handling for in-browser downloads
     - Touch-friendly UI components (44px min height buttons)
     - Platform-specific download flows (iOS Files app, Android Downloads folder)

7. **Bug Fix: Analytics Export Date Range (Backend + Frontend)**
   - **Purpose:** Fix critical bug preventing transaction exports from Analytics page
   - **Complexity:** LOW (but critical priority)
   - **Why critical:** Blocks current export functionality; must be fixed before adding new features
   - **Investigation required:**
     - `src/app/(dashboard)/analytics/page.tsx` lines 93-108 (export logic)
     - `src/server/api/routers/transactions.router.ts` lines 23-34 (date filtering)
     - Date format validation (ISO 8601 vs Date object)
     - Timezone handling (user timezone vs UTC vs server timezone)
     - Prisma date query operators (gte/lte syntax)

### Technology Stack Implications

**Database (PostgreSQL via Prisma)**
- **Current state:** Well-established schema with 12 models, full-text search preview
- **Requirements:** Add `ExportHistory` model with foreign key to User, indexes on userId/createdAt/expiresAt
- **Migration complexity:** LOW - single new table, no existing data migration needed
- **Recommendation:** Use Prisma migrations for ExportHistory model; add cascade delete on User relation

**Export Libraries**
- **CSV:** Existing `src/lib/csvExport.ts` works well - extend with recurring transactions and categories support
- **JSON:** Existing `src/lib/jsonExport.ts` basic but functional - enhance with AI context generation
- **Excel:** `xlsx` library already installed (v0.18.5 in devDependencies) - create new `src/lib/xlsxExport.ts` utility
- **ZIP:** Need to add `archiver` library (Node.js standard for ZIP generation)
- **Recommendation:**
  - Install `archiver` and `@types/archiver`
  - Create unified export service layer that abstracts format-specific logic
  - Implement streaming for ZIP generation to handle large datasets

**File Storage (Vercel Blob Storage)**
- **Options:** Vercel Blob (free tier 1GB), AWS S3, local filesystem (dev only)
- **Recommendation:** Vercel Blob Storage
- **Rationale:**
  - Already deployed on Vercel (production URL: https://wealth-ta2f.vercel.app)
  - Free tier sufficient (1GB = ~10k exports at 100KB each)
  - Native integration with Vercel deployments
  - Simple SDK (`@vercel/blob`)
  - Automatic CDN distribution for downloads
- **Implementation:** Add `@vercel/blob` to dependencies, configure BLOB_READ_WRITE_TOKEN environment variable

**Mobile Integration (Web Share API)**
- **Options:** Custom modal with copy/download options, Web Share API (native), third-party library
- **Recommendation:** Web Share API with fallback
- **Rationale:**
  - Native iOS/Android share sheet integration
  - Zero dependencies (browser API)
  - Progressive enhancement (fallback to download on unsupported browsers)
  - Matches user expectations on mobile devices
- **Implementation:**
  ```typescript
  if (navigator.share && isMobileDevice()) {
    await navigator.share({ files: [blob], title: 'Wealth Export' })
  } else {
    downloadFile(blob, filename)
  }
  ```

**tRPC API Layer**
- **Current state:** 10 routers, well-structured with protected procedures, uses superjson for serialization
- **Requirements:** Extend `users.router.ts` with 4-5 new export procedures:
  - `exportQuick` (single data type, format, date range)
  - `exportComplete` (ZIP package with all data)
  - `getExportHistory` (list past exports)
  - `reDownloadExport` (get cached export by ID)
  - `deleteExport` (manual cleanup)
- **Recommendation:** Keep export endpoints in `users.router.ts` (user-scoped data); add input validation with Zod schemas

**Async Job Processing**
- **Current state:** No job queue infrastructure
- **Requirements:** Handle exports that take >5 seconds (large datasets, ZIP generation)
- **Options:**
  - In-memory queue (simple but lost on server restart)
  - Vercel Functions with streaming (limited to 10-minute timeout)
  - External job queue (BullMQ, Inngest) - overkill for MVP
- **Recommendation:** Start with **streaming responses** in tRPC for MVP
- **Rationale:**
  - Sufficient for datasets <10k transactions (expected user base)
  - No additional infrastructure
  - Upgrade to job queue post-MVP if needed
- **Implementation:** Use tRPC's subscription pattern or async generators for progress updates

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- 7 major features with distinct architectural layers (frontend, backend, storage, mobile)
- Critical bug fix must be isolated and validated before adding complexity
- Export History feature (caching + storage) can be decoupled from core export functionality
- Mobile UX optimizations can be added after desktop export flows are validated
- Total estimated work (18-24 hours) exceeds single iteration threshold (12 hours)

### Suggested Iteration Phases

**Iteration 1: Foundation & Bug Fix (6-8 hours)**
- **Vision:** Establish reliable export infrastructure and fix critical export bug
- **Scope:** Core export engine with multi-format support and bug fix
  - Fix Analytics export date range bug (investigation + fix)
  - Extend CSV export utility (add recurring transactions, categories)
  - Create Excel export utility (`xlsxExport.ts` using `xlsx` library)
  - Enhance JSON export with AI context generation (`aiContextGenerator.ts`)
  - Add tRPC endpoints for quick exports (single data type)
  - Basic export UI in Settings > Data page (replace "coming soon")
  - Validation and error handling
- **Why first:** Must establish stable export foundation before adding complexity; bug fix unblocks current users
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM (date bug investigation unknown, but low risk once isolated)
- **Success criteria:**
  - Analytics export works correctly with date range filters
  - Users can export transactions/budgets/goals in CSV, JSON, Excel formats
  - Export downloads successfully on desktop browsers
  - No data corruption or missing fields in exports

**Iteration 2: Complete Package & Export Center (7-9 hours)**
- **Vision:** Deliver comprehensive export experience with organized ZIP packages and unified UI
- **Scope:** Complete export package generation and enhanced UX
  - ZIP package generator with folder structure (using `archiver`)
  - README.md generation with AI usage instructions
  - AI context JSON with field descriptions, category hierarchy, prompt templates
  - Summary JSON with metadata (record counts, currency, timezone)
  - Complete Export Center UI in Settings > Data page
  - Export buttons in context (Transactions, Budgets, Goals, Accounts, Recurring pages)
  - Format selector component (CSV/JSON/Excel toggle)
  - Loading states and progress indicators
  - Success/error toast notifications
- **Dependencies:**
  - Requires: Iteration 1 export utilities (CSV, JSON, Excel generators)
  - Imports: Types from Iteration 1 export endpoints, format validation logic
- **Estimated duration:** 7-9 hours
- **Risk level:** MEDIUM (ZIP generation complexity, folder structure organization)
- **Success criteria:**
  - Users can download complete ZIP package with all data types
  - ZIP contains organized folder structure with README and AI context
  - Export Center shows all available export options clearly
  - Export buttons work from Transactions/Budgets/Goals/Accounts/Recurring pages
  - Exports respect current page filters (e.g., date range, category)

**Iteration 3: Mobile UX & Export History (5-7 hours)**
- **Vision:** Optimize for mobile users and add export caching for instant re-downloads
- **Scope:** Mobile optimization and export history system
  - Mobile detection and Web Share API integration
  - Native share sheet flows (iOS/Android)
  - Touch-optimized UI components (44px buttons, improved spacing)
  - Progressive loading for mobile (progress bars, cancel option)
  - ExportHistory Prisma model and migration
  - Vercel Blob Storage integration (`@vercel/blob`)
  - Export caching logic (store for 30 days)
  - Export History UI in Settings > Data page
  - Re-download functionality (instant cache hits)
  - Cron job for cleanup (delete exports older than 30 days)
- **Dependencies:**
  - Requires: Iteration 2 export endpoints and UI components
  - Imports: Export generation logic from Iteration 1 & 2
- **Estimated duration:** 5-7 hours
- **Risk level:** MEDIUM (Vercel Blob integration, mobile testing complexity)
- **Success criteria:**
  - Mobile users see native share sheets when exporting
  - Export history displays last 10 exports with dates and sizes
  - Re-downloading cached exports is instant (<1 second)
  - Exports auto-expire after 30 days
  - Mobile UI feels native (touch targets, spacing, gestures)

---

## Dependency Graph

```
Foundation (Iteration 1)
├── Bug Fix: Analytics Export (Critical Path)
├── CSV Export Utilities (Transactions, Budgets, Goals, Accounts, Recurring, Categories)
├── JSON Export Utilities (Complete data with AI context)
├── Excel Export Utilities (Using xlsx library)
├── AI Context Generator (Field descriptions, prompts)
└── tRPC Export Endpoints (Quick export procedures)
    ↓
Complete Package (Iteration 2)
├── ZIP Package Generator (Uses: Iteration 1 CSV/JSON/Excel utilities)
├── README Generator (Uses: AI context from Iteration 1)
├── Export Center UI (Calls: Iteration 1 tRPC endpoints)
├── Context Export Buttons (Uses: Iteration 1 format generators)
└── Format Selector Component (Shared across pages)
    ↓
Mobile & History (Iteration 3)
├── Mobile Share Integration (Uses: Iteration 2 export flows)
├── Export History Model (References: User model from schema)
├── Vercel Blob Storage (Stores: Exports from Iteration 2)
├── Export History UI (Displays: Cached exports from storage)
└── Cron Cleanup Job (Deletes: Expired exports from Blob + DB)
```

**Critical Path Dependencies:**
1. **Bug Fix MUST complete first** - Blocks current export functionality
2. **Export utilities (Iteration 1) MUST precede ZIP generation (Iteration 2)** - ZIP packages exports generated by utilities
3. **Export endpoints (Iteration 1) MUST precede UI components (Iteration 2)** - UI calls backend endpoints
4. **Export flows (Iteration 2) MUST precede caching (Iteration 3)** - Can't cache what doesn't exist yet
5. **ExportHistory model (Iteration 3) independent of Iterations 1-2** - Can be developed in parallel with mobile UX

---

## Risk Assessment

### High Risks

**Risk: Date Range Export Bug Has Unknown Root Cause**
- **Impact:** If bug investigation takes longer than expected, delays Iteration 1 foundation
- **Mitigation:**
  - Allocate dedicated investigation time (2-3 hours) at start of Iteration 1
  - Test date filtering in isolation (unit tests for tRPC query)
  - Add comprehensive logging for date transformations
  - Fallback: If unfixable quickly, document workaround and defer to post-iteration
- **Recommendation:** Tackle this FIRST in Iteration 1 - it's blocking current users

**Risk: ZIP Generation Fails for Large Datasets (>10k Transactions)**
- **Impact:** Users with large histories cannot export complete packages; potential memory overflow or timeout
- **Mitigation:**
  - Implement streaming ZIP generation (archiver supports streaming)
  - Add file size checks before generation (warn users if >50MB)
  - Paginate exports for very large datasets (e.g., split by year)
  - Test with demo dataset of 15k+ transactions
- **Recommendation:** Build streaming from the start in Iteration 2; don't wait for production issues

### Medium Risks

**Risk: Vercel Blob Storage Free Tier Exceeded**
- **Impact:** If free tier (1GB) fills up, export caching stops working; users can't re-download
- **Mitigation:**
  - Implement aggressive cleanup (30-day expiration enforced)
  - Monitor storage usage (add logging for Blob API calls)
  - Add user-facing storage quota warning if approaching limit
  - Fallback: Reduce cache retention to 14 days if needed
- **Recommendation:** Monitor after launch; 1GB should support hundreds of users initially

**Risk: Mobile Share API Not Supported on All Devices**
- **Impact:** Some mobile users don't see native share sheets; falls back to browser download
- **Mitigation:**
  - Feature detection before calling `navigator.share`
  - Graceful fallback to standard download flow
  - Test on iOS Safari, Android Chrome, older devices
  - Show helpful message: "Share not available - downloading to Files"
- **Recommendation:** Build fallback from the start in Iteration 3; don't assume API support

**Risk: Excel Export Library (xlsx) Has Performance Issues**
- **Impact:** Generating large Excel files (5k+ rows) is slow or crashes browser
- **Mitigation:**
  - Test xlsx library with 10k+ transaction dataset
  - Implement server-side Excel generation (avoid client-side)
  - Add progress indicators for large Excel exports
  - Fallback: Recommend CSV for large datasets
- **Recommendation:** Server-side Excel generation in Iteration 1; test performance early

### Low Risks

**Risk: tRPC Endpoint Timeout for Large Exports**
- **Impact:** Exports taking >30 seconds fail; affects users with 10k+ transactions
- **Mitigation:** Async job queue (post-MVP) or streaming responses
- **Recommendation:** Document limitation; upgrade to job queue if users report issues

**Risk: Date Format Inconsistencies Across Export Formats**
- **Impact:** Users see different date formats in CSV vs JSON vs Excel; confuses AI analysis
- **Mitigation:** Standardize on ISO 8601 (YYYY-MM-DD) across all formats
- **Recommendation:** Add format validation tests in Iteration 1

---

## Integration Considerations

### Cross-Phase Integration Points

**Shared Export Utilities (Iteration 1 → Iteration 2 & 3)**
- CSV, JSON, Excel generators must be reusable across quick exports, complete packages, and cached exports
- **Consistency needed:** All utilities must handle Prisma Decimal types, date formatting, null values identically
- **Recommendation:** Create abstract `BaseExporter` class with shared formatting logic

**tRPC Endpoints (Iteration 1 → Iteration 2 & 3)**
- Export endpoints will be called from Settings page, context pages, and export history
- **Consistency needed:** Standardized error responses, loading states, success messages
- **Recommendation:** Define shared Zod schemas for export inputs/outputs; reuse across procedures

**Mobile Detection (Iteration 3 → All Pages)**
- Mobile UX optimizations span Export Center, context export buttons, and export history
- **Consistency needed:** All export buttons must detect mobile and trigger share sheet vs download
- **Recommendation:** Create `useMobileExport()` hook wrapping detection + share logic; use everywhere

**Export History Model (Iteration 3)**
- ExportHistory tracks exports from both quick exports (Iteration 1) and complete packages (Iteration 2)
- **Consistency needed:** All export flows must write to ExportHistory after successful generation
- **Recommendation:** Add `trackExport()` middleware in tRPC to automatically log all successful exports

### Potential Integration Challenges

**Challenge: CSV Export Already Working (Analytics Page) But Has Bug**
- **Issue:** Analytics page has working export button calling existing `generateTransactionCSV`, but date range filter is broken
- **Implication:** Can't blindly replace existing export logic - must preserve what works, fix what doesn't
- **Solution:** Fix bug in-place in Iteration 1; extend (don't replace) existing CSV utility

**Challenge: Mobile Share API Requires File Blob, Not Data URI**
- **Issue:** Current download logic uses `URL.createObjectURL` and `<a>` tag; share API needs `File` object
- **Implication:** Need dual code paths (share vs download) with different data structures
- **Solution:** Create `exportToBlob()` utility that returns `Blob` object; use for both share and download flows

**Challenge: Export History Spans Multiple Data Types**
- **Issue:** Each export can contain different data types (transactions only, budgets only, complete package)
- **Implication:** Export history UI must display type-specific metadata (e.g., "Transactions: 247 records, Jan-Nov 2025")
- **Solution:** Store `exportType` and `metadata` JSON in ExportHistory; render dynamically in UI

**Challenge: Vercel Blob Storage URLs Expire**
- **Issue:** Blob storage signed URLs are temporary; can't store permanent download links
- **Implication:** Must generate fresh signed URL on each re-download request
- **Solution:** Store Blob `pathname` (permanent) in ExportHistory; call `blob.downloadUrl(pathname)` on re-download

---

## Recommendations for Master Plan

1. **Start with Critical Bug Fix in Iteration 1**
   - Dedicate first 2-3 hours to diagnosing and fixing Analytics export date range bug
   - This unblocks current users and validates export infrastructure before building on it
   - Run comprehensive tests on date filtering after fix (timezone edge cases, month boundaries)

2. **Build Export Utilities as Reusable Services (Iteration 1)**
   - Don't build export logic inline in tRPC endpoints - create separate service layer
   - Extract shared formatting logic (dates, decimals, null handling) into base class
   - Write unit tests for each export format (CSV, JSON, Excel) with sample data
   - This pays off in Iteration 2 when ZIP package reuses all utilities

3. **Implement Streaming ZIP Generation from the Start (Iteration 2)**
   - Don't buffer entire ZIP in memory - stream directly to response
   - Use `archiver` library's pipe() method to stream to HTTP response
   - Test with large dataset (15k+ transactions) before considering iteration complete
   - This prevents production issues with memory overflow or timeout

4. **Design Export History for Future AI Features (Iteration 3)**
   - Store export metadata (data types, record counts, date ranges) in structured JSON
   - This metadata can power future AI features (e.g., "Analyze my November spending" → use cached November export)
   - Add `version` field to ExportHistory for future export format changes
   - Consider adding `notes` field for user-generated export descriptions

5. **Prioritize Mobile UX Testing (Iteration 3)**
   - Test Web Share API on real devices (iOS Safari, Android Chrome), not just emulators
   - Share sheet behavior varies significantly across platforms (iOS shows AirDrop, Android shows nearby devices)
   - Validate file types are recognized by receiving apps (e.g., CSV opens in Numbers on iOS)
   - Fallback download flow must work seamlessly when share unavailable

6. **Consider Post-MVP Enhancements in Architecture**
   - Design ExportHistory model to support future features (scheduled exports, export templates)
   - Add `presetId` foreign key (nullable) to ExportHistory for future export presets
   - Use `metadata` JSON field flexibly to avoid schema changes for minor additions
   - This reduces technical debt when implementing should-have/could-have features

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Frontend:** Next.js 14.2 (App Router), React 18.3, TypeScript 5.7
- **Styling:** Tailwind CSS 3.4 with custom warm color palette, shadcn/ui components
- **State Management:** tRPC 11.6 + TanStack Query 5.80 (no Zustand/Redux - server state driven)
- **Backend:** tRPC API layer with superjson serialization, Prisma ORM
- **Database:** PostgreSQL (Supabase - local Docker for dev, cloud for production)
- **Auth:** Supabase Auth with SSR support
- **Deployment:** Vercel (production URL: https://wealth-ta2f.vercel.app)
- **Build:** SWC compiler, standalone output mode
- **Testing:** Vitest with UI mode and coverage

**Patterns observed:**
- **Route groups:** App Router uses `(dashboard)` route group for authenticated pages
- **tRPC routers:** 10 routers organized by domain (transactions, budgets, goals, accounts, etc.)
- **Protected procedures:** Consistent use of `protectedProcedure` for authenticated endpoints
- **CSV export pattern:** Existing `csvExport.ts` uses UTF-8 BOM for Excel compatibility, proper quote escaping
- **JSON export pattern:** Existing `jsonExport.ts` sanitizes Prisma Decimals to numbers for JSON serialization
- **Component organization:** Shadcn/ui for base components, domain-specific components in `/components/[domain]`
- **Color palette:** Custom warm grays and sage greens (warm-gray-*, sage-*) for "conscious money" aesthetic

**Opportunities:**
- **Excel library already installed:** `xlsx` 0.18.5 in devDependencies - can use immediately
- **Anthropic SDK already installed:** `@anthropic-ai/sdk` 0.32.1 - ready for future Phase 2 AI features
- **Supabase infrastructure ready:** Auth, database, and storage already configured
- **tRPC infrastructure mature:** Well-structured routers with error handling, input validation (Zod)

**Constraints:**
- **NIS currency only:** Multi-currency removed (lines 347-350 in schema) - all amounts in NIS
- **User timezone stored:** Can use for consistent date formatting in exports
- **Plaid integration exists:** Must handle plaidAccessToken redaction in exports (security)
- **No existing job queue:** Must implement async handling for large exports

### Greenfield Recommendations

**For Export Infrastructure:**

1. **Install archiver for ZIP generation**
   ```bash
   npm install archiver @types/archiver
   ```
   - Industry standard for ZIP generation in Node.js
   - Streaming support prevents memory overflow
   - Wide browser compatibility

2. **Install @vercel/blob for export caching**
   ```bash
   npm install @vercel/blob
   ```
   - Native Vercel integration
   - Free tier: 1GB storage (sufficient for MVP)
   - Simple API: `put()`, `get()`, `delete()`

3. **Create export service layer structure**
   ```
   src/lib/export/
     base.ts                 # BaseExporter abstract class
     csv.ts                  # Extend existing csvExport.ts
     json.ts                 # Extend existing jsonExport.ts
     xlsx.ts                 # NEW: Excel workbook generator
     zip.ts                  # NEW: ZIP package orchestrator
     ai-context.ts           # NEW: AI metadata generator
     formatters.ts           # Shared date, decimal, null formatting
   ```

4. **Create export API structure**
   ```
   src/server/api/routers/
     exports.router.ts       # NEW: Dedicated export endpoints (or extend users.router.ts)

   src/server/services/
     export-generator.ts     # NEW: Orchestrates export creation
     export-cache.ts         # NEW: Blob storage interactions
     export-history.ts       # NEW: Database operations for ExportHistory
   ```

5. **Use progressive enhancement for mobile**
   ```typescript
   // src/lib/export/share.ts
   export async function exportFile(blob: Blob, filename: string) {
     const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

     if (isMobile && navigator.share) {
       const file = new File([blob], filename, { type: blob.type })
       await navigator.share({ files: [file], title: filename })
     } else {
       // Fallback to standard download
       const url = URL.createObjectURL(blob)
       const link = document.createElement('a')
       link.href = url
       link.download = filename
       link.click()
       URL.revokeObjectURL(url)
     }
   }
   ```

6. **Standardize export date formatting**
   - Use ISO 8601 (YYYY-MM-DD) for dates across all formats
   - Use user's timezone from User model for date conversions
   - Add timezone offset to AI context for proper interpretation

7. **Create comprehensive export tests**
   ```
   src/__tests__/lib/export/
     csv.test.ts
     json.test.ts
     xlsx.test.ts
     zip.test.ts
     ai-context.test.ts
   ```
   - Test with empty datasets (0 transactions)
   - Test with large datasets (10k+ transactions)
   - Test with Prisma Decimal edge cases
   - Test with special characters (quotes, commas, newlines)

---

## Notes & Observations

**Current Export Infrastructure Assessment:**
- Existing CSV/JSON export utilities are functional but minimal - good foundation to build on
- Analytics page export has working UI pattern (export button + toast notifications) - can replicate
- Settings > Data page is placeholder ("coming soon") - clean slate for Export Center UI
- tRPC `users.exportAllData` endpoint exists and works - validates backend architecture

**Mobile-First Opportunity:**
- Vision emphasizes mobile optimization (native share sheets, touch targets)
- Current user base likely mobile-heavy (personal finance users check balances on-the-go)
- Web Share API is well-supported (iOS 14+, Android Chrome 89+) - covers vast majority
- Consider mobile testing a critical success metric

**AI-Ready Architecture is Strategic:**
- Phase 2 AI integration explicitly mentioned in vision
- Anthropic SDK already installed - team has AI integration plans
- Export format can serve dual purpose: external AI tools today, in-app AI tomorrow
- Well-structured exports reduce future integration effort

**Performance Considerations:**
- Vision assumes average user has <10k transactions (reasonable for personal finance)
- 30-second timeout constraint is tight for large exports - streaming is essential
- 50MB file size limit is generous (10k transactions ~5MB in CSV)
- Vercel Functions have 10-minute max timeout - upgrade path exists if needed

**Date Bug Investigation Priority:**
- Bug is CRITICAL - blocks current export functionality
- Likely causes: timezone conversion issue, tRPC date serialization, or Prisma query format
- Recommend starting Iteration 1 with dedicated debugging session
- Add comprehensive date handling tests after fix to prevent regression

**Export History Value Proposition:**
- 30-day caching reduces server load for users who export regularly
- Instant re-downloads improve UX significantly (5s → <1s)
- Storage cost is minimal (1GB = ~10k cached exports at 100KB each)
- Enables future features (export scheduling, export templates, export analytics)

**Should-Have Features Defer to Post-MVP:**
- Scheduled exports (automatic monthly/weekly) - requires job queue infrastructure
- Custom export templates - requires additional UI for template configuration
- Excel worksheets (multi-sheet) - requires xlsx library advanced features
- QFX/OFX export - requires new format parsers (Quicken, YNAB integration)
- Encrypted exports - requires encryption library and key management

**Architecture Supports Phase 2 AI Integration:**
- AI context JSON structure provides field descriptions and category hierarchy
- README includes AI prompt templates for common analyses
- Export format version number enables future format changes without breaking AI
- Clean data architecture now = easier AI training later

---

*Exploration completed: 2025-11-09T20:45:00Z*
*This report informs master planning decisions*
