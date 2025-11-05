# Builder Task Breakdown - Iteration 15

## Overview

**4 primary builders** working in parallel on component optimization and performance.

**Total estimated time:** 16-18 hours (includes testing and integration buffer)

**Parallelization strategy:**
- Builders 1, 2, 3 can work 100% in parallel (no shared files)
- Builder 4 depends on Builder 3 completing MobileSheet component
- Integration phase after all builders complete

**Complexity distribution:**
- Builder-1: HIGH (performance foundation, critical path)
- Builder-2: HIGH (chart optimization, 6 components)
- Builder-3: MEDIUM-HIGH (forms, new MobileSheet component)
- Builder-4: MEDIUM (mobile layouts, testing, cleanup)

---

## Builder-1: Performance Foundation

### Scope

Establish performance infrastructure through dynamic imports, React.memo for list components, and React Query optimization. This builder sets the foundation for all other performance improvements.

### Complexity Estimate

**HIGH** (5-6 hours)

**Reasoning:**
- 6 dynamic import implementations (charts)
- 5 component memoizations with testing
- React Query config changes affect entire app
- Bundle analyzer setup and validation
- Critical path work (other builders validate against this)

### Success Criteria

- [x] All 6 Recharts components dynamically imported with custom skeletons
- [x] Analytics page bundle: 280KB → 190-200KB (-29-32% reduction)
- [x] Dashboard below-fold components (UpcomingBills, RecentTransactionsCard) lazy loaded
- [x] Dashboard page bundle: 176KB → 130-140KB (-20-26% reduction)
- [x] 5 list components memoized (TransactionCard, BudgetCard, GoalCard, StatCard, AccountCard)
- [x] React DevTools Profiler shows 70%+ reduction in re-renders on filter change
- [x] React Query config updated for mobile (staleTime: 60s, retry: 1)
- [x] @next/bundle-analyzer installed and working

### Files to Create

```
src/
├── components/
│   └── analytics/
│       └── skeletons/
│           └── ChartSkeleton.tsx              # Reusable chart skeleton
└── components/
    └── dashboard/
        └── skeletons/
            ├── UpcomingBillsSkeleton.tsx      # Upcoming bills skeleton
            └── RecentTransactionsSkeleton.tsx # Recent transactions skeleton
```

### Files to Modify

```
src/
├── app/
│   └── (dashboard)/
│       ├── analytics/page.tsx                # Dynamic import 5 charts
│       ├── dashboard/page.tsx                # Lazy load 2 components
│       └── goals/[id]/page.tsx               # Dynamic import 1 chart
├── components/
│   ├── transactions/
│   │   └── TransactionCard.tsx               # Add React.memo + useMemo
│   ├── budgets/
│   │   └── BudgetCard.tsx                    # Add React.memo + useMemo
│   ├── goals/
│   │   └── GoalCard.tsx                      # Add React.memo + useMemo
│   ├── accounts/
│   │   └── AccountCard.tsx                   # Add React.memo
│   └── ui/
│       └── stat-card.tsx                     # Add React.memo
└── lib/
    └── trpc.ts                               # Update QueryClient config

package.json                                  # Add @next/bundle-analyzer
next.config.js                                # Configure bundle analyzer
```

**Total:** 3 new files, 10 modified files

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:**
- Builder-2 (validates chart patterns after Builder-1 dynamic imports)
- Final integration (all builders validate bundle size after this)

### Implementation Notes

#### Phase 1: Dynamic Imports (2-2.5 hours)

**Analytics Page (5 charts):**
```typescript
// src/app/(dashboard)/analytics/page.tsx

// 1. Create skeleton component first
// src/components/analytics/skeletons/ChartSkeleton.tsx
export function ChartSkeleton({ height = 350 }) { /* ... */ }

// 2. Dynamic import all 5 charts
const SpendingByCategoryChart = dynamic(
  () => import('@/components/analytics/SpendingByCategoryChart'),
  { loading: () => <ChartSkeleton />, ssr: false }
)
// Repeat for: NetWorthChart, MonthOverMonthChart, SpendingTrendsChart, IncomeSourcesChart

// 3. Use in page (no changes to usage)
<SpendingByCategoryChart data={data || []} />
```

**Goals Detail Page (1 chart):**
```typescript
// src/app/(dashboard)/goals/[id]/page.tsx
const GoalProgressChart = dynamic(
  () => import('@/components/goals/GoalProgressChart'),
  { loading: () => <ChartSkeleton height={250} />, ssr: false }
)
```

**Dashboard Page (2 below-fold components):**
```typescript
// src/app/(dashboard)/dashboard/page.tsx

// 1. Create skeletons
// src/components/dashboard/skeletons/UpcomingBillsSkeleton.tsx
export function UpcomingBillsSkeleton() {
  return (
    <Card className="h-[300px] animate-pulse">
      {/* 3 bill line items skeleton */}
    </Card>
  )
}

// src/components/dashboard/skeletons/RecentTransactionsSkeleton.tsx
export function RecentTransactionsSkeleton() {
  return (
    <Card className="h-[400px] animate-pulse">
      {/* 5 transaction rows skeleton */}
    </Card>
  )
}

// 2. Dynamic imports
const UpcomingBills = dynamic(
  () => import('@/components/dashboard/UpcomingBills'),
  { loading: () => <UpcomingBillsSkeleton />, ssr: false }
)

const RecentTransactionsCard = dynamic(
  () => import('@/components/dashboard/RecentTransactionsCard'),
  { loading: () => <RecentTransactionsSkeleton />, ssr: false }
)
```

**Validation:**
```bash
npm run build
# Check bundle sizes in terminal output
# Analytics: 280KB → ~200KB ✅
# Dashboard: 176KB → ~140KB ✅
```

#### Phase 2: React.memo for List Components (2-2.5 hours)

**Priority order (most critical first):**

1. **TransactionCard** (30-45 min)
   ```typescript
   // src/components/transactions/TransactionCard.tsx
   import { memo, useMemo } from 'react'

   export const TransactionCard = memo(({ transaction, onEdit, onDelete }) => {
     const { isExpense, absAmount, displayDate } = useMemo(() => ({
       isExpense: Number(transaction.amount) < 0,
       absAmount: Math.abs(Number(transaction.amount)),
       displayDate: new Date(transaction.date).toLocaleDateString('he-IL')
     }), [transaction.amount, transaction.date])

     return (
       <motion.div {...cardHoverSubtle}>
         {/* Existing JSX */}
       </motion.div>
     )
   })

   TransactionCard.displayName = 'TransactionCard'
   ```

2. **BudgetCard** (30-45 min)
   ```typescript
   // src/components/budgets/BudgetCard.tsx
   export const BudgetCard = memo(({ budget, onUpdate }) => {
     const percentage = useMemo(() => {
       return (Number(budget.spent) / Number(budget.amount)) * 100
     }, [budget.spent, budget.amount])

     return <Card>{/* Existing JSX */}</Card>
   })

   BudgetCard.displayName = 'BudgetCard'
   ```

3. **GoalCard** (45-60 min - most complex calculations)
   ```typescript
   // src/components/goals/GoalCard.tsx
   export const GoalCard = memo(({ goal }) => {
     const calculations = useMemo(() => {
       // All expensive calculations here
       const percentComplete = (current / target) * 100
       const daysRemaining = /* date calculation */
       const status = /* status logic */
       return { percentComplete, daysRemaining, status, displayTarget }
     }, [goal.currentAmount, goal.targetAmount, goal.targetDate])

     return <Card>{/* Use calculations.* values */}</Card>
   })

   GoalCard.displayName = 'GoalCard'
   ```

4. **StatCard** (20-30 min - simplest)
   ```typescript
   // src/components/ui/stat-card.tsx
   export const StatCard = memo(({ title, value, icon, trend }) => {
     return <motion.div {...cardHover}>{/* Existing JSX */}</motion.div>
   })

   StatCard.displayName = 'StatCard'
   ```

5. **AccountCard** (20-30 min)
   ```typescript
   // src/components/accounts/AccountCard.tsx
   export const AccountCard = memo(({ account, onEdit }) => {
     return <motion.div {...cardHoverSubtle}>{/* Existing JSX */}</motion.div>
   })

   AccountCard.displayName = 'AccountCard'
   ```

**Testing after each component:**
1. Open React DevTools Profiler
2. Record transaction filter change (or relevant action)
3. Verify component doesn't re-render
4. Check for "Did not render" in Profiler

#### Phase 3: React Query Optimization (20-30 min)

```typescript
// src/lib/trpc.ts

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // 60s
      retry: 1,                        // 1 retry
      refetchOnWindowFocus: false,     // Don't refetch on tab switch
      refetchOnReconnect: true,        // Do refetch when reconnected
    }
  }
})
```

**Testing:**
- Verify tRPC queries still work
- Check Network tab: Fewer refetches when switching tabs
- Ensure data still updates when expected

#### Phase 4: Bundle Analyzer Setup (20-30 min)

```bash
# Install
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // existing config
})
```

```bash
# Run analysis
ANALYZE=true npm run build
# Opens browser with treemap
# Verify Recharts in separate chunks
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 1:** Chart Component Dynamic Import
- **Pattern 2:** Below-Fold Component Lazy Load
- **Pattern 3:** Skeleton Screen Creation
- **Pattern 4:** React.memo for List Components
- **Pattern 6:** useMemo for Expensive Calculations
- **Pattern 14:** Mobile-Optimized tRPC Configuration
- **Pattern 15:** React DevTools Profiler Validation
- **Pattern 16:** Bundle Size Validation

### Testing Requirements

**Unit-level:**
- Each memoized component: React DevTools Profiler validation
- Each dynamic import: Skeleton appears during load (throttle network to Slow 3G)

**Integration:**
- Full production build succeeds
- Bundle sizes reduced as expected
- No console errors or warnings
- Desktop regression test (no broken layouts)

**Performance:**
- Transaction list with 50 items scrolls at 60fps
- Analytics page loads in <2.5s on Slow 3G (Lighthouse)
- Dashboard loads in <1.8s on Slow 3G

**Coverage target:** Manual testing 100% of changed components

### Potential Split Strategy

**If complexity proves too high, split into:**

**Foundation (Builder-1A - Primary):** Dynamic Imports + Skeletons (3 hours)
- Create all 3 skeleton components
- Dynamic import all 6 Recharts components
- Dynamic import 2 dashboard components
- Bundle analyzer setup
- Validate bundle size reduction

**Sub-builder 1B:** Memoization (2.5 hours)
- Memoize all 5 list components
- React DevTools Profiler testing
- React Query config update
- Validate re-render reduction

**Recommendation:** Single builder can handle. Only split if Builder-1 struggles with testing burden.

---

## Builder-2: Chart Optimization

### Scope

Optimize all 6 Recharts components for mobile: responsive heights, touch-friendly tooltips, pie chart label handling, and mobile data reduction. Create useChartDimensions hook for centralized responsive logic.

### Complexity Estimate

**HIGH** (4-5 hours)

**Reasoning:**
- 6 chart components to update (repetitive but requires care)
- New hook creation (useChartDimensions)
- Mobile-specific optimizations per chart type (PieChart vs LineChart vs BarChart)
- Testing on multiple viewport sizes (375px, 768px, 1024px)
- Coordination with Builder-1's dynamic imports

### Success Criteria

- [x] useChartDimensions hook created and tested
- [x] All 6 charts use responsive heights (250px mobile, 350px desktop)
- [x] Pie charts (2) disable labels on mobile
- [x] All charts have touch-friendly tooltips (allowEscapeViewBox)
- [x] LineCharts (3) reduce data on mobile (30 days vs 90 days where applicable)
- [x] BarChart limits months on mobile (6 vs 12)
- [x] Charts fit viewport at 375px width (no horizontal scroll)
- [x] All charts memoized (React.memo)
- [x] No layout shift when chart loads (skeleton matches dimensions)

### Files to Create

```
src/
└── hooks/
    └── useChartDimensions.ts    # Responsive chart dimensions hook
```

### Files to Modify

```
src/
└── components/
    └── analytics/
        ├── SpendingByCategoryChart.tsx    # PieChart: Hide labels mobile
        ├── NetWorthChart.tsx              # LineChart: Reduce data mobile
        ├── MonthOverMonthChart.tsx        # BarChart: 6 months mobile
        ├── SpendingTrendsChart.tsx        # LineChart: Sample data mobile
        ├── IncomeSourcesChart.tsx         # PieChart: Hide labels mobile
        └── (already updated by Builder-1)
    └── goals/
        └── GoalProgressChart.tsx          # LineChart: Already 250px, memo
```

**Total:** 1 new file, 6 modified files

### Dependencies

**Depends on:**
- useMediaQuery hook (existing from iteration 14)
- Builder-1's dynamic imports (validates pattern works)

**Blocks:** None (Builder-3 and Builder-4 independent)

### Implementation Notes

#### Phase 1: Create useChartDimensions Hook (30-45 min)

```typescript
// src/hooks/useChartDimensions.ts
'use client'

import { useMediaQuery } from './useMediaQuery'

export interface ChartDimensions {
  height: number
  margin: {
    top: number
    right: number
    left: number
    bottom: number
  }
  hidePieLabels: boolean
}

export function useChartDimensions(): ChartDimensions {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return {
    height: isMobile ? 250 : 350,
    margin: isMobile
      ? { top: 5, right: 10, left: 0, bottom: 5 }
      : { top: 5, right: 20, left: 10, bottom: 5 },
    hidePieLabels: isMobile
  }
}
```

**Testing:**
- Verify hook returns correct values at 375px (mobile)
- Verify hook returns correct values at 1024px (desktop)
- Test window resize (hook should update)

#### Phase 2: Update PieCharts (1-1.5 hours)

**SpendingByCategoryChart:**
```typescript
// src/components/analytics/SpendingByCategoryChart.tsx
import { memo } from 'react'
import { useChartDimensions } from '@/hooks/useChartDimensions'

export const SpendingByCategoryChart = memo(({ data }: Props) => {
  const { height, hidePieLabels } = useChartDimensions()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          labelLine={!hidePieLabels}
          label={!hidePieLabels ? ({ name, percent }) => (
            `${name}: ${(percent * 100).toFixed(0)}%`
          ) : false}
          outerRadius={hidePieLabels ? 80 : 100}
          dataKey="amount"
        >
          {/* Cell mapping */}
        </Pie>
        <Tooltip allowEscapeViewBox={{ x: true, y: true }} />
        {hidePieLabels && <Legend wrapperStyle={{ fontSize: '12px' }} />}
      </PieChart>
    </ResponsiveContainer>
  )
})

SpendingByCategoryChart.displayName = 'SpendingByCategoryChart'
```

**IncomeSourcesChart:** (Same pattern as above)

**Testing:**
- 375px: Verify no labels, legend shows, 80px radius
- 1024px: Verify labels show, no legend, 100px radius

#### Phase 3: Update LineCharts (1.5-2 hours)

**NetWorthChart (with data reduction):**
```typescript
// src/components/analytics/NetWorthChart.tsx
import { memo, useMemo } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

export const NetWorthChart = memo(({ data }: Props) => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Reduce data on mobile (90 days → 30 days)
  const chartData = useMemo(() => {
    if (!isMobile || data.length <= 30) return data
    // Take last 30 data points
    return data.slice(-30)
  }, [data, isMobile])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={margin}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₪${v}`} />
        <Tooltip allowEscapeViewBox={{ x: true, y: true }} />
        <Line type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" />
      </LineChart>
    </ResponsiveContainer>
  )
})

NetWorthChart.displayName = 'NetWorthChart'
```

**SpendingTrendsChart (with data sampling):**
```typescript
// Sample every 3rd data point on mobile
const chartData = useMemo(() => {
  if (!isMobile) return data
  return data.filter((_, index) => index % 3 === 0)
}, [data, isMobile])
```

**GoalProgressChart:**
- Already uses 250px height ✅
- Just add memo and tooltip optimization

#### Phase 4: Update BarChart (45-60 min)

**MonthOverMonthChart:**
```typescript
// src/components/analytics/MonthOverMonthChart.tsx
export const MonthOverMonthChart = memo(({ data }: Props) => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Limit to 6 months on mobile (vs 12 on desktop)
  const chartData = useMemo(() => {
    if (!isMobile || data.length <= 6) return data
    return data.slice(-6)
  }, [data, isMobile])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={margin}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip allowEscapeViewBox={{ x: true, y: true }} />
        <Bar dataKey="amount" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  )
})

MonthOverMonthChart.displayName = 'MonthOverMonthChart'
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 7:** Responsive Chart Dimensions Hook
- **Pattern 8:** Pie Chart Mobile Optimization
- **Pattern 9:** Mobile Data Reduction
- **Pattern 4:** React.memo for List Components (apply to charts)

### Testing Requirements

**Visual Testing (Manual):**
- 375px viewport: All charts 250px tall, no horizontal scroll
- 768px viewport: Charts transition to 350px tall
- 1024px viewport: Charts 350px tall, full data shown

**Data Validation:**
- PieCharts: Labels hidden mobile, visible desktop
- LineCharts: Reduced data mobile, full data desktop
- BarChart: 6 bars mobile, 12 bars desktop

**Touch Interaction:**
- Tap charts on mobile device (iPhone/Android)
- Verify tooltip appears and doesn't get cut off by viewport

**Performance:**
- Charts render without jank
- No layout shift when chart loads (skeleton → chart smooth transition)

**Coverage target:** All 6 charts tested on 3 viewports (375px, 768px, 1024px)

### Potential Split Strategy

**If complexity too high, split into:**

**Foundation (Builder-2A - Primary):** Hook + PieCharts + LineCharts (3 hours)
- Create useChartDimensions hook
- Update 2 PieCharts
- Update 3 LineCharts
- Testing at 3 viewports

**Sub-builder 2B:** BarChart + Polish (1.5 hours)
- Update MonthOverMonthChart
- Update GoalProgressChart
- Final cross-chart testing
- Mobile device testing

**Recommendation:** Single builder can handle. Charts are repetitive once pattern established.

---

## Builder-3: Form Optimization

### Scope

Add inputMode to numeric inputs, create MobileSheet component (bottom sheet for mobile, dialog for desktop), migrate top 3 forms (AddTransactionForm, TransactionForm, BudgetForm), and fix category picker touch targets.

### Complexity Estimate

**MEDIUM-HIGH** (4-5 hours)

**Reasoning:**
- New component creation (MobileSheet) with responsive behavior
- 3 form migrations (AddTransactionForm, TransactionForm, BudgetForm)
- 8 inputMode additions across 6 forms
- Category picker touch target fix
- Real device testing required for keyboard validation

### Success Criteria

- [x] MobileSheet component created (bottom sheet mobile, dialog desktop)
- [x] MobileSheet has safe area padding (pb-safe-b)
- [x] MobileSheet has slide animations (CSS transforms, 60fps)
- [x] AddTransactionForm uses MobileSheet and inputMode="decimal"
- [x] TransactionForm uses MobileSheet and inputMode="decimal"
- [x] BudgetForm uses MobileSheet and inputMode="decimal"
- [x] GoalForm uses inputMode="decimal" (no MobileSheet migration)
- [x] RecurringTransactionForm uses inputMode (no MobileSheet migration)
- [x] AccountForm uses inputMode="decimal" (no MobileSheet migration)
- [x] CategoryForm color swatches: 32px → 48px mobile (w-12 h-12 sm:w-8 sm:h-8)
- [x] Submit buttons visible with keyboard open (sticky positioning)
- [x] Real device test: Numeric keyboard with decimal point shows for amount inputs

### Files to Create

```
src/
└── components/
    └── mobile/
        └── MobileSheet.tsx    # Bottom sheet component (responsive)
```

### Files to Modify

```
src/
├── components/
│   ├── transactions/
│   │   ├── AddTransactionForm.tsx      # Add inputMode, use MobileSheet
│   │   ├── TransactionForm.tsx         # Add inputMode, use MobileSheet
│   │   └── TransactionList.tsx         # Replace Dialog with MobileSheet
│   ├── budgets/
│   │   ├── BudgetForm.tsx              # Add inputMode, keyboard-aware
│   │   └── BudgetList.tsx              # Replace Dialog with MobileSheet
│   ├── goals/
│   │   └── GoalForm.tsx                # Add inputMode (no sheet migration)
│   ├── recurring/
│   │   └── RecurringTransactionForm.tsx # Add inputMode (no sheet migration)
│   ├── accounts/
│   │   └── AccountForm.tsx             # Add inputMode (no sheet migration)
│   └── categories/
│       └── CategoryForm.tsx            # Fix color swatch touch targets
```

**Total:** 1 new file, 9 modified files

### Dependencies

**Depends on:**
- useMediaQuery hook (existing from iteration 14)
- Dialog component (existing, extends from it)

**Blocks:**
- Builder-4 (needs MobileSheet for potential use in other components)

### Implementation Notes

#### Phase 1: Create MobileSheet Component (1.5-2 hours)

```typescript
// src/components/mobile/MobileSheet.tsx
'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}: MobileSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) {
    // Desktop: Centered dialog
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('max-w-2xl', className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile: Bottom sheet
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'rounded-t-2xl border-t bg-background',
            'max-h-[85vh] overflow-y-auto',
            'p-4 pb-safe-b',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
            'transition-transform duration-200',
            className
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1 rounded-full bg-muted mb-4" />

          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="mt-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
```

**Testing:**
- 375px viewport: Verify bottom sheet appears
- 1024px viewport: Verify centered dialog appears
- Slide animation smooth (no jank)
- Safe area padding works (test on device with notch)

#### Phase 2: Add inputMode to All Forms (1-1.5 hours)

**Transaction Forms (2):**
```typescript
// src/components/transactions/AddTransactionForm.tsx
// src/components/transactions/TransactionForm.tsx

<Input
  id="amount"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('amount', { valueAsNumber: true })}
/>
```

**Budget Form:**
```typescript
// src/components/budgets/BudgetForm.tsx
<Input
  id="amount"
  type="number"
  step="0.01"
  min="0"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('amount', { valueAsNumber: true })}
/>
```

**Goal Form (2 inputs):**
```typescript
// src/components/goals/GoalForm.tsx
<Input
  id="targetAmount"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('targetAmount', { valueAsNumber: true })}
/>

<Input
  id="currentAmount"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('currentAmount', { valueAsNumber: true })}
/>
```

**Recurring Transaction Form (2 inputs):**
```typescript
// src/components/recurring/RecurringTransactionForm.tsx
<Input
  id="amount"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('amount', { valueAsNumber: true })}
/>

<Input
  id="dayOfMonth"
  type="number"
  min="1"
  max="31"
  inputMode="numeric"  // ✅ ADD THIS (no decimal for day)
  {...register('dayOfMonth', { valueAsNumber: true })}
/>
```

**Account Form:**
```typescript
// src/components/accounts/AccountForm.tsx
<Input
  id="balance"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ ADD THIS
  {...register('balance', { valueAsNumber: true })}
/>
```

**Total: 8 inputMode additions across 6 forms**

#### Phase 3: Migrate Top 3 Forms to MobileSheet (1-1.5 hours)

**TransactionList (2 dialogs):**
```typescript
// src/components/transactions/TransactionList.tsx
import { MobileSheet } from '@/components/mobile/MobileSheet'

// Replace Dialog with MobileSheet for add form
<MobileSheet
  open={isAddFormOpen}
  onOpenChange={setIsAddFormOpen}
  title="Add Transaction"
  description="Record a new income or expense"
>
  <AddTransactionForm onSuccess={() => setIsAddFormOpen(false)} />
</MobileSheet>

// Replace Dialog with MobileSheet for edit form
<MobileSheet
  open={!!editingTransaction}
  onOpenChange={(open) => !open && setEditingTransaction(null)}
  title="Edit Transaction"
>
  <TransactionForm
    transaction={editingTransaction}
    onSuccess={() => setEditingTransaction(null)}
  />
</MobileSheet>
```

**BudgetList:**
```typescript
// src/components/budgets/BudgetList.tsx
import { MobileSheet } from '@/components/mobile/MobileSheet'

<MobileSheet
  open={!!editingBudget}
  onOpenChange={(open) => !open && setEditingBudget(null)}
  title="Edit Budget"
  description="Adjust your monthly budget"
>
  <BudgetForm
    budget={editingBudget}
    onSuccess={() => setEditingBudget(null)}
  />
</MobileSheet>
```

#### Phase 4: Category Picker Touch Target Fix (20-30 min)

```typescript
// src/components/categories/CategoryForm.tsx

// Color swatches
<div className="grid grid-cols-5 gap-2 sm:gap-3">
  {COLORS.map(color => (
    <button
      key={color.value}
      type="button"
      onClick={() => setSelectedColor(color.value)}
      className={cn(
        'w-12 h-12',     // Mobile: 48x48px ✅
        'sm:w-8 sm:h-8', // Desktop: 32x32px
        'rounded-lg border-2 transition-all',
        selectedColor === color.value
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-muted hover:border-border'
      )}
      style={{ backgroundColor: color.value }}
      aria-label={`Select ${color.name}`}
    />
  ))}
</div>
```

#### Phase 5: Keyboard-Aware Form Layout (30-45 min)

**Update all 3 migrated forms:**
```typescript
// AddTransactionForm, TransactionForm, BudgetForm

<form className="space-y-4 pb-20">  {/* ✅ Add pb-20 clearance */}
  {/* Form fields */}

  {/* Submit button - sticky positioning */}
  <div className="sticky bottom-4 pt-4 border-t bg-background">
    <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
      {isEdit ? 'Update' : 'Create'}
    </Button>
  </div>
</form>
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 10:** inputMode for Mobile Keyboards
- **Pattern 11:** MobileSheet Component
- **Pattern 12:** Keyboard-Aware Form Layout
- **Pattern 13:** Category Picker Touch Targets

### Testing Requirements

**Component Testing:**
- MobileSheet: Open/close smoothly, no jank
- MobileSheet: Desktop renders as centered dialog
- MobileSheet: Mobile renders as bottom sheet with drag handle

**Keyboard Testing (Real Devices Required):**
- iPhone 14 Pro: Amount input shows numeric keyboard with decimal point
- iPhone SE: Same keyboard behavior
- Android: Numeric keyboard with decimal point

**Form Testing:**
- Submit button visible with keyboard open
- Form scrolls input into view when focused
- Submit button full-width on mobile

**Touch Targets:**
- Category color swatches: 48x48px on mobile (use inspector)
- All swatches tappable without adjacent selection

**Coverage target:** 100% manual testing on real devices (iPhone + Android)

### Potential Split Strategy

**If complexity too high:**

**Foundation (Builder-3A - Primary):** MobileSheet + Form Migrations (3 hours)
- Create MobileSheet component
- Migrate 3 forms to MobileSheet
- Submit button positioning
- Testing MobileSheet behavior

**Sub-builder 3B:** inputMode + Touch Targets (1.5 hours)
- Add inputMode to all 8 inputs
- Fix category picker touch targets
- Real device testing
- Keyboard validation

**Recommendation:** Single builder can handle. MobileSheet is centerpiece, rest is mechanical.

---

## Builder-4: Mobile Layouts & Testing

### Scope

Final mobile layout adjustments, spacing refinements, real device testing across all iteration 15 changes, and performance validation. This builder ensures everything works end-to-end on real devices.

### Complexity Estimate

**MEDIUM** (3-4 hours)

**Reasoning:**
- Real device testing required (iPhone + Android)
- Performance validation (Lighthouse, fps measurement)
- Layout verification across multiple viewports
- Integration testing (all builders' work together)
- Potential bug fixes from testing

### Success Criteria

- [x] Transaction list card layout verified on mobile (no regressions)
- [x] Budget list card layout verified on mobile
- [x] Goal list card layout verified on mobile
- [x] Spacing adjustments complete (consistent p-4 sm:p-6 pattern)
- [x] Real device testing complete (iPhone 14 Pro, iPhone SE, Android mid-range)
- [x] Lighthouse mobile score 85+ (target 90+)
- [x] 60fps scrolling verified on transaction list (50+ items)
- [x] All charts fit viewport at 375px width (no horizontal scroll)
- [x] Forms show correct mobile keyboard (numeric with decimal)
- [x] MobileSheet animations smooth (no dropped frames)
- [x] No console errors or warnings
- [x] Desktop regression test passed (no broken layouts)

### Files to Create

**None** (testing and validation only)

### Files to Modify

```
src/
├── components/
│   ├── transactions/
│   │   └── TransactionListPage.tsx    # Spacing adjustments (if needed)
│   ├── budgets/
│   │   └── BudgetList.tsx             # Spacing adjustments (if needed)
│   └── goals/
│       └── GoalList.tsx               # Spacing adjustments (if needed)
└── (potential bug fixes in any component)
```

**Total:** 0-3 modified files (only if issues found)

### Dependencies

**Depends on:**
- Builder-1 (dynamic imports, memoization)
- Builder-2 (chart responsive behavior)
- Builder-3 (MobileSheet component)

**Blocks:** None (final builder)

### Implementation Notes

#### Phase 1: Layout Verification (1 hour)

**Transaction List:**
- Verify card layout at 375px, 768px, 1024px
- Check spacing: p-4 mobile, sm:p-6 desktop
- Verify TransactionCard memoization working (no re-renders on filter)
- Test swipe-to-action structure ready (no implementation, just verify space)

**Budget List:**
- Verify card layout with progress bars
- Check BudgetCard memoization
- Verify spacing consistency

**Goal List:**
- Verify vertical card layout
- Check GoalCard memoization
- Verify goal progress indicators

**Adjustments (if needed):**
```typescript
// Example: Consistent spacing
<div className="space-y-4 p-4 sm:p-6">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

#### Phase 2: Real Device Testing (1.5-2 hours)

**Testing Matrix:**

**Device 1: iPhone 14 Pro (iOS 16+, 390x844)**
```
Keyboard Testing:
[ ] Amount inputs show numeric keyboard with decimal point
[ ] Date inputs show iOS date picker (wheel)
[ ] Email inputs show email keyboard (if auth forms updated)

MobileSheet Testing:
[ ] Sheet slides up smoothly from bottom
[ ] Drag handle visible
[ ] Sheet max height 85vh (doesn't cover entire screen)
[ ] Safe area padding works (no content under Dynamic Island)

Chart Testing:
[ ] All charts 250px tall
[ ] Charts fit viewport (no horizontal scroll)
[ ] Pie chart labels hidden, legend shows
[ ] Touch tooltips work (tap chart to see tooltip)

Performance:
[ ] Transaction list scrolls at 60fps (visual check)
[ ] Dashboard loads <2s (perceived performance)
[ ] Analytics page loads <3s

Layout:
[ ] No horizontal scrolling on any page
[ ] Bottom navigation doesn't cover content
[ ] Dark mode works correctly
```

**Device 2: iPhone SE (iOS 15+, 375x667)**
```
[ ] All tests from iPhone 14 Pro
[ ] Focus on smallest screen edge cases
[ ] Charts readable at 375px width
[ ] MobileSheet doesn't exceed screen
[ ] Bottom navigation works in thumb zone
```

**Device 3: Android Mid-Range (Android 11+, 360x740)**
```
[ ] Numeric keyboard with decimal point
[ ] Date picker shows Android calendar
[ ] MobileSheet slide animation smooth
[ ] Gesture navigation doesn't conflict
[ ] Performance acceptable (scrolling, animations)
```

#### Phase 3: Performance Validation (45-60 min)

**Lighthouse Audit:**
```bash
# Run Lighthouse on production URL (or local build)
lighthouse https://wealth-tracker.vercel.app --preset=mobile --view

# Target scores:
# Performance: 90+ (acceptable: 85+)
# Accessibility: 100
# Best Practices: 95+
# SEO: 100
```

**Web Vitals:**
- FCP: <1.8s (First Contentful Paint)
- LCP: <2.5s (Largest Contentful Paint)
- FID: <100ms (First Input Delay)
- CLS: <0.1 (Cumulative Layout Shift)
- TBT: <250ms (Total Blocking Time)

**FPS Measurement:**
```
Chrome DevTools Performance Tab:
1. Open transaction list with 50+ items
2. Start recording
3. Scroll list rapidly for 5 seconds
4. Stop recording
5. Check FPS graph (should be 60fps solid green)

Acceptable: 55-60fps average
Unacceptable: <50fps
```

**Bundle Size Validation:**
```bash
npm run build

# Verify in terminal output:
# ✅ /analytics: 190-200KB (was 280KB)
# ✅ /dashboard: 130-140KB (was 176KB)
# ✅ /budgets: 310-330KB (was 382KB)
```

#### Phase 4: Desktop Regression Testing (30-45 min)

**Desktop Testing Checklist:**
```
1024px+ Viewport:
[ ] All pages render correctly
[ ] Charts are 350px tall (not 250px)
[ ] Forms open as centered dialogs (not bottom sheets)
[ ] No layout shifts or broken grids
[ ] Hover effects still work
[ ] Sidebar navigation works
[ ] No console errors

Desktop-specific features:
[ ] Chart tooltips work on hover
[ ] Form dialogs open centered
[ ] Button sizes appropriate (sm:h-10)
[ ] Spacing appropriate (sm:p-6)
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Pattern 15:** React DevTools Profiler Validation
- **Pattern 16:** Bundle Size Validation
- **Pattern 17:** Real Device Testing Checklist

### Testing Requirements

**Real Device Testing:** REQUIRED (not emulators)
- iPhone 14 Pro (iOS 16+)
- iPhone SE (iOS 15+)
- Android mid-range (Android 11+)

**Performance Testing:**
- Lighthouse mobile audit
- FPS measurement during scrolling
- Web Vitals validation

**Regression Testing:**
- Desktop viewport (1024px+)
- All major pages (dashboard, transactions, analytics, budgets, goals)

**Coverage target:** 100% of iteration 15 changes tested on real devices

### Potential Split Strategy

**Not recommended.** This builder is primarily testing and validation. If split needed due to device availability:

**Primary (Builder-4A):** Layout + Performance (2 hours)
- Layout verification
- Lighthouse audit
- Bundle size validation
- Desktop regression test

**Sub-builder 4B:** Real Device Testing (1.5 hours)
- iPhone testing
- Android testing
- Keyboard validation
- Bug fixes from testing

---

## Builder Execution Order

### Parallel Group 1 (Start Immediately)
**Builders 1, 2, 3** can work 100% in parallel
- Builder-1: Performance Foundation
- Builder-2: Chart Optimization
- Builder-3: Form Optimization

**Estimated:** 4-6 hours (builders work at different speeds)

### Sequential (After Builders 1, 2, 3 Complete)
**Builder-4:** Mobile Layouts & Testing
- Depends on: All previous builders
- Validates: Everything works together

**Estimated:** 3-4 hours

### Integration (After All Builders Complete)
**Integration Lead (any builder):** 30-60 minutes
- Merge all builder branches
- Run production build
- Verify bundle sizes
- Run Lighthouse audit
- Fix integration conflicts (if any)

---

## Integration Notes

### Conflict Prevention

**Low Conflict Risk:**
- Builders work on different components
- Minimal shared file edits
- Builder-1 creates skeletons (new files)
- Builder-2 modifies charts (isolated)
- Builder-3 creates MobileSheet + modifies forms (isolated)
- Builder-4 primarily testing (no code changes unless bugs)

**Potential Shared Files:**
- `src/lib/trpc.ts` - Builder-1 updates (others don't touch)
- `src/components/ui/input.tsx` - No one modifies (already has inputMode prop)

### Merge Strategy

**Recommended order:**
1. Merge Builder-1 (foundation, others validate against this)
2. Merge Builder-2 (charts, independent of forms)
3. Merge Builder-3 (forms, independent of charts)
4. Merge Builder-4 (testing, bug fixes, final polish)

**Testing after each merge:**
- Run `npm run build` (ensure no errors)
- Verify bundle sizes (incremental validation)
- Spot check changed components

### Success Metrics (Post-Integration)

**Bundle Size:**
- [x] Analytics: <200KB first load JS
- [x] Dashboard: <140KB first load JS
- [x] Budgets: <330KB first load JS

**Performance:**
- [x] Lighthouse mobile: 85+ (target 90+)
- [x] FCP: <1.8s on Slow 3G
- [x] LCP: <2.5s on Slow 3G
- [x] 60fps scrolling

**Functionality:**
- [x] All forms show correct mobile keyboard
- [x] All charts responsive (250px mobile, 350px desktop)
- [x] MobileSheet works on mobile and desktop
- [x] Memoization reduces re-renders (70%+)
- [x] No console errors or warnings

---

**Builder Tasks Status:** COMPLETE
**Total Estimated Time:** 16-18 hours (4 builders, parallel work)
**Ready for:** Builder execution
