# Builder Task Breakdown

## Overview

**3 primary builders** will work in parallel.
No splits expected - all tasks are LOW to MEDIUM complexity.

## Builder Assignment Strategy

- Builders work on completely isolated files (no overlap)
- Builder-1 handles all CSS and dashboard components
- Builder-2 performs verification only (chat components already fixed)
- Builder-3 handles landing page update

---

## Builder-1: Global CSS & Dashboard Components

### Scope

Update the dark mode CSS variable for muted-foreground and add explicit dark mode overrides to all dashboard components using text-muted-foreground.

### Complexity Estimate

**LOW**

All changes are mechanical class string modifications following a single pattern.

### Success Criteria

- [ ] globals.css `--muted-foreground` updated from `24 4% 66%` to `24 6% 75%`
- [ ] NetWorthCard.tsx: 3 instances have `dark:text-warm-gray-400` override
- [ ] TopCategoriesCard.tsx: 5 instances have `dark:text-warm-gray-400` override
- [ ] FinancialHealthIndicator.tsx: 1 instance has `dark:text-warm-gray-400` override
- [ ] RecentTransactionsCard.tsx: 2 changes applied
- [ ] BudgetAlertsCard.tsx: 1 instance has `dark:text-warm-gray-400` override
- [ ] All text readable in dark mode

### Files to Modify

| File | Changes | Description |
|------|---------|-------------|
| `src/app/globals.css` | 1 | Update line 137 `--muted-foreground` value |
| `src/components/dashboard/NetWorthCard.tsx` | 3 | Add dark mode override to 3 text-muted-foreground usages |
| `src/components/dashboard/TopCategoriesCard.tsx` | 5 | Add dark mode override to 5 text-muted-foreground usages |
| `src/components/dashboard/FinancialHealthIndicator.tsx` | 1 | Add dark mode override to 1 text-muted-foreground usage |
| `src/components/dashboard/RecentTransactionsCard.tsx` | 2 | Add dark mode override + upgrade warm-gray-500 to 400 |
| `src/components/dashboard/BudgetAlertsCard.tsx` | 1 | Add dark mode override to 1 text-muted-foreground usage |

### Dependencies

**Depends on:** None
**Blocks:** Final integration verification

### Implementation Notes

#### globals.css (Line 137)

**Find:**
```css
--muted-foreground: 24 4% 66%;       /* Medium warm-gray */
```

**Replace with:**
```css
--muted-foreground: 24 6% 75%;       /* Lighter warm-gray for WCAG AA compliance */
```

#### NetWorthCard.tsx

Find all instances of `text-muted-foreground` and add `dark:text-warm-gray-400`:
- Line 17: Icon in loading state
- Line 33: Icon in loaded state
- Line 39: Subtitle text

#### TopCategoriesCard.tsx

Find all instances of `text-muted-foreground` and add `dark:text-warm-gray-400`:
- Line 17: Loading state icon
- Line 33: Empty state icon
- Line 36: Empty state text
- Line 46: Loaded state icon
- Line 52: Category labels

#### FinancialHealthIndicator.tsx

- Line 66: Add `dark:text-warm-gray-400` to sync status text

Note: Lines 73, 123, 127 already have proper dark mode patterns.

#### RecentTransactionsCard.tsx

- Line 21: Add `dark:text-warm-gray-400` to loading state icon
- Line 81: Change `dark:text-warm-gray-500` to `dark:text-warm-gray-400`

#### BudgetAlertsCard.tsx

- Line 38: Add `dark:text-warm-gray-400` to empty state message

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use Pattern 2 for adding dark mode override
- Use Pattern 3 for icon dark mode override
- Use Pattern 4 for upgrading warm-gray-500 to warm-gray-400

### Testing Requirements

1. Run `npm run build` - verify no TypeScript errors
2. Open dashboard in browser
3. Toggle to dark mode
4. Verify each card:
   - Net Worth: subtitle and icons visible
   - Top Categories: labels and empty state visible
   - Financial Health: sync status visible
   - Recent Transactions: icon and date/category visible
   - Budget Alerts: "all on track" message visible
5. Toggle to light mode - verify no regression

---

## Builder-2: Chat Components Verification

### Scope

Verify that ChatMessage.tsx and ChatInput.tsx already have proper dark mode implementations. Report findings. Only make changes if issues are found.

### Complexity Estimate

**VERY LOW**

Explorers confirmed these components are already fixed. This is verification only.

### Success Criteria

- [ ] ChatMessage.tsx verified to have proper dark mode patterns
- [ ] ChatInput.tsx verified to have proper dark mode patterns
- [ ] Any issues found are documented and fixed

### Files to Review

| File | Expected Status |
|------|-----------------|
| `src/components/chat/ChatMessage.tsx` | Already fixed (dark:text-warm-gray-400 on Bot icon, dark:text-warm-gray-500 on timestamp) |
| `src/components/chat/ChatInput.tsx` | Already fixed (dark:text-warm-gray-500 on helper text) |

### Dependencies

**Depends on:** None
**Blocks:** None

### Implementation Notes

#### ChatMessage.tsx - Expected to be ALREADY CORRECT

Verify these patterns exist:
- Line 45: Bot icon should have `dark:text-warm-gray-400`
- Line 75: Timestamp should have `dark:text-warm-gray-500`

#### ChatInput.tsx - Expected to be ALREADY CORRECT

Verify this pattern exists:
- Line 239: Helper text should have `dark:text-warm-gray-500`

Note: Line 208 uses `placeholder:text-muted-foreground` which will be fixed by Builder-1's globals.css update.

### If Issues Found

If any `text-muted-foreground` without dark mode override is found:
1. Add `dark:text-warm-gray-400` override
2. Document the change in builder report

### Testing Requirements

1. Open chat interface in browser
2. Toggle to dark mode
3. Verify:
   - Bot icon visible
   - Timestamps readable
   - Helper text readable
   - Input placeholder readable

---

## Builder-3: Landing Page AI Feature

### Scope

Add an AI Assistant feature card as the FIRST item in the landing page features grid. Use the Bot icon and match the existing card pattern exactly.

### Complexity Estimate

**MEDIUM**

Requires adding new content while matching existing patterns precisely.

### Success Criteria

- [ ] Bot icon imported from lucide-react
- [ ] AI Assistant card added as FIRST feature in grid
- [ ] Card matches exact pattern of existing feature cards
- [ ] Card content describes AI capabilities accurately
- [ ] Responsive grid still looks balanced (now 5 cards)
- [ ] Dark mode styling works correctly

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Add Bot import, add AI Assistant card |

### Dependencies

**Depends on:** None
**Blocks:** None

### Implementation Notes

#### Step 1: Update Import (Line 7)

**Find:**
```tsx
import { Heart, TrendingUp, Target, Sparkles, Shield, Lock, Github } from 'lucide-react'
```

**Replace with:**
```tsx
import { Bot, Heart, TrendingUp, Target, Sparkles, Shield, Lock, Github } from 'lucide-react'
```

#### Step 2: Add AI Assistant Card (After Line 72)

Insert this as the FIRST child of the features grid (before the Accounts card):

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

#### Step 3: Update Comments (Optional)

After adding, update the existing card comments:
- `{/* Feature 1: AI Assistant */}` (new)
- `{/* Feature 2: Accounts */}` (was Feature 1)
- `{/* Feature 3: Transactions */}` (was Feature 2)
- `{/* Feature 4: Budgets */}` (was Feature 3)
- `{/* Feature 5: Goals & Analytics */}` (was Feature 4)

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Landing Page Feature Card Pattern" section
- Match exact className values from existing cards
- Follow existing import order convention

### Testing Requirements

1. Run `npm run build` - verify no TypeScript errors
2. Open landing page in browser
3. Verify:
   - AI Assistant is first feature card
   - Card displays correctly (icon, title, description)
   - Card hover effect works
4. Test responsive views:
   - Desktop (lg): 5 cards should wrap naturally (4 + 1)
   - Tablet (md): 2 columns
   - Mobile: 1 column
5. Toggle dark mode - verify card styling correct

---

## Builder Execution Order

### Parallel Group 1 (All builders can run simultaneously)

- **Builder-1:** Global CSS & Dashboard Components
- **Builder-2:** Chat Components Verification
- **Builder-3:** Landing Page AI Feature

### Integration Notes

No merge conflicts expected - all builders work on isolated files.

**Integration verification steps:**
1. All 3 builders complete successfully
2. Run `npm run build` once more
3. Visual verification in browser:
   - Dashboard in dark mode
   - Chat in dark mode
   - Landing page in light and dark mode
4. Mark iteration complete

---

## Summary

| Builder | Files | Changes | Complexity |
|---------|-------|---------|------------|
| Builder-1 | 6 files | 13 class modifications | LOW |
| Builder-2 | 2 files | Verification only (0 expected) | VERY LOW |
| Builder-3 | 1 file | 1 import + 1 card insertion | MEDIUM |

**Total estimated time:** ~30 minutes (parallel execution)
