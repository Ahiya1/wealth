# Production Validation Checklist

Complete validation checklist for production deployment of Wealth app.

## Pre-Deployment Verification

Before going live, ensure:

- [ ] Vercel production deployment complete and accessible
- [ ] Supabase production instance configured and connected
- [ ] Database schema migrated to production
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured (if applicable)

## Email Template Validation

### Local Testing (Development)

Test with local Inbucket before production upload:

- [ ] Local Supabase running (`npm run db:local`)
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Trigger signup at http://localhost:3000/signup
- [ ] Email received in Inbucket (http://localhost:54424)
- [ ] Template renders correctly (colors, spacing, button)
- [ ] Verification link redirects to http://localhost:3000/dashboard
- [ ] All template variables populated (`{{ .ConfirmationURL }}`)

### Production Upload

Upload templates to Supabase Dashboard:

- [ ] Navigate to: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/templates
- [ ] **Confirmation template:**
  - [ ] Click "Confirm signup" tab
  - [ ] Copy contents of `supabase/templates/confirmation.html`
  - [ ] Paste into editor
  - [ ] Click "Save"
- [ ] **Password reset template:**
  - [ ] Click "Reset password" tab
  - [ ] Copy contents of `supabase/templates/reset_password.html`
  - [ ] Paste into editor
  - [ ] Click "Save"

### Email Verification Configuration

Configure Supabase settings:

- [ ] Navigate to: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/settings/auth
- [ ] **Email Provider:**
  - [ ] "Enable Email Provider" checked ✓
- [ ] **Email confirmations:**
  - [ ] Switch to **Enabled** ✓
- [ ] **Secure email change:**
  - [ ] Switch to **Enabled** ✓
- [ ] **URL Configuration:**
  - [ ] Site URL: `https://[vercel-app].vercel.app`
  - [ ] Redirect URL: `https://[vercel-app].vercel.app/auth/callback`
- [ ] Click "Save"

### Production Email Testing

Test signup flow with real email delivery:

- [ ] Navigate to production signup: `https://[app].vercel.app/signup`
- [ ] Create test user: `test+001@[youremail].com`
- [ ] Receive verification email within 60 seconds
- [ ] **Gmail Desktop:**
  - [ ] Email displays correctly
  - [ ] Brand colors correct (#059669 green, #faf9f8 background)
  - [ ] Button styled and clickable
  - [ ] Font sizes readable (16px body)
  - [ ] Fallback link visible
- [ ] **Gmail Mobile:**
  - [ ] Email displays in mobile viewport
  - [ ] Button tappable (44x44px minimum)
  - [ ] Text wraps correctly, no overflow
  - [ ] No horizontal scrolling
- [ ] **Outlook Web:**
  - [ ] Table layout renders correctly
  - [ ] Button background color visible
  - [ ] Text colors match brand
  - [ ] No broken elements
- [ ] Click verification link
- [ ] Redirected to production dashboard
- [ ] User can access protected routes

### Password Reset Testing (Optional)

- [ ] Navigate to: `https://[app].vercel.app/signin`
- [ ] Click "Forgot password?"
- [ ] Enter test email, submit
- [ ] Receive reset email within 60 seconds
- [ ] Email renders correctly (matches confirmation style)
- [ ] Click "Reset Password" button
- [ ] Redirected to password reset form
- [ ] Can set new password successfully

## Admin User Setup

### Create Admin via Dashboard

- [ ] Navigate to: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/users
- [ ] Click "Add user" button
- [ ] Fill in form:
  - [ ] Email: `ahiya.butman@gmail.com`
  - [ ] Password: `wealth_generator`
  - [ ] **Auto Confirm User**: ✅ **CHECKED**
- [ ] Click "Create user"
- [ ] Verify user appears in user list
- [ ] Verify green checkmark (email confirmed)

### Sync Admin to Prisma

- [ ] Run sync script: `npx tsx scripts/create-admin-prod.ts`
- [ ] Verify output:
  - [ ] "Found admin user" message
  - [ ] "Prisma user synced" message
  - [ ] Role: ADMIN
  - [ ] Email verified: Yes
- [ ] Check database:
  ```sql
  SELECT id, email, role, "supabaseAuthId"
  FROM "User"
  WHERE email = 'ahiya.butman@gmail.com';
  ```
  - [ ] Row exists
  - [ ] role = 'ADMIN'
  - [ ] supabaseAuthId populated

### Test Admin Login

- [ ] Navigate to: `https://[app].vercel.app/signin`
- [ ] Login with:
  - Email: `ahiya.butman@gmail.com`
  - Password: `wealth_generator`
- [ ] Redirected to /dashboard (no email verification block)
- [ ] Can access all protected routes

## Application Functionality

### Core Features

Test all major features work correctly:

**Dashboard:**
- [ ] Dashboard loads without errors
- [ ] Net worth summary displays
- [ ] Recent transactions list shows
- [ ] Quick stats cards visible
- [ ] All amounts in NIS format (1,234.56 ₪)

**Transactions:**
- [ ] Create transaction: 150.50
- [ ] Displays as "150.50 ₪"
- [ ] Transaction saves to database
- [ ] Appears in transaction list
- [ ] Can edit transaction
- [ ] Can delete transaction

**Analytics:**
- [ ] Analytics page loads
- [ ] Charts render correctly
- [ ] Net worth chart shows data
- [ ] Spending by category chart works
- [ ] Month over month comparison displays
- [ ] All currency labels show ₪ symbol

**Accounts:**
- [ ] Accounts page loads
- [ ] Can create new account
- [ ] Account balances in NIS format
- [ ] Can edit account details
- [ ] Can archive account

**Budgets:**
- [ ] Budgets page loads
- [ ] Can create budget
- [ ] Budget amounts in NIS format
- [ ] Progress bars display correctly
- [ ] Budget alerts work (if applicable)

**Settings:**
- [ ] Settings page loads
- [ ] Profile section displays
- [ ] Categories management works
- [ ] Currency shows NIS (read-only)
- [ ] Can update settings successfully

### Recurring Transactions (If Implemented)

- [ ] Recurring transactions page loads
- [ ] Can create recurring transaction
- [ ] Recurring amount in NIS format
- [ ] Upcoming bills widget shows (dashboard)
- [ ] Cron job processes recurring transactions (verify after 24h)

### Authentication Flow

**New User Signup:**
- [ ] Navigate to /signup
- [ ] Enter email and password
- [ ] See "Check your email" message
- [ ] Receive verification email
- [ ] Click verification link
- [ ] Redirected to dashboard
- [ ] Can access protected routes

**Email Verification Enforcement:**
- [ ] Create account but don't verify email
- [ ] Try to access /dashboard directly
- [ ] Blocked with "verify your email" message
- [ ] Verify email via link
- [ ] Access granted to dashboard

**User Login:**
- [ ] Navigate to /signin
- [ ] Login with verified credentials
- [ ] Redirected to dashboard
- [ ] Session persists across page refreshes
- [ ] Logout works correctly

**Password Reset:**
- [ ] Request password reset
- [ ] Receive reset email
- [ ] Click reset link
- [ ] Can set new password
- [ ] Login with new password works

## Performance Validation

### Page Load Times

Test critical pages load quickly:

- [ ] Dashboard: < 3 seconds (initial load)
- [ ] Transactions: < 2 seconds
- [ ] Analytics: < 3 seconds (with charts)
- [ ] Settings: < 2 seconds

### Email Delivery Times

- [ ] Signup verification: < 60 seconds
- [ ] Password reset: < 60 seconds

### API Response Times

- [ ] Create transaction: < 1 second
- [ ] Fetch transactions: < 2 seconds
- [ ] Analytics queries: < 3 seconds

## Mobile Responsiveness

Test on mobile devices:

**Mobile Phone (375px - 414px):**
- [ ] Dashboard responsive
- [ ] Transaction form usable
- [ ] Charts display correctly
- [ ] Navigation menu accessible
- [ ] Touch targets 44x44px minimum
- [ ] No horizontal scrolling

**Tablet (768px - 1024px):**
- [ ] Layout adapts correctly
- [ ] Sidebar visible or collapsible
- [ ] Charts scale properly
- [ ] Forms usable

## Browser Compatibility

Test in major browsers:

**Chrome/Edge (Chromium):**
- [ ] All features work
- [ ] Charts render correctly
- [ ] Forms submit successfully

**Firefox:**
- [ ] All features work
- [ ] No console errors

**Safari (Desktop):**
- [ ] All features work
- [ ] Date pickers work correctly

**Safari (iOS):**
- [ ] Mobile-optimized
- [ ] Touch interactions work

## Security Validation

### Authentication Security

- [ ] Unverified users blocked from protected routes
- [ ] Session expires after timeout
- [ ] CSRF protection enabled
- [ ] Secure cookies (HttpOnly, Secure flags)

### Data Security

- [ ] Database credentials not exposed
- [ ] Service role key not in client code
- [ ] API routes validate auth tokens
- [ ] Sensitive data encrypted (if applicable)

### Rate Limiting

- [ ] Email sending rate limited (30/hour per IP)
- [ ] API endpoints protected from abuse
- [ ] Login attempts rate limited (if implemented)

## Error Handling

### User-Facing Errors

- [ ] 404 page displays for invalid routes
- [ ] 500 page displays for server errors
- [ ] Auth errors show helpful messages
- [ ] Form validation errors clear

### Server-Side Errors

- [ ] Errors logged to Vercel logs
- [ ] No sensitive data in error messages
- [ ] Graceful degradation on API failures

## Environment Variables

Verify all required env vars set in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `CRON_SECRET`
- [ ] `ENCRYPTION_KEY`

## Database Validation

### Schema Verification

- [ ] All migrations applied
- [ ] Tables created correctly
- [ ] Indexes in place
- [ ] RLS policies enabled (if using Supabase RLS)

### Data Integrity

- [ ] Admin user exists in User table
- [ ] Test transactions save correctly
- [ ] Foreign key constraints work
- [ ] Default values apply correctly

## Monitoring Setup

### Vercel Monitoring

- [ ] Deployment logs accessible
- [ ] Function logs visible
- [ ] Error tracking enabled
- [ ] Analytics configured (if using Vercel Analytics)

### Supabase Monitoring

- [ ] Auth logs accessible
- [ ] Database logs visible
- [ ] API usage tracked
- [ ] Email delivery logs available

## Final Production Smoke Test

Complete end-to-end test:

**Admin User Journey:**
- [ ] Login with admin credentials
- [ ] Navigate to dashboard
- [ ] Create transaction: 500.00 ₪
- [ ] View in analytics (chart updates)
- [ ] Create budget: 2000.00 ₪
- [ ] Add account: "Bank Account" with balance 10000.00 ₪
- [ ] Navigate to settings
- [ ] All pages load without errors

**New User Journey:**
- [ ] Signup with test email
- [ ] Verify email via link
- [ ] Complete onboarding (if implemented)
- [ ] Create first transaction
- [ ] View dashboard
- [ ] Explore all features
- [ ] Logout successfully

## Post-Launch Checklist

After production launch:

- [ ] Document production URL in project README
- [ ] Save admin credentials securely (1Password, etc.)
- [ ] Set up monitoring alerts (optional)
- [ ] Schedule first backup (if not automated)
- [ ] Notify stakeholders of launch
- [ ] Monitor error logs for 24 hours
- [ ] Check email delivery success rate

## Rollback Plan

If critical issues found:

**Rollback Steps:**
1. [ ] Disable email verification in Supabase (immediate)
2. [ ] Revert to previous Vercel deployment (if code issues)
3. [ ] Restore database backup (if data corruption)
4. [ ] Notify users of downtime (if applicable)

**Emergency Contacts:**
- Vercel support: https://vercel.com/support
- Supabase support: https://supabase.com/dashboard/support

## Notes

- Complete local testing before production deployment
- Test with real email addresses (not just Inbucket)
- Verify all currency displays show NIS (₪) symbol
- Admin password should be changed after first login
- Keep service role key secure (never commit to git)
- Templates apply instantly (no deployment needed)
- Monitor first 24 hours closely for issues

## Sign-Off

Production validation completed by: ________________

Date: ________________

Issues found: ________________

Resolution status: ________________
