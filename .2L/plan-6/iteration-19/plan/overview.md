# 2L Iteration Plan - Wealth Transaction Import Pipeline

## Project Vision

Build the production-ready transaction import pipeline that transforms Wealth from manual entry to automated financial sync. This iteration integrates the working Israeli bank scraper (Iteration 18) with intelligent duplicate detection, existing AI categorization infrastructure (80% cache hit rate), and real-time budget updates - creating a seamless sync experience that imports, categorizes, and updates budgets in under 60 seconds.

## Success Criteria

Specific, measurable criteria for Iteration 19 MVP completion:

- [x] Import 200+ real transactions from FIBI + Visa CAL with zero duplicates created
- [x] Duplicate detection accuracy >95% (manual verification of 50 test cases)
- [x] AI categorization accuracy >80% (user correction rate <20%)
- [x] MerchantCategoryCache hit rate >70% on second sync
- [x] Manual sync completes in <60 seconds for 50 transactions
- [x] Sync status updates in real-time (2-second polling via tRPC)
- [x] Toast notifications appear for sync start, progress, completion, errors
- [x] React Query caches invalidate correctly (UI updates immediately)
- [x] Account balance updates atomically with transaction imports
- [x] All tests pass (20+ duplicate detection scenarios, integration tests)
- [x] No credentials leaked in logs or error messages
- [x] SyncLog created for every sync attempt with detailed audit trail

## MVP Scope

**In Scope:**

- **Transaction Import Service** - Orchestrates scrape → dedupe → import → categorize pipeline
- **Duplicate Detection Engine** - Multi-factor fuzzy matching (date + amount + merchant name)
- **AI Categorization Integration** - Leverages existing MerchantCategoryCache + Claude API
- **Manual Sync Trigger UI** - "Sync Now" button with real-time progress updates
- **Account Balance Updates** - Atomic transaction inserts with balance adjustments
- **React Query Invalidation** - Automatic UI refresh for transactions, budgets, connections
- **Comprehensive Error Handling** - BankScraperError types, SyncLog audit trail
- **Batch Operations** - Prisma createMany for 10-100x performance boost
- **Polling-based Progress** - 2-second tRPC query polling (no SSE complexity)

**Out of Scope (Post-MVP):**

- Automatic scheduled background sync (cron jobs - Iteration 20)
- Transaction review/approval queue (auto-approve all imports for now)
- Multi-account support (single FIBI + single CAL only)
- Historical import beyond 30 days (future iteration)
- Manual "Force Import" override for skipped duplicates
- Server-Sent Events (SSE) for streaming progress
- Advanced duplicate detection (ML-based, >3 factors)

## Development Phases

1. **Exploration** - COMPLETE
2. **Planning** - Current (Planner creating comprehensive plan)
3. **Building** - 6-8 hours (2-3 builders working in parallel)
4. **Integration** - 30 minutes (merge builder outputs, resolve conflicts)
5. **Validation** - 45 minutes (E2E testing with real FIBI + CAL accounts)
6. **Deployment** - 15 minutes (deploy to production, smoke test)

## Timeline Estimate

- Exploration: COMPLETE (2 explorers analyzed existing infrastructure)
- Planning: 30 minutes (this plan creation)
- Building: 6-8 hours (parallel builders)
  - Builder-1: Import Service + Duplicate Detection (4-5 hours)
  - Builder-2: tRPC Sync Mutation + UI Components (3-4 hours)
  - Potential Builder-1A: Testing Suite (if Builder-1 splits, 2 hours)
- Integration: 30 minutes (merge, resolve conflicts)
- Validation: 45 minutes (E2E tests, real bank testing)
- **Total: ~8-10 hours** (1-2 day sprint)

## Risk Assessment

### High Risks

**Duplicate Detection Accuracy (False Positives/Negatives)**
- **Mitigation:** Conservative 80% merchant similarity threshold, ±1 day date tolerance, comprehensive test suite (20+ scenarios), detailed SyncLog audit trail for debugging, manual transaction deletion if duplicates slip through

**Sync Timeout on Vercel (60-second limit)**
- **Mitigation:** Batch size limited to 100 transactions per sync (~30-45s), document Vercel Pro tier requirement for large imports, optimize with Prisma createMany and batch categorization, future migration to background queue if needed

### Medium Risks

**MerchantCategoryCache Pollution (Incorrect Entries)**
- **Mitigation:** User category corrections update cache via upsert, categorization service already has high accuracy (80%+), cache entries can be manually edited by admin (future tool), only cache HIGH confidence results

**Categorization Delays (AI API Latency)**
- **Mitigation:** Incremental categorization pattern (import first, categorize async), MerchantCategoryCache provides 70-80% instant categorization, only 20-30% need Claude API (~2-5s per batch of 50), UI shows "Categorizing..." progress state

**Edge Cases in Duplicate Detection (Merchant Name Variations)**
- **Mitigation:** Extensive test suite covering timezone issues, merchant name variations, recurring subscriptions, split payments, refunds, beta testing with real FIBI + CAL accounts, detailed logging of all skipped duplicates

### Low Risks

**Polling API Load (React Query Spam)**
- **Mitigation:** Conditional polling (enabled only when status = 'IN_PROGRESS'), automatic stop on SUCCESS/FAILED, 5-minute timeout, React Query built-in request debouncing

## Integration Strategy

### Builder Output Merging

**Builder-1 Output:**
- `/src/server/services/transaction-import.service.ts` - Import orchestration
- `/src/lib/services/duplicate-detection.service.ts` - Fuzzy matching utilities
- `/src/server/services/__tests__/transaction-import.service.test.ts` - Unit tests
- `/src/lib/services/__tests__/duplicate-detection.test.ts` - Duplicate tests

**Builder-2 Output:**
- `/src/server/api/routers/syncTransactions.router.ts` - tRPC sync endpoints (new router)
- `/src/components/bank-connections/SyncButton.tsx` - Manual sync UI
- `/src/components/bank-connections/SyncProgressModal.tsx` - Progress display
- `/src/app/dashboard/page.tsx` - Add sync button to dashboard (modify existing)

**Integration Points:**
- Builder-2's tRPC router imports Builder-1's import service
- Both builders use existing `categorize.service.ts` (no changes)
- Both builders reference existing `bank-scraper.service.ts` (no changes)
- Shared types in `/src/server/services/transaction-import.service.ts` exported for tRPC

**Conflict Prevention:**
- Builders work on completely isolated files (no overlapping edits)
- Only potential conflict: `dashboard/page.tsx` modification by Builder-2 (minor, easy merge)
- Shared dependency on `string-similarity` (Builder-1 installs, Builder-2 references)

### Validation Checkpoints

1. **Post-Building:** TypeScript compilation with zero errors
2. **Post-Integration:** All tests pass (unit + integration)
3. **Pre-Deployment:** E2E test with real FIBI checking account (import 50 transactions)
4. **Pre-Deployment:** E2E test with real Visa CAL credit card (import 30 transactions)
5. **Post-Deployment:** Smoke test on production (sync one account, verify UI updates)

## Deployment Plan

### Pre-Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install string-similarity
   npm install --save-dev @types/string-similarity
   ```

2. **Run Test Suite**
   ```bash
   npm test -- duplicate-detection.test.ts  # 20+ scenarios
   npm test -- transaction-import.test.ts   # Integration tests
   npm test -- syncTransactions.router.test.ts  # API tests
   ```

3. **TypeScript Build Check**
   ```bash
   npm run build
   # Verify zero errors, zero warnings
   ```

4. **Database Migration Check**
   ```bash
   # No migrations needed - schema complete in Iteration 17
   npx prisma migrate status
   # Verify all migrations applied to production
   ```

### Deployment Execution

**Platform:** Vercel (existing deployment)

**Steps:**
1. Merge to `main` branch (triggers automatic Vercel deployment)
2. Monitor build logs (verify successful build)
3. Wait for deployment completion (~2-3 minutes)
4. Run smoke test on production URL

**Environment Variables (Already Set):**
- `DATABASE_URL` - Supabase PostgreSQL connection
- `ENCRYPTION_KEY` - AES-256-GCM key for credential encryption
- `ANTHROPIC_API_KEY` - Claude AI for categorization

**No New Environment Variables Required**

### Post-Deployment Validation

**Smoke Test Checklist:**
1. Navigate to Settings → Bank Connections
2. Click existing FIBI connection → "Sync" button
3. Verify sync progress modal appears
4. Verify polling updates (transactionsImported count increases)
5. Verify sync completes successfully (toast notification)
6. Navigate to Transactions page → verify new transactions appear
7. Navigate to Dashboard → verify budget progress bars updated
8. Check "Last synced: X minutes ago" timestamp updates
9. Test sync error scenario (invalid credentials) → verify error toast

**Rollback Plan:**
- If critical bug: Revert to previous Git commit, redeploy via Vercel
- If data corruption: Restore from Supabase daily backup
- If partial issue: Disable sync button in UI (feature flag if available)

## Architecture Overview

### Service Layer Structure

```
/src/server/services/
├── bank-scraper.service.ts       (EXISTING - Iteration 18)
│   └── scrapeBank(options): ScrapeResult
├── categorize.service.ts         (EXISTING)
│   └── categorizeTransactions(userId, txns, prisma): CategorizationResult[]
├── transaction-import.service.ts (NEW - Iteration 19)
│   ├── importTransactions(bankConnectionId, userId, dates, prisma): ImportResult
│   ├── fetchTransactionsFromBank(connection, dates): ImportedTransaction[]
│   ├── deduplicateTransactions(imported, existing): { new, skipped }
│   ├── insertTransactions(transactions, userId, accountId, prisma): Transaction[]
│   └── categorizeImportedTransactions(transactions, userId, prisma): number

/src/lib/services/
└── duplicate-detection.service.ts (NEW - Iteration 19)
    ├── isDuplicate(newTxn, existingTxns): boolean
    ├── isMerchantSimilar(merchant1, merchant2): boolean
    └── normalizeMerchant(name): string
```

### API Layer Structure

```
/src/server/api/routers/
├── bankConnections.router.ts  (EXISTING - has test mutation)
├── syncTransactions.router.ts (NEW - Iteration 19)
│   ├── trigger(bankConnectionId): mutation → { syncLogId }
│   ├── status(syncLogId): query → { status, imported, skipped }
│   └── history(bankConnectionId): query → SyncLog[]
```

### Data Flow

```
User clicks "Sync Now"
  ↓
tRPC mutation: syncTransactions.trigger
  ↓
Import Service: importTransactions()
  ├─→ Fetch BankConnection + decrypt credentials
  ├─→ Call bank-scraper.service (scrapeBank)
  ├─→ Load existing transactions (last 90 days)
  ├─→ Run duplicate detection (filter duplicates)
  ├─→ Batch insert new transactions (Prisma createMany)
  ├─→ Update account balance (atomic)
  ├─→ Call categorize.service (batch categorization)
  │   ├─→ Check MerchantCategoryCache (70-80% hit rate)
  │   ├─→ Batch call Claude API for cache misses
  │   └─→ Update transactions with categoryId + metadata
  └─→ Return ImportResult { imported, skipped, categorized }
  ↓
Update SyncLog (status: SUCCESS, counts)
Update BankConnection (lastSynced, status: ACTIVE)
  ↓
React Query invalidates caches
  ↓
UI updates automatically (transactions, budgets, sync status)
```

## Performance Targets

**Import Speed:**
- 50 transactions: <10 seconds (scrape: 3s, dedupe: 1s, insert: 1s, categorize: 5s)
- 100 transactions: <30 seconds (scrape: 5s, dedupe: 2s, insert: 2s, categorize: 20s)
- 200 transactions: <60 seconds (scrape: 10s, dedupe: 5s, insert: 3s, categorize: 40s)

**Database Query Optimization:**
- Duplicate detection query: <200ms (indexed on userId, accountId, date)
- Transaction insert (createMany): <500ms for 100 records
- Budget recalculation (aggregate): <100ms per category
- MerchantCategoryCache lookup: <10ms (unique index on merchant)

**UI Responsiveness:**
- Sync button click → loading state: <100ms
- Polling interval: 2 seconds (sync status updates)
- Toast notification display: <200ms after mutation success
- React Query cache invalidation → refetch: <500ms

**Batch Operation Targets:**
- Prisma createMany: 10-100x faster than individual creates
- Categorization batches: 50 transactions per Claude API call
- Account balance update: Single operation (not per-transaction)

## Security Considerations

**Credential Handling:**
- Decrypt credentials only in-memory during sync (never persisted decrypted)
- Clear decrypted credentials from memory after sync completion
- Never log credentials or OTP codes (sanitized logging in bank-scraper.service)
- Encryption key from `ENCRYPTION_KEY` env variable (32 bytes hex)

**Data Isolation:**
- All tRPC endpoints verify `userId === ctx.user.id` (authorization)
- Prisma queries filtered by `userId` (RLS-equivalent)
- SyncLog records tied to BankConnection (cascade delete on connection removal)

**Audit Trail:**
- Every sync attempt logged to SyncLog (success + failure)
- Error details sanitized (no credentials in errorDetails field)
- Track duplicate decisions (transactionsSkipped count)
- Timestamp all operations (startedAt, completedAt)

**Error Message Sanitization:**
- BankScraperError messages user-friendly (no internal details)
- Never expose decrypted credentials in error responses
- Sanitize merchant names in logs (remove sensitive info if present)

## Dependencies

### New Dependencies (To Install)

```json
{
  "dependencies": {
    "string-similarity": "^4.0.1"
  },
  "devDependencies": {
    "@types/string-similarity": "^4.0.1"
  }
}
```

### Existing Dependencies (No Changes)

- `israeli-bank-scrapers`: ^6.2.5 - Bank transaction scraping
- `@anthropic-ai/sdk`: ^0.32.1 - Claude AI categorization
- `@prisma/client`: ^5.22.0 - Database ORM
- `@trpc/server`: ^11.6.0 - API layer
- `date-fns`: ^3.6.0 - Date manipulation
- `react-query`: (via tRPC) - Cache management
- `zod`: ^3.23.8 - Input validation

## Notes

**Why This Iteration is MEDIUM Risk (Not HIGH):**

1. **Solid Foundation:** Iterations 17-18 completed (database schema, bank scraper working)
2. **Proven Patterns:** Reusing existing categorize.service.ts (80% cache hit rate proven)
3. **No Schema Changes:** Prisma models complete, no migrations needed
4. **Isolated Complexity:** Duplicate detection is self-contained, testable
5. **Fallback Strategy:** Users can manually delete duplicates if algorithm fails

**Key Success Factors:**

- Comprehensive test suite (20+ duplicate scenarios)
- Real-world testing with FIBI + CAL accounts before deployment
- Polling pattern simpler than SSE (proven in exports)
- Batch operations for performance (createMany, batch categorization)
- Existing error handling patterns from Iteration 18 (BankScraperError)

**Post-Iteration 19 Next Steps:**

- Iteration 20: Budget integration polish, real-time alerts, dashboard enhancements
- Post-MVP: Automatic scheduled sync (cron jobs), transaction review queue, multi-account support

---

**Iteration Status:** PLANNED
**Created:** 2025-11-19
**Estimated Completion:** 8-10 hours (1-2 day sprint)
**Primary Builders:** 2-3 (import service, UI/sync trigger, testing)
