# Builder Task Breakdown - Iteration 6

## Overview

This iteration requires **1 primary builder** due to tight coupling between schema, backend, scripts, and UI components. The work is serial (schema → backend → scripts → UI → integration) with limited opportunities for parallelization.

**Total Estimated Time:** 10-12 hours
**Recommended Builder Count:** 1
**Timeline:** 1.5-2 days

---

## Builder-1: Complete Onboarding & User Separation System

### Scope

Build the entire onboarding experience and user separation infrastructure, including:
- Database schema changes (3 new User fields)
- tRPC endpoints for onboarding actions
- Cleanup script for surgical data removal
- Test user creation script
- Enhanced seed script (6 months of data)
- Onboarding wizard UI (7 components)
- Dashboard integration
- Demo mode badge

### Complexity Estimate

**HIGH** (10-12 hours total, but manageable for single builder)

This task is complex due to:
- Multiple interconnected systems (database, API, scripts, UI)
- Safety-critical cleanup operations (data deletion)
- Data generation logic (6 months, 350-400 transactions)
- UX polish required (onboarding tone, design)

However, NOT recommended to split because:
- Serial dependencies (schema → API → UI)
- Testing requires end-to-end ownership
- Integration complexity would increase with multiple builders

### Success Criteria

**Database & Backend:**
- [ ] Prisma schema has 3 new User fields (onboardingCompletedAt, onboardingSkipped, isDemoUser)
- [ ] Migration runs successfully
- [ ] tRPC users router exists with me, completeOnboarding, skipOnboarding endpoints
- [ ] Users router exported from root router

**Scripts:**
- [ ] Cleanup script accepts user ID or email
- [ ] Cleanup script shows data summary and requires "DELETE" confirmation
- [ ] Cleanup script uses transaction for atomic deletion
- [ ] Cleanup script resets onboarding status
- [ ] Test user creation script creates Supabase Auth user
- [ ] Test user creation script creates Prisma user with isDemoUser=true
- [ ] Seed script generates 6 months of data (350-400 transactions)
- [ ] Seed script creates 6 accounts, 72 budgets, 4 goals
- [ ] All scripts have clear error messages and usage instructions

**UI Components:**
- [ ] OnboardingWizard component with 4 steps and state management
- [ ] Step 1 (Welcome) displays philosophy and time estimate
- [ ] Step 2 (Features) displays feature overview
- [ ] Step 3 (Getting Started) offers optional actions
- [ ] Step 4 (Complete) shows completion message
- [ ] OnboardingProgress shows dots (1 of 4, 2 of 4, etc.)
- [ ] OnboardingTrigger checks 3 conditions correctly
- [ ] Skip button works (calls skipOnboarding mutation)
- [ ] Complete button works (calls completeOnboarding mutation)
- [ ] Wizard doesn't show after skip or completion

**Integration:**
- [ ] OnboardingTrigger added to dashboard layout
- [ ] Replay button added to Settings page
- [ ] Demo mode badge shows in sidebar for isDemoUser=true
- [ ] Real user (ahiya) has zero financial data
- [ ] Demo user (test@wealth.com) has 6 months of data
- [ ] Both users can log in without errors

**Testing:**
- [ ] Cleanup script tested on ahiya's duplicate data
- [ ] Test user created successfully (login works)
- [ ] Seed script generates expected data volumes
- [ ] Onboarding shows for new users only
- [ ] Replay works from Settings

### Files to Create

**Components (8 files):**
- `src/components/onboarding/OnboardingWizard.tsx` (~80 lines)
- `src/components/onboarding/OnboardingStep1Welcome.tsx` (~60 lines)
- `src/components/onboarding/OnboardingStep2Features.tsx` (~80 lines)
- `src/components/onboarding/OnboardingStep3Start.tsx` (~60 lines)
- `src/components/onboarding/OnboardingStep4Complete.tsx` (~50 lines)
- `src/components/onboarding/OnboardingProgress.tsx` (~30 lines)
- `src/components/onboarding/OnboardingTrigger.tsx` (~40 lines)
- `src/components/onboarding/types.ts` (~20 lines)

**Backend (1 file):**
- `src/server/api/routers/users.router.ts` (~80 lines)

**Scripts (3 files, 1 enhance):**
- `scripts/cleanup-user-data.ts` (~120 lines) - NEW
- `scripts/create-test-user.ts` (~100 lines) - NEW
- `scripts/seed-demo-data.ts` (~400 lines total) - ENHANCE EXISTING

**Database:**
- `prisma/schema.prisma` - Add 3 fields to User model
- `prisma/migrations/[timestamp]_add_onboarding_user_fields/migration.sql` - Generated

**Config:**
- `package.json` - Add 5 npm scripts

### Files to Modify

**Layout & Pages (3 files):**
- `src/app/(dashboard)/layout.tsx` - Add `<OnboardingTrigger />`
- `src/app/(dashboard)/settings/page.tsx` - Add replay button and wizard
- `src/components/dashboard/DashboardSidebar.tsx` - Add demo badge

**API Root (1 file):**
- `src/server/api/root.ts` - Export users router

### Dependencies

**No dependencies on other builders.**

**Requires:**
- Supabase service role key in environment (SUPABASE_SERVICE_ROLE_KEY)
- Existing category seeds (already in database)
- Existing UI components (Button, Dialog, etc.)

**Blocks:**
- No other builders in this iteration

### Implementation Notes

**Critical Path:**

1. **Schema First (30 min):**
   - Add 3 fields to User model
   - Run migration: `npx prisma migrate dev --name add_onboarding_user_fields`
   - Verify migration applied

2. **Backend Next (1 hour):**
   - Create users.router.ts with 3 endpoints
   - Export from root router
   - Test with tRPC panel or curl

3. **Cleanup Script (2 hours):**
   - Build with safety features (confirmation, dry-run)
   - Test on ahiya's duplicate data (12 accounts, 75 transactions)
   - Validate: ahiya should have 0 accounts, 0 transactions after

4. **Test User Script (1.5 hours):**
   - Create Supabase Admin client
   - Handle "already exists" error
   - Create Prisma user with isDemoUser=true
   - Output user ID for seeding

5. **Enhanced Seed Script (3 hours):**
   - Month-by-month generation loop (6 months)
   - Bi-weekly salary pattern
   - 60-70 expenses per month
   - Calculate account balances from transactions
   - Create budgets for all months
   - Create 4 goals with progress

6. **Onboarding UI (4 hours):**
   - Build all 7 components
   - Follow design mockups from explorer report
   - Use existing Dialog component
   - Wire up tRPC mutations
   - Test step progression

7. **Integration (30 min):**
   - Add OnboardingTrigger to layout
   - Add replay to Settings
   - Add demo badge to sidebar

8. **Testing & Validation (1 hour):**
   - Test complete flow for both users
   - Verify data volumes
   - Check edge cases (skip, replay, refresh)

**Safety First:**

The cleanup script is the highest risk component. Test thoroughly:
1. Build dry-run mode first (show what would be deleted)
2. Test on ahiya's duplicate data (safe because it's already junk data)
3. Use database transaction (all-or-nothing)
4. Require explicit "DELETE" confirmation (not just "yes" or "y")

**Data Quality:**

For seed script, prioritize:
1. **Volume first:** 350-400 transactions (showcases app)
2. **Patterns second:** Bi-weekly salary, monthly rent (realistic)
3. **Sophistication last:** Seasonal variance (nice-to-have)

Don't over-engineer transaction generation. Simple patterns are fine.

**UX Polish:**

For onboarding wizard:
1. Match design system colors (sage, warm-gray, gold)
2. Use Crimson Pro font for affirmations (font-serif)
3. Keep copy concise (don't be preachy)
4. Prominent skip button (don't hide it)
5. Progress indicator (1 of 4, 2 of 4, etc.)

### Patterns to Follow

**From patterns.md:**

- **Prisma Schema Pattern:** Add fields with comments, nullable DateTime, boolean defaults
- **tRPC Router Pattern:** Use publicProcedure for me, protectedProcedure for mutations
- **Component Pattern:** Client components with 'use client', props for handlers
- **Script Pattern:** Validation, confirmation prompts, transaction wrapping
- **Import Order:** React → Next → External → Internal → Components → Types
- **Deletion Order:** Transaction → Budget → Goal → Account → Category (respect foreign keys)

**Key Code Examples:**

See patterns.md for full code examples of:
- OnboardingWizard structure
- Step component layout
- Cleanup script with confirmation
- Seed script month-by-month generation
- tRPC endpoint definitions

### Testing Requirements

**Manual Testing (No Automated Tests):**

**Onboarding Flow:**
1. Create fresh user account (or use ahiya after cleanup)
2. Verify wizard shows on first dashboard visit
3. Test all 4 steps (Next, Back, Skip, Complete)
4. Verify progress indicator updates
5. Verify refresh after skip doesn't show wizard again
6. Verify refresh after complete doesn't show wizard again
7. Verify replay from Settings works

**Cleanup Script:**
1. Run on ahiya user: `npm run cleanup:user ahiya.butman@gmail.com`
2. Verify summary shows correct counts (12 accounts, 75 transactions, etc.)
3. Type "DELETE" and confirm
4. Verify all data deleted (run validation query)
5. Verify user record still exists (not deleted)
6. Verify onboarding status reset

**Test User Script:**
1. Run: `npm run create:test-user`
2. Verify Supabase Auth user created
3. Verify Prisma user created with isDemoUser=true
4. Log in as test@wealth.com / demo1234
5. Verify login works

**Seed Script:**
1. Run: `npm run seed:demo <user-id-from-previous-step>`
2. Verify 6 accounts created
3. Verify 350-400 transactions created
4. Verify 72 budgets created (12 categories × 6 months)
5. Verify 4 goals created
6. Check account balances match transaction sums
7. Verify dashboard loads without errors
8. Verify charts show 6-month trends

**Integration Testing:**
1. Log in as ahiya: empty dashboard, onboarding shows
2. Log in as test@wealth.com: populated dashboard, onboarding doesn't show
3. Verify demo badge shows for test user
4. Verify replay works for both users
5. No console errors for either user

**Validation Queries:**

```bash
# Check ahiya data count (should be 0)
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'ahiya.butman@gmail.com' },
  include: { _count: { select: { accounts: true, transactions: true, budgets: true, goals: true } } }
}).then(console.log).finally(() => prisma.\$disconnect());
"

# Check demo user data count (should be 6, 350-400, 72, 4)
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'test@wealth.com' },
  include: { _count: { select: { accounts: true, transactions: true, budgets: true, goals: true } } }
}).then(console.log).finally(() => prisma.\$disconnect());
"
```

### Potential Split Strategy

**If complexity proves too high (>15 hours), consider splitting:**

**Foundation (Builder 1 keeps):**
- Schema migration
- tRPC endpoints
- Cleanup script
- Test user script
- Basic seed script (1 month, existing logic)

**Sub-builder 1A: Enhanced Seed Script (3 hours):**
- Scope: Enhance seed-demo-data.ts for 6 months
- Files: `scripts/seed-demo-data.ts` (modify existing)
- Depends on: Foundation (user must exist)
- Estimate: MEDIUM complexity, 3 hours

**Sub-builder 1B: Onboarding UI (4 hours):**
- Scope: All 7 onboarding components + integration
- Files: 8 component files, 3 integration points
- Depends on: Foundation (tRPC endpoints must exist)
- Estimate: MEDIUM complexity, 4 hours

**Integration After Split:**
- Builder 1 integrates 1A and 1B outputs
- Test complete flow
- Estimate: 30 minutes

**Total if split:** 10 hours (foundation) + 3 hours (1A) + 4 hours (1B) + 0.5 hours (integration) = 17.5 hours

**Recommendation:** Try as single builder first. Only split if estimated time exceeds 15 hours during implementation.

### Environment Setup

**Before starting, ensure:**

1. **Supabase is running:**
   ```bash
   supabase start
   # Note the service_role key from output
   ```

2. **Environment variables set (.env.local):**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start-output>
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-start-output>
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```

3. **Dependencies installed:**
   ```bash
   npm install
   # All required packages already in package.json
   ```

4. **Database seeded with categories:**
   ```bash
   npm run db:seed
   # Ensures default categories exist
   ```

### Time Breakdown

| Task | Estimated Time | Complexity |
|------|----------------|------------|
| Prisma schema + migration | 30 min | LOW |
| tRPC users router | 1 hour | LOW |
| Cleanup script | 2 hours | MEDIUM |
| Test user script | 1.5 hours | MEDIUM |
| Enhanced seed script | 3 hours | HIGH |
| Onboarding UI (7 components) | 4 hours | MEDIUM-HIGH |
| Integration (layout, settings, sidebar) | 30 min | LOW |
| Testing & validation | 1 hour | MEDIUM |
| **Total** | **13.5 hours** | **HIGH** |
| **Buffer** | **1.5 hours** | |
| **Estimated Range** | **10-15 hours** | |

### Known Challenges

**Challenge 1: Ahiya has 12 duplicate accounts**
- Current state: 3x duplicates of each account
- Solution: Cleanup script must handle bulk deletion
- Risk: Accidentally deleting wrong user
- Mitigation: Confirmation prompt, show summary first

**Challenge 2: Date math for 6 months**
- Complex: Month boundaries, leap years, timezones
- Solution: Use date-fns library (reliable, tested)
- Pattern: `subMonths(startOfMonth(new Date()), monthOffset)`

**Challenge 3: Service role key availability**
- May not have access to service role key
- Fallback: Create test user manually in Supabase Studio
- Document: Clear instructions for manual creation

**Challenge 4: Onboarding trigger timing**
- Must not show after skip or complete
- Must handle refresh correctly
- Solution: Triple-check condition, test thoroughly

**Challenge 5: Account balance calculation**
- Must match transaction sums
- Solution: Calculate from transactions, don't guess
- Pattern: `initialBalance + sum(transactions.amount)`

### Success Metrics

**Quantitative:**
- Real user: 0 accounts, 0 transactions, 0 budgets, 0 goals
- Demo user: 6 accounts, 350-400 transactions, 72 budgets, 4 goals
- Onboarding completion rate: 100% (for testing, both users complete or skip)
- Dashboard load time: < 2s for demo user (with 400 transactions)
- Script execution time: < 30s for seed, < 10s for cleanup

**Qualitative:**
- Onboarding feels welcoming, not overwhelming
- Copy matches "conscious money" tone
- Demo data looks realistic (not obviously fake)
- Error messages are helpful (not cryptic)
- Scripts provide clear feedback (progress indicators)

### Handoff Artifacts

**After completion, provide:**

1. **Migration file:** `prisma/migrations/[timestamp]_add_onboarding_user_fields/migration.sql`
2. **Component files:** All 8 onboarding components
3. **Script files:** cleanup-user-data.ts, create-test-user.ts, enhanced seed-demo-data.ts
4. **Usage instructions:** How to run scripts (npm run commands)
5. **Test user credentials:** Email: test@wealth.com, Password: demo1234
6. **Validation results:** Screenshots or console output showing data counts
7. **Known issues:** Any edge cases or bugs discovered during testing

### Notes for Integration Agent

**After builder completes:**

- Verify migrations applied: `npx prisma migrate status`
- Run cleanup on ahiya: `npm run cleanup:user ahiya.butman@gmail.com`
- Create test user: `npm run create:test-user`
- Seed demo data: `npm run seed:demo <user-id-from-output>`
- Test login for both users
- Verify onboarding shows correctly
- Check demo badge displays

**No merge conflicts expected** (all new files except 4 integration points).

---

## Builder Execution Order

### Single Builder Timeline

**Day 1 (6-8 hours):**
- Morning: Schema + Backend + Cleanup script
- Afternoon: Test user script + Start enhanced seed script

**Day 2 (4-6 hours):**
- Morning: Finish seed script + Test scripts
- Afternoon: Onboarding UI + Integration + Testing

**Total: 10-14 hours over 1.5-2 days**

### No Parallel Work

All work is serial due to dependencies:
- Scripts need schema changes
- UI needs tRPC endpoints
- Testing needs all components working together

### Integration Notes

**Potential conflict areas:** None (single builder owns all files)

**Shared files requiring coordination:** None (no collaboration needed)

**Testing coordination:** Builder tests own work end-to-end

### Final Validation

Before marking iteration complete, builder must verify:

1. **Database state:**
   - ahiya.butman@gmail.com: clean slate (0 financial data)
   - test@wealth.com: rich data (6 accounts, 350-400 transactions, 72 budgets, 4 goals)
   - Both users have correct onboarding flags

2. **Onboarding flow:**
   - Shows for new users
   - Doesn't show after skip or complete
   - Replay works from Settings
   - All 4 steps display correctly
   - Mutations work (completeOnboarding, skipOnboarding)

3. **Scripts:**
   - All 3 scripts run without errors
   - Clear error messages for invalid inputs
   - Confirmation prompts work
   - Data validation output at end

4. **UI:**
   - Demo badge shows for test user
   - Dashboard loads without errors for both users
   - Charts display 6-month trends for demo user
   - No console errors

5. **Documentation:**
   - Usage instructions in script comments
   - Environment variable setup documented
   - Test credentials recorded

**Completion checklist:**
- [ ] All success criteria met (from top of task)
- [ ] Manual testing completed
- [ ] Validation queries run
- [ ] Both users tested in browser
- [ ] No critical bugs found
- [ ] Handoff artifacts prepared
