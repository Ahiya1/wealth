# Builder Task Breakdown - Iteration 14

## Overview

**Total Builders:** 3 primary builders working in parallel

**Estimated Total Time:** 14-16 hours

**Complexity Distribution:**
- Builder-1: HIGH (Foundation + UI Primitives)
- Builder-2: MEDIUM-HIGH (Bottom Navigation)
- Builder-3: MEDIUM (Layout & Touch Target Fixes)

**Parallelization Strategy:**
- Builder-1 starts immediately (creates foundation)
- Builder-2 can start in parallel (minimal dependency on Builder-1)
- Builder-3 waits for Builder-1 utilities, then proceeds

---

## Builder-1: Foundation & UI Primitives

### Scope

You are responsible for establishing the mobile-first foundation: safe area CSS infrastructure, Tailwind utilities, responsive hooks, and Radix UI component mobile optimizations.

**Why you're critical:** Your work creates the utilities and patterns that Builder-2 and Builder-3 will use. Without safe area utilities, bottom nav can't respect iPhone notches. Without touch target utilities, buttons won't meet WCAG standards.

### Complexity Estimate

**HIGH** (6-7 hours)

**Reasoning:**
- Multiple subsystems (CSS, Tailwind, hooks, Radix components)
- Requires testing on multiple components
- Foundation work affects entire codebase
- No prior mobile-specific infrastructure exists

### Success Criteria

- [ ] Safe area CSS variables added to globals.css (4 variables)
- [ ] Tailwind config extended with mobile utilities (spacing, touch targets, z-index, container queries)
- [ ] @tailwindcss/container-queries plugin installed and working
- [ ] useMediaQuery hook created and tested
- [ ] usePrefersReducedMotion hook created and tested
- [ ] Radix Select overflow issue fixed (min-w mobile pattern)
- [ ] Radix Dropdown collision detection added
- [ ] Button component updated with mobile-first touch targets
- [ ] Input component updated with mobile-first height + inputMode support
- [ ] Card component updated with mobile-first padding
- [ ] Layout.tsx updated with bottom nav clearance (pb-24)
- [ ] Viewport meta tag updated with viewport-fit=cover

### Files to Create

**New Hooks:**
```
src/hooks/useMediaQuery.ts          (~30 lines)
src/hooks/usePrefersReducedMotion.ts (~15 lines)
```

**New Directory:**
```
src/components/mobile/              (prepare for Builder-2)
```

### Files to Modify

**Foundation Files:**
```
src/app/globals.css                 (+40 lines: safe area variables + utilities)
tailwind.config.ts                  (+30 lines: utilities, plugin)
package.json                        (+1 dependency: @tailwindcss/container-queries)
src/app/layout.tsx                  (+3 lines: viewport-fit=cover in metadata)
```

**Layout Files:**
```
src/app/(dashboard)/layout.tsx      (+5 lines: pb-24 lg:pb-8 for bottom nav clearance)
```

**UI Components:**
```
src/components/ui/button.tsx        (~10 lines changed: size variants)
src/components/ui/input.tsx         (~8 lines changed: height + inputMode)
src/components/ui/select.tsx        (~5 lines changed: min-w mobile, collisionPadding)
src/components/ui/dropdown-menu.tsx (~5 lines changed: py-2.5, collisionPadding)
src/components/ui/card.tsx          (~4 lines changed: p-4 sm:p-6)
```

### Dependencies

**None!** You can start immediately.

### Implementation Notes

**Order of operations:**
1. **Install dependency first** (npm install -D @tailwindcss/container-queries)
2. **Update globals.css** (safe area variables)
3. **Update tailwind.config.ts** (utilities + plugin)
4. **Test that app still builds** (npm run dev)
5. **Create hooks** (useMediaQuery, usePrefersReducedMotion)
6. **Update button.tsx** (critical for all touch targets)
7. **Update input.tsx** (forms need this)
8. **Update select.tsx** (known overflow issue)
9. **Update dropdown-menu.tsx** (collision detection)
10. **Update card.tsx** (spacing consistency)
11. **Update layout.tsx** (viewport-fit + bottom padding)

**Critical path items:**
- Safe area CSS variables (Builder-2 needs pb-safe-b)
- Touch target utilities (Builder-3 needs these)
- Button size updates (affects entire app)

### Patterns to Follow

**Reference patterns.md sections:**
- Pattern 1: Safe Area CSS Variables (globals.css)
- Pattern 4: Button Touch Target Compliance (button.tsx)
- Pattern 5: Input Touch Target (input.tsx)
- Pattern 7: Mobile-First Card Padding (card.tsx)
- Pattern 12: useMediaQuery Hook
- Pattern 13: usePrefersReducedMotion Hook
- Pattern 14: Select Mobile Overflow Fix
- Pattern 15: Dropdown Menu Mobile Touch Targets

**Safe area implementation:**
```css
/* globals.css - Add to @layer base :root */
--safe-area-inset-top: env(safe-area-inset-top, 0px);
--safe-area-inset-right: env(safe-area-inset-right, 0px);
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
--safe-area-inset-left: env(safe-area-inset-left, 0px);

/* Add to @layer utilities */
.safe-area-bottom {
  padding-bottom: max(1rem, var(--safe-area-inset-bottom));
}
```

**Tailwind utilities:**
```typescript
// tailwind.config.ts extend
spacing: {
  'safe-top': 'var(--safe-area-inset-top)',
  'safe-bottom': 'var(--safe-area-inset-bottom)',
},
minHeight: {
  'touch-target': '44px',
  'touch-target-xl': '48px',
},
padding: {
  'safe-t': 'var(--safe-area-inset-top)',
  'safe-b': 'var(--safe-area-inset-bottom)',
},
zIndex: {
  'bottom-nav': '45',
},
```

**Button sizes (mobile-first):**
```typescript
size: {
  default: "h-11 px-4 py-2 sm:h-10",        // 44px → 40px
  sm: "h-10 rounded-lg px-3 sm:h-9",        // 40px → 36px
  lg: "h-12 rounded-lg px-8 sm:h-11",       // 48px → 44px
  icon: "h-11 w-11 sm:h-10 sm:w-10",        // 44x44 → 40x40
},
```

### Testing Requirements

**Manual testing:**
- [ ] npm run dev starts successfully
- [ ] No TypeScript errors
- [ ] Buttons look correct on mobile (375px) and desktop (1280px)
- [ ] Select dropdowns don't overflow viewport
- [ ] Card padding looks good on mobile (16px not cramped)

**Visual QA pages:**
- Dashboard (/dashboard) - Check buttons, cards
- Transactions (/transactions) - Check list, buttons
- Settings (/settings) - Check form inputs

**Browser DevTools:**
- Test at 375px (iPhone SE)
- Test at 1280px (Desktop)
- Verify responsive breakpoints work (sm:, lg:)

### Potential Split Strategy

**If complexity overwhelms (>7 hours estimated):**

**Foundation Sub-Builder (Primary):** 3-4 hours
- Install @tailwindcss/container-queries
- Update globals.css (safe areas)
- Update tailwind.config.ts (utilities)
- Create hooks (useMediaQuery, usePrefersReducedMotion)
- Update layout.tsx (viewport-fit, bottom padding)

**UI Components Sub-Builder (Secondary):** 3-4 hours
- Update button.tsx (touch targets)
- Update input.tsx (height, inputMode)
- Update select.tsx (overflow fix)
- Update dropdown-menu.tsx (collision)
- Update card.tsx (spacing)

**Handoff:** Foundation sub-builder finishes, UI sub-builder uses new utilities.

**Recommended:** Keep as single builder unless you're running out of time at 4-hour mark.

---

## Builder-2: Bottom Navigation

### Scope

You are responsible for creating the mobile bottom navigation bar: the BottomNavigation component, MoreSheet component, useScrollDirection hook, and integration with the dashboard layout.

**Why you're critical:** Bottom navigation is THE cornerstone feature of mobile-first architecture. Without this, mobile users have no thumb-zone navigation.

### Complexity Estimate

**MEDIUM-HIGH** (5-6 hours)

**Reasoning:**
- Multiple interconnected components (nav, sheet, hook)
- Scroll behavior detection (iOS Safari quirks)
- Z-index coordination (must test with modals)
- Animation smoothness (60fps requirement)
- Safe area handling (depends on Builder-1)

### Success Criteria

- [ ] BottomNavigation component renders on mobile (<768px)
- [ ] Hidden on desktop (≥768px) with lg:hidden
- [ ] All 5 tabs visible: Dashboard, Transactions, Budgets, Goals, More
- [ ] Active state highlights current route correctly
- [ ] Scroll-hide behavior works (hide on down, show on up, always show at top)
- [ ] No jank during scroll (60fps target)
- [ ] MoreSheet opens when "More" tab tapped
- [ ] MoreSheet displays 4-5 overflow items (Recurring, Analytics, Accounts, Settings, Admin)
- [ ] Safe area padding applied (pb-safe-b)
- [ ] Z-index correct (z-45, above content, below modals)
- [ ] Navigation works (tapping tab changes route)
- [ ] Dark mode styling correct

### Files to Create

**New Components:**
```
src/components/mobile/BottomNavigation.tsx  (~150-200 lines)
src/components/mobile/MoreSheet.tsx         (~100-150 lines)
src/components/mobile/NavItem.tsx           (~50-80 lines) [OPTIONAL]
```

**New Hook:**
```
src/hooks/useScrollDirection.ts             (~80-120 lines)
```

### Files to Modify

**Layout Integration:**
```
src/app/(dashboard)/layout.tsx              (+10 lines: import + render BottomNavigation)
```

### Dependencies

**Depends on Builder-1:**
- Safe area utilities (pb-safe-b)
- Z-index utilities (z-bottom-nav or z-[45])
- Viewport-fit=cover meta tag

**Can start in parallel:** Yes, if you use inline safe area CSS as temporary solution

**Temporary workaround:**
```tsx
// Temporary (until Builder-1 finishes)
<nav className="pb-[calc(1rem+env(safe-area-inset-bottom))]">

// Final (after Builder-1)
<nav className="pb-safe-b">
```

### Implementation Notes

**Component structure:**

**BottomNavigation.tsx:**
- Client component ('use client')
- usePathname for active state
- useScrollDirection for auto-hide
- Framer Motion for slide animation
- 5 tabs + More button

**MoreSheet.tsx:**
- Extend Radix Dialog (don't install new package)
- Bottom sheet styling (fixed bottom-0, rounded-t-2xl)
- Safe area padding (pb-safe-b)
- Navigation items (Recurring, Analytics, Accounts, Settings, Admin)
- Close on item tap

**useScrollDirection.ts:**
- Detect scroll direction (up/down)
- Threshold: 80px
- isAtTop detection (always show nav at top)
- requestAnimationFrame throttling
- Passive scroll listener

**Order of operations:**
1. **Create useScrollDirection hook** (test standalone first)
2. **Create BottomNavigation component** (static first, no scroll behavior)
3. **Add scroll behavior** (integrate hook)
4. **Create MoreSheet component** (test standalone)
5. **Integrate MoreSheet** (wire up to More button)
6. **Integrate with layout.tsx** (render below main content)
7. **Test z-index** (open modals, verify stacking)
8. **Test dark mode** (all states)

**Critical considerations:**

**Z-Index hierarchy:**
```
z-100: Toasts
z-50:  Modals, Dialogs, Dropdowns
z-45:  Bottom Navigation ← YOU
z-40:  Sidebar overlay
z-0:   Main content
```

**Scroll behavior edge cases:**
- iOS Safari rubber-band bounce (overscroll detection)
- Rapid scroll direction changes (hysteresis)
- Programmatic scrolling (ignore)
- Initial render (show nav)

**MoreSheet items:**
```tsx
<MoreSheetItem href="/recurring" icon={Calendar}>
  Recurring Transactions
</MoreSheetItem>
<MoreSheetItem href="/analytics" icon={BarChart3}>
  Analytics
</MoreSheetItem>
<MoreSheetItem href="/accounts" icon={Wallet}>
  Accounts
</MoreSheetItem>
<MoreSheetItem href="/settings" icon={Settings}>
  Settings
</MoreSheetItem>
{/* TODO: Add role check for admin */}
<MoreSheetItem href="/admin" icon={Shield}>
  Admin
</MoreSheetItem>
```

### Patterns to Follow

**Reference patterns.md sections:**
- Pattern 2: Bottom Navigation with Safe Area
- Pattern 3: Main Content Clearance (layout.tsx)
- Pattern 9: MoreSheet Component
- Pattern 10: Bottom Sheet Animation
- Pattern 11: useScrollDirection Hook
- Pattern 16: Z-Index Reference
- Pattern 17: GPU-Accelerated Animations
- Pattern 18: Passive Event Listeners

**BottomNavigation animation:**
```tsx
const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 80 })
const showNav = scrollDirection === 'up' || isAtTop

<motion.nav
  animate={{ y: showNav ? 0 : 80 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
  style={{ willChange: 'transform' }}
  className="fixed bottom-0 inset-x-0 z-[45] lg:hidden pb-safe-b"
>
```

**MoreSheet positioning:**
```tsx
<DialogContent
  className={cn(
    "fixed bottom-0 left-0 right-0 top-auto",
    "rounded-t-2xl rounded-b-none",
    "pb-safe-b",
    "max-h-[80vh]",
  )}
>
```

### Testing Requirements

**Functional testing:**
- [ ] Tap each tab → navigates to correct route
- [ ] Active tab highlights correctly
- [ ] Scroll down → nav hides smoothly
- [ ] Scroll up → nav shows smoothly
- [ ] At top of page → nav always visible
- [ ] Tap More → sheet opens
- [ ] Tap sheet item → navigates + sheet closes
- [ ] Tap outside sheet → sheet closes

**Visual testing:**
- [ ] Mobile (375px): All 5 tabs visible, not cramped
- [ ] Desktop (1280px): Bottom nav hidden (lg:hidden works)
- [ ] Dark mode: Colors correct, contrast good
- [ ] Safe area: No content hidden on iPhone 14 Pro

**Performance testing:**
- [ ] Scroll performance: No jank, smooth 60fps
- [ ] Animation performance: Smooth hide/show transition
- [ ] No console errors or warnings

**Z-index testing:**
- [ ] Open transaction modal → bottom nav behind overlay ✅
- [ ] Open dropdown menu → dropdown above bottom nav ✅
- [ ] Trigger toast → toast above everything ✅
- [ ] Open sidebar (mobile) → overlay doesn't hide bottom nav ✅

**Real device testing (if available):**
- [ ] iPhone 14 Pro: Safe area inset-bottom respected
- [ ] Android with gesture nav: Safe area respected
- [ ] Touch targets feel comfortable (not too small)

### Potential Split Strategy

**If complexity overwhelms (>6 hours estimated):**

**Bottom Nav Sub-Builder (Primary):** 3-4 hours
- Create useScrollDirection hook
- Create BottomNavigation component
- Add scroll-hide behavior
- Integrate with layout.tsx
- Test z-index, scroll performance

**More Sheet Sub-Builder (Secondary):** 2-3 hours
- Create MoreSheet component
- Wire up to More button
- Add navigation items
- Test dark mode, safe areas

**Handoff:** BottomNavigation component renders with static More button. More sheet sub-builder makes it functional.

**Recommended:** Keep as single builder. More sheet is straightforward once bottom nav works.

---

## Builder-3: Layout & Touch Target Fixes

### Scope

You are responsible for applying mobile-first patterns across the dashboard: viewport overflow fixes, touch target compliance sweep, responsive spacing updates, and visual QA.

**Why you're critical:** You're the "polish" builder. Builder-1 creates utilities, you apply them everywhere. Builder-2 creates bottom nav, you make sure it doesn't break layouts.

### Complexity Estimate

**MEDIUM** (3-4 hours)

**Reasoning:**
- Systematic application of existing patterns (not creating new)
- Multiple files but similar changes (p-4 sm:p-6 pattern)
- Visual QA required (check 10+ pages)
- Lower risk (mostly CSS changes, no new components)

### Success Criteria

- [ ] Zero horizontal scrollbars on 375px viewport (all 11 dashboard routes)
- [ ] All buttons meet 44x44px minimum (manual audit)
- [ ] DashboardStats uses 2-column layout on mobile (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
- [ ] All cards use mobile-first padding (p-4 sm:p-6)
- [ ] Transaction card action buttons updated (h-11 w-11 sm:h-8 sm:w-8)
- [ ] Sidebar navigation items have 48px touch targets (py-3)
- [ ] No layout breaks on 375px, 768px, 1280px viewports
- [ ] Dark mode works on all updated components

### Files to Create

**None!** You only modify existing files.

### Files to Modify

**Dashboard Components:**
```
src/components/dashboard/DashboardStats.tsx     (~5 lines: grid responsive)
src/components/dashboard/RecentTransactionsCard.tsx  (~2 lines: verify padding)
src/components/dashboard/DashboardSidebar.tsx   (~5 lines: nav item touch targets)
```

**Transaction Components:**
```
src/components/transactions/TransactionCard.tsx  (~10 lines: action button sizes)
```

**Other UI Components (if not done by Builder-1):**
```
src/components/ui/card.tsx                      (~4 lines: p-4 sm:p-6)
```

**Dashboard Routes (audit for overflow):**
```
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/transactions/page.tsx
src/app/(dashboard)/budgets/page.tsx
src/app/(dashboard)/goals/page.tsx
src/app/(dashboard)/recurring/page.tsx
src/app/(dashboard)/analytics/page.tsx
src/app/(dashboard)/accounts/page.tsx
src/app/(dashboard)/settings/page.tsx
src/app/(dashboard)/account/page.tsx
src/app/(dashboard)/admin/page.tsx
src/app/(dashboard)/admin/users/page.tsx
```

### Dependencies

**Depends on Builder-1:**
- Touch target utilities (min-h-touch-target)
- Mobile-first spacing patterns established
- Button component already updated

**Can start:** After Builder-1 completes foundation work (~3-4 hours in)

### Implementation Notes

**Order of operations:**
1. **Audit dashboard routes** (open each at 375px, note overflow issues)
2. **Fix DashboardStats grid** (most visible component)
3. **Update TransactionCard action buttons** (common component)
4. **Update DashboardSidebar nav items** (touch targets)
5. **Verify card padding** (should be done by Builder-1, double-check)
6. **Visual QA pass** (all 11 routes at 375px, 768px, 1280px)

**Common fixes:**

**Viewport overflow:**
```tsx
// BEFORE: Desktop-first, might overflow
<div className="flex gap-6">

// AFTER: Mobile-first, stack on mobile
<div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
```

**Touch targets:**
```tsx
// BEFORE: Too small on mobile
<Button size="icon" className="h-8 w-8">

// AFTER: Mobile-first
<Button size="icon" className="h-11 w-11 sm:h-8 sm:w-8">
```

**Grid layouts:**
```tsx
// BEFORE: Desktop-first
<div className="grid grid-cols-4 gap-4">

// AFTER: Mobile-first
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Sidebar nav items:**
```tsx
// BEFORE: py-2 (~40px, below WCAG)
<Link className="flex items-center gap-3 px-3 py-2">

// AFTER: py-3 (~48px, exceeds WCAG)
<Link className="flex items-center gap-3 px-3 py-3">
```

### Patterns to Follow

**Reference patterns.md sections:**
- Pattern 6: Navigation Item Touch Target
- Pattern 7: Mobile-First Card Padding
- Pattern 8: Grid Responsive Layout

**DashboardStats update:**
```tsx
<motion.div
  className={cn(
    "grid gap-4",
    "grid-cols-1",           // Mobile: 1 column
    "sm:grid-cols-2",        // Tablet: 2 columns
    "lg:grid-cols-4",        // Desktop: 4 columns
  )}
>
```

**TransactionCard action buttons:**
```tsx
<div className="flex flex-col gap-2 sm:gap-1">
  <Button
    variant="ghost"
    size="icon"
    className="h-11 w-11 sm:h-8 sm:w-8"  // Mobile-first
  >
    <Edit className="h-5 w-5 sm:h-4 sm:w-4" />
  </Button>
</div>
```

### Testing Requirements

**Visual QA (all 11 routes):**
- [ ] /dashboard - No overflow, stats grid 1-col mobile
- [ ] /transactions - Cards stack well, buttons touchable
- [ ] /budgets - No horizontal scroll, touch targets good
- [ ] /goals - Layout works on mobile
- [ ] /recurring - Forms/inputs mobile-friendly
- [ ] /analytics - Charts fit viewport (may need work in iteration 15)
- [ ] /accounts - Table/list mobile layout
- [ ] /settings - Forms mobile-optimized
- [ ] /account - Profile page mobile layout
- [ ] /admin - Admin pages mobile-usable
- [ ] /admin/users - User table mobile layout

**Touch target audit:**
- [ ] All buttons ≥44x44px (use browser inspector)
- [ ] Sidebar nav items 48px height
- [ ] Bottom nav tabs 48px height (Builder-2's work, verify)
- [ ] Form inputs 48px height (Builder-1's work, verify)

**Viewport testing:**
- [ ] 375px (iPhone SE): No horizontal scroll
- [ ] 390px (iPhone 14 Pro): No horizontal scroll
- [ ] 768px (iPad): Layout shifts to tablet mode
- [ ] 1280px (Desktop): Full desktop layout

**Dark mode:**
- [ ] All updated components work in dark mode
- [ ] No contrast issues on updated buttons/cards

### Potential Split Strategy

**Not recommended.** This builder is already scoped to 3-4 hours of systematic work. Splitting would add coordination overhead.

**If you must split:**

**Layout Sub-Builder:** 2 hours
- Audit all 11 routes for overflow
- Fix DashboardStats grid
- Fix common layout issues

**Touch Target Sub-Builder:** 2 hours
- Update TransactionCard buttons
- Update DashboardSidebar nav items
- Audit all buttons for WCAG compliance

---

## Builder Execution Order

### Parallel Group 1 (Start Immediately)

**Builder-1: Foundation & UI Primitives**
- **Start:** Immediately
- **Duration:** 6-7 hours
- **Blocking:** Builder-3 (Builder-3 needs utilities)
- **Not blocking:** Builder-2 (can work in parallel with workaround)

**Builder-2: Bottom Navigation**
- **Start:** Immediately (or 1 hour after Builder-1 if you want safe area utils)
- **Duration:** 5-6 hours
- **Blocking:** None
- **Dependencies:** Minimal (can use inline CSS for safe areas)

### Parallel Group 2 (After Builder-1 Foundation Complete)

**Builder-3: Layout & Touch Target Fixes**
- **Start:** After Builder-1 completes foundation work (~3-4 hours)
- **Duration:** 3-4 hours
- **Blocking:** None
- **Dependencies:** Builder-1 utilities

### Total Timeline

**Sequential (worst case):** 14-17 hours
**Parallel (best case):** 7-8 hours wall time

**Recommended parallel strategy:**
- Builder-1 + Builder-2 start simultaneously
- Builder-3 starts at hour 4 (when Builder-1 has utilities ready)
- Builder-1 finishes at hour 6-7
- Builder-2 finishes at hour 5-6
- Builder-3 finishes at hour 7-8 (started later)

**Wall time:** ~7-8 hours with 3 parallel builders

---

## Integration Notes

### Shared Files

**File: `src/app/(dashboard)/layout.tsx`**
- **Builder-1:** Adds `pb-24 lg:pb-8` to main container
- **Builder-2:** Adds `<BottomNavigation />` component below main
- **Conflict risk:** LOW (different sections of file)
- **Resolution:** Builder-2 merges after Builder-1

**File: `src/components/ui/button.tsx`**
- **Builder-1:** Updates size variants (h-11 sm:h-10 pattern)
- **Builder-3:** Validates touch targets (no code changes, just testing)
- **Conflict risk:** NONE (Builder-3 only validates)

**File: `tailwind.config.ts`**
- **Builder-1:** Adds all utilities (append-only)
- **Conflict risk:** NONE (no other builder modifies)

### Merge Order

1. **Builder-1 commits first** (foundation)
2. **Builder-2 commits second** (bottom nav uses foundation)
3. **Builder-3 commits last** (applies patterns everywhere)

### Testing After Integration

**Integration testing checklist:**
- [ ] npm run build succeeds
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bottom nav appears on mobile, hidden on desktop
- [ ] Bottom nav respects safe areas (test on real device)
- [ ] All buttons meet touch target minimum
- [ ] No layout breaks on any dashboard route
- [ ] Dark mode works everywhere
- [ ] Lighthouse mobile score 85+ (target 90+)

---

## Post-Integration Tasks

### Real Device Testing

**Devices needed:**
- iPhone 14 Pro (Dynamic Island, safe-area-inset-top: 59px)
- iPhone SE (small screen 375px, minimal safe area)
- Android mid-range (gesture nav, safe-area-inset-bottom: 24px)

**Testing process:**
```bash
npm run dev
ngrok http 3000
# Access from devices via ngrok URL
```

**Test checklist:**
- [ ] Safe areas respected (no content hidden)
- [ ] Bottom nav visible and touchable
- [ ] Touch targets feel comfortable
- [ ] Scroll behavior smooth (no jank)
- [ ] Forms usable (keyboard doesn't cover content)

### Lighthouse Audit

```bash
npm run build
npm start
lighthouse http://localhost:3000/dashboard --preset=mobile --view
```

**Target scores:**
- Performance: 85+ (target 90+ in iteration 15)
- Accessibility: 100
- Best Practices: 95+
- SEO: 100

### Documentation

**Create files:**
- `/docs/mobile-patterns.md` - Copy from iteration plan patterns.md
- `/docs/z-index-hierarchy.md` - Document z-index reference

**Update files:**
- `README.md` - Add mobile optimization notes
- `CONTRIBUTING.md` - Add mobile-first CSS guidelines

---

## Success Metrics

### Quantitative

- **Touch target compliance:** 100% (all interactive elements ≥44x44px)
- **Layout breaks:** 0 (no horizontal scroll on 375px+)
- **Lighthouse mobile:** 85+ Performance, 100 Accessibility
- **CLS:** <0.1 (no layout shift)
- **FPS:** 60fps during scroll and animations

### Qualitative

- [ ] Bottom nav feels native (smooth, responsive)
- [ ] Touch targets feel comfortable (not cramped or awkward)
- [ ] Layouts feel "designed for mobile" (not shrunk desktop)
- [ ] Safe areas respected (no content hidden on notch/gesture bar)
- [ ] No jank during scroll (smooth 60fps)

---

## Risk Mitigation

### Builder-1 Risks

**RISK:** Breaking desktop layouts with mobile-first CSS
- **Mitigation:** Test both 375px and 1280px after each change
- **Rollback:** Use responsive utilities (sm:, lg:) to preserve desktop

### Builder-2 Risks

**RISK:** iOS Safari scroll jank
- **Mitigation:** Overscroll detection, requestAnimationFrame throttling
- **Testing:** Real iPhone device (not simulator)

**RISK:** Z-index conflicts with modals
- **Mitigation:** Use z-45, test with all modal types
- **Testing:** Open every modal/dropdown with bottom nav visible

### Builder-3 Risks

**RISK:** Missing touch target violations
- **Mitigation:** Systematic audit with browser inspector
- **Testing:** Check computed height of every button

---

## Builder Communication

### Handoff Protocol

**Builder-1 → Builder-2:**
- "Safe area utilities ready (pb-safe-b, pt-safe-t)"
- "Z-index hierarchy documented (use z-[45] for bottom nav)"
- "Viewport-fit=cover added to layout.tsx"

**Builder-1 → Builder-3:**
- "Touch target utilities ready (min-h-touch-target)"
- "Button component updated (h-11 sm:h-10 pattern)"
- "Card padding pattern established (p-4 sm:p-6)"

**Builder-2 → Builder-3:**
- "Bottom nav uses 80px height (64px + 16px safe area)"
- "Main content needs pb-24 clearance (already done by Builder-1)"
- "Test bottom nav doesn't break when you update layouts"

### Conflict Resolution

**If multiple builders modify same file:**
1. **Pause** - Don't force push
2. **Communicate** - Which builder has priority?
3. **Merge** - Senior builder merges junior's changes
4. **Test** - Both builders verify changes work together

**File ownership:**
- Builder-1 owns: globals.css, tailwind.config.ts, layout.tsx (first pass)
- Builder-2 owns: BottomNavigation.tsx, MoreSheet.tsx, layout.tsx (second pass)
- Builder-3 owns: All dashboard components (TransactionCard, DashboardStats, etc.)

---

## Final Checklist

### Before Marking Complete

**Builder-1:**
- [ ] All utilities added and working
- [ ] Hooks created and tested
- [ ] UI components updated with mobile-first patterns
- [ ] No TypeScript errors
- [ ] App builds successfully

**Builder-2:**
- [ ] Bottom nav renders on mobile, hidden on desktop
- [ ] Scroll-hide behavior works smoothly
- [ ] MoreSheet opens/closes correctly
- [ ] Safe areas respected
- [ ] Z-index correct (below modals, above content)

**Builder-3:**
- [ ] All 11 dashboard routes audited
- [ ] No horizontal scrollbars on mobile
- [ ] Touch targets meet WCAG standards
- [ ] Visual QA complete (375px, 768px, 1280px)
- [ ] Dark mode works on all updated components

### Integration Complete

- [ ] All builders merged to feature branch
- [ ] No merge conflicts
- [ ] npm run build succeeds
- [ ] npm run lint passes
- [ ] Real device testing complete
- [ ] Lighthouse audit 85+ Performance, 100 Accessibility
- [ ] Ready for production deployment

---

**Builder Tasks Complete**

All builders have clear scope, success criteria, patterns to follow, and testing requirements. Execute in parallel for maximum efficiency.

**Estimated completion:** 7-8 hours wall time (with 3 parallel builders)

**Good luck, builders!**
