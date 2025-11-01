# Explorer 1 Report: Architecture & Structure

## Executive Summary

The Wealth app is a well-architected Next.js 14 application using modern full-stack patterns (tRPC, Prisma, Supabase). The USD→NIS currency migration requires systematic updates across 70+ files with 55 `formatCurrency()` usages. The architecture is production-ready with existing Vercel deployment configuration and comprehensive testing infrastructure (87 test files). The migration complexity is MEDIUM due to scope breadth rather than technical difficulty—the changes are mechanical and low-risk.

## Discoveries

### Application Architecture Overview

**Framework Stack:**
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript 5.7
- **API Layer**: tRPC 11.6 for type-safe APIs (no REST/OpenAPI overhead)
- **Database**: PostgreSQL via Prisma 5.22 ORM
- **Auth**: Supabase Auth (email/password, magic link, OAuth)
- **Styling**: Tailwind CSS 3.4 + Radix UI components
- **State Management**: TanStack Query (React Query) via tRPC
- **Charts**: Recharts 2.12 for analytics visualizations

**Deployment Configuration:**
- **Hosting**: Vercel (configured in `vercel.json`)
- **Database**: Supabase Production (connection details provided in vision)
- **Cron Jobs**: Vercel Cron (daily at 2 AM for recurring transactions)
- **GitHub**: Repository ready for CI/CD (`git@github.com:Ahiya1/wealth.git`)

### Currency Implementation Status (USD-ONLY)

**Current State: USD Exclusively**

The app has ALREADY undergone a multi-currency REMOVAL as documented in `/home/ahiya/Ahiya/SoverignityTracker/wealth/USD_ONLY_IMPLEMENTATION.md`:

**What was removed:**
- `ExchangeRate` model (deleted)
- `CurrencyConversionLog` model (deleted)
- `src/types/currency.ts` (deleted)
- `src/server/services/currency.service.ts` (deleted ~2000 lines)
- `src/server/api/routers/currency.router.ts` (deleted)
- Currency selector UI components (4 files deleted)
- Currency settings page (deleted)
- Exchange rate API integration (deleted)

**Current currency architecture:**
```typescript
// src/lib/constants.ts
export const CURRENCY_CODE = 'USD' as const
export const CURRENCY_SYMBOL = '$' as const
export const CURRENCY_NAME = 'US Dollar' as const

// src/lib/utils.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

**Database schema:**
- `User.currency` field: defaults to "USD" (kept for future extensibility)
- `Account.currency` field: defaults to "USD" (kept for future extensibility)
- Prisma schema comments indicate "USD-only, multi-currency not supported"

### File Structure & Entry Points

**Project Root:**
```
wealth/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── (auth)/              # Authentication pages (signin, signup, reset)
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── accounts/        # Account management
│   │   │   ├── transactions/    # Transaction management
│   │   │   ├── recurring/       # Recurring transactions
│   │   │   ├── budgets/         # Budget tracking
│   │   │   ├── goals/           # Financial goals
│   │   │   ├── analytics/       # Analytics & reports
│   │   │   ├── settings/        # User settings
│   │   │   └── admin/           # Admin panel (role-gated)
│   │   ├── api/                 # API routes
│   │   │   ├── trpc/            # tRPC endpoint
│   │   │   ├── cron/            # Cron job endpoints (Vercel Cron)
│   │   │   └── webhooks/        # Plaid webhooks
│   │   └── auth/                # Supabase auth callback
│   ├── components/              # React components
│   │   ├── accounts/            # Account-related components
│   │   ├── transactions/        # Transaction components
│   │   ├── budgets/             # Budget components
│   │   ├── goals/               # Goal components
│   │   ├── analytics/           # Chart components (7 files)
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── recurring/           # Recurring transaction components
│   │   ├── categories/          # Category management
│   │   ├── settings/            # Settings components
│   │   ├── admin/               # Admin-only components
│   │   └── ui/                  # Reusable UI primitives (Radix)
│   ├── lib/                     # Utilities & helpers
│   │   ├── constants.ts         # 🎯 CURRENCY CONSTANTS HERE
│   │   ├── utils.ts             # 🎯 formatCurrency() HERE
│   │   ├── csvExport.ts         # CSV export utilities
│   │   ├── jsonExport.ts        # JSON export utilities
│   │   ├── encryption.ts        # Plaid token encryption
│   │   ├── chartColors.ts       # Chart styling
│   │   ├── animations.ts        # Framer Motion animations
│   │   └── supabase/            # Supabase client setup
│   ├── server/                  # Backend logic
│   │   ├── api/                 # tRPC routers
│   │   │   ├── root.ts          # Root router (11 sub-routers)
│   │   │   └── routers/         # Feature-specific routers
│   │   │       ├── accounts.router.ts
│   │   │       ├── transactions.router.ts
│   │   │       ├── recurring.router.ts
│   │   │       ├── budgets.router.ts
│   │   │       ├── goals.router.ts
│   │   │       ├── analytics.router.ts
│   │   │       ├── categories.router.ts
│   │   │       ├── plaid.router.ts
│   │   │       ├── users.router.ts
│   │   │       └── admin.router.ts
│   │   └── services/            # Business logic services
│   │       ├── plaid.service.ts          # Plaid integration
│   │       ├── plaid-sync.service.ts     # Transaction sync
│   │       ├── recurring.service.ts      # Recurring logic
│   │       └── categorize.service.ts     # AI categorization
│   └── types/                   # TypeScript type definitions
├── prisma/
│   ├── schema.prisma            # 🎯 DATABASE SCHEMA (currency defaults)
│   └── seed.ts                  # Seed data
├── supabase/
│   └── config.toml              # Supabase local config
├── scripts/
│   ├── seed-demo-data.ts        # Demo data seeding
│   └── create-test-user.ts      # Test user creation
├── middleware.ts                # Supabase auth middleware
├── next.config.js               # Next.js configuration
├── vercel.json                  # 🎯 VERCEL DEPLOYMENT CONFIG
├── .env.example                 # Environment variable template
└── package.json                 # Dependencies
```

**Key Entry Points:**
1. **Currency Formatting**: `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/utils.ts` (line 13)
2. **Currency Constants**: `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/constants.ts` (lines 28-36)
3. **Database Schema**: `/home/ahiya/Ahiya/SoverignityTracker/wealth/prisma/schema.prisma` (lines 38, 142, 346-351)
4. **Vercel Config**: `/home/ahiya/Ahiya/SoverignityTracker/wealth/vercel.json` (cron job configuration)
5. **Environment Variables**: `/home/ahiya/Ahiya/SoverignityTracker/wealth/.env.example` (deployment credentials)

### Component Categories Affected by Currency Migration

**1. Dashboard Components (7 files):**
- `DashboardStats.tsx` - Net worth, income, expenses summary cards
- `NetWorthCard.tsx` - Total net worth display
- `IncomeVsExpensesCard.tsx` - Income/expense comparison
- `BudgetSummaryCard.tsx` - Budget progress
- `RecentTransactionsCard.tsx` - Recent transaction list
- `TopCategoriesCard.tsx` - Top spending categories
- `UpcomingBills.tsx` - Recurring bills widget

**2. Transaction Components (8 files):**
- `TransactionForm.tsx` - Create/edit transactions
- `TransactionCard.tsx` - Transaction list item
- `TransactionDetail.tsx` - Transaction detail view
- `TransactionDetailClient.tsx` - Client-side transaction page
- `AddTransactionForm.tsx` - Quick add transaction
- `TransactionListPage.tsx` - Transaction list page
- `CategorizationStats.tsx` - AI categorization stats
- `ExportButton.tsx` - CSV/JSON export (uses csvExport.ts)

**3. Account Components (4 files):**
- `AccountCard.tsx` - Account list card
- `AccountForm.tsx` - Create/edit account
- `AccountDetailClient.tsx` - Account detail page
- `AccountList.tsx` - Account list view

**4. Budget Components (2 files):**
- `BudgetForm.tsx` - Create/edit budget
- `BudgetCard.tsx` - Budget progress card

**5. Goal Components (4 files):**
- `GoalCard.tsx` - Goal progress card
- `GoalForm.tsx` - Create/edit goal
- `GoalDetailPageClient.tsx` - Goal detail page
- `GoalProgressChart.tsx` - Goal progress visualization
- `CompletedGoalCelebration.tsx` - Goal completion celebration

**6. Analytics Components (5 files - CHARTS):**
- `SpendingByCategoryChart.tsx` - Pie chart with $ tooltip (line 39)
- `SpendingTrendsChart.tsx` - Line chart with $ axis labels
- `MonthOverMonthChart.tsx` - Bar chart with $ formatting
- `NetWorthChart.tsx` - Area chart with $ axis
- `IncomeSourcesChart.tsx` - Bar chart with $ values

**7. Recurring Components (2 files):**
- `RecurringTransactionList.tsx` - Recurring bills/income list
- `RecurringTransactionForm.tsx` - Create/edit recurring

**8. Settings Components (1 file):**
- `ProfileSection.tsx` - User profile settings

**9. Admin Components (1 file):**
- `SystemMetrics.tsx` - Admin dashboard metrics

**10. Export Utilities (2 files):**
- `src/lib/csvExport.ts` - CSV export logic (currency in headers)
- `src/lib/jsonExport.ts` - JSON export logic (user.currency field)

### Currency Formatting Patterns Identified

**Pattern Analysis (55 usages of `formatCurrency()`):**

**Type 1: Direct Display (Most Common)**
```typescript
// Pattern: formatCurrency(amount)
<p>{formatCurrency(netWorth)}</p>
<span>{formatCurrency(Number(account.balance))}</span>
```
**Occurrences:** ~40 files

**Type 2: Chart Tooltips (Custom Formatting)**
```typescript
// Pattern: Manual $ + toLocaleString()
<p className="text-lg font-bold tabular-nums">
  ${Number(entry.value).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}
</p>
```
**Occurrences:** 5 chart components
**Risk:** These bypass `formatCurrency()` and need manual updates

**Type 3: Input Placeholders**
```typescript
// Pattern: Placeholder text with currency hints
<Input 
  placeholder="e.g., -45.00 for expense, 500.00 for income"
  type="number"
  step="0.01"
/>
```
**Occurrences:** Transaction/Budget/Goal forms
**Risk:** No currency symbol in placeholders currently

**Type 4: Database Defaults**
```typescript
// Pattern: Prisma schema defaults
model User {
  currency String @default("USD")
}
model Account {
  currency String @default("USD") // Always USD - multi-currency not supported
}
```
**Occurrences:** 2 models
**Action Required:** Change defaults to "NIS"

**Type 5: Export Metadata**
```typescript
// Pattern: Currency in export files
export function generateCompleteDataJSON(data: ExportData): string {
  const exportData = {
    user: {
      currency: data.user.currency, // "USD" → "NIS"
    },
    // ...
  }
}
```
**Occurrences:** csvExport.ts, jsonExport.ts

## Patterns Identified

### Pattern 1: Centralized Currency Formatting

**Description:** All currency formatting goes through a single utility function

**Implementation:**
```typescript
// src/lib/utils.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // 🎯 CHANGE TO 'ILS' (ISO code for NIS)
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

**Use Case:** Every component displaying currency values

**Example Usage:**
```typescript
// Dashboard stats
<p>{formatCurrency(netWorth)}</p>

// Transaction card
<span>{formatCurrency(Math.abs(Number(transaction.amount)))}</span>

// Budget progress
<div>{formatCurrency(remaining)}</div>
```

**Recommendation:** **STRONGLY RECOMMEND**
- Provides single point of change for currency migration
- Eliminates need to update 55+ individual call sites
- Handles symbol placement, decimal separators, thousands separators automatically
- **CRITICAL**: Must verify Intl.NumberFormat behavior for 'ILS' currency code

**NIS Formatting Requirements:**
- Symbol: ₪ (U+20AA) positioned AFTER amount
- Format: `1,234.56 ₪` (NOT `₪1,234.56`)
- Thousands separator: comma (,)
- Decimal separator: period (.)

**Verification Needed:**
```typescript
// Test this in browser console:
new Intl.NumberFormat('he-IL', { 
  style: 'currency', 
  currency: 'ILS' 
}).format(1234.56)
// Expected: "‏1,234.56 ₪"
// Verify symbol position matches requirement
```

### Pattern 2: Chart-Specific Currency Formatting (Bypasses Utility)

**Description:** Some chart components use inline currency formatting instead of `formatCurrency()`

**Implementation:**
```typescript
// src/components/analytics/SpendingByCategoryChart.tsx (line 39)
<p className="text-lg font-bold text-sage-600 tabular-nums">
  ${Number(entry.value).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}
</p>
```

**Use Case:** Chart tooltips, axis labels, legend formatters

**Example:**
```typescript
// Chart tooltip with custom formatting
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null
  const entry = payload[0]!
  return (
    <div>
      <p>${entry.value.toLocaleString('en-US', {...})}</p>
    </div>
  )
}
```

**Affected Files:**
1. `SpendingByCategoryChart.tsx` - Pie chart tooltip (line 39)
2. `SpendingTrendsChart.tsx` - Line chart axis formatter
3. `MonthOverMonthChart.tsx` - Bar chart tooltip
4. `NetWorthChart.tsx` - Area chart axis labels
5. `IncomeSourcesChart.tsx` - Bar chart values

**Recommendation:** **REFACTOR TO USE formatCurrency()**
- Replace inline `$` + `toLocaleString()` with `formatCurrency()`
- Ensures consistency with rest of app
- Reduces maintenance burden

**Migration Strategy:**
```typescript
// BEFORE
<p>${entry.value.toLocaleString('en-US', {...})}</p>

// AFTER
<p>{formatCurrency(entry.value)}</p>
```

### Pattern 3: Database Schema Currency Defaults

**Description:** Prisma schema defines default currency for User and Account models

**Implementation:**
```prisma
// prisma/schema.prisma
model User {
  id       String @id @default(cuid())
  email    String @unique
  currency String @default("USD") // 🎯 CHANGE TO "NIS"
  // ...
}

model Account {
  id       String @id @default(cuid())
  currency String @default("USD") // 🎯 CHANGE TO "NIS"
  // ...
}
```

**Use Case:** New user/account creation automatically gets currency set

**Recommendation:** **UPDATE SCHEMA + MIGRATION**
- Change both `@default("USD")` to `@default("NIS")`
- Run `npx prisma db push` to apply to production database
- Update schema comments: "NIS-only, multi-currency not supported"

**Migration Notes:**
- **Fresh deployment** (no existing production data) = No data migration needed
- Schema change only affects NEW records
- Existing test data in local dev will need re-seeding

### Pattern 4: Environment Variable Configuration

**Description:** Deployment configuration via `.env` files and Vercel dashboard

**Implementation:**
```bash
# .env.example
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
CRON_SECRET="..."
ENCRYPTION_KEY="..."
```

**Use Case:** Production Supabase connection, Vercel cron authentication

**Recommendation:** **CRITICAL DEPLOYMENT STEP**
- All 7 environment variables must be configured in Vercel dashboard
- Use **pooled connection string** for `DATABASE_URL` (with `?pgbouncer=true`)
- Use **direct connection** for `DIRECT_URL` (for migrations)
- Generate `CRON_SECRET` via: `openssl rand -hex 32`

**Vercel Environment Variables Required:**
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.compute.amazonaws.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://npylfibbutxioxjtcbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CRON_SECRET=[generate-new-secret]
ENCRYPTION_KEY=[existing-or-generate-new]
```

**Security Best Practices:**
- Never commit `.env.local` to git (already in `.gitignore`)
- Mark `SUPABASE_SERVICE_ROLE_KEY` as "Server-only" in Vercel
- Mark `CRON_SECRET` and `ENCRYPTION_KEY` as "Server-only"

### Pattern 5: Vercel Cron Job Configuration

**Description:** Recurring transaction generation via scheduled Vercel Cron

**Implementation:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Use Case:** Daily execution at 2 AM UTC to generate recurring transactions

**Recommendation:** **VERIFY CRON SECURITY**
- Endpoint protected by `CRON_SECRET` bearer token
- Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` header
- Middleware validates token before processing

**Cron Endpoint Implementation:**
```typescript
// src/app/api/cron/generate-recurring/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (token !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Generate recurring transactions...
}
```

**Post-Deployment Verification:**
```bash
# Test cron endpoint manually
curl -X GET https://[your-vercel-domain].vercel.app/api/cron/generate-recurring \
  -H "Authorization: Bearer [your-CRON_SECRET]"

# Expected: 200 OK with JSON response
```

## Complexity Assessment

### High Complexity Areas

**1. Currency Symbol Positioning (NIS-Specific)**
- **Complexity Driver:** NIS uses symbol-after format (`1,234.56 ₪`) unlike USD symbol-before (`$1,234.56`)
- **Risk:** `Intl.NumberFormat` behavior may vary across browsers/Node.js versions
- **Impact:** Affects all 55 `formatCurrency()` call sites
- **Estimated Builder Splits:** Not needed (centralized change)
- **Mitigation:**
  - Test `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })` behavior
  - Verify output matches `"1,234.56 ₪"` format (symbol after, space before symbol)
  - Add unit tests for `formatCurrency()` with NIS expectations
  - Visual QA all pages after change

**2. Chart Component Manual Currency Formatting**
- **Complexity Driver:** 5 chart components bypass `formatCurrency()` with inline `$` + `toLocaleString()`
- **Risk:** Easy to miss during migration, breaks visual consistency
- **Impact:** Chart tooltips, axis labels show wrong currency
- **Estimated Builder Splits:** Not needed (straightforward refactor)
- **Mitigation:**
  - Systematic grep for `\$.*toLocaleString` pattern
  - Replace with `formatCurrency()` calls
  - Test each chart component visually

**3. Database Schema Migration (Production Deployment)**
- **Complexity Driver:** Prisma schema changes require database push to production
- **Risk:** Migration failure could block deployment
- **Impact:** New users/accounts would get wrong currency default
- **Estimated Builder Splits:** Not needed (single operation)
- **Mitigation:**
  - Use `npx prisma db push` (NOT `prisma migrate dev` for fresh deployment)
  - Verify connection pooling: Use `DIRECT_URL` for migration, `DATABASE_URL` for queries
  - Test schema change on local Supabase first
  - Document rollback procedure (re-run old schema)

### Medium Complexity Areas

**1. Vercel Deployment Configuration**
- **Complexity:** 7 environment variables, GitHub integration, cron job setup
- **Time Estimate:** 1-2 hours
- **Steps:**
  - Create Vercel project, link to GitHub repo
  - Configure all env vars in Vercel dashboard
  - Enable automatic deployments on push to main
  - Trigger initial deployment
  - Verify build succeeds

**2. Supabase Production Setup**
- **Complexity:** Database migrations, RLS policies, connection pooling
- **Time Estimate:** 1-2 hours
- **Steps:**
  - Run `npx prisma db push` to production
  - Verify RLS policies are enabled (Supabase dashboard)
  - Test database connectivity from Vercel (check build logs)
  - Configure connection pooling (already in connection strings)

**3. GitHub Integration**
- **Complexity:** Commit currency changes, push to main, verify CI/CD
- **Time Estimate:** 30 minutes
- **Steps:**
  - Stage all currency migration changes
  - Commit with descriptive message
  - Push to main branch
  - Verify Vercel auto-deploys within 2-3 minutes
  - Check build status in GitHub/Vercel

### Low Complexity Areas

**1. Currency Constants Update**
- **File:** `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/constants.ts`
- **Change:**
  ```typescript
  // BEFORE
  export const CURRENCY_CODE = 'USD' as const
  export const CURRENCY_SYMBOL = '$' as const
  export const CURRENCY_NAME = 'US Dollar' as const
  
  // AFTER
  export const CURRENCY_CODE = 'NIS' as const
  export const CURRENCY_SYMBOL = '₪' as const
  export const CURRENCY_NAME = 'Israeli Shekel' as const
  ```
- **Time Estimate:** 5 minutes

**2. formatCurrency() Update**
- **File:** `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/utils.ts`
- **Change:**
  ```typescript
  // BEFORE
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  
  // AFTER
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS', // ISO 4217 code for NIS
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  ```
- **Time Estimate:** 10 minutes (including testing)

**3. Environment Variable Documentation**
- **File:** `/home/ahiya/Ahiya/SoverignityTracker/wealth/.env.example`
- **Change:** Update production Supabase credentials, document currency change
- **Time Estimate:** 10 minutes

## Technology Recommendations

### Primary Stack (Already in Place)

**Framework: Next.js 14 (App Router)**
- **Rationale:** 
  - Server Components reduce bundle size (dashboard-heavy app)
  - Built-in API routes eliminate separate backend
  - Vercel deployment is one-click with automatic CI/CD
  - Excellent TypeScript support
- **Currency Impact:** None (framework-agnostic)
- **Recommendation:** ✅ Keep as-is

**Database: PostgreSQL via Supabase**
- **Rationale:**
  - Production instance already provisioned
  - Connection pooling configured (PgBouncer)
  - Row Level Security for multi-tenancy
  - Built-in auth integration
- **Currency Impact:** Schema defaults need update (`@default("NIS")`)
- **Recommendation:** ✅ Keep as-is, update schema only

**ORM: Prisma 5.22**
- **Rationale:**
  - Type-safe database queries
  - Schema-first approach (single source of truth)
  - Migration tooling (`db push` for fresh deployments)
  - Excellent TypeScript integration
- **Currency Impact:** Schema change requires `npx prisma db push`
- **Recommendation:** ✅ Keep as-is

**API Layer: tRPC 11.6**
- **Rationale:**
  - End-to-end type safety (no OpenAPI overhead)
  - Auto-generated TypeScript types from backend
  - Integrated with TanStack Query for caching
  - No REST API maintenance burden
- **Currency Impact:** None (type-safe regardless of currency)
- **Recommendation:** ✅ Keep as-is

**Auth: Supabase Auth**
- **Rationale:**
  - Production-ready authentication
  - Email/password, magic link, OAuth providers
  - JWT-based sessions
  - Middleware integration for route protection
- **Currency Impact:** None
- **Recommendation:** ✅ Keep as-is

**Charts: Recharts 2.12**
- **Rationale:**
  - Declarative React API
  - Responsive by default
  - Wide range of chart types (line, bar, pie, area)
  - Good TypeScript support
- **Currency Impact:** Chart tooltips need manual currency formatting updates
- **Recommendation:** ✅ Keep as-is, refactor to use `formatCurrency()`

### Supporting Libraries

**date-fns 3.6.0**
- **Purpose:** Date formatting and manipulation
- **Why Needed:** Transaction dates, goal target dates, budget months
- **Currency Impact:** None

**zod 3.23.8**
- **Purpose:** Schema validation for forms and API inputs
- **Why Needed:** Type-safe form validation with react-hook-form
- **Currency Impact:** None (currency values validated as numbers)

**framer-motion 12.23**
- **Purpose:** UI animations (stagger animations, page transitions)
- **Why Needed:** Polished user experience (dashboard stats, goal celebrations)
- **Currency Impact:** None

**@anthropic-ai/sdk 0.32.1**
- **Purpose:** AI-powered transaction categorization
- **Why Needed:** Auto-suggest categories for transactions (optional feature)
- **Currency Impact:** None (categories are currency-agnostic)

**plaid 28.0.0**
- **Purpose:** Bank account integration (optional)
- **Why Needed:** Automatic transaction import
- **Currency Impact:** **CRITICAL - Plaid is US-centric**
- **Note:** Plaid integration explicitly excluded from MVP (not suitable for NIS)

## Integration Points

### External APIs

**1. Supabase Production API**
- **Purpose:** Database queries, authentication
- **Complexity:** LOW (already configured)
- **Considerations:**
  - Connection pooling via PgBouncer (port 6543)
  - Direct connection for migrations (port 5432)
  - RLS policies enforce multi-tenancy
  - Anon key for client-side, service role for server-side
- **Currency Impact:** None

**2. Vercel Deployment API**
- **Purpose:** Automatic deployments, cron job execution
- **Complexity:** LOW (configuration-based)
- **Considerations:**
  - GitHub integration for CI/CD
  - Environment variables via dashboard
  - Build logs for debugging
  - Cron job authentication via bearer token
- **Currency Impact:** None

**3. Anthropic API (Optional)**
- **Purpose:** AI-powered transaction categorization
- **Complexity:** LOW (optional feature)
- **Considerations:**
  - Requires `ANTHROPIC_API_KEY` env var
  - Gracefully degrades if key not present
  - User can manually categorize as fallback
- **Currency Impact:** None (categories are currency-agnostic)

**4. Plaid API (Optional - NOT IN MVP)**
- **Purpose:** Bank account integration
- **Complexity:** HIGH (not included in MVP)
- **Considerations:**
  - Plaid is US-centric (not suitable for Israeli banks)
  - Would require Israeli bank integration alternative
  - Encryption key for access token storage
- **Currency Impact:** HIGH (would require currency conversion if used)
- **Recommendation:** **EXCLUDE FROM MVP** (manual transaction entry only)

### Internal Integrations

**1. tRPC API Router ↔ React Components**
- **How They Connect:** 
  - Backend exports `AppRouter` type
  - Frontend imports via `trpc` client
  - Type-safe queries/mutations via TanStack Query hooks
- **Example:**
  ```typescript
  // Backend: src/server/api/routers/transactions.router.ts
  export const transactionsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => { ... }),
  })
  
  // Frontend: src/components/transactions/TransactionList.tsx
  const { data } = trpc.transactions.list.useQuery()
  ```
- **Currency Impact:** None (type-safe regardless of currency)

**2. Prisma Client ↔ tRPC Routers**
- **How They Connect:**
  - Prisma Client singleton in `src/lib/prisma.ts`
  - Injected into tRPC context (`ctx.prisma`)
  - All database queries go through Prisma
- **Example:**
  ```typescript
  // tRPC router
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.transaction.findMany({
      where: { userId: ctx.userId },
      include: { category: true, account: true },
    })
  })
  ```
- **Currency Impact:** Schema defaults propagate to all queries

**3. Middleware ↔ Supabase Auth**
- **How They Connect:**
  - `middleware.ts` intercepts all protected routes
  - Validates Supabase session via `supabase.auth.getUser()`
  - Fetches Prisma user to check role (for admin routes)
  - Redirects to `/signin` if unauthenticated
- **Example:**
  ```typescript
  // middleware.ts (line 64)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  ```
- **Currency Impact:** None

**4. CSV/JSON Export ↔ User Data**
- **How They Connect:**
  - Export utilities in `src/lib/csvExport.ts` and `src/lib/jsonExport.ts`
  - Triggered by "Export" buttons in Transaction/Budget/Goal pages
  - Fetches data via tRPC, formats to CSV/JSON
- **Example:**
  ```typescript
  // CSV Export
  const csv = generateTransactionCSV(transactions)
  downloadCSV(csv, 'transactions.csv')
  ```
- **Currency Impact:** CSV/JSON metadata includes `user.currency` field

## Risks & Challenges

### Technical Risks

**Risk 1: Intl.NumberFormat Symbol Positioning**
- **Impact:** HIGH - Affects all currency displays
- **Likelihood:** MEDIUM - Depends on browser/Node.js implementation
- **Description:** `Intl.NumberFormat` for 'ILS' currency may not position symbol correctly
- **Mitigation Strategy:**
  1. Test `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })` in:
     - Chrome DevTools console
     - Firefox DevTools console
     - Node.js REPL (Vercel runtime)
  2. Verify output matches `"1,234.56 ₪"` format (symbol AFTER amount)
  3. If incorrect, implement custom formatting:
     ```typescript
     export function formatCurrency(amount: number): string {
       const formatted = amount.toLocaleString('en-US', {
         minimumFractionDigits: 2,
         maximumFractionDigits: 2,
       })
       return `${formatted} ₪`
     }
     ```
  4. Add unit tests for `formatCurrency()` with NIS expectations

**Risk 2: Database Migration Failure**
- **Impact:** HIGH - Blocks deployment
- **Likelihood:** LOW - Fresh deployment, no data migration
- **Description:** `npx prisma db push` could fail due to connection issues or schema conflicts
- **Mitigation Strategy:**
  1. Test migration on local Supabase first: `npx supabase db reset`
  2. Use `DIRECT_URL` for migrations (NOT pooled connection)
  3. Verify Prisma schema syntax: `npx prisma validate`
  4. Document rollback: Re-run old schema if needed
  5. Check Supabase connection limits (max connections)

**Risk 3: Vercel Environment Variables Misconfiguration**
- **Impact:** MEDIUM - Build fails, app doesn't connect to database
- **Likelihood:** MEDIUM - Easy to typo or miss a variable
- **Description:** Missing or incorrect env vars cause runtime errors
- **Mitigation Strategy:**
  1. Pre-flight checklist: Verify all 7 env vars in Vercel dashboard
  2. Use `.env.example` as reference
  3. Test in Vercel preview deployment first (NOT production)
  4. Check build logs for "Missing environment variable" errors
  5. Use Vercel CLI `vercel env pull` to verify locally

**Risk 4: Chart Currency Formatting Inconsistency**
- **Impact:** MEDIUM - Charts show wrong currency, breaks trust
- **Likelihood:** MEDIUM - 5 files bypass `formatCurrency()`
- **Description:** Chart tooltips/axes still show `$` instead of `₪`
- **Mitigation Strategy:**
  1. Systematic grep: `grep -r "\\\$.*toLocaleString" src/components/analytics`
  2. Replace all inline `$` + `toLocaleString()` with `formatCurrency()`
  3. Visual QA every chart after change (pie, line, bar, area)
  4. Test tooltip hover states

### Complexity Risks

**Risk 1: Scope Creep (70+ Files Affected)**
- **Impact:** MEDIUM - Takes longer than estimated
- **Likelihood:** LOW - Most changes are mechanical
- **Description:** 70 files contain currency references, easy to miss some
- **Mitigation Strategy:**
  1. Systematic grep-based approach (not manual search)
  2. Change `formatCurrency()` FIRST (centralizes impact)
  3. Use TypeScript compiler to catch errors (`npm run build`)
  4. Visual QA checklist: Dashboard, Transactions, Analytics, Settings
  5. Test in Vercel preview before production deploy

**Risk 2: Builder Needs to Split (Too Many Files)**
- **Impact:** LOW - No split needed (changes are straightforward)
- **Likelihood:** LOW - Centralized currency formatting reduces complexity
- **Description:** 70 files might seem overwhelming, but changes are repetitive
- **Mitigation Strategy:**
  1. Prioritize `formatCurrency()` and constants (80% impact)
  2. Use search-and-replace for inline `$` symbols
  3. Schema change is single operation
  4. Visual QA is methodical but not complex

**Risk 3: Test Coverage Gaps**
- **Impact:** MEDIUM - Currency bugs slip into production
- **Likelihood:** MEDIUM - 87 test files may not cover currency edge cases
- **Description:** Existing tests may expect USD formatting
- **Mitigation Strategy:**
  1. Run test suite BEFORE migration: `npm run test`
  2. Update test expectations: Search for `"$"` in test files
  3. Add dedicated `formatCurrency()` unit tests
  4. Visual QA as primary validation method

## Recommendations for Planner

### 1. Centralize Currency Changes First (High Priority)

**Rationale:** Updating `formatCurrency()` in `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/utils.ts` and constants in `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/constants.ts` provides 80% impact with 5% effort.

**Action Items:**
- Change `currency: 'USD'` to `currency: 'ILS'` in `formatCurrency()`
- Change locale from `'en-US'` to `'he-IL'` for Hebrew/Israel formatting
- Update `CURRENCY_CODE`, `CURRENCY_SYMBOL`, `CURRENCY_NAME` constants
- Test output: Verify `"1,234.56 ₪"` format (symbol AFTER amount)

**Why First:**
- All 55 `formatCurrency()` call sites automatically updated
- No need to touch individual components
- TypeScript compiler catches breaking changes
- Reduces risk of missing files

### 2. Use Grep-Based Systematic Search (Not Manual)

**Rationale:** With 70+ files affected, manual search is error-prone. Systematic grep ensures nothing is missed.

**Grep Commands:**
```bash
# Find all formatCurrency usages
grep -rn "formatCurrency" src/

# Find inline $ symbols (chart tooltips)
grep -rn '\$' src/ --include="*.tsx" --include="*.ts"

# Find USD references
grep -rn "USD" src/

# Find dollar mentions in UI text
grep -ri "dollar" src/
```

**Post-Change Verification:**
```bash
# Verify no USD left
grep -r "USD" src/ | grep -v "node_modules" | grep -v ".next"

# Verify no $ left (except in comments/tests)
grep -r '\$' src/ --include="*.tsx" | grep -v "formatCurrency"
```

**Why Systematic:**
- Catches edge cases (comments, error messages, placeholder text)
- Provides audit trail of changes
- Can be re-run for verification

### 3. Test Intl.NumberFormat Before Committing

**Rationale:** NIS currency formatting behavior may vary across browsers/Node.js. Must verify BEFORE deployment.

**Test Script:**
```typescript
// Run in Node.js REPL or browser console
const testAmounts = [0, 1, 10, 100, 1000, 1234.56, -50.99]

testAmounts.forEach(amount => {
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  console.log(`${amount} → ${formatted}`)
})

// Expected outputs:
// 0 → ‏0.00 ₪
// 1 → ‏1.00 ₪
// 10 → ‏10.00 ₪
// 100 → ‏100.00 ₪
// 1000 → ‏1,000.00 ₪
// 1234.56 → ‏1,234.56 ₪
// -50.99 → ‏-50.99 ₪
```

**Validation Checklist:**
- [ ] Symbol (₪) appears AFTER amount (NOT before)
- [ ] Thousands separator is comma (,)
- [ ] Decimal separator is period (.)
- [ ] Always 2 decimal places
- [ ] Negative amounts show minus sign (-)

**Fallback (if Intl.NumberFormat fails):**
```typescript
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const absAmount = Math.abs(amount)
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}${formatted} ₪`
}
```

### 4. Use Vercel Preview Deployments for Testing

**Rationale:** Vercel allows preview deployments on non-main branches. Test currency changes in production-like environment BEFORE going live.

**Workflow:**
```bash
# 1. Create feature branch
git checkout -b currency-migration-nis

# 2. Make all currency changes
# ... edit files ...

# 3. Commit and push to feature branch
git add .
git commit -m "Migrate currency from USD to NIS"
git push origin currency-migration-nis

# 4. Vercel auto-deploys preview (if GitHub integration enabled)
# Preview URL: https://wealth-git-currency-migration-nis-ahiya1.vercel.app

# 5. Test preview deployment thoroughly
# - Visual QA all pages
# - Create test transaction
# - Verify charts show ₪
# - Test CSV/JSON export

# 6. If all good, merge to main for production deployment
git checkout main
git merge currency-migration-nis
git push origin main
```

**Why Preview First:**
- Zero risk to production
- Can test with production Supabase
- Easy rollback (just don't merge)
- Team can review preview URL

### 5. Update .env.example Immediately

**Rationale:** `.env.example` is the source of truth for deployment. Update it BEFORE deployment to avoid configuration errors.

**Changes Needed:**
```bash
# OLD
# CURRENCY - USD ONLY
# Wealth uses USD exclusively for production MVP

# NEW
# CURRENCY - NIS ONLY
# Wealth uses NIS (Israeli Shekel) exclusively for production MVP
# All amounts stored and displayed in ₪
```

**Add Production Credentials:**
```bash
# PRODUCTION SUPABASE (from vision.md)
NEXT_PUBLIC_SUPABASE_URL="https://npylfibbutxioxjtcbvy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# VERCEL CRON (generate new secret)
CRON_SECRET="[generate-with-openssl-rand-hex-32]"
```

**Why Immediate:**
- Deployment checklist reference
- Documents production credentials
- Prevents "what was that env var again?" issues

### 6. Document Rollback Procedure

**Rationale:** If currency migration causes production issues, need fast rollback path.

**Rollback Steps:**
```bash
# OPTION 1: Revert Git Commit
git revert [commit-hash-of-currency-migration]
git push origin main
# Vercel auto-deploys reverted version within 2-3 minutes

# OPTION 2: Revert Vercel Deployment
# In Vercel dashboard:
# 1. Go to Deployments tab
# 2. Find last working deployment (before currency migration)
# 3. Click "..." → "Redeploy"
# 4. Production reverted instantly

# OPTION 3: Environment Variable Rollback (if that's the issue)
# In Vercel dashboard:
# 1. Go to Settings → Environment Variables
# 2. Fix misconfigured variable
# 3. Redeploy current deployment
```

**Why Document:**
- Reduces panic during incident
- Faster recovery time
- Clear decision tree

## Resource Map

### Critical Files/Directories

**Currency Formatting Core:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/utils.ts` - `formatCurrency()` function (line 13)
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/constants.ts` - Currency constants (lines 28-36)

**Database Schema:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/prisma/schema.prisma` - User/Account currency defaults (lines 38, 142)

**Chart Components (Manual Formatting):**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/analytics/SpendingByCategoryChart.tsx` (line 39)
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/analytics/SpendingTrendsChart.tsx`
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/analytics/MonthOverMonthChart.tsx`
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/analytics/NetWorthChart.tsx`
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/components/analytics/IncomeSourcesChart.tsx`

**Export Utilities:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/csvExport.ts` - CSV export with currency metadata
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/jsonExport.ts` - JSON export with user.currency

**Deployment Configuration:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/vercel.json` - Vercel cron job configuration
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/.env.example` - Environment variable template
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/next.config.js` - Next.js build configuration

**Authentication & Middleware:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/middleware.ts` - Supabase auth protection
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/supabase/server.ts` - Supabase client setup

**Supabase Configuration:**
- `/home/ahiya/Ahiya/SoverignityTracker/wealth/supabase/config.toml` - Local Supabase config (ports, auth settings)

### Key Dependencies

**Production-Critical:**
- `next@14.2.33` - Framework (App Router, SSR, API routes)
- `@prisma/client@5.22.0` - Database ORM
- `@trpc/server@11.6.0` + `@trpc/client@11.6.0` - API layer
- `@supabase/supabase-js@2.58.0` - Supabase client
- `@supabase/ssr@0.5.2` - Supabase Server-Side Rendering
- `@tanstack/react-query@5.80.3` - Data fetching/caching
- `recharts@2.12.7` - Chart visualizations

**Development-Critical:**
- `prisma@5.22.0` - Schema migrations
- `typescript@5.7.2` - Type checking
- `vitest@3.2.4` - Testing framework
- `supabase@1.226.4` - Supabase CLI (local dev)

**Optional (Not in MVP):**
- `plaid@28.0.0` - Bank integration (US-only, excluded from MVP)
- `@anthropic-ai/sdk@0.32.1` - AI categorization (optional feature)

### Testing Infrastructure

**Test Framework:**
- Vitest 3.2.4 (fast, Vite-powered test runner)
- 87 test files covering routers, services, utilities

**Test Coverage:**
- Router tests: `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/server/api/routers/__tests__/`
- Service tests: `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/server/services/__tests__/`
- Utility tests: `/home/ahiya/Ahiya/SoverignityTracker/wealth/src/lib/__tests__/`

**Test Commands:**
```bash
npm run test              # Run all tests
npm run test:ui           # Run tests with UI
npm run test:coverage     # Run tests with coverage report
```

**Currency Migration Test Plan:**
1. Update test expectations: Search for `"$"` in test files
2. Add `formatCurrency()` unit tests for NIS
3. Run full test suite: `npm run test`
4. Visual QA (see below)

**Visual QA Checklist:**
- [ ] Dashboard stats show ₪
- [ ] Transaction list shows ₪
- [ ] Transaction form placeholder text updated
- [ ] Charts (pie, line, bar, area) show ₪ in tooltips/axes
- [ ] Budget cards show ₪
- [ ] Goal progress shows ₪
- [ ] Account balances show ₪
- [ ] CSV export shows NIS in metadata
- [ ] JSON export shows `"currency": "NIS"`
- [ ] Settings page displays NIS (if applicable)

## Questions for Planner

**1. Should we add a currency unit test for `formatCurrency()` before migration?**
- **Context:** Currently no dedicated tests for currency formatting
- **Options:**
  - A) Add unit test in iteration 1 (proactive)
  - B) Rely on visual QA (faster but riskier)
- **Recommendation:** Add basic unit test (5 minutes effort, high confidence)

**2. Should we test Intl.NumberFormat behavior in Vercel preview first?**
- **Context:** Symbol positioning may vary across Node.js versions
- **Options:**
  - A) Test in preview deployment before production (safer)
  - B) Test locally and assume production matches (faster)
- **Recommendation:** Use preview deployment (zero risk, worth 10 minutes)

**3. Should we update existing seed data to use realistic NIS amounts?**
- **Context:** Current seed data uses USD-range amounts (e.g., $50 for groceries)
- **Options:**
  - A) Update seed amounts to NIS-realistic values (e.g., 180 ₪ for groceries = ~$50)
  - B) Keep current amounts, just change currency symbol
- **Recommendation:** Keep current amounts (MVP focus), adjust later if needed

**4. Should we add a currency migration validation script?**
- **Context:** 70+ files affected, easy to miss edge cases
- **Options:**
  - A) Create script to grep for remaining USD/$ references (thorough)
  - B) Rely on TypeScript compiler + visual QA (standard approach)
- **Recommendation:** Use grep commands from "Recommendations" section (no script needed)

**5. Should we document Israeli shekel formatting conventions in code comments?**
- **Context:** Future developers may not know NIS formatting rules
- **Options:**
  - A) Add detailed comments in `formatCurrency()` explaining symbol-after format
  - B) Keep code clean, document in README/wiki
- **Recommendation:** Add brief comment in `formatCurrency()` (2 lines max)

**6. Should we enable Supabase email verification in iteration 1 or defer to iteration 2?**
- **Context:** Vision includes custom branded email templates
- **Options:**
  - A) Iteration 1: Basic email verification (default Supabase templates)
  - B) Iteration 2: Custom branded templates (as currently planned)
- **Recommendation:** Keep as iteration 2 (focus iteration 1 on currency + deployment)

**7. Should we add a pre-deployment smoke test checklist?**
- **Context:** First production deployment, many moving parts
- **Options:**
  - A) Create formal checklist in `.2L/plan-3/iteration-12/pre-deployment-checklist.md`
  - B) Use visual QA list from this report
- **Recommendation:** Use visual QA list (already comprehensive)

---

**Report Status:** COMPLETE
**Exploration Date:** 2025-11-01
**Next Step:** Planner reviews all explorer reports and synthesizes master plan
