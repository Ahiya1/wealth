# Project Vision: Production Deployment with NIS Currency Migration

**Created:** 2025-11-01T00:00:00Z
**Plan:** plan-3
**Status:** VISIONED

---

## Problem Statement

The Wealth app is currently configured for USD but needs to be deployed for personal use with NIS (Israeli Shekel) as the primary currency. The app needs to be production-ready on Vercel with a production Supabase instance.

**Current blockers:**
- All currency displays, formatting, and database schemas assume USD
- App is only configured for local development
- No production database configured
- Not deployed to a production hosting environment

---

## Target Users

**Primary user:** App owner (Ahiya) - Personal finance tracking
- Operates in NIS (Israeli market)
- Needs secure, production-ready deployment
- Requires all financial data in shekels

---

## Core Value Proposition

Transform the locally-developed wealth tracking app into a production-ready, NIS-native personal finance dashboard.

**Key benefits:**
1. Accurate currency representation for Israeli market
2. Secure, scalable production infrastructure
3. Accessible from anywhere via Vercel deployment

---

## Feature Breakdown

### Must-Have (MVP)

1. **Complete USD to NIS Currency Migration**
   - Description: Replace all USD references, symbols, and formatting with NIS
   - User story: As a user, I want to see all amounts in shekels (₪) so that I can accurately track my Israeli finances
   - Acceptance criteria:
     - [ ] All currency symbols display as "₪" positioned AFTER the amount (e.g., "1,234.56 ₪")
     - [ ] Database schema uses "NIS" instead of "USD"
     - [ ] All hardcoded "USD" strings replaced with "NIS"
     - [ ] Number formatting follows Israeli conventions
     - [ ] Transaction forms show ₪ symbol
     - [ ] Dashboard totals show ₪ symbol
     - [ ] Charts and analytics use ₪ formatting
     - [ ] Export formats (CSV, JSON) use NIS
     - [ ] Settings/preferences default to NIS
     - [ ] Any remaining "dollar" mentions in UI text replaced with "shekel"

2. **Production Supabase Configuration**
   - Description: Connect app to production Supabase instance
   - User story: As a user, I want my data stored in a production database so that it persists reliably
   - Acceptance criteria:
     - [ ] Production Supabase credentials configured
     - [ ] Database migrations executed on production instance
     - [ ] Row Level Security (RLS) policies enabled and tested
     - [ ] Connection pooling configured if needed
     - [ ] Database backup strategy documented

3. **GitHub Integration**
   - Description: Connect GitHub repository to Vercel for automatic deployments
   - User story: As a developer, I want automatic deployments on push so that I don't have to manually deploy
   - Acceptance criteria:
     - [ ] All currency changes committed to GitHub
     - [ ] Repository pushed to GitHub with latest changes
     - [ ] Vercel project connected to GitHub repository
     - [ ] Automatic deployments enabled on push to main branch
     - [ ] Preview deployments enabled for other branches
     - [ ] Build status checks visible in GitHub

4. **Vercel Production Deployment**
   - Description: Deploy app to Vercel for production access
   - User story: As a user, I want to access my finance tracker from any device via the web
   - Acceptance criteria:
     - [ ] Vercel project created and linked to GitHub repo
     - [ ] All environment variables configured in Vercel dashboard
     - [ ] Build succeeds on Vercel
     - [ ] Production deployment accessible via URL
     - [ ] HTTPS enabled by default
     - [ ] Deployment triggers automatically on push to main

5. **Environment Configuration**
   - Description: Properly configure all environment variables for production
   - User story: As a developer, I want secure environment configuration so that credentials aren't exposed
   - Acceptance criteria:
     - [ ] `.env.example` updated with all required variables
     - [ ] Production Supabase URL configured
     - [ ] Production Supabase anon key configured
     - [ ] Production Supabase service role key configured (server-side only)
     - [ ] NextAuth secret generated and configured
     - [ ] Any API keys properly secured
     - [ ] Local `.env.local` ignored by git

6. **Email Verification with Custom Branded Templates**
   - Description: Enable email verification on signup with styled, branded email templates
   - User story: As a user, I want to verify my email with beautifully designed emails that reflect the app's brand
   - Acceptance criteria:
     - [ ] Email verification enabled in Supabase auth settings
     - [ ] Custom HTML email templates created for:
       - Signup confirmation/verification
       - Password reset
       - Magic link (if used)
     - [ ] Email templates styled with brand colors and identity
     - [ ] Templates include app logo and consistent design
     - [ ] Templates are responsive (mobile-friendly)
     - [ ] Email templates deployed to production Supabase
     - [ ] Test emails sent and verified to render correctly
     - [ ] Email verification enforced (users can't access app until verified)

7. **Admin User Creation**
   - Description: Create initial admin user account for app owner
   - User story: As the app owner, I need an admin account to access the production app immediately
   - Acceptance criteria:
     - [ ] Admin user created with email: ahiya.butman@gmail.com
     - [ ] Admin user password set to: wealth_generator
     - [ ] Admin user email pre-verified (bypass email verification)
     - [ ] Admin user has full access to all features
     - [ ] Admin account created via Supabase SQL or seed script
     - [ ] Credentials documented securely for first login

### Should-Have (Post-MVP)

1. **Custom Domain** - Configure custom domain instead of vercel.app
2. **Error Monitoring** - Add Sentry or similar for production error tracking
3. **Performance Monitoring** - Add analytics and performance tracking
4. **Staging Environment** - Create separate staging deployment for testing

### Could-Have (Future)

1. **Multi-Currency Support** - Add ability to switch between currencies in settings
2. **Currency Conversion** - Historical exchange rate tracking
3. **CDN Optimization** - Image and asset optimization via CDN

---

## User Flows

### Flow 1: First Production Access

**Steps:**
1. User navigates to Vercel deployment URL
2. System loads app with NIS as default currency
3. User signs in via NextAuth
4. System displays dashboard with all amounts in ₪ format
5. User can create transactions with ₪ amounts

**Edge cases:**
- Fresh database: User sees onboarding/empty state
- Auth failure: Clear error message with retry option

**Error handling:**
- Database connection issues: User sees friendly error message
- Build failures: Vercel deployment fails with logs

### Flow 2: Transaction Creation in Production

**Steps:**
1. User clicks "Add Transaction"
2. Form displays with ₪ symbol
3. User enters amount (e.g., 150.50)
4. System stores in database as NIS
5. Dashboard updates showing "150.50 ₪"

**Edge cases:**
- Invalid amount: Validation error shown
- Network error: Transaction saved locally, synced when online (if PWA)

### Flow 3: Viewing Analytics

**Steps:**
1. User navigates to Analytics page
2. Charts load with ₪ formatting on axes
3. Totals display as "X,XXX.XX ₪"
4. Export button generates CSV with NIS values

---

## Data Model Overview

**Key changes:**

1. **Currency Constant**
   - Change: `DEFAULT_CURRENCY = "NIS"` (was USD)
   - Location: Constants file, configuration

2. **Transaction Model**
   - Fields: amount (decimal), currency (default "NIS")
   - Update seed data to use NIS

3. **Account Model**
   - Fields: balance (decimal), currency (default "NIS")

4. **Budget Model**
   - Fields: amount (decimal), currency (default "NIS")

**No data migration needed** - fresh production deployment

---

## Technical Requirements

**Must support:**
- Next.js production build
- Server-side rendering with Supabase auth
- Environment variables via Vercel
- Database connection pooling
- Secure credential management

**Infrastructure:**
- Hosting: Vercel (Account: ahiya1)
- Database: Supabase Production
  - URL: https://npylfibbutxioxjtcbvy.supabase.co
  - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weWxmaWJidXR4aW94anRjYnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjQxNDQsImV4cCI6MjA3NzYwMDE0NH0.M5FlUDwPdRHeiwEfEJ_WTqy7SBr3r-M-9j3QHp_4FYA
  - Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weWxmaWJidXR4aW94anRjYnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjQxNDQsImV4cCI6MjA3NzYwMDE0NH0.M5FlUDwPdRHeiwEfEJ_WTqy7SBr3r-M-9j3QHp_4FYA

**Constraints:**
- Must maintain all existing functionality
- Zero downtime requirement (fresh deploy, no migration)
- Secure credential handling

**Preferences:**
- Use TypeScript for all changes
- Maintain existing code style and patterns
- Document any new environment variables

---

## Success Criteria

**The MVP is successful when:**

1. **Currency displays correctly**
   - Metric: Visual inspection of all pages
   - Target: 100% of amount displays show "X,XXX.XX ₪" format

2. **Production deployment is live**
   - Metric: Successful deployment on Vercel
   - Target: App accessible via Vercel URL with HTTPS

3. **Data persistence works**
   - Metric: Create, read, update, delete operations succeed
   - Target: All CRUD operations work against production Supabase

4. **Authentication functions**
   - Metric: User can sign in and access protected routes
   - Target: NextAuth working with production database

5. **GitHub auto-deployment works**
   - Metric: Push to main branch triggers automatic deployment
   - Target: Vercel deploys automatically within 2-3 minutes of push

6. **Email verification is enforced**
   - Metric: New user signup triggers email verification
   - Target: User cannot access app until email is verified; styled email received

7. **Admin user can login immediately**
   - Metric: Admin credentials work on first try
   - Target: Login with ahiya.butman@gmail.com / wealth_generator succeeds without email verification

---

## Implementation Details

### Currency Migration Checklist

**Code locations to update:**
1. `/src/lib/constants.ts` - DEFAULT_CURRENCY constant
2. `/src/lib/utils.ts` - formatCurrency() function
3. `/src/components/**/*.tsx` - All components displaying currency
4. `/prisma/schema.prisma` - Currency enum/default values
5. `/src/server/api/**/*.ts` - API router currency logic
6. Database seed scripts - Change to NIS values
7. Test files - Update expected currency values

**Format specification:**
- Pattern: `{amount} ₪`
- Example: `1,234.56 ₪`
- Thousands separator: comma (,)
- Decimal separator: period (.)
- Decimal places: 2

### Deployment Checklist

**Pre-deployment:**
1. Run tests locally
2. Build locally to verify no errors
3. Update .env.example with all variables

**GitHub integration:**
1. Commit all currency migration changes
2. Push changes to GitHub main branch
3. Verify GitHub repo is up to date

**Vercel setup:**
1. Create new Vercel project (or link existing)
2. Connect Vercel project to GitHub repository (Ahiya1/wealth)
3. Enable automatic deployments on push to main
4. Enable preview deployments for other branches
5. Configure environment variables in Vercel dashboard
6. Trigger initial deployment (auto-deploys from GitHub push)

**Post-deployment:**
1. Verify production URL loads
2. Test authentication flow
3. Create test transaction
4. Verify database writes
5. Check all pages render correctly
6. Test responsive design on mobile

### Email Templates Setup

**Template locations:**
```
supabase/templates/
  ├── confirmation.html     # Email verification
  ├── reset_password.html   # Password reset
  └── magic_link.html       # Magic link (optional)
```

**Template requirements:**
- Responsive HTML (mobile-friendly)
- Inline CSS (most email clients strip <style> tags)
- Brand colors from app theme
- App logo (hosted on CDN or base64 embedded)
- Clear call-to-action buttons
- Professional copy aligned with app's tone

**Deployment method:**
1. Create HTML templates in `supabase/templates/`
2. Update `supabase/config.toml` to reference templates:
   ```toml
   [auth.email]
   enable_signup = true
   enable_confirmations = true
   template_confirmation = "./templates/confirmation.html"
   template_recovery = "./templates/reset_password.html"
   template_magic_link = "./templates/magic_link.html"
   ```
3. Push config to production: `supabase db push` or update via Supabase dashboard

**Testing:**
- Trigger test signup to receive verification email
- Verify HTML renders correctly in Gmail, Outlook, Apple Mail
- Test all links work (verification URL, reset password URL)

### Admin User Creation

**Method 1: Supabase SQL (Recommended)**
```sql
-- Run in Supabase SQL editor on production database
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ahiya.butman@gmail.com',
  crypt('wealth_generator', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

**Method 2: Supabase Dashboard**
1. Go to Authentication > Users
2. Click "Add user"
3. Email: ahiya.butman@gmail.com
4. Password: wealth_generator
5. Check "Auto-confirm email"

**Method 3: Seed Script**
Create `scripts/create-admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role can bypass RLS
)

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'ahiya.butman@gmail.com',
    password: 'wealth_generator',
    email_confirm: true, // Pre-verify email
  })

  if (error) throw error
  console.log('Admin user created:', data.user.email)
}

createAdmin()
```

**Post-creation:**
- Verify login works at production URL
- Confirm email is marked as verified
- Test full app functionality with admin account

**Environment Variables for Vercel:**
```
DATABASE_URL=<production supabase connection string>
DIRECT_URL=<production supabase direct connection>
NEXT_PUBLIC_SUPABASE_URL=https://npylfibbutxioxjtcbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXTAUTH_SECRET=<generate new secret>
NEXTAUTH_URL=<vercel deployment url>
```

---

## Out of Scope

**Explicitly not included in MVP:**
- Multi-currency support (NIS only for now)
- Historical currency conversion
- Custom domain configuration
- Error monitoring/analytics
- Staging environment
- Database backups automation
- Performance optimization beyond default Vercel settings

**Why:** Focus on getting NIS-native production deployment live first. These can be added incrementally post-launch.

---

## Assumptions

1. Current codebase builds successfully in production mode
2. All existing tests pass with NIS currency
3. Supabase production instance is provisioned and accessible
4. Vercel free tier (or paid plan) is sufficient for initial usage
5. No breaking changes in dependencies during deployment
6. Supabase email sending is enabled and configured (SMTP or built-in)
7. Admin user password can be changed after first login if desired

---

## Open Questions

1. ✅ RESOLVED: Vercel account connected (ahiya1)
2. ✅ RESOLVED: Currency format (symbol after amount)
3. ✅ RESOLVED: Fresh deployment (no data migration)
4. ✅ RESOLVED: GitHub sync (automatic deployments enabled)
5. ✅ RESOLVED: Email verification (custom styled templates in MVP)
6. ✅ RESOLVED: Admin user (ahiya.butman@gmail.com / wealth_generator)
7. Need to verify: Are there any Plaid integrations that need currency configuration?
8. Need to verify: Do recurring transactions need currency updates?

---

## Risks & Mitigations

**Risk 1: Database migration fails**
- Mitigation: Fresh deployment, can re-run migrations if needed
- Rollback: Keep local dev environment as backup

**Risk 2: Environment variables misconfigured**
- Mitigation: Test in Vercel preview before production deploy
- Rollback: Update env vars in Vercel dashboard

**Risk 3: Auth breaks in production**
- Mitigation: Test auth flow in preview environment first
- Rollback: Check NEXTAUTH_URL and secret configuration

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-mvp` to execute deployment plan
- [ ] OR run `/2l-plan` for interactive master planning

---

**Vision Status:** VISIONED
**Ready for:** Master Planning or Direct Execution via `/2l-mvp`
