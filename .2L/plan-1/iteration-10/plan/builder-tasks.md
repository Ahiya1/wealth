# Builder Task Breakdown - Iteration 10

## Overview

4 primary builders will work in parallel on Dashboard UX & Visual Polish transformation.
Total estimated: 8-10 hours (3-4 builders working in parallel)

**Builder Assignment Strategy:**
- Builder 1: Foundation & Animation Infrastructure (foundational, must complete first)
- Builder 2: Dashboard Transformation (depends on Builder 1 completing primitives)
- Builder 3: Visual Warmth Rollout (works in parallel with Builder 2 on non-dashboard components)
- Builder 4: Animation System & PageTransition Rollout (can start after Builder 1 completes useReducedMotion hook)

**Complexity Assessment:**
- Master plan estimated 5-7 hours
- Explorers identified 91 components requiring updates (38 in Tier 1)
- Realistic estimate: 8-10 hours for comprehensive warmth transformation
- Recommend parallel execution to meet timeline

---

## Builder-1: Foundation & Animation Infrastructure

### Scope

Establish design system foundation that all other builders depend on:
- Tailwind config expansion (terracotta, dusty-blue, muted gold, soft shadows)
- Animation library expansion (button hover, input focus, success/error states)
- Accessibility implementation (useReducedMotion hook - CRITICAL)
- UI primitive component updates (Button, Card, Input, Dialog, etc.)

This builder owns the foundation. All other builders depend on this work.

### Complexity Estimate

**HIGH** (foundational work affects entire app, must be correct)

**Split Recommendation:** Consider splitting into 2 sub-builders if overwhelming:
- Sub-builder 1A: Tailwind Config + Accessibility Hook (2 hours)
- Sub-builder 1B: UI Primitives Update (2-3 hours)

### Success Criteria

- [ ] Tailwind config includes terracotta, dusty-blue, muted gold palettes
- [ ] Soft shadow utilities (shadow-soft, shadow-soft-md, shadow-soft-lg, shadow-soft-xl) functional
- [ ] Border-radius warmth utility (rounded-warmth) functional
- [ ] Animation keyframes (breathe, gentle-bounce) functional
- [ ] useReducedMotion hook implemented and tested
- [ ] Animation library expanded with 8+ new variants (buttonHover, cardHoverSubtle, inputFocus, successBounce, errorShake, loadingPulse, affirmationEntrance, dashboardEntrance)
- [ ] Button component: rounded-lg, gentle hover (scale 1.02), terracotta destructive variant
- [ ] Card component: shadow-soft, CardTitle uses font-serif
- [ ] Input component: rounded-lg, shadow-soft, focus glow
- [ ] Dialog/Popover/Dropdown: shadow-soft-lg for modals
- [ ] Dark mode tested (all new colors have .dark overrides)
- [ ] Build succeeds (`npm run build`)

### Files to Create

**New Files:**
- `src/lib/useReducedMotion.ts` - Accessibility hook for prefers-reduced-motion detection

### Files to Modify

**Configuration:**
- `tailwind.config.ts` - Add terracotta/dusty-blue/muted gold palettes, soft shadows, border-radius warmth, animation keyframes
- `src/app/globals.css` - Add semantic tokens (--affirmative, --analytical, --gentle-warning), dark mode overrides, prefers-reduced-motion CSS fallback, global line-height 1.6

**Animation Library:**
- `src/lib/animations.ts` - Expand with:
  - `getPageTransition(reducedMotion, duration)` - Configurable page transition
  - `dashboardEntrance(reducedMotion)` - 500ms dashboard entrance
  - `affirmationEntrance` - Hero animation for affirmation card
  - `cardHoverSubtle` - Gentle card lift (y: -2, scale: 1.005)
  - `cardHoverElevated` - Prominent card lift (y: -6, scale: 1.015)
  - `buttonHover` - Scale 1.02 on hover, 0.98 on tap
  - `buttonPrimary` - Button with shadow glow
  - `inputFocus` - Glow effect on input focus
  - `successBounce` - Celebration animation
  - `errorShake` - Validation error shake
  - `loadingPulse` - Gentle pulse for loading states

**UI Primitives (24 components):**
- `src/components/ui/button.tsx` - Change rounded-md → rounded-lg, destructive variant uses terracotta-500, integrate Framer Motion for default variant
- `src/components/ui/card.tsx` - Replace shadow-sm → shadow-soft, CardTitle font-serif
- `src/components/ui/input.tsx` - Change rounded-md → rounded-lg, replace border with shadow-soft, focus glow
- `src/components/ui/textarea.tsx` - Same as input (rounded-lg, shadow-soft)
- `src/components/ui/select.tsx` - Dropdown rounded-lg, shadow-soft-md on open
- `src/components/ui/checkbox.tsx` - Gentle transition (keep small radius)
- `src/components/ui/label.tsx` - Likely no changes (text only)
- `src/components/ui/dialog.tsx` - Modal shadow-soft-xl, rounded-lg
- `src/components/ui/alert-dialog.tsx` - Same as dialog
- `src/components/ui/popover.tsx` - Dropdown shadow-soft-md, rounded-lg
- `src/components/ui/dropdown-menu.tsx` - Menu items gentle hover, rounded
- `src/components/ui/tabs.tsx` - Rounded active tab, soft transition
- `src/components/ui/separator.tsx` - Likely no changes
- `src/components/ui/skeleton.tsx` - Optional: add breathe animation
- `src/components/ui/progress.tsx` - Rounded-full, soft gradient
- `src/components/ui/toast.tsx` - Rounded-lg, shadow-soft-lg
- `src/components/ui/stat-card.tsx` - Reduce value text-3xl → text-2xl, refine gradient
- `src/components/ui/encouraging-progress.tsx` - Verify warm colors
- `src/components/ui/progress-ring.tsx` - Soft colors, no red
- `src/components/ui/page-transition.tsx` - Update to use useReducedMotion hook, accept duration prop

### Dependencies

**Depends on:** None (this is foundational work)

**Blocks:** All other builders (Builder 2, 3, 4 depend on this completing)

### Implementation Notes

**Tailwind Config Additions:**
```typescript
colors: {
  terracotta: { 50-900 scale, hue 20-30, saturation 55-60% },
  'dusty-blue': { 50-900 scale, hue 215, saturation 20-30% },
  gold: { 50-900 scale, hue 45, saturation muted from 74% to 55% },
},
boxShadow: {
  'soft': '0 1px 3px 0 hsl(var(--warm-gray-300) / 0.15), 0 1px 2px 0 hsl(var(--warm-gray-300) / 0.1)',
  // ... soft-md, soft-lg, soft-xl
},
borderRadius: {
  'warmth': '0.75rem',
},
animation: {
  'breathe': 'breathe 3s ease-in-out infinite',
  'gentle-bounce': 'gentleBounce 0.4s ease-out',
},
```

**Accessibility CRITICAL:**
- Implement useReducedMotion hook FIRST before expanding animations
- Test with Chrome DevTools > Rendering > Emulate prefers-reduced-motion
- Verify animations disable completely when preference active
- CSS fallback in globals.css as belt-and-suspenders

**UI Primitives Strategy:**
- Update components in order: Button → Card → Input → Dialog → Others
- Test each component in isolation after update (use existing pages to verify)
- Keep CSS transitions as fallback (progressive enhancement)
- Use Framer Motion only for complex interactions (button primary variant, card hover)

**Dark Mode Testing:**
- Toggle theme after each color addition
- Verify all new colors visible in dark mode
- Shadows should be subtle but present in dark mode

### Patterns to Follow

Reference `patterns.md`:
- Tailwind Configuration Pattern (color palette extension)
- Global CSS Variables (semantic tokens, dark mode overrides)
- Animation Library Pattern (all new variants)
- useReducedMotion Hook (accessibility)
- Button Component Enhancement
- Card Component Enhancement
- Input Component Enhancement
- PageTransition Component Update

### Testing Requirements

**Build & Type Check:**
- [ ] `npm run build` succeeds (verify Tailwind syntax)
- [ ] `npm run type-check` succeeds (verify TypeScript)

**Visual Testing:**
- [ ] Dark mode toggle works (all colors visible)
- [ ] Shadows visible in light mode, subtle in dark mode
- [ ] Button hover states smooth (scale 1.02)
- [ ] Card shadows consistent across all cards
- [ ] Input focus glow visible

**Accessibility Testing:**
- [ ] Chrome DevTools: Emulate prefers-reduced-motion
- [ ] Verify all animations disable when preference active
- [ ] Verify functionality intact without animations
- [ ] Focus rings visible on all buttons/inputs

**Performance Testing:**
- [ ] Chrome DevTools Performance tab: Check for layout thrashing
- [ ] Verify animations use GPU-accelerated properties (transform, opacity)
- [ ] No bundle size increase (Framer Motion already included)

### Potential Split Strategy

**If complexity HIGH and builder overwhelmed:**

**Foundation (Primary Builder 1):** Create before splitting
- Tailwind config expansion (all colors, shadows, animations)
- useReducedMotion hook
- Animation library expansion (all variants in animations.ts)
- globals.css updates (semantic tokens, dark mode)

**Sub-builder 1A: Form Controls** (2 hours)
- Button, Input, Textarea, Select, Checkbox components
- Focus: Rounded-lg, shadow-soft, gentle hover
- Test: Form pages (transactions, accounts, goals)

**Sub-builder 1B: Layout & Feedback** (1.5 hours)
- Card, Dialog, Popover, Dropdown, Toast components
- Progress, Skeleton, StatCard components
- PageTransition component
- Focus: Shadow-soft variants, rounded corners
- Test: Dashboard, modals, loading states

**Estimated Total:** 3-4 hours (primary builder) or 3.5 hours (with split)

---

## Builder-2: Dashboard Transformation

### Scope

Transform dashboard to embody "affirmation-first" emotional support:
- Enlarge and enhance AffirmationCard (1.5x size, centered, enhanced gradient)
- Create new FinancialHealthIndicator component (circular gauge, supportive language)
- Reorder dashboard hierarchy (Affirmation → Greeting → Health → Transactions → Stats)
- Update dashboard page with 500ms entrance animation
- Refine DashboardStats, RecentTransactionsCard styling

This builder creates the showcase for warmth transformation.

### Complexity Estimate

**MEDIUM-HIGH** (new component + page reordering + animation choreography)

**Split Recommendation:** No split needed if builder focused. Estimated 3-4 hours total.

### Success Criteria

- [ ] Dashboard loads with affirmation as FIRST visible element (hero position)
- [ ] Affirmation card 1.5x larger with responsive breakpoints (text-2xl → text-3xl → text-4xl)
- [ ] Affirmation centered, icon enlarged (h-6 w-6 → h-8 w-8)
- [ ] Enhanced gradient (from-sage-50 via-warm-gray-50 to-sage-100)
- [ ] FinancialHealthIndicator component displays correctly
- [ ] Circular gauge animates smoothly (strokeDashoffset animation, 800ms)
- [ ] Supportive language: "Looking good", "Making progress", "Needs attention" (NO red/green)
- [ ] Greeting below affirmation, reduced to text-2xl
- [ ] Dashboard hierarchy: Affirmation → Greeting → Health → Transactions → Stats
- [ ] Page entrance animation 500ms ("breath before data" effect)
- [ ] All components animate smoothly on mobile (tested on Pixel 4a or iPhone 12)
- [ ] Empty state handling for FinancialHealthIndicator (no budgets set)

### Files to Create

**New Components:**
- `src/components/dashboard/FinancialHealthIndicator.tsx` - Circular gauge with budget status, supportive language, empty state handling

### Files to Modify

**Dashboard Page:**
- `src/app/(dashboard)/dashboard/page.tsx` - Reorder hierarchy, add PageTransition duration="slow", reduce greeting size

**Dashboard Components:**
- `src/components/ui/affirmation-card.tsx` - Enlarge 1.5x, center content, enhance gradient, rounded-warmth
- `src/components/dashboard/DashboardStats.tsx` - Minor styling refinement (inherits from stat-card updates)
- `src/components/dashboard/RecentTransactionsCard.tsx` - Minor styling refinement (inherits from card updates)

### Dependencies

**Depends on:** Builder 1 completing UI primitives (Card, Button components)

**Blocks:** None (independent from Builder 3 and 4)

### Implementation Notes

**FinancialHealthIndicator Design:**
- Circular gauge (SVG-based, 40px radius, 8px stroke width)
- Animated with Framer Motion (strokeDashoffset from full to percentage, 800ms ease-out)
- Data: tRPC `budgets.progress.useQuery({ month: currentMonth })`
- Supportive message logic:
  - >= 75% on track: "Looking good" (text-sage-600)
  - >= 50% on track: "Making progress" (text-sage-500)
  - < 50% on track: "Needs attention" (text-warm-gray-600)
  - 0 budgets: "No budgets set" with "Create Budget" CTA
- Colors: Sage tones ONLY (no red/green dichotomy)
- Numbers: font-sans tabular-nums (e.g., "3/5")
- Background: Gradient matching affirmation card (from-sage-50 to-warm-gray-50)

**AffirmationCard Enhancement:**
- Size: text-2xl (mobile) → text-3xl (tablet) → text-4xl (desktop)
- Padding: p-8 (mobile) → p-10 (tablet) → p-12 (desktop)
- Icon: h-6 w-6 (mobile) → h-8 w-8 (desktop)
- Gradient: Add via-warm-gray-50 stop for smoothness
- Shadow: shadow-soft-lg (more prominent than other cards)
- Border-radius: rounded-warmth (0.75rem, warmer)
- Max-width: max-w-4xl (prevents overly long lines)
- Line-height: leading-loose (1.875)
- Daily rotation logic: UNCHANGED (already perfect)

**Dashboard Page Hierarchy:**
```tsx
<PageTransition duration="slow">  {/* 500ms entrance */}
  <div className="space-y-6">
    <AffirmationCard />  {/* 1. FIRST */}
    <div>  {/* 2. Greeting below, reduced size */}
      <h2 className="text-2xl font-serif...">Good morning, {userName}!</h2>
      <p className="text-warm-gray-600...">Here's your financial overview</p>
    </div>
    <FinancialHealthIndicator />  {/* 3. NEW */}
    <RecentTransactionsCard />  {/* 4. Transactions */}
    <DashboardStats />  {/* 5. Stats moved lower */}
  </div>
</PageTransition>
```

**Animation Timeline:**
- 0-500ms: Page fade-in (slow transition)
- Components render in order, no sequential animation needed (simplify from Explorer 1 suggestion)
- Page entrance is the "breath", then all content appears

**Mobile Testing:**
- Test on 320px (iPhone SE), 768px (tablet), 1440px (desktop)
- Verify affirmation readable at all sizes
- Verify circular gauge doesn't overflow on mobile
- Verify 500ms entrance not sluggish on mid-range device

### Patterns to Follow

Reference `patterns.md`:
- Dashboard Page Pattern (server component + client data)
- FinancialHealthIndicator Component (NEW - full code provided)
- AffirmationCard Enhancement (size, gradient, shadow, border-radius)
- PageTransition Component Update (duration prop)

### Testing Requirements

**Visual Testing:**
- [ ] Dashboard screenshot at 320px, 768px, 1440px
- [ ] Affirmation is largest, centered, readable
- [ ] Greeting below affirmation, appropriate size (not overwhelming)
- [ ] FinancialHealthIndicator displays with 0 budgets (empty state)
- [ ] FinancialHealthIndicator displays with budgets (gauge animates)
- [ ] Circular gauge fills correctly (test with 0%, 50%, 100% on-track)

**Functional Testing:**
- [ ] Dashboard loads successfully
- [ ] Affirmation changes day-to-day (test by mocking date)
- [ ] FinancialHealthIndicator fetches budget data via tRPC
- [ ] "Create Budget" link navigates to /budgets
- [ ] All existing dashboard features work (stats, transactions)

**Accessibility Testing:**
- [ ] Affirmation readable with 200% zoom
- [ ] Color contrast ratios pass WCAG AA (4.5:1)
- [ ] Circular gauge visible for colorblind users (uses sage only, no red/green)

**Performance Testing:**
- [ ] Page load < 2s on mobile (4x CPU slowdown)
- [ ] Affirmation is LCP (Largest Contentful Paint)
- [ ] Circular gauge animation smooth (60fps)
- [ ] prefers-reduced-motion disables animations (inherited from PageTransition)

### Potential Split Strategy

**If complexity HIGH:**

**Foundation (Primary Builder 2):** Create before splitting
- FinancialHealthIndicator component (complete, tested in isolation)
- AffirmationCard enhancement (complete, tested in isolation)

**Sub-builder 2A: Dashboard Page** (1.5 hours)
- Reorder dashboard page hierarchy
- Update greeting size
- Add PageTransition duration="slow"
- Test full dashboard integration

**Sub-builder 2B: Component Refinements** (1 hour)
- DashboardStats minor styling updates
- RecentTransactionsCard minor styling updates
- Test responsive layout

**Estimated Total:** 3-4 hours (single builder) or 2.5 hours (with split but more overhead)

**Recommendation:** Keep as single builder (dashboard is coherent unit, splitting adds coordination overhead)

---

## Builder-3: Visual Warmth Rollout (Tier 1)

### Scope

Apply visual warmth system-wide to Tier 1 priority components:
- Settings pages (6 pages: categories, currency, appearance, data, account, overview)
- Account pages (5 pages: overview, profile, membership, security, preferences)
- Typography pass across all Tier 1 pages (font-serif headings)

This builder ensures consistency beyond dashboard.

### Complexity Estimate

**MEDIUM** (repetitive updates, systematic rollout)

**Split Recommendation:** No split needed. Checklist-driven approach keeps work manageable.

### Success Criteria

- [ ] All Settings pages wrapped in PageTransition
- [ ] All Account pages wrapped in PageTransition
- [ ] All h1, h2, h3 elements use font-serif (warmth)
- [ ] All cards use shadow-soft (inherits from Builder 1)
- [ ] All buttons use rounded-lg (inherits from Builder 1)
- [ ] No harsh error states remain (terracotta warm warnings instead of red)
- [ ] Consistent visual warmth across Settings and Account sections
- [ ] Dark mode tested on all pages

### Files to Modify

**Settings Pages (6 pages):**
- `src/app/(dashboard)/settings/page.tsx` - Overview page (wrap in PageTransition)
- `src/app/(dashboard)/settings/categories/page.tsx` - Wrap in PageTransition, verify category badges
- `src/app/(dashboard)/settings/currency/page.tsx` - Wrap in PageTransition, verify form styling
- `src/app/(dashboard)/settings/appearance/page.tsx` - Wrap in PageTransition
- `src/app/(dashboard)/settings/data/page.tsx` - Wrap in PageTransition
- `src/components/settings/ProfileSection.tsx` - Typography (h2 font-serif)
- `src/components/settings/ThemeSwitcher.tsx` - Verify gentle transition
- `src/components/settings/DangerZone.tsx` - Replace harsh red with terracotta warm warning

**Account Pages (5 pages):**
- `src/app/(dashboard)/account/page.tsx` - Overview (wrap in PageTransition)
- `src/app/(dashboard)/account/profile/page.tsx` - Wrap in PageTransition, typography
- `src/app/(dashboard)/account/membership/page.tsx` - Wrap in PageTransition, badge styling
- `src/app/(dashboard)/account/security/page.tsx` - Wrap in PageTransition
- `src/app/(dashboard)/account/preferences/page.tsx` - Wrap in PageTransition

**Component Updates:**
- `src/components/categories/CategoryBadge.tsx` - Verify custom color borders, add soft shadow
- `src/components/categories/CategoryForm.tsx` - Form inherits input styling, verify color picker
- `src/components/categories/CategoryList.tsx` - Replace error coral border with warm warning

### Dependencies

**Depends on:** Builder 1 completing UI primitives (Button, Card, Input)

**Blocks:** None (independent from Builder 2 and 4)

### Implementation Notes

**PageTransition Pattern for Server Components:**
Many settings/account pages are server components. Use client wrapper pattern:

```typescript
// If page is server component (async function with data fetching):
// 1. Keep server component for auth check
// 2. Create separate *Client.tsx component
// 3. Wrap client component content in PageTransition

// Example:
// page.tsx (server)
export default async function SettingsCategoriesPage() {
  const user = await getUser()
  if (!user) redirect('/signin')
  return <CategoriesPageClient />
}

// CategoriesPageClient.tsx (client)
'use client'
export function CategoriesPageClient() {
  return (
    <PageTransition>
      {/* existing content */}
    </PageTransition>
  )
}
```

**Typography Systematic Pass:**
- Find all h1 elements: Add `className="font-serif ..."`
- Find all h2 elements: Add `className="font-serif ..."`
- Find all h3 elements: Add `className="font-serif ..."`
- Verify numbers/data remain `font-sans tabular-nums`
- Use VSCode search: `<h1` to find all instances

**Warm Error State Pattern:**
```typescript
// BEFORE (harsh red)
<div className="border border-red-200 bg-red-50 p-4">
  <p className="text-red-800">Error message</p>
</div>

// AFTER (warm warning)
<div className="border border-terracotta-200 bg-terracotta-50 p-4 shadow-soft rounded-lg">
  <p className="text-terracotta-800">Error message</p>
</div>

// OR (gentle warning with gold)
<div className="bg-warm-gray-100 border-l-4 border-gold-400 p-4 shadow-soft rounded-lg">
  <p className="text-warm-gray-900">Error message</p>
</div>
```

**DangerZone Component:**
- Keep destructive nature (user needs warning)
- Use terracotta instead of harsh red
- Add shadow-soft instead of border-only
- Verify "Delete Account" button uses terracotta destructive variant

**Category Components:**
- CategoryBadge: Keep custom color border (user-defined), add shadow-soft
- CategoryForm: Color picker gentle hover states
- CategoryList: Error states use warm warnings

### Patterns to Follow

Reference `patterns.md`:
- PageTransition Component Update (wrap all pages)
- Button Component Enhancement (inherits from Builder 1)
- Card Component Enhancement (inherits from Builder 1)
- Typography: h1/h2/h3 font-serif

### Testing Requirements

**Visual Testing:**
- [ ] Screenshot Settings pages at 768px, 1440px
- [ ] Screenshot Account pages at 768px, 1440px
- [ ] Verify consistent warmth (rounded corners, soft shadows)
- [ ] Verify typography hierarchy (serif headings prominent)

**Functional Testing:**
- [ ] All Settings navigation works
- [ ] All Account navigation works
- [ ] Category creation/editing works
- [ ] Currency selector works (if available)
- [ ] Theme switcher toggles correctly

**Accessibility Testing:**
- [ ] PageTransition respects reduced-motion (inherited)
- [ ] Focus states visible on all forms
- [ ] Color contrast ratios pass WCAG AA

**Cross-Page Testing:**
- [ ] Navigate Settings → Dashboard → Account
- [ ] Verify page transitions smooth (300ms)
- [ ] Verify visual consistency across all sections

### Potential Split Strategy

**Not recommended.** Tier 1 rollout is systematic but manageable (11 pages total). Checklist approach keeps builder on track.

**If absolutely needed:**

**Sub-builder 3A: Settings Pages** (1.5 hours)
- 6 settings pages + components
- Typography pass on settings

**Sub-builder 3B: Account Pages** (1 hour)
- 5 account pages
- Typography pass on account

**Estimated Total:** 2-3 hours (single builder preferred)

---

## Builder-4: Animation System & PageTransition Rollout

### Scope

Systematically apply animations and PageTransition to remaining pages:
- PageTransition rollout to 17 remaining pages (accounts, transactions, goals, auth)
- Micro-interaction enhancements (card hover, loading states)
- Success/error state animations (goal completion, form validation)

This builder completes the animation system across the app.

### Complexity Estimate

**MEDIUM** (repetitive but systematic)

**Split Recommendation:** No split needed. Batch processing by page type.

### Success Criteria

- [ ] PageTransition on all 17 remaining pages (accounts, transactions, goals, auth, detail pages)
- [ ] All client components wrapped correctly (server components use client wrapper pattern)
- [ ] Card hover states enhanced (TransactionCard, AccountCard, GoalCard)
- [ ] Loading states improved (pulse/fade instead of harsh spinners)
- [ ] Success animations on goal completion (gentle-bounce)
- [ ] Error animations on form validation (shake)
- [ ] All animations respect prefers-reduced-motion (inherited from PageTransition)
- [ ] Smooth navigation between all pages (300ms transitions)

### Files to Modify

**Accounts Pages (3 pages):**
- `src/app/(dashboard)/accounts/page.tsx` → Wrap AccountListClient in PageTransition
- `src/app/(dashboard)/accounts/[id]/page.tsx` → Wrap in PageTransition
- `src/components/accounts/AccountListClient.tsx` → Add PageTransition wrapper
- `src/components/accounts/AccountCard.tsx` → Enhance hover state (cardHoverSubtle)

**Transactions Pages (3 pages):**
- `src/app/(dashboard)/transactions/page.tsx` → Wrap TransactionListPageClient in PageTransition
- `src/app/(dashboard)/transactions/[id]/page.tsx` → Wrap in PageTransition
- `src/components/transactions/TransactionListPage.tsx` → Add PageTransition wrapper
- `src/components/transactions/TransactionCard.tsx` → Enhance hover state (cardHoverSubtle)

**Goals Pages (3 pages):**
- `src/app/(dashboard)/goals/page.tsx` → Wrap GoalsPageClient in PageTransition
- `src/app/(dashboard)/goals/[id]/page.tsx` → Wrap in PageTransition
- `src/components/goals/GoalsPageClient.tsx` → Add PageTransition wrapper
- `src/components/goals/GoalCard.tsx` → Enhance hover state (cardHoverElevated)
- `src/components/goals/CompletedGoalCelebration.tsx` → Add gentle-bounce animation

**Auth Pages (3 pages):**
- `src/app/(auth)/signin/page.tsx` → Wrap in PageTransition
- `src/app/(auth)/signup/page.tsx` → Wrap in PageTransition
- `src/app/(auth)/reset-password/page.tsx` → Wrap in PageTransition

**Detail Pages (5 pages - if not already covered):**
- Verify all [id] detail pages wrapped in PageTransition

**Component Enhancements:**
- `src/components/ui/skeleton.tsx` → Optional: add breathe animation variant
- Form validation components → Add errorShake animation

### Dependencies

**Depends on:** Builder 1 completing useReducedMotion hook and animation library

**Blocks:** None (independent from Builder 2 and 3)

### Implementation Notes

**PageTransition Rollout Strategy:**
1. **Batch 1: Core feature pages** (accounts, transactions, goals) - 30 minutes
   - Wrap existing *Client components in PageTransition
   - Test navigation flow

2. **Batch 2: Detail pages** (accounts/[id], transactions/[id], goals/[id]) - 30 minutes
   - Wrap in PageTransition
   - Test navigation from list to detail

3. **Batch 3: Auth pages** (signin, signup, reset-password) - 20 minutes
   - Wrap in PageTransition
   - Test auth flow

**Card Hover Enhancement Pattern:**
```typescript
// BEFORE (CSS transition only)
<Card className="hover:shadow-md transition-shadow">
  <CardContent>...</CardContent>
</Card>

// AFTER (Framer Motion)
import { motion } from 'framer-motion'
import { cardHoverSubtle } from '@/lib/animations'

<motion.div {...cardHoverSubtle}>
  <Card>
    <CardContent>...</CardContent>
  </Card>
</motion.div>
```

**Loading State Improvement:**
```typescript
// BEFORE (spinner)
{isLoading && <Spinner />}

// AFTER (pulse)
import { motion } from 'framer-motion'
import { loadingPulse } from '@/lib/animations'

{isLoading && (
  <motion.div {...loadingPulse}>
    <Skeleton className="h-40 w-full" />
  </motion.div>
)}
```

**Success Animation (Goal Completion):**
```typescript
// In CompletedGoalCelebration.tsx
import { motion } from 'framer-motion'
import { successBounce } from '@/lib/animations'

<motion.div {...successBounce}>
  <CheckCircle className="h-12 w-12 text-sage-600" />
</motion.div>
```

**Error Shake (Form Validation):**
```typescript
// In form components with validation errors
import { motion } from 'framer-motion'
import { errorShake } from '@/lib/animations'

{errors.email && (
  <motion.p {...errorShake} className="text-terracotta-600 text-sm">
    {errors.email.message}
  </motion.p>
)}
```

**Testing Strategy:**
- Navigate through app: Dashboard → Accounts → Account Detail → Back
- Verify transitions smooth (300ms)
- Verify no janky animations on mobile
- Test with prefers-reduced-motion (should disable all)

### Patterns to Follow

Reference `patterns.md`:
- PageTransition Component Update (wrap all pages)
- Animation Library Pattern (cardHover variants, successBounce, errorShake)
- useReducedMotion Hook (inherited from PageTransition)

### Testing Requirements

**Visual Testing:**
- [ ] Navigate between all major pages, verify transitions smooth
- [ ] Card hover states visible and smooth (test on TransactionCard, AccountCard, GoalCard)
- [ ] Loading states pulse gently (not harsh)
- [ ] Goal completion animation celebratory but calm

**Functional Testing:**
- [ ] All page navigation works
- [ ] All animations enhance UX (not distracting)
- [ ] Form submissions work with success/error animations
- [ ] Auth flow smooth with page transitions

**Accessibility Testing:**
- [ ] prefers-reduced-motion disables all animations (test on all pages)
- [ ] Keyboard navigation unaffected by animations
- [ ] Focus rings visible during hover states

**Performance Testing:**
- [ ] Navigate rapidly between pages (no lag)
- [ ] Test on mobile (4x CPU slowdown) - animations still smooth
- [ ] No layout shift from animations (CLS = 0)

### Potential Split Strategy

**If needed:**

**Sub-builder 4A: PageTransition Rollout** (1.5 hours)
- All 17 pages wrapped in PageTransition
- Test navigation flow

**Sub-builder 4B: Micro-interactions** (1 hour)
- Card hover enhancements
- Loading state improvements
- Success/error animations

**Estimated Total:** 2-3 hours (single builder) or 2.5 hours (with split)

**Recommendation:** Keep as single builder (PageTransition rollout is systematic)

---

## Builder Execution Order

### Parallel Group 1 (Foundation - MUST COMPLETE FIRST)

**Builder 1: Foundation & Animation Infrastructure** (3-4 hours)
- Tailwind config, useReducedMotion hook, animation library, UI primitives
- **CRITICAL PATH:** All other builders depend on this

### Parallel Group 2 (After Builder 1 completes primitives)

**Builder 2: Dashboard Transformation** (3-4 hours)
- FinancialHealthIndicator, AffirmationCard enhancement, dashboard reordering
- Depends on: Card, Button components from Builder 1

**Builder 3: Visual Warmth Rollout** (2-3 hours)
- Settings pages, Account pages, typography pass
- Depends on: Button, Card, Input components from Builder 1

**Builder 4: Animation System & PageTransition Rollout** (2-3 hours)
- PageTransition to 17 pages, card hover enhancements, success/error animations
- Depends on: useReducedMotion hook and animation library from Builder 1

### Integration Notes

**Merge Order:**
1. Builder 1 (Foundation) merges first - creates foundation for all others
2. Builders 2, 3, 4 can merge in any order (no interdependencies)
3. Test full app integration after all merges

**Potential Conflicts:**
- **tailwind.config.ts:** Builder 1 owns, no conflicts
- **globals.css:** Builder 1 owns, no conflicts
- **animations.ts:** Builder 1 owns, no conflicts
- **page.tsx files:** Each builder owns different pages, no conflicts
- **UI components:** Builder 1 owns, others consume, no conflicts

**Conflict Resolution:**
- If conflict occurs: Builder 1 changes take precedence (foundational)
- Builders 2, 3, 4 rebase on Builder 1's merged work

**Testing Between Merges:**
1. After Builder 1 merges: Test UI primitives in isolation (buttons, cards, inputs)
2. After Builder 2 merges: Test dashboard end-to-end
3. After Builders 3, 4 merge: Test full app navigation and visual consistency

---

## Total Estimated Effort

**Builder 1 (Foundation):** 3-4 hours
**Builder 2 (Dashboard):** 3-4 hours
**Builder 3 (Visual Warmth):** 2-3 hours
**Builder 4 (Animations):** 2-3 hours

**Total (if parallel):** 4 hours (limited by slowest builder)
**Total (if sequential):** 10-14 hours

**Realistic with 3-4 parallel builders:** 4-5 hours

**Master plan estimate:** 5-7 hours
**Actual estimate:** 8-10 hours for comprehensive transformation

**Recommendation:** Execute with 4 builders in parallel to meet timeline. Focus on Tier 1 (Dashboard, Settings, Account) - Tier 2/3 defer to future iteration.

---

## Final Checklist (All Builders Complete)

**Visual Regression:**
- [ ] Before/after screenshots of Dashboard, Settings, Account pages
- [ ] Affirmation is hero element, centered, readable
- [ ] FinancialHealthIndicator displays correctly
- [ ] Consistent rounded corners, soft shadows across all pages
- [ ] Typography feels warm (serif headings, comfortable line-height)

**Accessibility:**
- [ ] prefers-reduced-motion tested (all animations disable)
- [ ] Color contrast ratios WCAG AA (4.5:1 for text)
- [ ] Focus rings visible on all interactive elements
- [ ] Keyboard navigation smooth

**Performance:**
- [ ] Lighthouse Performance score maintained
- [ ] Page load < 2s on mobile
- [ ] Animations smooth (60fps desktop, 30fps mobile minimum)
- [ ] No layout shift (CLS = 0)

**Functionality:**
- [ ] All features work identically (accounts, transactions, budgets, goals, analytics)
- [ ] No regressions from styling changes
- [ ] Dark mode works (all colors visible, shadows subtle)

**User Validation:**
- [ ] User confirms app feels "warmer and more supportive"
- [ ] Dashboard affirmation-first hierarchy feels emotionally supportive
- [ ] Financial health indicator uses supportive language (not harsh)

**Deployment Readiness:**
- [ ] `npm run build` succeeds
- [ ] `npm run type-check` succeeds
- [ ] All tests pass (if automated tests exist)
- [ ] Ready for staging deployment
