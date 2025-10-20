# Explorer 2 Report: Beautiful Frontend & Design System

## Executive Summary

The current Wealth app uses shadcn/ui with default styling - functional but generic. Iteration 3 requires transforming this into a beautiful, calming "mindful money" experience with a sage green palette, serif/sans-serif typography mix, smooth animations, and encouraging UX. This report analyzes design system implementation, component redesigns, animation patterns, and provides detailed technical recommendations for creating a finance app that reduces anxiety rather than creating it.

## Discoveries

### Current State Analysis

**Existing Infrastructure (GOOD FOUNDATION):**
- shadcn/ui component library already installed (18 components)
- Tailwind CSS 3.4.1 with CSS variables system in place
- HSL color system ready for palette swap
- Basic component structure (Card, Button, Badge, Dialog, etc.)
- Recharts library for data visualization
- Next.js 14 (supports next/font for typography)
- React Hook Form with Zod validation

**Current Design Limitations:**
- Generic blue/gray color scheme (primary: `hsl(142, 76%, 36%)` is a bright green, not calming sage)
- No custom typography - using system fonts
- Red/green for financial states (anxiety-inducing)
- Basic hover states, no micro-animations
- Harsh color transitions in budget progress bars
- Standard card shadows, no elevated design language
- No empty states, loading states basic
- Charts use default Recharts colors (too saturated)

**Missing Components for "Mindful Money" UX:**
- Affirmation/quote cards
- Celebration animations
- Progress rings (for goals)
- Timeline components
- Stat cards with trend indicators
- Enhanced empty states
- Loading skeletons with calm pulsing
- Toast notifications (using basic shadcn/ui toast)

### Competitive Design Analysis

**Copilot Money (copilot.money):**
- Clean white backgrounds with subtle shadows
- Mint green primary color (#1CC29F-ish)
- Sans-serif throughout (Inter-like)
- Card-based layouts with ample spacing
- Smooth page transitions
- Encouraging micro-copy ("You're doing great!")
- Soft gradients on hero sections

**Monarch Money:**
- Purple/indigo primary (#6366F1-ish)
- Clean data tables with hover states
- Category icons with colored backgrounds
- Progress bars with gradient fills
- Chart colors: soft palette (not saturated)
- Dashboard: metric cards in grid layout
- Trend indicators with arrows and percentages

**YNAB (You Need A Budget):**
- Encouraging language ("Give Every Dollar a Job")
- Yellow/orange accent colors (warm, not alarming)
- Progress bars that celebrate, not shame
- Age of Money metric (unique, positive)
- Budget categories: friendly icons
- Green for "ready to assign" (positive framing)
- Educational tooltips throughout

**Key Patterns Identified:**
1. **Soft, desaturated colors** - no harsh reds/greens
2. **Card-based layouts** - breathing room between sections
3. **Encouraging micro-copy** - positive reinforcement
4. **Icons everywhere** - visual hierarchy
5. **Smooth animations** - page transitions, hover states
6. **Progress visualization** - bars, rings, percentages
7. **Contextual help** - tooltips, empty states
8. **Responsive grids** - 2-3 columns on desktop

## Patterns Identified

### Pattern 1: Calming Color Application

**Description:** Replace anxiety-inducing red/green with soft, contextual colors

**Implementation:**
```typescript
// Instead of: red = bad, green = good
// Use: warm-gray = neutral, sage = growth, coral = attention-needed

// Bad (current)
className={amount < 0 ? 'text-red-600' : 'text-green-600'}

// Good (proposed)
className={amount < 0 ? 'text-warm-gray-700' : 'text-sage-600'}
```

**Use Case:** 
- Transaction amounts: use warm-gray for expenses, sage for income
- Budget progress: sage (on track) → gold (approaching) → coral (needs attention)
- Account balances: warm-gray default, sage for positive growth

**Recommendation:** STRONGLY RECOMMENDED - this is core to "mindful money" philosophy

### Pattern 2: Serif Headlines + Sans-serif Body

**Description:** Typographic hierarchy using Crimson Pro (serif) for headlines, Inter (sans-serif) for body

**Implementation:**
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { Crimson_Pro } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const crimsonPro = Crimson_Pro({ 
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
  display: 'swap'
})

// Apply: className={`${inter.variable} ${crimsonPro.variable}`}
```

**Tailwind Config:**
```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-sans)', 'system-ui'],
      serif: ['var(--font-serif)', 'Georgia'],
    }
  }
}
```

**Use Case:**
- H1, H2, H3: `font-serif` (Crimson Pro)
- Body text, buttons, labels: `font-sans` (Inter)
- Dashboard greeting: Large serif with affirmation
- Data/numbers: `font-sans tabular-nums` (consistent width)

**Recommendation:** ESSENTIAL - creates sophisticated, calm visual hierarchy

### Pattern 3: Framer Motion Page Transitions

**Description:** Smooth page animations reduce perceived loading time and add polish

**Implementation:**
```typescript
// components/PageTransition.tsx
'use client'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

**Use Case:**
- Wrap all page content in PageTransition
- Modal/dialog appearances
- List item staggered animations
- Chart data drawing in

**Recommendation:** HIGH PRIORITY - significantly improves perceived performance

### Pattern 4: Encouraging Progress Bars

**Description:** Progress indicators that celebrate success and gently warn, never shame

**Current (BudgetProgressBar.tsx):**
```typescript
// Uses harsh red-500, yellow-500, green-500
getColorClasses() {
  case 'over': return 'bg-red-500'  // Too harsh!
}
```

**Proposed:**
```typescript
// components/ui/progress-enhanced.tsx
export function EncouragingProgress({ 
  percentage, 
  variant = 'default' 
}: Props) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'excellent':
        return 'from-sage-400 to-sage-600'
      case 'good':
        return 'from-sage-300 to-sage-500'
      case 'approaching':
        return 'from-gold/50 to-gold'
      case 'attention':
        return 'from-coral/30 to-coral/60'
    }
  }
  
  return (
    <div className="relative">
      <div className="h-3 rounded-full bg-warm-gray-100 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getVariantStyles()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-sm text-warm-gray-600 mt-1">
        {getEncouragingMessage(percentage)}
      </p>
    </div>
  )
}

function getEncouragingMessage(percentage: number): string {
  if (percentage < 50) return "Great start! 🌱"
  if (percentage < 75) return "You're doing well!"
  if (percentage < 90) return "Almost there!"
  if (percentage < 100) return "Excellent progress!"
  return "Time to review this budget"
}
```

**Recommendation:** CRITICAL - this embodies the "mindful money" philosophy

### Pattern 5: Affirmation Cards

**Description:** Daily financial affirmations on dashboard for positive reinforcement

**Implementation:**
```typescript
// components/dashboard/AffirmationCard.tsx
const affirmations = [
  "You are building a secure financial future",
  "Every transaction is a conscious choice",
  "Your worth is not your net worth",
  "Financial wellness is a journey, not a destination",
  "You're making progress, even when it's slow",
]

export function AffirmationCard() {
  const dailyAffirmation = useMemo(() => {
    const index = new Date().getDate() % affirmations.length
    return affirmations[index]
  }, [])
  
  return (
    <Card className="bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200">
      <CardContent className="p-6 text-center">
        <Sparkles className="h-5 w-5 mx-auto text-gold mb-3" />
        <p className="font-serif text-xl text-warm-gray-800 italic">
          "{dailyAffirmation}"
        </p>
      </CardContent>
    </Card>
  )
}
```

**Use Case:** Top of dashboard, rotates daily

**Recommendation:** HIGH VALUE - unique differentiator, minimal complexity

### Pattern 6: Stat Cards with Trend Indicators

**Description:** Dashboard metrics with visual trends and context

**Implementation:**
```typescript
// components/ui/stat-card.tsx
export function StatCard({ 
  title, 
  value, 
  trend, 
  trendDirection, 
  icon: Icon 
}: Props) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
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
            {trendDirection === 'up' ? (
              <TrendingUp className="h-4 w-4 text-sage-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-warm-gray-500" />
            )}
            <span className="text-warm-gray-600">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Recommendation:** ESSENTIAL - replaces current dashboard cards

### Pattern 7: Empty States with Encouragement

**Description:** Actionable, encouraging empty states instead of blank screens

**Implementation:**
```typescript
// components/ui/empty-state.tsx
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="rounded-full bg-sage-50 p-6 mb-4">
        <Icon className="h-12 w-12 text-sage-500" />
      </div>
      <h3 className="text-lg font-serif font-semibold text-warm-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-warm-gray-600 max-w-sm mb-6">
        {description}
      </p>
      {action}
    </motion.div>
  )
}

// Usage example:
<EmptyState
  icon={Wallet}
  title="No accounts yet"
  description="Connect your first account to start tracking your financial journey"
  action={
    <Button onClick={openPlaidLink} className="bg-sage-600">
      <Plus className="mr-2 h-4 w-4" />
      Connect Account
    </Button>
  }
/>
```

**Recommendation:** HIGH PRIORITY - significantly improves first-run experience

### Pattern 8: Skeleton Loaders with Calm Pulsing

**Description:** Loading states that feel smooth and intentional

**Implementation:**
```typescript
// Update components/ui/skeleton.tsx
export function Skeleton({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-r from-warm-gray-100 via-warm-gray-50 to-warm-gray-100 bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  )
}

// Add to tailwind.config.ts
animation: {
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

**Recommendation:** MEDIUM PRIORITY - polish, not critical

## Complexity Assessment

### High Complexity Areas

#### 1. Design System Foundation (SPLIT CANDIDATE)
**Why it's complex:**
- CSS variable system needs complete overhaul (39 color tokens)
- Tailwind config extension with custom colors
- Global styles update (globals.css)
- Font loading and configuration
- Theme provider setup (if dark mode future)

**Estimated builder splits:** Should be ONE builder foundation task
**Time estimate:** 45-60 minutes
**Recommendation:** Builder-3 should handle this as atomic task - splitting would create integration hell

#### 2. Component Library Enhancement (SPLIT CANDIDATE)
**Components to create/enhance:**
- StatCard (new)
- EncouragingProgress (enhance existing)
- AffirmationCard (new)
- EmptyState (new)
- ProgressRing (new - for goals)
- TimelineItem (new - for activity feed)
- CategoryBadge (enhance existing)
- LoadingSkeleton (enhance existing)
- AccountCard (enhance with hover effects)
- TransactionCard (soften colors)

**Why it's complex:**
- 10 components to create/modify
- Framer Motion integration for animations
- Consistent API design across components
- Reusable prop patterns
- TypeScript interfaces

**Estimated builder splits:** SHOULD SPLIT
- Sub-builder A: Core cards (StatCard, AffirmationCard, EmptyState) - 30 min
- Sub-builder B: Progress components (EncouragingProgress, ProgressRing) - 25 min
- Sub-builder C: Enhanced existing (AccountCard, TransactionCard, CategoryBadge) - 35 min

**Total time:** ~90 minutes
**Recommendation:** Builder-4 creates foundation, then splits into 3 sub-builders

#### 3. Page Redesigns - Dashboard & Landing (HIGH COMPLEXITY)
**Dashboard changes:**
- New layout with affirmation card
- Replace existing dashboard cards with StatCards
- Add trend indicators
- Implement PageTransition wrapper
- Recent activity timeline (not just list)
- Quick action buttons with icons

**Landing page changes:**
- Hero section with gradient (sage-50 to warm-gray-50)
- Value proposition cards with icons
- Feature showcase with mock screenshots
- Testimonial section (placeholder)
- CTA buttons with hover animations
- Responsive design (mobile hero different layout)

**Why it's complex:**
- Multiple data fetching patterns
- Animation orchestration
- Responsive layouts
- Integration with existing tRPC queries
- TypeScript type safety

**Estimated builder splits:** SHOULD SPLIT
- Sub-builder A: Landing page (hero, features, CTA) - 45 min
- Sub-builder B: Dashboard layout & affirmation - 35 min
- Sub-builder C: Dashboard cards & trends - 40 min

**Total time:** ~120 minutes
**Recommendation:** Builder-4 handles landing, Builder-5 handles dashboard with split

### Medium Complexity Areas

#### 4. Auth Pages with Supabase Auth UI Styling
**Changes needed:**
- Style Supabase Auth UI components (via CSS override)
- Centered card layout
- Brand colors applied
- Social login buttons styled
- Error/success states

**Time estimate:** 30-40 minutes (part of Builder-2's Supabase Auth task)
**Complexity:** Medium - Supabase Auth UI has specific CSS class targeting
**Recommendation:** Builder-2 handles as part of auth implementation

#### 5. Accounts & Transactions Pages
**Accounts page:**
- Grid layout (already exists)
- Enhance AccountCard hover effects
- Add empty state
- Implement PageTransition
- Filter/sort bar with new styling

**Transactions page:**
- Enhance TransactionCard colors (soften red/green)
- Add empty state
- Update filter UI with new design
- Pagination styled
- Export button enhancement

**Time estimate:** 50-60 minutes combined
**Complexity:** Medium - mostly styling existing components
**Recommendation:** Builder-5 handles both pages

#### 6. Budgets Page Redesign
**Changes needed:**
- Month selector styling
- Summary cards (use StatCard)
- BudgetProgressBar replacement (EncouragingProgress)
- Budget list cards enhancement
- Encouraging micro-copy
- Empty state

**Time estimate:** 40-50 minutes
**Complexity:** Medium - progress bar is key component
**Recommendation:** Builder-5 handles after accounts/transactions

### Low Complexity Areas

#### 7. Analytics Page - Chart Color Updates
**Changes needed:**
- Update Recharts color palettes
- Soft, desaturated colors
- Gradient fills for area charts
- Consistent color mapping
- Tooltip styling
- Legend styling

**Time estimate:** 30 minutes
**Complexity:** Low - mostly configuration
**Recommendation:** Builder-6 handles all chart updates

#### 8. Goals Page
**Changes needed:**
- Goal cards with ProgressRing
- Milestone indicators
- Target date display
- Encouraging messages
- Add goal dialog styling
- Empty state

**Time estimate:** 35-40 minutes
**Complexity:** Low-Medium - ProgressRing component exists from builder-4's work
**Recommendation:** Builder-6 handles

#### 9. Navigation & Layout
**Changes needed:**
- Sidebar icon + label styling
- Active state highlighting
- Mobile bottom nav styling
- Header user menu styling
- Logo styling

**Time estimate:** 25-30 minutes
**Complexity:** Low - mostly CSS
**Recommendation:** Builder-5 or Builder-6 handles

## Technology Recommendations

### Primary Stack (Confirmed)

#### **Framework: Next.js 14**
**Rationale:** Already in use, perfect for:
- App Router with server components
- next/font for optimized Google Fonts loading
- Image optimization for landing page
- API routes (existing tRPC integration)

#### **Styling: Tailwind CSS 3.4.1**
**Rationale:** Already configured, advantages:
- CSS variable system (`--sage-500`) integrates seamlessly
- JIT compiler for custom colors
- Responsive utilities (`md:grid-cols-2`)
- Animation utilities with tailwindcss-animate plugin
- Dark mode ready (future iteration)

**Configuration needed:**
```javascript
// tailwind.config.ts additions
theme: {
  extend: {
    colors: {
      sage: {
        50: '#f6f7f6',
        100: '#e3e8e3',
        200: '#c7d1c7',
        300: '#a3b4a3',
        400: '#7d947d',
        500: '#5f7a5f',
        600: '#4a614a',
        700: '#3d4f3d',
        800: '#2f3e2f',
        900: '#1f2b1f',
      },
      'warm-gray': {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
      },
      gold: '#d4af37',
      coral: '#ff6b6b',
      sky: '#7fb3d5',
      lavender: '#c4b5fd',
    },
    fontFamily: {
      sans: ['var(--font-sans)', 'Inter', 'system-ui'],
      serif: ['var(--font-serif)', 'Crimson Pro', 'Georgia'],
    },
    animation: {
      'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'slide-up': 'slideUp 0.3s ease-out',
      'slide-down': 'slideDown 0.3s ease-out',
    },
    keyframes: {
      slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
      slideDown: {
        '0%': { transform: 'translateY(-10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
    },
  },
}
```

#### **Typography: Google Fonts (next/font)**
**Primary Font: Inter**
- Sans-serif for body text, UI elements
- Variable font for all weights (400-700)
- Excellent legibility at small sizes
- Tabular figures for financial data

**Secondary Font: Crimson Pro**
- Serif for headlines (H1, H2, H3)
- Elegant, readable, free
- Weights: 400 (regular), 600 (semibold), 700 (bold)
- Alternative considered: Lora, Merriweather (Crimson Pro preferred for slightly lighter feel)

**Implementation:**
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { Crimson_Pro } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const crimsonPro = Crimson_Pro({ 
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
  display: 'swap',
  style: ['normal', 'italic'], // for affirmations
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

#### **Component Library: shadcn/ui**
**Rationale:** Already integrated, advantages:
- Copy-paste components (full control)
- Built on Radix UI (accessibility)
- Tailwind styling (consistent)
- TypeScript support
- Easy customization

**Additional components to install:**
```bash
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add hover-card
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add sonner  # Better toast notifications
npx shadcn-ui@latest add scroll-area
```

### Supporting Libraries

#### **Animation: framer-motion 11.x**
**Purpose:** Smooth, performant animations
**Why it's needed:** 
- Page transitions (fade, slide)
- Card hover effects (lift, scale)
- Progress bar animations (width transitions)
- Number count-up animations
- List stagger animations
- Modal/dialog enter/exit
- 60fps performance with hardware acceleration

**Installation:**
```bash
npm install framer-motion
```

**Key patterns:**
```typescript
// 1. Page transitions
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  {children}
</motion.div>

// 2. Staggered list
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.07 } },
  }}
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {item}
    </motion.div>
  ))}
</motion.div>

// 3. Hover lift
<motion.div
  whileHover={{ y: -4, scale: 1.01 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  <Card>...</Card>
</motion.div>

// 4. Number count-up (for stats)
import { useMotionValue, useTransform, animate } from 'framer-motion'

const count = useMotionValue(0)
const rounded = useTransform(count, Math.round)

useEffect(() => {
  const animation = animate(count, value, { duration: 1 })
  return animation.stop
}, [value])
```

#### **Icons: lucide-react 0.460.0**
**Purpose:** Consistent icon system
**Why it's needed:** Already in use, excellent coverage
**Key icons for financial app:**
- Wallet, CreditCard, PiggyBank, TrendingUp/Down
- DollarSign, Receipt, Target, Award
- Sparkles (for affirmations), Heart, Smile
- Plus, Edit, Trash, Check, X

**Recommendation:** Continue using, no changes needed

#### **Charts: Recharts 2.12.7**
**Purpose:** Data visualization
**Why it's needed:** Already in use, works well with React
**Configuration needed:**
- Update default color palettes
- Customize tooltip styling
- Add gradient fills
- Smooth animations

**Color palette for charts:**
```typescript
// lib/chartColors.ts
export const chartColors = {
  primary: '#5f7a5f',     // sage-500
  secondary: '#7fb3d5',   // sky
  tertiary: '#d4af37',    // gold
  quaternary: '#c4b5fd',  // lavender
  quinary: '#ff6b6b',     // coral (use sparingly)
}

export const categoryColors = [
  '#5f7a5f', // sage-500
  '#7fb3d5', // sky
  '#d4af37', // gold
  '#a8a29e', // warm-gray-400
  '#c4b5fd', // lavender
  '#7d947d', // sage-400
  '#78716c', // warm-gray-500
  '#ff6b6b', // coral
]

// For area/line charts - use gradients
export const createGradient = (id: string, color: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  </defs>
)
```

#### **Notifications: Sonner (shadcn/ui integration)**
**Purpose:** Toast notifications for success/error states
**Why it's needed:** Better than current toast implementation
**Installation:**
```bash
npx shadcn-ui@latest add sonner
```

**Usage:**
```typescript
import { toast } from 'sonner'

// Success
toast.success('Transaction added!', {
  description: 'Your purchase has been recorded',
  icon: '✨',
})

// Error (gentle)
toast.error('Oops!', {
  description: 'We couldn't save that. Please try again.',
})

// With action
toast('Budget exceeded', {
  description: 'You've spent 105% of your dining budget',
  action: {
    label: 'Review Budget',
    onClick: () => router.push('/budgets'),
  },
})
```

### Dependencies NOT Needed

**What we DON'T need:**
- `@radix-ui/themes` - shadcn/ui already uses Radix primitives
- Additional animation libraries (react-spring, anime.js) - framer-motion sufficient
- UI frameworks (Material UI, Chakra) - shadcn/ui is better for this use case
- Chart alternatives (Chart.js, Victory) - Recharts works well
- CSS-in-JS libraries (styled-components, emotion) - Tailwind preferred

## Integration Points

### External APIs

**Supabase Auth UI:**
- **Purpose:** Pre-built auth components
- **Complexity:** Medium
- **Considerations:** 
  - CSS class targeting for custom styling
  - Override default theme with CSS variables
  - Match brand colors (sage palette)
  - Ensure consistent typography
  
**Implementation:**
```css
/* globals.css - Supabase Auth UI overrides */
.supabase-auth-ui_ui-container {
  --auth-border-color: var(--sage-200);
  --auth-border-focus: var(--sage-500);
  --auth-input-background: var(--warm-gray-50);
  --auth-button-background: var(--sage-600);
  --auth-button-background-hover: var(--sage-700);
  font-family: var(--font-sans);
}

.supabase-auth-ui_ui-button {
  @apply rounded-lg transition-all hover:shadow-md;
}
```

### Internal Integrations

**Design System → Components:**
- All components consume CSS variables from globals.css
- Components use Tailwind utility classes (no inline styles)
- Consistent spacing scale (4px base unit)
- Elevation system (shadow-sm, shadow-md, shadow-lg)

**Components → Pages:**
- Pages import from shared component library
- No page-specific styling (everything reusable)
- Composition pattern (StatCard, EmptyState, etc.)
- Server components for data fetching, client for interactivity

**Animation → UI State:**
- Framer Motion AnimatePresence for conditional rendering
- LayoutGroup for shared layout animations
- useReducedMotion for accessibility

**Theme → Database:**
- User preferences stored in Supabase (future: dark mode preference)
- Category colors from database rendered in UI
- Custom color picker for category badges

## Risks & Challenges

### Technical Risks

#### Risk 1: Framer Motion Bundle Size
**Impact:** Medium - adds ~50kb to bundle
**Mitigation:** 
- Use dynamic imports for complex animations
- Only animate above-fold content initially
- Use native CSS animations for simple transitions
- Tree-shaking (import only used components)

```typescript
// Good - tree-shake
import { motion } from 'framer-motion'

// Bad - imports everything
import * as Motion from 'framer-motion'
```

#### Risk 2: Google Fonts Loading Flash
**Impact:** Low - FOUT (Flash of Unstyled Text)
**Mitigation:**
- next/font with `display: 'swap'` (already planned)
- Fallback fonts with similar metrics
- Font preloading via Next.js
- Critical CSS includes font-face declarations

```typescript
// Fallback system
fontFamily: {
  sans: ['var(--font-sans)', 'Inter', '-apple-system', 'system-ui'],
  serif: ['var(--font-serif)', 'Crimson Pro', 'Georgia', 'serif'],
}
```

#### Risk 3: CSS Variable HSL to RGB Conversion
**Impact:** Low - some Tailwind utilities expect RGB
**Mitigation:**
- Use HSL format in CSS variables (already supported by Tailwind 3.4+)
- Test opacity modifiers (e.g., `bg-sage-500/50`)
- Ensure compatibility with shadcn/ui components

```css
/* globals.css - HSL format works with Tailwind */
:root {
  --sage-500: 140 13% 42%; /* HSL without hsl() wrapper */
}

/* Usage in Tailwind - works automatically */
.bg-sage-500 { background-color: hsl(var(--sage-500)); }
.bg-sage-500/50 { background-color: hsl(var(--sage-500) / 0.5); }
```

#### Risk 4: Recharts Custom Styling Complexity
**Impact:** Medium - Recharts has nested SVG structure
**Mitigation:**
- Use Recharts style props (not CSS selectors)
- Create wrapper components for consistent styling
- Document color mapping in lib/chartColors.ts
- Test tooltip rendering with new colors

### Complexity Risks

#### Risk 1: Component API Consistency
**Likelihood:** Medium - 10 new/enhanced components
**Impact:** High - inconsistent APIs hurt developer experience
**Mitigation:**
- Define component prop patterns upfront
- Use TypeScript discriminated unions for variants
- Code review checklist for component APIs
- Document in Storybook (future) or README

```typescript
// Good - consistent variant pattern
type StatCardProps = {
  title: string
  value: string
  variant?: 'default' | 'success' | 'warning'
  trend?: { value: string; direction: 'up' | 'down' }
}

type ProgressProps = {
  percentage: number
  variant?: 'default' | 'success' | 'warning'
  showLabel?: boolean
}
```

#### Risk 2: Builder Handoff for Animations
**Likelihood:** High - animations require iteration
**Impact:** Medium - builders may over/under-animate
**Mitigation:**
- Provide animation code snippets in requirements
- Set duration/easing standards (0.3s ease-out default)
- Use useReducedMotion for accessibility
- Test on low-end devices

**Animation Guidelines for Builders:**
```typescript
// Standard durations
const DURATION = {
  fast: 0.15,      // button hover
  normal: 0.3,     // page transition, modal
  slow: 0.5,       // drawer, complex layout
  progress: 0.8,   // progress bars, number count
}

// Standard easings
const EASING = {
  default: 'easeOut',
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: { type: 'spring', stiffness: 300, damping: 25 },
}
```

#### Risk 3: Responsive Design Breakpoints
**Likelihood:** Medium - 8 pages to redesign
**Impact:** High - mobile experience critical
**Mitigation:**
- Mobile-first design approach
- Test all breakpoints (sm, md, lg, xl)
- Use Tailwind responsive utilities consistently
- Dashboard layout: single column on mobile, grid on desktop

```typescript
// Standard responsive patterns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

<div className="flex flex-col md:flex-row items-start md:items-center gap-2">
  {/* Flex content */}
</div>
```

#### Risk 4: Color Palette Application Inconsistency
**Likelihood:** High - 6 builders applying colors
**Impact:** High - inconsistent colors break "calm" aesthetic
**Mitigation:**
- Document color usage rules explicitly
- Create ColorIntent enum/type
- Code review for color usage
- Use semantic tokens (not raw colors)

**Color Usage Rules:**
```typescript
// ✅ DO: Use semantic intent
<p className="text-warm-gray-700">Body text</p>
<Button className="bg-sage-600">Primary action</Button>
<Badge className="bg-coral/10 text-coral">Attention needed</Badge>

// ❌ DON'T: Use colors without semantic meaning
<p className="text-red-600">Error</p>  // Use text-coral
<p className="text-green-600">Success</p>  // Use text-sage-600

// Color intent mapping
const ColorIntent = {
  // Typography
  heading: 'text-warm-gray-900',
  body: 'text-warm-gray-700',
  muted: 'text-warm-gray-500',
  
  // States
  success: 'text-sage-600',
  growth: 'text-sage-600',
  neutral: 'text-warm-gray-700',
  attention: 'text-coral',
  warning: 'text-gold',
  
  // Backgrounds
  surface: 'bg-white',
  surfaceElevated: 'bg-warm-gray-50',
  primary: 'bg-sage-600',
  primaryHover: 'bg-sage-700',
  
  // Borders
  default: 'border-warm-gray-200',
  focus: 'border-sage-500',
} as const
```

## Recommendations for Planner

### 1. Prioritize Design System Foundation First
**Rationale:** All other work depends on this foundation

**What Builder-3 should deliver:**
- Complete color palette in globals.css (39 CSS variables)
- Tailwind config with sage/warm-gray colors
- Google Fonts setup (Inter + Crimson Pro)
- Updated shadcn/ui theme tokens
- framer-motion installation and basic PageTransition component
- Color usage documentation (ColorIntent rules)

**Critical success factors:**
- HSL format for all CSS variables
- Font loading with proper fallbacks
- Test one component with new colors before proceeding

### 2. Split Component Library Work into 3 Sub-Builders
**Rationale:** 10 components is too much for one builder, but they share dependencies

**Sub-builder allocation:**
- **Sub-builder A (30 min):** StatCard, AffirmationCard, EmptyState
  - Focus: New components with framer-motion
  - Deliverable: 3 fully functional, reusable components
  
- **Sub-builder B (25 min):** EncouragingProgress, ProgressRing  
  - Focus: Progress visualization with animations
  - Deliverable: 2 components with encouraging messaging
  
- **Sub-builder C (35 min):** AccountCard, TransactionCard, CategoryBadge enhancements
  - Focus: Soften existing components, add hover effects
  - Deliverable: 3 enhanced components with new color palette

**Dependencies:** All depend on Builder-3's design system foundation

### 3. Landing Page Separate from Dashboard Redesign
**Rationale:** Different concerns, can be parallelized

**Landing page (Builder-4, 45 min):**
- Marketing focus, no data fetching
- Hero, features, CTAs
- Can work independently
- Uses StatCard for feature showcase

**Dashboard (Builder-5 with split, 75 min):**
- Sub-builder A: Layout + affirmation (35 min)
- Sub-builder B: Cards + trends (40 min)
- Complex data fetching
- Uses multiple new components

### 4. Batch "Styling Updates" for Efficiency
**Rationale:** Similar work, context switching cost

**Builder-5 batch: Accounts + Transactions + Budgets (90 min)**
- All are "enhance existing with new design"
- Apply new colors, add empty states
- Update card hover effects
- Similar patterns across all three

**Builder-6 batch: Analytics + Goals (65 min)**
- Both heavy on data visualization
- Chart color updates
- Progress ring usage
- Similar component patterns

### 5. Provide Animation Code Snippets Upfront
**Rationale:** Animations are hard to describe, easy to show

**Include in requirements:**
```typescript
// Page transition (every page)
import { PageTransition } from '@/components/PageTransition'

export default function SomePage() {
  return (
    <PageTransition>
      {/* page content */}
    </PageTransition>
  )
}

// Card hover (accounts, transactions, budgets)
<motion.div
  whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
  transition={{ duration: 0.2 }}
>
  <Card>...</Card>
</motion.div>

// Progress bar animation (budgets)
<motion.div
  className="h-3 rounded-full bg-gradient-to-r from-sage-400 to-sage-600"
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
/>

// Staggered list (transactions)
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      <TransactionCard {...item} />
    </motion.div>
  ))}
</motion.div>

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}
```

### 6. Create Color Palette Reference Sheet
**Rationale:** Builders need quick lookup for "which color when"

**Include in .2L/iteration-3/design-reference.md:**
```markdown
# Color Usage Guide

## Typography
- Headlines: `text-warm-gray-900` + `font-serif`
- Body: `text-warm-gray-700` + `font-sans`
- Muted: `text-warm-gray-500`
- Links: `text-sage-600 hover:text-sage-700`

## Financial States
- Income/Growth: `text-sage-600` (NOT green-600)
- Expenses: `text-warm-gray-700` (NOT red-600)
- Positive trend: `text-sage-600` + TrendingUp icon
- Negative trend: `text-warm-gray-600` + TrendingDown icon
- Needs attention: `text-coral`
- Warning: `text-gold`

## Buttons
- Primary: `bg-sage-600 hover:bg-sage-700 text-white`
- Secondary: `bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-900`
- Destructive: `bg-coral hover:bg-coral/90 text-white`
- Ghost: `hover:bg-warm-gray-50 text-warm-gray-700`

## Backgrounds
- Page: `bg-warm-gray-50`
- Card: `bg-white`
- Card elevated: `bg-gradient-to-br from-sage-50 to-warm-gray-50`
- Badge: `bg-{color}/10 text-{color}`
```

### 7. Define Success Metrics for "Calm" UX
**Rationale:** Subjective goal needs objective measures

**Testable criteria:**
- [ ] No usage of `red-500`, `red-600`, `green-500`, `green-600` in codebase (use coral/sage)
- [ ] All pages have PageTransition wrapper (smooth entry)
- [ ] All hover states have <300ms duration (feels instant)
- [ ] Empty states have actionable CTAs (not just "No data")
- [ ] Progress indicators show encouraging messages
- [ ] Dashboard has affirmation card visible on load
- [ ] All animations respect prefers-reduced-motion
- [ ] Font loading doesn't block render (swap, not block)

### 8. Budget Extra Time for Polish
**Rationale:** "Beautiful" takes iteration, not just implementation

**Time allocation:**
- Initial implementation: 3.5 hours (as planned)
- Polish pass: 30-45 minutes (not in current estimate)
- Focus areas for polish:
  - Spacing consistency (use 4px base unit)
  - Hover state smoothness
  - Mobile responsive refinement
  - Animation easing adjustments
  - Color contrast verification (WCAG AA)

**Recommendation:** Builder-6 does polish pass after all pages done

## Resource Map

### Critical Files/Directories

#### Design System Foundation
- `/src/app/globals.css` - CSS variables, theme tokens
- `/tailwind.config.ts` - Color palette, fonts, animations
- `/src/app/layout.tsx` - Font loading, global layout
- `/src/lib/utils.ts` - cn() utility, formatCurrency update

#### Component Library
- `/src/components/ui/` - shadcn/ui base components (18 files)
- `/src/components/ui/stat-card.tsx` - NEW (create)
- `/src/components/ui/affirmation-card.tsx` - NEW (create)
- `/src/components/ui/empty-state.tsx` - NEW (create)
- `/src/components/ui/progress-ring.tsx` - NEW (create)
- `/src/components/ui/page-transition.tsx` - NEW (create)
- `/src/components/budgets/BudgetProgressBar.tsx` - ENHANCE (exists)
- `/src/components/accounts/AccountCard.tsx` - ENHANCE (exists)
- `/src/components/transactions/TransactionCard.tsx` - ENHANCE (exists)
- `/src/components/categories/CategoryBadge.tsx` - ENHANCE (exists)

#### Page Files (Redesign)
- `/src/app/page.tsx` - Landing page (full redesign)
- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard (full redesign)
- `/src/app/(auth)/signin/page.tsx` - Auth styling (Supabase UI)
- `/src/app/(dashboard)/accounts/page.tsx` - Enhance existing
- `/src/app/(dashboard)/transactions/page.tsx` - Enhance existing
- `/src/app/(dashboard)/budgets/page.tsx` - Enhance existing
- `/src/app/(dashboard)/analytics/page.tsx` - Chart colors
- `/src/app/(dashboard)/goals/page.tsx` - Add progress rings

#### Dashboard Cards (Update)
- `/src/components/dashboard/NetWorthCard.tsx` - Convert to StatCard
- `/src/components/dashboard/IncomeVsExpensesCard.tsx` - Convert to StatCard
- `/src/components/dashboard/TopCategoriesCard.tsx` - Convert to StatCard
- `/src/components/dashboard/BudgetSummaryCard.tsx` - Convert to StatCard
- `/src/components/dashboard/RecentTransactionsCard.tsx` - Style update

#### Chart Components (Color Update)
- `/src/components/analytics/SpendingByCategoryChart.tsx` - Color palette
- `/src/components/analytics/SpendingTrendsChart.tsx` - Color palette
- `/src/components/analytics/MonthOverMonthChart.tsx` - Color palette
- `/src/components/analytics/IncomeSourcesChart.tsx` - Color palette
- `/src/components/analytics/NetWorthChart.tsx` - Color palette
- `/src/lib/chartColors.ts` - NEW (create)

### Key Dependencies

#### Installed (Already in package.json)
- `next@14.2.33` - Framework
- `tailwindcss@3.4.1` - Styling
- `tailwindcss-animate@1.0.7` - Animation utilities
- `recharts@2.12.7` - Charts
- `lucide-react@0.460.0` - Icons
- `date-fns@3.6.0` - Date formatting
- `class-variance-authority@0.7.0` - CVA for component variants
- `clsx@2.1.0` + `tailwind-merge@2.2.0` - cn() utility

#### To Install
```bash
npm install framer-motion
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add hover-card
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add sonner
npx shadcn-ui@latest add scroll-area
```

#### Package.json additions (for Builder-3):
```json
{
  "dependencies": {
    "framer-motion": "^11.0.0"
  }
}
```

### Testing Infrastructure

#### Visual Regression Testing (Manual)
**Tools:** Browser DevTools, responsive mode
**Checklist:**
- [ ] Test all breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide)
- [ ] Test all color variants: hover states, active states, disabled states
- [ ] Test empty states: no accounts, no transactions, no budgets
- [ ] Test loading states: skeleton loaders, spinners
- [ ] Test error states: form validation, API errors
- [ ] Test success states: toast notifications, inline messages

#### Accessibility Testing
**Tools:** Chrome Lighthouse, axe DevTools
**Criteria:**
- [ ] Color contrast: WCAG AA (4.5:1 for normal text, 3:1 for large)
- [ ] Keyboard navigation: tab order, focus visible
- [ ] Screen reader: ARIA labels, semantic HTML
- [ ] Reduced motion: respects prefers-reduced-motion
- [ ] Focus management: modals trap focus, proper restoration

**Key contrast checks:**
```css
/* Must pass WCAG AA */
.text-warm-gray-700 on .bg-white /* Body text */
.text-sage-600 on .bg-white /* Links, primary actions */
.text-white on .bg-sage-600 /* Button text */
.text-coral on .bg-white /* Attention text */

/* Use this tool: https://webaim.org/resources/contrastchecker/ */
```

#### Animation Performance Testing
**Tools:** Chrome DevTools Performance tab
**Criteria:**
- [ ] 60fps during animations (no jank)
- [ ] No layout thrashing (batch DOM reads/writes)
- [ ] Use transform/opacity for animations (GPU accelerated)
- [ ] Limit simultaneous animations (<5)
- [ ] Test on low-end device (throttle CPU 4x)

```typescript
// ✅ Good - GPU accelerated
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
/>

// ❌ Bad - triggers layout recalculation
<motion.div
  initial={{ opacity: 0, marginTop: 10 }}
  animate={{ opacity: 1, marginTop: 0 }}
/>
```

## Questions for Planner

### Technical Decisions

1. **Dark Mode Scope:** Requirements mention "dark mode out of scope." Should we structure CSS variables to make dark mode EASY to add in Iteration 4, or optimize only for light mode?
   - **Recommendation:** Structure for future dark mode (use semantic tokens, not hardcoded values), but don't implement switcher

2. **Animation Opt-Out:** Should we provide a user setting to disable animations (beyond prefers-reduced-motion), or is system setting sufficient?
   - **Recommendation:** System setting sufficient for Iteration 3, add user toggle in Iteration 4

3. **Affirmation Cadence:** Daily affirmation rotates once per day (by date modulo). Should we add ability to manually refresh, or keep it daily?
   - **Recommendation:** Keep daily-only for simplicity, maintains "calm" philosophy

4. **Font Weights:** Crimson Pro at 400/600/700 vs. 400/700 only (reduces font file size ~50kb)?
   - **Recommendation:** Use 400/700 only, skip 600 (bold sufficient for emphasis)

### Implementation Scope

5. **Supabase Auth UI Depth:** How much customization? Full rebrand (CSS overrides) or minimal (just colors)?
   - **Recommendation:** Full rebrand - this is a user's first impression, worth the extra 15 minutes

6. **Empty State Illustrations:** Text + icon only, or add SVG illustrations (increases scope ~30 min)?
   - **Recommendation:** Icon only for Iteration 3, illustrations in future iteration

7. **Dashboard Affirmation Source:** Hardcoded array (5-10 affirmations) or database-driven (user can add)?
   - **Recommendation:** Hardcoded array, 10 affirmations, rotates daily (simple, no DB changes)

8. **Progress Ring Complexity:** Simple circular progress (like dasharray trick) or full-featured (with labels, milestones)?
   - **Recommendation:** Simple for Iteration 3 (15 min), full-featured in Iteration 4

### Builder Coordination

9. **Component Library Split Timing:** Should sub-builders work in parallel, or sequentially (A → B → C)?
   - **Recommendation:** Parallel if possible (saves time), but requires good prop API design upfront

10. **Chart Color Update Scope:** Just color swaps, or also add gradients, custom tooltips, legends?
    - **Recommendation:** Colors + basic gradients for area charts (30 min), custom tooltips future iteration

11. **Mobile Navigation:** Requirements mention "bottom nav on mobile" - implement now or keep sidebar-only?
    - **Recommendation:** Implement bottom nav (adds 20 min), significantly improves mobile UX

12. **Landing Page Mock Screenshots:** Use placeholder images or create actual app screenshots?
    - **Recommendation:** Placeholder images (gray boxes with text), real screenshots in Iteration 4 after features stabilize

### Testing & Quality

13. **Accessibility Audit Timing:** After all builders done (batch) or per-builder (incremental)?
    - **Recommendation:** Quick checks per-builder (focus visible, contrast), full audit at end

14. **Performance Budget:** Set bundle size limit for framer-motion + fonts (~100kb), or optimize only if slow?
    - **Recommendation:** Monitor but don't block on it, optimize in Iteration 4 if needed

15. **Browser Support:** Test in Chrome only (dev speed) or also Safari/Firefox (broader coverage)?
    - **Recommendation:** Chrome + Safari (Mac users), Firefox optional

---

## Summary & Key Takeaways

### What Makes Finance Apps "Calm"?

**Color Psychology:**
- Greens: growth, stability, nature (use sage, not bright lime)
- Warm grays: neutrality, sophistication (use instead of harsh black/white)
- Avoid: bright reds (anxiety), neon colors (overstimulating)
- Use: soft corals for attention (not alarm), gold for achievement (not greed)

**Typography:**
- Serif headlines: trustworthy, established, human
- Sans-serif body: readable, modern, clean
- Generous spacing: breathing room reduces overwhelm
- Tabular figures: aligned numbers reduce scanning effort

**Animation:**
- Slow, smooth transitions: 300-500ms (not snappy 150ms)
- Purposeful motion: guide attention, don't distract
- Easing: ease-out (decelerates, feels natural)
- Respect reduced-motion: accessibility first

**Micro-Copy:**
- Encouraging, not judgmental: "You're doing well" vs "Budget exceeded"
- Specific, not vague: "You spent $42 less this month" vs "Spending decreased"
- Educational, not condescending: "Here's how budgets work" with dismissible tooltip
- Celebratory: "🎉 You reached your goal!" with confetti animation

### Critical Implementation Details

**CSS Variables Setup (Builder-3):**
```css
/* globals.css - EXACTLY this format */
@layer base {
  :root {
    /* Sage palette (primary) */
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

    /* Warm gray palette (neutral) */
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

    /* Accent colors */
    --gold: 45 74% 52%;
    --coral: 0 100% 71%;
    --sky: 204 52% 67%;
    --lavender: 255 85% 85%;

    /* Semantic tokens (map to palette) */
    --background: var(--warm-gray-50);
    --foreground: var(--warm-gray-900);
    --primary: var(--sage-600);
    --primary-foreground: 0 0% 100%;
    --muted: var(--warm-gray-100);
    --muted-foreground: var(--warm-gray-500);
    --card: 0 0% 100%;
    --card-foreground: var(--warm-gray-900);
    /* ... rest of semantic tokens */
  }
}
```

**Font Loading (Builder-3):**
```typescript
// app/layout.tsx
import { Inter, Crimson_Pro } from 'next/font/google'

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

**Component Variant Pattern (Builder-4):**
```typescript
// Use CVA for consistent variants
import { cva, type VariantProps } from 'class-variance-authority'

const statCardVariants = cva(
  'rounded-lg border p-6 transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white border-warm-gray-200 hover:shadow-md',
        elevated: 'bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200 hover:shadow-lg',
        flat: 'bg-warm-gray-50 border-warm-gray-100',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  title: string
  value: string
  // ...
}
```

**Animation Standards (All Builders):**
```typescript
// lib/animations.ts
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

export const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}
```

### Complexity Heat Map

**LOW (< 30 min each):**
- Chart color updates (5 files)
- Navigation styling
- Empty state component
- Skeleton loader enhancement
- Button hover animations
- Form styling updates

**MEDIUM (30-60 min each):**
- StatCard component
- AffirmationCard component
- AccountCard enhancement
- TransactionCard enhancement
- Auth pages styling
- Goals page redesign
- Accounts page redesign
- Transactions page redesign

**HIGH (60-90 min):**
- Design system foundation
- Dashboard full redesign
- Landing page full redesign
- Component library coordination

**VERY HIGH (90+ min):**
- Budgets page redesign (45 min - medium, but critical)
- Full Supabase Auth integration (not this explorer's scope)

### Builder Dependency Graph

```
Builder-1 (Database + Supabase Auth Setup)
    ↓
Builder-2 (Supabase Auth Integration)
    ↓
Builder-3 (Design System Foundation) ← CRITICAL PATH
    ↓
    ├─→ Builder-4 (Landing Page) - Independent
    │
    ├─→ Builder-4 (Component Library) ← Splits into 3 sub-builders
    │     ├─→ Sub-builder A (StatCard, Affirmation, EmptyState)
    │     ├─→ Sub-builder B (Progress components)
    │     └─→ Sub-builder C (Enhanced cards)
    │
    ├─→ Builder-5 (Dashboard + Core Pages)
    │     ├─→ Sub-builder A (Dashboard layout)
    │     ├─→ Sub-builder B (Dashboard cards)
    │     └─→ Batch: Accounts + Transactions + Budgets
    │
    └─→ Builder-6 (Analytics + Goals + Polish)
          ├─→ Chart color updates
          ├─→ Goals page with progress rings
          └─→ Final polish pass

Total estimated time: 3.5-4 hours (as specified)
Critical path: Builder-3 → Builder-4 (components) → Builder-5 (dashboard) → Builder-6 (polish)
```

### Success Metrics

**Quantitative:**
- [ ] Zero instances of `red-500`, `red-600`, `green-500`, `green-600` in codebase
- [ ] All pages load with CSS in <100ms (no FOUC)
- [ ] All animations run at 60fps (verified via DevTools)
- [ ] Color contrast ratio ≥4.5:1 for normal text (WCAG AA)
- [ ] Bundle size increase <120kb (fonts + framer-motion)

**Qualitative:**
- [ ] First impression feels "calm, not chaotic"
- [ ] Budget overspending doesn't trigger anxiety (soft colors, encouraging copy)
- [ ] Dashboard affirmation provides positive reinforcement
- [ ] Empty states guide users toward action (not abandonment)
- [ ] Animations feel purposeful (not gratuitous)

**User-Facing (Manual Test):**
- [ ] Sign up flow feels welcoming (Supabase Auth UI branded)
- [ ] Dashboard greeting personalizes experience
- [ ] Account cards easy to scan (clear hierarchy)
- [ ] Transaction list readable (not overwhelming)
- [ ] Budget progress encouraging (not shaming)
- [ ] Charts easy to understand (not cluttered)
- [ ] Mobile experience smooth (bottom nav, responsive)

---

**End of Explorer 2 Report**

This report provides the technical foundation for beautiful, calm, mindful personal finance UX. The design philosophy, implementation patterns, and detailed recommendations should enable builders to create a financial app that reduces anxiety and encourages conscious money choices.

**Key message for builders:** Every color, animation, and word choice should ask "Does this make the user feel calm and empowered?" If not, refine it.
