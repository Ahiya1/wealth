# Code Patterns & Conventions

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── (auth)/                     # Route group for unauthenticated pages
│   │   │   ├── layout.tsx              # Auth layout (minimal)
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/                # Route group for authenticated pages
│   │   │   ├── layout.tsx              # Dashboard layout (sidebar + main)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── goals/
│   │   │   ├── analytics/
│   │   │   ├── settings/               # Settings section
│   │   │   │   ├── page.tsx            # Settings overview
│   │   │   │   ├── categories/page.tsx
│   │   │   │   ├── currency/page.tsx   # NEW (placeholder)
│   │   │   │   ├── appearance/page.tsx # NEW
│   │   │   │   └── data/page.tsx       # NEW
│   │   │   ├── account/                # NEW: Account section
│   │   │   │   ├── page.tsx            # Account overview
│   │   │   │   ├── profile/page.tsx    # NEW
│   │   │   │   ├── membership/page.tsx # NEW
│   │   │   │   ├── security/page.tsx   # NEW
│   │   │   │   └── preferences/page.tsx # NEW
│   │   │   └── admin/                  # NEW: Admin section
│   │   │       ├── page.tsx            # Admin dashboard
│   │   │       └── users/page.tsx      # User list
│   │   ├── api/
│   │   │   └── trpc/[trpc]/route.ts    # tRPC API route
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing page
│   │   └── providers.tsx               # tRPC/theme providers
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── DashboardSidebar.tsx    # Main navigation
│   │   ├── settings/
│   │   │   ├── ProfileSection.tsx      # Move to account/profile
│   │   │   ├── ThemeSwitcher.tsx       # Move to settings/appearance
│   │   │   └── DangerZone.tsx          # Move to account/security
│   │   ├── admin/                      # NEW: Admin components
│   │   │   ├── SystemMetrics.tsx
│   │   │   └── UserListTable.tsx
│   │   └── ui/                         # shadcn/ui components
│   │       ├── dropdown-menu.tsx       # Existing (use for avatar)
│   │       ├── breadcrumb.tsx          # NEW
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── ...
│   ├── server/
│   │   └── api/
│   │       ├── trpc.ts                 # Context & procedures
│   │       ├── root.ts                 # Router registration
│   │       └── routers/
│   │           ├── users.router.ts     # UPDATE (add role/tier)
│   │           ├── admin.router.ts     # NEW
│   │           ├── analytics.router.ts
│   │           └── ...
│   ├── lib/
│   │   ├── trpc.ts                     # Client tRPC setup
│   │   └── prisma.ts                   # Prisma client instance
│   └── types/
│       └── index.ts                    # Shared types
├── prisma/
│   ├── schema.prisma                   # UPDATE (add enums, user fields)
│   └── migrations/                     # NEW (first migration)
├── middleware.ts                       # UPDATE (admin protection)
└── ...
```

## Naming Conventions

**Files & Directories:**
- **Components:** PascalCase (`DashboardSidebar.tsx`, `UserListTable.tsx`)
- **Pages (App Router):** lowercase (`page.tsx`, `layout.tsx`)
- **Utilities:** camelCase (`formatCurrency.ts`, `dateHelpers.ts`)
- **Routers:** kebab-case with `.router.ts` (`admin.router.ts`, `users.router.ts`)
- **Types:** PascalCase in `types/` directory (`User.ts`, `Transaction.ts`)

**Variables & Functions:**
- **Functions:** camelCase (`calculateTotal()`, `formatDate()`, `getUserRole()`)
- **Components:** PascalCase (`UserAvatar`, `SystemMetrics`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_PAGE_SIZE`, `DEFAULT_CURRENCY`)
- **React Hooks:** camelCase with `use` prefix (`useUserData()`, `useAdminMetrics()`)
- **tRPC Procedures:** camelCase (`systemMetrics`, `userList`, `updateProfile`)

**Types & Interfaces:**
- **Types:** PascalCase (`UserRole`, `SubscriptionTier`, `SystemMetrics`)
- **Enums:** PascalCase values (`UserRole.ADMIN`, `SubscriptionTier.PREMIUM`)
- **Props:** Component name + `Props` (`DashboardSidebarProps`, `UserListTableProps`)

## Database Patterns

### Prisma Schema Convention

```prisma
// schema.prisma

// Enums at top of file (after generator/datasource)
enum UserRole {
  USER
  ADMIN
}

enum SubscriptionTier {
  FREE
  PREMIUM
}

// Models in logical order (core entities first)
model User {
  // Primary key first
  id                     String              @id @default(cuid())

  // Authentication fields
  supabaseAuthId         String?             @unique
  email                  String              @unique
  passwordHash           String?             // Legacy (unused)

  // Profile fields
  name                   String?
  image                  String?
  currency               String              @default("USD")
  timezone               String              @default("America/New_York")

  // Role & subscription fields (NEW)
  role                   UserRole            @default(USER)
  subscriptionTier       SubscriptionTier    @default(FREE)
  subscriptionStartedAt  DateTime?
  subscriptionExpiresAt  DateTime?

  // Onboarding tracking
  onboardingCompletedAt  DateTime?
  onboardingSkipped      Boolean             @default(false)
  isDemoUser             Boolean             @default(false)

  // Timestamps
  createdAt              DateTime            @default(now())
  updatedAt              DateTime            @updatedAt

  // Relations (at end)
  categories             Category[]
  accounts               Account[]
  transactions           Transaction[]
  budgets                Budget[]
  goals                  Goal[]

  // Indexes (at very end)
  @@index([role])
  @@index([subscriptionTier])
  @@index([createdAt])
}
```

**Conventions:**
- Enums before models
- Primary key first in model
- Logical grouping of fields with comments
- Relations after scalar fields
- Indexes after relations
- Timestamps (createdAt, updatedAt) before relations

### Query Patterns

**Basic Query (Single Record):**
```typescript
// Fetch user with specific fields
const user = await ctx.prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    subscriptionTier: true,
  },
})
```

**Query with Relations:**
```typescript
// Fetch user with transaction count
const user = await ctx.prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    _count: {
      select: { transactions: true }
    },
  },
})
```

**Aggregation Query (Count):**
```typescript
// Count users by role
const adminCount = await ctx.prisma.user.count({
  where: { role: 'ADMIN' }
})

const totalUsers = await ctx.prisma.user.count()
```

**Filtered Query with Pagination:**
```typescript
// Paginated user list with cursor
const users = await ctx.prisma.user.findMany({
  where: {
    OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ],
    role: input.role, // Optional filter
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    subscriptionTier: true,
    createdAt: true,
  },
  orderBy: { createdAt: 'desc' },
  take: input.limit + 1, // Fetch one extra for pagination
  cursor: input.cursor ? { id: input.cursor } : undefined,
  skip: input.cursor ? 1 : 0,
})

// Extract next cursor
let nextCursor: string | undefined = undefined
if (users.length > input.limit) {
  const nextItem = users.pop()
  nextCursor = nextItem!.id
}
```

**Parallel Queries (Performance):**
```typescript
// Execute multiple counts in parallel
const [totalUsers, totalTransactions, adminCount, premiumCount] = await Promise.all([
  ctx.prisma.user.count(),
  ctx.prisma.transaction.count(),
  ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
  ctx.prisma.user.count({ where: { subscriptionTier: 'PREMIUM' } }),
])
```

**Date-Based Filtering:**
```typescript
// Active users (transactions in last 30 days)
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const activeUsers = await ctx.prisma.user.count({
  where: {
    transactions: {
      some: {
        date: { gte: thirtyDaysAgo }
      }
    }
  }
})
```

## tRPC Patterns

### Admin Procedure Pattern

**Create adminProcedure in server/api/trpc.ts:**
```typescript
import { TRPCError, initTRPC } from '@trpc/server'
import { type Context } from './context'
import superjson from 'superjson'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

// Existing procedures
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  return next({
    ctx: {
      user: ctx.user,
      supabaseUser: ctx.supabaseUser!,
      prisma: ctx.prisma,
    },
  })
})

// NEW: Admin-only procedure
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  // Fetch fresh role (don't trust stale context)
  const userWithRole = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true, email: true, role: true, subscriptionTier: true }
  })

  if (!userWithRole || userWithRole.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next({
    ctx: {
      user: userWithRole,
      prisma: ctx.prisma,
    },
  })
})

export const router = t.router
export const middleware = t.middleware
```

**Key Points:**
- Always fetch fresh role from database (don't trust context)
- Use FORBIDDEN code for authorization (UNAUTHORIZED for authentication)
- Return narrowed context with admin user type

### Admin Router Pattern

**Create server/api/routers/admin.router.ts:**
```typescript
import { z } from 'zod'
import { router, adminProcedure } from '../trpc'

export const adminRouter = router({
  // System-wide metrics (no input)
  systemMetrics: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Parallel queries for performance
    const [
      totalUsers,
      totalTransactions,
      totalAccounts,
      activeUsers30d,
      activeUsers90d,
      adminCount,
      premiumCount,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.transaction.count(),
      ctx.prisma.account.count(),
      ctx.prisma.user.count({
        where: {
          transactions: {
            some: { date: { gte: thirtyDaysAgo } }
          }
        }
      }),
      ctx.prisma.user.count({
        where: {
          transactions: {
            some: { date: { gte: ninetyDaysAgo } }
          }
        }
      }),
      ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
      ctx.prisma.user.count({ where: { subscriptionTier: 'PREMIUM' } }),
    ])

    return {
      totalUsers,
      totalTransactions,
      totalAccounts,
      activeUsers30d,
      activeUsers90d,
      adminCount,
      premiumCount,
      freeCount: totalUsers - premiumCount,
    }
  }),

  // User list with search/filter/pagination
  userList: adminProcedure
    .input(
      z.object({
        search: z.string().max(100).optional(),
        role: z.enum(['USER', 'ADMIN']).optional(),
        tier: z.enum(['FREE', 'PREMIUM']).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          ...(input.search && {
            OR: [
              { email: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
          ...(input.role && { role: input.role }),
          ...(input.tier && { subscriptionTier: input.tier }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          createdAt: true,
          _count: {
            select: { transactions: true }
          },
          transactions: {
            select: { date: true },
            orderBy: { date: 'desc' },
            take: 1,
          }
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined = undefined
      if (users.length > input.limit) {
        const nextItem = users.pop()
        nextCursor = nextItem!.id
      }

      return {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          createdAt: user.createdAt,
          transactionCount: user._count.transactions,
          lastActivityAt: user.transactions[0]?.date || null,
        })),
        nextCursor,
      }
    }),
})
```

**Key Points:**
- Use `adminProcedure` for all admin routes
- Validate inputs with Zod schemas
- Use parallel queries (`Promise.all`) for performance
- Implement cursor-based pagination for large datasets
- Return clean, mapped data (not raw Prisma objects)

### Update Existing Router

**Update server/api/routers/users.router.ts:**
```typescript
// In users.router.ts, update the 'me' query

me: publicProcedure.query(async ({ ctx }) => {
  if (!ctx.user) return null

  return await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      currency: true,
      timezone: true,
      isDemoUser: true,
      onboardingCompletedAt: true,
      onboardingSkipped: true,
      createdAt: true,
      // ADD THESE TWO LINES:
      role: true,
      subscriptionTier: true,
    },
  })
})
```

**Key Points:**
- Only add fields to select clause
- No other changes needed
- Types auto-update via Prisma Client

### Register Router

**Update server/api/root.ts:**
```typescript
import { router } from './trpc'
import { categoriesRouter } from './routers/categories.router'
import { accountsRouter } from './routers/accounts.router'
import { plaidRouter } from './routers/plaid.router'
import { transactionsRouter } from './routers/transactions.router'
import { budgetsRouter } from './routers/budgets.router'
import { analyticsRouter } from './routers/analytics.router'
import { goalsRouter } from './routers/goals.router'
import { usersRouter } from './routers/users.router'
import { adminRouter } from './routers/admin.router' // NEW

export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
  admin: adminRouter, // NEW
})

export type AppRouter = typeof appRouter
```

## Middleware Patterns

### Admin Route Protection

**Update middleware.ts (root level):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Existing protection for authenticated routes
  const protectedPaths = ['/dashboard', '/accounts', '/transactions', '/budgets', '/goals', '/analytics', '/settings', '/account'] // Added /account
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // NEW: Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Fetch Prisma user to check role
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseAuthId: user.id },
      select: { role: true }
    })

    if (!prismaUser || prismaUser.role !== 'ADMIN') {
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(redirectUrl)
    }

    // Log admin access (optional, for monitoring)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Admin Access]', { userId: prismaUser.id, path: request.nextUrl.pathname })
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Key Points:**
- Check authentication FIRST (Supabase user)
- Then check authorization (Prisma user role)
- Use lean query (select only `role` field)
- Clear error messages without revealing system details
- Add `/account` to protected paths list

## Frontend Patterns

### Page Structure (App Router)

**Admin Dashboard Page (src/app/(dashboard)/admin/page.tsx):**
```typescript
import { Metadata } from 'next'
import { trpc } from '@/lib/trpc'
import { SystemMetrics } from '@/components/admin/SystemMetrics'
import { PageTransition } from '@/components/PageTransition'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Wealth',
  description: 'System-wide metrics and administration',
}

export default function AdminDashboardPage() {
  return (
    <PageTransition>
      <div className="p-8">
        <Breadcrumb pathname="/admin" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif">Admin Dashboard</h1>
          <p className="text-muted-foreground">System-wide metrics and user management</p>
        </div>

        <SystemMetrics />
      </div>
    </PageTransition>
  )
}
```

**Key Points:**
- Use `PageTransition` wrapper for consistent animations
- Include `Breadcrumb` component at top
- Clear heading hierarchy (h1 for page title)
- Descriptive metadata for SEO

### Component Patterns

**System Metrics Component (src/components/admin/SystemMetrics.tsx):**
```typescript
'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Receipt, Wallet, TrendingUp } from 'lucide-react'

export function SystemMetrics() {
  const { data: metrics, isLoading, error } = trpc.admin.systemMetrics.useQuery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load metrics: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      description: `${metrics.adminCount} admin${metrics.adminCount !== 1 ? 's' : ''}`,
    },
    {
      title: 'Total Transactions',
      value: metrics.totalTransactions.toLocaleString(),
      icon: Receipt,
      description: 'All time',
    },
    {
      title: 'Total Accounts',
      value: metrics.totalAccounts.toLocaleString(),
      icon: Wallet,
      description: 'Connected accounts',
    },
    {
      title: 'Active Users (30d)',
      value: metrics.activeUsers30d.toLocaleString(),
      icon: TrendingUp,
      description: `${metrics.activeUsers90d} in 90d`,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

**Key Points:**
- Use `'use client'` for components using tRPC hooks
- Handle loading state with skeleton UI
- Handle error state with clear message
- Use `toLocaleString()` for number formatting
- Responsive grid layout (1 col mobile, 4 cols desktop)

### Avatar Dropdown Pattern

**Update src/components/dashboard/DashboardSidebar.tsx:**
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  Target,
  BarChart3,
  Settings,
  Shield,
  User,
  LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trpc } from '@/lib/trpc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: userData } = trpc.users.me.useQuery()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const navigationItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Accounts', href: '/accounts', icon: Wallet },
    { title: 'Transactions', href: '/transactions', icon: Receipt },
    { title: 'Budgets', href: '/budgets', icon: PieChart },
    { title: 'Goals', href: '/goals', icon: Target },
    { title: 'Analytics', href: '/analytics', icon: BarChart3 },
    { title: 'Settings', href: '/settings', icon: Settings }, // FIXED (was /settings/categories)
  ]

  // Add admin link conditionally
  if (userData?.role === 'ADMIN') {
    navigationItems.push({
      title: 'Admin',
      href: '/admin',
      icon: Shield,
    })
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo/Brand */}
      <div className="p-6">
        <h1 className="text-2xl font-bold font-serif">Wealth</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                transition-colors
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* User Section with Avatar Dropdown */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                {userData?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm truncate">
                  {userData?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userData?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Overview
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/profile" className="cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/membership" className="cursor-pointer">
                Membership
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security" className="cursor-pointer">
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Demo badge (if applicable) */}
        {userData?.isDemoUser && (
          <div className="mt-2 text-xs text-center text-muted-foreground">
            Demo Mode
          </div>
        )}
      </div>
    </div>
  )
}
```

**Key Points:**
- Use `trpc.users.me.useQuery()` to get user data (includes role)
- Conditionally render admin link based on role
- Avatar dropdown uses Radix DropdownMenu
- Move "Sign Out" from button to dropdown
- Display user email/name in dropdown trigger
- Use `asChild` prop for Link components in dropdown items

### Breadcrumb Component

**Create src/components/ui/breadcrumb.tsx:**
```typescript
'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BreadcrumbProps {
  pathname: string
}

export function Breadcrumb({ pathname }: BreadcrumbProps) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        const isLast = index === segments.length - 1

        return (
          <div key={href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
```

**Usage in pages:**
```typescript
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function ProfilePage() {
  return (
    <div className="p-8">
      <Breadcrumb pathname="/account/profile" />
      {/* Page content */}
    </div>
  )
}
```

**Key Points:**
- Auto-generates breadcrumbs from pathname
- Capitalizes segment names
- Last segment is not clickable (current page)
- Responsive spacing with gap utilities

### Placeholder Page Pattern

**Settings Currency Placeholder (src/app/(dashboard)/settings/currency/page.tsx):**
```typescript
import { Metadata } from 'next'
import { PageTransition } from '@/components/PageTransition'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

export const metadata: Metadata = {
  title: 'Currency Settings - Wealth',
  description: 'Manage your currency preferences',
}

export default function CurrencySettingsPage() {
  // This will be implemented in Iteration 9
  const { data: userData } = trpc.users.me.useQuery()

  return (
    <PageTransition>
      <div className="p-8">
        <Breadcrumb pathname="/settings/currency" />

        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif">Currency</h1>
          <p className="text-muted-foreground">System-wide currency conversion</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Currency</CardTitle>
            <CardDescription>
              Your transactions and accounts are displayed in {userData?.currency || 'USD'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Currency conversion feature coming soon in Iteration 9
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This will allow you to convert all amounts to a new currency
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
```

**Key Points:**
- Display current value (currency from user data)
- Clear "Coming Soon" message with context
- Maintain consistent page structure (breadcrumb, heading, card)
- Set proper metadata

## Error Handling

### tRPC Error Handling (Server-Side)

```typescript
// In admin.router.ts
systemMetrics: adminProcedure.query(async ({ ctx }) => {
  try {
    const metrics = await ctx.prisma.user.count()
    return metrics
  } catch (error) {
    // Log detailed error server-side
    console.error('[Admin Metrics Error]', {
      userId: ctx.user.id,
      timestamp: new Date().toISOString(),
      error,
    })

    // Throw generic error to client
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch system metrics',
    })
  }
})
```

**Key Points:**
- Log detailed errors server-side (for debugging)
- Return generic errors to client (security)
- Use appropriate error codes (UNAUTHORIZED, FORBIDDEN, INTERNAL_SERVER_ERROR)

### Client-Side Error Handling

```typescript
'use client'

import { trpc } from '@/lib/trpc'

export function UserList() {
  const { data, isLoading, error } = trpc.admin.userList.useQuery({
    limit: 50,
  })

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <h3 className="font-semibold text-destructive">Error Loading Users</h3>
        <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ... rest of component
}
```

**Key Points:**
- Check error state from tRPC query
- Display user-friendly error message
- Provide recovery action (reload, retry)
- Use destructive color scheme for errors

### Unauthorized Access Handling (Middleware)

```typescript
// In page component
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner' // Or your toast library

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error === 'unauthorized') {
      toast.error('Access Denied', {
        description: 'You do not have permission to access that page.',
      })
    }
  }, [error])

  // ... rest of component
}
```

**Key Points:**
- Check URL search params for error message
- Display toast notification (non-blocking)
- Clear, user-friendly message

## Testing Patterns

### Manual Testing Checklist

**Admin Route Security:**
```typescript
// Test 1: Non-admin user attempts /admin access
// 1. Sign in as regular user (not ahiya.butman@gmail.com)
// 2. Navigate to /admin
// 3. Expected: Redirect to /dashboard with error message
// 4. Expected: No admin link visible in sidebar

// Test 2: Admin user accesses /admin
// 1. Sign in as admin user (ahiya.butman@gmail.com)
// 2. Navigate to /admin
// 3. Expected: Page loads successfully
// 4. Expected: System metrics display
// 5. Expected: Admin link visible in sidebar

// Test 3: Admin tRPC procedure security
// 1. Sign in as regular user
// 2. Open browser console
// 3. Attempt to call admin procedure directly:
const result = await trpc.admin.systemMetrics.query()
// Expected: Error "Admin access required" (FORBIDDEN)
```

**Navigation Testing:**
```typescript
// Test 1: Sidebar Settings link
// 1. Click "Settings" in sidebar
// 2. Expected: Navigate to /settings (overview page)
// 3. Expected: NOT /settings/categories

// Test 2: Avatar dropdown navigation
// 1. Click user avatar in sidebar
// 2. Expected: Dropdown menu opens
// 3. Click "Profile"
// 4. Expected: Navigate to /account/profile
// 5. Expected: Breadcrumbs display "Account > Profile"

// Test 3: Breadcrumb navigation
// 1. Navigate to /settings/appearance
// 2. Click "Settings" in breadcrumb
// 3. Expected: Navigate to /settings
```

**Regression Testing:**
```typescript
// Test all existing features after changes
// 1. Create new transaction
// 2. Create new budget
// 3. Create new goal
// 4. View analytics
// 5. Expected: All features work as before
```

## Import Order Convention

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

// 2. External library imports
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

// 3. Internal utilities/lib imports
import { trpc } from '@/lib/trpc'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/client'

// 4. Component imports
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SystemMetrics } from '@/components/admin/SystemMetrics'

// 5. Icon imports
import { Users, Shield, Settings } from 'lucide-react'

// 6. Type imports (if not inline)
import type { User } from '@prisma/client'

// 7. Style imports (if any)
import './styles.css'
```

## Code Quality Standards

**TypeScript Strictness:**
- Always enable strict mode
- No `any` types (use `unknown` if needed)
- Use explicit return types for functions
- Use Prisma-generated types (import from `@prisma/client`)

**Example:**
```typescript
// BAD
async function getUser(id: any) {
  return await prisma.user.findUnique({ where: { id } })
}

// GOOD
async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } })
}
```

**Component Organization:**
- One component per file
- Props interface at top of file
- Helper functions inside component (or extract to utils/)
- Hooks at top of component body
- Early returns for loading/error states
- Main render at bottom

**Example:**
```typescript
interface SystemMetricsProps {
  showDetails?: boolean
}

export function SystemMetrics({ showDetails = false }: SystemMetricsProps) {
  // Hooks first
  const { data, isLoading, error } = trpc.admin.systemMetrics.useQuery()

  // Early returns
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorDisplay error={error} />
  if (!data) return null

  // Main render
  return <div>{/* ... */}</div>
}
```

## Security Patterns

**Never Trust Client-Side:**
```typescript
// BAD: Client-side role check only
{userData?.role === 'ADMIN' && (
  <button onClick={deleteAllUsers}>Delete All Users</button>
)}

// GOOD: Server-side protection
// Client shows button conditionally (UX)
{userData?.role === 'ADMIN' && (
  <button onClick={handleDelete}>Delete User</button>
)}

// Server enforces permission (security)
deleteUser: adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // This will NEVER execute for non-admin users
    await ctx.prisma.user.delete({ where: { id: input.userId } })
  })
```

**Validate All Inputs:**
```typescript
// Always use Zod validation
userList: adminProcedure
  .input(
    z.object({
      search: z.string().max(100).optional(), // Limit length
      limit: z.number().min(1).max(100), // Range validation
    })
  )
  .query(async ({ ctx, input }) => {
    // input is validated and type-safe
  })
```

---

**Patterns Status:** COMPREHENSIVE
**All Major Operations Covered:** YES
**Copy-Pasteable Examples:** YES
**Ready for Builder Use:** YES
