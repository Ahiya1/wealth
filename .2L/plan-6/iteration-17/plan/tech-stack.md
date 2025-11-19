# Technology Stack - Iteration 17

## Core Framework

**Decision:** Next.js 14.2.33 (App Router)

**Rationale:**
- Already in production use across Wealth application
- Server Components provide secure server-side encryption operations
- tRPC integration via API routes established
- Supabase Auth integration proven and working
- Zero changes needed - leveraging existing infrastructure

**Alternatives Considered:**
- Standalone Node.js backend: Rejected - would require separate deployment, break existing patterns
- Next.js Pages Router: Rejected - already migrated to App Router

**Implementation Notes:**
- Server-side encryption happens in API routes (never client-side)
- Settings page uses client components for interactivity
- Bank connection list uses React Server Components for initial load

---

## Database

**Decision:** PostgreSQL via Supabase + Prisma ORM 5.22.0

**Rationale:**
- Existing production database with mature schema
- Prisma provides type-safe database access
- Migration system ensures schema versioning
- Supabase offers real-time capabilities (future use)
- Proven at scale with existing Transaction/Account models

**Schema Strategy:**

### New Models

**BankConnection:**
```prisma
model BankConnection {
  id                    String            @id @default(cuid())
  userId                String
  bank                  BankProvider
  accountType           AccountType       // Reuse existing enum
  encryptedCredentials  String            @db.Text
  accountIdentifier     String            // Last 4 digits
  status                ConnectionStatus
  lastSynced            DateTime?
  lastSuccessfulSync    DateTime?
  errorMessage          String?           @db.Text
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncLogs  SyncLog[]

  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([lastSynced])
}
```

**SyncLog:**
```prisma
model SyncLog {
  id                    String      @id @default(cuid())
  bankConnectionId      String
  startedAt             DateTime
  completedAt           DateTime?
  status                SyncStatus
  transactionsImported  Int         @default(0)
  transactionsSkipped   Int         @default(0)
  errorDetails          String?     @db.Text
  createdAt             DateTime    @default(now())

  bankConnection BankConnection @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)

  @@index([bankConnectionId])
  @@index([createdAt(sort: Desc)])
  @@index([status])
}
```

### Enhanced Transaction Model

**Add these fields (all nullable for backward compatibility):**
```prisma
model Transaction {
  // ... existing fields ...

  // NEW FIELDS for import tracking
  rawMerchantName            String?              // Original from bank (Hebrew)
  importSource               ImportSource?        // MANUAL, FIBI, CAL, PLAID
  importedAt                 DateTime?
  categorizedBy              CategorizationSource?
  categorizationConfidence   ConfidenceLevel?

  @@index([importSource])  // NEW INDEX
}
```

### New Enums

```prisma
enum BankProvider {
  FIBI          // First International Bank of Israel (031)
  VISA_CAL      // Visa CAL credit card
}

enum ConnectionStatus {
  ACTIVE
  ERROR
  EXPIRED
}

enum SyncStatus {
  SUCCESS
  PARTIAL
  FAILED
}

enum ImportSource {
  MANUAL
  FIBI
  CAL
  PLAID  // Existing Plaid integration
}

enum CategorizationSource {
  USER          // Manually categorized
  AI_CACHED     // From MerchantCategoryCache
  AI_SUGGESTED  // From Claude API
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add-bank-connections-foundation
```

---

## Encryption

**Decision:** AES-256-GCM via Node.js Crypto (existing implementation)

**Rationale:**
- Already implemented for Plaid token encryption (`src/lib/encryption.ts`)
- AES-256-GCM is FIPS 140-2 compliant
- Authenticated encryption prevents tampering
- Random IV per encryption ensures unique ciphertext
- Zero dependencies (built-in Node.js module)
- Proven in production with existing Plaid integration

**Implementation Notes:**

### Extend Existing Encryption Module

**File:** `src/lib/encryption.ts`

**Add these functions:**
```typescript
export interface BankCredentials {
  userId: string
  password: string
  otp?: string  // Optional 2FA code
}

export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

export function decryptBankCredentials(encrypted: string): BankCredentials {
  const json = decrypt(encrypted)
  return JSON.parse(json) as BankCredentials
}
```

**Security Properties:**
- Algorithm: `aes-256-gcm`
- Key: 32-byte (256-bit) from `ENCRYPTION_KEY` env var
- IV: 16-byte random (generated per encryption)
- Auth Tag: 16-byte (GCM authentication)
- Format: `${iv}:${authTag}:${encrypted}` (hex-encoded)

**Key Management:**
- Static environment variable (not derived from user session)
- Stored securely in Vercel environment variables
- Never logged or committed to git
- Decryption only happens server-side during sync operations
- Credentials cleared from memory after use

**Why not derive from user session?**
- Background sync requires server-side decryption without user login
- Session tokens expire, making old credentials undecryptable
- Static key is industry standard for server-side encryption at rest
- Simplifies key management (one key per environment)

---

## Authentication

**Decision:** Supabase Auth (existing integration)

**Rationale:**
- Already integrated with tRPC context
- JWT-based authentication proven reliable
- User records synced between Supabase Auth and Prisma
- `protectedProcedure` provides guaranteed user context
- Zero changes needed for this iteration

**Implementation Notes:**

**Authorization Pattern for Bank Connections:**
```typescript
// Always verify ownership before operations
const connection = await ctx.prisma.bankConnection.findUnique({
  where: { id: input.id }
})

if (!connection || connection.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })  // Prevent info leakage
}
```

**User Context Access:**
- `ctx.user.id` - Prisma User ID (guaranteed by protectedProcedure)
- `ctx.supabaseUser` - Supabase Auth user object
- `ctx.prisma` - Prisma client instance

---

## API Layer

**Decision:** tRPC 11.6.0 (existing implementation)

**Rationale:**
- Type-safe end-to-end (no manual type definitions)
- Zod schema validation built-in
- React Query integration automatic
- Consistent with existing 11 routers
- Excellent developer experience

**Implementation Notes:**

### New Router: bankConnections.router.ts

**Location:** `src/server/api/routers/bankConnections.router.ts`

**Structure:**
```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { encryptBankCredentials, decryptBankCredentials } from '@/lib/encryption'

export const bankConnectionsRouter = router({
  list: protectedProcedure.query(/* ... */),
  get: protectedProcedure.input(/* ... */).query(/* ... */),
  add: protectedProcedure.input(/* ... */).mutation(/* ... */),
  update: protectedProcedure.input(/* ... */).mutation(/* ... */),
  delete: protectedProcedure.input(/* ... */).mutation(/* ... */),
})
```

**Error Codes:**
- `NOT_FOUND` - Resource doesn't exist or access denied (prevents info leakage)
- `INTERNAL_SERVER_ERROR` - Unexpected errors (encryption failures, database errors)
- `BAD_REQUEST` - Invalid input (Zod validation failures)

**Registration:**
```typescript
// src/server/api/root.ts
import { bankConnectionsRouter } from './routers/bankConnections.router'

export const appRouter = router({
  // ... existing routers ...
  bankConnections: bankConnectionsRouter,
})
```

---

## Frontend

**Decision:** Next.js App Router + shadcn/ui components

**Rationale:**
- All UI components already installed and styled
- Settings page pattern established
- Consistent design system with warm-gray/sage palette
- Client components for interactivity, RSC for data fetching

**UI Component Library:** shadcn/ui + Radix UI primitives

**Components Used:**
- `Card` / `CardHeader` / `CardContent` - Connection list containers
- `Button` - Add/delete actions
- `Badge` - Status indicators (ACTIVE/ERROR/EXPIRED)
- `Dialog` - Modals (future connection wizard)
- `AlertDialog` - Delete confirmation
- `Input` / `Label` - Form fields (future wizard)
- `toast` - Success/error notifications

**Styling:** TailwindCSS with custom utility classes

**Icons:** Lucide React
- `Landmark` - Bank icon for settings card
- `Plus` - Add connection button
- `Trash2` - Delete action
- `AlertCircle` - Error states

**Implementation Notes:**

### Settings Page Integration

**Update:** `src/app/(dashboard)/settings/page.tsx`

**Add to settingsSections array:**
```typescript
{
  title: 'Bank Connections',
  description: 'Connect Israeli bank accounts for automatic transaction import',
  href: '/settings/bank-connections',
  icon: Landmark,
}
```

**New Page:** `src/app/(dashboard)/settings/bank-connections/page.tsx`

**Structure:**
```tsx
'use client'

export default function BankConnectionsPage() {
  const { data: connections, isLoading } = api.bankConnections.list.useQuery()
  const deleteMutation = api.bankConnections.delete.useMutation({
    onSuccess: () => {
      utils.bankConnections.list.invalidate()
      toast({ title: 'Connection deleted' })
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Bank Connections</h1>
          <p className="text-warm-gray-600 mt-2">
            Connect your Israeli bank accounts for automatic sync
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Bank
        </Button>
      </div>

      {/* Empty state or connection list */}
    </div>
  )
}
```

---

## External Integrations

**None in Iteration 17** - This is a foundation iteration with zero external dependencies.

**Future Iterations:**

### israeli-bank-scrapers (Iteration 18)
**Purpose:** Screen scraping for FIBI and Visa CAL
**Library:** `npm install israeli-bank-scrapers`
**Implementation:** Wrapper service in `src/server/services/israeli-bank.service.ts`

---

## Development Tools

### Testing

**Framework:** Vitest 3.2.4 (already installed)

**Coverage Target:** 80% for new encryption functions, 60% for routers

**Strategy:**
- Unit tests for encryption functions (8+ test cases)
- Integration tests for tRPC endpoints (mock Prisma client)
- No E2E tests needed this iteration (no user flows yet)

**Test Files:**
- `src/lib/__tests__/bank-credentials-encryption.test.ts`
- `src/server/api/routers/__tests__/bankConnections.router.test.ts`

**Run Tests:**
```bash
npm test                # All tests
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
```

### Code Quality

**Linter:** ESLint (existing config)
- No changes needed
- Existing rules enforce ownership checks

**Formatter:** Prettier (existing config)
- No changes needed

**Type Checking:** TypeScript 5.7.2
- Strict mode enabled
- All endpoints fully typed via Prisma + tRPC

### Build & Deploy

**Build Tool:** Next.js built-in (Turbopack)

**Deployment Target:** Vercel

**CI/CD:** None needed this iteration (manual deployment)

**Build Command:**
```bash
npm run build           # Verify TypeScript compilation
npm run db:migrate      # Apply migration to staging
```

---

## Environment Variables

**Required for Iteration 17:**

### ENCRYPTION_KEY
**Purpose:** AES-256-GCM encryption key for bank credentials
**Format:** 64-character hex string (32 bytes)
**Where to get:** Generate via `openssl rand -hex 32`
**Storage:** Vercel environment variables (production + staging)

### DATABASE_URL
**Purpose:** Supabase PostgreSQL connection (pooled)
**Format:** `postgresql://user:pass@host:port/db?pgbouncer=true`
**Where to get:** Supabase project settings
**Storage:** Already configured

### DIRECT_URL
**Purpose:** Direct Postgres connection for migrations
**Format:** `postgresql://user:pass@host:port/db`
**Where to get:** Supabase project settings (Session pooling disabled)
**Storage:** Already configured

### NEXT_PUBLIC_SUPABASE_URL
**Purpose:** Supabase project URL (client-side auth)
**Storage:** Already configured

### NEXT_PUBLIC_SUPABASE_ANON_KEY
**Purpose:** Supabase anonymous key (client-side auth)
**Storage:** Already configured

**Verification:**
```bash
vercel env pull
grep ENCRYPTION_KEY .env.local
# Should output 64-character hex string
```

---

## Dependencies Overview

**No New Dependencies Required**

All necessary packages already installed:

### Runtime Dependencies
- `@prisma/client@5.22.0` - Database ORM with type generation
- `@trpc/server@11.6.0` - Type-safe API framework
- `zod@3.23.8` - Schema validation and type inference
- `@supabase/supabase-js@2.58.0` - Authentication client
- `lucide-react@0.460.0` - Icon library (Landmark icon)

### Development Dependencies
- `prisma@5.22.0` - Migration CLI and schema tools
- `vitest@3.2.4` - Test framework
- `typescript@5.7.2` - Type checker

### Built-in Node.js Modules
- `crypto` - AES-256-GCM encryption (no installation needed)

---

## Performance Targets

**Database Query Performance:**
- All queries with indexes: < 100ms
- BankConnection list (10 items): < 50ms
- Single connection fetch: < 20ms

**API Response Times:**
- List endpoint: < 200ms
- Get endpoint: < 150ms
- Add mutation: < 500ms (includes encryption)
- Delete mutation: < 300ms

**Frontend Load Times:**
- Settings page initial load: < 1s
- Bank connections page: < 800ms
- Empty state render: < 200ms

**Optimization Strategies:**
- Composite indexes on frequently queried fields
- Prisma query result caching (React Query)
- Server Components for static content
- Client Components only for interactive elements

---

## Security Considerations

### Credential Protection

**Never log decrypted credentials:**
```typescript
// WRONG - logs sensitive data
console.log('Credentials:', credentials)

// CORRECT - sanitize logs
console.log('Testing connection for bank:', bank, 'user:', userId.substring(0, 3) + '***')
```

**Clear credentials from memory after use:**
```typescript
// In future sync operations (Iteration 18)
const credentials = decryptBankCredentials(connection.encryptedCredentials)
try {
  await scrapeBank(credentials)
} finally {
  // Clear sensitive data
  Object.keys(credentials).forEach(key => delete credentials[key])
}
```

### Authorization Enforcement

**Always verify ownership:**
```typescript
// MANDATORY pattern for all mutations
const existing = await ctx.prisma.bankConnection.findUnique({
  where: { id: input.id }
})

if (!existing || existing.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}
```

### Cascade Delete Safety

**Verify cascade behavior:**
- Delete user → delete all bank connections → delete all sync logs
- Delete bank connection → delete all sync logs
- Integration test required to verify chain

### Encryption Key Rotation

**Document rotation procedure:**
1. Generate new key: `openssl rand -hex 32`
2. Decrypt all credentials with old key
3. Re-encrypt all credentials with new key
4. Update environment variable
5. Deploy changes
6. Verify decryption works

**Warning:** Never rotate key without re-encrypting existing data.

---

**Tech Stack Status:** APPROVED
**Ready for:** Builder implementation
**Changes from existing stack:** ZERO (pure extension)
**New libraries needed:** NONE
