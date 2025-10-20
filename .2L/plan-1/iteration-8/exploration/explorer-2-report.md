# Explorer 2 Report: Navigation, Routing & Settings Restructure

## Executive Summary

Current Wealth app has a monolithic Settings structure (all at `/settings/account` and `/settings/categories`) that needs to be split into two distinct sections: **Settings** (app-level configuration) and **Account** (personal/membership details). This requires restructuring routes, updating navigation components (sidebar + new avatar dropdown), implementing breadcrumb navigation, and preparing for admin route integration. The architecture uses Next.js 14 App Router with route groups, tRPC for backend, and Radix UI components.

## Discoveries

### Current Route Structure

**App Directory Layout:**
```
src/app/
├── (auth)/                    [Route group for unauthenticated pages]
│   ├── layout.tsx             [Auth layout - minimal]
│   ├── signin/page.tsx
│   ├── signup/page.tsx
│   └── reset-password/page.tsx
├── (dashboard)/               [Route group for authenticated pages]
│   ├── layout.tsx             [Main dashboard layout with sidebar]
│   ├── dashboard/page.tsx
│   ├── accounts/page.tsx & [id]/page.tsx
│   ├── transactions/page.tsx & [id]/page.tsx
│   ├── budgets/page.tsx & [month]/page.tsx
│   ├── goals/page.tsx & [id]/page.tsx
│   ├── analytics/page.tsx
│   └── settings/
│       ├── page.tsx           [Overview - exists but redirects]
│       ├── account/page.tsx   [Profile, currency, timezone, theme, danger zone]
│       └── categories/page.tsx [Category management]
├── auth/callback/route.ts     [Supabase auth callback]
├── api/
│   ├── trpc/[trpc]/route.ts
│   └── webhooks/plaid/route.ts
├── layout.tsx                 [Root layout]
├── page.tsx                   [Landing page]
└── providers.tsx              [tRPC, theme providers]
```

**Current Settings Pages:**
- `/settings` - Overview page (exists, shows 2 links: Account Settings, Categories)
- `/settings/account` - Profile, currency dropdown, timezone, theme switcher, danger zone
- `/settings/categories` - Category management (CRUD operations)

**Problems with Current Structure:**
1. **Sidebar navigation** points to `/settings/categories` (line 60 in DashboardSidebar.tsx), not `/settings`
2. **Account-specific content** (profile, preferences) mixed with app settings
3. **No clear separation** between user account management and app configuration
4. **No admin routes** yet (need `/admin` and `/admin/users`)
5. **No avatar dropdown** for account-related actions
6. **No breadcrumb navigation** for settings hierarchy

### Current Navigation Components

**DashboardSidebar.tsx** (`/src/components/dashboard/DashboardSidebar.tsx`):
- Fixed-width sidebar (w-64)
- Logo/brand at top
- User info section showing email with avatar circle
- Navigation items array (hardcoded)
- Current Settings link goes to `/settings/categories` (INCORRECT)
- Sign out button at bottom
- Demo mode badge (conditional)

**Key Navigation Items:**
```typescript
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: Receipt },
  { title: 'Budgets', href: '/budgets', icon: PieChart },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings/categories', icon: Settings }, // ❌ WRONG
]
```

**No Avatar Dropdown Currently:**
- User section in sidebar shows email + avatar circle
- No dropdown menu for account-related actions
- Sign out is a button at bottom of sidebar

### Middleware Protection

**middleware.ts** (root level):
- Protects dashboard routes and authenticated paths
- Currently protects: `/dashboard`, `/accounts`, `/transactions`, `/budgets`, `/goals`, `/analytics`, `/settings`
- Does NOT protect `/admin` or `/account` (not needed yet, but will be)
- Uses Supabase Auth session checking
- **No role-based checking** (ADMIN vs USER) - will need to add

**Current Protected Paths:**
```typescript
const protectedPaths = ['/accounts', '/transactions', '/budgets', '/goals', '/analytics', '/settings']
```

**Required Updates for Iteration 8:**
- Add `/account` to protected paths
- Add `/admin` with ADMIN role checking
- Server-side role validation (not just client-side)

### Database Structure (User Model)

**Current User Model** (from schema.prisma):
```prisma
model User {
  id             String    @id @default(cuid())
  supabaseAuthId String?   @unique
  email          String    @unique
  name           String?
  image          String?
  currency       String    @default("USD")
  timezone       String    @default("America/New_York")
  
  // Onboarding
  onboardingCompletedAt  DateTime?
  onboardingSkipped      Boolean    @default(false)
  isDemoUser             Boolean    @default(false)
  
  // ... relations
}
```

**Missing Fields (Need to Add in Iteration 8):**
- `role` enum (USER, ADMIN)
- `subscriptionTier` enum (FREE, PREMIUM)
- `subscriptionStartedAt` DateTime?
- `subscriptionExpiresAt` DateTime?

### Backend Structure (tRPC)

**Current Routers** (`/src/server/api/root.ts`):
```typescript
export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
})
```

**users.router.ts Procedures:**
- `me` - Get current user (includes onboarding status, isDemoUser)
- `completeOnboarding` - Mark onboarding done
- `skipOnboarding` - Skip onboarding
- `updateProfile` - Update name, currency, timezone
- `exportAllData` - Export JSON of all user data
- `deleteAccount` - Hard delete user + Supabase auth

**Missing Routers (Need to Add):**
- `admin` router - System metrics, user list, admin-only procedures
- No role-based procedure protection yet

### UI Components Available

**shadcn/ui Components:**
- ✅ `dropdown-menu` - Radix-based dropdown (can use for avatar menu)
- ✅ `button`, `card`, `input`, `label`, `separator`
- ✅ `dialog`, `alert-dialog`
- ✅ `select`, `checkbox`, `tabs`
- ❌ **No breadcrumb component** (need to add)

**Custom Components:**
- `PageTransition` - Fade-in animation wrapper
- `StatCard`, `EncouragingProgress`, `EmptyState`
- `AffirmationCard` (dashboard)

**Settings Components:**
- `ProfileSection` - Form for name, currency, timezone
- `ThemeSwitcher` - Light/dark/system theme toggle
- `DangerZone` - Account deletion with confirmation

### Current Settings Content Distribution

**`/settings/account` Currently Contains:**
1. **Profile Section** (ProfileSection.tsx):
   - Email (disabled, from auth provider)
   - Name input
   - Currency dropdown (USD, EUR, GBP, CAD, AUD, JPY)
   - Timezone dropdown (7 common timezones)
   - Save button
   
2. **Appearance Section**:
   - Theme switcher (light/dark/system)
   
3. **Danger Zone** (DangerZone.tsx):
   - Delete account button
   - Confirmation modal with email verification
   - Deletes from Prisma + Supabase Auth

**`/settings/categories` Currently Contains:**
- Category list with edit capability
- Create new category dialog
- Category form with name, icon, color, parent selection

## Patterns Identified

### Pattern 1: Next.js 14 App Router Route Groups
**Description:** Use parentheses route groups to organize routes without affecting URL structure

**Use Case:** Separate authenticated and unauthenticated layouts
```
(auth)/         → /signin, /signup (auth layout)
(dashboard)/    → /dashboard, /accounts (dashboard layout)
```

**Example:**
```typescript
// (dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/signin')
  
  return (
    <div className="flex">
      <DashboardSidebar user={user} />
      <main>{children}</main>
    </div>
  )
}
```

**Recommendation:** YES - Keep using this pattern for new `/account` section and `/admin` routes

### Pattern 2: Sidebar + Avatar Dropdown Navigation
**Description:** Industry-standard pattern for settings vs account separation

**Use Case:** 
- **Sidebar** = App-level navigation (Dashboard, Accounts, Transactions, Settings)
- **Avatar Dropdown** = User-specific actions (Account, Sign Out)

**Example from Common Apps:**
- **Notion**: Sidebar for workspace navigation, avatar for account settings
- **Linear**: Sidebar for project areas, avatar for profile/preferences
- **Vercel**: Sidebar for deployments/projects, avatar for account/team settings

**Recommendation:** YES - Essential for Settings/Account clarity

**Implementation Strategy:**
```typescript
// DashboardSidebar.tsx - Add avatar dropdown
<DropdownMenu>
  <DropdownMenuTrigger>
    <div className="avatar-circle">{user.email[0]}</div>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem href="/account">Account Settings</DropdownMenuItem>
    <DropdownMenuItem href="/account/profile">Profile</DropdownMenuItem>
    <DropdownMenuItem href="/account/membership">Membership</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Pattern 3: Breadcrumb Navigation for Nested Settings
**Description:** Show hierarchy path (Settings > Categories OR Account > Profile)

**Use Case:** Help users understand location in nested settings structure

**Example:**
```
Settings > Categories
Settings > Currency
Settings > Appearance
Account > Profile
Account > Membership
Account > Security
```

**Recommendation:** YES - Critical for UX in nested settings

**Implementation Strategy:**
- Create `Breadcrumb.tsx` component (shadcn/ui has this)
- Add to all settings and account pages
- Auto-generate from route pathname

### Pattern 4: Settings Overview Landing Page
**Description:** Hub page showing all available settings sections as cards

**Use Case:** Discovery of all settings options, especially for new users

**Example (Current `/settings/page.tsx` has this):**
```typescript
const settingsSections = [
  {
    title: 'Categories',
    description: 'Manage income and expense categories',
    href: '/settings/categories',
  },
  {
    title: 'Currency',
    description: 'Convert all amounts to new currency',
    href: '/settings/currency',
  },
  // ... more sections
]
```

**Recommendation:** YES - Keep and expand. This is good UX.

### Pattern 5: tRPC Protected Procedures with Role-Based Access
**Description:** Server-side enforcement of admin-only routes

**Use Case:** Admin endpoints like user list, system metrics

**Example Pattern:**
```typescript
// server/api/trpc.ts
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { role: true }
  })
  
  if (user?.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  
  return next({ ctx })
})

// routers/admin.router.ts
export const adminRouter = router({
  getSystemMetrics: adminProcedure.query(async ({ ctx }) => {
    // ... return metrics
  }),
})
```

**Recommendation:** YES - Essential for secure admin features

## Complexity Assessment

### High Complexity Areas

#### 1. Settings/Account Route Restructure (HIGH COMPLEXITY - 3-4 hours)
**Why Complex:**
- Moving existing content from `/settings/account` to new `/account` routes
- Need to preserve all current functionality (profile, theme, danger zone)
- Create 4-5 new account pages (overview, profile, membership, security, preferences)
- Create 3-4 new settings pages (currency, appearance, data, keep categories)
- Update all internal links throughout app
- Ensure no broken links or redirects

**Builder Split Recommendation:** Single builder, but systematic approach:
1. Create new route structure (empty pages)
2. Move components to correct locations
3. Update navigation
4. Test all links

#### 2. Admin Route Protection with Middleware (MEDIUM-HIGH COMPLEXITY - 2-3 hours)
**Why Complex:**
- Database migration to add role/tier fields (safe but critical)
- Middleware enhancement for role checking (server-side security)
- tRPC adminProcedure helper (new pattern)
- Admin router with system metrics (aggregations across tables)
- Testing unauthorized access prevention

**Risk:** Security vulnerability if done incorrectly

**Builder Split Recommendation:** Single builder, focus on security testing

#### 3. Avatar Dropdown with Navigation Refactor (MEDIUM COMPLEXITY - 1.5-2 hours)
**Why Complex:**
- Refactor DashboardSidebar user section
- Integrate dropdown-menu component
- Handle routing from dropdown
- Move "Sign Out" from sidebar bottom to dropdown
- Ensure mobile responsiveness

**Builder Split Recommendation:** Single builder, straightforward UI work

### Medium Complexity Areas

#### 4. Breadcrumb Component Implementation (MEDIUM - 1-1.5 hours)
- Create reusable Breadcrumb component
- Auto-generate breadcrumbs from pathname
- Add to all settings/account pages
- Style consistently

#### 5. Admin Dashboard & Users Page (MEDIUM - 2-2.5 hours)
- Create `/admin/page.tsx` with system metrics
- Create `/admin/users/page.tsx` with user list
- tRPC queries for aggregations (total users, transactions, active users)
- Search/filter capability on users page
- Display role badges, tier badges

### Low Complexity Areas

#### 6. Database Migration for Role/Tier (LOW - 30 mins)
- Add enum fields to User model
- Migration script to set ahiya.butman@gmail.com as ADMIN
- Default values (USER, FREE)

**Risk:** Data migration always has risk, but this is additive (no data loss)

#### 7. Middleware Config Updates (LOW - 15 mins)
- Add `/account` and `/admin` to protected paths matcher
- Update protectedPaths array

## Technology Recommendations

### Primary Stack (Already in Use)

**Framework:** Next.js 14 with App Router
- **Rationale:** Already using, route groups perfect for this restructure
- **Server components:** Sidebar auth check, admin pages
- **Client components:** Dropdown menu, interactive forms

**Backend:** tRPC v10
- **Rationale:** Already using, type-safe end-to-end
- **Admin router:** New router with adminProcedure helper
- **Role checking:** Middleware pattern already established

**Database:** PostgreSQL + Prisma ORM
- **Rationale:** Already using, migrations tested
- **Enum support:** Role and SubscriptionTier enums
- **Aggregations:** For admin metrics (COUNT, SUM queries)

**Auth:** Supabase Auth
- **Rationale:** Already using, session management solid
- **User metadata:** Can store role in Prisma (not Supabase metadata)
- **Security:** Server-side checks in middleware + tRPC

**UI Components:** Radix UI primitives + shadcn/ui
- **Rationale:** Already using, DropdownMenu available
- **Need to add:** Breadcrumb component (shadcn has this)
- **Consistency:** All components match existing design system

### Supporting Libraries

**Already Available:**
- `react-hook-form` + `zod` - Form validation (ProfileSection uses this)
- `date-fns` - Date formatting (used in export)
- `lucide-react` - Icons (Settings, User, Shield icons)
- `tailwind-merge` - Utility class merging
- `@radix-ui/react-dropdown-menu` - Dropdown menu primitive

**Need to Add:**
- **None** - All required libraries already installed

### Testing Infrastructure

**Existing:**
- Vitest for unit tests (some routers have tests)
- Test utilities in `__tests__` directories

**Needed for Iteration 8:**
- **Middleware tests:** Unauthorized admin access blocked
- **Admin router tests:** Role enforcement
- **Navigation tests:** Links point to correct routes
- **Regression tests:** Existing features still work

## Integration Points

### External APIs
**None for Iteration 8** - All work is internal routing/navigation

### Internal Integrations

#### 1. DashboardSidebar ↔ All Dashboard Pages
**Connection:** Sidebar navigation links must match page routes
**Current Issue:** Settings link points to `/settings/categories`, should point to `/settings`
**Changes Required:**
- Update navigationItems array
- Add admin link (conditional on role)
- Move sign out to avatar dropdown

#### 2. Middleware ↔ All Protected Routes
**Connection:** Middleware protects routes before page load
**Current State:** Protects `/settings` wildcard
**Changes Required:**
- Add `/account` protection (authenticated users)
- Add `/admin` protection (admin role only)
- Role checking logic

#### 3. tRPC Context ↔ All Procedures
**Connection:** User context flows through all tRPC calls
**Current State:** `protectedProcedure` checks auth
**Changes Required:**
- Add `adminProcedure` helper
- Admin router uses adminProcedure
- User role loaded in context

#### 4. Settings Components ↔ New Account Pages
**Connection:** ProfileSection, DangerZone move from settings to account
**Current Location:** `/settings/account/page.tsx`
**New Locations:**
- ProfileSection → `/account/profile/page.tsx`
- DangerZone → `/account/security/page.tsx` (or dedicated page)
- ThemeSwitcher → `/settings/appearance/page.tsx`

#### 5. User Model ↔ All User-Related Queries
**Connection:** New role/tier fields used throughout app
**Impact Points:**
- Sidebar (display admin badge if ADMIN)
- Middleware (role checking)
- Admin routes (access control)
- Account membership page (tier display)

## Risks & Challenges

### Technical Risks

#### 1. Database Migration Failure (IMPACT: HIGH, LIKELIHOOD: LOW)
**Risk:** Prisma migration fails, database inconsistency

**Mitigation:**
- Test migration on local database first
- Create rollback migration script
- Backup production database before migration
- Use nullable fields initially (role?, tier?) then backfill
- Run migration during low-traffic period

#### 2. Middleware Role Checking Bypass (IMPACT: CRITICAL, LIKELIHOOD: LOW)
**Risk:** Users bypass admin checks, access unauthorized routes

**Mitigation:**
- Server-side checks in BOTH middleware AND tRPC
- Never rely on client-side role display only
- Test with non-admin user attempting `/admin` access
- Audit log admin route access (future consideration)
- Clear error messages on unauthorized access

#### 3. Broken Links After Route Restructure (IMPACT: MEDIUM, LIKELIHOOD: MEDIUM)
**Risk:** Internal links still point to old `/settings/account` paths

**Mitigation:**
- Search codebase for all occurrences of `/settings/account`
- Update all Link components
- Add redirects from old paths to new paths (temporary)
- Test all navigation flows manually
- Check breadcrumb generation

### Complexity Risks

#### 4. Settings/Account Content Distribution Confusion (IMPACT: MEDIUM, LIKELIHOOD: MEDIUM)
**Risk:** Unclear which content belongs in Settings vs Account

**Mitigation:** Clear decision framework:

**Settings** (app-level configuration):
- Categories (transaction categorization)
- Currency (system-wide currency conversion)
- Appearance (theme, UI preferences)
- Data (export, import, backup)

**Account** (personal/membership):
- Profile (name, email, avatar)
- Membership (tier, billing, subscription)
- Security (password, 2FA, danger zone)
- Preferences (timezone, notifications)

#### 5. Avatar Dropdown UX Overlap with Sidebar (IMPACT: LOW, LIKELIHOOD: MEDIUM)
**Risk:** Users confused about where to find account settings

**Mitigation:**
- Remove "Account Settings" from sidebar Settings link
- Make avatar dropdown discoverable (subtle hover state)
- Add tooltip "Account & Settings" on avatar hover
- Consistent icon usage (User icon for account, Settings icon for settings)

## Recommendations for Planner

### 1. Route Structure Decision - Settings vs Account Split
**Recommendation:** Use this structure:

```
/settings                    [Overview page with cards]
  ├── /categories            [Existing - category management]
  ├── /currency              [NEW - Placeholder for Iteration 9]
  ├── /appearance            [NEW - Theme + UI preferences]
  └── /data                  [NEW - Export/import]

/account                     [Overview page with profile summary]
  ├── /profile               [NEW - Name, email (read-only), avatar]
  ├── /membership            [NEW - Tier badge, billing placeholder]
  ├── /security              [NEW - Password change, 2FA (future), Danger Zone]
  └── /preferences           [NEW - Timezone, notification preferences]

/admin                       [NEW - System metrics dashboard]
  └── /users                 [NEW - User list with search/filter]
```

**Rationale:**
- Clear semantic separation (app config vs personal settings)
- Matches industry patterns (Notion, Linear, Vercel)
- Scalable (easy to add more sections)
- Overview pages aid discoverability

### 2. Navigation Changes - Sidebar + Avatar Dropdown
**Recommendation:**

**Sidebar Navigation (DashboardSidebar):**
```typescript
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: Receipt },
  { title: 'Budgets', href: '/budgets', icon: PieChart },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings }, // ✅ FIXED
  // Conditional admin link:
  { title: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]
```

**Avatar Dropdown (New Component):**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>{user.email[0]}</Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Account</DropdownMenuLabel>
    <DropdownMenuItem href="/account">Overview</DropdownMenuItem>
    <DropdownMenuItem href="/account/profile">Profile</DropdownMenuItem>
    <DropdownMenuItem href="/account/membership">Membership</DropdownMenuItem>
    <DropdownMenuItem href="/account/security">Security</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Rationale:**
- Settings in sidebar (app-level, frequently accessed)
- Account in avatar dropdown (personal, occasional access)
- Sign out moved to dropdown (more intuitive location)
- Admin link conditional on role

### 3. Breadcrumb Implementation Strategy
**Recommendation:** Create auto-generating breadcrumb component

```tsx
// components/ui/breadcrumb.tsx
export function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    return { href, label }
  })
  
  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.href}>
          {i > 0 && <ChevronRight />}
          <Link href={crumb.href}>{crumb.label}</Link>
        </span>
      ))}
    </nav>
  )
}
```

**Usage on all settings/account pages:**
```tsx
export default function CategoriesPage() {
  const pathname = usePathname()
  
  return (
    <div>
      <Breadcrumb pathname={pathname} />
      {/* Page content */}
    </div>
  )
}
```

**Rationale:**
- Automatic generation reduces maintenance
- Consistent across all settings/account pages
- Helps users navigate back

### 4. Admin Role Security - Multi-Layer Protection
**Recommendation:** Implement defense in depth

**Layer 1: Database Migration**
```prisma
enum Role {
  USER
  ADMIN
}

model User {
  // ... existing fields
  role             Role              @default(USER)
  subscriptionTier SubscriptionTier  @default(FREE)
}
```

**Layer 2: Middleware Role Checking**
```typescript
// middleware.ts
if (request.nextUrl.pathname.startsWith('/admin')) {
  const user = await getUserFromSession(supabase)
  if (user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
  }
}
```

**Layer 3: tRPC Admin Procedure**
```typescript
// server/api/trpc.ts
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { role: true }
  })
  
  if (user?.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  return next({ ctx })
})
```

**Layer 4: UI Conditional Rendering**
```tsx
// DashboardSidebar.tsx
{userData?.role === 'ADMIN' && (
  <Link href="/admin">Admin</Link>
)}
```

**Rationale:**
- Never trust client-side checks alone
- Middleware prevents page access
- tRPC prevents API access
- UI hides admin links from non-admins (UX, not security)

### 5. Content Migration Plan - Settings/Account Components
**Recommendation:** Move components systematically

**Phase 1: Create New Route Structure (Empty Pages)**
```bash
app/(dashboard)/
├── settings/
│   ├── page.tsx              [Expand overview with new sections]
│   ├── categories/page.tsx   [KEEP - no changes]
│   ├── currency/page.tsx     [NEW - Placeholder for Iteration 9]
│   ├── appearance/page.tsx   [NEW]
│   └── data/page.tsx         [NEW]
├── account/
│   ├── page.tsx              [NEW - Overview with profile summary]
│   ├── profile/page.tsx      [NEW]
│   ├── membership/page.tsx   [NEW]
│   ├── security/page.tsx     [NEW]
│   └── preferences/page.tsx  [NEW]
└── admin/
    ├── page.tsx              [NEW - System metrics]
    └── users/page.tsx        [NEW - User list]
```

**Phase 2: Move Existing Components**
```
ProfileSection.tsx     → /account/profile/page.tsx
ThemeSwitcher.tsx      → /settings/appearance/page.tsx
DangerZone.tsx         → /account/security/page.tsx
```

**Phase 3: Add New Components**
```
MembershipDisplay.tsx  → /account/membership/page.tsx (tier badge)
PreferencesForm.tsx    → /account/preferences/page.tsx (timezone, etc.)
DataExport.tsx         → /settings/data/page.tsx (export button)
```

**Phase 4: Deprecate Old Routes**
```typescript
// app/(dashboard)/settings/account/page.tsx
export default function OldAccountPage() {
  redirect('/account')
}
```

**Rationale:**
- Incremental migration reduces risk
- Redirects prevent broken bookmarks
- Can roll back if issues arise

### 6. Admin Dashboard Metrics - Lightweight MVP
**Recommendation:** Start with essential metrics only

**System Metrics (`/admin/page.tsx`):**
```typescript
const metrics = await prisma.$transaction([
  prisma.user.count(),
  prisma.transaction.count(),
  prisma.user.count({ where: { 
    transactions: { some: { createdAt: { gte: thirtyDaysAgo } } } 
  }}),
])

return {
  totalUsers: metrics[0],
  totalTransactions: metrics[1],
  activeUsers: metrics[2], // Users with transactions in last 30 days
}
```

**User List (`/admin/users/page.tsx`):**
```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    subscriptionTier: true,
    createdAt: true,
    _count: { select: { transactions: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: 100, // Pagination later
})
```

**Rationale:**
- Lightweight queries (no complex joins)
- Useful admin info (user count, activity)
- Scalable (add more metrics later)
- No premature optimization (pagination if needed)

## Resource Map

### Critical Files/Directories

**Route Files:**
- `/src/app/(dashboard)/layout.tsx` - Main dashboard layout (sidebar integration)
- `/src/app/(dashboard)/settings/page.tsx` - Settings overview (expand)
- `/src/app/(dashboard)/settings/account/page.tsx` - OLD (redirect from here)
- `/src/app/(dashboard)/account/` - NEW directory (create)
- `/src/app/(dashboard)/admin/` - NEW directory (create)

**Component Files:**
- `/src/components/dashboard/DashboardSidebar.tsx` - Update navigation items, add avatar dropdown
- `/src/components/settings/ProfileSection.tsx` - Move to account pages
- `/src/components/settings/ThemeSwitcher.tsx` - Move to settings/appearance
- `/src/components/settings/DangerZone.tsx` - Move to account/security
- `/src/components/ui/breadcrumb.tsx` - NEW (create)
- `/src/components/ui/dropdown-menu.tsx` - EXISTING (use for avatar)

**Backend Files:**
- `/middleware.ts` - Add admin role checking
- `/src/server/api/trpc.ts` - Add adminProcedure helper
- `/src/server/api/root.ts` - Add admin router
- `/src/server/api/routers/users.router.ts` - Add role/tier to queries
- `/src/server/api/routers/admin.router.ts` - NEW (create)

**Database Files:**
- `/prisma/schema.prisma` - Add Role, SubscriptionTier enums
- `/prisma/migrations/` - New migration for role/tier fields

**Config Files:**
- `/middleware.ts` - Update matcher config

### Key Dependencies

**Existing (No Install Needed):**
- `next@14.x` - App router, route groups, server components
- `@trpc/server@10.x`, `@trpc/client@10.x` - Backend API
- `@prisma/client@5.x` - Database ORM
- `@supabase/ssr`, `@supabase/supabase-js` - Auth
- `@radix-ui/react-dropdown-menu` - Dropdown primitive
- `zod` - Schema validation
- `lucide-react` - Icons (Shield, User, Settings)
- `react-hook-form`, `@hookform/resolvers` - Forms

**No New Dependencies Required**

### Testing Infrastructure

**Test Files to Create/Update:**
- `/src/server/api/routers/__tests__/admin.router.test.ts` - NEW (test admin procedures)
- `/src/server/api/routers/__tests__/users.router.test.ts` - Update (test role/tier queries)
- Integration tests for middleware role checking
- Navigation tests for sidebar links

**Manual Testing Checklist:**
- [ ] Non-admin user cannot access `/admin`
- [ ] Admin user CAN access `/admin`
- [ ] Avatar dropdown navigation works
- [ ] Breadcrumbs display correctly on all pages
- [ ] Settings link in sidebar goes to `/settings`
- [ ] All existing features work (accounts, transactions, budgets, goals, analytics)
- [ ] Database migration succeeds
- [ ] Old `/settings/account` redirects to `/account`

## Questions for Planner

### 1. Membership Page Content
**Question:** The `/account/membership` page will display subscription tier (FREE/PREMIUM). Should it include:
- Just the tier badge display (minimal)?
- Placeholder "Upgrade to Premium" button (no functionality)?
- Billing history section (future)?

**Recommendation:** Start with tier badge + "Coming Soon" placeholder for billing

### 2. Currency Page in Settings
**Question:** The `/settings/currency` page is a placeholder for Iteration 9. Should it:
- Display current currency only (read-only)?
- Show "Currency conversion coming soon" message?
- Include documentation/help text about currency conversion feature?

**Recommendation:** Display current currency + "Coming soon" message

### 3. Admin User Initialization
**Question:** How should we set ahiya.butman@gmail.com as ADMIN?
- Migration script (automatic on deploy)?
- Manual database update?
- Seed script (for development)?

**Recommendation:** Migration script with manual backup (safest)

### 4. Security Page Content
**Question:** `/account/security` will have DangerZone. Should it also include:
- Password change form (Supabase handles this)?
- 2FA toggle (not implemented yet)?
- Session management (active sessions)?

**Recommendation:** DangerZone only for Iteration 8, placeholder for password/2FA

### 5. Preferences Page Content
**Question:** `/account/preferences` needs content. Should it include:
- Timezone (currently in ProfileSection)?
- Email notification toggles (not implemented)?
- Language preference (not implemented)?

**Recommendation:** Move timezone here + placeholder for notifications

### 6. Data Export Location
**Question:** Export functionality exists in users.router.ts. Should it be:
- `/settings/data` page (makes sense semantically)?
- `/account/preferences` (user-specific)?
- Both locations?

**Recommendation:** `/settings/data` (app-level data management)

### 7. Breadcrumb Auto-Generation Edge Cases
**Question:** Some routes have IDs (`/accounts/[id]`). How should breadcrumbs handle:
- `/accounts/abc123` → "Accounts > Account Details"?
- `/budgets/2025-01` → "Budgets > January 2025"?

**Recommendation:** 
- Dynamic IDs → "Details" (generic)
- Budget month → Parse and format (e.g., "January 2025")
- Transaction ID → Fetch transaction name (optional enhancement)

### 8. Mobile Responsiveness for Avatar Dropdown
**Question:** On mobile, sidebar is likely hidden. How should avatar dropdown be accessed?
- Top-right avatar in mobile header?
- Hamburger menu includes account links?

**Recommendation:** Add mobile header with avatar (not in scope for Iteration 8, but note for future)

---

## Summary

This iteration requires careful route restructuring, multi-layer security implementation, and navigation refactoring. The key challenges are:

1. **Semantic clarity** between Settings (app config) and Account (personal)
2. **Security** for admin routes (middleware + tRPC + DB)
3. **Migration safety** for database schema changes
4. **Navigation discoverability** (avatar dropdown might be overlooked)

**Estimated Effort:** 6-8 hours as planned
**Risk Level:** MEDIUM-HIGH (database migration + security)
**Builder Recommendation:** Single builder, systematic execution, thorough testing

The foundation established here (role-based access, clear navigation structure) will support Iterations 9 and 10 seamlessly.
