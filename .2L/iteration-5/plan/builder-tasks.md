# Builder Task Breakdown - Iteration 5

## Overview

3 primary builders will work in parallel. Builder-3 (seed data) is optional but recommended for testing.

**Estimated Total Time:** 2.5 hours (with optional builder) or 1.5 hours (critical only)

**Complexity Distribution:**
- Builder-1: **MEDIUM** (infrastructure changes, affects all pages)
- Builder-2: **LOW** (component logic updates)
- Builder-3: **LOW-MEDIUM** (optional, standalone script)

---

## Builder-1: Fix 404 & Create Dashboard Infrastructure

### Scope

Create missing dashboard layout component with sidebar navigation, fix directory permissions, and verify all dashboard routes are accessible.

### Complexity Estimate

**MEDIUM**

**Reasoning:**
- Creates new foundational component (layout)
- Affects all 7 dashboard pages
- Requires system-level changes (permissions)
- Must test multiple routes
- Low code complexity but high impact

**Not HIGH because:**
- Clear patterns to follow
- No complex logic
- No database changes
- Well-defined requirements

### Success Criteria

- [ ] `/app/(dashboard)/layout.tsx` created with auth check + sidebar wrapper
- [ ] `/components/dashboard/DashboardSidebar.tsx` created with navigation links
- [ ] Directory permissions changed to 755 for all dashboard routes
- [ ] Next.js cache cleared and dev server restarted
- [ ] All 7 dashboard routes return 200 (not 404):
  - `/dashboard`
  - `/dashboard/accounts`
  - `/dashboard/transactions`
  - `/dashboard/budgets`
  - `/dashboard/goals`
  - `/dashboard/analytics`
  - `/dashboard/settings/categories`
- [ ] Sidebar visible and functional on all dashboard pages
- [ ] Active link highlighting works (current page highlighted)
- [ ] Sign out button works (redirects to `/signin`)
- [ ] No TypeScript errors
- [ ] No console errors in browser

### Files to Create

**1. `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/layout.tsx`**
- Server component (async)
- Auth check via Supabase
- Redirect to `/signin` if not authenticated
- Render DashboardSidebar + children
- Flex layout: sidebar + main content

**2. `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardSidebar.tsx`**
- Client component (uses hooks)
- Navigation items array with icons
- Active state via `usePathname()`
- Sign out handler via Supabase client
- User display (avatar circle with email initial)

### Files to Modify

**None required** - Layout is additive, doesn't modify existing files.

**Optional cleanup (if time permits):**
- Remove duplicated auth checks from individual pages
- Each page currently has:
  ```typescript
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  ```
- Can remove this since layout handles it
- **Not critical** - redundant auth checks don't hurt

### Dependencies

**Depends on:** None (infrastructure layer)

**Blocks:** None (other builders can work in parallel)

### Implementation Notes

#### Step 1: Fix Directory Permissions (5 min)

Run these commands in terminal:

```bash
# Navigate to project root
cd /home/ahiya/Ahiya/wealth

# Fix permissions
chmod -R 755 src/app/(dashboard)

# Verify (should show drwxr-xr-x)
ls -la src/app/(dashboard)
```

**Expected output:**
```
drwxr-xr-x  3 ahiya ahiya 4096 Oct  2 03:33 accounts
drwxr-xr-x  2 ahiya ahiya 4096 Oct  2 03:41 analytics
drwxr-xr-x  3 ahiya ahiya 4096 Oct  2 03:33 budgets
drwxr-xr-x  2 ahiya ahiya 4096 Oct  2 03:33 dashboard
drwxr-xr-x  3 ahiya ahiya 4096 Oct  2 03:33 goals
drwxr-xr-x  3 ahiya ahiya 4096 Oct  2 03:33 settings
drwxr-xr-x  3 ahiya ahiya 4096 Oct  2 03:33 transactions
```

#### Step 2: Create Layout Component (20 min)

Use exact code from `patterns.md` section "Dashboard Layout Pattern".

**Key points:**
- Import `createClient` from `@/lib/supabase/server`
- Import `redirect` from `next/navigation`
- Import `DashboardSidebar` from `@/components/dashboard/DashboardSidebar`
- Async function (can await auth check)
- Pass `user` object to sidebar
- Flex layout with sidebar + main content
- Use Tailwind classes: `min-h-screen bg-warm-gray-50`

#### Step 3: Create Sidebar Component (20 min)

Use exact code from `patterns.md` section "Sidebar Navigation Pattern".

**Key points:**
- Client component (`'use client'`)
- Import icons from `lucide-react`
- Navigation items array (7 items)
- Active state via `pathname === item.href`
- User display (circular avatar with initial)
- Sign out handler (async function)
- Fixed width: `w-64`
- Sage colors for active state

**Navigation items:**
```typescript
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { title: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { title: 'Budgets', href: '/dashboard/budgets', icon: PieChart },
  { title: 'Goals', href: '/dashboard/goals', icon: Target },
  { title: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/dashboard/settings/categories', icon: Settings },
]
```

#### Step 4: Clear Cache and Test (5 min)

```bash
# Stop dev server (Ctrl+C)

# Remove Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Wait for "Ready" message (should see no errors)
```

**Test in browser:**
1. Navigate to `http://localhost:3002/signin`
2. Sign in with test account
3. Should redirect to `/dashboard`
4. Verify sidebar visible on left
5. Click each navigation link
6. Verify no 404 errors
7. Verify active link highlights correctly

**Test with curl (optional):**
```bash
curl -I http://localhost:3002/dashboard/transactions
# Should return: HTTP/1.1 200 OK
```

### Patterns to Follow

**Layout Pattern:**
- Follow "Dashboard Layout Pattern" in `patterns.md`
- Server component for auth
- Flex layout for sidebar + content

**Sidebar Pattern:**
- Follow "Sidebar Navigation Pattern" in `patterns.md`
- Client component for interactivity
- usePathname for active state
- Sage colors for branding

**Permission Pattern:**
- Follow "File Permission Pattern" in `patterns.md`
- 755 for directories
- 644 for files (automatic)

**Cache Pattern:**
- Follow "Cache Clearing Pattern" in `patterns.md`
- Clear after structure changes
- Restart dev server

### Testing Requirements

**Unit Tests:** Not required (infrastructure component)

**Integration Tests:** Manual testing checklist

**Manual Testing Checklist:**

1. **Route Accessibility:**
   - [ ] `/dashboard` - loads, sidebar visible
   - [ ] `/dashboard/accounts` - loads, "Accounts" highlighted
   - [ ] `/dashboard/transactions` - loads (previously 404!)
   - [ ] `/dashboard/budgets` - loads, sidebar visible
   - [ ] `/dashboard/goals` - loads, sidebar visible
   - [ ] `/dashboard/analytics` - loads, sidebar visible
   - [ ] `/dashboard/settings/categories` - loads, "Settings" highlighted

2. **Sidebar Navigation:**
   - [ ] Clicking "Dashboard" navigates to `/dashboard`
   - [ ] Clicking "Transactions" navigates to `/dashboard/transactions`
   - [ ] Active link has sage-100 background
   - [ ] Hover states work (sage-50 on hover)

3. **Authentication:**
   - [ ] Unauthenticated user redirects to `/signin`
   - [ ] Authenticated user sees dashboard
   - [ ] Sign out button works (redirects to `/signin`)
   - [ ] User email displays in sidebar

4. **Visual:**
   - [ ] No layout shift when navigating
   - [ ] Sidebar fixed width (doesn't collapse)
   - [ ] Content scrolls, sidebar stays fixed
   - [ ] No console errors

5. **TypeScript:**
   - [ ] `npm run build` succeeds
   - [ ] No type errors in editor

### Potential Issues & Solutions

**Issue:** Routes still 404 after creating layout

**Solution:**
1. Verify layout.tsx is in correct location: `/app/(dashboard)/layout.tsx`
2. Verify file has `.tsx` extension (not `.ts`)
3. Verify permissions are 644 for file
4. Clear cache again: `rm -rf .next`
5. Check Next.js dev server logs for errors

**Issue:** Sidebar not visible

**Solution:**
1. Check browser console for errors
2. Verify DashboardSidebar import path correct
3. Verify component is exported (not default export?)
4. Check if Tailwind classes compiling

**Issue:** TypeScript errors on User type

**Solution:**
1. Import type: `import type { User } from '@supabase/supabase-js'`
2. Use in props: `interface DashboardSidebarProps { user: User }`

**Issue:** Active link not highlighting

**Solution:**
1. Verify `usePathname()` imported from `next/navigation`
2. Check pathname comparison: `pathname === item.href` (exact match)
3. Try logging pathname: `console.log('Current path:', pathname)`

### Estimated Time Breakdown

- Fix permissions: **5 minutes**
- Create layout.tsx: **20 minutes**
- Create DashboardSidebar.tsx: **20 minutes**
- Clear cache + initial testing: **5 minutes**
- Manual QA of all routes: **10 minutes**
- Fix any issues: **10 minutes buffer**

**Total: 70 minutes (1 hour 10 min)**

Rounded to **45 minutes** for experienced builder following patterns exactly.

---

## Builder-2: Improve Empty State UX

### Scope

Fix `hasData` logic to check record existence instead of values, and add actionable CTA buttons to EmptyState components.

### Complexity Estimate

**LOW**

**Reasoning:**
- Small, focused changes
- Clear logic fix (one line change)
- Adding action buttons (UI enhancement)
- Limited scope (2 components)
- Low risk (doesn't affect data flow)

### Success Criteria

- [ ] `hasData` logic in DashboardStats checks `recentTransactions.length > 0` instead of value comparisons
- [ ] DashboardStats EmptyState has action buttons (Add Account + Add Transaction)
- [ ] RecentTransactionsCard EmptyState has action button (Add Transaction)
- [ ] User with 0 transactions sees EmptyState with CTA buttons
- [ ] User with 1+ transactions sees StatCards (even if all values are $0)
- [ ] Action buttons navigate to correct routes
- [ ] Buttons styled with sage colors (primary) and outline (secondary)
- [ ] No TypeScript errors
- [ ] No visual regressions

### Files to Modify

**1. `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardStats.tsx`**

Change line ~30:
```typescript
// OLD
const hasData = data && (data.netWorth !== 0 || data.income !== 0 || data.expenses !== 0)

// NEW
const hasData = data && data.recentTransactions.length > 0
```

Change line ~38 (EmptyState action):
```typescript
// OLD
action={undefined}

// NEW
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
```

Add imports:
```typescript
import { Plus } from 'lucide-react'
import Link from 'next/link'
```

**2. `/home/ahiya/Ahiya/wealth/src/components/dashboard/RecentTransactionsCard.tsx`**

Update EmptyState (around line 40-50):
```typescript
// OLD
<EmptyState
  icon={Receipt}
  title="No transactions yet"
  description="Start tracking your spending by adding your first transaction."
/>

// NEW
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

Add imports if not present:
```typescript
import { Plus } from 'lucide-react'
import Link from 'next/link'
```

### Dependencies

**Depends on:** Builder-1 (routes must work for navigation)

**Blocks:** None

**Note:** Can implement changes in parallel with Builder-1, but testing requires Builder-1 completion.

### Implementation Notes

#### Step 1: Fix hasData Logic (5 min)

**File:** `DashboardStats.tsx`

**Current code (around line 30):**
```typescript
const hasData = data && (data.netWorth !== 0 || data.income !== 0 || data.expenses !== 0)
```

**New code:**
```typescript
const hasData = data && data.recentTransactions.length > 0
```

**Why this is better:**
- Checks if records EXIST, not if they have non-zero values
- User with $0 balance account will see StatCards (correct!)
- User with offsetting transactions ($100 in, $100 out) will see StatCards (correct!)
- Only users with zero transactions see EmptyState (correct!)

**Edge cases handled:**
- `data` is undefined → hasData = false (correct)
- `recentTransactions` is empty array → hasData = false (correct)
- `recentTransactions` has 1+ items → hasData = true (correct, show stats)

#### Step 2: Add Action Buttons to DashboardStats (10 min)

**Find EmptyState component (around line 35-40):**

```typescript
if (!hasData) {
  return (
    <EmptyState
      icon={Wallet}
      title="Start tracking your finances"
      description="Connect your first account or add a transaction to see your dashboard come to life"
      action={undefined}  // ← CHANGE THIS
    />
  )
}
```

**Replace with:**
```typescript
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
```

**Add imports at top of file:**
```typescript
import Link from 'next/link'
import { Plus } from 'lucide-react'
```

**Why two buttons:**
- Gives users choice (account-first or transaction-first)
- Primary button (Add Account) is more prominent (solid sage color)
- Secondary button (Add Transaction) is outline variant
- Both navigate to correct routes

#### Step 3: Add Action Button to RecentTransactionsCard (10 min)

**File:** `RecentTransactionsCard.tsx`

**Find EmptyState (should be around line 40-50):**

Look for:
```typescript
if (!data?.length) {
  return (
    <EmptyState
      icon={Receipt}
      title="No transactions yet"
      description="Start tracking your spending by adding your first transaction."
    />
  )
}
```

**Update to:**
```typescript
if (!data?.length) {
  return (
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
  )
}
```

**Add imports if not present:**
```typescript
import Link from 'next/link'
import { Plus } from 'lucide-react'
```

#### Step 4: Test Empty State Flow (5 min)

**Scenario 1: New user (0 data)**

1. Sign in as user with no accounts/transactions
2. Navigate to `/dashboard`
3. Verify:
   - EmptyState shows (not StatCards)
   - Two buttons visible: "Add Account" and "Add Transaction"
   - Clicking "Add Account" navigates to `/dashboard/accounts`
   - Clicking "Add Transaction" navigates to `/dashboard/transactions`

**Scenario 2: User with data**

1. Add one transaction (use Builder-3 seed script or manual)
2. Navigate to `/dashboard`
3. Verify:
   - StatCards show (4 cards)
   - Values may be $0 (that's OK!)
   - No EmptyState visible

**Scenario 3: Recent Transactions Card**

1. User with no transactions
2. Scroll to RecentTransactionsCard on dashboard
3. Verify:
   - EmptyState shows
   - "Add Transaction" button visible
   - Clicking button navigates to `/dashboard/transactions`

### Patterns to Follow

**hasData Logic Pattern:**
- Follow "hasData Logic Pattern" in `patterns.md`
- Check record existence, not values
- Use `.length > 0` for arrays

**EmptyState Action Pattern:**
- Follow "EmptyState Action Pattern" in `patterns.md`
- Use `Button asChild` with `Link` for navigation
- Primary actions: sage-600 background
- Secondary actions: outline variant
- Icon + text on buttons

**Import Order:**
- Follow "Import Order Convention" in `patterns.md`
- React/Next imports first
- Components
- Icons last

### Testing Requirements

**Unit Tests:** Not required (simple logic change)

**Manual Testing Checklist:**

1. **Empty State Display:**
   - [ ] User with 0 transactions sees DashboardStats EmptyState
   - [ ] EmptyState has 2 action buttons
   - [ ] Buttons are styled correctly (sage primary + outline secondary)
   - [ ] Button icons display (Plus icon)

2. **Action Button Navigation:**
   - [ ] "Add Account" button navigates to `/dashboard/accounts`
   - [ ] "Add Transaction" button navigates to `/dashboard/transactions`
   - [ ] Navigation works from both DashboardStats and RecentTransactionsCard

3. **Data State Display:**
   - [ ] User with 1+ transactions sees StatCards
   - [ ] StatCards show even if all values are $0
   - [ ] No EmptyState when data exists

4. **Edge Cases:**
   - [ ] User with account but no transactions → sees EmptyState (correct)
   - [ ] User with $0 balance account + transactions → sees StatCards (correct)
   - [ ] Loading state shows skeleton (unchanged)
   - [ ] Error state shows error message (unchanged)

5. **Visual:**
   - [ ] Buttons aligned horizontally with gap
   - [ ] Button hover states work
   - [ ] Text is readable
   - [ ] No layout shift

### Potential Issues & Solutions

**Issue:** Buttons not showing in EmptyState

**Solution:**
1. Verify EmptyState component accepts `action` prop
2. Check if action prop is properly typed (React.ReactNode)
3. Verify imports (Button, Link, Plus icon)

**Issue:** Navigation not working

**Solution:**
1. Verify `Button asChild` pattern used (not `onClick`)
2. Check Link href values (must start with `/`)
3. Verify routes exist (should after Builder-1)

**Issue:** StatCards still not showing for $0 balances

**Solution:**
1. Verify hasData logic change saved
2. Check if dev server reloaded
3. Add console.log to debug:
   ```typescript
   console.log('Data:', data)
   console.log('Transaction count:', data?.recentTransactions.length)
   console.log('hasData:', hasData)
   ```

**Issue:** TypeScript error on Link component

**Solution:**
1. Verify import: `import Link from 'next/link'`
2. Verify Button accepts asChild prop (should be in UI component)

### Estimated Time Breakdown

- Fix hasData logic: **5 minutes**
- Add buttons to DashboardStats: **10 minutes**
- Add button to RecentTransactionsCard: **10 minutes**
- Manual testing: **10 minutes**
- Fix any issues: **5 minutes buffer**

**Total: 40 minutes**

Rounded to **30 minutes** for focused changes.

---

## Builder-3: Create Seed Data Script (OPTIONAL)

### Scope

Create a TypeScript script that generates demo data (accounts, transactions, budgets, goals) for testing and development purposes.

### Complexity Estimate

**LOW-MEDIUM**

**Reasoning:**
- Standalone script (no integration complexity)
- Straightforward data creation with Prisma
- Some complexity in foreign key validation
- Randomization logic for realistic data

**Not HIGH because:**
- No UI components
- No complex business logic
- Clear data model (Prisma schema)
- No authentication concerns (runs server-side)

### Success Criteria

- [ ] `/scripts/seed-demo-data.ts` created with data generation logic
- [ ] Script accepts user ID as argument (CLI or env var)
- [ ] Creates 3 demo accounts (checking, savings, credit)
- [ ] Creates 20+ demo transactions (last 30 days)
- [ ] Creates 5 demo budgets (current month)
- [ ] Creates 2 demo goals (emergency fund + debt payoff)
- [ ] Uses existing default categories (no new categories created)
- [ ] Validates user ID exists before seeding
- [ ] Console output shows progress and summary
- [ ] Error handling with clear error messages
- [ ] npm script added: `npm run seed <user-id>`
- [ ] Script is idempotent (can run multiple times safely)

### Files to Create

**1. `/home/ahiya/Ahiya/wealth/scripts/seed-demo-data.ts`**
- Main seed script
- CLI argument parsing
- Prisma client usage
- Data generation logic
- Progress logging

### Files to Modify

**1. `/home/ahiya/Ahiya/wealth/package.json`**

Add to scripts section:
```json
{
  "scripts": {
    "seed": "tsx scripts/seed-demo-data.ts"
  }
}
```

### Dependencies

**Depends on:** None (standalone script)

**Blocks:** None (helps with testing but not required)

**Optional:** Can run after Builder-1 and Builder-2 complete to test their changes

### Implementation Notes

#### Step 1: Create Seed Script (30 min)

Use complete code from `patterns.md` section "Seed Data Pattern".

**Key implementation details:**

**1. User ID Validation:**
```typescript
async function validateUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return !!user
}
```

**2. Account Creation:**
```typescript
// Create 3 accounts with different types
const checkingAccount = await prisma.account.create({
  data: {
    userId,
    type: 'CHECKING',
    name: 'Chase Checking',
    institution: 'Chase Bank',
    balance: 5234.50,
    isManual: true,
    isActive: true,
  }
})
// ... savings and credit accounts
```

**3. Transaction Generation:**
```typescript
// Generate random transactions over last 30 days
for (let i = 0; i < transactionCount; i++) {
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  const isExpense = Math.random() > 0.3 // 70% expenses

  transactions.push({
    userId,
    accountId: Math.random() > 0.5 ? checkingAccount.id : creditAccount.id,
    categoryId: getRandomCategory(categories, isExpense),
    date,
    amount: isExpense ? -randomAmount(10, 200) : randomAmount(500, 1500),
    payee: randomPayee(isExpense),
    isManual: true,
  })
}
```

**4. Budget Creation:**
```typescript
const currentMonth = new Date().toISOString().slice(0, 7) // "2025-10"

await prisma.budget.createMany({
  data: categories.slice(0, 5).map(category => ({
    userId,
    categoryId: category.id,
    amount: randomAmount(100, 600),
    month: currentMonth,
  }))
})
```

**5. Goal Creation:**
```typescript
await prisma.goal.create({
  data: {
    userId,
    name: 'Emergency Fund',
    targetAmount: 15000,
    currentAmount: 5000,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    type: 'SAVINGS',
    linkedAccountId: savingsAccount.id,
  }
})
```

#### Step 2: Add Helper Functions (10 min)

**Random amount generator:**
```typescript
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}
```

**Random payee selector:**
```typescript
function randomPayee(isExpense: boolean): string {
  if (isExpense) {
    const payees = ['Whole Foods', 'Amazon', 'Target', 'Starbucks', 'Shell Gas', 'Netflix']
    return payees[Math.floor(Math.random() * payees.length)]
  }
  return 'Employer Paycheck'
}
```

**Category selector:**
```typescript
function getRandomCategory(categories: Category[], isExpense: boolean): string {
  const filtered = categories.filter(c =>
    isExpense ? c.type === 'EXPENSE' : c.type === 'INCOME'
  )
  return filtered[Math.floor(Math.random() * filtered.length)]?.id || categories[0].id
}
```

#### Step 3: Add Package Script (2 min)

Edit `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx scripts/seed-demo-data.ts"
  }
}
```

#### Step 4: Test Seed Script (5 min)

**Get user ID:**
1. Open Prisma Studio: `npx prisma studio`
2. Navigate to User table
3. Copy user ID (UUID)

**Run seed script:**
```bash
npm run seed <user-id-here>

# Example:
npm run seed abc-123-def-456-ghi

# Or with env var:
USER_ID=abc-123-def npm run seed
```

**Expected output:**
```
Seeding demo data for user: abc-123-def
Creating 3 demo accounts...
✓ Created 3 demo accounts
Creating 20 demo transactions...
✓ Created 20 demo transactions
Creating 5 demo budgets...
✓ Created 5 demo budgets
Creating 2 demo goals...
✓ Created 2 demo goals

✅ Demo data seeded successfully!

Summary:
  - 3 accounts
  - 20 transactions
  - 5 budgets
  - 2 goals
```

**Verify in Prisma Studio:**
1. Refresh tables
2. Check Account table (should have 3 rows)
3. Check Transaction table (should have 20 rows)
4. Check Budget table (should have 5 rows)
5. Check Goal table (should have 2 rows)

**Verify in app:**
1. Sign in as seeded user
2. Navigate to `/dashboard`
3. Should see StatCards with data (not EmptyState)
4. Navigate to `/dashboard/transactions`
5. Should see list of 20 transactions

### Patterns to Follow

**Seed Data Pattern:**
- Follow "Seed Data Pattern" in `patterns.md`
- Use Prisma client for all operations
- Validate foreign keys before creating records
- Use realistic data (amounts, dates, names)

**Error Handling:**
```typescript
try {
  await seedDemoData({ userId })
} catch (error) {
  console.error('Error seeding data:', error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
```

**CLI Argument Parsing:**
```typescript
const userId = process.env.USER_ID || process.argv[2]

if (!userId) {
  console.error('Error: USER_ID required')
  console.error('Usage: npm run seed <user-id>')
  process.exit(1)
}
```

### Testing Requirements

**Unit Tests:** Not required (dev script)

**Manual Testing:**

1. **Script Execution:**
   - [ ] Script runs without errors
   - [ ] Console output is clear and helpful
   - [ ] Progress indicators show
   - [ ] Summary displays at end

2. **Data Validation:**
   - [ ] Accounts created with correct types
   - [ ] Transactions have valid amounts (negative for expenses)
   - [ ] Budgets use current month format (YYYY-MM)
   - [ ] Goals have future target dates
   - [ ] All foreign keys valid (no orphaned records)

3. **Data Variety:**
   - [ ] Transaction amounts vary
   - [ ] Transaction dates span 30 days
   - [ ] Multiple payees used
   - [ ] Both expenses and income present

4. **Idempotency:**
   - [ ] Running script twice creates duplicate data (expected)
   - [ ] No database errors on second run
   - [ ] Consider adding cleanup option: `npm run seed:clean <user-id>`

5. **Error Handling:**
   - [ ] Invalid user ID → clear error message
   - [ ] Missing categories → helpful error message
   - [ ] Database connection error → graceful exit

### Potential Issues & Solutions

**Issue:** "No default categories found" error

**Solution:**
1. Check if categories seeded: `SELECT * FROM "Category" WHERE "isDefault" = true;`
2. Run category seed: `npx prisma db seed` (if seed script exists)
3. Or manually create categories via Prisma Studio

**Issue:** Foreign key constraint error on categoryId

**Solution:**
1. Verify categories exist before creating transactions
2. Add validation:
   ```typescript
   if (categories.length === 0) {
     throw new Error('No categories found. Seed categories first.')
   }
   ```

**Issue:** Script hangs or doesn't exit

**Solution:**
1. Ensure `await prisma.$disconnect()` in finally block
2. Add timeout:
   ```typescript
   setTimeout(() => {
     console.error('Script timeout - forcing exit')
     process.exit(1)
   }, 60000) // 60 seconds
   ```

**Issue:** User ID not found

**Solution:**
1. Add user validation:
   ```typescript
   const user = await prisma.user.findUnique({ where: { id: userId } })
   if (!user) {
     throw new Error(`User not found: ${userId}`)
   }
   ```

### Optional Enhancements

**1. Cleanup Script:**

Create `/scripts/clean-demo-data.ts`:
```typescript
async function cleanDemoData(userId: string) {
  await prisma.transaction.deleteMany({ where: { userId } })
  await prisma.budget.deleteMany({ where: { userId } })
  await prisma.goal.deleteMany({ where: { userId } })
  await prisma.account.deleteMany({ where: { userId } })
}
```

Add script: `"seed:clean": "tsx scripts/clean-demo-data.ts"`

**2. Configurable Data Amounts:**

Accept CLI flags:
```bash
npm run seed <user-id> --transactions=50 --accounts=5
```

**3. Different Data Scenarios:**

```typescript
// Minimal data
npm run seed <user-id> --scenario=minimal

// Rich data (lots of history)
npm run seed <user-id> --scenario=rich

// Debt focus
npm run seed <user-id> --scenario=debt
```

**Not required for MVP** - basic seed script is sufficient.

### Estimated Time Breakdown

- Create seed script structure: **15 minutes**
- Implement account creation: **5 minutes**
- Implement transaction generation: **15 minutes**
- Implement budget/goal creation: **10 minutes**
- Add package.json script: **2 minutes**
- Test script: **5 minutes**
- Debug issues: **5 minutes buffer**

**Total: 57 minutes**

Rounded to **45 minutes** including testing.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Start Together:**
- **Builder-1** - Infrastructure (layout + sidebar)
- **Builder-2** - UX improvements (hasData logic + buttons)
- **Builder-3** - Seed script (optional)

**Why parallel:**
- No code conflicts (different files)
- Builder-2 can implement changes while Builder-1 fixes routes
- Builder-3 standalone

### Integration Phase (After All Builders Complete)

**Steps (15 minutes):**

1. **Verify Routes (Builder-1 success):**
   ```bash
   # Test all routes return 200
   curl -I http://localhost:3002/dashboard/transactions
   curl -I http://localhost:3002/dashboard/accounts
   # ... etc
   ```

2. **Test Empty State (Builder-2 success):**
   - Navigate to `/dashboard` as new user
   - Verify EmptyState shows with action buttons
   - Click buttons, verify navigation works

3. **Seed Data (Builder-3 optional):**
   ```bash
   npm run seed <user-id>
   ```

4. **Test Data State (Builder-1 + Builder-2 integration):**
   - Refresh `/dashboard`
   - Verify StatCards now visible (not EmptyState)
   - Verify sidebar navigation works across all pages

5. **Full User Flow:**
   - Sign out
   - Sign in
   - Navigate through all dashboard pages
   - Verify consistent UX (sidebar, navigation, data)

### Integration Notes

**Builder-1 + Builder-2 Integration:**
- Builder-2 adds buttons that link to routes
- Routes must work (Builder-1) for buttons to function
- Test flow: Empty state → Click "Add Account" → Navigate to accounts page

**Builder-3 Integration:**
- Run seed script after Builder-1 and Builder-2 complete
- Validates that hasData logic works correctly
- Tests transition from empty state to data state

### Potential Conflict Areas

**None expected** - all builders work on separate files:

- Builder-1: `layout.tsx`, `DashboardSidebar.tsx` (NEW files)
- Builder-2: `DashboardStats.tsx`, `RecentTransactionsCard.tsx` (MODIFY)
- Builder-3: `seed-demo-data.ts`, `package.json` (NEW + MODIFY)

**No file overlap** = no merge conflicts

---

## Post-Integration Checklist

After all builders complete and integrate:

### Functionality Testing

- [ ] All 7 dashboard routes return 200 (not 404)
- [ ] Sidebar visible on all dashboard pages
- [ ] Sidebar navigation works (click links → pages load)
- [ ] Active link highlights correctly
- [ ] Sign out button works
- [ ] Empty state shows for users with no data
- [ ] Empty state has action buttons
- [ ] Action buttons navigate correctly
- [ ] StatCards show for users with data
- [ ] Seed script creates valid data

### Code Quality

- [ ] TypeScript compiles: `npm run build`
- [ ] No console errors in browser
- [ ] No console warnings (except acceptable ESLint)
- [ ] All imports resolve correctly
- [ ] Code follows patterns.md conventions

### Visual QA

- [ ] Sidebar styled correctly (sage colors, proper spacing)
- [ ] Active link has sage-100 background
- [ ] Buttons have correct colors (sage-600 primary)
- [ ] Layout is responsive (no horizontal scroll)
- [ ] No layout shift when navigating
- [ ] Icons display correctly

### User Experience

- [ ] New user onboarding clear (empty state messaging)
- [ ] Navigation intuitive (sidebar always visible)
- [ ] Action buttons obvious (good contrast)
- [ ] Loading states work (skeleton for stats)
- [ ] Error states work (error messages display)

---

## Success Metrics

**Primary Goals:**

1. **404 Bug Fixed:** `/dashboard/transactions` returns 200 ✅
2. **Navigation Works:** All routes accessible via sidebar ✅
3. **Empty State Improved:** Action buttons guide users ✅
4. **Data Display Accurate:** StatCards show when appropriate ✅

**Secondary Goals (if time):**

5. **Seed Data Available:** Easy testing with realistic data ✅
6. **Code Quality:** Zero TypeScript errors ✅
7. **User Experience:** Smooth, intuitive navigation ✅

---

## Time Summary

**Optimistic (everything works first try):**
- Builder-1: 45 minutes
- Builder-2: 30 minutes
- Builder-3: 45 minutes
- Integration: 15 minutes
- **Total: 2 hours 15 minutes**

**Realistic (includes debugging):**
- Builder-1: 60 minutes (+ 15 min buffer)
- Builder-2: 40 minutes (+ 10 min buffer)
- Builder-3: 50 minutes (+ 5 min buffer)
- Integration: 20 minutes (+ 5 min buffer)
- **Total: 2 hours 50 minutes**

**Conservative (unexpected issues):**
- Add 30 minutes for unforeseen issues
- **Total: 3 hours 20 minutes**

**Recommended estimate: 2.5 hours** (realistic + small buffer)

---

**End of Builder Tasks**
