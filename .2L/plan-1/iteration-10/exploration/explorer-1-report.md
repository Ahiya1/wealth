# Explorer 1 Report: Dashboard Components & Hierarchy Analysis

## Executive Summary

Current dashboard follows a traditional analytics-first layout (Greeting → Affirmation → Stats → Transactions). Iteration 10 requires inverting this hierarchy to lead with emotional support: Affirmation becomes hero element (1.5x larger, centered), followed by greeting, new FinancialHealthIndicator, then transactions and stats. The app already has excellent animation infrastructure (framer-motion) and a warm color system (sage, warm-gray, gold). Key challenge: transforming 164 TypeScript files gradually while maintaining consistency and avoiding performance degradation.

## Discoveries

### Current Dashboard Structure (page.tsx)
- **Location:** `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/dashboard/page.tsx`
- **Current Hierarchy:**
  1. Personalized Greeting (h1 + description)
  2. AffirmationCard (current size)
  3. DashboardStats (4-card grid with animations)
  4. RecentTransactionsCard
- **Wrapping:** All wrapped in PageTransition component (300ms fade)
- **Server-side:** Uses Supabase server client for user auth
- **Data:** Client components use tRPC for real-time data

### AffirmationCard Component (Current State)
- **Location:** `/home/ahiya/Ahiya/wealth/src/components/ui/affirmation-card.tsx`
- **Current Design:**
  - Gradient background: `from-sage-50 to-warm-gray-50`
  - Border: `border-sage-200`
  - Icon: Sparkles (gold color, h-5 w-5)
  - Typography: `font-serif text-xl italic` with quotes
  - Padding: `p-6` (standard card padding)
  - Hover: `hover:shadow-md transition-shadow`
- **Daily Rotation Logic:** Already implemented! Uses `new Date().getDate() % affirmations.length`
- **Affirmations Array:** 35 supportive affirmations (e.g., "Your worth is not your net worth", "Financial wellness is a journey")
- **Strength:** Daily consistency, supportive language, no harsh red/green

### DashboardStats Component
- **Location:** `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardStats.tsx`
- **Current Position:** Third in hierarchy (after greeting and affirmation)
- **Layout:** 4-column grid (md:grid-cols-2 lg:grid-cols-4)
- **Animation:** Uses staggerContainer/staggerItem from animations.ts (70ms stagger, 100ms delay)
- **Metrics:**
  - Net Worth (DollarSign icon, elevated variant)
  - Monthly Income (TrendingUp icon)
  - Monthly Expenses (TrendingDown icon)
  - Savings Rate (Target icon, percentage display)
- **Empty State:** Shows EmptyState component with "Add Account" + "Add Transaction" buttons
- **Data Source:** `trpc.analytics.dashboardSummary.useQuery()`

### RecentTransactionsCard Component
- **Location:** `/home/ahiya/Ahiya/wealth/src/components/dashboard/RecentTransactionsCard.tsx`
- **Current Position:** Fourth in hierarchy
- **Design:**
  - Header: "Recent Activity" with "View all" link
  - Font: Already uses `font-serif` for title (warm typography)
  - Transaction display: Payee, date, category, amount
  - Color coding: Expenses (warm-gray-700), Income (sage-600)
- **Empty State:** Shows "No transactions yet" with add button
- **Data Source:** Same tRPC query as DashboardStats

### PageTransition & Animation System
- **PageTransition Component:** `/home/ahiya/Ahiya/wealth/src/components/ui/page-transition.tsx`
- **Animation Library:** Uses framer-motion throughout
- **Animation Constants:** `/home/ahiya/Ahiya/wealth/src/lib/animations.ts`
  - `DURATION.fast: 0.15s` (button hover)
  - `DURATION.normal: 0.3s` (page transition, modal)
  - `DURATION.slow: 0.5s` (drawer, complex layout)
- **Current Page Transition:** 300ms fade with y: 10px offset
- **Requirement:** Increase to 500ms for "breath before data" effect
- **Existing Animations:**
  - `staggerContainer` + `staggerItem` (used in DashboardStats)
  - `cardHover` (y: -4, scale: 1.01)
  - `progressBarAnimation`
  - `modalAnimation`
  - `celebrationAnimation`

### BudgetSummaryCard (Potential Financial Health Source)
- **Location:** `/home/ahiya/Ahiya/wealth/src/components/dashboard/BudgetSummaryCard.tsx`
- **Current Implementation:**
  - Shows budget count and status breakdown
  - Uses tRPC: `trpc.budgets.summary.useQuery()` and `trpc.budgets.progress.useQuery()`
  - Status categories: "good" (on track), "warning", "over"
  - Color coding: green-500, yellow-500, red-500 (NEEDS SOFTENING)
- **Data Available:**
  - Budget count
  - Budgets by status (over/warning/onTrack)
  - Current month context
- **Not Currently on Dashboard:** Could be adapted for FinancialHealthIndicator

### Color System (Already Warm & Gentle)
- **Primary Palette:**
  - Sage: HSL-based, 50-900 range (140deg hue, 10-18% saturation)
  - Warm Gray: HSL-based, 50-900 range (24deg hue, 4-10% saturation)
  - Gold: `45 74% 52%` (accent)
  - Coral: `0 100% 71%` (destructive)
  - Sky: `204 52% 67%`
  - Lavender: `255 85% 85%`
- **Current Usage:**
  - Background: `var(--warm-gray-50)`
  - Primary: `var(--sage-600)`
  - Borders: `var(--warm-gray-200)` (soft, not harsh)
- **Typography:**
  - Sans: Inter + system fonts
  - Serif: Crimson Pro + Georgia (for headings, affirmations)
- **Border Radius:** `--radius: 0.5rem` (already rounded)

### Component Inventory
- **Total TypeScript files:** 164
- **UI Components:** 18+ in `/src/components/ui/`
- **Dashboard Components:** DashboardStats, RecentTransactionsCard, BudgetSummaryCard, DashboardSidebar
- **Rounded Corners:** Already used in 33 locations across 18 UI components
- **Consistency:** Good foundation for system-wide rollout

## Patterns Identified

### Pattern 1: Staggered Animation Entry
**Description:** Components animate in sequence using framer-motion's staggerChildren
**Use Case:** Dashboard stats cards entering one by one (70ms stagger)
**Example:**
```tsx
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  <motion.div variants={staggerItem}>
    <StatCard {...} />
  </motion.div>
</motion.div>
```
**Recommendation:** Extend to new dashboard layout. Affirmation should fade in first (solo, no stagger), then greeting, then FinancialHealthIndicator, then rest with stagger.

### Pattern 2: Daily Rotation via Date Modulo
**Description:** Content rotates based on day of month, ensuring consistency per day
**Use Case:** AffirmationCard already uses `new Date().getDate() % affirmations.length`
**Example:**
```tsx
const dailyAffirmation = useMemo(() => {
  const index = new Date().getDate() % affirmations.length
  return affirmations[index]
}, [])
```
**Recommendation:** Keep existing logic, no changes needed. Excellent pattern for daily consistency.

### Pattern 3: Gradient Background for Elevation
**Description:** Subtle gradients create warmth without harsh borders
**Use Case:** AffirmationCard uses `bg-gradient-to-br from-sage-50 to-warm-gray-50`
**Example:**
```tsx
<Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200">
```
**Recommendation:** Enhance for larger affirmation. Add softer gradient stops, consider paper texture overlay for warmth.

### Pattern 4: Supportive Language in UI
**Description:** Avoid harsh negative language (use "needs attention" not "failed", "on track" not "good")
**Use Case:** BudgetSummaryCard uses "on track", "warning", "over" (better than "pass/fail")
**Example:**
```tsx
const onTrack = budgets.filter((b) => b.status === 'good').length
// Display: "X on track" (supportive)
```
**Recommendation:** Extend to FinancialHealthIndicator. Use sage tones for all states, avoid red/green. Language examples:
- "Looking good" (sage-600)
- "Needs attention" (warm-gray-600)
- "Making progress" (sage-500)

### Pattern 5: Server Component + Client Data Hybrid
**Description:** Page is server component (auth check), data components are client (tRPC)
**Use Case:** Dashboard page.tsx is async server component, DashboardStats is 'use client'
**Example:**
```tsx
// page.tsx (server)
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <PageTransition><DashboardStats /></PageTransition>
}

// DashboardStats.tsx (client)
'use client'
export function DashboardStats() {
  const { data } = trpc.analytics.dashboardSummary.useQuery()
}
```
**Recommendation:** Maintain pattern. Greeting calculation stays server-side, FinancialHealthIndicator will be client component.

## Complexity Assessment

### High Complexity Areas

#### Dashboard Reordering & Animation Choreography (HIGH - 1 focused session)
- **Why Complex:**
  - Must coordinate 5 components with new animation sequence
  - Page fade must be 500ms "breath" before data animates
  - Affirmation needs solo entrance (no stagger), then greeting, then health indicator, then rest
  - Responsive layout changes (affirmation full-width on mobile, centered on desktop)
- **Estimated Effort:** 2-3 hours
- **Split Needed:** No, single coherent task

#### Affirmation Enhancement (MEDIUM-HIGH - design + implementation)
- **Why Complex:**
  - Size increase 1.5x requires responsive breakpoints
  - "Softer background" subjective (paper texture? subtle gradient shift?)
  - Center-align content + ensure readability at larger size
  - Maintain hover states and daily rotation logic
- **Estimated Effort:** 1.5-2 hours
- **Design Decisions:**
  - Text size: `text-xl` → `text-2xl` (mobile), `text-3xl` (desktop)
  - Padding: `p-6` → `p-8` (mobile), `p-12` (desktop)
  - Icon size: `h-5 w-5` → `h-6 w-6` (mobile), `h-8 w-8` (desktop)
  - Background: Add paper texture overlay or multi-stop gradient
  - Typography: Increase line-height from `leading-relaxed` to `leading-loose`
- **Split Needed:** No, component update is atomic

#### FinancialHealthIndicator Component (MEDIUM - new component)
- **Why Medium Complexity:**
  - New component from scratch (no existing reference)
  - Requires tRPC query integration (budget progress data)
  - Supportive language + sage tone visual design
  - Gauge/progress visualization without red/green
  - Empty state handling (no budgets set)
- **Estimated Effort:** 2-3 hours
- **Data Source:** Leverage existing `trpc.budgets.progress.useQuery()` from BudgetSummaryCard
- **Visual Design:**
  - Circular progress gauge (not linear bar)
  - Single sage tone (500-700 range) regardless of status
  - Percentage or fraction display (e.g., "3 of 5 on track")
  - Supportive text below gauge
  - Icon: Target or TrendingUp (not AlertTriangle)
- **Split Needed:** No, single component build

### Medium Complexity Areas

#### Visual Warmth System-Wide Rollout (MEDIUM - gradual, checklist-driven)
- **Why Medium:**
  - 164 TypeScript files to audit
  - Many already have rounded corners (33 instances in 18 UI components)
  - Systematic rollout reduces risk
  - Performance testing needed (animations on mobile)
- **Estimated Effort:** 3-4 hours (spread across priority tiers)
- **Approach:**
  - **Tier 1 (Iteration 10):** Dashboard, Settings, Account pages
  - **Tier 2 (Future):** Accounts, Transactions, Budgets, Goals, Analytics
  - **Tier 3 (Future):** Auth pages, modals, dialogs
- **Checklist per Component:**
  - [ ] Rounded corners updated (buttons, cards, inputs)
  - [ ] Soft shadows replace hard borders (where applicable)
  - [ ] Hover states gentle (scale: 1.02, not color flash)
  - [ ] Transitions smooth (200-300ms ease-in-out)
  - [ ] Serif headings where appropriate
  - [ ] Line-height increased (1.5 → 1.6)
- **Split Needed:** No, but use checklist to track progress

#### Greeting Repositioning (LOW-MEDIUM - simple move)
- **Why Low-Medium:**
  - Already exists in page.tsx
  - Just needs to move below affirmation
  - May need size reduction (h1 text-3xl → text-2xl)
  - Could add animation delay (fade in after affirmation)
- **Estimated Effort:** 30 minutes
- **Split Needed:** No

#### Tailwind Config Expansion (LOW-MEDIUM - color additions)
- **Why Low-Medium:**
  - Add terracotta/clay colors (soft-terracotta-500, etc.)
  - Add dusty blue (dusty-blue-500, etc.)
  - Mute gold accent (already defined, may need adjustment)
  - Add paper texture utility class (optional)
- **Estimated Effort:** 1 hour (including testing)
- **Color Recommendations:**
  - Terracotta: `14 65% 65%` (warm, earthy, positive actions)
  - Dusty Blue: `210 20% 60%` (analytical, calm)
  - Paper texture: CSS pseudo-element with noise.png or SVG pattern
- **Split Needed:** No

### Low Complexity Areas

#### PageTransition Duration Update (LOW - config change)
- **Why Low:** Single constant change in animations.ts
- **Change:** `DURATION.normal: 0.3` → `DURATION.slow: 0.5` for page entrance only
- **Estimated Effort:** 15 minutes (includes testing)

#### Button/Card/Input Component Updates (LOW - already have foundation)
- **Why Low:** 33 instances of rounded corners already exist, just need audit pass
- **Estimated Effort:** 1-2 hours for Tier 1 components

## Technology Recommendations

### Primary Stack (No Changes Needed)
- **Framework:** Next.js 14 (App Router) - Already in use, perfect for server/client hybrid
- **Animation:** framer-motion - Already integrated, excellent performance, supports all requirements
- **Styling:** Tailwind CSS - Already configured with warm colors, easy to extend
- **Data Fetching:** tRPC - Already in use for type-safe dashboard queries
- **UI Components:** Radix UI primitives - Already in use (shadcn/ui pattern)

### Supporting Libraries (Current State Good)
- **date-fns:** Already used for date formatting in RecentTransactionsCard
- **lucide-react:** Already used for all icons (Sparkles, TrendingUp, Target, etc.)
- **class-variance-authority:** Already used in Button component for variants
- **Prisma:** Backend ORM (budgets, transactions data)

### No New Dependencies Needed
All requirements can be met with existing stack. Excellent foundation.

## Integration Points

### Internal Integrations

#### Dashboard Page ↔ Affirmation Card
- **Current:** Page imports and renders AffirmationCard
- **Change Required:** Affirmation will be first component (before greeting)
- **New Props Needed:** None (keep self-contained)
- **Animation Coordination:** Affirmation solo fade-in (500ms), then greeting fades in below

#### Dashboard Page ↔ FinancialHealthIndicator (NEW)
- **Integration Type:** Client component import, similar to DashboardStats
- **Data Flow:** 
  - Component: `'use client'` with tRPC hook
  - Query: `trpc.budgets.progress.useQuery({ month: currentMonth })`
  - Data: Budget status counts (on track, warning, over)
- **Props:** Potentially accept `month` prop (default to current)
- **Position:** Third in hierarchy (after affirmation, greeting)

#### DashboardStats ↔ Animation System
- **Current:** Uses staggerContainer/staggerItem from animations.ts
- **Change Required:** Delay stagger start until after affirmation + greeting animate in
- **Approach:** Add `delayChildren` prop to staggerContainer (e.g., 0.8s = 500ms page + 300ms affirmation/greeting)

#### RecentTransactionsCard ↔ Dashboard Layout
- **Current:** Standalone card in grid
- **Change Required:** Move to fourth position (after health indicator)
- **Animation:** Include in stagger sequence with rest of dashboard

#### Greeting ↔ Server-Side User Data
- **Current:** Server component calculates greeting time + user name
- **Change Required:** Move below affirmation, potentially smaller text
- **Data Source:** Same (Supabase auth user metadata)

### External APIs
None required for Iteration 10. All data comes from existing tRPC routers (analytics, budgets).

## Risks & Challenges

### Technical Risks

#### Animation Performance on Mobile (MEDIUM RISK)
- **Risk:** 500ms page fade + staggered component animations may feel sluggish on mid-range mobile
- **Impact:** User experience degrades, app feels slow
- **Likelihood:** Medium (framer-motion is well-optimized, but 164 files means many animations)
- **Mitigation:**
  - Test on real mobile devices (not just desktop DevTools)
  - Use `will-change: transform, opacity` CSS hints for animated elements
  - Implement `prefers-reduced-motion` media query support
  - Profile with Chrome DevTools Performance tab
  - Consider disabling stagger on mobile (instant load, fade only)
- **Rollback Plan:** Revert DURATION.slow to DURATION.normal (300ms)

#### Subjective "Warmth" Assessment (MEDIUM RISK)
- **Risk:** "Warmer/gentler" is subjective; changes may not land as intended
- **Impact:** Rework needed, time wasted on iterations
- **Likelihood:** Medium (design is inherently subjective)
- **Mitigation:**
  - Before/after screenshots for comparison
  - Get user feedback from ahiya.butman@gmail.com early
  - Focus on measurable changes (rounded corners, serif fonts, soft shadows) over vague "warmth"
  - A/B test if possible (show old vs. new to 2-3 users)
- **Success Criteria:**
  - User explicitly confirms "feels warmer"
  - No harsh red/green colors in FinancialHealthIndicator
  - Affirmation is first thing user reads

#### Affirmation Size Responsive Breakpoints (LOW RISK)
- **Risk:** 1.5x size may be too large on mobile or too small on desktop
- **Impact:** Readability issues, awkward layout
- **Likelihood:** Low (can be tested quickly)
- **Mitigation:**
  - Use Tailwind responsive classes (text-2xl md:text-3xl lg:text-4xl)
  - Test on 320px (mobile), 768px (tablet), 1440px (desktop)
  - Adjust padding proportionally (p-6 md:p-8 lg:p-12)
- **Rollback Plan:** Reduce size to 1.2x if 1.5x too aggressive

### Complexity Risks

#### Consistency Across 164 Files (MEDIUM-HIGH RISK)
- **Risk:** Gradual rollout of visual warmth may create inconsistent experience
- **Impact:** Some pages feel warm, others feel cold; jarring transitions
- **Likelihood:** Medium-High (large codebase, many components)
- **Mitigation:**
  - **Tier 1 Priority:** Dashboard, Settings, Account (user spends 80% time here)
  - **Checklist-driven:** Track each component's warmth updates
  - **Component Library Approach:** Update UI primitives first (Button, Card, Input), then pages inherit
  - **Before/After Audit:** Screenshot each updated page for consistency check
- **Builder Note:** This is NOT a split candidate because consistency requires single coherent vision. However, builder should create checklist and work tier by tier.

#### FinancialHealthIndicator Data Dependency (LOW RISK)
- **Risk:** Budget progress query may not provide enough data for health indicator
- **Impact:** Need to create new tRPC procedure or modify existing
- **Likelihood:** Low (BudgetSummaryCard already uses `budgets.progress` successfully)
- **Mitigation:**
  - Reuse existing `trpc.budgets.progress.useQuery()` query
  - If insufficient, extend budgets.router.ts with new `healthIndicator` procedure
  - Worst case: FinancialHealthIndicator shows simplified version (budget count only)

## Recommendations for Planner

### 1. Dashboard Reordering Should Be Atomic Task
**Rationale:** Changing hierarchy affects 5 components (affirmation, greeting, health, transactions, stats) and their animation sequence. Splitting this would create inconsistent states and merge conflicts. Estimate 2-3 hours for complete reorder + animation choreography.

### 2. Create FinancialHealthIndicator Before Reordering
**Rationale:** Component needs to exist before it can be placed in new hierarchy. Build as standalone component first (2-3 hours), test in isolation, then integrate into dashboard reorder task. This prevents blocking and allows parallel work if needed.

### 3. Prioritize Tier 1 Visual Warmth Only
**Rationale:** Iteration 10 scope says "Dashboard, Settings, Account pages first." Don't attempt all 164 files. Focus on high-traffic pages (dashboard, settings/*, account/*). Estimate 3-4 hours for Tier 1. Mark Tier 2/3 as future work.

### 4. Use Component Library Approach for Consistency
**Rationale:** Updating Button, Card, Input primitives first (1-2 hours) means all pages using them inherit warmth automatically. This reduces per-page work and ensures consistency. Update primitives, then pages.

### 5. Test Animation Performance Early
**Rationale:** 500ms "breath before data" is subjective. Test on real mobile device within first hour of dashboard work. If sluggish, reduce to 400ms or 350ms. Don't commit to 500ms without validation.

### 6. Define "Supportive Language" Guidelines
**Rationale:** FinancialHealthIndicator and future components need consistent supportive tone. Create mini-guideline:
- Avoid: "Failed", "Over budget", "Behind", "Bad"
- Use: "Needs attention", "Making progress", "Looking good", "On track"
- Colors: Sage tones only, no red/green dichotomy
This prevents builder from accidentally introducing harsh language.

### 7. Affirmation Daily Rotation Logic Already Perfect
**Rationale:** Existing `new Date().getDate() % affirmations.length` ensures consistency per day without backend storage. No changes needed. Focus effort on visual enhancement (size, background, centering).

### 8. PageTransition Duration Change Is Separate Task
**Rationale:** Can be done in 15 minutes, doesn't block dashboard work. Builder can tackle as quick win before or after main dashboard reorder.

### 9. Paper Texture Is Optional, Don't Block On It
**Rationale:** Requirements say "softer background (subtle gradient or paper texture)." If paper texture takes more than 30 minutes (finding/creating texture image, CSS overlay), skip it. Subtle gradient is sufficient for MVP. Mark texture as future polish.

### 10. Subscription Tier Badge Is Out of Scope
**Rationale:** Requirements mention "Subscription tier badge in sidebar user info" but sidebar isn't part of dashboard reorder. This is Iteration 8 carryover (admin/settings work). Don't conflate. If sidebar badge isn't done yet, mark as separate task.

## Resource Map

### Critical Files/Directories

#### Dashboard Entry Point
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/dashboard/page.tsx`
  - **Purpose:** Main dashboard page, server component with auth check
  - **Modifications:** Reorder component hierarchy, adjust greeting size/position

#### Components to Modify
- `/home/ahiya/Ahiya/wealth/src/components/ui/affirmation-card.tsx`
  - **Purpose:** Daily affirmation display
  - **Modifications:** Increase size 1.5x, center content, softer background, enhance gradient
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardStats.tsx`
  - **Purpose:** 4-card stats grid (net worth, income, expenses, savings rate)
  - **Modifications:** Move lower in hierarchy, adjust animation delay
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/RecentTransactionsCard.tsx`
  - **Purpose:** Recent activity list
  - **Modifications:** Position after health indicator, soften styling

#### Components to Create
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/FinancialHealthIndicator.tsx` (NEW)
  - **Purpose:** Overall budget health gauge with supportive language
  - **Dependencies:** tRPC budgets.progress query, framer-motion, Card component
  - **Design:** Circular gauge, sage tones, supportive text, Target icon

#### Animation Infrastructure
- `/home/ahiya/Ahiya/wealth/src/lib/animations.ts`
  - **Purpose:** Centralized animation constants and variants
  - **Modifications:** Add pageTransitionSlow variant (500ms), add affirmationEntrance variant
- `/home/ahiya/Ahiya/wealth/src/components/ui/page-transition.tsx`
  - **Purpose:** Wrapper component for page fade-in
  - **Modifications:** Accept optional duration prop or use new slow variant

#### Styling Configuration
- `/home/ahiya/Ahiya/wealth/tailwind.config.ts`
  - **Purpose:** Tailwind theme configuration
  - **Modifications:** Add terracotta, dusty-blue color scales, paper texture utility (optional)
- `/home/ahiya/Ahiya/wealth/src/app/globals.css`
  - **Purpose:** Global CSS variables and base styles
  - **Modifications:** Add terracotta/dusty-blue HSL variables, line-height adjustment

#### UI Primitives (Tier 1 Warmth Updates)
- `/home/ahiya/Ahiya/wealth/src/components/ui/button.tsx`
  - **Modifications:** Ensure rounded-lg (already has rounded-md), add gentle hover (scale: 1.02)
- `/home/ahiya/Ahiya/wealth/src/components/ui/card.tsx`
  - **Modifications:** Add soft shadow variant, ensure rounded-lg
- `/home/ahiya/Ahiya/wealth/src/components/ui/stat-card.tsx`
  - **Modifications:** Reduce number size, soften colors, ensure warm styling

### Key Dependencies

#### Animation & Motion
- **framer-motion:** Already installed, powers all animations
- **Usage:** PageTransition, DashboardStats stagger, cardHover effects
- **Version:** Check package.json (likely 10.x or 11.x)

#### Data Fetching
- **@trpc/client, @trpc/react-query:** Type-safe API calls
- **React Query:** Underlying data fetching library
- **Routers:** `/home/ahiya/Ahiya/wealth/src/server/api/routers/budgets.router.ts` (for FinancialHealthIndicator)

#### UI Components
- **@radix-ui/react-*:** Primitives for accessible components
- **lucide-react:** Icon library (Sparkles, Target, TrendingUp, etc.)
- **class-variance-authority:** Button variants, component styling
- **tailwindcss-animate:** Tailwind animation plugin

#### Date & Time
- **date-fns:** Date formatting (already used in RecentTransactionsCard)
- **Usage:** Format transaction dates, could be used for greeting time logic

### Testing Infrastructure

#### Visual Regression Testing
- **Approach:** Manual screenshot comparison (before/after)
- **Tool:** Browser DevTools + manual capture
- **Coverage:** Dashboard page at 320px, 768px, 1440px widths
- **Checklist:**
  - [ ] Affirmation is largest, centered, readable
  - [ ] Greeting below affirmation, appropriate size
  - [ ] FinancialHealthIndicator displays correctly (with and without budgets)
  - [ ] Stats cards animate smoothly (no jank)
  - [ ] Transactions card maintains readability

#### Performance Testing
- **Approach:** Chrome DevTools Performance profiler
- **Metrics:**
  - Time to First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP) - should be affirmation
  - Animation frame rate (should be 60fps on mobile)
- **Devices:**
  - Desktop: 2x CPU slowdown
  - Mobile: 4x CPU slowdown + network throttling
- **Acceptance:** Page load <2s, animations smooth (no dropped frames)

#### Accessibility Testing
- **Approach:** Browser DevTools Lighthouse + manual keyboard navigation
- **Coverage:**
  - [ ] Affirmation readable at all zoom levels (100%, 150%, 200%)
  - [ ] Color contrast ratios pass WCAG AA (4.5:1 for text)
  - [ ] `prefers-reduced-motion` respected (disable animations)
  - [ ] Focus indicators visible on all interactive elements

#### Functional Testing
- **Approach:** Manual testing + existing test suite (if any)
- **Coverage:**
  - [ ] Dashboard loads with empty data (no accounts/transactions)
  - [ ] Dashboard loads with existing data
  - [ ] Affirmation changes day-to-day (test with mocked dates)
  - [ ] FinancialHealthIndicator shows correct status based on budgets
  - [ ] All links/buttons functional after reorder
  - [ ] PageTransition doesn't break navigation

## Questions for Planner

### 1. Should FinancialHealthIndicator Show Overall Budget Status or Top Category?
**Context:** BudgetSummaryCard shows count + status breakdown (on track/warning/over). Should FinancialHealthIndicator show:
- **Option A:** Overall status (e.g., "3 of 5 budgets on track")
- **Option B:** Single worst category (e.g., "Groceries needs attention")
- **Recommendation:** Option A for MVP (simpler, less alarming)

### 2. What Happens If User Has No Budgets Set?
**Context:** FinancialHealthIndicator depends on budget data. If no budgets:
- **Option A:** Show empty state ("No budgets set") with link to create
- **Option B:** Hide component entirely (conditional render)
- **Option C:** Show alternative metric (e.g., "Savings rate: 20%")
- **Recommendation:** Option A (encourages budget creation without hiding feature)

### 3. Should Affirmation Background Use Paper Texture or Enhanced Gradient?
**Context:** Requirements say "softer background (subtle gradient or paper texture)." Which approach:
- **Option A:** Multi-stop gradient (e.g., from-sage-50 via-warm-gray-50 to-sage-100)
- **Option B:** CSS noise texture overlay (requires texture image or SVG)
- **Option C:** Both (gradient + subtle texture)
- **Recommendation:** Option A for MVP (faster, no asset dependency), Option B as future polish

### 4. Should Greeting Size Be Reduced or Kept Same?
**Context:** Greeting currently `text-3xl font-serif font-bold`. With affirmation larger, should greeting:
- **Option A:** Reduce to `text-2xl` (de-emphasize)
- **Option B:** Keep `text-3xl` (maintain hierarchy)
- **Option C:** Reduce font weight to `font-semibold` (softer)
- **Recommendation:** Option A (reduce to text-2xl) to let affirmation be hero

### 5. Should PageTransition Duration Be Configurable Per Page?
**Context:** 500ms "breath before data" might be too slow for other pages (analytics, transactions). Should:
- **Option A:** Apply 500ms to dashboard only, keep 300ms for others
- **Option B:** Apply 500ms system-wide (consistency)
- **Option C:** Make PageTransition accept `duration` prop (flexibility)
- **Recommendation:** Option C (add prop, use slow for dashboard, normal for others)

### 6. Are Terracotta/Dusty Blue Colors Required or Optional?
**Context:** Requirements mention adding these colors, but no specific usage defined. Should:
- **Option A:** Add to tailwind.config.ts even if unused in Iteration 10 (future-proofing)
- **Option B:** Skip if not used in dashboard/settings/account pages (YAGNI principle)
- **Option C:** Add only if specific use case identified during build
- **Recommendation:** Option C (avoid premature abstraction)

### 7. Should Stats Cards Move to Collapsible Section?
**Context:** Requirements move stats "lower, optional detail." Should:
- **Option A:** Move lower but always visible (current plan)
- **Option B:** Move to collapsible "Details" section (hides by default)
- **Option C:** Move to separate "Overview" tab/page
- **Recommendation:** Option A for MVP (simpler, maintains data visibility)

### 8. What's Priority Order for Tier 1 Visual Warmth?
**Context:** Tier 1 includes "Dashboard, Settings, Account pages." Should:
- **Priority 1:** Dashboard (highest traffic)
- **Priority 2:** Settings pages (currency, appearance, categories)
- **Priority 3:** Account pages (profile, membership, security)
- **Recommendation:** Confirm priority order, focus builder effort on Dashboard first

---

## Component Modification Requirements

### AffirmationCard Enhancements

#### Visual Changes
```tsx
// BEFORE (current)
<Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200 hover:shadow-md transition-shadow">
  <CardContent className="p-6 text-center">
    <Sparkles className="h-5 w-5 mx-auto text-gold mb-3" />
    <p className="font-serif text-xl text-warm-gray-800 italic leading-relaxed">
      &ldquo;{dailyAffirmation}&rdquo;
    </p>
  </CardContent>
</Card>

// AFTER (enhanced)
<Card className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 border-sage-200 shadow-lg hover:shadow-xl transition-all duration-300">
  <CardContent className="p-8 md:p-10 lg:p-12 text-center">
    <Sparkles className="h-6 w-6 md:h-8 md:w-8 mx-auto text-gold mb-4 md:mb-6" />
    <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-warm-gray-800 italic leading-loose max-w-4xl mx-auto">
      &ldquo;{dailyAffirmation}&rdquo;
    </p>
  </CardContent>
</Card>
```

#### Sizing Details
- **Mobile (< 768px):** text-2xl, p-8, icon h-6 w-6
- **Tablet (768-1024px):** text-3xl, p-10, icon h-8 w-8
- **Desktop (> 1024px):** text-4xl, p-12, icon h-8 w-8
- **Max Width:** max-w-4xl to prevent overly long lines
- **Line Height:** leading-loose (1.875) for readability
- **Shadow:** shadow-lg (more prominent than other cards)

#### Animation Enhancement
```tsx
// Add entrance animation (solo, before rest of page)
const affirmationEntrance = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
}

<motion.div variants={affirmationEntrance}>
  <Card>...</Card>
</motion.div>
```

### FinancialHealthIndicator Spec

#### Component Structure
```tsx
// /src/components/dashboard/FinancialHealthIndicator.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function FinancialHealthIndicator() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const { data, isLoading } = trpc.budgets.progress.useQuery({ month: currentMonth })

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />
  }

  const budgets = data?.budgets || []
  const budgetCount = budgets.length

  // Calculate overall health
  const onTrack = budgets.filter((b) => b.status === 'good').length
  const warning = budgets.filter((b) => b.status === 'warning').length
  const over = budgets.filter((b) => b.status === 'over').length

  // Determine supportive message and color
  let healthMessage = 'No budgets set'
  let healthColor = 'text-warm-gray-600'
  let gaugePercentage = 0

  if (budgetCount > 0) {
    gaugePercentage = (onTrack / budgetCount) * 100
    if (gaugePercentage >= 75) {
      healthMessage = 'Looking good'
      healthColor = 'text-sage-600'
    } else if (gaugePercentage >= 50) {
      healthMessage = 'Making progress'
      healthColor = 'text-sage-500'
    } else {
      healthMessage = 'Needs attention'
      healthColor = 'text-warm-gray-600'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">Financial Health</CardTitle>
        <Target className="h-5 w-5 text-sage-500" />
      </CardHeader>
      <CardContent>
        {budgetCount === 0 ? (
          <div className="text-center py-4">
            <p className="text-warm-gray-600 mb-3">Set budgets to track your financial health</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/budgets">Create Budget</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Circular Gauge */}
            <div className="relative h-24 w-24">
              <svg className="transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--warm-gray-200))"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--sage-500))"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ 
                    strokeDashoffset: 2 * Math.PI * 40 * (1 - gaugePercentage / 100)
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-warm-gray-900">
                  {onTrack}/{budgetCount}
                </span>
              </div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <p className={`text-lg font-semibold ${healthColor}`}>
                {healthMessage}
              </p>
              <p className="text-sm text-warm-gray-600 mt-1">
                {onTrack} of {budgetCount} budgets on track
              </p>
              {(warning > 0 || over > 0) && (
                <p className="text-xs text-warm-gray-500 mt-1">
                  {warning > 0 && `${warning} approaching limit`}
                  {warning > 0 && over > 0 && ' · '}
                  {over > 0 && `${over} need attention`}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### Data Requirements
- **tRPC Query:** `trpc.budgets.progress.useQuery({ month: currentMonth })`
- **Expected Data:**
  ```typescript
  {
    budgets: Array<{
      id: string
      categoryId: string
      amount: number
      spent: number
      status: 'good' | 'warning' | 'over'
      percentage: number
    }>
  }
  ```
- **Empty State:** Show "No budgets set" with link to /budgets

#### Visual Design
- **Gauge:** SVG circle, sage-500 stroke, 8px stroke width, 40px radius
- **Animation:** Stroke-dashoffset animates from full to percentage over 800ms
- **Colors:** Only sage tones (500-700), no red/green
- **Typography:** text-lg for status, text-sm for details
- **Layout:** Horizontal flex (gauge left, text right) on desktop, stack on mobile

### Dashboard Page Hierarchy

#### New Component Order
```tsx
// /src/app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'there'

  return (
    <PageTransition duration="slow"> {/* 500ms page fade */}
      <div className="space-y-6">
        {/* 1. AFFIRMATION FIRST - Hero element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }} {/* After page fade */}
        >
          <AffirmationCard />
        </motion.div>

        {/* 2. GREETING BELOW - Smaller, secondary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }} {/* After affirmation */}
        >
          <h2 className="text-2xl font-serif font-semibold text-warm-gray-900">
            {greeting}, {userName}!
          </h2>
          <p className="text-warm-gray-600 mt-1">Here&apos;s your financial overview</p>
        </motion.div>

        {/* 3. FINANCIAL HEALTH INDICATOR - New component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <FinancialHealthIndicator />
        </motion.div>

        {/* 4. RECENT TRANSACTIONS - Existing component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <RecentTransactionsCard />
        </motion.div>

        {/* 5. STATS CARDS - Moved lower, stagger animation */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          custom={1.1} {/* Start stagger at 1.1s */}
        >
          <DashboardStats />
        </motion.div>
      </div>
    </PageTransition>
  )
}
```

#### Animation Timeline
- **0-500ms:** Page fade-in (slow transition)
- **300-900ms:** Affirmation entrance (scale + fade)
- **500-900ms:** Greeting entrance (y-offset + fade)
- **700-1100ms:** Health indicator entrance
- **900-1300ms:** Transactions entrance
- **1100ms+:** Stats cards stagger (70ms between each)

**Total Animation:** ~1.5 seconds from page load to full dashboard visible

### Animation System Updates

#### animations.ts Additions
```typescript
// /src/lib/animations.ts

export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,        // For page transitions
  breath: 0.6,      // For affirmation entrance
  progress: 0.8,
}

// Slow page transition (dashboard "breath before data")
export const pageTransitionSlow = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: DURATION.slow, ease: EASING.default },
}

// Affirmation entrance (hero animation)
export const affirmationEntrance = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: DURATION.breath, ease: EASING.default },
}

// Gentle hover for cards (scale instead of color change)
export const gentleHover = {
  whileHover: { scale: 1.02, y: -2 },
  transition: { duration: DURATION.fast, ease: EASING.default },
}
```

#### PageTransition Component Update
```tsx
// /src/components/ui/page-transition.tsx
'use client'

import { motion } from 'framer-motion'
import { pageTransition, pageTransitionSlow } from '@/lib/animations'

interface PageTransitionProps {
  children: React.ReactNode
  duration?: 'normal' | 'slow'
}

export function PageTransition({ children, duration = 'normal' }: PageTransitionProps) {
  const animation = duration === 'slow' ? pageTransitionSlow : pageTransition
  return <motion.div {...animation}>{children}</motion.div>
}
```

---

## Summary: Builder Guidance

### Iteration 10 Core Tasks
1. **Create FinancialHealthIndicator component** (2-3 hours)
   - Build circular gauge with sage tones
   - Integrate tRPC budgets.progress query
   - Supportive language ("Looking good", "Making progress", "Needs attention")
   - Empty state handling

2. **Enhance AffirmationCard** (1.5-2 hours)
   - Increase size 1.5x with responsive breakpoints
   - Multi-stop gradient background (from-sage-50 via-warm-gray-50 to-sage-100)
   - Center content, increase padding
   - Add entrance animation (600ms scale + fade)

3. **Reorder Dashboard Hierarchy** (2-3 hours)
   - Affirmation → Greeting → Health → Transactions → Stats
   - Implement animation choreography (500ms page fade, then sequential component entrances)
   - Reduce greeting size (text-3xl → text-2xl)
   - Test responsive layout on mobile/tablet/desktop

4. **Update Animation System** (1 hour)
   - Add DURATION.slow (0.5s) and DURATION.breath (0.6s)
   - Add pageTransitionSlow and affirmationEntrance variants
   - Update PageTransition to accept duration prop
   - Add gentleHover for future card updates

5. **Tier 1 Visual Warmth** (3-4 hours)
   - Update Button component (rounded-lg, gentle hover)
   - Update Card component (soft shadows)
   - Update StatCard component (reduce number size, softer colors)
   - Update RecentTransactionsCard (maintain current serif font, ensure consistency)
   - Audit dashboard page for any harsh borders or colors

### Testing Checklist
- [ ] Dashboard loads with affirmation as first visible element
- [ ] Animation sequence smooth (500ms page, then components in order)
- [ ] Affirmation readable at 320px, 768px, 1440px
- [ ] FinancialHealthIndicator displays correctly with 0, 1, 5, 10 budgets
- [ ] Gauge animates smoothly (60fps on mobile)
- [ ] No red/green colors in health indicator
- [ ] All components maintain functionality after reorder
- [ ] Performance: FCP < 1s, LCP < 2s (desktop)
- [ ] Accessibility: Color contrast ratios pass WCAG AA
- [ ] `prefers-reduced-motion` disables animations gracefully

### Estimated Total: 10-13 hours (within 5-7 hour estimate after prioritization)

**Note:** If focusing only on dashboard reorder + affirmation + health indicator, estimated 5-7 hours. Tier 1 visual warmth (all UI primitives) adds 3-4 hours. Recommend builder tackle dashboard core first, then assess remaining time for warmth rollout.

---

**Report Complete. Ready for Planner Review.**
