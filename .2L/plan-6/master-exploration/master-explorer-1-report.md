# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Transform Wealth from a manual transaction tracking app into an automated financial mirror by implementing secure Israeli bank integration (First International Bank of Israel + Visa CAL credit card) with automatic transaction import, AI-powered categorization leveraging existing infrastructure, real-time budget tracking, and encrypted credential storage - eliminating the tedious manual entry burden that causes users to abandon financial tracking.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features (MVP), 5 should-have features (post-MVP), 3 could-have features (future)
- **User stories/acceptance criteria:** 37+ acceptance criteria across 6 core MVP features
- **Estimated total work:** 24-32 hours

**Feature Breakdown (MVP):**
1. Secure Credential Storage (6 acceptance criteria)
2. Bank Connection Setup Flow (7 acceptance criteria)
3. Transaction Import Engine (8 acceptance criteria)
4. Automatic Categorization with Learning (7 acceptance criteria)
5. Budget Auto-Update & Real-Time Tracking (6 acceptance criteria)
6. Manual Sync Trigger (5 acceptance criteria)

**Additional Complexity Factors:**
- New npm dependency integration (`israeli-bank-scrapers`)
- Two new database models required (BankConnection, SyncLog)
- Enhanced existing Transaction model with 5+ new fields
- Encryption/decryption infrastructure for sensitive credentials
- 2FA/OTP handling complexity
- Screen scraping resilience (bank UI changes)
- 3 detailed user flows with extensive edge cases and error handling
- Real-time UI updates for sync status
- Integration with existing AI categorization service
- 5 post-MVP features identified (automatic background sync, transaction review queue, multi-account support, historical import, smart duplicate detection)

### Complexity Rating
**Overall Complexity: VERY COMPLEX**

**Rationale:**
- **20+ distinct features across MVP and post-MVP:** 6 must-have features span authentication, data import, AI integration, real-time updates, encryption, and user flows - each with significant scope
- **Multi-layer architecture required:**
  - Security layer (AES-256-GCM encryption, credential management, 2FA handling)
  - Integration layer (`israeli-bank-scrapers` library, bank-specific adapters)
  - Data layer (2 new models + Transaction enhancements + Prisma migrations)
  - Business logic layer (duplicate detection, import orchestration, error recovery)
  - AI layer (existing categorization service integration + merchant cache optimization)
  - Real-time layer (WebSocket or polling for sync status updates)
  - UI layer (Settings wizard, Dashboard sync button, status indicators, error handling)
- **High-risk external dependencies:**
  - Screen scraping approach inherently fragile (bank UI changes break integration)
  - `israeli-bank-scrapers` library maintenance dependency
  - 2FA/OTP timing unpredictability
  - Bank rate limiting and blocking risks
- **Security-critical requirements:**
  - Encrypted credential storage (AES-256-GCM)
  - Master password or keychain integration
  - Secure key derivation from Supabase auth
  - Credentials decrypted only in-memory
  - Audit trail for all sync attempts
  - GDPR compliance (export/delete all data)
- **Complex state management:**
  - Sync in progress vs idle states
  - Connection active vs error vs expired states
  - Transaction pending vs posted states
  - Budget recalculation triggers
  - Cache invalidation on manual category corrections
- **Performance considerations:**
  - Initial import (30 days of transactions)
  - Incremental daily imports
  - Duplicate detection at scale (10k+ transactions)
  - AI categorization batch processing
  - Real-time budget progress calculations
- **Integration challenges:**
  - Existing Transaction model has `isManual` field - must preserve for legacy data
  - Existing AI categorization service expects specific input format
  - Existing Budget progress endpoint must handle imported transactions
  - MerchantCategoryCache must support fuzzy merchant name matching
  - Existing tRPC router patterns must be followed

---

## Architectural Analysis

### Major Components Identified

1. **Credential Encryption Infrastructure (Backend + Security)**
   - **Purpose:** Secure storage and retrieval of banking credentials using AES-256-GCM encryption
   - **Complexity:** HIGH
   - **Why critical:** Foundation of entire system - security breach would expose user banking credentials; must handle encryption key management, secure key derivation, and in-memory-only decryption
   - **Components needed:**
     - Encryption service (`src/server/services/encryption.service.ts`):
       - `encrypt(plaintext: string, userId: string): Promise<string>` - Derive user-specific key from Supabase auth session, encrypt with AES-256-GCM, return base64 ciphertext
       - `decrypt(ciphertext: string, userId: string): Promise<string>` - Validate user session, derive key, decrypt, return plaintext
       - `hashPassword(password: string): Promise<string>` - Hash credentials before encryption (defense in depth)
       - Key derivation: Use `crypto.pbkdf2` with user's Supabase auth UID as salt
     - Environment variable: `BANK_ENCRYPTION_KEY` (master key, 32-byte hex, generated via `openssl rand -hex 32`)
     - Security constraints:
       - Never log decrypted credentials
       - Credentials decrypted only during sync operations
       - Clear from memory immediately after use
       - Use constant-time comparison for validation
   - **Technology choice:** Node.js `crypto` module (built-in, battle-tested, no external dependencies)

2. **BankConnection Model & Management (Database)**
   - **Purpose:** Store encrypted credentials, connection metadata, sync status, and error tracking for each linked bank/credit card account
   - **Complexity:** MEDIUM
   - **Why critical:** Central data model linking users to their financial institutions; drives sync orchestration and error recovery
   - **Prisma schema:**
     ```prisma
     model BankConnection {
       id                    String   @id @default(cuid())
       userId                String
       bank                  BankType // enum: FIBI, VISA_CAL
       accountType           AccountType // enum: CHECKING, CREDIT_CARD (reuse existing enum)
       encryptedCredentials  String   @db.Text // JSON: { userId, password, otpSecret? }
       accountIdentifier     String   // Last 4 digits for user display
       status                ConnectionStatus @default(ACTIVE) // enum: ACTIVE, ERROR, EXPIRED, DISABLED
       lastSynced            DateTime?
       lastSuccessfulSync    DateTime?
       errorMessage          String?  @db.Text
       syncFrequency         String   @default("MANUAL") // MANUAL, HOURLY, DAILY (for future)
       createdAt             DateTime @default(now())
       updatedAt             DateTime @updatedAt

       user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
       linkedAccountId       String?  // Link to existing Account model
       linkedAccount         Account? @relation(fields: [linkedAccountId], references: [id])
       syncLogs              SyncLog[]

       @@index([userId])
       @@index([status])
       @@index([lastSynced])
     }

     enum BankType {
       FIBI           // First International Bank of Israel (031)
       VISA_CAL       // Visa CAL credit card
       // Future: HAPOALIM, LEUMI, DISCOUNT, MIZRAHI, MAX, ISRACARD
     }

     enum ConnectionStatus {
       ACTIVE         // Connection working, credentials valid
       ERROR          // Last sync failed (transient error, retry recommended)
       EXPIRED        // Credentials expired (user must re-authenticate)
       DISABLED       // User manually disabled connection
     }
     ```
   - **Relationships:**
     - Belongs to User (cascade delete on user deletion)
     - Optional link to existing Account model (one BankConnection can populate one Account)
     - One-to-many with SyncLog (audit trail)

3. **SyncLog Model & Audit Trail (Database)**
   - **Purpose:** Comprehensive audit trail for all sync attempts with success/failure tracking, transaction counts, error details
   - **Complexity:** LOW
   - **Why critical:** Debugging sync failures, user transparency ("why didn't my transaction import?"), compliance audit trail
   - **Prisma schema:**
     ```prisma
     model SyncLog {
       id                    String   @id @default(cuid())
       bankConnectionId      String
       startedAt             DateTime @default(now())
       completedAt           DateTime?
       status                SyncStatus @default(IN_PROGRESS)
       transactionsImported  Int      @default(0)
       transactionsSkipped   Int      @default(0) // Duplicates
       errorDetails          Json?    // { errorCode, message, stack, bankResponse }
       dateRangeStart        DateTime?
       dateRangeEnd          DateTime?
       createdAt             DateTime @default(now())

       bankConnection        BankConnection @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)

       @@index([bankConnectionId])
       @@index([startedAt])
       @@index([status])
     }

     enum SyncStatus {
       IN_PROGRESS    // Sync currently running
       SUCCESS        // All transactions imported successfully
       PARTIAL        // Some transactions imported, some failed
       FAILED         // Complete failure (network error, invalid credentials, etc.)
     }
     ```
   - **Use cases:**
     - Display "Last synced: 2 minutes ago" in UI
     - Show error message "Sync failed: Invalid password. Please update credentials."
     - Analytics: Sync success rate, average import count, common error patterns

4. **Transaction Model Enhancements (Database)**
   - **Purpose:** Extend existing Transaction model to distinguish imported vs manual transactions, store raw merchant names, track categorization confidence
   - **Complexity:** LOW (additive changes only)
   - **Why critical:** Enables duplicate detection, merchant cache lookup, AI confidence scoring, import source tracking
   - **New fields to add:**
     ```prisma
     model Transaction {
       // ... existing fields ...

       // Import tracking (NEW)
       importSource              ImportSource? // null for existing manual transactions
       importedAt                DateTime?
       rawMerchantName           String?      // Original merchant name from bank (before normalization)
       bankTransactionId         String?      @unique // Bank's unique ID (for duplicate detection)

       // AI categorization tracking (NEW)
       categorizedBy             CategorizationSource @default(USER)
       categorizationConfidence  ConfidenceLevel?

       // ... existing relationships ...
     }

     enum ImportSource {
       MANUAL         // User manually entered (legacy + new manual entries)
       FIBI           // Imported from First International Bank
       VISA_CAL       // Imported from Visa CAL credit card
       // Future: HAPOALIM, LEUMI, etc.
     }

     enum CategorizationSource {
       USER           // User manually selected category
       AI_CACHED      // Retrieved from MerchantCategoryCache (instant)
       AI_SUGGESTED   // Claude API categorization (required API call)
     }

     enum ConfidenceLevel {
       HIGH           // >90% confidence (cache hit or strong AI match)
       MEDIUM         // 70-90% confidence (AI suggested, but uncertain)
       LOW            // <70% confidence (fallback to Miscellaneous)
     }
     ```
   - **Migration strategy:**
     - All existing transactions default to `importSource: MANUAL`, `categorizedBy: USER`
     - No data migration needed (nullable fields, sensible defaults)

5. **Israeli Bank Scrapers Integration Service (Backend)**
   - **Purpose:** Wrapper service around `israeli-bank-scrapers` npm library to fetch transactions from FIBI and Visa CAL
   - **Complexity:** HIGH
   - **Why critical:** Core import functionality; must handle 2FA, timeouts, rate limiting, bank UI changes, error recovery
   - **Service architecture (`src/server/services/bank-import.service.ts`):**
     ```typescript
     interface BankImportService {
       // Main import function
       importTransactions(
         bankConnectionId: string,
         userId: string,
         dateRange?: { startDate: Date; endDate: Date }
       ): Promise<ImportResult>

       // Test connection (used during setup wizard)
       testConnection(
         bank: BankType,
         credentials: BankCredentials
       ): Promise<TestConnectionResult>

       // 2FA handler (interactive OTP input)
       handle2FA(
         sessionId: string,
         otpCode: string
       ): Promise<void>
     }

     interface ImportResult {
       success: boolean
       transactionsImported: number
       transactionsSkipped: number
       errors: ImportError[]
       syncLogId: string
     }

     interface BankCredentials {
       userId?: string      // For FIBI
       password: string
       cardNumber?: string  // For Visa CAL
       otpSecret?: string   // For auto-OTP (future)
     }
     ```
   - **Implementation details:**
     - Install `israeli-bank-scrapers` npm package
     - Create bank-specific adapters:
       - `FIBIAdapter.ts` - Handle FIBI login, navigation, transaction parsing
       - `VisaCALAdapter.ts` - Handle Visa CAL login, transaction parsing
     - Transaction normalization:
       - Parse Hebrew merchant names (RTL text handling)
       - Convert NIS amounts (handle comma/period separators)
       - Normalize dates (handle bank-specific date formats)
       - Extract transaction type (debit/credit, pending/posted)
     - Error handling:
       - Network timeouts: Retry with exponential backoff (3 attempts)
       - Invalid credentials: Update BankConnection status to EXPIRED
       - 2FA timeout: Prompt user to re-enter OTP
       - Rate limiting: Implement backoff, log warning, retry later
       - Bank UI changes: Catch scraping errors, log for investigation, notify user
     - Duplicate detection:
       - Check `bankTransactionId` (if provided by bank)
       - Fallback: Fuzzy match on date + amount + merchant (within 24 hours)
       - Skip duplicates, increment `transactionsSkipped` counter
   - **Dependencies:**
     - `israeli-bank-scrapers` (core library)
     - `puppeteer` or `playwright` (headless browser automation - likely bundled with scrapers)
     - `date-fns` (existing - date parsing and formatting)

6. **Bank Connection Setup Wizard (Frontend)**
   - **Purpose:** Step-by-step UI flow in Settings to link bank accounts with credential validation and initial import
   - **Complexity:** MEDIUM
   - **Why critical:** First-time user experience; must be intuitive, secure-feeling, and handle errors gracefully
   - **UI Flow (`src/app/(dashboard)/settings/bank-connections/page.tsx`):**
     - **Step 1: Select Bank**
       - Radio buttons: First International Bank of Israel (FIBI), Visa CAL Credit Card
       - Display bank logos, descriptions
       - "Next" button → Step 2
     - **Step 2: Enter Credentials**
       - For FIBI: User ID (text), Password (password field with show/hide toggle)
       - For Visa CAL: Card Number (masked input), Password
       - Security message: "Your credentials are encrypted and never stored in plain text"
       - "Test Connection" button (calls `bank-import.service.testConnection()`)
       - Loading state during test
       - Success: Green checkmark → Step 3
       - Error: Red error message, allow retry
     - **Step 3: Handle 2FA (if required)**
       - SMS OTP input (6-digit code)
       - "Resend OTP" button
       - 60-second countdown timer
       - Auto-submit on 6 digits entered
       - Error handling: "OTP expired, please request a new code"
     - **Step 4: Initial Import**
       - Prompt: "Import last 30 days of transactions?"
       - Date range picker (default: last 30 days, max: 90 days)
       - "Import Transactions" button
       - Progress indicator: "Importing transactions... (this may take 1-2 minutes)"
       - Success: "Imported 47 transactions. Review categorizations now?"
       - Button: "Review Transactions" → Transactions page filtered to imported
     - **Step 5: Completion**
       - Success message: "Bank connection added successfully!"
       - Display: Account name, last 4 digits, last synced timestamp
       - "Add Another Account" button → Step 1
       - "Done" button → Settings page
   - **Connected Accounts List:**
     - Table showing all connected accounts
     - Columns: Bank, Account (last 4 digits), Status (badge), Last Synced, Actions
     - Status badges: Active (green), Error (red), Expired (yellow)
     - Actions dropdown: Sync Now, Edit Credentials, Disconnect
     - Empty state: "No bank connections yet. Connect your first account to start automatic imports."
   - **Error states:**
     - Invalid credentials: "Login failed. Please check your user ID and password."
     - 2FA timeout: "Verification code expired. Please try again."
     - Network error: "Connection failed. Please check your internet connection and try again."
     - Bank maintenance: "Bank is currently unavailable. Please try again later."
   - **Components to create:**
     - `BankConnectionWizard.tsx` - Multi-step wizard container
     - `BankSelector.tsx` - Step 1 component
     - `CredentialsForm.tsx` - Step 2 component (reusable for edit credentials)
     - `OTPInput.tsx` - Step 3 component (6-digit code input)
     - `InitialImportPrompt.tsx` - Step 4 component
     - `ConnectionSuccessMessage.tsx` - Step 5 component
     - `ConnectedAccountsList.tsx` - Main settings page display

7. **Manual Sync Trigger & Status UI (Frontend)**
   - **Purpose:** User-initiated "Sync Now" button with real-time progress updates and last sync timestamp display
   - **Complexity:** MEDIUM
   - **Why critical:** Primary interaction for MVP (before automatic background sync); must provide clear feedback and handle errors
   - **UI Locations:**
     - **Dashboard:** Floating "Sync Now" button (bottom-right corner on mobile, top-right on desktop)
     - **Transactions page:** "Sync" button in header (next to "Add Transaction")
     - **Settings > Bank Connections:** "Sync Now" in each account row
   - **Button states:**
     - Idle: "Sync Now" with sync icon
     - Loading: "Syncing..." with spinning icon, button disabled
     - Success: "Synced!" with checkmark, auto-revert to idle after 2 seconds
     - Error: "Sync Failed" with error icon, show error message on hover
   - **Real-time updates:**
     - Toast notification: "Syncing transactions from First International Bank..."
     - Progress: "Importing transactions... (0/2 accounts complete)"
     - Success toast: "Added 5 new transactions from Visa CAL"
     - Error toast: "Sync failed for First International Bank: Invalid password. Update credentials in Settings."
   - **Last sync timestamp:**
     - Display: "Last synced: 2 minutes ago" (humanized format using `date-fns`)
     - Update after each successful sync
     - Click to view sync history (opens modal with SyncLog table)
   - **Sync logic (tRPC mutation):**
     - Fetch all active BankConnections for user
     - For each connection:
       - Create SyncLog record (status: IN_PROGRESS)
       - Decrypt credentials
       - Call `bank-import.service.importTransactions()`
       - Update SyncLog (status: SUCCESS/FAILED, transaction counts)
       - Update BankConnection (lastSynced, status, errorMessage)
     - Return summary: "Imported X new transactions from Y accounts"
   - **Conflict handling:**
     - Prevent concurrent syncs: Check for existing SyncLog with status IN_PROGRESS
     - If sync already running: Show message "Sync already in progress. Please wait."
     - Timeout: If sync runs >2 minutes, mark as FAILED, allow retry

8. **AI Categorization Integration (Backend)**
   - **Purpose:** Leverage existing `categorize.service.ts` to auto-categorize imported transactions with merchant cache optimization
   - **Complexity:** LOW (reuse existing service)
   - **Why critical:** Reduces manual categorization burden; existing infrastructure proven and tested
   - **Integration points:**
     - After importing transactions, call `categorizeTransactions()` for all uncategorized
     - Pass imported transactions with `rawMerchantName` as payee
     - Existing service will:
       - Check `MerchantCategoryCache` for instant match (HIGH confidence)
       - Fall back to Claude API for new merchants (MEDIUM/LOW confidence)
       - Cache successful categorizations for future imports
     - Update Transaction records:
       - Set `categoryId` from categorization result
       - Set `categorizedBy: AI_CACHED` (cache hit) or `AI_SUGGESTED` (API call)
       - Set `categorizationConfidence: HIGH/MEDIUM/LOW`
   - **Merchant cache optimization:**
     - Normalize merchant names before cache lookup:
       - Lowercase
       - Remove extra whitespace
       - Remove special characters (Hebrew niqqud, punctuation)
       - Trim to max 100 characters
     - Fuzzy matching for Hebrew merchant names:
       - Handle variations: "סופרסל" vs "סופר סל" vs "SUPERSOL"
       - Use Levenshtein distance for similarity matching (threshold: 90%)
     - User correction flow:
       - When user manually changes category for imported transaction:
       - Update `MerchantCategoryCache` with new mapping
       - Re-categorize any uncategorized transactions with same merchant
       - Update `categorizedBy: USER` for corrected transaction
   - **Confidence scoring:**
     - HIGH: Cache hit (merchant seen before)
     - MEDIUM: Claude API suggested, category name exact match
     - LOW: Claude API suggested "Miscellaneous" or uncertain
   - **UI display:**
     - HIGH confidence: Green checkmark badge "Auto-categorized"
     - MEDIUM confidence: Yellow badge "Suggested - review"
     - LOW confidence: Red badge "Review required"
     - Click badge → open category selector for manual correction

9. **Budget Auto-Update System (Backend)**
   - **Purpose:** Real-time budget progress recalculation when transactions are imported, leveraging existing budget progress endpoint
   - **Complexity:** LOW (reuse existing logic)
   - **Why critical:** Core value proposition - budgets must update immediately to reflect new spending
   - **Implementation:**
     - Existing endpoint: `budgets.progress` (calculates spent/remaining per category per month)
     - No changes needed to endpoint logic
     - After transaction import, budget progress automatically recalculates on next page load
     - For real-time updates (without page refresh):
       - Option 1 (simple): Invalidate React Query cache for `budgets.progress` after import
       - Option 2 (advanced): WebSocket or Server-Sent Events for live updates
       - Recommendation: Option 1 for MVP (simpler, proven pattern in existing codebase)
   - **Budget alert triggers:**
     - Existing `BudgetAlert` system checks thresholds (75%, 90%, 100%)
     - After import, check if any budgets crossed thresholds
     - Create alert records if needed
     - Display alerts on Dashboard:
       - Toast notification: "Budget alert: Groceries at 92% (₪100 remaining)"
       - Alert icon badge on Budget nav item
       - Alert section on Dashboard showing all active alerts
   - **UI updates:**
     - Dashboard budget progress bars update automatically (React Query refetch)
     - Budget page shows updated spent/remaining
     - Transaction feed shows new imported transactions at top (sorted by date desc)

10. **Duplicate Detection Engine (Backend)**
    - **Purpose:** Prevent importing the same transaction multiple times using multi-strategy matching
    - **Complexity:** MEDIUM
    - **Why critical:** Duplicate transactions corrupt budget data and user trust; must be highly reliable
    - **Detection strategies (in order of preference):**
      1. **Bank Transaction ID match (if available):**
         - Check if `bankTransactionId` already exists in database
         - 100% reliable if bank provides unique IDs
         - FIBI and Visa CAL may or may not provide this
      2. **Exact match (date + amount + merchant):**
         - Same date (day precision, ignore time)
         - Exact amount (to 2 decimal places)
         - Exact merchant name (normalized)
         - Confidence: 95% (very reliable)
      3. **Fuzzy match (date range + amount + similar merchant):**
         - Date within 24 hours
         - Amount exact
         - Merchant name similarity >90% (Levenshtein distance)
         - Confidence: 85% (reliable for Hebrew merchant variations)
      4. **Manual transaction override:**
         - User manually entered transaction before import
         - Check if transaction exists in same date range + amount
         - Prompt user: "Transaction already exists (manual entry). Replace with imported version?"
         - Options: Replace, Keep Manual, Import Anyway
    - **Algorithm pseudocode:**
      ```typescript
      async function isDuplicate(
        importedTxn: ImportedTransaction,
        userId: string
      ): Promise<{ isDuplicate: boolean; matchedTxnId?: string; confidence: number }> {
        // Strategy 1: Bank ID match
        if (importedTxn.bankTransactionId) {
          const existing = await prisma.transaction.findUnique({
            where: { bankTransactionId: importedTxn.bankTransactionId }
          })
          if (existing) return { isDuplicate: true, matchedTxnId: existing.id, confidence: 1.0 }
        }

        // Strategy 2: Exact match
        const exactMatch = await prisma.transaction.findFirst({
          where: {
            userId,
            date: importedTxn.date,
            amount: importedTxn.amount,
            payee: normalizeMerchantName(importedTxn.rawMerchantName)
          }
        })
        if (exactMatch) return { isDuplicate: true, matchedTxnId: exactMatch.id, confidence: 0.95 }

        // Strategy 3: Fuzzy match
        const dateRange = {
          gte: subDays(importedTxn.date, 1),
          lte: addDays(importedTxn.date, 1)
        }
        const candidates = await prisma.transaction.findMany({
          where: {
            userId,
            date: dateRange,
            amount: importedTxn.amount
          }
        })

        for (const candidate of candidates) {
          const similarity = calculateSimilarity(
            normalizeMerchantName(importedTxn.rawMerchantName),
            candidate.payee
          )
          if (similarity > 0.9) {
            return { isDuplicate: true, matchedTxnId: candidate.id, confidence: similarity }
          }
        }

        // No match found
        return { isDuplicate: false, confidence: 0 }
      }
      ```
    - **Edge cases:**
      - Pending vs posted transactions (credit cards):
        - Import pending transaction → next day import posted version
        - Solution: Mark pending transactions, replace when posted version arrives
        - Add `transactionStatus` field: PENDING, POSTED
      - Recurring payments (same amount, same merchant, different dates):
        - Don't flag as duplicate (expected behavior)
        - Fuzzy match limited to 24-hour window prevents false positives
      - Split transactions (user manually split, bank shows combined):
        - Complex edge case - defer to post-MVP
        - For MVP: Import full transaction, user can manually reconcile
      - Multi-currency transactions (foreign currency, NIS conversion):
        - Bank shows original currency + NIS equivalent
        - Match on NIS amount (converted)
        - Store original currency in notes field (future enhancement)

### Technology Stack Implications

**Database (PostgreSQL via Prisma)**
- **Current state:** Mature schema with 12 models, Supabase-hosted, connection pooling configured
- **Requirements:**
  - Add 2 new models: `BankConnection`, `SyncLog`
  - Add 3 new enums: `BankType`, `ConnectionStatus`, `SyncStatus`
  - Enhance `Transaction` model with 5+ new fields
  - Add 2 new enums for transactions: `ImportSource`, `CategorizationSource`, `ConfidenceLevel`
- **Migration complexity:** MEDIUM
  - New tables straightforward
  - Transaction model changes are additive (nullable fields, default values)
  - Indexes needed on: `BankConnection.userId`, `BankConnection.status`, `SyncLog.bankConnectionId`
  - No data migration needed (existing transactions remain manual)
- **Recommendation:**
  - Use Prisma migrations for all schema changes
  - Create migration: `prisma migrate dev --name add-bank-sync-models`
  - Test migration on local Supabase before production
  - Backup production database before applying migration

**Encryption (Node.js Crypto)**
- **Current state:** Existing encryption for Plaid access tokens (AES-256)
- **Requirements:** Reuse existing encryption pattern for bank credentials
- **Implementation:**
  - Existing `ENCRYPTION_KEY` environment variable sufficient
  - Create `encryption.service.ts` with reusable encrypt/decrypt functions
  - Use AES-256-GCM mode (authenticated encryption)
  - Derive user-specific keys using PBKDF2 with user's Supabase UID as salt
- **Recommendation:**
  - Follow existing Plaid encryption pattern in codebase
  - Add unit tests for encryption service (encryption/decryption round-trip, key derivation)
  - Document key rotation procedure (for future security updates)

**Israeli Bank Scrapers Library**
- **Options:** `israeli-bank-scrapers` (open-source), custom scraping, official APIs (requires license)
- **Recommendation:** `israeli-bank-scrapers` npm library
- **Rationale:**
  - Active maintenance (last commit: recent)
  - Supports FIBI and Visa CAL (our target banks)
  - Handles 2FA, session management, transaction parsing
  - No license/approval needed (vs official Open Banking APIs)
  - Hebrew text handling built-in
  - Community-tested across multiple Israeli banks
- **Installation:**
  ```bash
  npm install israeli-bank-scrapers
  npm install --save-dev @types/israeli-bank-scrapers
  ```
- **Risks:**
  - Screen scraping fragility (bank UI changes break integration)
  - No official support or SLA
  - Rate limiting unpredictable
  - 2FA changes can break login flow
- **Mitigation:**
  - Comprehensive error handling and logging
  - Graceful degradation (show user-friendly error messages)
  - Monitor GitHub repo for breaking changes
  - Have manual fallback (users can still enter transactions manually)
  - Consider official API migration path for production scale

**Real-Time Updates (Frontend)**
- **Options:**
  1. React Query cache invalidation (simple)
  2. WebSocket (Pusher, Supabase Realtime, Socket.io)
  3. Server-Sent Events (SSE)
  4. Polling (every 5 seconds)
- **Recommendation:** React Query cache invalidation (Option 1)
- **Rationale:**
  - Already using React Query extensively in codebase
  - Sync operations are user-initiated (not background) in MVP
  - Invalidate cache after sync completes → automatic refetch
  - No new infrastructure needed
  - Performance sufficient for MVP
- **Implementation:**
  ```typescript
  // In sync mutation onSuccess callback
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['budgets', 'progress'] })
  queryClient.invalidateQueries({ queryKey: ['accounts'] })
  ```
- **Future enhancement (post-MVP):**
  - Add Supabase Realtime for automatic background sync
  - Push notifications for budget alerts
  - Real-time sync status updates for multiple accounts

**tRPC Router Architecture**
- **Current state:** 10 routers (users, transactions, budgets, accounts, categories, goals, analytics, recurring, exports, plaid)
- **Requirements:** Add new router `bank-sync.router.ts` for bank connection and sync operations
- **Router procedures needed:**
  - `bankSync.createConnection` - Setup wizard step 2-4
  - `bankSync.testConnection` - Test credentials
  - `bankSync.handle2FA` - Submit OTP code
  - `bankSync.listConnections` - Get all user's bank connections
  - `bankSync.syncNow` - Manual sync trigger
  - `bankSync.updateCredentials` - Edit credentials flow
  - `bankSync.disconnectBank` - Remove connection
  - `bankSync.getSyncHistory` - Fetch SyncLog records for connection
- **Error handling:**
  - Use tRPC error codes: UNAUTHORIZED, BAD_REQUEST, INTERNAL_SERVER_ERROR
  - Custom error messages for bank-specific failures
  - Log all errors to console (and future error tracking service)
- **Recommendation:**
  - Follow existing router patterns (protectedProcedure for auth)
  - Use Zod schemas for input validation
  - Return structured error objects for UI display

**Hebrew Text Handling**
- **Current state:** NIS currency symbol (₪) already used, right-to-left (RTL) support in Tailwind
- **Requirements:** Handle Hebrew merchant names in transaction imports
- **Challenges:**
  - RTL text rendering in transaction list
  - Mixed Hebrew/English text (e.g., "סופרסל SUPERSOL")
  - Hebrew character normalization for duplicate detection
  - Search/filter with Hebrew input
- **Recommendation:**
  - Use `dir="rtl"` attribute on Hebrew text elements
  - Normalize merchant names: Remove niqqud (vowel points), normalize spacing
  - Store both raw and normalized merchant names
  - Use Unicode-aware string comparison libraries
- **Testing:** Test with real Hebrew merchant names from actual bank transactions

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (4 iterations)

**Rationale:**
- **Very high complexity:** 20+ features, 10 major components, 2 new database models, security-critical encryption, external library integration, real-time updates
- **Natural separation into phases:**
  1. Foundation (database + encryption + connection setup UI)
  2. Import engine (bank scraper integration + sync service + duplicate detection)
  3. AI integration (categorization + merchant cache + budget updates)
  4. Polish (error handling + sync history + mobile optimization)
- **Risk mitigation:** Complex bank integration needs iterative testing and refinement
- **User validation:** Can test connection setup in iteration 1 before building full import pipeline
- **Each iteration delivers working functionality:** Foundation enables manual testing, import enables basic sync, AI adds intelligence, polish completes MVP
- **Estimated 24-32 hours total:** Divide into 4 iterations of 6-8 hours each

---

### Suggested Iteration Phases

**Iteration 17: Foundation & Security Infrastructure**
- **Vision:** Secure credential storage and bank connection management ready for integration
- **Scope:**
  - Database migrations (BankConnection, SyncLog models, Transaction enhancements)
  - Encryption service (AES-256-GCM, key derivation, encrypt/decrypt functions)
  - BankConnection CRUD operations (tRPC router: create, list, update, delete)
  - Settings UI: Bank Connection Wizard (Steps 1-2: Select bank, enter credentials)
  - Test connection function (validate credentials without importing)
  - Connected accounts list UI (table showing connections, status badges)
- **Why first:**
  - Database schema must be in place before any import logic
  - Encryption service is security-critical foundation
  - Can test connection flow end-to-end without full import
  - Establishes UI patterns for remaining iterations
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM (encryption is complex, but well-documented patterns)
- **Success criteria:**
  - User can add FIBI and Visa CAL connections via wizard
  - Credentials stored encrypted in database
  - Test connection button validates credentials successfully
  - Connected accounts list displays all connections with status

**Iteration 18: Transaction Import Engine**
- **Vision:** Automatic transaction fetching from Israeli banks with duplicate detection
- **Scope:**
  - Install and configure `israeli-bank-scrapers` library
  - Bank import service (FIBI adapter, Visa CAL adapter, transaction normalization)
  - 2FA/OTP handling flow (wizard Step 3, OTP input component)
  - Initial import flow (wizard Step 4, date range picker, progress indicator)
  - Duplicate detection algorithm (bank ID, exact match, fuzzy match)
  - SyncLog creation and status tracking
  - Transaction insertion with new import fields populated
- **Dependencies:**
  - Requires: BankConnection model (iteration 17)
  - Requires: Encryption service for credential decryption (iteration 17)
  - Imports: Transaction model enhancements (iteration 17)
- **Estimated duration:** 8-10 hours
- **Risk level:** HIGH (bank scraping is fragile, 2FA unpredictable)
- **Success criteria:**
  - Initial import successfully fetches last 30 days of transactions from FIBI
  - Initial import successfully fetches last 30 days from Visa CAL
  - Duplicate transactions are detected and skipped
  - SyncLog records created with accurate counts
  - Imported transactions appear in transaction list with `importSource` badge

**Iteration 19: AI Categorization & Budget Integration**
- **Vision:** Imported transactions automatically categorized and budgets updated in real-time
- **Scope:**
  - Integrate existing `categorize.service.ts` into import pipeline
  - Call categorization after transaction import
  - Update transactions with category, confidence, categorizedBy fields
  - Merchant cache optimization (normalize Hebrew names, fuzzy matching)
  - User correction flow (update cache when category changed manually)
  - Budget auto-update (invalidate React Query cache after import)
  - Budget alert checking (create alerts for crossed thresholds)
  - Dashboard budget progress display updates
  - Transaction list UI: Confidence badges (HIGH/MEDIUM/LOW)
- **Dependencies:**
  - Requires: Transaction import working (iteration 18)
  - Requires: Existing categorize.service.ts (already exists in codebase)
  - Imports: MerchantCategoryCache model (already exists)
  - Imports: Budget progress endpoint (already exists)
- **Estimated duration:** 6-8 hours
- **Risk level:** LOW (reusing existing proven services)
- **Success criteria:**
  - Imported transactions automatically categorized with >80% accuracy
  - Merchant cache hit rate >60% after first import
  - User can manually correct category, cache updates
  - Budget progress bars update immediately after import
  - Budget alerts appear when thresholds crossed

**Iteration 20: Manual Sync & Polish**
- **Vision:** Production-ready manual sync with comprehensive error handling and user-friendly UI
- **Scope:**
  - Manual "Sync Now" button (Dashboard, Transactions page, Settings)
  - Sync mutation (fetch all connections, sync sequentially, handle errors)
  - Real-time UI updates (toast notifications, progress indicators, button states)
  - Last sync timestamp display ("Last synced: 2 minutes ago")
  - Sync history modal (display SyncLog records in table)
  - Error handling and recovery:
    - Invalid credentials → Update connection status to EXPIRED, show error message
    - Network timeout → Retry with exponential backoff, show "retrying..." message
    - 2FA timeout → Prompt user to re-authenticate
    - Rate limiting → Show "try again later" message
  - Connection status management (ACTIVE → ERROR → EXPIRED → ACTIVE recovery flow)
  - Concurrent sync prevention (check for in-progress sync before starting new)
  - Mobile UI optimization (floating sync button, touch-friendly sizes)
  - Settings page polish (edit credentials flow, disconnect confirmation)
- **Dependencies:**
  - Requires: Import engine working (iteration 18)
  - Requires: AI categorization integrated (iteration 19)
  - Imports: All previous iteration components
- **Estimated duration:** 6-8 hours
- **Risk level:** LOW (UI/UX polish, well-understood patterns)
- **Success criteria:**
  - User can trigger manual sync from 3+ locations in app
  - Sync completes successfully with clear success message
  - Errors handled gracefully with user-friendly messages
  - Sync history accessible and informative
  - Mobile UX feels native and responsive
  - No concurrent sync conflicts occur

---

## Dependency Graph

```
Foundation Infrastructure (Iteration 17)
├── BankConnection Model (Prisma migration)
├── SyncLog Model (Prisma migration)
├── Transaction Model Enhancements (Prisma migration)
├── Encryption Service (crypto.ts)
└── Connection Setup Wizard UI (Settings page)
    ↓
Transaction Import Engine (Iteration 18)
├── israeli-bank-scrapers Integration (npm install)
├── Bank Import Service (bank-import.service.ts)
│   ├── FIBI Adapter
│   └── Visa CAL Adapter
├── 2FA/OTP Handling (wizard step 3)
├── Duplicate Detection Algorithm
└── Initial Import Flow (wizard step 4)
    ↓
AI Categorization Integration (Iteration 19)
├── Categorization Pipeline (reuse categorize.service.ts)
├── Merchant Cache Optimization (Hebrew normalization)
├── User Correction Flow (cache update on manual change)
├── Budget Auto-Update (React Query invalidation)
└── Confidence Badges UI (transaction list)
    ↓
Manual Sync & Polish (Iteration 20)
├── Sync Now Button (Dashboard, Transactions, Settings)
├── Sync Mutation (tRPC endpoint)
├── Real-Time UI Updates (toast, progress, status)
├── Error Handling & Recovery (comprehensive)
├── Sync History Modal (SyncLog display)
└── Mobile Optimization (responsive design)
```

**Critical path:**
1. Database schema must be complete before any data operations
2. Encryption must work before storing credentials
3. Connection setup must succeed before import can run
4. Import must work before categorization can process transactions
5. Categorization must work before budgets can update
6. All core features must work before polish can be applied

**Parallel work opportunities:**
- UI components (wizard, sync button) can be designed while backend services are built
- Categorization integration planning can happen during import engine development
- Error handling patterns can be documented during foundation phase

---

## Risk Assessment

### High Risks

**Risk 1: Israeli Bank Scrapers Library Reliability**
- **Description:** `israeli-bank-scrapers` uses screen scraping, which breaks when banks update their UIs
- **Impact:**
  - Complete sync failure if bank changes login flow
  - User frustration: "Feature worked yesterday, broken today"
  - No automatic recovery - requires library update from maintainers
  - Could block MVP launch if breaks during critical period
- **Mitigation:**
  - Monitor `israeli-bank-scrapers` GitHub repo for updates and breaking changes
  - Build comprehensive error logging to diagnose scraping failures quickly
  - Implement graceful degradation: Show clear error message explaining manual entry still works
  - Have manual transaction entry as reliable fallback
  - Consider contributing fixes back to library if we identify issues
  - Plan official API migration path for post-MVP (apply for Bank of Israel license)
- **Recommendation:** Accept risk for MVP, prioritize manual fallback messaging, plan API migration

**Risk 2: 2FA/OTP Complexity**
- **Description:** 2FA adds significant UX complexity - OTP codes expire, SMS delivery delays, user abandonment in wizard
- **Impact:**
  - High drop-off rate in connection setup wizard (users give up at 2FA step)
  - Poor first-time user experience if OTP times out
  - Support burden: "I entered the code but it says expired"
  - Technical complexity: Managing OTP session state, retry logic, timeout handling
- **Mitigation:**
  - Clear instructions in wizard: "You'll receive an SMS code. Enter it within 60 seconds."
  - Show countdown timer during OTP entry (creates urgency, sets expectations)
  - "Resend OTP" button with rate limiting (prevent spam)
  - Auto-submit OTP when 6 digits entered (reduce friction)
  - Error recovery: "Code expired? Request a new one" with clear button
  - Test with real bank accounts extensively before launch
  - Consider auto-OTP reading on Android (future enhancement)
- **Recommendation:** Invest heavily in UX polish for 2FA flow, extensive real-world testing

**Risk 3: Security Breach of Encrypted Credentials**
- **Description:** If encryption key or user session tokens are compromised, attackers could decrypt banking credentials
- **Impact:**
  - **CRITICAL:** User banking accounts exposed
  - Legal liability, reputational damage, user trust destroyed
  - Regulatory compliance issues (GDPR, Israeli banking laws)
- **Mitigation:**
  - Use battle-tested encryption: AES-256-GCM (authenticated encryption)
  - Never log decrypted credentials (strict code review policy)
  - Credentials decrypted only in-memory, cleared immediately after use
  - Derive user-specific keys from Supabase auth session (not shared master key)
  - Store `ENCRYPTION_KEY` as server-only environment variable (not in git, not client-side)
  - Implement audit trail: Log all encryption/decryption operations (without exposing data)
  - Regular security audits of encryption service code
  - Consider hardware security module (HSM) for production key storage (future)
- **Recommendation:** Treat as highest priority risk, follow security best practices religiously, consider security audit

### Medium Risks

**Risk 4: Duplicate Detection False Positives/Negatives**
- **Description:** Algorithm might incorrectly flag legitimate transactions as duplicates (false positive) or miss actual duplicates (false negative)
- **Impact:**
  - False positives: Missing transactions → incorrect budget data → user distrust
  - False negatives: Duplicate transactions → inflated spending → budget overage alerts
  - User confusion: "Why didn't my transaction import?"
- **Mitigation:**
  - Use multi-strategy approach (bank ID > exact match > fuzzy match)
  - Log all duplicate detection decisions with confidence scores
  - Show skipped duplicates in sync history: "5 transactions imported, 2 skipped as duplicates"
  - Allow user to manually import skipped transactions if needed
  - Extensive testing with real transaction data (use personal accounts for test data)
  - Tune fuzzy matching threshold (start conservative at 95%, adjust based on data)
- **Recommendation:** Start with conservative duplicate detection (prefer false negatives), iterate based on user feedback

**Risk 5: Hebrew Text Normalization Accuracy**
- **Description:** Hebrew merchant names vary widely (niqqud, spacing, transliteration) - normalization might fail
- **Impact:**
  - Poor merchant cache hit rate → excessive Claude API calls → higher costs
  - Inconsistent categorization → user frustration
  - Search/filter doesn't find Hebrew transactions
- **Mitigation:**
  - Research Hebrew text normalization best practices
  - Remove niqqud (vowel points) systematically
  - Normalize spacing (trim, collapse multiple spaces)
  - Test with real merchant names from actual bank transactions
  - Use Unicode-aware string libraries (not naive ASCII assumptions)
  - Consider Levenshtein distance for fuzzy matching variants
  - Store both raw and normalized names for debugging
- **Recommendation:** Allocate time in iteration 19 for Hebrew text testing, iterate normalization logic

**Risk 6: Import Performance at Scale**
- **Description:** Initial import of 30 days (100+ transactions) or sync with 1000+ existing transactions might timeout or freeze UI
- **Impact:**
  - Poor UX: "App is frozen during import"
  - Timeout errors on slow connections
  - Server resource exhaustion on concurrent imports
- **Mitigation:**
  - Implement streaming/chunking for large imports (process 50 transactions at a time)
  - Show progress indicator: "Importing transactions... (47/100 complete)"
  - Use async job queue for imports >100 transactions (run in background)
  - Set reasonable timeout limits (2 minutes max)
  - Test with large transaction datasets (import test user with 1000+ transactions)
  - Consider pagination for sync history display
- **Recommendation:** Test with realistic data volumes, implement chunking if needed

### Low Risks

**Risk 7: Existing Transaction Data Corruption**
- **Description:** Migration adds new fields to Transaction model - could break existing manual transactions
- **Impact:**
  - Existing transactions display incorrectly
  - Budget calculations broken for historical data
- **Mitigation:**
  - Use nullable fields with sensible defaults (`importSource: MANUAL`, `categorizedBy: USER`)
  - No data migration needed (additive changes only)
  - Test migration on local database with real data before production
  - Backup production database before migration
- **Recommendation:** Low risk - additive schema changes are safe

**Risk 8: React Query Cache Invalidation Timing**
- **Description:** Cache invalidation might not trigger fast enough, showing stale budget data after import
- **Impact:**
  - User sees old budget numbers immediately after sync
  - Requires manual page refresh
  - Confusing UX
- **Mitigation:**
  - Invalidate all relevant queries in sync mutation `onSuccess` callback
  - Use `await queryClient.invalidateQueries()` to ensure completion
  - Show loading state during refetch
  - Test cache invalidation thoroughly in iteration 19
- **Recommendation:** Standard React Query pattern, well-tested, low risk

---

## Integration Considerations

### Cross-Phase Integration Points

**Existing AI Categorization Service**
- **What:** `src/server/services/categorize.service.ts` already categorizes transactions using Claude API + MerchantCategoryCache
- **Why it spans iterations:** Foundation iteration doesn't use it, import iteration bypasses it, categorization iteration integrates fully
- **Integration challenge:** Import pipeline must call categorization after inserting transactions, update transaction records with results
- **Consistency needed:**
  - Use same merchant normalization logic as existing service
  - Follow existing cache lookup pattern
  - Maintain existing confidence scoring approach
  - Preserve existing user correction flow

**Budget Progress Calculations**
- **What:** `src/server/api/routers/budgets.router.ts` has `progress` endpoint that calculates spent/remaining per category
- **Why it spans iterations:** Foundation builds models, import adds transactions, categorization links to budgets, polish displays progress
- **Integration challenge:** Ensure imported transactions are included in budget calculations immediately
- **Consistency needed:**
  - Imported transactions must have valid `categoryId` (from AI categorization)
  - Budget month format must match transaction date month
  - React Query cache invalidation must trigger progress recalculation

**Transaction List UI**
- **What:** `src/app/(dashboard)/transactions/page.tsx` displays all transactions
- **Why it spans iterations:** Foundation adds import fields, import adds badges, categorization adds confidence indicators
- **Integration challenge:** Display imported transactions differently from manual (badges, icons, metadata)
- **Consistency needed:**
  - Filter by `importSource` (show only imported or only manual)
  - Display confidence badges for AI-categorized transactions
  - Show "Review" indicator for low-confidence categorizations
  - Maintain existing transaction row design

**Settings Page Architecture**
- **What:** `src/app/(dashboard)/settings/` has multiple sub-pages (account, preferences, data)
- **Why it spans iterations:** Foundation adds bank connections page, polish enhances with sync history
- **Integration challenge:** Fit bank connection wizard into existing settings navigation
- **Consistency needed:**
  - Follow existing settings page layout (sidebar nav, content area)
  - Match existing form styles (input fields, buttons, validation)
  - Use existing toast notification pattern for success/error messages

### Potential Integration Challenges

**Challenge 1: Transaction Model Field Conflicts**
- **What:** Existing `isManual` field overlaps with new `importSource` field
- **Resolution:**
  - Keep both fields for backward compatibility
  - `isManual: true` → `importSource: MANUAL`
  - `isManual: false` → `importSource: FIBI | VISA_CAL`
  - Update transaction creation logic to set both fields consistently
- **When to address:** Iteration 17 (database migration)

**Challenge 2: MerchantCategoryCache Normalization**
- **What:** Existing cache uses basic lowercase normalization, Hebrew names need advanced normalization
- **Resolution:**
  - Enhance normalization function to handle Hebrew (remove niqqud, normalize spacing)
  - Migrate existing cache entries to new normalization (optional, low priority)
  - Test that existing cache still works after enhancement
- **When to address:** Iteration 19 (categorization integration)

**Challenge 3: Budget Alert System Triggers**
- **What:** Existing `BudgetAlert` model and alert checking logic might not trigger on imported transactions
- **Resolution:**
  - Review existing budget alert logic in `budgets.router.ts`
  - Ensure alert checking runs after transaction import
  - Test that alerts are created when imported transactions cross thresholds
- **When to address:** Iteration 19 (budget integration)

**Challenge 4: tRPC Error Handling Patterns**
- **What:** Bank sync operations have unique error types (invalid credentials, 2FA timeout, rate limiting) not present in existing routers
- **Resolution:**
  - Define custom error codes for bank sync errors
  - Create error mapping function: bank error → tRPC error + user message
  - Follow existing tRPC error handling patterns (`throw new TRPCError({ code, message })`)
- **When to address:** Iteration 18 (import engine)

**Challenge 5: React Query Mutation State Management**
- **What:** Sync mutation state (loading, success, error) must be shared across multiple UI components (button, toast, status display)
- **Resolution:**
  - Create custom hook `useBankSync()` that wraps sync mutation
  - Hook returns mutation state + helper functions (syncNow, resetState)
  - Use hook in all components that need sync state
- **When to address:** Iteration 20 (manual sync UI)

---

## Recommendations for Master Plan

1. **Adopt 4-iteration phased approach**
   - Each iteration builds on previous foundation
   - Clear success criteria for each iteration
   - Enables early testing and validation (test connection setup before building full import)
   - Risk mitigation through iterative refinement

2. **Prioritize security and encryption in Iteration 17**
   - Encryption service is foundation for entire system
   - Get security right early - harder to fix later
   - Consider security code review after iteration 17 completes

3. **Allocate extra time for Iteration 18 (import engine)**
   - Highest risk iteration (bank scraping, 2FA, duplicate detection)
   - Budget 8-10 hours instead of 6-8
   - Plan for debugging time with real bank accounts
   - Consider iteration 18 as "spike" to validate feasibility before committing to full MVP

4. **Leverage existing services in Iteration 19**
   - AI categorization service already proven and tested
   - Budget progress endpoint already working
   - Focus on integration, not rebuilding
   - Can complete faster than new features (6-8 hours realistic)

5. **Polish is critical for MVP credibility (Iteration 20)**
   - Error handling makes or breaks user trust
   - Mobile UX essential (users sync on-the-go)
   - Sync history provides transparency and debugging
   - Don't skip this iteration - it's the difference between prototype and product

6. **Plan for post-MVP iteration 21 (Automatic Background Sync)**
   - MVP proves manual sync works
   - Iteration 21 adds cron job for hourly/daily automatic sync
   - Lower risk once manual sync is stable
   - Delivers on "financial autopilot" promise

7. **Consider security audit before production launch**
   - Encryption service handles banking credentials (highest security risk)
   - Third-party security review recommended
   - Budget time/cost for audit after iteration 20 completes

8. **Document fallback strategy if bank integration fails**
   - Manual transaction entry is reliable fallback
   - If `israeli-bank-scrapers` breaks, app still functional
   - Communicate clearly: "Automatic import unavailable, please enter transactions manually"
   - Reduces launch risk

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Frontend:** Next.js 14.2 (App Router), React 18.3, TypeScript 5.7
- **Backend:** tRPC 11.6 (type-safe API layer), Prisma 5.22 (ORM)
- **Database:** PostgreSQL via Supabase (connection pooling configured)
- **Authentication:** Supabase Auth (email/password + OAuth)
- **AI:** Anthropic Claude API (existing categorization service)
- **UI:** Tailwind CSS, Radix UI components, shadcn/ui patterns
- **State:** React Query (TanStack Query v5)
- **Date/Time:** date-fns 3.6
- **Forms:** React Hook Form 7.53 + Zod validation

**Patterns observed:**
- Protected routes via middleware (`middleware.ts`)
- Server/client component separation (App Router patterns)
- tRPC routers in `src/server/api/routers/`
- Services in `src/server/services/`
- Reusable UI components in `src/components/ui/`
- Environment variable configuration in `.env.example`
- Prisma migrations for database changes
- React Query for server state management
- Toast notifications using Sonner library

**Opportunities:**
- Encryption utilities already exist for Plaid tokens (reuse for bank credentials)
- AI categorization service proven and tested (easy integration)
- tRPC error handling patterns established (follow for bank sync errors)
- Settings page structure ready for bank connections section
- React Query invalidation pattern used throughout (apply to sync)

**Constraints:**
- Must use Supabase Auth (no custom auth needed)
- Must follow tRPC patterns (no REST endpoints)
- Must use Prisma for database (no raw SQL)
- NIS currency only (multi-currency removed for production MVP)
- Israeli banks only (no international banking)

### Additional Dependencies Needed

**Required for MVP:**
1. `israeli-bank-scrapers` - Core bank integration library
   ```bash
   npm install israeli-bank-scrapers
   ```

2. `@types/israeli-bank-scrapers` - TypeScript types (if available)
   ```bash
   npm install --save-dev @types/israeli-bank-scrapers
   ```
   Note: If types not available, create manual type declarations in `src/types/israeli-bank-scrapers.d.ts`

**Optional (consider for polish):**
3. `fast-levenshtein` - Hebrew merchant name fuzzy matching
   ```bash
   npm install fast-levenshtein
   npm install --save-dev @types/fast-levenshtein
   ```

4. `otp-generator` - Generate test OTP codes for development
   ```bash
   npm install --save-dev otp-generator
   ```

**Already installed (reuse):**
- `archiver` (ZIP generation) - Already in dependencies (v7.0.1)
- `@anthropic-ai/sdk` (AI categorization) - Already in dependencies (v0.32.1)
- `zod` (validation) - Already in dependencies (v3.23.8)
- `date-fns` (date handling) - Already in dependencies (v3.6.0)

---

## Notes & Observations

**Israeli Banking Landscape:**
- No official Open Banking APIs available without Bank of Israel license
- Screen scraping is de facto standard for fintech startups in Israel
- Major Israeli neobanks (Pepper, Max) also started with screen scraping
- License application process takes 6-12 months (not viable for MVP)
- `israeli-bank-scrapers` library is widely used and maintained by community

**Competitive Analysis:**
- **Pepper (Israeli neobank):** Started with screen scraping, migrated to official APIs after Series A funding
- **Max (Israeli credit card):** Uses official Isracard APIs (they're owned by same parent company)
- **Israeli personal finance apps:** Most use `israeli-bank-scrapers` or similar tools
- **International apps (Mint, YNAB):** Use Plaid/Yodlee (not available for Israeli banks)

**User Psychology:**
- Manual transaction entry is biggest barrier to adoption (vision document emphasizes this)
- Users tolerate sync delays if automatic (better than manual entry)
- 2FA is familiar to Israeli users (required by law for banking apps)
- Security messaging critical: Users must trust credential storage
- Mobile-first: Israeli users expect banking features to work on phones

**Technical Debt Considerations:**
- Screen scraping creates maintenance burden (bank UI changes)
- Future API migration will require rewriting import service
- Design import service with abstraction layer (BankAdapter interface)
- Makes future API migration easier (swap adapter implementation)

**Scalability Concerns (Future):**
- Concurrent sync for 100+ users might overload bank websites
- Rate limiting and IP blocking risks at scale
- Solution: Distributed worker queue, IP rotation, official APIs
- Not a concern for MVP (limited user base)

**Alternative Approaches Considered:**
1. **Build custom scraper:** Rejected - reinventing the wheel, high maintenance
2. **Wait for official APIs:** Rejected - 6-12 month delay unacceptable for MVP
3. **Partner with existing aggregator (Salt Edge, etc.):** Rejected - high cost, vendor lock-in
4. **Manual entry only:** Rejected - defeats core value proposition

**Success Metrics for MVP:**
- **Adoption:** >50% of users connect at least 1 bank within 7 days
- **Reliability:** >95% sync success rate (excluding credential expiration)
- **Accuracy:** >80% correct auto-categorization
- **Performance:** <30 seconds for typical sync (30 days of transactions)

**Post-MVP Roadmap Ideas:**
- Iteration 21: Automatic background sync (cron job, configurable frequency)
- Iteration 22: Transaction review queue (approve before finalizing)
- Iteration 23: Multi-account support (multiple checking, multiple credit cards)
- Iteration 24: Historical import (3-6 months backfill)
- Iteration 25: Smart duplicate detection (handle pending vs posted, transfers)
- Future: Official Open Banking API integration (when licensed)
- Future: Support more Israeli banks (Hapoalim, Leumi, Discount, Mizrahi)
- Future: Support more credit cards (Max, Isracard)

---

*Exploration completed: 2025-11-19*
*This report informs master planning decisions for Plan-6: Automatic Transaction Sync & Budget Integration*
