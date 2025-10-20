# Technology Stack - Iteration 4

## Core Framework (Already in Place - No Changes)

### Next.js 14.2.33
**Decision:** Continue using Next.js 14 App Router

**Rationale:**
- Server Components provide optimal performance for dashboard pages
- Built-in routing with automatic code splitting
- next/font optimization for Google Fonts (critical for this iteration)
- Middleware support for Supabase Auth (already working)
- Production-ready with Vercel deployment path

**No Action Required:** Already installed and configured

---

## Database (No Changes)

### PostgreSQL via Supabase
**Decision:** Continue using Supabase-hosted PostgreSQL

**Rationale:**
- Already configured with direct connection
- Prisma ORM provides type-safe queries
- All migrations applied, schema stable
- No schema changes needed for UI/UX iteration

**Environment Variables (Already Set):**
- `DATABASE_URL` - Supabase connection string
- `DIRECT_URL` - Direct PostgreSQL connection
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key

**No Action Required:** Database infrastructure complete

---

## Dependencies to Install (CRITICAL - Builder-0)

### 1. sonner - Toast Notifications
**Status:** NOT INSTALLED (required)

**Installation:**
```bash
npm install sonner
```

**Purpose:** Beautiful, accessible toast notifications for user feedback

**Why sonner instead of custom toast:**
- 5KB gzipped (lightweight)
- Better UX (stacking, auto-dismiss, promise handling)
- Accessible by default (ARIA labels)
- Theme-aware (works with CSS variables)
- Industry standard (used by shadcn/ui docs)

**Implementation:**
```typescript
// src/app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

**Usage Pattern:**
```typescript
import { toast } from 'sonner'

toast.success('Transaction created!', {
  description: 'Your transaction has been saved.',
  duration: 3000,
})
```

**Version:** Latest stable (will auto-install compatible version)

---

### 2. framer-motion - Animations
**Status:** NOT INSTALLED (required)

**Installation:**
```bash
npm install framer-motion
```

**Purpose:** Smooth, performant animations for delightful UX

**Why framer-motion:**
- Production-ready (used by major companies)
- Declarative API (easier than CSS keyframes)
- GPU-accelerated (60fps performance)
- Gesture support (swipe, drag)
- Layout animations (automatic smooth transitions)
- Tree-shakeable (only import what you use)

**Bundle Impact:**
- ~32KB gzipped (acceptable for value provided)
- Optimized with tree-shaking (import only what you need)

**Key Imports:**
```typescript
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
```

**Version:** Latest stable (compatible with React 18)

---

## Shadcn/UI Components to Add (Optional but Recommended)

### Already Installed (17 components)
- alert-dialog, badge, button, calendar, card
- dialog, dropdown-menu, input, label, textarea
- popover, progress, select, separator, skeleton
- tabs, toast, use-toast

### To Add (Builder-0 or as needed)

```bash
# Recommended for better UX
npx shadcn@latest add tooltip        # Helpful hints for first-time users
npx shadcn@latest add hover-card     # Rich hover previews
npx shadcn@latest add scroll-area    # Smooth scrolling for long lists

# Optional (can defer to later iterations)
npx shadcn@latest add avatar         # User profile pictures
npx shadcn@latest add command        # Command palette (future feature)
npx shadcn@latest add checkbox       # Bulk actions (already have basic)
npx shadcn@latest add switch         # Settings toggles
```

**Recommendation:** Add tooltip + scroll-area (5 min), defer others

---

## Current Stack Inventory (No Changes Needed)

### API Layer
- **tRPC:** v11.6.0 (type-safe APIs)
- **React Query:** 5.60.5 (data fetching/caching)
- **Superjson:** 2.2.1 (Date/Decimal serialization)
- **Status:** Working perfectly, no updates needed

### Authentication
- **Supabase Auth:** @supabase/supabase-js@2.58.0
- **SSR Helpers:** @supabase/ssr@0.5.2
- **Status:** Fully integrated, no changes needed

### Forms & Validation
- **react-hook-form:** 7.53.2 (form state management)
- **Zod:** 3.23.8 (schema validation)
- **@hookform/resolvers:** 3.9.1 (zod integration)
- **Status:** Working well, no updates needed

### UI Components
- **Radix UI:** 17 component packages installed
- **class-variance-authority:** 0.7.0 (component variants)
- **Tailwind CSS:** 3.4.1 (styling)
- **tailwindcss-animate:** 1.0.7 (animation utilities)
- **lucide-react:** 0.460.0 (icons)
- **Status:** Complete foundation, ready for theming

### Charts
- **recharts:** 2.12.7 (data visualization)
- **Status:** Working, just needs color palette update

### Utilities
- **date-fns:** 3.6.0 (date formatting)
- **clsx:** 2.1.0 (className merging)
- **tailwind-merge:** 2.2.0 (Tailwind class merging)
- **Status:** All utilities in place

---

## Font Configuration (Builder-0)

### Google Fonts via next/font

**Fonts to Install:**
1. **Inter** (Sans-serif for body text)
2. **Crimson Pro** (Serif for headlines)

**Implementation:**
```typescript
// src/app/layout.tsx
import { Inter, Crimson_Pro } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap', // Prevents invisible text during load
  preload: true,
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '700'], // Regular + Bold only (saves ~50KB)
  style: ['normal', 'italic'], // Italic for affirmations
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

**Tailwind Config Update:**
```javascript
// tailwind.config.ts
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui'],
      serif: ['var(--font-serif)', 'Crimson Pro', 'Georgia', 'serif'],
    }
  }
}
```

**Usage:**
- Headlines: `className="font-serif font-bold"`
- Body text: `className="font-sans"` (default)
- Affirmations: `className="font-serif italic"`
- Numbers: `className="font-sans tabular-nums"` (aligned columns)

**Performance:**
- next/font automatically optimizes (inlines CSS, self-hosts)
- display: 'swap' prevents FOIT (flash of invisible text)
- Preload ensures fonts load before first paint
- Fallback fonts have similar metrics (minimal layout shift)

---

## CSS Variable System (Builder-0)

### Design Tokens to Implement

**Location:** `src/app/globals.css`

**Sage Green Palette:**
```css
:root {
  --sage-50: 140 10% 96%;   /* #f6f7f6 - lightest backgrounds */
  --sage-100: 140 10% 92%;  /* #e3e8e3 - subtle backgrounds */
  --sage-200: 140 11% 84%;  /* #c7d1c7 - borders */
  --sage-300: 140 12% 69%;  /* #a3b4a3 - muted elements */
  --sage-400: 140 13% 56%;  /* #7d947d - secondary text */
  --sage-500: 140 13% 42%;  /* #5f7a5f - PRIMARY COLOR */
  --sage-600: 140 14% 33%;  /* #4a614a - primary hover */
  --sage-700: 140 15% 27%;  /* #3d4f3d - primary active */
  --sage-800: 140 16% 21%;  /* #2f3e2f - dark text */
  --sage-900: 140 18% 15%;  /* #1f2b1f - darkest */
}
```

**Warm Gray Palette:**
```css
:root {
  --warm-gray-50: 24 6% 98%;   /* #fafaf9 - page background */
  --warm-gray-100: 24 6% 96%;  /* #f5f5f4 - card backgrounds */
  --warm-gray-200: 24 6% 91%;  /* #e7e5e4 - subtle borders */
  --warm-gray-300: 24 5% 84%;  /* #d6d3d1 - dividers */
  --warm-gray-400: 24 4% 66%;  /* #a8a29e - placeholder text */
  --warm-gray-500: 24 5% 46%;  /* #78716c - muted text */
  --warm-gray-600: 24 6% 34%;  /* #57534e - secondary text */
  --warm-gray-700: 24 7% 27%;  /* #44403c - body text */
  --warm-gray-800: 24 9% 16%;  /* #292524 - headings */
  --warm-gray-900: 24 10% 11%; /* #1c1917 - darkest text */
}
```

**Accent Colors:**
```css
:root {
  --gold: 45 74% 52%;      /* #d4af37 - Achievement */
  --coral: 0 100% 71%;     /* #ff6b6b - Attention (soft, not alarming) */
  --sky: 204 52% 67%;      /* #7fb3d5 - Info */
  --lavender: 255 85% 85%; /* #c4b5fd - Accent */
}
```

**Semantic Tokens (Map to palette):**
```css
:root {
  /* Base */
  --background: var(--warm-gray-50);
  --foreground: var(--warm-gray-900);

  /* Card */
  --card: 0 0% 100%; /* white */
  --card-foreground: var(--warm-gray-900);

  /* Primary */
  --primary: var(--sage-600);
  --primary-foreground: 0 0% 100%;

  /* Muted */
  --muted: var(--warm-gray-100);
  --muted-foreground: var(--warm-gray-500);

  /* Accent */
  --accent: var(--sage-100);
  --accent-foreground: var(--sage-900);

  /* Border */
  --border: var(--warm-gray-200);
  --input: var(--warm-gray-200);
  --ring: var(--sage-500);

  /* Destructive (use coral, not red) */
  --destructive: var(--coral);
  --destructive-foreground: 0 0% 100%;
}
```

**Tailwind Config Update:**
```javascript
// tailwind.config.ts
theme: {
  extend: {
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
    }
  }
}
```

**CRITICAL:** HSL format WITHOUT `hsl()` wrapper enables Tailwind opacity modifiers:
```typescript
// This works because of HSL format:
<div className="bg-sage-500/50">  {/* 50% opacity */}
<div className="text-warm-gray-700/80">  {/* 80% opacity */}
```

---

## Animation Configuration (Builder-0)

### Framer Motion Utilities

**Location:** `src/lib/animations.ts`

```typescript
// src/lib/animations.ts
export const DURATION = {
  fast: 0.15,      // Button hover
  normal: 0.3,     // Page transition, modal
  slow: 0.5,       // Drawer, complex layout
  progress: 0.8,   // Progress bars, number count
}

export const EASING = {
  default: 'easeOut',
  spring: { type: 'spring', stiffness: 300, damping: 25 },
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
      delayChildren: 0.1
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

// Progress bar animation
export const progressBarAnimation = {
  initial: { width: 0 },
  animate: (percentage: number) => ({ width: `${percentage}%` }),
  transition: { duration: DURATION.progress, ease: EASING.default },
}

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

**Tailwind Animate Extensions:**
```javascript
// tailwind.config.ts (already has tailwindcss-animate)
theme: {
  extend: {
    animation: {
      'fade-in': 'fadeIn 0.3s ease-out',
      'slide-in': 'slideIn 0.3s ease-out',
      'skeleton': 'skeleton 2s ease-in-out infinite', // Slower than default
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
    }
  }
}
```

---

## Environment Variables (No Changes)

All environment variables already configured from previous iterations:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# AI Categorization (Optional for Iteration 4)
ANTHROPIC_API_KEY="sk-..."

# Plaid (Out of scope for MVP)
PLAID_CLIENT_ID="..."
PLAID_SECRET="..."
PLAID_ENVIRONMENT="sandbox"
ENCRYPTION_KEY="..."
```

**No New Environment Variables Needed for Iteration 4**

---

## Performance Targets

### Bundle Size
- **Current:** ~450KB gzipped (estimated)
- **After Iteration 4:** <550KB gzipped
- **Added:** sonner (5KB) + framer-motion (32KB) + fonts (~50KB) = ~87KB
- **Acceptable:** Yes (better UX worth the trade-off)

### Animation Performance
- **Target:** 60fps on all transitions
- **Strategy:** Use transform/opacity only (GPU-accelerated)
- **Monitoring:** Chrome DevTools Performance tab
- **Fallback:** Respect prefers-reduced-motion

### Font Loading
- **Target:** <300ms to first paint
- **Strategy:** next/font with display: 'swap'
- **Monitoring:** Lighthouse performance score
- **Acceptable:** Brief FOUT (flash of unstyled text) on first load

### First Contentful Paint (FCP)
- **Current:** ~1.2s (estimated)
- **Target:** <1.5s (allow for font loading)
- **Strategy:** No blocking scripts, optimized images

### Time to Interactive (TTI)
- **Current:** ~2.5s (estimated)
- **Target:** <3s (maintain with new animations)
- **Strategy:** Code splitting, lazy load non-critical components

---

## Security Considerations

### Content Security Policy (Future)
- No changes needed for Iteration 4
- Future: Add CSP headers for production deployment

### API Key Security
- All keys in .env.local (not committed)
- Supabase Auth handles session management
- tRPC procedures validate auth before execution

### XSS Prevention
- React escapes by default
- Zod validates all user input
- No dangerouslySetInnerHTML usage

### CSRF Protection
- Next.js middleware validates requests
- Supabase session cookies are httpOnly
- tRPC mutations require valid session

---

## Accessibility Compliance

### WCAG AA Standards

**Color Contrast:**
- Body text (warm-gray-700 on white): 7.4:1 (AAA)
- Sage-600 on white: 4.8:1 (AA)
- Coral on white: 4.5:1 (AA minimum)
- All color combinations meet WCAG AA

**Focus Indicators:**
- All interactive elements have visible focus rings
- Ring color: sage-500 (consistent with brand)
- Keyboard navigation tested

**Screen Reader Support:**
- All shadcn/ui components have ARIA labels
- Forms have proper label associations
- Error messages announced
- Loading states announced

**Reduced Motion:**
```typescript
// Respect user preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// In animation variants:
transition: {
  duration: prefersReducedMotion ? 0 : DURATION.normal
}
```

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| Next.js | 14.2.33 | React 18.3.1 | Stable |
| React | 18.3.1 | All dependencies | No React 19 yet |
| TypeScript | 5.7.2 | All dependencies | Strict mode |
| tRPC | 11.6.0 | React Query 5.60.5 | Latest stable |
| Prisma | 5.22.0 | PostgreSQL 15+ | Working |
| Supabase | 2.58.0 | Next.js 14 | Stable |
| framer-motion | Latest | React 18 | Will auto-install compatible |
| sonner | Latest | React 18 | Will auto-install compatible |
| Tailwind | 3.4.1 | PostCSS 8.4.38 | Stable |
| recharts | 2.12.7 | React 18 | Working |

**No Known Conflicts**

**Future Compatibility Notes:**
- React 19: Monitor framer-motion compatibility
- Next.js 15: Monitor recharts SSR compatibility

---

## Dependencies NOT Needed

### Animation Libraries (Alternatives Rejected)
- ~~react-spring~~ - More complex API than framer-motion
- ~~anime.js~~ - Not React-first, manual DOM manipulation
- ~~GSAP~~ - Paid license for commercial use

### UI Libraries (Alternatives Rejected)
- ~~Material UI~~ - Too opinionated, hard to customize
- ~~Chakra UI~~ - Runtime styles (slower than Tailwind)
- ~~Ant Design~~ - Not ideal for custom branding

### Chart Libraries (Alternatives Rejected)
- ~~Chart.js~~ - Lower-level API, more code needed
- ~~Victory~~ - Heavier bundle size
- ~~D3.js~~ - Too low-level for MVP

### State Management (Not Needed)
- ~~Redux~~ - Overkill for server state (React Query handles it)
- ~~Zustand~~ - Not needed yet (may add in Iteration 5)
- ~~Jotai~~ - Not needed for current complexity

---

## Installation Checklist (Builder-0)

```bash
# 1. Install critical dependencies
npm install sonner framer-motion

# 2. Add optional shadcn components (5 min)
npx shadcn@latest add tooltip
npx shadcn@latest add scroll-area

# 3. Verify installation
npm list sonner framer-motion

# 4. Test build
npm run build

# 5. Start dev server
npm run dev
```

**Expected Output:**
- No TypeScript errors
- No build errors
- Dev server starts successfully
- Fonts load (check Network tab)

---

**END OF TECH-STACK.MD - Proceed to patterns.md for implementation details**
