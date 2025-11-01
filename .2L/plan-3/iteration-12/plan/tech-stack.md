# Technology Stack

## Core Framework
**Decision:** Next.js 14.2.33 (App Router)

**Rationale:**
- Already implemented and production-ready in codebase
- Server Components reduce bundle size for dashboard-heavy app (first load: 133 kB)
- Built-in API routes eliminate need for separate backend
- Vercel deployment is one-click with automatic HTTPS
- Excellent TypeScript support (v5.7.2 strict mode)
- tRPC integration mature and stable
- No breaking changes needed for currency migration or production deployment

**Alternatives Considered:**
- Remix: Not chosen (requires rewrite, no tRPC compatibility)
- Vite + React: Not chosen (need SSR for auth, more boilerplate)

## Database
**Decision:** PostgreSQL via Supabase (Production instance already provisioned)

**Rationale:**
- Production instance URL: https://npylfibbutxioxjtcbvy.supabase.co
- Connection pooling configured (PgBouncer transaction mode, port 6543)
- Row Level Security (RLS) for multi-tenancy
- Free tier sufficient: 500MB storage, 2GB bandwidth/month, 60 concurrent connections
- Automatic daily backups for 7 days
- Direct integration with Supabase Auth

**Schema Strategy:**
- Prisma ORM 5.22.0 for type-safe database queries
- Schema-first approach (single source of truth in prisma/schema.prisma)
- Decimal type for monetary amounts (prevents floating-point precision errors)
- Dual connection strings:
  - DATABASE_URL: Pooled connection (runtime queries) - `?pgbouncer=true&connection_limit=1`
  - DIRECT_URL: Direct connection (migrations) - port 5432
- Migration strategy: `npx prisma db push` for fresh production deployment (no migration files needed)
- Currency defaults: User.currency and Account.currency default to "NIS" (updated from "USD")

## Authentication
**Decision:** Supabase Auth with email/password + OAuth

**Rationale:**
- Production-ready authentication (email verification, password reset, magic links)
- JWT-based sessions stored in HTTP-only cookies
- SSR-compatible via @supabase/ssr (0.5.2)
- OAuth providers available (Google, GitHub) - can add later
- Admin operations via SUPABASE_SERVICE_ROLE_KEY
- Middleware integration for protected routes (middleware.ts)

**Implementation Notes:**
- Client-side: createBrowserClient() in src/lib/supabase/client.ts
- Server-side: createServerClient() with cookie handling in src/lib/supabase/server.ts
- Auto-sync: Supabase users synced to Prisma User table on first login (tRPC middleware)
- Email verification: Deferred to Iteration 2 (custom branded templates)

## API Layer
**Decision:** tRPC 11.6.0 (type-safe API)

**Rationale:**
- End-to-end type safety (Prisma → tRPC → React Query)
- No OpenAPI/Swagger overhead (TypeScript types auto-generated)
- React Query integration for caching and optimistic updates
- Procedure-based authentication (protectedProcedure, adminProcedure)
- SuperJSON serialization (handles Prisma Decimal, Date types)

**Implementation:**
- Root router: src/server/api/root.ts (aggregates 11 sub-routers)
- Context: Injects Prisma client, Supabase user, Prisma user
- Protected routes: Middleware checks Supabase session, throws UNAUTHORIZED if missing
- API endpoint: /api/trpc/[trpc] (single Next.js route handler)

## Frontend
**Decision:** React 18.3.1 with Server Components

**UI Component Library:** Radix UI (accessible primitives)
- @radix-ui/react-dialog (modals)
- @radix-ui/react-dropdown-menu (dropdowns)
- @radix-ui/react-select (form selects)
- @radix-ui/react-toast (notifications)

**Styling:** Tailwind CSS 3.4.1 (utility-first)
- Custom theme: Sage green (#059669) primary, warm grays
- Custom animations via Tailwind config
- No CSS modules or styled-components (reduces bundle size)

**Rationale:**
- React 18 concurrent features (Suspense, Streaming SSR)
- Server Components for data-heavy pages (dashboard, analytics)
- Client Components only where needed ('use client' directive)
- Radix UI: Accessible, unstyled, works with Tailwind
- Tailwind: Fast, consistent, no runtime CSS-in-JS overhead

## External Integrations

### Supabase Production
**Purpose:** Database hosting + authentication services
**Library:** @supabase/supabase-js (2.58.0), @supabase/ssr (0.5.2)
**Implementation:**
- Client: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (public, safe for client-side)
- Server: SUPABASE_SERVICE_ROLE_KEY (server-only, critical security)
- Connection pooling: PgBouncer transaction mode
- RLS policies: Enforce user-level data isolation

### Vercel Deployment
**Purpose:** Hosting + automatic deployments + cron jobs
**Configuration:** vercel.json (cron schedule), GitHub integration
**Implementation:**
- Cron job: /api/cron/generate-recurring (daily at 2 AM UTC)
- Environment variables: 7 required, configured via Vercel dashboard
- Build optimization: output: 'standalone' in next.config.js (recommended)
- Automatic HTTPS: Enabled by default
- Preview deployments: Automatic for non-main branches

### GitHub Repository
**Purpose:** Source control + deployment trigger
**Repository:** git@github.com:Ahiya1/wealth.git
**Implementation:**
- Main branch: Production deployments (auto-deploy on push)
- Other branches: Preview deployments (separate URLs for testing)
- Build status: Reported back to GitHub (green checkmark on commits)
- Vercel GitHub App: Automatically configures webhooks

### Plaid API (Optional - NOT IN MVP)
**Purpose:** US bank account connections
**Library:** plaid (28.0.0)
**Implementation:**
- Currently configured but US-centric (not suitable for Israeli banks)
- Access tokens encrypted with AES-256-GCM (ENCRYPTION_KEY env var)
- Recommendation: Hide Plaid UI in production (NIS-only MVP uses manual accounts)
- Future: Research Israeli bank integration (Salt Edge, direct bank APIs)

### Anthropic Claude (Optional)
**Purpose:** AI-powered transaction categorization
**Library:** @anthropic-ai/sdk (0.32.1)
**Implementation:**
- Optional feature (gracefully degrades if ANTHROPIC_API_KEY missing)
- Suggests categories for transactions
- Not required for MVP (manual categorization fallback)

## Development Tools

### Testing
- **Framework:** Vitest 3.2.4 (fast, Vite-powered test runner)
- **Coverage target:** Not specified (57 existing test files provide good baseline)
- **Strategy:** Unit tests for utilities, integration tests for routers, manual QA for UI
- **Mocking:** vitest-mock-extended (3.1.0) for Prisma mocks

### Code Quality
- **Linter:** ESLint with Next.js recommended rules
- **Formatter:** Prettier (assumed, not explicitly configured)
- **Type Checking:** TypeScript 5.7.2 strict mode

### Build & Deploy
- **Build tool:** Next.js built-in (Turbopack in dev, Webpack in production)
- **Deployment target:** Vercel (serverless functions + edge network)
- **CI/CD:** Automatic via Vercel + GitHub integration (no separate CI needed)

## Environment Variables
All required env vars (7 total):

- `DATABASE_URL`: Pooled Supabase connection string
  - Purpose: Runtime database queries via Prisma
  - Source: Supabase Dashboard → Settings → API → Connection string (Transaction pooler)
  - Format: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

- `DIRECT_URL`: Direct Supabase connection string
  - Purpose: Database migrations (bypasses pooler)
  - Source: Supabase Dashboard → Settings → API → Connection string (Direct connection)
  - Format: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
  - Purpose: Client-side Supabase initialization
  - Source: Supabase Dashboard → Settings → API → Project URL
  - Value: `https://npylfibbutxioxjtcbvy.supabase.co`
  - Security: PUBLIC (safe to expose in client-side code)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
  - Purpose: Client-side Supabase authentication
  - Source: Supabase Dashboard → Settings → API → Project API keys → anon public
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT format)
  - Security: PUBLIC (rate-limited, RLS-protected)

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
  - Purpose: Server-side admin operations (bypass RLS)
  - Source: Supabase Dashboard → Settings → API → Project API keys → service_role
  - Security: CRITICAL - Server-only, never expose to client
  - Vercel: Mark as "Server-only" environment variable

- `CRON_SECRET`: Bearer token for cron job authentication
  - Purpose: Protect /api/cron/generate-recurring endpoint
  - Generate: `openssl rand -hex 32`
  - Security: HIGH - Vercel sends as Authorization header
  - Vercel: Mark as "Server-only" environment variable

- `ENCRYPTION_KEY`: AES-256 encryption key for Plaid tokens
  - Purpose: Encrypt Plaid access tokens in database
  - Generate: `openssl rand -hex 32`
  - Security: HIGH - Required even if Plaid not used (code references it)
  - Vercel: Mark as "Server-only" environment variable

**Optional (not required for MVP):**
- `ANTHROPIC_API_KEY`: Claude API key for transaction categorization
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`: Plaid integration (US-only)
- `RESEND_API_KEY`: Alternative to Supabase email

## Dependencies Overview
Key packages with versions:

**Core Framework:**
- `next`: 14.2.33 - React framework with SSR
- `react`: 18.3.1 - UI library
- `typescript`: 5.7.2 - Type safety

**Database & API:**
- `@prisma/client`: 5.22.0 - Database ORM
- `prisma`: 5.22.0 - Database toolkit
- `@trpc/server`: 11.6.0 - API layer (server)
- `@trpc/client`: 11.6.0 - API layer (client)
- `@tanstack/react-query`: 5.80.3 - Data fetching/caching
- `superjson`: 2.2.1 - Serialization for tRPC

**Authentication:**
- `@supabase/supabase-js`: 2.58.0 - Supabase client
- `@supabase/ssr`: 0.5.2 - Server-side rendering support

**UI Components:**
- `@radix-ui/react-*`: Various versions - Accessible primitives
- `framer-motion`: 12.23.22 - Animations
- `lucide-react`: 0.460.0 - Icons
- `recharts`: 2.12.7 - Charts for analytics

**Forms & Validation:**
- `react-hook-form`: 7.53.2 - Form state management
- `zod`: 3.23.8 - Schema validation
- `@hookform/resolvers`: 3.9.1 - Zod + react-hook-form integration

**Utilities:**
- `date-fns`: 3.6.0 - Date manipulation
- `tailwindcss`: 3.4.1 - CSS framework

**Testing:**
- `vitest`: 3.2.4 - Test runner
- `vitest-mock-extended`: 3.1.0 - Mocking utilities

## Performance Targets
- First Contentful Paint: < 1.5s (current: ~1.2s locally)
- Bundle size: < 200KB first load (current: 133KB for homepage)
- API response time: < 300ms (tRPC with React Query caching)
- Database queries: < 100ms (connection pooling via PgBouncer)

## Security Considerations
- **Environment variables:** Never commit .env.local to git (already in .gitignore)
- **Connection pooling:** Use transaction mode (prevents connection exhaustion)
- **Service role key:** Server-only, mark as "Encrypt" in Vercel dashboard
- **Cron authentication:** Bearer token validation on all cron endpoints
- **RLS policies:** Enforce user-level data isolation (users can only see their own data)
- **HTTPS:** Automatic via Vercel (free SSL certificates)
- **Secrets rotation:** Rotate CRON_SECRET and ENCRYPTION_KEY quarterly
- **Session security:** HTTP-only cookies for Supabase JWTs
