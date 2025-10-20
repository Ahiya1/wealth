# Builder Task Breakdown

## Overview

**Total Primary Builders:** 8 builders organized in 3 sequential phases

**Pre-Split Decision:** Builder-5 (Transaction Management) is PRE-SPLIT into 4 sub-builders due to HIGH complexity

**Estimated Total Build Time:** 3-4 hours (with parallel execution in Phase 1)

**Integration Strategy:** Sequential phases with clear dependency chains. Schema merging at end of each phase.

---

## Build Order & Dependencies

### Phase 1 - Foundation (Parallel Execution)
**No dependencies** - These builders can work simultaneously:
- Builder-1: Authentication & User Management
- Builder-2: Category Management & Seed Data
- Builder-3: Account Management (non-Plaid)

**Duration:** ~45-60 minutes in parallel

---

### Phase 2 - Core Features (After Phase 1 Complete)
**Dependencies:** Requires Phase 1 schema and auth system:
- Builder-4: Plaid Integration Service (standalone)
- Builder-5: Transaction Management (PRE-SPLIT into 4 sub-builders)
  - Sub-5A: Core Transaction CRUD
  - Sub-5B: Plaid-Transaction Integration
  - Sub-5C: Claude AI Categorization
  - Sub-5D: Transaction UI & Filtering
- Builder-6: Budget Management

**Duration:** ~60-90 minutes

---

### Phase 3 - Advanced Features (After Phase 2 Complete)
**Dependencies:** Requires transaction and budget data:
- Builder-7: Analytics & Dashboard
- Builder-8: Goals & Planning

**Duration:** ~45-60 minutes

---

## Dependency Graph

```
Phase 1 (Parallel):
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Builder-1  │  │  Builder-2  │  │  Builder-3  │
│    Auth     │  │ Categories  │  │  Accounts   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                   Phase 1 Complete
                   (Merge schemas)
                        │
       ┌────────────────┴────────────────┐
       │                                 │
Phase 2:                                 │
┌──────┴──────┐  ┌────────────────────┐ │
│  Builder-4  │  │    Builder-5       │ │
│   Plaid     │  │  (4 Sub-Builders)  │ │
└──────┬──────┘  └──────┬─────────────┘ │
       │                │                │
       │         ┌──────┴─────┐          │
       │         │ Builder-6  │          │
       │         │  Budgets   │          │
       │         └──────┬─────┘          │
       └────────────────┴────────────────┘
                        │
                   Phase 2 Complete
                   (Merge schemas)
                        │
       ┌────────────────┴────────────────┐
       │                                 │
Phase 3:                                 │
┌──────┴──────┐          ┌───────────────┴──┐
│  Builder-7  │          │    Builder-8      │
│  Analytics  │          │      Goals        │
└──────┬──────┘          └───────────────────┘
       │                                 │
       └────────────────┬────────────────┘
                        │
                   Phase 3 Complete
                   (Final integration)
```

---

# Builder-1: Authentication & User Management

## Scope
Complete authentication system with email/password, Google OAuth, password reset flow, and user profile management. This is the foundation for all other builders.

## Complexity Estimate
**MEDIUM**

## Estimated Effort
45-60 minutes

## Dependencies
**Depends on:** None (Foundation builder)
**Blocks:** All other builders (provides auth system and User model)

## Success Criteria
- [ ] User can register with email/password
- [ ] User can login with email/password
- [ ] User can login with Google OAuth
- [ ] Password reset email flow works
- [ ] User sessions persist correctly
- [ ] Protected routes redirect to login when unauthenticated
- [ ] User profile is accessible in all tRPC procedures
- [ ] NextAuth.js middleware protects dashboard routes

## Files to Create

### Prisma Schema
- `prisma/schema.prisma` - User, OAuthAccount, PasswordResetToken models

### Core Auth Configuration
- `src/lib/auth.ts` - NextAuth.js configuration with providers
- `src/lib/prisma.ts` - Prisma client singleton
- `middleware.ts` - Route protection middleware (project root)

### API Routes
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js handler
- `src/server/api/trpc.ts` - tRPC initialization with auth context
- `src/server/api/root.ts` - Root tRPC router (others will merge here)
- `src/server/api/routers/auth.router.ts` - Auth procedures (register, reset password)

### UI Components
- `src/components/auth/SignInForm.tsx` - Email/password login form
- `src/components/auth/SignUpForm.tsx` - Registration form
- `src/components/auth/ResetPasswordForm.tsx` - Request reset form
- `src/components/auth/NewPasswordForm.tsx` - Set new password form
- `src/components/auth/GoogleSignInButton.tsx` - Google OAuth button

### Pages
- `src/app/(auth)/signin/page.tsx` - Sign in page
- `src/app/(auth)/signup/page.tsx` - Sign up page
- `src/app/(auth)/reset-password/page.tsx` - Password reset page
- `src/app/(auth)/layout.tsx` - Auth pages layout (centered, minimal)
- `src/app/layout.tsx` - Root layout with Providers
- `src/app/providers.tsx` - tRPC and React Query providers

### Utilities
- `src/lib/trpc.ts` - tRPC client hooks
- `src/lib/utils.ts` - Utility functions (cn() for Tailwind)

### Configuration Files
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind configuration
- `.env.example` - Environment variables template
- `package.json` - Dependencies

### shadcn/ui Setup
Install components:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label card toast
```

## Implementation Notes

### Key Patterns to Follow
- Use NextAuth.js 5.0.0-beta.25 (v5 pattern for App Router)
- Store passwords hashed with bcryptjs (12 salt rounds)
- JWT session strategy (stateless, serverless-friendly)
- Use Prisma Adapter for NextAuth.js
- Protected procedures in tRPC check `ctx.session.user`
- Password reset tokens expire in 1 hour

### Prisma Schema Structure
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // null for OAuth-only users
  name          String?
  image         String?
  currency      String    @default("USD")
  timezone      String    @default("America/New_York")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  oauthAccounts      OAuthAccount[]
  passwordResetTokens PasswordResetToken[]
  // Other relations added by later builders
}
```

### tRPC Context Pattern
```typescript
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerSession(authOptions)
  return { session, prisma }
}

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { session: ctx.session } })
})
```

### Critical Security Considerations
- Never log passwords or tokens
- Use HttpOnly cookies for sessions (NextAuth.js default)
- Implement CSRF protection (NextAuth.js handles this)
- Return generic error messages for login failures
- Hash password reset tokens before storing in database

## Testing Requirements

### Unit Tests
- Password hashing utility
- Zod validation schemas for email/password

### Integration Tests
- tRPC auth.register procedure
- tRPC auth.requestPasswordReset procedure
- tRPC auth.resetPassword procedure

### E2E Tests (Playwright)
- User registration flow
- Login with email/password
- Login with Google OAuth (mocked)
- Password reset flow (with email service mocked)

### Coverage Target
80%+ for auth router procedures

## Potential Issues & Solutions

### Issue: NextAuth v5 Beta Documentation
**Solution:** Use official Auth.js docs (v5 is production-ready as of Jan 2025). Follow exact patterns from patterns.md.

### Issue: Google OAuth Credentials Setup
**Solution:** Provide clear .env.example with instructions. For testing, allow email/password flow first.

### Issue: tRPC Context Type Safety
**Solution:** Use `createTRPCContext` return type and middleware to ensure session.user is always defined in protected procedures.

---

# Builder-2: Category Management & Seed Data

## Scope
Category system with default categories, custom category creation, hierarchical structure (parent/child), and seed script to populate default categories.

## Complexity Estimate
**LOW**

## Estimated Effort
30-45 minutes

## Dependencies
**Depends on:** Builder-1 (User model, tRPC setup)
**Blocks:** Builder-5 (transactions need categories)

## Success Criteria
- [ ] Default categories seed on first database setup
- [ ] User can view all available categories
- [ ] User can create custom categories
- [ ] User can edit category name, icon, color
- [ ] User can archive categories (soft delete)
- [ ] Categories support parent/child hierarchy
- [ ] Categories have icons and colors for UI
- [ ] Seed script is idempotent (can run multiple times)

## Files to Create

### Prisma Schema Addition
- Append to `prisma/schema.prisma` - Category model

### Seed Script
- `prisma/seed.ts` - Default categories with icons and colors

### tRPC Router
- `src/server/api/routers/categories.router.ts` - Category CRUD operations

### UI Components
- `src/components/categories/CategorySelect.tsx` - Dropdown for category selection
- `src/components/categories/CategoryBadge.tsx` - Display category with icon/color
- `src/components/categories/CategoryForm.tsx` - Create/edit category form
- `src/components/categories/CategoryList.tsx` - List all categories with edit/archive

### Pages
- `src/app/(dashboard)/settings/categories/page.tsx` - Manage categories

### Constants
- `src/lib/constants.ts` - Default category definitions

## Implementation Notes

### Default Categories Structure
```typescript
const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', parent: null },
  { name: 'Dining', icon: 'Utensils', color: '#f59e0b', parent: null },
  { name: 'Restaurants', icon: 'Store', color: '#f59e0b', parent: 'Dining' },
  { name: 'Coffee', icon: 'Coffee', color: '#f59e0b', parent: 'Dining' },
  { name: 'Transportation', icon: 'Car', color: '#3b82f6', parent: null },
  { name: 'Gas', icon: 'Fuel', color: '#3b82f6', parent: 'Transportation' },
  { name: 'Public Transit', icon: 'Bus', color: '#3b82f6', parent: 'Transportation' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', parent: null },
  { name: 'Entertainment', icon: 'Tv', color: '#8b5cf6', parent: null },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#8b5cf6', parent: 'Entertainment' },
  { name: 'Health', icon: 'Heart', color: '#ef4444', parent: null },
  { name: 'Housing', icon: 'Home', color: '#6b7280', parent: null },
  { name: 'Utilities', icon: 'Zap', color: '#6b7280', parent: 'Housing' },
  { name: 'Income', icon: 'DollarSign', color: '#10b981', parent: null },
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', parent: 'Income' },
  { name: 'Miscellaneous', icon: 'MoreHorizontal', color: '#9ca3af', parent: null },
]
```

### Prisma Schema Pattern
```prisma
model Category {
  id        String   @id @default(cuid())
  userId    String?  // null for default categories
  name      String
  icon      String?  // Lucide icon name
  color     String?  // Hex color
  parentId  String?  // For hierarchical categories
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent       Category?     @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children     Category[]    @relation("CategoryHierarchy")
  transactions Transaction[]
  budgets      Budget[]

  @@unique([userId, name])
  @@index([userId])
  @@index([parentId])
}
```

### Seed Script Pattern
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding default categories...')

  // First create parent categories
  const parentCategories = DEFAULT_CATEGORIES.filter(c => !c.parent)
  for (const cat of parentCategories) {
    await prisma.category.upsert({
      where: { userId_name: { userId: null, name: cat.name } },
      create: { ...cat, userId: null, isDefault: true },
      update: {},
    })
  }

  // Then create child categories
  const childCategories = DEFAULT_CATEGORIES.filter(c => c.parent)
  for (const cat of childCategories) {
    const parent = await prisma.category.findFirst({
      where: { name: cat.parent, userId: null },
    })
    await prisma.category.upsert({
      where: { userId_name: { userId: null, name: cat.name } },
      create: { ...cat, parentId: parent?.id, userId: null, isDefault: true },
      update: {},
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Key Router Procedures
- `list` - Get all categories (default + user custom)
- `get` - Get single category with children
- `create` - Create custom category
- `update` - Edit category name/icon/color
- `archive` - Soft delete category (sets isActive = false)

### Icon Library
Use Lucide React icons:
```bash
npm install lucide-react@0.460.0
```

## Testing Requirements

### Unit Tests
- Seed script creates correct number of categories
- Hierarchical relationships are correct
- Color and icon values are valid

### Integration Tests
- tRPC categories.list returns default + user categories
- tRPC categories.create validates unique names per user
- tRPC categories.archive prevents deletion if transactions exist

### Coverage Target
85%+ for category router

## Potential Issues & Solutions

### Issue: Hierarchical Categories Complexity
**Solution:** Limit to 1 level deep (parent-child only, no grandchildren). Prisma self-relation handles this cleanly.

### Issue: Deleting Categories with Transactions
**Solution:** Use soft delete (isActive flag). Prevent archiving if transactions exist, or offer to reassign transactions first.

### Issue: Icon Display in UI
**Solution:** Use dynamic import for Lucide icons based on icon name string. Provide fallback icon (MoreHorizontal) for missing icons.

---

# Builder-3: Account Management (non-Plaid)

## Scope
Manual account creation, editing, balance tracking, and account list display. Does NOT include Plaid integration (that's Builder-4).

## Complexity Estimate
**LOW-MEDIUM**

## Estimated Effort
30-45 minutes

## Dependencies
**Depends on:** Builder-1 (User model, auth)
**Blocks:** Builder-5 (transactions need accounts)

## Success Criteria
- [ ] User can manually create accounts
- [ ] Account types supported: Checking, Savings, Credit, Investment, Cash
- [ ] User can edit account name and institution
- [ ] User can manually update account balance
- [ ] User can archive accounts (soft delete)
- [ ] Account list displays current balances
- [ ] Account detail page shows recent transactions (once Builder-5 completes)
- [ ] Net worth calculation sums all active account balances

## Files to Create

### Prisma Schema Addition
- Append to `prisma/schema.prisma` - Account model and AccountType enum

### tRPC Router
- `src/server/api/routers/accounts.router.ts` - Account CRUD operations

### UI Components
- `src/components/accounts/AccountCard.tsx` - Display account with balance
- `src/components/accounts/AccountForm.tsx` - Create/edit account form
- `src/components/accounts/AccountList.tsx` - List all accounts
- `src/components/accounts/AccountTypeIcon.tsx` - Icon for account type

### Pages
- `src/app/(dashboard)/accounts/page.tsx` - Account list page
- `src/app/(dashboard)/accounts/[id]/page.tsx` - Account detail page

## Implementation Notes

### Prisma Schema Pattern
```prisma
model Account {
  id               String      @id @default(cuid())
  userId           String
  type             AccountType
  name             String
  institution      String
  balance          Decimal     @db.Decimal(15, 2)
  currency         String      @default("USD")
  plaidAccountId   String?     @unique
  plaidAccessToken String?     @db.Text // Encrypted by Builder-4
  isManual         Boolean     @default(true)
  isActive         Boolean     @default(true)
  lastSynced       DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[] // Added by Builder-5
  goals        Goal[]        // Added by Builder-8

  @@index([userId])
  @@index([plaidAccountId])
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT
  INVESTMENT
  CASH
}
```

### Key Router Procedures
- `list` - Get all user accounts (isActive = true)
- `get` - Get single account with transaction count
- `create` - Create manual account
- `update` - Edit name, institution, balance
- `updateBalance` - Manually update balance
- `archive` - Soft delete account
- `netWorth` - Calculate sum of all active account balances

### Balance Calculation
- Use Prisma Decimal type to avoid floating-point errors
- For credit cards, balance should be negative (debt)
- Net worth = sum of all account balances (checking + savings - credit)

### Account Type Icons
```typescript
const ACCOUNT_TYPE_ICONS = {
  CHECKING: 'Wallet',
  SAVINGS: 'PiggyBank',
  CREDIT: 'CreditCard',
  INVESTMENT: 'TrendingUp',
  CASH: 'Banknote',
}
```

### Patterns to Follow
- Use `formatCurrency()` utility for all balance displays
- Show last updated timestamp
- Color code account types (checking = blue, savings = green, credit = orange)
- Disable editing plaidAccountId field (only set by Builder-4)

## Testing Requirements

### Unit Tests
- Balance calculation with Decimal type
- Net worth calculation across account types

### Integration Tests
- tRPC accounts.create validates required fields
- tRPC accounts.netWorth sums correctly
- tRPC accounts.archive prevents deletion if transactions exist

### Coverage Target
85%+ for accounts router

## Potential Issues & Solutions

### Issue: Decimal Type in TypeScript
**Solution:** Use Prisma's generated Decimal type. Convert to number for display: `balance.toNumber()`.

### Issue: Account Balance Updates
**Solution:** Manual accounts allow direct balance updates. Plaid accounts (Builder-4) recalculate balance from transaction totals.

### Issue: Credit Card Balances
**Solution:** Store as negative values. Display with "You owe $X" messaging instead of negative sign.

---

# Builder-4: Plaid Integration Service

## Scope
Complete Plaid API integration: Link Token creation, Public Token exchange, Account import, Transaction sync, Webhook handling, and encryption utilities. This is a standalone service builder.

## Complexity Estimate
**HIGH**

## Estimated Effort
60-75 minutes

## Dependencies
**Depends on:** Builder-1 (auth), Builder-3 (Account model)
**Blocks:** Builder-5 (transactions need Plaid sync capability)

## Success Criteria
- [ ] User can open Plaid Link UI and connect bank account
- [ ] Access tokens are encrypted before database storage
- [ ] Bank accounts are imported and stored in Account table
- [ ] Transaction sync fetches transactions from Plaid
- [ ] Webhook receives Plaid notifications
- [ ] Error handling for all Plaid error codes
- [ ] Account reconnection flow when login required
- [ ] Sandbox mode works with test credentials

## Files to Create

### Services
- `src/server/services/plaid.service.ts` - Plaid API client and operations
- `src/lib/encryption.ts` - AES-256-GCM encryption utilities

### tRPC Router
- `src/server/api/routers/plaid.router.ts` - Plaid procedures (link token, exchange, sync)

### API Routes
- `src/app/api/webhooks/plaid/route.ts` - Plaid webhook handler

### UI Components
- `src/components/accounts/PlaidLinkButton.tsx` - Plaid Link React component

### Types
- `src/types/plaid.ts` - Plaid-related TypeScript types

## Implementation Notes

### Plaid Service Structure
```typescript
// plaid.service.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string): Promise<string>
export async function exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }>
export async function getAccounts(accessToken: string): Promise<PlaidAccount[]>
export async function syncTransactions(accessToken: string, cursor?: string): Promise<SyncResponse>
export async function getInstitution(institutionId: string): Promise<Institution>
```

### Encryption Pattern
```typescript
// encryption.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedText = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encryptedText) + decipher.final('utf8')
}
```

### Key Plaid Operations

#### 1. Link Token Creation
```typescript
createLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: ctx.session.user.id },
    client_name: 'Wealth',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/plaid`,
  })
  return { linkToken: response.data.link_token }
})
```

#### 2. Public Token Exchange
```typescript
exchangePublicToken: protectedProcedure
  .input(z.object({
    publicToken: z.string(),
    institutionName: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { accessToken, itemId } = await exchangePublicToken(input.publicToken)
    const encryptedToken = encrypt(accessToken)

    const plaidAccounts = await getAccounts(accessToken)

    for (const acc of plaidAccounts) {
      await ctx.prisma.account.create({
        data: {
          userId: ctx.session.user.id,
          type: mapPlaidType(acc.type),
          name: acc.name,
          institution: input.institutionName,
          balance: acc.balances.current,
          plaidAccountId: acc.account_id,
          plaidAccessToken: encryptedToken,
          isManual: false,
          lastSynced: new Date(),
        },
      })
    }
  })
```

#### 3. Transaction Sync
```typescript
syncTransactions: protectedProcedure
  .input(z.object({ accountId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const account = await ctx.prisma.account.findUnique({
      where: { id: input.accountId },
    })

    if (!account?.plaidAccessToken) throw new TRPCError({ code: 'BAD_REQUEST' })

    const accessToken = decrypt(account.plaidAccessToken)
    let hasMore = true
    let cursor: string | undefined

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor,
      })

      // Process added, modified, removed transactions
      // (Implementation details in Builder-5)

      hasMore = response.data.has_more
      cursor = response.data.next_cursor
    }
  })
```

### Webhook Handler Pattern
```typescript
// api/webhooks/plaid/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { webhook_type, webhook_code, item_id } = body

  // Verify webhook signature (production)
  // const isValid = verifyPlaidWebhook(req.headers, body)
  // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  if (webhook_type === 'TRANSACTIONS') {
    switch (webhook_code) {
      case 'INITIAL_UPDATE':
      case 'HISTORICAL_UPDATE':
      case 'DEFAULT_UPDATE':
        // Trigger transaction sync for this item
        await triggerTransactionSync(item_id)
        break
      case 'TRANSACTIONS_REMOVED':
        // Mark transactions as deleted
        break
    }
  }

  if (webhook_type === 'ITEM') {
    if (webhook_code === 'ERROR') {
      // Mark account as needs reconnection
      await markAccountNeedsReconnection(item_id)
    }
  }

  return NextResponse.json({ received: true })
}
```

### Error Handling
```typescript
import { PlaidError } from 'plaid'

try {
  await plaidClient.transactionsSync({ ... })
} catch (error) {
  if (error instanceof PlaidError) {
    switch (error.error_code) {
      case 'ITEM_LOGIN_REQUIRED':
        await prisma.account.update({
          where: { plaidAccountId: itemId },
          data: { status: 'NEEDS_RECONNECTION' },
        })
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please reconnect your bank account' })
      case 'RATE_LIMIT_EXCEEDED':
        // Implement exponential backoff
        break
      default:
        console.error('Plaid error:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Bank connection error' })
    }
  }
  throw error
}
```

### Environment Variables Required
```bash
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
```

Generate encryption key:
```bash
openssl rand -hex 32
```

### Testing with Plaid Sandbox
```typescript
// Test credentials for Plaid Link
Username: user_good
Password: pass_good

// Test institutions:
- Chase
- Wells Fargo
- Bank of America
```

## Testing Requirements

### Unit Tests
- Encryption/decryption utilities
- Plaid account type mapping
- Error code handling logic

### Integration Tests
- Link token creation
- Public token exchange (mocked Plaid client)
- Transaction sync pagination

### E2E Tests (Playwright)
- Complete Plaid Link flow in sandbox
- Account connection and sync
- Webhook delivery (use ngrok for local testing)

### Coverage Target
75%+ (external API makes 100% difficult)

## Potential Issues & Solutions

### Issue: Webhook Testing Locally
**Solution:** Use ngrok to expose localhost. Set webhook URL in Plaid dashboard to ngrok URL. Log all webhook payloads for debugging.

### Issue: Access Token Rotation
**Solution:** MVP uses initial access token. Token rotation is post-MVP feature. Document for future enhancement.

### Issue: Plaid Sandbox Limitations
**Solution:** Sandbox has limited transaction history. Use Plaid's test data to validate sync logic. Production deployment needs production Plaid credentials.

### Issue: Encryption Key Management
**Solution:** Store ENCRYPTION_KEY in environment variable. Never commit to Git. Use Vercel environment variables in production.

---

# Builder-5: Transaction Management (PRE-SPLIT)

## Scope
This builder is PRE-SPLIT into 4 sub-builders due to HIGH complexity. Each sub-builder has a clear, manageable scope.

## Complexity Estimate
**VERY HIGH** (Split to manage complexity)

## Total Estimated Effort
75-90 minutes (across 4 sub-builders)

## Why Pre-Split?
Transaction Management involves multiple complex integrations:
1. Database CRUD with complex queries
2. Plaid API integration for import
3. Claude AI integration for categorization
4. Complex filtering and search UI

Splitting into 4 specialized sub-builders prevents any single builder from becoming overwhelmed.

---

## Sub-Builder 5A: Core Transaction CRUD

### Scope
Transaction database model, basic CRUD operations, manual transaction entry form, and transaction list display. No AI categorization or Plaid sync yet.

### Complexity Estimate
**MEDIUM**

### Estimated Effort
20-25 minutes

### Dependencies
**Depends on:** Builder-1 (User), Builder-2 (Category), Builder-3 (Account)
**Blocks:** Sub-5B, Sub-5C, Sub-5D

### Success Criteria
- [ ] User can manually create transactions
- [ ] User can edit transaction amount, payee, category, date, notes
- [ ] User can delete transactions
- [ ] Transaction list displays with pagination
- [ ] Transaction detail page shows all information
- [ ] Transactions support tags (array field)
- [ ] Amount stored as Decimal (no floating-point errors)

### Files to Create

#### Prisma Schema Addition
- Append to `prisma/schema.prisma` - Transaction model

#### tRPC Router
- `src/server/api/routers/transactions.router.ts` - CRUD procedures

#### UI Components
- `src/components/transactions/TransactionForm.tsx` - Create/edit form
- `src/components/transactions/TransactionCard.tsx` - Display single transaction
- `src/components/transactions/TransactionList.tsx` - List with pagination

#### Pages
- `src/app/(dashboard)/transactions/page.tsx` - Transaction list page
- `src/app/(dashboard)/transactions/[id]/page.tsx` - Transaction detail page

### Implementation Notes

#### Prisma Schema Pattern
```prisma
model Transaction {
  id                 String   @id @default(cuid())
  userId             String
  accountId          String
  date               DateTime
  amount             Decimal  @db.Decimal(15, 2)
  payee              String
  categoryId         String
  notes              String?  @db.Text
  tags               String[]
  plaidTransactionId String?  @unique
  isManual           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  account  Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
  @@index([plaidTransactionId])
  @@index([userId, date(sort: Desc)])
}
```

#### Key Router Procedures
```typescript
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(50),
    cursor: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: { userId: ctx.session.user.id },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
    })

    let nextCursor: string | undefined = undefined
    if (transactions.length > input.limit) {
      const nextItem = transactions.pop()
      nextCursor = nextItem!.id
    }

    return { transactions, nextCursor }
  })

create: protectedProcedure
  .input(z.object({
    accountId: z.string(),
    date: z.date(),
    amount: z.number(),
    payee: z.string().min(1),
    categoryId: z.string(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.transaction.create({
      data: {
        userId: ctx.session.user.id,
        accountId: input.accountId,
        date: input.date,
        amount: input.amount,
        payee: input.payee,
        categoryId: input.categoryId,
        notes: input.notes,
        tags: input.tags || [],
        isManual: true,
      },
      include: { category: true, account: true },
    })
  })
```

#### Form Pattern
Use React Hook Form + Zod validation. Follow patterns.md FormComponent pattern exactly.

### Testing Requirements
- Unit tests for Zod validation schemas
- Integration tests for CRUD procedures
- E2E test for creating manual transaction

### Coverage Target
85%+

---

## Sub-Builder 5B: Plaid-Transaction Integration

### Scope
Import transactions from Plaid, deduplicate, and update existing transactions when Plaid data changes.

### Complexity Estimate
**MEDIUM**

### Estimated Effort
20-25 minutes

### Dependencies
**Depends on:** Sub-5A (Transaction model), Builder-4 (Plaid service)
**Blocks:** Sub-5C (needs transactions to categorize)

### Success Criteria
- [ ] Transactions sync from Plaid accounts
- [ ] Plaid transactions are deduplicated by plaidTransactionId
- [ ] Modified Plaid transactions update existing records
- [ ] Removed Plaid transactions are soft-deleted
- [ ] Sync shows progress indicator
- [ ] Last sync timestamp is updated

### Files to Create

#### Service
- `src/server/services/plaid-sync.service.ts` - Transaction sync logic

#### tRPC Procedures (add to transactions.router.ts)
- `syncFromPlaid` - Sync transactions for user's Plaid accounts
- `syncSingleAccount` - Sync transactions for one account

### Implementation Notes

#### Sync Logic Pattern
```typescript
export async function syncTransactionsFromPlaid(
  userId: string,
  accountId: string,
  prisma: PrismaClient
) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account?.plaidAccessToken) return

  const accessToken = decrypt(account.plaidAccessToken)
  let hasMore = true
  let cursor: string | undefined = undefined

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor,
    })

    // Handle added transactions
    for (const txn of response.data.added) {
      await prisma.transaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        create: {
          userId: userId,
          accountId: accountId,
          plaidTransactionId: txn.transaction_id,
          date: new Date(txn.date),
          amount: -txn.amount, // Plaid uses positive for debits
          payee: txn.merchant_name || txn.name,
          categoryId: 'uncategorized-category-id', // Sub-5C will categorize
          isManual: false,
        },
        update: {
          amount: -txn.amount,
          payee: txn.merchant_name || txn.name,
          date: new Date(txn.date),
        },
      })
    }

    // Handle modified transactions
    for (const txn of response.data.modified) {
      await prisma.transaction.update({
        where: { plaidTransactionId: txn.transaction_id },
        data: {
          amount: -txn.amount,
          payee: txn.merchant_name || txn.name,
          date: new Date(txn.date),
        },
      })
    }

    // Handle removed transactions
    for (const txn of response.data.removed) {
      await prisma.transaction.delete({
        where: { plaidTransactionId: txn.transaction_id },
      })
    }

    hasMore = response.data.has_more
    cursor = response.data.next_cursor
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { lastSynced: new Date() },
  })
}
```

#### Amount Sign Convention
Plaid uses positive amounts for debits (money leaving account). We use negative amounts for expenses. Convert: `amount = -txn.amount`

### Testing Requirements
- Integration test for sync logic with mocked Plaid responses
- Test deduplication (same plaidTransactionId)
- Test update logic for modified transactions

### Coverage Target
80%+

---

## Sub-Builder 5C: Claude AI Categorization

### Scope
Use Claude API to automatically categorize transactions based on payee name.

### Complexity Estimate
**MEDIUM**

### Estimated Effort
20-25 minutes

### Dependencies
**Depends on:** Sub-5A (transactions exist), Sub-5B (Plaid imports)
**Blocks:** None (enhancement feature)

### Success Criteria
- [ ] Uncategorized transactions are automatically categorized
- [ ] Batch categorization (up to 50 transactions per request)
- [ ] User can trigger re-categorization
- [ ] Merchant-category mappings are cached in database
- [ ] Fallback to "Miscellaneous" if API fails
- [ ] Cost-optimized (use cache, batch requests)

### Files to Create

#### Service
- `src/server/services/categorize.service.ts` - Claude API integration

#### Database Addition
- Append to `prisma/schema.prisma` - MerchantCategoryCache model

#### tRPC Procedures (add to transactions.router.ts)
- `categorize` - Categorize single transaction
- `categorizeBatch` - Categorize multiple transactions
- `recategorizeAll` - Re-run categorization for all uncategorized

### Implementation Notes

#### Claude Service Pattern
```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function categorizeTransactions(
  transactions: { id: string; payee: string; amount: number }[],
  availableCategories: string[]
): Promise<{ transactionId: string; category: string }[]> {
  if (transactions.length === 0) return []

  // Check cache first
  const cachedResults = await checkCache(transactions)
  const uncached = transactions.filter(t => !cachedResults.has(t.id))

  if (uncached.length === 0) {
    return Array.from(cachedResults.entries()).map(([id, cat]) => ({
      transactionId: id,
      category: cat,
    }))
  }

  const transactionList = uncached
    .map((t, i) => `${i + 1}. ${t.payee} - $${Math.abs(t.amount)}`)
    .join('\n')

  const prompt = `You are a financial categorization assistant.

Categorize these transactions into one of these categories:
${availableCategories.join(', ')}

Transactions:
${transactionList}

Return ONLY a JSON array with this exact format:
[{"number": 1, "category": "CategoryName"}, {"number": 2, "category": "CategoryName"}]

Rules:
- Use only categories from the list provided
- If uncertain, use "Miscellaneous"
- Return valid JSON only, no other text`

  try {
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '[]'

    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : '[]'
    const categorizations = JSON.parse(jsonText)

    const results = uncached.map((txn, i) => {
      const cat = categorizations.find((c: any) => c.number === i + 1)
      const category = cat?.category || 'Miscellaneous'

      // Cache for future use
      cacheMerchantCategory(txn.payee, category)

      return { transactionId: txn.id, category }
    })

    // Merge cached + new results
    return [
      ...Array.from(cachedResults.entries()).map(([id, cat]) => ({
        transactionId: id,
        category: cat,
      })),
      ...results,
    ]
  } catch (error) {
    console.error('Claude categorization error:', error)
    return uncached.map(txn => ({
      transactionId: txn.id,
      category: 'Miscellaneous',
    }))
  }
}
```

#### Merchant Cache Schema
```prisma
model MerchantCategoryCache {
  id         String   @id @default(cuid())
  merchant   String   @unique
  categoryId String
  createdAt  DateTime @default(now())

  category Category @relation(fields: [categoryId], references: [id])

  @@index([merchant])
}
```

#### Rate Limiting
Use tRPC middleware to limit categorization requests to 10/minute per user.

### Testing Requirements
- Unit test for prompt construction
- Integration test with mocked Claude API
- Test fallback to Miscellaneous on error
- Test cache hit/miss logic

### Coverage Target
80%+

---

## Sub-Builder 5D: Transaction UI & Filtering

### Scope
Advanced transaction list with search, filters (date range, category, account), sorting, and CSV export.

### Complexity Estimate
**MEDIUM**

### Estimated Effort
15-20 minutes

### Dependencies
**Depends on:** Sub-5A (Transaction list), Sub-5B (Plaid transactions), Sub-5C (categories)
**Blocks:** None (UI enhancement)

### Success Criteria
- [ ] Search transactions by payee name
- [ ] Filter by date range (date picker)
- [ ] Filter by category (multi-select)
- [ ] Filter by account (multi-select)
- [ ] Filter by amount range
- [ ] Sort by date, amount, payee
- [ ] Export filtered transactions to CSV
- [ ] URL query params persist filters

### Files to Create

#### UI Components
- `src/components/transactions/TransactionFilters.tsx` - Filter UI
- `src/components/transactions/TransactionSearch.tsx` - Search input
- `src/components/transactions/ExportButton.tsx` - CSV export

#### tRPC Procedures (add to transactions.router.ts)
- Update `list` procedure to accept filter parameters
- `export` - Generate CSV data

#### Utilities
- `src/lib/csv.ts` - CSV generation utility

### Implementation Notes

#### Enhanced List Procedure
```typescript
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(50),
    cursor: z.string().optional(),
    search: z.string().optional(),
    accountIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    sortBy: z.enum(['date', 'amount', 'payee']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }))
  .query(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        ...(input.search && {
          payee: { contains: input.search, mode: 'insensitive' },
        }),
        ...(input.accountIds && {
          accountId: { in: input.accountIds },
        }),
        ...(input.categoryIds && {
          categoryId: { in: input.categoryIds },
        }),
        ...(input.dateFrom || input.dateTo && {
          date: {
            ...(input.dateFrom && { gte: input.dateFrom }),
            ...(input.dateTo && { lte: input.dateTo }),
          },
        }),
        ...(input.minAmount || input.maxAmount && {
          amount: {
            ...(input.minAmount && { gte: input.minAmount }),
            ...(input.maxAmount && { lte: input.maxAmount }),
          },
        }),
      },
      include: { category: true, account: true },
      orderBy: { [input.sortBy]: input.sortOrder },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
    })

    let nextCursor: string | undefined = undefined
    if (transactions.length > input.limit) {
      const nextItem = transactions.pop()
      nextCursor = nextItem!.id
    }

    return { transactions, nextCursor }
  })
```

#### CSV Export Pattern
```typescript
export: protectedProcedure
  .input(z.object({
    // Same filters as list procedure
  }))
  .mutation(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: { /* same filters */ },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    })

    const csv = [
      ['Date', 'Payee', 'Category', 'Account', 'Amount', 'Notes'].join(','),
      ...transactions.map(t => [
        format(t.date, 'yyyy-MM-dd'),
        `"${t.payee}"`,
        t.category.name,
        t.account.name,
        t.amount.toNumber(),
        `"${t.notes || ''}"`,
      ].join(',')),
    ].join('\n')

    return { csv, filename: `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv` }
  })
```

#### Filter UI Pattern
Use shadcn/ui components:
- Popover + Calendar for date range
- Command + Checkbox for multi-select filters
- Input for search
- Select for sorting

Store filters in URL query params using Next.js useSearchParams:
```typescript
const searchParams = useSearchParams()
const router = useRouter()

const updateFilters = (newFilters: Filters) => {
  const params = new URLSearchParams(searchParams)
  params.set('category', newFilters.category)
  router.push(`?${params.toString()}`)
}
```

### Testing Requirements
- Integration test for filtered queries
- E2E test for search and filter flow
- Test CSV generation with special characters

### Coverage Target
75%+

---

# Builder-6: Budget Management

## Scope
Monthly budgets by category, progress tracking, visual indicators, budget vs. actual comparison, and budget rollover option.

## Complexity Estimate
**MEDIUM-HIGH**

## Estimated Effort
45-60 minutes

## Dependencies
**Depends on:** Builder-2 (Categories), Builder-5 (Transactions for spending calculation)
**Blocks:** Builder-7 (Analytics uses budget data)

## Success Criteria
- [ ] User can create monthly budgets for categories
- [ ] Budget progress displays in real-time
- [ ] Visual indicators: green (<75%), yellow (75-95%), red (>95%)
- [ ] Budget vs. actual spending comparison
- [ ] Current month budget summary on dashboard
- [ ] Budget history (view past months)
- [ ] Optional budget rollover (unused amount carries over)
- [ ] Budget alerts at 75%, 90%, 100% thresholds

## Files to Create

### Prisma Schema Addition
- Append to `prisma/schema.prisma` - Budget and BudgetAlert models

### tRPC Router
- `src/server/api/routers/budgets.router.ts` - Budget CRUD and progress calculations

### UI Components
- `src/components/budgets/BudgetForm.tsx` - Create/edit budget
- `src/components/budgets/BudgetCard.tsx` - Display budget with progress bar
- `src/components/budgets/BudgetList.tsx` - List all budgets for month
- `src/components/budgets/BudgetProgressBar.tsx` - Progress indicator with colors
- `src/components/budgets/MonthSelector.tsx` - Select month for budget view

### Pages
- `src/app/(dashboard)/budgets/page.tsx` - Budget management page
- `src/app/(dashboard)/budgets/[month]/page.tsx` - Budget history for specific month

## Implementation Notes

### Prisma Schema Pattern
```prisma
model Budget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  amount     Decimal  @db.Decimal(15, 2)
  month      String   // Format: "2025-01"
  rollover   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category      @relation(fields: [categoryId], references: [id])
  alerts   BudgetAlert[]

  @@unique([userId, categoryId, month])
  @@index([userId])
  @@index([categoryId])
  @@index([month])
}

model BudgetAlert {
  id        String    @id @default(cuid())
  budgetId  String
  threshold Int       // 75, 90, 100
  sent      Boolean   @default(false)
  sentAt    DateTime?
  createdAt DateTime  @default(now())

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@index([budgetId])
}
```

### Key Router Procedures

#### 1. Create Budget
```typescript
create: protectedProcedure
  .input(z.object({
    categoryId: z.string(),
    amount: z.number().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/), // "2025-01"
    rollover: z.boolean().default(false),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.budget.create({
      data: {
        userId: ctx.session.user.id,
        categoryId: input.categoryId,
        amount: input.amount,
        month: input.month,
        rollover: input.rollover,
      },
      include: { category: true },
    })
  })
```

#### 2. Budget Progress
```typescript
progress: protectedProcedure
  .input(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
  }))
  .query(async ({ ctx, input }) => {
    const budgets = await ctx.prisma.budget.findMany({
      where: {
        userId: ctx.session.user.id,
        month: input.month,
      },
      include: { category: true },
    })

    const [year, month] = input.month.split('-').map(Number)
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(new Date(year, month - 1))

    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await ctx.prisma.transaction.aggregate({
          where: {
            userId: ctx.session.user.id,
            categoryId: budget.categoryId,
            date: { gte: startDate, lte: endDate },
            amount: { lt: 0 }, // Only expenses
          },
          _sum: { amount: true },
        })

        const spentAmount = Math.abs(spent._sum.amount?.toNumber() || 0)
        const budgetAmount = budget.amount.toNumber()
        const percentage = (spentAmount / budgetAmount) * 100

        return {
          id: budget.id,
          category: budget.category.name,
          categoryColor: budget.category.color,
          budgetAmount,
          spentAmount,
          remainingAmount: budgetAmount - spentAmount,
          percentage,
          status: percentage > 95 ? 'over' : percentage > 75 ? 'warning' : 'good',
        }
      })
    )

    return { budgets: budgetsWithProgress }
  })
```

#### 3. Budget vs. Actual Comparison
```typescript
comparison: protectedProcedure
  .input(z.object({
    categoryId: z.string(),
    startMonth: z.string(),
    endMonth: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    const months = generateMonthRange(input.startMonth, input.endMonth)

    const comparison = await Promise.all(
      months.map(async (month) => {
        const budget = await ctx.prisma.budget.findUnique({
          where: {
            userId_categoryId_month: {
              userId: ctx.session.user.id,
              categoryId: input.categoryId,
              month: month,
            },
          },
        })

        const [year, monthNum] = month.split('-').map(Number)
        const startDate = startOfMonth(new Date(year, monthNum - 1))
        const endDate = endOfMonth(new Date(year, monthNum - 1))

        const spent = await ctx.prisma.transaction.aggregate({
          where: {
            userId: ctx.session.user.id,
            categoryId: input.categoryId,
            date: { gte: startDate, lte: endDate },
            amount: { lt: 0 },
          },
          _sum: { amount: true },
        })

        return {
          month,
          budgeted: budget?.amount.toNumber() || 0,
          spent: Math.abs(spent._sum.amount?.toNumber() || 0),
        }
      })
    )

    return { comparison }
  })
```

### Color Indicators
```typescript
function getBudgetStatus(percentage: number) {
  if (percentage > 95) return { color: 'red', label: 'Over budget' }
  if (percentage > 75) return { color: 'yellow', label: 'Approaching limit' }
  return { color: 'green', label: 'On track' }
}
```

### Budget Rollover Logic
```typescript
// When creating next month's budget
if (previousBudget.rollover) {
  const unused = previousBudget.amount - spent
  if (unused > 0) {
    newBudgetAmount = currentBudget.amount + unused
  }
}
```

### Budget Alert System
Check thresholds after each transaction:
```typescript
async function checkBudgetAlerts(budgetId: string, percentage: number) {
  const thresholds = [75, 90, 100]

  for (const threshold of thresholds) {
    if (percentage >= threshold) {
      const alert = await prisma.budgetAlert.findFirst({
        where: { budgetId, threshold, sent: false },
      })

      if (alert) {
        // Send notification (email or in-app)
        await sendBudgetAlert(alert)
        await prisma.budgetAlert.update({
          where: { id: alert.id },
          data: { sent: true, sentAt: new Date() },
        })
      }
    }
  }
}
```

## Testing Requirements

### Unit Tests
- Budget progress calculation
- Percentage calculation
- Color status logic
- Rollover calculation

### Integration Tests
- tRPC budget.create validates unique constraint
- tRPC budget.progress calculates correctly
- tRPC budget.comparison generates correct chart data

### E2E Tests
- Create budget flow
- View budget progress
- Budget alert trigger (mocked)

### Coverage Target
85%+

## Potential Issues & Solutions

### Issue: Real-time Budget Updates
**Solution:** Use tRPC's useQuery with refetchInterval (30 seconds) or invalidate budget queries after transaction mutations.

### Issue: Performance with Many Budgets
**Solution:** Use database-level aggregations (Prisma aggregate). Add denormalized `spent` field to Budget table if needed.

### Issue: Budget Rollover Complexity
**Solution:** Make rollover optional. Calculate at budget creation time, not dynamically.

---

# Builder-7: Analytics & Dashboard

## Scope
Main dashboard with key metrics, spending by category chart, spending trends over time, month-over-month comparison, net worth tracking, and income analysis.

## Complexity Estimate
**MEDIUM-HIGH**

## Estimated Effort
50-65 minutes

## Dependencies
**Depends on:** Builder-3 (Accounts for net worth), Builder-5 (Transactions), Builder-6 (Budgets)
**Blocks:** None (final feature)

## Success Criteria
- [ ] Dashboard displays net worth
- [ ] Dashboard shows monthly income vs expenses
- [ ] Dashboard shows top spending categories (current month)
- [ ] Dashboard shows recent transactions
- [ ] Dashboard shows budget status summary
- [ ] Analytics page shows spending by category pie chart
- [ ] Analytics page shows spending trends line chart
- [ ] Analytics page shows month-over-month bar chart
- [ ] Analytics page shows income sources breakdown
- [ ] Custom date range selection for all charts

## Files to Create

### tRPC Router
- `src/server/api/routers/analytics.router.ts` - All analytics data procedures

### UI Components
- `src/components/dashboard/NetWorthCard.tsx` - Display net worth
- `src/components/dashboard/IncomeVsExpensesCard.tsx` - Monthly comparison
- `src/components/dashboard/TopCategoriesCard.tsx` - Top 5 spending categories
- `src/components/dashboard/RecentTransactionsCard.tsx` - Last 5 transactions
- `src/components/dashboard/BudgetSummaryCard.tsx` - Budget status overview

### Chart Components
- `src/components/analytics/SpendingByCategoryChart.tsx` - Pie chart (Recharts)
- `src/components/analytics/SpendingTrendsChart.tsx` - Line chart
- `src/components/analytics/MonthOverMonthChart.tsx` - Bar chart
- `src/components/analytics/IncomeSourcesChart.tsx` - Pie chart
- `src/components/analytics/NetWorthChart.tsx` - Line chart over time

### Pages
- `src/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `src/app/(dashboard)/analytics/page.tsx` - Analytics page with charts

### Utilities
- `src/lib/chartUtils.ts` - Chart data formatting utilities

## Implementation Notes

### Analytics Router Structure

#### 1. Dashboard Summary
```typescript
dashboardSummary: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id

  // Parallel queries for performance
  const [
    accounts,
    currentMonthTransactions,
    budgets,
    recentTransactions,
  ] = await Promise.all([
    ctx.prisma.account.findMany({
      where: { userId, isActive: true },
    }),
    ctx.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date()),
        },
      },
      include: { category: true },
    }),
    ctx.prisma.budget.findMany({
      where: {
        userId,
        month: format(new Date(), 'yyyy-MM'),
      },
    }),
    ctx.prisma.transaction.findMany({
      where: { userId },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ])

  const netWorth = accounts.reduce((sum, acc) => sum + acc.balance.toNumber(), 0)

  const income = currentMonthTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount.toNumber(), 0)

  const expenses = Math.abs(
    currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount.toNumber(), 0)
  )

  const categorySpending = Object.entries(
    currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        const cat = t.category.name
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount.toNumber())
        return acc
      }, {} as Record<string, number>)
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }))

  return {
    netWorth,
    income,
    expenses,
    topCategories: categorySpending,
    recentTransactions,
    budgetCount: budgets.length,
  }
})
```

#### 2. Spending by Category
```typescript
spendingByCategory: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
  }))
  .query(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        date: { gte: input.startDate, lte: input.endDate },
        amount: { lt: 0 }, // Only expenses
      },
      include: { category: true },
    })

    const categoryTotals = transactions.reduce((acc, txn) => {
      const cat = txn.category.name
      const color = txn.category.color || '#9ca3af'

      if (!acc[cat]) {
        acc[cat] = { category: cat, amount: 0, color }
      }
      acc[cat].amount += Math.abs(txn.amount.toNumber())
      return acc
    }, {} as Record<string, { category: string; amount: number; color: string }>)

    return Object.values(categoryTotals).sort((a, b) => b.amount - a.amount)
  })
```

#### 3. Spending Trends
```typescript
spendingTrends: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
    groupBy: z.enum(['day', 'week', 'month']).default('month'),
  }))
  .query(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        date: { gte: input.startDate, lte: input.endDate },
        amount: { lt: 0 },
      },
      orderBy: { date: 'asc' },
    })

    const grouped = transactions.reduce((acc, txn) => {
      const key = format(txn.date, input.groupBy === 'day' ? 'yyyy-MM-dd' :
                                      input.groupBy === 'week' ? 'yyyy-ww' :
                                      'yyyy-MM')
      acc[key] = (acc[key] || 0) + Math.abs(txn.amount.toNumber())
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([date, amount]) => ({
      date,
      amount,
    }))
  })
```

#### 4. Month-over-Month Comparison
```typescript
monthOverMonth: protectedProcedure
  .input(z.object({
    months: z.number().min(3).max(12).default(6),
  }))
  .query(async ({ ctx, input }) => {
    const months = Array.from({ length: input.months }, (_, i) => {
      const date = subMonths(new Date(), input.months - 1 - i)
      return format(date, 'yyyy-MM')
    })

    const data = await Promise.all(
      months.map(async (month) => {
        const [year, monthNum] = month.split('-').map(Number)
        const startDate = startOfMonth(new Date(year, monthNum - 1))
        const endDate = endOfMonth(new Date(year, monthNum - 1))

        const result = await ctx.prisma.transaction.aggregate({
          where: {
            userId: ctx.session.user.id,
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        })

        const total = result._sum.amount?.toNumber() || 0
        const income = total > 0 ? total : 0
        const expenses = total < 0 ? Math.abs(total) : 0

        return {
          month: format(new Date(year, monthNum - 1), 'MMM yyyy'),
          income,
          expenses,
        }
      })
    )

    return data
  })
```

#### 5. Net Worth Over Time
```typescript
netWorthHistory: protectedProcedure.query(async ({ ctx }) => {
  // For MVP, calculate current net worth only
  // Post-MVP: Store snapshots daily/weekly

  const accounts = await ctx.prisma.account.findMany({
    where: { userId: ctx.session.user.id, isActive: true },
  })

  const currentNetWorth = accounts.reduce(
    (sum, acc) => sum + acc.balance.toNumber(),
    0
  )

  // For MVP, show single data point
  // TODO: Store historical snapshots
  return [
    { date: format(new Date(), 'yyyy-MM-dd'), value: currentNetWorth },
  ]
})
```

### Chart Patterns

#### Pie Chart (Recharts)
```typescript
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export function SpendingByCategoryChart({
  data
}: {
  data: { category: string; amount: number; color: string }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="amount"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

#### Line Chart (Recharts)
```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function SpendingTrendsChart({
  data
}: {
  data: { date: string; amount: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spending']}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="hsl(142, 76%, 36%)"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

#### Bar Chart (Recharts)
```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function MonthOverMonthChart({
  data
}: {
  data: { month: string; income: number; expenses: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
        <Legend />
        <Bar dataKey="income" fill="hsl(142, 76%, 36%)" name="Income" />
        <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" name="Expenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Dashboard Layout Pattern
```typescript
// dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <NetWorthCard />
        <IncomeVsExpensesCard />
        <TopCategoriesCard />
        <BudgetSummaryCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingTrendsChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactionsCard />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Testing Requirements

### Unit Tests
- Chart data formatting utilities
- Date range generation
- Currency aggregation

### Integration Tests
- tRPC analytics.dashboardSummary returns correct data
- tRPC analytics.spendingByCategory aggregates correctly
- tRPC analytics.monthOverMonth calculates 6 months correctly

### E2E Tests
- Dashboard loads without errors
- Charts display with data
- Date range picker updates charts

### Coverage Target
80%+

## Potential Issues & Solutions

### Issue: Chart Performance with Large Datasets
**Solution:** Limit data points (weekly instead of daily for long ranges). Use Recharts ResponsiveContainer. Lazy load charts with dynamic imports.

### Issue: Empty State Handling
**Solution:** Show friendly empty states when no data exists. Suggest actions (e.g., "Connect a bank account to see spending trends").

### Issue: Mobile Chart Responsiveness
**Solution:** Reduce chart height on mobile. Simplify axis labels. Consider alternative visualizations (progress bars instead of pie charts).

---

# Builder-8: Goals & Planning

## Scope
Savings goals, debt payoff tracking, progress visualization, projected completion dates, and goal milestones.

## Complexity Estimate
**MEDIUM**

## Estimated Effort
40-50 minutes

## Dependencies
**Depends on:** Builder-3 (Accounts for linking), Builder-5 (Transactions for progress tracking)
**Blocks:** None (final feature)

## Success Criteria
- [ ] User can create savings goals with target amount and date
- [ ] User can track goal progress
- [ ] Goals show projected completion date based on current savings rate
- [ ] Goals can be linked to specific accounts
- [ ] User can manually update goal progress
- [ ] Goal types: Savings, Debt Payoff, Investment
- [ ] Visual progress indicators
- [ ] Goal completion celebration

## Files to Create

### Prisma Schema Addition
- Append to `prisma/schema.prisma` - Goal model and GoalType enum

### tRPC Router
- `src/server/api/routers/goals.router.ts` - Goal CRUD and progress calculations

### UI Components
- `src/components/goals/GoalForm.tsx` - Create/edit goal
- `src/components/goals/GoalCard.tsx` - Display goal with progress
- `src/components/goals/GoalList.tsx` - List all goals
- `src/components/goals/GoalProgressChart.tsx` - Progress visualization
- `src/components/goals/CompletedGoalCelebration.tsx` - Celebration modal

### Pages
- `src/app/(dashboard)/goals/page.tsx` - Goals list page
- `src/app/(dashboard)/goals/[id]/page.tsx` - Goal detail page

## Implementation Notes

### Prisma Schema Pattern
```prisma
model Goal {
  id              String    @id @default(cuid())
  userId          String
  name            String
  targetAmount    Decimal   @db.Decimal(15, 2)
  currentAmount   Decimal   @db.Decimal(15, 2) @default(0)
  targetDate      DateTime
  linkedAccountId String?
  type            GoalType  @default(SAVINGS)
  isCompleted     Boolean   @default(false)
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  linkedAccount Account? @relation(fields: [linkedAccountId], references: [id])

  @@index([userId])
  @@index([linkedAccountId])
}

enum GoalType {
  SAVINGS
  DEBT_PAYOFF
  INVESTMENT
}
```

### Key Router Procedures

#### 1. Create Goal
```typescript
create: protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).default(0),
    targetDate: z.date(),
    linkedAccountId: z.string().optional(),
    type: z.enum(['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT']).default('SAVINGS'),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.goal.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        targetDate: input.targetDate,
        linkedAccountId: input.linkedAccountId,
        type: input.type,
      },
      include: { linkedAccount: true },
    })
  })
```

#### 2. Update Progress
```typescript
updateProgress: protectedProcedure
  .input(z.object({
    goalId: z.string(),
    currentAmount: z.number().min(0),
  }))
  .mutation(async ({ ctx, input }) => {
    const goal = await ctx.prisma.goal.findUnique({
      where: { id: input.goalId },
    })

    if (!goal || goal.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    const isCompleted = input.currentAmount >= goal.targetAmount.toNumber()

    return ctx.prisma.goal.update({
      where: { id: input.goalId },
      data: {
        currentAmount: input.currentAmount,
        isCompleted,
        completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt,
      },
    })
  })
```

#### 3. Goal Projections
```typescript
projections: protectedProcedure
  .input(z.object({ goalId: z.string() }))
  .query(async ({ ctx, input }) => {
    const goal = await ctx.prisma.goal.findUnique({
      where: { id: input.goalId },
      include: { linkedAccount: true },
    })

    if (!goal || goal.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    const remaining = goal.targetAmount.toNumber() - goal.currentAmount.toNumber()
    const daysUntilTarget = differenceInDays(goal.targetDate, new Date())

    // Calculate recent savings rate (last 90 days)
    const ninetyDaysAgo = subDays(new Date(), 90)

    let savingsRate = 0
    if (goal.linkedAccountId) {
      const deposits = await ctx.prisma.transaction.aggregate({
        where: {
          userId: ctx.session.user.id,
          accountId: goal.linkedAccountId,
          date: { gte: ninetyDaysAgo },
          amount: { gt: 0 }, // Only deposits
        },
        _sum: { amount: true },
      })

      savingsRate = (deposits._sum.amount?.toNumber() || 0) / 90 // Per day
    }

    const projectedDays = savingsRate > 0 ? Math.ceil(remaining / savingsRate) : null
    const projectedDate = projectedDays ? addDays(new Date(), projectedDays) : null
    const onTrack = projectedDate ? projectedDate <= goal.targetDate : false

    const percentComplete = (goal.currentAmount.toNumber() / goal.targetAmount.toNumber()) * 100

    return {
      goal,
      remaining,
      daysUntilTarget,
      projectedDate,
      onTrack,
      percentComplete,
      suggestedMonthlyContribution: remaining / (daysUntilTarget / 30),
    }
  })
```

#### 4. List Goals
```typescript
list: protectedProcedure
  .input(z.object({
    includeCompleted: z.boolean().default(false),
  }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.goal.findMany({
      where: {
        userId: ctx.session.user.id,
        ...(input.includeCompleted ? {} : { isCompleted: false }),
      },
      include: { linkedAccount: true },
      orderBy: { targetDate: 'asc' },
    })
  })
```

### Goal Progress Calculation
```typescript
function calculateGoalProgress(goal: Goal) {
  const current = goal.currentAmount.toNumber()
  const target = goal.targetAmount.toNumber()
  const percentage = (current / target) * 100

  return {
    percentage: Math.min(percentage, 100),
    remaining: target - current,
    isComplete: current >= target,
  }
}
```

### Projected Completion Date
```typescript
function projectCompletionDate(
  currentAmount: number,
  targetAmount: number,
  monthlySavingsRate: number
) {
  if (monthlySavingsRate <= 0) return null

  const remaining = targetAmount - currentAmount
  const monthsRequired = Math.ceil(remaining / monthlySavingsRate)

  return addMonths(new Date(), monthsRequired)
}
```

### Goal Types & Icons
```typescript
const GOAL_TYPE_CONFIG = {
  SAVINGS: {
    icon: 'PiggyBank',
    color: 'hsl(142, 76%, 36%)',
    label: 'Savings Goal',
  },
  DEBT_PAYOFF: {
    icon: 'TrendingDown',
    color: 'hsl(0, 72%, 51%)',
    label: 'Debt Payoff',
  },
  INVESTMENT: {
    icon: 'TrendingUp',
    color: 'hsl(217, 91%, 60%)',
    label: 'Investment Goal',
  },
}
```

### Celebration Component
```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Confetti from 'react-confetti'

export function GoalCompletedCelebration({
  goal,
  open,
  onClose
}: {
  goal: Goal
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <Confetti recycle={false} numberOfPieces={200} />
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Congratulations!
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <p className="text-lg">You've completed your goal:</p>
          <p className="text-2xl font-bold text-primary">{goal.name}</p>
          <p className="text-muted-foreground">
            ${goal.targetAmount.toNumber().toLocaleString()} achieved!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Testing Requirements

### Unit Tests
- Goal progress calculation
- Projected completion date calculation
- Percentage calculation

### Integration Tests
- tRPC goals.create validates required fields
- tRPC goals.projections calculates correctly
- tRPC goals.updateProgress marks as completed when threshold reached

### E2E Tests
- Create goal flow
- Update progress
- View goal projections

### Coverage Target
85%+

## Potential Issues & Solutions

### Issue: Savings Rate Calculation Accuracy
**Solution:** Calculate from linked account's deposit history. Use 90-day rolling average. Allow manual override if calculation seems off.

### Issue: Goal Completion Detection
**Solution:** Check on every progress update. Trigger celebration modal on first completion. Send email notification (optional).

### Issue: Debt Payoff vs Savings Goal UI
**Solution:** For debt payoff goals, display "amount paid" instead of "amount saved". Use red/orange colors for debt, green for savings.

---

## Integration Notes

### Schema Merging Order
1. **After Phase 1:** Merge Builder-1, Builder-2, Builder-3 schemas → Run `npx prisma migrate dev`
2. **After Phase 2:** Merge Builder-4, Builder-5, Builder-6 schemas → Run migrations
3. **After Phase 3:** Merge Builder-7, Builder-8 schemas → Final migrations

### Root tRPC Router Integration
```typescript
// src/server/api/root.ts
import { router } from './trpc'
import { authRouter } from './routers/auth.router'
import { accountsRouter } from './routers/accounts.router'
import { transactionsRouter } from './routers/transactions.router'
import { budgetsRouter } from './routers/budgets.router'
import { analyticsRouter } from './routers/analytics.router'
import { goalsRouter } from './routers/goals.router'
import { categoriesRouter } from './routers/categories.router'
import { plaidRouter } from './routers/plaid.router'

export const appRouter = router({
  auth: authRouter,
  accounts: accountsRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  categories: categoriesRouter,
  plaid: plaidRouter,
})

export type AppRouter = typeof appRouter
```

### Shared Files Coordination

#### Files Multiple Builders Touch
- `prisma/schema.prisma` - All builders append models (no conflicts if models unique)
- `src/server/api/root.ts` - Merge router imports (no conflicts if namespaces unique)
- `package.json` - Merge dependencies (deduplicate versions)
- `src/lib/constants.ts` - Shared constants (coordinate naming)

#### Conflict Prevention Strategy
- Each builder creates distinct models (no duplicate model names)
- Each router has unique namespace (auth, accounts, transactions, etc.)
- Use absolute imports (`@/lib/utils`) consistently
- Follow naming conventions strictly

### Dependency Installation

**Phase 1 Dependencies:**
```bash
npm install next@14.2.15 react@18.3.1 react-dom@18.3.1 typescript@5.3.3
npm install @prisma/client@5.22.0 prisma@5.22.0
npm install @trpc/server@10.45.2 @trpc/client@10.45.2 @trpc/react-query@10.45.2 @trpc/next@10.45.2
npm install @tanstack/react-query@5.60.5 superjson@2.2.1
npm install next-auth@5.0.0-beta.25 @auth/prisma-adapter@2.7.4
npm install bcryptjs@2.4.3 zod@3.23.8
npm install react-hook-form@7.53.2 @hookform/resolvers@3.9.1
npm install tailwindcss@3.4.1 tailwindcss-animate@1.0.7
npm install class-variance-authority@0.7.0 clsx@2.1.0 tailwind-merge@2.2.0
npm install lucide-react@0.460.0
npm install date-fns@3.6.0
```

**Phase 2 Dependencies:**
```bash
npm install plaid@28.0.0 react-plaid-link@3.6.0
npm install @anthropic-ai/sdk@0.32.1
npm install resend@4.0.1 @react-email/components@0.0.25
```

**Phase 3 Dependencies:**
```bash
npm install recharts@2.12.7
```

### Testing Strategy

#### Unit Tests
- Run after each builder completes
- Target: 80%+ coverage per builder

#### Integration Tests
- Run after each phase completes
- Test cross-builder interactions (e.g., transactions + budgets)

#### E2E Tests
- Run after final integration
- Test complete user flows across all features

### Validation Checklist

**After Phase 1:**
- [ ] User can register and login
- [ ] Default categories are seeded
- [ ] Manual accounts can be created

**After Phase 2:**
- [ ] Plaid account connection works
- [ ] Transactions sync from Plaid
- [ ] Transactions are categorized by AI
- [ ] Budgets calculate progress correctly

**After Phase 3:**
- [ ] Dashboard displays all metrics
- [ ] Analytics charts render
- [ ] Goals can be created and tracked

**Final Integration:**
- [ ] All 15 MVP success criteria met (from overview.md)
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Mobile responsive
- [ ] Ready for deployment

---

## Builder Execution Summary

| Phase | Builder | Complexity | Duration | Can Split? |
|-------|---------|------------|----------|------------|
| 1 | Builder-1 (Auth) | MEDIUM | 45-60 min | No |
| 1 | Builder-2 (Categories) | LOW | 30-45 min | No |
| 1 | Builder-3 (Accounts) | LOW-MEDIUM | 30-45 min | No |
| 2 | Builder-4 (Plaid) | HIGH | 60-75 min | If needed |
| 2 | Builder-5 (Transactions) | VERY HIGH | 75-90 min | **PRE-SPLIT** |
| 2 | ├─ Sub-5A (CRUD) | MEDIUM | 20-25 min | - |
| 2 | ├─ Sub-5B (Plaid Sync) | MEDIUM | 20-25 min | - |
| 2 | ├─ Sub-5C (AI Categorization) | MEDIUM | 20-25 min | - |
| 2 | └─ Sub-5D (UI & Filters) | MEDIUM | 15-20 min | - |
| 2 | Builder-6 (Budgets) | MEDIUM-HIGH | 45-60 min | If needed |
| 3 | Builder-7 (Analytics) | MEDIUM-HIGH | 50-65 min | If needed |
| 3 | Builder-8 (Goals) | MEDIUM | 40-50 min | No |

**Total Estimated Time:** 3-4 hours (with parallel execution in Phase 1)

---

**Builder Tasks Complete** - All builders have clear scopes, dependencies, and success criteria. Ready for execution.
