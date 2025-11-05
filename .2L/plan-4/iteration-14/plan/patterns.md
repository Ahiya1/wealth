# Code Patterns & Conventions - Iteration 14

This is the MOST IMPORTANT file for builders. Every pattern includes full, working code examples you can copy and adapt.

---

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── globals.css              # Safe area CSS variables
│   │   └── (dashboard)/
│   │       └── layout.tsx           # Bottom nav integration
│   ├── components/
│   │   ├── mobile/                  # NEW: Mobile-specific components
│   │   │   ├── BottomNavigation.tsx
│   │   │   ├── MoreSheet.tsx
│   │   │   └── NavItem.tsx
│   │   ├── ui/                      # UI primitives (to be updated)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── card.tsx
│   │   └── dashboard/               # Dashboard components
│   ├── hooks/                       # NEW: Mobile hooks
│   │   ├── useScrollDirection.ts
│   │   ├── useMediaQuery.ts
│   │   └── usePrefersReducedMotion.ts
│   └── lib/
│       └── utils.ts                 # Existing cn() utility
└── tailwind.config.ts               # Extended with mobile utilities
```

---

## Naming Conventions

### Files
- Components: PascalCase (`BottomNavigation.tsx`)
- Utilities: camelCase (`formatCurrency.ts`)
- Hooks: camelCase with 'use' prefix (`useScrollDirection.ts`)
- Types: PascalCase (`BottomNavigationProps`)

### Functions
- React components: PascalCase (`BottomNavigation`)
- Utility functions: camelCase (`calculateTotal()`)
- Event handlers: camelCase with 'handle' prefix (`handleScroll`)
- Custom hooks: camelCase with 'use' prefix (`useScrollDirection`)

### Constants
- All caps snake case: `SCROLL_THRESHOLD = 80`
- Enums: PascalCase (`ScrollDirection`)

### CSS Classes
- Tailwind utilities: lowercase-dash (`pb-safe-b`, `min-h-touch-target`)
- Custom classes: lowercase-dash (`bottom-sheet`, `safe-area-bottom`)

---

## Safe Area Patterns

### Pattern 1: Safe Area CSS Variables

**When to use:** Every mobile app needs safe area support for iPhone notch, Android gesture bars

**globals.css additions:**
```css
@layer base {
  :root {
    /* Existing color variables... */

    /* NEW: Safe area insets (iPhone notch, Android gesture bar) */
    --safe-area-inset-top: env(safe-area-inset-top, 0px);
    --safe-area-inset-right: env(safe-area-inset-right, 0px);
    --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-inset-left: env(safe-area-inset-left, 0px);
  }
}

/* Utility classes for safe areas */
@layer utilities {
  /* Top safe area (for headers, fixed top elements) */
  .safe-area-top {
    padding-top: max(1rem, var(--safe-area-inset-top));
  }

  /* Bottom safe area (for bottom nav, fixed bottom elements) */
  .safe-area-bottom {
    padding-bottom: max(1rem, var(--safe-area-inset-bottom));
  }

  /* Left safe area (for landscape sidebars) */
  .safe-area-left {
    padding-left: max(1rem, var(--safe-area-inset-left));
  }

  /* Right safe area (for landscape drawers) */
  .safe-area-right {
    padding-right: max(1rem, var(--safe-area-inset-right));
  }

  /* Fixed bottom positioning with safe area */
  .safe-bottom-fixed {
    bottom: var(--safe-area-inset-bottom);
  }

  /* Fixed top positioning with safe area */
  .safe-top-fixed {
    top: var(--safe-area-inset-top);
  }
}
```

**Tailwind config additions:**
```typescript
// tailwind.config.ts
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

**Key points:**
- Use `max()` for fallback padding (always at least 1rem, more if safe area exists)
- Variables are 0px on desktop, >0px on mobile with notch/gesture bar
- iPhone 14 Pro: top ~59px, bottom ~34px
- Android gesture nav: bottom ~24px

### Pattern 2: Bottom Navigation with Safe Area

**When to use:** Fixed bottom navigation bar

**Full component example:**
```tsx
// src/components/mobile/BottomNavigation.tsx
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

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/budgets', icon: PieChart, label: 'Budgets' },
  { href: '/goals', icon: Target, label: 'Goals' },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-[45] lg:hidden",
        "bg-white dark:bg-warm-gray-900",
        "border-t border-warm-gray-200 dark:border-warm-gray-700",
        "pb-safe-b", // Safe area padding for iPhone/Android
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
                "min-w-[60px] min-h-[48px] gap-1 px-2", // 48px touch target
                "transition-colors duration-200",
                "hover:bg-sage-50 dark:hover:bg-sage-900/30",
                isActive
                  ? "text-sage-600 dark:text-sage-400"
                  : "text-warm-gray-600 dark:text-warm-gray-400"
              )}
            >
              <Icon className={cn(
                "h-6 w-6",
                isActive && "fill-current" // Solid icon when active
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* More button (opens sheet) */}
        <button
          className={cn(
            "flex flex-col items-center justify-center",
            "min-w-[60px] min-h-[48px] gap-1 px-2",
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
  )
}
```

**Key points:**
- `z-[45]` - Above content (z-0), below modals (z-50)
- `lg:hidden` - Only show on mobile (<1024px)
- `pb-safe-b` - Safe area padding for iPhone/Android
- `min-h-[48px]` - Touch target compliance (WCAG requires 44px, we use 48px)
- `pathname.startsWith()` - Matches nested routes (e.g., /transactions/123)

### Pattern 3: Main Content Clearance

**When to use:** Layout container that needs space for bottom nav

**Full example:**
```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-950">
      <OnboardingTrigger />
      <div className="flex">
        <DashboardSidebar user={user} />

        {/* Main content area */}
        <main className="flex-1 overflow-auto w-full lg:w-auto">
          <div className={cn(
            "container mx-auto px-4 py-8 max-w-7xl",
            "pt-16 lg:pt-8", // Top padding for mobile hamburger
            "pb-24 lg:pb-8", // Bottom padding for bottom nav (80px nav + 16px buffer)
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation (mobile only) */}
      <BottomNavigation />
    </div>
  )
}
```

**Calculation:**
- Bottom nav height: 64px (h-16)
- Safe area: 0-34px (device-specific)
- Buffer: 16px
- Total: `pb-24` (96px) on mobile, `pb-8` (32px) on desktop

**Key points:**
- Bottom nav placed OUTSIDE flex container (for fixed positioning)
- Main content has bottom padding clearance
- Responsive padding: `pb-24 lg:pb-8`

---

## Touch Target Patterns

### Pattern 4: Button Touch Target Compliance

**When to use:** All buttons, links, interactive elements

**Updated button.tsx:**
```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_12px_hsl(var(--sage-600)_/_0.2)]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:scale-100",
        destructive: "bg-terracotta-500 text-white hover:bg-terracotta-600",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        // UPDATED: Mobile-first touch targets
        default: "h-11 px-4 py-2 sm:h-10",        // 44px mobile, 40px desktop
        sm: "h-10 rounded-lg px-3 sm:h-9",        // 40px mobile, 36px desktop
        lg: "h-12 rounded-lg px-8 sm:h-11",       // 48px mobile, 44px desktop
        icon: "h-11 w-11 sm:h-10 sm:w-10",        // 44x44 mobile, 40x40 desktop
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

**WCAG Compliance:**
- Level A: 24x24px (too small)
- Level AA: 44x44px (our minimum)
- Level AAA: 48x48px (preferred)
- Material Design: 48x48px

**Key points:**
- Mobile-first sizing: larger by default, smaller on desktop (sm: breakpoint)
- `h-11` = 44px (meets WCAG AA)
- `h-12` = 48px (exceeds WCAG AA, preferred)
- Icon buttons need both width AND height specified

### Pattern 5: Input Touch Target

**When to use:** All form inputs, selects, textareas

**Updated input.tsx:**
```typescript
// src/components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode}  // NEW: Triggers correct mobile keyboard
        className={cn(
          "flex h-12 w-full rounded-lg bg-background px-3 py-2 sm:h-10",  // 48px mobile, 40px desktop
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
Input.displayName = "Input"

export { Input }
```

**Usage for amount inputs:**
```tsx
<Input
  type="text"
  inputMode="decimal"  // Shows numeric keyboard with decimal
  placeholder="0.00"
/>
```

**inputMode options:**
- `decimal` - Numbers + decimal point (for amounts)
- `numeric` - Numbers only (for quantities)
- `tel` - Phone number keyboard
- `email` - Email keyboard with @
- `url` - URL keyboard with .com

**Key points:**
- `h-12` (48px) on mobile exceeds WCAG requirement
- `inputMode` triggers correct mobile keyboard
- No security impact (just changes keyboard, not validation)

### Pattern 6: Navigation Item Touch Target

**When to use:** Sidebar navigation, bottom nav, menu items

**Full example:**
```tsx
// Navigation item with 48px touch target
<Link
  href="/transactions"
  className={cn(
    "flex items-center gap-3",
    "px-3 py-3", // py-3 = 12px padding, 24px icon, 12px padding = 48px total
    "rounded-lg",
    "transition-colors duration-200",
    "hover:bg-sage-50 dark:hover:bg-sage-900/30",
    isActive
      ? "bg-sage-100 text-sage-900 dark:bg-sage-900 dark:text-sage-100"
      : "text-warm-gray-700 dark:text-warm-gray-300"
  )}
>
  <Receipt className="h-6 w-6" /> {/* 24px icon */}
  <span className="text-sm font-medium">Transactions</span>
</Link>
```

**Calculation:**
- Icon: 24px (h-6 w-6)
- Padding top: 12px (py-3)
- Padding bottom: 12px (py-3)
- Total: 48px ✅

**Key points:**
- Use `py-3` for navigation items (48px total height)
- Icon should be 24px (h-6 w-6)
- Spacing between items: minimum 8px (gap-2)

---

## Responsive Spacing Patterns

### Pattern 7: Mobile-First Card Padding

**When to use:** All Card components

**Updated card.tsx:**
```typescript
// src/components/ui/card.tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-warmth border bg-card text-card-foreground shadow-soft",
      className
    )}
    {...props}
  />
))

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      "p-4 sm:p-6", // UPDATED: 16px mobile, 24px desktop
      className
    )}
    {...props}
  />
))

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4 sm:p-6 pt-0", // UPDATED: 16px mobile, 24px desktop, no top padding
      className
    )}
    {...props}
  />
))
```

**Mobile-first spacing scale:**
- Mobile: `p-4` (16px) - Maximizes content space
- Desktop: `p-6` (24px) - More breathing room

**Key points:**
- Write mobile styles first (no prefix)
- Add desktop overrides with `sm:` prefix
- Consistent pattern across all cards

### Pattern 8: Grid Responsive Layout

**When to use:** Dashboard stats, card grids, any multi-column layout

**Full example:**
```tsx
// DashboardStats component
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
  className={cn(
    "grid gap-4",
    "grid-cols-1",           // 1 column on mobile (default)
    "sm:grid-cols-2",        // 2 columns on tablet (≥640px)
    "lg:grid-cols-4",        // 4 columns on desktop (≥1024px)
  )}
>
  {stats.map((stat, index) => (
    <motion.div key={stat.label} variants={staggerItem}>
      <StatCard {...stat} />
    </motion.div>
  ))}
</motion.div>
```

**Breakpoint strategy:**
- Mobile (default): 1 column
- Tablet (sm: 640px): 2 columns
- Desktop (lg: 1024px): 4 columns

**Key points:**
- `gap-4` (16px) works well on all screen sizes
- Use `grid-cols-1` as base (mobile-first)
- Each breakpoint adds more columns

---

## Bottom Sheet Patterns

### Pattern 9: MoreSheet Component

**When to use:** Bottom drawer for overflow navigation items

**Full component:**
```tsx
// src/components/mobile/MoreSheet.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, BarChart3, Wallet, Settings, Shield } from 'lucide-react'

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Bottom sheet positioning
          "fixed bottom-0 left-0 right-0 top-auto",
          "translate-y-0", // Override Dialog's center positioning
          // Rounded top corners only
          "rounded-t-2xl rounded-b-none",
          // Safe area padding
          "pb-safe-b",
          // Max height (don't cover entire screen)
          "max-h-[80vh]",
          // Styling
          "bg-white dark:bg-warm-gray-900",
          "border-t border-warm-gray-200 dark:border-warm-gray-700",
        )}
      >
        <DialogHeader>
          <DialogTitle>More</DialogTitle>
        </DialogHeader>

        {/* Navigation items */}
        <div className="space-y-2 py-4">
          <MoreSheetItem
            href="/recurring"
            icon={Calendar}
            onClick={() => onOpenChange(false)}
          >
            Recurring Transactions
          </MoreSheetItem>

          <MoreSheetItem
            href="/analytics"
            icon={BarChart3}
            onClick={() => onOpenChange(false)}
          >
            Analytics
          </MoreSheetItem>

          <MoreSheetItem
            href="/accounts"
            icon={Wallet}
            onClick={() => onOpenChange(false)}
          >
            Accounts
          </MoreSheetItem>

          <MoreSheetItem
            href="/settings"
            icon={Settings}
            onClick={() => onOpenChange(false)}
          >
            Settings
          </MoreSheetItem>

          {/* Conditional admin link */}
          {/* TODO: Add role check */}
          <MoreSheetItem
            href="/admin"
            icon={Shield}
            onClick={() => onOpenChange(false)}
          >
            Admin
          </MoreSheetItem>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface MoreSheetItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick?: () => void
}

function MoreSheetItem({ href, icon: Icon, children, onClick }: MoreSheetItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3",
        "px-4 py-3", // 48px touch target
        "rounded-lg",
        "transition-colors duration-200",
        "hover:bg-sage-50 dark:hover:bg-sage-900/30",
        "text-warm-gray-700 dark:text-warm-gray-300"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium">{children}</span>
    </Link>
  )
}
```

**Key points:**
- Extends Dialog (no new dependency)
- `fixed bottom-0` for bottom positioning
- `rounded-t-2xl rounded-b-none` for sheet appearance
- `pb-safe-b` for iPhone/Android safe area
- `max-h-[80vh]` prevents covering entire screen
- `onClick={() => onOpenChange(false)}` closes sheet on navigation

### Pattern 10: Bottom Sheet Animation

**When to use:** Custom slide-up animation for bottom sheet

**CSS animation (add to globals.css):**
```css
@layer utilities {
  /* Bottom sheet slide animations */
  @keyframes slideInFromBottom {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideOutToBottom {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }

  .bottom-sheet-enter {
    animation: slideInFromBottom 0.3s ease-out;
  }

  .bottom-sheet-exit {
    animation: slideOutToBottom 0.3s ease-in;
  }
}
```

**Apply to DialogContent:**
```tsx
<DialogContent
  className={cn(
    "bottom-sheet-enter",
    "data-[state=closed]:bottom-sheet-exit",
    // ... other classes
  )}
>
```

**Key points:**
- Use CSS animations (no Framer Motion for simple transitions)
- 300ms duration (fast enough, not jarring)
- ease-out for enter, ease-in for exit

---

## Hook Patterns

### Pattern 11: useScrollDirection Hook

**When to use:** Detect scroll direction for bottom nav auto-hide

**Full implementation:**
```typescript
// src/hooks/useScrollDirection.ts
'use client'

import { useState, useEffect } from 'react'

export type ScrollDirection = 'up' | 'down'

interface UseScrollDirectionOptions {
  threshold?: number  // Minimum scroll distance before direction change
  initialDirection?: ScrollDirection
}

interface UseScrollDirectionReturn {
  scrollDirection: ScrollDirection
  scrollY: number
  isAtTop: boolean
  isAtBottom: boolean
}

export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionReturn {
  const { threshold = 80, initialDirection = 'up' } = options

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection)
  const [scrollY, setScrollY] = useState(0)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    // Client-side only
    if (typeof window === 'undefined') return

    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY
      const documentHeight = document.documentElement.scrollHeight
      const windowHeight = window.innerHeight

      // Update scroll position
      setScrollY(currentScrollY)

      // Check if at top
      setIsAtTop(currentScrollY < threshold)

      // Check if at bottom
      setIsAtBottom(currentScrollY + windowHeight >= documentHeight - threshold)

      // Ignore small movements (prevent jitter)
      if (Math.abs(currentScrollY - lastScrollY) < 10) {
        ticking = false
        return
      }

      // Determine direction
      const newDirection = currentScrollY > lastScrollY ? 'down' : 'up'

      // Only update if direction actually changed
      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection)
      }

      lastScrollY = currentScrollY > 0 ? currentScrollY : 0
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    // Passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Initial check
    updateScrollDirection()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollDirection, threshold])

  return {
    scrollDirection,
    scrollY,
    isAtTop,
    isAtBottom,
  }
}
```

**Usage in BottomNavigation:**
```tsx
const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 80 })
const showNav = scrollDirection === 'up' || isAtTop

return (
  <motion.nav
    animate={{ y: showNav ? 0 : 80 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="fixed bottom-0 ..."
  >
    {/* Nav items */}
  </motion.nav>
)
```

**Key points:**
- `threshold: 80` - 80px scroll before hiding nav (industry standard)
- `isAtTop` - Always show nav when at page top
- `requestAnimationFrame` - Throttle for 60fps performance
- `Math.abs() < 10` - Ignore jitter (small scroll movements)
- `passive: true` - Better scroll performance

### Pattern 12: useMediaQuery Hook

**When to use:** Conditional rendering based on screen size

**Full implementation:**
```typescript
// src/hooks/useMediaQuery.ts
'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Client-side only
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [query])

  return matches
}
```

**Usage examples:**
```tsx
// Check if mobile
const isMobile = useMediaQuery('(max-width: 768px)')

// Check if desktop
const isDesktop = useMediaQuery('(min-width: 1024px)')

// Check if dark mode preferred
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

// Check if landscape
const isLandscape = useMediaQuery('(orientation: landscape)')

// Conditional rendering
{isMobile ? <BottomNavigation /> : <DesktopNav />}
```

**Key points:**
- Returns `boolean` (true/false)
- Automatically updates on breakpoint change
- Works with any CSS media query
- SSR-safe (returns false until hydrated)

### Pattern 13: usePrefersReducedMotion Hook

**When to use:** Disable animations for users with motion sensitivity

**Full implementation:**
```typescript
// src/hooks/usePrefersReducedMotion.ts
'use client'

import { useMediaQuery } from './useMediaQuery'

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
```

**Usage in components:**
```tsx
const prefersReducedMotion = usePrefersReducedMotion()

return (
  <motion.div
    variants={prefersReducedMotion ? undefined : staggerContainer}
    initial="hidden"
    animate="visible"
  >
    {/* Animations disabled if user prefers reduced motion */}
  </motion.div>
)
```

**Bottom nav usage:**
```tsx
const prefersReducedMotion = usePrefersReducedMotion()

<motion.nav
  animate={{ y: showNav ? 0 : 80 }}
  transition={{
    duration: prefersReducedMotion ? 0 : 0.3,
    ease: 'easeOut'
  }}
>
```

**Key points:**
- Accessibility requirement (WCAG 2.1)
- CSS already respects this (globals.css has @media query)
- Use for JavaScript/Framer Motion animations
- Never force animations on users who prefer reduced motion

---

## Radix UI Mobile Patterns

### Pattern 14: Select Mobile Overflow Fix

**When to use:** All Radix Select components

**Updated select.tsx:**
```tsx
// src/components/ui/select.tsx
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
        position === "popper" &&
          "data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      collisionPadding={16}  // NEW: Stay 16px from viewport edges
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full",
          // FIXED: Mobile overflow issue
          "min-w-[calc(100vw-4rem)] sm:min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
```

**Key changes:**
- `collisionPadding={16}` - Prevents dropdown from going off-screen
- `min-w-[calc(100vw-4rem)]` - Mobile: near full width (32px margins)
- `sm:min-w-[var(--radix-select-trigger-width)]` - Desktop: match trigger width

### Pattern 15: Dropdown Menu Mobile Touch Targets

**When to use:** All Radix DropdownMenu components

**Updated dropdown-menu.tsx:**
```tsx
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={16}  // NEW: Stay 16px from edges
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-lg",
      "px-2 py-2.5", // UPDATED: py-2.5 for better touch target (40px)
      "text-sm outline-none transition-colors",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
```

**Key changes:**
- `collisionPadding={16}` - Menu stays on screen
- `py-2.5` - Menu items 40px height (better touch target)

---

## Z-Index Hierarchy

### Pattern 16: Z-Index Reference

**Use this hierarchy for ALL components:**

```typescript
// Z-Index Hierarchy (document in code comments)
/**
 * Z-Index Hierarchy:
 * z-100: Toasts (highest priority, never blocked)
 * z-50:  Modals, Dialogs, Dropdowns, Mobile hamburger button
 * z-45:  Bottom Navigation (NEW - between nav and modals)
 * z-40:  Sidebar overlay (mobile)
 * z-10:  Elevated cards, local dropdowns
 * z-0:   Main content (default)
 */
```

**Tailwind config:**
```typescript
extend: {
  zIndex: {
    'bottom-nav': '45',
  },
}
```

**Usage:**
```tsx
// Bottom navigation
<nav className="z-[45] lg:hidden">

// Sidebar overlay
<div className="z-40 fixed inset-0">

// Modal overlay
<DialogPrimitive.Overlay className="z-50">

// Toasts
<ToastViewport className="z-[100]">
```

**Testing checklist:**
- [ ] Open modal → bottom nav should be behind overlay
- [ ] Open dropdown → dropdown should be above bottom nav
- [ ] Trigger toast → toast should be above everything
- [ ] Open sidebar (mobile) → overlay should cover content but not hamburger button

---

## Import Order Convention

**Always follow this order:**

```typescript
// 1. React core
import * as React from 'react'
import { useState, useEffect } from 'react'

// 2. Next.js
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// 3. External libraries (alphabetical)
import { motion } from 'framer-motion'
import { format } from 'date-fns'

// 4. Radix UI
import * as DialogPrimitive from '@radix-ui/react-dialog'

// 5. Internal components (alphabetical)
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// 6. Internal hooks
import { useScrollDirection } from '@/hooks/useScrollDirection'

// 7. Internal utils
import { cn } from '@/lib/utils'

// 8. Types (if separate file)
import type { User } from '@/types'

// 9. Icons (last)
import { LayoutDashboard, Receipt } from 'lucide-react'
```

---

## Code Quality Standards

### TypeScript
- **No `any` types** - Use `unknown` or specific types
- **Explicit return types** on exported functions
- **Interface over type** for props (convention)

### React
- **Use functional components** - No class components
- **Hooks at top level** - Never in conditionals
- **forwardRef for ref forwarding** - Required for Radix UI
- **displayName for forwardRef** - Better debugging

### Naming
- **Boolean props:** `isActive`, `hasError`, `canEdit`
- **Event handlers:** `handleClick`, `handleSubmit`
- **Callbacks:** `onSave`, `onChange`

### Comments
- **Why, not what** - Code should be self-documenting
- **TODO with context** - `// TODO: Add role check for admin`
- **Accessibility notes** - `// WCAG 2.1 AA requires 44x44px`

---

## Performance Patterns

### Pattern 17: GPU-Accelerated Animations

**When to use:** All animations (scroll-hide, transitions)

**Use CSS transforms (GPU-accelerated):**
```tsx
// ✅ GOOD: transform (GPU)
<motion.nav
  animate={{ y: showNav ? 0 : 80 }}
  style={{ willChange: 'transform' }}
>

// ❌ BAD: top/bottom (causes reflow)
<motion.nav animate={{ bottom: showNav ? 0 : -80 }}>
```

**CSS will-change hint:**
```css
.bottom-nav {
  will-change: transform; /* Hint to browser for optimization */
}
```

**Allowed transform properties:**
- `translateX`, `translateY`, `translateZ` ✅
- `scale`, `scaleX`, `scaleY` ✅
- `rotate`, `rotateX`, `rotateY` ✅
- `opacity` ✅

**Avoid (causes layout reflow):**
- `top`, `bottom`, `left`, `right` ❌
- `width`, `height` ❌
- `margin`, `padding` ❌

### Pattern 18: Passive Event Listeners

**When to use:** Scroll events, touch events

```typescript
// ✅ GOOD: Passive listener
window.addEventListener('scroll', handleScroll, { passive: true })

// ❌ BAD: Non-passive (blocks scrolling)
window.addEventListener('scroll', handleScroll)
```

**Key points:**
- `passive: true` tells browser you won't call `preventDefault()`
- Allows browser to scroll immediately (no wait for JS)
- Critical for 60fps scrolling on mobile

---

## Security Patterns

### Pattern 19: Safe Area CSS (No Security Risk)

**Safe area values are public information:**
- Not sensitive data
- No security implications
- Safe to expose in CSS

### Pattern 20: Input Validation

**Always validate on server:**
```tsx
// Client-side: inputMode for UX only
<Input type="text" inputMode="decimal" />

// Server-side: MUST validate
const amount = parseFloat(input)
if (isNaN(amount) || amount < 0) {
  throw new Error('Invalid amount')
}
```

**inputMode does NOT provide security**, only UX.

---

## Testing Patterns

### Manual Testing Checklist

**Every component:**
- [ ] Works on 375px viewport (iPhone SE)
- [ ] Works on 390px viewport (iPhone 14 Pro)
- [ ] Works on 414px viewport (iPhone 14 Pro Max)
- [ ] Touch targets ≥44x44px
- [ ] Dark mode works
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly

**Bottom nav specific:**
- [ ] Hides on scroll down, shows on scroll up
- [ ] Always visible at top of page
- [ ] Safe area respected (iPhone 14 Pro real device)
- [ ] Z-index correct (below modals, above content)
- [ ] Active state highlights current route
- [ ] MoreSheet opens/closes smoothly

---

## Common Gotchas

### Gotcha 1: Safe Area Insets

**Problem:** Safe area insets are 0 in browser DevTools

**Solution:** Test on real device only

**Testing:**
```bash
npm run dev
ngrok http 3000
# Access from iPhone via ngrok URL
```

### Gotcha 2: Touch Target Visual vs Actual

**Problem:** Visual size looks right, but touch area too small

**Solution:** Use browser inspector to check computed height

```tsx
// Visual size: icon only (24px)
<button>
  <Icon className="h-6 w-6" />
</button>

// Actual touch target: button (44px)
<button className="h-11 w-11">
  <Icon className="h-6 w-6" />
</button>
```

### Gotcha 3: Fixed Position and Safe Areas

**Problem:** Fixed elements ignore safe areas by default

**Solution:** Always add safe area padding to fixed elements

```tsx
// ❌ BAD: No safe area
<nav className="fixed bottom-0">

// ✅ GOOD: Safe area padding
<nav className="fixed bottom-0 pb-safe-b">
```

### Gotcha 4: Z-Index Stacking Context

**Problem:** Z-index not working as expected

**Solution:** Check parent stacking context

```tsx
// Parent creates new stacking context
<div className="relative z-10">
  {/* Child z-50 only works within parent context */}
  <div className="z-50">Modal</div>
</div>

// Solution: Remove parent z-index or make modal a portal
<Dialog> {/* Radix renders in portal */}
  <DialogContent className="z-50">Modal</DialogContent>
</Dialog>
```

---

**Patterns Complete**

All patterns are production-ready. Copy, adapt, and use consistently across all builders.

**Key Principles:**
1. Mobile-first CSS (write mobile styles first)
2. Touch target compliance (44x44px minimum)
3. Safe areas always (pb-safe-b, pt-safe-t)
4. Performance-first (GPU transforms, passive listeners)
5. Accessibility-first (keyboard nav, screen reader, reduced motion)

Builders: Reference this file for every implementation decision.
