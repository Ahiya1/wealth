# Technology Stack

## Overview

This iteration requires no new dependencies. All changes use existing technologies already in the codebase.

## CSS Variables Approach

**Decision:** Fix the root cause at the CSS variable level, then add explicit overrides as safety net.

**Root Cause:**
The dark mode `--muted-foreground` value of `24 4% 66%` provides only ~3.5:1 contrast ratio against the dark background (`24 10% 11%`). This falls below WCAG AA's 4.5:1 requirement.

**Fix Strategy:**
1. Update `--muted-foreground` in dark mode from `24 4% 66%` to `24 6% 75%`
2. Add explicit `dark:text-warm-gray-400` overrides to critical dashboard components

**Rationale:**
- Global fix ensures new components automatically have proper contrast
- Per-component overrides provide explicit control and act as safety net
- Both approaches work together for comprehensive coverage

## Tailwind Patterns

**Decision:** Use explicit dark mode class overrides with Tailwind's dark: prefix.

**Primary Pattern:**
```
text-muted-foreground dark:text-warm-gray-400
```

**Alternative Pattern (already used in some components):**
```
text-warm-gray-600 dark:text-warm-gray-400
```

**Rationale:**
- Consistent with existing patterns in FinancialHealthIndicator.tsx and RecentTransactionsCard.tsx
- `warm-gray-400` provides ~5.5:1 contrast ratio in dark mode
- Maintains the warm, mindful aesthetic

## Color Values Reference

**Dark Mode Background:** `24 10% 11%` (--background)

**Muted Foreground Options:**
| Value | Contrast Ratio | WCAG AA |
|-------|---------------|---------|
| `24 4% 66%` (current) | ~3.5:1 | FAIL |
| `24 6% 75%` (proposed) | ~5.5:1 | PASS |

**warm-gray Scale (for reference):**
| Class | Usage |
|-------|-------|
| `warm-gray-300` | Lighter secondary text |
| `warm-gray-400` | Standard secondary text in dark mode |
| `warm-gray-500` | Edge case text, less emphasis |
| `warm-gray-600` | Standard secondary text in light mode |

## Icons

**Decision:** Use `Bot` icon from lucide-react for AI Assistant feature card.

**Rationale:**
- Already used in ChatMessage.tsx for AI responses (consistency)
- More directly associated with AI than alternatives like MessageSquare
- Already imported in codebase, familiar pattern

**Icon Import:**
```tsx
import { Bot } from 'lucide-react'
```

## No New Dependencies

**All required packages already installed:**
- lucide-react (icons)
- tailwindcss (styling)
- @shadcn/ui components (Card, CardContent)

**Dependencies Unchanged:**
No package.json modifications required.

## Environment Variables

No new environment variables required for this iteration.

## Performance Targets

No performance impact expected:
- CSS variable changes are negligible
- Additional Tailwind classes add minimal CSS
- No JavaScript runtime changes

## Security Considerations

No security implications:
- All changes are visual/styling only
- No API changes
- No authentication changes
- No data handling changes
