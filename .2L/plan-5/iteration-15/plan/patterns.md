# Code Patterns & Conventions

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── settings/
│   │           └── data/
│   │               └── page.tsx                    # Export Center UI (Builder-15-1)
│   ├── components/
│   │   ├── exports/
│   │   │   ├── ExportCard.tsx                      # Reusable export card (Builder-15-1)
│   │   │   ├── FormatSelector.tsx                  # CSV/JSON/Excel dropdown (Builder-15-1)
│   │   │   ├── CompleteExportSection.tsx           # ZIP export UI (Builder-15-1)
│   │   │   ├── ExportHistoryTable.tsx              # History display (Builder-15-3)
│   │   │   └── ExportProgressBar.tsx               # Progress indicator (Builder-15-1)
│   │   └── ui/                                     # Existing shadcn components
│   ├── lib/
│   │   ├── csvExport.ts                            # Iteration 14 (complete)
│   │   ├── xlsxExport.ts                           # Iteration 14 (complete)
│   │   ├── aiContextGenerator.ts                   # Iteration 14 (complete)
│   │   ├── readmeGenerator.ts                      # Iteration 14 (complete)
│   │   ├── archiveExport.ts                        # Iteration 14 (complete)
│   │   └── summaryGenerator.ts                     # Builder-15-2 (NEW)
│   └── server/
│       └── api/
│           └── routers/
│               └── exports.router.ts               # Extend with 3 new endpoints (Builder-15-2, 15-3)
└── prisma/
    └── schema.prisma                               # ExportHistory model (Iteration 14)
```

## Naming Conventions

**Components:** PascalCase
- `ExportCard.tsx`
- `FormatSelector.tsx`
- `CompleteExportSection.tsx`

**Files:** camelCase
- `summaryGenerator.ts`
- `blobStorage.ts` (if abstraction needed)

**Types:** PascalCase
- `ExportCardProps`
- `ExportHistoryRow`
- `CompleteExportInput`

**Functions:** camelCase
- `generateSummary()`
- `uploadToBlob()`
- `formatFileSize()`

**Constants:** SCREAMING_SNAKE_CASE
- `MAX_EXPORT_SIZE`
- `BLOB_EXPIRATION_DAYS`

**Enums (Prisma):** SCREAMING_SNAKE_CASE
- `ExportType: QUICK | COMPLETE`
- `ExportFormat: CSV | JSON | EXCEL | ZIP`

## API Patterns

### Complete Export Endpoint (Builder-15-2)

**When to use:** Generate full ZIP package with all user data

**Location:** `src/server/api/routers/exports.router.ts`

**Code example:**
```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { format } from 'date-fns'
import { put } from '@vercel/blob'

// Import generators
import {
  generateTransactionCSV,
  generateBudgetCSV,
  generateGoalCSV,
  generateAccountCSV,
  generateRecurringTransactionCSV,
  generateCategoryCSV,
} from '@/lib/csvExport'
import { generateAIContext } from '@/lib/aiContextGenerator'
import { generateREADME } from '@/lib/readmeGenerator'
import { generateSummary } from '@/lib/summaryGenerator'
import { createExportZIP } from '@/lib/archiveExport'

export const exportsRouter = router({
  // ... existing endpoints (exportTransactions, exportBudgets, etc.) ...

  exportComplete: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()

      // Step 1: Fetch all data in parallel
      const [transactions, budgets, goals, accounts, recurringTransactions, categories] =
        await Promise.all([
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
          ctx.prisma.account.findMany({
            where: { userId: ctx.user.id },
            orderBy: { name: 'asc' },
          }),
          ctx.prisma.recurringTransaction.findMany({
            where: { userId: ctx.user.id },
            include: { category: true, account: true },
            orderBy: { nextScheduledDate: 'asc' },
          }),
          ctx.prisma.category.findMany({
            where: { userId: ctx.user.id },
            include: { parent: true },
            orderBy: { name: 'asc' },
          }),
        ])

      // Step 2: Calculate budget details (spent, remaining, status)
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
            _sum: { amount: true },
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

      // Step 3: Calculate goal status
      const goalsWithStatus = goals.map((goal) => ({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        linkedAccount: goal.linkedAccount,
        status: goal.isCompleted ? 'COMPLETED' :
                Number(goal.currentAmount) === 0 ? 'NOT_STARTED' : 'IN_PROGRESS',
      }))

      // Step 4: Sanitize accounts (remove sensitive tokens)
      const sanitizedAccounts = accounts.map(({ plaidAccessToken: _, ...account }) => account)

      // Step 5: Generate all file contents
      const transactionsCSV = generateTransactionCSV(transactions)
      const budgetsCSV = generateBudgetCSV(budgetsWithCalcs)
      const goalsCSV = generateGoalCSV(goalsWithStatus)
      const accountsCSV = generateAccountCSV(sanitizedAccounts)
      const recurringCSV = generateRecurringTransactionCSV(recurringTransactions)
      const categoriesCSV = generateCategoryCSV(categories)

      // Step 6: Calculate date range from transactions
      const dateRange = transactions.length > 0 ? {
        earliest: new Date(Math.min(...transactions.map(t => t.date.getTime()))),
        latest: new Date(Math.max(...transactions.map(t => t.date.getTime()))),
      } : null

      // Step 7: Generate metadata files
      const recordCounts = {
        transactions: transactions.length,
        budgets: budgets.length,
        goals: goals.length,
        accounts: accounts.length,
        recurringTransactions: recurringTransactions.length,
        categories: categories.length,
      }

      const aiContextJSON = generateAIContext({
        user: { currency: ctx.user.currency || 'NIS', timezone: 'America/New_York' },
        categories,
      })

      const summaryJSON = generateSummary({
        user: {
          email: ctx.user.email || 'user@example.com',
          currency: ctx.user.currency || 'NIS',
          timezone: 'America/New_York',
        },
        recordCounts,
        dateRange,
        fileSize: 0, // Will be updated after ZIP creation
      })

      const readmeMD = generateREADME({
        recordCounts,
        currency: ctx.user.currency || 'NIS',
        dateRange,
      })

      // Step 8: Create ZIP package
      const zipBuffer = await createExportZIP({
        'README.md': readmeMD,
        'ai-context.json': aiContextJSON,
        'summary.json': summaryJSON,
        'transactions.csv': transactionsCSV,
        'budgets.csv': budgetsCSV,
        'goals.csv': goalsCSV,
        'accounts.csv': accountsCSV,
        'recurring-transactions.csv': recurringCSV,
        'categories.csv': categoriesCSV,
      })

      const fileSize = zipBuffer.byteLength
      const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0)

      // Step 9: Upload to Vercel Blob Storage
      let blobKey: string | null = null
      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
          const path = `exports/${ctx.user.id}/complete-${timestamp}.zip`

          const blob = await put(path, zipBuffer, {
            access: 'public',
            contentType: 'application/zip',
          })

          blobKey = blob.url
          console.log(`Export uploaded to Blob Storage: ${blobKey}`)
        } else {
          console.warn('BLOB_READ_WRITE_TOKEN not set, export will not be cached')
        }
      } catch (error) {
        console.error('Blob upload failed, export will not be cached:', error)
        // Continue without caching (graceful degradation)
      }

      // Step 10: Record to ExportHistory
      await ctx.prisma.exportHistory.create({
        data: {
          userId: ctx.user.id,
          exportType: 'COMPLETE',
          format: 'ZIP',
          dataType: null,
          dateRange: null,
          recordCount: totalRecords,
          fileSize,
          blobKey,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      const duration = Date.now() - startTime
      console.log(`Complete export generated: ${duration}ms, ${totalRecords} records, ${fileSize} bytes`)

      // Step 11: Return ZIP as base64 for client download
      const filename = `wealth-complete-export-${format(new Date(), 'yyyy-MM-dd')}.zip`
      const base64Content = zipBuffer.toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType: 'application/zip',
        recordCount: totalRecords,
        fileSize,
      }
    }),
})
```

**Key points:**
- Use Promise.all() for parallel data fetching (Step 1)
- Calculate budget metrics server-side (spent, remaining, status)
- Redact sensitive fields (plaidAccessToken) before export
- Generate all 9 files before creating ZIP
- Upload to Blob Storage with try-catch (graceful degradation)
- Record to ExportHistory for re-download capability
- Return base64-encoded ZIP for client download

### Export History Query (Builder-15-3)

**When to use:** Display last 10 exports in Export History section

**Code example:**
```typescript
export const exportsRouter = router({
  // ... other endpoints ...

  getExportHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const history = await ctx.prisma.exportHistory.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10, // Last 10 exports
      })

      return history.map((exp) => ({
        id: exp.id,
        type: exp.exportType === 'COMPLETE' ? 'Complete' : 'Quick',
        format: exp.format,
        dataType: exp.dataType, // null for COMPLETE exports
        recordCount: exp.recordCount,
        fileSize: exp.fileSize,
        createdAt: exp.createdAt,
        expiresAt: exp.expiresAt,
        isExpired: exp.expiresAt < new Date(),
        blobKey: exp.blobKey,
      }))
    }),

  redownloadExport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch export record
      const exportRecord = await ctx.prisma.exportHistory.findUnique({
        where: { id: input.id },
      })

      if (!exportRecord) {
        throw new Error('Export not found')
      }

      // Verify ownership
      if (exportRecord.userId !== ctx.user.id) {
        throw new Error('Unauthorized')
      }

      // Check if expired
      if (exportRecord.expiresAt < new Date()) {
        throw new Error('Export has expired. Please generate a fresh export.')
      }

      // Check if blob exists
      if (!exportRecord.blobKey) {
        throw new Error('Export not cached. Please generate a fresh export.')
      }

      // Return blob URL for direct download
      return {
        downloadUrl: exportRecord.blobKey,
        filename: `wealth-export-${format(exportRecord.createdAt, 'yyyy-MM-dd')}.${exportRecord.format.toLowerCase()}`,
      }
    }),
})
```

**Key points:**
- Query last 10 exports only (performance)
- Map to client-friendly format (isExpired calculated)
- Re-download checks: ownership, expiration, blob exists
- Return blob URL directly (presigned, no server proxying needed)

## Frontend Patterns

### Export Card Component (Builder-15-1)

**When to use:** Display individual data type export options in Quick Exports section

**Code example:**
```typescript
// src/components/exports/ExportCard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormatSelector } from './FormatSelector'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/trpc/react'

interface ExportCardProps {
  title: string
  description: string
  icon: React.ReactNode
  recordCount: number
  dataType: 'transactions' | 'budgets' | 'goals' | 'accounts' | 'recurring' | 'categories'
}

export function ExportCard({ title, description, icon, recordCount, dataType }: ExportCardProps) {
  const [format, setFormat] = useState<'CSV' | 'JSON' | 'EXCEL'>('CSV')

  // Map dataType to correct tRPC endpoint
  const endpointMap = {
    transactions: api.exports.exportTransactions,
    budgets: api.exports.exportBudgets,
    goals: api.exports.exportGoals,
    accounts: api.exports.exportAccounts,
    recurring: api.exports.exportRecurringTransactions,
    categories: api.exports.exportCategories,
  }

  const exportMutation = endpointMap[dataType].useMutation({
    onSuccess: (data) => {
      // Decode base64 content
      const binaryString = atob(data.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.mimeType })

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Export successful', {
        description: `Downloaded ${data.recordCount} records`,
      })
    },
    onError: (error) => {
      toast.error('Export failed', {
        description: error.message || 'Please try again',
      })
    },
  })

  const handleExport = () => {
    // Pass format and optional date range (for transactions)
    exportMutation.mutate({ format })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sage-50 p-2">
            {icon}
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-warm-gray-600">
          {recordCount} records available
        </div>

        <div className="flex items-center gap-2">
          <FormatSelector value={format} onChange={setFormat} />
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Key points:**
- Local state for format selection
- tRPC mutation for export generation
- Base64 decode → Blob → Download trigger
- Loading state on button (isPending)
- Toast notifications for success/error

### Format Selector Component (Builder-15-1)

**Code example:**
```typescript
// src/components/exports/FormatSelector.tsx
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormatSelectorProps {
  value: 'CSV' | 'JSON' | 'EXCEL'
  onChange: (value: 'CSV' | 'JSON' | 'EXCEL') => void
}

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="CSV">CSV</SelectItem>
        <SelectItem value="JSON">JSON</SelectItem>
        <SelectItem value="EXCEL">Excel</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Complete Export Section (Builder-15-1)

**Code example:**
```typescript
// src/components/exports/CompleteExportSection.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Archive, Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/trpc/react'

export function CompleteExportSection() {
  const [progress, setProgress] = useState(0)

  const exportMutation = api.exports.exportComplete.useMutation({
    onSuccess: (data) => {
      setProgress(100)

      // Decode and download ZIP
      const binaryString = atob(data.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.mimeType })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Complete export ready', {
        description: `Downloaded ${data.recordCount} total records (${(data.fileSize / 1024 / 1024).toFixed(2)} MB)`,
      })

      setProgress(0)
    },
    onError: (error) => {
      toast.error('Export failed', {
        description: error.message || 'Please try again',
      })
      setProgress(0)
    },
  })

  const handleExport = () => {
    setProgress(20) // Start progress
    exportMutation.mutate({})

    // Simulate progress (real progress tracking would require streaming)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 1000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Complete Export Package
        </CardTitle>
        <CardDescription>
          Download all your data in an organized ZIP file with AI-ready formatting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-4">
          <h4 className="font-serif font-medium text-warm-gray-900 mb-2">Package Includes:</h4>
          <ul className="text-sm text-warm-gray-600 space-y-1">
            <li>• All transactions, budgets, goals, accounts, and recurring transactions</li>
            <li>• README with AI analysis instructions</li>
            <li>• AI context with field descriptions and prompts</li>
            <li>• Summary with export metadata</li>
          </ul>
        </div>

        {exportMutation.isPending && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-warm-gray-600 text-center">
              {progress < 30 ? 'Fetching data...' :
               progress < 60 ? 'Generating files...' :
               progress < 90 ? 'Creating archive...' :
               'Finalizing...'}
            </p>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="w-full"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportMutation.isPending ? `Exporting... ${progress}%` : 'Export Everything'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Key points:**
- Progress simulation (real streaming would be complex)
- Step labels ("Fetching data...", "Creating archive...")
- Large button for prominent CTA
- Detailed package description
- File size display in success toast

### Export History Table (Builder-15-3)

**Code example:**
```typescript
// src/components/exports/ExportHistoryTable.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { api } from '@/trpc/react'

export function ExportHistoryTable() {
  const { data: history, isLoading } = api.exports.getExportHistory.useQuery()

  const redownloadMutation = api.exports.redownloadExport.useMutation({
    onSuccess: (data) => {
      // Open blob URL in new tab (triggers download)
      window.open(data.downloadUrl, '_blank')
      toast.success('Download started', {
        description: 'Opening cached export...',
      })
    },
    onError: (error) => {
      toast.error('Re-download failed', {
        description: error.message,
      })
    },
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            Your past exports will appear here (30-day retention)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-warm-gray-600 text-center py-8">
            No exports yet. Generate your first export above!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Export History
        </CardTitle>
        <CardDescription>
          Last 10 exports (cached for 30 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-gray-200">
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Format</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Records</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Size</th>
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Date</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((exp) => (
                <tr key={exp.id} className="border-b border-warm-gray-100">
                  <td className="py-3 px-4 text-warm-gray-700">
                    {exp.type}
                    {exp.dataType && ` - ${exp.dataType}`}
                  </td>
                  <td className="py-3 px-4 text-warm-gray-700">
                    {exp.format}
                  </td>
                  <td className="py-3 px-4 text-right text-warm-gray-700">
                    {exp.recordCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-warm-gray-700">
                    {formatFileSize(exp.fileSize)}
                  </td>
                  <td className="py-3 px-4 text-warm-gray-700">
                    {format(new Date(exp.createdAt), 'MMM d, yyyy')}
                    {exp.isExpired && (
                      <span className="ml-2 text-xs text-red-600">(Expired)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {exp.isExpired || !exp.blobKey ? (
                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Expired
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => redownloadMutation.mutate({ id: exp.id })}
                        disabled={redownloadMutation.isPending}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Key points:**
- Query export history on mount
- Format file sizes (KB/MB display)
- Show expired badge if past 30 days
- Disable re-download if expired or no blob key
- Open blob URL in new tab (triggers browser download)

## Utility Patterns

### Summary Generator (Builder-15-2)

**Code example:**
```typescript
// src/lib/summaryGenerator.ts
import { format } from 'date-fns'

interface SummaryInput {
  user: {
    email: string
    currency: string
    timezone: string
  }
  recordCounts: {
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
  fileSize: number
}

export function generateSummary(input: SummaryInput): string {
  const summary = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    user: {
      email: input.user.email,
      currency: input.user.currency,
      timezone: input.user.timezone,
    },
    recordCounts: input.recordCounts,
    dateRange: input.dateRange ? {
      earliest: format(input.dateRange.earliest, 'yyyy-MM-dd'),
      latest: format(input.dateRange.latest, 'yyyy-MM-dd'),
    } : null,
    fileSize: input.fileSize,
    format: 'ZIP',
  }

  return JSON.stringify(summary, null, 2)
}
```

## Cron Job Pattern (Builder-15-4)

**Code example:**
```typescript
// src/app/api/cron/cleanup-exports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { prisma } from '@/server/db'

export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron authentication
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron configuration error' },
        { status: 500 }
      )
    }

    const expectedAuth = `Bearer ${cronSecret}`
    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron request attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find expired exports
    const expiredExports = await prisma.exportHistory.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })

    console.log(`Found ${expiredExports.length} expired exports to clean up`)

    // Delete from Vercel Blob Storage
    let deletedCount = 0
    let freedBytes = 0

    for (const exp of expiredExports) {
      if (exp.blobKey) {
        try {
          await del(exp.blobKey)
          deletedCount++
          freedBytes += exp.fileSize
        } catch (error) {
          console.error(`Failed to delete blob ${exp.blobKey}:`, error)
          // Continue with other deletions
        }
      }
    }

    // Delete from database
    await prisma.exportHistory.deleteMany({
      where: {
        id: { in: expiredExports.map((e) => e.id) },
      },
    })

    console.log(`Cleanup complete: ${deletedCount} blobs deleted, ${freedBytes} bytes freed`)

    return NextResponse.json({
      success: true,
      message: 'Export cleanup completed',
      results: {
        exportsDeleted: expiredExports.length,
        blobsDeleted: deletedCount,
        bytesFreed: freedBytes,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error cleaning up exports:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
```

**Key points:**
- CRON_SECRET Bearer token authentication
- Find expired exports (expiresAt < now)
- Delete blobs individually (continue on failures)
- Delete database records after successful blob deletion
- Log results (count, freed bytes)
- Support both GET and POST (manual testing)

## Import Order Convention

```typescript
// 1. External dependencies
import { z } from 'zod'
import { format } from 'date-fns'
import { put, del } from '@vercel/blob'

// 2. Next.js/React imports
import { NextRequest, NextResponse } from 'next/server'
import { useState } from 'react'

// 3. tRPC/API imports
import { router, protectedProcedure } from '../trpc'
import { api } from '@/trpc/react'

// 4. Internal utilities
import { generateTransactionCSV } from '@/lib/csvExport'
import { createExportZIP } from '@/lib/archiveExport'

// 5. Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 6. Icons
import { Download, Archive } from 'lucide-react'

// 7. Types
import type { ExportCardProps } from './types'
```

## Error Handling Patterns

### Blob Storage Upload Errors

```typescript
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(path, buffer, options)
    blobKey = blob.url
  } else {
    console.warn('BLOB_READ_WRITE_TOKEN not set, export will not be cached')
  }
} catch (error) {
  console.error('Blob upload failed, export will not be cached:', error)
  // Continue without caching (graceful degradation)
}
```

### Export Generation Errors

```typescript
const exportMutation = api.exports.exportComplete.useMutation({
  onSuccess: (data) => {
    // Handle success
  },
  onError: (error) => {
    toast.error('Export failed', {
      description: error.message || 'Please try again or contact support',
    })
  },
})
```

## Performance Patterns

### Parallel Data Fetching

```typescript
const [transactions, budgets, goals, accounts, recurringTransactions, categories] =
  await Promise.all([
    prisma.transaction.findMany({ ... }),
    prisma.budget.findMany({ ... }),
    prisma.goal.findMany({ ... }),
    prisma.account.findMany({ ... }),
    prisma.recurringTransaction.findMany({ ... }),
    prisma.category.findMany({ ... }),
  ])
```

### Performance Logging

```typescript
const startTime = Date.now()
// ... export generation ...
const duration = Date.now() - startTime
console.log(`Complete export: ${duration}ms, ${recordCount} records, ${fileSize} bytes`)
```

---

**Patterns Status:** COMPLETE
**Copy-Paste Ready:** YES
**Ready for:** Builder Task Breakdown
