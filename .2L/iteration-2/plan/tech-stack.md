# Technology Stack - Iteration 2

## Core Infrastructure Changes

### Supabase CLI

**Decision:** Supabase CLI 1.200.3+ (latest stable)

**Installation Method:** npm devDependency (project-local)

```bash
npm install supabase@^1.200.3 --save-dev
```

**Rationale:**
- Project-local installation ensures version consistency across team
- Eliminates "works on my machine" issues from global installations
- Version locked in package.json prevents drift
- Cross-platform support via Docker (Windows, macOS, Linux)

**Alternatives Considered:**
- Global installation via Homebrew/npm: Causes version drift across team members
- Direct Docker commands: Too complex, Supabase CLI abstracts complexity
- Supabase Cloud only: Skips local development setup, adds cost too early

**Usage:**
```bash
# Always use npx to run project-local CLI
npx supabase init      # Initialize project
npx supabase start     # Start local services
npx supabase status    # Check service health
npx supabase stop      # Stop services
npx supabase db reset  # Reset database
```

**Prerequisites:**
- Docker Desktop 20.10+ (required dependency)
- 2GB+ available RAM (for Docker containers)
- 10GB+ disk space (for Docker images on first run)

**Docker Requirement:**
Supabase CLI uses Docker Compose to run local services. Developers must have Docker Desktop installed and running.

**Docker Installation:**
- macOS: https://docs.docker.com/desktop/mac/install/
- Windows: https://docs.docker.com/desktop/windows/install/ (requires WSL2)
- Linux: https://docs.docker.com/engine/install/

## Database Configuration

### PostgreSQL Version

**Decision:** PostgreSQL 15.x (Supabase default)

**Rationale:**
- Prisma 5.22.0 fully compatible with PostgreSQL 15
- Supabase uses PostgreSQL 15 in production (parity)
- Latest stable with good performance
- All required features supported (Decimal, arrays, full-text search)

**Configuration in supabase/config.toml:**
```toml
[db]
port = 5432              # Direct connection port
major_version = 15       # PostgreSQL version
```

### Connection Pooling Strategy

**Decision:** pgBouncer (Supabase built-in) with transaction mode

**Why Two Connection URLs:**
- `DATABASE_URL` (pooled): Used for all application queries via pgBouncer on port 54322
- `DIRECT_URL` (direct): Used for migrations and admin operations on port 5432

**Connection String Format:**

```bash
# Pooled connection (for application)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**pgBouncer Configuration:**
- Pool mode: Transaction (allows prepared statements from Prisma)
- Default pool size: 20 connections
- Max client connections: 100

**Prisma Schema Configuration:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // Pooled connection
  directUrl = env("DIRECT_URL")       // Direct connection for migrations
}
```

**Rationale:**
- Transaction mode pooling prevents connection exhaustion
- Prisma migrations require session-level operations (need direct connection)
- pgBouncer reduces connection overhead in development
- Same pattern used in production for scalability

### Supabase Services Configuration

**File:** `supabase/config.toml` (auto-generated, then customized)

**Services ENABLED:**

```toml
[db]
enabled = true
port = 5432
major_version = 15
# Core PostgreSQL database - required

[studio]
enabled = true
port = 54323
# Web GUI for database management - enhanced DX

[pooler]
enabled = true
port = 54322
pool_mode = "transaction"
default_pool_size = 20
max_client_connections = 100
# pgBouncer connection pooling - performance
```

**Services DISABLED:**

```toml
[auth]
enabled = false
# Using NextAuth instead of Supabase Auth

[storage]
enabled = false
# No file storage in MVP

[realtime]
enabled = false
# No real-time features in MVP

[functions]
enabled = false
# Using Next.js API routes and tRPC instead

[analytics]
enabled = false
# Not needed for local development
```

**Rationale for Disabling Services:**
- Reduces Docker resource usage (~500MB → ~300MB RAM)
- Faster startup time (~60s → ~30s)
- Fewer ports to manage (7 services → 3 services)
- Simpler local stack, less confusion
- Can enable later if needed (just edit config.toml)

## Environment Variables

### Complete .env.local Configuration

**New Variables Added (Supabase):**

```bash
# Supabase Local Development
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<get from: npx supabase status after first start>"
SUPABASE_SERVICE_ROLE_KEY="<get from: npx supabase status after first start>"
```

**Purpose of Supabase Keys:**
- `SUPABASE_URL`: PostgREST API endpoint (not used currently, but future-ready)
- `SUPABASE_ANON_KEY`: Public API key (for Supabase Studio access)
- `SUPABASE_SERVICE_ROLE_KEY`: Admin API key (bypasses RLS if implemented)

**Note:** These keys are only needed for Supabase-specific features (Auth, Storage, PostgREST). Since we're only using PostgreSQL database, they're optional but included for future extensibility.

**Updated Database Variables:**

```bash
# Database URLs (Supabase Pooler)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Changes from Iteration 1:**
- `DATABASE_URL`: Now points to Supabase pooler (port 54322) instead of direct PostgreSQL
- `DIRECT_URL`: Now points to Supabase PostgreSQL (port 5432) instead of same as DATABASE_URL
- Added `?pgbouncer=true` parameter for Prisma optimization

**Existing Variables (Unchanged):**

```bash
# NextAuth (REQUIRED)
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Optional - graceful degradation)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Plaid (Optional - graceful degradation)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"

# Encryption (REQUIRED for Plaid if used)
ENCRYPTION_KEY="<generate with: openssl rand -hex 32>"

# Anthropic (Optional - for AI categorization)
ANTHROPIC_API_KEY="sk-ant-..."

# Resend (Optional - for email sending)
RESEND_API_KEY="re_..."
```

### Secret Generation Commands

**NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Output: 32-character base64 string
Example: `Kx8F3jP9mQ7vN2wR5tY8zL1dS4gH6kJ0`

**ENCRYPTION_KEY:**
```bash
openssl rand -hex 32
```
Output: 64-character hex string
Example: `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2`

**Supabase Keys (Retrieved After First Start):**
```bash
npx supabase start
# Wait for services to start
npx supabase status

# Output includes:
# API URL: http://localhost:54321
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Environment Validation

**Recommended Approach:** Create environment validation middleware

**Implementation Pattern:**

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Database (CRITICAL)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // NextAuth (CRITICAL)
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Supabase (OPTIONAL - only for Supabase-specific features)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Plaid (OPTIONAL - graceful degradation)
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).optional(),
  ENCRYPTION_KEY: z.string().length(64).optional(),

  // Anthropic (OPTIONAL)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Resend (OPTIONAL)
  RESEND_API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

**Usage:**
```typescript
// Import validated env instead of process.env
import { env } from '@/lib/env'

// TypeScript knows these exist and are validated
const databaseUrl = env.DATABASE_URL
```

**Benefits:**
- Type-safe environment variables
- Fails fast on missing required variables
- Clear error messages for misconfiguration
- Prevents runtime errors from invalid values

## Development Tools

### npm Scripts

**New Scripts Added:**

```json
{
  "scripts": {
    // Supabase lifecycle
    "db:local": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset && npm run db:seed",
    "db:studio:supabase": "supabase start && open http://localhost:54323",

    // Combined setup (new developer onboarding)
    "dev:setup": "supabase start && npm run db:push && npm run db:seed && npm run dev",

    // Existing scripts (unchanged)
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**Script Purposes:**

- `db:local`: Start Supabase local development stack (replaces manual PostgreSQL startup)
- `db:stop`: Stop Supabase (preserves data, can restart later)
- `db:reset`: Nuclear option - wipe database, reapply schema, reseed data
- `db:studio:supabase`: Open Supabase Studio in browser (alternative to Prisma Studio)
- `dev:setup`: One-command setup for new developers (idempotent, can run multiple times)

**Developer Workflows:**

**First-time setup:**
```bash
npm install                  # Install dependencies
cp .env.example .env.local   # Copy environment template
# Edit .env.local with real values
npm run dev:setup            # Start everything
```

**Daily development:**
```bash
npm run db:local   # Start Supabase (if not already running)
npm run dev        # Start Next.js dev server
```

**Database changes:**
```bash
# Edit prisma/schema.prisma
npm run db:push    # Push changes to Supabase
npm run dev        # Restart app to pick up changes
```

**Clean slate:**
```bash
npm run db:reset   # Wipe database, reapply schema, reseed
```

### Database Management Tools

**Supabase Studio (NEW - Primary Tool)**

**Access:** http://localhost:54323 (after `npm run db:local`)

**Features:**
- Visual schema editor with ERD diagram
- SQL query editor with autocomplete
- Table data browser with filtering
- Performance insights and query profiling
- Migration history viewer
- Database settings and configuration

**When to Use:**
- Writing custom SQL queries
- Visualizing database relationships
- Performance debugging
- Bulk data operations

**Prisma Studio (Existing - Secondary Tool)**

**Access:** `npm run db:studio` (opens http://localhost:5555)

**Features:**
- Simple table data browser
- CRUD operations on records
- Relationship navigation
- Filtering and sorting

**When to Use:**
- Quick data inspection
- Simple record editing
- Testing Prisma queries
- Familiar interface for Prisma users

**Recommendation:** Use Supabase Studio for power-user features (SQL, performance), Prisma Studio for quick data browsing.

## Existing Stack (No Changes)

### Framework & Runtime

**Next.js:** 14.2.33 (App Router)
- No changes required
- Supabase integration is database-only (no Next.js changes)

**React:** 18.3.1
- No changes required

**TypeScript:** 5.7.2
- No changes required

**Node.js:** 18.x or 20.x (recommended)
- No changes required

### ORM & Database Client

**Prisma:** 5.22.0
- No version change required
- 100% compatible with Supabase PostgreSQL
- Schema remains identical
- Only DATABASE_URL changes (points to Supabase)

**Why Keep Prisma?**
- Already integrated and working
- Type-safe database access
- Excellent migration tooling
- Team familiarity
- No need to switch to Supabase client libraries

### API Layer

**tRPC:** 11.6.0
- No changes required
- Works identically with Supabase backend
- Context still provides `prisma` instance
- Superjson transformer unchanged

**React Query:** 5.60.5
- No changes required
- tRPC integration unchanged

### Authentication

**NextAuth:** 5.0.0-beta.25
- No changes required
- Keep using NextAuth instead of Supabase Auth
- Prisma adapter works with Supabase database
- No migration needed

**Why Not Supabase Auth?**
- NextAuth already implemented and working
- Migration would add complexity
- NextAuth supports more providers
- Supabase Auth can be added later if desired

### UI Framework

**shadcn/ui + Radix UI**
- No changes required
- All components work identically

**Tailwind CSS:** 3.4.1
- No changes required

**Lucide Icons:** 0.460.0
- No changes required

### External Integrations

**Plaid:** 28.0.0
- No changes required
- Works with Supabase backend via Prisma

**Anthropic SDK:** 0.32.1
- No changes required

**bcryptjs:** 2.4.3
- No changes required for password hashing

### Testing

**Vitest:** 3.2.4
- No changes required
- All existing tests should pass
- Database tests use same Prisma client (just different URL)

## Performance Targets

### Development Environment

**Startup Time:**
- Supabase first start: ~60 seconds (downloads Docker images)
- Supabase subsequent starts: ~20-30 seconds
- Next.js dev server: ~5-10 seconds
- Total: ~30-40 seconds (after first run)

**Memory Usage:**
- Supabase services: ~300MB RAM (with disabled services)
- Next.js dev server: ~150MB RAM
- Chrome browser: ~200MB RAM
- Total: ~650MB RAM (reasonable for development)

**Disk Space:**
- Supabase Docker images: ~2GB (first download)
- node_modules: ~500MB
- .next build cache: ~100MB
- Database storage: ~50MB (small dataset)
- Total: ~3GB

### API Response Time

**Target Metrics (Local Development):**
- tRPC procedure calls: < 100ms (database local)
- Prisma queries: < 50ms (simple queries)
- Complex aggregations: < 200ms
- Dashboard load: < 500ms (all data fetched)

**Note:** Production metrics will differ (network latency, hosted database)

## Security Considerations

### Local Development Security

**Database Credentials:**
- Default Supabase credentials: `postgres:postgres`
- Local only, not exposed to network
- Safe for development (not production)

**Encryption Keys:**
- NEXTAUTH_SECRET: Generated per developer, not shared
- ENCRYPTION_KEY: Required for Plaid token encryption
- Never commit to git (enforced by .gitignore)

**Supabase Keys:**
- ANON_KEY: Public key, safe to expose in frontend (not needed for MVP)
- SERVICE_ROLE_KEY: Admin key, keep server-side only (not needed for MVP)

### Environment Variable Security

**.gitignore Rules (Verify These Exist):**
```gitignore
.env.local
.env*.local
.env.development.local
.env.test.local
.env.production.local
```

**Never Commit:**
- Real API keys (Plaid, Anthropic, Resend)
- Encryption keys
- NextAuth secrets
- Database credentials (even local)

**Safe to Commit:**
- .env.example (template with placeholders)
- supabase/config.toml (local development config)

## Database Schema Strategy

### No Schema Changes Required

**Current Schema:** 10 models, 100% compatible with Supabase PostgreSQL

**Models (Unchanged):**
1. User - Authentication and profile
2. OAuthAccount - OAuth providers (Google)
3. PasswordResetToken - Password reset flow
4. Category - Transaction categories (hierarchical)
5. Account - Financial accounts
6. Transaction - Financial transactions
7. Budget - Monthly budgets per category
8. BudgetAlert - Budget threshold notifications
9. MerchantCategoryCache - AI categorization cache
10. Goal - Financial goals

**Features Verified Compatible:**
- `@default(cuid())` - ✅ Works with Supabase
- `Decimal` type for currency - ✅ PostgreSQL native
- `@db.Text` for long strings - ✅ PostgreSQL specific
- Array types (`tags String[]`) - ✅ PostgreSQL native
- Full-text search (preview feature) - ✅ Requires setup (future)
- Composite indexes - ✅ Fully supported
- Cascade deletes - ✅ Supported

**Migration Strategy:**

```bash
# After Supabase setup, push schema
npm run db:push

# Verify in Supabase Studio
open http://localhost:54323
# Check that all 10 tables exist

# Or use Prisma Studio
npm run db:studio
# Check that all 10 tables visible
```

## Version Compatibility Matrix

| Dependency | Version | Compatible With | Notes |
|------------|---------|----------------|-------|
| Supabase CLI | 1.200.3+ | PostgreSQL 15 | Latest stable |
| PostgreSQL | 15.x | Prisma 5.22.0 | Supabase default |
| Prisma | 5.22.0 | PostgreSQL 15 | No change |
| Next.js | 14.2.33 | All | No change |
| tRPC | 11.6.0 | Next.js 14 | No change |
| NextAuth | 5.0.0-beta.25 | Next.js 14 | No change |
| Node.js | 18.x or 20.x | All | Recommended |
| Docker Desktop | 20.10+ | Supabase CLI | Required |

## Troubleshooting Common Issues

### Issue 1: Port 5432 Already in Use

**Symptom:**
```
Error: Port 5432 is already in use
```

**Cause:** Local PostgreSQL service running

**Solution:**
```bash
# macOS (Homebrew PostgreSQL)
brew services stop postgresql@15

# Linux
sudo systemctl stop postgresql

# Or customize Supabase port in supabase/config.toml
[db]
port = 5433  # Use different port
```

### Issue 2: Docker Not Running

**Symptom:**
```
Error: Cannot connect to the Docker daemon
```

**Cause:** Docker Desktop not started

**Solution:**
- macOS: Open Docker Desktop app from Applications
- Windows: Open Docker Desktop app from Start menu
- Linux: `sudo systemctl start docker`

**Verify:**
```bash
docker ps
# Should show running containers
```

### Issue 3: Supabase Start Hangs

**Symptom:**
```
Supabase services starting... (hangs forever)
```

**Causes:**
- Insufficient RAM (< 2GB available)
- Network issues (downloading Docker images)
- Port conflicts

**Solution:**
```bash
# Stop all containers
docker compose down

# Clean up
npx supabase stop --no-backup

# Try again
npx supabase start
```

### Issue 4: DATABASE_URL Connection Error

**Symptom:**
```
PrismaClientInitializationError: Can't reach database server
```

**Cause:** Wrong DATABASE_URL format or Supabase not running

**Solution:**
```bash
# Verify Supabase is running
npx supabase status
# Should show "Status: RUNNING"

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true

# Test connection
npx prisma db push
# Should succeed
```

## Future Enhancements (Out of Scope for Iteration 2)

### Production Deployment

**Supabase Cloud:**
- Hosted PostgreSQL database
- Connection pooling via Supavisor
- Automatic backups and point-in-time recovery
- Built-in monitoring and alerting

**Environment Variables (Production):**
```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
```

### Optional Supabase Features

**Storage (Future):**
- File uploads (receipts, documents)
- Image optimization
- CDN delivery

**Realtime (Future):**
- Live transaction updates
- Multi-user collaboration
- Real-time notifications

**Auth (Future):**
- Migrate from NextAuth to Supabase Auth
- Built-in OAuth providers
- Row Level Security (RLS)

**Edge Functions (Future):**
- Serverless background jobs
- Scheduled tasks (recurring transactions)
- Webhooks processing

## Summary

**Key Changes in Iteration 2:**
1. Added Supabase CLI as devDependency
2. Changed DATABASE_URL to point to Supabase pooler
3. Added DIRECT_URL for migrations
4. Added Supabase environment variables (future-ready)
5. Added npm scripts for Supabase lifecycle
6. Disabled unused Supabase services for performance

**No Changes Required:**
- Prisma version or schema
- Next.js, React, TypeScript versions
- tRPC, NextAuth, or UI framework
- External integrations (Plaid, Anthropic)
- Application code (100% database abstraction via Prisma)

**Total New Dependencies:** 1 (Supabase CLI)

**Total Configuration Files:** 1 (supabase/config.toml - auto-generated)

**Estimated Setup Time:** 30-45 minutes (first time), 5 minutes (subsequent)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-01
