# Builder Task Breakdown

## Overview
**1 primary builder** will work sequentially through all tasks.
This iteration has **no parallel work** - tasks must be completed in order due to dependencies.

**Total estimated time:** 3.5-4 hours
**Complexity:** LOW-MEDIUM (no builder splits needed)

## Builder Assignment Strategy
- **Single builder** for all tasks (no parallelization)
- Tasks are sequential: Email templates → Upload → Admin user → Testing
- Low complexity allows single builder to handle efficiently
- Clear dependencies documented to avoid missteps

---

## Builder-1: Email Branding & Admin Access (Complete Iteration)

### Scope
Create custom branded email templates for signup verification and password reset, upload to production Supabase dashboard, configure email verification enforcement, create pre-verified admin user, and validate entire production flow end-to-end.

### Complexity Estimate
**LOW-MEDIUM**

**Rationale:**
- Email template creation is straightforward (copy patterns from patterns.md)
- Dashboard configuration is point-and-click (no code)
- Admin user creation has clear 2-step process (dashboard → script)
- Testing is manual but well-documented
- No code deployment needed (configuration only)

**No split recommended** - single builder can complete in 3.5-4 hours.

### Success Criteria
- [ ] Email templates created and tested locally with Inbucket
- [ ] Templates uploaded to production Supabase dashboard
- [ ] Email verification enabled in Supabase settings
- [ ] Test signup sends styled verification email
- [ ] Email renders correctly in Gmail (desktop + mobile) and Outlook
- [ ] Admin user created via Supabase dashboard with auto-confirm
- [ ] Admin user synced to Prisma database with ADMIN role
- [ ] Admin login works immediately without email verification
- [ ] New user signup flow tested end-to-end
- [ ] Production smoke test passes (all features working with NIS currency)

### Files to Create

**Email Templates:**
- `supabase/templates/confirmation.html` - Signup email verification template
- `supabase/templates/reset_password.html` - Password reset email template
- `supabase/templates/README.md` - Template deployment instructions

**Admin User Script:**
- `scripts/create-admin-prod.ts` - Prisma sync script for admin user

**Documentation (Optional but Recommended):**
- `docs/email-templates.md` - Template customization guide for future updates

### Dependencies
**Depends on:**
- Iteration 1 complete (Vercel production deployment, Supabase configured)
- Production Supabase instance accessible
- Vercel deployment URL known

**Blocks:**
- Nothing (this is final iteration before production launch)

### Implementation Notes

**Phase 1: Email Template Creation (2 hours)**

1. **Create templates directory:**
   ```bash
   mkdir -p supabase/templates
   ```

2. **Create confirmation.html:**
   - Copy full template from `patterns.md` → "Confirmation Email Template"
   - Save to: `supabase/templates/confirmation.html`
   - Verify Supabase variables: `{{ .ConfirmationURL }}`
   - Ensure inline CSS on all elements
   - Check brand colors: #059669 (sage green), #faf9f8 (background)

3. **Create reset_password.html:**
   - Copy full template from `patterns.md` → "Password Reset Email Template"
   - Save to: `supabase/templates/reset_password.html`
   - Same structure as confirmation, different copy

4. **Create README.md:**
   - Document template upload process
   - Include Supabase dashboard URLs
   - Note: Templates must be uploaded manually (no CLI automation)

5. **Test locally with Inbucket:**
   ```bash
   # Terminal 1
   npm run db:local

   # Terminal 2
   npm run dev

   # Browser 1: Trigger signup
   # http://localhost:3000/signup
   # Use: test@example.com

   # Browser 2: View email
   # http://localhost:54424
   ```

6. **Iterate on design:**
   - Check rendering (colors, spacing, button)
   - Click verification link (should redirect to /dashboard)
   - Fix any issues, restart Supabase, test again
   - Repeat until satisfied

**Phase 2: Production Upload & Configuration (30 minutes)**

7. **Upload confirmation template:**
   - Navigate: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/templates
   - Click: "Confirm signup" tab
   - Copy-paste: Contents of `confirmation.html`
   - Click: "Save"

8. **Upload password reset template:**
   - Click: "Reset password" tab
   - Copy-paste: Contents of `reset_password.html`
   - Click: "Save"

9. **Enable email verification:**
   - Navigate: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/settings/auth
   - Find: "Email confirmations" toggle
   - Switch to: **Enabled** ✓
   - Find: "Secure email change" toggle
   - Switch to: **Enabled** ✓

10. **Configure URLs:**
    - Find: "URL Configuration" section
    - Set **Site URL**: `https://[vercel-app].vercel.app` (get from Vercel dashboard)
    - Add **Redirect URL**: `https://[vercel-app].vercel.app/auth/callback`
    - Click: "Save"

**Phase 3: Admin User Creation (30 minutes)**

11. **Create admin via Supabase dashboard:**
    - Navigate: https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/users
    - Click: "Add user" button
    - Fill in:
      - Email: `ahiya.butman@gmail.com`
      - Password: `wealth_generator`
      - **Auto Confirm User**: ✅ **CHECKED** (critical!)
    - Click: "Create user"
    - Verify: Green checkmark next to email (confirmed)

12. **Create Prisma sync script:**
    - Copy full script from `patterns.md` → "Admin User Sync Script"
    - Save to: `scripts/create-admin-prod.ts`
    - Ensure production env vars loaded in terminal

13. **Run sync script:**
    ```bash
    npx tsx scripts/create-admin-prod.ts
    ```
    - Expected output: Success message with user ID and role
    - If error: Check that admin exists in Supabase dashboard first

**Phase 4: Production Validation (30 minutes)**

14. **Test admin login:**
    - Navigate: `https://[vercel-app].vercel.app/signin`
    - Login:
      - Email: `ahiya.butman@gmail.com`
      - Password: `wealth_generator`
    - Expected: Redirect to /dashboard (no email verification required)
    - Verify: Can create transaction, view analytics

15. **Test new user signup:**
    - Navigate: `https://[vercel-app].vercel.app/signup`
    - Create account: `test+001@ahiya.butman@gmail.com`
    - Expected: "Check your email" message

16. **Test email rendering:**
    - Check Gmail inbox (desktop)
    - Verify: Brand colors, button, spacing
    - Check Gmail mobile (if possible)
    - Check Outlook web (if possible)
    - Take screenshots of any issues

17. **Test verification link:**
    - Click "Verify Email" button in email
    - Expected: Redirect to production /dashboard
    - Verify: Can access protected routes

18. **Test email verification enforcement:**
    - Create another test user: `test+002@ahiya.butman@gmail.com`
    - Do NOT verify email
    - Try to access /dashboard directly
    - Expected: Blocked with "verify your email" message

19. **Production smoke test:**
    ```
    ✓ Admin login works
    ✓ Create transaction: 150.50 (displays as "150.50 ₪")
    ✓ Dashboard totals show NIS format
    ✓ Analytics charts show ₪ on axes
    ✓ Settings page renders
    ✓ All pages responsive on mobile
    ```

20. **Document credentials:**
    - Save admin credentials securely (1Password, etc.)
    - Update project documentation with production URL
    - Note any issues or improvements for post-MVP

### Patterns to Follow
Reference patterns from `patterns.md`:

**Email Templates:**
- Use "HTML Email Structure (Table-Based Layout)" for all templates
- Follow "Confirmation Email Template" pattern exactly
- Follow "Password Reset Email Template" pattern exactly
- Inline CSS on every element (no `<style>` tags)

**Admin User Creation:**
- Use "Admin User Creation via Supabase Dashboard" for initial creation
- Use "Admin User Sync Script (TypeScript)" for Prisma sync

**Configuration:**
- Use "Email Template Upload (Dashboard)" pattern
- Use "Email Verification Configuration (Dashboard)" pattern

**Testing:**
- Use "Local Email Template Testing (Inbucket)" for development
- Use "Production Email Testing" checklist for validation

### Testing Requirements

**Local Testing (Inbucket):**
- Test signup flow with `test@example.com`
- Verify email received in http://localhost:54424
- Verify template renders correctly (colors, button, text)
- Click verification link, confirm redirect to /dashboard
- Test password reset flow (optional but recommended)

**Production Testing (Gmail, Outlook):**
- Test signup with `test+001@ahiya.butman@gmail.com`
- Check rendering in Gmail desktop
- Check rendering in Gmail mobile (if possible)
- Check rendering in Outlook web
- Take screenshots for documentation
- Verify links work (click through to dashboard)

**Admin Access Testing:**
- Login with admin credentials
- Verify no email verification required
- Test transaction creation (NIS format)
- Test all dashboard pages render
- Verify middleware allows admin routes (if applicable)

**End-to-End Testing:**
- Admin login → Dashboard → Create transaction → View analytics
- New user signup → Email verification → Dashboard access
- Unverified user → Dashboard blocked → Verify → Access granted

**Coverage target:** 100% manual testing (no automated tests for this iteration)

### Potential Split Strategy
**NOT RECOMMENDED** - Complexity is LOW-MEDIUM, well within single builder capacity.

If complexity proves higher than expected (unlikely), consider this split:

**Foundation (Primary Builder):**
- Create email templates
- Test locally with Inbucket
- Create admin sync script

**Sub-builder 1A: Production Configuration**
- Upload templates to Supabase dashboard
- Enable email verification
- Configure URLs

**Sub-builder 1B: Admin & Testing**
- Create admin user via dashboard
- Run sync script
- Execute full production validation

**Estimate if split:** 2 hours (Foundation) + 1 hour (1A) + 1 hour (1B) = 4 hours total

**Why not to split:**
- Sequential dependencies make parallelization inefficient
- Context switching adds overhead
- Single builder maintains consistency
- Dashboard configuration is too quick to justify separate builder

---

## Builder Execution Order

### Phase 1: Email Templates (Must complete first)
- Builder-1 creates `confirmation.html` and `reset_password.html`
- Builder-1 tests locally with Inbucket
- Builder-1 iterates until templates render correctly

### Phase 2: Production Upload (Depends on Phase 1)
- Builder-1 uploads templates to Supabase dashboard
- Builder-1 enables email verification
- Builder-1 configures callback URLs

### Phase 3: Admin User (Depends on Phase 2)
- Builder-1 creates admin via dashboard
- Builder-1 runs sync script to Prisma
- Builder-1 verifies admin login works

### Phase 4: Validation (Depends on Phase 3)
- Builder-1 tests new user signup flow
- Builder-1 validates email rendering in 3 clients
- Builder-1 executes production smoke test

### Integration Notes
**No integration needed** - single builder owns all tasks.

**Potential conflict areas:**
- None (no parallel work)

**Shared files:**
- `supabase/templates/*.html` - Only created once, no conflicts

**Coordination:**
- None required

---

## Task Sequencing Diagram

```
Email Templates Creation (2h)
    ↓
Local Testing with Inbucket (included in 2h)
    ↓
Production Upload & Configuration (30min)
    ↓
Admin User Creation (30min)
    ↓
Production Validation & Testing (30min)
    ↓
✅ Iteration 2 Complete
```

---

## Risk Mitigation

**Risk: Email templates don't render in Outlook**
- **Mitigation:** Use table-based layout from patterns.md (proven to work)
- **Fallback:** Simplify design further, test again
- **Time buffer:** 30 minutes for iteration included in 2-hour estimate

**Risk: Admin user creation blocks production access**
- **Mitigation:** Check "Auto Confirm User" box in dashboard (explicitly documented)
- **Fallback:** Manually verify email via Supabase dashboard
- **Validation:** Test admin login immediately after creation

**Risk: Email verification blocks all users**
- **Mitigation:** Test with test user first before enabling for production
- **Fallback:** Disable confirmations in dashboard (instant rollback)
- **Validation:** Create test user, verify flow works before admin login

**Risk: Template variables syntax incorrect**
- **Mitigation:** Copy exact templates from patterns.md (validated syntax)
- **Validation:** Test locally with Inbucket before production upload
- **Fallback:** Fix syntax, re-upload (no code changes needed)

---

## Success Validation Checklist

Before marking iteration complete, verify:

**Email Templates:**
- [ ] `confirmation.html` created with brand colors
- [ ] `reset_password.html` created with brand colors
- [ ] Both templates tested locally with Inbucket
- [ ] Templates uploaded to production Supabase dashboard
- [ ] Test signup sends styled email within 60 seconds

**Email Verification:**
- [ ] Email confirmations enabled in Supabase settings
- [ ] Site URL configured correctly (production Vercel URL)
- [ ] Callback URL whitelisted (`/auth/callback`)
- [ ] Unverified users blocked from /dashboard

**Admin User:**
- [ ] Admin user created via Supabase dashboard
- [ ] "Auto Confirm User" checked (email pre-verified)
- [ ] Admin user synced to Prisma with ADMIN role
- [ ] Admin login works immediately (no verification required)

**Email Rendering:**
- [ ] Email displays correctly in Gmail desktop
- [ ] Email displays correctly in Gmail mobile (if tested)
- [ ] Email displays correctly in Outlook web
- [ ] Verification button is tappable and styled
- [ ] Fallback link displays if button doesn't work

**Production Validation:**
- [ ] Admin can login and access all features
- [ ] New user signup triggers verification email
- [ ] Verification link redirects to production dashboard
- [ ] Verified user can access protected routes
- [ ] All amounts display in NIS format (1,234.56 ₪)

**Documentation:**
- [ ] Admin credentials documented securely
- [ ] Template deployment process documented
- [ ] Production URL documented
- [ ] Any issues/improvements noted for post-MVP

---

## Time Breakdown

| Task | Estimated Time | Critical Path |
|------|---------------|---------------|
| Email template creation | 2 hours | Yes |
| Local testing (Inbucket) | Included in 2h | Yes |
| Production upload & config | 30 minutes | Yes |
| Admin user creation | 30 minutes | Yes |
| Production validation | 30 minutes | Yes |
| **Total** | **3.5-4 hours** | - |

**Buffer:** 30 minutes included in email template time for iteration/refinement

---

## Builder Notes

**Before starting:**
1. Ensure production Vercel deployment is live (from Iteration 1)
2. Get production Vercel URL from Vercel dashboard
3. Verify production Supabase credentials work
4. Have access to Supabase dashboard (project owner)
5. Have Gmail account ready for email testing

**During development:**
1. Work sequentially (don't skip ahead)
2. Test locally before production upload
3. Take screenshots of email rendering for documentation
4. Document any issues encountered for future reference

**After completion:**
1. Save admin credentials securely
2. Test full production flow one more time
3. Update project README with production URL
4. Note any improvements for post-MVP iteration

**Tools needed:**
- Web browser (Chrome/Firefox)
- Terminal (for running scripts)
- Gmail account (for testing)
- Text editor (for creating HTML templates)

**No specialized tools required:**
- No email testing services (Litmus, Email on Acid) needed for MVP
- No logo design tools (text-only headers sufficient)
- No CSS preprocessors (inline CSS only)

---

## Final Deliverables

After Builder-1 completes all tasks, the following will be ready:

**Files Created:**
- `supabase/templates/confirmation.html`
- `supabase/templates/reset_password.html`
- `supabase/templates/README.md`
- `scripts/create-admin-prod.ts`
- `docs/email-templates.md` (optional)

**Production Configuration:**
- Email templates uploaded to Supabase dashboard
- Email verification enabled
- Site URL and callback URL configured
- Admin user created and verified

**Production Access:**
- Admin can login with ahiya.butman@gmail.com / wealth_generator
- New users can signup and receive styled verification emails
- Email verification enforced for all non-admin users

**Validation Complete:**
- Email rendering tested in 3 major clients
- Admin login tested and working
- New user signup flow tested end-to-end
- Production smoke test passed

**Documentation:**
- Admin credentials saved securely
- Template deployment process documented
- Production URL documented
- Any issues/improvements noted

---

**Iteration 2 Complete!** 🎉

The Wealth app is now fully deployed to production with:
- NIS currency throughout (from Iteration 1)
- Custom branded email templates
- Email verification enforcement
- Pre-verified admin user for immediate access
- Full production validation

Ready for real-world usage!
