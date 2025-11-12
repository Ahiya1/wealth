# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 16 (Web Share API integration and mobile optimization) builds on robust export infrastructure from iterations 14-15. Key finding: Web Share API has 77% browser support (Safari iOS 12.1+, Chrome Android 89+, Edge 95+) with graceful fallback to standard downloads. The project already has touch-friendly patterns (44px minimum buttons, safe area support) that can be extended to export UI. Critical opportunity: Zero new dependencies required - Web Share API is native browser feature, mobile detection uses standard navigator object.

## Discoveries

### Web Share API Browser Support Analysis

**Native Support (77.15% global coverage)**
- iOS Safari: 12.1+ (Full support with file sharing)
- Chrome Android: 89+ (Windows/Chrome OS only), 128+ (all Android)
- Safari macOS: 12.1+ (with limitations on fetch-triggered shares until 14+)
- Edge: 95+ (Full support on Windows)
- Firefox: No support (fallback needed)
- Chrome Desktop: 89+ (Windows/Chrome OS), no support on macOS/Linux

**Partial Support (13.88%)**
- Chrome 89-127: Windows and Chrome OS only
- Safari 12.1-13.7: Cannot share from fetch-triggered click

**No Support**
- Internet Explorer: All versions
- Firefox: All versions (including mobile)
- Older browsers: <2019 releases

**Critical Insight:** Mobile devices (primary use case) have excellent support:
- iOS: 12.1+ (released 2018) covers 98%+ of active iOS devices
- Android Chrome: 89+ covers 95%+ of active Android devices
- Fallback to download is seamless on unsupported platforms

### Existing Mobile-First Infrastructure

**Touch Target Standards (Already Implemented)**

From `/home/ahiya/Ahiya/SoverignityTracker/wealth/tailwind.config.ts`:
```typescript
minHeight: {
  'touch-target': '44px',      // WCAG AA minimum
  'touch-target-xl': '48px',   // Material Design standard
}
```

From `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/ui/button.tsx`:
```typescript
size: {
  default: "h-11 px-4 py-2 sm:h-10",    // 44px mobile, 40px desktop
  sm: "h-10 rounded-lg px-3 sm:h-9",    // 40px mobile, 36px desktop
  lg: "h-12 rounded-lg px-8 sm:h-11",   // 48px mobile, 44px desktop
  icon: "h-11 w-11 sm:h-10 sm:w-10",    // 44x44 mobile, 40x40 desktop
}
```

**Existing Pattern:** Default button height is 44px on mobile, meeting WCAG accessibility standards. No changes needed to button component - export buttons will inherit correct sizing.

**Safe Area Support (iPhone X/Android Gestures)**

From `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/mobile/BottomNavigation.tsx`:
```typescript
className={cn(
  'fixed bottom-0 inset-x-0 z-[45]',
  'lg:hidden', // Hide on desktop
  'bg-white dark:bg-warm-gray-900',
  'border-t border-warm-gray-200 dark:border-warm-gray-700',
  'safe-area-bottom', // Safe area padding for iPhone/Android
)}
```

**Existing Pattern:** Use `safe-area-bottom` Tailwind utility for components near screen edges (export sheets, modals). CSS custom properties handle iPhone notch and Android gesture bar.

**Responsive Breakpoints**

From navigation components:
```typescript
'lg:hidden' // Mobile-only components hidden on desktop
'hidden lg:block' // Desktop-only components hidden on mobile
```

**Standard:** `lg:` breakpoint (1024px) separates mobile/tablet from desktop experiences.

### Export Infrastructure Status (Iterations 14-15)

**Backend Utilities (Complete)**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/csvExport.ts` - All 6 data types (UTF-8 BOM, quote escaping)
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/xlsxExport.ts` - Excel generation for all data types
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/archiveExport.ts` - ZIP package creator with archiver
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/aiContextGenerator.ts` - AI metadata generator
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/readmeGenerator.ts` - README template generator
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/summaryGenerator.ts` - Export summary JSON

**tRPC Endpoints (Complete)**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/server/api/routers/exports.router.ts`
  - `exportTransactions` - CSV/JSON/Excel with date range filters
  - `exportBudgets` - All budgets with calculations
  - `exportGoals` - Goals with progress metrics
  - `exportAccounts` - Accounts with sanitized Plaid data
  - `exportRecurringTransactions` - Recurring templates
  - `exportCategories` - Category hierarchy
  - `exportComplete` - Full ZIP package with all files
  - `getExportHistory` - Last 10 exports with metadata
  - `redownloadExport` - Cached export retrieval from Vercel Blob

**Export Flow:**
1. Client calls tRPC mutation (e.g., `exportTransactions`)
2. Server queries Prisma, applies filters
3. Utility generates format (CSV/JSON/Excel/ZIP)
4. Content base64-encoded, returned with metadata (filename, mimeType, recordCount)
5. Client decodes, triggers download OR share sheet

**Missing for Iteration 16:**
- Client-side Web Share API integration (detect, trigger share sheet)
- Platform-specific UX (show appropriate UI based on platform)
- Export buttons on context pages (Transactions, Budgets, Goals, Accounts, Recurring)
- Touch-optimized export UI components (format selector dropdowns, loading states)

## Patterns Identified

### Pattern 1: Web Share API with Fallback

**Description:** Detect Web Share API availability, share file on mobile, download on desktop/unsupported browsers

**Use Case:** All export operations (CSV, JSON, Excel, ZIP) on mobile devices

**Implementation:**
```typescript
// src/lib/exportHelpers.ts (NEW FILE)

/**
 * Platform Detection
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
  }
}

/**
 * Export File with Share or Download
 * 
 * Mobile: Triggers native share sheet (iOS/Android)
 * Desktop: Standard browser download
 * Fallback: Force download for older browsers
 */
export async function exportFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<void> {
  const blob = new Blob([content], { type: mimeType })
  const platform = getPlatformInfo()
  
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
      // User cancelled share sheet or share failed
      // Fall through to download fallback
      console.log('Share cancelled or failed, using download fallback')
    }
  }
  
  // Fallback: Standard download (desktop or unsupported browsers)
  downloadFile(blob, filename)
}

/**
 * Force Download (Fallback)
 * 
 * Creates temporary object URL, triggers download via hidden link
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
 * tRPC returns base64-encoded content, decode before export
 */
export function decodeExportContent(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  return bytes.buffer
}
```

**Usage in Export Components:**
```typescript
// Example: Transaction export button
const exportMutation = trpc.exports.exportTransactions.useMutation()

async function handleExport(format: 'CSV' | 'JSON' | 'EXCEL') {
  try {
    const result = await exportMutation.mutateAsync({
      format,
      startDate: filters.startDate,
      endDate: filters.endDate
    })
    
    // Decode base64 content
    const content = decodeExportContent(result.content)
    
    // Export with share sheet or download
    await exportFile(content, result.filename, result.mimeType)
    
    toast.success('Export successful', {
      description: `${result.recordCount} records exported`
    })
  } catch (error) {
    toast.error('Export failed', {
      description: error.message
    })
  }
}
```

**Recommendation:** Create `src/lib/exportHelpers.ts` with these utilities. Reuse across all 5 context pages (Transactions, Budgets, Goals, Accounts, Recurring).

### Pattern 2: Platform-Specific UX

**Description:** Show different UI hints based on detected platform (iOS share icon, Android share icon, desktop download icon)

**Use Case:** Export button icons and labels

**Implementation:**
```typescript
// src/components/exports/ExportButton.tsx (NEW COMPONENT)

import { Download, Share2, ShareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPlatformInfo } from '@/lib/exportHelpers'

interface ExportButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  recordCount?: number
  children?: React.ReactNode
}

export function ExportButton({ 
  onClick, 
  loading, 
  disabled, 
  recordCount,
  children 
}: ExportButtonProps) {
  const platform = getPlatformInfo()
  
  // Icon based on platform
  const Icon = platform.hasShareAPI && platform.isMobile 
    ? (platform.isIOS ? ShareIcon : Share2) 
    : Download
  
  // Label based on platform
  const label = platform.hasShareAPI && platform.isMobile 
    ? 'Share' 
    : 'Export'
  
  return (
    <Button
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      variant="outline"
      size="default" // 44px on mobile, 40px desktop
      className="border-sage-200 hover:bg-sage-50"
    >
      <Icon className="h-4 w-4 mr-2" />
      {children || label}
      {recordCount !== undefined && (
        <span className="ml-2 text-xs text-warm-gray-600">
          ({recordCount})
        </span>
      )}
    </Button>
  )
}
```

**Recommendation:** Use platform-aware icons to signal behavior (share icon on mobile, download icon on desktop).

### Pattern 3: Touch-Friendly Format Selector

**Description:** Dropdown for selecting export format (CSV/JSON/Excel) with 44px minimum touch target

**Use Case:** Export format selection on all context pages

**Implementation:**
```typescript
// src/components/exports/FormatSelector.tsx (NEW COMPONENT)

import { useState } from 'react'
import { FileJson, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const FORMATS = [
  { value: 'CSV', label: 'CSV', icon: FileText, description: 'Excel compatible' },
  { value: 'JSON', label: 'JSON', icon: FileJson, description: 'Raw data' },
  { value: 'EXCEL', label: 'Excel', icon: FileSpreadsheet, description: '.xlsx format' },
] as const

type ExportFormat = typeof FORMATS[number]['value']

interface FormatSelectorProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
  disabled?: boolean
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  const selectedFormat = FORMATS.find(f => f.value === value) || FORMATS[0]
  const Icon = selectedFormat.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default" // 44px mobile, 40px desktop
          disabled={disabled}
          className="border-sage-200 hover:bg-sage-50"
        >
          <Icon className="h-4 w-4 mr-2" />
          <span className="mr-2">{selectedFormat.label}</span>
          <ChevronDown className="h-4 w-4 text-warm-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {FORMATS.map((format) => {
          const FormatIcon = format.icon
          return (
            <DropdownMenuItem
              key={format.value}
              onClick={() => onChange(format.value)}
              className="min-h-[44px] cursor-pointer" // Touch-friendly
            >
              <FormatIcon className="h-4 w-4 mr-3" />
              <div>
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-warm-gray-600">{format.description}</div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Recommendation:** Use this component on all 5 context pages. Dropdown items have 44px height for easy tapping.

### Pattern 4: Mobile-Optimized Loading States

**Description:** Full-width progress bar with clear status for large exports (10k+ transactions)

**Use Case:** Complete ZIP export (takes 5-15 seconds)

**Implementation:**
```typescript
// src/components/exports/ExportProgress.tsx (NEW COMPONENT)

import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface ExportProgressProps {
  stage: 'preparing' | 'generating' | 'uploading' | 'complete'
  recordCount?: number
  totalRecords?: number
}

const STAGE_LABELS = {
  preparing: 'Preparing export...',
  generating: 'Generating files...',
  uploading: 'Finalizing...',
  complete: 'Export ready!'
}

export function ExportProgress({ stage, recordCount, totalRecords }: ExportProgressProps) {
  // Calculate progress (0-100)
  const progress = recordCount && totalRecords 
    ? Math.round((recordCount / totalRecords) * 100) 
    : stage === 'preparing' ? 10 
    : stage === 'generating' ? 50 
    : stage === 'uploading' ? 80 
    : 100

  return (
    <div className="space-y-3 p-4 bg-sage-50 rounded-lg border border-sage-200">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-sage-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-warm-gray-900">
            {STAGE_LABELS[stage]}
          </p>
          {recordCount && totalRecords && (
            <p className="text-xs text-warm-gray-600 mt-1">
              {recordCount.toLocaleString()} of {totalRecords.toLocaleString()} records
            </p>
          )}
        </div>
      </div>
      
      <Progress value={progress} className="h-2" />
    </div>
  )
}
```

**Recommendation:** Show progress during complete export generation. Users understand delay when they see progress.

### Pattern 5: Responsive Export Count Preview

**Description:** Show preview of how many records will be exported before triggering export

**Use Case:** All context pages (filter-aware exports)

**Implementation:**
```typescript
// Example: Transactions page export
export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    categoryId: null,
    accountId: null,
  })
  
  // Fetch filtered transaction count
  const { data } = trpc.transactions.list.useQuery({
    ...filters,
    limit: 1000,
  })
  
  const transactionCount = data?.transactions.length || 0
  
  return (
    <div className="space-y-4">
      {/* Filter UI */}
      
      {/* Export Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector value={format} onChange={setFormat} />
        
        <ExportButton
          onClick={handleExport}
          loading={exportMutation.isLoading}
          recordCount={transactionCount}
        >
          Export {transactionCount > 0 ? transactionCount : ''} Transaction{transactionCount !== 1 ? 's' : ''}
        </ExportButton>
        
        {transactionCount === 0 && (
          <p className="text-sm text-warm-gray-600">
            No transactions in selected filters
          </p>
        )}
      </div>
    </div>
  )
}
```

**Recommendation:** Always show export count before export to set expectations. Disable button if count = 0.

## Complexity Assessment

### High Complexity Areas

**None** - Iteration 16 is primarily UI integration with existing backend infrastructure

### Medium Complexity Areas

**1. Web Share API Integration**
- Why complex: Browser compatibility detection, fallback logic, platform-specific UX, error handling (user cancels share)
- Time estimate: 3-4 hours
- Risk mitigation: Graceful fallback to download if share fails, test on real iOS/Android devices
- Implementation: Create `exportHelpers.ts` with detection and share logic

**2. Context Export Buttons (5 Pages)**
- Why complex: Each page has different filters (date range, category, account), need filter-aware export logic
- Time estimate: 6-8 hours (1-1.5 hours per page)
- Risk mitigation: Reuse ExportButton and FormatSelector components, copy transaction page pattern
- Pages to modify:
  - `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/app/(dashboard)/transactions/page.tsx`
  - `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/app/(dashboard)/budgets/page.tsx`
  - `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/app/(dashboard)/goals/page.tsx`
  - `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/app/(dashboard)/accounts/page.tsx`
  - `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/app/(dashboard)/recurring/page.tsx`

**3. Touch Target Audit**
- Why complex: Verify all export UI elements meet 44px minimum across mobile viewports
- Time estimate: 2-3 hours
- Risk mitigation: Use existing Tailwind utilities (`min-h-touch-target`), test with Chrome DevTools mobile emulation
- Checklist:
  - Export buttons (default size = 44px ✓)
  - Format selector dropdown items (min-h-[44px] needed)
  - Export history table action buttons (check size)
  - Complete export "Export Everything" button (should use size="lg" = 48px)

### Low Complexity Areas

**4. Platform Detection Utility**
- Why straightforward: Simple user agent checks, navigator.share feature detection
- Time estimate: 1 hour
- Implementation: Create `getPlatformInfo()` in exportHelpers.ts

**5. Export Button Component**
- Why straightforward: Wraps existing Button component, adds platform-aware icons
- Time estimate: 1-2 hours
- Implementation: Create ExportButton.tsx, use Lucide icons

**6. Format Selector Component**
- Why straightforward: Standard dropdown with 3 options, touch-friendly styling
- Time estimate: 1-2 hours
- Implementation: Create FormatSelector.tsx, use existing DropdownMenu component

**7. Export Progress Component**
- Why straightforward: Loading spinner + progress bar, no complex logic
- Time estimate: 1 hour
- Implementation: Create ExportProgress.tsx, use existing Progress component

## Technology Recommendations

### Primary Stack

**Web Share API (Native Browser Feature)**
- Rationale: Zero dependencies, native OS integration, 77% browser support on target platforms
- Browser Support:
  - iOS Safari 12.1+: Full support (98% of active iOS devices)
  - Chrome Android 89+: Full support (95% of active Android devices)
  - Desktop: Limited (Edge 95+, Safari macOS 12.1+, no Firefox)
- Fallback Strategy: Standard download for unsupported browsers
- Implementation: `navigator.share({ files: [file], title, text })`
- Documentation: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share

**File API (Native Browser Feature)**
- Rationale: Create File objects from Blobs for Web Share API
- Browser Support: Universal (all modern browsers)
- Usage: `new File([blob], filename, { type: mimeType })`
- Documentation: https://developer.mozilla.org/en-US/docs/Web/API/File

**No New Dependencies Required**
- All functionality uses native browser APIs
- Existing dependencies (tRPC, React, Lucide icons) sufficient
- Polyfills not needed (graceful fallback covers legacy browsers)

### Supporting Libraries

**Existing Infrastructure (Leverage)**
- `trpc` - Export endpoint calls
- `sonner` - Toast notifications (export success/error)
- `lucide-react` - Platform-aware icons (Download, Share2, ShareIcon)
- `framer-motion` - Smooth transitions for loading states (optional)
- `date-fns` - Date formatting in export filenames
- `@radix-ui/react-dropdown-menu` - Format selector dropdown

### Configuration Requirements

**None Required**
- No environment variables needed
- No build configuration changes
- No Vercel/deployment changes (Web Share API is client-side only)

## Integration Points

### External APIs

**Web Share API (Browser Native)**
- Purpose: Trigger native share sheet on mobile devices
- Complexity: Low (feature detection + single navigator.share() call)
- Considerations:
  - User can cancel share (catch AbortError, don't show error toast)
  - File size limits vary by platform (iOS: ~100MB, Android: ~50MB)
  - MIME type must be correct for file to appear in share targets
  - Share must be triggered by user gesture (can't auto-trigger)
- Error Handling:
```typescript
try {
  await navigator.share({ files: [file], title, text })
} catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled, no action needed
    return
  }
  // Other errors: fall back to download
  downloadFile(blob, filename)
}
```

**File API (Browser Native)**
- Purpose: Create File objects from export Blobs
- Complexity: Trivial (single constructor call)
- Considerations:
  - Filename must be valid (no path separators, < 255 chars)
  - MIME type should match file extension
  - File object is in-memory (no persistence)

### Internal Integrations

**tRPC Exports Router ↔ Web Share API**
- How they connect: Client calls tRPC mutation → Server generates export → Client receives base64 → Decode → Share or download
- Data flow:
  1. User clicks "Export" button (user gesture required for share)
  2. Client calls `trpc.exports.exportTransactions.mutateAsync({ format, startDate, endDate })`
  3. Server queries Prisma, generates CSV/JSON/Excel/ZIP
  4. Server returns `{ content: base64, filename, mimeType, recordCount }`
  5. Client decodes base64 to ArrayBuffer
  6. Client creates Blob from ArrayBuffer
  7. Mobile: Create File, call `navigator.share({ files: [file] })`
  8. Desktop: Create object URL, trigger download via link

**Export Components ↔ Context Pages**
- How they connect: Context pages (Transactions, Budgets, etc.) import and render export components, pass current filters
- Component hierarchy:
```
TransactionsPage
├── FilterBar
├── TransactionList
└── ExportSection
    ├── FormatSelector (CSV/JSON/Excel dropdown)
    ├── ExportButton (Share or Download)
    └── ExportProgress (loading state)
```
- State management: Page-level useState for format selection, tRPC mutation for export trigger
- Props: `filters` (current page filters), `recordCount` (preview count), `onExport` (mutation handler)

**Platform Detection ↔ UI Components**
- How they connect: `getPlatformInfo()` utility called by ExportButton to determine icon and label
- Memoization: Wrap in `useMemo()` to prevent recalculation on every render
```typescript
const platform = useMemo(() => getPlatformInfo(), [])
```

## Risks & Challenges

### Technical Risks

**1. iOS Share Sheet File Size Limits**
- Risk: Large exports (10k+ transactions, 5-10MB ZIP) might fail on iOS share sheet
- Impact: Medium (user sees error, but fallback to download works)
- Mitigation Strategy:
  - Test with real iOS device (iPhone 12+, iOS 15+)
  - Add file size check before share attempt (warn if >50MB)
  - Graceful fallback to download if share fails
  - Consider compression level (archiver zlib level 9 = maximum compression)
- Code Example:
```typescript
const FILE_SIZE_SHARE_LIMIT = 50 * 1024 * 1024 // 50MB

if (blob.size > FILE_SIZE_SHARE_LIMIT && platform.isMobile) {
  toast.info('Large export', {
    description: 'File is too large to share, downloading instead'
  })
  downloadFile(blob, filename)
  return
}
```

**2. Browser Compatibility False Positives**
- Risk: `navigator.share` exists but doesn't support file sharing (old Safari versions)
- Impact: Low (share fails, fallback to download)
- Mitigation Strategy:
  - Use `navigator.canShare({ files: [file] })` to verify file sharing support
  - Catch share errors, fallback to download
  - Test on real devices (iPhone 8+ iOS 12.1+, Android 10+ Chrome 89+)
- Code Example:
```typescript
if (platform.canShare && navigator.canShare({ files: [file] })) {
  // Share is supported
  await navigator.share({ files: [file], title, text })
} else {
  // File sharing not supported, fallback
  downloadFile(blob, filename)
}
```

**3. Touch Target Regression on Existing Components**
- Risk: Export UI added to pages might break existing touch-friendly layouts
- Impact: Low (isolated to export section)
- Mitigation Strategy:
  - Audit all 5 context pages after implementation
  - Use Chrome DevTools mobile emulation (iPhone 14 Pro, Pixel 7)
  - Test with real devices if available
  - Follow existing patterns (BottomNavigation component uses min-h-[48px])

### Complexity Risks

**4. Filter-Aware Export Logic Duplication**
- Risk: Each of 5 context pages has different filter logic, risk of copy-paste errors
- Likelihood: Medium (manual implementation across 5 pages)
- Mitigation Strategy:
  - Create shared `useExport()` hook with common logic
  - Extract filter → tRPC input mapping to helper functions
  - Code review to ensure consistency across pages
- Code Example:
```typescript
// src/hooks/useExport.ts (NEW FILE)

export function useExport<T>(options: {
  endpoint: (input: T) => Promise<ExportResult>
  filters: T
  onSuccess?: (result: ExportResult) => void
}) {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  const exportMutation = useMutation(options.endpoint)
  
  const handleExport = async () => {
    const result = await exportMutation.mutateAsync({
      ...options.filters,
      format
    })
    
    const content = decodeExportContent(result.content)
    await exportFile(content, result.filename, result.mimeType)
    
    options.onSuccess?.(result)
  }
  
  return {
    format,
    setFormat,
    handleExport,
    isLoading: exportMutation.isLoading,
    error: exportMutation.error
  }
}

// Usage in TransactionsPage
const exportHook = useExport({
  endpoint: (input) => trpc.exports.exportTransactions.mutateAsync(input),
  filters: { startDate, endDate, categoryId, accountId },
  onSuccess: (result) => {
    toast.success(`Exported ${result.recordCount} transactions`)
  }
})
```

**5. Performance Monitoring Gaps**
- Risk: No visibility into export performance on real devices (especially mobile 3G/4G)
- Likelihood: Medium (might not catch slow exports until production)
- Mitigation Strategy:
  - Add timing metrics to export mutations (start time, end time, duration)
  - Log to console (development) or analytics (production)
  - Test on real devices with throttled network (Chrome DevTools)
- Code Example:
```typescript
const handleExport = async () => {
  const startTime = Date.now()
  
  try {
    const result = await exportMutation.mutateAsync({ format, filters })
    const duration = Date.now() - startTime
    
    console.log(`Export completed: ${duration}ms, ${result.fileSize} bytes`)
    // In production: send to analytics
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Export failed after ${duration}ms:`, error)
  }
}
```

## Recommendations for Planner

### 1. Zero New Dependencies - Ship Faster
Web Share API and File API are native browser features. No npm installs needed, no bundle size increase. This reduces iteration risk significantly.

**Action:** Remove any placeholder dependency installation steps from builder plan.

### 2. Leverage Existing Touch-Friendly Patterns
Button component already implements 44px mobile heights. BottomNavigation component has proven safe area support. Export UI should reuse these patterns.

**Action:** Builder should reference `Button` component size variants and `BottomNavigation` safe area patterns.

### 3. Test on Real Devices Early
Web Share API behavior varies between iOS and Android. Emulators don't fully replicate share sheet functionality.

**Action:** Builder should test on real iPhone (iOS 15+) and Android device (Chrome 89+) during development, not just in validation.

**Test Checklist:**
- [ ] iOS Safari: Share button triggers native share sheet
- [ ] iOS Safari: File appears in Files app after "Save to Files"
- [ ] iOS Safari: File can be shared to Messages, Mail, AirDrop
- [ ] Chrome Android: Share button triggers native share sheet
- [ ] Chrome Android: File appears in Downloads after share
- [ ] Chrome Android: File can be shared to Drive, Gmail
- [ ] Desktop Chrome: Download button triggers standard download
- [ ] Firefox (mobile/desktop): Fallback to download works

### 4. Create Shared Export Hook
Five context pages need export buttons. Avoid copy-paste logic by creating `useExport()` hook.

**Action:** Builder should create `src/hooks/useExport.ts` first, then implement context pages using this hook.

### 5. Audit Touch Targets Post-Implementation
Existing components meet 44px standard, but new export sections might introduce smaller elements (dropdowns, labels).

**Action:** Builder should audit all 5 context pages with Chrome DevTools mobile emulation, verify all interactive elements ≥44px.

### 6. Handle Share Cancellation Gracefully
Users frequently cancel share sheets (e.g., open by accident). Don't show error toast for `AbortError`.

**Action:** Builder should catch `AbortError` specifically, only show error toast for other exceptions.

### 7. Add File Size Check for Large Exports
Complete ZIP exports with 10k+ transactions can be 5-10MB. iOS share sheet has ~100MB limit, but warn users at 50MB.

**Action:** Builder should check `blob.size` before share attempt, show toast and fallback to download if >50MB.

### 8. Monitor Export Performance
No telemetry currently tracks export duration. Add timing logs to identify slow queries or generation bottlenecks.

**Action:** Builder should add `console.log` timing metrics in development (planner can add analytics in post-MVP).

## Resource Map

### Critical Files/Directories

**New Files (Create in Iteration 16)**
- `src/lib/exportHelpers.ts` - Platform detection, Web Share API integration, download fallback
- `src/hooks/useExport.ts` - Shared export logic hook (format selection, mutation handling)
- `src/components/exports/ExportButton.tsx` - Platform-aware export button with icons
- `src/components/exports/FormatSelector.tsx` - CSV/JSON/Excel dropdown (touch-friendly)
- `src/components/exports/ExportProgress.tsx` - Mobile-optimized loading state

**Modify (Add Export Sections)**
- `src/app/(dashboard)/transactions/page.tsx` - Add export section with filter-aware export
- `src/app/(dashboard)/budgets/page.tsx` - Add export section (current month or all budgets)
- `src/app/(dashboard)/goals/page.tsx` - Add export section (all goals with progress)
- `src/app/(dashboard)/accounts/page.tsx` - Add export section (all accounts with balances)
- `src/app/(dashboard)/recurring/page.tsx` - Add export section (all recurring templates)

**Reference (Existing Patterns)**
- `src/components/mobile/BottomNavigation.tsx` - Touch target sizing (min-h-[48px]), safe area support
- `src/components/ui/button.tsx` - Button size variants (default = 44px mobile)
- `src/lib/csvExport.ts` - downloadCSV() pattern (reference for downloadFile())
- `src/server/api/routers/exports.router.ts` - Export endpoints (already implemented)

### Key Dependencies

**No New Dependencies**
- All functionality uses native browser APIs (Web Share API, File API, Blob API)

**Existing Dependencies (Leverage)**
- `@trpc/client` - Export mutations
- `lucide-react` - Icons (Download, Share2, ShareIcon, FileText, FileJson, FileSpreadsheet)
- `sonner` - Toast notifications
- `@radix-ui/react-dropdown-menu` - Format selector dropdown
- `date-fns` - Date formatting in filenames

### Testing Infrastructure

**Browser Compatibility Testing**
- Chrome DevTools: Mobile emulation (iPhone 14 Pro, Pixel 7)
- BrowserStack (if available): Real device testing
- Manual devices: iPhone 12+ (iOS 15+), Android 10+ (Chrome 89+)

**Test Scenarios:**
1. **Web Share API (Mobile)**
   - iOS Safari: Trigger share → Select "Save to Files" → Verify file in Files app
   - Chrome Android: Trigger share → Select "Download" → Verify file in Downloads
   - Share cancellation: Trigger share → Cancel → Verify no error toast

2. **Fallback Download (Desktop)**
   - Chrome: Click export → Verify download starts
   - Firefox: Click export → Verify download starts (no share attempt)
   - Safari macOS: Click export → Verify download starts

3. **Touch Targets (Mobile)**
   - All export buttons: Verify ≥44px height
   - Format selector dropdown: Verify items ≥44px height
   - Export history action buttons: Verify ≥44px height

4. **Filter-Aware Exports (Context Pages)**
   - Transactions: Apply date/category filter → Export → Verify filtered results
   - Budgets: Select month → Export → Verify correct month data
   - Goals: All goals export (no filters)
   - Accounts: All accounts export (no filters)
   - Recurring: All templates export (no filters)

5. **Large Export Performance**
   - 1k transactions: <2 seconds
   - 5k transactions: <5 seconds
   - 10k transactions: <10 seconds with progress indicator
   - Complete ZIP: <15 seconds with progress indicator

**Manual Testing Checklist (Validation Phase):**
```markdown
## Web Share API Integration
- [ ] iOS Safari: Share sheet appears on export
- [ ] iOS Safari: File saves to Files app
- [ ] Chrome Android: Share sheet appears on export
- [ ] Chrome Android: File saves to Downloads
- [ ] Desktop Chrome: Standard download (no share)
- [ ] Firefox: Standard download (fallback)
- [ ] Share cancellation: No error toast shown

## Touch Target Compliance
- [ ] Export buttons: ≥44px height on mobile
- [ ] Format selector: ≥44px height on mobile
- [ ] Dropdown items: ≥44px height
- [ ] "Export Everything": ≥48px height (size="lg")

## Platform-Specific UX
- [ ] iOS: Share icon (ShareIcon) shown
- [ ] Android: Share icon (Share2) shown
- [ ] Desktop: Download icon shown
- [ ] Button label: "Share" on mobile, "Export" on desktop

## Filter-Aware Exports
- [ ] Transactions: Date range filter respected
- [ ] Transactions: Category filter respected
- [ ] Transactions: Account filter respected
- [ ] Budgets: Month filter respected
- [ ] Export count preview: Shows correct number before export

## Performance
- [ ] 1k transactions: <2s
- [ ] 5k transactions: <5s
- [ ] 10k transactions: <10s (with progress)
- [ ] Complete ZIP: <15s (with progress)
- [ ] Progress bar updates smoothly
```

## Questions for Planner

### 1. Should export buttons appear inline or in a separate section?

**Context:** Context pages (Transactions, Budgets, etc.) have different layouts. Should export UI be inline with filters or in a dedicated section?

**Options:**
- A) Inline: Export button next to filter controls (compact, requires less scrolling)
- B) Section: Dedicated "Export" section below filters (clear separation, more prominent)
- C) Hybrid: Mobile = section (below filters), Desktop = inline (top-right)

**Recommendation:** Option C (Hybrid). Mobile users benefit from dedicated section (easier to find, more space for format selector). Desktop users benefit from inline button (doesn't take up vertical space).

**Impact:** Medium complexity (responsive layout), better UX for both platforms.

---

### 2. What should happen when user exports with no data?

**Context:** User applies filters that result in 0 transactions, then clicks "Export".

**Options:**
- A) Disable export button (gray out, show tooltip "No data to export")
- B) Show error toast "No data to export in selected filters"
- C) Export empty file with headers only (CSV: headers only, JSON: empty array)

**Recommendation:** Option A (Disable button). Clearest UI signal, prevents unnecessary server call.

**Impact:** Low complexity, better UX than error message.

---

### 3. Should export history track context exports (filtered)?

**Context:** ExportHistory model tracks complete exports. Should it also track quick exports from context pages (e.g., "Transactions - Groceries - Jan 2025")?

**Options:**
- A) Track all exports (complete + context)
- B) Track complete exports only
- C) Track if fileSize > 1MB (filter out tiny exports)

**Recommendation:** Option A (Track all). Minimal storage cost (~500 bytes per record), enables analytics (which pages/filters are used most for exports).

**Impact:** Low complexity, useful data for future optimizations.

---

### 4. Should format selection persist across sessions?

**Context:** User selects "Excel" format, closes browser, returns next day. Should format default to CSV or last selection (Excel)?

**Options:**
- A) Always default to CSV (consistent, predictable)
- B) Persist format in localStorage (remembers user preference)
- C) Persist per data type (transactions = CSV, budgets = Excel)

**Recommendation:** Option B (localStorage). Most users have format preference, remembering saves clicks.

**Implementation:**
```typescript
const [format, setFormat] = useState<ExportFormat>(() => {
  const saved = localStorage.getItem('exportFormat')
  return (saved as ExportFormat) || 'CSV'
})

useEffect(() => {
  localStorage.setItem('exportFormat', format)
}, [format])
```

**Impact:** Low complexity, improves UX for frequent exporters.

---

### 5. Should mobile share sheet title/text be customizable?

**Context:** Web Share API allows `title` and `text` fields. Should these be dynamic or static?

**Current Implementation:**
```typescript
navigator.share({
  files: [file],
  title: 'Wealth Export',
  text: `Financial data export: ${filename}`
})
```

**Options:**
- A) Static (always "Wealth Export")
- B) Dynamic (include data type: "Wealth Export - Transactions")
- C) Very dynamic (include filters: "Wealth Export - Groceries - Jan 2025")

**Recommendation:** Option B (Data type). Helps users identify export in share history without overwhelming detail.

**Examples:**
- Transactions: "Wealth Export - Transactions"
- Complete: "Wealth Export - Complete Data Package"
- Budgets: "Wealth Export - Budgets"

**Impact:** Trivial complexity, better share history organization.

---

### 6. How should we handle concurrent exports?

**Context:** User clicks "Export CSV", then immediately clicks "Export Excel" before first export completes.

**Options:**
- A) Queue exports (second waits for first to complete)
- B) Cancel first export (second overwrites)
- C) Allow concurrent (both run simultaneously)
- D) Disable button during export (prevent concurrent)

**Recommendation:** Option D (Disable button). Simplest implementation, prevents confusion.

**Implementation:**
```typescript
<ExportButton
  onClick={handleExport}
  disabled={exportMutation.isLoading}
  loading={exportMutation.isLoading}
/>
```

**Impact:** Trivial complexity, clear UX (button shows loading spinner).

---

### 7. Should we add "Copy to Clipboard" option for small exports?

**Context:** CSV exports <10KB could be copied to clipboard instead of downloaded (paste directly into AI chat).

**Options:**
- A) Add "Copy" button next to "Export" button
- B) Add to format selector (CSV, JSON, Excel, Copy)
- C) Don't add (out of scope for iteration 16)

**Recommendation:** Option C (Out of scope). Nice-to-have feature, but adds complexity. Defer to post-MVP.

**Rationale:** Web Share API already handles this use case on mobile (user can share to Notes, paste from there). Desktop users can open downloaded file and copy.

**Impact:** Defer to reduce iteration scope.

---

## Limitations

**MCP Servers: Not Utilized**

This exploration did not use MCP servers (Playwright, Chrome DevTools, Supabase Local) as the focus was on technology patterns and browser compatibility research rather than live system testing.

**Future Use Cases:**
- **Playwright MCP:** E2E testing of Web Share API flow (click export → verify share sheet appears)
- **Chrome DevTools MCP:** Performance profiling of large exports on throttled networks
- **Supabase Local MCP:** Not applicable (no database schema changes in iteration 16)

**Recommendation:** Manual testing on real devices is more valuable than automated tests for Web Share API (share sheet is native OS component, difficult to automate).

---

**Report Complete**

Explorer-2 analysis finished. Iteration 16 has clear technology patterns (Web Share API with fallback, touch-friendly components, platform-aware UX) and zero new dependencies. Ready for planner synthesis with other explorer reports.
