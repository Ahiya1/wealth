# Explorer 1 Report: Architecture & Structure

## Executive Summary

The Wealth application is a well-architected Next.js 14 monolith with Supabase Auth integration. Email template integration requires creating HTML templates in a new `supabase/templates/` directory and configuring Supabase production dashboard settings. Admin user creation has 3 documented methods with the Supabase Dashboard approach being most reliable for production. The architecture is production-ready with all necessary authentication infrastructure already in place.

## Discoveries

### Application Architecture

**Core Technology Stack:**
- **Frontend:** Next.js 14 (App Router) with React 18.3.1
- **API Layer:** tRPC 11.6.0 (type-safe, serverless functions)
- **Database:** PostgreSQL via Prisma 5.22.0
- **Authentication:** Supabase Auth (@supabase/ssr 0.5.2, @supabase/supabase-js 2.58.0)
- **Styling:** Tailwind CSS 3.4.1 with custom design tokens
- **Deployment:** Optimized for Vercel (standalone output mode)

**Authentication Flow:**
1. Client-side: `src/lib/supabase/client.ts` - Browser client using `@supabase/ssr`
2. Server-side: `src/lib/supabase/server.ts` - SSR client with cookie management
3. Middleware: `middleware.ts` - Route protection, role verification, auth redirects
4. Callback: `src/app/auth/callback/route.ts` - OAuth/email verification completion
5. Forms: `src/components/auth/SignUpForm.tsx` - Email verification trigger

**Architecture Characteristics:**
- Monolithic Next.js application (no separate backend)
- All API logic runs as serverless functions via Next.js API routes
- tRPC provides type-safe API endpoints at `src/app/api/trpc/[trpc]/route.ts`
- Supabase provides only Auth + PostgreSQL (no Storage, Realtime, Edge Functions)
- Connection pooling configured via PgBouncer for production scalability

### Email Template Integration Points

**Current Email Configuration:**

Local development uses Inbucket (email testing server):
- Location: `supabase/config.toml` (lines 67-71)
- Email testing UI: `http://localhost:54424`
- SMTP port: 54425
- Configured for: signup confirmations, password resets, magic links

**Production Email Requirements:**

1. **Template Storage Location:** `supabase/templates/` (NEW directory to create)
   - `confirmation.html` - Email verification for signup
   - `reset_password.html` - Password reset flow
   - `magic_link.html` - Magic link authentication (optional)

2. **Configuration Method:** Supabase Dashboard (NOT config.toml for production)
   - Navigate: Production Project → Authentication → Email Templates
   - Upload HTML files directly via dashboard UI
   - Configure variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`

3. **Template Deployment Strategy:**
   - Create templates locally in `supabase/templates/`
   - Test with local Inbucket (http://localhost:54424)
   - Upload to production via Supabase Dashboard
   - Enable email verification: Auth → Settings → Enable email confirmations

### Supabase Auth Configuration Structure

**Authentication Settings Hierarchy:**

```
Supabase Dashboard
└── Authentication
    ├── Settings
    │   ├── Email Auth (enable_signup, enable_confirmations)
    │   ├── Confirm email (double_confirm_changes)
    │   └── Email rate limiting (max_frequency: 60s)
    ├── Email Templates
    │   ├── Confirm signup template
    │   ├── Reset password template
    │   └── Magic Link template
    ├── URL Configuration
    │   ├── Site URL (production Vercel URL)
    │   └── Redirect URLs (callback endpoints)
    └── Providers
        ├── Email (enabled by default)
        └── Google OAuth (configured via env vars)
```

**Critical Configuration Values:**

From `supabase/config.toml` (local) → Must mirror in production dashboard:
```toml
[auth]
site_url = "https://[vercel-app].vercel.app"  # Production URL
additional_redirect_urls = ["https://[vercel-app].vercel.app/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true  # CRITICAL: Forces email verification
double_confirm_changes = true
max_frequency = "60s"  # Rate limiting
```

**Email Verification Enforcement:**

Current code already enforces verification:
- `SignUpForm.tsx` (line 59): Shows "Check your email" message after signup
- `middleware.ts` (lines 64-83): Protects routes requiring authentication
- Supabase blocks unverified users automatically when `enable_confirmations = true`

### File/Folder Structure for Email Templates

**Recommended Structure:**

```
wealth/
├── supabase/
│   ├── config.toml              # Local dev config (existing)
│   ├── templates/               # NEW: Email templates directory
│   │   ├── confirmation.html    # Signup email verification
│   │   ├── reset_password.html  # Password reset email
│   │   ├── magic_link.html      # Magic link (optional)
│   │   ├── styles/              # Optional: Shared styles
│   │   │   └── base.css         # Inline CSS snippets
│   │   └── README.md            # Template usage documentation
│   └── migrations/              # Prisma migrations (existing)
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages (existing)
│   │   │   ├── signup/page.tsx
│   │   │   ├── signin/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   └── auth/
│   │       └── callback/route.ts # OAuth/email callback (existing)
│   ├── components/
│   │   └── auth/                # Auth forms (existing)
│   └── lib/
│       └── supabase/            # Supabase clients (existing)
└── docs/                        # NEW: Deployment docs
    └── email-templates.md       # Template customization guide
```

**Template Asset Hosting:**

For images in email templates (logo, icons):
1. **Option A:** Base64 encoding (inline, no external requests)
   - Pros: Works in all email clients, no CDN needed
   - Cons: Increases HTML file size
   - Use for: Small logos (<50KB)

2. **Option B:** Vercel CDN hosting
   - Location: `public/email-assets/`
   - URL: `https://[vercel-app].vercel.app/email-assets/logo.png`
   - Pros: Smaller HTML, cacheable
   - Cons: Some email clients block external images

3. **Recommended:** Hybrid approach
   - Logo: Base64 encoded
   - Large images: Vercel CDN with fallback text

### Entry Points for Admin User Creation

**Method 1: Supabase Dashboard (RECOMMENDED)**

Location: `https://npylfibbutxioxjtcbvy.supabase.co/project/_/auth/users`

Steps:
1. Navigate: Authentication → Users → Add user
2. Email: `ahiya.butman@gmail.com`
3. Password: `wealth_generator`
4. **CRITICAL:** Check "Auto-confirm user" (bypasses email verification)
5. User metadata (optional): `{ "name": "Ahiya Butman" }`

Advantages:
- No code required
- Instant verification
- Dashboard UI confirms success
- Can assign roles immediately

**Method 2: SQL Script (Production Database)**

Location: Supabase Dashboard → SQL Editor

Script (adapted from vision.md lines 358-389):
```sql
-- Create admin user in Supabase Auth
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
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ahiya.butman@gmail.com',
  crypt('wealth_generator', gen_salt('bf')),  -- bcrypt hash
  NOW(),  -- Pre-verify email
  NOW(),
  NOW(),
  ''
) RETURNING id;

-- Copy the returned UUID, then create Prisma user
INSERT INTO "User" (
  id,
  "supabaseAuthId",
  email,
  name,
  currency,
  role,
  "onboardingCompletedAt",
  "createdAt",
  "updatedAt"
) VALUES (
  cuid(),  -- Generate via: https://github.com/paralleldrive/cuid
  '<UUID-from-above>',
  'ahiya.butman@gmail.com',
  'Ahiya Butman',
  'NIS',
  'ADMIN',  -- Grant admin role
  NOW(),    -- Pre-complete onboarding
  NOW(),
  NOW()
);
```

Advantages:
- Full control over user attributes
- Can set ADMIN role immediately
- Scriptable/repeatable

Disadvantages:
- Requires manual UUID copying
- More error-prone
- Need to run 2 queries

**Method 3: TypeScript Seed Script (RECOMMENDED for automation)**

Location: `scripts/create-admin.ts` (NEW file to create)

Template (based on `scripts/create-test-user.ts`):
```typescript
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function createAdmin() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Create in Supabase Auth
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: 'ahiya.butman@gmail.com',
      password: 'wealth_generator',
      email_confirm: true,  // Pre-verify email
      user_metadata: { name: 'Ahiya Butman' },
    })

  if (authError) throw authError

  // Create in Prisma
  const prismaUser = await prisma.user.upsert({
    where: { email: 'ahiya.butman@gmail.com' },
    update: {
      supabaseAuthId: authUser.user.id,
      role: 'ADMIN',  // CRITICAL: Grant admin role
    },
    create: {
      email: 'ahiya.butman@gmail.com',
      name: 'Ahiya Butman',
      supabaseAuthId: authUser.user.id,
      role: 'ADMIN',
      currency: 'NIS',
      onboardingCompletedAt: new Date(),  // Pre-complete onboarding
    },
  })

  console.log('Admin user created:', prismaUser.id)
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run with:
```bash
# Ensure production env vars loaded
npx tsx scripts/create-admin.ts
```

Advantages:
- Fully automated
- Reusable across environments
- Handles both Supabase Auth + Prisma
- Type-safe

**Comparison Matrix:**

| Method | Complexity | Speed | Automation | Admin Role | Recommended Use |
|--------|-----------|-------|------------|------------|-----------------|
| Supabase Dashboard | LOW | Instant | Manual | Manual grant | First-time production setup |
| SQL Script | MEDIUM | Fast | Semi | In script | Dev/staging automation |
| TypeScript Script | MEDIUM | Fast | Full | In script | Production automation |

**Admin Role Verification:**

After creation, verify admin access:
1. Login at production URL: `https://[vercel-app].vercel.app/signin`
2. Navigate to: `/admin` (should not redirect)
3. Check middleware logs (lines 108-114 in `middleware.ts`):
   ```
   [Admin Access] {
     userId: 'clxxxxx',
     path: '/admin',
     timestamp: '2025-11-01T...'
   }
   ```

## Patterns Identified

### Email Template Pattern: Inline CSS with Brand Tokens

**Description:** Responsive HTML email templates using inline CSS to ensure cross-client compatibility, with brand colors extracted from Tailwind config

**Use Case:** Supabase email verification, password resets, magic links

**Brand Color Palette (from `src/app/globals.css` + `tailwind.config.ts`):**
```css
/* Primary Brand Colors */
--sage-600: hsl(140, 14%, 33%)      /* Primary green for CTAs */
--sage-500: hsl(140, 13%, 42%)      /* Lighter sage for backgrounds */
--sage-100: hsl(140, 10%, 92%)      /* Very light sage for accents */

/* Warm Neutrals */
--warm-gray-50: hsl(24, 6%, 98%)    /* Background */
--warm-gray-800: hsl(24, 9%, 16%)   /* Text */
--warm-gray-500: hsl(24, 5%, 46%)   /* Muted text */

/* Accent Colors */
--terracotta-600: hsl(15, 60%, 45%) /* Affirmative actions */
--gold-500: hsl(45, 55%, 50%)       /* Highlights */
```

**Example Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Wealth</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: hsl(24, 6%, 98%);">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: hsl(24, 6%, 98%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <img src="{{ .SiteURL }}/email-assets/logo.png" alt="Wealth" width="120" height="40" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px; color: hsl(24, 9%, 16%); font-size: 16px; line-height: 24px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: hsl(24, 9%, 16%);">
                Verify Your Email
              </h1>
              <p style="margin: 0 0 24px;">
                Click the button below to verify your email and start tracking your finances.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: hsl(140, 14%, 33%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
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

**Supabase Template Variables:**
- `{{ .ConfirmationURL }}` - Email verification link
- `{{ .Token }}` - Verification token (for manual entry)
- `{{ .SiteURL }}` - Production site URL
- `{{ .Email }}` - User's email address

**Recommendation:** Use this pattern for all 3 email templates with consistent branding

### Admin Role Enforcement Pattern

**Description:** Multi-layer admin protection using Supabase Auth + Prisma role checking

**Current Implementation (middleware.ts lines 85-115):**
```typescript
// Admin route protection
if (request.nextUrl.pathname.startsWith('/admin')) {
  // Layer 1: Supabase Auth check
  if (!user) {
    return NextResponse.redirect('/signin?redirect=/admin')
  }

  // Layer 2: Prisma role check
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, role: true }
  })

  if (!prismaUser || prismaUser.role !== 'ADMIN') {
    return NextResponse.redirect('/dashboard?error=unauthorized')
  }
}
```

**Use Case:** Protecting `/admin` routes, admin-only API endpoints

**Extension Points:**
- Admin router: `src/server/api/routers/admin.router.ts` (uses `adminProcedure`)
- Admin pages: `src/app/(dashboard)/admin/page.tsx`
- Admin middleware: `middleware.ts` (existing implementation)

**Recommendation:** Maintain this pattern; admin user creation must set `role: 'ADMIN'` in Prisma

### Prisma Migration Pattern for Production

**Description:** Two-URL database configuration for Vercel deployment

**Pattern (from .env.example lines 15-29):**
```
DATABASE_URL="postgresql://[user]:[pass]@[host]:6543/[db]?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://[user]:[pass]@[host]:5432/[db]"
```

**Why Two URLs:**
- `DATABASE_URL` (port 6543): Transaction pooler for serverless functions (prevents exhaustion)
- `DIRECT_URL` (port 5432): Direct connection for migrations (bypasses pooler)

**Migration Workflow:**
```bash
# Local: Run migrations
npx prisma migrate dev

# Production: Push schema (one-time)
DATABASE_URL="<DIRECT_URL>" npx prisma db push

# Production: Generate client (Vercel build step)
npx prisma generate
```

**Existing Migrations:**
- `prisma/migrations/20251002_add_user_roles_and_subscription_tiers/` - Adds ADMIN role
- `prisma/migrations/20251003000156_add_currency_conversion_models/` - Currency tables (unused)

**Recommendation:** Use `prisma db push` for production initial setup (no migration history needed)

## Complexity Assessment

### High Complexity Areas

**1. Email Template Responsive Design (MEDIUM-HIGH)**
- Why complex: Email client CSS support is inconsistent (Outlook, Gmail, Apple Mail)
- Estimated splits: 1 builder (no split needed)
- Mitigation: Use proven table-based layout, inline CSS only, test in Litmus/Email on Acid
- Time estimate: 3-4 hours for 3 templates + testing

**2. Email Verification Enforcement Testing (MEDIUM)**
- Why complex: Must verify end-to-end flow: signup → email → verify → access
- Estimated splits: 1 builder (no split needed)
- Critical path:
  1. Enable confirmations in production Supabase
  2. Test new user signup sends email
  3. Verify unverified users blocked from dashboard
  4. Confirm verified users get access
- Time estimate: 1-2 hours

### Medium Complexity Areas

**3. Admin User Creation Script (LOW-MEDIUM)**
- Why medium: Requires coordination between Supabase Auth + Prisma
- Existing pattern: `scripts/create-test-user.ts` provides template
- Changes needed: Add `role: 'ADMIN'`, different credentials
- Time estimate: 30-45 minutes

**4. Production Supabase Configuration (MEDIUM)**
- Why medium: Multiple dashboard settings, easy to miss steps
- Critical settings:
  - Auth → Settings → Enable email confirmations
  - Auth → URL Configuration → Site URL + Redirect URLs
  - Auth → Email Templates → Upload 3 templates
- Mitigation: Create checklist from vision.md
- Time estimate: 1 hour

### Low Complexity Areas

**5. Template Asset Hosting (LOW)**
- Implementation: Copy logo to `public/email-assets/logo.png`
- Alternative: Base64 encode logo in templates
- Time estimate: 15 minutes

**6. Template Directory Creation (LOW)**
- Implementation: `mkdir supabase/templates/`
- Add README.md with deployment instructions
- Time estimate: 10 minutes

## Technology Recommendations

### Primary Stack (EXISTING - No Changes)

- **Framework:** Next.js 14.2.33 - Production-ready, already deployed
- **Database:** Supabase PostgreSQL - Production instance exists (npylfibbutxioxjtcbvy)
- **Auth:** Supabase Auth - Fully integrated, just needs email config
- **Deployment:** Vercel - Account ready (ahiya1), standalone mode enabled

### Supporting Libraries (EXISTING - No New Dependencies)

**Email Template Development:**
- No new dependencies needed
- Use vanilla HTML + inline CSS
- Test with browser preview + local Inbucket

**Email Client Testing Tools (OPTIONAL):**
- **Litmus** (paid) - Comprehensive email testing across 90+ clients
- **Email on Acid** (paid) - Similar to Litmus
- **Mailtrap** (free tier) - Email sandbox with preview
- **Gmail + Outlook Web** (free) - Manual testing (sufficient for MVP)

**Recommendation:** Start with Gmail + Outlook web testing, add Litmus only if issues arise

### Configuration Changes Required

**1. Supabase Production Dashboard Settings:**
```
Authentication → Settings:
  ✓ Enable email signup
  ✓ Enable email confirmations (CRITICAL)
  ✓ Confirm email on signup: ENABLED
  ✓ Secure email change: ENABLED

Authentication → Email Templates:
  ✓ Upload confirmation.html
  ✓ Upload reset_password.html
  ✓ Upload magic_link.html (optional)

Authentication → URL Configuration:
  ✓ Site URL: https://[vercel-app].vercel.app
  ✓ Redirect URLs: https://[vercel-app].vercel.app/auth/callback
```

**2. Vercel Environment Variables (ALL EXISTING):**
```bash
# Already required from Iteration 1:
DATABASE_URL=<pooled connection with ?pgbouncer=true>
DIRECT_URL=<direct connection for migrations>
NEXT_PUBLIC_SUPABASE_URL=https://npylfibbutxioxjtcbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Server-only for admin user creation
CRON_SECRET=<hex secret>
ENCRYPTION_KEY=<hex key>
```

**3. New Files to Create:**
```
supabase/templates/confirmation.html      (NEW)
supabase/templates/reset_password.html    (NEW)
supabase/templates/magic_link.html        (NEW - optional)
scripts/create-admin.ts                   (NEW - optional, dashboard preferred)
docs/email-templates.md                   (NEW - documentation)
```

## Integration Points

### Supabase Auth ↔ Email Templates

**How they connect:**
1. User submits signup form (`SignUpForm.tsx` line 34)
2. Supabase Auth creates user, marks email as unverified
3. Supabase sends email using template from dashboard
4. User clicks link in email
5. Callback route (`src/app/auth/callback/route.ts`) verifies token
6. Middleware (`middleware.ts`) allows access to dashboard

**Configuration touchpoints:**
- Supabase Dashboard: Template upload + enable confirmations
- Application code: Already configured (no changes needed)

### Supabase Auth ↔ Prisma User

**How they connect:**
1. Supabase Auth creates user (auth.users table)
2. Application creates Prisma User with `supabaseAuthId` link
3. Middleware queries Prisma for role checking (line 95)

**Critical field:** `User.supabaseAuthId` (links auth.users.id)

**Admin user creation must:**
1. Create in Supabase Auth first (get user.id)
2. Create in Prisma with `supabaseAuthId = user.id`
3. Set `role = 'ADMIN'` in Prisma

### Vercel ↔ Supabase Production

**Connection configuration:**
- Environment variables in Vercel dashboard
- Build step runs `prisma generate`
- Runtime uses pooled connection (DATABASE_URL)
- No connection pooling issues (already configured)

**Callback URL must match:**
- Supabase: `https://[app].vercel.app/auth/callback`
- Vercel: Automatic HTTPS, no additional config

## Risks & Challenges

### Technical Risks

**Risk 1: Email Templates Render Incorrectly in Outlook**
- Impact: HIGH - Outlook has notoriously bad CSS support
- Likelihood: MEDIUM
- Mitigation:
  - Use table-based layout (not flexbox/grid)
  - Inline all CSS (no `<style>` blocks)
  - Test in Outlook web + desktop before production
  - Fallback: Plain text version in Supabase
- Rollback: Use Supabase default templates temporarily

**Risk 2: Email Verification Blocks Admin User**
- Impact: HIGH - Can't access production app
- Likelihood: LOW (if "Auto-confirm" checked)
- Mitigation:
  - Dashboard method: Check "Auto-confirm user" box
  - SQL method: Set `email_confirmed_at = NOW()`
  - Script method: Use `email_confirm: true` parameter
- Rollback: Manually verify via Supabase Dashboard → Users → [user] → Confirm email

**Risk 3: Supabase Email Sending Disabled**
- Impact: HIGH - No verification emails sent
- Likelihood: LOW (enabled by default)
- Mitigation:
  - Verify in dashboard: Authentication → Settings → Email provider
  - Supabase provides built-in SMTP (no external service needed)
  - Test with new signup before admin user creation
- Rollback: Use password-only auth temporarily (disable confirmations)

### Complexity Risks

**Risk 4: Template Variable Syntax Incorrect**
- Impact: MEDIUM - Emails send but links don't work
- Likelihood: MEDIUM
- Mitigation:
  - Use exact syntax: `{{ .ConfirmationURL }}` (note capitalization)
  - Test with local Inbucket first
  - Preview in Supabase dashboard before enabling
- Rollback: Fix syntax, re-upload template

**Risk 5: Production URL Misconfiguration**
- Impact: MEDIUM - Callback redirects to wrong URL
- Likelihood: MEDIUM
- Mitigation:
  - Set Site URL to actual Vercel deployment URL (not preview)
  - Add all possible callback URLs to redirect whitelist
  - Test with Vercel preview deployment first
- Rollback: Update URL in dashboard (no redeployment needed)

## Recommendations for Planner

### 1. Use Supabase Dashboard for Admin User Creation (HIGH PRIORITY)

**Rationale:**
- Fastest method (2-3 minutes)
- Visual confirmation of success
- Zero risk of script errors
- Can immediately test login

**Implementation:**
- Builder creates admin via dashboard first
- Document credentials in secure location
- Test login before proceeding to email templates

### 2. Email Templates: Start with Confirmation Only (ITERATIVE APPROACH)

**Rationale:**
- Signup verification is MVP-critical
- Password reset can use default template temporarily
- Magic link is optional

**Recommended sequence:**
1. Create `confirmation.html` with full branding
2. Upload to production, enable confirmations
3. Test with new user signup
4. Create `reset_password.html` + `magic_link.html` after confirmation works

### 3. Create Email Template Testing Checklist (QUALITY GATE)

**Required tests before production:**
- [ ] Preview in browser (Chrome DevTools device emulation)
- [ ] Test in local Inbucket (http://localhost:54424)
- [ ] Send to Gmail (desktop + mobile)
- [ ] Send to Outlook Web
- [ ] Send to Apple Mail (if accessible)
- [ ] Verify all links work (click through to app)
- [ ] Check mobile rendering (viewport width <400px)

**Acceptance criteria:**
- Logo displays correctly (no broken images)
- CTA button is tappable (minimum 44x44px)
- Text is readable (minimum 14px font size)
- Links redirect to production URL (not localhost)

### 4. Document Email Template Customization Process (KNOWLEDGE CAPTURE)

**Create:** `docs/email-templates.md`

**Contents:**
- Brand color reference (from globals.css)
- Template variable syntax
- Upload instructions (step-by-step screenshots)
- Testing checklist
- Troubleshooting guide

**Benefit:** Future template updates don't require re-research

### 5. Defer Script-Based Admin Creation to Post-MVP (SCOPE REDUCTION)

**Rationale:**
- Dashboard method is sufficient for single admin user
- Script is only valuable for multiple admins or CI/CD
- Saves 30-45 minutes of development time
- Can add later if automation needed

**Alternative:** Document SQL script in vision.md as fallback method

## Resource Map

### Critical Files/Directories

**Authentication Infrastructure (EXISTING):**
- `/middleware.ts` - Route protection, admin role verification
- `/src/lib/supabase/client.ts` - Client-side Supabase client
- `/src/lib/supabase/server.ts` - Server-side Supabase client with cookies
- `/src/app/auth/callback/route.ts` - OAuth/email verification callback
- `/src/components/auth/SignUpForm.tsx` - Signup form with verification trigger

**Database Schema (EXISTING):**
- `/prisma/schema.prisma` - User model with role enum (line 17-20)
- `/prisma/migrations/` - Migration history (2 migrations exist)

**Environment Configuration (EXISTING):**
- `/.env.example` - Template with all required variables
- `/vercel.json` - Cron job configuration (recurring transactions)
- `/supabase/config.toml` - Local Supabase settings (email enabled)

**Scripts (EXISTING + NEW):**
- `/scripts/create-test-user.ts` - Template for admin script (EXISTING)
- `/scripts/create-admin.ts` - Admin user creation (TO CREATE - optional)

**Email Templates (TO CREATE):**
- `/supabase/templates/confirmation.html` - Email verification (REQUIRED)
- `/supabase/templates/reset_password.html` - Password reset (REQUIRED)
- `/supabase/templates/magic_link.html` - Magic link (OPTIONAL)
- `/supabase/templates/README.md` - Template documentation (RECOMMENDED)

**Documentation (TO CREATE):**
- `/docs/email-templates.md` - Template customization guide
- `/docs/admin-user.md` - Admin creation methods reference (optional)

### Key Dependencies

**Email Template Rendering:**
- No new npm dependencies needed
- Relies on Supabase built-in SMTP service
- Uses Supabase template engine (Go templates syntax)

**Admin User Creation:**
- `@supabase/supabase-js` (2.58.0) - Auth admin API (EXISTING)
- `@prisma/client` (5.22.0) - User model creation (EXISTING)
- Both already in package.json, no installation needed

**Email Testing Infrastructure:**
- Supabase Inbucket (local) - Email capture UI
- Access: `http://localhost:54424` (SMTP on 54425)
- Configured in `supabase/config.toml` (lines 51-56)

### Testing Infrastructure

**Email Template Testing (LOCAL):**
1. Start Supabase: `npm run db:local`
2. Access Inbucket: `http://localhost:54424`
3. Trigger signup: `http://localhost:3000/signup`
4. Check email in Inbucket inbox
5. Verify template rendering and links

**Email Template Testing (PRODUCTION):**
1. Upload template to Supabase Dashboard
2. Create test user: `test+[random]@ahiya.butman@gmail.com`
3. Check email in Gmail
4. Click verification link
5. Confirm redirect to production dashboard

**Admin Access Testing:**
1. Login with admin credentials
2. Navigate to `/admin` route
3. Verify no redirect (stays on /admin)
4. Check middleware logs for "[Admin Access]" entry
5. Test admin router endpoints (systemMetrics, userList)

**End-to-End Production Smoke Test:**
```
1. Admin Login
   ✓ Navigate to production URL
   ✓ Login with ahiya.butman@gmail.com / wealth_generator
   ✓ Redirected to /dashboard (not /signin)

2. New User Signup
   ✓ Navigate to /signup
   ✓ Create account with test email
   ✓ See "Check your email" message
   ✓ Receive styled verification email
   ✓ Email renders correctly (logo, CTA button, colors)
   ✓ Click verification link
   ✓ Redirected to /dashboard
   ✓ Can access protected routes

3. Email Verification Enforcement
   ✓ Create account but don't verify email
   ✓ Try to access /dashboard directly
   ✓ Blocked with "verify your email" message
   ✓ Verify email, then access granted
```

## Questions for Planner

### Configuration Questions

**Q1: Should email templates include dark mode support?**
- Context: Some email clients support `prefers-color-scheme` media queries
- Recommendation: Skip for MVP (adds complexity, limited client support)
- Post-MVP: Add dark mode styles if user feedback requests it

**Q2: Which logo format for email templates: Base64 or CDN?**
- Context: Base64 = larger HTML, CDN = external request (may be blocked)
- Recommendation: Base64 for logo (<50KB), CDN for larger images
- Rationale: Ensures logo always displays, file size acceptable

**Q3: Should we create magic_link.html template for MVP?**
- Context: Magic links are optional auth method (passwordless)
- Current usage: Not actively used (no UI for requesting magic links)
- Recommendation: Skip for MVP, use Supabase default template
- Post-MVP: Add if passwordless auth becomes a feature

### Scope Questions

**Q4: Should admin user creation be scripted or manual (dashboard)?**
- Context: Dashboard is faster, script is more repeatable
- User need: Single admin user for production
- Recommendation: Dashboard for MVP, script as post-MVP enhancement
- Time saved: 30-45 minutes by using dashboard

**Q5: Email template testing: How thorough?**
- MVP Option: Gmail + Outlook web only (1 hour)
- Comprehensive: Litmus testing across 10+ clients (3+ hours, costs $99/month)
- Recommendation: MVP testing sufficient (Gmail + Outlook = 80% coverage)

### Implementation Questions

**Q6: Should email templates be version-controlled or dashboard-only?**
- Best practice: Store in git (`supabase/templates/`)
- Deployment: Upload to dashboard (no CLI automation for templates)
- Recommendation: Version control + manual upload
- Rationale: Templates can be reused across Supabase projects, disaster recovery

**Q7: What's the rollback plan if email verification breaks production?**
- Emergency option: Disable confirmations in Supabase dashboard
- Impact: New users can login without email verification
- Recommendation: Test email verification in Vercel preview first
- Fallback: Use default Supabase templates temporarily

---

**Report Status:** COMPLETE  
**Complexity Level:** MEDIUM  
**Estimated Implementation Time:** 3-4 hours (email templates + testing + admin user)  
**Recommended Approach:** Dashboard-based admin creation, iterative email template deployment  
**Critical Success Factor:** Email verification testing in production before enabling for all users
