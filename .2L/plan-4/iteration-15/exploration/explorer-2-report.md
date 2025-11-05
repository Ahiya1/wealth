# Explorer 2 Report: Forms Optimization & Mobile Component Analysis

## Executive Summary

Comprehensive analysis of 10 form components and 40+ UI components reveals **moderate complexity** with clear optimization paths. Current state: Input component has mobile-first height (48px) and inputMode support from iteration 14, but **zero forms actively use inputMode**. All forms use centered dialogs (no bottom sheets). Transaction/budget/goal lists already use card layouts. Key findings: Forms need inputMode propagation (2-3 hours), mobile sheet pattern (3-4 hours), keyboard handling strategy (2-3 hours).

**Critical Discovery:** Input component infrastructure is ready, but form implementations lag behind. No visualViewport API usage exists. No mobile-specific form patterns implemented.

## Discoveries

### Form Components Inventory

**10 Form Components Analyzed:**

1. **AddTransactionForm** (`src/components/transactions/AddTransactionForm.tsx`)
   - Lines: 265
   - Inputs: 7 (account, date, amount, payee, category, notes, tags)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - Amount input: `type="number"` but NO `inputMode="decimal"`
     - Date input: Native `<input type="date">` (good for mobile)
     - Tags: Custom badge UI with input (no inputMode)
   - Submit button: Fixed at bottom with border-top (good pattern)
   - Dialog usage: Used in TransactionList (centered dialog)

2. **TransactionForm** (`src/components/transactions/TransactionForm.tsx`)
   - Lines: 244
   - Inputs: 6 (account, date, amount, payee, category, notes, tags)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - Amount: `type="number" step="0.01"` but NO inputMode
     - Tags: Comma-separated text input (no inputMode)
   - Submit button: Full-width at bottom (good)
   - Dialog usage: Used in TransactionList edit (centered dialog)

3. **BudgetForm** (`src/components/budgets/BudgetForm.tsx`)
   - Lines: 176
   - Inputs: 4 (categoryId, amount, month, rollover)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - Amount: `type="number" step="0.01" min="0"` but NO inputMode
     - Month: `type="month"` (native picker, good)
     - Rollover: Checkbox (no issue)
   - Submit button: Full-width (good)
   - Dialog usage: Used in BudgetList (centered dialog)

4. **GoalForm** (`src/components/goals/GoalForm.tsx`)
   - Lines: 223
   - Inputs: 6 (name, type, targetAmount, currentAmount, targetDate, linkedAccountId)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - targetAmount: `type="number" step="0.01"` NO inputMode
     - currentAmount: `type="number" step="0.01"` NO inputMode
     - targetDate: `type="date"` (native picker, good)
   - Layout: Two-column grid on desktop for amounts
   - Submit button: Full-width (good)
   - Dialog usage: Used in GoalList (centered dialog)

5. **RecurringTransactionForm** (`src/components/recurring/RecurringTransactionForm.tsx`)
   - Lines: 273
   - Inputs: 10+ (account, amount, payee, category, frequency, dates, dayOfMonth, dayOfWeek, notes)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - Amount: `type="number" step="0.01"` NO inputMode
     - dayOfMonth: `type="number" min="-1" max="31"` NO inputMode
   - Conditional fields: Show dayOfMonth for MONTHLY, dayOfWeek for WEEKLY/BIWEEKLY (good UX)
   - Submit button: Right-aligned (not ideal for mobile)

6. **CategoryForm** (`src/components/categories/CategoryForm.tsx`)
   - Lines: 270
   - Inputs: 4 (name, icon, color, parentId)
   - Current inputMode usage: **NONE** (but no numeric inputs, OK)
   - Special: Icon picker with Lucide icons, color picker with swatches
   - Mobile concern: Color swatches need touch target verification (8x8, may be too small)
   - Submit button: Standard (no explicit width)

7. **AccountForm** (`src/components/accounts/AccountForm.tsx`)
   - Lines: 198
   - Inputs: 5 (type, name, institution, balance, currency)
   - Current inputMode usage: **NONE** ❌
   - Issues:
     - Balance: `type="number" step="0.01"` NO inputMode
   - Currency: Disabled input showing NIS (good)
   - Submit button: Full-width (good)

8. **SignInForm** (`src/components/auth/SignInForm.tsx`)
   - Inputs: 2 (email, password)
   - Current inputMode usage: **NOT ANALYZED** (auth forms out of scope for iteration 15)
   - Note: Auth forms likely need `inputMode="email"` for email field

9. **SignUpForm** (`src/components/auth/SignUpForm.tsx`)
   - Inputs: 3+ (name, email, password)
   - Current inputMode usage: **NOT ANALYZED** (out of scope)

10. **ResetPasswordForm** (`src/components/auth/ResetPasswordForm.tsx`)
    - Inputs: 1 (email)
    - Current inputMode usage: **NOT ANALYZED** (out of scope)

### Input Component Analysis

**Current State (from iteration 14):**

```typescript
// src/components/ui/input.tsx (lines 1-27)
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode}  // ✅ Prop exists and is forwarded
        className={cn(
          "flex h-12 w-full rounded-lg bg-background px-3 py-2 sm:h-10 text-sm ...",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

**Height Analysis:**
- Mobile: `h-12` = 48px ✅ (WCAG AA minimum: 44px)
- Desktop: `sm:h-10` = 40px ✅
- Touch target compliance: **PASSES**

**inputMode Support:** ✅ Infrastructure ready, **but no forms use it**

### Textarea Component Analysis

```typescript
// src/components/ui/textarea.tsx (lines 1-25)
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg ...",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

**Issues:**
- NO mobile-specific height adjustment
- min-h-[80px] same for all breakpoints
- NO inputMode support (textareas don't need it, OK)

### Select Component Analysis

```typescript
// src/components/ui/select.tsx (line 87)
<SelectPrimitive.Viewport
  className={cn(
    "p-1",
    position === "popper" &&
      "h-[var(--radix-select-trigger-height)] w-full min-w-[calc(100vw-4rem)] sm:min-w-[var(--radix-select-trigger-width)]"
  )}
>
```

**Mobile Optimization (iteration 14):**
- ✅ Mobile: `min-w-[calc(100vw-4rem)]` (full width minus 32px margin)
- ✅ Desktop: `sm:min-w-[var(--radix-select-trigger-width)]`
- ✅ Collision padding: `collisionPadding={16}` (stays 16px from edges)
- **Status:** Already optimized

### Button Component Analysis

```typescript
// src/components/ui/button.tsx (lines 19-24)
size: {
  default: "h-11 px-4 py-2 sm:h-10",        // 44px mobile ✅
  sm: "h-10 rounded-lg px-3 sm:h-9",        // 40px mobile (borderline)
  lg: "h-12 rounded-lg px-8 sm:h-11",       // 48px mobile ✅
  icon: "h-11 w-11 sm:h-10 sm:w-10",        // 44x44 mobile ✅
}
```

**Touch Target Analysis:**
- Default buttons: 44px ✅
- Small buttons: 40px ⚠️ (below WCAG AA 44px, acceptable for dense UI)
- Large buttons: 48px ✅
- Icon buttons: 44x44px ✅

**Loading State:** ✅ `loading` prop with spinner animation

### Dialog Component Analysis

```typescript
// src/components/ui/dialog.tsx (line 35)
<DialogPrimitive.Content
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-soft-xl rounded-lg duration-200 ... max-h-[90vh] sm:max-h-[85vh] overflow-auto",
    className
  )}
>
```

**Current Pattern:**
- Centered modal on all screen sizes
- Mobile: `w-[calc(100%-2rem)]` (full width minus 16px margin each side)
- Mobile: `p-4` (16px padding)
- Desktop: `p-6` (24px padding)
- Max height: 90vh mobile, 85vh desktop
- Overflow: `overflow-auto` (scrollable content)

**NO Bottom Sheet Variant Exists** ❌

### Mobile Sheet Component

**Does NOT Exist** ❌

Expected location: `src/components/mobile/MobileSheet.tsx` or `src/components/ui/sheet.tsx`

**Current Mobile Components (from iteration 14):**
- ✅ `BottomNavigation.tsx` - Bottom nav bar with scroll-hide
- ✅ `MoreSheet.tsx` - Overflow navigation sheet

**MoreSheet Analysis:**
- Uses Radix Dialog primitive
- Positioned at bottom (bottom sheet pattern)
- Could serve as template for form bottom sheets

## Patterns Identified

### Pattern 1: Form Input Optimization

**Description:** Standardized mobile keyboard triggering for numeric inputs

**Use Case:** All amount/balance/quantity inputs

**Current State:**
```typescript
// CURRENT (suboptimal)
<Input
  id="amount"
  type="number"
  step="0.01"
  {...register('amount', { valueAsNumber: true })}
/>
```

**Recommended:**
```typescript
// OPTIMIZED
<Input
  id="amount"
  type="number"
  step="0.01"
  inputMode="decimal"  // ✅ Shows numeric keyboard with decimal point
  {...register('amount', { valueAsNumber: true })}
/>
```

**Implementation Checklist:**
- [ ] AddTransactionForm: amount input
- [ ] TransactionForm: amount input
- [ ] BudgetForm: amount input
- [ ] GoalForm: targetAmount, currentAmount inputs
- [ ] RecurringTransactionForm: amount, dayOfMonth inputs
- [ ] AccountForm: balance input

**Estimated Effort:** 2-3 hours (7 forms, ~20 input instances)

### Pattern 2: Mobile Bottom Sheet for Forms

**Description:** Replace centered dialogs with bottom sheets on mobile (<768px)

**Use Case:** Transaction forms, budget forms, goal forms

**Component Structure:**
```typescript
// src/components/mobile/MobileSheet.tsx
interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function MobileSheet({ open, onOpenChange, title, description, children }: MobileSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) {
    // Render as dialog on desktop
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  // Render as bottom sheet on mobile
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50",
            "rounded-t-2xl border-t bg-background",
            "max-h-[85vh] overflow-y-auto",
            "p-4 pb-safe-b", // Safe area padding for iPhone notch
            "data-[state=open]:animate-slide-up",
            "data-[state=closed]:animate-slide-down"
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1 rounded-full bg-muted mb-4" />
          
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
```

**Recommendation:** Create MobileSheet, migrate high-frequency forms (transactions, budgets)

**Forms to Convert (Priority Order):**
1. **High Priority:**
   - AddTransactionForm (most frequent action)
   - TransactionForm (editing)
   - BudgetForm (monthly setup)

2. **Medium Priority:**
   - GoalForm (less frequent)
   - RecurringTransactionForm (rare)

3. **Low Priority:**
   - CategoryForm (rare, admin-like)
   - AccountForm (setup only)
   - Auth forms (out of scope)

### Pattern 3: Keyboard-Aware Form Layout

**Description:** Adjust layout when mobile keyboard is visible using visualViewport API

**Problem:** Mobile keyboard covers submit buttons (especially on iPhone)

**Current State:** No keyboard detection exists ❌

**Recommended Implementation:**

```typescript
// src/hooks/useKeyboardVisible.ts
'use client'

import { useState, useEffect } from 'react'

export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport

    const handleResize = () => {
      // Keyboard is visible when viewport height is significantly less than window height
      const keyboardVisible = viewport.height < window.innerHeight * 0.75
      setIsKeyboardVisible(keyboardVisible)
    }

    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleResize)

    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return isKeyboardVisible
}
```

**Usage in Forms:**
```typescript
export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const isKeyboardVisible = useKeyboardVisible()
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <form className="space-y-4">
      {/* Form fields */}
      
      {/* Submit button - fixed at bottom when keyboard visible on mobile */}
      <div
        className={cn(
          isMobile && isKeyboardVisible && 
          "fixed bottom-0 inset-x-0 p-4 bg-background border-t shadow-lg z-50"
        )}
      >
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </div>
    </form>
  )
}
```

**Alternative Strategy (Simpler):**
- Use CSS scroll padding: `scroll-padding-bottom: 200px` on form container
- Let browser handle scrolling input into view
- Ensure submit button has `mb-20` (80px bottom margin) for clearance

**Recommendation:** Start with CSS approach, add visualViewport hook if issues persist

### Pattern 4: Date Input Mobile Optimization

**Description:** Native date pickers work well on mobile, keep them

**Current State:** ✅ All date inputs use `type="date"` (correct)

**Example:**
```typescript
<Input id="date" type="date" {...register('date')} />
```

**Mobile Behavior:**
- iOS: Shows native date picker wheel
- Android: Shows calendar picker
- Desktop: Shows browser date input (or fallback to text)

**Recommendation:** No changes needed, keep current pattern

### Pattern 5: Select Component Mobile Pattern

**Description:** Full-width select menus on mobile (already implemented)

**Current State:** ✅ Select component already optimized (iteration 14)

**Mobile Behavior:**
- Content width: `min-w-[calc(100vw-4rem)]` (full width minus margins)
- Collision padding: 16px from edges
- Scrollable: Up/down buttons for long lists

**Recommendation:** No changes needed

## Complexity Assessment

### High Complexity Areas

**1. Mobile Sheet Component Creation (3-4 hours)**
- **Complexity Drivers:**
  - Responsive switching (dialog desktop, sheet mobile)
  - Animation coordination (slide-up/slide-down)
  - Safe area handling (iPhone notch, Android gesture bar)
  - Drag handle UI
  - Focus trap management
  - Portal rendering
- **Builder Split Recommendation:** Single builder (not complex enough to split)
- **Implementation Steps:**
  1. Create base MobileSheet component (1.5 hours)
  2. Add animations and transitions (0.5 hours)
  3. Test on mobile devices (1 hour)
  4. Handle edge cases (keyboard interaction, safe areas) (1 hour)

**2. Form inputMode Propagation (2-3 hours)**
- **Complexity Drivers:**
  - 10+ forms to update
  - 20+ input instances
  - Testing each form on mobile
  - Regression testing (ensure no desktop breakage)
- **Builder Split Recommendation:** Single builder (mechanical work)
- **Implementation Steps:**
  1. Update amount inputs with inputMode="decimal" (1 hour)
  2. Update email inputs with inputMode="email" (auth forms, 0.5 hours)
  3. Mobile device testing (Safari iOS, Chrome Android) (1 hour)
  4. Document pattern in codebase (0.5 hours)

**3. Keyboard Handling Strategy (2-3 hours)**
- **Complexity Drivers:**
  - visualViewport API browser support
  - iOS Safari quirks (viewport units change)
  - Android differences
  - Testing on real devices required
  - Scroll behavior coordination
- **Builder Split Recommendation:** Single builder, but needs real device testing
- **Implementation Steps:**
  1. Create useKeyboardVisible hook (1 hour)
  2. Update 2-3 high-priority forms (TransactionForm, BudgetForm) (1 hour)
  3. Real device testing (iPhone, Android) (1 hour)
  4. Iterate on issues (may need additional time)

### Medium Complexity Areas

**1. Bottom Sheet Form Migration (4-5 hours)**
- **Work Involved:**
  - Wrap 3 high-priority forms with MobileSheet
  - Update parent components (TransactionList, BudgetList)
  - Test open/close interactions
  - Verify form submission still works
  - Test keyboard interactions
- **Builder Split Recommendation:** Single builder
- **Forms to Migrate:**
  1. AddTransactionForm (1.5 hours)
  2. TransactionForm (1.5 hours)
  3. BudgetForm (1.5 hours)
  4. Testing and fixes (1 hour)

**2. Category Picker Touch Target Fixes (1-2 hours)**
- **Current Issue:** Color swatches in CategoryForm are 8x8 (32x32px), below WCAG minimum
- **Fix:**
  ```typescript
  // Current: w-8 h-8 (32px)
  <button className="w-8 h-8 rounded border-2" />
  
  // Fixed: w-12 h-12 (48px) on mobile
  <button className="w-12 h-12 sm:w-8 sm:h-8 rounded border-2" />
  ```
- **Builder Split Recommendation:** Trivial, include in other work

### Low Complexity Areas

**1. Submit Button Positioning Audit (1 hour)**
- **Work:** Verify all forms have submit buttons visible with keyboard open
- **Current State:** Most forms have full-width buttons at bottom (good)
- **Issue:** RecurringTransactionForm has right-aligned button
- **Fix:** Add `w-full sm:w-auto` to button

**2. Textarea Mobile Height (0.5 hours)**
- **Current:** min-h-[80px] same for all breakpoints
- **Recommendation:** May not need changes (80px is reasonable)
- **Optional Enhancement:** Add `min-h-[100px] sm:min-h-[80px]` for more mobile space

## Integration Points

### Form Components → Input Component

**Integration:** All form components use `<Input>` from `src/components/ui/input.tsx`

**Current State:**
- Input component has inputMode prop ✅
- Forms do NOT pass inputMode prop ❌

**Required Changes:**
```typescript
// BEFORE
<Input type="number" step="0.01" {...register('amount')} />

// AFTER
<Input type="number" step="0.01" inputMode="decimal" {...register('amount')} />
```

**Affected Files:**
- src/components/transactions/AddTransactionForm.tsx (1 instance)
- src/components/transactions/TransactionForm.tsx (1 instance)
- src/components/budgets/BudgetForm.tsx (1 instance)
- src/components/goals/GoalForm.tsx (2 instances)
- src/components/recurring/RecurringTransactionForm.tsx (2 instances)
- src/components/accounts/AccountForm.tsx (1 instance)

**Total:** 8 instances across 6 files

### Form Lists → Dialog Component

**Integration:** TransactionList, BudgetList, GoalList use Dialog to wrap forms

**Current Pattern:**
```typescript
// TransactionList.tsx (line 159)
<Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Transaction</DialogTitle>
    </DialogHeader>
    <TransactionForm transaction={transactionToEdit} onSuccess={() => setEditingTransaction(null)} />
  </DialogContent>
</Dialog>
```

**Migration to MobileSheet:**
```typescript
// TransactionList.tsx (after MobileSheet creation)
<MobileSheet
  open={!!editingTransaction}
  onOpenChange={(open) => !open && setEditingTransaction(null)}
  title="Edit Transaction"
>
  <TransactionForm transaction={transactionToEdit} onSuccess={() => setEditingTransaction(null)} />
</MobileSheet>
```

**Affected Files:**
- src/components/transactions/TransactionList.tsx (2 dialogs: add, edit)
- src/components/budgets/BudgetList.tsx (1 dialog: edit)
- src/components/goals/GoalList.tsx (1 dialog: edit)

**Total:** 4 dialog instances to migrate

### Form Inputs → Mobile Keyboard

**Integration:** Input component inputMode → Mobile OS keyboard

**Keyboard Mapping:**

| Input Type | inputMode | iOS Keyboard | Android Keyboard |
|------------|-----------|--------------|------------------|
| Amount | `decimal` | Numeric with decimal | Numeric with decimal |
| Day of Month | `numeric` | Numeric (no decimal) | Numeric (no decimal) |
| Email | `email` | Email layout (@, .) | Email layout |
| Phone | `tel` | Phone pad | Phone pad |
| Date | (native) | Date wheel picker | Calendar picker |

**Testing Matrix:**
- iOS Safari 15+ (iPhone SE, iPhone 14 Pro)
- Chrome Mobile (Android mid-range)
- Verify keyboard shows correct layout
- Verify decimal point accessible for amounts

## Technology Recommendations

### Primary Stack (Keep)

**React Hook Form + Zod** (Current)
- Rationale: Already used in all forms, works well
- Mobile consideration: Validation errors need to be visible with keyboard open
- No changes needed

**Radix UI Dialog** (Current)
- Rationale: Solid foundation, already in use
- Mobile consideration: Extend with bottom sheet variant
- Recommendation: Keep Dialog for desktop, extend for mobile

**Tailwind CSS Mobile-First** (Current)
- Rationale: All components use mobile-first breakpoints
- Mobile consideration: Safe area utilities already added (iteration 14)
- No changes needed

### Supporting Libraries

**Add: None Required** ✅

All necessary dependencies already installed:
- `@radix-ui/react-dialog` (for MobileSheet)
- `framer-motion` (for animations, already used)
- `class-variance-authority` (for component variants)

**Avoid: External Sheet Libraries**

Recommendation: Do NOT add `vaul` or `react-modal-sheet`

Rationale:
- Can build on top of Radix Dialog
- Smaller bundle size
- More control over mobile behavior
- Consistent with existing architecture

## Mobile Filter Requirements

### Current Filter State

**TransactionListPage Analysis:**
- Location: `src/components/transactions/TransactionListPage.tsx` (expected)
- Current State: **NOT ANALYZED** (file not read in this exploration)
- Assumption: Filters likely exist (account, category, date range)

**BudgetList Analysis:**
- No filters detected (month selection likely handled by parent)

**GoalList Analysis:**
- Filter: `includeCompleted` boolean (simple toggle)

### MobileFilterSheet Requirements

**Component Structure:**

```typescript
// src/components/mobile/MobileFilterSheet.tsx
interface MobileFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: FilterState
  onApplyFilters: (filters: FilterState) => void
  onResetFilters: () => void
}

export function MobileFilterSheet({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  onResetFilters
}: MobileFilterSheetProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  return (
    <MobileSheet open={open} onOpenChange={onOpenChange} title="Filter Transactions">
      <div className="space-y-4">
        {/* Filter controls */}
        <div>
          <Label>Account</Label>
          <Select
            value={localFilters.accountId}
            onValueChange={(value) => setLocalFilters({ ...localFilters, accountId: value })}
          >
            {/* Account options */}
          </Select>
        </div>

        {/* More filters */}

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onResetFilters} className="flex-1">
            Reset
          </Button>
          <Button onClick={() => onApplyFilters(localFilters)} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </MobileSheet>
  )
}
```

**Desktop Pattern:**
- Keep filters in sidebar or top bar
- MobileFilterSheet only shows <768px
- Use `hidden md:block` and `md:hidden` to coordinate

**Recommendation:** Build MobileFilterSheet AFTER MobileSheet component is complete

## Component Audit

### Dashboard Components Mobile Readiness

**Not Analyzed in This Exploration** (out of scope for forms focus)

Defer to:
- Explorer 1: Architecture analysis (likely covered dashboard layout)
- Explorer 3: UX integration analysis (likely covered dashboard components)

### Chart Components Responsive Behavior

**SpendingByCategoryChart Analysis:**
- Current height: 350px (fixed)
- Mobile issue: Pie chart labels `label={({ name, percent }) => ...}` may collide on small screens
- Recommendation: Disable labels on mobile, rely on tooltip only

**General Chart Pattern (from plan):**
- Responsive height: 250px mobile, 350px desktop
- Touch-friendly tooltips
- Limit data on mobile (30 days vs 90 days)

**Status:** Charts planned for iteration 15 optimization (separate from forms)

### Form Inputs Minimum Height Compliance

**Input Component:** h-12 (48px) mobile ✅
**Button Component:** h-11 (44px) default ✅
**Textarea Component:** min-h-[80px] ⚠️ (no mobile adjustment, acceptable)

**Touch Target Compliance:**
- Input fields: **PASS** (48px > 44px WCAG AA)
- Buttons: **PASS** (44px = 44px WCAG AA)
- Small buttons: **BORDERLINE** (40px < 44px, acceptable for dense UI)
- Icon buttons: **PASS** (44x44px)

**Overall Status:** ✅ Compliant

### Category Picker Mobile Optimization Needs

**CategoryForm Color Swatches:**
- Current: `w-8 h-8` (32x32px) ❌ Below WCAG minimum
- Fix Required: `w-12 h-12 sm:w-8 sm:h-8` (48px mobile, 32px desktop)

**CategoryForm Icon Picker:**
- Uses Select component (already optimized for mobile)
- No issues detected

**CategoryBadge in Forms:**
- Used in category selection display
- Not interactive, no touch target concern

## Risks & Challenges

### Technical Risks

**1. visualViewport API Browser Support (MEDIUM)**
- **Risk:** Not supported in older browsers
- **Impact:** Keyboard handling won't work on old iOS/Android
- **Mitigation:**
  - Check `window.visualViewport` existence before use
  - Fallback to CSS scroll padding
  - Test on iOS 13+ (visualViewport added in iOS 13)
- **Likelihood:** 40%
- **Workaround:** CSS-only approach as backup

**2. iOS Safari Keyboard Quirks (MEDIUM)**
- **Risk:** iOS keyboard behavior differs from Android (viewport resize, scroll behavior)
- **Impact:** Submit buttons may still be covered on some iOS versions
- **Mitigation:**
  - Real device testing on multiple iOS versions
  - Use safe-area-inset-bottom for extra padding
  - Fixed positioning for submit button when keyboard open
- **Likelihood:** 60%
- **Workaround:** Increase bottom padding on forms (mb-20)

**3. Bottom Sheet Animation Performance (LOW)**
- **Risk:** Slide-up/slide-down animation may stutter on low-end Android
- **Impact:** Janky feel, poor UX
- **Mitigation:**
  - Use CSS transforms (not top/bottom position)
  - will-change: transform optimization
  - Reduce motion for prefers-reduced-motion
- **Likelihood:** 30%
- **Workaround:** Disable animations on low-end devices

**4. Form State Loss on Sheet Close (LOW)**
- **Risk:** User enters data, accidentally closes sheet, loses input
- **Impact:** Frustration, re-entering data
- **Mitigation:**
  - Add "unsaved changes" warning (Dialog onInteractOutside)
  - Consider auto-save draft to localStorage
- **Likelihood:** 50%
- **Workaround:** Confirmation dialog before close

### Complexity Risks

**1. inputMode Testing Coverage (MEDIUM)**
- **Risk:** inputMode not tested on all devices, edge cases missed
- **Impact:** Wrong keyboard shows on some devices
- **Mitigation:**
  - Test matrix: iOS 15+, iOS 16+, Android 11+, Android 12+
  - Test on real devices (not just emulators)
  - Document keyboard behavior per platform
- **Likelihood:** 50%
- **Recommendation:** Allocate 2 hours for mobile device testing

**2. Form Regression on Desktop (LOW)**
- **Risk:** Mobile optimizations break desktop layout
- **Impact:** Desktop users experience broken forms
- **Mitigation:**
  - Mobile-first approach (desktop already works)
  - Test desktop after each change
  - Use responsive utility classes (sm:, md:)
- **Likelihood:** 20%
- **Recommendation:** Desktop smoke test after each form update

## Recommendations for Planner

### 1. Phased Approach: Forms First, Then Advanced Features

**Rationale:** Forms are foundational, keyboard handling depends on them

**Phase 1 (Iteration 15, Part 1):**
- Add inputMode to all amount inputs (2-3 hours)
- Create MobileSheet component (3-4 hours)
- Migrate 3 high-priority forms to MobileSheet (4-5 hours)
- **Total:** 9-12 hours

**Phase 2 (Iteration 15, Part 2):**
- Add keyboard handling (useKeyboardVisible hook) (2-3 hours)
- Create MobileFilterSheet for transactions (2-3 hours)
- Fix category picker touch targets (1 hour)
- Mobile device testing (2-3 hours)
- **Total:** 7-10 hours

**Total Iteration 15 Forms Work:** 16-22 hours (within 16-18 hour budget)

### 2. Prioritize Transaction Forms Over Others

**Rationale:** Transaction entry is most frequent user action

**Priority Order:**
1. AddTransactionForm (new transaction creation)
2. TransactionForm (editing existing)
3. BudgetForm (monthly setup)
4. GoalForm (periodic use)
5. RecurringTransactionForm (rare)
6. CategoryForm (admin-like, rare)
7. AccountForm (setup only)

**Recommendation:** Focus iteration 15 on top 3, defer others to iteration 16 polish

### 3. Use CSS-First Approach for Keyboard Handling, Add visualViewport If Needed

**Rationale:** Simpler, more reliable, works in older browsers

**CSS-First Pattern:**
```typescript
<form className="space-y-4 pb-20">
  {/* Form fields */}
  <Button type="submit" className="w-full sticky bottom-4">
    Submit
  </Button>
</form>
```

**Benefits:**
- No JavaScript required
- Works in all browsers
- Simpler to test
- Less code to maintain

**When to Add visualViewport:**
- If CSS approach fails on iOS Safari
- If submit button still gets covered
- If user testing reveals issues

**Recommendation:** Start with CSS, iterate based on real device testing

### 4. MobileSheet Should NOT Replace Dialog, Extend It

**Rationale:** Desktop users need traditional modals, mobile users need sheets

**Architecture:**
```typescript
// MobileSheet internally uses Dialog, switches based on screen size
const isMobile = useMediaQuery('(max-width: 768px)')

if (isMobile) {
  return <BottomSheetContent />
} else {
  return <DialogContent />
}
```

**Benefits:**
- One component, two UIs
- Consistent API
- Easier migration
- No desktop regression

**Recommendation:** Build MobileSheet as responsive wrapper around Dialog

### 5. Create Shared Form Pattern Documentation

**Rationale:** 10 forms, consistent patterns reduce errors

**Documentation Location:** `src/lib/form-patterns.md`

**Contents:**
- inputMode usage guide
- Mobile form layout checklist
- Submit button positioning
- Keyboard handling examples
- Common validation patterns

**Recommendation:** Create documentation alongside MobileSheet component

### 6. Defer Auth Form Updates to Iteration 16

**Rationale:** Auth forms are out of scope for MVP mobile polish

**Current Scope:** Transaction, budget, goal forms (core financial actions)

**Auth Forms:** SignInForm, SignUpForm, ResetPasswordForm

**Issues:**
- Email inputs need `inputMode="email"` (low priority)
- Auth flows less frequent than financial actions
- Can be addressed in polish phase

**Recommendation:** Skip auth forms in iteration 15, add to iteration 16 backlog

### 7. Real Device Testing Is Non-Negotiable

**Rationale:** Emulators don't accurately simulate mobile keyboards

**Required Devices:**
- iPhone 14 Pro (iOS 16+) - Most common, Dynamic Island
- iPhone SE (iOS 15+) - Smallest screen, safe areas
- Android mid-range (Android 11+) - Performance test

**Testing Checklist:**
- [ ] Numeric keyboard shows for amount inputs
- [ ] Decimal point accessible on numeric keyboard
- [ ] Date picker shows native picker (iOS wheel, Android calendar)
- [ ] Submit button visible with keyboard open
- [ ] Form scrolls input into view when focused
- [ ] Bottom sheet slides up smoothly
- [ ] Safe areas respected (no content under notch/gesture bar)

**Recommendation:** Allocate 2-3 hours for real device testing, budget for iteration fixes

## Resource Map

### Critical Files/Directories

**UI Components (Existing):**
- `src/components/ui/input.tsx` - ✅ Ready (has inputMode prop)
- `src/components/ui/dialog.tsx` - ✅ Template for MobileSheet
- `src/components/ui/select.tsx` - ✅ Already mobile-optimized
- `src/components/ui/button.tsx` - ✅ Touch target compliant
- `src/components/ui/textarea.tsx` - ⚠️ No mobile-specific height

**Mobile Infrastructure (Existing):**
- `src/components/mobile/BottomNavigation.tsx` - ✅ Scroll-hide pattern
- `src/components/mobile/MoreSheet.tsx` - ✅ Bottom sheet template
- `src/hooks/useMediaQuery.ts` - ✅ Responsive hook
- `src/hooks/useScrollDirection.ts` - ✅ Scroll detection

**Form Components (Need Updates):**
- `src/components/transactions/AddTransactionForm.tsx` (265 lines)
- `src/components/transactions/TransactionForm.tsx` (244 lines)
- `src/components/budgets/BudgetForm.tsx` (176 lines)
- `src/components/goals/GoalForm.tsx` (223 lines)
- `src/components/recurring/RecurringTransactionForm.tsx` (273 lines)
- `src/components/categories/CategoryForm.tsx` (270 lines)
- `src/components/accounts/AccountForm.tsx` (198 lines)

**List Components (Need MobileSheet Integration):**
- `src/components/transactions/TransactionList.tsx` (204 lines)
- `src/components/budgets/BudgetList.tsx` (179 lines)
- `src/components/goals/GoalList.tsx` (156 lines)

**To Be Created:**
- `src/components/mobile/MobileSheet.tsx` (estimated 150-200 lines)
- `src/components/mobile/MobileFilterSheet.tsx` (estimated 100-150 lines)
- `src/hooks/useKeyboardVisible.ts` (estimated 30-40 lines)
- `src/lib/form-patterns.md` (documentation)

### Key Dependencies

**Already Installed:**
- `@radix-ui/react-dialog` (v1.0.5) - Dialog primitive
- `react-hook-form` (v7.48.2) - Form state management
- `zod` (v3.22.4) - Validation
- `framer-motion` (v10.16.5) - Animations
- `class-variance-authority` (v0.7.0) - Component variants
- `tailwindcss` (v3.4.0) - Styling

**No New Dependencies Required** ✅

### Testing Infrastructure

**Manual Testing:**
- Real device testing required (iPhone, Android)
- Keyboard behavior verification
- Safe area testing (iPhone notch)

**Automated Testing:**
- No Playwright tests exist for forms (out of scope)
- Recommendation: Manual testing sufficient for iteration 15

**Performance Testing:**
- Animation smoothness (60fps target)
- Sheet open/close performance
- Keyboard show/hide performance

**Tools:**
- Chrome DevTools Device Mode (initial testing)
- BrowserStack (optional, for device matrix)
- Real devices (required for final validation)

## Questions for Planner

### 1. Should We Convert All Forms to MobileSheet or Just High-Priority Ones?

**Context:** 7 forms total, but transaction/budget forms are used 10x more than category/account forms

**Options:**
- **Option A:** Convert all 7 forms (comprehensive, 8-10 hours)
- **Option B:** Convert top 3 (transaction, budget, goal), defer others (4-5 hours)
- **Option C:** Convert only transaction forms, defer all others (2-3 hours)

**Recommendation:** Option B (convert top 3, most user value)

### 2. How Aggressive Should We Be with Keyboard Handling?

**Context:** visualViewport API is powerful but has browser support and complexity trade-offs

**Options:**
- **Option A:** CSS-only (scroll padding, bottom margin, simple)
- **Option B:** CSS + visualViewport hook (handles edge cases, more complex)
- **Option C:** Full keyboard detection with position adjustment (most robust, most complex)

**Recommendation:** Option A, upgrade to Option B if issues found in device testing

### 3. Should MobileFilterSheet Be in Iteration 15 or 16?

**Context:** Transaction filters are important but not as critical as form optimization

**Options:**
- **Option A:** Build MobileFilterSheet in iteration 15 (comprehensive mobile experience)
- **Option B:** Defer to iteration 16 (focus iteration 15 on forms only)

**Recommendation:** Option B (iteration 16), focus 15 on forms

### 4. What's the Policy on Touch Target Compromises?

**Context:** Some elements (small buttons, color swatches) are 40px or less

**WCAG AA Standard:** 44x44px minimum

**Current Issues:**
- Button size="sm": 40px (4px under minimum)
- CategoryForm color swatches: 32px (12px under minimum)

**Options:**
- **Option A:** Strict compliance (all elements 44px+, may compromise density)
- **Option B:** Pragmatic (primary actions 44px+, secondary can be 40px+)
- **Option C:** Fix only obvious issues (color swatches), leave small buttons

**Recommendation:** Option B (pragmatic approach, fix color swatches)

### 5. Should We Document Mobile Form Patterns Now or Later?

**Context:** 10 forms, consistent patterns reduce future errors

**Options:**
- **Option A:** Create form-patterns.md now (proactive, adds 2 hours)
- **Option B:** Create during iteration 16 polish (after patterns solidify)
- **Option C:** Skip documentation (rely on code comments)

**Recommendation:** Option A (create now, saves time on future forms)

### 6. How Should We Handle Form State Persistence?

**Context:** User accidentally closes sheet, loses entered data

**Options:**
- **Option A:** Add "unsaved changes" warning dialog (simple, 1 hour)
- **Option B:** Auto-save draft to localStorage (complex, 3-4 hours)
- **Option C:** No persistence (simplest, but risk of data loss)

**Recommendation:** Option A (warning dialog, good UX/effort trade-off)

### 7. Should MobileSheet Have Drag-to-Close Gesture?

**Context:** Native mobile sheets support dragging down to close

**Options:**
- **Option A:** Add drag gesture (native feel, 2-3 hours implementation)
- **Option B:** Tap outside or X button only (simpler, 0 hours)

**Recommendation:** Option B for iteration 15 (defer drag gesture to iteration 16)

---

**Report Complete**

**Summary:** Forms are ready for mobile optimization. Input infrastructure exists but unused. Clear path forward: Add inputMode (2-3 hours), create MobileSheet (3-4 hours), migrate top 3 forms (4-5 hours), add keyboard handling (2-3 hours). Total: 11-15 hours, well within iteration 15 budget of 16-18 hours.

**Next Steps for Planner:**
1. Review recommendations and answer questions
2. Prioritize form conversion list
3. Decide on keyboard handling approach
4. Allocate mobile device testing time
5. Create builder tasks with file-level granularity
