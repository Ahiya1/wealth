# Explorer 2 Report: Currency Conversion Service & Business Logic

## Executive Summary

The currency conversion system requires building a robust service layer that handles atomic conversion of all financial data (transactions, accounts, budgets, goals) with historical exchange rate lookups, intelligent caching, and comprehensive error handling. This is a HIGH-RISK feature due to data integrity concerns and external API dependencies. The service must guarantee atomicity (all-or-nothing conversion) and provide rollback capabilities.

## Discoveries

### Existing Currency Infrastructure
- **User Model**: Already has `currency` field (default: "USD")
- **Account Model**: Has per-account `currency` field (default: "USD")  
- **Settings Page**: Placeholder exists at `/settings/currency` awaiting implementation
- **Users Router**: Has basic currency update in `updateProfile` procedure with enum validation
- **Format Utility**: `formatCurrency()` helper exists in `/src/lib/utils.ts` using `Intl.NumberFormat`

### Data Conversion Requirements
Based on Prisma schema analysis, the following entities contain monetary values requiring conversion:

**Transactions Table** (`Transaction` model):
- `amount` field (Decimal(15,2)) - Core financial data with date-specific exchange rates
- Contains 100% of user's financial history
- **Conversion Strategy**: Historical rate based on transaction `date` field
- **Volume Risk**: Could be 1,000-10,000+ records per user

**Accounts Table** (`Account` model):
- `balance` field (Decimal(15,2)) - Current account balance
- Per-account `currency` field exists but currently unused
- **Conversion Strategy**: Current exchange rate (not historical)
- **Volume**: Typically 3-10 accounts per user

**Budgets Table** (`Budget` model):
- `amount` field (Decimal(15,2)) - Monthly budget allocations
- Keyed by `month` field (format: "2025-01")
- **Conversion Strategy**: Historical rate based on first day of budget month
- **Volume**: 5-50 budgets per user (varies by month tracking)

**Goals Table** (`Goal` model):
- `targetAmount` field (Decimal(15,2)) - Goal target
- `currentAmount` field (Decimal(15,2)) - Current progress
- **Conversion Strategy**: Current exchange rate (forward-looking)
- **Volume**: 1-10 goals per user

### Existing tRPC Router Patterns

**Architecture**: 
- All routers follow consistent pattern: `router, protectedProcedure` imports from `../trpc`
- Input validation via Zod schemas
- Proper error handling with `TRPCError` codes: `NOT_FOUND`, `CONFLICT`, `BAD_REQUEST`
- User ownership verification on all mutations
- Parallel queries using `Promise.all()` for performance

**Service Layer Pattern**:
- Complex logic extracted to `/src/server/services/` (see `categorize.service.ts`)
- Services accept `prismaClient` as parameter for testability
- Caching implemented via database tables (see `MerchantCategoryCache`)
- External API calls wrapped with error handling and fallbacks

**Transaction Pattern** (Critical for Currency Conversion):
- Prisma supports `$transaction` for atomic operations
- Used in existing routers for complex multi-table updates
- Can wrap multiple operations in single database transaction
- Rollback automatic on any error within transaction block

### External API Research

**Recommended Provider: exchangerate-api.com**
- **Free Tier**: 1,500 requests/month (sufficient for MVP)
- **Endpoint**: `https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{FROM}/{TO}/{AMOUNT}`
- **Historical Endpoint**: `https://v6.exchangerate-api.com/v6/{API_KEY}/history/{BASE}/{YEAR}/{MONTH}/{DAY}`
- **Response Format**: JSON with `conversion_rate` field
- **Rate Limiting**: Built-in rate limits with header responses
- **Reliability**: 99.9% uptime SLA on paid tier, 99% on free

**Alternative Providers** (For Future Consideration):
1. **Fixer.io**: More expensive but more reliable historical data
2. **Open Exchange Rates**: Better batch conversion support
3. **Currency API**: Simpler pricing but less features

**API Integration Pattern**:
```typescript
interface ExchangeRateResponse {
  result: "success" | "error"
  conversion_rate: number
  time_last_update_unix: number
}

async function fetchExchangeRate(
  fromCurrency: string, 
  toCurrency: string,
  date?: Date
): Promise<number>
```

### Database Schema Additions Required

**ExchangeRate Model** (New):
```prisma
model ExchangeRate {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(15, 6)
  createdAt    DateTime @default(now())
  
  @@unique([date, fromCurrency, toCurrency])
  @@index([date])
  @@index([fromCurrency, toCurrency])
}
```
- **Purpose**: Cache exchange rates to minimize API calls
- **TTL Strategy**: Cache for 24 hours (current rates), indefinitely for historical (>7 days old)
- **Storage**: Decimal(15,6) for precision (e.g., 0.876543 USD to EUR)

**CurrencyConversionLog Model** (New):
```prisma
model CurrencyConversionLog {
  id               String   @id @default(cuid())
  userId           String
  fromCurrency     String
  toCurrency       String
  status           String   // "IN_PROGRESS", "COMPLETED", "FAILED", "ROLLED_BACK"
  transactionCount Int
  accountCount     Int
  budgetCount      Int
  goalCount        Int
  errorMessage     String?  @db.Text
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([status])
}
```
- **Purpose**: Audit log and concurrent conversion prevention
- **Lock Mechanism**: Check for `IN_PROGRESS` status before allowing new conversion

## Patterns Identified

### Pattern 1: Atomic Conversion Transaction
**Description**: Use Prisma `$transaction` to wrap all conversion operations
**Use Case**: Ensure all-or-nothing conversion with automatic rollback
**Example**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update all transactions
  const transactions = await tx.transaction.findMany({ where: { userId } })
  for (const txn of transactions) {
    const rate = await getExchangeRate(fromCurrency, toCurrency, txn.date)
    await tx.transaction.update({
      where: { id: txn.id },
      data: { amount: txn.amount * rate }
    })
  }
  
  // 2. Update all accounts
  // 3. Update all budgets
  // 4. Update all goals
  
  // 5. Update user currency
  await tx.user.update({
    where: { id: userId },
    data: { currency: toCurrency }
  })
  
  // 6. Log completion
  await tx.currencyConversionLog.update({
    where: { id: logId },
    data: { status: "COMPLETED", completedAt: new Date() }
  })
}, {
  maxWait: 60000, // 60 seconds
  timeout: 120000, // 2 minutes
})
```
**Recommendation**: CRITICAL - Must use this pattern for data integrity

### Pattern 2: Batch Rate Fetching with Cache
**Description**: Fetch unique date-currency pairs, cache results, batch updates
**Use Case**: Minimize API calls for large transaction histories
**Example**:
```typescript
// Collect unique dates from transactions
const uniqueDates = [...new Set(transactions.map(t => t.date.toISOString().split('T')[0]))]

// Fetch rates for all unique dates (check cache first)
const rateMap = new Map<string, number>()
for (const date of uniqueDates) {
  const cached = await getCachedRate(fromCurrency, toCurrency, date)
  if (cached) {
    rateMap.set(date, cached)
  } else {
    const rate = await fetchExchangeRate(fromCurrency, toCurrency, new Date(date))
    await cacheRate(fromCurrency, toCurrency, date, rate)
    rateMap.set(date, rate)
  }
}

// Apply rates in batch
for (const txn of transactions) {
  const dateKey = txn.date.toISOString().split('T')[0]
  txn.convertedAmount = txn.amount * rateMap.get(dateKey)!
}
```
**Recommendation**: ESSENTIAL - Dramatically reduces API calls from 1000+ to ~30-90

### Pattern 3: Progressive Update with Status Tracking
**Description**: Update data in chunks with progress reporting
**Use Case**: Prevent timeout on large datasets, provide user feedback
**Example**:
```typescript
const BATCH_SIZE = 100

// Update transactions in batches
for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
  const batch = transactions.slice(i, i + BATCH_SIZE)
  await updateTransactionBatch(batch, rateMap)
  
  // Emit progress event (via streaming or polling endpoint)
  await updateProgress(logId, {
    processedTransactions: Math.min(i + BATCH_SIZE, transactions.length),
    totalTransactions: transactions.length
  })
}
```
**Recommendation**: HIGHLY RECOMMENDED - Improves UX for users with 1000+ transactions

### Pattern 4: Idempotent Retry with Exponential Backoff
**Description**: Retry failed API calls with increasing delays
**Use Case**: Handle temporary API outages gracefully
**Example**:
```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      
      const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Should not reach here')
}

// Usage
const rate = await fetchWithRetry(() => 
  fetchExchangeRate(fromCurrency, toCurrency, date)
)
```
**Recommendation**: REQUIRED - External API failures are inevitable

## Complexity Assessment

### High Complexity Areas

**Transaction Conversion (HIGHEST RISK)**
- **Complexity Factors**:
  - Historical rate lookups for potentially 10,000+ transactions
  - Date-specific exchange rates (rate on Jan 1, 2024 ≠ rate on Feb 1, 2024)
  - API call volume management (batch optimization critical)
  - Decimal precision handling (avoid floating point errors)
- **Estimated Effort**: 40% of iteration (3-4 hours)
- **Recommended Split**: NO - Core service, must be single coherent implementation

**Atomic Transaction Management**
- **Complexity Factors**:
  - Prisma transaction timeout management (default 5s, need 120s)
  - Rollback on partial failure (transaction auto-handles this)
  - Lock mechanism to prevent concurrent conversions
  - Progress tracking within transaction (polling pattern needed)
- **Estimated Effort**: 25% of iteration (2-2.5 hours)
- **Recommended Split**: NO - Tightly coupled to conversion logic

**Exchange Rate API Integration**
- **Complexity Factors**:
  - Historical vs current rate endpoints (different API paths)
  - Rate limiting and quota management (1500/month free tier)
  - Error handling (timeout, invalid currency, API down)
  - Response parsing and validation
- **Estimated Effort**: 15% of iteration (1-1.5 hours)
- **Recommended Split**: NO - Service layer abstraction sufficient

### Medium Complexity Areas

**Rate Caching System**
- **Implementation**: Database table with unique constraints
- **TTL Logic**: 24 hours for current rates, indefinite for historical
- **Estimated Effort**: 10% of iteration (1 hour)

**UI/UX Components**
- **Currency Selector**: Dropdown with major currencies
- **Confirmation Dialog**: Warning about data conversion
- **Progress Indicator**: Real-time progress during conversion
- **Estimated Effort**: 10% of iteration (1 hour)

### Low Complexity Areas

**Audit Logging**
- **Implementation**: Insert to CurrencyConversionLog table
- **Estimated Effort**: 5% of iteration (30 min)

**tRPC Router Setup**
- **Implementation**: Standard router pattern (see existing routers)
- **Estimated Effort**: 5% of iteration (30 min)

## Technology Recommendations

### Primary Stack

**Exchange Rate API: exchangerate-api.com**
- **Rationale**: 
  - Free tier sufficient for MVP (1500 requests/month)
  - Historical data support critical for transaction conversion
  - Simple REST API (no SDK overhead)
  - JSON response format (easy parsing)
- **Alternative**: Fixer.io if reliability issues arise (paid, $10/month)

**Caching Strategy: Database Table (PostgreSQL)**
- **Rationale**:
  - Prisma already configured, no new dependencies
  - Persistent across server restarts
  - Query-optimized with indexes
  - Atomic transactions with conversion operations
- **Alternative Rejected**: Redis (adds complexity, not needed for infrequent conversions)

**Decimal Handling: Prisma Decimal + JavaScript Decimal.js**
- **Rationale**:
  - Prisma `Decimal(15,2)` ensures database precision
  - JavaScript native `Number` has floating point errors
  - Consider `decimal.js` library for client-side calculations
- **Critical**: Always multiply/divide using decimal-safe operations

**Progress Tracking: Polling Endpoint**
- **Rationale**:
  - WebSockets add complexity for infrequent operation
  - Polling every 2 seconds acceptable for 30-120 second operation
  - Works reliably with Next.js API routes
- **Alternative Rejected**: Server-sent events (SSE) - overkill for use case

### Supporting Libraries

**No Additional Dependencies Needed**
- Existing stack (tRPC, Prisma, Zod, date-fns) covers all requirements
- Native `fetch` API sufficient for HTTP requests
- Consider `decimal.js` only if floating point errors observed in testing

## Integration Points

### External APIs

**exchangerate-api.com REST API**
- **Purpose**: Fetch current and historical exchange rates
- **Complexity**: LOW-MEDIUM
- **Considerations**:
  - Rate limiting: 1500 requests/month free tier
  - Historical data: Available back to 1999
  - Cache aggressively to minimize API usage
  - Error codes: Handle 404 (invalid currency), 429 (rate limit), 503 (service down)
- **Estimated API Call Volume per Conversion**:
  - Without caching: 1,000-10,000 calls (one per transaction)
  - With smart caching: 30-90 calls (one per unique date)
  - Target: <100 calls per conversion via aggressive caching

### Internal Integrations

**User Router ↔ Currency Service**
- **Connection**: `updateProfile` procedure currently updates currency field
- **Change Required**: Replace simple update with full conversion trigger
- **Data Flow**: User clicks "Change Currency" → Confirmation → Trigger conversion service → Update user.currency on success

**Transactions Router ↔ Currency Service**
- **Connection**: All transaction amounts must be converted
- **Data Flow**: Service fetches transactions → Applies date-specific rates → Batch updates within transaction

**Accounts Router ↔ Currency Service**
- **Connection**: Account balances must be converted
- **Data Flow**: Service fetches accounts → Applies current rate → Updates balance and currency fields

**Budgets Router ↔ Currency Service**
- **Connection**: Budget amounts must be converted
- **Data Flow**: Service fetches budgets → Applies month-specific rates → Updates amounts

**Goals Router ↔ Currency Service**
- **Connection**: Goal amounts must be converted
- **Data Flow**: Service fetches goals → Applies current rate → Updates target/current amounts

## Risks & Challenges

### Technical Risks

**Risk: Data Corruption from Partial Conversion**
- **Impact**: CRITICAL - User financial data becomes inconsistent
- **Likelihood**: HIGH without proper safeguards
- **Mitigation**: 
  - Use Prisma `$transaction` with 120-second timeout
  - Implement conversion lock (check for IN_PROGRESS status)
  - Comprehensive error logging to CurrencyConversionLog
  - Consider "dry run" mode for testing (calculate but don't apply)

**Risk: External API Failure During Conversion**
- **Impact**: HIGH - Conversion fails, user stuck
- **Likelihood**: MEDIUM (API has 99% uptime)
- **Mitigation**:
  - Retry logic with exponential backoff (3 attempts)
  - Fallback to cached rates if available (warn user if stale >7 days)
  - Graceful degradation: Allow manual rate input for failed dates
  - Store partial progress in log for manual recovery

**Risk: Decimal Precision Loss**
- **Impact**: MEDIUM - Small rounding errors accumulate
- **Likelihood**: MEDIUM with naive multiplication
- **Mitigation**:
  - Use Prisma Decimal type (stores as string internally)
  - Round consistently to 2 decimal places after conversion
  - Consider banker's rounding (round to nearest even) for fairness
  - Test with edge cases: 0.01, 999999.99, negative amounts

**Risk: Transaction Timeout (120+ seconds)**
- **Impact**: HIGH - Transaction rolled back, no progress saved
- **Likelihood**: MEDIUM for users with 5,000+ transactions
- **Mitigation**:
  - Increase Prisma transaction timeout to 180 seconds (3 minutes)
  - Batch updates in chunks of 100 (allows progress checkpoints)
  - Consider background job pattern if timeout persists in testing
  - Show progress indicator to manage user expectations

### Complexity Risks

**Risk: Concurrent Conversion Attempts**
- **Impact**: HIGH - Race condition causes data corruption
- **Likelihood**: LOW (infrequent operation)
- **Mitigation**:
  - Check CurrencyConversionLog for IN_PROGRESS status before starting
  - Use database-level locking (SELECT FOR UPDATE on user row)
  - Return clear error: "Conversion already in progress"
  - Auto-cleanup stale IN_PROGRESS logs (>30 minutes old)

**Risk: Historical Rate Unavailable**
- **Impact**: MEDIUM - Cannot convert old transactions
- **Likelihood**: LOW (API has data back to 1999)
- **Mitigation**:
  - Fallback to nearest available date rate (within 7 days)
  - Warn user if using fallback rates
  - Allow user to skip problematic transactions (mark as excluded)
  - Provide manual rate override UI (advanced users)

**Risk: User Interrupts Conversion (Closes Browser)**
- **Impact**: MEDIUM - Conversion continues on server, user unaware
- **Likelihood**: MEDIUM (conversion takes 30-120 seconds)
- **Mitigation**:
  - Show "DO NOT CLOSE" warning during conversion
  - Conversion runs to completion on server (not dependent on client)
  - Polling endpoint allows client to reconnect and check status
  - Send confirmation email after completion (if Resend configured)

## Recommendations for Planner

1. **Allocate 7-9 hours as estimated, prioritize data integrity over features**
   - Do NOT rush atomic transaction implementation
   - Comprehensive testing critical (test with 10, 100, 1000, 10000 transaction datasets)
   - Budget 2 hours for testing and edge cases

2. **Implement conversion service as single coherent unit (DO NOT SPLIT)**
   - High coupling between rate fetching, caching, and conversion logic
   - Splitting would create integration complexity
   - Service layer pattern (similar to categorize.service.ts) appropriate

3. **Build in progressive enhancement stages**
   - Stage 1: Core service with basic UI (no progress indicator)
   - Stage 2: Add progress tracking and better UX
   - Stage 3: Add audit log viewer and conversion history
   - If time pressure, ship Stage 1 and iterate

4. **Add environment variable for exchange rate API key**
   - `EXCHANGE_RATE_API_KEY` to `.env` and `.env.example`
   - Graceful degradation if not configured (show error in UI)
   - Consider free tier limitations in error messages

5. **Create database migration before starting implementation**
   - Add ExchangeRate and CurrencyConversionLog models
   - Test migration on local database first
   - Include rollback script for safety

6. **Consider "reversible conversion" feature for v2**
   - Store original amounts for 30 days in separate table
   - Allow "undo" if user made mistake
   - NOT for initial iteration (adds 50% complexity)
   - Mention in UI: "This action cannot be undone"

## Resource Map

### Critical Files/Directories

**Service Layer** (Create New):
- `/src/server/services/currency-conversion.service.ts` - Core conversion logic
- `/src/server/services/exchange-rate.service.ts` - API integration and caching
- `/src/server/services/__tests__/currency-conversion.service.test.ts` - Unit tests

**tRPC Router** (Create New):
- `/src/server/api/routers/currency.router.ts` - tRPC procedures
- Export in `/src/server/api/root.ts` (add to appRouter)

**Database Schema** (Modify):
- `/prisma/schema.prisma` - Add ExchangeRate and CurrencyConversionLog models
- Migration: `npx prisma migrate dev --name add-currency-conversion`

**UI Components** (Modify/Create):
- `/src/app/(dashboard)/settings/currency/page.tsx` - Main currency settings page
- `/src/components/settings/CurrencySelector.tsx` - Currency dropdown (new)
- `/src/components/settings/ConversionConfirmDialog.tsx` - Warning dialog (new)
- `/src/components/settings/ConversionProgress.tsx` - Progress indicator (new)

**Utilities** (Modify):
- `/src/lib/utils.ts` - Enhance `formatCurrency()` if needed
- `/src/lib/constants.ts` - Add SUPPORTED_CURRENCIES constant

### Key Dependencies

**Existing (No New Installs)**:
- `@prisma/client` - Database ORM with transaction support
- `@trpc/server` - API layer
- `zod` - Input validation
- `date-fns` - Date manipulation for rate lookups

**Optional (Consider if Needed)**:
- `decimal.js` - High-precision decimal arithmetic (only if floating point errors observed)

### Testing Infrastructure

**Test Framework**: Vitest (already configured)
- Unit tests: Service layer with mocked Prisma client
- Integration tests: Full conversion flow with test database
- Pattern: Follow `categorize.service.test.ts` structure

**Test Scenarios** (Critical):
1. **Happy Path**: Convert 100 transactions successfully
2. **API Failure**: Mock API timeout, verify retry logic
3. **Partial Failure**: Mock transaction failure mid-conversion, verify rollback
4. **Concurrent Conversion**: Attempt two simultaneous conversions, verify lock
5. **Large Dataset**: Convert 1,000 transactions, verify batch performance
6. **Decimal Precision**: Convert 0.01, 999999.99, verify no rounding errors
7. **Historical Rates**: Convert transactions from 2020, verify correct date-specific rates
8. **Cache Hit**: Verify second conversion uses cached rates (no API calls)

**Performance Benchmarks**:
- 100 transactions: <5 seconds
- 1,000 transactions: <30 seconds (acceptance criteria)
- 10,000 transactions: <120 seconds (stretch goal)

## Questions for Planner

1. **Should currency conversion be reversible (undo feature)?**
   - Adds significant complexity (50% more work)
   - Requires storing original amounts for 30 days
   - Recommend: NO for initial iteration, add to backlog for v2

2. **Should we send confirmation email after currency conversion?**
   - Requires Resend integration (optional dependency per .env.example)
   - Good security practice (alerts user to major account changes)
   - Recommend: YES if Resend configured, graceful degradation if not

3. **What should happen if exchange rate API quota exhausted (1500/month)?**
   - Show error message: "Please try again later"
   - Allow manual rate input (advanced feature, adds complexity)
   - Upgrade to paid tier ($10/month, 100,000 requests)
   - Recommend: Show clear error, provide upgrade link

4. **Should we support per-account currency or enforce single user currency?**
   - Prisma schema has `currency` field on both User and Account models
   - Multi-currency support significantly increases complexity (50% more)
   - Recommend: Single user currency for Iteration 9, multi-currency in future iteration

5. **How should we handle failed conversions (partial progress)?**
   - Transaction rollback means all-or-nothing (current plan)
   - Alternative: Save partial progress, allow resume
   - Recommend: All-or-nothing for data integrity, but log failure details

6. **Should conversion history be visible to users (audit log)?**
   - CurrencyConversionLog table stores history
   - Building UI to view history adds 1-2 hours
   - Recommend: Admin-only access for Iteration 9, user-facing in future

## Appendix: Conversion Service Pseudocode

```typescript
// High-level flow for planner reference

async function convertUserCurrency(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  prisma: PrismaClient
): Promise<ConversionResult> {
  
  // 1. VALIDATION & LOCK
  // Check for existing IN_PROGRESS conversion
  const existingConversion = await prisma.currencyConversionLog.findFirst({
    where: { userId, status: "IN_PROGRESS" }
  })
  if (existingConversion) {
    throw new Error("Conversion already in progress")
  }
  
  // Create conversion log (establishes lock)
  const log = await prisma.currencyConversionLog.create({
    data: {
      userId,
      fromCurrency,
      toCurrency,
      status: "IN_PROGRESS",
      transactionCount: 0,
      accountCount: 0,
      budgetCount: 0,
      goalCount: 0,
    }
  })
  
  try {
    // 2. FETCH DATA
    const [transactions, accounts, budgets, goals] = await Promise.all([
      prisma.transaction.findMany({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
    ])
    
    // 3. FETCH EXCHANGE RATES (with caching)
    // For transactions: historical rates by date
    const transactionDates = [...new Set(transactions.map(t => t.date))]
    const rateMap = await fetchRatesForDates(
      fromCurrency, 
      toCurrency, 
      transactionDates,
      prisma
    )
    
    // For accounts/goals: current rate
    const currentRate = await fetchCurrentRate(fromCurrency, toCurrency, prisma)
    
    // For budgets: first-of-month rates
    const budgetMonths = [...new Set(budgets.map(b => b.month))]
    const budgetRateMap = await fetchRatesForMonths(
      fromCurrency,
      toCurrency,
      budgetMonths,
      prisma
    )
    
    // 4. ATOMIC CONVERSION
    await prisma.$transaction(async (tx) => {
      // Convert transactions in batches
      for (let i = 0; i < transactions.length; i += 100) {
        const batch = transactions.slice(i, i + 100)
        await Promise.all(batch.map(txn => 
          tx.transaction.update({
            where: { id: txn.id },
            data: { 
              amount: convertAmount(txn.amount, rateMap.get(txn.date))
            }
          })
        ))
      }
      
      // Convert accounts
      await Promise.all(accounts.map(acc =>
        tx.account.update({
          where: { id: acc.id },
          data: {
            balance: convertAmount(acc.balance, currentRate),
            currency: toCurrency
          }
        })
      ))
      
      // Convert budgets
      await Promise.all(budgets.map(budget =>
        tx.budget.update({
          where: { id: budget.id },
          data: {
            amount: convertAmount(
              budget.amount, 
              budgetRateMap.get(budget.month)
            )
          }
        })
      ))
      
      // Convert goals
      await Promise.all(goals.map(goal =>
        tx.goal.update({
          where: { id: goal.id },
          data: {
            targetAmount: convertAmount(goal.targetAmount, currentRate),
            currentAmount: convertAmount(goal.currentAmount, currentRate)
          }
        })
      ))
      
      // Update user currency
      await tx.user.update({
        where: { id: userId },
        data: { currency: toCurrency }
      })
      
      // Mark conversion complete
      await tx.currencyConversionLog.update({
        where: { id: log.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          transactionCount: transactions.length,
          accountCount: accounts.length,
          budgetCount: budgets.length,
          goalCount: goals.length,
        }
      })
    }, {
      timeout: 180000 // 3 minutes
    })
    
    return {
      success: true,
      transactionsConverted: transactions.length,
      accountsConverted: accounts.length,
      budgetsConverted: budgets.length,
      goalsConverted: goals.length,
    }
    
  } catch (error) {
    // 5. ERROR HANDLING & ROLLBACK
    await prisma.currencyConversionLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: error.message,
        completedAt: new Date(),
      }
    })
    
    throw error // Transaction auto-rolls back
  }
}

// Helper: Fetch rates with caching
async function fetchRatesForDates(
  fromCurrency: string,
  toCurrency: string,
  dates: Date[],
  prisma: PrismaClient
): Promise<Map<Date, number>> {
  
  const rateMap = new Map<Date, number>()
  
  for (const date of dates) {
    // Check cache
    const cached = await prisma.exchangeRate.findUnique({
      where: {
        date_fromCurrency_toCurrency: {
          date: date,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
        }
      }
    })
    
    if (cached) {
      rateMap.set(date, Number(cached.rate))
      continue
    }
    
    // Fetch from API with retry
    const rate = await fetchWithRetry(async () => {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${API_KEY}/history/${fromCurrency}/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`
      )
      const data = await response.json()
      return data.conversion_rates[toCurrency]
    })
    
    // Cache for future use
    await prisma.exchangeRate.create({
      data: {
        date: date,
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        rate: rate,
      }
    })
    
    rateMap.set(date, rate)
  }
  
  return rateMap
}

// Helper: Safe decimal conversion
function convertAmount(amount: Decimal, rate: number): Decimal {
  const result = amount.mul(rate)
  return result.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
}
```

---

**Report Generated**: 2025-10-02
**Explorer**: Explorer 2 (Currency Conversion Service & Business Logic)
**Focus Area**: Conversion logic, service architecture, API integration, edge cases
**Status**: COMPLETE - Ready for planner synthesis
