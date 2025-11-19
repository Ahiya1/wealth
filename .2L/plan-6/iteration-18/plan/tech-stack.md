# Technology Stack - Iteration 18

## Core Framework (Established)

**Decision:** Next.js 14 (App Router)

**Rationale:**
- Already established in project (15+ prior iterations)
- Server Components pattern ideal for server-side scraping operations
- tRPC integration proven and stable
- App Router enables colocation of API routes and UI components

**No Changes Required:** Continue using existing Next.js infrastructure

---

## Screen Scraping Library (NEW)

**Decision:** israeli-bank-scrapers v6.2.5

**Rationale:**
- **Only viable option:** No official APIs for Israeli banks without PSD2 license
- **Broad support:** Covers 15+ Israeli banks including FIBI and Visa CAL
- **Active maintenance:** 900+ GitHub stars, last commit <1 month, 100+ versions since 2017
- **Production-tested:** Used by multiple Israeli fintech apps in production
- **2FA support:** Built-in OTP callback pattern for SMS verification
- **Comprehensive output:** Returns transactions with date, amount, merchant, status

**Installation:**
```bash
npm install israeli-bank-scrapers --save
```

**Version Pinning Strategy:**
- Pin to v6.2.5 initially
- Test thoroughly before any version upgrades
- Monitor GitHub releases for FIBI/CAL scraper updates
- Set up dependabot alerts for security patches only

**Transitive Dependencies:**
- Puppeteer (headless browser automation) - ~300MB binary
- Playwright (alternative browser engine) - optional
- Various banking protocol libraries

**Deployment Considerations:**
- Vercel Pro tier required (Puppeteer binary size + 60s timeout)
- Headless mode only (showBrowser: false in production)
- Browser context cleanup critical (prevent memory leaks)

---

## Database (Established)

**Decision:** PostgreSQL via Supabase + Prisma ORM v5.22.0

**Schema Enhancements (from Iteration 17):**
```prisma
model BankConnection {
  id                   String           @id @default(cuid())
  userId               String
  bank                 BankProvider     // FIBI | VISA_CAL
  accountType          AccountType      // CHECKING | CREDIT
  encryptedCredentials String           @db.Text
  accountIdentifier    String           // Last 4 digits
  status               ConnectionStatus // ACTIVE | ERROR | EXPIRED
  lastSynced           DateTime?
  lastSuccessfulSync   DateTime?
  errorMessage         String?          @db.Text
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  user     User      @relation(...)
  syncLogs SyncLog[]

  @@index([userId])
  @@index([status])
  @@index([userId, status])
}

model SyncLog {
  id                   String     @id @default(cuid())
  bankConnectionId     String
  startedAt            DateTime
  completedAt          DateTime?
  status               SyncStatus // SUCCESS | PARTIAL | FAILED
  transactionsImported Int        @default(0)
  transactionsSkipped  Int        @default(0)
  errorDetails         String?    @db.Text
  createdAt            DateTime   @default(now())

  bankConnection BankConnection @relation(...)

  @@index([bankConnectionId])
  @@index([createdAt(sort: Desc)])
  @@index([status])
}

enum BankProvider {
  FIBI       // First International Bank of Israel
  VISA_CAL   // Visa CAL credit card
}

enum ConnectionStatus {
  ACTIVE   // Connection working
  ERROR    // Sync failed
  EXPIRED  // Credentials expired
}

enum SyncStatus {
  SUCCESS  // All transactions imported
  PARTIAL  // Some transactions imported
  FAILED   // Sync completely failed
}
```

**No Migrations Required:** Schema already established in Iteration 17

---

## Authentication & Encryption (Established)

**Decision:** Supabase Auth + Custom AES-256-GCM Encryption

**Encryption Infrastructure:**
- Location: `/src/lib/encryption.ts` (from Iteration 17)
- Algorithm: AES-256-GCM (authenticated encryption)
- Key Management: Environment variable ENCRYPTION_KEY (64-char hex)
- IV Generation: Random per encryption (prevents pattern analysis)
- Credential Format: `iv:authTag:encrypted` (all hex strings)

**Encryption Functions:**
```typescript
encryptBankCredentials(credentials: BankCredentials): string
decryptBankCredentials(encrypted: string): BankCredentials

interface BankCredentials {
  userId: string    // Bank user ID (not Wealth user ID)
  password: string  // Bank password
  otp?: string     // Optional 2FA code (never persisted)
}
```

**Security Standards:**
- Credentials decrypted ONLY in server-side tRPC mutations
- In-memory decryption only (never stored in state)
- Garbage collection clears credentials after use
- No credentials logged anywhere (sanitized logging)

**Test Coverage:** 9 comprehensive tests (100% passing)
- Round-trip encryption/decryption
- IV randomization verification
- Tampered ciphertext detection
- Hebrew character support
- Special character handling

**No Changes Required:** Use existing encryption utilities unchanged

---

## API Layer (Established)

**Decision:** tRPC v11.6.0 with Zod validation

**Router Location:** `/src/server/api/routers/bankConnections.router.ts`

**New Endpoints (Iteration 18):**

```typescript
testConnection: protectedProcedure
  .input(z.object({
    id: z.string().cuid(),
    otp: z.string().length(6).optional(), // For 2FA retry
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Fetch connection + verify ownership
    // 2. Decrypt credentials in-memory
    // 3. Call scrapeBank() service
    // 4. Handle errors (8+ scenarios)
    // 5. Update connection status
    // 6. Create SyncLog record
    // 7. Return result
  })
```

**Error Handling Pattern:**
```typescript
import { TRPCError } from '@trpc/server'

// Custom error class for scraper failures
class BankScraperError extends Error {
  constructor(
    public errorType: 'INVALID_CREDENTIALS' | 'OTP_REQUIRED' | 'OTP_TIMEOUT' | 'NETWORK_ERROR' | 'SCRAPER_BROKEN' | 'ACCOUNT_BLOCKED' | 'PASSWORD_EXPIRED',
    message: string,
    public originalError?: Error
  ) {
    super(message)
  }
}

// Map to tRPC errors
if (error instanceof BankScraperError) {
  throw new TRPCError({
    code: error.errorType === 'INVALID_CREDENTIALS' ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
    message: error.message,
  })
}
```

**Authorization:** Existing protectedProcedure pattern (user can only access own connections)

**No Core Changes Required:** Extend existing router with new mutations

---

## Frontend UI Components (Established)

**Decision:** shadcn/ui (Radix UI primitives) + Tailwind CSS

**Key Components for Iteration 18:**

**Dialog/Modal:**
- Library: @radix-ui/react-dialog v1.1.15
- Location: `/src/components/ui/dialog.tsx`
- Usage: Connection wizard container, OTP modal

**Form Management:**
- Library: react-hook-form v7.x + @hookform/resolvers v3.9.1
- Validation: Zod schemas
- Pattern: Existing RecurringTransactionForm, GoalForm patterns

**Toast Notifications:**
- Library: @radix-ui/react-toast v1.2.15
- Location: `/src/components/ui/use-toast.tsx`
- Usage: Success/error messages during connection test

**Button/Input Components:**
- shadcn/ui primitives (already available)
- Tailwind CSS for styling
- Sage color scheme (brand consistency)

**Multi-Step Wizard Pattern:**
- Reference: `/src/components/onboarding/OnboardingWizard.tsx`
- State Management: useState for currentStep tracking
- Progress Indicator: Reuse OnboardingProgress component pattern

**No New UI Library Dependencies Required**

---

## 2FA/OTP Handling Patterns

**Decision:** Async Promise-based OTP callback pattern

**Implementation Strategy:**

**Server-Side (israeli-bank-scrapers integration):**
```typescript
const scraper = createScraper({
  companyId: CompanyTypes.fibi,
  // ... other options
})

const result = await scraper.scrape({
  username: credentials.userId,
  password: credentials.password,
  otpCodeRetriever: async () => {
    // Library calls this when OTP required
    // Return promise that resolves with OTP code
    return await getOTPFromClient()
  }
})
```

**Challenge:** Scraper runs server-side, but OTP must come from client UI

**Solution:** Two-phase approach
1. **Phase 1:** Initial connection attempt without OTP
2. **If OTP required:** Scraper returns error → Client shows OTP modal → User enters code
3. **Phase 2:** Retry connection with OTP parameter in mutation input

**OTP Modal State Machine:**
```typescript
type OtpState = 'idle' | 'waiting_for_otp' | 'validating_otp' | 'otp_success' | 'otp_timeout'

const [otpState, setOtpState] = useState<OtpState>('idle')
const [otpCode, setOtpCode] = useState('')
const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null)
```

**Timeout Handling:**
- 3-minute countdown timer in modal
- Automatic transition to 'otp_timeout' state after 180 seconds
- Clear error message: "SMS code expired, please retry connection"

**Retry Logic:**
- Max 3 OTP attempts per connection test
- After 3 failures: Block for 15 minutes (prevent account lockout)
- "Resend Code" button triggers new connection attempt

---

## Testing Infrastructure

**Unit Testing:**
- Framework: Vitest (already established)
- Coverage Target: >80% for scraper service
- Mock Strategy: Mock israeli-bank-scrapers responses

**Test Files (New):**
```
/src/server/services/__tests__/bank-scraper.service.test.ts
  - Mock scraper success/failure scenarios
  - Test error categorization logic
  - Test transaction mapping edge cases

/src/lib/__tests__/bankErrorMessages.test.ts
  - Verify all error types have user messages
  - Test message formatting
```

**Integration Testing:**
- Manual testing with REAL bank accounts (FIBI + CAL)
- 2-3 days dedicated testing period
- 40+ test scenarios documented in SyncLog records

**Test Commands (Existing):**
```bash
npm run test              # Run all tests
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report
```

**E2E Testing:**
- Deferred to Iteration 20 (no Playwright MCP usage yet)

---

## Environment Variables

**Existing (No Changes):**
```bash
# Supabase Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Encryption (from Iteration 17)
ENCRYPTION_KEY=<64-character hex string>

# Authentication
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**New Variables (None Required):**
- israeli-bank-scrapers uses runtime credentials (no API keys)
- Puppeteer binary downloaded during npm install (no env vars)

---

## Deployment Configuration

**Vercel Settings:**

**REQUIRED: Vercel Pro Tier ($20/month)**
- Reason: 60-second function timeout needed for scraping operations
- Hobby tier: 10s max (insufficient)
- Pro tier: 60s max (sufficient for 95% of scrapes)

**vercel.json Configuration:**
```json
{
  "functions": {
    "src/app/api/trpc/[trpc]/route.ts": {
      "maxDuration": 60
    }
  }
}
```

**Build Configuration:**
- No changes to build command
- Puppeteer binary included in deployment
- Monitor build size (target <50MB function size)

**Disk Space Considerations:**
- Puppeteer binary: ~300MB
- Verify Vercel Pro disk space limits
- Consider chrome-aws-lambda for future optimization (lighter binary)

---

## Performance Targets

**Scraping Performance:**
- Connection test: <30 seconds (typical)
- Max timeout: 60 seconds (Vercel limit)
- OTP entry: User-controlled (3-minute window)

**Database Performance:**
- Connection fetch: <50ms (indexed userId)
- SyncLog insert: <100ms
- Transaction batch insert: Deferred to Iteration 19

**UI Performance:**
- Wizard rendering: <100ms
- OTP modal open: <50ms
- Toast notifications: Immediate

**No Optimization Required:** Iteration 18 focuses on functionality, not performance

---

## Security Patterns

**Credential Decryption Scope:**
```typescript
// GOOD: Decrypt in mutation, use immediately, let GC clear
const credentials = decryptBankCredentials(connection.encryptedCredentials)
const result = await scrapeBank({ bank, credentials, startDate, endDate })
// credentials automatically cleared by garbage collection

// BAD: Never store decrypted credentials in state
const [credentials, setCredentials] = useState(null) // NEVER DO THIS
```

**Logging Safeguards:**
```typescript
// GOOD: Sanitized logging
console.log('Test connection for bank:', connection.bank, 'user:', credentials.userId.substring(0, 3) + '***')

// BAD: Exposes sensitive data
console.log('Credentials:', credentials) // NEVER DO THIS
console.log('OTP code:', otpCode)        // NEVER DO THIS
```

**Error Message Sanitization:**
```typescript
// Before storing in SyncLog.errorDetails
const sanitizedError = error.message.replace(/password|otp|credentials/gi, '[REDACTED]')
```

**Browser Lifecycle Security:**
- Always close browser contexts after scrape
- Prevent credential exposure in browser memory
- Headless mode only (no visible browser windows)

---

## Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- Comprehensive JSDoc comments for scraper service

**ESLint Rules:**
- Existing configuration unchanged
- No new rules required

**Prettier:**
- Existing configuration unchanged

**Import Order:**
```typescript
// 1. External libraries
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'

// 2. Internal utilities
import { decryptBankCredentials } from '@/lib/encryption'

// 3. Types
import type { BankProvider } from '@prisma/client'

// 4. Relative imports
import { BankScraperError } from './types'
```

---

## Dependencies Overview

**New Dependencies (Iteration 18):**
```json
{
  "dependencies": {
    "israeli-bank-scrapers": "^6.2.5"
  }
}
```

**Existing Dependencies (Reused):**
```json
{
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@trpc/client": "^11.6.0",
    "@trpc/next": "^11.6.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-toast": "^1.2.15",
    "react-hook-form": "^7.53.2",
    "@hookform/resolvers": "^3.9.1",
    "zod": "^3.24.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "vitest": "^1.x",
    "typescript": "^5.x"
  }
}
```

**No Additional Dependencies Required**

---

## Migration Path (Future)

**From Screen Scraping → Official APIs:**

When official Open Banking APIs become available (requires PSD2 license):

1. Create new scraper implementations in `/src/server/services/bank-api/`
2. Abstract scrapeBank() to support both scraper and API modes
3. Feature flag to toggle between scraping and official API
4. Gradual migration per bank (FIBI first, then CAL)
5. Deprecate israeli-bank-scrapers dependency

**Design Principles:**
- Scraper service layer prevents coupling to israeli-bank-scrapers internals
- BankScraperError abstraction works for both scraping and API errors
- Transaction mapping utilities reusable regardless of data source

---

## Monitoring & Observability

**Iteration 18 Scope (Minimal):**
- Console logging for development
- SyncLog database records for all attempts
- Manual success rate tracking via database queries

**Future (Iteration 20):**
- Sentry integration for error tracking
- Scraper health dashboard (success rate by bank)
- Automated alerting on sustained failures (>3 consecutive fails)
- Performance monitoring (P50/P95 scrape duration)

---

## Summary

**Tech Stack Status:** 95% Established, 5% New

**New Additions:**
- israeli-bank-scrapers v6.2.5 (only significant new dependency)
- Vercel Pro tier configuration

**Leveraged Existing:**
- Next.js 14 App Router
- PostgreSQL + Prisma (Iteration 17 schema)
- tRPC + Zod API layer
- AES-256-GCM encryption (Iteration 17)
- shadcn/ui components
- react-hook-form patterns

**Risk Mitigation:**
- Pin israeli-bank-scrapers version
- Comprehensive error categorization
- 2-3 days dedicated testing
- Clear deployment requirements (Vercel Pro)

**Confidence Level:** HIGH (95%) - Minimal new dependencies, proven patterns, clear requirements
