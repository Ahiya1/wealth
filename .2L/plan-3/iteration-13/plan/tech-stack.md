# Technology Stack

## Core Authentication Framework
**Decision:** Supabase Auth v2.58.0 (existing, no changes)

**Rationale:**
- Already fully integrated in Iteration 1 with production Supabase instance
- Provides built-in email sending (SMTP) with no external service needed
- Supports custom HTML email templates via Go template syntax
- Admin API allows pre-verified user creation with `email_confirm: true`
- Session management via `@supabase/ssr` already configured in middleware
- Email verification flow already implemented in SignUpForm.tsx

**Alternatives Considered:**
- NextAuth.js: Would require complete rewrite of auth flow (hundreds of files affected)
- Auth0: Overkill for single-user MVP, adds monthly cost
- AWS Cognito: More complex setup, no advantage over Supabase for this use case

**No version changes needed** - existing Supabase packages are sufficient.

## Email Template Technology
**Decision:** Vanilla HTML with inline CSS (no templating engine)

**Rationale:**
- Email clients have extremely limited CSS support (tables required, no flexbox/grid)
- Inline CSS is mandatory for cross-client compatibility (Gmail, Outlook, Apple Mail)
- No build step needed (templates are static HTML files)
- Supabase template variables are simple string replacements: `{{ .ConfirmationURL }}`
- MJML/React Email adds unnecessary complexity for 2 simple templates

**Template Structure:**
- Table-based layout (max-width: 600px)
- Inline CSS on every element
- Supabase variables for dynamic content
- Responsive design via media queries (limited client support)

**Alternatives Considered:**
- MJML: Excellent tool but adds build step and learning curve for 2 templates
- React Email: Over-engineering for static templates without React complexity
- Pug/Handlebars: Supabase uses Go templates, not compatible

**File Format:** `.html` files stored in `supabase/templates/` directory

## Brand Design System (Existing)
**Decision:** Use existing Tailwind color tokens from `src/app/globals.css`

**Color Palette:**
```css
/* Primary Brand Colors */
--sage-600: #059669        /* Primary green for CTA buttons */
--sage-500: hsl(140, 13%, 42%)  /* Lighter sage for accents */
--sage-100: hsl(140, 10%, 92%)  /* Very light sage backgrounds */

/* Warm Neutrals */
--warm-gray-50: #faf9f8    /* Email background */
--warm-gray-600: #5e5651   /* Body text */
--warm-gray-800: #1f1c1a   /* Headings */
--warm-gray-500: hsl(24, 5%, 46%)  /* Muted text */

/* Accent Colors */
--terracotta-500: #d97d5d  /* Warning/emphasis (optional) */
--gold-500: hsl(45, 55%, 50%)  /* Highlights (optional) */
```

**Typography:**
- **Sans-serif:** Inter (Google Fonts) with Arial/Helvetica fallback
- **Serif:** Crimson Pro (Google Fonts) for headings with Georgia fallback
- **Line height:** 1.6 for body text (readability)
- **Font sizes:** 16px body, 24px headings, 14px footer

**Rationale:**
- Consistent with existing web app design
- Colors already user-tested and brand-aligned
- Google Fonts may not load in all email clients (fallbacks critical)

**Logo Status:**
- No logo files exist in current codebase
- **Decision:** Use text-only header for MVP ("Wealth" in Crimson Pro + sage green)
- **Post-MVP:** Add logo/brand mark after design finalization

## Database
**Decision:** PostgreSQL via Supabase (existing, no changes)

**Supabase Instance:**
- URL: `https://npylfibbutxioxjtcbvy.supabase.co`
- Connection: Already configured in Iteration 1
- Tables affected: `User` (for admin role assignment)

**Admin User Integration:**
- `auth.users` table: Managed by Supabase Auth
- `User` table: Managed by Prisma ORM
- Link: `User.supabaseAuthId` → `auth.users.id`

**No schema changes needed** - existing User model already has:
```prisma
model User {
  id              String   @id @default(cuid())
  supabaseAuthId  String   @unique
  email           String   @unique
  role            UserRole @default(USER)
  // ... other fields
}

enum UserRole {
  USER
  ADMIN
}
```

## Email Deployment Method
**Decision:** Supabase Dashboard manual upload (production)

**Rationale:**
- Supabase CLI templates only work for local development
- Dashboard provides immediate preview and test email functionality
- Audit trail of template changes visible in dashboard
- No CLI commands or API automation available for production email templates
- Manual upload is one-time setup (templates rarely change)

**Upload Process:**
1. Navigate to: Authentication → Email Templates in Supabase Dashboard
2. Select template type (Confirm signup, Reset password)
3. Paste HTML content
4. Click "Save"
5. Send test email to verify rendering

**Version Control:**
- Templates stored in git: `supabase/templates/*.html`
- Dashboard is source of truth for production
- Git provides disaster recovery and change history

## Admin User Creation Method
**Decision:** Supabase Dashboard (primary) + TypeScript script (fallback)

**Primary Method: Dashboard**
- Navigate: Authentication → Users → Add user
- Fill: Email, Password, **Check "Auto Confirm User"**
- Instant: User created and email pre-verified in 30 seconds

**Rationale:**
- Fastest method (2-3 minutes total)
- Visual confirmation of success
- Zero risk of script errors or password hashing issues
- Can immediately test login
- Perfect for one-time admin setup

**Fallback Method: TypeScript Script**
- Location: `scripts/create-admin-prod.ts` (new file)
- Uses: `supabase.auth.admin.createUser()` API
- Purpose: Automation for future environments (staging, dev)

**Script Structure:**
```typescript
// 1. Check if admin exists in Supabase Auth
// 2. If not, error (must create via dashboard first)
// 3. Fetch admin user from Supabase Auth
// 4. Upsert to Prisma with role: 'ADMIN'
// 5. Verify sync successful
```

**Why Dashboard First:**
- Dashboard is most reliable (battle-tested UI)
- Script is for Prisma sync only (auth user already exists)
- Reduces chance of dual creation errors

## Email Verification Configuration
**Decision:** Enable via Supabase Dashboard (Authentication → Settings)

**Required Settings:**
```
Authentication → Providers → Email:
  ✓ Enable email provider
  ✓ Confirm email (forces verification)
  ✓ Secure email change (require confirmation for email updates)

Authentication → URL Configuration:
  Site URL: https://[vercel-app].vercel.app
  Redirect URLs: https://[vercel-app].vercel.app/auth/callback
```

**Rationale:**
- Email verification is security best practice (prevent fake signups)
- Already enabled in local development (`config.toml`)
- Middleware already enforces session validation (no code changes)
- Existing callback route handles token exchange

**Implementation Notes:**
- Setting change is instant (no deployment needed)
- Admin user bypasses verification (created with `email_confirm: true`)
- Unverified users automatically blocked by Supabase session validation

## Testing Infrastructure

### Local Email Testing
**Tool:** Supabase Inbucket (localhost:54424)

**Setup:** Already configured in `supabase/config.toml`
```toml
[inbucket]
enabled = true
port = 54424
smtp_port = 54425
pop3_port = 54426
```

**Usage:**
1. Start local Supabase: `npm run db:local`
2. Trigger signup: http://localhost:3000/signup
3. View email: http://localhost:54424
4. Test template rendering and links

**Rationale:**
- Instant email delivery (no external service delays)
- Rapid iteration on template design
- No rate limits or spam filtering
- Perfect for development workflow

### Production Email Testing
**Clients:** Gmail (desktop + mobile), Outlook web, Apple Mail

**Testing Strategy:**
1. Create test user: `test+[timestamp]@ahiya.butman@gmail.com`
2. Trigger signup or password reset
3. Check inbox on each client
4. Verify rendering (logo, button, colors, spacing)
5. Click verification link, confirm redirect works

**Why These Clients:**
- **Gmail:** 70%+ market share, most important
- **Outlook:** Worst CSS support (Microsoft Word engine), critical edge case
- **Apple Mail:** Best CSS support, validates modern features work

**Not Testing (Post-MVP):**
- Yahoo Mail, AOL Mail (declining market share)
- Mobile native apps beyond Gmail (time-intensive)
- Litmus/Email on Acid (paid tools, 10+ clients, overkill for MVP)

### End-to-End Production Testing
**Smoke Test Checklist:**
```
Admin Login:
  ✓ Navigate to production URL
  ✓ Login with ahiya.butman@gmail.com / wealth_generator
  ✓ Redirected to /dashboard (no email verification block)
  ✓ Can create transaction (150.50 ₪ displays correctly)

New User Signup:
  ✓ Navigate to /signup
  ✓ Create account with test email
  ✓ See "Check your email" message
  ✓ Receive styled verification email
  ✓ Email renders correctly (all clients)
  ✓ Click verification link
  ✓ Redirected to /dashboard
  ✓ Can access protected routes

Email Verification Enforcement:
  ✓ Create account but don't verify email
  ✓ Try to access /dashboard directly
  ✓ Blocked with "verify your email" message
  ✓ Verify email, then access granted
```

## Environment Variables
All environment variables already configured in Iteration 1:

```bash
# Supabase Configuration (Production)
NEXT_PUBLIC_SUPABASE_URL=https://npylfibbutxioxjtcbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Server-only

# Database (Pooled connection for Vercel)
DATABASE_URL=postgresql://[user]:[pass]@[host]:6543/[db]?pgbouncer=true
DIRECT_URL=postgresql://[user]:[pass]@[host]:5432/[db]

# Other (from Iteration 1)
CRON_SECRET=[hex-secret]
ENCRYPTION_KEY=[hex-key]
```

**No new environment variables needed for Iteration 2.**

**Security Notes:**
- `SUPABASE_SERVICE_ROLE_KEY` has full database access (admin user creation)
- Only used server-side in `create-admin-prod.ts` script
- Never exposed to client (Next.js server-side only)

## Dependencies Overview
All dependencies already installed (from package.json):

**Authentication:**
- `@supabase/supabase-js@2.58.0` - Auth API, admin user creation
- `@supabase/ssr@0.5.2` - Server-side session management
- `@supabase/auth-ui-react@0.4.7` - Auth UI components (not used for templates)

**Database:**
- `@prisma/client@5.22.0` - User model, admin role management
- `prisma@5.22.0` - Schema migrations (dev dependency)

**Dev Tools:**
- `supabase@1.226.4` - CLI for local testing (Inbucket)

**No new dependencies needed for Iteration 2.**

## Performance Targets
Email template performance is not applicable (static HTML), but validation criteria:

**Email Delivery Time:**
- Target: < 60 seconds from signup to inbox
- Supabase SMTP: Typically 5-15 seconds
- Validation: Measure time from signup click to email received

**Email Rendering Time:**
- Target: < 1 second in email client
- Table layout ensures fast parsing (vs. complex CSS)
- Max file size: < 100KB (current templates ~15KB)

**Verification Link Response Time:**
- Target: < 2 seconds from click to dashboard load
- Callback route already optimized in Iteration 1
- Depends on Vercel serverless cold start (typically < 500ms)

## Security Considerations

**Email Template Security:**
- **XSS Protection:** Supabase auto-escapes template variables (no HTML injection risk)
- **CSRF Protection:** Verification tokens are single-use and expire in 24 hours
- **URL Validation:** Callback URL must be whitelisted in Supabase dashboard

**Admin User Security:**
- **Password:** `wealth_generator` is temporary (can be changed after first login)
- **Role Assignment:** ADMIN role grants access to `/admin` routes (middleware-protected)
- **Pre-Verification:** Admin bypasses email verification for immediate access (acceptable for app owner)

**Email Verification Enforcement:**
- **Prevents:** Spam signups, fake accounts, email enumeration attacks
- **Implementation:** Supabase blocks unverified users at session level (cannot bypass via API)
- **Rate Limiting:** Supabase limits signup emails to 30 per hour per IP (prevents abuse)

## Deployment Configuration
This iteration requires **no code deployment** - only Supabase dashboard configuration.

**Supabase Dashboard Changes:**
1. Upload email templates (Authentication → Email Templates)
2. Enable email confirmations (Authentication → Settings)
3. Set Site URL and redirect URLs (Authentication → URL Configuration)
4. Create admin user (Authentication → Users → Add user)

**Prisma Database Changes:**
1. Run `scripts/create-admin-prod.ts` to sync admin user
2. Verify `User.role = 'ADMIN'` in production database

**No Vercel Changes:**
- No code changes in git
- No new environment variables
- No redeployment needed

**Rollback Plan:**
- Email templates: Revert to Supabase defaults (delete custom templates)
- Email verification: Disable confirmations in dashboard (instant)
- Admin user: Delete from Supabase dashboard and Prisma (if needed)
