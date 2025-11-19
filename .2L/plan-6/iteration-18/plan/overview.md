# 2L Iteration Plan - Israeli Bank Integration & Scraper Testing

## Project Vision

Integrate the israeli-bank-scrapers library to enable automatic transaction import from First International Bank of Israel (FIBI) and Visa CAL credit card accounts. This iteration focuses on establishing a reliable scraper integration with comprehensive 2FA handling and extensive real-world testing.

**Strategic Context:** This is Iteration 2 of Plan-6 (Automatic Transaction Sync). Iteration 17 established the security foundation (encryption, database schema). Iteration 18 isolates the highest-risk component: screen scraping integration with Israeli banks.

## Success Criteria

Specific, measurable criteria for iteration completion:

- [ ] Successfully import transactions from real FIBI checking account (20+ test attempts)
- [ ] Successfully import transactions from real Visa CAL credit card (20+ test attempts)
- [ ] 2FA/OTP flow works end-to-end (SMS code entry → validation → connection success)
- [ ] Scraper success rate >80% over 40+ total test attempts (excluding credential errors)
- [ ] 8+ error scenarios handled with clear user-facing messages
- [ ] Connection wizard completes all 5 steps without crashes
- [ ] SyncLog records created for every connection attempt with sanitized details
- [ ] No credentials or OTP codes logged anywhere in system
- [ ] Test connection mutation replaces stub with real scraper integration
- [ ] Bank connection wizard UI fully functional (all 5 steps implemented)

## MVP Scope

### In Scope (Iteration 18):

**Core Scraper Integration:**
- israeli-bank-scrapers library integration (v6.2.5)
- Wrapper service for FIBI (CompanyTypes.otsarHahayal)
- Wrapper service for Visa CAL (CompanyTypes.visaCal)
- Transaction mapping from scraper format to Transaction model
- Error categorization for 8+ failure scenarios
- Browser lifecycle management (Puppeteer)

**2FA/OTP Handling:**
- OTP modal component with countdown timer (3-minute timeout)
- Async callback pattern for OTP entry
- OTP retry logic (max 3 attempts)
- SMS delay messaging and timeout handling
- State machine for OTP flow (idle → waiting → validating → success/timeout)

**Connection Wizard UI:**
- Step 1: Bank selection (FIBI vs CAL, Checking vs Credit)
- Step 2: Credential entry (userId + password, secure inputs)
- Step 3: 2FA handling (conditional - only if scraper requires OTP)
- Step 4: Connection test (loading states, success/error feedback)
- Step 5: Initial import prompt ("Import last 30 days?" Yes/No)

**API Enhancements:**
- Complete bankConnections.test mutation (replace stub)
- Error handling with BankScraperError custom class
- SyncLog creation for all test attempts
- Connection status updates based on test results

**Testing & Validation:**
- 2-3 days dedicated real bank testing
- FIBI integration tests (20+ scenarios)
- CAL integration tests (20+ scenarios)
- Error scenario reproduction (wrong password, OTP timeout, network errors)
- Success rate monitoring and documentation

### Out of Scope (Post-Iteration 18):

**Deferred to Iteration 19:**
- Transaction import pipeline (duplicate detection)
- AI categorization integration
- Manual "Sync Now" trigger UI
- Real-time sync progress updates (SSE or polling)
- Batch transaction insertion

**Deferred to Iteration 20:**
- Budget auto-update system
- Dashboard enhancements
- Production monitoring (Sentry)
- Performance optimizations
- End-to-end user journey testing

**Deferred to Post-MVP:**
- Automatic scheduled background sync
- Multi-account support (multiple FIBI/CAL accounts)
- Historical import beyond 30 days
- Other Israeli banks (Leumi, Hapoalim, Discount)
- Official Open Banking API migration

## Development Phases

1. **Exploration** - COMPLETE (2 comprehensive reports analyzed)
2. **Planning** - CURRENT (comprehensive 4-file plan creation)
3. **Building** - 8-10 hours estimated (single builder, optional split for OTP)
4. **Integration** - N/A (single builder, no integration needed)
5. **Validation** - Included in building phase (2-3 days real bank testing)
6. **Deployment** - Vercel deployment with Pro tier configuration

## Timeline Estimate

- **Exploration:** Complete (2 explorers, comprehensive reports)
- **Planning:** 1 hour (4 comprehensive planning files)
- **Building:** 8-10 hours total
  - Scraper wrapper implementation: 2-3 hours
  - Connection wizard UI (5 steps): 3-4 hours
  - 2FA/OTP modal and flow: 2-3 hours
  - tRPC endpoint completion: 1 hour
  - Real bank testing: 2-3 days (intensive validation)
- **Total:** 8-10 hours development + 2-3 days testing

## Risk Assessment

### CRITICAL RISKS

**Screen Scraping Fragility:**
- **Impact:** Bank website changes break scrapers without warning
- **Likelihood:** Medium (banks update UIs quarterly)
- **Mitigation:**
  - Isolate scraper in wrapper service (/src/server/services/bank-scraper.service.ts)
  - Pin israeli-bank-scrapers to v6.2.5 (test before upgrading)
  - Comprehensive error categorization and logging
  - Clear user messaging ("Sync may fail if bank changes website")
  - Active library maintenance (900+ stars, last commit <1 month)

### HIGH RISKS

**2FA/OTP Timeout Complexity:**
- **Impact:** Users frustrated by timeout errors, abandoned connections
- **Likelihood:** Medium (SMS delays, user distraction)
- **Mitigation:**
  - 3-5 minute OTP timeout (not 30 seconds)
  - Prominent countdown timer in modal
  - Retry without re-entering credentials
  - Clear messaging ("Code expired, request new code")

**Vercel Function Timeout:**
- **Impact:** Scraping operations timeout before completion
- **Likelihood:** High (scraping takes 30-60 seconds)
- **Mitigation:**
  - REQUIRED: Vercel Pro tier ($20/month) for 60s timeout
  - Configure maxDuration: 60 in vercel.json
  - Client-side messaging ("This may take up to 60 seconds")
  - Future: Background queue for post-MVP scaling

### MEDIUM RISKS

**Puppeteer Binary Size:**
- **Impact:** Vercel deployment failures, disk quota exceeded
- **Likelihood:** Medium (~300MB binary)
- **Mitigation:**
  - Verify Vercel Pro disk space limits
  - Monitor build size output
  - Document deployment requirements
  - Consider chrome-aws-lambda for future optimization

**Testing with Real Bank Accounts:**
- **Impact:** Cannot validate scrapers without real credentials
- **Likelihood:** Certain
- **Mitigation:**
  - Allocate 2-3 days for comprehensive testing
  - Test 40+ scenarios (FIBI + CAL, happy path + errors)
  - Document results in SyncLog records
  - Create scraper health monitoring script

**Credential Expiration:**
- **Impact:** Syncs fail until user updates credentials
- **Likelihood:** Medium (banks force password changes every 90 days)
- **Mitigation:**
  - Set status to EXPIRED on password change errors
  - Show notification "Your FIBI password expired, update in Settings"
  - Provide "Update Credentials" button

### LOW RISKS

**Builder May Need to Split:**
- **Impact:** Single builder overwhelmed by 2FA complexity
- **Likelihood:** Low-Medium
- **Mitigation:**
  - Main builder: Core scraper + wizard (6-8 hours)
  - Optional sub-builder: OTP modal + state machine (2-3 hours)
  - Clear integration point: testConnection returns OTP_REQUIRED error

## Integration Strategy

**Single Builder Approach:**
- All components in Iteration 18 are tightly coupled
- Scraper wrapper ← → tRPC endpoint ← → Connection wizard UI
- 2FA flow requires coordination across all layers

**Optional Split (if builder requests):**
- **Main Builder:** Scraper service + tRPC + wizard Steps 1,2,4,5 (no OTP)
- **Sub-Builder:** OTP modal + Step 3 + OTP mutation parameter
- **Integration Point:** testConnection mutation returns BankScraperError('OTP_REQUIRED')

**Testing Integration:**
- Unit tests for scraper wrappers (mock israeli-bank-scrapers)
- Real bank testing for end-to-end validation
- SyncLog records for all test attempts

## Deployment Plan

### Prerequisites

**Vercel Configuration:**
- Upgrade to Vercel Pro tier ($20/month) - REQUIRED for 60s timeout
- Add maxDuration: 60 to vercel.json for tRPC route
- Verify disk space for Puppeteer binary (~300MB)

**Environment Variables (Already Set):**
- ENCRYPTION_KEY: AES-256-GCM encryption key (from Iteration 17)
- DATABASE_URL: Supabase connection string
- DIRECT_URL: Supabase direct URL

**Deployment Steps:**

1. Install israeli-bank-scrapers: `npm install israeli-bank-scrapers --save`
2. Update vercel.json with function timeout configuration
3. Deploy to Vercel staging environment
4. Test with real FIBI account (staging)
5. Test with real CAL account (staging)
6. Verify no credential leaks in logs
7. Promote to production after >80% success rate validated

### Monitoring

**Iteration 18 Scope:**
- Console logging only
- SyncLog database records for all attempts
- Manual success rate tracking via database queries

**Future (Iteration 20):**
- Sentry integration for error tracking
- Scraper health dashboard (success rate by bank)
- Automated alerting on sustained failures

## Security Considerations

**Credential Protection:**
- Decrypt credentials ONLY in server-side tRPC mutation context
- Clear decrypted credentials from memory after scrape (automatic GC)
- NEVER log credentials, OTP codes, or encryption keys
- Sanitize all error messages before storage

**User Consent:**
- Show disclaimer in connection wizard Step 1
- Require checkbox consent before proceeding
- Communicate risks transparently ("screen scraping violates bank ToS")
- Document encryption standards ("AES-256-GCM encrypted credentials")

**Logging Safeguards:**
- Log only first 3 characters of userId (e.g., "12345678" → "123***")
- Strip credentials from all error messages
- SyncLog.errorDetails contains only user-safe error descriptions
- No scraper internal error details exposed to client

**Browser Lifecycle:**
- Close Puppeteer browser contexts after each scrape
- Prevent memory leaks from long-running browser instances
- Headless mode only (showBrowser: false)

## Success Metrics

**Functional Success:**
- 20+ successful FIBI test connections
- 20+ successful CAL test connections
- 2FA flow completes without errors
- All 5 wizard steps functional
- 8+ error scenarios properly handled

**Quality Success:**
- >80% scraper success rate (excluding credential errors)
- Zero credential leaks in logs (verified via grep)
- All tests pass (unit + integration)
- TypeScript compilation with zero errors
- SyncLog records accurate and complete

**User Experience Success:**
- Connection wizard completes in <2 minutes (excluding OTP wait)
- Error messages are actionable and clear
- OTP timeout countdown visible and accurate
- Retry flow works without re-entering credentials

## Next Steps

After Iteration 18 completion:

1. **Iteration 19:** Transaction import pipeline
   - Duplicate detection algorithm
   - AI categorization integration
   - Manual "Sync Now" trigger UI
   - Real-time progress updates (SSE or polling)
   - Batch transaction insertion

2. **Iteration 20:** Budget integration and production polish
   - Real-time budget updates
   - Dashboard enhancements
   - Sentry monitoring
   - Performance optimizations
   - End-to-end user journey validation

3. **Post-MVP:** Scaling and expansion
   - Automatic scheduled background sync
   - Multi-account support
   - Historical import (3-6 months)
   - Additional Israeli banks
   - Official Open Banking API migration (when licensed)

---

**Iteration Status:** PLANNED
**Ready for:** Builder assignment and execution
**Risk Level:** HIGH (screen scraping fragility, 2FA complexity, real bank dependency)
**Confidence Level:** HIGH (95% - comprehensive exploration, proven patterns, clear scope)
