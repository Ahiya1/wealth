# Code Patterns & Conventions

## File Structure
```
wealth/
├── src/
│   ├── app/                  # Next.js 14 App Router
│   │   ├── (auth)/          # Auth pages (signin, signup, reset)
│   │   ├── (dashboard)/     # Protected routes (dashboard, accounts, transactions)
│   │   ├── api/             # API routes (trpc, cron, webhooks)
│   │   └── auth/            # Supabase auth callback
│   ├── components/          # React components
│   │   ├── accounts/        # Account-related components
│   │   ├── transactions/    # Transaction components
│   │   ├── budgets/         # Budget components
│   │   ├── goals/           # Goal components
│   │   ├── analytics/       # Chart components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── recurring/       # Recurring transaction components
│   │   ├── categories/      # Category management
│   │   ├── settings/        # Settings components
│   │   └── ui/              # Reusable UI primitives (Radix)
│   ├── lib/                 # Utilities & helpers
│   │   ├── constants.ts     # App-wide constants (CURRENCY_CODE, etc.)
│   │   ├── utils.ts         # Utility functions (formatCurrency, cn, etc.)
│   │   ├── csvExport.ts     # CSV export utilities
│   │   ├── jsonExport.ts    # JSON export utilities
│   │   ├── encryption.ts    # Plaid token encryption
│   │   ├── supabase/        # Supabase client setup
│   │   └── trpc/            # tRPC client setup
│   ├── server/              # Backend logic
│   │   ├── api/             # tRPC routers
│   │   │   ├── root.ts      # Root router (aggregates sub-routers)
│   │   │   └── routers/     # Feature routers (accounts, transactions, etc.)
│   │   └── services/        # Business logic services
│   └── types/               # TypeScript type definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── supabase/
│   └── config.toml          # Supabase local config
├── scripts/                 # Utility scripts
├── middleware.ts            # Supabase auth middleware
├── next.config.js           # Next.js configuration
├── vercel.json              # Vercel deployment config
├── .env.example             # Environment variable template
└── package.json             # Dependencies
```

## Naming Conventions
- Components: PascalCase (`AccountCard.tsx`, `TransactionForm.tsx`)
- Files: camelCase (`formatCurrency.ts`, `csvExport.ts`)
- Types: PascalCase (`Transaction`, `Account`, `User`)
- Functions: camelCase (`formatCurrency()`, `generateCSV()`)
- Constants: SCREAMING_SNAKE_CASE (`CURRENCY_CODE`, `MAX_RETRIES`)
- tRPC Procedures: camelCase (`getAll`, `create`, `update`, `delete`)
- Database Tables: PascalCase (Prisma convention: `User`, `Transaction`, `Account`)

## Currency Formatting Pattern

### Centralized Currency Utility
**When to use:** Every time you display a monetary amount

**Pattern:**
```typescript
// src/lib/utils.ts
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ₪`
}
// Output: "1,234.56 ₪"
```

**Component usage:**
```typescript
import { formatCurrency } from '@/lib/utils'

export function TransactionCard({ transaction }: Props) {
  const absAmount = Math.abs(Number(transaction.amount))

  return (
    <div className="p-4">
      <span className="font-semibold">
        {formatCurrency(absAmount)}
      </span>
    </div>
  )
}
```

**Key points:**
- ALWAYS use formatCurrency() - never hardcode ₪ symbol
- Convert Prisma Decimal to number: `Number(transaction.amount)`
- Use Math.abs() for absolute values (if showing magnitude only)
- Symbol appears AFTER amount (Israeli convention): "1,234.56 ₪"

### Currency Constants
**When to use:** Need currency code, symbol, or name (rare - use formatCurrency() instead)

**Pattern:**
```typescript
// src/lib/constants.ts
export const CURRENCY_CODE = 'NIS' as const
export const CURRENCY_SYMBOL = '₪' as const
export const CURRENCY_NAME = 'Israeli Shekel' as const
```

**Usage example:**
```typescript
import { CURRENCY_CODE, CURRENCY_NAME } from '@/lib/constants'

export function CurrencyDisplay() {
  return (
    <div>
      <p>Currency: {CURRENCY_NAME}</p>
      <p>Code: {CURRENCY_CODE}</p>
    </div>
  )
}
```

### Chart Currency Formatting
**When to use:** Recharts tooltips and axis labels

**Pattern:**
```typescript
import { formatCurrency } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Tooltip formatter
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null
  const entry = payload[0]!

  return (
    <div className="bg-white p-3 rounded shadow-lg">
      <p className="text-sm text-gray-600">{entry.name}</p>
      <p className="text-lg font-bold text-sage-600 tabular-nums">
        {formatCurrency(Number(entry.value))}
      </p>
    </div>
  )
}

// YAxis tick formatter
const formatYAxis = (value: number) => {
  // Abbreviated format for Y-axis
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₪`
  }
  return `${value} ₪`
}

export function NetWorthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="netWorth" stroke="#059669" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Key points:**
- Use formatCurrency() in tooltips for full formatting
- Use abbreviated format on Y-axis (space-constrained)
- Always include ₪ symbol (consistency with rest of app)
- Use tabular-nums for monospaced numbers in tooltips

## Database Patterns

### Prisma Schema Convention
```prisma
// prisma/schema.prisma

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  currency        String   @default("NIS") // Israeli Shekel only
  supabaseAuthId  String   @unique
  role            UserRole @default(USER)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  accounts        Account[]
  transactions    Transaction[]
  categories      Category[]
  budgets         Budget[]
  goals           Goal[]

  @@index([supabaseAuthId])
  @@index([email])
}

model Account {
  id               String      @id @default(cuid())
  name             String
  type             AccountType @default(CHECKING)
  balance          Decimal     @default(0) @db.Decimal(15, 2)
  currency         String      @default("NIS") // Always NIS
  isManual         Boolean     @default(true)
  plaidItemId      String?     @unique
  plaidAccessToken String?     // Encrypted with AES-256-GCM
  userId           String
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  // Relations
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions     Transaction[]

  @@index([userId])
  @@index([plaidItemId])
}

model Transaction {
  id          String            @id @default(cuid())
  amount      Decimal           @db.Decimal(15, 2)
  type        TransactionType   // INCOME or EXPENSE
  description String?
  date        DateTime
  categoryId  String?
  accountId   String
  userId      String
  tags        String[]          // Array of tags
  notes       String?           @db.Text
  isRecurring Boolean           @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relations
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
}
```

**Key conventions:**
- Use Decimal for monetary amounts (not Float - prevents precision errors)
- Decimal precision: 15 total digits, 2 decimal places (@db.Decimal(15, 2))
- Default currency: "NIS" (multi-currency not supported)
- Use cuid() for IDs (collision-resistant, URL-safe)
- Always add createdAt/updatedAt timestamps
- Use Cascade delete for user-owned data
- Index foreign keys and frequently queried fields

### Query Pattern
```typescript
// src/server/api/routers/transactions.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const transactionsRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      accountId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, accountId } = input
      const skip = (page - 1) * limit

      const where = {
        userId: ctx.user.id,
        ...(accountId && { accountId }),
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            category: true,
            account: true,
          },
        }),
        ctx.prisma.transaction.count({ where }),
      ])

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  create: protectedProcedure
    .input(z.object({
      amount: z.number(),
      type: z.enum(['INCOME', 'EXPENSE']),
      description: z.string().optional(),
      date: z.date(),
      categoryId: z.string().optional(),
      accountId: z.string(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, userId: ctx.user.id },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      // Create transaction
      const transaction = await ctx.prisma.transaction.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
        include: {
          category: true,
          account: true,
        },
      })

      // Update account balance
      const balanceChange = input.type === 'INCOME' ? input.amount : -input.amount
      await ctx.prisma.account.update({
        where: { id: input.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      })

      return transaction
    }),
})
```

**Key points:**
- Use protectedProcedure for authenticated endpoints
- Use Zod for input validation
- Always filter by userId (enforce data isolation)
- Use include to load relations (avoid N+1 queries)
- Use transactions for multi-step operations (account balance updates)
- Return paginated results for large datasets

## Frontend Patterns

### Client Component Structure
```typescript
'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { TransactionCard } from './TransactionCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface TransactionListProps {
  accountId?: string
}

export function TransactionList({ accountId }: TransactionListProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = trpc.transactions.getAll.useQuery({
    page,
    limit: 50,
    accountId,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600">
        Error loading transactions: {error.message}
      </div>
    )
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No transactions yet. Create your first transaction!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {data.transactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>

      {data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Key points:**
- Mark client components with 'use client'
- Use tRPC hooks (useQuery, useMutation) for data fetching
- Handle loading, error, and empty states explicitly
- Use Skeleton components for loading placeholders
- Pagination for large datasets
- Extract reusable components (TransactionCard)

### Form Handling
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  date: z.date(),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, 'Account is required'),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export function TransactionForm({ accountId }: Props) {
  const utils = trpc.useContext()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId,
      type: 'EXPENSE',
      date: new Date(),
    },
  })

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Transaction created successfully' })
      utils.transactions.getAll.invalidate()
      reset()
    },
    onError: (error) => {
      toast({
        title: 'Error creating transaction',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: TransactionFormData) => {
    createTransaction.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="amount">Amount (₪)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="e.g., 150.00"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-red-600">{errors.amount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          {...register('type')}
          className="w-full border rounded px-3 py-2"
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
      </div>

      <Button type="submit" disabled={createTransaction.isLoading}>
        {createTransaction.isLoading ? 'Creating...' : 'Create Transaction'}
      </Button>
    </form>
  )
}
```

**Key points:**
- Use react-hook-form for form state management
- Use Zod for validation (same schema as backend)
- Use zodResolver to integrate Zod with react-hook-form
- Show loading state during mutation
- Invalidate queries after successful mutation (cache refresh)
- Show toast notifications for success/error
- Reset form after successful submission

### API Client Usage
```typescript
'use client'

import { trpc } from '@/lib/trpc/client'

// Query (read operation)
const { data, isLoading, error, refetch } = trpc.accounts.getAll.useQuery()

// Mutation (write operation)
const createAccount = trpc.accounts.create.useMutation({
  onSuccess: (newAccount) => {
    console.log('Account created:', newAccount.id)
    // Invalidate and refetch queries
    trpc.useContext().accounts.getAll.invalidate()
  },
  onError: (error) => {
    console.error('Error creating account:', error.message)
  },
})

// Trigger mutation
createAccount.mutate({
  name: 'Checking Account',
  type: 'CHECKING',
  balance: 1000,
})

// Optimistic updates
const updateAccount = trpc.accounts.update.useMutation({
  onMutate: async (updatedAccount) => {
    // Cancel outgoing queries
    await trpc.useContext().accounts.getAll.cancel()

    // Get current data
    const prevData = trpc.useContext().accounts.getAll.getData()

    // Optimistically update cache
    trpc.useContext().accounts.getAll.setData(undefined, (old) =>
      old?.map((acc) => acc.id === updatedAccount.id ? { ...acc, ...updatedAccount } : acc)
    )

    // Return context for rollback
    return { prevData }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.prevData) {
      trpc.useContext().accounts.getAll.setData(undefined, context.prevData)
    }
  },
  onSettled: () => {
    // Refetch after mutation
    trpc.useContext().accounts.getAll.invalidate()
  },
})
```

## Testing Patterns

### Unit Test Example
```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../utils'

describe('formatCurrency', () => {
  it('formats positive amounts with NIS symbol after amount', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56 ₪')
    expect(formatCurrency(100)).toBe('100.00 ₪')
    expect(formatCurrency(0)).toBe('0.00 ₪')
  })

  it('formats negative amounts with minus sign', () => {
    expect(formatCurrency(-500.99)).toBe('-500.99 ₪')
  })

  it('includes ₪ symbol (Unicode U+20AA)', () => {
    const result = formatCurrency(100)
    expect(result).toContain('₪')
    expect(result).not.toContain('$')
    expect(result).not.toContain('USD')
  })

  it('uses thousands separator', () => {
    expect(formatCurrency(1234567.89)).toBe('1,234,567.89 ₪')
  })

  it('always uses 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('100.00 ₪')
    expect(formatCurrency(100.5)).toBe('100.50 ₪')
  })
})
```

### Integration Test Example
```typescript
// src/server/api/routers/__tests__/accounts.router.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { accountsRouter } from '../accounts.router'

describe('accountsRouter', () => {
  const mockPrisma = mockDeep<PrismaClient>()

  const mockContext = {
    prisma: mockPrisma,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      currency: 'NIS',
    },
    supabaseUser: { id: 'auth-123' },
  }

  beforeEach(() => {
    mockPrisma.$reset()
  })

  it('getAll returns user accounts only', async () => {
    const mockAccounts = [
      { id: 'acc-1', name: 'Checking', balance: 1000, userId: 'user-123' },
      { id: 'acc-2', name: 'Savings', balance: 5000, userId: 'user-123' },
    ]

    mockPrisma.account.findMany.mockResolvedValue(mockAccounts)

    const caller = accountsRouter.createCaller(mockContext)
    const result = await caller.getAll()

    expect(result).toEqual(mockAccounts)
    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('create enforces userId from context', async () => {
    const input = {
      name: 'New Account',
      type: 'CHECKING' as const,
      balance: 500,
    }

    const mockAccount = { id: 'acc-3', ...input, userId: 'user-123' }
    mockPrisma.account.create.mockResolvedValue(mockAccount)

    const caller = accountsRouter.createCaller(mockContext)
    const result = await caller.create(input)

    expect(result.userId).toBe('user-123')
    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: { ...input, userId: 'user-123' },
    })
  })
})
```

## Error Handling

### API Errors
```typescript
import { TRPCError } from '@trpc/server'

// Throw typed errors in tRPC procedures
export const accountsRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Enforce data isolation
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found or access denied',
        })
      }

      return account
    }),
})
```

### User-Facing Errors
```typescript
'use client'

import { toast } from '@/components/ui/use-toast'

// Show user-friendly error messages
const deleteAccount = trpc.accounts.delete.useMutation({
  onError: (error) => {
    let message = 'Failed to delete account'

    if (error.data?.code === 'NOT_FOUND') {
      message = 'Account not found'
    } else if (error.data?.code === 'FORBIDDEN') {
      message = 'You do not have permission to delete this account'
    } else if (error.message) {
      message = error.message
    }

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    })
  },
})
```

## Integration Patterns

### Supabase Auth Integration
```typescript
// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server component can't set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Server component can't remove cookies
          }
        },
      },
    }
  )
}
```

### tRPC Context with Auth
```typescript
// src/server/api/trpc.ts
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function createTRPCContext(opts: { headers: Headers }) {
  const supabase = createServerClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  let user = null
  if (supabaseUser) {
    // Auto-create Prisma user if doesn't exist
    user = await prisma.user.upsert({
      where: { supabaseAuthId: supabaseUser.id },
      update: {},
      create: {
        supabaseAuthId: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name,
        currency: 'NIS',
      },
    })
  }

  return {
    prisma,
    supabaseUser,
    user,
  }
}
```

## Utility Patterns

### Date Formatting
```typescript
import { format, parseISO } from 'date-fns'

// Format date for display
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'MMM d, yyyy')
}

// Format date for input
export function formatDateInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM-dd')
}
```

### CSV Export
```typescript
// src/lib/csvExport.ts
import type { Transaction } from '@prisma/client'

export function generateTransactionCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Description', 'Amount (₪)', 'Type', 'Category', 'Account']
  const rows = transactions.map(txn => [
    formatDate(txn.date),
    txn.description || '',
    Number(txn.amount).toFixed(2),
    txn.type,
    txn.category?.name || 'Uncategorized',
    txn.account?.name || '',
  ])

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

## Import Order Convention
```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 3. Internal utilities
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { CURRENCY_SYMBOL } from '@/lib/constants'

// 4. Components
import { Button } from '@/components/ui/button'
import { TransactionCard } from '@/components/transactions/TransactionCard'

// 5. Types
import type { Transaction } from '@prisma/client'
```

## Code Quality Standards
- **TypeScript strict mode:** All code must pass TypeScript strict checks
- **ESLint rules:** Follow Next.js recommended ESLint configuration
- **No console.log in production:** Use proper logging or remove before merge
- **Error handling:** All async operations must have try-catch or .catch()
- **Loading states:** All data fetching must show loading UI
- **Empty states:** All lists must handle empty case with friendly message
- **Accessibility:** Use semantic HTML, ARIA labels, keyboard navigation

## Performance Patterns
- **Lazy loading:** Use dynamic imports for heavy components
- **Memoization:** Use React.memo for expensive re-renders
- **Debouncing:** Debounce search inputs and API calls
- **Pagination:** Paginate large datasets (50-100 items per page)
- **Indexing:** Index all foreign keys and frequently queried fields

## Security Patterns
- **Input validation:** Validate all user input with Zod schemas
- **Data isolation:** Always filter by userId in queries
- **Environment variables:** Never expose server-only env vars to client
- **SQL injection:** Use Prisma parameterized queries (automatic)
- **XSS protection:** React escapes strings by default (don't use dangerouslySetInnerHTML)
