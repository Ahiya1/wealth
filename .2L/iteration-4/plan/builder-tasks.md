# Builder Task Breakdown - Iteration 4

## Overview

**7 primary builders** will work in sequence/parallel based on dependencies.
**Estimated total time:** 6.5 hours (with parallel execution)

**Critical Path:** Builder-0 MUST complete first, then Builder-1 (3 sub-builders), then Builders 2-5 in parallel, then Builder-6 validates.

---

## Builder-0: Design System Foundation (CRITICAL PATH)

### Scope
Install dependencies and establish the complete design system foundation that all other builders depend on.

### Complexity Estimate
**HIGH** (60 minutes)

This is the most critical builder. Everything else depends on this being done correctly.

### Success Criteria
- [ ] sonner and framer-motion installed and working
- [ ] Google Fonts (Inter + Crimson Pro) loading in app
- [ ] CSS variables (39+ tokens) defined in globals.css
- [ ] Tailwind config updated with sage/warm-gray palettes
- [ ] Animation utilities created (animations.ts)
- [ ] Chart color palette created (chartColors.ts)
- [ ] Toaster component added to root layout
- [ ] Test page renders with new fonts and colors
- [ ] Opacity modifiers work (test: `bg-sage-500/50`)

### Files to Create
- `/home/ahiya/Ahiya/wealth/src/lib/animations.ts` - Framer Motion variants
- `/home/ahiya/Ahiya/wealth/src/lib/chartColors.ts` - Recharts palette

### Files to Modify
- `/home/ahiya/Ahiya/wealth/package.json` - Add sonner, framer-motion
- `/home/ahiya/Ahiya/wealth/src/app/globals.css` - Complete CSS variable overhaul
- `/home/ahiya/Ahiya/wealth/tailwind.config.ts` - Add sage/warm-gray, fonts
- `/home/ahiya/Ahiya/wealth/src/app/layout.tsx` - Configure Google Fonts, add Toaster

### Dependencies
**Depends on:** Nothing (CRITICAL PATH START)
**Blocks:** All other builders

### Implementation Notes

**Step 1: Install Dependencies (5 min)**
```bash
cd /home/ahiya/Ahiya/wealth
npm install sonner framer-motion
npx shadcn@latest add tooltip
npx shadcn@latest add scroll-area
```

**Step 2: Update globals.css (15 min)**
- Copy EXACT CSS variables from `patterns.md` section "Design System Setup Pattern"
- All 39+ CSS variable tokens (sage, warm-gray, gold, coral, etc.)
- HSL format WITHOUT `hsl()` wrapper (critical for opacity modifiers)

**Step 3: Update tailwind.config.ts (10 min)**
- Copy EXACT config from `patterns.md`
- Add fontFamily (sans, serif)
- Add colors (sage, warm-gray, gold, coral, etc.)
- Add animations (fade-in, slide-in, skeleton)

**Step 4: Configure Fonts in layout.tsx (10 min)**
- Import Inter and Crimson_Pro from next/font/google
- Add CSS variables to html className
- Add Toaster component at end of body
- Copy EXACT code from `patterns.md`

**Step 5: Create Utility Files (15 min)**
- Create `src/lib/animations.ts` with all variants
- Create `src/lib/chartColors.ts` with palette
- Copy EXACT code from `patterns.md`

**Step 6: Test (5 min)**
```bash
npm run dev
# Open browser, inspect element
# Verify fonts load (Network tab)
# Test opacity modifier: add `bg-sage-500/50` class somewhere
# Verify Toaster renders (check React DevTools)
```

### Patterns to Follow
- **Design System Setup Pattern** from `patterns.md` (copy-paste all code)
- HSL format: `--sage-500: 140 13% 42%;` (NO `hsl()` wrapper)
- Font loading: `display: 'swap'` prevents FOIT

### Testing Requirements
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` has 0 errors
- [ ] Fonts visible in browser (check Network tab)
- [ ] Opacity modifiers work: `<div className="bg-sage-500/50">test</div>`
- [ ] Toaster renders (check React DevTools)
- [ ] No console errors

### Potential Split Strategy
**DO NOT SPLIT** - This builder is atomic. Splitting creates integration issues.

If behind schedule, reduce scope:
- Skip tooltip/scroll-area installation (defer to Iteration 5)
- Focus on core: fonts, colors, animations, toast

**Estimated Time:** 60 minutes

---

## Builder-1: Component Library (SPLIT into 3 sub-builders)

### Complexity Estimate
**VERY HIGH** (90 minutes total)

**Recommendation:** SPLIT into 3 parallel sub-builders

### Sub-builder 1A: Core UI Components

#### Scope
Create the 4 most important new components that other builders need.

#### Complexity: MEDIUM (35 minutes)

#### Success Criteria
- [ ] StatCard component works with trend indicators
- [ ] AffirmationCard shows daily rotating messages
- [ ] EmptyState component renders with icon and action slot
- [ ] PageTransition wrapper works on test page

#### Files to Create
- `/home/ahiya/Ahiya/wealth/src/components/ui/stat-card.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/ui/affirmation-card.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/ui/empty-state.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/ui/page-transition.tsx`

#### Dependencies
**Depends on:** Builder-0 (needs animations.ts, design system)
**Blocks:** Builder-2, Builder-3

#### Implementation Notes
- Copy EXACT code from `patterns.md` Component Patterns section
- StatCard: Test with both trend directions (up/down/neutral)
- AffirmationCard: Verify daily rotation (date modulo works)
- EmptyState: Test with/without action button
- PageTransition: Test fade-in animation works

#### Patterns to Follow
- **Pattern 1: StatCard Component** from `patterns.md`
- **Pattern 2: AffirmationCard Component** from `patterns.md`
- **Pattern 3: EmptyState Component** from `patterns.md`
- **Pattern 5: PageTransition Wrapper** from `patterns.md`

#### Testing Requirements
- [ ] All 4 components render without errors
- [ ] Animations smooth (no jank)
- [ ] TypeScript types correct
- [ ] StatCard hover effect works
- [ ] AffirmationCard changes daily (test by changing system date)

**Estimated Time:** 35 minutes

---

### Sub-builder 1B: Progress Components

#### Scope
Create specialized progress indicators for budgets and goals.

#### Complexity: MEDIUM (35 minutes)

#### Success Criteria
- [ ] EncouragingProgress component shows 5 different states
- [ ] Progress bar animates smoothly (0.8s duration)
- [ ] Messages change based on percentage thresholds
- [ ] ProgressRing component renders circular progress
- [ ] Ring animation smooth (0.8s duration)

#### Files to Create
- `/home/ahiya/Ahiya/wealth/src/components/ui/encouraging-progress.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/ui/progress-ring.tsx`

#### Dependencies
**Depends on:** Builder-0 (needs animations.ts, design system)
**Blocks:** Builder-4 (budgets), Builder-5 (goals)

#### Implementation Notes
- Copy EXACT code from `patterns.md`
- EncouragingProgress: Test all 5 states (excellent, good, approaching, nearLimit, attention)
- Test percentage edge cases: 0%, 50%, 75%, 90%, 100%, 105%
- ProgressRing: Verify SVG math (circumference calculations)
- Ensure gradient colors match design (sage, gold, coral)

#### Patterns to Follow
- **Pattern 4: EncouragingProgress Component** from `patterns.md`
- **Pattern 6: ProgressRing Component** from `patterns.md`

#### Testing Requirements
- [ ] All percentage thresholds work (0, 50, 75, 90, 100, 105)
- [ ] Animation duration 0.8s (not too fast/slow)
- [ ] Messages encouraging (not judgmental)
- [ ] Colors match palette (no red-500, green-500)
- [ ] ProgressRing SVG renders correctly

**Estimated Time:** 35 minutes

---

### Sub-builder 1C: Enhanced Existing Components

#### Scope
Update 4 existing components with new color palette and animations.

#### Complexity: LOW (20 minutes)

#### Success Criteria
- [ ] AccountCard uses sage/warm-gray colors (no harsh green/red)
- [ ] AccountCard has hover animation (lift effect)
- [ ] TransactionCard uses calm colors for amounts
- [ ] CategoryBadge uses sage palette
- [ ] Skeleton pulse animation slower (2s, not 1s)

#### Files to Modify
- `/home/ahiya/Ahiya/wealth/src/components/accounts/AccountCard.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/transactions/TransactionCard.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/categories/CategoryBadge.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/ui/skeleton.tsx`

#### Dependencies
**Depends on:** Builder-0 (needs design system)
**Blocks:** Builder-3 (accounts/transactions pages)

#### Implementation Notes

**AccountCard.tsx:**
- Find all `text-green-600` → replace with `text-sage-600`
- Find all `text-red-600` → replace with `text-warm-gray-700`
- Find all `text-orange-600` → replace with `text-coral`
- Wrap Card in `<motion.div {...cardHover}>`

**TransactionCard.tsx:**
- Same color replacements as AccountCard
- Income: `text-sage-600`
- Expenses: `text-warm-gray-700` (not red!)

**CategoryBadge.tsx:**
- Update badge colors to sage variants
- Use `bg-sage-100 text-sage-700 border-sage-200`

**Skeleton.tsx:**
- Change animation duration from 1s to 2s
- Update keyframes in globals.css or component

#### Patterns to Follow
- **Color Usage Rules** from `patterns.md`
- **Pattern 2: Hover Animation on Cards** from `patterns.md`

#### Testing Requirements
- [ ] Zero instances of `red-600`, `green-600`, `orange-600` in modified files
- [ ] Hover animation smooth (200ms)
- [ ] Colors match design (sage/warm-gray)
- [ ] Skeleton pulse slower, calmer

**Estimated Time:** 20 minutes

---

## Builder-2: Dashboard + Landing Pages

### Scope
Complete redesign of dashboard and landing page with new components and design system.

### Complexity Estimate
**HIGH** (105 minutes)

**Recommendation:** Single builder handles both (similar patterns)

### Success Criteria
- [ ] Dashboard has AffirmationCard at top
- [ ] All 5 dashboard cards replaced with StatCards
- [ ] Dashboard greeting uses serif font
- [ ] PageTransition wrapper applied
- [ ] Landing page has sage gradient hero
- [ ] Landing page headlines use Crimson Pro serif
- [ ] Landing page has smooth scroll to sections
- [ ] Both pages responsive (mobile tested)

### Files to Modify
- `/home/ahiya/Ahiya/wealth/src/app/page.tsx` - Landing page (full redesign)
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/dashboard/page.tsx` - Dashboard page
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/NetWorthCard.tsx` - Convert to StatCard usage
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/IncomeVsExpensesCard.tsx` - Convert to StatCard usage
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/TopCategoriesCard.tsx` - Convert to StatCard usage
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/BudgetSummaryCard.tsx` - Convert to StatCard usage
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/RecentTransactionsCard.tsx` - Style update only

### Dependencies
**Depends on:** Builder-0 (design system), Builder-1A (StatCard, AffirmationCard, PageTransition)
**Blocks:** None (parallel with Builder-3, Builder-4, Builder-5)

### Implementation Notes

**Dashboard Page (60 min):**

1. **Import new components:**
```typescript
import { PageTransition } from '@/components/ui/page-transition'
import { AffirmationCard } from '@/components/ui/affirmation-card'
import { StatCard } from '@/components/ui/stat-card'
```

2. **Add AffirmationCard at top:**
```typescript
<PageTransition>
  <div className="space-y-6">
    {/* Greeting */}
    <h1 className="text-3xl font-serif font-bold text-warm-gray-900">
      Welcome back, {user?.user_metadata?.name || 'there'}!
    </h1>

    {/* Affirmation */}
    <AffirmationCard />

    {/* Stats Grid */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Replace all cards with StatCard */}
    </div>
  </div>
</PageTransition>
```

3. **Replace NetWorthCard:**
```typescript
// BEFORE (delete this)
<NetWorthCard />

// AFTER (use this)
<StatCard
  title="Net Worth"
  value={formatCurrency(data?.netWorth || 0)}
  trend={{
    value: `${data?.trend > 0 ? '+' : ''}${data?.trend}% from last month`,
    direction: data?.trend > 0 ? 'up' : 'down'
  }}
  icon={DollarSign}
  variant="elevated"
/>
```

4. Repeat for all 5 cards

**Landing Page (45 min):**

1. **Hero section with sage gradient:**
```typescript
<section className="relative overflow-hidden bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 py-20">
  <div className="container mx-auto px-4">
    <h1 className="text-5xl md:text-6xl font-serif font-bold text-warm-gray-900 mb-6">
      Your Journey to
      <span className="block text-sage-700">Financial Mindfulness</span>
    </h1>
    <p className="text-xl text-warm-gray-700 max-w-2xl mb-8">
      Track your finances with calm clarity. Build wealth from stillness, not stress.
    </p>
    <Button size="lg" className="bg-sage-600 hover:bg-sage-700">
      Get Started
    </Button>
  </div>
</section>
```

2. **Feature cards with icons:**
```typescript
<section className="py-16">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-serif font-bold text-center mb-12">
      Conscious Money Management
    </h2>
    <div className="grid md:grid-cols-3 gap-8">
      {/* 3 feature cards with icons */}
    </div>
  </div>
</section>
```

### Patterns to Follow
- **StatCard Component** from `patterns.md`
- **AffirmationCard Component** from `patterns.md`
- **PageTransition Wrapper** from `patterns.md`
- **Color Usage Rules** from `patterns.md`

### Testing Requirements
- [ ] Dashboard loads without errors
- [ ] All StatCards show correct data
- [ ] AffirmationCard rotates daily
- [ ] PageTransition animation smooth
- [ ] Landing page hero gradient renders
- [ ] Serif fonts load and display
- [ ] Responsive on mobile (375px width)
- [ ] No console errors

### Potential Split Strategy
If running over time:
- **Primary:** Dashboard (60 min)
- **Sub-builder 2A:** Landing page (45 min)

**Estimated Time:** 105 minutes

---

## Builder-3: Accounts + Transactions Pages

### Scope
Enhance accounts and transactions pages with new components and design system.

### Complexity Estimate
**MEDIUM** (60 minutes)

### Success Criteria
- [ ] Accounts page has EmptyState when no accounts
- [ ] AccountList uses enhanced AccountCard (from Builder-1C)
- [ ] PageTransition applied to accounts page
- [ ] Transactions page has EmptyState when no transactions
- [ ] TransactionList uses enhanced TransactionCard (from Builder-1C)
- [ ] PageTransition applied to transactions page
- [ ] Filter bars styled with new palette
- [ ] Both pages responsive

### Files to Modify
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/accounts/page.tsx`
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/transactions/page.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/accounts/AccountList.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/transactions/TransactionListPage.tsx`

### Dependencies
**Depends on:** Builder-0, Builder-1A (EmptyState, PageTransition), Builder-1C (enhanced cards)
**Blocks:** None (parallel)

### Implementation Notes

**Accounts Page (30 min):**

1. **Add PageTransition wrapper:**
```typescript
import { PageTransition } from '@/components/ui/page-transition'

export default function AccountsPage() {
  return (
    <PageTransition>
      {/* content */}
    </PageTransition>
  )
}
```

2. **Add EmptyState:**
```typescript
import { EmptyState } from '@/components/ui/empty-state'
import { Wallet } from 'lucide-react'

{accounts.length === 0 ? (
  <EmptyState
    icon={Wallet}
    title="No accounts yet"
    description="Connect your first account to start tracking your financial journey"
    action={
      <Button onClick={handleAddAccount} className="bg-sage-600">
        <Plus className="mr-2 h-4 w-4" />
        Add Account
      </Button>
    }
  />
) : (
  <AccountList accounts={accounts} />
)}
```

**Transactions Page (30 min):**
- Same pattern as Accounts
- Different EmptyState message
- Enhanced TransactionCard already has new colors (from Builder-1C)

### Patterns to Follow
- **EmptyState Component** from `patterns.md`
- **PageTransition Wrapper** from `patterns.md`

### Testing Requirements
- [ ] EmptyState shows when no data
- [ ] EmptyState action button works
- [ ] PageTransition animation smooth
- [ ] AccountCard colors correct (no red/green)
- [ ] TransactionCard colors correct
- [ ] Responsive on mobile

**Estimated Time:** 60 minutes

---

## Builder-4: Budgets Page

### Scope
Replace harsh traffic-light progress bars with encouraging EncouragingProgress component.

### Complexity Estimate
**MEDIUM** (40 minutes)

### Success Criteria
- [ ] BudgetProgressBar replaced with EncouragingProgress
- [ ] All 5 progress states work (excellent, good, approaching, nearLimit, attention)
- [ ] Messages encouraging (not judgmental)
- [ ] PageTransition applied
- [ ] EmptyState when no budgets
- [ ] Month selector styled with new palette
- [ ] Mobile responsive

### Files to Modify
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/budgets/page.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/budgets/BudgetList.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/budgets/BudgetCard.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/budgets/BudgetProgressBar.tsx` (DELETE or replace)

### Dependencies
**Depends on:** Builder-0, Builder-1A (EmptyState, PageTransition), Builder-1B (EncouragingProgress)
**Blocks:** None (parallel)

### Implementation Notes

1. **Replace BudgetProgressBar:**
```typescript
// BEFORE (delete this)
import { BudgetProgressBar } from './BudgetProgressBar'
<BudgetProgressBar percentage={75} status="warning" />

// AFTER (use this)
import { EncouragingProgress } from '@/components/ui/encouraging-progress'
<EncouragingProgress
  percentage={(spent / budget.amount) * 100}
  spent={spent}
  budget={budget.amount}
/>
```

2. **Add EmptyState:**
```typescript
import { Target } from 'lucide-react'

{budgets.length === 0 ? (
  <EmptyState
    icon={Target}
    title="No budgets set"
    description="Create your first budget to track spending and stay mindful"
    action={
      <Button onClick={handleCreateBudget}>
        Create Budget
      </Button>
    }
  />
) : (
  <BudgetList budgets={budgets} />
)}
```

3. **Update month selector styling:**
- Use sage-600 for selected month
- Use warm-gray-200 for borders

### Patterns to Follow
- **EncouragingProgress Component** from `patterns.md`
- **EmptyState Component** from `patterns.md`

### Testing Requirements
- [ ] All progress states display correctly
- [ ] Messages match percentage thresholds
- [ ] No red/yellow/green traffic light colors
- [ ] Animation smooth (0.8s duration)
- [ ] EmptyState shows when no budgets
- [ ] Month selector works

**Estimated Time:** 40 minutes

---

## Builder-5: Analytics + Goals Pages

### Scope
Update chart colors and add progress rings to goals.

### Complexity Estimate
**MEDIUM** (60 minutes)

### Success Criteria
- [ ] All 5 analytics charts use sage/warm-gray palette
- [ ] Chart tooltips styled consistently
- [ ] Goals page has ProgressRing components
- [ ] PageTransition applied to both pages
- [ ] EmptyState when no data
- [ ] Mobile responsive

### Files to Modify
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/analytics/page.tsx`
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/goals/page.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/analytics/SpendingByCategoryChart.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/analytics/SpendingTrendsChart.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/analytics/MonthOverMonthChart.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/analytics/IncomeSourcesChart.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/analytics/NetWorthChart.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/goals/GoalCard.tsx`

### Dependencies
**Depends on:** Builder-0 (chartColors.ts), Builder-1A (EmptyState, PageTransition), Builder-1B (ProgressRing)
**Blocks:** None (parallel)

### Implementation Notes

**Analytics Charts (30 min):**

For each chart component:

1. **Import chart colors:**
```typescript
import { CHART_COLORS, CHART_CONFIG, CATEGORY_COLORS } from '@/lib/chartColors'
```

2. **Update chart props:**
```typescript
<LineChart data={data}>
  <CartesianGrid {...CHART_CONFIG.cartesianGrid} />
  <XAxis {...CHART_CONFIG.xAxis} />
  <YAxis {...CHART_CONFIG.yAxis} />
  <Tooltip content={<CustomTooltip />} />
  <Line stroke={CHART_COLORS.primary} />
</LineChart>
```

3. **Custom tooltip (copy from patterns.md):**
```typescript
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
```

**Goals Page (30 min):**

1. **Add ProgressRing to GoalCard:**
```typescript
import { ProgressRing } from '@/components/ui/progress-ring'

<div className="relative">
  <ProgressRing
    percentage={(goal.currentAmount / goal.targetAmount) * 100}
  />
</div>
```

2. **Add EmptyState:**
```typescript
import { Trophy } from 'lucide-react'

{goals.length === 0 && (
  <EmptyState
    icon={Trophy}
    title="No goals yet"
    description="Set your first financial goal and track your progress"
    action={<Button onClick={handleCreateGoal}>Create Goal</Button>}
  />
)}
```

### Patterns to Follow
- **Chart Theming Pattern** from `patterns.md`
- **ProgressRing Component** from `patterns.md`
- **EmptyState Component** from `patterns.md`

### Testing Requirements
- [ ] All charts use consistent colors
- [ ] Tooltips styled correctly
- [ ] ProgressRing animates smoothly
- [ ] EmptyStates show when no data
- [ ] Charts responsive on mobile

**Estimated Time:** 60 minutes

---

## Builder-6: Testing + Validation

### Scope
Manual testing, bug fixing, and final polish pass.

### Complexity Estimate
**MEDIUM** (30 minutes)

### Success Criteria
- [ ] All 20 success criteria from overview.md met
- [ ] No TypeScript errors
- [ ] Production build succeeds
- [ ] All pages tested manually
- [ ] Mobile responsive verified
- [ ] Animation performance smooth
- [ ] No console errors
- [ ] Color audit passed (zero red-600/green-600)

### Testing Checklist

**Automated Checks:**
```bash
# TypeScript
npx tsc --noEmit
# Expected: 0 errors

# Build
npm run build
# Expected: Success

# Tests
npm run test -- --run
# Expected: No new failures

# ESLint
npm run lint
# Expected: No new errors
```

**Manual Testing:**

1. **Dashboard**
   - [ ] AffirmationCard shows daily message
   - [ ] All StatCards show correct data
   - [ ] PageTransition smooth
   - [ ] Responsive on mobile

2. **Accounts**
   - [ ] EmptyState shows when no accounts
   - [ ] AccountCard colors correct (no red/green)
   - [ ] Hover animation works
   - [ ] Create account flow works

3. **Transactions**
   - [ ] EmptyState shows when no transactions
   - [ ] TransactionCard colors calm (no harsh red)
   - [ ] Filters work
   - [ ] Create transaction shows toast

4. **Budgets**
   - [ ] EncouragingProgress shows all 5 states
   - [ ] Messages encouraging (not judgmental)
   - [ ] No traffic light colors
   - [ ] Month navigation works

5. **Goals**
   - [ ] ProgressRing animates smoothly
   - [ ] EmptyState actionable
   - [ ] Goal creation works

6. **Analytics**
   - [ ] All charts use sage/warm-gray
   - [ ] Tooltips styled consistently
   - [ ] Charts responsive

7. **Landing**
   - [ ] Sage gradient renders
   - [ ] Serif fonts load
   - [ ] CTA buttons work

**Color Audit:**
```bash
# Must return ZERO results
grep -r "text-red-600\|bg-red-600\|text-green-600\|bg-green-600" src/

# Must return MULTIPLE results (all pages)
grep -r "PageTransition" src/app/

# Must exist
ls src/components/ui/affirmation-card.tsx
```

**Animation Performance:**
- Open Chrome DevTools → Performance
- Record page transition
- Verify 60fps (no jank)
- Test on throttled CPU (4x slowdown)

**Accessibility Check:**
- Run Lighthouse audit
- Color contrast ≥4.5:1 (WCAG AA)
- Keyboard navigation works
- Screen reader labels present

### Bug Fix Protocol

If bugs found:
1. Document in bug list
2. Prioritize: Critical (blocks UX) vs Minor (cosmetic)
3. Fix critical bugs immediately
4. Defer minor bugs to post-integration

### Dependencies
**Depends on:** All builders (2-5) complete
**Blocks:** Nothing (final step)

**Estimated Time:** 30 minutes

---

## Builder Execution Order

### Phase 1: Foundation (Sequential - CRITICAL PATH)
**Builder-0:** Design System Foundation (60 min)
- Install dependencies
- Configure fonts, colors, animations
- **BLOCKS EVERYTHING ELSE**

### Phase 2: Components (Parallel - after Builder-0)
**Builder-1A:** Core UI Components (35 min)
**Builder-1B:** Progress Components (35 min)
**Builder-1C:** Enhanced Components (20 min)
- All 3 can run in parallel
- **BLOCKS Phase 3**

### Phase 3: Pages (Parallel - after Builder-1)
**Builder-2:** Dashboard + Landing (105 min)
**Builder-3:** Accounts + Transactions (60 min)
**Builder-4:** Budgets (40 min)
**Builder-5:** Analytics + Goals (60 min)
- All 4 can run in parallel
- **BLOCKS Phase 4**

### Phase 4: Validation (Sequential - after all pages)
**Builder-6:** Testing + Validation (30 min)
- Manual testing
- Bug fixes
- Final polish

---

## Integration Notes

### File Conflicts (Unlikely)
- Each builder has distinct file ownership
- Shared components created in Phase 2
- Pages modified in Phase 3

### If Conflicts Occur
1. Prioritize Builder-0 and Builder-1 outputs
2. Page builders re-pull latest before committing
3. Integration specialist manually resolves

### Shared Files Coordination
**globals.css** - Only Builder-0 modifies
**tailwind.config.ts** - Only Builder-0 modifies
**layout.tsx** - Only Builder-0 modifies
**All other files** - Single owner per builder

---

## Success Validation

### Before Integration
Each builder must verify:
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Code follows patterns.md exactly
- [ ] Components render without errors
- [ ] Animations smooth (test in browser)
- [ ] Colors match palette (no red-600/green-600)

### After Integration
Integration specialist verifies:
- [ ] Production build succeeds
- [ ] All 20 success criteria met
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance acceptable (60fps)

---

## Time Estimates Summary

| Builder | Tasks | Parallel? | Time |
|---------|-------|-----------|------|
| Builder-0 | Design System | No (CRITICAL PATH) | 60 min |
| Builder-1A | Core Components | Yes | 35 min |
| Builder-1B | Progress Components | Yes | 35 min |
| Builder-1C | Enhanced Components | Yes | 20 min |
| Builder-2 | Dashboard + Landing | Yes | 105 min |
| Builder-3 | Accounts + Transactions | Yes | 60 min |
| Builder-4 | Budgets | Yes | 40 min |
| Builder-5 | Analytics + Goals | Yes | 60 min |
| Builder-6 | Testing + Validation | No | 30 min |

**Total Sequential Time:** ~450 minutes (7.5 hours)
**With Parallel Execution:** ~390 minutes (6.5 hours)

---

**END OF BUILDER-TASKS.MD - Ready for execution!**
