# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 17 focuses on Security Foundation & Database Schema for Israeli bank integration. The existing codebase provides robust patterns: AES-256-GCM encryption (proven with Plaid tokens), Prisma schema with comprehensive indexes, tRPC+Zod API layer with Supabase auth integration, and shadcn/ui component library. Key finding: encryption infrastructure is battle-tested, database patterns are mature, and the stack is optimized for this security-first iteration.

## Discoveries

### Existing Encryption Infrastructure (READY TO EXTEND)

**Pattern Found:**
- `/src/lib/encryption.ts` already implements AES-256-GCM encryption
- Used for Plaid access tokens (`plaidAccessToken` in Account model)
- Environment-based key management via `ENCRYPTION_KEY` env var
- IV:authTag:encrypted format for authenticated encryption
- Comprehensive test suite with 10+ test cases

**Current Implementation:**
```typescript
// ALGORITHM: 'aes-256-gcm'
// Format: iv:authTag:encrypted (hex-encoded)
export function encrypt(text: string): string
export function decrypt(encrypted: string): string
```

**Test Coverage:**
- Round-trip encryption/decryption
- Unicode/special character handling
- Invalid format rejection
- Missing key error handling
- Random IV generation (different ciphertext for same plaintext)

**Recommendation for Iteration 17:**
- EXTEND existing `/lib/encryption.ts` with bank-specific functions
- Add `encryptBankCredentials(credentials: BankCredentials): string`
- Add `decryptBankCredentials(encrypted: string): BankCredentials`
- Keep same AES-256-GCM algorithm and env key pattern
- Add new tests for JSON credential encryption

### Prisma Schema Patterns (PROVEN AT SCALE)

**Model Structure Pattern:**
```prisma
model Account {
  id               String      @id @default(cuid())
  userId           String
  plaidAccessToken String?     @db.Text
  lastSynced       DateTime?
  isActive         Boolean     @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([plaidAccountId])
}
```

**Key Patterns Identified:**
1. **CUID IDs:** All models use `@default(cuid())` for distributed ID generation
2. **Soft Deletes:** `isActive` boolean pattern (Account, Category models)
3. **Cascade Deletes:** Consistent `onDelete: Cascade` for user data
4. **Timestamp Tracking:** `createdAt`, `updatedAt`, `lastSynced` pattern
5. **Composite Indexes:** Performance-optimized (e.g., `@@index([userId, date(sort: Desc)])`)
6. **JSON Storage:** Plaid metadata uses JSON type for flexibility
7. **Text Storage:** Encrypted tokens use `@db.Text` for unlimited length

**Existing Enums:**
```prisma
enum AccountType {
  CHECKING | SAVINGS | CREDIT | INVESTMENT | CASH
}
```

**Recommendation for BankConnection Model:**
```prisma
model BankConnection {
  id                    String            @id @default(cuid())
  userId                String
  bank                  BankProvider      // NEW ENUM
  accountType           AccountType       // REUSE EXISTING (CHECKING, CREDIT)
  encryptedCredentials  String            @db.Text
  accountIdentifier     String            // Last 4 digits
  status                ConnectionStatus  // NEW ENUM
  lastSynced            DateTime?
  lastSuccessfulSync    DateTime?
  errorMessage          String?           @db.Text
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncLogs  SyncLog[]
  
  @@index([userId])
  @@index([status])
  @@index([lastSynced])
}

enum BankProvider {
  FIBI          // First International Bank of Israel
  VISA_CAL      // Visa CAL credit card
}

enum ConnectionStatus {
  ACTIVE
  ERROR
  EXPIRED
}
```

### tRPC Router Patterns (TYPE-SAFE API LAYER)

**Standard Router Structure:**
```typescript
// src/server/api/routers/budgets.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const budgetsRouter = router({
  create: protectedProcedure
    .input(z.object({
      categoryId: z.string().min(1),
      amount: z.number().positive()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Create resource
      // Return result
    }),
    
  list: protectedProcedure
    .input(z.object({ /* filters */ }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.model.findMany({ where: { userId: ctx.user.id } })
    })
})
```

**Auth Pattern (Supabase Integration):**
```typescript
// src/server/api/trpc.ts
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }
  return next({
    ctx: {
      user: ctx.user,           // Prisma User (non-null guaranteed)
      supabaseUser: ctx.supabaseUser!,
      prisma: ctx.prisma
    }
  })
})
```

**Ownership Validation Pattern:**
```typescript
// Verify resource belongs to user before mutation
const existing = await ctx.prisma.budget.findUnique({ where: { id: input.id } })
if (!existing || existing.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}
```

**Recommendation for bankConnections.router.ts:**
```typescript
export const bankConnectionsRouter = router({
  // Query: List user's bank connections
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.bankConnection.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' }
      })
    }),
  
  // Mutation: Add new connection (encrypt credentials)
  add: protectedProcedure
    .input(z.object({
      bank: z.enum(['FIBI', 'VISA_CAL']),
      accountType: z.enum(['CHECKING', 'CREDIT']),
      credentials: z.object({
        userId: z.string(),
        password: z.string(),
        otp: z.string().optional()
      }),
      accountIdentifier: z.string().length(4)
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Encrypt credentials
      const encrypted = encryptBankCredentials(input.credentials)
      
      // 2. Create BankConnection record
      const connection = await ctx.prisma.bankConnection.create({
        data: {
          userId: ctx.user.id,
          bank: input.bank,
          accountType: input.accountType,
          encryptedCredentials: encrypted,
          accountIdentifier: input.accountIdentifier,
          status: 'ACTIVE'
        }
      })
      
      return connection
    }),
  
  // Mutation: Test connection (decrypt + validate, no import)
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ownership check
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id }
      })
      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      // Decrypt credentials (in-memory only)
      const credentials = decryptBankCredentials(connection.encryptedCredentials)
      
      // Test connection (stub for Iteration 17 - no actual scraping)
      // Real implementation in Iteration 18
      return { success: true, message: 'Connection validated' }
    }),
  
  // Mutation: Delete connection (cascade to SyncLogs)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ownership check + delete
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id }
      })
      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      await ctx.prisma.bankConnection.delete({ where: { id: input.id } })
      return { success: true }
    })
})
```

### Zod Schema Validation Patterns

**Transaction Creation Pattern:**
```typescript
.input(
  z.object({
    accountId: z.string().min(1, 'Account is required'),
    date: z.date(),
    amount: z.number(),
    payee: z.string().min(1, 'Payee is required'),
    categoryId: z.string().min(1, 'Category is required'),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
)
```

**Recommendation for BankCredentials Schema:**
```typescript
// src/server/schemas/bank-credentials.schema.ts
import { z } from 'zod'

export const BankCredentialsSchema = z.object({
  userId: z.string().min(1, 'User ID required'),
  password: z.string().min(1, 'Password required'),
  otp: z.string().optional()
})

export type BankCredentials = z.infer<typeof BankCredentialsSchema>

// For encrypted storage format
export const EncryptedBankConnectionSchema = z.object({
  bank: z.enum(['FIBI', 'VISA_CAL']),
  accountType: z.enum(['CHECKING', 'CREDIT']),
  credentials: BankCredentialsSchema,
  accountIdentifier: z.string().length(4, 'Must be last 4 digits')
})
```

### React Query Cache Invalidation Patterns

**Budget Update Pattern:**
```typescript
// After creating budget
const createBudget = trpc.budgets.create.useMutation({
  onSuccess: () => {
    // Invalidate related queries
    utils.budgets.listByMonth.invalidate()
    utils.budgets.summary.invalidate()
    utils.budgets.progress.invalidate()
  }
})
```

**Transaction Update Pattern:**
```typescript
// After creating/updating transaction
const updateTransaction = trpc.transactions.update.useMutation({
  onSuccess: () => {
    utils.transactions.list.invalidate()
    utils.budgets.progress.invalidate()  // Budget depends on transactions
  }
})
```

**Recommendation for Bank Connection Mutations:**
```typescript
const addConnection = trpc.bankConnections.add.useMutation({
  onSuccess: () => {
    utils.bankConnections.list.invalidate()
    toast({ title: 'Bank connected successfully' })
  },
  onError: (error) => {
    toast({ 
      title: 'Connection failed', 
      description: error.message,
      variant: 'destructive'
    })
  }
})
```

### Supabase Auth Integration Pattern

**Server-Side Auth (tRPC Context):**
```typescript
// src/server/api/trpc.ts
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  // Auto-create Prisma user if doesn't exist
  let user = null
  if (supabaseUser) {
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id }
    })
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata.name || null
        }
      })
    }
  }
  
  return { supabase, supabaseUser, user, prisma }
}
```

**Key Insight:**
- Supabase handles authentication (JWT tokens)
- Prisma stores application data (linked via `supabaseAuthId`)
- tRPC context provides both `supabaseUser` (auth) and `user` (Prisma)

**Recommendation for Encryption Key Derivation:**
- CURRENT: Uses static `ENCRYPTION_KEY` env var (32-byte hex)
- ITERATION 17: Keep env var approach for simplicity
- FUTURE (Post-MVP): Consider deriving per-user keys from Supabase session tokens

### shadcn/ui Component Patterns

**Core Components Used:**
- `Card` - Container with shadow-soft, rounded-lg borders
- `Button` - Variants: default, outline, ghost, destructive
- `Dialog` - Modal dialogs for forms
- `Badge` - Status indicators (success, warning, error)
- `Input` - Form inputs with label integration
- `Select` - Dropdowns with Radix UI
- `Tabs` - Navigation within pages
- `Toast` - Notifications via Sonner

**Button with Loading State:**
```tsx
<Button loading={mutation.isPending} disabled={mutation.isPending}>
  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Changes
</Button>
```

**Form Pattern (React Hook Form + Zod):**
```tsx
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema)
})

<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register('name')} />
  {form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}
</form>
```

**Recommendation for Bank Connection UI:**
```tsx
// Settings → Bank Connections Page
<Card>
  <CardHeader>
    <CardTitle>Connected Accounts</CardTitle>
    <CardDescription>
      Manage your Israeli bank and credit card connections
    </CardDescription>
  </CardHeader>
  <CardContent>
    {connections.map(conn => (
      <div key={conn.id} className="flex items-center justify-between">
        <div>
          <p className="font-medium">{conn.bank} - {conn.accountType}</p>
          <p className="text-sm text-muted-foreground">
            Account ending in {conn.accountIdentifier}
          </p>
        </div>
        <Badge variant={conn.status === 'ACTIVE' ? 'success' : 'destructive'}>
          {conn.status}
        </Badge>
        <Button variant="ghost" size="icon" onClick={() => deleteConnection(conn.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </CardContent>
</Card>
```

### AI Categorization Service Pattern (FOR ITERATION 19)

**Current Implementation:**
```typescript
// src/server/services/categorize.service.ts
export async function categorizeTransactions(
  userId: string,
  transactions: TransactionToCategorize[],
  prismaClient: PrismaClient
): Promise<CategorizationResult[]>
```

**Cache-First Strategy:**
1. Check `MerchantCategoryCache` for each transaction (instant lookup)
2. Batch uncached transactions (max 50 per API call)
3. Call Claude API with category list + transaction list
4. Parse JSON response and map back to transactions
5. Cache successful categorizations for future imports
6. Return results with confidence levels (high/low)

**Performance Stats:**
- Cache hit rate: ~70-80% on second sync (per vision.md)
- Batch size: 50 transactions per Claude API call
- Model: `claude-3-5-sonnet-20241022` with `temperature: 0.2`

**Integration Point for Iteration 19:**
```typescript
// After importing transactions from israeli-bank-scrapers
const importedTransactions = await fetchFIBITransactions(...)
const uncategorized = importedTransactions.map(t => ({
  id: t.id,
  payee: t.rawMerchantName,  // Use raw merchant name from bank
  amount: t.amount
}))

const results = await categorizeTransactions(userId, uncategorized, prisma)

// Update transactions with categoryId
for (const result of results) {
  if (result.categoryId) {
    await prisma.transaction.update({
      where: { id: result.transactionId },
      data: { 
        categoryId: result.categoryId,
        categorizedBy: result.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED',
        categorizationConfidence: result.confidence === 'high' ? 'HIGH' : 'MEDIUM'
      }
    })
  }
}
```

## Patterns Identified

### Pattern 1: Environment-Based Encryption

**Description:** AES-256-GCM encryption using environment variable for key storage

**Use Case:** Encrypting sensitive data at rest (Plaid tokens, bank credentials)

**Example:**
```typescript
// .env
ENCRYPTION_KEY=32-byte-hex-string

// lib/encryption.ts
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}
```

**Recommendation:** REUSE this pattern for bank credentials. Add type-safe wrapper:

```typescript
// lib/encryption.ts (extend existing)
export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

export function decryptBankCredentials(encrypted: string): BankCredentials {
  const json = decrypt(encrypted)
  return JSON.parse(json) as BankCredentials
}
```

### Pattern 2: Prisma Transaction (Atomic Operations)

**Description:** Database transactions for operations affecting multiple tables

**Use Case:** Ensuring data consistency (e.g., create transaction + update account balance)

**Example:**
```typescript
// src/server/api/routers/transactions.router.ts
const transaction = await ctx.prisma.$transaction(async (prisma) => {
  // Create transaction record
  const newTransaction = await prisma.transaction.create({ data: {...} })
  
  // Update account balance atomically
  await prisma.account.update({
    where: { id: input.accountId },
    data: { balance: { increment: input.amount } }
  })
  
  return newTransaction
})
```

**Recommendation:** Use for bank connection creation + initial test:

```typescript
const connection = await ctx.prisma.$transaction(async (prisma) => {
  // 1. Create BankConnection
  const conn = await prisma.bankConnection.create({ data: {...} })
  
  // 2. Create initial SyncLog entry
  await prisma.syncLog.create({
    data: {
      bankConnectionId: conn.id,
      status: 'SUCCESS',
      startedAt: new Date(),
      completedAt: new Date(),
      transactionsImported: 0,
      transactionsSkipped: 0
    }
  })
  
  return conn
})
```

### Pattern 3: Cascade Delete with Audit Trail

**Description:** Automatic deletion of related records with logging

**Use Case:** User deletes account → all transactions deleted

**Example:**
```prisma
model User {
  id           String        @id @default(cuid())
  transactions Transaction[]
}

model Transaction {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Recommendation:** Apply to BankConnection → SyncLog relationship:

```prisma
model BankConnection {
  id       String    @id @default(cuid())
  syncLogs SyncLog[]
}

model SyncLog {
  bankConnectionId String
  bankConnection   BankConnection @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)
}
```

### Pattern 4: Status-Based Query Optimization

**Description:** Index on status enum for fast filtering

**Use Case:** Find all ACTIVE connections, all ERROR connections

**Example:**
```prisma
model Account {
  isActive Boolean @default(true)
  
  @@index([userId])
  @@index([isActive])  // Fast query: WHERE isActive = true
}
```

**Recommendation:** Add status index to BankConnection:

```prisma
model BankConnection {
  status ConnectionStatus
  
  @@index([userId])
  @@index([status])           // Fast: WHERE status = 'ERROR'
  @@index([userId, status])   // Fast: WHERE userId = X AND status = 'ACTIVE'
}
```

### Pattern 5: Soft Pagination with Cursor

**Description:** Cursor-based pagination for large datasets

**Use Case:** Transaction list pagination

**Example:**
```typescript
.query(async ({ ctx, input }) => {
  const transactions = await ctx.prisma.transaction.findMany({
    take: input.limit + 1,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : 0
  })
  
  let nextCursor: string | undefined
  if (transactions.length > input.limit) {
    const nextItem = transactions.pop()
    nextCursor = nextItem!.id
  }
  
  return { transactions, nextCursor }
})
```

**Recommendation:** Apply to SyncLog history (will need in Iteration 18):

```typescript
syncHistory: protectedProcedure
  .input(z.object({
    bankConnectionId: z.string(),
    limit: z.number().default(10)
  }))
  .query(async ({ ctx, input }) => {
    const logs = await ctx.prisma.syncLog.findMany({
      where: { 
        bankConnectionId: input.bankConnectionId,
        bankConnection: { userId: ctx.user.id }  // Ownership check
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit
    })
    return logs
  })
```

## Complexity Assessment

### High Complexity Areas

**N/A for Iteration 17** - This iteration is LOW RISK, zero external dependencies, pure foundation work.

### Medium Complexity Areas

**Database Migration Testing**
- Complexity: Adding 2 new models + 7 new enums + enhancing Transaction model
- Risk: Migration rollback if schema conflicts arise
- Mitigation: Test migration on local Supabase first, backup production before applying
- Estimated Time: 1-2 hours (write migration, test locally, apply to staging)

**Encryption Key Management**
- Complexity: Ensuring `ENCRYPTION_KEY` env var is set in all environments (dev, staging, prod)
- Risk: Missing key breaks decryption for existing Plaid tokens
- Mitigation: Verify key exists in Vercel env vars before deploying
- Estimated Time: 30 minutes (verify env vars, document key rotation process)

### Low Complexity Areas

**tRPC Router Creation**
- Pattern is well-established (budgets.router.ts, transactions.router.ts)
- Straightforward CRUD operations with ownership checks
- Estimated Time: 2-3 hours

**UI Scaffold (Settings Page)**
- shadcn/ui components are ready to use
- Simple list view + delete confirmation modal
- No complex forms yet (wizard deferred to Iteration 18)
- Estimated Time: 1-2 hours

## Technology Recommendations

### Primary Stack (ALREADY IN PLACE)

**Framework: Next.js 14 (App Router)**
- Rationale: Already in use, Server Components for auth, API routes for tRPC
- Version: 14.2.33
- No changes needed

**Database: PostgreSQL (via Supabase)**
- Rationale: Already in use, RLS support, real-time capabilities (future)
- Prisma ORM version: 5.22.0
- No changes needed

**Auth: Supabase Auth**
- Rationale: Already integrated with tRPC context, JWT-based, magic links + OAuth
- Version: @supabase/supabase-js 2.58.0
- No changes needed

**API Layer: tRPC 11.6.0**
- Rationale: Type-safe APIs, React Query integration, auto-generated client hooks
- Works seamlessly with Zod schemas
- No changes needed

**Encryption: Node.js Crypto (AES-256-GCM)**
- Rationale: Already implemented for Plaid tokens, zero dependencies, FIPS 140-2 compliant
- Extend existing `/lib/encryption.ts`
- No new libraries needed

### Supporting Libraries (ALREADY INSTALLED)

**Validation: Zod 3.23.8**
- Purpose: Schema validation for tRPC inputs, type inference
- Already used throughout codebase

**UI Components: shadcn/ui + Radix UI**
- Purpose: Accessible, composable components (Card, Button, Dialog, Badge)
- Already installed with 20+ components

**Date Handling: date-fns 3.6.0**
- Purpose: Date formatting, month calculations (budgets)
- Already used in budget routers

**State Management: @tanstack/react-query 5.80.3**
- Purpose: Server state management, cache invalidation, optimistic updates
- Already integrated via tRPC

**Testing: Vitest 3.2.4**
- Purpose: Unit tests, component tests
- Already configured with existing encryption tests

## Integration Points

### Database → Encryption Layer

**Integration:** Prisma models store encrypted credentials as strings

**Flow:**
1. User submits bank credentials via tRPC mutation
2. Server-side: `encryptBankCredentials(credentials)` → encrypted string
3. Prisma: Store encrypted string in `encryptedCredentials` column
4. On retrieval: `decryptBankCredentials(encryptedString)` → plain credentials (in-memory only)

**Security Consideration:**
- Decrypted credentials NEVER logged or stored
- Decryption only happens in sync operations (Iteration 18+)
- Clear credentials from memory after use

### tRPC → Prisma

**Integration:** tRPC routers use Prisma client from context

**Pattern:**
```typescript
export const bankConnectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.bankConnection.findMany({
      where: { userId: ctx.user.id }
    })
  })
})
```

**Type Safety:**
- Prisma generates types from schema
- tRPC infers return types from Prisma queries
- Client-side hooks are fully typed

### React Query → tRPC

**Integration:** tRPC React hooks auto-generate React Query wrappers

**Pattern:**
```typescript
// Client component
const { data: connections, isLoading } = trpc.bankConnections.list.useQuery()

const deleteMutation = trpc.bankConnections.delete.useMutation({
  onSuccess: () => {
    utils.bankConnections.list.invalidate()
  }
})
```

**Cache Invalidation:**
- Mutations invalidate related queries
- Optimistic updates for instant UI feedback
- Background refetch for consistency

### Supabase Auth → Prisma User

**Integration:** tRPC context syncs Supabase user to Prisma

**Flow:**
1. User authenticates with Supabase (email/password, magic link)
2. tRPC context fetches Supabase user from JWT
3. Context finds or creates Prisma `User` record linked via `supabaseAuthId`
4. Protected procedures access `ctx.user` (Prisma User) for database operations

**Why Both?**
- Supabase: Authentication, session management, token refresh
- Prisma: Application data, relationships, business logic

## Risks & Challenges

### Technical Risks

**Risk: Encryption Key Rotation**
- Impact: If `ENCRYPTION_KEY` is rotated, existing encrypted data becomes unreadable
- Mitigation: 
  - Document key rotation process in README
  - Never rotate key without decrypting + re-encrypting all credentials
  - Store key securely in Vercel env vars (not in git)
- Likelihood: LOW (key should remain static for lifetime of deployment)

**Risk: Database Migration Rollback**
- Impact: If migration fails, production data could be in inconsistent state
- Mitigation:
  - Test migration on local Supabase first (`npm run db:migrate`)
  - Apply to staging environment before production
  - Backup production database before migration
  - Use Prisma's migration rollback commands if needed
- Likelihood: LOW (migration is additive, no destructive changes)

**Risk: Missing Indexes**
- Impact: Slow queries when filtering by userId, status, or lastSynced
- Mitigation:
  - Add all recommended indexes in initial migration
  - Run `EXPLAIN ANALYZE` on production queries to verify index usage
  - Monitor query performance with Prisma metrics
- Likelihood: VERY LOW (existing codebase has excellent indexing patterns)

### Complexity Risks

**Risk: Over-Engineering Encryption**
- Impact: Unnecessary complexity if trying to derive per-user keys in Iteration 17
- Mitigation: Use simple env-based key for MVP, defer per-user keys to post-MVP
- Likelihood: LOW (builder should follow existing pattern)

**Risk: Scope Creep (Adding Scraper Logic)**
- Impact: Iteration 17 should NOT touch israeli-bank-scrapers (that's Iteration 18)
- Mitigation: 
  - Explicitly document out-of-scope items in iteration plan
  - Test connection endpoint should be a stub (always returns success)
- Likelihood: MEDIUM (temptation to start scraper integration early)

## Recommendations for Planner

### 1. Extend Existing Encryption Pattern (DON'T REINVENT)

**Rationale:** `/lib/encryption.ts` is battle-tested with Plaid tokens, has comprehensive tests, uses industry-standard AES-256-GCM.

**Action:**
- Add `encryptBankCredentials(credentials: BankCredentials): string`
- Add `decryptBankCredentials(encrypted: string): BankCredentials`
- Copy test structure from existing encryption tests
- Keep same `ENCRYPTION_KEY` env var pattern

**Avoid:** Creating a new encryption module or using a different algorithm.

### 2. Reuse Existing Prisma Patterns (MODEL STRUCTURE)

**Rationale:** Account model already demonstrates the exact patterns needed for BankConnection (encrypted tokens, lastSynced, isActive, cascade deletes).

**Action:**
- Copy Account model structure
- Replace `plaidAccessToken` with `encryptedCredentials`
- Add `bank` and `status` enums
- Use same index patterns (`@@index([userId])`, `@@index([status])`)

**Avoid:** Creating novel model structures that don't match existing patterns.

### 3. Stub External Dependencies in Iteration 17

**Rationale:** israeli-bank-scrapers integration is HIGH RISK (Iteration 18). Iteration 17 is foundation only.

**Action:**
- Create `testConnection` endpoint that returns `{ success: true }` without actual scraping
- Document in iteration report: "Real scraper integration in Iteration 18"
- Focus on encryption, database, and UI scaffold

**Avoid:** Installing israeli-bank-scrapers or attempting real bank connections.

### 4. Leverage shadcn/ui for Rapid UI Development

**Rationale:** All components are already installed and styled. Settings page pattern exists (see exports page).

**Action:**
- Create `/app/settings/bank-connections/page.tsx` as client component
- Use existing Card, Button, Badge, Dialog components
- Follow pattern from `/app/(dashboard)/budgets/page.tsx` for list view
- Add "Add Bank Connection" button (navigates to wizard, not yet functional)

**Avoid:** Building custom components from scratch.

### 5. Write Tests First for Encryption Functions

**Rationale:** Security-critical code needs test-driven development. Existing encryption tests provide template.

**Action:**
- Create `/lib/__tests__/bank-credentials-encryption.test.ts`
- Test cases:
  - Encrypt/decrypt round-trip for BankCredentials JSON
  - Invalid JSON handling
  - Missing encryption key error
  - Unicode in password field
- Run `npm test` to verify all pass

**Avoid:** Skipping tests or writing them after implementation.

### 6. Document Security Considerations in Code Comments

**Rationale:** Future developers need to understand why credentials are handled this way.

**Action:**
- Add JSDoc comments to encryption functions:
  ```typescript
  /**
   * Encrypts bank credentials for secure storage in database.
   * SECURITY NOTE: Credentials are decrypted only in-memory during sync operations.
   * Never log decrypted credentials or store them in plaintext.
   */
  export function encryptBankCredentials(credentials: BankCredentials): string
  ```

**Avoid:** Assuming security practices are self-evident.

## Resource Map

### Critical Files/Directories

**Existing (TO EXTEND):**
- `/src/lib/encryption.ts` - Add bank credential functions
- `/src/lib/__tests__/encryption.test.ts` - Add bank credential tests
- `/prisma/schema.prisma` - Add BankConnection, SyncLog models + enums
- `/src/server/api/trpc.ts` - Auth patterns (no changes needed)

**New (TO CREATE):**
- `/src/server/api/routers/bankConnections.router.ts` - CRUD endpoints
- `/src/server/schemas/bank-credentials.schema.ts` - Zod schemas
- `/src/app/settings/bank-connections/page.tsx` - UI scaffold
- `/src/components/bank-connections/BankConnectionList.tsx` - List component
- `/src/components/bank-connections/DeleteConfirmationDialog.tsx` - Modal
- `/prisma/migrations/XXX_add_bank_connections.sql` - Database migration

### Key Dependencies

**Already Installed:**
- `@prisma/client` 5.22.0 - Database ORM
- `@trpc/server` 11.6.0 - API layer
- `zod` 3.23.8 - Schema validation
- `@supabase/supabase-js` 2.58.0 - Auth
- Node.js `crypto` module - Encryption (built-in)

**NOT NEEDED in Iteration 17:**
- `israeli-bank-scrapers` - Deferred to Iteration 18
- `string-similarity` - Deferred to Iteration 19 (duplicate detection)

### Testing Infrastructure

**Unit Tests (Vitest):**
- Existing: `/src/lib/__tests__/encryption.test.ts` (10 test cases)
- New: `/src/lib/__tests__/bank-credentials-encryption.test.ts` (8 test cases)
- New: `/src/server/api/routers/__tests__/bankConnections.router.test.ts` (15 test cases)

**Test Commands:**
```bash
npm test                # Run all tests
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
```

**Database Testing:**
```bash
npm run db:migrate      # Apply migrations to dev DB
npm run db:studio       # Prisma Studio to verify schema
```

### Environment Variables

**Required:**
- `ENCRYPTION_KEY` - 32-byte hex string (already set for Plaid)
- `DATABASE_URL` - Postgres connection string (Supabase)
- `DIRECT_URL` - Direct Postgres URL (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**Verify Before Deploying:**
```bash
# Check Vercel env vars
vercel env ls

# Ensure ENCRYPTION_KEY exists in production
vercel env pull
grep ENCRYPTION_KEY .env.local
```

## Questions for Planner

### Question 1: Encryption Key Derivation Strategy

**Context:** Current implementation uses static `ENCRYPTION_KEY` env var for all users.

**Options:**
1. **Keep env var approach** (recommended for Iteration 17)
   - Pros: Simple, already working for Plaid tokens
   - Cons: Single key compromise affects all users
   
2. **Derive per-user keys from Supabase session tokens**
   - Pros: Better security isolation
   - Cons: Complex implementation, requires key management service
   
3. **Use Vercel KV or similar key management**
   - Pros: Industry best practice
   - Cons: Additional cost, complexity

**Recommendation:** Start with option 1 (env var) for MVP. Document migration path to option 2 for post-MVP.

### Question 2: Test Connection Endpoint Behavior

**Context:** Iteration 17 has no scraper integration yet.

**Options:**
1. **Stub endpoint (always returns success)** (recommended)
   - Implement in Iteration 17
   - Replace with real scraper in Iteration 18
   
2. **Skip test endpoint entirely**
   - Only add it in Iteration 18
   - Simpler for Iteration 17
   
3. **Partial implementation (validate format only)**
   - Check credentials are non-empty
   - Don't actually connect to bank

**Recommendation:** Option 1. Stub endpoint allows UI testing and demonstrates API contract.

### Question 3: Transaction Model Enhancement Timing

**Context:** Transaction model needs 5 new fields (rawMerchantName, importSource, etc.).

**Options:**
1. **Add all fields in Iteration 17** (recommended)
   - Pros: Complete schema ready for Iteration 18
   - Cons: Unused fields until Iteration 18
   
2. **Add fields in Iteration 18 (when needed)**
   - Pros: Deferred complexity
   - Cons: Two migrations, potential downtime
   
3. **Add fields incrementally (1-2 per iteration)**
   - Pros: Gradual rollout
   - Cons: Multiple migrations, high risk

**Recommendation:** Option 1. Add all fields in single migration now, mark as nullable/optional.

### Question 4: UI Scaffold Completeness

**Context:** Iteration 17 scope includes "Basic UI Scaffold (Settings Page)".

**Options:**
1. **List view + delete only** (recommended)
   - Show connected accounts
   - Delete confirmation modal
   - "Add Bank Connection" button (navigates to wizard, not functional)
   
2. **Full connection wizard (5 steps)**
   - Bank selection
   - Credential input
   - 2FA handling
   - Test connection
   - Initial import prompt
   - (Deferred to Iteration 18)
   
3. **List view + add form (no wizard)**
   - Simple form to add connection
   - No multi-step flow
   - (Middle ground)

**Recommendation:** Option 1. Wizard is complex, defer to Iteration 18 when scraper is ready.

### Question 5: SyncLog Model Initial State

**Context:** SyncLog tracks sync attempts. No syncs happen in Iteration 17.

**Options:**
1. **Add SyncLog model to schema (recommended)**
   - Pros: Complete database schema ready
   - Cons: Empty table until Iteration 18
   
2. **Defer SyncLog to Iteration 18**
   - Pros: Simpler migration in Iteration 17
   - Cons: Two migrations, dependencies between iterations
   
3. **Add SyncLog with seed data**
   - Pros: Demonstrates sync history UI
   - Cons: Fake data in production

**Recommendation:** Option 1. Add model in Iteration 17, populate in Iteration 18.

---

**Report Status:** COMPLETE
**Next Step:** Builder-17 uses this report to implement Security Foundation & Database Schema
**Estimated Implementation Time:** 6-8 hours
**Risk Level:** LOW (no external dependencies, well-established patterns)
