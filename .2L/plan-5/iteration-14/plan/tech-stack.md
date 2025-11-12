# Technology Stack - Iteration 14

## Core Framework

**Decision:** Next.js 14.2.33 with App Router (Already Established)

**Rationale:**
- Existing infrastructure - no framework changes needed
- Server components for tRPC API routes
- File-based routing for future Export Center UI (Iteration 15)
- React 18.3.1 for client components

**Iteration 14 Usage:**
- Server-side tRPC routers for export endpoints
- API routes for export generation
- No client components (backend-only iteration)

## Database

**Decision:** PostgreSQL via Supabase + Prisma 5.22.0 ORM

**Rationale:**
- Existing database infrastructure
- Prisma provides type-safe queries and migrations
- Decimal type support for monetary values (critical for exports)
- Migration tooling for ExportHistory model

**Schema Strategy:**
- Add new ExportHistory model to existing schema
- Foreign key to User with CASCADE delete
- Indexes on userId, createdAt, expiresAt for efficient queries
- No data migration needed (fresh table)

**Migration Plan:**
```bash
# Add ExportHistory model to schema.prisma
# Run migration
npx prisma migrate dev --name add-export-history

# Verify migration
npx prisma migrate status

# Generate Prisma Client
npx prisma generate
```

## Export Format Libraries

### CSV Generation

**Decision:** Extend existing csvExport.ts utility

**Rationale:**
- Already implements UTF-8 BOM for Excel compatibility
- Proper quote escaping for special characters
- Decimal handling for Prisma Decimal types
- Established patterns to follow for consistency

**Implementation:**
- Add `generateRecurringTransactionCSV()` function
- Add `generateCategoryCSV()` function
- Reuse existing `downloadCSV()` helper

**Key Features:**
- UTF-8 BOM prefix: `\uFEFF`
- RFC 4180 compliant (quoted fields, escaped quotes)
- ISO 8601 dates: `yyyy-MM-dd`
- 2 decimal places for amounts: `.toFixed(2)`

### JSON Generation

**Decision:** Extend existing jsonExport.ts utility

**Rationale:**
- Already implements recursive Decimal sanitization
- Pretty-printing with 2-space indent
- Metadata structure (exportedAt, version)

**Implementation:**
- Enhance `sanitizeDecimals()` for new data types
- Add AI context embedding (field descriptions, prompts)
- Include recurring transactions and categories

**Key Features:**
- Recursive Decimal to number conversion
- ISO 8601 date serialization
- Pretty-printed JSON for readability
- No sensitive data (redact plaidAccessToken)

### Excel Generation

**Decision:** xlsx@0.18.5 (Already Installed in devDependencies)

**Rationale:**
- Mature library (20M+ weekly downloads)
- Supports .xlsx format (Excel 2007+)
- Compatible with Excel, Google Sheets, Apple Numbers
- Simple API: `json_to_sheet()` for data arrays

**Implementation:**
- Create new `xlsxExport.ts` utility
- 6 export functions (one per data type)
- Return Buffer for binary transport
- Cell formatting: Currency (2 decimals), Date type

**Example Pattern:**
```typescript
import * as XLSX from 'xlsx'

export function generateTransactionExcel(transactions: Transaction[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map(txn => ({
      Date: format(txn.date, 'yyyy-MM-dd'),
      Payee: txn.payee,
      Category: txn.category.name,
      Account: txn.account.name,
      Amount: Number(txn.amount.toString()),
      Tags: txn.tags.join(', '),
      Notes: txn.notes || ''
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
```

**Cell Formatting:**
- Amount columns: Number format with 2 decimals
- Date columns: Date type (not string)
- Auto-column width based on content (optional enhancement)

### ZIP Generation

**Decision:** archiver@7.0.1 (New Dependency)

**Rationale:**
- Node.js optimized for server-side generation
- Streaming support prevents memory overflow with large files
- Industry standard (7M+ weekly downloads)
- Better than jszip for backend (jszip is browser-focused)

**Installation:**
```bash
npm install archiver
npm install --save-dev @types/archiver
```

**Implementation:**
- Create `archiveExport.ts` utility
- ZIP folder structure with organized naming
- Used in Iteration 15 for complete export packages

**Example Pattern:**
```typescript
import archiver from 'archiver'

export async function createExportZIP(files: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    const folderName = `wealth-export-${format(new Date(), 'yyyy-MM-dd')}`

    Object.entries(files).forEach(([filename, content]) => {
      archive.append(content, { name: `${folderName}/${filename}` })
    })

    archive.finalize()
  })
}
```

**Iteration 14 Scope:**
- Install archiver dependency
- Create basic archiveExport.ts utility
- Test ZIP generation with sample files
- Full implementation in Iteration 15

### AI Context Generation

**Decision:** Custom aiContextGenerator.ts utility

**Rationale:**
- Wealth-specific metadata (field descriptions, category hierarchy)
- AI prompt templates tailored to financial analysis
- No third-party library needed (simple JSON generation)

**Implementation:**
- Generate ai-context.json with 4 sections:
  1. Field descriptions (transaction.amount, budget.status, etc.)
  2. Category hierarchy (parent-child relationships)
  3. Enum definitions (AccountType, BudgetStatus, etc.)
  4. AI prompt templates (spending analysis, budget review, etc.)

**Structure:**
```typescript
interface AIContext {
  exportVersion: string
  exportedAt: string
  user: { currency: string; timezone: string }
  fieldDescriptions: Record<string, Record<string, string>>
  categories: { hierarchy: Record<string, { parent: string | null; icon: string; color: string }> }
  enums: Record<string, string[]>
  aiPrompts: Record<string, string>
  statistics: { recordCounts: Record<string, number>; dateRange: { earliest: string; latest: string } | null }
}
```

**Category Hierarchy Algorithm:**
- Iterative traversal (not recursive) to prevent infinite loops
- Cycle detection with visited set
- Build flat hierarchy map with parent names

## API Layer

**Decision:** tRPC 11.6.0 with Zod Validation

**Rationale:**
- Existing pattern used throughout app
- Type-safe API contracts
- Input validation with Zod schemas
- Middleware for authentication (protectedProcedure)

**Implementation:**
- Create new `exports.router.ts` (centralized export endpoints)
- 6 procedures: exportTransactions, exportBudgets, exportGoals, exportAccounts, exportRecurring, exportCategories
- Format switching: CSV/JSON/EXCEL via input enum
- Base64 encoding for binary content (Excel)

**Router Pattern:**
```typescript
export const exportsRouter = router({
  exportTransactions: protectedProcedure
    .input(z.object({
      format: z.enum(['CSV', 'JSON', 'EXCEL']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch data
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.startDate && input.endDate && {
            date: { gte: input.startDate, lte: input.endDate }
          })
        },
        include: { category: true, account: true },
        orderBy: { date: 'desc' }
      })

      // Generate export based on format
      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateTransactionCSV(transactions)
          mimeType = 'text/csv'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(transactions, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateTransactionExcel(transactions)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `transactions-${format(new Date(), 'yyyy-MM-dd')}.${extension}`

      // Base64 encode for transport
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: transactions.length
      }
    })
})
```

**Input Validation:**
- Format enum: 'CSV' | 'JSON' | 'EXCEL'
- Date range optional (defaults to all records)
- Limit optional (default 10k, max 50k)

**Error Handling:**
- TRPCError with appropriate codes
- BAD_REQUEST for invalid inputs
- INTERNAL_SERVER_ERROR for generation failures
- NOT_FOUND for empty datasets (return empty file instead)

## Database Schema Changes

**ExportHistory Model:**

```prisma
model ExportHistory {
  id          String   @id @default(cuid())
  userId      String
  exportType  ExportType
  format      ExportFormat
  dataType    ExportDataType?  // null for COMPLETE exports
  dateRange   Json?            // { from: ISO string, to: ISO string }
  recordCount Int              // Number of records exported
  fileSize    Int              // Size in bytes
  blobKey     String?          // Vercel Blob storage key (null if not cached)
  createdAt   DateTime @default(now())
  expiresAt   DateTime         // createdAt + 30 days

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([expiresAt])
}

enum ExportType {
  QUICK      // Single data type export
  COMPLETE   // Full ZIP package export
}

enum ExportFormat {
  CSV
  JSON
  EXCEL
  ZIP
}

enum ExportDataType {
  TRANSACTIONS
  RECURRING_TRANSACTIONS
  BUDGETS
  GOALS
  ACCOUNTS
  CATEGORIES
}
```

**User Model Update:**
```prisma
model User {
  // ... existing fields ...
  exportHistory ExportHistory[]
}
```

**Indexes Rationale:**
- `userId`: Fast lookup of user's export history
- `createdAt`: Recent exports first in display
- `expiresAt`: Efficient cleanup query for cron job

**Migration Script:**
```sql
-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('QUICK', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'JSON', 'EXCEL', 'ZIP');

-- CreateEnum
CREATE TYPE "ExportDataType" AS ENUM ('TRANSACTIONS', 'RECURRING_TRANSACTIONS', 'BUDGETS', 'GOALS', 'ACCOUNTS', 'CATEGORIES');

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exportType" "ExportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "dataType" "ExportDataType",
    "dateRange" JSONB,
    "recordCount" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "blobKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportHistory_userId_idx" ON "ExportHistory"("userId");

-- CreateIndex
CREATE INDEX "ExportHistory_createdAt_idx" ON "ExportHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ExportHistory_expiresAt_idx" ON "ExportHistory"("expiresAt");

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Development Tools

### Date Handling

**Library:** date-fns@3.6.0 (Already Installed)

**Usage:**
- ISO 8601 formatting: `format(date, 'yyyy-MM-dd')`
- Filename timestamps: `format(date, 'yyyy-MM-dd-HH-mm-ss')`
- Month formatting: `format(date, 'yyyy-MM')`

**Key Functions:**
- `format()`: Date to string
- `startOfMonth()`: First day of month at 00:00:00
- `endOfMonth()`: Last day of month at 23:59:59.999
- `isAfter()`, `isBefore()`: Date comparisons

**Bug Fix Application:**
- Analytics bug likely caused by `endOfMonth()` returning next month start (00:00:00)
- Fix: Use `endOfMonth().setHours(23, 59, 59, 999)` or `startOfDay(addDays(endOfMonth(), 1))`

### Testing

**Framework:** Vitest 3.2.4 (Already Configured)

**Configuration:**
- Globals enabled (no import needed for describe, it, expect)
- Node environment (server-side testing)
- Coverage with v8 provider
- Path alias: `@` → `./src`

**Test Strategy:**
- Prioritize manual testing in Iteration 14 (faster validation)
- Create test files for future automated tests:
  - `src/lib/__tests__/xlsxExport.test.ts`
  - `src/lib/__tests__/aiContextGenerator.test.ts`
  - `src/server/api/routers/__tests__/exports.router.test.ts`

**Critical Test Cases:**
1. CSV UTF-8 BOM validation (open in Excel, check special characters)
2. Excel file validity (open in Excel, Google Sheets, Numbers)
3. JSON structure validation (parse, verify required fields)
4. Date range filtering (gte/lte operators)
5. Empty dataset handling (return empty file with headers)

### Code Quality

**Linter:** ESLint 8.57.0 with Next.js config

**Configuration:**
- eslint-config-next for Next.js best practices
- TypeScript support enabled

**Standards:**
- Follow existing code patterns in csvExport.ts
- Use TypeScript strict mode
- Export interfaces for all data types
- Document complex functions with JSDoc comments

**Formatter:** Built-in (no Prettier configured)

**Type Checking:** TypeScript 5.7.2

**Approach:**
- Strict mode enabled
- No implicit any
- Strict null checks
- Interface definitions for all export data types

## Environment Variables

**Iteration 14 (No New Variables):**
- Uses existing DATABASE_URL (Supabase PostgreSQL)
- No Vercel Blob Storage yet (deferred to Iteration 15)

**Iteration 15 (Future):**
```bash
# .env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

**Iteration 15 (Vercel Configuration):**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-exports",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Dependencies Overview

### Already Installed (No Action Needed)

**Runtime:**
- `@prisma/client@5.22.0` - Database ORM
- `@trpc/server@11.6.0` - API layer
- `date-fns@3.6.0` - Date formatting
- `zod@3.23.8` - Input validation
- `superjson@2.2.1` - tRPC serialization (handles Date objects)

**Development:**
- `xlsx@0.18.5` - Excel generation (in devDependencies, move to dependencies if needed)
- `typescript@5.7.2` - Type safety
- `prisma@5.22.0` - Database migrations
- `vitest@3.2.4` - Testing framework

### To Install (Iteration 14)

**Runtime:**
```bash
npm install archiver
```

**Development:**
```bash
npm install --save-dev @types/archiver
```

**Deferred to Iteration 15:**
```bash
npm install @vercel/blob
```

## Performance Targets

**Export Generation Times:**
- 1k transactions CSV: < 1 second
- 1k transactions Excel: < 3 seconds
- 10k transactions CSV: < 5 seconds
- 10k transactions Excel: < 10 seconds
- Complete export (all 6 types): < 15 seconds

**File Sizes (Estimates):**
- 1k transactions CSV: ~200KB
- 1k transactions Excel: ~150KB
- 1k transactions JSON: ~300KB
- Complete export ZIP (all data): 1-2MB

**Monitoring:**
- Add timing logs to tRPC export procedures:
  ```typescript
  const startTime = Date.now()
  // ... export generation ...
  const duration = Date.now() - startTime
  console.log(`Export completed in ${duration}ms, ${recordCount} records, ${fileSize} bytes`)
  ```

**Optimization Strategies:**
- Use Prisma `select()` to limit fields returned (reduce query time)
- Stream large exports if profiling shows >10s generation time
- Parallel data fetching with `Promise.all()` for multi-type exports
- Client-side caching of export format preference (localStorage)

## Security Considerations

**Data Redaction:**
- Redact `plaidAccessToken` from account exports (security)
- Include `plaidAccountId` for reference (safe, non-sensitive)
- Add note in README.md about security

**Authentication:**
- All export endpoints use `protectedProcedure` (requires authentication)
- User can only export their own data (userId filter in queries)

**Rate Limiting:**
- No rate limiting in Iteration 14 (backend only, no public endpoints)
- Consider in Iteration 15 if abuse detected

**File Size Limits:**
- Warn at 10k records: "Large export may take 30 seconds"
- Block at 50k records: "Use date filters for smaller batches"
- Prevent memory overflow with streaming (if needed)

## Technology Decisions Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| CSV Export | Extend csvExport.ts | - | Already implements UTF-8 BOM, quote escaping |
| JSON Export | Extend jsonExport.ts | - | Already handles Decimal conversion |
| Excel Export | xlsx | 0.18.5 | Mature, widely used, already installed |
| ZIP Generation | archiver | 7.0.1 | Node.js optimized, streaming support |
| AI Metadata | Custom utility | - | Wealth-specific, no library needed |
| API Layer | tRPC | 11.6.0 | Existing pattern, type-safe |
| Database | Prisma + PostgreSQL | 5.22.0 | Existing infrastructure |
| Validation | Zod | 3.23.8 | tRPC input validation |
| Date Handling | date-fns | 3.6.0 | Existing, lightweight |
| Testing | Vitest | 3.2.4 | Already configured |

## Browser Compatibility

**Desktop Browsers (Iteration 15+ when UI added):**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Browsers (Iteration 16 when share API added):**
- iOS Safari 14+
- Chrome Android 90+

**File Download Support:**
- All modern browsers support Blob download
- Base64 decode for binary files (Excel)
- Native file system API for downloads

## Iteration 14 Specific Constraints

**No UI Changes:**
- Backend only (no React components)
- No route changes (no new pages)
- tRPC endpoints exist but not called by UI yet

**Database Migration Required:**
- Add ExportHistory model
- Run migration in dev and prod
- No data migration (fresh table)

**Manual Testing Only:**
- No automated E2E tests yet
- Manual validation of exports on multiple platforms
- Excel, Google Sheets, Apple Numbers testing

**Base64 Transport:**
- Binary files (Excel) encoded as base64 for tRPC transport
- Client decodes before download
- Acceptable for Iteration 14 (direct file return in Iteration 15+)

---

**Tech Stack Status:** ✅ DEFINED
**Dependencies:** archiver (install), xlsx (verify), others (already installed)
**Ready for:** Builder Implementation
