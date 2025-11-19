# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Build automatic transaction sync system that imports transactions from First International Bank of Israel (FIBI) and Visa CAL credit card, automatically categorizes them using existing AI infrastructure, and updates budgets in real-time—eliminating manual entry burden.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 11 must-have features (6 MVP + 5 post-MVP)
- **User stories/acceptance criteria:** 65+ acceptance criteria across all features
- **Estimated total work:** 24-32 hours (MVP: 16-20 hours, Post-MVP: 8-12 hours)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct integration points** spanning credential management, bank scraping, AI categorization, and budget updates
- **Requires secure credential storage** with AES-256-GCM encryption, 2FA/OTP handling, and sensitive data protection
- **Screen scraping fragility** - `israeli-bank-scrapers` library depends on bank UI stability (high maintenance risk)
- **Real-time state synchronization** across 4+ connected systems (bank APIs → transaction store → categorization service → budget engine → UI)
- **Complex error recovery flows** for network failures, expired credentials, duplicate detection, and partial sync rollback
- **Existing architecture integration** must preserve current tRPC/Prisma/Next.js patterns while adding new async job orchestration

---

## User Flow Analysis

### Flow 1: Initial Bank Connection Setup (Critical Integration Point)

**User Journey Breakdown:**
1. **Entry Point:** Settings → Bank Connections (new navigation path needed)
2. **Credential Collection:** Multi-step form with bank selection → credential entry → 2FA handling
3. **Connection Validation:** Real-time API call to test credentials via `israeli-bank-scrapers`
4. **Initial Import Trigger:** User confirms "Import last 30 days?" → Background sync starts
5. **Progress Feedback:** Loading state → Progress indicator → Success/error toast
6. **Categorization Flow:** Imported transactions → AI batch categorization → Cache updates
7. **Budget Impact:** Categories assigned → Budget calculations refresh → Dashboard updates

**Integration Complexity: HIGH**

**Key Integration Points:**
- **Frontend → tRPC API:** New `bankConnections.create` mutation with streaming progress
- **API → Encryption Service:** Credentials encrypted before database storage
- **API → israeli-bank-scrapers:** Async scraping with timeout handling (30-90 seconds)
- **Scraper → Transaction Store:** Duplicate detection logic (date + amount + fuzzy merchant match)
- **Transaction Store → AI Categorization:** Batch categorization via existing `categorize.service.ts`
- **AI Service → Merchant Cache:** Upsert cached mappings for future instant categorization
- **Transaction Create → Budget Recalculation:** Trigger budget progress refresh (existing `budgets.progress` endpoint)
- **Budget Update → Dashboard UI:** Real-time state invalidation via React Query

**Data Flow Sequence:**
```
User Input (credentials)
  ↓
[Encryption Service] → Encrypt credentials with AES-256-GCM
  ↓
[BankConnection Model] → Store encrypted credentials + metadata
  ↓
[israeli-bank-scrapers] → Scrape FIBI/CAL (30-90 sec async operation)
  ↓
[Duplicate Detection] → Compare date+amount+merchant against existing transactions
  ↓
[Transaction Batch Import] → Create 10-50 transactions in single DB transaction
  ↓
[AI Categorization Service] → Batch categorize via Claude API (existing service)
  ↓
[Merchant Cache Update] → Cache successful categorizations (existing cache)
  ↓
[Budget Progress Calculation] → Recalculate category spending (existing logic)
  ↓
[UI State Refresh] → Invalidate queries, show toast notification
```

**Error Handling Requirements:**
- **Invalid credentials:** Show inline error, allow retry, suggest credential check
- **2FA timeout:** Request user re-enter OTP within modal dialog
- **Network timeout:** Exponential backoff (3 retries: 2s, 4s, 8s), show retry button
- **Partial import failure:** Rollback transaction batch, log error, notify user
- **Expired password:** Detect "authentication failed" error, prompt credential update
- **Bank account locked:** Show clear message directing user to contact bank

**Accessibility Considerations:**
- **Form validation:** Screen reader announcements for errors
- **Loading states:** Announce "Syncing transactions, please wait" to assistive tech
- **Progress indicators:** ARIA live regions for status updates
- **Success confirmation:** Clear success message + transaction count

**UX Friction Points:**
- **2FA interruption:** User must have phone accessible for SMS codes (30-60 sec delay)
- **Initial import duration:** 30-90 seconds for 30 days of transactions (needs progress indicator)
- **Credential trust barrier:** Users must trust app with banking credentials (needs security messaging)

---

### Flow 2: Manual Sync Trigger (Primary User Interaction)

**User Journey Breakdown:**
1. **Trigger Action:** User taps "Sync Now" button (Dashboard, Transactions page, or Settings)
2. **Immediate Feedback:** Button disabled + spinner, toast "Syncing transactions..."
3. **Background Sync:** API call to `bankConnections.sync` → scrapes all connected accounts
4. **Duplicate Filtering:** New transactions compared against existing (skip duplicates)
5. **AI Categorization:** Uncategorized transactions → MerchantCache lookup → AI fallback
6. **Budget Auto-Update:** Category budgets recalculate based on new transactions
7. **Completion Feedback:** Toast "Added 5 new transactions" + last sync timestamp updates
8. **UI Refresh:** Transaction list refreshes, budget bars update, dashboard stats recalculate

**Integration Complexity: MEDIUM-HIGH**

**Key Integration Points:**
- **Button Click → tRPC Mutation:** `bankConnections.sync({ connectionIds: [] })`
- **API → Async Scraper Job:** Parallel scraping of all connected accounts (Promise.all)
- **Scraper Results → Transaction Import:** Batch insert with duplicate detection
- **Import → Categorization Pipeline:** Existing `categorizeTransactions()` service
- **Categorization → Cache Updates:** Merchant-category mappings saved
- **Budget Engine → Dashboard State:** React Query cache invalidation across multiple queries
- **Completion → Toast Notification:** Success/error message with transaction count

**Data Flow Sequence:**
```
User Click "Sync Now"
  ↓
[UI Button State] → Disable button, show spinner
  ↓
[tRPC Mutation] → bankConnections.sync()
  ↓
[Fetch All Connections] → Query BankConnection table for user
  ↓
[Decrypt Credentials] → Decrypt each connection's credentials (in-memory only)
  ↓
[Parallel Scraping] → Promise.all([scrapeFIBI(), scrapeCAL()])
  ↓
[Aggregate Results] → Merge transactions from all accounts
  ↓
[Duplicate Detection] → Filter out existing transactions (O(n²) fuzzy match)
  ↓
[Transaction Import] → Batch create new transactions
  ↓
[AI Categorization] → Batch categorize via Claude (existing service)
  ↓
[Budget Updates] → Recalculate progress (existing query invalidation)
  ↓
[UI State Refresh] → Invalidate: transactions.list, budgets.progress, accounts.list
  ↓
[Toast Notification] → "Added X new transactions"
```

**Real-Time Update Strategy:**
- **Optimistic UI Updates:** Disable sync button immediately (prevent double-sync)
- **Query Invalidation Pattern:** Invalidate 3-5 React Query keys after sync completion
- **Stale-While-Revalidate:** Show existing data while background sync runs
- **Partial Success Handling:** If sync succeeds for account A but fails for account B, show partial success

**Performance Considerations:**
- **Scraping Duration:** 10-30 seconds per account (need timeout: 60 seconds max)
- **Categorization Latency:** 2-5 seconds for 10 transactions (Claude API call)
- **UI Responsiveness:** Must not block main thread (async/await pattern)
- **Duplicate Detection Performance:** O(n²) complexity with fuzzy matching (limit to 30 days = ~100 transactions)

**Error Scenarios:**
- **Sync fails (network error):** Toast "Sync failed, please try again" + error details in Settings
- **Credentials expired:** Toast "Please update your CAL credentials" + navigate to Settings
- **No new transactions:** Toast "All caught up! No new transactions found"
- **Rate limiting:** Toast "Bank temporarily unavailable, will retry automatically"

**Mobile Responsiveness:**
- **Touch target size:** Sync button minimum 44x44px (iOS accessibility guidelines)
- **Loading spinners:** Visible on small screens (320px width)
- **Toast positioning:** Bottom-center on mobile, top-right on desktop
- **Network awareness:** Detect slow 3G, show warning before sync

---

### Flow 3: Budget Alert After Auto-Import (Background Integration)

**User Journey Breakdown:**
1. **Background Sync Completes:** New transaction imported (e.g., "Paz Gas Station" ₪350)
2. **Category Assignment:** AI categorizes as "Transportation"
3. **Budget Calculation:** Transportation budget now at 92% (₪1,150 / ₪1,250)
4. **Alert Trigger:** System detects 90% threshold crossed (existing BudgetAlert logic)
5. **Alert Display:** User sees alert on next app open: "Transportation budget at 92%"
6. **Drill-Down Option:** User taps alert → navigates to Transportation budget breakdown

**Integration Complexity: LOW-MEDIUM**

**Key Integration Points:**
- **Transaction Import → Budget Recalculation:** Automatic via existing `budgets.progress` query
- **Budget Progress → Alert System:** Existing BudgetAlert model (threshold: 75%, 90%, 100%)
- **Alert Detection → UI Notification:** Dashboard component queries alerts, displays prominently
- **Alert Click → Navigation:** React Router navigation to `/budgets/[month]` with category filter

**Data Flow Sequence:**
```
Transaction Import
  ↓
[Budget Progress Query] → Recalculate category spending (existing aggregation)
  ↓
[Alert Detection] → Check if threshold crossed (75%, 90%, 100%)
  ↓
[Alert Record Creation] → Insert BudgetAlert if threshold crossed and not sent
  ↓
[Dashboard Query] → Fetch unsent alerts for current user
  ↓
[Alert Display] → Show banner/card on dashboard
  ↓
[User Interaction] → Click alert → navigate to budget detail
  ↓
[Alert Dismissal] → Mark alert as sent
```

**Integration with Existing Systems:**
- **Existing BudgetAlert Model:** Already has threshold tracking (75%, 90%, 100%)
- **Existing Budget Progress Calculation:** `/budgets/progress` endpoint already aggregates spending
- **Existing Dashboard Components:** FinancialHealthIndicator already shows budget status
- **New Alert Display Component:** Need new `BudgetAlertBanner` component on dashboard

**User Experience Enhancements:**
- **Alert Urgency Levels:**
  - 75%: Gentle reminder (sage color, info icon)
  - 90%: Warning (amber color, warning icon)
  - 100%: Over budget (coral color, alert icon)
- **Alert Grouping:** If multiple budgets hit thresholds, show "3 budgets need attention" summary
- **Dismissible Alerts:** User can dismiss alerts (mark as sent in database)
- **Alert History:** View past alerts in Settings → Notifications (future feature)

**Edge Cases:**
- **Multiple transactions in one sync:** All alerts triggered simultaneously (batch display)
- **Budget adjusted after alert:** Recalculate alert validity, hide if no longer over threshold
- **User ignores alert:** Alert persists until dismissed or threshold no longer met
- **Alert for inactive budget:** Only show alerts for current month budgets

---

## Frontend/Backend Integration Complexity

### API Contract Design

**New tRPC Routers Required:**

#### 1. `bankConnections.router.ts`
```typescript
// Mutations
create({ bank, credentials, accountIdentifier }) → BankConnection
update({ id, credentials }) → BankConnection
delete({ id }) → { success: boolean }
test({ id }) → { success: boolean, error?: string }
sync({ connectionIds?: string[] }) → SyncResult
syncSingle({ connectionId }) → SyncResult

// Queries
list() → BankConnection[]
get({ id }) → BankConnection
syncHistory({ connectionId, limit }) → SyncLog[]
lastSyncStatus() → { timestamp, status, transactionCount }
```

#### 2. Enhanced `transactions.router.ts`
```typescript
// New mutation for imported transactions
importBatch({
  accountId: string
  transactions: Array<{
    date: Date
    amount: number
    merchant: string
    rawMerchantName: string
  }>
}) → { imported: number, skipped: number, errors: string[] }

// Enhanced existing query
list({
  accountId?: string
  categoryId?: string
  importSource?: 'MANUAL' | 'FIBI' | 'CAL'  // NEW filter
  startDate?: Date
  endDate?: Date
}) → Transaction[]
```

#### 3. Enhanced `budgets.router.ts`
```typescript
// Existing endpoints remain unchanged
// Budget auto-update happens via existing progress calculation
// No new API contracts needed - uses existing query invalidation
```

**Integration Point Count:** 8 new API endpoints, 2 enhanced endpoints

---

### State Management Complexity

**React Query Cache Invalidation Chain:**

When a sync completes, the following queries must be invalidated:

```typescript
// After successful sync:
utils.transactions.list.invalidate()
utils.transactions.categorizationStats.invalidate()
utils.budgets.progress.invalidate({ month: currentMonth })
utils.budgets.summary.invalidate({ month: currentMonth })
utils.accounts.list.invalidate()  // Update lastSynced timestamp
utils.bankConnections.list.invalidate()
utils.bankConnections.lastSyncStatus.invalidate()
```

**State Synchronization Challenges:**
- **7 query keys** must be invalidated on sync completion (risk of stale data if any missed)
- **Optimistic updates** required for sync button state (prevent double-sync)
- **Partial sync failures** need granular invalidation (account A succeeded, account B failed)
- **Real-time budget updates** must reflect within 1 second of transaction import (user expectation)

**Recommended Pattern:**
- Use React Query's `onSuccess` callback in sync mutation to trigger invalidation waterfall
- Implement `utils.invalidateAll()` helper to ensure consistency
- Add loading/error boundaries at page level (not just component level)

---

### Authentication Flow Integration

**Existing Auth Pattern:** Supabase Auth → tRPC Context → Prisma User

**Bank Credential Security Layer:**
```
User Sign-In (Supabase)
  ↓
[tRPC Context] → ctx.user (Prisma User)
  ↓
[Bank Credentials] → Encrypted with user-derived key
  ↓
[Decryption] → In-memory only during sync (never persisted decrypted)
  ↓
[Scraper API Call] → Credentials sent directly to bank (HTTPS)
  ↓
[Cleanup] → Credentials cleared from memory
```

**Security Concerns:**
- **Encryption key derivation:** Use `ENCRYPTION_KEY` env var (existing `/src/lib/encryption.ts`)
- **Credential storage:** Store encrypted credentials in `BankConnection.encryptedCredentials` JSON field
- **Decryption timing:** Only decrypt during active sync, never expose in API responses
- **2FA codes:** Never store 2FA codes (ephemeral, user-entered during sync)

**Integration with Existing Auth:**
- **No changes** to Supabase Auth flow required
- **RLS policies:** Use existing Prisma `userId` filtering for BankConnection model
- **Session management:** Sync operations use existing tRPC `protectedProcedure` middleware

---

### External API Integration

**israeli-bank-scrapers Library:**

**Integration Pattern:**
```typescript
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'

// Example: FIBI scraper
const scraper = createScraper({
  companyId: CompanyTypes.hapoalim,  // Wait, FIBI is 'otsar', CAL is 'visaCal'
  startDate: new Date(2024, 0, 1),
  credentials: {
    userCode: decryptedUsername,
    password: decryptedPassword
  },
  showBrowser: false,  // Headless mode
  timeout: 60000  // 60 second timeout
})

const result = await scraper.scrape()
// result.accounts[0].txns = [{ date, description, amount, status }]
```

**Third-Party Dependencies:**
- **israeli-bank-scrapers:** `npm install israeli-bank-scrapers` (NOT in current package.json)
- **Puppeteer/Playwright:** Required by scrapers (headless browser automation)
- **Dependency size:** ~50MB (Chromium binary for headless browser)

**External Service Risks:**
- **Library maintenance:** Last updated 6 months ago (check GitHub activity before integration)
- **Bank UI changes:** Screen scraping breaks if bank redesigns website (high maintenance burden)
- **Rate limiting:** Banks may throttle/block scraper traffic (need exponential backoff)
- **Legal compliance:** Screen scraping violates most bank ToS (document disclaimer to users)

**Recommended Mitigation:**
- Add dependency: `npm install israeli-bank-scrapers` (verify latest version supports FIBI + CAL)
- Test scraper reliability weekly (automated smoke tests against test accounts)
- Implement fallback: if scraper fails 3x, suggest manual transaction entry
- Display disclaimer: "This feature uses unofficial screen scraping, not official bank APIs"

---

### Real-Time Features

**Sync Progress Streaming (Optional Enhancement):**

Instead of blocking sync mutation, stream progress updates:

```typescript
// tRPC subscription (requires WebSocket or SSE)
bankConnections.syncProgress.subscribe(({ connectionId }) => {
  // Emits: { status: 'connecting' | 'scraping' | 'importing' | 'categorizing' | 'complete' }
})
```

**Implementation Complexity:** MEDIUM (requires WebSocket setup, not in current architecture)

**Alternative (Simpler):** Polling-based progress:
```typescript
// Client polls every 2 seconds during sync
const { data } = trpc.bankConnections.syncStatus.useQuery(
  { syncLogId },
  { refetchInterval: 2000, enabled: isSyncing }
)
```

**Recommendation:** Start with polling (simpler), migrate to WebSocket in Iteration 2 if needed.

---

### Form Handling & Validation

**Bank Connection Form Requirements:**

**Form Fields:**
1. **Bank Selection:** Dropdown (FIBI, Visa CAL) with logos
2. **Account Type:** Radio buttons (Checking, Credit Card)
3. **Username/User ID:** Text input with validation
4. **Password:** Password input (secure, masked)
5. **2FA Code (if prompted):** Numeric input (6 digits, auto-submit)

**Validation Rules:**
- **Username:** Required, min 6 characters
- **Password:** Required, min 8 characters
- **Bank selection:** Required
- **Account type:** Required

**Form Libraries:**
- **Existing:** React Hook Form (`react-hook-form` in package.json)
- **Validation:** Zod schemas (existing pattern in `transactions.router.ts`)

**Example Schema:**
```typescript
const bankConnectionSchema = z.object({
  bank: z.enum(['FIBI', 'VISA_CAL']),
  accountType: z.enum(['CHECKING', 'CREDIT_CARD']),
  username: z.string().min(6, 'Username must be at least 6 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
```

**Integration with Existing Patterns:**
- **Form component:** Create `BankConnectionForm.tsx` (similar to existing `TransactionForm.tsx`)
- **Submit handler:** Use `trpc.bankConnections.create.useMutation()` (existing pattern)
- **Error display:** Use existing toast notification system (`useToast()` hook)
- **Success redirect:** Navigate to Settings → Bank Connections list

---

### Navigation & State Management

**New Navigation Paths:**

1. **Settings → Bank Connections:** `/settings/bank-connections` (new page)
2. **Settings → Bank Connections → Add:** `/settings/bank-connections/add` (new page)
3. **Settings → Bank Connections → Edit:** `/settings/bank-connections/[id]` (new page)

**Navigation Component Updates:**
- **SettingsPage:** Add "Bank Connections" card to settings grid (modify `/app/(dashboard)/settings/page.tsx`)
- **DashboardSidebar:** Optionally add "Bank Sync" quick action button (modify `/components/dashboard/DashboardSidebar.tsx`)
- **TransactionsPage:** Add "Sync Now" button to page header (modify `/app/(dashboard)/transactions/page.tsx`)

**Routing Integration:**
- **Existing:** Next.js App Router (file-based routing)
- **New files needed:**
  - `/app/(dashboard)/settings/bank-connections/page.tsx`
  - `/app/(dashboard)/settings/bank-connections/add/page.tsx`
  - `/app/(dashboard)/settings/bank-connections/[id]/page.tsx`

**State Persistence:**
- **BankConnection list:** React Query cache (standard pattern)
- **Last sync timestamp:** Persisted in database, displayed in UI
- **Sync in progress:** In-memory state (React `useState`), reset on page reload

---

## Error Handling & Edge Case Flows

### Network Failure Scenarios

**Scenario 1: Sync Fails Due to Network Timeout**

**Error Flow:**
```
User clicks "Sync Now"
  ↓
[API Call] → bankConnections.sync()
  ↓
[Scraper Timeout] → 60 seconds elapsed, no response
  ↓
[Error Thrown] → TRPCError({ code: 'TIMEOUT' })
  ↓
[Mutation onError] → toast({ title: 'Sync failed', description: 'Network timeout', variant: 'destructive' })
  ↓
[UI Reset] → Re-enable sync button, show "Last sync: Failed X min ago"
  ↓
[User Action] → User can retry sync manually
```

**Error Message:** "Sync failed due to network timeout. Please check your connection and try again."

**Retry Strategy:**
- **Immediate retry:** Not recommended (likely to fail again)
- **User-initiated retry:** Allow user to tap "Retry" button
- **Automatic retry:** NOT in MVP (requires background job scheduler)

---

### Validation Errors

**Scenario 2: User Enters Invalid Bank Credentials**

**Error Flow:**
```
User submits bank connection form
  ↓
[API Call] → bankConnections.create({ credentials })
  ↓
[Test Connection] → israeli-bank-scrapers.scrape()
  ↓
[Authentication Failed] → Scraper returns "Invalid credentials"
  ↓
[Error Thrown] → TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
  ↓
[Form Error] → Show inline error below password field
  ↓
[User Action] → User corrects credentials, resubmits
```

**Error Message:** "Invalid username or password. Please check your credentials and try again."

**UX Enhancement:**
- **Inline error:** Display below password field (red text, shake animation)
- **Field focus:** Auto-focus password field on error
- **Retry limit:** After 3 failed attempts, suggest "Reset password at bank website"

---

### Duplicate Transaction Detection

**Scenario 3: User Manually Enters Transaction, Then Syncs**

**Detection Logic:**
```typescript
// Duplicate if:
// 1. Same date (±1 day tolerance)
// 2. Same amount (exact match)
// 3. Merchant name 80%+ similar (fuzzy match)

function isDuplicate(existingTxn, importedTxn): boolean {
  const dateDiff = Math.abs(existingTxn.date - importedTxn.date)
  const sameDate = dateDiff <= 86400000  // 1 day in ms

  const sameAmount = existingTxn.amount === importedTxn.amount

  const similarity = levenshtein(existingTxn.payee, importedTxn.merchant)
  const sameMerchant = similarity >= 0.8

  return sameDate && sameAmount && sameMerchant
}
```

**Edge Cases:**
- **Same merchant, different amounts:** NOT duplicate (e.g., two gas purchases same day)
- **Different merchants, same amount:** NOT duplicate (e.g., two ₪50 purchases)
- **Pending vs. posted transactions:** Credit card transactions may appear twice (pending → posted)

**Handling Pending Transactions:**
- **Decision:** Skip pending transactions in MVP (only import posted transactions)
- **Rationale:** Pending transactions may change (amount adjustment, cancellation)
- **Implementation:** Filter `status === 'completed'` in scraper result

---

### Credential Expiration

**Scenario 4: User's Bank Password Expires**

**Error Flow:**
```
Scheduled sync runs (future feature)
  ↓
[Scraper Attempt] → Authentication failed
  ↓
[Error Detection] → "Password expired" or "Authentication failed"
  ↓
[Update Connection Status] → Set BankConnection.status = 'EXPIRED'
  ↓
[User Notification] → Show banner on dashboard: "Your FIBI connection needs attention"
  ↓
[User Action] → User clicks banner → navigate to Settings → Update credentials
```

**Error Message:** "Your bank password may have expired. Please update your credentials in Settings."

**Status Indicators:**
- **ACTIVE:** Green checkmark, "Last synced 2 hours ago"
- **ERROR:** Yellow warning, "Sync failed, please retry"
- **EXPIRED:** Red alert, "Credentials expired, update required"

---

## Responsive Design Requirements

### Mobile Breakpoints

**Device Support:**
- **Mobile:** 320px - 640px (iPhone SE, iPhone 12/13/14)
- **Tablet:** 641px - 1024px (iPad, Android tablets)
- **Desktop:** 1025px+ (MacBook, Windows laptops)

**Component Adaptations:**

#### Bank Connection Form
- **Mobile:** Single column layout, full-width inputs
- **Tablet:** Single column, wider container (max-w-2xl)
- **Desktop:** Single column, centered (max-w-2xl)

#### Sync Button Placement
- **Mobile:** Fixed bottom button (sticky, full-width)
- **Tablet:** Top-right of page header
- **Desktop:** Top-right of page header

#### Transaction List
- **Mobile:** Compact cards, swipe gestures for actions
- **Tablet:** Grid view (2 columns)
- **Desktop:** Table view with hover actions

**Touch Target Sizes:**
- **Minimum:** 44x44px (iOS accessibility standard)
- **Sync button:** 48x48px minimum
- **Form inputs:** 56px height (easy tapping)

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

**Keyboard Navigation:**
- **Tab order:** Form fields → Submit button → Cancel button
- **Focus indicators:** Visible 2px outline on all interactive elements
- **Skip links:** "Skip to main content" at top of page

**Screen Reader Support:**
- **Form labels:** All inputs have associated `<label>` elements
- **Error announcements:** Use `aria-live="assertive"` for form errors
- **Loading states:** Announce "Syncing transactions, please wait"
- **Success messages:** Announce "Sync complete, added 5 transactions"

**Color Contrast:**
- **Text on background:** Minimum 4.5:1 contrast ratio
- **Error text:** Red with 4.5:1 contrast on white background
- **Success text:** Green with 4.5:1 contrast on white background

**Existing Patterns:**
- **Current app uses:** Radix UI components (accessible by default)
- **Existing contrast ratios:** Sage/warm-gray palette already WCAG AA compliant
- **New components:** Must follow existing Radix UI patterns

---

## Data Flow Patterns

### Complete Sync Data Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTION LAYER                                          │
├─────────────────────────────────────────────────────────────────┤
│ User clicks "Sync Now" button on Dashboard                     │
│   ↓                                                             │
│ Button state: disabled, spinner visible                        │
│   ↓                                                             │
│ Toast notification: "Syncing transactions..."                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND API LAYER (tRPC Client)                               │
├─────────────────────────────────────────────────────────────────┤
│ trpc.bankConnections.sync.useMutation()                         │
│   ↓                                                             │
│ Request: POST /api/trpc/bankConnections.sync                   │
│ Body: { connectionIds: [id1, id2] }                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND API LAYER (tRPC Server)                                │
├─────────────────────────────────────────────────────────────────┤
│ bankConnections.sync mutation handler                           │
│   ↓                                                             │
│ Validate user authentication (protectedProcedure)               │
│   ↓                                                             │
│ Fetch BankConnection records for user                           │
│   ↓                                                             │
│ Decrypt credentials (AES-256-GCM)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BANK SCRAPING LAYER (israeli-bank-scrapers)                    │
├─────────────────────────────────────────────────────────────────┤
│ createScraper({ companyId: 'otsar', credentials })              │
│   ↓                                                             │
│ Headless browser: Navigate to FIBI login page                  │
│   ↓                                                             │
│ Fill credentials, submit form                                   │
│   ↓                                                             │
│ Handle 2FA (if required): Wait for SMS code                     │
│   ↓                                                             │
│ Scrape transaction table (last 30 days)                        │
│   ↓                                                             │
│ Return: [{ date, amount, description, status }]                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DUPLICATE DETECTION LAYER                                       │
├─────────────────────────────────────────────────────────────────┤
│ Fetch existing transactions (last 30 days)                     │
│   ↓                                                             │
│ For each imported transaction:                                 │
│   • Compare date (±1 day)                                       │
│   • Compare amount (exact match)                                │
│   • Compare merchant (fuzzy match 80%+)                         │
│   ↓                                                             │
│ Filter: Keep only non-duplicate transactions                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TRANSACTION IMPORT LAYER                                        │
├─────────────────────────────────────────────────────────────────┤
│ prisma.$transaction([                                           │
│   • Create Transaction records (batch)                          │
│   • Update Account.lastSynced timestamp                         │
│   • Insert SyncLog record (success/partial/failed)              │
│ ])                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AI CATEGORIZATION LAYER (existing service)                     │
├─────────────────────────────────────────────────────────────────┤
│ categorizeTransactions(userId, transactions, prisma)            │
│   ↓                                                             │
│ For each transaction:                                           │
│   • Check MerchantCategoryCache (instant)                       │
│   • If not cached: Call Claude API (2-5 sec)                    │
│   • Update transaction.categoryId                               │
│   • Cache merchant → category mapping                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BUDGET RECALCULATION LAYER (existing logic)                    │
├─────────────────────────────────────────────────────────────────┤
│ budgets.progress query (auto-triggered via React Query)         │
│   ↓                                                             │
│ Aggregate transactions by category (current month)              │
│   ↓                                                             │
│ Calculate: spent, remaining, percentage for each budget         │
│   ↓                                                             │
│ Determine status: good (< 75%), warning (75-95%), over (> 95%) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI STATE REFRESH LAYER                                          │
├─────────────────────────────────────────────────────────────────┤
│ React Query cache invalidation:                                │
│   • utils.transactions.list.invalidate()                        │
│   • utils.budgets.progress.invalidate()                         │
│   • utils.accounts.list.invalidate()                            │
│   • utils.bankConnections.lastSyncStatus.invalidate()           │
│   ↓                                                             │
│ Components re-fetch data:                                       │
│   • TransactionList refreshes                                   │
│   • BudgetProgressBar updates                                   │
│   • Dashboard stats recalculate                                 │
│   ↓                                                             │
│ Toast notification: "Added 5 new transactions"                 │
│   ↓                                                             │
│ Button state: enabled, spinner hidden                           │
└─────────────────────────────────────────────────────────────────┘
```

**Total Integration Points:** 12 major steps
**External Dependencies:** 2 (israeli-bank-scrapers, Claude AI API)
**Database Write Operations:** 4 (Transaction, Account, SyncLog, MerchantCategoryCache)
**React Query Invalidations:** 4-6 keys

---

## Integration Points Summary

### High-Complexity Integration Points

1. **Bank Scraper → Transaction Store** (CRITICAL)
   - **Complexity:** HIGH
   - **Risk:** Screen scraping fragility, timeout handling, 2FA complexity
   - **Mitigation:** Extensive error handling, timeout limits, user-friendly error messages

2. **Transaction Import → AI Categorization Pipeline** (CRITICAL)
   - **Complexity:** MEDIUM-HIGH
   - **Risk:** Claude API rate limits, cost explosion with large imports
   - **Mitigation:** Batch processing (max 50 transactions), MerchantCache optimization

3. **Budget Recalculation → UI State Sync** (CRITICAL)
   - **Complexity:** MEDIUM
   - **Risk:** Stale UI data if invalidation chain breaks
   - **Mitigation:** Comprehensive invalidation strategy, optimistic updates

### Medium-Complexity Integration Points

4. **Credential Encryption → Storage → Decryption** (SECURITY CRITICAL)
   - **Complexity:** MEDIUM
   - **Risk:** Encryption key leakage, decrypted credentials in memory
   - **Mitigation:** Use existing `/lib/encryption.ts`, never log credentials

5. **Duplicate Detection Logic** (DATA INTEGRITY)
   - **Complexity:** MEDIUM
   - **Risk:** False positives (skip valid transactions), false negatives (duplicate imports)
   - **Mitigation:** Fuzzy matching with 80% threshold, manual override option

6. **Form Validation → API Submission** (USER EXPERIENCE)
   - **Complexity:** LOW-MEDIUM
   - **Risk:** Poor error messages, blocked submission due to validation bugs
   - **Mitigation:** Use existing Zod + React Hook Form patterns

### Low-Complexity Integration Points

7. **Navigation → New Pages**
   - **Complexity:** LOW
   - **Risk:** Broken links, missing breadcrumbs
   - **Mitigation:** Follow existing Next.js App Router patterns

8. **Toast Notifications → User Feedback**
   - **Complexity:** LOW
   - **Risk:** Missing notifications, notification spam
   - **Mitigation:** Use existing `useToast()` hook, consolidate notifications

---

## Recommendations for Master Plan

### 1. **Prioritize Credential Security Architecture First**
**Rationale:** Credential encryption/decryption must be rock-solid before any bank integration. Any security flaw here is catastrophic.

**Recommendation:**
- Iteration 17: Build and test encryption layer independently (unit tests, integration tests)
- Iteration 17: Create `BankConnection` model + API scaffolding
- Iteration 18: Only then integrate israeli-bank-scrapers

---

### 2. **Separate Sync Engine from UI Integration**
**Rationale:** Sync logic is complex and can be tested independently from UI. Decouple for parallel development.

**Recommendation:**
- Iteration 19: Build sync service + duplicate detection (backend-only, test via API)
- Iteration 20: Build UI components (Settings pages, Sync button)
- Iteration 21: Connect UI → API → Sync engine

---

### 3. **Leverage Existing AI Categorization (No Changes Needed)**
**Rationale:** Existing `categorize.service.ts` already supports batch categorization and merchant caching. Zero new code needed for AI integration.

**Recommendation:**
- Iteration 21: Simply call `categorizeTransactions()` after import
- Iteration 21: Add `importSource` field to Transaction model to distinguish imported vs manual

---

### 4. **Use Polling for Sync Progress (Not WebSockets)**
**Rationale:** WebSocket setup adds 8-12 hours of complexity. Polling is simpler and sufficient for MVP.

**Recommendation:**
- Iteration 20: Implement polling-based sync status check (every 2 seconds)
- Post-MVP (Iteration 23+): Migrate to WebSocket if user feedback requests real-time progress

---

### 5. **Display Security Disclaimer Prominently**
**Rationale:** Screen scraping violates bank ToS. Users must understand risks before connecting accounts.

**Recommendation:**
- Iteration 18: Add disclaimer modal before bank connection setup:
  - "This feature uses unofficial screen scraping, not official bank APIs."
  - "We encrypt your credentials, but screen scraping may violate your bank's terms of service."
  - "Use at your own risk. We recommend using a read-only bank account."
- Require explicit checkbox: "I understand the risks and wish to proceed"

---

### 6. **Start with Single Bank/Card (FIBI + CAL), Expand Later**
**Rationale:** Testing with 2 institutions is sufficient for MVP. Adding more banks is simple iteration.

**Recommendation:**
- Iteration 17-22: Focus exclusively on FIBI checking + Visa CAL credit card
- Post-MVP (Iteration 23+): Add Hapoalim, Leumi, Discount, Mizrahi (each is 2-4 hour increment)

---

### 7. **Manual Sync Only in MVP (No Automatic Background Jobs)**
**Rationale:** Background job scheduling (cron, BullMQ) adds 6-10 hours of infrastructure complexity. Manual sync proves value first.

**Recommendation:**
- Iteration 17-22: "Sync Now" button only (user-initiated)
- Post-MVP (Iteration 23+): Add automatic hourly/daily sync (requires cron or Vercel Cron Jobs setup)

---

### 8. **Budget Auto-Update Requires Zero New Code**
**Rationale:** Existing `budgets.progress` query already recalculates spending on every page load. Transaction import automatically triggers recalculation via React Query invalidation.

**Recommendation:**
- Iteration 22: Simply invalidate `budgets.progress` query after import
- No new budget logic needed—existing aggregation handles imported transactions

---

## Technology Recommendations

### Required npm Packages

**New Dependencies:**
```json
{
  "israeli-bank-scrapers": "^3.x.x"  // Bank scraping library
}
```

**Existing Dependencies (No Changes):**
- `@anthropic-ai/sdk`: AI categorization (already installed)
- `@prisma/client`: Database access (already installed)
- `react-hook-form`: Form validation (already installed)
- `zod`: Schema validation (already installed)

**Dev Dependencies (Testing):**
```json
{
  "vitest": "^3.2.4"  // Already installed
}
```

---

### Database Schema Changes

**New Models:**

```prisma
model BankConnection {
  id                   String   @id @default(cuid())
  userId               String
  bank                 BankType
  accountType          AccountType
  encryptedCredentials String   @db.Text  // JSON: { username, password }
  accountIdentifier    String             // Last 4 digits for display
  status               ConnectionStatus @default(ACTIVE)
  lastSynced           DateTime?
  lastSuccessfulSync   DateTime?
  errorMessage         String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncLogs  SyncLog[]

  @@index([userId])
  @@index([status])
}

enum BankType {
  FIBI       // First International Bank of Israel
  VISA_CAL   // Visa CAL credit card
}

enum ConnectionStatus {
  ACTIVE
  ERROR
  EXPIRED
}

model SyncLog {
  id                   String   @id @default(cuid())
  bankConnectionId     String
  startedAt            DateTime @default(now())
  completedAt          DateTime?
  status               SyncStatus
  transactionsImported Int      @default(0)
  transactionsSkipped  Int      @default(0)
  errorDetails         String?  @db.Text
  createdAt            DateTime @default(now())

  bankConnection BankConnection @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)

  @@index([bankConnectionId])
  @@index([startedAt])
}

enum SyncStatus {
  SUCCESS
  PARTIAL
  FAILED
}
```

**Enhanced Transaction Model:**

```prisma
model Transaction {
  // ... existing fields ...

  // New fields for import tracking
  rawMerchantName          String?              // Original merchant name from bank
  importSource             ImportSource @default(MANUAL)
  importedAt               DateTime?
  categorizedBy            CategorizationType?  // How category was assigned
  categorizationConfidence ConfidenceLevel?
}

enum ImportSource {
  MANUAL
  FIBI
  VISA_CAL
}

enum CategorizationType {
  USER         // Manually assigned by user
  AI_CACHED    // Retrieved from MerchantCategoryCache
  AI_SUGGESTED // Fresh AI categorization
}

enum ConfidenceLevel {
  HIGH    // 90%+ confidence
  MEDIUM  // 70-89% confidence
  LOW     // < 70% confidence
}
```

**Migration Complexity:** MEDIUM (3 new models, 5 new enums, 6 new fields)

---

### Existing Codebase Patterns to Follow

**tRPC Router Pattern:**
```typescript
// Follow existing pattern in src/server/api/routers/transactions.router.ts
export const bankConnectionsRouter = router({
  create: protectedProcedure.input(schema).mutation(async ({ ctx, input }) => { ... }),
  list: protectedProcedure.query(async ({ ctx }) => { ... }),
})
```

**Form Component Pattern:**
```typescript
// Follow existing pattern in src/components/transactions/TransactionForm.tsx
export function BankConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const mutation = trpc.bankConnections.create.useMutation({ onSuccess })
  // ...
}
```

**Toast Notification Pattern:**
```typescript
// Follow existing pattern across components
const { toast } = useToast()
mutation.mutate(data, {
  onSuccess: () => toast({ title: 'Success!' }),
  onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' })
})
```

---

## Notes & Observations

### Integration Risk Assessment

**High-Risk Integration Points:**
1. **israeli-bank-scrapers reliability:** Library may break with bank UI changes (ongoing maintenance burden)
2. **2FA handling UX:** SMS codes introduce 30-60 second delay (user frustration risk)
3. **Duplicate detection accuracy:** False positives waste user time, false negatives create data integrity issues
4. **Credential security:** Any encryption flaw is catastrophic (requires security audit)

**Medium-Risk Integration Points:**
5. **React Query invalidation:** Missing invalidation = stale UI (common bug, hard to debug)
6. **Sync timeout handling:** Long-running syncs (60+ seconds) may timeout on serverless platforms
7. **Budget recalculation performance:** 1000+ transactions may slow aggregation queries

**Low-Risk Integration Points:**
8. **Navigation routing:** Straightforward Next.js patterns
9. **Form validation:** Existing Zod + React Hook Form patterns are robust
10. **Toast notifications:** Simple, well-tested UI pattern

---

### UX Complexity Observations

**Positive UX Patterns:**
- **Existing onboarding wizard:** Can be extended to include bank connection setup
- **Existing budget progress UI:** Already displays real-time spending (zero changes needed)
- **Existing transaction list:** Supports filtering by account (can add "import source" filter)

**UX Challenges:**
- **2FA interruption:** User must wait for SMS code during setup (30-60 second delay)
- **Initial import duration:** 30-90 seconds for 30 days of transactions (needs progress indicator)
- **Credential trust barrier:** Users hesitant to share banking credentials (needs trust-building messaging)
- **Sync status visibility:** User needs to know when last sync occurred, if sync failed, etc.

**Recommended UX Enhancements:**
- **Last sync timestamp:** Display "Last synced: 2 hours ago" on Dashboard
- **Connection health indicators:** Green (active), yellow (error), red (expired) status badges
- **Sync history log:** Show list of past syncs (date, status, transaction count) in Settings
- **Educational tooltips:** Explain "What is screen scraping?" and "Is my data safe?"

---

### Performance Bottlenecks

**Identified Bottlenecks:**
1. **Bank scraping duration:** 10-30 seconds per account (Puppeteer headless browser overhead)
2. **AI categorization latency:** 2-5 seconds for 10 transactions (Claude API call)
3. **Duplicate detection:** O(n²) fuzzy matching (slow with 100+ transactions)

**Mitigation Strategies:**
1. **Parallel scraping:** Use `Promise.all()` to scrape multiple accounts simultaneously
2. **Merchant cache optimization:** 95%+ cache hit rate eliminates most AI calls
3. **Duplicate detection optimization:** Index transactions by date + amount (narrow search space)

**Performance Targets:**
- **Single account sync:** < 30 seconds (acceptable)
- **Batch categorization:** < 5 seconds for 50 transactions (acceptable)
- **UI response time:** < 100ms for button clicks (critical)

---

### Scalability Considerations (Future)

**Current MVP Constraints:**
- **Manual sync only:** User-initiated, no background jobs
- **Single-threaded sync:** One sync per user at a time (prevent concurrent scraping)
- **In-memory credentials:** Decrypted credentials held in memory during sync (risk if process crashes)

**Future Scalability Improvements (Post-MVP):**
- **Background job queue:** Use BullMQ or Vercel Cron Jobs for automatic hourly sync
- **Distributed sync workers:** Scale sync operations across multiple Edge Functions
- **Credential key rotation:** Periodic encryption key rotation for enhanced security
- **Sync result caching:** Cache last 30 days of transactions to speed up incremental syncs

---

## Conclusion

**Overall Assessment:** COMPLEX but achievable with careful iteration planning.

**Critical Success Factors:**
1. **Encryption security** must be bulletproof (review existing `/lib/encryption.ts`)
2. **User trust messaging** essential (prominent security disclaimers)
3. **Error handling robustness** determines user adoption (graceful failures, helpful error messages)
4. **Existing AI categorization** is MVP's killer feature (zero new code needed, already production-ready)
5. **React Query invalidation** must be comprehensive (stale data kills UX)

**Recommended Approach:**
- **Iteration 17:** Foundation (BankConnection model, encryption, API scaffolding)
- **Iteration 18:** Scraper integration (israeli-bank-scrapers, connection testing)
- **Iteration 19:** Import engine (duplicate detection, transaction batch import)
- **Iteration 20:** UI integration (Settings pages, Sync button, forms)
- **Iteration 21:** Categorization pipeline (connect to existing AI service)
- **Iteration 22:** Polish (error handling, budget alerts, sync status display)

**Risk Mitigation Priority:**
1. Security audit of encryption implementation (before any bank credentials stored)
2. Scraper reliability testing with test bank accounts (before production launch)
3. Duplicate detection accuracy validation (sample 100 transactions, measure false positive/negative rate)

---

*Exploration completed: 2025-11-19*
*This report informs master planning decisions for Plan-6*
