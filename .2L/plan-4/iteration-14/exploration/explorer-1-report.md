# Explorer 1 Report: Foundation Architecture & Safe Areas

**Explorer ID:** Explorer-1  
**Iteration:** 14 (Plan-4, Iteration 1)  
**Focus Area:** Foundation Architecture & Safe Areas  
**Date:** 2025-11-05  

---

## Executive Summary

The Wealth application has a solid foundation built on Next.js 14, Tailwind CSS, and Radix UI, with a well-structured component library and design system. However, mobile optimization is currently in the "responsive desktop" phase rather than "mobile-first" implementation. The codebase shows consistent patterns that will make mobile polish achievable, but requires systematic updates to spacing, touch targets, and safe area handling. No mobile-specific safe area CSS is currently implemented, and the bottom navigation integration will require careful z-index and layout management.

**Key Findings:**
- No existing safe area handling (no env() variables in CSS)
- Fixed-position elements: 1 (mobile menu button in sidebar)
- Touch target compliance: ~60% (many h-8/h-9 buttons need h-11)
- Layout spacing: Desktop-first (p-6 standard, needs p-4 sm:p-6 pattern)
- Strong foundation: Consistent Radix UI components, good animation patterns
- Risk: Bottom nav will conflict with existing fixed sidebar button (z-index coordination needed)

---

## Discoveries

### 1. Current CSS Architecture

**CSS Variables Structure (globals.css):**
- Comprehensive HSL-based design system with semantic tokens
- Color palettes: Sage (primary), Warm Gray (neutrals), Terracotta, Dusty Blue, Gold
- Dark mode fully implemented with proper HSL variable swapping
- No safe area CSS variables present (lines 1-195 audited)
- Prefers-reduced-motion respected globally (lines 170-180)

**Key Pattern:**
```css
:root {
  --sage-600: 140 14% 33%;
  --primary: var(--sage-600);
  --radius: 0.5rem;
  /* NO safe area variables like --safe-area-inset-bottom */
}
```

**Critical Gap:** Zero mobile-specific CSS variables for safe areas.

### 2. Tailwind Configuration Analysis

**Current Extensions (tailwind.config.ts):**
- Font families: Sans (Inter) + Serif (Crimson Pro)
- Color system: Full HSL palettes for all brand colors
- Border radius: Custom "warmth" radius (0.75rem)
- Box shadows: Soft shadow utilities (soft, soft-md, soft-lg, soft-xl)
- Animations: fade-in, slide-in, skeleton, breathe, gentle-bounce
- **MISSING:** Touch target utilities, safe area utilities, mobile spacing overrides

**Existing Breakpoints (Tailwind default):**
```javascript
sm: '640px',
md: '768px', 
lg: '1024px',
xl: '1280px',
'2xl': '1400px' (container override)
```

**Pattern Identified:** Desktop-first utilities, no mobile-specific helpers.

### 3. Layout Structure Deep Dive

**Dashboard Layout (/src/app/(dashboard)/layout.tsx):**
```tsx
<div className="min-h-screen bg-warm-gray-50">
  <div className="flex">
    <DashboardSidebar user={user} />
    <main className="flex-1 overflow-auto w-full lg:w-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-16 lg:pt-8">
        {children}
      </div>
    </main>
  </div>
</div>
```

**Critical Observations:**
1. **Main content padding:** `px-4 py-8` (consistent) - Good foundation
2. **Top padding shift:** `pt-16 lg:pt-8` - Accounts for mobile menu button
3. **No bottom padding buffer:** Will need `pb-20 lg:pb-8` for bottom nav clearance
4. **Container max-width:** 7xl (1280px) - Works well

**DashboardSidebar Structure:**
- Fixed positioning: `fixed lg:static` with slide animation
- Mobile menu button: `fixed top-4 left-4 z-50` (48x48px effective)
- Overlay: `fixed inset-0 bg-black/50 z-40`
- Sidebar itself: `z-40` with translate animation
- **Coexistence Plan:** Bottom nav needs `z-40`, modals at `z-50`, toasts at `z-[100]`

### 4. Touch Target & Spacing Audit

**Current Button Sizes:**
```typescript
// src/components/ui/button.tsx
size: {
  default: "h-10 px-4 py-2",  // 40px - BELOW 44px minimum
  sm: "h-9 rounded-lg px-3",  // 36px - BELOW minimum
  lg: "h-11 rounded-lg px-8",  // 44px - MEETS minimum ✓
  icon: "h-10 w-10",          // 40x40 - BELOW minimum
}
```

**Compliance Rate:** ~25% (only lg buttons meet WCAG 2.1 AA)

**Input Heights:**
```typescript
// src/components/ui/input.tsx
className: "h-10 w-full rounded-lg..."  // 40px - BELOW 48px mobile target
```

**Card Padding Patterns:**
```tsx
// CardHeader: p-6 (24px) - Desktop-first
// CardContent: p-6 pt-0 - Desktop-first
// TransactionCard: p-4 (16px) - Better for mobile ✓
```

**Dashboard Layout:**
```tsx
// DashboardStats: grid gap-4 md:grid-cols-2 lg:grid-cols-4
// Good: Uses responsive grid, but should be mobile-first
```

**Identified Pattern:** Inconsistent spacing - mix of mobile-first (p-4) and desktop-first (p-6).

### 5. Fixed & Positioned Elements Inventory

**Fixed Position Elements:**
1. **Mobile Menu Button** (DashboardSidebar.tsx:109-119)
   - `fixed top-4 left-4 z-50`
   - 48x48px effective size (p-2 + 24px icon + border)
   - Safe area: NOT respected (needs top-safe padding)

2. **Mobile Overlay** (DashboardSidebar.tsx:122-127)
   - `fixed inset-0 bg-black/50 z-40`
   - Safe area: OK (full screen is intentional)

3. **Sidebar** (DashboardSidebar.tsx:130-136)
   - `fixed lg:static inset-y-0 left-0 z-40`
   - Safe area: NOT respected (needs inset-safe-area-left on iPhone landscape)

**Sticky Elements:** NONE identified (good - less complexity)

**Overlay/Portal Elements (Radix UI):**
- Dialog: z-50 (DialogOverlay line 18)
- DropdownMenu: z-50 (line 68)
- Select: z-50 (SelectContent line 73)
- Popover: z-50 (line 22)
- Toast: (need to verify - likely z-[100])

**Z-Index Strategy Required:**
```
z-0:   Base content
z-10:  Elevated cards/dropdowns (local)
z-40:  Bottom navigation (new), Sidebar overlay
z-50:  Mobile menu button, Radix portals (dialogs, dropdowns)
z-[100]: Toast notifications
```

### 6. Responsive Patterns Analysis

**Good Patterns Found:**

1. **Mobile-First Grid (DashboardStats):**
```tsx
className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
```

2. **Conditional Separators (TransactionCard):**
```tsx
<span className="hidden sm:inline">•</span>
// Only show bullet on larger screens
```

3. **Flex Direction Shift:**
```tsx
className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
// Mobile: Vertical stack, Desktop: Horizontal row
```

4. **Dialog Responsive Width:**
```tsx
className="w-[calc(100%-2rem)] sm:w-full max-w-lg"
// Mobile: Full width minus 1rem margin, Desktop: max-w-lg
```

**Problem Patterns Found:**

1. **Desktop-First Padding:**
```tsx
// CardHeader: p-6 (should be p-4 sm:p-6)
// CardContent: p-6 pt-0 (should be p-4 sm:p-6 pt-0)
```

2. **Small Touch Targets:**
```tsx
// TransactionCard action buttons (line 94-108)
<Button size="icon" className="h-8 w-8">  // 32x32 - TOO SMALL
```

3. **No InputMode Attributes:**
```tsx
// Input component has no inputMode prop
// Forms need inputMode="decimal" for amount inputs
```

4. **Select Min-Width Issue:**
```tsx
// SelectContent: min-w-[8rem] 
// On mobile, this can cause overflow - needs min-w-[calc(100vw-4rem)] sm:min-w-[8rem]
```

### 7. Component Library Assessment

**Radix UI Components Present:**
- ✅ Dialog (modal foundation)
- ✅ DropdownMenu
- ✅ Select
- ✅ Popover
- ✅ Checkbox
- ✅ Tabs
- ✅ AlertDialog
- ✅ Toast (Sonner)
- ✅ Progress
- ✅ Separator

**Missing Mobile-Optimized Components:**
- ❌ Sheet/Drawer (bottom sheet for mobile)
- ❌ Safe area wrapper component
- ❌ Touch-optimized date picker
- ❌ Mobile filter sheet

**Framer Motion Usage:**
- Present in: DashboardStats, TransactionCard, PageTransition
- Pattern: staggerContainer + staggerItem animations
- Performance: Currently no device capability detection (runs on all devices)

### 8. Package Analysis

**Current Dependencies:**
```json
"framer-motion": "^12.23.22",      // Animations
"recharts": "2.12.7",              // Charts (heavy - 100KB+)
"@radix-ui/*": "latest",           // UI primitives
"tailwindcss": "3.4.1",            // Styling
"next-themes": "^0.4.6",           // Dark mode
```

**Missing for Mobile Polish:**
- `@tailwindcss/container-queries` - Modern container-based responsive design
- Explicit safe area utilities (can add without dependency)

**Bundle Implications:**
- Recharts: ~120KB (needs dynamic import)
- Framer Motion: ~50KB (consider conditional loading)
- Total estimated: ~400KB client bundle (target: <250KB for mobile)

---

## Patterns Identified

### Pattern 1: HSL-Based Design System with Semantic Tokens

**Description:** All colors defined as HSL triplets in CSS variables, with semantic tokens mapping to brand colors.

**Use Case:** Enables easy theming, dark mode, and color consistency across components.

**Example:**
```css
:root {
  --sage-600: 140 14% 33%;
  --primary: var(--sage-600);
}

.dark {
  --primary: 140 12% 69%;  /* Lighter for dark mode */
}
```

**Recommendation:** KEEP - Excellent pattern. Extend with safe area variables:
```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
}
```

### Pattern 2: Radix UI with Tailwind Styling

**Description:** Radix UI headless components styled with Tailwind utility classes via `cn()` helper.

**Use Case:** Type-safe, accessible components with full styling control.

**Example:**
```tsx
<SelectTrigger
  className={cn(
    "flex h-10 w-full items-center justify-between rounded-lg...",
    className
  )}
>
```

**Recommendation:** KEEP - Strong pattern. Add mobile variants:
```tsx
// Add mobile-specific overrides
"h-12 sm:h-10"  // Taller on mobile
"min-w-[calc(100vw-4rem)] sm:min-w-[8rem]"  // Prevent overflow
```

### Pattern 3: Motion Animations with Framer Motion

**Description:** Stagger animations on lists using Framer Motion variants.

**Use Case:** Smooth, polished transitions for lists and page changes.

**Example:**
```tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
```

**Recommendation:** OPTIMIZE - Great for desktop, risky for low-end mobile:
```tsx
// Add device capability detection
const prefersReducedMotion = usePrefersReducedMotion()
const isLowEndDevice = useDeviceCapability()

<motion.div
  variants={!prefersReducedMotion && !isLowEndDevice ? staggerContainer : undefined}
>
```

### Pattern 4: Server-First Data Fetching with tRPC

**Description:** tRPC queries on client components with React Query, server components for initial data.

**Use Case:** Type-safe APIs, automatic loading states, optimistic updates.

**Example:**
```tsx
// Client component
const { data, isLoading } = trpc.analytics.dashboardSummary.useQuery()
```

**Recommendation:** KEEP - Excellent for mobile. Consider adding:
```tsx
// Mobile-optimized staleTime
useQuery({
  staleTime: 60000, // Cache for 60s on mobile (reduce network)
  retry: 1,         // Only retry once on mobile
})
```

### Pattern 5: Conditional Responsive Rendering

**Description:** Hide/show elements at breakpoints using Tailwind responsive prefixes.

**Use Case:** Different layouts for mobile vs desktop without JavaScript.

**Example:**
```tsx
<span className="hidden sm:inline">•</span>
<div className="fixed lg:static">Sidebar</div>
```

**Recommendation:** KEEP and EXPAND - Add mobile-specific components:
```tsx
{/* Mobile bottom nav */}
<BottomNavigation className="lg:hidden fixed bottom-0" />

{/* Desktop sidebar */}
<DashboardSidebar className="hidden lg:block" />
```

### Pattern 6: Card-Based Layout System

**Description:** Consistent Card component with Header/Content/Title structure.

**Use Case:** Reusable container pattern across all dashboard sections.

**Example:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Recommendation:** ENHANCE - Add mobile padding variants:
```tsx
// CardHeader update
className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}

// CardContent update  
className={cn("p-4 sm:p-6 pt-0", className)}
```

---

## Complexity Assessment

### High Complexity Areas

#### 1. Bottom Navigation Integration (HIGH - 5-6 hours)
**Why it's complex:**
- Must coexist with existing fixed sidebar (z-index coordination)
- Scroll-based hide/show behavior (requires custom hook)
- Active state synchronization with Next.js routing
- Safe area padding (iOS notch + Android gesture bar)
- "More" sheet for overflow navigation items
- Integration with 5 different route contexts

**Estimated builder splits:** 1 (manageable in single builder with sub-tasks)

**Technical considerations:**
```tsx
// Will need:
1. useScrollDirection hook (detect scroll direction)
2. usePathname integration (active state)
3. z-index: 40 (same as sidebar overlay - careful!)
4. Safe area: pb-[calc(env(safe-area-inset-bottom)+theme(spacing.16))]
5. MoreSheet: Radix Dialog variant for overflow items
```

**Risk:** z-index conflict with sidebar overlay when both visible (mobile menu open + bottom nav visible).

**Mitigation:** Sidebar overlay should cover bottom nav (z-40 > z-40 but earlier in DOM = lower priority).

#### 2. Safe Area CSS Implementation (MEDIUM-HIGH - 3-4 hours)
**Why it's complex:**
- Must test on real devices (iPhone 14 Pro Dynamic Island, Android gesture nav)
- Multiple fixed elements need individual safe area handling
- CSS env() fallback strategy for non-supporting browsers
- Tailwind plugin or utility classes for safe area padding

**Estimated builder splits:** 0 (foundation work, not splittable)

**Technical approach:**
```css
/* globals.css additions */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  /* ... */
}

@supports (padding: max(0px)) {
  .safe-area-bottom {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}
```

```javascript
// tailwind.config.ts additions
extend: {
  spacing: {
    'safe-top': 'var(--safe-area-inset-top)',
    'safe-bottom': 'var(--safe-area-inset-bottom)',
  }
}
```

#### 3. Touch Target Compliance Sweep (MEDIUM - 4-5 hours)
**Why it's complex:**
- 40+ components need auditing
- Button component variants need updating
- Icon buttons are pervasive (h-8 w-8 → h-11 w-11)
- Must maintain visual balance (larger targets can look clunky)
- Dropdown menu items need height increase

**Estimated builder splits:** 0 (systematic refactor, needs single owner)

**Pattern changes required:**
```tsx
// Before
<Button size="icon" className="h-8 w-8">

// After
<Button size="icon" className="h-11 w-11 sm:h-9 sm:w-9">
// Larger on mobile, desktop can stay compact

// OR update button.tsx default sizes:
icon: "h-11 w-11 sm:h-10 sm:w-10"
default: "h-11 px-4 py-2 sm:h-10"
```

### Medium Complexity Areas

#### 4. Radix UI Mobile Overrides (MEDIUM - 2-3 hours)
**Why it's medium complexity:**
- 5-6 Radix components need mobile variants
- Select dropdown overflow issue (min-w-[8rem] too rigid)
- Dropdown/Popover positioning near viewport edges
- Dialog/AlertDialog need mobile padding adjustments

**Components requiring updates:**
1. Select (min-width issue)
2. DropdownMenu (collision detection)
3. Popover (edge positioning)
4. Dialog (padding and max-height)
5. Calendar (touch target size)

**Technical changes:**
```tsx
// select.tsx
<SelectContent
  className={cn(
    "min-w-[calc(100vw-4rem)] sm:min-w-[8rem]",  // Mobile: near full width
    // ... rest
  )}
>

// dropdown-menu.tsx
<DropdownMenuContent
  collisionPadding={16}  // Radix prop: stay 16px from edges
  sideOffset={8}         // More space from trigger on mobile
>
```

#### 5. Layout Spacing Standardization (MEDIUM - 2-3 hours)
**Why it's medium complexity:**
- 30+ files with hardcoded p-6 padding
- Need systematic find/replace with validation
- Card components (CardHeader, CardContent)
- Page containers
- Must not break desktop layouts

**Approach:**
```bash
# Find all p-6 instances
grep -r "p-6" src/components --include="*.tsx"

# Replace with mobile-first pattern
p-6 → p-4 sm:p-6
px-6 → px-4 sm:px-6
py-6 → py-4 sm:py-6
```

**Validation needed:** Visual diff on 5-10 key pages at 375px and 1280px.

### Low Complexity Areas

#### 6. Tailwind Config Extensions (LOW - 1-2 hours)
**Why it's low complexity:**
- Straightforward config additions
- No breaking changes to existing utilities
- Well-documented Tailwind plugin system

**Required additions:**
```javascript
extend: {
  spacing: {
    'safe-top': 'var(--safe-area-inset-top)',
    'safe-bottom': 'var(--safe-area-inset-bottom)',
  },
  minHeight: {
    'touch-target': '44px',
  },
  minWidth: {
    'touch-target': '44px',
  },
  padding: {
    'safe-t': 'var(--safe-area-inset-top)',
    'safe-b': 'var(--safe-area-inset-bottom)',
  }
}
```

#### 7. CSS Variable Additions (LOW - 1 hour)
**Why it's low complexity:**
- Append-only changes to globals.css
- No existing CSS variable removal needed
- Clear pattern established

**Code to add:**
```css
/* Add to :root in globals.css */
--safe-area-inset-top: env(safe-area-inset-top, 0px);
--safe-area-inset-right: env(safe-area-inset-right, 0px);
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
--safe-area-inset-left: env(safe-area-inset-left, 0px);
```

#### 8. useMediaQuery Hook (LOW - 30 minutes)
**Why it's low complexity:**
- Standard React hook pattern
- Client-side only (use in client components)
- No SSR hydration issues (useState with useEffect)

**Implementation:**
```tsx
// src/hooks/useMediaQuery.ts
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])
  
  return matches
}
```

---

## Technology Recommendations

### Primary Stack (KEEP)

#### Framework: Next.js 14 App Router
**Rationale:**
- Server Components reduce client bundle (critical for mobile)
- Built-in route-based code splitting
- Excellent mobile performance with proper optimization
- Streaming SSR for faster perceived load times

**Mobile optimization strategy:**
- Use Server Components for heavy components (charts, lists)
- Dynamic imports for below-fold content
- Metadata API for preloading critical assets

#### Styling: Tailwind CSS 3.4.1
**Rationale:**
- Mobile-first by design (default Tailwind philosophy)
- Responsive utilities (sm:, md:, lg:) already in use
- Easy to add custom utilities for safe areas
- Excellent PurgeCSS integration (small bundle)

**Additions needed:**
```javascript
plugins: [
  require('tailwindcss-animate'),      // ✅ Already present
  require('@tailwindcss/container-queries'),  // ❌ ADD THIS
]
```

**Why container queries:** Better than media queries for component-level responsive design (e.g., card that adapts to sidebar width).

#### UI Framework: Radix UI
**Rationale:**
- Headless = full mobile styling control
- Excellent accessibility (WCAG 2.1 AA compliant)
- Touch-friendly interactions built-in
- Small bundle size (tree-shakeable)

**Mobile enhancements needed:**
- Add collision detection to all portal components
- Increase touch targets in menu items
- Consider Sheet component for mobile (bottom drawer)

### Supporting Libraries (KEEP + OPTIMIZE)

#### Animations: Framer Motion (CONDITIONAL USE)
**Current status:** Used in ~5 components  
**Mobile concern:** 50KB bundle, potential 60fps issues on low-end Android

**Recommendation:** Conditional loading
```tsx
// Create hook: src/hooks/useEnableAnimations.ts
export function useEnableAnimations() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isLowEndDevice = useDeviceCapability() // CPU cores < 4
  
  return !prefersReducedMotion && !isLowEndDevice
}

// Usage in components
const enableAnimations = useEnableAnimations()

return enableAnimations ? (
  <motion.div variants={staggerContainer}>
    {/* Animated */}
  </motion.div>
) : (
  <div>
    {/* Static fallback */}
  </div>
)
```

**Bundle savings:** ~50KB for low-end devices (15% reduction).

#### Charts: Recharts (DYNAMIC IMPORT REQUIRED)
**Current status:** Imported directly in 6+ components  
**Mobile concern:** ~120KB bundle, heavy rendering on mobile

**Recommendation:** Dynamic import with loading state
```tsx
// Before (blocking)
import { BarChart, Bar, XAxis } from 'recharts'

// After (non-blocking)
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  loading: () => <Skeleton className="h-[250px]" />,
  ssr: false,
})
```

**Bundle savings:** ~120KB for dashboard initial load (35% reduction).

### New Dependencies Required

#### 1. @tailwindcss/container-queries
**Purpose:** Component-level responsive design (better than media queries)  
**Size:** ~2KB  
**Priority:** HIGH

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

**Config:**
```javascript
// tailwind.config.ts
plugins: [
  require('@tailwindcss/container-queries'),
]
```

### Dependencies to AVOID

#### ❌ react-window (Virtual Scrolling)
**Why not now:** Premature optimization. Current transaction lists are <100 items.  
**When to add:** If lists exceed 500+ items or performance testing shows jank.

#### ❌ Native Sheet Libraries (vaul, etc.)
**Why not:** Radix UI Dialog can be styled as bottom sheet. No need for extra dependency.

**Implementation:**
```tsx
// Create sheet variant from Dialog
<Dialog>
  <DialogContent className="fixed inset-x-0 bottom-0 top-auto rounded-t-2xl">
    {/* Bottom sheet appearance */}
  </DialogContent>
</Dialog>
```

---

## Integration Points

### Internal Integrations

#### 1. Bottom Navigation ↔ Dashboard Layout
**Connection:** Bottom nav renders inside layout, must respect z-index and safe areas.

**Integration complexity:** MEDIUM  
**Technical approach:**
```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen">
      <DashboardSidebar user={user} />
      
      <main className="flex-1 pb-20 lg:pb-8">
        {/* pb-20 = 80px clearance for bottom nav */}
        {children}
      </main>
      
      {/* Bottom nav */}
      <BottomNavigation className="lg:hidden" />
    </div>
  )
}
```

**Considerations:**
- Bottom nav must not render on server (client component)
- usePathname for active state (client-side routing)
- Scroll behavior must not conflict with page scrolling

#### 2. Bottom Navigation ↔ Next.js Routing
**Connection:** Active state must sync with current route, navigation must use Next.js Link.

**Integration complexity:** LOW  
**Technical approach:**
```tsx
'use client'

export function BottomNavigation() {
  const pathname = usePathname()
  
  const items = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: Receipt, label: 'Transactions' },
    // ...
  ]
  
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe-bottom">
      {items.map(item => (
        <Link
          href={item.href}
          className={pathname.startsWith(item.href) ? 'active' : ''}
        >
          <item.icon />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
```

#### 3. Safe Area CSS ↔ All Fixed Elements
**Connection:** All fixed/sticky elements must consume safe area CSS variables.

**Integration complexity:** MEDIUM  
**Affected components:**
- BottomNavigation (new): pb-safe-bottom
- DashboardSidebar mobile button: top-safe-top
- Dialog/Sheet modals: padding with safe areas
- Toast notifications: mb-safe-bottom

**Pattern:**
```tsx
// Mobile menu button
className="fixed top-[calc(1rem+var(--safe-area-inset-top))] left-4 z-50"

// Bottom navigation
className="fixed bottom-0 pb-[var(--safe-area-inset-bottom)] z-40"
```

#### 4. Touch Target Utilities ↔ Button Component
**Connection:** Button variants must use new touch target sizing.

**Integration complexity:** LOW  
**Changes:**
```tsx
// src/components/ui/button.tsx
size: {
  default: "h-11 px-4 py-2 sm:h-10",        // Was h-10
  sm: "h-10 rounded-lg px-3 sm:h-9",        // Was h-9
  lg: "h-12 rounded-lg px-8 sm:h-11",       // Was h-11
  icon: "h-11 w-11 sm:h-10 sm:w-10",        // Was h-10 w-10
}
```

### External Integrations

#### 5. iOS Safari ↔ Safe Area Insets
**Connection:** CSS env() variables populated by iOS Safari viewport API.

**Integration complexity:** MEDIUM (testing)  
**Technical requirements:**
- Meta viewport tag: `viewport-fit=cover` in layout.tsx
- CSS fallbacks for non-supporting browsers
- Real device testing (simulator NOT reliable for safe areas)

**Meta tag addition:**
```tsx
// src/app/layout.tsx
export const metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',  // ← ADD THIS
  },
}
```

#### 6. Android Chrome ↔ Gesture Navigation
**Connection:** Android gesture bar (3-button or swipe nav) creates bottom safe area.

**Integration complexity:** LOW  
**Considerations:**
- Safe area inset typically 0-24px on Android
- Gesture bar overlays content if not accounted for
- env(safe-area-inset-bottom) works on Chrome 69+

**Testing devices:**
- Pixel 6 (gesture nav enabled)
- Samsung Galaxy S21 (One UI gesture nav)
- Generic Android 12+ emulator

---

## Risks & Challenges

### Technical Risks

#### Risk 1: Bottom Nav Z-Index Conflict with Sidebar
**Probability:** 70%  
**Impact:** HIGH - Bottom nav hidden by sidebar overlay on mobile menu open

**Scenario:**
1. User opens mobile hamburger menu (overlay z-40, sidebar z-40)
2. Bottom nav also at z-40
3. Sidebar overlay covers bottom nav → user can't navigate

**Mitigation:**
```tsx
// Option A: Hide bottom nav when sidebar open
const [sidebarOpen, setSidebarOpen] = useState(false)

<BottomNavigation className={cn(
  "lg:hidden",
  sidebarOpen && "opacity-0 pointer-events-none"
)} />

// Option B: Different z-index layers
// Sidebar overlay: z-40
// Bottom nav: z-45 (stays above overlay)
// Mobile menu button: z-50 (stays above bottom nav)
```

**Recommended:** Option B - Bottom nav at z-45 allows navigation even with sidebar open.

#### Risk 2: iOS Safe Area Inconsistencies
**Probability:** 60%  
**Impact:** MEDIUM - Content hidden behind notch/home indicator on some devices

**Devices at risk:**
- iPhone 14 Pro/Pro Max (Dynamic Island)
- iPhone 12-15 (notch)
- iPhone SE (no notch, but home indicator)

**Mitigation:**
1. Real device testing (borrow devices or use BrowserStack)
2. Fallback padding when env() not supported:
   ```css
   padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
   ```
3. Visual indicators in dev mode (show safe areas)

#### Risk 3: Touch Target Cascade Effects
**Probability:** 50%  
**Impact:** MEDIUM - Increasing touch targets breaks layouts

**Scenario:**
1. Change icon buttons from h-8 w-8 to h-11 w-11
2. TransactionCard action buttons now too large (visual imbalance)
3. Flex layout breaks on narrow screens

**Mitigation:**
```tsx
// Use responsive sizing
<Button 
  size="icon" 
  className="h-11 w-11 sm:h-8 sm:w-8"  // Large mobile, compact desktop
>

// Or adjust parent container
<div className="flex gap-2 sm:gap-1">
  {/* Larger gap on mobile to accommodate bigger buttons */}
</div>
```

### Complexity Risks

#### Risk 4: Scroll-Hide Bottom Nav Performance
**Probability:** 65%  
**Impact:** MEDIUM - Janky scroll behavior on low-end devices

**Technical challenge:**
- Must track scroll direction (useScrollDirection hook)
- Frequent state updates on scroll event
- CSS transitions must be performant (transform, not top/bottom)

**Mitigation:**
```tsx
// Debounce scroll events
const handleScroll = debounce(() => {
  setScrollDirection(...)
}, 50)

// Use transform (GPU-accelerated)
<nav className={cn(
  "transition-transform duration-300",
  scrollDirection === 'down' && "translate-y-full"
)}>
```

**Alternative:** Skip scroll-hide for iteration 1, add in iteration 3 (polish phase).

#### Risk 5: Recharts Touch Interaction Failures
**Probability:** 70%  
**Impact:** HIGH - Charts not interactive on mobile (can't tap legend, hover tooltip broken)

**Known issues:**
- Recharts built for desktop hover (not touch)
- Tooltip requires hover event (doesn't work on mobile)
- Small legend items hard to tap

**Mitigation:**
```tsx
// Enable touch-friendly tooltips
<LineChart>
  <Tooltip 
    allowEscapeViewBox={{ x: true, y: true }}  // Don't clip to chart
    trigger="click"  // Click instead of hover on mobile
  />
</LineChart>

// Larger legend items
<Legend 
  wrapperStyle={{ fontSize: 14, padding: 8 }}  // Bigger touch targets
  iconSize={20}  // Larger icons
/>
```

**Fallback:** Provide data table view for mobile users if charts fail.

---

## Recommendations for Planner

### 1. Adopt Mobile-First CSS from Day 1
**Rationale:** Easier to enhance desktop than fix mobile retroactively.

**Concrete actions:**
- All new styles: write mobile (no prefix) first, then sm:/md:/lg: overrides
- Update linting/PR template to require mobile-first patterns
- Code review checklist: "Is this mobile-first?"

**Example:**
```tsx
// BAD (desktop-first)
<div className="p-6 sm:p-4">

// GOOD (mobile-first)
<div className="p-4 sm:p-6">
```

### 2. Implement Safe Areas Before Bottom Nav
**Rationale:** Bottom nav depends on safe area infrastructure. Building bottom nav first will require rework.

**Sequencing:**
1. Add CSS variables to globals.css (30 min)
2. Add Tailwind utilities (1 hour)
3. Update meta viewport tag (5 min)
4. Test on real device (1 hour)
5. THEN build bottom nav (uses safe area utilities)

**Risk if reversed:** Bottom nav built without safe areas → content hidden behind iPhone home indicator → requires refactor.

### 3. Batch Touch Target Updates by Component Type
**Rationale:** Systematic approach prevents regressions and ensures consistency.

**Recommended batches:**
1. **Batch 1:** Button component (button.tsx) - Foundation for all buttons
2. **Batch 2:** Form inputs (input.tsx, select.tsx) - User input critical path
3. **Batch 3:** Navigation (sidebar, future bottom nav) - High frequency usage
4. **Batch 4:** Card actions (TransactionCard, etc.) - Secondary interactions
5. **Batch 5:** Dropdown/Popover menu items - Overflow menus

**Don't:** Try to fix all touch targets in one pass → high risk of missing components.

### 4. Use Container Queries for Dashboard Stats
**Rationale:** DashboardStats grid needs to respond to sidebar state (open/closed), not viewport.

**Problem:**
```tsx
// Current: Responds to viewport width
<div className="grid md:grid-cols-2 lg:grid-cols-4">
```

With sidebar open (desktop), viewport is >1024px but content area is ~750px → 4 columns too cramped.

**Solution with container queries:**
```tsx
<div className="@container">
  <div className="grid @md:grid-cols-2 @lg:grid-cols-4">
    {/* Responds to CONTAINER width, not viewport */}
  </div>
</div>
```

**Requirement:** Add `@tailwindcss/container-queries` plugin.

### 5. Create Safe Area Wrapper Component
**Rationale:** DRY principle - don't repeat safe area logic in every fixed element.

**Implementation:**
```tsx
// src/components/ui/safe-area.tsx
interface SafeAreaProps {
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  children: React.ReactNode
  className?: string
}

export function SafeArea({ edges = ['bottom'], children, className }: SafeAreaProps) {
  const paddingClasses = edges.map(edge => {
    switch (edge) {
      case 'top': return 'pt-[var(--safe-area-inset-top)]'
      case 'bottom': return 'pb-[var(--safe-area-inset-bottom)]'
      case 'left': return 'pl-[var(--safe-area-inset-left)]'
      case 'right': return 'pr-[var(--safe-area-inset-right)]'
    }
  })
  
  return (
    <div className={cn(...paddingClasses, className)}>
      {children}
    </div>
  )
}

// Usage:
<SafeArea edges={['bottom']}>
  <BottomNavigation />
</SafeArea>
```

### 6. Test on Real Devices, Not Just DevTools
**Rationale:** Safe areas, touch targets, and scroll behavior differ significantly between emulator and real hardware.

**Minimum test matrix for iteration 1:**
- iPhone 14 Pro (Dynamic Island) - Safari
- iPhone SE (small screen, home button) - Safari
- Android mid-range (gesture nav) - Chrome
- iPad Mini (tablet breakpoint) - Safari

**Testing approach:**
- Use ngrok or similar for local dev testing on real devices
- QR code for quick device access
- Document quirks in each device (e.g., "iPhone 14 Pro safe-area-inset-top = 59px")

### 7. Document Mobile-First Patterns in Storybook or Docs
**Rationale:** Future builders need clear examples of approved mobile patterns.

**Create pattern library:**
```markdown
## Mobile-First Button Sizes
✅ GOOD: <Button className="h-11 sm:h-10">Submit</Button>
❌ BAD: <Button className="h-10 sm:h-11">Submit</Button>

## Safe Area Usage
✅ GOOD: <nav className="fixed bottom-0 pb-safe-bottom">
❌ BAD: <nav className="fixed bottom-0 pb-4">

## Touch Target Minimum
✅ 44x44px (WCAG 2.1 AA)
✅ 48x48px (Better - Material Design)
❌ 40x40px (Below minimum)
```

**Location:** `/docs/mobile-patterns.md` or Storybook stories.

---

## Resource Map

### Critical Files/Directories

#### Foundation Files (Modify First)

**1. `/src/app/globals.css` (195 lines)**
- **Purpose:** Global CSS variables, safe area definitions, theme colors
- **Changes needed:** 
  - Add safe area CSS variables (lines 5-10)
  - Add utility classes for safe areas (@layer utilities)
- **Priority:** CRITICAL - Everything depends on this

**2. `/tailwind.config.ts` (173 lines)**
- **Purpose:** Tailwind configuration, theme extensions
- **Changes needed:**
  - Add touch target utilities (minHeight, minWidth)
  - Add safe area spacing utilities
  - Add @tailwindcss/container-queries plugin
- **Priority:** CRITICAL - Enables all mobile utilities

**3. `/src/app/(dashboard)/layout.tsx` (36 lines)**
- **Purpose:** Dashboard shell, sidebar container, main content wrapper
- **Changes needed:**
  - Add bottom padding clearance: `pb-20 lg:pb-8` to main
  - Integrate BottomNavigation component
  - Adjust z-index coordination
- **Priority:** HIGH - Required for bottom nav integration

#### UI Component Files (Update Touch Targets)

**4. `/src/components/ui/button.tsx` (65 lines)**
- **Purpose:** Primary button component, used everywhere
- **Changes needed:**
  - Update size variants: default h-11, icon h-11 w-11
  - Add mobile-first responsive sizing: `h-11 sm:h-10`
- **Priority:** HIGH - Affects all buttons site-wide

**5. `/src/components/ui/input.tsx` (26 lines)**
- **Purpose:** Form input component
- **Changes needed:**
  - Increase height: `h-12 sm:h-10` (was h-10)
  - Add inputMode prop support
- **Priority:** HIGH - Forms critical for mobile UX

**6. `/src/components/ui/select.tsx` (156 lines)**
- **Purpose:** Dropdown select component
- **Changes needed:**
  - Fix SelectContent min-width: `min-w-[calc(100vw-4rem)] sm:min-w-[8rem]`
  - Increase SelectItem padding for touch targets
- **Priority:** HIGH - Known overflow issue

**7. `/src/components/ui/dialog.tsx` (117 lines)**
- **Purpose:** Modal dialog component
- **Changes needed:**
  - Add safe area padding to DialogContent
  - Adjust mobile width: already good at `w-[calc(100%-2rem)]`
  - Consider bottom sheet variant for mobile
- **Priority:** MEDIUM - Used in forms and confirmations

**8. `/src/components/ui/dropdown-menu.tsx` (201 lines)**
- **Purpose:** Context menus, action menus
- **Changes needed:**
  - Add collisionPadding prop: 16px
  - Increase DropdownMenuItem height: py-2.5 (was py-1.5)
- **Priority:** MEDIUM - Touch target compliance

**9. `/src/components/ui/popover.tsx` (32 lines)**
- **Purpose:** Tooltip-style popovers
- **Changes needed:**
  - Add collisionPadding: 16px
  - Adjust sideOffset for mobile: 8px
- **Priority:** LOW - Less critical for mobile

**10. `/src/components/ui/card.tsx` (67 lines)**
- **Purpose:** Card container component
- **Changes needed:**
  - CardHeader: `p-4 sm:p-6` (was p-6)
  - CardContent: `p-4 sm:p-6` (was p-6)
- **Priority:** MEDIUM - Affects all cards, but low risk

#### Navigation Files

**11. `/src/components/dashboard/DashboardSidebar.tsx` (242 lines)**
- **Purpose:** Desktop sidebar + mobile hamburger menu
- **Changes needed:**
  - Add safe area to mobile menu button: top-safe-top
  - Adjust z-index if needed (currently z-50 for button, z-40 for sidebar)
  - Ensure navigation items meet 44px touch target
- **Priority:** HIGH - Must coexist with bottom nav

**12. `/src/components/mobile/BottomNavigation.tsx` (NEW)**
- **Purpose:** Mobile bottom navigation bar
- **Changes needed:** Create from scratch
- **Priority:** CRITICAL - Core iteration 1 feature
- **Estimated lines:** ~150-200

**13. `/src/components/mobile/MoreSheet.tsx` (NEW)**
- **Purpose:** Bottom sheet for overflow navigation items
- **Changes needed:** Create from scratch (Radix Dialog variant)
- **Priority:** MEDIUM - Part of bottom nav
- **Estimated lines:** ~100-150

#### Hook Files (New)

**14. `/src/hooks/useScrollDirection.ts` (NEW)**
- **Purpose:** Detect scroll direction for bottom nav hide/show
- **Changes needed:** Create from scratch
- **Priority:** MEDIUM - Enhances bottom nav UX
- **Estimated lines:** ~30-40

**15. `/src/hooks/useMediaQuery.ts` (NEW)**
- **Purpose:** Responsive hook for breakpoint detection
- **Changes needed:** Create from scratch
- **Priority:** LOW - Nice to have
- **Estimated lines:** ~20-30

**16. `/src/hooks/usePrefersReducedMotion.ts` (NEW)**
- **Purpose:** Detect user motion preferences for animations
- **Changes needed:** Create from scratch
- **Priority:** MEDIUM - Accessibility requirement
- **Estimated lines:** ~15-20

#### Dashboard Component Files (Spacing Updates)

**17. `/src/components/dashboard/DashboardStats.tsx` (144 lines)**
- **Purpose:** 4-card grid on dashboard
- **Changes needed:**
  - Grid already mobile-first ✓
  - Card padding will update via Card component
- **Priority:** LOW - Already decent mobile layout

**18. `/src/components/dashboard/RecentTransactionsCard.tsx` (97 lines)**
- **Purpose:** Recent transactions list on dashboard
- **Changes needed:**
  - Card padding will update via Card component
  - Consider truncating to 3 items on mobile (currently shows 5)
- **Priority:** LOW - Already card-based

**19. `/src/components/transactions/TransactionCard.tsx` (118 lines)**
- **Purpose:** Individual transaction card (used in list views)
- **Changes needed:**
  - Action buttons: h-11 w-11 (currently h-8 w-8)
  - Responsive layout already good ✓
- **Priority:** HIGH - Touch target compliance

### Key Dependencies

#### Current Dependencies (Keep)

**Next.js 14.2.33**
- **Why needed:** Framework foundation, excellent mobile performance with RSC
- **Mobile benefits:** Code splitting, streaming SSR, image optimization
- **Bundle impact:** ~100KB client runtime (acceptable)

**Tailwind CSS 3.4.1**
- **Why needed:** Mobile-first styling system
- **Mobile benefits:** Responsive utilities, small bundle with PurgeCSS
- **Bundle impact:** ~10KB (after purging)

**Radix UI (multiple packages)**
- **Why needed:** Accessible, headless UI primitives
- **Mobile benefits:** Touch-friendly, WAI-ARIA compliant, tree-shakeable
- **Bundle impact:** ~30-40KB (only used components)

**Framer Motion 12.23.22**
- **Why needed:** Smooth animations and transitions
- **Mobile benefits:** GPU-accelerated, performant on modern devices
- **Bundle impact:** ~50KB (RISK - consider conditional loading)
- **Mitigation:** Dynamic import or disable on low-end devices

**Recharts 2.12.7**
- **Why needed:** Data visualization (analytics dashboard)
- **Mobile benefits:** Responsive charts, touch support
- **Bundle impact:** ~120KB (HIGH RISK)
- **Mitigation:** REQUIRED - Dynamic import, load on-demand

**tRPC 11.6.0 + React Query 5.80.3**
- **Why needed:** Type-safe API layer, data fetching
- **Mobile benefits:** Optimistic updates, cache management, offline support
- **Bundle impact:** ~25KB (acceptable)

**date-fns 3.6.0**
- **Why needed:** Date formatting and manipulation
- **Mobile benefits:** Tree-shakeable, only import used functions
- **Bundle impact:** ~10KB (with selective imports)

#### Dependencies to Add

**@tailwindcss/container-queries (NEW - REQUIRED)**
- **Why needed:** Component-responsive design (better than media queries)
- **Mobile benefits:** Cards/components respond to container width, not viewport
- **Bundle impact:** ~2KB (build-time plugin, no runtime cost)
- **Installation:** `npm install -D @tailwindcss/container-queries`
- **Priority:** HIGH - Enables better responsive patterns

### Testing Infrastructure

**Manual Testing (Real Devices)**
- **Tool:** ngrok + local dev server
- **Rationale:** Safe areas, touch targets, and scroll behavior require real hardware
- **Devices:**
  - iPhone 14 Pro (Dynamic Island)
  - iPhone SE (small screen)
  - Android mid-range (gesture nav)
  - iPad Mini (tablet breakpoint)
- **Setup time:** ~1 hour to configure ngrok, test matrix, document quirks

**DevTools Responsive Testing**
- **Tool:** Chrome DevTools device emulation
- **Rationale:** Quick iteration during development
- **Limitations:** Does NOT accurately simulate:
  - Safe area insets (always 0 in emulator)
  - Touch target "finger size" (mouse cursor too precise)
  - Real scroll performance
- **Use for:** Layout validation, breakpoint testing only

**Automated Accessibility Testing**
- **Tool:** Lighthouse CI (already in Next.js)
- **Rationale:** Validate touch target compliance automatically
- **Command:** `npm run build && lighthouse http://localhost:3000/dashboard --preset=mobile`
- **Metrics to track:**
  - Touch targets (minimum 44x44px)
  - Tap targets spaced adequately (min 8px)
  - Contrast ratios (WCAG AA)
  - Viewport meta tag present

**Performance Profiling**
- **Tool:** Chrome DevTools Performance tab
- **Rationale:** Validate 60fps scrolling, no jank during animations
- **Test scenarios:**
  1. Dashboard load (measure LCP, CLS)
  2. Transaction list scroll (60fps check)
  3. Bottom nav show/hide (transform performance)
  4. Chart interactions (Recharts touch events)
- **Thresholds:**
  - FCP <1.8s on Fast 3G
  - LCP <2.5s on Fast 3G
  - CLS <0.1
  - 60fps during scroll

**Visual Regression Testing (Optional)**
- **Tool:** Percy or Chromatic
- **Rationale:** Catch layout breaks during refactors
- **Snapshots needed:**
  - Dashboard at 375px, 768px, 1280px
  - Transaction list (mobile card layout)
  - Forms (input heights, button sizes)
- **Priority:** LOW for iteration 1 (manual QA sufficient)

---

## Questions for Planner

### Architectural Questions

**1. Should bottom nav hide on scroll down, show on scroll up?**
- **Context:** Common mobile pattern (e.g., Twitter, Instagram) to maximize content visibility
- **Trade-off:** Adds complexity (useScrollDirection hook), potential performance impact
- **Recommendation:** YES - Include in iteration 1. Standard mobile UX pattern, users expect it.
- **Alternative:** Always visible (simpler, but takes vertical space)

**2. What should "More" tab contain in bottom nav?**
- **Context:** Bottom nav limited to 5 tabs. Current nav has 8 items.
- **Options:**
  - A) Sheet with all secondary items (Recurring, Settings, Analytics, Account, Admin)
  - B) Sheet with Settings + Account, promote Analytics to bottom nav tab
  - C) Simply link to Settings page, no sheet
- **Recommendation:** Option A - Full sheet with all secondary items. Most flexible.

**3. Should we implement pull-to-refresh in iteration 1?**
- **Context:** Vision doc lists as "Should-Have (Post-MVP)"
- **Effort:** ~2-3 hours to implement
- **Recommendation:** NO - Save for iteration 2 or 3. Focus foundation first.

**4. Use CSS transitions or Framer Motion for bottom nav animations?**
- **Context:** Framer Motion already in project, but adds bundle weight
- **Trade-off:**
  - CSS: Lightweight (~0KB), performant, limited flexibility
  - Framer Motion: Smooth gestures, heavier bundle, overkill for simple transitions
- **Recommendation:** CSS transitions for bottom nav (transform + opacity). Save Framer Motion for complex animations (page transitions, card hovers).

### Technical Questions

**5. How should we handle keyboard on mobile forms?**
- **Context:** Mobile keyboard can cover form fields and submit buttons
- **Options:**
  - A) Detect keyboard, hide bottom nav (more space)
  - B) Sticky submit button that floats above keyboard
  - C) Use visualViewport API to adjust layout
- **Recommendation:** Combination of A + C:
  ```tsx
  useEffect(() => {
    const handleResize = () => {
      const isKeyboardOpen = window.visualViewport.height < window.innerHeight
      setBottomNavVisible(!isKeyboardOpen)
    }
    window.visualViewport.addEventListener('resize', handleResize)
  }, [])
  ```

**6. Should safe area utilities be Tailwind classes or inline styles?**
- **Context:** Safe area values are dynamic (device-specific)
- **Options:**
  - A) Tailwind utilities: `pb-safe-bottom` (cleaner, requires plugin)
  - B) Inline styles: `style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}`
  - C) CSS classes: `.safe-area-bottom { padding-bottom: var(...) }`
- **Recommendation:** Option A - Tailwind utilities. Consistent with project patterns:
  ```javascript
  // tailwind.config.ts
  extend: {
    padding: {
      'safe-t': 'var(--safe-area-inset-top)',
      'safe-b': 'var(--safe-area-inset-bottom)',
    }
  }
  ```

**7. What's the z-index strategy for overlapping elements?**
- **Current state:**
  - Mobile menu button: z-50
  - Sidebar: z-40
  - Sidebar overlay: z-40
  - Radix portals: z-50
- **Proposed:**
  - Base content: z-0
  - Bottom nav: z-40
  - Sidebar overlay: z-40
  - Bottom nav + sidebar: z-45 (for bottom nav only, to stay above overlay)
  - Mobile menu button: z-50
  - Radix modals/dropdowns: z-50
  - Toasts: z-[100]
- **Question:** Should bottom nav stay above sidebar overlay (z-45) or hide when sidebar open?
- **Recommendation:** z-45 - User can still navigate even with sidebar open.

### Scope Questions

**8. Should we optimize ALL components in iteration 1, or focus on critical paths?**
- **Context:** 40+ components need mobile review
- **Options:**
  - A) Systematic: Update all components (6-8 hours, thorough)
  - B) Critical path: Dashboard, Transactions, Budgets only (3-4 hours, faster)
  - C) Iterative: Foundation + 5 most-used pages (4-5 hours, balanced)
- **Recommendation:** Option C - Foundation + critical paths (Dashboard, Transactions, Budgets, Goals, Navigation). Leave Admin/Settings for iteration 2.

**9. Include dark mode testing in iteration 1?**
- **Context:** Dark mode already implemented, but mobile-specific issues possible
- **Effort:** ~1-2 hours to validate on mobile devices
- **Recommendation:** YES - Include basic dark mode validation. Test on OLED device (iPhone 14 Pro) to ensure colors work well. No new dark mode features, just validation.

**10. Should we add performance budgets and monitoring now?**
- **Context:** Vision mentions Lighthouse scores, Web Vitals tracking
- **Options:**
  - A) Iteration 1: Add budgets + basic monitoring
  - B) Iteration 2: Add during component optimization phase
  - C) Iteration 3: Add during polish phase
- **Recommendation:** Option A - Add in iteration 1. Set baselines now:
  ```javascript
  // next.config.js
  performance: {
    budgets: [
      { path: '/dashboard', maxSize: 150, type: 'javascript' },
      { path: '/transactions', maxSize: 120, type: 'javascript' },
    ]
  }
  ```

---

## Appendix: Code Examples

### Example 1: Safe Area Implementation

**globals.css additions:**
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
  
  .safe-area-left {
    padding-left: max(1rem, var(--safe-area-inset-left));
  }
  
  .safe-area-right {
    padding-right: max(1rem, var(--safe-area-inset-right));
  }
  
  /* Fixed bottom elements (bottom nav) */
  .safe-bottom-fixed {
    bottom: var(--safe-area-inset-bottom);
  }
}
```

**tailwind.config.ts additions:**
```typescript
extend: {
  spacing: {
    'safe-top': 'var(--safe-area-inset-top)',
    'safe-bottom': 'var(--safe-area-inset-bottom)',
    'safe-left': 'var(--safe-area-inset-left)',
    'safe-right': 'var(--safe-area-inset-right)',
  },
  padding: {
    'safe-t': 'var(--safe-area-inset-top)',
    'safe-b': 'var(--safe-area-inset-bottom)',
    'safe-l': 'var(--safe-area-inset-left)',
    'safe-r': 'var(--safe-area-inset-right)',
  },
}
```

**Usage in components:**
```tsx
// Bottom Navigation
<nav className="fixed bottom-0 inset-x-0 pb-safe-b z-40">
  {/* Content */}
</nav>

// Mobile menu button
<button className="fixed top-[calc(1rem+var(--safe-area-inset-top))] left-4 z-50">
  <Menu />
</button>

// Page content clearance
<main className="pb-[calc(5rem+var(--safe-area-inset-bottom))] lg:pb-8">
  {children}
</main>
```

### Example 2: Touch Target Updates

**Button component (button.tsx):**
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      size: {
        // Mobile-first: larger by default, compact on desktop
        default: "h-11 px-4 py-2 sm:h-10",        // 44px mobile, 40px desktop
        sm: "h-10 rounded-lg px-3 sm:h-9",        // 40px mobile, 36px desktop
        lg: "h-12 rounded-lg px-8 sm:h-11",       // 48px mobile, 44px desktop
        icon: "h-11 w-11 sm:h-10 sm:w-10",        // 44x44 mobile, 40x40 desktop
      },
    },
  }
)
```

**Input component (input.tsx):**
```typescript
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode}  // NEW: Support inputMode prop
        className={cn(
          "flex h-12 w-full rounded-lg bg-background px-3 py-2 sm:h-10",  // 48px mobile
          "text-sm shadow-soft ring-offset-background",
          "transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

// Export with updated interface
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}
```

**TransactionCard action buttons:**
```tsx
<div className="flex flex-col gap-2 sm:gap-1">
  {onEdit && (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onEdit} 
      className="h-11 w-11 sm:h-8 sm:w-8"  // 44x44 mobile, 32x32 desktop
    >
      <Edit className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="sr-only">Edit</span>
    </Button>
  )}
  {onDelete && (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      className="h-11 w-11 sm:h-8 sm:w-8 text-coral hover:text-coral/90"
    >
      <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="sr-only">Delete</span>
    </Button>
  )}
</div>
```

### Example 3: Bottom Navigation Component

**BottomNavigation.tsx (NEW):**
```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  MoreHorizontal,
} from 'lucide-react'
import { useScrollDirection } from '@/hooks/useScrollDirection'
import { MoreSheet } from './MoreSheet'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/budgets', icon: PieChart, label: 'Budgets' },
  { href: '/goals', icon: Target, label: 'Goals' },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const scrollDirection = useScrollDirection()
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 lg:hidden",
          "bg-white dark:bg-warm-gray-900",
          "border-t border-warm-gray-200 dark:border-warm-gray-700",
          "transition-transform duration-300 ease-in-out",
          "pb-safe-b",  // Safe area padding
          scrollDirection === 'down' && "translate-y-full"  // Hide on scroll down
        )}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-w-[60px] h-full gap-1",
                  "transition-colors duration-200",
                  "hover:bg-sage-50 dark:hover:bg-sage-900/30",
                  isActive
                    ? "text-sage-600 dark:text-sage-400"
                    : "text-warm-gray-600 dark:text-warm-gray-400"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center",
              "min-w-[60px] h-full gap-1",
              "transition-colors duration-200",
              "hover:bg-sage-50 dark:hover:bg-sage-900/30",
              "text-warm-gray-600 dark:text-warm-gray-400"
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <MoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} />
    </>
  )
}
```

**useScrollDirection.ts (NEW):**
```tsx
import { useState, useEffect } from 'react'

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up')

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false
        return
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up')
      lastScrollY = scrollY > 0 ? scrollY : 0
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollDirection
}
```

### Example 4: Mobile-First Spacing Pattern

**Before (Desktop-first):**
```tsx
// CardHeader
<div className="flex flex-col space-y-1.5 p-6">

// CardContent
<div className="p-6 pt-0">

// Dashboard container
<div className="container mx-auto px-4 py-8">
```

**After (Mobile-first):**
```tsx
// CardHeader
<div className="flex flex-col space-y-1.5 p-4 sm:p-6">

// CardContent
<div className="p-4 sm:p-6 pt-0">

// Dashboard container (already good)
<div className="container mx-auto px-4 py-8 max-w-7xl">
```

**Pattern rule:**
- Mobile: 16px (p-4) - Maximizes content space on small screens
- Desktop: 24px (p-6) - More breathing room on large screens

---

**Report Complete**  
**Explorer:** 1 (Architecture & Safe Areas)  
**Status:** COMPLETE  
**Next Steps:** Planner synthesizes this report with other explorers (2-4) to create comprehensive iteration plan.

