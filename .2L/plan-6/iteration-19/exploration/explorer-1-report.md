# Explorer 1 Report: Architecture & Structure - Import Pipeline

## Executive Summary

Iteration 19 builds the production-ready import pipeline on top of a solid foundation from Iterations 17-18. The existing architecture provides excellent building blocks: a working bank scraper service (`bank-scraper.service.ts`), mature AI categorization (`categorize.service.ts` with `MerchantCategoryCache`), encrypted credential management, and comprehensive tRPC patterns. The import service should live in `/src/server/services/` alongside existing services, with tRPC mutations following established long-running operation patterns. No duplicate detection exists yet, requiring new implementation with fuzzy matching. Toast notifications are in place via shadcn/ui's `useToast` hook.

## Discoveries

### Existing Bank Scraper Service (Iteration 18)

**Location:** `/src/server/services/bank-scraper.service.ts`

**Capabilities:**
- Integration with `israeli-bank-scrapers` npm library complete
- Supports FIBI (First International Bank) and VISA_CAL credit card
- Returns `ImportedTransaction[]` with:
  - `date`, `processedDate`, `amount`, `description`, `memo`
  - `status`: 'completed' | 'pending'
- **Already filters out pending transactions** (line 135-138)
- Custom `BankScraperError` with typed error categories:
  - `INVALID_CREDENTIALS`, `OTP_REQUIRED`, `OTP_TIMEOUT`, `NETWORK_ERROR`
  - `SCRAPER_BROKEN`, `BANK_MAINTENANCE`, `ACCOUNT_BLOCKED`, `PASSWORD_EXPIRED`
- Sanitized logging (only logs first 3 chars of userId)
- Default date range: last 30 days

**Key Interface:**
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

**Critical Observation:** Scraper returns `description` which maps to our `rawMerchantName` field, and filters pending transactions automatically.

### Existing AI Categorization Service

**Location:** `/src/server/services/categorize.service.ts`

**Architecture:**
- **Two-tier categorization:**
  1. `MerchantCategoryCache` lookup (instant, high confidence)
  2. Claude API fallback for cache misses (batched, up to 50 transactions)
- **Cache management:** Auto-updates cache on successful AI categorization
- **Batch optimization:** Processes up to 50 transactions per Claude API call
- **Confidence scoring:** 'high' for cache hits, varies for AI suggestions
- **Normalization:** Merchant names normalized (lowercase, trim) for cache lookups

**Key Functions:**
```typescript
// Main categorization entry point
categorizeTransactions(
  userId: string,
  transactions: TransactionToCategorize[],
  prismaClient: PrismaClient
): Promise<CategorizationResult[]>

// Internal cache operations
getMerchantCategoryFromCache(merchant: string, prisma): Promise<string | null>
cacheMerchantCategory(merchant: string, categoryId: string, prisma): Promise<void>
```

**Integration Pattern:**
```typescript
interface TransactionToCategorize {
  id: string
  payee: string      // Maps to our rawMerchantName
  amount: number
}

interface CategorizationResult {
  transactionId: string
  categoryName: string
  categoryId: string | null
  confidence: 'high' | 'low'
}
```

**Critical Insight:** The service already handles batch processing, caching, and Claude API calls efficiently. We just need to feed it imported transactions.

### Database Schema (Iteration 17 Complete)

**Transaction Model Enhancements:**
```prisma
model Transaction {
  // ... existing fields ...
  
  // Import tracking fields (Iteration 17)
  rawMerchantName          String?                // Original merchant name from bank
  importSource             ImportSource?          // MANUAL, FIBI, CAL, PLAID
  importedAt               DateTime?              // Timestamp of import
  categorizedBy            CategorizationSource?  // USER, AI_CACHED, AI_SUGGESTED
  categorizationConfidence ConfidenceLevel?       // HIGH, MEDIUM, LOW
  
  @@index([importSource])  // Already indexed for filtering
}

enum ImportSource {
  MANUAL
  FIBI
  CAL
  PLAID
}

enum CategorizationSource {
  USER         // Manually categorized
  AI_CACHED    // From MerchantCategoryCache
  AI_SUGGESTED // From Claude API
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}
```

**BankConnection & SyncLog Models:**
```prisma
model BankConnection {
  id                   String           @id @default(cuid())
  userId               String
  bank                 BankProvider
  accountType          AccountType
  encryptedCredentials String           @db.Text
  accountIdentifier    String           // Last 4 digits
  status               ConnectionStatus @default(ACTIVE)
  lastSynced           DateTime?
  lastSuccessfulSync   DateTime?
  errorMessage         String?          @db.Text
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncLogs SyncLog[]
  
  @@index([userId, status])
  @@index([lastSynced])
}

model SyncLog {
  id                   String     @id @default(cuid())
  bankConnectionId     String
  startedAt            DateTime
  completedAt          DateTime?
  status               SyncStatus
  transactionsImported Int        @default(0)
  transactionsSkipped  Int        @default(0)
  errorDetails         String?    @db.Text
  createdAt            DateTime   @default(now())
  
  bankConnection BankConnection @relation(...)
  
  @@index([bankConnectionId])
  @@index([createdAt(sort: Desc)])
}
```

**Critical Observation:** Schema is complete and production-ready. All fields needed for import pipeline already exist.

### MerchantCategoryCache Model

**Location:** Prisma schema line 347-358

```prisma
model MerchantCategoryCache {
  id         String   @id @default(cuid())
  merchant   String   @unique  // Normalized merchant name (lowercase, trimmed)
  categoryId String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  category Category @relation(...)
  
  @@index([merchant])
  @@index([categoryId])
}
```

**Usage Pattern:**
- Unique constraint on `merchant` ensures one category per merchant
- `upsert` operation used in categorize service to update existing mappings
- Cache applies globally (not user-specific), benefiting all users

**Cache Hit Rate Expectation:** Based on categorize service implementation and master plan expectations: ~70-80% on second sync.

### Existing tRPC Patterns for Long-Running Operations

**Pattern Analysis from `bankConnections.router.ts`:**

```typescript
// Pattern 1: Long-running mutation with try-catch error handling
test: protectedProcedure
  .input(z.object({ id: z.string(), otp: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify ownership
    const connection = await ctx.prisma.bankConnection.findUnique(...)
    if (!connection || connection.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    
    // 2. Create SyncLog (pessimistic: default to FAILED)
    const syncLog = await ctx.prisma.syncLog.create({
      data: {
        bankConnectionId: connection.id,
        startedAt: new Date(),
        status: 'FAILED',
      }
    })
    
    try {
      // 3. Execute scraper
      const result = await scrapeBank({...})
      
      // 4. Update connection status
      await ctx.prisma.bankConnection.update({
        where: { id: connection.id },
        data: { status: 'ACTIVE', lastSynced: new Date(), ... }
      })
      
      // 5. Update SyncLog to SUCCESS
      await ctx.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { completedAt: new Date(), status: 'SUCCESS', ... }
      })
      
      return { success: true, ... }
    } catch (error) {
      // 6. Handle BankScraperError
      if (error instanceof BankScraperError) {
        await ctx.prisma.bankConnection.update({ ... })
        await ctx.prisma.syncLog.update({ ... })
        throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
      }
      
      // 7. Handle unexpected errors
      await ctx.prisma.syncLog.update({ ... })
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', ... })
    }
  })
```

**Key Patterns:**
1. **Pessimistic SyncLog creation** (default to FAILED, update on success)
2. **Comprehensive error handling** (typed errors, user-friendly messages)
3. **Status updates** at each stage (connection, syncLog)
4. **Ownership verification** (userId check)
5. **Return detailed results** (success, counts, messages)

### Transaction Router Patterns

**Location:** `/src/server/api/routers/transactions.router.ts`

**Account Balance Update Pattern:**
```typescript
create: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    // Use Prisma $transaction for atomicity
    const transaction = await ctx.prisma.$transaction(async (prisma) => {
      // Create transaction
      const newTransaction = await prisma.transaction.create({...})
      
      // Update account balance
      await prisma.account.update({
        where: { id: input.accountId },
        data: { balance: { increment: input.amount } }
      })
      
      return newTransaction
    })
    
    return transaction
  })
```

**Critical Pattern:** Use `prisma.$transaction()` for atomic operations involving transaction creation + account balance updates.

**Batch Categorization Pattern:**
```typescript
categorizeBatch: protectedProcedure
  .input(z.object({ transactionIds: z.array(z.string()).min(1).max(50) }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify ownership
    const transactions = await ctx.prisma.transaction.findMany({
      where: { id: { in: input.transactionIds }, userId: ctx.user.id }
    })
    
    // 2. Prepare for categorization
    const txnsToCategorize = transactions.map(t => ({
      id: t.id,
      payee: t.payee,
      amount: t.amount.toNumber()
    }))
    
    // 3. Call categorization service
    const results = await categorizeTransactions(userId, txnsToCategorize, prisma)
    
    // 4. Batch update transactions
    const updatePromises = results
      .filter(r => r.categoryId !== null)
      .map(r => ctx.prisma.transaction.update({
        where: { id: r.transactionId },
        data: { categoryId: r.categoryId! }
      }))
    await Promise.all(updatePromises)
    
    return { total, categorized, results }
  })
```

**Key Insight:** Batch categorization already exists and follows pattern we need for import pipeline.

### Toast Notification System

**Location:** `/src/components/ui/use-toast.tsx`

**Architecture:** shadcn/ui toast system with:
- `toast({ title, description, variant })` function
- `useToast()` hook for components
- Variants: default, destructive, success (likely)
- Auto-dismiss with configurable timeout

**Usage Pattern:**
```typescript
import { toast } from '@/components/ui/use-toast'

// Success notification
toast({
  title: "Sync Complete",
  description: "Imported 47 new transactions",
})

// Error notification
toast({
  variant: "destructive",
  title: "Sync Failed",
  description: "Invalid credentials. Please update in Settings.",
})

// With update capability
const { id, update } = toast({
  title: "Syncing...",
  description: "Fetching transactions from FIBI",
})

// Later update the same toast
update({
  title: "Categorizing...",
  description: "Processing 47 transactions",
})
```

**Critical Observation:** Toast system supports progressive updates for long-running operations via `update()` method.

### Encryption Infrastructure

**Location:** `/src/lib/encryption.ts`

**Implementation:**
- AES-256-GCM encryption with authentication tags
- Encryption key from `ENCRYPTION_KEY` env variable (32 bytes hex)
- Format: `iv:authTag:encrypted` (all hex-encoded)
- Bank credential-specific helpers:
  - `encryptBankCredentials(credentials: BankCredentials): string`
  - `decryptBankCredentials(encrypted: string): BankCredentials`

**Security Measures:**
- Credentials only decrypted in-memory during sync
- Sanitized logging (first 3 chars only)
- Never log decrypted credentials
- Validation on decrypt (userId + password required)

**Critical Pattern:** Already in use by `bankConnections.router.ts` and `bank-scraper.service.ts`.

## Patterns Identified

### Pattern 1: Import Service Architecture

**Name:** Transaction Import Orchestration Service

**Description:** Centralized service to orchestrate scraping → deduplication → categorization → database insertion pipeline.

**Location:** `/src/server/services/transaction-import.service.ts` (NEW)

**Structure:**
```typescript
// Main orchestration function
export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  prismaClient: PrismaClient
): Promise<ImportResult>

// Helper functions
async function fetchTransactionsFromBank(connection, dates): Promise<ImportedTransaction[]>
async function deduplicateTransactions(imported, existing): Promise<{ new, skipped }>
async function insertTransactions(transactions, userId): Promise<Transaction[]>
async function categorizeImportedTransactions(transactions): Promise<void>

// Result type
interface ImportResult {
  imported: number
  skipped: number
  categorized: number
  errors: string[]
}
```

**Rationale:**
- Follows existing service pattern (`categorize.service.ts`, `bank-scraper.service.ts`)
- Separates business logic from tRPC router
- Enables testing without HTTP layer
- Reusable for future automatic sync (post-MVP)

### Pattern 2: Duplicate Detection Strategy

**Name:** Multi-Factor Fuzzy Matching

**Description:** Detect duplicates using date proximity, exact amount match, and fuzzy merchant name similarity.

**Algorithm:**
```typescript
function isDuplicate(
  importedTxn: ImportedTransaction,
  existingTxns: Transaction[]
): boolean {
  return existingTxns.some(existing => {
    // Factor 1: Date within ±1 day (handles timezone issues)
    const dateDiff = Math.abs(
      importedTxn.date.getTime() - existing.date.getTime()
    )
    const dateMatch = dateDiff <= 24 * 60 * 60 * 1000
    
    // Factor 2: Exact amount match
    const amountMatch = importedTxn.amount === existing.amount.toNumber()
    
    // Factor 3: Fuzzy merchant name similarity ≥80%
    const similarity = calculateSimilarity(
      importedTxn.description.toLowerCase(),
      (existing.rawMerchantName || existing.payee).toLowerCase()
    )
    const merchantMatch = similarity >= 0.8
    
    return dateMatch && amountMatch && merchantMatch
  })
}
```

**Library:** Use `string-similarity` npm package (already used in similar projects).

**Edge Cases Handled:**
- Timezone differences (±1 day tolerance)
- Manual vs imported transactions (check `rawMerchantName` or fallback to `payee`)
- Merchant name variations (fuzzy matching with 80% threshold)
- Currency conversion (not applicable for NIS-only MVP)

**Rationale:**
- Master plan specifies fuzzy matching on merchant names
- Date tolerance handles bank processing delays
- 80% similarity threshold balances false positives/negatives
- Aligns with vision requirement: "Detect and skip duplicate transactions (by date + amount + merchant)"

### Pattern 3: tRPC Mutation for Manual Sync

**Name:** Long-Running Sync Mutation with Progress Updates

**Description:** tRPC mutation that orchestrates import pipeline with comprehensive error handling and status tracking.

**Implementation:**
```typescript
// In bankConnections.router.ts (extend existing router)
sync: protectedProcedure
  .input(z.object({
    bankConnectionId: z.string().cuid(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Verify connection ownership
    const connection = await ctx.prisma.bankConnection.findUnique({
      where: { id: input.bankConnectionId },
    })
    
    if (!connection || connection.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    
    // 2. Create SyncLog (pessimistic default)
    const syncLog = await ctx.prisma.syncLog.create({
      data: {
        bankConnectionId: connection.id,
        startedAt: new Date(),
        status: 'FAILED',
      }
    })
    
    try {
      // 3. Call import service
      const result = await importTransactions(
        input.bankConnectionId,
        ctx.user.id,
        input.startDate,
        input.endDate,
        ctx.prisma
      )
      
      // 4. Update connection
      await ctx.prisma.bankConnection.update({
        where: { id: connection.id },
        data: {
          lastSynced: new Date(),
          lastSuccessfulSync: new Date(),
          status: 'ACTIVE',
          errorMessage: null,
        }
      })
      
      // 5. Update SyncLog to SUCCESS
      await ctx.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          completedAt: new Date(),
          status: 'SUCCESS',
          transactionsImported: result.imported,
          transactionsSkipped: result.skipped,
        }
      })
      
      return {
        success: true,
        imported: result.imported,
        skipped: result.skipped,
        categorized: result.categorized,
      }
    } catch (error) {
      // 6. Handle errors (BankScraperError, categorization errors)
      await ctx.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          completedAt: new Date(),
          status: 'FAILED',
          errorDetails: error.message,
        }
      })
      
      await ctx.prisma.bankConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        }
      })
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Sync failed: ' + error.message,
      })
    }
  })
```

**Rationale:**
- Follows existing `test` mutation pattern
- Comprehensive error handling
- Pessimistic SyncLog creation (fail-safe)
- Updates both BankConnection and SyncLog
- Returns detailed results for UI feedback

### Pattern 4: Categorization Integration

**Name:** Post-Import Batch Categorization

**Description:** After importing transactions, batch categorize using existing service with cache optimization.

**Implementation:**
```typescript
async function categorizeImportedTransactions(
  transactions: Transaction[],
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  // Prepare transactions for categorization
  const txnsToCategorize = transactions.map(t => ({
    id: t.id,
    payee: t.rawMerchantName || t.payee,  // Use raw merchant name
    amount: t.amount.toNumber(),
  }))
  
  // Call existing categorization service
  const results = await categorizeTransactions(
    userId,
    txnsToCategorize,
    prisma
  )
  
  // Batch update transactions with categories
  const updates = results
    .filter(r => r.categoryId !== null)
    .map(r => {
      const confidence = r.confidence === 'high' ? 'HIGH' : 'MEDIUM'
      const source = r.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED'
      
      return prisma.transaction.update({
        where: { id: r.transactionId },
        data: {
          categoryId: r.categoryId!,
          categorizedBy: source,
          categorizationConfidence: confidence,
        }
      })
    })
  
  await Promise.all(updates)
  
  return updates.length
}
```

**Rationale:**
- Reuses existing, tested categorization service
- Leverages MerchantCategoryCache (70-80% hit rate expected)
- Populates new import-tracking fields (`categorizedBy`, `categorizationConfidence`)
- Batch updates for performance

### Pattern 5: Account Balance Updates

**Name:** Atomic Transaction Insert with Balance Adjustment

**Description:** Ensure account balance stays in sync when importing transactions.

**Implementation:**
```typescript
async function insertTransactions(
  transactions: ImportedTransaction[],
  userId: string,
  accountId: string,
  importSource: ImportSource,
  prisma: PrismaClient
): Promise<Transaction[]> {
  const created: Transaction[] = []
  
  // Use atomic transaction for balance updates
  await prisma.$transaction(async (tx) => {
    for (const txn of transactions) {
      // Create transaction
      const newTxn = await tx.transaction.create({
        data: {
          userId,
          accountId,
          date: txn.date,
          amount: txn.amount,
          payee: txn.description,
          rawMerchantName: txn.description,
          importSource,
          importedAt: new Date(),
          isManual: false,
          categoryId: miscCategoryId,  // Default to Miscellaneous
          tags: [],
        }
      })
      
      created.push(newTxn)
    }
    
    // Update account balance once (sum all amounts)
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: totalAmount } }
    })
  })
  
  return created
}
```

**Rationale:**
- Atomic transaction ensures consistency
- Single balance update (not per-transaction) for performance
- Follows existing pattern from `transactions.router.ts`
- Default to Miscellaneous category, then batch categorize

## Complexity Assessment

### High Complexity Areas

**Duplicate Detection Engine**
- **Why Complex:** Requires fuzzy string matching, edge case handling (timezones, merchant name variations, manual vs imported)
- **Estimated Builder Splits:** 1 sub-builder if complexity exceeds 200 LOC or requires extensive testing
- **Recommendation:** Implement in main builder, extract to sub-builder only if validation reveals issues

**Import Service Orchestration**
- **Why Complex:** Coordinates 5+ operations (scrape → dedupe → insert → categorize → update logs), extensive error handling
- **Estimated Builder Splits:** Likely stays in main builder (orchestration is linear, not recursive)
- **Recommendation:** Use clear step-by-step comments, comprehensive tests

### Medium Complexity Areas

**tRPC Sync Mutation**
- **Complexity:** Follows existing pattern (`test` mutation), but longer with more status updates
- **Mitigation:** Copy pattern from `bankConnections.router.ts`, adapt incrementally

**Batch Categorization Integration**
- **Complexity:** Reuses existing service, just needs field mapping
- **Mitigation:** Existing `categorizeBatch` mutation is reference implementation

**SyncLog Status Management**
- **Complexity:** Multiple status updates (start, progress, complete), pessimistic defaults
- **Mitigation:** Well-established pattern in Iteration 18

### Low Complexity Areas

**Account Balance Updates**
- **Pattern:** Exact copy of `transactions.router.ts` create mutation
- **Complexity:** Minimal, just batch instead of single transaction

**Toast Notifications**
- **Pattern:** Existing `useToast` hook, straightforward implementation
- **Complexity:** Trivial

**Encryption Integration**
- **Pattern:** Already in use by bank scraper service
- **Complexity:** No new code needed

## Technology Recommendations

### Primary Stack (No Changes)

**Framework:** Next.js 14 (App Router)
- **Rationale:** Existing stack, no reason to change

**Database:** PostgreSQL + Prisma ORM
- **Rationale:** Schema already complete, migrations in place

**API Layer:** tRPC
- **Rationale:** Existing patterns for long-running mutations

**Auth:** Supabase Auth + Prisma RLS-equivalent
- **Rationale:** Already integrated in tRPC context

**UI:** shadcn/ui + Tailwind CSS
- **Rationale:** Toast system already in use

### Supporting Libraries

**string-similarity** (NEW)
- **Purpose:** Fuzzy merchant name matching for duplicate detection
- **Rationale:** Lightweight (~5KB), pure JavaScript, battle-tested
- **Alternative:** `fuzzball` (Levenshtein distance) - heavier but more accurate
- **Recommendation:** Start with `string-similarity`, upgrade if accuracy issues

**date-fns** (EXISTING)
- **Purpose:** Date range calculations, formatting
- **Rationale:** Already in use by budgets router, consistent API

**No additional dependencies required** - leverage existing infrastructure

## Integration Points

### External APIs

**israeli-bank-scrapers Library**
- **Purpose:** Fetch transactions from FIBI and VISA_CAL
- **Complexity:** Already integrated in Iteration 18
- **Considerations:** Screen scraping fragility (handled by BankScraperError types)

**Claude API (Anthropic)**
- **Purpose:** AI categorization for cache misses
- **Complexity:** Already integrated via `categorize.service.ts`
- **Considerations:** Cost optimization via batching (50 transactions per call)

### Internal Integrations

**bank-scraper.service.ts → transaction-import.service.ts**
- **Flow:** Import service calls scraper, receives `ImportedTransaction[]`
- **Data Mapping:** `description` → `rawMerchantName`, `amount` → `amount`, `date` → `date`

**transaction-import.service.ts → categorize.service.ts**
- **Flow:** After inserting transactions, pass to categorization service
- **Data Mapping:** `rawMerchantName` → `payee`, `id` → `id`, `amount` → `amount`

**transaction-import.service.ts → bankConnections.router.ts**
- **Flow:** tRPC mutation calls import service, handles results
- **Data Flow:** Service returns `ImportResult`, router updates SyncLog and BankConnection

**UI Components → tRPC Mutations**
- **Flow:** "Sync Now" button calls `bankConnections.sync` mutation
- **Data Flow:** React Query manages loading state, invalidates caches on success

## Risks & Challenges

### Technical Risks

**Risk 1: Duplicate Detection Accuracy**
- **Impact:** False positives = lost transactions, False negatives = duplicate entries
- **Likelihood:** MEDIUM (fuzzy matching tuning required)
- **Mitigation:**
  - Start with 80% similarity threshold, monitor skipped transaction reports
  - Log all skipped duplicates to SyncLog for user transparency
  - Allow manual "Force Import" option in UI (future iteration)
  - Comprehensive test suite with real-world merchant name variations

**Risk 2: Long Sync Times (60s+ for large imports)**
- **Impact:** Vercel free tier has 10s timeout, Pro tier has 60s
- **Likelihood:** HIGH for initial 30-day imports (200+ transactions)
- **Mitigation:**
  - Require Vercel Pro tier (documented in iteration plan)
  - Optimize batch operations (createMany, batch categorization)
  - Consider chunking: import 50 transactions per call, paginate
  - Alternative: Background queue (defer to post-MVP)

**Risk 3: MerchantCategoryCache Pollution**
- **Impact:** Incorrect cache entries affect all users, requires manual cleanup
- **Likelihood:** LOW (categorization service has 'high' accuracy)
- **Mitigation:**
  - User category corrections update cache (upsert logic in categorize service)
  - Admin tool to view/edit cache (future iteration)
  - Cache confidence scoring (only cache 'high' confidence results)

### Complexity Risks

**Risk 1: Import Service Exceeds Single Builder Scope**
- **Impact:** Builder needs to split mid-iteration
- **Likelihood:** LOW (estimated 300-400 LOC, within single builder capacity)
- **Mitigation:**
  - Clear separation: dedupe.ts, insert.ts, orchestrate.ts if needed
  - Pre-plan sub-builder tasks in builder-tasks.md
  - Integrator can split if builder reports complexity > 500 LOC

**Risk 2: Edge Cases in Duplicate Detection**
- **Impact:** Subtle bugs in production (wrong transactions skipped/imported)
- **Likelihood:** MEDIUM (real-world merchant data varies)
- **Mitigation:**
  - Extensive test suite (20+ duplicate scenarios in master plan)
  - Beta testing with real FIBI + CAL accounts
  - Detailed logging of all skipped duplicates
  - Manual review queue (future iteration, not MVP)

## Recommendations for Planner

### 1. Service Location: `/src/server/services/transaction-import.service.ts`

**Rationale:**
- Follows existing pattern (categorize, bank-scraper, plaid-sync all in `/src/server/services/`)
- Business logic separation from tRPC router
- Testable without HTTP layer
- Reusable for future automatic sync

**Structure:**
```
/src/server/services/
  ├── bank-scraper.service.ts       (EXISTING - Iteration 18)
  ├── categorize.service.ts         (EXISTING)
  ├── transaction-import.service.ts (NEW - Iteration 19)
  └── __tests__/
      ├── bank-scraper.service.test.ts
      ├── categorize.service.test.ts
      └── transaction-import.service.test.ts  (NEW)
```

### 2. tRPC Router Extension: Add `sync` Mutation to `bankConnections.router.ts`

**Rationale:**
- Keep all bank connection operations in single router
- Follows pattern from `test` mutation
- Avoids creating new router for single mutation

**Alternative Rejected:** Separate `sync.router.ts` - Over-engineering for MVP

### 3. Duplicate Detection Library: `string-similarity` (npm)

**Rationale:**
- Lightweight (5KB)
- Pure JavaScript (no native dependencies)
- Battle-tested in production apps
- Simple API: `compareTwoStrings(str1, str2) => 0-1 score`

**Installation:**
```bash
npm install string-similarity
npm install --save-dev @types/string-similarity
```

**Alternative:** Hand-roll Levenshtein distance - Reinventing wheel, not recommended

### 4. Account Balance Strategy: Update on Import

**Rationale:**
- Imported transactions affect account balance (just like manual entries)
- Consistency with existing transaction creation pattern
- BankConnection doesn't have `balance` field (only Account does)

**Implementation:** Follow Pattern 5 (Atomic Transaction Insert with Balance Adjustment)

### 5. Default Category: Miscellaneous → Then Batch Categorize

**Rationale:**
- Transactions need valid categoryId on insert (Prisma schema requires it)
- Miscellaneous is fallback category (existing default category)
- Batch categorization immediately after insert updates most transactions

**Flow:**
1. Insert all transactions with `categoryId = miscCategoryId`
2. Immediately call `categorizeImportedTransactions()`
3. 70-80% get re-categorized (cache hit rate)
4. Remaining 20-30% stay in Miscellaneous (user reviews later)

### 6. Performance Optimization: Batch Operations

**Recommendations:**
- Use `prisma.transaction.createMany()` for bulk inserts (10x faster than loops)
- Use `Promise.all()` for parallel categorization updates
- Single account balance update (not per-transaction)
- Database indexes already in place (Iteration 17)

**Expected Performance:**
- 50 transactions import + categorize: <10 seconds
- 200 transactions (30-day initial import): <60 seconds (Vercel Pro tier required)

### 7. Error Handling: Comprehensive BankScraperError + Categorization Errors

**Recommendations:**
- Catch `BankScraperError` separately (typed errors for user feedback)
- Handle categorization failures gracefully (partial success acceptable)
- Log all errors to SyncLog.errorDetails (debugging)
- Update BankConnection.status based on error type (EXPIRED, ERROR)

**Example:**
```typescript
try {
  const result = await importTransactions(...)
} catch (error) {
  if (error instanceof BankScraperError) {
    // Update connection status, show user-friendly message
  } else if (error.message.includes('categorization')) {
    // Partial success: transactions imported but not categorized
  } else {
    // Unknown error: log, mark as FAILED
  }
}
```

### 8. Testing Strategy: Unit + Integration + E2E

**Recommendations:**

**Unit Tests:**
- `isDuplicate()` function: 20+ test cases (vision requirement)
- `normalizeMerchant()` helper (if needed)
- Edge cases: timezone differences, merchant variations, amount matching

**Integration Tests:**
- Mock `scrapeBank()` responses (use fixtures from Iteration 18)
- Test import service orchestration (scrape → dedupe → insert → categorize)
- Test categorization integration (cache hit/miss scenarios)

**E2E Tests:**
- Full sync flow with real tRPC mutation (use test database)
- Toast notifications appear correctly
- React Query cache invalidation works

### 9. UI Integration Points

**Dashboard:**
- Add "Sync Now" button (calls `bankConnections.sync` mutation)
- Display "Last synced: X minutes ago" (from `BankConnection.lastSynced`)
- Show sync status badges (Active, Syncing, Error)

**Transactions Page:**
- Add filter for `importSource` (show only FIBI, CAL, or MANUAL)
- Display import badges (e.g., "FIBI" badge on imported transactions)
- Show categorization confidence (e.g., star icon for HIGH confidence)

**Settings > Bank Connections:**
- Add "Sync" button per connection
- Display sync history (last 10 SyncLogs)
- Show error messages for failed syncs

### 10. Post-Import Budget Update Strategy: Defer to Iteration 20

**Rationale:**
- Budget updates are handled by existing `budgets.progress` query
- React Query cache invalidation triggers automatic recalculation
- No additional code needed in import pipeline
- Iteration 20 focuses on real-time budget updates and dashboard enhancements

**Implementation (Iteration 19):**
```typescript
// After successful sync, invalidate budget cache
await queryClient.invalidateQueries(['budgets', 'progress'])
```

**Iteration 20 Will Add:**
- Automatic BudgetAlert threshold checks
- Dashboard budget widgets update immediately
- "Budget Impact" preview during sync

## Resource Map

### Critical Files/Directories

**Services (Existing):**
- `/src/server/services/bank-scraper.service.ts` - Transaction scraping (Iteration 18)
- `/src/server/services/categorize.service.ts` - AI categorization (Existing)
- `/src/lib/encryption.ts` - Credential encryption (Iteration 17)

**Services (New - Iteration 19):**
- `/src/server/services/transaction-import.service.ts` - Import orchestration (NEW)
- `/src/server/services/__tests__/transaction-import.service.test.ts` - Tests (NEW)

**Routers (Extend):**
- `/src/server/api/routers/bankConnections.router.ts` - Add `sync` mutation

**Database:**
- `/prisma/schema.prisma` - No changes needed (complete in Iteration 17)

**UI Components (Future - Iteration 20):**
- `/src/components/bank-connections/SyncButton.tsx` - Manual sync trigger
- `/src/components/dashboard/LastSyncedBadge.tsx` - Sync status display

### Key Dependencies

**Existing:**
- `israeli-bank-scrapers` - Bank transaction scraping
- `@anthropic-ai/sdk` - Claude AI categorization
- `prisma` - Database ORM
- `@trpc/server` - API layer
- `date-fns` - Date manipulation

**New (Iteration 19):**
- `string-similarity` - Fuzzy merchant name matching for duplicate detection

### Testing Infrastructure

**Existing:**
- Vitest - Unit testing framework
- Supertest (likely) - API testing
- React Testing Library - Component testing

**Additions:**
- Test fixtures for imported transactions (mock scraper responses)
- Duplicate detection test suite (20+ scenarios)
- E2E test for full sync flow

## Questions for Planner

### Q1: Account Linking Strategy

**Question:** Should BankConnection link to an existing Account, or should we auto-create a new Account per BankConnection?

**Context:**
- BankConnection has `accountType` (CHECKING, CREDIT) but no `accountId` field
- Scraper returns `accountNumber` and `balance` on sync
- Users may already have manually-created Accounts

**Options:**
1. **Auto-create Account on first sync** (recommended)
   - Pros: Simpler UX, no manual linking step
   - Cons: May create duplicate accounts if user already has one
2. **Require user to select existing Account during connection setup**
   - Pros: No duplicates, user control
   - Cons: Extra wizard step, complexity
3. **Add `accountId` field to BankConnection (schema change)**
   - Pros: Explicit linking
   - Cons: Requires migration, breaks Iteration 17 schema

**Recommendation:** Option 1 (auto-create) - simpler MVP, deduplication can be post-MVP feature

### Q2: Sync Date Range for Manual Trigger

**Question:** What date range should manual "Sync Now" use? Last sync date → today, or always last 30 days?

**Options:**
1. **Incremental: lastSuccessfulSync → today** (recommended)
   - Pros: Faster syncs, fewer duplicates to check
   - Cons: If lastSuccessfulSync is null (first sync), need fallback
2. **Fixed: Always last 30 days**
   - Pros: Simple, catches missed transactions
   - Cons: Slower, more duplicate checks
3. **User-configurable: "Sync last X days" dropdown**
   - Pros: Flexibility
   - Cons: UI complexity, decision fatigue

**Recommendation:** Option 1 with fallback - Use `lastSuccessfulSync ?? 30 days ago` for date range

### Q3: Duplicate Transaction Handling in UI

**Question:** Should users see skipped duplicate transactions anywhere?

**Options:**
1. **No visibility (silent skip)** (recommended for MVP)
   - Pros: Simple, clean UX
   - Cons: User may wonder why transaction count differs from bank
2. **Show in SyncLog details (Settings page)**
   - Pros: Transparency for debugging
   - Cons: Extra UI, most users won't care
3. **"Review Skipped Transactions" modal after sync**
   - Pros: Explicit user control
   - Cons: Interrupts flow, annoying for correct skips

**Recommendation:** Option 1 for MVP, Option 2 in Iteration 20 (polish phase)

### Q4: Categorization Confidence Threshold

**Question:** Should we auto-categorize LOW confidence suggestions, or leave them in Miscellaneous for user review?

**Context:**
- Categorization service returns `confidence: 'high' | 'low'`
- 'high' = cache hit or strong Claude API match
- 'low' = uncertain Claude API match

**Options:**
1. **Auto-categorize all (including LOW)** (recommended)
   - Pros: Less manual work for user
   - Cons: May misclassify some transactions
2. **Only auto-categorize HIGH confidence**
   - Pros: Higher accuracy
   - Cons: More transactions left in Miscellaneous (defeats purpose of automation)
3. **Threshold at MEDIUM (if we add MEDIUM confidence level)**
   - Pros: Balance accuracy and automation
   - Cons: Requires categorization service changes

**Recommendation:** Option 1 - Auto-categorize all, users can correct easily (updates cache for future imports)

### Q5: Concurrent Sync Protection

**Question:** How to handle user clicking "Sync Now" while a sync is already in progress?

**Options:**
1. **Disable button during sync (client-side)** (recommended)
   - Pros: Simple, good UX
   - Cons: If page reloads, user loses state
2. **Server-side lock (check for incomplete SyncLog)**
   - Pros: Bulletproof, works across tabs
   - Cons: Complexity, need to handle stale locks
3. **Queue syncs (process sequentially)**
   - Pros: No lost requests
   - Cons: Over-engineering for MVP

**Recommendation:** Option 1 with Option 2 as safety net - Disable button in UI, but also check for incomplete SyncLog on server (return error if found)

### Q6: Error Recovery Strategy

**Question:** If sync fails midway (e.g., after importing 50 of 100 transactions), should we rollback or keep partial import?

**Context:**
- Scraper may return 100 transactions, but categorization service could fail
- Partial imports leave system in inconsistent state (some transactions uncategorized)

**Options:**
1. **Keep partial import (recommended)**
   - Pros: Don't lose successfully imported transactions
   - Cons: User sees uncategorized transactions
   - Mitigation: Mark SyncLog as 'PARTIAL', allow user to retry categorization
2. **Rollback all on any error**
   - Pros: Atomic, clean state
   - Cons: Lose work, annoying if error is transient
3. **Transactional batches (commit every 50 transactions)**
   - Pros: Minimize loss on failure
   - Cons: Complexity

**Recommendation:** Option 1 - Keep partial imports, mark as PARTIAL in SyncLog, provide "Retry Categorization" action in UI (Iteration 20)

---

**Report Completed:** 2025-11-19

**Total Discoveries:** 8 major areas analyzed (Scraper, Categorization, Schema, Patterns, etc.)

**Patterns Identified:** 5 key architectural patterns for import pipeline

**Critical Recommendations:** 10 specific recommendations for planner

**Risk Assessment:** 3 technical risks, 2 complexity risks identified with mitigations

**Questions for Resolution:** 6 strategic questions requiring planner decisions

---

## Appendix: Example Import Flow

**End-to-End Flow for "Sync Now" Button Click:**

1. **User Action:** Clicks "Sync Now" on Dashboard
2. **UI State:** Button disabled, loading spinner, toast: "Syncing..."
3. **tRPC Mutation:** `bankConnections.sync({ bankConnectionId })`
4. **Router Logic:**
   - Verify connection ownership
   - Create SyncLog (status: FAILED)
5. **Import Service:** `importTransactions(connectionId, userId)`
   - **Step 1:** Fetch connection, decrypt credentials
   - **Step 2:** Call `scrapeBank()` → `ImportedTransaction[]`
   - **Step 3:** Load existing transactions (last 30 days)
   - **Step 4:** Run duplicate detection → filter to new transactions
   - **Step 5:** Batch insert transactions (Prisma `createMany`)
   - **Step 6:** Update account balance (atomic)
   - **Step 7:** Call `categorizeImportedTransactions()`
     - Check MerchantCategoryCache (70-80% hit rate)
     - Batch call Claude API for cache misses
     - Update transactions with categoryId + metadata
   - **Step 8:** Return `ImportResult { imported: 47, skipped: 3, categorized: 40 }`
6. **Router Completion:**
   - Update SyncLog (status: SUCCESS, counts)
   - Update BankConnection (lastSynced, status: ACTIVE)
   - Return success result
7. **UI Update:**
   - Toast: "Imported 47 new transactions"
   - Invalidate React Query caches (transactions, budgets)
   - Update "Last synced: just now"
   - Re-enable sync button
8. **Budget Impact (Automatic):**
   - Budgets.progress query refetches (cache invalidated)
   - Dashboard shows updated budget progress bars

**Total Execution Time (Expected):**
- 50 transactions: ~8-10 seconds
- 200 transactions: ~40-60 seconds (Vercel Pro tier required)

