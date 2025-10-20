# Code Patterns & Conventions - Wealth Personal Finance Dashboard

**This file contains copy-pasteable code patterns for all common operations. Follow these patterns exactly to ensure consistency and successful integration.**

---

## File Structure

```
wealth/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Auto-generated migration files
│   └── seed.ts                 # Default categories seed
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register, reset-password)
│   │   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   │   ├── trpc/[trpc]/route.ts         # tRPC handler
│   │   │   └── webhooks/plaid/route.ts      # Plaid webhook
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Tailwind imports
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── auth/               # Auth components
│   │   ├── accounts/           # Account components
│   │   ├── transactions/       # Transaction components
│   │   ├── budgets/            # Budget components
│   │   ├── analytics/          # Analytics components
│   │   ├── goals/              # Goal components
│   │   └── shared/             # Shared components (Sidebar, Header)
│   ├── server/
│   │   ├── api/
│   │   │   ├── root.ts         # Root tRPC router
│   │   │   ├── trpc.ts         # tRPC setup
│   │   │   └── routers/        # Feature routers
│   │   └── services/           # Business logic services
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── trpc.ts             # tRPC client hooks
│   │   ├── auth.ts             # NextAuth config
│   │   ├── encryption.ts       # Encryption utilities
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── .env.local                  # Environment variables (gitignored)
├── .env.example                # Template for environment variables
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

---

## Naming Conventions

### Files and Folders

- **Components:** PascalCase with feature prefix: `TransactionList.tsx`, `BudgetCard.tsx`
- **Pages:** lowercase: `page.tsx`, `layout.tsx`
- **Utilities:** camelCase: `formatCurrency.ts`, `dateUtils.ts`
- **Services:** camelCase with `.service.ts`: `plaid.service.ts`, `categorize.service.ts`
- **tRPC Routers:** camelCase with `.router.ts`: `transactions.router.ts`, `budgets.router.ts`
- **Constants:** SCREAMING_SNAKE_CASE: `MAX_RETRIES`, `DEFAULT_CATEGORIES`

### Variables and Functions

- **Variables:** camelCase: `userName`, `transactionCount`, `isLoading`
- **Functions:** camelCase: `fetchTransactions()`, `calculateBudgetProgress()`
- **React Components:** PascalCase: `TransactionList`, `BudgetCard`
- **Types/Interfaces:** PascalCase: `Transaction`, `BudgetWithCategory`
- **Constants:** SCREAMING_SNAKE_CASE: `MAX_TRANSACTION_AMOUNT`

### Database Models

- **Models:** PascalCase singular: `User`, `Transaction`, `Budget`
- **Fields:** camelCase: `userId`, `createdAt`, `plaidTransactionId`
- **Enums:** PascalCase: `AccountType`, `GoalType`
- **Enum Values:** SCREAMING_SNAKE_CASE: `CHECKING`, `SAVINGS`, `DEBT_PAYOFF`

---

## Prisma Schema Patterns

### Complete Schema Template

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================================
// USER & AUTH
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  image         String?
  currency      String    @default("USD")
  timezone      String    @default("America/New_York")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts           Account[]
  transactions       Transaction[]
  budgets            Budget[]
  goals              Goal[]
  categories         Category[]
  oauthAccounts      OAuthAccount[]
  passwordResetTokens PasswordResetToken[]

  @@index([email])
}

model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ============================================================================
// ACCOUNTS
// ============================================================================

model Account {
  id               String      @id @default(cuid())
  userId           String
  type             AccountType
  name             String
  institution      String
  balance          Decimal     @db.Decimal(15, 2)
  currency         String      @default("USD")
  plaidAccountId   String?     @unique
  plaidAccessToken String?     @db.Text
  isManual         Boolean     @default(false)
  isActive         Boolean     @default(true)
  lastSynced       DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  goals        Goal[]

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

// ============================================================================
// TRANSACTIONS
// ============================================================================

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
  isManual           Boolean  @default(false)
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

// ============================================================================
// CATEGORIES
// ============================================================================

model Category {
  id        String   @id @default(cuid())
  userId    String?
  name      String
  icon      String?
  color     String?
  parentId  String?
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

// ============================================================================
// BUDGETS
// ============================================================================

model Budget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  amount     Decimal  @db.Decimal(15, 2)
  month      String
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
  threshold Int
  sent      Boolean   @default(false)
  sentAt    DateTime?
  createdAt DateTime  @default(now())

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@index([budgetId])
}

// ============================================================================
// GOALS
// ============================================================================

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

### Migration Commands

```bash
# Create a new migration
npx prisma migrate dev --name add_transactions

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client after schema changes
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Database Query Patterns

### Prisma Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Query Examples

```typescript
// Get user with relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    accounts: true,
    categories: true,
  },
})

// Get transactions with pagination
const transactions = await prisma.transaction.findMany({
  where: {
    userId: userId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  },
  include: {
    category: true,
    account: true,
  },
  orderBy: {
    date: 'desc',
  },
  take: 50,
  skip: page * 50,
})

// Aggregation for analytics
const spendingByCategory = await prisma.transaction.groupBy({
  by: ['categoryId'],
  where: {
    userId: userId,
    date: { gte: startDate, lte: endDate },
    amount: { lt: 0 }, // expenses only
  },
  _sum: {
    amount: true,
  },
  orderBy: {
    _sum: {
      amount: 'desc',
    },
  },
})

// Budget progress calculation
const budgetProgress = await prisma.budget.findUnique({
  where: { id: budgetId },
  include: {
    category: {
      include: {
        transactions: {
          where: {
            date: {
              gte: startOfMonth(new Date()),
              lte: endOfMonth(new Date()),
            },
          },
        },
      },
    },
  },
})

// Upsert pattern (for Plaid sync)
await prisma.transaction.upsert({
  where: { plaidTransactionId: plaidTxn.transaction_id },
  create: {
    userId: userId,
    accountId: accountId,
    plaidTransactionId: plaidTxn.transaction_id,
    date: new Date(plaidTxn.date),
    amount: plaidTxn.amount,
    payee: plaidTxn.merchant_name || plaidTxn.name,
    categoryId: categoryId,
    isManual: false,
  },
  update: {
    amount: plaidTxn.amount,
    payee: plaidTxn.merchant_name || plaidTxn.name,
  },
})
```

---

## tRPC Patterns

### tRPC Setup

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts
  const session = await getServerSession(req, res, authOptions)

  return {
    session,
    prisma,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})
```

### tRPC Router Example

```typescript
// src/server/api/routers/transactions.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { startOfMonth, endOfMonth } from 'date-fns'

export const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        categoryId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.accountId && { accountId: input.accountId }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.startDate &&
            input.endDate && {
              date: {
                gte: input.startDate,
                lte: input.endDate,
              },
            }),
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: {
            id: input.cursor,
          },
          skip: 1,
        }),
      })

      let nextCursor: string | undefined = undefined
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop()
        nextCursor = nextItem!.id
      }

      return {
        transactions,
        nextCursor,
      }
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const transaction = await ctx.prisma.transaction.findUnique({
      where: { id: input.id },
      include: {
        category: true,
        account: true,
      },
    })

    if (!transaction || transaction.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    return transaction
  }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        date: z.date(),
        amount: z.number(),
        payee: z.string().min(1),
        categoryId: z.string(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.create({
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
        include: {
          category: true,
          account: true,
        },
      })

      return transaction
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.date().optional(),
        amount: z.number().optional(),
        payee: z.string().optional(),
        categoryId: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const transaction = await ctx.prisma.transaction.update({
        where: { id: input.id },
        data: {
          ...(input.date && { date: input.date }),
          ...(input.amount && { amount: input.amount }),
          ...(input.payee && { payee: input.payee }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.tags && { tags: input.tags }),
        },
        include: {
          category: true,
          account: true,
        },
      })

      return transaction
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.transaction.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.transaction.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})
```

### Root tRPC Router

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

export const appRouter = router({
  auth: authRouter,
  accounts: accountsRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  categories: categoriesRouter,
})

export type AppRouter = typeof appRouter
```

### tRPC API Route Handler

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`tRPC failed on ${path ?? '<no-path>'}:`, error.message)
          }
        : undefined,
  })

export { handler as GET, handler as POST }
```

### tRPC Client Setup

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import { type AppRouter } from '@/server/api/root'

export const trpc = createTRPCReact<AppRouter>()
```

### tRPC Provider

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'
import superjson from 'superjson'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
```

---

## NextAuth.js Patterns

### NextAuth Configuration

```typescript
// src/lib/auth.ts
import { PrismaAdapter } from '@auth/prisma-adapter'
import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { z } from 'zod'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials)

        if (!parsedCredentials.success) return null

        const { email, password } = parsedCredentials.data

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
}
```

### NextAuth API Route

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

### Auth Middleware (Route Protection)

```typescript
// middleware.ts (in project root)
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### Get Session in Server Component

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return <div>Welcome, {session.user.name}!</div>
}
```

### Use Session in Client Component

```typescript
'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export function UserNav() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return <button onClick={() => signIn()}>Sign In</button>
  }

  return (
    <div>
      <p>{session.user.email}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

---

## Plaid Integration Patterns

### Plaid Service

```typescript
// src/server/services/plaid.service.ts
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: userId,
    },
    client_name: 'Wealth',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/plaid`,
  })

  return response.data.link_token
}

export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  })

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  }
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  })

  return response.data.accounts
}

export async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })

  return response.data.transactions
}
```

### Encryption Utilities

```typescript
// src/lib/encryption.ts
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

### Plaid Link Component

```typescript
// src/components/accounts/PlaidLinkButton.tsx
'use client'

import { usePlaidLink } from 'react-plaid-link'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export function PlaidLinkButton() {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: linkTokenData } = trpc.accounts.createPlaidLinkToken.useQuery()

  const exchangeToken = trpc.accounts.exchangePlaidToken.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Bank account connected successfully',
      })
      utils.accounts.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const { open, ready } = usePlaidLink({
    token: linkTokenData?.linkToken ?? null,
    onSuccess: (publicToken, metadata) => {
      exchangeToken.mutate({
        publicToken,
        institutionName: metadata.institution?.name ?? 'Unknown',
      })
    },
    onExit: (error) => {
      if (error) {
        toast({
          title: 'Error',
          description: error.error_message,
          variant: 'destructive',
        })
      }
    },
  })

  return (
    <Button onClick={() => open()} disabled={!ready || exchangeToken.isLoading}>
      {exchangeToken.isLoading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  )
}
```

### Plaid Webhook Handler

```typescript
// src/app/api/webhooks/plaid/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTransactions } from '@/server/services/plaid.service'
import { decrypt } from '@/lib/encryption'
import { subDays, format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { webhook_type, webhook_code, item_id } = body

    if (webhook_type === 'TRANSACTIONS') {
      const account = await prisma.account.findFirst({
        where: { plaidAccountId: item_id },
      })

      if (!account || !account.plaidAccessToken) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const accessToken = decrypt(account.plaidAccessToken)
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')

      const transactions = await getTransactions(accessToken, startDate, endDate)

      // Import transactions (to be implemented by builder)
      for (const txn of transactions) {
        await prisma.transaction.upsert({
          where: { plaidTransactionId: txn.transaction_id },
          create: {
            userId: account.userId,
            accountId: account.id,
            plaidTransactionId: txn.transaction_id,
            date: new Date(txn.date),
            amount: -txn.amount, // Plaid uses positive for debits
            payee: txn.merchant_name || txn.name,
            categoryId: 'default-category-id', // TODO: Categorize
            isManual: false,
          },
          update: {
            amount: -txn.amount,
            payee: txn.merchant_name || txn.name,
          },
        })
      }

      await prisma.account.update({
        where: { id: account.id },
        data: { lastSynced: new Date() },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Plaid webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
```

---

## Claude AI Categorization Pattern

### Claude Service

```typescript
// src/server/services/categorize.service.ts
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface TransactionToCategorize {
  id: string
  payee: string
  amount: number
}

export async function categorizeTransactions(
  transactions: TransactionToCategorize[],
  availableCategories: string[]
) {
  if (transactions.length === 0) return []

  const transactionList = transactions
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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]'

    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : '[]'

    const categorizations = JSON.parse(jsonText)

    return transactions.map((txn, i) => {
      const cat = categorizations.find((c: any) => c.number === i + 1)
      return {
        transactionId: txn.id,
        category: cat?.category || 'Miscellaneous',
      }
    })
  } catch (error) {
    console.error('Claude categorization error:', error)
    // Fallback to Miscellaneous on error
    return transactions.map((txn) => ({
      transactionId: txn.id,
      category: 'Miscellaneous',
    }))
  }
}

export async function categorizeSingleTransaction(
  payee: string,
  amount: number,
  availableCategories: string[]
): Promise<string> {
  const result = await categorizeTransactions(
    [{ id: 'temp', payee, amount }],
    availableCategories
  )
  return result[0]?.category || 'Miscellaneous'
}
```

---

## React Component Patterns

### Server Component (Data Fetching)

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { NetWorthCard } from '@/components/analytics/NetWorthCard'
import { RecentTransactions } from '@/components/transactions/RecentTransactions'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Parallel data fetching
  const [accounts, recentTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id, isActive: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take: 10,
    }),
  ])

  const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <NetWorthCard initialValue={netWorth} />

      <RecentTransactions transactions={recentTransactions} />
    </div>
  )
}
```

### Client Component with tRPC

```typescript
// src/components/transactions/TransactionList.tsx
'use client'

import { trpc } from '@/lib/trpc'
import { TransactionCard } from './TransactionCard'
import { Skeleton } from '@/components/ui/skeleton'

interface TransactionListProps {
  accountId?: string
  categoryId?: string
}

export function TransactionList({ accountId, categoryId }: TransactionListProps) {
  const { data, isLoading, error } = trpc.transactions.list.useQuery({
    accountId,
    categoryId,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Error loading transactions: {error.message}</p>
      </div>
    )
  }

  if (!data?.transactions || data.transactions.length === 0) {
    return (
      <div className="rounded-lg border border-muted bg-muted/10 p-8 text-center">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.transactions.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  )
}
```

### Form Component with React Hook Form + Zod

```typescript
// src/components/transactions/AddTransactionForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account required'),
  date: z.string().min(1, 'Date required'),
  amount: z.number().positive('Amount must be positive'),
  payee: z.string().min(1, 'Payee required'),
  categoryId: z.string().min(1, 'Category required'),
  notes: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export function AddTransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: accounts } = trpc.accounts.list.useQuery()
  const { data: categories } = trpc.categories.list.useQuery()

  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Transaction created successfully' })
      utils.transactions.list.invalidate()
      utils.analytics.invalidate()
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
    },
  })

  const onSubmit = (data: TransactionFormData) => {
    createTransaction.mutate({
      ...data,
      date: new Date(data.date),
      amount: -Math.abs(data.amount), // Negative for expenses
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="accountId">Account</Label>
        <Select onValueChange={(value) => setValue('accountId', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.institution})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.accountId && (
          <p className="mt-1 text-sm text-red-600">{errors.accountId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
      </div>

      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="payee">Payee</Label>
        <Input id="payee" {...register('payee')} placeholder="e.g., Whole Foods" />
        {errors.payee && <p className="mt-1 text-sm text-red-600">{errors.payee.message}</p>}
      </div>

      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select onValueChange={(value) => setValue('categoryId', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input id="notes" {...register('notes')} placeholder="Add a note..." />
      </div>

      <Button type="submit" disabled={createTransaction.isLoading}>
        {createTransaction.isLoading ? 'Creating...' : 'Create Transaction'}
      </Button>
    </form>
  )
}
```

### Chart Component (Recharts)

```typescript
// src/components/analytics/SpendingByCategoryChart.tsx
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SpendingByCategoryChartProps {
  data: { category: string; amount: number; color: string }[]
}

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
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
        <Tooltip formatter={(value) => `$${Math.abs(Number(value)).toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

---

## Utility Patterns

### Currency Formatting

```typescript
// src/lib/utils.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Usage
formatCurrency(1234.56) // "$1,234.56"
formatCurrency(-45.00) // "-$45.00"
```

### Date Formatting

```typescript
import { format, formatDistance, formatRelative } from 'date-fns'

export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  return format(new Date(date), formatStr)
}

export function formatRelativeDate(date: Date | string): string {
  return formatRelative(new Date(date), new Date())
}

export function formatTimeAgo(date: Date | string): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

// Usage
formatDate(new Date(), 'yyyy-MM-dd') // "2025-01-15"
formatRelativeDate(new Date()) // "today at 10:30 AM"
formatTimeAgo(new Date('2025-01-10')) // "5 days ago"
```

### Class Name Utility (for conditional Tailwind classes)

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
cn(
  'base-class',
  isActive && 'active-class',
  isFocused ? 'focused-class' : 'unfocused-class'
)
```

---

## Error Handling Patterns

### tRPC Error Handling

```typescript
// In client component
const { mutate, error, isError } = trpc.transactions.create.useMutation({
  onError: (error) => {
    // Handle specific error codes
    if (error.data?.code === 'UNAUTHORIZED') {
      signIn()
    } else if (error.data?.zodError) {
      // Handle validation errors
      console.error('Validation errors:', error.data.zodError)
    } else {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  },
})
```

### API Error Handling

```typescript
// In tRPC procedure
import { TRPCError } from '@trpc/server'

.mutation(async ({ ctx, input }) => {
  try {
    // ... operation
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        })
      }
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: error,
    })
  }
})
```

---

## Testing Patterns

### Unit Test (Jest)

```typescript
// src/lib/__tests__/utils.test.ts
import { formatCurrency, formatDate } from '../utils'

describe('formatCurrency', () => {
  it('formats positive amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats negative amounts correctly', () => {
    expect(formatCurrency(-45.0)).toBe('-$45.00')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
})

describe('formatDate', () => {
  it('formats dates correctly', () => {
    const date = new Date('2025-01-15')
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-01-15')
  })
})
```

### E2E Test (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can sign up and log in', async ({ page }) => {
  // Navigate to sign-up page
  await page.goto('/auth/register')

  // Fill in registration form
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'SecurePassword123!')
  await page.fill('[name="name"]', 'Test User')
  await page.click('button[type="submit"]')

  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard')

  // Check for welcome message
  await expect(page.locator('text=Welcome, Test User')).toBeVisible()
})

test('user can connect Plaid account', async ({ page }) => {
  // Login first
  await page.goto('/auth/signin')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'SecurePassword123!')
  await page.click('button[type="submit"]')

  // Navigate to accounts
  await page.goto('/dashboard/accounts')

  // Click connect button
  await page.click('text=Connect Bank Account')

  // Plaid Link should open (in iframe)
  const plaidFrame = page.frameLocator('iframe[title*="Plaid"]')

  // Select test institution
  await plaidFrame.locator('text=Chase').click()

  // Enter test credentials
  await plaidFrame.fill('[placeholder*="Username"]', 'user_good')
  await plaidFrame.fill('[placeholder*="Password"]', 'pass_good')
  await plaidFrame.click('text=Submit')

  // Should see connected account
  await expect(page.locator('text=Chase')).toBeVisible({ timeout: 10000 })
})
```

---

## Import Order Convention

```typescript
// 1. External packages
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

// 2. Internal packages / absolute imports
import { trpc } from '@/lib/trpc'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

// 3. Components
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TransactionList } from '@/components/transactions/TransactionList'

// 4. Types
import { type Transaction } from '@prisma/client'
import { type AppRouter } from '@/server/api/root'

// 5. Relative imports (if any)
import { formatDate } from './utils'

// 6. Styles (if any)
import styles from './Component.module.css'
```

---

## Code Quality Standards

### TypeScript

- **No `any` types** - Use `unknown` and type guards instead
- **No non-null assertions (`!`)** - Handle null/undefined explicitly
- **Use `noUncheckedIndexedAccess`** - Always check array access
- **Prefer `interface` over `type`** for object shapes
- **Export types explicitly** - Don't rely on implicit exports

### React

- **Use Server Components by default** - Only add 'use client' when needed
- **Avoid prop drilling** - Use React Context for deeply nested state
- **Memoize expensive calculations** - Use `useMemo` for heavy computations
- **Destructure props** - Always destructure props in function signature
- **Use descriptive names** - `isLoading` not `loading`, `handleClick` not `click`

### Performance

- **Lazy load heavy components** - Use `dynamic()` from Next.js
- **Optimize images** - Use `next/image` component
- **Minimize client JS** - Keep Server Components when possible
- **Use React Query caching** - Set appropriate `staleTime` values
- **Cursor-based pagination** - For large lists (transactions)

### Security

- **Validate all inputs** - Use Zod schemas on frontend AND backend
- **Never log sensitive data** - No passwords, tokens, or PII in logs
- **Sanitize user input** - Prevent XSS attacks
- **Use HTTPS only** - Never send credentials over HTTP
- **Encrypt sensitive data** - Plaid tokens, passwords must be encrypted

---

**Patterns Complete** - Use these patterns as templates for all development. Copy-paste and adapt as needed.
