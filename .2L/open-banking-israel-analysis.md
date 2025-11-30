# Israel Open Banking Analysis - בנקאות פתוחה
**Date:** 2025-11-19
**Status:** Official APIs Available ✅

---

## Executive Summary

🎉 **Israel has a mature Open Banking framework!** This is MUCH better than screen scraping.

**Key Benefits:**
- ✅ Official bank APIs (no breaking when banks change websites)
- ✅ OAuth2 authentication (no storing passwords!)
- ✅ Real-time data access
- ✅ Regulatory compliance (Bank of Israel Directive 368)
- ✅ Better security & data quality
- ✅ No OTP/2FA issues

**Recommendation:** **Migrate from `israeli-bank-scrapers` to Open Banking APIs**

---

## 1. Regulatory Framework (2021-2025)

### 1.1 Bank of Israel Directive 368
**"Implementation of Open Banking Standard in Israel"**

- **Standard:** Berlin Group NextGenPSD2 XS2A Framework (same as Europe!)
- **Scope:** All major Israeli banks must provide APIs
- **Technology:** RESTful APIs with standardized endpoints
- **Security:** OAuth2, Strong Customer Authentication (SCA)

### 1.2 Financial Information Services Law (2021)
**Enacted:** June 2022
**Regulator:** Israel Securities Authority (ISA)

**Key Provisions:**
- Banks MUST provide automated API access to customer financial data
- Third parties can access with customer consent
- Covers: bank accounts, credit cards, loans, securities

### 1.3 Payment Services Law (2024)
**Effective:** June 2024
**Regulator:** Israel Securities Authority (ISA)

**Key Updates:**
- Payment initiation services regulated
- Licensing requirements for fintech companies
- Anti-money laundering (AML) obligations
- Transitional period until December 2025

---

## 2. Banks with Open Banking APIs

### 2.1 Bank Hapoalim ✅
**Developer Portal:** https://poalimdev.co.il
**Status:** Live since April 2021
**Standard:** Bank of Israel PSD2

**Available APIs:**
- Account information
- Transaction history
- Balance inquiries
- Payment initiation (with PSD2 license)

**How to Integrate:**
1. Visit poalimdev.co.il
2. Register as developer
3. Get API credentials
4. Implement OAuth2 flow
5. Access customer data with consent

### 2.2 Bank Leumi - FinTeka ✅
**Platform:** FinTeka (dedicated Open Banking subsidiary)
**Launched:** June 15, 2022
**Status:** Most comprehensive in Israel

**Available APIs:**
- **Required 7 APIs:** Account aggregation, data sharing
- **Business Strategy:** Hundreds of additional APIs!
- **Coverage:** Banking, cyber security, payments

**Developer Features:**
- Sandbox environment (test without real accounts)
- Regulatory compliance built-in
- API marketplace for fintechs

### 2.3 FIBI (First International Bank) ⚠️
**Status:** Part of Bank of Israel directive, but no public developer portal found
**Compliance:** Must provide APIs under Directive 368
**Access:** May require ISA license or work through aggregator

### 2.4 Visa CAL Credit Cards ⚠️
**Status:** Covered under open banking regulation
**Access:** APIs available for licensed financial information service providers

---

## 3. Third-Party Aggregation Platforms

### Finanda - Israel's Leading Aggregator
**Website:** https://www.finanda.com/en
**Status:** ISA Licensed
**Experience:** 10+ years of financial aggregation

**What They Provide:**
- Pre-built integrations with ALL Israeli banks
- Open Banking regulation compliant (PSD2)
- Smart aggregation technology
- Sandbox for testing

**Integration Option:**
- Instead of integrating with each bank separately
- Use Finanda's unified API
- They handle all bank-specific complexities
- Single OAuth2 flow for all banks

**Benefits:**
- ✅ Faster time to market (one integration vs many)
- ✅ Covers banks without public APIs (like FIBI, Visa CAL)
- ✅ Regulatory compliance handled
- ✅ Maintained by experts

---

## 4. How Open Banking Works in Israel

### 4.1 Standard Flow (OAuth2)

```
User → Your App → Bank's OAuth2 → Bank Login Page
                                        ↓
                                  User Consents
                                        ↓
                            Access Token Generated
                                        ↓
Your App ← Transaction Data ← Bank API (with token)
```

### 4.2 Data You Can Access (with consent)

**Account Information:**
- Account balance (real-time)
- Account holder details
- Account type, currency, status

**Transaction History:**
- Date, amount, description
- Merchant name (raw)
- Transaction type
- Status (completed/pending)

**Credit Cards:**
- Credit limit
- Current balance
- Available credit
- Transaction history
- Next billing date

**Recurring Payments:**
- Standing orders
- Direct debits
- Scheduled payments

---

## 5. Licensing Requirements

### 5.1 ISA License (Israel Securities Authority)

**Who Needs It:**
- Companies providing financial information services
- Companies initiating payments
- Fintech apps accessing bank data

**Types of Licenses:**
1. **Financial Information Service Provider** - Read-only access to bank data
2. **Payment Initiation Service** - Can initiate payments
3. **Basic License** - Limited scope

### 5.2 Application Process

**Steps:**
1. Submit application to ISA
2. Provide:
   - Business plan
   - Financial statements
   - AML/compliance procedures
   - Technical security documentation
   - Insurance coverage
3. Wait for approval (3-6 months typical)
4. Annual reporting requirements

### 5.3 Transitional Provisions (Until Dec 2025)

**For existing fintech companies:**
- Can continue operations if:
  - Notify ISA by January 30, 2025
  - Submit license application by December 31, 2025
- Allows time to get licensed while operating

---

## 6. Alternative: Use Licensed Aggregator

### Option A: Direct Integration (Complex)
- Apply for ISA license (3-6 months, ongoing compliance)
- Integrate with each bank's API separately
- Maintain OAuth2 flows for each bank
- Handle bank-specific quirks
- Annual ISA reporting

**Estimated Time:** 6-12 months
**Estimated Cost:** High (legal, compliance, development)

### Option B: Use Finanda or Similar Aggregator (Recommended)
- They already have ISA license
- They already integrated with all banks
- Single API to integrate with
- They handle compliance
- Faster time to market

**Estimated Time:** 2-4 weeks
**Estimated Cost:** Moderate (monthly API fees)

---

## 7. Comparison: Open Banking vs Screen Scraping

| Aspect | israeli-bank-scrapers (Current) | Open Banking APIs |
|--------|--------------------------------|-------------------|
| **Reliability** | ❌ Breaks when bank changes UI | ✅ Stable, versioned APIs |
| **Security** | ⚠️ Store encrypted passwords | ✅ OAuth2, no password storage |
| **Data Quality** | ⚠️ Parse HTML, inconsistent | ✅ Structured JSON, standardized |
| **Real-time** | ❌ Scrape on demand (slow) | ✅ Real-time API calls |
| **2FA/OTP** | ❌ Complex, often fails | ✅ Handled by OAuth2 flow |
| **Regulatory** | ⚠️ Gray area | ✅ Fully compliant (Directive 368) |
| **Maintenance** | ❌ High (fix scraper when bank changes) | ✅ Low (bank maintains API) |
| **Coverage** | ✅ Most Israeli banks/cards | ✅ All major banks (by law) |
| **Licensing** | ✅ No license needed | ⚠️ ISA license required (or use aggregator) |
| **Cost** | ✅ Free (npm package) | ⚠️ Aggregator fees or license costs |

---

## 8. Recommended Implementation Path

### Phase 1: Immediate (Keep Current System)
**Timeline:** Now
**Action:** Continue using `israeli-bank-scrapers` while planning migration

**Why:** Don't break existing functionality while researching

### Phase 2: Research & Decision (1-2 weeks)
**Timeline:** Next sprint
**Actions:**
1. ✅ Contact Finanda for demo/pricing
2. ✅ Check Bank Hapoalim API documentation (poalimdev.co.il)
3. ✅ Evaluate ISA licensing requirements
4. ✅ Cost-benefit analysis: Aggregator vs Direct integration
5. ✅ Security audit of OAuth2 implementation

**Decision Point:** Aggregator (Finanda) vs Direct Integration

### Phase 3A: If Using Aggregator (Recommended)
**Timeline:** 2-4 weeks
**Steps:**
1. Sign contract with Finanda (or similar)
2. Get API credentials & sandbox access
3. Implement OAuth2 flow (replace credential form with "Connect Bank" button)
4. Integrate with unified API
5. Test with sandbox accounts
6. Deploy to production
7. Migrate existing users (prompt to re-connect via OAuth2)

### Phase 3B: If Direct Integration
**Timeline:** 6-12 months
**Steps:**
1. Apply for ISA license (3-6 months)
2. While waiting:
   - Implement OAuth2 framework
   - Integrate Bank Hapoalim API (poalimdev.co.il)
   - Test with sandbox
3. After license approval:
   - Integrate Bank Leumi FinTeka
   - Integrate other banks as they provide APIs
4. Deploy to production

### Phase 4: Deprecate Screen Scraping
**Timeline:** After Open Banking tested
**Steps:**
1. Mark `israeli-bank-scrapers` integration as deprecated
2. Prompt users to migrate to OAuth2 connection
3. Sunset screen scraping after 3-6 months
4. Remove `israeli-bank-scrapers` dependency

---

## 9. Technical Implementation: OAuth2 Flow

### 9.1 Updated Architecture

**Before (Screen Scraping):**
```
User enters username/password
   ↓
Store encrypted credentials
   ↓
Scrape bank website with Puppeteer
   ↓
Parse HTML for transactions
```

**After (Open Banking):**
```
User clicks "Connect Bank"
   ↓
Redirect to bank's OAuth2 page
   ↓
User logs in at bank (not in your app!)
   ↓
Bank redirects back with auth code
   ↓
Exchange code for access token
   ↓
Store access token (with refresh token)
   ↓
Call bank API to get transactions (JSON)
```

### 9.2 Database Schema Changes

**Remove (no longer needed):**
```prisma
model BankConnection {
  encryptedCredentials String @db.Text  // ← DELETE (no more passwords!)
}
```

**Add (for OAuth2):**
```prisma
model BankConnection {
  // OAuth2 tokens
  accessToken       String?   @db.Text
  refreshToken      String?   @db.Text
  tokenExpiresAt    DateTime?

  // OAuth2 metadata
  bankAuthProviderId String?  // Bank's OAuth2 provider ID
  scope             String[]  // Granted permissions

  // Keep for backwards compatibility during migration
  encryptedCredentials String? @db.Text  // Deprecated, remove after migration
}
```

### 9.3 UI Changes

**Before:**
```
┌─ Connect Bank ─────────────┐
│ Bank: [FIBI ▼]             │
│ Username: [_____________]  │
│ Password: [_____________]  │
│ [Connect]                  │
└────────────────────────────┘
```

**After:**
```
┌─ Connect Bank ─────────────┐
│ Select your bank:          │
│                            │
│ [Bank Hapoalim]           │
│ [Bank Leumi]              │
│ [FIBI]                    │
│ [Visa CAL]                │
│                            │
│ You'll be redirected to   │
│ your bank's secure login  │
│ page to authorize access. │
└────────────────────────────┘
```

### 9.4 OAuth2 Implementation (Example)

```typescript
// src/server/services/open-banking.service.ts

export async function initiateOAuth2Flow(
  bankProvider: BankProvider,
  userId: string
): Promise<{ authUrl: string; state: string }> {
  // 1. Get bank's OAuth2 config
  const bankConfig = getOAuthConfig(bankProvider)

  // 2. Generate state token (CSRF protection)
  const state = generateSecureState()

  // 3. Store state in session
  await storeOAuthState(userId, state, bankProvider)

  // 4. Build authorization URL
  const authUrl = buildAuthUrl({
    clientId: bankConfig.clientId,
    redirectUri: bankConfig.redirectUri,
    scope: 'accounts transactions',
    state: state,
  })

  return { authUrl, state }
}

export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<BankConnection> {
  // 1. Verify state (CSRF check)
  const { userId, bankProvider } = await verifyOAuthState(state)

  // 2. Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, bankProvider)

  // 3. Store tokens in BankConnection
  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      bank: bankProvider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: 'ACTIVE',
    }
  })

  // 4. Fetch initial account data
  await syncBankAccounts(connection.id)

  return connection
}

export async function refreshAccessToken(
  connectionId: string
): Promise<void> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId }
  })

  if (!connection?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const tokens = await refreshTokens(
    connection.refreshToken,
    connection.bank
  )

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: tokens.access_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    }
  })
}
```

---

## 10. Cost Analysis

### Current Cost (Screen Scraping)
- **Development:** $0 (using free npm package)
- **Maintenance:** High (fix scraper when banks change)
- **Risk:** Medium (could break anytime)
- **User Experience:** Poor (enter passwords, OTP issues)

### Option A: Finanda Aggregator
- **Setup:** ~2-4 weeks development
- **Monthly Fee:** Contact for pricing (estimate: $500-2000/month based on usage)
- **Maintenance:** Low (they handle bank updates)
- **Risk:** Low (professionally maintained)
- **User Experience:** Excellent (OAuth2, no password entry)

### Option B: Direct Integration
- **ISA License:** Legal/compliance costs ($10k-50k+)
- **Development:** 6-12 months ($50k-100k+ in dev time)
- **Annual Compliance:** Ongoing costs
- **Maintenance:** Medium (maintain multiple OAuth2 integrations)
- **Risk:** Medium (regulatory compliance burden)
- **User Experience:** Excellent (OAuth2)

**ROI Recommendation:** Start with aggregator (Finanda), consider direct integration only if scaling to 100k+ users

---

## 11. Next Steps - Action Items

### This Week:
- [ ] Contact Finanda for demo and pricing
- [ ] Register at poalimdev.co.il to explore Bank Hapoalim APIs
- [ ] Review Bank of Israel Directive 368 (Hebrew)
- [ ] Check ISA licensing requirements and timeline

### Next Sprint:
- [ ] Decision: Aggregator vs Direct integration
- [ ] Create technical spec for OAuth2 implementation
- [ ] Design migration plan for existing users
- [ ] Security review of OAuth2 implementation

### Future:
- [ ] Implement OAuth2 flow (Phase 3)
- [ ] Migrate users from screen scraping to OAuth2
- [ ] Deprecate israeli-bank-scrapers
- [ ] Add new features enabled by real-time APIs

---

## 12. Frequently Asked Questions

### Q: Do we need to stop using israeli-bank-scrapers immediately?
**A:** No! Keep it working while planning the migration. Don't break existing functionality.

### Q: Which banks support Open Banking in Israel?
**A:** All major banks are required to by law (Directive 368). Hapoalim and Leumi have public APIs. Others accessible via aggregators like Finanda.

### Q: Is Open Banking more secure than screen scraping?
**A:** Yes! OAuth2 means:
- Users never enter passwords in your app
- You don't store passwords (even encrypted)
- Banks can revoke access instantly
- Standard security protocols

### Q: How long does OAuth2 access last?
**A:** Depends on the bank, but typically:
- Access token: 1 hour
- Refresh token: 90 days or indefinite
- Users re-authorize if refresh token expires

### Q: Can users still use the app during migration?
**A:** Yes! Support both methods during transition:
- Existing users: Keep using screen scraping
- New users: OAuth2 only
- Prompt to migrate over time

### Q: What about FIBI and Visa CAL APIs?
**A:** They're covered by regulation but may not have public developer portals yet. Use an aggregator like Finanda to access them.

---

**Conclusion:** 🎉 **Open Banking is the future!**

Israel has world-class Open Banking infrastructure. Moving from screen scraping to official APIs will make the app more reliable, secure, and compliant.

**Recommended Path:** Start with Finanda aggregator for fastest time-to-market, evaluate direct integration after scaling.

---

**Generated:** 2025-11-19
**References:**
- Bank of Israel: https://www.boi.org.il/roles/supervisionregulation/bank-sup/open-banking/
- Bank Hapoalim API: https://poalimdev.co.il
- Finanda: https://www.finanda.com/en
- ISA (Israel Securities Authority): Regulation of Payment Services Law 2024
