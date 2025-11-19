# 2L Iteration Plan - Wealth: Budget Integration & Production Polish

## Project Vision

Complete the automated financial sync loop by connecting imported transactions to real-time budget tracking, add production monitoring infrastructure, and polish UX for MVP launch. This iteration bridges the gap between transaction import (Iteration 3) and budget management (Iterations 1-2), creating a seamless, production-ready user experience.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Budget progress updates within 1 minute of sync completion
- [ ] Budget alerts trigger correctly when thresholds exceeded (75%, 90%, 100%)
- [ ] Dashboard shows real-time sync status for all connected accounts
- [ ] Sync completes in <60 seconds for 50 transactions
- [ ] All budget queries use aggregate() instead of findMany() (verified via code review)
- [ ] Error tracking captures 100% of scraper failures (Sentry dashboard shows all errors)
- [ ] Security disclaimer displayed and consent required (bank connection wizard)
- [ ] End-to-end user journey works flawlessly (manual QA: signup → sync → budget review)
- [ ] Data deletion flow complies with GDPR/CCPA requirements
- [ ] Production deployment successful (Vercel + Supabase)

## MVP Scope

### In Scope

**Budget Auto-Update System:**
- Trigger budget recalculation after transaction import completes
- Invalidate budget progress cache for affected categories
- Real-time UI updates using React Query invalidation
- Budget status indicators update automatically (green/yellow/red)

**Budget Alert Integration:**
- Check BudgetAlert thresholds (75%, 90%, 100%) after sync
- Create alert records for newly exceeded thresholds
- Display active alerts on dashboard (dismissible cards)
- Deduplicate alerts (only trigger once per threshold per month)

**Dashboard Enhancements:**
- Add "Last Synced" timestamp for connected banks
- Add sync status indicators (syncing, success, error badges)
- Add budget health summary (budgets on track vs approaching limit vs over budget)
- Enhance recent transactions widget with auto-categorization badges

**Production Monitoring:**
- Sentry integration for error tracking and APM
- Health check endpoint (/api/health) for uptime monitoring
- Structured error logging with request ID tracking
- PII sanitization in error payloads

**Security & Compliance:**
- Financial disclaimer on first login (informational only, not financial advice)
- Bank scraper consent checkbox (explicit user authorization)
- Data deletion flow (GDPR/CCPA compliant)
- Export data before account deletion option

**Performance Optimizations:**
- Budget progress query optimization (eliminate N+1 pattern)
- Dashboard stats aggregation improvements
- React Query cache configuration refinement

### Out of Scope (Post-MVP)

- Automatic scheduled background sync (cron jobs - requires background queue)
- Transaction review queue (approve/reject imports)
- Multi-account support (multiple checking accounts per user)
- Historical import beyond 30 days (3-6 months backfill)
- Support for additional Israeli banks (Leumi, Hapoalim, Discount, Mizrahi)
- Official Open Banking API migration
- Redis caching layer (defer unless dashboard >2s load time)
- Mobile bottom navigation (defer to polish iteration)
- Celebration animations for budget milestones (defer to polish iteration)
- Playwright E2E test suite (add basic tests only, expand post-launch)

## Development Phases

1. **Exploration** - COMPLETE
   - Explorer 1: Architecture & Component Patterns
   - Explorer 2: Performance, Monitoring & Production Polish

2. **Planning** - CURRENT
   - Comprehensive tech stack decisions
   - Code patterns and conventions
   - Builder task breakdown

3. **Building** - 8-10 hours (2 parallel builders)
   - Builder 1: Budget Integration & Alerts (4-5 hours)
   - Builder 2: Production Monitoring & Security (4-5 hours)

4. **Integration** - 30 minutes
   - Verify cache invalidation flows
   - Test budget alert triggering
   - Validate Sentry error capture

5. **Validation** - 1 hour
   - End-to-end user journey testing
   - Performance benchmarking (budget queries <500ms)
   - Security testing (PII sanitization)

6. **Deployment** - 30 minutes
   - Configure Sentry environment variables
   - Set up UptimeRobot monitoring
   - Deploy to Vercel production

## Timeline Estimate

- Exploration: Complete (16 hours total)
- Planning: Complete (current phase)
- Building: 8-10 hours (parallel builders)
- Integration: 30 minutes
- Validation: 1 hour
- Deployment: 30 minutes
- **Total: ~10-12 hours**

## Risk Assessment

### High Risks

**Vercel Timeout on Large Bank Syncs**
- Risk: Users with 10,000+ transactions may exceed 60s timeout
- Likelihood: MEDIUM - Israeli bank scrapers can take 30-90s
- Mitigation: Add batch size limit (500 transactions/sync), display timeout warning in UI if sync >45s

**Sentry PII Leakage**
- Risk: Accidental logging of transaction amounts, payees violates privacy
- Likelihood: MEDIUM - Default Sentry config captures all request data
- Mitigation: Configure `beforeSend` hook to sanitize error payloads, add unit tests for PII sanitization

### Medium Risks

**Budget Progress N+1 Query Refactor**
- Risk: Breaking rollover logic or recurring budget calculations during optimization
- Likelihood: MEDIUM - Complex business logic in budgets.router
- Mitigation: Write integration tests before refactor, use Prisma `groupBy` for batch aggregation

**Cache Invalidation Timing**
- Risk: Dashboard may show stale data briefly after sync
- Likelihood: LOW - Supabase pooler lag is <100ms typically
- Mitigation: Use DIRECT_URL for writes, show loading skeleton during refetch

### Low Risks

**Console.log Migration Incompleteness**
- Risk: Missing logs during incident (incomplete migration)
- Likelihood: LOW - 41 occurrences can be tracked with grep
- Mitigation: Create migration checklist, add ESLint rule to prevent new console.log

## Integration Strategy

### Cache Invalidation Flow

After successful transaction sync, the following caches must be invalidated:

1. **Transactions Cache** - `utils.transactions.list.invalidate()`
2. **Budget Progress Cache** - `utils.budgets.progress.invalidate()`
3. **Budget Summary Cache** - `utils.budgets.summary.invalidate()`
4. **Budget Alerts Cache** - `utils.budgets.activeAlerts.invalidate()` (NEW)
5. **Analytics Cache** - `utils.analytics.dashboardSummary.invalidate()` (ADD)
6. **Accounts Cache** - `utils.accounts.list.invalidate()` (ADD)
7. **Sync History Cache** - `utils.syncTransactions.history.invalidate()`
8. **Bank Connections Cache** - `utils.bankConnections.list.invalidate()`

### Budget Alert Triggering Flow

```
importTransactions()
  -> batch insert transactions
  -> categorize transactions
  -> checkBudgetAlerts(affectedCategories, month)  // NEW STEP
      -> fetch budgets for affected categories
      -> recalculate spent amounts (aggregate query)
      -> detect crossed thresholds (75%, 90%, 100%)
      -> mark alerts as sent (updateMany where sent = false)
  -> return { imported, skipped, categorized, alertsTriggered }
```

### Error Monitoring Flow

```
tRPC Error Occurs
  -> tRPC Error Middleware captures error
  -> Sentry.captureException(error, { user, tags, context })
  -> PII Sanitization (beforeSend hook)
      -> Remove: amount, payee, accountNumber
      -> Preserve: errorType, userId (first 3 chars), endpoint
  -> Send to Sentry dashboard
  -> Alert on Slack (if critical)
```

### Builder Coordination

**Shared Files:**
- `src/server/api/routers/syncTransactions.router.ts` - Builder 1 modifies (add budget alert triggering)
- `src/app/(dashboard)/dashboard/page.tsx` - Builder 1 modifies (add alert display)
- `src/server/api/trpc.ts` - Builder 2 modifies (add Sentry middleware)

**Integration Points:**
- Builder 1 creates `budgets.activeAlerts` endpoint -> Builder 1 uses in dashboard
- Builder 2 adds Sentry config -> Builder 1's errors automatically captured
- Builder 2 creates health check -> Builder 2 configures UptimeRobot monitoring

**Conflict Prevention:**
- Builder 1 works on budget-related files (routers/budgets.router.ts, services/budget-alerts.service.ts)
- Builder 2 works on infrastructure files (sentry.*.config.ts, api/health/route.ts)
- Minimal overlap - only SyncButton.tsx cache invalidation (Builder 1 adds new invalidations)

## Deployment Plan

### Pre-Deployment Checklist

- [ ] Sentry project created (sentry.io dashboard)
- [ ] Environment variables configured in Vercel:
  - `NEXT_PUBLIC_SENTRY_DSN` (public DSN for client-side errors)
  - `SENTRY_AUTH_TOKEN` (for source map upload)
  - `SENTRY_ORG` and `SENTRY_PROJECT` (for release tracking)
- [ ] UptimeRobot monitor configured (ping /api/health every 5 minutes)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Source maps uploaded to Sentry (automatic via next.config.js)

### Deployment Steps

1. **Deploy to Vercel Preview**
   - Push to feature branch `iteration-20-budget-integration`
   - Verify Vercel preview deployment succeeds
   - Test critical flows in preview environment

2. **Run Performance Tests**
   - Lighthouse CI: Dashboard performance >90, CLS <0.1, LCP <2.5s
   - Budget query benchmark: <500ms for 10 budgets, 1000 transactions

3. **Run Security Tests**
   - Trigger test errors, verify Sentry PII sanitization
   - Test health check endpoint (200 OK, 503 on database failure)
   - Verify admin routes return 403 for non-admin users

4. **Merge to Main**
   - Create pull request with validation results
   - Merge to main branch
   - Vercel production deployment triggered automatically

5. **Post-Deployment Verification**
   - Monitor Sentry dashboard for first 1 hour (verify no errors)
   - Check UptimeRobot status (green = healthy)
   - Test end-to-end user journey in production
   - Verify budget alerts trigger correctly with real data

### Rollback Plan

If critical issues detected:
1. Revert deployment via Vercel dashboard (instant rollback)
2. Investigate issues using Sentry error reports
3. Fix issues in feature branch
4. Re-deploy after validation

## Definition of Done

This iteration is complete when:

1. All 10 success criteria are met (checklist above)
2. Integration tests pass (budget alerts, cache invalidation)
3. E2E tests pass (signup -> sync -> budget review flow)
4. Performance benchmarks met (budget queries <500ms, dashboard <2s)
5. Security tests pass (PII sanitization, health check, consent flow)
6. Production deployment successful (Vercel + Sentry + UptimeRobot)
7. Zero critical errors in Sentry dashboard for 24 hours post-launch
8. User acceptance testing completed (manual QA by product owner)

## Notes

- This iteration focuses on **production readiness** over feature expansion
- Budget auto-update system leverages existing aggregate query patterns (no optimization needed)
- Sentry integration is **critical path** - must be completed first
- Dashboard enhancements are **additive** - no breaking changes to existing components
- Performance optimizations target specific bottlenecks identified by Explorer 2
- Security compliance features are **mandatory** for GDPR/CCPA before public launch
