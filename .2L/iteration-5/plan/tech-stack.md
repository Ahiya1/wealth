# Technology Stack - Iteration 5

## No New Dependencies Required

This iteration uses existing infrastructure. All necessary packages are already installed.

## Existing Stack (Verification)

### Core Framework
**Next.js 14.x** with App Router
- Server Components for auth checks
- Client Components for interactive UI
- Route groups `(dashboard)` for shared layouts
- File-based routing

### UI Components
**shadcn/ui** with Radix UI primitives
- Dialog component (used for modals)
- Button, Card, etc.
- Already installed and working

### Icons
**lucide-react**
- All icons used in sidebar/navigation
- Consistent icon set across app

### State Management
**React useState** for client-side dialog state
- No global state needed
- Component-level state sufficient

### Data Fetching
**tRPC + React Query**
- All 6 routers working correctly
- Mutations with cache invalidation
- No changes needed

## Configuration Changes

### 1. Directory Permissions

**Current State:**
```bash
drwx------ (700) - Too restrictive
```

**Required State:**
```bash
drwxr-xr-x (755) - Standard for web directories
```

**Command:**
```bash
chmod -R 755 /home/ahiya/Ahiya/wealth/src/app/(dashboard)
```

**Rationale:**
- Next.js needs to read route files
- 700 permissions may prevent route resolution
- 755 is standard for directories (read + execute for all)
- Files remain 644 (read for all, write for owner)

### 2. Next.js Cache Clearing

**Command:**
```bash
rm -rf /home/ahiya/Ahiya/wealth/.next
```

**When to Run:**
- After creating new layout.tsx
- After fixing permissions
- When routes 404 despite files existing

**Rationale:**
- Next.js caches route mappings
- Stale cache can cause 404 errors
- Rebuild ensures fresh route resolution

**Follow-up:**
```bash
npm run dev
# Wait for "Ready" message before testing
```

## Layout Component Architecture

### Route Group Layout Pattern

**File:** `/app/(dashboard)/layout.tsx`

**Purpose:**
- Shared layout for all routes in `(dashboard)` group
- Server-side auth check
- Sidebar navigation wrapper
- Consistent dashboard chrome

**Next.js Behavior:**
- All pages in `(dashboard)` automatically wrapped
- Layout runs on server (async component)
- Children are server or client components
- Nested layouts compose (root → dashboard → page)

**Rendering Flow:**
```
Request /dashboard/transactions
  ↓
Root Layout (/app/layout.tsx)
  ↓
Dashboard Layout (/app/(dashboard)/layout.tsx) ← NEW
  ↓ (auth check here)
  ↓
Transactions Page (/app/(dashboard)/transactions/page.tsx)
  ↓
Client Components (TransactionListPageClient)
```

## Environment Variables

### Required (Already Configured)

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (Supabase)

**Authentication:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)

**No new environment variables needed for this iteration.**

## Dependencies Overview

### Core Dependencies (No Changes)

```json
{
  "@prisma/client": "^5.x",
  "@supabase/supabase-js": "^2.x",
  "@trpc/client": "^10.x",
  "@trpc/react-query": "^10.x",
  "@trpc/server": "^10.x",
  "@tanstack/react-query": "^5.x",
  "next": "14.x",
  "react": "^18.x",
  "zod": "^3.x",
  "superjson": "^2.x"
}
```

### UI Dependencies (No Changes)

```json
{
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-alert-dialog": "^1.x",
  "lucide-react": "latest",
  "framer-motion": "^11.x",
  "tailwindcss": "^3.x"
}
```

### Dev Dependencies (Optional for Seed Script)

If implementing Builder-3 (seed data), consider:

```json
{
  "tsx": "^4.x" // Already installed - runs TypeScript files directly
}
```

**Usage:**
```bash
npm run seed  # Defined in package.json scripts
```

## Performance Targets

### Page Load Metrics

**Target Performance (Unchanged):**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Largest Contentful Paint: < 2.5s

**Layout Impact:**
- Layout adds sidebar (small HTML/CSS)
- No additional JavaScript bundles
- No performance degradation expected
- Auth check runs on server (no client impact)

### Bundle Size

**Current State:** Within acceptable limits
**After Iteration 5:** No significant change

**Sidebar Component Estimate:**
- ~2KB HTML/CSS
- Uses existing icons (no new imports)
- No new dependencies

## Security Considerations

### Authentication Flow

**Current (Duplicated):**
```typescript
// In EVERY page
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/signin')
```

**After Layout (Centralized):**
```typescript
// In layout.tsx ONLY
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/signin')

// Individual pages no longer need auth check
```

**Security Improvement:**
- Single source of truth for auth
- Prevents accidental omission of auth check
- Easier to audit (one file vs 7 files)

**No Security Risks:**
- Layout runs on server (auth check server-side)
- Session validation via Supabase (secure)
- Redirect to sign-in (prevents unauthorized access)

### Permission Changes

**Security Consideration:** Directory permissions 755

**Analysis:**
- 755 is standard for web directories
- Only affects read/execute permissions
- Does NOT expose sensitive data (source code already readable in browser)
- Server-side secrets remain protected (environment variables)
- Database credentials NOT in filesystem

**Conclusion:** No security risk from permission change

## Database Schema

### No Schema Changes Required

This iteration does NOT modify the database schema.

**If Builder-3 (Seed Data) is implemented:**
- Uses existing tables (Account, Transaction, Budget, Goal)
- No migrations needed
- No schema changes

**Seed Data Structure:**
```typescript
// Uses existing Prisma models
Account {
  userId: string
  type: AccountType
  name: string
  balance: Decimal
  // ... existing fields
}

Transaction {
  userId: string
  accountId: string
  categoryId: string | null
  amount: Decimal
  // ... existing fields
}

Budget {
  userId: string
  categoryId: string
  amount: Decimal
  month: string
  // ... existing fields
}

Goal {
  userId: string
  name: string
  targetAmount: Decimal
  currentAmount: Decimal
  // ... existing fields
}
```

## Testing Strategy

### Manual Testing (Required)

**Route Testing:**
```bash
# Start dev server
npm run dev

# Test each route (authenticated user)
curl -I http://localhost:3002/dashboard
curl -I http://localhost:3002/dashboard/accounts
curl -I http://localhost:3002/dashboard/transactions
curl -I http://localhost:3002/dashboard/budgets
curl -I http://localhost:3002/dashboard/goals
curl -I http://localhost:3002/dashboard/analytics
curl -I http://localhost:3002/dashboard/settings/categories

# All should return 200 (not 404)
```

**Browser Testing:**
1. Sign in to application
2. Navigate to each dashboard page
3. Verify sidebar visible on all pages
4. Click sidebar links (navigation works)
5. Click "Add" buttons (dialogs open)
6. Verify no console errors

### Automated Testing (Future)

**Recommended E2E Tests:**
```typescript
// playwright or cypress
test('all dashboard routes are accessible', async ({ page }) => {
  await page.goto('/signin')
  await signIn(page, testUser)

  const routes = [
    '/dashboard',
    '/dashboard/accounts',
    '/dashboard/transactions',
    '/dashboard/budgets',
    '/dashboard/goals',
    '/dashboard/analytics',
  ]

  for (const route of routes) {
    await page.goto(route)
    expect(page.status()).toBe(200)
    expect(page.locator('[data-sidebar]')).toBeVisible()
  }
})
```

**Not implemented in this iteration** (manual testing sufficient for MVP)

## Code Quality Standards

### TypeScript Requirements

**Compilation:**
```bash
npm run build
# Must complete with 0 errors
```

**Type Safety:**
- All new components fully typed
- No `any` types
- Props interfaces defined
- Return types explicit

### ESLint Configuration

**Current Config:** Using Next.js defaults
**No Changes Required**

**Acceptable Warnings:**
- Unused vars in WIP code
- Missing alt text (if applicable)

**Zero Tolerance:**
- TypeScript errors
- Runtime errors
- Build failures

### Component Patterns

**Established Patterns (Continue Using):**

1. **Server Components for Auth:**
```typescript
export default async function Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  return <ClientComponent />
}
```

2. **Client Components for Interactivity:**
```typescript
'use client'
export function ClientComponent() {
  const [isOpen, setIsOpen] = useState(false)
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>...</Dialog>
}
```

3. **tRPC Hooks for Data:**
```typescript
const { data, isLoading } = trpc.x.list.useQuery()
const mutation = trpc.x.create.useMutation({
  onSuccess: () => utils.x.list.invalidate()
})
```

## Build Configuration

### Next.js Config

**File:** `next.config.mjs`

**Current Settings (No Changes):**
- App Router enabled
- TypeScript enabled
- Tailwind CSS configured
- tRPC middleware configured

### Tailwind Config

**File:** `tailwind.config.ts`

**Custom Colors (Already Defined):**
- Sage colors for primary actions
- Warm gray for backgrounds
- Category colors for charts

**No Changes Required**

### PostCSS Config

**File:** `postcss.config.js`

**Plugins:**
- tailwindcss
- autoprefixer

**No Changes Required**

## Development Tools

### Dev Server

**Command:**
```bash
npm run dev
```

**Port:** 3002 (configured in package.json)

**Hot Reload:**
- Component changes reload automatically
- Layout changes require manual refresh
- tRPC changes require server restart

### Build Tool

**Command:**
```bash
npm run build
```

**Output:** `.next` directory

**Verification:**
- TypeScript compilation
- Bundle optimization
- Route generation
- Static page generation

### Database Tools

**Prisma Studio:**
```bash
npx prisma studio
```

**Purpose:**
- View database contents
- Verify seed data (if using Builder-3)
- Debug data issues

**Migrations:**
```bash
npx prisma migrate dev
# NOT needed for this iteration
```

## Deployment Configuration

### Vercel (Current Platform)

**Auto-Deploy:**
- Push to main branch → automatic deployment
- Preview deploys on PRs
- Environment variables synced

**Build Command:** `npm run build`
**Output Directory:** `.next`
**Framework Preset:** Next.js

**No Configuration Changes Needed**

### Environment Variables (Vercel)

**Already Configured:**
- DATABASE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

**No New Variables Required**

## Summary

### What's Using Existing Tech
- Layout component (Next.js App Router feature)
- Sidebar navigation (React + Tailwind)
- Auth check (Supabase existing setup)
- Icons (lucide-react already installed)

### What's Configuration Only
- Directory permissions (chmod command)
- Cache clearing (rm command)
- No code dependencies

### What's Optional
- Seed data script (uses tsx to run TypeScript)
- Already have tsx installed
- No new dependencies needed

### Zero New Dependencies
This iteration adds ZERO new npm packages. Everything needed is already installed and working.
