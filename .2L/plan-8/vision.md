# Project Vision: UI Audit & Dark Mode Fix

**Created:** 2025-12-02T01:50:00+02:00
**Plan:** plan-8

---

## Problem Statement

The Wealth app has dark mode contrast issues that make text unreadable, and the landing page fails to showcase the app's most powerful feature: the AI financial assistant.

**Current pain points:**
- Page titles and section headers are nearly invisible in dark mode (e.g., "Account" page title barely visible)
- Secondary text using `text-muted-foreground` has insufficient contrast against dark backgrounds
- The landing page only shows basic features (Accounts, Transactions, Budgets, Goals) while hiding the AI chat, bank sync, file imports, and other advanced capabilities
- Inconsistent dark mode implementation across dashboard components

---

## Target Users

**Primary user:** Existing and prospective Wealth app users
- Users who prefer dark mode (common for financial apps used at night)
- New visitors evaluating the app's capabilities on the landing page

---

## Core Value Proposition

Fix accessibility issues in dark mode and create a landing page that accurately represents the app's AI-powered financial management capabilities.

**Key benefits:**
1. Readable UI in dark mode (WCAG AA compliance)
2. Landing page that showcases the AI assistant differentiator
3. Consistent visual experience across all pages and themes

---

## Feature Breakdown

### Must-Have (MVP)

1. **Fix Dark Mode Contrast Issues**
   - Description: Update all components with insufficient text contrast in dark mode
   - User story: As a user in dark mode, I want to read all text clearly so that I can use the app comfortably
   - Acceptance criteria:
     - [ ] All page titles visible in dark mode
     - [ ] All section headers readable
     - [ ] All secondary/muted text has sufficient contrast (WCAG AA: 4.5:1 ratio)
     - [ ] Chat interface timestamps and helper text readable

   **Specific files to fix:**
   - `src/components/dashboard/NetWorthCard.tsx` - muted-foreground on icons/text
   - `src/components/dashboard/TopCategoriesCard.tsx` - category labels and empty state
   - `src/components/dashboard/FinancialHealthIndicator.tsx` - sync status text
   - `src/components/dashboard/RecentTransactionsCard.tsx` - timestamp text
   - `src/components/dashboard/BudgetAlertsCard.tsx` - alert text
   - `src/components/chat/ChatMessage.tsx` - timestamp contrast
   - `src/components/chat/ChatInput.tsx` - helper text
   - Any page using `text-muted-foreground` without dark mode override

2. **Update Landing Page with AI Feature**
   - Description: Add prominent section showcasing the AI financial assistant
   - User story: As a prospective user, I want to see the AI capabilities so that I understand what makes this app special
   - Acceptance criteria:
     - [ ] New "AI Assistant" feature card/section on landing page
     - [ ] Clear explanation of what users can do with AI (query finances, import files, auto-categorize)
     - [ ] Visual distinction (different icon, possibly highlighted as "New" or "Powered by Claude")
     - [ ] Maintains visual consistency with existing design

3. **Global CSS Fix for muted-foreground**
   - Description: Update the dark mode CSS variable for `--muted-foreground` to ensure sufficient contrast
   - User story: As a developer, I want the design system to have proper dark mode defaults so new components are accessible by default
   - Acceptance criteria:
     - [ ] `--muted-foreground` in dark mode updated from `24 4% 66%` to `24 6% 75%` or lighter
     - [ ] Existing uses of `text-muted-foreground` become readable without per-component overrides
     - [ ] No regression in light mode appearance

### Should-Have (Post-MVP)

1. **Showcase Additional Features on Landing Page** - Add bank sync, file import, recurring transactions to feature list
2. **Dark Mode Toggle Preview** - Show both light/dark screenshots on landing page
3. **Testimonials/Social Proof Section** - Add credibility elements

### Could-Have (Future)

1. **Interactive Demo** - Let visitors try the AI chat without signing up
2. **Feature Comparison Table** - Show Wealth vs other finance apps
3. **Animated Hero Section** - Subtle animations for visual appeal

---

## User Flows

### Flow 1: Dark Mode Usage

**Steps:**
1. User enables dark mode (system preference or manual toggle)
2. System applies dark theme CSS variables
3. User navigates through dashboard, accounts, transactions pages
4. All text remains clearly readable

**Edge cases:**
- System preference changes while app is open: Theme updates automatically
- Mixed content (charts, images): Ensure they also work in dark mode

**Error handling:**
- If theme detection fails: Default to light mode

### Flow 2: Landing Page Conversion

**Steps:**
1. New visitor lands on homepage
2. User sees hero section with value proposition
3. User scrolls to features section
4. User sees AI Assistant prominently featured
5. User clicks "Get Started" to sign up

**Edge cases:**
- Mobile viewport: Features stack vertically, AI still prominent
- Dark mode on landing: All sections readable

---

## Technical Requirements

**Must support:**
- WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Both light and dark mode without manual per-component overrides
- Responsive design (mobile, tablet, desktop)

**Constraints:**
- Must use existing Tailwind + CSS variable system
- No new dependencies required
- Changes should be backward compatible

**Approach:**
- Fix `--muted-foreground` CSS variable in globals.css for dark mode
- Add explicit `dark:text-warm-gray-300` overrides where muted-foreground alone isn't enough
- Pattern: `text-warm-gray-600 dark:text-warm-gray-300` for secondary text

---

## AI Capabilities to Highlight on Landing Page

Based on codebase analysis, the AI assistant can:

**Query Tools (Read):**
- Get transaction history with filters
- View spending summaries by category
- Check budget status vs actual spending
- See account balances and net worth
- Search transactions by payee

**Action Tools (Write):**
- Parse bank statements (PDF, CSV, Excel)
- Create individual transactions via chat
- Batch import transactions (up to 100)
- Update existing transactions
- Auto-categorize transactions with AI

**Smart Features:**
- Credit card bill detection (prevents double-counting)
- Duplicate transaction detection (±7 day window)
- Confidence-based categorization
- Natural language queries ("How much did I spend on food last month?")

---

## Success Criteria

**The MVP is successful when:**

1. **Dark mode readability**
   - Metric: Visual inspection of all dashboard pages in dark mode
   - Target: All text visible without squinting, no "invisible" text

2. **Contrast compliance**
   - Metric: Lighthouse accessibility audit
   - Target: No contrast ratio failures

3. **Landing page AI visibility**
   - Metric: AI feature is above the fold on desktop, within first scroll on mobile
   - Target: New section exists and is visually prominent

---

## Out of Scope

**Explicitly not included in MVP:**
- Complete landing page redesign (only adding AI section)
- New color palette or design system changes
- Animation improvements
- Performance optimization
- New component creation beyond landing page updates

**Why:** Focused scope ensures we fix the critical accessibility issues and marketing gap without scope creep.

---

## Files to Modify

### Dark Mode Fixes
```
src/app/globals.css                              # Update --muted-foreground dark value
src/components/dashboard/NetWorthCard.tsx        # 3 instances
src/components/dashboard/TopCategoriesCard.tsx   # 4 instances
src/components/dashboard/FinancialHealthIndicator.tsx  # 2 instances
src/components/dashboard/RecentTransactionsCard.tsx    # 1 instance
src/components/dashboard/BudgetAlertsCard.tsx    # 1 instance
src/components/chat/ChatMessage.tsx              # 1 instance
src/components/chat/ChatInput.tsx                # 1 instance
```

### Landing Page
```
src/app/page.tsx                                 # Add AI feature section
```

---

## Assumptions

1. The current warm/mindful design aesthetic should be preserved
2. Fixing CSS variables globally won't break existing light mode appearance
3. Adding an AI section to landing page fits within current layout structure

---

## Open Questions

1. Should the AI feature be the FIRST feature card (most prominent) or integrated into existing order?
2. Do we want a "Powered by Claude" badge or keep it generic "AI Assistant"?

---

## Estimated Complexity

**Single iteration** - This is a focused CSS fix + landing page update:
- Dark mode fixes: ~1 hour (pattern replacement across 7-8 files)
- Landing page AI section: ~30 minutes (new feature card)
- Testing: ~30 minutes (visual verification in both themes)

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
