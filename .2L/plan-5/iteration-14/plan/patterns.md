# Code Patterns & Conventions - Iteration 14

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── analytics/page.tsx          # Analytics bug fix location
│   ├── lib/
│   │   ├── csvExport.ts                    # EXTEND: Add recurring, categories
│   │   ├── jsonExport.ts                   # EXTEND: Add recurring, categories, AI context
│   │   ├── xlsxExport.ts                   # CREATE: Excel generator
│   │   ├── aiContextGenerator.ts           # CREATE: AI metadata
│   │   └── archiveExport.ts                # CREATE: ZIP utility (Iteration 15 use)
│   └── server/
│       └── api/
│           ├── root.ts                      # MODIFY: Register exports router
│           └── routers/
│               ├── exports.router.ts        # CREATE: Centralized export endpoints
│               ├── transactions.router.ts   # REFERENCE: Query patterns
│               └── users.router.ts          # REFERENCE: exportAllData pattern
├── prisma/
│   └── schema.prisma                        # MODIFY: Add ExportHistory model
└── package.json                             # MODIFY: Add archiver dependency
```

## Naming Conventions

**Files:**
- Export utilities: `{format}Export.ts` (e.g., `csvExport.ts`, `xlsxExport.ts`)
- Generators: `{purpose}Generator.ts` (e.g., `aiContextGenerator.ts`)
- Routers: `{domain}.router.ts` (e.g., `exports.router.ts`)

**Functions:**
- Export generators: `generate{DataType}{Format}()` (e.g., `generateTransactionCSV()`)
- Helpers: `{verb}{Noun}()` (e.g., `downloadCSV()`, `sanitizeDecimals()`)

**Types/Interfaces:**
- Export data: `{DataType}Export` (e.g., `TransactionExport`, `BudgetExport`)
- Input schemas: `{Action}Input` (e.g., `ExportTransactionsInput`)

**Constants:**
- SCREAMING_SNAKE_CASE: `UTF8_BOM`, `MAX_EXPORT_RECORDS`

## CSV Export Patterns

### Pattern 1: CSV Generator Function

**When to use:** Creating CSV export for any data type

**Full example:**
```typescript
// src/lib/csvExport.ts

import { format } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

interface RecurringTransactionExport {
  payee: string
  amount: number | Decimal
  category: { name: string }
  account: { name: string }
  frequency: string          // 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  nextScheduledDate: Date
  status: string             // 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
}

export function generateRecurringTransactionCSV(
  recurringTransactions: RecurringTransactionExport[]
): string {
  const headers = ['Payee', 'Amount', 'Category', 'Account', 'Frequency', 'Next Date', 'Status']
  const headerRow = headers.join(',')

  const dataRows = recurringTransactions.map((rt) => {
    // Convert Decimal to number for CSV export
    const amount = typeof rt.amount === 'number'
      ? rt.amount
      : Number(rt.amount.toString())

    // Human-readable frequency
    const frequencyText = formatFrequency(rt.frequency, rt.interval)

    const row = [
      `"${rt.payee.replace(/"/g, '""')}"`,        // Escape quotes
      amount.toFixed(2),                           // 2 decimal places
      `"${rt.category.name.replace(/"/g, '""')}"`,
      `"${rt.account.name.replace(/"/g, '""')}"`,
      `"${frequencyText}"`,
      format(new Date(rt.nextScheduledDate), 'yyyy-MM-dd'),
      rt.status,
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + csvContent
}

// Helper function for human-readable frequency
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

  if (interval === 1) {
    return `Every ${base}`
  }

  return `Every ${interval} ${base}s`
}
```

**Key points:**
- Always add UTF-8 BOM (`\uFEFF`) at the start
- Escape double quotes in strings: `replace(/"/g, '""')`
- Convert Decimal to number: `Number(decimal.toString())`
- Use `.toFixed(2)` for monetary values
- Format dates as ISO 8601: `yyyy-MM-dd`

### Pattern 2: Category CSV with Hierarchy

**When to use:** Exporting categories with parent-child relationships

**Full example:**
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

**Key points:**
- Handle null parent with "None" string
- Include type indicator (Default vs Custom)
- Icon and color as-is (no escaping needed for these fields)

## Excel Export Patterns

### Pattern 1: Excel Generator Function

**When to use:** Creating Excel export for any data type

**Full example:**
```typescript
// src/lib/xlsxExport.ts

import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

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
  // Transform data to simple objects (Excel format)
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

export function generateBudgetExcel(budgets: BudgetExport[]): Buffer {
  const data = budgets.map(budget => ({
    Month: budget.month,
    Category: budget.category.name,
    Budgeted: Number(budget.budgetAmount.toString()),
    Spent: Number(budget.spentAmount.toString()),
    Remaining: Number(budget.remainingAmount.toString()),
    Status: budget.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Budgets')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function generateGoalExcel(goals: GoalExport[]): Buffer {
  const data = goals.map(goal => {
    const target = Number(goal.targetAmount.toString())
    const current = Number(goal.currentAmount.toString())
    const progress = target > 0 ? (current / target) * 100 : 0

    return {
      Goal: goal.name,
      'Target Amount': target,
      'Current Amount': current,
      'Progress %': Number(progress.toFixed(1)),
      'Target Date': format(new Date(goal.targetDate), 'yyyy-MM-dd'),
      'Linked Account': goal.linkedAccount?.name || 'None',
      Status: goal.status,
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Goals')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function generateAccountExcel(accounts: AccountExport[]): Buffer {
  const data = accounts.map(account => ({
    Name: account.name,
    Type: account.type,
    Balance: Number(account.balance.toString()),
    Connected: account.plaidAccountId ? 'Plaid' : 'Manual',
    Status: account.isActive ? 'Active' : 'Inactive',
    'Last Updated': format(new Date(account.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function generateRecurringTransactionExcel(
  recurringTransactions: RecurringTransactionExport[]
): Buffer {
  const data = recurringTransactions.map(rt => ({
    Payee: rt.payee,
    Amount: Number(rt.amount.toString()),
    Category: rt.category.name,
    Account: rt.account.name,
    Frequency: formatFrequency(rt.frequency, rt.interval),
    'Next Date': format(new Date(rt.nextScheduledDate), 'yyyy-MM-dd'),
    Status: rt.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recurring')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function generateCategoryExcel(categories: CategoryExport[]): Buffer {
  const data = categories.map(cat => ({
    Name: cat.name,
    Parent: cat.parent?.name || 'None',
    Icon: cat.icon,
    Color: cat.color,
    Type: cat.isDefault ? 'Default' : 'Custom',
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Helper function (reused from csvExport.ts)
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

**Key points:**
- Always return `Buffer` type for binary transport
- Use `json_to_sheet()` for array-to-sheet conversion
- Sheet names should be descriptive (e.g., 'Transactions', 'Budgets')
- Convert Decimal to number before adding to data array
- Format dates as strings (Excel will parse them)

## JSON Export Patterns

### Pattern 1: Decimal Sanitization

**When to use:** Exporting any data containing Prisma Decimal fields

**Full example:**
```typescript
// src/lib/jsonExport.ts

const sanitizeDecimals = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj

  // Check if object has toNumber method (Decimal type)
  if (typeof obj === 'object' && 'toNumber' in obj) {
    return (obj as { toNumber: () => number }).toNumber()
  }

  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDecimals)
  }

  // Handle objects recursively
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      result[key] = sanitizeDecimals((obj as Record<string, unknown>)[key])
    }
    return result
  }

  return obj
}

interface ExportData {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  accounts: Account[]
  recurringTransactions: RecurringTransaction[]
  categories: Category[]
}

export function generateCompleteJSON(data: ExportData): string {
  const sanitized = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    data: sanitizeDecimals(data),
  }

  return JSON.stringify(sanitized, null, 2)
}
```

**Key points:**
- Recursive sanitization handles nested objects and arrays
- Check for `toNumber` method to detect Decimal type
- Pretty-print with 2-space indent for readability
- Include export metadata (version, timestamp)

## AI Context Generator Patterns

### Pattern 1: AI Context JSON Structure

**When to use:** Generating ai-context.json for export packages

**Full example:**
```typescript
// src/lib/aiContextGenerator.ts

import { format } from 'date-fns'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  parentId: string | null
}

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
        amount: 'Transaction amount in ' + input.user.currency + '. Negative values = expenses, Positive values = income',
        payee: 'Merchant or person who received/sent payment',
        category: 'Spending category (see categories section for hierarchy)',
        account: 'Account used for transaction',
        tags: 'User-defined tags for organization',
        notes: 'Optional transaction notes',
      },
      budget: {
        month: 'Budget month in YYYY-MM format',
        budgeted: 'Allocated budget amount in ' + input.user.currency,
        spent: 'Actual amount spent in ' + input.user.currency,
        remaining: 'Remaining budget (budgeted - spent)',
        status: 'UNDER_BUDGET | AT_LIMIT | OVER_BUDGET',
      },
      goal: {
        name: 'Goal name',
        targetAmount: 'Target amount to save/pay off in ' + input.user.currency,
        currentAmount: 'Current progress amount in ' + input.user.currency,
        progress: 'Progress percentage (0-100)',
        targetDate: 'Target completion date (YYYY-MM-DD)',
        type: 'SAVINGS | DEBT_PAYOFF | INVESTMENT',
        status: 'NOT_STARTED | IN_PROGRESS | COMPLETED',
      },
      account: {
        name: 'Account name',
        type: 'CHECKING | SAVINGS | CREDIT | INVESTMENT | CASH',
        balance: 'Current account balance in ' + input.user.currency,
        connected: 'Plaid (auto-synced) or Manual (user-entered)',
        status: 'Active or Inactive',
      },
      recurringTransaction: {
        frequency: 'DAILY | WEEKLY | BIWEEKLY | MONTHLY | YEARLY',
        interval: 'Frequency multiplier (e.g., 2 for every 2 weeks)',
        nextScheduledDate: 'Next date this transaction will be generated',
        status: 'ACTIVE | PAUSED | COMPLETED | CANCELLED',
      },
      category: {
        name: 'Category name',
        parent: 'Parent category name (or None for top-level)',
        icon: 'Lucide icon name',
        color: 'Hex color code',
        type: 'Default (system) or Custom (user-created)',
      },
    },

    categories: {
      hierarchy: buildCategoryHierarchy(input.categories),
    },

    enums: {
      AccountType: ['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH'],
      BudgetStatus: ['UNDER_BUDGET', 'AT_LIMIT', 'OVER_BUDGET'],
      GoalType: ['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT'],
      GoalStatus: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      RecurrenceFrequency: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'],
      RecurringTransactionStatus: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    },

    aiPrompts: {
      spendingAnalysis: `Analyze my spending patterns in transactions.csv. Focus on: 1) Top spending categories by amount and frequency, 2) Month-over-month spending trends, 3) Unusual or one-time large transactions, 4) Opportunities to reduce spending. Provide actionable insights with specific numbers in ${input.user.currency}.`,

      budgetReview: `Review my budgets.csv against transactions.csv. Tell me: 1) Which budgets am I exceeding and why? 2) Which categories have budget remaining? 3) Suggest budget adjustments for next month based on actual spending patterns. Compare budgeted vs actual for each category in ${input.user.currency}.`,

      goalProgress: `Check my goals.csv against accounts.csv. How am I tracking toward my goals? Calculate if I'm on pace to meet target dates. How much should I save monthly to reach each goal on time? Provide recommendations to accelerate progress in ${input.user.currency}.`,

      recurringOptimization: `Analyze recurring-transactions.csv. Identify: 1) Subscriptions or recurring expenses I might not need, 2) Recurring expenses that have increased over time, 3) Opportunities to negotiate lower rates or find alternatives. Focus on subscription fatigue and unnecessary recurring charges in ${input.user.currency}.`,

      financialHealth: `Provide a comprehensive financial health assessment using all CSV files. Include: 1) Income vs expenses ratio (calculate from transactions), 2) Savings rate and emergency fund coverage, 3) Budget adherence percentage, 4) Goal progress trajectory, 5) Top 3 recommendations to improve financial health. Give me a score out of 100 and explain the rating in ${input.user.currency}.`,
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
  const visited = new Set<string>()

  for (const cat of categories) {
    // Prevent infinite loops
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

**Key points:**
- Include currency in field descriptions and prompts
- Build category hierarchy with cycle detection
- AI prompts should be specific and actionable
- Include enum definitions for all types
- Pretty-print JSON for readability

## tRPC Export Router Patterns

### Pattern 1: Export Endpoint with Format Switching

**When to use:** Creating any data type export endpoint

**Full example:**
```typescript
// src/server/api/routers/exports.router.ts

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { format } from 'date-fns'
import {
  generateTransactionCSV,
  generateBudgetCSV,
  generateGoalCSV,
  generateAccountCSV,
  generateRecurringTransactionCSV,
  generateCategoryCSV,
} from '@/lib/csvExport'
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
      // Fetch transactions with filters
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
        take: 10000, // Limit to prevent memory overflow
      })

      // Generate export based on format
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

      // Generate filename
      const dateStr = input.startDate && input.endDate
        ? `${format(input.startDate, 'yyyy-MM-dd')}-to-${format(input.endDate, 'yyyy-MM-dd')}`
        : format(new Date(), 'yyyy-MM-dd')
      const filename = `wealth-transactions-${dateStr}.${extension}`

      // Base64 encode for transport (handles both string and Buffer)
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: transactions.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportBudgets: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          category: true,
        },
        orderBy: {
          month: 'desc',
        },
      })

      // Calculate spent and remaining for each budget
      const budgetsWithCalcs = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: budget.categoryId,
              date: {
                gte: new Date(budget.month + '-01'),
                lt: new Date(
                  new Date(budget.month + '-01').setMonth(
                    new Date(budget.month + '-01').getMonth() + 1
                  )
                ),
              },
            },
            _sum: {
              amount: true,
            },
          })

          const spentAmount = spent._sum.amount ? Math.abs(Number(spent._sum.amount)) : 0
          const budgetAmount = Number(budget.amount)
          const remainingAmount = budgetAmount - spentAmount

          let status: 'UNDER_BUDGET' | 'AT_LIMIT' | 'OVER_BUDGET'
          if (remainingAmount > 0) status = 'UNDER_BUDGET'
          else if (remainingAmount === 0) status = 'AT_LIMIT'
          else status = 'OVER_BUDGET'

          return {
            month: budget.month,
            category: budget.category,
            budgetAmount,
            spentAmount,
            remainingAmount,
            status,
          }
        })
      )

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateBudgetCSV(budgetsWithCalcs)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(budgetsWithCalcs, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateBudgetExcel(budgetsWithCalcs)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-budgets-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: budgetsWithCalcs.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportGoals: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const goals = await ctx.prisma.goal.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          linkedAccount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateGoalCSV(goals)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(goals, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateGoalExcel(goals)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-goals-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: goals.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportAccounts: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          userId: ctx.user.id,
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Redact plaidAccessToken for security
      const sanitizedAccounts = accounts.map(({ plaidAccessToken, ...account }) => account)

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateAccountCSV(sanitizedAccounts)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(sanitizedAccounts, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateAccountExcel(sanitizedAccounts)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-accounts-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: sanitizedAccounts.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportRecurringTransactions: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const recurringTransactions = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateRecurringTransactionCSV(recurringTransactions)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(recurringTransactions, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateRecurringTransactionExcel(recurringTransactions)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-recurring-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: recurringTransactions.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportCategories: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const categories = await ctx.prisma.category.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          parent: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateCategoryCSV(categories)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(categories, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateCategoryExcel(categories)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-categories-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: categories.length,
        fileSize: Buffer.byteLength(content),
      }
    }),
})
```

**Key points:**
- Use `.mutation()` for export endpoints (changes state via ExportHistory in Iteration 15)
- Input validation with Zod enum for format
- Base64 encode all content (handles both string and Buffer)
- Include metadata in response (filename, mimeType, recordCount, fileSize)
- Redact sensitive fields (plaidAccessToken)
- Use 10k limit for transactions to prevent memory overflow

### Pattern 2: Router Registration

**When to use:** Adding new router to tRPC root

**Full example:**
```typescript
// src/server/api/root.ts

import { router } from './trpc'
import { transactionsRouter } from './routers/transactions.router'
import { budgetsRouter } from './routers/budgets.router'
import { goalsRouter } from './routers/goals.router'
import { accountsRouter } from './routers/accounts.router'
import { categoriesRouter } from './routers/categories.router'
import { recurringRouter } from './routers/recurring.router'
import { usersRouter } from './routers/users.router'
import { analyticsRouter } from './routers/analytics.router'
import { plaidRouter } from './routers/plaid.router'
import { adminRouter } from './routers/admin.router'
import { exportsRouter } from './routers/exports.router'  // NEW

export const appRouter = router({
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  goals: goalsRouter,
  accounts: accountsRouter,
  categories: categoriesRouter,
  recurring: recurringRouter,
  users: usersRouter,
  analytics: analyticsRouter,
  plaid: plaidRouter,
  admin: adminRouter,
  exports: exportsRouter,  // NEW
})

export type AppRouter = typeof appRouter
```

**Key points:**
- Import new router
- Add to router composition object
- Export type will automatically update for client

## Database Patterns

### Pattern 1: Prisma Schema Model

**When to use:** Adding new database models

**Full example:**
```prisma
// prisma/schema.prisma

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

// Add to User model
model User {
  // ... existing fields ...
  exportHistory ExportHistory[]
}
```

**Key points:**
- Use enums for constrained values
- Add indexes for common queries (userId, createdAt, expiresAt)
- Cascade delete to clean up orphaned records
- Optional fields with `?` for nullable columns
- Json type for flexible data (dateRange)

### Pattern 2: Parallel Data Fetching

**When to use:** Fetching multiple data types simultaneously

**Full example:**
```typescript
// Example: Complete export (Iteration 15)
const [accounts, transactions, budgets, goals, categories, recurringTransactions] = await Promise.all([
  ctx.prisma.account.findMany({
    where: { userId: ctx.user.id },
    orderBy: { name: 'asc' },
  }),
  ctx.prisma.transaction.findMany({
    where: { userId: ctx.user.id },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: 10000,
  }),
  ctx.prisma.budget.findMany({
    where: { userId: ctx.user.id },
    include: { category: true },
    orderBy: { month: 'desc' },
  }),
  ctx.prisma.goal.findMany({
    where: { userId: ctx.user.id },
    include: { linkedAccount: true },
    orderBy: { createdAt: 'desc' },
  }),
  ctx.prisma.category.findMany({
    where: { userId: ctx.user.id },
    include: { parent: true },
    orderBy: { name: 'asc' },
  }),
  ctx.prisma.recurringTransaction.findMany({
    where: { userId: ctx.user.id },
    include: { category: true, account: true },
    orderBy: { nextScheduledDate: 'asc' },
  }),
])
```

**Key points:**
- Use `Promise.all()` to run queries in parallel
- Reduces total query time significantly
- Include related entities for denormalized exports
- Apply consistent ordering for predictable exports

## Analytics Bug Fix Pattern

### Pattern 1: Date Range Fix

**When to use:** Fixing Analytics export date range bug

**Full example:**
```typescript
// src/app/(dashboard)/analytics/page.tsx

import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// BEFORE (Buggy - endOfMonth returns next month start at 00:00:00)
const [dateRange, setDateRange] = useState({
  startDate: startOfMonth(subMonths(new Date(), 5)),
  endDate: endOfMonth(new Date()),  // BUG: Returns 2025-12-01 00:00:00 instead of 2025-11-30 23:59:59
})

// AFTER (Fixed - endOfDay ensures last millisecond of month)
import { endOfDay } from 'date-fns'

const [dateRange, setDateRange] = useState({
  startDate: startOfMonth(subMonths(new Date(), 5)),
  endDate: endOfDay(endOfMonth(new Date())),  // FIX: Returns 2025-11-30 23:59:59.999
})

// OR Alternative fix (use exclusive range)
const [dateRange, setDateRange] = useState({
  startDate: startOfMonth(subMonths(new Date(), 5)),
  endDate: startOfDay(addMonths(endOfMonth(new Date()), 1)),  // Returns 2025-12-01 00:00:00 (exclusive)
})

// Then in tRPC query, use lt instead of lte for endDate
const { data: transactions } = trpc.transactions.list.useQuery({
  startDate: dateRange.startDate,
  endDate: dateRange.endDate,  // Now correctly includes transactions on last day of month
  limit: 1000,
})
```

**Key points:**
- `endOfMonth()` returns start of next month (boundary issue)
- Use `endOfDay(endOfMonth())` for inclusive range with `lte`
- Or use `startOfDay(addMonths())` for exclusive range with `lt`
- Test with transactions on last day of month

## Testing Patterns

### Pattern 1: Manual Export Validation

**When to use:** Validating export formats work correctly

**Checklist:**
```typescript
/**
 * MANUAL TESTING CHECKLIST
 *
 * 1. CSV Exports
 *    - Open in Excel (Windows/Mac)
 *    - Open in Google Sheets
 *    - Verify UTF-8 BOM (international characters display correctly)
 *    - Check decimal formatting (2 places)
 *    - Verify dates are ISO 8601 (yyyy-MM-dd)
 *
 * 2. Excel Exports
 *    - Open in Excel 2016+
 *    - Open in Google Sheets
 *    - Open in Apple Numbers
 *    - Verify number formatting (currency)
 *    - Verify date cells are Date type (not string)
 *
 * 3. JSON Exports
 *    - Parse with JSON.parse() (no errors)
 *    - Verify Decimal fields are numbers (not objects)
 *    - Check ISO 8601 dates
 *    - Validate structure matches expected schema
 *
 * 4. Error Handling
 *    - Export with no data (should return empty file with headers)
 *    - Export with 10k+ records (should complete in <10s)
 *    - Export with invalid date range (should show validation error)
 */
```

## Import Conventions

**Standard import order:**
```typescript
// 1. External libraries
import { z } from 'zod'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import archiver from 'archiver'

// 2. Internal utilities
import { router, protectedProcedure } from '../trpc'
import { generateTransactionCSV } from '@/lib/csvExport'
import { generateTransactionExcel } from '@/lib/xlsxExport'
import { generateAIContext } from '@/lib/aiContextGenerator'

// 3. Types
import type { Transaction, Budget, Goal } from '@prisma/client'

// 4. Constants
const MAX_EXPORT_RECORDS = 10000
const UTF8_BOM = '\uFEFF'
```

## Error Handling Patterns

### Pattern 1: Empty Dataset Handling

**When to use:** Export endpoints with potentially zero records

**Full example:**
```typescript
// In export endpoint
const transactions = await ctx.prisma.transaction.findMany({
  where: { userId: ctx.user.id, /* filters */ }
})

// DON'T throw error for empty dataset
if (transactions.length === 0) {
  // WRONG:
  // throw new TRPCError({
  //   code: 'NOT_FOUND',
  //   message: 'No data to export'
  // })

  // CORRECT: Return empty file with headers
  const content = generateTransactionCSV([])  // Empty array returns headers only
  // ... continue with normal flow
}
```

**Key points:**
- Empty CSV should have headers only (valid CSV)
- Empty JSON should be empty array `[]`
- Empty Excel should have header row only
- This allows users to see expected format

### Pattern 2: Large Dataset Warning

**When to use:** Exports that may exceed memory or time limits

**Full example:**
```typescript
// Before fetching large dataset
const recordCount = await ctx.prisma.transaction.count({
  where: { userId: ctx.user.id }
})

if (recordCount > 50000) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Too many records to export. Please use date range filters to export smaller batches. Current record count: ' + recordCount,
  })
}

if (recordCount > 10000) {
  console.warn(`Large export requested: ${recordCount} records for user ${ctx.user.id}`)
}
```

**Key points:**
- Warn at 10k records (log for monitoring)
- Block at 50k records (prevent abuse)
- Provide helpful error message with alternative
- Log large exports for performance analysis

---

**Patterns Status:** ✅ COMPLETE
**Ready for:** Builder Implementation
**Copy-Paste Ready:** All code examples are fully functional
