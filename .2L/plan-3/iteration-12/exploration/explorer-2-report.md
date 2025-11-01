# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

The Wealth app is a well-architected Next.js 14 monolith with modern serverless patterns, using tRPC for type-safe APIs, Prisma for database ORM, and Supabase for authentication and PostgreSQL. The codebase is currently configured for USD-only currency with 172 USD/$ references across 68 source files. For Iteration 1's currency migration to NIS and production deployment, the technical foundation is solid but requires systematic updates to currency formatting patterns, environment variable management for dual environments (local/production), and Vercel-specific configuration for cron jobs and build optimization.

## Discoveries

### Technology Stack Analysis

**Core Framework Stack:**
- **Next.js**: 14.2.33 (App Router, Server Components, Server Actions)
- **React**: 18.3.1 (Client-side rendering with Suspense)
- **TypeScript**: 5.7.2 (Strict mode enabled)
- **tRPC**: 11.6.0 (Type-safe API layer)
- **Prisma**: 5.22.0 (Database ORM)
- **Supabase**: 2.58.0 (Auth + PostgreSQL hosting)

**Key Dependencies:**
- `@supabase/ssr` (0.5.2) - Server-side Supabase auth
- `@tanstack/react-query` (5.80.3) - Data fetching/caching
- `superjson` (2.2.1) - Serialization for tRPC
- `zod` (3.23.8) - Schema validation
- `recharts` (2.12.7) - Analytics charts
- `framer-motion` (12.23.22) - UI animations

**Development Infrastructure:**
- Supabase Local (custom ports: 54421-54432)
- Prisma Studio for database management
- Vitest (3.2.4) for testing with 57 test files
- ESLint + Next.js lint rules

### Currency Handling Patterns

**Current Implementation (USD-only):**

1. **Constants Pattern** (`src/lib/constants.ts`):
```typescript
export const CURRENCY_CODE = 'USD' as const
export const CURRENCY_SYMBOL = '$' as const
export const CURRENCY_NAME = 'US Dollar' as const
```

2. **Formatting Utility** (`src/lib/utils.ts`):
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) // Returns "$1,234.56"
}

export function getCurrencySymbol(): string {
  return '$'
}
```

3. **Database Schema** (`prisma/schema.prisma`):
```prisma
model User {
  currency String @default("USD")
  // ...
}

model Account {
  currency String @default("USD") // Always USD
  // ...
}
```

4. **Usage Pattern Across Codebase**:
- **58 files** use `formatCurrency(amount)` for display
- **68 files** contain USD/$ references (grep count: 172 occurrences)
- **Consistent pattern**: All currency displays use `formatCurrency()` utility
- **No hardcoded "$" symbols** in display components (good pattern)

**Migration Requirements for NIS:**

The systematic currency migration will require:
1. Update `CURRENCY_CODE = 'NIS'`, `CURRENCY_SYMBOL = '₪'` in constants
2. Modify `formatCurrency()` to use Israeli locale (`he-IL`) or custom format
3. Change Intl.NumberFormat currency to 'ILS'
4. Update symbol position (NIS convention: amount first, then ₪ after)
5. Update database defaults in Prisma schema

**Key Finding**: The codebase's centralized currency formatting pattern makes migration straightforward - only 2 core files need modification (`constants.ts` and `utils.ts`), then systematic verification of displays.

### Environment Configuration Patterns

**Dual Environment Setup:**

1. **Local Development** (`.env.local`):
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:54432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54432/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54421"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<local-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<local-service-role-key>"
```

2. **Production Requirements** (Vercel):
```bash
# Production Supabase (CONFIRMED - from vision.md)
DATABASE_URL="postgresql://[pooled-connection]@npylfibbutxioxjtcbvy.supabase.co?pgbouncer=true"
DIRECT_URL="postgresql://[direct-connection]@npylfibbutxioxjtcbvy.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://npylfibbutxioxjtcbvy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# Cron Security (REQUIRED)
CRON_SECRET="<64-char-hex>" # openssl rand -hex 32

# Encryption (REQUIRED for Plaid)
ENCRYPTION_KEY="<64-char-hex>" # openssl rand -hex 32
```

**Environment Variable Categories:**

| Category | Variables | Security Level | Required For |
|----------|-----------|----------------|--------------|
| **Database** | DATABASE_URL, DIRECT_URL | HIGH | Core functionality |
| **Supabase Public** | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | MEDIUM (public) | Auth, frontend |
| **Supabase Private** | SUPABASE_SERVICE_ROLE_KEY | CRITICAL (server-only) | Admin operations |
| **Cron Security** | CRON_SECRET | HIGH | Vercel cron jobs |
| **Encryption** | ENCRYPTION_KEY | HIGH | Plaid token storage |
| **Optional** | PLAID_*, ANTHROPIC_API_KEY, RESEND_API_KEY | MEDIUM | Extended features |

**Key Pattern**: Prisma uses dual connection strings:
- `DATABASE_URL`: Pooled connection (PgBouncer) for serverless queries
- `DIRECT_URL`: Direct connection for migrations (bypasses pooler)

### External Service Integrations

**1. Supabase Integration:**

**Client-side** (`src/lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server-side** (`src/lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { /* SSR-safe cookie setting */ },
        remove(name, options) { /* SSR-safe cookie removal */ }
      }
    }
  )
}
```

**Auth Flow**:
- Supabase handles email/password, magic links, OAuth (Google)
- NextAuth integration DEPRECATED (being removed)
- tRPC middleware syncs Supabase user to Prisma database

**2. Vercel Deployment Integration:**

**Existing Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Cron Implementation** (`src/app/api/cron/generate-recurring/route.ts`):
- Protected by `CRON_SECRET` bearer token
- Vercel sends: `Authorization: Bearer <CRON_SECRET>`
- Generates recurring transactions daily at 2 AM UTC
- Returns JSON status for monitoring

**Missing Optimization** (recommended add):
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // ← ADD THIS for optimized Docker/Vercel builds
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}
```

**3. GitHub Integration:**

**Repository**: Ahiya1/wealth (confirmed from plan)
**Branch**: main (production trigger)
**Integration Pattern**:
- Push to main → Automatic Vercel deployment
- Preview deployments for other branches
- Build status checks visible in GitHub

**4. Plaid Integration (Optional but Configured):**

**Service Pattern** (`src/server/services/plaid.service.ts`):
- US-only accounts (`CountryCode.Us`)
- Sandbox environment for development
- Access tokens encrypted with AES-256-GCM
- No currency conversion (assumes USD Plaid data)

**Encryption Pattern** (`src/lib/encryption.ts`):
```typescript
const ALGORITHM = 'aes-256-gcm'
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}
```

**NIS Consideration**: Plaid is US-centric. For Israeli market, will need different bank integration (likely manual accounts only).

### Build and Deployment Patterns

**Production Build Verification:**

```bash
npm run build
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Generating static pages (29/29)
# Route (app)                              Size     First Load JS
# ├ ƒ /                                    930 B    133 kB
# ├ ƒ /dashboard                           8.43 kB  176 kB
# ├ ƒ /api/trpc/[trpc]                     0 B      0 B
```

**Build Success Indicators**:
- No TypeScript errors
- No ESLint errors
- 29 routes generated
- Serverless functions at 0 B (good - edge runtime)
- Largest route: 382 kB (budgets page with charts)

**Missing Middleware**: No `src/middleware.ts` found, but `middleware.ts` exists at root
- Handles protected routes via Supabase auth
- Redirects unauthenticated users to /signin

**Next.js Patterns in Use**:
- App Router (not Pages Router)
- Server Components by default
- Client Components marked with 'use client'
- Server Actions for mutations
- Dynamic routes: `[id]`, `[month]`
- API routes: `/api/trpc/[trpc]`, `/api/cron/generate-recurring`

### Database Migration Patterns

**Prisma Migration Strategy**:

**Local Development**:
```bash
npm run db:push  # Push schema without migrations
npm run db:generate  # Regenerate Prisma Client
```

**Production Deployment**:
```bash
# Option 1: Direct push (recommended for fresh deploy)
DATABASE_URL="<production>" npx prisma db push

# Option 2: Migration files (for future changes)
npx prisma migrate deploy
```

**Supabase Configuration** (`supabase/config.toml`):
- Custom ports (54421-54432) to avoid conflicts
- PgBouncer pooler enabled (transaction mode)
- Email testing via Inbucket (port 54424)
- Auth enabled with email confirmations
- Realtime disabled (not needed for MVP)
- Storage disabled (no file uploads)

**Connection Pooling**:
```toml
[db.pooler]
enabled = true
port = 54422
pool_mode = "transaction"  # ← Critical for Prisma
default_pool_size = 20
max_client_conn = 100
```

**Production Pattern**:
- Use pooled connection string for queries: `?pgbouncer=true&connection_limit=1`
- Use direct connection for migrations: `DIRECT_URL` without pooler

## Patterns Identified

### Pattern 1: Centralized Currency Formatting

**Description**: All currency displays use a single `formatCurrency()` utility function from `src/lib/utils.ts`. No hardcoded currency symbols in components.

**Use Case**: 
- Transaction displays
- Account balances
- Budget amounts
- Analytics charts
- Goal progress

**Example**:
```typescript
// Component usage
import { formatCurrency } from '@/lib/utils'

<p>{formatCurrency(Math.abs(Number(account.balance)))}</p>
// Current output: "$1,234.56"
// After NIS migration: "1,234.56 ₪"
```

**Recommendation**: ✅ MAINTAIN THIS PATTERN
- Makes currency migration trivial (update 1 function)
- Consistent formatting across entire app
- Type-safe (TypeScript enforces number input)
- For NIS migration: Update `formatCurrency()` to use custom formatter or `he-IL` locale

**Implementation for NIS**:
```typescript
export function formatCurrency(amount: number): string {
  // Option 1: Custom format (recommended for symbol-after pattern)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ₪` // Israeli convention: amount then symbol
  
  // Option 2: Israeli locale (may not position symbol correctly)
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
  }).format(amount)
}
```

### Pattern 2: tRPC with Supabase Auth

**Description**: tRPC procedures protected by Supabase authentication middleware. Auto-syncs Supabase users to Prisma database on first login.

**Use Case**: All API endpoints (accounts, transactions, budgets, analytics, etc.)

**Example** (`src/server/api/trpc.ts`):
```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      user: ctx.user, // Prisma User (non-null)
      supabaseUser: ctx.supabaseUser!,
      prisma: ctx.prisma,
    }
  })
})

// Usage in routers
export const accountsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: { userId: ctx.user.id }
    })
  })
})
```

**Recommendation**: ✅ PRODUCTION READY
- No changes needed for deployment
- Auto-creates Prisma user on first Supabase login
- Admin procedure pattern available for privileged operations
- Error handling with Zod validation

### Pattern 3: Environment-Based Configuration

**Description**: Dual environment setup (local vs. production) with different Supabase instances and database connections.

**Use Case**: Development, testing, staging, production environments

**Example**:
```typescript
// Local: http://localhost:54421
// Production: https://npylfibbutxioxjtcbvy.supabase.co

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // Auto-detects env
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Recommendation**: ✅ IMPLEMENT WITH CAUTION
- Ensure `.env.local` is in `.gitignore` (already is)
- Use Vercel environment variable scopes (Production, Preview, Development)
- Generate new secrets for production (`CRON_SECRET`, `ENCRYPTION_KEY`)
- Test with Vercel preview deployments before production

**Production Checklist**:
1. Create production Supabase project (✅ already exists)
2. Run migrations on production: `DATABASE_URL="<prod>" npx prisma db push`
3. Configure Vercel env vars (7 required variables)
4. Test preview deployment
5. Promote to production

### Pattern 4: Serverless Cron Jobs

**Description**: Vercel Cron triggers API routes on schedule. Protected by bearer token authentication.

**Use Case**: Recurring transaction generation (daily at 2 AM UTC)

**Example**:
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/generate-recurring",
    "schedule": "0 2 * * *"
  }]
}

// API route
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const results = await generatePendingRecurringTransactions()
  return NextResponse.json({ success: true, results })
}
```

**Recommendation**: ✅ PRODUCTION READY
- Already configured in `vercel.json`
- Security pattern implemented correctly
- Manual testing available via curl
- Monitoring via Vercel dashboard function logs

**Testing**:
```bash
# Local test
curl http://localhost:3000/api/cron/generate-recurring \
  -H "Authorization: Bearer <CRON_SECRET>"

# Production test (after deployment)
curl https://<vercel-domain>/api/cron/generate-recurring \
  -H "Authorization: Bearer <production-CRON_SECRET>"
```

### Pattern 5: Prisma Decimal Handling

**Description**: Financial amounts stored as `Decimal` in Prisma, converted to `number` for display/calculations.

**Use Case**: Transaction amounts, account balances, budget amounts, goal targets

**Example**:
```typescript
// Prisma schema
model Transaction {
  amount Decimal @db.Decimal(15, 2)
}

// Component usage
const absAmount = Math.abs(Number(transaction.amount))
const formatted = formatCurrency(absAmount)

// Export handling (jsonExport.ts)
const sanitizeDecimals = (obj: unknown): unknown => {
  if (typeof obj === 'object' && 'toNumber' in obj) {
    return (obj as { toNumber: () => number }).toNumber()
  }
  // ...
}
```

**Recommendation**: ✅ MAINTAIN THIS PATTERN
- Prevents floating-point precision errors
- Prisma Decimal preserves exact monetary values
- Convert to number only at display boundary
- No changes needed for NIS migration (just formatting)

### Pattern 6: Component-Level Data Fetching with tRPC

**Description**: Client components use tRPC hooks for data fetching with React Query caching.

**Use Case**: Dashboard, transactions, accounts, budgets, analytics

**Example**:
```typescript
'use client'
import { trpc } from '@/lib/trpc/client'

export function TransactionList() {
  const { data: transactions, isLoading } = trpc.transactions.getAll.useQuery({
    page: 1,
    limit: 50
  })
  
  if (isLoading) return <Skeleton />
  
  return transactions?.map(txn => (
    <TransactionCard key={txn.id} transaction={txn} />
  ))
}
```

**Recommendation**: ✅ PRODUCTION READY
- React Query handles caching, refetching, error states
- tRPC provides full type safety (no manual API types)
- Optimistic updates available for mutations
- No changes needed for deployment

## Complexity Assessment

### High Complexity Areas

**1. Currency Migration (MEDIUM-HIGH)**
- **Why**: 172 occurrences across 68 files requires systematic verification
- **Estimated splits**: 0 (single builder can handle with grep-based approach)
- **Rationale**: 
  - Centralized `formatCurrency()` reduces complexity
  - Pattern is mechanical: find-and-replace USD→NIS
  - Visual QA needed across all pages
  - Risk: Missing edge cases in tests, exports, or analytics
- **Builder guidance**: 
  1. Update `constants.ts` and `utils.ts` (core)
  2. Grep for remaining USD/$ references
  3. Update database defaults in Prisma schema
  4. Run all tests to catch failures
  5. Visual verification on all routes

**2. Vercel Production Deployment (MEDIUM)**
- **Why**: Multiple external dependencies (GitHub, Vercel, Supabase production)
- **Estimated splits**: 0 (single builder with step-by-step checklist)
- **Rationale**:
  - Well-documented patterns (VERCEL_DEPLOYMENT.md exists)
  - Environment variables are straightforward mapping
  - Vercel preview deployments enable risk-free testing
  - Cron job already configured
- **Builder guidance**:
  1. Configure 7 environment variables in Vercel
  2. Link GitHub repository (already exists)
  3. Run `npx prisma db push` on production database
  4. Deploy to preview first
  5. Test manually before production promotion
  6. Verify cron job execution in logs

**3. Database Migration to Production (LOW-MEDIUM)**
- **Why**: Fresh deployment (no data migration), but needs connection pooling setup
- **Estimated splits**: 0 (included in deployment task)
- **Rationale**:
  - No existing data to migrate (fresh production instance)
  - Prisma handles schema application
  - Connection pooling already configured in schema
- **Builder guidance**:
  1. Use pooled connection string: `?pgbouncer=true&connection_limit=1`
  2. Set `DIRECT_URL` for migrations (bypass pooler)
  3. Run `npx prisma db push` with production credentials
  4. Verify tables created in Supabase Studio
  5. Run seed script if needed (demo data)

### Medium Complexity Areas

**4. Environment Variable Management (MEDIUM)**
- **Complexity**: 7 required variables, 3 optional categories, dual environment setup
- **Builder guidance**: Use Vercel environment variable UI, copy from `.env.example`, generate new secrets for production

**5. Email Template Configuration (LOW-MEDIUM)**
- **Complexity**: HTML design + Supabase auth configuration
- **Deferred to**: Iteration 2 (per master plan)
- **Note**: Supabase built-in email assumed available; verify SMTP enabled

**6. Admin User Creation (LOW)**
- **Complexity**: Single-step operation via Supabase dashboard
- **Deferred to**: Iteration 2
- **Methods**: Dashboard UI, SQL INSERT, or seed script

### Low Complexity Areas

**7. GitHub Integration (LOW)**
- **Why**: Repository already exists, just needs Vercel connection
- **Steps**: Click "Import" in Vercel, select repo, done

**8. HTTPS/Security Configuration (ZERO)**
- **Why**: Vercel enables HTTPS automatically
- **No action needed**: SSL certs managed by Vercel

**9. Build Optimization (LOW)**
- **Why**: Add single line to `next.config.js`
- **Optional**: `output: 'standalone'` for smaller Docker builds

## Technology Recommendations

### Primary Stack (No Changes Needed)

**Frontend Framework:**
- ✅ **Next.js 14.2.33** (App Router)
- **Rationale**: 
  - Server Components reduce bundle size
  - Built-in API routes eliminate separate backend
  - Vercel deployment optimized for Next.js
  - tRPC integration is mature
- **Production config**: Add `output: 'standalone'` to next.config.js

**Database & ORM:**
- ✅ **Supabase PostgreSQL** (Production instance ready)
- ✅ **Prisma 5.22.0**
- **Rationale**:
  - Production Supabase already provisioned
  - Connection pooling configured correctly
  - Prisma migrations work seamlessly
  - No breaking changes needed
- **Production config**: Use pooled + direct URLs

**Authentication:**
- ✅ **Supabase Auth** (SSR-compatible)
- **Rationale**:
  - Email verification built-in
  - OAuth providers available (Google)
  - Row Level Security (RLS) policies
  - Server-side session handling via cookies
- **Production config**: Enable email confirmations, configure templates

**API Layer:**
- ✅ **tRPC 11.6.0**
- **Rationale**:
  - Full type safety from DB to frontend
  - No OpenAPI/Swagger overhead
  - React Query integration for caching
  - Procedure-based auth middleware
- **Production config**: No changes needed

**Hosting:**
- ✅ **Vercel** (Account: ahiya1)
- **Rationale**:
  - Zero-config Next.js deployment
  - Automatic HTTPS
  - Cron jobs included (free tier)
  - Preview deployments for testing
  - Edge network (global CDN)
- **Production config**: Set environment variables, connect GitHub

### Supporting Libraries (Keep All)

**UI & Styling:**
- `tailwindcss` (3.4.1) - Utility-first CSS
- `@radix-ui/*` - Accessible components
- `framer-motion` (12.23.22) - Animations
- `lucide-react` (0.460.0) - Icons
- **Rationale**: No bloat, all actively used in UI

**Data Management:**
- `@tanstack/react-query` (5.80.3) - Server state management
- `superjson` (2.2.1) - Serialization for tRPC
- `zod` (3.23.8) - Schema validation
- **Rationale**: Core to tRPC architecture

**Charting:**
- `recharts` (2.12.7) - Analytics charts
- **Rationale**: Lightweight, works with NIS formatting

**Date Handling:**
- `date-fns` (3.6.0) - Date manipulation
- **Rationale**: No timezone issues, locale support

**Forms:**
- `react-hook-form` (7.53.2) - Form state
- `@hookform/resolvers` (3.9.1) - Zod integration
- **Rationale**: Type-safe, minimal re-renders

**Optional Services (Pre-configured but not required for MVP):**
- Plaid (bank connections) - US-centric, may not work for Israeli banks
- Anthropic Claude (AI categorization) - Works globally
- Resend (email sending) - Alternative to Supabase email

### New Dependencies (None Needed)

**No additional dependencies required for Iteration 1**
- Currency migration uses built-in Intl.NumberFormat
- Vercel deployment uses existing infrastructure
- Environment management is Next.js native

## Integration Points

### External APIs

**1. Supabase Production API**
- **Endpoint**: `https://npylfibbutxioxjtcbvy.supabase.co`
- **Purpose**: PostgreSQL database + Auth services
- **Complexity**: LOW (same API as local, just different URL)
- **Considerations**:
  - Connection pooling via PgBouncer
  - Row Level Security (RLS) policies must be enabled
  - Email sending must be configured (SMTP or Supabase built-in)
  - Rate limiting (free tier: 500 MB database, 2 GB bandwidth/month)

**2. Vercel Deployment API**
- **Purpose**: Automatic deployments, cron jobs, edge functions
- **Complexity**: LOW (GitHub push triggers deployment)
- **Considerations**:
  - Build timeout: 10 minutes (free tier)
  - Function execution timeout: 10s (free tier), 60s (Pro)
  - Cron job execution: unlimited (free tier includes cron)
  - Environment variables: Manage via dashboard

**3. GitHub API**
- **Repository**: `git@github.com:Ahiya1/wealth.git`
- **Purpose**: Source control + deployment trigger
- **Complexity**: ZERO (just connect in Vercel UI)
- **Considerations**:
  - Main branch = production deployment
  - Other branches = preview deployments
  - Build status checks visible in PRs

**4. Plaid API (Optional)**
- **Purpose**: US bank account connections
- **Complexity**: MEDIUM (already implemented, but US-only)
- **Considerations for NIS**:
  - Plaid doesn't support Israeli banks
  - Recommend manual account tracking for MVP
  - If Israeli bank integration needed, consider:
    - Salt Edge (EU/Israel coverage)
    - Akoya (emerging standard)
    - Direct bank APIs (varies by institution)

### Internal Integrations

**1. tRPC Router ↔ Prisma Database**
- **Connection**: `src/server/api/routers/*.ts` → Prisma Client
- **Pattern**: Protected procedures query database via `ctx.prisma`
- **Type Safety**: Full end-to-end (Prisma → tRPC → React Query)
- **No changes needed**: Works identically in production

**2. Supabase Auth ↔ Prisma User Table**
- **Sync Pattern**: Auto-create Prisma user on first Supabase login
- **Code**: `src/server/api/trpc.ts` (createTRPCContext)
- **Flow**:
  1. User signs in via Supabase Auth
  2. tRPC middleware checks for Prisma user with `supabaseAuthId`
  3. If not found, creates new Prisma user
  4. All app data tied to Prisma user ID
- **No changes needed**: Production ready

**3. Next.js API Routes ↔ Vercel Cron**
- **Endpoint**: `/api/cron/generate-recurring`
- **Security**: Bearer token authentication (`CRON_SECRET`)
- **Schedule**: Daily at 2 AM UTC (`0 2 * * *`)
- **Monitoring**: Vercel function logs
- **Test**: Manual curl with correct secret

**4. Client Components ↔ tRPC API**
- **Pattern**: React Query hooks (`trpc.transactions.getAll.useQuery()`)
- **Caching**: Automatic via React Query
- **Optimistic Updates**: Available for mutations
- **Error Handling**: tRPC error codes mapped to UI states

## Risks & Challenges

### Technical Risks

**Risk 1: Currency Display Edge Cases**
- **Impact**: MEDIUM - Visual inconsistencies across app
- **Likelihood**: MEDIUM (172 occurrences, easy to miss one)
- **Mitigation**:
  1. Use systematic grep for all USD/$ references
  2. Update centralized `formatCurrency()` function first
  3. Run full test suite to catch failures
  4. Visual QA on all 29 routes
  5. Test chart axes formatting (Recharts)
  6. Verify CSV/JSON exports include NIS metadata
- **Rollback**: Revert git commit if issues found

**Risk 2: Database Connection Pooling Misconfiguration**
- **Impact**: HIGH - App crashes or slow performance
- **Likelihood**: LOW (pattern well-documented)
- **Mitigation**:
  1. Use correct connection strings:
     - Queries: `?pgbouncer=true&connection_limit=1`
     - Migrations: Direct URL (no pooler)
  2. Test with Vercel preview deployment first
  3. Monitor connection count in Supabase dashboard
  4. Set `connection_limit=1` for serverless (prevents exhaustion)
- **Rollback**: Update DATABASE_URL in Vercel env vars

**Risk 3: Environment Variable Exposure**
- **Impact**: CRITICAL - Security breach if service role key exposed
- **Likelihood**: LOW (Vercel handles securely)
- **Mitigation**:
  1. Never commit `.env.local` to git (already in .gitignore)
  2. Use Vercel environment variable scopes:
     - NEXT_PUBLIC_* = Safe for client
     - Others = Server-side only
  3. Rotate secrets if compromised
  4. Use different secrets for production vs. preview
- **Detection**: Monitor Supabase logs for unauthorized requests

**Risk 4: Vercel Build Timeout**
- **Impact**: MEDIUM - Deployment fails
- **Likelihood**: LOW (current build: ~2 minutes)
- **Mitigation**:
  1. Free tier allows 10-minute builds (plenty of headroom)
  2. Add `output: 'standalone'` to reduce build size
  3. Use Next.js build cache (Vercel enables by default)
  4. Remove unused dependencies (already lean)
- **Rollback**: Previous deployment remains live

**Risk 5: Cron Job Authentication Failure**
- **Impact**: LOW - Recurring transactions don't generate
- **Likelihood**: LOW (pattern tested locally)
- **Mitigation**:
  1. Generate `CRON_SECRET` securely: `openssl rand -hex 32`
  2. Test manually after deployment:
     ```bash
     curl https://<domain>/api/cron/generate-recurring \
       -H "Authorization: Bearer <CRON_SECRET>"
     ```
  3. Verify `CRON_SECRET` in Vercel matches code expectation
  4. Check Vercel function logs for 401 errors
- **Detection**: Monitor cron execution in Vercel dashboard

### Complexity Risks

**Risk 6: Missing USD References in Tests**
- **Impact**: LOW-MEDIUM - Tests fail after migration
- **Likelihood**: MEDIUM (57 test files exist)
- **Mitigation**:
  1. Update test expectations from `"$1,234.56"` to `"1,234.56 ₪"`
  2. Run full test suite: `npm test`
  3. Update snapshots if using snapshot testing
  4. Check test mocks for hardcoded USD values
- **Detection**: CI/CD will catch failing tests

**Risk 7: Plaid Integration Breaks with NIS**
- **Impact**: LOW (Plaid is optional feature)
- **Likelihood**: HIGH (Plaid doesn't support Israeli banks)
- **Mitigation**:
  1. Disable Plaid UI in settings (hide "Connect Bank" button)
  2. Focus on manual account tracking for MVP
  3. Document that Plaid is US-only
  4. Future: Research Israeli bank integration options
- **Workaround**: Manual CSV imports or direct entry

## Recommendations for Planner

### 1. Use Systematic Currency Migration Approach

**Rationale**: The codebase's centralized `formatCurrency()` pattern makes migration straightforward, but 172 occurrences require systematic verification.

**Approach**:
1. **Phase 1**: Update core utilities
   - `src/lib/constants.ts`: Change CURRENCY_CODE/SYMBOL/NAME
   - `src/lib/utils.ts`: Update `formatCurrency()` to NIS format
   
2. **Phase 2**: Grep-based verification
   ```bash
   # Find remaining USD references
   rg "USD|\\$(?!\\{)|dollar" --type ts --type tsx src/
   
   # Expected: Only in tests, comments, or historical data
   ```

3. **Phase 3**: Database defaults
   - `prisma/schema.prisma`: Change `@default("USD")` to `@default("NIS")`
   - Run `npx prisma db push` on production

4. **Phase 4**: Visual QA
   - Test all 29 routes manually
   - Verify charts show "₪" on axes
   - Check exports (CSV, JSON) include NIS

**Estimated Time**: 3-4 hours (including QA)

### 2. Deploy to Vercel Preview Before Production

**Rationale**: Preview deployments enable risk-free testing of production configuration.

**Workflow**:
1. Create `preview` branch with all currency changes
2. Push to GitHub → Vercel auto-deploys preview
3. Test preview URL with production Supabase
4. Verify cron job works (manual trigger)
5. If all tests pass, merge to `main` for production

**Benefits**:
- Zero downtime (preview doesn't affect main)
- Test exact production config
- Rollback by not merging

**Estimated Time**: 1 hour (setup + testing)

### 3. Generate Fresh Production Secrets

**Rationale**: Never reuse local development secrets in production.

**Action Items**:
```bash
# Generate CRON_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY (if using Plaid)
openssl rand -hex 32

# Generate NEXTAUTH_SECRET (if still using NextAuth)
openssl rand -base64 32
```

**Add to Vercel**:
- Scope: Production only (not Preview or Development)
- Mark as sensitive (hidden in logs)

**Estimated Time**: 15 minutes

### 4. Add Build Optimization to next.config.js

**Rationale**: Reduces Vercel build time and deployment size.

**Change**:
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // ← ADD THIS
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}
```

**Benefits**:
- Smaller Docker images (if using containers)
- Faster cold starts on Vercel
- Better resource utilization

**Estimated Time**: 2 minutes

### 5. Document Currency Format for Future Contributors

**Rationale**: Make NIS convention explicit for future developers.

**Create**: `docs/currency-formatting.md`
```markdown
# Currency Formatting - NIS Only

Wealth uses Israeli Shekel (NIS/ILS) exclusively.

**Format**: `1,234.56 ₪` (amount first, symbol after)
**Utility**: `formatCurrency(amount)` from `src/lib/utils.ts`
**Never**: Hardcode "₪" in components

## Examples
- Transaction: "150.00 ₪"
- Account balance: "5,432.10 ₪"
- Budget: "2,000.00 ₪"
```

**Estimated Time**: 15 minutes

### 6. Verify Supabase Email Configuration

**Rationale**: Email verification required for Iteration 2, but SMTP setup may be needed.

**Pre-flight Check**:
1. Log into Supabase dashboard: https://app.supabase.com
2. Go to Project Settings → Auth → Email Templates
3. Verify SMTP is configured (or use Supabase built-in email)
4. Test email delivery:
   - Send test signup email
   - Check inbox (or Supabase logs if delivery fails)

**If SMTP not configured**:
- Use Supabase built-in email (limited to 3 emails/hour on free tier)
- OR configure custom SMTP (Resend, SendGrid, AWS SES)

**Estimated Time**: 30 minutes (defer to Iteration 2)

### 7. Use .env.production for Local Production Testing

**Rationale**: Test production configuration locally before deploying.

**Workflow**:
```bash
# Create .env.production with production values
cp .env.example .env.production

# Edit with production Supabase URLs and secrets
# TEST LOCALLY:
NODE_ENV=production npm run build
NODE_ENV=production npm start

# Verify connection to production database
```

**Benefits**:
- Catch configuration errors before deployment
- Test database migrations against production

**Caution**: Don't commit `.env.production` to git

**Estimated Time**: 15 minutes

## Resource Map

### Critical Files/Directories

**Currency Formatting:**
- `/src/lib/constants.ts` - Currency constants (CURRENCY_CODE, CURRENCY_SYMBOL)
- `/src/lib/utils.ts` - formatCurrency() utility function
- `/src/lib/csvExport.ts` - CSV export with currency metadata
- `/src/lib/jsonExport.ts` - JSON export with currency in user object

**Environment Configuration:**
- `/.env.example` - Template for all required variables
- `/.env.local` - Local development config (gitignored)
- `/vercel.json` - Vercel-specific config (cron jobs)
- `/next.config.js` - Next.js build configuration

**Database & Auth:**
- `/prisma/schema.prisma` - Database schema with currency defaults
- `/src/lib/supabase/client.ts` - Client-side Supabase initialization
- `/src/lib/supabase/server.ts` - Server-side Supabase with cookies
- `/src/server/api/trpc.ts` - tRPC context with auth middleware

**Deployment:**
- `/VERCEL_DEPLOYMENT.md` - Comprehensive deployment guide
- `/DEV_SETUP.md` - Local development setup
- `/USD_ONLY_IMPLEMENTATION.md` - Previous currency migration notes
- `/supabase/config.toml` - Supabase local configuration

**API Routes:**
- `/src/app/api/trpc/[trpc]/route.ts` - tRPC API handler
- `/src/app/api/cron/generate-recurring/route.ts` - Vercel cron endpoint
- `/src/server/api/root.ts` - tRPC router aggregation

**Display Components (58 files use formatCurrency):**
- `/src/components/transactions/TransactionCard.tsx`
- `/src/components/accounts/AccountCard.tsx`
- `/src/components/dashboard/DashboardStats.tsx`
- `/src/components/budgets/BudgetCard.tsx`
- `/src/components/analytics/*.tsx` (5 chart components)
- ... (see full list via grep)

### Key Dependencies

**Production Critical:**
- `next@14.2.33` - App framework
- `@prisma/client@5.22.0` - Database ORM
- `@supabase/supabase-js@2.58.0` - Auth + database client
- `@trpc/server@11.6.0` - API layer

**Type Safety:**
- `typescript@5.7.2` - Language
- `zod@3.23.8` - Schema validation

**UI Critical:**
- `react@18.3.1` - UI library
- `tailwindcss@3.4.1` - Styling
- `@radix-ui/*` - Accessible components

**Data Management:**
- `@tanstack/react-query@5.80.3` - Server state
- `superjson@2.2.1` - Serialization

**Optional (Not Required for MVP):**
- `plaid@28.0.0` - Bank connections (US-only)
- `@anthropic-ai/sdk@0.32.1` - AI categorization
- `recharts@2.12.7` - Analytics charts (works with NIS)

### Testing Infrastructure

**Testing Framework:**
- `vitest@3.2.4` - Test runner (Vite-based)
- `@vitest/ui@3.2.4` - Test UI
- `vitest-mock-extended@3.1.0` - Mocking utilities

**Test Coverage:**
- 57 test files across:
  - `src/server/api/routers/__tests__/` - API router tests
  - `src/server/services/__tests__/` - Business logic tests
  - `src/lib/__tests__/` - Utility tests

**Test Commands:**
```bash
npm test              # Run all tests
npm run test:ui       # Run with UI
npm run test:coverage # Run with coverage report
```

**Test Pattern for Currency**:
```typescript
// Before (USD)
expect(formatCurrency(1234.56)).toBe('$1,234.56')

// After (NIS) - UPDATE IN TESTS
expect(formatCurrency(1234.56)).toBe('1,234.56 ₪')
```

**Estimated Test Updates**: 15-20 test files (grep for `formatCurrency` in tests)

## Questions for Planner

### 1. Currency Format Symbol Position Confirmation

**Question**: Confirm NIS format should be `"1,234.56 ₪"` (symbol AFTER amount) vs. `"₪1,234.56"` (symbol BEFORE)?

**Context**: 
- Israeli convention typically places ₪ after amount
- Intl.NumberFormat with `he-IL` locale may vary
- Need explicit confirmation for consistency

**Recommendation**: Use `"1,234.56 ₪"` (symbol after) per vision.md specification

### 2. Plaid Integration Handling

**Question**: Should Plaid integration be disabled in production since it only supports US banks?

**Context**:
- Plaid doesn't support Israeli banks
- Current implementation assumes USD transactions
- Alternative: Manual account tracking only

**Options**:
1. Hide Plaid UI in settings (recommended for MVP)
2. Keep visible but show "US banks only" disclaimer
3. Research Israeli bank integration alternatives (future)

**Recommendation**: Option 1 (hide Plaid for NIS-only MVP)

### 3. Email Service Configuration

**Question**: Should we use Supabase built-in email or configure custom SMTP (Resend/SendGrid)?

**Context**:
- Supabase free tier: 3 emails/hour limit
- Custom SMTP: Unlimited (but requires configuration)
- Email templates deferred to Iteration 2

**Options**:
1. Use Supabase built-in (simple, limited)
2. Configure Resend (professional, requires API key)
3. Defer decision to Iteration 2

**Recommendation**: Option 3 (verify Supabase email works, defer SMTP config)

### 4. Test Environment Strategy

**Question**: Should we create a separate staging environment or use Vercel preview deployments for testing?

**Context**:
- Vercel preview deployments: Free, automatic per branch
- Staging environment: Separate Supabase project + Vercel deployment (costs more)
- Preview deployments sufficient for single-developer use

**Recommendation**: Use Vercel preview deployments (included in plan, cost-effective)

### 5. Database Backup Strategy

**Question**: Should we configure automated database backups in production Supabase?

**Context**:
- Supabase free tier: Daily backups for 7 days (automatic)
- Paid tier: Point-in-time recovery
- MVP may not need beyond default backups

**Options**:
1. Rely on Supabase automatic backups (free tier default)
2. Set up manual backup scripts (pg_dump)
3. Upgrade to paid tier for PITR

**Recommendation**: Option 1 (Supabase automatic backups sufficient for MVP)

### 6. Analytics and Monitoring

**Question**: Should we add error tracking (Sentry) or analytics (Vercel Analytics) in Iteration 1?

**Context**:
- Vision.md lists these as "Should-Have (Post-MVP)"
- Vercel Analytics free tier: 2,500 events/month
- Sentry free tier: 5,000 errors/month
- Both require additional configuration

**Recommendation**: Defer to post-MVP (focus on core deployment first, add monitoring incrementally)

---

**Report Completed**: 2025-11-01  
**Explorer**: Explorer-2  
**Focus**: Technology Patterns & Dependencies  
**Iteration**: 12 (Iteration 1 of plan-3)  
**Status**: COMPLETE
