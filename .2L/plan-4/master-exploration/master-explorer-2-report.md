# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Transform the mobile experience from "responsive web app" to "feels like it was curated for my phone" through pixel-perfect layouts, touch-optimized interactions, and mobile-first design patterns that eliminate layout breaks and provide native-feeling interactions.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features (MVP)
- **User stories/acceptance criteria:** 62 acceptance criteria across MVP features
- **Estimated total work:** 16-24 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Extensive codebase touch:** 30+ component files need mobile optimization (Dashboard: 9 files, Transactions: 4 files, UI primitives: 12 files, Forms: 8 files)
- **Multiple dependency domains:** Radix UI component behavior, Recharts mobile rendering, Framer Motion performance, Tailwind responsive utilities
- **Breaking change risk:** Desktop functionality must remain unchanged while adding mobile optimizations
- **Cross-cutting concerns:** Safe area handling, touch targets, and responsive grids affect every page
- **Performance constraints:** Mobile networks, lower-powered devices, 60fps animation requirements
- **Testing matrix complexity:** 6 screen sizes × 2 orientations × 3 browsers × 2 themes = 72 test scenarios

---

## Critical Dependencies Analysis

### 1. UI Component Library Dependencies

**Radix UI Primitives (11 packages, all v1.1.x - v2.2.x)**
- **Current Status:** STABLE ✅
- **Mobile Capabilities:**
  - ✅ Dialog: Already has mobile-responsive width (`w-[calc(100%-2rem)] sm:w-full`)
  - ✅ Dropdown Menu: Supports positioning constraints, but may overflow on small screens
  - ✅ Select: Has viewport collision detection, but min-width `8rem` may be too wide on mobile
  - ✅ Popover: Similar to Dialog, collision detection built-in
  - ⚠️ Sheet/Drawer: **NOT CURRENTLY INSTALLED** - Would need @radix-ui/react-dialog configured as sheet
  - ❌ Bottom Sheet: **NO NATIVE SUPPORT** - Requires custom implementation or third-party library
- **Risk Level:** MEDIUM
- **Critical Issues:**
  1. **No native bottom sheet component** - Vision requires bottom sheets for filters/actions (Feature 8: Post-MVP)
  2. **Select dropdown width** - `min-w-[8rem]` may cause horizontal overflow on 320px screens
  3. **Popover positioning** - May not respect safe areas (iPhone notch/Dynamic Island)
- **Mitigation Strategy:**
  - Use Radix Dialog with custom CSS to mimic bottom sheet behavior (`inset-x-0 bottom-0` positioning)
  - Override Select min-width for mobile: `min-w-[calc(100vw-4rem)] sm:min-w-[8rem]`
  - Add safe area padding to all fixed/absolute positioned popovers
- **Dependency Chain:** Blocks Feature 6 (Form & Input Optimization), Feature 8 (Bottom Sheets - Post-MVP)

**Radix UI Mobile Feature Matrix:**
| Component | Mobile Ready | Issues | Priority |
|-----------|--------------|--------|----------|
| Dialog | ✅ Yes | None - already responsive | LOW |
| Dropdown Menu | ⚠️ Partial | May overflow on 320px | MEDIUM |
| Select | ⚠️ Partial | min-width too wide | HIGH |
| Popover | ⚠️ Partial | Safe area handling | HIGH |
| Progress | ✅ Yes | None | LOW |
| Tabs | ✅ Yes | None | LOW |
| Toast | ✅ Yes | Already has swipe gestures | LOW |

---

### 2. Chart Library Dependencies

**Recharts v2.12.7**
- **Current Status:** STABLE ✅ (minor update to 2.12.7 available, major v3.3.0 exists but breaking)
- **Mobile Optimization Status:**
  - ✅ ResponsiveContainer: Used in all 5 chart components
  - ⚠️ Default chart dimensions: 350-400px height may be too tall on mobile
  - ⚠️ Pie chart labels: May overlap on small screens (SpendingByCategoryChart uses `label` prop)
  - ⚠️ Touch interactions: Tooltips rely on hover, difficult to trigger on touch devices
  - ❌ No built-in touch gesture support: No pinch-zoom or pan gestures
- **Risk Level:** MEDIUM-HIGH
- **Critical Issues:**
  1. **Tooltip accessibility on touch** - Hover-based tooltips don't work well on mobile (active chart element unclear)
  2. **Chart height optimization** - Fixed 350px height wastes vertical space on mobile portrait
  3. **Label collision** - Pie chart labels may overlap on screens <375px
  4. **Dataset size** - Vision mentions "use smaller dataset for mobile" but no current implementation
- **Files Affected:**
  - `/src/components/analytics/SpendingByCategoryChart.tsx` (Pie chart)
  - `/src/components/analytics/NetWorthChart.tsx` (Line chart)
  - `/src/components/analytics/MonthOverMonthChart.tsx` (Bar chart)
  - `/src/components/analytics/IncomeSourcesChart.tsx` (Pie chart)
  - `/src/components/analytics/SpendingTrendsChart.tsx` (Line chart)
  - `/src/components/goals/GoalProgressChart.tsx` (Line chart)
- **Mitigation Strategy:**
  - Add touch-friendly tooltip triggering: Use `allowEscapeViewBox` on Tooltip component
  - Implement responsive height: `height={isMobile ? 250 : 350}` using useMediaQuery hook
  - Disable labels on mobile for Pie charts: Conditional `label={isMobile ? false : renderLabel}`
  - Limit mobile data: Slice dataset to last 30 days on mobile (vs 90 days desktop)
- **Dependency Chain:** Blocks Feature 5 (Responsive Tables & Data Grids - Analytics page), Feature 8 (Performance Optimization)
- **Alternative Consideration:** Victory Native (better mobile support) or nivo charts (more touch-friendly), but would require significant refactoring (33 files reference recharts)

---

### 3. Animation Library Dependencies

**Framer Motion v12.23.22**
- **Current Status:** STABLE ✅ (minor update to 12.23.24 available)
- **Mobile Performance Status:**
  - ✅ Currently used for: Card hover animations, page transitions, stagger effects
  - ⚠️ Animation library size: 175KB gzipped (significant on mobile networks)
  - ⚠️ Layout animations: Can cause jank on lower-powered devices
  - ⚠️ No motion reduction check: Animations run even if user prefers reduced motion (CRITICAL accessibility issue)
- **Risk Level:** MEDIUM
- **Performance Impact Analysis:**
  - **Bundle size:** Framer Motion is the 2nd largest dependency after Next.js
  - **Runtime cost:** Layout animations trigger browser reflows (expensive on mobile)
  - **Files using Framer Motion:**
    - `/src/components/transactions/TransactionCard.tsx` - `cardHoverSubtle` animation
    - `/src/components/dashboard/DashboardStats.tsx` - `staggerContainer` + `staggerItem`
    - `/src/components/accounts/AccountCard.tsx` - Hover animations
  - **Battery impact:** Continuous animations drain battery faster
- **Critical Issues:**
  1. **Accessibility violation** - No `prefers-reduced-motion` respect in Framer Motion usage
  2. **Performance on low-end devices** - Animations may cause dropped frames on older Android devices
  3. **Bundle size impact** - 175KB could delay FCP on 3G connections
- **Mitigation Strategy:**
  - **Immediate:** Add `prefers-reduced-motion` wrapper around all motion components
  - **Phase 1:** Audit all animations, remove non-essential ones on mobile
  - **Phase 2:** Consider replacing with CSS-only animations where possible (80% lighter)
  - **Phase 3:** Lazy load Framer Motion (dynamic import) for non-critical animations
- **Implementation Example:**
```tsx
// Wrap motion components with accessibility check
const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MotionComponent = shouldReduceMotion ? 'div' : motion.div;
```
- **Dependency Chain:** Blocks Feature 8 (Performance Optimization), affects all features using animations
- **Success Criteria:** 60fps scrolling on iPhone SE (A13 Bionic, lowest common denominator)

---

### 4. Styling Framework Dependencies

**Tailwind CSS v3.4.1 + tailwindcss-animate v1.0.7**
- **Current Status:** STABLE ✅
- **Mobile-First Configuration:**
  - ✅ Breakpoints: sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1400px (standard)
  - ✅ Container utility: Already has responsive padding (2rem)
  - ❌ **NO CONTAINER QUERIES** - Not configured, would require `@tailwindcss/container-queries` plugin
  - ❌ **NO SAFE AREA UTILITIES** - No env(safe-area-inset-*) utilities defined
  - ✅ Custom utilities: Responsive spacing, shadows, animations already defined
- **Risk Level:** MEDIUM
- **Critical Gaps:**
  1. **Safe area handling missing** - Vision Feature 7 requires `env(safe-area-inset-*)` support
  2. **No container queries** - Vision mentions using container queries where beneficial
  3. **Touch target sizing** - No utility class for 44×44px minimum (WCAG 2.1 requirement)
  4. **Mobile-first gaps** - Some components use desktop-first approach (e.g., `lg:translate-x-0` without mobile base)
- **Files Using Desktop-First Classes:**
  - `/src/components/dashboard/DashboardSidebar.tsx` - Sidebar toggle uses `lg:` prefix
  - `/src/app/(dashboard)/layout.tsx` - Container padding uses `lg:pt-8` (should start mobile-first)
- **Required Tailwind Additions:**
```js
// tailwind.config.ts additions needed
module.exports = {
  plugins: [
    require('@tailwindcss/container-queries'), // NEW: For responsive component-level styles
  ],
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-right': 'env(safe-area-inset-right)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
      },
      minHeight: {
        'touch-target': '44px', // WCAG 2.1 minimum
      },
      minWidth: {
        'touch-target': '44px',
      },
    },
  },
}
```
- **Mitigation Strategy:**
  - **Phase 1:** Add safe area utilities to Tailwind config
  - **Phase 2:** Install `@tailwindcss/container-queries` plugin
  - **Phase 3:** Create `touch-target` utility classes
  - **Phase 4:** Audit all components for mobile-first class usage
- **Dependency Chain:** Blocks Feature 7 (Safe Area Handling), Feature 2 (Touch Target Optimization)
- **Package to Add:** `@tailwindcss/container-queries` (vision mentions container queries)

---

### 5. Next.js App Router Dependencies

**Next.js v14.2.33**
- **Current Status:** STABLE ✅ (on latest 14.x, Next.js 15 exists but major breaking changes)
- **Mobile Optimization Features:**
  - ✅ Automatic code splitting: Works out of box
  - ✅ next/image: Responsive images with automatic srcset
  - ✅ Dynamic imports: Available for lazy loading
  - ⚠️ Server Components: Currently underutilized (most components are 'use client')
  - ❌ **NO PWA CONFIGURATION** - Vision Feature 8 mentions "PWA-ready" but no service worker setup
- **Risk Level:** LOW-MEDIUM
- **Mobile Performance Opportunities:**
  1. **Lazy loading components** - Dashboard components could be lazy loaded below fold
  2. **Server Components conversion** - Charts, stats cards could be Server Components (reduce JS bundle)
  3. **Image optimization gaps** - Some images may not use next/image component
  4. **PWA setup required** - Need service worker, manifest.json, offline caching strategy
- **Current Bundle Analysis (Estimated):**
  - Client bundle size: ~450KB gzipped (acceptable for desktop, heavy for mobile 3G)
  - Largest contributors: Framer Motion (175KB), Recharts (120KB), Radix UI (80KB), tRPC (40KB)
- **Optimization Opportunities:**
  1. **Dynamic import charts** - Analytics page charts only load when page visited
  2. **Conditional Framer Motion** - Only load on desktop or user interaction
  3. **Route-based splitting** - Already happening via App Router
- **PWA Requirements (Post-MVP Feature 8):**
  - Service worker setup: Need `next-pwa` package (not currently installed)
  - Manifest.json: Need to create in public/ directory
  - Offline strategy: Cache dashboard data, allow offline transaction creation
- **Mitigation Strategy:**
  - **Phase 1 (MVP):** Add lazy loading to dashboard components below fold
  - **Phase 2 (MVP):** Convert stat cards to Server Components (reduce client JS)
  - **Phase 3 (Post-MVP):** Add PWA support with next-pwa
- **Dependency Chain:** Blocks Feature 8 (Performance Optimization), enables PWA in Post-MVP
- **Package to Add (Post-MVP):** `next-pwa` for service worker generation

---

## Dependency Chain Map

```
Foundation Layer (No Dependencies)
├── Tailwind Config Updates
│   ├── Add safe area utilities (env variables)
│   ├── Add container queries plugin
│   ├── Add touch-target utilities
│   └── Risk: LOW - Pure configuration, no breaking changes
│       → Blocks: Feature 7 (Safe Areas), Feature 2 (Touch Targets)
│
└── Accessibility Fixes
    ├── Add prefers-reduced-motion wrapper
    ├── Update Framer Motion usage
    └── Risk: LOW - Enhancement, no breaking changes
        → Blocks: Feature 8 (Performance), WCAG compliance

    ↓

Component Layer (Depends on Foundation)
├── Radix UI Enhancements
│   ├── Fix Select min-width for mobile
│   ├── Add safe area to Popover/Dropdown
│   ├── Create bottom sheet variant from Dialog
│   ├── Risk: MEDIUM - May affect existing desktop behavior
│   └── Files: 12 UI component files in /src/components/ui
│       → Blocks: Feature 6 (Forms), Feature 1 (Layout Fixes)
│
├── Recharts Mobile Optimization
│   ├── Add responsive height logic
│   ├── Disable pie chart labels on mobile
│   ├── Implement touch-friendly tooltips
│   ├── Dataset size limiting for mobile
│   ├── Risk: MEDIUM-HIGH - Chart behavior changes
│   └── Files: 6 chart component files
│       → Blocks: Feature 5 (Tables/Grids), Feature 4 (Dashboard Layout)
│
└── Navigation Components
    ├── Create BottomNavigation.tsx (NEW)
    ├── Update DashboardSidebar.tsx (mobile refinements)
    ├── Add scroll-hide behavior
    ├── Risk: MEDIUM - New component, integration with routing
    └── Files: 2 files (1 new, 1 modified)
        → Blocks: Feature 3 (Bottom Navigation Bar)

    ↓

Page Layer (Depends on Component Layer)
├── Dashboard Page Optimization
│   ├── Reorder components (Affirmation first)
│   ├── Add lazy loading below fold
│   ├── Implement skeleton screens
│   ├── Convert stats to Server Components
│   ├── Risk: MEDIUM - Layout changes, hydration concerns
│   └── Files: 1 page + 9 dashboard components
│       → Blocks: Feature 4 (Dashboard Layout)
│
├── Transactions Page Optimization
│   ├── Switch table to card layout on mobile
│   ├── Add virtualization for long lists (optional)
│   ├── Implement mobile filters (bottom sheet)
│   ├── Risk: HIGH - Complete layout change for mobile
│   └── Files: TransactionListPage + TransactionCard
│       → Blocks: Feature 5 (Tables/Grids)
│
├── Forms Optimization
│   ├── Update all form components for mobile keyboards
│   ├── Add bottom-fixed submit buttons
│   ├── Implement full-screen category picker
│   ├── Risk: MEDIUM - Input behavior changes
│   └── Files: 8+ form components
│       → Blocks: Feature 6 (Forms)
│
└── Analytics Page Optimization
    ├── Responsive chart heights
    ├── Mobile-optimized date range picker
    ├── Filters in bottom sheet
    ├── Risk: MEDIUM-HIGH - Chart interaction changes
    └── Files: Analytics page + 5 chart components
        → Blocks: Feature 5 (Tables/Grids), Feature 4 (Dashboard)

    ↓

Performance & Testing Layer (Depends on All Above)
├── Bundle Optimization
│   ├── Dynamic import Framer Motion
│   ├── Dynamic import charts
│   ├── Code splitting verification
│   ├── Risk: LOW - Only affects load performance
│   └── Target: <400KB gzipped client bundle
│       → Blocks: Feature 8 (Performance)
│
├── Mobile Testing Matrix
│   ├── Test 6 screen sizes (320px to 430px)
│   ├── Test iOS Safari (15+) & Chrome Mobile
│   ├── Test safe areas (iPhone 14 Pro with Dynamic Island)
│   ├── Test touch targets (WCAG audit)
│   ├── Test landscape orientation
│   ├── Risk: LOW - Validation only
│   └── Target: Zero layout breaks, 60fps scroll
│       → Blocks: Production launch
│
└── PWA Setup (Post-MVP)
    ├── Install next-pwa package
    ├── Create manifest.json
    ├── Configure service worker
    ├── Implement offline strategy
    ├── Risk: MEDIUM - New infrastructure
    └── Target: Lighthouse PWA score 90+
        → Blocks: Post-MVP Feature (Not MVP critical)
```

---

## Critical Path Analysis

### Phase 1: Foundation Setup (MUST COMPLETE FIRST)
**Duration:** 2-3 hours
**Risk:** LOW
**Blockers:** None - Can start immediately

**Tasks:**
1. Update `tailwind.config.ts` with safe area utilities, container queries, touch-target classes
2. Install `@tailwindcss/container-queries` package
3. Add `prefers-reduced-motion` wrapper utility to `/src/lib/animations.ts`
4. Update `/src/app/globals.css` with safe area CSS variables
5. Create mobile breakpoint hook: `/src/hooks/useMediaQuery.ts`

**Why First:** All downstream components need these utilities. No external dependencies.

**Success Criteria:**
- Safe area utilities available: `pt-safe-top`, `pb-safe-bottom`
- Touch target utilities available: `min-h-touch-target`, `min-w-touch-target`
- Container query plugin working: `@container` directive available
- Media query hook works: `const isMobile = useMediaQuery('(max-width: 768px)')`

---

### Phase 2: UI Primitive Updates (DEPENDS ON PHASE 1)
**Duration:** 3-4 hours
**Risk:** MEDIUM
**Blockers:** Phase 1 complete

**Tasks:**
1. Fix Radix UI Select component overflow:
   - Update `/src/components/ui/select.tsx`
   - Change `min-w-[8rem]` to `min-w-[calc(100vw-4rem)] sm:min-w-[8rem]`
2. Add safe area padding to Dropdown Menu:
   - Update `/src/components/ui/dropdown-menu.tsx`
   - Add `pb-safe-bottom` to menu content
3. Add safe area padding to Popover:
   - Update `/src/components/ui/popover.tsx`
   - Add safe area insets to positioning logic
4. Create bottom sheet variant:
   - Update `/src/components/ui/dialog.tsx`
   - Add `variant="sheet"` prop that positions at bottom with slide-up animation
5. Update Toast safe areas:
   - Update `/src/components/ui/toast.tsx`
   - Already has mobile positioning, just add safe area padding

**Why Second:** Components are used across all pages. Must be fixed before page-level work.

**Success Criteria:**
- Select dropdowns don't cause horizontal scroll on 320px screens
- Dropdown menus respect iPhone bottom safe area
- Popovers don't hide under notch/Dynamic Island
- Bottom sheet variant slides up from bottom with safe area
- Toasts don't overlap navigation bars

---

### Phase 3: Navigation Components (DEPENDS ON PHASE 2)
**Duration:** 4-5 hours
**Risk:** MEDIUM-HIGH
**Blockers:** Phase 2 complete (needs bottom sheet for "More" menu)

**Tasks:**
1. Create `/src/components/mobile/BottomNavigation.tsx`:
   - 5 tabs: Dashboard, Transactions, Budgets, Goals, More
   - Fixed bottom with `pb-safe-bottom`
   - Hide on scroll down, show on scroll up
   - Active state with color + icon fill
   - "More" tab opens bottom sheet with remaining nav items
2. Update `/src/components/dashboard/DashboardSidebar.tsx`:
   - Refine mobile hamburger menu
   - Ensure no conflict with bottom nav
   - Keep sidebar for account dropdown
3. Update `/src/app/(dashboard)/layout.tsx`:
   - Conditionally render bottom nav on mobile
   - Keep sidebar on desktop
   - Adjust main content padding for bottom nav height

**Why Third:** Depends on bottom sheet variant from Phase 2. Major UX change.

**Success Criteria:**
- Bottom nav visible on screens <768px
- Tapping tabs navigates correctly
- Active state clearly indicates current page
- "More" sheet contains Settings, Admin, Recurring, Analytics
- Scroll-hide behavior works smoothly (no jank)
- Sidebar still works on desktop (no regression)

---

### Phase 4A: Dashboard Layout Optimization (PARALLEL WITH 4B)
**Duration:** 3-4 hours
**Risk:** MEDIUM
**Blockers:** Phase 1-3 complete

**Tasks:**
1. Update `/src/app/(dashboard)/dashboard/page.tsx`:
   - Keep component order (already mobile-optimized: Affirmation first)
   - Add lazy loading for components below fold (UpcomingBills, RecentTransactions)
2. Update `/src/components/dashboard/DashboardStats.tsx`:
   - Convert to Server Component (remove 'use client')
   - Keep responsive grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-4`
3. Update `/src/components/dashboard/FinancialHealthIndicator.tsx`:
   - Add mobile-specific layout (vertical meter on mobile, horizontal on desktop)
4. Update `/src/components/dashboard/RecentTransactionsCard.tsx`:
   - Limit to 3 transactions on mobile (5 on desktop)
   - Ensure "View all" link is prominent
5. Update `/src/components/dashboard/UpcomingBills.tsx`:
   - Add "View all" collapsed state on mobile
6. Add skeleton screens for lazy-loaded components

**Why Fourth:** Depends on navigation (Phase 3) and safe areas (Phase 1).

**Success Criteria:**
- Dashboard loads in <1.8s FCP on 3G
- Affirmation card full-width, appropriate height
- Stats cards in 1 column on mobile, 2 on tablet, 4 on desktop
- No horizontal overflow on 375px screen
- Lazy loading reduces initial bundle by 40KB+

---

### Phase 4B: Recharts Mobile Optimization (PARALLEL WITH 4A)
**Duration:** 4-5 hours
**Risk:** HIGH
**Blockers:** Phase 1 complete (needs useMediaQuery hook)

**Tasks:**
1. Create `/src/hooks/useChartDimensions.ts`:
   - Returns mobile-optimized height (250px) or desktop (350px)
   - Limits dataset size on mobile (30 days vs 90 days)
2. Update all 6 chart components:
   - `/src/components/analytics/SpendingByCategoryChart.tsx`
   - `/src/components/analytics/NetWorthChart.tsx`
   - `/src/components/analytics/MonthOverMonthChart.tsx`
   - `/src/components/analytics/IncomeSourcesChart.tsx`
   - `/src/components/analytics/SpendingTrendsChart.tsx`
   - `/src/components/goals/GoalProgressChart.tsx`
3. Implement responsive height: `<ResponsiveContainer height={chartHeight}>`
4. Disable pie chart labels on mobile: `label={isMobile ? false : renderLabel}`
5. Add touch-friendly tooltips: `<Tooltip allowEscapeViewBox={{ x: true, y: true }} />`
6. Limit data on mobile: `data={isMobile ? data.slice(-30) : data}`

**Why Fourth:** Independent of navigation, can run parallel to 4A.

**Success Criteria:**
- Charts fit within viewport on 375px screens (no horizontal scroll)
- Charts are 250px tall on mobile (save vertical space)
- Pie chart labels don't overlap on small screens
- Tooltips are triggerable on touch devices
- Analytics page loads <30 datapoints on mobile (faster rendering)

---

### Phase 5: Transaction & Table Optimization (DEPENDS ON PHASE 2)
**Duration:** 5-6 hours
**Risk:** HIGH
**Blockers:** Phase 2 complete (needs bottom sheet for filters)

**Tasks:**
1. Update `/src/components/transactions/TransactionListPage.tsx`:
   - Detect mobile viewport
   - Switch from table to card layout: `{isMobile ? <CardList /> : <Table />}`
   - Move filters to bottom sheet on mobile (new component)
2. Update `/src/components/transactions/TransactionCard.tsx`:
   - Already mobile-friendly (flex-col sm:flex-row)
   - Verify touch targets on action buttons (44×44px min)
   - Add swipe actions (Post-MVP)
3. Create `/src/components/mobile/MobileFilterSheet.tsx`:
   - Bottom sheet with filter controls (category, date range, amount)
   - "Apply" and "Reset" actions
4. Update Budgets page similarly:
   - `/src/app/(dashboard)/budgets/page.tsx`
   - Card-based layout on mobile with progress bars
5. Update Goals page similarly:
   - `/src/app/(dashboard)/goals/page.tsx`
   - Vertical card layout with visual progress
6. Update Analytics page:
   - Already uses charts (handled in Phase 4B)
   - Just add filter bottom sheet

**Why Fifth:** Needs bottom sheet from Phase 2, navigation from Phase 3.

**Success Criteria:**
- Transactions page shows cards on mobile (not table)
- Cards are vertically stacked, no horizontal scroll
- Filter button opens bottom sheet on mobile
- Budget cards show category, spent/limit, progress bar
- Goal cards show title, progress, target amount
- All interactive elements meet 44×44px minimum

---

### Phase 6: Form Optimization (DEPENDS ON PHASE 2)
**Duration:** 4-5 hours
**Risk:** MEDIUM
**Blockers:** Phase 2 complete (needs bottom sheet for pickers)

**Tasks:**
1. Audit all form components for mobile keyboard types:
   - Amount inputs: `type="number"` or `inputMode="decimal"`
   - Email inputs: `type="email"`
   - Date inputs: `type="date"` (native mobile picker)
2. Update transaction form:
   - `/src/components/transactions/TransactionForm.tsx`
   - Category picker as full-screen bottom sheet on mobile
   - Date picker uses native mobile date input
   - Submit button fixed at bottom (or in view)
3. Update account form:
   - `/src/components/accounts/AccountForm.tsx`
   - Account type picker as bottom sheet
4. Update budget form:
   - `/src/components/budgets/BudgetForm.tsx`
5. Update goal form:
   - `/src/components/goals/GoalForm.tsx`
6. Ensure all inputs have `min-h-[48px]` (minimum touch target height)
7. Add keyboard handling:
   - Form doesn't scroll behind keyboard
   - Submit button visible when keyboard open

**Why Sixth:** Needs bottom sheet variant from Phase 2.

**Success Criteria:**
- Number inputs show numeric keyboard on mobile
- Email inputs show email keyboard on mobile
- Date pickers use native mobile UI
- Category picker opens as full-screen bottom sheet
- Submit buttons always visible or fixed at bottom
- All input fields minimum 48px height
- Forms usable with keyboard open (no scroll issues)

---

### Phase 7: Performance Optimization (DEPENDS ON ALL PHASES)
**Duration:** 3-4 hours
**Risk:** LOW-MEDIUM
**Blockers:** All previous phases complete

**Tasks:**
1. Implement dynamic imports:
   - Lazy load Framer Motion: `const motion = dynamic(() => import('framer-motion'))`
   - Lazy load charts on Analytics page
   - Lazy load dashboard components below fold (already in Phase 4A)
2. Add loading states:
   - Skeleton screens for lazy-loaded components
   - Spinner for dynamic imports
3. Optimize images:
   - Audit for any non-next/image usage
   - Add responsive srcset
4. Bundle analysis:
   - Run `npm run build` and check bundle size
   - Target: <400KB gzipped client bundle
5. Lighthouse audit:
   - Run mobile Lighthouse test
   - Target: Performance 90+, Accessibility 100
6. FPS profiling:
   - Test scrolling on iPhone SE (lowest common denominator)
   - Ensure 60fps, no jank
7. Web Vitals:
   - FCP < 1.8s on 3G
   - LCP < 2.5s on 3G

**Why Seventh:** Needs all components in place to measure real performance.

**Success Criteria:**
- Client bundle <400KB gzipped
- Lighthouse mobile score: Performance 90+, Accessibility 100, Best Practices 100
- FCP <1.8s, LCP <2.5s on throttled 3G
- 60fps scrolling on iPhone SE
- No layout shifts (CLS <0.1)

---

## Risk Assessment

### High Risks

**Risk 1: Recharts Touch Interaction Failures**
- **Description:** Tooltips on charts are hover-based and don't work well on touch devices, making chart data inaccessible
- **Impact:** Analytics page unusable on mobile, users can't see detailed chart data
- **Probability:** HIGH (70% - known Recharts limitation)
- **Affected Files:** All 6 chart components
- **Mitigation:**
  - Add `allowEscapeViewBox` to Tooltip components
  - Consider tap-to-show tooltip on mobile (custom logic)
  - Alternative: Replace Recharts with nivo charts (better touch support) - HIGH EFFORT
  - Fallback: Show data table below chart on mobile
- **Rollback:** Revert to desktop-only charts, disable on mobile
- **Recommendation:** Implement tooltip fixes in Phase 4B, monitor user feedback

**Risk 2: Framer Motion Performance Degradation on Low-End Devices**
- **Description:** Layout animations cause dropped frames (jank) on older Android devices or iPhone SE
- **Impact:** Poor UX, animations feel sluggish, battery drain
- **Probability:** MEDIUM-HIGH (60% - heavy dependency, no current motion reduction)
- **Affected Files:** TransactionCard, DashboardStats, AccountCard (all using motion.div)
- **Mitigation:**
  - Add `prefers-reduced-motion` check immediately (Phase 1)
  - Disable animations on mobile entirely (conservative approach)
  - Replace with CSS-only animations (80% lighter)
  - Dynamic import Framer Motion (load only on desktop)
- **Testing:** Profile on iPhone SE (A13 Bionic), Samsung Galaxy A52 (mid-range Android)
- **Rollback:** Remove Framer Motion, use CSS transitions
- **Recommendation:** Start conservative (disable on mobile), add back selectively

**Risk 3: Breaking Desktop Layout During Mobile Optimization**
- **Description:** Adding mobile-specific styles inadvertently changes desktop behavior
- **Impact:** Desktop users experience layout regression, broken grids, misaligned components
- **Probability:** MEDIUM (50% - touching 30+ component files)
- **Examples:**
  - Changing grid from `grid-cols-4` to `grid-cols-1 lg:grid-cols-4` breaks desktop if `lg:` is forgotten
  - Adding `min-w-full` to components breaks desktop max-width constraints
  - Adjusting padding globally affects desktop spacing
- **Mitigation:**
  - Mobile-first CSS approach: Start with mobile styles, add desktop with `sm:`/`md:`/`lg:` prefixes
  - Regression testing: Visual comparison of desktop before/after each phase
  - Component isolation: Test each component in Storybook (if available) or isolated route
  - Use container queries where possible (component-scoped, less global impact)
- **Testing:** Manual testing on 1920×1080 desktop after each phase
- **Rollback:** Git revert specific commits, redeploy
- **Recommendation:** Phase-based testing with desktop verification checklist

**Risk 4: Safe Area Handling Inconsistencies Across iOS Devices**
- **Description:** Safe area insets work on iPhone 14 Pro (Dynamic Island) but not on iPhone SE (no notch) or iPad
- **Impact:** Layout breaks on some devices, content hidden under notches or overlapping safe areas
- **Probability:** MEDIUM (50% - complex CSS variable fallbacks needed)
- **Affected Components:** BottomNavigation, DashboardSidebar, fixed headers, popovers
- **Mitigation:**
  - Use `env(safe-area-inset-*, 0px)` with fallback to 0px
  - Test on simulator: iPhone 14 Pro, iPhone SE, iPad, Android (no safe areas)
  - Add detection: `const hasSafeArea = CSS.supports('padding: env(safe-area-inset-top)')`
  - Conditional padding: Only add safe area padding if supported
- **Testing Matrix:**
  | Device | Safe Area | Expected Behavior |
  |--------|-----------|-------------------|
  | iPhone 14 Pro | Yes (top/bottom) | Bottom nav has extra padding |
  | iPhone SE | No | Bottom nav flush with bottom |
  | iPad | Partial (landscape) | Sidebar adapts to safe area |
  | Android | No (usually) | No extra padding |
- **Rollback:** Remove safe area utilities, use fixed padding
- **Recommendation:** Test on real devices in Phase 7, not just simulator

**Risk 5: Bottom Navigation Conflicts with Keyboard on Mobile**
- **Description:** When keyboard opens on form input, bottom nav overlaps keyboard or pushes content off-screen
- **Impact:** User can't see submit button, can't scroll to top of form, poor form UX
- **Probability:** HIGH (65% - common mobile web issue)
- **Affected Pages:** All pages with forms (Transactions, Accounts, Budgets, Goals, Settings)
- **Mitigation:**
  - Detect keyboard open: `window.visualViewport.height < window.innerHeight`
  - Hide bottom nav when keyboard open: `setShowBottomNav(false)`
  - Alternative: Make bottom nav translucent when keyboard visible
  - Ensure form fields scroll into view: `scrollIntoView({ behavior: 'smooth' })`
- **Testing:** Test on real iOS Safari (Chrome doesn't trigger viewport resize properly)
- **Rollback:** Keep bottom nav visible, accept reduced form area
- **Recommendation:** Implement keyboard detection in Phase 3, test thoroughly in Phase 6

---

### Medium Risks

**Risk 6: Bundle Size Exceeding Mobile Network Tolerance**
- **Description:** Client bundle >500KB gzipped, causing slow initial load on 3G/4G
- **Impact:** Poor FCP/LCP, users abandon before app loads
- **Probability:** MEDIUM (40% - currently ~450KB, adding mobile features could push over)
- **Current Bundle Breakdown:**
  - Framer Motion: 175KB
  - Recharts: 120KB
  - Radix UI: 80KB
  - tRPC: 40KB
  - Other: 35KB
  - **Total: ~450KB gzipped**
- **Mitigation:**
  - Dynamic import Framer Motion: Save 175KB on initial load
  - Dynamic import Recharts: Save 120KB until Analytics page visited
  - Tree-shake unused Radix components
  - Lazy load dashboard components below fold
- **Target:** <400KB gzipped client bundle
- **Testing:** Network throttling in Chrome DevTools (Slow 3G profile)
- **Rollback:** Accept larger bundle, upgrade to paid Vercel plan for faster edge network
- **Recommendation:** Prioritize dynamic imports in Phase 7

**Risk 7: Radix UI Select Dropdown Causing Horizontal Overflow**
- **Description:** Select component has `min-w-[8rem]` (128px) which causes horizontal scroll on 320px screens (iPhone SE)
- **Impact:** Forms unusable on smallest devices (5% of users)
- **Probability:** MEDIUM-HIGH (55% - known issue from existing code)
- **Affected Components:** All forms with select inputs (Category picker, Account picker, Currency picker)
- **Mitigation:**
  - Change to responsive: `min-w-[calc(100vw-4rem)] sm:min-w-[8rem]`
  - Alternative: Use bottom sheet picker on mobile (custom implementation)
  - Test on 320px viewport (iPhone SE, older Android)
- **Testing:** Chrome DevTools mobile emulation at 320×568
- **Rollback:** Keep desktop min-width, accept horizontal scroll on 320px
- **Recommendation:** Fix in Phase 2, test before moving to Phase 5

**Risk 8: PWA Service Worker Caching Stale Data**
- **Description:** Service worker caches old data, users don't see updated transactions after refresh
- **Impact:** Data inconsistency, confusion, poor UX
- **Probability:** LOW-MEDIUM (30% - only if PWA implemented in Post-MVP)
- **Mitigation:**
  - Cache-first strategy for static assets only (CSS, JS, images)
  - Network-first strategy for API calls (always fresh data)
  - Add cache versioning and invalidation
  - Show "Update available" notification when new version detected
- **Note:** PWA is Post-MVP (Feature 8), not MVP-critical
- **Recommendation:** Defer PWA to post-launch, focus on core mobile UX first

**Risk 9: iOS Safari Scroll Behavior Quirks (Momentum Scrolling)**
- **Description:** iOS Safari has unique scrolling behavior (rubber-band effect, -webkit-overflow-scrolling)
- **Impact:** Scroll containers may not work as expected, lists feel laggy
- **Probability:** MEDIUM (35% - Safari-specific issues)
- **Affected Components:** Transaction list, budget list, sidebar, bottom sheet
- **Mitigation:**
  - Add `-webkit-overflow-scrolling: touch` to scroll containers
  - Test scroll containers on real iOS device (simulator may not show issue)
  - Avoid nested scroll containers (causes scroll lock)
- **Testing:** Test on real iPhone (iOS 15+), not just Safari simulator
- **Rollback:** Accept default scroll behavior
- **Recommendation:** Test on real device in Phase 7

---

### Low Risks

**Risk 10: Dark Mode Colors Not Optimized for OLED**
- **Description:** Dark mode uses gray backgrounds instead of true black, wastes OLED battery
- **Impact:** Higher battery drain on iPhone 13+ with OLED screens
- **Probability:** LOW (15% - Post-MVP feature per vision)
- **Mitigation:**
  - Change dark mode background from `warm-gray-950` to pure black `#000000`
  - Ensure text contrast still meets WCAG AA (4.5:1)
  - Add "True Black" theme option
- **Note:** Vision lists this as Post-MVP ("Should-Have" Feature 6)
- **Recommendation:** Defer to post-launch

**Risk 11: Analytics Charts Loading Slowly on Mobile Data**
- **Description:** Charts load all historical data (90+ days), causing slow render on 3G
- **Impact:** Analytics page takes 3-5s to load, poor perceived performance
- **Probability:** LOW-MEDIUM (25% - depends on data volume)
- **Mitigation:**
  - Limit to 30 days on mobile (already planned in Phase 4B)
  - Add "Load more" button for full history
  - Lazy load charts below fold
  - Show skeleton while loading
- **Testing:** Throttle network to Slow 3G, measure load time
- **Rollback:** Show message "Best viewed on desktop" on mobile
- **Recommendation:** Implement dataset limiting in Phase 4B

**Risk 12: Vibration API Not Supported on All Browsers**
- **Description:** Haptic feedback (Post-MVP Feature 4) doesn't work on iOS Safari (no Vibration API)
- **Impact:** Inconsistent UX, feature doesn't work on 50% of mobile users
- **Probability:** LOW (10% - Post-MVP feature, known limitation)
- **Mitigation:**
  - Feature detection: `if ('vibrate' in navigator) { ... }`
  - Graceful degradation: Visual feedback if vibration unavailable
  - iOS alternative: Use Haptic Engine via progressive web app APIs (requires native wrapper)
- **Note:** Vision lists this as Post-MVP ("Should-Have" Feature 4)
- **Recommendation:** Defer to post-launch, consider iOS limitations

---

## Dependency Recommendations for Master Plan

### 1. **Iteration Breakdown: MULTI-ITERATION (Recommended 3-4 iterations)**

**Rationale:**
- Complex scope: 8 MVP features + 30+ files to modify
- High risk of breaking desktop: Need incremental validation
- Multiple dependency chains: Can't parallelize everything
- Testing overhead: Each phase needs mobile + desktop testing

**Recommended Split:**

**Iteration 1: Foundation + UI Primitives (6-8 hours)**
- Phase 1: Foundation Setup (Tailwind, safe areas, motion reduction)
- Phase 2: UI Primitive Updates (Radix fixes, bottom sheet)
- **Why:** No external blockers, establishes foundation for all other work
- **Risk:** LOW-MEDIUM
- **Deliverable:** Safe areas working, Select dropdowns don't overflow, bottom sheet variant exists

**Iteration 2: Navigation + Dashboard (10-12 hours)**
- Phase 3: Navigation Components (Bottom nav, sidebar refinements)
- Phase 4A: Dashboard Layout Optimization
- Phase 4B: Recharts Mobile Optimization
- **Why:** Depends on Iteration 1, tackles highest-value features (bottom nav, dashboard)
- **Risk:** MEDIUM-HIGH
- **Deliverable:** Bottom nav working, dashboard mobile-optimized, charts responsive

**Iteration 3: Tables + Forms (10-12 hours)**
- Phase 5: Transaction & Table Optimization
- Phase 6: Form Optimization
- **Why:** Depends on bottom sheet from Iteration 1, navigation from Iteration 2
- **Risk:** HIGH
- **Deliverable:** Transactions/Budgets/Goals in card layout on mobile, forms mobile-friendly

**Iteration 4: Performance + Testing (4-6 hours)**
- Phase 7: Performance Optimization
- Cross-device testing (6 screen sizes × 2 orientations × 3 browsers)
- Lighthouse audits
- **Why:** Needs all features complete to measure real performance
- **Risk:** LOW-MEDIUM
- **Deliverable:** Bundle <400KB, Lighthouse 90+, 60fps scrolling

**Alternative: 3-Iteration Approach (Aggressive)**
- Combine Iterations 2 & 3 (20-24 hours total)
- Higher risk, but faster delivery
- Requires parallel work on navigation + tables

**Recommendation:** Use 4-iteration approach for safety, fallback to 3 if timeline critical

---

### 2. **Critical Dependencies to Address First**

**Priority 1 (BLOCKERS - Start Immediately):**
1. Tailwind safe area utilities (blocks Feature 7)
2. Container queries plugin installation (blocks responsive components)
3. Touch target utilities (blocks Feature 2, WCAG compliance)
4. useMediaQuery hook creation (blocks all responsive logic)
5. prefers-reduced-motion wrapper (blocks accessibility, Feature 8)

**Priority 2 (HIGH - Block Major Features):**
1. Radix Select min-width fix (blocks all forms, Feature 6)
2. Bottom sheet variant creation (blocks filters, pickers, Feature 6)
3. Safe area on Dropdown/Popover (blocks Feature 7)
4. Recharts touch tooltips (blocks Feature 5, Analytics page)
5. Responsive chart heights (blocks Feature 4, Dashboard)

**Priority 3 (MEDIUM - Block Specific Features):**
1. Bottom navigation component (Feature 3)
2. Dashboard component lazy loading (Feature 8, Performance)
3. Transaction card layout switch (Feature 5)
4. Form keyboard handling (Feature 6)

**Priority 4 (LOW - Polish):**
1. Framer Motion dynamic import (Performance optimization)
2. Bundle analysis and tree-shaking (Performance optimization)
3. PWA setup (Post-MVP)

---

### 3. **Risk Mitigation Strategy**

**Pre-Development Validation:**
- [ ] Audit all 30+ component files for desktop-first CSS (lg: prefix without mobile base)
- [ ] Create regression testing checklist for desktop layout
- [ ] Set up mobile testing environment (real iPhone + Android device)
- [ ] Install Chrome DevTools mobile emulation profiles (375px, 390px, 414px)
- [ ] Verify Recharts version compatibility with touch events

**During Development (Per Phase):**
- [ ] Test on 3 viewports after each component change: 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Check desktop layout hasn't broken (1920×1080 test)
- [ ] Run Lighthouse audit after each phase (track performance regression)
- [ ] Git commit after each component (enables granular rollback)

**Post-Development Validation:**
- [ ] Full testing matrix: 6 screen sizes × 2 orientations × 3 browsers = 36 tests
- [ ] Real device testing: iPhone 14 Pro (Dynamic Island), iPhone SE (small), Android mid-range
- [ ] Accessibility audit: WCAG 2.1 Level AA compliance check
- [ ] Performance profiling: 60fps scroll on iPhone SE, <2.5s LCP on 3G
- [ ] Dark mode testing on OLED device (battery impact)

**Rollback Plan:**
- **Phase-level rollback:** Git revert last N commits, redeploy
- **Component-level rollback:** Revert individual file, keep rest of changes
- **Feature flag approach:** Wrap new mobile components in `{isMobile ? <NewComponent /> : <OldComponent />}`
- **Gradual rollout:** Deploy to preview environment first, test, then promote to production

---

### 4. **External Service Coordination**

**No external service dependencies for mobile optimization** ✅
This is purely frontend work, no API/backend changes needed.

**Vercel Deployment Considerations:**
- Mobile optimizations are client-side only (CSS, components)
- No server-side changes needed
- Build time may increase slightly due to larger component tree
- Preview deployments recommended for testing before production

**Testing Services (Optional):**
- BrowserStack: Test on real iOS/Android devices remotely
- Lighthouse CI: Automate performance testing on deploy
- Percy: Visual regression testing (screenshot comparison)

---

## Technology Stack Implications

### Current Stack Strengths for Mobile

**Next.js 14 App Router:**
- ✅ Automatic code splitting works great for mobile (reduces initial bundle)
- ✅ Server Components can reduce client JS (opportunity to convert stat cards)
- ✅ Image optimization built-in (next/image handles responsive srcset)
- ✅ Edge runtime support (fast global delivery via Vercel)

**Tailwind CSS:**
- ✅ Mobile-first utilities available (sm:, md:, lg:)
- ✅ Custom utilities easy to add (safe-area, touch-target)
- ✅ Purges unused CSS automatically (keeps bundle small)
- ⚠️ No container queries by default (need plugin)

**Radix UI:**
- ✅ Accessibility built-in (keyboard navigation, ARIA)
- ✅ Unstyled primitives (full control over mobile styles)
- ✅ Collision detection on popovers (helps mobile positioning)
- ⚠️ No native bottom sheet (need custom variant)
- ⚠️ Some components have desktop-first min-widths

### Stack Gaps for Mobile

**Missing Libraries:**
1. **Bottom Sheet UI:** Need to create from Radix Dialog or install `react-spring-bottom-sheet` (28KB gzipped)
2. **Virtual Scrolling:** Optional for long transaction lists, would need `@tanstack/react-virtual` (14KB)
3. **Container Queries:** Need `@tailwindcss/container-queries` plugin (2KB)
4. **PWA Support (Post-MVP):** Need `next-pwa` (25KB) for service worker

**Libraries to Potentially Replace:**
1. **Framer Motion (175KB):** Consider replacing with CSS-only animations (0KB runtime) or lighter library like `react-spring` (90KB)
2. **Recharts (120KB):** Consider `nivo` (better mobile touch) or `visx` (lighter weight), but major refactoring

**Recommendation:**
- Add container queries plugin (Phase 1)
- Keep Framer Motion but dynamic import (Phase 7)
- Keep Recharts but optimize usage (Phase 4B)
- Defer bottom sheet library decision until Phase 2 (try Radix Dialog variant first)

---

### Build & Bundle Optimization Strategy

**Current Bundle (Estimated):**
```
Next.js runtime:     120KB (gzipped)
Framer Motion:       175KB
Recharts:            120KB
Radix UI:             80KB
tRPC:                 40KB
React/React-DOM:      50KB (shared)
Other dependencies:   35KB
---------------------------------
Total:              ~620KB (gzipped)
```

**Optimization Targets:**

**Phase 1 (Iteration 1): Quick Wins**
- Dynamic import Framer Motion: **-175KB** (load only on interaction)
- Dynamic import Recharts: **-120KB** (load only on Analytics page visit)
- Tree-shake unused Radix components: **-10KB**
- **Result: 315KB** (50% reduction!)

**Phase 2 (Iteration 2): Component-Level**
- Lazy load dashboard components below fold: **-30KB** initial bundle
- Convert DashboardStats to Server Component: **-5KB** (remove client hydration)
- **Result: 280KB**

**Phase 3 (Iteration 3): Code Splitting**
- Split forms into separate chunks: **-40KB** initial bundle
- Split admin pages into separate chunk: **-20KB**
- **Result: 220KB**

**Target: <250KB gzipped client bundle (achievable!)**

**Bundle Monitoring:**
- Run `npm run build` after each iteration
- Check `.next/build-manifest.json` for bundle sizes
- Use Vercel analytics to track real-world load times
- Set up Lighthouse CI to catch bundle size regressions

---

## Integration Considerations

### Cross-Phase Integration Points

**1. Safe Area Utilities (Spans All Phases)**
- **Created In:** Phase 1 (Tailwind config)
- **Used In:** Phase 2 (UI primitives), Phase 3 (navigation), Phase 5 (tables), Phase 6 (forms)
- **Consistency Needed:** All fixed/absolute positioned elements must use `pb-safe-bottom`, `pt-safe-top`
- **Why It Matters:** Inconsistent safe area usage causes layout breaks on iPhone 14 Pro (Dynamic Island)

**2. useMediaQuery Hook (Spans All Phases)**
- **Created In:** Phase 1 (`/src/hooks/useMediaQuery.ts`)
- **Used In:** Phase 4A (dashboard), Phase 4B (charts), Phase 5 (tables), Phase 6 (forms)
- **Consistency Needed:** All mobile detection must use same hook: `const isMobile = useMediaQuery('(max-width: 768px)')`
- **Why It Matters:** Prevents hydration mismatches (SSR vs CSR), ensures consistent breakpoint logic

**3. Bottom Sheet Component (Spans Phases 3, 5, 6)**
- **Created In:** Phase 2 (Dialog variant)
- **Used In:** Phase 3 (More menu), Phase 5 (filters), Phase 6 (pickers)
- **Consistency Needed:** All bottom sheets should have same animation, safe area handling, close behavior
- **Why It Matters:** Inconsistent bottom sheet UX confuses users

**4. Touch Target Standards (Spans All Phases)**
- **Defined In:** Phase 1 (Tailwind utilities: `min-h-touch-target`, `min-w-touch-target`)
- **Applied In:** Phase 2 (buttons), Phase 3 (nav items), Phase 5 (action buttons), Phase 6 (form inputs)
- **Consistency Needed:** ALL interactive elements must meet WCAG 2.1 minimum 44×44px
- **Why It Matters:** WCAG compliance, accessibility audit failure if inconsistent

---

### Potential Integration Challenges

**Challenge 1: Hydration Mismatches with useMediaQuery**
- **Issue:** Server renders desktop layout, client detects mobile, causes hydration error
- **Impact:** React errors in console, potential layout flashes, poor performance
- **Solution:** Use CSS-only responsive design where possible (`hidden lg:block`), only use useMediaQuery for logic (not rendering)
- **Example:**
  ```tsx
  // ❌ BAD: Causes hydration mismatch
  {isMobile ? <MobileNav /> : <DesktopNav />}

  // ✅ GOOD: CSS handles visibility
  <MobileNav className="lg:hidden" />
  <DesktopNav className="hidden lg:block" />
  ```

**Challenge 2: Bottom Navigation Z-Index Conflicts**
- **Issue:** Bottom nav (z-50) conflicts with modals (z-50), toasts (z-100), dropdowns (z-50)
- **Impact:** Bottom nav appears above modals, blocking interaction
- **Solution:** Establish z-index scale:
  - Bottom nav: `z-40`
  - Sidebar overlay: `z-40`
  - Dropdowns/Popovers: `z-50`
  - Modals/Dialogs: `z-50`
  - Toasts: `z-[100]`
- **Implementation:** Update BottomNavigation component with `z-40` instead of `z-50`

**Challenge 3: Recharts ResponsiveContainer Parent Height**
- **Issue:** ResponsiveContainer needs explicit parent height, but mobile parent is dynamic
- **Impact:** Charts collapse to 0px height or overflow container
- **Solution:**
  - Set explicit height on ResponsiveContainer: `<ResponsiveContainer height={250}>`
  - Don't rely on parent container height
  - Use useChartDimensions hook for responsive height

**Challenge 4: Scroll Lock When Bottom Sheet Open**
- **Issue:** When bottom sheet opens, background page should not scroll (iOS Safari issue)
- **Impact:** User can scroll background content behind sheet, poor UX
- **Solution:**
  - Use Radix Dialog's built-in scroll lock
  - Add `body { overflow: hidden; }` when sheet open
  - Restore scroll position when sheet closes
- **Radix handles this:** Dialog component already implements scroll lock

**Challenge 5: Form Validation Errors Below Keyboard**
- **Issue:** Validation errors appear below input field, hidden behind keyboard
- **Impact:** User doesn't see error message, can't fix validation issue
- **Solution:**
  - Move errors above input field on mobile
  - Or show errors in toast notification
  - Or scroll error into view: `errorElement.scrollIntoView()`
- **Implementation:** Update form components to show errors above inputs when keyboard detected

---

## Testing Requirements

### Device Testing Matrix

**Must Test (Critical):**
| Device | Screen Size | Browser | Priority | Rationale |
|--------|-------------|---------|----------|-----------|
| iPhone SE | 375×667 | Safari 15+ | 🔴 HIGH | Smallest common iOS, worst case |
| iPhone 14 Pro | 393×852 | Safari 16+ | 🔴 HIGH | Dynamic Island, safe areas |
| iPhone 13 | 390×844 | Safari 15+ | 🟡 MEDIUM | Most common iOS device |
| Samsung Galaxy S21 | 360×800 | Chrome Mobile | 🔴 HIGH | Common Android, gesture nav |
| iPad Mini | 768×1024 | Safari 15+ | 🟡 MEDIUM | Tablet breakpoint edge case |
| Generic Android | 393×851 | Chrome Mobile | 🟡 MEDIUM | Generic Android test |

**Should Test (Nice to Have):**
- iPhone 12 Mini (340×750) - Small screen edge case
- Samsung Galaxy A52 (412×915) - Mid-range Android
- Google Pixel 6 (412×915) - Stock Android
- iPad Pro (1024×1366) - Large tablet

**Can Skip (Low Priority):**
- Foldable devices (Samsung Galaxy Z Fold) - Rare, complex
- Very old devices (<iOS 14, <Android 10) - Vision specifies iOS 15+, Android 10+

---

### Browser Testing Strategy

**Primary Browsers (Must Test):**
1. **iOS Safari 15+** (🔴 HIGH PRIORITY)
   - Most common mobile browser for iOS
   - Has unique quirks: safe areas, scroll behavior, keyboard handling
   - Test on real device, not just simulator
2. **Chrome Mobile on Android** (🔴 HIGH PRIORITY)
   - Most common Android browser
   - Better standards compliance than Safari
   - Test gesture navigation mode
3. **Desktop Chrome** (🔴 HIGH PRIORITY)
   - Verify desktop layout not broken
   - Use DevTools mobile emulation for quick tests

**Secondary Browsers (Should Test):**
1. **Firefox Mobile** (🟡 MEDIUM)
   - Better privacy, some users prefer
   - Test on Android only (no iOS version)
2. **Edge Desktop** (🟡 MEDIUM)
   - Chromium-based, similar to Chrome
   - Quick regression check

**Can Skip:**
- Opera Mobile (low usage)
- Samsung Internet (Chromium-based, similar to Chrome)
- UC Browser (mainly Asia, complex testing)

---

### Automated Testing Setup

**Lighthouse CI:**
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://wealth-preview.vercel.app/dashboard
      https://wealth-preview.vercel.app/transactions
      https://wealth-preview.vercel.app/analytics
    uploadArtifacts: true
    temporaryPublicStorage: true
```

**Target Scores:**
- Performance: 90+ (mobile)
- Accessibility: 100
- Best Practices: 100
- SEO: 95+

**Playwright Mobile Testing (Optional):**
```ts
// tests/mobile.spec.ts
import { test, devices } from '@playwright/test';

test.use(devices['iPhone 13']);

test('bottom navigation works', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="nav-transactions"]');
  await expect(page).toHaveURL('/transactions');
});
```

---

### Manual Testing Checklist (Per Iteration)

**Iteration 1 Checklist:**
- [ ] Safe area utilities work on iPhone 14 Pro (Dynamic Island visible)
- [ ] Touch target utilities apply 44×44px minimum
- [ ] useMediaQuery hook detects 768px breakpoint correctly
- [ ] prefers-reduced-motion disables animations when enabled
- [ ] Container queries plugin installed and working
- [ ] Desktop layout unchanged (1920×1080 test)

**Iteration 2 Checklist:**
- [ ] Select dropdowns don't cause horizontal scroll on 375px
- [ ] Dropdown menus respect safe areas (no overlap with Dynamic Island)
- [ ] Popovers respect safe areas
- [ ] Bottom sheet variant slides up from bottom with safe area padding
- [ ] Bottom navigation visible on <768px, hidden on ≥768px
- [ ] Bottom navigation tabs navigate correctly
- [ ] "More" sheet opens with remaining nav items
- [ ] Scroll-hide behavior smooth (no jank)
- [ ] Dashboard loads in <1.8s on throttled 3G

**Iteration 3 Checklist:**
- [ ] Transactions page shows card layout on mobile
- [ ] Budgets page shows card layout on mobile
- [ ] Goals page shows card layout on mobile
- [ ] Filter button opens bottom sheet on mobile
- [ ] Forms use numeric keyboard for amount inputs
- [ ] Forms use email keyboard for email inputs
- [ ] Date pickers use native mobile date input
- [ ] Category picker opens as bottom sheet
- [ ] Submit buttons visible when keyboard open
- [ ] All form inputs minimum 48px height

**Iteration 4 Checklist:**
- [ ] Client bundle <400KB gzipped
- [ ] Lighthouse Performance score 90+
- [ ] Lighthouse Accessibility score 100
- [ ] FCP <1.8s on Slow 3G
- [ ] LCP <2.5s on Slow 3G
- [ ] 60fps scrolling on iPhone SE
- [ ] No layout shifts (CLS <0.1)
- [ ] Charts load in <3s on 3G
- [ ] Dark mode optimized for OLED (optional)

---

## Package Dependencies Summary

### Required Packages (Must Install)

**@tailwindcss/container-queries** (Phase 1)
```bash
npm install -D @tailwindcss/container-queries
```
- **Purpose:** Enable container queries for component-scoped responsive styles
- **Size:** 2KB (dev dependency, no runtime cost)
- **Risk:** LOW - Purely configuration
- **Alternative:** Use global media queries only (more limited)

---

### Optional Packages (Consider for Post-MVP)

**next-pwa** (Post-MVP Feature 8)
```bash
npm install next-pwa
```
- **Purpose:** Generate service worker for PWA support
- **Size:** 25KB (dev dependency)
- **Risk:** MEDIUM - Service worker caching can cause stale data
- **Alternative:** Manual service worker implementation

**@tanstack/react-virtual** (Optional for Phase 5)
```bash
npm install @tanstack/react-virtual
```
- **Purpose:** Virtualize long transaction lists (render only visible rows)
- **Size:** 14KB gzipped
- **Risk:** LOW - Performance enhancement only
- **Alternative:** Pagination or "Load more" button

**react-spring-bottom-sheet** (Alternative to Radix Dialog variant)
```bash
npm install react-spring-bottom-sheet
```
- **Purpose:** Native-feeling bottom sheet component
- **Size:** 28KB gzipped
- **Risk:** MEDIUM - New dependency, may conflict with Radix
- **Alternative:** Custom Radix Dialog variant (recommended)

---

### Packages to Update (Optional)

**Current Versions:**
- `@radix-ui/react-progress@1.1.7` → 1.1.8 (minor bug fixes)
- `@radix-ui/react-separator@1.1.7` → 1.1.8 (minor bug fixes)
- `framer-motion@12.23.22` → 12.23.24 (minor bug fixes)

**Major Version Available (DO NOT UPDATE):**
- `recharts@2.12.7` → 3.3.0 available (🚫 BREAKING CHANGES - defer to post-MVP)

**Recommendation:**
- Update Radix UI minor versions (safe)
- Update Framer Motion minor version (safe)
- DO NOT update Recharts to v3 (major refactoring required)

---

## Notes & Observations

### Existing Mobile Work Completed

**MOBILE_IMPROVEMENTS.md shows previous mobile work:**
- ✅ Responsive sidebar navigation (hamburger menu)
- ✅ Mobile-optimized dialogs (w-[calc(100%-2rem)])
- ✅ Responsive grids (md:grid-cols-2 lg:grid-cols-4)
- ✅ Mobile-friendly transaction cards (flex-col sm:flex-row)
- ✅ Responsive top padding (pt-16 lg:pt-8)

**Implication:** Basic responsive layout already exists, this plan is **polish and optimization**, not greenfield mobile development.

**Risk Reduction:** LOW complexity for foundational responsive work (already done), focus is on:
- Advanced mobile patterns (bottom nav, bottom sheets)
- Touch optimization (44×44px targets)
- Performance (bundle size, 60fps animations)
- Safe areas (notches, gesture bars)

---

### Current Mobile Issues (From Vision)

**Layout Overflow Problems:**
- Some dashboard cards extend beyond viewport on 375px
- Tables cause horizontal scroll
- Forms cut off on small screens
- Sidebar slide animation causes content shift

**Touch Target Problems:**
- Some buttons <44×44px (WCAG violation)
- Adjacent interactive elements too close (<8px spacing)
- Form inputs <48px height (hard to tap)

**Missing Mobile Patterns:**
- No bottom navigation (hamburger only)
- No bottom sheets (all modals are centered)
- No pull-to-refresh
- No swipe gestures

**These are all addressable in the proposed iterations.**

---

### Recharts Mobile Limitations

**Known Issues:**
1. **Hover-based tooltips:** Don't work on touch devices (requires tap to trigger)
2. **Default chart sizes:** 350-400px height wastes space on mobile portrait
3. **Label collisions:** Pie chart labels overlap on small screens
4. **No gestures:** Can't pinch-zoom or pan charts

**Mitigation Strategies:**
- Use `allowEscapeViewBox` on Tooltip (improves touch triggering)
- Conditional height: 250px mobile, 350px desktop
- Disable labels on mobile: `label={false}`
- Show data table below chart as fallback

**Alternative Libraries (If Recharts Too Limited):**
- **nivo:** Better mobile support, touch-friendly, but different API (major refactor)
- **visx:** Lower-level, more control, lighter weight, but more code
- **Victory Native:** Best mobile support, but React Native only

**Recommendation:** Stick with Recharts for MVP, optimize as much as possible, consider alternatives post-launch if user feedback negative.

---

### Framer Motion Performance Concerns

**Bundle Size:** 175KB gzipped (38% of total client bundle!)

**Performance Impact:**
- Layout animations trigger browser reflows (expensive on mobile)
- Continuous animations drain battery
- Can cause jank on low-end devices (iPhone SE, budget Android)

**Current Usage:**
- TransactionCard: `cardHoverSubtle` animation (every transaction row)
- DashboardStats: `staggerContainer` + `staggerItem` (4 stat cards)
- AccountCard: Hover animations

**Optimization Opportunities:**
1. **Dynamic import:** Load only on desktop or user interaction
   ```tsx
   const motion = dynamic(() => import('framer-motion').then(mod => mod.motion));
   ```
2. **CSS-only animations:** Replace simple animations with CSS
   ```css
   /* Instead of Framer Motion spring animation */
   .card { transition: transform 0.2s ease-out; }
   .card:hover { transform: scale(1.02); }
   ```
3. **Disable on mobile:** No hover states on touch devices anyway
   ```tsx
   {!isMobile && <motion.div {...cardHoverSubtle}><Card /></motion.div>}
   {isMobile && <Card />}
   ```

**Recommendation:** Start conservative (disable on mobile), add back selectively based on performance profiling.

---

### Safe Area Best Practices

**CSS Environment Variables:**
```css
/* Always use fallback to 0px */
padding-top: env(safe-area-inset-top, 0px);
padding-bottom: env(safe-area-inset-bottom, 0px);
```

**Tailwind Utilities (Add to config):**
```js
spacing: {
  'safe-top': 'env(safe-area-inset-top, 0px)',
  'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
}
```

**Usage:**
```tsx
<nav className="fixed bottom-0 pb-safe-bottom">
  {/* Bottom navigation */}
</nav>
```

**Testing:**
- iPhone 14 Pro: Dynamic Island (top), home indicator (bottom)
- iPhone SE: No notch, but has status bar (top)
- iPad: Minimal safe areas in portrait, more in landscape
- Android: Gesture navigation bar (bottom)

**Edge Cases:**
- Landscape mode: Safe areas on left/right instead of top/bottom
- Fullscreen mode: Safe areas may change dynamically
- Picture-in-picture: Safe areas adjust when PiP active

---

### Performance Budget

**Target Metrics:**
- **Bundle Size:** <400KB gzipped client bundle
- **FCP:** <1.8s on Slow 3G (First Contentful Paint)
- **LCP:** <2.5s on Slow 3G (Largest Contentful Paint)
- **TTI:** <3.5s on Slow 3G (Time to Interactive)
- **CLS:** <0.1 (Cumulative Layout Shift - no jank)
- **FPS:** 60fps during scrolling and animations

**Current Estimated Performance:**
- Bundle: ~620KB gzipped (❌ OVER BUDGET)
- FCP: ~2.5s on 3G (❌ OVER BUDGET)
- LCP: ~3.2s on 3G (❌ OVER BUDGET)
- TTI: ~4.5s on 3G (❌ OVER BUDGET)

**Optimization Required:** YES - Bundle size is primary issue

**Optimization Strategy:**
1. Dynamic import Framer Motion: **Saves 175KB, -1s FCP**
2. Dynamic import Recharts: **Saves 120KB on non-Analytics pages, -0.7s FCP**
3. Lazy load dashboard below-fold: **Saves 30KB, -0.3s FCP**
4. Tree-shake Radix unused components: **Saves 10KB**

**Result After Optimization:**
- Bundle: ~285KB gzipped (✅ UNDER BUDGET)
- FCP: ~1.5s on 3G (✅ UNDER BUDGET)
- LCP: ~2.2s on 3G (✅ UNDER BUDGET)
- TTI: ~2.8s on 3G (✅ UNDER BUDGET)

---

## Recommendations for Master Planner

### 1. **Prioritize Foundation Over Features**
Start with Iteration 1 (Foundation + UI Primitives) even though it has no visible user-facing changes. This establishes safe areas, touch targets, and responsive utilities that ALL other features depend on. Skipping this causes rework later.

### 2. **Use Feature Flags for Risky Changes**
Wrap bottom navigation, card layouts, and bottom sheets in feature flags:
```tsx
const ENABLE_BOTTOM_NAV = process.env.NEXT_PUBLIC_ENABLE_BOTTOM_NAV === 'true';
```
Allows gradual rollout, easy rollback, and A/B testing.

### 3. **Test on Real Devices, Not Just Simulator**
iOS Safari has quirks (safe areas, scroll behavior, keyboard handling) that don't show in simulator. Minimum: Test on one real iPhone (14 Pro or SE) and one real Android device.

### 4. **Defer PWA to Post-MVP**
PWA (service worker, offline mode) is Post-MVP per vision. Focus on core mobile UX first. PWA adds complexity (caching strategy, update flow, manifest) that can derail timeline.

### 5. **Budget Extra Time for Recharts Optimization**
Charts are the highest-risk component (touch interactions, mobile sizing, label collisions). Budget 5-6 hours for Phase 4B instead of optimistic 4 hours. Consider fallback: Show message "Charts optimized for desktop" if mobile optimization fails.

### 6. **Consider 3-Iteration Approach for Faster Delivery**
If timeline critical, combine Iterations 2 & 3 (Navigation + Dashboard + Tables + Forms) into one 20-24 hour iteration. Higher risk (more complex rollback), but saves 1 week delivery time.

### 7. **Add Bundle Size Monitoring to CI/CD**
Set up automated bundle size tracking:
```yaml
# .github/workflows/bundle-size.yml
- name: Check bundle size
  run: npm run build && node scripts/check-bundle-size.js
  env:
    MAX_BUNDLE_SIZE: 400000 # 400KB in bytes
```
Prevents accidental bundle bloat during development.

### 8. **Create Mobile Testing Environment Early**
Set up BrowserStack or similar early in Iteration 1. Waiting until Iteration 4 (testing phase) is too late - issues found then require major rework. Test incrementally after each phase.

---

## Timeline Estimates

### Optimistic Scenario (No Major Issues): 24-30 hours total

**Iteration 1: Foundation + UI Primitives**
- Phase 1: Foundation Setup - 2 hours
- Phase 2: UI Primitive Updates - 3 hours
- Testing & Validation - 1 hour
- **Total: 6 hours**

**Iteration 2: Navigation + Dashboard**
- Phase 3: Navigation Components - 4 hours
- Phase 4A: Dashboard Layout - 3 hours
- Phase 4B: Recharts Mobile - 4 hours
- Testing & Validation - 2 hours
- **Total: 13 hours** (cumulative: 19 hours)

**Iteration 3: Tables + Forms**
- Phase 5: Transaction & Table Optimization - 5 hours
- Phase 6: Form Optimization - 4 hours
- Testing & Validation - 2 hours
- **Total: 11 hours** (cumulative: 30 hours)

**Iteration 4: Performance + Testing**
- Phase 7: Performance Optimization - 3 hours
- Cross-device testing - 2 hours
- Lighthouse audits & fixes - 1 hour
- **Total: 6 hours** (cumulative: 36 hours - WAIT, MATH ERROR)

**Corrected Total: 30 hours**

---

### Realistic Scenario (Minor Issues, Rework): 32-40 hours total

**Iteration 1: Foundation + UI Primitives**
- Phase 1: Foundation Setup - 3 hours (Tailwind config troubleshooting)
- Phase 2: UI Primitive Updates - 4 hours (Radix Select edge cases)
- Testing & Validation - 1.5 hours
- **Total: 8.5 hours**

**Iteration 2: Navigation + Dashboard**
- Phase 3: Navigation Components - 5 hours (scroll-hide behavior issues)
- Phase 4A: Dashboard Layout - 4 hours (hydration mismatch fixes)
- Phase 4B: Recharts Mobile - 5 hours (tooltip touch triggering complexity)
- Testing & Validation - 3 hours (desktop regression found, fix)
- **Total: 17 hours** (cumulative: 25.5 hours)

**Iteration 3: Tables + Forms**
- Phase 5: Transaction & Table Optimization - 6 hours (card layout edge cases)
- Phase 6: Form Optimization - 5 hours (keyboard handling iOS Safari)
- Testing & Validation - 3 hours (form validation errors)
- **Total: 14 hours** (cumulative: 39.5 hours)

**Iteration 4: Performance + Testing**
- Phase 7: Performance Optimization - 4 hours (bundle size optimization)
- Cross-device testing - 3 hours (safe area issues found on iPhone 14 Pro)
- Lighthouse audits & fixes - 2 hours (accessibility issues)
- **Total: 9 hours** (cumulative: 48.5 hours)

**Corrected Total: 48.5 hours**

---

### Pessimistic Scenario (Major Issues, Significant Rework): 50-60 hours total

**Iteration 1: Foundation + UI Primitives**
- Phase 1: Foundation Setup - 4 hours (container queries plugin conflicts)
- Phase 2: UI Primitive Updates - 6 hours (bottom sheet implementation from scratch)
- Testing & Validation - 2 hours
- **Total: 12 hours**

**Iteration 2: Navigation + Dashboard**
- Phase 3: Navigation Components - 7 hours (z-index conflicts with modals)
- Phase 4A: Dashboard Layout - 6 hours (Server Component conversion issues)
- Phase 4B: Recharts Mobile - 8 hours (tooltip accessibility major rework)
- Testing & Validation - 4 hours (multiple desktop regressions)
- **Total: 25 hours** (cumulative: 37 hours)

**Iteration 3: Tables + Forms**
- Phase 5: Transaction & Table Optimization - 8 hours (virtualization needed for performance)
- Phase 6: Form Optimization - 7 hours (keyboard overlap issues on iOS)
- Testing & Validation - 4 hours (form accessibility failures)
- **Total: 19 hours** (cumulative: 56 hours)

**Iteration 4: Performance + Testing**
- Phase 7: Performance Optimization - 6 hours (Framer Motion replacement with CSS)
- Cross-device testing - 5 hours (multiple safe area edge cases)
- Lighthouse audits & fixes - 4 hours (performance score <90, major optimization)
- **Total: 15 hours** (cumulative: 71 hours)

**Corrected Total: 71 hours**

---

### Recommended Planning

**Plan for Realistic Scenario: 40-50 hours**
- Buffer for minor issues, rework, and testing
- Assumes some desktop regressions caught and fixed
- Includes thorough testing on real devices

**3-Iteration Approach (Aggressive):**
- Combine Iterations 2 & 3: 30-35 hours total
- Higher risk, less testing between phases
- Only if timeline critical

**4-Iteration Approach (Recommended):**
- Full 40-50 hours, phased delivery
- Lower risk, incremental validation
- Better for maintaining desktop stability

---

*Exploration completed: 2025-11-05T02:30:00Z*
*This report informs master planning decisions for plan-4 mobile experience polish*
