# Explorer 1 Report: Database Schema & Exchange Rate Integration

## Executive Summary

The currency conversion system requires two new database models (ExchangeRate, CurrencyConversionLog), integration with exchangerate-api.com (free tier: 1,500 requests/month), and a transactional conversion service that updates 4 financial models (Transaction, Account, Budget, Goal) atomically. The existing Prisma setup with PostgreSQL supports ACID transactions perfectly. Performance target of <30s for 1,000 transactions is achievable with batch processing and cached exchange rates. Primary risk: data integrity during conversion - fully mitigated via Prisma $transaction wrapper with rollback capability.

## Discoveries

### Current Database State

**User Model:**
- Already has `currency` field (String, default "USD")
- Has `role` and `subscriptionTier` fields from Iteration 8
- Indexed on critical fields (supabaseAuthId, email, role, createdAt)

**Financial Models with Decimal Amounts:**
1. **Transaction** - `amount` field (Decimal 15,2)
   - 190+ lines, well-indexed (userId, date, accountId, categoryId)
   - Has plaidTransactionId for Plaid-synced transactions
   - Has `isManual` boolean to distinguish manual vs synced

2. **Account** - `balance` field (Decimal 15,2)
   - Has `currency` field (String, default "USD") - potential conflict?
   - Has `plaidAccountId` for Plaid-linked accounts
   - Has `lastSynced` for tracking sync status

3. **Budget** - `amount` field (Decimal 15,2)
   - Monthly budgets (format: "2025-01")
   - Unique constraint on (userId, categoryId, month)

4. **Goal** - `targetAmount` and `currentAmount` fields (both Decimal 15,2)
   - Has `linkedAccountId` for tracking specific accounts
   - Has completion tracking (`isCompleted`, `completedAt`)

**Existing Transaction Support:**
- `prisma.$transaction()` used in cleanup script (scripts/cleanup-user-data.ts)
- Pattern: `await prisma.$transaction(async (tx) => { ... })`
- Supports both array and callback syntax
- PostgreSQL isolation levels supported

### Technology Stack Analysis

**Current Dependencies:**
- Prisma 5.22.0 (stable, excellent transaction support)
- PostgreSQL (via Supabase local)
- tRPC 11.6.0 (type-safe API layer)
- Zod 3.23.8 (schema validation)
- Next.js 14.2.33 (App Router)
- No existing HTTP client library (would need to add for API calls)

**Service Pattern:**
- Services in `src/server/services/` (plaid.service.ts, categorize.service.ts)
- Routers in `src/server/api/routers/` (9 routers total)
- Protected procedures via `protectedProcedure` (requires auth)
- Admin procedures via `adminProcedure` (requires ADMIN role)

## Patterns Identified

### Database Transaction Pattern

**Description:** Prisma's interactive transaction API for atomic multi-model updates

**Use Case:** Currency conversion must update all financial data atomically (all succeed or all fail)

**Example from cleanup-user-data.ts:**
```typescript
await prisma.$transaction(async (tx) => {
  const deletedTransactions = await tx.transaction.deleteMany({
    where: { userId: user.id },
  })
  const deletedBudgets = await tx.budget.deleteMany({
    where: { userId: user.id },
  })
  // etc... all operations succeed or all roll back
})
```

**Recommendation:** YES - This is the ONLY safe way to do currency conversion. Use callback syntax with timeout extension (default 5s may not suffice for 1,000+ records).

### Service Layer Pattern

**Description:** Separate service files for external integrations (Plaid, categorization)

**Use Case:** Exchange rate API integration should be isolated from tRPC router logic

**Example from plaid.service.ts:**
```typescript
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string): Promise<string> {
  const response = await plaidClient.linkTokenCreate({ ... })
  return response.data.link_token
}
```

**Recommendation:** YES - Create `currency.service.ts` following this pattern for exchange rate API calls, rate caching, and conversion logic.

### tRPC Protected Procedure Pattern

**Description:** Type-safe API endpoints with authentication and authorization

**Use Case:** Currency conversion endpoint must be protected and user-scoped

**Example from trpc.ts:**
```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }
  return next({
    ctx: {
      user: ctx.user, // Guaranteed non-null
      prisma: ctx.prisma,
    },
  })
})
```

**Recommendation:** YES - Use `protectedProcedure` for all currency router endpoints. Consider adding conversion-in-progress check middleware.

## Complexity Assessment

### High Complexity Areas

**Currency Conversion Service (7-9 hours)**
- **Why Complex:**
  1. External API integration with retry/fallback logic
  2. Historical exchange rate fetching (per-transaction date)
  3. Atomic multi-model updates (4 models: Transaction, Account, Budget, Goal)
  4. Rollback mechanism on any failure
  5. Performance optimization for 1,000+ records
  6. Rate caching with TTL management
  7. Conversion lock to prevent concurrent operations

- **Estimated Builder Splits:** LIKELY 1 SPLIT
  - Main Builder: Database models, API integration, basic conversion service
  - Sub-Builder A: UI components (/settings/currency page, confirmation dialog, progress indicator)
  - Reason: Backend complexity (API, transactions, caching) separate from frontend UX

**Edge Case Handling (2-3 hours)**
- API timeout/failure scenarios
- Stale rate handling (>7 days old)
- Concurrent conversion prevention
- Mid-conversion navigation handling
- Plaid-synced transaction considerations

### Medium Complexity Areas

**Database Schema Changes (1-2 hours)**
- Two new models (ExchangeRate, CurrencyConversionLog)
- Indexes for performance
- Migration creation and testing
- Straightforward Prisma schema additions

**Exchange Rate API Integration (2-3 hours)**
- API client setup
- Rate fetching with retry logic
- Cache management
- Error handling

### Low Complexity Areas

**tRPC Router Setup (1 hour)**
- Standard CRUD procedures
- Input validation with Zod
- Follows existing router patterns

**Environment Configuration (30 minutes)**
- Add EXCHANGE_RATE_API_KEY to .env
- Update .env.example
- Document API key acquisition

## Technology Recommendations

### Primary Stack

**Database Models:**
```prisma
// Exchange rate caching
model ExchangeRate {
  id           String   @id @default(cuid())
  date         DateTime @db.Date // Historical rate date (NOT timestamp)
  fromCurrency String   // e.g., "USD"
  toCurrency   String   // e.g., "EUR"
  rate         Decimal  @db.Decimal(18, 8) // High precision for rates
  source       String   @default("exchangerate-api.com")
  createdAt    DateTime @default(now())
  expiresAt    DateTime // TTL: createdAt + 24 hours

  @@unique([date, fromCurrency, toCurrency])
  @@index([fromCurrency, toCurrency, date])
  @@index([expiresAt]) // For cleanup of stale rates
}

// Audit log for conversions
model CurrencyConversionLog {
  id               String    @id @default(cuid())
  userId           String
  fromCurrency     String
  toCurrency       String
  exchangeRate     Decimal   @db.Decimal(18, 8)
  status           ConversionStatus
  errorMessage     String?   @db.Text
  transactionCount Int       @default(0)
  accountCount     Int       @default(0)
  budgetCount      Int       @default(0)
  goalCount        Int       @default(0)
  startedAt        DateTime  @default(now())
  completedAt      DateTime?
  durationMs       Int?      // Performance tracking

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startedAt])
  @@index([status])
}

enum ConversionStatus {
  IN_PROGRESS
  COMPLETED
  FAILED
  ROLLED_BACK
}
```

**Rationale:**
- **ExchangeRate.date as @db.Date:** Historical rates don't need time precision, saves storage
- **rate as Decimal(18,8):** Exchange rates need high precision (e.g., 1 USD = 0.00001234 BTC)
- **Unique constraint:** Prevents duplicate rate entries for same date/pair
- **expiresAt field:** Enables automatic cleanup of stale cached rates (24-hour TTL)
- **CurrencyConversionLog:** Complete audit trail with performance metrics
- **ConversionStatus enum:** Clear state tracking, supports "IN_PROGRESS" lock mechanism

**Additional User Relation:**
```prisma
// Add to User model
model User {
  // ... existing fields ...
  currencyConversionLogs CurrencyConversionLog[]
}
```

### Exchange Rate API Comparison

**Option 1: exchangerate-api.com (RECOMMENDED)**
- **Pricing:** Free tier 1,500 requests/month (sufficient for small user base)
- **Historical Rates:** YES (via `/{date}` endpoint)
- **API Structure:** `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD`
- **Historical:** `https://v6.exchangerate-api.com/v6/{API_KEY}/history/USD/{YYYY}/{MM}/{DD}`
- **Response Format:**
  ```json
  {
    "result": "success",
    "base_code": "USD",
    "conversion_rates": {
      "EUR": 0.92,
      "GBP": 0.79,
      "CAD": 1.36,
      // ... 160+ currencies
    }
  }
  ```
- **Rate Limits:** 1,500/month = ~50/day (with caching, this is plenty)
- **Pros:**
  - Simple API, no auth complexity
  - Historical data included in free tier
  - High precision rates (8 decimals)
  - Reliable uptime (99.9% SLA on paid tiers)
- **Cons:**
  - 1,500/month limit (upgrade to paid if user base grows)
  - No WebSocket/real-time rates (not needed for this use case)

**Option 2: exchangerate.host (ALTERNATIVE)**
- **Pricing:** Free tier 250 requests/month (TOO LOW)
- **Historical Rates:** YES
- **Pros:** Open-source, community-driven
- **Cons:** Lower rate limit, less reliable

**Option 3: fixer.io (NOT RECOMMENDED)**
- **Pricing:** Free tier 100 requests/month (TOO LOW)
- **Historical Rates:** Paid tier only
- **Cons:** Insufficient for free tier

**Final Recommendation: exchangerate-api.com**
- 1,500/month is sufficient with 24-hour caching
- Historical rates are FREE (critical for per-transaction conversion)
- Simple API, easy integration
- Fallback strategy: If rate limit exceeded, use most recent cached rate with warning

### Supporting Libraries

**HTTP Client: Native Fetch (Built into Node.js 18+)**
- **Purpose:** API calls to exchangerate-api.com
- **Why:** No additional dependency needed (Next.js 14 uses Node.js 18+)
- **Example:**
  ```typescript
  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${currency}`
  )
  const data = await response.json()
  ```

**Retry Logic: Custom Exponential Backoff**
- **Purpose:** Handle transient API failures
- **Why:** Simple to implement, no library needed
- **Pattern:**
  ```typescript
  async function fetchWithRetry(url: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetch(url)
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await sleep(Math.pow(2, i) * 1000) // 1s, 2s, 4s
      }
    }
  }
  ```

**Progress Tracking: tRPC Subscriptions (Future Enhancement)**
- **Purpose:** Real-time progress updates during conversion
- **Why:** Not in current dependencies, consider for v2
- **MVP Approach:** Polling-based status check (simpler, no WebSocket needed)

## Integration Points

### External APIs

**exchangerate-api.com**
- **Purpose:** Fetch current and historical exchange rates
- **Complexity:** LOW-MEDIUM
- **Considerations:**
  1. **Rate Limiting:** 1,500 requests/month
     - Mitigation: Cache rates for 24 hours (ExchangeRate model)
     - Example: Converting USD→EUR 100 times uses 1 API call (if cached)
  2. **Historical Rates:** Required for accurate transaction conversion
     - Each transaction date needs its corresponding exchange rate
     - Optimization: Batch-fetch unique dates (e.g., 100 transactions might only have 30 unique dates)
  3. **API Failures:**
     - Retry logic: 3 attempts with exponential backoff
     - Fallback: Use most recent cached rate if API is down (with warning to user)
     - Stale rate threshold: 7 days (warn user if rate is >7 days old)
  4. **API Key Security:**
     - Store in `.env` as `EXCHANGE_RATE_API_KEY`
     - Server-side only (never exposed to client)
     - Document in `.env.example`

**Integration Code Pattern:**
```typescript
// src/server/services/currency.service.ts
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY
const RATE_CACHE_TTL_HOURS = 24

export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<Decimal> {
  // 1. Check cache first
  const cached = await prisma.exchangeRate.findUnique({
    where: {
      date_fromCurrency_toCurrency: {
        date: date || new Date(),
        fromCurrency,
        toCurrency,
      },
    },
  })

  if (cached && cached.expiresAt > new Date()) {
    return cached.rate
  }

  // 2. Fetch from API with retry
  const url = date
    ? `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/history/${fromCurrency}/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`
    : `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency}`

  const data = await fetchWithRetry(url)
  const rate = data.conversion_rates[toCurrency]

  // 3. Cache for 24 hours
  await prisma.exchangeRate.create({
    data: {
      date: date || new Date(),
      fromCurrency,
      toCurrency,
      rate: new Decimal(rate),
      expiresAt: new Date(Date.now() + RATE_CACHE_TTL_HOURS * 60 * 60 * 1000),
    },
  })

  return new Decimal(rate)
}
```

### Internal Integrations

**User.currency ↔ Financial Models (Transaction, Account, Budget, Goal)**
- **Connection:** All amounts stored in User.currency
- **Conversion Flow:**
  1. User initiates currency change (USD → EUR)
  2. Service fetches exchange rate (e.g., 1 USD = 0.92 EUR)
  3. Transaction updates all 4 models atomically:
     ```typescript
     await prisma.$transaction(async (tx) => {
       // Update transactions
       const transactions = await tx.transaction.findMany({
         where: { userId },
       })
       for (const t of transactions) {
         const historicalRate = await fetchExchangeRate(
           fromCurrency,
           toCurrency,
           t.date
         )
         await tx.transaction.update({
           where: { id: t.id },
           data: { amount: t.amount.mul(historicalRate) },
         })
       }

       // Update accounts (current balance, use today's rate)
       // Update budgets (budget amounts, use today's rate)
       // Update goals (target/current amounts, use today's rate)

       // Update user currency
       await tx.user.update({
         where: { id: userId },
         data: { currency: toCurrency },
       })
     }, { timeout: 60000 }) // 60 second timeout for large datasets
     ```

**Plaid Transactions ↔ Currency Conversion**
- **Connection:** Plaid-synced transactions (isManual=false) must also be converted
- **Consideration:** After conversion, future Plaid syncs continue in NEW currency
  - Problem: Plaid returns amounts in account's original currency
  - Solution: Store original currency in Account model (new field: `originalCurrency`)
  - On sync: Convert Plaid amount from `originalCurrency` to User.currency
- **Migration Need:** Add `Account.originalCurrency` field:
  ```prisma
  model Account {
    // ... existing fields ...
    originalCurrency String? // Null for manual accounts, set for Plaid accounts
  }
  ```

**Account.currency vs User.currency (CONFLICT RESOLUTION)**
- **Current Issue:** Account has `currency` field (default "USD"), User has `currency` field
- **Decision Required:** Should accounts support multi-currency?
  - **Option A (RECOMMENDED):** Single currency per user
    - Remove `Account.currency` field (breaking change)
    - All accounts inherit `User.currency`
    - Simpler, matches master plan scope
  - **Option B:** Multi-currency support
    - Keep `Account.currency` field
    - Conversion converts each account to User's preferred display currency
    - More complex, not in Iteration 2 scope
- **Recommendation:** Option A - Remove `Account.currency`, use only `User.currency`
  - Migration: Update all accounts to match their user's currency before removing field
  - Add `Account.originalCurrency` for Plaid accounts (as noted above)

## Risks & Challenges

### Technical Risks

**Risk 1: Data Corruption from Partial Conversion**
- **Impact:** CRITICAL - User loses financial data integrity
- **Likelihood:** MEDIUM without proper safeguards
- **Mitigation:**
  1. Use Prisma `$transaction()` with callback syntax (atomic all-or-nothing)
  2. Extend timeout to 60 seconds (default 5s insufficient for 1,000+ records)
  3. Add pre-conversion data backup (store original amounts for 30 days - see Open Questions)
  4. Comprehensive testing with rollback scenarios
  5. Conversion lock prevents concurrent conversions (status=IN_PROGRESS check)

**Risk 2: Exchange Rate API Downtime**
- **Impact:** HIGH - Cannot perform conversion
- **Likelihood:** LOW (99.9% uptime, but still possible)
- **Mitigation:**
  1. Retry logic (3 attempts, exponential backoff)
  2. Fallback to cached rates (warn if >7 days stale)
  3. User-friendly error message: "Currency conversion temporarily unavailable. Please try again in a few minutes."
  4. Log failed attempts in CurrencyConversionLog for debugging
  5. Consider alternative API as backup (exchangerate.host)

**Risk 3: Historical Rate Unavailability**
- **Impact:** MEDIUM - Transactions converted with today's rate instead of historical rate
- **Likelihood:** LOW (exchangerate-api.com supports historical data)
- **Mitigation:**
  1. Verify historical rate availability before starting conversion
  2. If historical rate unavailable, use today's rate with warning
  3. Document in CurrencyConversionLog which transactions used fallback rates
  4. Allow re-conversion if user wants to retry with correct historical rates

**Risk 4: Plaid Sync After Conversion**
- **Impact:** MEDIUM - New Plaid transactions in wrong currency
- **Likelihood:** HIGH if not handled
- **Mitigation:**
  1. Add `Account.originalCurrency` field for Plaid accounts
  2. On Plaid sync, convert from originalCurrency to User.currency
  3. Update plaid-sync.service.ts to handle currency conversion
  4. Test Plaid sync after currency conversion

### Complexity Risks

**Risk 1: Performance Degradation with Large Datasets**
- **Impact:** HIGH - User waits >30 seconds (acceptance criteria failure)
- **Likelihood:** MEDIUM-HIGH for users with 1,000+ transactions
- **Mitigation:**
  1. Batch processing: Update transactions in batches of 100
  2. Optimize database queries (use `updateMany` where possible, but limited by per-transaction rates)
  3. Parallel rate fetching for unique dates (Promise.all)
  4. Progress indicator shows percentage completion
  5. Performance testing with synthetic datasets (10, 100, 1,000, 10,000 transactions)
  6. Consider background job for >5,000 transactions (future enhancement)

**Risk 2: Builder Needs to Split**
- **Impact:** MEDIUM - Delays completion, requires coordination
- **Likelihood:** MEDIUM-HIGH (backend + frontend complexity)
- **Mitigation:**
  1. Clear separation of concerns: Service layer (backend) vs UI components (frontend)
  2. API contract defined upfront (tRPC router procedures)
  3. Mock API responses for frontend development
  4. Builder can create sub-builder for UI after service layer is working

## Recommendations for Planner

### 1. Database Schema Changes (CRITICAL)

**Add Two New Models:**
- `ExchangeRate` (rate caching)
- `CurrencyConversionLog` (audit trail)

**Modify Existing Models:**
- Add `Account.originalCurrency` (String?, for Plaid accounts)
- Add `User.currencyConversionLogs` relation
- **Decision Required:** Remove `Account.currency` field? (Recommend: YES)

**Migration Order:**
1. Add new fields/models
2. Backfill `Account.originalCurrency` for Plaid accounts
3. Backfill `Account.currency` to match `User.currency` (if removing field)
4. Remove `Account.currency` (if decided)

### 2. Service Architecture (RECOMMENDED PATTERN)

**Create `src/server/services/currency.service.ts`:**
```typescript
// Core functions:
export async function fetchExchangeRate(from, to, date?)
export async function convertUserCurrency(userId, fromCurrency, toCurrency)
export async function getCachedRate(from, to, date)
export async function getConversionHistory(userId)

// Internal helpers:
async function fetchWithRetry(url, maxRetries)
async function batchFetchHistoricalRates(fromCurrency, toCurrency, dates[])
async function convertTransactions(tx, userId, rate, historicalRates)
async function convertAccounts(tx, userId, rate)
async function convertBudgets(tx, userId, rate)
async function convertGoals(tx, userId, rate)
```

**Create `src/server/api/routers/currency.router.ts`:**
```typescript
export const currencyRouter = router({
  getSupportedCurrencies: publicProcedure.query(),
  getExchangeRate: protectedProcedure.input(z.object({...})).query(),
  convertCurrency: protectedProcedure.input(z.object({...})).mutation(),
  getConversionHistory: protectedProcedure.query(),
  getConversionStatus: protectedProcedure.query(), // For polling during conversion
})
```

### 3. Conversion Algorithm (ATOMIC TRANSACTION APPROACH)

**Step-by-Step Process:**
```typescript
async function convertUserCurrency(userId, fromCurrency, toCurrency) {
  // 1. Pre-flight checks
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user.currency !== fromCurrency) {
    throw new Error('User currency mismatch')
  }

  // 2. Check for in-progress conversion
  const inProgress = await prisma.currencyConversionLog.findFirst({
    where: { userId, status: 'IN_PROGRESS' },
  })
  if (inProgress) {
    throw new Error('Conversion already in progress')
  }

  // 3. Create conversion log (status: IN_PROGRESS)
  const conversionLog = await prisma.currencyConversionLog.create({
    data: {
      userId,
      fromCurrency,
      toCurrency,
      status: 'IN_PROGRESS',
      exchangeRate: 0, // Updated later
    },
  })

  try {
    // 4. Fetch today's exchange rate (for accounts, budgets, goals)
    const todayRate = await fetchExchangeRate(fromCurrency, toCurrency)

    // 5. Fetch historical rates for all transaction dates (batch)
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: { date: true },
    })
    const uniqueDates = [...new Set(transactions.map(t => t.date))]
    const historicalRates = await batchFetchHistoricalRates(
      fromCurrency,
      toCurrency,
      uniqueDates
    )

    // 6. Atomic conversion in transaction
    await prisma.$transaction(async (tx) => {
      // Convert transactions (historical rates)
      let transactionCount = 0
      for (const t of transactions) {
        const rate = historicalRates[t.date.toISOString()]
        await tx.transaction.update({
          where: { id: t.id },
          data: { amount: t.amount.mul(rate) },
        })
        transactionCount++
      }

      // Convert accounts (today's rate)
      const accounts = await tx.account.findMany({ where: { userId } })
      for (const a of accounts) {
        await tx.account.update({
          where: { id: a.id },
          data: { balance: a.balance.mul(todayRate) },
        })
      }

      // Convert budgets (today's rate)
      const budgets = await tx.budget.findMany({ where: { userId } })
      for (const b of budgets) {
        await tx.budget.update({
          where: { id: b.id },
          data: { amount: b.amount.mul(todayRate) },
        })
      }

      // Convert goals (today's rate)
      const goals = await tx.goal.findMany({ where: { userId } })
      for (const g of goals) {
        await tx.goal.update({
          where: { id: g.id },
          data: {
            targetAmount: g.targetAmount.mul(todayRate),
            currentAmount: g.currentAmount.mul(todayRate),
          },
        })
      }

      // Update user currency
      await tx.user.update({
        where: { id: userId },
        data: { currency: toCurrency },
      })
    }, { timeout: 60000 }) // 60 second timeout

    // 7. Update conversion log (status: COMPLETED)
    await prisma.currencyConversionLog.update({
      where: { id: conversionLog.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        durationMs: Date.now() - conversionLog.startedAt.getTime(),
        transactionCount: transactions.length,
        accountCount: accounts.length,
        budgetCount: budgets.length,
        goalCount: goals.length,
        exchangeRate: todayRate,
      },
    })

    return { success: true, conversionLog }

  } catch (error) {
    // 8. Rollback: Update log (status: FAILED)
    await prisma.currencyConversionLog.update({
      where: { id: conversionLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    })

    throw error
  }
}
```

**Key Features:**
- **Atomic:** All updates succeed or all fail (Prisma $transaction)
- **Lock Mechanism:** IN_PROGRESS status prevents concurrent conversions
- **Historical Accuracy:** Transactions use their original date's exchange rate
- **Audit Trail:** Complete log of conversion attempt
- **Performance:** Batch-fetch historical rates (reduces API calls)

### 4. Performance Optimization Strategy

**Target: <30 seconds for 1,000 transactions**

**Optimizations:**
1. **Batch Historical Rate Fetching:**
   - Instead of 1,000 API calls, identify unique dates (e.g., 30 dates)
   - Fetch all 30 rates in parallel (Promise.all)
   - Reduces API calls by 97% (1,000 → 30)

2. **Database Query Optimization:**
   - Use `findMany` to fetch all records at once (avoid N+1 queries)
   - Consider `updateMany` for same-date transactions (limited applicability)

3. **Progress Tracking:**
   - Update conversion log progress every 100 records
   - Client polls `getConversionStatus` endpoint every 2 seconds
   - Shows percentage completion: "Converting 347 of 1,000 transactions..."

4. **Timeout Configuration:**
   - Extend Prisma transaction timeout to 60 seconds (default 5s)
   - Consider 120 seconds for >5,000 records (edge case)

5. **Testing Benchmarks:**
   - 10 transactions: <1 second
   - 100 transactions: <5 seconds
   - 1,000 transactions: <30 seconds (acceptance criteria)
   - 10,000 transactions: <5 minutes (document as edge case, recommend waiting)

### 5. UI/UX Recommendations for Builder

**Settings Page (/settings/currency):**
- Display current currency prominently
- Dropdown selector with major currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL)
- "Change Currency" button (disabled if conversion in progress)
- Show last conversion date (from CurrencyConversionLog)

**Confirmation Dialog:**
```
⚠️ Change Currency to EUR?

This will convert ALL your financial data from USD to EUR:
- 1,247 transactions (using historical exchange rates)
- 5 accounts (current balances)
- 12 budgets
- 3 goals

Current exchange rate: 1 USD = 0.92 EUR

⚠️ This action affects all your data and may take up to 30 seconds.

[Cancel] [Convert to EUR]
```

**Progress Indicator (During Conversion):**
```
Converting to EUR...

███████████░░░░░░░░░ 58% (724 of 1,247 transactions)

Please wait, this may take up to 30 seconds.
Do not close this page.
```

**Success Message:**
```
✅ Currency Changed Successfully

Your currency has been changed from USD to EUR.

Summary:
- 1,247 transactions converted (historical rates)
- 5 account balances updated
- 12 budgets updated
- 3 goals updated

Exchange rate used: 1 USD = 0.92 EUR
Completed in 18 seconds
```

**Error Message (with Recovery):**
```
❌ Currency Conversion Failed

The conversion was cancelled due to an error:
"Exchange rate API temporarily unavailable"

Your data has NOT been changed. Please try again in a few minutes.

[Try Again] [Cancel]
```

### 6. Testing Strategy (CRITICAL FOR DATA INTEGRITY)

**Unit Tests:**
- `fetchExchangeRate()` with mocked API
- `convertUserCurrency()` with mocked Prisma
- Retry logic with simulated failures
- Rate caching logic

**Integration Tests:**
- End-to-end conversion with test database
- Rollback on mid-conversion failure (simulate Prisma error)
- API timeout handling
- Concurrent conversion prevention (two simultaneous requests)

**Performance Tests:**
```typescript
// Test with synthetic data
describe('Currency Conversion Performance', () => {
  it('converts 10 transactions in <1 second', async () => {
    const startTime = Date.now()
    await convertUserCurrency(userId, 'USD', 'EUR')
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(1000)
  })

  it('converts 1000 transactions in <30 seconds', async () => {
    // ... same pattern
    expect(duration).toBeLessThan(30000)
  })
})
```

**Manual Testing Checklist:**
- [ ] Convert with 0 transactions (edge case)
- [ ] Convert with 1 transaction
- [ ] Convert with 100 transactions
- [ ] Convert with 1,000 transactions
- [ ] Convert same currency (USD → USD, should error)
- [ ] Convert while conversion in progress (should error)
- [ ] Convert with API down (should use cached rates or fail gracefully)
- [ ] Convert back to original currency (USD → EUR → USD)
- [ ] Verify all amounts display correctly in UI after conversion
- [ ] Plaid sync after conversion (verify new transactions convert correctly)

## Resource Map

### Critical Files/Directories

**Database:**
- `/prisma/schema.prisma` - Add ExchangeRate, CurrencyConversionLog models, modify Account model
- `/prisma/migrations/` - New migration for schema changes

**Backend Services:**
- `/src/server/services/currency.service.ts` - NEW: Exchange rate API integration, conversion logic
- `/src/server/services/plaid-sync.service.ts` - MODIFY: Handle currency conversion on sync

**Backend Routers:**
- `/src/server/api/routers/currency.router.ts` - NEW: Currency conversion endpoints
- `/src/server/api/root.ts` - MODIFY: Add currencyRouter to app router

**Frontend Pages:**
- `/src/app/(dashboard)/settings/currency/page.tsx` - NEW: Currency settings page
- `/src/app/(dashboard)/settings/page.tsx` - MODIFY: Add link to currency settings

**Frontend Components:**
- `/src/components/currency/CurrencySelector.tsx` - NEW: Currency dropdown
- `/src/components/currency/ConversionDialog.tsx` - NEW: Confirmation dialog
- `/src/components/currency/ConversionProgress.tsx` - NEW: Progress indicator

**Configuration:**
- `/.env.example` - MODIFY: Add EXCHANGE_RATE_API_KEY
- `/.env` - ADD: EXCHANGE_RATE_API_KEY (local development)

### Key Dependencies

**Existing (No New Packages Needed):**
- `@prisma/client` - Database ORM with transaction support
- `@trpc/server` - Type-safe API layer
- `zod` - Input validation
- `decimal.js` (via Prisma) - High-precision arithmetic

**Native APIs:**
- `fetch` (Node.js 18+) - HTTP client for exchange rate API
- `Promise.all` - Parallel rate fetching

**Rationale:** No additional npm packages needed. Keep dependencies minimal.

### Testing Infrastructure

**Tools:**
- `vitest` (already in devDependencies) - Unit and integration tests
- `vitest-mock-extended` (already in devDependencies) - Prisma mocking

**Test Files:**
- `/src/server/services/__tests__/currency.service.test.ts` - NEW
- `/src/server/api/routers/__tests__/currency.router.test.ts` - NEW

**Test Approach:**
1. **Service Layer Tests:**
   - Mock `fetch` for API calls
   - Mock Prisma for database operations
   - Test retry logic, caching, error handling

2. **Router Tests:**
   - Mock `currency.service.ts` functions
   - Test authentication/authorization
   - Test input validation (Zod schemas)

3. **Integration Tests:**
   - Use test database (Supabase local)
   - Seed test data (10, 100, 1,000 transactions)
   - Run full conversion, verify results
   - Test rollback on failure

## Questions for Planner

### 1. Account.currency Field Conflict

**Question:** Should we remove `Account.currency` field and use only `User.currency`?

**Context:** Current schema has both `User.currency` and `Account.currency`, but Iteration 2 scope implies single currency per user.

**Options:**
- **Option A (RECOMMENDED):** Remove `Account.currency`, use only `User.currency`
  - Pros: Simpler, matches scope, easier to maintain
  - Cons: Breaking change, requires migration
- **Option B:** Keep both, support multi-currency accounts
  - Pros: More flexible for future
  - Cons: Out of scope, adds complexity

**Recommendation:** Option A - Remove `Account.currency` in this iteration.

### 2. Conversion Reversibility

**Question:** Should we store original amounts for reversible conversions?

**Context:** Master plan suggests "Should currency conversion be reversible (store original amounts for 30 days)? Recommend: YES"

**Implementation:**
- Add `Transaction.originalAmount` and `Transaction.originalCurrency` fields
- Add same to Account, Budget, Goal models
- TTL: 30 days (cleanup job removes after 30 days)
- Enables "Undo Conversion" feature

**Cost:** Additional storage (4 models × 2 fields each), cleanup job complexity

**Recommendation:** YES for v1 (data safety), but mark as optional if time-constrained.

### 3. Email Confirmation

**Question:** Should we send email after successful conversion?

**Context:** Master plan suggests "Should we send confirmation email after currency change? Recommend: YES"

**Requirements:**
- Resend integration (RESEND_API_KEY already in .env.example)
- Email template with conversion summary
- User setting to enable/disable emails

**Cost:** 1-2 hours additional work

**Recommendation:** YES, but mark as "nice to have" (can be added post-MVP).

### 4. Background Job for Large Datasets

**Question:** Should we implement background job processing for >5,000 transactions?

**Context:** Performance target is <30 seconds for 1,000 transactions. What about users with 10,000+ transactions?

**Options:**
- **Option A:** Block UI for all conversions (simple, MVP)
- **Option B:** Background job for >5,000 transactions (complex, requires queue)

**Recommendation:** Option A for Iteration 2, document Option B as future enhancement.

### 5. Plaid-Synced Transaction Handling

**Question:** How should we handle Plaid-synced transactions after currency conversion?

**Current Approach:**
- Add `Account.originalCurrency` field
- On Plaid sync, convert from `originalCurrency` to `User.currency`
- Update `plaid-sync.service.ts` to handle conversion

**Alternative:**
- Disconnect Plaid accounts on currency conversion (force re-link)
- Simpler, but worse UX

**Recommendation:** Implement `originalCurrency` approach (better UX, worth the complexity).

### 6. Supported Currencies

**Question:** Should we support all 160+ currencies or limit to major currencies?

**Options:**
- **Option A:** Major currencies only (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL) - 10 currencies
- **Option B:** Top 50 currencies (includes emerging markets)
- **Option C:** All 160+ currencies (exchangerate-api.com supports)

**Recommendation:** Option A for MVP (covers 90% of users), expand in v2 based on demand.

### 7. Builder Split Decision

**Question:** Should builder plan to split this iteration into sub-builders?

**Recommendation:** YES - Create sub-builder for UI components after backend is working.

**Proposed Split:**
- **Main Builder (5-6 hours):**
  - Database schema changes
  - currency.service.ts (API integration, conversion logic)
  - currency.router.ts (tRPC endpoints)
  - Plaid sync updates
  - Testing (unit + integration)

- **Sub-Builder A (2-3 hours):**
  - /settings/currency page
  - CurrencySelector component
  - ConversionDialog component
  - ConversionProgress component
  - Success/error toast messages
  - Manual testing (E2E)

**Handoff Point:** After Main Builder completes and API is tested, Sub-Builder implements UI.

---

**Report Complete. Ready for Planner Synthesis.**
