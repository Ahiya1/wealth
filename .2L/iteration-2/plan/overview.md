# 2L Iteration 2 Plan - Wealth Personal Finance Dashboard

## Project Vision

Stabilize and optimize the Wealth application for local development by integrating Supabase for database management and eliminating all runtime errors. This iteration transforms the application from "builds successfully" to "runs successfully" - making it fully functional for development, testing, and demonstration.

## Success Criteria

**Supabase Integration (5 criteria):**
- [x] 1. Supabase local instance starts successfully via `npm run db:local`
- [x] 2. Database schema migrated to Supabase with all 10 models intact
- [x] 3. All Prisma operations work identically with Supabase backend
- [x] 4. Seed script populates Supabase database with default categories
- [x] 5. Documentation updated with Supabase setup instructions

**Runtime Errors (5 criteria):**
- [x] 6. Zero critical (P0) runtime errors in browser console
- [x] 7. All pages accessible without blocking errors (landing, auth, dashboard, features)
- [x] 8. Authentication flow functional with proper session management
- [x] 9. Database operations work end-to-end (create, read, update, delete)
- [x] 10. All tRPC endpoints respond correctly with valid data

## MVP Scope

**In Scope:**

1. **Supabase Local Development Setup**
   - Install and configure Supabase CLI as devDependency
   - Initialize Supabase project structure
   - Configure connection pooling for optimal performance
   - Disable unused services (Auth, Storage, Realtime, Functions)
   - Add npm scripts for database lifecycle management

2. **Environment Configuration**
   - Create comprehensive .env.local setup guide
   - Add Supabase-specific environment variables
   - Update DATABASE_URL to point to Supabase pooler
   - Generate all required secrets (NEXTAUTH_SECRET, ENCRYPTION_KEY)
   - Validate environment before application starts

3. **Runtime Error Discovery & Categorization**
   - Systematic page-by-page error collection
   - Error prioritization (P0 Critical → P1 High → P2 Medium → P3 Low)
   - Document all errors with stack traces and reproduction steps
   - Identify error patterns and root causes

4. **Critical Error Fixes (P0/P1 only)**
   - Environment and database connection errors
   - NextAuth session and authentication errors
   - tRPC client/server hydration issues
   - React component rendering errors
   - Missing imports or configuration issues

5. **Documentation & Developer Experience**
   - Update README with Supabase setup instructions
   - Create troubleshooting guide for common errors
   - Document development workflow (start → migrate → seed → dev)
   - Add environment variable reference

**Out of Scope (Post-MVP):**

- Supabase production deployment (local development only)
- Replacing NextAuth with Supabase Auth
- Supabase Storage integration
- Supabase Realtime features
- Supabase Edge Functions
- Row Level Security (RLS) policies
- P2 (Medium) and P3 (Low) error fixes (documented for future)
- Performance optimization and bundle size reduction
- External integration refinements (Plaid, Anthropic, Resend)
- Automated testing infrastructure (Playwright test suite)

## Development Phases

1. **Exploration** ✅ Complete
   - Explorer 1: Supabase integration architecture (COMPLETE)
   - Explorer 2: Runtime error investigation patterns (COMPLETE)

2. **Planning** 🔄 Current Phase
   - Create 4-file comprehensive plan
   - Define builder tasks and dependencies
   - Establish code patterns and conventions

3. **Building** ⏳ 1.5-2 hours (2-3 parallel builders)
   - Builder-1: Supabase Setup & Configuration (45-60 min)
   - Builder-2: Runtime Error Discovery (30-45 min)
   - Builder-3: Critical Error Fixes (45-90 min, may split)

4. **Integration** ⏳ 15-20 minutes
   - Merge builder branches
   - Verify no conflicts in package.json or .env.example
   - Run full test suite
   - Validate all success criteria

5. **Validation** ⏳ 20-30 minutes
   - Complete manual testing checklist
   - Test all user flows end-to-end
   - Verify zero P0/P1 errors remain
   - Smoke test on clean environment

6. **Deployment** ⏳ Final
   - Local development ready
   - Production deployment deferred to future iteration

## Timeline Estimate

**Exploration:** ✅ Complete (2 comprehensive reports)

**Planning:** ✅ Complete (this document + 3 others)

**Building Phase Breakdown:**
- Builder-1 (Supabase): 45-60 minutes (MEDIUM complexity)
- Builder-2 (Error Discovery): 30-45 minutes (MEDIUM complexity)
- Builder-3 (Error Fixes): 45-90 minutes (HIGH complexity, may split into 3A/3B)

**Integration:** 15-20 minutes (minimal conflicts expected)

**Validation:** 20-30 minutes (manual testing + smoke tests)

**Total Estimated Time:** 2-3.5 hours (depending on error volume and Builder-3 split decision)

**Parallel Execution Strategy:**
- Phase 1: Builder-1 works alone (Supabase setup is prerequisite)
- Phase 2: Builder-2 discovers errors while Builder-1 completes
- Phase 3: Builder-3 (or 3A/3B/3C) fixes errors in priority order

## Risk Assessment

### High Risks

**Risk 1: Docker Compatibility Issues**
- **Impact:** HIGH - Blocks Supabase setup entirely
- **Likelihood:** LOW - Docker is mature and cross-platform
- **Affected Platforms:** Windows (WSL2), older Macs (Rosetta 2)
- **Mitigation Strategy:**
  - Document Docker Desktop installation with version requirements
  - Provide troubleshooting guide for port conflicts (5432, 54321-54326)
  - Offer fallback: Direct PostgreSQL installation guide
  - Pre-check: Validate Docker is running before `supabase start`
  - Test on Windows, macOS Intel, and macOS Apple Silicon

**Risk 2: Cascading Errors (Fixing One Reveals More)**
- **Impact:** HIGH - Could extend timeline significantly
- **Likelihood:** MEDIUM - Typical for environment-dependent errors
- **Mitigation Strategy:**
  - Fix errors in dependency order: Environment → Database → Auth → tRPC → UI
  - Re-test after each category fixed
  - Use systematic error categorization framework
  - Time-box Builder-3 to P0/P1 errors only
  - Document P2/P3 errors for future iteration

**Risk 3: Missing Environment Variables Block All Testing**
- **Impact:** CRITICAL - Cannot test anything without proper .env.local
- **Likelihood:** HIGH - No .env.local exists yet
- **Mitigation Strategy:**
  - Builder-1 creates comprehensive .env.local setup guide FIRST
  - Generate all required secrets immediately (NEXTAUTH_SECRET, ENCRYPTION_KEY)
  - Validate environment before proceeding to error discovery
  - Provide exact commands for secret generation
  - Test database connection before application starts

### Medium Risks

**Risk 4: Supabase Port Conflicts**
- **Impact:** MEDIUM - Prevents Supabase services from starting
- **Likelihood:** MEDIUM - Port 5432 commonly used by local PostgreSQL
- **Mitigation Strategy:**
  - Check port availability: `lsof -i :5432` before starting Supabase
  - Customize ports in `supabase/config.toml` if conflicts detected
  - Document how to stop conflicting PostgreSQL service
  - Provide alternative port configuration examples

**Risk 5: Complex Error Fixing Exceeds Time Budget**
- **Impact:** MEDIUM - May not fix all P1 errors in time
- **Likelihood:** MEDIUM - Unknown error volume until discovery phase
- **Mitigation Strategy:**
  - Builder-3 uses SPLIT strategy if error volume > 10 P0/P1 errors
  - Prioritize ruthlessly: Fix blockers first, defer polish
  - Time-box error fixing: 90 minutes maximum
  - Document unfixed P2/P3 errors clearly for future iteration

**Risk 6: tRPC Hydration or Serialization Errors**
- **Impact:** MEDIUM - Data displays incorrectly or fails to load
- **Likelihood:** MEDIUM - Decimal/Date types are tricky with superjson
- **Mitigation Strategy:**
  - Verify superjson transformer on both client and server
  - Test Decimal and Date serialization specifically
  - Add error boundaries around tRPC calls for graceful degradation
  - Document serialization patterns in patterns.md

### Low Risks

**Risk 7: Developer Onboarding Friction**
- **Impact:** LOW - Slows future developers
- **Likelihood:** MEDIUM - More tools to install (Docker + Supabase CLI)
- **Mitigation Strategy:**
  - Provide one-command setup: `npm run dev:setup`
  - Create detailed README with screenshots
  - Document common errors and solutions
  - Pre-check script validates Docker installed and running

## Integration Strategy

### File Modification Conflicts

**High Conflict Potential:**
- `package.json` - Builder-1 adds Supabase CLI, Builder-1 adds npm scripts
  - Resolution: Builder-1 owns all package.json changes
- `.env.example` - Builder-1 adds Supabase variables
  - Resolution: Builder-1 completes first, no conflicts

**Low Conflict Potential:**
- Source code files - Builder-3 only modifies code, others don't touch
- Configuration files - Builder-1 creates new files (supabase/config.toml), doesn't modify existing

### Integration Order

1. **Merge Builder-1 first** (Supabase setup)
   - Adds: supabase/ directory, updated package.json, new npm scripts
   - Validates: `npm install` succeeds, `npm run db:local` starts Supabase

2. **Merge Builder-2** (Error discovery report)
   - Adds: error-log.md, fix-checklist.md documents
   - No code conflicts - documentation only

3. **Merge Builder-3 last** (Error fixes)
   - Modifies: Various source files based on discovered errors
   - Validates: All success criteria met, zero P0/P1 errors

### Testing After Integration

**Smoke Test Sequence:**
```bash
# 1. Clean install
npm install

# 2. Start Supabase
npm run db:local

# 3. Push schema and seed
npm run db:push
npm run db:seed

# 4. Start application
npm run dev

# 5. Test critical path
# - Landing page loads (http://localhost:3000)
# - Sign up works
# - Sign in works
# - Dashboard loads with data
# - Can create account, transaction, budget, goal
# - All pages accessible
# - Zero P0/P1 errors in console
```

## Deployment Plan

**Iteration 2 Scope: Local Development Only**

This iteration focuses exclusively on local development environment. Production deployment is deferred to future iteration.

**Local Development Workflow (After Iteration 2):**

```bash
# First-time setup (new developer)
git clone <repo>
cd wealth
npm install
cp .env.example .env.local
# Edit .env.local with real values
npm run dev:setup  # Starts Supabase, migrates, seeds, and starts app

# Daily development
npm run db:local   # Start Supabase (if not running)
npm run dev        # Start Next.js dev server

# Database operations
npm run db:push    # Push schema changes
npm run db:reset   # Reset database (drops all data)
npm run db:seed    # Seed default categories
npm run db:studio  # Open Prisma Studio (or use Supabase Studio at :54323)

# Shutdown
npm run db:stop    # Stop Supabase
```

**Future Production Deployment (Out of Scope):**
- Supabase hosted database (cloud)
- Vercel deployment (Next.js app)
- Environment variable configuration for production
- Database migration strategy (Prisma migrations)
- Monitoring and error tracking (Sentry)

## Key Architectural Decisions

### Decision 1: Supabase as Local Development Database

**Rationale:**
- Provides PostgreSQL with enhanced tooling (Studio GUI, CLI, connection pooling)
- Docker-based ensures team consistency (no version drift)
- Future-ready for Supabase features (Storage, Realtime) if needed
- Connection pooling built-in via pgBouncer
- Superior developer experience vs manual PostgreSQL setup

**Trade-offs:**
- Requires Docker Desktop (resource overhead ~500MB RAM)
- Slightly longer startup time (~30-60 seconds vs instant PostgreSQL)
- Additional learning curve for Docker + Supabase concepts

**Alternatives Considered:**
- Direct PostgreSQL: Simpler but no enhanced tooling, version drift risk
- SQLite: Inappropriate for production-parity testing
- Supabase Cloud: Too early, adds cost and complexity

### Decision 2: Prisma-First Migration Strategy

**Rationale:**
- Maintain current team workflow (Prisma is source of truth)
- Faster development (no migration files needed in local dev)
- Prisma Studio remains fully functional
- Team already comfortable with Prisma CLI

**Implementation:**
```bash
# Developer workflow
# 1. Edit prisma/schema.prisma
# 2. Push to Supabase
npm run db:push
# 3. Test changes
npm run dev
```

**Alternatives Considered:**
- Supabase-First: Requires SQL migration files, breaks current workflow
- Dual Maintenance: Too complex, prone to drift

### Decision 3: Disable Unused Supabase Services

**Services Disabled:**
- Auth (using NextAuth instead)
- Storage (no file storage in MVP)
- Realtime (no real-time features)
- Functions (using Next.js API routes/tRPC)

**Services Enabled:**
- Database (PostgreSQL) - Core requirement
- Studio (Web GUI) - Enhanced developer experience
- Pooler (pgBouncer) - Connection pooling

**Rationale:**
- Reduces Docker resource usage
- Simplifies local stack
- Faster startup time
- Fewer ports to manage (only 5432, 54322, 54323)

### Decision 4: Fix P0/P1 Errors Only, Document P2/P3

**Error Priority Levels:**
- **P0 (Critical):** Blocks core functionality - FIX NOW
- **P1 (High):** Major features broken - FIX NOW
- **P2 (Medium):** Minor features or edge cases - DOCUMENT
- **P3 (Low):** Polish, warnings, non-blocking - DOCUMENT

**Rationale:**
- Time-constrained iteration (1-2 hours target)
- MVP focus: "Working" beats "Perfect"
- Unknown error volume until discovery phase
- P2/P3 errors can be addressed incrementally

**Implementation:**
- Builder-2 categorizes ALL discovered errors
- Builder-3 fixes ONLY P0/P1 errors
- Create known-issues.md for P2/P3 tracking

### Decision 5: Graceful Degradation for External APIs

**APIs Potentially Missing:**
- Plaid (account syncing)
- Anthropic Claude (AI categorization)
- Resend (email sending)
- Google OAuth (social login)

**Approach:**
- Core features work without external APIs
- Show placeholder UI or "Configure API" messages
- Don't crash or show cryptic errors
- Manual alternatives available (manual account entry, manual categorization)

**Implementation Pattern:**
```typescript
// Example: Plaid graceful degradation
if (!process.env.PLAID_CLIENT_ID) {
  return <PlaidConfigPlaceholder />
}
// Otherwise, render Plaid Link
```

## Builder Coordination

### Communication Protocol

**Builder-1 (Supabase Setup):**
- Works independently first (no dependencies)
- Upon completion, announces: "Supabase ready, DATABASE_URL available"
- Provides .env.local setup guide for other builders

**Builder-2 (Error Discovery):**
- Waits for Builder-1 to complete environment setup
- Starts error discovery once app can start
- Provides error-log.md to Builder-3 continuously (running list)

**Builder-3 (Error Fixing):**
- Waits for Builder-2's initial error categorization
- Starts with P0 errors immediately
- May request SPLIT if error volume > 10 P0/P1 errors
- Coordinates with Builder-2 on re-testing after fixes

### Shared Resources

**Documents:**
- `.env.example` - Builder-1 updates, others reference
- `package.json` - Builder-1 owns, others don't modify
- `README.md` - Builder-1 updates with Supabase instructions
- `error-log.md` - Builder-2 creates, Builder-3 references
- `fix-checklist.md` - Builder-2 creates, Builder-3 updates

**No Code Conflicts Expected:**
- Builder-1: Only modifies config files and package.json
- Builder-2: Only creates documentation
- Builder-3: Only modifies source code (no overlap with Builder-1/2)

## Quality Gates

### Gate 1: Supabase Setup Complete (Builder-1)

**Validation Checklist:**
- [ ] `npm install` succeeds (Supabase CLI added)
- [ ] `npm run db:local` starts Supabase without errors
- [ ] `npx supabase status` shows all services healthy
- [ ] Supabase Studio accessible at http://localhost:54323
- [ ] DATABASE_URL and DIRECT_URL documented in .env.example
- [ ] supabase/config.toml created with disabled services
- [ ] npm scripts added: db:local, db:stop, db:reset, dev:setup
- [ ] README updated with Supabase setup section

### Gate 2: Error Discovery Complete (Builder-2)

**Validation Checklist:**
- [ ] All 11+ pages tested (landing, auth, dashboard, 6 feature pages, settings)
- [ ] error-log.md created with ALL discovered errors
- [ ] Each error includes: page, error message, stack trace, priority
- [ ] fix-checklist.md created with P0/P1 errors only
- [ ] Error categorization complete (Environment, Database, Auth, tRPC, UI, etc.)
- [ ] Estimated fix time provided for each P0/P1 error
- [ ] SPLIT recommendation made if P0/P1 count > 10

### Gate 3: Critical Errors Fixed (Builder-3)

**Validation Checklist:**
- [ ] All P0 (Critical) errors fixed and verified
- [ ] All P1 (High) errors fixed and verified
- [ ] P2/P3 errors documented in known-issues.md
- [ ] All pages load without blocking errors
- [ ] Authentication flow works (sign up, sign in, sign out)
- [ ] Dashboard loads data correctly
- [ ] Can create account, transaction, budget, goal
- [ ] No console errors on critical path
- [ ] All tRPC endpoints respond with 200 OK

### Gate 4: Integration Validation

**Validation Checklist:**
- [ ] Clean install from scratch succeeds
- [ ] Supabase starts and migrations apply
- [ ] Seed data loads correctly
- [ ] Application starts without errors
- [ ] All 10 success criteria met
- [ ] Smoke test passes (see Integration Strategy section)
- [ ] No regressions introduced

## Success Metrics Summary

**Hard Requirements (All Must Pass):**
1. `npm run db:local` starts Supabase successfully
2. `npm run db:push` migrates schema to Supabase
3. `npm run db:seed` populates default categories
4. `npm run dev` starts application without errors
5. Landing page loads (http://localhost:3000)
6. Can sign up new user
7. Can sign in with credentials
8. Dashboard loads with data
9. Zero P0 errors in console
10. Zero P1 errors in console

**Soft Goals (Nice to Have):**
- P2 errors fixed if time permits
- Playwright test suite setup (future iteration)
- Performance profiling (future iteration)
- Docker pre-check script

## Post-Iteration Handoff

**Deliverables for Future Iterations:**

1. **Supabase-Ready Codebase**
   - Local development uses Supabase
   - All documentation updated
   - npm scripts in place

2. **Clean Runtime Environment**
   - Zero critical errors
   - All pages functional
   - Authentication working

3. **Error Documentation**
   - known-issues.md with P2/P3 errors
   - Troubleshooting guide
   - Common error solutions

4. **Developer Onboarding Materials**
   - Updated README
   - .env.example with all variables
   - Setup validation checklist

**Recommended Next Iteration:**
- Production deployment (Supabase hosted + Vercel)
- Fix P2 (Medium) errors
- Add automated testing (Playwright)
- Performance optimization
- External API integrations (Plaid setup, Claude categorization)

---

**Plan Version:** 1.0
**Last Updated:** 2025-10-01
**Status:** READY FOR EXECUTION
