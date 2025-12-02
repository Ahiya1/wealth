# Code Patterns & Conventions

## File Structure

Files modified in this iteration:

```
src/
├── app/
│   ├── globals.css              # CSS variable update
│   └── page.tsx                 # Landing page AI feature
└── components/
    ├── chat/
    │   ├── ChatMessage.tsx      # Verification only (already fixed)
    │   └── ChatInput.tsx        # Verification only (already fixed)
    └── dashboard/
        ├── NetWorthCard.tsx           # 3 dark mode overrides
        ├── TopCategoriesCard.tsx      # 5 dark mode overrides
        ├── FinancialHealthIndicator.tsx # 1 dark mode override
        ├── RecentTransactionsCard.tsx   # 2 changes
        └── BudgetAlertsCard.tsx         # 1 dark mode override
```

---

## Dark Mode Fix Patterns

### Pattern 1: CSS Variable Update

**File:** `src/app/globals.css`
**Line:** 137 (in `.dark` section)

**Current:**
```css
--muted-foreground: 24 4% 66%;       /* Medium warm-gray */
```

**Change to:**
```css
--muted-foreground: 24 6% 75%;       /* Lighter warm-gray for WCAG AA compliance */
```

---

### Pattern 2: Adding Dark Mode Override to text-muted-foreground

**When to use:** Any element using `text-muted-foreground` class

**Before:**
```tsx
<span className="text-muted-foreground">Some text</span>
```

**After:**
```tsx
<span className="text-muted-foreground dark:text-warm-gray-400">Some text</span>
```

**Full example with other classes:**

**Before:**
```tsx
<p className="text-xs text-muted-foreground mt-1">
  Subtitle text
</p>
```

**After:**
```tsx
<p className="text-xs text-muted-foreground dark:text-warm-gray-400 mt-1">
  Subtitle text
</p>
```

---

### Pattern 3: Icon Dark Mode Override

**When to use:** Icons using `text-muted-foreground`

**Before:**
```tsx
<TrendingUp className="h-4 w-4 text-muted-foreground" />
```

**After:**
```tsx
<TrendingUp className="h-4 w-4 text-muted-foreground dark:text-warm-gray-400" />
```

---

### Pattern 4: Upgrading warm-gray-500 to warm-gray-400

**When to use:** Elements already using `dark:text-warm-gray-500` that still have insufficient contrast

**Before:**
```tsx
<span className="text-warm-gray-500 dark:text-warm-gray-500">
  Category info
</span>
```

**After:**
```tsx
<span className="text-warm-gray-500 dark:text-warm-gray-400">
  Category info
</span>
```

---

### Pattern 5: Reference Pattern (Already Correct)

**When to see:** Components already properly implemented

```tsx
// This is CORRECT - no changes needed
<p className="text-warm-gray-600 dark:text-warm-gray-400 leading-relaxed">
  Description text
</p>
```

---

## Landing Page Feature Card Pattern

### Existing Card Structure

**IMPORTANT:** Match this exact structure for the new AI Assistant card.

```tsx
<Card className="border-sage-200 dark:border-warm-gray-700 hover:shadow-lg transition-shadow">
  <CardContent className="p-6 text-center space-y-4">
    <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 dark:bg-sage-900/30 flex items-center justify-center">
      <IconName className="h-6 w-6 text-sage-600 dark:text-sage-400" />
    </div>
    <h3 className="text-xl font-serif font-semibold text-warm-gray-900 dark:text-warm-gray-100">
      Feature Title
    </h3>
    <p className="text-warm-gray-600 dark:text-warm-gray-400 leading-relaxed">
      Feature description text that explains what this feature does.
    </p>
  </CardContent>
</Card>
```

### AI Assistant Card Implementation

**Add this as the FIRST card in the features grid:**

```tsx
{/* Feature 1: AI Assistant */}
<Card className="border-sage-200 dark:border-warm-gray-700 hover:shadow-lg transition-shadow">
  <CardContent className="p-6 text-center space-y-4">
    <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 dark:bg-sage-900/30 flex items-center justify-center">
      <Bot className="h-6 w-6 text-sage-600 dark:text-sage-400" />
    </div>
    <h3 className="text-xl font-serif font-semibold text-warm-gray-900 dark:text-warm-gray-100">
      AI Assistant
    </h3>
    <p className="text-warm-gray-600 dark:text-warm-gray-400 leading-relaxed">
      Chat naturally about your finances. Import bank statements, categorize transactions, and get insights automatically.
    </p>
  </CardContent>
</Card>
```

### Icon Import Update

**Current (line 7 of page.tsx):**
```tsx
import { Heart, TrendingUp, Target, Sparkles, Shield, Lock, Github } from 'lucide-react'
```

**Updated:**
```tsx
import { Bot, Heart, TrendingUp, Target, Sparkles, Shield, Lock, Github } from 'lucide-react'
```

---

## Import Order Convention

Follow existing codebase convention:

```tsx
// 1. React/Next.js imports
import Link from 'next/link'

// 2. Third-party library imports
import { Bot, Heart, TrendingUp } from 'lucide-react'

// 3. Local component imports
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// 4. Type imports (if separate)
import type { SomeType } from '@/types'
```

---

## Naming Conventions

**Components:** PascalCase (`NetWorthCard.tsx`)
**CSS Classes:** kebab-case via Tailwind (`text-muted-foreground`)
**CSS Variables:** kebab-case (`--muted-foreground`)

---

## Class Order Convention

When adding dark mode overrides, place them immediately after the base class:

**Good:**
```tsx
className="text-muted-foreground dark:text-warm-gray-400 mt-1"
```

**Also acceptable:**
```tsx
className="text-xs text-muted-foreground dark:text-warm-gray-400 mt-1"
```

**Avoid (dark: at end of unrelated classes):**
```tsx
className="text-xs mt-1 text-muted-foreground dark:text-warm-gray-400"
```

---

## Color Reference Quick Guide

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary text | `text-warm-gray-900` | `dark:text-warm-gray-100` |
| Secondary text | `text-warm-gray-600` | `dark:text-warm-gray-400` |
| Muted text | `text-muted-foreground` | `dark:text-warm-gray-400` |
| Accent icon | `text-sage-600` | `dark:text-sage-400` |
| Card border | `border-sage-200` | `dark:border-warm-gray-700` |
| Icon container bg | `bg-sage-50` | `dark:bg-sage-900/30` |

---

## Verification Checklist

After making changes:

1. Run `npm run build` - must pass with no errors
2. Open browser, navigate to dashboard
3. Toggle dark mode
4. Verify each modified component is readable
5. Toggle back to light mode
6. Verify no light mode regression
7. Check landing page in both modes
