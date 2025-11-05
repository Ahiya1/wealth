# Technology Stack - Iteration 14

## Core Framework

### Decision: Next.js 14.2.33 App Router

**Rationale:**
- Server Components reduce client bundle (critical for mobile: ~100KB runtime)
- Built-in route-based code splitting (automatic mobile optimization)
- Streaming SSR for faster perceived load times on slow networks
- usePathname hook for active state detection in bottom nav
- Image optimization with next/image (not used heavily in this iteration but ready)

**Mobile-specific benefits:**
- Server Components for heavy components (no client JS for static content)
- Metadata API for viewport-fit=cover (safe area support)
- Route prefetching for instant navigation (bottom nav)

**Version locked:** 14.2.33 (stable, production-ready)

**Alternatives Considered:**
- Remix: Excellent mobile performance but team already on Next.js
- Vite + React Router: No SSR out-of-box, more setup needed

---

## Styling

### Decision: Tailwind CSS 3.4.1

**Rationale:**
- Mobile-first by design (default breakpoint strategy)
- Responsive utilities (sm:, md:, lg:) already in use across codebase
- Easy to add custom utilities for safe areas, touch targets
- Excellent PurgeCSS integration (~10KB final CSS bundle)
- JIT compiler for fast development

**Configuration extensions (required for this iteration):**

```javascript
// tailwind.config.ts additions
extend: {
  spacing: {
    'safe-top': 'var(--safe-area-inset-top)',
    'safe-bottom': 'var(--safe-area-inset-bottom)',
    'safe-left': 'var(--safe-area-inset-left)',
    'safe-right': 'var(--safe-area-inset-right)',
  },
  minHeight: {
    'touch-target': '44px',  // WCAG minimum
    'touch-target-xl': '48px', // Material Design standard
  },
  minWidth: {
    'touch-target': '44px',
    'touch-target-xl': '48px',
  },
  padding: {
    'safe-t': 'var(--safe-area-inset-top)',
    'safe-b': 'var(--safe-area-inset-bottom)',
    'safe-l': 'var(--safe-area-inset-left)',
    'safe-r': 'var(--safe-area-inset-right)',
  },
  zIndex: {
    'bottom-nav': '45', // Between sidebar (40) and modals (50)
  }
}
```

**Plugin to add:**
```javascript
plugins: [
  require('tailwindcss-animate'), // Already present
  require('@tailwindcss/container-queries'), // NEW - REQUIRED
]
```

**Why container queries:** Dashboard components (DashboardStats) need to respond to container width, not viewport width (sidebar open/closed affects available space).

**Alternatives Considered:**
- CSS Modules: Less mobile-first, more boilerplate
- Emotion/Styled Components: Runtime cost, worse for mobile

---

## UI Framework

### Decision: Radix UI (Multiple Packages)

**Current packages:**
- `@radix-ui/react-dialog` ^1.1.15 (for MoreSheet, modals)
- `@radix-ui/react-dropdown-menu` ^2.1.4 (navigation menus)
- `@radix-ui/react-select` ^2.1.4 (form selects)
- `@radix-ui/react-popover` ^1.1.4 (tooltips, popovers)
- `@radix-ui/react-checkbox` (form inputs)
- `@radix-ui/react-tabs` (tabbed interfaces)

**Rationale:**
- Headless = full mobile styling control (no desktop-first defaults)
- Excellent accessibility (WCAG 2.1 AA compliant out-of-box)
- Touch-friendly interactions built-in (tap targets, focus management)
- Small bundle size (tree-shakeable, ~30-40KB total)
- Portal rendering for proper z-index control

**Mobile enhancements needed:**
- Collision detection on all portal components (stay 16px from edges)
- Increase touch targets in menu items (py-2.5 instead of py-1.5)
- Bottom sheet variant from Dialog (slide-up animation, safe area padding)

**Implementation Notes:**

**Radix Select mobile fix:**
```tsx
<SelectContent className={cn(
  "min-w-[calc(100vw-4rem)] sm:min-w-[8rem]", // Mobile: near full width
  // ... rest
)}>
```

**Radix Dialog as bottom sheet:**
```tsx
<DialogContent className={cn(
  "fixed bottom-0 left-0 right-0 top-auto", // Bottom positioning
  "rounded-t-2xl rounded-b-none", // Rounded top corners only
  "pb-safe-b", // Safe area padding
  "max-h-[80vh]", // Don't cover full screen
)}>
```

**Radix Dropdown collision detection:**
```tsx
<DropdownMenuContent
  collisionPadding={16} // Stay 16px from viewport edges
  sideOffset={8} // More space from trigger on mobile
>
```

**No new Radix packages needed!** All functionality achievable with existing packages.

**Alternatives Considered:**
- @radix-ui/react-sheet: Doesn't exist, Dialog works perfectly
- Headless UI: Less mature, smaller ecosystem
- Chakra UI: Too opinionated, harder to customize for mobile

---

## Animations

### Decision: Framer Motion 12.23.22 (Conditional Use)

**Current usage:**
- Page transitions: pageTransition, dashboardEntrance
- Card hovers: cardHoverSubtle, cardHoverElevated
- Stagger animations: staggerContainer, staggerItem
- Modal animations: modalAnimation

**Rationale for KEEPING:**
- Already installed (~50KB client bundle)
- Layout animations for active tab indicator (layoutId prop)
- Scroll-linked animations for bottom nav auto-hide
- Excellent reduced motion support (respects prefers-reduced-motion)

**Mobile-specific concerns:**
- 50KB bundle on mobile (acceptable but needs optimization)
- Potential 60fps issues on low-end Android devices

**Optimization strategy (implement in this iteration):**

```typescript
// Detect reduced motion preference
const prefersReducedMotion = usePrefersReducedMotion()

// Conditional animations
<motion.div
  variants={prefersReducedMotion ? undefined : staggerContainer}
  initial="hidden"
  animate="visible"
>
```

**Bottom nav scroll-hide animation:**
```tsx
<motion.nav
  animate={{ y: showNav ? 0 : 80 }}
  transition={{
    duration: 0.3,
    ease: 'easeOut'
  }}
  style={{
    willChange: 'transform' // GPU acceleration hint
  }}
/>
```

**Performance budget:**
- Animation duration: ≤300ms
- Target frame rate: 60fps (16.67ms/frame)
- Use CSS transforms (GPU-accelerated): translateY, scale, opacity
- Avoid layout properties: top, bottom, height, width

**Alternative considered:**
- Pure CSS animations: Lightweight but limited (no layoutId, no scroll-linked)
- CSS transitions: Use for simple animations (button hovers, fades)
- Decision: Hybrid approach - CSS for simple, Framer for complex

**When to use CSS vs Framer Motion:**
- CSS: Hover states, simple transitions, loading spinners
- Framer Motion: Page transitions, stagger lists, layout animations

---

## Data Visualization

### Decision: Recharts 2.12.7 (Dynamic Import Required)

**Current status:** Imported directly in 6+ components (~120KB bundle impact)

**Mobile concern:** Heavy bundle weight, needs optimization

**Implementation strategy (NOT for this iteration, but planned):**

```tsx
// Before (blocking)
import { BarChart, Bar, XAxis } from 'recharts'

// After (non-blocking - Iteration 15)
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  loading: () => <Skeleton className="h-[250px]" />,
  ssr: false,
})
```

**For Iteration 14:** Keep as-is, no chart optimization
**For Iteration 15:** Dynamic import, mobile-responsive dimensions

**Bundle savings (future):** ~120KB for dashboard initial load (35% reduction)

---

## State Management

### Decision: tRPC 11.6.0 + React Query 5.80.3

**Rationale:**
- Type-safe API layer (no runtime overhead)
- Optimistic updates (instant UI feedback on mobile)
- Cache management (reduce network requests on slow connections)
- React Query handles loading states automatically

**Mobile-specific optimization (implement in this iteration):**

```tsx
// Mobile-optimized staleTime
useQuery({
  staleTime: 60000, // Cache for 60s on mobile (reduce network)
  retry: 1,         // Only retry once on mobile (fail fast)
  refetchOnWindowFocus: false, // Don't refetch on tab switch (mobile)
})
```

**Bundle impact:** ~25KB (acceptable for functionality)

**Alternatives Considered:**
- SWR: Good, but team already on React Query
- Redux: Too heavy for mobile, unnecessary complexity

---

## Date Handling

### Decision: date-fns 3.6.0 (Selective Imports)

**Rationale:**
- Tree-shakeable (only import used functions)
- Functional API (no class instantiation overhead)
- Smaller than Moment.js (~10KB vs ~70KB)

**Mobile optimization:**
```typescript
// Only import what you need
import { format, parseISO, isToday } from 'date-fns'

// NOT this (imports entire library)
import * as dateFns from 'date-fns'
```

**Bundle impact:** ~10KB (with selective imports)

**Alternatives Considered:**
- Moment.js: Too heavy (70KB)
- Day.js: Good alternative, but date-fns already in use

---

## New Dependencies Required

### @tailwindcss/container-queries

**Purpose:** Component-level responsive design (better than media queries)

**Version:** Latest (^1.0.0)

**Size:** ~2KB (build-time plugin, no runtime cost)

**Priority:** HIGH - Required for DashboardStats responsive layout

**Use case:**
```tsx
<Card className="@container">
  <div className="grid @lg:grid-cols-2">
    {/* Responds to CARD width, not viewport */}
  </div>
</Card>
```

**Installation:**
```bash
npm install -D @tailwindcss/container-queries
```

**Why needed:** Dashboard sidebar open/closed changes available space, components need to respond to container width, not viewport.

---

## Dependencies to AVOID (This Iteration)

### react-window (Virtual Scrolling)

**Why not:** Premature optimization. Current transaction lists <100 items.

**When to add:** Iteration 16 (if lists exceed 500+ items or performance testing shows jank)

### Native Sheet Libraries (vaul, sonner, etc.)

**Why not:** Radix UI Dialog can be styled as bottom sheet. No extra dependency needed.

**Proof:**
```tsx
// Bottom sheet from Dialog
<Dialog>
  <DialogContent className="fixed inset-x-0 bottom-0 top-auto rounded-t-2xl pb-safe-b">
    {/* Bottom sheet appearance */}
  </DialogContent>
</Dialog>
```

### Framer Motion Alternatives (react-spring, GSAP)

**Why not:** Already using Framer Motion, no need to mix animation libraries.

---

## CSS Custom Properties Strategy

### Safe Area Variables (NEW - Required)

Add to `globals.css`:

```css
@layer base {
  :root {
    /* Existing variables... */

    /* NEW: Safe area insets (iPhone notch, Android gesture bar) */
    --safe-area-inset-top: env(safe-area-inset-top, 0px);
    --safe-area-inset-right: env(safe-area-inset-right, 0px);
    --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-inset-left: env(safe-area-inset-left, 0px);
  }
}

/* Utility classes for safe areas */
@layer utilities {
  .safe-area-top {
    padding-top: max(1rem, var(--safe-area-inset-top));
  }

  .safe-area-bottom {
    padding-bottom: max(1rem, var(--safe-area-inset-bottom));
  }

  .safe-bottom-fixed {
    bottom: var(--safe-area-inset-bottom);
  }
}
```

### Viewport Meta Tag (Required)

Add to `src/app/layout.tsx`:

```tsx
export const metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',  // CRITICAL: Enables safe-area-inset-* variables
  },
}
```

---

## Performance Targets

### Bundle Size Targets (Iteration 14)

**Before optimization:**
- Dashboard page: ~300KB JS (estimated)
- Transactions page: ~250KB JS
- Client runtime: ~100KB (Next.js)

**After Iteration 14 (without chart optimization):**
- Dashboard page: ~280KB JS (20KB savings from mobile-first CSS)
- Transactions page: ~240KB JS
- Client runtime: ~100KB (unchanged)

**Target for Iteration 15 (with dynamic imports):**
- Dashboard page: <150KB JS (dynamic import Recharts)
- Transactions page: <120KB JS

### Web Vitals Targets

**First Contentful Paint (FCP):**
- Target: <1.8s on Fast 3G
- Current: ~2.5s (estimated, needs measurement)

**Largest Contentful Paint (LCP):**
- Target: <2.5s on Fast 3G
- Current: ~3.0s (estimated, needs measurement)

**Cumulative Layout Shift (CLS):**
- Target: <0.1
- Current: ~0.15 (needs measurement, bottom nav will help)

**First Input Delay (FID):**
- Target: <100ms
- Current: Good (React is fast)

**Frame Rate:**
- Target: 60fps (16.67ms/frame) during scroll and animations
- Test: Chrome DevTools Performance tab with 6x CPU slowdown

### Lighthouse Scores (Mobile)

**Performance:** 85+ (target 90+ in Iteration 15)
**Accessibility:** 100 (WCAG 2.1 AA compliance)
**Best Practices:** 95+
**SEO:** 100

---

## Testing Infrastructure

### Manual Testing (Real Devices)

**Required devices:**
- iPhone 14 Pro (Dynamic Island, safe-area-inset-top: 59px)
- iPhone SE (small screen 375px, no notch)
- Android mid-range (gesture navigation, safe-area-inset-bottom: 24px)
- iPad Mini (tablet breakpoint 768px)

**Testing tool:** ngrok + local dev server
- `npm run dev`
- `ngrok http 3000`
- Access from phone via ngrok URL

**Why real devices:** Safe areas, touch targets, scroll physics don't work in simulators.

### DevTools Responsive Testing

**Use for:** Layout validation, breakpoint testing

**Don't rely on for:** Safe area insets (always 0 in emulator), touch target feel

**Devices to emulate:**
- iPhone SE (375x667) - Smallest common
- iPhone 14 Pro (390x844) - Most common
- Pixel 6 (412x915) - Android standard
- iPad Mini (768x1024) - Tablet breakpoint

### Automated Accessibility Testing

**Tool:** Lighthouse CI (already in Next.js)

**Command:**
```bash
npm run build
lighthouse http://localhost:3000/dashboard --preset=mobile --view
```

**Metrics to track:**
- Touch targets minimum 44x44px
- Tap targets spaced adequately (min 8px)
- Contrast ratios (WCAG AA: 4.5:1 text, 3:1 UI)
- Viewport meta tag present

### Performance Profiling

**Tool:** Chrome DevTools Performance tab

**Test scenarios:**
1. Dashboard load (measure LCP, CLS)
2. Transaction list scroll (60fps check)
3. Bottom nav show/hide (transform performance)
4. Modal opening (animation smoothness)

**Thresholds:**
- FCP <1.8s on Fast 3G
- LCP <2.5s on Fast 3G
- CLS <0.1
- 60fps during scroll (no dropped frames)

---

## Environment Variables

No new environment variables required for this iteration.

**Existing variables (unchanged):**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side key

---

## Dependencies Overview

### Keep (No Version Changes)

```json
{
  "next": "^14.2.33",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "tailwindcss": "3.4.1",
  "framer-motion": "^12.23.22",
  "recharts": "2.12.7",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.4",
  "@radix-ui/react-select": "^2.1.4",
  "@tanstack/react-query": "^5.80.3",
  "@trpc/client": "11.6.0",
  "@trpc/server": "11.6.0",
  "@trpc/react-query": "11.6.0",
  "date-fns": "3.6.0",
  "lucide-react": "0.460.0",
  "next-themes": "^0.4.6"
}
```

### Add (New Dependencies)

```json
{
  "@tailwindcss/container-queries": "^1.0.0"
}
```

**Installation command:**
```bash
npm install -D @tailwindcss/container-queries
```

---

## Security Considerations

### Safe Area Handling

**Concern:** CSS env() variables could expose device type

**Mitigation:** No security risk, env() values are public information

### Z-Index Hierarchy

**Concern:** Bottom nav above content could hide security prompts

**Mitigation:** Toasts and critical modals at z-100, above all navigation

**Z-Index Hierarchy:**
```
z-100: Toasts (critical notifications)
z-50:  Modals, Dialogs, Dropdowns (blocking interactions)
z-45:  Bottom Navigation (non-blocking)
z-40:  Sidebar overlay (mobile)
z-0:   Main content
```

### Mobile Input Security

**Concern:** Numeric keyboards on amount inputs expose financial data

**Mitigation:** Already using secure HTTPS, no additional risk

**Implementation:**
```tsx
<Input
  type="text"
  inputMode="decimal"
  // inputMode doesn't change security, just keyboard
/>
```

---

## Summary

**Tech decisions finalized:**
- Next.js 14 (keep) - Server Components for mobile optimization
- Tailwind CSS 3.4.1 (extend) - Add safe area, touch target, container query utilities
- Radix UI (keep) - Mobile-optimize existing components
- Framer Motion (optimize) - Conditional animations, respect reduced motion
- @tailwindcss/container-queries (add) - Required for responsive components

**No breaking changes.** All additions are backwards-compatible.

**Bundle impact:** +2KB (container queries plugin), no runtime cost increase.

**Performance impact:** Positive (mobile-first CSS reduces initial load, GPU-accelerated animations).

**Ready for builders:** All technology decisions documented with implementation examples.
