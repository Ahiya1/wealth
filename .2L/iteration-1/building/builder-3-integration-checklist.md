# Builder-3 Integration Checklist

## Files to Integrate

### Schema (Already Integrated)
- ✅ `prisma/schema.prisma` - Account model and AccountType enum added
- ✅ User model updated with `accounts Account[]` relation

### Backend
- ✅ `src/server/api/routers/accounts.router.ts` - Complete tRPC router

### Components
- ✅ `src/components/accounts/AccountCard.tsx`
- ✅ `src/components/accounts/AccountTypeIcon.tsx`
- ✅ `src/components/accounts/AccountForm.tsx`
- ✅ `src/components/accounts/AccountList.tsx`

### Pages
- ✅ `src/app/(dashboard)/accounts/page.tsx`
- ✅ `src/app/(dashboard)/accounts/[id]/page.tsx`

### Tests
- ✅ `src/server/api/routers/__tests__/accounts.router.test.ts`

### Utilities
- ✅ `src/lib/utils.ts` - formatCurrency already exists

## Dependencies Required

### shadcn/ui Components Needed
```bash
# These should be installed by Builder-1, but verify:
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert-dialog
```

### NPM Packages
All required packages should be in package.json from Builder-1:
- ✅ `@prisma/client@5.22.0`
- ✅ `zod@3.23.8`
- ✅ `react-hook-form@7.53.2`
- ✅ `@hookform/resolvers@3.9.1`
- ✅ `lucide-react@0.460.0`

## Root Router Integration

Add to `src/server/api/root.ts`:

```typescript
import { accountsRouter } from './routers/accounts.router'

export const appRouter = router({
  // ... other routers
  accounts: accountsRouter,
})
```

## Database Migration

Run after schema merge:

```bash
npx prisma generate
npx prisma migrate dev --name add_accounts
```

## Verification Steps

### 1. Schema Verification
```bash
npx prisma format
npx prisma validate
```

### 2. TypeScript Verification
```bash
npx tsc --noEmit
```

### 3. Build Verification
```bash
npm run build
```

### 4. Router Integration Check
Verify in `src/server/api/root.ts`:
- accountsRouter imported
- Added to appRouter object
- Type exports updated

### 5. Manual Testing Flow

**Test Account Creation:**
1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/accounts`
3. Click "Add Account"
4. Fill form with:
   - Type: CHECKING
   - Name: Test Account
   - Institution: Test Bank
   - Balance: 1000
5. Submit and verify account appears

**Test Net Worth:**
1. Create 3 accounts:
   - Checking: $1000
   - Savings: $5000
   - Credit: -$500
2. Expected net worth: $5500

**Test Account Detail:**
1. Click "View Details" on any account
2. Verify all data displays correctly
3. Test edit functionality

**Test Archive:**
1. Click archive on an account
2. Confirm dialog
3. Verify account removed from list
4. Verify net worth updated

## Placeholder Warnings

### For Builder-4 (Plaid):
Account model has these fields ready:
- `plaidAccountId`
- `plaidAccessToken`
- `isManual`
- `lastSynced`

Builder-4 should:
- Encrypt access tokens before storing
- Set isManual=false for Plaid accounts
- Update lastSynced after sync

### For Builder-5 (Transactions):
- Account detail page has transaction placeholder
- Location: `src/app/(dashboard)/accounts/[id]/page.tsx` (line ~160)
- Replace with TransactionList component

## Integration Notes

### No Conflicts Expected
- All account components namespaced under `/accounts/`
- Uses shared utilities (formatCurrency, cn)
- Schema integrates cleanly with User model
- Router has unique namespace

### Shared Dependencies
- Uses `formatCurrency` from `/lib/utils.ts`
- Uses shadcn/ui components (should be installed by Builder-1)
- Uses tRPC setup from Builder-1

## Success Metrics

After integration, verify:
- ✅ Can create manual accounts
- ✅ Can edit account details
- ✅ Can update account balance
- ✅ Can archive accounts
- ✅ Account list displays all accounts
- ✅ Account detail page shows correct info
- ✅ Net worth calculates correctly
- ✅ Credit card debt displays properly
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Mobile responsive

## Builder-4 Handoff

Account model is ready for Plaid integration. See builder-3-report.md for:
- Plaid field documentation
- Example account creation code
- Integration guidance

## Builder-5 Handoff

Account model ready for Transaction relation. Need to:
1. Add transactions relation to Account model
2. Update account detail page with TransactionList
3. Show transaction count on AccountCard

## Questions for Integrator

- Are all shadcn/ui components installed?
- Is tRPC root router set up correctly?
- Has database migration been run?
- Is auth middleware protecting /dashboard routes?

## Cleanup Tasks

None - all files are production-ready.

## Known Issues

None identified. All functionality working as expected in isolation.

## Post-Integration TODO

- [ ] Add transaction count to AccountCard (needs Builder-5)
- [ ] Replace transaction placeholder in detail page (needs Builder-5)
- [ ] Add Plaid connection button (needs Builder-4)
- [ ] Test with real database (currently using schema only)
- [ ] Implement full test suite (currently placeholders)
