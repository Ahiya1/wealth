# Technology Stack - Iteration 20

## Core Framework

**Decision:** Next.js 14.2.x (App Router) - EXISTING

**Rationale:**
- App Router provides server components for dashboard (direct Supabase auth check)
- Client components for interactive widgets (tRPC queries, real-time updates)
- Excellent performance for data-heavy dashboards (parallel data fetching)
- Already established in codebase - no migration needed

**Alternatives Considered:**
- Remix: Not chosen - team already familiar with Next.js patterns
- Pure React SPA: Not chosen - SSR required for SEO and initial page load performance

## Database

**Decision:** PostgreSQL 15 (Supabase) + Prisma 5.22.x - EXISTING

**Rationale:**
- Prisma provides excellent aggregate query support (transaction.aggregate)
- Supabase offers connection pooling (DATABASE_URL port 6543)
- DIRECT_URL for migrations bypasses pooler
- Row-level security via userId checks in queries
- Already configured and optimized

**Schema Strategy:**
- Budget and BudgetAlert models already exist (schema.prisma lines 309-341)
- No schema changes needed for Iteration 20
- Cascade deletes configured (onDelete: Cascade) for data deletion flow

## Error Monitoring

**Decision:** Sentry for Next.js - NEW ADDITION

**Version:** @sentry/nextjs (latest stable)

**Rationale:**
- Official Next.js SDK with automatic error capture (client + server)
- Performance monitoring (APM) for slow query detection
- Session replay for debugging user issues
- Free tier: 5,000 errors/month (sufficient for MVP)
- Release tracking for version-based error grouping
- Slack integration for critical alerts

**Implementation Notes:**
- Install via wizard: `npx @sentry/wizard@latest -i nextjs`
- Creates `sentry.client.config.ts` and `sentry.server.config.ts` automatically
- Add `beforeSend` hook for PII sanitization (remove amounts, payees, account numbers)
- Configure sample rate: 10% for performance monitoring (reduce quota usage)
- Set environment: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

**Alternatives Considered:**
- LogRocket: Not chosen - more expensive ($99/month vs $26/month)
- Rollbar: Not chosen - less mature Next.js integration
- Datadog: Not chosen - overkill for MVP, complex setup

## Structured Logging

**Decision:** Pino - NEW ADDITION (OPTIONAL)

**Version:** pino + pino-pretty (latest stable)

**Rationale:**
- 5x faster than Winston (low overhead)
- JSON structured logs (Vercel log parser compatible)
- Request ID tracking for error correlation
- Pretty-print in development (pino-pretty)
- Compatible with future observability tools (Datadog, Axiom)

**Implementation Notes:**
- Create `lib/logger.ts` wrapper with request ID support
- Replace 41 console.log calls incrementally
- Add ESLint rule: `no-console` to prevent new console.log
- Development mode: pretty-print with colors
- Production mode: JSON output for log aggregation

**Alternatives Considered:**
- Winston: Not chosen - slower, more complex configuration
- Console.log: Keep for MVP - Pino migration is optional technical debt

**Decision:** Defer to post-MVP (keep console.log for now)

## Budget Alert System

**Decision:** Extend existing BudgetAlert model - NO NEW DEPENDENCIES

**Current Schema:**
```prisma
model BudgetAlert {
  id        String    @id @default(cuid())
  budgetId  String
  threshold Int       // 75, 90, 100
  sent      Boolean   @default(false)
  sentAt    DateTime?
  createdAt DateTime  @default(now())

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@index([budgetId])
}
```

**Rationale:**
- Schema already supports alert triggering (sent boolean, threshold int)
- Alerts created automatically when budget is created (budgets.router.ts:81-87)
- Just need triggering logic and display mechanism

**Implementation Strategy:**
- Create `lib/services/budget-alerts.service.ts` for alert logic
- Add `budgets.activeAlerts` tRPC endpoint (query unsent alerts)
- Display in dashboard using existing Alert component (shadcn/ui)

## Cache Management

**Decision:** React Query (TanStack Query v5) - EXISTING

**Current Configuration:**
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 60 seconds
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  }
})
```

**Rationale:**
- Already integrated with tRPC for automatic cache key generation
- Excellent invalidation patterns established (SyncButton.tsx:64-72)
- DevTools available for debugging cache behavior
- No additional dependencies needed

**Cache Invalidation Pattern (after sync):**
```typescript
utils.transactions.list.invalidate()
utils.budgets.progress.invalidate()
utils.budgets.summary.invalidate()
utils.budgets.activeAlerts.invalidate()  // NEW
utils.analytics.dashboardSummary.invalidate()  // ADD
utils.accounts.list.invalidate()  // ADD
utils.bankConnections.list.invalidate()
utils.syncTransactions.history.invalidate()
```

## Health Monitoring

**Decision:** Custom Health Check + UptimeRobot - NEW ADDITION

**Implementation:**
- Create `/api/health` route with Prisma connection test
- Return 200 OK if database responsive
- Return 503 Service Unavailable if connection fails
- Response format: `{ status: 'ok'|'error', timestamp: ISO8601, message?: string }`

**UptimeRobot Configuration:**
- Free tier: 50 monitors, 5-minute interval
- Monitor type: HTTP(s) GET
- Alert contacts: Email + Slack webhook (optional)
- Response time threshold: >2s = warning, >5s = critical

**Rationale:**
- Essential for production incident detection
- Database connection is single point of failure
- Vercel logs expire (7-30 days) - external monitoring required
- UptimeRobot free tier sufficient for MVP

**Alternatives Considered:**
- Pingdom: Not chosen - paid only ($10/month minimum)
- Vercel Analytics: Not chosen - doesn't test database connectivity
- Checkly: Not chosen - more complex setup, overkill for MVP

## Date Manipulation

**Decision:** date-fns - EXISTING (keep for now)

**Current Usage:**
- `formatDistanceToNow()` for "Last Synced" relative time
- `startOfMonth()`, `endOfMonth()` for budget date ranges
- Already installed and used throughout codebase

**Future Consideration:**
- dayjs: 96% smaller bundle (2.9KB vs 67KB)
- Identical API to date-fns
- Defer migration to post-MVP bundle optimization

## UI Components

**Decision:** shadcn/ui + Tailwind CSS - EXISTING

**Key Components for Iteration 20:**
- `Alert` (variant="warning") for budget alerts
- `Badge` for sync status indicators (ACTIVE, ERROR, SYNCING)
- `Card` for dashboard widgets
- `Button` for sync actions
- `Toast` (sonner) for notifications

**Rationale:**
- Consistent design system already established
- All needed components already available
- No custom components required - use existing patterns

## Performance Optimization

**Decision:** Prisma aggregate() queries - EXISTING PATTERN

**Current Implementation:**
```typescript
// budgets.router.ts:193-201 (already optimized)
const spent = await ctx.prisma.transaction.aggregate({
  where: {
    userId: ctx.user.id,
    categoryId: budget.categoryId,
    date: { gte: startDate, lte: endDate },
    amount: { lt: 0 },
  },
  _sum: { amount: true },
})
```

**Optimization Target:**
- Analytics router lines 43-52: Replace in-memory reduce with aggregate
- Budget router lines 190-231: Eliminate N+1 query pattern using groupBy

**Rationale:**
- Database aggregation 3-5x faster than in-memory reduce
- Reduces network overhead (transfer sums instead of all records)
- Already proven pattern in budgets.router

## Animations

**Decision:** Framer Motion 12.x + animations.ts - EXISTING

**Current Patterns:**
- `progressBarAnimation(percentage)` (animations.ts:89-93)
- `staggerContainer`, `staggerItem` (animations.ts:72-86)
- Reduced motion support: `getPageTransition(reducedMotion)`

**Rationale:**
- Animation system already comprehensive
- Budget progress bars can use existing progressBarAnimation
- Dashboard cards use existing stagger animations
- No new dependencies needed

**Defer to Post-MVP:**
- Celebration animations (confetti on budget underspend)
- Mobile bottom navigation animations

## Security

**Decision:** Existing encryption + compliance additions - EXTEND EXISTING

**Current Security:**
- AES-256-GCM encryption for bank credentials (encryption.ts)
- Supabase Auth with middleware enforcement
- Security headers (Strict-Transport-Security, X-Frame-Options, CSP)
- Row-level security via userId checks

**New Additions:**
- Financial disclaimer modal on first login (stored in localStorage)
- Bank scraper consent checkbox in connection wizard
- Data deletion flow with cascade deletes (Prisma onDelete: Cascade)
- Export data option before account deletion

**Rationale:**
- Strong security foundation already exists
- Compliance features required for GDPR/CCPA
- Minimal additional infrastructure needed

## Environment Variables

### Required for Iteration 20

**Sentry:**
- `NEXT_PUBLIC_SENTRY_DSN` - Public DSN for client-side error tracking
- `SENTRY_AUTH_TOKEN` - For source map upload (build-time only)
- `SENTRY_ORG` - Sentry organization slug
- `SENTRY_PROJECT` - Sentry project slug

**Existing (no changes):**
- `DATABASE_URL` - Supabase connection string (pooler, port 6543)
- `DIRECT_URL` - Supabase direct connection (migrations, port 5432)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-only)
- `ENCRYPTION_KEY` - AES-256-GCM key for bank credentials
- `ANTHROPIC_API_KEY` - Claude API for transaction categorization

### Optional (defer to post-MVP)

- `UPSTASH_REDIS_URL` - Redis connection string (if adding caching layer)
- `UPSTASH_REDIS_TOKEN` - Redis authentication token

## Dependencies Overview

### New Dependencies (add to package.json)

```json
{
  "@sentry/nextjs": "^8.x.x",
  "pino": "^9.x.x",  // OPTIONAL - defer to post-MVP
  "pino-pretty": "^11.x.x"  // OPTIONAL - development only
}
```

### Key Existing Dependencies (no changes)

- `@trpc/server` + `@trpc/client` + `@trpc/react-query`: ^10.x.x
- `@tanstack/react-query`: 5.80.3
- `@prisma/client`: 5.22.0
- `next`: 14.2.x
- `react` + `react-dom`: 18.3.x
- `framer-motion`: 12.23.22
- `sonner`: 2.0.7 (toast notifications)
- `date-fns`: 4.x.x
- `zod`: 3.x.x

### Development Dependencies (add)

```json
{
  "@sentry/webpack-plugin": "^2.x.x",  // For source map upload
  "@tanstack/react-query-devtools": "^5.x.x"  // For cache debugging
}
```

## Performance Targets

### Query Performance
- Budget progress calculation: <500ms (currently ~1,500ms - optimize N+1 pattern)
- Dashboard summary aggregation: <200ms (currently ~800ms - use aggregate())
- Health check endpoint: <100ms (simple Prisma connection test)

### Page Load Performance
- Dashboard First Contentful Paint (FCP): <1.5s
- Dashboard Largest Contentful Paint (LCP): <2.5s
- Dashboard Cumulative Layout Shift (CLS): <0.1
- Budget page Time to Interactive (TTI): <3s

### API Response Times
- tRPC endpoint average: <200ms (measured via Sentry APM)
- Bank sync (50 transactions): <60s (Vercel timeout limit)
- Transaction categorization (batch 50): <5s (Claude API + cache)

### Bundle Size
- Total JavaScript bundle: <350KB gzipped (current ~320KB)
- First Load JS shared: <100KB gzipped
- Budget page specific: <30KB gzipped

## Security Considerations

### PII Protection in Error Logs

**Sentry beforeSend Hook:**
```typescript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive fields from error payloads
    if (event.request?.data) {
      delete event.request.data.amount
      delete event.request.data.payee
      delete event.request.data.accountNumber
      delete event.request.data.credentials
      delete event.request.data.password
    }

    // Sanitize user ID (only first 3 chars)
    if (event.user?.id) {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    return event
  },
})
```

### Health Check Security

- No authentication required (public endpoint for monitoring)
- Does not expose database credentials or connection strings
- Returns minimal information (status + timestamp only)
- Rate limiting: 60 requests/minute per IP (prevent abuse)

### Data Deletion Compliance

**Cascade Delete Configuration (Prisma):**
```prisma
model User {
  transactions Transaction[] // onDelete: Cascade
  budgets Budget[]           // onDelete: Cascade
  accounts Account[]         // onDelete: Cascade
  bankConnections BankConnection[]  // onDelete: Cascade
  exports Export[]           // onDelete: Cascade
}
```

**Deletion Flow:**
1. User clicks "Delete My Account" in settings
2. Confirmation modal with password verification
3. Optional: Export all data before deletion (GDPR compliance)
4. Execute: `prisma.user.delete({ where: { id: userId } })`
5. Cascade deletes all related records automatically
6. Audit log entry created (userId, timestamp, action: 'ACCOUNT_DELETED')

## Testing Strategy

### Unit Tests (Vitest)
- Budget alert triggering logic (20+ test cases for threshold crossing)
- Sentry PII sanitization (verify amounts, payees removed)
- Health check endpoint (200 OK vs 503 failure)

### Integration Tests (Vitest + Prisma)
- Budget progress query optimization (verify aggregate results match old logic)
- Data deletion cascade (verify all related records deleted)
- Cache invalidation after sync (verify React Query invalidates correctly)

### E2E Tests (Playwright - basic coverage only)
- User signup -> bank connection -> sync -> budget alert display
- Dashboard load time <2s (performance test)
- Export data before account deletion flow

### Performance Tests (Lighthouse CI)
- Dashboard performance score >90 (mobile + desktop)
- Budget page performance score >85
- CLS <0.1, LCP <2.5s for all pages

## Cost Analysis

### New Monthly Costs

**Sentry:**
- Free tier: 5,000 errors/month (sufficient for MVP)
- Team plan: $26/month if exceeding 5K errors
- Performance monitoring: Included in Team plan (10K transactions/month)

**UptimeRobot:**
- Free tier: 50 monitors, 5-minute interval (sufficient for MVP)
- Pro tier: $7/month for 1-minute interval (defer to post-MVP)

**Total New Costs:**
- MVP: $0/month (free tiers)
- Growth: $26-33/month (Sentry Team + UptimeRobot Pro)

### Existing Costs (no changes)
- Vercel Pro: $20/month (required for 60s timeout)
- Supabase Pro: $25/month (connection pooling, 8GB database)
- Anthropic Claude API: ~$5-10/month (transaction categorization)

### Total Stack Cost
- MVP: ~$50/month (existing services only)
- Growth: ~$75-85/month (with monitoring tools)

## Migration Path

### From Current State to Iteration 20

**Phase 1: Sentry Setup (1 hour)**
1. Create Sentry account and project
2. Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
3. Configure environment variables in Vercel
4. Add PII sanitization in beforeSend hook
5. Test error capture with manual error trigger

**Phase 2: Budget Alert Logic (3-4 hours)**
1. Create `lib/services/budget-alerts.service.ts`
2. Add alert triggering in `transaction-import.service.ts`
3. Create `budgets.activeAlerts` tRPC endpoint
4. Add dashboard alert display component
5. Write unit tests for threshold crossing logic

**Phase 3: Dashboard Enhancements (2-3 hours)**
1. Add "Last Synced" timestamp to FinancialHealthIndicator
2. Enhance cache invalidation in SyncButton.tsx
3. Add budget health summary to dashboard
4. Test real-time UI updates after sync

**Phase 4: Production Polish (2-3 hours)**
1. Create health check endpoint (`/api/health`)
2. Configure UptimeRobot monitoring
3. Add financial disclaimer modal
4. Add bank scraper consent checkbox
5. Implement data deletion flow

**Phase 5: Testing & Deployment (1-2 hours)**
1. Run integration tests (budget alerts, cache invalidation)
2. Run performance tests (Lighthouse CI)
3. Deploy to Vercel preview
4. Validate in preview environment
5. Merge to main and deploy to production

**Total Migration Time: 9-13 hours**

## Rollback Considerations

### If Sentry Integration Fails
- Sentry is additive - remove Sentry config files and environment variables
- Application continues working without error monitoring
- Fall back to console.log and Vercel logs

### If Budget Alert Logic Breaks
- Budget alerts are optional feature - disable by removing triggering logic
- Existing budget system continues working (progress calculation unchanged)
- Can be fixed post-deployment without user impact

### If Performance Regression
- Prisma aggregate queries can be reverted to findMany + reduce
- React Query cache can be adjusted (increase staleTime)
- Database queries are backwards compatible

### Emergency Rollback Plan
1. Revert deployment via Vercel dashboard (instant rollback to previous version)
2. Investigate issues using Sentry error reports (if Sentry operational)
3. Fix critical bugs in feature branch
4. Re-deploy after validation in preview environment

## Conclusion

Iteration 20 technology stack is **90% existing infrastructure** with targeted additions:
- Sentry for production error monitoring (CRITICAL)
- Health check endpoint for uptime monitoring (ESSENTIAL)
- Budget alert service for threshold notifications (HIGH VALUE)
- Compliance features for GDPR/CCPA (MANDATORY)

No major architectural changes, no new databases, no new authentication systems. Focus is on **production readiness** and **user experience polish** using proven, battle-tested tools.
