# SOLUTION - React.Children.only Error

## Root Cause (Final)

The Button component was passing **TWO JSX expressions** to Radix Slot:

```tsx
// WRONG - 2 expressions even when loading=false
{!asChild && loading && <Loader2 />}  // Expression 1: evaluates to `false`
{children}                             // Expression 2: the actual child
```

Radix Slot uses `React.Children.only()` which throws when it receives more than one child, **even if one evaluates to false**.

## Solution

Conditionally render based on `asChild`:

```tsx
{asChild ? (
  children                    // Slot gets exactly 1 child
) : (
  <>
    {loading && <Loader2 />}  // Regular button can have Fragment
    {children}
  </>
)}
```

## Files Modified

1. **src/components/ui/button.tsx** (lines 50-57)
   - Split rendering logic: `asChild` branch vs normal button branch
   - Slot receives single child
   - Regular button gets Fragment (which is fine)

2. **src/components/dashboard/DashboardStats.tsx** (lines 42-57)
   - Wrapped icon+text in Fragments for Link children

3. **src/components/dashboard/RecentTransactionsCard.tsx** (lines 48-55)
   - Wrapped icon+text in Fragment for Link child

## Why This Works

- **When asChild=true:** Slot receives `children` (1 child) ✅
- **When asChild=false:** Regular button receives Fragment (unlimited children) ✅
- **No false/undefined in child array when asChild=true** ✅

## Verified

- TypeScript: 0 errors
- All Button asChild instances fixed
- Dashboard should now load without errors
