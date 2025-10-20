# Technology Stack

## Core Framework

**Decision:** Next.js 14 (App Router) with React 18 + TypeScript

**Rationale:**
- Already in use and working well
- No changes needed for Iteration 11
- Server Components provide good performance baseline
- App Router supports theme detection (middleware)

**Version:** Existing (no upgrade needed)

---

## Dark Mode Strategy

**Decision:** Tailwind CSS `class` mode with `next-themes` library

**Rationale:**
- Infrastructure already exists and is correctly configured
- `darkMode: ['class']` in tailwind.config.ts ✅
- CSS variables defined for both light and dark modes ✅
- ThemeProvider configured with `attribute="class"` ✅
- ThemeSwitcher component functional ✅
- **Only missing:** Components don't use `dark:` variants

**Implementation:**
```tsx
// All components will follow this pattern:
className="bg-sage-50 dark:bg-sage-900 text-warm-gray-900 dark:text-warm-gray-100"
```

**Why NOT other approaches:**
- ❌ CSS variables only: Too verbose, harder to review
- ❌ Radix UI dark mode: Adds dependency, migration cost
- ❌ Custom theme context: Already have next-themes
- ✅ Tailwind dark: variants: Explicit, visible, maintainable

**No New Dependencies Required**

---

## Color System

**Decision:** Hybrid approach - Semantic tokens where possible, custom colors with dark: variants where needed

### Semantic Tokens (PREFERRED)

**Already Working (18 components):**
```tsx
// These automatically adapt to theme via CSS variables:
bg-background         // Light: white, Dark: warm-gray-900
text-foreground       // Light: warm-gray-900, Dark: warm-gray-100
bg-card              // Light: white, Dark: warm-gray-900
text-card-foreground // Light: warm-gray-900, Dark: warm-gray-100
bg-popover           // Light: white, Dark: warm-gray-900
border-border        // Light: warm-gray-200, Dark: warm-gray-700
bg-primary           // Light: sage-600, Dark: sage-400
bg-muted             // Light: warm-gray-50, Dark: warm-gray-800
```

**When to Use Semantic Tokens:**
- Generic backgrounds (`bg-white` → `bg-background`)
- Generic text (`text-gray-900` → `text-foreground`)
- Generic borders (`border-gray-200` → `border-border`)
- Primary buttons (already use `bg-primary`)
- Muted text (already use `text-muted-foreground`)

### Custom Colors with Dark Variants (WHEN NEEDED)

**Brand Colors (Cannot use semantic tokens):**
```tsx
// Sage (primary brand color)
bg-sage-50 dark:bg-sage-900
text-sage-600 dark:text-sage-400
border-sage-200 dark:border-sage-700

// Terracotta (errors, affirmations)
text-terracotta-700 dark:text-terracotta-400
bg-terracotta-50 dark:bg-terracotta-950
border-terracotta-200 dark:border-terracotta-800

// Gold (achievements, highlights)
text-gold-500 dark:text-gold-400
bg-gold-100 dark:bg-gold-900

// Warm Gray (neutral palette)
bg-warm-gray-50 dark:bg-warm-gray-900
text-warm-gray-600 dark:text-warm-gray-400
border-warm-gray-200 dark:border-warm-gray-700
```

**When to Use Custom Colors:**
- Accent colors (sage, terracotta, gold)
- Gradients (complex backgrounds)
- Conditional states (success, warning, info)
- Brand-specific styling (affirmations, celebrations)

### Color Mapping Guide

**Standard Mappings:**
```tsx
// Backgrounds
bg-white → bg-warm-gray-900 OR bg-background (semantic preferred)
bg-sage-50 → bg-sage-900
bg-warm-gray-50 → bg-warm-gray-900
bg-sage-100 → bg-sage-800
bg-terracotta-50 → bg-terracotta-950

// Text
text-warm-gray-900 → text-warm-gray-100
text-warm-gray-600 → text-warm-gray-400
text-sage-600 → text-sage-400
text-sage-700 → text-sage-300
text-gold-500 → text-gold-400

// Borders
border-warm-gray-200 → border-warm-gray-700
border-sage-200 → border-sage-700
border-terracotta-200 → border-terracotta-800
```

---

## Shadow-Border Pattern for Dark Mode

**Decision:** Use `shadow-soft` in light mode, replace with border in dark mode

**Pattern:**
```tsx
// Standard cards
className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700"

// Elevated cards (dashboard metrics)
className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600"

// Maximum elevation (dialogs)
className="shadow-soft-xl dark:shadow-none dark:border dark:border-warm-gray-500"

// Subtle elements (badges)
className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-800"
```

**Rationale:**
- Soft shadows invisible on dark backgrounds
- Borders provide clear separation in dark mode
- Consistent with Material Design dark mode guidelines
- Tested and validated by Explorer 2

**Exception - Form Inputs:**
```tsx
// Form inputs use focus rings instead of borders
className="shadow-soft focus-visible:shadow-soft-md focus-visible:ring-2 focus-visible:ring-ring"
// NO dark:border (ring provides boundary)
```

**Shadow Utility Definitions (Already in Tailwind Config):**
```js
// tailwind.config.ts
boxShadow: {
  'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  'soft-md': '0 4px 6px 0 rgba(0, 0, 0, 0.1)',
  'soft-lg': '0 10px 15px 0 rgba(0, 0, 0, 0.1)',
  'soft-xl': '0 20px 25px 0 rgba(0, 0, 0, 0.1)',
}
```

---

## Visual Warmth System

**Decision:** Soft shadows + warmth border radius (0.75rem for special emphasis)

### Soft Shadows (Already Defined)

**Usage:**
- **shadow-soft**: Standard cards, form containers, list items
- **shadow-soft-md**: Elevated cards (dashboard metrics, detail pages)
- **shadow-soft-lg**: Special emphasis (AffirmationCard, celebration cards)
- **shadow-soft-xl**: Maximum elevation (dialogs, modals)

**Application Pattern:**
```tsx
// Standard card
<Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">

// Elevated metric card
<Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">

// Dialog
<DialogContent className="shadow-soft-xl dark:shadow-none dark:border dark:border-warm-gray-500">
```

### Warmth Border Radius

**Decision:** Use `rounded-warmth` (0.75rem) selectively for special emphasis

**Standard Border Radius:**
```tsx
rounded-lg // 0.5rem - all standard components (buttons, inputs, cards)
```

**Warmth Border Radius (Special Emphasis):**
```tsx
rounded-warmth // 0.75rem - celebrations, onboarding, dialogs, elevated metrics
```

**Components Using rounded-warmth (11-15 total):**
1. AffirmationCard ✅ (already implemented)
2. FinancialHealthIndicator (add in Iteration 11)
3. CompletedGoalCelebration (deferred to Iteration 12)
4. Dialog (add to special dialogs)
5. AlertDialog (add to confirmations)
6. Auth cards (SignInForm, SignUpForm, ResetPasswordForm containers)
7. Elevated stat cards (NetWorthCard when variant="elevated")

**Rationale:**
- Too much rounding looks unprofessional
- Reserve for special moments (celebrations, first impressions)
- Maintains visual hierarchy (standard = rounded-lg, special = rounded-warmth)

---

## Button Loading States

**Decision:** Enhance Button component with `loading` prop + Loader2 spinner

### Implementation

**Button Component Enhancement:**
```tsx
// src/components/ui/button.tsx
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean  // NEW PROP
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}  // Auto-disable when loading
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
```

**Usage Pattern:**
```tsx
// Before:
<Button type="submit" disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>

// After:
<Button type="submit" loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Benefits:**
- Automatic spinner rendering
- Automatic disable behavior
- Consistent UX across all buttons
- No layout shift (spinner has fixed size)
- Works with all button variants (default, outline, ghost, destructive)

### Spinner Library

**Decision:** Use `lucide-react` Loader2 icon (already installed)

**Why Loader2:**
- Already in dependencies (no new package)
- SVG icon (scales perfectly)
- Uses `currentColor` (adapts to button text color)
- Smooth animation with Tailwind `animate-spin`
- Consistent with other icons in app

**Alternative Considered:**
- ❌ Custom spinner component: More code to maintain
- ❌ CSS-only spinner: Less flexible, harder to style
- ✅ Loader2: Already available, perfect fit

---

## Gradient Strategy

**Decision:** Maintain complex gradients with dark mode variants (higher contrast)

### Light Mode Gradients
```tsx
// Existing (working well)
bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100
```

### Dark Mode Gradients (Higher Contrast)
```tsx
// Dark mode needs MORE contrast than light mode
dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900

// OR with subtle color hints
dark:from-sage-900/50 dark:via-warm-gray-900 dark:to-sage-900/30
```

**Components with Gradients:**
1. AffirmationCard (hero element, high visibility)
2. FinancialHealthIndicator (primary metric, SVG background)
3. CompletedGoalCelebration (deferred to Iteration 12)

**Testing Required:**
- Visual QA in dark mode for EVERY gradient
- Check text contrast (WCAG AA minimum)
- Check icon visibility
- Adjust gradient stops if needed (trial and error)

**Rationale:**
- Gradients are part of brand identity (warmth, softness)
- Simplification would lose visual appeal
- Dark mode allows for bolder gradients (not just lighter versions)
- Users expect gradients in modern UIs

---

## SVG Stroke Colors

**Decision:** Use Tailwind className on SVG elements for dark mode adaptation

### Pattern
```tsx
// Before (hardcoded):
<circle stroke="hsl(var(--warm-gray-200))" />

// After (dark mode support):
<circle className="stroke-warm-gray-200 dark:stroke-warm-gray-700" />

// OR with currentColor:
<circle className="text-sage-500 dark:text-sage-400" stroke="currentColor" />
```

**Components with SVG:**
1. FinancialHealthIndicator (gauge visualization)
2. ProgressRing (circular progress)
3. EncouragingProgress (deferred to Iteration 12)
4. Chart components (deferred to Iteration 12)

**Rationale:**
- SVG stroke doesn't automatically adapt to dark mode
- className with dark: variants works reliably
- currentColor is cleaner but requires parent text color
- Tested and validated pattern

---

## Error State Colors

**Decision:** Use terracotta palette for all errors (not harsh red)

### Pattern
```tsx
// OLD (harsh red):
<div className="text-red-600 bg-red-50 border-red-200">
  Error message
</div>

// NEW (warm terracotta):
<div className="text-terracotta-700 bg-terracotta-50 border-terracotta-200 shadow-soft rounded-lg dark:text-terracotta-400 dark:bg-terracotta-950 dark:border-terracotta-800">
  Error message
</div>
```

**Where Applied:**
- Auth form validation errors (SignInForm, SignUpForm, ResetPasswordForm)
- Form field validation (inline errors)
- Toast notifications (error variant)
- Empty states (gentle warnings)

**Exception - Destructive Actions:**
```tsx
// Keep coral for destructive buttons (delete, archive)
<Button variant="destructive" className="bg-terracotta-500">
  Delete Account
</Button>
```

**Rationale:**
- Red is too harsh for gentle financial coaching app
- Terracotta maintains urgency while feeling supportive
- Consistent with existing palette (already in Tailwind config)
- Better alignment with warmth theme

---

## Environment Variables

**No New Variables Required for Iteration 11**

Existing variables remain unchanged:
- `DATABASE_URL`: PostgreSQL connection (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase admin key (server-only)

---

## Dependencies Overview

**No New Dependencies Required**

All required packages already installed:
```json
{
  "next": "14.x",
  "react": "18.x",
  "tailwindcss": "3.x",
  "next-themes": "0.x",  // Theme switching
  "lucide-react": "0.x",  // Loader2 icon
  "@radix-ui/*": "1.x",   // UI primitives (Dialog, Popover, etc.)
  "class-variance-authority": "0.x",  // Button variants
  "clsx": "2.x",  // className utilities
  "tailwind-merge": "2.x"  // Merge Tailwind classes
}
```

**Key Libraries:**
- **next-themes**: Handles theme detection, localStorage persistence, SSR hydration
- **lucide-react**: SVG icon library (Loader2 for button loading states)
- **Radix UI**: Headless UI primitives (already using semantic tokens)
- **Tailwind CSS**: Utility-first CSS (dark mode, shadows, colors)

---

## Performance Targets

**No Performance Degradation Expected**

Iteration 11 changes are CSS-only (no runtime overhead):
- Dark mode: Pure CSS with `dark:` classes (0ms overhead)
- Shadows: CSS box-shadow (hardware accelerated)
- Button loading: Adds 1 SVG icon (negligible bundle size increase)

**Metrics to Monitor:**
- First Contentful Paint: No change expected (CSS-only)
- Bundle size: +1-2KB (Loader2 icon in Button component)
- Lighthouse score: No change expected
- Time to Interactive: No change expected

**Future Performance Work (Iteration 12):**
- Optimistic updates (reduce perceived latency)
- Query deduplication (reduce network requests)
- Loading skeletons (better perceived performance)

---

## Security Considerations

**No New Security Concerns**

Iteration 11 is styling-only:
- ✅ No new API endpoints
- ✅ No new database queries
- ✅ No new authentication logic
- ✅ No new user input handling

**Existing Security Maintained:**
- tRPC: Type-safe API layer (no changes)
- Supabase Auth: Secure authentication (no changes)
- RLS: Row-level security (no changes)
- CSP: Content Security Policy (no changes needed)

---

## Testing Approach

### Manual Testing (PRIMARY)

**Visual QA Checklist:**
- [ ] Test all modified components in light mode (no regressions)
- [ ] Test all modified components in dark mode (legibility)
- [ ] Toggle theme 10+ times (no flashes, instant switching)
- [ ] Test all buttons with loading states (spinner appears)
- [ ] Test gradients in both modes (text contrast)
- [ ] Test SVG colors in both modes (visibility)
- [ ] Test shadows vs borders (separation in dark mode)

**Browser Testing:**
- Primary: Chrome/Edge (Chromium)
- Secondary: Firefox
- Secondary: Safari (if available)

**Device Testing:**
- Desktop: 1920x1080, 1440x900
- Mobile: iPhone (390px), Android (360px)

### TypeScript Validation

```bash
# Type checking
npm run type-check

# Should output: 0 errors
```

### Build Validation

```bash
# Production build
npm run build

# Should succeed with 0 errors
```

### Automated Testing (FUTURE)

Defer to Iteration 12:
- Playwright screenshot comparison
- Lighthouse accessibility audit (contrast ratios)
- Chromatic visual regression
- Jest component tests for Button loading prop

---

## Build & Deploy

**Build Tool:** Next.js built-in (Turbopack in dev, Webpack in production)

**Deployment Target:** Vercel (existing setup, no changes)

**CI/CD:** None currently (manual deployment)

**Build Process:**
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Deploy
vercel --prod
```

**No Changes Required for Iteration 11**

---

## Configuration Files

### Tailwind Config (NO CHANGES NEEDED)

**File:** `tailwind.config.ts`

Already contains:
```ts
{
  darkMode: ['class'],  // ✅ Correct
  theme: {
    extend: {
      colors: {
        sage: { /* 50-900 */ },
        'warm-gray': { /* 50-900 */ },
        terracotta: { /* 50-900 */ },
        gold: { /* 50-900 */ },
        // ... semantic tokens
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'soft-md': '0 4px 6px 0 rgba(0, 0, 0, 0.1)',
        'soft-lg': '0 10px 15px 0 rgba(0, 0, 0, 0.1)',
        'soft-xl': '0 20px 25px 0 rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'warmth': '0.75rem',
      },
    },
  },
}
```

### CSS Variables (NO CHANGES NEEDED)

**File:** `src/app/globals.css`

Already contains:
```css
/* Light mode variables */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 20 14% 4%;
    --card: 0 0% 100%;
    --sage-50: 120 40% 96%;
    /* ... all color definitions */
  }
}

/* Dark mode variables */
@layer base {
  .dark {
    --background: 20 14% 12%;
    --foreground: 20 14% 96%;
    --card: 20 14% 12%;
    --sage-900: 120 40% 10%;
    /* ... all dark color definitions */
  }
}
```

### Theme Provider (NO CHANGES NEEDED)

**File:** `src/app/providers.tsx`

Already contains:
```tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

---

## Summary

**Key Technology Decisions:**
1. ✅ Use Tailwind dark mode (`dark:` classes) - infrastructure already exists
2. ✅ Hybrid color system (semantic tokens + custom colors with dark: variants)
3. ✅ Shadow-border pattern for dark mode (`shadow-soft dark:shadow-none dark:border`)
4. ✅ Enhance Button with `loading` prop using Loader2 icon
5. ✅ Maintain complex gradients (with higher contrast in dark mode)
6. ✅ Use terracotta for errors (not harsh red)
7. ✅ No new dependencies required
8. ✅ No configuration changes needed

**Implementation Complexity:** LOW
- All infrastructure exists and is correctly configured
- Builders only need to apply established patterns
- No new libraries to learn
- No breaking changes

**Risk Level:** LOW
- Proven patterns (Tailwind dark mode is industry standard)
- No new dependencies (stability maintained)
- Incremental testing catches issues early
- Rollback is simple (revert CSS changes)
