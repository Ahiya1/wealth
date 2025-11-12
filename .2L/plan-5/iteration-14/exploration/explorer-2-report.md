# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

The export system requires strategic dependency additions (archiver for ZIP, @vercel/blob for caching) while leveraging existing infrastructure (xlsx already installed, robust tRPC patterns established). Critical finding: Analytics export date range bug is a client-side date format issue, not a backend problem. The project has strong foundations with comprehensive testing infrastructure (Vitest), clean CSV/JSON utilities, and mature tRPC router patterns that can be extended for new export endpoints.

## Discoveries

### Existing Export Infrastructure (Strong Foundation)

**CSV Export Utilities (src/lib/csvExport.ts)**
- Already supports: Transactions, Budgets, Goals, Accounts
- UTF-8 BOM included for Excel compatibility (line 72, 105, 135, 159)
- Proper quote escaping for payee names and notes
- Decimal handling for Prisma Decimal types (converts to number for CSV)
- Missing: Recurring transactions, Categories

**JSON Export Utilities (src/lib/jsonExport.ts)**
- Complete data export with metadata (exportedAt, version)
- Recursive Decimal sanitization (handles nested objects and arrays)
- Pretty-printed JSON (2-space indent)
- Missing: AI-context metadata, recurring transactions, categories

**tRPC Export Endpoint (users.router.ts:76-123)**
- exportAllData query working (fetches 5 data types in parallel)
- Hard limit: 10,000 transactions (line 87)
- Returns JSON string + filename
- Missing: Format options (CSV/Excel), date range filters, export history

### Dependencies Analysis

**Already Installed**
- xlsx@0.18.5 (devDependency) - Excel workbook generation
- date-fns@3.6.0 - Date formatting (used in existing exports)
- @prisma/client@5.22.0 - Database ORM with Decimal type support

**Need to Install (Iteration 1)**
- archiver@7.0.1 OR jszip@3.10.1 - ZIP file generation
- @vercel/blob@2.0.0 - Cloud storage for export caching (Iteration 2)

**Recommendation: Use `archiver` over `jszip`**

Reasoning:
1. Streaming support: archiver supports streaming large files, jszip loads everything into memory
2. Node.js optimized: archiver is designed for Node.js backend, jszip targets browsers
3. Better for server-side ZIP generation with potentially 10k+ transaction records
4. Industry standard for server-side archiving (7M+ weekly downloads vs 3M for jszip)

**Installation Commands:**
```bash
npm install archiver
npm install --save-dev @types/archiver
npm install @vercel/blob  # Iteration 2
```

### Database Schema Requirements

**ExportHistory Model (New - Add to schema.prisma)**

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

**Migration Command:**
```bash
npx prisma migrate dev --name add-export-history
```

**User Model Update (Add relation):**
```prisma
model User {
  // ... existing fields ...
  exportHistory ExportHistory[]
}
```

### Export Format Specifications

**CSV Format (RFC 4180 Compliance)**
- Header row: Column names
- Data rows: Comma-separated values
- UTF-8 BOM prefix: \uFEFF (Excel compatibility for international characters)
- Quote escaping: Replace " with "" inside quoted fields
- Decimal precision: 2 decimal places for amounts (.toFixed(2))
- Date format: ISO 8601 (YYYY-MM-DD) for consistency

**JSON Format (AI-Friendly)**
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-11-09T20:30:00Z",
  "user": {
    "currency": "NIS",
    "timezone": "America/New_York"
  },
  "data": {
    "transactions": [...],
    "budgets": [...],
    "goals": [...],
    "accounts": [...],
    "recurringTransactions": [...],
    "categories": [...]
  }
}
```

**Excel Format (Single Sheet per Data Type)**
- Library: xlsx@0.18.5 (already installed)
- Format: .xlsx (Excel 2007+)
- Sheet structure: Same columns as CSV
- Cell formatting: Currency cells with 2 decimals, Date cells as Date type
- Auto-column width based on content

**Code Pattern (xlsxExport.ts):**
```typescript
import * as XLSX from 'xlsx'

export function generateTransactionExcel(transactions: Transaction[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map(txn => ({
      Date: format(txn.date, 'yyyy-MM-dd'),
      Payee: txn.payee,
      Category: txn.category.name,
      Account: txn.account.name,
      Amount: Number(txn.amount),
      Tags: txn.tags.join(', '),
      Notes: txn.notes || ''
    }))
  )
  
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')
  
  // Return buffer for download
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
```

### AI Context Metadata Structure

**ai-context.json Specification**

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-11-09T20:30:00Z",
  "user": {
    "currency": "NIS",
    "timezone": "America/New_York",
    "locale": "en-US"
  },
  
  "fieldDescriptions": {
    "transaction": {
      "date": "Transaction date in YYYY-MM-DD format",
      "amount": "Transaction amount in NIS. Negative values = expenses, Positive values = income",
      "payee": "Merchant or person who received/sent payment",
      "category": "Spending category (see categories section for hierarchy)",
      "account": "Account used for transaction",
      "tags": "User-defined tags for organization",
      "notes": "Optional transaction notes"
    },
    "budget": {
      "month": "Budget month in YYYY-MM format",
      "budgeted": "Allocated budget amount in NIS",
      "spent": "Actual amount spent in NIS",
      "remaining": "Remaining budget (budgeted - spent)",
      "status": "UNDER_BUDGET | AT_LIMIT | OVER_BUDGET"
    },
    "goal": {
      "name": "Goal name",
      "targetAmount": "Target amount to save/pay off in NIS",
      "currentAmount": "Current progress amount in NIS",
      "progress": "Progress percentage (0-100)",
      "targetDate": "Target completion date (YYYY-MM-DD)",
      "type": "SAVINGS | DEBT_PAYOFF | INVESTMENT",
      "status": "NOT_STARTED | IN_PROGRESS | COMPLETED"
    },
    "account": {
      "name": "Account name",
      "type": "CHECKING | SAVINGS | CREDIT | INVESTMENT | CASH",
      "balance": "Current account balance in NIS",
      "connected": "Plaid (auto-synced) or Manual (user-entered)",
      "status": "Active or Inactive"
    },
    "recurringTransaction": {
      "frequency": "DAILY | WEEKLY | BIWEEKLY | MONTHLY | YEARLY",
      "interval": "Frequency multiplier (e.g., 2 for every 2 weeks)",
      "nextScheduledDate": "Next date this transaction will be generated",
      "status": "ACTIVE | PAUSED | COMPLETED | CANCELLED"
    }
  },
  
  "categories": {
    "hierarchy": {
      "Groceries": { "parent": "Food & Dining", "icon": "shopping-cart", "color": "#10b981" },
      "Restaurants": { "parent": "Food & Dining", "icon": "utensils", "color": "#10b981" },
      "Rent": { "parent": "Housing", "icon": "home", "color": "#3b82f6" }
      // ... full category tree
    }
  },
  
  "enums": {
    "AccountType": ["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "CASH"],
    "BudgetStatus": ["UNDER_BUDGET", "AT_LIMIT", "OVER_BUDGET"],
    "GoalType": ["SAVINGS", "DEBT_PAYOFF", "INVESTMENT"],
    "GoalStatus": ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
    "RecurrenceFrequency": ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"],
    "RecurringTransactionStatus": ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]
  },
  
  "aiPrompts": {
    "spendingAnalysis": "Analyze my spending patterns in transactions.csv. Focus on: 1) Top spending categories, 2) Month-over-month trends, 3) Unusual transactions, 4) Opportunities to save. Provide actionable insights.",
    
    "budgetReview": "Review my budgets.csv and transactions.csv. Tell me: 1) Which budgets am I exceeding and why? 2) Which have room left? 3) Suggestions for next month's budgets based on actual spending patterns.",
    
    "goalProgress": "Check goals.csv against accounts.csv. How am I tracking toward my goals? Calculate if I'm on pace to meet target dates. Provide recommendations to accelerate progress.",
    
    "recurringOptimization": "Analyze recurring-transactions.csv. Identify: 1) Subscriptions I might not need, 2) Opportunities to negotiate lower rates, 3) Recurring expenses that have increased over time.",
    
    "financialHealth": "Provide a comprehensive financial health assessment using all CSV files. Include: 1) Income vs expenses ratio, 2) Savings rate, 3) Budget adherence, 4) Goal progress, 5) Top recommendations for improvement."
  },
  
  "statistics": {
    "recordCounts": {
      "transactions": 1247,
      "budgets": 12,
      "goals": 3,
      "accounts": 4,
      "recurringTransactions": 8,
      "categories": 45
    },
    "dateRange": {
      "earliest": "2024-01-01",
      "latest": "2025-11-09"
    }
  }
}
```

**Generator Implementation (aiContextGenerator.ts):**
```typescript
interface AIContextData {
  user: { currency: string; timezone: string }
  categories: Category[]
  statistics: {
    transactions: number
    budgets: number
    goals: number
    accounts: number
    recurringTransactions: number
    categories: number
  }
  dateRange: { earliest: Date; latest: Date } | null
}

export function generateAIContext(data: AIContextData): string {
  const context = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    user: {
      currency: data.user.currency,
      timezone: data.user.timezone,
      locale: 'en-US'
    },
    fieldDescriptions: { /* ... from template above ... */ },
    categories: {
      hierarchy: buildCategoryHierarchy(data.categories)
    },
    enums: { /* ... from template above ... */ },
    aiPrompts: { /* ... from template above ... */ },
    statistics: {
      recordCounts: data.statistics,
      dateRange: data.dateRange ? {
        earliest: format(data.dateRange.earliest, 'yyyy-MM-dd'),
        latest: format(data.dateRange.latest, 'yyyy-MM-dd')
      } : null
    }
  }
  
  return JSON.stringify(context, null, 2)
}

function buildCategoryHierarchy(categories: Category[]) {
  const hierarchy: Record<string, any> = {}
  
  for (const cat of categories) {
    const parent = categories.find(c => c.id === cat.parentId)
    hierarchy[cat.name] = {
      parent: parent?.name || null,
      icon: cat.icon,
      color: cat.color
    }
  }
  
  return hierarchy
}
```

### ZIP Package Structure

**Complete Export Package Layout:**
```
wealth-export-2025-11-09/
├── README.md                      (Usage guide, AI prompts, data dictionary)
├── ai-context.json                (AI-friendly metadata)
├── summary.json                   (Export metadata: date, counts, user info)
├── transactions.csv               (All transactions)
├── recurring-transactions.csv     (Recurring transaction templates)
├── budgets.csv                    (Monthly budgets with spent/remaining)
├── goals.csv                      (Financial goals with progress)
├── accounts.csv                   (Account balances and details)
└── categories.csv                 (Category hierarchy and metadata)
```

**archiveExport.ts Implementation:**
```typescript
import archiver from 'archiver'
import { Readable } from 'stream'

interface ExportPackageData {
  user: { email: string; currency: string; timezone: string }
  files: {
    transactions: string      // CSV content
    recurring: string
    budgets: string
    goals: string
    accounts: string
    categories: string
    readme: string
    aiContext: string
    summary: string
  }
}

export async function createExportZIP(data: ExportPackageData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)
    
    const folderName = `wealth-export-${format(new Date(), 'yyyy-MM-dd')}`
    
    // Add files to ZIP
    archive.append(data.files.readme, { name: `${folderName}/README.md` })
    archive.append(data.files.aiContext, { name: `${folderName}/ai-context.json` })
    archive.append(data.files.summary, { name: `${folderName}/summary.json` })
    archive.append(data.files.transactions, { name: `${folderName}/transactions.csv` })
    archive.append(data.files.recurring, { name: `${folderName}/recurring-transactions.csv` })
    archive.append(data.files.budgets, { name: `${folderName}/budgets.csv` })
    archive.append(data.files.goals, { name: `${folderName}/goals.csv` })
    archive.append(data.files.accounts, { name: `${folderName}/accounts.csv` })
    archive.append(data.files.categories, { name: `${folderName}/categories.csv` })
    
    archive.finalize()
  })
}
```

### README.md Template

**Complete Export Package README:**
```markdown
# Wealth Financial Data Export

**Exported:** 2025-11-09 at 20:30 UTC
**Currency:** NIS (₪)
**Timezone:** America/New_York

---

## Files Included

| File | Description | Records |
|------|-------------|---------|
| transactions.csv | All your transactions | 1,247 |
| recurring-transactions.csv | Recurring transaction templates | 8 |
| budgets.csv | Monthly budgets and spending | 12 |
| goals.csv | Financial goals and progress | 3 |
| accounts.csv | Account balances and info | 4 |
| categories.csv | Category structure and metadata | 45 |
| ai-context.json | Field descriptions and AI prompts | - |
| summary.json | Export metadata and statistics | - |

---

## Quick Start: Analyze with AI

### Option 1: Copy-Paste (Fastest)

1. Open `ai-context.json` in a text editor
2. Copy the entire contents
3. Open ChatGPT or Claude
4. Paste and say: "I've exported my financial data. Here's the context: [paste]"
5. Upload or paste `transactions.csv`
6. Ask: "Analyze my spending patterns and give me insights"

### Option 2: File Upload

1. Upload `transactions.csv` directly to ChatGPT/Claude
2. Include this prompt:
   ```
   This is my financial transaction history from Wealth app.
   Currency: NIS (₪), negative = expense, positive = income.
   Analyze my spending patterns: top categories, trends, opportunities to save.
   ```

---

## Recommended AI Prompts

### Spending Analysis
```
Analyze my spending patterns in transactions.csv. Focus on:
1. Top spending categories by amount and frequency
2. Month-over-month spending trends
3. Unusual or one-time large transactions
4. Opportunities to reduce spending
Provide actionable insights with specific numbers.
```

### Budget Review
```
Review my budgets.csv against transactions.csv:
1. Which budgets am I exceeding and why?
2. Which categories have budget remaining?
3. Suggest budget adjustments for next month based on actual spending
Compare budgeted vs actual for each category.
```

### Goal Progress Check
```
Check my goals.csv against accounts.csv:
1. Am I on track to meet my goal target dates?
2. How much should I save monthly to reach each goal on time?
3. Recommendations to accelerate progress
Calculate exact savings needed per month.
```

### Recurring Expense Optimization
```
Analyze recurring-transactions.csv:
1. Identify subscriptions or recurring expenses I might not need
2. Highlight recurring expenses that have increased
3. Suggest alternatives or negotiation opportunities
Focus on subscription fatigue and unnecessary recurring charges.
```

### Comprehensive Financial Health
```
Provide a financial health assessment using all CSV files:
1. Income vs expenses ratio (calculate from transactions)
2. Savings rate and emergency fund coverage
3. Budget adherence percentage
4. Goal progress trajectory
5. Top 3 recommendations to improve financial health
Give me a score out of 100 and explain the rating.
```

---

## Data Dictionary

### Transactions (transactions.csv)

| Column | Type | Description |
|--------|------|-------------|
| Date | YYYY-MM-DD | Transaction date |
| Payee | String | Merchant or person |
| Category | String | Spending category |
| Account | String | Account used |
| Amount | Number | Amount in NIS (negative = expense, positive = income) |
| Tags | String | Comma-separated tags |
| Notes | String | Optional transaction notes |

**Examples:**
- Expense: `-87.43` (spent 87.43 NIS)
- Income: `3500.00` (received 3,500 NIS)

### Budgets (budgets.csv)

| Column | Type | Description |
|--------|------|-------------|
| Month | YYYY-MM | Budget month |
| Category | String | Budget category |
| Budgeted | Number | Allocated amount (NIS) |
| Spent | Number | Amount spent (NIS) |
| Remaining | Number | Budget remaining (NIS, negative = over budget) |
| Status | Enum | UNDER_BUDGET, AT_LIMIT, OVER_BUDGET |

### Goals (goals.csv)

| Column | Type | Description |
|--------|------|-------------|
| Goal | String | Goal name |
| Target Amount | Number | Target amount (NIS) |
| Current Amount | Number | Current progress (NIS) |
| Progress % | Number | Completion percentage |
| Target Date | YYYY-MM-DD | Goal deadline |
| Linked Account | String | Account for this goal (or "None") |
| Status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED |

### Accounts (accounts.csv)

| Column | Type | Description |
|--------|------|-------------|
| Name | String | Account name |
| Type | Enum | CHECKING, SAVINGS, CREDIT, INVESTMENT, CASH |
| Balance | Number | Current balance (NIS) |
| Connected | String | "Plaid" (auto-synced) or "Manual" (user-entered) |
| Status | String | "Active" or "Inactive" |
| Last Updated | Timestamp | Last sync or update time |

### Recurring Transactions (recurring-transactions.csv)

| Column | Type | Description |
|--------|------|-------------|
| Payee | String | Recurring payee |
| Amount | Number | Transaction amount (NIS) |
| Category | String | Category |
| Account | String | Account |
| Frequency | String | Human-readable frequency (e.g., "Every 2 weeks on Monday") |
| Next Date | YYYY-MM-DD | Next scheduled occurrence |
| Status | Enum | ACTIVE, PAUSED, COMPLETED, CANCELLED |

### Categories (categories.csv)

| Column | Type | Description |
|--------|------|-------------|
| Name | String | Category name |
| Parent | String | Parent category (or "None" for top-level) |
| Icon | String | Lucide icon name |
| Color | String | Hex color code |
| Type | String | "Default" (system) or "Custom" (user-created) |

---

## File Formats

**CSV:** RFC 4180 compliant, UTF-8 with BOM for Excel compatibility
**JSON:** Pretty-printed with 2-space indentation
**Dates:** ISO 8601 format (YYYY-MM-DD)
**Numbers:** 2 decimal places for currency amounts

---

## Privacy & Security

- This export contains your complete financial history
- Store securely (encrypted drive, password manager)
- When sharing with AI tools, ensure you trust the platform
- Delete exports from AI chat history after analysis if concerned

---

## Support

Questions about your data? Contact support@wealth.app

**Export Version:** 1.0
**Generated by:** Wealth App Export System
```

## Patterns Identified

### Pattern 1: tRPC Router Extensions

**Description:** All data access follows consistent tRPC router pattern with protectedProcedure, input validation via Zod, and Prisma queries.

**Use Case:** Creating new export endpoints (exportTransactions, exportBudgets, etc.)

**Example:**
```typescript
// src/server/api/routers/exports.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const exportsRouter = router({
  exportTransactions: protectedProcedure
    .input(z.object({
      format: z.enum(['CSV', 'JSON', 'EXCEL']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
      let filename: string
      
      switch (input.format) {
        case 'CSV':
          content = generateTransactionCSV(transactions)
          mimeType = 'text/csv'
          filename = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
          break
        case 'JSON':
          content = JSON.stringify(transactions, null, 2)
          mimeType = 'application/json'
          filename = `transactions-${format(new Date(), 'yyyy-MM-dd')}.json`
          break
        case 'EXCEL':
          content = generateTransactionExcel(transactions)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          filename = `transactions-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
          break
      }
      
      // Log export to history
      await ctx.prisma.exportHistory.create({
        data: {
          userId: ctx.user.id,
          exportType: 'QUICK',
          format: input.format,
          dataType: 'TRANSACTIONS',
          recordCount: transactions.length,
          fileSize: Buffer.byteLength(content),
          dateRange: input.startDate && input.endDate ? {
            from: input.startDate.toISOString(),
            to: input.endDate.toISOString()
          } : null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
      
      return {
        content: content.toString('base64'), // Base64 encode for transport
        filename,
        mimeType,
        recordCount: transactions.length
      }
    })
})
```

**Recommendation:** Use this pattern for all 6 data type exports (transactions, budgets, goals, accounts, recurring, categories).

### Pattern 2: Decimal Handling

**Description:** Prisma returns Decimal objects for monetary values; must convert to number for JSON/CSV serialization.

**Use Case:** All export utilities when handling amount, balance, targetAmount fields.

**Example (from jsonExport.ts:17-33):**
```typescript
const sanitizeDecimals = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'object' && 'toNumber' in obj) {
    return (obj as { toNumber: () => number }).toNumber()
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDecimals)
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      result[key] = sanitizeDecimals((obj as Record<string, unknown>)[key])
    }
    return result
  }
  return obj
}
```

**Recommendation:** Reuse this utility in all export generators. For CSV/Excel, use `Number(decimal.toString()).toFixed(2)` for 2-decimal precision.

### Pattern 3: Parallel Data Fetching

**Description:** Use Promise.all() to fetch multiple data types simultaneously, reducing database roundtrips.

**Use Case:** Complete export package generation (fetch all 6 data types).

**Example (from users.router.ts:78-103):**
```typescript
const [accounts, transactions, budgets, goals, categories] = await Promise.all([
  ctx.prisma.account.findMany({
    where: { userId: ctx.user.id },
    orderBy: { name: 'asc' }
  }),
  ctx.prisma.transaction.findMany({
    where: { userId: ctx.user.id },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: 10000
  }),
  ctx.prisma.budget.findMany({
    where: { userId: ctx.user.id },
    include: { category: true },
    orderBy: { month: 'desc' }
  }),
  ctx.prisma.goal.findMany({
    where: { userId: ctx.user.id },
    include: { linkedAccount: true },
    orderBy: { createdAt: 'desc' }
  }),
  ctx.prisma.category.findMany({
    where: { userId: ctx.user.id },
    orderBy: { name: 'asc' }
  })
])
```

**Recommendation:** Use this pattern for exportComplete endpoint. Extend to include recurringTransactions:
```typescript
const [accounts, transactions, budgets, goals, categories, recurringTransactions] = await Promise.all([
  // ... existing queries ...
  ctx.prisma.recurringTransaction.findMany({
    where: { userId: ctx.user.id },
    include: { category: true, account: true },
    orderBy: { nextScheduledDate: 'asc' }
  })
])
```

### Pattern 4: Client-Side Download

**Description:** Create Blob, generate object URL, trigger download via hidden link element.

**Use Case:** Browser file downloads (CSV, JSON, Excel, ZIP).

**Example (from csvExport.ts:162-176):**
```typescript
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url) // Cleanup
}
```

**Recommendation:** Create generic `downloadFile(content: string | Buffer, filename: string, mimeType: string)` utility. Add Web Share API detection for mobile:
```typescript
export async function downloadOrShare(
  content: string | Buffer,
  filename: string,
  mimeType: string
): Promise<void> {
  const blob = new Blob([content], { type: mimeType })
  
  // Mobile: Use Web Share API if available
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: mimeType })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Wealth Export',
        text: `Financial data export: ${filename}`
      })
      return
    }
  }
  
  // Desktop: Standard download
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### Pattern 5: Vitest Testing

**Description:** Existing test infrastructure uses Vitest with mocked Prisma client.

**Use Case:** Testing export endpoints, utilities, and validation logic.

**Example (from src/server/api/routers/__tests__/transactions.router.test.ts):**
```typescript
import { describe, it, expect } from 'vitest'

describe('exportsRouter', () => {
  describe('exportTransactions', () => {
    it('should export transactions in CSV format', () => {
      // TODO: Implement with mocked Prisma
      expect(true).toBe(true)
    })
    
    it('should include UTF-8 BOM in CSV exports', () => {
      // TODO: Verify BOM prefix
      expect(true).toBe(true)
    })
    
    it('should respect date range filters', () => {
      // TODO: Verify filtered results
      expect(true).toBe(true)
    })
  })
})
```

**Recommendation:** Prioritize integration tests over unit tests. Test critical paths:
1. CSV UTF-8 BOM validation (open in Excel, check special characters)
2. Excel file validity (open in Excel, Google Sheets, Numbers)
3. ZIP structure validation (extract, verify file list)
4. AI context JSON schema validation (parse, verify required fields)

## Complexity Assessment

### High Complexity Areas

**1. Complete ZIP Export Package (Builder-14-1)**
- Why complex: 8 files to generate (CSV x6, README, ai-context.json, summary.json), coordinate ZIP archival, handle large datasets (10k+ transactions), ensure consistent date/decimal formatting across all files
- Estimated builder splits: 1 primary builder (can handle with sequential implementation)
- Risk mitigation: Use existing CSV generators, extend incrementally, test with small datasets first
- Time estimate: 6-8 hours

**2. Vercel Blob Storage Integration (Builder-14-2)**
- Why complex: New dependency (@vercel/blob), environment configuration (BLOB_READ_WRITE_TOKEN), upload/download logic, cache expiration handling, cleanup cron job
- Estimated builder splits: 1 primary builder (sequential: storage integration → export history → cleanup)
- Risk mitigation: Start with filesystem fallback, migrate to Blob Storage after core exports work
- Time estimate: 4-6 hours

**3. Excel Export Utility (xlsxExport.ts)**
- Why complex: 6 data types to support, cell formatting (currency, dates), column width auto-sizing, Decimal to number conversion, buffer handling
- Estimated builder splits: 1 primary builder (reuse CSV data transformation patterns)
- Risk mitigation: Use xlsx library documentation, test with real Excel/Google Sheets/Numbers
- Time estimate: 4-5 hours

### Medium Complexity Areas

**4. AI Context Generator (aiContextGenerator.ts)**
- Why complex: Category hierarchy traversal (parent-child relationships), metadata collection from multiple data types, prompt template design
- Time estimate: 3-4 hours
- Risk: AI prompts might need iteration based on user feedback (defer refinement to post-MVP)

**5. Export History Tracking**
- Why complex: New database model, migration, query optimization (index on userId, createdAt, expiresAt)
- Time estimate: 2-3 hours
- Risk: Migration conflicts if schema changes during development (coordinate with planner)

**6. README.md Template Generator**
- Why complex: Dynamic content (record counts, date ranges), markdown formatting, maintain single source of truth
- Time estimate: 2-3 hours
- Risk: Template drift (keep example in code comments, generate programmatically)

### Low Complexity Areas

**7. CSV Export Extensions (Recurring, Categories)**
- Why straightforward: Follow existing csvExport.ts patterns, simple table structures
- Time estimate: 1-2 hours (both data types)

**8. tRPC Export Endpoints**
- Why straightforward: Copy transactions.router.ts patterns, change data type queries
- Time estimate: 2-3 hours (all 6 endpoints)

**9. Date Range Filter Fix (Analytics Bug)**
- Why straightforward: Client-side date format issue, fix in analytics/page.tsx
- Time estimate: 30 minutes - 1 hour
- Risk: Low (isolated to one page)

## Technology Recommendations

### Primary Stack

**ZIP Generation: archiver@7.0.1**
- Rationale: Node.js optimized, streaming support for large files, industry standard (7M+ weekly downloads)
- Alternative: jszip (browser-focused, loads into memory, not ideal for 10k+ transaction exports)
- Installation: `npm install archiver && npm install --save-dev @types/archiver`

**Excel Generation: xlsx@0.18.5 (Already Installed)**
- Rationale: Already a devDependency, supports .xlsx format, mature library (20M+ weekly downloads)
- No action needed: Verify works with `import * as XLSX from 'xlsx'`

**Cloud Storage: @vercel/blob@2.0.0**
- Rationale: Free tier (1GB), Vercel-native integration, simple API, automatic CDN distribution
- Installation: `npm install @vercel/blob` (Defer to Iteration 2)
- Configuration: Add BLOB_READ_WRITE_TOKEN to .env (get from Vercel dashboard)

**Date Formatting: date-fns@3.6.0 (Already Installed)**
- Rationale: Already used in csvExport.ts, lightweight, tree-shakeable
- Use cases: ISO 8601 dates (format(date, 'yyyy-MM-dd')), human-readable timestamps

### Supporting Libraries

**None Required**
- All other needs met by existing dependencies:
  - Prisma Client (database queries, Decimal handling)
  - Zod (input validation in tRPC routers)
  - SuperJSON (tRPC serialization, handles Date objects)

### Configuration Requirements

**Environment Variables (.env)**
```bash
# Iteration 2 - Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Already configured
CRON_SECRET="..."  # For cleanup cron job authentication
```

**Vercel Configuration (vercel.json)**
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

## Integration Points

### External APIs

**Vercel Blob Storage**
- Purpose: Cache exports for 30-day re-download
- Complexity: Low (simple put/get/delete API)
- Considerations:
  - Free tier: 1GB storage, 100GB bandwidth/month
  - Automatic CDN distribution (fast downloads globally)
  - Presigned URLs for secure direct downloads
  - Token rotation strategy (use Vercel environment variables)
- Code Example:
```typescript
import { put, del } from '@vercel/blob'

// Upload export
const blob = await put(`exports/${userId}/${exportId}.zip`, zipBuffer, {
  access: 'public',
  addRandomSuffix: false
})

// Store blob.url in ExportHistory.blobKey

// Download: Return blob.url to client (presigned, CDN-cached)

// Cleanup (cron job)
await del(blobKey)
```

### Internal Integrations

**tRPC Client ↔ Export Utilities**
- How they connect: tRPC routers (server) call export utility functions (src/lib/), return generated content to client
- Data flow: Client → tRPC mutation → Prisma query → Export utility → Generated file → Base64 encode → Client → Decode → Download
- Example:
```typescript
// Client (Settings page)
const exportMutation = trpc.exports.exportTransactions.useMutation()
const handleExport = async () => {
  const result = await exportMutation.mutateAsync({
    format: 'CSV',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-11-09')
  })
  
  // Decode base64 content
  const content = atob(result.content)
  downloadFile(content, result.filename, result.mimeType)
}
```

**Export History ↔ Cleanup Cron**
- How they connect: Cron endpoint (src/app/api/cron/cleanup-exports/route.ts) queries ExportHistory, deletes expired records and Blob Storage files
- Data flow: Vercel Cron → Cron endpoint → Prisma query (expiresAt < now) → Delete from Blob → Delete ExportHistory records
- Example:
```typescript
// src/app/api/cron/cleanup-exports/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const expiredExports = await prisma.exportHistory.findMany({
    where: { expiresAt: { lt: new Date() } }
  })
  
  // Delete from Blob Storage
  for (const exp of expiredExports) {
    if (exp.blobKey) {
      await del(exp.blobKey)
    }
  }
  
  // Delete from database
  await prisma.exportHistory.deleteMany({
    where: { id: { in: expiredExports.map(e => e.id) } }
  })
  
  return Response.json({
    deleted: expiredExports.length,
    freedBytes: expiredExports.reduce((sum, e) => sum + e.fileSize, 0)
  })
}
```

**Settings Page ↔ Export Center UI**
- How they connect: Settings/Data page (src/app/(dashboard)/settings/data/page.tsx) uses tRPC hooks to trigger exports, display history
- Components needed:
  - ExportCard (reusable card with format selector)
  - ExportHistoryTable (display past exports with re-download)
  - FormatSelector (dropdown: CSV, JSON, Excel)
  - ExportProgressBar (loading state for large exports)
- State management: React useState for format selection, tRPC mutations for export actions

## Risks & Challenges

### Technical Risks

**1. Large Dataset Memory Exhaustion**
- Risk: Users with 10k+ transactions could cause memory overflow when generating ZIP packages
- Impact: High (export failures, server crashes)
- Mitigation Strategy:
  - Use streaming with archiver (don't load all files into memory)
  - Implement pagination if transaction count exceeds 10k (split into multiple CSVs)
  - Add hard limit: 50k transactions per export (show warning, suggest date range filtering)
  - Monitor export duration in tRPC endpoints (timeout after 30s)
- Code Example:
```typescript
// Check transaction count before export
const txnCount = await ctx.prisma.transaction.count({
  where: { userId: ctx.user.id }
})

if (txnCount > 50000) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Too many transactions. Please use date range filters to export smaller batches.'
  })
}
```

**2. Excel File Compatibility**
- Risk: Generated .xlsx files might not open correctly in Excel, Google Sheets, or Numbers
- Impact: Medium (user frustration, support tickets)
- Mitigation Strategy:
  - Test on all 3 platforms (Excel for Windows/Mac, Google Sheets, Numbers)
  - Validate cell formatting (currency as number, dates as Date type)
  - Use xlsx library's recommended patterns (json_to_sheet for data, book_new/book_append_sheet)
  - Add export validation tests (open file programmatically, verify structure)

**3. Vercel Blob Storage Quota**
- Risk: Free tier (1GB) could fill up with cached exports
- Impact: Medium (export caching stops working)
- Mitigation Strategy:
  - 30-day expiration enforced by cleanup cron
  - Monitor storage usage (add admin dashboard metric)
  - Graceful degradation: If Blob upload fails, return file directly (no caching)
  - Upgrade to Pro tier if needed ($20/month for 100GB)

### Complexity Risks

**4. Analytics Date Range Bug Investigation**
- Risk: Root cause might be deeper than expected (timezone conversion, Prisma date operators, tRPC serialization)
- Likelihood: Low-Medium (likely simple date format issue)
- Mitigation: Time-box investigation to 2 hours. If not resolved, escalate to planner for expert help.
- Debugging steps:
  1. Console.log dateRange in Analytics page (verify Date objects)
  2. Console.log input.startDate/endDate in transactions.router.ts
  3. Check Prisma query (add logging: `console.log(transactions)`)
  4. Test with hardcoded dates (bypass state)
  5. Verify timezone handling (user timezone vs UTC vs server timezone)

**5. Category Hierarchy Traversal**
- Risk: Complex parent-child relationships could cause infinite loops or missing categories
- Likelihood: Low (schema constraints prevent cycles)
- Mitigation: Use iterative traversal (not recursive), add cycle detection, test with deeply nested categories (5+ levels)
- Code Example:
```typescript
function buildCategoryHierarchy(categories: Category[]) {
  const hierarchy: Record<string, any> = {}
  const visited = new Set<string>()
  
  for (const cat of categories) {
    if (visited.has(cat.id)) continue // Prevent infinite loops
    visited.add(cat.id)
    
    const parent = categories.find(c => c.id === cat.parentId)
    hierarchy[cat.name] = {
      parent: parent?.name || null,
      icon: cat.icon,
      color: cat.color
    }
  }
  
  return hierarchy
}
```

## Recommendations for Planner

### 1. Prioritize Bug Fix in Iteration 1 (CRITICAL)
Analytics export date range bug is BLOCKING. Users cannot export transactions from the Analytics page despite backend infrastructure working. Fix BEFORE building new export features to validate foundation.

**Action:** Assign Builder-14-1 to investigate and fix in first 1-2 hours of iteration.

### 2. Use archiver (Not jszip) for ZIP Generation
archiver is superior for server-side Node.js ZIP creation:
- Streaming support (prevents memory overflow with large datasets)
- 7M+ weekly downloads (mature, well-maintained)
- Node.js optimized (jszip targets browsers)

**Action:** Add to iteration 1 dependency installation: `npm install archiver @types/archiver`

### 3. Defer Vercel Blob Storage to Iteration 2
ExportHistory model and basic export endpoints can work without caching initially. Use filesystem temporary storage as fallback.

**Action:** Iteration 1 focuses on export generation, Iteration 2 adds caching and re-download.

### 4. Leverage Existing Testing Infrastructure
Vitest is configured with globals, node environment, and coverage reporting. Existing router tests follow consistent patterns.

**Action:** Builder should create tests in `src/lib/__tests__/xlsxExport.test.ts` and `src/server/api/routers/__tests__/exports.router.test.ts` following existing patterns.

### 5. Reuse CSV/JSON Export Patterns
Existing utilities (csvExport.ts, jsonExport.ts) are well-structured with proper:
- UTF-8 BOM for Excel compatibility
- Decimal to number conversion
- Quote escaping
- Client-side download helpers

**Action:** Builder should extend these utilities (add recurring, categories) rather than rewriting from scratch.

### 6. Plan for Mobile Web Share API in Iteration 3
Mobile export UX is iteration 3 scope, but architecture should support it:
- Export endpoints return base64 content (works for both download and share)
- Client-side utility detects navigator.share availability
- Fallback to standard download on unsupported browsers

**Action:** Document pattern in iteration 1 code comments for iteration 3 builder.

### 7. Monitor Export Performance Early
Add timing metrics to tRPC export endpoints from the start:
```typescript
const startTime = Date.now()
// ... export generation ...
const duration = Date.now() - startTime
console.log(`Export completed in ${duration}ms, ${recordCount} records, ${fileSize} bytes`)
```

**Action:** Log export metrics to identify slow queries early (optimize before iteration 2).

### 8. AI Context Prompts Will Need Iteration
Initial AI prompt templates are educated guesses. Real users will provide feedback on what insights they want.

**Action:** Mark aiPrompts in ai-context.json as "v1.0 experimental" and plan for refinement in post-MVP based on user feedback.

## Resource Map

### Critical Files/Directories

**Existing (Extend)**
- `src/lib/csvExport.ts` - Add recurring transactions, categories CSV generators
- `src/lib/jsonExport.ts` - Add recurring, categories, enhance with AI context
- `src/server/api/routers/users.router.ts` - Reference for exportAllData pattern
- `src/server/api/root.ts` - Add `exports: exportsRouter` to router composition

**New (Create in Iteration 1)**
- `src/lib/xlsxExport.ts` - Excel workbook generation for all 6 data types
- `src/lib/aiContextGenerator.ts` - Generate ai-context.json metadata
- `src/lib/archiveExport.ts` - ZIP package creation with archiver
- `src/lib/readmeGenerator.ts` - Generate README.md with dynamic content
- `src/server/api/routers/exports.router.ts` - New tRPC router with 7 endpoints (6 data types + complete)
- `prisma/migrations/XXX_add_export_history.sql` - ExportHistory model migration

**New (Create in Iteration 2)**
- `src/components/exports/ExportCard.tsx` - Reusable export card UI
- `src/components/exports/ExportHistoryTable.tsx` - Past exports display
- `src/components/exports/FormatSelector.tsx` - CSV/JSON/Excel dropdown
- `src/components/exports/ExportProgressBar.tsx` - Loading state UI
- `src/app/api/cron/cleanup-exports/route.ts` - Vercel Cron cleanup endpoint

**Modify (Iteration 1)**
- `prisma/schema.prisma` - Add ExportHistory model, User relation
- `src/server/api/root.ts` - Import and add exportsRouter

**Modify (Iteration 2)**
- `src/app/(dashboard)/settings/data/page.tsx` - Replace placeholder with full Export Center UI
- `.env.example` - Add BLOB_READ_WRITE_TOKEN documentation
- `vercel.json` - Add cron job configuration (if not exists)

### Key Dependencies

**Install in Iteration 1:**
```bash
npm install archiver
npm install --save-dev @types/archiver
```

**Install in Iteration 2:**
```bash
npm install @vercel/blob
```

**Already Installed (Verify):**
- xlsx@0.18.5 (devDependency)
- date-fns@3.6.0
- @prisma/client@5.22.0
- zod@3.23.8
- @trpc/server@11.6.0

### Testing Infrastructure

**Vitest Configuration (vitest.config.ts)**
- Globals enabled (no need to import describe, it, expect)
- Node environment (server-side testing)
- Coverage with v8 provider
- Path alias: `@` → `./src`

**Test File Locations:**
- Router tests: `src/server/api/routers/__tests__/exports.router.test.ts`
- Utility tests: `src/lib/__tests__/xlsxExport.test.ts`, `src/lib/__tests__/aiContextGenerator.test.ts`

**Testing Approach (Prioritize Integration):**
1. Export format validation (CSV UTF-8 BOM, Excel file validity, JSON schema)
2. tRPC endpoint integration (mock Prisma, test input validation)
3. Edge cases (empty datasets, 10k+ records, date range filtering)

**Test Execution:**
```bash
npm run test                 # Run all tests
npm run test:ui              # Visual test UI
npm run test:coverage        # Coverage report
```

## Questions for Planner

### 1. Should recurring transactions export show generated instances or templates only?
**Context:** RecurringTransaction model has `generatedTransactions` relation. Do we export the templates (8 records) or the generated Transaction records (could be hundreds)?

**Recommendation:** Export templates only in recurring-transactions.csv. Generated instances already appear in transactions.csv (with recurringTransactionId field linking back to template). This avoids duplication and keeps exports clean.

**Impact:** Low complexity, clear data separation.

---

### 2. How to handle Plaid access token security in account exports?
**Context:** Account model has `plaidAccessToken` field (encrypted). Should we include in exports?

**Recommendation:** REDACT plaidAccessToken entirely. Include plaidAccountId for reference (safe, non-sensitive). Add note in README.md:
```
Security: Plaid access tokens are redacted for your security.
You can reconnect accounts after importing data (future feature).
```

**Impact:** Security best practice, prevents token leakage.

---

### 3. What's the desired behavior for exports with no data?
**Context:** User exports transactions but has 0 records in date range.

**Options:**
- A) Return error: "No data to export"
- B) Return empty CSV with headers only
- C) Return CSV with headers + info row: "No transactions found"

**Recommendation:** Option B (empty CSV with headers). This is standard CSV behavior, allows users to see expected format, and AI tools can handle empty files gracefully.

**Impact:** Low complexity, better UX than error.

---

### 4. Should export history track failed exports?
**Context:** ExportHistory model could track both successful and failed exports for debugging.

**Recommendation:** Track successful exports only in iteration 1. Add `status` field (PENDING, SUCCESS, FAILED) in post-MVP if analytics show value.

**Impact:** Simpler iteration 1, defer complexity.

---

### 5. What's the file size limit for exports before warning users?
**Context:** ZIP files with 10k+ transactions could be 5-10MB.

**Options:**
- A) No limit, let it run (risk: timeouts)
- B) Warn at 10k records: "Large export may take 30s"
- C) Hard limit at 50k records: "Use date filters to export smaller batches"

**Recommendation:** Combination of B + C. Warn at 10k, block at 50k with helpful error message suggesting date range filters.

**Impact:** Prevents abuse, guides users to better export strategies.

---

### 6. Should exports include inactive/deleted data?
**Context:** Accounts have `isActive` field, categories can be soft-deleted.

**Recommendation:** Export active data only by default. Add "Include Inactive" checkbox in iteration 2 (Export Center UI) for power users who need complete history.

**Impact:** Cleaner default exports, optional completeness for advanced users.

---

### 7. How granular should export history be?
**Context:** Track every quick export (could be 100+ entries) or only complete exports?

**Options:**
- A) Track all exports (quick + complete)
- B) Track complete exports only
- C) Track complete + cached quick exports (exclude instant re-downloads)

**Recommendation:** Option A (track all). Storage cost is minimal (~500 bytes per record), and analytics could reveal user behavior patterns (which data types are exported most).

**Impact:** Better analytics, minimal storage cost.

---

## Limitations

**MCP Servers: Not Used**
This exploration did not utilize MCP servers (Playwright, Chrome DevTools, Supabase Local) as the focus was on technology patterns, dependencies, and integration planning rather than live system testing. Future validation phases could leverage:
- Playwright MCP: E2E testing of export flows (click button → verify download)
- Chrome DevTools MCP: Performance profiling of large exports (10k+ transactions)
- Supabase Local MCP: Database schema validation post-migration

**Recommendation:** Manual testing in iteration 1 (export files, open in Excel/Sheets), defer automated E2E tests to post-MVP.

---

**Report Complete**
Explorer-2 analysis finished. Ready for planner synthesis with Explorer-1 and Explorer-3 reports.
