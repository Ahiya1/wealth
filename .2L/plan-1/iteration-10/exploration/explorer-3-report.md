# Explorer 3 Report: Animation System & Micro-interactions

## Executive Summary
The wealth application has a **solid foundation** for animations with Framer Motion installed and a well-structured animations library (`lib/animations.ts`). However, **usage is inconsistent** across the app - only 7 out of 30+ pages use PageTransition, and micro-interactions are limited to basic CSS transitions. The master plan calls for "gentle warmth" throughout the app, requiring systematic rollout of animations with accessibility (prefers-reduced-motion) support that is currently **missing**.

## Discoveries

### Existing Animation Infrastructure
- **Framer Motion 12.23.22** installed and functional
- **lib/animations.ts** exists with solid patterns:
  - Page transitions (fade + slide, 300ms)
  - Card hover effects (scale 1.01, -4px lift)
  - Stagger animations for lists
  - Progress bar animations
  - Modal/dialog animations
  - Success celebrations
- **tailwindcss-animate 1.0.7** provides additional utilities
- Custom Tailwind animations: `fade-in`, `slide-in`, `skeleton`

### Current Animation Usage (Audit)
**Pages using PageTransition (7/30):**
- `/dashboard` ✅
- `/analytics` ✅
- `/budgets` ✅
- `/budgets/[month]` ✅
- `/admin` ✅
- `/admin/users` ✅
- Landing page ✅

**Pages NOT using PageTransition (23/30):**
- `/accounts` ❌
- `/transactions` ❌
- `/goals` ❌
- `/settings/*` (6 pages) ❌
- `/account/*` (5 pages) ❌
- `/auth/*` (3 pages) ❌
- Individual detail pages (accounts/[id], transactions/[id], goals/[id]) ❌

**Components using Framer Motion (11/91):**
- DashboardStats (stagger children) ✅
- StatCard (card hover) ✅
- TransactionCard (card hover) ✅
- TransactionList (stagger) ✅
- AccountCard (hover) ✅
- AccountList (stagger) ✅
- GoalCard (hover) ✅
- ProgressRing (circular progress) ✅
- EncouragingProgress (progress) ✅
- EmptyState (fade-in) ✅
- PageTransition (page entrance) ✅

**Components with CSS transitions only (20+):**
- Button (transition-colors)
- Card (hover:shadow-md transition-shadow)
- Input (focus-visible:ring-2)
- Dialog (duration-200, zoom animations via Radix)
- Dropdown menu (transition-colors)
- Toast (transition-all, slide animations)
- Badge (transition-colors)
- Progress bar (transition-all)
- AffirmationCard (transition-shadow)

### Current Micro-interactions
**What exists:**
1. **Button hovers:** Color transitions only (no scale/shadow)
2. **Card hovers:** Shadow transitions on AffirmationCard, basic hover states elsewhere
3. **Input focus:** Ring animations via Tailwind (instant, no smooth glow)
4. **Loading states:** Pulse animation on Skeleton component
5. **Dialog/Modal:** Radix UI built-in animations (zoom + fade, 200ms)
6. **Stagger lists:** Dashboard stats, transaction lists (good implementation)

**What's missing:**
1. No scale animations on buttons (plan calls for 1.02 scale)
2. No glow effects on hover/focus states
3. Inconsistent card hover (some have motion, some don't)
4. No success state animations (checkmarks, confetti, subtle bounces)
5. No entrance animations for most components
6. No loading pulse for data fetches (spinner alternatives)

### Accessibility Gaps
**CRITICAL FINDING:** Zero `prefers-reduced-motion` support detected
- No media query checks in CSS
- No motion preference detection in React components
- Framer Motion animations will play regardless of user preference
- Violates WCAG 2.1 AA accessibility standards

## Patterns Identified

### Pattern 1: Framer Motion Variants
**Description:** Centralized animation variants in `lib/animations.ts`
**Use Case:** Consistent, reusable animations across components
**Example:**
```typescript
// lib/animations.ts
export const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: DURATION.fast, ease: EASING.default },
}

// Component usage
<motion.div {...cardHover}>
  <Card>...</Card>
</motion.div>
```
**Recommendation:** ✅ EXCELLENT - Continue using this pattern. Expand library.

### Pattern 2: Stagger Children
**Description:** Parent-child animation orchestration for lists
**Use Case:** Sequential entrance animations for dashboard stats, transaction lists
**Example:**
```typescript
// DashboardStats.tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {stats.map(stat => (
    <motion.div variants={staggerItem}>
      <StatCard {...stat} />
    </motion.div>
  ))}
</motion.div>
```
**Recommendation:** ✅ GREAT - Use for all list-based UIs (accounts, goals, categories)

### Pattern 3: CSS Transition Classes
**Description:** Tailwind transition utilities for simple hover states
**Use Case:** Button color changes, border color changes
**Example:**
```tsx
className="transition-colors hover:bg-accent"
```
**Recommendation:** ✅ KEEP for simple states, but enhance with Framer Motion for complex interactions

### Pattern 4: Radix UI Built-in Animations
**Description:** Dialog, Dropdown, Toast components have data-state animations
**Use Case:** Modal/overlay entrance/exit
**Example:**
```tsx
// Dialog.tsx
className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```
**Recommendation:** ✅ SOLID - Keep Radix animations, ensure they respect reduced-motion

## Complexity Assessment

### High Complexity Areas
- **Accessibility Implementation (prefers-reduced-motion):** Needs wrapper component or hook to conditionally disable animations. Affects ALL animated components. **Estimated: 1 sub-task, 2-3 hours**
- **PageTransition Rollout:** 23 pages need wrapping + testing. Some are server components (need client wrapper strategy). **Estimated: 1 sub-task, 2-3 hours**

### Medium Complexity Areas
- **Animation Library Expansion:** Add 8-10 new variants (button hover, input focus, success states, error shake, etc.). **Estimated: 1-2 hours**
- **Component Enhancement:** Update Button, Input, Card base components to use Framer Motion instead of CSS transitions. **Estimated: 2-3 hours**
- **Loading States:** Create pulse/fade alternatives to spinners for tRPC queries. **Estimated: 1-2 hours**

### Low Complexity Areas
- **CSS Timing Adjustments:** Update transition durations to match warmth (200-300ms instead of instant). **Estimated: 30 minutes**
- **Tailwind Config Updates:** Add custom animation utilities if needed. **Estimated: 30 minutes**

## Technology Recommendations

### Primary Animation Stack
- **Framer Motion 12.23.22:** ✅ Already installed, mature, excellent API
  - Rationale: Industry standard, great performance, built-in gesture support
  - Continue using for complex interactions
  
- **tailwindcss-animate 1.0.7:** ✅ Keep for Radix UI integration
  - Rationale: Powers Radix component animations seamlessly
  
- **CSS Transitions:** ✅ Keep for ultra-simple cases
  - Rationale: Performant, no JS overhead for basic hover states

### Supporting Libraries
None needed - current stack is sufficient.

### Animation Architecture Decision
**Recommendation:** Hybrid approach
1. **Framer Motion:** Complex animations (page transitions, stagger, gestures, success states)
2. **CSS Transitions:** Simple hover/focus color changes
3. **Radix Animations:** Keep for Dialog/Dropdown/Toast (already integrated)

## Integration Points

### PageTransition Integration
**Challenge:** Some pages are Server Components, PageTransition requires `'use client'`

**Solution Pattern:**
```tsx
// Server Component (page.tsx)
export default async function AccountsPage() {
  const data = await fetchData()
  return <AccountsPageClient data={data} />
}

// Client Component (AccountsPageClient.tsx)
'use client'
export function AccountsPageClient({ data }) {
  return (
    <PageTransition>
      {/* UI here */}
    </PageTransition>
  )
}
```

**Pages requiring this pattern:** 12 (accounts, transactions, goals, settings/*, account/*)

### Accessibility Integration
**Challenge:** Need global mechanism to respect `prefers-reduced-motion`

**Recommended Solution:**
```typescript
// lib/useReducedMotion.ts
import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return prefersReducedMotion
}

// Usage in animations.ts
export const getPageTransition = (reducedMotion: boolean) => ({
  initial: reducedMotion ? {} : { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? {} : { opacity: 0, y: -10 },
  transition: { duration: reducedMotion ? 0 : DURATION.normal },
})
```

### Theme Integration
Animations should feel different in dark mode (lighter, subtler). Current color system supports this (sage/warm-gray palettes).

## Micro-interaction Catalog

### 1. Button Interactions
**Current:** Color transition only
**Proposed:**
```typescript
// lib/animations.ts
export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

export const buttonPrimary = {
  ...buttonHover,
  whileHover: { 
    scale: 1.02,
    boxShadow: '0 4px 12px rgba(var(--sage-600), 0.2)' 
  },
}
```
**Application:** Update Button component base

### 2. Card Interactions
**Current:** Inconsistent (some have motion.div, some don't)
**Proposed:**
```typescript
// Enhance existing cardHover
export const cardHoverSubtle = {
  whileHover: { 
    y: -2, 
    scale: 1.005,
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
  },
  transition: { duration: DURATION.fast },
}

export const cardHoverElevated = {
  whileHover: { 
    y: -6, 
    scale: 1.015,
    boxShadow: '0 12px 32px rgba(0,0,0,0.08)'
  },
  transition: { duration: DURATION.fast },
}
```
**Application:** TransactionCard, AccountCard, GoalCard, AffirmationCard (enhanced)

### 3. Input Focus States
**Current:** Ring animation (instant)
**Proposed:**
```typescript
export const inputFocus = {
  whileFocus: {
    boxShadow: '0 0 0 3px rgba(var(--sage-500), 0.1)',
  },
  transition: { duration: 0.2 },
}
```
**Application:** Input, Textarea, Select components
**Alternative:** Enhanced CSS transition with ease-out

### 4. Success States
**Current:** None (just toast notifications)
**Proposed:**
```typescript
export const successBounce = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.15, 0.95, 1.05, 1],
  },
  transition: { 
    duration: 0.5, 
    ease: 'easeOut',
    times: [0, 0.2, 0.4, 0.7, 1]
  },
}

export const checkmarkDraw = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 0.4, ease: 'easeOut' },
}
```
**Application:** Form submissions, goal completions, transaction additions

### 5. Error States
**Current:** None (just toast notifications)
**Proposed:**
```typescript
export const errorShake = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
  },
  transition: { duration: 0.4 },
}
```
**Application:** Form validation errors, failed actions

### 6. Loading States (Alternative to Spinners)
**Current:** Skeleton component with pulse
**Proposed Additions:**
```typescript
export const loadingPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

export const loadingDots = {
  animate: {
    opacity: [0.3, 1, 0.3],
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'easeInOut',
    delay: (index: number) => index * 0.2,
  },
}
```
**Application:** Data fetching indicators, async button states

### 7. List Item Entrance
**Current:** Stagger on dashboard stats (good!)
**Proposed:** Standardize for all lists
```typescript
// Already exists, needs rollout:
staggerContainer + staggerItem
```
**Application:** 
- Transaction lists ✅ (already done)
- Account lists ✅ (already done)
- Goal lists (needs implementation)
- Category lists (needs implementation)
- Budget category lists (needs implementation)

### 8. Page Scroll Reveal (Optional Enhancement)
**Proposed:**
```typescript
export const scrollReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: DURATION.normal },
}
```
**Application:** Long pages (analytics charts, settings sections)
**Priority:** LOW (nice-to-have, not in master plan)

## Recommendations for Planner

### 1. Prioritize Accessibility FIRST
Before rolling out more animations, implement `useReducedMotion` hook and update all existing animations to respect it. This is non-negotiable for WCAG compliance.

**Scope:** 
- Create `lib/useReducedMotion.ts` hook
- Update `lib/animations.ts` to accept reducedMotion parameter
- Update PageTransition to use hook
- Test with browser DevTools emulation

**Estimated effort:** 2-3 hours

### 2. Expand Animation Library (lib/animations.ts)
Add missing variants before applying to components. This ensures consistency.

**New variants needed:**
- buttonHover, buttonPrimary, buttonDestructive
- cardHoverSubtle, cardHoverElevated (enhance existing)
- inputFocus, inputError
- successBounce, checkmarkDraw
- errorShake
- loadingPulse, loadingDots

**Estimated effort:** 1-2 hours

### 3. Update Core UI Components
Enhance Button, Card, Input to use Framer Motion instead of pure CSS transitions.

**Strategy:**
- Keep CSS transitions as fallback (progressive enhancement)
- Wrap with motion.div or convert to motion.button
- Use new variants from library

**Components:**
- Button (3 variants: default, primary, destructive)
- Input (focus + error states)
- Card (export CardMotion variant for hover)

**Estimated effort:** 2-3 hours

### 4. Systematic PageTransition Rollout
Apply to all 23 remaining pages, handling server/client component split carefully.

**Rollout order (by priority):**
1. **High traffic pages:** /accounts, /transactions, /goals (3 pages)
2. **Settings pages:** /settings/*, /account/* (11 pages)
3. **Detail pages:** /accounts/[id], /transactions/[id], /goals/[id] (3 pages)
4. **Auth pages:** /signin, /signup, /reset-password (3 pages)
5. **Admin pages:** Already done ✅

**Challenge:** Server components need client wrapper pattern
**Solution:** Create `*PageClient.tsx` components for each

**Estimated effort:** 2-3 hours (batching, testing)

### 5. Micro-interaction Application
Systematically apply new variants to existing components.

**Phase 1 - Dashboard & Core:** (HIGH PRIORITY)
- DashboardStats (enhance existing)
- RecentTransactionsCard
- AffirmationCard (add buttonPrimary to CTA if exists)
- All stat cards

**Phase 2 - Feature Pages:** (MEDIUM PRIORITY)
- TransactionCard (enhance hover)
- AccountCard (enhance hover)
- GoalCard (enhance hover)
- Budget category cards

**Phase 3 - Forms & Inputs:** (MEDIUM PRIORITY)
- AddTransactionForm
- AddAccountForm
- CreateGoalForm
- All input fields (focus glow)

**Phase 4 - Success/Error States:** (LOW-MEDIUM PRIORITY)
- Form submission success (bounce animation)
- Goal completion (celebration)
- Error validations (shake animation)

**Estimated effort:** 3-4 hours total

### 6. Loading State Improvements
Replace harsh spinners with gentle pulses/fades.

**Current spinners:** Check tRPC query loading states
**Replacement:** Use `loadingPulse` variant on placeholder content

**Estimated effort:** 1 hour

## Risks & Challenges

### Technical Risks
1. **Performance Impact:** Too many animations could hurt mobile performance
   - **Mitigation:** Use GPU-accelerated properties (transform, opacity), avoid animating width/height, test on mid-range Android
   
2. **Accessibility Violations:** Animations without reduced-motion support fail WCAG 2.1 AA
   - **Mitigation:** Implement useReducedMotion hook FIRST, before expanding animations
   
3. **Layout Shift (CLS):** Hover animations causing unexpected layout changes
   - **Mitigation:** Use transform (not position), will-change: transform hint, test with Chrome DevTools

4. **Bundle Size:** Framer Motion adds ~60KB (already included, not a new risk)
   - **Mitigation:** Already using it, no additional cost

### Complexity Risks
1. **Server Component Pattern:** PageTransition requires client components, may need extensive refactoring
   - **Mitigation:** Use wrapper pattern (*PageClient.tsx), minimal refactor needed
   
2. **Inconsistent Application:** 91 components, easy to miss some during rollout
   - **Mitigation:** Create checklist, systematic rollout by priority (dashboard first)

3. **Animation Conflicts:** Radix UI animations + Framer Motion could clash
   - **Mitigation:** Keep Radix animations as-is, apply Framer Motion to custom components only

### UX Risks
1. **Too Much Animation:** Overwhelming, distracting from financial data
   - **Mitigation:** Master plan calls for "subtle" (200-300ms), stick to gentle movements (scale 1.02 max)
   
2. **Subjective "Warmth":** What feels warm to designer may not to users
   - **Mitigation:** A/B test if possible, user feedback, err on side of subtlety

## Performance Considerations

### GPU Acceleration
**Use:** transform, opacity, filter
**Avoid:** width, height, top, left, margin, padding

All proposed animations use transform/opacity ✅

### Will-Change Hints
Add to frequently animated elements:
```css
.card-hover {
  will-change: transform, box-shadow;
}
```
Apply to: Cards, Buttons (on hover)

### Animation Budgets
**Per page:**
- 1 page entrance animation (PageTransition)
- 4-8 stagger children (dashboard stats, lists)
- Unlimited hover states (on-demand)

**Total active animations:** Max ~10 simultaneous (well within budget)

### Mobile Performance
**Test devices:**
- Mid-range Android (Pixel 4a equivalent)
- iPhone 12 (baseline iOS)

**Thresholds:**
- 60fps for page transitions
- 30fps minimum for hover states (mobile doesn't hover, but test tap)

### Monitoring
Use Chrome DevTools Performance tab:
- Check for layout thrashing
- Verify GPU acceleration (composite layers)
- Measure frame rates during animations

## PageTransition Rollout Plan

### Phase 1: Core Pages (HIGH PRIORITY)
Already done:
- ✅ /dashboard
- ✅ /analytics
- ✅ /budgets/*
- ✅ /admin/*

**Remaining:**
- ❌ /accounts → Wrap `AccountListClient` in PageTransition
- ❌ /transactions → Wrap `TransactionListPageClient` in PageTransition
- ❌ /goals → Wrap `GoalsPageClient` in PageTransition

**Estimated:** 30 minutes

### Phase 2: Settings & Account (MEDIUM PRIORITY)
All pages need client wrapper:
- ❌ /settings (overview page - already client, just add wrapper)
- ❌ /settings/categories
- ❌ /settings/currency
- ❌ /settings/appearance
- ❌ /settings/data
- ❌ /settings/account
- ❌ /account (overview)
- ❌ /account/profile
- ❌ /account/membership
- ❌ /account/security
- ❌ /account/preferences

**Estimated:** 1.5 hours

### Phase 3: Detail Pages (MEDIUM PRIORITY)
- ❌ /accounts/[id]
- ❌ /transactions/[id]
- ❌ /goals/[id]
- ❌ /budgets/[month] (already done ✅)

**Estimated:** 30 minutes

### Phase 4: Auth Pages (LOW PRIORITY)
- ❌ /signin
- ❌ /signup
- ❌ /reset-password

**Estimated:** 20 minutes

### Implementation Pattern
```tsx
// Before (Server Component)
export default async function AccountsPage() {
  const user = await getUser()
  if (!user) redirect('/signin')
  return <AccountListClient />
}

// After (Add to Client Component)
'use client'
import { PageTransition } from '@/components/ui/page-transition'

export function AccountListClient() {
  return (
    <PageTransition>
      {/* existing content */}
    </PageTransition>
  )
}
```

### Testing Checklist
For each page:
- [ ] PageTransition wraps content
- [ ] Fade-in animation visible (300ms)
- [ ] No layout shift
- [ ] Works on navigation (forward/back)
- [ ] Works with prefers-reduced-motion (after hook implemented)

## Questions for Planner

1. **Accessibility Priority:** Should we implement `useReducedMotion` before or after PageTransition rollout? 
   - **Recommendation:** BEFORE (otherwise we violate WCAG during implementation)

2. **Animation Intensity:** Master plan says "gentle" - should we A/B test subtle vs. prominent animations?
   - **Recommendation:** Start subtle (scale 1.02, 200ms), iterate based on feedback

3. **Success Celebrations:** How enthusiastic should goal completion animations be?
   - **Recommendation:** Subtle bounce (0.4s), not confetti - keep it calm/warm

4. **Loading States:** Should we replace ALL spinners or keep some (e.g., initial page load)?
   - **Recommendation:** Replace in-page loading (tRPC queries), keep full-page spinner for initial auth

5. **Dark Mode Differences:** Should animations feel different in dark mode (slower, more subtle)?
   - **Recommendation:** Same timing, but use lighter shadows (already planned in color system)

6. **Budget Flexibility:** Iteration 3 estimated at 5-7 hours - animation work could take 8-10 hours if comprehensive. Split into sub-tasks?
   - **Recommendation:** YES - Split into 2 sub-builders:
     - Sub-builder A: Accessibility + Library + Core Components (4-5 hours)
     - Sub-builder B: PageTransition Rollout + Micro-interactions (4-5 hours)

## Resource Map

### Critical Files/Directories

**Animation Library:**
- `/src/lib/animations.ts` - Central animation variants (EXPAND THIS)
- `/src/lib/useReducedMotion.ts` - CREATE NEW (accessibility hook)

**Core UI Components (to enhance):**
- `/src/components/ui/page-transition.tsx` - Update with useReducedMotion
- `/src/components/ui/button.tsx` - Add Framer Motion variants
- `/src/components/ui/card.tsx` - Export motion variant
- `/src/components/ui/input.tsx` - Add focus glow animation

**Dashboard Components (high priority):**
- `/src/components/dashboard/DashboardStats.tsx` - Already good, minor enhancements
- `/src/components/dashboard/RecentTransactionsCard.tsx` - Add entrance animation
- `/src/components/ui/affirmation-card.tsx` - Enhance hover state

**Page Client Components (need PageTransition):**
- `/src/components/accounts/AccountListClient.tsx`
- `/src/components/transactions/TransactionListPage.tsx`
- `/src/components/goals/GoalsPageClient.tsx`
- `/src/app/(dashboard)/settings/page.tsx` (already client)
- All `/src/app/(dashboard)/settings/*/page.tsx` files
- All `/src/app/(dashboard)/account/*/page.tsx` files

**Configuration:**
- `/tailwind.config.ts` - Animation keyframes (may need additions)
- `/src/app/globals.css` - CSS custom properties for animations

### Key Dependencies
- `framer-motion: ^12.23.22` - Already installed ✅
- `tailwindcss-animate: 1.0.7` - Already installed ✅
- No new dependencies needed

### Testing Infrastructure
**Manual Testing:**
- Browser DevTools (Performance tab, Rendering tab for reduced-motion emulation)
- Chrome Lighthouse (Performance score)
- Mobile device testing (Android + iOS)

**Automated Testing:**
- Vitest (already setup) - Test useReducedMotion hook
- No E2E animation testing (overkill for this scope)

**Testing Checklist Template:**
```markdown
## Animation Testing Checklist
- [ ] Page transitions smooth (60fps)
- [ ] No layout shift (CLS score 0)
- [ ] Hover states feel responsive (<100ms)
- [ ] Reduced-motion disables animations
- [ ] Mobile performance acceptable (30fps minimum)
- [ ] Dark mode animations work
- [ ] Accessibility: No vestibular triggers
```

## Appendix: Animation Timing Reference

Based on master plan "gentle warmth" directive:

| Animation Type | Duration | Easing | Notes |
|----------------|----------|--------|-------|
| Page Entrance | 300ms | easeOut | Fade + slide |
| Page Exit | 200ms | easeIn | Faster exit |
| Button Hover | 150ms | easeOut | Quick feedback |
| Card Hover | 200ms | easeOut | Gentle lift |
| Input Focus | 200ms | easeOut | Smooth glow |
| Success State | 400ms | easeOut | Bounce sequence |
| Error Shake | 400ms | easeInOut | Attention-grabbing |
| Loading Pulse | 1500ms | easeInOut | Slow, calming |
| Stagger Delay | 70ms | - | Between children |
| Modal Entrance | 200ms | easeOut | Zoom + fade |

**Key Principles:**
- Nothing faster than 150ms (feels jarring)
- Nothing slower than 500ms (feels sluggish)
- Exits faster than entrances (UX best practice)
- Reduced-motion: 0ms (instant, no motion)

---

**Report completed on:** 2025-10-03  
**Explorer:** 3 (Animation System & Micro-interactions)  
**Iteration:** 10 (Global)  
**Plan:** plan-1  
**Status:** Ready for planner synthesis
