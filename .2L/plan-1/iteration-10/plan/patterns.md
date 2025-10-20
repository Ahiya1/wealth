# Code Patterns & Conventions - Iteration 10

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx          # Dashboard page (server component)
│   │   │   ├── accounts/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── categories/page.tsx
│   │   │   │   ├── currency/page.tsx
│   │   │   │   ├── appearance/page.tsx
│   │   │   │   └── data/page.tsx
│   │   │   └── account/
│   │   │       ├── page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       └── membership/page.tsx
│   │   ├── layout.tsx                       # Root layout (font loading)
│   │   └── globals.css                      # Global styles, CSS variables
│   ├── components/
│   │   ├── ui/                              # Primitive components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── affirmation-card.tsx
│   │   │   └── page-transition.tsx
│   │   ├── dashboard/                       # Dashboard-specific
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── RecentTransactionsCard.tsx
│   │   │   ├── FinancialHealthIndicator.tsx  # NEW component
│   │   │   └── DashboardSidebar.tsx
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   └── goals/
│   ├── lib/
│   │   ├── animations.ts                    # Framer Motion animation variants
│   │   ├── useReducedMotion.ts              # NEW hook for accessibility
│   │   └── utils.ts
│   └── server/
│       └── api/
│           └── routers/
│               ├── budgets.router.ts        # tRPC router (for FinancialHealthIndicator)
│               └── analytics.router.ts
├── tailwind.config.ts                       # Tailwind configuration (EXPAND)
└── package.json
```

## Naming Conventions

**Components:**
- PascalCase: `AffirmationCard.tsx`, `FinancialHealthIndicator.tsx`
- Client components: Suffix with `Client` if wrapping server component (`AccountsPageClient.tsx`)

**Files:**
- camelCase: `useReducedMotion.ts`, `animations.ts`
- kebab-case for routes: `dashboard/page.tsx`, `settings/categories/page.tsx`

**Types:**
- PascalCase: `Transaction`, `Account`, `BudgetProgress`
- Interfaces: Prefix with `I` if ambiguous, otherwise omit (`ButtonProps` not `IButtonProps`)

**Functions:**
- camelCase: `calculateHealthScore()`, `formatCurrency()`

**Constants:**
- SCREAMING_SNAKE_CASE: `DURATION.FAST`, `MAX_RETRIES`
- Animation constants: PascalCase for variants (`pageTransition`, `cardHover`)

**CSS Variables:**
- kebab-case: `--sage-500`, `--warm-gray-200`, `--affirmative`, `--radius`

## Tailwind Configuration Pattern

### Color Palette Extension

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        // EXISTING (keep as-is)
        sage: {
          50: 'hsl(140, 10%, 97%)',
          100: 'hsl(140, 12%, 94%)',
          // ... 200-900
        },
        'warm-gray': {
          50: 'hsl(24, 4%, 97%)',
          100: 'hsl(24, 6%, 94%)',
          // ... 200-900
        },

        // NEW: Terracotta palette for affirmative actions
        terracotta: {
          50: 'hsl(30, 30%, 97%)',
          100: 'hsl(30, 30%, 94%)',
          200: 'hsl(30, 35%, 87%)',
          300: 'hsl(30, 40%, 77%)',
          400: 'hsl(25, 50%, 65%)',
          500: 'hsl(20, 55%, 55%)',  // Primary terracotta
          600: 'hsl(15, 60%, 45%)',
          700: 'hsl(12, 65%, 38%)',
          800: 'hsl(10, 70%, 30%)',
          900: 'hsl(8, 75%, 22%)',
        },

        // NEW: Dusty blue for analytical sections
        'dusty-blue': {
          50: 'hsl(215, 20%, 97%)',
          100: 'hsl(215, 20%, 93%)',
          200: 'hsl(215, 22%, 85%)',
          300: 'hsl(215, 24%, 73%)',
          400: 'hsl(215, 26%, 58%)',
          500: 'hsl(215, 28%, 45%)',  // Primary dusty blue
          600: 'hsl(215, 30%, 36%)',
          700: 'hsl(215, 32%, 29%)',
          800: 'hsl(215, 35%, 22%)',
          900: 'hsl(215, 40%, 16%)',
        },

        // UPDATED: Muted gold (reduced saturation)
        gold: {
          50: 'hsl(45, 40%, 96%)',
          100: 'hsl(45, 40%, 92%)',
          200: 'hsl(45, 42%, 85%)',
          300: 'hsl(45, 45%, 73%)',
          400: 'hsl(45, 50%, 60%)',
          500: 'hsl(45, 55%, 50%)',  // Muted from 74% to 55%
          600: 'hsl(45, 60%, 42%)',
          700: 'hsl(45, 65%, 35%)',
          800: 'hsl(45, 70%, 28%)',
          900: 'hsl(45, 75%, 22%)',
        },
      },

      // NEW: Soft shadow utilities
      boxShadow: {
        'soft': '0 1px 3px 0 hsl(var(--warm-gray-300) / 0.15), 0 1px 2px 0 hsl(var(--warm-gray-300) / 0.1)',
        'soft-md': '0 4px 6px -1px hsl(var(--warm-gray-300) / 0.15), 0 2px 4px -1px hsl(var(--warm-gray-300) / 0.1)',
        'soft-lg': '0 10px 15px -3px hsl(var(--warm-gray-300) / 0.15), 0 4px 6px -2px hsl(var(--warm-gray-300) / 0.1)',
        'soft-xl': '0 20px 25px -5px hsl(var(--warm-gray-300) / 0.15), 0 10px 10px -5px hsl(var(--warm-gray-300) / 0.1)',
      },

      // NEW: Border radius warmth utility
      borderRadius: {
        'warmth': '0.75rem',  // More rounded for elevated surfaces
        lg: "var(--radius)",  // Keep existing 0.5rem
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // NEW: Animation keyframes
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-slow': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'skeleton': 'skeleton 2s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'gentle-bounce': 'gentleBounce 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },

      // NEW: Transition duration utilities
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
```

**Key Points:**
- Use HSL for all colors (dark mode compatibility via lightness adjustment)
- Terracotta hue 20-30 (warm orange-red), saturation 55-60% (gentle, not harsh)
- Dusty blue hue 215 (blue), saturation 20-30% (low for subtlety)
- Soft shadows use warm-gray hue for color system cohesion
- Animation keyframes extend existing (don't replace)

### Global CSS Variables

**File:** `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Existing semantic tokens (keep) */
    --background: 0 0% 100%;
    --foreground: var(--warm-gray-900);
    --card: 0 0% 100%;
    --card-foreground: var(--warm-gray-900);
    --primary: var(--sage-600);
    --primary-foreground: 0 0% 100%;
    --muted: var(--warm-gray-100);
    --muted-foreground: var(--warm-gray-600);
    --accent: var(--gold-500);
    --accent-foreground: var(--warm-gray-900);
    --destructive: var(--coral);
    --destructive-foreground: 0 0% 100%;
    --border: var(--warm-gray-200);
    --input: var(--warm-gray-200);
    --ring: var(--sage-500);
    --radius: 0.5rem;

    /* NEW: Semantic tokens for affirmative/analytical contexts */
    --affirmative: var(--terracotta-500);
    --affirmative-foreground: 0 0% 100%;
    --analytical: var(--dusty-blue-500);
    --analytical-foreground: 0 0% 100%;
    --gentle-warning: var(--gold-400);
    --gentle-warning-foreground: var(--warm-gray-900);
  }

  .dark {
    /* Existing dark mode overrides (keep) */
    --background: var(--warm-gray-950);
    --foreground: var(--warm-gray-50);
    --card: var(--warm-gray-900);
    --card-foreground: var(--warm-gray-50);
    /* ... other dark mode overrides */

    /* NEW: Dark mode for new tokens */
    --affirmative: var(--terracotta-400);  /* Lighter in dark mode */
    --analytical: var(--dusty-blue-400);
    --gentle-warning: var(--gold-300);
  }

  /* Global typography adjustments */
  body {
    line-height: 1.6;  /* Increased from default 1.5 for readability */
  }

  h1, h2, h3 {
    font-family: var(--font-serif);  /* Warmth via serif headings */
  }

  /* Tabular numbers for financial data */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

/* Accessibility: Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Key Points:**
- CSS variables use HSL without `hsl()` wrapper (Tailwind pattern)
- New semantic tokens: --affirmative, --analytical, --gentle-warning
- Dark mode overrides for all new colors
- Global line-height 1.6 for readability (up from 1.5)
- Global serif headings (h1, h2, h3)
- prefers-reduced-motion CSS fallback (belt-and-suspenders with useReducedMotion hook)

## Animation Library Pattern

### Animation Variants

**File:** `src/lib/animations.ts`

```typescript
import type { Variants, Transition } from 'framer-motion'

// Duration constants
export const DURATION = {
  fast: 0.15,      // Button hover, quick feedback
  normal: 0.3,     // Card hover, page transitions
  slow: 0.5,       // Dashboard page transition ("breath before data")
  breath: 0.6,     // Affirmation entrance (hero animation)
  progress: 0.8,   // Progress bars, gauge animations
  loading: 1.5,    // Loading pulse (slow, calming)
}

// Easing functions
export const EASING = {
  default: [0.4, 0, 0.2, 1],  // easeOut (Tailwind default)
  bounce: [0.68, -0.55, 0.265, 1.55],  // Gentle bounce for success
}

// Page transitions (configurable duration)
export const getPageTransition = (reducedMotion: boolean, duration: number = DURATION.normal) => ({
  initial: reducedMotion ? {} : { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? {} : { opacity: 0, y: -10 },
  transition: { duration: reducedMotion ? 0 : duration, ease: EASING.default },
})

// Dashboard-specific slow page transition
export const dashboardEntrance = (reducedMotion: boolean) => getPageTransition(reducedMotion, DURATION.slow)

// Affirmation card entrance (hero animation, solo)
export const affirmationEntrance = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.breath, ease: EASING.default }
  },
}

// Card hover effects
export const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: DURATION.fast, ease: EASING.default },
}

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

// Button hover effects
export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

export const buttonPrimary = {
  whileHover: {
    scale: 1.02,
    boxShadow: '0 4px 12px hsl(var(--sage-600) / 0.2)'
  },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

// Input focus effects
export const inputFocus = {
  whileFocus: {
    boxShadow: '0 0 0 3px hsl(var(--sage-500) / 0.1)',
  },
  transition: { duration: 0.2 },
}

// Success states
export const successBounce = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 0.95, 1.05, 1],
  },
  transition: {
    duration: 0.5,
    ease: EASING.default,
    times: [0, 0.2, 0.4, 0.7, 1]
  },
}

// Error states
export const errorShake = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
  },
  transition: { duration: 0.4 },
}

// Loading states
export const loadingPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: DURATION.loading,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

// Stagger animations for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,  // 70ms between children
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal },
  },
}

// Progress bar animation
export const progressBarAnimation: Variants = {
  initial: { width: '0%' },
  animate: { width: '100%' },
  transition: { duration: DURATION.progress, ease: EASING.default },
}

// Modal/Dialog animation
export const modalAnimation: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
}
```

**Key Points:**
- All duration constants centralized (easy to adjust globally)
- Animation functions accept `reducedMotion` parameter (accessibility)
- Card hover has three variants: default, subtle, elevated (use based on context)
- Button hover includes tap state (mobile feedback)
- Stagger animations have configurable delays
- All transitions use GPU-accelerated properties (transform, opacity)

### useReducedMotion Hook

**File:** `src/lib/useReducedMotion.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect user's motion preference for accessibility.
 * Returns true if user prefers reduced motion (WCAG 2.1 AA compliance).
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}
```

**Usage in components:**

```typescript
'use client'

import { useReducedMotion } from '@/lib/useReducedMotion'
import { getPageTransition } from '@/lib/animations'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion()
  const transition = getPageTransition(reducedMotion)

  return <motion.div {...transition}>{children}</motion.div>
}
```

**Key Points:**
- SSR-safe (checks for window before accessing matchMedia)
- Listens for preference changes (user can toggle OS setting without refresh)
- Fallback for older browsers (addListener/removeListener)
- Used by ALL animation components (critical for accessibility)

## Component Patterns

### Dashboard Page Pattern (Server Component + Client Data)

**File:** `src/app/(dashboard)/dashboard/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'
import { AffirmationCard } from '@/components/ui/affirmation-card'
import { FinancialHealthIndicator } from '@/components/dashboard/FinancialHealthIndicator'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { DashboardStats } from '@/components/dashboard/DashboardStats'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Server-side greeting calculation
  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'there'

  return (
    <PageTransition duration="slow">
      <div className="space-y-6">
        {/* 1. AFFIRMATION FIRST - Hero element */}
        <AffirmationCard />

        {/* 2. GREETING BELOW - Smaller, secondary */}
        <div>
          <h2 className="text-2xl font-serif font-semibold text-warm-gray-900">
            {greeting}, {userName}!
          </h2>
          <p className="text-warm-gray-600 mt-1 leading-relaxed">
            Here&apos;s your financial overview
          </p>
        </div>

        {/* 3. FINANCIAL HEALTH INDICATOR - New component */}
        <FinancialHealthIndicator />

        {/* 4. RECENT TRANSACTIONS */}
        <RecentTransactionsCard />

        {/* 5. STATS CARDS - Moved lower */}
        <DashboardStats />
      </div>
    </PageTransition>
  )
}
```

**Key Points:**
- Server component for auth check (async function)
- Greeting calculated server-side (avoids hydration mismatch)
- PageTransition wraps all content (duration="slow" for 500ms)
- Hierarchy: Affirmation → Greeting → Health → Transactions → Stats
- Spacing: space-y-6 for vertical rhythm
- Typography: h2 with font-serif for warmth, reduced from h1 text-3xl

### FinancialHealthIndicator Component (New)

**File:** `src/components/dashboard/FinancialHealthIndicator.tsx`

```typescript
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

  // Determine supportive message and color (sage tones only, no red/green)
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
    <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">Financial Health</CardTitle>
        <Target className="h-5 w-5 text-sage-500" />
      </CardHeader>
      <CardContent>
        {budgetCount === 0 ? (
          <div className="text-center py-4">
            <p className="text-warm-gray-600 mb-3 leading-relaxed">
              Set budgets to track your financial health
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/budgets">Create Budget</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Circular Gauge (SVG-based) */}
            <div className="relative h-24 w-24 flex-shrink-0">
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
                {/* Progress circle (sage tone only, no red/green) */}
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
                <span className="text-2xl font-bold text-warm-gray-900 font-sans tabular-nums">
                  {onTrack}/{budgetCount}
                </span>
              </div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <p className={`text-lg font-semibold ${healthColor} leading-relaxed`}>
                {healthMessage}
              </p>
              <p className="text-sm text-warm-gray-600 mt-1 leading-relaxed">
                {onTrack} of {budgetCount} budgets on track
              </p>
              {(warning > 0 || over > 0) && (
                <p className="text-xs text-warm-gray-500 mt-1 leading-relaxed">
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

**Key Points:**
- Client component ('use client') for tRPC data fetching
- Circular gauge using SVG (40px radius, 8px stroke width)
- Animated with Framer Motion (strokeDashoffset from full to percentage)
- Supportive language: "Looking good", "Making progress", "Needs attention" (never "Failed")
- Sage tones only (no red/green dichotomy for health states)
- Empty state with CTA to create budget
- Numbers remain font-sans with tabular-nums (data readability)
- Gradient background matching affirmation card pattern

### AffirmationCard Enhancement

**File:** `src/components/ui/affirmation-card.tsx`

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'

const affirmations = [
  "Your worth is not your net worth",
  "Financial wellness is a journey, not a destination",
  "Every small step forward is progress",
  // ... 32 more affirmations (total 35)
]

export function AffirmationCard() {
  // Daily rotation logic (consistent per day)
  const dailyAffirmation = useMemo(() => {
    const index = new Date().getDate() % affirmations.length
    return affirmations[index]
  }, [])

  return (
    <Card className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 border-sage-200 shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 rounded-warmth">
      <CardContent className="p-8 md:p-10 lg:p-12 text-center">
        {/* Icon enlarged for prominence */}
        <Sparkles className="h-6 w-6 md:h-8 md:w-8 mx-auto text-gold-500 mb-4 md:mb-6" />

        {/* Text enlarged 1.5x with responsive breakpoints */}
        <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-warm-gray-800 italic leading-loose max-w-4xl mx-auto">
          &ldquo;{dailyAffirmation}&rdquo;
        </p>
      </CardContent>
    </Card>
  )
}
```

**Key Points:**
- Size increased 1.5x: text-2xl (mobile) → text-3xl (tablet) → text-4xl (desktop)
- Padding increased proportionally: p-8 → p-10 → p-12
- Icon enlarged: h-6 w-6 → h-8 w-8
- Enhanced gradient: via-warm-gray-50 stop for smoothness
- Soft shadow: shadow-soft-lg (more prominent than other cards)
- Rounded corners: rounded-warmth (0.75rem, warmer than standard)
- Max-width: max-w-4xl prevents overly long lines
- Line-height: leading-loose (1.875) for readability
- Daily rotation logic unchanged (already perfect)

### Button Component Enhancement

**File:** `src/components/ui/button.tsx`

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { buttonHover, buttonPrimary } from '@/lib/animations'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-sage-600 text-white hover:bg-sage-700',
        destructive: 'bg-terracotta-500 text-white hover:bg-terracotta-600',  // Warm warning instead of harsh red
        outline: 'border border-warm-gray-300 bg-white hover:bg-warm-gray-50 shadow-soft',
        secondary: 'bg-warm-gray-100 text-warm-gray-900 hover:bg-warm-gray-200',
        ghost: 'hover:bg-warm-gray-100 hover:text-warm-gray-900',
        link: 'underline-offset-4 hover:underline text-sage-600',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-lg',
        lg: 'h-11 px-8 rounded-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    // Use Framer Motion for default variant (gentle scale + shadow glow)
    if (variant === 'default' && !asChild) {
      return (
        <motion.button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...buttonPrimary}
          {...props}
        />
      )
    }

    // Standard button with hover animation for other variants
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

**Key Points:**
- Border-radius: rounded-lg (updated from rounded-md for warmth)
- Destructive variant: terracotta-500 instead of coral (warm warning)
- Outline variant: shadow-soft instead of border only
- Framer Motion integration for default variant (scale 1.02 + shadow glow)
- Other variants keep CSS transitions (simpler, performant)
- Focus ring: sage-500 (consistent with color system)

### Card Component Enhancement

**File:** `src/components/ui/card.tsx`

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-warm-gray-200 bg-white text-warm-gray-950 shadow-soft',  // Updated shadow
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-serif text-xl font-semibold leading-none tracking-tight', className)}  // Added font-serif
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-warm-gray-600 leading-relaxed', className)}  // Added leading-relaxed
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

**Key Points:**
- Shadow: shadow-soft instead of shadow-sm (warmer, multi-layer)
- Border-radius: rounded-lg (already correct)
- CardTitle: font-serif for warmth
- CardDescription: leading-relaxed for readability
- Border: border-warm-gray-200 (subtle, not harsh)

### Input Component Enhancement

**File:** `src/components/ui/input.tsx`

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg bg-white px-3 py-2 text-sm shadow-soft transition-all duration-200',  // Updated: rounded-lg, shadow-soft
          'placeholder:text-warm-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 focus-visible:shadow-soft-md',  // Enhanced focus
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

**Key Points:**
- Border-radius: rounded-lg (updated from rounded-md)
- Shadow: shadow-soft instead of border (warmer separation)
- Focus state: shadow-soft-md for glow effect
- Transition: transition-all duration-200 (smooth focus animation)
- Ring: sage-500 (consistent with color system)

### PageTransition Component Update

**File:** `src/components/ui/page-transition.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { getPageTransition } from '@/lib/animations'
import { DURATION } from '@/lib/animations'

interface PageTransitionProps {
  children: React.ReactNode
  duration?: 'normal' | 'slow'
}

export function PageTransition({ children, duration = 'normal' }: PageTransitionProps) {
  const reducedMotion = useReducedMotion()

  const durationValue = duration === 'slow' ? DURATION.slow : DURATION.normal
  const animation = getPageTransition(reducedMotion, durationValue)

  return <motion.div {...animation}>{children}</motion.div>
}
```

**Usage:**

```typescript
// Default page (300ms)
<PageTransition>
  <div>Page content</div>
</PageTransition>

// Dashboard (500ms "breath before data")
<PageTransition duration="slow">
  <div>Dashboard content</div>
</PageTransition>
```

**Key Points:**
- Accepts duration prop: 'normal' (300ms) or 'slow' (500ms)
- Uses useReducedMotion hook for accessibility
- Passes reducedMotion to animation variant
- Animations disable completely if user prefers reduced motion

## Testing Patterns

### Visual Regression Testing Pattern

```typescript
// Manual checklist approach (no automated tool needed for MVP)

// Before changes:
// 1. Screenshot Dashboard at 320px (mobile), 768px (tablet), 1440px (desktop)
// 2. Screenshot Settings page at same widths
// 3. Screenshot Account page at same widths

// After changes:
// 1. Take same screenshots
// 2. Compare side-by-side
// 3. Verify:
//    - Affirmation is largest, centered, readable
//    - Greeting below affirmation, appropriate size
//    - FinancialHealthIndicator displays correctly
//    - Stats cards animate smoothly
//    - Rounded corners consistent
//    - Shadows visible but subtle
```

### Accessibility Testing Pattern

```typescript
// Chrome DevTools Lighthouse
// 1. Open DevTools > Lighthouse tab
// 2. Select "Accessibility" category
// 3. Run audit
// 4. Verify score >= 90
// 5. Fix any color contrast issues (WCAG AA = 4.5:1)

// Reduced-motion testing
// 1. Open DevTools > Rendering tab
// 2. Enable "Emulate CSS media feature prefers-reduced-motion"
// 3. Reload page
// 4. Verify no animations play (instant transitions)
// 5. Verify all functionality still works

// Keyboard navigation
// 1. Tab through all interactive elements
// 2. Verify focus ring visible on all buttons/inputs
// 3. Verify no focus trap
// 4. Test Enter/Space to activate buttons
```

### Performance Testing Pattern

```typescript
// Chrome DevTools Performance
// 1. Open DevTools > Performance tab
// 2. Start recording
// 3. Reload page (Cmd+R or Ctrl+R)
// 4. Stop recording after 3 seconds
// 5. Verify:
//    - FCP < 1.0s (desktop), < 2.0s (mobile)
//    - LCP < 2.0s (affirmation should be LCP)
//    - No layout shift (CLS = 0)
//    - Animation frames at 60fps (green bars)

// Mobile testing
// 1. Chrome DevTools > Device toolbar
// 2. Select "Moto G4" or "iPhone 12"
// 3. Enable "4x CPU slowdown"
// 4. Reload page
// 5. Verify animations smooth (min 30fps)
```

## Import Order Convention

```typescript
// 1. React and Next.js imports
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// 2. Third-party libraries
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Target, Sparkles, TrendingUp } from 'lucide-react'

// 3. Internal utilities and hooks
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { trpc } from '@/lib/trpc'

// 4. Animation library
import { cardHover, buttonPrimary, staggerContainer } from '@/lib/animations'

// 5. UI components (alphabetical)
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// 6. Domain components (alphabetical)
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { FinancialHealthIndicator } from '@/components/dashboard/FinancialHealthIndicator'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'

// 7. Types
import type { Transaction, Account } from '@/types'
```

## Code Quality Standards

**Accessibility (CRITICAL):**
- All animations respect prefers-reduced-motion (use useReducedMotion hook)
- Color contrast ratios meet WCAG AA (4.5:1 for text)
- Focus indicators visible on all interactive elements
- Semantic HTML (h1-h3 hierarchy, proper button/link distinction)

**Performance:**
- GPU-accelerated properties only (transform, opacity, filter)
- No width/height/margin animations (causes layout thrashing)
- will-change hints for hover elements (cards, buttons)
- Lazy load non-critical components (React.lazy for modals)

**Visual Consistency:**
- All buttons: rounded-lg, gentle hover (scale 1.02)
- All cards: rounded-lg, shadow-soft, gradient backgrounds for elevation
- All inputs: rounded-lg, shadow-soft, focus ring with glow
- All headings (h1-h3): font-serif
- All numbers: font-sans with tabular-nums

**Typography:**
- Headings: font-serif (warmth)
- Body: font-sans (readability)
- Numbers: font-sans tabular-nums (alignment)
- Line-height: 1.6 (leading-relaxed for paragraphs)
- Max-width: max-w-4xl for long-form text (prevents overly long lines)

**Color Usage:**
- Terracotta: Affirmative actions only (save goal, celebrate milestone)
- Dusty blue: Analytical sections only (charts, data tables)
- Gold: Highlights and attention (affirmations, badges)
- Sage: Primary actions and success states
- Warm gray: Neutral and text

**Shadow Strategy:**
- Cards: shadow-soft (subtle separation)
- Inputs: shadow-soft (gentle focus glow to shadow-soft-md)
- Buttons (outline): shadow-soft (replaces border)
- Modals: shadow-soft-xl (floating effect)
- Keep borders for: form focus states, active tabs, category badges

**Animation Timing:**
- Page entrance: 300ms (normal), 500ms (dashboard slow)
- Button hover: 150ms
- Card hover: 200ms
- Success states: 400ms
- Loading pulse: 1500ms
- Reduced-motion: 0ms (instant)
