# Explorer 2 Report: Bottom Navigation Architecture & Integration

## Executive Summary

The bottom navigation component represents a critical architectural shift from desktop-centric hamburger menu to mobile-first thumb-zone navigation. Analysis reveals a clean integration path leveraging existing Radix UI Dialog primitives for the "More" sheet, Framer Motion for animations, and Next.js App Router's native routing. Key findings: 9 navigation items require categorization (5 primary + 4 overflow), z-index coordination needed (z-40 for nav, z-50 for modals, z-100 for toasts), and scroll-hide behavior requires custom hook with threshold detection. The sidebar already has mobile hamburger support (lg:hidden pattern) which will coexist with bottom nav.

## Discoveries

### Current Navigation Structure

**Total Routes:** 27 pages across dashboard, auth, account, and settings groups

**Sidebar Navigation Items (9 items):**
1. Dashboard (`/dashboard`) - LayoutDashboard icon
2. Accounts (`/accounts`) - Wallet icon
3. Transactions (`/transactions`) - Receipt icon
4. Recurring (`/recurring`) - Calendar icon
5. Budgets (`/budgets`) - PieChart icon
6. Goals (`/goals`) - Target icon
7. Analytics (`/analytics`) - BarChart3 icon
8. Settings (`/settings`) - Settings icon
9. Admin (`/admin`) - Shield icon (conditional, ADMIN role only)

**Account Dropdown (from sidebar user section):**
- Account Overview (`/account`)
- Profile (`/account/profile`)
- Membership (`/account/membership`)
- Security (`/account/security`)
- Sign Out (auth action)

**Current Mobile Pattern:**
- Hamburger button: `fixed top-4 left-4 z-50` (lg:hidden)
- Sidebar: Slide-in from left with overlay (`-translate-x-full lg:translate-x-0`)
- Mobile overlay: `fixed inset-0 bg-black/50 z-40`
- Touch targets: Navigation links use `px-3 py-2` (approximately 40px height, **BELOW 44px minimum**)

### Existing Z-Index Hierarchy

**Current z-index usage:**
- Toast notifications: `z-[100]`
- Mobile hamburger button: `z-50`
- Sidebar (mobile): `z-40`
- Mobile overlay: `z-40`
- Radix Dialog overlay: `z-50` (from Dialog primitive)

**Identified gap:** Bottom nav needs z-40 to sit above main content but below modals

### Responsive Patterns in Codebase

**Mobile-first breakpoints (Tailwind config):**
- sm: 640px
- md: 768px
- lg: 1024px (primary desktop threshold)
- xl: 1280px
- 2xl: 1400px

**Common responsive patterns:**
```tsx
// Grid layouts
"grid gap-4 md:grid-cols-2 lg:grid-cols-4" // DashboardStats

// Visibility toggles
"lg:hidden" // Mobile-only
"hidden lg:block" // Desktop-only

// Flexbox adaptations
"flex flex-col sm:flex-row sm:items-center" // TransactionCard

// Spacing
"p-4 sm:p-6" // Mobile-first padding
"w-[calc(100%-2rem)] sm:w-full max-w-lg" // Dialog responsive width
```

### Animation Infrastructure

**Framer Motion already in use (v12.23.22):**
- Page transitions: `pageTransition`, `dashboardEntrance`
- Card hovers: `cardHoverSubtle`, `cardHoverElevated`
- Stagger animations: `staggerContainer`, `staggerItem`
- Modal animations: `modalAnimation`
- Reduced motion support: `getPageTransition(reducedMotion, duration)`

**Animation timing:**
```typescript
DURATION.fast = 0.15s      // Quick feedback
DURATION.normal = 0.3s     // Standard transitions
DURATION.slow = 0.5s       // Dashboard breath
```

**Accessibility:** Prefers-reduced-motion already handled in globals.css

### Integration Points

**Layout structure (dashboard layout.tsx):**
```tsx
<div className="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-950">
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

**Key observations:**
- Main content has `pt-16 lg:pt-8` for mobile hamburger clearance
- Will need `pb-20` for bottom nav clearance on mobile
- Container uses `px-4` padding (mobile-first)

## Patterns Identified

### Pattern 1: Bottom Navigation Component Structure

**Description:** Fixed bottom navigation bar with 5 tabs, scroll-aware visibility

**Component hierarchy:**
```tsx
<BottomNavigation>
  ├── <nav> (fixed bottom-0 w-full z-40)
  │   ├── Safe area wrapper (pb-[env(safe-area-inset-bottom)])
  │   ├── Navigation items container (flex justify-around)
  │   │   ├── <NavItem tab="dashboard" /> (Dashboard icon)
  │   │   ├── <NavItem tab="transactions" /> (Receipt icon)
  │   │   ├── <NavItem tab="budgets" /> (PieChart icon)
  │   │   ├── <NavItem tab="goals" /> (Target icon)
  │   │   └── <NavItem tab="more" onClick={openSheet} /> (Menu icon)
  │   └── Active indicator (motion.div for slide animation)
  └── <MoreSheet open={isOpen} onOpenChange={setIsOpen}>
      └── Overflow navigation items
```

**Props interface:**
```typescript
interface BottomNavigationProps {
  className?: string
  /** Hide nav on scroll down, show on scroll up */
  autoHide?: boolean
  /** Scroll threshold before hiding (default: 100px) */
  hideThreshold?: number
}

interface NavItemProps {
  tab: 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'more'
  active?: boolean
  onClick?: () => void
  href?: string
  badge?: number // Optional notification badge
}
```

**Use Case:** Thumb-zone navigation for mobile users (<768px screens)

**Example:**
```tsx
// In dashboard layout.tsx
<BottomNavigation 
  autoHide={true} 
  hideThreshold={80}
  className="lg:hidden"
/>
```

**Recommendation:** Use this pattern. Clean separation of concerns, accessibility-ready.

---

### Pattern 2: Scroll Direction Hook

**Description:** Custom hook to detect scroll direction for auto-hide behavior

**Implementation strategy:**
```typescript
interface UseScrollDirectionOptions {
  threshold?: number // Minimum scroll distance before direction change
  initialDirection?: 'up' | 'down'
}

interface UseScrollDirectionReturn {
  scrollDirection: 'up' | 'down'
  scrollY: number
  isAtTop: boolean
  isAtBottom: boolean
}

function useScrollDirection(options?: UseScrollDirectionOptions): UseScrollDirectionReturn
```

**Use Case:** 
- Hide bottom nav on scroll down (maximize content area)
- Show bottom nav on scroll up (user wants to navigate)
- Always show when at top of page (scrollY < threshold)

**Example:**
```typescript
const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 100 })
const showNav = scrollDirection === 'up' || isAtTop

return (
  <motion.nav
    animate={{ y: showNav ? 0 : 80 }}
    transition={{ duration: 0.3 }}
  />
)
```

**Edge cases to handle:**
1. **Top of page:** Always show nav (isAtTop = true)
2. **Bottom of page:** Show nav to prevent footer collision
3. **Rapid scroll:** Debounce to prevent jitter
4. **Scroll container:** Support custom ref (not just window scroll)
5. **iOS Safari bounce:** Detect overscroll and ignore

**Recommendation:** Implement with passive scroll listener for performance. Add cleanup on unmount.

---

### Pattern 3: More Sheet (Bottom Sheet)

**Description:** Slide-up sheet for overflow navigation items, built on Radix Dialog

**Architecture decision:**
- Use Radix Dialog (already installed) with custom positioning
- NOT installing new sheet package (@radix-ui/react-sheet doesn't exist)
- Style Dialog to slide from bottom with safe area handling

**Component structure:**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent 
    className="bottom-sheet"
    // Custom positioning: fixed bottom-0, slide up animation
  >
    <DialogHeader>
      <DialogTitle>More</DialogTitle>
    </DialogHeader>
    
    {/* Navigation items */}
    <div className="space-y-2">
      <MoreSheetItem href="/recurring" icon={Calendar}>
        Recurring Transactions
      </MoreSheetItem>
      <MoreSheetItem href="/analytics" icon={BarChart3}>
        Analytics
      </MoreSheetItem>
      <MoreSheetItem href="/accounts" icon={Wallet}>
        Accounts
      </MoreSheetItem>
      <MoreSheetItem href="/settings" icon={Settings}>
        Settings
      </MoreSheetItem>
      {isAdmin && (
        <MoreSheetItem href="/admin" icon={Shield}>
          Admin
        </MoreSheetItem>
      )}
    </div>
    
    {/* User account section at bottom */}
    <Separator />
    <div className="pt-4">
      <UserAccountMenu />
    </div>
  </DialogContent>
</Dialog>
```

**Styling (bottom sheet variant):**
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: auto;
  transform: translate(0, 0);
  max-height: 80vh;
  border-radius: 1rem 1rem 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Animation overrides */
.bottom-sheet[data-state='open'] {
  animation: slideInFromBottom 0.3s ease-out;
}

.bottom-sheet[data-state='closed'] {
  animation: slideOutToBottom 0.3s ease-in;
}
```

**Use Case:** Access secondary navigation items (Recurring, Analytics, Accounts, Settings, Admin)

**Recommendation:** Extend Dialog with bottom sheet styling. Add swipe-to-close gesture (Radix Dialog supports data-[swipe] attributes).

---

### Pattern 4: Responsive Rendering Strategy

**Description:** Conditional rendering based on screen size, not just CSS hiding

**Current pattern:**
```tsx
// Sidebar visible on desktop, hidden on mobile
<aside className={cn(
  "fixed lg:static inset-y-0 left-0 z-40",
  "lg:translate-x-0",
  mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
)} />

// Bottom nav: opposite pattern
<BottomNavigation className="lg:hidden" />
```

**Integration strategy for coexistence:**

1. **Mobile (<lg breakpoint):**
   - Hamburger button: Visible (top-left, z-50)
   - Sidebar: Slide-in overlay when triggered
   - Bottom nav: Visible (fixed bottom, z-40)
   - Main content padding: `pt-16` (hamburger clearance), `pb-20` (bottom nav clearance)

2. **Desktop (≥lg breakpoint):**
   - Hamburger button: Hidden (lg:hidden)
   - Sidebar: Static, always visible
   - Bottom nav: Hidden (lg:hidden)
   - Main content padding: `pt-8` (no hamburger), `pb-8` (no bottom nav)

**CSS approach:**
```tsx
<main className={cn(
  "flex-1 overflow-auto w-full lg:w-auto",
  // Mobile: top clearance for hamburger, bottom for nav
  "pt-16 pb-20",
  // Desktop: normal padding
  "lg:pt-8 lg:pb-8"
)}>
```

**Recommendation:** Use CSS hiding (`lg:hidden`) rather than conditional rendering to avoid hydration mismatches and maintain SSR compatibility.

## Complexity Assessment

### High Complexity Areas

#### 1. **Scroll-Hide Behavior** (HIGH)
**Why complex:**
- iOS Safari has rubber-band scrolling (overscroll bounce) that triggers false scroll events
- Need to distinguish intentional scroll vs bounce
- Must handle different scroll containers (window vs overflow containers)
- Throttling/debouncing required for performance
- Edge cases: rapid direction changes, programmatic scrolling, scroll restoration

**Estimated builder splits:** 1 sub-task for hook implementation

**Mitigation:**
```typescript
// Pseudo-code for iOS bounce detection
const isOverscroll = 
  (scrollY < 0) || // Scrolled above top
  (scrollY > document.documentElement.scrollHeight - window.innerHeight) // Below bottom

if (isOverscroll) {
  // Ignore this scroll event
  return
}
```

#### 2. **Z-Index Coordination** (HIGH)
**Why complex:**
- Must ensure bottom nav (z-40) sits below:
  - Modals/Dialogs (z-50)
  - Toasts (z-100)
  - Mobile hamburger button (z-50)
- But above:
  - Main content (z-auto/z-0)
  - Sidebar overlay (z-40) - **CONFLICT RISK**

**Current conflict:** Sidebar overlay and bottom nav both use z-40. Must resolve.

**Recommended hierarchy:**
```
z-100: Toasts (highest)
z-50:  Modals, Dialogs, Hamburger button
z-45:  Bottom navigation (NEW, between nav and modals)
z-40:  Sidebar mobile overlay
z-0:   Main content
```

**Estimated builder splits:** None if planned correctly, but requires testing with all modal types

#### 3. **Safe Area Integration** (MEDIUM-HIGH)
**Why complex:**
- Bottom nav must respect iPhone notch, Android gesture bar
- Safe area insets vary by device (0-34px on iPhone 14 Pro)
- Must work with existing safe area handling (none currently implemented)
- Dark mode considerations (safe area background color)

**Implementation:**
```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  /* Total height: 64px + safe-area-inset-bottom */
  height: calc(64px + env(safe-area-inset-bottom, 0px));
}

/* Main content clearance */
main {
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
}
```

**Testing required:**
- iPhone 14 Pro (Dynamic Island, bottom safe area ~34px)
- iPhone SE (no notch, minimal safe area ~0px)
- Android with gesture navigation (safe area ~24px)

**Estimated builder splits:** None, but requires real device testing

### Medium Complexity Areas

#### 1. **More Sheet Content & Behavior** (MEDIUM)
**Why medium complexity:**
- Need to adapt Dialog to bottom sheet pattern
- Custom animations (slide from bottom vs center zoom)
- Swipe-to-close gesture (nice-to-have)
- Must include user account menu (duplicate from sidebar)

**Challenges:**
- Radix Dialog defaults to center-screen with zoom animation
- Need to override with bottom positioning and slide animation
- Account menu in sidebar uses Dropdown; in More sheet should be inline

**Estimated builder splits:** None, straightforward Dialog customization

#### 2. **Navigation Item Categorization** (MEDIUM)
**Why medium complexity:**
- Must choose 5 items for bottom nav (limited real estate)
- Must be intuitive (user expectation alignment)
- Admin link conditional rendering
- Analytics usage patterns (is it primary or overflow?)

**Recommendation (based on common mobile finance app patterns):**

**Primary tabs (bottom nav - 5 items):**
1. **Dashboard** - Most frequent destination, home
2. **Transactions** - Primary action (view/add transactions)
3. **Budgets** - Key financial tracking feature
4. **Goals** - Motivational, frequently checked
5. **More** - Overflow for everything else

**Overflow (More sheet - 4-5 items):**
1. **Recurring** - Less frequent access
2. **Analytics** - Deeper analysis, less frequent
3. **Accounts** - Setup/management, infrequent
4. **Settings** - Infrequent access
5. **Admin** - Role-based, rare access

**Rationale:**
- Bottom nav = high-frequency, core value
- More sheet = configuration, analysis, admin

**Estimated builder splits:** None, design decision

#### 3. **Active State Indication** (MEDIUM)
**Why medium complexity:**
- Must detect active route for bottom nav highlighting
- Next.js usePathname() hook provides current path
- Must handle nested routes (e.g., `/transactions/[id]` should highlight Transactions tab)
- Visual design: color + icon fill + underline/indicator

**Implementation:**
```typescript
const pathname = usePathname()

const isActive = (tab: string) => {
  if (tab === 'dashboard') return pathname === '/dashboard'
  return pathname.startsWith(`/${tab}`)
}

const getTabColor = (tab: string) => 
  isActive(tab) 
    ? 'text-sage-600 dark:text-sage-400' 
    : 'text-warm-gray-500 dark:text-warm-gray-400'
```

**Visual design:**
```tsx
<NavItem active={isActive('dashboard')}>
  <LayoutDashboard 
    className={cn(
      "h-6 w-6",
      isActive('dashboard') && "fill-sage-600 dark:fill-sage-400"
    )}
  />
  <span className="text-xs font-medium">Dashboard</span>
  {/* Active indicator */}
  {isActive('dashboard') && (
    <motion.div
      layoutId="activeTab"
      className="absolute top-0 left-0 right-0 h-1 bg-sage-600 dark:bg-sage-400 rounded-b-full"
    />
  )}
</NavItem>
```

**Estimated builder splits:** None, standard pattern

### Low Complexity Areas

#### 1. **Icon Selection** (LOW)
**Icons already in use (Lucide React v0.460.0):**
- ✅ LayoutDashboard (Dashboard)
- ✅ Receipt (Transactions)
- ✅ PieChart (Budgets)
- ✅ Target (Goals)
- ✅ Menu or MoreHorizontal (More)
- ✅ Calendar (Recurring)
- ✅ BarChart3 (Analytics)
- ✅ Wallet (Accounts)
- ✅ Settings (Settings)
- ✅ Shield (Admin)

All icons already imported in DashboardSidebar.tsx. No new dependencies needed.

#### 2. **Touch Target Optimization** (LOW-MEDIUM)
**Current issue:** Sidebar nav links use `px-3 py-2` (~40px height, BELOW 44px minimum)

**Bottom nav requirements:**
- Minimum 44x44px touch target (WCAG 2.1 Level AA)
- Adequate spacing between tabs (minimum 8px)
- Visual hit area should match actual hit area

**Implementation:**
```tsx
<button className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1">
  <Icon className="h-6 w-6" />
  <span className="text-xs">Label</span>
</button>
```

**5 tabs across viewport:**
- 375px viewport ÷ 5 tabs = 75px per tab (adequate spacing ✅)
- Each tab: 60px width, 64px height (exceeds 44px minimum ✅)

**Estimated builder splits:** None, straightforward

## Technology Recommendations

### Primary Stack (Keep)

**Next.js 14 App Router:**
- ✅ Already in use, excellent foundation
- ✅ usePathname() for active state detection
- ✅ SSR-compatible (no window access issues)
- ✅ Link component for optimized navigation

**Radix UI Dialog:**
- ✅ Already installed (`@radix-ui/react-dialog ^1.1.15`)
- ✅ Accessibility built-in (focus trap, ARIA)
- ✅ Animation data attributes for styling
- ✅ Customizable to bottom sheet pattern
- ✅ Portal rendering (z-index control)

**Framer Motion:**
- ✅ Already in use (`framer-motion ^12.23.22`)
- ✅ Layout animations for active tab indicator (`layoutId`)
- ✅ Scroll-linked animations for auto-hide
- ✅ Reduced motion support already implemented
- ✅ Slide animations for bottom sheet

**Tailwind CSS:**
- ✅ Already configured with mobile-first breakpoints
- ✅ Custom utilities can be added for safe areas
- ✅ Dark mode support (class strategy)
- ✅ Responsive utilities (lg:hidden, sm:flex, etc.)

### Supporting Libraries (Add)

**None required!** All functionality achievable with existing stack.

**Rationale:**
- No need for `@radix-ui/react-sheet` (doesn't exist, Dialog works)
- No need for `react-use` or scroll hooks library (custom hook is simple)
- No need for safe area library (CSS env() variables)
- No need for gesture library (Radix Dialog has swipe support)

### CSS Additions (Required)

**Safe area CSS variables (globals.css):**
```css
@layer base {
  :root {
    /* Existing variables... */
    
    /* Safe area support */
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }
}

/* Bottom navigation safe area handling */
.bottom-nav {
  padding-bottom: var(--safe-area-bottom);
}
```

**Tailwind config additions:**
```typescript
// tailwind.config.ts
extend: {
  height: {
    'touch-target': '44px',
  },
  spacing: {
    'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
  },
  zIndex: {
    'bottom-nav': '45',
  },
}
```

**Animation keyframes for bottom sheet:**
```css
@keyframes slideInFromBottom {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideOutToBottom {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
```

## Integration Points

### Integration 1: Dashboard Layout Modification

**File:** `src/app/(dashboard)/layout.tsx`

**Changes required:**

1. **Import bottom navigation:**
```tsx
import { BottomNavigation } from '@/components/mobile/BottomNavigation'
```

2. **Add bottom nav to layout:**
```tsx
<div className="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-950">
  <OnboardingTrigger />
  <div className="flex">
    <DashboardSidebar user={user} />
    
    <main className="flex-1 overflow-auto w-full lg:w-auto">
      {/* Updated padding for bottom nav clearance */}
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-16 lg:pt-8 pb-24 lg:pb-8">
        {children}
      </div>
    </main>
  </div>
  
  {/* NEW: Bottom navigation (mobile only) */}
  <BottomNavigation className="lg:hidden" autoHide />
</div>
```

**Key changes:**
- Main container: `pb-24 lg:pb-8` (24 = 96px bottom nav clearance on mobile)
- Bottom nav: Placed outside flex container for fixed positioning
- `autoHide` prop enables scroll-aware visibility

**Risk:** Layout shift on mobile if bottom nav height calculation is wrong

---

### Integration 2: Sidebar Coexistence

**File:** `src/components/dashboard/DashboardSidebar.tsx`

**Changes required:** Minimal, sidebar already mobile-ready

**Current state:**
- Hamburger button: `z-50` ✅ (above bottom nav z-45)
- Sidebar overlay: `z-40` ✅ (below bottom nav z-45)
- Slide-in animation: Works independently ✅

**Potential enhancement:**
```tsx
// Close mobile sidebar when bottom nav item is tapped
// (Already implemented: onClick={() => setMobileMenuOpen(false)})
```

**No changes needed!** Sidebar and bottom nav operate independently:
- Sidebar: Triggered by hamburger (top-left)
- Bottom nav: Always visible at bottom
- User can use either navigation method

**Benefit:** Progressive enhancement - power users can use hamburger for full menu, casual users can use bottom nav for quick access

---

### Integration 3: More Sheet ↔ Account Dropdown

**Challenge:** Account dropdown (user menu) exists in sidebar. How to expose in More sheet?

**Solution 1 (Recommended):** Duplicate account menu in More sheet as inline list
```tsx
<MoreSheet>
  {/* Navigation items */}
  <MoreSheetItem href="/recurring">Recurring</MoreSheetItem>
  {/* ... */}
  
  <Separator className="my-4" />
  
  {/* Account section */}
  <div className="space-y-2">
    <MoreSheetItem href="/account">Account</MoreSheetItem>
    <MoreSheetItem href="/account/profile">Profile</MoreSheetItem>
    <MoreSheetItem href="/account/security">Security</MoreSheetItem>
    <button onClick={handleSignOut} className="...">
      Sign Out
    </button>
  </div>
</MoreSheet>
```

**Solution 2 (Alternative):** Link to full account page
```tsx
<MoreSheetItem href="/account" icon={User}>
  Account Settings
</MoreSheetItem>
```

**Recommendation:** Solution 1 for consistency with sidebar, but Solution 2 is simpler and reduces duplication

**Integration pattern:**
- Extract sign out logic to shared hook: `useSignOut()`
- Share user data via tRPC (already implemented)
- Consistent styling with sidebar items

---

### Integration 4: Z-Index Coordination with Modals

**Affected components:**
- Dialog/Modal overlays: z-50
- Alert dialogs: z-50
- Dropdown menus: z-50 (Radix default)
- Toasts: z-100
- Bottom nav: z-45 (NEW)

**Testing checklist:**
1. ✅ Open transaction form modal → bottom nav should be behind overlay
2. ✅ Open account dropdown → dropdown should overlay bottom nav
3. ✅ Trigger toast notification → toast should be above everything
4. ✅ Open More sheet → should overlay bottom nav itself
5. ✅ Open delete confirmation dialog → should overlay bottom nav

**CSS enforcement:**
```tsx
// BottomNavigation.tsx
<nav className={cn(
  "fixed bottom-0 left-0 right-0",
  "z-[45]", // Below modals (z-50), above content
  "lg:hidden"
)}>
```

**Risk mitigation:** Document z-index hierarchy in globals.css comments

---

### Integration 5: Scroll Container Identification

**Challenge:** useScrollDirection hook needs to know which element to attach scroll listener to

**Current scroll containers in app:**
1. **Main content area:** `<main className="flex-1 overflow-auto">`
2. **Sidebar (mobile):** `<aside>` (doesn't scroll, full height)
3. **Dialogs:** Each dialog can have internal scrolling

**Solution:** Attach scroll listener to main content area ref

**Implementation:**
```typescript
// useScrollDirection.ts
export function useScrollDirection(options?: {
  threshold?: number
  container?: RefObject<HTMLElement>
}) {
  const { threshold = 100, container } = options
  
  useEffect(() => {
    const element = container?.current || window
    // Attach listener to element
  }, [container, threshold])
}

// BottomNavigation.tsx usage
const mainRef = useRef<HTMLDivElement>(null)
const { scrollDirection } = useScrollDirection({ container: mainRef })

// In layout.tsx
<main ref={mainRef} className="flex-1 overflow-auto">
```

**Alternative (simpler):** Use window scroll listener
- Pro: No ref passing needed
- Con: Doesn't work if main has overflow-auto and window doesn't scroll
- **Verdict:** Check if main scrolls or window scrolls, then decide

**Testing:** Log scroll events to confirm which element fires them

## Risks & Challenges

### Technical Risks

#### RISK-1: iOS Safari Scroll Jank (Probability: 60%, Impact: HIGH)
**Description:** iOS Safari's momentum scrolling and rubber-band bounce can cause scroll position jumps, triggering false direction changes in useScrollDirection hook

**Symptoms:**
- Bottom nav flickers during scroll
- Nav hides when user scrolls to top (false "down" detection)
- Overscroll (pulling past top/bottom) triggers nav hide

**Mitigation:**
```typescript
// Detect and ignore overscroll
const isOverscroll = (scrollY: number, maxScroll: number) => {
  return scrollY < 0 || scrollY > maxScroll
}

// Add hysteresis (require sustained direction before changing)
const DIRECTION_CHANGE_THRESHOLD = 50 // px
let directionBuffer = 0

if (currentDirection !== previousDirection) {
  directionBuffer += Math.abs(currentScrollY - previousScrollY)
  if (directionBuffer > DIRECTION_CHANGE_THRESHOLD) {
    setDirection(currentDirection)
    directionBuffer = 0
  }
} else {
  directionBuffer = 0
}
```

**Testing plan:**
1. Test on real iPhone (not simulator)
2. Test rapid scroll up/down
3. Test overscroll at top and bottom
4. Test with smooth scroll vs touch scroll

---

#### RISK-2: Z-Index Conflicts with Radix Portals (Probability: 40%, Impact: MEDIUM)
**Description:** Radix UI components (Dropdown, Popover, Dialog) render in portals with auto-calculated z-index. Bottom nav might conflict.

**Symptoms:**
- Dropdown menu appears behind bottom nav
- Toast appears behind bottom nav
- Dialog overlay doesn't cover bottom nav

**Mitigation:**
```tsx
// Explicitly set portal container z-index
<DropdownMenuContent className="z-50">

// Bottom nav uses lower z-index
<nav className="z-[45]">

// Document z-index hierarchy in code comments
/**
 * Z-Index Hierarchy:
 * 100: Toasts (highest priority)
 * 50:  Modals, Dialogs, Dropdowns
 * 45:  Bottom Navigation
 * 40:  Sidebar overlay
 * 0:   Main content
 */
```

**Testing plan:**
1. Open every modal type with bottom nav visible
2. Verify visual stacking order
3. Check focus trap behavior (keyboard navigation)

---

#### RISK-3: Safe Area Inset Browser Support (Probability: 30%, Impact: MEDIUM)
**Description:** env(safe-area-inset-*) CSS variables only work in:
- iOS Safari 11.2+ (PWA mode or fullscreen)
- Chrome Android 69+ (PWA mode)
- Not supported: Desktop browsers, non-PWA mode

**Symptoms:**
- Bottom nav doesn't respect iPhone notch/home indicator
- Content hidden behind gesture bar on Android
- Fallback padding not applied

**Mitigation:**
```css
/* Provide fallback */
.bottom-nav {
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  /* Always at least 1rem padding, more if safe area exists */
}

/* Detect safe area support */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  }
}
```

**Testing plan:**
1. Test on iPhone 14 Pro (Dynamic Island)
2. Test on Android with gesture navigation
3. Test in browser (non-PWA) mode
4. Verify fallback padding applied

---

#### RISK-4: Animation Performance on Low-End Devices (Probability: 50%, Impact: MEDIUM)
**Description:** Framer Motion animations (layoutId, scroll-linked animations) can cause jank on budget Android devices

**Symptoms:**
- Choppy active tab indicator slide
- Laggy scroll-hide animation
- Frame drops during sheet opening

**Mitigation:**
```typescript
// Detect reduced motion preference
const prefersReducedMotion = useReducedMotion()

// Conditional animations
<motion.nav
  animate={{ y: showNav ? 0 : 80 }}
  transition={{ 
    duration: prefersReducedMotion ? 0 : 0.3,
    ease: 'easeOut'
  }}
/>

// Use CSS transforms (GPU-accelerated) instead of layout properties
// ✅ transform: translateY()
// ❌ top, bottom (causes reflow)
```

**Performance budget:**
- Target: 60fps (16.67ms per frame)
- Animation duration: 300ms max
- CSS will-change hints for transform properties

**Testing plan:**
1. Chrome DevTools Performance tab (6x CPU slowdown)
2. Test on real mid-range Android device
3. Monitor frame rate during animations

---

### Complexity Risks

#### RISK-5: Navigation Item Categorization User Confusion (Probability: 40%, Impact: MEDIUM)
**Description:** Users expect certain items in bottom nav based on other finance apps. Wrong categorization = poor UX.

**Risk factors:**
- Analytics: Core feature or power user feature?
- Accounts: Frequent access or one-time setup?
- Recurring: Important enough for bottom nav?

**Mitigation:**
1. **Research competitor apps:**
   - Mint: Dashboard, Transactions, Budgets, Goals, More
   - YNAB: Budget, Accounts, Reports, More
   - Personal Capital: Dashboard, Transactions, Accounts, Invest, More
   
2. **A/B test (post-MVP):** Track tap analytics on "More" sheet items
   - If Analytics gets >30% of More sheet taps → promote to bottom nav
   - If Goals gets <10% of bottom nav taps → demote to More sheet

3. **Make it configurable (future):** User preferences for bottom nav items

**Recommendation:** Start with proposed categorization (Dashboard, Transactions, Budgets, Goals, More), iterate based on usage data

---

#### RISK-6: Sheet vs Modal Confusion (Probability: 30%, Impact: LOW)
**Description:** More sheet uses Dialog primitive but styled as bottom sheet. Users might expect swipe-to-close, sheet might behave like modal.

**Symptoms:**
- User tries to swipe sheet down, doesn't close
- User taps outside sheet, confused by modal behavior
- Keyboard navigation (Tab, Esc) doesn't match expectations

**Mitigation:**
```tsx
// Enable swipe-to-close (Radix supports data-[swipe] attributes)
<DialogContent 
  className="bottom-sheet"
  onPointerDown={handleSwipeStart}
  onPointerMove={handleSwipeMove}
  onPointerUp={handleSwipeEnd}
>

// Or use Radix's built-in swipe behavior
<DialogPrimitive.Content
  {...swipeProps}
/>
```

**Alternative:** Keep tap-outside-to-close (default Dialog behavior) and skip swipe gesture (MVP)

**Testing plan:**
1. User testing: Can users intuitively close the sheet?
2. Compare to native iOS sheet behavior
3. Verify accessibility (keyboard close still works)

---

#### RISK-7: Keyboard Overlap on Forms (Probability: 70%, Impact: HIGH)
**Description:** Mobile keyboard opens, covers bottom nav AND submit button at bottom of form

**Symptoms:**
- User taps input field → keyboard opens → bottom nav hidden by keyboard
- Submit button also hidden behind keyboard
- User can't submit form without closing keyboard first

**Mitigation:**
```typescript
// Detect keyboard open (visual viewport API)
const [keyboardOpen, setKeyboardOpen] = useState(false)

useEffect(() => {
  if (typeof window === 'undefined') return
  
  const handleResize = () => {
    const visualViewport = window.visualViewport
    if (visualViewport) {
      // Keyboard open if visual viewport height < window height
      setKeyboardOpen(visualViewport.height < window.innerHeight)
    }
  }
  
  window.visualViewport?.addEventListener('resize', handleResize)
  return () => window.visualViewport?.removeEventListener('resize', handleResize)
}, [])

// Hide bottom nav when keyboard open
<BottomNavigation hidden={keyboardOpen} />
```

**Alternative:** Always show bottom nav, rely on native keyboard scroll behavior

**Testing plan:**
1. Test transaction form on mobile
2. Test budget form with multiple inputs
3. Verify submit button visible with keyboard open

## Recommendations for Planner

### 1. Z-Index Hierarchy: Update to z-45 for Bottom Nav

**Why:** Current z-40 conflicts with sidebar overlay. Bottom nav needs to be above overlay but below modals.

**Proposed hierarchy:**
- z-100: Toasts
- z-50: Modals, Dialogs, Dropdowns, Hamburger button
- z-45: **Bottom Navigation (NEW)**
- z-40: Sidebar overlay
- z-0: Main content

**Action:** 
- Update BottomNavigation to use `z-[45]`
- Document hierarchy in globals.css or component comments
- Test all modal interactions

---

### 2. Navigation Categorization: Start Conservative, Iterate

**Recommended primary tabs (bottom nav):**
1. Dashboard (home base)
2. Transactions (primary feature)
3. Budgets (core value)
4. Goals (motivation)
5. More (overflow)

**Overflow (More sheet):**
- Recurring Transactions
- Analytics
- Accounts
- Settings
- Admin (conditional)

**Rationale:** 
- Aligns with competitor apps (Mint, YNAB, Personal Capital)
- Puts most-accessed features in thumb zone
- Keeps bottom nav uncluttered (5 items max)

**Post-MVP:** Track tap analytics, consider making customizable

---

### 3. Scroll Hide Behavior: Implement with Threshold + Always Show at Top

**Implementation:**
```typescript
const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 80 })
const showNav = scrollDirection === 'up' || isAtTop

return (
  <motion.nav
    animate={{ y: showNav ? 0 : 80 }}
    transition={{ duration: 0.3 }}
    className="fixed bottom-0 left-0 right-0 z-[45]"
  />
)
```

**Threshold: 80px** (tested in many apps, feels natural)

**Always show at top:** Prevents nav from being hidden when user is at page start

**Skip MVP (optional):** Keyboard detection for hiding nav when keyboard open
- Complexity: Medium
- Impact: High on forms
- Recommendation: Add in iteration 2 if users report issues

---

### 4. Safe Area Handling: CSS-Only with Fallback

**Approach:**
```css
.bottom-nav {
  /* Fallback for non-PWA or unsupported browsers */
  padding-bottom: 1rem;
  
  /* Override if safe area supported */
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
}

/* Main content clearance */
main {
  padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
  /* 5rem = 80px bottom nav + 1rem buffer */
}
```

**No JavaScript needed!** CSS handles it gracefully.

**Testing requirement:**
- Real device testing on iPhone 14 Pro (Dynamic Island)
- Real device testing on Android with gesture nav
- Fallback verification in desktop browser

---

### 5. More Sheet: Extend Dialog, Skip Swipe Gesture for MVP

**Approach:**
- Use existing Radix Dialog
- Custom CSS for bottom positioning and slide-up animation
- Tap-outside-to-close (default Dialog behavior)
- Skip swipe-to-close gesture (can add post-MVP)

**Why:**
- Reduces complexity (no gesture detection library)
- Still feels native (slide-up animation + tap-outside)
- Radix Dialog handles accessibility (focus trap, ARIA, keyboard)

**Post-MVP enhancement:** Add swipe-to-close gesture using Radix's data-[swipe] attributes or touch event handlers

---

### 6. Touch Targets: Enforce 48x48px Minimum (Exceed WCAG)

**WCAG 2.1 Level AA:** 44x44px minimum
**Our target:** 48x48px (better for fat fingers)

**Bottom nav touch targets:**
```tsx
<button className="min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 px-2">
  <Icon className="h-6 w-6" />
  <span className="text-xs">Label</span>
</button>
```

**5 tabs across 375px viewport:**
- 375px ÷ 5 = 75px per tab
- 48px touch target + 8px spacing = 56px
- Fits comfortably ✅

**Also fix sidebar:** Update sidebar nav links from `py-2` (32px) to `py-3` (48px)

---

### 7. Performance Budget: Target 60fps, Conditional Animations

**Budget:**
- Animation duration: ≤300ms
- Target frame rate: 60fps (16.67ms/frame)
- Use CSS transforms (GPU-accelerated)
- Respect prefers-reduced-motion

**Implementation:**
```typescript
const prefersReducedMotion = useReducedMotion()

<motion.div
  animate={{ y: showNav ? 0 : 80 }}
  transition={{ 
    duration: prefersReducedMotion ? 0 : 0.3,
    ease: 'easeOut'
  }}
  style={{ 
    willChange: 'transform' // GPU acceleration hint
  }}
/>
```

**Testing:** Chrome DevTools Performance tab with 6x CPU slowdown

---

### 8. Builder Task Structure: 3 Logical Phases

**Phase 1: Foundation (2-3 hours)**
- Create `useScrollDirection` hook
- Add safe area CSS variables to globals.css
- Update Tailwind config (z-index, touch-target utilities)

**Phase 2: Bottom Navigation Component (3-4 hours)**
- Create BottomNavigation component
- Implement 5 nav items with active state
- Add scroll-hide behavior integration
- Style with safe area padding

**Phase 3: More Sheet & Integration (2-3 hours)**
- Create MoreSheet component (Dialog-based)
- Add overflow navigation items
- Integrate with layout.tsx
- Test z-index coordination with modals

**Total estimated time:** 7-10 hours

**Dependencies:**
- None! Can implement in parallel with other mobile features
- Does NOT block dashboard layout optimization
- Does NOT block form optimization

---

### 9. Testing Checklist: Real Device Required

**Critical tests:**
1. ✅ iPhone 14 Pro: Safe area handling, Dynamic Island
2. ✅ Android with gesture nav: Safe area bottom inset
3. ✅ Scroll behavior: Hide on down, show on up, always show at top
4. ✅ Z-index: Open all modal types, verify stacking
5. ✅ Touch targets: All items ≥48px, adequate spacing
6. ✅ Keyboard overlap: Test with transaction form
7. ✅ Dark mode: All states (active, inactive, hover)
8. ✅ Reduced motion: Verify animations disabled
9. ✅ Accessibility: Screen reader navigation, keyboard control
10. ✅ Orientation: Portrait and landscape

**Simulator testing insufficient for:** Safe areas, scroll physics, touch interaction feel

---

### 10. Documentation: Create Mobile Navigation Patterns Guide

**Recommendation:** Create `/docs/mobile-navigation-patterns.md` with:
- Bottom nav usage guidelines
- When to add items to bottom nav vs More sheet
- Z-index hierarchy reference
- Safe area handling patterns
- Scroll behavior customization

**Why:** Future developers need clear guidance on extending navigation

## Resource Map

### Critical Files/Directories

**New files to create:**
```
src/
├── components/
│   └── mobile/
│       ├── BottomNavigation.tsx      (Main component, 150-200 lines)
│       ├── MoreSheet.tsx              (Bottom sheet overlay, 100-150 lines)
│       └── NavItem.tsx                (Reusable nav item, 50-80 lines)
├── hooks/
│   └── useScrollDirection.ts          (Scroll detection hook, 80-120 lines)
└── lib/
    └── mobile-navigation.ts           (Navigation config, types, 50-80 lines)
```

**Files to modify:**
```
src/
├── app/
│   ├── globals.css                    (Add safe area variables, animations)
│   └── (dashboard)/
│       └── layout.tsx                 (Integrate bottom nav, update padding)
├── components/
│   └── dashboard/
│       └── DashboardSidebar.tsx       (Optional: increase touch targets)
└── tailwind.config.ts                 (Add utilities: z-bottom-nav, h-touch-target)
```

**Estimated line counts:**
- New code: ~400-550 lines
- Modified code: ~50-80 lines
- Total: ~450-630 lines

### Key Dependencies

**Already installed (no changes):**
- `@radix-ui/react-dialog` ^1.1.15 (for MoreSheet)
- `framer-motion` ^12.23.22 (for animations)
- `lucide-react` 0.460.0 (for icons)
- `next` ^14.2.33 (for routing, usePathname)

**No new dependencies required!**

### Testing Infrastructure

**Manual testing (required):**
- Real device testing (iPhone + Android)
- Multiple screen sizes (375px, 390px, 414px)
- Both orientations (portrait, landscape)
- Keyboard interaction
- Screen reader testing

**Automated testing (optional, post-MVP):**
- Jest + React Testing Library: Component unit tests
- Playwright: E2E navigation flow tests
- Chromatic: Visual regression testing

**Performance testing:**
- Chrome DevTools Performance profiling
- Lighthouse mobile audit (target: 90+ Performance)
- Frame rate monitoring during scroll

## Questions for Planner

### Q1: Keyboard Overlap Strategy

**Question:** When mobile keyboard opens and covers bottom nav + form submit button, should we:

**Option A (Simple):** Do nothing, rely on native scroll behavior
- Pro: Zero complexity
- Con: User might not realize form extends below keyboard

**Option B (Recommended):** Hide bottom nav when keyboard open
- Pro: Saves 64px+ of screen space for form
- Con: Requires visual viewport API detection (medium complexity)

**Option C (Advanced):** Reposition form submit button to appear above keyboard
- Pro: Best UX, submit always visible
- Con: High complexity, requires form-specific logic

**Recommendation:** Option B for MVP, consider Option C in iteration 2

---

### Q2: More Sheet Account Menu

**Question:** How should we handle account/profile actions in More sheet?

**Option A:** Duplicate sidebar account dropdown as inline items
```
More Sheet:
- Recurring Transactions
- Analytics
- Accounts
- Settings
- Admin
---
- Account Overview
- Profile
- Security
- Sign Out
```

**Option B:** Single "Account" item that links to `/account` page
```
More Sheet:
- Recurring Transactions
- Analytics
- Accounts
- Settings
- Admin
- Account Settings (→ /account)
```

**Option C:** Keep sidebar hamburger for account menu, exclude from More sheet
- Pro: No duplication
- Con: Two navigation patterns (bottom nav + hamburger)

**Recommendation:** Option B for simplicity, Option A for feature parity with desktop

---

### Q3: Analytics Placement

**Question:** Is Analytics a primary feature (bottom nav) or secondary (More sheet)?

**Current proposal:** More sheet (secondary)

**Rationale:**
- Most finance apps put Analytics/Reports in overflow menu
- Analytics is review/analysis, not primary action
- Dashboard provides summary metrics (Analytics is deeper dive)

**Alternative:** Promote to bottom nav if usage data shows high frequency

**Need decision:** Stick with More sheet or promote to bottom nav?

---

### Q4: Admin Navigation Visibility

**Question:** Admin link is role-conditional (ADMIN users only). How should this affect bottom nav?

**Current proposal:** Admin always in More sheet, never in primary nav

**Challenges:**
1. More sheet content changes based on role (5 items vs 4 items)
2. Non-admin users see shorter More sheet
3. Should Admin be at top or bottom of More sheet?

**Recommendation:**
- Admin at bottom of More sheet (separator before it)
- Clearly marked with Shield icon + "Admin" badge
- Only visible if `userData?.role === 'ADMIN'`

**Alternative:** Separate admin nav pattern (e.g., floating admin button) - defer to post-MVP

---

### Q5: Active State for More Sheet

**Question:** When More sheet is open, should "More" tab show active state?

**Option A:** Active while sheet is open
- Pro: Clear visual feedback that More is "active"
- Con: Sheet overlay covers bottom nav anyway

**Option B:** No active state for More (it's a trigger, not a destination)
- Pro: Simpler logic
- Con: Less feedback

**Recommendation:** Option A for consistency (More is a tab like others)

---

### Q6: Scroll Threshold Configuration

**Question:** Should scroll threshold (px before hide) be:

**Option A:** Fixed 80px (simple, tested default)
**Option B:** Configurable via prop (flexible, more complex)
**Option C:** Adaptive based on nav height (future-proof)

**Recommendation:** Option A for MVP (80px is industry standard)

**Post-MVP:** Consider making configurable if users report sensitivity issues

---

### Q7: Landscape Mode Behavior

**Question:** In landscape orientation, should bottom nav:

**Option A:** Stay at bottom (same as portrait)
**Option B:** Move to side (vertical tab bar)
**Option C:** Hide completely (more screen space)

**Current screens in landscape:**
- Phones: 667x375, 844x390 (width > height)
- Height is limited (375-414px)

**Recommendation:** Option A (stay at bottom) for consistency

**Rationale:**
- Vertical tabs in landscape are uncommon on mobile
- Hiding nav hurts discoverability
- Bottom nav still accessible with thumbs in landscape

**Testing required:** Verify bottom nav doesn't take too much vertical space in landscape

## Conclusion

Bottom navigation represents the cornerstone of mobile-first architecture for this app. The integration strategy is straightforward thanks to existing infrastructure (Radix Dialog, Framer Motion, Tailwind), but requires careful attention to scroll behavior, z-index coordination, and safe area handling.

**Key success factors:**
1. **Z-index discipline:** Enforce z-45 for bottom nav, document hierarchy
2. **Real device testing:** iOS Safari scroll quirks won't appear in simulators
3. **Progressive enhancement:** Bottom nav + hamburger coexist without conflict
4. **Touch target compliance:** 48x48px minimum, exceeding WCAG standards
5. **Performance budget:** 60fps animations, respect reduced motion

**Estimated builder effort:** 7-10 hours (straightforward implementation, no major blockers)

**Recommended split:** Single builder can complete in one session, no sub-tasks needed

**Critical dependencies:** None - can implement in parallel with other iteration tasks

This exploration provides all architectural decisions, code patterns, and risk mitigations needed for the planner to create a comprehensive bottom navigation task.
