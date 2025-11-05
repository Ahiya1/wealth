# Code Patterns & Conventions - Iteration 15

## File Structure

```
src/
├── app/
│   └── (dashboard)/
│       ├── analytics/page.tsx          # Dynamic import charts
│       ├── dashboard/page.tsx          # Lazy load below-fold
│       └── goals/[id]/page.tsx         # Dynamic import chart
├── components/
│   ├── analytics/
│   │   ├── SpendingByCategoryChart.tsx # Memoize + responsive
│   │   ├── NetWorthChart.tsx           # Memoize + responsive
│   │   ├── MonthOverMonthChart.tsx     # Memoize + responsive
│   │   ├── SpendingTrendsChart.tsx     # Memoize + responsive
│   │   ├── IncomeSourcesChart.tsx      # Memoize + responsive
│   │   └── skeletons/
│   │       └── ChartSkeleton.tsx       # Skeleton screens
│   ├── dashboard/
│   │   ├── DashboardStats.tsx          # Server Component candidate
│   │   ├── RecentTransactionsCard.tsx  # Lazy load
│   │   ├── UpcomingBills.tsx           # Lazy load
│   │   └── skeletons/
│   │       ├── RecentTransactionsSkeleton.tsx
│   │       └── UpcomingBillsSkeleton.tsx
│   ├── mobile/
│   │   ├── BottomNavigation.tsx        # Existing (iteration 14)
│   │   ├── MoreSheet.tsx               # Existing (iteration 14)
│   │   └── MobileSheet.tsx             # NEW - Bottom sheet component
│   ├── transactions/
│   │   ├── TransactionCard.tsx         # Memoize
│   │   ├── TransactionForm.tsx         # inputMode + MobileSheet
│   │   └── AddTransactionForm.tsx      # inputMode + MobileSheet
│   ├── budgets/
│   │   ├── BudgetCard.tsx              # Memoize
│   │   └── BudgetForm.tsx              # inputMode + MobileSheet
│   ├── goals/
│   │   └── GoalCard.tsx                # Memoize
│   ├── accounts/
│   │   └── AccountCard.tsx             # Memoize
│   └── ui/
│       ├── stat-card.tsx               # Memoize
│       └── input.tsx                   # Already has inputMode prop
├── hooks/
│   ├── useMediaQuery.ts                # Existing (iteration 14)
│   ├── useScrollDirection.ts           # Existing (iteration 14)
│   └── useChartDimensions.ts           # NEW - Responsive chart hook
└── lib/
    ├── trpc.ts                         # Update React Query config
    └── animations.ts                   # Existing Framer Motion variants
```

---

## Naming Conventions

- **Components:** PascalCase (`TransactionCard.tsx`, `MobileSheet.tsx`)
- **Hooks:** camelCase with `use` prefix (`useChartDimensions.ts`)
- **Files:** Match component name (`TransactionCard.tsx` exports `TransactionCard`)
- **Skeleton Components:** `{Component}Skeleton.tsx` (`ChartSkeleton.tsx`)
- **Functions:** camelCase (`formatCurrency`, `calculateTotal`)
- **Types:** PascalCase (`Transaction`, `ChartDimensions`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_MOBILE_WIDTH`)

---

## Dynamic Import Patterns

### Pattern 1: Chart Component Dynamic Import

**When to use:** All Recharts components (heavy dependencies)

**Code example:**
```typescript
// src/app/(dashboard)/analytics/page.tsx
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Import skeleton screens (static, lightweight)
import { ChartSkeleton } from '@/components/analytics/skeletons/ChartSkeleton'

// Dynamic import with custom skeleton
const SpendingByCategoryChart = dynamic(
  () => import('@/components/analytics/SpendingByCategoryChart'),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false  // CRITICAL: Charts are client-only, prevent SSR
  }
)

const NetWorthChart = dynamic(
  () => import('@/components/analytics/NetWorthChart'),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)

// Usage in component (no changes needed)
export default function AnalyticsPage() {
  const { data: spendingData } = trpc.analytics.spendingByCategory.useQuery()
  const { data: netWorthData } = trpc.analytics.netWorthHistory.useQuery()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Component renders with tRPC data, skeleton shows during dynamic load */}
          <SpendingByCategoryChart data={spendingData || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthChart data={netWorthData || []} />
        </CardContent>
      </Card>
    </div>
  )
}
```

**Key points:**
- `ssr: false` prevents hydration mismatches for client-only charts
- Custom skeleton matches chart layout (prevents layout shift)
- tRPC query works normally (starts when component mounts)
- Skeleton shows during JS bundle download, then component's loading state shows during data fetch

**Files to apply this pattern:**
1. `src/app/(dashboard)/analytics/page.tsx` (5 charts)
2. `src/app/(dashboard)/goals/[id]/page.tsx` (1 chart)

---

### Pattern 2: Below-Fold Component Lazy Load

**When to use:** Dashboard components below the fold (not critical for FCP)

**Code example:**
```typescript
// src/app/(dashboard)/dashboard/page.tsx
import dynamic from 'next/dynamic'
import { AffirmationCard } from '@/components/ui/affirmation-card'
import { Greeting } from '@/components/dashboard/Greeting'
import { FinancialHealthIndicator } from '@/components/dashboard/FinancialHealthIndicator'

// Lazy load below-fold components
const UpcomingBills = dynamic(
  () => import('@/components/dashboard/UpcomingBills'),
  {
    loading: () => <UpcomingBillsSkeleton />,
    ssr: false
  }
)

const RecentTransactionsCard = dynamic(
  () => import('@/components/dashboard/RecentTransactionsCard'),
  {
    loading: () => <RecentTransactionsSkeleton />,
    ssr: false
  }
)

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ABOVE FOLD - Load immediately */}
      <AffirmationCard />
      <Greeting />
      <FinancialHealthIndicator />

      {/* BELOW FOLD - Lazy load */}
      <UpcomingBills />
      <RecentTransactionsCard />
    </div>
  )
}
```

**Key points:**
- Above-fold components load immediately (Affirmation, Greeting, FinancialHealthIndicator)
- Below-fold components lazy load (UpcomingBills, RecentTransactionsCard)
- User sees meaningful content faster (better FCP, LCP)
- Skeleton screens prevent layout shift

---

### Pattern 3: Skeleton Screen Creation

**When to use:** Every dynamically imported component

**Code example:**
```typescript
// src/components/analytics/skeletons/ChartSkeleton.tsx
interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 350 }: ChartSkeletonProps) {
  return (
    <div
      className="w-full animate-pulse bg-muted/20 rounded-lg"
      style={{ height: `${height}px` }}
    >
      {/* Optional: Add visual elements that match chart structure */}
      <div className="flex items-end justify-between h-full gap-2 px-4 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted rounded-t flex-1"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              opacity: 0.3
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

**Key points:**
- Match skeleton height to actual component (prevents layout shift)
- Use `animate-pulse` for loading indication
- Optional: Add visual hints (bars for chart, lines for list)
- Keep simple - don't recreate entire component

**Skeletons to create:**
1. `ChartSkeleton` (for all charts)
2. `UpcomingBillsSkeleton` (card with 3 line items)
3. `RecentTransactionsSkeleton` (card with 5 transaction rows)

---

## Memoization Patterns

### Pattern 4: React.memo for List Components

**When to use:** Any component rendered in lists (TransactionCard, BudgetCard, etc.)

**Code example:**
```typescript
// src/components/transactions/TransactionCard.tsx
import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cardHoverSubtle } from '@/lib/animations'
import type { Transaction } from '@prisma/client'

interface TransactionCardProps {
  transaction: Transaction
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

// Wrap entire component with memo
export const TransactionCard = memo(({
  transaction,
  onEdit,
  onDelete
}: TransactionCardProps) => {
  // Memoize expensive calculations
  const { isExpense, absAmount, displayDate } = useMemo(() => ({
    isExpense: Number(transaction.amount) < 0,
    absAmount: Math.abs(Number(transaction.amount)),
    displayDate: new Date(transaction.date).toLocaleDateString('he-IL')
  }), [transaction.amount, transaction.date])

  return (
    <motion.div
      {...cardHoverSubtle}  // Stable reference from animations.ts
      className="p-4 border rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{transaction.payee}</p>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={isExpense ? 'text-red-500' : 'text-green-500'}>
            {isExpense ? '-' : '+'}₪{absAmount.toFixed(2)}
          </span>

          {onEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(transaction.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
})

TransactionCard.displayName = 'TransactionCard'  // Required for React DevTools
```

**Key points:**
- `memo()` wraps entire component (not JSX)
- `useMemo()` for calculated values (prevent recalculation on every render)
- Framer Motion variants from `animations.ts` are stable (won't break memo)
- `displayName` required for React DevTools

**Components to memoize:**
1. `TransactionCard` (CRITICAL - 10-50 items in lists)
2. `BudgetCard` (5-20 items)
3. `GoalCard` (3-10 items)
4. `StatCard` (4 items on dashboard)
5. `AccountCard` (2-10 items)

---

### Pattern 5: React.memo with Custom Comparison

**When to use:** Only if profiling shows shallow comparison insufficient

**Code example:**
```typescript
// src/components/budgets/BudgetCard.tsx
import { memo, useMemo } from 'react'

export const BudgetCard = memo(
  ({ budget, onUpdate }: BudgetCardProps) => {
    const percentage = useMemo(() => {
      return (Number(budget.spent) / Number(budget.amount)) * 100
    }, [budget.spent, budget.amount])

    return (
      <Card>
        <CardHeader>
          <CardTitle>{budget.category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} />
          <p>₪{budget.spent} / ₪{budget.amount}</p>
        </CardContent>
      </Card>
    )
  },
  // Custom comparison function (only if needed)
  (prevProps, nextProps) => {
    // Only re-render if budget ID, spent, or amount changes
    return (
      prevProps.budget.id === nextProps.budget.id &&
      prevProps.budget.spent === nextProps.budget.spent &&
      prevProps.budget.amount === nextProps.budget.amount &&
      prevProps.onUpdate === nextProps.onUpdate
    )
  }
)

BudgetCard.displayName = 'BudgetCard'
```

**When NOT to use custom comparison:**
- Start with shallow comparison (default)
- Only add custom comparison if React DevTools Profiler shows unnecessary re-renders
- Custom comparison adds complexity and maintenance burden

---

### Pattern 6: useMemo for Expensive Calculations

**When to use:** Any calculation that runs on every render (date formatting, currency formatting, percentages)

**Code example:**
```typescript
// src/components/goals/GoalCard.tsx
import { memo, useMemo } from 'react'

export const GoalCard = memo(({ goal }: GoalCardProps) => {
  // Memoize ALL calculated values
  const calculations = useMemo(() => {
    const current = Number(goal.currentAmount)
    const target = Number(goal.targetAmount)
    const percentComplete = (current / target) * 100

    const today = new Date()
    const targetDate = new Date(goal.targetDate)
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    const status = daysRemaining < 0 ? 'overdue' :
                   daysRemaining < 30 ? 'urgent' : 'on-track'

    return {
      percentComplete: Math.min(percentComplete, 100),
      daysRemaining,
      status,
      displayTarget: targetDate.toLocaleDateString('he-IL')
    }
  }, [
    goal.currentAmount,
    goal.targetAmount,
    goal.targetDate
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goal.name}</CardTitle>
        <CardDescription>
          {calculations.daysRemaining} days remaining
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={calculations.percentComplete} />
        <Badge variant={calculations.status === 'urgent' ? 'destructive' : 'default'}>
          {calculations.status}
        </Badge>
      </CardContent>
    </Card>
  )
})
```

**Key points:**
- Group related calculations in single `useMemo()`
- Include all dependencies in dependency array
- Return object with all calculated values
- Don't memoize simple operations (x + y is faster than useMemo overhead)

---

## Chart Optimization Patterns

### Pattern 7: Responsive Chart Dimensions Hook

**When to use:** All Recharts components

**Code example:**
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

**Usage in chart component:**
```typescript
// src/components/analytics/NetWorthChart.tsx
'use client'

import { memo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface NetWorthChartProps {
  data: Array<{ date: string; netWorth: number }>
}

export const NetWorthChart = memo(({ data }: NetWorthChartProps) => {
  const { height, margin } = useChartDimensions()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          tickFormatter={(value) => `₪${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          allowEscapeViewBox={{ x: true, y: true }}  // Prevent tooltip cutoff
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

NetWorthChart.displayName = 'NetWorthChart'
```

**Key points:**
- Hook centralizes responsive logic (DRY principle)
- `height` prop on ResponsiveContainer (not parent div)
- `margin` adjusts for mobile (less wasted space)
- `allowEscapeViewBox` prevents tooltip viewport cutoff
- `memo` chart component (prevents re-render on parent state change)

---

### Pattern 8: Pie Chart Mobile Optimization

**When to use:** PieChart components (SpendingByCategoryChart, IncomeSourcesChart)

**Code example:**
```typescript
// src/components/analytics/SpendingByCategoryChart.tsx
'use client'

import { memo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useChartDimensions } from '@/hooks/useChartDimensions'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export const SpendingByCategoryChart = memo(({ data }: SpendingByCategoryChartProps) => {
  const { height, hidePieLabels } = useChartDimensions()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={!hidePieLabels}  // Hide label lines on mobile
          label={!hidePieLabels ? ({ name, percent }) => (
            `${name}: ${(percent * 100).toFixed(0)}%`
          ) : false}  // Hide labels on mobile
          outerRadius={hidePieLabels ? 80 : 100}  // Smaller radius on mobile
          fill="#8884d8"
          dataKey="amount"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>

        {/* Tooltip always shown (works on mobile tap) */}
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number) => `₪${value.toFixed(2)}`}
        />

        {/* Legend on mobile (replaces labels) */}
        {hidePieLabels && (
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconSize={10}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  )
})

SpendingByCategoryChart.displayName = 'SpendingByCategoryChart'
```

**Key points:**
- `hidePieLabels` from hook determines label visibility
- Smaller `outerRadius` on mobile (more space)
- Legend replaces labels on mobile
- Tooltip works on tap (mobile-friendly)
- Colors defined as constant (stable reference)

---

### Pattern 9: Mobile Data Reduction

**When to use:** Charts with large datasets (trends, history)

**Code example:**
```typescript
// src/components/analytics/SpendingTrendsChart.tsx
'use client'

import { memo, useMemo } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

export const SpendingTrendsChart = memo(({ data }: SpendingTrendsChartProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Reduce data points on mobile
  const chartData = useMemo(() => {
    if (!isMobile) return data  // Desktop: Show all data

    // Mobile: Show every 3rd data point (reduce from 90 to 30 points)
    return data.filter((_, index) => index % 3 === 0)
  }, [data, isMobile])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={margin}>
        {/* Chart configuration */}
      </LineChart>
    </ResponsiveContainer>
  )
})
```

**Key points:**
- `useMemo` prevents recalculation on every render
- Mobile: Show fewer data points (reduce complexity)
- Desktop: Show all data (full detail)
- Sampling strategy: Every 3rd point (maintains trend shape)

**Charts to apply data reduction:**
- SpendingTrendsChart (daily data → every 3rd day on mobile)
- NetWorthChart (90 days → 30 days on mobile)
- MonthOverMonthChart (12 months → 6 months on mobile)

---

## Form Optimization Patterns

### Pattern 10: inputMode for Mobile Keyboards

**When to use:** All numeric inputs (amounts, quantities, day of month)

**Code example:**
```typescript
// src/components/transactions/TransactionForm.tsx
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const formSchema = z.object({
  amount: z.number().positive(),
  payee: z.string().min(1),
  date: z.string()
})

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const form = useForm({
    resolver: zodResolver(formSchema)
  })

  return (
    <form onSubmit={form.handleSubmit(onSuccess)} className="space-y-4">
      {/* Amount input - DECIMAL keyboard */}
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          inputMode="decimal"  // ✅ Shows numeric keyboard with decimal point
          placeholder="0.00"
          {...form.register('amount', { valueAsNumber: true })}
        />
      </div>

      {/* Payee input - TEXT keyboard (default) */}
      <div>
        <Label htmlFor="payee">Payee</Label>
        <Input
          id="payee"
          type="text"
          placeholder="Merchant name"
          {...form.register('payee')}
        />
      </div>

      {/* Date input - NATIVE picker */}
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"  // Native mobile date picker
          {...form.register('date')}
        />
      </div>

      <Button type="submit" className="w-full">
        Save Transaction
      </Button>
    </form>
  )
}
```

**inputMode cheat sheet:**
```typescript
// Amount, price, balance (decimal numbers):
<Input type="number" step="0.01" inputMode="decimal" />

// Quantity, day of month (integers only):
<Input type="number" inputMode="numeric" />

// Email address:
<Input type="email" inputMode="email" />

// Phone number:
<Input type="tel" inputMode="tel" />

// Search box:
<Input type="search" inputMode="search" />

// URL:
<Input type="url" inputMode="url" />

// Default text:
<Input type="text" />  // No inputMode needed
```

**Forms to update:**
1. AddTransactionForm: amount input
2. TransactionForm: amount input
3. BudgetForm: amount input
4. GoalForm: targetAmount, currentAmount inputs
5. RecurringTransactionForm: amount, dayOfMonth inputs
6. AccountForm: balance input

---

### Pattern 11: MobileSheet Component

**When to use:** Forms on mobile (replace centered Dialog)

**Code example:**
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
    // Desktop: Render as centered dialog
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

  // Mobile: Render as bottom sheet
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            // Positioning
            'fixed inset-x-0 bottom-0 z-50',
            // Appearance
            'rounded-t-2xl border-t bg-background',
            // Sizing & Scrolling
            'max-h-[85vh] overflow-y-auto',
            // Spacing (safe area aware)
            'p-4 pb-safe-b',
            // Animations
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
            'transition-transform duration-200',
            className
          )}
        >
          {/* Drag handle (visual affordance) */}
          <div className="mx-auto w-12 h-1 rounded-full bg-muted mb-4" />

          {/* Header */}
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {/* Content */}
          <div className="mt-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
```

**Key points:**
- Responsive: Dialog on desktop, bottom sheet on mobile
- Safe area padding: `pb-safe-b` (respects iPhone notch)
- Animations: Slide up/down with CSS transforms
- Drag handle: Visual affordance (no drag gesture in iteration 15)
- Max height: 85vh (prevents full-screen takeover)

**Usage example:**
```typescript
// src/components/transactions/TransactionList.tsx
import { MobileSheet } from '@/components/mobile/MobileSheet'
import { TransactionForm } from './TransactionForm'

export function TransactionList() {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  return (
    <>
      {/* Transaction list */}
      <div className="space-y-2">
        {transactions.map(transaction => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onEdit={() => setEditingTransaction(transaction)}
          />
        ))}
      </div>

      {/* Edit form in MobileSheet */}
      <MobileSheet
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        title="Edit Transaction"
        description="Update transaction details"
      >
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={() => setEditingTransaction(null)}
        />
      </MobileSheet>
    </>
  )
}
```

---

### Pattern 12: Keyboard-Aware Form Layout

**When to use:** All forms with submit buttons

**Code example:**
```typescript
// src/components/budgets/BudgetForm.tsx
export function BudgetForm({ budget, onSuccess }: BudgetFormProps) {
  const form = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget || {}
  })

  return (
    <form
      onSubmit={form.handleSubmit(onSuccess)}
      className="space-y-4 pb-20"  // ✅ Bottom padding for keyboard clearance
    >
      {/* Form fields */}
      <div>
        <Label htmlFor="amount">Monthly Budget</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          inputMode="decimal"
          {...form.register('amount', { valueAsNumber: true })}
        />
      </div>

      <div>
        <Label htmlFor="month">Month</Label>
        <Input
          id="month"
          type="month"
          {...form.register('month')}
        />
      </div>

      {/* Submit button - sticky at bottom with opaque background */}
      <div className="sticky bottom-4 pt-4 border-t bg-background">
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
        >
          {budget ? 'Update Budget' : 'Create Budget'}
        </Button>
      </div>
    </form>
  )
}
```

**Key points:**
- `pb-20` (80px) on form: Clearance for mobile keyboard
- `sticky bottom-4`: Submit button sticks 16px from bottom
- `border-t`: Visual separation from scrolling content
- `bg-background`: Opaque background (content scrolls under button)
- `w-full`: Full-width button (easier to tap on mobile)

**Alternative pattern (fixed positioning):**
```typescript
// If sticky doesn't work on some devices
<div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t shadow-lg z-50">
  <Button type="submit" className="w-full">
    Submit
  </Button>
</div>
```

---

### Pattern 13: Category Picker Touch Targets

**When to use:** CategoryForm color swatches

**Code example:**
```typescript
// src/components/categories/CategoryForm.tsx
const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e'},
  // ... more colors
]

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const [selectedColor, setSelectedColor] = useState(category?.color || COLORS[0].value)

  return (
    <form className="space-y-4">
      {/* Color picker */}
      <div>
        <Label>Color</Label>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {COLORS.map(color => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                // Mobile-first: 48x48px (WCAG compliant)
                'w-12 h-12',
                // Desktop: 32x32px (smaller, acceptable)
                'sm:w-8 sm:h-8',
                // Appearance
                'rounded-lg border-2 transition-all',
                // Selected state
                selectedColor === color.value
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-muted hover:border-border'
              )}
              style={{ backgroundColor: color.value }}
              aria-label={`Select ${color.name}`}
            />
          ))}
        </div>
      </div>

      {/* Other form fields */}
    </form>
  )
}
```

**Key points:**
- Mobile: `w-12 h-12` (48x48px) ✅ WCAG AA compliant
- Desktop: `sm:w-8 sm:h-8` (32x32px) acceptable for dense UI
- Gap: `gap-2` mobile, `sm:gap-3` desktop (adequate spacing)
- `aria-label`: Accessibility for color selection
- Visual feedback: Ring on selected color

---

## React Query Optimization Pattern

### Pattern 14: Mobile-Optimized tRPC Configuration

**When to use:** Single update to tRPC client config (affects all queries)

**Code example:**
```typescript
// src/lib/trpc.ts
import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import { QueryClient } from '@tanstack/react-query'
import type { AppRouter } from '@/server/api/root'

export const trpc = createTRPCReact<AppRouter>()

// Create QueryClient with mobile-optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetches on mobile (save bandwidth)
      staleTime: 60 * 1000,           // 60 seconds (vs default 0)
      retry: 1,                        // 1 retry (vs default 3)
      refetchOnWindowFocus: false,     // Don't refetch on tab switch
      refetchOnReconnect: true,        // Do refetch when connection restored

      // Keep existing behavior
      refetchOnMount: true,
      retryOnMount: true,
    },
    mutations: {
      // Mutations: Keep aggressive retries (user-initiated actions)
      retry: 3,
    }
  }
})

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  )
}
```

**Key points:**
- **staleTime: 60s** - Financial data doesn't change every second
- **retry: 1** - Fail fast on slow 3G (not 3 retries)
- **refetchOnWindowFocus: false** - Mobile users switch tabs frequently
- **refetchOnReconnect: true** - Update when connection restored
- Applies to ALL tRPC queries globally

---

## Testing Patterns

### Pattern 15: React DevTools Profiler Validation

**When to use:** After memoizing components, verify re-render reduction

**Code example:**
```typescript
// Testing TransactionCard memoization

// BEFORE memoization:
// 1. Open React DevTools Profiler tab
// 2. Click "Record" (red circle)
// 3. Change transaction filter (e.g., select different category)
// 4. Stop recording
// 5. Observe: ALL 50 TransactionCard instances re-render (yellow/red flames)

// AFTER memoization:
// 1. Record same action (change filter)
// 2. Observe: Only TransactionList re-renders (gray)
// 3. TransactionCard instances don't re-render (no flames)
// 4. Result: 70-80% reduction in component renders

// Profiler settings:
// - "Record why each component rendered" (checkbox on)
// - "Highlight updates when components render" (Settings > Profiler)
```

**Validation checklist:**
- [x] TransactionCard: Filter change doesn't re-render cards
- [x] BudgetCard: Budget update only re-renders affected card
- [x] GoalCard: Goal progress update only re-renders that goal
- [x] StatCard: Stat change only re-renders that stat

---

### Pattern 16: Bundle Size Validation

**When to use:** After each builder completes dynamic imports

**Code example:**
```bash
# Run production build
npm run build

# Check output for bundle sizes
# Look for lines like:
# Route (app)                   Size     First Load JS
# ├ /analytics                  280 KB → 200 KB ✅

# Optional: Use bundle analyzer
ANALYZE=true npm run build
# Opens browser with interactive treemap
# Verify Recharts in separate chunk (lazy loaded)
```

**Validation points:**
- [x] Analytics page: 280KB → 190-200KB
- [x] Dashboard page: 176KB → 130-140KB
- [x] Recharts in separate chunk (not in main bundle)
- [x] UpcomingBills in separate chunk
- [x] RecentTransactionsCard in separate chunk

---

### Pattern 17: Real Device Testing Checklist

**When to use:** Final validation before deployment

**Code example:**
```typescript
// Real Device Testing Checklist

// DEVICE 1: iPhone 14 Pro (iOS 16+, 390x844)
// [ ] Amount input shows numeric keyboard with decimal point
// [ ] Date input shows native iOS date picker (wheel)
// [ ] MobileSheet slides up smoothly from bottom
// [ ] Submit button visible with keyboard open
// [ ] Charts fit viewport (no horizontal scroll)
// [ ] Charts are 250px tall (verify with inspector)
// [ ] Safe areas respected (no content under Dynamic Island)
// [ ] Transaction list scrolls at 60fps (visual check)
// [ ] Dark mode works correctly

// DEVICE 2: iPhone SE (iOS 15+, 375x667)
// [ ] All inputs work on smallest iPhone
// [ ] Charts readable at 375px width
// [ ] MobileSheet doesn't exceed 85vh
// [ ] Bottom navigation doesn't cover content

// DEVICE 3: Android Mid-Range (Android 11+, 360x740)
// [ ] Numeric keyboard with decimal point
// [ ] Date input shows calendar picker
// [ ] MobileSheet animation smooth (no jank)
// [ ] Gesture navigation doesn't conflict with sheet
// [ ] Charts responsive

// PERFORMANCE (All Devices):
// [ ] Lighthouse mobile score 85+ (target 90+)
// [ ] FCP <1.8s on Slow 3G
// [ ] LCP <2.5s on Slow 3G
// [ ] No layout shift (CLS <0.1)
```

---

## Import Order Convention

```typescript
// 1. React and Next.js core
import { memo, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// 2. External libraries (alphabetical)
import { motion } from 'framer-motion'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// 3. tRPC and server-related
import { trpc } from '@/lib/trpc'

// 4. UI components (shadcn)
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// 5. Feature components
import { TransactionCard } from '@/components/transactions/TransactionCard'
import { MobileSheet } from '@/components/mobile/MobileSheet'

// 6. Hooks (custom)
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

// 7. Utils and lib
import { cn } from '@/lib/utils'
import { cardHoverSubtle } from '@/lib/animations'

// 8. Types
import type { Transaction } from '@prisma/client'
import type { ChartDimensions } from '@/hooks/useChartDimensions'
```

---

## Code Quality Standards

### TypeScript Types
- All component props have explicit interface/type
- All hooks have return type annotation
- No `any` types (use `unknown` if necessary)
- Use `type` for props, `interface` for extendable structures

### Memoization
- Always use `displayName` with `memo()`
- Document WHY component is memoized (comment)
- Use `useMemo` for calculated values, not simple operations
- Test with React DevTools Profiler before and after

### Dynamic Imports
- Always provide `loading` component (skeleton)
- Use `ssr: false` for client-only components
- Comment WHY component is lazy loaded

### Forms
- Always use `inputMode` for numeric inputs
- Always include `aria-label` on icon buttons
- Submit buttons always full-width on mobile (`w-full`)

---

## Performance Standards

### Bundle Size
- Analytics page: <200KB first load JS
- Dashboard page: <140KB first load JS
- No single chunk >150KB (except framework)

### Runtime Performance
- 60fps scrolling (no dropped frames)
- FCP <1.8s on Slow 3G
- LCP <2.5s on Slow 3G
- CLS <0.1 (no layout shift)

### Memory
- No memory leaks (check Chrome DevTools Memory tab)
- Heap size <100MB for transaction list (50 items)

---

## Security Standards

- No `dangerouslySetInnerHTML` (XSS risk)
- All user input sanitized (React automatic)
- No inline event handlers (CSP compliance)
- Safe area utilities use CSS env() variables (no JS)

---

**Patterns Status:** COMPLETE
**Ready for:** Builder task breakdown
**Total Patterns:** 17 (covering all iteration 15 scenarios)
