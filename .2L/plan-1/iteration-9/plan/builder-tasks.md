# Builder Task Breakdown - Currency Switching System

## Overview

4 primary builders will work in sequential phases due to dependencies. Estimated total: 7-9 hours.

**Dependency Chain:**
- Builder 1 (Database) → Foundation for all other builders
- Builder 2 (Service) → Depends on Builder 1's schema
- Builder 3 (Router) → Depends on Builder 2's service functions
- Builder 4 (UI) → Depends on Builder 3's tRPC procedures

**Complexity Assessment:** HIGH - Data integrity critical, external API integration, 20+ component updates

**Potential Splits:** Builder 4 may split into UI-A (dialogs) and UI-B (currency display updates) if complexity too high

---

## Builder-1: Database Schema & Migration

### Scope

Create database models for exchange rate caching and conversion audit logging. Modify existing models to support single-user currency and Plaid account sync post-conversion.

### Complexity Estimate

**LOW-MEDIUM** (1-2 hours)

Straightforward Prisma schema additions and migration, but critical foundation for all other builders.

### Success Criteria

- [x] ExchangeRate model created with unique constraints and indexes
- [x] CurrencyConversionLog model created with ConversionStatus enum
- [x] Account.originalCurrency field added (nullable, for Plaid accounts)
- [x] Account.currency field removed (single user currency decision)
- [x] User.currencyConversionLogs relation added
- [x] Migration created and tested on local Supabase
- [x] Rollback script documented for safety
- [x] No data loss during migration (test with sample data)

### Files to Create

- `prisma/migrations/{timestamp}_add_currency_conversion_models/migration.sql` - Database migration

### Files to Modify

- `prisma/schema.prisma` - Add 2 new models, modify 2 existing models

### Dependencies

**Depends on:** None (foundation builder)

**Blocks:** All other builders (2, 3, 4 depend on schema)

### Implementation Notes

**Critical Decision: Remove Account.currency field**

The current schema has both User.currency and Account.currency. The plan recommends single user currency (not per-account multi-currency) for MVP. This means:

1. **Before removing field:** Backfill all Account.currency to match User.currency
2. **Migration strategy:** Two-step migration for safety
   - Step 1: Add originalCurrency, backfill existing accounts
   - Step 2: Remove currency field (separate migration, easier rollback)

**Indexes Matter for Performance:**
- ExchangeRate needs compound index on (fromCurrency, toCurrency, date) - Fast rate lookups
- CurrencyConversionLog needs index on (userId, startedAt) - Conversion history queries
- CurrencyConversionLog needs index on (status) - Find IN_PROGRESS conversions quickly

**Unique Constraints Prevent Duplicate Data:**
- ExchangeRate has unique constraint on (date, fromCurrency, toCurrency)
- This automatically handles upsert logic (no duplicate rates for same date/pair)

### Patterns to Follow

Reference patterns from `patterns.md`:
- Database Models Convention (Prisma schema structure)
- Use `@db.Date` for dates without time precision
- Use `@db.Decimal(18, 8)` for exchange rates (high precision)
- Use `@db.Decimal(15, 2)` for currency amounts (standard financial)
- Add `@@unique` constraints to prevent duplicates
- Add `@@index` on WHERE clause fields
- Use `onDelete: Cascade` for dependent data

### Testing Requirements

**Migration Testing:**
1. Test on local database first (Supabase local)
2. Create 5 sample accounts with currency="USD"
3. Run migration
4. Verify originalCurrency is null for manual accounts
5. Verify ExchangeRate and CurrencyConversionLog tables exist
6. Verify indexes created (check with `EXPLAIN` query)
7. Test rollback: `npx prisma migrate reset`

**Sample Verification Queries:**
```sql
-- Verify ExchangeRate table structure
SELECT * FROM "ExchangeRate" LIMIT 1;

-- Verify CurrencyConversionLog table structure
SELECT * FROM "CurrencyConversionLog" LIMIT 1;

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('ExchangeRate', 'CurrencyConversionLog');
```

### Potential Split Strategy

**NO SPLIT RECOMMENDED** - Database migrations should be single atomic operation. Splitting increases risk of schema inconsistency.

---

## Builder-2: Currency Conversion Service & API Integration

### Scope

Implement core business logic for currency conversion: exchange rate API integration, rate caching, atomic transaction conversion service, retry logic, and Plaid sync updates.

### Complexity Estimate

**HIGH** (3-4 hours)

Most complex builder task due to external API integration, atomic transaction management, historical rate fetching, and data integrity requirements.

### Success Criteria

- [x] Exchange rate API integration (exchangerate-api.com) with retry logic
- [x] Rate caching with 24-hour TTL for current rates, indefinite for historical
- [x] Batch historical rate fetching (optimize from 1,000+ to 30-90 API calls)
- [x] Atomic currency conversion with Prisma transaction (60s timeout)
- [x] Conversion lock mechanism (prevent concurrent conversions via IN_PROGRESS status)
- [x] Rollback on failure (automatic via Prisma transaction)
- [x] Convert all 4 financial models: Transaction, Account, Budget, Goal
- [x] Update user currency on successful conversion
- [x] Log all conversion attempts in CurrencyConversionLog
- [x] Plaid sync service updated to handle originalCurrency conversion
- [x] Error handling for API timeout, rate limit, network failure
- [x] Performance: <30 seconds for 1,000 transactions

### Files to Create

- `src/server/services/currency.service.ts` - Core conversion logic (~400 lines)
- `src/server/services/__tests__/currency.service.test.ts` - Unit tests (~200 lines)

### Files to Modify

- `src/server/services/plaid-sync.service.ts` - Add currency conversion on sync (~50 lines)

### Dependencies

**Depends on:** Builder 1 (Prisma schema with ExchangeRate, CurrencyConversionLog models)

**Blocks:** Builder 3 (tRPC router needs service functions)

### Implementation Notes

**Exchange Rate API Setup:**
1. Sign up at https://www.exchangerate-api.com/ (free tier)
2. Get API key (24-character alphanumeric)
3. Add to `.env`: `EXCHANGE_RATE_API_KEY=your_key_here`
4. Update `.env.example` with placeholder

**Service Architecture:**
```
currency.service.ts
├── convertUserCurrency() - Main conversion function (200 lines)
├── fetchExchangeRate() - Fetch with caching (50 lines)
├── fetchRateFromAPI() - External API call (50 lines)
├── fetchWithRetry() - Retry logic (30 lines)
├── fetchHistoricalRatesForTransactions() - Batch fetch (40 lines)
└── Helper functions (30 lines)
```

**Performance Optimization Strategy:**
1. Fetch unique transaction dates first (e.g., 1,000 transactions might only have 30 unique dates)
2. Use Promise.all to fetch rates in parallel (30 API calls in 2-3 seconds instead of 30 seconds)
3. Cache all rates in ExchangeRate table (subsequent conversions use cache)
4. Extend Prisma transaction timeout to 60 seconds (default 5s insufficient)

**Atomic Transaction Critical Path:**
1. Pre-flight: Check for existing IN_PROGRESS conversion (lock mechanism)
2. Create conversion log with status=IN_PROGRESS (establishes lock)
3. Fetch exchange rates (outside transaction for performance)
4. Enter Prisma $transaction:
   - Update all transactions (historical rates)
   - Update all accounts (current rate + originalCurrency)
   - Update all budgets (current rate)
   - Update all goals (current rate)
   - Update user currency
   - Mark conversion log as COMPLETED
5. If any error: Transaction auto-rolls back, mark log as FAILED

**Plaid Sync Modification:**
When syncing transactions after currency conversion, convert amount:
```typescript
// In plaid-sync.service.ts
const account = await prisma.account.findUnique({ where: { id: accountId } })
if (account.originalCurrency && account.originalCurrency !== user.currency) {
  const rate = await fetchExchangeRate(account.originalCurrency, user.currency)
  amount = amount.mul(rate)
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Atomic Transaction Wrapper (Prisma $transaction with 60s timeout)
- Rate Caching with TTL (check cache before API call)
- Exchange Rate API Integration Pattern (retry with exponential backoff)
- Batch Historical Rate Fetching Pattern (Promise.all optimization)
- API Error Handling Pattern (fallback to cached rates)

### Testing Requirements

**Unit Tests (Vitest):**
- Test `fetchExchangeRate()` with mocked fetch (API responses)
- Test retry logic with simulated failures (1st and 2nd attempt fail, 3rd succeeds)
- Test rate caching (verify cache hit on 2nd call, no API call)
- Test `convertUserCurrency()` with mocked Prisma (100 transactions)
- Test rollback on database error (mock Prisma error, verify status=FAILED)
- Test concurrent conversion prevention (two calls, 2nd should throw CONFLICT)
- Test Decimal precision (no rounding errors: 0.01, 999999.99, negative amounts)

**Integration Tests (with test database):**
- Full conversion with 10 transactions (verify all amounts updated)
- Full conversion with 100 transactions (verify performance <5s)
- API timeout simulation (mock fetch timeout, verify fallback to cache)
- Rate limit simulation (mock 429 response, verify error message)

**Performance Benchmarks:**
- 10 transactions: <1 second
- 100 transactions: <5 seconds
- 1,000 transactions: <30 seconds (acceptance criteria)

### Potential Split Strategy

**IF COMPLEXITY TOO HIGH, consider split:**

**Foundation (Builder 2 - Main):**
- Exchange rate API integration and caching
- Basic conversion service (transactions only)
- Retry logic and error handling
- Unit tests
- Estimate: 2-2.5 hours

**Sub-builder 2A: Extended Conversion**
- Convert accounts, budgets, goals
- Plaid sync updates
- Integration tests
- Performance optimization
- Estimate: 1-1.5 hours

**Handoff Point:** After API integration and transaction conversion working, sub-builder extends to all models.

**Recommendation:** Keep together if possible. High coupling between rate fetching and conversion logic. Splitting adds integration overhead.

---

## Builder-3: tRPC Router & Procedures

### Scope

Create tRPC router for currency operations with type-safe procedures for fetching supported currencies, exchange rates, conversion mutation, and status polling.

### Complexity Estimate

**MEDIUM** (1.5-2 hours)

Standard tRPC router pattern with input validation, but requires careful error handling and connection to service layer.

### Success Criteria

- [x] currency.router.ts created with 5 procedures
- [x] getSupportedCurrencies procedure (public, returns 10 currencies)
- [x] getExchangeRate procedure (protected, preview rate)
- [x] convertCurrency procedure (protected, main mutation)
- [x] getConversionHistory procedure (protected, audit log)
- [x] getConversionStatus procedure (protected, polling endpoint)
- [x] Input validation with Zod schemas (3-char currency codes)
- [x] Error handling with TRPCError codes (NOT_FOUND, CONFLICT, BAD_REQUEST)
- [x] Router added to appRouter in root.ts
- [x] Unit tests for all procedures (~150 lines)

### Files to Create

- `src/server/api/routers/currency.router.ts` - tRPC router (~200 lines)
- `src/server/api/routers/__tests__/currency.router.test.ts` - Unit tests (~150 lines)
- `src/types/currency.ts` - Type definitions (~30 lines)

### Files to Modify

- `src/server/api/root.ts` - Add currencyRouter to appRouter (~5 lines)
- `src/lib/constants.ts` - Add SUPPORTED_CURRENCIES constant (~15 lines)

### Dependencies

**Depends on:** Builder 2 (currency.service.ts functions)

**Blocks:** Builder 4 (UI components need tRPC procedures)

### Implementation Notes

**Procedure Breakdown:**

1. **getSupportedCurrencies** (Public)
   - No auth required (currency list is public data)
   - Returns array of { code, name, symbol }
   - Use SUPPORTED_CURRENCIES constant from lib/constants.ts

2. **getExchangeRate** (Protected)
   - Input: { fromCurrency, toCurrency, date? }
   - Validation: 3-char currency codes, optional date
   - Calls service layer fetchExchangeRate()
   - Returns: { rate, date, fromCurrency, toCurrency }
   - Error: TRPCError SERVICE_UNAVAILABLE if API fails

3. **convertCurrency** (Protected, Mutation)
   - Input: { toCurrency }
   - Validation: toCurrency must be in SUPPORTED_CURRENCIES
   - Pre-check: user.currency !== toCurrency (prevent no-op)
   - Calls service layer convertUserCurrency()
   - Returns: { success, logId, transactionCount, accountCount, budgetCount, goalCount }
   - Error: TRPCError CONFLICT if conversion IN_PROGRESS

4. **getConversionHistory** (Protected)
   - No input
   - Fetches last 10 conversion logs for user
   - Returns array sorted by startedAt DESC
   - Convert Decimal fields to string (JSON serialization)

5. **getConversionStatus** (Protected)
   - No input
   - Checks for IN_PROGRESS conversion log
   - Returns: { status: 'IN_PROGRESS' | 'IDLE', fromCurrency?, toCurrency?, startedAt? }
   - Used by UI for polling during conversion

**Input Validation Strategy:**
- Use Zod enums for currency codes (type safety + runtime validation)
- Validate date is in past (can't fetch future rates)
- Validate fromCurrency !== toCurrency (prevent no-op conversion)

**Error Handling Strategy:**
```typescript
try {
  const result = await convertUserCurrency(...)
  return result
} catch (error) {
  if (error instanceof TRPCError) {
    throw error // Already formatted
  }

  // Log unexpected error
  console.error('Unexpected conversion error:', error)

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Currency conversion failed. Please try again.',
  })
}
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- tRPC Router Setup Pattern (standard router structure)
- Use `protectedProcedure` for user-specific operations
- Use `publicProcedure` for non-authenticated endpoints
- Validate inputs with Zod schemas
- Convert Decimal to string for JSON serialization
- Throw TRPCError with appropriate codes

### Testing Requirements

**Unit Tests (Vitest):**
- Test getSupportedCurrencies returns 10 currencies
- Test getExchangeRate with valid input (mock service layer)
- Test getExchangeRate with invalid currency code (expect BAD_REQUEST)
- Test convertCurrency success flow (mock service layer)
- Test convertCurrency with same currency (expect BAD_REQUEST)
- Test convertCurrency with IN_PROGRESS conversion (expect CONFLICT)
- Test getConversionHistory returns sorted logs
- Test getConversionStatus with IN_PROGRESS conversion
- Test authentication (call without user, expect UNAUTHORIZED)

**Integration Tests:**
- Full conversion flow: getExchangeRate → convertCurrency → getConversionStatus → getConversionHistory
- Verify tRPC type safety (use createCaller pattern)

### Potential Split Strategy

**NO SPLIT RECOMMENDED** - Router is cohesive unit with 5 related procedures. Splitting would create artificial boundaries. Total work 1.5-2 hours is manageable for single builder.

---

## Builder-4: UI Components & Currency Display Updates

### Scope

Create currency settings page with selector, confirmation dialog, progress indicator, and success summary. Update formatCurrency utility and verify all 20+ components display new currency after conversion.

### Complexity Estimate

**MEDIUM-HIGH** (2.5-3 hours)

Multiple dialog components, state management, polling logic, and system-wide currency display verification across 20+ existing components.

### Success Criteria

- [x] Currency settings page (/settings/currency) functional
- [x] CurrencySelector component with 10 currencies dropdown
- [x] Exchange rate preview card (live rate display)
- [x] CurrencyConfirmationDialog with warning and checkbox
- [x] CurrencyConversionProgress dialog with polling
- [x] CurrencyConversionSuccess dialog with summary
- [x] Toast notifications for success/error
- [x] formatCurrency utility enhanced (getCurrencySymbol, getCurrencyName)
- [x] SUPPORTED_CURRENCIES constant in lib/constants.ts
- [x] All 20+ components display new currency after conversion
- [x] React Query cache invalidation after conversion
- [x] Loading states for all async operations
- [x] Error handling for all failure scenarios

### Files to Create

- `src/app/(dashboard)/settings/currency/page.tsx` - Main settings page (~150 lines)
- `src/components/currency/CurrencySelector.tsx` - Currency selector (~120 lines)
- `src/components/currency/CurrencyConfirmationDialog.tsx` - Confirmation (~150 lines)
- `src/components/currency/CurrencyConversionProgress.tsx` - Progress indicator (~120 lines)
- `src/components/currency/CurrencyConversionSuccess.tsx` - Success summary (~80 lines)
- `src/types/currency.ts` - Type definitions (~30 lines, if not created by Builder 3)

### Files to Modify

- `src/lib/utils.ts` - Add getCurrencySymbol, getCurrencyName (~30 lines)
- `src/lib/constants.ts` - Add SUPPORTED_CURRENCIES (~15 lines, if not created by Builder 3)

### Files to Verify (Currency Display)

**20+ Components Using formatCurrency (verify after conversion):**
- Dashboard: DashboardStats, RecentTransactionsCard, NetWorthCard, TopCategoriesCard, IncomeVsExpensesCard
- Accounts: AccountCard, Account detail pages
- Transactions: TransactionCard, Transaction detail pages
- Budgets: BudgetCard, Budget month pages
- Goals: GoalCard, GoalProgressChart
- Analytics: NetWorthChart, SpendingTrendsChart, SpendingByCategoryChart, MonthOverMonthChart, IncomeSourcesChart

**Critical:** AccountCard uses account.currency - must be updated to use user.currency

### Dependencies

**Depends on:** Builder 3 (tRPC currency procedures)

**Blocks:** None (final builder)

### Implementation Notes

**Component Hierarchy:**
```
/settings/currency/page.tsx (Container)
└── CurrencySelector
    ├── Exchange Rate Preview (conditional)
    └── CurrencyConfirmationDialog (triggered by button)
        └── CurrencyConversionProgress (after confirmation)
            └── CurrencyConversionSuccess (after completion)
```

**State Management Flow:**
1. User selects currency → `selectedCurrency` state updates
2. tRPC query fetches exchange rate preview (enabled when currency selected)
3. User clicks "Change Currency" → Open confirmation dialog
4. User checks checkbox → Enable "Continue" button
5. User clicks "Continue" → Trigger conversion mutation, show progress dialog
6. Poll conversion status every 2 seconds → Update progress bar
7. Conversion completes → Show success dialog with summary
8. User clicks "Done" → Invalidate all queries (automatic UI refresh)

**Polling Pattern:**
```typescript
const { data: status } = trpc.currency.getConversionStatus.useQuery(undefined, {
  refetchInterval: 2000, // Poll every 2 seconds
  refetchIntervalInBackground: true, // Continue polling if tab not focused
  enabled: converting, // Only poll during conversion
})
```

**Cache Invalidation Strategy:**
```typescript
const utils = trpc.useUtils()

const convertMutation = trpc.currency.convertCurrency.useMutation({
  onSuccess: () => {
    utils.invalidate() // Invalidate ALL queries (safest)
    // Alternative: Selective invalidation
    // utils.users.me.invalidate()
    // utils.transactions.getAll.invalidate()
    // utils.accounts.getAll.invalidate()
  },
})
```

**Progress Simulation:**
Real progress tracking requires service layer updates (complex). For MVP, simulate progress based on elapsed time:
- 0-20%: "Fetching exchange rates"
- 20-60%: "Converting transactions"
- 60-80%: "Updating accounts"
- 80-95%: "Updating budgets and goals"
- 95-100%: "Finalizing"

**Critical Fix: AccountCard Component:**
Current implementation likely uses `account.currency` for formatCurrency. Must change to user's currency:
```typescript
// BEFORE (incorrect)
formatCurrency(account.balance, account.currency)

// AFTER (correct)
const { data: user } = trpc.users.me.useQuery()
formatCurrency(account.balance, user?.currency || 'USD')
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- Currency Selector Component pattern
- Confirmation Dialog Component pattern
- Progress Dialog Component pattern
- Enhanced Currency Formatting pattern
- Error Handling Patterns (toast notifications)
- Loading State Patterns (Loader2 icon, disabled states)

### Testing Requirements

**Manual Testing (Critical):**
- [ ] Navigate to /settings/currency
- [ ] Select EUR from dropdown
- [ ] Verify exchange rate preview displays (e.g., "1 USD = 0.92 EUR")
- [ ] Click "Change Currency"
- [ ] Verify confirmation dialog shows transaction/account/budget/goal counts
- [ ] Check checkbox "I understand..."
- [ ] Verify "Continue" button enables
- [ ] Click "Continue with Conversion"
- [ ] Verify progress dialog appears (non-dismissible)
- [ ] Wait for conversion completion (should be <30s)
- [ ] Verify success dialog shows summary
- [ ] Click "Done"
- [ ] Navigate to Dashboard
- [ ] Verify all amounts display in EUR (not USD)
- [ ] Check AccountCard (verify uses user currency, not account currency)
- [ ] Navigate to Transactions
- [ ] Verify transaction amounts in EUR
- [ ] Navigate to Budgets
- [ ] Verify budget amounts in EUR
- [ ] Navigate to Goals
- [ ] Verify goal amounts in EUR
- [ ] Navigate to Analytics
- [ ] Verify chart amounts in EUR

**Component Testing (Vitest):**
- Test CurrencySelector renders 10 currencies
- Test currency selection enables "Change Currency" button
- Test confirmation dialog checkbox enables "Continue" button
- Test progress dialog prevents dismissal (onInteractOutside)
- Test success dialog displays summary statistics

**E2E Testing (Playwright - Optional):**
- Full conversion flow from currency selection to dashboard update
- Verify currency displays across all pages

### Potential Split Strategy

**IF COMPLEXITY TOO HIGH (>3.5 hours), consider split:**

**UI Components (Builder 4 - Main):**
- Currency settings page
- All dialog components (Selector, Confirmation, Progress, Success)
- State management and polling logic
- formatCurrency utility enhancements
- Estimate: 2-2.5 hours

**Sub-builder 4A: Currency Display Verification**
- Verify all 20+ components display new currency
- Fix AccountCard to use user.currency (not account.currency)
- Update form placeholders with currency symbols
- Add integration tests for currency display consistency
- Estimate: 1-1.5 hours

**Handoff Point:** After all dialog components working, sub-builder verifies system-wide display updates.

**Recommendation:** Try to keep together. Currency display verification is mostly passive (check existing components work). Only 1-2 components need active updates (AccountCard).

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)
- **Builder 1: Database & Migration** (1-2 hours)

### Parallel Group 2 (Depends on Group 1)
- **Builder 2: Currency Service & API** (3-4 hours)
  - Start immediately after Builder 1 completes
  - Most time-consuming builder

### Parallel Group 3 (Depends on Group 2)
- **Builder 3: tRPC Router** (1.5-2 hours)
  - Start immediately after Builder 2 completes
  - Can work in parallel with Builder 4 if Builder 4 mocks tRPC

### Parallel Group 4 (Depends on Group 3, but can start earlier with mocks)
- **Builder 4: UI Components** (2.5-3 hours)
  - Can start in parallel with Builder 3 if mocks tRPC procedures
  - Recommended: Wait for Builder 3 to avoid mock/real discrepancies

### Total Timeline

**Sequential (safest):**
- Builder 1: 1-2 hours
- Builder 2: 3-4 hours (starts after Builder 1)
- Builder 3: 1.5-2 hours (starts after Builder 2)
- Builder 4: 2.5-3 hours (starts after Builder 3)
- **Total: 8.5-11 hours** (upper estimate, includes buffer)

**Optimized (with mocking):**
- Builder 1: 1-2 hours
- Builder 2: 3-4 hours (starts after Builder 1)
- Builder 3 & 4: 2.5-3 hours in parallel (Builder 4 mocks tRPC)
- **Total: 7-9 hours** (acceptance criteria estimate)

---

## Integration Notes

### Shared File Coordination

**Files Modified by Multiple Builders:**
- `src/lib/constants.ts`: Builder 3 adds SUPPORTED_CURRENCIES, Builder 4 uses it
  - Resolution: Builder 3 creates first, Builder 4 imports
- `src/lib/utils.ts`: Builder 4 adds getCurrencySymbol, getCurrencyName
  - No conflict: Builder 4 only adds new functions
- `src/types/currency.ts`: Builder 3 may create types, Builder 4 uses them
  - Resolution: Builder 3 creates first, Builder 4 imports

### Merge Strategy

**Branch Structure:**
```
main
└── iter9-database (Builder 1)
    └── iter9-service (Builder 2)
        └── iter9-router (Builder 3)
            └── iter9-ui (Builder 4)
                └── merge to main
```

**Merge Checklist:**
1. Builder 1 → Push to `iter9-database`, verify migration works
2. Builder 2 → Merge `iter9-database`, create `iter9-service`
3. Builder 3 → Merge `iter9-service`, create `iter9-router`
4. Builder 4 → Merge `iter9-router`, create `iter9-ui`
5. Final Integration → Merge `iter9-ui` to main with comprehensive testing

### Conflict Prevention

**Minimize Conflicts:**
- Builder 1: Only touches `prisma/schema.prisma`, `prisma/migrations/`
- Builder 2: Only creates `src/server/services/currency.service.ts` and tests
- Builder 3: Only creates `src/server/api/routers/currency.router.ts` and tests
- Builder 4: Only creates `src/components/currency/*` and modifies utilities

**Likely Conflicts:**
- `src/server/api/root.ts`: Builder 3 adds currencyRouter
  - Low risk: Single line addition
- `src/lib/constants.ts`: Builder 3 adds SUPPORTED_CURRENCIES
  - Low risk: New export
- `src/lib/utils.ts`: Builder 4 adds helper functions
  - Low risk: Append to end of file

### Testing Integration

**After All Builders Complete:**

1. **Run Full Test Suite:**
   ```bash
   npm run test
   ```

2. **Run Type Check:**
   ```bash
   npx tsc --noEmit
   ```

3. **Run Linter:**
   ```bash
   npm run lint
   ```

4. **Manual Integration Test:**
   - Reset local database
   - Run migrations
   - Seed with 100 transactions
   - Navigate to /settings/currency
   - Convert USD → EUR
   - Verify success in <5 seconds
   - Check dashboard displays EUR
   - Convert EUR → USD (verify bidirectional)

5. **Performance Test:**
   - Seed database with 1,000 transactions
   - Convert USD → EUR
   - Verify completion in <30 seconds
   - Check conversion log for performance metrics

---

## Post-Integration Checklist

### Before Marking Iteration Complete

- [ ] All 4 builders merged to main
- [ ] Database migration applied to production
- [ ] Environment variable EXCHANGE_RATE_API_KEY configured
- [ ] All unit tests passing (80%+ coverage)
- [ ] Integration tests passing
- [ ] Performance tests passing (<30s for 1,000 transactions)
- [ ] Manual testing completed (10-point checklist)
- [ ] All 20+ currency display components verified
- [ ] Error handling tested (API timeout, concurrent conversion)
- [ ] Documentation updated (.env.example, README if exists)
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build succeeds (npm run build)

### Known Issues / Future Work

Document any deferred items:
- [ ] Reversible conversions (store original amounts, 30-day undo)
- [ ] Email confirmation after conversion
- [ ] Background job for >5,000 transactions
- [ ] Expand to 50 currencies (from 10)
- [ ] Multi-currency account support
- [ ] Manual exchange rate entry (API fallback)
- [ ] Conversion history UI (currently backend only)

---

**Document Version:** 1.0
**Created:** 2025-10-02
**Total Builders:** 4
**Estimated Duration:** 7-9 hours (optimized) / 8.5-11 hours (sequential)
**Status:** READY FOR BUILDER ASSIGNMENT
