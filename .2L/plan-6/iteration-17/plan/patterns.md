# Code Patterns & Conventions - Iteration 17

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── settings/
│   │           ├── page.tsx                      # Settings index (UPDATE)
│   │           └── bank-connections/
│   │               └── page.tsx                  # NEW: Bank connections page
│   ├── components/
│   │   └── ui/                                   # Existing shadcn components
│   ├── lib/
│   │   ├── encryption.ts                         # EXTEND: Add bank credential functions
│   │   └── __tests__/
│   │       └── bank-credentials-encryption.test.ts  # NEW: Encryption tests
│   └── server/
│       ├── api/
│       │   ├── routers/
│       │   │   ├── bankConnections.router.ts     # NEW: Bank connections API
│       │   │   └── __tests__/
│       │   │       └── bankConnections.router.test.ts  # NEW: Router tests
│       │   └── root.ts                           # UPDATE: Register router
│       └── services/
│           └── israeli-bank.service.ts           # NEW: Stub for Iteration 18
├── prisma/
│   ├── schema.prisma                             # UPDATE: Add models + enums
│   └── migrations/
│       └── YYYYMMDDHHMMSS_add_bank_connections/  # NEW: Generated migration
└── package.json                                  # NO CHANGES
```

---

## Naming Conventions

**Models & Types:** PascalCase
- `BankConnection`, `SyncLog`, `BankCredentials`

**Files:** camelCase for utilities, PascalCase for components
- `encryption.ts`, `bankConnections.router.ts`
- `BankConnectionsList.tsx` (if creating component)

**Functions:** camelCase
- `encryptBankCredentials()`, `decryptBankCredentials()`

**Enums:** PascalCase with SCREAMING_SNAKE_CASE values
- `BankProvider { FIBI, VISA_CAL }`
- `ConnectionStatus { ACTIVE, ERROR, EXPIRED }`

**Constants:** SCREAMING_SNAKE_CASE
- `ENCRYPTION_KEY`, `ALGORITHM`

**Database Fields:** camelCase
- `encryptedCredentials`, `lastSynced`, `userId`

---

## Prisma Schema Patterns

### Pattern: Adding New Models

**When to use:** Creating BankConnection and SyncLog models

**Full Example:**
```prisma
// ============================================================================
// BANK INTEGRATIONS
// ============================================================================

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

model BankConnection {
  id                    String            @id @default(cuid())
  userId                String
  bank                  BankProvider
  accountType           AccountType       // Reuse existing enum
  encryptedCredentials  String            @db.Text
  accountIdentifier     String            // Last 4 digits (e.g., "1234")
  status                ConnectionStatus  @default(ACTIVE)
  lastSynced            DateTime?
  lastSuccessfulSync    DateTime?
  errorMessage          String?           @db.Text
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // Relationships
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncLogs  SyncLog[]

  // Indexes for performance
  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([lastSynced])
}

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

  // Relationships
  bankConnection BankConnection @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([bankConnectionId])
  @@index([createdAt(sort: Desc)])
  @@index([status])
}
```

**Key Points:**
- Enums defined before models
- Always include `id`, `createdAt`, `updatedAt`
- Use `@db.Text` for encrypted data (longer than 255 chars)
- `onDelete: Cascade` for owned data
- Index frequently queried fields
- Composite indexes for common query patterns

### Pattern: Enhancing Existing Models

**When to use:** Adding import fields to Transaction model

**Full Example:**
```prisma
model Transaction {
  // ... EXISTING FIELDS (preserve these) ...
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

  // NEW FIELDS (add these - all nullable for backward compatibility)
  rawMerchantName            String?              // Original merchant name from bank
  importSource               ImportSource?        // MANUAL, FIBI, CAL, PLAID
  importedAt                 DateTime?            // Timestamp of import
  categorizedBy              CategorizationSource?  // USER, AI_CACHED, AI_SUGGESTED
  categorizationConfidence   ConfidenceLevel?     // HIGH, MEDIUM, LOW

  // ... EXISTING RELATIONSHIPS (preserve these) ...
  user                 User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  account              Account                @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category             Category               @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  recurringTransaction RecurringTransaction?  @relation(fields: [recurringTransactionId], references: [id])

  // ... EXISTING INDEXES (preserve these) ...
  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
  @@index([plaidTransactionId])
  @@index([recurringTransactionId])
  @@index([userId, date(sort: Desc)])

  // NEW INDEX (add this)
  @@index([importSource])
}

// NEW ENUMS (add these after existing enums)
enum ImportSource {
  MANUAL
  FIBI
  CAL
  PLAID
}

enum CategorizationSource {
  USER          // Manually categorized by user
  AI_CACHED     // From MerchantCategoryCache
  AI_SUGGESTED  // From Claude API
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}
```

**Key Points:**
- All new fields nullable (optional) for backward compatibility
- Existing transactions get `NULL` for new fields
- Add comments explaining each field's purpose
- Preserve all existing indexes
- Add new indexes only for query-heavy fields

### Pattern: Running Migrations

**When to use:** After updating schema.prisma

**Commands:**
```bash
# 1. Create migration (development)
npx prisma migrate dev --name add-bank-connections-foundation

# 2. Review generated SQL (check before applying)
cat prisma/migrations/*_add_bank_connections_foundation/migration.sql

# 3. Apply to staging
npx prisma migrate deploy

# 4. Verify in Prisma Studio
npx prisma studio

# 5. Apply to production (after testing)
npx prisma migrate deploy
```

**Key Points:**
- Always review SQL before applying
- Test on local/staging first
- Use descriptive migration names
- Never edit migrations after creation
- Keep rollback strategy ready

---

## Encryption Patterns

### Pattern: Bank Credential Encryption

**When to use:** Storing/retrieving bank credentials

**File:** `src/lib/encryption.ts`

**Full Code Example:**
```typescript
// src/lib/encryption.ts
import * as crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')
const ALGORITHM = 'aes-256-gcm'

// EXISTING FUNCTIONS (preserve these)
export function encrypt(text: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  if (!ivHex || !authTagHex || encryptedHex === undefined) {
    throw new Error('Invalid encrypted string format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedText = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encryptedText).toString('utf8') + decipher.final('utf8')
}

// NEW FUNCTIONS (add these)

/**
 * Bank credentials structure for encryption
 */
export interface BankCredentials {
  userId: string       // Bank user ID (not Wealth user ID)
  password: string     // Bank password
  otp?: string        // Optional 2FA code (for future use)
}

/**
 * Encrypts bank credentials for secure database storage.
 *
 * SECURITY NOTE: Credentials are decrypted only in-memory during sync operations.
 * Never log decrypted credentials or store them in plaintext.
 *
 * @param credentials - Bank login credentials
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

/**
 * Decrypts bank credentials from database storage.
 *
 * SECURITY WARNING:
 * - Only call this in sync operations (server-side only)
 * - Clear credentials from memory after use
 * - Never log the result
 *
 * @param encrypted - Encrypted credentials string
 * @returns Decrypted credentials object
 */
export function decryptBankCredentials(encrypted: string): BankCredentials {
  const json = decrypt(encrypted)
  const credentials = JSON.parse(json) as BankCredentials

  // Validate required fields
  if (!credentials.userId || !credentials.password) {
    throw new Error('Invalid credentials: userId and password required')
  }

  return credentials
}
```

**Key Points:**
- Reuse existing `encrypt`/`decrypt` functions
- Type-safe with `BankCredentials` interface
- JSON serialization for structured data
- Comprehensive JSDoc comments for security warnings
- Input validation on decryption

### Pattern: Testing Encryption

**When to use:** Verifying encryption/decryption works correctly

**File:** `src/lib/__tests__/bank-credentials-encryption.test.ts`

**Full Code Example:**
```typescript
import { describe, it, expect } from 'vitest'
import { encryptBankCredentials, decryptBankCredentials, BankCredentials } from '../encryption'

describe('Bank Credentials Encryption', () => {
  const mockCredentials: BankCredentials = {
    userId: 'test-user-123',
    password: 'SecureP@ssw0rd!',
  }

  it('should encrypt and decrypt credentials successfully', () => {
    const encrypted = encryptBankCredentials(mockCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted).toEqual(mockCredentials)
    expect(decrypted.userId).toBe('test-user-123')
    expect(decrypted.password).toBe('SecureP@ssw0rd!')
  })

  it('should handle credentials with OTP', () => {
    const credentialsWithOTP: BankCredentials = {
      ...mockCredentials,
      otp: '123456',
    }

    const encrypted = encryptBankCredentials(credentialsWithOTP)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.otp).toBe('123456')
  })

  it('should produce different ciphertext for same credentials', () => {
    const encrypted1 = encryptBankCredentials(mockCredentials)
    const encrypted2 = encryptBankCredentials(mockCredentials)

    // Different due to random IV
    expect(encrypted1).not.toBe(encrypted2)

    // But both decrypt to same value
    expect(decryptBankCredentials(encrypted1)).toEqual(mockCredentials)
    expect(decryptBankCredentials(encrypted2)).toEqual(mockCredentials)
  })

  it('should handle special characters in password', () => {
    const specialCredentials: BankCredentials = {
      userId: 'user@example.com',
      password: '!@#$%^&*()_+{}|:"<>?[];\',./`~',
    }

    const encrypted = encryptBankCredentials(specialCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.password).toBe(specialCredentials.password)
  })

  it('should handle Hebrew characters', () => {
    const hebrewCredentials: BankCredentials = {
      userId: 'משתמש123',
      password: 'סיסמה!@#',
    }

    const encrypted = encryptBankCredentials(hebrewCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.userId).toBe('משתמש123')
    expect(decrypted.password).toBe('סיסמה!@#')
  })

  it('should throw on invalid encrypted format', () => {
    expect(() => {
      decryptBankCredentials('invalid-format')
    }).toThrow('Invalid encrypted string format')
  })

  it('should throw on tampered ciphertext', () => {
    const encrypted = encryptBankCredentials(mockCredentials)
    const tampered = encrypted.replace(/[0-9a-f]/, 'x')

    expect(() => {
      decryptBankCredentials(tampered)
    }).toThrow()
  })

  it('should throw on missing userId in decrypted data', () => {
    // Manually create invalid JSON
    const invalidCredentials = JSON.stringify({ password: 'test' })
    const encrypted = encryptBankCredentials(invalidCredentials as any)

    expect(() => {
      decryptBankCredentials(encrypted)
    }).toThrow('Invalid credentials: userId and password required')
  })
})
```

**Key Points:**
- Test round-trip encryption/decryption
- Test edge cases (special chars, Hebrew, OTP)
- Test security properties (random IV, tamper detection)
- Test error handling (invalid format, missing fields)

---

## tRPC Router Patterns

### Pattern: Bank Connections Router Structure

**When to use:** Creating API endpoints for bank connections

**File:** `src/server/api/routers/bankConnections.router.ts`

**Full Code Example:**
```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { BankProvider, ConnectionStatus, AccountType } from '@prisma/client'
import { encryptBankCredentials, decryptBankCredentials, type BankCredentials } from '@/lib/encryption'

export const bankConnectionsRouter = router({
  /**
   * List all bank connections for authenticated user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const connections = await ctx.prisma.bankConnection.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        syncLogs: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return connections
  }),

  /**
   * Get single bank connection by ID
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, 'Connection ID required'),
      })
    )
    .query(async ({ ctx, input }) => {
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
        include: {
          syncLogs: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      // Verify ownership
      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return connection
    }),

  /**
   * Add new bank connection with encrypted credentials
   */
  add: protectedProcedure
    .input(
      z.object({
        bank: z.nativeEnum(BankProvider),
        accountType: z.nativeEnum(AccountType).refine(
          (type) => type === 'CHECKING' || type === 'CREDIT',
          { message: 'Only CHECKING and CREDIT accounts supported' }
        ),
        credentials: z.object({
          userId: z.string().min(1, 'Bank user ID required'),
          password: z.string().min(1, 'Password required'),
          otp: z.string().optional(),
        }),
        accountIdentifier: z.string().length(4, 'Must be last 4 digits'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Encrypt credentials
        const encryptedCredentials = encryptBankCredentials(input.credentials)

        // Create bank connection
        const connection = await ctx.prisma.bankConnection.create({
          data: {
            userId: ctx.user.id,
            bank: input.bank,
            accountType: input.accountType,
            encryptedCredentials,
            accountIdentifier: input.accountIdentifier,
            status: 'ACTIVE',
          },
        })

        return connection
      } catch (error) {
        console.error('Failed to add bank connection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add bank connection',
          cause: error,
        })
      }
    }),

  /**
   * Update bank connection status or credentials
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ConnectionStatus).optional(),
        credentials: z
          .object({
            userId: z.string(),
            password: z.string(),
            otp: z.string().optional(),
          })
          .optional(),
        errorMessage: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Prepare update data
      const updateData: any = {}

      if (input.status) {
        updateData.status = input.status
      }

      if (input.credentials) {
        updateData.encryptedCredentials = encryptBankCredentials(input.credentials)
      }

      if (input.errorMessage !== undefined) {
        updateData.errorMessage = input.errorMessage
      }

      // Update connection
      const updated = await ctx.prisma.bankConnection.update({
        where: { id: input.id },
        data: updateData,
      })

      return updated
    }),

  /**
   * Delete bank connection (cascade deletes sync logs)
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Delete (cascade to sync logs via Prisma schema)
      await ctx.prisma.bankConnection.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Test bank connection credentials (stub for Iteration 17)
   * Real implementation in Iteration 18 with israeli-bank-scrapers
   */
  test: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Decrypt credentials (verify encryption works)
      const credentials = decryptBankCredentials(connection.encryptedCredentials)

      // STUB: Always return success in Iteration 17
      // Real implementation in Iteration 18 will call israeli-bank-scrapers
      console.log('Test connection stub - bank:', connection.bank, 'user:', credentials.userId.substring(0, 3) + '***')

      return {
        success: true,
        message: 'Connection test stub (real implementation in Iteration 18)',
      }
    }),
})
```

**Key Points:**
- Always use `protectedProcedure` for auth
- Verify ownership before mutations
- Use Zod for input validation
- Encrypt credentials before storing
- Include relationships with `include`
- Sanitize logs (never log credentials)
- Return structured responses

### Pattern: Router Registration

**When to use:** Adding new router to API

**File:** `src/server/api/root.ts`

**Full Code Example:**
```typescript
import { router } from './trpc'
import { categoriesRouter } from './routers/categories.router'
import { accountsRouter } from './routers/accounts.router'
import { plaidRouter } from './routers/plaid.router'
import { transactionsRouter } from './routers/transactions.router'
import { recurringRouter } from './routers/recurring.router'
import { budgetsRouter } from './routers/budgets.router'
import { analyticsRouter } from './routers/analytics.router'
import { goalsRouter } from './routers/goals.router'
import { usersRouter } from './routers/users.router'
import { adminRouter } from './routers/admin.router'
import { exportsRouter } from './routers/exports.router'
import { bankConnectionsRouter } from './routers/bankConnections.router'  // NEW

export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  recurring: recurringRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
  admin: adminRouter,
  exports: exportsRouter,
  bankConnections: bankConnectionsRouter,  // NEW
})

export type AppRouter = typeof appRouter
```

**Key Points:**
- Import at top of file
- Add to router object
- Type remains `AppRouter` (auto-inferred)

---

## Frontend Patterns

### Pattern: Settings Page Integration

**When to use:** Adding new section to settings

**File:** `src/app/(dashboard)/settings/page.tsx`

**Code to Add:**
```typescript
import { Landmark } from 'lucide-react'  // ADD THIS IMPORT

const settingsSections = [
  // ... existing sections ...
  {
    title: 'Bank Connections',
    description: 'Connect Israeli bank accounts for automatic transaction import',
    href: '/settings/bank-connections',
    icon: Landmark,  // Bank icon
  },
]
```

### Pattern: Bank Connections List Page

**When to use:** Displaying user's bank connections

**File:** `src/app/(dashboard)/settings/bank-connections/page.tsx`

**Full Code Example:**
```typescript
'use client'

import { useState } from 'react'
import { Landmark, Plus, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import { Breadcrumb } from '@/components/breadcrumb'
import { EmptyState } from '@/components/empty-state'
import { ConnectionStatus } from '@prisma/client'

export default function BankConnectionsPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const utils = api.useUtils()

  // Fetch connections
  const { data: connections, isLoading } = api.bankConnections.list.useQuery()

  // Delete mutation
  const deleteMutation = api.bankConnections.delete.useMutation({
    onSuccess: () => {
      utils.bankConnections.list.invalidate()
      toast.success('Bank connection deleted')
      setDeleteId(null)
    },
    onError: (error) => {
      toast.error('Failed to delete connection', {
        description: error.message,
      })
    },
  })

  // Status badge styling
  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'ERROR':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        )
    }
  }

  // Bank display names
  const getBankName = (bank: string) => {
    switch (bank) {
      case 'FIBI':
        return 'First International Bank'
      case 'VISA_CAL':
        return 'Visa CAL Credit Card'
      default:
        return bank
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb pathname="/settings/bank-connections" />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Bank Connections</h1>
          <p className="text-warm-gray-600 dark:text-warm-gray-400 mt-2">
            Connect your Israeli bank accounts for automatic transaction sync
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Bank
        </Button>
      </div>

      {/* Connection wizard coming in Iteration 18 */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-warm-gray-600 dark:text-warm-gray-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warm-gray-400" />
            <p className="font-medium">Connection wizard coming in Iteration 18</p>
            <p className="text-xs mt-1">
              This iteration establishes secure database foundation. Bank scraping integration next.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-warm-gray-600">Loading connections...</div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && connections?.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="No bank connections"
          description="Connect your Israeli bank account to automatically import transactions"
          action={
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add First Connection
            </Button>
          }
        />
      )}

      {/* Connection list */}
      {!isLoading && connections && connections.length > 0 && (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-sage-600 dark:text-sage-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{getBankName(connection.bank)}</CardTitle>
                      <CardDescription>
                        {connection.accountType} ending in {connection.accountIdentifier}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(connection.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(connection.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-warm-gray-600 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {connection.errorMessage && (
                <CardContent>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {connection.errorMessage}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bank connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bank connection and all sync history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Key Points:**
- Client component ('use client')
- React Query hooks for data fetching
- Toast notifications for feedback
- Empty state for no connections
- Delete confirmation dialog
- Status badge styling
- Responsive layout

---

## Import Order Convention

**Standard order for all files:**

```typescript
// 1. External packages (React, Next.js, etc.)
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. tRPC / Prisma
import { api } from '@/lib/api/client'
import { BankProvider, ConnectionStatus } from '@prisma/client'

// 3. UI components
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 4. Custom components
import { Breadcrumb } from '@/components/breadcrumb'
import { EmptyState } from '@/components/empty-state'

// 5. Icons
import { Landmark, Plus, Trash2 } from 'lucide-react'

// 6. Utils / lib
import { encryptBankCredentials } from '@/lib/encryption'

// 7. Types
import type { BankCredentials } from '@/lib/encryption'
```

---

## Code Quality Standards

### Standard: Ownership Verification

**Always verify resource ownership before mutations:**

```typescript
// CORRECT
const existing = await ctx.prisma.bankConnection.findUnique({
  where: { id: input.id }
})

if (!existing || existing.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}

// Now safe to mutate
await ctx.prisma.bankConnection.update({ ... })
```

### Standard: Never Log Sensitive Data

**Sanitize all logs containing user data:**

```typescript
// WRONG
console.log('Credentials:', credentials)

// CORRECT
console.log('Testing connection for bank:', bank, 'user:', userId.substring(0, 3) + '***')
```

### Standard: Type Safety

**Always use TypeScript types from Prisma:**

```typescript
import { BankProvider, ConnectionStatus, AccountType } from '@prisma/client'

// Use in Zod schemas
z.nativeEnum(BankProvider)
z.nativeEnum(ConnectionStatus)

// Use in function parameters
function processConnection(bank: BankProvider, status: ConnectionStatus) {
  // Fully typed
}
```

### Standard: Error Handling

**Use specific error codes:**

```typescript
// Resource not found or access denied
throw new TRPCError({ code: 'NOT_FOUND' })

// Validation error
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' })

// Server error
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Encryption failed',
  cause: error
})
```

---

## Performance Patterns

### Pattern: Database Query Optimization

**Use indexes for common queries:**

```prisma
// Good: Indexed query
model BankConnection {
  @@index([userId, status])
}

// Query will use composite index
const connections = await prisma.bankConnection.findMany({
  where: {
    userId: 'abc',
    status: 'ACTIVE'
  }
})
```

### Pattern: React Query Cache Invalidation

**Invalidate related queries after mutations:**

```typescript
const deleteMutation = api.bankConnections.delete.useMutation({
  onSuccess: () => {
    // Invalidate list query (will refetch)
    utils.bankConnections.list.invalidate()

    // Show feedback
    toast.success('Connection deleted')
  }
})
```

---

## Security Patterns

### Pattern: Encryption Key Verification

**Always check key exists before operations:**

```typescript
export function encrypt(text: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  // Safe to proceed
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  // ...
}
```

### Pattern: Credential Memory Management

**Clear sensitive data after use (future pattern for Iteration 18):**

```typescript
// In sync operations (Iteration 18)
const credentials = decryptBankCredentials(connection.encryptedCredentials)

try {
  await scrapeBank(credentials)
} finally {
  // Clear from memory
  Object.keys(credentials).forEach(key => {
    delete credentials[key as keyof BankCredentials]
  })
}
```

---

**Patterns Status:** COMPREHENSIVE
**Ready for:** Builder implementation
**All examples:** Copy-pasteable, production-ready code
