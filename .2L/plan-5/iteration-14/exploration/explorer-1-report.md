# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 14 focuses on building the export engine foundation and fixing the critical Analytics date range bug. The architecture requires: (1) backend export utilities for Excel/ZIP/AI metadata, (2) new ExportHistory database model with migration, (3) tRPC export endpoints for 6 data types in 3 formats, and (4) investigation into the Analytics date range filter bug. Existing export infrastructure is solid but incomplete - CSV/JSON generators exist but lack recurring transactions and categories support. The bug likely stems from timezone handling or date serialization between client and server.

## Discoveries

### Current Export Infrastructure

**Existing Files:**
- `/src/lib/csvExport.ts` - 177 lines, generates CSV for 4 data types (transactions, budgets, goals, accounts)
- `/src/lib/jsonExport.ts` - 71 lines, generates complete JSON export with Decimal sanitization
- `/src/server/api/routers/users.router.ts` - Lines 76-123: `exportAllData` tRPC endpoint
- `/src/app/(dashboard)/analytics/page.tsx` - Lines 93-108: CSV export with date range filter
- `/src/components/transactions/ExportButton.tsx` - Reusable export component (CSV only)

**What Works:**
- CSV export for transactions, budgets, goals, accounts with UTF-8 BOM
- JSON export with Decimal-to-number conversion
- `exportAllData` endpoint fetches all user data (10k transaction limit)
- Download utilities create blob URLs and trigger browser downloads
- Excel library (`xlsx` v0.18.5) already installed in devDependencies

**What's Missing:**
- No recurring transactions export
- No categories export
- No Excel (.xlsx) format support
- No ZIP archive generation
- No AI metadata (ai-context.json, README.md)
- No export history tracking (database model doesn't exist)
- No caching or re-download capability
- Settings > Data page shows "coming soon" placeholder

### Critical Bug: Analytics Export Date Range Filter

**Location:** `/src/app/(dashboard)/analytics/page.tsx` lines 86-108

**Symptom:** Export shows "No data to export: There are no transactions in the selected date range" even when transactions exist.

**Current Implementation:**
```typescript
// Lines 58-61: Date range state initialization
const [dateRange, setDateRange] = useState({
  startDate: startOfMonth(subMonths(new Date(), 5)),
  endDate: endOfMonth(new Date()),
})

// Lines 87-91: Transactions query
const { data: transactions } = trpc.transactions.list.useQuery({
  startDate: dateRange.startDate,
  endDate: dateRange.endDate,
  limit: 1000,
})

// Lines 93-98: Export validation
const handleExportCSV = () => {
  if (!transactions?.transactions || transactions.transactions.length === 0) {
    toast.error('No data to export', {
      description: 'There are no transactions in the selected date range.',
    })
    return
  }
```

**Root Cause Analysis:**

1. **Date Object vs Date Range Issue:**
   - `dateRange.startDate` is a JavaScript Date object from `startOfMonth()`
   - `dateRange.endDate` is a JavaScript Date object from `endOfMonth()`
   - tRPC expects Date objects, Prisma receives them correctly

2. **Likely Culprits:**
   - **Timezone conversion:** `startOfMonth()`/`endOfMonth()` use local timezone, but Prisma may compare in UTC
   - **Time component:** `startOfMonth()` sets time to 00:00:00, `endOfMonth()` sets to 00:00:00 of next day, potentially missing transactions on the end date
   - **Inclusive vs exclusive range:** Prisma `gte`/`lte` operators should be inclusive, but time zone shifts could cause edge case misses

3. **Backend Date Filtering (transactions.router.ts lines 23-34):**
```typescript
where: {
  userId: ctx.user.id,
  ...((input.startDate || input.endDate) && {
    date: {
      ...(input.startDate && { gte: input.startDate }),
      ...(input.endDate && { lte: input.endDate }),
    },
  }),
}
```

**Problem:** `endOfMonth()` returns 00:00:00 of the NEXT month, which is correct for inclusive range. However, if the transaction date is stored with time component, the comparison might fail.

**Example:**
- User selects "Last 6 Months" -> endDate = `endOfMonth(new Date())` = 2025-12-01T00:00:00 (start of next month)
- Transaction date stored as `2025-11-30T15:30:00Z`
- Prisma query: `date <= 2025-12-01T00:00:00` should match, BUT timezone conversion could shift boundaries

**Fix Strategy:**
1. **Immediate fix:** Change `endOfMonth()` to return last millisecond of month: `endOfMonth(date).setHours(23, 59, 59, 999)`
2. **Alternative fix:** Use `date < startOfMonth(addMonths(endDate, 1))` instead of `date <= endOfMonth()`
3. **Root fix:** Ensure consistent timezone handling in both frontend and backend (normalize to UTC)

### Database Schema Analysis

**Current User Model:**
```prisma
model User {
  // ... existing fields
  categories            Category[]
  accounts              Account[]
  transactions          Transaction[]
  recurringTransactions RecurringTransaction[]
  budgets               Budget[]
  goals                 Goal[]
}
```

**Missing:** No `ExportHistory` model

**Required Schema Addition:**
```prisma
model ExportHistory {
  id         String   @id @default(cuid())
  userId     String
  exportType String   // 'transactions' | 'budgets' | 'goals' | 'accounts' | 'recurring' | 'categories' | 'complete'
  format     String   // 'csv' | 'json' | 'xlsx' | 'zip'
  dataType   String?  // For quick exports: which data type
  dateRange  Json?    // { startDate: string, endDate: string } for filtered exports
  fileSize   Int      // bytes
  blobKey    String   // Vercel Blob storage key
  createdAt  DateTime @default(now())
  expiresAt  DateTime // createdAt + 30 days

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([expiresAt])
}
```

**Migration Command:** `npx prisma migrate dev --name add-export-history`

**User Model Update Required:**
```prisma
model User {
  // ... existing fields
  exportHistory ExportHistory[]
}
```

### Technology Stack Assessment

**Dependencies Already Installed:**
- `xlsx` (v0.18.5) - Excel file generation ✅
- `date-fns` (v3.6.0) - Date manipulation ✅
- `@trpc/server` (v11.6.0) - API layer ✅
- Prisma (v5.22.0) - Database ORM ✅

**Dependencies to Add:**
- `archiver` (or `jszip`) - ZIP file generation
- `@types/archiver` - TypeScript definitions
- `@vercel/blob` - Vercel Blob Storage SDK (deferred to Iteration 2)

**Installation Command:**
```bash
npm install archiver
npm install -D @types/archiver
```

**Alternative (jszip):**
```bash
npm install jszip
npm install -D @types/jszip
```

**Recommendation:** Use `archiver` for Node.js server-side ZIP generation (streaming support, better for large files). Use `jszip` only if client-side ZIP generation is needed (not in scope for Iteration 14).

## Patterns Identified

### Pattern 1: Modular Export Utilities

**Description:** Each export format has its own utility file with generator functions

**Current Structure:**
```
src/lib/
├── csvExport.ts       (4 data types)
├── jsonExport.ts      (complete export)
└── [missing] xlsxExport.ts
└── [missing] aiContextGenerator.ts
└── [missing] archiveExport.ts
```

**Use Case:** Separation of concerns - each utility handles format-specific logic

**Example Pattern:**
```typescript
// src/lib/xlsxExport.ts
import * as XLSX from 'xlsx'

export function generateTransactionXLSX(transactions: Transaction[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(transactions.map(txn => ({
    Date: format(txn.date, 'yyyy-MM-dd'),
    Payee: txn.payee,
    Category: txn.category.name,
    Account: txn.account.name,
    Amount: txn.amount.toString(),
    Tags: txn.tags.join(', '),
    Notes: txn.notes || '',
  })))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
```

**Recommendation:** Continue this pattern. Create xlsxExport.ts following the same structure as csvExport.ts with functions for each data type.

### Pattern 2: tRPC Router Organization

**Current Structure:**
```
src/server/api/
├── root.ts                      (router registry)
└── routers/
    ├── users.router.ts          (exportAllData endpoint)
    ├── transactions.router.ts   (CRUD + list with filters)
    ├── budgets.router.ts        (CRUD)
    ├── goals.router.ts          (CRUD)
    ├── accounts.router.ts       (CRUD)
    ├── recurring.router.ts      (CRUD)
    └── categories.router.ts     (CRUD)
```

**Use Case:** Each data domain has its own router with CRUD operations

**Recommendation:** Create new `exports.router.ts` for export-specific endpoints, or extend existing routers (transactions, budgets, etc.) with export procedures.

**Option A: Centralized Exports Router (RECOMMENDED)**
```typescript
// src/server/api/routers/exports.router.ts
export const exportsRouter = router({
  exportTransactions: protectedProcedure
    .input(z.object({
      format: z.enum(['csv', 'json', 'xlsx']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  exportBudgets: protectedProcedure
    .input(z.object({ format: z.enum(['csv', 'json', 'xlsx']) }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  // ... other export endpoints
})
```

**Option B: Decentralized (extend existing routers)**
```typescript
// Add to transactions.router.ts
export: protectedProcedure
  .input(z.object({
    format: z.enum(['csv', 'json', 'xlsx']),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ ctx, input }) => { /* ... */ }),
```

**Decision Rationale:** Option A (centralized) is better for Iteration 14 because:
- All export logic in one place for easier maintenance
- Shared export history creation logic
- Consistent format handling across data types
- Future complete export package can orchestrate all exports

### Pattern 3: Data Transformation Pipeline

**Current Pattern (csvExport.ts):**
```typescript
interface Transaction { /* Prisma model */ }
↓
generateTransactionCSV(transactions: Transaction[]): string
↓
CSV string with UTF-8 BOM
↓
downloadCSV(csvContent: string, filename: string)
↓
Browser download
```

**Recommendation:** Extend this pattern for Excel and ZIP exports

**Excel Pipeline:**
```typescript
Transaction[] → generateTransactionXLSX() → Buffer → downloadXLSX()
```

**ZIP Pipeline:**
```typescript
{
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  // ...
}
↓
generateCompleteExportZIP()
  ├─ generateTransactionCSV()
  ├─ generateBudgetCSV()
  ├─ generateREADME()
  ├─ generateAIContext()
  └─ archiver.zip()
↓
Buffer (ZIP file)
↓
downloadZIP() or uploadToVercelBlob()
```

## Complexity Assessment

### High Complexity Areas

#### 1. Complete Export Package (ZIP with AI Metadata)
**Why complex:**
- Orchestrates 6+ data type exports (transactions, budgets, goals, accounts, recurring, categories)
- Generates 2 metadata files (README.md with AI prompts, ai-context.json with field descriptions)
- Creates summary.json with export statistics
- ZIP folder structure with organized naming
- Must handle large datasets (10k+ transactions) without memory overflow

**Estimated builder splits:** Likely stays as single sub-builder, but complex enough that builder may split into:
- Sub-builder A: Core export engine (CSV/JSON/Excel for 6 data types)
- Sub-builder B: ZIP packaging and AI metadata generation
- Sub-builder C: Export history and caching

**Recommendation:** Start as single builder, allow split if complexity becomes apparent after implementing 3+ data type exports.

#### 2. Export History with Vercel Blob Caching
**Why complex:**
- New database model (ExportHistory) with migration
- Vercel Blob Storage integration (upload, download, delete)
- Cache hit/miss logic (check if export exists, validate expiry)
- Automatic cleanup (cron job to delete expired exports)
- File size tracking and storage quota management

**Estimated builder splits:** DEFERRED TO ITERATION 2 (out of scope for Iteration 14)

**Recommendation:** Iteration 14 focuses on export generation only. Caching added in Iteration 2.

#### 3. Analytics Date Range Bug Investigation
**Why complex (paradoxically):**
- Bug is intermittent or user-reported (not consistently reproducible in testing)
- Requires tracing data flow from frontend → tRPC → Prisma → PostgreSQL
- Timezone handling across 3 layers (browser, Node.js, Postgres)
- Date serialization in tRPC (Date object → JSON → Date object)
- Edge case with `endOfMonth()` boundary conditions

**Estimated builder splits:** Single builder handles bug fix (part of Iteration 14 priority 0)

**Recommendation:** Fix is straightforward once root cause is identified. Likely fix: adjust endDate to last millisecond of month or use exclusive range with next month start.

### Medium Complexity Areas

#### 1. Excel Export Utility (xlsxExport.ts)
**Why medium complexity:**
- Library already installed (`xlsx` v0.18.5)
- Similar pattern to CSV export (data transformation → sheet generation)
- Must handle 6 data types with consistent formatting
- Workbook creation with proper sheet naming

**Estimated time:** 2-3 hours to implement all 6 data types

**Recommendation:** Straightforward implementation following CSV export pattern.

#### 2. AI Context Generator (aiContextGenerator.ts)
**Why medium complexity:**
- JSON structure with 4 sections (metadata, field descriptions, category hierarchy, AI prompts)
- Category hierarchy requires tree traversal (parent-child relationships)
- Field descriptions need domain knowledge (what each field means)
- AI prompt templates need careful wording for effectiveness

**Estimated time:** 2-3 hours to implement and test

**Recommendation:** Create templates for field descriptions and AI prompts, populate programmatically.

#### 3. tRPC Export Endpoints (exports.router.ts)
**Why medium complexity:**
- 6 export procedures (one per data type)
- Format switching logic (CSV vs JSON vs Excel)
- Date range filtering (validate input, apply to queries)
- File metadata generation (filename, size, MIME type)

**Estimated time:** 3-4 hours to implement all endpoints with validation

**Recommendation:** Reuse existing query logic from CRUD routers, add format conversion layer.

### Low Complexity Areas

#### 1. Extending csvExport.ts (Recurring + Categories)
**Why low complexity:**
- Follow existing patterns for transactions, budgets, goals, accounts
- Recurring transactions: 8-10 fields (payee, amount, frequency, nextScheduledDate)
- Categories: 5 fields (name, icon, color, parent, isActive)

**Estimated time:** 1 hour

**Recommendation:** Copy-paste-modify existing CSV generator functions.

#### 2. Database Migration (ExportHistory Model)
**Why low complexity:**
- Single new table with 10 fields
- Foreign key to User with cascade delete
- 3 indexes (userId, createdAt, expiresAt)
- No data migration required (fresh table)

**Estimated time:** 30 minutes (write schema, run migration, verify)

**Recommendation:** Standard Prisma migration workflow.

## Technology Recommendations

### Primary Stack

**Backend Export Stack:**
- **CSV Generation:** Extend existing `/src/lib/csvExport.ts` - Rationale: Already works well, just add 2 missing data types
- **JSON Generation:** Extend existing `/src/lib/jsonExport.ts` - Rationale: Basic structure good, enhance with AI context
- **Excel Generation:** Create `/src/lib/xlsxExport.ts` using installed `xlsx` library - Rationale: Library already available, industry standard
- **ZIP Generation:** Use `archiver` library - Rationale: Node.js standard, streaming support, stable API
- **AI Metadata:** Create `/src/lib/aiContextGenerator.ts` - Rationale: Custom logic for Wealth-specific metadata

**Database:**
- **ORM:** Prisma (already in use) - Rationale: Type-safe queries, excellent migration tools
- **New Model:** ExportHistory with 10 fields - Rationale: Track exports for future caching (Iteration 2)

**API Layer:**
- **Router:** Create new `exports.router.ts` - Rationale: Centralized export logic, easier to maintain
- **Endpoints:** 6 data type exports + 1 complete export - Rationale: Cover all export requirements in Iteration 14

### Supporting Libraries

**archiver (ZIP generation):**
- **Purpose:** Server-side ZIP file creation with streaming support
- **Why needed:** Complete export package requires organized folder structure with multiple files
- **Installation:** `npm install archiver @types/archiver`
- **Usage example:**
```typescript
import archiver from 'archiver'

const archive = archiver('zip', { zlib: { level: 9 } })
archive.append(csvContent, { name: 'transactions.csv' })
archive.append(readmeContent, { name: 'README.md' })
archive.finalize()
```

**date-fns (already installed):**
- **Purpose:** Date formatting for filenames and CSV dates
- **Why needed:** Consistent date formatting across all exports
- **Usage:** `format(date, 'yyyy-MM-dd')` for ISO dates, `format(date, 'yyyy-MM-dd-HH-mm-ss')` for filenames

**xlsx (already installed):**
- **Purpose:** Excel workbook generation
- **Why needed:** Multi-format export requirement (CSV, JSON, Excel)
- **Usage:** `XLSX.utils.json_to_sheet()` to convert data arrays to Excel sheets

## Integration Points

### External APIs

**None for Iteration 14**
- Vercel Blob Storage deferred to Iteration 2
- No third-party export services

### Internal Integrations

#### Frontend ↔ Backend (tRPC)

**Export Request Flow:**
```
User clicks "Export Transactions as CSV"
↓
Analytics page (or Settings page)
↓
trpc.exports.exportTransactions.useQuery({
  format: 'csv',
  startDate: dateRange.startDate,
  endDate: dateRange.endDate
})
↓
exports.router.ts → exportTransactions procedure
↓
Prisma query: transactions.findMany({ where: { userId, date: { gte, lte } } })
↓
generateTransactionCSV(transactions)
↓
Return { csv: string, filename: string, mimeType: string }
↓
Frontend: downloadCSV(csv, filename)
↓
Browser triggers download
```

**Data Shape:**
```typescript
// Frontend request
{ format: 'csv' | 'json' | 'xlsx', startDate?: Date, endDate?: Date }

// Backend response
{ 
  content: string | Buffer,  // CSV string, JSON string, or Excel Buffer
  filename: string,           // "transactions-2025-01-01-to-2025-11-09.csv"
  mimeType: string,          // "text/csv", "application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  size: number               // File size in bytes
}
```

#### Database ↔ Backend (Prisma)

**Transaction Query with Date Range:**
```typescript
await ctx.prisma.transaction.findMany({
  where: {
    userId: ctx.user.id,
    date: {
      gte: input.startDate,
      lte: input.endDate,
    },
  },
  include: {
    category: true,
    account: true,
  },
  orderBy: { date: 'desc' },
})
```

**ExportHistory Creation (Iteration 2):**
```typescript
await ctx.prisma.exportHistory.create({
  data: {
    userId: ctx.user.id,
    exportType: 'transactions',
    format: 'csv',
    dateRange: { startDate: '2025-01-01', endDate: '2025-11-09' },
    fileSize: csvContent.length,
    blobKey: 's3Key from Vercel Blob',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
})
```

#### Export Utilities ↔ tRPC Routers

**Format Switching Pattern:**
```typescript
// exports.router.ts
exportTransactions: protectedProcedure
  .input(z.object({
    format: z.enum(['csv', 'json', 'xlsx']),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ ctx, input }) => {
    // Fetch data
    const transactions = await ctx.prisma.transaction.findMany({ /* ... */ })

    // Generate export based on format
    let content: string | Buffer
    let mimeType: string
    let extension: string

    switch (input.format) {
      case 'csv':
        content = generateTransactionCSV(transactions)
        mimeType = 'text/csv'
        extension = 'csv'
        break
      case 'json':
        content = JSON.stringify(transactions, null, 2)
        mimeType = 'application/json'
        extension = 'json'
        break
      case 'xlsx':
        content = generateTransactionXLSX(transactions)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        extension = 'xlsx'
        break
    }

    const filename = `transactions-${format(input.startDate, 'yyyy-MM-dd')}-to-${format(input.endDate, 'yyyy-MM-dd')}.${extension}`

    return { content, filename, mimeType, size: content.length }
  })
```

## Risks & Challenges

### Technical Risks

#### Risk 1: Analytics Date Bug is Deeper Than Expected
**Impact:** HIGH - Blocks current export functionality, prevents testing of new exports
**Likelihood:** MEDIUM - Bug has been reported by users, suggesting it's not a simple fix
**Mitigation:**
- Priority 0 in Iteration 14 (fix before building new features)
- Investigate timezone handling first (most likely culprit)
- Add logging to tRPC query to see actual dates passed to Prisma
- Test with various date ranges (current month, last 6 months, last year)
- Fallback: If date range fix is complex, temporarily remove date filtering from export (export all transactions)

#### Risk 2: Large Dataset Export Performance
**Impact:** MEDIUM - Exports may timeout or fail for users with 10k+ transactions
**Likelihood:** MEDIUM - Vision mentions 10k transaction limit, but some users may exceed this
**Mitigation:**
- Start with in-memory generation (simple, works for 80% of users)
- Add timeout monitoring (log export duration in tRPC)
- If timeouts occur, implement streaming in Iteration 2
- Set explicit limits: 10k transactions for CSV/JSON, paginated exports for larger datasets
- Document performance: "Exports with >10k transactions may take 30+ seconds"

#### Risk 3: Excel File Compatibility Issues
**Impact:** MEDIUM - Users report "file corrupted" errors when opening in Excel/Sheets
**Likelihood:** LOW - `xlsx` library is mature and well-tested
**Mitigation:**
- Test generated Excel files in Excel 2016+, Google Sheets, Apple Numbers
- Follow library best practices for workbook creation
- Use `XLSX.writeFile()` for file generation (handles encoding correctly)
- Include file format validation in test suite

### Complexity Risks

#### Risk 1: ZIP Package Generation is Too Complex
**Impact:** HIGH - Complete export package is flagship feature, delays affect user value
**Likelihood:** MEDIUM - Requires orchestrating 6+ file generations, archiver library learning curve
**Mitigation:**
- Break down ZIP generation into sub-tasks:
  1. Generate all CSV files
  2. Generate README.md and ai-context.json
  3. Create ZIP archive
  4. Test extraction on multiple platforms
- Start with minimal ZIP (just CSVs), add metadata files incrementally
- Use archiver examples from documentation
- Builder can split into sub-builders if implementation takes >6 hours

#### Risk 2: Export History Model Design Needs Refinement
**Impact:** LOW - Model is for Iteration 2, doesn't block Iteration 14
**Likelihood:** LOW - Schema is straightforward, follows existing patterns
**Mitigation:**
- Review schema with Planner before migration
- Ensure indexes cover common queries (fetch by userId, cleanup by expiresAt)
- Add User relation with cascade delete (prevent orphaned export records)
- Test migration on dev database before production

## Recommendations for Planner

### 1. Fix Analytics Bug First (Priority 0)
**Rationale:** Current export functionality is broken. Fixing this validates the data flow and prevents cascading issues when building new export features.

**Action Items:**
- Investigate date range filter in Analytics page (lines 87-91)
- Add UTC normalization to `endOfMonth()` date: `endOfMonth(date).setHours(23, 59, 59, 999)`
- Test export with various date ranges (current month, last 6 months, custom range)
- Verify transactions.list tRPC query returns correct results

**Success Criteria:** User can export transactions from Analytics page without "No data to export" error.

### 2. Implement Export Utilities in Parallel
**Rationale:** csvExport, xlsxExport, aiContextGenerator are independent modules that can be built simultaneously.

**Action Items:**
- Extend csvExport.ts: Add `generateRecurringTransactionCSV()` and `generateCategoryCSV()`
- Create xlsxExport.ts: Implement 6 export functions (transactions, budgets, goals, accounts, recurring, categories)
- Create aiContextGenerator.ts: Generate ai-context.json with field descriptions and AI prompts
- Create archiveExport.ts: ZIP package generator using archiver library

**Success Criteria:** Each utility can be imported and called with test data, producing valid output files.

### 3. Create Centralized Exports Router
**Rationale:** Single router for all export logic is easier to maintain and enables shared export history creation (Iteration 2).

**Action Items:**
- Create `/src/server/api/routers/exports.router.ts`
- Implement 6 export procedures (exportTransactions, exportBudgets, exportGoals, exportAccounts, exportRecurring, exportCategories)
- Add format switching logic (CSV, JSON, Excel) in each procedure
- Register router in `/src/server/api/root.ts`

**Success Criteria:** All export endpoints return correct data in requested format with proper filename and MIME type.

### 4. Add ExportHistory Model (Migration Only)
**Rationale:** Database schema change should be done in Iteration 14 to avoid blocking Iteration 2.

**Action Items:**
- Add ExportHistory model to schema.prisma (10 fields, 3 indexes)
- Add `exportHistory ExportHistory[]` relation to User model
- Run `npx prisma migrate dev --name add-export-history`
- Verify migration applies cleanly in dev environment

**Success Criteria:** Migration completes without errors, ExportHistory table exists in database with correct columns and indexes.

**Note:** Export history CRUD operations deferred to Iteration 2 (caching and re-download).

### 5. Install ZIP Generation Library
**Rationale:** archiver is required for complete export package (ZIP with multiple files).

**Action Items:**
- Run `npm install archiver @types/archiver`
- Test ZIP generation with sample files (create test archive, verify extraction)

**Success Criteria:** archiver imports successfully, test ZIP file extracts correctly on Windows/macOS/Linux.

### 6. Defer Caching and Blob Storage to Iteration 2
**Rationale:** Iteration 14 is already 10-12 hours. Adding Vercel Blob Storage integration increases complexity and timeline.

**Action Items:**
- Iteration 14: Generate exports on-demand (no caching)
- Iteration 14: Return file content directly in tRPC response (no storage)
- Iteration 2: Implement Vercel Blob upload and download
- Iteration 2: Add export history CRUD operations

**Success Criteria:** User can export any data type in any format, download immediately, without caching.

### 7. Test Export Files on Multiple Platforms
**Rationale:** Export files must work on Excel, Google Sheets, Numbers, and ZIP extraction on Windows/macOS/Linux/iOS/Android.

**Action Items:**
- Test CSV files: Open in Excel (Windows/Mac), Google Sheets, Numbers (Mac)
- Test Excel files: Open in Excel 2016+, Google Sheets, Numbers
- Test ZIP files: Extract on Windows File Explorer, macOS Finder, iOS Files app, Android Files app
- Verify UTF-8 BOM in CSV files (ensures international characters display correctly)

**Success Criteria:** All export files open correctly without errors, data displays properly formatted.

## Resource Map

### Critical Files/Directories

**Existing Files (Modify):**
- `/src/lib/csvExport.ts` - Add recurring and categories generators (77 lines → ~150 lines)
- `/src/lib/jsonExport.ts` - Enhance with AI context generation (71 lines → ~120 lines)
- `/prisma/schema.prisma` - Add ExportHistory model (351 lines → ~380 lines)
- `/src/server/api/root.ts` - Register exports router (27 lines → ~30 lines)

**New Files (Create):**
- `/src/lib/xlsxExport.ts` - Excel export generators (~200 lines)
- `/src/lib/aiContextGenerator.ts` - AI metadata generator (~150 lines)
- `/src/lib/archiveExport.ts` - ZIP package creator (~100 lines)
- `/src/server/api/routers/exports.router.ts` - Export endpoints (~300 lines)

**Supporting Files (Reference Only):**
- `/src/server/api/routers/transactions.router.ts` - Query patterns for transactions (lines 23-62)
- `/src/server/api/routers/budgets.router.ts` - Query patterns for budgets
- `/src/server/api/routers/goals.router.ts` - Query patterns for goals
- `/src/server/api/routers/accounts.router.ts` - Query patterns for accounts
- `/src/server/api/routers/recurring.router.ts` - Query patterns for recurring transactions
- `/src/server/api/routers/categories.router.ts` - Query patterns for categories

**Migration Files (Generate):**
- `/prisma/migrations/[timestamp]_add_export_history/migration.sql` - SQL migration for ExportHistory

### Key Dependencies

**Already Installed:**
- `xlsx@0.18.5` - Excel workbook generation (devDependencies)
- `date-fns@3.6.0` - Date formatting
- `@trpc/server@11.6.0` - API endpoints
- `@prisma/client@5.22.0` - Database ORM

**To Install:**
- `archiver` - ZIP file generation (runtime dependency)
- `@types/archiver` - TypeScript definitions (devDependency)

**Installation Command:**
```bash
npm install archiver
npm install -D @types/archiver
```

### Testing Infrastructure

**Manual Testing Checklist:**
1. **Analytics Bug Fix:**
   - [ ] Export transactions from Analytics page with "Last 30 Days" range
   - [ ] Export transactions from Analytics page with "Last 6 Months" range
   - [ ] Export transactions from Analytics page with "Last Year" range
   - [ ] Verify CSV contains expected transaction count

2. **CSV Export (6 Data Types):**
   - [ ] Export transactions as CSV, open in Excel
   - [ ] Export budgets as CSV, open in Google Sheets
   - [ ] Export goals as CSV, verify Progress % column
   - [ ] Export accounts as CSV, verify Balance column formatting
   - [ ] Export recurring transactions as CSV, verify Frequency column
   - [ ] Export categories as CSV, verify Parent column

3. **JSON Export (6 Data Types):**
   - [ ] Export transactions as JSON, validate JSON structure
   - [ ] Export budgets as JSON, verify Decimal-to-number conversion
   - [ ] Export goals as JSON, verify date formatting (ISO 8601)
   - [ ] Export accounts as JSON, verify no sensitive data (plaidAccessToken redacted)
   - [ ] Export recurring transactions as JSON
   - [ ] Export categories as JSON, verify parent-child relationships

4. **Excel Export (6 Data Types):**
   - [ ] Export transactions as Excel, open in Excel 2016+
   - [ ] Export budgets as Excel, open in Google Sheets
   - [ ] Export goals as Excel, verify formulas (Progress %)
   - [ ] Export accounts as Excel, verify number formatting (2 decimal places)
   - [ ] Export recurring transactions as Excel, open in Apple Numbers
   - [ ] Export categories as Excel

5. **Complete Export Package (ZIP):**
   - [ ] Generate complete export ZIP
   - [ ] Extract ZIP on Windows, verify folder structure
   - [ ] Extract ZIP on macOS, verify all files present
   - [ ] Open README.md, verify AI prompts are helpful
   - [ ] Open ai-context.json, verify field descriptions accurate
   - [ ] Open summary.json, verify record counts match database

6. **Error Handling:**
   - [ ] Export with no transactions, verify error message
   - [ ] Export with invalid date range (endDate < startDate), verify validation error
   - [ ] Export during database connection failure, verify error handling

**Automated Testing (Future):**
- Unit tests for export generators (csvExport, xlsxExport, etc.)
- Integration tests for tRPC export endpoints
- Snapshot tests for generated README.md and ai-context.json

**Performance Testing (If Time Permits):**
- Export 1k transactions, measure time (target: <3 seconds)
- Export 10k transactions, measure time (target: <10 seconds)
- Generate complete ZIP with 10k transactions (target: <15 seconds)

## Questions for Planner

### 1. Should ExportHistory CRUD be in Iteration 14 or Iteration 2?
**Context:** ExportHistory model is needed for caching (Iteration 2), but creating the migration in Iteration 14 avoids blocking Iteration 2.

**Options:**
- **Option A (RECOMMENDED):** Iteration 14 creates model and migration only, no CRUD operations. Iteration 2 adds caching logic.
- **Option B:** Defer entire ExportHistory to Iteration 2 (model + migration + CRUD).

**Recommendation:** Option A. Migration is quick (<30 min), avoids dependency blocking in Iteration 2.

### 2. Should exports.router.ts be centralized or decentralized?
**Context:** Export endpoints can live in a new exports.router.ts OR be added to existing routers (transactions, budgets, etc.).

**Options:**
- **Option A (RECOMMENDED):** Centralized exports.router.ts with all export procedures.
- **Option B:** Decentralized - add export procedure to each domain router.

**Recommendation:** Option A. Easier to maintain, shared format switching logic, future-proof for export history integration.

### 3. Should Analytics bug fix include broader date handling improvements?
**Context:** Bug is likely timezone-related. Fixing just the Analytics page may leave similar bugs in other date filters.

**Options:**
- **Option A:** Fix only Analytics page export (quick, focused).
- **Option B:** Audit all date filtering across app, standardize UTC handling (comprehensive, time-consuming).

**Recommendation:** Option A for Iteration 14 (bug is critical, fix fast). Add "Audit date handling" to technical debt for future iteration.

### 4. What should happen if an export times out (>30 seconds)?
**Context:** Vision mentions 30-second timeout constraint, but large exports (10k+ transactions) may exceed this.

**Options:**
- **Option A:** Fail fast with clear error: "Export too large, try smaller date range."
- **Option B:** Implement streaming/chunking (adds 4+ hours to Iteration 14).
- **Option C:** Defer large exports to Iteration 3 with async job queue.

**Recommendation:** Option A for Iteration 14 (MVP), Option C for Iteration 3 if needed.

### 5. Should complete export package include Excel files or just CSV?
**Context:** ZIP package currently planned with CSV files. Adding Excel increases file size and generation time.

**Options:**
- **Option A:** CSV only (smaller files, faster generation).
- **Option B:** Both CSV and Excel (user choice, more flexibility).

**Recommendation:** Option A for Iteration 14 (MVP), Option B for post-MVP if user feedback requests it.

---

**Report Status:** ✅ COMPLETE  
**Next Step:** Planner reviews this report and creates detailed Iteration 14 task breakdown  
**Estimated Iteration 14 Duration:** 10-12 hours (including bug fix, utilities, endpoints, migration, testing)
