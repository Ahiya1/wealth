# Project Vision: Automatic Transaction Sync & Budget Integration

**Created:** 2025-11-18
**Plan:** plan-6
**Status:** VISIONED

---

## Problem Statement

**The manual entry burden kills financial tracking habits.**

Currently, Wealth requires manual transaction entry—every purchase, every charge, every payment must be logged by hand. This creates massive friction:
- Users must remember to open the app after every transaction
- They need to recall amounts, payees, and dates
- Manual entry introduces errors and inconsistencies
- The tedium causes users to abandon tracking entirely

**Result:** Financial data becomes stale, incomplete, and useless for decision-making.

---

## Target Users

**Primary user:** Individual Israeli banking customers using Wealth for personal finance tracking

- Has accounts at The First International Bank of Israel (FIBI - Bank Code 031)
- Uses Visa CAL credit card
- Currently frustrated by manual transaction logging
- Wants real-time budget awareness without manual work
- Values privacy and data security

---

## Core Value Proposition

**Wealth becomes a living financial mirror—transactions flow in automatically, budgets update in real-time, and you always know where you stand.**

**Key benefits:**
1. **Zero manual entry** - Transactions import automatically from bank & credit card
2. **Real-time budget tracking** - Know instantly when you're approaching limits
3. **Intelligent categorization** - AI learns your spending patterns and auto-categorizes
4. **Financial autopilot** - Set it up once, then Wealth runs in the background

---

## Feature Breakdown

### Must-Have (MVP - Iteration 1)

#### 1. **Secure Credential Storage**
- **Description:** Encrypted storage for bank & credit card credentials
- **User story:** As a user, I want to safely store my banking credentials so that Wealth can access my transactions without compromising security
- **Acceptance criteria:**
  - [ ] Credentials stored encrypted (AES-256) in database
  - [ ] Master password or OS keychain integration for encryption key
  - [ ] Never log or expose credentials in plaintext
  - [ ] Support for First International Bank of Israel login (user ID + password)
  - [ ] Support for Visa CAL credit card login (card number + password)
  - [ ] Handle 2FA/OTP codes (SMS verification)

#### 2. **Bank Connection Setup Flow**
- **Description:** User-friendly wizard to connect bank accounts
- **User story:** As a user, I want to easily connect my First International Bank of Israel and Visa CAL credit card accounts so that Wealth can start importing transactions
- **Acceptance criteria:**
  - [ ] Step-by-step connection wizard (Settings → Bank Connections)
  - [ ] Support adding First International Bank of Israel checking account
  - [ ] Support adding Visa CAL credit card
  - [ ] Test connection button to verify credentials work
  - [ ] Visual feedback during connection process
  - [ ] Error handling for invalid credentials, expired passwords, 2FA issues
  - [ ] List of connected accounts with status indicators (active, error, syncing)

#### 3. **Transaction Import Engine**
- **Description:** Background service that fetches transactions from connected accounts
- **User story:** As a user, I want Wealth to automatically fetch my latest transactions so I don't have to enter them manually
- **Acceptance criteria:**
  - [ ] Integration with `israeli-bank-scrapers` npm library
  - [ ] Scrape First International Bank of Israel checking account transactions
  - [ ] Scrape Visa CAL credit card transactions
  - [ ] Import transactions with: date, amount, payee/merchant, account
  - [ ] Detect and skip duplicate transactions (by date + amount + merchant)
  - [ ] Mark imported transactions with `isManual: false`
  - [ ] Store raw merchant names for categorization
  - [ ] Handle date ranges: import last 30 days on first sync, then incremental daily

#### 4. **Automatic Categorization with Learning**
- **Description:** Leverage existing AI categorization + merchant cache for auto-assignment
- **User story:** As a user, I want transactions to be automatically categorized based on merchant names so I don't have to manually assign categories
- **Acceptance criteria:**
  - [ ] After import, run AI categorization on all uncategorized transactions
  - [ ] Use existing `MerchantCategoryCache` for instant categorization
  - [ ] Fall back to Claude AI for new merchants
  - [ ] Cache successful categorizations for future imports
  - [ ] Allow manual override: if user corrects a category, update cache
  - [ ] Display confidence level for AI suggestions (high/medium/low)
  - [ ] Flag low-confidence transactions for user review

#### 5. **Budget Auto-Update & Real-Time Tracking**
- **Description:** Transactions automatically update budget progress
- **User story:** As a user, I want my monthly budgets to reflect my spending in real-time so I always know how much I have left
- **Acceptance criteria:**
  - [ ] Imported transactions immediately count toward category budgets
  - [ ] Budget progress updates automatically (no refresh needed)
  - [ ] Dashboard shows live budget status (spent/remaining)
  - [ ] Visual indicators: green (safe), yellow (approaching limit), red (over budget)
  - [ ] Budget alerts at 75%, 90%, 100% thresholds (existing BudgetAlert system)
  - [ ] Monthly budget cycles (existing month-based budgets)

#### 6. **Manual Sync Trigger**
- **Description:** User-initiated "Sync Now" button to fetch latest transactions on-demand
- **User story:** As a user, I want to manually trigger a sync when I know I just made a purchase so I can see it immediately
- **Acceptance criteria:**
  - [ ] "Sync Now" button in app (Dashboard, Transactions page, Settings)
  - [ ] Loading state during sync with progress indicator
  - [ ] Toast notification: "Syncing transactions..." → "Added X new transactions"
  - [ ] Show last sync timestamp (e.g., "Last synced: 2 minutes ago")
  - [ ] Disable sync button during active sync (prevent concurrent syncs)

### Should-Have (Post-MVP - Iteration 2)

#### 7. **Automatic Background Sync (Scheduled)**
- Cron job or background task that syncs transactions hourly/daily
- Runs without user intervention
- Configurable sync frequency (hourly, every 6 hours, daily)

#### 8. **Transaction Review Queue**
- New imported transactions go to "Review" status first
- User approves batch of transactions before they're finalized
- Allows correcting categorization before budget impact
- "Approve All" button for convenience

#### 9. **Multi-Account Support**
- Connect multiple checking accounts
- Connect multiple credit cards
- Aggregate view across all accounts
- Per-account sync status

#### 10. **Historical Import**
- One-time import of last 3-6 months of transactions
- Backfill transaction history for trend analysis
- Optional: only import, don't affect past budgets

#### 11. **Smart Duplicate Detection**
- More sophisticated duplicate matching (fuzzy matching on merchant names)
- Handle credit card pending vs. posted transactions
- Detect transfers between accounts (don't count twice)

### Could-Have (Future)

- Official Open Banking API integration (when PSD2 license obtained)
- Support for other Israeli banks (Hapoalim, Leumi, Discount, Mizrahi)
- Support for other credit card companies (Max, Isracard)
- Push notifications for budget alerts
- SMS alerts when sync fails or credentials expire
- Custom categorization rules (e.g., "If merchant contains 'Shufersal', always categorize as Groceries")

---

## User Flows

### Flow 1: Initial Bank Connection Setup

**Steps:**
1. User navigates to Settings → Bank Connections
2. Clicks "Add Bank Account"
3. Selects bank: "First International Bank of Israel (031)"
4. Enters credentials: User ID, Password
5. Handles 2FA: Receives SMS code, enters it
6. System tests connection → Success
7. System prompts: "Import last 30 days of transactions?"
8. User confirms
9. System imports transactions, runs AI categorization
10. User sees: "Imported 47 transactions" notification
11. User reviews categorizations, corrects if needed
12. Budgets automatically update to reflect new spending

**Edge cases:**
- **Invalid credentials:** Show error message, allow retry
- **2FA timeout:** Request user re-enter OTP
- **No transactions found:** Show "Account connected, no new transactions"
- **Import fails mid-process:** Rollback partial import, allow retry

**Error handling:**
- **Expired password:** Prompt user to update credentials
- **Account locked:** Show clear message directing user to bank
- **Network timeout:** Retry with exponential backoff, show status

### Flow 2: Daily Automatic Sync (Manual Trigger)

**Steps:**
1. User makes a purchase at "SuperSal" (grocery store) for ₪127.50
2. User opens Wealth app (1 hour later)
3. User taps "Sync Now" button on Dashboard
4. System shows loading: "Syncing transactions..."
5. System scrapes CAL credit card, finds 1 new transaction
6. System checks MerchantCategoryCache: "SuperSal" → "Groceries"
7. Transaction auto-categorized as "Groceries" (high confidence)
8. System updates "Groceries" budget: ₪1,200 budgeted, ₪827.50 spent (₪372.50 remaining)
9. Dashboard shows budget progress bar updated (68% used, yellow)
10. User sees transaction in feed with green checkmark (auto-categorized)

**Edge cases:**
- **Duplicate transaction already manually entered:** System detects match, skips import, shows "0 new transactions"
- **Unknown merchant:** AI suggests category, marks as "low confidence", user can review
- **Multiple new transactions:** Batch import, show count "Added 5 new transactions"

**Error handling:**
- **Sync fails (network error):** Show "Sync failed, will retry later"
- **Credentials expired:** Show notification "Please update your CAL credentials in Settings"

### Flow 3: Budget Alert After Auto-Import

**Steps:**
1. Background sync runs (hourly)
2. Imports transaction: "Paz Gas Station" ₪350 → "Transportation"
3. Transportation budget now at 92% (₪1,150 / ₪1,250)
4. System triggers 90% budget alert (BudgetAlert threshold)
5. User sees alert on next app open: "⚠️ Transportation budget at 92% (₪100 remaining)"
6. User can tap to see breakdown of Transportation spending this month

**Edge cases:**
- **Over budget:** Alert shows "🚨 Transportation budget exceeded by ₪50"
- **Multiple categories hit thresholds:** Show consolidated alert "3 budgets need attention"

---

## Data Model Overview

**Key entities:**

### 1. **BankConnection** (NEW)
- Fields: `id`, `userId`, `bank` (enum: FIBI, VISA_CAL), `accountType` (enum: CHECKING, CREDIT_CARD), `encryptedCredentials` (JSON), `accountIdentifier` (last 4 digits), `status` (enum: ACTIVE, ERROR, EXPIRED), `lastSynced`, `lastSuccessfulSync`, `errorMessage`, `createdAt`, `updatedAt`
- Relationships: Belongs to User, Links to Account

### 2. **SyncLog** (NEW)
- Fields: `id`, `bankConnectionId`, `startedAt`, `completedAt`, `status` (enum: SUCCESS, PARTIAL, FAILED), `transactionsImported`, `transactionsSkipped`, `errorDetails`, `createdAt`
- Relationships: Belongs to BankConnection

### 3. **Transaction** (EXISTING - Enhanced)
- New fields: `rawMerchantName` (original merchant name from bank), `importSource` (enum: MANUAL, HAPOALIM, CAL), `importedAt`, `categorizedBy` (enum: USER, AI_CACHED, AI_SUGGESTED), `categorizationConfidence` (enum: HIGH, MEDIUM, LOW, null)
- Existing: `id`, `userId`, `accountId`, `date`, `amount`, `payee`, `categoryId`, `notes`, `tags`, `isManual`, `createdAt`, `updatedAt`

### 4. **MerchantCategoryCache** (EXISTING - Already Implemented)
- Fields: `merchant` (normalized), `categoryId`, `createdAt`, `updatedAt`
- Used for instant categorization on future imports

### 5. **Budget** (EXISTING - No Changes Needed)
- Already tracks: `userId`, `categoryId`, `amount`, `month`, `rollover`, `isRecurring`
- Budget progress already calculated via `budgets.progress` endpoint

---

## Technical Requirements

**Must support:**
- Encrypted credential storage (AES-256-GCM or similar)
- Integration with `israeli-bank-scrapers` npm library (https://github.com/eshaham/israeli-bank-scrapers)
- Background job scheduling (for future automatic sync)
- Real-time UI updates (WebSocket or polling for sync status)
- Duplicate transaction detection (date + amount + merchant fuzzy match)
- Graceful error handling for banking API failures
- 2FA/OTP handling (SMS codes, security questions)

**Constraints:**
- Must work with First International Bank of Israel (031) and Visa CAL credit card initially
- Screen scraping approach (not official APIs) - may break if bank UIs change
- Sync limited to last 30-90 days (bank transaction history limits)
- Israeli banks only (NIS currency, Hebrew merchant names)

**Preferences:**
- Use existing Prisma + tRPC + Next.js stack
- Leverage existing AI categorization service (`categorize.service.ts`)
- Reuse existing budget progress calculations (`budgets.router.ts`)
- Store sensitive data encrypted at rest
- Use toast notifications for sync feedback (existing UI pattern)

---

## Success Criteria

**The MVP is successful when:**

1. **Zero Manual Entry for Credit Card Transactions**
   - Metric: % of transactions imported automatically vs. manually entered
   - Target: >90% of credit card transactions auto-imported

2. **Accurate Auto-Categorization**
   - Metric: % of imported transactions correctly categorized by AI/cache
   - Target: >80% categorization accuracy (measured by user overrides)

3. **Real-Time Budget Awareness**
   - Metric: User sees updated budget progress within 1 minute of sync completion
   - Target: Budget UI updates immediately after import

4. **Reliable Daily Sync**
   - Metric: % of successful daily syncs (manual trigger)
   - Target: >95% success rate (excluding credential expiration)

5. **User Adoption**
   - Metric: % of users who connect at least 1 bank account within 7 days
   - Target: >50% of active users connect a bank

---

## Out of Scope

**Explicitly not included in MVP:**

- Automatic scheduled background sync (manual "Sync Now" only)
- Transaction review/approval queue (transactions import directly)
- Multi-account support (focus on 1 checking + 1 credit card)
- Historical import beyond 30 days
- Support for other Israeli banks (Leumi, Discount, Mizrahi)
- Official Open Banking API integration (future: when licensed)
- Push notifications for budget alerts
- Custom categorization rules engine
- Bill payment integration
- Investment account sync

**Why:** Focus MVP on proving the core value: automatic import + categorization + budget tracking for a single user's primary accounts. Expand to advanced features after validating user adoption.

---

## Assumptions

1. Users have online banking access enabled for First International Bank of Israel and Visa CAL
2. Users are comfortable storing encrypted credentials in Wealth (trust established)
3. `israeli-bank-scrapers` library supports First International Bank of Israel and Visa CAL reliably
4. Credit card transactions appear in CAL portal within 24-48 hours (bank processing delay)
5. Merchant names from banks are consistent enough for AI categorization
6. Users will manually trigger sync daily (until automatic sync implemented)
7. 2FA codes arrive via SMS within reasonable time (30-60 seconds)
8. Bank UI changes are infrequent (screen scraping resilience)

---

## Open Questions

1. **Encryption key management:** Use user-entered master password, derive from Supabase auth, or OS keychain?
2. **Sync frequency:** How often should users be encouraged to sync? Once daily, multiple times, on-demand only?
3. **Transaction matching algorithm:** What's the best strategy for duplicate detection? (date + amount + fuzzy merchant match?)
4. **2FA handling UX:** How to handle OTP entry during sync? Modal dialog, SMS auto-read (Android), manual paste?
5. **Credential expiration:** How to gracefully prompt users to update expired passwords without alarming them?
6. **Pending vs. posted transactions:** Should we import pending credit card charges, or wait until posted?
7. **Error recovery:** If a sync fails midway, should we retry immediately, wait, or notify the user?
8. **Multi-currency handling:** If a credit card transaction is in foreign currency (USD, EUR), how to handle conversion to NIS?

---

## Implementation Approach

### Phase 1: Foundation (Iterations 17-18)
- Database schema: Add `BankConnection`, `SyncLog` models
- Prisma migrations
- Credential encryption utilities
- Bank connection setup UI (Settings page)

### Phase 2: Import Engine (Iterations 19-20)
- Integrate `israeli-bank-scrapers`
- Build transaction import service
- Duplicate detection logic
- Manual "Sync Now" trigger + UI feedback

### Phase 3: Auto-Categorization Integration (Iteration 21)
- Connect import pipeline to existing AI categorization
- Enhance `MerchantCategoryCache` usage
- Add confidence scoring
- Category correction flow

### Phase 4: Budget Integration & Polish (Iteration 22)
- Real-time budget updates
- Dashboard enhancements (last sync time, quick sync button)
- Error handling & user messaging
- Testing with real bank accounts

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning

---

## Technical Research Notes

### Bank Integration Options

**The First International Bank of Israel (FIBI - Bank Code 031):**
- Part of Israel's Open Banking initiative (PSD2-inspired framework)
- Official APIs require Bank of Israel license
- **MVP approach:** Use `israeli-bank-scrapers` (screen scraping)

**Visa CAL (Israel Credit Cards):**
- No public API for transaction retrieval
- Visa CAL mobile app has transaction sync features
- **MVP approach:** Use `israeli-bank-scrapers` (screen scraping)

**israeli-bank-scrapers Library:**
- Open-source: https://github.com/eshaham/israeli-bank-scrapers
- Supports: FIBI (First International Bank), Hapoalim, Leumi, Discount, Mizrahi, Visa CAL, Max, Isracard
- Returns: Transactions with date, amount, merchant name, status (pending/posted)
- **Pros:** Works today, no license needed, active maintenance
- **Cons:** Screen scraping fragility, 2FA complexity, rate limiting

**Future Migration Path:**
- Start with scraping for MVP (fast, no red tape)
- Apply for PSD2 license if app gains traction
- Migrate to official Open Banking APIs for stability

---

## Security Considerations

**Credential Storage:**
- Encrypt credentials with AES-256-GCM
- Derive encryption key from user's Supabase auth session token
- Never store encryption key in database
- Credentials decrypted only in-memory during sync

**Data Transmission:**
- `israeli-bank-scrapers` connects directly to bank sites (HTTPS)
- No proxy or intermediary (credentials never leave user's server/edge function)
- Supabase RLS policies enforce user-level data isolation

**Audit Trail:**
- Log all sync attempts in `SyncLog` (success/failure, timestamp)
- Do NOT log credentials or sensitive data
- Allow users to delete bank connections (cascade delete credentials)

**Compliance:**
- GDPR-compliant: User can export/delete all data
- Inform users: "Wealth uses screen scraping, not official APIs"
- Disclaimer: "Sync may fail if bank changes website"
