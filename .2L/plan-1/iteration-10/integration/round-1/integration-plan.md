# Integration Plan - Round 1

**Created:** 2025-10-03T00:00:00Z
**Iteration:** plan-1/iteration-10
**Total builders to integrate:** 6 builders (1 primary + 2 sub-builders + 3 parallel)

---

## Executive Summary

Integration of comprehensive Dashboard UX & Visual Polish transformation with 6 builder outputs creating 40+ modified files across foundation, UI primitives, dashboard components, and page-level enhancements. Key challenge is managing overlapping changes to shared components (PageTransition, AffirmationCard) and ensuring consistent visual warmth across all touchpoints.

Key insights:
- Builder-1 created foundation (Tailwind config, animations, useReducedMotion hook) that ALL other builders depend on
- Multiple builders modified same components (PageTransition updated by Builder-1B, used by Builder-2/3/4; AffirmationCard enhanced by both Builder-1B and Builder-2)
- UI primitive updates cascade to 91 components across the app (Button, Card, Input changes affect entire codebase)
- PageTransition rollout spans 17+ pages across Builder-3 and Builder-4 with potential for consistent application

---

## Builders to Integrate

### Primary Builders
- **Builder-1:** Foundation & Animation Infrastructure - Status: SPLIT
- **Builder-2:** Dashboard Transformation (Affirmation-First Hierarchy) - Status: COMPLETE
- **Builder-3:** Visual Warmth Rollout (Settings & Account Pages) - Status: COMPLETE
- **Builder-4:** Animation System & PageTransition Rollout - Status: COMPLETE

### Sub-Builders (Builder-1 Split)
- **Builder-1A:** Form Controls Enhancement - Status: COMPLETE
- **Builder-1B:** Layout & Feedback Components Enhancement - Status: COMPLETE

**Total outputs to integrate:** 6 builder reports

---

## Integration Zones

### Zone 1: Foundation Infrastructure (Tailwind, Animations, Accessibility)

**Builders involved:** Builder-1

**Conflict type:** None (owned exclusively by Builder-1)

**Risk level:** LOW

**Description:**
Builder-1 created the foundational design system infrastructure that all other builders depend on. This includes Tailwind config expansion (terracotta/dusty-blue/muted gold palettes, soft shadow utilities, rounded-warmth, animation keyframes), global CSS updates (semantic tokens, dark mode overrides, prefers-reduced-motion fallback), useReducedMotion hook for accessibility, and animations.ts library expansion (15+ variants).

**Files affected:**
- `tailwind.config.ts` - Extended with 3 new color palettes, 4 shadow utilities, rounded-warmth, animation keyframes
- `src/app/globals.css` - Added semantic tokens (--affirmative, --analytical, --gentle-warning), dark mode overrides, global typography (serif headings, line-height 1.6), prefers-reduced-motion CSS fallback
- `src/lib/useReducedMotion.ts` - NEW accessibility hook (SSR-safe, listens for preference changes)
- `src/lib/animations.ts` - Expanded with 15+ animation variants (getPageTransition, dashboardEntrance, affirmationEntrance, cardHoverSubtle, cardHoverElevated, buttonHover, buttonPrimary, inputFocus, successBounce, errorShake, loadingPulse)

**Integration strategy:**
1. Merge Builder-1 foundation files FIRST (highest priority, blocks all others)
2. Verify Tailwind config syntax valid: `npx tailwindcss -o test.css` (dry run)
3. Verify TypeScript compilation: `npx tsc --noEmit`
4. Test color palette rendering: Check that terracotta-500, dusty-blue-500, gold-500 classes work
5. Test shadow utilities: Verify shadow-soft, shadow-soft-md, shadow-soft-lg, shadow-soft-xl render
6. Test useReducedMotion hook: Import in test component, verify returns boolean
7. Test animations.ts exports: Import variants, verify no TypeScript errors

**Expected outcome:**
Foundation complete and functional. All Tailwind utilities available, useReducedMotion hook tested, animation variants ready for use by other builders.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (no conflicts, straightforward merge)

---

### Zone 2: UI Primitive Components (Button, Card, Input, Dialog, etc.)

**Builders involved:** Builder-1A (Form Controls), Builder-1B (Layout & Feedback)

**Conflict type:** Independent file modifications (different components)

**Risk level:** LOW

**Description:**
Builder-1A and Builder-1B updated 24 UI primitive components with visual warmth (rounded-lg, shadow-soft, serif typography, gentle transitions). Builder-1A handled form controls (Button, Input, Textarea, Select, Checkbox, Label). Builder-1B handled layout/feedback (Card, Dialog, AlertDialog, Popover, DropdownMenu, Tabs, Toast, StatCard, PageTransition, AffirmationCard, Progress, Skeleton, Badge, Separator, EncouragingProgress, ProgressRing).

**Files affected:**

**Builder-1A (6 files):**
- `src/components/ui/button.tsx` - rounded-lg, destructive uses terracotta-500, hover scale 1.02 + shadow glow, transition-all duration-200
- `src/components/ui/input.tsx` - rounded-lg, shadow-soft (no border), focus-visible:shadow-soft-md, transition-all duration-200
- `src/components/ui/textarea.tsx` - rounded-lg, shadow-soft, focus-visible:shadow-soft-md, transition-all duration-200
- `src/components/ui/select.tsx` - SelectTrigger shadow-soft rounded-lg, SelectContent shadow-soft-md rounded-lg
- `src/components/ui/checkbox.tsx` - transition-all duration-200 (gentle check animation)
- `src/components/ui/label.tsx` - No changes needed (verified)

**Builder-1B (14 files):**
- `src/components/ui/card.tsx` - shadow-sm → shadow-soft, CardTitle font-serif, CardDescription leading-relaxed
- `src/components/ui/dialog.tsx` - shadow-soft-xl, rounded-lg, DialogTitle font-serif
- `src/components/ui/alert-dialog.tsx` - shadow-soft-xl, rounded-lg, AlertDialogTitle font-serif
- `src/components/ui/popover.tsx` - shadow-soft-md, rounded-lg
- `src/components/ui/dropdown-menu.tsx` - shadow-soft-md, rounded-lg, menu items rounded-md duration-150
- `src/components/ui/toast.tsx` - shadow-soft-lg, rounded-lg
- `src/components/ui/tabs.tsx` - TabsTrigger rounded-md (from rounded-sm), shadow-soft active, duration-200
- `src/components/ui/stat-card.tsx` - value text-3xl → text-2xl (visual balance)
- `src/components/ui/page-transition.tsx` - useReducedMotion hook integrated, duration prop added ('normal' | 'slow')
- `src/components/ui/affirmation-card.tsx` - 1.5x larger (text-2xl → text-3xl → text-4xl responsive), rounded-warmth, shadow-soft-lg, enhanced gradient
- `src/components/ui/progress.tsx` - Verified appropriate (no changes)
- `src/components/ui/skeleton.tsx` - Verified appropriate (no changes)
- `src/components/ui/badge.tsx` - Verified appropriate (no changes)
- `src/components/ui/separator.tsx` - Verified appropriate (no changes)
- `src/components/ui/encouraging-progress.tsx` - Verified warm colors (no changes)
- `src/components/ui/progress-ring.tsx` - Verified sage tones only (no changes)

**Integration strategy:**
1. Merge Builder-1A form controls (6 files)
2. Merge Builder-1B layout/feedback (14 files)
3. Verify no file conflicts: Builder-1A and Builder-1B modified different files (no overlap)
4. Test each component category:
   - Form controls: Test transaction form, account form, settings forms
   - Layout: Test dashboard cards, modals, dropdowns
   - Feedback: Test toast notifications, loading skeletons
5. Verify TypeScript compilation: `npx tsc --noEmit`
6. Visual test: Check that all buttons have rounded-lg, all cards have shadow-soft, all inputs have focus glow
7. Dark mode test: Toggle theme, verify shadows visible but subtle

**Expected outcome:**
All 24 UI primitives updated with visual warmth. Components automatically cascade warmth to all consumers across the app (91 total components benefit from these primitive updates).

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (no conflicts between 1A and 1B, different files)

---

### Zone 3: PageTransition Component Overlap

**Builders involved:** Builder-1B, Builder-2, Builder-3, Builder-4

**Conflict type:** Shared component modifications + extensive usage rollout

**Risk level:** MEDIUM

**Description:**
PageTransition component updated by Builder-1B to use useReducedMotion hook and accept duration prop. Then used extensively by Builder-2 (Dashboard page with duration="slow"), Builder-3 (11 Settings/Account pages), and Builder-4 (17 pages including auth, detail pages, feature pages). Potential for inconsistent usage or missing imports.

**Files affected:**
- `src/components/ui/page-transition.tsx` - Updated by Builder-1B with useReducedMotion hook, duration prop
- `src/app/(dashboard)/dashboard/page.tsx` - Builder-2 wrapped with PageTransition duration="slow"
- Settings/Account pages (11 files) - Builder-3 wrapped with PageTransition
- Feature/Auth/Detail pages (17 files) - Builder-4 wrapped with PageTransition

**Integration strategy:**
1. Merge Builder-1B's PageTransition update FIRST (provides enhanced component)
2. Verify PageTransition component works:
   - Import useReducedMotion hook correctly
   - Accept duration prop ('normal' | 'slow')
   - Render children without errors
3. Merge Builder-2's Dashboard page usage (duration="slow")
4. Merge Builder-3's Settings/Account page wrappers (default duration)
5. Merge Builder-4's remaining page wrappers (default duration)
6. Test navigation flow:
   - Dashboard loads with 500ms transition (slow)
   - Settings/Account pages load with 300ms transition (normal)
   - All other pages load with 300ms transition (normal)
7. Test prefers-reduced-motion:
   - Enable in Chrome DevTools > Rendering
   - Navigate between all pages
   - Verify instant transitions (no animations)

**Expected outcome:**
PageTransition component enhanced and consistently applied across 28+ pages. Dashboard has 500ms "breath before data" transition, all other pages have 300ms smooth transition. Accessibility respected via useReducedMotion hook.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (many files, but consistent pattern)

---

### Zone 4: AffirmationCard Component Overlap

**Builders involved:** Builder-1B, Builder-2

**Conflict type:** Same file modified by two builders

**Risk level:** HIGH

**Description:**
AffirmationCard component modified by BOTH Builder-1B and Builder-2 with overlapping enhancements. Builder-1B enlarged 1.5x, added rounded-warmth, shadow-soft-lg, enhanced gradient. Builder-2 also enlarged 1.5x, centered content, enhanced gradient. Both builders appear to have implemented same changes independently based on patterns.md specification.

**Files affected:**
- `src/components/ui/affirmation-card.tsx` - Modified by both Builder-1B and Builder-2

**Builder-1B changes:**
- Size: text-2xl → text-3xl → text-4xl responsive
- Padding: p-8 → p-10 → p-12
- Icon: h-6 w-6 → h-8 w-8
- Gradient: via-warm-gray-50 stop added
- Shadow: shadow-soft-lg
- Border-radius: rounded-warmth
- Max-width: max-w-4xl
- Line-height: leading-loose

**Builder-2 changes:**
- Size: text-2xl → text-3xl → text-4xl responsive (SAME)
- Padding: p-8 → p-10 → p-12 (SAME)
- Icon: h-6 w-6 → h-8 w-8 (SAME)
- Gradient: from-sage-50 via-warm-gray-50 to-sage-100 (SAME via stop)
- Shadow: shadow-soft-lg (SAME)
- Border-radius: rounded-warmth (SAME)
- Max-width: max-w-4xl (SAME)
- Line-height: leading-loose (SAME)

**Integration strategy:**
1. Compare both versions of affirmation-card.tsx side-by-side
2. Identify if changes are identical or have subtle differences
3. **Most likely scenario:** Both builders implemented SAME changes (patterns.md was clear)
4. **If identical:** Keep either version (prefer Builder-1B as it was first)
5. **If slight differences:** Merge best of both:
   - Use Builder-1B's version as base
   - Review Builder-2's version for any enhancements
   - Combine if Builder-2 added anything Builder-1B missed
6. Test affirmation card rendering:
   - Check size at 320px, 768px, 1440px
   - Verify centered content
   - Verify gradient smooth
   - Verify shadow-soft-lg visible
   - Verify rounded-warmth (0.75rem)
7. Verify daily rotation logic unchanged (critical for affirmation cycling)

**Expected outcome:**
Single, enhanced AffirmationCard with 1.5x size, centered content, enhanced gradient, rounded-warmth, shadow-soft-lg. Daily rotation logic intact.

**Assigned to:** Integrator-1

**Estimated complexity:** MEDIUM (manual merge required if differences exist)

---

### Zone 5: Dashboard Page Hierarchy & Components

**Builders involved:** Builder-2

**Conflict type:** Independent work (no conflicts)

**Risk level:** LOW

**Description:**
Builder-2 transformed dashboard page to affirmation-first hierarchy and created new FinancialHealthIndicator component. Reordered dashboard hierarchy (Affirmation → Greeting → Health → Transactions → Stats), reduced greeting size (h1 text-3xl → h2 text-2xl), added 500ms page entrance animation.

**Files affected:**
- `src/app/(dashboard)/dashboard/page.tsx` - Reordered hierarchy, updated greeting, added PageTransition duration="slow"
- `src/components/dashboard/FinancialHealthIndicator.tsx` - NEW component (circular gauge, supportive language, empty state handling)
- `src/components/ui/affirmation-card.tsx` - Enhanced (see Zone 4 overlap)

**Integration strategy:**
1. Merge FinancialHealthIndicator.tsx (new file, no conflicts)
2. Merge dashboard/page.tsx updates
3. Verify dashboard hierarchy:
   - Affirmation first (hero position)
   - Greeting below (h2 text-2xl)
   - FinancialHealthIndicator third
   - RecentTransactionsCard fourth
   - DashboardStats fifth (moved lower)
4. Test FinancialHealthIndicator:
   - Empty state (0 budgets): Shows "No budgets set" with CTA
   - With budgets: Circular gauge animates smoothly
   - Supportive language: "Looking good", "Making progress", "Needs attention"
   - Sage colors only (no red/green)
5. Test dashboard page entrance:
   - Verify 500ms transition (duration="slow")
   - Verify smooth fade-in
   - Verify affirmation is LCP (Largest Contentful Paint)

**Expected outcome:**
Dashboard transformed to affirmation-first hierarchy. FinancialHealthIndicator provides gentle financial guidance with supportive language. 500ms "breath before data" page entrance.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (new component + page reorder, no conflicts)

---

### Zone 6: Settings & Account Pages Visual Warmth

**Builders involved:** Builder-3

**Conflict type:** Independent work (no conflicts)

**Risk level:** LOW

**Description:**
Builder-3 applied visual warmth to 11 Settings and Account pages (6 Settings + 5 Account). Wrapped all pages in PageTransition, updated typography (h1/h2/h3 font-serif, leading-relaxed on paragraphs), replaced harsh error states with terracotta warm warnings. Updated 4 components (DangerZone, ProfileSection, CategoryList, CategoryBadge).

**Files affected:**

**Settings Pages (6 files):**
- `src/app/(dashboard)/settings/page.tsx` - PageTransition, font-serif headings, leading-relaxed
- `src/app/(dashboard)/settings/categories/page.tsx` - PageTransition, font-serif, leading-relaxed
- `src/app/(dashboard)/settings/currency/page.tsx` - PageTransition, font-serif, leading-relaxed
- `src/app/(dashboard)/settings/appearance/page.tsx` - Added 'use client', PageTransition, font-serif
- `src/app/(dashboard)/settings/data/page.tsx` - Added 'use client', PageTransition, font-serif
- `src/app/(dashboard)/settings/account/page.tsx` - PageTransition (redirect page)

**Account Pages (5 files):**
- `src/app/(dashboard)/account/page.tsx` - PageTransition, font-serif, leading-relaxed
- `src/app/(dashboard)/account/profile/page.tsx` - Added 'use client', PageTransition, font-serif
- `src/app/(dashboard)/account/membership/page.tsx` - PageTransition, font-serif, leading-relaxed
- `src/app/(dashboard)/account/security/page.tsx` - Added 'use client', PageTransition, font-serif
- `src/app/(dashboard)/account/preferences/page.tsx` - PageTransition, font-serif, leading-relaxed

**Component Updates (4 files):**
- `src/components/settings/DangerZone.tsx` - Terracotta warm warning (from harsh red), shadow-soft, font-serif h3
- `src/components/settings/ProfileSection.tsx` - font-serif h3, terracotta-700 errors, leading-relaxed
- `src/components/categories/CategoryList.tsx` - Terracotta error state, shadow-soft, font-serif h3
- `src/components/categories/CategoryBadge.tsx` - shadow-soft for gentle elevation

**Integration strategy:**
1. Merge all Settings pages (6 files)
2. Merge all Account pages (5 files)
3. Merge component updates (4 files)
4. Verify PageTransition applied to all pages
5. Test navigation: Dashboard → Settings → Account
6. Verify typography:
   - All h1/h2/h3 use font-serif
   - All paragraphs have leading-relaxed
   - Numbers remain font-sans tabular-nums
7. Test error states:
   - DangerZone shows terracotta warning (not harsh red)
   - ProfileSection validation errors use terracotta-700
   - CategoryList error state uses terracotta with shadow-soft
8. Test dark mode: Toggle theme, verify terracotta colors visible

**Expected outcome:**
Settings and Account sections have consistent visual warmth with PageTransition, serif typography, and gentle error states. Terracotta warnings replace harsh red errors across all components.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (systematic updates, no conflicts)

---

### Zone 7: Animation System & PageTransition Rollout (Remaining Pages)

**Builders involved:** Builder-4

**Conflict type:** Independent work (no conflicts)

**Risk level:** LOW

**Description:**
Builder-4 rolled out PageTransition to 17 remaining pages (auth, detail pages, feature pages), enhanced card hover effects, and integrated success animations. Created 2 client wrapper components for server component detail pages. Updated PageTransition component (already handled by Builder-1B in Zone 3).

**Files affected:**

**Auth Pages (3 files):**
- `src/app/(auth)/signin/page.tsx` - Made client component, wrapped PageTransition, updated typography
- `src/app/(auth)/signup/page.tsx` - Made client component, wrapped PageTransition, updated typography
- `src/app/(auth)/reset-password/page.tsx` - Made client component, wrapped PageTransition, updated typography

**Detail Pages (3 files + 2 new client wrappers):**
- `src/app/(dashboard)/accounts/[id]/page.tsx` - Refactored to use AccountDetailClient wrapper
- `src/app/(dashboard)/transactions/[id]/page.tsx` - Refactored to use TransactionDetailClient wrapper
- `src/components/goals/GoalDetailPageClient.tsx` - Wrapped with PageTransition
- `src/components/accounts/AccountDetailClient.tsx` - NEW client wrapper for account detail
- `src/components/transactions/TransactionDetailClient.tsx` - NEW client wrapper for transaction detail

**Card Hover Enhancements (3 files):**
- `src/components/transactions/TransactionCard.tsx` - cardHoverSubtle animation
- `src/components/accounts/AccountCard.tsx` - cardHoverSubtle animation
- `src/components/goals/GoalCard.tsx` - cardHoverElevated animation

**Success Animations (1 file):**
- `src/components/goals/CompletedGoalCelebration.tsx` - successBounce animation, sage palette colors

**Integration strategy:**
1. Merge auth pages (3 files)
2. Merge detail page wrappers (2 new files + 3 modified files)
3. Merge card hover enhancements (3 files)
4. Merge success animations (1 file)
5. Test navigation:
   - Auth flow: signin → signup → reset-password (smooth transitions)
   - Detail pages: accounts list → account detail → back (smooth transitions)
   - Transactions list → transaction detail → back
   - Goals list → goal detail → back
6. Test card hover effects:
   - TransactionCard: subtle lift (y: -2, scale: 1.005)
   - AccountCard: subtle lift (y: -2, scale: 1.005)
   - GoalCard: elevated lift (y: -6, scale: 1.015)
7. Test goal completion celebration:
   - Complete a goal
   - Verify successBounce animation (gentle, not jarring)
   - Verify sage palette colors used
8. Test prefers-reduced-motion:
   - Enable in browser
   - Navigate all pages
   - Hover cards
   - Complete goal
   - Verify all animations disabled

**Expected outcome:**
PageTransition applied to all remaining 17 pages. Card hover effects enhance interactivity. Goal completion celebration uses gentle successBounce animation. All animations respect prefers-reduced-motion.

**Assigned to:** Integrator-1

**Estimated complexity:** LOW (systematic rollout, no conflicts)

---

## Independent Features (Direct Merge)

These builder outputs have no conflicts and can be merged directly:

- **Builder-1:** Foundation (tailwind.config.ts, globals.css, useReducedMotion.ts, animations.ts) - Foundational, no conflicts
- **Builder-2:** FinancialHealthIndicator.tsx - New file, no conflicts
- **Builder-4:** AccountDetailClient.tsx, TransactionDetailClient.tsx - New files, no conflicts

**Assigned to:** Integrator-1 (quick merge alongside Zone work)

---

## Parallel Execution Groups

### Group 1 (Sequential - Foundation First)
- **Integrator-1:** Zone 1 (Foundation) - MUST complete first
- Wait for Zone 1 completion before proceeding

### Group 2 (Parallel - After Foundation)
- **Integrator-1:** Zone 2 (UI Primitives) + Zone 3 (PageTransition) + Zone 4 (AffirmationCard) + Zone 5 (Dashboard) + Zone 6 (Settings/Account) + Zone 7 (Remaining Pages) + Independent features

**Note:** Single integrator recommended due to high interdependencies and relatively small scope (40+ files but clear merge strategy).

---

## Integration Order

**Recommended sequence:**

1. **Zone 1: Foundation** (CRITICAL PATH)
   - Merge Builder-1 foundation files (tailwind.config.ts, globals.css, useReducedMotion.ts, animations.ts)
   - Verify Tailwind config valid, TypeScript compiles, colors/shadows/animations work
   - **Checkpoint:** Foundation functional

2. **Zone 2: UI Primitives**
   - Merge Builder-1A form controls (6 files)
   - Merge Builder-1B layout/feedback (14 files)
   - Verify no file conflicts, test components in isolation
   - **Checkpoint:** All 24 UI primitives updated

3. **Zone 3: PageTransition Component**
   - Merge Builder-1B's PageTransition update
   - Verify useReducedMotion hook integrated, duration prop works
   - **Checkpoint:** PageTransition enhanced and ready for rollout

4. **Zone 4: AffirmationCard Overlap Resolution**
   - Compare Builder-1B and Builder-2 versions side-by-side
   - Merge best version (likely identical, choose one)
   - Test affirmation card rendering
   - **Checkpoint:** AffirmationCard enhanced (single version)

5. **Zone 5: Dashboard Transformation**
   - Merge FinancialHealthIndicator.tsx (new file)
   - Merge dashboard/page.tsx hierarchy update
   - Test dashboard end-to-end
   - **Checkpoint:** Dashboard affirmation-first with FinancialHealthIndicator

6. **Zone 6: Settings/Account Pages**
   - Merge 11 Settings/Account pages
   - Merge 4 component updates (DangerZone, ProfileSection, CategoryList, CategoryBadge)
   - Test navigation and error states
   - **Checkpoint:** Settings/Account warmth complete

7. **Zone 7: Animation System Rollout**
   - Merge auth pages (3 files)
   - Merge detail page wrappers (2 new + 3 modified)
   - Merge card hover enhancements (3 files)
   - Merge success animations (1 file)
   - Test navigation flow, card hovers, goal completion
   - **Checkpoint:** All pages have PageTransition, animations enhanced

8. **Final consistency check**
   - Run full build: `npm run build`
   - Run type check: `npm run type-check`
   - Test navigation: Dashboard → Accounts → Transactions → Goals → Settings → Account
   - Test dark mode: Toggle theme, verify all colors visible
   - Test prefers-reduced-motion: Enable, verify all animations disable
   - Visual regression: Screenshot all major pages (before/after comparison)
   - Move to ivalidator

---

## Shared Resources Strategy

### Shared Types
**Issue:** No overlapping types defined by multiple builders.

**Resolution:** N/A - All builders used existing types or created isolated types.

**Responsible:** N/A

### Shared Utilities
**Issue:** Animation library expanded by Builder-1, used by all others.

**Resolution:**
- Builder-1's animations.ts provides all variants
- All other builders import from `@/lib/animations`
- No duplicate implementations
- Verify imports resolve correctly in all components

**Responsible:** Integrator-1 in Zone 1

### Configuration Files
**Issue:** Multiple builders depended on Tailwind config and globals.css from Builder-1.

**Resolution:**
- Builder-1 owns tailwind.config.ts and globals.css
- All other builders use utilities from Builder-1's config
- No conflicts (Builder-1 merged first, others consume)
- Verify all color classes, shadow utilities, border-radius utilities work

**Responsible:** Integrator-1 in Zone 1

### PageTransition Component
**Issue:** PageTransition updated by Builder-1B, used by Builder-2/3/4.

**Resolution:**
- Builder-1B's version is canonical (merged first)
- Builder-2/3/4 import enhanced PageTransition
- Verify duration prop works ('normal' | 'slow')
- Verify useReducedMotion hook integrated
- Test all page wrappers

**Responsible:** Integrator-1 in Zone 3

### AffirmationCard Component
**Issue:** Modified by both Builder-1B and Builder-2.

**Resolution:**
- Compare both versions side-by-side
- If identical: Keep either version (prefer Builder-1B)
- If different: Merge best of both
- Test affirmation card rendering at all breakpoints
- Verify daily rotation logic intact

**Responsible:** Integrator-1 in Zone 4

---

## Expected Challenges

### Challenge 1: AffirmationCard Merge Conflict
**Impact:** Two builders modified same file with (likely) identical changes. Manual merge required.

**Mitigation:**
- Compare both versions line-by-line
- If identical, choose one (Builder-1B first)
- If different, merge best features
- Test thoroughly at 320px, 768px, 1440px
- Verify gradient, shadow, size, centered content

**Responsible:** Integrator-1 in Zone 4

### Challenge 2: PageTransition Rollout Consistency
**Impact:** PageTransition used across 28+ pages by multiple builders. Risk of inconsistent usage or missing imports.

**Mitigation:**
- Verify every page imports PageTransition correctly
- Verify duration prop usage: Dashboard uses "slow", all others use default "normal"
- Test navigation between ALL pages
- Grep for `<PageTransition` to find all usage
- Verify no pages missing PageTransition that should have it

**Responsible:** Integrator-1 in Zone 3, 5, 6, 7

### Challenge 3: TypeScript Compilation After UI Primitive Changes
**Impact:** Button, Card, Input changes cascade to 91 components. Risk of type errors if component APIs changed.

**Mitigation:**
- Run `npx tsc --noEmit` after Zone 2 merge
- Fix any type errors immediately
- All builders reported TypeScript passing, but verify after integration
- If errors occur, check for prop changes in UI primitives

**Responsible:** Integrator-1 in Zone 2

### Challenge 4: Dark Mode Color Visibility
**Impact:** 3 new color palettes (terracotta, dusty-blue, muted gold) need dark mode overrides. Risk of invisible text/shadows.

**Mitigation:**
- Toggle dark mode after Zone 1 merge
- Verify all new colors visible (terracotta-500, dusty-blue-500, gold-500)
- Verify shadows subtle but present in dark mode
- Check Builder-1's globals.css has .dark overrides for all new colors
- Test on Dashboard, Settings, Account pages

**Responsible:** Integrator-1 in Zone 1, verify in all zones

### Challenge 5: Accessibility - prefers-reduced-motion
**Impact:** useReducedMotion hook is CRITICAL for WCAG 2.1 AA compliance. If broken, animations violate accessibility.

**Mitigation:**
- Test prefers-reduced-motion IMMEDIATELY after Zone 3 (PageTransition merge)
- Enable in Chrome DevTools > Rendering > Emulate CSS media
- Navigate all pages, verify instant transitions (no animations)
- Test card hovers, goal completion, form errors (all animations should disable)
- CSS fallback in globals.css provides belt-and-suspenders

**Responsible:** Integrator-1 in Zone 3, verify in all zones

---

## Success Criteria for This Integration Round

- [ ] All zones successfully resolved (7 zones complete)
- [ ] No duplicate code remaining (AffirmationCard conflict resolved)
- [ ] All imports resolve correctly (animations.ts, useReducedMotion.ts, PageTransition)
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Consistent patterns across integrated code (rounded-lg, shadow-soft, font-serif)
- [ ] No conflicts in shared files (tailwind.config.ts, globals.css owned by Builder-1)
- [ ] All builder functionality preserved (FinancialHealthIndicator, PageTransition, card hovers, warm error states)
- [ ] Dark mode works (all colors visible, shadows subtle)
- [ ] Accessibility validated (prefers-reduced-motion disables all animations)
- [ ] Visual warmth evident (screenshot before/after comparison shows noticeably warmer/gentler app)

---

## Notes for Integrators

**Important context:**
- Builder-1 foundation is CRITICAL PATH - merge first, verify thoroughly before proceeding
- AffirmationCard modified by 2 builders - compare versions carefully, likely identical
- PageTransition rollout spans 28+ pages - test navigation flow comprehensively
- All 24 UI primitives updated - verify TypeScript compiles after merge
- 3 new color palettes - verify dark mode overrides exist and work

**Watch out for:**
- AffirmationCard merge conflict (Zone 4) - manual merge required
- PageTransition import errors across multiple pages (Zone 3, 5, 6, 7)
- TypeScript errors after UI primitive changes (Zone 2)
- Dark mode colors invisible (Zone 1) - verify .dark overrides
- Animations not disabling with prefers-reduced-motion (Zone 3) - test thoroughly

**Patterns to maintain:**
- Reference `patterns.md` for all conventions
- Ensure error handling uses terracotta warm warnings (not harsh red)
- Keep naming conventions aligned (PascalCase components, camelCase functions)
- Maintain typography: font-serif headings, font-sans numbers, leading-relaxed paragraphs
- Maintain shadow hierarchy: shadow-soft (cards), shadow-soft-md (dropdowns), shadow-soft-lg (toast), shadow-soft-xl (modals)
- Maintain animation timing: 150ms (fast), 200ms (UI primitives), 300ms (page transitions), 500ms (dashboard slow)

---

## Next Steps

1. Spawn Integrator-1 to execute all zones sequentially
2. Integrator-1 completes work and creates integration report
3. Proceed to ivalidator for validation

---

## Integration Validation Checkpoints

After each zone, integrator should verify:

**Zone 1 (Foundation):**
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` succeeds
- [ ] Tailwind classes work: terracotta-500, dusty-blue-500, gold-500
- [ ] Shadow utilities work: shadow-soft, shadow-soft-md, shadow-soft-lg, shadow-soft-xl
- [ ] useReducedMotion hook imports successfully
- [ ] animations.ts exports all variants

**Zone 2 (UI Primitives):**
- [ ] All 24 components compile
- [ ] No file conflicts between Builder-1A and Builder-1B
- [ ] Button has rounded-lg, destructive uses terracotta-500
- [ ] Card has shadow-soft, CardTitle uses font-serif
- [ ] Input has shadow-soft, focus-visible:shadow-soft-md
- [ ] Dark mode: Toggle theme, shadows visible

**Zone 3 (PageTransition):**
- [ ] PageTransition component has useReducedMotion hook
- [ ] PageTransition accepts duration prop ('normal' | 'slow')
- [ ] Dashboard loads with 500ms transition
- [ ] Other pages load with 300ms transition
- [ ] prefers-reduced-motion: Animations disable completely

**Zone 4 (AffirmationCard):**
- [ ] Single version of AffirmationCard (conflict resolved)
- [ ] Size: text-2xl → text-3xl → text-4xl responsive
- [ ] Gradient: from-sage-50 via-warm-gray-50 to-sage-100
- [ ] Shadow: shadow-soft-lg
- [ ] Border-radius: rounded-warmth
- [ ] Daily rotation logic intact

**Zone 5 (Dashboard):**
- [ ] Dashboard hierarchy: Affirmation → Greeting → Health → Transactions → Stats
- [ ] Greeting: h2 text-2xl (reduced from h1 text-3xl)
- [ ] FinancialHealthIndicator displays (empty state + with budgets)
- [ ] Circular gauge animates smoothly
- [ ] Supportive language: "Looking good", "Making progress", "Needs attention"
- [ ] 500ms page entrance smooth

**Zone 6 (Settings/Account):**
- [ ] All 11 pages wrapped in PageTransition
- [ ] All h1/h2/h3 use font-serif
- [ ] DangerZone uses terracotta warm warning
- [ ] CategoryList error state uses terracotta
- [ ] Navigation: Dashboard → Settings → Account smooth

**Zone 7 (Animation Rollout):**
- [ ] Auth pages wrapped in PageTransition
- [ ] Detail pages wrapped in PageTransition (via client wrappers)
- [ ] Card hover effects work (TransactionCard, AccountCard, GoalCard)
- [ ] Goal completion uses successBounce animation
- [ ] Navigation flow smooth across all pages
- [ ] prefers-reduced-motion disables all card hovers and success animations

**Final Validation:**
- [ ] Full build: `npm run build` succeeds
- [ ] Type check: `npm run type-check` succeeds
- [ ] Visual regression: Before/after screenshots show noticeably warmer app
- [ ] Dark mode: All colors visible, shadows subtle
- [ ] Accessibility: prefers-reduced-motion disables all animations
- [ ] Performance: Page load < 2s mobile, animations 60fps desktop
- [ ] Navigation: Test full user flow through all sections

---

**Integration Planner:** 2l-iplanner
**Plan created:** 2025-10-03T00:00:00Z
**Round:** 1
**Integrators needed:** 1
**Estimated integration time:** 30-45 minutes
**Risk level:** MEDIUM (AffirmationCard conflict, extensive PageTransition rollout, 40+ files)
