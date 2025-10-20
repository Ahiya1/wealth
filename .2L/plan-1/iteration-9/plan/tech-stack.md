# Technology Stack - Currency Switching System

## Core Framework

**Decision:** Next.js 14.2.33 (App Router) + React 18

**Rationale:**
- Already established in codebase, no new framework needed
- Server Components reduce client bundle size for data-heavy operations
- App Router provides clean separation between server and client logic
- Native fetch API (Node.js 18+) sufficient for exchange rate API calls

**Alternatives Considered:**
- Separate backend service: Rejected - Adds deployment complexity, tRPC already provides type-safe backend

## Database

**Decision:** PostgreSQL (via Supabase) + Prisma ORM 5.22.0

**Rationale:**
- Prisma's `$transaction` API provides ACID guarantees essential for currency conversion
- PostgreSQL supports Decimal(15,2) for financial precision without rounding errors
- Existing infrastructure, no migration needed
- Excellent transaction timeout management (configurable up to 180 seconds)

**Schema Strategy:**

### New Models

```prisma
// Exchange rate caching (minimize API calls)
model ExchangeRate {
  id           String   @id @default(cuid())
  date         DateTime @db.Date           // Historical rate date (no time precision needed)
  fromCurrency String                      // e.g., "USD"
  toCurrency   String                      // e.g., "EUR"
  rate         Decimal  @db.Decimal(18, 8) // High precision for rates (e.g., 0.00001234 BTC)
  source       String   @default("exchangerate-api.com")
  createdAt    DateTime @default(now())
  expiresAt    DateTime                    // TTL: createdAt + 24 hours

  @@unique([date, fromCurrency, toCurrency])
  @@index([fromCurrency, toCurrency, date]) // Fast rate lookups
  @@index([expiresAt])                      // Cleanup stale rates
}

// Audit log for conversions (compliance + debugging)
model CurrencyConversionLog {
  id               String           @id @default(cuid())
  userId           String
  fromCurrency     String
  toCurrency       String
  exchangeRate     Decimal          @db.Decimal(18, 8)
  status           ConversionStatus
  errorMessage     String?          @db.Text
  transactionCount Int              @default(0)
  accountCount     Int              @default(0)
  budgetCount      Int              @default(0)
  goalCount        Int              @default(0)
  startedAt        DateTime         @default(now())
  completedAt      DateTime?
  durationMs       Int?             // Performance tracking

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startedAt]) // User's conversion history
  @@index([status])            // Find IN_PROGRESS conversions
}

enum ConversionStatus {
  IN_PROGRESS  // Lock mechanism - prevents concurrent conversions
  COMPLETED    // Successfully converted
  FAILED       // Error occurred, user notified
  ROLLED_BACK  // Transaction rolled back, no data changed
}
```

### Modified Models

```prisma
// Remove Account.currency field (single user currency, not per-account)
// Add Account.originalCurrency for Plaid sync support
model Account {
  // ... existing fields ...
  // currency String @default("USD") // REMOVE THIS FIELD
  originalCurrency String? // Null for manual accounts, set for Plaid accounts
}

// Add relation to User model
model User {
  // ... existing fields ...
  currencyConversionLogs CurrencyConversionLog[]
}
```

**Rationale for Schema Decisions:**
- **ExchangeRate.date as @db.Date:** Historical rates don't need time precision, saves storage
- **rate as Decimal(18,8):** Exchange rates need high precision for cryptocurrencies and small-value currencies
- **Unique constraint:** Prevents duplicate rate entries for same date/pair (automatic deduplication)
- **expiresAt field:** Enables automatic cleanup of stale cached rates (24-hour TTL for current, indefinite for historical)
- **CurrencyConversionLog:** Complete audit trail with performance metrics for monitoring
- **ConversionStatus enum:** Clear state tracking, supports IN_PROGRESS lock mechanism
- **Account.originalCurrency:** Enables Plaid sync after conversion (convert from original to user's currency)
- **Remove Account.currency:** Single user currency simplifies implementation, matches MVP scope

## Authentication

**Decision:** Existing Supabase Auth + tRPC protectedProcedure

**Rationale:**
- Currency conversion is user-specific operation (requires auth)
- Existing `protectedProcedure` middleware ensures authenticated user
- No additional auth requirements for this iteration

**Implementation Notes:**
- All currency router procedures use `protectedProcedure`
- Conversion lock tied to userId (prevents user from concurrent conversions)
- Admin-only conversion history viewer (future enhancement, use `adminProcedure`)

## API Layer

**Decision:** tRPC 11.6.0 (Type-safe API layer)

**Rationale:**
- End-to-end type safety (client knows exact server response types)
- Excellent error handling with TRPCError codes
- Built-in React Query integration (cache management)
- Consistent with existing codebase patterns

**Router Structure:**

```typescript
// src/server/api/routers/currency.router.ts
export const currencyRouter = router({
  // Public: List supported currencies (no auth required)
  getSupportedCurrencies: publicProcedure
    .query(() => SUPPORTED_CURRENCIES),

  // Protected: Get exchange rate preview
  getExchangeRate: protectedProcedure
    .input(z.object({
      fromCurrency: z.string(),
      toCurrency: z.string(),
      date: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Fetch rate from service
    }),

  // Protected: Main conversion mutation
  convertCurrency: protectedProcedure
    .input(z.object({
      toCurrency: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Call conversion service
    }),

  // Protected: Get user's conversion history
  getConversionHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch logs for user
    }),

  // Protected: Check conversion status (polling endpoint)
  getConversionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      // Return IN_PROGRESS log if exists
    }),
})
```

## Frontend

**Decision:** React 18 + TypeScript 5.5.3

**UI Component Library:** shadcn/ui (Radix UI primitives)

**Rationale:**
- Already installed, no new dependencies
- Excellent component primitives: Select, AlertDialog, Progress, Dialog, Toast
- Fully accessible (ARIA compliant)
- Customizable with Tailwind CSS

**Components to Use:**
- `Select`: Currency dropdown (20 currencies)
- `AlertDialog`: Confirmation dialog with warning
- `Dialog`: Progress modal (non-dismissible during conversion)
- `Progress`: Progress bar (0-100%)
- `Toast`: Success/error notifications
- `Skeleton`: Loading placeholders
- `Badge`: Currency code display
- `Button`: With Loader2 icon for loading states

**Styling:** Tailwind CSS 3.4.13

**Rationale:**
- Consistent with app's warm aesthetic (sage, terracotta, warm-gray)
- Utility-first approach enables rapid UI development
- Custom colors already configured in tailwind.config.ts

**Color Palette for Currency UI:**
- Sage (primary actions): `bg-sage-600`, `hover:bg-sage-700`
- Amber (warnings): `bg-amber-100`, `text-amber-900`, `border-amber-200`
- Warm Gray (neutral): `bg-warm-gray-50`, `text-warm-gray-600`

## External Integrations

### Exchange Rate API (exchangerate-api.com)

**Purpose:** Fetch current and historical exchange rates

**Library:** Native fetch API (Node.js 18+, no additional dependency)

**Implementation:**

```typescript
// src/server/services/currency.service.ts

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY
const RATE_CACHE_TTL_HOURS = 24

// Fetch current rate
async function fetchCurrentRate(
  fromCurrency: string,
  toCurrency: string
): Promise<Decimal> {
  const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency}`

  const response = await fetchWithRetry(url)
  const data = await response.json()

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type']}`)
  }

  return new Decimal(data.conversion_rates[toCurrency])
}

// Fetch historical rate
async function fetchHistoricalRate(
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<Decimal> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/history/${fromCurrency}/${year}/${month}/${day}`

  const response = await fetchWithRetry(url)
  const data = await response.json()

  return new Decimal(data.conversion_rates[toCurrency])
}

// Retry logic with exponential backoff
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (error) {
      if (attempt === maxRetries) throw error

      const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Should not reach here')
}
```

**API Endpoints:**
- Current rates: `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE_CURRENCY}`
- Historical rates: `https://v6.exchangerate-api.com/v6/{API_KEY}/history/{BASE_CURRENCY}/{YEAR}/{MONTH}/{DAY}`

**Response Format:**
```json
{
  "result": "success",
  "base_code": "USD",
  "conversion_rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "CAD": 1.36,
    "AUD": 1.52
  },
  "time_last_update_unix": 1696204800
}
```

**Rate Limiting:**
- Free tier: 1,500 requests/month (~50/day)
- With caching: Typical conversion uses 30-90 API calls (unique dates)
- Expected monthly usage: <500 calls (well within limit)

**Error Handling:**
- 429 (Rate Limit): Show user "Too many conversions today, try tomorrow"
- 404 (Invalid Currency): Validate currency before API call (prevent this)
- 503 (Service Down): Retry 3 times, then fallback to cached rates with warning
- Network Timeout: Retry with exponential backoff

**Cost Estimate:**
- Free tier: $0/month (1,500 requests)
- Paid tier: $9/month (100,000 requests) - upgrade if user base grows

**Alternative Providers (for future consideration):**
- Fixer.io: $10/month, more reliable historical data
- Open Exchange Rates: $12/month, better batch conversion support
- Currency API: $15/month, simpler pricing structure

## Development Tools

### Testing

**Framework:** Vitest (already in devDependencies)

**Coverage Target:** 80% (focus on service layer and critical paths)

**Strategy:**

**Unit Tests:**
- Currency conversion logic (service layer)
- Exchange rate API integration (mocked fetch)
- Rate caching logic
- Retry logic with simulated failures
- Decimal precision (no rounding errors)

```typescript
// src/server/services/__tests__/currency.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { convertUserCurrency, fetchExchangeRate } from '../currency.service'

describe('Currency Conversion Service', () => {
  it('converts transactions with historical rates', async () => {
    // Mock Prisma client
    // Mock exchange rate API
    const result = await convertUserCurrency(userId, 'USD', 'EUR')
    expect(result.transactionCount).toBe(100)
    expect(result.status).toBe('COMPLETED')
  })

  it('rolls back on database error', async () => {
    // Mock Prisma error mid-transaction
    await expect(
      convertUserCurrency(userId, 'USD', 'EUR')
    ).rejects.toThrow()
    // Verify no data changed
  })

  it('retries on API timeout', async () => {
    // Mock fetch to fail twice, succeed on third
    const rate = await fetchExchangeRate('USD', 'EUR')
    expect(rate).toBeGreaterThan(0)
  })
})
```

**Integration Tests:**
- Full conversion flow with test database
- Rollback scenarios (mid-conversion failure)
- API failure scenarios (timeout, rate limit)
- Performance tests (10, 100, 1,000, 10,000 transactions)

```typescript
// src/server/api/routers/__tests__/currency.router.test.ts
describe('Currency Router', () => {
  it('converts currency successfully', async () => {
    const caller = appRouter.createCaller({ user, prisma })
    const result = await caller.currency.convertCurrency({
      toCurrency: 'EUR'
    })
    expect(result.success).toBe(true)
  })
})
```

### Code Quality

**Linter:** ESLint 8.57.1 (already configured)

**Formatter:** Prettier 3.3.3 (already configured)

**Type Checking:** TypeScript strict mode enabled

**Pre-commit Hooks:**
- ESLint auto-fix
- Prettier format
- TypeScript type check
- Vitest run (unit tests only, not integration)

### Build & Deploy

**Build Tool:** Next.js built-in (webpack + SWC)

**Deployment Target:** Vercel (or existing platform)

**CI/CD:** GitHub Actions (recommended)

```yaml
# .github/workflows/currency-iteration.yml
name: Currency Iteration CI

on:
  push:
    branches: [iter9-*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run test
      - run: npm run build
```

## Environment Variables

All required environment variables:

- `DATABASE_URL`: PostgreSQL connection string (already exists)
  - Purpose: Prisma database connection
  - Where to get: Supabase project settings

- `EXCHANGE_RATE_API_KEY`: exchangerate-api.com API key (NEW)
  - Purpose: Fetch current and historical exchange rates
  - Where to get: Sign up at https://www.exchangerate-api.com/ (free tier)
  - Format: 24-character alphanumeric string
  - Example: `a1b2c3d4e5f6g7h8i9j0k1l2`

- `NEXT_PUBLIC_APP_URL`: Application URL (already exists)
  - Purpose: Used in emails and redirects
  - Already configured

**Update .env.example:**
```bash
# Exchange Rate API (for currency conversion)
EXCHANGE_RATE_API_KEY=your_api_key_here # Get from https://www.exchangerate-api.com/
```

## Dependencies Overview

Key packages with versions (ALL ALREADY INSTALLED):

- `@prisma/client@5.22.0`: Database ORM with transaction support
- `@trpc/server@11.6.0`: Type-safe API layer
- `@trpc/react-query@11.6.0`: tRPC React integration
- `@tanstack/react-query@5.59.16`: Cache management
- `zod@3.23.8`: Input validation schemas
- `decimal.js@10.4.3`: High-precision decimal arithmetic (via Prisma)
- `react-hook-form@7.53.2`: Form state management
- `@radix-ui/react-select@2.1.2`: Currency dropdown
- `@radix-ui/react-alert-dialog@1.1.2`: Confirmation dialog
- `@radix-ui/react-dialog@1.1.2`: Progress modal
- `@radix-ui/react-progress@1.1.0`: Progress bar
- `lucide-react@0.454.0`: Icons (Loader2, CheckCircle, AlertTriangle, ArrowLeftRight)
- `date-fns@4.1.0`: Date formatting

**NEW DEPENDENCIES NEEDED:** NONE

All required functionality is available in existing dependencies. This is a major advantage - no additional npm installs, no version conflicts, no security audits needed.

## Performance Targets

- **First Contentful Paint:** <1.5s (currency settings page)
- **Bundle Size:** <50KB additional JS (currency components)
- **API Response Time:**
  - Exchange rate fetch: <500ms (cached: <50ms)
  - Conversion initiation: <200ms (just creates log entry)
  - Full conversion: <30s for 1,000 transactions (acceptance criteria)
- **Database Query Performance:**
  - Fetch user transactions: <1s for 10,000 records
  - Batch update transactions: <20s for 1,000 records in transaction
  - Cache rate lookup: <10ms (indexed query)

**Performance Optimization Strategies:**
1. Batch historical rate fetching (30-90 API calls instead of 1,000+)
2. Parallel rate fetching with Promise.all for unique dates
3. Database indexes on ExchangeRate (fromCurrency, toCurrency, date)
4. Prisma transaction timeout extended to 60 seconds (default 5s)
5. Progress tracking every 100 records (reduces database writes)

## Security Considerations

**API Key Security:**
- Store EXCHANGE_RATE_API_KEY in environment variables (server-side only)
- Never expose to client (fetch calls happen server-side in tRPC procedures)
- Rotate key if compromised (exchangerate-api.com dashboard)

**User Data Protection:**
- Conversion lock prevents concurrent operations (data integrity)
- Atomic transactions ensure all-or-nothing conversion (no partial corruption)
- Audit log records all conversion attempts (compliance + debugging)
- User authentication required for all conversion endpoints (protectedProcedure)

**Input Validation:**
- Zod schemas validate currency codes (only allow supported currencies)
- Prevent SQL injection (Prisma parameterized queries)
- Prevent CSRF attacks (tRPC CSRF protection built-in)
- Rate limiting on conversion endpoint (prevent abuse, 1 conversion per 5 minutes)

**Error Handling:**
- Never expose internal errors to client (sanitize error messages)
- Log detailed errors server-side for debugging
- Return user-friendly messages: "Conversion failed, please try again"

**Compliance:**
- GDPR: Conversion log is personal data (delete on user account deletion)
- Audit trail: CurrencyConversionLog provides complete history
- Data retention: Consider auto-deleting logs older than 90 days

---

**Document Version:** 1.0
**Created:** 2025-10-02
**Dependencies Added:** 0 (all existing)
**Risk Level:** HIGH (data integrity critical)
**Approval Required:** YES (before Builder 1 starts database migration)
