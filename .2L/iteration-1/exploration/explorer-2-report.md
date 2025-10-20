# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

The recommended tech stack (Next.js 14, TypeScript, Prisma, tRPC, NextAuth.js, Plaid, Claude API) is well-suited for this personal finance application. All technologies are production-ready, have strong ecosystems, and integrate cleanly. Key findings: (1) Next.js 14 App Router with Server Components will optimize bundle size for dashboard-heavy UI, (2) tRPC eliminates API contract drift and reduces boilerplate, (3) Plaid and Claude integrations are straightforward but require careful error handling, (4) Prisma provides excellent TypeScript DX with PostgreSQL. No major architectural concerns identified.

## Tech Stack Overview

### Core Framework: Next.js 14.2.x (App Router)

**Rationale:**
- **App Router** (stable since 13.4) provides React Server Components, reducing client bundle size for data-heavy dashboards
- **Server Actions** eliminate need for separate API route files for simple mutations
- **Built-in API routes** support tRPC integration
- **Streaming SSR** improves perceived performance for analytics pages
- **Edge Runtime** support for geographically distributed users
- **Vercel deployment** is zero-config with automatic HTTPS, CDN, and edge functions

**Version:** `next@14.2.15` (latest stable as of January 2025)

**Configuration Needs:**
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // For CSV exports
    },
  },
  // Plaid and Claude API calls from server
  serverRuntimeConfig: {
    plaidEnv: process.env.PLAID_ENV,
  },
}

module.exports = nextConfig
```

### Language: TypeScript 5.3+

**Rationale:**
- **Strict mode** catches errors at compile time, critical for financial data
- **Type inference** from Prisma schema eliminates manual type definitions
- **tRPC type-safety** end-to-end from database to frontend
- **Zod integration** for runtime validation matches TypeScript types

**Version:** `typescript@5.3.3`

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "dom", "dom.iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true, // Critical for array safety
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Database: PostgreSQL 15+ with Prisma 5.x

**Rationale:**
- **PostgreSQL** provides ACID guarantees essential for financial data
- **JSONB support** for flexible transaction metadata (tags, split details)
- **Prisma** generates type-safe client from schema
- **Migration system** tracks schema evolution
- **Connection pooling** handles serverless function cold starts
- **Row-level security** potential for future multi-user expansion

**Versions:**
- `prisma@5.22.0`
- `@prisma/client@5.22.0`

**Connection Strategy:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Critical Configuration:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations in serverless
}

// Enable full-text search for transaction payees
model Transaction {
  id String @id @default(cuid())
  payee String
  // ... other fields
  
  @@index([userId, date(sort: Desc)]) // Optimize transaction list
  @@index([plaidTransactionId]) // Dedupe Plaid imports
}
```

### API Layer: tRPC 10.x

**Rationale:**
- **End-to-end type safety** from database to React components
- **No code generation** - types inferred automatically
- **Smaller bundle** than REST + OpenAPI + Zod
- **React Query integration** provides caching, optimistic updates, background refetching
- **Error handling** typed and consistent
- **Middleware support** for authentication, logging, rate limiting

**Version:** `@trpc/server@10.45.2`, `@trpc/client@10.45.2`, `@trpc/react-query@10.45.2`, `@trpc/next@10.45.2`

**Architecture Pattern:**
```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { Context } from './context'
import superjson from 'superjson'

const t = initTRPC.context<Context>().create({
  transformer: superjson, // Handles Date objects, BigInt, etc.
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

**Router Organization:**
```
src/server/routers/
├── _app.ts          # Root router
├── auth.ts          # Authentication procedures
├── accounts.ts      # Account CRUD
├── transactions.ts  # Transaction management
├── budgets.ts       # Budget operations
├── goals.ts         # Goal tracking
├── analytics.ts     # Dashboard data
└── plaid.ts         # Plaid integration
```

### Authentication: NextAuth.js 5.x (Auth.js)

**Rationale:**
- **OAuth providers** (Google) built-in
- **Credential provider** for email/password
- **JWT sessions** work in serverless environment
- **Prisma adapter** syncs sessions to database
- **Type-safe** session access
- **CSRF protection** automatic

**Version:** `next-auth@5.0.0-beta.25` (v5 is production-ready as of Jan 2025)

**Configuration Pattern:**
```typescript
// auth.ts (v5 pattern)
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import { z } from 'zod'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)
        
        if (!parsedCredentials.success) return null
        
        const { email, password } = parsedCredentials.data
        const user = await prisma.user.findUnique({ where: { email } })
        
        if (!user || !user.password) return null
        
        const isValid = await compare(password, user.password)
        if (!isValid) return null
        
        return { id: user.id, email: user.email, name: user.name }
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
  },
})
```

**Security Enhancements:**
- Use `bcryptjs@2.4.3` with salt rounds of 12 for password hashing
- Store session tokens in HttpOnly cookies (default)
- CSRF tokens automatic in NextAuth v5
- Rate limit login attempts via tRPC middleware

### UI Framework: Tailwind CSS 3.x + shadcn/ui

**Rationale:**
- **Tailwind** provides utility-first CSS with zero runtime
- **shadcn/ui** gives accessible, customizable components without bloat
- **Radix UI** primitives (via shadcn) handle accessibility
- **Class Variance Authority (CVA)** for component variants
- **tailwind-merge** prevents class conflicts
- **No component library lock-in** - components are copied to your codebase

**Versions:**
- `tailwindcss@3.4.1`
- `tailwindcss-animate@1.0.7`
- `class-variance-authority@0.7.0`
- `clsx@2.1.0`
- `tailwind-merge@2.2.0`

**shadcn/ui Components Needed:**
- Button, Input, Label, Textarea (forms)
- Card (dashboard widgets)
- Dialog, Sheet (modals, mobile menu)
- Select, Combobox (category selection)
- Table (transaction list)
- Progress (budget indicators)
- Badge (transaction tags)
- Toast (notifications)
- Calendar, Popover (date picker)
- Tabs (analytics views)
- Chart (wrapper for Recharts)

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label card dialog select table progress badge toast calendar tabs
```

**Theme Configuration:**
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Wealth app calm color scheme
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(142, 76%, 36%)', // Calm green for positive
          foreground: 'hsl(0, 0%, 100%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 40%, 96%)',
          foreground: 'hsl(215, 16%, 47%)',
        },
        accent: {
          DEFAULT: 'hsl(210, 40%, 90%)',
          foreground: 'hsl(222, 47%, 11%)',
        },
        warning: {
          DEFAULT: 'hsl(38, 92%, 50%)', // Gentle orange, not alarming
          foreground: 'hsl(0, 0%, 100%)',
        },
        danger: {
          DEFAULT: 'hsl(0, 72%, 51%)', // Only for critical issues
          foreground: 'hsl(0, 0%, 100%)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### Charts: Recharts 2.x

**Rationale:**
- **React-native** - built for React, not jQuery wrapper
- **Composable** - build custom charts from primitives
- **Responsive** by default
- **TypeScript support** excellent
- **Smaller bundle** than Chart.js when tree-shaken
- **SVG-based** for crisp rendering at any scale

**Version:** `recharts@2.12.7`

**Chart Components Needed:**
- `<LineChart>` - spending trends, net worth over time
- `<BarChart>` - month-over-month comparison
- `<PieChart>` - spending by category
- `<AreaChart>` - income vs expenses

**Pattern Example:**
```typescript
'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface NetWorthChartProps {
  data: { date: string; value: number }[]
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <XAxis 
          dataKey="date" 
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Date
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {payload[0].payload.date}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Net Worth
                      </span>
                      <span className="font-bold">
                        ${payload[0].value?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="hsl(142, 76%, 36%)" 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Form Handling: React Hook Form 7.x + Zod 3.x

**Rationale:**
- **React Hook Form** minimizes re-renders (uncontrolled forms)
- **Zod** provides runtime validation matching TypeScript types
- **@hookform/resolvers** bridges RHF and Zod
- **Type inference** from Zod schemas
- **tRPC integration** - same Zod schemas for API validation

**Versions:**
- `react-hook-form@7.53.2`
- `zod@3.23.8`
- `@hookform/resolvers@3.9.1`

**Pattern:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'

const transactionSchema = z.object({
  date: z.date(),
  amount: z.number().min(0.01, 'Amount must be positive'),
  payee: z.string().min(1, 'Payee required'),
  categoryId: z.string().min(1, 'Category required'),
  notes: z.string().optional(),
})

type TransactionForm = z.infer<typeof transactionSchema>

export function TransactionForm() {
  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      payee: '',
      categoryId: '',
      notes: '',
    },
  })
  
  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => {
      form.reset()
      // Invalidate cache
    },
  })
  
  const onSubmit = (data: TransactionForm) => {
    createTransaction.mutate(data)
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields using shadcn/ui components */}
    </form>
  )
}
```

### Date Handling: date-fns 3.x

**Rationale:**
- **Tree-shakeable** - only import functions you use
- **Immutable** - prevents date mutation bugs
- **TypeScript-first**
- **Smaller than Moment.js** (20KB vs 200KB)
- **More intuitive than Day.js** for financial date ranges

**Version:** `date-fns@3.6.0`

**Common Patterns:**
```typescript
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns'

// Format for display
format(new Date(), 'MMM d, yyyy') // "Jan 15, 2025"

// Budget month boundaries
const monthStart = startOfMonth(new Date())
const monthEnd = endOfMonth(new Date())

// Month-over-month comparison
const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))

// Goal projections
const daysUntilGoal = differenceInDays(goal.targetDate, new Date())
```

## Dependencies List

### Production Dependencies

```json
{
  "dependencies": {
    // Framework
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    
    // Language
    "typescript": "5.3.3",
    
    // Database
    "@prisma/client": "5.22.0",
    
    // API
    "@trpc/server": "10.45.2",
    "@trpc/client": "10.45.2",
    "@trpc/react-query": "10.45.2",
    "@trpc/next": "10.45.2",
    "@tanstack/react-query": "5.60.5",
    "superjson": "2.2.1",
    
    // Authentication
    "next-auth": "5.0.0-beta.25",
    "@auth/prisma-adapter": "2.7.4",
    "bcryptjs": "2.4.3",
    
    // Validation
    "zod": "3.23.8",
    
    // Forms
    "react-hook-form": "7.53.2",
    "@hookform/resolvers": "3.9.1",
    
    // UI
    "tailwindcss": "3.4.1",
    "tailwindcss-animate": "1.0.7",
    "@radix-ui/react-dialog": "1.1.2",
    "@radix-ui/react-dropdown-menu": "2.1.2",
    "@radix-ui/react-label": "2.1.0",
    "@radix-ui/react-popover": "1.1.2",
    "@radix-ui/react-select": "2.1.2",
    "@radix-ui/react-slot": "1.1.0",
    "@radix-ui/react-tabs": "1.1.1",
    "@radix-ui/react-toast": "1.2.2",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.0",
    "lucide-react": "0.460.0",
    
    // Charts
    "recharts": "2.12.7",
    
    // Date handling
    "date-fns": "3.6.0",
    
    // Plaid
    "plaid": "28.0.0",
    "react-plaid-link": "3.6.0",
    
    // Claude API
    "@anthropic-ai/sdk": "0.32.1",
    
    // Email
    "resend": "4.0.1",
    "@react-email/components": "0.0.25",
    "react-email": "3.0.1"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // TypeScript types
    "@types/node": "20.12.7",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@types/bcryptjs": "2.4.6",
    
    // Prisma
    "prisma": "5.22.0",
    
    // Testing
    "@playwright/test": "1.48.2",
    "@testing-library/react": "16.0.1",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/user-event": "14.5.2",
    "jest": "29.7.0",
    "jest-environment-jsdom": "29.7.0",
    
    // Code quality
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.15",
    "prettier": "3.3.3",
    "prettier-plugin-tailwindcss": "0.6.8",
    
    // PostCSS
    "postcss": "8.4.38",
    "autoprefixer": "10.4.19"
  }
}
```

## Integration Patterns

### 1. Plaid API Integration

**SDK:** `plaid@28.0.0` (official Node.js library)

**Architecture:**
```
User Browser → Plaid Link (React) → Plaid Servers
     ↓
Next.js API Route → Plaid Node SDK → Plaid Servers
     ↓
Prisma → PostgreSQL (store access_token encrypted)
```

**Setup Pattern:**
```typescript
// lib/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

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
```

**Link Token Creation (tRPC procedure):**
```typescript
// server/routers/plaid.ts
export const plaidRouter = router({
  createLinkToken: protectedProcedure
    .mutation(async ({ ctx }) => {
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: ctx.session.user.id,
        },
        client_name: 'Wealth',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/plaid`,
        redirect_uri: process.env.PLAID_REDIRECT_URI,
      })
      
      return { linkToken: response.data.link_token }
    }),
})
```

**Frontend Link Component:**
```typescript
'use client'

import { usePlaidLink } from 'react-plaid-link'
import { trpc } from '@/lib/trpc'

export function PlaidLinkButton() {
  const { data: linkTokenData } = trpc.plaid.createLinkToken.useQuery()
  const exchangeToken = trpc.plaid.exchangePublicToken.useMutation()
  
  const { open, ready } = usePlaidLink({
    token: linkTokenData?.linkToken ?? null,
    onSuccess: (publicToken, metadata) => {
      exchangeToken.mutate({ 
        publicToken, 
        institution: metadata.institution?.name 
      })
    },
  })
  
  return (
    <button onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </button>
  )
}
```

**Transaction Sync Pattern:**
```typescript
// server/routers/plaid.ts
syncTransactions: protectedProcedure
  .mutation(async ({ ctx }) => {
    const accounts = await ctx.prisma.account.findMany({
      where: { userId: ctx.session.user.id, plaidAccountId: { not: null } },
    })
    
    for (const account of accounts) {
      const accessToken = await decrypt(account.plaidAccessToken)
      
      // Cursor-based pagination
      let hasMore = true
      let cursor: string | undefined
      
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: cursor,
        })
        
        const added = response.data.added
        const modified = response.data.modified
        const removed = response.data.removed
        
        // Upsert transactions
        for (const txn of added) {
          await ctx.prisma.transaction.upsert({
            where: { plaidTransactionId: txn.transaction_id },
            create: {
              userId: ctx.session.user.id,
              accountId: account.id,
              plaidTransactionId: txn.transaction_id,
              date: new Date(txn.date),
              amount: txn.amount,
              payee: txn.merchant_name || txn.name,
              category: 'Uncategorized', // Will be categorized by AI
              isManual: false,
            },
            update: {
              amount: txn.amount,
              payee: txn.merchant_name || txn.name,
            },
          })
        }
        
        // Handle modified and removed
        // ...
        
        hasMore = response.data.has_more
        cursor = response.data.next_cursor
      }
      
      await ctx.prisma.account.update({
        where: { id: account.id },
        data: { lastSynced: new Date() },
      })
    }
  }),
```

**Security Considerations:**
- Store `access_token` encrypted (use `@47ng/cloak` or similar)
- Verify webhook signatures
- Rate limit sync operations (max 1/minute per user)
- Handle item errors (institution login required)

**Error Handling:**
```typescript
import { PlaidError } from 'plaid'

try {
  await plaidClient.transactionsSync({ ... })
} catch (error) {
  if (error instanceof PlaidError) {
    switch (error.error_code) {
      case 'ITEM_LOGIN_REQUIRED':
        // Mark account as needs reconnection
        await prisma.account.update({
          where: { id: accountId },
          data: { status: 'NEEDS_RECONNECTION' },
        })
        break
      case 'RATE_LIMIT_EXCEEDED':
        // Exponential backoff
        break
      default:
        // Log and alert user
    }
  }
  throw error
}
```

### 2. Claude API Integration (Transaction Categorization)

**SDK:** `@anthropic-ai/sdk@0.32.1`

**Setup:**
```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

**Categorization Pattern:**
```typescript
// server/routers/transactions.ts
import { claude } from '@/lib/claude'

categorizeTransaction: protectedProcedure
  .input(z.object({ transactionId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const transaction = await ctx.prisma.transaction.findUnique({
      where: { id: input.transactionId },
    })
    
    if (!transaction) throw new TRPCError({ code: 'NOT_FOUND' })
    
    // Get user's categories
    const categories = await ctx.prisma.category.findMany({
      where: { userId: ctx.session.user.id },
    })
    
    const categoryList = categories.map(c => c.name).join(', ')
    
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Categorize this transaction:
Payee: ${transaction.payee}
Amount: $${transaction.amount}

Available categories: ${categoryList}

Return ONLY the category name, nothing else.`
      }],
    })
    
    const suggestedCategory = message.content[0].type === 'text' 
      ? message.content[0].text.trim() 
      : 'Miscellaneous'
    
    // Verify category exists
    const category = categories.find(c => 
      c.name.toLowerCase() === suggestedCategory.toLowerCase()
    )
    
    const finalCategory = category?.name || 'Miscellaneous'
    
    await ctx.prisma.transaction.update({
      where: { id: input.transactionId },
      data: { category: finalCategory },
    })
    
    return { category: finalCategory }
  }),
```

**Batch Categorization (more efficient):**
```typescript
categorizeBatch: protectedProcedure
  .input(z.object({ transactionIds: z.array(z.string()) }))
  .mutation(async ({ ctx, input }) => {
    const transactions = await ctx.prisma.transaction.findMany({
      where: { id: { in: input.transactionIds } },
    })
    
    const categories = await ctx.prisma.category.findMany({
      where: { userId: ctx.session.user.id },
    })
    
    const categoryList = categories.map(c => c.name).join(', ')
    
    const transactionList = transactions.map((t, i) => 
      `${i + 1}. ${t.payee} - $${t.amount}`
    ).join('\n')
    
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Categorize these transactions. Return a JSON array with transaction numbers and categories.

Transactions:
${transactionList}

Available categories: ${categoryList}

Format: [{"number": 1, "category": "Groceries"}, ...]`
      }],
    })
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '[]'
    
    const categorizations = JSON.parse(responseText)
    
    // Update transactions
    const updates = transactions.map((txn, i) => {
      const cat = categorizations.find((c: any) => c.number === i + 1)
      return ctx.prisma.transaction.update({
        where: { id: txn.id },
        data: { category: cat?.category || 'Miscellaneous' },
      })
    })
    
    await Promise.all(updates)
  }),
```

**Cost Optimization:**
- Use batch categorization (fewer API calls)
- Cache common merchant-category mappings in database
- Only categorize uncategorized transactions
- Use Claude 3.5 Sonnet (cheaper than Opus, better than Haiku)
- Estimated cost: ~$0.001 per transaction (negligible for single user)

**Rate Limiting:**
```typescript
// tRPC middleware
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})

const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const { success } = await ratelimit.limit(ctx.session.user.id)
  if (!success) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })
  }
  return next()
})

export const rateLimitedProcedure = protectedProcedure.use(rateLimitMiddleware)
```

### 3. NextAuth.js Configuration

**Prisma Schema:**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?   // For credentials provider
  image         String?
  currency      String    @default("USD")
  timezone      String    @default("America/Los_Angeles")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  accounts      Account[]
  sessions      Session[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
}
```

**Password Reset Flow:**
```typescript
// server/routers/auth.ts
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

requestPasswordReset: publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { email: input.email },
    })
    
    if (!user) {
      // Return success even if user doesn't exist (security)
      return { success: true }
    }
    
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour
    
    await ctx.prisma.verificationToken.create({
      data: {
        identifier: input.email,
        token,
        expires,
      },
    })
    
    await resend.emails.send({
      from: 'Wealth <noreply@wealth.app>',
      to: input.email,
      subject: 'Reset your password',
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
      `,
    })
    
    return { success: true }
  }),

resetPassword: publicProcedure
  .input(z.object({
    token: z.string(),
    password: z.string().min(8),
  }))
  .mutation(async ({ ctx, input }) => {
    const verificationToken = await ctx.prisma.verificationToken.findUnique({
      where: { token: input.token },
    })
    
    if (!verificationToken || verificationToken.expires < new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired token' })
    }
    
    const hashedPassword = await hash(input.password, 12)
    
    await ctx.prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { password: hashedPassword },
    })
    
    await ctx.prisma.verificationToken.delete({
      where: { token: input.token },
    })
    
    return { success: true }
  }),
```

### 4. Testing Strategy

**Unit Tests (Jest):**
```typescript
// __tests__/lib/categorize.test.ts
import { categorizeTransaction } from '@/lib/categorize'

describe('categorizeTransaction', () => {
  it('categorizes grocery stores correctly', async () => {
    const category = await categorizeTransaction({
      payee: 'Whole Foods Market',
      amount: 125.43,
    })
    expect(category).toBe('Groceries')
  })
  
  it('handles unknown merchants', async () => {
    const category = await categorizeTransaction({
      payee: 'Unknown Merchant 123',
      amount: 50.00,
    })
    expect(category).toBe('Miscellaneous')
  })
})
```

**Integration Tests (tRPC procedures):**
```typescript
// __tests__/server/routers/transactions.test.ts
import { createInnerTRPCContext } from '@/server/trpc'
import { appRouter } from '@/server/routers/_app'

describe('transactions router', () => {
  it('creates a transaction', async () => {
    const ctx = createInnerTRPCContext({ session: mockSession })
    const caller = appRouter.createCaller(ctx)
    
    const transaction = await caller.transactions.create({
      accountId: 'account-1',
      date: new Date(),
      amount: -50.00,
      payee: 'Test Merchant',
      category: 'Shopping',
    })
    
    expect(transaction.id).toBeDefined()
    expect(transaction.amount).toBe(-50.00)
  })
})
```

**E2E Tests (Playwright):**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can sign up and log in', async ({ page }) => {
  await page.goto('/auth/signup')
  
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'SecurePass123!')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('text=Welcome')).toBeVisible()
})

test('user can connect Plaid account', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('text=Connect Bank Account')
  
  // Plaid Link opens in iframe
  const plaidFrame = page.frameLocator('iframe[title="Plaid Link"]')
  await plaidFrame.locator('text=Chase').click()
  await plaidFrame.fill('[placeholder="Username"]', 'user_good')
  await plaidFrame.fill('[placeholder="Password"]', 'pass_good')
  await plaidFrame.click('text=Submit')
  
  await expect(page.locator('text=Chase')).toBeVisible()
})
```

**Test Database Setup:**
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
})

beforeAll(async () => {
  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
    },
  })
  
  // Seed test data
  await prisma.category.createMany({
    data: [
      { name: 'Groceries', icon: 'ShoppingCart', color: '#10b981' },
      { name: 'Dining', icon: 'Utensils', color: '#f59e0b' },
      // ...
    ],
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

## Code Organization Patterns

### Project Structure

```
wealth/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Landing page
│   │   ├── (auth)/
│   │   │   ├── signin/
│   │   │   ├── signup/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/            # Protected routes with layout
│   │   │   ├── layout.tsx          # Dashboard shell
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Main dashboard
│   │   │   ├── accounts/
│   │   │   │   ├── page.tsx        # Account list
│   │   │   │   └── [id]/page.tsx   # Account detail
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx        # Transaction list
│   │   │   │   └── [id]/page.tsx   # Transaction detail
│   │   │   ├── budgets/
│   │   │   ├── analytics/
│   │   │   ├── goals/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts  # tRPC handler
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── webhooks/plaid/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   ├── net-worth-card.tsx
│   │   │   ├── spending-chart.tsx
│   │   │   └── recent-transactions.tsx
│   │   ├── transactions/
│   │   │   ├── transaction-list.tsx
│   │   │   ├── transaction-form.tsx
│   │   │   └── category-select.tsx
│   │   ├── accounts/
│   │   │   ├── account-card.tsx
│   │   │   └── plaid-link-button.tsx
│   │   └── layouts/
│   │       ├── dashboard-layout.tsx
│   │       └── mobile-nav.tsx
│   ├── server/
│   │   ├── trpc.ts                 # tRPC initialization
│   │   ├── context.ts              # tRPC context
│   │   └── routers/
│   │       ├── _app.ts             # Root router
│   │       ├── auth.ts
│   │       ├── accounts.ts
│   │       ├── transactions.ts
│   │       ├── budgets.ts
│   │       ├── goals.ts
│   │       ├── analytics.ts
│   │       └── plaid.ts
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client
│   │   ├── trpc.ts                 # tRPC client hooks
│   │   ├── plaid.ts                # Plaid client
│   │   ├── claude.ts               # Claude client
│   │   ├── auth.ts                 # NextAuth config
│   │   ├── utils.ts                # Utility functions
│   │   └── validations.ts          # Zod schemas
│   └── styles/
│       └── globals.css
├── public/
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### API Route Naming Convention

```typescript
// Consistent CRUD operations
router({
  list: protectedProcedure.query(...),        // GET all
  get: protectedProcedure.input(...).query(...), // GET one
  create: protectedProcedure.input(...).mutation(...),
  update: protectedProcedure.input(...).mutation(...),
  delete: protectedProcedure.input(...).mutation(...),
})
```

### Component Organization Pattern

```typescript
// components/transactions/transaction-list.tsx
'use client'

import { trpc } from '@/lib/trpc'
import { TransactionCard } from './transaction-card'
import { TransactionListSkeleton } from './transaction-list-skeleton'

interface TransactionListProps {
  accountId?: string
  categoryId?: string
  dateRange?: { from: Date; to: Date }
}

export function TransactionList({ accountId, categoryId, dateRange }: TransactionListProps) {
  const { data: transactions, isLoading } = trpc.transactions.list.useQuery({
    accountId,
    categoryId,
    dateRange,
  })
  
  if (isLoading) return <TransactionListSkeleton />
  
  if (!transactions?.length) {
    return <EmptyState message="No transactions found" />
  }
  
  return (
    <div className="space-y-2">
      {transactions.map(transaction => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  )
}
```

### Data Fetching Patterns

**Server Components (default in App Router):**
```typescript
// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NetWorthCard } from '@/components/dashboard/net-worth-card'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  
  // Direct database queries in Server Components
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
  })
  
  const netWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  return (
    <div>
      <NetWorthCard initialValue={netWorth} />
    </div>
  )
}
```

**Client Components (with tRPC):**
```typescript
// components/dashboard/net-worth-card.tsx
'use client'

import { trpc } from '@/lib/trpc'

interface NetWorthCardProps {
  initialValue: number
}

export function NetWorthCard({ initialValue }: NetWorthCardProps) {
  // tRPC query with initial data from Server Component
  const { data: netWorth } = trpc.analytics.netWorth.useQuery(undefined, {
    initialData: initialValue,
    refetchInterval: 60000, // Refetch every minute
  })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          ${netWorth.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}
```

## Development Workflow

### 1. Environment Setup

```bash
# Clone and install
git clone <repo>
cd wealth
npm install

# Copy environment variables
cp .env.example .env.local

# Set up database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

### 2. Database Workflow

```bash
# Create migration
npx prisma migrate dev --name add_transaction_splits

# Reset database (WARNING: deletes data)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Generate Prisma client (after schema changes)
npx prisma generate
```

### 3. Development Commands

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "postinstall": "prisma generate"
  }
}
```

### 4. Git Workflow

```bash
# Feature branch
git checkout -b feature/transaction-splits

# Commit with conventional commits
git commit -m "feat: add transaction split functionality"
git commit -m "fix: correct budget calculation bug"
git commit -m "test: add E2E tests for Plaid connection"

# Pre-commit hook (Husky)
# - Runs ESLint
# - Runs TypeScript type check
# - Runs Prettier
```

### 5. Deployment Workflow

**Vercel (recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```

**Environment variables needed in Vercel:**
- `DATABASE_URL` (PostgreSQL connection string)
- `DIRECT_URL` (for migrations)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (sandbox/production)
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

**Database hosting:**
- Vercel Postgres (easiest integration)
- Supabase (free tier available)
- Railway (good for development)
- Neon (serverless PostgreSQL)

## Potential Challenges

### 1. Plaid Integration Complexity

**Challenge:** Plaid's webhook system requires handling various item states (login required, verification needed, etc.)

**Mitigation:**
- Implement comprehensive error handling for all Plaid error codes
- Create account status system (active, needs_reconnection, error)
- Build user-friendly reconnection flow
- Test thoroughly in sandbox mode with all test credentials
- Monitor webhook delivery and implement retry logic

**Builder Impact:** MEDIUM - Plaid documentation is excellent but edge cases require careful handling

### 2. Transaction Deduplication

**Challenge:** Manual transactions might duplicate Plaid imports

**Mitigation:**
- Use Plaid transaction IDs as unique constraint
- Fuzzy matching for manual transactions (same date, amount, payee within 2 days)
- User confirmation dialog before creating potential duplicate
- "Hide from reports" flag instead of hard delete

**Code Pattern:**
```typescript
async function checkDuplicate(transaction: TransactionInput) {
  const existing = await prisma.transaction.findFirst({
    where: {
      userId: transaction.userId,
      date: {
        gte: subDays(transaction.date, 2),
        lte: addDays(transaction.date, 2),
      },
      amount: transaction.amount,
      payee: {
        contains: transaction.payee,
        mode: 'insensitive',
      },
    },
  })
  
  return existing
}
```

### 3. Real-time Budget Progress

**Challenge:** Budget calculations need to be fast even with thousands of transactions

**Mitigation:**
- Denormalize budget progress into `budgets` table
- Update via database trigger or background job
- Use tRPC's `useQuery` with staleTime to reduce refetches
- Implement optimistic updates for instant UI feedback

**Database Approach:**
```prisma
model Budget {
  id        String @id @default(cuid())
  category  String
  amount    Decimal
  spent     Decimal @default(0) // Denormalized
  month     String
  
  @@index([userId, month])
}
```

### 4. Date Timezone Handling

**Challenge:** User's timezone vs. server timezone vs. bank's timezone

**Mitigation:**
- Store all dates in UTC in database
- Store user's timezone preference in profile
- Convert to user's timezone for display using date-fns-tz
- Use ISO strings for API communication

**Pattern:**
```typescript
import { formatInTimeZone } from 'date-fns-tz'

function displayDate(utcDate: Date, userTimezone: string) {
  return formatInTimeZone(utcDate, userTimezone, 'MMM d, yyyy')
}
```

### 5. Claude API Rate Limits

**Challenge:** Anthropic's rate limits could affect batch categorization

**Mitigation:**
- Implement rate limiting middleware (10 requests/minute)
- Queue categorization requests
- Cache merchant-category mappings
- Fallback to rule-based categorization if API fails

**Code Pattern:**
```typescript
// lib/category-cache.ts
const categoryCache = new Map<string, string>()

async function getCachedCategory(payee: string): Promise<string | null> {
  const cached = categoryCache.get(payee.toLowerCase())
  if (cached) return cached
  
  const dbCached = await prisma.merchantCategory.findUnique({
    where: { merchant: payee.toLowerCase() },
  })
  
  if (dbCached) {
    categoryCache.set(payee.toLowerCase(), dbCached.category)
    return dbCached.category
  }
  
  return null
}
```

### 6. Mobile Responsiveness for Charts

**Challenge:** Recharts can be difficult to make responsive on small screens

**Mitigation:**
- Use `ResponsiveContainer` wrapper
- Reduce data points on mobile (weekly instead of daily)
- Simplify chart options (fewer ticks, smaller font)
- Consider alternative visualizations (progress bars instead of pie charts)

**Pattern:**
```typescript
'use client'

import { useMediaQuery } from '@/hooks/use-media-query'

export function SpendingChart({ data }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
      <LineChart data={data}>
        <XAxis 
          dataKey="date"
          tick={{ fontSize: isMobile ? 10 : 12 }}
          tickCount={isMobile ? 4 : 8}
        />
        {/* ... */}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### 7. Testing Plaid Integration

**Challenge:** E2E tests need to interact with Plaid sandbox

**Mitigation:**
- Use Plaid's test credentials (user_good/pass_good)
- Mock Plaid Link in unit tests
- Separate E2E test user for Plaid sandbox
- Document sandbox test flow clearly

**Test Pattern:**
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'plaid-sandbox',
      testMatch: '**/plaid.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Plaid sandbox credentials
        storageState: 'tests/plaid-auth.json',
      },
    },
  ],
})
```

### 8. Bundle Size Management

**Challenge:** Next.js bundle can grow large with charts, Plaid, tRPC

**Mitigation:**
- Dynamic imports for heavy components
- Tree-shake Recharts (import specific charts)
- Use `'use client'` sparingly
- Analyze bundle with `@next/bundle-analyzer`

**Code Pattern:**
```typescript
// Lazy load chart component
import dynamic from 'next/dynamic'

const SpendingChart = dynamic(
  () => import('@/components/analytics/spending-chart').then(mod => mod.SpendingChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false, // Charts don't need SSR
  }
)
```

### 9. TypeScript Strict Mode Challenges

**Challenge:** Prisma types can be complex with relations

**Mitigation:**
- Use Prisma's generated types with `Prisma.TransactionGetPayload`
- Create DTOs for API responses
- Use `satisfies` operator for type narrowing
- Enable `noUncheckedIndexedAccess` carefully (can be verbose)

**Pattern:**
```typescript
import { Prisma } from '@prisma/client'

type TransactionWithAccount = Prisma.TransactionGetPayload<{
  include: { account: true }
}>

// DTO for API
interface TransactionDTO {
  id: string
  date: string  // ISO string, not Date
  amount: number
  payee: string
  category: string
  accountName: string
}

function toDTO(transaction: TransactionWithAccount): TransactionDTO {
  return {
    id: transaction.id,
    date: transaction.date.toISOString(),
    amount: transaction.amount.toNumber(),
    payee: transaction.payee,
    category: transaction.category,
    accountName: transaction.account.name,
  }
}
```

## Recommendations for Planner

### 1. Start with Core Features First

**Phase 1 (Foundation):**
- Authentication (email + Google OAuth)
- Database schema and migrations
- Basic tRPC setup
- Dashboard layout

**Phase 2 (Plaid Integration):**
- Plaid Link flow
- Account management
- Transaction sync
- Split this into separate builder if complex

**Phase 3 (Manual Entry):**
- Manual transaction form
- Category management
- Transaction list/search

**Phase 4 (Intelligence):**
- Claude categorization
- Budget tracking
- Analytics dashboard

**Phase 5 (Goals & Polish):**
- Goals feature
- Mobile responsiveness
- CSV export
- Testing

### 2. Builder Split Strategy

**Monolithic Builder (4-6 hours):**
- Best case: experienced with Next.js 14, tRPC, Prisma
- Risk: might need sub-builders for Plaid + Claude integrations

**Sub-builder Candidates:**
- **Sub-builder A:** Plaid integration (if main builder struggles)
- **Sub-builder B:** Claude AI categorization (if API integration is complex)
- **Sub-builder C:** Analytics charts (if Recharts patterns are unclear)

### 3. Critical Dependencies

**Must be installed first:**
```bash
npm install next@14.2.15 react@18.3.1 react-dom@18.3.1 typescript@5.3.3
npm install @prisma/client@5.22.0 prisma@5.22.0
npm install @trpc/server@10.45.2 @trpc/client@10.45.2 @trpc/react-query@10.45.2 @trpc/next@10.45.2
npm install next-auth@5.0.0-beta.25 @auth/prisma-adapter@2.7.4
npm install zod@3.23.8 react-hook-form@7.53.2 @hookform/resolvers@3.9.1
npm install plaid@28.0.0 react-plaid-link@3.6.0
npm install @anthropic-ai/sdk@0.32.1
```

### 4. Environment Variables Template

```bash
# .env.example
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wealth"
DIRECT_URL="postgresql://user:password@localhost:5432/wealth"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Plaid
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"

# Anthropic Claude
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Resend (Email)
RESEND_API_KEY="your-resend-api-key"
```

### 5. Testing Strategy

**Priority levels:**
- **P0 (Critical):** Auth flow, Plaid connection, transaction sync
- **P1 (Important):** Budget tracking, categorization, dashboard
- **P2 (Nice-to-have):** Goals, CSV export, mobile layout

**Test coverage targets:**
- Unit tests: 80%+ (utilities, validation)
- Integration tests: Key tRPC procedures
- E2E tests: P0 flows only for MVP

### 6. Documentation Requirements

**Must document:**
- Environment setup (with Plaid sandbox instructions)
- Database schema diagram
- API routes (tRPC procedures)
- Plaid webhook testing
- Deployment checklist

**Can skip for MVP:**
- Detailed code comments (TypeScript types self-document)
- Architecture diagrams (folder structure is clear)
- API versioning (single-user app)

## Resource Map

### Critical Files/Directories

```
/src/server/routers/         # All API logic
/src/app/(dashboard)/        # Protected routes
/src/components/ui/          # shadcn/ui components
/src/lib/trpc.ts             # tRPC client setup
/src/lib/auth.ts             # NextAuth configuration
/src/lib/prisma.ts           # Database client
/prisma/schema.prisma        # Database schema
```

### Key Dependencies Version Locks

**Must use exact versions:**
- `next@14.2.15` (App Router stability)
- `next-auth@5.0.0-beta.25` (v5 required for App Router)
- `@trpc/server@10.45.2` (client must match)
- `prisma@5.22.0` (client must match)

**Can use ranges:**
- `react@^18.3.1`
- `typescript@^5.3.3`
- `zod@^3.23.8`

### Testing Infrastructure

**Jest config:**
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

**Playwright config:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Questions for Planner

1. **Database Hosting:** Should we include database setup in build plan, or assume Vercel Postgres?

2. **Plaid Sandbox:** Should builders test with real Plaid sandbox accounts, or mock Plaid responses?

3. **Initial Categories:** Should seed script create default categories, or let user create all categories?

4. **Budget Rollover:** Should MVP include budget rollover feature, or defer to post-MVP?

5. **Mindful Finance Features:** These are low priority - should they be in separate iteration or skipped for MVP?

6. **Split Transaction UI:** This is complex - should it be in MVP or post-MVP?

7. **Email Provider:** Use Resend (recommended) or different provider (SendGrid, Mailgun)?

8. **CI/CD:** Should we include GitHub Actions workflow for tests, or rely on Vercel's build checks?

---

**Report Complete.** This technology stack is production-ready and well-suited for the Wealth personal finance application. All integrations are straightforward with strong documentation. Main risks are Plaid webhook complexity and ensuring proper timezone handling for financial data.
