# 2L Iteration Plan - Wealth Currency Migration & Production Deployment

## Project Vision
Transform the Wealth app from USD to NIS currency and deploy to production on Vercel with Supabase backend. This iteration establishes the foundation for a production-ready, NIS-native personal finance tracker accessible from anywhere with secure authentication and automatic GitHub deployments.

## Success Criteria
Specific, measurable criteria for MVP completion:
- [ ] All currency displays show "X,XXX.XX ₪" format (symbol after amount, not before)
- [ ] Production deployment accessible via Vercel URL with HTTPS
- [ ] All CRUD operations work against production Supabase database
- [ ] GitHub push to main triggers automatic Vercel deployment within 2-3 minutes
- [ ] Build succeeds on Vercel (no TypeScript, lint, or build errors)
- [ ] Dashboard, Transactions, Analytics, Budgets, Goals, Settings all render with NIS
- [ ] Test transaction created successfully in production shows ₪ symbol
- [ ] CSV/JSON exports include NIS currency metadata
- [ ] Cron job for recurring transactions executes successfully (manual verification)
- [ ] Full test suite passes (`npm test` - zero failures)

## MVP Scope
**In Scope:**
- Complete USD to NIS currency migration (71+ files, 172 occurrences)
- Update formatCurrency() utility to use NIS formatting
- Update all chart components with ₪ symbol in axes and tooltips
- Update database schema defaults (User.currency, Account.currency)
- Production Supabase configuration (schema push, RLS verification)
- GitHub integration (push to main triggers automatic Vercel deployment)
- Vercel production deployment (7 environment variables, build optimization)
- Environment configuration (.env.example updated, secrets documented)
- Test suite updates (expected currency values changed to NIS)
- Visual QA across 10 page types (dashboard, transactions, analytics, etc.)

**Out of Scope (Deferred to Iteration 2):**
- Email verification with custom branded templates
- Admin user creation (ahiya.butman@gmail.com / wealth_generator)
- Email rendering testing across Gmail, Outlook, Apple Mail
- Production smoke testing via email verification flow

## Development Phases
1. **Exploration** ✅ Complete (3 explorer reports synthesized)
2. **Planning** 🔄 Current (creating comprehensive plan)
3. **Building** ⏳ 7-10 hours (3 parallel sub-builders)
4. **Integration** ⏳ Automatic (sub-builders coordinate via clear boundaries)
5. **Validation** ⏳ 2-3 hours (manual QA, smoke testing)
6. **Deployment** ⏳ Final (push to main, verify production)

## Timeline Estimate
- Exploration: Complete (3 comprehensive reports)
- Planning: Complete (this document)
- Building: 7-10 hours total
  - Sub-builder 1-A (Currency Migration): 3-4 hours
  - Sub-builder 1-B (Deployment Configuration): 2-3 hours
  - Sub-builder 1-C (Test Validation & QA): 2-3 hours
  - Note: Sub-builders 1-A and 1-B run in parallel
- Integration: Automatic (clear file boundaries, no merge conflicts expected)
- Validation: 30 minutes (visual QA checklist, smoke tests)
- Total: ~10-13 hours

## Risk Assessment

### High Risks
- **Currency display inconsistency (MEDIUM likelihood, HIGH impact)**: Chart tooltips have inline $ formatting that bypasses formatCurrency(). Mitigation: Systematic grep search for all $ symbols, update 5 chart components explicitly, visual QA on all analytics pages.
- **Environment variable misconfiguration (HIGH likelihood, CRITICAL impact)**: 7 complex variables with connection strings, easy to typo. Mitigation: Pre-flight checklist, Vercel preview deployment testing, copy-paste from Supabase dashboard (no manual typing).
- **Database connection pool exhaustion (LOW likelihood, MEDIUM impact)**: Free tier allows 60 connections, serverless can exhaust this. Mitigation: Use pooled connection string (?pgbouncer=true), monitor connection count, configure connection_limit=1.

### Medium Risks
- **Test suite failures (MEDIUM likelihood, MEDIUM impact)**: 57 test files may have hardcoded USD expected values. Mitigation: Update test assertions systematically, run full test suite before and after migration.
- **Build timeout on Vercel (LOW likelihood, MEDIUM impact)**: Free tier allows 45-second builds. Mitigation: Add output: 'standalone' to next.config.js, verify build time locally (~2 minutes currently, plenty of headroom).

## Integration Strategy
**Sub-builder Coordination:**
- Sub-builder 1-A (Currency Migration) and Sub-builder 1-B (Deployment Configuration) work in parallel - no file conflicts
- Sub-builder 1-C (Test Validation) waits for 1-A and 1-B to complete
- Clear file ownership: 1-A owns src/lib/utils.ts, src/components/*; 1-B owns .env.example, vercel.json, deployment documentation
- Integration point: 1-C tests the combined output of 1-A (currency changes) deployed via 1-B (production environment)

**Merge Strategy:**
- Use Vercel preview deployments for testing (branch: currency-migration-test)
- Sub-builder 1-A commits currency changes to preview branch
- Sub-builder 1-B configures Vercel env vars (no code changes)
- Sub-builder 1-C tests preview URL, documents any issues
- If all tests pass, merge preview branch to main for production deployment

## Deployment Plan
**Phase 1: Local Preparation (Sub-builder 1-A + 1-B)**
1. Update currency constants and formatCurrency() function
2. Push Prisma schema to production Supabase (npx prisma db push)
3. Create Vercel project, link GitHub repository
4. Configure 7 environment variables in Vercel dashboard

**Phase 2: Preview Deployment (Sub-builder 1-C)**
1. Create preview branch: currency-migration-test
2. Commit all currency changes
3. Push to GitHub (triggers Vercel preview deployment)
4. Test preview URL: https://wealth-git-currency-migration-test-ahiya1.vercel.app
5. Run visual QA checklist (10 page types)
6. Verify cron job endpoint (manual curl test)

**Phase 3: Production Deployment**
1. Merge preview branch to main
2. Vercel auto-deploys to production within 2-3 minutes
3. Verify production URL accessible: https://wealth-ahiya1.vercel.app
4. Run smoke tests (create transaction, view dashboard, export data)
5. Document production URL and credentials securely

**Rollback Strategy:**
- Vercel dashboard: Redeploy previous successful deployment (instant)
- Git: Revert commit, push to main (2-3 minute redeploy)
- Database: Supabase automatic backups (daily for 7 days)
