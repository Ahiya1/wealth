# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 2 builds a unified Export Center UI to replace the "coming soon" placeholder in Settings > Data & Export. The architecture leverages **100% complete** backend infrastructure from Iteration 1 (tRPC exports router, CSV/Excel/JSON generators, ExportHistory model, AI context/README generators). The UI implementation is **MEDIUM complexity** with clear component boundaries: Quick Exports section (6 data type cards with format selectors), Complete Export section (ZIP package generator), and Export History section (table with re-download). Vercel Blob Storage integration requires minimal setup (1 env var, @vercel/blob package already compatible with Next.js 14 + tRPC architecture).

## Discoveries

### Backend Infrastructure (Iteration 1 - Complete)

**tRPC Exports Router (`src/server/api/routers/exports.router.ts`)**
- 6 individual export procedures: exportTransactions, exportBudgets, exportGoals, exportAccounts, exportRecurringTransactions, exportCategories
- Format support: CSV, JSON, EXCEL (validated via z.enum)
- Base64 encoding for binary transport (handles both string and Buffer types)
- Returns: `{ content: base64, filename, mimeType, recordCount, fileSize }`
- Already integrated in `src/server/api/root.ts` as `exports: exportsRouter`

**Export Utility Libraries (All Complete)**
- `csvExport.ts`: 6 generators with UTF-8 BOM, proper Decimal handling, human-readable frequency formatting
- `xlsxExport.ts`: 6 Excel generators using `xlsx` library (v0.18.5 installed), returns Buffer
- `archiveExport.ts`: ZIP creation with `archiver` (v7.0.1 installed), organized folder structure
- `aiContextGenerator.ts`: AI-friendly JSON with field descriptions, category hierarchy, 5 pre-written prompts
- `readmeGenerator.ts`: Markdown guide with usage instructions, AI analysis steps, data dictionary

**Database Schema (ExportHistory Model - Ready)**
```prisma
model ExportHistory {
  id          String   @id @default(cuid())
  userId      String
  exportType  ExportType       // QUICK | COMPLETE
  format      ExportFormat     // CSV | JSON | EXCEL | ZIP
  dataType    ExportDataType?  // null for COMPLETE exports
  dateRange   Json?            // { from: ISO, to: ISO }
  recordCount Int
  fileSize    Int              // bytes
  blobKey     String?          // Vercel Blob storage key
  createdAt   DateTime
  expiresAt   DateTime         // createdAt + 30 days
  
  user User @relation(...)
  @@index([userId, createdAt, expiresAt])
}
```

**Enums Defined:**
- ExportType: QUICK, COMPLETE
- ExportFormat: CSV, JSON, EXCEL, ZIP
- ExportDataType: TRANSACTIONS, RECURRING_TRANSACTIONS, BUDGETS, GOALS, ACCOUNTS, CATEGORIES

### Current Settings Page Structure

**Existing Page (`src/app/(dashboard)/settings/data/page.tsx`)**
- Current state: Placeholder with "coming soon" message
- Structure: PageTransition wrapper, Breadcrumb, 2 Card sections (Export Data, Data Management)
- Design pattern: Card with CardHeader/CardTitle/CardDescription/CardContent
- Styling: Warm color palette (warm-gray-900 text, sage-300 borders, rounded-lg)
- Layout: Vertical stacking with `space-y-6` container

**Settings Navigation Pattern (`src/app/(dashboard)/settings/page.tsx`)**
- Grid layout: `grid-cols-1 md:grid-cols-2 gap-4`
- Card design: Border, icon in sage-50 background, ChevronRight indicator
- Links: Database, Categories, Appearance sections
- Consistent typography: `font-serif font-bold` for titles

### UI Component Inventory

**Available Primitives:**
- Card (border, shadow-soft, dark mode support)
- Button (variants: default, outline, ghost; sizes: sm, default, lg)
- Select (Radix UI with ChevronDown icon, mobile-friendly viewport)
- Progress (Radix UI with transform-based width animation)
- Toast (Sonner library, `toast.success()` / `toast.error()` API)
- Breadcrumb (page navigation)
- PageTransition (Framer Motion wrapper)

**Design System Patterns:**
- Colors: warm-gray (text/backgrounds), sage (accents/hover states)
- Typography: font-serif for headings, leading-relaxed for descriptions
- Spacing: space-y-6 for sections, p-4 sm:p-6 for card padding
- Icons: Lucide React (Download, Trash2, ChevronRight, etc.)

### Analytics Page Export Pattern (Reference Implementation)

**Export Button Implementation (`src/app/(dashboard)/analytics/page.tsx:93-108`)**
```typescript
const handleExportCSV = () => {
  if (!transactions?.transactions || transactions.transactions.length === 0) {
    toast.error('No data to export', {
      description: 'There are no transactions in the selected date range.',
    })
    return
  }

  const csvContent = generateTransactionCSV(transactions.transactions)
  const filename = `transactions-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`
  downloadCSV(csvContent, filename)

  toast.success('Export successful', {
    description: `Downloaded ${transactions.transactions.length} transactions`,
  })
}
```

**Pattern Analysis:**
- Pre-flight validation: Check data exists before export
- User feedback: Toast for success/error states with record counts
- Filename convention: `{type}-{startDate}-to-{endDate}.{ext}`
- Direct download: Uses `downloadCSV()` helper (creates blob, triggers download)

### Vercel Blob Storage Requirements

**Package Compatibility:**
- Need: `@vercel/blob` package (not currently installed)
- Compatible with: Next.js 14, tRPC, server-side mutations
- Installation: `npm install @vercel/blob`

**Environment Configuration:**
- Variable needed: `BLOB_READ_WRITE_TOKEN` (from Vercel dashboard)
- Token type: Server-only (not exposed to client)
- Free tier: 1GB storage, sufficient for 30-day export history

**Integration Points:**
- Upload: After ZIP/file generation in tRPC mutation
- Download: Fetch blob URL by blobKey in redownloadExport procedure
- Cleanup: Cron job to delete expired blobs (requires Vercel Cron setup)

## Patterns Identified

### Pattern 1: Export Card Component

**Description:** Reusable card for individual data type exports with format selector and download button

**Structure:**
```typescript
interface ExportCardProps {
  title: string           // "Transactions"
  description: string     // "Export all your transactions"
  icon: LucideIcon        // Receipt icon
  recordCount: number     // 1,247 transactions
  dataType: ExportDataType
  onExport: (format: ExportFormat) => void
  isLoading: boolean
}
```

**Component Layout:**
```
┌─────────────────────────────────────┐
│ [Icon] Transactions                 │
│        Export all your transactions │
│        1,247 records                │
│                                     │
│ Format: [CSV ▼] [Export Button]    │
└─────────────────────────────────────┘
```

**Use Case:** Quick Exports section (6 cards: Transactions, Budgets, Goals, Accounts, Recurring, Categories)

**Recommendation:** Build as `src/components/exports/ExportCard.tsx` with local state for format selection

### Pattern 2: Export History Table

**Description:** Display past exports with metadata and re-download action

**Data Structure:**
```typescript
interface ExportHistoryRow {
  id: string
  exportType: 'Quick' | 'Complete'
  format: 'CSV' | 'JSON' | 'EXCEL' | 'ZIP'
  dataType?: string      // "Transactions" or null for Complete
  recordCount: number
  fileSize: number       // Display as KB/MB
  createdAt: Date
  expiresAt: Date
  blobKey: string | null // null = expired/not cached
}
```

**Table Layout:**
```
┌──────────┬────────┬─────────┬────────┬──────────┬──────────┐
│ Type     │ Format │ Records │ Size   │ Date     │ Actions  │
├──────────┼────────┼─────────┼────────┼──────────┼──────────┤
│ Complete │ ZIP    │ 1,247   │ 2.4 MB │ Nov 9    │ [Reload] │
│ Quick    │ CSV    │ 247     │ 45 KB  │ Nov 8    │ [Reload] │
└──────────┴────────┴─────────┴────────┴──────────┴──────────┘
```

**Use Case:** Export History section with last 10 exports

**Recommendation:** Build as `src/components/exports/ExportHistoryTable.tsx` with tRPC query for history

### Pattern 3: Complete Export Progress

**Description:** Multi-step progress indicator for ZIP package generation

**Steps:**
1. Fetching data (6 data types in parallel)
2. Generating files (CSV + README + ai-context.json)
3. Creating archive (ZIP compression)
4. Uploading to cache (Vercel Blob)
5. Download ready

**Progress Display:**
```
Preparing your complete export...
[████████░░] 80% - Creating archive
```

**Use Case:** Complete Export section during ZIP generation

**Recommendation:** Use Radix Progress component with step-based percentage calculation

### Pattern 4: Format Selector Dropdown

**Description:** Compact dropdown for CSV/JSON/Excel selection

**Component:**
```typescript
<Select value={format} onValueChange={setFormat}>
  <SelectTrigger className="w-[120px]">
    <SelectValue placeholder="Format" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="CSV">CSV</SelectItem>
    <SelectItem value="JSON">JSON</SelectItem>
    <SelectItem value="EXCEL">Excel</SelectItem>
  </SelectContent>
</Select>
```

**Use Case:** All export cards and context export buttons

**Recommendation:** Extract as `src/components/exports/FormatSelector.tsx` for consistency

## Complexity Assessment

### High Complexity Areas

**Complete Export ZIP Generation (MEDIUM-HIGH)**
- **Why complex:** Multi-step process (6 data fetches → file generation → ZIP → Blob upload)
- **Challenge:** Progress tracking across async steps
- **Estimated splits:** 0 (can be handled in single component with useState for progress)
- **Recommendation:** 
  - Use `Promise.all()` for parallel data fetching
  - Track progress with step counter (0-100%)
  - Handle errors gracefully (fallback to individual downloads if ZIP fails)

**Vercel Blob Storage Integration (MEDIUM)**
- **Why complex:** New dependency, token configuration, upload/download logic
- **Challenge:** Testing locally without Vercel environment
- **Estimated splits:** 0 (utility functions in `src/lib/blobStorage.ts`)
- **Recommendation:**
  - Create blob storage abstraction with local filesystem fallback for dev
  - Environment check: Use blob only if `BLOB_READ_WRITE_TOKEN` exists
  - Document setup in iteration plan

### Medium Complexity Areas

**Export History Re-Download (MEDIUM)**
- **Complexity:** Cache hit/miss logic, expired export handling
- **Implementation:**
  - tRPC query: `getExportHistory` (last 10 records)
  - tRPC mutation: `redownloadExport(id)` with blob fetch or regeneration
  - UI: Show "Expired" badge if blobKey is null or expiresAt passed

**Date Range Picker for Transactions/Budgets (MEDIUM)**
- **Complexity:** Optional date filtering for time-series data
- **Implementation:**
  - Reuse existing Calendar component (Radix UI)
  - Default: All time (no date filter)
  - UI: Optional popover with start/end date selection

### Low Complexity Areas

**Quick Exports Section (LOW)**
- **Reason:** Direct mapping of 6 tRPC endpoints to 6 ExportCard components
- **Implementation:** Grid layout, map over data types array, handle loading states

**Export Success/Error Feedback (LOW)**
- **Reason:** Existing toast pattern from Analytics page
- **Implementation:** `toast.success()` with record count, `toast.error()` with retry suggestion

**Settings Page Layout Replacement (LOW)**
- **Reason:** Drop-in replacement of placeholder Card with 3 new sections
- **Implementation:** Remove "coming soon" content, add Quick/Complete/History sections

## Technology Recommendations

### Primary Stack (Already Established)

**Frontend Framework: Next.js 14 (App Router)**
- Rationale: Already in use, server components for tRPC integration
- Version: 14.2.33 (stable)

**State Management: React useState + tRPC**
- Rationale: Simple local state for format selection, tRPC for server state
- No Redux/Zustand needed (low state complexity)

**UI Components: Radix UI + Tailwind CSS**
- Rationale: Existing component library, accessible, mobile-friendly
- Pattern: Warm color palette (warm-gray, sage) for consistency

**Type Safety: TypeScript + Zod**
- Rationale: tRPC input validation, type-safe API calls
- Enums: Use Prisma enums (ExportType, ExportFormat, ExportDataType)

### Supporting Libraries

**@vercel/blob (NEW - Required)**
- Purpose: Blob storage for export caching
- Why needed: 30-day export history with instant re-download
- Installation: `npm install @vercel/blob`
- Usage:
  ```typescript
  import { put, del } from '@vercel/blob';
  
  // Upload
  const blob = await put(filename, buffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  // Returns: { url, downloadUrl, pathname }
  
  // Delete
  await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  ```

**Sonner (Already Installed)**
- Purpose: Toast notifications for export feedback
- Version: 2.0.7
- Usage: `toast.success('Downloaded 247 transactions')`

**date-fns (Already Installed)**
- Purpose: Filename timestamp formatting
- Version: 3.6.0
- Usage: `format(new Date(), 'yyyy-MM-dd')`

**Lucide React (Already Installed)**
- Purpose: Icons (Download, FileText, Archive, Clock, etc.)
- Version: 0.460.0

## Integration Points

### tRPC Endpoints (Iteration 1 - Complete)

**Individual Exports:**
```typescript
// exports.exportTransactions({ format: 'CSV', startDate?, endDate? })
// Returns: { content: base64, filename, mimeType, recordCount, fileSize }
```

**New Endpoints Needed (Iteration 2):**
```typescript
// Export history management
exports.getExportHistory()
  // Returns: ExportHistory[] (last 10)

exports.redownloadExport({ id: string })
  // Returns: { url: string } | regenerates if expired

exports.exportComplete({ includeInactive?: boolean })
  // Returns: { content: base64, filename: 'wealth-complete-export-2025-11-09.zip', ... }
  // Generates: README.md, ai-context.json, summary.json, 6 CSV files → ZIP
```

### Vercel Blob Storage API

**Upload After Export:**
```typescript
// In tRPC mutation (server-side)
const blob = await put(`exports/${userId}/${exportId}.zip`, zipBuffer, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

// Save to database
await prisma.exportHistory.create({
  data: {
    userId,
    exportType: 'COMPLETE',
    format: 'ZIP',
    blobKey: blob.pathname,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    // ...
  }
});
```

**Download Cached Export:**
```typescript
// In redownloadExport mutation
const history = await prisma.exportHistory.findUnique({ where: { id } });

if (history.blobKey && history.expiresAt > new Date()) {
  // Cache hit - return blob URL
  return { url: `https://blob.vercel-storage.com/${history.blobKey}` };
} else {
  // Cache miss - regenerate export
  // ... call appropriate export function
}
```

### Component Data Flow

**Quick Export Flow:**
```
ExportCard (format selection)
  ↓
Button onClick → tRPC.exports.exportTransactions.mutate()
  ↓
Server: Fetch data → Generate CSV/JSON/Excel → Base64 encode
  ↓
Client: Decode base64 → Create Blob → Trigger download
  ↓
Toast: "Downloaded 247 transactions"
  ↓
(Optional) Save to ExportHistory for tracking
```

**Complete Export Flow:**
```
CompleteExportSection
  ↓
Button onClick → tRPC.exports.exportComplete.mutate()
  ↓
Server: 
  1. Fetch all 6 data types (parallel)
  2. Generate CSV files
  3. Generate README.md + ai-context.json + summary.json
  4. Create ZIP archive
  5. Upload to Vercel Blob
  6. Save ExportHistory record
  ↓
Client: Download ZIP from blob URL
  ↓
Toast: "Complete export ready (2.4 MB)"
```

## Risks & Challenges

### Technical Risks

**Risk 1: Vercel Blob Storage Local Development**
- **Impact:** Cannot test blob upload/download in local environment
- **Mitigation:** 
  - Create abstraction layer: `src/lib/blobStorage.ts` with env-based fallback
  - Local fallback: Use filesystem storage in `/tmp` for dev
  - Document: Clear setup instructions for Vercel Blob token in .env.example
  - Testing: Deploy to Vercel preview environment for blob integration tests

**Risk 2: Large Export Performance (10k+ transactions)**
- **Impact:** ZIP generation >10s may timeout, poor UX
- **Mitigation:**
  - Limit: Max 10,000 records per export (enforced in tRPC query)
  - Progress: Real-time progress bar with step updates
  - Async: Consider background job for exports >5MB (defer to post-MVP)
  - User feedback: Warn before generation if dataset is large

**Risk 3: Mobile Download UX (ZIP files)**
- **Impact:** iOS/Android may not handle ZIP downloads gracefully
- **Mitigation:**
  - Defer to Iteration 3: Web Share API for mobile-native flow
  - Iteration 2: Standard download link (works but not optimal)
  - Documentation: README.md includes mobile extraction instructions

### Complexity Risks

**Risk 1: Export History Table Edge Cases**
- **Scenarios:** Expired exports, failed blob fetch, deleted blobs
- **Mitigation:**
  - UI states: Show "Expired" badge, disable "Download Again" button
  - Fallback: "Generate Fresh" button always available
  - Error handling: If blob fetch fails, automatically regenerate

**Risk 2: Progress Tracking Accuracy**
- **Challenge:** Multi-step async operations make progress estimation difficult
- **Mitigation:**
  - Fixed steps: 5 steps with 20% per step (simple but predictable)
  - Avoid: Time-based estimation (inaccurate with variable data sizes)
  - UX: Show current step label ("Creating archive...") alongside %

## Recommendations for Planner

### 1. Component Architecture (Clear Boundaries)

**Recommended Structure:**
```
src/components/exports/
  ├── ExportCard.tsx              (Reusable quick export card)
  ├── FormatSelector.tsx          (CSV/JSON/Excel dropdown)
  ├── CompleteExportSection.tsx   (ZIP package generator with progress)
  ├── ExportHistoryTable.tsx      (Past exports list with re-download)
  └── ExportProgressBar.tsx       (Progress indicator with steps)

src/lib/
  ├── blobStorage.ts              (Vercel Blob abstraction with local fallback)
  └── exportHelpers.ts            (File size formatting, filename generation)

src/app/(dashboard)/settings/data/
  └── page.tsx                    (Main Export Center page - orchestrates 3 sections)
```

**Rationale:** Modular components enable reuse in Iteration 3 (context exports) and simplify testing

### 2. tRPC Endpoint Strategy (Extend Iteration 1 Router)

**Add to `src/server/api/routers/exports.router.ts`:**
```typescript
export const exportsRouter = router({
  // Iteration 1 (existing)
  exportTransactions: ...
  exportBudgets: ...
  // ... 4 more individual exports

  // Iteration 2 (new)
  exportComplete: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => { /* ZIP generation */ }),

  getExportHistory: protectedProcedure
    .query(async ({ ctx }) => { /* Last 10 exports */ }),

  redownloadExport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { /* Blob fetch or regenerate */ }),
});
```

**Rationale:** Keep all export logic in one router for maintainability

### 3. Vercel Blob Storage Setup (Environment Configuration)

**Required Steps:**
1. Install package: `npm install @vercel/blob`
2. Add to `.env.example`:
   ```
   # Vercel Blob Storage (for export caching)
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXX
   ```
3. Create abstraction layer with fallback:
   ```typescript
   // src/lib/blobStorage.ts
   export async function uploadBlob(filename: string, buffer: Buffer) {
     if (process.env.BLOB_READ_WRITE_TOKEN) {
       // Production: Use Vercel Blob
       return await put(filename, buffer, { ... });
     } else {
       // Development: Use filesystem
       const path = `/tmp/exports/${filename}`;
       fs.writeFileSync(path, buffer);
       return { url: path, pathname: filename };
     }
   }
   ```

**Rationale:** Enables local development without Vercel environment

### 4. Progressive Enhancement (Build in Phases)

**Phase 1: Quick Exports (Day 1-2)**
- Build ExportCard component
- Integrate 6 individual export endpoints
- Format selector + download logic
- Success/error toast feedback

**Phase 2: Complete Export (Day 2-3)**
- ZIP package generation (README + ai-context + 6 CSVs)
- Progress tracking (5 steps)
- Vercel Blob upload integration
- ExportHistory record creation

**Phase 3: Export History (Day 3-4)**
- Export history table
- Re-download logic (blob fetch)
- Expired export handling
- Cleanup cron job (defer to Iteration 3)

**Rationale:** Incremental delivery reduces risk, allows early testing of each section

### 5. Mobile Optimization (Defer to Iteration 3)

**Iteration 2 Scope:** Desktop-first download flow
- Standard blob download links
- Works on mobile but not optimal

**Iteration 3 Scope:** Mobile-native share sheet
- Web Share API integration
- iOS Files app, AirDrop support
- Android share to Drive/Gmail

**Rationale:** Iteration 2 focuses on core UI, Iteration 3 adds mobile polish

## Resource Map

### Critical Files/Directories

**Backend (Iteration 1 - Complete):**
- `/src/server/api/routers/exports.router.ts` - tRPC export endpoints
- `/src/lib/csvExport.ts` - CSV generators (6 data types)
- `/src/lib/xlsxExport.ts` - Excel generators (6 data types)
- `/src/lib/archiveExport.ts` - ZIP package creator
- `/src/lib/aiContextGenerator.ts` - AI context JSON generator
- `/src/lib/readmeGenerator.ts` - README markdown generator
- `/prisma/schema.prisma` (lines 62, 275-294) - ExportHistory model + enums

**Frontend (Iteration 2 - To Build):**
- `/src/app/(dashboard)/settings/data/page.tsx` - Main Export Center page
- `/src/components/exports/ExportCard.tsx` - Quick export card
- `/src/components/exports/FormatSelector.tsx` - Format dropdown
- `/src/components/exports/CompleteExportSection.tsx` - ZIP export section
- `/src/components/exports/ExportHistoryTable.tsx` - History table
- `/src/components/exports/ExportProgressBar.tsx` - Progress indicator
- `/src/lib/blobStorage.ts` - Vercel Blob abstraction

**Configuration:**
- `.env.example` - Add BLOB_READ_WRITE_TOKEN documentation
- `package.json` - Install @vercel/blob

### Key Dependencies

**Already Installed:**
- `archiver@7.0.1` - ZIP compression
- `xlsx@0.18.5` - Excel file generation
- `date-fns@3.6.0` - Date formatting
- `sonner@2.0.7` - Toast notifications
- `@tanstack/react-query@5.80.3` - tRPC client
- `lucide-react@0.460.0` - Icons

**To Install:**
- `@vercel/blob` - Blob storage SDK

### Testing Infrastructure

**Unit Tests (Vitest):**
- Test export utility functions (CSV/Excel/JSON generators)
- Test blob storage abstraction (mock Vercel Blob API)
- Test filename generation logic

**Integration Tests:**
- Test tRPC export endpoints with mock database
- Test complete export ZIP structure
- Test export history CRUD operations

**E2E Tests (Defer to Iteration 3):**
- Test full export flow from UI to download
- Test mobile share sheet integration
- Test cross-browser compatibility

## Questions for Planner

### Q1: Should Export History track all exports or only COMPLETE exports?

**Context:** Quick exports (individual CSV/JSON/Excel) are lightweight and regenerate instantly. COMPLETE exports (ZIP packages) are expensive to generate.

**Options:**
- **A) Track all exports** - Full audit trail, useful for analytics
- **B) Track only COMPLETE exports** - Simpler, saves database rows

**Recommendation:** Track all exports but only cache COMPLETE exports in Vercel Blob (Quick exports regenerate on-demand)

### Q2: How to handle concurrent export requests from same user?

**Scenario:** User clicks "Export Complete" twice in quick succession

**Options:**
- **A) Queue requests** - Second request waits for first to complete
- **B) Reject duplicates** - Show toast "Export already in progress"
- **C) Allow parallel** - Generate both (wasteful but simple)

**Recommendation:** Option B (reject duplicates) with loading state on button

### Q3: Should date range picker be required or optional for Quick Exports?

**Context:** Transactions and Budgets are time-series data; Goals/Accounts are point-in-time

**Options:**
- **A) Optional (default: all time)** - Simpler UX, most users want all data
- **B) Required** - Forces user to think about date range

**Recommendation:** Optional with "All time" default, show record count preview before export

### Q4: Cleanup cron job - Iteration 2 or defer to Iteration 3?

**Context:** Vercel Cron requires `vercel.json` config and `/api/cron/` endpoint

**Options:**
- **A) Iteration 2** - Complete Blob integration now
- **B) Iteration 3** - Focus Iteration 2 on UI, add cleanup later

**Recommendation:** Defer to Iteration 3 (30-day retention is forgiving, cleanup can wait)

### Q5: Local development workflow without Vercel Blob token?

**Context:** Developers may not have Vercel Blob token in local .env

**Options:**
- **A) Require token** - Block local dev without token
- **B) Filesystem fallback** - Use `/tmp` for local exports
- **C) Mock blob API** - In-memory storage for dev

**Recommendation:** Option B (filesystem fallback) with clear logging ("Using local storage, exports won't persist")

---

**Explorer 1 Status:** COMPLETE
**Next Step:** Planner synthesizes all 4 explorer reports for iteration plan
**Confidence Level:** HIGH - Backend 100% ready, UI patterns well-established, Blob integration straightforward
