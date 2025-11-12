# Builder Task Breakdown - Iteration 14

## Overview

4 primary builders will work mostly in parallel with minimal dependencies. Total estimated time: 10-12 hours.

**Builder Execution Strategy:**
- Builder-1 starts first (Priority 0 bug fix validates infrastructure)
- Builders 2, 3, 4 can start immediately after bug is confirmed fixed (30-60 minutes)
- All builders work on isolated modules with clear contracts
- Integration phase after all builders complete (30 minutes)

**Complexity Distribution:**
- Builder-1: MEDIUM (2-3 hours) - Bug fix + CSV extensions
- Builder-2: MEDIUM-HIGH (3-4 hours) - Excel generator for 6 data types
- Builder-3: MEDIUM (3-4 hours) - AI context + Archive utility
- Builder-4: MEDIUM-HIGH (3-4 hours) - tRPC router + Database migration

---

## Builder-1: Analytics Bug Fix + CSV Extensions

### Scope

Fix the critical Analytics export date range bug and extend CSV export utilities to support recurring transactions and categories.

### Complexity Estimate

**MEDIUM**

- Analytics bug: Time-boxed to 2 hours maximum (likely 30-60 minutes once root cause identified)
- CSV extensions: Straightforward (follow existing patterns)
- No database changes required
- No new dependencies needed

### Success Criteria

- [ ] Analytics export button works without "No data to export" error
- [ ] Export includes transactions within selected date range (verified with test data)
- [ ] Bug fix tested with various date ranges (current month, last 6 months, last year, custom range)
- [ ] `generateRecurringTransactionCSV()` function created and tested
- [ ] `generateCategoryCSV()` function created and tested
- [ ] Both new CSV generators follow existing patterns (UTF-8 BOM, quote escaping, decimal handling)
- [ ] Manual testing validates CSV files open correctly in Excel

### Files to Create

**None** (only modify existing files)

### Files to Modify

- `src/app/(dashboard)/analytics/page.tsx` (lines 58-61, 87-98) - Fix date range filter
- `src/lib/csvExport.ts` - Add recurring transactions and categories generators

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** Builder-4 (validates date range filtering works before tRPC implementation)

### Implementation Notes

**Analytics Bug Fix:**

1. **Root Cause (from exploration):**
   - `endOfMonth()` returns start of next month at 00:00:00 (e.g., 2025-12-01 00:00:00)
   - Prisma `lte` comparison misses transactions on last day of month
   - Timezone conversion may shift boundaries

2. **Fix Strategy (recommended):**
   ```typescript
   // src/app/(dashboard)/analytics/page.tsx

   import { startOfMonth, endOfMonth, subMonths, endOfDay } from 'date-fns'

   // BEFORE (buggy)
   const [dateRange, setDateRange] = useState({
     startDate: startOfMonth(subMonths(new Date(), 5)),
     endDate: endOfMonth(new Date()),  // Returns 2025-12-01 00:00:00
   })

   // AFTER (fixed)
   const [dateRange, setDateRange] = useState({
     startDate: startOfMonth(subMonths(new Date(), 5)),
     endDate: endOfDay(endOfMonth(new Date())),  // Returns 2025-11-30 23:59:59.999
   })
   ```

3. **Testing Steps:**
   - Create test transaction on last day of month (e.g., 2025-11-30)
   - Select "Last 30 Days" or "Current Month" date range
   - Click export button
   - Verify CSV includes transaction from last day of month
   - Test with other date ranges (last 6 months, last year)

4. **Fallback if fix doesn't work within 2 hours:**
   - Remove date filtering temporarily (export all transactions)
   - Add TODO comment with investigation notes
   - Escalate to planner for deeper investigation
   - Continue with CSV extensions

**CSV Extensions:**

1. **Recurring Transactions CSV:**
   ```typescript
   // src/lib/csvExport.ts

   interface RecurringTransactionExport {
     payee: string
     amount: number | Decimal
     category: { name: string }
     account: { name: string }
     frequency: string
     interval: number
     nextScheduledDate: Date
     status: string
   }

   export function generateRecurringTransactionCSV(
     recurringTransactions: RecurringTransactionExport[]
   ): string {
     const headers = ['Payee', 'Amount', 'Category', 'Account', 'Frequency', 'Next Date', 'Status']
     const headerRow = headers.join(',')

     const dataRows = recurringTransactions.map((rt) => {
       const amount = typeof rt.amount === 'number'
         ? rt.amount
         : Number(rt.amount.toString())

       const frequencyText = formatFrequency(rt.frequency, rt.interval)

       const row = [
         `"${rt.payee.replace(/"/g, '""')}"`,
         amount.toFixed(2),
         `"${rt.category.name.replace(/"/g, '""')}"`,
         `"${rt.account.name.replace(/"/g, '""')}"`,
         `"${frequencyText}"`,
         format(new Date(rt.nextScheduledDate), 'yyyy-MM-dd'),
         rt.status,
       ]
       return row.join(',')
     })

     const csvContent = [headerRow, ...dataRows].join('\n')
     return '\uFEFF' + csvContent  // UTF-8 BOM
   }

   function formatFrequency(frequency: string, interval: number): string {
     const base = {
       'DAILY': 'day',
       'WEEKLY': 'week',
       'BIWEEKLY': 'week',
       'MONTHLY': 'month',
       'YEARLY': 'year',
     }[frequency] || frequency.toLowerCase()

     if (frequency === 'BIWEEKLY') {
       return 'Every 2 weeks'
     }

     return interval === 1 ? `Every ${base}` : `Every ${interval} ${base}s`
   }
   ```

2. **Categories CSV:**
   ```typescript
   // src/lib/csvExport.ts

   interface CategoryExport {
     name: string
     icon: string
     color: string
     parentId: string | null
     parent: { name: string } | null
     isDefault: boolean
   }

   export function generateCategoryCSV(categories: CategoryExport[]): string {
     const headers = ['Name', 'Parent', 'Icon', 'Color', 'Type']
     const headerRow = headers.join(',')

     const dataRows = categories.map((cat) => {
       const row = [
         `"${cat.name.replace(/"/g, '""')}"`,
         cat.parent ? `"${cat.parent.name.replace(/"/g, '""')}"` : 'None',
         cat.icon,
         cat.color,
         cat.isDefault ? 'Default' : 'Custom',
       ]
       return row.join(',')
     })

     const csvContent = [headerRow, ...dataRows].join('\n')
     return '\uFEFF' + csvContent
   }
   ```

3. **Export interface types at top of file:**
   ```typescript
   // Add to existing interfaces in csvExport.ts
   export interface RecurringTransactionExport { /* ... */ }
   export interface CategoryExport { /* ... */ }
   ```

### Patterns to Follow

**From patterns.md:**
- CSV Generator Function pattern (section: CSV Export Patterns > Pattern 1)
- UTF-8 BOM prefix for Excel compatibility
- Quote escaping: `replace(/"/g, '""')`
- Decimal to number conversion
- ISO 8601 date formatting
- Analytics Date Range Fix pattern (section: Analytics Bug Fix Pattern > Pattern 1)

### Testing Requirements

**Manual Testing:**
1. Analytics bug fix:
   - Create test transaction on last day of November
   - Export with "Current Month" filter
   - Verify transaction appears in CSV
   - Test with custom date ranges

2. CSV exports:
   - Export sample recurring transactions (create 3-5 test records)
   - Open CSV in Excel, verify UTF-8 characters display correctly
   - Verify frequency column shows human-readable text ("Every 2 weeks")
   - Export sample categories (verify hierarchy with parent names)
   - Open CSV in Google Sheets, verify formatting

**Validation:**
- No compilation errors in csvExport.ts
- All existing CSV generators still work (transactions, budgets, goals, accounts)
- New CSV generators follow same pattern as existing ones

### Potential Split Strategy

**If bug fix takes >2 hours:** Not likely (straightforward date formatting issue)

**If CSV extensions prove complex:** Not likely (simple copy-paste-modify pattern)

**Recommendation:** Stay as single builder. Both tasks are straightforward and isolated.

---

## Builder-2: Excel Export Utility

### Scope

Create new `xlsxExport.ts` utility with Excel export generators for all 6 data types (transactions, budgets, goals, accounts, recurring transactions, categories). Ensure compatibility with Excel 2016+, Google Sheets, and Apple Numbers.

### Complexity Estimate

**MEDIUM-HIGH**

- 6 export functions to implement (one per data type)
- Each function follows same pattern (moderate repetition)
- Excel library already installed (no learning curve for API)
- Cell formatting (currency, dates) adds complexity
- Buffer handling for binary transport
- Cross-platform testing required (Excel, Sheets, Numbers)

### Success Criteria

- [ ] `xlsxExport.ts` created with 6 export functions
- [ ] All functions return Buffer type (for binary transport)
- [ ] Excel files open correctly in Excel 2016+ (Windows and Mac)
- [ ] Excel files open correctly in Google Sheets
- [ ] Excel files open correctly in Apple Numbers
- [ ] Amount columns formatted as numbers (2 decimal places)
- [ ] Date columns formatted as Date type (not string)
- [ ] Decimal to number conversion working for all monetary fields
- [ ] Interface types exported for use in tRPC router
- [ ] Manual testing validates all 6 data types export successfully

### Files to Create

- `src/lib/xlsxExport.ts` (~200 lines)

### Files to Modify

**None** (isolated utility file)

### Dependencies

**Depends on:** None (can start immediately, but Builder-1 validates Decimal handling pattern)

**Blocks:** Builder-4 (tRPC router imports these generators)

### Implementation Notes

**Library Usage:**

```typescript
// xlsx is already installed in devDependencies
// Import like this:
import * as XLSX from 'xlsx'
```

**Function Pattern (repeat for each data type):**

```typescript
// src/lib/xlsxExport.ts

import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

// Import interfaces from csvExport or define inline
interface TransactionExport {
  date: Date
  payee: string
  amount: number | Decimal
  category: { name: string }
  account: { name: string }
  notes?: string | null
  tags: string[]
}

export function generateTransactionExcel(transactions: TransactionExport[]): Buffer {
  // Transform data to simple objects
  const data = transactions.map(txn => ({
    Date: format(new Date(txn.date), 'yyyy-MM-dd'),
    Payee: txn.payee,
    Category: txn.category.name,
    Account: txn.account.name,
    Amount: Number(
      typeof txn.amount === 'number'
        ? txn.amount
        : txn.amount.toString()
    ),
    Tags: txn.tags.join(', '),
    Notes: txn.notes || '',
  }))

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  // Return as Buffer for binary transport
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  }) as Buffer
}

// Repeat for: generateBudgetExcel, generateGoalExcel, generateAccountExcel,
//             generateRecurringTransactionExcel, generateCategoryExcel
```

**All 6 Functions to Implement:**

1. `generateTransactionExcel(transactions: TransactionExport[]): Buffer`
2. `generateBudgetExcel(budgets: BudgetExport[]): Buffer`
3. `generateGoalExcel(goals: GoalExport[]): Buffer`
4. `generateAccountExcel(accounts: AccountExport[]): Buffer`
5. `generateRecurringTransactionExcel(recurringTransactions: RecurringTransactionExport[]): Buffer`
6. `generateCategoryExcel(categories: CategoryExport[]): Buffer`

**Helper Function (reuse from Builder-1):**

```typescript
// Copy formatFrequency function from csvExport.ts or import it
function formatFrequency(frequency: string, interval: number): string {
  // ... same implementation as CSV version
}
```

**Data Transformation Tips:**

- **Dates:** Convert to ISO string (Excel will parse them)
- **Decimals:** Always convert to number with `Number(decimal.toString())`
- **Arrays (tags):** Join with comma-space separator
- **Null values:** Use empty string `''` or `'None'`
- **Sheet names:** Keep short and descriptive (e.g., 'Transactions', 'Budgets')

**Testing Each Function:**

1. Create sample data (5-10 records per type)
2. Call generator function
3. Write Buffer to file: `fs.writeFileSync('test-output.xlsx', buffer)`
4. Open in Excel, Google Sheets, Numbers
5. Verify:
   - Headers are correct
   - Data displays properly
   - Numbers have 2 decimal places
   - No corruption errors
   - UTF-8 characters display correctly

### Patterns to Follow

**From patterns.md:**
- Excel Export Patterns > Pattern 1: Excel Generator Function
- Always return Buffer type
- Use `json_to_sheet()` for array-to-sheet conversion
- Decimal handling (convert to number before adding to data array)
- Date formatting (ISO 8601 strings)

### Testing Requirements

**Manual Testing (Priority: HIGH):**

1. **Excel 2016+ (Windows or Mac):**
   - Open each generated .xlsx file
   - Verify headers render correctly
   - Check number formatting (2 decimals for amounts)
   - Verify no file corruption warnings
   - Test with 100+ record file (performance check)

2. **Google Sheets:**
   - Upload each .xlsx file to Google Drive
   - Open in Google Sheets
   - Verify same data renders correctly
   - Check formulas work (if any)

3. **Apple Numbers (if available):**
   - Open each .xlsx file in Numbers
   - Verify compatibility
   - Note any formatting differences

4. **Edge Cases:**
   - Export with 0 records (should have header row only)
   - Export with special characters in payee names (UTF-8 test)
   - Export with very large amounts (e.g., 1,000,000.00)
   - Export with negative amounts (expenses)

**Automated Testing (Optional - low priority):**
- Create test files in `src/lib/__tests__/xlsxExport.test.ts`
- Mock Decimal objects
- Verify Buffer output type
- Snapshot test for small datasets

### Potential Split Strategy

**If implementation takes >4 hours, consider split:**

**Primary Builder-2 (Foundation):**
- Create `xlsxExport.ts` file structure
- Implement `generateTransactionExcel()` and `generateBudgetExcel()` (most complex)
- Test on all 3 platforms (Excel, Sheets, Numbers)
- Document patterns for sub-builder

**Sub-builder 2A (Remaining Generators):**
- Implement `generateGoalExcel()`, `generateAccountExcel()`
- Implement `generateRecurringTransactionExcel()`, `generateCategoryExcel()`
- Follow patterns from primary builder
- Test all 4 new functions
- Estimate: 2-3 hours

**Recommendation:** Start as single builder. Split only if blocked or complexity increases.

---

## Builder-3: AI Context Generator + Archive Utility

### Scope

Create AI metadata generator (`aiContextGenerator.ts`) that produces ai-context.json with field descriptions, category hierarchy, enum definitions, and AI prompt templates. Also create archive utility (`archiveExport.ts`) for ZIP package generation (used in Iteration 15).

### Complexity Estimate

**MEDIUM**

- AI context: Medium complexity (JSON structure, category hierarchy traversal)
- Archive utility: Low complexity (use archiver library, basic ZIP creation)
- No database queries (uses data passed as input)
- Category hierarchy requires cycle detection (prevent infinite loops)
- AI prompts require domain knowledge (financial analysis use cases)

### Success Criteria

- [ ] `aiContextGenerator.ts` created with `generateAIContext()` function
- [ ] AI context JSON includes 4 main sections (fieldDescriptions, categories, enums, aiPrompts)
- [ ] Category hierarchy built correctly with cycle detection
- [ ] Field descriptions are accurate and helpful for AI analysis
- [ ] AI prompt templates are specific and actionable
- [ ] JSON output is pretty-printed (2-space indent)
- [ ] `archiveExport.ts` created with `createExportZIP()` function
- [ ] archiver dependency installed successfully
- [ ] ZIP creation tested with sample files
- [ ] ZIP extracts correctly on Windows, macOS, Linux

### Files to Create

- `src/lib/aiContextGenerator.ts` (~150-200 lines)
- `src/lib/archiveExport.ts` (~100 lines)

### Files to Modify

- `package.json` - Add archiver to dependencies

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** Iteration 15 (complete export package uses both utilities)

### Implementation Notes

**1. Install archiver dependency:**

```bash
npm install archiver
npm install --save-dev @types/archiver
```

**2. AI Context Generator:**

See full implementation in `patterns.md` > "AI Context Generator Patterns > Pattern 1"

**Key sections to implement:**

```typescript
// src/lib/aiContextGenerator.ts

interface AIContextInput {
  user: {
    currency: string
    timezone: string
  }
  categories: Category[]
  statistics: {
    transactions: number
    budgets: number
    goals: number
    accounts: number
    recurringTransactions: number
    categories: number
  }
  dateRange: {
    earliest: Date
    latest: Date
  } | null
}

export function generateAIContext(input: AIContextInput): string {
  const context = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),

    user: {
      currency: input.user.currency,
      timezone: input.user.timezone,
      locale: 'en-US',
    },

    fieldDescriptions: {
      transaction: {
        date: 'Transaction date in YYYY-MM-DD format',
        amount: `Transaction amount in ${input.user.currency}. Negative values = expenses, Positive values = income`,
        // ... add all fields with descriptions
      },
      budget: { /* ... */ },
      goal: { /* ... */ },
      account: { /* ... */ },
      recurringTransaction: { /* ... */ },
      category: { /* ... */ },
    },

    categories: {
      hierarchy: buildCategoryHierarchy(input.categories),
    },

    enums: {
      AccountType: ['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH'],
      BudgetStatus: ['UNDER_BUDGET', 'AT_LIMIT', 'OVER_BUDGET'],
      // ... add all enums
    },

    aiPrompts: {
      spendingAnalysis: `Analyze my spending patterns in transactions.csv...`,
      budgetReview: `Review my budgets.csv against transactions.csv...`,
      // ... add 5 prompt templates
    },

    statistics: {
      recordCounts: input.statistics,
      dateRange: input.dateRange ? {
        earliest: format(input.dateRange.earliest, 'yyyy-MM-dd'),
        latest: format(input.dateRange.latest, 'yyyy-MM-dd'),
      } : null,
    },
  }

  return JSON.stringify(context, null, 2)
}

function buildCategoryHierarchy(categories: Category[]): Record<string, {
  parent: string | null
  icon: string
  color: string
}> {
  const hierarchy: Record<string, { parent: string | null; icon: string; color: string }> = {}
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]))
  const visited = new Set<string>()  // Prevent infinite loops

  for (const cat of categories) {
    if (visited.has(cat.id)) continue
    visited.add(cat.id)

    const parent = cat.parentId ? categoryMap.get(cat.parentId) : null

    hierarchy[cat.name] = {
      parent: parent?.name || null,
      icon: cat.icon,
      color: cat.color,
    }
  }

  return hierarchy
}
```

**Field Descriptions (comprehensive):**

Copy from `patterns.md` or create detailed descriptions for:
- transaction: 7 fields (date, amount, payee, category, account, tags, notes)
- budget: 5 fields (month, budgeted, spent, remaining, status)
- goal: 7 fields (name, targetAmount, currentAmount, progress, targetDate, type, status)
- account: 6 fields (name, type, balance, connected, status, lastUpdated)
- recurringTransaction: 4 fields (frequency, interval, nextScheduledDate, status)
- category: 5 fields (name, parent, icon, color, type)

**AI Prompts (5 templates):**

1. **spendingAnalysis:** Analyze transactions.csv for top categories, trends, unusual transactions, saving opportunities
2. **budgetReview:** Review budgets.csv vs transactions.csv, identify overspending, suggest adjustments
3. **goalProgress:** Check goals.csv vs accounts.csv, calculate if on track, suggest monthly savings needed
4. **recurringOptimization:** Analyze recurring-transactions.csv for unnecessary subscriptions, price increases
5. **financialHealth:** Comprehensive assessment across all data, income/expense ratio, savings rate, budget adherence, goal progress

**3. Archive Export Utility:**

```typescript
// src/lib/archiveExport.ts

import archiver from 'archiver'
import { format } from 'date-fns'

interface ExportFiles {
  'README.md': string
  'ai-context.json': string
  'summary.json': string
  'transactions.csv': string
  'budgets.csv': string
  'goals.csv': string
  'accounts.csv': string
  'recurring-transactions.csv': string
  'categories.csv': string
}

export async function createExportZIP(files: ExportFiles): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', {
      zlib: { level: 9 }  // Maximum compression
    })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    const folderName = `wealth-export-${format(new Date(), 'yyyy-MM-dd')}`

    // Add each file to ZIP with organized structure
    Object.entries(files).forEach(([filename, content]) => {
      archive.append(content, { name: `${folderName}/${filename}` })
    })

    archive.finalize()
  })
}
```

**Testing ZIP utility:**

```typescript
// Test script (or manual test in tRPC endpoint)
const testFiles = {
  'README.md': '# Test Export\n\nThis is a test.',
  'ai-context.json': JSON.stringify({ version: '1.0' }, null, 2),
  'summary.json': JSON.stringify({ count: 0 }, null, 2),
  'transactions.csv': '\uFEFFDate,Payee,Amount\n2025-11-09,Test,100.00',
  // ... add minimal content for other files
}

const zipBuffer = await createExportZIP(testFiles)

// Write to file for manual validation
fs.writeFileSync('test-export.zip', zipBuffer)

// Extract and verify:
// - Windows: Right-click > Extract All
// - macOS: Double-click ZIP file
// - Linux: unzip test-export.zip
```

### Patterns to Follow

**From patterns.md:**
- AI Context Generator Patterns > Pattern 1
- Category hierarchy with cycle detection
- Pretty-printed JSON (2-space indent)
- Include currency in field descriptions and prompts
- ZIP generation with archiver library

### Testing Requirements

**AI Context Generator:**
1. Generate with sample data (5 categories, parent-child relationships)
2. Parse JSON to verify valid structure: `JSON.parse(output)`
3. Verify field descriptions are helpful (read through each one)
4. Verify AI prompts are specific and actionable
5. Test with empty categories (should not crash)
6. Test with circular parent reference (should prevent infinite loop)

**Archive Export Utility:**
1. Create ZIP with sample files (all 9 files)
2. Write to disk as `test-export.zip`
3. Extract on Windows (if available)
4. Extract on macOS (if available)
5. Extract on Linux
6. Verify:
   - Folder structure: `wealth-export-YYYY-MM-DD/`
   - All files present
   - File contents intact (no corruption)
   - Filenames correct

### Potential Split Strategy

**If AI context proves complex (>4 hours total):**

**Primary Builder-3 (AI Context):**
- Create `aiContextGenerator.ts`
- Implement field descriptions (all 6 data types)
- Implement category hierarchy builder
- Test JSON structure
- Estimate: 2-3 hours

**Sub-builder 3A (Archive + AI Prompts):**
- Install archiver dependency
- Create `archiveExport.ts` with ZIP utility
- Test ZIP generation and extraction
- Add AI prompts to AI context generator (5 templates)
- Estimate: 1-2 hours

**Recommendation:** Start as single builder. Split if AI prompt crafting takes longer than expected.

---

## Builder-4: tRPC Router + Database Migration

### Scope

Create centralized exports tRPC router with 6 data type export endpoints (transactions, budgets, goals, accounts, recurring transactions, categories). Each endpoint supports 3 formats (CSV, JSON, EXCEL). Also create ExportHistory database model with Prisma migration.

### Complexity Estimate

**MEDIUM-HIGH**

- 6 export endpoints to implement (moderate repetition)
- Format switching logic in each endpoint
- Database migration (single table, straightforward)
- Base64 encoding for binary transport
- Input validation with Zod schemas
- Integration with export utilities from Builders 1-3

### Success Criteria

- [ ] `exports.router.ts` created with 6 export procedures
- [ ] All endpoints use `.mutation()` type (prepare for ExportHistory logging in Iteration 15)
- [ ] Format switching works correctly (CSV/JSON/EXCEL)
- [ ] Base64 encoding/decoding for binary content (Excel)
- [ ] Input validation with Zod (format enum, optional dates)
- [ ] ExportHistory model added to schema.prisma
- [ ] Migration created and applied successfully in dev database
- [ ] User model updated with exportHistory relation
- [ ] Router registered in `root.ts`
- [ ] All 6 endpoints tested manually (18 total: 6 types × 3 formats)
- [ ] Sensitive data redacted (plaidAccessToken)

### Files to Create

- `src/server/api/routers/exports.router.ts` (~300-350 lines)
- `prisma/migrations/[timestamp]_add_export_history/migration.sql` (generated)

### Files to Modify

- `prisma/schema.prisma` - Add ExportHistory model, enums, User relation
- `src/server/api/root.ts` - Register exports router

### Dependencies

**Depends on:**
- Builder-1 (CSV generators for recurring, categories)
- Builder-2 (Excel generators for all 6 types)

**Blocks:** Integration phase (all exports must work before deployment)

### Implementation Notes

**1. Database Migration First:**

```prisma
// prisma/schema.prisma

// Add at end of file

model ExportHistory {
  id          String   @id @default(cuid())
  userId      String
  exportType  ExportType
  format      ExportFormat
  dataType    ExportDataType?  // null for COMPLETE exports
  dateRange   Json?            // { from: ISO string, to: ISO string }
  recordCount Int              // Number of records exported
  fileSize    Int              // Size in bytes
  blobKey     String?          // Vercel Blob storage key (null in Iteration 14)
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

// Update User model (find existing User model and add this line)
model User {
  // ... existing fields ...
  exportHistory ExportHistory[]  // ADD THIS LINE
}
```

**Run migration:**

```bash
npx prisma migrate dev --name add-export-history
npx prisma generate
```

**Verify migration:**
- Check `prisma/migrations/` folder for new migration
- Run `npx prisma migrate status` to confirm applied
- Check database in Prisma Studio: `npx prisma studio`

**2. Create exports.router.ts:**

See full implementation in `patterns.md` > "tRPC Export Router Patterns > Pattern 1"

**Endpoint structure (repeat 6 times):**

```typescript
// src/server/api/routers/exports.router.ts

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { format } from 'date-fns'
import { TRPCError } from '@trpc/server'

// Import CSV generators
import {
  generateTransactionCSV,
  generateBudgetCSV,
  generateGoalCSV,
  generateAccountCSV,
  generateRecurringTransactionCSV,
  generateCategoryCSV,
} from '@/lib/csvExport'

// Import Excel generators
import {
  generateTransactionExcel,
  generateBudgetExcel,
  generateGoalExcel,
  generateAccountExcel,
  generateRecurringTransactionExcel,
  generateCategoryExcel,
} from '@/lib/xlsxExport'

const ExportFormatEnum = z.enum(['CSV', 'JSON', 'EXCEL'])

export const exportsRouter = router({
  exportTransactions: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch data
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.startDate && input.endDate && {
            date: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 10000,  // Prevent memory overflow
      })

      // 2. Generate export based on format
      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateTransactionCSV(transactions)
          mimeType = 'text/csv;charset=utf-8'
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

      // 3. Generate filename
      const dateStr = input.startDate && input.endDate
        ? `${format(input.startDate, 'yyyy-MM-dd')}-to-${format(input.endDate, 'yyyy-MM-dd')}`
        : format(new Date(), 'yyyy-MM-dd')
      const filename = `wealth-transactions-${dateStr}.${extension}`

      // 4. Base64 encode for transport
      const base64Content = Buffer.from(content).toString('base64')

      // 5. Return export data
      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: transactions.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  // Repeat for: exportBudgets, exportGoals, exportAccounts,
  //             exportRecurringTransactions, exportCategories
})
```

**Special considerations for each endpoint:**

1. **exportBudgets:**
   - Calculate spent amount for each budget (aggregate transactions)
   - Calculate remaining amount (budgeted - spent)
   - Determine status (UNDER_BUDGET, AT_LIMIT, OVER_BUDGET)

2. **exportAccounts:**
   - Redact `plaidAccessToken` for security
   - Include `plaidAccountId` for reference (safe)
   - Use destructuring to remove sensitive field

3. **exportRecurringTransactions:**
   - Include frequency formatting (use helper from Builder-1)
   - Order by nextScheduledDate

4. **exportCategories:**
   - Include parent relationship
   - Show hierarchy in export

**3. Register router:**

```typescript
// src/server/api/root.ts

import { exportsRouter } from './routers/exports.router'  // ADD THIS

export const appRouter = router({
  // ... existing routers ...
  exports: exportsRouter,  // ADD THIS
})
```

**4. Testing Strategy:**

Manual testing with Postman or tRPC client:

```typescript
// Example client call (for future UI implementation)
const result = await trpc.exports.exportTransactions.mutate({
  format: 'CSV',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-11-09'),
})

// Decode base64 content
const content = Buffer.from(result.content, 'base64').toString('utf-8')

// Trigger download (client-side)
const blob = new Blob([content], { type: result.mimeType })
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = result.filename
link.click()
URL.revokeObjectURL(url)
```

### Patterns to Follow

**From patterns.md:**
- tRPC Export Router Patterns > Pattern 1 (Export Endpoint with Format Switching)
- Router Registration pattern (Pattern 2)
- Database Patterns > Pattern 1 (Prisma Schema Model)
- Error Handling > Empty Dataset Handling, Large Dataset Warning

### Testing Requirements

**Database Migration:**
- [ ] Migration runs without errors
- [ ] ExportHistory table exists in database
- [ ] All 3 enums created (ExportType, ExportFormat, ExportDataType)
- [ ] User relation works (check in Prisma Studio)
- [ ] Indexes created on userId, createdAt, expiresAt

**tRPC Endpoints (Manual Testing):**

For EACH of 6 endpoints, test all 3 formats:

1. **exportTransactions:**
   - CSV format with date range
   - JSON format without date range
   - EXCEL format with date range

2. **exportBudgets:**
   - CSV format (verify spent/remaining calculated correctly)
   - JSON format
   - EXCEL format

3. **exportGoals:**
   - CSV format
   - JSON format (verify progress percentage calculated)
   - EXCEL format

4. **exportAccounts:**
   - CSV format (verify plaidAccessToken redacted)
   - JSON format (verify no sensitive data)
   - EXCEL format

5. **exportRecurringTransactions:**
   - CSV format (verify frequency formatted)
   - JSON format
   - EXCEL format

6. **exportCategories:**
   - CSV format (verify parent names)
   - JSON format (verify hierarchy)
   - EXCEL format

**Edge Cases:**
- Export with 0 records (should return empty file with headers)
- Export with 10k+ records (should complete, monitor time)
- Export with invalid format enum (should fail validation)
- Export with invalid date range (end < start) - should work or validate?

**Performance Monitoring:**
- Add timing logs to each endpoint
- Log: `console.log(`Export ${input.format} completed in ${duration}ms, ${recordCount} records`)`
- Track slow queries (>5s)

### Potential Split Strategy

**If implementation takes >5 hours, consider split:**

**Primary Builder-4 (Database + 3 Endpoints):**
- Create and run database migration
- Implement exportTransactions, exportBudgets, exportGoals
- Test all 3 formats for each
- Document patterns for sub-builder
- Estimate: 3-4 hours

**Sub-builder 4A (Remaining 3 Endpoints):**
- Implement exportAccounts, exportRecurringTransactions, exportCategories
- Follow patterns from primary builder
- Test all 3 formats
- Register router in root.ts
- Estimate: 2-3 hours

**Recommendation:** Start as single builder. Split if blocked by Builder-1 or Builder-2 dependencies.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies - Start Immediately)

**Builder-1: Analytics Bug Fix + CSV Extensions**
- Can start immediately
- Priority 0: Fix bug first (validates infrastructure)
- Then add CSV extensions
- Blocks Builder-4 (validates date filtering works)

**Builder-2: Excel Export Utility**
- Can start immediately
- Independent from other builders
- Blocks Builder-4 (provides Excel generators)

**Builder-3: AI Context + Archive Utility**
- Can start immediately
- Independent from other builders
- Used in Iteration 15 (not blocking Iteration 14)

### Parallel Group 2 (Depends on Group 1)

**Builder-4: tRPC Router + Database**
- Wait for Builder-1 bug fix validation (30-60 minutes)
- Wait for Builder-1 CSV extensions (optional, can stub)
- Wait for Builder-2 Excel generators (optional, can stub)
- Can start database migration immediately
- Can stub missing imports and implement later

**Recommended Order:**
1. Builder-1 starts (fixes bug, validates infrastructure)
2. Builders 2, 3, 4 start in parallel after 30-60 minutes
3. Builder-4 initially stubs imports, implements endpoints as Builders 1-2 complete
4. All builders finish within 10-12 hours
5. Integration phase: 30 minutes

---

## Integration Notes

**Shared Files (Conflict Prevention):**

- `csvExport.ts`: Builder-1 modifies (adds 2 functions), others import only
- `schema.prisma`: Builder-4 modifies (adds model), others review
- `root.ts`: Builder-4 modifies (1 line), minimal conflict risk

**Integration Validation Checklist:**

After all builders complete:

1. [ ] All imports resolve correctly (no TypeScript errors)
2. [ ] Database migration applied successfully
3. [ ] All 6 tRPC endpoints callable (manual test with Postman or tRPC client)
4. [ ] CSV exports work for all 6 data types
5. [ ] Excel exports work for all 6 data types
6. [ ] JSON exports work for all 6 data types
7. [ ] AI context generator produces valid JSON
8. [ ] Archive utility creates valid ZIP files
9. [ ] Analytics bug is fixed (users can export from Analytics page)
10. [ ] No compilation errors (`npm run build`)
11. [ ] No linting errors (`npm run lint`)

**Integration Builder Responsibilities:**

- Pull all feature branches
- Resolve any merge conflicts
- Run full test suite
- Deploy to dev environment
- Validate all 18 export combinations (6 types × 3 formats)
- Create deployment checklist for production

---

## Post-Integration Deployment

**Deployment Steps:**

1. Merge all feature branches to main
2. Run database migration in production: `npx prisma migrate deploy`
3. Verify ExportHistory table exists
4. Deploy code to Vercel
5. Smoke test: Call one export endpoint via API client
6. Monitor logs for errors

**Rollback Plan:**

- Database migration can be rolled back (if needed)
- Code changes are backward compatible (no UI changes)
- New endpoints not called until Iteration 15 UI deployed

---

**Builder Tasks Status:** ✅ COMPLETE
**Total Builders:** 4
**Estimated Duration:** 10-12 hours
**Integration Time:** 30 minutes
**Ready for:** Builder Execution
