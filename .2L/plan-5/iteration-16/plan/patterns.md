# Code Patterns & Conventions - Iteration 16

## File Structure

```
src/
├── app/
│   └── (dashboard)/
│       ├── transactions/
│       │   └── page.tsx                    # Add export section
│       ├── budgets/
│       │   └── page.tsx                    # Add export section
│       ├── goals/
│       │   └── page.tsx                    # Add export section
│       ├── accounts/
│       │   └── page.tsx                    # Add export section
│       └── recurring/
│           └── page.tsx                    # Add export section
├── components/
│   ├── exports/                            # NEW DIRECTORY
│   │   ├── ExportButton.tsx                # Platform-aware export button
│   │   └── FormatSelector.tsx              # CSV/JSON/Excel dropdown
│   └── ui/
│       ├── button.tsx                      # Existing (reuse)
│       ├── dropdown-menu.tsx               # Existing (reuse)
│       └── progress.tsx                    # Existing (reuse)
├── lib/
│   ├── exportHelpers.ts                    # NEW FILE - Web Share API integration
│   ├── csvExport.ts                        # Existing (no changes)
│   ├── xlsxExport.ts                       # Existing (no changes)
│   └── utils.ts                            # Existing (reuse cn helper)
└── server/
    └── api/
        └── routers/
            └── exports.router.ts           # Existing (no changes)
```

## Naming Conventions

- **Components:** PascalCase (`ExportButton.tsx`, `FormatSelector.tsx`)
- **Utilities:** camelCase (`exportHelpers.ts`, `getPlatformInfo`)
- **Types:** PascalCase (`ExportFormat`, `PlatformInfo`, `ExportButtonProps`)
- **Functions:** camelCase (`exportFile()`, `downloadFile()`, `handleExport()`)
- **Constants:** SCREAMING_SNAKE_CASE (`EXPORT_FORMATS`, `FILE_SIZE_LIMIT`)

## Import Order Convention

```typescript
// 1. React & Next.js
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries (alphabetical)
import { Download, Share2, ShareIcon, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// 3. tRPC & API
import { api } from '@/utils/api'

// 4. Components (absolute imports)
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/exports/ExportButton'

// 5. Utilities & Lib (absolute imports)
import { cn } from '@/lib/utils'
import { exportFile, getPlatformInfo } from '@/lib/exportHelpers'

// 6. Types (last)
import type { ExportFormat, PlatformInfo } from '@/types/exports'
```

## Export Helpers Pattern (NEW FILE)

### File: `src/lib/exportHelpers.ts`

**Purpose:** Web Share API integration, platform detection, file download utilities

```typescript
/**
 * Platform Detection Utility
 *
 * Detects user's platform (iOS/Android/Desktop) and Web Share API support
 *
 * @returns Platform information object
 */
export function getPlatformInfo() {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const isMobile = isIOS || isAndroid || window.matchMedia('(max-width: 768px)').matches
  const hasShareAPI = typeof navigator.share === 'function'

  return {
    isIOS,
    isAndroid,
    isMobile,
    hasShareAPI,
    canShare: hasShareAPI && typeof navigator.canShare === 'function',
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  } as const
}

export type PlatformInfo = ReturnType<typeof getPlatformInfo>

/**
 * Export File with Web Share API or Download Fallback
 *
 * Mobile: Triggers native share sheet (iOS/Android)
 * Desktop: Standard browser download
 *
 * @param content - File content (string or ArrayBuffer)
 * @param filename - Download filename
 * @param mimeType - File MIME type
 * @returns Promise that resolves when share/download completes
 */
export async function exportFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<void> {
  const blob = new Blob([content], { type: mimeType })
  const platform = getPlatformInfo()

  // Check file size (warn if >50MB on mobile)
  const FILE_SIZE_LIMIT = 50 * 1024 * 1024 // 50MB
  if (blob.size > FILE_SIZE_LIMIT && platform.isMobile) {
    toast.info('Large export', {
      description: 'File is too large to share, downloading instead'
    })
    downloadFile(blob, filename)
    return
  }

  // Try Web Share API on mobile
  if (platform.hasShareAPI && platform.isMobile) {
    try {
      const file = new File([blob], filename, { type: mimeType })

      // Check if file sharing is supported
      if (platform.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Wealth Export',
          text: `Financial data export: ${filename}`
        })
        return // Success - share sheet handled file
      }
    } catch (error) {
      // User cancelled share sheet (AbortError) - don't show error
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      // Other errors - fall through to download fallback
      console.log('Share failed, using download fallback:', error)
    }
  }

  // Fallback: Standard download (desktop or unsupported browsers)
  downloadFile(blob, filename)
}

/**
 * Force File Download
 *
 * Creates temporary object URL and triggers download via hidden link
 * Works on all browsers (fallback when Web Share API not available)
 *
 * @param blob - Blob to download
 * @param filename - Download filename
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup object URL after brief delay (ensure download started)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Decode Base64 Export Content
 *
 * tRPC export endpoints return base64-encoded content
 * Decode to ArrayBuffer before creating Blob
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded ArrayBuffer
 */
export function decodeExportContent(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

/**
 * Get Export Share Title
 *
 * Generates platform-appropriate share title based on data type
 *
 * @param dataType - Type of data being exported
 * @returns Share title string
 */
export function getExportShareTitle(dataType: string): string {
  const titles: Record<string, string> = {
    transactions: 'Wealth Export - Transactions',
    budgets: 'Wealth Export - Budgets',
    goals: 'Wealth Export - Goals',
    accounts: 'Wealth Export - Accounts',
    recurring: 'Wealth Export - Recurring Transactions',
    complete: 'Wealth Export - Complete Data Package'
  }

  return titles[dataType] || 'Wealth Export'
}
```

## ExportButton Component Pattern (NEW COMPONENT)

### File: `src/components/exports/ExportButton.tsx`

**Purpose:** Reusable export button with platform-aware icons and loading state

```typescript
'use client'

import { Download, Share2, ShareIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPlatformInfo } from '@/lib/exportHelpers'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  onClick: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  recordCount?: number
  className?: string
  children?: React.ReactNode
}

export function ExportButton({
  onClick,
  loading,
  disabled,
  recordCount,
  className,
  children
}: ExportButtonProps) {
  // Memoize platform detection (don't recalculate on every render)
  const platform = useMemo(() => getPlatformInfo(), [])

  // Platform-aware icon
  const Icon = platform.hasShareAPI && platform.isMobile
    ? (platform.isIOS ? ShareIcon : Share2)
    : Download

  // Platform-aware label
  const defaultLabel = platform.hasShareAPI && platform.isMobile
    ? 'Share'
    : 'Export'

  // Disable if no data to export
  const isDisabled = disabled || (recordCount !== undefined && recordCount === 0)

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      variant="outline"
      size="default" // 44px mobile, 40px desktop
      className={cn(
        'border-sage-200 hover:bg-sage-50 dark:border-sage-700 dark:hover:bg-sage-900',
        className
      )}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}

      {children || defaultLabel}

      {recordCount !== undefined && recordCount > 0 && (
        <span className="ml-2 text-xs text-warm-gray-600 dark:text-warm-gray-400">
          ({recordCount.toLocaleString()})
        </span>
      )}
    </Button>
  )
}
```

**Usage Example:**

```typescript
<ExportButton
  onClick={handleExport}
  loading={exportMutation.isPending}
  recordCount={transactionCount}
>
  Export Transactions
</ExportButton>
```

## FormatSelector Component Pattern (NEW COMPONENT)

### File: `src/components/exports/FormatSelector.tsx`

**Purpose:** Dropdown for selecting export format (CSV/JSON/Excel) with touch-friendly sizing

```typescript
'use client'

import { useState } from 'react'
import { FileJson, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export type ExportFormat = 'CSV' | 'JSON' | 'EXCEL'

const EXPORT_FORMATS = [
  {
    value: 'CSV' as const,
    label: 'CSV',
    icon: FileText,
    description: 'Excel compatible'
  },
  {
    value: 'JSON' as const,
    label: 'JSON',
    icon: FileJson,
    description: 'Raw data'
  },
  {
    value: 'EXCEL' as const,
    label: 'Excel',
    icon: FileSpreadsheet,
    description: '.xlsx format'
  },
] as const

interface FormatSelectorProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
  disabled?: boolean
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  const selectedFormat = EXPORT_FORMATS.find(f => f.value === value) || EXPORT_FORMATS[0]
  const Icon = selectedFormat.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default" // 44px mobile, 40px desktop
          disabled={disabled}
          className="border-sage-200 hover:bg-sage-50 dark:border-sage-700 dark:hover:bg-sage-900"
        >
          <Icon className="mr-2 h-4 w-4" />
          <span className="mr-2">{selectedFormat.label}</span>
          <ChevronDown className="h-4 w-4 text-warm-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {EXPORT_FORMATS.map((format) => {
          const FormatIcon = format.icon
          return (
            <DropdownMenuItem
              key={format.value}
              onClick={() => onChange(format.value)}
              className="min-h-[44px] cursor-pointer" // Touch-friendly height
            >
              <FormatIcon className="mr-3 h-4 w-4" />
              <div>
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
                  {format.description}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Usage Example:**

```typescript
const [format, setFormat] = useState<ExportFormat>('CSV')

<FormatSelector
  value={format}
  onChange={setFormat}
  disabled={exportMutation.isPending}
/>
```

## Export Hook Pattern (RECOMMENDED)

### File: `src/hooks/useExport.ts`

**Purpose:** Shared export logic to avoid duplication across 5 context pages

```typescript
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { exportFile, decodeExportContent } from '@/lib/exportHelpers'
import type { ExportFormat } from '@/components/exports/FormatSelector'

interface UseExportOptions<TInput> {
  mutation: any // tRPC mutation hook
  getInput: (format: ExportFormat) => TInput
  dataType: string
  onSuccess?: (recordCount: number) => void
}

export function useExport<TInput>({
  mutation,
  getInput,
  dataType,
  onSuccess
}: UseExportOptions<TInput>) {
  // Load format preference from localStorage
  const [format, setFormat] = useState<ExportFormat>(() => {
    if (typeof window === 'undefined') return 'CSV'
    const saved = localStorage.getItem('exportFormat')
    return (saved as ExportFormat) || 'CSV'
  })

  // Persist format preference to localStorage
  useEffect(() => {
    localStorage.setItem('exportFormat', format)
  }, [format])

  // Export handler
  const handleExport = async () => {
    try {
      const input = getInput(format)
      const result = await mutation.mutateAsync(input)

      // Decode base64 content
      const content = decodeExportContent(result.content)

      // Export with share sheet or download
      await exportFile(content, result.filename, result.mimeType)

      // Success toast
      toast.success('Export successful', {
        description: `${result.recordCount.toLocaleString()} records exported`
      })

      // Optional callback
      onSuccess?.(result.recordCount)
    } catch (error) {
      // Error toast
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    format,
    setFormat,
    handleExport,
    isLoading: mutation.isPending,
    error: mutation.error
  }
}
```

**Usage Example:**

```typescript
const exportMutation = api.exports.exportTransactions.useMutation()

const exportHook = useExport({
  mutation: exportMutation,
  getInput: (format) => ({
    format,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }),
  dataType: 'transactions',
  onSuccess: (count) => {
    console.log(`Exported ${count} transactions`)
  }
})

// In JSX:
<FormatSelector value={exportHook.format} onChange={exportHook.setFormat} />
<ExportButton onClick={exportHook.handleExport} loading={exportHook.isLoading} />
```

## Context Page Export Integration Pattern

### Pattern 1: Transactions Page (Filter-Aware)

**File:** `src/app/(dashboard)/transactions/page.tsx`

**Add to page component:**

```typescript
'use client'

import { useState } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { api } from '@/utils/api'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function TransactionsPage() {
  // Filter state (existing or new)
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    categoryId: undefined as string | undefined,
    accountId: undefined as string | undefined,
  })

  // Fetch transactions with filters
  const { data, isLoading } = api.transactions.list.useQuery({
    ...filters,
    limit: 1000,
  })

  const transactionCount = data?.transactions?.length || 0

  // Export logic
  const exportMutation = api.exports.exportTransactions.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({
      format,
      startDate: filters.startDate,
      endDate: filters.endDate,
      // Future: categoryId, accountId
    }),
    dataType: 'transactions',
  })

  return (
    <div className="space-y-6">
      {/* Existing filter UI */}

      {/* Export Section - Add below filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector
          value={exportHook.format}
          onChange={exportHook.setFormat}
          disabled={exportHook.isLoading}
        />

        <ExportButton
          onClick={exportHook.handleExport}
          loading={exportHook.isLoading}
          disabled={transactionCount === 0}
          recordCount={transactionCount}
        >
          Export Transactions
        </ExportButton>

        {transactionCount === 0 && (
          <p className="text-sm text-warm-gray-600">
            No transactions in selected filters
          </p>
        )}
      </div>

      {/* Existing transaction list */}
    </div>
  )
}
```

### Pattern 2: Budgets Page (Month-Aware)

**File:** `src/app/(dashboard)/budgets/page.tsx`

**Add to page component:**

```typescript
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { api } from '@/utils/api'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function BudgetsPage() {
  // Current selected month (existing state)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  // Fetch budgets for selected month
  const { data } = api.budgets.listByMonth.useQuery({ month: selectedMonth })
  const budgetCount = data?.length || 0

  // Export logic
  const exportMutation = api.exports.exportBudgets.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({
      format,
      // month: selectedMonth, // Future enhancement: filter by month
    }),
    dataType: 'budgets',
  })

  return (
    <div className="space-y-6">
      {/* Existing month selector */}

      {/* Export Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector
          value={exportHook.format}
          onChange={exportHook.setFormat}
          disabled={exportHook.isLoading}
        />

        <ExportButton
          onClick={exportHook.handleExport}
          loading={exportHook.isLoading}
          recordCount={budgetCount}
        >
          Export Budgets
        </ExportButton>
      </div>

      {/* Existing budget list */}
    </div>
  )
}
```

### Pattern 3: Goals/Accounts/Recurring Pages (Simple Export)

**File:** `src/app/(dashboard)/goals/page.tsx` (similar for accounts, recurring)

**Add to page component:**

```typescript
'use client'

import { api } from '@/utils/api'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function GoalsPage() {
  // Fetch all goals
  const { data } = api.goals.list.useQuery()
  const goalCount = data?.length || 0

  // Export logic
  const exportMutation = api.exports.exportGoals.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({ format }),
    dataType: 'goals',
  })

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector
          value={exportHook.format}
          onChange={exportHook.setFormat}
          disabled={exportHook.isLoading}
        />

        <ExportButton
          onClick={exportHook.handleExport}
          loading={exportHook.isLoading}
          recordCount={goalCount}
        >
          Export Goals
        </ExportButton>
      </div>

      {/* Existing goal list */}
    </div>
  )
}
```

## Error Handling Pattern

### Pattern: Comprehensive Error Handling in Export Flow

```typescript
const handleExport = async () => {
  try {
    // 1. Input validation
    if (recordCount === 0) {
      toast.error('No data to export', {
        description: 'Try adjusting your filters'
      })
      return
    }

    // 2. Make export request
    const result = await exportMutation.mutateAsync(input)

    // 3. Decode content (can throw on invalid base64)
    const content = decodeExportContent(result.content)

    // 4. Export file (can throw on share cancellation or file errors)
    await exportFile(content, result.filename, result.mimeType)

    // 5. Success feedback
    toast.success('Export successful', {
      description: `${result.recordCount.toLocaleString()} records exported`
    })

  } catch (error) {
    // Network errors, tRPC errors
    if (error instanceof Error) {
      // User cancelled share sheet - don't show error
      if (error.name === 'AbortError') {
        return
      }

      // Show user-friendly error
      toast.error('Export failed', {
        description: error.message
      })
    } else {
      // Unknown error
      toast.error('Export failed', {
        description: 'An unexpected error occurred'
      })
    }

    // Log to console for debugging
    console.error('Export error:', error)
  }
}
```

## Loading State Pattern

### Pattern: Visual Loading Feedback

```typescript
// In component
const [isExporting, setIsExporting] = useState(false)

const handleExport = async () => {
  setIsExporting(true)
  try {
    await exportFile(...)
  } finally {
    setIsExporting(false)
  }
}

// In JSX
<ExportButton
  onClick={handleExport}
  loading={isExporting}
  disabled={isExporting || recordCount === 0}
>
  {isExporting ? 'Exporting...' : 'Export'}
</ExportButton>
```

## Testing Pattern

### Pattern: Manual Test Checklist

```typescript
/**
 * Manual Testing Checklist for Context Page Exports
 *
 * Test on REAL DEVICES:
 *
 * iOS Safari (iPhone 12+, iOS 15+):
 * [ ] Export button shows share icon (not download icon)
 * [ ] Click export → Native share sheet appears
 * [ ] Select "Save to Files" → File appears in Files app
 * [ ] Select "Share to Mail" → Mail app opens with attachment
 * [ ] Click export, then cancel share → No error toast shown
 *
 * Chrome Android (Android 10+, Chrome 89+):
 * [ ] Export button shows share icon
 * [ ] Click export → Native share sheet appears
 * [ ] Select "Save to Downloads" → File appears in Downloads folder
 * [ ] Select "Share to Drive" → Google Drive opens
 * [ ] Click export, then cancel → No error toast shown
 *
 * Desktop (Chrome/Firefox/Safari):
 * [ ] Export button shows download icon (not share icon)
 * [ ] Click export → Browser download starts immediately
 * [ ] File appears in Downloads folder
 *
 * All Platforms:
 * [ ] Format selector dropdown items are 44px height (mobile)
 * [ ] Export button is 44px height (mobile)
 * [ ] Export count accurate before export
 * [ ] Filename includes filter context (e.g., date range)
 * [ ] CSV opens correctly in Excel (UTF-8, no garbled characters)
 * [ ] Excel (.xlsx) opens correctly in Excel/Sheets
 * [ ] JSON is valid and pretty-printed
 * [ ] Loading spinner shows during export
 * [ ] Success toast shows record count
 * [ ] Error handling works (network offline, no data)
 */
```

## Performance Pattern

### Pattern: Performance Monitoring (Optional)

```typescript
const handleExport = async () => {
  const startTime = performance.now()

  try {
    await exportFile(...)

    const duration = performance.now() - startTime
    console.log(`Export completed in ${Math.round(duration)}ms`)

    // Optional: Send to analytics
    if (duration > 5000) {
      console.warn('Slow export detected:', {
        duration,
        recordCount,
        format,
      })
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`Export failed after ${Math.round(duration)}ms:`, error)
  }
}
```

## Responsive Design Pattern

### Pattern: Mobile-First Export Section

```typescript
// Export section with responsive layout
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
  {/* Format selector - full width on mobile, auto on desktop */}
  <FormatSelector
    value={format}
    onChange={setFormat}
    className="w-full sm:w-auto"
  />

  {/* Export button - full width on mobile, auto on desktop */}
  <ExportButton
    onClick={handleExport}
    loading={isLoading}
    recordCount={recordCount}
    className="w-full sm:w-auto"
  >
    Export {dataType}
  </ExportButton>

  {/* Help text - always full width */}
  {recordCount === 0 && (
    <p className="text-sm text-warm-gray-600 w-full">
      No data to export
    </p>
  )}
</div>
```

## Accessibility Pattern

### Pattern: Screen Reader Support

```typescript
<ExportButton
  onClick={handleExport}
  loading={isLoading}
  recordCount={recordCount}
  aria-label={`Export ${recordCount} transactions`}
  aria-busy={isLoading}
  aria-disabled={recordCount === 0}
>
  Export Transactions
</ExportButton>
```

## Code Quality Standards

- **TypeScript:** Strict mode, no `any` types
- **Error Handling:** Try-catch all async operations, graceful fallbacks
- **Loading States:** Always show loading feedback for async operations
- **Accessibility:** 44px touch targets, aria labels, keyboard navigation
- **Performance:** Memoize platform detection, avoid unnecessary re-renders
- **User Feedback:** Toast notifications for success/error states

## Summary

**Key Patterns:**
1. **exportHelpers.ts** - Web Share API integration with fallback
2. **ExportButton** - Platform-aware button component
3. **FormatSelector** - Touch-friendly dropdown component
4. **useExport hook** - Shared export logic across pages
5. **Context page integration** - Filter-aware export sections

**Copy-Paste Ready:**
All code examples are production-ready. Builders can copy directly into their files with minimal modifications (update data types, filter props).

**Consistency First:**
All 5 context pages should use the same components and patterns. This ensures uniform UX and easier maintenance.
