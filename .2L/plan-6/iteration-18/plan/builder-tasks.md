# Builder Task Breakdown - Iteration 18

## Overview

**Single primary builder** will implement all components of Iteration 18. The scope is tightly coupled - scraper integration, wizard UI, and tRPC endpoints are interdependent.

**Optional split:** If builder requests assistance after 6+ hours due to 2FA complexity, a sub-builder can handle OTP modal implementation.

**Estimated total time:** 8-10 hours development + 2-3 days real bank testing

---

## Builder-1: Israeli Bank Integration & Connection Wizard

### Scope

Implement complete israeli-bank-scrapers integration with 5-step connection wizard UI, comprehensive error handling, and 2FA/OTP flow. Validate with extensive real-world testing using actual FIBI and Visa CAL accounts.

### Complexity Estimate

**HIGH** (with potential for split if 2FA proves overwhelming)

**Justification:**
- External dependency (israeli-bank-scrapers) with screen scraping fragility
- 8+ error scenarios to categorize and handle
- Multi-step wizard with state management
- 2FA/OTP async callback complexity
- Real bank testing required (cannot fully mock)
- 2-3 days dedicated testing period

### Success Criteria

- [ ] israeli-bank-scrapers v6.2.5 installed and configured
- [ ] Scraper wrapper service implemented (/src/server/services/bank-scraper.service.ts)
- [ ] BankScraperError custom error class with 8+ error types
- [ ] Transaction mapping from scraper format to Prisma Transaction model
- [ ] Pending transactions filtered out (only import completed)
- [ ] testConnection tRPC mutation implemented (replaces stub)
- [ ] 5-step connection wizard UI fully functional
- [ ] OTP modal with 3-minute countdown timer working
- [ ] Error messages user-friendly and actionable (centralized in bankErrorMessages.ts)
- [ ] 20+ successful FIBI test connections (>80% success rate)
- [ ] 20+ successful CAL test connections (>80% success rate)
- [ ] 2FA flow works end-to-end (SMS code entry → validation → success)
- [ ] SyncLog records created for all test attempts
- [ ] No credentials or OTP codes logged anywhere (verified via grep)
- [ ] All TypeScript compilation errors resolved
- [ ] Unit tests for scraper service pass (>80% coverage)

### Files to Create

**Server-Side:**
- `/src/server/services/bank-scraper.service.ts` - Core scraper wrapper
- `/src/server/services/__tests__/bank-scraper.service.test.ts` - Unit tests
- `/src/lib/bankErrorMessages.ts` - Error message mapping

**UI Components:**
- `/src/components/bank-connections/BankConnectionWizard.tsx` - Main wizard container
- `/src/components/bank-connections/BankSelectionStep.tsx` - Step 1: Bank selection
- `/src/components/bank-connections/CredentialsStep.tsx` - Step 2: Credentials entry
- `/src/components/bank-connections/ConnectionTestStep.tsx` - Step 4: Connection test
- `/src/components/bank-connections/ImportPromptStep.tsx` - Step 5: Import prompt
- `/src/components/bank-connections/OtpModal.tsx` - 2FA OTP modal (Step 3 - conditional)

**Configuration:**
- `package.json` - Add israeli-bank-scrapers dependency
- `vercel.json` - Add maxDuration: 60 for tRPC route

### Files to Modify

- `/src/server/api/routers/bankConnections.router.ts` - Implement testConnection mutation (replace stub)
- `/src/app/(dashboard)/settings/bank-connections/page.tsx` - Enable "Add Bank" button, open wizard

### Dependencies

**Iteration 17 (Complete):**
- BankConnection model (database schema)
- SyncLog model (database schema)
- Encryption infrastructure (/src/lib/encryption.ts)
- tRPC router scaffold (bankConnections.router.ts with stub endpoints)

**No blocking dependencies** - can start immediately

### Implementation Notes

**Phase 1: Scraper Service (2-3 hours)**

1. Install israeli-bank-scrapers:
   ```bash
   npm install israeli-bank-scrapers --save
   ```

2. Create scraper service wrapper following pattern in `patterns.md`:
   - scrapeBank() function with BankProvider, encrypted credentials, date range
   - mapBankToCompanyType() helper (FIBI → CompanyTypes.otsarHahayal, CAL → CompanyTypes.visaCal)
   - mapScraperError() helper (8+ error types to BankScraperError)
   - Transaction mapping (filter pending, map completed to ImportedTransaction[])

3. Implement BankScraperError custom class:
   - errorType: 'INVALID_CREDENTIALS' | 'OTP_REQUIRED' | 'OTP_TIMEOUT' | 'NETWORK_ERROR' | 'SCRAPER_BROKEN' | 'ACCOUNT_BLOCKED' | 'PASSWORD_EXPIRED'
   - User-friendly message (never expose internal scraper details)
   - originalError for debugging (not exposed to client)

4. Sanitized logging:
   - Log only userId.substring(0, 3) + '***'
   - NEVER log password, OTP, or encryption keys
   - Use console.log for now (replace with proper logging in Iteration 20)

**Phase 2: tRPC Endpoint (1 hour)**

1. Implement testConnection mutation in bankConnections.router.ts:
   - Input schema: { id: string, otp?: string }
   - Verify connection ownership (userId check)
   - Create SyncLog (pessimistic FAILED default)
   - Call scrapeBank() with connection credentials
   - Update connection status (ACTIVE, ERROR, EXPIRED based on result)
   - Update SyncLog on completion (SUCCESS or FAILED with error details)
   - Special handling for OTP_REQUIRED error (throw specific TRPCError message)

2. Error handling:
   - Map BankScraperError to TRPCError with user-friendly messages
   - Update connection.status based on error type
   - Store sanitized error details in SyncLog

**Phase 3: Error Message Mapping (30 minutes)**

1. Create bankErrorMessages.ts following pattern in `patterns.md`:
   - Define ErrorMessageConfig interface
   - Map all 8 error types to title, description, action, retryable
   - Export getErrorMessage() utility function

**Phase 4: Connection Wizard UI (3-4 hours)**

1. Create BankConnectionWizard.tsx (main container):
   - State management: currentStep (1-5), formData (accumulate across steps)
   - Progress indicator (5 colored bars)
   - Conditional step rendering
   - OTP modal overlay (showOtpModal state)

2. Implement individual step components:
   - **Step 1 (BankSelectionStep):** Radio buttons for FIBI vs CAL, dropdown for Checking vs Credit
   - **Step 2 (CredentialsStep):** react-hook-form + Zod validation, userId + password inputs (type="password")
   - **Step 4 (ConnectionTestStep):** Call testConnection mutation, loading spinner, success/error states, handle OTP_REQUIRED
   - **Step 5 (ImportPromptStep):** "Import last 30 days?" Yes/No buttons (default Yes)

3. Enable wizard in settings page:
   - Modify /app/(dashboard)/settings/bank-connections/page.tsx
   - Add "Add Bank Connection" button (was disabled in Iteration 17)
   - State for opening wizard (isWizardOpen)
   - Pass onSuccess callback to refresh connection list

**Phase 5: OTP Modal (2-3 hours)**

1. Create OtpModal.tsx following pattern in `patterns.md`:
   - 6-digit OTP input (numeric only, maxLength: 6)
   - 3-minute countdown timer (setInterval, update every 1 second)
   - Auto-focus input when modal opens
   - Disable submit if OTP length !== 6 or expired
   - Clear messaging: "Code sent to ***1234. Expires in MM:SS"

2. OTP flow integration:
   - ConnectionTestStep calls testConnection mutation
   - If error message === 'OTP_REQUIRED', show OTP modal
   - User enters OTP → modal calls onSubmit(otp)
   - Retry testConnection with otp parameter
   - If OTP timeout, show error and allow retry

**Phase 6: Testing (2-3 days intensive validation)**

**Day 1: Unit Tests**
- Create bank-scraper.service.test.ts
- Mock israeli-bank-scrapers responses (success, errors)
- Test transaction mapping edge cases
- Test error categorization logic
- Verify pending transactions filtered out
- Run: `npm run test:coverage` (target >80%)

**Day 2: FIBI Integration Testing (Real Account)**
- Obtain FIBI test credentials (or use personal account with caution)
- Test scenarios:
  1. Valid credentials → successful connection
  2. Invalid password → INVALID_CREDENTIALS error
  3. Expired password → PASSWORD_EXPIRED error
  4. 2FA required → OTP modal → enter SMS code → success
  5. OTP timeout → wait 3 minutes without entering → error message
  6. Network disconnect mid-scrape → NETWORK_ERROR
  7. Rapid retries (3 attempts) → rate limiting
  8. Connection test without transactions (startDate = endDate = now)
- Document results in SyncLog records
- Track success rate (target >80%)

**Day 3: CAL Integration Testing (Real Account)**
- Obtain Visa CAL test credentials
- Test same scenarios as FIBI
- Additional CAL-specific tests:
  - Credit card transactions (verify amounts, merchants)
  - Pending vs completed filtering
  - Foreign currency transactions (if applicable)
- Test concurrent scraping (FIBI + CAL in parallel)
- Verify scraper browser contexts close properly (no memory leaks)

**Failure Scenario Testing:**
- Wrong password (expect INVALID_PASSWORD)
- OTP timeout (wait 3+ minutes)
- Network disconnect (airplane mode during scrape)
- Bank maintenance window (if possible to reproduce)

**Security Validation:**
- Grep logs for credentials: `grep -r "password" .next/` (should find nothing)
- Verify encryption: Check database - encryptedCredentials column should be hex gibberish
- Test ownership: Attempt to access another user's connection (should 403)

### Patterns to Follow

Reference `patterns.md` for full implementations:

**Scraper Service Pattern:**
- Location: /src/server/services/bank-scraper.service.ts
- Decrypt credentials in-memory only
- Map CompanyTypes correctly (FIBI → otsarHahayal, CAL → visaCal)
- Filter pending transactions
- Comprehensive error categorization

**Multi-Step Wizard Pattern:**
- State-driven navigation (currentStep state)
- Accumulate formData across steps
- Progress indicator (5 colored bars)
- Conditional rendering per step

**OTP Modal Pattern:**
- Countdown timer (3 minutes)
- Auto-focus input
- Numeric-only validation (pattern="[0-9]{6}")
- Clear expiration messaging

**tRPC Mutation Pattern:**
- Verify ownership before any operation
- Create SyncLog before scraping
- Update SyncLog on completion
- Map errors to user-friendly TRPCError messages

**Form Validation Pattern:**
- react-hook-form + Zod
- Field-level error messages
- Security messaging (explain encryption)

**Error Message Pattern:**
- Centralize in bankErrorMessages.ts
- Title, description, optional action, retryable flag
- Use getErrorMessage() utility in UI

### Testing Requirements

**Unit Tests:**
- `/src/server/services/__tests__/bank-scraper.service.test.ts`
- Mock israeli-bank-scrapers responses
- Test all error type mappings
- Test transaction filtering (pending vs completed)
- Coverage target: >80%

**Integration Tests (Manual):**
- Real FIBI account: 20+ test scenarios
- Real CAL account: 20+ test scenarios
- Document in SyncLog records
- Success rate >80%

**Security Tests:**
- No credentials in logs (verified via grep)
- Ownership verification works (403 on other user's connections)
- Encryption roundtrip works (decrypt → scrape → store)

**Commands:**
```bash
# Run unit tests
npm run test

# Coverage report
npm run test:coverage

# Build verification
npm run build

# Type checking
npx tsc --noEmit
```

### Potential Split Strategy (if complexity is HIGH)

**ONLY if builder explicitly requests help after 6+ hours:**

**Foundation (Primary Builder creates first):**
- Scraper service wrapper (bank-scraper.service.ts)
- BankScraperError class
- Transaction mapping utilities
- testConnection tRPC mutation (without OTP handling)
- Wizard Steps 1, 2, 4, 5 (no OTP modal)
- Error message mapping (bankErrorMessages.ts)

**Sub-builder 1A: OTP Flow Specialist (2-3 hours)**
- **Scope:** Implement complete 2FA/OTP handling
- **Files:**
  - OtpModal.tsx (countdown timer, validation, submission)
  - Enhance ConnectionTestStep.tsx to show OTP modal on OTP_REQUIRED error
  - Add otp parameter to testConnection mutation input
- **Testing:** Test with real bank account requiring 2FA
- **Complexity:** MEDIUM (async callback, timeout handling, retry logic)
- **Integration Point:**
  - Primary builder returns OTP_REQUIRED error from testConnection
  - Sub-builder catches error, shows modal, retries with OTP parameter

**Decision Criteria:**
- If wizard UI + scraper service takes >6 hours, suggest split
- If OTP flow becomes blocker for progress, suggest split
- If builder explicitly requests help with async OTP complexity

**Integration Notes:**
- Primary builder mocks OTP flow initially (always succeeds without OTP)
- Sub-builder replaces mock with real OTP handling
- Test integration: Primary builder's testConnection must return OTP_REQUIRED correctly

---

## Builder Execution Order

**Single Builder (No Dependencies):**
- All work sequential within Builder-1
- Recommended phase order:
  1. Scraper service (foundation)
  2. tRPC endpoint
  3. Error messages
  4. Wizard UI (Steps 1, 2, 4, 5)
  5. OTP modal (Step 3)
  6. Testing (2-3 days intensive)

**If Split Required:**
- **Phase 1:** Primary builder implements foundation (6-8 hours)
- **Phase 2:** Sub-builder adds OTP flow in parallel (2-3 hours)
- **Phase 3:** Integration testing (both builders coordinate)

---

## Integration Notes

**Internal Integration Points:**

1. **Scraper Service ↔ tRPC Mutation:**
   - tRPC calls scrapeBank() with decrypted credentials
   - BankScraperError thrown → caught → mapped to TRPCError
   - SyncLog created before scrape, updated after

2. **tRPC Mutation ↔ Connection Wizard:**
   - Wizard calls testConnection mutation
   - Loading state during mutation (isPending)
   - Success → proceed to Step 5
   - Error → show error message, allow retry
   - OTP_REQUIRED → show OTP modal

3. **OTP Modal ↔ Connection Test:**
   - ConnectionTestStep detects OTP_REQUIRED error
   - Shows OTP modal (overlay on wizard)
   - User enters OTP → modal calls onSubmit(otp)
   - Retry testConnection with otp parameter

4. **Encryption Service ↔ Scraper:**
   - Connection wizard encrypts credentials on Step 5 (when saving)
   - testConnection decrypts credentials before scraping
   - Credentials cleared from memory after scrape (automatic GC)

**Shared State:**
- Wizard formData accumulates across steps (userId, password, bank, accountType)
- OTP stored temporarily in formData.otp (cleared after use)
- Connection status updated in database (ACTIVE, ERROR, EXPIRED)

**Conflict Prevention:**
- Single builder → no file conflicts
- If split → sub-builder only touches OtpModal.tsx and ConnectionTestStep.tsx
- Clear integration point (OTP_REQUIRED error message)

---

## Deployment Checklist

**Before Deployment:**
- [ ] Verify israeli-bank-scrapers v6.2.5 in package.json
- [ ] Add vercel.json with maxDuration: 60
- [ ] Confirm ENCRYPTION_KEY environment variable set (from Iteration 17)
- [ ] Test build locally: `npm run build`
- [ ] Verify no credentials in build logs
- [ ] Confirm Vercel Pro tier active ($20/month)

**Deployment Steps:**
1. Deploy to Vercel staging
2. Test with real FIBI account on staging
3. Test with real CAL account on staging
4. Verify success rate >80% on staging
5. Grep staging logs for credentials (should find none)
6. Promote to production

**Post-Deployment:**
- Monitor SyncLog records for errors
- Track success rate per bank (FIBI vs CAL)
- Document any unexpected error types for future refinement

---

## Risk Mitigation

**Risk: Screen scraping breaks due to bank UI changes**
- Mitigation: Pin israeli-bank-scrapers to v6.2.5, monitor GitHub for updates
- Contingency: Wrapper service isolates scraper, easy to swap library

**Risk: OTP timeout complexity overwhelms builder**
- Mitigation: Optional split to sub-builder for OTP flow
- Contingency: Mock OTP flow initially, add real flow in Phase 2

**Risk: Real bank testing takes longer than 2-3 days**
- Mitigation: Allocate buffer time, prioritize FIBI over CAL
- Contingency: Document partial results, continue testing post-deployment

**Risk: Vercel function timeout (60s insufficient)**
- Mitigation: Vercel Pro tier configured, monitor actual scrape times
- Contingency: If >60s common, defer to background queue (post-MVP)

**Risk: Puppeteer binary too large for Vercel deployment**
- Mitigation: Verify Vercel Pro disk space limits before deployment
- Contingency: Consider chrome-aws-lambda for lighter binary

---

## Success Metrics

**Functional Success:**
- 40+ total test connections (20 FIBI + 20 CAL)
- >80% success rate (excluding credential errors)
- 2FA flow works end-to-end
- All 5 wizard steps functional

**Quality Success:**
- Zero credential leaks (verified via grep)
- Unit test coverage >80%
- TypeScript compilation with zero errors
- All error types have user-friendly messages

**User Experience Success:**
- Connection test completes in <30 seconds (typical)
- Error messages are actionable and clear
- OTP modal countdown accurate
- Wizard navigation smooth (no crashes)

---

**Builder Assignment:** Ready for single builder execution
**Estimated Effort:** 8-10 hours development + 2-3 days testing
**Complexity:** HIGH (external dependency, 2FA, real bank testing)
**Split Recommendation:** Optional (only if builder requests after 6+ hours)
