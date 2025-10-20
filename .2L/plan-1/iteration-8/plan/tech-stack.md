# Technology Stack

## Core Framework

**Decision:** Next.js 14.2.33 with App Router

**Rationale:**
- **Already Established:** Project uses Next.js 14 with App Router successfully
- **Route Groups Perfect Fit:** Parentheses route groups `(auth)`, `(dashboard)` enable clean layout separation without URL pollution
- **Server Components for Admin:** Admin pages can use server components for direct database access (faster initial load)
- **Middleware Integration:** Next.js middleware perfect for admin role checking before page load
- **tRPC Compatibility:** Proven integration with tRPC via API routes
- **No Migration Needed:** Stable, mature framework - no reason to change

**Alternatives Considered:**
- **Remix:** Excellent framework but would require complete migration (unjustified cost)
- **Next.js Pages Router:** Older architecture, App Router already working well

## Database

**Decision:** PostgreSQL (via Supabase) + Prisma ORM 5.22.0

**Rationale:**
- **Already Established:** PostgreSQL database hosted on Supabase, working reliably
- **Enum Support:** Native enum support for UserRole (USER, ADMIN) and SubscriptionTier (FREE, PREMIUM)
- **Prisma Migrations:** Prisma Migrate provides production-safe, tracked migrations (critical for role/tier changes)
- **Type Safety:** Prisma Client auto-generates TypeScript types from schema
- **Aggregation Queries:** Excellent support for COUNT, SUM queries needed for admin metrics
- **Relation Handling:** Handles User → Transaction, Account, Budget, Goal relations cleanly

**Schema Strategy:**

**Enums (New):**
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

**User Model Extensions:**
```prisma
model User {
  // ... existing fields (id, email, name, image, currency, timezone, etc.)

  // NEW FIELDS
  role                    UserRole           @default(USER)
  subscriptionTier        SubscriptionTier   @default(FREE)
  subscriptionStartedAt   DateTime?
  subscriptionExpiresAt   DateTime?

  // NEW INDEXES (for admin queries)
  @@index([role])
  @@index([subscriptionTier])
  @@index([createdAt])
}
```

**Migration Strategy:**
- **First Tracked Migration:** This iteration creates the FIRST tracked migration (previous schema managed via `db push`)
- **Additive Only:** All changes are additions (no data deletion), safe for existing data
- **Default Values:** All new fields have defaults (role: USER, tier: FREE) - prevents null constraint violations
- **Admin Seed:** Migration includes SQL to set `ahiya.butman@gmail.com` as ADMIN
- **Rollback Script:** Create rollback migration in case of issues

**Migration Command:**
```bash
npx prisma migrate dev --name add_user_roles_and_subscription_tiers
```

**Alternatives Considered:**
- **MongoDB:** No native enum support, less type safety
- **MySQL:** Would require database migration (unjustified)
- **TypeORM:** Less mature TypeScript support than Prisma

## Authentication

**Decision:** Supabase Auth (existing) + Prisma User Model (extended)

**Rationale:**
- **Dual System Works Well:** Supabase handles authentication (sessions, OAuth), Prisma stores application data (role, tier, preferences)
- **Auto-Sync Pattern:** tRPC context auto-creates Prisma user on first Supabase sign-in (established pattern)
- **Role Storage:** Store role in Prisma (not Supabase user metadata) for easier querying and indexing
- **Middleware Integration:** Supabase SSR client works seamlessly in Next.js middleware
- **No Breaking Changes:** Extends existing auth, doesn't replace it

**Implementation Notes:**

**Context Creation (server/api/trpc.ts):**
```typescript
// Existing pattern (no changes needed)
const { data: { user: supabaseUser } } = await supabase.auth.getUser()

if (supabaseUser) {
  user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseAuthId: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata.name || null,
        image: supabaseUser.user_metadata.avatar_url || null,
        // Defaults: role = USER, subscriptionTier = FREE
      },
    })
  }
}
```

**Middleware Role Checking (middleware.ts):**
```typescript
// NEW: Admin route protection
if (request.nextUrl.pathname.startsWith('/admin')) {
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Fetch Prisma user for role checking
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
    select: { role: true }
  })

  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }
}
```

**Alternatives Considered:**
- **NextAuth.js:** Would require complete auth migration (unjustified)
- **Supabase User Metadata for Role:** Harder to query, no database indexes
- **JWT Custom Claims:** Requires Supabase Edge Functions (added complexity)

## API Layer

**Decision:** tRPC 11.6.0 with React Query integration

**Rationale:**
- **Already Established:** 8 routers working reliably (categories, accounts, plaid, transactions, budgets, analytics, goals, users)
- **End-to-End Type Safety:** TypeScript types flow from server to client automatically
- **Procedure Middleware Pattern:** Existing `protectedProcedure` pattern extends cleanly to `adminProcedure`
- **Automatic Type Inference:** Client gets full autocomplete without manual type definitions
- **SuperJSON Serialization:** Handles Decimal and Date types from Prisma seamlessly

**Admin Router Pattern:**

**adminProcedure Middleware (server/api/trpc.ts):**
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

**Admin Router Registration (server/api/root.ts):**
```typescript
import { adminRouter } from './routers/admin.router'

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
```

**Client Usage:**
```typescript
// In admin dashboard component
const { data: metrics } = trpc.admin.systemMetrics.useQuery()
//     ^? data: { totalUsers: number, totalTransactions: number, ... } | undefined

const { data: userList } = trpc.admin.userList.useQuery({
  search: 'john',
  role: 'USER',
  limit: 50,
})
```

**Alternatives Considered:**
- **REST API:** Would lose type safety, require manual type definitions
- **GraphQL:** Over-engineering for this application's needs
- **Server Actions:** Next.js feature, but tRPC already established

## Frontend

**Decision:** React 18 + Next.js App Router (Server & Client Components)

**Rationale:**
- **Already Established:** Application uses React 18 successfully
- **Server Components for Admin:** Admin pages can use server components for direct database queries (faster)
- **Client Components for Interactivity:** Forms, dropdowns, modals remain client components
- **Streaming Support:** Progressive enhancement for large admin queries (future)

**UI Component Library:** Radix UI primitives + shadcn/ui components

**Rationale:**
- **Already Established:** Project uses Radix UI (DropdownMenu, Dialog, Select, etc.)
- **Accessibility:** Radix primitives are WCAG compliant out of the box
- **Customization:** shadcn/ui provides styled components built on Radix (copy-paste pattern)
- **No Install Needed:** All required components already available (DropdownMenu, Breadcrumb, Card, Button)
- **Consistent Design System:** All components follow Tailwind theme

**Styling:** Tailwind CSS 3.x

**Rationale:**
- **Already Established:** Entire application styled with Tailwind
- **Utility-First:** Rapid development, no CSS file management
- **Theme System:** CSS variables for colors (supports light/dark mode)
- **Responsive:** Mobile-first responsive design built-in

**Component Patterns:**

**Avatar Dropdown (New):**
```typescript
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-2 hover:opacity-80">
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
        {user.email[0].toUpperCase()}
      </div>
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuLabel>Account</DropdownMenuLabel>
    <DropdownMenuItem href="/account">Overview</DropdownMenuItem>
    <DropdownMenuItem href="/account/profile">Profile</DropdownMenuItem>
    <DropdownMenuItem href="/account/membership">Membership</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Breadcrumb Component (New):**
```typescript
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const label = segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return (
          <div key={href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
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

**Alternatives Considered:**
- **Material UI:** Heavier, opinionated design system (doesn't match app aesthetic)
- **Ant Design:** Similar issues, plus licensing concerns
- **Chakra UI:** Good option but would require migration

## External Integrations

**None for Iteration 8** - All work is internal (database, routing, navigation)

**Future Iterations:**
- **Iteration 9:** Exchange rate API (exchangerate-api.com or similar) for currency conversion
- **Future:** Payment provider (Stripe) for subscription billing
- **Future:** Email service (Resend - already configured) for notifications

## Development Tools

### Testing

**Framework:** Vitest (already configured)

**Coverage target:** Not required for Iteration 8 (focus on manual testing)

**Strategy:**
- **Manual Testing Priority:** Admin security requires thorough manual testing (unauthorized access attempts)
- **Regression Testing:** Verify all existing features still work after changes
- **Unit Tests (Optional):** Admin router procedures if time permits

**Test Commands:**
```bash
npm run test          # Run unit tests (if written)
npm run test:watch    # Watch mode
```

### Code Quality

**Linter:** ESLint with Next.js config

**Configuration:** `.eslintrc.json` (already configured)
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**Formatter:** Prettier (already configured)

**Configuration:** `.prettierrc` (already exists)
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2
}
```

**Type Checking:** TypeScript 5.x (strict mode enabled)

**Configuration:** `tsconfig.json` (already configured)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

### Build & Deploy

**Build tool:** Next.js built-in (Turbopack for dev, Webpack for production)

**Build Commands:**
```bash
npm run dev           # Development server (Turbopack)
npm run build         # Production build
npm run start         # Production server
npm run lint          # Lint check
npm run type-check    # TypeScript check
```

**Deployment target:** Vercel (inferred from setup, or custom hosting)

**CI/CD:** Not explicitly configured (can add GitHub Actions if needed)

**Pre-Deployment Checks:**
```bash
npx prisma migrate deploy   # Run migrations
npx prisma generate         # Regenerate Prisma Client
npm run build               # Verify build succeeds
npm run lint                # Verify no lint errors
```

## Environment Variables

All required environment variables (no additions needed for Iteration 8):

**Existing:**
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
  - Format: `postgresql://user:password@host:5432/database`
  - Where to get: Supabase project settings → Database → Connection string

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
  - Format: `https://your-project.supabase.co`
  - Where to get: Supabase project settings → API

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
  - Where to get: Supabase project settings → API → anon/public key

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
  - Where to get: Supabase project settings → API → service_role key
  - **Security:** Never expose in client code

**Optional (Future):**
- `EXCHANGE_RATE_API_KEY`: For Iteration 9 (currency conversion)
- `STRIPE_SECRET_KEY`: For future subscription billing
- `RESEND_API_KEY`: For email notifications (already configured)

## Dependencies Overview

Key packages with versions (no additions needed):

**Core:**
- `next@14.2.33` - Next.js framework
- `react@18.x` - React library
- `react-dom@18.x` - React DOM renderer

**Database & API:**
- `@prisma/client@5.22.0` - Prisma ORM client
- `prisma@5.22.0` - Prisma CLI (dev dependency)
- `@trpc/server@11.6.0` - tRPC server
- `@trpc/client@11.6.0` - tRPC client
- `@trpc/react-query@11.6.0` - tRPC React hooks
- `@tanstack/react-query@5.x` - React Query (used by tRPC)

**Authentication:**
- `@supabase/supabase-js@2.58.0` - Supabase client
- `@supabase/ssr@0.5.2` - Supabase SSR utilities

**Validation:**
- `zod@3.x` - Schema validation (tRPC inputs)

**UI Components:**
- `@radix-ui/react-dropdown-menu@2.x` - Dropdown primitive (avatar menu)
- `@radix-ui/react-dialog@1.x` - Dialog primitive
- `@radix-ui/react-select@2.x` - Select primitive
- `lucide-react@0.x` - Icon library (Shield, User, Settings icons)

**Forms:**
- `react-hook-form@7.x` - Form state management
- `@hookform/resolvers@3.x` - Zod resolver for react-hook-form

**Styling:**
- `tailwindcss@3.x` - Utility-first CSS
- `tailwind-merge@2.x` - Utility class merging
- `class-variance-authority@0.x` - Component variants

**Utilities:**
- `superjson@2.x` - Serialization (Date/Decimal handling)
- `date-fns@3.x` - Date manipulation

**Dev Dependencies:**
- `typescript@5.x` - TypeScript compiler
- `@types/node@20.x` - Node.js type definitions
- `@types/react@18.x` - React type definitions
- `eslint@8.x` - Linter
- `prettier@3.x` - Code formatter
- `vitest@1.x` - Test framework (optional for this iteration)

## Performance Targets

**Initial Load (Non-Admin Pages):**
- First Contentful Paint: <1.5s (existing target, maintain)
- Time to Interactive: <3s (existing target, maintain)

**Admin Pages (New):**
- Admin dashboard initial load: <2s (includes systemMetrics query)
- Admin user list initial load: <1.5s (100 users)
- User search response time: <500ms

**API Response Times:**
- `systemMetrics` query: <2s (aggregations across all users)
- `userList` query: <1s (paginated, 50 users per page)
- `users.me` query: <200ms (existing, maintain)

**Middleware Performance:**
- Admin route role check: <50ms per request (lean Prisma query)
- Non-admin route protection: <10ms per request (existing, maintain)

**Bundle Size:**
- No significant increase expected (new pages are code-split)
- Admin pages only loaded for admin users
- DropdownMenu already in bundle (no new dependencies)

**Database Query Performance:**
- User count queries: <100ms (indexed fields)
- Transaction count queries: <200ms (indexed userId field)
- User search queries: <500ms (contains search on email/name)

## Security Considerations

### Defense in Depth (Multi-Layer Protection)

**Layer 1: Middleware Route Protection**
- Blocks non-admin users from `/admin/*` routes at server level
- Redirects to dashboard with error message
- Prevents admin pages from even loading for non-admin users

**Layer 2: tRPC Admin Procedure**
- `adminProcedure` validates role on every API call
- Throws FORBIDDEN error for non-admin users
- Prevents direct API access bypassing UI

**Layer 3: UI Conditional Rendering**
- Admin navigation link only visible to admin users
- Client-side UX enhancement (NOT a security layer)
- Prevents confusion (non-admin users don't see admin options)

**Implementation:**

**Middleware (server-side security):**
```typescript
// CRITICAL: Never trust client-side role checks
if (request.nextUrl.pathname.startsWith('/admin')) {
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { role: true } // Lean query (only fetch role)
  })

  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    // Clear error message without revealing system details
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }
}
```

**tRPC Procedure (API-level security):**
```typescript
// CRITICAL: Validate role on every admin API call
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Fetch fresh role (don't trust stale context)
  const userWithRole = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { role: true }
  })

  if (!userWithRole || userWithRole.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required', // Clear but not revealing
    })
  }

  return next({ ctx })
})
```

### Data Validation

**Input Validation (Zod schemas):**
- All admin procedures validate inputs with Zod
- Prevents SQL injection (Prisma parameterizes queries)
- Prevents XSS (React auto-escapes output)

**Example:**
```typescript
userList: adminProcedure
  .input(
    z.object({
      search: z.string().max(100).optional(), // Limit length
      role: z.enum(['USER', 'ADMIN']).optional(), // Enum validation
      tier: z.enum(['FREE', 'PREMIUM']).optional(),
      limit: z.number().min(1).max(100).default(50), // Range validation
      cursor: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    // input is fully validated and type-safe
  })
```

### Error Handling

**Secure Error Messages:**
- User-facing: "Unauthorized access" (clear but not revealing)
- Server logs: Detailed error with user ID, timestamp (for auditing)
- Never expose database structure or internal details

**Example:**
```typescript
try {
  const metrics = await ctx.prisma.user.count()
  return metrics
} catch (error) {
  // Log detailed error server-side
  console.error('[Admin Metrics Error]', { userId: ctx.user.id, error })

  // Return generic error to client
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Failed to fetch system metrics',
  })
}
```

### Database Security

**Principle of Least Privilege:**
- Prisma queries use explicit `select` (only fetch needed fields)
- Admin queries don't expose sensitive data (password hashes never returned)
- User email exposed only to admin users (not to regular users)

**Indexes for Performance & Security:**
- `@@index([role])` - Fast role lookups (admin queries)
- `@@index([subscriptionTier])` - Fast tier filtering
- Prevents slow queries that could DOS the system

**Migration Safety:**
- All migrations are additive (no data deletion)
- Default values prevent null constraint violations
- Rollback script available

### Monitoring & Auditing (Future Enhancement)

**Recommended for Future Iterations:**
- Audit log table (track admin actions: who, what, when)
- Rate limiting on admin endpoints (prevent abuse)
- Alert system for suspicious activity (multiple unauthorized access attempts)
- Session management (force logout after X hours)

**Not Required for Iteration 8 (MVP Focus):**
- Focus on getting core security right (middleware + procedure validation)
- Add auditing/monitoring in future iterations

---

**Technology Stack Status:** COMPREHENSIVE
**All Decisions Justified:** YES
**Ready for Builder Implementation:** YES
**No New Dependencies Required:** YES (use existing stack)
