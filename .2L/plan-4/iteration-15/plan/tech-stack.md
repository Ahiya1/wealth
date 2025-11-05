# Technology Stack - Iteration 15

## Core Framework

**Decision:** Next.js 14 App Router (Existing)

**Rationale:**
- Already in use with excellent mobile foundations from iteration 14
- App Router enables Server Components (DashboardStats optimization opportunity)
- Built-in code splitting via dynamic imports
- Vercel deployment already configured

**Alternatives Considered:**
- None - Framework choice is established

**Iteration 15 Usage:**
- Dynamic imports for Recharts components
- Lazy loading below-fold dashboard components
- Server Component evaluation for DashboardStats

---

## Performance Optimization

### Dynamic Imports

**Decision:** Next.js `next/dynamic` with `ssr: false` for charts

**Rationale:**
- Built-in code splitting without additional libraries
- `ssr: false` prevents hydration mismatches for client-only charts
- Supports custom loading components (skeleton screens)
- Works seamlessly with tRPC data fetching

**Implementation Pattern:**
```typescript
import dynamic from 'next/dynamic'

const NetWorthChart = dynamic(
  () => import('@/components/analytics/NetWorthChart'),
  {
    loading: () => <NetWorthChartSkeleton />,
    ssr: false
  }
)
```

**Why Not:** Webpack magic comments or React.lazy
- Webpack comments lack Next.js integration
- React.lazy doesn't support SSR disabling

**Files to Update:**
- `src/app/(dashboard)/analytics/page.tsx` (5 chart imports)
- `src/app/(dashboard)/goals/[id]/page.tsx` (1 chart import)
- `src/app/(dashboard)/dashboard/page.tsx` (2 component imports)

---

### React Memoization

**Decision:** React.memo with shallow prop comparison (default)

**Rationale:**
- Zero dependencies (built into React)
- Prevents unnecessary re-renders in list components
- Shallow comparison covers 80% of use cases
- Custom comparison functions added only when profiling shows need

**Implementation Pattern:**
```typescript
import { memo } from 'react'

export const TransactionCard = memo(({ transaction, onEdit, onDelete }) => {
  // Component implementation
})

// Custom comparison only if needed:
export const BudgetCard = memo(
  ({ budget, onUpdate }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if budget ID or amount changes
    return prevProps.budget.id === nextProps.budget.id &&
           prevProps.budget.amount === nextProps.budget.amount
  }
)
```

**Components to Memoize:**
1. TransactionCard (CRITICAL - lists of 10-50 items)
2. StatCard (4 instances on dashboard)
3. BudgetCard (lists of 5-20 items)
4. GoalCard (complex calculations)
5. AccountCard (lists of 2-10 items)

**Testing Strategy:**
- React DevTools Profiler to verify re-render reduction
- Before/after comparison on transaction filter change
- Target: 70% reduction in list re-renders

---

### React Query (tRPC Client)

**Decision:** Optimize React Query defaults for mobile

**Current Config:** Default React Query settings (aggressive refetching)

**New Config:**
```typescript
// src/lib/trpc.ts
queryClient: new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // 60s (reduce network requests)
      retry: 1,                        // Fail fast on mobile (not 3 retries)
      refetchOnWindowFocus: false,     // Don't refetch on tab switch
      refetchOnReconnect: true,        // Do refetch when connection restored
    }
  }
})
```

**Rationale:**
- **staleTime: 60s** - Financial data doesn't change every second, reduce refetches
- **retry: 1** - 3G connections are slow, fail fast instead of 3 retries
- **refetchOnWindowFocus: false** - Mobile users switch tabs frequently, don't hammer API
- **refetchOnReconnect: true** - Do update when connection restored

**Impact:**
- Fewer network requests on mobile = faster perceived performance
- Lower battery usage
- Reduced server load

---

## Charts & Data Visualization

**Decision:** Recharts 2.12.7 with dynamic imports

**Rationale:**
- Already in use (5.4MB source, ~90-110KB gzipped)
- Responsive by default (ResponsiveContainer)
- Mobile-friendly when configured correctly
- No better alternative for bundle size

**Optimization Strategy:**
1. **Dynamic Import:** Load charts only when needed (-80-100KB initial bundle)
2. **Responsive Heights:** 250px mobile, 350px desktop via hook
3. **Data Reduction:** Limit data points on mobile (30 days vs 90 days)
4. **Label Hiding:** Disable pie chart labels on mobile (prevents collision)
5. **Touch Tooltips:** Enable `allowEscapeViewBox` for viewport overflow

**Implementation:**
```typescript
// src/hooks/useChartDimensions.ts
export function useChartDimensions() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  return {
    height: isMobile ? 250 : 350,
    margin: isMobile
      ? { top: 5, right: 10, left: 0, bottom: 5 }
      : { top: 5, right: 20, left: 10, bottom: 5 },
    hidePieLabels: isMobile
  }
}
```

**Chart-Specific Patterns:**
- **PieChart:** Disable labels on mobile, rely on tooltip
- **LineChart:** Reduce data points (sample every 3rd day on mobile)
- **BarChart:** Limit to 6 months on mobile (vs 12 on desktop)

**Alternatives Considered:**
- Recharts alternatives (nivo, victory, chart.js) - Rejected: Would require rewrite, no clear bundle size win
- Server-side chart rendering - Rejected: Loses interactivity, doesn't reduce client JS

**Charts to Optimize:**
1. SpendingByCategoryChart (PieChart, 350px → 250px)
2. NetWorthChart (LineChart, 350px → 250px)
3. MonthOverMonthChart (BarChart, 350px → 250px)
4. SpendingTrendsChart (LineChart, 350px → 250px)
5. IncomeSourcesChart (PieChart, 350px → 250px)
6. GoalProgressChart (LineChart, already 250px ✅)

---

## Forms & Input Handling

### Mobile Keyboard Triggering

**Decision:** HTML5 `inputMode` attribute (native, zero dependencies)

**Rationale:**
- Supported in iOS 12.2+, Android Chrome 5+
- Zero JavaScript required
- Native OS keyboard (best UX)
- Input component already has prop, just needs usage

**Keyboard Mapping:**
```typescript
// Amount inputs (most common):
<Input type="number" step="0.01" inputMode="decimal" />
// Shows: Numeric keyboard with decimal point

// Day of month (recurring transactions):
<Input type="number" min="1" max="31" inputMode="numeric" />
// Shows: Numeric keyboard (no decimal)

// Email inputs (auth):
<Input type="email" inputMode="email" />
// Shows: Email keyboard (@ and . accessible)
```

**Implementation Checklist:**
- [x] AddTransactionForm: amount input
- [x] TransactionForm: amount input
- [x] BudgetForm: amount input
- [x] GoalForm: targetAmount, currentAmount inputs
- [x] RecurringTransactionForm: amount, dayOfMonth inputs
- [x] AccountForm: balance input

**Total:** 8 instances across 6 form components

**Testing:** Real device verification on iOS Safari and Chrome Mobile

---

### Mobile Bottom Sheet

**Decision:** Custom MobileSheet component extending Radix Dialog

**Rationale:**
- Leverage existing Radix Dialog infrastructure (already in use)
- No new dependencies (avoid vaul or react-modal-sheet)
- Full control over mobile behavior
- Consistent API with Dialog (easy migration)

**Component Architecture:**
```typescript
// src/components/mobile/MobileSheet.tsx
interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function MobileSheet(props: MobileSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) {
    // Desktop: Render as centered dialog
    return <Dialog>...</Dialog>
  }

  // Mobile: Render as bottom sheet
  return (
    <Dialog>
      <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 ...">
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1 rounded-full bg-muted mb-4" />
        {props.children}
      </DialogPrimitive.Content>
    </Dialog>
  )
}
```

**Features:**
- Responsive switching (sheet mobile, dialog desktop)
- Slide-up/slide-down animations (CSS transforms)
- Safe area padding (pb-safe-b for iPhone notch)
- Drag handle UI (visual affordance)
- Focus trap management (from Dialog)

**Forms to Migrate:**
1. AddTransactionForm (high priority, most frequent)
2. TransactionForm (high priority, editing)
3. BudgetForm (high priority, monthly setup)
4. GoalForm (deferred to iteration 16)
5. RecurringTransactionForm (deferred to iteration 16)

**Alternatives Considered:**
- **vaul** (Vercel's drawer library): 15KB gzipped, good but adds dependency
- **react-modal-sheet**: 12KB gzipped, less maintained
- **Custom from scratch**: Too much work, reinvent Dialog behavior
- **Chosen approach**: Extend Dialog = best of all worlds

---

### Keyboard Handling

**Decision:** CSS-first approach (no JavaScript)

**Rationale:**
- Works in all browsers (no API dependencies)
- Zero performance overhead
- Simpler to test and maintain
- visualViewport API deferred to iteration 16 if needed

**Implementation Pattern:**
```typescript
// Form container
<form className="space-y-4 pb-20">
  {/* pb-20 = 80px clearance for keyboard */}

  {/* Form fields */}

  {/* Submit button - sticky at bottom */}
  <div className="sticky bottom-4 pt-4 border-t bg-background">
    <Button type="submit" className="w-full">
      Submit
    </Button>
  </div>
</form>
```

**CSS Strategy:**
- **pb-20:** 80px bottom padding on form (clearance for keyboard)
- **sticky bottom-4:** Submit button sticks 16px from bottom
- **bg-background:** Opaque background so content scrolls under button
- **border-t:** Visual separation from scrolling content

**Why Not visualViewport API:**
- Browser support limited (iOS 13+, Android Chrome 61+)
- Adds complexity (event listeners, state management)
- CSS approach works 95% of the time
- Defer advanced approach to iteration 16 based on real testing

**Fallback Plan:**
If CSS approach fails during real device testing:
```typescript
// src/hooks/useKeyboardVisible.ts (iteration 16)
export function useKeyboardVisible(): boolean {
  // Detect keyboard via viewport height changes
  // Adjust layout dynamically
}
```

---

## UI Components

### Radix UI Primitives

**Decision:** Continue using Radix UI (existing)

**Current Usage:**
- Dialog (forms, modals)
- Select (dropdowns)
- Popover (tooltips, menus)
- Dropdown Menu (actions)
- Progress (goal bars)
- Checkbox, Tabs, Toast, etc.

**Iteration 15 Extensions:**
- MobileSheet (extends Dialog primitive)
- No new Radix packages needed

**Mobile Optimizations (from iteration 14):**
- Select: Full-width on mobile (`min-w-[calc(100vw-4rem)]`)
- Dialog: Responsive padding (p-4 mobile, p-6 desktop)
- All components: Safe area aware

**Bundle Impact:** ~40-50KB gzipped (acceptable, foundational)

---

### Tailwind CSS

**Decision:** Tailwind CSS 3.4 with mobile-first utilities

**Rationale:**
- Mobile-first approach aligns with iteration goals
- Safe area utilities added in iteration 14
- Responsive breakpoints well-suited for mobile

**Breakpoint Strategy:**
```typescript
// Mobile-first (base styles = mobile)
<div className="h-12 sm:h-10">  // 48px mobile, 40px desktop
<div className="p-4 sm:p-6">    // 16px mobile, 24px desktop

// Breakpoints:
// base: <640px (mobile portrait)
// sm: 640px (large phone landscape, small tablet)
// md: 768px (tablet portrait)
// lg: 1024px (tablet landscape, small desktop)
```

**New Utilities (iteration 15):**
```css
/* tailwind.config.ts */
theme: {
  extend: {
    spacing: {
      'safe-t': 'env(safe-area-inset-top)',
      'safe-b': 'env(safe-area-inset-bottom)',
      'safe-l': 'env(safe-area-inset-left)',
      'safe-r': 'env(safe-area-inset-right)',
    }
  }
}
```

**Usage:**
- `pb-safe-b` on MobileSheet (iPhone notch clearance)
- `pt-safe-t` on fixed headers (status bar clearance)

---

## Animations

**Decision:** Framer Motion 12.23.22 (existing, with caveats)

**Current Usage:**
- 14 components use motion (cardHover, stagger, page transitions)
- 3.3MB source, ~35-45KB gzipped

**Iteration 15 Approach:**
- **Keep:** Existing motion usage (not worth removing)
- **Don't Add:** New motion to list components being memoized
- **Future:** Conditional loading in iteration 16 (useReducedMotion)

**Memoization Coordination:**
All Framer Motion variants defined in `src/lib/animations.ts` as stable references:
```typescript
// Stable - won't break React.memo
export const cardHoverSubtle = {
  whileHover: { y: -2, scale: 1.005 },
  transition: { duration: 0.15 }
}

// Usage in memoized component:
export const TransactionCard = memo(({ transaction }) => {
  return <motion.div {...cardHoverSubtle}>...</motion.div>
})
```

**Performance Consideration:**
- Low-end devices may struggle with motion on 50+ list items
- Monitor fps during scrolling (Chrome DevTools Performance)
- If <60fps: Consider CSS fallbacks in iteration 16

---

## Build & Bundle Analysis

### Bundle Analyzer

**Decision:** Add @next/bundle-analyzer

**Rationale:**
- Official Next.js plugin
- Visualizes chunk splitting
- Validates dynamic import impact
- Essential for performance iteration

**Installation:**
```bash
npm install --save-dev @next/bundle-analyzer
```

**Configuration:**
```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // existing config
})
```

**Usage:**
```bash
# Analyze bundle
ANALYZE=true npm run build

# Opens browser with interactive treemap
```

**Validation Points:**
- After Builder-1 completes: Verify Recharts in separate chunk
- After Builder-2 completes: Verify dashboard lazy chunks
- Final integration: Confirm 40-50% reduction

---

## Environment Variables

**No New Variables Required**

Existing variables continue to work:
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth (NextAuth.js)
NEXTAUTH_URL="https://..."
NEXTAUTH_SECRET="..."

# Optional: Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="..."
```

**Iteration 15 Note:**
- If Vercel Analytics added by Builder-1, may need environment variable
- Not required for MVP, nice-to-have

---

## Development Tools

### Testing

**Framework:** Manual testing (no automated tests for iteration 15)

**Rationale:**
- Component behavior testing requires real devices
- Performance testing requires profiling tools
- Automated tests deferred to iteration 16 (polish phase)

**Testing Strategy:**
1. **Chrome DevTools Performance Tab**
   - Record dashboard load, verify 60fps scrolling
   - Check for long tasks (>50ms)

2. **React DevTools Profiler**
   - Record transaction filter change
   - Verify memoized components don't re-render

3. **Network Throttling**
   - Slow 3G profile (400kbps, 400ms RTT)
   - Verify skeleton screens appear
   - Test lazy loading coordination

4. **Real Devices** (CRITICAL)
   - iPhone 14 Pro (iOS 16+, Dynamic Island)
   - iPhone SE (iOS 15+, smallest screen)
   - Android mid-range (Android 11+, performance baseline)

---

### Code Quality

**Linter:** ESLint (existing Next.js config)

**Formatter:** Prettier (existing)

**Type Checking:** TypeScript strict mode (existing)

**Iteration 15 Standards:**
- All new hooks use proper TypeScript types
- All memoized components have explicit prop types
- Dynamic imports use proper `ComponentType` typing

**Example:**
```typescript
// Proper typing for dynamic import
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

const NetWorthChart = dynamic<NetWorthChartProps>(
  () => import('@/components/analytics/NetWorthChart'),
  { ssr: false }
)
```

---

## Performance Targets

### Bundle Size

**Before (Current):**
- Analytics page: 280KB first load JS
- Budgets page: 382KB (worst case)
- Dashboard page: 176KB (best case)

**After (Target):**
- Analytics page: 190-200KB (-29-32%)
- Budgets page: 310-330KB (-14-19%)
- Dashboard page: 130-140KB (-20-26%)

**Measurement:**
```bash
# Production build
npm run build

# Check .next/analyze/ for size breakdown
# Verify first load JS per page
```

---

### Web Vitals

**Current (Estimated):**
- FCP: 1.5s
- LCP: 2.8s
- TTI: 4.5s
- TBT: 400ms
- CLS: <0.1 (good, from iteration 14)

**Target (Iteration 15):**
- FCP: <1.2s (-0.3s, -20%)
- LCP: <2.2s (-0.6s, -21%) ← **CRITICAL** (hits "good" threshold)
- TTI: <3.2s (-1.3s, -29%)
- TBT: <250ms (-150ms, -38%)
- CLS: <0.1 (maintained)

**Measurement:**
```bash
# Lighthouse mobile audit
lighthouse https://wealth.vercel.app --preset=mobile --view

# Target: Performance 90+
```

---

### Scrolling Performance

**Target:** 60fps during scroll (no dropped frames)

**Test Scenarios:**
1. Transaction list with 50 items (scroll up/down rapidly)
2. Dashboard scroll (all components loaded)
3. Analytics page scroll (charts visible)

**Measurement:**
```javascript
// Chrome DevTools Performance tab
1. Start recording
2. Scroll list for 5 seconds
3. Stop recording
4. Check FPS graph (should be solid green 60fps)
```

**Acceptable:** 55-60fps average
**Unacceptable:** <50fps (defer Framer Motion optimization to iteration 16)

---

## Security Considerations

**No Security Changes in Iteration 15**

Performance optimizations don't affect:
- Authentication (NextAuth.js)
- Authorization (tRPC middleware)
- CSRF protection (Next.js built-in)
- XSS prevention (React escaping)

**Note:**
- Dynamic imports don't expose new attack vectors
- inputMode is client-side UX (no server impact)
- MobileSheet uses same Dialog security model

---

## Compatibility Requirements

### Browser Support

**Must Support:**
- iOS Safari 15+ (iPhone)
- Chrome Mobile 90+ (Android)
- Desktop Chrome/Firefox/Safari (regression testing)

**inputMode Support:**
- iOS 12.2+ ✅
- Android Chrome 5+ ✅
- Coverage: >95% of users

**visualViewport API** (iteration 16):
- iOS 13+ (deferred, not MVP)
- Android Chrome 61+ (deferred, not MVP)

---

### Device Support

**Primary Devices (Real Testing Required):**
1. **iPhone 14 Pro** (390x844, iOS 16+)
   - Most common iPhone
   - Dynamic Island safe area
   - A15 Bionic (high performance)

2. **iPhone SE** (375x667, iOS 15+)
   - Smallest common iPhone
   - Traditional notch
   - A13 Bionic (mid performance)

3. **Android Mid-Range** (360x740, Android 11+)
   - Common resolution
   - Gesture navigation
   - Mid-tier CPU (performance baseline)

**Testing Matrix:**
- Portrait orientation (primary)
- Landscape orientation (verify responsive behavior)
- Dark mode (verify no regressions)

---

## Dependencies Overview

### Keep (No Changes)
```json
{
  "next": "14.2.33",
  "@tanstack/react-query": "^5.80.3",
  "@trpc/client": "^10.45.2",
  "recharts": "2.12.7",
  "framer-motion": "^12.23.22",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-select": "^2.0.0",
  "react-hook-form": "^7.48.2",
  "zod": "^3.22.4",
  "tailwindcss": "^3.4.0"
}
```

### Add (Dev Dependencies)
```json
{
  "@next/bundle-analyzer": "^14.2.33"
}
```

### Optional (Builder-1 Decision)
```json
{
  "@vercel/analytics": "^1.1.0",
  "@vercel/speed-insights": "^1.0.0"
}
```

**Rationale:** Analytics helpful for monitoring performance in production, but not required for MVP.

---

## Migration Notes

### From Iteration 14

**What's Already Done (Build On):**
- ✅ Bottom navigation with scroll-hide
- ✅ Touch target compliance (44x44px minimum)
- ✅ Safe area utilities (env variables)
- ✅ Input component with inputMode prop
- ✅ Select component mobile-optimized
- ✅ Button component responsive heights

**What's New (Iteration 15):**
- Dynamic imports for performance
- React.memo for list components
- MobileSheet component (bottom sheet pattern)
- useChartDimensions hook (responsive charts)
- React Query mobile optimization
- inputMode usage in forms

**No Breaking Changes:**
- Desktop layouts unchanged
- Existing components maintain API
- All changes are additive or refinements

---

**Tech Stack Status:** FINALIZED
**Risk Level:** Low (building on stable foundations)
**Ready for:** Pattern documentation and builder task breakdown
