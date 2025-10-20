# Code Patterns & Conventions - Iteration 7

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       ├── page.tsx              # Settings hub (modify)
│   │       └── account/
│   │           └── page.tsx          # NEW: Account settings page
│   ├── providers.tsx                 # MODIFY: Add ThemeProvider
│   └── globals.css                   # MODIFY: Add dark mode CSS
├── components/
│   ├── settings/                     # NEW FOLDER
│   │   ├── ProfileSection.tsx        # Profile form
│   │   ├── PreferencesSection.tsx    # Currency/timezone
│   │   ├── ThemeSection.tsx          # Theme toggle wrapper
│   │   ├── ThemeSwitcher.tsx         # Theme toggle component
│   │   ├── DangerZone.tsx            # Account deletion
│   │   └── ExportAllDataButton.tsx   # JSON export
│   └── ui/                           # Existing Radix components
├── lib/
│   ├── csvExport.ts                  # MODIFY: Add budget/goal/account CSV
│   └── jsonExport.ts                 # NEW: JSON export utilities
└── server/
    └── api/
        └── routers/
            └── users.router.ts       # MODIFY: Add 3 new endpoints
```

## Naming Conventions

**Components:** PascalCase
- `ProfileSection.tsx`
- `ThemeSwitcher.tsx`
- `DangerZone.tsx`

**Files:** camelCase
- `csvExport.ts`
- `jsonExport.ts`

**Functions:** camelCase
- `generateBudgetCSV()`
- `downloadJSON()`
- `deleteAccount()`

**Types:** PascalCase
- `ExportFormat`
- `ProfileFormData`
- `ThemePreference`

**Constants:** SCREAMING_SNAKE_CASE
- `COMMON_CURRENCIES`
- `COMMON_TIMEZONES`
- `MAX_EXPORT_ROWS`

## Theme System Patterns

### Pattern 1: ThemeProvider Setup

**When to use:** Root app setup (one-time configuration)

**Code example:**

```typescript
// src/app/providers.tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { trpc } from '@/lib/trpc'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => trpc.createClient())

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  )
}
```

**Key points:**
- `attribute="class"` - Sets `.dark` class on `<html>` element
- `defaultTheme="system"` - Respects OS preference by default
- `enableSystem` - Allows "System" option in toggle
- `disableTransitionOnChange` - Prevents color animation (jarring)
- Wrap around tRPC provider (ThemeProvider outermost)

### Pattern 2: Dark Mode CSS Variables

**When to use:** Defining dark mode color palette

**Code example:**

```css
/* src/app/globals.css */
@layer base {
  :root {
    /* Light mode (existing - DO NOT MODIFY) */
    --background: var(--warm-gray-50);    /* 24 6% 96% */
    --foreground: var(--warm-gray-900);   /* 24 10% 11% */
    --card: var(--warm-white);
    --card-foreground: var(--warm-gray-900);
    --primary: var(--sage-600);           /* 140 14% 33% */
    --primary-foreground: var(--warm-white);
    --muted: var(--warm-gray-100);
    --muted-foreground: var(--warm-gray-600);
    --accent: var(--sage-100);
    --accent-foreground: var(--sage-900);
    --border: var(--warm-gray-200);
    --input: var(--warm-gray-200);
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
  }

  /* Dark mode (ADD THIS SECTION) */
  .dark {
    --background: 24 10% 11%;            /* Dark warm-gray */
    --foreground: 24 6% 96%;             /* Light warm-gray */
    --card: 24 9% 16%;                   /* Elevated surface */
    --card-foreground: 24 6% 96%;
    --primary: 140 12% 69%;              /* Lighter sage for contrast */
    --primary-foreground: 140 18% 15%;   /* Dark sage */
    --muted: 24 9% 16%;
    --muted-foreground: 24 4% 66%;       /* Medium warm-gray */
    --accent: 140 10% 92%;               /* Light sage accent */
    --accent-foreground: 140 15% 27%;
    --border: 24 7% 27%;                 /* Subtle borders */
    --input: 24 7% 27%;
    --destructive: 0 62% 50%;            /* Slightly darker red */
    --destructive-foreground: 0 0% 98%;
    --ring: 140 12% 69%;                 /* Focus ring matches primary */
  }
}
```

**Key points:**
- Keep HSL format (matches Tailwind)
- Maintain sage green brand identity in dark mode
- Ensure contrast ratios ≥4.5:1 (WCAG AA)
- Test with WebAIM contrast checker
- Use warmer grays (24° hue) not pure gray (0° hue)

### Pattern 3: Theme Switcher Component

**When to use:** Settings page, sidebar (anywhere user selects theme)

**Code example:**

```tsx
// src/components/settings/ThemeSwitcher.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Key points:**
- `mounted` state prevents hydration mismatch (server doesn't know theme)
- Return placeholder during SSR (disabled button)
- Sun/Moon icons with smooth rotation transition
- `sr-only` text for screen readers
- Dropdown shows all 3 options (light/dark/system)

## CSV Export Patterns

### Pattern 4: Budget CSV Export

**When to use:** Exporting budget data for spreadsheet analysis

**Code example:**

```typescript
// src/lib/csvExport.ts (ADD TO EXISTING FILE)

import { format } from 'date-fns'

interface BudgetExport {
  month: string
  category: {
    name: string
  }
  budgetAmount: number | Decimal
  spentAmount: number | Decimal
  remainingAmount: number | Decimal
  status: string
}

export function generateBudgetCSV(budgets: BudgetExport[]): string {
  const headers = ['Month', 'Category', 'Budgeted', 'Spent', 'Remaining', 'Status']
  const headerRow = headers.join(',')

  const dataRows = budgets.map((budget) => {
    const budgeted = typeof budget.budgetAmount === 'number'
      ? budget.budgetAmount
      : Number(budget.budgetAmount.toString())
    const spent = typeof budget.spentAmount === 'number'
      ? budget.spentAmount
      : Number(budget.spentAmount.toString())
    const remaining = typeof budget.remainingAmount === 'number'
      ? budget.remainingAmount
      : Number(budget.remainingAmount.toString())

    const row = [
      budget.month, // YYYY-MM format
      `"${budget.category.name.replace(/"/g, '""')}"`, // Escape quotes
      budgeted.toFixed(2),
      spent.toFixed(2),
      remaining.toFixed(2),
      budget.status, // 'UNDER_BUDGET' | 'OVER_BUDGET' | 'AT_LIMIT'
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + csvContent
}
```

**Key points:**
- Handle Prisma Decimal type (convert to number)
- Escape double quotes in category names (`" → ""`)
- Format currency to 2 decimal places
- UTF-8 BOM prefix for Excel
- Month in YYYY-MM format (sortable)

### Pattern 5: Goal CSV Export

**When to use:** Exporting financial goals

**Code example:**

```typescript
// src/lib/csvExport.ts (ADD TO EXISTING FILE)

interface GoalExport {
  name: string
  targetAmount: number | Decimal
  currentAmount: number | Decimal
  targetDate: Date
  linkedAccount: {
    name: string
  } | null
  status: string
}

export function generateGoalCSV(goals: GoalExport[]): string {
  const headers = ['Goal', 'Target Amount', 'Current Amount', 'Progress %', 'Target Date', 'Linked Account', 'Status']
  const headerRow = headers.join(',')

  const dataRows = goals.map((goal) => {
    const target = typeof goal.targetAmount === 'number'
      ? goal.targetAmount
      : Number(goal.targetAmount.toString())
    const current = typeof goal.currentAmount === 'number'
      ? goal.currentAmount
      : Number(goal.currentAmount.toString())
    const progress = target > 0 ? ((current / target) * 100).toFixed(1) : '0.0'

    const row = [
      `"${goal.name.replace(/"/g, '""')}"`,
      target.toFixed(2),
      current.toFixed(2),
      progress,
      format(new Date(goal.targetDate), 'yyyy-MM-dd'),
      goal.linkedAccount ? `"${goal.linkedAccount.name.replace(/"/g, '""')}"` : 'None',
      goal.status, // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')
  return '\uFEFF' + csvContent // UTF-8 BOM
}
```

**Key points:**
- Calculate progress percentage in CSV
- Handle null linkedAccount gracefully
- Date formatting consistent (YYYY-MM-DD)
- All currency values to 2 decimals

### Pattern 6: Account CSV Export

**When to use:** Exporting account balances

**Code example:**

```typescript
// src/lib/csvExport.ts (ADD TO EXISTING FILE)

interface AccountExport {
  name: string
  type: string
  balance: number | Decimal
  plaidAccountId: string | null
  isActive: boolean
  updatedAt: Date
}

export function generateAccountCSV(accounts: AccountExport[]): string {
  const headers = ['Name', 'Type', 'Balance', 'Connected', 'Status', 'Last Updated']
  const headerRow = headers.join(',')

  const dataRows = accounts.map((account) => {
    const balance = typeof account.balance === 'number'
      ? account.balance
      : Number(account.balance.toString())

    const row = [
      `"${account.name.replace(/"/g, '""')}"`,
      account.type, // 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT'
      balance.toFixed(2),
      account.plaidAccountId ? 'Plaid' : 'Manual',
      account.isActive ? 'Active' : 'Inactive',
      format(new Date(account.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')
  return '\uFEFF' + csvContent
}
```

**Key points:**
- Include connection status (Plaid vs Manual)
- Active/Inactive status
- Timestamp for last update
- Consistent currency formatting

## JSON Export Patterns

### Pattern 7: Complete Data JSON Export

**When to use:** Full backup of all user data

**Code example:**

```typescript
// src/lib/jsonExport.ts (NEW FILE)

import { format } from 'date-fns'

interface ExportData {
  user: {
    email: string
    name: string | null
    currency: string
    timezone: string
  }
  accounts: any[]
  transactions: any[]
  budgets: any[]
  goals: any[]
  categories: any[]
}

export function generateCompleteDataJSON(data: ExportData): string {
  // Convert Prisma Decimal to number for JSON serialization
  const sanitizeDecimals = (obj: any): any => {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'object' && 'toNumber' in obj) {
      return obj.toNumber()
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDecimals)
    }
    if (typeof obj === 'object') {
      const result: any = {}
      for (const key in obj) {
        result[key] = sanitizeDecimals(obj[key])
      }
      return result
    }
    return obj
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    user: {
      email: data.user.email,
      name: data.user.name,
      currency: data.user.currency,
      timezone: data.user.timezone,
    },
    accounts: sanitizeDecimals(data.accounts),
    transactions: sanitizeDecimals(data.transactions),
    budgets: sanitizeDecimals(data.budgets),
    goals: sanitizeDecimals(data.goals),
    categories: sanitizeDecimals(data.categories),
  }

  return JSON.stringify(exportData, null, 2) // Pretty print
}

export function downloadJSON(jsonContent: string, filename: string): void {
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;'
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url) // Cleanup
}
```

**Key points:**
- Recursively convert Prisma Decimal to number
- Include export metadata (timestamp, version)
- Exclude sensitive data (passwordHash, supabaseAuthId)
- Pretty print with 2-space indent
- Proper blob cleanup with revokeObjectURL

## tRPC Router Patterns

### Pattern 8: Update Profile Endpoint

**When to use:** Saving profile changes (name, currency, timezone)

**Code example:**

```typescript
// src/server/api/routers/users.router.ts (MODIFY EXISTING FILE)

import { z } from 'zod'
import { router, protectedProcedure } from '@/server/api/trpc'

export const usersRouter = router({
  // ... existing endpoints (me, completeOnboarding, etc.) ...

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100).optional(),
        currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.timezone !== undefined && { timezone: input.timezone }),
        },
      })

      return updatedUser
    }),

  exportAllData: protectedProcedure
    .query(async ({ ctx }) => {
      const [accounts, transactions, budgets, goals, categories] = await Promise.all([
        ctx.prisma.account.findMany({
          where: { userId: ctx.user.id },
          orderBy: { name: 'asc' },
        }),
        ctx.prisma.transaction.findMany({
          where: { userId: ctx.user.id },
          include: { category: true, account: true },
          orderBy: { date: 'desc' },
          take: 10000, // Hard limit
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
          orderBy: { name: 'asc' },
        }),
      ])

      const exportData = {
        user: {
          email: ctx.user.email,
          name: ctx.user.name,
          currency: ctx.user.currency,
          timezone: ctx.user.timezone,
        },
        accounts,
        transactions,
        budgets,
        goals,
        categories,
      }

      const json = generateCompleteDataJSON(exportData)
      const filename = `wealth-data-${format(new Date(), 'yyyy-MM-dd')}.json`

      return { json, filename }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id
      const supabaseAuthId = ctx.user.supabaseAuthId

      // 1. Delete from Prisma (cascade handles all relationships)
      await ctx.prisma.user.delete({
        where: { id: userId },
      })

      // 2. Delete from Supabase Auth (admin API)
      if (supabaseAuthId) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )

        const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseAuthId)

        if (error) {
          console.error('Supabase auth deletion failed:', error)
          // Don't throw - user data already deleted from Prisma
        }
      }

      return { success: true }
    }),
})
```

**Key points:**
- Optional fields use conditional spread (`input.name !== undefined`)
- Hard limit of 10k rows on exports
- Promise.all for parallel queries (faster)
- Delete Prisma first, then Supabase (safe failure mode)
- Log Supabase errors but don't throw (data already deleted)

## Form Patterns

### Pattern 9: Profile Form Component

**When to use:** Account settings page - profile section

**Code example:**

```tsx
// src/components/settings/ProfileSection.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']),
  timezone: z.string(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const COMMON_CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'JPY', label: 'JPY (¥)' },
]

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

export function ProfileSection() {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const { data: user } = trpc.users.me.useQuery()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      currency: user?.currency || 'USD',
      timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      })
      utils.users.me.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Update your personal information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email is managed by your authentication provider
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            onValueChange={(value) => setValue('currency', value as any)}
            defaultValue={user?.currency}
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_CURRENCIES.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency && (
            <p className="text-sm text-destructive">{errors.currency.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This is a display preference only. Existing amounts are not converted.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            onValueChange={(value) => setValue('timezone', value)}
            defaultValue={user?.timezone}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timezone && (
            <p className="text-sm text-destructive">{errors.timezone.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isDirty || updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
```

**Key points:**
- Email field disabled (read-only, managed by Supabase)
- Currency disclaimer (display only, no conversion)
- Auto-detect timezone as default
- Button disabled until form is dirty
- Toast notifications for success/error
- Invalidate cache on success (re-fetch user data)

### Pattern 10: Account Deletion Component

**When to use:** Danger zone in account settings

**Code example:**

```tsx
// src/components/settings/DangerZone.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'

export function DangerZone() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const { data: user } = trpc.users.me.useQuery()

  const deleteAccount = trpc.users.deleteAccount.useMutation({
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently deleted.',
      })
      // Redirect to sign-in page after a brief delay
      setTimeout(() => {
        router.push('/signin')
      }, 1500)
    },
    onError: (error) => {
      toast({
        title: 'Deletion failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleDelete = () => {
    deleteAccount.mutate()
  }

  const handleCancel = () => {
    setShowDeleteModal(false)
    setConfirmEmail('')
    setUnderstood(false)
  }

  const canDelete = confirmEmail === user?.email && understood

  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Once you delete your account, there is no going back. All your data will be
            permanently deleted, including:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
            <li>All transactions and account balances</li>
            <li>All budgets and financial goals</li>
            <li>All categories and settings</li>
            <li>Your profile and preferences</li>
          </ul>
          <p className="text-sm font-semibold text-destructive mt-4">
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Button
          variant="destructive"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </Button>
      </div>

      <AlertDialog open={showDeleteModal} onOpenChange={handleCancel}>
        <AlertDialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium mb-2">
                All of the following will be permanently deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All your transactions</li>
                <li>All your budgets and goals</li>
                <li>All your accounts and connections</li>
                <li>Your profile and preferences</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-email" className="text-sm font-medium">
                Type your email to confirm: <span className="font-semibold">{user?.email}</span>
              </Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder="your@email.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <Label
                htmlFor="understand"
                className="text-sm font-normal leading-tight cursor-pointer"
              >
                I understand that this action is permanent and cannot be undone
              </Label>
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={handleCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Key points:**
- Red/coral danger styling throughout
- Email confirmation prevents typos
- Checkbox forces user to read warning
- Button disabled until both confirmations met
- Clear data loss preview (bullet list)
- Redirect to sign-in after 1.5s delay
- Reset modal state on cancel

## Page Layout Patterns

### Pattern 11: Account Settings Page

**When to use:** Main settings page integrating all sections

**Code example:**

```tsx
// src/app/(dashboard)/settings/account/page.tsx
import { Separator } from '@/components/ui/separator'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher'
import { DangerZone } from '@/components/settings/DangerZone'

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-3xl font-serif font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile, preferences, and account security
        </p>
      </div>

      <Separator />

      <ProfileSection />

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Customize how Wealth looks on your device
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">
              Select your preferred color scheme
            </p>
          </div>
          <ThemeSwitcher />
        </div>
      </div>

      <Separator />

      <DangerZone />
    </div>
  )
}
```

**Key points:**
- Consistent spacing with `space-y-6`
- Separators between major sections
- Font styles match app (serif for headings)
- Bottom padding for scroll clearance
- Server Component (no 'use client' needed)

## Import Order Convention

**Standard order for all files:**

```typescript
// 1. React/Next imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'

// 3. UI components (alphabetical)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

// 4. Custom components
import { ProfileSection } from '@/components/settings/ProfileSection'
import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher'

// 5. Utilities and lib
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// 6. Types (if separate file)
import type { ExportFormat } from '@/types/export'
```

## Code Quality Standards

**TypeScript:**
- No `any` types (use `unknown` or proper types)
- All user inputs validated with Zod
- tRPC infers types automatically (use them)

**Error Handling:**
- All mutations have onSuccess + onError
- Toast notifications for user feedback
- Log errors to console (server-side)
- Graceful degradation (don't throw on non-critical errors)

**Performance:**
- Lazy load heavy components (React.lazy if needed)
- Debounce expensive operations
- Cache tRPC queries (automatic)
- Cleanup resources (URL.revokeObjectURL)

**Accessibility:**
- All form inputs have labels
- Buttons have descriptive text or sr-only
- Keyboard navigation works (Radix handles this)
- Color contrast ≥4.5:1 (WCAG AA)

**Security:**
- All endpoints use protectedProcedure
- All queries filtered by ctx.user.id
- Service role key server-side only
- Input validation on every endpoint
- Escape user content in CSV (quote escaping)
