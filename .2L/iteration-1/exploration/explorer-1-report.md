# Explorer 1 Report: Architecture & Structure

## Executive Summary

The Wealth application is a single-user, full-stack personal finance dashboard built on Next.js 14 App Router with tRPC for type-safe APIs, Prisma for database management, and NextAuth.js for authentication. The architecture follows a layered approach with clear separation between presentation (React Server/Client Components), business logic (tRPC routers), data access (Prisma), and external integrations (Plaid, Claude API, Resend). The system requires 8 core data models with complex relationships and 3 major external integrations that will serve as the primary complexity drivers.

---

## Architecture Overview

### High-Level Architecture Pattern

**Pattern: Layered Monolith with Service-Oriented Boundaries**

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                    │
│  Next.js 14 App Router (React Server Components + Client)   │
│  ├─ Pages (RSC): Dashboard, Transactions, Budgets, etc.     │
│  ├─ Components (Client): Forms, Charts, Interactivity       │
│  └─ Layouts: Auth Layout, Dashboard Layout                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                        API LAYER (tRPC)                      │
│  Type-Safe API Routes with Input Validation                 │
│  ├─ auth.router.ts                                          │
│  ├─ accounts.router.ts                                      │
│  ├─ transactions.router.ts                                  │
│  ├─ budgets.router.ts                                       │
│  ├─ analytics.router.ts                                     │
│  ├─ goals.router.ts                                         │
│  ├─ categories.router.ts                                    │
│  └─ mindfulness.router.ts                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│  Business Logic & External Integrations                     │
│  ├─ PlaidService: Bank connection, transaction sync         │
│  ├─ CategorizeService: AI categorization via Claude         │
│  ├─ EmailService: Password reset, alerts via Resend         │
│  ├─ AnalyticsService: Calculations, aggregations            │
│  └─ BudgetService: Budget tracking, alert logic             │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                       │
│  Prisma ORM + PostgreSQL                                    │
│  ├─ User, Account, Transaction, Budget models               │
│  ├─ Goal, Category, BudgetAlert models                      │
│  └─ MindfulnessEntry, ValueDefinition models                │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  ├─ Plaid API (sandbox): Bank connections, transactions     │
│  ├─ Claude API: AI categorization                           │
│  └─ Resend: Email notifications                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**

1. **Next.js 14 App Router** - Enables React Server Components for reduced client bundle, built-in API routes, and seamless deployment to Vercel
2. **tRPC** - Provides end-to-end type safety eliminating API contract issues, auto-generates TypeScript types from backend to frontend
3. **Prisma ORM** - Type-safe database access, excellent migration tooling, perfect for PostgreSQL
4. **Service Layer Pattern** - Isolates complex integrations (Plaid, Claude) making them testable and replaceable
5. **Server-First Data Fetching** - Use RSC for initial data loads, React Query (via tRPC) for mutations and client-side updates

---

## Component Breakdown

### 1. Authentication & Session Management

**Components:**
- `LoginForm` (Client Component) - Email/password + Google OAuth button
- `RegisterForm` (Client Component) - Email/password registration
- `PasswordResetForm` (Client Component) - Request and complete password reset
- `AuthProvider` (Client Component) - NextAuth.js session provider
- `ProfileSettings` (Client Component) - User profile management

**Technical Details:**
- NextAuth.js configuration at `/src/app/api/auth/[...nextauth]/route.ts`
- Credentials provider for email/password (bcrypt hashing)
- Google OAuth provider
- JWT strategy with HttpOnly cookies
- Session middleware to protect routes
- Custom pages for sign-in, sign-up, error

**Data Flow:**
```
User → LoginForm → tRPC auth.login → NextAuth signIn() → Session Cookie → Protected Routes
```

**Complexity: MEDIUM-HIGH**
- Multiple authentication providers
- Password reset flow with email
- Session management across app
- CSRF protection

---

### 2. Account Management Module

**Components:**
- `AccountsList` (Server Component) - Display all accounts with balances
- `ConnectPlaidButton` (Client Component) - Plaid Link integration
- `AddManualAccountForm` (Client Component) - Manual account creation
- `AccountCard` (Client Component) - Individual account display with actions
- `AccountDetailsModal` (Client Component) - Edit account details
- `PlaidLinkHandler` (Client Component) - Handles Plaid OAuth flow

**Technical Details:**
- Plaid Link integration using React SDK
- Store Plaid access tokens encrypted in database
- Webhook endpoint for Plaid updates: `/api/webhooks/plaid`
- Background job to sync transactions from Plaid
- Manual account support for non-Plaid accounts

**Data Flow:**
```
User → ConnectPlaidButton → Plaid Link UI → Plaid API → Exchange Public Token 
→ Store Access Token (encrypted) → Fetch Accounts → Store in DB → Display
```

**Complexity: HIGH**
- Plaid SDK integration
- Token exchange and secure storage
- Webhook handling for real-time updates
- Account reconnection flow (when Plaid access expires)
- Balance syncing logic

---

### 3. Transaction Tracking Module

**Components:**
- `TransactionsList` (Server Component) - Paginated transaction list
- `TransactionRow` (Client Component) - Individual transaction display
- `AddTransactionForm` (Client Component) - Manual transaction entry
- `TransactionFilters` (Client Component) - Search, filter, date range
- `SplitTransactionModal` (Client Component) - Split transaction across categories
- `BulkActionsToolbar` (Client Component) - Bulk categorize, delete
- `TransactionSyncButton` (Client Component) - Trigger Plaid sync

**Technical Details:**
- Server-side pagination (cursor-based for performance)
- Client-side filtering with debounced search
- AI categorization using Claude API (structured output)
- Transaction sync service polls Plaid API
- Optimistic updates for instant UI feedback

**Data Flow - Auto Import:**
```
Plaid Webhook → /api/webhooks/plaid → Fetch Transactions → Claude API (categorize)
→ Batch Insert → Notify UI
```

**Data Flow - Manual Entry:**
```
User → AddTransactionForm → tRPC transactions.create → Claude API (categorize)
→ Insert Transaction → Invalidate Query → UI Update
```

**Complexity: HIGH**
- AI categorization with Claude API
- Split transaction logic
- Bulk operations with optimistic updates
- Search/filter performance with large datasets
- Real-time sync from Plaid

---

### 4. Category Management Module

**Components:**
- `CategoriesList` (Server Component) - Display category hierarchy
- `CategoryIcon` (Client Component) - Icon + color display
- `AddCategoryForm` (Client Component) - Create custom category
- `CategorySettings` (Client Component) - Edit icons, colors, hierarchy
- `CategoryTree` (Client Component) - Hierarchical category visualization

**Technical Details:**
- Seed script to populate default categories
- Self-referential relationship for parent/child categories
- Category icons from icon library (lucide-react)
- Color picker for category customization
- Archive categories instead of delete (data integrity)

**Data Flow:**
```
Initial Load: Seed Script → Insert Default Categories
User Custom: AddCategoryForm → tRPC categories.create → Insert → Refresh List
```

**Complexity: LOW-MEDIUM**
- Hierarchical data structure (adjacency list)
- Icon/color customization
- Archive vs. delete logic
- Seed script for defaults

---

### 5. Budget Management Module

**Components:**
- `BudgetsList` (Server Component) - Monthly budget overview
- `BudgetCard` (Client Component) - Individual budget with progress bar
- `CreateBudgetForm` (Client Component) - Set budget amount by category
- `BudgetProgressBar` (Client Component) - Visual progress with color coding
- `BudgetHistoryChart` (Client Component) - Past budget performance
- `BudgetAlertSettings` (Client Component) - Configure alert thresholds

**Technical Details:**
- Real-time calculation of budget spent (aggregate transactions)
- Color coding: Green (<75%), Yellow (75-95%), Red (>95%)
- Budget rollover calculation (carry unused to next month)
- Email alerts via Resend when thresholds crossed
- Background job to check budgets daily
- Budget templates (recurring monthly budgets)

**Data Flow:**
```
User → CreateBudgetForm → tRPC budgets.create → Insert Budget
Transaction Added → Recalculate Budget Spent → Check Threshold → Send Alert (if needed)
```

**Complexity: MEDIUM-HIGH**
- Real-time aggregation calculations
- Alert threshold monitoring
- Rollover calculation logic
- Template management
- Email notification integration

---

### 6. Analytics & Insights Module

**Components:**
- `Dashboard` (Server Component) - Main dashboard page
- `NetWorthCard` (Server Component) - Current net worth display
- `IncomeVsExpensesChart` (Client Component) - Bar chart comparison
- `SpendingByCategoryChart` (Client Component) - Pie chart
- `SpendingTrendsChart` (Client Component) - Line chart over time
- `TopCategoriesWidget` (Server Component) - Top 5 spending categories
- `RecentTransactionsWidget` (Server Component) - Last 10 transactions
- `BudgetStatusWidget` (Server Component) - Budget progress summary
- `CustomReportBuilder` (Client Component) - Date range, filter, export
- `ExportButton` (Client Component) - CSV export functionality

**Technical Details:**
- Heavy use of Prisma aggregations for performance
- Chart library: Recharts (smaller bundle than Chart.js)
- CSV export using papaparse
- Date range filtering with date-fns
- Caching strategy for expensive calculations (React Cache API)

**Data Flow:**
```
Dashboard Load → Parallel Data Fetches (Server Components):
  ├─ Net Worth (sum accounts)
  ├─ Monthly Income/Expenses (aggregate transactions)
  ├─ Top Categories (group by category, sum amounts)
  ├─ Recent Transactions (order by date, limit 10)
  └─ Budget Status (join budgets with transaction sums)
→ Render Components
```

**Complexity: MEDIUM**
- Complex aggregation queries
- Chart rendering performance
- CSV export with proper formatting
- Caching strategy for performance
- Date range calculations

---

### 7. Goals & Planning Module

**Components:**
- `GoalsList` (Server Component) - Display all goals
- `GoalCard` (Client Component) - Individual goal with progress
- `CreateGoalForm` (Client Component) - Create savings/debt goals
- `GoalProgressBar` (Client Component) - Visual progress indicator
- `ProjectionCalculator` (Client Component) - Calculate completion date
- `MonthlyContributionSuggestion` (Server Component) - Suggest monthly savings
- `DebtPayoffCalculator` (Client Component) - Snowball vs. avalanche

**Technical Details:**
- Projection algorithm based on current savings rate
- Debt payoff calculations (with interest)
- Goal milestone tracking
- Optional account linking for automatic progress updates
- Celebration UI when goal completed

**Data Flow:**
```
User → CreateGoalForm → tRPC goals.create → Insert Goal
Manual Update: UpdateProgressButton → tRPC goals.updateProgress → Update Amount
Automatic Update (if linked account): Account Balance Change → Calculate Delta 
→ Update Goal Progress
```

**Complexity: MEDIUM**
- Projection algorithms
- Debt payoff calculations (with interest formulas)
- Account linking logic
- Milestone tracking

---

### 8. Mindful Finance Features Module

**Components:**
- `SpendingReflectionPrompt` (Client Component) - Post-transaction reflection
- `FinancialAffirmation` (Server Component) - Display daily affirmation
- `GratitudeJournal` (Client Component) - Log financial gratitude
- `ValuesDefinition` (Client Component) - Define financial values
- `ValuesAlignmentReport` (Server Component) - Show values-aligned spending %
- `TransactionMoodTag` (Client Component) - Tag transactions with feelings

**Technical Details:**
- Reflection prompts triggered after transaction creation
- Affirmation rotation (random from library)
- Gratitude entries stored with date
- Values tagging on categories
- Alignment report calculates % of spending on valued categories

**Data Flow:**
```
Transaction Created → Show Reflection Prompt (optional) → Save Reflection
Dashboard Load → Fetch Random Affirmation → Display
Values Defined → Tag Categories → Calculate Alignment (aggregate) → Display Report
```

**Complexity: LOW-MEDIUM**
- Simple CRUD operations
- Aggregation for alignment percentage
- UI/UX for mindful prompts
- Affirmation rotation logic

---

## File Structure

### Recommended Next.js 14 App Router Structure

```
/home/ahiya/Ahiya/wealth/
├── .2L/                              # 2L protocol workspace
│   └── iteration-1/
│       ├── exploration/              # Explorer reports
│       ├── plans/                    # Planner outputs
│       ├── builds/                   # Builder workspaces
│       └── validation/               # Validation results
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Migration files
│   └── seed.ts                       # Seed default categories
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth layout group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx            # Auth-specific layout
│   │   │
│   │   ├── (dashboard)/              # Dashboard layout group
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Main dashboard
│   │   │   ├── accounts/
│   │   │   │   ├── page.tsx          # Accounts list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Account details
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx          # Transactions list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Transaction details
│   │   │   ├── budgets/
│   │   │   │   ├── page.tsx          # Budgets overview
│   │   │   │   └── [month]/
│   │   │   │       └── page.tsx      # Monthly budget detail
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx          # Analytics dashboard
│   │   │   │   ├── spending/
│   │   │   │   │   └── page.tsx      # Spending analysis
│   │   │   │   ├── income/
│   │   │   │   │   └── page.tsx      # Income analysis
│   │   │   │   └── net-worth/
│   │   │   │       └── page.tsx      # Net worth tracking
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx          # Goals list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Goal details
│   │   │   ├── mindfulness/
│   │   │   │   ├── page.tsx          # Mindfulness dashboard
│   │   │   │   ├── reflections/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── gratitude/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── values/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # General settings
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── categories/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # Dashboard layout with sidebar
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts      # NextAuth.js configuration
│   │   │   ├── trpc/
│   │   │   │   └── [trpc]/
│   │   │   │       └── route.ts      # tRPC handler
│   │   │   └── webhooks/
│   │   │       ├── plaid/
│   │   │       │   └── route.ts      # Plaid webhook handler
│   │   │       └── resend/
│   │   │           └── route.ts      # Email webhook handler
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   └── globals.css               # Global styles (Tailwind)
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── PasswordResetForm.tsx
│   │   │   └── AuthProvider.tsx
│   │   │
│   │   ├── accounts/
│   │   │   ├── AccountsList.tsx
│   │   │   ├── AccountCard.tsx
│   │   │   ├── ConnectPlaidButton.tsx
│   │   │   ├── AddManualAccountForm.tsx
│   │   │   └── PlaidLinkHandler.tsx
│   │   │
│   │   ├── transactions/
│   │   │   ├── TransactionsList.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── AddTransactionForm.tsx
│   │   │   ├── TransactionFilters.tsx
│   │   │   ├── SplitTransactionModal.tsx
│   │   │   └── BulkActionsToolbar.tsx
│   │   │
│   │   ├── budgets/
│   │   │   ├── BudgetsList.tsx
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── CreateBudgetForm.tsx
│   │   │   ├── BudgetProgressBar.tsx
│   │   │   └── BudgetHistoryChart.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── NetWorthCard.tsx
│   │   │   ├── IncomeVsExpensesChart.tsx
│   │   │   ├── SpendingByCategoryChart.tsx
│   │   │   ├── SpendingTrendsChart.tsx
│   │   │   ├── TopCategoriesWidget.tsx
│   │   │   ├── RecentTransactionsWidget.tsx
│   │   │   ├── BudgetStatusWidget.tsx
│   │   │   └── CustomReportBuilder.tsx
│   │   │
│   │   ├── goals/
│   │   │   ├── GoalsList.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── CreateGoalForm.tsx
│   │   │   ├── GoalProgressBar.tsx
│   │   │   └── ProjectionCalculator.tsx
│   │   │
│   │   ├── mindfulness/
│   │   │   ├── SpendingReflectionPrompt.tsx
│   │   │   ├── FinancialAffirmation.tsx
│   │   │   ├── GratitudeJournal.tsx
│   │   │   ├── ValuesDefinition.tsx
│   │   │   └── ValuesAlignmentReport.tsx
│   │   │
│   │   ├── categories/
│   │   │   ├── CategoriesList.tsx
│   │   │   ├── CategoryIcon.tsx
│   │   │   ├── AddCategoryForm.tsx
│   │   │   └── CategoryTree.tsx
│   │   │
│   │   └── shared/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── server/                       # Server-side code
│   │   ├── api/
│   │   │   ├── root.ts               # tRPC app router
│   │   │   ├── trpc.ts               # tRPC initialization
│   │   │   └── routers/
│   │   │       ├── auth.router.ts
│   │   │       ├── accounts.router.ts
│   │   │       ├── transactions.router.ts
│   │   │       ├── budgets.router.ts
│   │   │       ├── analytics.router.ts
│   │   │       ├── goals.router.ts
│   │   │       ├── categories.router.ts
│   │   │       └── mindfulness.router.ts
│   │   │
│   │   ├── services/
│   │   │   ├── plaid.service.ts      # Plaid integration
│   │   │   ├── categorize.service.ts # Claude AI categorization
│   │   │   ├── email.service.ts      # Resend email service
│   │   │   ├── analytics.service.ts  # Analytics calculations
│   │   │   └── budget.service.ts     # Budget logic
│   │   │
│   │   ├── db/
│   │   │   └── client.ts             # Prisma client singleton
│   │   │
│   │   └── auth/
│   │       ├── config.ts             # NextAuth.js config
│   │       └── session.ts            # Session utilities
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── utils.ts                  # General utilities
│   │   ├── validators.ts             # Zod schemas
│   │   ├── constants.ts              # App constants
│   │   ├── encryption.ts             # Encryption utilities
│   │   └── date.ts                   # Date utilities (date-fns)
│   │
│   ├── types/                        # TypeScript types
│   │   ├── index.ts                  # Exported types
│   │   ├── plaid.ts                  # Plaid types
│   │   ├── api.ts                    # API types
│   │   └── database.ts               # Database types
│   │
│   └── hooks/                        # Custom React hooks
│       ├── useAuth.ts                # Auth hook
│       ├── useAccounts.ts            # Accounts hook
│       ├── useTransactions.ts        # Transactions hook
│       ├── useBudgets.ts             # Budgets hook
│       └── useDebounce.ts            # Debounce hook
│
├── tests/
│   ├── unit/                         # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── components/
│   ├── integration/                  # Integration tests
│   │   ├── api/
│   │   └── database/
│   └── e2e/                          # E2E tests (Playwright)
│       ├── auth.spec.ts
│       ├── accounts.spec.ts
│       ├── transactions.spec.ts
│       ├── budgets.spec.ts
│       └── goals.spec.ts
│
├── public/                           # Static assets
│   ├── images/
│   └── icons/
│
├── .env.example                      # Environment variable template
├── .env.local                        # Local environment variables (gitignored)
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── next.config.js                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.ts                # Tailwind configuration
├── package.json                      # Dependencies
└── README.md                         # Setup instructions

```

**Key Structural Decisions:**

1. **Route Groups** - Use `(auth)` and `(dashboard)` for different layouts without affecting URL structure
2. **Server Components by Default** - Data fetching happens on server, only use 'use client' when needed
3. **tRPC Organization** - One router per domain module (8 routers total)
4. **Service Layer** - Isolate external integrations for testability
5. **Component Co-location** - Components organized by feature, not by type
6. **Shared UI Components** - shadcn/ui in `/components/ui/` for consistency

---

## Data Flow

### 1. Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Action: Login with Email/Password                      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  LoginForm (Client Component)                                │
│  - Collect email/password                                    │
│  - Validate with Zod schema                                  │
│  - Call signIn() from next-auth/react                        │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  NextAuth.js Handler (/api/auth/[...nextauth]/route.ts)     │
│  - Verify credentials                                        │
│  - Query user from database via Prisma                       │
│  - Compare password with bcrypt                              │
│  - Generate JWT token                                        │
│  - Set HttpOnly cookie                                       │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Redirect to /dashboard                                      │
│  - Session available via getServerSession()                  │
│  - Middleware protects routes                                │
└──────────────────────────────────────────────────────────────┘
```

**Google OAuth Flow:**
```
User → Click Google Button → NextAuth redirects to Google → Google Auth → 
Callback to /api/auth/callback/google → Create/Find User → Session Created → 
Redirect to /dashboard
```

**Password Reset Flow:**
```
User → Request Reset → Generate Token → Store in DB → Send Email (Resend) → 
User Clicks Link → Validate Token → Reset Password → Clear Token → Login
```

---

### 2. Plaid Account Connection Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Action: Click "Connect Bank Account"                   │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  ConnectPlaidButton (Client Component)                       │
│  - Call tRPC plaid.createLinkToken                           │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  tRPC accounts.createPlaidLinkToken                          │
│  - Call Plaid API to create link_token                       │
│  - Return link_token to client                               │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Plaid Link UI (Modal)                                       │
│  - User selects bank (Chase, Wells Fargo, etc.)             │
│  - User enters credentials                                   │
│  - Plaid OAuth flow completes                                │
│  - Returns public_token to client                            │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  PlaidLinkHandler onSuccess callback                         │
│  - Call tRPC accounts.connectPlaidAccount(public_token)      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  tRPC accounts.connectPlaidAccount                           │
│  - Exchange public_token for access_token (Plaid API)        │
│  - Encrypt access_token with AES-256                         │
│  - Fetch account details from Plaid                          │
│  - Create Account records in database                        │
│  - Trigger initial transaction sync                          │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Display Connected Accounts                                  │
│  - Invalidate accounts query                                 │
│  - React Query refetches                                     │
│  - UI updates with new accounts                              │
└──────────────────────────────────────────────────────────────┘
```

**Plaid Webhook Flow (Transaction Updates):**
```
Plaid → POST /api/webhooks/plaid → Verify signature → Parse webhook_code →
TRANSACTIONS_ADDED: Fetch new transactions → Categorize with Claude → Insert →
TRANSACTIONS_MODIFIED: Update existing transactions →
TRANSACTIONS_REMOVED: Soft delete transactions →
Return 200 OK
```

---

### 3. Transaction Import & Categorization Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Trigger: Plaid Webhook or Manual Sync Button                │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  PlaidService.syncTransactions(accountId)                    │
│  - Decrypt Plaid access_token                                │
│  - Call Plaid /transactions/get API                          │
│  - Fetch transactions for last 30 days                       │
│  - Return raw transaction data                               │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  CategorizeService.categorizeTransactions(transactions[])    │
│  - Batch transactions (max 50 per request)                   │
│  - Call Claude API with structured prompt:                   │
│    "Categorize these transactions into categories:           │
│     [list of available categories]"                          │
│  - Parse Claude's structured JSON response                   │
│  - Return transaction → category mappings                    │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  tRPC transactions.batchCreate                               │
│  - For each transaction:                                     │
│    - Check if already exists (by plaidTransactionId)         │
│    - If new: Insert with AI-suggested category               │
│    - If exists: Skip or update if modified                   │
│  - Return created count                                      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Update UI                                                   │
│  - Invalidate transactions query                             │
│  - Show toast: "50 new transactions imported"               │
│  - Update account lastSynced timestamp                       │
└──────────────────────────────────────────────────────────────┘
```

**Manual Transaction Entry Flow:**
```
User → AddTransactionForm → Validate with Zod → 
tRPC transactions.create → CategorizeService (single transaction) → 
Insert Transaction → Invalidate Queries (transactions, budgets, analytics) → 
UI Updates
```

---

### 4. Budget Tracking & Alert Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Action: Create Budget for "Groceries" - $500/month     │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  CreateBudgetForm → tRPC budgets.create                      │
│  - Insert Budget record (category, amount, month)            │
│  - Create BudgetAlert (threshold: 80%, 95%)                  │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Display Budget Card with Progress                           │
│  - Query: Calculate spent (sum transactions for category)    │
│  - Calculate percentage: (spent / budget) * 100              │
│  - Render ProgressBar with color coding                      │
└──────────────────────────────────────────────────────────────┘

WHEN TRANSACTION ADDED:
┌──────────────────────────────────────────────────────────────┐
│  Transaction Created (category: Groceries, amount: $80)      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  BudgetService.checkBudgetAlerts(userId, category, month)    │
│  - Recalculate spent for category/month                      │
│  - Check if threshold crossed (80%, 95%)                     │
│  - If crossed and not already sent:                          │
│    - Mark alert as sent                                      │
│    - Trigger email notification                              │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  EmailService.sendBudgetAlert(user, budget, percentage)      │
│  - Call Resend API with email template                       │
│  - Subject: "Groceries budget at 82%"                        │
│  - Body: "You've spent $410 of $500..."                      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  User Receives Email & In-App Notification                   │
└──────────────────────────────────────────────────────────────┘
```

**Daily Budget Check Job (Future Enhancement):**
```
Cron Job (Daily 9am) → Fetch All Active Budgets → Check Each Budget → 
Send Alerts if Needed
```

---

### 5. Analytics Dashboard Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Navigates to /dashboard                                │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Dashboard Page (Server Component)                           │
│  - Fetch session (getServerSession)                          │
│  - Parallel data fetching with Promise.all:                  │
│    ├─ getNetWorth(userId)                                    │
│    ├─ getMonthlyIncome(userId, month)                        │
│    ├─ getMonthlyExpenses(userId, month)                      │
│    ├─ getTopCategories(userId, month, limit: 5)             │
│    ├─ getRecentTransactions(userId, limit: 10)              │
│    └─ getBudgetStatus(userId, month)                         │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  AnalyticsService.getNetWorth(userId)                        │
│  - Prisma query:                                             │
│    SELECT SUM(balance) FROM accounts WHERE userId = ?        │
│    AND isActive = true                                       │
│  - Cache result (React Cache API, 5 min TTL)                │
│  - Return total                                              │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  AnalyticsService.getTopCategories(userId, month, limit)     │
│  - Prisma query:                                             │
│    SELECT category, SUM(amount) as total                     │
│    FROM transactions                                         │
│    WHERE userId = ? AND date BETWEEN start AND end           │
│    GROUP BY category                                         │
│    ORDER BY total DESC                                       │
│    LIMIT ?                                                   │
│  - Return array of {category, total, percentage}             │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Render Dashboard Components                                 │
│  - Pass data as props to child components                    │
│  - NetWorthCard: Display formatted total                     │
│  - SpendingByCategoryChart: Render pie chart (Recharts)     │
│  - RecentTransactionsWidget: Display table                   │
│  - BudgetStatusWidget: Display progress bars                 │
└──────────────────────────────────────────────────────────────┘
```

**Chart Interactions (Client-Side):**
```
User → Select Date Range → Client Component → tRPC analytics.getSpendingTrends
→ Refetch Data → Update Chart
```

---

### 6. Goal Creation & Tracking Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Action: Create Goal "Emergency Fund" - $10,000         │
│  Target Date: 12 months from now                             │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  CreateGoalForm → tRPC goals.create                          │
│  - Insert Goal record                                        │
│  - Initial currentAmount: 0                                  │
│  - Calculate monthsRemaining                                 │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  ProjectionCalculator (Client Component)                     │
│  - Calculate required monthly savings:                       │
│    monthlyRequired = (targetAmount - currentAmount) /        │
│                      monthsRemaining                         │
│  - Display: "Save $833/month to reach goal on time"         │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  User Updates Progress: Add $500                             │
│  - GoalCard → Update Button → tRPC goals.updateProgress      │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  tRPC goals.updateProgress                                   │
│  - Update currentAmount: currentAmount + $500                │
│  - Calculate new percentage: (500 / 10000) * 100 = 5%       │
│  - Check if goal completed (currentAmount >= targetAmount)   │
│  - If completed: Set isCompleted = true, completedAt = now   │
└───────────────────────────┬──────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  UI Update                                                   │
│  - Invalidate goals query                                    │
│  - Update progress bar animation                             │
│  - If completed: Show celebration modal                      │
└──────────────────────────────────────────────────────────────┘
```

**Automatic Progress (Linked Account):**
```
Account Balance Changed → Calculate Delta → Update Linked Goals → 
Update currentAmount → Invalidate Queries
```

---

## Integration Points

### 1. Plaid Integration

**Purpose:** Connect bank accounts and import transactions

**Integration Type:** REST API + OAuth Flow

**Key Components:**
- `PlaidService` - Wrapper for Plaid API calls
- `ConnectPlaidButton` - React component with Plaid Link SDK
- `/api/webhooks/plaid` - Webhook receiver for transaction updates

**Endpoints Used:**
- `/link/token/create` - Generate link_token for Plaid Link
- `/item/public_token/exchange` - Exchange public_token for access_token
- `/accounts/get` - Fetch account details
- `/transactions/get` - Fetch transactions
- `/item/remove` - Disconnect account

**Data Flow:**
```
App → Create Link Token → Plaid Link UI → Public Token → Exchange for Access Token
→ Store Encrypted → Fetch Accounts → Fetch Transactions → Store in DB
```

**Security Considerations:**
- Access tokens encrypted with AES-256-GCM (using crypto-js or similar)
- Store encryption key in environment variable
- Webhook signature verification (HMAC-SHA256)
- Never log access tokens or sensitive data

**Error Handling:**
- Token expiration → Show reconnection UI
- API rate limits → Implement exponential backoff
- Invalid credentials → Clear tokens, prompt reconnect
- Network errors → Retry with exponential backoff (max 3 attempts)

**Testing Strategy:**
- Use Plaid Sandbox environment
- Test with sandbox institutions (Chase, Wells Fargo)
- Mock Plaid API responses in unit tests
- Integration tests with real Plaid Sandbox calls

**Complexity: HIGH**
- OAuth flow management
- Token encryption/decryption
- Webhook security
- Error recovery flows
- Rate limiting

---

### 2. Claude API Integration (Anthropic)

**Purpose:** AI-powered transaction categorization

**Integration Type:** REST API (Claude Messages API)

**Key Components:**
- `CategorizeService` - Claude API wrapper
- `categorizeTransaction()` - Single transaction categorization
- `categorizeBatch()` - Batch categorization (up to 50 transactions)

**API Endpoint:**
- `https://api.anthropic.com/v1/messages`

**Prompt Structure:**
```typescript
const prompt = `You are a financial categorization assistant. 
Categorize the following transactions into one of these categories:
${categories.join(', ')}

Transactions:
${transactions.map(t => `- ${t.payee}: $${t.amount} on ${t.date}`).join('\n')}

Return JSON array: [{"transactionId": "...", "category": "..."}]`
```

**Request Configuration:**
- Model: `claude-3-5-sonnet-20241022` (good balance of speed/quality)
- Max tokens: 1024
- Temperature: 0.2 (deterministic categorization)
- System prompt: Define role as financial categorizer

**Response Parsing:**
- Parse JSON from Claude's response
- Validate category names against database
- Fallback to "Miscellaneous" if invalid category
- Handle API errors gracefully

**Rate Limiting:**
- Batch transactions (max 50 per request)
- Implement queue for large imports
- Cache categorization patterns for similar merchants
- Fallback to rule-based categorization if API fails

**Cost Optimization:**
- Cache merchant → category mappings
- Only categorize new/unrecognized transactions
- Use shorter prompts with clear instructions
- Consider fine-tuned model (future enhancement)

**Error Handling:**
- API errors → Fallback to "Uncategorized" + log for manual review
- Invalid JSON → Retry with stricter prompt
- Rate limit exceeded → Queue for later processing
- Network errors → Retry with exponential backoff

**Testing Strategy:**
- Mock Claude API responses in tests
- Test with various transaction types
- Validate category accuracy (manual review sample)
- Load test with 1000+ transaction batch

**Complexity: MEDIUM-HIGH**
- Prompt engineering for accuracy
- Batch processing logic
- Error handling and fallbacks
- Cost optimization
- Response parsing and validation

---

### 3. Resend Integration

**Purpose:** Send transactional emails (password reset, budget alerts)

**Integration Type:** REST API

**Key Components:**
- `EmailService` - Resend API wrapper
- Email templates (React Email or plain HTML)
- `/api/webhooks/resend` - Webhook for delivery status

**Email Types:**
1. **Password Reset**
   - Trigger: User requests password reset
   - Content: Link with reset token (expires in 1 hour)
   - Template: Simple, branded with Wealth logo

2. **Budget Alerts**
   - Trigger: Budget threshold crossed (80%, 95%)
   - Content: Budget status, spending breakdown, link to budgets page
   - Template: Visual with progress bar

3. **Goal Milestones** (Future)
   - Trigger: Goal progress milestone (25%, 50%, 75%, 100%)
   - Content: Celebration message, progress summary
   - Template: Celebratory, positive tone

**API Endpoint:**
- `https://api.resend.com/emails`

**Request Structure:**
```typescript
{
  from: 'Wealth <noreply@wealth.app>',
  to: user.email,
  subject: 'Reset your password',
  html: '<html>...</html>',
  tags: [{ name: 'category', value: 'password-reset' }]
}
```

**Webhook Handling:**
- Listen for delivery status (delivered, bounced, complained)
- Log email events for debugging
- Handle bounces (mark email as invalid)
- Handle complaints (unsubscribe from non-critical emails)

**Error Handling:**
- API errors → Log and retry (max 3 attempts)
- Invalid email → Validate before sending
- Rate limits → Queue emails
- Network errors → Retry with exponential backoff

**Testing Strategy:**
- Use Resend test mode
- Verify email delivery in test inbox
- Test email templates across clients (Gmail, Outlook, Apple Mail)
- Mock Resend API in unit tests

**Complexity: LOW-MEDIUM**
- Simple API integration
- Email template design
- Webhook handling
- Retry logic

---

### 4. NextAuth.js Integration

**Purpose:** Authentication and session management

**Integration Type:** Next.js library with database adapter

**Key Components:**
- `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js handler
- `AuthProvider` - Client-side session provider
- Middleware - Route protection
- Prisma Adapter - Database session storage

**Providers:**
1. **Credentials Provider** (Email/Password)
   - Hash passwords with bcrypt (10 rounds)
   - Validate against database
   - Return user object on success

2. **Google OAuth Provider**
   - Client ID and Secret from Google Console
   - Callback URL: `/api/auth/callback/google`
   - Auto-create user on first login

**Session Strategy:**
- JWT strategy (stateless)
- Store minimal data in token (userId, email)
- HttpOnly cookies for security
- 7-day expiration with automatic refresh

**Route Protection:**
```typescript
// middleware.ts
export default withAuth(
  function middleware(req) {
    // Protect routes
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)
```

**Database Schema:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // null for OAuth users
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  // OAuth accounts (Google)
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}
```

**Complexity: MEDIUM**
- Multi-provider setup
- Session management
- Route protection
- Database adapter configuration

---

### 5. Database Integration (Prisma + PostgreSQL)

**Purpose:** Data persistence and ORM

**Integration Type:** ORM with type generation

**Key Components:**
- `prisma/schema.prisma` - Database schema definition
- `src/server/db/client.ts` - Prisma client singleton
- Migration files - Version-controlled schema changes

**Schema Overview (8 Core Models):**

1. **User** - Authentication and profile
2. **Account** - Bank accounts (Plaid + manual)
3. **Transaction** - Financial transactions
4. **Category** - Spending categories (hierarchical)
5. **Budget** - Monthly budgets by category
6. **BudgetAlert** - Alert configuration
7. **Goal** - Savings/debt goals
8. **MindfulnessEntry** - Reflections, gratitude, values

**Key Relationships:**
- User → Accounts (1:many)
- User → Transactions (1:many)
- Account → Transactions (1:many)
- User → Budgets (1:many)
- Budget → BudgetAlerts (1:many)
- User → Goals (1:many)
- Category → Transactions (1:many)
- Category → Categories (self-referential, parent/child)

**Indexing Strategy:**
- userId on all user-scoped models
- date on transactions (range queries)
- category on transactions (aggregations)
- plaidTransactionId (unique constraint)
- month + userId on budgets (composite)

**Migration Strategy:**
- Use Prisma Migrate for schema changes
- Seed script for default categories
- Backup before migrations (production)
- Test migrations in staging environment

**Performance Optimization:**
- Connection pooling (default with Prisma)
- Eager loading with `include` for related data
- Cursor-based pagination for large lists
- Database-level aggregations (SUM, AVG, GROUP BY)

**Complexity: MEDIUM**
- Schema design with relationships
- Migration management
- Query optimization
- Type generation and sync

---

## Database Schema Design

### Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// AUTHENTICATION & USER
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // null for OAuth-only users
  name          String?
  image         String?
  currency      String    @default("USD")
  timezone      String    @default("America/New_York")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts           Account[]
  transactions       Transaction[]
  budgets            Budget[]
  goals              Goal[]
  categories         Category[]
  mindfulnessEntries MindfulnessEntry[]
  oauthAccounts      OAuthAccount[]
  passwordResetTokens PasswordResetToken[]

  @@index([email])
}

model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth"
  provider          String  // "google"
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ============================================================================
// ACCOUNTS
// ============================================================================

model Account {
  id               String    @id @default(cuid())
  userId           String
  type             AccountType
  name             String
  institution      String
  balance          Decimal   @db.Decimal(15, 2)
  currency         String    @default("USD")
  plaidAccountId   String?   @unique
  plaidAccessToken String?   @db.Text // encrypted
  isManual         Boolean   @default(false)
  isActive         Boolean   @default(true)
  lastSynced       DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  goals        Goal[]        @relation("LinkedAccount")

  @@index([userId])
  @@index([plaidAccountId])
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT
  INVESTMENT
  CASH
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

model Transaction {
  id                 String             @id @default(cuid())
  userId             String
  accountId          String
  date               DateTime
  amount             Decimal            @db.Decimal(15, 2) // negative for expenses, positive for income
  payee              String
  categoryId         String
  notes              String?            @db.Text
  tags               String[]           // array of tags
  plaidTransactionId String?            @unique
  isManual           Boolean            @default(false)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  // Relations
  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  account  Account            @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category Category           @relation(fields: [categoryId], references: [id])
  splits   TransactionSplit[]

  // Mindfulness
  reflection       String?  @db.Text
  moodTag          String?  // "aligned", "impulse", "neutral"
  reflectionPrompt Boolean  @default(false) // whether to show reflection prompt

  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
  @@index([plaidTransactionId])
}

model TransactionSplit {
  id            String      @id @default(cuid())
  transactionId String
  categoryId    String
  amount        Decimal     @db.Decimal(15, 2)
  notes         String?     @db.Text
  createdAt     DateTime    @default(now())

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  category    Category    @relation(fields: [categoryId], references: [id])

  @@index([transactionId])
  @@index([categoryId])
}

// ============================================================================
// CATEGORIES
// ============================================================================

model Category {
  id          String    @id @default(cuid())
  userId      String?   // null for system/default categories
  name        String
  icon        String?   // lucide icon name
  color       String?   // hex color
  parentId    String?   // for hierarchical categories
  isDefault   Boolean   @default(false) // system categories
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  user               User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent             Category?          @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children           Category[]         @relation("CategoryHierarchy")
  transactions       Transaction[]
  transactionSplits  TransactionSplit[]
  budgets            Budget[]

  // Values alignment
  isValueAligned Boolean @default(false)

  @@unique([userId, name])
  @@index([userId])
  @@index([parentId])
}

// ============================================================================
// BUDGETS
// ============================================================================

model Budget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  amount     Decimal  @db.Decimal(15, 2)
  month      String   // YYYY-MM format
  rollover   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category      @relation(fields: [categoryId], references: [id])
  alerts   BudgetAlert[]

  @@unique([userId, categoryId, month])
  @@index([userId])
  @@index([categoryId])
  @@index([month])
}

model BudgetAlert {
  id        String    @id @default(cuid())
  budgetId  String
  threshold Int       // percentage (80, 95, 100)
  sent      Boolean   @default(false)
  sentAt    DateTime?
  createdAt DateTime  @default(now())

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@index([budgetId])
}

// ============================================================================
// GOALS
// ============================================================================

model Goal {
  id              String    @id @default(cuid())
  userId          String
  name            String
  targetAmount    Decimal   @db.Decimal(15, 2)
  currentAmount   Decimal   @db.Decimal(15, 2) @default(0)
  targetDate      DateTime
  linkedAccountId String?   // optional link to savings account
  type            GoalType  @default(SAVINGS)
  isCompleted     Boolean   @default(false)
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  linkedAccount Account? @relation("LinkedAccount", fields: [linkedAccountId], references: [id])

  @@index([userId])
  @@index([linkedAccountId])
}

enum GoalType {
  SAVINGS
  DEBT_PAYOFF
  INVESTMENT
}

// ============================================================================
// MINDFULNESS
// ============================================================================

model MindfulnessEntry {
  id        String           @id @default(cuid())
  userId    String
  type      MindfulnessType
  content   String           @db.Text
  date      DateTime         @default(now())
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
  @@index([date])
}

enum MindfulnessType {
  GRATITUDE
  REFLECTION
  AFFIRMATION
}

// ============================================================================
// SEED DATA
// ============================================================================

// Default categories will be seeded via prisma/seed.ts:
// - Income (Salary, Freelance, Investments, Other)
// - Housing (Rent/Mortgage, Utilities, Maintenance)
// - Transportation (Gas, Public Transit, Car Payment, Insurance)
// - Food (Groceries, Restaurants, Coffee)
// - Shopping (Clothing, Electronics, Home Goods)
// - Entertainment (Subscriptions, Hobbies, Events)
// - Health (Insurance, Medical, Fitness)
// - Personal (Grooming, Education, Gifts)
// - Financial (Savings, Investments, Debt Payments)
// - Miscellaneous
```

**Key Design Decisions:**

1. **User Isolation** - All models have userId for row-level security
2. **Soft Deletes** - Use `isActive` flags instead of hard deletes (data integrity)
3. **Decimal Types** - Use Decimal for money (avoid floating-point errors)
4. **Encrypted Fields** - Mark plaidAccessToken as TEXT for encrypted storage
5. **Composite Indexes** - userId + month on budgets for fast lookups
6. **Self-Referential** - Category parentId for hierarchical structure
7. **Enum Types** - Use enums for fixed sets (AccountType, GoalType, etc.)
8. **Text Fields** - Use @db.Text for long strings (notes, reflections)
9. **Array Fields** - Use native PostgreSQL arrays for tags
10. **Unique Constraints** - Prevent duplicates (plaidTransactionId, email, etc.)

---

## Complexity Assessment

### High Complexity Areas (Likely Builder Splits)

#### 1. Transaction Management Module (HIGH - LIKELY SPLIT)

**Complexity Drivers:**
- Plaid API integration (OAuth, webhooks, token management)
- Claude AI categorization (batch processing, error handling)
- Split transaction logic (multi-category allocation)
- Bulk operations (optimistic updates, transaction rollbacks)
- Search/filter with pagination (performance critical)

**Estimated Sub-Builders:**
- Sub-builder A: Core transaction CRUD + manual entry
- Sub-builder B: Plaid integration (connection, sync, webhooks)
- Sub-builder C: AI categorization (Claude API, batch processing)
- Sub-builder D: Advanced features (splits, bulk ops, search)

**Dependencies:**
- Must complete after: Account management, Category management
- Blocks: Budget tracking, Analytics

---

#### 2. Plaid Integration (HIGH - STANDALONE)

**Complexity Drivers:**
- OAuth flow with Plaid Link SDK
- Token encryption/decryption
- Webhook signature verification
- Error recovery (expired tokens, reconnection)
- Rate limiting and retry logic
- Security considerations (never log tokens)

**Recommendation:** Dedicated builder with clear service interface

**API Surface:**
```typescript
interface PlaidService {
  createLinkToken(userId: string): Promise<string>
  exchangePublicToken(publicToken: string): Promise<string>
  getAccounts(accessToken: string): Promise<PlaidAccount[]>
  getTransactions(accessToken: string, startDate: Date, endDate: Date): Promise<PlaidTransaction[]>
  handleWebhook(payload: unknown, signature: string): Promise<void>
  removeItem(accessToken: string): Promise<void>
}
```

**Testing Strategy:**
- Use Plaid Sandbox
- Mock API responses
- Test reconnection flows
- Validate webhook signatures

---

#### 3. Budget Tracking with Alerts (MEDIUM-HIGH - POSSIBLE SPLIT)

**Complexity Drivers:**
- Real-time budget calculation (aggregate transactions)
- Alert threshold monitoring
- Email notifications (Resend integration)
- Rollover calculation logic
- Budget templates (recurring)
- Historical tracking

**Estimated Sub-Builders (if split):**
- Sub-builder A: Core budget CRUD + progress calculation
- Sub-builder B: Alert system + email notifications

**Dependencies:**
- Must complete after: Transactions, Categories
- Blocks: Dashboard analytics

---

### Medium Complexity Areas

#### 4. Analytics & Dashboard (MEDIUM)

**Complexity Drivers:**
- Complex aggregation queries
- Chart rendering (Recharts)
- CSV export functionality
- Caching strategy for performance
- Date range calculations

**Recommendation:** Single builder with focus on performance

**Performance Considerations:**
- Use Prisma aggregations (database-level)
- Cache expensive calculations (React Cache API)
- Cursor-based pagination for large datasets
- Lazy load charts (code splitting)

---

#### 5. Authentication Module (MEDIUM)

**Complexity Drivers:**
- Multiple providers (email/password + Google OAuth)
- Password reset flow with email
- Session management
- Route protection middleware
- CSRF protection

**Recommendation:** Single builder following NextAuth.js patterns

**Key Files:**
- `/src/app/api/auth/[...nextauth]/route.ts` - Configuration
- `/src/server/auth/config.ts` - Auth config
- `middleware.ts` - Route protection

---

#### 6. Goals & Planning (MEDIUM)

**Complexity Drivers:**
- Projection algorithms (savings rate)
- Debt payoff calculations (interest formulas)
- Account linking logic
- Milestone tracking

**Recommendation:** Single builder with math validation

**Key Algorithms:**
```typescript
// Monthly savings needed
const monthlyRequired = (targetAmount - currentAmount) / monthsRemaining

// Projected completion date
const monthsNeeded = (targetAmount - currentAmount) / monthlySavingsRate
const projectedDate = addMonths(new Date(), monthsNeeded)

// Debt payoff (with interest)
const monthlyPayment = (principal * rate) / (1 - Math.pow(1 + rate, -months))
```

---

### Low-Medium Complexity Areas

#### 7. Account Management (LOW-MEDIUM)

**Complexity Drivers:**
- Manual account creation (straightforward CRUD)
- Account list with balances (simple query)
- Edit/archive operations

**Recommendation:** Single builder, quick implementation

**Dependencies:**
- Must complete early (foundational)
- Enables: Transactions, Goals

---

#### 8. Category Management (LOW-MEDIUM)

**Complexity Drivers:**
- Hierarchical structure (adjacency list)
- Seed script for defaults
- Icon/color customization

**Recommendation:** Single builder, focus on seed script

**Seed Script Structure:**
```typescript
const defaultCategories = [
  { name: 'Income', icon: 'dollar-sign', color: '#10b981', children: [
    { name: 'Salary', icon: 'briefcase', color: '#10b981' },
    { name: 'Freelance', icon: 'laptop', color: '#10b981' },
    // ...
  ]},
  // ... more categories
]

await prisma.category.createMany({ data: flattenCategories(defaultCategories) })
```

---

#### 9. Mindful Finance Features (LOW)

**Complexity Drivers:**
- Simple CRUD operations
- Affirmation rotation
- Alignment percentage calculation

**Recommendation:** Single builder, implement last (nice-to-have)

---

## Risk Areas

### Technical Risks

#### Risk 1: Plaid Token Security

**Description:** Plaid access tokens must be encrypted at rest. If encryption is compromised, user bank account access is exposed.

**Impact:** CRITICAL - Security breach, loss of user trust

**Mitigation Strategy:**
1. Use industry-standard encryption (AES-256-GCM)
2. Store encryption key in environment variable (not in code)
3. Use secure key management (Vercel environment variables)
4. Never log tokens or include in error messages
5. Implement token rotation (future enhancement)
6. Add audit logging for token access

**Implementation:**
```typescript
import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedText = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encryptedText) + decipher.final('utf8')
}
```

---

#### Risk 2: Claude API Cost Escalation

**Description:** Claude API charges per token. Unoptimized prompts or excessive categorization calls could escalate costs.

**Impact:** MEDIUM - Budget overrun, unsustainable at scale

**Mitigation Strategy:**
1. Cache merchant → category mappings
2. Batch transactions (max 50 per request)
3. Use shorter, optimized prompts
4. Implement fallback rule-based categorization
5. Monitor API usage with alerts
6. Set monthly spending limits

**Cost Calculation:**
```
Assumptions:
- 100 transactions/month per user
- $3 per million input tokens, $15 per million output tokens
- Average prompt: 500 input tokens, 100 output tokens per batch of 50

Cost per user per month:
- 2 batches * (500 * $0.000003 + 100 * $0.000015) = $0.006

1000 users = $6/month (manageable)
```

**Optimization:**
```typescript
// Cache merchant categorizations
const cachedCategory = await redis.get(`merchant:${merchant.toLowerCase()}`)
if (cachedCategory) return cachedCategory

// Only categorize if not cached
const category = await categorizeWithClaude(transaction)
await redis.set(`merchant:${merchant.toLowerCase()}`, category, 'EX', 86400 * 30)
```

---

#### Risk 3: Database Query Performance

**Description:** Analytics queries (aggregations, date ranges) could slow down with large datasets (10,000+ transactions).

**Impact:** MEDIUM - Poor user experience, slow page loads

**Mitigation Strategy:**
1. Index critical columns (userId, date, category)
2. Use database-level aggregations (not in-memory)
3. Implement cursor-based pagination
4. Cache expensive calculations (React Cache API)
5. Consider materialized views for analytics (future)
6. Monitor query performance (pg_stat_statements)

**Critical Indexes:**
```prisma
@@index([userId, date]) // for date range queries
@@index([userId, categoryId, date]) // for category analytics
@@index([accountId, date]) // for account-specific queries
```

**Query Optimization Example:**
```typescript
// BAD: Fetch all transactions and aggregate in memory
const transactions = await prisma.transaction.findMany({ where: { userId } })
const totalByCategory = transactions.reduce((acc, t) => { ... }, {})

// GOOD: Database-level aggregation
const totalByCategory = await prisma.transaction.groupBy({
  by: ['categoryId'],
  where: { userId, date: { gte: startDate, lte: endDate } },
  _sum: { amount: true },
  orderBy: { _sum: { amount: 'desc' } }
})
```

---

#### Risk 4: Plaid Webhook Reliability

**Description:** Plaid webhooks may fail, be delayed, or be missed due to downtime, causing transaction sync issues.

**Impact:** MEDIUM - Stale data, user confusion

**Mitigation Strategy:**
1. Implement webhook signature verification
2. Store webhook events in database for replay
3. Add manual sync button (fallback)
4. Background job for periodic sync (daily)
5. Handle duplicate webhooks (idempotency)
6. Monitor webhook delivery with alerts

**Idempotent Webhook Handler:**
```typescript
export async function handlePlaidWebhook(payload: PlaidWebhook, signature: string) {
  // 1. Verify signature
  if (!verifyPlaidSignature(payload, signature)) {
    throw new Error('Invalid signature')
  }

  // 2. Check if already processed (idempotency)
  const existing = await prisma.webhookEvent.findUnique({
    where: { plaidWebhookId: payload.webhook_id }
  })
  if (existing) return { status: 'already_processed' }

  // 3. Store event
  await prisma.webhookEvent.create({
    data: { plaidWebhookId: payload.webhook_id, type: payload.webhook_code, payload }
  })

  // 4. Process webhook
  switch (payload.webhook_code) {
    case 'TRANSACTIONS_ADDED':
      await syncNewTransactions(payload.item_id)
      break
    // ...
  }

  return { status: 'processed' }
}
```

---

### Complexity Risks

#### Risk 5: Transaction Module Too Large

**Description:** Transaction module includes Plaid, Claude, splits, bulk ops - too much for one builder.

**Impact:** HIGH - Builder will need to split, causing delays

**Mitigation Strategy:**
1. **Pre-split the transaction module** into 4 sub-builders (see "High Complexity Areas")
2. Define clear interfaces between sub-builders
3. Build in order: Core CRUD → Plaid → AI → Advanced features
4. Each sub-builder validates independently

**Recommended Split:**
```
Builder: Transaction Management Coordinator
├─ Sub-builder A: Core Transaction CRUD
│  ├─ Manual transaction entry
│  ├─ Transaction list (paginated)
│  ├─ Transaction detail view
│  └─ Basic edit/delete
├─ Sub-builder B: Plaid Integration
│  ├─ Connect Plaid account
│  ├─ Fetch transactions from Plaid
│  ├─ Webhook handler
│  └─ Manual sync button
├─ Sub-builder C: AI Categorization
│  ├─ Claude API service
│  ├─ Batch categorization
│  ├─ Merchant caching
│  └─ Fallback logic
└─ Sub-builder D: Advanced Features
   ├─ Split transactions
   ├─ Bulk operations
   ├─ Search/filter
   └─ CSV export
```

---

#### Risk 6: Budget Real-Time Calculation Performance

**Description:** Calculating budget progress requires summing transactions, which could be slow with many transactions.

**Impact:** MEDIUM - Slow budget page loads

**Mitigation Strategy:**
1. Use database-level SUM aggregation
2. Cache budget calculations (5-minute TTL)
3. Only recalculate when transactions change
4. Consider materialized view (future)
5. Add loading states for slow queries

**Optimized Budget Progress Query:**
```typescript
export async function getBudgetProgress(userId: string, month: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true }
  })

  // Single query to get all sums
  const sums = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      date: { gte: startOfMonth(month), lte: endOfMonth(month) },
      amount: { lt: 0 } // only expenses
    },
    _sum: { amount: true }
  })

  const sumMap = new Map(sums.map(s => [s.categoryId, Math.abs(s._sum.amount)]))

  return budgets.map(budget => ({
    ...budget,
    spent: sumMap.get(budget.categoryId) || 0,
    percentage: (sumMap.get(budget.categoryId) || 0) / budget.amount * 100
  }))
}
```

---

#### Risk 7: NextAuth.js Configuration Complexity

**Description:** NextAuth.js has many configuration options. Incorrect setup could break auth or introduce security issues.

**Impact:** CRITICAL - Users locked out or security vulnerability

**Mitigation Strategy:**
1. Follow NextAuth.js best practices documentation
2. Use Prisma Adapter (official, well-tested)
3. Test all auth flows (email, OAuth, password reset)
4. Implement CSRF protection
5. Use HttpOnly cookies
6. Validate session on every request (middleware)

**Secure NextAuth.js Config:**
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Validate and return user
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET
}
```

---

## Recommendations for Planner

### 1. Pre-Split Transaction Module

**Rationale:** Transaction management is too complex for a single builder. Pre-splitting avoids mid-build splits.

**Recommendation:**
- Create 4 sub-builders: Core CRUD, Plaid Integration, AI Categorization, Advanced Features
- Define clear interfaces between sub-builders
- Build sequentially with validation at each stage

**Benefits:**
- Reduces individual builder complexity
- Enables parallel work (if multiple builders available)
- Clear validation checkpoints
- Easier debugging and testing

---

### 2. Build Order: Foundation First

**Rationale:** Some modules are dependencies for others. Building in the wrong order causes rework.

**Recommended Build Order:**
1. **Phase 1: Foundation (Week 1)**
   - Database schema + migrations
   - Authentication (NextAuth.js)
   - Category management + seed script
   - Account management (manual accounts only)

2. **Phase 2: Core Features (Week 2)**
   - Plaid integration (account connection)
   - Transaction CRUD (manual entry)
   - Transaction list with pagination

3. **Phase 3: Intelligence (Week 3)**
   - AI categorization (Claude API)
   - Transaction sync from Plaid
   - Budget tracking

4. **Phase 4: Analytics (Week 4)**
   - Dashboard overview
   - Analytics pages
   - Goals & planning

5. **Phase 5: Polish (Week 5)**
   - Mindful finance features
   - Advanced transaction features (splits, bulk ops)
   - Email alerts
   - Testing & bug fixes

**Dependency Graph:**
```
Auth → Categories → Accounts → Transactions → Budgets → Analytics
                              ↓
                            Plaid Integration
                              ↓
                          AI Categorization
```

---

### 3. Service Layer for External Integrations

**Rationale:** Isolating external APIs (Plaid, Claude, Resend) behind services makes them testable, mockable, and replaceable.

**Recommendation:**
- Create service classes for each external integration
- Define clear interfaces
- Use dependency injection pattern
- Mock services in tests

**Service Interface Example:**
```typescript
// src/server/services/plaid.service.ts
export class PlaidService {
  private client: PlaidApi

  constructor(config: PlaidConfig) {
    this.client = new PlaidApi(config)
  }

  async createLinkToken(userId: string): Promise<string> { ... }
  async exchangePublicToken(publicToken: string): Promise<string> { ... }
  // ...
}

// Usage in tRPC router
export const accountsRouter = router({
  connectPlaidAccount: protectedProcedure
    .input(z.object({ publicToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const plaidService = new PlaidService(plaidConfig)
      const accessToken = await plaidService.exchangePublicToken(input.publicToken)
      // ...
    })
})
```

**Benefits:**
- Easier to test (mock services)
- Clear separation of concerns
- Reusable across multiple routers
- Can swap implementations (e.g., test vs. production)

---

### 4. Caching Strategy for Performance

**Rationale:** Analytics queries are expensive. Caching reduces database load and improves UX.

**Recommendation:**
- Use React Cache API for server components (built into Next.js 14)
- Cache duration: 5 minutes for real-time data, 1 hour for historical data
- Invalidate cache on mutations (transactions, budgets)
- Consider Redis for production (future enhancement)

**Caching Example:**
```typescript
import { cache } from 'react'

// Server component caching
export const getNetWorth = cache(async (userId: string) => {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true }
  })
  return accounts.reduce((sum, acc) => sum + acc.balance, 0)
})

// Revalidation tag (Next.js 14)
export async function createTransaction(data: TransactionInput) {
  const transaction = await prisma.transaction.create({ data })
  revalidateTag(`transactions-${data.userId}`)
  revalidateTag(`analytics-${data.userId}`)
  return transaction
}
```

---

### 5. Error Handling Strategy

**Rationale:** External APIs fail. Good error handling prevents data loss and improves UX.

**Recommendation:**
- Use exponential backoff for transient errors
- Fallback to degraded functionality (e.g., skip AI categorization on failure)
- Log errors to monitoring service (Sentry, LogRocket)
- Display user-friendly error messages
- Implement retry mechanisms

**Error Handling Levels:**
```typescript
// 1. Service-level error handling (with retry)
export async function categorizeBatch(transactions: Transaction[]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await claudeAPI.categorize(transactions)
    } catch (error) {
      if (attempt === 3) {
        logger.error('Claude API failed after 3 attempts', { error })
        return fallbackCategorization(transactions) // Rule-based fallback
      }
      await sleep(Math.pow(2, attempt) * 1000) // Exponential backoff
    }
  }
}

// 2. API-level error handling (tRPC)
export const transactionsRouter = router({
  create: protectedProcedure
    .input(transactionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createTransaction(input)
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Duplicate transaction' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    })
})

// 3. UI-level error handling
function AddTransactionForm() {
  const mutation = trpc.transactions.create.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      toast.success('Transaction added')
    }
  })
}
```

---

### 6. Testing Strategy Per Module

**Rationale:** Different modules require different testing approaches. Clear testing strategy ensures quality.

**Recommendation:**
- **Unit Tests:** Services, utilities, calculations (>80% coverage)
- **Integration Tests:** tRPC routers, database operations
- **E2E Tests:** Critical user flows (auth, account connection, transaction creation)
- **Manual Tests:** UI/UX, chart rendering, mobile responsiveness

**Testing Breakdown:**
```
1. Plaid Integration:
   - Unit: Mock Plaid API responses
   - Integration: Test with Plaid Sandbox
   - E2E: Full connection flow

2. AI Categorization:
   - Unit: Mock Claude API responses
   - Integration: Test with real Claude API (small batches)
   - Manual: Validate categorization accuracy

3. Budget Tracking:
   - Unit: Progress calculation logic
   - Integration: Alert threshold checks
   - E2E: Create budget → Add transaction → Verify alert

4. Analytics:
   - Unit: Aggregation calculations
   - Integration: Database queries with test data
   - Manual: Chart rendering, visual accuracy

5. Authentication:
   - E2E: Registration, login, logout, password reset
   - Integration: NextAuth.js callbacks
   - Manual: OAuth flows
```

---

### 7. Prisma Migration Strategy

**Rationale:** Database schema will evolve. Safe migration strategy prevents data loss.

**Recommendation:**
- Use Prisma Migrate for all schema changes
- Test migrations in development first
- Create seed script for default categories
- Backup database before production migrations
- Document breaking changes

**Migration Workflow:**
```bash
# 1. Make schema changes in prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_mindfulness_entries

# 3. Review generated SQL
cat prisma/migrations/<timestamp>_add_mindfulness_entries/migration.sql

# 4. Test migration in development
npx prisma migrate reset # WARNING: Deletes all data
npm run seed

# 5. Apply to production (after backup)
npx prisma migrate deploy
```

**Seed Script (prisma/seed.ts):**
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Default categories
  const categories = [
    { name: 'Income', icon: 'dollar-sign', color: '#10b981', isDefault: true },
    { name: 'Housing', icon: 'home', color: '#3b82f6', isDefault: true },
    // ... more categories
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { userId_name: { userId: null, name: category.name } },
      update: {},
      create: { ...category, userId: null }
    })
  }

  console.log('Seeded default categories')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

### 8. Environment Variable Management

**Rationale:** Many secrets and API keys required. Secure management is critical.

**Recommendation:**
- Use `.env.local` for local development (gitignored)
- Use `.env.example` as template (committed to git)
- Use Vercel environment variables for production
- Validate required env vars on startup
- Document each variable

**Environment Variables:**
```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/wealth"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Plaid
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret"
PLAID_ENV="sandbox" # sandbox, development, production

# Claude API
ANTHROPIC_API_KEY="sk-ant-your-api-key"

# Email
RESEND_API_KEY="re_your-api-key"

# Encryption
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
```

**Validation on Startup:**
```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  PLAID_CLIENT_ID: z.string(),
  PLAID_SECRET: z.string(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  ENCRYPTION_KEY: z.string().length(64)
})

export const env = envSchema.parse(process.env)
```

---

## Questions for Planner

1. **Builder Split Decision:** Should we pre-split the Transaction module into 4 sub-builders, or let the initial builder decide if/when to split?

2. **Testing Priority:** Given time constraints, which modules should have E2E tests vs. just unit/integration tests?

3. **Caching Infrastructure:** Should we use built-in React Cache API only, or add Redis from the start?

4. **Error Monitoring:** Should we integrate Sentry/LogRocket from the beginning, or add post-MVP?

5. **Plaid Environment:** Should we use Plaid Sandbox (free, limited data) or Development (more realistic, requires approval)?

6. **AI Categorization Fallback:** If Claude API is unavailable, should we skip categorization or use rule-based fallback?

7. **Database Backup:** What backup strategy should we use for production? (Vercel Postgres auto-backups, manual exports, etc.)

8. **Mobile Experience:** Should we prioritize mobile-first design, or desktop-first with mobile responsive adjustments?

---

## Resource Map

### Critical Files/Directories

**Application Entry Points:**
- `/src/app/layout.tsx` - Root layout, global providers
- `/src/app/page.tsx` - Landing page
- `/src/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `/src/app/api/trpc/[trpc]/route.ts` - tRPC API handler
- `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js handler

**Core Configuration:**
- `prisma/schema.prisma` - Database schema (MOST CRITICAL)
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind/design system
- `.env.example` - Environment variable template

**Business Logic:**
- `/src/server/api/routers/` - tRPC routers (8 files)
- `/src/server/services/` - External integration services
- `/src/lib/validators.ts` - Zod schemas for validation
- `/src/lib/encryption.ts` - Token encryption utilities

**External Integrations:**
- `/src/server/services/plaid.service.ts` - Plaid API
- `/src/server/services/categorize.service.ts` - Claude API
- `/src/server/services/email.service.ts` - Resend API

**Authentication:**
- `/src/server/auth/config.ts` - NextAuth.js configuration
- `/src/server/auth/session.ts` - Session utilities
- `middleware.ts` - Route protection

**Database:**
- `/src/server/db/client.ts` - Prisma client singleton
- `prisma/seed.ts` - Seed script for defaults
- `prisma/migrations/` - Migration files

---

### Key Dependencies

**Core Framework:**
- `next@14.2.x` - Next.js App Router
- `react@18.3.x` - React library
- `typescript@5.5.x` - TypeScript

**Database:**
- `@prisma/client@5.x` - Prisma ORM
- `prisma@5.x` - Prisma CLI
- `pg@8.x` - PostgreSQL driver

**Authentication:**
- `next-auth@4.24.x` - NextAuth.js
- `@next-auth/prisma-adapter@1.x` - Prisma adapter
- `bcrypt@5.x` - Password hashing

**API Layer:**
- `@trpc/server@10.x` - tRPC server
- `@trpc/client@10.x` - tRPC client
- `@trpc/react-query@10.x` - tRPC React integration
- `@tanstack/react-query@5.x` - React Query
- `zod@3.x` - Schema validation

**External Integrations:**
- `plaid@16.x` - Plaid API client
- `@anthropic-ai/sdk@0.x` - Claude API client
- `resend@3.x` - Resend email API

**UI Components:**
- `@radix-ui/react-*` - Radix UI primitives (via shadcn)
- `tailwindcss@3.x` - Utility CSS
- `class-variance-authority@0.x` - CVA for component variants
- `lucide-react@0.x` - Icon library
- `recharts@2.x` - Chart library

**Utilities:**
- `date-fns@3.x` - Date manipulation
- `clsx@2.x` - Class name utility
- `papaparse@5.x` - CSV parsing/export
- `react-hook-form@7.x` - Form handling
- `sonner@1.x` - Toast notifications

---

### Testing Infrastructure

**Testing Framework:**
- `vitest@1.x` - Unit/integration test runner (faster than Jest)
- `@testing-library/react@15.x` - React component testing
- `@testing-library/jest-dom@6.x` - DOM matchers
- `playwright@1.x` - E2E testing

**Test Structure:**
```
tests/
├── unit/
│   ├── services/
│   │   ├── plaid.service.test.ts
│   │   ├── categorize.service.test.ts
│   │   └── analytics.service.test.ts
│   ├── utils/
│   │   ├── encryption.test.ts
│   │   └── date.test.ts
│   └── components/
│       └── BudgetProgressBar.test.tsx
├── integration/
│   ├── api/
│   │   ├── accounts.test.ts
│   │   ├── transactions.test.ts
│   │   └── budgets.test.ts
│   └── database/
│       └── prisma.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── accounts.spec.ts
    ├── transactions.spec.ts
    └── budgets.spec.ts
```

**Testing Commands:**
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

**Mock Strategy:**
- Mock external APIs (Plaid, Claude, Resend) in unit tests
- Use Plaid Sandbox for integration tests
- Use test database for database tests
- Use Playwright for full E2E flows

---

## Final Recommendations Summary

1. **Pre-split Transaction Module** - Avoid mid-build splits by starting with 4 sub-builders
2. **Build Foundation First** - Auth → Categories → Accounts → Transactions → Budgets → Analytics
3. **Service Layer Pattern** - Isolate external APIs for testability
4. **Caching Strategy** - React Cache API for performance
5. **Error Handling** - Exponential backoff, fallbacks, user-friendly messages
6. **Testing Per Module** - Unit for logic, integration for APIs, E2E for critical flows
7. **Prisma Migration Strategy** - Seed script, safe migrations, backups
8. **Environment Variables** - Validate on startup, secure management

**Expected Timeline (with 2L):**
- Exploration: 30 minutes (DONE)
- Planning: 30 minutes
- Building: 12-16 hours (4 builders working sequentially/parallel)
- Integration: 2-3 hours
- Validation: 2-3 hours
- Total: 18-24 hours of autonomous development

**Success Criteria:**
- All 15 MVP criteria met
- Tests passing (>80% coverage)
- Deployed to Vercel
- Accessible via URL
- User can complete full flow: Register → Connect Bank → View Transactions → Create Budget → Track Progress

---

**End of Explorer 1 Report**

This report provides comprehensive architectural guidance for the Wealth application. The planner should use this intelligence to create a detailed build plan with clear task assignments, dependencies, and validation checkpoints.
