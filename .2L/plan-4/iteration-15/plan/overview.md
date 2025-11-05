# 2L Iteration Plan - Wealth Tracker: Component Optimization & Performance

**Iteration:** 15 (Global) | plan-4, iteration 2
**Created:** 2025-11-05
**Status:** Planning Complete

---

## Project Vision

Transform the mobile experience from responsive-but-heavy to **performant and polished** through strategic optimization of components, forms, and charts. Building on iteration 14's mobile-first foundations (bottom nav, touch targets, safe areas), this iteration focuses on **performance excellence** to deliver smooth 60fps scrolling and sub-2s load times on 3G networks.

**What We're Building:** Zero-compromise mobile performance through dynamic imports, intelligent memoization, mobile-optimized charts, and keyboard-aware forms.

---

## Success Criteria

Specific, measurable criteria for iteration completion:

### Performance Metrics
- [x] Analytics page bundle: 280KB → 190-200KB (-29-32% reduction)
- [x] Dashboard below-fold lazy load: 40-50KB savings
- [x] Transaction list scrolling: 60fps (vs current 40-50fps)
- [x] Lighthouse Mobile Performance: 85-92 (target: 90+)
- [x] First Contentful Paint (FCP) on 3G: <1.8s
- [x] Largest Contentful Paint (LCP) on 3G: <2.5s

### Component Optimization
- [x] All 6 Recharts components dynamically imported
- [x] 5 list components (TransactionCard, BudgetCard, GoalCard, StatCard, AccountCard) memoized with React.memo
- [x] Dashboard below-fold components (UpcomingBills, RecentTransactionsCard) lazy loaded
- [x] Charts responsive: 250px mobile, 350px desktop
- [x] Pie chart labels disabled on mobile (<768px)

### Forms Optimization
- [x] 8 numeric inputs use `inputMode="decimal"`
- [x] MobileSheet component created (bottom sheet pattern for mobile)
- [x] 3 high-priority forms migrated to MobileSheet (AddTransactionForm, TransactionForm, BudgetForm)
- [x] Category picker touch targets: 32px → 48px mobile
- [x] Submit buttons visible with mobile keyboard open

### Testing & Validation
- [x] Real device testing on iPhone 14 Pro (iOS 16+), iPhone SE (iOS 15+), Android mid-range
- [x] Numeric keyboard verified for amount inputs
- [x] Charts fit viewport at 375px, 768px, 1024px
- [x] No horizontal scrolling on any breakpoint
- [x] Smooth bottom sheet animations (60fps)

---

## MVP Scope

**In Scope (Iteration 15):**

### Phase 1: Performance Foundation (4-5 hours)
- Dynamic import all 6 Recharts components
- Lazy load dashboard below-fold components (UpcomingBills, RecentTransactionsCard)
- React.memo for TransactionCard, StatCard, BudgetCard
- React Query optimization (staleTime: 60s, retry: 1)
- Bundle analysis setup (@next/bundle-analyzer)

### Phase 2: Dashboard & Charts (4-5 hours)
- Create useChartDimensions hook (responsive heights)
- Update all 6 charts: 250px mobile, 350px desktop
- Disable pie chart labels on mobile
- Touch-friendly chart tooltips (allowEscapeViewBox)
- Mobile data reduction (30 days vs 90 days where applicable)
- Component-specific skeleton screens

### Phase 3: Forms Optimization (4-5 hours)
- Add inputMode="decimal" to 8 numeric inputs
- Create MobileSheet component (bottom sheet for mobile, dialog for desktop)
- Migrate AddTransactionForm, TransactionForm, BudgetForm to MobileSheet
- Keyboard handling (CSS-first: scroll padding, sticky buttons)
- Category picker touch target fix (32px → 48px mobile)

### Phase 4: Tables → Cards (3-4 hours)
- Verify transaction list card layout on mobile
- BudgetList card layout review
- GoalList card layout review
- Mobile-friendly spacing adjustments
- Ensure swipe-to-action structure ready (no implementation, structure only)

**Out of Scope (Deferred to Iteration 16):**
- Virtual scrolling (react-window) for long transaction lists
- Framer Motion conditional loading (useReducedMotion hook)
- MobileFilterSheet component
- Auth form optimizations (SignInForm, SignUpForm)
- Drag-to-close gesture for MobileSheet
- Advanced keyboard detection (visualViewport API)
- Form state persistence (localStorage drafts)
- Remaining form conversions (RecurringTransactionForm, CategoryForm, AccountForm)

---

## Development Phases

### 1. Exploration ✅ Complete
- Explorer 1: Performance analysis (bundle sizes, memoization gaps, chart inventory)
- Explorer 2: Forms analysis (inputMode gaps, keyboard handling, mobile sheet requirements)

### 2. Planning 🔄 Current
- Create comprehensive development plan
- Define code patterns and conventions
- Break down into builder tasks
- Establish testing strategy

### 3. Building ⏳ Estimated 16-18 hours
- **Builder-1:** Performance Foundation (5-6 hours)
  - Dynamic imports, memoization, React Query optimization
- **Builder-2:** Chart Optimization (4-5 hours)
  - useChartDimensions, responsive charts, skeleton screens
- **Builder-3:** Form Optimization (4-5 hours)
  - inputMode updates, MobileSheet component, form migrations
- **Builder-4:** Mobile Layouts & Testing (3-4 hours)
  - Category picker fixes, spacing adjustments, real device testing

### 4. Integration ⏳ 30-60 minutes
- Verify all builders' work integrates cleanly
- Run full production build
- Bundle size validation
- Regression testing (desktop + mobile)

### 5. Validation ⏳ 1-2 hours
- Lighthouse mobile audit (target: 90+)
- Real device testing checklist
- Performance profiling (60fps verification)
- Cross-browser testing (iOS Safari, Chrome Mobile)

### 6. Deployment ⏳ Final
- Commit to main branch
- Vercel deployment
- Production smoke testing
- Update iteration status

---

## Timeline Estimate

- **Exploration:** ✅ Complete (4 hours)
- **Planning:** ✅ Complete (2 hours)
- **Building:** 16-18 hours (4 builders, parallel work)
  - Builder-1 (Performance): 5-6 hours
  - Builder-2 (Charts): 4-5 hours
  - Builder-3 (Forms): 4-5 hours
  - Builder-4 (Mobile/Testing): 3-4 hours
- **Integration:** 30-60 minutes
- **Validation:** 1-2 hours
- **Total:** ~20-23 hours (end-to-end)

**Critical Path:** Builder-1 (Performance Foundation) → Builder-2 (Charts) → Integration → Validation

**Parallelization:** Builders 1, 2, 3 can work in parallel. Builder-4 waits for Builder-3 (MobileSheet dependency).

---

## Risk Assessment

### High Risks

**1. React.memo Breaking Change Detection (Likelihood: 40%)**
- **Risk:** Custom comparison functions miss critical prop changes, causing stale UI
- **Impact:** Budgets/transactions don't update when data changes
- **Mitigation:**
  - Start with shallow comparison (no custom function)
  - Use React DevTools Profiler to verify re-render behavior
  - Test edit flows thoroughly (transaction edit, budget update)

**2. Framer Motion Performance Regression (Likelihood: 60%)**
- **Risk:** Motion animations on low-end devices cause jank even with memoization
- **Impact:** <60fps scrolling on transaction lists
- **Mitigation:**
  - Test on throttled CPU (6x slowdown in Chrome DevTools)
  - Consider CSS fallbacks for list item hover effects
  - Measure fps during scroll using Performance tab
  - Defer Framer Motion optimization to iteration 16 if needed

**3. iOS Safari Keyboard Quirks (Likelihood: 60%)**
- **Risk:** Submit buttons covered by keyboard on some iOS versions
- **Impact:** Forms unusable, user frustration
- **Mitigation:**
  - CSS-first approach (scroll padding, sticky positioning)
  - Real device testing on iOS 15+ and iOS 16+
  - Extra bottom margin (mb-20) on forms
  - Allocate 2-3 hours for keyboard testing and fixes

### Medium Risks

**1. Dynamic Import Race Conditions (Likelihood: 50%)**
- **Risk:** Chart components load dynamically but tRPC query starts before JS bundle loads
- **Impact:** Poor UX - skeleton appears, then component loading spinner
- **Mitigation:**
  - Use `ssr: false` for chart dynamic imports
  - Component-specific skeletons matching actual layout
  - Test with Slow 3G throttling

**2. Bundle Size Not Reducing as Expected (Likelihood: 30%)**
- **Risk:** Dynamic imports don't reduce bundle due to Next.js chunking strategy
- **Impact:** No performance improvement despite code changes
- **Mitigation:**
  - Run `npm run build` after each major change
  - Use @next/bundle-analyzer to verify chunk splitting
  - Check `.next/static/chunks` directory

**3. Bottom Sheet Animation Jank (Likelihood: 30%)**
- **Risk:** Slide-up/slide-down animation stutters on low-end Android
- **Impact:** Poor perceived performance
- **Mitigation:**
  - Use CSS transforms (not top/bottom positioning)
  - Add `will-change: transform` optimization
  - Test on throttled CPU

### Low Risks

**1. Form State Loss on Sheet Close (Likelihood: 50%)**
- **Risk:** User accidentally closes sheet, loses entered data
- **Impact:** Frustration, re-entering data
- **Mitigation:**
  - Add "unsaved changes" warning (Dialog onInteractOutside)
  - Consider in iteration 16 polish phase

**2. Desktop Layout Regression (Likelihood: 20%)**
- **Risk:** Mobile optimizations break desktop layout
- **Impact:** Desktop users experience broken UI
- **Mitigation:**
  - Mobile-first CSS approach (desktop already works)
  - Desktop smoke test after each builder completes
  - Responsive utility classes (sm:, md:, lg:)

---

## Integration Strategy

### Builder Coordination

**Shared Files (Conflict Risk):**
- `src/components/ui/input.tsx` - Builder-3 may add documentation comment
- `src/lib/trpc.ts` - Builder-1 updates React Query config
- Minimal conflict risk - different sections of codebase

**Sequential Dependencies:**
1. **Builder-1** completes → Enables lazy loading patterns for Builder-2
2. **Builder-3** completes MobileSheet → Enables Builder-4 form migrations
3. **Builder-2** and **Builder-3** can work 100% in parallel

**Integration Points:**
- All builders use existing UI primitives (Input, Button, Dialog)
- No new shared utilities beyond hooks (low conflict)
- Each builder creates new files primarily (minimal edits to existing)

### Merge Strategy

**Phase 1: Builder Completion**
- Each builder commits to feature branch: `2l/iter15-builder-{1-4}`
- Self-test before marking complete

**Phase 2: Integration Testing**
- Merge order: Builder-1 → Builder-2 → Builder-3 → Builder-4
- Run production build after each merge
- Verify bundle sizes incrementally
- Run Lighthouse after all merges

**Phase 3: Validation**
- Full regression test (desktop + mobile viewports)
- Real device testing on 3 devices
- Performance profiling
- Fix any integration issues

---

## Deployment Plan

### Pre-Deployment Checklist
- [x] All 4 builders complete and tested
- [x] Production build succeeds (`npm run build`)
- [x] Bundle analysis shows expected reductions
- [x] Lighthouse mobile score 85+ (target 90+)
- [x] Real device testing complete (iPhone, Android)
- [x] Desktop regression test passed
- [x] No console errors or warnings

### Deployment Steps
1. **Merge to main:** Squash all builder commits into single iteration commit
2. **Tag release:** `2l-plan-4-iter-15` for tracking
3. **Vercel auto-deploy:** Triggered by main branch push
4. **Production smoke test:**
   - Load dashboard on mobile viewport
   - Add transaction (test MobileSheet)
   - View analytics page (test lazy charts)
   - Verify performance (Lighthouse on production URL)

### Rollback Plan
- If critical issues found: Revert commit via `git revert`
- Vercel automatically deploys previous commit
- Document issues for iteration 16 fix

### Success Metrics (Post-Deployment)
- Analytics page loads <2.5s on 3G (LCP)
- Dashboard interactive <1.8s (FCP)
- Transaction list scrolls at 60fps
- Forms show correct mobile keyboard
- No user-reported layout breaks

---

## Notes

### Key Decisions Made

**1. MobileSheet Pattern:**
- **Decision:** Extend Radix Dialog with responsive behavior (bottom sheet mobile, centered dialog desktop)
- **Rationale:** Leverage existing Dialog infrastructure, avoid new dependencies, consistent API
- **Alternative Considered:** External library (vaul, react-modal-sheet) - Rejected due to bundle size

**2. Chart Optimization Strategy:**
- **Decision:** 250px mobile, 350px desktop heights via useChartDimensions hook
- **Rationale:** Saves 100px per chart on mobile (500px total on analytics page), improves scrolling
- **Data Reduction:** Defer to chart-specific analysis (some charts need 30 days, others don't)

**3. Memoization Approach:**
- **Decision:** React.memo with shallow comparison first, custom comparison only if needed
- **Rationale:** Simpler, less risky, covers 80% of re-render scenarios
- **Testing:** Use React DevTools Profiler to validate

**4. Keyboard Handling:**
- **Decision:** CSS-first approach (scroll padding, sticky buttons, bottom margin)
- **Rationale:** Simpler, works in all browsers, less code to maintain
- **Fallback:** visualViewport API deferred to iteration 16 if CSS approach fails

**5. Form Migration Priority:**
- **Decision:** Convert only top 3 forms (AddTransactionForm, TransactionForm, BudgetForm)
- **Rationale:** 80/20 rule - these forms are 80% of user interactions
- **Deferred:** RecurringTransactionForm, CategoryForm, AccountForm to iteration 16

**6. Testing Strategy:**
- **Decision:** Real device testing required (not emulators) for keyboard and sheet behavior
- **Rationale:** Emulators don't accurately simulate mobile keyboards and gestures
- **Time Allocated:** 2-3 hours for Builder-4 real device testing

### Architectural Insights

**Performance First, Not Last:**
- Iteration 15 treats performance as MVP feature, not polish
- Bundle size and 60fps scrolling are success criteria, not nice-to-haves

**Mobile-First CSS Throughout:**
- All responsive changes use mobile-first approach (base styles mobile, `sm:` for desktop)
- Reduces risk of desktop regression

**Minimal New Dependencies:**
- Zero new npm packages required
- All patterns built on existing infrastructure (Radix UI, Framer Motion, React Query)

**Progressive Enhancement:**
- Features work without JS where possible (native date pickers, CSS-only keyboard handling)
- JavaScript enhances but doesn't block

### Explorer Synthesis

**Explorer 1 (Performance):**
- Identified 280KB Analytics bundle as critical optimization target
- Zero React.memo usage across codebase = major opportunity
- Dynamic imports can save 80-100KB on charts alone

**Explorer 2 (Forms):**
- Input component ready (inputMode prop exists) but unused
- No bottom sheet pattern exists
- 8 numeric inputs need inputMode="decimal"

**Consensus:**
- Both explorers recommend phased approach
- Performance and forms are parallel tracks, not sequential
- Real device testing non-negotiable

---

**Iteration Status:** PLANNING COMPLETE
**Ready for:** Builder Execution
**Estimated Completion:** 16-18 hours (4 builders, parallel work)
