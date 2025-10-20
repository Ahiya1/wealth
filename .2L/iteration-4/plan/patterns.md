# Code Patterns & Conventions - Iteration 4

**CRITICAL:** This file contains **copy-paste ready code**. Builders should NOT improvise or create their own patterns. Consistency is essential for the "conscious money" aesthetic.

---

## File Structure

```
/home/ahiya/Ahiya/wealth/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── goals/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── layout.tsx           # Root layout (fonts, Toaster)
│   │   ├── page.tsx              # Landing page
│   │   └── globals.css           # CSS variables, base styles
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components + new components
│   │   ├── dashboard/            # Dashboard-specific components
│   │   ├── accounts/             # Account-related components
│   │   ├── transactions/         # Transaction-related components
│   │   ├── budgets/              # Budget-related components
│   │   ├── goals/                # Goal-related components
│   │   └── analytics/            # Chart components
│   ├── lib/
│   │   ├── animations.ts         # Framer Motion variants (NEW)
│   │   ├── chartColors.ts        # Recharts color palette (NEW)
│   │   ├── utils.ts              # cn() utility
│   │   ├── trpc.ts               # tRPC client
│   │   └── supabase/
│   └── server/
│       └── api/
│           └── routers/          # tRPC routers (no changes)
├── prisma/
│   └── schema.prisma             # Database schema (no changes)
├── tailwind.config.ts            # Theme config (colors, fonts)
└── package.json                  # Dependencies (sonner, framer-motion)
```

---

## Naming Conventions

**Components:** PascalCase
```
StatCard.tsx
AffirmationCard.tsx
EncouragingProgress.tsx
```

**Files:** camelCase for utilities, PascalCase for components
```
animations.ts
chartColors.ts
AccountCard.tsx
```

**Types:** PascalCase
```typescript
type StatCardProps = { ... }
type Transaction = { ... }
type BudgetStatus = 'excellent' | 'good' | 'approaching' | 'attention'
```

**Functions:** camelCase
```typescript
function formatCurrency(amount: number) { ... }
function calculateProgress(spent: number, budget: number) { ... }
```

**Constants:** SCREAMING_SNAKE_CASE
```typescript
const MAX_TRANSACTION_AMOUNT = 1000000
const DURATION = { FAST: 0.15, NORMAL: 0.3 }
```

---

## Color Usage Rules (CRITICAL)

### Typography Colors

```typescript
// Headlines
<h1 className="text-warm-gray-900 font-serif font-bold">

// Body text
<p className="text-warm-gray-700 font-sans">

// Muted text (labels, captions)
<span className="text-warm-gray-500 text-sm">

// Links
<a className="text-sage-600 hover:text-sage-700 underline-offset-4 hover:underline">
```

### Financial State Colors (NO RED/GREEN!)

**WRONG:**
```typescript
// ❌ DON'T USE THESE - Creates anxiety
<span className="text-green-600">Income</span>
<span className="text-red-600">Expenses</span>
<div className="bg-red-500">Over budget</div>
```

**RIGHT:**
```typescript
// ✅ Use these instead - Calm and mindful
// Income/Growth
<span className="text-sage-600">Income</span>

// Expenses (neutral, not red)
<span className="text-warm-gray-700">Expenses</span>

// Positive trend
<div className="flex items-center gap-1">
  <TrendingUp className="h-4 w-4 text-sage-600" />
  <span className="text-sage-600">+12%</span>
</div>

// Negative trend (not red, just muted)
<div className="flex items-center gap-1">
  <TrendingDown className="h-4 w-4 text-warm-gray-600" />
  <span className="text-warm-gray-600">-5%</span>
</div>

// Needs attention (coral, not red)
<div className="bg-coral/10 text-coral border-coral/20">
  Time to review this budget
</div>

// Achievement
<div className="text-gold">
  Goal completed! 🎉
</div>
```

### Button Colors

```typescript
// Primary action
<Button className="bg-sage-600 hover:bg-sage-700 text-white">
  Create Transaction
</Button>

// Secondary action
<Button variant="outline" className="bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-900">
  Cancel
</Button>

// Destructive action (use coral, not red)
<Button variant="destructive" className="bg-coral hover:bg-coral/90 text-white">
  Delete Account
</Button>
```

### Background Colors

```typescript
// Page background
<div className="bg-warm-gray-50">

// Card background
<Card className="bg-white">

// Elevated card (gradient)
<Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200">

// Hover state
<div className="hover:bg-warm-gray-50 transition-colors">
```

---

## Design System Setup Pattern (Builder-0 ONLY)

### Step 1: Update globals.css

**File:** `/home/ahiya/Ahiya/wealth/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Sage Green Palette */
    --sage-50: 140 10% 96%;
    --sage-100: 140 10% 92%;
    --sage-200: 140 11% 84%;
    --sage-300: 140 12% 69%;
    --sage-400: 140 13% 56%;
    --sage-500: 140 13% 42%;
    --sage-600: 140 14% 33%;
    --sage-700: 140 15% 27%;
    --sage-800: 140 16% 21%;
    --sage-900: 140 18% 15%;

    /* Warm Gray Palette */
    --warm-gray-50: 24 6% 98%;
    --warm-gray-100: 24 6% 96%;
    --warm-gray-200: 24 6% 91%;
    --warm-gray-300: 24 5% 84%;
    --warm-gray-400: 24 4% 66%;
    --warm-gray-500: 24 5% 46%;
    --warm-gray-600: 24 6% 34%;
    --warm-gray-700: 24 7% 27%;
    --warm-gray-800: 24 9% 16%;
    --warm-gray-900: 24 10% 11%;

    /* Accent Colors */
    --gold: 45 74% 52%;
    --coral: 0 100% 71%;
    --sky: 204 52% 67%;
    --lavender: 255 85% 85%;

    /* Semantic Tokens */
    --background: var(--warm-gray-50);
    --foreground: var(--warm-gray-900);

    --card: 0 0% 100%;
    --card-foreground: var(--warm-gray-900);

    --primary: var(--sage-600);
    --primary-foreground: 0 0% 100%;

    --muted: var(--warm-gray-100);
    --muted-foreground: var(--warm-gray-500);

    --accent: var(--sage-100);
    --accent-foreground: var(--sage-900);

    --border: var(--warm-gray-200);
    --input: var(--warm-gray-200);
    --ring: var(--sage-500);

    --destructive: var(--coral);
    --destructive-foreground: 0 0% 100%;

    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  /* Tabular numbers for financial data */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

/* Supabase Auth UI Theming */
.supabase-auth-ui_ui-container {
  --auth-border-color: hsl(var(--sage-200));
  --auth-border-focus: hsl(var(--sage-500));
  --auth-input-background: hsl(var(--warm-gray-50));
  --auth-button-background: hsl(var(--sage-600));
  --auth-button-background-hover: hsl(var(--sage-700));
  font-family: var(--font-sans);
}

.supabase-auth-ui_ui-button {
  @apply rounded-lg transition-all hover:shadow-md;
}
```

### Step 2: Update tailwind.config.ts

**File:** `/home/ahiya/Ahiya/wealth/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Crimson Pro', 'Georgia', 'serif'],
      },
      colors: {
        sage: {
          50: 'hsl(var(--sage-50))',
          100: 'hsl(var(--sage-100))',
          200: 'hsl(var(--sage-200))',
          300: 'hsl(var(--sage-300))',
          400: 'hsl(var(--sage-400))',
          500: 'hsl(var(--sage-500))',
          600: 'hsl(var(--sage-600))',
          700: 'hsl(var(--sage-700))',
          800: 'hsl(var(--sage-800))',
          900: 'hsl(var(--sage-900))',
        },
        'warm-gray': {
          50: 'hsl(var(--warm-gray-50))',
          100: 'hsl(var(--warm-gray-100))',
          200: 'hsl(var(--warm-gray-200))',
          300: 'hsl(var(--warm-gray-300))',
          400: 'hsl(var(--warm-gray-400))',
          500: 'hsl(var(--warm-gray-500))',
          600: 'hsl(var(--warm-gray-600))',
          700: 'hsl(var(--warm-gray-700))',
          800: 'hsl(var(--warm-gray-800))',
          900: 'hsl(var(--warm-gray-900))',
        },
        gold: 'hsl(var(--gold))',
        coral: 'hsl(var(--coral))',
        sky: 'hsl(var(--sky))',
        lavender: 'hsl(var(--lavender))',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'skeleton': 'skeleton 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

### Step 3: Configure Google Fonts in layout.tsx

**File:** `/home/ahiya/Ahiya/wealth/src/app/layout.tsx`

```typescript
import { Inter, Crimson_Pro } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </body>
    </html>
  )
}
```

### Step 4: Create Animation Utilities

**File:** `/home/ahiya/Ahiya/wealth/src/lib/animations.ts` (NEW)

```typescript
export const DURATION = {
  fast: 0.15,      // Button hover
  normal: 0.3,     // Page transition, modal
  slow: 0.5,       // Drawer, complex layout
  progress: 0.8,   // Progress bars
}

export const EASING = {
  default: 'easeOut',
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
}

// Page transition (use on all pages)
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: DURATION.normal, ease: EASING.default },
}

// Card hover effect
export const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: DURATION.fast, ease: EASING.default },
}

// Staggered list animations
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

// Progress bar animation
export const progressBarAnimation = (percentage: number) => ({
  initial: { width: 0 },
  animate: { width: `${Math.min(percentage, 100)}%` },
  transition: { duration: DURATION.progress, ease: EASING.default },
})

// Modal/Dialog animation
export const modalAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: DURATION.fast },
}

// Success celebration (subtle bounce)
export const celebrationAnimation = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.1, 1] },
  transition: { duration: 0.4, ease: EASING.default },
}
```

### Step 5: Create Chart Color Palette

**File:** `/home/ahiya/Ahiya/wealth/src/lib/chartColors.ts` (NEW)

```typescript
// Recharts color palette (sage + warm-gray theme)
export const CHART_COLORS = {
  primary: 'hsl(140, 14%, 33%)',      // sage-600
  secondary: 'hsl(140, 13%, 42%)',    // sage-500
  tertiary: 'hsl(140, 12%, 69%)',     // sage-300
  muted: 'hsl(24, 5%, 46%)',          // warm-gray-500
  accent: 'hsl(45, 74%, 52%)',        // gold
  grid: 'hsl(24, 6%, 91%)',           // warm-gray-200
  text: 'hsl(24, 7%, 27%)',           // warm-gray-700
}

// Category colors (for pie charts)
export const CATEGORY_COLORS = [
  'hsl(140, 14%, 33%)',  // sage-600
  'hsl(140, 13%, 42%)',  // sage-500
  'hsl(140, 12%, 69%)',  // sage-300
  'hsl(24, 6%, 34%)',    // warm-gray-600
  'hsl(45, 74%, 52%)',   // gold
  'hsl(204, 52%, 67%)',  // sky
  'hsl(255, 85%, 85%)',  // lavender
  'hsl(140, 13%, 56%)',  // sage-400
]

// Recharts config object
export const CHART_CONFIG = {
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.grid,
    opacity: 0.3,
  },
  xAxis: {
    stroke: CHART_COLORS.muted,
    fontSize: 12,
    tickLine: false,
  },
  yAxis: {
    stroke: CHART_COLORS.muted,
    fontSize: 12,
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    labelStyle: {
      color: 'hsl(var(--foreground))',
      fontWeight: 600,
    },
  },
}
```

---

## Component Patterns (Builder-1)

### Pattern 1: StatCard Component

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/stat-card.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardHover } from '@/lib/animations'

interface StatCardProps {
  title: string
  value: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon: LucideIcon
  variant?: 'default' | 'elevated'
  className?: string
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <motion.div {...cardHover}>
      <Card
        className={cn(
          'transition-all duration-300',
          variant === 'elevated' &&
            'bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200',
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-warm-gray-600">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-sage-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-sans tabular-nums text-warm-gray-900">
            {value}
          </div>

          {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-sage-600" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-4 w-4 text-warm-gray-500" />
              ) : null}
              <span
                className={cn(
                  trend.direction === 'up' && 'text-sage-600',
                  trend.direction === 'down' && 'text-warm-gray-600',
                  trend.direction === 'neutral' && 'text-warm-gray-500'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
```

**Usage:**
```typescript
import { DollarSign } from 'lucide-react'

<StatCard
  title="Net Worth"
  value="$42,350"
  trend={{ value: '+12% from last month', direction: 'up' }}
  icon={DollarSign}
  variant="elevated"
/>
```

### Pattern 2: AffirmationCard Component

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/affirmation-card.tsx` (NEW)

```typescript
'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

const affirmations = [
  'You are building a secure financial future',
  'Every transaction is a conscious choice',
  'Your worth is not your net worth',
  'Financial wellness is a journey, not a destination',
  "You're making progress, even when it's slow",
  'Small steps today create big changes tomorrow',
  'You have the power to shape your financial story',
  'Mindful spending is an act of self-care',
  'Your financial goals are worth the effort',
  'Celebrate every win, no matter how small',
]

export function AffirmationCard() {
  const dailyAffirmation = useMemo(() => {
    // Rotate based on day of month (consistent per day)
    const index = new Date().getDate() % affirmations.length
    return affirmations[index]
  }, [])

  return (
    <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6 text-center">
        <Sparkles className="h-5 w-5 mx-auto text-gold mb-3" />
        <p className="font-serif text-xl text-warm-gray-800 italic leading-relaxed">
          "{dailyAffirmation}"
        </p>
      </CardContent>
    </Card>
  )
}
```

**Usage:**
```typescript
// On dashboard page
<AffirmationCard />
```

### Pattern 3: EmptyState Component

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/empty-state.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="rounded-full bg-sage-50 p-6 mb-4">
        <Icon className="h-12 w-12 text-sage-500" />
      </div>
      <h3 className="text-lg font-serif font-semibold text-warm-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-warm-gray-600 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  )
}
```

**Usage:**
```typescript
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

<EmptyState
  icon={Wallet}
  title="No accounts yet"
  description="Connect your first account to start tracking your financial journey"
  action={
    <Button onClick={handleConnect} className="bg-sage-600">
      <Plus className="mr-2 h-4 w-4" />
      Connect Account
    </Button>
  }
/>
```

### Pattern 4: EncouragingProgress Component

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/encouraging-progress.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { progressBarAnimation } from '@/lib/animations'

interface EncouragingProgressProps {
  percentage: number
  spent: number
  budget: number
  className?: string
}

export function EncouragingProgress({
  percentage,
  spent,
  budget,
  className,
}: EncouragingProgressProps) {
  const getVariant = () => {
    if (percentage < 50) return 'excellent'
    if (percentage < 75) return 'good'
    if (percentage < 90) return 'approaching'
    if (percentage < 100) return 'nearLimit'
    return 'attention'
  }

  const variant = getVariant()

  const variantStyles = {
    excellent: 'from-sage-400 to-sage-600',
    good: 'from-sage-300 to-sage-500',
    approaching: 'from-gold/50 to-gold',
    nearLimit: 'from-gold/60 to-gold/90',
    attention: 'from-coral/30 to-coral/60',
  }

  const getMessage = () => {
    if (percentage < 50) return 'Great start! 🌱'
    if (percentage < 75) return "You're doing well!"
    if (percentage < 90) return 'Almost there!'
    if (percentage < 100) return 'Excellent progress!'
    return 'Time to review this budget'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-gray-600">{getMessage()}</span>
        <span className="font-medium tabular-nums text-warm-gray-700">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-warm-gray-100">
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            variantStyles[variant]
          )}
          {...progressBarAnimation(percentage)}
        />
      </div>

      <p className="text-xs text-warm-gray-500 tabular-nums">
        ${spent.toFixed(2)} of ${budget.toFixed(2)}
      </p>
    </div>
  )
}
```

**Usage:**
```typescript
<EncouragingProgress
  percentage={75}
  spent={750}
  budget={1000}
/>
```

### Pattern 5: PageTransition Wrapper

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/page-transition.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return <motion.div {...pageTransition}>{children}</motion.div>
}
```

**Usage (on EVERY page):**
```typescript
// app/(dashboard)/dashboard/page.tsx
import { PageTransition } from '@/components/ui/page-transition'

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* page content */}
      </div>
    </PageTransition>
  )
}
```

### Pattern 6: ProgressRing Component (for Goals)

**File:** `/home/ahiya/Ahiya/wealth/src/components/ui/progress-ring.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'

interface ProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={className}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--warm-gray-200))"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--sage-600))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-warm-gray-900 tabular-nums">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}
```

**Usage:**
```typescript
<div className="relative">
  <ProgressRing percentage={67} />
</div>
```

---

## Form Handling Pattern

### Pattern: Form with react-hook-form + zod + tRPC + Toast

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// 1. Define schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
})

type FormData = z.infer<typeof formSchema>

export function ExampleForm({ onSuccess }: { onSuccess?: () => void }) {
  // 2. Setup form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      amount: 0,
    },
  })

  // 3. Setup mutation with toast
  const createMutation = trpc.something.create.useMutation({
    onSuccess: () => {
      toast.success('Created successfully!', {
        description: 'Your item has been saved.',
      })
      form.reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to create', {
        description: error.message,
      })
    },
  })

  // 4. Submit handler
  const onSubmit = (data: FormData) => {
    createMutation.mutate(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-sage-600 hover:bg-sage-700"
        >
          {createMutation.isPending ? 'Creating...' : 'Create'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Chart Theming Pattern

### Pattern: Recharts with Sage/Warm-Gray Theme

```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'

interface ChartData {
  month: string
  value: number
}

export function ExampleChart({ data }: { data: ChartData[] }) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-warm-gray-700">
          {payload[0].payload.month}
        </p>
        <p className="text-lg font-bold text-sage-600">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid {...CHART_CONFIG.cartesianGrid} />

        <XAxis
          dataKey="month"
          {...CHART_CONFIG.xAxis}
        />

        <YAxis
          {...CHART_CONFIG.yAxis}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={3}
          dot={{
            fill: CHART_COLORS.primary,
            r: 5,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))',
          }}
          activeDot={{
            r: 7,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))',
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## Animation Patterns

### Pattern 1: Animated List with Stagger

```typescript
'use client'

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'

export function AnimatedList({ items }: { items: any[] }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={staggerItem}>
          <ItemCard {...item} />
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### Pattern 2: Hover Animation on Cards

```typescript
'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cardHover } from '@/lib/animations'

export function HoverCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...cardHover}>
      <Card>{children}</Card>
    </motion.div>
  )
}
```

---

## Toast Notification Patterns

```typescript
import { toast } from 'sonner'

// Success
toast.success('Transaction created!', {
  description: 'Your transaction has been saved.',
  duration: 3000,
})

// Error
toast.error('Failed to save', {
  description: error.message,
})

// Loading (promise-based)
toast.promise(
  createMutation.mutateAsync(data),
  {
    loading: 'Creating transaction...',
    success: 'Transaction created!',
    error: 'Failed to create transaction',
  }
)

// Info
toast.info('AI categorization complete', {
  description: '42 transactions categorized',
})
```

---

## Import Order Convention

```typescript
// 1. React/Next
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'

// 3. Internal utilities/lib
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'

// 4. Components (UI first, then features)
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AccountCard } from '@/components/accounts/AccountCard'

// 5. Icons
import { DollarSign, TrendingUp } from 'lucide-react'

// 6. Types
import type { Account, Transaction } from '@prisma/client'
```

---

## Code Quality Standards

### TypeScript
- NO `any` types (use `unknown` or proper types)
- Always define prop interfaces
- Use discriminated unions for variants

### Accessibility
- All buttons have aria-labels
- Forms have proper labels
- Colors meet WCAG AA contrast (4.5:1 minimum)
- Keyboard navigation works

### Performance
- Use transform/opacity for animations (GPU accelerated)
- Debounce filter inputs
- Lazy load off-screen images
- React.memo for expensive components

### Error Handling
- Always show toast on mutation errors
- Graceful empty states
- Loading states on all async actions

---

**END OF PATTERNS.MD - This is your implementation bible. Follow it precisely.**
