# 2L Iteration Plan - Wealth Email Branding & Admin Access

## Project Vision
Complete the production deployment of Wealth by adding custom branded email templates for authentication flows and creating a pre-verified admin user for immediate production access. This iteration builds upon the successful currency migration and Vercel deployment from Iteration 1, adding the polish and access control needed for real-world usage.

## Success Criteria
Specific, measurable criteria for MVP completion:
- [ ] Custom branded email templates created for signup verification and password reset
- [ ] Email templates uploaded to production Supabase dashboard
- [ ] Email verification enforced (users cannot access app until email verified)
- [ ] Test signup sends beautifully rendered email that displays correctly in Gmail, Outlook, and Apple Mail
- [ ] Admin user (ahiya.butman@gmail.com) created with pre-verified email
- [ ] Admin user can login immediately with password "wealth_generator"
- [ ] Admin user has ADMIN role in Prisma database
- [ ] Production smoke test passes: admin login, create transaction, view dashboard
- [ ] New user signup flow tested end-to-end with email verification

## MVP Scope
**In Scope:**
- Custom HTML email templates with brand colors and responsive design
- Signup confirmation email template (required)
- Password reset email template (required)
- Supabase dashboard configuration for email verification
- Admin user creation via Supabase dashboard with auto-confirm
- Prisma database sync script for admin user
- Email template testing in 3 major email clients (Gmail, Outlook, Apple Mail)
- Production validation with end-to-end testing

**Out of Scope (Post-MVP):**
- Logo design/creation for email headers
- Magic link email template (passwordless auth not in use)
- Dark mode support for email templates
- Comprehensive email client testing (10+ clients via Litmus)
- Email open rate tracking/analytics
- Multiple admin user creation automation
- Custom domain configuration for emails

## Development Phases
1. **Exploration** ✅ Complete (2 explorers analyzed architecture and patterns)
2. **Planning** 🔄 Current (comprehensive plan creation)
3. **Building** ⏳ 2-3 hours (email templates + dashboard config + admin user)
4. **Integration** ⏳ 15 minutes (upload templates, sync admin to Prisma)
5. **Validation** ⏳ 30 minutes (test signup flow, email rendering, admin login)
6. **Deployment** ⏳ N/A (configuration changes only, no redeployment needed)

## Timeline Estimate
- Exploration: Complete (2 comprehensive reports)
- Planning: Complete
- Building: 2-3 hours (sequential tasks)
  - Email template creation: 2 hours
  - Admin user setup: 30 minutes
  - Documentation: 30 minutes
- Integration: 15 minutes (upload templates, configure dashboard)
- Validation: 30 minutes (end-to-end testing)
- Total: ~3.5-4 hours

## Risk Assessment

### High Risks
**Risk: Email templates render incorrectly in Outlook**
- Impact: Users on Outlook see broken/ugly emails
- Likelihood: Medium (Outlook CSS support is notoriously bad)
- Mitigation: Use table-based layout with inline CSS only (no flexbox/grid), test in Outlook web before production
- Rollback: Supabase default templates are functional fallback

**Risk: Admin user creation blocks production access**
- Impact: Cannot access production app if email verification not bypassed
- Likelihood: Low (if "Auto-confirm" checked in dashboard)
- Mitigation: Document 3 creation methods (Dashboard with auto-confirm, SQL, API), verify admin role in Prisma
- Rollback: Manually verify email via Supabase dashboard if needed

### Medium Risks
**Risk: Email template variables syntax incorrect**
- Impact: Verification links don't work, users can't complete signup
- Likelihood: Medium (easy to mistype Supabase variables)
- Mitigation: Use exact syntax `{{ .ConfirmationURL }}` (case-sensitive), test locally with Inbucket first
- Rollback: Fix syntax and re-upload template (no code changes needed)

**Risk: Production callback URL misconfigured**
- Impact: Email verification redirects to wrong URL or 404
- Likelihood: Medium (easy to forget to update Site URL in dashboard)
- Mitigation: Set Site URL to actual Vercel production URL (not preview), add callback URL to whitelist
- Rollback: Update URLs in Supabase dashboard (no redeployment required)

## Integration Strategy
This iteration integrates with existing production infrastructure from Iteration 1:

**Email Templates ↔ Supabase Auth:**
- Templates uploaded via Supabase Dashboard (Authentication → Email Templates)
- Supabase automatically uses templates when sending verification emails
- No code changes needed (SignUpForm.tsx already triggers email sending)

**Admin User ↔ Prisma Database:**
- Admin user created first in Supabase Auth via dashboard
- Prisma sync script (`create-admin-prod.ts`) links Supabase auth ID to User table
- Middleware already checks User table for role-based access (no changes needed)

**Email Verification ↔ Application Flow:**
- Enable confirmations in Supabase dashboard (Authentication → Settings)
- Existing middleware enforces session validation
- Callback route (`/auth/callback`) already handles verification token exchange

**Testing Integration:**
- Local testing uses Inbucket (http://localhost:54424) for rapid iteration
- Production testing uses actual email delivery to Gmail/Outlook
- No additional test infrastructure needed

## Deployment Plan
This iteration requires **configuration changes only** (no code deployment):

**Phase 1: Local Development & Testing (2 hours)**
1. Create email templates in `supabase/templates/` directory
2. Update local `config.toml` to reference templates
3. Test with local Inbucket email server
4. Iterate on design until rendering looks professional

**Phase 2: Production Configuration (30 minutes)**
1. Navigate to Supabase Dashboard (https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy)
2. Upload email templates:
   - Authentication → Email Templates → Confirm signup
   - Paste `confirmation.html` content, save
   - Authentication → Email Templates → Reset password
   - Paste `reset_password.html` content, save
3. Enable email verification:
   - Authentication → Providers → Email
   - Check "Confirm email" checkbox
   - Set Site URL to production Vercel URL
   - Add callback URL to redirect whitelist
4. Create admin user:
   - Authentication → Users → Add user
   - Email: ahiya.butman@gmail.com
   - Password: wealth_generator
   - **CRITICAL:** Check "Auto Confirm User"
   - Click "Create user"

**Phase 3: Prisma Sync (15 minutes)**
1. Run `scripts/create-admin-prod.ts` to sync admin user to Prisma database
2. Verify admin role assigned correctly
3. Test admin login at production URL

**Phase 4: Production Validation (30 minutes)**
1. Test admin login (should work immediately without email verification)
2. Test new user signup (should send styled email)
3. Check email rendering in Gmail, Outlook, Apple Mail
4. Click verification link, confirm access granted
5. Verify unverified users are blocked from dashboard

**No Vercel redeployment needed** - all changes are in Supabase configuration.

## Post-Deployment Verification Checklist
- [ ] Admin user logs in successfully with ahiya.butman@gmail.com / wealth_generator
- [ ] Admin user redirected to /dashboard (not blocked)
- [ ] Admin user has ADMIN role in Prisma database
- [ ] New test user signup triggers email send
- [ ] Verification email received within 1 minute
- [ ] Email displays correctly in Gmail (desktop and mobile)
- [ ] Email displays correctly in Outlook web
- [ ] Email displays correctly in Apple Mail (if accessible)
- [ ] Verification link redirects to production dashboard
- [ ] Verified user can access protected routes
- [ ] Unverified user blocked with "verify your email" message
- [ ] Password reset flow triggers styled email (if tested)
- [ ] All transaction amounts display in NIS format (1,234.56 ₪)
- [ ] Dashboard, Analytics, Settings pages render correctly

## Notes
- This iteration has **no code changes** - only configuration and content creation
- Existing authentication infrastructure from Iteration 1 is fully functional
- Email templates are stored in git for version control and disaster recovery
- Templates are uploaded manually to Supabase dashboard (no CLI automation for production)
- Admin user creation has 3 documented fallback methods if dashboard fails
- Logo/branding assets deferred to post-MVP (text-only headers sufficient)
- Magic link template deferred to post-MVP (passwordless auth not actively used)
