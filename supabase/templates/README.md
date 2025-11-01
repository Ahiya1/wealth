# Email Templates

Custom branded email templates for Wealth authentication flows.

## Templates

- **confirmation.html** - Signup email verification
- **reset_password.html** - Password reset email

## Brand Colors

- **Primary Green**: `#059669` (sage-600) - CTA buttons
- **Background**: `#faf9f8` (warm-gray-50) - Email background
- **Text Dark**: `#1f1c1a` (warm-gray-800) - Headings
- **Text Body**: `#5e5651` (warm-gray-600) - Body text
- **Text Muted**: `#78716c` (warm-gray-500) - Footer text
- **Border**: `#e8e6e3` (warm-gray-200) - Dividers

## Typography

- **Headings**: Crimson Pro, Georgia, serif
- **Body**: Inter, Arial, Helvetica, sans-serif
- **Font Sizes**: 28px (logo), 24px (heading), 16px (body), 14px (footer)

## Supabase Variables

Templates use Supabase's Go template syntax:

- `{{ .ConfirmationURL }}` - Verification/reset link with token
- `{{ .Email }}` - User's email address (not used in current templates)
- `{{ .SiteURL }}` - Base site URL (not used in current templates)

## Local Testing

Test templates locally using Supabase Inbucket:

```bash
# Terminal 1: Start local Supabase
npm run db:local

# Terminal 2: Start Next.js dev server
npm run dev

# Browser 1: Trigger signup
# Navigate to: http://localhost:3000/signup
# Use test email: test@example.com

# Browser 2: View email
# Navigate to: http://localhost:54424
# Click email to test@example.com
```

**Iteration workflow:**
1. Edit template HTML
2. Restart Supabase: `npm run db:local:restart`
3. Trigger new signup
4. Check rendering in Inbucket
5. Repeat until satisfied

## Production Deployment

Templates must be uploaded manually to Supabase Dashboard:

### 1. Upload Confirmation Template

Navigate to:
```
https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/templates
```

Steps:
1. Click **"Confirm signup"** tab
2. Copy contents of `confirmation.html`
3. Paste into editor
4. Click **"Save"**

### 2. Upload Password Reset Template

Steps:
1. Click **"Reset password"** tab
2. Copy contents of `reset_password.html`
3. Paste into editor
4. Click **"Save"**

### 3. Enable Email Verification

Navigate to:
```
https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/settings/auth
```

Configuration:
1. **Email Provider**: Ensure "Enable Email Provider" is checked ✓
2. **Email confirmations**: Switch to **Enabled** ✓
3. **Secure email change**: Switch to **Enabled** ✓

### 4. Configure URLs

In the same settings page:

**Site URL:**
```
https://[your-vercel-app].vercel.app
```

**Redirect URLs:** (add to whitelist)
```
https://[your-vercel-app].vercel.app/auth/callback
```

Click **"Save"** at bottom of page.

## Production Testing

### Test Signup Flow

1. Navigate to production signup: `https://[app].vercel.app/signup`
2. Create test user: `test+001@[youremail].com`
3. Check inbox (Gmail, Outlook, etc.)
4. Verify email received within 60 seconds
5. Check rendering (colors, button, spacing)
6. Click "Verify Email" button
7. Confirm redirect to dashboard

### Email Client Testing Checklist

**Gmail Desktop:**
- [ ] Email received within 60 seconds
- [ ] Brand colors display correctly (#059669 green)
- [ ] Button renders as styled button (not plain text)
- [ ] Font sizes are readable (16px body)
- [ ] Fallback link displays below button

**Gmail Mobile:**
- [ ] Email displays in mobile viewport
- [ ] Button is tappable (minimum 44x44px touch target)
- [ ] Text wraps correctly, no overflow
- [ ] No horizontal scrolling required

**Outlook Web:**
- [ ] Table layout renders correctly
- [ ] Button background color shows (#059669)
- [ ] Text colors match brand
- [ ] No broken layout elements

### Test Password Reset (Optional)

1. Navigate to: `https://[app].vercel.app/signin`
2. Click "Forgot password?"
3. Enter email, submit
4. Check inbox for reset email
5. Verify rendering matches confirmation email style
6. Click "Reset Password" button
7. Confirm redirect to password reset form

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify email confirmations enabled in Supabase dashboard
3. Check Supabase logs: Dashboard → Logs → Auth logs
4. Verify Site URL matches production URL exactly
5. Test with different email provider (Gmail vs Outlook)

### Verification Link Not Working

1. Verify callback URL whitelisted in Supabase settings
2. Check browser Network tab: callback route should return 200
3. Verify middleware allows `/auth/callback` route (should be unprotected)
4. Check template: `{{ .ConfirmationURL }}` must be spelled exactly
5. Check token expiration: links expire in 24 hours (1 hour for password reset)

### Email Rendering Issues

**Button not styled:**
- Ensure inline CSS on `<td>` with background-color
- Check email client CSS support (Outlook uses Word rendering engine)

**Colors wrong:**
- Verify hex codes: `#059669` (green), `#faf9f8` (background)
- Check inline styles on every element (no external stylesheets)

**Layout broken:**
- Ensure `role="presentation"` on all layout tables
- Verify `cellspacing="0" cellpadding="0" border="0"` on all tables
- Check max-width: 600px on content table

## Template Updates

To update templates in production:

1. Edit HTML files in `supabase/templates/`
2. Test locally with Inbucket
3. Copy updated HTML
4. Paste into Supabase Dashboard (same steps as initial upload)
5. Click "Save"
6. Test with new signup immediately

**Note:** Changes apply instantly - no deployment or code changes needed.

## Security

- **XSS Protection**: Supabase auto-escapes all template variables
- **CSRF Protection**: Verification tokens are single-use and expire
- **URL Validation**: Callback URLs must be whitelisted in dashboard
- **Rate Limiting**: Supabase limits signup emails to 30/hour per IP

## Performance

- **Email Delivery**: Target < 60 seconds (typically 5-15 seconds)
- **File Size**: Current templates ~15KB each (target < 100KB)
- **Rendering**: Table layout ensures fast parsing in email clients
- **Link Response**: Target < 2 seconds from click to dashboard load

## Version Control

- **Source of Truth**: Git repository (`supabase/templates/`)
- **Production**: Supabase Dashboard (manual upload)
- **Disaster Recovery**: Re-upload from git if templates corrupted
- **Change History**: Track via git commits

## Notes

- Templates are static HTML (no build step)
- Font loading may fail in some email clients (fallbacks critical)
- No logo files exist yet (text-only header for MVP)
- Magic link template deferred to post-MVP (not currently used)
