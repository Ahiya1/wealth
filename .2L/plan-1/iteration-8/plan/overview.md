# 2L Iteration Plan - Wealth App: Foundation & Infrastructure

## Project Vision

Establish a robust role-based access control (RBAC) system and restructured navigation that enables admin capabilities, currency conversion features, and enhanced UX in future iterations. This iteration transforms the Wealth app from a single-user application into a multi-tiered system with admin oversight, laying the groundwork for subscription tiers and system-wide management.

**Core Principle:** Build a secure, scalable foundation that supports the vision of "conscious money relationship" by enabling personalized features based on user roles and subscription tiers.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [x] **Database Migration:** User model includes `role` (USER/ADMIN), `subscriptionTier` (FREE/PREMIUM), and subscription date fields
- [x] **Admin User Setup:** ahiya.butman@gmail.com has ADMIN role in database
- [x] **Role-Based Access:** Admin users can access `/admin` routes; non-admin users are redirected with error message
- [x] **Server-Side Security:** Middleware enforces admin route protection at server level (not just client-side)
- [x] **Admin API Layer:** tRPC admin router with `adminProcedure` middleware provides system metrics and user list
- [x] **Admin Dashboard:** `/admin` page displays total users, total transactions, active users (30d/90d), tier breakdown
- [x] **Admin User Management:** `/admin/users` page shows searchable/filterable user list with role, tier, email, transaction count
- [x] **Navigation Restructure:** Settings and Account sections clearly separated with distinct purposes
- [x] **Settings Overview:** `/settings` page provides discovery hub for all settings sections (categories, currency placeholder, appearance, data)
- [x] **Account Section:** `/account` section created with profile, membership, security, preferences subsections
- [x] **Avatar Dropdown:** User avatar in sidebar opens dropdown menu with account links and sign out
- [x] **Breadcrumb Navigation:** All settings and account pages display breadcrumbs showing hierarchy
- [x] **User Query Updated:** `trpc.users.me` includes role and subscriptionTier fields
- [x] **Regression Testing:** All existing features work (accounts, transactions, budgets, goals, analytics)
- [x] **Zero Data Loss:** Database migration completes successfully without data corruption

## MVP Scope

### In Scope

**Database & Auth:**
- Add `UserRole` enum (USER, ADMIN) and `SubscriptionTier` enum (FREE, PREMIUM) to Prisma schema
- Extend User model with role, tier, and subscription date fields
- Migration script to set ahiya.butman@gmail.com as ADMIN
- All existing users default to USER role and FREE tier

**Backend - Middleware:**
- Extend `middleware.ts` to protect `/admin` routes with server-side role checking
- Add Prisma user lookup in middleware for role verification
- Redirect non-admin users from admin routes with clear error message
- Add `/account` to protected routes

**Backend - tRPC:**
- Create `adminProcedure` middleware that enforces ADMIN role (throws FORBIDDEN for non-admin)
- New `admin.router.ts` with system-wide read-only procedures:
  - `systemMetrics`: Total users, transactions, accounts, active users (30d/90d), tier breakdown
  - `userList`: Paginated user list with search (email/name), filter (role/tier), includes transaction count
- Update `users.router.ts`: Add role and subscriptionTier to `me` query select

**Frontend - Navigation:**
- Fix sidebar Settings link: `/settings/categories` → `/settings`
- Create avatar dropdown component in DashboardSidebar (Radix DropdownMenu)
- Move "Sign Out" from sidebar bottom to avatar dropdown
- Add conditional "Admin" link to sidebar (visible only to admin users)
- Implement breadcrumb component for settings/account pages

**Frontend - Settings Restructure:**
- Enhance `/settings` page as overview with cards linking to all subsections
- Create `/settings/currency` placeholder page (displays current currency, "Coming Soon" message)
- Create `/settings/appearance` page (move ThemeSwitcher from old location)
- Create `/settings/data` page (export functionality, data management)
- Keep `/settings/categories` as-is

**Frontend - Account Section (New):**
- Create `/account` overview page with profile summary and tier badge
- Create `/account/profile` page (move ProfileSection component - name, email, avatar)
- Create `/account/membership` page (display tier badge, "Upgrade to Premium" placeholder, billing coming soon)
- Create `/account/security` page (move DangerZone component, password change placeholder)
- Create `/account/preferences` page (move timezone from profile, notification preferences placeholder)

**Frontend - Admin Pages (New):**
- Create `/admin` dashboard with system-wide metrics cards (user counts, transaction totals, activity stats)
- Create `/admin/users` page with searchable table (email, name, role, tier, created date, transaction count)
- Search bar for email/name filtering
- Role and tier filter dropdowns
- Pagination controls for large user lists

### Out of Scope (Post-MVP)

**Deferred to Future Iterations:**
- Admin user editing (changing role/tier) - Iteration 1+ (requires audit logging, confirmation dialogs)
- Admin user deletion - Future iteration
- User impersonation - Future iteration
- Audit logs for admin actions - Future iteration
- Email notifications for role changes - Future iteration
- Subscription billing integration - Future iteration (requires payment provider)
- Password change functionality - Future iteration (Supabase handles this)
- Two-factor authentication (2FA) - Future iteration
- Session management (active sessions list) - Future iteration
- Email notification preferences - Future iteration
- Language/localization preferences - Future iteration
- Full-text search optimization - Future iteration (use simple contains for now)
- Role-based caching (Redis) - Future iteration (optimize if needed)
- Mobile-responsive header with avatar - Future iteration (mobile UX refinement)

## Development Phases

1. **Exploration** - Complete (3 comprehensive reports)
2. **Planning** - Current (creating this plan)
3. **Building** - 6-8 hours (5 parallel builders)
4. **Integration** - 30-45 minutes (merge builder outputs, resolve conflicts)
5. **Validation** - 45-60 minutes (security testing, regression testing, manual verification)
6. **Deployment** - 15-30 minutes (migration execution, production deployment)

## Timeline Estimate

- **Exploration:** Complete (3 explorer reports)
- **Planning:** Complete (this document)
- **Building:** 6-8 hours total (builders work in parallel where possible)
  - Builder 1 (Database): 1-1.5 hours
  - Builder 2 (Backend/tRPC): 2-3 hours
  - Builder 3 (Middleware): 1-1.5 hours
  - Builder 4 (Navigation/Routes): 2-3 hours
  - Builder 5 (Admin Pages): 2-2.5 hours
- **Integration:** 30-45 minutes (merge outputs, test interactions)
- **Validation:** 45-60 minutes (comprehensive testing)
- **Total:** 8-11 hours (realistic with contingency)

**Builder Parallelization:**
- Group 1 (No dependencies): Builder 1 (Database)
- Group 2 (Depends on Group 1): Builders 2, 3 (Backend/Middleware)
- Group 3 (Depends on Groups 1-2): Builders 4, 5 (Frontend)

## Risk Assessment

### High Risks

**Database Migration Failure (IMPACT: CRITICAL, LIKELIHOOD: LOW)**
- **Risk:** First tracked migration could fail, causing database inconsistency or data loss
- **Mitigation Strategy:**
  - Test migration on local Supabase instance first
  - Create database backup before production migration
  - Use additive changes only (no data deletion)
  - Default values prevent null constraint violations (role: USER, tier: FREE)
  - Write rollback migration script and test it
  - Run migration during low-traffic period
  - Verify all existing users have role/tier after migration

**Admin Route Security Bypass (IMPACT: CRITICAL, LIKELIHOOD: LOW)**
- **Risk:** Unauthorized users could access admin routes or procedures if security is misconfigured
- **Mitigation Strategy:**
  - Defense in depth: Middleware + tRPC procedure + UI conditional rendering
  - Server-side checks ONLY (never trust client)
  - Test unauthorized access attempts thoroughly (non-admin user trying /admin)
  - Clear error messages without revealing system details
  - Security audit checklist (see Validation section)
  - Manual testing with both admin and non-admin accounts

### Medium Risks

**Navigation Confusion (IMPACT: MEDIUM, LIKELIHOOD: MEDIUM)**
- **Risk:** Users confused about Settings vs Account distinction after restructure
- **Mitigation Strategy:**
  - Clear semantic separation: Settings = app config, Account = personal/billing
  - Breadcrumb navigation on all pages
  - Consistent icon usage (Settings icon for settings, User icon for account)
  - Redirect old `/settings/account` to `/account` (preserve bookmarks)
  - Update all internal links throughout app
  - Consider onboarding tooltip after update ("Settings moved!")

**Middleware Performance Degradation (IMPACT: MEDIUM, LIKELIHOOD: LOW)**
- **Risk:** Extra database query on every admin route request adds latency
- **Mitigation Strategy:**
  - Use lean query (select only `role` field, use existing index)
  - Monitor middleware response times in development
  - Add performance logging in development mode
  - Accept slight overhead for now (admin routes are low-traffic)
  - Defer caching optimization until proven necessary (>100ms latency)

**Content Distribution Ambiguity (IMPACT: MEDIUM, LIKELIHOOD: MEDIUM)**
- **Risk:** Unclear which features belong in Settings vs Account
- **Mitigation Strategy:**
  - Decision framework documented in tech-stack.md
  - Settings: Categories, Currency, Appearance, Data (app-level)
  - Account: Profile, Membership, Security, Preferences (personal)
  - Regular review during building phase

### Low Risks

**Broken Links After Route Restructure (IMPACT: LOW, LIKELIHOOD: LOW)**
- **Risk:** Internal links still pointing to old routes
- **Mitigation Strategy:**
  - Search codebase for all occurrences of `/settings/account`
  - Add redirects from old paths to new paths
  - Manual testing of all navigation flows
  - Check breadcrumb generation

**TypeScript Type Errors After Migration (IMPACT: LOW, LIKELIHOOD: LOW)**
- **Risk:** Prisma client regeneration causes type mismatches
- **Mitigation Strategy:**
  - Run `npx prisma generate` after schema changes
  - Fix any type errors before committing
  - Prisma auto-updates types (minimal manual work)

## Integration Strategy

### Builder Coordination

**Sequential Dependencies:**
1. **Builder 1 (Database)** must complete first - all other builders depend on role/tier fields
2. **Builders 2 & 3 (Backend/Middleware)** can work in parallel after Builder 1
3. **Builders 4 & 5 (Frontend)** can work in parallel after Builders 2 & 3

**Shared Files (Potential Conflicts):**
- `middleware.ts`: Builder 3 updates this (no conflicts with others)
- `server/api/trpc.ts`: Builder 2 adds adminProcedure (single file, careful merge)
- `server/api/root.ts`: Builder 2 registers admin router (single line addition)
- `DashboardSidebar.tsx`: Builder 4 updates navigation items (major refactor)
- `prisma/schema.prisma`: Builder 1 completes this first (no conflicts)

**Integration Points:**
1. **Database → Backend:** Builder 2 uses new role/tier enums from Builder 1
2. **Backend → Middleware:** Builder 3 uses Prisma client to query user role (Builder 1 dependency)
3. **Backend → Frontend:** Builders 4 & 5 use tRPC procedures from Builder 2
4. **Navigation → Pages:** Builder 4 creates route structure, Builder 5 fills admin pages

**Conflict Resolution:**
- Builder 4 (Navigation) creates empty route files for Builder 5 (Admin Pages) to populate
- All builders coordinate on shared types (use Prisma Client enums consistently)
- Integration phase verifies all links point to correct routes

### Testing Integration

**Integration Test Scenarios:**
1. Admin user navigates from sidebar → Admin link → /admin dashboard → /admin/users
2. Non-admin user attempts /admin access → redirected to /dashboard with error
3. User clicks avatar → dropdown opens → navigates to /account/profile → breadcrumbs display
4. Settings link in sidebar → /settings overview → clicks Currency → /settings/currency placeholder
5. Admin user queries systemMetrics → data displays correctly
6. Admin user searches user list → filter by role → pagination works

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All builder tasks complete and tested in isolation
- [ ] Integration testing passed (all scenarios above)
- [ ] Security audit complete (unauthorized access blocked)
- [ ] Regression testing passed (existing features work)
- [ ] Database migration tested on local Supabase instance
- [ ] Backup of production database created
- [ ] Rollback migration script ready

### Deployment Steps

1. **Database Migration:**
   - Run `npx prisma migrate deploy` in production
   - Verify migration success: `npx prisma studio` (check User table has role/tier)
   - Run seed script to set ahiya.butman@gmail.com as ADMIN
   - Verify admin user: Query User table, confirm role = 'ADMIN'

2. **Application Deployment:**
   - Deploy Next.js application to production (Vercel/hosting platform)
   - Verify environment variables set correctly
   - Run `npx prisma generate` on server (Prisma client regeneration)

3. **Post-Deployment Verification:**
   - Test admin user can access /admin routes
   - Test non-admin user redirected from /admin
   - Test all navigation links work
   - Test avatar dropdown opens and navigates
   - Test breadcrumbs display on settings/account pages
   - Test systemMetrics query returns data
   - Test userList query with search/filter

4. **Rollback Procedure (If Needed):**
   - Run rollback migration: `npx prisma migrate reset --force` (development only)
   - Restore database from backup (production)
   - Redeploy previous application version
   - Investigate migration failure, fix issues, retry

### Monitoring

**Post-Deployment Monitoring (First 48 Hours):**
- Admin route access attempts (success/failure rates)
- Middleware response times (admin role checks)
- tRPC admin procedure error rates
- User navigation patterns (Settings vs Account usage)
- Any 404 errors (broken links)
- Database query performance (systemMetrics, userList)

**Success Metrics:**
- Admin user can log in and access admin dashboard within 5 minutes of deployment
- Non-admin users experience no disruption (existing features work)
- Zero unauthorized admin access attempts succeed
- Zero database errors related to migration
- All navigation links resolve correctly (zero 404s for new routes)

## Dependencies

### External Dependencies

**None** - This iteration uses existing stack (Next.js, tRPC, Prisma, Supabase, Radix UI)

### Internal Dependencies

- **Prisma Client:** All builders depend on Prisma client generation after schema changes
- **Supabase Auth:** Admin role checking builds on existing Supabase authentication
- **tRPC Infrastructure:** Admin router follows existing router patterns
- **Radix UI Components:** Avatar dropdown uses existing DropdownMenu primitive
- **Existing Navigation:** New navigation extends DashboardSidebar component

### Critical Path

1. Database schema changes (Builder 1)
2. Admin middleware & tRPC infrastructure (Builders 2 & 3)
3. Navigation & route structure (Builder 4)
4. Admin pages & components (Builder 5)

**Blockers:**
- Builder 2 blocked until Builder 1 completes (needs role/tier enums)
- Builder 3 blocked until Builder 1 completes (needs Prisma User model)
- Builder 4 can start independently but needs Builder 2 for tRPC queries
- Builder 5 blocked until Builders 2 & 4 complete (needs admin router + route structure)

## Open Questions (Resolved in Planning)

### Resolved During Exploration

1. **Migration Strategy:** Use `prisma migrate dev` (not `db push`) for production-safe migrations - DECIDED
2. **Active User Definition:** Show both 30d and 90d active users in systemMetrics - DECIDED
3. **Admin Role Caching:** No caching for MVP, accept single DB query overhead - DECIDED
4. **User List Default Sort:** Sort by createdAt DESC (newest users first) - DECIDED
5. **Search Implementation:** Simple `contains` with `mode: 'insensitive'` (good enough for MVP) - DECIDED
6. **Admin Procedure Scope:** Read-only only (metrics + list), no mutations in Iteration 8 - DECIDED
7. **Settings vs Account Split:** Clear semantic separation documented - DECIDED
8. **Currency Page Content:** Display current currency + "Coming Soon" message - DECIDED
9. **Membership Page Content:** Tier badge + "Upgrade to Premium" placeholder - DECIDED
10. **Security Page Content:** DangerZone only, password/2FA placeholders - DECIDED
11. **Preferences Page Content:** Move timezone here + notification placeholders - DECIDED
12. **Data Export Location:** `/settings/data` page (app-level data management) - DECIDED

### To Monitor During Building

- Middleware performance (add logging in development mode)
- TypeScript type errors after Prisma generation
- Navigation clarity (user feedback if possible)
- Admin query performance with realistic data volumes

## Success Metrics

### Functional Metrics

- Admin user can access all admin routes without errors
- Non-admin users correctly redirected from admin routes
- systemMetrics query returns accurate counts (verified against database)
- userList query supports pagination, search, and filtering
- All navigation links resolve correctly (zero 404 errors)
- Breadcrumbs display on all settings/account pages
- Avatar dropdown opens and navigates correctly
- All existing features continue working (regression tests pass)

### Security Metrics

- Zero unauthorized admin access attempts succeed
- Server-side middleware blocks non-admin users (not just client-side)
- Admin procedures throw FORBIDDEN for non-admin users
- No direct database access bypasses authorization
- Clear error messages without revealing system internals

### Performance Metrics

- systemMetrics query completes in <2 seconds
- userList query completes in <1 second (for 100 users)
- Middleware role check adds <50ms latency per request
- Database migration completes in <30 seconds

### Type Safety Metrics

- Zero TypeScript errors after migration
- Admin context types correctly narrowed
- Client autocomplete works for admin procedures
- Prisma Client enums available throughout application

## Post-Iteration Review

### Review Checklist

- [ ] All success criteria met
- [ ] All acceptance criteria met
- [ ] Security audit passed
- [ ] Regression testing passed
- [ ] Performance metrics within targets
- [ ] No critical bugs reported in first 48 hours
- [ ] Documentation updated (if needed)
- [ ] Lessons learned documented

### Handoff to Iteration 9

**Dependencies for Currency Conversion (Iteration 9):**
- `/settings/currency` page structure exists (placeholder ready to replace)
- Settings navigation established (currency link already present)
- User model includes currency field (already exists)
- No blockers from Iteration 8

**Dependencies for Dashboard UX (Iteration 10):**
- User model includes subscriptionTier (established in Iteration 8)
- Account section exists for tier badge display (established in Iteration 8)
- Navigation structure supports visual polish (established in Iteration 8)
- No blockers from Iteration 8

**Knowledge Transfer:**
- Admin infrastructure established (pattern for future admin features)
- Role-based access pattern documented (reusable for premium features)
- Navigation restructure pattern documented (reusable for future sections)

---

**Plan Status:** COMPREHENSIVE
**Confidence Level:** HIGH
**Ready for Building:** YES
**Estimated Success Probability:** 90% (with thorough testing and mitigation strategies)
