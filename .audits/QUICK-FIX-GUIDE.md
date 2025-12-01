# Dark Mode Quick Fix Guide

## Files Needing Fixes (7 total)

### P1: High Priority (6 files - 52 minutes)

1. **src/app/page.tsx** - Landing page (15 min)
   - Line 21: Add dark gradient
   - Line 61: Add dark background
   - Lines 26-30: Add dark text colors
   - Lines 74,89,104,119: Add dark borders
   - Lines 76,91,106,121: Add dark icon backgrounds
   - Line 137: Add dark background
   - Line 165: Add dark button colors

2. **src/app/(auth)/layout.tsx** - Auth layout (2 min)
   - Line 7: Add `dark:bg-warm-gray-900`

3. **src/components/onboarding/OnboardingStep2Features.tsx** (5 min)
   - Line 50: Add dark border and background
   - Lines 37,40,53,56: Add dark text colors

4. **src/components/onboarding/OnboardingStep3Start.tsx** (5 min)
   - Line 46: Add dark border and background
   - Lines 32,36,51,54,57: Add dark text colors

5. **src/app/(dashboard)/settings/page.tsx** (10 min)
   - Line 65: Add dark border and background
   - Line 67: Add dark icon background

6. **src/app/(dashboard)/account/page.tsx** (15 min)
   - Line 60: Add dark avatar background
   - Line 88: Add dark card border and background
   - Line 90: Add dark icon background

### P2: Medium Priority (1 file - 5 minutes)

7. **src/components/recurring/RecurringTransactionList.tsx** (5 min)
   - Lines 68-72: Add dark badge colors
   - Line 105: Add dark amount colors
   - Line 182: Add dark delete button color

## Pattern Reference

### Backgrounds
```tsx
bg-white → bg-white dark:bg-warm-gray-900
bg-warm-gray-50 → bg-warm-gray-50 dark:bg-warm-gray-800
bg-sage-50 → bg-sage-50 dark:bg-sage-900/30
```

### Text
```tsx
text-warm-gray-900 → text-warm-gray-900 dark:text-warm-gray-100
text-warm-gray-600 → text-warm-gray-600 dark:text-warm-gray-400
text-sage-700 → text-sage-700 dark:text-sage-300
```

### Borders
```tsx
border-warm-gray-200 → border-warm-gray-200 dark:border-warm-gray-700
border-sage-200 → border-sage-200 dark:border-warm-gray-700
```

### Hover States
```tsx
hover:bg-sage-50 → hover:bg-sage-50 dark:hover:bg-sage-900/30
hover:border-sage-300 → hover:border-sage-300 dark:hover:border-sage-600
```

## Testing Checklist

- [ ] Landing page in dark mode (no white backgrounds)
- [ ] Auth pages in dark mode (proper dark background)
- [ ] Settings page in dark mode (cards adapt)
- [ ] Account page in dark mode (avatar and cards adapt)
- [ ] Onboarding wizard in dark mode (all steps)
- [ ] Recurring transactions in dark mode (badges visible)
- [ ] Toggle between light/dark modes (smooth transition)
- [ ] System theme preference (follows OS)

## Total Time: 57 minutes
