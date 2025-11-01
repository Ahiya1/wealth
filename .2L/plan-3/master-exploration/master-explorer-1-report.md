# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Transform the locally-developed Wealth finance tracker from USD to NIS (Israeli Shekel) currency and deploy to production on Vercel with Supabase backend, including email verification with custom branded templates and pre-configured admin user access.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 7 must-have features
- **User stories/acceptance criteria:** 51 acceptance criteria across all features
- **Estimated total work:** 8-12 hours

**Feature breakdown:**
1. Complete USD to NIS Currency Migration (10 acceptance criteria)
2. Production Supabase Configuration (5 acceptance criteria)
3. GitHub Integration (6 acceptance criteria)
4. Vercel Production Deployment (6 acceptance criteria)
5. Environment Configuration (7 acceptance criteria)
6. Email Verification with Custom Branded Templates (8 acceptance criteria)
7. Admin User Creation (6 acceptance criteria)

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Scope is focused but multi-layered:** 7 distinct features spanning frontend, backend, database, and infrastructure
- **Currency migration is widespread but mechanical:** 225 occurrences across 70 files - requires systematic replacement but follows clear patterns
- **Production deployment is well-documented:** Existing architecture is modern and production-ready (Next.js 14, tRPC, Prisma, Supabase)
- **No data migration needed:** Fresh production deployment eliminates complex migration challenges
- **Clear technical requirements:** Technology stack is established, patterns are consistent, no unknowns

**Key complexity drivers:**
- **Breadth over depth:** Changes span many files (~70 files) but are mostly find-replace operations
- **Email template creation:** New custom HTML templates need design and implementation (estimated 2-3 hours)
- **Environment orchestration:** Multiple services (GitHub, Vercel, Supabase) need coordination
- **Testing surface area:** Currency changes affect 17 component files, 10+ API routers, database schema, and exports

---

## Architectural Analysis

### Major Components Identified

1. **Currency Display Layer (Frontend Components)**
   - **Purpose:** Render currency symbols and formatted amounts across all user-facing components
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** User-facing changes - every currency display must be visually correct
   - **Files affected:** 17 component files using `formatCurrency()`, plus form components
   - **Pattern:** Most components import and call `formatCurrency()` from `/src/lib/utils.ts`
   - **Risk:** Missing a component could leave USD symbols visible to users

2. **Currency Formatting Utilities**
   - **Purpose:** Centralized currency formatting logic
   - **Complexity:** LOW
   - **Why critical:** Single source of truth for currency display format
   - **Files affected:**
     - `/src/lib/utils.ts` - `formatCurrency()` function
     - `/src/lib/constants.ts` - `CURRENCY_CODE`, `CURRENCY_SYMBOL`, `CURRENCY_NAME`
   - **Pattern:** Intl.NumberFormat API with locale and currency settings
   - **Change required:** Update from `en-US` locale + `USD` to `he-IL` locale + `NIS`, symbol positioning

3. **Database Schema Layer**
   - **Purpose:** Store currency metadata and default values
   - **Complexity:** LOW
   - **Why critical:** Ensures all new records default to NIS
   - **Files affected:** `/prisma/schema.prisma`
   - **Fields to update:**
     - `User.currency` default: `"USD"` → `"NIS"`
     - `Account.currency` default: `"USD"` → `"NIS"`
   - **Migration strategy:** Schema changes + database push (fresh prod DB, no migration needed)

4. **API/Backend Layer (tRPC Routers)**
   - **Purpose:** Handle business logic and data operations
   - **Complexity:** LOW
   - **Why critical:** Backend validation and processing must align with NIS
   - **Files affected:** 10+ routers in `/src/server/api/routers/`
   - **Pattern:** Most routers don't hardcode currency - they use database defaults
   - **Potential issues:** Plaid integration may have USD assumptions (needs verification)

5. **Data Export Layer**
   - **Purpose:** Generate CSV/JSON exports for user data
   - **Complexity:** LOW
   - **Why critical:** Exported data must reflect NIS currency
   - **Files affected:**
     - `/src/lib/csvExport.ts` - Transaction, Budget, Goal, Account CSV exports
     - `/src/lib/jsonExport.ts` - Complete data JSON export
   - **Pattern:** Exports include `user.currency` field, which will automatically be NIS after migration
   - **Action needed:** Verify CSV headers don't hardcode currency symbols

6. **Authentication & Email System**
   - **Purpose:** User signup, verification, and password reset
   - **Complexity:** MEDIUM
   - **Why critical:** New production requirement - email verification not fully configured
   - **Components:**
     - Supabase Auth (already integrated)
     - Custom email templates (NEED TO CREATE)
     - Email verification flow (needs enabling in Supabase)
   - **Files to create:**
     - `supabase/templates/confirmation.html`
     - `supabase/templates/reset_password.html`
     - `supabase/templates/magic_link.html` (optional)
   - **Configuration:** `supabase/config.toml` needs email settings

7. **Deployment Infrastructure**
   - **Purpose:** Production hosting, database, and CI/CD
   - **Complexity:** MEDIUM
   - **Why critical:** Core production readiness requirement
   - **Components:**
     - **Vercel:** Next.js hosting, serverless functions, cron jobs
     - **Supabase Production:** PostgreSQL database with RLS
     - **GitHub:** Version control and automatic deployments
   - **Environment variables:** 7+ variables needed in Vercel dashboard
   - **Existing config:** `vercel.json` already configured for cron jobs

### Technology Stack Implications

**Database (PostgreSQL via Supabase)**
- **Current:** PostgreSQL with Prisma ORM, working in local dev
- **Recommendation:** Use production Supabase instance (already provisioned)
- **Rationale:**
  - Credentials provided in vision document
  - RLS policies already implemented in codebase
  - Direct URL available for Prisma migrations
  - No database engine changes needed

**Frontend (Next.js 14 + React)**
- **Current:** App Router, Server Components, Client Components pattern
- **Recommendation:** No architectural changes needed
- **Rationale:**
  - Modern Next.js 14 architecture is Vercel-optimized
  - tRPC integration already working
  - Currency changes are purely data-level, not architectural

**Authentication (Supabase Auth)**
- **Current:** Supabase Auth with email/password, OAuth support
- **Recommendation:** Enable email verification, create custom templates
- **Rationale:**
  - Auth infrastructure already in place
  - Email verification disabled in dev, needs enabling for production
  - Custom templates enhance brand consistency
  - Admin user needs email pre-verified for immediate access

**Deployment (Vercel)**
- **Current:** Local development only
- **Recommendation:** Deploy to Vercel with GitHub auto-deployments
- **Rationale:**
  - Next.js is Vercel's primary framework - native integration
  - Automatic deployments reduce manual overhead
  - Serverless functions support existing API routes
  - Cron support for recurring transaction generation

**Build Pipeline**
- **Current:** Standard Next.js build process
- **Recommendation:** No changes needed - works on Vercel
- **Rationale:**
  - `package.json` scripts are production-ready
  - TypeScript compilation via `next build`
  - Prisma client generation via postinstall hook
  - No custom build steps required

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (2 phases)

**Rationale:**
- **Two distinct workstreams:** (1) Currency migration + deployment infrastructure, (2) Email templates + admin user
- **Logical checkpoint:** Can deploy with basic auth before custom email templates are ready
- **Risk mitigation:** Separating currency changes from email template creation allows focused testing
- **Estimated duration:** 8-12 hours total (6-8 hours iteration 1, 2-4 hours iteration 2)
- **Parallel work opportunity:** Email template design can start during iteration 1

### Suggested Iteration Phases

**Iteration 1: Currency Migration + Production Deployment**
- **Vision:** Deploy NIS-native Wealth app to production with working authentication and data persistence
- **Scope:** Complete currency migration and establish production infrastructure
  - Update currency constants (`CURRENCY_CODE`, `CURRENCY_SYMBOL`, `CURRENCY_NAME`)
  - Modify `formatCurrency()` function for NIS formatting (symbol after amount)
  - Update Prisma schema defaults (`User.currency`, `Account.currency`)
  - Search and replace all USD references in components, routers, tests
  - Configure production environment variables in Vercel
  - Push database schema to production Supabase
  - Deploy to Vercel via GitHub integration
  - Verify basic auth flow works (email/password without custom templates)
  - Test CRUD operations on production database
- **Why first:** Establishes core production infrastructure - can be used immediately even without custom emails
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
  - Risk: Missing currency references in obscure files
  - Risk: Environment variable misconfiguration breaks auth
  - Mitigation: Systematic grep search, Vercel preview deployments for testing
- **Success criteria:**
  - App accessible at Vercel URL
  - All visible amounts show "X,XXX.XX ₪" format
  - User can sign up (with default Supabase emails)
  - Transactions, accounts, budgets persist to production database
  - Auto-deployment triggers on push to main

**Iteration 2: Branded Email Templates + Admin User**
- **Vision:** Professional email verification flow with branded templates and pre-configured admin access
- **Scope:** Create custom email templates and set up admin user
  - Design responsive HTML email templates
    - Signup confirmation/verification template
    - Password reset template
    - Magic link template (optional)
  - Apply brand colors, logo, and styling
  - Update `supabase/config.toml` to reference custom templates
  - Deploy templates to production Supabase
  - Enable email verification requirement in Supabase settings
  - Create admin user via Supabase SQL or dashboard
    - Email: ahiya.butman@gmail.com
    - Password: wealth_generator
    - Pre-verify email (bypass verification)
  - Test email templates across email clients
  - Verify admin login works immediately
- **Dependencies:**
  - Requires: Production Supabase instance (from iteration 1)
  - Requires: Vercel deployment (for testing email links)
  - Uses: Existing auth infrastructure
- **Estimated duration:** 2-4 hours
- **Risk level:** LOW-MEDIUM
  - Risk: Email templates render poorly in Outlook/Gmail
  - Risk: Email verification breaks existing auth flow
  - Mitigation: Test with real email clients, keep verification optional until confirmed working
- **Success criteria:**
  - New signups receive branded verification emails
  - Email templates render correctly in Gmail, Outlook, Apple Mail
  - All email links (verify, reset password) work correctly
  - Admin user can login without email verification
  - Email templates match app's visual brand

---

## Dependency Graph

```
Foundation Setup
├── Production Supabase Instance (already provisioned)
├── GitHub Repository (already exists)
└── Vercel Account (already configured)
    ↓
ITERATION 1: Currency Migration + Deployment
├── Currency Constants Update
│   └── formatCurrency() function modification
│       └── Component-level currency display updates (17 files)
├── Database Schema Updates
│   └── Prisma schema migration
│       └── Database push to production
├── Environment Configuration
│   └── Vercel environment variables
│       └── GitHub integration setup
│           └── Initial production deployment
│               └── Auth testing & CRUD verification
    ↓
ITERATION 2: Email Templates + Admin User
├── Email Template Design
│   ├── confirmation.html (depends on: brand assets, copy)
│   ├── reset_password.html
│   └── magic_link.html (optional)
├── Supabase Email Configuration
│   └── config.toml update
│       └── Deploy templates to production
│           └── Enable email verification
├── Admin User Creation
│   └── SQL/Dashboard user creation
│       └── Pre-verify email
│           └── Test admin login
```

**Critical Path:**
1. Currency constants → formatCurrency() → Component updates (sequential)
2. Environment variables → Vercel deployment (sequential)
3. Iteration 1 completion → Iteration 2 start (sequential)

**Parallel Opportunities:**
- Email template design can start during Iteration 1 (while code changes are being tested)
- Database schema update can happen simultaneously with component updates

---

## Risk Assessment

### High Risks

**Risk: Incomplete Currency Migration (Missed USD References)**
- **Impact:** Some amounts display as "$X.XX" instead of "X.XX ₪", breaking user trust and brand consistency
- **Likelihood:** MEDIUM - 225 occurrences across 70 files increases chance of oversight
- **Mitigation:**
  - Systematic grep search for "USD", "$", "dollar", "formatCurrency"
  - Visual inspection of all major pages after deployment
  - Create checklist of key pages: Dashboard, Transactions, Accounts, Budgets, Goals, Analytics, Settings
- **Recommendation:** Allocate 1-2 hours for thorough testing across all pages in Iteration 1

**Risk: Email Verification Breaks Auth Flow**
- **Impact:** Users cannot sign up or login, blocking app access
- **Likelihood:** LOW-MEDIUM - Auth already works, but email verification adds complexity
- **Mitigation:**
  - Deploy email verification as optional first, test thoroughly
  - Keep admin user with pre-verified email as fallback
  - Test signup flow in Vercel preview before production
- **Recommendation:** Make email verification optional in Iteration 1, enforce in Iteration 2 after testing

### Medium Risks

**Risk: Environment Variable Misconfiguration**
- **Impact:** App crashes on Vercel, database connections fail, auth doesn't work
- **Likelihood:** MEDIUM - 7+ environment variables, easy to typo or miss one
- **Mitigation:**
  - Use Vercel preview deployments to test environment config
  - Double-check all variables against `.env.example`
  - Test database connection before enabling public access
- **Recommendation:** Create environment variable checklist from `.env.example`

**Risk: Plaid Integration Assumes USD**
- **Impact:** If user connects bank accounts via Plaid, amounts may be misformatted or stored incorrectly
- **Likelihood:** LOW - Vision notes this as "open question" but no Plaid usage planned initially
- **Mitigation:**
  - Review Plaid service code for hardcoded currency assumptions
  - If found, add TODO comments for future multi-currency support
  - For MVP, document "Plaid not supported for NIS" if necessary
- **Recommendation:** Grep for Plaid + currency logic, add documentation if needed

**Risk: Email Templates Render Poorly in Email Clients**
- **Impact:** Unprofessional appearance, broken layouts, missing branding
- **Likelihood:** MEDIUM - Email HTML is notoriously inconsistent across clients
- **Mitigation:**
  - Use email-safe HTML (tables for layout, inline CSS)
  - Test in Gmail, Outlook, Apple Mail before deploying
  - Use email template testing tools (Litmus, Email on Acid) if available
- **Recommendation:** Budget 1-2 hours for cross-client email testing

### Low Risks

**Risk: Build Fails on Vercel**
- **Impact:** Cannot deploy to production
- **Likelihood:** LOW - `npm run build` likely already works locally
- **Mitigation:** Run `npm run build` locally before pushing to GitHub
- **Recommendation:** Include build test in pre-deployment checklist

**Risk: Timezone Issues (Schema Defaults to America/New_York)**
- **Impact:** Date/time displays may be confusing for Israeli users
- **Likelihood:** LOW - Not a blocker, mostly cosmetic
- **Mitigation:** Update `User.timezone` default to "Asia/Jerusalem" in schema if desired
- **Recommendation:** Optional - can be addressed in post-MVP iteration

---

## Integration Considerations

### Cross-Phase Integration Points

**Currency Formatting Consistency**
- **What:** All currency displays must use the same format: `{amount} ₪`
- **Why critical:** Inconsistent formatting (some "$X", some "X ₪") looks unprofessional
- **Spans:** Components, exports, charts, emails
- **Action:** Create visual regression checklist for all currency display locations

**Supabase Production Instance**
- **What:** Single production database shared across all features
- **Why critical:** Schema changes in Iteration 1 must support Iteration 2 admin user creation
- **Spans:** Both iterations
- **Action:** Push schema early in Iteration 1, verify RLS policies work

**Environment Variables**
- **What:** Shared environment configuration across Vercel, GitHub, Supabase
- **Why critical:** Missing or incorrect variables break multiple features
- **Spans:** All deployment steps
- **Action:** Maintain single source of truth (`.env.example`), verify in Vercel dashboard

### Potential Integration Challenges

**Currency Display in Recharts (Analytics Page)**
- **Challenge:** Recharts library may have its own number formatting that ignores `formatCurrency()`
- **Location:** `/src/components/analytics/*.tsx` (5 chart components)
- **Solution:** Verify chart axis labels and tooltips use `formatCurrency()`, add custom formatters if needed
- **Recommendation:** Test analytics page thoroughly in Iteration 1

**CSV Export Currency Column**
- **Challenge:** CSV exports might need currency header or symbol in amount column
- **Location:** `/src/lib/csvExport.ts`
- **Solution:** Review CSV headers - currently no currency symbol, just "Amount". May want "Amount (₪)" header
- **Recommendation:** Low priority - can enhance post-MVP

**Email Template Link Generation**
- **Challenge:** Email verification links must point to production Vercel URL, not localhost
- **Location:** Supabase email templates use `{{ .ConfirmationURL }}` placeholders
- **Solution:** Ensure Supabase "Site URL" setting points to Vercel production URL
- **Recommendation:** Update Supabase Site URL setting in Iteration 2

---

## Recommendations for Master Plan

1. **Use 2-iteration approach for clear separation of concerns**
   - Iteration 1 establishes production infrastructure with basic auth
   - Iteration 2 adds polish (custom emails) and admin access
   - Allows early production access even if email templates delayed

2. **Prioritize systematic currency search over incremental changes**
   - Use grep to find ALL occurrences of USD, $, dollar, formatCurrency
   - Create comprehensive file list before making changes
   - Check off files as updated to track progress

3. **Leverage Vercel preview deployments for risk-free testing**
   - Push currency changes to a feature branch first
   - Test preview deployment thoroughly before merging to main
   - Verify environment variables in preview before production

4. **Create email templates in parallel with Iteration 1**
   - Email template design is independent of currency migration
   - Designer/copywriter can work on templates while currency changes happen
   - Reduces Iteration 2 duration to deployment and testing only

5. **Document all environment variables in `.env.example`**
   - Vision document includes production credentials
   - Update `.env.example` with production placeholders
   - Use as checklist when configuring Vercel dashboard

6. **Plan for post-MVP iteration (cleanup and optimization)**
   - Some nice-to-haves identified: custom domain, error monitoring, staging environment
   - Keep backlog of "should-have" and "could-have" features from vision
   - Don't bloat MVP with non-critical features

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Frontend:** Next.js 14.2.33, React 18.3.1, TypeScript 5.7.2
- **Styling:** Tailwind CSS 3.4.1, Radix UI components, Framer Motion animations
- **State Management:** tRPC 11.6.0 + React Query 5.80.3
- **Backend:** Next.js API routes, tRPC routers, Prisma ORM 5.22.0
- **Database:** PostgreSQL via Supabase, local dev via Docker
- **Auth:** Supabase Auth (email/password, OAuth)
- **Testing:** Vitest 3.2.4 with 87 test files
- **Integrations:** Plaid (bank connections), Anthropic Claude (categorization), Resend (emails)

**Patterns observed:**
- **Component organization:** Feature-based folders (`/accounts`, `/transactions`, `/budgets`, etc.)
- **Data fetching:** tRPC hooks (`api.transactions.getAll.useQuery()`)
- **Form handling:** React Hook Form with Zod validation
- **Currency formatting:** Centralized `formatCurrency()` utility
- **Database schema:** Clear separation of concerns (User, Account, Transaction, Budget, Goal models)

**Opportunities:**
- **Code quality is high:** TypeScript strict mode, comprehensive tests, clear file structure
- **Production-ready architecture:** Already using best practices (SSR, API routes, tRPC, Prisma)
- **Minimal tech debt:** No major refactoring needed for production deployment

**Constraints:**
- **Must maintain existing patterns:** Currency changes should follow existing `formatCurrency()` pattern
- **No breaking changes:** All existing features must continue working
- **TypeScript strict mode:** All changes must pass type checking

### Currency-Specific Recommendations

**Format Specification (from Vision):**
- **Pattern:** `{amount} ₪` (symbol AFTER amount)
- **Example:** `1,234.56 ₪`
- **Locale:** Use `he-IL` (Hebrew - Israel) for Intl.NumberFormat
- **Thousands separator:** Comma (,)
- **Decimal separator:** Period (.)
- **Decimal places:** Always 2

**Implementation:**
```typescript
// Updated formatCurrency() in /src/lib/utils.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'NIS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Updated constants in /src/lib/constants.ts
export const CURRENCY_CODE = 'NIS' as const
export const CURRENCY_SYMBOL = '₪' as const
export const CURRENCY_NAME = 'Israeli Shekel' as const
```

**Testing approach:**
- Update test files that assert currency format (e.g., `expect(result).toContain('$')` → `expect(result).toContain('₪')`)
- Run `npm test` to catch any hardcoded USD assertions
- Add visual regression tests for key pages if time permits

---

## Notes & Observations

**Codebase Quality:**
- Well-architected, production-ready Next.js app
- Comprehensive test coverage (87 test files)
- Consistent code style and patterns
- TypeScript strict mode enforced
- No major technical debt

**Currency Migration Scope:**
- 225 occurrences across 70 files (from grep analysis)
- Most changes are find-replace in components and tests
- Core logic centralized in `formatCurrency()` utility
- Database schema changes are minimal (2 default values)

**Production Readiness:**
- Modern tech stack (Next.js 14, Prisma, Supabase)
- Vercel-optimized architecture (App Router, API routes)
- Environment variables already externalized
- Cron job configuration already in `vercel.json`
- RLS policies already implemented

**Email Template Requirements:**
- Need to create 3 HTML templates from scratch
- Templates must be responsive (mobile-friendly)
- Inline CSS required for email client compatibility
- Brand assets (logo, colors) needed for templates
- Estimated 2-3 hours for design + implementation

**Admin User Strategy:**
- Email: ahiya.butman@gmail.com
- Password: wealth_generator (can be changed after first login)
- Must pre-verify email to bypass verification flow
- Recommended method: Supabase Dashboard "Add user" with "Auto-confirm email" checked

**Open Questions (from Vision):**
- Plaid integration currency handling (needs verification)
- Recurring transactions currency (likely already uses database defaults)

**Post-MVP Opportunities:**
- Custom domain setup
- Error monitoring (Sentry)
- Performance monitoring
- Staging environment
- Multi-currency support (if expanding beyond Israel)

---

*Exploration completed: 2025-11-01*
*This report informs master planning decisions*
