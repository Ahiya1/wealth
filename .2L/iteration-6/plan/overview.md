# 2L Iteration Plan - Wealth Iteration 6: Onboarding Experience & User Separation

## Project Vision

Transform the first-time user experience from "empty and confusing" to "welcoming and guided" while establishing clear separation between real financial tracking (ahiya.butman@gmail.com) and demonstration purposes (test@wealth.com). This iteration embodies the "conscious money" philosophy by providing a calm, optional onboarding journey that introduces users to the app's values and features.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] New users see 4-step onboarding wizard on first dashboard visit
- [ ] Onboarding can be skipped without friction (prominent skip button)
- [ ] Onboarding can be replayed from Settings page
- [ ] Real user (ahiya.butman@gmail.com) has zero financial data (clean slate)
- [ ] Demo user (test@wealth.com) exists with 6 months of realistic data
- [ ] Demo user has 350-400 transactions across 6 accounts
- [ ] Demo user has 72 budget records (12 categories × 6 months)
- [ ] Demo user has 4 goals with visible progress
- [ ] Demo user shows "Demo Mode" badge in sidebar
- [ ] Onboarding completion status tracked in database
- [ ] All scripts run successfully with clear error messages
- [ ] Dashboard loads without errors for both users

## MVP Scope

**In Scope:**

- 4-step onboarding wizard (Welcome → Features → Getting Started → Completion)
- User onboarding status tracking (3 new database fields)
- Cleanup script for surgical data removal
- Test user creation script (Supabase Auth + Prisma)
- Enhanced seed script generating 6 months of realistic data
- Demo mode UI indicator (badge in sidebar)
- Replay onboarding feature in Settings
- Safety features (confirmation prompts, dry-run mode)

**Out of Scope (Post-MVP):**

- Interactive product tours (tooltips on live UI)
- Personalized onboarding paths based on user type
- Video tutorials or animated explanations
- Analytics tracking on onboarding completion rates
- A/B testing different onboarding flows
- Multi-language onboarding content
- AI-generated transaction data
- Onboarding versioning/migration system

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 10-12 hours (single builder)
4. **Integration** ⏳ 30 minutes
5. **Validation** ⏳ 1 hour
6. **Deployment** ⏳ Final

## Timeline Estimate

- Exploration: Complete (2 explorer reports)
- Planning: Complete (this document)
- Building: 10-12 hours (single builder, serial tasks)
  - Schema migration: 30 minutes
  - tRPC endpoints: 1 hour
  - Onboarding UI: 4 hours
  - Cleanup script: 2 hours
  - Test user script: 1.5 hours
  - Enhanced seed script: 3 hours
  - Integration: 30 minutes
- Validation: 1 hour (manual testing)
- Total: ~13 hours (1.5-2 days)

## Risk Assessment

### High Risks

**Risk:** Cleanup script deletes wrong user's data
- **Impact:** Catastrophic data loss
- **Mitigation:**
  - Require explicit "DELETE" confirmation
  - Show data summary before deletion
  - Implement dry-run mode
  - Use database transactions (all-or-nothing)
  - Test thoroughly on duplicate data first

**Risk:** Seed script creates duplicate accounts
- **Impact:** Demo user has messy data like current ahiya user
- **Mitigation:**
  - Check if user has existing data, warn before seeding
  - Provide cleanup-then-seed workflow
  - Use upsert patterns where appropriate
  - Validate data counts after seeding

### Medium Risks

**Risk:** Onboarding wizard shows at wrong times (after skip/completion)
- **Impact:** Annoying user experience, loss of trust
- **Mitigation:**
  - Triple-condition check: !completed && !skipped && !demoUser
  - Test refresh behavior after each action
  - Use React Query cache invalidation correctly

**Risk:** Date math errors in 6-month seed data
- **Impact:** Transactions outside expected ranges, broken analytics
- **Mitigation:**
  - Use date-fns library (reliable, well-tested)
  - Test edge cases (month boundaries, leap years)
  - Validate transaction date ranges after seeding

**Risk:** Supabase service role key not available
- **Impact:** Cannot create test user programmatically
- **Mitigation:**
  - Document service key setup clearly
  - Provide fallback: manual user creation in Supabase Studio
  - Test on local Supabase instance first

### Low Risks

**Risk:** Wizard UX feels too long or preachy
- **Impact:** Users skip immediately, miss value proposition
- **Mitigation:**
  - Keep to 4 steps max (design constraint)
  - Lead with philosophy but balance with visuals
  - Time estimate on step 1 (2 minutes)
  - Skip button always visible

## Integration Strategy

### Single Builder, Serial Workflow

This iteration is best suited for one builder due to tight coupling:

1. **Schema First:** Add 3 fields to User model (onboardingCompletedAt, onboardingSkipped, isDemoUser)
2. **Backend Next:** Create tRPC endpoints for onboarding mutations
3. **Scripts Development:** Build and test all 3 scripts (cleanup, create-test-user, seed-demo-data)
4. **UI Implementation:** Onboarding wizard components (7 files)
5. **Integration:** Connect wizard to dashboard layout and settings
6. **Validation:** Test complete flow for both users

### No Parallel Work Opportunities

- Scripts depend on schema changes
- UI depends on tRPC endpoints
- Testing depends on scripts working
- Serial dependency chain prevents splitting

### Integration Points

**Dashboard Layout ↔ Onboarding Trigger:**
- Layout renders OnboardingTrigger as child component
- Server component passes user data to client trigger
- Trigger checks onboarding status and opens wizard

**Wizard ↔ tRPC Mutations:**
- Complete button calls `users.completeOnboarding` mutation
- Skip button calls `users.skipOnboarding` mutation
- Mutations update database and invalidate user query cache

**Settings ↔ Replay Feature:**
- Replay button triggers same OnboardingWizard component
- Local state controls dialog open/close
- No special logic needed (wizard is stateless)

## Deployment Plan

### Pre-Deployment Checklist

1. Run Prisma migration: `npx prisma migrate deploy`
2. Verify migration applied successfully
3. Create demo user: `npm run create:test-user`
4. Seed demo data: `npm run seed:demo <user-id>`
5. Clean real user data: `npm run cleanup:user ahiya.butman@gmail.com`
6. Test both users can log in and see correct state

### Deployment Steps

1. **Database Migration:**
   ```bash
   npx prisma migrate deploy
   # Adds onboardingCompletedAt, onboardingSkipped, isDemoUser fields
   ```

2. **Grandfather Existing Users:**
   ```sql
   UPDATE "User"
   SET "onboardingCompletedAt" = "createdAt"
   WHERE "createdAt" < NOW();
   ```
   This prevents existing users from seeing onboarding (better UX).

3. **Create Demo User (Local/Dev):**
   ```bash
   npm run create:test-user
   # Returns user ID, save for next step
   ```

4. **Seed Demo Data:**
   ```bash
   npm run seed:demo <user-id-from-previous-step>
   # Generates 6 months of data
   ```

5. **Clean Real User:**
   ```bash
   npm run cleanup:user ahiya.butman@gmail.com
   # Type "DELETE" to confirm
   ```

6. **Verify Deployment:**
   - Real user: Dashboard empty, onboarding shows on login
   - Demo user: Dashboard populated, onboarding doesn't show
   - Replay works from Settings for both users

### Rollback Plan

If issues arise:

1. **Rollback Migration:**
   ```bash
   npx prisma migrate reset
   # WARNING: Destructive, only for dev
   ```

2. **Manual Data Cleanup:**
   - Use Prisma Studio to delete test user and data
   - Re-run previous seed scripts if needed

3. **Code Rollback:**
   - Remove OnboardingTrigger from dashboard layout
   - Hide replay button in Settings
   - Database fields remain (no harm, just unused)

### Environment Variables Required

```bash
# .env.local (for local development)
SUPABASE_SERVICE_ROLE_KEY=<get-from-supabase-status-or-dashboard>
```

### Post-Deployment Validation

Manual testing checklist:
- [ ] New user sees onboarding (create fresh account to test)
- [ ] Skip works (onboardingSkipped = true)
- [ ] Complete works (onboardingCompletedAt set)
- [ ] Replay works from Settings
- [ ] Demo badge shows for test@wealth.com
- [ ] Analytics charts show 6-month trends for demo user
- [ ] Real user has empty dashboard
- [ ] No console errors on either user's dashboard

## Notes for Builder

### Critical Success Factors

1. **Safety First:** Cleanup script must be bulletproof (confirmation, dry-run, transactions)
2. **Data Quality:** Demo data should tell a story (consistent patterns, realistic variance)
3. **UX Polish:** Onboarding should feel welcoming, not overwhelming (tone, spacing, timing)
4. **Testing Rigor:** Test on real duplicate data (ahiya's current state) before cleaning

### Known Challenges

- Ahiya user currently has 12 duplicate accounts (3x each of 4 accounts)
- Need Supabase service role key for test user creation
- Date math for 6-month data generation requires care
- Foreign key deletion order must be respected

### Resources Available

- Explorer 1 Report: Detailed onboarding architecture and UI mockups
- Explorer 2 Report: Data management strategy and script designs
- Existing seed script: `/scripts/seed-demo-data.ts` (enhance, don't replace)
- Existing dialog component: `/src/components/ui/dialog.tsx` (reuse)
- Existing affirmation content: `/src/components/ui/affirmation-card.tsx` (inspiration)

### Time Optimization Tips

- Reuse existing Dialog component (don't build custom modal)
- Copy-paste seed patterns from existing script (enhance incrementally)
- Test cleanup script on ahiya's duplicates (real validation)
- Use date-fns for date math (don't reinvent)
- Start with simple transaction patterns, add sophistication if time permits
