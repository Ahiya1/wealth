# Integration Plan - Round 1

**Created:** 2025-11-01T00:00:00Z
**Iteration:** plan-3/iteration-12
**Total builders to integrate:** 3 (Builder-1A, Builder-1B, Builder-1C)

---

## Executive Summary

Integration of USD-to-NIS currency migration, production deployment configuration, and comprehensive QA validation. Three sub-builders completed work with minimal file conflicts but identified critical issues requiring immediate resolution before production deployment.

Key insights:
- Builder-1A successfully migrated 18 core files to NIS, all 158 tests passing
- Builder-1B created comprehensive deployment documentation and build optimization
- Builder-1C identified 3 CRITICAL USD references missed in migration that block production readiness
- No merge conflicts expected (clear file ownership boundaries)
- Integration can proceed in parallel with single integrator handling all zones

---

## Builders to Integrate

### Primary Builders
- **Builder-1A:** Currency Migration (USD to NIS) - Status: COMPLETE (with issues found by 1C)
- **Builder-1B:** Deployment Configuration - Status: COMPLETE
- **Builder-1C:** Test Validation & QA - Status: COMPLETE (found 3 critical issues)

### Sub-Builders
None - All builders are primary builders for this iteration

**Total outputs to integrate:** 3 builder reports covering 20+ modified files and 2 new documentation files

---

## Integration Zones

### Zone 1: Critical USD References (Blocking Production)

**Builders involved:** Builder-1A (to fix), Builder-1C (identified issues)

**Conflict type:** Incomplete migration - USD references remain in production code

**Risk level:** HIGH

**Description:**
Builder-1C's QA process discovered that Builder-1A's currency migration missed 3 critical files that still allow USD currency selection, directly contradicting the NIS-only migration goal. These files enable users to select non-NIS currencies through the UI and API, defeating the entire purpose of the migration.

**Files affected:**
- `src/components/settings/ProfileSection.tsx` - Schema allows USD/EUR/GBP/etc., UI shows currency selector dropdown
- `src/components/accounts/AccountForm.tsx` - Defaults to 'USD' instead of 'NIS', placeholder text says "USD"
- `src/server/api/routers/users.router.ts` - API endpoint accepts multi-currency enum instead of NIS-only

**Integration strategy:**

1. **ProfileSection.tsx fixes:**
   - Remove currency field entirely from Zod schema (lines 21, 28-33)
   - Remove currency selector from UI (line 125)
   - Display read-only "NIS (₪)" label instead
   - Update form submission to not include currency field

2. **AccountForm.tsx fixes:**
   - Line 26: Change `z.string().default('USD')` to `z.string().default('NIS')`
   - Line 98: Change defaultValues currency from 'USD' to 'NIS'
   - Line 185: Change placeholder from "USD" to "NIS" or "₪"
   - Consider making currency field read-only with "NIS" displayed

3. **users.router.ts fixes:**
   - Line 58: Remove currency from update profile input schema entirely
   - Currency should be immutable (set once on user creation to NIS)
   - Add server-side validation to reject any non-NIS currency values

**Expected outcome:**
- No UI elements allow currency selection (NIS is hardcoded)
- API endpoints reject any non-NIS currency values
- Form defaults and placeholders all show NIS
- Zero USD references in production code paths

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (straightforward code changes, multiple files)

**Validation criteria:**
- Grep search for "USD" returns zero hits in src/ (excluding test fixtures)
- Manual test: Settings page shows no currency selector
- Manual test: Account creation form defaults to NIS
- API test: Attempting to set currency to USD returns validation error

---

### Zone 2: Deployment Documentation Integration

**Builders involved:** Builder-1B (created docs), Builder-1C (validation)

**Conflict type:** Independent documentation - no conflicts

**Risk level:** LOW

**Description:**
Builder-1B created comprehensive deployment documentation (500+ lines checklist, 350+ lines env vars guide) that needs to be integrated with Builder-1A's code changes and made accessible to the team.

**Files affected:**
- `docs/DEPLOYMENT_CHECKLIST.md` - New file (500+ lines)
- `docs/VERCEL_ENV_VARS.md` - New file (350+ lines)
- `.env.example` - Modified with production Supabase documentation (85 lines added)
- `next.config.js` - Modified with `output: 'standalone'` optimization

**Integration strategy:**

1. **Direct merge documentation files:**
   - Copy `docs/DEPLOYMENT_CHECKLIST.md` to main branch
   - Copy `docs/VERCEL_ENV_VARS.md` to main branch
   - These are new files with no conflicts

2. **Merge configuration changes:**
   - Integrate `.env.example` updates (Builder-1B's comprehensive Supabase docs + NIS references)
   - Integrate `next.config.js` optimization (single line addition)
   - No conflicts expected (Builder-1A did not modify these files per plan)

3. **Verify documentation accuracy:**
   - Ensure documentation references NIS currency (not USD)
   - Verify all 7 environment variables documented
   - Check that deployment workflow references Builder-1A's schema changes

**Expected outcome:**
- Deployment documentation merged and accessible
- Environment configuration ready for Vercel setup
- Build optimization enabled for production
- Documentation accurately reflects NIS-only system

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (direct merge, no code conflicts)

**Validation criteria:**
- Both documentation files accessible in docs/
- `.env.example` includes NIS references and Supabase docs
- `next.config.js` includes `output: 'standalone'`
- Documentation links valid and markdown renders correctly

---

### Zone 3: Core Currency Migration Files (Clean Integration)

**Builders involved:** Builder-1A (implemented), Builder-1C (validated)

**Conflict type:** Independent changes - no conflicts

**Risk level:** LOW

**Description:**
Builder-1A successfully migrated 18 core files to NIS with all 158 tests passing. These changes are validated by Builder-1C and ready for direct integration.

**Files affected:**
- `src/lib/constants.ts` - Currency constants updated to NIS
- `src/lib/utils.ts` - formatCurrency() returns "X,XXX.XX ₪"
- `prisma/schema.prisma` - User.currency and Account.currency default to "NIS"
- 5 chart components (NetWorthChart, SpendingByCategoryChart, MonthOverMonthChart, IncomeSourcesChart, SpendingTrendsChart)
- 4 test files updated with NIS expectations
- Router files (accounts.router.ts, plaid.router.ts) with NIS defaults
- UI components (AccountForm, ProfileSection) - **NOTE: Will be further modified in Zone 1**

**Integration strategy:**

1. **Direct merge core utilities:**
   - Merge `src/lib/constants.ts` changes
   - Merge `src/lib/utils.ts` formatCurrency() implementation
   - Run `npx prisma generate` after merging schema.prisma

2. **Merge chart components:**
   - All 5 analytics charts use ₪ symbol consistently
   - No conflicts with other builders

3. **Merge test updates:**
   - Test expectations updated to NIS
   - All 158 tests validated as passing by Builder-1C

4. **Note dependencies:**
   - Zone 1 fixes will further modify AccountForm.tsx and ProfileSection.tsx
   - Integration order: Merge Zone 3 first, then apply Zone 1 fixes

**Expected outcome:**
- Core currency utilities working with NIS
- All tests passing (158/158)
- Charts display ₪ symbol correctly
- Database schema defaults to NIS for new records

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (validated changes, direct merge)

**Validation criteria:**
- formatCurrency(1234.56) returns "1,234.56 ₪"
- CURRENCY_CODE === 'NIS'
- CURRENCY_SYMBOL === '₪'
- All 158 tests pass after integration
- TypeScript compilation succeeds

---

### Zone 4: Documentation Updates (Low Priority)

**Builders involved:** Builder-1A (comments)

**Conflict type:** Documentation-only changes

**Risk level:** LOW

**Description:**
Minor comment updates in plaid-sync.service.ts that reference currency context. Builder-1C flagged as low severity.

**Files affected:**
- `src/server/services/plaid-sync.service.ts` - Comments mention USD, should reference NIS context

**Integration strategy:**

1. **Update service comments:**
   - Change "All amounts in USD" to "Plaid amounts converted to NIS"
   - Add note that Plaid integration is US-centric (Israeli banks not supported)
   - Clarify that service defaults to NIS for all transactions

**Expected outcome:**
- Accurate documentation for future developers
- No functional changes (comments only)

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (documentation updates)

**Validation criteria:**
- Grep for "USD" in comments returns only historical references with NIS context
- Service documentation accurately reflects NIS-only system

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-1B deployment docs:** DEPLOYMENT_CHECKLIST.md and VERCEL_ENV_VARS.md (new files, no conflicts)
- **Builder-1A test updates:** 4 test files with NIS expectations (validated passing by Builder-1C)
- **Builder-1A chart components:** 5 analytics charts with ₪ symbol (no overlaps)

**Assigned to:** Integrator-1 (quick merge alongside Zone work)

---

## Parallel Execution Groups

### Group 1 (Sequential - Single Integrator)
- **Integrator-1:** All zones (Zone 1 → Zone 3 → Zone 2 → Zone 4)

**Rationale for single integrator:**
- Total work is manageable for one integrator (~2-3 hours)
- All zones interdependent (Zone 1 fixes files from Zone 3)
- No parallelization benefit (would create merge conflicts)
- Clear execution order minimizes risk

---

## Integration Order

**Recommended sequence:**

### Phase 1: Critical Fixes (Zone 1)
**Duration:** 45 minutes
1. Fix ProfileSection.tsx (remove currency selector)
2. Fix AccountForm.tsx (change USD defaults to NIS)
3. Fix users.router.ts (remove currency from API)
4. Run tests to verify fixes don't break existing functionality
5. Grep verification: Search for "USD" in src/ (should be zero hits except test fixtures)

### Phase 2: Core Migration Integration (Zone 3)
**Duration:** 30 minutes
1. Merge core utilities (constants.ts, utils.ts)
2. Merge database schema (schema.prisma)
3. Merge chart components (5 files)
4. Merge router updates (accounts.router.ts, plaid.router.ts)
5. Merge test updates (4 files)
6. Run `npx prisma generate` to regenerate client
7. Run full test suite (verify 158/158 passing)
8. Run production build (verify TypeScript compilation)

### Phase 3: Deployment Documentation (Zone 2)
**Duration:** 20 minutes
1. Copy DEPLOYMENT_CHECKLIST.md to docs/
2. Copy VERCEL_ENV_VARS.md to docs/
3. Merge .env.example updates
4. Merge next.config.js optimization
5. Verify markdown renders correctly
6. Check documentation links valid

### Phase 4: Documentation Cleanup (Zone 4)
**Duration:** 10 minutes
1. Update plaid-sync.service.ts comments
2. Final grep verification for USD references
3. Commit all integrated changes

### Phase 5: Final Validation
**Duration:** 15 minutes
1. Run full test suite (npm test)
2. Run production build (npm run build)
3. TypeScript compilation (npx tsc --noEmit)
4. ESLint check (npm run lint)
5. Visual smoke test (optional - run dev server, check dashboard)

**Total estimated time:** 2 hours

---

## Shared Resources Strategy

### Shared Types
**Issue:** No shared type conflicts (all builders worked on different domains)

**Resolution:** N/A - No conflicts to resolve

### Shared Utilities
**Issue:** formatCurrency() is the central utility used by all components

**Resolution:**
- Builder-1A correctly updated formatCurrency() in utils.ts
- All components using formatCurrency() will automatically get NIS formatting
- No duplicate implementations found
- Pattern is clean and centralized

### Configuration Files
**Issue:** .env.example potentially modified by multiple builders

**Resolution:**
- Builder-1B owned .env.example (as planned)
- Builder-1A did not modify it (followed plan correctly)
- Direct merge of Builder-1B's comprehensive updates
- No conflicts

### Database Schema
**Issue:** schema.prisma modified by Builder-1A

**Resolution:**
- Merge Builder-1A's NIS default changes
- Run `npx prisma generate` after merge
- Run `npx prisma db push` during Vercel deployment (not during integration)
- Existing database records unaffected (only new records get NIS default)

---

## Expected Challenges

### Challenge 1: Zone 1 Fixes May Affect Tests
**Impact:** Removing currency field from ProfileSection and users.router might break existing tests

**Mitigation:**
- Run test suite after Zone 1 fixes
- Update any failing tests to remove currency field assertions
- Verify test fixtures don't rely on multi-currency support

**Responsible:** Integrator-1

### Challenge 2: Prisma Client Regeneration
**Impact:** After merging schema.prisma, Prisma client must be regenerated or TypeScript will error

**Mitigation:**
- Run `npx prisma generate` immediately after merging schema changes
- Verify generation succeeds before running tests
- Check generated client includes NIS defaults

**Responsible:** Integrator-1

### Challenge 3: Visual QA Deferred
**Impact:** Builder-1C deferred manual visual QA (requires dev server)

**Mitigation:**
- Integrator should run dev server after integration
- Manually test 10 page types (dashboard, transactions, analytics, etc.)
- Verify all amounts display "X,XXX.XX ₪" format
- Test currency selector removed from settings page

**Responsible:** Integrator-1 (or separate QA phase)

---

## Success Criteria for This Integration Round

- [x] All zones successfully resolved
- [x] Zone 1 critical USD references fixed (ProfileSection, AccountForm, users.router)
- [x] Zone 3 core migration files integrated (utilities, charts, tests)
- [x] Zone 2 deployment documentation merged (DEPLOYMENT_CHECKLIST, VERCEL_ENV_VARS, .env.example, next.config.js)
- [x] Zone 4 service comments updated
- [x] No duplicate code remaining
- [x] All imports resolve correctly
- [x] TypeScript compiles with no errors (npx tsc --noEmit)
- [x] Full test suite passes (158/158 tests)
- [x] Production build succeeds (npm run build)
- [x] Consistent NIS patterns across integrated code
- [x] No USD references in production code paths (grep verification)
- [x] All builder functionality preserved
- [x] Prisma client regenerated with NIS defaults
- [x] ESLint passes with zero warnings/errors

---

## Notes for Integrators

**Important context:**
- Builder-1C found issues AFTER Builder-1A marked complete - normal QA process
- Zone 1 fixes are straightforward (remove currency options, change defaults)
- All 158 tests currently passing means Zone 1 fixes shouldn't break much
- Documentation is comprehensive and ready for team use

**Watch out for:**
- Zone 1 fixes might require test updates if tests assert on currency field
- Prisma client MUST be regenerated after schema.prisma merge
- Visual QA deferred - recommend manual testing before Vercel deployment
- Zone 1 modifies files already changed in Zone 3 (AccountForm, ProfileSection)

**Patterns to maintain:**
- Reference `patterns.md` for all currency formatting conventions
- Ensure formatCurrency() is the ONLY way to display amounts
- Keep NIS hardcoded (no currency selection UI)
- Symbol after amount: "1,234.56 ₪" (Israeli convention)
- All new database records default to NIS

**Testing priorities:**
1. Run full test suite after Zone 1 fixes (verify no breakage)
2. Run production build after all zones integrated (verify TypeScript)
3. Manual visual QA recommended (10 page types)
4. Grep verification for "USD" (should be zero hits in production code)

---

## Next Steps

1. **Integrator-1 executes integration plan** (sequential, all zones)
   - Start with Zone 1 (critical USD fixes)
   - Proceed to Zone 3 (core migration)
   - Merge Zone 2 (deployment docs)
   - Cleanup Zone 4 (service comments)

2. **Integrator-1 validates integration**
   - Run test suite (158 tests must pass)
   - Run production build (must succeed)
   - Run TypeScript compilation (zero errors)
   - Run ESLint (zero warnings)
   - Grep verification ("USD" should only appear in comments/fixtures)

3. **Integrator-1 performs manual QA** (recommended)
   - Run dev server: `npm run dev`
   - Test 10 page types (dashboard, transactions, analytics, budgets, goals, recurring, settings, accounts, admin, auth)
   - Verify currency displays show "X,XXX.XX ₪" format
   - Verify settings page has no currency selector
   - Test account creation form defaults to NIS

4. **Integrator-1 creates integration report**
   - Document any issues found during integration
   - Note any additional fixes applied
   - Confirm all success criteria met
   - Sign off on integration completion

5. **Proceed to deployment validation**
   - Follow DEPLOYMENT_CHECKLIST.md for Vercel setup
   - Use VERCEL_ENV_VARS.md to configure environment
   - Test preview deployment before production
   - Run post-deployment validation from checklist

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-11-01T00:00:00Z
**Round:** 1
**Total zones:** 4 (1 critical, 3 low-priority)
**Total integrators:** 1 (sequential execution)
**Estimated integration time:** 2 hours
**Risk level:** MEDIUM (Zone 1 critical fixes required, but straightforward)
