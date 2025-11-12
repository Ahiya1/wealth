# Project Vision: Seamless Data Export & AI-Ready Architecture

**Created:** 2025-11-09T20:30:00Z
**Plan:** plan-5
**Status:** VISIONED

---

## Problem Statement

Wealth has powerful financial tracking capabilities, but users cannot easily extract and analyze their data outside the app. The existing export functionality is fragmented and incomplete:

**Current pain points:**
- Export features exist but are disconnected (only Analytics page has working CSV export)
- **Active Bug:** Export shows "No data to export: There are no transactions in the selected date range" even when transactions exist (date range filter bug)
- No unified "Export Center" - users can't find export options
- Settings/Data page shows "coming soon" for exports despite backend support existing
- Limited to basic CSV transactions - no recurring transactions, no organized multi-file exports
- No mobile-optimized export UX (share sheet, etc.)
- No AI-friendly formatting (missing metadata, context, field descriptions)
- Users who want deeper analysis must manually export and restructure data

**User Need:**
Users want to leverage modern AI tools (ChatGPT, Claude, etc.) for financial insights *today*, before waiting for in-app AI integration. This requires clean, well-structured, portable data exports.

---

## Target Users

**Primary user:** Wealth users who want deeper financial insights
- Power users who analyze spending patterns
- Privacy-conscious users who want data ownership
- Users exploring AI-powered financial analysis tools
- Mobile-first users who need exports on-the-go

**Secondary users:** Future AI integration (Phase 2)
- In-app AI features will leverage the same structured export format
- Clean data architecture now = easier AI integration later

---

## Core Value Proposition

**"Export your financial story, beautifully organized and AI-ready, from anywhere - in seconds."**

**Key benefits:**
1. **Data Liberation** - Your data, your way, anytime, anywhere
2. **AI-Ready Today** - Use cutting-edge AI tools without waiting for in-app features
3. **Future-Proof** - Clean export architecture enables seamless AI integration later
4. **Mobile-First** - Native share sheets and download on any device

---

## Strategic Phasing

### Phase 1: Seamless Export Foundation (This Vision - MVP)
**Goal:** Complete, polished, AI-ready export system across all data types

**Scope:**
- Unified Export Center UI
- Multi-format support (CSV, JSON, Excel)
- Organized export packages (folder structure with README)
- Mobile-optimized experience (share, download)
- AI-friendly metadata and formatting

**Why First:**
- Unlocks immediate user value (use external AI tools now)
- Establishes clean data architecture
- Validates data quality before AI integration
- Lower complexity, faster delivery

### Phase 2: AI Integration (Future - Post-Export MVP)
**Goal:** Bring AI insights directly into Wealth app

**Scope Ideas:**
- Conversational insights ("How much did I spend on dining?")
- Predictive budgeting ("You'll likely overspend in groceries")
- Smart categorization (AI-powered transaction tagging)
- Anomaly detection ("Unusual spending pattern detected")
- Financial coaching (personalized advice based on patterns)

**Why Second:**
- Requires stable export foundation first
- Phase 1 validates data structure & user needs
- Leverages lessons learned from external AI usage patterns
- Higher complexity (API costs, model selection, privacy considerations)

**Bridge Strategy:**
- Phase 1 includes "Analyze with AI" quick action (copies formatted export to clipboard)
- Users can paste directly into ChatGPT/Claude
- We learn what insights users request most → inform Phase 2 priorities

---

## Feature Breakdown - Phase 1: Export MVP

### Must-Have (MVP)

#### 1. **Unified Export Center**
   - Description: Dedicated Settings > Data & Export page with clear export options
   - User story: As a user, I want a single place to export all my data so that I don't hunt through different pages
   - Acceptance criteria:
     - [ ] Settings > Data & Export page shows all export options
     - [ ] Clear sections: Quick Exports, Complete Export, Export History
     - [ ] Each section has descriptive text explaining what's included
     - [ ] Export button states (loading, success, error) are clear

#### 2. **Multi-Format Quick Exports**
   - Description: Export individual data types in user's choice of format
   - User story: As a user, I want to export transactions in CSV for Excel analysis so that I can use familiar tools
   - Acceptance criteria:
     - [ ] Export buttons for: Transactions, Budgets, Goals, Accounts, Recurring Transactions
     - [ ] Format selector: CSV, JSON, Excel (.xlsx)
     - [ ] Date range filter for time-series data (transactions, budgets)
     - [ ] Exports download immediately with descriptive filename (e.g., `wealth-transactions-2025-01-to-2025-11.csv`)
     - [ ] Success toast shows record count ("Downloaded 247 transactions")

#### 3. **Complete Export Package**
   - Description: One-click export of ALL user data in organized folder structure
   - User story: As a user, I want to export everything at once so that I can do comprehensive AI analysis
   - Acceptance criteria:
     - [ ] "Export Everything" button generates ZIP file
     - [ ] ZIP contains organized structure:
       ```
       wealth-export-2025-11-09/
         README.md (explains structure, field meanings, AI usage tips)
         transactions.csv
         recurring-transactions.csv
         budgets.csv
         goals.csv
         accounts.csv
         categories.csv
         summary.json (metadata: export date, record counts, user currency/timezone)
         ai-context.json (structured data optimized for AI analysis)
       ```
     - [ ] All files use consistent date formatting (ISO 8601)
     - [ ] Decimal values formatted consistently (2 decimal places)
     - [ ] CSV files include UTF-8 BOM for Excel compatibility

#### 4. **AI-Friendly Formatting**
   - Description: Exports include metadata and context to make AI analysis easier
   - User story: As a user, I want to paste my export into Claude and get instant insights without manual explanation
   - Acceptance criteria:
     - [ ] `ai-context.json` includes:
       - Field descriptions (e.g., "amount: Transaction amount in NIS, negative = expense")
       - Category hierarchy (parent-child relationships)
       - Account type mappings (CHECKING, SAVINGS, etc.)
       - Budget status explanations
       - Timezone and currency info
     - [ ] `README.md` includes:
       - Quick start: "How to analyze this data with AI"
       - Copy-paste prompt templates for common analyses
       - File format explanations
       - Data dictionary
     - [ ] JSON exports are pretty-printed (2-space indent)
     - [ ] Exports include data version number (for future compatibility)

#### 5. **Mobile-Optimized Export UX**
   - Description: Native mobile export flows (share sheet, downloads folder)
   - User story: As a mobile user, I want to export data and share it with my AI app so that I can analyze on-the-go
   - Acceptance criteria:
     - [ ] Mobile: Trigger native share sheet on export (iOS/Android)
     - [ ] Share sheet allows: Save to Files, AirDrop, Share to Apps
     - [ ] Desktop: Standard download with browser's download manager
     - [ ] Loading states optimized for mobile (progress indicator for large exports)
     - [ ] Export buttons have touch-friendly sizing (min 44px height)
     - [ ] ZIP files work seamlessly on mobile (iOS Files app, Android Downloads)

#### 6. **Export History & Re-Download**
   - Description: Track past exports and allow re-download
   - User story: As a user, I want to re-download last month's export so that I don't need to regenerate it
   - Acceptance criteria:
     - [ ] Export history shows last 10 exports (type, date, size, format)
     - [ ] Cached exports available for 30 days
     - [ ] "Download Again" button for cached exports (instant)
     - [ ] "Generate Fresh" option to create new export with current data
     - [ ] History persists per-user in database
     - [ ] Automatic cleanup of exports older than 30 days (cron job)

#### 7. **Export from Context**
   - Description: Export buttons appear in relevant pages, not just Settings
   - User story: As a user, I want to export my filtered transactions directly from the Transactions page so that I don't lose my filters
   - Acceptance criteria:
     - [ ] Transactions page: Export button respects current filters (date, category, account)
     - [ ] Budgets page: Export current month or all budgets
     - [ ] Goals page: Export all goals
     - [ ] Accounts page: Export account balances and details
     - [ ] Recurring page: Export all recurring transactions
     - [ ] Each page shows export count preview ("Export 47 filtered transactions")

### Should-Have (Post-MVP)

1. **Scheduled Exports** - Automatic monthly/weekly exports to email or cloud storage
2. **Custom Export Templates** - User-defined export formats and fields
3. **Excel Worksheets** - Multi-sheet Excel files (one sheet per data type)
4. **QFX/OFX Export** - Import into Quicken, Mint, YNAB
5. **Encrypted Exports** - Password-protected ZIP files for sensitive data

### Could-Have (Future)

1. **Export Presets** - Save common export configurations ("Last 3 months, Dining only")
2. **Cloud Auto-Sync** - Automatic backup to Google Drive, Dropbox, iCloud
3. **API Access** - Developer API for programmatic data access
4. **Shareable Reports** - Generate public/private URLs for specific reports

---

## User Flows

### Flow 1: Quick CSV Export (Mobile)

**Steps:**
1. User opens Transactions page on mobile
2. Applies filters (Last 3 months, Dining category)
3. Taps "Export" button (top-right)
4. Selects "CSV" format
5. System generates CSV
6. Native share sheet appears
7. User selects "Save to Files" or "Share to ChatGPT app"

**Edge cases:**
- No transactions in filter: Show "No data to export" message
- Export timeout (>30s): Show progress bar, cancel option

**Error handling:**
- Export generation fails: Retry button + error details
- Network error: Offline mode with retry when online

### Flow 2: Complete Export Package (Desktop)

**Steps:**
1. User navigates to Settings > Data & Export
2. Clicks "Export Everything" in Complete Export section
3. Sees preview: "Preparing export with 1,247 transactions, 12 budgets, 3 goals..."
4. System generates ZIP file (3-5 seconds)
5. Browser downloads `wealth-complete-export-2025-11-09.zip`
6. User unzips and opens `README.md`
7. Follows instructions to paste `ai-context.json` into Claude

**Edge cases:**
- Large dataset (10k+ transactions): Show progress bar with ETA
- Concurrent exports: Queue exports, show "Export in progress..."

**Error handling:**
- ZIP generation fails: Fallback to individual file downloads
- Storage quota exceeded: Clear old cached exports, retry

### Flow 3: Re-Download Previous Export

**Steps:**
1. User opens Settings > Data & Export
2. Scrolls to Export History section
3. Sees list of past exports with dates and sizes
4. Clicks "Download Again" on yesterday's complete export
5. File downloads instantly (from cache)

**Edge cases:**
- Export expired (>30 days): "Generate Fresh Export" button shown
- User deleted from cache: Regenerate automatically

**Error handling:**
- Cache miss: Automatically regenerate, notify user of delay

---

## Data Model Overview

**Key entities involved in exports:**

1. **Transaction**
   - Fields: date, amount, payee, category, account, notes, tags
   - Relationships: belongs to Account, Category, User
   - Export considerations: Include category name and account name (denormalized)

2. **RecurringTransaction**
   - Fields: amount, payee, frequency, nextScheduledDate, status
   - Relationships: belongs to Account, Category, User
   - Export considerations: Include human-readable frequency ("Every 2 weeks on Monday")

3. **Budget**
   - Fields: month, amount, categoryId
   - Relationships: belongs to Category, User
   - Export considerations: Include spent amount (calculated), remaining, status

4. **Goal**
   - Fields: name, targetAmount, currentAmount, targetDate, type
   - Relationships: belongs to User, linked to Account
   - Export considerations: Include progress percentage, days remaining

5. **Account**
   - Fields: name, type, balance, institution, plaidAccountId
   - Relationships: belongs to User, has many Transactions
   - Export considerations: Include connection status (Manual vs Plaid)

6. **Category**
   - Fields: name, icon, color, parentId
   - Relationships: belongs to User, has many Transactions
   - Export considerations: Include full hierarchy path

7. **ExportHistory** (New Model)
   - Fields: userId, exportType, format, dateRange, fileSize, s3Key, createdAt, expiresAt
   - Purpose: Track exports for re-download and cleanup

---

## Technical Requirements

**Must support:**
- Mobile browsers (Safari iOS, Chrome Android)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- ZIP file generation (server-side using Node.js `archiver`)
- Excel file generation (using `xlsx` library - already installed!)
- Streaming large exports (prevent memory overflow)
- Async export jobs for large datasets (>5k transactions)

**Constraints:**
- Export file size limit: 50MB (upgrade to S3 storage if exceeded)
- Export generation timeout: 30 seconds
- Cached exports storage: 30 days max
- Concurrent exports per user: 1 at a time

**Preferences:**
- Use existing tRPC routers (extend `users.router.ts`)
- Reuse existing export utilities (`csvExport.ts`, `jsonExport.ts`)
- Add Excel export utility (`xlsxExport.ts`)
- Store export history in Prisma database
- Use Vercel Blob Storage for caching large exports (free tier: 1GB)

---

## Success Criteria

**The Export MVP is successful when:**

1. **Adoption Metric**
   - Metric: Percentage of active users who export data monthly
   - Target: 30% of active users export at least once in first month post-launch

2. **Usability Metric**
   - Metric: Average time from "click export" to "file downloaded"
   - Target: <5 seconds for standard exports, <15 seconds for complete package

3. **Quality Metric**
   - Metric: Support tickets related to export issues
   - Target: <2% of users report export problems

4. **AI Usage Signal**
   - Metric: User feedback mentions AI analysis
   - Target: 10+ users voluntarily share that they used exports with AI tools

5. **Mobile Experience**
   - Metric: Mobile vs desktop export completion rate
   - Target: Mobile completion rate >80% of desktop rate

---

## Out of Scope

**Explicitly not included in Phase 1 Export MVP:**
- AI integration features (chat interface, insights, predictions) → Phase 2
- Import functionality (upload data back into Wealth) → Future iteration
- Real-time export sync (exports are snapshots, not live updates) → Post-MVP
- Multi-user exports (admin exporting all users) → Admin feature, separate
- Third-party integrations (Plaid export, QuickBooks sync) → Future partnerships

**Why:** Keeping Phase 1 focused on export quality ensures fast delivery and validates user needs before building complex AI features.

---

## Assumptions

1. Users have modern browsers with download/share capabilities
2. Average user has <10k transactions (export generation <10s)
3. Users are comfortable with ZIP files
4. Most users will export monthly or quarterly, not daily
5. AI tools (ChatGPT, Claude) will accept JSON/CSV paste or file upload

---

## Current State & Known Issues

### Existing Export Infrastructure
- ✅ `src/lib/csvExport.ts` - Transaction, Budget, Goal, Account CSV generators
- ✅ `src/lib/jsonExport.ts` - Complete data JSON export
- ✅ `src/server/api/routers/users.router.ts` - `exportAllData` tRPC endpoint (working)
- ✅ `src/app/(dashboard)/analytics/page.tsx` - CSV export button (has bug)
- ❌ `src/app/(dashboard)/settings/data/page.tsx` - Shows "coming soon" (needs implementation)

### Critical Bug to Fix
**Export Date Range Filter Bug** (analytics/page.tsx:93-108)
- **Symptom:** "No data to export: There are no transactions in the selected date range"
- **Occurs:** Even when transactions exist in the range
- **Root Cause:** Likely date comparison issue (timezone, date format, or tRPC query filter)
- **Impact:** Users cannot export transaction data from Analytics page
- **Priority:** CRITICAL - must fix in iteration 1 of this plan

### Investigation Needed
1. Check `transactions.list` tRPC query date filtering (src/server/api/routers/transactions.router.ts:23-34)
2. Verify date format passed from Analytics page state (ISO vs Date object)
3. Test timezone handling (user timezone vs UTC vs server timezone)
4. Confirm Prisma date query syntax (gte/lte operators)

---

## Open Questions

1. Should we include transaction IDs in exports for re-import capability later?
   - **Decision:** Yes, include all IDs (transactions, categories, accounts) for future import support

2. What metadata would make AI analysis most useful?
   - **Decision:** Include README with prompt templates, ai-context.json with field descriptions, category hierarchy

3. Should recurring transactions show generated instances or just templates?
   - **Decision:** Export shows templates only; user can see generated transactions in main transactions export

4. How to handle Plaid-connected account security in exports?
   - **Decision:** Redact plaidAccessToken, include plaidAccountId for reference only

5. Should exports include deleted/inactive data?
   - **Decision:** Only active data by default; add "Include Inactive" checkbox for complete exports

---

## Phase 2: AI Integration Preview

**Not part of this vision, but strategic direction:**

Once export infrastructure is solid, we'll add:

### In-App AI Features (Future)

1. **AI Assistant Chat**
   - Ask questions about spending: "How much did I spend on groceries last month?"
   - Get insights: "You spend 15% more on weekends"
   - Receive coaching: "You're on track to meet your savings goal"

2. **Smart Categorization**
   - AI suggests categories for uncategorized transactions
   - Learns from user corrections
   - Reduces manual tagging effort by 80%

3. **Predictive Budgeting**
   - Forecasts spending based on patterns
   - Alerts when likely to exceed budget
   - Suggests budget adjustments

4. **Anomaly Detection**
   - Flags unusual transactions ("$500 charge at gas station?")
   - Identifies subscription increases
   - Catches potential fraud

5. **Financial Health Score**
   - Overall score based on budget adherence, goal progress, spending trends
   - Personalized recommendations to improve score

**Technical Approach:**
- Start with Anthropic Claude API (already have SDK installed!)
- Use export format as conversation context (proven by Phase 1 usage)
- Implement RAG (Retrieval Augmented Generation) on user's financial history
- Privacy-first: All AI processing server-side, no data leaves Wealth/Anthropic

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** ✅ VISIONED
**Ready for:** Master Planning & Execution

---

## Appendix: Export Format Examples

### transactions.csv
```csv
Date,Payee,Category,Account,Amount,Tags,Notes
2025-11-09,Whole Foods,Groceries,Chase Checking,-87.43,"weekly,healthy","Meal prep for week"
2025-11-08,Spotify,Subscriptions,Chase Checking,-9.99,"music,subscription",""
```

### ai-context.json
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-11-09T20:30:00Z",
  "user": {
    "currency": "NIS",
    "timezone": "America/New_York"
  },
  "fields": {
    "transaction.amount": "Amount in NIS. Negative = expense, Positive = income",
    "budget.status": "UNDER_BUDGET | AT_LIMIT | OVER_BUDGET",
    "goal.type": "SAVINGS | DEBT_PAYOFF | INVESTMENT"
  },
  "categories": {
    "hierarchy": {
      "Groceries": { "parent": "Food & Dining" },
      "Restaurants": { "parent": "Food & Dining" }
    }
  },
  "aiPrompts": {
    "spendingAnalysis": "Analyze my spending patterns in transactions.csv. Focus on: 1) Top spending categories, 2) Month-over-month trends, 3) Unusual transactions, 4) Opportunities to save",
    "budgetReview": "Review my budgets.csv and transactions.csv. Tell me: 1) Which budgets am I exceeding? 2) Which have room left? 3) Suggestions for next month",
    "goalProgress": "Check goals.csv against accounts.csv. How am I tracking toward my goals? Any recommendations?"
  }
}
```

### README.md
```markdown
# Wealth Financial Data Export

Exported on: 2025-11-09 at 20:30 UTC
Currency: NIS (₪)
Timezone: America/New_York

## Files Included

- **transactions.csv** - All your transactions (1,247 records)
- **budgets.csv** - Monthly budgets and spending (12 records)
- **goals.csv** - Financial goals and progress (3 records)
- **accounts.csv** - Account balances and info (4 records)
- **recurring-transactions.csv** - Recurring transaction templates (8 records)
- **categories.csv** - Your category structure (45 records)
- **summary.json** - Export metadata and statistics
- **ai-context.json** - Field descriptions and AI prompts

## How to Analyze with AI

### Quick Start (Copy-Paste)
1. Open `ai-context.json`
2. Copy the contents
3. Paste into ChatGPT or Claude with: "I've exported my financial data from Wealth. Here's the context: [paste]. Now analyze my spending patterns in transactions.csv"
4. Upload or paste transactions.csv when prompted

### Recommended Prompts
See `ai-context.json` → `aiPrompts` for copy-paste templates

## Data Dictionary

**Transactions:**
- `date`: Transaction date (YYYY-MM-DD)
- `amount`: Amount in NIS (negative = expense)
- `payee`: Who you paid or received from
- `category`: Spending category
- `account`: Which account was used
- `tags`: Custom tags (comma-separated)
- `notes`: Your transaction notes

**Budgets:**
- `month`: Month in YYYY-MM format
- `budgeted`: Amount budgeted
- `spent`: Amount actually spent
- `remaining`: Budget remaining
- `status`: UNDER_BUDGET / AT_LIMIT / OVER_BUDGET

[... more field descriptions ...]
```
