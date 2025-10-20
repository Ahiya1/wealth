# Healing Phase Checklist

## Overview
This document provides a detailed action plan for healers to resolve all blocking issues identified during validation.

---

## Healer 1: Dependencies & Security

### Task: Fix Missing Dependencies and Security Vulnerabilities

**Estimated Time:** 15 minutes

**Actions:**

1. Install missing Radix UI components:
```bash
npm install --legacy-peer-deps @radix-ui/react-progress @radix-ui/react-tabs
```

2. Update Next.js for critical security fix:
```bash
npm install --legacy-peer-deps next@14.2.33
```

3. Resolve React Query / tRPC compatibility:
```bash
# Upgrade to tRPC v11 (recommended)
npm install --legacy-peer-deps @trpc/client@11.0.0 @trpc/server@11.0.0 @trpc/react-query@11.0.0 @trpc/next@11.0.0

# OR downgrade React Query (not recommended)
# npm install --legacy-peer-deps @tanstack/react-query@4.36.1
```

4. Update other vulnerable packages:
```bash
npm install --legacy-peer-deps tsx@4.20.6
```

5. Run security audit:
```bash
npm audit
```

**Verification:**
```bash
npm install --legacy-peer-deps
# Should complete with no critical errors
```

---

## Healer 2: NextAuth v5 Integration

### Task: Fix NextAuth Import Pattern (8 files)

**Estimated Time:** 20 minutes

**Files to Update:**
- src/app/page.tsx
- src/app/(dashboard)/dashboard/page.tsx
- src/app/(dashboard)/accounts/page.tsx
- src/app/(dashboard)/accounts/[id]/page.tsx
- src/app/(dashboard)/transactions/page.tsx
- src/app/(dashboard)/transactions/[id]/page.tsx
- src/app/(dashboard)/goals/page.tsx
- src/app/(dashboard)/goals/[id]/page.tsx

**Step 1:** Update `src/lib/auth.ts` to export auth function:

Add at the end of the file:
```typescript
import NextAuth from 'next-auth'

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
```

**Step 2:** Update all 8 page files:

Replace:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
```

With:
```typescript
import { auth } from '@/lib/auth'

const session = await auth()
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "getServerSession"
# Should return 0 results
```

---

## Healer 3: React Query API Updates

### Task: Replace isLoading with isPending (68 occurrences)

**Estimated Time:** 10 minutes

**Files to Update:**
- src/components/accounts/AccountForm.tsx (2 occurrences)
- src/components/accounts/PlaidLinkButton.tsx (2 occurrences)
- src/components/auth/ResetPasswordForm.tsx (2 occurrences)
- src/components/auth/SignUpForm.tsx (2 occurrences)
- src/components/budgets/BudgetForm.tsx (2 occurrences)
- src/components/categories/CategoryForm.tsx (4 occurrences)
- src/components/categories/CategoryList.tsx (1 occurrence)
- All other components using mutations

**Action:**

Global find and replace in mutation contexts only:

```bash
# Find all occurrences
grep -r "\.isLoading" src/components --include="*.tsx" --include="*.ts"

# For each file, manually replace mutation.isLoading with mutation.isPending
# DO NOT replace query.isLoading (queries keep isLoading in RQ v5)
```

**Important:** Only replace for mutations, NOT queries:
- `createAccount.isLoading` → `createAccount.isPending` ✓
- `accountsQuery.isLoading` → KEEP AS IS ✓

**Verification:**
```bash
# Check mutations no longer use isLoading
grep -r "useMutation" src/components -A 5 | grep "isLoading"
# Should return 0 results
```

---

## Healer 4: UI Component Type Fixes

### Task: Fix Button Variants and Component Exports

**Estimated Time:** 15 minutes

**Step 1:** Update Button component variant types

File: `src/components/ui/button.tsx`

Find the buttonVariants definition and ensure it includes ghost and link:
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ... size variants
    },
  }
)
```

**Step 2:** Add CardDescription export

File: `src/components/ui/card.tsx`

Ensure CardDescription is exported:
```typescript
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

**Step 3:** Fix CategoryBadge props

File: `src/components/categories/CategoryBadge.tsx`

Update props interface to accept name, icon, color:
```typescript
interface CategoryBadgeProps {
  name: string
  icon?: string | null
  color?: string | null
  className?: string
}
```

**Step 4:** Fix MonthSelector Button size prop

File: `src/components/budgets/MonthSelector.tsx`

Change Button size prop type to match Button component:
```typescript
<Button variant="outline" size="default" onClick={goToPreviousMonth}>
  {/* content */}
</Button>
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep -E "ghost|link|CardDescription|CategoryBadge"
# Should return 0 results
```

---

## Healer 5: Prisma Type Fixes

### Task: Fix Goal Type Imports and Prisma Usage

**Estimated Time:** 15 minutes

**Step 1:** Fix Goal type imports

Files: 
- src/components/goals/GoalCard.tsx
- src/components/goals/CompletedGoalCelebration.tsx

Check if Goal is exported from Prisma client:
```bash
grep "export.*Goal" node_modules/.prisma/client/index.d.ts
```

If Goal is exported, use:
```typescript
import { Goal } from '@prisma/client'
```

If not, define type locally:
```typescript
import { Prisma } from '@prisma/client'

type Goal = Prisma.GoalGetPayload<{
  include: { linkedAccount: true }
}>
```

**Step 2:** Fix prisma.goal usage

File: `src/app/(dashboard)/goals/[id]/page.tsx`

Ensure correct Prisma client usage (lowercase):
```typescript
const goal = await prisma.goal.findUnique({
  where: { id: params.id },
  include: { linkedAccount: true }
})
```

**Step 3:** Fix Decimal type handling in analytics

File: `src/app/(dashboard)/analytics/page.tsx`

Convert Decimal to number for calculations:
```typescript
const transactions = await prisma.transaction.findMany(...)

// Convert Decimal to number for charts
const data = transactions.map(t => ({
  ...t,
  amount: Number(t.amount)
}))
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep -E "Goal|prisma\.goal|Decimal"
# Should return 0 results
```

---

## Healer 6: Code Quality & Polish

### Task: Remove Console Logs and Fix Unused Variables

**Estimated Time:** 10 minutes

**Step 1:** Remove console.log statements

```bash
# Find all console.log
grep -r "console.log" src --include="*.ts" --include="*.tsx"

# Remove or replace with proper logging
```

**Step 2:** Fix unused variables

File: `src/components/budgets/BudgetForm.tsx`
```typescript
// Remove or use selectedCategoryId
const [selectedCategoryId, setSelectedCategoryId] = useState<string>()
```

File: `src/app/api/trpc/[trpc]/route.ts`
```typescript
// Remove unused path parameter or use it
const handler = (req: Request) => {
  // If path is not needed, remove from function signature
}
```

**Step 3:** Update .env.example

Add missing environment variables:
```bash
# Add to .env.example
ANTHROPIC_API_KEY="your-anthropic-api-key"
RESEND_API_KEY="your-resend-api-key"
```

**Verification:**
```bash
grep -r "console.log" src --include="*.ts" --include="*.tsx"
# Should return 0 results

npx tsc --noEmit 2>&1 | grep "is declared but"
# Should return 0 results
```

---

## Final Integration Checklist

After all healers complete their work:

### 1. TypeScript Compilation
```bash
npx tsc --noEmit
```
**Expected:** 0 errors

### 2. Build Test
```bash
npm run build
```
**Expected:** Build succeeds, bundle created

### 3. Development Server
```bash
npm run dev
```
**Expected:** Server starts on http://localhost:3000

### 4. Run Tests
```bash
npm test
```
**Expected:** All tests pass

### 5. Manual Smoke Test
- [ ] Navigate to http://localhost:3000
- [ ] Sign up page loads
- [ ] Can create account
- [ ] Can sign in
- [ ] Dashboard displays
- [ ] Can access all major pages (accounts, transactions, budgets, goals, analytics)

---

## Success Criteria

Healing is complete when:
- [ ] 0 TypeScript errors
- [ ] Build succeeds
- [ ] Dev server starts without errors
- [ ] All tests pass
- [ ] Manual smoke test passes
- [ ] No console.log statements in src/
- [ ] No unused variables warnings
- [ ] All security vulnerabilities addressed

---

## If Issues Persist

If TypeScript errors remain after following this checklist:

1. Clear Next.js cache:
```bash
rm -rf .next
npx prisma generate
npm run build
```

2. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

3. Check for conflicting type definitions:
```bash
find node_modules/@types -name "*.d.ts" | xargs grep "getServerSession"
```

4. Review integration report for additional context:
```bash
cat .2L/iteration-1/integration/integration-report.md
```

---

## Notes for Healers

- Work on your assigned section independently
- Test your changes incrementally (don't wait until the end)
- If you encounter blockers, document them and move on
- Coordinate with other healers if dependencies exist
- Update this checklist if you find better solutions
- All changes should maintain existing functionality
- Prioritize correctness over speed

---

**Total Estimated Time:** 85-105 minutes

**Recommended Parallel Work:**
- Healer 1 + Healer 2 (can work in parallel)
- Healer 3 + Healer 4 (can work in parallel)
- Healer 5 + Healer 6 (can work in parallel)

**Sequential Dependencies:**
- Healer 1 must complete before build tests
- All healers must complete before final integration checklist
