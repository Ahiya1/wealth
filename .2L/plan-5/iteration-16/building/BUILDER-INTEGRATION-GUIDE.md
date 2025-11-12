# Builder Integration Guide - Export Foundation

## Quick Start for Builders 2-3

This foundation provides everything you need to add exports to context pages.

## Basic Usage Pattern

```typescript
'use client'

import { api } from '@/utils/api'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function YourPage() {
  // 1. Get your data (existing query)
  const { data } = api.yourData.list.useQuery()
  const recordCount = data?.length || 0

  // 2. Create export mutation
  const exportMutation = api.exports.exportYourData.useMutation()

  // 3. Use export hook
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({ format }), // Add filters here if needed
    dataType: 'yourDataType',
  })

  // 4. Render export section
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
          recordCount={recordCount}
        >
          Export Your Data
        </ExportButton>
      </div>

      {/* Your existing content */}
    </div>
  )
}
```

## With Filters (Transactions, Budgets)

```typescript
// Pass filters to getInput callback
const exportHook = useExport({
  mutation: exportMutation,
  getInput: (format) => ({
    format,
    startDate: filters.startDate,
    endDate: filters.endDate,
    categoryId: filters.categoryId,
  }),
  dataType: 'transactions',
})
```

## Available Components

### ExportButton

```typescript
<ExportButton
  onClick={handleExport}        // Required: export handler
  loading={boolean}              // Optional: show spinner
  disabled={boolean}             // Optional: disable button
  recordCount={number}           // Optional: show count in label
  className={string}             // Optional: custom classes
>
  Button Text
</ExportButton>
```

**Features:**
- Platform-aware icons (iOS/Android share, Desktop download)
- Auto-disables when recordCount === 0
- 44px mobile height
- Accessibility built-in

### FormatSelector

```typescript
<FormatSelector
  value={format}                 // Required: current format
  onChange={(f) => setFormat(f)} // Required: format change handler
  disabled={boolean}             // Optional: disable dropdown
/>
```

**Features:**
- CSV/JSON/Excel options
- 44px touch-friendly items
- Keyboard navigation
- Format persistence via hook

### useExport Hook

```typescript
const { format, setFormat, handleExport, isLoading, error } = useExport({
  mutation: exportMutation,      // tRPC mutation
  getInput: (format) => input,   // Build input from format
  dataType: 'transactions',      // Data type name
  onSuccess: (count) => {},      // Optional success callback
})
```

**Features:**
- Format state + localStorage persistence
- Export handler with error handling
- Success/error toasts
- Generic type support

## Expected tRPC Response

Your export mutation should return:

```typescript
{
  content: string      // base64-encoded file content
  filename: string     // e.g., "wealth-transactions-2025-11-10.csv"
  mimeType: string     // e.g., "text/csv;charset=utf-8"
  recordCount: number  // for success toast
  fileSize: number     // for warnings
}
```

This matches all existing exports.router.ts endpoints.

## Styling Guidelines

**Use existing Button component sizing:**
- Default button: `size="default"` (44px mobile)
- Large button: `size="lg"` (48px mobile)

**Layout pattern:**
```typescript
<div className="flex items-center gap-3 flex-wrap">
  <FormatSelector ... />
  <ExportButton ... />
</div>
```

**Add below filters, above data list:**
```typescript
{/* Existing filter UI */}

{/* Export Section */}
<div className="flex items-center gap-3 flex-wrap">
  ...
</div>

{/* Existing data list */}
```

## Error Handling

The hook handles all errors automatically:
- Share cancelled (AbortError) - No error toast
- Network errors - Error toast with message
- Large files (>50MB mobile) - Warning toast, uses download
- No data (recordCount === 0) - Button auto-disabled

**You don't need to add try-catch around handleExport.**

## Testing Checklist

- [ ] Export button appears on page
- [ ] Format selector shows all 3 formats
- [ ] Click export triggers mutation
- [ ] Success toast shows record count
- [ ] Export button disabled when no data
- [ ] Loading spinner shows during export
- [ ] Filters respected in export (if applicable)

## Common Issues

**Issue:** Button not 44px on mobile
**Fix:** Use `size="default"` (not "sm")

**Issue:** Export not respecting filters
**Fix:** Pass filters to `getInput` callback, not mutation directly

**Issue:** Format not persisting
**Fix:** Use `exportHook.format` and `exportHook.setFormat` (not separate state)

**Issue:** Error toast on share cancel
**Fix:** Hook handles AbortError automatically (no custom error handling needed)

## Files Location

```
src/
├── lib/
│   └── exportHelpers.ts           # Web Share API, platform detection
├── components/
│   └── exports/
│       ├── ExportButton.tsx       # Platform-aware export button
│       └── FormatSelector.tsx     # Format dropdown
└── hooks/
    └── useExport.ts               # Export logic hook
```

## Questions?

Refer to:
- Builder-16-1 report: Detailed implementation notes
- patterns.md: Context page integration patterns
- Test page: /test-exports (live component demo)

Good luck with integration!
