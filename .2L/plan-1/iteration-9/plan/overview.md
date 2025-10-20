# 2L Iteration Plan - Currency Switching System

## Project Vision

Enable users to safely convert their entire financial history to a different currency with complete data integrity, using historical exchange rates for transactions and providing clear progress feedback throughout the conversion process. This iteration transforms the Wealth app into a truly international tool while maintaining the "conscious money relationship" philosophy through careful user communication and error prevention.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [x] User can select from 10 major currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL)
- [x] All transactions convert using historical exchange rates for their specific dates
- [x] All accounts, budgets, and goals convert using current exchange rate
- [x] Conversion completes in <30 seconds for 1,000 transactions
- [x] Failed conversions roll back completely with no partial data corruption
- [x] All currency displays update throughout the app after conversion
- [x] Exchange rates are cached to minimize API calls (24-hour TTL)
- [x] Confirmation dialog warns user before conversion with checkbox validation
- [x] Progress indicator shows real-time conversion status
- [x] Success message confirms completion with detailed summary
- [x] Audit log records all conversion attempts with status and metrics
- [x] Concurrent conversions are prevented with clear user messaging
- [x] API failures are handled gracefully with retry logic

## MVP Scope

**In Scope:**
- Database models: ExchangeRate (caching), CurrencyConversionLog (audit trail)
- Remove Account.currency field (single user currency, not per-account)
- Add Account.originalCurrency field (for Plaid account sync post-conversion)
- Exchange rate API integration (exchangerate-api.com, free tier 1,500/month)
- Currency conversion service with atomic Prisma transactions
- Historical rate fetching for accurate transaction conversion
- Rate caching with 24-hour TTL for current rates, indefinite for historical
- Retry logic with exponential backoff (3 attempts)
- Conversion lock mechanism (IN_PROGRESS status check)
- Progress tracking via polling endpoint (2-second intervals)
- /settings/currency page with currency selector
- Confirmation dialog with warning and checkbox
- Progress dialog with stage-by-stage updates
- Success summary dialog with conversion statistics
- Error dialogs with recovery options
- System-wide currency display updates (20+ components)
- Enhanced formatCurrency utility with user context
- Plaid sync updates (convert from originalCurrency to user currency)
- Comprehensive testing (unit, integration, performance)

**Out of Scope (Post-MVP):**
- Reversible conversions (storing original amounts for 30-day undo)
- Email confirmation after conversion
- Manual exchange rate entry (fallback for API failure)
- Background job processing for >5,000 transactions
- Multi-currency account support (each account in different currency)
- All 160+ currencies (starting with 10 major currencies)
- Conversion history viewer in UI (log exists, UI deferred)
- Real-time WebSocket progress updates (using polling instead)

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 7-9 hours (4 builders working in parallel groups)
4. **Integration** ⏳ 30 minutes
5. **Validation** ⏳ 45 minutes
6. **Deployment** ⏳ Final

## Timeline Estimate

- Exploration: Complete (3 explorer reports synthesized)
- Planning: Complete (this document)
- Building: 7-9 hours across 4 builders:
  - Builder 1 (Database & Migration): 1-2 hours
  - Builder 2 (Currency Service & API): 3-4 hours
  - Builder 3 (tRPC Router & Procedures): 1.5-2 hours
  - Builder 4 (UI Components): 2.5-3 hours
- Integration: 30 minutes (merge builder outputs, resolve conflicts)
- Validation: 45 minutes (test conversion flow, verify all components update)
- Total: ~8-10 hours end-to-end

## Risk Assessment

### High Risks

**Risk: Data Corruption from Partial Conversion**
- Impact: CRITICAL - User loses financial data integrity
- Likelihood: MEDIUM without proper safeguards
- Mitigation:
  - Use Prisma $transaction with 60-second timeout (atomic all-or-nothing)
  - Implement conversion lock (IN_PROGRESS status prevents concurrent operations)
  - Comprehensive error logging to CurrencyConversionLog
  - Pre-conversion validation (check for existing conversion, valid currencies)
  - Extensive testing with rollback scenarios (10, 100, 1,000, 10,000 transactions)

**Risk: Exchange Rate API Downtime**
- Impact: HIGH - Cannot perform conversion, user blocked
- Likelihood: LOW (99% uptime, but possible)
- Mitigation:
  - Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
  - Fallback to cached rates if available (warn if stale >7 days)
  - User-friendly error message: "Currency conversion temporarily unavailable. Please try again in a few minutes."
  - Log failed attempts in CurrencyConversionLog for debugging
  - Consider alternative API provider in future (exchangerate.host as backup)

**Risk: Performance Degradation with Large Datasets**
- Impact: HIGH - User waits >30 seconds (acceptance criteria failure)
- Likelihood: MEDIUM-HIGH for users with 1,000+ transactions
- Mitigation:
  - Batch historical rate fetching (fetch unique dates, not per-transaction)
  - Optimize database queries (findMany for bulk fetch, avoid N+1)
  - Parallel rate fetching with Promise.all for unique dates
  - Progress UI shows percentage completion (manages expectations)
  - Performance testing with synthetic datasets (10, 100, 1,000, 10,000 transactions)
  - Document background job consideration for >5,000 transactions (v2 feature)

### Medium Risks

**Risk: Plaid Sync After Conversion**
- Impact: MEDIUM - New Plaid transactions appear in wrong currency
- Likelihood: HIGH if not handled
- Mitigation:
  - Add Account.originalCurrency field for Plaid accounts
  - Update plaid-sync.service.ts to convert from originalCurrency to User.currency
  - Test Plaid sync immediately after currency conversion
  - Document behavior in UI: "Future synced transactions will be converted automatically"

**Risk: Historical Rate Unavailability**
- Impact: MEDIUM - Transactions converted with today's rate instead of historical
- Likelihood: LOW (exchangerate-api.com has data back to 1999)
- Mitigation:
  - Verify historical rate availability before starting conversion
  - If historical rate unavailable, use today's rate with warning to user
  - Document in CurrencyConversionLog which transactions used fallback rates
  - Allow re-conversion if user wants to retry with correct historical rates (v2)

**Risk: Concurrent Conversion Attempts**
- Impact: HIGH - Race condition causes data corruption
- Likelihood: LOW (infrequent operation)
- Mitigation:
  - Check CurrencyConversionLog for IN_PROGRESS status before starting
  - Use database-level locking (transaction wrapper ensures atomicity)
  - Return clear error: "Conversion already in progress"
  - Auto-cleanup stale IN_PROGRESS logs (>30 minutes old)

### Low Risks

**Risk: Currency Display Inconsistency**
- Impact: MEDIUM - Some components show old currency after conversion
- Likelihood: LOW (React Query auto-invalidates cache)
- Mitigation:
  - React Query cache invalidation triggers automatic refetch
  - All 20+ components use formatCurrency utility (centralized update)
  - Manual test checklist for all currency display locations
  - Toast notification confirms: "Currency changed to Euro"

**Risk: User Interrupts Conversion**
- Impact: MEDIUM - Conversion continues on server, user unaware
- Likelihood: MEDIUM (conversion takes 20-30 seconds)
- Mitigation:
  - Show "DO NOT CLOSE" warning during conversion
  - Conversion runs to completion on server (not dependent on client)
  - Polling endpoint allows client to reconnect and check status
  - Consider email confirmation after completion (v2 feature)

## Integration Strategy

### Builder Output Integration

**Phase 1: Sequential Dependencies (Builder 1 → Builder 2 → Builder 3 → Builder 4)**
- Builder 1 creates database models (ExchangeRate, CurrencyConversionLog)
- Builder 2 depends on Builder 1's Prisma schema for service implementation
- Builder 3 depends on Builder 2's service functions for tRPC procedures
- Builder 4 depends on Builder 3's tRPC procedures for UI components

**Phase 2: Parallel Groups**
- Group A (No dependencies): Builder 1 (Database)
- Group B (Depends on Group A): Builder 2 (Service), Builder 3 (Router), Builder 4 (UI)
  - Builder 2 and 3 can work in parallel after Builder 1 completes
  - Builder 4 can mock tRPC procedures and work in parallel

**Merge Strategy:**
1. Builder 1 completes database migration → Push to branch `iter9-database`
2. Builders 2, 3, 4 branch from `iter9-database`
3. Builder 2 completes service → Push to `iter9-service`
4. Builder 3 merges `iter9-service` → Push to `iter9-router`
5. Builder 4 merges `iter9-router` → Push to `iter9-ui`
6. Integration: Merge `iter9-ui` to main with comprehensive testing

**Conflict Prevention:**
- Builder 1: Only modifies `prisma/schema.prisma`, migrations
- Builder 2: Only creates `/src/server/services/currency.service.ts`
- Builder 3: Only creates `/src/server/api/routers/currency.router.ts`, updates `root.ts`
- Builder 4: Only creates `/src/components/currency/*`, updates `/src/app/(dashboard)/settings/currency/page.tsx`
- Shared file updates: `/src/lib/utils.ts` (formatCurrency) → Builder 4 handles
- Shared file updates: `/src/server/services/plaid-sync.service.ts` → Builder 2 handles

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All 4 builders completed and merged
- [ ] Database migration tested on local Supabase
- [ ] Environment variable EXCHANGE_RATE_API_KEY added to production
- [ ] Unit tests passing (currency.service, exchange rate API)
- [ ] Integration tests passing (full conversion flow)
- [ ] Performance tests passing (<30s for 1,000 transactions)
- [ ] Manual testing completed (conversion with 100 transactions)
- [ ] All 20+ currency display components verified
- [ ] Error handling tested (API timeout, database error, concurrent conversion)

### Deployment Steps

1. **Database Migration:**
   - Run `npx prisma migrate deploy` on production Supabase
   - Verify ExchangeRate and CurrencyConversionLog tables created
   - Verify Account.originalCurrency field added
   - Verify Account.currency field removed (if decided)

2. **Environment Configuration:**
   - Add `EXCHANGE_RATE_API_KEY` to production environment variables
   - Verify API key has 1,500/month quota available
   - Test API connection from production server

3. **Feature Deployment:**
   - Deploy code to production (Vercel/hosting platform)
   - Verify /settings/currency page loads
   - Test currency selector dropdown renders

4. **Smoke Testing (Production):**
   - Admin user (ahiya.butman@gmail.com) tests conversion with EUR
   - Verify conversion completes successfully
   - Check dashboard displays Euro amounts
   - Convert back to USD to verify bidirectional functionality

5. **Monitoring:**
   - Watch CurrencyConversionLog table for errors
   - Monitor API usage (ensure <1,500/month)
   - Check server logs for any uncaught errors
   - Track conversion completion times (target <30s)

### Rollback Plan

**If critical issue detected:**
1. Feature flag: Hide "Change Currency" button in UI (hotfix)
2. Database rollback: Run `npx prisma migrate reset` to previous version
3. Code rollback: Revert to previous Git commit
4. Investigate issue in staging environment
5. Fix and redeploy

**Rollback triggers:**
- Any data corruption detected
- API costs exceed budget
- Conversion failures >10% of attempts
- Performance >60 seconds for 1,000 transactions

## Post-Deployment

### User Communication

**In-App Announcement:**
"New feature: Change your display currency! Visit Settings → Currency to convert all your financial data to Euro, British Pound, and more. Uses historical exchange rates for accurate transaction conversion."

**Documentation Update:**
- Add "Currency Settings" section to help docs
- FAQ: "How do I change my currency?"
- FAQ: "Can I convert back to my original currency?"
- FAQ: "Why does conversion take 30 seconds?"

### Success Metrics

**Technical Metrics:**
- Currency conversions completed: >90% success rate
- Average conversion time: <25 seconds for 1,000 transactions
- API uptime: >99%
- Zero data corruption incidents

**User Metrics:**
- Conversion adoption rate: >10% of users try feature in first month
- Conversion abandonment: <5% cancel during confirmation dialog
- Currency distribution: Track most popular target currencies

### Future Enhancements (Backlog)

1. **Reversible Conversions (Priority: HIGH)**
   - Store original amounts for 30 days
   - Add "Undo Conversion" button in settings
   - Automatic cleanup after 30 days

2. **Email Confirmation (Priority: MEDIUM)**
   - Send summary email after successful conversion
   - Include: fromCurrency, toCurrency, rate, transactionCount
   - Resend integration already available

3. **Background Job Processing (Priority: MEDIUM)**
   - Implement queue for >5,000 transactions
   - Show "Conversion in progress, check back in 5 minutes"
   - Email notification when complete

4. **Expanded Currency Support (Priority: LOW)**
   - Add 40 more currencies (total 50)
   - Support emerging market currencies
   - User-requested currencies via feedback form

5. **Multi-Currency Accounts (Priority: LOW)**
   - Allow accounts in different currencies
   - Display conversion hints on dashboard
   - Support for expatriates and frequent travelers

6. **Manual Rate Entry (Priority: LOW)**
   - Fallback for API failures
   - Admin-only feature initially
   - Validate rate within reasonable bounds

---

**Document Version:** 1.0
**Created:** 2025-10-02
**Status:** APPROVED
**Next Phase:** Builder Task Assignment
