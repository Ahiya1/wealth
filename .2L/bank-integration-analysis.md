# Bank Integration Analysis Report
**Date:** 2025-11-19
**Status:** Investigation Complete

---

## 1. Current Implementation Analysis

### 1.1 Integration Library
**Package:** `israeli-bank-scrapers` v6.2.5
**Status:** ✅ Actively maintained (2025 updates)
**Supported Banks:**
- ✅ FIBI (First International Bank) - via `CompanyTypes.otsarHahayal`
- ✅ Visa CAL Credit Cards - via `CompanyTypes.visaCal`

### 1.2 Current Architecture

```
User → BankConnectionWizard → BankConnection (encrypted credentials)
                    ↓
        Bank Scraper Service (israeli-bank-scrapers)
                    ↓
        Transaction Import Service (with AI categorization)
                    ↓
        Transaction Database + Account Balance Update
```

**Key Files:**
- `src/server/services/bank-scraper.service.ts` - Core scraping logic
- `src/server/services/transaction-import.service.ts` - Import orchestration
- `src/components/bank-connections/` - UI components

### 1.3 How Transactions System Works Currently

**Pipeline (7 Steps):**

1. **Fetch & Validate** - Get BankConnection, verify user ownership
2. **Find/Create Account** - Link to Account table (CHECKING/CREDIT_CARD)
3. **Scrape Bank** - Use israeli-bank-scrapers to fetch transactions
4. **Load Existing** - Get last 90 days transactions for duplicate detection
5. **Deduplicate** - Three-factor matching (date, amount, merchant name)
6. **Batch Insert** - Create new transactions with `importSource` tracking
7. **AI Categorization** - Automatic categorization with caching

**Current Features:**
- ✅ Duplicate detection (date + amount + merchant)
- ✅ AI categorization (Claude Sonnet 4.5)
- ✅ Encrypted credential storage (AES-256)
- ✅ Import source tracking (MANUAL, FIBI, CAL, PLAID)
- ✅ Budget alerts after import
- ⚠️ **Missing:** Recurring transaction auto-detection
- ⚠️ **Missing:** Credit card → Bank account linking
- ⚠️ **Missing:** Next billing cycle tracking
- ⚠️ **Missing:** CASH account type

---

## 2. Required Credentials & Setup

### 2.1 FIBI (First International Bank / Otsar Hahayal)

**Credentials Structure:**
```typescript
{
  username: string,  // User ID for online banking
  password: string   // Online banking password
}
```

**CompanyType:** `CompanyTypes.otsarHahayal`

**What Users Need:**
1. **Online Banking Access** - Must have active online banking account
2. **User ID** - The username used to log into FIBI online banking
3. **Password** - Current online banking password

**Notes:**
- FIBI uses the `otsarHahayal` scraper (part of beinleumi-group)
- Scraper extends BeinleumiGroupBaseScraper
- Timezone: Asia/Jerusalem
- May require 2FA/OTP for some accounts

### 2.2 Visa CAL Credit Card

**Credentials Structure:**
```typescript
{
  username: string  // CAL credit card online account username
}
```

**CompanyType:** `CompanyTypes.visaCal`

**What Users Need:**
1. **CAL Online Account** - Must register at CAL website
2. **Username** - CAL online account username (not card number)

**Notes:**
- Simpler credential structure (username only!)
- Password may be handled differently by scraper
- Fetches up to 1 year of transactions
- May require periodic 2FA

---

## 3. Why Current Solution Isn't Working

### 3.1 Error: "Failed to connect to bank"

**Root Causes:**

1. **Incorrect Credentials**
   - User entered wrong username/password
   - Password recently changed at bank
   - Account locked due to failed attempts

2. **Bank Website Changes**
   - Bank updated their UI/authentication flow
   - Scraper needs update to match new bank interface
   - Current version: israeli-bank-scrapers@6.2.5

3. **Missing 2FA/OTP Handling**
   - Bank requires OTP but system doesn't prompt for it
   - No OTP callback implemented in current flow

4. **Network/Timeout Issues**
   - Bank server slow to respond
   - Scraper timeout (default settings)
   - Vercel serverless function timeout (10s max)

5. **Headless Browser Issues**
   - `showBrowser: false` may fail on some bank flows
   - Puppeteer configuration issues in serverless environment

### 3.2 Database Schema Issues

**Current Schema Limitations:**

❌ **No CASH account type** - `AccountType` enum missing CASH
❌ **No credit card → bank linking** - Credit cards not linked to funding accounts
❌ **No billing cycle tracking** - No fields for next payment date, billing cycle
❌ **No recurring detection** - Transactions not auto-linked to recurring templates

---

## 4. Recommended Improvements

### 4.1 Add CASH Account Type

**Schema Change:**
```prisma
enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD
  INVESTMENT
  CASH        // ← NEW
}
```

**UI Change:**
- Add "Cash" option in account creation
- Manual entry for cash balance
- Track cash transactions separately

### 4.2 Link Credit Cards to Bank Accounts

**New Schema Fields (Account model):**
```prisma
model Account {
  // ... existing fields

  // Credit card → bank linking
  linkedAccountId    String?   // Reference to funding bank account
  linkedAccount      Account?  @relation("LinkedAccounts", fields: [linkedAccountId], references: [id])
  linkedCreditCards  Account[] @relation("LinkedAccounts")

  // Billing cycle tracking (credit cards only)
  billingCycleDay    Int?      // Day of month (1-31)
  nextBillingDate    DateTime?
  creditLimit        Decimal?  @db.Decimal(15, 2)
  currentBalance     Decimal?  @db.Decimal(15, 2)
  availableCredit    Decimal?  @db.Decimal(15, 2)
}
```

**Benefits:**
- See which bank account pays each credit card
- Track next billing cycle date
- Calculate available credit
- Prevent duplicate balance counting (credit card debt already deducted from bank)

### 4.3 Improve Recurring Transaction Detection

**Current State:**
- `RecurringTransaction` model exists
- Transactions can link to recurring templates via `recurringTransactionId`
- ❌ No automatic detection of recurring patterns

**Proposed Enhancement:**
1. **Pattern Detection Service**
   - Analyze transaction history for recurring patterns
   - Match by payee + similar amount + time interval
   - Suggest recurring transaction creation

2. **Auto-Link Imported Transactions**
   - When importing, check if transaction matches existing recurring template
   - Automatically set `recurringTransactionId`
   - Track in UI: "This is a recurring transaction"

3. **Credit Card Recurring Support**
   - Flag recurring transactions on credit cards
   - Show recurring charges in billing cycle view
   - Predict next month's bill based on recurring charges

### 4.4 Enhanced AI Categorization for Credit Cards

**Current:**
- AI categorizes all transactions uniformly
- No special handling for credit card transactions

**Proposed:**
1. **Merchant Recognition**
   - Use `rawMerchantName` from import for better categorization
   - Build merchant → category cache
   - Learn from user corrections

2. **Credit Card Specific Categories**
   - "Credit Card Payment" - for payments TO credit card
   - "Credit Card Fee" - for interest/late fees
   - "Credit Card Refund" - for refunds/reversals

3. **Installment Tracking**
   - Detect installment transactions (common in Israel)
   - Group installments together in UI
   - Show "Payment 3 of 12" style labels

### 4.5 Fix Bank Connection Errors

**Immediate Actions:**

1. **Update israeli-bank-scrapers**
   ```bash
   npm update israeli-bank-scrapers
   ```
   - Check for latest version with bank website updates

2. **Implement 2FA/OTP Support**
   ```typescript
   // In bank-scraper.service.ts
   const scraper = createScraper({
     companyId,
     // ... other options
   });

   // Add OTP callback
   const scrapeCredentials = {
     username: credentials.userId,
     password: credentials.password,
     otpCodeRetriever: async () => {
       // Prompt user for OTP via modal
       return await promptUserForOTP();
     }
   };
   ```

3. **Add Detailed Error Logging**
   - Log exact scraper error types
   - Capture bank-specific error messages
   - Store in BankConnection.errorMessage

4. **Implement Retry Logic**
   - Retry failed scrapes with exponential backoff
   - Allow user to manually trigger re-sync with OTP

5. **Connection Testing**
   - Add "Test Connection" button
   - Validate credentials before saving
   - Show specific error messages (wrong password vs account locked)

---

## 5. Proposed Architecture: Credit Cards → Banks

### 5.1 Data Model

```
CASH Account (manual)
    ↓ (no linking needed)
    Transactions

BANK Account (FIBI scraping)
    ↓ (linked to)
    CREDIT CARD Account (Visa CAL scraping)
        ↓
        Credit Card Transactions

Next Billing Date: calculated from billingCycleDay
Current Debt: sum of unpaid credit card transactions
Available Credit: creditLimit - currentBalance
```

### 5.2 UI Changes

**Accounts Page:**
```
┌─ Bank Accounts ─────────────────┐
│ FIBI Checking      ₪15,000     │
│   ↳ Visa CAL     -₪2,500 debt  │  ← Shows linked credit card
│                                  │
│ Cash               ₪500         │
└──────────────────────────────────┘

Next Billing: Nov 25, 2025 (6 days)
```

**Credit Card Detail:**
```
┌─ Visa CAL Credit Card ──────────────┐
│ Linked to: FIBI Checking            │
│ Billing Cycle: 25th of each month   │
│ Next Bill: Nov 25, 2025              │
│                                      │
│ Credit Limit:     ₪10,000           │
│ Current Balance:  -₪2,500           │
│ Available Credit:  ₪7,500           │
│                                      │
│ Recurring Charges This Cycle:       │
│   • Netflix         ₪55.90          │
│   • Spotify         ₪29.90          │
│   • Gym Membership  ₪299.00         │
│                                      │
│ Recent Transactions (this cycle):   │
│   [Transaction list...]              │
└──────────────────────────────────────┘
```

### 5.3 Transaction Flow

**When Credit Card Transaction Imported:**
1. Import via Visa CAL scraper
2. AI categorization (with merchant recognition)
3. Check for recurring pattern
4. Auto-link to recurring template if matched
5. Update credit card current balance
6. Update next billing date if needed

**When User Pays Credit Card:**
1. Create transaction in BANK account (outflow)
2. Create matching transaction in CREDIT CARD account (inflow)
3. Link both transactions (`linkedTransactionId`)
4. Update balances atomically

---

## 6. Implementation Roadmap

### Phase 1: Fix Current Integration (1-2 days)
- [ ] Update israeli-bank-scrapers to latest version
- [ ] Implement 2FA/OTP support with modal
- [ ] Add detailed error logging
- [ ] Add connection testing feature
- [ ] Document credential requirements in UI

### Phase 2: Add CASH Account Type (1 day)
- [ ] Update AccountType enum (add CASH)
- [ ] Update UI to support CASH accounts
- [ ] Add manual cash balance tracking
- [ ] Migration for existing data

### Phase 3: Credit Card Linking (2-3 days)
- [ ] Add credit card fields to Account model
- [ ] Create credit card → bank linking UI
- [ ] Implement billing cycle calculation
- [ ] Add "Next Billing Date" tracking
- [ ] Create credit card detail page

### Phase 4: Recurring Transaction Auto-Detection (3-4 days)
- [ ] Build pattern detection service
- [ ] Auto-link imported transactions to recurring templates
- [ ] Add recurring charge prediction for credit cards
- [ ] Create UI for managing detected recurring transactions

### Phase 5: Enhanced AI Categorization (2-3 days)
- [ ] Improve merchant name recognition
- [ ] Add credit card specific categories
- [ ] Build merchant → category cache
- [ ] Implement installment detection

---

## 7. FAQ: What Details Users Need

### For FIBI Connection:
1. **Online Banking Username** - The ID used to log into https://online.fibi.co.il
2. **Online Banking Password** - Current password (if expired, update at bank first)
3. **Optional: OTP Device** - If 2FA enabled, have phone/token ready

### For Visa CAL Connection:
1. **CAL Online Username** - Username for CAL online account (not card number!)
2. **Optional: OTP Device** - May require periodic 2FA

### Common Issues:
- ❌ **"Wrong credentials"** → Check username/password at bank website first
- ❌ **"Account locked"** → Too many failed attempts, contact bank
- ❌ **"Connection timeout"** → Bank server slow, try again later
- ❌ **"OTP required"** → Not implemented yet, manual import needed

---

## 8. Next Steps

**Immediate (This Week):**
1. Update israeli-bank-scrapers package
2. Test FIBI and Visa CAL connections with current version
3. Document exact credential requirements in UI
4. Add better error messages

**Short Term (Next Sprint):**
1. Implement 2FA/OTP support
2. Add CASH account type
3. Begin credit card linking schema changes

**Long Term (Future Iterations):**
1. Recurring transaction auto-detection
2. Enhanced AI categorization
3. Billing cycle predictions
4. Installment tracking

---

**Generated:** 2025-11-19
**By:** Claude Code Analysis
