# Builder Task Breakdown - Iteration 2

## Overview

**Total Builders:** 2-3 (depending on error volume discovered by Builder-2)

**Execution Strategy:**
- **Phase 1:** Builder-1 works independently (Supabase setup prerequisite)
- **Phase 2:** Builder-2 begins error discovery once Builder-1 completes environment setup
- **Phase 3:** Builder-3 (or split into 3A/3B/3C) fixes errors based on Builder-2's categorization

**Estimated Timeline:**
- Builder-1: 45-60 minutes (MEDIUM complexity)
- Builder-2: 30-45 minutes (MEDIUM complexity)
- Builder-3: 45-90 minutes (HIGH complexity, may split if >10 P0/P1 errors found)
- Total: 2-3.5 hours

---

## Builder-1: Supabase Local Development Setup

### Scope

Set up and configure Supabase for local development, replacing direct PostgreSQL connection with Supabase-managed database stack. This builder owns all infrastructure configuration: Supabase CLI installation, service configuration, environment variable updates, npm script additions, and documentation.

### Complexity Estimate

**MEDIUM**

**Justification:**
- No code changes required (only configuration)
- Well-documented patterns in patterns.md
- Potential Docker issues on some platforms
- Port conflict resolution may be needed
- First-time Supabase setup has learning curve

**Does NOT require SPLIT** - Single focused builder can complete all tasks

### Success Criteria

- [x] 1. Supabase CLI installed as devDependency (version 1.200.3+)
- [x] 2. `npm run db:local` starts Supabase successfully (all enabled services healthy)
- [x] 3. `npx supabase status` shows correct connection strings and API keys
- [x] 4. Supabase Studio accessible at http://localhost:54323
- [x] 5. supabase/config.toml created with disabled services (Auth, Storage, Realtime, Functions)
- [x] 6. .env.example updated with Supabase variables and new DATABASE_URL format
- [x] 7. npm scripts added: db:local, db:stop, db:reset, dev:setup
- [x] 8. Database schema successfully pushed to Supabase (`npm run db:push` succeeds)
- [x] 9. Seed script populates Supabase database with default categories
- [x] 10. README.md updated with Supabase setup section and troubleshooting guide
- [x] 11. .env.local setup guide created (document for other builders)

### Files to Create

**New Files:**
- `supabase/config.toml` - Supabase service configuration (auto-generated, then customized)
- `supabase/.gitignore` - Ignore Supabase local files (auto-generated)
- `docs/SUPABASE_SETUP.md` - Detailed setup guide for developers (or add to README)
- `.env.local.example` - Optional: More detailed example with comments

**Files to Modify:**
- `package.json` - Add Supabase CLI devDependency + new npm scripts
- `.env.example` - Add Supabase variables, update DATABASE_URL format
- `README.md` - Add "Local Development Setup" section with Supabase instructions
- `.gitignore` - Ensure .env.local is ignored (should already exist)

**Files NOT to Modify:**
- `prisma/schema.prisma` - 100% compatible, no changes needed
- `src/lib/prisma.ts` - Works via environment variables, no changes needed
- Any application source code - Supabase is drop-in replacement

### Dependencies

**Depends on:** None (first builder to execute)

**Blocks:**
- Builder-2 (cannot discover errors without working environment)
- Builder-3 (cannot fix errors without database running)

### Implementation Notes

#### Step 1: Install Supabase CLI

```bash
# Install as project devDependency (ensure version consistency)
npm install supabase@^1.200.3 --save-dev

# Verify installation
npx supabase --version
# Expected: supabase 1.200.3
```

**Add to package.json:**
```json
{
  "devDependencies": {
    "supabase": "^1.200.3"
  }
}
```

#### Step 2: Initialize Supabase Project

```bash
# Initialize (creates supabase/ directory)
npx supabase init

# Generated files:
# - supabase/config.toml
# - supabase/.gitignore
# - supabase/migrations/ (empty)
# - supabase/seed.sql (delete - using prisma/seed.ts instead)
```

**Delete unnecessary file:**
```bash
rm supabase/seed.sql
# We use prisma/seed.ts instead
```

#### Step 3: Customize supabase/config.toml

**Edit:** `supabase/config.toml`

**Key Changes:**
- Disable unused services: Auth, Storage, Realtime, Functions, Analytics
- Keep enabled: Database, Pooler, Studio
- Set PostgreSQL version to 15

**Complete Configuration (copy from patterns.md Pattern 2):**
See patterns.md for full config.toml content.

#### Step 4: Update .env.example

**Current .env.example:**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wealth"
DIRECT_URL="postgresql://user:password@localhost:5432/wealth"
```

**Updated .env.example:**
```bash
# ============================================
# DATABASE CONFIGURATION (REQUIRED)
# ============================================

# Pooled connection for application queries (via pgBouncer)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"

# Direct connection for migrations (bypasses pooler)
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# ============================================
# SUPABASE CONFIGURATION (OPTIONAL)
# ============================================
# Get these values from: npx supabase status after first start

SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<get from: npx supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<get from: npx supabase status>"

# ============================================
# (Keep all existing variables below)
# ============================================
```

**Key Points:**
- DATABASE_URL now points to port 54322 (Supabase pooler)
- DIRECT_URL points to port 5432 (Supabase PostgreSQL)
- Add pgbouncer=true parameter to DATABASE_URL
- Add Supabase variables for future features

#### Step 5: Add npm Scripts

**Edit:** `package.json`

**Add These Scripts:**
```json
{
  "scripts": {
    "db:local": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset && npm run db:seed",
    "db:studio:supabase": "supabase start && open http://localhost:54323",
    "dev:setup": "supabase start && npm run db:push && npm run db:seed && npm run dev"
  }
}
```

**Complete scripts section (copy from patterns.md Pattern 6):**
See patterns.md for full npm scripts.

#### Step 6: Start Supabase and Retrieve Keys

```bash
# First start (downloads Docker images ~2GB, takes 30-90 seconds)
npm run db:local

# Expected output:
# Starting Supabase local development setup...
# Pulling Docker images... (first time only)
# Starting PostgreSQL...
# Starting Pooler...
# Starting Studio...
# Supabase local development setup is running.

# Get connection strings and API keys
npx supabase status

# Expected output:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy these values for .env.local setup guide**

#### Step 7: Create .env.local Setup Guide

**Create:** `docs/ENV_SETUP.md` or add to README.md

**Content:**
```markdown
# Environment Variable Setup

## Quick Setup

1. Copy template:
   ```bash
   cp .env.example .env.local
   ```

2. Generate secrets:
   ```bash
   # NEXTAUTH_SECRET
   openssl rand -base64 32
   # Copy output to .env.local

   # ENCRYPTION_KEY
   openssl rand -hex 32
   # Copy output to .env.local
   ```

3. Get Supabase keys:
   ```bash
   npm run db:local
   npx supabase status
   # Copy anon key and service_role key to .env.local
   ```

4. Optional: Add external API keys
   - Plaid (sandbox): https://dashboard.plaid.com/developers/keys
   - Anthropic: https://console.anthropic.com/
   - Google OAuth: https://console.cloud.google.com/apis/credentials

5. Verify:
   ```bash
   npm run dev
   # Should start without errors
   ```

## Required Variables

- `DATABASE_URL` - Auto-set by Supabase
- `DIRECT_URL` - Auto-set by Supabase
- `NEXTAUTH_SECRET` - Generate with openssl
- `NEXTAUTH_URL` - http://localhost:3000

## Optional Variables

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `ENCRYPTION_KEY` - Plaid integration
- `ANTHROPIC_API_KEY` - AI categorization
- `RESEND_API_KEY` - Email sending

## Troubleshooting

**Error: "DATABASE_URL not set"**
- Ensure .env.local exists
- Check DATABASE_URL format matches .env.example

**Error: "Can't reach database server"**
- Run `npm run db:local` to start Supabase
- Verify with `npx supabase status`
```

#### Step 8: Test Database Connection

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase
npm run db:push

# Expected output:
# Environment variables loaded from .env.local
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "postgres" at "localhost:54322"
# Your database is now in sync with your Prisma schema. Done in 1.23s

# Verify in Supabase Studio
open http://localhost:54323
# Navigate to Table Editor
# Should see all 10 tables: User, Account, Transaction, etc.
```

#### Step 9: Seed Database

```bash
# Run seed script
npm run db:seed

# Expected output:
# Seeding database...
# Created 15 default categories
# Seed completed successfully

# Verify in Supabase Studio
open http://localhost:54323
# Navigate to Category table
# Should see ~15 default categories
```

#### Step 10: Update README.md

**Add Section: "Local Development Setup"**

```markdown
## Local Development Setup

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or 10.x
- Docker Desktop (for Supabase)

### First-Time Setup

1. Clone repository:
   ```bash
   git clone <repo-url>
   cd wealth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values (see docs/ENV_SETUP.md)
   ```

4. Start everything with one command:
   ```bash
   npm run dev:setup
   ```
   This will:
   - Start Supabase (downloads Docker images on first run)
   - Push database schema
   - Seed default categories
   - Start Next.js dev server

5. Open browser:
   - Application: http://localhost:3000
   - Supabase Studio: http://localhost:54323

### Daily Development

```bash
# Start Supabase
npm run db:local

# Start Next.js dev server
npm run dev

# Open application
open http://localhost:3000
```

### Database Operations

```bash
# Push schema changes
npm run db:push

# Seed database
npm run db:seed

# Reset database (wipe all data)
npm run db:reset

# Open database GUIs
npm run db:studio              # Prisma Studio
npm run db:studio:supabase     # Supabase Studio
```

### Troubleshooting

**Docker not running:**
- macOS: Open Docker Desktop app
- Windows: Open Docker Desktop app
- Linux: `sudo systemctl start docker`

**Port conflicts (5432 already in use):**
- Stop local PostgreSQL: `brew services stop postgresql@15`
- Or customize Supabase port in `supabase/config.toml`

**Supabase won't start:**
```bash
# Clean up and try again
npx supabase stop --no-backup
docker compose down
npm run db:local
```
```

### Patterns to Follow

**Reference these patterns from patterns.md:**
- Pattern 1: Supabase CLI Installation
- Pattern 2: Supabase Configuration File
- Pattern 3: Supabase Lifecycle Commands
- Pattern 4: Environment Variable Setup
- Pattern 5: Database Migration with Supabase
- Pattern 6: npm Scripts in package.json

### Testing Requirements

**Validation Checklist:**
- [ ] `npm install` succeeds (Supabase CLI added)
- [ ] `npm run db:local` starts Supabase without errors
- [ ] `npx supabase status` shows all services "healthy"
- [ ] Supabase Studio accessible at http://localhost:54323
- [ ] `npm run db:push` applies schema successfully
- [ ] `npm run db:seed` populates categories
- [ ] Supabase Studio shows all 10 tables with data
- [ ] README.md updated with clear setup instructions
- [ ] .env.example updated with Supabase variables
- [ ] `npm run dev:setup` works end-to-end (new developer experience)

**Test on Multiple Platforms (if possible):**
- macOS Apple Silicon (M1/M2/M3)
- macOS Intel
- Windows 11 (WSL2)
- Linux (Ubuntu)

### Potential Issues & Solutions

**Issue 1: Docker Not Installed**
- Symptom: `Error: Cannot connect to Docker daemon`
- Solution: Install Docker Desktop, ensure it's running
- Pre-check: Add to README prerequisite section

**Issue 2: Port 5432 Conflict**
- Symptom: `Error: Port 5432 is already in use`
- Solution: Stop local PostgreSQL or customize Supabase port
- Document in README troubleshooting section

**Issue 3: First Start Takes Long**
- Symptom: Supabase start hangs for 60+ seconds
- Cause: Downloading Docker images (~2GB first time)
- Solution: Document expected behavior in README
- Not an error - just slow first time

**Issue 4: Insufficient RAM**
- Symptom: Docker containers crash or restart
- Cause: < 2GB available RAM
- Solution: Close other applications, increase Docker memory limit
- Document minimum system requirements

### Handoff to Other Builders

**Upon Completion, Announce:**

"✅ Builder-1 Complete: Supabase Setup Ready

**Supabase Status:**
- Services running: Database (5432), Pooler (54322), Studio (54323)
- All tables created and seeded
- Connection strings verified

**For Builder-2 (Error Discovery):**
- .env.local template created (see docs/ENV_SETUP.md)
- Run `cp .env.example .env.local` and fill in values
- Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- Start app: `npm run dev`
- Application should be accessible at http://localhost:3000

**For Builder-3 (Error Fixing):**
- Database is ready for testing
- All Prisma operations verified working
- Reference patterns.md for database error handling patterns

**Testing:**
- Verified on: [platform]
- Known issues: [none/list]
"

---

## Builder-2: Runtime Error Discovery & Categorization

### Scope

Systematically discover and document all runtime errors by navigating through every page of the application and recording console errors, warnings, network failures, and visual issues. Categorize errors by priority (P0 Critical → P1 High → P2 Medium → P3 Low) and provide fix recommendations. This builder creates the error inventory that Builder-3 will use to fix issues.

### Complexity Estimate

**MEDIUM**

**Justification:**
- Systematic but straightforward process (follow checklist)
- Requires careful documentation of each error
- Need to test all 11+ pages and major user flows
- Error volume unknown until discovery (could be 5 or 50 errors)
- No code changes required (documentation only)

**Does NOT require SPLIT** - Single builder can complete discovery in 30-45 minutes

### Success Criteria

- [x] 1. All 11+ pages tested (landing, auth pages, dashboard, 6 feature pages, settings)
- [x] 2. error-log.md created with ALL discovered errors (no error missed)
- [x] 3. Each error includes: page URL, error message, stack trace, priority, reproduction steps
- [x] 4. Errors categorized by type (Environment, Database, Auth, tRPC, React, UI, Integration)
- [x] 5. Priority assigned to each error (P0/P1/P2/P3)
- [x] 6. fix-checklist.md created with P0/P1 errors only (actionable list for Builder-3)
- [x] 7. Estimated fix time provided for each P0/P1 error
- [x] 8. SPLIT recommendation made if P0/P1 count > 10 errors
- [x] 9. Screenshots captured for visual issues
- [x] 10. All 4 user flows tested (sign up, budgets, goals, analytics)

### Files to Create

**New Files:**
- `error-log.md` - Comprehensive list of ALL errors discovered
- `fix-checklist.md` - P0/P1 errors only with fix order
- `known-issues.md` - P2/P3 errors deferred to future iterations
- `screenshots/` - Directory with error screenshots (if visual issues)

**Files NOT to Modify:**
- No source code changes
- No configuration changes
- Documentation only

### Dependencies

**Depends on:**
- Builder-1 (Supabase setup complete, environment ready)
- Must have working .env.local with all required variables

**Blocks:**
- Builder-3 (cannot fix errors without knowing what they are)

### Implementation Notes

#### Step 1: Set Up Testing Environment

```bash
# Ensure Supabase is running
npm run db:local

# Verify database connection
npx prisma studio
# Should open without errors

# Create .env.local from Builder-1's guide
cp .env.example .env.local

# Generate required secrets
openssl rand -base64 32  # NEXTAUTH_SECRET
openssl rand -hex 32     # ENCRYPTION_KEY

# Edit .env.local with generated values
# (See Builder-1's docs/ENV_SETUP.md)

# Start application
npm run dev

# Expected: Server starts on http://localhost:3000
# Monitor terminal output for startup errors
```

#### Step 2: Page-by-Page Error Collection

**Use This Template for Each Page:**

```markdown
## Page: [Page Name]
**URL:** http://localhost:3000[path]
**Status:** ✅ Loads / ❌ Error / ⚠️ Warning

### Console Errors (Red):
- [Error 1 message]
  - Stack trace: [First 3 lines]
  - Priority: P0/P1/P2/P3
  - Reproduction: [Steps]

### Console Warnings (Yellow):
- [Warning 1 message]
  - Priority: P2/P3
  - Impact: [Description]

### Network Failures (Check Network Tab):
- [Failed request URL]
  - Status: 500/401/404
  - Response: [Error message]
  - Priority: P0/P1

### Visual Issues:
- [Issue description]
  - Screenshot: screenshots/[filename].png
  - Priority: P2/P3

### Notes:
- [Additional observations]
```

**Testing Order (Tier 1: Public Pages):**

1. **Landing Page** (http://localhost:3000)
   - Open browser DevTools (F12)
   - Navigate to Console tab
   - Load page
   - Record all errors/warnings
   - Check Network tab for failed requests
   - Take screenshot if visual issues

2. **Sign Up Page** (http://localhost:3000/signup)
   - Load page, check console
   - Fill form with test data
   - Submit form
   - Record any errors during submission
   - Check if redirect works

3. **Sign In Page** (http://localhost:3000/signin)
   - Load page, check console
   - Test email/password sign in
   - Test Google OAuth button (may fail without credentials - that's OK)
   - Record errors

4. **Reset Password** (http://localhost:3000/reset-password)
   - Load page, check console
   - Test form submission
   - May fail without Resend credentials (document graceful handling)

**Testing Order (Tier 2: Protected Pages - Requires Auth):**

5. **Dashboard** (http://localhost:3000/dashboard)
   - **CRITICAL PAGE** - Most errors likely here
   - Sign in first to access
   - Check for tRPC errors (failed API calls)
   - Inspect Network tab: Filter by `/api/trpc`
   - Record all failed requests
   - Check if charts/cards render
   - Note missing data vs actual errors

6. **Accounts** (http://localhost:3000/accounts)
   - Check page load
   - Test "Add Account" button
   - Test account creation form
   - Test Plaid Link button (may fail - document)

7. **Transactions** (http://localhost:3000/transactions)
   - Check page load
   - Test "Add Transaction" button
   - Test filters and search
   - Test pagination if applicable

8. **Budgets** (http://localhost:3000/budgets)
   - Check page load
   - Test "Create Budget" button
   - Test month selector
   - Check budget progress calculations

9. **Analytics** (http://localhost:3000/analytics)
   - **COMPLEX PAGE** - Charts may have errors
   - Check if Recharts renders
   - Test date range filters
   - Check for data aggregation errors

10. **Goals** (http://localhost:3000/goals)
    - Check page load
    - Test "Create Goal" button
    - Test goal progress updates

11. **Settings - Categories** (http://localhost:3000/settings/categories)
    - Check page load
    - Verify seed categories display
    - Test "Add Category" button

#### Step 3: User Flow Testing

**Flow 1: Sign Up & First Account**
```markdown
## User Flow: Sign Up & First Account

### Steps:
1. Navigate to /signup
2. Fill form: test@example.com / password123
3. Submit
4. Should redirect to /dashboard
5. Navigate to /accounts
6. Click "Add Account"
7. Fill form: "Checking", $1000
8. Submit

### Errors Encountered:
- [List all errors during this flow]

### Blockers:
- [Steps that completely failed]
```

**Flow 2: Budget Creation**
**Flow 3: Goal Tracking**
**Flow 4: Analytics & Insights**

#### Step 4: Error Categorization

**Create:** `error-log.md`

**Structure:**
```markdown
# Runtime Error Log - Iteration 2

**Discovery Date:** [Date]
**Builder:** Builder-2
**Environment:** Local Development (Supabase)

## Summary

- Total errors discovered: [N]
- P0 (Critical): [N] - Blocks core functionality
- P1 (High): [N] - Major features broken
- P2 (Medium): [N] - Minor issues
- P3 (Low): [N] - Polish/warnings

## Category 1: Environment & Configuration Errors

### Error 1.1: [Short Description]
**Priority:** P0
**Page:** [URL]
**Error Message:**
```
[Full error message]
```
**Stack Trace:**
```
[First 5 lines of stack trace]
```
**Reproduction:**
1. Step 1
2. Step 2

**Root Cause:** [Hypothesis]
**Estimated Fix Time:** [X minutes]
**Assigned to Builder-3:** ✅ YES / ❌ NO (if P2/P3)

---

[Repeat for each error]

## Category 2: Database & Prisma Errors

[Same structure]

## Category 3: Authentication & Session Errors

[Same structure]

## Category 4: tRPC & API Errors

[Same structure]

## Category 5: React Component Errors

[Same structure]

## Category 6: UI/Styling Errors

[Same structure]

## Category 7: External Integration Errors

[Same structure]
```

#### Step 5: Create Fix Checklist

**Create:** `fix-checklist.md`

**Content:**
```markdown
# Fix Checklist - P0/P1 Errors Only

**Total P0/P1 Errors:** [N]
**Estimated Total Fix Time:** [X hours]
**SPLIT Recommendation:** [YES/NO - if > 10 errors, recommend split]

## Priority Order (Fix in this order)

### Phase 1: Critical (P0) - Blocks Everything
- [ ] 1.1 [Error description] - [X min] - Category: [Type]
- [ ] 1.2 [Error description] - [X min] - Category: [Type]

**Phase 1 Total:** [N] errors, [X] minutes

### Phase 2: High (P1) - Major Features Broken
- [ ] 2.1 [Error description] - [X min] - Category: [Type]
- [ ] 2.2 [Error description] - [X min] - Category: [Type]

**Phase 2 Total:** [N] errors, [X] minutes

## SPLIT Strategy (If Recommended)

If P0/P1 count > 10, recommend splitting Builder-3:

**Builder-3A: Environment & Database Errors**
- Fixes: [Error IDs]
- Estimated: [X] minutes

**Builder-3B: Authentication & tRPC Errors**
- Fixes: [Error IDs]
- Estimated: [X] minutes

**Builder-3C: React & UI Errors**
- Fixes: [Error IDs]
- Estimated: [X] minutes
```

#### Step 6: Document Known Issues (P2/P3)

**Create:** `known-issues.md`

**Content:**
```markdown
# Known Issues (P2/P3) - Deferred to Future Iterations

These errors are documented but not fixed in Iteration 2.

## Medium Priority (P2) - Minor Features

### Issue 2.1: [Description]
**Impact:** [What doesn't work]
**Workaround:** [Alternative approach]
**Estimated Fix:** [X minutes]
**Suggested Iteration:** Iteration 3

## Low Priority (P3) - Polish & Warnings

### Issue 3.1: [Description]
**Impact:** [Cosmetic or warning only]
**Workaround:** [If applicable]
**Estimated Fix:** [X minutes]
**Suggested Iteration:** Iteration 4 or later
```

### Patterns to Follow

**Reference these patterns from patterns.md:**
- Pattern 7: Type-Safe Environment Variables (check if issues)
- Pattern 8: Runtime Environment Validation (test if needed)
- All error handling patterns (document which errors match which patterns)

### Testing Requirements

**Validation Checklist:**
- [ ] All 11+ pages visited and tested
- [ ] All 4 user flows completed (or attempted)
- [ ] Console errors captured with full stack traces
- [ ] Network tab errors captured with status codes
- [ ] Visual issues documented with screenshots
- [ ] Every error assigned priority (P0/P1/P2/P3)
- [ ] Every error assigned category (Environment/Database/Auth/tRPC/React/UI/Integration)
- [ ] Estimated fix time provided for P0/P1 errors
- [ ] SPLIT recommendation made based on error count
- [ ] fix-checklist.md created and ready for Builder-3

**Common Error Types to Look For:**

**Environment Errors:**
- "DATABASE_URL not set"
- "NEXTAUTH_SECRET is required"
- Missing API keys (Plaid, Anthropic)

**Database Errors:**
- "Can't reach database server"
- "Table does not exist"
- Prisma query failures

**Auth Errors:**
- Session is null when it should exist
- Redirect loops
- Google OAuth failures

**tRPC Errors:**
- "TRPCClientError: UNAUTHORIZED"
- Network request failures
- Serialization errors (Decimal, Date)

**React Errors:**
- "Hydration failed"
- "useEffect in server component"
- Component rendering errors

**UI Errors:**
- Missing icons
- Tailwind class conflicts
- Layout issues

### Potential Issues & Solutions

**Issue 1: Too Many Errors to Document**
- Solution: Focus on unique errors, don't duplicate
- If > 20 total errors, group similar errors together
- Document patterns, not every instance

**Issue 2: Cannot Test Protected Pages**
- Cause: Cannot sign up/sign in (auth broken)
- Solution: Document auth errors first, note which pages couldn't be tested
- Builder-3 will fix auth, then re-test protected pages

**Issue 3: Cascading Errors**
- Cause: One error causes many others
- Solution: Mark root cause as P0, related errors as lower priority
- Note dependencies in error descriptions

### Handoff to Builder-3

**Upon Completion, Announce:**

"✅ Builder-2 Complete: Error Discovery Done

**Error Summary:**
- Total errors: [N]
- P0 (Critical): [N]
- P1 (High): [N]
- P2 (Medium): [N] - deferred
- P3 (Low): [N] - deferred

**SPLIT Recommendation:** [YES/NO]
[If YES, provide split strategy]

**For Builder-3:**
- See `fix-checklist.md` for prioritized P0/P1 errors
- See `error-log.md` for full details on each error
- Fix order: P0 → P1
- Estimated total time: [X] hours
- Reference patterns.md for fix patterns

**Critical Errors (Must Fix First):**
1. [Error description]
2. [Error description]
3. [Error description]

**Testing:**
- All pages tested: ✅
- All flows tested: ✅
- Screenshots captured: [N]
"

---

## Builder-3: Critical Error Fixes (P0/P1 Only)

### Scope

Fix all P0 (Critical) and P1 (High) priority errors discovered by Builder-2. Work in dependency order: Environment → Database → Auth → tRPC → React → UI. Re-test after each category fixed to catch cascading errors. Document any remaining P2/P3 errors for future iterations.

### Complexity Estimate

**HIGH**

**Justification:**
- Error volume unknown until Builder-2 completes discovery
- Fixing one error may reveal more errors (cascading)
- Requires knowledge of multiple systems (Prisma, tRPC, NextAuth, React)
- Some errors may have complex root causes
- Time-sensitive (must complete in 45-90 minutes)

**MAY REQUIRE SPLIT** - Decision depends on Builder-2's findings

**SPLIT Criteria:**
- If P0/P1 error count > 10: RECOMMEND SPLIT
- If errors span multiple unrelated systems: RECOMMEND SPLIT
- If estimated fix time > 90 minutes: RECOMMEND SPLIT

### Success Criteria

- [x] 1. All P0 (Critical) errors fixed and verified
- [x] 2. All P1 (High) errors fixed and verified
- [x] 3. Zero console errors on critical path (landing → sign up → dashboard → create account)
- [x] 4. Authentication flow works end-to-end (sign up, sign in, sign out)
- [x] 5. Dashboard loads without errors and displays data correctly
- [x] 6. Can create account, transaction, budget, goal
- [x] 7. All tRPC endpoints respond with 200 OK (or appropriate status)
- [x] 8. No React hydration mismatches
- [x] 9. P2/P3 errors documented in known-issues.md (not fixed)
- [x] 10. Regression testing passed (fixes don't break working features)

### Files to Create

**New Files:**
- `src/lib/env.ts` - Environment validation (if environment errors found)
- `src/components/ErrorBoundary.tsx` - React error boundary (if component errors found)
- Any missing components/utilities needed for fixes

**Files to Modify:**
- Varies based on discovered errors
- Likely candidates:
  - `src/app/providers.tsx` - If tRPC/session errors
  - `src/lib/prisma.ts` - If database connection errors
  - `src/lib/auth.ts` - If NextAuth errors
  - `src/server/api/routers/*` - If tRPC procedure errors
  - Various page components - If React/hydration errors
  - `src/components/*` - If UI component errors

**Files to Update:**
- `known-issues.md` - Add any new P2/P3 errors discovered during fixing

### Dependencies

**Depends on:**
- Builder-1 (Supabase setup complete)
- Builder-2 (Error discovery complete, fix-checklist.md created)

**Blocks:**
- Integration/Validation phase

### Implementation Notes

#### Step 1: Review Error Inventory

```bash
# Read Builder-2's deliverables
cat fix-checklist.md
cat error-log.md

# Understand error distribution
# - Count by category
# - Count by priority
# - Identify dependencies (fix database before auth, etc.)

# Make SPLIT decision
# If > 10 P0/P1 errors OR estimated time > 90 min:
#   Recommend SPLIT into Builder-3A, 3B, 3C
#   See Potential Split Strategy section below
```

#### Step 2: Fix Errors in Priority Order

**Phase 1: Environment & Database Errors (P0)**

These block everything else. Fix first.

**Common Fixes:**

1. **Missing .env.local variables:**
```bash
# If DATABASE_URL error
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"' >> .env.local

# If NEXTAUTH_SECRET error
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"" >> .env.local

# Restart dev server
npm run dev
```

2. **Database connection errors:**
```bash
# Verify Supabase running
npx supabase status

# Push schema if tables missing
npm run db:push

# Seed if categories missing
npm run db:seed
```

3. **Environment validation:**
If multiple env var errors, create `src/lib/env.ts` using Pattern 7 from patterns.md.

**Phase 2: Authentication Errors (P0/P1)**

**Common Fixes:**

1. **Session is null:**
```typescript
// Check src/lib/auth.ts
// Ensure auth() function returns session correctly

// Check src/app/providers.tsx
// Ensure SessionProvider wraps app correctly
```

2. **NextAuth redirect loops:**
```typescript
// Check src/middleware.ts
// Ensure redirect logic is correct
```

3. **Google OAuth errors:**
If Google OAuth fails without credentials, implement graceful degradation:
```typescript
// src/components/auth/SignInForm.tsx
{process.env.GOOGLE_CLIENT_ID && (
  <button>Sign in with Google</button>
)}
```

**Phase 3: tRPC & API Errors (P0/P1)**

**Common Fixes:**

1. **TRPCClientError: UNAUTHORIZED:**
```typescript
// Check src/server/api/trpc.ts
// Ensure protectedProcedure has session check

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { session: ctx.session } })
})
```

2. **Failed to serialize (Decimal/Date):**
```typescript
// Check src/lib/trpc.ts (client)
// Ensure superjson transformer is set

httpBatchLink({
  url: '/api/trpc',
  transformer: superjson,  // Must match server
})

// Check src/server/api/trpc.ts (server)
// Ensure superjson transformer is set

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  return {
    prisma,
    session: await auth(),
  }
}

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,  // Must match client
})
```

3. **Prisma query errors:**
Use Pattern 11 from patterns.md for database error handling.

**Phase 4: React Component Errors (P1)**

**Common Fixes:**

1. **Hydration failed:**
- Identify component with date/time rendering
- Wrap in ClientOnly component (Pattern 12 from patterns.md)
- Or use consistent formatting (Pattern 13 from patterns.md)

2. **useEffect in server component:**
- Add 'use client' directive to component
- Or extract client component (Pattern 14 from patterns.md)

3. **Component rendering errors:**
- Wrap in ErrorBoundary (Pattern 9 from patterns.md)
- Fix underlying issue if possible

**Phase 5: UI/Styling Errors (P1)**

**Common Fixes:**

1. **Missing icons:**
```typescript
// Ensure lucide-react imported correctly
import { IconName } from 'lucide-react'
```

2. **Tailwind class conflicts:**
- Use `cn()` utility from `src/lib/utils.ts`
- Check for conflicting classes

3. **Layout issues:**
- Verify responsive classes (sm:, md:, lg:)
- Test on mobile viewport

#### Step 3: Test After Each Fix

**After Fixing Each Category:**

```bash
# Restart dev server
npm run dev

# Test affected pages
# - If fixed auth: Test sign up, sign in
# - If fixed database: Test data operations
# - If fixed tRPC: Test API calls in dashboard
# - If fixed React: Check console for hydration warnings

# Run smoke test (see Integration Strategy in overview.md)
```

#### Step 4: Document Remaining Issues

**Update:** `known-issues.md`

**Add any new P2/P3 errors discovered:**
```markdown
## New Issues Discovered During Fixing

### Issue: [Description]
**Discovered while fixing:** [Related P0/P1 error]
**Priority:** P2
**Suggested Fix:** [Brief description]
**Estimated Time:** [X minutes]
```

### Patterns to Follow

**Reference these patterns from patterns.md:**
- Pattern 7: Type-Safe Environment Variables
- Pattern 8: Runtime Environment Validation
- Pattern 9: React Error Boundary
- Pattern 10: tRPC Error Handling
- Pattern 11: Database Error Handling
- Pattern 12: Client-Only Rendering
- Pattern 13: Consistent Date Formatting
- Pattern 14: Fixing "use client" Directive Errors
- Fix 1-5: Common Runtime Error Fixes

### Testing Requirements

**Validation Checklist (Per Fix):**
- [ ] Error no longer appears in console
- [ ] Related feature works correctly
- [ ] No new errors introduced
- [ ] Other features still work (regression check)

**Final Validation (All Fixes Complete):**
- [ ] Complete smoke test (see below)
- [ ] All 10 success criteria met
- [ ] Zero P0 errors remain
- [ ] Zero P1 errors remain
- [ ] P2/P3 errors documented in known-issues.md

**Smoke Test:**
```bash
# 1. Fresh start
npm run db:reset
npm run dev

# 2. Sign up new user
# Navigate to /signup
# Create test@example.com / password123
# Should redirect to /dashboard
# Dashboard should load without errors

# 3. Create account
# Navigate to /accounts
# Click "Add Account"
# Fill form: "Checking", $1000
# Submit
# Should appear in list

# 4. Create transaction
# Navigate to /transactions
# Click "Add Transaction"
# Fill form: $50, "Groceries"
# Submit
# Should appear in list

# 5. Create budget
# Navigate to /budgets
# Click "Create Budget"
# Select "Groceries", $500
# Submit
# Should show progress card

# 6. Create goal
# Navigate to /goals
# Click "Create Goal"
# Enter "Emergency Fund", $10000
# Submit
# Should show goal card

# 7. View analytics
# Navigate to /analytics
# Charts should render (even with limited data)

# 8. Check console
# Should be clean (no errors, minimal warnings)
```

### Potential Split Strategy

**If Builder-2 recommends SPLIT (> 10 P0/P1 errors):**

#### Builder-3A: Environment & Database Errors

**Scope:**
- Fix all environment variable issues
- Fix all database connection issues
- Fix all Prisma query errors
- Create environment validation if needed

**Success Criteria:**
- [ ] Application starts without environment errors
- [ ] Database connection works
- [ ] All Prisma operations succeed
- [ ] Seed script populates data correctly

**Estimated Time:** 30-45 minutes

**Foundation:** Other builders depend on this completing first

#### Builder-3B: Authentication & tRPC Errors

**Scope:**
- Fix all NextAuth session errors
- Fix all tRPC client/server errors
- Fix all API endpoint errors
- Implement graceful degradation for external APIs

**Dependencies:** Wait for Builder-3A to complete

**Success Criteria:**
- [ ] Can sign up new user
- [ ] Can sign in with credentials
- [ ] Session persists across reloads
- [ ] All tRPC endpoints respond correctly
- [ ] Dashboard loads data without errors

**Estimated Time:** 30-45 minutes

#### Builder-3C: React & UI Errors

**Scope:**
- Fix all React hydration mismatches
- Fix all component rendering errors
- Fix all UI/styling issues
- Add error boundaries where needed

**Dependencies:** Can work in parallel with Builder-3B (minimal overlap)

**Success Criteria:**
- [ ] Zero hydration warnings in console
- [ ] All components render correctly
- [ ] No missing icons or styling issues
- [ ] Error boundaries catch component errors

**Estimated Time:** 20-30 minutes

**Coordination:**
- Builder-3A completes first (foundation)
- Builder-3B and 3C work in parallel after 3A
- Builder-3B has priority (core functionality)
- Builder-3C can defer P2 UI issues if time-constrained

### Handoff to Integration

**Upon Completion, Announce:**

"✅ Builder-3 Complete: Critical Errors Fixed

**Fixes Summary:**
- P0 (Critical) errors fixed: [N]/[N]
- P1 (High) errors fixed: [N]/[N]
- P2/P3 errors documented: [N] (deferred to future)

**Testing Status:**
- Smoke test: ✅ PASSED
- All pages load: ✅
- Authentication works: ✅
- Data operations work: ✅
- Zero console errors: ✅

**Known Issues (Deferred):**
- See `known-issues.md` for P2/P3 errors
- Total deferred: [N] errors
- Estimated time to fix: [X] hours (future iteration)

**For Integration:**
- All success criteria met
- Ready to merge
- No regressions detected
- Code changes documented in commit messages

**Modified Files:**
[List all files modified with brief description of changes]
"

---

## Builder Execution Order

### Phase 1: Foundation (Sequential)

**Builder-1: Supabase Setup**
- Start: Immediately
- Depends on: None
- Estimated: 45-60 minutes
- Deliverable: Working Supabase local development environment

**Wait for Builder-1 to complete before proceeding**

### Phase 2: Discovery (Sequential)

**Builder-2: Error Discovery**
- Start: After Builder-1 completes
- Depends on: Builder-1 (needs working environment)
- Estimated: 30-45 minutes
- Deliverable: Categorized error inventory with fix recommendations

**Wait for Builder-2 to complete before proceeding**

### Phase 3: Fixing (Sequential or Parallel depending on SPLIT)

**Scenario A: No SPLIT (≤ 10 P0/P1 errors)**

**Builder-3: Error Fixes**
- Start: After Builder-2 completes
- Depends on: Builder-2 (needs error inventory)
- Estimated: 45-90 minutes
- Deliverable: All P0/P1 errors fixed

**Scenario B: SPLIT (> 10 P0/P1 errors)**

**Builder-3A: Environment & Database**
- Start: After Builder-2 completes
- Depends on: Builder-2
- Estimated: 30-45 minutes

**Wait for Builder-3A to complete, then parallel:**

**Builder-3B: Auth & tRPC** (parallel)
- Start: After Builder-3A completes
- Depends on: Builder-3A
- Estimated: 30-45 minutes

**Builder-3C: React & UI** (parallel with 3B)
- Start: After Builder-3A completes
- Depends on: Builder-3A (minimal overlap with 3B)
- Estimated: 20-30 minutes

## Integration Notes

**Minimal Conflicts Expected:**
- Builder-1: Only modifies config files and package.json
- Builder-2: Only creates documentation (no code conflicts)
- Builder-3: Only modifies source code (no overlap with Builder-1 config files)

**Integration Order:**
1. Merge Builder-1 first
2. Merge Builder-2 (documentation only, no conflicts)
3. Merge Builder-3 (or 3A, 3B, 3C in sequence)

**Testing After Integration:**
- Run full smoke test (see overview.md)
- Verify all 10 success criteria met
- Check for any merge conflicts or regressions

---

**Builder Tasks Version:** 1.0
**Last Updated:** 2025-10-01
**Status:** READY FOR EXECUTION
