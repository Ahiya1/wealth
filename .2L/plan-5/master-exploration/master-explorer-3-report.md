# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Build a seamless, AI-ready data export system that enables users to download their complete financial data in multiple formats (CSV, JSON, Excel, ZIP packages) from anywhere in the app, with mobile-optimized share sheets and structured metadata for external AI analysis.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 7 must-have features
- **User stories/acceptance criteria:** 45+ acceptance criteria across all features
- **Estimated total work:** 18-24 hours (medium-large iteration)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Multiple user touchpoints:** Export functionality must integrate into 7+ different pages (Settings, Transactions, Analytics, Budgets, Goals, Accounts, Recurring)
- **Cross-platform UX requirements:** Desktop (download flows) vs Mobile (native share sheets) require different integration approaches
- **State synchronization challenges:** Export contexts must respect page-specific filters (date ranges, categories, accounts) across multiple UI states
- **Critical bug fix required:** Analytics page export currently broken (date range filter bug) - must diagnose root cause before building new features
- **Real-time feedback complexity:** Progress indicators, loading states, success/error handling must work consistently across all integration points
- **Multiple data flow patterns:** Server-side generation (tRPC) → Client-side download/share → Native OS integration (share API)

---

## User Flow Analysis

### Primary User Journeys

#### Flow 1: Quick Export from Context (HIGHEST FRICTION POINT)
**Current Pain:** Users must navigate to Settings > Data page to export, losing their filters and context

**Desired Experience:**
1. User applies filters on Transactions page (e.g., "Last 3 months, Dining category")
2. Clicks "Export" button visible in page header
3. Selects format (CSV, JSON, Excel) from dropdown
4. **Mobile:** Native share sheet appears → User shares to Files/ChatGPT/Email
5. **Desktop:** Browser download dialog → File saves to Downloads folder
6. Success toast: "Downloaded 47 transactions" (shows filtered count)

**Integration Requirements:**
- Export button must be context-aware on each page
- Filter state must propagate from page state → tRPC query → export function
- Export count preview must show before download ("Export 47 filtered transactions")
- Date range, category, account filters must be preserved in filename and export data

**Risk:** HIGH - Requires consistent implementation across 6+ different pages with different filter patterns

---

#### Flow 2: Complete Data Package from Settings (NEW FEATURE)
**Current State:** Settings > Data page shows "coming soon" placeholder

**Desired Experience:**
1. User navigates to Settings > Data & Export (centralized hub)
2. Sees clear sections: "Quick Exports", "Complete Export", "Export History"
3. Clicks "Export Everything" in Complete Export section
4. Sees export preview: "Preparing: 1,247 transactions, 12 budgets, 3 goals, 8 recurring..."
5. Progress indicator shows: "Generating ZIP... 40%"
6. ZIP file downloads: `wealth-complete-export-2025-11-09.zip`
7. User unzips → finds organized structure with README.md and ai-context.json

**Integration Requirements:**
- New UI page replacing placeholder (Settings > Data page)
- Server-side ZIP generation using Node.js archiver library (NEW dependency needed)
- Async export job system for large datasets (>5k transactions)
- Progress streaming from server → client (WebSocket or polling?)
- Export history tracking in database (new ExportHistory model needed)

**Risk:** MEDIUM - New page, new dependencies, but isolated from existing features

---

#### Flow 3: Re-Download from History (NEW FEATURE)
**Desired Experience:**
1. User opens Settings > Data & Export
2. Scrolls to "Export History" section
3. Sees list: "Complete Export - Nov 9, 2025 (2.4 MB) - [Download Again]"
4. Clicks "Download Again" → Instant download (cached, no regeneration)
5. If expired (>30 days): Shows "Generate Fresh Export" instead

**Integration Requirements:**
- Export caching system (Vercel Blob Storage or S3)
- Database table to track export metadata (ExportHistory model)
- Automatic cleanup job (cron) to delete exports older than 30 days
- Cache hit/miss logic with fallback to regeneration

**Risk:** MEDIUM - New storage infrastructure, potential cost implications for caching

---

### Edge Cases & Error Handling

#### Critical Edge Case 1: Empty Data Scenarios
**Scenario:** User clicks export with no data in selected range

**Current Bug:** Analytics page shows generic error "No data to export: There are no transactions in the selected date range" even when transactions exist

**Root Cause Analysis:**
- **File:** `src/app/(dashboard)/analytics/page.tsx:93-108`
- **Issue:** Date comparison between client state (Date object) and tRPC query (ISO string?)
- **Suspicious Code:**
  ```typescript
  const { data: transactions } = trpc.transactions.list.useQuery({
    startDate: dateRange.startDate,  // Date object
    endDate: dateRange.endDate,      // Date object
    limit: 1000,
  })
  ```
- **Hypothesis:** tRPC router `transactions.list` (lines 23-34) may have timezone conversion issue or incorrect date comparison operators

**Must Fix Before Iteration 1:**
1. Test with explicit date conversion: `startDate: dateRange.startDate.toISOString()`
2. Verify Prisma query uses correct operators: `gte`/`lte` vs `gt`/`lt`
3. Add logging to see actual date values sent to database
4. Ensure timezone consistency (user timezone vs UTC vs server timezone)

**Proper UX for Empty Data:**
- Show clear message: "No transactions found for selected filters"
- Suggest actions: "Try expanding date range or clearing filters"
- Disable export button (greyed out) when count is 0
- Show "0 transactions" in export preview

---

#### Critical Edge Case 2: Large Dataset Performance
**Scenario:** User with 10k+ transactions exports complete package

**Integration Challenges:**
- Client-side CSV generation in browser → Memory overflow risk
- Server-side generation → Request timeout (30s limit on Vercel)
- ZIP file generation → Blocks Node.js event loop

**Solutions:**
- **Streaming exports:** Use Node.js streams to generate ZIP without loading all data into memory
- **Async job queue:** For exports >5k records, create background job and notify user when ready
- **Progress updates:** Use tRPC subscription or polling to show "Generating... 60%" status
- **Chunked downloads:** Split large exports into multiple files if needed

**Risk:** HIGH - Performance issues could block user experience and incur infrastructure costs

---

#### Critical Edge Case 3: Mobile Share API Compatibility
**Scenario:** User on iOS Safari vs Android Chrome vs Desktop Firefox

**Integration Requirements:**
- **Feature detection:** Check `if (navigator.share)` before showing share option
- **Fallback:** Desktop users should see standard download, not share sheet
- **File type handling:** Some mobile browsers don't support ZIP files in share sheet
- **Permission handling:** Share API may be blocked by browser permissions

**Implementation Pattern:**
```typescript
const handleExport = async (data: Blob, filename: string) => {
  // Mobile: Native share
  if (navigator.share && navigator.canShare?.({ files: [new File([data], filename)] })) {
    try {
      await navigator.share({
        files: [new File([data], filename, { type: data.type })],
        title: 'Wealth Export',
        text: 'Your financial data export'
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        // User cancelled - silently ignore
        // Otherwise fall back to download
        downloadFile(data, filename)
      }
    }
  } else {
    // Desktop: Standard download
    downloadFile(data, filename)
  }
}
```

**Testing Required:**
- iOS Safari (iPhone, iPad)
- Android Chrome
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Progressive Web App context

**Risk:** MEDIUM - Share API works differently across platforms, needs extensive testing

---

## Frontend/Backend Integration Complexity

### Existing Integration Points

#### 1. Analytics Page Export (CURRENTLY BROKEN)
**Current Implementation:**
- **Client:** `src/app/(dashboard)/analytics/page.tsx` (lines 93-108)
- **Flow:**
  1. Client fetches transactions via `trpc.transactions.list.useQuery()`
  2. Client calls `generateTransactionCSV()` (browser-side)
  3. Client calls `downloadCSV()` (creates Blob URL)

**Issues:**
- Date filter bug causing "no data" error
- Limited to 1000 transactions (hardcoded limit)
- No format selection (CSV only)
- No mobile share support

**Integration Changes Needed:**
- Fix date filter bug (client → tRPC → Prisma)
- Add format selector UI component
- Add mobile share API integration
- Increase limit or implement pagination

**Complexity:** MEDIUM (bug fix + enhancement)

---

#### 2. Settings Data Page (PLACEHOLDER, NEEDS FULL IMPLEMENTATION)
**Current State:** Shows "coming soon" message

**Required Implementation:**
- **New tRPC Endpoints:**
  - `users.exportQuick` - Single data type export (transactions, budgets, goals, etc.)
  - `users.exportComplete` - Full ZIP package
  - `users.exportHistory` - List past exports
  - `users.downloadCached` - Re-download cached export

- **New UI Components:**
  - `<ExportCenter />` - Main hub component
  - `<QuickExportCard />` - Individual data type exports
  - `<CompleteExportCard />` - ZIP package generator
  - `<ExportHistoryCard />` - Past exports list
  - `<FormatSelector />` - Dropdown for CSV/JSON/Excel
  - `<ExportProgress />` - Progress indicator for large exports

- **State Management:**
  - Export job status (idle | generating | ready | failed)
  - Progress percentage (0-100)
  - Format selection per data type
  - Date range filters for time-series data

**Complexity:** HIGH (entirely new page with complex state)

---

#### 3. Context Export Buttons (NEW, 6+ PAGES)
**Pages Requiring Export Integration:**
1. Transactions page → Export filtered transactions
2. Budgets page → Export current month or all budgets
3. Goals page → Export all goals
4. Accounts page → Export account balances
5. Recurring page → Export recurring transaction templates
6. Analytics page → Export chart data (already exists, needs fixing)

**Integration Pattern for Each Page:**
```typescript
// Example: Transactions page
const TransactionListPage = () => {
  const [filters, setFilters] = useState({ dateRange, category, account })

  // Existing query
  const { data: transactions } = trpc.transactions.list.useQuery(filters)

  // NEW: Export mutation
  const exportMutation = trpc.transactions.export.useMutation()

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    const blob = await exportMutation.mutateAsync({
      filters,
      format
    })
    await handleDownloadOrShare(blob, `transactions-${Date.now()}.${format}`)
  }

  return (
    <>
      <ExportButton
        onClick={handleExport}
        count={transactions.length}
        formats={['csv', 'json', 'xlsx']}
      />
      {/* Rest of page */}
    </>
  )
}
```

**Challenges:**
- Each page has different filter patterns (budgets use month, transactions use date range, etc.)
- Filter state must propagate to export function
- Export count preview must be accurate
- Button placement must be consistent but context-aware

**Complexity:** HIGH (requires changes to 6+ existing pages with different contexts)

---

### New Backend API Contracts

#### API 1: Quick Export (Single Data Type)
**Endpoint:** `users.exportQuick`

**Input Schema:**
```typescript
{
  dataType: 'transactions' | 'budgets' | 'goals' | 'accounts' | 'recurring' | 'categories',
  format: 'csv' | 'json' | 'xlsx',
  filters?: {
    dateRange?: { startDate: Date, endDate: Date },
    categoryId?: string,
    accountId?: string,
    month?: string // For budgets
  }
}
```

**Output:**
```typescript
{
  data: Buffer, // File bytes
  filename: string,
  mimeType: string,
  recordCount: number
}
```

**Backend Logic:**
1. Validate user owns requested data
2. Fetch data with filters from Prisma
3. Generate file in requested format (CSV/JSON/Excel)
4. Return Buffer with metadata

**Complexity:** MEDIUM (extends existing export utilities)

---

#### API 2: Complete Export Package
**Endpoint:** `users.exportComplete`

**Input Schema:**
```typescript
{
  includeInactive?: boolean // Include deleted/inactive records
}
```

**Output:**
```typescript
{
  jobId: string, // For large exports (async)
  status: 'generating' | 'ready',
  downloadUrl?: string, // If ready immediately
  estimatedTime?: number // Seconds
}
```

**Backend Logic (Async Job):**
1. Create export job record in database
2. Fetch all user data in parallel (transactions, budgets, goals, etc.)
3. Generate individual files (CSV for each data type)
4. Generate ai-context.json with metadata
5. Generate README.md with instructions
6. Create ZIP archive using `archiver` library
7. Upload to Vercel Blob Storage or S3
8. Save export metadata to ExportHistory table
9. Update job status to 'ready'

**Complexity:** VERY HIGH (async jobs, ZIP generation, cloud storage, progress tracking)

---

#### API 3: Export History & Re-Download
**Endpoint:** `users.exportHistory`

**Output:**
```typescript
{
  exports: [{
    id: string,
    exportType: 'quick' | 'complete',
    dataType?: string, // For quick exports
    format: string,
    dateRange?: { start: Date, end: Date },
    fileSize: number,
    createdAt: Date,
    expiresAt: Date,
    status: 'cached' | 'expired',
    downloadUrl?: string // If cached
  }]
}
```

**Endpoint:** `users.downloadCached`

**Input:**
```typescript
{ exportId: string }
```

**Output:**
```typescript
{
  downloadUrl: string,
  expiresIn: number // Seconds until URL expires
}
```

**Backend Logic:**
1. Query ExportHistory table
2. Check if file still exists in storage
3. Generate signed URL for download
4. Return URL with expiration

**Complexity:** MEDIUM (database queries + storage integration)

---

### Data Flow Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
└─────────────────────────────────────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
         ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
         │  Context     │   │  Settings    │   │  Analytics  │
         │  Exports     │   │  Export Hub  │   │  Export     │
         │  (6 pages)   │   │  (New Page)  │   │  (Broken)   │
         └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   tRPC Client     │
                         │   (Browser)       │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   tRPC Server     │
                         │   (API Routes)    │
                         └─────────┬─────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
         ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
         │  Prisma DB  │   │  Export     │   │  Storage    │
         │  Queries    │   │  Generation │   │  (Vercel    │
         │             │   │  (CSV/JSON) │   │  Blob/S3)   │
         └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   File Output     │
                         │   (Blob/Buffer)   │
                         └─────────┬─────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
         ┌──────▼──────┐   ┌──────▼──────┐
         │  Browser    │   │  Mobile     │
         │  Download   │   │  Share API  │
         └─────────────┘   └─────────────┘
```

**Key Integration Points:**
1. **Page State → tRPC Query:** Filter state must serialize correctly
2. **tRPC Query → Prisma:** Date objects must convert properly (KNOWN BUG)
3. **Prisma → Export Utils:** Decimal/Date types must convert to CSV/JSON strings
4. **Export Utils → Blob:** File generation must handle large datasets without memory overflow
5. **Blob → Client:** Download/Share must detect mobile vs desktop
6. **Storage → Cache:** Cached exports must have signed URLs for security

---

## Authentication & Session Management

### Current State
**Auth System:** Supabase Auth (OAuth + email/password)

**Session Flow:**
1. User signs in → Supabase session token stored in cookie
2. Next.js middleware validates session on each request
3. tRPC context includes authenticated user object
4. All export endpoints require `protectedProcedure`

### Export-Specific Auth Considerations

#### 1. Export Download URLs (Security Risk)
**Issue:** Generated export files must be downloadable but only by the owner

**Solutions:**
- **Option A:** Inline download (return file directly in API response)
  - Pro: Simple, no storage needed
  - Con: Large files may timeout (Vercel 30s limit)

- **Option B:** Signed temporary URLs (Vercel Blob Storage)
  - Pro: Fast, works for large files
  - Con: Requires storage, URLs must expire

- **Option C:** Pre-signed S3 URLs
  - Pro: Industry standard, highly reliable
  - Con: AWS setup complexity, potential cost

**Recommendation:** Start with Option A (inline) for quick exports, use Option B (Vercel Blob) for complete exports

**Security Requirements:**
- Export URLs must include user ID validation
- URLs must expire after 1 hour
- No caching of sensitive data in CDN
- HTTPS only

---

#### 2. Mobile App Session Persistence
**Issue:** Mobile share sheet closes app → User returns → Session may expire

**Current Behavior:**
- Supabase session cookie has 1-hour expiration
- Auto-refresh token extends session
- Share sheet interruption doesn't break session (handled by browser)

**Testing Required:**
- iOS Safari: Share to Files → Return to app
- Android Chrome: Share to Drive → Return to app
- Verify session remains valid after share

**Risk:** LOW (Supabase handles session refresh automatically)

---

## Real-Time Features & State Synchronization

### Export Job Progress (Async Exports)

**Challenge:** Large exports (>5k transactions) need progress updates

**Options:**

#### Option 1: Polling
```typescript
const pollJobStatus = async (jobId: string) => {
  const { status, progress } = await trpc.exports.getJobStatus.query({ jobId })
  if (status === 'generating') {
    setTimeout(() => pollJobStatus(jobId), 1000) // Poll every 1s
  } else {
    // Ready or failed
  }
}
```

**Pros:** Simple, works everywhere
**Cons:** Inefficient, delays up to 1s

#### Option 2: tRPC Subscriptions (WebSocket)
```typescript
const subscription = trpc.exports.subscribeToJob.useSubscription(
  { jobId },
  {
    onData: (data) => {
      setProgress(data.progress)
      if (data.status === 'ready') {
        // Download ready
      }
    }
  }
)
```

**Pros:** Real-time, efficient
**Cons:** Requires WebSocket support (Vercel Edge Functions don't support WS)

#### Option 3: Server-Sent Events (SSE)
```typescript
const eventSource = new EventSource(`/api/exports/${jobId}/progress`)
eventSource.onmessage = (event) => {
  const { progress } = JSON.parse(event.data)
  setProgress(progress)
}
```

**Pros:** Real-time, HTTP-based (works on Vercel)
**Cons:** One-way communication only

**Recommendation:** Use **Option 1 (Polling)** for MVP, upgrade to **Option 3 (SSE)** post-MVP

**Complexity:** MEDIUM (polling is simple, SSE requires new endpoint)

---

### Export History Refresh

**Challenge:** User generates export → History list should update immediately

**Current Pattern:** React Query invalidation
```typescript
const exportMutation = trpc.users.exportComplete.useMutation({
  onSuccess: () => {
    // Invalidate export history query to trigger refetch
    trpcUtils.users.exportHistory.invalidate()
  }
})
```

**Works well for:** Single-user context
**Issue:** If user has multiple tabs open, other tabs won't see update

**Solution for Multi-Tab Sync:**
- Use `BroadcastChannel` API to notify other tabs
- Each tab listens for 'export_complete' message
- Invalidate queries on message

**Complexity:** LOW (nice-to-have, not critical for MVP)

---

## Error Handling & Edge Case Flows

### Critical Error Scenarios

#### 1. Network Failure During Download
**Scenario:** User clicks export → Network disconnects mid-download

**Current Behavior:** Browser download fails, no retry

**Improved UX:**
- Show error toast: "Download failed. Retrying..."
- Implement automatic retry (3 attempts with exponential backoff)
- If still fails: Save to export history, allow manual retry later
- For large exports: Store in cache so user can re-download without regenerating

**Implementation:**
```typescript
const downloadWithRetry = async (url: string, filename: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      await handleDownloadOrShare(blob, filename)
      return // Success
    } catch (err) {
      if (i === retries - 1) {
        toast.error('Download failed', {
          description: 'Export saved to history. Try again from Settings > Data.'
        })
      } else {
        await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000)) // Backoff
      }
    }
  }
}
```

**Complexity:** MEDIUM

---

#### 2. Browser Storage Quota Exceeded
**Scenario:** User downloads 50MB ZIP → Browser blocks download due to storage limit

**Detection:**
- Check available storage: `navigator.storage.estimate()`
- Warn before download if insufficient space

**Fallback:**
- Offer to email export as download link
- Suggest clearing browser cache
- For mobile: Offer direct share to cloud storage (Drive, iCloud) instead of downloading

**Complexity:** LOW (detection simple, fallbacks are nice-to-have)

---

#### 3. Export Generation Timeout
**Scenario:** User with 50k transactions → Export takes >30s → Vercel function times out

**Prevention:**
- Set limit: Quick exports max 10k records
- For larger datasets: Force async job approach
- Show estimate before starting: "This may take 2-3 minutes"

**Graceful Degradation:**
- If timeout occurs: Save partial progress
- Create export job in background
- Email user when ready (post-MVP feature)

**Complexity:** HIGH (requires job queue system)

---

#### 4. Invalid Date Range (Analytics Bug)
**Scenario:** User selects date range → Export shows "no data" even when data exists

**Root Cause (Hypothesis):**
```typescript
// Client sends Date object
const startDate = new Date('2025-01-01')

// tRPC serializes to ISO string
// "2025-01-01T00:00:00.000Z" (UTC midnight)

// User timezone is America/New_York (UTC-5)
// So client meant "2025-01-01 00:00 EST" = "2025-01-01 05:00 UTC"

// Prisma query:
where: { date: { gte: "2025-01-01T00:00:00.000Z" } }

// But transactions are stored in user's local time:
// Transaction 1: "2024-12-31T23:00:00.000Z" (actually 2025-01-01 00:00 EST)
// This transaction is EXCLUDED because it's before the UTC midnight cutoff!
```

**Fix Strategy:**
1. **Option A:** Always use start of day in user's timezone
   ```typescript
   const startDate = startOfDay(new Date('2025-01-01'))
   const utcStart = zonedTimeToUtc(startDate, user.timezone)
   ```

2. **Option B:** Store dates in UTC, convert on display
   - Changes database schema (migration needed)
   - More work but cleaner long-term

3. **Option C:** Use date-only strings (YYYY-MM-DD) instead of timestamps
   - Avoids timezone issues entirely
   - Requires Prisma query change: `date >= '2025-01-01' AND date < '2025-02-01'`

**Recommendation:** Use **Option C** for transaction date filtering (dates are always local, no timezone conversion)

**Complexity:** MEDIUM (requires testing across timezones)

---

### Validation Requirements

#### Client-Side Validation
1. **Date Range:**
   - Start date must be before end date
   - Date range max 2 years (performance limit)
   - Future dates not allowed

2. **Export Format:**
   - Must be one of: csv, json, xlsx
   - Excel only for datasets <10k rows (Excel row limit: 1,048,576)

3. **File Naming:**
   - Filename must be safe (no special characters)
   - Include date range in filename for clarity

#### Server-Side Validation
1. **Authorization:**
   - User must own all data in export
   - Check `userId` matches session user

2. **Rate Limiting:**
   - Max 10 exports per user per hour (prevent abuse)
   - Track in Redis or database

3. **Data Volume:**
   - Quick exports: Max 10k records
   - Complete exports: Max 100k records
   - Return 400 error if exceeded

**Complexity:** LOW (standard validation patterns)

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

#### 1. Export Buttons
**Requirements:**
- Minimum touch target: 44x44px (already in Tailwind config)
- Color contrast: 4.5:1 for text, 3:1 for interactive elements
- Keyboard accessible: Tab navigation, Enter/Space to activate
- Screen reader labels: "Export 47 transactions as CSV"

**Implementation:**
```tsx
<Button
  onClick={handleExport}
  className="min-h-touch-target min-w-touch-target"
  aria-label={`Export ${count} ${dataType} as ${format.toUpperCase()}`}
>
  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
  Export
</Button>
```

---

#### 2. Format Selector Dropdown
**Requirements:**
- Keyboard navigable (arrow keys to select format)
- Screen reader announces: "Format: CSV, JSON, or Excel"
- Selected option clearly indicated
- Focus visible on selection

**Current UI Library:** Radix UI (already accessible)

**Testing Required:**
- VoiceOver (iOS/macOS)
- TalkBack (Android)
- NVDA (Windows)

---

#### 3. Progress Indicators
**Requirements:**
- Live region for status updates: "Export generating, 40% complete"
- Progress bar with aria-valuenow/aria-valuemin/aria-valuemax
- Status changes announced to screen readers

**Implementation:**
```tsx
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
  <div className="bg-sage-600" style={{ width: `${progress}%` }} />
</div>
<div role="status" aria-live="polite">
  {status === 'generating' && `Generating export, ${progress}% complete`}
  {status === 'ready' && 'Export ready for download'}
</div>
```

---

#### 4. Error Messages
**Requirements:**
- Errors announced to screen readers (aria-live="assertive")
- Clear recovery instructions
- Error icon with descriptive text (not icon-only)

**Complexity:** MEDIUM (requires careful testing with screen readers)

---

## Responsive Design Requirements

### Breakpoint Strategy

**Tailwind Breakpoints:**
- `sm:` 640px - Small tablets
- `md:` 768px - Tablets
- `lg:` 1024px - Desktop
- `xl:` 1280px - Large desktop

### Mobile-First Design Patterns

#### 1. Export Button Placement
**Mobile (<640px):**
- Single column layout
- Export button below page title
- Full width or prominent in header

**Tablet (640-1024px):**
- Export button in top-right corner
- Icon + text label

**Desktop (>1024px):**
- Export button in page header with format dropdown
- Inline with other action buttons

**Implementation Pattern:**
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
  <div>
    <h1>Transactions</h1>
  </div>
  <div className="w-full sm:w-auto flex gap-2">
    <ExportButton />
  </div>
</div>
```

---

#### 2. Export Center Layout (Settings Page)
**Mobile:**
- Stacked cards (single column)
- Simplified format selector (bottom sheet)
- Export history: List view, 1 item per row

**Tablet:**
- 2-column grid for quick exports
- Complete export: Full width
- Export history: Card grid, 2 per row

**Desktop:**
- 3-column grid for quick exports
- Sidebar for format options
- Export history: Table view with columns

---

#### 3. Progress Indicators
**Mobile:**
- Full-screen overlay with progress bar
- Large, easy-to-read percentage
- Cancel button prominent

**Desktop:**
- Modal dialog with progress
- Smaller, less intrusive
- Allow user to continue browsing (background job)

---

### Touch-Friendly Interactions

#### Button Sizing
- All buttons: `min-h-touch-target` (44px minimum)
- Format selector items: 48px height for easy tapping
- Export history list items: 60px height (includes timestamp, file size)

#### Spacing
- Between buttons: 8px minimum (2 in Tailwind)
- Between list items: 4px minimum (1 in Tailwind)
- Page margins: 16px on mobile (4 in Tailwind)

**Complexity:** MEDIUM (requires testing on actual devices)

---

## Mobile Optimization Deep Dive

### Native Share Sheet Integration

**API Support:**
- **iOS Safari:** Full support (iOS 12.2+)
- **Android Chrome:** Full support (Chrome 75+)
- **Desktop:** No support (fallback to download)

**Implementation:**
```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
const hasShareAPI = typeof navigator.share === 'function'

if (isMobile && hasShareAPI) {
  // Use share sheet
  await navigator.share({
    files: [new File([blob], filename, { type: mimeType })],
    title: 'Wealth Export',
    text: `Your ${dataType} export`
  })
} else {
  // Standard download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

**Testing Checklist:**
- [ ] iOS Safari: Share to Files app
- [ ] iOS Safari: Share to iCloud Drive
- [ ] iOS Safari: AirDrop to Mac
- [ ] Android Chrome: Share to Google Drive
- [ ] Android Chrome: Share to Gmail
- [ ] Android Chrome: Share to WhatsApp (for small CSVs)
- [ ] Desktop Chrome: Standard download
- [ ] Desktop Firefox: Standard download

**Edge Cases:**
1. **User cancels share sheet:** Catch AbortError, don't show error toast
2. **File too large for share (>100MB):** Fallback to download link
3. **Share API blocked by permissions:** Show permission request or fallback

---

### Mobile Performance Optimization

#### 1. CSV Generation Performance
**Challenge:** Generating CSV for 5k transactions in browser can freeze UI on low-end phones

**Solution:**
- Move generation to server (tRPC endpoint returns pre-generated CSV)
- Use Web Workers for client-side generation (non-blocking)
- Show loading indicator during generation

**Priority:** HIGH (affects user experience on mobile)

---

#### 2. ZIP Download on Mobile
**Challenge:** Mobile browsers struggle with large ZIP files (>50MB)

**Solutions:**
- Compress more aggressively (use gzip level 9)
- Offer "Export without ZIP" option (individual files via share sheet)
- Show file size estimate before download
- Warn if file size >20MB on mobile

---

#### 3. Offline Support (Progressive Enhancement)
**Challenge:** User starts export → Goes offline → Download fails

**Current:** No offline support

**Post-MVP Enhancement:**
- Use Service Worker to cache export data
- Allow re-download from cache when back online
- Show "Export saved for offline access" message

**Priority:** LOW (nice-to-have, not MVP)

---

## Data Flow Patterns & State Management

### Client State Architecture

#### Page-Level State (React useState)
**Used for:**
- Export format selection (csv | json | xlsx)
- Export job status (idle | loading | success | error)
- Progress percentage (0-100)
- Date range filters (inherited from page context)

**Example:**
```typescript
const [exportState, setExportState] = useState({
  format: 'csv' as const,
  status: 'idle' as const,
  progress: 0,
  error: null as string | null
})
```

---

#### Server State (React Query via tRPC)
**Used for:**
- Export data fetching (`trpc.users.exportQuick.useMutation()`)
- Export history (`trpc.users.exportHistory.useQuery()`)
- Job status polling (`trpc.exports.getJobStatus.useQuery()`)

**Pattern:**
```typescript
const exportMutation = trpc.users.exportQuick.useMutation({
  onMutate: () => {
    setExportState(prev => ({ ...prev, status: 'loading' }))
  },
  onSuccess: (data) => {
    handleDownloadOrShare(data.blob, data.filename)
    setExportState(prev => ({ ...prev, status: 'success' }))
    toast.success(`Downloaded ${data.recordCount} ${dataType}`)
  },
  onError: (error) => {
    setExportState(prev => ({ ...prev, status: 'error', error: error.message }))
    toast.error('Export failed', { description: error.message })
  }
})
```

---

#### Global State (NOT NEEDED)
**Why:** Export functionality is page-scoped, no cross-page state sharing required

**Exception:** Export history count badge (show "3 exports ready" in sidebar)
- Can use React Query cache sharing: `trpc.users.exportHistory.useQuery()` called from multiple components
- React Query automatically deduplicates and caches

---

### Form State Management

#### Export Options Form
**Fields:**
- Data type (transactions | budgets | goals | etc.)
- Format (csv | json | xlsx)
- Date range (start | end) - for time-series data
- Include inactive (boolean) - for complete exports

**Validation:**
- Client-side: Zod schema (matches tRPC input schema)
- Server-side: tRPC input validation (automatic)

**Library:** React Hook Form + Zod (already used in project)

**Implementation:**
```typescript
const formSchema = z.object({
  dataType: z.enum(['transactions', 'budgets', 'goals', 'accounts', 'recurring', 'categories']),
  format: z.enum(['csv', 'json', 'xlsx']),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional(),
  includeInactive: z.boolean().default(false)
})

const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    dataType: 'transactions',
    format: 'csv',
    includeInactive: false
  }
})
```

---

## Integration with Existing Systems

### 1. Export Utilities (Existing)
**Current Files:**
- `src/lib/csvExport.ts` - CSV generators for transactions, budgets, goals, accounts
- `src/lib/jsonExport.ts` - Complete JSON export

**Integration Required:**
- Add Excel export utility: `src/lib/xlsxExport.ts` (NEW)
- Add recurring transactions export to CSV utility
- Add categories export (missing)
- Enhance JSON export with AI context metadata

**Changes Needed:**
```typescript
// New file: src/lib/xlsxExport.ts
import * as XLSX from 'xlsx' // Already installed!

export function generateTransactionExcel(transactions: Transaction[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map(t => ({
      Date: format(t.date, 'yyyy-MM-dd'),
      Payee: t.payee,
      Category: t.category.name,
      Account: t.account.name,
      Amount: t.amount.toNumber(),
      Tags: t.tags.join(', '),
      Notes: t.notes || ''
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
```

**Complexity:** LOW (xlsx library already installed, just need wrapper functions)

---

### 2. tRPC Routers (Existing)
**Current Routers:**
- `users.router.ts` - Has `exportAllData` endpoint (returns JSON)
- `transactions.router.ts` - List/CRUD operations
- `budgets.router.ts` - Budget operations
- `goals.router.ts` - Goal operations

**New Endpoints Needed:**
- `users.exportQuick` - Single data type export with format choice
- `users.exportComplete` - Complete ZIP package
- `users.exportHistory` - List past exports
- `users.downloadCached` - Re-download cached export
- `exports.createJob` - Create async export job (NEW router)
- `exports.getJobStatus` - Poll job status
- `exports.cancelJob` - Cancel in-progress job

**Integration Pattern:**
```typescript
// Extend users.router.ts
exportQuick: protectedProcedure
  .input(exportQuickSchema)
  .mutation(async ({ ctx, input }) => {
    // Reuse existing query logic
    const data = await fetchDataByType(ctx, input.dataType, input.filters)

    // Generate file in requested format
    let buffer: Buffer
    let mimeType: string

    switch (input.format) {
      case 'csv':
        buffer = generateCSV(input.dataType, data)
        mimeType = 'text/csv'
        break
      case 'json':
        buffer = Buffer.from(JSON.stringify(data, null, 2))
        mimeType = 'application/json'
        break
      case 'xlsx':
        buffer = generateExcel(input.dataType, data)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
    }

    return {
      data: buffer.toString('base64'), // Return as base64 for tRPC
      filename: generateFilename(input.dataType, input.format, input.filters),
      mimeType,
      recordCount: data.length
    }
  })
```

**Complexity:** MEDIUM (extends existing patterns, needs careful testing)

---

### 3. Database Schema (Prisma)
**Current Models:**
- User, Transaction, Budget, Goal, Account, RecurringTransaction, Category

**New Model Needed:**
```prisma
model ExportHistory {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  exportType   ExportType // 'quick' | 'complete'
  dataType     String?    // For quick exports: 'transactions', 'budgets', etc.
  format       String     // 'csv' | 'json' | 'xlsx' | 'zip'

  // Filters used (stored as JSON for flexibility)
  filters      Json?

  // File metadata
  fileSize     Int        // Bytes
  recordCount  Int?       // Number of records exported
  storageKey   String?    // Vercel Blob or S3 key

  // Status tracking
  status       ExportStatus // 'generating' | 'ready' | 'failed' | 'expired'

  createdAt    DateTime @default(now())
  expiresAt    DateTime // Auto-delete after 30 days

  @@index([userId, createdAt])
  @@index([userId, status])
  @@index([expiresAt]) // For cleanup cron job
}

enum ExportType {
  QUICK
  COMPLETE
}

enum ExportStatus {
  GENERATING
  READY
  FAILED
  EXPIRED
}
```

**Migration Required:** Yes

**Complexity:** MEDIUM (new model, indexes, migration)

---

### 4. Cron Jobs (Vercel Cron or similar)
**Current Cron Jobs:**
- Generate recurring transactions (daily)

**New Cron Job Needed:**
```typescript
// src/app/api/cron/cleanup-exports/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Find expired exports
  const expiredExports = await prisma.exportHistory.findMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { not: 'EXPIRED' }
    }
  })

  // Delete from storage and update status
  for (const exp of expiredExports) {
    if (exp.storageKey) {
      await deleteFromStorage(exp.storageKey)
    }
    await prisma.exportHistory.update({
      where: { id: exp.id },
      data: { status: 'EXPIRED', storageKey: null }
    })
  }

  return Response.json({ cleaned: expiredExports.length })
}
```

**Vercel Cron Config:**
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-exports",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Complexity:** LOW (follows existing pattern)

---

## Recommendations for Master Plan

### 1. **Split into Multi-Iteration Approach (STRONGLY RECOMMENDED)**

**Rationale:**
- 7 must-have features with 45+ acceptance criteria is too large for single iteration
- Critical bug fix (Analytics export) should be isolated and validated before building new features
- Export Center page is entirely new - deserves dedicated focus
- Context exports across 6 pages require careful integration - high risk of regressions

**Suggested Breakdown:**

**Iteration 1: Bug Fix + Foundation (6-8 hours)**
- Fix Analytics page date range bug (CRITICAL)
- Add mobile share API support to existing Analytics export
- Create Excel export utility (`xlsxExport.ts`)
- Add format selector to Analytics page
- Success criteria: Analytics export works reliably on desktop AND mobile

**Iteration 2: Export Center Hub (8-10 hours)**
- Replace Settings > Data placeholder with full Export Center UI
- Implement Quick Exports (all 6 data types)
- Implement Complete Export (ZIP package) with ai-context.json
- Add ExportHistory model and caching infrastructure
- Success criteria: Users can export all data from centralized hub

**Iteration 3: Context Exports (6-8 hours)**
- Add export buttons to Transactions, Budgets, Goals, Accounts, Recurring pages
- Ensure filter state propagates correctly
- Add export count previews
- Responsive design across all pages
- Success criteria: Export works from any page, respects context

**Iteration 4: Polish + Performance (4-6 hours)**
- Async job queue for large exports
- Progress indicators with polling/SSE
- Export history re-download
- Comprehensive error handling
- Accessibility testing and fixes

---

### 2. **Prioritize Mobile UX from Iteration 1**

**Why:**
- Vision explicitly calls out "mobile-first" and "native share sheets"
- Mobile users likely to export for on-the-go AI analysis
- Share API integration is straightforward but requires testing on actual devices

**Recommendation:**
- Include mobile share API in Iteration 1 (alongside bug fix)
- Test on real iOS/Android devices, not just emulators
- Budget 2-3 hours for mobile testing and edge cases

---

### 3. **De-Risk Date/Timezone Bug Early**

**Why:**
- Current bug blocks Analytics export (user-facing issue)
- Root cause unclear (timezone? date format? Prisma query?)
- Could affect all new export features if not fixed properly

**Recommendation:**
- Allocate 3-4 hours in Iteration 1 for investigation and fix
- Write test cases for different timezones (UTC, EST, PST, JST)
- Document solution for future reference

---

### 4. **Defer Async Jobs to Later Iteration**

**Why:**
- Most users have <10k transactions (per vision assumptions)
- Inline generation works fine for typical datasets
- Async jobs add significant complexity (job queue, polling, storage)

**Recommendation:**
- Iteration 1-2: Inline generation only (fails gracefully if >10k records)
- Iteration 3-4: Add async jobs if needed based on user feedback
- Set hard limit (10k records) and show clear error if exceeded

---

### 5. **Start with Vercel Blob Storage (Not S3)**

**Why:**
- Vercel Blob is simpler (no AWS setup)
- Free tier: 1GB storage, sufficient for MVP
- Easy to migrate to S3 later if needed

**Recommendation:**
- Use Vercel Blob for cached exports in Iteration 2
- Monitor usage and costs
- Upgrade to S3 only if Vercel Blob becomes limiting

---

### 6. **AI Context Metadata is Critical (Don't Skip)**

**Why:**
- Vision's core value prop is "AI-ready exports"
- ai-context.json and README.md differentiate from basic CSV exports
- Enables users to paste data directly into ChatGPT/Claude without explanation

**Recommendation:**
- Include ai-context.json generation in Iteration 2 (Complete Export)
- Test with actual AI tools (ChatGPT, Claude) to validate format
- Include prompt templates in README.md for common analyses

---

### 7. **Test Accessibility Early and Often**

**Why:**
- Export buttons appear on every major page (6+ locations)
- Screen reader users need consistent, clear labels
- Keyboard navigation critical for power users

**Recommendation:**
- Include accessibility checklist in each iteration's acceptance criteria
- Test with VoiceOver (Mac/iOS) during development, not just at end
- Ensure all export buttons have descriptive aria-labels

---

## Risk Assessment Summary

### High Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Date range bug persists in new features | All exports broken | Fix in Iteration 1, write tests, validate thoroughly |
| Mobile share API incompatibility | Mobile users can't export | Test on real devices early, have download fallback |
| Large dataset performance issues | Export timeouts, bad UX | Set hard limits, show warnings, defer async jobs |
| Storage costs exceed budget | Vercel Blob quota overrun | Monitor usage, add 30-day expiration, cleanup cron |

### Medium Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Context export filter propagation | Exports don't respect page filters | Careful state management, integration tests |
| ZIP generation blocks server | Slow exports, potential timeouts | Use streaming, test with large datasets |
| Export history grows unbounded | Database bloat | 30-day expiration, automatic cleanup |
| Excel file format issues | Files don't open in Excel | Test with real Excel/Google Sheets, use UTF-8 BOM |

### Low Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cross-browser compatibility | Minor UX differences | Test in Chrome, Firefox, Safari, Edge |
| Session expiration during export | User has to re-export | Session refresh handled by Supabase |
| Filename special characters | Download issues on some OSes | Sanitize filenames, use safe characters only |

---

## Notes & Observations

### Technical Debt Identified

1. **Analytics Export Bug:** This is not new tech debt from this vision - it's existing debt that must be fixed. Prioritize in Iteration 1.

2. **CSV Generation in Browser:** Current implementation generates CSV client-side. For consistency and performance, should move to server-side in new features.

3. **No Rate Limiting:** Export endpoints currently have no rate limiting. Add in Iteration 2 to prevent abuse.

4. **Hard-Coded Limits:** Transaction list query has `limit: 1000` hardcoded. Should be configurable based on export type.

### Opportunities for Reuse

1. **Existing Export Utilities:** `csvExport.ts` and `jsonExport.ts` are well-structured. Can extend these rather than rewrite.

2. **tRPC Patterns:** Project already uses tRPC extensively. New export endpoints follow established patterns.

3. **UI Components:** Button, Dialog, Card components from shadcn/ui are accessible and well-tested. Reuse for Export Center.

4. **Date Handling:** Project uses `date-fns` for date formatting. Use consistently across all export features.

### Integration Challenges

1. **Filter State Propagation:** Each page (Transactions, Budgets, etc.) has different filter patterns. Need unified export state management pattern.

2. **Mobile Share API:** Not supported on all browsers. Need robust feature detection and fallback.

3. **Timezone Consistency:** Critical for date filtering. Must document timezone handling strategy and test thoroughly.

4. **File Format Edge Cases:** Excel has row limits, ZIP files may be blocked by some mobile browsers. Need graceful degradation.

---

## Success Metrics Validation

**From Vision:**
1. **Adoption:** 30% of users export monthly
2. **Speed:** <5s for quick exports, <15s for complete package
3. **Quality:** <2% support tickets
4. **AI Usage:** 10+ users share AI analysis feedback
5. **Mobile Parity:** Mobile completion >80% of desktop

**UX/Integration-Specific Metrics to Add:**
- **Context Export Usage:** % of exports from context (pages) vs hub (Settings)
- **Format Preference:** Distribution of CSV vs JSON vs Excel exports
- **Mobile Share Success Rate:** % of mobile users who successfully share (vs cancel)
- **Error Rate by Integration Point:** Which pages have most export failures?
- **Filter Accuracy:** % of exports that match user's intended filter scope

**Recommendation:** Add event tracking to each export button to measure these metrics.

---

*Exploration completed: 2025-11-09*
*This report focuses on user experience flows, frontend/backend integration complexity, and cross-platform data handling*
