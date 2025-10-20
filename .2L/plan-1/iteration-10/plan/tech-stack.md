# Technology Stack - Iteration 10

## Core Framework

**Decision:** Next.js 14 (App Router) + React 18

**Rationale:**
- Already implemented and mature in codebase
- Server Components enable auth checks without client-side overhead
- Client components support Framer Motion for complex animations
- Excellent for dashboard hybrid (server greeting calculation, client data fetching via tRPC)
- No breaking changes needed - extend existing architecture

**Alternatives Considered:**
- Remix: Not considered (Next.js already implemented, migration not justified)
- Astro: Not suitable (need dynamic client interactions, not static content)

## Animation Library

**Decision:** Framer Motion 12.23.22 + CSS Transitions (Hybrid Approach)

**Rationale:**
- Framer Motion already installed and used in 11/91 components
- Industry standard for React animations with excellent performance
- Declarative API fits React component model perfectly
- Built-in gesture support (drag, hover, tap) for micro-interactions
- GPU-accelerated by default (uses transform/opacity)
- CSS transitions kept for ultra-simple hover states (no JS overhead)

**Implementation Strategy:**
- Complex animations: Framer Motion (page transitions, stagger, success states, loading pulse)
- Simple animations: CSS transitions (button color changes, border color changes)
- Radix UI animations: Keep as-is (Dialog/Dropdown/Toast already integrated)

**Alternatives Considered:**
- React Spring: More physics-based, but Framer Motion simpler API for our use case
- GSAP: Powerful but overkill for gentle micro-interactions, larger bundle size
- CSS-only: Insufficient for stagger animations and orchestrated sequences

## Styling Framework

**Decision:** Tailwind CSS 3.x + shadcn/ui pattern

**Rationale:**
- Already configured with sage/warm-gray color system (excellent foundation)
- Easy to extend with new color palettes (terracotta, dusty-blue) via config
- Utility-first approach enables rapid iteration on visual warmth
- shadcn/ui pattern (HSL CSS variables + semantic tokens) supports dark mode seamlessly
- tailwindcss-animate plugin already installed for Radix UI integration

**Tailwind Config Expansions:**
- Add terracotta palette (hue 20-30, saturation 55-60%) for affirmative actions
- Add dusty-blue palette (hue 215, saturation 20-30%) for analytical sections
- Mute gold accent (reduce saturation from 74% to 55%)
- Add soft shadow utilities (warm-gray hue, opacity 0.1-0.15)
- Add border-radius warmth utility (0.75rem, more rounded than lg)
- Add animation keyframes: breathe (3s pulse), gentle-bounce (0.4s)

**Alternatives Considered:**
- Styled Components: Not considered (Tailwind already implemented, CSS-in-JS adds bundle overhead)
- Emotion: Same reasoning as Styled Components
- Vanilla CSS: Harder to maintain, loses Tailwind's utility benefits

## Typography System

**Decision:** Next.js Font Optimization (Google Fonts) - Inter (sans) + Crimson Pro (serif)

**Rationale:**
- Already configured with proper CSS variables (--font-sans, --font-serif)
- Inter: Clean, modern sans-serif for UI elements and data (excellent tabular-nums support)
- Crimson Pro: Warm, readable serif for headings and affirmations (emotional warmth)
- Next.js font optimization eliminates layout shift (font metrics embedded)
- No new fonts needed - increase serif usage via className additions

**Implementation Strategy:**
- Headings (h1, h2, h3): Add font-serif className (warmth)
- Body text: Keep font-sans (readability)
- Numbers/data: Keep font-sans with tabular-nums (alignment)
- Affirmations: Already font-serif italic (perfect, maintain)
- Line-height: Increase from 1.5 to 1.6 (leading-relaxed utility)

**Alternatives Considered:**
- Adding warmer serif (e.g., Lora, Merriweather): Unnecessary, Crimson Pro excellent
- Using serif for body text: Reduces readability for financial data
- System fonts only: Loses emotional warmth conveyed by serif headings

## Color Palette Expansion

**Decision:** Extend existing sage/warm-gray system with terracotta, dusty-blue, muted gold

**Current Palette (Keep):**
- Sage Green (140deg, 10-18% saturation): Primary actions, success states
- Warm Gray (24deg, 4-10% saturation): Neutrals, text, backgrounds
- Gold (45deg, 74% saturation): Accent color
- Coral (0deg, 100% saturation): Destructive actions
- Sky, Lavender: Minimal usage

**New Additions:**

**Terracotta/Clay (NEW):**
- Hue: 20-30 (orange-red warm range)
- Saturation: 55-60% (lower than coral for gentleness)
- Full palette: 50-900 scale
- Use cases: Affirmative actions (save goal, celebrate milestone, positive progress)
- Replaces harsh coral in error states with warm warnings

**Dusty Blue (NEW):**
- Hue: 215 (blue, cooler than sage but not harsh)
- Saturation: 20-30% (low for subtlety)
- Full palette: 50-900 scale
- Use cases: Analytical sections (charts, data tables, financial metrics backgrounds)

**Muted Gold (UPDATED):**
- Current: Single HSL value (45 74% 52%) - bright, high saturation
- New: Full palette with reduced saturation (55% instead of 74%)
- Use cases: Highlights, affirmation icons, badges

**Rationale:**
- Terracotta adds warmth for positive actions without harsh red/green dichotomy
- Dusty blue provides analytical context without cold corporate blue
- Muted gold reduces visual intensity while maintaining inviting warmth
- All palettes use HSL for dark mode compatibility (adjust lightness for .dark theme)

## Shadow Strategy

**Decision:** Multi-layer soft shadows with warm-gray hue, replacing hard borders

**Rationale:**
- Current app is border-heavy (border border-input, border border-muted everywhere)
- Hard borders create visual sharpness counter to "gentle" goal
- Soft shadows provide depth without harshness
- Warm-gray hue (24deg) matches color system for cohesion
- Lower opacity (0.1-0.15) vs typical 0.25 for subtlety

**Shadow Utilities:**
```javascript
boxShadow: {
  'soft': '0 1px 3px 0 hsl(var(--warm-gray-300) / 0.15), 0 1px 2px 0 hsl(var(--warm-gray-300) / 0.1)',
  'soft-md': '0 4px 6px -1px hsl(var(--warm-gray-300) / 0.15), 0 2px 4px -1px hsl(var(--warm-gray-300) / 0.1)',
  'soft-lg': '0 10px 15px -3px hsl(var(--warm-gray-300) / 0.15), 0 4px 6px -2px hsl(var(--warm-gray-300) / 0.1)',
  'soft-xl': '0 20px 25px -5px hsl(var(--warm-gray-300) / 0.15), 0 10px 10px -5px hsl(var(--warm-gray-300) / 0.1)',
}
```

**Application:**
- Cards: Replace shadow-sm with shadow-soft
- Inputs: Remove border, add shadow-soft, keep focus ring
- Buttons (outline variant): Replace border with shadow-soft
- Dialogs/Modals: shadow-soft-lg for floating effect

**Exceptions (Keep Borders):**
- Form focus states (accessibility requirement for keyboard navigation)
- Active tab indicators (clear selection state)
- Category badges with custom colors (color IS the border)

**Alternatives Considered:**
- Pure border approach: Rejected (too sharp, counter to warmth goal)
- Pure shadow approach with no borders: Rejected (reduces clarity for critical UI)
- Gradient backgrounds only: Insufficient separation for complex layouts

## Accessibility Strategy

**Decision:** WCAG 2.1 AA compliance with prefers-reduced-motion support (CRITICAL)

**Implementation:**

**useReducedMotion Hook (NEW - MUST BUILD):**
```typescript
// lib/useReducedMotion.ts
import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
```

**Animation Library Updates:**
- All animation variants accept reducedMotion parameter
- When true: duration = 0, no transform/scale changes
- PageTransition component uses hook to conditionally disable animations

**CSS Fallback:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Rationale:**
- WCAG 2.1 AA requires respecting motion preferences (vestibular disorder accommodation)
- Current app has ZERO prefers-reduced-motion support (critical gap identified by Explorer 3)
- Hook approach provides granular control over Framer Motion animations
- CSS fallback ensures non-React animations also respect preference

**Testing Requirements:**
- Chrome DevTools: Emulate prefers-reduced-motion in Rendering tab
- Verify all animations disable when preference active
- Verify functionality remains intact without animations
- Manual testing with real OS preference (macOS, Windows accessibility settings)

## Border Radius Strategy

**Decision:** Standardize on rounded-lg (0.5rem via --radius variable) with optional warmth utility (0.75rem)

**Current State (INCONSISTENT):**
- 21 components use rounded-md (0.375rem)
- 39 components use rounded-lg (0.5rem)
- Button component: hardcoded rounded-md
- Card component: rounded-lg (correct)
- Input component: rounded-md (inconsistent with cards)

**Target State:**
- All interactive elements: rounded-lg minimum
- Cards: rounded-lg or rounded-warmth (0.75rem) for elevated surfaces
- Buttons: rounded-lg (update from rounded-md)
- Inputs: rounded-lg (update from rounded-md)
- Badges: rounded-full (keep pill shape, intentional)

**Rationale:**
- Consistency prevents visual confusion
- More rounded = warmer, gentler feel
- CSS variable (--radius) enables global adjustments if needed
- rounded-warmth utility for extra warmth on hero elements (affirmation card)

**Tailwind Config:**
```javascript
borderRadius: {
  'warmth': '0.75rem',  // NEW: More rounded for elevated surfaces
  lg: "var(--radius)",  // Keep existing 0.5rem
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
}
```

## Animation Timing Standards

**Decision:** Gentle timing (200-500ms) with easeOut/easeInOut, following warmth directive

**Duration Constants:**
```typescript
// lib/animations.ts
export const DURATION = {
  fast: 0.15,      // Button hover, quick feedback
  normal: 0.3,     // Card hover, page transitions (most pages)
  slow: 0.5,       // Dashboard page transition ("breath before data")
  breath: 0.6,     // Affirmation entrance (hero animation)
  progress: 0.8,   // Progress bar fills, gauge animations
}

export const EASING = {
  default: [0.4, 0, 0.2, 1],  // easeOut (Tailwind default)
  bounce: [0.68, -0.55, 0.265, 1.55],  // Gentle bounce for success states
}
```

**Timing Reference:**
| Animation Type | Duration | Easing | Notes |
|----------------|----------|--------|-------|
| Page Entrance | 300ms (500ms dashboard) | easeOut | Fade + slide |
| Page Exit | 200ms | easeIn | Faster exit |
| Button Hover | 150ms | easeOut | Quick feedback |
| Card Hover | 200ms | easeOut | Gentle lift |
| Input Focus | 200ms | easeOut | Smooth glow |
| Success State | 400ms | easeOut | Bounce sequence |
| Error Shake | 400ms | easeInOut | Attention-grabbing |
| Loading Pulse | 1500ms | easeInOut | Slow, calming |
| Stagger Delay | 70ms | - | Between children |
| Modal Entrance | 200ms | easeOut | Zoom + fade |

**Rationale:**
- Nothing faster than 150ms (feels jarring)
- Nothing slower than 500ms except loading states (feels sluggish)
- Exits faster than entrances (UX best practice)
- Reduced-motion: 0ms (instant, no motion)
- easeOut for entrances (decelerating), easeIn for exits (accelerating)

## Data Fetching

**Decision:** tRPC (existing) for type-safe queries - no changes needed

**Rationale:**
- Already implemented for analytics.dashboardSummary, budgets.progress, etc.
- Type-safe API calls eliminate runtime errors
- React Query powers caching and loading states
- FinancialHealthIndicator will use existing trpc.budgets.progress.useQuery()

**No changes needed** - focus on UI/UX improvements, not backend

## Environment Variables

No new environment variables required for Iteration 10. All changes are frontend (Tailwind, animations, components).

**Existing variables continue to work:**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL
- etc.

## Dependencies Overview

**Existing Dependencies (No Changes):**
- `framer-motion: ^12.23.22` - Animation library (already installed)
- `tailwindcss: ^3.x` - CSS framework (already configured)
- `tailwindcss-animate: 1.0.7` - Radix UI animation utilities (already installed)
- `@radix-ui/react-*` - Accessible primitives (Dialog, Dropdown, etc.)
- `lucide-react` - Icon library (Sparkles, Target, TrendingUp icons)
- `class-variance-authority` - Component variant management (Button variants)
- `clsx` / `tailwind-merge` - Conditional className utilities
- `next/font` - Font optimization (Inter + Crimson Pro)

**New Dependencies:**
None required. All warmth transformations achievable with existing stack.

**Optional (Skip Unless Requested):**
- `tailwindcss-textures` - Paper texture utility plugin (LOW PRIORITY, defer)

## Performance Targets

**Page Load:**
- First Contentful Paint (FCP): < 1.0s (desktop), < 2.0s (mobile)
- Largest Contentful Paint (LCP): < 2.0s (dashboard affirmation should be LCP)
- Cumulative Layout Shift (CLS): 0 (no layout shift from animations)

**Animation Performance:**
- 60fps for page transitions (desktop)
- 30fps minimum for page transitions (mobile)
- All animations use GPU-accelerated properties (transform, opacity)
- will-change: transform hints for frequently animated elements (cards on hover)

**Bundle Size:**
- No bundle size increase expected (Framer Motion already included)
- Tailwind config expansion adds ~2KB (negligible)

**Testing Strategy:**
- Chrome DevTools Performance tab: Record page load, check for layout thrashing
- Lighthouse: Performance score should not decrease
- Test on mid-range devices: Pixel 4a (Android), iPhone 12 (iOS)

## Security Considerations

No new security concerns for Iteration 10 (UI/UX changes only).

**Existing security maintained:**
- Auth checks remain server-side (Supabase middleware)
- tRPC procedures maintain authorization logic
- No client-side secrets exposed

**Accessibility as Security:**
- prefers-reduced-motion support prevents vestibular triggers (health/safety concern)
- Color contrast ratios maintained (WCAG AA = 4.5:1 for text)
- Focus indicators remain visible (keyboard navigation accessibility)

## Dark Mode Strategy

**Decision:** Extend existing .dark class approach with new color overrides

**Implementation:**
- All new colors (terracotta, dusty-blue, muted gold) get .dark mode variants
- Shadows lighter in dark mode (reduce opacity for subtlety)
- Typography remains same (Inter + Crimson Pro work well in both modes)

**Tailwind Config Pattern:**
```css
:root {
  --terracotta-500: 20 55% 55%;
}

.dark {
  --terracotta-500: 20 55% 65%;  /* Lighter in dark mode */
}
```

**Testing:**
- Toggle theme with existing ThemeSwitcher component
- Verify all new colors visible in dark mode
- Check shadow visibility (should be subtle but present)

## Build & Deploy

**Build Tool:** Next.js built-in (Webpack + SWC)

**Deployment Target:** Vercel or similar (existing setup)

**CI/CD:** Existing pipeline continues to work

**Build Validation:**
1. `npm run build` - Verify Tailwind config syntax
2. `npm run type-check` - Verify TypeScript types
3. Visual regression testing - Before/after screenshots
4. Accessibility audit - Lighthouse + axe DevTools
5. Performance testing - Chrome DevTools Performance tab

**Deployment Steps:**
1. Merge feature branches after integration testing
2. Run full build and type check
3. Deploy to staging environment
4. User validation (subjective warmth confirmation)
5. Deploy to production
6. Monitor performance metrics

## Code Quality Standards

**Linting:** ESLint (existing config continues)

**Formatting:** Prettier (existing config continues)

**Type Checking:** TypeScript strict mode (existing config continues)

**Animation Quality:**
- All animations respect prefers-reduced-motion (CRITICAL)
- GPU-accelerated properties only (transform, opacity)
- Duration within 150ms-500ms range (except loading states)
- Easing appropriate (easeOut for entrances, easeIn for exits)

**Visual Quality:**
- Consistent border-radius (rounded-lg minimum)
- Consistent shadow usage (soft shadows, warm-gray hue)
- Consistent typography (serif headings, sans body, tabular-nums for numbers)
- Consistent color usage (terracotta affirmative, dusty-blue analytical, sage primary)

**Testing Requirements:**
- Visual regression: Before/after screenshots of Dashboard, Settings, Account
- Accessibility: Color contrast ratios WCAG AA, focus states visible, prefers-reduced-motion respected
- Performance: Lighthouse score maintained, 60fps animations on desktop
- Functionality: All features work identically, no regressions
