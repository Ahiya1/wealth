# Explorer 1 Report: User Management & Data Export Architecture

## Executive Summary

The Wealth application has a mature architecture with Next.js 14 App Router, tRPC, Prisma, and Supabase Auth. Adding user management and data export capabilities builds perfectly on existing patterns: CSV export foundation exists for transactions, AlertDialog components are ready for deletion confirmations, and the User model has profile fields (name, image). No theme infrastructure exists (single light theme only). The architecture supports these features with minimal additions - primarily extending existing routers, adding new tRPC endpoints, and creating 2-3 new components. **Estimated complexity: LOW-MEDIUM** (4-6 hours total).

**Key Findings:**
- CSV export pattern exists (`/src/lib/csvExport.ts`) for transactions - can be extended to budgets, goals, accounts
- User model has profile fields (name, image, email) but no update endpoint
- AlertDialog component fully implemented with confirmation patterns (used in BudgetList, TransactionList)
- NO theme system exists - single hardcoded light theme in `globals.css`
- Settings page is basic (only Categories link) - needs expansion for account settings
- Supabase Auth handles authentication - account deletion requires both Prisma AND Supabase cleanup
- Export functionality exists but only on transaction list page - needs centralized approach

---

## Discoveries

### Current Architecture Overview

**Technology Stack:**
- **Frontend:** Next.js 14.2.33 (App Router), React 18.3.1, TypeScript 5.7.2
- **Backend:** tRPC 11.6.0, Prisma 5.22.0, PostgreSQL (Supabase)
- **Auth:** Supabase Auth with SSR (@supabase/ssr 0.5.2)
- **UI:** Radix UI components, Tailwind CSS 3.4.1, Framer Motion 12.23.22
- **State:** React Query (via @tanstack/react-query 5.60.5)

**App Router Structure:**
```
src/app/
├── (auth)/                    # Authentication routes (signin, signup, reset)
├── (dashboard)/               # Protected routes (layout with sidebar)
│   ├── dashboard/            # Main dashboard
│   ├── accounts/             # Account management
│   ├── transactions/         # Transaction list & detail
│   ├── budgets/              # Budget tracking
│   ├── goals/                # Financial goals
│   ├── analytics/            # Charts & insights
│   └── settings/             # Settings (minimal - only categories)
├── layout.tsx                # Root layout (fonts, Toaster)
├── providers.tsx             # TRPCProvider wrapper
└── page.tsx                  # Landing page
```

**tRPC API Structure:**
```typescript
// src/server/api/root.ts
export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,         // EXISTS - basic onboarding endpoints
})
```

**Authentication Flow:**
1. Supabase Auth handles sign-in/sign-up (email/password)
2. Middleware (`/middleware.ts`) protects dashboard routes
3. tRPC context (`createTRPCContext`) syncs Supabase user to Prisma User
4. Protected procedures require authenticated user

**Database Schema (User Model):**
```prisma
model User {
  id             String    @id @default(cuid())
  supabaseAuthId String?   @unique  // Links to Supabase Auth
  email          String    @unique
  passwordHash   String?   // Legacy (Supabase handles auth now)
  name           String?   // Profile name
  image          String?   // Profile picture URL
  currency       String    @default("USD")
  timezone       String    @default("America/New_York")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // Onboarding tracking (from iteration 6)
  onboardingCompletedAt  DateTime?
  onboardingSkipped      Boolean    @default(false)
  isDemoUser             Boolean    @default(false)
  
  // Relations
  categories          Category[]
  accounts            Account[]
  transactions        Transaction[]
  budgets             Budget[]
  goals               Goal[]
}
```

### Existing Export Infrastructure

**CSV Export Foundation:**

File: `/src/lib/csvExport.ts`
```typescript
// Generates CSV for transactions with proper escaping
export function generateTransactionCSV(transactions: Transaction[]): string
export function downloadCSV(csvContent: string, filename: string): void
```

**Current Implementation:**
- Transaction CSV export: Date, Payee, Category, Account, Amount, Tags, Notes
- Proper quote escaping for text fields
- Client-side blob download
- Used in TransactionListPage via ExportButton component

**ExportButton Component Pattern:**

File: `/src/components/transactions/ExportButton.tsx`
```typescript
interface ExportButtonProps {
  filters?: ExportFilters
  onExport: (filters: ExportFilters) => Promise<{ csv: string; filename: string }>
}
```

**Current Limitations:**
- Only transactions have export functionality
- No JSON export option
- Export button only on transaction list page (not centralized)
- No bulk "export all data" functionality

**Extensibility Assessment:**
- **HIGH** - Clean abstraction, easy to replicate for budgets/goals/accounts
- Pattern: Create `generate{Entity}CSV()` functions in csvExport.ts
- Pattern: Add tRPC endpoint `{entity}.export` that returns CSV string
- Pattern: Reuse ExportButton component with different onExport callbacks

### Existing User Management

**Current State:**

File: `/src/server/api/routers/users.router.ts`
```typescript
export const usersRouter = router({
  me: publicProcedure.query(),              // Get current user
  completeOnboarding: protectedProcedure.mutation(),
  skipOnboarding: protectedProcedure.mutation(),
})
```

**What's Missing:**
- Update profile endpoint (name, image, timezone, currency)
- Account deletion endpoint
- Email change (complex - requires Supabase integration)
- Password change (handled by Supabase, but no UI)

**User Context in tRPC:**

File: `/src/server/api/trpc.ts`
```typescript
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  let user = null
  if (supabaseUser) {
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
    })
    
    // Auto-create user in Prisma on first sign-in
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

**Profile Data Sources:**
- Prisma User: name, image, currency, timezone (application-level)
- Supabase User: email, user_metadata (auth-level)
- **Critical:** Email changes must update BOTH Prisma AND Supabase

### Existing Settings Infrastructure

**Current Settings Page:**

File: `/src/app/(dashboard)/settings/page.tsx`
```typescript
const settingsSections = [
  {
    title: 'Categories',
    description: 'Manage income and expense categories',
    href: '/settings/categories',
  },
]
```

**Current Features:**
- Link to category management
- "Replay Product Tour" button (onboarding wizard)
- Very minimal - needs expansion

**Design Pattern:**
- Card-based navigation (link cards with icon, title, description, chevron)
- Sage color scheme (consistent with app)
- Responsive layout

**What Needs Adding:**
- Account Settings section (profile, preferences)
- Data Export section (export all data types)
- Danger Zone section (account deletion with warnings)

### Theme System Analysis

**Current Implementation:**

File: `/src/app/globals.css`
```css
@layer base {
  :root {
    /* Sage Green Palette */
    --sage-50: 140 10% 96%;
    --sage-600: 140 14% 33%;
    /* ... more color definitions ... */
    
    /* Semantic Tokens */
    --background: var(--warm-gray-50);
    --foreground: var(--warm-gray-900);
    --primary: var(--sage-600);
  }
}
```

**What Exists:**
- Single light theme hardcoded in CSS
- Color palette: Sage (primary), Warm Gray (neutral), Gold/Coral/Sky/Lavender (accents)
- No dark mode variants
- No theme toggle mechanism

**What Does NOT Exist:**
- Dark theme color palette
- Theme state management (localStorage, context)
- Theme toggle component
- System preference detection
- CSS variables for theme switching

**Implementation Complexity:**
- **MEDIUM-HIGH** - Requires:
  1. Define dark mode color palette (--sage-600-dark, etc.)
  2. Create ThemeProvider context
  3. Persist theme preference (localStorage)
  4. Support system preference (prefers-color-scheme)
  5. Update root className dynamically
  6. Ensure all components use CSS variables (they do)

**Alternative Approaches:**

**Option A: next-themes (Recommended)**
```bash
npm install next-themes
```
- Popular Next.js theme library (11k+ stars)
- Handles system preference, localStorage, SSR flash prevention
- ~5KB gzipped
- Used by shadcn/ui projects

**Option B: Manual Implementation**
- Custom ThemeProvider with useContext
- More control, no dependency
- ~100 lines of code
- Must handle SSR flash manually

**Recommendation:** Use next-themes for Iteration 7
- Faster implementation (1-2 hours vs 3-4 hours)
- Battle-tested SSR handling
- Easier system preference support

### Confirmation Dialog Patterns

**Existing AlertDialog Usage:**

File: `/src/components/budgets/BudgetList.tsx` (lines 154-175)
```typescript
<AlertDialog open={!!deletingBudgetId} onOpenChange={(open) => !open && setDeletingBudgetId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Budget</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete this budget? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={confirmDelete}
        className="bg-coral text-white hover:bg-coral/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Pattern for Destructive Actions:**
1. State: `const [deletingId, setDeletingId] = useState<string | null>(null)`
2. Trigger: Button sets deletingId
3. Dialog: Opens when deletingId is not null
4. Confirmation: AlertDialogAction calls mutation
5. Cleanup: onSuccess clears deletingId

**Enhancements for Account Deletion:**
- Multi-step confirmation (type "DELETE" to confirm)
- Show warning: "This will delete X transactions, Y budgets, Z goals"
- Checkbox: "I understand this cannot be undone"
- Red danger styling (coral color)
- Disable button until confirmation met

### Data Model Relationships

**User Deletion Cascade:**

From Prisma schema:
```prisma
model User {
  categories    Category[]     // onDelete: Cascade
  accounts      Account[]      // onDelete: Cascade
  transactions  Transaction[]  // onDelete: Cascade
  budgets       Budget[]       // onDelete: Cascade
  goals         Goal[]         // onDelete: Cascade
}
```

**Deletion Order (Foreign Keys):**
1. BudgetAlert (depends on Budget)
2. Budget (depends on User)
3. Goal (depends on User)
4. Transaction (depends on Account)
5. Account (depends on User)
6. Category (where userId is not null)
7. User record

**Critical:** Prisma cascade handles most cleanup, but:
- Supabase Auth user must be deleted separately
- Plaid access tokens should be revoked (if Plaid accounts exist)
- MerchantCategoryCache is global (don't delete)

**Data Count Calculation:**
```typescript
const stats = await prisma.$transaction([
  prisma.transaction.count({ where: { userId } }),
  prisma.account.count({ where: { userId } }),
  prisma.budget.count({ where: { userId } }),
  prisma.goal.count({ where: { userId } }),
])
```

---

## Patterns Identified

### Pattern 1: CSV Export Pattern

**Description:** Generate CSV from database entities with proper escaping

**Use Case:** Exporting transactions, budgets, goals, accounts

**Example:**
```typescript
// csvExport.ts
export function generateBudgetCSV(budgets: Budget[]): string {
  const headers = ['Month', 'Category', 'Budgeted', 'Spent', 'Remaining', 'Status']
  const headerRow = headers.join(',')
  
  const dataRows = budgets.map((budget) => {
    const row = [
      budget.month,
      `"${budget.category.name}"`,
      budget.budgetAmount.toString(),
      budget.spentAmount.toString(),
      budget.remainingAmount.toString(),
      budget.status,
    ]
    return row.join(',')
  })
  
  return [headerRow, ...dataRows].join('\n')
}

// Router
export const budgetsRouter = router({
  export: protectedProcedure
    .input(z.object({ month: z.string() }))
    .query(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: { userId: ctx.user.id, month: input.month },
        include: { category: true },
      })
      
      const csv = generateBudgetCSV(budgets)
      const filename = `budgets-${input.month}.csv`
      
      return { csv, filename }
    }),
})
```

**Recommendation:** Implement for all 4 data types (transactions exist, add budgets/goals/accounts)

### Pattern 2: JSON Export Pattern

**Description:** Export all user data as JSON for backup/portability

**Use Case:** Complete data backup, migration to other tools

**Example:**
```typescript
export const usersRouter = router({
  exportAllData: protectedProcedure.query(async ({ ctx }) => {
    const [accounts, transactions, budgets, goals, categories] = await Promise.all([
      ctx.prisma.account.findMany({ where: { userId: ctx.user.id } }),
      ctx.prisma.transaction.findMany({ 
        where: { userId: ctx.user.id },
        include: { category: true, account: true },
      }),
      ctx.prisma.budget.findMany({ 
        where: { userId: ctx.user.id },
        include: { category: true },
      }),
      ctx.prisma.goal.findMany({ 
        where: { userId: ctx.user.id },
        include: { linkedAccount: true },
      }),
      ctx.prisma.category.findMany({ where: { userId: ctx.user.id } }),
    ])
    
    const exportData = {
      exportedAt: new Date().toISOString(),
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
    
    const json = JSON.stringify(exportData, null, 2)
    const filename = `wealth-data-${new Date().toISOString().split('T')[0]}.json`
    
    return { json, filename }
  }),
})
```

**Recommendation:** Implement as single endpoint for complete data export

### Pattern 3: Multi-Step Deletion Confirmation

**Description:** Enhanced AlertDialog with typed confirmation and data preview

**Use Case:** Account deletion (high-impact, irreversible)

**Example:**
```typescript
interface DeleteAccountConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  dataStats: {
    transactionCount: number
    accountCount: number
    budgetCount: number
    goalCount: number
  }
}

export function DeleteAccountConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm,
  dataStats 
}: DeleteAccountConfirmationProps) {
  const [confirmText, setConfirmText] = useState('')
  const [understood, setUnderstood] = useState(false)
  
  const isConfirmed = confirmText === 'DELETE' && understood
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-coral">
            Delete Account Permanently?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{dataStats.transactionCount} transactions</li>
              <li>{dataStats.accountCount} accounts</li>
              <li>{dataStats.budgetCount} budgets</li>
              <li>{dataStats.goalCount} goals</li>
              <li>All categories and settings</li>
            </ul>
            <p className="font-semibold text-warm-gray-900">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Type DELETE to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              placeholder="DELETE"
            />
          </div>
          
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="understood"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="understood" className="text-sm">
              I understand this will permanently delete all my data and cannot be undone
            </label>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isConfirmed}
            className="bg-coral text-white hover:bg-coral/90 disabled:opacity-50"
          >
            Delete Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Recommendation:** Use for account deletion only (highest-impact action)

### Pattern 4: Theme Toggle Integration

**Description:** System-aware theme switcher with persistence

**Use Case:** Light/Dark/System theme selection

**Example (using next-themes):**
```typescript
// providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ThemeProvider>
  )
}

// ThemeToggle.tsx
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <div className="flex gap-2 p-1 bg-warm-gray-100 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'p-2 rounded-md transition-colors',
          theme === 'light' && 'bg-white shadow-sm'
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'p-2 rounded-md transition-colors',
          theme === 'dark' && 'bg-white shadow-sm'
        )}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'p-2 rounded-md transition-colors',
          theme === 'system' && 'bg-white shadow-sm'
        )}
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  )
}
```

**Recommendation:** Implement theme toggle in settings page with next-themes library

### Pattern 5: Profile Update Form

**Description:** Form for updating user profile (name, image, preferences)

**Use Case:** Account settings page

**Example:**
```typescript
export const usersRouter = router({
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
        currency: z.string().length(3).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.image !== undefined && { image: input.image }),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.timezone !== undefined && { timezone: input.timezone }),
        },
      })
    }),
})
```

**Recommendation:** Implement as standard form with react-hook-form (consistent with existing forms)

---

## Complexity Assessment

### High Complexity Areas

**1. Account Deletion Flow (MEDIUM-HIGH)**
- **Why Complex:**
  - Requires Supabase Auth deletion + Prisma deletion
  - Must revoke Plaid tokens if exists
  - Multi-step confirmation UI
  - Calculate data stats before deletion
  - Handle edge cases (failed Supabase delete, partial cleanup)
  
- **Estimated Builder Splits:** No split needed (4-5 hours total)
  - Part 1: tRPC deletion endpoint with cascade logic (2 hours)
  - Part 2: Confirmation UI with data preview (1.5 hours)
  - Part 3: Integration + edge case testing (1 hour)

- **Implementation Notes:**
  ```typescript
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Get data stats
    const stats = await getDataStats(ctx.user.id)
    
    // 2. Delete Prisma user (cascade handles relations)
    await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
    
    // 3. Delete Supabase Auth user
    const { error } = await ctx.supabase.auth.admin.deleteUser(
      ctx.supabaseUser.id
    )
    if (error) {
      // Rollback? Log error? User is orphaned in Supabase
      console.error('Failed to delete Supabase user:', error)
    }
    
    // 4. Revoke Plaid tokens (if any)
    // ... Plaid cleanup logic ...
    
    return { success: true, stats }
  })
  ```

**2. Theme System Implementation (MEDIUM)**
- **Why Complex:**
  - Define dark mode color palette (15+ colors)
  - Prevent SSR flash (script injection)
  - Test all components in dark mode
  - Ensure accessibility (WCAG contrast ratios)
  
- **Estimated Builder Splits:** No split needed (3-4 hours total)
  - Part 1: Install next-themes, create ThemeProvider (30 min)
  - Part 2: Define dark mode CSS variables (1.5 hours)
  - Part 3: Create ThemeToggle component (1 hour)
  - Part 4: Test all pages in dark mode (1 hour)

- **Dark Mode Color Palette:**
  ```css
  .dark {
    --background: 24 10% 11%;  /* Dark warm gray */
    --foreground: 24 6% 96%;   /* Light warm gray */
    --primary: 140 13% 56%;    /* Lighter sage for dark bg */
    --card: 24 9% 16%;
    --border: 24 7% 27%;
    /* ... etc ... */
  }
  ```

### Medium Complexity Areas

**1. JSON/CSV Export for All Data Types (MEDIUM)**
- **Why Medium:**
  - 4 export functions (budgets, goals, accounts + existing transactions)
  - JSON export aggregates all data
  - Needs proper serialization (Decimal, Date types)
  
- **Estimated Time:** 2-3 hours
  - generateBudgetCSV: 30 min
  - generateGoalCSV: 30 min
  - generateAccountCSV: 30 min
  - exportAllData JSON: 1 hour
  - Export UI integration: 30 min

**2. Account Settings Page (MEDIUM)**
- **Why Medium:**
  - Profile update form (name, image, currency, timezone)
  - Image upload (URL input for MVP, no file upload)
  - Currency/timezone dropdowns (100+ options)
  - Form validation
  
- **Estimated Time:** 2-3 hours
  - ProfileForm component: 1.5 hours
  - tRPC update endpoint: 30 min
  - Settings page layout: 1 hour

**3. Settings Page Reorganization (LOW-MEDIUM)**
- **Why Medium:**
  - Card-based navigation (4-5 sections)
  - Responsive grid layout
  - Icons for each section
  - Consistent with existing design
  
- **Estimated Time:** 1-2 hours
  - Page layout structure: 1 hour
  - Styling + responsiveness: 1 hour

### Low Complexity Areas

**1. Profile Display (LOW)**
- Show current profile in settings
- Read-only fields (email from Supabase)
- Estimated: 30 min

**2. Export Buttons Integration (LOW)**
- Add export buttons to existing list pages
- Reuse ExportButton component
- Estimated: 1 hour (4 pages × 15 min each)

**3. Theme Toggle UI (LOW)**
- ThemeToggle component (3 buttons)
- Integrate in settings page
- Estimated: 30 min (with next-themes)

---

## Technology Recommendations

### Primary Stack (No Changes Needed)

Current stack perfectly supports new requirements:

**Frontend:**
- **Next.js 14 App Router** - Server components for settings pages
- **React 18** - Client components for forms/toggles
- **Radix UI** - AlertDialog for confirmations ✅
- **Tailwind CSS** - Theme switching via class strategy
- **React Hook Form** - Profile form validation (consistent with existing forms)

**Backend:**
- **tRPC** - New endpoints for profile update, deletion, export
- **Prisma** - User model already has profile fields
- **Supabase** - Auth user deletion via admin API

### Supporting Libraries

**NEW Dependencies (1 only):**

```json
{
  "dependencies": {
    "next-themes": "^0.2.1"  // Theme management (5.5KB gzipped)
  }
}
```

**Why next-themes?**
- Handles SSR flash prevention automatically
- System preference detection built-in
- localStorage persistence
- Works with Tailwind class strategy
- Maintained, popular (11k+ stars)
- Used by shadcn/ui ecosystem

**Existing Dependencies (No Changes):**
- `@radix-ui/react-alert-dialog` ✅ (confirmation dialogs)
- `react-hook-form` ✅ (profile form)
- `@hookform/resolvers` + `zod` ✅ (form validation)
- `@supabase/supabase-js` ✅ (auth user deletion)
- `date-fns` ✅ (date formatting for exports)

### Code Patterns to Follow

**Pattern 1: Form Mutations (Existing)**
```typescript
// Follow existing pattern from AccountForm, GoalForm, etc.
const updateProfile = trpc.users.updateProfile.useMutation({
  onSuccess: () => {
    toast({ title: 'Profile updated successfully' })
    utils.users.me.invalidate()
  },
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' })
  },
})
```

**Pattern 2: Protected Procedures (Existing)**
```typescript
// All new endpoints use protectedProcedure
export const usersRouter = router({
  updateProfile: protectedProcedure.input(schema).mutation(),
  deleteAccount: protectedProcedure.mutation(),
  exportData: protectedProcedure.query(),
})
```

**Pattern 3: Confirmation Dialogs (Existing)**
```typescript
// Follow BudgetList.tsx pattern for delete confirmation
const [isDeleting, setIsDeleting] = useState(false)
// AlertDialog opens when isDeleting = true
// Confirmation triggers mutation
```

---

## Integration Points

### Internal Integrations

**1. Settings Page ↔ Account Settings Component**
- **Connection:** Settings page renders AccountSettings as route section
- **Data Flow:** tRPC query → User data → Profile form
- **Complexity:** LOW - standard page/component relationship

**2. Settings Page ↔ Theme Toggle**
- **Connection:** ThemeToggle component in settings
- **Data Flow:** next-themes context → Toggle state → localStorage
- **Complexity:** LOW - next-themes handles complexity

**3. Export Endpoints ↔ List Pages**
- **Connection:** Export buttons on Transactions, Budgets, Goals, Accounts pages
- **Data Flow:** Button click → tRPC query → CSV/JSON generation → Download
- **Complexity:** LOW - reuse existing ExportButton pattern

**4. Account Deletion ↔ Supabase Auth**
- **Connection:** Delete mutation calls Prisma + Supabase
- **Data Flow:** Confirmation → tRPC mutation → Prisma delete → Supabase admin.deleteUser
- **Complexity:** MEDIUM - requires Supabase admin API, error handling

**5. Profile Update ↔ Supabase User Metadata**
- **Connection:** Profile updates sync to Supabase user_metadata
- **Data Flow:** Form submit → Prisma update → Supabase updateUser (optional)
- **Complexity:** LOW-MEDIUM - consider syncing name/image to Supabase

### External Integrations

**1. Supabase Auth Admin API**
- **Purpose:** Delete user accounts
- **Endpoint:** `supabase.auth.admin.deleteUser(userId)`
- **Authentication:** Service role key (server-side only)
- **Complexity:** MEDIUM - requires admin client setup

**Setup Required:**
```typescript
// In tRPC context or deletion endpoint
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
```

**2. Plaid Token Revocation (Optional)**
- **Purpose:** Revoke access tokens when deleting account
- **Endpoint:** Plaid `/item/remove`
- **Complexity:** LOW - only if user has Plaid accounts
- **Implementation:** Call plaidService.revokeTokens() before deletion

### Database Schema Integration

**No schema changes needed** - All fields exist:
- User model has: name, image, currency, timezone ✅
- Cascade delete configured ✅
- No new tables required ✅

**Optional Enhancement:**
Add `deletedAt` field for soft delete (future consideration):
```prisma
model User {
  deletedAt  DateTime?  // Soft delete timestamp
}
```
**Recommendation:** Hard delete for MVP (simpler, follows cascade pattern)

---

## Risks & Challenges

### Technical Risks

**1. Supabase Auth Deletion Failure (HIGH IMPACT, LOW LIKELIHOOD)**
- **Scenario:** Prisma user deleted, but Supabase auth delete fails
- **Impact:** User cannot log in (auth exists) but has no data (orphaned)
- **Likelihood:** Low (network issue, permissions issue)
- **Mitigation:**
  ```typescript
  // Delete Supabase FIRST, rollback if fails
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    throw new TRPCError({ 
      code: 'INTERNAL_SERVER_ERROR', 
      message: 'Failed to delete auth account' 
    })
  }
  
  // Only proceed with Prisma delete if auth succeeded
  await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
  ```

**2. Dark Mode Accessibility Issues (MEDIUM IMPACT, MEDIUM LIKELIHOOD)**
- **Scenario:** Text contrast fails WCAG standards in dark mode
- **Impact:** App unusable for users with visual impairments
- **Likelihood:** Medium (easy to miss during testing)
- **Mitigation:**
  - Use contrast checker tools (WebAIM, Stark)
  - Test with browser DevTools accessibility tab
  - Follow Tailwind dark mode best practices
  - Ensure `--foreground` and `--background` have 7:1 contrast ratio

**3. CSV Export Encoding Issues (LOW IMPACT, MEDIUM LIKELIHOOD)**
- **Scenario:** Special characters (emoji, accents) break CSV parsing
- **Impact:** Exported file corrupted in Excel/Google Sheets
- **Likelihood:** Medium (users have diverse data)
- **Mitigation:**
  ```typescript
  // Use UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const csvContent = BOM + [headerRow, ...dataRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  ```

**4. JSON Export Size Limits (LOW IMPACT, LOW LIKELIHOOD)**
- **Scenario:** User has 10,000+ transactions, JSON export times out
- **Impact:** Export fails
- **Likelihood:** Low (most users have <1,000 transactions)
- **Mitigation:**
  - Add streaming for large exports (future)
  - For MVP: Document limitation (max 10,000 records)
  - Alternative: Paginated exports

### UX Risks

**1. Accidental Account Deletion (HIGH IMPACT, MEDIUM LIKELIHOOD)**
- **Scenario:** User clicks delete without understanding consequences
- **Impact:** Permanent data loss
- **Likelihood:** Medium (users skim warnings)
- **Mitigation:**
  - Multi-step confirmation (type "DELETE")
  - Show data count preview
  - Checkbox: "I understand"
  - Red danger styling throughout
  - Email confirmation link (future enhancement)

**2. Theme Toggle Confusion (LOW IMPACT, MEDIUM LIKELIHOOD)**
- **Scenario:** User doesn't understand "System" option
- **Impact:** Theme doesn't match expectation
- **Likelihood:** Medium (system theme is less intuitive)
- **Mitigation:**
  - Tooltip: "System: Matches your device settings"
  - Show current effective theme in UI
  - Default to "Light" instead of "System"

**3. Export File Not Opening (MEDIUM IMPACT, MEDIUM LIKELIHOOD)**
- **Scenario:** CSV file opens as garbage in Excel (encoding issue)
- **Impact:** User thinks export is broken
- **Likelihood:** Medium (Excel encoding quirks)
- **Mitigation:**
  - Use UTF-8 BOM (see above)
  - Provide "How to open in Excel" tooltip
  - Test on Windows Excel, Mac Excel, Google Sheets

### Security Risks

**1. Unauthorized Account Deletion (HIGH IMPACT, LOW LIKELIHOOD)**
- **Scenario:** CSRF attack triggers account deletion
- **Impact:** User account deleted without consent
- **Likelihood:** Low (tRPC has CSRF protection)
- **Mitigation:**
  - Ensure protectedProcedure is used ✅
  - Require typed confirmation ("DELETE") ✅
  - Rate limit deletion endpoint (future)

**2. Data Export Information Disclosure (MEDIUM IMPACT, LOW LIKELIHOOD)**
- **Scenario:** Export endpoint returns other users' data
- **Impact:** Data breach
- **Likelihood:** Very low (tRPC filters by ctx.user.id)
- **Mitigation:**
  - Code review all export queries
  - Ensure `where: { userId: ctx.user.id }` on all queries
  - Add integration tests for data isolation

---

## Recommendations for Planner

### 1. Single Builder for Full Feature (Don't Split)

**Rationale:**
- Total work: 12-15 hours (manageable for 1 builder)
- Features are tightly coupled (settings page → profile/theme/export/delete)
- No parallel work opportunities
- Integration testing easier with single owner

**Recommended Approach:**
- Builder owns: Settings page redesign + Account settings + Theme toggle + Exports + Deletion
- Timeline: 2 days
- Sequential implementation: Settings structure → Profile → Theme → Exports → Deletion

### 2. Use next-themes for Theme System

**Rationale:**
- Saves 2-3 hours vs manual implementation
- Battle-tested SSR handling
- Prevents common pitfalls (flash, localStorage sync)
- Small bundle size (5.5KB)

**Recommended Approach:**
```bash
npm install next-themes
```
- Wrap app in ThemeProvider (1 line in providers.tsx)
- Define dark mode CSS (1.5 hours)
- Create ThemeToggle component (30 min)

### 3. Implement Account Deletion Last

**Rationale:**
- Most complex feature (Supabase integration)
- Least likely to be used (edge case)
- Can be tested independently
- Allows time for security review

**Recommended Order:**
1. Settings page structure (1 hour)
2. Profile update (2 hours)
3. Theme toggle (2 hours)
4. CSV/JSON exports (3 hours)
5. Account deletion (4 hours)

### 4. CSV Exports Only (Skip PDF for MVP)

**Rationale:**
- PDF generation requires library (jsPDF, PDFKit)
- CSV covers 90% of export use cases
- Users can convert CSV to PDF if needed
- JSON export provides complete backup

**Recommended Approach:**
- Disable "Export as PDF" button (already exists in ExportButton)
- Focus on CSV quality (UTF-8 BOM, proper escaping)
- Add JSON export for full backup

### 5. Hard Delete (Not Soft Delete)

**Rationale:**
- MVP doesn't need account recovery
- Simplifies implementation
- Matches Prisma cascade pattern
- GDPR compliance (right to be forgotten)

**Recommended Approach:**
- Delete Supabase auth user first
- Prisma cascade handles relations
- No `deletedAt` field needed

### 6. Profile Image as URL (Not File Upload)

**Rationale:**
- No file storage setup required
- Users can use Gravatar, Imgur, etc.
- Consistent with Supabase user_metadata.avatar_url pattern
- File upload can be added later

**Recommended Approach:**
```typescript
<input
  type="url"
  placeholder="https://example.com/avatar.jpg"
  {...register('image')}
/>
```

### 7. Minimal Currency/Timezone Lists

**Rationale:**
- Full lists are 100+ options (overwhelming)
- Most users use 1-2 currencies
- Default to common options

**Recommended Approach:**
```typescript
const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
]
```

---

## Resource Map

### Critical Files to Create

**New Files (8 components + 4 export functions):**

```
src/app/(dashboard)/settings/
├── account/
│   └── page.tsx                      # Account settings page (profile, theme)

src/components/settings/
├── ProfileForm.tsx                   # Profile update form (name, image, currency, timezone)
├── ThemeToggle.tsx                   # Light/Dark/System toggle
├── DeleteAccountButton.tsx           # Delete account with confirmation
└── ExportAllDataButton.tsx          # Export all data as JSON

src/lib/
├── csvExport.ts                      # MODIFY: Add budget/goal/account CSV functions
└── jsonExport.ts                     # NEW: JSON export utilities

src/server/api/routers/
└── users.router.ts                   # MODIFY: Add profile update, delete, export endpoints
```

**Line Count Estimates:**
```
ProfileForm.tsx: ~120 lines (form, validation, submission)
ThemeToggle.tsx: ~40 lines (3 buttons, useTheme hook)
DeleteAccountButton.tsx: ~150 lines (confirmation dialog, data preview)
ExportAllDataButton.tsx: ~60 lines (JSON download)
account/page.tsx: ~80 lines (layout, sections)
csvExport.ts additions: ~100 lines (3 new functions)
jsonExport.ts: ~60 lines (data aggregation)
users.router.ts additions: ~150 lines (3 new endpoints)
```

### Files to Modify

**Existing Files (6 modifications):**

```
src/app/(dashboard)/settings/page.tsx
  + Add new navigation cards:
    - Account Settings (profile, theme)
    - Data Export (CSV, JSON)
    - Danger Zone (delete account)

src/app/layout.tsx
  + Wrap in ThemeProvider (next-themes)

src/app/globals.css
  + Add .dark { ... } color definitions (~50 lines)

src/app/providers.tsx
  + Import and use ThemeProvider

src/lib/csvExport.ts
  + Add generateBudgetCSV()
  + Add generateGoalCSV()
  + Add generateAccountCSV()

src/server/api/routers/users.router.ts
  + Add updateProfile mutation
  + Add deleteAccount mutation
  + Add exportAllData query
```

### Key Dependencies

**New:**
- `next-themes: ^0.2.1` - Theme management

**Existing (No Changes):**
- `@radix-ui/react-alert-dialog` ✅
- `react-hook-form` ✅
- `zod` ✅
- `@supabase/supabase-js` ✅

### Testing Checklist

**Manual Testing Required:**

1. **Profile Update**
   - [ ] Update name → Reflects in sidebar
   - [ ] Update image URL → Shows avatar
   - [ ] Update currency → Saved to database
   - [ ] Update timezone → Saved to database
   - [ ] Validation errors display correctly
   - [ ] Toast confirmation on success

2. **Theme Toggle**
   - [ ] Light mode works
   - [ ] Dark mode works
   - [ ] System mode respects OS setting
   - [ ] Preference persists on reload
   - [ ] No SSR flash
   - [ ] All pages readable in dark mode

3. **CSV Exports**
   - [ ] Transaction export works (existing)
   - [ ] Budget export works
   - [ ] Goal export works
   - [ ] Account export works
   - [ ] Special characters handled (emoji, quotes)
   - [ ] Files open correctly in Excel
   - [ ] Files open correctly in Google Sheets

4. **JSON Export**
   - [ ] All data included (accounts, transactions, budgets, goals, categories)
   - [ ] Valid JSON format
   - [ ] Dates formatted correctly
   - [ ] Decimal values converted to numbers

5. **Account Deletion**
   - [ ] Confirmation dialog shows correct data counts
   - [ ] Cannot confirm without typing "DELETE"
   - [ ] Cannot confirm without checkbox
   - [ ] Deletes Prisma user
   - [ ] Deletes Supabase auth user
   - [ ] Redirects to landing page after deletion
   - [ ] Cannot log in after deletion
   - [ ] Edge case: Supabase delete fails → Shows error

6. **Settings Page**
   - [ ] All navigation cards display
   - [ ] Links navigate correctly
   - [ ] Responsive on mobile
   - [ ] Icons display correctly
   - [ ] Matches app design system

### Time Estimates by Task

| Task | Complexity | Time | Dependencies |
|------|-----------|------|--------------|
| Settings page structure | LOW | 1 hour | None |
| Install next-themes | LOW | 15 min | None |
| Define dark mode CSS | MEDIUM | 1.5 hours | next-themes |
| ThemeToggle component | LOW | 30 min | next-themes, CSS |
| ProfileForm component | MEDIUM | 2 hours | None |
| Update profile endpoint | LOW | 30 min | None |
| Budget CSV export | LOW | 30 min | None |
| Goal CSV export | LOW | 30 min | None |
| Account CSV export | LOW | 30 min | None |
| JSON export function | MEDIUM | 1 hour | None |
| Export UI integration | LOW | 1 hour | CSV/JSON functions |
| Delete account endpoint | MEDIUM-HIGH | 2 hours | Supabase admin setup |
| Delete confirmation UI | MEDIUM | 1.5 hours | Delete endpoint |
| Testing & refinement | MEDIUM | 2 hours | All features |
| **TOTAL** | **MEDIUM** | **14.5 hours** | |

**Buffer:** 2 hours for edge cases, polish → **16-17 hours total**

---

## Questions for Planner

### Q1: Should Email Be Editable?

**Context:** Email is managed by Supabase Auth, requires email verification flow

**Options:**
- A) Read-only (show current email, link to Supabase change email flow)
- B) Allow change (complex - requires Supabase email change API + verification)
- C) Don't show email in profile form

**Recommendation:** Option A (read-only with external link)
- Email changes are rare
- Supabase handles verification properly
- Reduces complexity significantly
- Display email as read-only field with "Change email" link to Supabase hosted UI

### Q2: Should Theme Be Persisted to Database?

**Context:** next-themes stores theme in localStorage (client-only)

**Options:**
- A) localStorage only (standard next-themes behavior)
- B) Sync to User model (theme field in database)
- C) Hybrid (localStorage primary, database backup)

**Recommendation:** Option A (localStorage only)
- Faster (no network request)
- Simpler implementation
- Standard pattern
- Database sync adds complexity without benefit

### Q3: What Happens to Plaid Accounts on Deletion?

**Context:** Plaid-connected accounts have access tokens that should be revoked

**Options:**
- A) Leave tokens active (Plaid will clean up eventually)
- B) Revoke tokens before deletion (clean approach)
- C) Mark as deleted in Plaid dashboard (manual cleanup)

**Recommendation:** Option B (revoke tokens)
- Clean API hygiene
- Prevents orphaned tokens
- Low complexity (plaidService.revokeTokens exists)
- Add before Prisma delete in deletion flow

### Q4: Should We Support Account Recovery?

**Context:** After deletion, user may regret it

**Options:**
- A) Hard delete (no recovery)
- B) Soft delete (30-day recovery window)
- C) Email confirmation with delay (delete in 7 days)

**Recommendation:** Option A (hard delete for MVP)
- Simpler implementation
- Clear expectations (type "DELETE")
- Can add soft delete in future iteration
- GDPR-compliant (right to be forgotten)

### Q5: Export File Naming Convention?

**Context:** Users will accumulate multiple export files

**Options:**
- A) `transactions.csv` (static name)
- B) `transactions-2025-10-02.csv` (date stamped)
- C) `wealth-transactions-2025-10-02-1430.csv` (date + time)

**Recommendation:** Option B (date stamped)
- Unique per day (most common export frequency)
- Not too verbose
- Easy to identify latest
- Format: `{entity}-{YYYY-MM-DD}.{ext}`

### Q6: Currency List - Full or Minimal?

**Context:** ISO 4217 has 180+ currencies

**Options:**
- A) All 180+ currencies (comprehensive)
- B) Top 20 currencies (covers 95% of users)
- C) Custom input (let user type any code)

**Recommendation:** Option B (top 20 with search)
- Covers most users
- Not overwhelming
- Can expand later if needed
```typescript
const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL',
  'MXN', 'KRW', 'SGD', 'NZD', 'SEK', 'NOK', 'DKK', 'ZAR', 'HKD', 'RUB'
]
```

---

## Summary

### What We're Building

**Account Settings:**
- Profile form (name, image URL, currency, timezone)
- Read-only email display
- Save button with validation

**Theme Switcher:**
- Light/Dark/System toggle
- Persistent preference (localStorage)
- Dark mode color palette (~50 lines CSS)

**Data Export:**
- CSV export for: transactions ✅, budgets, goals, accounts
- JSON export for all data (complete backup)
- Export buttons on list pages
- "Export All Data" button in settings

**Account Deletion:**
- Multi-step confirmation dialog
- Type "DELETE" to confirm
- Checkbox: "I understand"
- Data preview (X transactions, Y budgets, etc.)
- Deletes Prisma + Supabase auth
- Revokes Plaid tokens if exists

**Settings Page Redesign:**
- 4 navigation sections:
  1. Preferences (Categories, existing)
  2. Account Settings (Profile, Theme)
  3. Data Export (CSV, JSON)
  4. Danger Zone (Delete Account)

### What We're NOT Building

- Password change UI (Supabase handles via magic link)
- Email change UI (Supabase hosted flow)
- File upload for profile image (URL only)
- PDF exports (CSV + JSON sufficient)
- Account recovery/soft delete (hard delete only)
- Database-synced theme preference
- Multi-language support
- Data import functionality

### Success Criteria

**Iteration 7 is complete when:**
1. ✅ User can update profile (name, image, currency, timezone)
2. ✅ User can toggle theme (light/dark/system)
3. ✅ Theme persists across sessions
4. ✅ User can export CSV for all 4 data types
5. ✅ User can export JSON with all data
6. ✅ User can delete account with multi-step confirmation
7. ✅ Deletion removes Prisma + Supabase auth
8. ✅ Settings page has clear navigation structure
9. ✅ All features work on mobile
10. ✅ Dark mode passes accessibility standards (WCAG AA)

### Estimated Effort

**Total Time:** 16-17 hours

**Complexity:** MEDIUM

**Team:** 1 Builder

**Timeline:** 2-3 days

**Critical Path:**
1. Settings structure (1 hour)
2. Theme system (2.5 hours)
3. Profile form (2.5 hours)
4. Exports (4 hours)
5. Deletion (4 hours)
6. Testing (2 hours)

---

**End of Report**
