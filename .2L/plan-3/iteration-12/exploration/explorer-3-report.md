# Explorer 3 Report: Complexity & Integration Points

## Executive Summary

Iteration 1 of plan-3 presents a MEDIUM complexity deployment with THREE major integration challenges: (1) Systematic currency migration across 71+ files with 37 USD references and 46 formatCurrency calls, (2) Multi-service production deployment requiring coordination between Vercel, Supabase, and GitHub with 7 critical environment variables, and (3) Zero existing email template infrastructure requiring ground-up design and implementation. The currency migration is mechanical but widespread, deployment has cascading dependencies, and email templates need design + testing across multiple clients. Recommended approach: Split Iteration 1 into 3 sub-builders for parallel execution - Currency Migration, Deployment Configuration, and Test Validation.

## Discoveries

### Discovery Category 1: Currency Migration Scope

**Current State Analysis:**
- **37 USD references** in source files (down from claimed 225 - prior cleanup)
- **46 formatCurrency() calls** across components
- **5 analytics chart components** with hardcoded dollar symbols in tooltips and axes
- **71+ files affected** (components, routers, tests, exports)
- **System already USD-configured** - migration to NIS requires inverse transformation

**Critical Files Identified:**
- `/src/lib/constants.ts` - CURRENCY_CODE, CURRENCY_SYMBOL, CURRENCY_NAME constants
- `/src/lib/utils.ts` - formatCurrency() function (currently returns "$X,XXX.XX")
- `/src/lib/jsonExport.ts` - Export metadata includes currency field
- 5 chart components with hardcoded $ in YAxis tickFormatter
- 17+ UI components using formatCurrency()
- Database schema: User.currency, Account.currency defaults to "USD"

**Hidden Complexity:**
- Chart tooltips have INLINE dollar symbol formatting (not using formatCurrency)
- Test files (3,735 lines total) have expected USD values hardcoded
- Prisma seed scripts reference USD in account/transaction creation
- Component tests verify "$" symbol in rendered output

### Discovery Category 2: Production Deployment Integration

**Infrastructure Dependencies:**
- **Vercel** (Hosting) - Account: ahiya1
- **Supabase Production** - URL: https://npylfibbutxioxjtcbvy.supabase.co
- **GitHub** - Repo: git@github.com:Ahiya1/wealth.git
- **PostgreSQL** - Pooled connection (port 6543) + Direct connection (port 5432)

**Environment Variable Complexity Matrix:**

| Variable | Required For | Security Level | Production Source |
|----------|-------------|----------------|-------------------|
| DATABASE_URL | Prisma ORM | HIGH | Supabase connection pooler |
| DIRECT_URL | Migrations | HIGH | Supabase direct connection |
| NEXT_PUBLIC_SUPABASE_URL | Client auth | PUBLIC | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client auth | PUBLIC | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Server auth | CRITICAL | Supabase service role |
| CRON_SECRET | Recurring jobs | HIGH | Generate: openssl rand -hex 32 |
| ENCRYPTION_KEY | Plaid tokens | HIGH | Generate: openssl rand -hex 32 |

**Critical Integration Points:**
1. **Vercel Build Pipeline:** 
   - Must run `prisma generate` during build
   - Requires DATABASE_URL at build time
   - Requires all NEXT_PUBLIC_* vars at build time
   - Build timeout: 45 seconds (free tier)

2. **Supabase Connection Pooling:**
   - Prisma requires DIRECT_URL for migrations
   - App runtime uses pooled DATABASE_URL
   - PgBouncer transaction mode requires `?pgbouncer=true` flag
   - Connection limit: 60 concurrent (free tier)

3. **GitHub Auto-Deployment:**
   - Vercel webhook triggers on push to main
   - Build status reported back to GitHub
   - Preview deployments for other branches
   - Requires Vercel GitHub App installation

4. **Cron Job Integration:**
   - vercel.json defines schedule: "0 2 * * *" (daily 2 AM UTC)
   - Endpoint: /api/cron/generate-recurring
   - Authentication: Bearer token (CRON_SECRET)
   - Already configured in codebase

### Discovery Category 3: Email Template Infrastructure

**Current State: ZERO INFRASTRUCTURE**
- No `/supabase/templates/` directory exists
- No HTML email templates in codebase
- Supabase config.toml has no email template references
- Auth system relies on Supabase built-in emails (unstyled)

**Required Email Templates:**
1. **confirmation.html** - Signup email verification
2. **reset_password.html** - Password reset flow
3. **magic_link.html** - Passwordless authentication (optional)

**Email Template Complexity:**
- Must use INLINE CSS (most clients strip <style> tags)
- Must be responsive (mobile-friendly)
- Must render correctly in:
  - Gmail (web + mobile app)
  - Outlook (desktop + web)
  - Apple Mail (iOS + macOS)
- Logo hosting: Need CDN URL or base64 embedding
- Brand colors: Sage green #059669, warm grays
- Call-to-action buttons with fallback support

**Template Deployment Methods:**
1. **Supabase Dashboard:** Auth > Email Templates > Upload HTML
2. **Supabase CLI:** Update config.toml, run `supabase db push`
3. **Production Override:** Dashboard settings take precedence

**Testing Requirements:**
- Send test signup email in production
- Verify rendering in 3 major email clients
- Test all links (verification URL, reset password URL)
- Verify email verification blocks access until confirmed

### Discovery Category 4: Testing & Validation Complexity

**Existing Test Infrastructure:**
- **10 test files** (3,735 total lines)
- **Vitest** test runner configured
- **vitest-mock-extended** for mocking Prisma
- Tests cover: accounts, analytics, budgets, recurring, categories, encryption
- **NO integration tests** for production deployment
- **NO end-to-end tests** for email verification flow

**Testing Gaps for Iteration 1:**
- Currency migration: Need to update ~50 test assertions with NIS expected values
- Deployment: No automated verification of production health
- Email templates: No automated testing of HTML rendering
- Environment variables: No validation script for required vars

**Quality Assurance Requirements:**
1. **Local Build Verification:**
   ```bash
   npm run build
   npm run test
   ```

2. **Production Smoke Test Checklist:**
   - [ ] Dashboard loads (/)
   - [ ] Create manual transaction
   - [ ] View transactions list
   - [ ] View analytics charts
   - [ ] Export CSV/JSON
   - [ ] Settings pages render
   - [ ] All amounts display as "X,XXX.XX ₪"

3. **Email Verification Test:**
   - [ ] Signup with new email
   - [ ] Receive styled verification email
   - [ ] Click verification link
   - [ ] Access granted after verification

## Patterns Identified

### Pattern Type: Currency Display Transformation

**Description:** Two-step transformation pattern: (1) Update formatCurrency() function signature, (2) Update all call sites to use new format

**Current Pattern:**
```typescript
// utils.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
// Output: "$1,234.56"

// Component usage
<span>{formatCurrency(transaction.amount)}</span>
```

**Target Pattern (NIS):**
```typescript
// utils.ts
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ₪`
}
// Output: "1,234.56 ₪"

// Component usage (NO CHANGE)
<span>{formatCurrency(transaction.amount)}</span>
```

**Recommendation:** Use this pattern - centralized formatting means component changes are minimal.

**Edge Case - Chart Tooltips:**
Many chart components have INLINE formatting that bypasses formatCurrency():
```typescript
// NetWorthChart.tsx line 39
<p className="text-lg font-bold text-sage-600 tabular-nums">
  ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
</p>
```

**Must update 5 chart files with inline $ formatting.**

### Pattern Type: Environment Variable Configuration

**Description:** Three-tier environment variable management: Local (.env.local) → Preview (Vercel branch) → Production (Vercel main)

**Vercel Configuration Pattern:**
1. Add variable in Vercel Dashboard
2. Select environment scope: Production / Preview / Development
3. Sensitive variables: Enable "Encrypt" option
4. Build-time variables: Must start with NEXT_PUBLIC_

**Recommendation:** Use Vercel Dashboard (NOT Vercel CLI) for initial setup - more reliable and shows all vars in one place.

**Security Pattern:**
- Never commit .env.local to git (already in .gitignore)
- Keep .env.example updated with variable NAMES only (no values)
- Use Vercel's encrypted storage for secrets
- Rotate CRON_SECRET and ENCRYPTION_KEY quarterly

### Pattern Type: Database Migration on Production

**Description:** Two-step migration: (1) Push schema from local, (2) Seed initial data via script

**Migration Pattern:**
```bash
# Step 1: Set production DATABASE_URL in .env.local
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Step 2: Push schema (uses DIRECT_URL)
npm run db:push

# Step 3: Verify schema
npx prisma studio
```

**Recommendation:** Push schema BEFORE first Vercel deployment to avoid build errors.

**Rollback Strategy:**
- Supabase keeps automatic backups (daily for free tier)
- Can restore from Supabase Dashboard: Database > Backups
- Or re-run `npm run db:push` with previous schema

### Pattern Type: Email Template Design

**Description:** Responsive HTML email with inline CSS and progressive enhancement

**Template Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f9fafb;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;background-color:#ffffff;border-radius:8px;">
          <!-- Header with logo -->
          <tr>
            <td style="padding:32px;text-align:center;background-color:#059669;border-radius:8px 8px 0 0;">
              <h1 style="color:#ffffff;margin:0;">Wealth</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#111827;margin:0 0 16px 0;">Verify Your Email</h2>
              <p style="color:#6b7280;line-height:1.5;">{{ .ConfirmationURL }}</p>
              <!-- CTA Button -->
              <table role="presentation" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#059669;border-radius:6px;text-align:center;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Recommendation:** Use table-based layout (not flexbox/grid) for maximum email client compatibility.

**Supabase Template Variables:**
- `{{ .ConfirmationURL }}` - Email verification link
- `{{ .Token }}` - Verification token (if building custom URL)
- `{{ .TokenHash }}` - Token hash (security)
- `{{ .SiteURL }}` - App base URL

## Complexity Assessment

### High Complexity Areas

#### Feature: Production Deployment Configuration (8/10 complexity)
**Why it's complex:**
- **7 critical environment variables** with different security requirements
- **Cascading dependencies:** GitHub → Vercel → Supabase → Database
- **Two-phase connection pooling:** Direct URL for migrations, pooled for runtime
- **Build-time requirements:** Variables must be set BEFORE first deploy
- **Failure modes:** Missing single env var can break entire deployment
- **No rollback:** Production deployment is one-way (can't undo database migrations easily)

**Estimated builder splits needed:** 1 dedicated sub-builder for deployment

**Risk factors:**
- Environment variable typos (e.g., extra space, wrong URL format)
- Connection string format errors (missing ?pgbouncer=true)
- Build failures due to missing NEXT_PUBLIC_* vars
- Database connection limit exhaustion (60 concurrent connections)

**Mitigation strategies:**
- Create pre-flight checklist (verify all env vars before deploy)
- Use Vercel preview deployment FIRST (test with non-production branch)
- Set up connection pooling correctly from day 1
- Document rollback procedure (Supabase backup restoration)

#### Feature: Currency Migration (7/10 complexity)
**Why it's complex:**
- **71+ files to modify** (widespread but systematic)
- **Multiple transformation types:**
  - Constants: USD → NIS (3 files)
  - Functions: formatCurrency() signature (1 file)
  - Components: formatCurrency() calls (46 instances)
  - Charts: Inline $ formatting (5 files)
  - Tests: Expected USD values (10 files)
  - Database: Schema defaults (1 file)
  - Exports: Currency metadata (1 file)
- **Hidden inline formatting:** Not all currency displays use formatCurrency()
- **Test suite updates:** ~50 test assertions need new expected values
- **QA validation:** Must visually check every page for missed currency displays

**Estimated builder splits needed:** 1 sub-builder for currency + 1 for test validation

**Risk factors:**
- Missing inline $ formatting in charts/tooltips
- Forgetting to update test expected values (causes test failures)
- Database seed scripts still creating USD transactions
- CSV/JSON exports showing wrong currency

**Mitigation strategies:**
- Use systematic grep search: `grep -r "\$\|USD\|dollar" src/`
- Update formatCurrency() FIRST, then run app to see what breaks
- Run full test suite: `npm test` (will reveal hardcoded USD assertions)
- Manual QA: Visit every page, create test transaction, export data

#### Feature: Email Template Design & Testing (6/10 complexity)
**Why it's complex:**
- **Zero existing infrastructure** (build from scratch)
- **Design work required:** Responsive HTML + inline CSS
- **Cross-client compatibility:** Gmail, Outlook, Apple Mail have different rendering engines
- **Logo hosting dependency:** Need CDN or base64 encoding
- **Testing across 3 clients:** Manual testing required (no automated solution)
- **Supabase deployment:** Two methods (dashboard vs CLI), unclear which is canonical

**Estimated builder splits needed:** 1 sub-builder for email templates

**Risk factors:**
- Templates render broken in Outlook (uses Word rendering engine)
- Links don't work (Supabase template variable typos)
- Logo doesn't load (CDN CORS issues)
- Email verification doesn't block access (Supabase config error)

**Mitigation strategies:**
- Use proven email template framework (MJML or Foundation for Emails)
- Test templates locally with Supabase Inbucket (http://localhost:54424)
- Use base64 logo embedding (eliminates CDN dependency)
- Enable email verification in Supabase dashboard WITH confirmation required

### Medium Complexity Areas

#### Feature: GitHub Integration (4/10 complexity)
**Why it's medium complexity:**
- Mostly straightforward: Push code → Vercel webhook → Auto-deploy
- Vercel GitHub App must be installed (one-time setup)
- Requires commit/push discipline (no force-push to main)

**Estimated builder splits:** Included in deployment sub-builder

#### Feature: Environment Variable Documentation (3/10 complexity)
**Why it's medium complexity:**
- Update .env.example with all 7 required variables
- Document variable purposes and where to get values
- No code changes, just documentation

**Estimated builder splits:** Included in deployment sub-builder

### Low Complexity Areas

#### Feature: Vercel Project Creation (2/10 complexity)
**Why it's straightforward:**
- Vercel dashboard has clear "New Project" wizard
- Connect GitHub repo → Select Next.js framework → Deploy
- Automatic framework detection (Next.js)
- One-click HTTPS enabled

**Estimated builder splits:** Included in deployment sub-builder

#### Feature: Admin User Creation (2/10 complexity)
**Why it's straightforward:**
- Iteration 2 scope (NOT Iteration 1)
- Three documented methods: Dashboard, SQL, Seed script
- Dashboard method is 30-second task
- Just needs: Email (ahiya.butman@gmail.com), Password (wealth_generator), Auto-confirm checkbox

**Estimated builder splits:** N/A (Iteration 2)

## Technology Recommendations

### Primary Stack (Already Decided)

**Framework: Next.js 14 (App Router)**
- Rationale: Already implemented, production-ready, Vercel-optimized
- No changes needed for Iteration 1

**Database: Supabase PostgreSQL (Production)**
- Rationale: Free tier sufficient (500MB database, 60 connections)
- Connection pooling already configured (PgBouncer transaction mode)
- Row Level Security (RLS) ready for multi-user expansion
- **Action Required:** Push schema to production instance

**Auth: Supabase Auth**
- Rationale: Email/password + OAuth providers built-in
- Email verification system ready (just needs custom templates)
- Magic link support (optional)
- **Action Required:** Enable email confirmations in production dashboard

**Hosting: Vercel**
- Rationale: Zero-config Next.js deployment, GitHub integration, automatic HTTPS
- Free tier: 100GB bandwidth/month, 6,000 build minutes/month
- **Action Required:** Create project, configure env vars, connect GitHub

### Supporting Libraries (Already Implemented)

**tRPC:** Type-safe API layer
- No changes needed - already works with USD/NIS currency

**Prisma ORM:** Database access
- No changes needed - Decimal type handles currency correctly
- Action: Update schema defaults from "USD" to "NIS"

**Recharts:** Analytics charts
- Action: Update 5 chart files with ₪ symbol in tickFormatter

**Vitest:** Test runner
- Action: Update test assertions with NIS expected values

### New Dependencies (Required for Iteration 1)

**None Required** - All features can be built with existing stack

**Optional Enhancement:**
- **MJML** (mjml.io) - Email template framework
  - Simplifies responsive email design
  - Compiles to table-based HTML automatically
  - Usage: `npm install mjml` → Create .mjml files → Compile to HTML
  - **Trade-off:** Adds build step, but reduces email compatibility bugs

## Integration Points

### External APIs

**Supabase Production Instance**
- **Purpose:** PostgreSQL database + authentication services
- **Complexity:** MEDIUM
- **Considerations:**
  - Connection pooling required for serverless (6543 port)
  - Direct connection for migrations (5432 port)
  - Row Level Security policies enforced (users can only see their own data)
  - Free tier: 500MB storage, 2GB bandwidth/month, 60 concurrent connections
  - **Integration method:** Connection strings in Vercel env vars

**Vercel Build API**
- **Purpose:** Automatic deployments on git push
- **Complexity:** LOW
- **Considerations:**
  - Webhook triggered by GitHub push to main branch
  - Build logs visible in Vercel dashboard
  - Preview deployments for non-main branches
  - Build timeout: 45s (free tier), 300s (Pro tier)
  - **Integration method:** Vercel GitHub App

**GitHub Webhook**
- **Purpose:** Notify Vercel of new commits
- **Complexity:** LOW
- **Considerations:**
  - Automatic setup when linking Vercel project to GitHub
  - Requires Vercel GitHub App installation (one-time)
  - Build status reported back to GitHub (green checkmark on commits)
  - **Integration method:** Vercel configures webhook automatically

### Internal Integrations

**Prisma Client ↔ Supabase Database**
- **Connection type:** PostgreSQL connection string
- **How they connect:**
  - Runtime: DATABASE_URL (pooled via PgBouncer port 6543)
  - Migrations: DIRECT_URL (direct via port 5432)
  - Prisma Client generated at build time (`npx prisma generate`)
- **Critical requirements:**
  - Connection strings must include `?pgbouncer=true` for pooled connection
  - DIRECT_URL required for `prisma db push` and `prisma migrate`
  - Connection pooling MUST be transaction mode (not session mode)

**Next.js Build ↔ Vercel Platform**
- **Connection type:** Deployment API
- **How they connect:**
  - Vercel clones GitHub repo on push to main
  - Runs `npm install` → `npm run build`
  - Injects environment variables at build time
  - Deploys to edge network (automatic HTTPS)
- **Critical requirements:**
  - All NEXT_PUBLIC_* vars must be set before build
  - DATABASE_URL required for `prisma generate` during build
  - Build must complete in 45 seconds (free tier)

**Supabase Auth ↔ Next.js Middleware**
- **Connection type:** JWT verification
- **How they connect:**
  - Supabase issues JWT on login
  - Next.js middleware verifies JWT on protected routes
  - Uses NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side requests
  - Uses SUPABASE_SERVICE_ROLE_KEY for server-side admin operations
- **Critical requirements:**
  - Middleware configured in `/src/middleware.ts`
  - Protected routes: `/dashboard/*`, `/transactions/*`, `/accounts/*`, etc.
  - Email verification enforced via Supabase dashboard settings

**Vercel Cron ↔ Recurring Transactions API**
- **Connection type:** HTTP endpoint
- **How they connect:**
  - Vercel triggers `/api/cron/generate-recurring` at 2 AM UTC daily
  - Request includes `Authorization: Bearer [CRON_SECRET]`
  - API validates secret, generates pending recurring transactions
- **Critical requirements:**
  - CRON_SECRET environment variable set in Vercel
  - vercel.json committed to repo (already exists)
  - Endpoint returns 401 Unauthorized if secret is invalid

## Risks & Challenges

### Technical Risks

**Risk 1: Currency Migration Incomplete - Missing Inline Formatting**
- **Impact:** HIGH - Users see mix of USD and NIS, breaks trust
- **Likelihood:** MEDIUM - 46 formatCurrency calls are easy to update, but 5 chart files have inline $ formatting that's easy to miss
- **Mitigation Strategy:**
  1. Run systematic grep: `grep -r "\$\|USD\|dollar" src/` → Document all occurrences
  2. Update formatCurrency() function first
  3. Run dev server (`npm run dev`), visit every page
  4. Create test transaction, verify all displays show ₪
  5. Check chart tooltips specifically (hover over data points)
  6. Export CSV/JSON, verify currency metadata

**Risk 2: Environment Variable Misconfiguration - Build Failures**
- **Impact:** CRITICAL - Deployment fails, production site down
- **Likelihood:** MEDIUM-HIGH - 7 variables with complex connection string formats, easy to typo
- **Mitigation Strategy:**
  1. Create pre-flight checklist (verify all 7 vars before deploy)
  2. Use Vercel preview deployment first (test with non-main branch)
  3. Test build locally: `npm run build` (catches missing vars early)
  4. Document connection string format examples in .env.example
  5. Copy-paste from Supabase dashboard (don't type manually)
  6. Test connection: `npx prisma db pull` (verifies DATABASE_URL works)

**Risk 3: Email Templates Broken in Outlook**
- **Impact:** MEDIUM - Outlook users can't verify email, can't access app
- **Likelihood:** HIGH - Outlook uses Word rendering engine, breaks modern CSS
- **Mitigation Strategy:**
  1. Use table-based layout (not flexbox/grid)
  2. Use inline styles only (no <style> tag)
  3. Use proven email template framework (MJML or Foundation for Emails)
  4. Test in Litmus or Email on Acid (email testing services)
  5. Fallback: Provide plain text version in Supabase template
  6. Document alternative access method (magic link instead of email verification)

**Risk 4: Database Connection Pool Exhaustion**
- **Impact:** MEDIUM - New users can't sign up, existing users can't load data
- **Likelihood:** LOW - Free tier allows 60 concurrent connections, single-user app unlikely to hit this
- **Mitigation Strategy:**
  1. Use connection pooling (port 6543 with ?pgbouncer=true)
  2. Monitor connection count: SELECT count(*) FROM pg_stat_activity
  3. Configure PgBouncer transaction mode (already done in config.toml)
  4. Add connection timeout: ?connect_timeout=10
  5. If hit limit, upgrade Supabase plan ($25/month for 200 connections)

### Complexity Risks

**Risk 5: Builder Overwhelm - Too Many Simultaneous Changes**
- **Impact:** MEDIUM - Builder gets stuck, iteration takes 2-3x longer
- **Likelihood:** HIGH - Currency (71 files) + Deployment (7 env vars) + Email (3 templates) is a lot
- **Mitigation Strategy:**
  1. Split Iteration 1 into 3 sub-builders:
     - **Sub-builder A (Currency Migration):** Update all USD → NIS, run tests
     - **Sub-builder B (Deployment Setup):** Configure Vercel, push database, test build
     - **Sub-builder C (Test Validation):** Manual QA, smoke tests, fix edge cases
  2. Run sub-builders in parallel (currency + deployment can happen simultaneously)
  3. Sub-builder C waits for A+B to complete
  4. Each sub-builder has clear success criteria

**Risk 6: Testing Gaps - Missed Currency Displays**
- **Impact:** MEDIUM - Some pages still show USD, looks unprofessional
- **Likelihood:** MEDIUM - 31 page components, easy to miss one in QA
- **Mitigation Strategy:**
  1. Create comprehensive page checklist:
     - [ ] Dashboard (/)
     - [ ] Transactions list (/transactions)
     - [ ] Transaction detail (/transactions/[id])
     - [ ] Accounts list (/accounts)
     - [ ] Account detail (/accounts/[id])
     - [ ] Analytics (/analytics)
     - [ ] Budgets (/budgets)
     - [ ] Goals (/goals)
     - [ ] Settings (/settings)
     - [ ] Recurring (/recurring)
  2. Test with real data: Create transaction, update account, view charts
  3. Screenshot each page → Visual inspection for $ vs ₪
  4. Automated test: `npm test` (will catch some formatting issues)

**Risk 7: Email Template Design Quality - Looks Unprofessional**
- **Impact:** LOW - Functional but ugly emails, minor UX issue
- **Likelihood:** MEDIUM - Email design is specialized skill, easy to create basic but hard to make beautiful
- **Mitigation Strategy:**
  1. Use email template library (Postmark, SendGrid, Really Good Emails)
  2. Copy proven design patterns (professional templates as starting point)
  3. Focus on functionality first: Does link work? Is text readable?
  4. Design polish can be Iteration 2.5 (optional improvement)
  5. Minimum viable email: Logo + heading + CTA button + footer
  6. Skip animations, fancy graphics (increases complexity, breaks in some clients)

## Recommendations for Planner

### Recommendation 1: Split Iteration 1 into 3 Sub-Builders (CRITICAL)

**Rationale:**
- Currency migration (71 files) + Deployment (7 env vars) + Email (3 templates) is too much for single builder
- Sub-builders enable parallel execution: Currency and Deployment can happen simultaneously
- Clear separation of concerns reduces cognitive load
- Each sub-builder has concrete success criteria

**Sub-builder breakdown:**

**Sub-builder 1-A: Currency Migration (Core)**
- **Scope:** Update all USD → NIS across codebase
- **Files:** 71 (constants, utils, components, charts, tests)
- **Success criteria:**
  - All formatCurrency() calls updated
  - All chart inline $ formatting updated
  - Database schema defaults changed to NIS
  - Constants updated (CURRENCY_CODE, CURRENCY_SYMBOL)
  - Test suite passes (after updating expected values)
- **Duration:** 3-4 hours
- **Blocker for:** Sub-builder 1-C (Test Validation)

**Sub-builder 1-B: Deployment Configuration**
- **Scope:** Configure Vercel + Supabase + GitHub integration
- **Tasks:**
  - Push database schema to Supabase production
  - Create Vercel project, connect GitHub
  - Configure 7 environment variables in Vercel
  - Enable automatic deployments
  - Trigger first production build
  - Verify HTTPS + production URL accessible
- **Success criteria:**
  - Production URL loads (shows app, not 404/500 error)
  - Database connection works (can query data)
  - GitHub push triggers automatic deployment
  - Build succeeds (no TypeScript/lint errors)
- **Duration:** 2-3 hours
- **Blocker for:** Sub-builder 1-C (Test Validation)

**Sub-builder 1-C: Test Validation & QA**
- **Scope:** Manual testing + smoke tests across all pages
- **Tasks:**
  - Run full test suite: `npm test`
  - Visit all 10 page types (dashboard, transactions, accounts, analytics, etc.)
  - Create test transaction in production
  - Verify all amounts display "X,XXX.XX ₪"
  - Export CSV/JSON, verify currency metadata
  - Test responsive design (mobile view)
- **Success criteria:**
  - All tests pass
  - All pages visited, screenshots taken
  - Test transaction shows ₪ symbol
  - No console errors in browser
  - CSV export includes "currency": "NIS"
- **Duration:** 2-3 hours
- **Depends on:** Sub-builder 1-A + Sub-builder 1-B

**Total Iteration 1 time:** 7-10 hours (matches original estimate)

### Recommendation 2: Use Vercel Preview Deployments for Risk-Free Testing

**Rationale:**
- Preview deployments are isolated (separate URL, don't affect production)
- Can test environment variable configuration without risk
- Can verify build succeeds before merging to main
- Free on Vercel free tier (unlimited preview deployments)

**Implementation:**
1. Create branch: `git checkout -b currency-migration-test`
2. Commit currency changes
3. Push to GitHub: `git push origin currency-migration-test`
4. Vercel auto-deploys preview: `https://wealth-git-currency-migration-test-ahiya1.vercel.app`
5. Test preview URL → If working, merge to main → Production auto-deploys

**Benefits:**
- No risk of breaking production
- Can iterate quickly (preview updates in 2-3 minutes on push)
- Preview URL shareable (can test on mobile, share with others)

### Recommendation 3: Create Email Templates AFTER Currency + Deployment

**Rationale:**
- Email templates are Iteration 2 scope (per master-plan.yaml)
- Iteration 1 success criteria don't require email templates
- Can test production deployment with Supabase built-in emails (unstyled but functional)
- Allows parallel work: Iteration 1 builder works on deployment, email designer works on templates

**Deferred to Iteration 2:**
- Custom HTML email templates (confirmation, reset password, magic link)
- Email rendering testing (Gmail, Outlook, Apple Mail)
- Admin user creation (ahiya.butman@gmail.com / wealth_generator)
- Email verification enforcement

**Iteration 1 deliverable:**
- Production deployment with default Supabase emails
- Email verification ENABLED but using built-in templates
- Admin user can be created manually in Supabase dashboard post-deployment

### Recommendation 4: Document Environment Variable Pre-Flight Checklist

**Rationale:**
- Environment variable misconfiguration is #1 deployment failure cause
- 7 variables with complex formats (connection strings, keys, secrets)
- Copy-paste errors common (extra spaces, wrong URL format)
- Pre-flight checklist prevents 80% of deployment issues

**Checklist template (for Sub-builder 1-B):**

```markdown
## Environment Variable Pre-Flight Checklist

### Before Adding to Vercel:

- [ ] Copy variables from Supabase dashboard (Settings → API)
- [ ] Verify no extra spaces in connection strings
- [ ] Confirm DATABASE_URL includes `?pgbouncer=true`
- [ ] Confirm DIRECT_URL uses port 5432 (not 6543)
- [ ] Generate CRON_SECRET: `openssl rand -hex 32`
- [ ] Generate ENCRYPTION_KEY: `openssl rand -hex 32`
- [ ] Test connection locally: Update .env.local, run `npm run dev`

### After Adding to Vercel:

- [ ] Verify all 7 variables visible in Vercel dashboard
- [ ] Confirm Production + Preview + Development scopes selected
- [ ] Trigger deployment (push to branch)
- [ ] Check build logs for "Prisma Client generated successfully"
- [ ] Check build logs for NO errors about missing env vars
- [ ] Verify production URL loads (not 404/500)
```

### Recommendation 5: Add Currency Format Smoke Test to Test Suite

**Rationale:**
- Prevents currency display regressions in future
- Automates validation that would otherwise be manual
- Fast feedback loop (runs in <1 second)

**Implementation:**
```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../utils'

describe('formatCurrency', () => {
  it('formats amount with NIS symbol after amount', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56 ₪')
    expect(formatCurrency(0)).toBe('0.00 ₪')
    expect(formatCurrency(-500)).toBe('-500.00 ₪')
  })

  it('includes ₪ symbol (Unicode U+20AA)', () => {
    const result = formatCurrency(100)
    expect(result).toContain('₪')
    expect(result).not.toContain('$')
    expect(result).not.toContain('USD')
  })
})
```

**Benefits:**
- Catches formatCurrency() regressions immediately
- Runs automatically on every commit (if using CI)
- Documents expected format for future developers

## Resource Map

### Critical Files/Directories

**Currency Constants:**
- `/src/lib/constants.ts` - CURRENCY_CODE, CURRENCY_SYMBOL, CURRENCY_NAME
- **Action:** Change USD → NIS, $ → ₪, "US Dollar" → "Israeli Shekel"

**Currency Formatting:**
- `/src/lib/utils.ts` - formatCurrency() function
- **Action:** Update locale to 'he-IL', return `${formatted} ₪`

**Chart Components (Inline $ Formatting):**
- `/src/components/analytics/NetWorthChart.tsx` (line 39, 57)
- `/src/components/analytics/SpendingByCategoryChart.tsx`
- `/src/components/analytics/MonthOverMonthChart.tsx`
- `/src/components/analytics/IncomeSourcesChart.tsx`
- `/src/components/analytics/SpendingTrendsChart.tsx`
- **Action:** Update YAxis tickFormatter: `$${value}` → `${value} ₪`

**Database Schema:**
- `/prisma/schema.prisma` - User.currency, Account.currency defaults
- **Action:** Change @default("USD") → @default("NIS")

**Export Utilities:**
- `/src/lib/jsonExport.ts` - User currency metadata in exports
- **Action:** Update currency field (Prisma will auto-update based on schema)

**Environment Configuration:**
- `/.env.example` - Template for required environment variables
- **Action:** Add production variable names (DATABASE_URL, DIRECT_URL, etc.)

**Deployment Configuration:**
- `/vercel.json` - Cron job configuration
- **Action:** No changes needed (already configured)

**Supabase Configuration:**
- `/supabase/config.toml` - Local development settings
- **Action:** No changes needed for Iteration 1 (email templates in Iteration 2)

### Key Dependencies

**Production Infrastructure:**
- **Supabase Production:** https://npylfibbutxioxjtcbvy.supabase.co
  - **Why needed:** PostgreSQL database + auth services
  - **Setup required:** Push schema, verify RLS policies
  
- **Vercel Platform:** Account ahiya1
  - **Why needed:** Next.js hosting, automatic deployments, HTTPS
  - **Setup required:** Create project, configure env vars, connect GitHub

- **GitHub Repo:** git@github.com:Ahiya1/wealth.git
  - **Why needed:** Source code repository, triggers automatic deployments
  - **Setup required:** Push currency changes, verify Vercel webhook

**NPM Dependencies (Already Installed):**
- `next@14.2.33` - App framework
- `prisma@5.22.0` - Database ORM
- `@supabase/supabase-js@2.58.0` - Supabase client
- `recharts@2.12.7` - Analytics charts
- `vitest@3.2.4` - Test runner

**No New Dependencies Required for Iteration 1**

### Testing Infrastructure

**Test Runner: Vitest**
- **Configuration:** `/vitest.config.ts`
- **Setup file:** `/vitest.setup.ts`
- **Mock library:** `vitest-mock-extended`

**Existing Test Files (10 total, 3,735 lines):**
- `/src/lib/__tests__/encryption.test.ts` - Encryption utilities
- `/src/server/api/routers/__tests__/accounts.router.test.ts` - Account CRUD
- `/src/server/api/routers/__tests__/analytics.router.test.ts` - Analytics queries
- `/src/server/api/routers/__tests__/budgets.router.test.ts` - Budget CRUD
- `/src/server/api/routers/__tests__/recurring.router.test.ts` - Recurring transactions
- `/src/server/services/__tests__/categorize.service.test.ts` - AI categorization
- `/src/server/services/__tests__/recurring.service.test.ts` - Recurring logic

**Testing Strategy for Iteration 1:**
1. **Unit Tests:** Update expected currency values in existing tests
2. **Integration Tests:** NOT REQUIRED (manual smoke testing sufficient)
3. **E2E Tests:** NOT REQUIRED (manual QA across 10 page types)
4. **Manual QA:** Comprehensive page-by-page testing with screenshots

**Test Commands:**
```bash
npm test                 # Run all tests
npm run test:ui          # Run with Vitest UI (visual test runner)
npm run test:coverage    # Run with coverage report
```

**Quality Gates:**
- All existing tests must pass after currency migration
- No new tests required for Iteration 1 (deployment is infrastructure, not code)
- Manual QA checklist (10 pages) must be completed before production sign-off

## Questions for Planner

### Question 1: Should we create a staging environment for safer testing?

**Context:** Current plan uses Vercel preview deployments for testing, but preview envs are ephemeral (deleted after PR merge). A dedicated staging environment would provide:
- Persistent staging URL (e.g., staging.wealth.vercel.app)
- Separate staging database (not production data)
- Can test email verification flow without spamming real email

**Options:**
- **A) Use preview deployments only** (faster, free, ephemeral)
- **B) Create dedicated staging environment** (persistent, costs $10/month for staging database)

**Recommendation:** Start with preview deployments (faster, free), add staging later if needed

---

### Question 2: Should we build email templates from scratch or use a template library?

**Context:** Email HTML/CSS is specialized (table-based layout, inline styles, limited CSS support). Options:

**A) Build from scratch:**
- Pros: Full control, no dependencies
- Cons: Time-consuming, likely to break in Outlook, requires testing expertise

**B) Use MJML framework:**
- Pros: Compiles to table-based HTML, responsive by default, proven compatibility
- Cons: Adds build step, learning curve
- Example: `<mjml><mj-button>Verify Email</mj-button></mjml>` → 50+ lines of table HTML

**C) Use pre-built template:**
- Pros: Fastest, proven to work
- Cons: Less customization, may not match brand exactly
- Sources: Postmark templates, SendGrid templates, Really Good Emails

**Recommendation:** Use pre-built template (Option C) for Iteration 2 - ship faster, polish later

---

### Question 3: Should we add automated deployment health checks?

**Context:** After Vercel deployment succeeds, there's no automated verification that the app actually works (only that build succeeded). Could add:
- Smoke test endpoint: `/api/health` returns database status, Supabase connection status
- Post-deploy webhook: Calls smoke test endpoint, alerts if failing
- Uptime monitoring: Pingdom, Better Uptime, UptimeRobot (free tier)

**Trade-off:**
- Adds complexity (new endpoint, webhook configuration)
- Provides confidence (automated verification, reduces manual QA)

**Recommendation:** Add `/api/health` endpoint in Iteration 1 (5 minutes to implement), defer uptime monitoring to post-MVP

---

### Question 4: Should we update recurring transactions to respect currency format?

**Context:** Recurring transactions feature exists (cron job generates transactions daily). Currently uses USD formatting. Should:
- **A) Update in Iteration 1** (ensures consistency, adds scope)
- **B) Defer to Iteration 1.5** (reduces Iteration 1 scope, but may confuse users if recurring shows $ while manual shows ₪)

**Scope impact:**
- `/src/components/recurring/*.tsx` - 2 components using formatCurrency (already handled by centralized function)
- `/src/server/services/recurring.service.ts` - No currency-specific logic
- **Conclusion:** Already covered by formatCurrency() update, no additional work needed

**Recommendation:** Included automatically when formatCurrency() is updated - no separate work item needed

---

### Question 5: Should we keep User.currency and Account.currency fields in schema even though we only support NIS?

**Context:** Current schema has currency fields on User and Account models. If we only support NIS:
- **A) Remove fields** (simplifies schema, removes confusion)
- **B) Keep fields** (future-proofs for multi-currency, easier to add later)

**Trade-off:**
- Removing: Requires migration, breaks existing data (if any), harder to add back later
- Keeping: Fields always "NIS", no immediate value, but enables future expansion

**Current state:** USD_ONLY_IMPLEMENTATION.md says fields are kept "for future-proofing"

**Recommendation:** Keep fields as-is (already decided), just update defaults from USD → NIS

---

## Appendix: Iteration 1 Success Criteria (Detailed)

### Visual QA Checklist (Must Pass Before Production Sign-Off)

- [ ] **Dashboard Page (/)**
  - [ ] Account balance cards show "X,XXX.XX ₪"
  - [ ] Income/expense summary shows "X,XXX.XX ₪"
  - [ ] Charts use ₪ on Y-axis labels
  - [ ] Recent transactions show ₪

- [ ] **Transactions Page (/transactions)**
  - [ ] Transaction list shows ₪ for all amounts
  - [ ] Filter/search works
  - [ ] Create transaction form shows ₪ symbol
  - [ ] Edit transaction form shows ₪ symbol

- [ ] **Transaction Detail (/transactions/[id])**
  - [ ] Amount displays "X,XXX.XX ₪"
  - [ ] Category badge visible
  - [ ] Notes, tags, date all render

- [ ] **Accounts Page (/accounts)**
  - [ ] Account cards show balance as "X,XXX.XX ₪"
  - [ ] Manual/Plaid accounts distinguished
  - [ ] Create account form works

- [ ] **Account Detail (/accounts/[id])**
  - [ ] Balance shows "X,XXX.XX ₪"
  - [ ] Transaction history shows ₪
  - [ ] Charts use ₪ formatting

- [ ] **Analytics Page (/analytics)**
  - [ ] Net Worth chart: Y-axis shows "X ₪", tooltips show "X,XXX.XX ₪"
  - [ ] Spending by Category chart: Shows ₪
  - [ ] Income Sources chart: Shows ₪
  - [ ] Month-over-Month chart: Shows ₪
  - [ ] Spending Trends chart: Shows ₪

- [ ] **Budgets Page (/budgets)**
  - [ ] Budget amounts show ₪
  - [ ] Progress bars render
  - [ ] Create budget form shows ₪

- [ ] **Goals Page (/goals)**
  - [ ] Target amounts show ₪
  - [ ] Current amounts show ₪
  - [ ] Progress bars render

- [ ] **Recurring Page (/recurring)**
  - [ ] Recurring amounts show ₪
  - [ ] Create recurring form shows ₪
  - [ ] Upcoming bills widget shows ₪

- [ ] **Settings Page (/settings)**
  - [ ] Profile section renders
  - [ ] Categories section works
  - [ ] No currency selector visible (NIS only)

### Functional QA Checklist

- [ ] **Create Test Transaction**
  - [ ] Transaction saves to database
  - [ ] Amount displays as "X,XXX.XX ₪" on success
  - [ ] Dashboard updates with new balance

- [ ] **Export Data**
  - [ ] CSV export includes currency metadata
  - [ ] JSON export shows "currency": "NIS"
  - [ ] Download works (no browser errors)

- [ ] **Test Suite**
  - [ ] All tests pass: `npm test`
  - [ ] No console errors in test output
  - [ ] Coverage report generated (optional)

- [ ] **Build Verification**
  - [ ] Local build succeeds: `npm run build`
  - [ ] Production build succeeds on Vercel
  - [ ] No TypeScript errors
  - [ ] No lint errors

- [ ] **Deployment Health**
  - [ ] Production URL accessible (HTTPS)
  - [ ] Database connection works (can query data)
  - [ ] GitHub push triggers automatic deployment
  - [ ] Vercel deployment status shows "Ready"

---

**Report Status:** COMPLETE

**Next Steps for Planner:**
1. Review sub-builder split recommendation (3 sub-builders for Iteration 1)
2. Answer 5 open questions (staging, email templates, health checks, recurring, currency fields)
3. Approve OR request clarifications
4. Proceed to Iteration 1 execution with Builder(s)
