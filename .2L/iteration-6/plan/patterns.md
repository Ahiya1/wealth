# Code Patterns & Conventions - Iteration 6

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── layout.tsx          # MODIFY: Add OnboardingTrigger
│   │       └── settings/
│   │           └── page.tsx        # MODIFY: Add replay button
│   ├── components/
│   │   ├── onboarding/             # NEW FOLDER
│   │   │   ├── OnboardingWizard.tsx
│   │   │   ├── OnboardingStep1Welcome.tsx
│   │   │   ├── OnboardingStep2Features.tsx
│   │   │   ├── OnboardingStep3Start.tsx
│   │   │   ├── OnboardingStep4Complete.tsx
│   │   │   ├── OnboardingProgress.tsx
│   │   │   ├── OnboardingTrigger.tsx
│   │   │   └── types.ts
│   │   ├── dashboard/
│   │   │   └── DashboardSidebar.tsx  # MODIFY: Add demo badge
│   │   └── ui/
│   │       └── dialog.tsx          # EXISTING: Reuse
│   ├── server/
│   │   └── api/
│   │       └── routers/
│   │           └── users.router.ts  # NEW FILE
│   └── lib/
│       └── trpc.ts                 # MODIFY: Export users router
├── scripts/
│   ├── cleanup-user-data.ts        # NEW FILE
│   ├── create-test-user.ts         # NEW FILE
│   └── seed-demo-data.ts           # MODIFY: Enhance for 6 months
├── prisma/
│   ├── schema.prisma               # MODIFY: Add 3 User fields
│   └── migrations/                 # NEW MIGRATION
└── package.json                    # MODIFY: Add npm scripts
```

## Naming Conventions

**Components:** PascalCase
- `OnboardingWizard.tsx`
- `OnboardingStep1Welcome.tsx`
- `DashboardSidebar.tsx`

**Files:** camelCase for utilities, PascalCase for components
- `cleanup-user-data.ts` (script)
- `seed-demo-data.ts` (script)
- `users.router.ts` (router)

**Types:** PascalCase
- `OnboardingStepProps`
- `SeedOptions`
- `CleanupResult`

**Functions:** camelCase
- `handleNext()`
- `handleSkip()`
- `generateMonthlyTransactions()`

**Constants:** SCREAMING_SNAKE_CASE
- `STEPS_TOTAL = 4`
- `MONTHS_OF_HISTORY = 6`

**Database Fields:** camelCase
- `onboardingCompletedAt`
- `onboardingSkipped`
- `isDemoUser`

## Prisma Schema Patterns

### Adding Onboarding Fields to User Model

**Pattern:**
```prisma
model User {
  id             String    @id @default(cuid())
  supabaseAuthId String?   @unique
  email          String    @unique
  name           String?
  image          String?
  currency       String    @default("USD")
  timezone       String    @default("America/New_York")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // NEW: Onboarding tracking
  onboardingCompletedAt  DateTime?  @default(null)
  onboardingSkipped      Boolean    @default(false)
  isDemoUser             Boolean    @default(false)

  // Existing relations
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
}
```

**Key Points:**
- `DateTime?` is nullable (null = not completed)
- `@default(null)` explicit for clarity
- `Boolean` fields default to `false`
- Add comment blocks for organization

### Migration Pattern

**Command:**
```bash
npx prisma migrate dev --name add_onboarding_user_fields
```

**Grandfather Existing Users:**
```sql
-- In migration file or run separately
UPDATE "User"
SET "onboardingCompletedAt" = "createdAt"
WHERE "onboardingCompletedAt" IS NULL;
```

## tRPC Patterns

### Users Router (New)

**File:** `src/server/api/routers/users.router.ts`

```typescript
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

export const usersRouter = createTRPCRouter({
  // Get current user with onboarding status
  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        return null
      }

      return await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          isDemoUser: true,
          onboardingCompletedAt: true,
          onboardingSkipped: true,
          createdAt: true,
        },
      })
    }),

  // Mark onboarding as completed
  completeOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          onboardingCompletedAt: new Date(),
          onboardingSkipped: false,  // Clear skip flag if set
        },
      })
    }),

  // Mark onboarding as skipped
  skipOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          onboardingSkipped: true,
        },
      })
    }),
})
```

**Export from root router:**

**File:** `src/server/api/root.ts`

```typescript
import { usersRouter } from './routers/users.router'
// ... other imports

export const appRouter = createTRPCRouter({
  // ... existing routers
  users: usersRouter,  // ADD THIS LINE
})
```

**Key Points:**
- Use `publicProcedure` for `me` query (works when not logged in)
- Use `protectedProcedure` for mutations (requires auth)
- Return null for `me` if no userId (not logged in)
- Clear skip flag when completing onboarding

## React Component Patterns

### OnboardingWizard (Parent Container)

**File:** `src/components/onboarding/OnboardingWizard.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { OnboardingProgress } from './OnboardingProgress'
import { OnboardingStep1Welcome } from './OnboardingStep1Welcome'
import { OnboardingStep2Features } from './OnboardingStep2Features'
import { OnboardingStep3Start } from './OnboardingStep3Start'
import { OnboardingStep4Complete } from './OnboardingStep4Complete'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const utils = trpc.useUtils()

  const completeOnboarding = trpc.users.completeOnboarding.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate()
      onClose()
    },
  })

  const skipOnboarding = trpc.users.skipOnboarding.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate()
      onClose()
    },
  })

  const handleNext = () => setCurrentStep((prev) => prev + 1)
  const handleBack = () => setCurrentStep((prev) => prev - 1)
  const handleComplete = () => completeOnboarding.mutate()
  const handleSkip = () => skipOnboarding.mutate()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <OnboardingProgress currentStep={currentStep} totalSteps={4} />

        {currentStep === 1 && (
          <OnboardingStep1Welcome onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === 2 && (
          <OnboardingStep2Features onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <OnboardingStep3Start onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && (
          <OnboardingStep4Complete onComplete={handleComplete} />
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Key Points:**
- 'use client' directive (Dialog requires client interactivity)
- Local state for step progression (useState)
- tRPC mutations for persistence
- Cache invalidation after mutations
- Conditional rendering based on step
- Props drilling for handlers

### OnboardingTrigger (Dashboard Integration)

**File:** `src/components/onboarding/OnboardingTrigger.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { OnboardingWizard } from './OnboardingWizard'

export function OnboardingTrigger() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: user } = trpc.users.me.useQuery()

  useEffect(() => {
    // Show onboarding if:
    // 1. User exists (logged in)
    // 2. Has not completed onboarding
    // 3. Has not explicitly skipped
    // 4. Is not a demo user
    if (
      user &&
      !user.onboardingCompletedAt &&
      !user.onboardingSkipped &&
      !user.isDemoUser
    ) {
      setIsOpen(true)
    }
  }, [user])

  return <OnboardingWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
}
```

**Key Points:**
- Triple condition check (completed, skipped, demoUser)
- useEffect to check on user load
- Local state controls dialog visibility
- Query automatically refetches when cache invalidated

### Step Component (Example: Step 1)

**File:** `src/components/onboarding/OnboardingStep1Welcome.tsx`

```typescript
'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingStep1WelcomeProps {
  onNext: () => void
  onSkip: () => void
}

export function OnboardingStep1Welcome({
  onNext,
  onSkip,
}: OnboardingStep1WelcomeProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-gold" />
        <h2 className="text-3xl font-bold text-sage-600">Welcome to Wealth</h2>

        <div className="rounded-lg border border-sage-200 bg-gradient-to-br from-sage-50 to-warm-gray-50 p-6">
          <p className="font-serif text-xl italic leading-relaxed text-warm-gray-800">
            "Your worth is not your net worth."
          </p>
        </div>

        <div className="mx-auto max-w-md space-y-3 text-left text-warm-gray-700">
          <p>
            Wealth is about <strong>conscious money management</strong> - making
            intentional choices that align with your values.
          </p>
          <p>
            Let's take a quick tour to show you how. It takes about 2 minutes.
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} className="bg-sage-600 hover:bg-sage-700">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

**Key Points:**
- Props for navigation handlers
- Lucide icon for visual interest
- Crimson Pro font (font-serif) for affirmations
- Design tokens: sage-600, warm-gray-700, gold
- Two-button layout: Skip (ghost) and Continue (primary)

### Progress Indicator

**File:** `src/components/onboarding/OnboardingProgress.tsx`

```typescript
'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div className="mb-4 flex justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${
            i + 1 === currentStep ? 'bg-sage-600' : 'bg-warm-gray-300'
          }`}
          aria-label={`Step ${i + 1} of ${totalSteps}${
            i + 1 === currentStep ? ' (current)' : ''
          }`}
        />
      ))}
    </div>
  )
}
```

**Key Points:**
- Array.from pattern for n dots
- Active step: sage-600, inactive: warm-gray-300
- ARIA label for screen readers

### Dashboard Layout Integration

**File:** `src/app/(dashboard)/layout.tsx`

```typescript
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
// ... other imports

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ... existing auth check ...

  return (
    <div className="min-h-screen bg-warm-gray-50">
      <OnboardingTrigger />  {/* ADD THIS LINE */}
      <div className="flex">
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

**Key Points:**
- Add OnboardingTrigger as sibling to layout content
- No props needed (fetches user internally)
- Server Component layout, Client Component trigger

### Settings Page Replay

**File:** `src/app/(dashboard)/settings/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default function SettingsPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  return (
    <div className="container mx-auto p-6">
      {/* ... existing settings content ... */}

      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">Help & Support</h3>
        <Button
          variant="outline"
          onClick={() => setShowOnboarding(true)}
        >
          <Info className="mr-2 h-4 w-4" />
          Replay Product Tour
        </Button>
      </div>

      {showOnboarding && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
```

**Key Points:**
- Local state for replay trigger
- Same OnboardingWizard component
- Button in "Help & Support" section
- Conditional rendering (mount only when needed)

### Demo Mode Badge

**File:** `src/components/dashboard/DashboardSidebar.tsx`

```typescript
import { Info } from 'lucide-react'
// ... other imports

export function DashboardSidebar({ user }: { user: User }) {
  return (
    <aside className="w-64 border-r border-warm-gray-200 bg-white">
      {/* ... existing sidebar content ... */}

      {/* ADD THIS BLOCK */}
      {user.isDemoUser && (
        <div className="mx-4 mt-2 rounded-lg border border-gold/30 bg-gold/10 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-gold-700">
            <Info className="h-3 w-3" />
            Demo Mode
          </p>
          <p className="mt-1 text-xs text-warm-gray-600">
            Showing sample data
          </p>
        </div>
      )}
    </aside>
  )
}
```

**Key Points:**
- Conditional rendering based on isDemoUser flag
- Gold color scheme (matches accent color)
- Info icon for visual consistency
- Small text (text-xs) for non-intrusive display

## Script Patterns

### Cleanup Script

**File:** `scripts/cleanup-user-data.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import * as readline from 'readline/promises'

const prisma = new PrismaClient()

async function main() {
  const userIdentifier = process.argv[2]

  if (!userIdentifier) {
    console.error('Usage: npm run cleanup:user <user-id-or-email>')
    process.exit(1)
  }

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdentifier }, { email: userIdentifier }],
    },
  })

  if (!user) {
    console.error(`❌ User not found: ${userIdentifier}`)
    process.exit(1)
  }

  // Count data
  const counts = {
    accounts: await prisma.account.count({ where: { userId: user.id } }),
    transactions: await prisma.transaction.count({ where: { userId: user.id } }),
    budgets: await prisma.budget.count({ where: { userId: user.id } }),
    goals: await prisma.goal.count({ where: { userId: user.id } }),
    categories: await prisma.category.count({ where: { userId: user.id } }),
  }

  // Show summary
  console.log(`\n⚠️  WARNING: This will DELETE ALL data for user: ${user.email}`)
  console.log(`   - ${counts.accounts} accounts`)
  console.log(`   - ${counts.transactions} transactions`)
  console.log(`   - ${counts.budgets} budgets`)
  console.log(`   - ${counts.goals} goals`)
  console.log(`   - ${counts.categories} custom categories`)

  // Confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const confirmation = await rl.question('\nType "DELETE" to confirm: ')
  rl.close()

  if (confirmation !== 'DELETE') {
    console.log('❌ Cleanup cancelled')
    process.exit(0)
  }

  // Delete in transaction (all-or-nothing)
  console.log('\n🗑️  Deleting data...')

  await prisma.$transaction(async (tx) => {
    // Delete in correct order (respect foreign keys)
    await tx.transaction.deleteMany({ where: { userId: user.id } })
    await tx.budget.deleteMany({ where: { userId: user.id } })
    await tx.goal.deleteMany({ where: { userId: user.id } })
    await tx.account.deleteMany({ where: { userId: user.id } })
    await tx.category.deleteMany({ where: { userId: user.id } })

    // Reset onboarding status
    await tx.user.update({
      where: { id: user.id },
      data: {
        onboardingCompletedAt: null,
        onboardingSkipped: false,
      },
    })
  })

  console.log('✅ Cleanup complete')
  console.log('💡 User will see onboarding on next login')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

**Key Points:**
- Accept user ID or email as argument
- Count data before deletion (show summary)
- Require explicit "DELETE" confirmation
- Use transaction for atomicity
- Delete in correct order (foreign keys)
- Reset onboarding status
- Never delete User record itself

### Test User Creation Script

**File:** `scripts/create-test-user.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    console.error('\n💡 Get service role key from: supabase status')
    process.exit(1)
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🔑 Creating user in Supabase Auth...')

  // Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'test@wealth.com',
    password: 'demo1234',
    email_confirm: true,
    user_metadata: { name: 'Demo User' },
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('⚠️  User already exists in Supabase Auth')
      // Fetch existing user
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = users.find((u) => u.email === 'test@wealth.com')
      if (!existingUser) {
        console.error('❌ Could not find existing user')
        process.exit(1)
      }
      console.log('✓ Using existing auth user:', existingUser.id)
    } else {
      console.error('❌ Supabase Auth error:', authError.message)
      process.exit(1)
    }
  } else {
    console.log('✓ Auth user created:', authUser.user.id)
  }

  const supabaseAuthId = authUser?.user.id || null

  console.log('💾 Creating user in Prisma database...')

  // Create or update Prisma user
  const prismaUser = await prisma.user.upsert({
    where: { email: 'test@wealth.com' },
    update: {
      supabaseAuthId,
      isDemoUser: true,
      onboardingCompletedAt: new Date(),
    },
    create: {
      email: 'test@wealth.com',
      name: 'Demo User',
      supabaseAuthId,
      isDemoUser: true,
      onboardingCompletedAt: new Date(),
    },
  })

  console.log('✅ Demo user ready!')
  console.log('\n📧 Email: test@wealth.com')
  console.log('🔑 Password: demo1234')
  console.log('🆔 User ID:', prismaUser.id)
  console.log('\n💡 Next: Run seed script')
  console.log(`   npm run seed:demo ${prismaUser.id}`)
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

**Key Points:**
- Check environment variables first
- Admin client for Supabase Auth
- Handle "already exists" error gracefully
- Upsert pattern for Prisma user
- Pre-complete onboarding for demo user
- Output user ID for next step (seeding)

### Enhanced Seed Script (6 Months)

**File:** `scripts/seed-demo-data.ts` (enhance existing)

```typescript
import { PrismaClient } from '@prisma/client'
import { subMonths, startOfMonth, getDaysInMonth } from 'date-fns'

const prisma = new PrismaClient()

interface SeedOptions {
  userId: string
  monthsOfHistory?: number
}

async function main() {
  const userId = process.argv[2]
  const monthsOfHistory = parseInt(process.argv[3] || '6', 10)

  if (!userId) {
    console.error('Usage: npm run seed:demo <user-id> [months=6]')
    process.exit(1)
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.error('❌ User not found:', userId)
    process.exit(1)
  }

  // Check if user already has data
  const existingAccounts = await prisma.account.count({ where: { userId } })
  if (existingAccounts > 0) {
    console.warn(`⚠️  User already has ${existingAccounts} accounts`)
    console.warn('💡 Run cleanup first: npm run cleanup:user <user-id>')
    process.exit(1)
  }

  console.log(`🌱 Seeding ${monthsOfHistory} months of data for: ${user.email}`)

  await seedDemoData({ userId, monthsOfHistory })

  // Validation
  const validation = {
    accounts: await prisma.account.count({ where: { userId } }),
    transactions: await prisma.transaction.count({ where: { userId } }),
    budgets: await prisma.budget.count({ where: { userId } }),
    goals: await prisma.goal.count({ where: { userId } }),
  }

  console.log('\n📊 Data Summary:')
  console.log(`   Accounts: ${validation.accounts}`)
  console.log(`   Transactions: ${validation.transactions}`)
  console.log(`   Budgets: ${validation.budgets}`)
  console.log(`   Goals: ${validation.goals}`)
  console.log('\n✅ Seeding complete!')
}

async function seedDemoData({ userId, monthsOfHistory = 6 }: SeedOptions) {
  // Fetch default categories
  const categories = await prisma.category.findMany({
    where: { userId: null },
  })

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.name, c.id])
  )

  // Create accounts
  console.log('Creating accounts...')
  const accounts = await prisma.$transaction([
    prisma.account.create({
      data: {
        userId,
        name: 'Chase Checking',
        type: 'checking',
        currentBalance: 0,  // Will update after transactions
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'High Yield Savings',
        type: 'savings',
        currentBalance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Chase Sapphire Reserve',
        type: 'credit',
        currentBalance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Vanguard 401k',
        type: 'investment',
        currentBalance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Robinhood',
        type: 'investment',
        currentBalance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Emergency Fund',
        type: 'savings',
        currentBalance: 0,
        isManual: true,
      },
    }),
  ])

  const [checking, savings, credit, retirement, investing, emergency] = accounts

  // Generate transactions for each month
  console.log(`Generating ${monthsOfHistory} months of transactions...`)

  const allTransactions = []
  const today = new Date()

  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = subMonths(startOfMonth(today), monthOffset)
    const daysInMonth = getDaysInMonth(monthDate)

    // Income: Bi-weekly salary (15th and last day)
    const salaryDates = [15, daysInMonth]

    for (const day of salaryDates) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
      allTransactions.push({
        userId,
        accountId: checking.id,
        categoryId: categoryMap['Salary'] || '',
        date,
        amount: 3500.0,
        payee: 'Employer Direct Deposit',
        notes: 'Bi-weekly salary',
        tags: [],
        isManual: true,
      })
    }

    // Monthly rent (1st of month)
    allTransactions.push({
      userId,
      accountId: checking.id,
      categoryId: categoryMap['Housing'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      amount: -1200.0,
      payee: 'Landlord',
      notes: 'Monthly rent',
      tags: [],
      isManual: true,
    })

    // Generate 60-70 expense transactions per month
    const expenseCount = 60 + Math.floor(Math.random() * 10)

    for (let i = 0; i < expenseCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)

      // Random expense category
      const expenseCategories = [
        { category: 'Groceries', payees: ['Trader Joes', 'Whole Foods', 'Safeway'], range: [30, 80] },
        { category: 'Dining', payees: ['Chipotle', 'Starbucks', 'Local Cafe'], range: [15, 50] },
        { category: 'Transportation', payees: ['Shell Gas', 'Uber', 'Lyft'], range: [20, 60] },
        { category: 'Shopping', payees: ['Amazon', 'Target', 'Nordstrom'], range: [25, 150] },
        { category: 'Utilities', payees: ['PG&E', 'Comcast', 'AT&T'], range: [50, 200] },
        { category: 'Entertainment', payees: ['Netflix', 'Spotify', 'AMC Theaters'], range: [10, 80] },
      ]

      const expense = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      const payee = expense.payees[Math.floor(Math.random() * expense.payees.length)]
      const [min, max] = expense.range
      const amount = -(min + Math.random() * (max - min))

      allTransactions.push({
        userId,
        accountId: Math.random() > 0.3 ? credit.id : checking.id,  // 70% credit, 30% checking
        categoryId: categoryMap[expense.category] || '',
        date,
        amount: Math.round(amount * 100) / 100,
        payee,
        notes: '',
        tags: [],
        isManual: true,
      })
    }

    // Monthly savings transfer (5th of month)
    allTransactions.push({
      userId,
      accountId: checking.id,
      categoryId: categoryMap['Transfer'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      amount: -500.0,
      payee: 'Savings Transfer',
      notes: 'Monthly savings goal',
      tags: [],
      isManual: true,
    })

    allTransactions.push({
      userId,
      accountId: savings.id,
      categoryId: categoryMap['Transfer'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      amount: 500.0,
      payee: 'From Checking',
      notes: 'Monthly savings goal',
      tags: [],
      isManual: true,
    })
  }

  // Insert all transactions
  console.log(`Inserting ${allTransactions.length} transactions...`)
  await prisma.transaction.createMany({ data: allTransactions })

  // Calculate final account balances
  console.log('Calculating account balances...')
  for (const account of accounts) {
    const sum = await prisma.transaction.aggregate({
      where: { accountId: account.id },
      _sum: { amount: true },
    })

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: sum._sum.amount || 0 },
    })
  }

  // Create budgets for all months
  console.log('Creating budgets...')
  const budgetCategories = [
    { category: 'Groceries', amount: 500 },
    { category: 'Dining', amount: 300 },
    { category: 'Transportation', amount: 200 },
    { category: 'Shopping', amount: 200 },
    { category: 'Housing', amount: 1200 },
    { category: 'Utilities', amount: 150 },
  ]

  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = subMonths(startOfMonth(today), monthOffset)
    const monthString = monthDate.toISOString().slice(0, 7)

    for (const { category, amount } of budgetCategories) {
      await prisma.budget.upsert({
        where: {
          userId_categoryId_month: {
            userId,
            categoryId: categoryMap[category] || '',
            month: monthString,
          },
        },
        create: {
          userId,
          categoryId: categoryMap[category] || '',
          month: monthString,
          amount,
          rollover: Math.random() > 0.5,
        },
        update: {},
      })
    }
  }

  // Create goals
  console.log('Creating goals...')
  await prisma.goal.createMany({
    data: [
      {
        userId,
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 5300,
        targetDate: new Date('2025-12-31'),
        accountId: emergency.id,
      },
      {
        userId,
        name: 'Vacation Fund',
        targetAmount: 3000,
        currentAmount: 2500,
        targetDate: new Date('2025-08-01'),
      },
      {
        userId,
        name: 'New Laptop',
        targetAmount: 2000,
        currentAmount: 1600,
        targetDate: new Date('2025-06-01'),
      },
      {
        userId,
        name: 'Down Payment',
        targetAmount: 50000,
        currentAmount: 10000,
        targetDate: new Date('2027-01-01'),
      },
    ],
  })
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

**Key Points:**
- Check user exists and has no existing data
- Generate 6 months by default (configurable)
- Bi-weekly salary pattern (realistic)
- Monthly rent and bills (recurring)
- 60-70 random expenses per month (volume)
- Use date-fns for reliable date math
- Calculate account balances from transactions
- Create budgets for all months
- Upsert pattern for budgets (rerunnable)
- Validation output at end

## Import Order Convention

```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Next.js imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 3. External libraries (alphabetical)
import { Sparkles, Info } from 'lucide-react'
import { subMonths, startOfMonth } from 'date-fns'

// 4. Internal utilities
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// 5. Components (UI first, then feature)
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { OnboardingProgress } from './OnboardingProgress'

// 6. Types
import type { User } from '@prisma/client'
```

## TypeScript Type Patterns

### Component Props

```typescript
interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

interface OnboardingStepProps {
  onNext?: () => void
  onBack?: () => void
  onSkip?: () => void
  onComplete?: () => void
}
```

### Script Types

```typescript
interface SeedOptions {
  userId: string
  monthsOfHistory?: number
}

interface CleanupCounts {
  accounts: number
  transactions: number
  budgets: number
  goals: number
  categories: number
}
```

## Error Handling Patterns

### tRPC Mutations

```typescript
const completeOnboarding = trpc.users.completeOnboarding.useMutation({
  onSuccess: () => {
    utils.users.me.invalidate()
    onClose()
  },
  onError: (error) => {
    console.error('Failed to complete onboarding:', error)
    // Could show toast notification here
  },
})
```

### Scripts

```typescript
main()
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

## Testing Patterns

### Manual Validation Query

```bash
# Check user onboarding status
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'test@wealth.com' },
  select: { isDemoUser: true, onboardingCompletedAt: true, onboardingSkipped: true }
}).then(console.log).finally(() => prisma.\$disconnect());
"

# Count user data
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'test@wealth.com' },
  include: { _count: { select: { accounts: true, transactions: true, budgets: true, goals: true } } }
}).then(console.log).finally(() => prisma.\$disconnect());
"
```

## Package.json Scripts

```json
{
  "scripts": {
    "cleanup:user": "tsx scripts/cleanup-user-data.ts",
    "seed:demo": "tsx scripts/seed-demo-data.ts",
    "create:test-user": "tsx scripts/create-test-user.ts",
    "setup:demo": "npm run create:test-user",
    "reset:user": "npm run cleanup:user"
  }
}
```

## Accessibility Patterns

### ARIA Labels

```typescript
<div
  className="h-2 w-2 rounded-full bg-sage-600"
  role="status"
  aria-label="Step 1 of 4 (current)"
/>
```

### Keyboard Navigation

```typescript
// Dialog automatically handles:
// - Escape key to close
// - Focus trap (Tab stays within dialog)
// - Focus return (returns to trigger on close)

// Ensure buttons are keyboard accessible
<Button onClick={handleNext}>
  Continue
</Button>
```
