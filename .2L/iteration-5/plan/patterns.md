# Code Patterns & Conventions - Iteration 5

## File Structure

```
/home/ahiya/Ahiya/wealth/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── layout.tsx                    # Auth pages layout (existing)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # ← NEW: Dashboard layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── accounts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── budgets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [month]/page.tsx
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── categories/page.tsx
│   │   ├── layout.tsx                        # Root layout (existing)
│   │   └── providers.tsx                     # tRPC provider (existing)
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DashboardSidebar.tsx          # ← NEW: Sidebar navigation
│   │   │   ├── DashboardStats.tsx            # ← MODIFY: Fix hasData logic
│   │   │   └── RecentTransactionsCard.tsx
│   │   └── ui/
│   │       ├── empty-state.tsx               # ← MODIFY: Better action handling
│   │       └── ...
│   ├── lib/
│   │   └── supabase/
│   │       └── server.ts                     # Used for auth checks
│   └── server/
│       └── api/
│           └── routers/                      # All tRPC routers (no changes)
└── scripts/
    └── seed-demo-data.ts                      # ← NEW (optional): Seed script
```

## Naming Conventions

**Components:** PascalCase
- `DashboardSidebar.tsx`
- `EmptyState.tsx`

**Files:** kebab-case for non-components
- `seed-demo-data.ts`

**Functions:** camelCase
- `createDemoAccount()`
- `seedUserData()`

**Constants:** SCREAMING_SNAKE_CASE
- `DEMO_CATEGORIES`
- `SEED_TRANSACTION_COUNT`

## Dashboard Layout Pattern

### Layout Component Structure

**File:** `/app/(dashboard)/layout.tsx`

**Purpose:** Shared layout for all authenticated dashboard pages

**Full Code Example:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-warm-gray-50">
      <div className="flex">
        {/* Sidebar Navigation */}
        <DashboardSidebar user={user} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

**Key Points:**
- Async server component (can call `createClient()` directly)
- Auth check runs ONCE for all dashboard pages
- User object passed to sidebar for display name/avatar
- Flex layout: fixed sidebar + scrollable content
- Children render in main content area

**What This Fixes:**
- Centralizes auth (remove from individual pages)
- Provides consistent navigation
- May fix 404 routing issues

## Sidebar Navigation Pattern

### Sidebar Component Structure

**File:** `/components/dashboard/DashboardSidebar.tsx`

**Purpose:** Navigation menu for all dashboard pages

**Full Code Example:**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  Target,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface DashboardSidebarProps {
  user: User
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Accounts',
    href: '/dashboard/accounts',
    icon: Wallet,
  },
  {
    title: 'Transactions',
    href: '/dashboard/transactions',
    icon: Receipt,
  },
  {
    title: 'Budgets',
    href: '/dashboard/budgets',
    icon: PieChart,
  },
  {
    title: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings/categories',
    icon: Settings,
  },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <aside className="w-64 bg-white border-r border-warm-gray-200 min-h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-warm-gray-200">
        <h1 className="text-2xl font-bold text-sage-600">Wealth</h1>
        <p className="text-sm text-warm-gray-600 mt-1">
          Mindful Money Management
        </p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-warm-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center">
            <span className="text-sage-700 font-semibold">
              {user.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warm-gray-900 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'hover:bg-sage-50',
                isActive
                  ? 'bg-sage-100 text-sage-700 font-medium'
                  : 'text-warm-gray-700'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-warm-gray-200">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
```

**Key Points:**
- Client component (needs hooks: `usePathname`, `useRouter`)
- Active link highlighting via pathname comparison
- User email displayed (can enhance with avatar later)
- Sign out button at bottom
- Responsive hover states
- Icons from lucide-react

**Styling Notes:**
- Fixed width: 264px (w-64)
- White background with border
- Active state: sage-100 background
- Hover state: sage-50 background

## Dashboard Page Pattern (After Layout)

### Simplified Page Structure

**Before (Duplicated Auth):**

```typescript
// OLD: Every page does this
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="space-y-8">
      {/* Page content */}
    </div>
  )
}
```

**After (Simplified):**

```typescript
// NEW: Layout handles auth, pages just render content
export default async function DashboardPage() {
  // Auth check in layout.tsx, no need to duplicate

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-warm-gray-900">Dashboard</h1>

      <AffirmationCard />
      <DashboardStats />
      <RecentTransactionsCard />
    </div>
  )
}
```

**Key Points:**
- Remove auth check (layout handles it)
- Remove user fetching (unless page needs it)
- Focus on page content only
- Layout provides sidebar automatically

**When Page Needs User Data:**

```typescript
export default async function SettingsPage() {
  // If page specifically needs user data, fetch it
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1>Settings for {user?.email}</h1>
      {/* ... */}
    </div>
  )
}
```

## hasData Logic Pattern

### Problem: Value-Based Check

**Old Pattern (Too Strict):**

```typescript
// ❌ BAD: Fails for $0 balance accounts
const hasData = data && (
  data.netWorth !== 0 ||
  data.income !== 0 ||
  data.expenses !== 0
)
```

**Issues:**
- User with $0 checking account sees empty state
- User with offsetting transactions ($100 in, $100 out) sees empty state
- Checks VALUES instead of EXISTENCE

### Solution: Existence-Based Check

**New Pattern (Accurate):**

```typescript
// ✅ GOOD: Checks if records exist
const hasData = data && (
  data.recentTransactions.length > 0
)
```

**Even Better (Check Multiple Signals):**

```typescript
// ✅ BEST: Multiple indicators
const hasData = data && (
  data.recentTransactions.length > 0 ||
  data.budgetCount > 0 ||
  // Future: add accountCount when available
  false
)
```

### Full DashboardStats Pattern

**File:** `/components/dashboard/DashboardStats.tsx`

**Modified Section:**

```typescript
'use client'

import { trpc } from '@/lib/trpc'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, Wallet, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function DashboardStats() {
  const { data, isLoading, error } = trpc.analytics.dashboardSummary.useQuery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={Wallet}
        title="Unable to load dashboard"
        description={error.message}
      />
    )
  }

  // ✅ NEW: Check for record existence, not values
  const hasData = data && data.recentTransactions.length > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={Wallet}
        title="Start tracking your finances"
        description="Add your first account or transaction to see your financial dashboard come to life."
        action={
          <div className="flex gap-3">
            <Button asChild className="bg-sage-600 hover:bg-sage-700">
              <Link href="/dashboard/accounts">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/transactions">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          </div>
        }
      />
    )
  }

  // Calculate savings rate
  const savingsRate = data.income > 0
    ? ((data.income - data.expenses) / data.income) * 100
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Net Worth"
        value={`$${data.netWorth.toLocaleString()}`}
        icon={DollarSign}
        trend={data.netWorth >= 0 ? 'up' : 'down'}
        trendValue={`${Math.abs(data.netWorth).toLocaleString()}`}
        className="bg-gradient-to-br from-sage-50 to-white"
      />

      <StatCard
        title="Monthly Income"
        value={`$${data.income.toLocaleString()}`}
        icon={TrendingUp}
        trend="up"
        trendValue={`${data.income.toLocaleString()}`}
        className="bg-gradient-to-br from-green-50 to-white"
      />

      <StatCard
        title="Monthly Expenses"
        value={`$${data.expenses.toLocaleString()}`}
        icon={TrendingDown}
        trend="down"
        trendValue={`${data.expenses.toLocaleString()}`}
        className="bg-gradient-to-br from-red-50 to-white"
      />

      <StatCard
        title="Savings Rate"
        value={`${savingsRate.toFixed(1)}%`}
        icon={Wallet}
        trend={savingsRate > 0 ? 'up' : 'down'}
        trendValue={`${Math.abs(savingsRate).toFixed(1)}%`}
        className="bg-gradient-to-br from-blue-50 to-white"
      />
    </div>
  )
}
```

**Key Changes:**
1. Changed `hasData` to check `recentTransactions.length > 0`
2. Added TWO action buttons to empty state (accounts + transactions)
3. Better error handling with specific error message
4. Improved empty state description

## EmptyState Action Pattern

### Enhanced EmptyState Component

**File:** `/components/ui/empty-state.tsx`

**Current Implementation:**

```typescript
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        'bg-white rounded-lg border-2 border-dashed border-warm-gray-200',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-warm-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-warm-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-warm-gray-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-warm-gray-600 mb-6 max-w-md">
        {description}
      </p>

      {action && <div className="flex gap-3">{action}</div>}
    </div>
  )
}
```

**Usage Pattern with Action Buttons:**

```typescript
<EmptyState
  icon={Receipt}
  title="No transactions yet"
  description="Start tracking your spending by adding your first transaction."
  action={
    <Button asChild className="bg-sage-600 hover:bg-sage-700">
      <Link href="/dashboard/transactions">
        <Plus className="mr-2 h-4 w-4" />
        Add Transaction
      </Link>
    </Button>
  }
/>
```

**Multi-Button Action Pattern:**

```typescript
<EmptyState
  icon={Wallet}
  title="Welcome to Wealth!"
  description="Choose how you'd like to get started with tracking your finances."
  action={
    <>
      <Button asChild className="bg-sage-600 hover:bg-sage-700">
        <Link href="/dashboard/accounts">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard/transactions">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Link>
      </Button>
    </>
  }
/>
```

**Key Points:**
- `action` prop is optional (backward compatible)
- Can pass single button or multiple buttons
- Use `asChild` on Button with Link for navigation
- Primary action uses sage colors
- Secondary actions use outline variant

## File Permission Pattern

### Fixing Directory Permissions

**Problem:** Directories created with 700 permissions (owner only)

**Solution:** Change to 755 (read + execute for all)

**Command Pattern:**

```bash
# Fix all dashboard route directories
chmod -R 755 /home/ahiya/Ahiya/wealth/src/app/(dashboard)

# Verify permissions
ls -la /home/ahiya/Ahiya/wealth/src/app/(dashboard)

# Expected output:
# drwxr-xr-x (755) - directories
# -rw-r--r-- (644) - files
```

**What This Does:**
- Directories: `rwxr-xr-x` (owner: read/write/execute, others: read/execute)
- Files remain: `rw-r--r--` (owner: read/write, others: read)
- Allows Next.js to traverse and read route files

**When to Run:**
- After creating new route directories
- When experiencing unexpected 404 errors
- As part of project setup

## Cache Clearing Pattern

### Next.js Cache Management

**When to Clear Cache:**

1. After creating new layout files
2. After fixing file permissions
3. When routes 404 despite files existing
4. When seeing stale content

**Command Pattern:**

```bash
# Stop dev server (Ctrl+C)

# Remove Next.js cache
rm -rf /home/ahiya/Ahiya/wealth/.next

# Restart dev server
npm run dev

# Wait for "Ready" message
# Test routes
```

**Full Cleanup (Nuclear Option):**

```bash
# Stop dev server

# Clear Next.js cache
rm -rf .next

# Clear node_modules (if dependencies changed)
rm -rf node_modules
npm install

# Clear Prisma client cache (if schema changed)
npx prisma generate

# Restart
npm run dev
```

**Automated Script (Optional):**

Add to `package.json`:

```json
{
  "scripts": {
    "clean": "rm -rf .next",
    "fresh": "npm run clean && npm run dev"
  }
}
```

Usage:
```bash
npm run fresh
```

## Seed Data Pattern (Optional - Builder-3)

### Seed Script Structure

**File:** `/scripts/seed-demo-data.ts`

**Purpose:** Create demo data for testing/development

**Full Code Example:**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedOptions {
  userId: string
  accountCount?: number
  transactionCount?: number
  budgetCount?: number
  goalCount?: number
}

async function seedDemoData(options: SeedOptions) {
  const {
    userId,
    accountCount = 3,
    transactionCount = 20,
    budgetCount = 5,
    goalCount = 2,
  } = options

  console.log(`Seeding demo data for user: ${userId}`)

  // 1. Get or create default categories
  const categories = await prisma.category.findMany({
    where: { isDefault: true },
  })

  if (categories.length === 0) {
    throw new Error('No default categories found. Run category seed first.')
  }

  const groceriesCategory = categories.find(c => c.name === 'Groceries')
  const salaryCategory = categories.find(c => c.name === 'Salary')
  const rentCategory = categories.find(c => c.name === 'Rent')

  // 2. Create demo accounts
  console.log(`Creating ${accountCount} demo accounts...`)

  const checkingAccount = await prisma.account.create({
    data: {
      userId,
      type: 'CHECKING',
      name: 'Chase Checking',
      institution: 'Chase Bank',
      balance: 5234.50,
      isManual: true,
      isActive: true,
    },
  })

  const savingsAccount = await prisma.account.create({
    data: {
      userId,
      type: 'SAVINGS',
      name: 'High Yield Savings',
      institution: 'Ally Bank',
      balance: 12500.00,
      isManual: true,
      isActive: true,
    },
  })

  const creditAccount = await prisma.account.create({
    data: {
      userId,
      type: 'CREDIT',
      name: 'Chase Sapphire',
      institution: 'Chase Bank',
      balance: -1234.00, // Credit cards have negative balance
      isManual: true,
      isActive: true,
    },
  })

  console.log('✓ Created 3 demo accounts')

  // 3. Create demo transactions
  console.log(`Creating ${transactionCount} demo transactions...`)

  const transactions = []
  const today = new Date()

  // Last 30 days of transactions
  for (let i = 0; i < transactionCount; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    const isExpense = Math.random() > 0.3 // 70% expenses, 30% income

    transactions.push({
      userId,
      accountId: Math.random() > 0.5 ? checkingAccount.id : creditAccount.id,
      categoryId: isExpense
        ? (groceriesCategory?.id || rentCategory?.id || categories[0].id)
        : (salaryCategory?.id || categories[0].id),
      date,
      amount: isExpense
        ? -Math.random() * 200 - 10 // Expenses: -$10 to -$210
        : Math.random() * 1000 + 500, // Income: $500 to $1500
      payee: isExpense
        ? ['Whole Foods', 'Amazon', 'Target', 'Starbucks'][Math.floor(Math.random() * 4)]
        : 'Employer Paycheck',
      notes: isExpense ? 'Weekly shopping' : 'Monthly salary',
      isManual: true,
    })
  }

  await prisma.transaction.createMany({ data: transactions })
  console.log(`✓ Created ${transactionCount} demo transactions`)

  // 4. Create demo budgets
  console.log(`Creating ${budgetCount} demo budgets...`)

  const currentMonth = today.toISOString().slice(0, 7) // YYYY-MM format

  const budgets = categories.slice(0, budgetCount).map(category => ({
    userId,
    categoryId: category.id,
    amount: Math.random() * 500 + 100, // $100 to $600
    month: currentMonth,
    rolloverEnabled: Math.random() > 0.5,
  }))

  await prisma.budget.createMany({ data: budgets })
  console.log(`✓ Created ${budgetCount} demo budgets`)

  // 5. Create demo goals
  console.log(`Creating ${goalCount} demo goals...`)

  const targetDate = new Date(today)
  targetDate.setMonth(targetDate.getMonth() + 12) // 1 year from now

  await prisma.goal.create({
    data: {
      userId,
      name: 'Emergency Fund',
      description: 'Build 6 months of expenses',
      targetAmount: 15000,
      currentAmount: 5000,
      targetDate,
      type: 'SAVINGS',
      linkedAccountId: savingsAccount.id,
    },
  })

  await prisma.goal.create({
    data: {
      userId,
      name: 'Pay Off Credit Card',
      description: 'Eliminate credit card debt',
      targetAmount: 1234,
      currentAmount: 400,
      targetDate,
      type: 'DEBT_PAYOFF',
    },
  })

  console.log(`✓ Created ${goalCount} demo goals`)

  console.log('\n✅ Demo data seeded successfully!\n')
  console.log('Summary:')
  console.log(`  - ${accountCount} accounts`)
  console.log(`  - ${transactionCount} transactions`)
  console.log(`  - ${budgetCount} budgets`)
  console.log(`  - ${goalCount} goals`)
}

// CLI usage
async function main() {
  const userId = process.env.USER_ID || process.argv[2]

  if (!userId) {
    console.error('Error: USER_ID required')
    console.error('Usage: npm run seed <user-id>')
    console.error('   or: USER_ID=<user-id> npm run seed')
    process.exit(1)
  }

  try {
    await seedDemoData({ userId })
  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
```

**Package.json Script:**

```json
{
  "scripts": {
    "seed": "tsx scripts/seed-demo-data.ts"
  }
}
```

**Usage:**

```bash
# Get user ID from Supabase dashboard or database
npm run seed <user-id>

# Or with environment variable
USER_ID=abc-123-def npm run seed
```

**Key Points:**
- Validates user ID exists
- Creates realistic transaction amounts/dates
- Uses existing default categories
- Links goals to accounts
- Random data for variety
- Console output for progress
- Error handling with exit codes

## Import Order Convention

Standard import order for all components:

```typescript
// 1. React and Next.js imports
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

// 2. Third-party libraries
import { User } from '@supabase/supabase-js'

// 3. Internal utilities
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { trpc } from '@/lib/trpc'

// 4. Components
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/ui/stat-card'

// 5. Icons (last)
import { Plus, Wallet, Receipt } from 'lucide-react'

// 6. Types
import type { DashboardData } from '@/types/analytics'
```

## Testing Pattern

### Manual Testing Checklist

**After implementing fixes:**

```bash
# 1. Clear cache and restart
rm -rf .next
npm run dev

# 2. Test each route (logged in)
curl -I http://localhost:3002/dashboard
curl -I http://localhost:3002/dashboard/accounts
curl -I http://localhost:3002/dashboard/transactions
curl -I http://localhost:3002/dashboard/budgets
curl -I http://localhost:3002/dashboard/goals
curl -I http://localhost:3002/dashboard/analytics

# 3. All should return 200, not 404

# 4. Browser testing:
# - Sign in
# - Navigate to each page via sidebar
# - Verify sidebar visible on all pages
# - Click "Add" buttons (dialogs should open)
# - No console errors
```

### Component Testing Pattern

**When modifying EmptyState:**

Test in multiple contexts:
1. DashboardStats (no data)
2. RecentTransactionsCard (no transactions)
3. AccountList (no accounts)
4. TransactionList (no transactions)

Verify:
- Empty state displays correctly
- Action buttons render
- Buttons navigate correctly
- Styling consistent across contexts

## Summary

**Critical Patterns:**
1. Layout wraps all dashboard pages (auth + sidebar)
2. hasData checks existence, not values
3. EmptyState always has action buttons
4. Permissions 755 for directories, 644 for files
5. Clear cache after structure changes

**File Organization:**
- Layouts in route group root
- Components in `/components/dashboard/`
- Scripts in `/scripts/`
- Maintain existing structure

**Code Style:**
- TypeScript strict mode
- Explicit return types
- Props interfaces defined
- Use existing utilities (cn, trpc, etc.)
