# 2L Iteration Plan - Mobile Experience Polish: Foundation & Navigation

**Iteration:** 14 (Global), Plan-4 Iteration 1
**Phase:** Foundation & Navigation Architecture
**Created:** 2025-11-05
**Status:** PLANNED

---

## Project Vision

Transform the Wealth application from a responsive web app into a mobile-first experience with native-like polish. This iteration establishes the foundational architecture for mobile optimization: safe area handling, responsive utilities, bottom navigation, and touch target compliance.

**What we're building:**
- Mobile-first CSS infrastructure (safe areas, touch targets, responsive spacing)
- Bottom navigation bar for thumb-zone access to core features
- UI primitive fixes for mobile (Radix components mobile optimization)
- Layout fixes across dashboard routes (viewport overflow elimination)

**Why it matters:**
- 60% of users access the app on mobile devices
- Current experience feels "desktop-shrunk" not "mobile-curated"
- Touch target compliance below WCAG standards (60% → 100% target)
- No safe area handling (content hidden behind notches/gesture bars)

---

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Zero horizontal scrollbars on 375px+ viewports (all 11 dashboard routes)
- [ ] Bottom navigation visible on mobile (<768px), hidden on desktop (≥768px)
- [ ] All interactive elements meet 44x44px minimum touch target (WCAG 2.1 AA)
- [ ] Safe areas respected on iPhone 14 Pro (Dynamic Island), Android gesture nav
- [ ] Sidebar and bottom nav coexist without z-index conflicts
- [ ] Smooth scroll-hide behavior (no jank, 60fps target)
- [ ] Dashboard loads without layout shift (CLS <0.1)
- [ ] Lighthouse mobile accessibility score 100

---

## MVP Scope

### In Scope (Iteration 14):

**Foundation Setup:**
- Safe area CSS variables and Tailwind utilities
- Touch target utilities (min-h-touch-target: 44px)
- Container queries plugin installation
- Mobile-first useMediaQuery hook
- Prefers-reduced-motion detection

**UI Primitive Fixes:**
- Radix Select min-width overflow fix
- Dropdown/Popover safe area padding
- Bottom sheet variant from Dialog
- Toast safe area handling
- Button component touch target updates

**Bottom Navigation:**
- 5-tab navigation (Dashboard, Transactions, Budgets, Goals, More)
- Scroll-hide behavior (useScrollDirection hook)
- MoreSheet for overflow items (Recurring, Analytics, Accounts, Settings, Admin)
- Safe area inset padding (iPhone/Android)
- Z-index coordination (z-45, below modals at z-50)

**Layout & Touch Target Fixes:**
- Dashboard routes viewport overflow audit
- DashboardStats 2-column mobile layout
- Spacing updates: p-4 sm:p-6 pattern (mobile-first)
- Button sizes: h-11 mobile (44px), h-10 desktop (40px)
- Navigation items minimum 44px height
- Main content bottom clearance (pb-20 for bottom nav)

### Out of Scope (Future Iterations):

**Deferred to Iteration 15:**
- Form optimization (numeric keyboards, bottom sheets)
- Chart mobile optimization (responsive dimensions)
- Table to card transformations
- Performance optimization (bundle splitting, lazy loading)

**Deferred to Iteration 16:**
- Virtual scrolling for long lists
- Advanced accessibility audit
- Cross-device testing matrix
- Performance budgets enforcement

**Post-MVP Features:**
- Pull-to-refresh gesture
- Swipe actions on cards
- Haptic feedback
- PWA installation prompts

---

## Development Phases

1. **Exploration** ✅ Complete (2 explorers, 8 hours)
2. **Planning** 🔄 Current (Planner agent)
3. **Building** ⏳ 14-16 hours (3 parallel builders)
4. **Integration** ⏳ 1-2 hours (merging builder outputs)
5. **Validation** ⏳ 2-3 hours (testing on real devices)
6. **Deployment** ⏳ Final (merge to main)

---

## Timeline Estimate

- **Exploration:** Complete (8 hours, 2 explorers)
- **Planning:** Complete (this document)
- **Building:** 14-16 hours (3 builders working in parallel)
  - Builder-1 (Foundation): 6-7 hours
  - Builder-2 (Bottom Navigation): 5-6 hours
  - Builder-3 (Layout Fixes): 3-4 hours
- **Integration:** 1-2 hours (merge, resolve conflicts)
- **Validation:** 2-3 hours (real device testing, accessibility)
- **Total:** ~20-25 hours wall time (with parallelization)

---

## Risk Assessment

### High Risks

**RISK-1: iOS Safari Scroll Jank (Probability: 60%, Impact: HIGH)**
- **Description:** Momentum scrolling and rubber-band bounce causing false scroll direction detection
- **Mitigation:** Overscroll detection, hysteresis buffer, requestAnimationFrame throttling
- **Testing:** Real iPhone device (not simulator)

**RISK-2: Bottom Nav Z-Index Conflicts (Probability: 70%, Impact: HIGH)**
- **Description:** Bottom nav (z-45) conflicts with sidebar overlay (z-40) or modals (z-50)
- **Mitigation:** Clear z-index hierarchy documented, test all modal types
- **Code enforcement:** Bottom nav z-45, modals z-50, toasts z-100

**RISK-3: Keyboard Overlap on Forms (Probability: 70%, Impact: HIGH)**
- **Description:** Mobile keyboard covers bottom nav and submit buttons
- **Mitigation:** Visual viewport API detection, hide bottom nav when keyboard open
- **Fallback:** Skip for iteration 14, add in iteration 15 if needed

### Medium Risks

**RISK-4: Safe Area Browser Support (Probability: 30%, Impact: MEDIUM)**
- **Description:** env(safe-area-inset-*) only works in iOS Safari 11.2+, Chrome 69+ (PWA mode)
- **Mitigation:** CSS fallbacks with max(), test on real devices
- **Fallback:** Always-on 1rem padding if env() unsupported

**RISK-5: Touch Target Cascade Effects (Probability: 50%, Impact: MEDIUM)**
- **Description:** Increasing button sizes breaks layouts (visual imbalance)
- **Mitigation:** Responsive sizing (h-11 mobile, h-10 desktop), adjust parent gaps
- **Testing:** Visual QA on 5-10 key pages

**RISK-6: Animation Performance on Low-End Devices (Probability: 50%, Impact: MEDIUM)**
- **Description:** Framer Motion animations cause jank on budget Android
- **Mitigation:** Use CSS transforms (GPU-accelerated), respect prefers-reduced-motion
- **Performance budget:** 60fps target, 300ms max animation duration

### Low Risks

**RISK-7: Desktop Regression (Probability: 20%, Impact: LOW)**
- **Description:** Mobile-first CSS changes break desktop layouts
- **Mitigation:** Responsive utilities (sm:, lg:), test desktop after each phase
- **Validation:** Manual QA on 1280px+ viewports

---

## Integration Strategy

### Builder Output Merge Plan

**Phase 1: Foundation (Builder-1) → Global**
- Files: globals.css, tailwind.config.ts, hooks/useMediaQuery.ts
- Merge first (no dependencies)
- Creates utilities used by Builder-2 and Builder-3

**Phase 2: Bottom Nav (Builder-2) → Layout Integration**
- Files: BottomNavigation.tsx, MoreSheet.tsx, useScrollDirection.ts
- Depends on: Builder-1 (safe area utilities)
- Integrates with: layout.tsx (Builder-1 modifies)
- Conflict risk: LOW (new components)

**Phase 3: Layout Fixes (Builder-3) → Component Updates**
- Files: button.tsx, select.tsx, card.tsx, layout.tsx
- Depends on: Builder-1 (touch target utilities)
- Conflict risk: MEDIUM (shared files with Builder-1)
- Resolution: Builder-3 applies final touch target sizes

**Shared Files Strategy:**
- `layout.tsx`: Builder-1 adds bottom padding, Builder-2 adds BottomNavigation component
- `button.tsx`: Builder-1 updates variants, Builder-3 validates touch targets
- Merge order: Builder-1 → Builder-2 → Builder-3

### Potential Conflict Areas

**File: `src/app/(dashboard)/layout.tsx`**
- Builder-1: Adds `pb-20 lg:pb-8` to main container
- Builder-2: Adds `<BottomNavigation />` component
- Resolution: Manual merge, both changes needed

**File: `src/components/ui/button.tsx`**
- Builder-1: Updates size variants to `h-11 sm:h-10`
- Builder-3: Validates and tests touch targets
- Resolution: Builder-1 code wins (Builder-3 only validates)

**File: `tailwind.config.ts`**
- Builder-1: Adds spacing utilities, touch-target utilities, container-queries plugin
- No conflicts (append-only)

---

## Deployment Plan

### Pre-Deployment Checklist

**Code Quality:**
- [ ] All TypeScript types valid (no `any`)
- [ ] ESLint passes (no errors)
- [ ] Prettier formatting applied
- [ ] No console.log statements

**Functionality:**
- [ ] Bottom nav navigates correctly (all 5 tabs)
- [ ] Scroll-hide behavior smooth (no jank)
- [ ] MoreSheet opens/closes correctly
- [ ] Safe areas respected (iPhone 14 Pro test)
- [ ] Touch targets minimum 44x44px (manual audit)

**Testing:**
- [ ] Real device testing (iPhone, Android)
- [ ] Lighthouse mobile score 85+ (target 90+)
- [ ] Desktop regression test (no broken layouts)
- [ ] Dark mode works on all components
- [ ] Accessibility: keyboard navigation, screen reader

### Deployment Steps

1. **Merge to feature branch:** `2l-plan-4-iter-14`
2. **Run full test suite:** `npm run build && npm run lint`
3. **Deploy to preview:** Vercel preview deployment
4. **QA on preview:** Real device testing via ngrok/preview URL
5. **Fix critical bugs:** Hot-fixes if needed
6. **Merge to main:** PR with full changelog
7. **Tag release:** `2l-plan-4-iter-14-v1.0.0`

### Rollback Plan

If critical issues found post-deployment:
- Revert main branch to previous commit
- Investigate issues in feature branch
- Re-test and re-deploy

---

## Key Metrics

### Performance Targets

- **First Contentful Paint (FCP):** <1.8s on Fast 3G
- **Largest Contentful Paint (LCP):** <2.5s on Fast 3G
- **Cumulative Layout Shift (CLS):** <0.1
- **Frame Rate:** 60fps during scroll, animations
- **Lighthouse Performance:** 85+ (target 90+)

### Touch Target Compliance

- **Before:** ~60% (many h-8, h-9 buttons below 44px)
- **Target:** 100% (all interactive elements ≥44x44px)
- **WCAG Level:** AA (44x44px minimum)
- **Our standard:** 48x48px preferred (Material Design)

### Layout Integrity

- **Horizontal scrollbars:** 0 on 375px-430px viewports
- **Viewport overflow:** 0 instances across 11 dashboard routes
- **Safe area violations:** 0 (content visible on all devices)

---

## Documentation Updates

**Files to create:**
- `/docs/mobile-patterns.md` - Mobile-first coding patterns
- `/docs/safe-areas.md` - Safe area handling guide
- `/docs/z-index-hierarchy.md` - Z-index reference

**Files to update:**
- `README.md` - Add mobile optimization notes
- `CONTRIBUTING.md` - Mobile-first CSS guidelines

---

## Next Steps

1. ✅ **Planning complete** (this document)
2. ⏳ **Builder-1:** Foundation & UI Primitives (6-7 hours)
3. ⏳ **Builder-2:** Bottom Navigation (5-6 hours)
4. ⏳ **Builder-3:** Layout & Touch Target Fixes (3-4 hours)
5. ⏳ **Integration:** Merge builder outputs (1-2 hours)
6. ⏳ **Validation:** Real device testing (2-3 hours)
7. ⏳ **Deployment:** Merge to main, tag release

---

**Plan Status:** READY FOR EXECUTION
**Confidence Level:** HIGH
**Estimated Success Rate:** 90%

Builders: Proceed with implementation following patterns.md guidelines.
