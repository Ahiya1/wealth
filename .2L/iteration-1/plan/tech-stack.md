# Technology Stack - Wealth Personal Finance Dashboard

## Core Framework

**Decision:** Next.js 14.2.15 (App Router)

**Rationale:**
1. **App Router with React Server Components** - Reduces client bundle size significantly for dashboard-heavy application. Server Components handle data fetching without sending JavaScript to the client.
2. **Built-in API routes** - Seamless tRPC integration without additional backend framework
3. **Optimized for Vercel deployment** - Zero-configuration deployment with automatic HTTPS, CDN, and edge functions
4. **Streaming SSR** - Improves perceived performance for analytics pages with Suspense boundaries
5. **File-based routing** - Intuitive organization matching the UI structure
6. **Middleware support** - Built-in authentication protection for protected routes

**Version:** `next@14.2.15` (latest stable)

**Alternatives Considered:**
- **Remix:** Excellent framework but less mature ecosystem for tRPC integration
- **Create React App:** Too basic, requires manual backend setup
- **Vite + React Router:** More configuration overhead, no SSR out of the box

**Configuration:**
```javascript
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
}

module.exports = nextConfig
```

---

## Language

**Decision:** TypeScript 5.3.3 (strict mode)

**Rationale:**
1. **Compile-time error catching** - Critical for financial data accuracy
2. **Prisma type generation** - Database types automatically generated
3. **tRPC type inference** - End-to-end type safety from database to frontend
4. **Enhanced IDE support** - Better autocomplete and refactoring
5. **Self-documenting code** - Types serve as inline documentation

**Version:** `typescript@5.3.3`

**Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "dom", "dom.iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
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

**Key Strict Mode Benefits:**
- `noUncheckedIndexedAccess` - Prevents undefined array access bugs
- `strict` - Enables all strict type checking options
- `noUnusedLocals` - Catches dead code

---

## Database

**Decision:** PostgreSQL 15+ with Prisma 5.22.0

**Database:** PostgreSQL
**Rationale:**
1. **ACID compliance** - Essential for financial transactions
2. **JSONB support** - Flexible storage for transaction metadata (tags, splits)
3. **Full-text search** - Enables transaction search by payee
4. **Array types** - Native support for transaction tags
5. **Production-ready** - Battle-tested at scale

**ORM:** Prisma 5.22.0
**Rationale:**
1. **Type-safe queries** - Generates TypeScript types from schema
2. **Migration system** - Version-controlled schema evolution
3. **Excellent DX** - Prisma Studio for database browsing
4. **Connection pooling** - Handles serverless function cold starts
5. **Zero-cost abstractions** - Compiles to efficient SQL

**Versions:**
- `prisma@5.22.0`
- `@prisma/client@5.22.0`

**Schema Strategy:**
- Use `Decimal` type for all currency fields (avoids floating-point errors)
- Use `@db.Text` for long strings (notes, reflections)
- Use composite indexes for common query patterns
- Use enums for fixed value sets (AccountType, GoalType)
- Use soft deletes (`isActive` flag) for data integrity

**Connection Configuration:**
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

**Indexing Strategy:**
```prisma
// Critical indexes for performance
@@index([userId, date(sort: Desc)]) // Transaction list queries
@@index([userId, categoryId, date]) // Category analytics
@@index([plaidTransactionId]) // Deduplication
@@index([userId, month]) // Budget queries
```

**Hosting Recommendation:**
- **Vercel Postgres** - Easiest integration with Next.js on Vercel
- **Supabase** - Free tier available, includes database GUI
- **Neon** - Serverless PostgreSQL with generous free tier

---

## API Layer

**Decision:** tRPC 10.45.2

**Rationale:**
1. **End-to-end type safety** - Zero manual type definitions between frontend and backend
2. **No code generation** - Types inferred automatically from Prisma schema
3. **Automatic client** - React hooks generated for all procedures
4. **React Query integration** - Built-in caching, optimistic updates, background refetching
5. **Smaller bundle** - No need for REST API documentation libraries
6. **Error handling** - Typed errors with automatic status codes

**Versions:**
- `@trpc/server@10.45.2`
- `@trpc/client@10.45.2`
- `@trpc/react-query@10.45.2`
- `@trpc/next@10.45.2`
- `@tanstack/react-query@5.60.5`
- `superjson@2.2.1` (for Date/BigInt serialization)

**Architecture:**
```
src/server/
├── api/
│   ├── root.ts              # Root router (merges all routers)
│   ├── trpc.ts              # tRPC initialization
│   └── routers/
│       ├── auth.router.ts
│       ├── accounts.router.ts
│       ├── transactions.router.ts
│       ├── budgets.router.ts
│       ├── analytics.router.ts
│       ├── goals.router.ts
│       └── categories.router.ts
```

**Implementation Notes:**
- Use `superjson` transformer for Date and Decimal types
- Protected procedures check session via middleware
- All inputs validated with Zod schemas
- Error formatting includes Zod validation errors
- Use React Query for automatic cache management

**Alternatives Considered:**
- **REST API + OpenAPI** - Too much boilerplate, no automatic type safety
- **GraphQL** - Overkill for this application, adds complexity
- **Next.js API routes only** - No automatic client generation, manual typing

---

## Authentication

**Decision:** NextAuth.js 5.0.0-beta.25 (Auth.js)

**Rationale:**
1. **Multi-provider support** - Google OAuth + Email/Password in one library
2. **JWT sessions** - Stateless, works in serverless environment
3. **Prisma adapter** - Automatic database session storage
4. **Built for Next.js** - First-class App Router support
5. **Security best practices** - CSRF protection, secure cookies, HttpOnly flags
6. **Type-safe** - Full TypeScript support with session typing

**Version:** `next-auth@5.0.0-beta.25` (v5 is production-ready as of Jan 2025)

**Providers:**
1. **Credentials Provider** - Email/password authentication
   - Password hashing: bcryptjs with 12 salt rounds
   - Validation: Zod schema for email/password format

2. **Google OAuth Provider** - Social login
   - Requires Google Cloud Console credentials
   - Auto-creates user on first login

**Session Strategy:**
- JWT tokens (stateless)
- 7-day expiration with automatic refresh
- HttpOnly cookies for security
- Store minimal data in token (userId, email)

**Database Schema (via Prisma Adapter):**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   // null for OAuth-only users
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google"
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}
```

**Route Protection:**
```typescript
// middleware.ts - Protects all /dashboard routes
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  }
})

export const config = {
  matcher: ['/dashboard/:path*']
}
```

**Password Security:**
- Use `bcryptjs@2.4.3` with 12 salt rounds
- Password reset tokens expire in 1 hour
- Tokens stored hashed in database
- Rate limit login attempts (via tRPC middleware)

---

## UI Framework

**Decision:** Tailwind CSS 3.4.1 + shadcn/ui

**Rationale:**
1. **Utility-first CSS** - Rapid UI development without CSS files
2. **Zero runtime** - All styles compiled at build time
3. **Mobile-first** - Responsive design by default
4. **shadcn/ui components** - Accessible, customizable, no library lock-in
5. **Radix UI primitives** - WCAG 2.1 Level AA compliance
6. **Easy theming** - CSS variables for consistent design system

**Versions:**
- `tailwindcss@3.4.1`
- `tailwindcss-animate@1.0.7`
- `class-variance-authority@0.7.0` (component variants)
- `clsx@2.1.0` (conditional classes)
- `tailwind-merge@2.2.0` (class conflict resolution)
- `lucide-react@0.460.0` (icon library)

**shadcn/ui Components Needed:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label textarea
npx shadcn-ui@latest add card dialog sheet select table
npx shadcn-ui@latest add progress badge toast calendar tabs
npx shadcn-ui@latest add dropdown-menu popover
```

**Theme Configuration (Calm, Mindful Colors):**
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(142, 76%, 36%)', // Calm green
          foreground: 'hsl(0, 0%, 100%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 40%, 96%)',
          foreground: 'hsl(215, 16%, 47%)',
        },
        warning: {
          DEFAULT: 'hsl(38, 92%, 50%)', // Gentle orange
          foreground: 'hsl(0, 0%, 100%)',
        },
        danger: {
          DEFAULT: 'hsl(0, 72%, 51%)', // Critical only
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

**Design System:**
- Primary color: Calm green for positive/growth
- Warning color: Gentle orange for approaching limits
- Danger color: Only for critical issues (not for budget overages)
- Muted colors: Neutral grays for non-critical information
- Font: Geist Sans (modern, readable)

---

## Charts

**Decision:** Recharts 2.12.7

**Rationale:**
1. **React-native** - Built for React, not jQuery wrapper
2. **Composable** - Build custom charts from primitives
3. **Responsive** - Works on mobile out of the box
4. **TypeScript support** - Excellent type definitions
5. **Smaller bundle** - Tree-shakeable (import only what you use)
6. **SVG-based** - Crisp rendering at any resolution

**Version:** `recharts@2.12.7`

**Chart Types Used:**
- `LineChart` - Spending trends, net worth over time
- `BarChart` - Month-over-month comparison, income vs expenses
- `PieChart` - Spending by category breakdown
- `AreaChart` - Alternative for income vs expenses

**Implementation Notes:**
- Always wrap in `ResponsiveContainer`
- Use client components ('use client' directive)
- Lazy load charts with dynamic imports
- Reduce data points on mobile (weekly vs daily)
- Custom tooltips for financial formatting

**Alternatives Considered:**
- **Chart.js** - Larger bundle, Canvas-based (not as crisp)
- **Victory** - Less actively maintained
- **Nivo** - Beautiful but larger bundle size

---

## Forms

**Decision:** React Hook Form 7.53.2 + Zod 3.23.8

**Rationale:**
1. **Uncontrolled forms** - Minimal re-renders for better performance
2. **Zod integration** - Same schemas for frontend and backend validation
3. **Type inference** - Types automatically generated from Zod schemas
4. **Built-in validation** - Real-time validation with clear error messages
5. **tRPC compatibility** - Use same Zod schemas in tRPC procedures

**Versions:**
- `react-hook-form@7.53.2`
- `zod@3.23.8`
- `@hookform/resolvers@3.9.1`

**Form Pattern:**
```typescript
// Shared schema (used in frontend form and backend tRPC procedure)
import { z } from 'zod'

export const transactionSchema = z.object({
  date: z.date(),
  amount: z.number().positive('Amount must be positive'),
  payee: z.string().min(1, 'Payee required'),
  categoryId: z.string().cuid('Invalid category'),
  accountId: z.string().cuid('Invalid account'),
  notes: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
```

**Implementation Notes:**
- Always use `zodResolver` for validation
- Show validation errors inline
- Disable submit button during mutation
- Reset form after successful submission
- Use optimistic updates for instant feedback

---

## Date Handling

**Decision:** date-fns 3.6.0

**Rationale:**
1. **Tree-shakeable** - Only import functions you use (smaller bundle)
2. **Immutable** - Prevents date mutation bugs
3. **TypeScript-first** - Excellent type definitions
4. **Intuitive API** - More readable than native Date methods
5. **Financial-friendly** - Good support for date ranges and calculations

**Version:** `date-fns@3.6.0`

**Common Operations:**
```typescript
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInDays,
  addMonths,
  parseISO
} from 'date-fns'

// Display formatting
format(new Date(), 'MMM d, yyyy') // "Jan 15, 2025"
format(new Date(), 'yyyy-MM') // "2025-01" (budget month format)

// Budget month boundaries
const monthStart = startOfMonth(new Date())
const monthEnd = endOfMonth(new Date())

// Month-over-month analysis
const lastMonth = subMonths(new Date(), 1)

// Goal projections
const daysRemaining = differenceInDays(goal.targetDate, new Date())
```

**Timezone Handling:**
- Store all dates in UTC in database
- Store user timezone preference in profile
- Convert to user timezone for display only
- Use ISO strings for API communication

**Alternatives Considered:**
- **Day.js** - Smaller but less intuitive API
- **Moment.js** - Too large (200KB), deprecated
- **Luxon** - Heavier, timezone complexity overkill

---

## External Integrations

### Plaid API (Bank Connections)

**Purpose:** Connect bank accounts and import transactions

**SDK:** `plaid@28.0.0` (official Node.js SDK)
**Frontend SDK:** `react-plaid-link@3.6.0`

**Environment:** Sandbox (for testing)

**Setup:**
```typescript
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)
```

**Key Operations:**
1. Create Link Token → Open Plaid Link UI
2. Exchange Public Token → Get Access Token
3. Fetch Accounts → Store in database
4. Fetch Transactions → Import to database
5. Handle Webhooks → Receive real-time updates

**Security:**
- Access tokens encrypted with AES-256-GCM before storage
- Webhook signatures verified with HMAC-SHA256
- Never log tokens or credentials
- Implement token rotation (future)

**Testing:**
- Use Plaid Sandbox institutions (Chase, Wells Fargo, Bank of America)
- Test credentials: `user_good` / `pass_good`
- Webhook testing via ngrok or Vercel preview deployments

---

### Claude API (AI Categorization)

**Purpose:** Automatically categorize transactions

**SDK:** `@anthropic-ai/sdk@0.32.1`

**Setup:**
```typescript
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

**Model:** `claude-3-5-sonnet-20241022` (optimal speed/accuracy)

**Configuration:**
- Max tokens: 1024
- Temperature: 0.2 (deterministic)
- Batch size: 50 transactions per request

**Prompt Structure:**
```
You are a financial categorization assistant.
Categorize these transactions into one of these categories:
[Groceries, Dining, Transportation, Shopping, Entertainment, ...]

Transactions:
1. Whole Foods - $125.43
2. Shell Gas Station - $45.00
3. Netflix - $15.99

Return JSON array: [{"number": 1, "category": "Groceries"}, ...]
```

**Cost Optimization:**
- Cache merchant → category mappings (Redis or database)
- Only categorize uncategorized transactions
- Batch multiple transactions per API call
- Use shorter prompts with clear instructions
- Estimated cost: $0.001 per transaction (~$6/month for 1000 users)

**Error Handling:**
- Fallback to "Uncategorized" if API fails
- Retry with exponential backoff (3 attempts)
- Log failures for manual review
- Validate category against available categories

---

### Resend (Email Notifications)

**Purpose:** Send transactional emails (password reset, budget alerts)

**SDK:** `resend@4.0.1`
**Templates:** `@react-email/components@0.0.25`

**Setup:**
```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)
```

**Email Types:**
1. **Password Reset** - Link with token (1-hour expiration)
2. **Budget Alert** - Notification when threshold crossed (optional for MVP)

**Template Pattern:**
```typescript
// emails/PasswordResetEmail.tsx
import { Button, Html, Text } from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Text>Click the button below to reset your password:</Text>
      <Button href={resetUrl}>Reset Password</Button>
      <Text>This link expires in 1 hour.</Text>
    </Html>
  )
}
```

**Error Handling:**
- Retry failed sends (max 3 attempts)
- Log email events for debugging
- Handle bounces gracefully
- Validate email addresses before sending

---

## Development Tools

### Testing

**Framework:** Jest 29.7.0 + Playwright 1.48.2

**Unit/Integration Tests:**
- `jest@29.7.0` - Test runner
- `@testing-library/react@16.0.1` - Component testing
- `@testing-library/jest-dom@6.6.3` - DOM matchers
- `jest-environment-jsdom@29.7.0` - Browser environment

**E2E Tests:**
- `@playwright/test@1.48.2` - Browser automation
- Test critical flows only (auth, Plaid, transactions)
- Run on Chromium + Mobile Safari

**Coverage Target:** 80%+ for utility functions and services

**Strategy:**
- Unit tests: Utility functions, validation schemas, business logic
- Integration tests: tRPC procedures, database queries
- E2E tests: Authentication, Plaid connection, transaction creation

---

### Code Quality

**Linter:** ESLint 8.57.0
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Formatter:** Prettier 3.3.3
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**Type Checking:** TypeScript strict mode (enabled in tsconfig.json)

---

### Build & Deploy

**Build Tool:** Next.js built-in (SWC compiler)

**Deployment Target:** Vercel (recommended)
- Zero-config deployment
- Automatic HTTPS and CDN
- Edge functions support
- Preview deployments per PR
- Environment variable management

**CI/CD:** Vercel automatic deployments
- Every push to main → production deployment
- Every PR → preview deployment
- Build checks: TypeScript, ESLint, tests

**Alternative Hosting:**
- Netlify - Similar to Vercel
- Railway - Includes database hosting
- Self-hosted - Docker container with Node.js

---

## Environment Variables

**Required for Development:**
```bash
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

# Claude API
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Email
RESEND_API_KEY="your-resend-api-key"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-64-character-hex-key"
```

**How to Get Credentials:**
1. **DATABASE_URL** - Vercel Postgres (automatic), or Supabase/Neon free tier
2. **NEXTAUTH_SECRET** - Run: `openssl rand -base64 32`
3. **GOOGLE_CLIENT_ID/SECRET** - Google Cloud Console → APIs & Services → Credentials
4. **PLAID_CLIENT_ID/SECRET** - Plaid Dashboard (free sandbox account)
5. **ANTHROPIC_API_KEY** - Anthropic Console (free tier available)
6. **RESEND_API_KEY** - Resend Dashboard (free tier: 100 emails/day)
7. **ENCRYPTION_KEY** - Run: `openssl rand -hex 32`

---

## Dependencies Overview

### Production Dependencies (Key Packages)

```json
{
  "dependencies": {
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.3.3",
    "@prisma/client": "5.22.0",
    "@trpc/server": "10.45.2",
    "@trpc/client": "10.45.2",
    "@trpc/react-query": "10.45.2",
    "@trpc/next": "10.45.2",
    "@tanstack/react-query": "5.60.5",
    "superjson": "2.2.1",
    "next-auth": "5.0.0-beta.25",
    "@auth/prisma-adapter": "2.7.4",
    "bcryptjs": "2.4.3",
    "zod": "3.23.8",
    "react-hook-form": "7.53.2",
    "@hookform/resolvers": "3.9.1",
    "tailwindcss": "3.4.1",
    "tailwindcss-animate": "1.0.7",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.0",
    "lucide-react": "0.460.0",
    "recharts": "2.12.7",
    "date-fns": "3.6.0",
    "plaid": "28.0.0",
    "react-plaid-link": "3.6.0",
    "@anthropic-ai/sdk": "0.32.1",
    "resend": "4.0.1",
    "@react-email/components": "0.0.25"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "20.12.7",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@types/bcryptjs": "2.4.6",
    "prisma": "5.22.0",
    "@playwright/test": "1.48.2",
    "@testing-library/react": "16.0.1",
    "@testing-library/jest-dom": "6.6.3",
    "jest": "29.7.0",
    "jest-environment-jsdom": "29.7.0",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.15",
    "prettier": "3.3.3",
    "prettier-plugin-tailwindcss": "0.6.8",
    "postcss": "8.4.38",
    "autoprefixer": "10.4.19"
  }
}
```

---

## Performance Targets

**Page Load:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s

**Bundle Size:**
- Initial JS bundle: < 300KB (gzipped)
- Total page weight: < 800KB

**API Performance:**
- tRPC procedure response: < 200ms (p95)
- Database query time: < 100ms (p95)
- External API calls: < 1000ms (with timeout)

**Optimization Strategies:**
- Server Components for data fetching (zero client JS)
- Dynamic imports for heavy components (charts, modals)
- Image optimization with next/image
- Prisma query optimization (indexes, select specific fields)
- React Query caching (reduce API calls)

---

## Security Considerations

**Authentication:**
- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens in HttpOnly cookies
- CSRF protection via NextAuth
- Rate limiting on login attempts

**Data Protection:**
- Plaid access tokens encrypted at rest (AES-256-GCM)
- User data isolated via userId on all queries
- No sensitive data in logs or error messages
- Environment variables never committed to Git

**API Security:**
- All tRPC procedures validate input with Zod
- Protected procedures require valid session
- Rate limiting on expensive operations
- SQL injection prevented by Prisma (parameterized queries)

**Plaid Security:**
- Access tokens encrypted before database storage
- Webhook signatures verified (HMAC-SHA256)
- Never expose access tokens in API responses
- Token rotation capability (future enhancement)

---

## Version Lock Strategy

**Must use exact versions:**
- `next@14.2.15` - App Router stability
- `next-auth@5.0.0-beta.25` - v5 required for App Router
- `@trpc/server@10.45.2` - Client must match server version
- `prisma@5.22.0` - Client must match CLI version

**Can use ranges (^):**
- React ecosystem packages
- TypeScript
- Zod
- Utility libraries (date-fns, clsx)

**Package Manager:** npm (standard, reliable)

---

**Tech Stack Complete** - Proceed to patterns.md for implementation patterns
