# Code Patterns & Conventions

## File Structure
```
wealth/
├── supabase/
│   ├── config.toml              # Local Supabase configuration
│   ├── templates/               # NEW: Email templates directory
│   │   ├── confirmation.html    # Signup email verification
│   │   ├── reset_password.html  # Password reset email
│   │   └── README.md            # Template deployment instructions
│   └── migrations/              # Prisma database migrations
├── scripts/
│   ├── create-test-user.ts      # Existing: Test user creation template
│   └── create-admin-prod.ts     # NEW: Production admin sync script
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages (existing)
│   │   │   ├── signup/page.tsx
│   │   │   └── signin/page.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts # Email verification callback (existing)
│   │   └── globals.css          # Brand colors (reference for email templates)
│   ├── components/
│   │   └── auth/
│   │       └── SignUpForm.tsx   # Signup form (existing, triggers email)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts        # Client-side Supabase
│   │       └── server.ts        # Server-side Supabase
│   └── middleware.ts            # Route protection, admin role check (existing)
└── prisma/
    └── schema.prisma            # User model with admin role (existing)
```

## Naming Conventions
- **Email templates:** lowercase with underscores (`confirmation.html`, `reset_password.html`)
- **Scripts:** lowercase with dashes (`create-admin-prod.ts`)
- **Directories:** lowercase (`templates/`, not `Templates/`)
- **Supabase variables:** PascalCase with leading dot (`{{ .ConfirmationURL }}`)

## Email Template Patterns

### HTML Email Structure (Table-Based Layout)
**When to use:** All email templates (confirmation, password reset, magic link)

**Why table-based layout:**
- Email clients (especially Outlook) have limited CSS support
- Flexbox and CSS Grid don't work in most email clients
- Tables ensure consistent rendering across Gmail, Outlook, Apple Mail
- Inline CSS is mandatory (no `<style>` tags in many clients)

**Code example:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Title - Wealth</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, Helvetica, sans-serif; background-color: #faf9f8;">
  <!-- Outer table: Full-width background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf9f8;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Inner table: Content container (max-width 600px) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

          <!-- Header Section -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e8e6e3;">
              <h1 style="margin: 0; font-family: 'Crimson Pro', Georgia, serif; font-size: 28px; color: #059669; font-weight: 700;">Wealth</h1>
            </td>
          </tr>

          <!-- Body Section -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-family: 'Crimson Pro', Georgia, serif; font-size: 24px; color: #1f1c1a; font-weight: 700;">
                Main Heading
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5e5651;">
                Body text goes here. Keep paragraphs concise and friendly.
              </p>

              <!-- CTA Button (nested table for button) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Button Text
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #78716c;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; word-break: break-all; color: #059669;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e8e6e3; font-size: 14px; color: #78716c;">
              <p style="margin: 0;">Additional footer information here.</p>
              <p style="margin: 8px 0 0;">Disclaimer or help text.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Key points:**
- Use `role="presentation"` on layout tables (accessibility)
- `cellspacing="0" cellpadding="0" border="0"` on all tables (reset styles)
- Inline CSS on every single element (tedious but necessary)
- Max-width: 600px for content (optimal email width)
- Background: #faf9f8 (warm gray from brand colors)
- Primary button: #059669 (sage green)
- Font stack: Inter → Arial → Helvetica → sans-serif (fallbacks critical)

---

### Confirmation Email Template
**When to use:** Signup email verification (required)

**Full working code:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Wealth</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, Helvetica, sans-serif; background-color: #faf9f8;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf9f8;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e8e6e3;">
              <h1 style="margin: 0; font-family: 'Crimson Pro', Georgia, serif; font-size: 28px; color: #059669; font-weight: 700;">Wealth</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-family: 'Crimson Pro', Georgia, serif; font-size: 24px; color: #1f1c1a; font-weight: 700;">
                Verify Your Email
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5e5651;">
                Thank you for signing up! Click the button below to verify your email address and start your mindful finance journey.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #78716c;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; word-break: break-all; color: #059669;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e8e6e3; font-size: 14px; color: #78716c;">
              <p style="margin: 0;">This link will expire in 24 hours.</p>
              <p style="margin: 8px 0 0;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Supabase variables used:**
- `{{ .ConfirmationURL }}` - Full verification link (includes token)
- `{{ .Email }}` - User's email (optional, not used in this template)
- `{{ .SiteURL }}` - Base site URL (optional, not used here)

**Save as:** `supabase/templates/confirmation.html`

---

### Password Reset Email Template
**When to use:** Password reset flow (required)

**Full working code:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Wealth</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, Helvetica, sans-serif; background-color: #faf9f8;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #faf9f8;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e8e6e3;">
              <h1 style="margin: 0; font-family: 'Crimson Pro', Georgia, serif; font-size: 28px; color: #059669; font-weight: 700;">Wealth</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-family: 'Crimson Pro', Georgia, serif; font-size: 24px; color: #1f1c1a; font-weight: 700;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5e5651;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #059669;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #78716c;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; word-break: break-all; color: #059669;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e8e6e3; font-size: 14px; color: #78716c;">
              <p style="margin: 0;">This link will expire in 1 hour.</p>
              <p style="margin: 8px 0 0;">If you didn't request this, your password remains unchanged.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Differences from confirmation template:**
- Heading: "Reset Your Password"
- Body: Password reset copy
- Footer: 1 hour expiration (vs 24 hours)

**Save as:** `supabase/templates/reset_password.html`

---

## Admin User Creation Patterns

### Admin User Sync Script (TypeScript)
**When to use:** After creating admin user in Supabase Dashboard

**Purpose:** Link Supabase auth user to Prisma User table with ADMIN role

**Full working code:**
```typescript
// scripts/create-admin-prod.ts
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function main() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗')
    process.exit(1)
  }

  console.log('🔑 Syncing production admin user...\n')

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('Step 1: Fetching admin user from Supabase Auth...')

  // Fetch admin user from Supabase Auth
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    process.exit(1)
  }

  const adminUser = users.find(u => u.email === 'ahiya.butman@gmail.com')

  if (!adminUser) {
    console.error('❌ Admin user not found in Supabase Auth')
    console.error('   Please create admin user via Supabase Dashboard first:')
    console.error('   https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/users')
    console.error('\n   Steps:')
    console.error('   1. Click "Add user"')
    console.error('   2. Email: ahiya.butman@gmail.com')
    console.error('   3. Password: wealth_generator')
    console.error('   4. ✓ Check "Auto Confirm User"')
    console.error('   5. Click "Create user"')
    process.exit(1)
  }

  console.log(`  ✓ Found admin user: ${adminUser.id}`)
  console.log(`  Email: ${adminUser.email}`)
  console.log(`  Email confirmed: ${adminUser.email_confirmed_at ? '✓' : '✗'}`)

  console.log('\nStep 2: Syncing admin user to Prisma database...')

  // Upsert to Prisma User table
  const prismaUser = await prisma.user.upsert({
    where: { email: 'ahiya.butman@gmail.com' },
    update: {
      supabaseAuthId: adminUser.id,
      role: 'ADMIN', // Ensure admin role assigned
      name: 'Ahiya',
    },
    create: {
      email: 'ahiya.butman@gmail.com',
      name: 'Ahiya',
      supabaseAuthId: adminUser.id,
      role: 'ADMIN', // Critical: Grant admin access
      currency: 'NIS', // Default currency from Iteration 1
      onboardingCompletedAt: new Date(), // Skip onboarding for admin
    },
  })

  console.log(`  ✓ Prisma user synced: ${prismaUser.id}`)
  console.log(`  Role: ${prismaUser.role}`)

  console.log('\n✅ Admin user ready!\n')
  console.log('═══════════════════════════════════════')
  console.log('📧 Email:    ahiya.butman@gmail.com')
  console.log('🔑 Password: wealth_generator')
  console.log(`🆔 User ID:  ${prismaUser.id}`)
  console.log('👑 Role:     ADMIN')
  console.log('✉️  Verified: Yes (pre-confirmed)')
  console.log('═══════════════════════════════════════\n')
  console.log('Next steps:')
  console.log('1. Login at production URL')
  console.log('2. Verify /dashboard access works')
  console.log('3. Test admin routes (/admin) if applicable')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

**Key points:**
- Validates environment variables before proceeding
- Checks if admin user exists in Supabase Auth (fails if not)
- Uses `upsert` for idempotency (safe to run multiple times)
- Sets `role: 'ADMIN'` in both update and create paths
- Skips onboarding flow for admin user
- Provides clear success/error messages

**Run with:**
```bash
# Ensure production environment variables loaded
npx tsx scripts/create-admin-prod.ts
```

---

### Admin User Creation via Supabase Dashboard
**When to use:** First step in admin user creation (recommended primary method)

**Steps:**
1. Navigate to: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy
2. Go to: **Authentication → Users**
3. Click: **"Add user"** button (top right)
4. Fill in form:
   - **Email**: `ahiya.butman@gmail.com`
   - **Password**: `wealth_generator`
   - **Auto Confirm User**: ✅ **CHECKED** (critical - bypasses email verification)
   - User metadata (optional): Leave empty or add `{"name": "Ahiya"}`
5. Click: **"Create user"**
6. Verify: User appears in user list with green checkmark (email confirmed)

**After dashboard creation:**
1. Run `scripts/create-admin-prod.ts` to sync to Prisma
2. Test login at production URL
3. Verify admin role works (can access /admin routes)

**Why this method:**
- Fastest (2-3 minutes total)
- Most reliable (visual confirmation)
- No script errors to debug
- Perfect for one-time setup

---

## Supabase Configuration Patterns

### Email Template Upload (Dashboard)
**When to use:** After creating templates locally and testing with Inbucket

**Steps:**
1. **Navigate to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/templates
   ```

2. **Upload Confirmation Template:**
   - Click: **"Confirm signup"** tab
   - Copy contents of `supabase/templates/confirmation.html`
   - Paste into editor
   - Click: **"Save"**

3. **Upload Password Reset Template:**
   - Click: **"Reset password"** tab
   - Copy contents of `supabase/templates/reset_password.html`
   - Paste into editor
   - Click: **"Save"**

4. **Test Templates:**
   - Click: **"Send test email"** (if available)
   - Or: Create test user and trigger signup flow

**Key points:**
- Templates are saved immediately (no deployment delay)
- Can preview in dashboard editor
- Changes apply to all new emails instantly
- Old emails (already sent) are not affected

---

### Email Verification Configuration (Dashboard)
**When to use:** After uploading email templates

**Steps:**
1. **Navigate to Email Settings:**
   ```
   https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/settings/auth
   ```

2. **Enable Email Provider:**
   - Scroll to: **"Email"** section
   - Ensure: **"Enable Email Provider"** is checked ✓

3. **Enable Email Confirmations:**
   - Find: **"Email confirmations"** toggle
   - Switch to: **Enabled** ✓
   - This forces users to verify email before accessing app

4. **Enable Secure Email Change:**
   - Find: **"Secure email change"** toggle
   - Switch to: **Enabled** ✓
   - This requires confirmation when users change their email

5. **Configure URLs:**
   - Scroll to: **"URL Configuration"** section
   - Set **Site URL**: `https://[your-vercel-app].vercel.app`
   - Add **Redirect URL**: `https://[your-vercel-app].vercel.app/auth/callback`

6. **Save Configuration:**
   - Click: **"Save"** button at bottom of page

**Verification:**
- Create test user signup
- Check that verification email is sent
- Verify unverified user cannot access /dashboard
- Verify email link redirects correctly

---

## Testing Patterns

### Local Email Template Testing (Inbucket)
**When to use:** During email template development (before production upload)

**Setup:**
```bash
# Terminal 1: Start local Supabase
npm run db:local

# Terminal 2: Start Next.js dev server
npm run dev
```

**Testing workflow:**
1. **Update local config** (`supabase/config.toml`):
   ```toml
   [auth.email]
   enable_confirmations = true
   template = "./supabase/templates/confirmation.html"  # Point to your template
   ```

2. **Trigger signup:**
   - Navigate to: http://localhost:3000/signup
   - Enter test email: `test@example.com`
   - Submit form

3. **View email in Inbucket:**
   - Open: http://localhost:54424
   - Find email to `test@example.com`
   - Click to preview rendering

4. **Test verification link:**
   - Click link in email
   - Should redirect to: http://localhost:3000/auth/callback
   - Then redirect to: http://localhost:3000/dashboard

**Iteration process:**
1. Edit template HTML
2. Restart Supabase: `npm run db:local:restart`
3. Trigger new signup
4. Check rendering in Inbucket
5. Repeat until satisfied

---

### Production Email Testing (Gmail, Outlook, Apple Mail)
**When to use:** After uploading templates to Supabase dashboard

**Test user creation:**
```bash
# Use plus-addressing to create multiple test accounts
test+001@ahiya.butman@gmail.com
test+002@ahiya.butman@gmail.com
test+003@ahiya.butman@gmail.com
```

**Testing checklist:**
```
Gmail Desktop:
  ✓ Email received within 60 seconds
  ✓ Brand colors display correctly
  ✓ Button renders as button (not text)
  ✓ Font sizes are readable (16px body)
  ✓ Link fallback displays if images blocked

Gmail Mobile:
  ✓ Email displays in mobile viewport
  ✓ Button is tappable (minimum 44x44px)
  ✓ Text wraps correctly
  ✓ No horizontal scrolling

Outlook Web:
  ✓ Table layout renders correctly
  ✓ Button background color shows
  ✓ Text colors match brand
  ✓ No broken elements

Apple Mail (if accessible):
  ✓ Email displays with full styling
  ✓ Fonts load correctly
  ✓ Border radius shows (8px)
```

**How to test:**
1. Create test user at production URL
2. Check inbox on each client
3. Take screenshots of any issues
4. Fix template, re-upload, test again

---

## Import Order Convention
Not applicable for this iteration (no new TypeScript files with imports).

Existing convention (for reference if creating scripts):
```typescript
// 1. Node/External modules
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// 2. Internal utilities (if any)
// import { someUtil } from '@/lib/utils'

// 3. Initialize clients
const prisma = new PrismaClient()
const supabase = createClient(...)

// 4. Main function
async function main() { ... }
```

---

## Code Quality Standards
- **Email HTML**: Validate with W3C HTML validator (optional but recommended)
- **TypeScript**: Use strict type checking (already enabled in tsconfig.json)
- **Error handling**: Always provide helpful error messages with next steps
- **Idempotency**: Scripts should be safe to run multiple times (use upsert, not insert)
- **Environment validation**: Check required env vars before proceeding

---

## Security Patterns

### Email Template XSS Protection
**Built-in:** Supabase auto-escapes all template variables

**What this means:**
- `{{ .ConfirmationURL }}` is HTML-escaped automatically
- User-provided data (email addresses) cannot inject HTML
- No need for manual escaping

**Safe usage:**
```html
<!-- ✓ SAFE: Supabase variable (auto-escaped) -->
<a href="{{ .ConfirmationURL }}">Verify Email</a>

<!-- ✓ SAFE: Static HTML content -->
<p>Thank you for signing up!</p>
```

**Unsafe patterns (avoid):**
```html
<!-- ✗ UNSAFE: Don't use user input without Supabase variable -->
<p>Hello, <user_provided_name>!</p>  <!-- If not using Supabase variable -->
```

---

### Admin User Password Security
**Temporary password:** `wealth_generator`

**Change password after first login:**
1. Login at production URL
2. Navigate to: /settings (or wherever password change is)
3. Update to secure password
4. Document new password in secure location (1Password, etc.)

**Password requirements:**
- Minimum: 6 characters (Supabase default)
- Recommended: 12+ characters with mixed case, numbers, symbols

---

## Performance Patterns

### Email Template File Size
**Target:** < 100KB per template

**Current templates:** ~15KB each (well within target)

**Why it matters:**
- Large emails may be truncated by Gmail (> 102KB)
- Smaller files load faster in email clients
- Less bandwidth usage for users

**How to keep small:**
- No embedded images (use CDN or text-only)
- Minimal inline CSS (only what's needed)
- No unnecessary HTML comments
- Compress whitespace (optional)

---

## Troubleshooting Patterns

### Email Not Received
**Checklist:**
1. Check spam folder
2. Verify email confirmations enabled in Supabase dashboard
3. Check Supabase logs: Dashboard → Logs → Auth logs
4. Verify Site URL matches production URL
5. Test with different email provider (Gmail vs Outlook)

---

### Verification Link Not Working
**Checklist:**
1. Verify callback URL whitelisted: `https://[app].vercel.app/auth/callback`
2. Check Network tab: Does callback route return 200?
3. Verify middleware allows callback route (should be unprotected)
4. Check Supabase template: Is `{{ .ConfirmationURL }}` spelled correctly?
5. Check token expiration: Links expire in 24 hours

---

### Admin User Cannot Login
**Checklist:**
1. Verify email confirmed in Supabase: Dashboard → Users → [admin] → ✓ green checkmark
2. Check Prisma sync: Run `scripts/create-admin-prod.ts` again
3. Verify role in database: `SELECT role FROM "User" WHERE email = 'ahiya.butman@gmail.com'`
4. Check middleware logs for errors
5. Try password reset flow if password mismatch

---

## Summary
All patterns in this iteration focus on:
1. **Email templates:** Table-based HTML with inline CSS for cross-client compatibility
2. **Admin user creation:** Dashboard-first approach with TypeScript sync script
3. **Configuration:** Supabase dashboard for all production settings
4. **Testing:** Local Inbucket for development, manual testing in 3 email clients for production

**No custom JavaScript/TypeScript patterns needed** - this iteration is primarily content creation and configuration.
