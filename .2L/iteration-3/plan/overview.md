# 2L Iteration Plan - Wealth (Iteration 3)

## Project Vision

Fix critical database connection issues and implement Supabase Auth to provide secure, modern authentication for the Wealth personal finance application. **Frontend redesign has been deferred to Iteration 4** to maintain focus and deliverability.

## Success Criteria

### Database & Auth (5 criteria)
- [x] Database connection fixed - user registration works without errors
- [x] Supabase Auth service enabled and configured locally
- [x] Email/password signup with verification flow functional
- [x] Magic link authentication works
- [x] Protected routes secured with Supabase Auth middleware

## MVP Scope

**In Scope:**
- Database connection fix (DATABASE_URL configuration)
- Supabase Auth service enablement
- Full NextAuth to Supabase Auth migration
- Email/password authentication
- Magic link (passwordless) authentication
- OAuth provider setup (Google - configured but optional)
- Password reset flow
- Protected route middleware
- tRPC context integration with Supabase
- User sync between Supabase Auth and Prisma
- Auth flow testing

**Out of Scope (Deferred to Iteration 4):**
- Frontend design system (color palette, typography)
- UI component redesign
- Landing page redesign
- Dashboard redesign
- Animation implementation (framer-motion)
- Chart styling updates
- Dark mode
- Advanced RLS policies
- Multi-factor authentication

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 2-3 hours (sequential builders)
4. **Integration** ⏳ 15 minutes
5. **Validation** ⏳ 30 minutes
6. **Deployment** ⏳ Final

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- **Builder-1: Database Fix** - 15-20 minutes
- **Builder-2: Supabase Auth Setup** - 60-90 minutes
- **Builder-3: Supabase Auth Integration** - 60-90 minutes
- Integration: 15 minutes
- Validation: 30 minutes
- **Total: ~2-3 hours**

## Risk Assessment

### High Risks

**Risk 1: tRPC Context Breaking Changes**
- **Impact:** Very High - All protected procedures depend on auth context
- **Likelihood:** Medium
- **Mitigation:**
  - Update context types gradually
  - Test each router individually
  - Keep user.id field consistent
  - Add comprehensive error logging
  - Document context structure changes

**Risk 2: Prisma Schema Migration Issues**
- **Impact:** High - Could affect existing data and relations
- **Likelihood:** Medium
- **Mitigation:**
  - Add supabaseAuthId as nullable initially
  - Test migration on empty database first
  - Backup before migration
  - Two-step migration (add field, then remove old)
  - Clear rollback plan prepared

### Medium Risks

**Risk 3: Supabase Auth Service Startup**
- **Impact:** High
- **Likelihood:** Low
- **Mitigation:**
  - Check port conflicts before enabling
  - Update Supabase CLI to latest
  - Monitor logs during startup
  - Have rollback config.toml ready

**Risk 4: Email Flow Testing Complexity**
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:**
  - Enable Inbucket for local email testing
  - Document Inbucket URL (http://localhost:54324)
  - Provide example emails in documentation

## Integration Strategy

### Sequential Build Approach

**Builder-1 → Builder-2 → Builder-3** (Not parallel)

**Why Sequential:**
- Builder-2 depends on Builder-1 (database must work before auth setup)
- Builder-3 depends on Builder-2 (auth service must be running before integration)
- Reduces risk of integration conflicts
- Allows validation at each step

**Handoff Points:**
1. **Builder-1 → Builder-2:** Database connection verified, Prisma working
2. **Builder-2 → Builder-3:** Supabase Auth running, client utilities created, migration applied

**Shared Dependencies:**
- All builders use same Prisma schema
- All builders reference same environment variables
- All builders follow tRPC context patterns

**Integration Validation:**
- After Builder-1: Test `npm run db:push` succeeds
- After Builder-2: Test `curl http://localhost:54321/auth/v1/health` responds
- After Builder-3: Test full auth flow end-to-end

## Deployment Plan

### Local Development Deployment

**Prerequisites:**
- Supabase CLI installed (already present)
- Docker running (for local Supabase)
- PostgreSQL accessible on port 5432

**Deployment Steps:**

1. **Database Fix (Builder-1)**
   - Update .env.local with direct connection
   - Run `npm run db:push` to verify
   - Restart dev server

2. **Supabase Auth Setup (Builder-2)**
   - Update supabase/config.toml
   - Run `npx supabase stop && npx supabase start`
   - Verify auth service health check
   - Apply Prisma migration

3. **Auth Integration (Builder-3)**
   - Install dependencies
   - Update code files
   - Restart dev server
   - Test auth flows in browser

4. **Validation**
   - Run through auth test checklist
   - Verify all protected routes work
   - Test tRPC procedures

**Rollback Plan:**
- If Builder-1 issues: Revert .env.local, restore pooler connection
- If Builder-2 issues: Disable auth in config.toml, rollback Prisma migration
- If Builder-3 issues: Revert middleware and tRPC changes, restore NextAuth

### Production Deployment (Future)

**Not in scope for Iteration 3** - Local development only

**Future considerations:**
- Hosted Supabase project setup
- Environment variable configuration
- OAuth provider credentials
- Email service configuration (production SMTP)

## Testing Strategy

### Functional Testing

**Database Connection:**
- [x] Prisma push succeeds without errors
- [x] User registration creates database record
- [x] Prisma Studio accessible
- [x] Migrations apply cleanly

**Supabase Auth:**
- [x] Auth service health check responds
- [x] Email/password signup creates user
- [x] Email verification sends to Inbucket
- [x] Magic link authentication works
- [x] Password reset flow functional
- [x] OAuth redirect configured (Google)

**Integration:**
- [x] tRPC context receives Supabase user
- [x] Protected procedures require auth
- [x] Unauthenticated requests return UNAUTHORIZED
- [x] Middleware redirects work correctly
- [x] User data syncs to Prisma correctly

### Test Checklist

See `builder-tasks.md` for detailed acceptance criteria per builder.

## Notes

**Scope Change Rationale:**

Original Iteration 3 requirements included both database/auth fixes AND frontend redesign (7-10 hour estimate). After exploration, we determined:

1. **Frontend redesign is substantial work** - Design system, color palette, typography, animations, 8 pages redesigned
2. **Auth migration is critical and complex** - 2-3 hours of focused work
3. **Risk of failure increases** when combining two major migrations
4. **Better to deliver auth successfully** than attempt both and deliver neither

**Decision:** Defer frontend redesign to Iteration 4. Focus Iteration 3 exclusively on database fix + Supabase Auth migration.

**Benefits:**
- Realistic 2-3 hour timeline (not 7-10 hours)
- Lower risk of integration issues
- Auth can be thoroughly tested
- Frontend redesign can use stable auth foundation
- Each iteration delivers clear value

## Key Decisions

1. **Use Direct Database Connection** - Port 5432 instead of pooler (54322) for local dev
2. **Full Supabase Auth Replacement** - No hybrid approach, complete NextAuth removal
3. **Use @supabase/auth-ui-react** - Pre-built auth components for faster implementation
4. **Sync Supabase users to Prisma** - Keep application data in Prisma, auth in Supabase
5. **Email verification required in production** - Optional in local dev for testing speed
6. **Sequential builder execution** - Not parallel, to reduce integration risk
