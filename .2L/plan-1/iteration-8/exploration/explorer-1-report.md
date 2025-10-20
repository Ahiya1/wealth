# Explorer 1 Report: Authentication, Authorization & Database Architecture

## Executive Summary
The Wealth application uses a dual authentication system (Supabase Auth for authentication + Prisma for application data) with middleware-based route protection. Currently, there is NO role-based access control (RBAC) or subscription tier system. The database schema lacks `role` and `subscriptionTier` enums on the User model. To add admin capabilities, we need to: (1) extend the User model with role/tier enums, (2) create migration to set ahiya.butman@gmail.com as ADMIN, (3) add admin-specific middleware logic, (4) create adminProcedure in tRPC, and (5) build admin routes with server-side protection.

## Discoveries

### Current Authentication Architecture
- **Dual System**: Supabase Auth (authentication) + Prisma User model (application data)
- **Auto-sync**: tRPC context (`src/server/api/trpc.ts`) automatically creates Prisma user on first sign-in using Supabase user ID
- **Middleware**: `/home/ahiya/Ahiya/wealth/middleware.ts` protects routes using Supabase session validation
- **Protected Routes**: `/dashboard`, `/accounts`, `/transactions`, `/budgets`, `/goals`, `/analytics`, `/settings`
- **Auth Flow**: Email/password + Google OAuth via Supabase, with auth callback at `/auth/callback/route.ts`

### Current User Model (Prisma)
```prisma
model User {
  id             String    @id @default(cuid())
  supabaseAuthId String?   @unique
  email          String    @unique
  passwordHash   String?   // Legacy (unused with Supabase)
  name           String?
  image          String?
  currency       String    @default("USD")
  timezone       String    @default("America/New_York")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Onboarding tracking
  onboardingCompletedAt  DateTime?
  onboardingSkipped      Boolean   @default(false)
  isDemoUser             Boolean   @default(false)

  // Relations
  categories          Category[]
  accounts            Account[]
  transactions        Transaction[]
  budgets             Budget[]
  goals               Goal[]
}
```

**Missing Fields:**
- `role` enum (USER, ADMIN)
- `subscriptionTier` enum (FREE, PREMIUM)
- `subscriptionStartedAt` DateTime?
- `subscriptionExpiresAt` DateTime?

### Current Middleware Logic
**File**: `/home/ahiya/Ahiya/wealth/middleware.ts`

**Current Behavior:**
1. Creates Supabase server client
2. Calls `supabase.auth.getUser()` to validate session
3. Redirects unauthenticated users from protected paths to `/signin`
4. Redirects authenticated users from `/signin`, `/signup` to `/dashboard`

**What's Missing:**
- No role checking (no admin vs user distinction)
- No `/admin` route protection
- No Prisma user lookup (only Supabase user validation)

### Current tRPC Setup
**File**: `/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts`

**Context Creation:**
```typescript
export const createTRPCContext = async () => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  // Auto-create Prisma user if doesn't exist
  let user = null
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
        },
      })
    }
  }

  return { supabase, supabaseUser, user, prisma }
}
```

**Existing Procedures:**
- `publicProcedure`: No auth required
- `protectedProcedure`: Requires authenticated user (checks `ctx.user`)

**What's Missing:**
- `adminProcedure`: Requires authenticated user WITH admin role

### Current Router Structure
**File**: `/home/ahiya/Ahiya/wealth/src/server/api/root.ts`

**Registered Routers:**
- `categories`: categoriesRouter
- `accounts`: accountsRouter
- `plaid`: plaidRouter
- `transactions`: transactionsRouter
- `budgets`: budgetsRouter
- `analytics`: analyticsRouter
- `goals`: goalsRouter
- `users`: usersRouter

**What's Missing:**
- `admin`: adminRouter (for admin-only procedures)

### Existing Navigation Structure
**File**: `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardSidebar.tsx`

**Current Navigation:**
```typescript
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: Receipt },
  { title: 'Budgets', href: '/budgets', icon: PieChart },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings/categories', icon: Settings }, // ← Points to /settings/categories
]
```

**Issue**: Settings link goes directly to `/settings/categories` instead of `/settings` overview page

### Existing Settings Structure
**Current Pages:**
- `/settings/page.tsx`: Overview page with links to Account Settings and Categories
- `/settings/account/page.tsx`: Profile, theme, danger zone
- `/settings/categories/page.tsx`: Category management

**What's Missing (per requirements):**
- `/settings/currency` page (placeholder for Iteration 2)
- `/settings/appearance` page
- `/settings/data` page
- `/account/*` section (separate from `/settings`)
  - `/account` (overview)
  - `/account/profile`
  - `/account/membership` (tier display, billing placeholder)
  - `/account/security`
  - `/account/preferences`

**Confusion**: Current `/settings/account` page overlaps with planned `/account/profile`. Needs refactoring.

### Database Migration Status
**No migration directory exists**: `/home/ahiya/Ahiya/wealth/prisma/migrations/` does not exist

**Migration Strategy:**
1. Schema is currently managed via `prisma db push` (no migrations tracked)
2. For production-safe changes, need to switch to `prisma migrate dev`
3. First migration will capture current schema + new changes

**Implication**: When adding `role` and `subscriptionTier`, we'll create the FIRST tracked migration.

## Patterns Identified

### Pattern 1: Dual Auth System (Supabase + Prisma)
**Description:** Supabase handles authentication (sessions, OAuth), Prisma stores application data
**Use Case:** Separate concerns - auth provider flexibility + rich application data model
**Example:**
```typescript
// Middleware: Supabase for session validation
const { data: { user: supabaseUser } } = await supabase.auth.getUser()

// tRPC: Prisma user for app data (with role, tier, etc.)
const user = await prisma.user.findUnique({
  where: { supabaseAuthId: supabaseUser.id }
})
```
**Recommendation:** ✅ Keep this pattern. Extend Prisma User model for RBAC.

### Pattern 2: Middleware-First Route Protection
**Description:** Next.js middleware intercepts requests before they reach pages/API routes
**Use Case:** Fast authentication checks, redirect before rendering
**Example:**
```typescript
// middleware.ts
if (!user && request.nextUrl.pathname.startsWith('/admin')) {
  return NextResponse.redirect(new URL('/signin', request.url))
}
```
**Recommendation:** ✅ Use for admin route protection. Add Prisma user lookup for role checking.

### Pattern 3: tRPC Procedure-Level Authorization
**Description:** Create custom procedures that enforce authorization rules
**Use Case:** API-level protection (independent of middleware)
**Example:**
```typescript
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx })
})
```
**Recommendation:** ✅ Implement this for admin-only tRPC procedures.

### Pattern 4: Auto-Create User on First Sign-In
**Description:** When Supabase user signs in for first time, auto-create Prisma user record
**Use Case:** Seamless onboarding, no manual user creation needed
**Example:** See `createTRPCContext` in `/src/server/api/trpc.ts` (lines 17-34)
**Recommendation:** ✅ Extend to set default role: `USER`, default tier: `FREE`.

## Complexity Assessment

### High Complexity Areas

#### 1. Database Schema Migration + Data Backfill
**Why Complex:**
- First tracked migration (no migration history exists)
- Must backfill existing users with default values (`role: USER`, `tier: FREE`)
- Must identify and set `ahiya.butman@gmail.com` as `ADMIN`
- Risk: Migration failure leaves database in inconsistent state

**Estimated Builder Splits:** 1 (can be handled in single pass with careful testing)

**Mitigation:**
- Test migration on local database first
- Create rollback script
- Use Prisma's `@@index` on role field for fast lookups
- Atomic migration (Prisma handles this)

#### 2. Middleware Enhancement for Admin Routes
**Why Complex:**
- Must fetch Prisma user (not just Supabase user) for role checking
- Performance concern: Extra DB query on every request to `/admin/*`
- Must handle edge cases (user deleted from Prisma but Supabase session still valid)
- Security-critical code

**Estimated Builder Splits:** 1 (isolated feature, clear requirements)

**Mitigation:**
- Cache Prisma user lookup (use Supabase user ID as cache key)
- Add error handling for missing Prisma user
- Comprehensive testing (unauthorized access attempts)
- Security audit of admin route protection

#### 3. Navigation Restructure (Settings vs Account)
**Why Complex:**
- Current `/settings/account` conflicts with new `/account/profile` page
- Sidebar link currently points to `/settings/categories` (needs to point to `/settings`)
- Must maintain backward compatibility during transition
- Risk: User confusion, broken links

**Estimated Builder Splits:** 1 (UI/UX refactoring, no data model changes)

**Mitigation:**
- Create clear breadcrumb navigation
- Use redirects for deprecated routes
- Test all navigation flows manually
- Update all hardcoded links to `/settings/categories`

### Medium Complexity Areas

#### 1. Admin tRPC Router Creation
**Complexity:** New router with system metrics queries (user count, transaction count, active users)
**Why Medium:** Database aggregation queries, no complex logic

#### 2. Admin Pages (Dashboard + User List)
**Complexity:** New pages, table component for user list, search/filter UI
**Why Medium:** Standard CRUD UI, no novel patterns

#### 3. User Router Extension
**Complexity:** Add role/tier to `users.me` query response
**Why Medium:** Simple field additions to existing query

### Low Complexity Areas

#### 1. Settings Overview Page Updates
**Complexity:** Add links to new settings pages (currency, appearance, data)
**Why Low:** Simple link additions to existing page

#### 2. Breadcrumb Component
**Complexity:** Reusable breadcrumb component for settings/account pages
**Why Low:** Standard UI component, no business logic

#### 3. Placeholder Pages
**Complexity:** `/settings/currency`, `/settings/appearance`, `/settings/data`, `/account/*` pages
**Why Low:** Empty pages with "Coming soon" message, minimal implementation

## Technology Recommendations

### Primary Stack (No Changes Needed)
- **Authentication:** Supabase Auth (current) - ✅ Keep
- **Database:** PostgreSQL via Supabase (current) - ✅ Keep
- **ORM:** Prisma 5.22.0 (current) - ✅ Keep
- **API Layer:** tRPC 11.6.0 (current) - ✅ Keep
- **Middleware:** Next.js 14 middleware (current) - ✅ Keep

**Rationale:** Existing stack is solid, mature, well-integrated. No need for new dependencies.

### Schema Additions

#### Enum: UserRole
```prisma
enum UserRole {
  USER
  ADMIN
}
```
**Rationale:** Simple, extensible (can add MODERATOR, SUPPORT later if needed)

#### Enum: SubscriptionTier
```prisma
enum SubscriptionTier {
  FREE
  PREMIUM
}
```
**Rationale:** Two-tier model as specified in requirements. Can add ENTERPRISE later.

#### User Model Changes
```prisma
model User {
  // ... existing fields ...
  
  role                    UserRole           @default(USER)
  subscriptionTier        SubscriptionTier   @default(FREE)
  subscriptionStartedAt   DateTime?
  subscriptionExpiresAt   DateTime?
  
  @@index([role])
  @@index([subscriptionTier])
}
```

**Rationale:**
- `role` defaults to USER (safe, least-privilege)
- `subscriptionTier` defaults to FREE (safe, no entitlements)
- `subscriptionStartedAt` tracks when user upgraded (nullable for FREE users)
- `subscriptionExpiresAt` supports trial periods, subscription expiry
- Indexes on role and tier for fast admin queries

### Supporting Libraries
**None Required** - All work can be done with existing dependencies.

## Integration Points

### Internal Integrations

#### Middleware ↔ Prisma User Lookup
**Connection:** Middleware must fetch Prisma user to check role
**Implementation:**
```typescript
// middleware.ts
if (request.nextUrl.pathname.startsWith('/admin')) {
  // 1. Get Supabase user (already done)
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  if (!supabaseUser) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  // 2. Fetch Prisma user for role checking (NEW)
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
    select: { role: true }
  })
  
  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
  }
}
```
**Challenge:** Performance (extra DB query per request)
**Solution:** Keep query lean (select only `role` field)

#### tRPC Context ↔ adminProcedure
**Connection:** Admin procedure uses `ctx.user.role` from tRPC context
**Implementation:**
```typescript
// trpc.ts
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required'
    })
  }
  return next({ ctx })
})

// admin.router.ts
export const adminRouter = router({
  getSystemMetrics: adminProcedure.query(async ({ ctx }) => {
    const totalUsers = await ctx.prisma.user.count()
    const totalTransactions = await ctx.prisma.transaction.count()
    const activeUsers = await ctx.prisma.user.count({
      where: { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    })
    return { totalUsers, totalTransactions, activeUsers }
  })
})
```

#### DashboardSidebar ↔ Admin Navigation
**Connection:** Sidebar should show "Admin" link only to admin users
**Implementation:**
```typescript
// DashboardSidebar.tsx
const { data: userData } = trpc.users.me.useQuery()

const navigationItems = [
  // ... existing items ...
  ...(userData?.role === 'ADMIN' ? [{
    title: 'Admin',
    href: '/admin',
    icon: Shield,
  }] : [])
]
```

#### User Router ↔ Profile Display
**Connection:** Update `users.me` to include role and tier
**Implementation:**
```typescript
// users.router.ts
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
      role: true, // NEW
      subscriptionTier: true, // NEW
      subscriptionStartedAt: true, // NEW
      subscriptionExpiresAt: true, // NEW
      isDemoUser: true,
      onboardingCompletedAt: true,
      onboardingSkipped: true,
      createdAt: true,
    },
  })
})
```

## Risks & Challenges

### Technical Risks

#### Risk 1: Migration Failure
**Impact:** HIGH - Database becomes inconsistent, app breaks
**Likelihood:** LOW (Prisma handles migrations atomically)
**Mitigation:**
1. Test migration on local database (Supabase local instance)
2. Create database backup before migration
3. Write rollback migration script
4. Test rollback procedure
5. Run migration during low-traffic period (if in production)

#### Risk 2: Performance Degradation (Middleware DB Query)
**Impact:** MEDIUM - Every `/admin/*` request queries database
**Likelihood:** MEDIUM (depends on traffic)
**Mitigation:**
1. Use lean query (select only `role` field, use index)
2. Consider Redis caching for role (if performance becomes issue)
3. Monitor middleware response times
4. For now: Accept slight overhead (admin routes are low-traffic)

#### Risk 3: Security Vulnerability (Admin Route Bypass)
**Impact:** CRITICAL - Unauthorized users access admin features
**Likelihood:** LOW (with proper testing)
**Mitigation:**
1. Double-layered protection (middleware + tRPC procedure)
2. Server-side checks ONLY (never trust client)
3. Security audit checklist:
   - ✅ Middleware blocks unauthenticated users from `/admin/*`
   - ✅ Middleware blocks non-admin users from `/admin/*`
   - ✅ Admin procedures check `ctx.user.role === 'ADMIN'`
   - ✅ No client-side role checking (only for UI visibility)
   - ✅ Test unauthorized access attempts (manual testing)
4. Add audit logging for admin actions (future enhancement)

#### Risk 4: Data Integrity (Existing Users Without Roles)
**Impact:** MEDIUM - Existing users can't access app if migration fails
**Likelihood:** LOW (default values prevent this)
**Mitigation:**
1. Use `@default(USER)` and `@default(FREE)` in schema
2. Migration auto-backfills existing users
3. Test with existing data (don't test on empty database)
4. Verify all existing users have role/tier after migration

### Complexity Risks

#### Risk 1: Navigation Confusion (Settings vs Account)
**Impact:** MEDIUM - Users confused about where to find settings
**Likelihood:** MEDIUM (UX change)
**Mitigation:**
1. Clear labeling: "Settings" = app preferences, "Account" = user profile/billing
2. Breadcrumb navigation on all pages
3. Use icons consistently (Settings = Settings icon, Account = User icon)
4. Consider onboarding tooltip after update ("Settings moved!")
5. Update any documentation/help text

#### Risk 2: Incomplete Admin Feature Set
**Impact:** LOW - Admin functionality exists but is limited
**Likelihood:** HIGH (MVP approach)
**Mitigation:**
1. Document what admin CAN'T do (edit users, delete transactions, etc.)
2. Add placeholders for future features
3. Focus on read-only metrics for now (safe, low-risk)

## Recommendations for Planner

### 1. Migration Strategy: Prisma Migrate Dev (Not db push)
**Rationale:** Requirements specify production-safe migrations. `db push` is for prototyping only.

**Action Items:**
- Switch from `npm run db:push` to `npm run db:migrate`
- First migration will capture current schema + add role/tier fields
- Create migration script to set `ahiya.butman@gmail.com` as ADMIN
- Test migration on local Supabase instance before production

**Migration Script:**
```sql
-- 001_add_role_and_subscription_tier.sql
-- Auto-generated by Prisma (enum creation, User model updates)

-- Custom data migration
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'ahiya.butman@gmail.com';
```

### 2. Two-Layer Admin Protection (Middleware + tRPC)
**Rationale:** Defense in depth. Middleware prevents page access, tRPC prevents API access.

**Implementation:**
- Middleware: Redirect non-admin users from `/admin/*` routes
- tRPC: `adminProcedure` throws FORBIDDEN error
- Both check `user.role === 'ADMIN'`

**Why Both:** Middleware alone doesn't protect direct API calls (if someone bypasses client routing). tRPC alone doesn't prevent page rendering (user sees flash of admin page before error).

### 3. Admin Features: Read-Only Metrics First (Low Risk)
**Rationale:** Requirements specify "system metrics" and "user list". No write operations.

**Scope for Iteration 8:**
- ✅ Admin dashboard with metrics (total users, total transactions, active users)
- ✅ Admin user list with email, role, tier, search/filter
- ❌ Edit user roles (future iteration)
- ❌ Delete users (future iteration)
- ❌ Impersonate users (future iteration)

**Why Read-Only:** Reduces risk, faster implementation, sufficient for MVP.

### 4. Navigation Refactor: Minimal Viable Change
**Rationale:** Balance between requirements (Settings vs Account separation) and risk (breaking existing flows).

**Recommended Approach:**
- Update sidebar link: `/settings/categories` → `/settings`
- Create `/settings` overview page (already exists, enhance it)
- Add new pages: `/settings/currency`, `/settings/appearance`, `/settings/data` (placeholders)
- **DEFER** full `/account/*` restructure to post-Iteration 1 (low priority)
- **WHY:** Requirements mention `/account` section, but it's not critical path for admin functionality

**Alternative (More Aggressive):**
- Implement full `/account/*` section now
- Move profile/security from `/settings/account` to `/account/profile` and `/account/security`
- **RISK:** More refactoring, higher chance of breaking changes

**Recommendation:** Start minimal, expand in future iteration.

### 5. Performance Monitoring: Add Middleware Timing Logs
**Rationale:** Middleware DB query adds latency. Need visibility.

**Implementation:**
```typescript
// middleware.ts
const startTime = Date.now()
const prismaUser = await prisma.user.findUnique(...)
const queryTime = Date.now() - startTime

if (process.env.NODE_ENV === 'development') {
  console.log(`[Middleware] Admin role check: ${queryTime}ms`)
}
```

**Why:** Identify if performance becomes issue. If >100ms, consider caching.

### 6. Testing Strategy: Security-First
**Rationale:** Admin functionality is security-critical. Comprehensive testing required.

**Test Checklist:**
- [ ] Unauthenticated user redirected from `/admin`
- [ ] Authenticated non-admin user redirected from `/admin`
- [ ] Admin user can access `/admin`
- [ ] Non-admin user gets FORBIDDEN error from admin tRPC procedures
- [ ] Admin user can call admin tRPC procedures
- [ ] All existing features work after migration (regression test)
- [ ] Database migration succeeds without data loss
- [ ] `ahiya.butman@gmail.com` has ADMIN role after migration
- [ ] New users get USER role and FREE tier by default

## Resource Map

### Critical Files/Directories

#### Files to Modify

**1. Database Schema**
- **Path:** `/home/ahiya/Ahiya/wealth/prisma/schema.prisma`
- **Changes:** Add `UserRole` and `SubscriptionTier` enums, extend User model
- **Lines:** 14-44 (User model section)

**2. Middleware**
- **Path:** `/home/ahiya/Ahiya/wealth/middleware.ts`
- **Changes:** Add admin route protection with Prisma user lookup
- **Lines:** 64-82 (route protection logic)
- **New Matcher:** Add `/admin/:path*` to config.matcher

**3. tRPC Setup**
- **Path:** `/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts`
- **Changes:** Add `adminProcedure` (after `protectedProcedure`)
- **Lines:** After line 80

**4. tRPC Root Router**
- **Path:** `/home/ahiya/Ahiya/wealth/src/server/api/root.ts`
- **Changes:** Import and register `adminRouter`
- **Lines:** 8-9, 19

**5. Users Router**
- **Path:** `/home/ahiya/Ahiya/wealth/src/server/api/routers/users.router.ts`
- **Changes:** Add role/tier fields to `me` query select
- **Lines:** 14-26 (select object)

**6. Dashboard Sidebar**
- **Path:** `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardSidebar.tsx`
- **Changes:** Update Settings link (`/settings/categories` → `/settings`), conditionally show Admin link
- **Lines:** 27-63 (navigationItems array), add after line 63

**7. Settings Overview Page**
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/page.tsx`
- **Changes:** Add links to new settings pages (currency, appearance, data)
- **Lines:** 12-23 (settingsSections array)

#### Files to Create

**1. Admin Router**
- **Path:** `/home/ahiya/Ahiya/wealth/src/server/api/routers/admin.router.ts` (NEW)
- **Purpose:** Admin-only tRPC procedures (system metrics, user list)

**2. Admin Dashboard Page**
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/admin/page.tsx` (NEW)
- **Purpose:** Admin dashboard with system-wide metrics

**3. Admin Users Page**
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/admin/users/page.tsx` (NEW)
- **Purpose:** User list with search/filter

**4. Settings Placeholder Pages**
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/currency/page.tsx` (NEW)
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/appearance/page.tsx` (NEW)
- **Path:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/data/page.tsx` (NEW)
- **Purpose:** Placeholder pages for future features

**5. Migration Script**
- **Path:** `/home/ahiya/Ahiya/wealth/prisma/migrations/{timestamp}_add_role_and_subscription_tier/migration.sql` (AUTO-GENERATED by Prisma)
- **Custom Step:** Add `UPDATE` statement to set admin user

### Key Dependencies

**Direct Dependencies (No New Additions Needed):**
- `@prisma/client@5.22.0` - Database ORM
- `@trpc/server@11.6.0` - API layer
- `@supabase/ssr@0.5.2` - Supabase SSR client
- `@supabase/supabase-js@2.58.0` - Supabase client
- `next@14.2.33` - Next.js framework

**Dev Dependencies:**
- `prisma@5.22.0` - Prisma CLI for migrations

**Why No New Dependencies:** All RBAC functionality can be implemented with existing stack.

### Testing Infrastructure

**Unit Tests (Not Required for Iteration 8):**
- Focus on manual testing (security-critical, UI-heavy)

**Manual Testing Checklist:**
See "Testing Strategy" section above.

**Regression Testing:**
- Test all existing features after migration (accounts, transactions, budgets, goals, analytics)
- Use demo user (`test@wealth.com`) for testing

**Migration Testing:**
1. Local Supabase instance
2. Test migration: `npm run db:migrate`
3. Verify schema: `npx prisma studio`
4. Check admin user: Query `User` table for `ahiya.butman@gmail.com`, verify `role = 'ADMIN'`
5. Test rollback: `npx prisma migrate reset` (destructive, local only)

## Questions for Planner

### Q1: Should we implement full `/account/*` section now or defer?
**Context:** Requirements specify `/account` with subsections (profile, membership, security, preferences). Current `/settings/account` page exists. Conflict in scope.

**Options:**
- **Option A (Minimal):** Keep `/settings/account` as-is, add placeholder pages for new `/settings/*` pages. Defer `/account/*` refactor.
- **Option B (Full):** Implement entire `/account/*` section, move/rename `/settings/account` to `/account/profile`.

**Recommendation:** Option A (defer `/account/*`). Focus on admin functionality (critical path). Navigate refactor can be separate iteration.

**Planner Decision:** _____________

### Q2: Should admin user list support inline role/tier editing?
**Context:** Requirements say "user list with email, role, tier, search/filter". Doesn't explicitly mention editing.

**Options:**
- **Option A (Read-Only):** Display only, no editing. Lower risk, faster.
- **Option B (Editable):** Inline editing of role/tier. More useful, higher complexity.

**Recommendation:** Option A for Iteration 8. Add editing in future iteration (needs audit logging, confirmation dialogs, etc.).

**Planner Decision:** _____________

### Q3: Should migration backfill `subscriptionStartedAt` for existing users?
**Context:** Existing users have no subscription data. Should we set `subscriptionStartedAt` to `createdAt` for FREE users?

**Options:**
- **Option A:** Leave `null` (accurate, no subscription started)
- **Option B:** Set to `createdAt` (implies free subscription started at account creation)

**Recommendation:** Option A (`null`). More accurate. `subscriptionStartedAt` should only be set when user actually chooses/confirms a tier.

**Planner Decision:** _____________

### Q4: Should middleware cache Prisma user role checks?
**Context:** Performance concern - every `/admin/*` request queries database.

**Options:**
- **Option A:** No caching, accept latency (likely <50ms per request)
- **Option B:** Implement Redis/in-memory cache with TTL (5 minutes)

**Recommendation:** Option A for Iteration 8. Monitor performance. Add caching if needed (requires Redis dependency, cache invalidation logic).

**Planner Decision:** _____________

### Q5: Should we send email notification when user is promoted to ADMIN?
**Context:** Security concern - user should know if their account is given admin privileges.

**Options:**
- **Option A:** No notification (only initial admin user - ahiya.butman@gmail.com)
- **Option B:** Send email using Resend (already configured in project)

**Recommendation:** Option A for Iteration 8 (only one admin user). Add email notification when/if role editing feature is added.

**Planner Decision:** _____________

---

## Summary: Ready for Planning

**Current State:**
- ✅ Solid auth foundation (Supabase + Prisma)
- ✅ Middleware-based route protection
- ✅ tRPC with protectedProcedure
- ❌ No RBAC (role/tier system)
- ❌ No admin routes
- ❌ No tracked migrations

**Required Changes (High Confidence):**
1. Add `role` and `subscriptionTier` enums to User model
2. Create first Prisma migration
3. Extend middleware for admin route protection
4. Create `adminProcedure` in tRPC
5. Create `admin.router.ts` with system metrics
6. Build `/admin` dashboard and `/admin/users` pages
7. Update sidebar navigation (Settings link fix, Admin link)
8. Add placeholder settings pages (currency, appearance, data)

**Risk Level:** MEDIUM-HIGH
- **Justification:** Database migration (first tracked migration), security-critical admin routes, navigation refactoring

**Estimated Hours:** 6-8 hours
- Database schema + migration: 1-1.5h
- Middleware enhancement: 1-1.5h
- tRPC admin router: 1h
- Admin pages (dashboard + user list): 2-3h
- Navigation updates: 0.5-1h
- Testing (manual + regression): 1-1.5h

**Blocker-Free:** No external dependencies, no API integrations, no design assets needed. All work is backend/frontend code with existing stack.

**Next Step:** Planner creates detailed task breakdown for builder.
