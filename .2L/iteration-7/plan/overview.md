# 2L Iteration Plan - User Management & Data Exports

## Project Vision

Add comprehensive user management and data export capabilities to the Wealth application, enabling users to:
- Manage their profile and preferences
- Switch between light/dark themes
- Export all financial data in CSV or JSON formats
- Securely delete their account with proper safeguards

This iteration focuses on user empowerment and data portability while maintaining the application's security and design consistency.

## Success Criteria

Specific, measurable criteria for MVP completion:
- [ ] User can update profile (name, currency, timezone) via account settings page
- [ ] User can toggle theme between light/dark/system modes
- [ ] Theme preference persists across browser sessions (localStorage)
- [ ] User can export CSV files for transactions, budgets, goals, and accounts
- [ ] User can export complete data backup as JSON
- [ ] User can delete account with multi-step confirmation (type email + checkbox)
- [ ] Account deletion removes all user data from both Prisma and Supabase Auth
- [ ] All UI components render correctly in both light and dark modes
- [ ] Export files open correctly in Excel and Google Sheets (UTF-8 encoding)
- [ ] Settings page has clear navigation structure with sections
- [ ] All forms have proper validation and error handling
- [ ] Dark mode meets WCAG AA contrast standards (4.5:1 minimum)

## MVP Scope

**In Scope:**
- Account settings page with profile management (name, currency, timezone)
- Theme switcher component (light/dark/system) using next-themes
- CSV export for transactions (existing), budgets, goals, accounts (new)
- JSON export for complete data backup
- Export buttons on all list pages
- Account deletion with email confirmation + checkbox safeguard
- Supabase Auth admin integration for user deletion
- Dark mode CSS variables and styling
- Settings hub page reorganization with new sections

**Out of Scope (Post-MVP):**
- Profile image file upload (URL input only for now)
- Email address change (handled by Supabase hosted UI)
- Password change (handled by Supabase magic links)
- Currency conversion rates (display preference only)
- PDF export format (CSV + JSON sufficient)
- Excel format export (CSV compatible)
- Theme preference sync to database (localStorage only)
- Account recovery/soft delete (hard delete only)
- Export pagination/streaming (10k row limit)
- Audit logging (future compliance enhancement)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 3 hours (single builder, sequential tasks)
4. **Integration** - 15 minutes (theme testing across pages)
5. **Validation** - 30 minutes (manual testing checklist)
6. **Deployment** - Final

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: 3-3.5 hours (single builder)
  - Theme system: 30 minutes
  - Export system: 60 minutes
  - Settings page + profile: 50 minutes
  - Account deletion: 45 minutes
  - Polish/bug fixes: 15-30 minutes
- Integration: 15 minutes (dark mode verification)
- Validation: 30 minutes (testing checklist)
- Total: ~4-4.5 hours

## Risk Assessment

### High Risks

**Partial Account Deletion (Prisma succeeds, Supabase fails)**
- Impact: HIGH - User data deleted but auth remains orphaned
- Likelihood: LOW - Network/permissions issue
- Mitigation: Delete Prisma first (cascade handles relations), then Supabase. If Supabase fails, user can still sign in and retry. Log failures for manual cleanup. Acceptable failure mode since user data already removed.

**Accidental Account Deletion**
- Impact: HIGH - Permanent data loss
- Likelihood: MEDIUM - Users may skim warnings
- Mitigation: Multi-step confirmation (type email to confirm + "I understand" checkbox + data preview showing X transactions/budgets/goals). Red danger styling throughout. Disable delete button until all confirmations met.

### Medium Risks

**Dark Mode Accessibility Issues**
- Impact: MEDIUM - App unusable for visually impaired users
- Likelihood: MEDIUM - Easy to miss contrast issues
- Mitigation: Use WebAIM contrast checker on all color combinations. Test with browser DevTools accessibility panel. Ensure foreground/background has 7:1 ratio. Follow Tailwind dark mode best practices with sage palette variants.

**CSV Export Encoding Issues**
- Impact: LOW-MEDIUM - Files corrupted in Excel
- Likelihood: MEDIUM - Users have diverse data (emoji, accents)
- Mitigation: Add UTF-8 BOM prefix (`\uFEFF`) for Excel compatibility. Proper quote escaping (replace `"` with `""`). Test on Windows Excel, Mac Excel, and Google Sheets.

**Large Export File Sizes**
- Impact: MEDIUM - Browser memory issues
- Likelihood: LOW - Most users have <1k transactions
- Mitigation: Hard limit exports to 10,000 rows. Show warning at 5,000+ rows. Encourage date range filtering. Return error if limit exceeded.

### Low Risks

**Theme Flash on Initial Load**
- Impact: LOW - Brief visual glitch
- Likelihood: LOW - next-themes handles this
- Mitigation: next-themes injects blocking script before paint. Set defaultTheme="system". Test with slow 3G throttling and Incognito mode.

## Integration Strategy

**Single Builder Approach:**
This iteration uses ONE builder for all features due to tight coupling:
- Settings page integrates profile, theme, exports, and deletion
- All features share the same UI patterns and navigation
- No parallel work opportunities (sequential dependencies)
- Easier integration testing with single owner

**Sequential Implementation Order:**
1. Theme system first (other features need dark mode for testing)
2. Settings page structure (foundation for all sections)
3. Profile management (simple form, establishes pattern)
4. Export system (extends existing CSV pattern)
5. Account deletion last (most complex, least rushed)

**Integration Points:**
- Theme: Wraps entire app in ThemeProvider, affects all pages
- Exports: Buttons added to existing list pages (transactions, budgets, goals, accounts)
- Settings: New /settings/account route linked from settings hub
- Deletion: DangerZone component integrated into account settings

**Conflict Prevention:**
- Single builder = no merge conflicts
- All new files (minimal modifications to existing code)
- Existing patterns followed religiously (forms, mutations, dialogs)

## Deployment Plan

**Environment Variables Required:**
```bash
SUPABASE_SERVICE_ROLE_KEY=<admin_key>  # For auth user deletion (server-side only)
```

**Deployment Steps:**
1. Install next-themes dependency: `npm install next-themes`
2. Verify Supabase service role key in environment
3. Build production: `npm run build`
4. Test theme switching (light/dark/system)
5. Test CSV/JSON exports on production data
6. Test account deletion flow (use test account)
7. Verify dark mode on all pages
8. Deploy to production

**Rollback Plan:**
- Theme system: Remove ThemeProvider wrapper, revert to light-only
- Exports: Remove export buttons from pages
- Settings: Remove /settings/account route
- Deletion: Disable DangerZone component

**Post-Deployment Verification:**
- [ ] Theme toggle works and persists
- [ ] Export downloads trigger correctly
- [ ] CSV files open in Excel without corruption
- [ ] JSON files are valid and complete
- [ ] Account deletion removes all data
- [ ] Dark mode renders correctly on all pages
- [ ] Mobile responsive (all new UI)

**Monitoring:**
- Watch for Supabase auth deletion errors (log review)
- Monitor export endpoint performance (10k row limit)
- Check for theme flash reports (SSR issue indicator)
- Track account deletion attempts (expected to be rare)

## Success Metrics

**Quantitative:**
- 8 working export endpoints (4 data types × 2 formats)
- 100% of user data deleted on account deletion
- 0 theme flashes on page load
- <500ms export generation time (up to 10k rows)
- ≥4.5:1 contrast ratio for all dark mode text

**Qualitative:**
- Export buttons feel consistent across all pages
- Deletion flow feels safe and deliberate (not scary)
- Theme switch is instant with no visual artifacts
- Settings page is well-organized and discoverable
- Forms have helpful validation messages
- Dark mode maintains brand identity (sage palette)

**User Value:**
- Data portability (GDPR compliance)
- Accessibility (dark mode for low-vision users)
- Account control (delete when desired)
- Professional appearance (theme choice)
- Backup capability (JSON export)
