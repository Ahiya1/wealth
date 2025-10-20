# Explorer 3 Report: tRPC API Layer & Admin Feature Requirements

## Executive Summary

The application uses a well-structured tRPC architecture with Next.js App Router, Supabase Auth, and Prisma ORM. The existing setup provides a solid foundation for adding admin functionality. Current architecture includes 8 routers with consistent patterns using `protectedProcedure` for authentication. To implement Iteration 1 admin features, we need to: (1) create a new `adminProcedure` middleware for role-based access control, (2) build an `admin.router.ts` with system metrics and user management, and (3) extend `users.router.ts` to include role/tier fields in the `me` query.

## Discoveries

### Existing tRPC Architecture

**Router Registration (server/api/root.ts):**
- Clean router composition pattern
- Currently 8 routers registered: categories, accounts, plaid, transactions, budgets, analytics, goals, users
- Type-safe AppRouter export for client usage

**Context Creation (server/api/trpc.ts):**
- Supabase Auth integration with automatic Prisma user sync
- Auto-creates Prisma User on first sign-in (findUnique → create pattern)
- Context includes: `supabase`, `supabaseUser`, `user` (Prisma), `prisma`
- SuperJSON transformer for Date/Decimal serialization

**Procedure Types:**
- `publicProcedure`: No authentication required
- `protectedProcedure`: Requires authenticated user (throws UNAUTHORIZED if not logged in)
- **MISSING**: `adminProcedure` for role-based access control

**Client Setup (lib/trpc.ts):**
- Simple createTRPCReact wrapper
- Type inference from AppRouter
- Used in components via `trpc.{router}.{procedure}.useQuery()` or `.useMutation()`

### Current User Model (Prisma Schema)

**Existing Fields:**
```prisma
model User {
  id                     String    @id @default(cuid())
  supabaseAuthId         String?   @unique
  email                  String    @unique
  name                   String?
  image                  String?
  currency               String    @default("USD")
  timezone               String    @default("America/New_York")
  onboardingCompletedAt  DateTime?
  onboardingSkipped      Boolean   @default(false)
  isDemoUser             Boolean   @default(false)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

**MISSING Fields (Required for Iteration 1):**
- `role` enum (USER, ADMIN)
- `subscriptionTier` enum (FREE, PREMIUM)
- `subscriptionStartedAt` DateTime?
- `subscriptionExpiresAt` DateTime?

### Users Router Analysis

**Current `me` Query:**
```typescript
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
    },
  })
})
```

**Required Update:**
Add `role` and `subscriptionTier` to select clause after database migration

**Other Procedures:**
- `completeOnboarding`: Marks onboarding complete
- `skipOnboarding`: Skips onboarding
- `updateProfile`: Updates name, currency, timezone
- `exportAllData`: Exports user data as JSON
- `deleteAccount`: Hard deletes user and Supabase auth

### Analytics Router Patterns (Reference for Admin Metrics)

The `analyticsRouter` demonstrates excellent aggregation patterns:

**Dashboard Summary:**
- Parallel queries with `Promise.all` for performance
- Aggregates net worth from accounts
- Calculates income/expenses from transactions
- Groups spending by category
- Returns recent transactions

**Key Pattern - Aggregation:**
```typescript
const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

const income = currentMonthTransactions
  .filter((t) => Number(t.amount) > 0)
  .reduce((sum, t) => sum + Number(t.amount), 0)
```

**Key Pattern - Category Grouping:**
```typescript
const categorySpending = Object.entries(
  currentMonthTransactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((acc, t) => {
      const cat = t.category.name
      acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.amount))
      return acc
    }, {} as Record<string, number>)
)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
```

These patterns are directly applicable to admin system metrics.

### Middleware Analysis (middleware.ts)

**Current Protection:**
- Validates Supabase session for protected routes
- Redirects unauthenticated users to `/signin`
- Protected paths: `/dashboard`, `/accounts`, `/transactions`, `/budgets`, `/goals`, `/analytics`, `/settings`

**MISSING:**
- Role-based access control for `/admin` routes
- No check for admin role in middleware

**Required Update:**
Add admin role verification after database migration:
```typescript
// After user session check
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (!user) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  // Fetch Prisma user to check role
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { role: true }
  })
  
  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
  }
}
```

## Patterns Identified

### Pattern 1: Protected Procedure Middleware

**Description:** tRPC middleware that validates authentication before executing procedures

**Current Implementation:**
```typescript
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
```

**Recommendation:** Create `adminProcedure` using same pattern with role check

### Pattern 2: Router Composition

**Description:** Each feature domain gets its own router file in `server/api/routers/`

**File Structure:**
```
server/api/
├── root.ts              # Router registration
├── trpc.ts              # Context & procedures
└── routers/
    ├── users.router.ts
    ├── analytics.router.ts
    ├── transactions.router.ts
    ├── accounts.router.ts
    ├── budgets.router.ts
    ├── goals.router.ts
    ├── categories.router.ts
    ├── plaid.router.ts
    └── admin.router.ts  # NEW - to be created
```

**Recommendation:** Follow existing pattern for `admin.router.ts`

### Pattern 3: Data Aggregation with Prisma

**Description:** Use Prisma queries with reduce/filter for metrics

**Use Case:** System-wide metrics (total users, transactions, active users)

**Example from analyticsRouter:**
```typescript
const [accounts, transactions, budgets] = await Promise.all([
  ctx.prisma.account.findMany({ where: { userId, isActive: true } }),
  ctx.prisma.transaction.findMany({ where: { userId, date: { gte, lte } } }),
  ctx.prisma.budget.findMany({ where: { userId, month } }),
])

const aggregated = items.reduce((sum, item) => sum + Number(item.value), 0)
```

**Recommendation:** Use this pattern for admin metrics (adapt to system-wide scope)

### Pattern 4: Input Validation with Zod

**Description:** All procedures validate inputs using Zod schemas

**Example:**
```typescript
procedure
  .input(
    z.object({
      startDate: z.date(),
      endDate: z.date(),
      limit: z.number().min(1).max(100).default(50),
    })
  )
  .query(async ({ ctx, input }) => {
    // Use validated input
  })
```

**Recommendation:** Use for admin search/filter parameters

### Pattern 5: Authorization with User Ownership

**Description:** Verify resource ownership before mutation/query

**Example from transactionsRouter:**
```typescript
const existing = await ctx.prisma.transaction.findUnique({
  where: { id: input.id },
})

if (!existing || existing.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}
```

**Recommendation:** Admin procedures skip ownership check (system-wide access)

## Complexity Assessment

### High Complexity Areas

**Admin Procedure Middleware (MEDIUM-HIGH COMPLEXITY)**
- Why: Requires database query in middleware context, careful error handling
- Builders needed: 1 (part of foundation work)
- Estimated time: 1-2 hours
- Challenges:
  - Must avoid N+1 queries (check role efficiently)
  - Error messages must be clear (security vs. usability)
  - Type narrowing for admin context

**System-Wide Metrics Aggregation (MEDIUM COMPLEXITY)**
- Why: Aggregating across all users requires different query patterns
- Builders needed: 1 (part of admin router)
- Estimated time: 2-3 hours
- Challenges:
  - Performance with large datasets (1000+ users)
  - Calculating "active users" (define criteria: 30 days? 90 days?)
  - Handling Decimal types in aggregations

**User List with Search/Filter (MEDIUM COMPLEXITY)**
- Why: Pagination, search, and filtering combined
- Builders needed: 1 (part of admin router)
- Estimated time: 2-3 hours
- Challenges:
  - Full-text search on email/name (Prisma fullTextSearch preview feature available)
  - Filter by role, tier, date range
  - Cursor-based pagination for performance

### Medium Complexity Areas

**Database Migration for Role/Tier Fields (MEDIUM COMPLEXITY)**
- Straightforward enum additions
- Migration script to set ahiya.butman@gmail.com as ADMIN
- Estimated time: 1 hour

**Users Router Update (LOW-MEDIUM COMPLEXITY)**
- Simple addition to select clause
- Type updates flow automatically
- Estimated time: 30 minutes

**Middleware Update for Admin Routes (MEDIUM COMPLEXITY)**
- Prisma query integration in middleware
- Error handling and redirects
- Estimated time: 1-2 hours

### Low Complexity Areas

**Admin Router Registration (LOW COMPLEXITY)**
- Add single line to `root.ts`
- Type inference automatic
- Estimated time: 5 minutes

**Client-Side tRPC Usage (LOW COMPLEXITY)**
- Existing pattern: `trpc.admin.{procedure}.useQuery()`
- No changes to setup
- Estimated time: N/A (UI components handle this)

## Technology Recommendations

### Primary Stack (Already Established)

- **tRPC:** v10+ (using createTRPCReact pattern) - Perfect for type-safe APIs
- **Prisma:** ORM for database - Use for all admin queries
- **Zod:** Input validation - Use for all admin procedure inputs
- **SuperJSON:** Serialization - Already configured for Decimal/Date types
- **Next.js Middleware:** Route protection - Extend for admin role check

### Supporting Libraries (Already Available)

- **@trpc/server:** Server-side tRPC utilities
- **@trpc/react-query:** Client-side hooks with React Query integration
- **date-fns:** Date manipulation (already used in analytics)

### New Enums for Prisma Schema

```prisma
enum UserRole {
  USER
  ADMIN
}

enum SubscriptionTier {
  FREE
  PREMIUM
}
```

## Integration Points

### Admin Router ↔ User Model

**Connection:** Admin procedures query User table with role checks

**Data Flow:**
1. Client calls `trpc.admin.systemMetrics.useQuery()`
2. adminProcedure middleware validates admin role
3. Procedure aggregates data from User, Transaction, Account tables
4. Returns system-wide metrics

**Type Safety:**
- Admin context guarantees `user.role === 'ADMIN'`
- Return types inferred from Prisma queries

### Middleware ↔ Prisma

**Connection:** Middleware checks user role from database

**Implementation:**
```typescript
// In middleware.ts (after Supabase auth check)
import { prisma } from '@/lib/prisma'

const prismaUser = await prisma.user.findUnique({
  where: { supabaseAuthId: user.id },
  select: { role: true }
})
```

**Challenge:** Middleware doesn't have tRPC context
**Solution:** Import Prisma client directly in middleware

### Users Router ↔ Client Components

**Connection:** Components fetch user data including role/tier

**Current Usage:**
```typescript
const { data: userData } = trpc.users.me.useQuery()
```

**After Update:**
```typescript
const { data: userData } = trpc.users.me.useQuery()
// userData now includes role and subscriptionTier
if (userData?.role === 'ADMIN') {
  // Show admin nav link
}
```

## Risks & Challenges

### Technical Risks

**Risk 1: Middleware Database Queries**
- **Impact:** Every admin route request queries database for role
- **Mitigation:** 
  - Add caching layer (Redis or in-memory with TTL)
  - OR include role in JWT claims (requires Supabase custom claims)
  - OR accept single query overhead (likely negligible)
- **Recommendation:** Start simple (direct query), optimize if needed

**Risk 2: Admin Procedure Type Safety**
- **Impact:** TypeScript must narrow admin user type correctly
- **Mitigation:**
  - Define AdminContext type extending base Context
  - Use type predicates in adminProcedure middleware
- **Example:**
```typescript
type AdminContext = Context & {
  user: User & { role: 'ADMIN' }
}

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  return next({
    ctx: ctx as AdminContext,
  })
})
```

**Risk 3: System-Wide Query Performance**
- **Impact:** Aggregating all users/transactions could be slow
- **Mitigation:**
  - Use database aggregation functions (COUNT, SUM)
  - Add database indexes (already exist for common queries)
  - Implement query result caching (5-minute TTL)
- **Recommendation:** Start with simple queries, add caching if >2s response

### Complexity Risks

**Risk: Builder Scope Creep**
- **Likelihood:** MEDIUM - Admin features can expand quickly
- **Impact:** Iteration 1 should stay focused on foundation
- **Mitigation:** 
  - Strict scope: metrics + user list only
  - No user editing/deletion in Iteration 1 (defer to future)
  - No audit logs yet (defer to future)
- **Boundary:** Admin router should have 3-4 procedures max in Iteration 1

## Recommendations for Planner

### 1. Create Admin Procedure Middleware FIRST

**Rationale:** All admin features depend on this. Build once, use everywhere.

**Implementation Order:**
1. Add role/tier enums to Prisma schema
2. Run migration with seed script (set ahiya.butman@gmail.com as ADMIN)
3. Create `adminProcedure` in `server/api/trpc.ts`
4. Test with simple procedure before building full admin router

**Code Snippet:**
```typescript
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  // Fetch fresh role to prevent stale context
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
```

### 2. Build Admin Router with Progressive Complexity

**Start Simple:**
- `systemMetrics`: Single query, no input validation needed
- `userCount`: Basic COUNT query
- `activeUserCount`: Slightly more complex (date filtering)

**Then Add Filtering:**
- `userList`: Pagination + search + filter (most complex)

**Recommendation:** Test each procedure in isolation before moving to next

### 3. Update Users Router with Role/Tier Fields

**Rationale:** Minimal change, high impact (enables client-side admin nav)

**Changes:**
- Add 2 fields to select clause in `me` query
- No input validation needed
- Types auto-update via Prisma Client

**Test:** Verify `trpc.users.me.useQuery()` returns new fields

### 4. Extend Middleware for Admin Route Protection

**Rationale:** Defense in depth (protect routes server-side, not just client-side)

**Implementation:**
```typescript
// Add to middleware.ts config
export const config = {
  matcher: [
    // ... existing matchers
    '/admin/:path*',  // NEW
  ],
}

// Add to middleware function
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (!user) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  const { prisma } = await import('@/lib/prisma')
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { role: true }
  })
  
  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }
}
```

### 5. Define Clear Admin Router Scope for Iteration 1

**Include:**
- `systemMetrics`: Total users, total transactions, active users (30 days)
- `userList`: Paginated list with email, name, role, tier, createdAt
- `searchUsers`: Filter by email/name (optional input)

**Exclude (defer to future iterations):**
- User editing (change role/tier)
- User deletion
- Audit logs
- Email notifications
- Subscription management

**Rationale:** Keep Iteration 1 focused on foundation and viewing data, not mutating

## Proposed Admin Router Procedures

### Procedure 1: systemMetrics

**Purpose:** Dashboard overview with key system statistics

**Type:** Query (no input)

**Returns:**
```typescript
{
  totalUsers: number
  totalTransactions: number
  totalAccounts: number
  activeUsers30d: number      // Users with transactions in last 30 days
  activeUsers90d: number      // Users with transactions in last 90 days
  adminCount: number
  premiumCount: number
  freeCount: number
}
```

**Implementation:**
```typescript
systemMetrics: adminProcedure.query(async ({ ctx }) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

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
          some: {
            date: { gte: thirtyDaysAgo }
          }
        }
      }
    }),
    ctx.prisma.user.count({
      where: {
        transactions: {
          some: {
            date: { gte: ninetyDaysAgo }
          }
        }
      }
    }),
    ctx.prisma.user.count({
      where: { role: 'ADMIN' }
    }),
    ctx.prisma.user.count({
      where: { subscriptionTier: 'PREMIUM' }
    }),
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
})
```

### Procedure 2: userList

**Purpose:** Paginated user list with search and filtering

**Type:** Query with input

**Input:**
```typescript
z.object({
  search: z.string().optional(),           // Search email/name
  role: z.enum(['USER', 'ADMIN']).optional(),
  tier: z.enum(['FREE', 'PREMIUM']).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),           // Cursor-based pagination
})
```

**Returns:**
```typescript
{
  users: Array<{
    id: string
    email: string
    name: string | null
    role: 'USER' | 'ADMIN'
    subscriptionTier: 'FREE' | 'PREMIUM'
    createdAt: Date
    transactionCount: number
    lastActivityAt: Date | null
  }>
  nextCursor: string | undefined
}
```

**Implementation:**
```typescript
userList: adminProcedure
  .input(
    z.object({
      search: z.string().optional(),
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
  })
```

### Procedure 3: userStats (Optional - If Time Permits)

**Purpose:** Detailed statistics for a specific user

**Type:** Query with input

**Input:**
```typescript
z.object({
  userId: z.string()
})
```

**Returns:**
```typescript
{
  user: {
    id: string
    email: string
    name: string | null
    role: 'USER' | 'ADMIN'
    subscriptionTier: 'FREE' | 'PREMIUM'
    createdAt: Date
  }
  stats: {
    totalTransactions: number
    totalAccounts: number
    totalBudgets: number
    totalGoals: number
    lastActivity: Date | null
    netWorth: number
  }
}
```

**Recommendation:** Include only if builder has time after core procedures

## Users Router Modifications

### Update `me` Query

**Current Select Clause:**
```typescript
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
}
```

**Updated Select Clause (ADD 2 LINES):**
```typescript
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
  role: true,                    // NEW
  subscriptionTier: true,        // NEW
}
```

**No other changes needed** - Types auto-update via Prisma Client

## Data Aggregation Queries Needed

### Query 1: Active Users by Date Range

**Purpose:** Count users with activity in last N days

**Pattern:**
```typescript
await ctx.prisma.user.count({
  where: {
    transactions: {
      some: {
        date: { gte: dateThreshold }
      }
    }
  }
})
```

**Indexes:** Already exist on `Transaction.userId` and `Transaction.date`

### Query 2: User Search with Pagination

**Purpose:** Find users by email/name with cursor pagination

**Pattern:**
```typescript
await ctx.prisma.user.findMany({
  where: {
    OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ],
  },
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
})
```

**Note:** Prisma `fullTextSearch` preview feature available but not required for MVP

### Query 3: User with Transaction Count

**Purpose:** Get user list with aggregated transaction counts

**Pattern:**
```typescript
await ctx.prisma.user.findMany({
  select: {
    // ... user fields
    _count: {
      select: { transactions: true }
    }
  }
})
```

**Performance:** Efficient (uses Prisma's COUNT optimization)

## Type Safety Considerations

### Admin Context Type

**Define in server/api/trpc.ts:**
```typescript
type AdminUser = User & {
  role: 'ADMIN'
}

type AdminContext = {
  user: AdminUser
  prisma: PrismaClient
}
```

**Use in adminProcedure:**
```typescript
return next({
  ctx: ctx as AdminContext,
})
```

**Benefit:** TypeScript knows `ctx.user.role === 'ADMIN'` without runtime checks

### Router Type Exports

**Add to server/api/root.ts:**
```typescript
import { adminRouter } from './routers/admin.router'

export const appRouter = router({
  // ... existing routers
  admin: adminRouter,  // NEW
})
```

**Client Auto-Update:**
```typescript
// Types automatically available
const { data } = trpc.admin.systemMetrics.useQuery()
//     ^? data: { totalUsers: number, ... } | undefined
```

### Enum Type Safety

**After Prisma migration, enums available:**
```typescript
import { UserRole, SubscriptionTier } from '@prisma/client'

// Type-safe comparisons
if (user.role === UserRole.ADMIN) { ... }
if (user.subscriptionTier === SubscriptionTier.PREMIUM) { ... }
```

**Client-Side:**
```typescript
// Enums can be imported in client components
import { UserRole } from '@prisma/client'

if (userData?.role === UserRole.ADMIN) {
  return <AdminNav />
}
```

## Resource Map

### Critical Files/Directories

**Core tRPC Setup:**
- `/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts` - Context & procedures (ADD adminProcedure here)
- `/home/ahiya/Ahiya/wealth/src/server/api/root.ts` - Router registration (ADD admin router here)
- `/home/ahiya/Ahiya/wealth/src/lib/trpc.ts` - Client setup (no changes needed)

**Routers:**
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/users.router.ts` - UPDATE me query
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/admin.router.ts` - CREATE new file
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/analytics.router.ts` - REFERENCE for patterns

**Database:**
- `/home/ahiya/Ahiya/wealth/prisma/schema.prisma` - ADD enums and User fields
- `/home/ahiya/Ahiya/wealth/prisma/migrations/` - Migration will be generated

**Middleware:**
- `/home/ahiya/Ahiya/wealth/middleware.ts` - ADD admin route protection

**Client Usage Examples:**
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardSidebar.tsx` - Shows trpc.users.me.useQuery() pattern

### Key Dependencies

**Runtime:**
- `@trpc/server` - Server-side tRPC utilities
- `@trpc/react-query` - Client hooks
- `@prisma/client` - Database queries
- `zod` - Input validation
- `superjson` - Serialization

**Dev:**
- `prisma` - Migration and client generation
- `typescript` - Type checking

### Testing Infrastructure

**Existing Test Pattern:**
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/__tests__/` - Router tests directory

**Recommendation:**
- Create `/home/ahiya/Ahiya/wealth/src/server/api/routers/__tests__/admin.router.test.ts`
- Test adminProcedure throws FORBIDDEN for non-admin users
- Test systemMetrics returns correct aggregations
- Test userList pagination and search

**Test Setup:**
```typescript
import { createInnerTRPCContext } from '../trpc'
import { adminRouter } from '../routers/admin.router'

// Mock admin user
const adminUser = {
  id: 'admin-123',
  email: 'admin@test.com',
  role: 'ADMIN',
  // ... other fields
}

// Mock regular user
const regularUser = {
  id: 'user-123',
  email: 'user@test.com',
  role: 'USER',
  // ... other fields
}
```

## Questions for Planner

### 1. Active User Definition

**Question:** What defines an "active user" for the systemMetrics?

**Options:**
- A) User with transaction in last 30 days
- B) User with transaction in last 90 days
- C) User who has logged in recently (requires session tracking)
- D) Multiple metrics (30d, 90d, logged in)

**Recommendation:** Option D - Show both 30d and 90d active users (most informative)

### 2. Admin Role Caching

**Question:** Should we cache admin role check in middleware?

**Options:**
- A) Query database on every admin route request (simple, always fresh)
- B) Cache role in Redis with 5-minute TTL (faster, more complex)
- C) Include role in JWT custom claims (fastest, requires Supabase configuration)

**Recommendation:** Option A for MVP - Optimize later if needed

**Rationale:** Single database query is negligible, complexity not worth it yet

### 3. User List Default Sort

**Question:** How should user list be sorted by default?

**Options:**
- A) Created date (newest first)
- B) Last activity (most recent activity first)
- C) Email alphabetical

**Recommendation:** Option A (createdAt DESC) - Shows newest users first, most common admin need

### 4. Search Implementation

**Question:** Should we use Prisma full-text search or simple contains?

**Options:**
- A) Simple `contains` with `mode: 'insensitive'` (works now, good enough for MVP)
- B) Prisma `fullTextSearch` (better performance, requires index setup)
- C) External search service like Algolia (overkill for now)

**Recommendation:** Option A - Simple contains is sufficient for email/name search

**Future:** Upgrade to full-text search if user count exceeds 10,000

### 5. Admin Procedure Scope

**Question:** Should admin procedures allow data mutation in Iteration 1?

**Options:**
- A) Read-only (metrics + list) - SAFER, focused scope
- B) Include user role/tier updates - More complete, higher risk
- C) Include user deletion - Maximum functionality, highest risk

**Recommendation:** Option A - Read-only for Iteration 1

**Rationale:** Foundation iteration should establish secure viewing, defer mutations to Iteration 2 or beyond

## Implementation Checklist for Builder

**Phase 1: Database (1 hour)**
- [ ] Add UserRole enum to schema.prisma
- [ ] Add SubscriptionTier enum to schema.prisma
- [ ] Add role, subscriptionTier, subscriptionStartedAt, subscriptionExpiresAt to User model
- [ ] Generate migration: `npx prisma migrate dev --name add-user-roles-and-tiers`
- [ ] Create seed script to set ahiya.butman@gmail.com as ADMIN
- [ ] Run seed script
- [ ] Verify migration success

**Phase 2: tRPC Infrastructure (1-2 hours)**
- [ ] Create adminProcedure in server/api/trpc.ts
- [ ] Test adminProcedure with simple test procedure
- [ ] Update users.router.ts me query (add role and subscriptionTier to select)
- [ ] Test users.me query returns new fields

**Phase 3: Admin Router (2-3 hours)**
- [ ] Create server/api/routers/admin.router.ts
- [ ] Implement systemMetrics procedure
- [ ] Implement userList procedure (with pagination)
- [ ] Add admin router to root.ts
- [ ] Test each procedure via tRPC DevTools or manual query

**Phase 4: Middleware (1-2 hours)**
- [ ] Update middleware.ts to protect /admin routes
- [ ] Add /admin to matcher config
- [ ] Add role check logic
- [ ] Test unauthorized access (should redirect to dashboard)
- [ ] Test authorized access (admin user can access)

**Phase 5: Testing (1 hour)**
- [ ] Regression test existing features (users.me still works)
- [ ] Security test admin routes (non-admin redirected)
- [ ] Test admin procedures return correct data
- [ ] Test search/filter in userList

**Total Estimated Time: 6-8 hours** (matches master plan estimate)

## Success Criteria

### Functional
- [ ] Admin user (ahiya.butman@gmail.com) can access /admin routes
- [ ] Non-admin users are redirected from /admin with appropriate message
- [ ] `trpc.admin.systemMetrics.useQuery()` returns accurate counts
- [ ] `trpc.admin.userList.useQuery()` returns paginated user list
- [ ] Search/filter works in userList
- [ ] `trpc.users.me.useQuery()` includes role and subscriptionTier

### Security
- [ ] Server-side middleware correctly enforces role-based access
- [ ] Admin procedures throw FORBIDDEN for non-admin users
- [ ] No direct database access bypassing authorization

### Performance
- [ ] systemMetrics query completes in <2 seconds
- [ ] userList query completes in <1 second (for 100 users)

### Type Safety
- [ ] No TypeScript errors after migration
- [ ] Admin context types correctly narrowed
- [ ] Client can access admin procedures with full autocomplete

---

**Report Status:** COMPLETE
**Confidence Level:** HIGH
**Recommended Action:** Proceed with implementation following checklist order
