# Code Patterns & Conventions

## File Structure

```
wealth/
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── (auth)/          # Auth pages
│   │   ├── (dashboard)/     # Dashboard pages
│   │   ├── layout.tsx       # Root layout
│   │   ├── providers.tsx    # Theme provider
│   │   └── globals.css      # CSS variables
│   ├── components/
│   │   ├── ui/              # Primitives (button, card, input)
│   │   ├── dashboard/       # Dashboard components
│   │   ├── auth/            # Auth forms
│   │   ├── accounts/        # Account components
│   │   ├── transactions/    # Transaction components
│   │   └── [feature]/       # Other feature components
│   ├── lib/
│   │   └── utils.ts         # cn() helper
│   ├── server/
│   │   └── api/             # tRPC routers
│   └── types/               # TypeScript types
├── tailwind.config.ts       # Tailwind configuration
└── tsconfig.json            # TypeScript configuration
```

## Naming Conventions

- **Components:** PascalCase (`AccountCard.tsx`, `TransactionForm.tsx`)
- **Files:** camelCase for utilities (`formatCurrency.ts`, `dateHelpers.ts`)
- **Types:** PascalCase (`Transaction`, `Account`, `User`)
- **Functions:** camelCase (`calculateTotal()`, `formatDate()`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_CURRENCY`)
- **CSS Classes:** Tailwind utilities (`bg-sage-50`, `text-warm-gray-900`)

---

## Dark Mode Patterns

### Pattern 1: Prefer Semantic Tokens (Automatic Dark Mode)

**When to use:** Generic backgrounds, text, and borders

```tsx
// ✅ GOOD - Automatically adapts to theme
<div className="bg-background text-foreground border-border">
  <p className="text-muted-foreground">Secondary text</p>
</div>

// Available semantic tokens:
bg-background          // Light: white, Dark: warm-gray-900
text-foreground        // Light: warm-gray-900, Dark: warm-gray-100
bg-card               // Light: white, Dark: warm-gray-900
text-card-foreground  // Light: warm-gray-900, Dark: warm-gray-100
bg-popover            // Light: white, Dark: warm-gray-900
border-border         // Light: warm-gray-200, Dark: warm-gray-700
bg-primary            // Light: sage-600, Dark: sage-400
bg-muted              // Light: warm-gray-50, Dark: warm-gray-800
text-muted-foreground // Light: warm-gray-600, Dark: warm-gray-400
bg-accent             // Light: sage-100, Dark: sage-800
```

**Full Example - Card Component:**
```tsx
// src/components/ui/card.tsx
import { cn } from "@/lib/utils"

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-soft",
        "dark:shadow-none dark:border-warm-gray-700",  // Add dark mode border
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

### Pattern 2: Custom Colors Need dark: Variants

**When to use:** Brand colors (sage, terracotta, gold), accent colors, conditional states

```tsx
// ❌ BAD - No dark mode support
<div className="bg-sage-50 text-sage-700 border-sage-200">
  Brand element
</div>

// ✅ GOOD - Dark mode variants added
<div className="bg-sage-50 dark:bg-sage-900 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-700">
  Brand element
</div>
```

**Color Mapping Reference:**
```tsx
// BACKGROUNDS
bg-white         → dark:bg-warm-gray-900
bg-sage-50       → dark:bg-sage-900
bg-sage-100      → dark:bg-sage-800
bg-warm-gray-50  → dark:bg-warm-gray-900
bg-terracotta-50 → dark:bg-terracotta-950
bg-gold-100      → dark:bg-gold-900

// TEXT
text-warm-gray-900 → dark:text-warm-gray-100
text-warm-gray-600 → dark:text-warm-gray-400
text-sage-600      → dark:text-sage-400
text-sage-700      → dark:text-sage-300
text-gold-500      → dark:text-gold-400

// BORDERS
border-warm-gray-200 → dark:border-warm-gray-700
border-sage-200      → dark:border-sage-700
border-terracotta-200 → dark:border-terracotta-800
```

**Full Example - Dashboard Sidebar:**
```tsx
// src/components/dashboard/DashboardSidebar.tsx
export function DashboardSidebar() {
  return (
    <aside className="bg-white dark:bg-warm-gray-900 border-r border-warm-gray-200 dark:border-warm-gray-700">
      <nav className="space-y-1">
        <button className="bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-700">
          Active Item
        </button>
        <button className="text-warm-gray-600 dark:text-warm-gray-400 hover:bg-warm-gray-50 dark:hover:bg-warm-gray-800">
          Inactive Item
        </button>
      </nav>
    </aside>
  )
}
```

### Pattern 3: Gradients Need Dark Alternatives

**When to use:** Hero elements, celebration cards, special emphasis backgrounds

```tsx
// ❌ BAD - Gradient doesn't adapt
<div className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100">
  Hero content
</div>

// ✅ GOOD - Dark mode gradient with higher contrast
<div className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900">
  Hero content
</div>

// ✅ ALSO GOOD - Subtle color hints in dark mode
<div className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 dark:from-sage-900/50 dark:via-warm-gray-900 dark:to-sage-900/30">
  Hero content
</div>
```

**Full Example - AffirmationCard:**
```tsx
// src/components/ui/affirmation-card.tsx
export function AffirmationCard({ message, icon: Icon }) {
  return (
    <div
      className={cn(
        "rounded-warmth shadow-soft-lg hover:shadow-soft-xl transition-all",
        "dark:shadow-none dark:border dark:border-warm-gray-600",
        "bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100",
        "dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900",
        "p-6"
      )}
    >
      <Icon className="text-gold-500 dark:text-gold-400 w-8 h-8 mb-4" />
      <p className="text-warm-gray-800 dark:text-warm-gray-200 text-lg">
        {message}
      </p>
    </div>
  )
}
```

### Pattern 4: SVG Strokes Need Dark Variants

**When to use:** Custom SVG illustrations, gauges, progress rings

```tsx
// ❌ BAD - Stroke color hardcoded
<svg>
  <circle
    stroke="hsl(var(--warm-gray-200))"
    fill="none"
  />
</svg>

// ✅ GOOD - className with dark: variant
<svg>
  <circle
    className="stroke-warm-gray-200 dark:stroke-warm-gray-700"
    fill="none"
  />
</svg>

// ✅ ALSO GOOD - Using currentColor
<svg className="text-sage-500 dark:text-sage-400">
  <circle
    stroke="currentColor"
    fill="none"
  />
</svg>
```

**Full Example - FinancialHealthIndicator Gauge:**
```tsx
// src/components/dashboard/FinancialHealthIndicator.tsx
export function FinancialHealthIndicator({ score }) {
  return (
    <div className="bg-gradient-to-br from-sage-50 to-warm-gray-50 dark:from-warm-gray-900 dark:to-warm-gray-800 p-6 rounded-warmth shadow-soft dark:shadow-none dark:border dark:border-warm-gray-600">
      <svg viewBox="0 0 200 200" className="w-full">
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r="80"
          className="stroke-warm-gray-200 dark:stroke-warm-gray-700"
          fill="none"
          strokeWidth="12"
        />
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r="80"
          className="stroke-sage-500 dark:stroke-sage-400"
          fill="none"
          strokeWidth="12"
          strokeDasharray={`${score * 5} 500`}
        />
      </svg>
      <p className="text-center text-warm-gray-900 dark:text-warm-gray-100 font-semibold">
        Financial Health: {score}%
      </p>
    </div>
  )
}
```

---

## Visual Warmth Patterns

### Pattern 1: Soft Shadows with Dark Mode Border Fallback

**When to use:** All cards, containers, elevated surfaces

```tsx
// Standard card
<Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
  Content
</Card>

// Elevated card (dashboard metrics)
<Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
  Metric content
</Card>

// Maximum elevation (dialogs)
<Dialog>
  <DialogContent className="shadow-soft-xl dark:shadow-none dark:border dark:border-warm-gray-500">
    Dialog content
  </DialogContent>
</Dialog>

// Subtle element (badge)
<Badge className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-800">
  Tag
</Badge>
```

**Shadow Levels:**
- `shadow-soft`: 0 1px 3px - standard cards, list items
- `shadow-soft-md`: 0 4px 6px - elevated cards, dropdowns
- `shadow-soft-lg`: 0 10px 15px - special emphasis, hero cards
- `shadow-soft-xl`: 0 20px 25px - dialogs, maximum elevation

**Full Example - Dashboard Metric Card:**
```tsx
// src/components/dashboard/NetWorthCard.tsx
export function NetWorthCard({ netWorth, change }) {
  return (
    <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600 rounded-warmth p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Net Worth
        </h3>
        <TrendingUp className="text-sage-600 dark:text-sage-400 w-4 h-4" />
      </div>
      <p className="text-3xl font-bold text-foreground">
        {formatCurrency(netWorth)}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {change > 0 ? '+' : ''}{change.toFixed(2)}% from last month
      </p>
    </Card>
  )
}
```

### Pattern 2: Elevated Surfaces Use rounded-warmth

**When to use:** Special emphasis cards, celebrations, onboarding, primary metrics

```tsx
// Standard card - rounded-lg
<Card className="rounded-lg shadow-soft">
  Normal content
</Card>

// Special emphasis - rounded-warmth (0.75rem instead of 0.5rem)
<Card className="rounded-warmth shadow-soft-lg">
  Celebration or primary metric
</Card>
```

**Components Using rounded-warmth:**
1. AffirmationCard ✅
2. FinancialHealthIndicator (add)
3. Auth card containers (add)
4. Dialog (special confirmations)
5. CompletedGoalCelebration (deferred to Iteration 12)
6. Elevated stat cards (when variant="elevated")

**Full Example - Auth Form Container:**
```tsx
// src/app/(auth)/signin/page.tsx
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-gray-50 dark:bg-warm-gray-950">
      <Card className="w-full max-w-md rounded-warmth shadow-soft-lg dark:shadow-none dark:border dark:border-warm-gray-600 p-8">
        <h1 className="text-2xl font-bold text-warm-gray-900 dark:text-warm-gray-100 mb-2">
          Welcome Back
        </h1>
        <p className="text-warm-gray-600 dark:text-warm-gray-400 mb-6">
          Sign in to continue to your dashboard
        </p>
        <SignInForm />
      </Card>
    </div>
  )
}
```

### Pattern 3: Form Inputs (No Border, Use Focus Ring)

**When to use:** All text inputs, textareas, selects

```tsx
// ✅ CORRECT - Shadow + focus ring (no dark:border)
<Input
  className="shadow-soft focus-visible:shadow-soft-md focus-visible:ring-2 focus-visible:ring-ring"
  placeholder="Enter amount"
/>

// ❌ WRONG - Don't add dark:border to inputs
<Input
  className="shadow-soft dark:border dark:border-warm-gray-700"  // NO! Focus ring provides boundary
  placeholder="Enter amount"
/>
```

**Rationale:** Form inputs use focus rings for accessibility. Adding borders in dark mode interferes with the ring visual.

**Full Example - Transaction Form Input:**
```tsx
// src/components/transactions/TransactionForm.tsx
<div className="space-y-4">
  <div>
    <Label htmlFor="amount">Amount</Label>
    <Input
      id="amount"
      type="number"
      className="shadow-soft focus-visible:shadow-soft-md"
      placeholder="0.00"
      {...register('amount')}
    />
  </div>
  <div>
    <Label htmlFor="payee">Payee</Label>
    <Input
      id="payee"
      className="shadow-soft focus-visible:shadow-soft-md"
      placeholder="Coffee Shop"
      {...register('payee')}
    />
  </div>
</div>
```

---

## Error Color Pattern

### Pattern 1: Use Terracotta for Errors (Not Harsh Red)

**When to use:** Form validation errors, toast notifications, empty states

```tsx
// ❌ OLD (harsh red):
<div className="text-red-600 bg-red-50 border-red-200">
  Invalid email address
</div>

// ✅ NEW (warm terracotta):
<div className="text-terracotta-700 bg-terracotta-50 border-terracotta-200 rounded-lg shadow-soft p-3 dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800">
  Invalid email address
</div>
```

**Full Example - Auth Form Error Message:**
```tsx
// src/components/auth/SignInForm.tsx
export function SignInForm() {
  const [error, setError] = useState<string | null>(null)

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-sm text-terracotta-700 bg-terracotta-50 border border-terracotta-200 rounded-lg shadow-soft p-3 mb-4 dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          type="email"
          placeholder="you@example.com"
          className="shadow-soft"
        />
        <Input
          type="password"
          placeholder="••••••••"
          className="shadow-soft"
        />
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </div>
    </form>
  )
}
```

### Pattern 2: Auth Page Dividers Use Warm-Gray (Not Generic Gray)

**When to use:** "Or continue with" dividers in auth forms

```tsx
// ❌ OLD (generic gray):
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-white px-2 text-gray-500">
      Or continue with
    </span>
  </div>
</div>

// ✅ NEW (warm-gray palette + semantic tokens):
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-warm-gray-200 dark:border-warm-gray-700" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-background px-2 text-muted-foreground">
      Or continue with
    </span>
  </div>
</div>
```

**Full Example - Complete Auth Form Styling:**
```tsx
// src/components/auth/SignInForm.tsx
export function SignInForm() {
  return (
    <div className="space-y-6">
      {/* Email/Password Form */}
      <form className="space-y-4">
        <Input type="email" placeholder="you@example.com" />
        <Input type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-warm-gray-200 dark:border-warm-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* OAuth Button */}
      <Button variant="outline" className="w-full">
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          {/* Google icon */}
        </svg>
        Continue with Google
      </Button>
    </div>
  )
}
```

---

## Loading State Pattern

### Pattern 1: Enhanced Button Component with loading Prop

**When to use:** All form submissions, delete actions, async operations

```tsx
// Before enhancement:
<Button type="submit" disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>

// After enhancement:
<Button type="submit" loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>

// Even simpler (Button handles disabled automatically):
<Button type="submit" loading={isLoading}>
  Save Changes
</Button>
```

**Implementation:**
```tsx
// src/components/ui/button.tsx
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  // ... other props
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
```

### Pattern 2: Form with Loading State (tRPC Mutation)

**When to use:** Create/update/delete forms

```tsx
// src/components/transactions/TransactionForm.tsx
export function TransactionForm({ transaction }) {
  const createTransaction = trpc.transactions.create.useMutation()
  const updateTransaction = trpc.transactions.update.useMutation()

  const isLoading = createTransaction.isPending || updateTransaction.isPending

  const onSubmit = (data) => {
    if (transaction?.id) {
      updateTransaction.mutate({ id: transaction.id, ...data })
    } else {
      createTransaction.mutate(data)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input placeholder="Amount" {...register('amount')} />
      <Input placeholder="Payee" {...register('payee')} />

      <Button type="submit" loading={isLoading} className="w-full">
        {isLoading
          ? (transaction ? 'Updating...' : 'Creating...')
          : (transaction ? 'Update Transaction' : 'Create Transaction')
        }
      </Button>
    </form>
  )
}
```

### Pattern 3: Delete Confirmation with Loading State

**When to use:** Delete buttons in AlertDialog

```tsx
// src/components/transactions/TransactionList.tsx
export function TransactionList({ transactions }) {
  const deleteTransaction = trpc.transactions.delete.useMutation()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  return (
    <div>
      {transactions.map((transaction) => (
        <div key={transaction.id}>
          <TransactionCard transaction={transaction} />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setDeletingId(transaction.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deletingId) {
                      deleteTransaction.mutate({ id: deletingId })
                    }
                  }}
                  loading={deleteTransaction.isPending}
                  className="bg-terracotta-500 hover:bg-terracotta-600"
                >
                  {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  )
}
```

### Pattern 4: Auth Form with Loading State (Supabase)

**When to use:** Sign in, sign up, password reset forms

```tsx
// src/components/auth/SignInForm.tsx
export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
    // If success, Next.js router will redirect
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="text-sm text-terracotta-700 bg-terracotta-50 border border-terracotta-200 rounded-lg shadow-soft p-3 dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800">
          {error}
        </div>
      )}

      <Input
        type="email"
        placeholder="you@example.com"
        {...register('email')}
      />
      <Input
        type="password"
        placeholder="••••••••"
        {...register('password')}
      />

      <Button type="submit" loading={isLoading} className="w-full">
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
```

---

## Import Order Convention

```tsx
// 1. External dependencies
import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 2. UI components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

// 3. Feature components
import { TransactionCard } from "@/components/transactions/TransactionCard"
import { AccountSelect } from "@/components/accounts/AccountSelect"

// 4. Utilities
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

// 5. Types
import type { Transaction } from "@/types"

// 6. Icons (last)
import { Plus, Trash2, Edit } from "lucide-react"
```

---

## Code Quality Standards

### Standard 1: Always Use cn() for className Merging

```tsx
// ❌ BAD - String concatenation
<div className={`base-class ${conditional ? 'active' : ''} ${className}`}>

// ✅ GOOD - Use cn() utility
<div className={cn("base-class", conditional && "active", className)}>
```

### Standard 2: Extract Complex Conditionals

```tsx
// ❌ BAD - Inline ternary hell
<div className={transaction.amount > 0 ? "text-green-600 bg-green-50" : transaction.amount < 0 ? "text-red-600 bg-red-50" : "text-gray-600"}>

// ✅ GOOD - Extract to variable
const amountColorClass = cn({
  "text-green-600 bg-green-50": transaction.amount > 0,
  "text-terracotta-600 bg-terracotta-50": transaction.amount < 0,
  "text-muted-foreground": transaction.amount === 0,
})

<div className={amountColorClass}>
```

### Standard 3: Group Related Tailwind Classes

```tsx
// ❌ BAD - Random order
<div className="p-4 text-lg bg-white border rounded-lg shadow-soft text-gray-900 border-gray-200">

// ✅ GOOD - Logical grouping
<div className={cn(
  // Layout
  "p-4",
  // Background & Borders
  "bg-white dark:bg-warm-gray-900",
  "border border-gray-200 dark:border-warm-gray-700",
  "rounded-lg shadow-soft dark:shadow-none",
  // Typography
  "text-lg text-gray-900 dark:text-gray-100"
)}>
```

### Standard 4: Use Consistent Spacing

```tsx
// ✅ Spacing scale
space-y-1   // 0.25rem - tight
space-y-2   // 0.5rem  - compact
space-y-4   // 1rem    - standard
space-y-6   // 1.5rem  - comfortable
space-y-8   // 2rem    - spacious
```

---

## Performance Patterns

### Pattern 1: Memoize Expensive Components

```tsx
// src/components/analytics/SpendingTrendsChart.tsx
import { memo } from 'react'

export const SpendingTrendsChart = memo(function SpendingTrendsChart({ data }) {
  // Expensive chart rendering
  return <div>{/* Chart */}</div>
})
```

### Pattern 2: Use React.lazy for Code Splitting (Future)

```tsx
// Defer to Iteration 12
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'))
```

---

## Security Patterns

### Pattern 1: Never Log Sensitive Data

```tsx
// ❌ BAD
console.log('User password:', password)

// ✅ GOOD
console.log('Login attempt for user:', email)  // No password
```

### Pattern 2: Use tRPC Input Validation

```tsx
// src/server/api/routers/transactions.ts
import { z } from 'zod'

export const transactionsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      payee: z.string().min(1).max(100),
      date: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Input is validated
      return ctx.db.transaction.create({ data: input })
    }),
})
```

---

## Testing Patterns (Future - Iteration 12)

### Pattern 1: Component Testing Template

```tsx
// src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('shows spinner when loading', () => {
    render(<Button loading={true}>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByTestId('loader-spinner')).toBeInTheDocument()
  })

  it('hides spinner when not loading', () => {
    render(<Button loading={false}>Save</Button>)
    expect(screen.getByRole('button')).not.toBeDisabled()
    expect(screen.queryByTestId('loader-spinner')).not.toBeInTheDocument()
  })
})
```

---

## Summary of Critical Patterns

**For Builders:**

1. **Dark Mode:**
   - Prefer semantic tokens (`bg-background`, `text-foreground`)
   - Add `dark:` variants for custom colors
   - Use shadow-border pattern: `shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700`

2. **Visual Warmth:**
   - Add soft shadows to all cards: `shadow-soft`, `shadow-soft-md`, `shadow-soft-lg`, `shadow-soft-xl`
   - Use `rounded-warmth` for special emphasis (11-15 components)
   - Form inputs: shadow + focus ring (NO dark:border)

3. **Error Colors:**
   - Use terracotta palette (not red): `text-terracotta-700 bg-terracotta-50 border-terracotta-200`
   - Auth dividers: warm-gray palette

4. **Button Loading:**
   - Add `loading` prop to Button component
   - Use `loading={mutation.isPending}` on all forms
   - Include text change: `{isLoading ? 'Saving...' : 'Save'}`

5. **Code Quality:**
   - Use `cn()` for className merging
   - Group related Tailwind classes
   - Extract complex conditionals
   - Follow import order convention
