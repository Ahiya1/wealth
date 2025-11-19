# Technology Stack - Iteration 19

## Core Framework

**Decision:** Next.js 14.2.33 (App Router)

**Rationale:**
- Already in use throughout Wealth application
- Server components enable efficient tRPC integration
- API routes support long-running mutations (sync operations)
- No framework changes needed - leverage existing infrastructure

**Alternatives Considered:**
- Remix: Not chosen (project already on Next.js, no migration benefit)
- Standalone Node.js: Not chosen (Next.js provides better DX, deployed on Vercel)

**Implementation Notes:**
- Use existing `/src/app` directory structure
- tRPC routers in `/src/server/api/routers/`
- Services in `/src/server/services/` and `/src/lib/services/`

## Database

**Decision:** PostgreSQL (via Supabase) + Prisma ORM 5.22.0

**Rationale:**
- Database schema complete from Iteration 17 (BankConnection, SyncLog, Transaction enhancements)
- Prisma batch operations proven in codebase (createMany, aggregate)
- Indexes already optimized for import queries
- No migrations needed for Iteration 19

**Schema Strategy:**
```prisma
// EXISTING - No changes needed
model Transaction {
  id                       String                @id @default(cuid())
  userId                   String
  accountId                String
  date                     DateTime
  amount                   Decimal               @db.Decimal(10, 2)
  payee                    String
  categoryId               String
  rawMerchantName          String?               // From bank scraper
  importSource             ImportSource?         // MANUAL, FIBI, CAL, PLAID
  importedAt               DateTime?
  categorizedBy            CategorizationSource? // USER, AI_CACHED, AI_SUGGESTED
  categorizationConfidence ConfidenceLevel?      // HIGH, MEDIUM, LOW
  isManual                 Boolean               @default(true)

  @@index([userId, accountId, date(sort: Desc)])  // Duplicate detection query
  @@index([userId, categoryId, date(sort: Desc)]) // Budget calculation query
  @@index([importSource])
}

model SyncLog {
  id                   String     @id @default(cuid())
  bankConnectionId     String
  startedAt            DateTime
  completedAt          DateTime?
  status               SyncStatus // IN_PROGRESS, SUCCESS, FAILED, PARTIAL
  transactionsImported Int        @default(0)
  transactionsSkipped  Int        @default(0)
  errorDetails         String?    @db.Text
  createdAt            DateTime   @default(now())

  @@index([bankConnectionId, createdAt(sort: Desc)]) // Sync history query
}
```

**Performance Optimizations:**
- Use `createMany` for bulk transaction inserts (10-100x faster than loops)
- Use `aggregate` for budget calculations (single query instead of N+1)
- Leverage existing indexes (no new indexes needed)

## Authentication

**Decision:** Supabase Auth + tRPC Context

**Rationale:**
- Already integrated in tRPC `protectedProcedure`
- User ID available via `ctx.user.id` in all mutations/queries
- No authentication changes needed for Iteration 19

**Implementation Notes:**
- All sync endpoints use `protectedProcedure` (requires auth)
- Verify connection ownership: `connection.userId === ctx.user.id`
- Prisma queries filtered by `userId` (RLS-equivalent security)

## API Layer

**Decision:** tRPC 11.6.0 (type-safe mutations + queries)

**Rationale:**
- Existing pattern from Iteration 18 (`bankConnections.router.ts` has `test` mutation)
- React Query integration for cache management
- Polling pattern proven in codebase (exports feature uses refetchInterval)
- Type safety eliminates API contract bugs

**New Router Structure:**
```typescript
// /src/server/api/routers/syncTransactions.router.ts (NEW)
export const syncTransactionsRouter = router({
  // Start manual sync
  trigger: protectedProcedure
    .input(z.object({
      bankConnectionId: z.string().cuid(),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Returns { syncLogId } for progress polling
    }),

  // Poll sync status (every 2 seconds)
  status: protectedProcedure
    .input(z.object({ syncLogId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // Returns { status, transactionsImported, transactionsSkipped, errorDetails }
    }),

  // Get sync history (last 10 syncs)
  history: protectedProcedure
    .input(z.object({ bankConnectionId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // Returns SyncLog[]
    })
})
```

**Why Not REST API:**
- tRPC provides automatic type inference (no manual API types)
- React Query integration handles caching, polling, invalidation
- Existing codebase standardized on tRPC patterns

## Frontend

**Decision:** React 18 + TypeScript 5.x (via Next.js)

**UI Component Library:** shadcn/ui (existing)

**Styling:** Tailwind CSS 3.x (existing)

**Rationale:**
- Consistent with existing Wealth UI patterns
- shadcn/ui toast system already in use (useToast hook)
- Tailwind utility classes for rapid UI development
- No new UI libraries needed

**Key Components (NEW):**
```typescript
// /src/components/bank-connections/SyncButton.tsx
// Trigger manual sync, show loading state
// Uses tRPC mutation + toast notifications

// /src/components/bank-connections/SyncProgressModal.tsx
// Display real-time sync progress via polling
// Shows: Importing X transactions, Categorizing Y transactions, Skipped Z duplicates
```

**Existing Components (MODIFY):**
```typescript
// /src/app/dashboard/page.tsx
// Add "Sync Now" button to dashboard (calls syncTransactions.trigger)
// Display "Last synced: X minutes ago" timestamp

// /src/app/settings/bank-connections/page.tsx
// Add "Sync" button per connection (existing page structure)
```

## External Integrations

### Israeli Bank Scraper (EXISTING - Iteration 18)

**Purpose:** Fetch transactions from First International Bank (FIBI) and Visa CAL credit card

**Library:** `israeli-bank-scrapers` 6.2.5

**Implementation:** `/src/server/services/bank-scraper.service.ts` (EXISTING - no changes)

**Interface:**
```typescript
export interface ScrapeResult {
  success: boolean
  transactions: ImportedTransaction[]
  accountNumber?: string
  balance?: number
}

export interface ImportedTransaction {
  date: Date
  processedDate: Date
  amount: number
  description: string  // Raw merchant name
  memo?: string
  status: 'completed' | 'pending'
}
```

**Key Points:**
- Already filters pending transactions (only 'completed' imported)
- Returns raw merchant names (description field)
- Handles 2FA/OTP via BankScraperError types
- Decrypts credentials in-memory only

### AI Categorization (EXISTING)

**Purpose:** Auto-categorize imported transactions using MerchantCategoryCache + Claude API

**Library:** `@anthropic-ai/sdk` 0.32.1

**Implementation:** `/src/server/services/categorize.service.ts` (EXISTING - no changes)

**Architecture:**
```typescript
// Two-tier categorization
categorizeTransactions(userId, transactions[], prisma): CategorizationResult[]
  ├─→ Tier 1: Check MerchantCategoryCache (70-80% hit rate, instant)
  └─→ Tier 2: Batch call Claude API (50 transactions per call, 2-5s)

// Result format
interface CategorizationResult {
  transactionId: string
  categoryName: string
  categoryId: string | null
  confidence: 'high' | 'low'
}
```

**Model:** `claude-3-5-sonnet-20241022` (Temperature: 0.2 for consistency)

**Cost Optimization:**
- Aggressive caching reduces API calls by 80%
- Batch processing: 50 transactions per API call
- Cache automatically updated on successful categorization

### Fuzzy Merchant Matching (NEW)

**Purpose:** Duplicate detection via merchant name similarity

**Library:** `string-similarity` 4.0.1 (Dice coefficient algorithm)

**Installation:**
```bash
npm install string-similarity
npm install --save-dev @types/string-similarity
```

**Implementation:**
```typescript
// /src/lib/services/duplicate-detection.service.ts
import { compareTwoStrings } from 'string-similarity'

export function isMerchantSimilar(merchant1: string, merchant2: string): boolean {
  const normalized1 = merchant1.toLowerCase().trim()
  const normalized2 = merchant2.toLowerCase().trim()

  // Exact match
  if (normalized1 === normalized2) return true

  // Fuzzy match (80% similarity threshold)
  const similarity = compareTwoStrings(normalized1, normalized2)
  return similarity >= 0.8
}
```

**Why string-similarity:**
- Lightweight (~5KB, no native dependencies)
- Dice coefficient more accurate than Levenshtein for partial matches
- Battle-tested (2M weekly downloads on npm)
- Simple API (single function call)

**Alternatives Rejected:**
- `fuzzball` (Levenshtein distance): Slower, less accurate for merchant names
- Hand-rolled algorithm: Reinventing wheel, not recommended
- ML-based fuzzy matching: Over-engineering for MVP

## Development Tools

### Testing

**Framework:** Vitest (existing)

**Coverage Target:** 80% for new services

**Strategy:**
```typescript
// Unit tests for duplicate detection
// /src/lib/services/__tests__/duplicate-detection.test.ts
describe('isDuplicate', () => {
  it('detects exact duplicates (date + amount + merchant)', () => {})
  it('handles timezone differences (±1 day tolerance)', () => {})
  it('handles merchant name variations (fuzzy match)', () => {})
  it('prevents false positives (different merchants, similar names)', () => {})
  // ... 20+ test cases total
})

// Integration tests for import service
// /src/server/services/__tests__/transaction-import.test.ts
describe('importTransactions', () => {
  it('imports new transactions successfully', () => {})
  it('skips duplicate transactions', () => {})
  it('categorizes via MerchantCategoryCache', () => {})
  it('updates account balance atomically', () => {})
  it('handles scraper errors gracefully', () => {})
  // ... 15+ test cases
})

// API tests for sync endpoints
// /src/server/api/routers/__tests__/syncTransactions.router.test.ts
describe('syncTransactions.trigger', () => {
  it('requires authentication', () => {})
  it('verifies connection ownership', () => {})
  it('creates SyncLog record', () => {})
  it('returns syncLogId for polling', () => {})
  // ... 12+ test cases
})
```

**Test Commands:**
```bash
npm test                              # Run all tests
npm run test:ui                       # Vitest UI
npm run test:coverage                 # Coverage report
npm test duplicate-detection.test.ts  # Specific test suite
```

### Code Quality

**Linter:** ESLint (existing config)

**Formatter:** Prettier (existing config)

**Type Checking:** TypeScript strict mode (existing)

**Pre-commit Hooks:** None required (manual validation)

**Standards:**
- All new code follows existing patterns
- Copy established service structure (`categorize.service.ts`, `bank-scraper.service.ts`)
- Match existing naming conventions (camelCase functions, PascalCase types)

### Build & Deploy

**Build Tool:** Next.js built-in (Turbopack in dev, Webpack in prod)

**Deployment Target:** Vercel (existing deployment)

**CI/CD:** Automatic deployment on merge to `main` branch

**Build Checks:**
```bash
npm run build      # TypeScript compilation, zero errors required
npm run lint       # ESLint, zero warnings required
npm test           # All tests pass required
```

**Vercel Configuration:**
```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60  // 60-second timeout for sync mutations (requires Vercel Pro)
    }
  }
}
```

**Important:** Vercel Pro tier recommended for sync operations (60s timeout vs 10s on hobby tier)

## Environment Variables

### Required (Already Set)

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/wealth

# Credential encryption (AES-256-GCM key, 32 bytes hex)
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI categorization
ANTHROPIC_API_KEY=sk-ant-xxx...

# Authentication
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### New Variables (NONE REQUIRED)

No new environment variables needed for Iteration 19. All required configuration exists from previous iterations.

## Dependencies Overview

### Production Dependencies

```json
{
  "dependencies": {
    // NEW (Iteration 19)
    "string-similarity": "^4.0.1",

    // EXISTING (No version changes)
    "israeli-bank-scrapers": "^6.2.5",
    "@anthropic-ai/sdk": "^0.32.1",
    "@prisma/client": "^5.22.0",
    "@trpc/server": "^11.6.0",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0",
    "@tanstack/react-query": "^5.59.16",
    "zod": "^3.23.8",
    "date-fns": "^3.6.0",
    "next": "14.2.33",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.6.3"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // NEW (Iteration 19)
    "@types/string-similarity": "^4.0.1",

    // EXISTING (No changes)
    "@types/react": "^18.3.11",
    "@types/node": "^22.7.5",
    "vitest": "^2.1.4",
    "eslint": "^8.57.1",
    "prettier": "^3.3.3",
    "tailwindcss": "^3.4.14"
  }
}
```

## Performance Targets

### Database Operations

**Duplicate Detection Query:**
- Target: <200ms
- Optimization: Composite index on `(userId, accountId, date)`
- Query: `findMany` with date range filter (last 90 days)

**Transaction Batch Insert:**
- Target: <500ms for 100 records
- Optimization: Prisma `createMany` (single query)
- Alternative: Individual `create` calls = 5-10 seconds (100x slower)

**Budget Recalculation:**
- Target: <100ms per category
- Optimization: Prisma `aggregate` (single query, not N+1)
- Existing implementation already optimized

**MerchantCategoryCache Lookup:**
- Target: <10ms
- Optimization: Unique index on `merchant` field (O(1) lookup)
- Cache hit rate: 70-80% on second sync

### API Response Times

**Sync Trigger Mutation:**
- Target: <60 seconds for 100 transactions
- Breakdown:
  - Scrape bank: 5-10 seconds
  - Duplicate detection: 2-5 seconds (in-memory comparison)
  - Batch insert: <1 second (createMany)
  - Categorization: 2-30 seconds (70-80% cache hits, 20-30% Claude API)
  - Account balance update: <100ms (single atomic operation)

**Sync Status Query (Polling):**
- Target: <50ms
- Optimization: Single SyncLog lookup by ID (primary key query)
- Polling interval: 2 seconds (balance responsiveness vs API load)

**Sync History Query:**
- Target: <100ms
- Optimization: Index on `(bankConnectionId, createdAt DESC)`
- Limit: Last 10 sync logs only

### Frontend Performance

**React Query Cache Invalidation:**
- Target: <500ms to refetch and re-render
- Queries invalidated: transactions.list, budgets.progress, bankConnections.list
- Automatic batching via React Query (no manual optimization needed)

**Toast Notification Display:**
- Target: <200ms after mutation success
- shadcn/ui toast system already optimized

**UI Loading States:**
- Sync button disable: <100ms on click
- Loading spinner display: Immediate (synchronous state update)
- Progress modal open: <200ms (no lazy loading, preloaded component)

## Security Considerations

### Credential Encryption

**Algorithm:** AES-256-GCM (authenticated encryption)

**Key Management:**
- Encryption key from `ENCRYPTION_KEY` env variable (32 bytes hex)
- Key never stored in database or logged
- Credentials decrypted only in-memory during sync
- Decrypted credentials cleared from memory after sync completion

**Implementation:**
```typescript
// /src/lib/encryption.ts (EXISTING - no changes)
export function encryptBankCredentials(credentials: BankCredentials): string {
  // Returns: iv:authTag:encrypted (all hex-encoded)
}

export function decryptBankCredentials(encrypted: string): BankCredentials {
  // Validates authTag, throws on tampering
}
```

**Validation:**
- Never log decrypted credentials (sanitized logging in bank-scraper)
- Only log first 3 characters of userId (bank-scraper.service.ts pattern)
- No credentials in error messages or API responses

### Data Isolation

**User-Level Security:**
- All tRPC endpoints verify `connection.userId === ctx.user.id`
- Prisma queries filtered by `userId` (RLS-equivalent)
- Users cannot trigger sync for other users' connections

**Cascade Deletion:**
- Delete BankConnection → cascade delete SyncLog entries
- Delete User → cascade delete all BankConnections + SyncLogs
- Soft delete not used (hard delete for GDPR compliance)

### Audit Trail

**SyncLog Recording:**
- Every sync attempt logged (success + failure)
- Fields: startedAt, completedAt, status, transactionsImported, transactionsSkipped, errorDetails
- Error details sanitized (no credentials, only error type + message)

**Transaction Tracking:**
- `importSource` field tracks FIBI vs CAL vs MANUAL
- `importedAt` timestamp for audit
- `categorizedBy` tracks USER vs AI_CACHED vs AI_SUGGESTED
- No deletion of imported transactions (preserve audit trail)

### Error Message Sanitization

**BankScraperError Handling:**
```typescript
// User-friendly messages only (no internal details)
catch (error) {
  if (error instanceof BankScraperError) {
    // Map error types to user messages
    const userMessage = {
      INVALID_CREDENTIALS: 'Invalid credentials. Please update in Settings.',
      OTP_REQUIRED: 'SMS code required. Check your phone and try again.',
      OTP_TIMEOUT: 'SMS code expired. Please retry sync.',
      NETWORK_ERROR: 'Network error. Please check connection and retry.',
      BANK_MAINTENANCE: 'Bank website under maintenance. Try again later.',
      // ... etc
    }[error.errorType]

    throw new TRPCError({ code: 'BAD_REQUEST', message: userMessage })
  }
}
```

**Never Expose:**
- Decrypted credentials
- Raw API responses from israeli-bank-scrapers
- Internal file paths or stack traces
- Database connection strings

## Migration Path

### From Iteration 18 to 19

**No Database Migrations:**
- Schema complete in Iteration 17
- Prisma models ready for import service

**Code Additions Only:**
- New services: `transaction-import.service.ts`, `duplicate-detection.service.ts`
- New router: `syncTransactions.router.ts`
- New components: `SyncButton.tsx`, `SyncProgressModal.tsx`
- Existing code unchanged (categorize.service, bank-scraper.service)

**Deployment Steps:**
1. Install `string-similarity` dependency
2. Deploy new code to Vercel (automatic on merge to main)
3. No database migration or data backfill needed
4. Feature immediately available to all users

### From Iteration 19 to 20 (Future)

**Iteration 20 Plans:**
- Budget integration polish (real-time alerts, dashboard widgets)
- Automatic scheduled background sync (cron jobs or Vercel cron)
- Transaction review queue (approve/reject imports)
- Historical import (3-6 months backfill)

**Migration Considerations:**
- Background sync requires Vercel Pro tier or external job runner
- Transaction review queue requires new Prisma model (ReviewQueue)
- No breaking changes to Iteration 19 code
