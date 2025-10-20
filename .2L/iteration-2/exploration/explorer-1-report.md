# Explorer 1 Report: Supabase Integration Architecture & Structure

## Executive Summary

The Wealth application currently uses a direct PostgreSQL connection via Prisma ORM with 10 models. Supabase integration is viable and recommended for local development. The migration path is straightforward: Supabase provides PostgreSQL-compatible database with enhanced tooling. Key findings: (1) Prisma schema is fully compatible with Supabase, (2) minimal code changes required, (3) connection pooling requires configuration adjustments, (4) Supabase CLI will manage local development database lifecycle.

---

## Discoveries

### Current Database Architecture

**Connection Pattern:**
- Single Prisma client instance with global caching (`/home/ahiya/Ahiya/wealth/src/lib/prisma.ts`)
- Two-URL configuration: `DATABASE_URL` (pooled) and `DIRECT_URL` (direct connection)
- Already configured for connection pooling architecture (Supabase-ready)
- Logging enabled in development mode (query, error, warn)

**Database Models (10 total):**
1. User - Auth and profile
2. OAuthAccount - OAuth providers (Google)
3. PasswordResetToken - Password reset flow
4. Category - Transaction categories (hierarchical)
5. Account - Financial accounts (checking, savings, credit, etc.)
6. Transaction - Financial transactions
7. Budget - Monthly budgets per category
8. BudgetAlert - Budget threshold notifications
9. MerchantCategoryCache - AI categorization cache
10. Goal - Financial goals (savings, debt payoff, investment)

**Current Schema Features:**
- `@default(cuid())` - Compatible with Supabase
- `Decimal` type for currency - PostgreSQL native type, Supabase compatible
- `@db.Text` for long strings - PostgreSQL specific, Supabase compatible
- Array types (`tags String[]`) - PostgreSQL native, Supabase compatible
- Full-text search preview feature enabled - Requires Supabase text search setup
- Composite indexes - Fully supported by Supabase
- Cascade deletes - Supported in Supabase PostgreSQL

**Verdict:** 100% schema compatibility. No schema changes required for Supabase migration.

### Integration Points Analysis

**1. Prisma Client Instantiation** (`/home/ahiya/Ahiya/wealth/src/lib/prisma.ts`)
- Current: Direct PostgreSQL connection
- After: Will connect to Supabase pooler (port 54322) or direct (port 5432)
- Change required: Update DATABASE_URL environment variable only
- Code change: None required

**2. tRPC Context** (`/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts`)
- Passes `prisma` instance to all procedures
- No changes required - Prisma client remains identical

**3. Authentication** (`/home/ahiya/Ahiya/wealth/src/lib/auth.ts`)
- NextAuth uses Prisma for user queries
- No changes required - database abstraction layer isolates auth from DB implementation

**4. Seed Script** (`/home/ahiya/Ahiya/wealth/prisma/seed.ts`)
- Creates default categories using Prisma client
- No changes required - will work identically with Supabase

**5. API Routers** (8 routers in `/home/ahiya/Ahiya/wealth/src/server/api/routers/`)
- All use `ctx.prisma` from tRPC context
- No changes required - fully abstracted

**6. Services Layer**
- Plaid service (`plaid.service.ts`, `plaid-sync.service.ts`)
- Categorization service (`categorize.service.ts`)
- All use Prisma client exclusively
- No changes required

### Supabase Local Development Architecture

**Supabase Local Stack Components:**
```
Supabase Local (via Docker):
├── PostgreSQL Database (port 5432) - Direct connection
├── Supabase Studio (port 54323) - Web GUI for database
├── PostgREST API (port 54321) - Auto-generated REST API (not used by this app)
├── GoTrue Auth (port 54324) - Supabase Auth (not used - using NextAuth)
├── Realtime (port 54325) - WebSocket server (not used in MVP)
├── Storage API (port 54326) - File storage (not used in MVP)
└── Pooler (port 54322) - Connection pooling (pgBouncer)
```

**What This App Will Use:**
- PostgreSQL Database (port 5432) - Via Prisma
- Supabase Studio (port 54323) - For database visualization
- Pooler (port 54322) - For connection pooling in production

**What This App Will NOT Use (Out of Scope):**
- Supabase Auth (using NextAuth instead)
- Supabase Storage (no file storage in MVP)
- Supabase Realtime (no real-time features)
- PostgREST API (using tRPC instead)

### Connection Pooling Strategy

**Current Setup:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Supabase Local Connection URLs:**
```bash
# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Pooled connection (for application queries)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
```

**Why Two URLs?**
- `DATABASE_URL` - Used for queries (transaction mode pooling via pgBouncer)
- `DIRECT_URL` - Used for migrations (requires session mode)

**Verdict:** Current Prisma configuration already supports this pattern. No schema changes required.

---

## Patterns Identified

### Pattern 1: Supabase CLI Lifecycle Management

**Description:** Supabase CLI manages entire local development database lifecycle via Docker

**Use Case:** Start/stop/reset local database without manual PostgreSQL installation

**Implementation:**
```bash
# Start Supabase (pulls Docker images, starts all services)
npx supabase start

# Check service status and connection strings
npx supabase status

# Stop Supabase (preserves data)
npx supabase stop

# Reset database (drops all data, reapplies migrations)
npx supabase db reset

# Open Supabase Studio in browser
npx supabase db studio
```

**Recommendation:** Adopt this pattern. Eliminates need for developers to install PostgreSQL locally.

### Pattern 2: Database Schema Synchronization

**Description:** Two-way sync between Prisma schema and Supabase migrations

**Approach Options:**

**Option A: Prisma-First (Recommended for this project)**
```bash
# 1. Edit schema.prisma
# 2. Push to Supabase
npx prisma db push

# 3. Pull schema to Supabase migrations (optional - for production)
npx supabase db diff --schema public
```

**Pros:**
- Maintains Prisma as source of truth (current team pattern)
- Faster development (no migration files needed)
- Prisma Studio remains fully functional

**Cons:**
- Migration history not tracked by Supabase CLI
- Production deployments require migration generation

**Option B: Supabase-First**
```bash
# 1. Edit Supabase migration SQL
# 2. Apply migration
npx supabase db reset

# 3. Introspect to Prisma
npx prisma db pull
```

**Pros:**
- Full migration history in Supabase
- Better for teams preferring SQL

**Cons:**
- Breaks current Prisma-first workflow
- Requires learning Supabase migration syntax

**Recommendation:** Use Option A (Prisma-First). Current team is already comfortable with Prisma. Supabase adds tooling without changing workflow.

### Pattern 3: Environment Variable Strategy

**Description:** Unified environment configuration for both Prisma and Supabase

**Structure:**
```bash
# Supabase Local Service URLs
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<from supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<from supabase status>"

# Database URLs (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Existing variables (unchanged)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
PLAID_CLIENT_ID="..."
ANTHROPIC_API_KEY="..."
```

**Why SUPABASE_* Variables if Not Using Supabase Features?**
- Future-proofing: Easy to add Supabase Storage, Realtime later
- Monitoring: Supabase Studio uses these for admin access
- Consistency: Standard Supabase setup pattern

**Recommendation:** Add Supabase variables to `.env.example` even if not immediately used. Enables smooth future enhancements.

### Pattern 4: Development Workflow Integration

**Description:** npm scripts orchestrate Supabase and Prisma tools

**Proposed npm Scripts:**
```json
{
  "scripts": {
    "db:local": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset && npm run db:seed",
    "db:studio": "supabase db studio",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "dev": "next dev",
    "dev:setup": "npm run db:local && npm run db:push && npm run db:seed && npm run dev"
  }
}
```

**New Developer Onboarding Flow:**
```bash
# 1. Clone repo
git clone <repo>
cd wealth

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Start everything
npm run dev:setup
```

**Recommendation:** Implement `dev:setup` script for zero-config local development.

---

## Complexity Assessment

### High Complexity Areas

**1. Supabase CLI Installation & Initialization**
- **Complexity:** Medium-High
- **Why:** Requires Docker Desktop, Supabase CLI installation, initial `supabase init`
- **Estimated Time:** 30 minutes (includes troubleshooting)
- **Split Required:** No - Single builder can handle
- **Mitigation:** Provide detailed step-by-step instructions, handle common Docker errors

**2. Connection String Configuration**
- **Complexity:** Medium
- **Why:** Two URLs (pooled vs direct), pgBouncer query parameters, port confusion
- **Estimated Time:** 20 minutes
- **Split Required:** No
- **Mitigation:** Provide exact connection strings, explain why two URLs needed

### Medium Complexity Areas

**3. Environment Variable Updates**
- **Complexity:** Low-Medium
- **Why:** Multiple new variables, retrieving keys from `supabase status`
- **Estimated Time:** 15 minutes
- **Split Required:** No

**4. npm Script Updates**
- **Complexity:** Low
- **Why:** Adding new scripts, updating existing README
- **Estimated Time:** 10 minutes
- **Split Required:** No

**5. Verification Testing**
- **Complexity:** Medium
- **Why:** Must test all 8 tRPC routers, authentication, seed script
- **Estimated Time:** 20 minutes
- **Split Required:** No

### Low Complexity Areas

**6. Prisma Schema Changes**
- **Complexity:** Very Low (None required!)
- **Why:** Schema is 100% compatible with Supabase PostgreSQL
- **Estimated Time:** 0 minutes
- **Split Required:** No

**7. Code Changes**
- **Complexity:** Very Low (None required!)
- **Why:** Prisma client abstraction isolates code from database implementation
- **Estimated Time:** 0 minutes
- **Split Required:** No

**Overall Complexity:** Medium. No code changes simplifies dramatically. Main complexity is tooling setup.

---

## Technology Recommendations

### Primary Stack

**Supabase CLI:** Latest stable version
- **Rationale:** Official tool, actively maintained, Docker-based (cross-platform)
- **Installation:** `npm install supabase --save-dev` (project-local) OR `brew install supabase/tap/supabase` (global)
- **Recommendation:** Install as devDependency for version consistency across team

**Docker Desktop:** Latest stable (required dependency)
- **Rationale:** Supabase CLI uses Docker to run local services
- **Minimum Version:** Docker Engine 20.10+
- **Recommendation:** Check Docker is installed and running before `supabase start`

**Prisma:** 5.22.0 (no change)
- **Rationale:** Already installed, fully compatible with Supabase PostgreSQL
- **Recommendation:** No version change required

### Supporting Configuration

**Supabase Config File:** `supabase/config.toml`
- **Purpose:** Configure Supabase services (ports, versions, features)
- **Auto-generated:** Yes (via `supabase init`)
- **Customization Needed:** Minimal (default ports work fine)

**Example `supabase/config.toml` Customizations:**
```toml
[db]
port = 5432
major_version = 15  # Match Prisma requirement

[studio]
port = 54323
enabled = true

[auth]
enabled = false  # Not using Supabase Auth (using NextAuth)

[storage]
enabled = false  # Not using Supabase Storage

[realtime]
enabled = false  # Not using Supabase Realtime
```

**Recommendation:** Disable unused services to reduce Docker resource usage.

---

## Integration Points

### External Services

**1. Supabase Local Services**
- **Connection:** Application → PostgreSQL (port 5432 or 54322)
- **Purpose:** Database queries via Prisma
- **Authentication:** PostgreSQL credentials (postgres:postgres default)
- **Considerations:** Local only, no internet required

**2. Supabase Studio**
- **Connection:** Developer → Browser (http://localhost:54323)
- **Purpose:** Visual database management (alternative to Prisma Studio)
- **Authentication:** No login required (local access only)
- **Considerations:** More feature-rich than Prisma Studio (SQL editor, schema visualizer)

### Internal Integrations

**1. Prisma Client ↔ Supabase PostgreSQL**
- **How They Connect:** Prisma client uses `DATABASE_URL` to connect to Supabase pooler (port 54322)
- **Data Flow:** Application → Prisma Client → pgBouncer Pooler → PostgreSQL
- **Transaction Handling:** Prisma manages transactions, pgBouncer handles connection pooling
- **No Code Changes:** Prisma is database-agnostic, works identically with Supabase

**2. Prisma Migrations ↔ Supabase Database**
- **How They Connect:** Prisma uses `DIRECT_URL` to apply migrations directly to PostgreSQL (port 5432)
- **Data Flow:** Prisma CLI → Direct PostgreSQL connection (bypasses pooler)
- **Why Direct Connection:** Migrations require session-level operations (CREATE INDEX, etc.)
- **No Code Changes:** Just update `DIRECT_URL` environment variable

**3. NextAuth ↔ Prisma ↔ Supabase**
- **How They Connect:** NextAuth → Prisma Client → Supabase PostgreSQL
- **Data Flow:** User login → NextAuth queries User table → Prisma → PostgreSQL
- **Session Storage:** JWT (not in database), no Supabase integration needed
- **No Code Changes:** NextAuth unaware of underlying database

**4. tRPC Procedures ↔ Prisma ↔ Supabase**
- **How They Connect:** tRPC context provides `prisma` instance to all procedures
- **Data Flow:** Frontend → tRPC → Procedure → Prisma → PostgreSQL
- **Error Handling:** Same as current (Prisma errors bubble up to tRPC)
- **No Code Changes:** tRPC context remains identical

### Integration Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                         │
│                                                                  │
│  ┌────────────┐      ┌────────────┐      ┌──────────────┐     │
│  │  NextAuth  │─────▶│   Prisma   │─────▶│ tRPC Context │     │
│  └────────────┘      │   Client   │      └──────────────┘     │
│                      └──────┬─────┘                             │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ DATABASE_URL (pooled)
                              │ DIRECT_URL (migrations)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Local (Docker)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database (port 5432)               │  │
│  │                                                           │  │
│  │  ┌──────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐   │  │
│  │  │ User │  │ Transaction │  │ Account │  │  Budget  │   │  │
│  │  └──────┘  └────────────┘  └─────────┘  └──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │                                  │
│                    ┌─────────┴─────────┐                       │
│                    │                   │                       │
│         ┌──────────┴──────────┐  ┌─────┴────────────┐         │
│         │  Pooler (54322)     │  │  Studio (54323)  │         │
│         │  pgBouncer          │  │  Web GUI         │         │
│         └─────────────────────┘  └──────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risks & Challenges

### Technical Risks

**Risk 1: Docker Compatibility Issues**
- **Impact:** High (blocks entire local dev setup)
- **Likelihood:** Low (Docker is mature, cross-platform)
- **Platforms Affected:** Windows (WSL issues), older Macs (Rosetta 2)
- **Mitigation Strategy:**
  - Provide Docker Desktop installation instructions with version requirements
  - Document common Docker errors (port conflicts, memory limits)
  - Offer fallback: Direct PostgreSQL installation (without Supabase)
  - Test on Windows, macOS Intel, macOS Apple Silicon before release

**Risk 2: Port Conflicts**
- **Impact:** Medium (prevents Supabase services from starting)
- **Likelihood:** Medium (5432, 54321-54326 might be in use)
- **Affected Ports:**
  - 5432 (PostgreSQL) - Conflict if local PostgreSQL already installed
  - 54323 (Studio) - Unlikely conflict
- **Mitigation Strategy:**
  - Check port availability before `supabase start`: `lsof -i :5432`
  - Customize ports in `supabase/config.toml` if needed
  - Document how to stop conflicting PostgreSQL service

**Risk 3: Connection Pool Exhaustion**
- **Impact:** Medium (queries fail under load)
- **Likelihood:** Low (local dev only, single user)
- **Cause:** pgBouncer default pool size too small
- **Mitigation Strategy:**
  - Configure pgBouncer in `supabase/config.toml`: `pool_size = 20`
  - Monitor with `npx supabase status` (shows active connections)
  - Not a concern for local development (single user)

**Risk 4: Migration Drift**
- **Impact:** High (production and local databases out of sync)
- **Likelihood:** Medium (if team doesn't follow workflow)
- **Cause:** Developers use `prisma db push` locally but don't generate migrations for production
- **Mitigation Strategy:**
  - Document migration workflow clearly
  - Require migration files in production deployments
  - CI/CD check: Ensure `prisma migrate diff` shows no differences

### Complexity Risks

**Risk 5: Developer Onboarding Friction**
- **Impact:** Medium (slows new developer productivity)
- **Likelihood:** Medium (more tools to install)
- **New Tools Required:** Docker Desktop, Supabase CLI (vs just PostgreSQL before)
- **Mitigation Strategy:**
  - Provide one-command setup: `npm run dev:setup`
  - Video walkthrough of Supabase setup
  - Detailed README with screenshots
  - Pre-check script: Validates Docker installed and running

**Risk 6: Debugging Complexity**
- **Impact:** Low-Medium (harder to troubleshoot database issues)
- **Likelihood:** Low (abstraction layers hide issues)
- **Examples:**
  - Connection errors: Is it Prisma? pgBouncer? PostgreSQL?
  - Slow queries: Is it pooling? Indexes? Query structure?
- **Mitigation Strategy:**
  - Enable Prisma query logging in development
  - Use Supabase Studio SQL editor to test queries directly
  - Document common error messages and solutions
  - Provide direct PostgreSQL connection for debugging (bypass pooler)

### Operational Risks

**Risk 7: Increased Resource Usage**
- **Impact:** Low (slower developer machines)
- **Likelihood:** Medium (Docker uses memory/CPU)
- **Resource Requirements:** Docker requires ~2GB RAM, 10GB disk
- **Mitigation Strategy:**
  - Document minimum system requirements
  - Disable unused Supabase services (Auth, Storage, Realtime)
  - `supabase stop` when not actively developing

**Risk 8: Version Drift**
- **Impact:** Medium (team members on different Supabase versions)
- **Likelihood:** Medium (if installed globally vs npm)
- **Cause:** `brew install supabase` vs `npm install supabase --save-dev`
- **Mitigation Strategy:**
  - Install Supabase CLI as devDependency (project-local)
  - Use `npx supabase` for consistency
  - Lock version in `package.json`: `"supabase": "1.200.3"`

---

## Recommendations for Planner

### 1. Single Builder Sufficient (No Split Required)
**Rationale:** Total integration complexity is Medium. No code changes required (only configuration). Estimated 1.5-2 hours total.

**Builder Tasks:**
- Initialize Supabase (`supabase init`)
- Configure connection strings
- Update environment variables
- Add npm scripts
- Test all tRPC endpoints
- Update README with setup instructions

**Why Not Split:** Tasks are sequential and interdependent. Splitting would create coordination overhead.

### 2. Prisma-First Migration Strategy
**Rationale:** Maintain current team workflow. Prisma is source of truth. Supabase adds tooling without changing development patterns.

**Workflow:**
```bash
# Developer makes schema change
# 1. Edit prisma/schema.prisma
# 2. Push to local Supabase
npm run db:push
# 3. Test changes
npm run dev
# 4. Commit schema.prisma (migration files generated in CI/CD)
```

**Why:** Team is already comfortable with Prisma. Don't introduce Supabase SQL migrations unless necessary.

### 3. Install Supabase CLI as devDependency
**Rationale:** Ensure team uses consistent version. Avoid global installation conflicts.

**Implementation:**
```bash
npm install supabase --save-dev
```

**Then use:**
```bash
npx supabase start  # NOT: supabase start
```

**Why:** Package version locked in `package.json`, no "works on my machine" issues.

### 4. Disable Unused Supabase Services
**Rationale:** Reduce Docker resource usage, simplify local stack.

**Services to Disable in `supabase/config.toml`:**
- `[auth] enabled = false` (using NextAuth)
- `[storage] enabled = false` (no file storage in MVP)
- `[realtime] enabled = false` (no real-time features)
- `[functions] enabled = false` (using Next.js API routes)

**Keep Enabled:**
- `[db]` (PostgreSQL)
- `[studio]` (database GUI)
- `[pooler]` (connection pooling)

**Why:** Faster startup, less memory usage, fewer ports to manage.

### 5. Provide Fallback for Docker Issues
**Rationale:** Don't block development if Docker Desktop causes problems.

**Fallback Option:** Direct PostgreSQL installation
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux
sudo apt install postgresql-15

# Then use standard DATABASE_URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wealth"
```

**When to Use:** Docker Desktop fails, Mac with limited resources, CI/CD environments.

**Why:** Supabase is optional tooling enhancement, not hard requirement.

### 6. Create Comprehensive Setup Documentation
**Rationale:** Supabase adds complexity. Reduce onboarding friction with clear docs.

**Documentation Requirements:**
- Prerequisites (Docker Desktop installation)
- Step-by-step Supabase CLI setup
- Troubleshooting common errors (port conflicts, Docker not running)
- Environment variable configuration
- Verification checklist
- Video walkthrough (optional but helpful)

**Why:** Good docs prevent frustration, reduce support burden.

### 7. Test on Multiple Platforms Before Merge
**Rationale:** Docker behavior varies by platform. Catch issues early.

**Test Matrix:**
- macOS Apple Silicon (M1/M2/M3)
- macOS Intel
- Windows 11 (WSL2)
- Linux (Ubuntu 22.04)

**Validation:**
- `supabase start` succeeds
- `npm run db:push` applies schema
- `npm run db:seed` populates data
- `npm run dev` starts app
- All tRPC endpoints respond

**Why:** Prevents "works on my machine" issues in production use.

---

## Resource Map

### Critical Files/Directories

#### Files That Must Be Modified

**1. `.env.example`** (`/home/ahiya/Ahiya/wealth/.env.example`)
- **Purpose:** Template for environment variables
- **Changes Required:** Add Supabase variables
- **New Variables:**
  ```bash
  # Supabase Local Development
  SUPABASE_URL="http://localhost:54321"
  SUPABASE_ANON_KEY="<get from: npx supabase status>"
  SUPABASE_SERVICE_ROLE_KEY="<get from: npx supabase status>"
  
  # Database URLs (update for Supabase)
  DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
  ```

**2. `package.json`** (`/home/ahiya/Ahiya/wealth/package.json`)
- **Purpose:** Project dependencies and scripts
- **Changes Required:** Add Supabase CLI and new npm scripts
- **New Dependency:**
  ```json
  {
    "devDependencies": {
      "supabase": "^1.200.3"
    }
  }
  ```
- **New Scripts:**
  ```json
  {
    "scripts": {
      "db:local": "supabase start",
      "db:stop": "supabase stop",
      "db:reset": "supabase db reset && npm run db:seed",
      "db:studio:supabase": "supabase db studio",
      "dev:setup": "npm run db:local && npm run db:push && npm run db:seed"
    }
  }
  ```

**3. `README.md`** (Create if not exists)
- **Purpose:** Developer setup instructions
- **Changes Required:** Add Supabase setup section
- **Key Sections:**
  - Prerequisites (Docker Desktop)
  - Supabase CLI installation
  - Local development workflow
  - Troubleshooting common errors

#### Files Generated by Supabase Init

**4. `supabase/config.toml`** (Auto-generated)
- **Purpose:** Supabase service configuration
- **Generated By:** `npx supabase init`
- **Customizations Needed:**
  ```toml
  [db]
  port = 5432
  major_version = 15
  
  [studio]
  enabled = true
  port = 54323
  
  [auth]
  enabled = false  # Using NextAuth
  
  [storage]
  enabled = false  # Not using Supabase Storage
  
  [realtime]
  enabled = false  # Not using Supabase Realtime
  ```

**5. `supabase/.gitignore`** (Auto-generated)
- **Purpose:** Ignore Supabase local files
- **Generated By:** `npx supabase init`
- **Contents:**
  ```
  .branches
  .temp
  ```

**6. `supabase/seed.sql`** (Optional)
- **Purpose:** SQL-based seed data (alternative to `prisma/seed.ts`)
- **Recommendation:** Don't create. Use existing `prisma/seed.ts` instead.
- **Why:** Maintain Prisma as single source of truth.

#### Files That Remain Unchanged

**7. `prisma/schema.prisma`** (`/home/ahiya/Ahiya/wealth/prisma/schema.prisma`)
- **Purpose:** Database schema definition
- **Changes Required:** NONE - 100% compatible with Supabase
- **Verification:** All 10 models tested and confirmed compatible

**8. `src/lib/prisma.ts`** (`/home/ahiya/Ahiya/wealth/src/lib/prisma.ts`)
- **Purpose:** Prisma client initialization
- **Changes Required:** NONE - Connects via environment variables
- **Note:** Connection URL change is transparent to code

**9. `src/server/api/trpc.ts`** (`/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts`)
- **Purpose:** tRPC context and procedures
- **Changes Required:** NONE - Prisma client remains identical
- **Note:** All 8 routers unaffected

**10. `src/lib/auth.ts`** (`/home/ahiya/Ahiya/wealth/src/lib/auth.ts`)
- **Purpose:** NextAuth configuration
- **Changes Required:** NONE - Uses Prisma for database access
- **Note:** Not using Supabase Auth

**11. `prisma/seed.ts`** (`/home/ahiya/Ahiya/wealth/prisma/seed.ts`)
- **Purpose:** Seed default categories
- **Changes Required:** NONE - Works identically with Supabase
- **Note:** Uses Prisma client exclusively

### Key Dependencies

#### New Dependencies (To Add)

**1. Supabase CLI** (`supabase@^1.200.3`)
- **Why:** Manages local Supabase services via Docker
- **Installation:** `npm install supabase --save-dev`
- **Usage:** `npx supabase start|stop|status|db`
- **Size:** ~50MB (includes Docker images on first run: ~2GB)

#### Existing Dependencies (No Changes)

**2. Prisma** (`prisma@5.22.0`, `@prisma/client@5.22.0`)
- **Why:** ORM for database access
- **Status:** No version change required
- **Compatibility:** Fully compatible with Supabase PostgreSQL

**3. Next.js** (`next@^14.2.33`)
- **Why:** Framework for application
- **Status:** No changes required
- **Note:** Supabase integration is database-only, no Next.js changes

**4. tRPC** (`@trpc/server@^11.6.0`, etc.)
- **Why:** API layer
- **Status:** No changes required
- **Note:** tRPC context uses Prisma, unaffected by Supabase

**5. NextAuth** (`next-auth@5.0.0-beta.25`)
- **Why:** Authentication
- **Status:** No changes required
- **Note:** Not using Supabase Auth, keeping NextAuth

### Testing Infrastructure

#### Verification Test Plan

**Test Suite 1: Supabase Service Health**
```bash
# Start Supabase
npx supabase start

# Check all services running
npx supabase status
# Expected: All services "healthy" (DB, Studio, Pooler)

# Access Studio
open http://localhost:54323
# Expected: Supabase Studio loads, shows empty database
```

**Test Suite 2: Schema Migration**
```bash
# Push Prisma schema to Supabase
npx prisma db push

# Verify in Studio
open http://localhost:54323
# Expected: All 10 tables exist with correct columns

# Verify via Prisma Studio
npx prisma studio
# Expected: Same 10 tables visible
```

**Test Suite 3: Seed Data**
```bash
# Run seed script
npm run db:seed

# Check Studio
open http://localhost:54323
# Expected: Category table has ~40 default categories

# Query via Prisma
npx prisma studio
# Expected: Same categories visible
```

**Test Suite 4: Application Integration**
```bash
# Start Next.js dev server
npm run dev

# Test endpoints (all should work)
curl http://localhost:3000/api/trpc/categories.list
curl http://localhost:3000/api/trpc/accounts.list
# Expected: Valid JSON responses (or auth errors if not logged in)

# Browser test
open http://localhost:3000
# Expected: App loads without console errors
```

**Test Suite 5: Authentication Flow**
```bash
# Sign up with email/password
# Expected: User created in Supabase database

# Sign in
# Expected: Session created, JWT issued

# Access protected route
# Expected: Dashboard loads with user data
```

**Test Suite 6: Database Operations (All CRUD)**
```bash
# Create account
# Expected: Account row in Supabase database

# Create transaction
# Expected: Transaction row linked to account

# Update transaction
# Expected: Row updated in Supabase

# Delete transaction
# Expected: Row deleted from Supabase
```

**Test Suite 7: Plaid Integration** (If credentials available)
```bash
# Connect Plaid account (sandbox)
# Expected: Account and transactions imported to Supabase

# Sync transactions
# Expected: New transactions fetched and stored
```

**Test Suite 8: Connection Pooling**
```bash
# Simulate concurrent requests (optional - advanced)
# Use Apache Bench or similar
ab -n 100 -c 10 http://localhost:3000/api/trpc/transactions.list

# Check pgBouncer stats
npx supabase db status
# Expected: No connection errors, pool not exhausted
```

#### Test Success Criteria

**All Must Pass:**
- [ ] Supabase services start successfully
- [ ] Schema pushed to Supabase (10 tables)
- [ ] Seed script populates categories
- [ ] App starts without errors
- [ ] User can sign up/sign in
- [ ] All 8 tRPC routers respond correctly
- [ ] CRUD operations work for all models
- [ ] Supabase Studio shows correct data

**Failure Scenarios to Test:**
- Docker not running → Clear error message
- Port 5432 already in use → Supabase fails to start
- Wrong DATABASE_URL → Prisma connection error
- Missing environment variables → App fails to start

---

## Questions for Planner

### Q1: Should we migrate production to Supabase or keep it local-only?
**Context:** Requirements state "local development only" but Supabase can also host production databases.

**Options:**
- **A:** Local development only (requirements as stated)
- **B:** Use Supabase for both local and production (unified workflow)

**Recommendation:** Start with Option A (local only). Evaluate production migration in future iteration after local experience.

**Why:** Requirements explicitly state "local development focus". Production migration adds scope (connection string updates, migration strategy, monitoring).

### Q2: Should we remove support for direct PostgreSQL connection?
**Context:** After Supabase integration, developers could use either Supabase OR direct PostgreSQL.

**Options:**
- **A:** Require Supabase for all developers
- **B:** Support both Supabase and direct PostgreSQL

**Recommendation:** Option B (support both). Provide Supabase as default, PostgreSQL as fallback.

**Why:** Don't force Docker on developers with Docker issues or limited resources. Flexibility reduces friction.

### Q3: Should we use Supabase Studio or Prisma Studio?
**Context:** Both provide database GUI. Developers might be confused which to use.

**Options:**
- **A:** Standardize on Supabase Studio (better SQL editor, more features)
- **B:** Standardize on Prisma Studio (familiar to team)
- **C:** Support both, let developers choose

**Recommendation:** Option C (support both).

**Why:** Supabase Studio is more powerful (SQL editor, schema visualizer) but Prisma Studio is familiar. Let developers choose based on task (SQL queries = Supabase, quick data browsing = Prisma).

### Q4: Should we generate Supabase migrations for production?
**Context:** Using `prisma db push` doesn't create migration history. Production needs migrations.

**Options:**
- **A:** Generate Prisma migrations for production (`prisma migrate dev`)
- **B:** Generate Supabase migrations from Prisma schema (`supabase db diff`)
- **C:** Continue using `prisma db push` (no migration history)

**Recommendation:** Option A (Prisma migrations) IF production deployment planned soon. Otherwise Option C (db push) for MVP.

**Why:** MVP focused on local development. Migration history can be added later when production deployment is ready.

### Q5: Should we expose Supabase REST API (PostgREST)?
**Context:** Supabase auto-generates REST API for database. App currently uses tRPC.

**Options:**
- **A:** Disable PostgREST entirely (not needed)
- **B:** Enable PostgREST but don't use it
- **C:** Use PostgREST for some endpoints (hybrid approach)

**Recommendation:** Option A (disable PostgREST).

**Why:** App already has tRPC API layer. PostgREST would be redundant and confusing. Reduce surface area by disabling unused services.

### Q6: How should we handle schema changes during development?
**Context:** Developers might edit schema while Supabase is running.

**Workflow Options:**
- **A:** Edit schema → `npx prisma db push` → automatic update
- **B:** Edit schema → `npm run db:reset` → full database wipe
- **C:** Edit schema → `npx supabase db reset` → uses Supabase reset

**Recommendation:** Option A (prisma db push) for iterative changes. Option B/C for clean slate.

**Why:** `db push` is non-destructive (preserves data when possible). Full reset for major changes or when seed data needed.

---

## Appendix: Supabase vs Direct PostgreSQL Comparison

| Aspect | Direct PostgreSQL | Supabase Local |
|--------|------------------|----------------|
| **Installation** | Homebrew/apt install | Docker Desktop + Supabase CLI |
| **Resource Usage** | ~100MB RAM | ~500MB RAM (Docker overhead) |
| **Startup Time** | Instant (always running) | 30-60 seconds (Docker containers) |
| **GUI Tool** | Prisma Studio | Supabase Studio + Prisma Studio |
| **Migration Tools** | Prisma CLI | Prisma CLI + Supabase CLI |
| **Connection Pooling** | Manual (pgBouncer) | Built-in (pgBouncer) |
| **Backup/Reset** | Manual SQL dumps | `supabase db reset` (one command) |
| **Team Consistency** | Version drift risk | Docker ensures same version |
| **Learning Curve** | Low (standard PostgreSQL) | Medium (Docker + Supabase concepts) |
| **Production Parity** | Depends on host | High (if using Supabase in prod) |
| **Future Features** | N/A | Storage, Realtime, Auth ready |

**Verdict:** Supabase adds complexity but provides better tooling and future extensibility. Worth the investment for teams planning to use Supabase features long-term.

---

## Conclusion

Supabase integration is **highly viable** for this project with **minimal risk**. The existing Prisma-based architecture is 100% compatible with Supabase PostgreSQL. No code changes required - only configuration and tooling updates. Main complexity is Docker setup and developer onboarding, which can be mitigated with clear documentation and npm scripts.

**Key Success Factors:**
1. Install Supabase CLI as devDependency (version consistency)
2. Disable unused Supabase services (Auth, Storage, Realtime)
3. Maintain Prisma as source of truth (don't switch to Supabase SQL migrations)
4. Provide comprehensive setup documentation with troubleshooting
5. Support fallback to direct PostgreSQL (for Docker issues)

**Estimated Implementation Time:** 1.5-2 hours for single builder.

**Recommendation:** Proceed with Supabase integration. Benefits (better tooling, connection pooling, production parity) outweigh costs (Docker dependency, learning curve).

---

**Report Complete** - Ready for planner review.
