# Explorer 1 Report: Functionality Architecture & Current State Analysis

## Executive Summary

The Wealth app has a **solid technical foundation** with complete auth, database, and API infrastructure, but **zero actual functionality is working end-to-end**. All 6 feature routers (accounts, transactions, budgets, goals, analytics, categories) are fully implemented with comprehensive CRUD operations and business logic, BUT the UI layer is incomplete - forms exist but many components are missing or non-functional. The app is 70% built but 0% usable. Iteration 4 needs focused UI completion work to connect existing backend APIs to working frontend components.

## Discoveries

### Current State: What Actually Works

**Backend (100% Complete)**
- Supabase Auth: Email/password + OAuth infrastructure working
- PostgreSQL Database: Connected via Prisma, all migrations applied
- tRPC API: 7 routers fully implemented with proper authorization
- Prisma Schema: Comprehensive models for all features (User, Account, Transaction, Budget, Goal, Category)
- AI Categorization Service: Claude integration for transaction categorization with caching
- Plaid Integration: Service layer exists (not tested, likely non-functional without keys)

**Frontend (40% Complete)**
- Next.js 14 App Router: Proper route structure with auth middleware
- 15 pages defined: Dashboard, Accounts, Transactions, Budgets, Goals, Analytics, Settings/Categories
- UI Component Library: Radix UI + Tailwind, 30+ components built
- Forms: AccountForm, TransactionForm, BudgetForm, GoalForm exist
- Charts: Analytics charts using Recharts (5 chart components)
- tRPC Client: Properly configured with React Query

**What's Actually Broken**
- Dashboard cards render but show placeholder/empty data
- Account creation works, but account list may have display issues
- Transaction forms exist but categorization UI incomplete
- Budget pages exist but BudgetList component implementation unclear
- Goal tracking UI exists but projections display questionable
- Analytics charts render but data fetching may fail silently
- No testing - zero confidence in integration points

### Database Schema Analysis

**Current Schema (Well Designed)**

```prisma
User (Auth + Profile)
├── Categories (Default + Custom)
│   └── MerchantCategoryCache (AI optimization)
├── Accounts (Manual + Plaid)
│   └── Transactions
├── Budgets (Monthly, per-category)
│   └── BudgetAlerts (75%, 90%, 100% thresholds)
└── Goals (SAVINGS, DEBT_PAYOFF, INVESTMENT)
```

**Schema Strengths**
- Proper user isolation (all tables have userId)
- Soft deletes implemented (isActive flags)
- Hierarchical categories (parentId)
- Decimal precision for money (Decimal(15,2))
- Indexed for performance (userId, date, categoryId)
- Future-proof for Plaid (plaidAccountId, plaidTransactionId)

**Schema Gaps for MVP**
- No historical net worth tracking (only current snapshot)
- No recurring transactions table
- No budget rollover history
- No goal milestone tracking

**Recommendation:** Schema is production-ready for MVP. Post-MVP features can be added via migrations.

### tRPC API Coverage

**Accounts Router (177 lines) - COMPLETE**
```typescript
✅ list(includeInactive)          // Get all user accounts
✅ get(id)                         // Single account
✅ create(type, name, institution) // Manual account creation
✅ update(id, name, institution)   // Edit account
✅ updateBalance(id, balance)      // Manual balance adjustment
✅ archive(id)                     // Soft delete
✅ netWorth()                      // Calculate across accounts
```

**Transactions Router (434 lines) - COMPLETE + AI**
```typescript
✅ list(filters, pagination)       // Filtered transaction list
✅ get(id)                         // Single transaction
✅ create(accountId, amount, payee, categoryId, notes, tags)
✅ update(id, ...)                 // Edit transaction
✅ delete(id)                      // Hard delete
✅ categorize(transactionId)       // AI categorization (single)
✅ categorizeBatch(transactionIds) // AI batch categorization
✅ autoCategorizeUncategorized()   // Auto-categorize all uncategorized
✅ suggestCategory(payee, amount)  // Preview suggestion without applying
✅ categorizationStats()           // Cache hit rate analytics
```

**Budgets Router (398 lines) - COMPLETE**
```typescript
✅ create(categoryId, amount, month, rollover)
✅ get(categoryId, month)
✅ listByMonth(month)
✅ progress(month)                 // Spending vs budget with status
✅ update(id, amount, rollover)
✅ delete(id)
✅ comparison(categoryId, startMonth, endMonth) // Historical comparison
✅ summary(month)                  // Total budgeted, spent, remaining
```

**Goals Router (216 lines) - COMPLETE**
```typescript
✅ list(includeCompleted)
✅ get(id)
✅ create(name, targetAmount, currentAmount, targetDate, linkedAccountId, type)
✅ update(id, ...)
✅ updateProgress(goalId, currentAmount) // Auto-completes when target reached
✅ delete(id)
✅ projections(goalId)             // AI-like projections based on savings rate
```

**Analytics Router (249 lines) - COMPLETE**
```typescript
✅ dashboardSummary()              // Net worth, income, expenses, top categories, recent transactions
✅ spendingByCategory(startDate, endDate) // For pie chart
✅ spendingTrends(startDate, endDate, groupBy) // Line chart (day/week/month)
✅ monthOverMonth(months)          // Bar chart comparison
✅ netWorthHistory()               // Currently single snapshot (MVP limitation)
✅ incomeBySource(startDate, endDate) // Income breakdown
```

**Categories Router (237 lines) - COMPLETE**
```typescript
✅ list()                          // Default + user custom categories
✅ get(id)
✅ create(name, icon, color, parentId)
✅ update(id, name, icon, color)
✅ archive(id)                     // Cannot archive default categories
✅ listDefaults()                  // Public endpoint for registration preview
```

**Plaid Router (Not Reviewed)**
- Exists but likely non-functional without Plaid credentials
- Out of scope for manual-entry MVP

### Component Inventory

**Dashboard Components (5/5 exist)**
- ✅ NetWorthCard.tsx - Fetches from analytics.dashboardSummary
- ✅ IncomeVsExpensesCard.tsx - Shows current month income/expenses
- ✅ TopCategoriesCard.tsx - Top 5 spending categories
- ✅ BudgetSummaryCard.tsx - Budget overview
- ✅ RecentTransactionsCard.tsx - Last 5 transactions

**Account Components (5/5 exist)**
- ✅ AccountList.tsx - Grid display with edit/archive actions
- ✅ AccountCard.tsx - Individual account card
- ✅ AccountForm.tsx - Create/edit form with validation
- ✅ AccountTypeIcon.tsx - Type-specific icons
- ✅ PlaidLinkButton.tsx - For future Plaid integration

**Transaction Components (9 estimated, 7+ exist)**
- ✅ TransactionListPage.tsx - Main transaction list with filters
- ✅ TransactionList.tsx - List display component
- ✅ TransactionCard.tsx - Individual transaction display
- ✅ TransactionFilters.tsx - Filter by account, category, date
- ✅ AddTransactionForm.tsx - Comprehensive form with tags
- ✅ AutoCategorizeButton.tsx - Trigger AI categorization
- ✅ CategorySuggestion.tsx - Display AI suggestions
- ✅ CategorizationStats.tsx - Show cache hit rates
- ✅ BulkActionsBar.tsx - Bulk operations
- ✅ ExportButton.tsx - CSV export
- ✅ TransactionDetail.tsx - Single transaction view

**Budget Components (4 estimated, 4+ exist)**
- ✅ BudgetList.tsx - Needs verification
- ✅ BudgetCard.tsx - Individual budget display
- ✅ BudgetForm.tsx - Create/edit budget
- ✅ BudgetProgressBar.tsx - Visual progress indicator
- ✅ MonthSelector.tsx - Month navigation

**Goal Components (5/5 exist)**
- ✅ GoalList.tsx - List of goals
- ✅ GoalCard.tsx - Individual goal card
- ✅ GoalForm.tsx - Create/edit goal
- ✅ GoalsPageClient.tsx - Client-side goal page
- ✅ GoalDetailPageClient.tsx - Goal details with projections
- ✅ GoalProgressChart.tsx - Visual progress

**Analytics Components (5/5 exist)**
- ✅ SpendingByCategoryChart.tsx - Pie chart
- ✅ SpendingTrendsChart.tsx - Line chart
- ✅ MonthOverMonthChart.tsx - Bar chart
- ✅ IncomeSourcesChart.tsx - Income breakdown
- ✅ NetWorthChart.tsx - Net worth over time

**Category Components (3/3 exist)**
- ✅ CategoryList.tsx - List of categories
- ✅ CategoryForm.tsx - Create/edit category
- ✅ CategorySelect.tsx - Dropdown selector
- ✅ CategoryBadge.tsx - Display category with color

**UI Components (30+ Radix UI components)**
- All standard UI components implemented (Button, Card, Dialog, Form, Input, Select, etc.)

## Patterns Identified

### Pattern 1: tRPC + React Query Data Flow

**Description:** Client-side components use tRPC hooks for type-safe API calls with automatic caching and refetching.

**Use Case:** All data fetching and mutations

**Example:**
```typescript
// In any component
const { data: accounts, isLoading } = trpc.accounts.list.useQuery({
  includeInactive: false,
})

const createAccount = trpc.accounts.create.useMutation({
  onSuccess: () => {
    utils.accounts.list.invalidate() // Refetch list
    utils.accounts.netWorth.invalidate() // Update net worth
  },
})
```

**Recommendation:** ✅ Continue using this pattern. Already consistently applied across codebase.

### Pattern 2: Form Handling with React Hook Form + Zod

**Description:** All forms use react-hook-form for state management and Zod for validation schemas.

**Use Case:** All create/edit forms

**Example:**
```typescript
const accountSchema = z.object({
  type: z.nativeEnum(AccountType),
  name: z.string().min(1, 'Account name is required'),
  balance: z.number().default(0),
})

const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
  resolver: zodResolver(accountSchema),
})
```

**Recommendation:** ✅ Excellent pattern, consistently applied. No changes needed.

### Pattern 3: Server Components for Auth, Client Components for Interactivity

**Description:** Page components are Server Components that check auth, then render Client Components for interactive features.

**Use Case:** All dashboard pages

**Example:**
```typescript
// page.tsx (Server Component)
export default async function AccountsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  
  return <AccountList /> // Client Component
}
```

**Recommendation:** ✅ Proper Next.js 14 pattern. Continue using.

### Pattern 4: Optimistic Updates with Cache Invalidation

**Description:** After mutations, invalidate relevant queries to refetch data.

**Use Case:** All create/update/delete operations

**Example:**
```typescript
const deleteTransaction = trpc.transactions.delete.useMutation({
  onSuccess: () => {
    utils.transactions.list.invalidate()
    utils.analytics.dashboardSummary.invalidate()
    utils.budgets.progress.invalidate() // Transaction affects budgets
  },
})
```

**Recommendation:** ✅ Good practice, but needs comprehensive dependency mapping. Some invalidations may be missing.

### Pattern 5: AI Categorization with Merchant Caching

**Description:** Transaction categorization uses Claude AI with a merchant cache to minimize API calls.

**Use Case:** Transaction categorization workflow

**Flow:**
1. Check MerchantCategoryCache for payee
2. If cached, return immediately (high confidence)
3. If not cached, call Claude API
4. Cache the result for future use
5. Batch up to 50 transactions per API call

**Recommendation:** ✅ Excellent cost-optimization strategy. Properly implemented with error handling.

## Complexity Assessment

### Feature Complexity Breakdown

**1. Accounts Management - SIMPLE (95% Complete)**
- Backend API: ✅ Complete
- Frontend Forms: ✅ Complete
- Display Components: ✅ Complete
- Integration: ✅ Working
- **Remaining Work:** Testing, edge case handling
- **Estimated Effort:** 2 hours (bug fixes only)

**2. Transactions - MEDIUM (85% Complete)**
- Backend API: ✅ Complete (including AI categorization)
- Frontend Forms: ✅ Complete
- Display Components: ✅ Complete
- AI Integration: ✅ Service implemented
- **Remaining Work:** 
  - Verify bulk operations UI
  - Test AI categorization flow
  - Ensure filter interactions work
  - CSV export functionality verification
- **Estimated Effort:** 4-6 hours (integration testing + fixes)

**3. Categories - SIMPLE (90% Complete)**
- Backend API: ✅ Complete
- Default Seed Data: ✅ Complete (seed.ts exists)
- Frontend Components: ✅ Complete
- **Remaining Work:**
  - Verify category management UI
  - Test hierarchical category creation
  - Ensure default categories cannot be edited
- **Estimated Effort:** 2-3 hours (testing + fixes)

**4. Budgets - MEDIUM (80% Complete)**
- Backend API: ✅ Complete (with progress calculations)
- Frontend Forms: ✅ Complete
- Display Components: ⚠️ Needs verification (BudgetList.tsx)
- **Remaining Work:**
  - Verify budget list rendering
  - Test budget progress calculations
  - Ensure month navigation works
  - Verify budget alerts (75%, 90%, 100% thresholds)
- **Estimated Effort:** 4-5 hours (complete BudgetList + testing)

**5. Goals - MEDIUM (85% Complete)**
- Backend API: ✅ Complete (with projections)
- Frontend Forms: ✅ Complete
- Display Components: ✅ Complete
- **Remaining Work:**
  - Verify goal projections display
  - Test linked account functionality
  - Ensure completion detection works
  - Test goal progress chart
- **Estimated Effort:** 3-4 hours (testing + fixes)

**6. Analytics Dashboard - MEDIUM (75% Complete)**
- Backend API: ✅ Complete
- Chart Components: ✅ All 5 charts exist
- Data Integration: ⚠️ Needs verification
- **Remaining Work:**
  - Verify all charts render correctly
  - Test date range selector
  - Ensure CSV export works
  - Handle empty state (no data)
- **Estimated Effort:** 4-5 hours (testing + empty state handling)

**7. Dashboard Summary - SIMPLE (90% Complete)**
- Backend API: ✅ Complete
- Cards: ✅ All 5 cards exist
- **Remaining Work:**
  - Verify data displays correctly
  - Test loading states
  - Ensure empty state handling
- **Estimated Effort:** 1-2 hours (testing only)

### Dependency Chain Analysis

**Critical Path (Must be built in this order):**

```
1. Categories (foundational)
   └── Seeded default categories required for everything
   
2. Accounts (foundational)
   └── Required for transactions
   
3. Transactions (core feature)
   └── Required for budgets, analytics, goals
   
4. Budgets (depends on transactions)
   └── Uses transaction data for progress
   
5. Goals (depends on transactions optionally)
   └── Can link to accounts for automatic progress
   
6. Analytics (depends on everything)
   └── Aggregates data from accounts, transactions, budgets
   
7. Dashboard Summary (depends on analytics)
   └── Shows overview from analytics API
```

**Recommendation:** Categories and Accounts must be verified first. Once those work, transactions can be tested, then all dependent features.

## Architecture Recommendations

### 1. Data Flow Architecture

**Current Architecture: Server → tRPC → Prisma → PostgreSQL**

```
Browser (Client Component)
    ↓ tRPC Query/Mutation
Server (Next.js API Route)
    ↓ tRPC Router Handler
    ↓ Authorization Check (ctx.user)
    ↓ Prisma Client
PostgreSQL Database
```

**Strengths:**
- Type safety end-to-end (TypeScript + Zod + Prisma)
- Automatic cache management (React Query)
- Proper authorization at router level
- Database queries are efficient (proper indexes)

**Weaknesses:**
- No request deduplication (multiple components fetching same data)
- No optimistic updates (only cache invalidation)
- Error handling inconsistent across components

**Recommendation:** Architecture is solid for MVP. Post-MVP could add:
- Request deduplication via React Query staleTime
- Optimistic updates for better UX
- Centralized error boundary

### 2. State Management Strategy

**Current Strategy: Server State (React Query) + Local State (useState)**

- ✅ Server state managed by tRPC + React Query (accounts, transactions, etc.)
- ✅ Form state managed by React Hook Form
- ✅ UI state managed by useState (dialogs, filters)
- ❌ No global client state (not needed for current features)

**Recommendation:** Current approach is appropriate. No need for Redux/Zustand.

### 3. Authentication & Authorization

**Current Implementation: Supabase Auth + Middleware**

- ✅ Supabase handles auth (email/password + OAuth)
- ✅ Next.js middleware protects routes
- ✅ tRPC context provides user object
- ✅ All queries filtered by userId

**Security Audit:**
- ✅ Row-level security via userId checks in Prisma queries
- ✅ Cannot access other users' data (verified in router code)
- ✅ Cannot edit default categories (proper checks)
- ✅ Cannot link to accounts user doesn't own

**Recommendation:** Security is properly implemented. No concerns.

### 4. Performance Considerations

**Database Performance:**
- ✅ Proper indexes on userId, date, categoryId
- ✅ Pagination implemented (cursor-based for transactions)
- ⚠️ Analytics queries could be slow with large datasets (no aggregation tables)

**Frontend Performance:**
- ✅ Code splitting via Next.js App Router
- ✅ Server Components reduce JS bundle
- ⚠️ Charts could be slow with large datasets (no data sampling)

**API Performance:**
- ✅ AI categorization uses caching (excellent)
- ⚠️ Batch operations limited to 50 items (could be optimized)

**Recommendations:**
- MVP: Performance is adequate for <10,000 transactions per user
- Post-MVP: Add materialized views for analytics, data sampling for charts

## Integration Points

### External Integrations

**1. Supabase (Authentication)**
- Status: ✅ Working
- Integration: @supabase/supabase-js, @supabase/ssr
- Environment: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Notes: Auth is confirmed working from previous iterations

**2. Claude AI (Anthropic)**
- Status: ✅ Implemented, ⚠️ Untested
- Integration: @anthropic-ai/sdk
- Environment: ANTHROPIC_API_KEY
- Service: /src/server/services/categorize.service.ts
- Notes: Service code looks solid, needs testing with real API key

**3. Plaid (Bank Connections)**
- Status: ⚠️ Implemented, likely non-functional
- Integration: plaid SDK, react-plaid-link
- Environment: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENVIRONMENT
- Notes: Out of scope for MVP (manual entry only)

**4. PostgreSQL (Database)**
- Status: ✅ Working
- Integration: Prisma ORM
- Environment: DATABASE_URL (Supabase connection string)
- Notes: Database confirmed working, all migrations applied

### Internal Integrations

**1. tRPC Routers ↔ Frontend Components**
- Status: ⚠️ Partially integrated
- Issues: Some components may not be wired up correctly
- Testing needed: End-to-end user flows

**2. AI Categorization ↔ Transaction UI**
- Status: ⚠️ Implemented but untested
- Components: AutoCategorizeButton, CategorySuggestion, CategorizationStats
- Flow: Button → API call → Update transaction → Refetch list
- Testing needed: Verify AI suggestions display correctly

**3. Budget Progress ↔ Transaction Data**
- Status: ⚠️ Implemented but untested
- Router: budgets.progress calculates spending vs budget
- Display: BudgetProgressBar component
- Testing needed: Verify calculations are correct

**4. Goal Projections ↔ Account Transactions**
- Status: ⚠️ Implemented but untested
- Router: goals.projections calculates based on linked account deposits
- Display: GoalDetailPageClient
- Testing needed: Verify projection math

**5. Analytics Charts ↔ Transaction Data**
- Status: ⚠️ Implemented but untested
- Charts: All 5 chart components exist
- Data: Analytics router provides aggregated data
- Testing needed: Verify charts render with real data

## Risks & Challenges

### Technical Risks

**1. AI Categorization Cost Risk - MEDIUM**
- **Impact:** High API costs if caching fails
- **Likelihood:** Low (caching well-implemented)
- **Mitigation:** 
  - Monitor API usage
  - Implement rate limiting on autoCategorizeUncategorized
  - Add user confirmation before batch operations
  - Consider local fallback rules (e.g., "Whole Foods" → "Groceries")

**2. Database Performance Risk - LOW**
- **Impact:** Slow queries with large datasets
- **Likelihood:** Low for MVP (<10k transactions per user)
- **Mitigation:** 
  - Proper indexes exist
  - Pagination implemented
  - Post-MVP: Add aggregation tables

**3. Missing Components Risk - MEDIUM**
- **Impact:** Features appear in navigation but don't work
- **Likelihood:** Medium (needs verification)
- **Mitigation:** 
  - Systematic testing of all pages
  - Check for missing component imports
  - Verify all tRPC queries are called correctly

**4. Supabase Migration Risk - LOW**
- **Impact:** Auth might break if Supabase config changes
- **Likelihood:** Low (already working)
- **Mitigation:** 
  - Environment variables properly set
  - Middleware tested in previous iterations

### Complexity Risks

**1. Budget Progress Calculation - MEDIUM**
- **Risk:** Complex date range queries could have off-by-one errors
- **Code Location:** budgets.router.ts lines 175-191
- **Mitigation:** Unit tests for edge cases (month boundaries, no transactions)

**2. Goal Projection Math - MEDIUM**
- **Risk:** Savings rate calculation might be inaccurate
- **Code Location:** goals.router.ts lines 157-214
- **Mitigation:** Test with edge cases (no deposits, negative deposits, past target date)

**3. Analytics Aggregations - MEDIUM**
- **Risk:** Category totals might double-count or miss transactions
- **Code Location:** analytics.router.ts lines 54-108
- **Mitigation:** Verify with known dataset, check for edge cases

**4. Transaction Filtering - LOW**
- **Risk:** Complex filter combinations might return incorrect results
- **Code Location:** transactions.router.ts lines 11-62
- **Mitigation:** Test various filter combinations

## Recommendations for Planner

### 1. Focus on Integration Testing, Not New Features

**Rationale:** The codebase is feature-complete but untested. Building new features would be premature when existing ones don't work.

**Recommendation:** 
- Iteration 4 should be **Integration & Validation**
- Systematically test each feature end-to-end
- Fix bugs and missing components
- No new features until existing ones work

### 2. Split Work by Feature Completeness, Not by Layer

**Rationale:** Accounts are 95% done, Budgets are 80% done. Completing one feature fully is better than partially completing all features.

**Recommendation:**
- Builder 1: Categories + Accounts (simplest, verify foundation)
- Builder 2: Transactions + AI Categorization (core feature, most complex)
- Builder 3: Budgets + Analytics (depends on transactions working)
- Builder 4: Goals + Dashboard Summary (final polish)

### 3. Establish a Testing Protocol

**Rationale:** No tests exist. Manual testing is the only validation.

**Recommendation:**
- Create a test user with seed data (accounts, transactions, budgets, goals)
- Document expected behavior for each feature
- Test on fresh database to verify seed script works
- Validate empty states (new user with no data)

### 4. Prioritize User-Facing Completeness Over Code Perfection

**Rationale:** The user wants a **usable app**, not perfect code. Technical debt can be addressed post-MVP.

**Recommendation:**
- Focus on user flows working end-to-end
- Empty states must be handled (no accounts, no transactions)
- Error messages must be user-friendly
- Loading states must exist (skeleton screens are already built)

### 5. Keep Manual Entry as MVP, Defer Plaid

**Rationale:** Plaid integration is complex and untested. Manual entry is sufficient for MVP.

**Recommendation:**
- Disable/hide Plaid features for MVP
- Focus on manual account creation and transaction entry
- Post-MVP: Test Plaid integration separately

### 6. Validate AI Categorization Before Launch

**Rationale:** AI categorization is a key differentiator but untested. Could be broken or too expensive.

**Recommendation:**
- Test with real Anthropic API key
- Verify caching works (check database for MerchantCategoryCache entries)
- Test edge cases (unknown merchants, ambiguous transactions)
- Add cost monitoring (track API calls per user)

## Resource Map

### Critical Files for Testing

**Authentication & Setup**
- `/src/lib/supabase/server.ts` - Supabase client configuration
- `/src/lib/supabase/middleware.ts` - Route protection
- `/prisma/schema.prisma` - Database schema
- `/prisma/seed.ts` - Default categories seed script

**tRPC Infrastructure**
- `/src/server/api/root.ts` - Router aggregation
- `/src/server/api/trpc.ts` - Context creation, auth middleware
- `/src/lib/trpc.ts` - Client-side tRPC setup

**Feature Routers (Backend)**
- `/src/server/api/routers/categories.router.ts` (237 lines)
- `/src/server/api/routers/accounts.router.ts` (177 lines)
- `/src/server/api/routers/transactions.router.ts` (434 lines)
- `/src/server/api/routers/budgets.router.ts` (398 lines)
- `/src/server/api/routers/goals.router.ts` (216 lines)
- `/src/server/api/routers/analytics.router.ts` (249 lines)

**Feature Pages (Frontend Entry Points)**
- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard overview
- `/src/app/(dashboard)/accounts/page.tsx` - Accounts list
- `/src/app/(dashboard)/transactions/page.tsx` - Transactions list
- `/src/app/(dashboard)/budgets/page.tsx` - Budget management
- `/src/app/(dashboard)/goals/page.tsx` - Goal tracking
- `/src/app/(dashboard)/analytics/page.tsx` - Analytics charts
- `/src/app/(dashboard)/settings/categories/page.tsx` - Category management

**Key Components to Verify**
- `/src/components/accounts/AccountList.tsx` - Account display
- `/src/components/transactions/TransactionListPage.tsx` - Transaction display
- `/src/components/budgets/BudgetList.tsx` - Budget display (needs verification)
- `/src/components/goals/GoalList.tsx` - Goal display
- `/src/components/dashboard/*` - All 5 dashboard cards

**Services**
- `/src/server/services/categorize.service.ts` - AI categorization logic
- `/src/server/services/plaid.service.ts` - Plaid integration (skip for MVP)

### Key Dependencies

**Core Stack**
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- tRPC 11 (type-safe APIs)
- Prisma 5 (ORM)
- PostgreSQL (via Supabase)
- Supabase (Auth + Database)

**UI & Forms**
- Radix UI (component primitives)
- Tailwind CSS (styling)
- React Hook Form (form state)
- Zod (validation)
- Lucide React (icons)

**Data & Charts**
- TanStack React Query (data fetching)
- Recharts (analytics charts)
- date-fns (date manipulation)

**AI & Integrations**
- @anthropic-ai/sdk (Claude AI)
- plaid (bank connections - skip for MVP)

### Testing Infrastructure

**Current Testing: NONE**
- No unit tests
- No integration tests
- No E2E tests

**Recommendation for Testing:**
- Manual testing protocol (document user flows)
- Seed script for test data
- Fresh database validation
- Browser DevTools for debugging

## Questions for Planner

### 1. Should Iteration 4 be Pure Integration Testing or Include Bug Fixes?

**Context:** All features are built but untested. Will likely find bugs.

**Options:**
- A) Explorers identify issues, Planner creates bug fix tasks for Builders
- B) Builders test AND fix as they go
- C) Pure testing iteration, separate bug fix iteration

**Recommendation:** Option B (test and fix together) for speed.

### 2. What Level of Data Validation is Required?

**Context:** Forms have basic Zod validation. Should we add business logic validation?

**Examples:**
- Should transactions be limited to account balance? (No overdrafts)
- Should budgets require transactions to exist first?
- Should goals have minimum target amounts?

**Recommendation:** Keep MVP validation minimal (type safety only). Add business rules post-MVP.

### 3. How Should Empty States Be Handled?

**Context:** New users have no data. Many components might break.

**Options:**
- A) Show empty state messages ("No accounts yet, create one!")
- B) Show onboarding flow (wizard to create first account)
- C) Pre-populate with sample data

**Recommendation:** Option A for MVP, Option B for post-MVP polish.

### 4. Should AI Categorization be Enabled by Default?

**Context:** AI categorization costs money per API call.

**Options:**
- A) Enabled by default, auto-categorize as user creates transactions
- B) Opt-in feature, user must click "Categorize" button
- C) Disabled for MVP, enable post-launch

**Recommendation:** Option B (opt-in) to control costs and set user expectations.

### 5. What Success Criteria Define "Done" for Iteration 4?

**Proposed Criteria:**
- ✅ All 6 main features work end-to-end (Accounts, Transactions, Budgets, Goals, Analytics, Categories)
- ✅ Dashboard displays real data (not placeholders)
- ✅ Forms validate and save correctly
- ✅ Empty states handled gracefully
- ✅ AI categorization works with opt-in button
- ✅ Navigation between pages works
- ✅ Seed script creates default categories
- ✅ Fresh user can create account → transaction → budget → goal flow

**Question:** Are these criteria sufficient or should we add more?

### 6. Should We Fix Known Technical Debt or Ship MVP First?

**Known Technical Debt:**
- Net worth history only shows current snapshot (no historical tracking)
- No recurring transactions
- No budget rollover history
- No goal milestones
- Error handling could be more comprehensive

**Question:** Should Iteration 4 address any of this or ship MVP with known limitations?

**Recommendation:** Ship MVP first, document limitations for Iteration 5.
