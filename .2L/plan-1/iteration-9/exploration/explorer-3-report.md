# Explorer 3 Report: Currency Selector UI & User Experience

## Executive Summary
Analysis of UI/UX requirements for currency conversion reveals need for robust, user-friendly interface that handles long-running operations (30+ seconds), provides clear warnings, and updates all currency displays system-wide. The app already has excellent shadcn/ui component foundation and established patterns for forms, dialogs, and loading states. Key challenge is managing user expectations during conversion process and ensuring comprehensive currency symbol updates across 20+ components.

## Discoveries

### Existing Currency Infrastructure
- User model has `currency` field (String, default "USD")
- Account model also has `currency` field (allows multi-currency accounts)
- `formatCurrency()` utility exists in `/src/lib/utils.ts` using Intl.NumberFormat
- Currency placeholder page exists at `/settings/currency` (ready for enhancement)
- Settings navigation structure already in place from Iteration 8

### Current Currency Display Locations
**20+ Components Using Currency Formatting:**
- Dashboard: DashboardStats, RecentTransactionsCard, NetWorthCard, TopCategoriesCard, IncomeVsExpensesCard
- Accounts: AccountCard, AccountForm, Account detail pages
- Transactions: TransactionCard, TransactionDetail, Recent transactions
- Budgets: BudgetCard, BudgetForm, Budget month pages
- Goals: GoalCard, GoalProgressChart, GoalDetailPageClient
- Analytics: All chart components (NetWorthChart, SpendingTrendsChart, etc.)
- Admin: SystemMetrics, UserListTable

### UI Component Inventory (shadcn/ui)
**Available Components:**
- Select (Radix UI with scroll buttons, search-friendly)
- AlertDialog (confirmation dialogs with header/footer)
- Progress (horizontal progress bar)
- Dialog (modals for complex flows)
- Toast (success/error notifications)
- Skeleton (loading placeholders)
- Badge (status indicators)
- Button (with loading states via Loader2 icon)
- Card (consistent container pattern)

### Form Patterns in Use
**Established Pattern (from BudgetForm):**
```tsx
- react-hook-form + zod validation
- trpc mutations with optimistic updates
- Toast notifications for success/error
- Loader2 icon for pending states
- Disabled inputs during submission
```

## Patterns Identified

### Pattern 1: Long-Running Operation UI
**Description:** Handle operations that take 10-30+ seconds with persistent feedback
**Use Case:** Currency conversion with 100-1000+ transactions
**Example:** Multi-stage progress indicator with cancellation prevention
**Recommendation:** YES - Critical for user experience

**Implementation Pattern:**
```tsx
- Progress bar showing percentage (0-100%)
- Status text updating by stage:
  * "Fetching exchange rates..." (0-20%)
  * "Converting transactions..." (20-60%)
  * "Updating accounts..." (60-80%)
  * "Updating budgets and goals..." (80-95%)
  * "Finalizing..." (95-100%)
- Prevent navigation during conversion
- Disable all interactive elements
- Show estimated time remaining
```

### Pattern 2: Destructive Action Confirmation
**Description:** Multi-step confirmation for irreversible actions
**Use Case:** Currency change affects all financial data
**Example:** Warning dialog → explicit confirmation → conversion → summary
**Recommendation:** YES - Prevents accidental data changes

**Implementation Pattern:**
```tsx
1. Initial dialog with clear warning
   - Show current currency
   - Show target currency
   - List what will be converted
   - Warning: "This action cannot be undone"
   - Checkbox: "I understand this will convert all my financial data"

2. Confirmation button (disabled until checkbox)

3. Progress modal (non-dismissible during conversion)

4. Success summary modal
   - Show conversion results
   - Transaction count converted
   - Exchange rate used
   - Before/after totals
```

### Pattern 3: Currency Symbol Display
**Description:** Consistent currency formatting across all components
**Use Case:** All monetary values throughout app
**Example:** Enhanced formatCurrency utility with user context
**Recommendation:** YES - Essential for consistency

**Current Implementation:**
```tsx
// src/lib/utils.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}
```

**Recommended Enhancement:**
```tsx
// Add React Context for user currency
export function useCurrency() {
  const { data: user } = trpc.users.me.useQuery()
  return user?.currency || 'USD'
}

// Update formatCurrency to accept optional override
export function formatCurrency(
  amount: number, 
  currency?: string // Override user currency if needed
): string {
  // Will be enhanced to use user context
}
```

## Complexity Assessment

### High Complexity Areas
- **Currency Conversion Flow (Builder split: 2-3 sub-builders)**
  - Sub-builder 1: UI Components (selector, dialogs, progress)
  - Sub-builder 2: Backend Service (tRPC router, conversion logic)
  - Sub-builder 3: System-wide Updates (component currency refresh)
  - Reason: Touches backend, frontend, and 20+ components

### Medium Complexity Areas
- **Progress Indicator During Conversion**
  - WebSocket or polling for real-time progress
  - Stage-by-stage updates
  - Handle edge cases (API timeout, mid-conversion errors)
  
- **Currency Display Updates**
  - Need to invalidate all queries after conversion
  - React Context for user currency preference
  - Update 20+ components to use context

### Low Complexity Areas
- **Currency Selector Component**
  - Standard Select component with predefined list
  - Simple state management
  
- **Confirmation Dialog**
  - Standard AlertDialog with checkbox validation
  - Clear, straightforward implementation

## Technology Recommendations

### Primary Stack (Already in Place)
- **UI Framework:** shadcn/ui (Radix UI primitives) - PERFECT for this use case
- **Forms:** react-hook-form + zod - Standard pattern
- **Backend:** tRPC - Type-safe mutations
- **State:** React Query (via tRPC) - Cache invalidation built-in
- **Notifications:** Toast (shadcn/ui) - Consistent with app

### Supporting Libraries
- **Loader Icons:** lucide-react (already installed)
  - Loader2 for spinning indicators
  - ArrowLeftRight for currency swap icon
  - AlertTriangle for warnings
  - CheckCircle for success

### Currency Data
**Supported Currencies (Recommend 20 major currencies for MVP):**
```typescript
const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  // ... 10 more
]
```

## Integration Points

### External APIs
- **Exchange Rate API**: Already planned in master-plan.yaml
  - Provider: exchangerate-api.com
  - Free tier: 1500 requests/month
  - Caching: 24-hour TTL in ExchangeRate model
  - Fallback: Manual rate entry if API down

### Internal Integrations
- **Settings Page ↔ Currency Service**
  - User selects new currency
  - Service validates and converts
  - Settings page receives success/error
  
- **Currency Service ↔ All Display Components**
  - Service updates user.currency
  - React Query invalidation triggers refresh
  - All components re-fetch with new currency
  
- **Progress Updates ↔ UI**
  - Backend emits progress events
  - Frontend polls or subscribes to updates
  - UI reflects real-time conversion status

## UI Component Design

### Component 1: Currency Selector Card
**Location:** `/settings/currency/page.tsx`

**Design:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Currency Settings</CardTitle>
    <CardDescription>
      Change your display currency. All amounts will be converted.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Current Currency Display */}
    <div className="rounded-lg bg-sage-50 p-4 mb-4">
      <p className="text-sm text-warm-gray-600">Current Currency</p>
      <p className="text-2xl font-semibold text-warm-gray-900">
        {currentCurrency.name} ({currentCurrency.symbol})
      </p>
      <Badge variant="outline" className="mt-2">
        {currentCurrency.code}
      </Badge>
    </div>

    {/* Currency Selector */}
    <div className="space-y-4">
      <Label>Select New Currency</Label>
      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose currency..." />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">{currency.symbol}</span>
                <span>{currency.name}</span>
                <span className="text-warm-gray-500">({currency.code})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Preview Rate */}
    {selectedCurrency && selectedCurrency !== currentCurrency.code && (
      <div className="mt-4 p-3 rounded-lg bg-warm-gray-50 border border-warm-gray-200">
        <p className="text-sm text-warm-gray-600 mb-1">Exchange Rate Preview</p>
        <p className="text-lg font-semibold">
          1 {currentCurrency.code} = {exchangeRate} {selectedCurrency}
        </p>
        <p className="text-xs text-warm-gray-500 mt-1">
          Rate as of {rateDate}
        </p>
      </div>
    )}

    {/* Change Button */}
    <Button
      onClick={handleChangeCurrency}
      disabled={!selectedCurrency || selectedCurrency === currentCurrency.code}
      className="w-full mt-6"
    >
      <ArrowLeftRight className="mr-2 h-4 w-4" />
      Change Currency
    </Button>
  </CardContent>
</Card>
```

### Component 2: Confirmation Dialog
**Trigger:** "Change Currency" button click

**Design:**
```tsx
<AlertDialog>
  <AlertDialogContent className="max-w-md">
    <AlertDialogHeader>
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-full bg-amber-100 p-3">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <AlertDialogTitle className="text-xl">
          Confirm Currency Change
        </AlertDialogTitle>
      </div>
      <AlertDialogDescription className="text-base space-y-3 pt-2">
        <p>
          You are about to convert all your financial data from{' '}
          <strong>{currentCurrency.name}</strong> to{' '}
          <strong>{targetCurrency.name}</strong>.
        </p>
        
        <div className="rounded-lg bg-warm-gray-50 p-3 space-y-2 text-sm">
          <p className="font-semibold text-warm-gray-900">This will convert:</p>
          <ul className="space-y-1 text-warm-gray-700">
            <li>• {transactionCount} transactions</li>
            <li>• {accountCount} accounts</li>
            <li>• {budgetCount} budgets</li>
            <li>• {goalCount} goals</li>
          </ul>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-900">
            <strong>⚠️ Important:</strong> This conversion uses historical exchange
            rates for each transaction date. The process may take up to 30 seconds
            and cannot be interrupted once started.
          </p>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={setConfirmed}
          />
          <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer">
            I understand this will permanently convert all my financial data
            to {targetCurrency.name}
          </Label>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        disabled={!confirmed}
        className="bg-sage-600 hover:bg-sage-700"
      >
        Continue with Conversion
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Component 3: Conversion Progress Dialog
**Trigger:** After confirmation
**Design:** Non-dismissible modal with live progress

```tsx
<Dialog open={converting} onOpenChange={() => {}}>
  <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
    <DialogHeader>
      <DialogTitle className="text-center">Converting Currency...</DialogTitle>
      <DialogDescription className="text-center">
        Please do not close this window. This may take up to 30 seconds.
      </DialogDescription>
    </DialogHeader>

    {/* Progress Circle/Bar */}
    <div className="py-6 space-y-4">
      {/* Visual Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-warm-gray-600">
          <span>{currentStage}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Conversion Stages Checklist */}
      <div className="space-y-2 text-sm">
        <StageItem 
          completed={progress > 20} 
          active={progress <= 20}
          text="Fetching exchange rates"
        />
        <StageItem 
          completed={progress > 60} 
          active={progress > 20 && progress <= 60}
          text="Converting transactions"
        />
        <StageItem 
          completed={progress > 80} 
          active={progress > 60 && progress <= 80}
          text="Updating accounts"
        />
        <StageItem 
          completed={progress > 95} 
          active={progress > 80 && progress <= 95}
          text="Updating budgets and goals"
        />
      </div>

      {/* Spinner */}
      <div className="flex justify-center pt-2">
        <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
      </div>

      {/* Transaction Counter (optional) */}
      {conversionStats && (
        <p className="text-center text-xs text-warm-gray-500">
          {conversionStats.converted} of {conversionStats.total} transactions converted
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>

// Stage Item Component
function StageItem({ completed, active, text }: StageItemProps) {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <CheckCircle className="h-4 w-4 text-sage-600" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-sage-600" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-warm-gray-300" />
      )}
      <span className={cn(
        completed && "text-sage-700 font-medium",
        active && "text-warm-gray-900",
        !active && !completed && "text-warm-gray-400"
      )}>
        {text}
      </span>
    </div>
  )
}
```

### Component 4: Success Summary Dialog
**Trigger:** Conversion completion
**Design:** Celebratory confirmation with details

```tsx
<Dialog open={showSuccess} onOpenChange={setShowSuccess}>
  <DialogContent className="max-w-md">
    <DialogHeader className="text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-sage-100 p-4">
          <CheckCircle className="h-12 w-12 text-sage-600" />
        </div>
      </div>
      <DialogTitle className="text-2xl font-serif">
        Currency Converted Successfully!
      </DialogTitle>
      <DialogDescription>
        All your financial data is now in {newCurrency.name}
      </DialogDescription>
    </DialogHeader>

    {/* Conversion Summary */}
    <div className="space-y-4 py-4">
      {/* Summary Stats */}
      <div className="rounded-lg bg-warm-gray-50 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-warm-gray-600">Transactions converted</span>
          <span className="font-semibold">{summary.transactionCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-gray-600">Accounts updated</span>
          <span className="font-semibold">{summary.accountCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-gray-600">Budgets updated</span>
          <span className="font-semibold">{summary.budgetCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-warm-gray-600">Goals updated</span>
          <span className="font-semibold">{summary.goalCount}</span>
        </div>
      </div>

      {/* Exchange Rate Used */}
      <div className="rounded-lg bg-sage-50 border border-sage-200 p-4">
        <p className="text-sm text-warm-gray-600 mb-1">Exchange Rate</p>
        <p className="text-lg font-semibold text-sage-700">
          1 {oldCurrency.code} = {summary.exchangeRate} {newCurrency.code}
        </p>
        <p className="text-xs text-warm-gray-500 mt-1">
          As of {format(summary.rateDate, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Example Conversion */}
      <div className="text-center text-sm text-warm-gray-600">
        Your net worth of{' '}
        <span className="font-semibold text-warm-gray-900">
          {formatCurrency(summary.oldNetWorth, oldCurrency.code)}
        </span>
        {' '}is now{' '}
        <span className="font-semibold text-sage-700">
          {formatCurrency(summary.newNetWorth, newCurrency.code)}
        </span>
      </div>
    </div>

    <DialogFooter>
      <Button onClick={() => setShowSuccess(false)} className="w-full">
        Done
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Currency Selection                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. User navigates to /settings/currency                         │
│ 2. Page displays current currency (USD) with badge              │
│ 3. User opens currency dropdown                                 │
│ 4. User selects EUR from 20 currency options                    │
│ 5. Preview card shows: 1 USD = 0.92 EUR (live rate)            │
│ 6. "Change Currency" button becomes enabled                     │
│ 7. User clicks "Change Currency"                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Warning & Confirmation                                 │
├─────────────────────────────────────────────────────────────────┤
│ 8. AlertDialog opens with warning icon                          │
│ 9. Shows impact: "Will convert 1,234 transactions, 5 accounts"  │
│ 10. Warning box: "Cannot be undone, takes 30 seconds"           │
│ 11. Checkbox: "I understand this is permanent"                  │
│ 12. User reads warning, checks checkbox                         │
│ 13. "Continue with Conversion" button enables                   │
│ 14. User clicks "Continue"                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Conversion Process (20-30 seconds)                     │
├─────────────────────────────────────────────────────────────────┤
│ 15. Non-dismissible progress dialog appears                     │
│ 16. Stage 1 (0-20%): "Fetching exchange rates..." ✓            │
│     - Fetch current rate for today                              │
│     - Fetch historical rates for transaction dates              │
│     - Cache rates in ExchangeRate table                         │
│ 17. Stage 2 (20-60%): "Converting transactions..." [spinner]   │
│     - Process 1,234 transactions in batches                     │
│     - Apply historical rates to each transaction                │
│     - Update amounts in single database transaction             │
│ 18. Stage 3 (60-80%): "Updating accounts..." [spinner]         │
│     - Recalculate account balances                              │
│     - Update account currency field                             │
│ 19. Stage 4 (80-95%): "Updating budgets and goals..." [spinner]│
│     - Convert budget amounts                                    │
│     - Convert goal amounts (target & current)                   │
│ 20. Progress bar reaches 100%                                   │
│ 21. Backend emits success event                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Success Confirmation                                   │
├─────────────────────────────────────────────────────────────────┤
│ 22. Progress dialog closes                                      │
│ 23. Success dialog opens with checkmark icon                    │
│ 24. Shows summary:                                              │
│     - "1,234 transactions converted"                            │
│     - "5 accounts updated"                                      │
│     - "12 budgets updated"                                      │
│     - "3 goals updated"                                         │
│ 25. Shows exchange rate: "1 USD = 0.92 EUR"                    │
│ 26. Shows example: "$10,000 net worth → €9,200"                │
│ 27. User clicks "Done"                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: System-Wide Updates                                    │
├─────────────────────────────────────────────────────────────────┤
│ 28. React Query cache invalidated                               │
│ 29. All queries refetch with new currency                       │
│ 30. Dashboard updates: "$10,000" → "€9,200"                    │
│ 31. Account cards update: "$5,000" → "€4,600"                  │
│ 32. Transaction list updates: "$-50" → "€-46"                  │
│ 33. Budget cards update: "$500" → "€460"                       │
│ 34. Goal cards update: "$10,000" → "€9,200"                    │
│ 35. Settings page shows new current currency: EUR               │
│ 36. Toast notification: "Currency changed to Euro"             │
└─────────────────────────────────────────────────────────────────┘
```

## Currency Display Locations & Update Requirements

### Dashboard Components (5 components)
1. **DashboardStats** - `/components/dashboard/DashboardStats.tsx`
   - Update: Net worth, monthly income, monthly expenses, savings amount
   - Pattern: Uses `formatCurrency()` - auto-updates after query refetch
   
2. **RecentTransactionsCard** - `/components/dashboard/RecentTransactionsCard.tsx`
   - Update: Transaction amounts in list
   - Pattern: Uses `formatCurrency()` - auto-updates
   
3. **NetWorthCard** - `/components/dashboard/NetWorthCard.tsx`
   - Update: Net worth value
   - Pattern: Uses `formatCurrency()` - auto-updates
   
4. **TopCategoriesCard** - `/components/dashboard/TopCategoriesCard.tsx`
   - Update: Category spending amounts
   - Pattern: Uses `formatCurrency()` - auto-updates
   
5. **IncomeVsExpensesCard** - `/components/dashboard/IncomeVsExpensesCard.tsx`
   - Update: Income and expense amounts
   - Pattern: Uses `formatCurrency()` - auto-updates

### Account Components (3 components)
6. **AccountCard** - `/components/accounts/AccountCard.tsx`
   - Update: Account balance display
   - Pattern: Currently passes `account.currency` to `formatCurrency()`
   - **REQUIRES CHANGE:** Should use user's currency instead
   
7. **AccountForm** - `/components/accounts/AccountForm.tsx`
   - Update: Balance input placeholder/label
   - Pattern: Form field, may need currency symbol hint
   
8. **Account Detail Pages** - `/app/(dashboard)/accounts/[id]/page.tsx`
   - Update: All balance displays, transaction amounts
   - Pattern: Uses `formatCurrency()` - auto-updates

### Transaction Components (3 components)
9. **TransactionCard** - `/components/transactions/TransactionCard.tsx`
   - Update: Transaction amount
   - Pattern: Uses `formatCurrency()` - auto-updates
   
10. **TransactionDetail** - `/components/transactions/TransactionDetail.tsx`
    - Update: Transaction amount
    - Pattern: Uses `formatCurrency()` - auto-updates
    
11. **Transaction Detail Pages** - `/app/(dashboard)/transactions/[id]/page.tsx`
    - Update: Transaction amount
    - Pattern: Uses `formatCurrency()` - auto-updates

### Budget Components (2 components)
12. **BudgetCard** - `/components/budgets/BudgetCard.tsx`
    - Update: Budgeted, spent, remaining amounts
    - Pattern: Uses `formatCurrency()` - auto-updates
    
13. **BudgetForm** - `/components/budgets/BudgetForm.tsx`
    - Update: Amount input placeholder/label
    - Pattern: Form field, may need currency hint

### Goal Components (3 components)
14. **GoalCard** - `/components/goals/GoalCard.tsx`
    - Update: Current amount, target amount, remaining amount
    - Pattern: Uses `formatCurrency()` - auto-updates
    
15. **GoalForm** - `/components/goals/GoalForm.tsx` (if exists)
    - Update: Amount input placeholders
    - Pattern: Form field
    
16. **GoalProgressChart** - `/components/goals/GoalProgressChart.tsx`
    - Update: Chart labels and tooltips
    - Pattern: Chart component - may need currency symbol in labels

### Analytics Components (5 components)
17. **NetWorthChart** - `/components/analytics/NetWorthChart.tsx`
    - Update: Y-axis labels, tooltips
    - Pattern: Recharts - uses `formatCurrency()` in tickFormatter
    
18. **SpendingTrendsChart** - `/components/analytics/SpendingTrendsChart.tsx`
    - Update: Y-axis labels, tooltips
    - Pattern: Recharts - uses `formatCurrency()`
    
19. **SpendingByCategoryChart** - `/components/analytics/SpendingByCategoryChart.tsx`
    - Update: Chart values
    - Pattern: Recharts - uses `formatCurrency()`
    
20. **MonthOverMonthChart** - `/components/analytics/MonthOverMonthChart.tsx`
    - Update: Y-axis labels, tooltips
    - Pattern: Recharts - uses `formatCurrency()`
    
21. **IncomeSourcesChart** - `/components/analytics/IncomeSourcesChart.tsx`
    - Update: Chart values
    - Pattern: Recharts - uses `formatCurrency()`

### Admin Components (2 components)
22. **SystemMetrics** - `/components/admin/SystemMetrics.tsx`
    - Update: Total transaction volume (if displayed as currency)
    - Pattern: Uses `formatCurrency()` - auto-updates
    
23. **UserListTable** - `/components/admin/UserListTable.tsx`
    - Update: User currency preference display
    - Pattern: Shows user's currency setting - auto-updates

## Format Utility Enhancement Needs

### Current Implementation
```typescript
// src/lib/utils.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}
```

### Recommended Enhancements

#### Option 1: React Context (Recommended)
```typescript
// src/contexts/CurrencyContext.tsx
'use client'

import { createContext, useContext } from 'react'
import { trpc } from '@/lib/trpc'

const CurrencyContext = createContext<string>('USD')

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = trpc.users.me.useQuery()
  const currency = user?.currency || 'USD'
  
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}

// Usage in components:
import { useCurrency } from '@/contexts/CurrencyContext'

export function SomeComponent() {
  const currency = useCurrency()
  return <span>{formatCurrency(amount, currency)}</span>
}
```

#### Option 2: Enhanced Utility (Simpler, recommended for MVP)
```typescript
// src/lib/utils.ts
import { useQuery } from '@tanstack/react-query'

// Server-side safe version (for SSR)
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Client-side hook version (auto-uses user currency)
export function useFormatCurrency() {
  const { data: user } = trpc.users.me.useQuery()
  const currency = user?.currency || 'USD'
  
  return (amount: number, override?: string) => 
    formatCurrency(amount, override || currency)
}
```

**Recommendation:** Use Option 2 for MVP. It's simpler and doesn't require wrapping the app in a provider. Most components already use `formatCurrency()` directly, so they'll continue to work. For new components or updates, use the hook version.

### Currency Symbol Extraction
```typescript
// Helper to get just the symbol
export function getCurrencySymbol(currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value || currency
}
```

## Loading State Patterns

### Pattern 1: Inline Spinner (Short operations <3s)
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

### Pattern 2: Skeleton Placeholders (Initial page load)
```tsx
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-8 w-32" />
  </div>
) : (
  <CurrencyDisplay />
)}
```

### Pattern 3: Progress Bar (Long operations 10-30s)
```tsx
<Dialog open={converting}>
  <DialogContent>
    <Progress value={progress} className="h-3" />
    <p className="text-center text-sm mt-2">
      {currentStage} ({Math.round(progress)}%)
    </p>
  </DialogContent>
</Dialog>
```

### Pattern 4: Stage Checklist (Multi-step operations)
```tsx
<div className="space-y-2">
  {stages.map((stage, idx) => (
    <div key={idx} className="flex items-center gap-2">
      {progress > stage.threshold ? (
        <CheckCircle className="h-4 w-4 text-sage-600" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <span>{stage.name}</span>
    </div>
  ))}
</div>
```

**Recommendation for Currency Conversion:** Use Pattern 3 + Pattern 4 combined. Show both progress bar and stage checklist for maximum clarity.

## Error Messaging Strategy

### Error Types & Messages

#### 1. Exchange Rate API Failure
**Error:** API timeout or rate limit exceeded
**User Message:**
```tsx
<AlertDialog>
  <AlertDialogHeader>
    <AlertDialogTitle>Unable to Fetch Exchange Rates</AlertDialogTitle>
    <AlertDialogDescription>
      We couldn't connect to our exchange rate provider. Please try again
      in a few minutes, or contact support if the problem persists.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Close</AlertDialogCancel>
    <AlertDialogAction onClick={retry}>Retry</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

#### 2. Mid-Conversion Database Error
**Error:** Transaction rollback triggered
**User Message:**
```tsx
<AlertDialog>
  <AlertDialogHeader>
    <div className="flex items-center gap-3">
      <AlertTriangle className="h-6 w-6 text-amber-600" />
      <AlertDialogTitle>Conversion Failed</AlertDialogTitle>
    </div>
    <AlertDialogDescription>
      The conversion was interrupted and automatically rolled back. Your data
      remains in {originalCurrency}. No changes were made.
      
      Error details: {errorMessage}
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogAction onClick={contactSupport}>Contact Support</AlertDialogAction>
    <AlertDialogCancel>Close</AlertDialogCancel>
  </AlertDialogFooter>
</AlertDialog>
```

#### 3. Invalid Currency Selection
**Error:** User somehow selects invalid currency
**User Message:**
```tsx
toast({
  title: 'Invalid Currency',
  description: 'Please select a valid currency from the list.',
  variant: 'destructive',
})
```

#### 4. Network Interruption During Conversion
**Error:** User loses connection mid-conversion
**User Message:**
```tsx
<AlertDialog>
  <AlertDialogHeader>
    <AlertDialogTitle>Connection Lost</AlertDialogTitle>
    <AlertDialogDescription>
      Your internet connection was interrupted. The conversion may still be
      in progress on our servers. Please refresh the page in 30 seconds to
      check the status.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogAction onClick={refreshPage}>Refresh Now</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

### Error Handling Principles
1. **Always provide context:** Tell user what happened, why, and what to do
2. **Show recovery options:** Retry, contact support, refresh
3. **Never lose data:** Emphasize rollback safety in error messages
4. **Log for debugging:** Send error details to monitoring system
5. **Graceful degradation:** If rate API down, offer manual rate entry (future enhancement)

## Risks & Challenges

### Technical Risks

#### Risk 1: Exchange Rate API Reliability
**Impact:** HIGH - Without rates, conversion cannot proceed
**Mitigation:**
- Cache rates for 24 hours (reduces API calls by 95%+)
- Implement retry logic (3 attempts with exponential backoff)
- Have fallback to manual rate entry (future enhancement)
- Monitor API uptime and switch providers if needed

#### Risk 2: Long Conversion Time
**Impact:** MEDIUM - Users may think app is frozen
**Mitigation:**
- Show detailed progress (percentage, stage, transaction count)
- Set expectation upfront: "This may take 30 seconds"
- Prevent accidental navigation/refresh during conversion
- Consider background job for very large datasets (>10,000 transactions)

#### Risk 3: Database Transaction Timeout
**Impact:** HIGH - Could leave data in inconsistent state
**Mitigation:**
- Use Prisma interactive transactions with 30s timeout
- Batch updates (100 transactions per batch, commit each batch)
- Implement comprehensive rollback logic
- Test with production-scale data (10,000+ transactions)

### Complexity Risks

#### Risk 1: Currency Display Inconsistency
**Impact:** MEDIUM - Some components may show old currency
**Likelihood:** HIGH if manual updates required
**Mitigation:**
- Use React Query cache invalidation (automatic refetch)
- Add visual indicator during refresh: "Updating currency displays..."
- Create comprehensive test checklist of all 23 components
- Consider E2E test that checks all currency displays

#### Risk 2: Form Input Currency Mismatch
**Impact:** LOW - Users may be confused about which currency to enter
**Likelihood:** MEDIUM
**Mitigation:**
- Add currency symbol prefix/suffix to all amount inputs
- Update form placeholders to show currency: "Amount in EUR"
- Show inline conversion hint: "≈ $100 USD" below EUR input

#### Risk 3: Historical Transaction Accuracy
**Impact:** MEDIUM - Users may question conversion accuracy
**Likelihood:** LOW
**Mitigation:**
- Use transaction date for historical rate (not conversion date)
- Show rate source and date in success summary
- Provide audit log of conversion (CurrencyConversionLog model)
- Allow users to view conversion history in settings

## Recommendations for Planner

### 1. Split into 3 Sub-Builders
**Rationale:** Complexity is HIGH, touches backend + frontend + 20+ components

**Sub-Builder 1: Currency Conversion UI (6-8 hours)**
- Build all 4 dialog components (selector, confirmation, progress, success)
- Implement currency selector with 20 major currencies
- Create conversion progress tracking UI
- Add error handling dialogs
- Test user flow end-to-end (mock backend)

**Sub-Builder 2: Currency Conversion Backend (8-10 hours)**
- Implement tRPC currency.router.ts
- Integrate exchange rate API (exchangerate-api.com)
- Build ExchangeRate and CurrencyConversionLog models
- Implement transactional conversion service
- Add rollback logic and error handling
- Test with 100, 1000, 10000 transaction datasets
- Performance optimization (<30s for 1000 transactions)

**Sub-Builder 3: System-Wide Currency Updates (4-6 hours)**
- Update formatCurrency utility (add useFormatCurrency hook)
- Add currency symbol helpers
- Update AccountCard to use user currency (not account currency)
- Test all 23 components display new currency
- Add integration tests for currency display consistency
- Update form placeholders/labels with currency symbols

### 2. Use Existing Patterns Extensively
**Rationale:** App has excellent component foundation, reuse 90% of patterns

**Reuse These Patterns:**
- BudgetForm pattern for form handling (react-hook-form + zod)
- AlertDialog pattern from existing confirmations
- Toast notifications from existing success/error flows
- Loader2 spinner from existing loading states
- Progress component for conversion progress
- tRPC mutation pattern with optimistic updates

### 3. Prioritize Error Handling
**Rationale:** Currency conversion is HIGH RISK operation

**Must-Have Error Scenarios:**
- Exchange rate API timeout → Retry with cached rates
- Mid-conversion database error → Full rollback + user notification
- Network interruption → Show status check option
- Invalid currency selection → Prevent before conversion starts

### 4. Implement Comprehensive Testing
**Rationale:** Data integrity is critical

**Required Tests:**
- Unit: Currency conversion logic with various rates
- Integration: Full conversion flow with test database
- Load: Performance with 10,000+ transactions
- E2E: User flow from selection → success
- Visual: All 23 components display new currency correctly

### 5. Plan for Progressive Enhancement
**Rationale:** Future features to consider after MVP

**Phase 1 (MVP - Iteration 9):**
- 20 major currencies
- API-based exchange rates
- Basic conversion flow

**Phase 2 (Future):**
- Manual rate entry (fallback for API failure)
- Conversion history view in settings
- Multi-currency accounts (keep original currency)
- Scheduled conversions (e.g., monthly)
- Email confirmation after conversion

### 6. Use Staged Rollout for Safety
**Rationale:** HIGH RISK feature, test with real users gradually

**Rollout Plan:**
- Week 1: Admin-only (test with ahiya.butman@gmail.com)
- Week 2: Beta users (5-10 users with <100 transactions)
- Week 3: All users (monitor error rates, conversion times)
- Rollback plan: Feature flag to disable currency change

## Questions for Planner

1. **Exchange Rate API Provider:**
   - Confirm exchangerate-api.com is acceptable (free tier: 1500/month)
   - Do we need historical rates for all transaction dates, or just current rate?
   - Recommendation: Use historical rates for accuracy, cache aggressively

2. **Conversion Reversibility:**
   - Should we store original amounts for 30 days to allow reversal?
   - Add "Undo Currency Change" feature in settings?
   - Recommendation: YES for MVP safety, auto-delete after 30 days

3. **Progress Tracking Method:**
   - WebSocket for real-time progress, or HTTP polling every 1s?
   - Recommendation: HTTP polling (simpler, more reliable)

4. **Multi-Currency Accounts:**
   - Currently Account model has currency field (different from user currency)
   - Should accounts keep original currency, or convert to user currency?
   - Recommendation: Convert to user currency for MVP, add multi-currency in Phase 2

5. **Background Job vs Inline Conversion:**
   - For datasets >10,000 transactions, use background job?
   - Show "Conversion in progress, check back in 5 minutes" message?
   - Recommendation: Inline for MVP (most users <1000 transactions), add job queue in Phase 2

6. **Currency Symbol Display:**
   - Show symbol prefix ($100) or suffix (100 USD)?
   - Use native symbols (€) or ASCII (EUR)?
   - Recommendation: Symbol prefix for amounts ($100, €92), code suffix for labels (United States Dollar - USD)

7. **Conversion Audit Log:**
   - Should users see conversion history in UI, or just backend log?
   - Include: fromCurrency, toCurrency, rate, date, transactionCount
   - Recommendation: Show in settings (last 5 conversions), helpful for troubleshooting

## Resource Map

### Critical Files/Directories

#### New Files to Create
```
src/
├── app/(dashboard)/settings/currency/
│   └── page.tsx (ENHANCE - replace placeholder)
├── components/currency/
│   ├── CurrencySelector.tsx (NEW)
│   ├── CurrencyConfirmationDialog.tsx (NEW)
│   ├── CurrencyConversionProgress.tsx (NEW)
│   ├── CurrencyConversionSuccess.tsx (NEW)
│   └── CurrencyConversionError.tsx (NEW)
├── server/api/routers/
│   └── currency.router.ts (NEW)
├── server/services/
│   └── currencyConversionService.ts (NEW)
├── lib/
│   ├── exchangeRateApi.ts (NEW)
│   └── currencyUtils.ts (NEW - enhanced formatCurrency)
└── types/
    └── currency.ts (NEW)

prisma/
└── schema.prisma (UPDATE - add ExchangeRate, CurrencyConversionLog)
```

#### Files to Update
```
src/
├── lib/utils.ts (ENHANCE formatCurrency)
├── components/accounts/AccountCard.tsx (USE user currency, not account currency)
├── server/api/root.ts (ADD currency router)
└── All 23 components using currency (AUTO-UPDATE via query refetch)
```

### Key Dependencies

#### Existing (Already Installed)
- react-hook-form: Form handling
- zod: Schema validation
- @tanstack/react-query: Cache management (via tRPC)
- @trpc/react-query: Type-safe API calls
- @radix-ui/react-select: Currency dropdown
- @radix-ui/react-alert-dialog: Confirmation dialog
- @radix-ui/react-dialog: Progress modal
- @radix-ui/react-progress: Progress bar
- lucide-react: Icons (Loader2, CheckCircle, AlertTriangle)
- date-fns: Date formatting

#### New (To Install)
- **NONE** - All required dependencies already present!

### Testing Infrastructure

#### Unit Tests
```typescript
// src/lib/__tests__/currencyUtils.test.ts
describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
  })
  
  it('formats EUR correctly', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
  })
})

// src/server/services/__tests__/currencyConversionService.test.ts
describe('convertUserCurrency', () => {
  it('converts all transactions atomically', async () => {
    const result = await convertUserCurrency(userId, 'USD', 'EUR')
    expect(result.transactionCount).toBe(1234)
  })
  
  it('rolls back on error', async () => {
    // Mock database error mid-conversion
    await expect(convertUserCurrency(userId, 'USD', 'EUR')).rejects.toThrow()
    // Verify no data changed
  })
})
```

#### Integration Tests
```typescript
// src/app/(dashboard)/settings/currency/__tests__/page.test.tsx
describe('Currency Settings Page', () => {
  it('displays current currency', () => {
    render(<CurrencySettingsPage />)
    expect(screen.getByText('US Dollar')).toBeInTheDocument()
  })
  
  it('allows currency selection', async () => {
    render(<CurrencySettingsPage />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Euro'))
    expect(screen.getByText('1 USD = 0.92 EUR')).toBeInTheDocument()
  })
})
```

#### E2E Tests (Playwright)
```typescript
// e2e/currency-conversion.spec.ts
test('complete currency conversion flow', async ({ page }) => {
  // Navigate to settings
  await page.goto('/settings/currency')
  
  // Select new currency
  await page.click('role=combobox')
  await page.click('text=Euro')
  
  // Initiate conversion
  await page.click('text=Change Currency')
  
  // Confirm warning
  await page.check('text=I understand')
  await page.click('text=Continue with Conversion')
  
  // Wait for conversion (max 30s)
  await page.waitForSelector('text=Currency Converted Successfully', { timeout: 35000 })
  
  // Verify dashboard updated
  await page.goto('/dashboard')
  expect(await page.textContent('.net-worth')).toContain('€')
})
```

## Component Requirements Summary

### Absolute Must-Haves (Blockers)
1. Currency selector dropdown with 20 major currencies
2. Confirmation dialog with checkbox validation
3. Progress indicator showing 0-100% with stage updates
4. Success summary dialog with conversion statistics
5. Error handling for API failures and database errors
6. tRPC currency.router.ts with conversion mutation
7. ExchangeRate and CurrencyConversionLog database models
8. Currency conversion service with atomic transactions
9. React Query cache invalidation after conversion
10. formatCurrency utility enhancement

### Important (Should Have)
11. Currency symbol extraction helper
12. Preview of exchange rate before conversion
13. Stage-by-stage checklist in progress dialog
14. Transaction counter during conversion
15. Email confirmation after conversion (optional)
16. Conversion audit log in settings (view history)
17. Currency symbol in form input placeholders
18. Inline conversion hints on forms (≈ $100 USD)

### Nice to Have (Future Enhancements)
19. Manual exchange rate entry (fallback for API)
20. Reversible conversions (30-day undo window)
21. Multi-currency account support
22. Background job for large datasets (>10,000 transactions)
23. Scheduled conversions (monthly auto-convert)
24. Conversion analytics (most popular currencies)

---

**Report Completed:** 2025-10-02
**Explorer:** Explorer 3 - Currency Selector UI & User Experience
**Iteration:** 9 (Global)
**Status:** READY FOR PLANNING
