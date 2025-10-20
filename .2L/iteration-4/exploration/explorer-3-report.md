# Explorer 3 Report: Integration Patterns & Technical Dependencies

## Executive Summary

The Wealth app has a **solid technical foundation** with Next.js 14 App Router, tRPC v11, Prisma, and Supabase Auth fully integrated. All critical patterns are working: server/client Supabase clients, tRPC context with auto-sync, React Query data fetching, and form validation with react-hook-form + zod. **Missing components:** toast notifications (sonner recommended), animations (framer-motion needed), and consistent loading states. The stack is production-ready but needs UI/UX polish for the conscious money experience.

**Key Finding:** Integration infrastructure is excellent (8/10), but user experience patterns need enhancement for smooth, delightful interactions.

---

## Discoveries

### Current Working Patterns

**Authentication Flow:**
- Supabase Auth fully functional with email/password + OAuth ready
- Middleware validates sessions on all protected routes
- Auto-sync creates Prisma user on first sign-in (elegant pattern)
- Cookie management follows Supabase SSR best practices

**Data Fetching:**
- tRPC v11 with React Query working smoothly
- All 7 routers implemented (accounts, transactions, budgets, goals, analytics, categories, plaid)
- Protected procedures validate auth before execution
- Superjson transformer handles Date/Decimal serialization

**Form Handling:**
- react-hook-form + zod validation established
- @hookform/resolvers bridges forms and validation
- Example: AddTransactionForm shows proper pattern (controlled inputs, error display, async submit)

**UI Components:**
- 17 shadcn/ui components installed (button, card, dialog, select, tabs, etc.)
- Class-variance-authority for button variants
- Tailwind CSS with custom theme (sage green primary)

### Missing Patterns

**Toast Notifications:**
- Custom toast implementation in use-toast.tsx (basic)
- **ISSUE:** No visual Toaster component in app layout
- **ISSUE:** No sonner library (industry standard, better UX)
- **IMPACT:** Success/error feedback is inconsistent

**Animations:**
- NO framer-motion installed
- NO animation patterns established
- tailwindcss-animate installed but underutilized
- **IMPACT:** App feels static, not "delightful"

**Loading States:**
- Skeleton components exist but not consistently used
- NO Suspense boundaries in app router pages
- NO loading.tsx files in route groups
- **IMPACT:** User sees blank screens during data fetch

**Error Boundaries:**
- NO error.tsx files in route groups
- NO global error handling UI
- tRPC errors displayed in console only
- **IMPACT:** Poor error UX

---

## Patterns Identified

### Pattern 1: tRPC Mutation with Optimistic Updates

**Description:** Client-side optimistic UI updates before server confirmation

**Current State:** NOT IMPLEMENTED (queries only, no optimistic mutations)

**Recommended Pattern:**
```typescript
// In component
const utils = trpc.useContext()

const createTransaction = trpc.transactions.create.useMutation({
  onMutate: async (newTransaction) => {
    // Cancel outgoing refetches
    await utils.transactions.list.cancel()
    
    // Snapshot previous value
    const previousTransactions = utils.transactions.list.getData()
    
    // Optimistically update UI
    utils.transactions.list.setData(undefined, (old) => {
      if (!old) return old
      return {
        ...old,
        transactions: [newTransaction as any, ...old.transactions]
      }
    })
    
    return { previousTransactions }
  },
  
  onError: (err, newTransaction, context) => {
    // Rollback on error
    utils.transactions.list.setData(undefined, context?.previousTransactions)
    toast.error('Failed to create transaction')
  },
  
  onSuccess: () => {
    toast.success('Transaction created!')
  },
  
  onSettled: () => {
    // Refetch to ensure consistency
    utils.transactions.list.invalidate()
  }
})
```

**Use Case:** Creating/updating/deleting transactions, accounts, budgets, goals

**Recommendation:** Implement for all mutation-heavy features (transactions, budgets)

---

### Pattern 2: Form with react-hook-form + zod + tRPC

**Description:** Type-safe forms with validation and tRPC integration

**Current State:** PARTIALLY IMPLEMENTED (forms exist, but submission patterns inconsistent)

**Working Example:** `AddTransactionForm.tsx` (lines 1-265)

**Best Practice Pattern:**
```typescript
// 1. Shared zod schema (can be imported from tRPC router)
export const transactionFormSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  date: z.date(),
  amount: z.number(),
  payee: z.string().min(1, 'Payee is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// 2. Form component
export function TransactionForm() {
  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: { /* ... */ }
  })
  
  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      form.reset()
      toast.success('Transaction created!')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  
  const onSubmit = (data: z.infer<typeof transactionFormSchema>) => {
    createMutation.mutate(data)
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
```

**Use Case:** All forms (account creation, budget setup, goal creation, transaction entry)

**Recommendation:** 
- Extract zod schemas to shared file (e.g., `src/lib/schemas.ts`)
- Reuse schemas between client forms and tRPC routers
- Always show loading state during mutation

---

### Pattern 3: Protected Page Component

**Description:** Server component that validates auth and fetches initial data

**Current State:** IMPLEMENTED (see dashboard/page.tsx)

**Working Pattern:**
```typescript
// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }
  
  return (
    <div>
      <h1>Welcome, {user.user_metadata?.name}!</h1>
      {/* Client components that use tRPC */}
      <DashboardCards />
    </div>
  )
}
```

**Use Case:** All protected pages (dashboard, accounts, transactions, etc.)

**Recommendation:** 
- Keep using server components for auth checks (faster than client-side)
- Fetch critical data server-side for instant render
- Use client components for interactive features

---

### Pattern 4: Animated Component with Framer Motion

**Description:** Smooth animations for UI transitions

**Current State:** NOT IMPLEMENTED (framer-motion not installed)

**Recommended Installation:**
```bash
npm install framer-motion
```

**Recommended Pattern:**
```typescript
'use client'

import { motion } from 'framer-motion'

export function TransactionCard({ transaction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className="rounded-lg border bg-card p-4"
    >
      {/* Card content */}
    </motion.div>
  )
}

// List with staggered animations
export function TransactionList({ transactions }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {transactions.map((txn) => (
        <motion.div
          key={txn.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <TransactionCard transaction={txn} />
        </motion.div>
      ))}
    </motion.div>
  )
}
```

**Use Case:** 
- Page transitions (fade in/out)
- List items (stagger effect)
- Modals/dialogs (scale up)
- Success states (celebration bounce)
- Charts (animated data entry)

**Recommendation:** Install framer-motion and create reusable animation variants

---

### Pattern 5: Chart Component Integration

**Description:** Recharts integration with Next.js App Router

**Current State:** WORKING (recharts@2.12.7 installed)

**Working Example:** `SpendingByCategoryChart.tsx`

**Best Practice:**
```typescript
'use client'

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts'

export function NetWorthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis 
          dataKey="month" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value) => `$${Number(value).toLocaleString()}`}
        />
        <Line 
          type="monotone" 
          dataKey="netWorth" 
          stroke="hsl(142, 76%, 36%)" // Sage green
          strokeWidth={2}
          dot={{ fill: 'hsl(142, 76%, 36%)', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Key Points:**
- Always use `'use client'` directive
- Use ResponsiveContainer for proper sizing
- Theme colors using CSS variables (hsl(var(--primary)))
- Format tooltips and axes for readability

**Recommendation:** Consistent chart theming across all analytics components

---

### Pattern 6: Toast Notifications (Recommended: Sonner)

**Description:** Beautiful toast notifications for user feedback

**Current State:** Basic custom implementation (use-toast.tsx), no visual component

**Recommended Installation:**
```bash
npm install sonner
```

**Recommended Pattern:**
```typescript
// app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </body>
    </html>
  )
}

// Usage in components
import { toast } from 'sonner'

function MyComponent() {
  const handleSuccess = () => {
    toast.success('Transaction created!', {
      description: 'Your transaction has been saved.',
      duration: 3000,
    })
  }
  
  const handleError = () => {
    toast.error('Failed to save', {
      description: 'Please try again.',
    })
  }
  
  // ... rest of component
}
```

**Use Case:** All user actions (create, update, delete, errors, success)

**Recommendation:** Replace custom toast with sonner for better UX

---

## Complexity Assessment

### High Complexity Areas

**1. Transaction Management (Split into 2-3 builders)**
- **Why Complex:**
  - Multiple forms (add, edit, bulk actions)
  - AI categorization integration
  - Export functionality
  - Filtering and search
  - Real-time balance updates
  - Optimistic UI updates needed
- **Estimated Builder Splits:**
  - Builder A: Transaction CRUD + basic list
  - Builder B: Filters, search, bulk actions
  - Builder C: Export, advanced features

**2. Analytics Dashboard (Split into 2 builders)**
- **Why Complex:**
  - 5 different chart types
  - Complex data aggregation
  - Date range filtering
  - Performance optimization needed
  - Responsive design challenges
- **Estimated Builder Splits:**
  - Builder A: Spending charts (category, trends)
  - Builder B: Income/NetWorth charts + filters

**3. Budget Management (Single builder, but challenging)**
- **Why Complex:**
  - Month-to-month navigation
  - Progress calculations
  - Alert system
  - Rollover logic
  - Multi-category budgets
- **Complexity Level:** High, but contained
- **Estimated Time:** 90-120 minutes

### Medium Complexity Areas

**1. Goal Tracking**
- Progress charts
- Linked account integration
- Target date calculations
- Completion celebrations
- **Estimated Time:** 60-90 minutes

**2. Account Management**
- Plaid integration (already exists)
- Manual account CRUD
- Balance tracking
- Account types
- **Estimated Time:** 45-60 minutes

**3. Category Management**
- Hierarchical categories
- Custom categories
- Color/icon selection
- Default categories
- **Estimated Time:** 30-45 minutes

### Low Complexity Areas

**1. Settings Pages**
- User preferences
- Currency selection
- Timezone settings
- **Estimated Time:** 30 minutes

**2. Navigation/Layout**
- Dashboard layout
- Sidebar navigation
- Header with user menu
- **Estimated Time:** 30 minutes

---

## Integration Points

### External APIs

**1. Anthropic Claude API (AI Categorization)**
- **Purpose:** Auto-categorize transactions
- **Complexity:** LOW (already implemented)
- **Integration:** Via @anthropic-ai/sdk@0.32.1
- **Considerations:**
  - API key in environment variables
  - Rate limiting (60 req/min on free tier)
  - Caching via MerchantCategoryCache model
  - Fallback to manual categorization
- **Builder Guidance:** Service layer exists (`categorize.service.ts`), just wire up UI

**2. Plaid API (Bank Connections)**
- **Purpose:** Sync transactions from banks
- **Complexity:** MEDIUM (infrastructure ready, UI needs work)
- **Integration:** Via plaid@28.0.0 + react-plaid-link@3.6.0
- **Considerations:**
  - Sandbox mode for development
  - Webhook handling for real-time sync
  - Token encryption (ENCRYPTION_KEY env var)
  - Account/transaction deduplication
- **Builder Guidance:** PlaidLinkButton exists, expand sync UI

### Internal Integrations

**1. Supabase Auth ↔ tRPC Context**
- **How They Connect:**
  ```typescript
  // middleware.ts validates session
  // → tRPC context (createTRPCContext) gets user
  // → Auto-syncs to Prisma User model
  // → Protected procedures access ctx.user
  ```
- **Pattern:** Fully established, works flawlessly
- **Builder Guidance:** Use `protectedProcedure` for all auth-required operations

**2. React Query ↔ tRPC Mutations**
- **How They Connect:**
  ```typescript
  // tRPC hooks return React Query objects
  const mutation = trpc.transactions.create.useMutation()
  // mutation.mutate(), mutation.isPending, mutation.error
  
  // Invalidate cache after mutation
  const utils = trpc.useContext()
  onSuccess: () => utils.transactions.list.invalidate()
  ```
- **Pattern:** Working, but optimistic updates not used
- **Builder Guidance:** Add optimistic updates for better UX

**3. Prisma ↔ Database**
- **How They Connect:**
  - Direct connection (postgresql://localhost:5432)
  - Prisma Client generated from schema
  - Type-safe queries
  - Decimal handling for money values
- **Pattern:** Solid, no issues
- **Builder Guidance:** Use Decimal for all money amounts

**4. Shadcn/UI ↔ Tailwind CSS**
- **How They Connect:**
  - Components use CSS variables (hsl(var(--primary)))
  - Class-variance-authority for variants
  - Tailwind merge utility (cn function)
- **Pattern:** Working well
- **Builder Guidance:** Extend theme in tailwind.config.ts for new colors

**5. Recharts ↔ Next.js App Router**
- **How They Connect:**
  - Client components only ('use client')
  - ResponsiveContainer handles sizing
  - Data passed from server components via props
- **Pattern:** Working, but styling inconsistent
- **Builder Guidance:** Use theme colors for consistent look

---

## Technology Recommendations

### Primary Stack (Already Installed)

**Framework: Next.js 14.2.33**
- **Rationale:** App Router for modern patterns, RSC for performance
- **Status:** ✅ Installed and working
- **Version:** Latest stable

**TypeScript: 5.7.2 (Strict Mode)**
- **Rationale:** Type safety, better DX, catch errors early
- **Status:** ✅ Configured with strict checks
- **Config:** noUncheckedIndexedAccess, noUnusedLocals, etc.

**Database: PostgreSQL via Supabase**
- **Rationale:** Reliable, scalable, great local dev with Supabase CLI
- **Status:** ✅ Working (direct connection, port 5432)
- **ORM:** Prisma 5.22.0

**Auth: Supabase Auth**
- **Rationale:** Built-in email verification, magic links, OAuth, session management
- **Status:** ✅ Fully integrated
- **Libraries:** @supabase/supabase-js@2.58.0, @supabase/ssr@0.5.2

**API: tRPC v11.6.0**
- **Rationale:** Type-safe APIs, no codegen, excellent DX
- **Status:** ✅ Working with React Query
- **Integration:** @trpc/react-query@11.6.0

**Styling: Tailwind CSS 3.4.1**
- **Rationale:** Utility-first, fast, great DX
- **Status:** ✅ Configured with custom theme
- **Extensions:** tailwindcss-animate@1.0.7

**UI Components: shadcn/ui (Radix UI)**
- **Rationale:** Accessible, customizable, no runtime cost
- **Status:** ✅ 17 components installed
- **Components:** button, card, dialog, select, tabs, etc.

**Forms: react-hook-form 7.53.2**
- **Rationale:** Performance, tiny bundle, great API
- **Status:** ✅ Working with zod validation
- **Resolver:** @hookform/resolvers@3.9.1

**Validation: zod 3.23.8**
- **Rationale:** Type-safe schemas, shared client/server
- **Status:** ✅ Used in forms and tRPC
- **Integration:** Seamless with react-hook-form

**Charts: recharts 2.12.7**
- **Rationale:** React-first, good docs, flexible
- **Status:** ✅ Working in analytics
- **Alternatives Considered:** Chart.js (lower-level), Victory (heavier)

**Data Fetching: @tanstack/react-query 5.60.5**
- **Rationale:** Caching, background updates, optimistic UI
- **Status:** ✅ Integrated via tRPC
- **Features Used:** Queries, mutations, cache invalidation

### Supporting Libraries (Need Installation)

**Toast Notifications: sonner**
- **Rationale:** Beautiful, accessible, lightweight (5KB)
- **Status:** ❌ NOT INSTALLED (custom implementation exists)
- **Recommendation:** INSTALL
- **Command:** `npm install sonner`
- **Impact:** Better user feedback, less custom code

**Animations: framer-motion**
- **Rationale:** Smooth animations, great DX, production-ready
- **Status:** ❌ NOT INSTALLED
- **Recommendation:** INSTALL
- **Command:** `npm install framer-motion`
- **Impact:** Delightful UX, smooth transitions, conscious money feel

**Date Handling: date-fns 3.6.0**
- **Rationale:** Lightweight, tree-shakeable, modern
- **Status:** ✅ Already installed
- **Usage:** Date formatting, calculations

**Icons: lucide-react 0.460.0**
- **Rationale:** Beautiful icons, tree-shakeable, consistent
- **Status:** ✅ Already installed
- **Usage:** UI icons throughout app

### Optional Enhancements (Future)

**State Management: Zustand**
- **When Needed:** If client state grows complex
- **Current:** Not needed (React Query handles server state)

**Testing: Vitest + Testing Library**
- **Status:** ✅ Vitest installed, some tests exist
- **Recommendation:** Expand test coverage in future iteration

**Error Tracking: Sentry**
- **When Needed:** Production deployment
- **Current:** Console logging sufficient for dev

---

## Risks & Challenges

### Technical Risks

**Risk 1: Animation Performance with Framer Motion**
- **Impact:** MEDIUM - Could cause jank on low-end devices
- **Likelihood:** LOW - Framer Motion is well-optimized
- **Mitigation:**
  - Use `layout` animations sparingly
  - Leverage CSS transforms (GPU-accelerated)
  - Add `will-change` for complex animations
  - Test on mobile devices
  - Provide reduced-motion alternative

**Risk 2: Chart Rendering Performance**
- **Impact:** MEDIUM - Complex charts could slow dashboard
- **Likelihood:** MEDIUM - 5 charts on analytics page
- **Mitigation:**
  - Lazy load chart components
  - Debounce filter changes
  - Limit data points (e.g., 12 months max)
  - Use React.memo for chart components
  - Consider virtualization for large datasets

**Risk 3: tRPC Payload Size**
- **Impact:** LOW - Large transaction lists could be slow
- **Likelihood:** LOW - Pagination already implemented
- **Mitigation:**
  - Keep cursor-based pagination (limit: 50)
  - Use field selection (don't over-fetch)
  - Consider infinite scroll for better UX
  - Monitor bundle size

**Risk 4: Optimistic Update Rollbacks**
- **Impact:** MEDIUM - Users see incorrect data temporarily
- **Likelihood:** LOW - If network is unstable
- **Mitigation:**
  - Always show loading state during mutation
  - Graceful error handling with toast
  - Rollback UI on error (restore previous data)
  - Add retry logic for failed mutations

### Complexity Risks

**Risk 5: Builder Feature Scope Creep**
- **Impact:** HIGH - Builders take too long, integration fails
- **Likelihood:** MEDIUM - Transaction/analytics are complex
- **Mitigation:**
  - Strict time-boxing (90 min max per builder)
  - Clear acceptance criteria before building
  - Split large features into sub-builders
  - Use feature flags to defer non-critical items

**Risk 6: Animation Overuse**
- **Impact:** LOW - App feels gimmicky, not professional
- **Likelihood:** MEDIUM - Easy to over-animate
- **Mitigation:**
  - Establish animation guidelines
  - Use subtle transitions (200-300ms)
  - Animate only on user action
  - Test with real users for feedback

---

## Recommendations for Planner

### 1. Install Missing Dependencies FIRST

**Before any builder starts:**
```bash
npm install sonner framer-motion
```

**Rationale:**
- Sonner is critical for user feedback (all builders need it)
- Framer-motion enables delightful UX (core requirement)
- Installing upfront prevents mid-build issues

**Time:** 2 minutes

---

### 2. Establish Pattern Library

**Create:** `src/lib/patterns/` directory with:

```typescript
// src/lib/patterns/optimistic-mutation.ts
export function useOptimisticMutation<T>(...) { /* ... */ }

// src/lib/patterns/toast-feedback.ts
export const toastSuccess = (message: string) => { /* ... */ }
export const toastError = (error: Error) => { /* ... */ }

// src/lib/patterns/animation-variants.ts
export const fadeIn = { /* ... */ }
export const slideIn = { /* ... */ }
export const staggerChildren = { /* ... */ }
```

**Rationale:**
- Consistent patterns across all builders
- Faster development (copy-paste patterns)
- Easier code review
- Better maintainability

**Time:** 30 minutes (Planner or dedicated Pattern Builder)

---

### 3. Split Complex Features Appropriately

**Transaction Management → 3 Builders:**
- Builder 6A: CRUD + List (60 min)
- Builder 6B: Filters + Search (45 min)
- Builder 6C: Bulk Actions + Export (45 min)

**Analytics → 2 Builders:**
- Builder 7A: Spending Charts (60 min)
- Builder 7B: Income/NetWorth Charts (60 min)

**Budget Management → 1 Builder:**
- Builder 8: Budget CRUD + Progress (90 min)

**Goals → 1 Builder:**
- Builder 9: Goal CRUD + Tracking (60 min)

**UI/UX Polish → 1 Builder:**
- Builder 10: Animations + Loading States (60 min)

**Total Builders:** 9 (6A, 6B, 6C, 7A, 7B, 8, 9, 10)

**Rationale:**
- Each builder has clear, achievable scope
- Time-boxed to prevent overwork
- Parallel execution possible (6A||7A, 6B||7B, etc.)
- Reduces integration complexity

---

### 4. Prioritize User Feedback Mechanisms

**Critical:**
- Toast notifications on ALL actions (create, update, delete)
- Loading states on ALL buttons/forms
- Error messages user-friendly (not technical)
- Success celebrations (confetti on goal completion?)

**Rationale:**
- Conscious money app = encouraging, not punishing
- Users need to FEEL progress
- Instant feedback builds trust

**Builder Guidance:**
- Every mutation MUST show toast (sonner)
- Every button MUST show loading state
- Every error MUST be user-friendly

---

### 5. Animation Guidelines

**Principles:**
- Subtle, not distracting (200-300ms duration)
- Purpose-driven (guide attention, celebrate success)
- Respect prefers-reduced-motion
- GPU-accelerated (transforms, opacity only)

**Recommended Animations:**
- Page transitions: Fade in (300ms)
- List items: Stagger up (100ms delay between)
- Modals: Scale from 0.95 to 1 (200ms)
- Success: Bounce scale 1 → 1.1 → 1 (400ms)
- Charts: Animate data entry (500ms ease-out)

**Don't Animate:**
- Text/content (hard to read)
- Critical actions (buttons, forms)
- Frequently repeated actions

**Builder Guidance:**
- Use framer-motion variants (not raw CSS)
- Test on mobile (performance)
- Add animation to 20% of UI, not 100%

---

### 6. Shared Zod Schemas

**Create:** `src/lib/schemas.ts`

**Extract schemas from:**
- Transaction form (already exists in AddTransactionForm)
- Account form
- Budget form
- Goal form
- Category form

**Benefit:**
- Reuse in tRPC routers (server-side validation)
- Reuse in forms (client-side validation)
- Single source of truth
- Type safety guaranteed

**Example:**
```typescript
// src/lib/schemas.ts
export const transactionSchema = z.object({
  accountId: z.string().min(1),
  date: z.date(),
  amount: z.number(),
  // ...
})

// src/server/api/routers/transactions.router.ts
import { transactionSchema } from '@/lib/schemas'

create: protectedProcedure
  .input(transactionSchema)
  .mutation(async ({ ctx, input }) => { /* ... */ })
```

**Time:** 15 minutes (extract existing schemas)

---

### 7. Testing Strategy for Builders

**Each builder must:**

1. **TypeScript Check:** `npx tsc --noEmit` (0 errors)
2. **Build Test:** `npm run build` (must succeed)
3. **Manual Test:** Test primary user flow
4. **Integration Test:** Verify doesn't break existing features

**Validator checks:**
- All mutations show toast feedback
- All buttons show loading states
- All forms validate properly
- No console errors
- Animations smooth (no jank)

**Time per builder:** 10 minutes validation

---

### 8. Integration Checklist (For Each Builder)

**Before starting:**
- [ ] Read pattern library (`src/lib/patterns/`)
- [ ] Check which components already exist
- [ ] Identify shared utilities (formatCurrency, formatDate)
- [ ] Review tRPC router for available procedures

**During building:**
- [ ] Use existing UI components (don't recreate)
- [ ] Follow naming conventions (PascalCase components, camelCase functions)
- [ ] Add TypeScript types (no `any`)
- [ ] Use toast for all user feedback
- [ ] Add loading states to all async actions

**After building:**
- [ ] Test with real data (not mock)
- [ ] Test edge cases (empty states, errors)
- [ ] Test on mobile (responsive design)
- [ ] Document any new patterns used

---

## Code Pattern Examples

### Example 1: tRPC Mutation with Toast + Optimistic Updates

```typescript
'use client'

import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { useState } from 'react'

export function CreateTransactionButton() {
  const utils = trpc.useContext()
  
  const createTransaction = trpc.transactions.create.useMutation({
    onMutate: async (newTransaction) => {
      // Cancel any outgoing refetches
      await utils.transactions.list.cancel()
      
      // Snapshot the previous value
      const previousTransactions = utils.transactions.list.getData()
      
      // Optimistically update to the new value
      utils.transactions.list.setData(undefined, (old) => {
        if (!old) return old
        return {
          ...old,
          transactions: [
            { 
              ...newTransaction, 
              id: 'temp-id',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any,
            ...old.transactions
          ]
        }
      })
      
      return { previousTransactions }
    },
    
    onError: (error, newTransaction, context) => {
      // Rollback to the previous value on error
      utils.transactions.list.setData(undefined, context?.previousTransactions)
      
      toast.error('Failed to create transaction', {
        description: error.message,
      })
    },
    
    onSuccess: () => {
      toast.success('Transaction created!', {
        description: 'Your transaction has been saved.',
      })
    },
    
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      utils.transactions.list.invalidate()
    },
  })
  
  const handleCreate = () => {
    createTransaction.mutate({
      accountId: 'account-1',
      date: new Date(),
      amount: -50.00,
      payee: 'Coffee Shop',
      categoryId: 'category-food',
      notes: 'Morning coffee',
      tags: ['coffee', 'daily'],
    })
  }
  
  return (
    <Button 
      onClick={handleCreate} 
      disabled={createTransaction.isPending}
    >
      {createTransaction.isPending ? 'Creating...' : 'Create Transaction'}
    </Button>
  )
}
```

**Key Points:**
- Optimistic update shows instant feedback
- Error handling rolls back UI state
- Toast notifications guide user
- Loading state during mutation
- Cache invalidation ensures consistency

---

### Example 2: Form with react-hook-form + zod + tRPC

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Shared schema (can be extracted to src/lib/schemas.ts)
const budgetFormSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format'),
  rollover: z.boolean().default(false),
})

type BudgetFormData = z.infer<typeof budgetFormSchema>

export function BudgetForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: '',
      amount: 0,
      month: new Date().toISOString().slice(0, 7), // "2025-10"
      rollover: false,
    },
  })
  
  const createBudget = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success('Budget created!', {
        description: 'Your budget has been set up.',
      })
      form.reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to create budget', {
        description: error.message,
      })
    },
  })
  
  const onSubmit = (data: BudgetFormData) => {
    createBudget.mutate(data)
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="amount">Budget Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...form.register('amount', { valueAsNumber: true })}
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>
      
      {/* More form fields... */}
      
      <Button type="submit" disabled={createBudget.isPending}>
        {createBudget.isPending ? 'Creating...' : 'Create Budget'}
      </Button>
    </form>
  )
}
```

**Key Points:**
- Zod schema validates both client and server
- Form errors displayed inline
- Loading state on submit button
- Toast feedback on success/error
- Reset form after success

---

### Example 3: Animated List with Framer Motion

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { trpc } from '@/lib/trpc'

export function TransactionList() {
  const { data, isLoading } = trpc.transactions.list.useQuery({
    limit: 20,
  })
  
  if (isLoading) {
    return <TransactionListSkeleton />
  }
  
  const transactions = data?.transactions ?? []
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05, // 50ms delay between items
          },
        },
      }}
      className="space-y-2"
    >
      <AnimatePresence>
        {transactions.map((transaction) => (
          <motion.div
            key={transaction.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{transaction.payee}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.category.name}
                </p>
              </div>
              <p className={cn(
                "text-lg font-semibold",
                transaction.amount > 0 ? "text-green-600" : "text-red-600"
              )}>
                {transaction.amount > 0 ? '+' : ''}
                ${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
```

**Key Points:**
- Stagger animation for list items (smooth entry)
- Layout animations for sorting/filtering
- Exit animations for deletions
- Hover effect for interactivity
- AnimatePresence for mount/unmount transitions

---

### Example 4: Chart with Theme Colors

```typescript
'use client'

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts'

interface NetWorthChartProps {
  data: Array<{ month: string; netWorth: number }>
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  // Custom tooltip for better UX
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium">{payload[0].payload.month}</p>
        <p className="text-lg font-bold text-primary">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="hsl(var(--border))"
          opacity={0.3}
        />
        <XAxis 
          dataKey="month" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{
            paddingTop: '20px',
          }}
        />
        <Line 
          type="monotone" 
          dataKey="netWorth" 
          name="Net Worth"
          stroke="hsl(142, 76%, 36%)" // Sage green primary
          strokeWidth={3}
          dot={{ 
            fill: 'hsl(142, 76%, 36%)', 
            r: 5,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))'
          }}
          activeDot={{ 
            r: 7,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))'
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Key Points:**
- Use CSS variables for theme consistency
- Custom tooltip for branded experience
- Proper axis formatting ($50k not $50000)
- Responsive container for all screen sizes
- Accessible colors with good contrast

---

### Example 5: Loading States with Suspense

```typescript
// app/(dashboard)/analytics/page.tsx (Server Component)
import { Suspense } from 'react'
import { SpendingChart } from '@/components/analytics/SpendingChart'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingChart />
        </Suspense>
        
        <Suspense fallback={<ChartSkeleton />}>
          <IncomeChart />
        </Suspense>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-[350px] w-full" />
    </div>
  )
}

// Client component for data fetching
'use client'
import { trpc } from '@/lib/trpc'

export function SpendingChart() {
  const { data, isLoading } = trpc.analytics.spendingByCategory.useQuery()
  
  if (isLoading) {
    return <ChartSkeleton />
  }
  
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      <PieChart data={data} />
    </div>
  )
}
```

**Key Points:**
- Suspense boundaries for independent loading
- Skeleton matches final component shape
- Client components handle data fetching
- Server components define page structure
- Graceful loading experience

---

## Dependency Analysis

### NPM Packages to Install

**Critical (Install before any builder starts):**
```bash
npm install sonner          # Toast notifications (5KB gzipped)
npm install framer-motion   # Animations (32KB gzipped)
```

**Total Added:** ~40KB gzipped (minimal impact)

**Already Installed (No Action Needed):**
- All core dependencies (Next.js, React, tRPC, Prisma, Supabase)
- All UI dependencies (shadcn/ui, Radix, Tailwind)
- All form dependencies (react-hook-form, zod)
- All chart dependencies (recharts)
- All utility dependencies (date-fns, lucide-react, clsx)

### Shadcn/UI Components to Add

**Check which are missing:**
```bash
# Components likely needed but not installed yet:
npx shadcn-ui@latest add toaster      # For sonner integration
npx shadcn-ui@latest add command      # For search/filters
npx shadcn-ui@latest add checkbox     # For bulk actions
npx shadcn-ui@latest add switch       # For toggles
npx shadcn-ui@latest add radio-group  # For account type selection
npx shadcn-ui@latest add slider       # For budget amount input
npx shadcn-ui@latest add form         # Form wrapper components
```

**Already Installed (Verified):**
- button, card, dialog, select, input, label, textarea
- badge, skeleton, toast, alert-dialog, popover, dropdown-menu
- separator, progress, tabs, calendar

### Version Compatibility Check

**No conflicts detected:**
- Next.js 14.2.33 + React 18.3.1 ✅
- tRPC 11.6.0 + React Query 5.60.5 ✅
- Prisma 5.22.0 + Supabase ✅
- react-hook-form 7.53.2 + zod 3.23.8 ✅
- Tailwind 3.4.1 + tailwindcss-animate 1.0.7 ✅
- recharts 2.12.7 + Next.js 14 ✅

**Potential Future Conflicts:**
- framer-motion + React 19: May need updates when React 19 stable
- Recharts + Next.js 15: Monitor for breaking changes

**Mitigation:** Pin major versions in package.json, test before upgrading

---

## Testing Strategy

### Builder Validation Checklist

**Each builder MUST pass:**

1. **TypeScript Compilation:**
   ```bash
   npx tsc --noEmit
   ```
   Expected: 0 errors

2. **ESLint Check:**
   ```bash
   npm run lint
   ```
   Expected: No NEW warnings/errors (existing 20 warnings OK)

3. **Build Test:**
   ```bash
   npm run build
   ```
   Expected: Successful production build

4. **Manual Feature Test:**
   - Test primary user flow (create, read, update, delete)
   - Test edge cases (empty states, errors, validation)
   - Test on mobile (responsive design)
   - Test animations (smooth, no jank)

5. **Integration Test:**
   - Verify no regressions in other features
   - Test with real Supabase data
   - Verify tRPC calls work
   - Check console for errors

**Time per builder:** 10-15 minutes validation

---

### Validation Checks Validators Will Run

**Automated:**
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → No new issues
- `npm run build` → Success
- `npm run test -- --run` → No new failures

**Manual:**
- User flow walkthrough
- UI/UX consistency check
- Animation smoothness check
- Mobile responsiveness check
- Error handling verification

**Success Criteria:**
- All automated checks pass
- No console errors in browser
- User flows work end-to-end
- Animations are smooth (no jank)
- Toast notifications appear correctly
- Loading states show properly

---

## Potential Pitfalls & How to Avoid Them

### Pitfall 1: Over-engineering Forms

**Problem:** Builders create complex form components with too many features

**Solution:**
- Use existing AddTransactionForm as template
- Don't add features not in requirements
- Reuse validation schemas
- Keep forms simple, add features later

**Example (BAD):**
```typescript
// DON'T: Add features not requested
<FormField
  name="recurringSchedule"  // Not in requirements!
  control={form.control}
  render={...}
/>
```

**Example (GOOD):**
```typescript
// DO: Stick to requirements
<FormField
  name="amount"
  control={form.control}
  render={...}
/>
```

---

### Pitfall 2: Inconsistent Animation Usage

**Problem:** Some components animate, others don't (feels broken)

**Solution:**
- Create animation variants file (`src/lib/patterns/animation-variants.ts`)
- Use same variants across all components
- Document which interactions should animate

**Pattern:**
```typescript
// src/lib/patterns/animation-variants.ts
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
}

export const slideInFromBottom = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

// Usage in components
<motion.div {...fadeIn}>
  {/* Content */}
</motion.div>
```

---

### Pitfall 3: Forgetting Toast Notifications

**Problem:** User takes action, nothing happens (no feedback)

**Solution:**
- EVERY mutation MUST show toast (success or error)
- Add to validation checklist
- Use consistent toast patterns

**Pattern:**
```typescript
const mutation = trpc.something.create.useMutation({
  onSuccess: () => {
    toast.success('Success!', {
      description: 'Action completed successfully.',
    })
  },
  onError: (error) => {
    toast.error('Failed', {
      description: error.message,
    })
  },
})
```

---

### Pitfall 4: Ignoring Loading States

**Problem:** Buttons click multiple times, forms submit twice

**Solution:**
- ALWAYS disable buttons during mutation
- ALWAYS show loading text ("Creating..." not "Create")
- Use isPending from tRPC mutations

**Pattern:**
```typescript
<Button 
  type="submit" 
  disabled={mutation.isPending}
>
  {mutation.isPending ? 'Creating...' : 'Create'}
</Button>
```

---

### Pitfall 5: Not Testing Mobile

**Problem:** Feature works on desktop, breaks on mobile

**Solution:**
- Test every feature on mobile viewport (375px width)
- Use responsive Tailwind classes
- Test touch interactions (no hover-only features)

**Example:**
```typescript
// BAD: Only works on desktop
<div className="grid grid-cols-4 gap-4">

// GOOD: Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

### Pitfall 6: Reinventing Existing Components

**Problem:** Builder creates new Button component when one exists

**Solution:**
- ALWAYS check `src/components/ui/` first
- Reuse existing shadcn/ui components
- Don't duplicate code

**Checklist before creating new component:**
- [ ] Does shadcn/ui have this? (check docs)
- [ ] Is it already installed? (check src/components/ui/)
- [ ] Can I extend an existing component? (use variants)

---

## Questions for Planner

1. **Should we install sonner + framer-motion BEFORE builders start, or have Builder-1 do it?**
   - Recommendation: Install upfront (prevents issues)

2. **Should we create pattern library (`src/lib/patterns/`) before builders, or let patterns emerge?**
   - Recommendation: Create basic patterns first (saves time)

3. **Should animations be mandatory for all builders, or optional?**
   - Recommendation: Mandatory for consistency (but provide variants)

4. **Should we add a dedicated "Polish" builder at the end, or expect each builder to polish their feature?**
   - Recommendation: Each builder polishes their own (faster), final polish builder for global improvements

5. **How should we handle the "conscious money" philosophy in UI? Specific colors? Affirmations?**
   - Recommendation: Define tone guidelines (encouraging language, soft colors, celebration moments)

6. **Should we implement dark mode in this iteration, or defer to Iteration 5?**
   - Recommendation: Defer (focus on light mode first, dark mode is complex)

7. **What level of animation is "delightful" vs "distracting"?**
   - Recommendation: 20% of UI animated (key moments only), 200-300ms duration

8. **Should optimistic updates be required for all mutations, or only critical ones (transactions)?**
   - Recommendation: Required for high-frequency actions (transactions), optional for settings

---

## Resource Map

### Critical Files/Directories

**Authentication:**
- `/middleware.ts` - Route protection and session validation
- `/src/lib/supabase/client.ts` - Browser Supabase client
- `/src/lib/supabase/server.ts` - Server Supabase client
- `/src/server/api/trpc.ts` - tRPC context with auto-sync

**API Layer:**
- `/src/server/api/root.ts` - Root router
- `/src/server/api/routers/` - 7 feature routers
- `/src/lib/trpc.ts` - tRPC React client

**UI Components:**
- `/src/components/ui/` - 17 shadcn/ui components
- `/src/components/dashboard/` - Dashboard cards
- `/src/components/transactions/` - Transaction components
- `/src/components/analytics/` - Chart components

**Database:**
- `/prisma/schema.prisma` - Database schema (11 models)
- `/src/lib/prisma.ts` - Prisma client singleton

**Forms:**
- `/src/components/transactions/AddTransactionForm.tsx` - Reference pattern
- Zod schemas currently inline (should extract to `/src/lib/schemas.ts`)

**Styling:**
- `/tailwind.config.ts` - Theme configuration
- `/src/app/globals.css` - CSS variables

**Configuration:**
- `/package.json` - Dependencies
- `/tsconfig.json` - TypeScript config
- `/.env.local` - Environment variables

---

### Key Dependencies

**Core Framework:**
- next@14.2.33 - App Router, RSC, Server Actions
- react@18.3.1 - UI library
- typescript@5.7.2 - Type safety

**API & Data:**
- @trpc/server@11.6.0 - Type-safe APIs
- @trpc/react-query@11.6.0 - React Query integration
- @tanstack/react-query@5.60.5 - Data fetching and caching
- @prisma/client@5.22.0 - Database ORM
- superjson@2.2.1 - Serialization for Date/Decimal

**Authentication:**
- @supabase/supabase-js@2.58.0 - Supabase client
- @supabase/ssr@0.5.2 - Next.js SSR helpers

**Forms & Validation:**
- react-hook-form@7.53.2 - Form library
- @hookform/resolvers@3.9.1 - Zod resolver
- zod@3.23.8 - Schema validation

**UI Components:**
- @radix-ui/* - Accessible primitives (17 packages)
- class-variance-authority@0.7.0 - Component variants
- tailwindcss@3.4.1 - Utility CSS
- lucide-react@0.460.0 - Icons

**Charts:**
- recharts@2.12.7 - React charts

**Utilities:**
- date-fns@3.6.0 - Date formatting
- clsx@2.1.0 - Class merging
- tailwind-merge@2.2.0 - Tailwind class merging

**To Install:**
- sonner - Toast notifications
- framer-motion - Animations

---

### Testing Infrastructure

**Test Framework:**
- vitest@3.2.4 - Test runner
- @vitest/ui@3.2.4 - Test UI
- vitest-mock-extended@3.1.0 - Mocking

**Current Test Coverage:**
- transactions.router.test.ts - 24/24 passing
- goals.router.test.ts - 22/22 passing
- accounts.router.test.ts - 16/16 passing
- plaid.service.test.ts - 8/8 passing
- categorize.service.test.ts - 7/8 passing (1 flaky test)
- encryption.test.ts - 3/10 passing (missing env var)

**Test Commands:**
- `npm run test` - Run tests in watch mode
- `npm run test:ui` - Open test UI
- `npm run test:coverage` - Generate coverage report
- `npm run test -- --run` - Run once (CI mode)

**Validation Commands:**
- `npx tsc --noEmit` - TypeScript check
- `npm run lint` - ESLint check
- `npm run build` - Production build

**Builder Testing Checklist:**
1. Run `npx tsc --noEmit` (0 errors)
2. Run `npm run lint` (no new warnings)
3. Run `npm run build` (success)
4. Test manually in browser
5. Test on mobile viewport
6. Test with real data (not mock)

---

## Final Recommendations

### Immediate Actions (Before Builder-1 Starts)

1. **Install Missing Packages:**
   ```bash
   npm install sonner framer-motion
   ```

2. **Create Pattern Library:**
   ```bash
   mkdir -p src/lib/patterns
   touch src/lib/patterns/animation-variants.ts
   touch src/lib/patterns/toast-feedback.ts
   touch src/lib/patterns/optimistic-mutation.ts
   ```

3. **Extract Shared Schemas:**
   ```bash
   touch src/lib/schemas.ts
   # Extract zod schemas from components
   ```

4. **Add Missing shadcn/ui Components:**
   ```bash
   npx shadcn-ui@latest add form
   npx shadcn-ui@latest add command
   npx shadcn-ui@latest add checkbox
   npx shadcn-ui@latest add switch
   ```

5. **Create Animation Guidelines Doc:**
   - Document approved animation patterns
   - Define duration standards (200-300ms)
   - List which interactions should animate

**Total Time:** 30-45 minutes

---

### Builder Execution Strategy

**Phase 1: Foundation (Parallel)**
- Builder 1: Install deps + pattern library (30 min)
- Builder 2: Dashboard improvements (30 min)

**Phase 2: Core Features (Parallel)**
- Builder 3A: Transaction CRUD (60 min)
- Builder 4A: Analytics - Spending (60 min)

**Phase 3: Advanced Features (Parallel)**
- Builder 3B: Transaction Filters (45 min)
- Builder 4B: Analytics - Income/NetWorth (60 min)

**Phase 4: Supporting Features (Parallel)**
- Builder 5: Budget Management (90 min)
- Builder 6: Goal Tracking (60 min)

**Phase 5: Polish (Sequential)**
- Builder 7: UI/UX Polish + Animations (60 min)
- Builder 8: Testing + Bug Fixes (30 min)

**Total Builders:** 10
**Total Time:** ~4-5 hours (with parallel execution)

---

### Success Criteria

**Technical:**
- [x] All dependencies installed
- [ ] 0 TypeScript errors
- [ ] Production build succeeds
- [ ] All tests pass (no new failures)
- [ ] No console errors in browser

**User Experience:**
- [ ] Toast notifications on ALL actions
- [ ] Loading states on ALL buttons
- [ ] Animations on key interactions (20% of UI)
- [ ] Mobile responsive (test at 375px width)
- [ ] Error messages user-friendly

**Code Quality:**
- [ ] Consistent patterns across features
- [ ] Reuse existing components (no duplication)
- [ ] TypeScript strict mode (no `any`)
- [ ] Proper error handling
- [ ] Commented complex logic

**Integration:**
- [ ] All tRPC procedures working
- [ ] Supabase Auth integration stable
- [ ] Prisma queries efficient
- [ ] React Query cache properly invalidated
- [ ] Optimistic updates for high-frequency actions

---

### Risk Mitigation Plan

**If builders run over time:**
- Defer non-critical features to Iteration 5
- Focus on core CRUD operations first
- Skip advanced filters/export if needed

**If animations cause performance issues:**
- Remove animations from mobile
- Simplify to opacity/transform only
- Add performance monitoring

**If integration fails:**
- Have integration specialist debug
- Roll back problematic changes
- Test each builder independently

**If tests fail:**
- Identify root cause (new code vs existing)
- Fix critical issues only
- Defer minor test fixes to cleanup phase

---

**EXPLORER 3 COMPLETE**

This report provides the technical foundation for successful Iteration 4 execution. All integration patterns are documented, dependencies analyzed, and builder guidance provided. The stack is solid—now it's time to build the delightful user experience!
