# Explorer 1 Report: Architecture & Structure for Security Foundation & Database Schema

## Executive Summary

Wealth has a well-established Next.js 14 + tRPC + Prisma architecture with mature patterns for encryption (AES-256-GCM via existing `/lib/encryption.ts`), authenticated API routes (protectedProcedure pattern), and settings page structure. Iteration 17 will extend these existing patterns by adding 2 new Prisma models (BankConnection, SyncLog), 7 new enums, enhancing the Transaction model with 5 import-related fields, and creating a new `bankConnections.router.ts` following the established tRPC conventions. The Settings page already has a modular card-based structure at `/settings/page.tsx` that can accommodate a new "Bank Connections" section. Risk is LOW - no external dependencies in this iteration, purely foundational infrastructure.

## Discoveries

### Existing Encryption Infrastructure

**File:** `/src/lib/encryption.ts`

**Current Implementation:**
- Uses AES-256-GCM (FIPS 140-2 compliant algorithm)
- Static encryption key from `ENCRYPTION_KEY` environment variable (32-byte hex string)
- Encrypts Plaid access tokens (already in production use - see `plaid.router.ts` line 48)
- Format: `iv:authTag:encrypted` (hex-encoded, colon-separated)
- Includes authentication tag for tamper detection

**Key Functions:**
- `encrypt(text: string): string` - Returns `${iv}:${authTag}:${encrypted}`
- `decrypt(encrypted: string): string` - Validates format, verifies auth tag

**Security Features:**
- Random IV generation (16 bytes) per encryption operation
- GCM mode provides authenticated encryption (prevents tampering)
- Validates encrypted string format before decryption
- Throws clear errors for missing keys or invalid format

**CRITICAL FINDING:** Current implementation uses a **static environment variable key**, not derived from Supabase auth session (contrary to master plan line 59). This is actually **better for this use case** because:
1. Bank credentials need to be decrypted server-side during background sync (no user session)
2. Deriving from session token would require user login to sync (not feasible for automated sync)
3. Static key with secure storage (environment variable) is industry standard for server-side encryption at rest

**Recommendation:** Keep existing static key approach. Master plan's session-derived key is impractical for automated sync. Document this architectural decision.

### Existing Prisma Schema Patterns

**File:** `/prisma/schema.prisma`

**Architecture Patterns Identified:**

1. **Enum Definitions** (Lines 14-25, 161-167, 207-220):
   - Defined at top of schema before models
   - PascalCase with SCREAMING_SNAKE_CASE values
   - Example: `AccountType { CHECKING, SAVINGS, CREDIT, INVESTMENT, CASH }`

2. **Model Structure** (Lines 31-69 User model as reference):
   - ID: `@id @default(cuid())` (collision-resistant unique IDs)
   - Timestamps: `createdAt @default(now())`, `updatedAt @updatedAt`
   - Foreign keys: `userId String` + `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
   - Indexes: `@@index([userId])`, `@@index([field1, field2(sort: Desc)])` for common queries
   - Unique constraints: `@@unique([field1, field2, field3])` for composite keys

3. **Encryption Field Patterns** (Lines 145-146):
   - Plaid tokens stored as `@db.Text` (not String - supports longer encrypted strings)
   - Field naming: `plaidAccessToken` (camelCase, suffix indicates encrypted content)

4. **Status/Enum Fields** (Line 139):
   - Boolean flags: `isActive`, `isManual` (default values provided)
   - Enum status: `type AccountType` (strongly typed)

5. **Relationship Patterns** (Lines 152-155):
   - One-to-many: User → Accounts → Transactions (cascade delete propagates)
   - `onDelete: Cascade` used for owned data (transactions belong to account)
   - `onDelete: SetNull` used for optional references

6. **Existing Transaction Model** (Lines 173-201):
   - Already has 12 fields including `plaidTransactionId @unique`
   - Has composite indexes for performance: `@@index([userId, date(sort: Desc)])`
   - Uses `Decimal @db.Decimal(15, 2)` for money (never float!)
   - Has `isManual Boolean @default(true)` pattern we'll extend

**Migration Status:**
- No migrations exist in `/prisma/migrations/` directory (checked via bash)
- This is unusual but means fresh start for migration history
- Likely using `prisma db push` for development (not recommended for production)

**Recommendation:** Create proper migrations with `prisma migrate dev` for iteration 17, establish migration history baseline.

### Existing tRPC Router Architecture

**File:** `/src/server/api/root.ts`

**Current Router Structure:**
```typescript
export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,        // 🔑 Closest pattern to bank connections
  transactions: transactionsRouter,
  recurring: recurringRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
  admin: adminRouter,
  exports: exportsRouter,
})
```

**Router Count:** 11 existing routers (will be 12 after adding `bankConnections`)

**Pattern Analysis from `accounts.router.ts` (Lines 1-177):**

1. **Import Structure:**
   ```typescript
   import { z } from 'zod'
   import { router, protectedProcedure } from '../trpc'
   import { TRPCError } from '@trpc/server'
   import { AccountType } from '@prisma/client'
   ```

2. **Router Export Pattern:**
   ```typescript
   export const accountsRouter = router({ ... })
   ```

3. **Procedure Types:**
   - **Queries** (read operations): `.query(async ({ ctx, input }) => { ... })`
   - **Mutations** (write operations): `.mutation(async ({ ctx, input }) => { ... })`

4. **Input Validation:**
   ```typescript
   .input(z.object({
     id: z.string(),
     name: z.string().min(1, 'Account name is required'),
     balance: z.number().default(0),
   }))
   ```

5. **Authorization Pattern** (Lines 36-38, 82-87):
   ```typescript
   const existing = await ctx.prisma.account.findUnique({ where: { id: input.id } })
   if (!existing || existing.userId !== ctx.user.id) {
     throw new TRPCError({ code: 'NOT_FOUND' })
   }
   ```
   - **CRITICAL:** Always verify `userId` ownership before operations
   - Use `NOT_FOUND` instead of `FORBIDDEN` to prevent information leakage
   - Check ownership BEFORE mutations

6. **Error Handling:**
   - `NOT_FOUND`: Resource doesn't exist or access denied
   - `INTERNAL_SERVER_ERROR`: Unexpected errors (plaid.router.ts lines 24-28)
   - `BAD_REQUEST`: Invalid input (budgets.router.ts line 183)
   - `CONFLICT`: Duplicate/constraint violation (budgets.router.ts line 58)

7. **Context Access:**
   - `ctx.user.id` - Authenticated user (guaranteed by protectedProcedure)
   - `ctx.prisma` - Prisma client instance
   - `ctx.supabaseUser` - Supabase auth user

**Plaid Router Analysis** (`plaid.router.ts` - closest analogue):

Lines 42-86 show credential encryption pattern:
```typescript
const encryptedToken = encrypt(accessToken)  // Line 48
// Store encrypted
plaidAccessToken: encryptedToken            // Line 65
```

Lines 91-117 show sync pattern:
```typescript
syncTransactions: protectedProcedure
  .input(z.object({ accountId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const result = await syncTransactionsFromPlaid(...)
    return { success: true, ...result }
  })
```

**Key Insight:** `plaid.router.ts` handles encrypted credentials + sync operations - **perfect template for bankConnections.router.ts**

### Existing Settings Page Structure

**File:** `/src/app/(dashboard)/settings/page.tsx`

**Current Architecture (Lines 11-33):**

```typescript
const settingsSections = [
  {
    title: 'Categories',
    description: 'Manage income and expense categories',
    href: '/settings/categories',
    icon: Tags,
  },
  {
    title: 'Appearance',
    description: 'Customize theme and visual preferences',
    href: '/settings/appearance',
    icon: Palette,
  },
  {
    title: 'Data & Privacy',
    description: 'Export data and manage privacy settings',
    href: '/settings/data',
    icon: Database,
  },
]
```

**UI Pattern (Lines 52-76):**
- Grid layout: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Card-based navigation with hover effects
- Icon + Title + Description + ChevronRight arrow
- Uses Lucide icons (consistent with codebase)

**Existing Settings Routes:**
- `/settings/categories` - Category management
- `/settings/appearance` - Theme settings
- `/settings/data` - Export & privacy
- `/settings/account` - Account settings (exists but not in menu)

**Breadcrumb Integration:** Uses `<Breadcrumb pathname="/settings" />` (Line 38)

**Recommendation:** Add new section to `settingsSections` array:
```typescript
{
  title: 'Bank Connections',
  description: 'Connect and manage Israeli bank accounts',
  href: '/settings/bank-connections',
  icon: Landmark,  // Lucide icon for banks
}
```

### Existing shadcn/ui Components

**Available Components** (from `/src/components/ui/`):

**Form Components:**
- `input.tsx` - Text inputs with validation styling
- `button.tsx` - Primary/secondary/outline/ghost variants
- `select.tsx` - Dropdown select (Radix UI)
- `label.tsx` - Form labels
- `checkbox.tsx` - Checkbox inputs
- `textarea.tsx` - Multi-line text

**Layout Components:**
- `card.tsx` - Card container with Header/Content/Footer
- `dialog.tsx` - Modal dialogs (already used for wizards)
- `alert-dialog.tsx` - Confirmation dialogs (for delete actions)
- `separator.tsx` - Dividers
- `tabs.tsx` - Tabbed interfaces

**Feedback Components:**
- `toast.tsx` + `use-toast.tsx` - Toast notifications (Sonner)
- `badge.tsx` - Status indicators (perfect for connection status)
- `progress.tsx` - Progress bars
- `skeleton.tsx` - Loading states

**Custom Components:**
- `stat-card.tsx` - Dashboard statistics (could adapt for connection cards)
- `empty-state.tsx` - Empty list placeholder

**CRITICAL FINDING:** All necessary UI components already exist. No new component installations needed.

### Existing Service Layer Patterns

**File:** `/src/server/services/categorize.service.ts`

**Service Architecture Patterns:**

1. **Service File Structure:**
   - Pure functions (no classes)
   - Export named functions (not default exports)
   - Parameter pattern: `(userId, data, prismaClient)`

2. **Prisma Client Injection** (Line 99):
   ```typescript
   async function categorizeTransactions(
     userId: string,
     transactions: TransactionToCategorize[],
     prismaClient: PrismaClient
   ): Promise<CategorizationResult[]>
   ```
   - **Why:** Allows transactions in router, testability

3. **Caching Pattern** (Lines 26-39, 44-67):
   - Check cache before expensive operation (Claude API)
   - `upsert` for atomic cache updates
   - Graceful cache failure (log error, don't throw)

4. **Batch Processing** (Lines 135-147):
   - Process in batches of 50 to optimize API costs
   - Iterate with `for (let i = 0; i < items.length; i += batchSize)`

5. **Error Handling** (Lines 148-164):
   - Try-catch at batch level, not transaction level
   - Fallback to default category on failure
   - Always return results, never throw on partial failure

6. **Type Safety:**
   - Interface for input/output types
   - Explicit return types on all functions

**Plaid Sync Service** (`plaid-sync.service.ts` - will need similar for Israeli banks):
- Decrypts credentials in-memory
- Calls external API (Plaid)
- Maps external data to internal Transaction model
- Returns summary: `{ imported: number, skipped: number, errors: number }`

**Recommendation:** Create `/src/server/services/israeli-bank.service.ts` in Iteration 2 following this pattern.

### Existing Budget System Integration Points

**File:** `/src/server/api/routers/budgets.router.ts`

**Budget Progress Calculation** (Lines 156-234):

**Current Flow:**
1. Query budgets for month (Line 164-172)
2. Calculate date range from month string (Lines 175-187)
3. For each budget, aggregate transactions (Lines 193-201):
   ```typescript
   const spent = await ctx.prisma.transaction.aggregate({
     where: {
       userId: ctx.user.id,
       categoryId: budget.categoryId,
       date: { gte: startDate, lte: endDate },
       amount: { lt: 0 }, // Only expenses (negative amounts)
     },
     _sum: { amount: true },
   })
   ```
4. Calculate percentage, remaining, status (Lines 203-229)

**CRITICAL INSIGHT:** Budget system already includes ALL transactions automatically via `transaction.aggregate()`. Imported transactions will **immediately affect budgets** without code changes.

**Budget Alert System** (Lines 80-87, 285-296):
- Alerts created at 75%, 90%, 100% thresholds
- `sent` boolean flag prevents duplicate alerts
- Cascade delete when budget deleted

**Integration Point for Iteration 4:**
- After transaction import, query budgets for affected categories
- Check if any thresholds newly exceeded
- Create alert records (or use existing alert check logic)
- Invalidate React Query cache for budgets

**Performance Consideration:**
- Current implementation uses `aggregate()` (efficient, Lines 193-201)
- No changes needed for import integration
- Real-time budget updates = zero additional DB queries

## Patterns Identified

### Pattern 1: Encrypted Credentials Storage

**Description:** Server-side encryption at rest using AES-256-GCM with static environment key

**Use Case:** Storing sensitive bank credentials that need server-side decryption for automated sync

**Example:**
```typescript
// Encryption (router layer)
import { encrypt } from '@/lib/encryption'

const encryptedCredentials = encrypt(JSON.stringify({
  userID: input.userID,
  password: input.password,
}))

await ctx.prisma.bankConnection.create({
  data: {
    userId: ctx.user.id,
    encryptedCredentials,  // Store encrypted
  },
})

// Decryption (service layer)
import { decrypt } from '@/lib/encryption'

const connection = await prisma.bankConnection.findUnique({ where: { id } })
const credentials = JSON.parse(decrypt(connection.encryptedCredentials))
// Use credentials.userID, credentials.password for scraping
// Clear from memory after use
```

**Recommendation:** **ADOPT** - Proven pattern already in production for Plaid tokens. Add helper functions:
```typescript
export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

export function decryptBankCredentials(encrypted: string): BankCredentials {
  return JSON.parse(decrypt(encrypted))
}
```

### Pattern 2: Authorization via Ownership Verification

**Description:** Verify resource ownership before operations to prevent unauthorized access

**Use Case:** All tRPC mutations that modify user-specific data

**Example:**
```typescript
// CORRECT (from accounts.router.ts Line 82-87)
const existing = await ctx.prisma.bankConnection.findUnique({
  where: { id: input.id },
})

if (!existing || existing.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })  // Not FORBIDDEN - prevents info leakage
}

// Now safe to update
await ctx.prisma.bankConnection.update({ ... })
```

**Antipattern:**
```typescript
// WRONG - Trusts input without verification
await ctx.prisma.bankConnection.update({
  where: { id: input.id },  // No userId check - SECURITY VULNERABILITY
  data: { ... },
})
```

**Recommendation:** **MANDATORY** - Use this pattern in ALL bankConnections mutations (update, delete, testConnection). Add Zod validation + ownership check to every endpoint.

### Pattern 3: Prisma Model Extension

**Description:** Add fields to existing models while preserving backward compatibility

**Use Case:** Enhancing Transaction model with import metadata without breaking existing features

**Example:**
```prisma
model Transaction {
  // Existing fields (preserve these - Lines 174-187 in schema.prisma)
  id                     String   @id @default(cuid())
  userId                 String
  accountId              String
  date                   DateTime
  amount                 Decimal  @db.Decimal(15, 2)
  payee                  String
  categoryId             String
  notes                  String?  @db.Text
  tags                   String[]
  plaidTransactionId     String?  @unique
  recurringTransactionId String?
  isManual               Boolean  @default(true)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  // NEW FIELDS (add these for iteration 17)
  rawMerchantName            String?  // Original from bank (Hebrew)
  importSource               ImportSource?  // MANUAL, FIBI, CAL
  importedAt                 DateTime?
  categorizedBy              CategorizationSource?  // USER, AI_CACHED, AI_SUGGESTED
  categorizationConfidence   ConfidenceLevel?  // HIGH, MEDIUM, LOW

  // Relationships (preserve existing)
  user                 User                   @relation(...)
  account              Account                @relation(...)
  category             Category               @relation(...)
  recurringTransaction RecurringTransaction? @relation(...)

  // Indexes (preserve existing + add new)
  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
  @@index([plaidTransactionId])
  @@index([recurringTransactionId])
  @@index([userId, date(sort: Desc)])
  @@index([importSource])  // NEW - for filtering by source
}

enum ImportSource {
  MANUAL
  FIBI
  CAL
  PLAID  // Existing Plaid integration
}

enum CategorizationSource {
  USER       // Manually categorized by user
  AI_CACHED  // From MerchantCategoryCache
  AI_SUGGESTED  // From Claude API
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}
```

**Backward Compatibility Strategy:**
- All new fields are **nullable** (optional)
- Existing transactions get `NULL` for new fields (graceful)
- `isManual` defaults to `true` (preserves existing behavior)
- New transactions set `importSource = MANUAL` if `isManual = true`

**Recommendation:** **ADOPT** - Add all 5 fields as nullable. Existing queries unaffected. New queries can filter by `importSource` or `categorizedBy`.

### Pattern 4: Settings Page Card Navigation

**Description:** Grid-based card navigation for settings sections with icons and descriptions

**Use Case:** Adding new settings section without cluttering navigation

**Example:**
```typescript
// Add to settingsSections array in /settings/page.tsx
{
  title: 'Bank Connections',
  description: 'Connect First International Bank and Visa CAL for automatic transaction sync',
  href: '/settings/bank-connections',
  icon: Landmark,  // Import from lucide-react
}
```

**UI Structure:**
```tsx
// New page: /src/app/(dashboard)/settings/bank-connections/page.tsx
'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Landmark, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'

export default function BankConnectionsPage() {
  const { data: connections } = api.bankConnections.list.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Bank Connections</h1>
          <p className="text-warm-gray-600 mt-2">
            Connect your Israeli bank accounts for automatic transaction import
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Bank
        </Button>
      </div>

      <div className="grid gap-4">
        {connections?.map((conn) => (
          <Card key={conn.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">{conn.bank}</h3>
                    <p className="text-sm text-warm-gray-600">
                      ****{conn.accountIdentifier}
                    </p>
                  </div>
                </div>
                <Badge variant={conn.status === 'ACTIVE' ? 'success' : 'destructive'}>
                  {conn.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Recommendation:** **ADOPT** - Create basic scaffold in iteration 17 with list view only. Add wizard in iteration 18.

### Pattern 5: tRPC Router with Service Layer Separation

**Description:** Keep routers thin (validation + authorization), move business logic to services

**Use Case:** Complex operations like transaction sync, credential testing, AI categorization

**Example:**
```typescript
// Router (thin): /src/server/api/routers/bankConnections.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { testBankConnection } from '@/server/services/israeli-bank.service'

export const bankConnectionsRouter = router({
  testConnection: protectedProcedure
    .input(z.object({
      bank: z.enum(['FIBI', 'VISA_CAL']),
      userID: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Delegate to service (business logic)
        const result = await testBankConnection(
          input.bank,
          { userID: input.userID, password: input.password }
        )

        return { success: true, accountIdentifier: result.accountIdentifier }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Connection test failed',
          cause: error,
        })
      }
    }),
})

// Service (thick): /src/server/services/israeli-bank.service.ts
export async function testBankConnection(
  bank: 'FIBI' | 'VISA_CAL',
  credentials: { userID: string; password: string }
): Promise<{ accountIdentifier: string }> {
  // Complex scraping logic here
  // Not in iteration 17 - defer to iteration 18
  throw new Error('Not implemented - iteration 18')
}
```

**Recommendation:** **ADOPT** - Create router with service function stubs in iteration 17. Implement service logic in iteration 18.

## Complexity Assessment

### High Complexity Areas

**None in Iteration 17** - This iteration is purely foundational infrastructure with zero external dependencies.

### Medium Complexity Areas

**Database Schema Design (BankConnection + SyncLog models)**
- **Complexity Drivers:**
  - Must support multiple bank types (FIBI, CAL) with different credential formats
  - Status transitions (ACTIVE → ERROR → EXPIRED) need clear state machine
  - SyncLog must capture partial failures (some transactions imported, some failed)
  - Foreign key relationships + cascade delete behavior must be correct

- **Mitigation Strategy:**
  - Use enums for all status fields (type safety)
  - Add database constraints (`@@unique`, `@index`) for performance
  - Test cascade deletes in isolation before integration
  - Document state transitions in code comments

- **Builder Guidance:**
  - Start with BankConnection model, test CRUD operations
  - Add SyncLog model second (simpler, depends on BankConnection)
  - Use Prisma Studio to verify relationships
  - Run migration on staging DB before production

**Encryption Key Management**
- **Complexity Drivers:**
  - Key must be 32 bytes (64 hex characters) for AES-256
  - Key rotation strategy not defined in vision
  - Decryption happens server-side (no user session context)

- **Mitigation Strategy:**
  - Use existing `ENCRYPTION_KEY` from environment (already in `.env.example`)
  - Document: "Key rotation requires re-encrypting all credentials"
  - Log encryption operations (without exposing keys/credentials)

- **Builder Guidance:**
  - Test encryption roundtrip in unit test first
  - Verify auth tag validation prevents tampering
  - Never log decrypted credentials (add sanitization middleware)

### Low Complexity Areas

**tRPC Router Scaffold (bankConnections.router.ts)**
- Copy existing `accounts.router.ts` structure
- Replace Account with BankConnection
- Add input validation with Zod schemas
- 5 endpoints: `list`, `get`, `create`, `update`, `delete`
- Estimated: 150 lines of code, 2-3 hours

**Settings Page UI Scaffold**
- Add card to existing `/settings/page.tsx` (10 lines)
- Create new page `/settings/bank-connections/page.tsx` (100 lines)
- Display list of connections with status badges
- No wizard in iteration 17 (deferred to iteration 18)
- Estimated: 1-2 hours

**Prisma Migration Execution**
- Run `npx prisma migrate dev --name add-bank-connections`
- Review generated SQL
- Apply to staging Supabase instance
- Verify with `prisma studio`
- Estimated: 30 minutes

## Technology Recommendations

### Primary Stack

**Database ORM: Prisma 5.22.0** (ALREADY INSTALLED)
- **Rationale:** Already in use, migration system mature, TypeScript native
- **Configuration:** PostgreSQL via Supabase (existing `DATABASE_URL`)
- **Migration Strategy:** Use `prisma migrate dev` (not `db push`) for version control

**API Layer: tRPC 11.6.0** (ALREADY INSTALLED)
- **Rationale:** Type-safe end-to-end, excellent DX, existing patterns established
- **Router Pattern:** `protectedProcedure` for all bank connection endpoints
- **Error Handling:** Standard TRPCError codes (NOT_FOUND, INTERNAL_SERVER_ERROR, CONFLICT)

**Encryption: Node.js Crypto (Built-in)** (ALREADY IN USE)
- **Algorithm:** AES-256-GCM (existing `/lib/encryption.ts`)
- **Key Management:** Static environment variable `ENCRYPTION_KEY`
- **Format:** `${iv}:${authTag}:${encrypted}` (hex-encoded)

**UI Framework: Next.js 14 + shadcn/ui** (ALREADY INSTALLED)
- **Components:** Card, Button, Badge, Dialog, AlertDialog (all available)
- **Icons:** Lucide React (add `Landmark` icon for banks)
- **Styling:** TailwindCSS with custom warm-gray/sage palette

### Supporting Libraries

**None Needed for Iteration 17** - All dependencies already installed:
- Zod 3.23.8 - Input validation
- Superjson 2.2.1 - tRPC serialization
- Date-fns 3.6.0 - Date utilities (for SyncLog timestamps)

**Future Iterations:**
- Iteration 18: `israeli-bank-scrapers` (npm package)
- Iteration 19: `string-similarity` (for duplicate detection)

## Integration Points

### External APIs

**None in Iteration 17** - No bank scraping, no external services

**Future (Iteration 18):**
- First International Bank of Israel (FIBI) via `israeli-bank-scrapers`
- Visa CAL credit card via `israeli-bank-scrapers`

### Internal Integrations

**Encryption Service (`/lib/encryption.ts`)**
- **Integration:** Import `encrypt` in bankConnections.router.ts
- **Data Flow:** User input → Zod validation → encrypt() → Prisma create
- **Decryption:** Deferred to iteration 18 (service layer)

**Supabase Auth (via tRPC Context)**
- **Integration:** `protectedProcedure` provides `ctx.user.id`
- **Usage:** All BankConnection records include `userId` foreign key
- **Authorization:** Verify ownership before update/delete operations

**Prisma Client (via tRPC Context)**
- **Integration:** `ctx.prisma.bankConnection.*` CRUD operations
- **Transactions:** Use Prisma transactions for create + audit logging
- **Relations:** BankConnection → SyncLog (one-to-many)

**Settings Page Navigation**
- **Integration:** Add new section to `settingsSections` array
- **Route:** Create `/settings/bank-connections/page.tsx`
- **Breadcrumb:** Automatic via existing Breadcrumb component

## Risks & Challenges

### Technical Risks

**Risk: Prisma Migration Conflicts**
- **Impact:** HIGH - Could block development if migration fails
- **Likelihood:** LOW - Fresh migration history, no conflicts expected
- **Mitigation:**
  1. Run migration on local dev DB first
  2. Review generated SQL manually
  3. Test on staging Supabase before production
  4. Keep rollback migration ready (`prisma migrate rollback`)

**Risk: Encryption Key Loss**
- **Impact:** CRITICAL - All stored credentials become unrecoverable
- **Likelihood:** LOW - Environment variable managed via Vercel
- **Mitigation:**
  1. Document key in secure password manager (1Password/Bitwarden)
  2. Add key to Vercel environment variables with backup
  3. Test key recovery procedure in staging
  4. Never commit key to git (add to .gitignore check)

**Risk: Authorization Bypass**
- **Impact:** CRITICAL - Users could access other users' bank credentials
- **Likelihood:** MEDIUM - Easy to forget ownership check
- **Mitigation:**
  1. Mandatory code review for all bankConnections endpoints
  2. Add integration tests verifying 403/404 for other users' resources
  3. Use consistent pattern: check ownership → then operate
  4. Add TypeScript helper: `verifyOwnership(resource, userId)`

### Complexity Risks

**Risk: Schema Design Errors**
- **Impact:** MEDIUM - Could require complex migration to fix
- **Likelihood:** MEDIUM - First iteration, no real-world testing yet
- **Mitigation:**
  1. Review schema with 2+ developers before migration
  2. Compare with Plaid integration patterns (similar domain)
  3. Test all CRUD operations with mock data
  4. Validate cascade deletes work correctly (delete user → delete connections)

**Risk: Settings Page Route Conflicts**
- **Impact:** LOW - 404 errors or navigation issues
- **Likelihood:** LOW - Route structure is straightforward
- **Mitigation:**
  1. Follow existing `/settings/*` pattern exactly
  2. Test navigation from main settings page
  3. Verify breadcrumb rendering
  4. Check mobile responsive layout

## Recommendations for Planner

### 1. Use Existing Encryption Pattern, Don't Derive from Session

**Rationale:** Master plan specifies "derive key from Supabase auth session" (line 59), but this is **impractical** because:
- Background sync (iteration 20) needs server-side decryption without user login
- Session tokens expire, making old credentials undecryptable
- Static environment key is industry standard for server-side encryption at rest

**Recommendation:** Document architectural decision to use static `ENCRYPTION_KEY`, update master plan.

### 2. Establish Prisma Migration History in Iteration 17

**Rationale:** No migrations exist in `/prisma/migrations/` directory (likely using `db push`). Production requires proper migration versioning.

**Recommendation:** First task in iteration 17 is `npx prisma migrate dev --name baseline` to establish history, then `--name add-bank-connections` for schema changes.

### 3. Create Service Layer Stubs for Israeli Bank Scraping

**Rationale:** Iteration 17 has NO external dependencies (low risk), but iteration 18 needs `israeli-bank-scrapers`. Creating service stubs now enables parallel UI development.

**Recommendation:** Add `/src/server/services/israeli-bank.service.ts` with:
```typescript
export async function testBankConnection(...): Promise<...> {
  throw new Error('Not implemented - iteration 18')
}
```
This allows UI to call endpoints (will fail gracefully), unblocking iteration 18 integration.

### 4. Add Bank Connections to Settings Navigation Immediately

**Rationale:** Settings page has clean card-based structure. Adding section now provides:
- User feedback (feature is being built)
- UI testing environment (see empty state, loading states)
- Parallel frontend/backend development

**Recommendation:** Add card to settings page in first 30 minutes, creates `/settings/bank-connections` route with "Coming soon" message.

### 5. Test Cascade Deletes Before Production

**Rationale:** BankConnection → SyncLog relationship uses `onDelete: Cascade`. User deletion should cascade to connections → sync logs.

**Recommendation:** Integration test:
1. Create user → bank connection → sync log
2. Delete bank connection → verify sync log deleted
3. Delete user → verify bank connection + sync logs deleted
4. Verify no orphaned records in database

### 6. Document Encryption Key Backup Procedure

**Rationale:** Losing `ENCRYPTION_KEY` = all credentials permanently lost.

**Recommendation:** Create `/docs/ENCRYPTION_KEY_BACKUP.md` with:
- Where key is stored (Vercel env vars)
- Backup location (team password manager)
- Recovery procedure (restore from backup)
- Rotation procedure (re-encrypt all credentials)

## Resource Map

### Critical Files/Directories

**Existing Files to Extend:**
- `/prisma/schema.prisma` - Add BankConnection, SyncLog models + 7 enums
- `/src/lib/encryption.ts` - NO CHANGES (already supports our use case)
- `/src/server/api/root.ts` - Import and register bankConnectionsRouter
- `/src/app/(dashboard)/settings/page.tsx` - Add Bank Connections card

**New Files to Create:**
- `/src/server/api/routers/bankConnections.router.ts` - 5 endpoints (list, get, create, update, delete)
- `/src/app/(dashboard)/settings/bank-connections/page.tsx` - Bank connections list UI
- `/src/server/services/israeli-bank.service.ts` - Service layer stubs (iteration 18 implementation)
- `/prisma/migrations/YYYYMMDDHHMMSS_add_bank_connections/migration.sql` - Auto-generated by Prisma

**Configuration Files:**
- `/.env.example` - Already has `ENCRYPTION_KEY` (no changes)
- `/package.json` - NO CHANGES (all dependencies exist)

### Key Dependencies

**Runtime Dependencies (Already Installed):**
- `@prisma/client@5.22.0` - Database ORM
- `@trpc/server@11.6.0` - API framework
- `zod@3.23.8` - Input validation
- `lucide-react@0.460.0` - Icons (add Landmark icon usage)

**Development Dependencies (Already Installed):**
- `prisma@5.22.0` - Migration CLI
- `typescript@5.7.2` - Type checking

**Environment Variables (Already Configured):**
- `DATABASE_URL` - Supabase PostgreSQL connection
- `DIRECT_URL` - Supabase direct connection (for migrations)
- `ENCRYPTION_KEY` - 64-character hex string (32 bytes)

### Testing Infrastructure

**Unit Tests:**
- Encryption roundtrip test (`encrypt(decrypt(text)) === text`)
- Zod schema validation (invalid input throws)
- Authorization check (other user's resource → NOT_FOUND)

**Integration Tests:**
- Prisma CRUD operations (create → read → update → delete)
- Cascade delete verification (delete connection → sync logs deleted)
- tRPC endpoint calls (via `@trpc/server/test-adapter`)

**Manual Testing Checklist:**
- [ ] Run migration on local DB (no errors)
- [ ] Verify schema in Prisma Studio (relationships correct)
- [ ] Test encryption/decryption with real credentials (mock data)
- [ ] Create bank connection via tRPC (returns expected structure)
- [ ] List connections (only shows current user's)
- [ ] Update connection (ownership verified)
- [ ] Delete connection (cascade to sync logs works)
- [ ] Settings page renders bank connections card
- [ ] Navigate to `/settings/bank-connections` (page loads)
- [ ] Empty state displays correctly (no connections yet)

## Questions for Planner

### Q1: Should we create placeholder SyncLog records for manual operations?

**Context:** SyncLog is designed for tracking israeli-bank-scrapers sync operations (iteration 18+). But should we log manual bank connection creates/deletes?

**Options:**
- A) No SyncLog until iteration 18 (only for actual scraping)
- B) Create SyncLog for all bankConnection operations (audit trail)

**Recommendation:** Option A - SyncLog is specifically for transaction import sync. Manual operations logged via Prisma `createdAt`/`updatedAt`.

### Q2: Should BankConnection.status default to ACTIVE or require activation?

**Context:** When user creates connection, should it start ACTIVE (ready to sync) or require explicit activation?

**Options:**
- A) Default ACTIVE - connection works immediately after creation
- B) Default PENDING - requires testConnection success to activate
- C) No default - explicitly set in create mutation

**Recommendation:** Option C - Set explicitly in router based on testConnection result (iteration 18). For iteration 17, manually set to ACTIVE for testing.

### Q3: How to handle multiple accounts at same bank (e.g., 2 FIBI checking accounts)?

**Context:** User might have multiple checking accounts at First International Bank. Current schema has no unique constraint preventing duplicates.

**Options:**
- A) Allow duplicates - each connection is independent
- B) Add unique constraint on (userId, bank, accountIdentifier)
- C) Allow duplicates but warn user in UI

**Recommendation:** Option A for iteration 17 (no constraint). Iteration 18 can use `accountIdentifier` (last 4 digits) to differentiate.

### Q4: Should we encrypt the entire BankConnection record or just credentials?

**Context:** Currently planning to encrypt only `encryptedCredentials` field. But `accountIdentifier` (last 4 digits) could also be sensitive.

**Options:**
- A) Encrypt only credentials (sensitive data)
- B) Encrypt credentials + accountIdentifier
- C) Encrypt entire record (overkill)

**Recommendation:** Option A - Last 4 digits are displayed on bank statements (public). Only credentials need encryption. Simpler queries.

### Q5: What's the expected volume of SyncLog records per user?

**Context:** If user syncs daily for 1 year = 365 SyncLog records. Should we implement retention policy?

**Options:**
- A) Keep all SyncLog records forever (unlimited history)
- B) Retention policy: delete logs older than 90 days
- C) Keep last N logs per connection (e.g., 50)

**Recommendation:** Option A for MVP (iteration 17-20). Add retention policy in post-MVP if database grows too large. Monitor Supabase storage usage.

---

**Report Status:** COMPLETE
**Ready for:** Builder handoff (Iteration 17 execution)
**Risk Level:** LOW (foundational infrastructure, no external dependencies)
**Estimated Effort:** 6-8 hours (as per master plan)

---

**Next Steps:**
1. Planner reviews report + answers open questions
2. Builder receives: this report + master plan iteration 1 scope
3. Builder executes: schema → migration → router → UI scaffold
4. Builder delivers: working CRUD endpoints + settings page
5. QA verifies: all success criteria met (master plan lines 87-95)
