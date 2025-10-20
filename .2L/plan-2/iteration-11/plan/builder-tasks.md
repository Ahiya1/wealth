# Builder Task Breakdown

## Overview

**4 primary builders** will work on Iteration 11 (Production-Ready Foundation).

**Estimated Total Time:** 12-16 hours (parallel execution)

**Builder Execution Strategy:**
- **Builder 1 MUST complete first** (creates foundation for all others)
- **Builders 2, 3, 4 can run in parallel** after Builder 1 completes

**Complexity Distribution:**
- Builder 1: MEDIUM (3-4 hours) - Foundation, affects everything
- Builder 2: HIGH (4-5 hours) - Complex components (gradients, SVG)
- Builder 3: MEDIUM (3-4 hours) - Systematic pattern application
- Builder 4: LOW-MEDIUM (3-4 hours) - Clear pattern, many files

---

## Builder-1: UI Primitives & Dark Mode Foundation

### Scope

Fix the foundation layer that all other components depend on. This includes:
1. Fix 5 broken UI primitives (AlertDialog, Breadcrumb, EmptyState, StatCard, ProgressRing)
2. Verify 13 semantic token primitives work correctly in dark mode
3. Test dark mode cascade effect (should fix 60-70% of app automatically)

**Why This Builder Goes First:**
- Card, Input, Dialog, Button, etc. are used throughout the app
- Fixing these automatically fixes ~60-70 dependent components
- Creates foundation for Builders 2 & 3

### Complexity Estimate

**MEDIUM**

Rationale:
- Small number of files (18 total)
- Clear patterns to follow
- But high impact (affects entire app)
- Requires careful testing

### Success Criteria

- [ ] AlertDialog overlay uses semantic token (bg-background/80 not bg-black/80)
- [ ] Breadcrumb uses warm-gray palette with dark: variants
- [ ] EmptyState uses warm-gray palette with dark: variants
- [ ] StatCard uses warm-gray/sage palette with dark: variants
- [ ] ProgressRing SVG strokes have dark: variants
- [ ] All 13 semantic token primitives tested in both themes (visual QA)
- [ ] Card component inherits correctly throughout app (spot check 5-10 pages)
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds

### Files to Create/Modify

**Fix These 5 Broken Primitives:**

1. `/src/components/ui/alert-dialog.tsx`
   - Line ~35: Change `bg-black/80` to `bg-background/80`
   - Purpose: Overlay background should use semantic token

2. `/src/components/ui/breadcrumb.tsx`
   - Add dark: variants to `text-warm-gray-600` → `dark:text-warm-gray-400`
   - Add dark: variants to `text-sage-600` → `dark:text-sage-400`
   - Purpose: Breadcrumb text legible in dark mode

3. `/src/components/ui/empty-state.tsx`
   - Add dark: variants to all `text-warm-gray-*` classes
   - Pattern: `text-warm-gray-600 dark:text-warm-gray-400`
   - Purpose: Empty state messages legible in dark mode

4. `/src/components/ui/stat-card.tsx`
   - Add dark: variants to `bg-sage-100` → `dark:bg-sage-800`
   - Add dark: variants to `text-sage-700` → `dark:text-sage-300`
   - Add dark: variants to `text-warm-gray-600` → `dark:text-warm-gray-400`
   - Add rounded-warmth to elevated variant
   - Purpose: Stat cards work in dark mode with warmth styling

5. `/src/components/ui/progress-ring.tsx`
   - Add dark: variants to SVG stroke colors
   - Pattern: `stroke-warm-gray-200 dark:stroke-warm-gray-700`
   - Pattern: `stroke-sage-500 dark:stroke-sage-400`
   - Purpose: Progress rings visible in dark mode

**Verify These 13 Working Primitives (Visual QA Only):**

6. `/src/components/ui/button.tsx` ✅ (already uses semantic tokens)
7. `/src/components/ui/card.tsx` ✅ (already uses semantic tokens)
8. `/src/components/ui/input.tsx` ✅ (already uses semantic tokens)
9. `/src/components/ui/textarea.tsx` ✅ (already uses semantic tokens)
10. `/src/components/ui/select.tsx` ✅ (already uses semantic tokens)
11. `/src/components/ui/dialog.tsx` ✅ (already uses semantic tokens)
12. `/src/components/ui/popover.tsx` ✅ (already uses semantic tokens)
13. `/src/components/ui/dropdown-menu.tsx` ✅ (already uses semantic tokens)
14. `/src/components/ui/toast.tsx` ✅ (already uses semantic tokens)
15. `/src/components/ui/tabs.tsx` ✅ (already uses semantic tokens)
16. `/src/components/ui/badge.tsx` ✅ (already uses semantic tokens)
17. `/src/components/ui/skeleton.tsx` ✅ (already uses semantic tokens)
18. `/src/components/ui/label.tsx` ✅ (inherits from parent)

**Check If Present (If Not, Skip):**
- `/src/components/ui/separator.tsx` (likely uses bg-border, should work)
- `/src/components/ui/progress.tsx` (check if exists, add dark: variants if needed)
- `/src/components/ui/checkbox.tsx` (likely uses semantic tokens)
- `/src/components/ui/calendar.tsx` (likely uses semantic tokens)

### Dependencies

**Depends on:** None (this is the foundation)

**Blocks:** Builder 2 and Builder 3 (wait for this to complete before starting)

### Implementation Notes

**Critical Pattern:**
- Prefer semantic tokens FIRST: `bg-background`, `text-foreground`, `border-border`
- Only use custom colors when semantic tokens don't fit (brand colors, conditional states)
- Always add dark: variants to custom colors

**Testing Approach:**
1. After fixing each primitive, toggle theme switch and verify visually
2. Test in isolation (create test page with just that component)
3. Test in context (check 2-3 pages that use the component)

**Gotchas:**
- AlertDialog overlay: Must use semantic token or entire app overlay is wrong
- Card component is CRITICAL - used in 80+ places
- StatCard elevated variant needs rounded-warmth (0.75rem not 0.5rem)

### Patterns to Follow

**From patterns.md:**
- Dark Mode Pattern 1: Prefer semantic tokens
- Dark Mode Pattern 2: Custom colors with dark: variants
- Dark Mode Pattern 4: SVG strokes with dark: variants
- Visual Warmth Pattern 1: Shadow-border pattern (add to Card if not present)

### Testing Requirements

**Unit Testing (Visual QA):**
- [ ] Open `/dashboard` in light mode - all cards visible
- [ ] Toggle to dark mode - all cards still visible
- [ ] Open `/signin` - form looks good in both modes
- [ ] Open `/transactions` - list and cards work in both modes
- [ ] Check AlertDialog in both modes (trigger a delete confirmation)

**Integration Testing:**
- [ ] Run `npm run type-check` - 0 errors
- [ ] Run `npm run build` - succeeds
- [ ] No console warnings about hydration

**Coverage Target:** 100% of 18 files tested in both themes

### Potential Split Strategy

**If complexity proves too high:**

This task should NOT need splitting. It's only 5 files to fix + 13 to verify.

**If you must split:**

**Foundation (Primary Builder):**
- Fix AlertDialog (critical - affects entire app)
- Fix Card component (critical - affects 80+ components)
- Verify Button, Input, Dialog (most used)

**Sub-builder 1A:**
- Fix Breadcrumb, EmptyState, StatCard
- Verify remaining primitives

**Sub-builder 1B:**
- Fix ProgressRing
- Check optional components (Separator, Progress, Checkbox, Calendar)

**Estimate if split:** 2 hours primary + 1 hour per sub-builder = 4 hours total (NOT recommended, just do it in sequence)

### Risk Level

**MEDIUM**

**Why:**
- Small number of files (manageable)
- But high impact (affects entire app)
- If done wrong, breaks everything

**Mitigation:**
- Test each component immediately after modification
- Incremental commits (can rollback each component separately)
- Visual QA in both themes after each file

---

## Builder-2: Dashboard & High-Visibility Components

### Scope

Fix dark mode and add visual warmth to the highest-visibility components:
1. Dashboard components (8 files) - users see immediately on login
2. Auth pages (3 files) - critical first impression for new users

**Total:** 11 files with ~150-200 dark: variants to add

**Why This Builder:**
- These pages represent 70% of user visibility
- Dashboard is landing page after login
- Auth is first impression for new users
- Complex components (gradients, SVG, 30+ color classes)

### Complexity Estimate

**HIGH**

Rationale:
- DashboardSidebar: 30+ color classes (most complex in entire app)
- AffirmationCard: Complex gradient needs careful dark mode testing
- FinancialHealthIndicator: SVG gauge + gradient background
- Auth forms: 7 styling issues across 3 files (errors, dividers, backgrounds)
- High user visibility (mistakes very noticeable)

### Success Criteria

**Dashboard Components:**
- [ ] DashboardSidebar works in dark mode (all nav items, user dropdown, demo badge)
- [ ] AffirmationCard gradient legible in dark mode (test text contrast)
- [ ] FinancialHealthIndicator gauge visible in dark mode (SVG strokes)
- [ ] DashboardStats, RecentTransactionsCard, BudgetSummaryCard, NetWorthCard all use soft shadows
- [ ] IncomeVsExpensesCard, TopCategoriesCard work in dark mode
- [ ] All dashboard components use shadow-border pattern

**Auth Pages:**
- [ ] Error messages use terracotta palette (not red)
- [ ] Dividers use warm-gray palette (not generic gray)
- [ ] Backgrounds use semantic tokens (not hardcoded white/gray)
- [ ] All 3 auth forms consistent

**Technical:**
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds
- [ ] Visual QA passed in both themes

### Files to Modify

**Dashboard Components (8 files):**

1. `/src/components/dashboard/DashboardSidebar.tsx` **[COMPLEX - 3-4 hours alone]**
   - Estimated: 30-40 dark: variants
   - Pattern: Navigation items use `bg-sage-100 dark:bg-sage-800`, `text-sage-700 dark:text-sage-300`
   - Pattern: User dropdown uses `bg-white dark:bg-warm-gray-900`, `border-warm-gray-200 dark:border-warm-gray-700`
   - Pattern: Demo badge uses `bg-gold/10 dark:bg-gold-900/20`, `text-gold-700 dark:text-gold-400`, `border-gold/30 dark:border-gold-600/30`
   - Add: shadow-soft to navigation container with dark:shadow-none dark:border

2. `/src/components/ui/affirmation-card.tsx` **[COMPLEX - Gradient]**
   - Estimated: 8-10 dark: variants
   - Fix gradient: `bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900`
   - Fix text: `text-warm-gray-800 dark:text-warm-gray-200`
   - Fix icon: `text-gold-500 dark:text-gold-400`
   - Add: rounded-warmth (already present, verify)
   - Test: Visual contrast in dark mode (text must be readable on gradient)

3. `/src/components/dashboard/FinancialHealthIndicator.tsx` **[COMPLEX - SVG + Gradient]**
   - Estimated: 15-20 dark: variants
   - Fix gradient background: `bg-gradient-to-br from-sage-50 to-warm-gray-50 dark:from-warm-gray-900 dark:to-warm-gray-800`
   - Fix SVG track: `stroke-warm-gray-200 dark:stroke-warm-gray-700`
   - Fix SVG progress: `stroke-sage-500 dark:stroke-sage-400`
   - Fix text: `text-sage-600 dark:text-sage-400`, `text-warm-gray-900 dark:text-warm-gray-100`
   - Add: rounded-warmth (0.75rem)
   - Add: shadow-soft dark:shadow-none dark:border dark:border-warm-gray-600

4. `/src/components/dashboard/DashboardStats.tsx`
   - Estimated: 5-10 dark: variants
   - Fix: Hardcoded sage button colors `bg-sage-600 dark:bg-sage-500 hover:bg-sage-700 dark:hover:bg-sage-600`
   - Uses StatCard (fixed by Builder 1)
   - Add: shadow-soft-md to stat cards

5. `/src/components/dashboard/RecentTransactionsCard.tsx`
   - Estimated: 8-12 dark: variants
   - Fix text: `text-warm-gray-900 dark:text-warm-gray-100`, `text-warm-gray-500 dark:text-warm-gray-400`
   - Fix button: `bg-sage-600 dark:bg-sage-500`
   - Add: shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600

6. `/src/components/dashboard/BudgetSummaryCard.tsx`
   - Estimated: 8-12 dark: variants
   - Similar to RecentTransactionsCard
   - Add: shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600

7. `/src/components/dashboard/NetWorthCard.tsx`
   - Estimated: 8-12 dark: variants
   - Primary metric - use rounded-warmth
   - Add: shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600

8. `/src/components/dashboard/IncomeVsExpensesCard.tsx` + `/src/components/dashboard/TopCategoriesCard.tsx`
   - Estimated: 10-15 dark: variants each
   - Similar patterns to above
   - Chart components likely handle dark mode internally (Recharts)
   - Add: shadow-soft-md to containers

**Auth Pages (3 files):**

9. `/src/components/auth/SignInForm.tsx` **[7 styling issues]**
   - Line 105: Error message - replace `text-red-600 bg-red-50` with `text-terracotta-700 bg-terracotta-50 border-terracotta-200 rounded-lg shadow-soft dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800`
   - Line 117: Divider - replace `border-gray-300` with `border-warm-gray-200 dark:border-warm-gray-700`
   - Line 120: Divider text - replace `bg-white text-gray-500` with `bg-background text-muted-foreground`
   - OAuth button already inherits from Button (no changes needed)
   - Estimated: 15-20 minutes per issue = ~2 hours total for all 3 auth forms

10. `/src/components/auth/SignUpForm.tsx` **[Same issues as SignInForm]**
    - Line 162: Error message (same fix)
    - Line 174: Divider (same fix)
    - Line 177: Divider text (same fix)
    - Line 156: Password hint already correct (text-muted-foreground)

11. `/src/components/auth/ResetPasswordForm.tsx` **[1 issue]**
    - Line 84: Error message (same fix as above)

**Auth Page Wrappers (if needed):**
- `/src/app/(auth)/signin/page.tsx` - Check if any hardcoded colors (heading, description)
- `/src/app/(auth)/signup/page.tsx` - Same
- `/src/app/(auth)/reset-password/page.tsx` - Same

### Dependencies

**Depends on:** Builder 1 (UI Primitives must complete first)

**Blocks:** None (Builder 3 & 4 can run in parallel)

### Implementation Notes

**DashboardSidebar Approach:**
1. Start at the top (logo, navigation)
2. Work down to user dropdown
3. Save demo badge for last (complex with gold colors)
4. Test after each section (incremental visual QA)

**AffirmationCard Gradient Testing:**
- Test MULTIPLE gradient variations if text not readable
- Option 1: `dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900`
- Option 2: `dark:from-sage-900/50 dark:via-warm-gray-900 dark:to-sage-900/30`
- Option 3: Fallback to solid background `dark:bg-warm-gray-900`
- Use WCAG contrast checker: https://webaim.org/resources/contrastchecker/

**FinancialHealthIndicator SVG:**
- Use className on SVG elements, not inline stroke
- Pattern: `<circle className="stroke-warm-gray-200 dark:stroke-warm-gray-700" />`
- Test with Framer Motion animations (shouldn't break)

**Auth Form Pattern (Apply to all 3):**
```tsx
// Error message
<div className="text-sm text-terracotta-700 bg-terracotta-50 border border-terracotta-200 rounded-lg shadow-soft p-3 dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800">
  {error}
</div>

// Divider
<div className="w-full border-t border-warm-gray-200 dark:border-warm-gray-700" />

// Divider text
<span className="bg-background px-2 text-muted-foreground">
  Or continue with
</span>
```

### Patterns to Follow

**From patterns.md:**
- Dark Mode Pattern 1: Semantic tokens (auth backgrounds, divider text)
- Dark Mode Pattern 2: Custom colors with dark: variants (all hardcoded colors)
- Dark Mode Pattern 3: Gradients with dark alternatives (AffirmationCard, FinancialHealthIndicator)
- Dark Mode Pattern 4: SVG strokes (FinancialHealthIndicator)
- Visual Warmth Pattern 1: Shadow-border pattern (all dashboard cards)
- Visual Warmth Pattern 2: rounded-warmth (AffirmationCard, FinancialHealthIndicator, NetWorthCard)
- Error Color Pattern: Terracotta (auth forms)

### Testing Requirements

**Component-Level Testing:**
- [ ] DashboardSidebar: Toggle theme, check all nav items, user dropdown, demo badge
- [ ] AffirmationCard: Gradient readable in dark mode, icon visible, text has contrast
- [ ] FinancialHealthIndicator: Gauge visible in dark mode, text readable, animations work
- [ ] All dashboard cards: Shadows visible in light, borders visible in dark
- [ ] Auth forms: Error messages terracotta, dividers warm-gray, backgrounds correct

**Page-Level Testing:**
- [ ] Open `/dashboard` in light mode - everything visible
- [ ] Toggle to dark mode - everything still visible, legible
- [ ] Open `/signin` in both modes - warm, welcoming, no harsh colors
- [ ] Trigger error in sign in form - terracotta color, not red
- [ ] Test OAuth button - works in both themes

**Technical Testing:**
- [ ] TypeScript: `npm run type-check` - 0 errors
- [ ] Build: `npm run build` - succeeds
- [ ] Console: No hydration warnings

**Coverage Target:** 100% of 11 files tested in both themes

### Potential Split Strategy

**If complexity proves too high, split at natural boundary:**

**Primary Builder 2:**
- DashboardSidebar (most complex, must be done carefully)
- AffirmationCard (gradient testing)
- FinancialHealthIndicator (SVG + gradient)
- Estimate: 4-5 hours

**Sub-builder 2A: Dashboard Cards**
- DashboardStats, RecentTransactionsCard, BudgetSummaryCard
- NetWorthCard, IncomeVsExpensesCard, TopCategoriesCard
- Estimate: 2-3 hours

**Sub-builder 2B: Auth Pages**
- SignInForm, SignUpForm, ResetPasswordForm
- Simple pattern application (7 issues across 3 files)
- Estimate: 1-2 hours

**Total if split:** 7-10 hours across 3 builders (vs 4-5 hours single builder)

**Recommendation:** Start as single builder, split only if DashboardSidebar takes >3 hours

### Risk Level

**HIGH**

**Why:**
- DashboardSidebar has 30+ color classes (highest complexity in app)
- AffirmationCard gradient requires visual testing (may need iteration)
- FinancialHealthIndicator has SVG + gradient + animations
- High user visibility (mistakes very noticeable)

**Mitigation:**
- Test incrementally (after each component)
- Start with simplest components (warm up)
- Save DashboardSidebar for when you're warmed up
- Use contrast checker for gradients
- Take screenshots before/after for comparison

---

## Builder-3: Visual Warmth Rollout

### Scope

Apply soft shadows and warmth styling to Account and Transaction components (critical user path):
1. Account components (6 files)
2. Transaction components (13 files)

**Total:** 19 files with shadow-soft pattern application

**Why This Builder:**
- Accounts and Transactions are 2nd highest traffic (after Dashboard)
- Clear pattern to follow (mostly shadow-soft application)
- Can run in parallel with Builder 2 (different files)

### Complexity Estimate

**MEDIUM**

Rationale:
- Large number of files (19 total)
- But simple pattern (mostly adding shadow-soft)
- Some components already inherit from Card (just verify)
- Focus on critical path (skip less-used features)

### Success Criteria

**Account Components:**
- [ ] AccountCard uses shadow-soft-md (not old hover:shadow-md)
- [ ] AccountList container has shadow-soft
- [ ] AccountDetailClient detail cards have shadow-soft-md
- [ ] All account components use shadow-border pattern in dark mode

**Transaction Components:**
- [ ] TransactionCard inherits shadow-soft from Card (verify)
- [ ] TransactionList container has shadow-soft
- [ ] TransactionDetail has shadow-soft-md
- [ ] TransactionFilters panel has shadow-soft
- [ ] BulkActionsBar has shadow-soft
- [ ] All transaction components use shadow-border pattern

**Technical:**
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds
- [ ] Visual QA passed in both themes

### Files to Modify

**Account Components (6 files):**

1. `/src/components/accounts/AccountCard.tsx`
   - Replace: `hover:shadow-md` with `shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600`
   - Verify: Card component inheritance (should already work)
   - Estimated: 10 minutes

2. `/src/components/accounts/AccountList.tsx`
   - Add: `shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700` to list container
   - Estimated: 5 minutes

3. `/src/components/accounts/AccountListClient.tsx`
   - Add: `shadow-soft` to wrapper if present
   - Estimated: 5 minutes

4. `/src/components/accounts/AccountDetailClient.tsx`
   - Add: `shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600` to detail cards
   - Check for hardcoded warm-gray colors (add dark: variants if found)
   - Estimated: 15-20 minutes

5. `/src/components/accounts/AccountForm.tsx`
   - Verify: Inherits from Input/Card primitives (should already work)
   - Estimated: 5 minutes (verification only)

6. `/src/components/accounts/PlaidLinkButton.tsx`
   - Add: `shadow-soft` to button wrapper if present
   - Estimated: 5 minutes

**Transaction Components (13 files):**

7. `/src/components/transactions/TransactionCard.tsx`
   - Verify: Uses Card component (should inherit shadow-soft)
   - Estimated: 5 minutes (verification only)

8. `/src/components/transactions/TransactionList.tsx`
   - Add: `shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700` to list container
   - Estimated: 5 minutes

9. `/src/components/transactions/TransactionListPage.tsx`
   - Add: `shadow-soft` to page cards if present
   - Estimated: 5 minutes

10. `/src/components/transactions/TransactionDetail.tsx`
    - Add: `shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600` to detail card
    - Estimated: 10 minutes

11. `/src/components/transactions/TransactionDetailClient.tsx`
    - Add: `shadow-soft` to wrapper
    - Estimated: 5 minutes

12. `/src/components/transactions/TransactionForm.tsx`
    - Verify: Inherits from Input primitives (should already work)
    - Estimated: 5 minutes (verification only)

13. `/src/components/transactions/AddTransactionForm.tsx`
    - Verify: Same as TransactionForm
    - Estimated: 5 minutes (verification only)

14. `/src/components/transactions/TransactionFilters.tsx`
    - Add: `shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700` to filter panel
    - Estimated: 10 minutes

15. `/src/components/transactions/BulkActionsBar.tsx`
    - Add: `shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700` to action bar
    - Estimated: 10 minutes

16. `/src/components/transactions/ExportButton.tsx`
    - Add: `shadow-soft-md` to dropdown if present
    - Estimated: 5 minutes

17. `/src/components/transactions/CategorySuggestion.tsx`
    - Add: `shadow-soft` to suggestion cards
    - Estimated: 10 minutes

18. `/src/components/transactions/AutoCategorizeButton.tsx`
    - Verify: Already correct (has Loader2 spinner)
    - Estimated: 5 minutes (verification only)

19. `/src/components/transactions/CategorizationStats.tsx`
    - Add: `shadow-soft` to stats cards
    - Estimated: 10 minutes

### Dependencies

**Depends on:** Builder 1 (UI Primitives must complete first)

**Blocks:** None (can run in parallel with Builder 2)

**Coordination with Builder 2:**
- Builder 2 modifies Dashboard components
- Builder 3 modifies Accounts/Transactions
- No file conflicts expected

### Implementation Notes

**Pattern to Apply Consistently:**
```tsx
// Standard card
className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700"

// Elevated card (detail pages)
className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600"

// List containers
className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700"
```

**Verification vs Modification:**
- Many components inherit from Card/Input primitives (fixed by Builder 1)
- Only verify these work correctly (no modification needed)
- Focus on components with explicit shadow styling or custom containers

**Time-Saving Tip:**
- Group similar components together
- Apply same pattern to all at once
- Test as a group (e.g., all account components together)

### Patterns to Follow

**From patterns.md:**
- Visual Warmth Pattern 1: Shadow-border pattern (all 19 files)
- Use `shadow-soft` for standard, `shadow-soft-md` for elevated

### Testing Requirements

**Component-Level Testing:**
- [ ] AccountCard: Shadow visible in light mode, border in dark mode
- [ ] AccountList: Container has proper shadow/border
- [ ] TransactionCard: Inherits correctly from Card
- [ ] TransactionList: Container has proper shadow/border
- [ ] TransactionDetail: Detail card has elevated shadow/border

**Page-Level Testing:**
- [ ] Open `/accounts` in light mode - soft shadows visible
- [ ] Toggle to dark mode - borders provide separation
- [ ] Open `/transactions` in light mode - soft shadows visible
- [ ] Toggle to dark mode - borders provide separation
- [ ] Open account detail page - elevated shadow/border correct

**Technical Testing:**
- [ ] TypeScript: `npm run type-check` - 0 errors
- [ ] Build: `npm run build` - succeeds

**Coverage Target:** 100% of 19 files tested in both themes

### Potential Split Strategy

**If complexity proves too high:**

**Primary Builder 3:**
- Account components (6 files)
- Estimate: 1-1.5 hours

**Sub-builder 3A:**
- Transaction components (13 files)
- Estimate: 2-2.5 hours

**Total if split:** 3-4 hours (same as single builder, splitting not recommended)

**Recommendation:** Do not split. 19 files but simple pattern.

### Risk Level

**LOW-MEDIUM**

**Why:**
- Simple pattern (mostly shadow-soft application)
- Many components inherit (verification only)
- Clear success criteria (visual separation in both themes)

**Mitigation:**
- Test after each file group (accounts, then transactions)
- Use consistent pattern (copy-paste className string)
- Spot check inheritance (Card components should work automatically)

---

## Builder-4: Button Loading States

### Scope

Enhance the Button component and apply loading states to all forms and mutation buttons:
1. Enhance Button component with `loading` prop (foundation)
2. Apply to 18 HIGH priority buttons (all forms + delete actions)
3. Fix 6 BROKEN buttons (critical bugs - no loading state at all)
4. Simplify BudgetForm (already has Loader2, can use new prop)

**Total:** 1 component enhancement + 24 button implementations

**Why This Builder:**
- Completely independent from dark mode and visual warmth work
- Clear pattern to follow (add `loading` prop)
- Can run in parallel with all other builders
- Fixes 6 critical bugs (buttons with no loading state)

### Complexity Estimate

**LOW-MEDIUM**

Rationale:
- Button component enhancement is straightforward (30 minutes)
- Pattern application is simple and consistent
- Many files to modify (24 buttons) but each takes 5-10 minutes
- Critical bugs to fix (6 buttons) require careful testing

### Success Criteria

**Button Component:**
- [ ] Button supports `loading?: boolean` prop
- [ ] Loading prop auto-disables button
- [ ] Loader2 spinner appears when loading={true}
- [ ] No layout shift when spinner appears
- [ ] Works with all button variants (default, outline, ghost, destructive)
- [ ] Works with all button sizes (sm, default, lg)

**Form Submissions (12 buttons):**
- [ ] TransactionForm (create + update)
- [ ] AccountForm (create + update)
- [ ] GoalForm (create + update)
- [ ] CategoryForm (create + update)
- [ ] BudgetForm (create + update) - simplified
- [ ] ProfileSection (update)
- [ ] All auth forms (sign in, sign up, reset password)

**Delete/Archive Actions (6 buttons - CURRENTLY BROKEN):**
- [ ] Delete Transaction (has text change, add spinner)
- [ ] Delete Goal (NO loading state - FIX)
- [ ] Delete Budget (NO loading state - FIX)
- [ ] Delete Account (has text change, add spinner)
- [ ] Archive Account (NO loading state - FIX)
- [ ] Archive Category (NO loading state - FIX)

**Technical:**
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds
- [ ] All buttons show spinner immediately on click
- [ ] No double-click issues (buttons properly disabled)

### Files to Modify

**Foundation (1 file):**

1. `/src/components/ui/button.tsx` **[30 minutes]**
   - Import: `import { Loader2 } from 'lucide-react'`
   - Add prop: `loading?: boolean` to ButtonProps interface
   - Add logic: `disabled={disabled || loading}`
   - Add spinner: `{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}`
   - Test: All variants (default, outline, ghost, destructive, link)
   - Test: All sizes (sm, default, lg, icon)

**Form Submissions (10 files, 12 buttons):**

2. `/src/components/transactions/TransactionForm.tsx` **[10 minutes]**
   - Change: `<Button type="submit" loading={isLoading}>`
   - Keep: Text change `{isLoading ? 'Saving...' : ...}`
   - Test: Create and update flows

3. `/src/components/accounts/AccountForm.tsx` **[10 minutes]**
   - Same pattern as TransactionForm

4. `/src/components/goals/GoalForm.tsx` **[10 minutes]**
   - Same pattern as TransactionForm

5. `/src/components/categories/CategoryForm.tsx` **[10 minutes]**
   - Pattern: `loading={createCategory.isPending || updateCategory.isPending}`

6. `/src/components/budgets/BudgetForm.tsx` **[15 minutes - Simplification]**
   - Remove: Manual Loader2 JSX (now handled by Button)
   - Change: `<Button type="submit" loading={isSubmitting}>`
   - Keep: Text change logic (for clarity)
   - Test: Verify same UX as before

7. `/src/components/settings/ProfileSection.tsx` **[10 minutes]**
   - Change: `<Button loading={updateProfile.isPending}>`

8. `/src/components/auth/SignInForm.tsx` **[10 minutes]**
   - Change: `<Button type="submit" loading={isLoading}>`
   - Note: Uses manual useState (not tRPC)

9. `/src/components/auth/SignUpForm.tsx` **[10 minutes]**
   - Same pattern as SignInForm

10. `/src/components/auth/ResetPasswordForm.tsx` **[10 minutes]**
    - Same pattern as SignInForm

**Delete/Archive Actions (6 files, 6 buttons - CRITICAL FIXES):**

11. `/src/components/transactions/TransactionList.tsx` **[10 minutes]**
    - Change: `<AlertDialogAction loading={deleteTransaction.isPending}>`
    - Already has text change, just add loading prop

12. `/src/components/goals/GoalList.tsx` **[15 minutes - BROKEN]**
    - Add: `loading={deleteGoal.isPending}` to AlertDialogAction
    - Add: Text change `{deleteGoal.isPending ? 'Deleting...' : 'Delete'}`
    - Test: Verify spinner appears, button disables

13. `/src/components/budgets/BudgetList.tsx` **[15 minutes - BROKEN]**
    - Same as GoalList
    - Add: `loading={deleteBudget.isPending}`
    - Add: Text change

14. `/src/components/settings/DangerZone.tsx` **[10 minutes]**
    - Change: `<AlertDialogAction loading={deleteAccount.isPending}>`
    - Already has text change

15. `/src/components/accounts/AccountList.tsx` **[15 minutes - BROKEN]**
    - Add: `loading={archiveAccount.isPending}` to AlertDialogAction
    - Add: Text change `{archiveAccount.isPending ? 'Archiving...' : 'Archive'}`

16. `/src/components/categories/CategoryList.tsx` **[15 minutes - BROKEN]**
    - Add: `loading={archiveCategory.isPending}` to Button
    - Add: Text change or keep icon only (currently just icon)
    - Note: Currently uses confirm() dialog, not AlertDialog

**Optional (If Time Allows):**

17. `/src/components/transactions/AutoCategorizeButton.tsx` **[10 minutes]**
    - Already has Loader2 spinner
    - Optional: Simplify to use Button loading prop
    - Low priority (already works correctly)

18. `/src/components/accounts/PlaidLinkButton.tsx` **[10 minutes]**
    - Already has Loader2 spinner
    - Optional: Simplify to use Button loading prop
    - Low priority (already works correctly)

### Dependencies

**Depends on:** None (fully independent)

**Blocks:** None (can run in parallel with all other builders)

**Special Note:**
- Does NOT depend on Builder 1 (Button component is separate from dark mode work)
- Can start immediately without waiting

### Implementation Notes

**Button Component Enhancement Pattern:**
```tsx
// src/components/ui/button.tsx
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean  // NEW PROP
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading, children, disabled, ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}  // Auto-disable
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    )
  }
)
```

**Form Button Pattern:**
```tsx
// Before:
<Button type="submit" disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>

// After:
<Button type="submit" loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Delete Button Pattern (AlertDialog):**
```tsx
// Before (BROKEN):
<AlertDialogAction onClick={handleDelete}>
  Delete
</AlertDialogAction>

// After (FIXED):
<AlertDialogAction
  onClick={handleDelete}
  loading={deleteMutation.isPending}
>
  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
</AlertDialogAction>
```

**Testing Approach:**
1. Enhance Button component first (test all variants)
2. Apply to one form (test thoroughly)
3. Apply pattern to all other forms (faster)
4. Fix broken delete buttons (test each one)

### Patterns to Follow

**From patterns.md:**
- Loading State Pattern 1: Enhanced Button with loading prop
- Loading State Pattern 2: Form with loading state (tRPC mutation)
- Loading State Pattern 3: Delete confirmation with loading state
- Loading State Pattern 4: Auth form with loading state (Supabase)

### Testing Requirements

**Button Component Testing:**
- [ ] Create test page with all button variants
- [ ] Test loading={true} on each variant (default, outline, ghost, destructive, link)
- [ ] Test loading={true} on each size (sm, default, lg)
- [ ] Verify spinner appears immediately
- [ ] Verify button auto-disables
- [ ] Verify no layout shift
- [ ] Test in both light and dark mode (spinner should be visible)

**Form Submission Testing:**
- [ ] Test each form in create mode (loading state appears)
- [ ] Test each form in update mode (loading state appears)
- [ ] Verify spinner appears immediately on submit
- [ ] Verify button text changes
- [ ] Verify button disables (can't click twice)
- [ ] Verify success/error states work correctly

**Delete Action Testing (CRITICAL - These are currently broken):**
- [ ] GoalList: Trigger delete, verify spinner appears
- [ ] BudgetList: Trigger delete, verify spinner appears
- [ ] AccountList: Trigger archive, verify spinner appears
- [ ] CategoryList: Trigger archive, verify spinner appears
- [ ] TransactionList: Verify improved (already has text change)
- [ ] DangerZone: Verify improved (already has text change)

**Technical Testing:**
- [ ] TypeScript: `npm run type-check` - 0 errors
- [ ] Build: `npm run build` - succeeds
- [ ] Console: No errors when buttons clicked

**Coverage Target:** 100% of buttons tested (24 buttons + Button component)

### Potential Split Strategy

**If complexity proves too high:**

**Primary Builder 4:**
- Enhance Button component (foundation)
- Apply to form submissions (12 buttons)
- Estimate: 2-2.5 hours

**Sub-builder 4A:**
- Fix broken delete/archive buttons (6 buttons)
- Simplify AutoCategorizeButton, PlaidLinkButton (optional)
- Estimate: 1.5-2 hours

**Total if split:** 3.5-4.5 hours (same as single builder, splitting not recommended)

**Recommendation:** Do not split. Clear pattern, manageable file count.

### Risk Level

**LOW**

**Why:**
- Button component enhancement is well-defined (30 minutes)
- Pattern application is simple and consistent
- No interaction with other builders (fully independent)
- Clear test cases (spinner appears or not)

**Mitigation:**
- Test Button component thoroughly before applying to forms
- Test one form completely before applying pattern to others
- Focus on critical bugs first (6 broken buttons)
- Keep BudgetForm simplification optional (already works, just code cleanup)

---

## Builder Execution Order

### Phase 1: Foundation (SEQUENTIAL)

**Builder 1 MUST complete first:**
- Fixes UI primitives (Card, Input, Dialog, etc.)
- Creates foundation for 60-70% of app
- Estimated: 3-4 hours

**Checkpoint after Builder 1:**
- [ ] Test UI primitives in both themes
- [ ] Verify Card, Input, Dialog work correctly
- [ ] Spot check dashboard (should already look better)

### Phase 2: Parallel Execution (AFTER BUILDER 1)

**These builders can run in parallel:**

**Builder 2:** Dashboard & Auth components
- Depends on: Builder 1 (Card, Input primitives)
- Estimated: 4-5 hours
- Risk: HIGH (complex components)

**Builder 3:** Visual Warmth (Accounts + Transactions)
- Depends on: Builder 1 (Card primitive)
- Estimated: 3-4 hours
- Risk: MEDIUM (simple pattern application)

**Builder 4:** Button Loading States
- Depends on: None (fully independent)
- Estimated: 3-4 hours
- Risk: LOW (clear pattern)

**Coordination:**
- Builder 2 and Builder 3 touch different files (no conflicts)
- Builder 4 touches form files but different aspects (Button prop vs styling)
- All builders should commit frequently (rollback safety)

### Phase 3: Integration (SEQUENTIAL)

**After all builders complete:**
1. Merge all branches
2. Resolve any conflicts (minimal expected)
3. Run TypeScript check
4. Run build
5. Comprehensive visual QA (30-45 minutes)

---

## Integration Notes

### Potential Conflicts

**Low Risk - Different Files:**
- Builder 2: Dashboard + Auth components
- Builder 3: Accounts + Transactions components
- Builder 4: Button component + form Button props
- No direct file conflicts expected

**Medium Risk - Same Files (Different Aspects):**
- TransactionForm, AccountForm, GoalForm, etc.
- Builder 2/3: Modify styling (className)
- Builder 4: Modify Button (add loading prop)
- **Resolution:** Different lines, Git merge should handle automatically

### Merge Strategy

1. **Builder 1 merges first** (foundation, no conflicts)
2. **Builder 4 merges second** (Button component, minimal conflicts)
3. **Builders 2 & 3 merge together** (coordinate if needed)

### Testing After Integration

**Comprehensive QA Checklist:**
- [ ] Test all pages in light mode (Dashboard, Auth, Accounts, Transactions)
- [ ] Test all pages in dark mode (same pages)
- [ ] Toggle theme 10+ times (no flashes, instant switching)
- [ ] Test all forms (loading states work)
- [ ] Test all delete buttons (spinners appear)
- [ ] Check gradients (AffirmationCard, FinancialHealthIndicator)
- [ ] Check SVGs (FinancialHealthIndicator gauge)
- [ ] Check shadows vs borders (dark mode separation)
- [ ] TypeScript compile (0 errors)
- [ ] Build (succeeds)

---

## Summary

**Total Builders:** 4

**Total Estimated Time:** 12-16 hours (parallel execution)

**Execution Strategy:**
1. Builder 1 runs first (3-4 hours) - FOUNDATION
2. Builders 2, 3, 4 run in parallel (4-5 hours max) - PARALLEL WORK
3. Integration and testing (1-2 hours) - FINAL QA

**Critical Path:**
- Builder 1 → Builder 2 (Dashboard depends on Card primitive)
- Builder 1 → Builder 3 (Accounts/Transactions depend on Card primitive)
- Builder 4 is fully independent (can start anytime)

**Success Criteria:**
- All 32 components have dark mode support
- All 32 components have visual warmth styling
- All 24 buttons have loading states
- TypeScript compiles with 0 errors
- Build succeeds
- Visual QA passed in both themes

**Risk Mitigation:**
- Incremental testing after each builder
- Clear patterns to follow
- File conflicts minimized (different files)
- Rollback safety (incremental commits)
