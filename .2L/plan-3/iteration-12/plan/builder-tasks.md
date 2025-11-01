# Builder Task Breakdown

## Overview
3 sub-builders will work in a coordinated sequence.
Sub-builders 1-A (Currency Migration) and 1-B (Deployment Configuration) run in parallel, followed by 1-C (Test Validation).

## Builder Assignment Strategy
- Sub-builders 1-A and 1-B have zero file conflicts (work on different files)
- Sub-builder 1-C depends on completion of both 1-A and 1-B
- Clear success criteria for each sub-builder
- Estimated total time: 7-10 hours

---

## Builder-1A: Currency Migration (USD → NIS)

### Scope
Complete systematic migration of all USD currency references to NIS (Israeli Shekel) across the entire codebase. Update currency formatting, database defaults, chart components, and test expectations.

### Complexity Estimate
**MEDIUM-HIGH**

Rationale: 71+ files affected with 172 occurrences, but changes are mechanical and repetitive. Most complexity is in thoroughness (finding all references) rather than technical difficulty. Centralized formatCurrency() pattern reduces complexity significantly.

### Success Criteria
- [ ] formatCurrency() returns "X,XXX.XX ₪" format (tested with multiple values)
- [ ] All 5 analytics chart components show ₪ on tooltips and axes
- [ ] Database schema defaults changed to "NIS" (User.currency, Account.currency)
- [ ] Constants updated (CURRENCY_CODE = 'NIS', CURRENCY_SYMBOL = '₪')
- [ ] All test files pass with updated NIS expected values
- [ ] Grep search returns zero unexpected USD/$ references
- [ ] Local dev server runs without TypeScript errors
- [ ] Manual QA: Dashboard shows ₪ on all amount displays

### Files to Create
No new files - only modifications to existing files

### Files to Modify

**Core Currency Utilities (PRIORITY 1):**
- `src/lib/constants.ts` - Update CURRENCY_CODE, CURRENCY_SYMBOL, CURRENCY_NAME
- `src/lib/utils.ts` - Update formatCurrency() to use 'he-IL' locale and return "${formatted} ₪"

**Database Schema (PRIORITY 2):**
- `prisma/schema.prisma` - Change @default("USD") to @default("NIS") for User.currency and Account.currency fields

**Chart Components with Inline Formatting (PRIORITY 3):**
- `src/components/analytics/NetWorthChart.tsx` - Update YAxis tickFormatter and tooltip
- `src/components/analytics/SpendingByCategoryChart.tsx` - Update tooltip custom formatting
- `src/components/analytics/MonthOverMonthChart.tsx` - Update YAxis and tooltip
- `src/components/analytics/IncomeSourcesChart.tsx` - Update YAxis labels
- `src/components/analytics/SpendingTrendsChart.tsx` - Update YAxis and tooltip

**Export Utilities (PRIORITY 4):**
- `src/lib/csvExport.ts` - Update CSV headers: "Amount (USD)" → "Amount (₪)"
- `src/lib/jsonExport.ts` - No changes needed (uses Prisma schema defaults automatically)

**Test Files (PRIORITY 5):**
- `src/lib/__tests__/utils.test.ts` - Update formatCurrency() test expectations
- `src/server/api/routers/__tests__/accounts.router.test.ts` - Update currency assertions
- `src/server/api/routers/__tests__/analytics.router.test.ts` - Update expected values
- `src/server/api/routers/__tests__/budgets.router.test.ts` - Update currency expectations
- `src/server/api/routers/__tests__/recurring.router.test.ts` - Update test data

### Dependencies
**Depends on:** Nothing (can start immediately)
**Blocks:** Sub-builder 1-C (Test Validation)

### Implementation Notes

**Step-by-step execution:**

1. **Update Core Utilities (15 minutes)**
   ```typescript
   // src/lib/constants.ts
   export const CURRENCY_CODE = 'NIS' as const
   export const CURRENCY_SYMBOL = '₪' as const
   export const CURRENCY_NAME = 'Israeli Shekel' as const

   // src/lib/utils.ts
   export function formatCurrency(amount: number): string {
     const formatted = new Intl.NumberFormat('he-IL', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
     }).format(amount)
     return `${formatted} ₪`
   }
   ```

2. **Update Database Schema (10 minutes)**
   ```prisma
   // prisma/schema.prisma
   model User {
     currency String @default("NIS") // Changed from "USD"
   }

   model Account {
     currency String @default("NIS") // Changed from "USD"
   }
   ```
   Run: `npx prisma generate` (regenerate Prisma client with new defaults)

3. **Systematic Grep Search (30 minutes)**
   ```bash
   # Find all USD references
   grep -rn "USD" src/ --include="*.ts" --include="*.tsx"

   # Find all $ symbols (excluding formatCurrency calls)
   grep -rn '\$' src/ --include="*.tsx" --include="*.ts" | grep -v formatCurrency

   # Find "dollar" mentions in UI text
   grep -ri "dollar" src/

   # Document all findings → Update each occurrence
   ```

4. **Update Chart Components (60 minutes)**
   Each chart needs:
   - YAxis tickFormatter: `(value) => '${value} ₪'` or abbreviated
   - Custom tooltip: Use formatCurrency(entry.value) instead of inline formatting
   - Remove hardcoded $ symbols

   Example:
   ```typescript
   // BEFORE
   <YAxis tickFormatter={(value) => `$${value}`} />
   <Tooltip content={({ payload }) => (
     <div>${Number(payload[0].value).toLocaleString()}</div>
   )} />

   // AFTER
   <YAxis tickFormatter={(value) => `${value} ₪`} />
   <Tooltip content={({ payload }) => (
     <div>{formatCurrency(Number(payload[0].value))}</div>
   )} />
   ```

5. **Update Export Utilities (15 minutes)**
   ```typescript
   // src/lib/csvExport.ts
   const headers = ['Date', 'Description', 'Amount (₪)', 'Type', 'Category']
   // Changed from 'Amount (USD)' or 'Amount ($)'
   ```

6. **Update Test Files (45 minutes)**
   ```typescript
   // BEFORE
   expect(formatCurrency(1234.56)).toBe('$1,234.56')

   // AFTER
   expect(formatCurrency(1234.56)).toBe('1,234.56 ₪')
   ```

   Run: `npm test` after each test file update to verify changes

7. **Verification (30 minutes)**
   - Run full test suite: `npm test` → All tests pass
   - Run dev server: `npm run dev` → No TypeScript errors
   - Manual QA: Visit dashboard, create transaction, view analytics
   - Final grep: Verify no unexpected USD/$ references remain

### Patterns to Follow
Reference patterns from `patterns.md`:
- Use **Currency Formatting Pattern** for all formatCurrency() updates
- Follow **Chart Currency Formatting** pattern for analytics components
- Use **Database Schema Convention** for Prisma changes
- Follow **Testing Patterns** for unit test updates

### Testing Requirements
- Unit tests: Update expected currency format in 5+ test files
- Manual testing: Visual QA on all pages (dashboard, transactions, analytics, budgets, goals)
- Regression testing: Run full test suite (`npm test`) before marking complete

### Potential Issues & Solutions

**Issue 1: Intl.NumberFormat doesn't position ₪ correctly**
- Symptom: formatCurrency returns "₪1,234.56" instead of "1,234.56 ₪"
- Solution: Use custom formatter instead of Intl:
  ```typescript
  export function formatCurrency(amount: number): string {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${formatted} ₪`
  }
  ```

**Issue 2: Chart tooltips still show $ symbol**
- Symptom: Analytics charts display "$1,234.56" in hover tooltips
- Solution: Search for inline $ formatting in chart components:
  ```bash
  grep -rn "\\$.*toLocaleString" src/components/analytics/
  ```
  Replace with formatCurrency() calls

**Issue 3: Tests fail with "Expected $X, received Y ₪"**
- Symptom: Test suite fails after formatCurrency() update
- Solution: Update test expectations systematically:
  ```bash
  # Find all test assertions with $ symbol
  grep -rn '"\$' src/**/__tests__/
  # Update each assertion to expect "X,XXX.XX ₪" format
  ```

---

## Builder-1B: Deployment Configuration

### Scope
Configure production infrastructure for Vercel deployment with Supabase database. Set up GitHub integration, configure environment variables, push database schema to production, and verify build succeeds.

### Complexity Estimate
**MEDIUM**

Rationale: Multiple external services (Vercel, Supabase, GitHub) with cascading dependencies, but well-documented patterns exist. No code changes needed - purely configuration and verification.

### Success Criteria
- [ ] Production Supabase database has correct schema (User, Account, Transaction tables)
- [ ] Vercel project created and linked to GitHub repository
- [ ] All 7 environment variables configured in Vercel dashboard
- [ ] GitHub push to main triggers automatic Vercel deployment
- [ ] Preview deployment succeeds (test branch builds successfully)
- [ ] Production URL accessible via HTTPS
- [ ] Build logs show "Prisma Client generated successfully"
- [ ] Manual curl test to cron endpoint succeeds with valid CRON_SECRET

### Files to Create
- `.env.production` (local testing only - NOT committed to git)
- `docs/deployment-checklist.md` (optional - deployment reference)

### Files to Modify
- `.env.example` - Add production environment variable documentation
- `next.config.js` - Add output: 'standalone' for optimized builds

### Dependencies
**Depends on:** Nothing (can run parallel with Sub-builder 1-A)
**Blocks:** Sub-builder 1-C (Test Validation)

### Implementation Notes

**Pre-flight Checklist (30 minutes):**

1. **Gather Production Credentials**
   - Log into Supabase dashboard: https://app.supabase.com
   - Navigate to Project: npylfibbutxioxjtcbvy
   - Settings → API → Copy:
     - Project URL: https://npylfibbutxioxjtcbvy.supabase.co
     - Anon/Public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     - Service Role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - Settings → Database → Copy:
     - Connection string (Transaction pooler): Port 6543
     - Connection string (Direct connection): Port 5432

2. **Generate Production Secrets**
   ```bash
   # Generate CRON_SECRET
   openssl rand -hex 32

   # Generate ENCRYPTION_KEY
   openssl rand -hex 32

   # Save these securely - will add to Vercel dashboard
   ```

3. **Update .env.example**
   ```bash
   # .env.example
   # DATABASE
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

   # SUPABASE
   NEXT_PUBLIC_SUPABASE_URL="https://npylfibbutxioxjtcbvy.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
   SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" # Server-only

   # SECURITY
   CRON_SECRET="<generate-with-openssl-rand-hex-32>" # Server-only
   ENCRYPTION_KEY="<generate-with-openssl-rand-hex-32>" # Server-only
   ```

**Database Setup (30 minutes):**

1. **Test Connection Locally**
   ```bash
   # Create .env.production (NOT committed to git)
   cp .env.example .env.production
   # Fill in production credentials

   # Test database connection
   npx prisma db pull
   # Should connect successfully and show existing schema (if any)
   ```

2. **Push Schema to Production**
   ```bash
   # Use DIRECT_URL for migrations (not pooled connection)
   npx prisma db push

   # Verify tables created
   npx prisma studio
   # Opens browser - verify User, Account, Transaction tables exist
   ```

3. **Verify RLS Policies**
   - Supabase Dashboard → Database → Policies
   - Verify RLS enabled on auth.users table
   - Check Prisma tables don't have conflicting RLS (Prisma handles auth via middleware)

**Vercel Setup (45 minutes):**

1. **Create Vercel Project**
   - Visit: https://vercel.com/new
   - Click "Import Project"
   - Select GitHub repo: Ahiya1/wealth
   - Framework preset: Next.js (auto-detected)
   - Root directory: ./ (default)
   - Build command: `npm run build` (default)
   - Output directory: .next (default)

2. **Configure Environment Variables**
   - Vercel dashboard → Settings → Environment Variables
   - Add all 7 variables:

   | Variable | Value | Environments | Encrypt |
   |----------|-------|--------------|---------|
   | DATABASE_URL | [pooled connection string] | Production, Preview, Development | No |
   | DIRECT_URL | [direct connection string] | Production, Preview, Development | No |
   | NEXT_PUBLIC_SUPABASE_URL | https://npylfibbutxioxjtcbvy.supabase.co | Production, Preview, Development | No |
   | NEXT_PUBLIC_SUPABASE_ANON_KEY | [anon key] | Production, Preview, Development | No |
   | SUPABASE_SERVICE_ROLE_KEY | [service role key] | Production, Preview, Development | YES |
   | CRON_SECRET | [generated secret] | Production, Preview, Development | YES |
   | ENCRYPTION_KEY | [generated secret] | Production, Preview, Development | YES |

3. **Enable GitHub Integration**
   - Vercel dashboard → Settings → Git
   - Verify GitHub repository connected
   - Enable "Automatic Deployments" on push to main
   - Enable "Preview Deployments" for other branches

4. **Optimize Build Configuration**
   ```javascript
   // next.config.js (add this line)
   const nextConfig = {
     reactStrictMode: true,
     swcMinify: true,
     output: 'standalone', // ← ADD THIS
     experimental: {
       serverActions: {
         bodySizeLimit: '2mb',
       },
     },
   }
   ```
   Commit and push this change

**Preview Deployment Testing (30 minutes):**

1. **Create Test Branch**
   ```bash
   git checkout -b deployment-test
   git add .
   git commit -m "Configure Vercel deployment"
   git push origin deployment-test
   ```

2. **Verify Preview Deployment**
   - Vercel dashboard → Deployments
   - Wait for build to complete (~2-3 minutes)
   - Preview URL: https://wealth-git-deployment-test-ahiya1.vercel.app
   - Click "Visit" → Verify site loads

3. **Test Preview Environment**
   - Homepage loads (/)
   - Sign in page loads (/signin)
   - Protected routes redirect to signin (expected behavior)
   - No 500 errors in browser console

4. **Test Cron Endpoint (Manual)**
   ```bash
   curl -X GET https://wealth-git-deployment-test-ahiya1.vercel.app/api/cron/generate-recurring \
     -H "Authorization: Bearer [CRON_SECRET]"

   # Expected: {"success": true, "generated": 0} (or similar)
   # Not expected: {"error": "Unauthorized"}
   ```

**Production Deployment (15 minutes):**

1. **Merge to Main**
   ```bash
   git checkout main
   git merge deployment-test
   git push origin main
   ```

2. **Verify Production Deployment**
   - Vercel dashboard → Deployments → Production
   - Wait for build to complete (~2-3 minutes)
   - Production URL: https://wealth-ahiya1.vercel.app (or similar)
   - Click "Visit" → Verify site loads with HTTPS

3. **Verify Build Logs**
   - Vercel dashboard → Deployments → Latest → Build Logs
   - Check for:
     - "Prisma Client generated successfully"
     - "Compiled successfully"
     - No errors about missing environment variables
     - Build time under 45 seconds (free tier limit)

### Patterns to Follow
Reference patterns from `patterns.md`:
- Use **Environment Variable Configuration** pattern for Vercel setup
- Follow **Database Migration on Production** pattern for schema push
- Use **Supabase Auth Integration** pattern for connection testing

### Testing Requirements
- Functional testing: Verify preview deployment loads
- Integration testing: Test cron endpoint with CRON_SECRET
- Security testing: Verify SUPABASE_SERVICE_ROLE_KEY marked as server-only
- Performance testing: Verify build time under 45 seconds

### Potential Issues & Solutions

**Issue 1: "Missing environment variable DATABASE_URL" during build**
- Symptom: Vercel build fails with error about missing DATABASE_URL
- Solution: Verify DATABASE_URL is set for all three environments (Production, Preview, Development) in Vercel dashboard

**Issue 2: "Connection pool timeout" errors**
- Symptom: App loads but database queries fail
- Solution: Verify DATABASE_URL includes `?pgbouncer=true&connection_limit=1`

**Issue 3: Cron endpoint returns 401 Unauthorized**
- Symptom: Manual curl test fails with {"error": "Unauthorized"}
- Solution: Verify CRON_SECRET in Vercel matches the secret used in curl command (copy-paste to avoid typos)

**Issue 4: Build succeeds but site shows 500 error**
- Symptom: Vercel deployment shows "Ready" but visiting URL shows error page
- Solution: Check Vercel Function Logs for detailed error messages (Settings → Functions → Logs)

---

## Builder-1C: Test Validation & QA

### Scope
Comprehensive manual testing and quality assurance across all pages and features. Verify currency displays correctly, production deployment works end-to-end, and no regressions introduced. Document any issues found for Sub-builders 1-A and 1-B to fix.

### Complexity Estimate
**MEDIUM**

Rationale: Systematic manual testing across 10 page types, plus automated test suite verification. Not technically complex but time-intensive. Requires attention to detail and thorough documentation of issues.

### Success Criteria
- [ ] Full test suite passes: `npm test` (zero failures)
- [ ] All 10 page types visited and verified (dashboard, transactions, accounts, analytics, budgets, goals, recurring, settings, admin, auth)
- [ ] All currency displays show "X,XXX.XX ₪" format (symbol after amount)
- [ ] Test transaction created in production with ₪ symbol
- [ ] CSV export includes "Amount (₪)" header
- [ ] JSON export includes "currency": "NIS"
- [ ] Charts show ₪ on Y-axis labels and tooltips
- [ ] Mobile responsive design verified (viewport: 375px, 768px, 1024px)
- [ ] No TypeScript errors in browser console
- [ ] No 404 or 500 errors during navigation

### Files to Create
- `.2L/plan-3/iteration-12/qa-report.md` - Comprehensive QA findings
- `.2L/plan-3/iteration-12/screenshots/` - Screenshots of each page (optional)

### Files to Modify
None (purely testing and documentation)

### Dependencies
**Depends on:** Sub-builder 1-A (Currency Migration) AND Sub-builder 1-B (Deployment Configuration)
**Blocks:** Nothing (final step)

### Implementation Notes

**Test Suite Verification (30 minutes):**

1. **Run Full Test Suite**
   ```bash
   # Run all unit and integration tests
   npm test

   # Expected: All tests pass (✓ 57 tests)
   # Not expected: Any failures or errors
   ```

2. **Review Test Coverage**
   ```bash
   # Generate coverage report
   npm run test:coverage

   # Review coverage for critical utilities
   # - src/lib/utils.ts (formatCurrency should be 100%)
   # - src/server/api/routers/* (core routers >80%)
   ```

3. **Document Test Failures**
   - If any tests fail, document in qa-report.md
   - Identify which sub-builder needs to fix (1-A for currency, 1-B for deployment)
   - Block completion until all tests pass

**Visual QA Checklist (90 minutes):**

Visit each page type, verify currency displays, check for errors:

**1. Dashboard Page (/)**
- [ ] Page loads without errors
- [ ] Account balance cards show "X,XXX.XX ₪"
- [ ] Income/expense summary shows ₪
- [ ] Net worth card shows ₪
- [ ] Recent transactions list shows ₪
- [ ] Charts (if any) show ₪ on axes
- [ ] "Add Transaction" button works
- Screenshot: `screenshots/dashboard.png`

**2. Transactions Page (/transactions)**
- [ ] Transaction list loads
- [ ] All amounts show "X,XXX.XX ₪"
- [ ] Filters work (by date, category, account)
- [ ] Search works
- [ ] "Create Transaction" button opens form
- [ ] Form shows ₪ symbol in amount field label
- Screenshot: `screenshots/transactions.png`

**3. Transaction Detail (/transactions/[id])**
- [ ] Detail page loads for existing transaction
- [ ] Amount shows "X,XXX.XX ₪"
- [ ] Category badge visible
- [ ] Date formatted correctly
- [ ] Edit button works
- [ ] Delete button works (with confirmation)
- Screenshot: `screenshots/transaction-detail.png`

**4. Accounts Page (/accounts)**
- [ ] Account list loads
- [ ] Balance shows "X,XXX.XX ₪" on each card
- [ ] Manual accounts distinguished from Plaid
- [ ] "Add Account" button works
- [ ] Account type icons visible
- Screenshot: `screenshots/accounts.png`

**5. Account Detail (/accounts/[id])**
- [ ] Account balance shows "X,XXX.XX ₪"
- [ ] Transaction history shows ₪
- [ ] Charts (if any) show ₪
- [ ] "Add Transaction" button works
- [ ] "Edit Account" button works
- Screenshot: `screenshots/account-detail.png`

**6. Analytics Page (/analytics)**
- [ ] Net Worth chart: Y-axis shows "X ₪", tooltips show "X,XXX.XX ₪"
- [ ] Spending by Category chart: Shows ₪ in tooltips
- [ ] Income Sources chart: Shows ₪
- [ ] Month-over-Month chart: Shows ₪
- [ ] Spending Trends chart: Shows ₪
- [ ] Date range selector works
- [ ] Export button works
- Screenshot: `screenshots/analytics.png`

**7. Budgets Page (/budgets)**
- [ ] Budget list loads
- [ ] Budget amounts show ₪
- [ ] Spent amounts show ₪
- [ ] Progress bars render correctly
- [ ] "Create Budget" button works
- [ ] Form shows ₪ in amount field
- Screenshot: `screenshots/budgets.png`

**8. Goals Page (/goals)**
- [ ] Goals list loads
- [ ] Target amounts show ₪
- [ ] Current amounts show ₪
- [ ] Progress bars render
- [ ] "Create Goal" button works
- [ ] Form shows ₪ in target amount field
- Screenshot: `screenshots/goals.png`

**9. Recurring Page (/recurring)**
- [ ] Recurring transactions list loads
- [ ] Amounts show ₪
- [ ] Frequency displayed correctly
- [ ] "Create Recurring" button works
- [ ] Form shows ₪ in amount field
- Screenshot: `screenshots/recurring.png`

**10. Settings Page (/settings)**
- [ ] Profile section loads
- [ ] Categories section loads
- [ ] No currency selector visible (NIS-only)
- [ ] Form submissions work
- Screenshot: `screenshots/settings.png`

**Functional Testing (45 minutes):**

1. **Create Test Transaction**
   - Navigate to /transactions
   - Click "Create Transaction"
   - Fill form:
     - Amount: 150.50
     - Type: Expense
     - Description: "QA Test Transaction"
     - Date: Today
     - Category: Groceries
   - Submit form
   - Verify: Transaction appears in list with "150.50 ₪"
   - Verify: Dashboard updates with new balance

2. **Export Data (CSV)**
   - Navigate to /transactions
   - Click "Export" dropdown → "Export CSV"
   - Download CSV file
   - Open in Excel/Numbers
   - Verify: Headers include "Amount (₪)"
   - Verify: Amounts in ₪ column (e.g., "150.50")

3. **Export Data (JSON)**
   - Navigate to /transactions
   - Click "Export" dropdown → "Export JSON"
   - Download JSON file
   - Open in text editor
   - Verify: Contains `"currency": "NIS"`
   - Verify: Amounts stored as numbers (not strings)

4. **Mobile Responsive Testing**
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Test viewports:
     - 375px (Mobile - iPhone SE)
     - 768px (Tablet - iPad)
     - 1024px (Desktop)
   - Verify: All pages responsive, no horizontal scroll
   - Verify: Navigation menu works on mobile

**Regression Testing (30 minutes):**

1. **Authentication Flow**
   - Log out
   - Sign in with test account
   - Verify: Dashboard loads after signin
   - Verify: Protected routes redirect to signin when logged out

2. **Data Integrity**
   - Create transaction in Account A
   - Verify: Account A balance updates
   - Verify: Account B balance unchanged
   - Delete transaction
   - Verify: Account A balance reverts

3. **Error Handling**
   - Try to create transaction with negative amount (should fail)
   - Try to create transaction without account (should fail)
   - Verify: Error messages displayed clearly
   - Verify: No console errors logged

**Production Health Check (15 minutes):**

1. **Cron Job Verification**
   ```bash
   # Test cron endpoint manually
   curl -X GET https://wealth-ahiya1.vercel.app/api/cron/generate-recurring \
     -H "Authorization: Bearer [CRON_SECRET]"

   # Expected: {"success": true, "generated": N}
   # Verify: N = number of recurring transactions generated (0 is valid)
   ```

2. **Database Connection**
   - Navigate to /dashboard
   - Open DevTools → Network tab
   - Refresh page
   - Verify: tRPC queries succeed (Status 200)
   - Verify: No 500 errors

3. **Vercel Logs**
   - Vercel dashboard → Functions → Logs
   - Verify: No error logs in past 1 hour
   - Verify: Function invocations succeed

**QA Report Creation (30 minutes):**

Create `.2L/plan-3/iteration-12/qa-report.md`:

```markdown
# QA Report - Iteration 12 (Currency Migration + Production Deployment)

**Date:** 2025-11-01
**Tester:** Sub-builder 1-C
**Environment:** Production (https://wealth-ahiya1.vercel.app)

## Test Summary
- Total tests: 57 automated + 10 manual pages
- Passed: X
- Failed: Y
- Blocked: Z

## Automated Test Results
- Run command: `npm test`
- Result: ✅ All tests passed (or ❌ X failures)
- Coverage: X% (target: >80% for critical utilities)

## Visual QA Results
| Page | Currency Display | Responsive | Errors | Status |
|------|------------------|------------|--------|--------|
| Dashboard | ✅ All ₪ | ✅ Mobile | None | PASS |
| Transactions | ✅ All ₪ | ✅ Mobile | None | PASS |
| ... | ... | ... | ... | ... |

## Functional Test Results
- Create transaction: ✅ Shows "150.50 ₪"
- CSV export: ✅ Headers include "Amount (₪)"
- JSON export: ✅ Contains "currency": "NIS"

## Issues Found
1. [Issue title]
   - Severity: HIGH/MEDIUM/LOW
   - Description: [Detailed description]
   - Steps to reproduce: [1, 2, 3]
   - Expected: [What should happen]
   - Actual: [What actually happened]
   - Screenshot: [Path if available]
   - Assigned to: Sub-builder 1-A or 1-B

## Recommendations
- [Any suggestions for improvements]
- [Potential future enhancements]

## Sign-off
- [ ] All critical issues resolved
- [ ] All tests passing
- [ ] Production deployment stable
- [ ] Ready for Iteration 2
```

### Patterns to Follow
Reference patterns from `patterns.md`:
- Use **Testing Patterns** for test suite verification
- Follow **Currency Formatting Pattern** for visual verification

### Testing Requirements
- Automated tests: Full test suite must pass (npm test)
- Manual testing: All 10 page types visited and verified
- Regression testing: Core functionality (auth, CRUD, exports) verified
- Mobile testing: Responsive design verified on 3 viewport sizes

### Potential Issues & Solutions

**Issue 1: Test suite fails with "Expected $X, received Y ₪"**
- Symptom: npm test shows failures in currency formatting tests
- Solution: Notify Sub-builder 1-A to update test expectations (missed in currency migration)

**Issue 2: Charts still show $ instead of ₪**
- Symptom: Analytics page tooltips display "$1,234.56"
- Solution: Notify Sub-builder 1-A to update inline chart formatting (missed chart component)

**Issue 3: Production site shows 500 error**
- Symptom: Dashboard loads with error page
- Solution: Notify Sub-builder 1-B to check Vercel function logs, verify environment variables

**Issue 4: Mobile view has horizontal scroll**
- Symptom: Responsive design broken on mobile
- Solution: Not blocking for Iteration 1, document in qa-report.md for future fix

---

## Builder Execution Order

### Parallel Group 1 (Start immediately)
- **Sub-builder 1-A (Currency Migration)** - 3-4 hours
- **Sub-builder 1-B (Deployment Configuration)** - 2-3 hours

**Rationale:** These sub-builders have zero file conflicts:
- 1-A modifies src/lib/utils.ts, src/components/*, prisma/schema.prisma
- 1-B modifies .env.example, next.config.js, Vercel dashboard (external)
- No merge conflicts expected

### Sequential Group 2 (After Group 1 complete)
- **Sub-builder 1-C (Test Validation & QA)** - 2-3 hours

**Rationale:** Requires both 1-A and 1-B complete:
- Tests 1-A's currency changes (formatCurrency, chart components)
- Tests 1-B's deployment (production URL, database connection)
- Documents issues for 1-A and 1-B to fix before final sign-off

### Integration Notes
**How outputs come together:**
1. Sub-builder 1-A completes currency migration → Commits to `currency-migration` branch
2. Sub-builder 1-B configures Vercel → Pushes `currency-migration` branch to GitHub
3. Vercel auto-deploys preview: https://wealth-git-currency-migration-ahiya1.vercel.app
4. Sub-builder 1-C tests preview URL → Documents findings in qa-report.md
5. If all tests pass → Merge `currency-migration` to `main` → Production deployment

**Potential conflict areas:**
- `.env.example` - Both 1-A (currency docs) and 1-B (env vars) may modify
  - Resolution: 1-B owns this file, 1-A does not modify
- `next.config.js` - Only 1-B modifies (add output: 'standalone')
- No other conflicts expected

**Shared files that need coordination:**
- None - clear ownership boundaries established

**Communication protocol:**
- Sub-builder 1-A marks complete: Comments on GitHub commit with "Currency migration complete"
- Sub-builder 1-B marks complete: Comments on GitHub commit with "Deployment configured"
- Sub-builder 1-C waits for both comments before starting QA
- Sub-builder 1-C creates issues for any bugs found → Assigns to 1-A or 1-B
- All sub-builders must approve final qa-report.md before Iteration 1 sign-off
