# Integration Checklist - Round 1

**Integrator:** Integrator-1
**Start Time:** _____________
**Completion Time:** _____________

---

## Pre-Integration Setup

- [ ] Read integration-plan.md completely
- [ ] Read integration-summary.md
- [ ] Read merge-conflict-resolution.md
- [ ] Verify all 3 builder reports exist and are marked COMPLETE
- [ ] Working directory is clean (no uncommitted changes)
- [ ] Current branch: ________________

---

## Zone 1: Foundation Infrastructure

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### Files to Merge (8 files)

#### New Files (2)
- [ ] Create `src/hooks/useMediaQuery.ts` (30 lines)
- [ ] Create `src/hooks/usePrefersReducedMotion.ts` (19 lines)

#### Modified Files (6)
- [ ] Update `src/app/globals.css` (+43 lines: safe area CSS variables)
- [ ] Update `tailwind.config.ts` (+27 lines: mobile utilities, container-queries plugin)
- [ ] Update `package.json` (+1 line: @tailwindcss/container-queries)
- [ ] Update `src/app/layout.tsx` (+5 lines: viewport export)
- [ ] Update `src/components/ui/input.tsx` (~8 lines: h-12 mobile, inputMode)
- [ ] Update `src/components/ui/select.tsx` (~5 lines: collisionPadding, min-width)

### Actions
- [ ] Run `npm install` to install @tailwindcss/container-queries
- [ ] Verify package-lock.json updated

### Validation
- [ ] TypeScript compiles: `npx tsc --noEmit src/hooks/*.ts`
- [ ] Check globals.css has `:root` with `--safe-area-inset-*` variables
- [ ] Check tailwind.config.ts has `extend.spacing` with safe area tokens
- [ ] Check tailwind.config.ts has `plugins: [require('@tailwindcss/container-queries')]`
- [ ] Verify app/layout.tsx has `export const viewport` with `viewportFit: 'cover'`

**Zone 1 Complete Time:** _____________

---

## Zone 2: UI Primitive Updates

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### Files to Merge (3 files - 2 already done in Zone 1)

- [ ] Update `src/components/ui/button.tsx` (Builder-3: h-11 mobile, h-10 desktop)
- [ ] Update `src/components/ui/dropdown-menu.tsx` (Builder-1: collisionPadding, py-2.5)
- [ ] Update `src/components/ui/card.tsx` (Builder-3: p-4 sm:p-6 pattern)

### Validation
- [ ] Check button.tsx default size: `"h-11 px-4 py-2 sm:h-10"`
- [ ] Check button.tsx icon size: `"h-11 w-11 sm:h-10 sm:w-10"`
- [ ] Check dropdown-menu.tsx has `collisionPadding={16}`
- [ ] Check dropdown-menu.tsx DropdownMenuItem has `"py-2.5"`
- [ ] Check card.tsx CardHeader has `"p-4 sm:p-6"`
- [ ] Check card.tsx CardContent has `"p-4 sm:p-6 pt-0"`
- [ ] TypeScript compiles: `npx tsc --noEmit src/components/ui/*.tsx`

**Zone 2 Complete Time:** _____________

---

## Zone 3: Bottom Navigation Components

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### Files to Create (4 files)

- [ ] Create directory `src/components/mobile/` if it doesn't exist
- [ ] Create `src/hooks/useScrollDirection.ts` (118 lines)
- [ ] Create `src/components/mobile/BottomNavigation.tsx` (130 lines)
- [ ] Create `src/components/mobile/MoreSheet.tsx` (110 lines)
- [ ] Create `src/lib/mobile-navigation.ts` (103 lines)

### Validation
- [ ] Verify BottomNavigation.tsx imports from `@/components/mobile/MoreSheet`
- [ ] Verify BottomNavigation.tsx imports from `@/lib/mobile-navigation`
- [ ] Verify BottomNavigation.tsx imports from `@/hooks/useScrollDirection`
- [ ] Verify BottomNavigation.tsx uses `pb-safe-b` class
- [ ] Verify BottomNavigation.tsx uses `z-[45]`
- [ ] Verify MoreSheet.tsx extends Dialog from `@/components/ui/dialog`
- [ ] Verify mobile-navigation.ts exports `NavigationItem` interface
- [ ] Verify mobile-navigation.ts exports `primaryNavItems` array
- [ ] Verify mobile-navigation.ts exports `overflowNavItems` array
- [ ] TypeScript compiles: `npx tsc --noEmit src/components/mobile/*.tsx src/lib/mobile-navigation.ts src/hooks/useScrollDirection.ts`

**Zone 3 Complete Time:** _____________

---

## Zone 4: Dashboard Layout Integration (CRITICAL - MERGE CONFLICT)

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### File to Merge (1 file - MANUAL MERGE)

- [ ] Read current state of `src/app/(dashboard)/layout.tsx`
- [ ] Apply Change 1: Add import `import { BottomNavigation } from '@/components/mobile/BottomNavigation'`
- [ ] Apply Change 2: Add padding to main container `"pb-24 lg:pb-8"`
- [ ] Apply Change 3: Add `<BottomNavigation />` component after flex container

### Critical Verification (Use merge-conflict-resolution.md)
- [ ] Import statement exists at top of file
- [ ] Main container has `pb-24 lg:pb-8` in className
- [ ] BottomNavigation component is rendered
- [ ] BottomNavigation is OUTSIDE flex container (not inside main)
- [ ] File structure matches template in merge-conflict-resolution.md

### Validation Commands
```bash
# Check import
grep "import { BottomNavigation }" src/app/\(dashboard\)/layout.tsx

# Check padding
grep "pb-24 lg:pb-8" src/app/\(dashboard\)/layout.tsx

# Check component
grep "<BottomNavigation />" src/app/\(dashboard\)/layout.tsx
```

- [ ] All 3 grep commands return results
- [ ] TypeScript compiles: `npx tsc --noEmit src/app/\(dashboard\)/layout.tsx`

**Zone 4 Complete Time:** _____________

---

## Zone 5: Page Layout Updates

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### Files to Merge (6 files)

- [ ] Update `src/app/(dashboard)/dashboard/page.tsx` (~2 lines: space-y-4 sm:space-y-6)
- [ ] Update `src/components/transactions/TransactionListPage.tsx` (~6 lines: responsive header)
- [ ] Update `src/app/(dashboard)/budgets/page.tsx` (~6 lines: responsive header, grid)
- [ ] Update `src/components/goals/GoalsPageClient.tsx` (~4 lines: responsive layout)
- [ ] Update `src/components/dashboard/DashboardStats.tsx` (~4 lines: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
- [ ] Update `src/components/transactions/TransactionCard.tsx` (~8 lines: h-11 w-11 buttons)

### Validation
- [ ] Check DashboardStats has `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- [ ] Check TransactionCard action buttons have `h-11 w-11 sm:h-8 sm:w-8`
- [ ] Check page headers have `flex flex-col sm:flex-row`
- [ ] Check pages have `space-y-4 sm:space-y-6`
- [ ] TypeScript compiles: `npx tsc --noEmit src/app/\(dashboard\)/**/*.tsx src/components/**/*.tsx`

**Zone 5 Complete Time:** _____________

---

## Final Build & Validation

**Status:** [ ] Not Started [ ] In Progress [ ] Complete
**Start Time:** _____________

### Build Verification
- [ ] Run `npm run build`
- [ ] Build succeeds with no errors
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors

### File Count Verification
- [ ] 6 new files created (2 hooks + 3 mobile + 1 lib)
- [ ] 18 files modified
- [ ] 1 new dependency in package.json

### TypeScript Validation
```bash
npx tsc --noEmit
```
- [ ] No TypeScript errors in entire project

### Visual Testing (Development Server)

#### Start Dev Server
```bash
npm run dev
# Open http://localhost:3000/dashboard
```

#### Mobile View (375px width)
- [ ] Bottom nav is visible at bottom of screen
- [ ] Bottom nav has 5 tabs (Dashboard, Transactions, Budgets, Goals, More)
- [ ] Dashboard tab is highlighted (active state)
- [ ] Tap "Transactions" → navigates to /transactions
- [ ] Transactions tab is now highlighted
- [ ] Tap "More" → MoreSheet opens from bottom
- [ ] MoreSheet has 5 items (Recurring, Analytics, Accounts, Settings, Admin)
- [ ] Tap outside sheet → sheet closes
- [ ] No horizontal scrollbar on dashboard page
- [ ] Last content on page is not hidden behind bottom nav

#### Tablet View (768px width)
- [ ] Bottom nav transitions from visible to hidden at ~768px
- [ ] Sidebar becomes visible
- [ ] Page layout adjusts correctly

#### Desktop View (1280px width)
- [ ] Bottom nav is hidden (lg:hidden working)
- [ ] Sidebar is visible on left
- [ ] DashboardStats shows 4 columns
- [ ] All buttons are proper desktop size (h-10, not h-11)

### Touch Target Verification (Browser Inspector)

#### Button Touch Targets (at 375px viewport)
- [ ] Inspect default button → computed height = 44px
- [ ] Inspect icon button → computed height = 44px, width = 44px
- [ ] Inspect TransactionCard edit button → computed height = 44px, width = 44px
- [ ] Inspect bottom nav tab → computed min-height ≥ 48px

#### Input Touch Targets (at 375px viewport)
- [ ] Inspect input field → computed height = 48px

### Safe Area Verification
- [ ] globals.css has `--safe-area-inset-bottom` variable in :root
- [ ] BottomNavigation has `pb-safe-b` class
- [ ] Tailwind config has `pb-safe-b` in extend.padding

**Note:** Actual safe area values (>0px) only testable on real device

### Dark Mode Testing
- [ ] Toggle dark mode in app
- [ ] Bottom nav colors correct in dark mode
- [ ] All buttons visible in dark mode
- [ ] All cards readable in dark mode
- [ ] MoreSheet works in dark mode

### Scroll Testing (at 375px viewport)
- [ ] Scroll down dashboard page → verify smooth scrolling
- [ ] Bottom nav remains visible while scrolling (scroll-hide comes later)
- [ ] Scroll back to top → no layout issues

**Final Validation Complete Time:** _____________

---

## Integration Report Creation

- [ ] Create `integration-report.md` in `.2L/plan-4/iteration-14/integration/round-1/`
- [ ] Document all zones integrated
- [ ] Note any issues encountered
- [ ] Include validation results
- [ ] List files created and modified
- [ ] Add screenshots if possible (mobile view, desktop view)

---

## Post-Integration Cleanup

- [ ] Commit all changes with message: "Integration Round 1: Mobile Experience Foundation"
- [ ] Verify git status shows all expected files
- [ ] No untracked files remaining
- [ ] No uncommitted changes

---

## Handoff to Validator

- [ ] Mark integration status as COMPLETE
- [ ] Notify orchestrator that integration is ready for validation
- [ ] Provide integration report location
- [ ] List any known issues or warnings
- [ ] Recommend real device testing priorities

---

## Summary Statistics

**Total Time Spent:** _____________ minutes

**Zones Completed:**
- Zone 1: [ ] _____________ minutes
- Zone 2: [ ] _____________ minutes
- Zone 3: [ ] _____________ minutes
- Zone 4: [ ] _____________ minutes
- Zone 5: [ ] _____________ minutes
- Final Validation: [ ] _____________ minutes

**Issues Encountered:** _____________

**Files Created:** _____________

**Files Modified:** _____________

**Build Status:** [ ] Success [ ] Failed

**Ready for Validation:** [ ] Yes [ ] No

---

## Notes

Use this space to document any issues, decisions, or observations during integration:

```
[Your notes here]
```

---

**Checklist Status:** READY FOR USE
**Created:** 2025-11-05
**Integration Round:** 1
