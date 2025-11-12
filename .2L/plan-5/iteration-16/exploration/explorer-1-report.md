# Explorer 1 Report: Architecture & Structure for Filter-Aware Exports

## Executive Summary

Iteration 3 focuses on adding **filter-aware export buttons** to 5 data pages (Transactions, Budgets, Goals, Accounts, Recurring). The existing export infrastructure from Iterations 1-2 is **fully functional** and provides a solid foundation. The architecture is clean with modular CSV/Excel/JSON generators, a complete tRPC exports router, and existing Analytics page export pattern. The main implementation challenge is **capturing and serializing filter state** from client components to pass to export endpoints while maintaining clean UX patterns.

**Key Finding:** All 5 pages have **different filter patterns** - some use props, some use local state, some use infinite queries. A **unified ExportButton component** with flexible filter props will ensure consistency across pages.

## Discoveries

### Current Page Architecture Patterns

**Pattern 1: Server Component → Client Component (Transactions, Goals, Accounts)**
- Page component is server-side (auth check only)
- Client component handles all state and UI
- Filter state managed in child components (TransactionList, GoalList, AccountList)

**Pattern 2: Full Client Component (Budgets, Recurring)**
- Entire page is client-side
- Filter state in page component (budgets: `selectedMonth`, goals: `includeCompleted`)
- Direct component rendering (no deep nesting)

**Pattern 3: Existing Export Pattern (Analytics)**
- Analytics page has working CSV export button
- Uses local `dateRange` state
- Direct tRPC query with filters: `trpc.transactions.list.useQuery({ startDate, endDate, limit })`
- Downloads via `generateTransactionCSV()` + `downloadCSV()` utility

### Filter State Management by Page

#### 1. Transactions Page
**Location:** `src/app/(dashboard)/transactions/page.tsx` → `src/components/transactions/TransactionListPage.tsx` → `src/components/transactions/TransactionList.tsx`

**Current Filters:**
- `accountId?: string` (prop-based)
- `categoryId?: string` (prop-based)
- `limit: number = 50` (prop-based)
- Uses **infinite query** with cursor pagination

**Filter State Location:** TransactionList component props (currently hardcoded in TransactionListPage)

**Export Requirements:**
- Add date range filter UI (missing)
- Add search/payee filter UI (missing)
- Export button should preserve: accountId, categoryId, dateRange, search query
- Filename: `wealth-transactions-[filters]-YYYY-MM-DD.csv`

#### 2. Budgets Page
**Location:** `src/app/(dashboard)/budgets/page.tsx` (client component)

**Current Filters:**
- `selectedMonth: string` (YYYY-MM format, local state)
- BudgetList component receives `month` prop

**Filter State Location:** BudgetsPage component state (`useState`)

**Export Requirements:**
- Export current month OR all budgets (toggle option)
- Format selector (CSV, JSON, Excel)
- Filename: `wealth-budgets-[month].csv` OR `wealth-budgets-all.csv`

#### 3. Goals Page
**Location:** `src/app/(dashboard)/goals/page.tsx` → `src/components/goals/GoalsPageClient.tsx` → `src/components/goals/GoalList.tsx`

**Current Filters:**
- `includeCompleted: boolean` (Tabs: "Active Goals" vs "All Goals")

**Filter State Location:** GoalList component prop from Tabs

**Export Requirements:**
- Export active goals OR all goals (based on current tab)
- Format selector
- Filename: `wealth-goals-active.csv` OR `wealth-goals-all.csv`

#### 4. Accounts Page
**Location:** `src/app/(dashboard)/accounts/page.tsx` → `src/components/accounts/AccountListClient.tsx` → `src/components/accounts/AccountList.tsx`

**Current Filters:**
- None (displays all accounts)

**Filter State Location:** N/A

**Export Requirements:**
- Export all accounts (no filters needed)
- Format selector
- Filename: `wealth-accounts-YYYY-MM-DD.csv`

#### 5. Recurring Transactions Page
**Location:** `src/app/(dashboard)/recurring/page.tsx` → `src/components/recurring/RecurringTransactionList.tsx`

**Current Filters:**
- None (displays all recurring transactions)
- Status-based filtering (ACTIVE, PAUSED, COMPLETED, CANCELLED) - UI could be added

**Filter State Location:** N/A (potential future state)

**Export Requirements:**
- Export all recurring transactions
- Optional: Filter by status (enhancement)
- Format selector
- Filename: `wealth-recurring-YYYY-MM-DD.csv`

### Existing Export Infrastructure (Iterations 1-2)

#### tRPC Export Endpoints (`src/server/api/routers/exports.router.ts`)

**Available Procedures:**
- `exportTransactions` - Supports `startDate`, `endDate`, `format` (CSV/JSON/EXCEL)
- `exportBudgets` - Supports `format` only (all budgets)
- `exportGoals` - Supports `format` only (all goals)
- `exportAccounts` - Supports `format` only (all accounts)
- `exportRecurringTransactions` - Supports `format` only
- `exportCategories` - Supports `format` only
- `exportComplete` - Full ZIP package
- `getExportHistory` - List past exports
- `redownloadExport` - Re-download cached export

**Return Format (all endpoints):**
```typescript
{
  content: string,        // Base64-encoded file content
  filename: string,       // e.g., "wealth-transactions-2025-01-01-to-2025-11-10.csv"
  mimeType: string,       // e.g., "text/csv;charset=utf-8"
  recordCount: number,    // Number of records exported
  fileSize: number        // File size in bytes
}
```

**Gap Analysis:**
- `exportTransactions` supports date filters ✅
- Other endpoints lack filter support ❌
- No support for: categoryId, accountId, search query, status filters

#### CSV Export Utilities (`src/lib/csvExport.ts`)

**Available Generators:**
- `generateTransactionCSV(transactions)` ✅
- `generateBudgetCSV(budgets)` ✅
- `generateGoalCSV(goals)` ✅
- `generateAccountCSV(accounts)` ✅
- `generateRecurringTransactionCSV(recurringTransactions)` ✅
- `generateCategoryCSV(categories)` ✅

**Download Helper:**
- `downloadCSV(csvContent, filename)` - Client-side download trigger ✅

#### Excel Export Utilities (`src/lib/xlsxExport.ts`)

**Expected Generators (referenced in exports.router.ts):**
- `generateTransactionExcel()` ✅
- `generateBudgetExcel()` ✅
- `generateGoalExcel()` ✅
- `generateAccountExcel()` ✅
- `generateRecurringTransactionExcel()` ✅
- `generateCategoryExcel()` ✅

## Patterns Identified

### Pattern 1: Analytics Export Pattern (Existing)

**Description:** Direct client-side export using tRPC query data

**Implementation:**
```tsx
// 1. Fetch filtered data
const { data: transactions } = trpc.transactions.list.useQuery({
  startDate: dateRange.startDate,
  endDate: dateRange.endDate,
  limit: 1000,
})

// 2. Export handler
const handleExportCSV = () => {
  if (!transactions?.transactions || transactions.transactions.length === 0) {
    toast.error('No data to export')
    return
  }

  const csvContent = generateTransactionCSV(transactions.transactions)
  const filename = `transactions-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`
  downloadCSV(csvContent, filename)

  toast.success(`Downloaded ${transactions.transactions.length} transactions`)
}
```

**Pros:**
- Simple, no backend changes needed
- Works with existing query data
- Fast (no additional network request)

**Cons:**
- Limited by query limit (pagination issue)
- Data must be loaded before export
- No Excel/JSON support without additional generators
- Doesn't use tRPC export endpoints (inconsistent with Iteration 2 infrastructure)

**Use Case:** Quick exports for already-loaded data on Analytics page

**Recommendation:** ❌ **Don't use for Iteration 3** - We built comprehensive tRPC export endpoints in Iteration 1-2, use those for consistency.

### Pattern 2: tRPC Export Endpoint Pattern (Recommended)

**Description:** Use dedicated tRPC export mutations with filter parameters

**Implementation:**
```tsx
// 1. Import tRPC export mutation
const exportMutation = trpc.exports.exportTransactions.useMutation({
  onSuccess: (data) => {
    // Decode base64 content
    const blob = new Blob([Buffer.from(data.content, 'base64')], { 
      type: data.mimeType 
    })
    
    // Trigger download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = data.filename
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success(`Downloaded ${data.recordCount} transactions`)
  },
  onError: (error) => {
    toast.error('Export failed', { description: error.message })
  }
})

// 2. Export handler with filters
const handleExport = (format: 'CSV' | 'JSON' | 'EXCEL') => {
  exportMutation.mutate({
    format,
    startDate: filters.startDate,
    endDate: filters.endDate,
    // Future: categoryId, accountId, search
  })
}
```

**Pros:**
- Consistent with Iteration 1-2 infrastructure
- Supports all formats (CSV, JSON, Excel)
- Backend handles large datasets (10k+ records)
- Export history tracking
- Vercel Blob caching support
- Centralized export logic

**Cons:**
- Requires network request
- Need to extend endpoints for additional filters

**Use Case:** All context page exports (Transactions, Budgets, Goals, Accounts, Recurring)

**Recommendation:** ✅ **Use this pattern** - Build reusable `ExportButton` component with this logic.

### Pattern 3: Unified ExportButton Component

**Description:** Reusable component that encapsulates export logic for all pages

**Component API:**
```tsx
<ExportButton
  exportType="transactions"
  filters={{
    startDate?: Date,
    endDate?: Date,
    categoryId?: string,
    accountId?: string,
    month?: string,
    includeCompleted?: boolean,
  }}
  currentCount={transactions.length}
  buttonLabel="Export Transactions"
  position="header" // or "toolbar"
/>
```

**Implementation:**
- Single component (`src/components/exports/ExportButton.tsx`)
- Format selector dropdown (CSV/JSON/Excel)
- Export count preview tooltip
- Loading state during export
- Success/error toast handling
- Automatic filename generation based on filters

**Recommendation:** ✅ **Implement this** - Ensures consistency across all 5 pages.

## Complexity Assessment

### High Complexity Areas

**1. Filter State Propagation (Transactions Page)**
- **Why Complex:** TransactionList uses infinite query with cursor pagination, filter state is deeply nested
- **Challenge:** Need to add date range picker + search filter UI to TransactionListPage
- **Current State:** accountId/categoryId passed as props, no date/search filters in UI
- **Builder Split:** No, manageable in single task
- **Estimated Time:** 3-4 hours
- **Solution:**
  - Add `<TransactionFilters>` component to TransactionListPage
  - State: `useState` for `{ startDate, endDate, categoryId, accountId, search }`
  - Pass filters to both TransactionList query AND ExportButton
  - Update TransactionList to accept filter props

**2. tRPC Export Endpoint Extensions**
- **Why Complex:** Need to add filter parameters to 4 endpoints (budgets, goals, accounts, recurring)
- **Challenge:** Prisma query extensions, type safety, filename generation logic
- **Current State:** Only `exportTransactions` supports filters (startDate, endDate)
- **Builder Split:** No, sequential changes across endpoints
- **Estimated Time:** 2-3 hours
- **Solution:**
  ```typescript
  // Example: exportBudgets enhancement
  .input(z.object({
    format: ExportFormatEnum,
    month: z.string().optional(), // YYYY-MM format
    allMonths: z.boolean().optional().default(false),
  }))
  .mutation(async ({ ctx, input }) => {
    const budgets = await ctx.prisma.budget.findMany({
      where: {
        userId: ctx.user.id,
        ...(input.month && !input.allMonths && { month: input.month }),
      },
      // ... rest of query
    })
    
    const filename = input.month && !input.allMonths
      ? `wealth-budgets-${input.month}.${extension}`
      : `wealth-budgets-all-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
  })
  ```

### Medium Complexity Areas

**1. ExportButton Component Design**
- **Why Medium:** Need to handle multiple export types, format selection, loading states
- **Challenge:** Generic enough for all pages, specific enough for good UX
- **Estimated Time:** 2-3 hours
- **Approach:**
  - TypeScript discriminated union for `exportType` → filters mapping
  - Format selector: Dropdown with CSV/JSON/Excel icons
  - Export count: Tooltip showing "Export X records"
  - Position variants: Header button vs inline toolbar

**2. Filename Generation Logic**
- **Why Medium:** Context-aware filenames require filter introspection
- **Challenge:** Different pages have different filter combinations
- **Estimated Time:** 1 hour
- **Examples:**
  - Transactions: `wealth-transactions-dining-2025-01-to-2025-11.csv`
  - Budgets: `wealth-budgets-2025-11.csv`
  - Goals: `wealth-goals-active-2025-11-10.csv`
  - Accounts: `wealth-accounts-2025-11-10.csv`
  - Recurring: `wealth-recurring-active-2025-11-10.csv`

### Low Complexity Areas

**1. Format Selector UI**
- **Why Low:** Standard dropdown/select component
- **Estimated Time:** 30 minutes
- **Implementation:** Radix UI Select with format icons

**2. Export Count Preview**
- **Why Low:** Simple tooltip/badge showing record count
- **Estimated Time:** 30 minutes
- **Implementation:** Tooltip component with dynamic count

**3. UI Integration (Goals, Accounts, Recurring)**
- **Why Low:** Pages have simple/no filters, just add export button
- **Estimated Time:** 1 hour total
- **Implementation:** Add ExportButton to page header, pass minimal/no filters

## Technology Recommendations

### Primary Stack (Already in Place)

- **tRPC Exports Router:** `src/server/api/routers/exports.router.ts` ✅
  - Rationale: Centralized export logic, type-safe, supports caching
  - Status: Fully functional from Iteration 1-2

- **CSV/Excel/JSON Generators:** `src/lib/{csvExport,xlsxExport,jsonExport}.ts` ✅
  - Rationale: Modular, reusable, tested
  - Status: Complete with all data types

- **Prisma ORM:** Database queries with filter support ✅
  - Rationale: Type-safe, composable where clauses
  - Status: All models accessible

- **Zod Validation:** Input validation for export parameters ✅
  - Rationale: Runtime type safety, clear error messages
  - Status: Used in all export endpoints

### Supporting Libraries (No New Dependencies Needed)

**All required libraries already installed:**
- `date-fns` - Date formatting and range handling ✅
- `@radix-ui/react-select` - Format selector dropdown ✅
- `sonner` - Toast notifications ✅
- `lucide-react` - Export button icons (Download, FileDown, etc.) ✅
- `zod` - Schema validation ✅

### Component Architecture

**New Components to Create:**

1. **`src/components/exports/ExportButton.tsx`**
   - Purpose: Unified export button for all pages
   - Props: exportType, filters, currentCount, buttonLabel, position
   - Features: Format selector, loading state, toast notifications

2. **`src/components/exports/FormatSelector.tsx`**
   - Purpose: Dropdown for CSV/JSON/Excel selection
   - Props: value, onChange, disabled
   - Features: Icons for each format, keyboard navigation

3. **`src/components/transactions/TransactionFilters.tsx`**
   - Purpose: Date range, category, account, search filters for Transactions page
   - Props: filters, onFiltersChange
   - Features: Date picker, category/account dropdowns, search input

**Components to Update:**

1. **`src/components/transactions/TransactionListPage.tsx`**
   - Add TransactionFilters component
   - Add ExportButton with filter state
   - Pass filters to TransactionList

2. **`src/app/(dashboard)/budgets/page.tsx`**
   - Add ExportButton with selectedMonth filter
   - Add "All Budgets" toggle

3. **`src/components/goals/GoalsPageClient.tsx`**
   - Add ExportButton that reads current tab (active vs all)

4. **`src/components/accounts/AccountListClient.tsx`**
   - Add ExportButton (no filters)

5. **`src/app/(dashboard)/recurring/page.tsx`**
   - Add ExportButton (no filters initially)

## Integration Points

### Internal Integrations

#### 1. ExportButton ↔ tRPC Export Endpoints

**Connection:** ExportButton calls `trpc.exports.export{Type}.useMutation()`

**Data Flow:**
```
ExportButton (filters) 
  → tRPC mutation (format + filters)
    → Backend (Prisma query + generator)
      → Base64 encoded file
        → ExportButton (decode + download)
          → Browser download / Web Share API
```

**Type Safety:**
```typescript
// ExportButton component
type ExportType = 'transactions' | 'budgets' | 'goals' | 'accounts' | 'recurring'

type ExportFilters = {
  transactions: { startDate?: Date, endDate?: Date, categoryId?: string, accountId?: string, search?: string }
  budgets: { month?: string, allMonths?: boolean }
  goals: { includeCompleted?: boolean }
  accounts: {}
  recurring: { status?: string }
}

interface ExportButtonProps<T extends ExportType> {
  exportType: T
  filters: ExportFilters[T]
  currentCount: number
  buttonLabel?: string
}
```

#### 2. Page Filters ↔ ExportButton ↔ tRPC Query

**Challenge:** Keep export filters in sync with displayed data filters

**Solution:** Single source of truth for filter state
```tsx
// Example: Transactions page
const [filters, setFilters] = useState({
  startDate: subMonths(new Date(), 1),
  endDate: new Date(),
  categoryId: undefined,
  accountId: undefined,
  search: '',
})

// Use same filters for both query and export
const { data: transactions } = trpc.transactions.list.useInfiniteQuery({ 
  ...filters, 
  limit: 50 
})

<ExportButton 
  exportType="transactions" 
  filters={filters} 
  currentCount={transactions?.pages[0]?.transactions.length ?? 0} 
/>
```

#### 3. Format Selector ↔ Export Mutation

**Connection:** Format selector sets mutation input parameter

**Implementation:**
```tsx
const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'JSON' | 'EXCEL'>('CSV')

const handleExport = () => {
  exportMutation.mutate({
    format: selectedFormat,
    ...filters,
  })
}
```

### External Integrations

#### 1. Browser Download API

**Purpose:** Trigger file download from base64 blob

**Implementation:**
```typescript
const triggerDownload = (base64Content: string, filename: string, mimeType: string) => {
  const binaryString = atob(base64Content)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

**Browser Compatibility:** ✅ All modern browsers (Chrome, Firefox, Safari, Edge)

#### 2. Web Share API (Mobile - Future)

**Purpose:** Native share sheet on mobile devices

**Implementation (Iteration 3 scope):**
```typescript
const shareFile = async (blob: Blob, filename: string) => {
  if (navigator.share && navigator.canShare({ files: [new File([blob], filename)] })) {
    try {
      await navigator.share({
        files: [new File([blob], filename)],
        title: 'Wealth Export',
      })
    } catch (error) {
      // Fallback to download
      triggerDownload(blob, filename)
    }
  } else {
    triggerDownload(blob, filename)
  }
}
```

**Browser Support:** iOS Safari, Chrome Android (mobile only)

**Note:** Planned for Iteration 3 per master plan

## Risks & Challenges

### Technical Risks

**Risk 1: Infinite Query Pagination Limit**
- **Impact:** Export might miss records if user scrolled multiple pages
- **Likelihood:** Medium (users may have loaded 50 records but have 500 total)
- **Mitigation:** Export endpoint queries ALL matching records (not limited by pagination)
- **Status:** ✅ Already mitigated - Export endpoints use `take: 10000` separate from UI query

**Risk 2: Date Filter Serialization**
- **Impact:** Date objects don't serialize to JSON correctly in tRPC
- **Likelihood:** High (common tRPC issue)
- **Mitigation:** Use Zod `.transform()` to convert Date to ISO string
- **Implementation:**
  ```typescript
  // In exports.router.ts
  .input(z.object({
    startDate: z.date().optional(),  // tRPC handles Date serialization
    endDate: z.date().optional(),
  }))
  ```
- **Status:** ✅ Already handled - tRPC transformer handles Date serialization

**Risk 3: Large Export Performance**
- **Impact:** Exporting 10k+ records may timeout or freeze browser
- **Likelihood:** Low (10k transactions takes ~2-5s based on Iteration 1 testing)
- **Mitigation:** Show loading state, consider streaming for >50MB exports (post-MVP)
- **Status:** ✅ Acceptable for MVP - Can optimize in future if needed

### Complexity Risks

**Risk 1: Filter State Complexity (Transactions)**
- **Risk:** Managing multiple filter types (date, category, account, search) becomes unwieldy
- **Likelihood:** Medium (4 filter types + reset logic)
- **Mitigation:** Create dedicated `useTransactionFilters` hook to encapsulate state logic
- **Example:**
  ```typescript
  // src/hooks/useTransactionFilters.ts
  const useTransactionFilters = () => {
    const [filters, setFilters] = useState<TransactionFilters>({ /* defaults */ })
    
    const updateFilter = (key: keyof TransactionFilters, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
    
    const resetFilters = () => setFilters({ /* defaults */ })
    
    return { filters, updateFilter, resetFilters }
  }
  ```

**Risk 2: ExportButton Component API Complexity**
- **Risk:** Generic component becomes too complex with conditional logic for each page
- **Likelihood:** Medium (5 different export types with different filters)
- **Mitigation:** Use TypeScript discriminated unions + factory functions
- **Builder Strategy:** Start with simplest pages (Accounts, Recurring) to validate pattern, then extend to complex pages (Transactions)

### UX Risks

**Risk 1: Export Count Mismatch**
- **Risk:** "Export 50 transactions" but user expects all 500 to export
- **Likelihood:** Medium (if count shows paginated results instead of total)
- **Mitigation:** Fetch total count separately or clarify label: "Export ALL filtered transactions (500 total)"
- **Implementation:**
  ```typescript
  // Show both loaded and total count
  const { data, fetchNextPage } = trpc.transactions.list.useInfiniteQuery(...)
  const loadedCount = data?.pages.flatMap(p => p.transactions).length ?? 0
  
  // Export button shows total
  <ExportButton currentCount={totalCount} label="Export All Transactions" />
  ```

**Risk 2: Format Selection Confusion**
- **Risk:** Users don't understand CSV vs Excel vs JSON
- **Likelihood:** Low (most users know CSV/Excel)
- **Mitigation:** Add format descriptions in dropdown
  - CSV: "Open in Excel or Google Sheets"
  - Excel: "Native Excel format (.xlsx)"
  - JSON: "For developers and APIs"

## Recommendations for Planner

### 1. Build Order: Simple to Complex

**Rationale:** Validate ExportButton pattern on simple pages before tackling complex Transactions page

**Sequence:**
1. **ExportButton Component** (foundation) - 2 hours
2. **Accounts Page Export** (simplest, no filters) - 30 min
3. **Recurring Page Export** (simple, no filters) - 30 min
4. **Goals Page Export** (single boolean filter) - 1 hour
5. **Budgets Page Export** (month filter) - 1 hour
6. **Extend tRPC Endpoints** (add filter support) - 2 hours
7. **TransactionFilters Component** - 2 hours
8. **Transactions Page Export** (most complex) - 2 hours

**Total Estimated Time:** 11 hours

### 2. Defer Mobile Web Share API

**Rationale:** Master plan includes mobile optimization in Iteration 3, but core functionality should work first

**Recommendation:**
- Phase 1: Standard browser download (works on mobile browsers)
- Phase 2 (if time permits): Add Web Share API with feature detection

**Implementation Priority:**
```typescript
// Phase 1 (must-have)
triggerDownload(blob, filename, mimeType)

// Phase 2 (nice-to-have)
if (isMobile && navigator.share) {
  await navigator.share({ files: [file] })
} else {
  triggerDownload(blob, filename, mimeType)
}
```

### 3. Create Shared Filter State Hook

**Rationale:** Transactions page will need complex filter management, extract to reusable hook

**Recommendation:**
```typescript
// src/hooks/useExportFilters.ts
export const useExportFilters = <T extends ExportType>(exportType: T) => {
  const [filters, setFilters] = useState<ExportFilters[T]>(getDefaultFilters(exportType))
  
  const updateFilter = <K extends keyof ExportFilters[T]>(
    key: K,
    value: ExportFilters[T][K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const resetFilters = () => setFilters(getDefaultFilters(exportType))
  
  const generateFilename = () => {
    // Context-aware filename based on filters
    // e.g., "wealth-transactions-dining-2025-01-to-2025-11.csv"
  }
  
  return { filters, updateFilter, resetFilters, generateFilename }
}
```

### 4. Add Export Count Tooltip

**Rationale:** Users need clarity on what will be exported before clicking

**Recommendation:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button onClick={handleExport} disabled={exportMutation.isPending}>
      <Download className="mr-2 h-4 w-4" />
      Export {selectedFormat}
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Export {currentCount} {exportType}</p>
    {hasFilters && <p className="text-xs text-muted-foreground">With current filters applied</p>}
  </TooltipContent>
</Tooltip>
```

### 5. Extend Export Endpoints Incrementally

**Rationale:** Don't extend all endpoints at once, validate pattern first

**Sequence:**
1. Start with `exportBudgets` (add `month` filter) - simplest
2. Then `exportGoals` (add `includeCompleted` filter)
3. Then `exportRecurringTransactions` (add `status` filter)
4. Transactions already supports filters ✅
5. Accounts needs no filters ✅

**Pattern to Follow:**
```typescript
// Before (Iteration 2)
.input(z.object({ format: ExportFormatEnum }))

// After (Iteration 3)
.input(z.object({ 
  format: ExportFormatEnum,
  // Page-specific filters
  month: z.string().optional(),           // Budgets
  includeCompleted: z.boolean().optional(), // Goals
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(), // Recurring
}))
```

### 6. Testing Strategy

**Unit Tests (Optional for MVP):**
- Filename generation logic
- Filter serialization

**Manual Testing (Required):**
1. Export from each page with filters applied
2. Verify filename includes filter context
3. Open CSV in Excel, XLSX in Excel, JSON in editor
4. Verify record count matches expectation
5. Test on mobile (download works, no native share yet)
6. Test with 0 records (shows "No data to export" message)
7. Test with large dataset (1000+ records, check performance)

## Resource Map

### Critical Files to Modify

**Backend (tRPC Endpoints):**
- `src/server/api/routers/exports.router.ts` - Add filter parameters to endpoints
  - Lines 106-196: `exportBudgets` - Add month filter
  - Lines 198-270: `exportGoals` - Add includeCompleted filter
  - Lines 323-373: `exportRecurringTransactions` - Add status filter

**New Components:**
- `src/components/exports/ExportButton.tsx` - Unified export button
- `src/components/exports/FormatSelector.tsx` - Format dropdown
- `src/components/transactions/TransactionFilters.tsx` - Filter UI for transactions

**Page Updates:**
- `src/components/transactions/TransactionListPage.tsx` - Add filters + export button
- `src/app/(dashboard)/budgets/page.tsx` - Add export button
- `src/components/goals/GoalsPageClient.tsx` - Add export button
- `src/components/accounts/AccountListClient.tsx` - Add export button
- `src/app/(dashboard)/recurring/page.tsx` - Add export button

**Utility Files (No Changes Needed):**
- `src/lib/csvExport.ts` - ✅ All generators exist
- `src/lib/xlsxExport.ts` - ✅ All generators exist
- `src/lib/jsonExport.ts` - ✅ Already functional

### Key Dependencies

**Runtime Dependencies (Already Installed):**
- `@trpc/client` - Export mutation calls ✅
- `@trpc/server` - Backend endpoints ✅
- `zod` - Input validation ✅
- `date-fns` - Date formatting ✅
- `@radix-ui/react-select` - Format selector ✅
- `lucide-react` - Icons (Download, FileDown, FileJson, FileSpreadsheet) ✅

**No New Dependencies Required** 🎉

### Testing Infrastructure

**Existing Tests (from Iteration 1-2):**
- `src/lib/__tests__/csvExport.test.ts` ✅
- `src/lib/__tests__/xlsxExport.test.ts` ✅
- `src/lib/__tests__/archiveExport.test.ts` ✅

**New Tests (Optional for MVP):**
- `src/components/exports/__tests__/ExportButton.test.tsx` - Component behavior
- `src/components/exports/__tests__/FormatSelector.test.tsx` - Format selection
- Manual E2E: Export from each page and verify downloads

**Rationale:** Core export utilities are tested. Component tests are optional since ExportButton is primarily UI integration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────┐  ┌───────┐  ┌──────────┐       │
│  │Transactions │  │ Budgets  │  │ Goals │  │ Accounts │       │
│  │    Page     │  │   Page   │  │  Page │  │   Page   │       │
│  └──────┬──────┘  └────┬─────┘  └───┬───┘  └────┬─────┘       │
│         │              │            │           │              │
│         ├──Filter State─┤           ├─Tab State─┤              │
│         │   (startDate, │           │(completed)│              │
│         │   endDate,    │           │           │              │
│         │   category,   │           │           │              │
│         │   account,    │           │           │              │
│         │   search)     │           │           │              │
│         │              │            │           │              │
│         └──────┬───────┴────────────┴───────────┘              │
│                │                                                │
│         ┌──────▼────────────────────────────────┐              │
│         │      ExportButton Component           │              │
│         │  ┌──────────────────────────────┐    │              │
│         │  │  FormatSelector (CSV/XLS/JSON)│    │              │
│         │  └──────────────────────────────┘    │              │
│         │  ┌──────────────────────────────┐    │              │
│         │  │  Export Count Preview         │    │              │
│         │  │  "Export 247 transactions"    │    │              │
│         │  └──────────────────────────────┘    │              │
│         │  ┌──────────────────────────────┐    │              │
│         │  │  Loading State / Toasts       │    │              │
│         │  └──────────────────────────────┘    │              │
│         └───────────────┬───────────────────────┘              │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ tRPC Mutation Call
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   BACKEND (tRPC Endpoints)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/server/api/routers/exports.router.ts                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  exportTransactions(format, startDate, endDate, ...)  │     │
│  │  exportBudgets(format, month, allMonths)              │     │
│  │  exportGoals(format, includeCompleted)                │     │
│  │  exportAccounts(format)                               │     │
│  │  exportRecurringTransactions(format, status)          │     │
│  └────────────────────┬──────────────────────────────────┘     │
│                       │                                         │
│                       │ Prisma Query                            │
│                       │                                         │
│         ┌─────────────▼──────────────┐                          │
│         │   Prisma Database Queries  │                          │
│         │   WHERE userId = ...       │                          │
│         │   AND filters applied      │                          │
│         │   LIMIT 10000              │                          │
│         └─────────────┬──────────────┘                          │
│                       │                                         │
│                       │ Raw Data                                │
│                       │                                         │
│         ┌─────────────▼──────────────┐                          │
│         │  CSV/Excel/JSON Generators │                          │
│         │  (src/lib/)                │                          │
│         │  - generateTransactionCSV  │                          │
│         │  - generateBudgetExcel     │                          │
│         │  - JSON.stringify          │                          │
│         └─────────────┬──────────────┘                          │
│                       │                                         │
│                       │ File Content                            │
│                       │                                         │
│         ┌─────────────▼──────────────┐                          │
│         │  Base64 Encode + Metadata  │                          │
│         │  {                         │                          │
│         │    content: "base64...",   │                          │
│         │    filename: "...",        │                          │
│         │    mimeType: "...",        │                          │
│         │    recordCount: 247,       │                          │
│         │    fileSize: 45678         │                          │
│         │  }                         │                          │
│         └─────────────┬──────────────┘                          │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        │ tRPC Response
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                     CLIENT DOWNLOAD                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ExportButton.onSuccess()                                       │
│                                                                 │
│  1. Decode base64 content                                       │
│  2. Create Blob(content, {type: mimeType})                      │
│  3. URL.createObjectURL(blob)                                   │
│  4. Create <a href={url} download={filename}>                   │
│  5. Click link → Browser downloads file                         │
│  6. Show success toast: "Downloaded 247 transactions"           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │          Browser Download Manager                    │      │
│  │  wealth-transactions-dining-2025-01-to-2025-11.csv  │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

FILTER FLOW DETAIL (Transactions Page Example):

┌──────────────────────────────────────────────────────────┐
│  TransactionListPage Component                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ useState({                                         │  │
│  │   startDate: subMonths(now, 1),                    │  │
│  │   endDate: now,                                    │  │
│  │   categoryId: undefined,                           │  │
│  │   accountId: undefined,                            │  │
│  │   search: ''                                       │  │
│  │ })                                                 │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│    ┌──────────────┴─────────────────┐                    │
│    │                                │                    │
│    ▼                                ▼                    │
│  ┌─────────────────┐      ┌──────────────────┐          │
│  │TransactionFilters│      │  ExportButton    │          │
│  │  Component       │      │  Component       │          │
│  │                 │      │                  │          │
│  │ - Date pickers  │      │ filters={filters}│          │
│  │ - Category sel  │      │ exportType="..." │          │
│  │ - Account sel   │      │ count={...}      │          │
│  │ - Search input  │      └──────────────────┘          │
│  │                 │                │                    │
│  │ onChange={...}  │                │                    │
│  └─────────────────┘                │                    │
│           │                         │                    │
│           └─────updates state───────┘                    │
│                                                           │
│  Both components use SAME filter state                   │
│  → Query shows filtered data                             │
│  → Export downloads filtered data                        │
└──────────────────────────────────────────────────────────┘
```

## Questions for Planner

### 1. Should we add filter UI to pages that currently lack it?

**Context:** Recurring Transactions page could benefit from status filter (ACTIVE, PAUSED, etc.), but it's not in current scope.

**Options:**
- **Option A:** Add only export button, no filter UI (faster, matches current UX)
- **Option B:** Add status filter dropdown + export button (better UX, more time)

**Recommendation:** Option A for Iteration 3 MVP, add status filter in future iteration if users request it.

### 2. Should export count show loaded records or total records?

**Context:** Transactions page uses infinite scroll - user may have loaded 50 records but have 500 total matching filters.

**Options:**
- **Option A:** Show loaded count: "Export 50 transactions" (simpler, might confuse users)
- **Option B:** Show total count: "Export ALL 500 transactions" (requires separate count query, clearer UX)
- **Option C:** Show both: "Export 500 transactions (50 loaded)" (most clear, slightly verbose)

**Recommendation:** Option B - Add separate count query to show accurate total, prevents user confusion.

### 3. Should we implement Web Share API in Iteration 3?

**Context:** Master plan includes mobile optimization, but Web Share API is incremental.

**Options:**
- **Option A:** Standard download only (works on all devices, simpler)
- **Option B:** Add Web Share API with feature detection (better mobile UX, more time)

**Recommendation:** Option A for MVP, add Web Share API if time permits. Standard download works fine on mobile browsers.

### 4. Should filename generation be backend or frontend?

**Context:** Filenames include filter context (e.g., "wealth-transactions-dining-2025-01-to-2025-11.csv")

**Options:**
- **Option A:** Backend generates filename based on filters (centralized, consistent)
- **Option B:** Frontend generates filename (more flexible, avoids backend change)

**Current State:** Backend already generates filenames in export endpoints ✅

**Recommendation:** Keep backend filename generation, extend to include more filter context in Iteration 3.

### 5. Should we validate filter combinations?

**Context:** Some filter combinations might be invalid (e.g., startDate > endDate)

**Options:**
- **Option A:** Validate on frontend only (better UX, prevents invalid requests)
- **Option B:** Validate on backend via Zod (type-safe, prevents API abuse)
- **Option C:** Validate on both (redundant but safest)

**Recommendation:** Option C - Frontend validation for UX, backend validation for safety.

---

**Explorer Status:** ✅ COMPLETE

**Ready for:** Planner to create Iteration 3 implementation plan

**Estimated Total Effort:** 10-12 hours (matches master plan estimate: 6-8 hours aggressive, 10-12 realistic)
