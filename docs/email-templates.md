# Email Templates Customization Guide

Comprehensive guide for customizing and maintaining email templates in Wealth app.

## Overview

Wealth uses custom HTML email templates for authentication flows:
- **Signup verification** - Welcome new users and verify email addresses
- **Password reset** - Allow users to securely reset forgotten passwords

Templates are designed with brand consistency, cross-client compatibility, and user experience in mind.

## Brand Design System

### Color Palette

Templates use Wealth's brand colors from `src/app/globals.css`:

```css
/* Primary Colors */
--sage-600: #059669        /* CTA buttons, links */
--sage-500: #388e6c        /* Hover states */

/* Warm Neutrals */
--warm-gray-50: #faf9f8    /* Email background */
--warm-gray-100: #f5f3f1   /* Card background alternative */
--warm-gray-200: #e8e6e3   /* Borders, dividers */
--warm-gray-500: #78716c   /* Muted text, footer */
--warm-gray-600: #5e5651   /* Body text */
--warm-gray-800: #1f1c1a   /* Headings */
```

### Typography

**Font Stacks:**
- **Headings**: `'Crimson Pro', Georgia, serif`
- **Body**: `Inter, Arial, Helvetica, sans-serif`

**Font Sizes:**
- Logo: 28px
- Heading (h2): 24px
- Body: 16px
- Footer: 14px

**Line Height:**
- Body: 1.6 (optimal readability)

**Font Weight:**
- Logo: 700 (bold)
- Heading: 700 (bold)
- Body: 400 (regular)
- Button: 600 (semi-bold)

### Spacing

- **Email padding**: 40px top/bottom, 20px left/right
- **Content max-width**: 600px (optimal email width)
- **Section padding**: 32px (body content)
- **Header/footer padding**: 32px horizontal, 24px vertical
- **Paragraph margin**: 24px bottom
- **Button padding**: 14px vertical, 28px horizontal

### Components

**Button Style:**
```css
border-radius: 8px;
background-color: #059669;
color: #ffffff;
padding: 14px 28px;
font-weight: 600;
font-size: 16px;
```

**Border Style:**
```css
border: 1px solid #e8e6e3;
```

**Shadow Style:**
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
```

## Email Client Compatibility

### Cross-Client Challenges

Email clients have inconsistent CSS support:

| Feature | Gmail | Outlook | Apple Mail |
|---------|-------|---------|------------|
| Inline CSS | ✓ Full | ✓ Full | ✓ Full |
| Flexbox | ✗ None | ✗ None | ✓ Full |
| CSS Grid | ✗ None | ✗ None | ✓ Full |
| Media Queries | ⚠️ Limited | ✗ None | ✓ Full |
| Web Fonts | ⚠️ Limited | ✗ None | ✓ Full |
| Border Radius | ✓ Full | ⚠️ Limited | ✓ Full |

### Best Practices

**1. Table-Based Layout**

Always use tables for layout (not div + CSS):

```html
<!-- ✓ GOOD: Table-based -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 32px;">
      Content here
    </td>
  </tr>
</table>

<!-- ✗ BAD: Div-based (breaks in Outlook) -->
<div style="display: flex; padding: 32px;">
  Content here
</div>
```

**2. Inline CSS Only**

Never use `<style>` tags or external stylesheets:

```html
<!-- ✓ GOOD: Inline styles -->
<p style="margin: 0; font-size: 16px; color: #5e5651;">
  Body text
</p>

<!-- ✗ BAD: Style tag (stripped by Gmail) -->
<style>
  p { margin: 0; font-size: 16px; }
</style>
<p>Body text</p>
```

**3. Reset Table Styles**

Always reset default table spacing:

```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <!-- Prevents unwanted gaps in Outlook -->
</table>
```

**4. Button as Table**

Nest buttons inside tables for Outlook compatibility:

```html
<!-- ✓ GOOD: Button as nested table -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius: 8px; background-color: #059669;">
      <a href="#" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none;">
        Click Here
      </a>
    </td>
  </tr>
</table>

<!-- ✗ BAD: Button as link only (no background in Outlook) -->
<a href="#" style="background-color: #059669; padding: 14px 28px;">
  Click Here
</a>
```

**5. Font Fallbacks**

Always provide fallback fonts:

```css
font-family: 'Crimson Pro', Georgia, serif;  /* Serif with fallback */
font-family: Inter, Arial, Helvetica, sans-serif;  /* Sans with fallback */
```

Web fonts may not load in many email clients.

**6. Max Width**

Limit content width for readability:

```html
<table style="max-width: 600px; margin: 0 auto;">
  <!-- Centered 600px container -->
</table>
```

**7. Word Break for URLs**

Prevent overflow on long URLs:

```css
word-break: break-all;  /* For fallback links */
```

## Template Structure

### Anatomy of a Template

```
├── DOCTYPE + HTML wrapper
│   └── Body (background color)
│       └── Outer table (full width)
│           └── Inner table (max-width: 600px)
│               ├── Header row (logo)
│               ├── Body row (main content)
│               │   ├── Heading
│               │   ├── Paragraph
│               │   ├── CTA button (nested table)
│               │   └── Fallback link
│               └── Footer row (disclaimer)
```

### Header Section

```html
<tr>
  <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e8e6e3;">
    <h1 style="margin: 0; font-family: 'Crimson Pro', Georgia, serif; font-size: 28px; color: #059669; font-weight: 700;">
      Wealth
    </h1>
  </td>
</tr>
```

**Customization:**
- Replace "Wealth" with logo image (when available)
- Keep text fallback for accessibility
- Maintain border-bottom for visual separation

### Body Section

```html
<tr>
  <td style="padding: 32px;">
    <h2 style="margin: 0 0 16px; font-family: 'Crimson Pro', Georgia, serif; font-size: 24px; color: #1f1c1a; font-weight: 700;">
      Main Heading
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5e5651;">
      Body text with clear call to action.
    </p>

    <!-- Button here -->

    <!-- Fallback link here -->
  </td>
</tr>
```

**Customization:**
- Update heading text for different email types
- Adjust body copy for tone and length
- Keep paragraph margin for readability

### CTA Button

```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius: 8px; background-color: #059669;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
        Button Text
      </a>
    </td>
  </tr>
</table>
```

**Customization:**
- Change button text for different actions
- Keep padding for touch target (min 44x44px)
- Maintain color contrast for accessibility

### Footer Section

```html
<tr>
  <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e8e6e3; font-size: 14px; color: #78716c;">
    <p style="margin: 0;">Expiration time here.</p>
    <p style="margin: 8px 0 0;">Disclaimer or help text.</p>
  </td>
</tr>
```

**Customization:**
- Update expiration time (24 hours, 1 hour, etc.)
- Add support contact info if needed
- Keep font size small (14px) for hierarchy

## Supabase Template Variables

Supabase uses Go template syntax for dynamic content:

### Available Variables

**Authentication Emails:**
- `{{ .ConfirmationURL }}` - Full URL with token (required)
- `{{ .Token }}` - Token only (not recommended, use full URL)
- `{{ .TokenHash }}` - Hashed token (not typically needed)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Base site URL from dashboard config
- `{{ .RedirectTo }}` - Custom redirect URL (if provided)

**Magic Link Emails:**
- `{{ .ConfirmationURL }}` - Magic link URL
- All authentication variables also available

### Variable Usage

**Full verification link (recommended):**
```html
<a href="{{ .ConfirmationURL }}">Verify Email</a>
```

**Personalization (optional):**
```html
<p>Hi {{ .Email }},</p>
<p>Click below to verify your account.</p>
```

**Fallback link:**
```html
<p style="word-break: break-all;">{{ .ConfirmationURL }}</p>
```

### Variable Escaping

Supabase auto-escapes all template variables to prevent XSS:

```html
<!-- SAFE: Variables are HTML-escaped -->
<a href="{{ .ConfirmationURL }}">Link</a>
<p>{{ .Email }}</p>
```

No manual escaping needed.

## Customization Scenarios

### Scenario 1: Update Brand Colors

**Steps:**
1. Open template file
2. Find all color values
3. Replace with new hex codes
4. Test locally with Inbucket
5. Upload to Supabase dashboard

**Example:**
```html
<!-- Before -->
<td style="background-color: #059669;">

<!-- After (new brand color) -->
<td style="background-color: #1a73e8;">
```

### Scenario 2: Add Logo Image

**Steps:**
1. Host logo on CDN (recommended) or convert to base64
2. Replace text header with `<img>` tag
3. Add alt text for accessibility
4. Set width/height for consistency

**Example:**
```html
<!-- Replace text logo -->
<h1>Wealth</h1>

<!-- With image logo -->
<img src="https://cdn.example.com/logo.png"
     alt="Wealth"
     width="120"
     height="40"
     style="display: block; margin: 0 auto;" />
```

**Considerations:**
- Some email clients block images by default
- Always include alt text
- Use absolute URLs (no relative paths)
- Keep file size < 50KB for performance

### Scenario 3: Change Button Text

**Steps:**
1. Locate button anchor tag
2. Update text between `<a>` tags
3. Keep styling intact

**Example:**
```html
<!-- Confirmation email -->
<a href="{{ .ConfirmationURL }}" style="...">
  Verify Email
</a>

<!-- Alternative text -->
<a href="{{ .ConfirmationURL }}" style="...">
  Activate Account
</a>
```

### Scenario 4: Add Additional Content

**Steps:**
1. Add new table row in body section
2. Maintain spacing with padding/margin
3. Use consistent typography styles

**Example:**
```html
<!-- Add after main paragraph -->
<p style="margin: 24px 0 0; font-size: 14px; color: #78716c;">
  Need help? Contact us at support@example.com
</p>
```

### Scenario 5: Adjust Spacing

**Steps:**
1. Locate padding/margin values
2. Adjust for tighter/looser layout
3. Test across email clients

**Example:**
```html
<!-- Tighter spacing -->
<td style="padding: 24px;">  <!-- Was 32px -->

<!-- Looser spacing -->
<p style="margin: 0 0 32px;">  <!-- Was 24px -->
```

## Testing Workflow

### Local Testing Process

1. **Update template file**
   ```bash
   vim supabase/templates/confirmation.html
   ```

2. **Restart Supabase**
   ```bash
   npm run db:local:restart
   ```

3. **Trigger email**
   - Navigate to: http://localhost:3000/signup
   - Enter test email: `test@example.com`
   - Submit form

4. **View in Inbucket**
   - Open: http://localhost:54424
   - Click email to test@example.com
   - Inspect rendering

5. **Iterate**
   - Note any issues
   - Update template
   - Restart Supabase
   - Test again

### Production Testing Process

1. **Upload to dashboard**
   - Copy template HTML
   - Paste in Supabase dashboard
   - Save

2. **Trigger test email**
   - Signup with test account
   - Check inbox

3. **Test across clients**
   - Gmail desktop
   - Gmail mobile
   - Outlook web
   - Apple Mail (if available)

4. **Verify functionality**
   - Click button
   - Verify redirect
   - Confirm action completes

### Email Client Testing Matrix

| Client | Rendering | Button | Links | Font | Color |
|--------|-----------|--------|-------|------|-------|
| Gmail Desktop | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gmail Mobile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Outlook Web | ⚠️ | ⚠️ | ✓ | ⚠️ | ✓ |
| Outlook Desktop | ⚠️ | ⚠️ | ✓ | ✗ | ⚠️ |
| Apple Mail | ✓ | ✓ | ✓ | ✓ | ✓ |
| Yahoo Mail | ✓ | ✓ | ✓ | ✓ | ✓ |

✓ = Full support | ⚠️ = Partial support | ✗ = No support

## Troubleshooting

### Button Not Clickable in Outlook

**Issue:** Button appears as text, not styled button

**Solution:**
```html
<!-- Ensure button is nested in table with background -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius: 8px; background-color: #059669;">
      <a href="#" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none;">
        Click Here
      </a>
    </td>
  </tr>
</table>
```

### Colors Not Showing in Outlook

**Issue:** Background colors missing or wrong

**Solution:**
- Use hex codes, not RGB/HSL: `#059669` not `rgb(5, 150, 105)`
- Apply color to `<td>`, not `<tr>` or `<table>`
- Avoid gradients (not supported)

### Font Not Loading

**Issue:** Custom font (Inter, Crimson Pro) not rendering

**Solution:**
- Normal behavior in most email clients
- Ensure fallback fonts specified:
  ```css
  font-family: 'Crimson Pro', Georgia, serif;
  ```
- Georgia and Arial are widely supported fallbacks

### Layout Broken in Gmail Mobile

**Issue:** Content overflows or truncated

**Solution:**
- Use `max-width: 600px`, not fixed `width: 600px`
- Allow table to shrink: `width="100%"`
- Test viewport scaling: `<meta name="viewport" content="width=device-width">`

### Link Underline Shows

**Issue:** Links have default blue underline

**Solution:**
```css
text-decoration: none;  /* Remove underline */
color: #ffffff;  /* Override blue default */
```

### Spacing Inconsistent

**Issue:** Extra gaps between elements in Outlook

**Solution:**
- Reset table styles: `cellspacing="0" cellpadding="0" border="0"`
- Use explicit padding on `<td>`, not margin on children
- Avoid nested margins (use padding instead)

## Advanced Customization

### Conditional Content

Show different content based on conditions:

```html
<!-- Note: Supabase doesn't support full Go template conditionals in email templates -->
<!-- Use separate templates instead -->
```

### Dark Mode Support (Future)

Prepare for dark mode email clients:

```html
<style>
  /* Dark mode media query (limited support) */
  @media (prefers-color-scheme: dark) {
    .dark-mode-bg { background-color: #1a1a1a !important; }
    .dark-mode-text { color: #ffffff !important; }
  }
</style>

<!-- Apply classes -->
<td class="dark-mode-bg dark-mode-text">
  Content
</td>
```

**Note:** Dark mode support in email is very limited as of 2024.

### Internationalization (Future)

For multi-language support:

1. Create separate templates per language
2. Store in subdirectories: `templates/en/`, `templates/es/`
3. Configure Supabase to use correct template based on user locale
4. Translate all text content, keep HTML structure identical

### A/B Testing

To test email variations:

1. Upload variant templates with different names
2. Manually switch in Supabase dashboard
3. Track conversion rates (verification click-through)
4. Choose best-performing template

**Metrics to track:**
- Email open rate (if tracking enabled)
- Verification click-through rate
- Time to verification
- Bounce rate

## Maintenance

### Regular Updates

**Quarterly:**
- Review email client support changes
- Test templates in latest email clients
- Update fallback strategies if needed

**Annually:**
- Refresh brand colors if rebranding
- Update logo/imagery
- Review copy for tone consistency

### Version Control

**Best practices:**
- Commit all template changes to git
- Tag major template updates: `v1.0.0`, `v2.0.0`
- Document changes in commit messages
- Keep production and git in sync

### Documentation

**Maintain:**
- This guide (update with new learnings)
- Supabase template upload process
- Email client testing results
- Known issues and workarounds

## Resources

### Email Design Tools

- **Litmus** - Cross-client testing (paid)
- **Email on Acid** - Testing and analytics (paid)
- **Really Good Emails** - Inspiration gallery (free)
- **Can I email** - CSS support reference (free)

### Testing Tools

- **Inbucket** - Local email testing (built into Supabase)
- **MailHog** - Alternative local SMTP server
- **Mailtrap** - Staging email testing (free tier)

### References

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [HTML Email Best Practices](https://www.campaignmonitor.com/css/)
- [Can I email](https://www.caniemail.com/) - CSS support matrix

## Support

For questions or issues:
- Review this guide thoroughly
- Test locally with Inbucket first
- Check Supabase logs for delivery errors
- Verify template variables spelled correctly
- Consult email client compatibility matrix

## Changelog

**Version 1.0.0** (2024-11-01)
- Initial email templates created
- Confirmation and password reset templates
- Brand colors from Wealth design system
- Cross-client compatibility validated
