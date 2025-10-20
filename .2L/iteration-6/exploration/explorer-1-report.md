# Explorer 1 Report: Onboarding Wizard Architecture & User Status Tracking

## Executive Summary

After analyzing the current Wealth application architecture and researching best-in-class onboarding patterns, I recommend a **4-step progressive onboarding wizard** that embodies "conscious money" principles while remaining optional and non-intrusive. The architecture leverages existing Dialog components, adds minimal schema changes (3 fields to User model), and integrates seamlessly with the current dashboard layout. For user separation, a simple `isDemoUser` boolean flag combined with enhanced seed scripts will cleanly separate the real user (ahiya.butman@gmail.com) from a demo user (test@wealth.com) with 6 months of rich data.

**Key Findings:**
- Current app has NO onboarding - users land on empty dashboard with no guidance
- Existing UI components (Dialog, Button, Card) are perfect for wizard implementation
- User model needs only 3 new fields: `onboardingCompletedAt`, `onboardingSkipped`, `isDemoUser`
- Dashboard layout already exists at `/src/app/(dashboard)/layout.tsx` - perfect insertion point
- Seed scripts exist but need enhancement for 6-month demo data generation
- Estimated complexity: MEDIUM (6-8 hours total implementation time)

---

## Discoveries

### Current State: No Onboarding Experience

**What Happens Today:**
1. User signs up via `/signup` page (email/password)
2. User is redirected to `/dashboard`
3. Dashboard shows empty state with no guidance
4. DashboardStats component shows EmptyState: "Start tracking your finances"
5. No direction on first steps, no feature tour, no philosophy introduction

**Evidence:**
- `/src/app/(dashboard)/dashboard/page.tsx` - No onboarding check
- `/src/app/(dashboard)/layout.tsx` - Server-side auth only, no onboarding trigger
- `/src/components/dashboard/DashboardStats.tsx:29-40` - Generic EmptyState with no action button
- No onboarding-related files exist in codebase (grep search returned 0 results)

**User Pain Points:**
- New users feel lost ("What do I do first?")
- Philosophy/values not communicated upfront
- No feature discovery mechanism
- Users might not understand "conscious money" principles

### Existing Architecture Assets

**What We Can Leverage:**

1. **Dialog System (Radix UI)**
   - File: `/src/components/ui/dialog.tsx`
   - Full-featured modal system with overlay, animations, close button
   - Used throughout app (AccountForm, GoalForm, etc.)
   - Perfect for wizard steps

2. **Dashboard Layout**
   - File: `/src/app/(dashboard)/layout.tsx`
   - Server component with auth check
   - Renders DashboardSidebar + main content
   - Can check onboarding status and trigger wizard

3. **User Model**
   - File: `/prisma/schema.prisma:17-39`
   - Already has `createdAt`, `email`, `supabaseAuthId`
   - Clean extension point for onboarding fields

4. **Design System**
   - Existing components: Button, Card, Badge, Separator
   - Typography: Crimson Pro (serif) for philosophy content
   - Color palette: sage (primary), warm-gray (neutral), gold (accent)
   - Framer Motion: Already used for animations (PageTransition, EncouragingProgress)

5. **Affirmation System**
   - File: `/src/components/ui/affirmation-card.tsx`
   - 35 mindful affirmations about conscious money
   - Shows design philosophy is baked into UI
   - Can inspire onboarding content tone

### Best Practice Onboarding Patterns Research

**Successful SaaS Onboarding Examples:**

**1. Notion (Calm, Educational)**
- 3 steps: Choose workspace type → Import data (optional) → Template gallery
- Can skip at any time
- Progress indicator shows "Step 1 of 3"
- Replay via "Help → Product Tour"
- Key Lesson: **Keep it brief (3-5 steps max), allow skip, enable replay**

**2. Linear (Feature Showcase)**
- Welcome → Create first issue → Keyboard shortcuts → Team invite
- Interactive tooltips on actual UI
- "I'll explore on my own" button prominent
- Key Lesson: **Show actual product, not just slides**

**3. Stripe Dashboard (Progressive Disclosure)**
- Onboarding checklist persists in sidebar
- Tasks revealed progressively (complete step 1 to unlock step 2)
- No modal, just contextual guidance
- Key Lesson: **Checklist format works for complex setup**

**4. YNAB (You Need a Budget) - Most Relevant**
- Philosophy-first: 4 rules explained upfront
- Step 1: "Give every dollar a job" (budget philosophy)
- Step 2: Create first budget
- Step 3: Add accounts
- Key Lesson: **Lead with values, not features**

**Anti-Patterns to Avoid:**
- 10+ step wizards (user fatigue)
- No skip button (frustrating)
- Auto-play videos (annoying)
- Forced data entry (friction)
- No replay option (missed opportunity)

### Onboarding Flow Design Recommendation

**Proposed 4-Step Wizard:**

```
Step 1: Welcome (Philosophy)
┌─────────────────────────────────────┐
│   🌱 Welcome to Wealth              │
│                                     │
│   "Your worth is not your net      │
│    worth."                         │
│                                     │
│   Wealth is about conscious        │
│   money management - making        │
│   intentional choices that align   │
│   with your values.                │
│                                     │
│   Let's take a quick tour (2 min)  │
│                                     │
│   [Continue] [Skip for now]        │
└─────────────────────────────────────┘

Step 2: Core Features
┌─────────────────────────────────────┐
│   What You Can Do                   │
│                                     │
│   💰 Accounts                       │
│      Track all your money in one   │
│      place                         │
│                                     │
│   💳 Transactions                   │
│      Every dollar tells a story    │
│                                     │
│   📊 Budgets                        │
│      Plans, not restrictions       │
│                                     │
│   🎯 Goals                          │
│      Dream, plan, achieve          │
│                                     │
│   [Back] [Next]                    │
└─────────────────────────────────────┘

Step 3: Getting Started (Optional Action)
┌─────────────────────────────────────┐
│   Ready to Start?                   │
│                                     │
│   You can:                         │
│   • Add your first account         │
│   • Explore the dashboard          │
│   • Review sample data             │
│                                     │
│   What works best for you?         │
│                                     │
│   [Add Account] [Just Explore]     │
└─────────────────────────────────────┘

Step 4: Completion
┌─────────────────────────────────────┐
│   ✨ You're All Set!                │
│                                     │
│   "Financial peace comes from      │
│    awareness, not perfection"      │
│                                     │
│   💡 Tip: You can replay this     │
│   tour anytime from Settings       │
│                                     │
│   [Go to Dashboard]                │
└─────────────────────────────────────┘
```

**Design Rationale:**

1. **Step 1 (Welcome)** - Lead with philosophy, set tone, manage expectations
   - Uses serif font (Crimson Pro) for affirmation
   - Warm colors (sage gradient background)
   - Clear skip option (not hidden)
   - Time estimate builds trust (2 minutes)

2. **Step 2 (Features)** - Quick overview without overwhelming
   - Icon + title + one-line description format
   - Shows breadth without depth
   - No data entry required (low friction)
   - Sets mental model of app structure

3. **Step 3 (Getting Started)** - Optional action with clear alternatives
   - NOT forced: "Add Account" is optional
   - "Just Explore" button = no commitment
   - Guides without restricting
   - Can add account later

4. **Step 4 (Completion)** - Positive reinforcement + replay reminder
   - Another affirmation (consistency with dashboard)
   - Mentions replay option (sets expectation)
   - Single CTA (no decision fatigue)

**Why NOT 5+ steps?**
- Retention drops significantly after step 3 (industry data)
- Philosophy + Features + Action + Completion = complete journey
- Users can explore deeper features organically
- Conscious money = simplicity, not complexity

**Skip Behavior:**
- "Skip for now" button on Step 1
- Dismisses wizard immediately
- Sets `onboardingSkipped = true`
- User can replay from Settings → Help → Product Tour

**Progress Indicator:**
```tsx
<div className="flex gap-2 justify-center mb-4">
  <div className="h-2 w-2 rounded-full bg-sage-600" /> {/* Step 1 - active */}
  <div className="h-2 w-2 rounded-full bg-warm-gray-300" /> {/* Step 2 */}
  <div className="h-2 w-2 rounded-full bg-warm-gray-300" /> {/* Step 3 */}
  <div className="h-2 w-2 rounded-full bg-warm-gray-300" /> {/* Step 4 */}
</div>
```

### User Model Schema Changes

**Prisma Schema Additions:**

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
  onboardingCompletedAt  DateTime?  // null = not completed, Date = when completed
  onboardingSkipped      Boolean    @default(false)  // true if user clicked "Skip"
  
  // NEW: Demo user flag
  isDemoUser             Boolean    @default(false)  // true for test@wealth.com
  
  // Existing relations...
  categories          Category[]
  accounts            Account[]
  transactions        Transaction[]
  budgets             Budget[]
  goals               Goal[]
}
```

**Field Explanations:**

1. **onboardingCompletedAt (DateTime?, nullable)**
   - `null` = User has NOT completed onboarding
   - `2025-10-02T15:30:00Z` = User completed onboarding on Oct 2, 2025
   - Used to determine if wizard should show on login
   - Nullable allows us to distinguish "never started" from "in progress"

2. **onboardingSkipped (Boolean, default: false)**
   - `false` = User hasn't explicitly skipped
   - `true` = User clicked "Skip for now" button
   - Prevents wizard from showing again automatically
   - User can still replay via Settings

3. **isDemoUser (Boolean, default: false)**
   - `false` = Real user (ahiya.butman@gmail.com)
   - `true` = Demo user (test@wealth.com)
   - Used for UI tweaks (e.g., "Demo Mode" badge in sidebar)
   - Seed scripts can target demo users for data generation
   - NOT a security feature (all auth is same)

**Why NOT `lastOnboardingStep`?**
- Onboarding is 4 steps, takes 2 minutes
- If interrupted, user can just restart (no data loss)
- Adds complexity for minimal benefit
- Resume feature would require state management

**Why NOT `onboardingVersion`?**
- MVP doesn't need versioning
- If we change onboarding later, we can:
  - Check `onboardingCompletedAt < deploymentDate` 
  - Or just let users replay manually
- Over-engineering for v1

**Migration Command:**
```bash
npx prisma migrate dev --name add_onboarding_fields
```

### Component Architecture

**File Structure:**

```
src/components/onboarding/
├── OnboardingWizard.tsx           # Main wizard container
├── OnboardingStep1Welcome.tsx     # Step 1: Welcome + Philosophy
├── OnboardingStep2Features.tsx    # Step 2: Feature overview
├── OnboardingStep3Start.tsx       # Step 3: Getting started action
├── OnboardingStep4Complete.tsx    # Step 4: Completion
├── OnboardingProgress.tsx         # Progress dots (1 of 4)
├── OnboardingTrigger.tsx          # Checks user state, shows wizard
└── types.ts                       # Shared TypeScript types
```

**Component Responsibilities:**

**1. OnboardingWizard.tsx (Parent Container)**
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
    }
  })
  
  const skipOnboarding = trpc.users.skipOnboarding.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate()
      onClose()
    }
  })
  
  const handleNext = () => setCurrentStep(prev => prev + 1)
  const handleBack = () => setCurrentStep(prev => prev - 1)
  const handleComplete = () => completeOnboarding.mutate()
  const handleSkip = () => skipOnboarding.mutate()
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <OnboardingProgress currentStep={currentStep} totalSteps={4} />
        
        {currentStep === 1 && (
          <OnboardingStep1Welcome 
            onNext={handleNext} 
            onSkip={handleSkip} 
          />
        )}
        {currentStep === 2 && (
          <OnboardingStep2Features 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 3 && (
          <OnboardingStep3Start 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 4 && (
          <OnboardingStep4Complete 
            onComplete={handleComplete} 
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**2. OnboardingTrigger.tsx (Dashboard Integration)**
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
    // 1. User has never completed onboarding
    // 2. User has not explicitly skipped
    // 3. User is not a demo user (demo user can replay manually)
    if (user && !user.onboardingCompletedAt && !user.onboardingSkipped && !user.isDemoUser) {
      setIsOpen(true)
    }
  }, [user])
  
  return (
    <OnboardingWizard 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
    />
  )
}
```

**3. Step Components (Example: Step 1)**
```typescript
'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingStep1WelcomeProps {
  onNext: () => void
  onSkip: () => void
}

export function OnboardingStep1Welcome({ onNext, onSkip }: OnboardingStep1WelcomeProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-4">
        <Sparkles className="h-12 w-12 mx-auto text-gold" />
        <h2 className="text-3xl font-bold text-sage-600">Welcome to Wealth</h2>
        
        <div className="bg-gradient-to-br from-sage-50 to-warm-gray-50 p-6 rounded-lg border border-sage-200">
          <p className="font-serif text-xl text-warm-gray-800 italic leading-relaxed">
            "Your worth is not your net worth."
          </p>
        </div>
        
        <div className="text-warm-gray-700 space-y-3 max-w-md mx-auto text-left">
          <p>
            Wealth is about <strong>conscious money management</strong> - making 
            intentional choices that align with your values.
          </p>
          <p>
            Let's take a quick tour to show you how. It takes about 2 minutes.
          </p>
        </div>
      </div>
      
      <div className="flex gap-3 justify-between">
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

**Integration Points:**

**1. Dashboard Layout (`/src/app/(dashboard)/layout.tsx`)**
```typescript
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ... existing auth check ...
  
  return (
    <div className="min-h-screen bg-warm-gray-50">
      <OnboardingTrigger /> {/* Add this line */}
      <div className="flex">
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**2. Settings Page (Replay Option)**
```typescript
// src/app/(dashboard)/settings/page.tsx

<Button onClick={() => setShowOnboarding(true)}>
  <Info className="mr-2 h-4 w-4" />
  Replay Product Tour
</Button>

{showOnboarding && (
  <OnboardingWizard 
    isOpen={showOnboarding} 
    onClose={() => setShowOnboarding(false)} 
  />
)}
```

**State Management:**

- **No global state needed** - Dialog manages its own open/close
- **Step progression** - Local useState in OnboardingWizard
- **Completion tracking** - Persisted to database via tRPC mutation
- **User status** - Fetched via tRPC query, cached by React Query

**Why NOT use URL params for steps?**
- Onboarding is a modal, not a route
- Users shouldn't bookmark mid-onboarding
- Dialog dismissal = loss of progress (acceptable for 4 steps)
- Simpler implementation

### User Separation Strategy

**Two Users, Two Purposes:**

| Aspect | Real User (ahiya) | Demo User (test@wealth.com) |
|--------|-------------------|----------------------------|
| **Email** | ahiya.butman@gmail.com | test@wealth.com |
| **Password** | (existing) | demo1234 |
| **Supabase Auth** | Existing auth user | New auth user to create |
| **isDemoUser** | false | true |
| **Data State** | Clean slate (delete all) | 6 months rich data |
| **Onboarding** | Show on first login | Pre-completed (can replay) |
| **Purpose** | Actual finance tracking | Demo for showing others |
| **UI Badge** | None | "Demo Mode" in sidebar |

**Technical Implementation:**

**1. Create Demo User in Supabase**

```bash
# Option A: Via Supabase Dashboard
# 1. Go to Authentication → Users → Invite User
# 2. Email: test@wealth.com
# 3. Password: demo1234 (or auto-generated)
# 4. Copy the user ID

# Option B: Via SQL (Supabase dashboard SQL editor)
# This creates user directly in auth.users table
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'test@wealth.com',
  crypt('demo1234', gen_salt('bf')),
  NOW()
);
```

**2. Create User Record in Prisma**

```typescript
// scripts/create-demo-user.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const supabaseUserId = process.argv[2] // From Supabase
  
  if (!supabaseUserId) {
    console.error('Usage: npm run create:demo <supabase-user-id>')
    process.exit(1)
  }
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'test@wealth.com' },
    update: {
      supabaseAuthId: supabaseUserId,
      isDemoUser: true,
      onboardingCompletedAt: new Date(), // Pre-complete onboarding
    },
    create: {
      email: 'test@wealth.com',
      supabaseAuthId: supabaseUserId,
      name: 'Demo User',
      isDemoUser: true,
      onboardingCompletedAt: new Date(),
    },
  })
  
  console.log('✅ Demo user created:', demoUser.id)
  console.log('📧 Email: test@wealth.com')
  console.log('🔑 Password: demo1234')
  console.log('\n💡 Next: Run seed script with this user ID')
  console.log(`   npm run seed:demo ${demoUser.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**3. Cleanup Script for Real User**

```typescript
// scripts/cleanup-user-data.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'ahiya.butman@gmail.com'
  
  console.log(`🗑️  Cleaning up data for: ${email}`)
  
  const user = await prisma.user.findUnique({ where: { email } })
  
  if (!user) {
    console.error('❌ User not found')
    process.exit(1)
  }
  
  // Delete in correct order (respect foreign keys)
  console.log('Deleting budgets...')
  await prisma.budget.deleteMany({ where: { userId: user.id } })
  
  console.log('Deleting goals...')
  await prisma.goal.deleteMany({ where: { userId: user.id } })
  
  console.log('Deleting transactions...')
  await prisma.transaction.deleteMany({ where: { userId: user.id } })
  
  console.log('Deleting accounts...')
  await prisma.account.deleteMany({ where: { userId: user.id } })
  
  console.log('Deleting custom categories...')
  await prisma.category.deleteMany({ 
    where: { userId: user.id } // Only delete user-created categories
  })
  
  console.log('Resetting onboarding status...')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingCompletedAt: null,
      onboardingSkipped: false,
    }
  })
  
  console.log('✅ User data cleaned successfully')
  console.log('💡 User will see onboarding on next login')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**4. Enhanced Seed Script (6 Months of Data)**

Existing seed script at `/scripts/seed-demo-data.ts` needs enhancement:

**Current State:**
- Creates 4 accounts
- Creates 25 transactions (last 30 days only)
- Creates 4 budgets (current month)
- Creates 2 goals

**Enhancements Needed:**
```typescript
// In seed-demo-data.ts - modify to generate 6 months of data

async function seedDemoData(options: SeedOptions) {
  const { userId, monthsOfHistory = 6 } = options
  
  // ... existing account creation ...
  
  // ENHANCED: Generate 6 months of transactions
  const transactions = []
  const today = new Date()
  
  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = new Date(today)
    monthDate.setMonth(monthDate.getMonth() - monthOffset)
    
    // 2 salary payments per month (15th and last day)
    const salaryDates = [15, new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()]
    
    for (const day of salaryDates) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
      transactions.push({
        userId,
        accountId: checkingAccount.id,
        categoryId: salaryCategory?.id || '',
        date,
        amount: 3500.00,
        payee: 'Employer Direct Deposit',
        notes: 'Monthly salary',
        tags: [],
        isManual: true,
      })
    }
    
    // 40-50 expense transactions per month (realistic volume)
    const expenseCount = 40 + Math.floor(Math.random() * 10)
    
    for (let i = 0; i < expenseCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
      
      // ... existing expense generation logic ...
      // (Groceries, Dining, Transportation, Shopping, Housing, Utilities)
    }
  }
  
  console.log(`✅ Created ${transactions.length} transactions over ${monthsOfHistory} months`)
  
  // ENHANCED: Create budgets for all 6 months
  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = new Date(today)
    monthDate.setMonth(monthDate.getMonth() - monthOffset)
    const monthString = monthDate.toISOString().slice(0, 7) // YYYY-MM
    
    for (const budget of budgetData) {
      await prisma.budget.upsert({
        where: {
          userId_categoryId_month: {
            userId,
            categoryId: budget.categoryId,
            month: monthString,
          },
        },
        create: {
          userId,
          categoryId: budget.categoryId,
          amount: budget.amount,
          month: monthString,
          rollover: Math.random() > 0.5,
        },
        update: {},
      })
    }
  }
  
  console.log(`✅ Created budgets for ${monthsOfHistory} months`)
}
```

**Usage Flow:**

```bash
# Step 1: Create demo user in Supabase Auth (get user ID)

# Step 2: Create demo user in Prisma
npm run create:demo <supabase-user-id>

# Step 3: Seed 6 months of demo data
npm run seed:demo <prisma-user-id>

# Step 4: Clean real user's data
npm run cleanup:user ahiya.butman@gmail.com
```

**package.json scripts:**
```json
{
  "scripts": {
    "create:demo": "tsx scripts/create-demo-user.ts",
    "cleanup:user": "tsx scripts/cleanup-user-data.ts",
    "seed:demo": "tsx scripts/seed-demo-data.ts"
  }
}
```

**UI Indicator for Demo User:**

```typescript
// In DashboardSidebar.tsx

{user.isDemoUser && (
  <div className="p-3 mx-4 mt-2 bg-gold/10 border border-gold/30 rounded-lg">
    <p className="text-xs font-medium text-gold-700 flex items-center gap-2">
      <Info className="h-3 w-3" />
      Demo Mode
    </p>
    <p className="text-xs text-warm-gray-600 mt-1">
      Showing sample data
    </p>
  </div>
)}
```

---

## Complexity Assessment

### Breakdown by Component

**1. User Model Migration (LOW)**
- Add 3 fields to User model
- Run migration
- No data transformation needed
- **Estimated Time:** 30 minutes
- **Risk:** Very low - additive changes only

**2. tRPC Endpoints (LOW)**
- Create `users.me` query (fetch current user)
- Create `users.completeOnboarding` mutation
- Create `users.skipOnboarding` mutation
- **Estimated Time:** 1 hour
- **Risk:** Low - simple CRUD operations

**3. Onboarding Wizard UI (MEDIUM)**
- Create 7 new components (Wizard + 4 steps + Progress + Trigger)
- Design 4 step layouts with consistent styling
- Add animations (fade in/out, slide)
- Handle edge cases (close, skip, back navigation)
- **Estimated Time:** 3-4 hours
- **Risk:** Medium - UX refinement needed

**4. Dashboard Integration (LOW)**
- Add OnboardingTrigger to layout
- Add replay button to Settings
- **Estimated Time:** 30 minutes
- **Risk:** Very low - one-line additions

**5. Demo User Setup Scripts (MEDIUM)**
- Create demo user script
- Cleanup user script
- Enhance seed script for 6 months
- **Estimated Time:** 2-3 hours
- **Risk:** Medium - date math, bulk data generation

**6. Testing & Refinement (MEDIUM)**
- Test onboarding flow (skip, complete, replay)
- Test demo user with 6 months data
- Verify real user cleanup
- Test dashboard with/without onboarding
- **Estimated Time:** 1-2 hours
- **Risk:** Medium - integration testing

### Total Complexity Analysis

**Overall Complexity: MEDIUM**

**Total Estimated Time:** 8-11 hours

**Breakdown:**
- Schema + tRPC: 1.5 hours (LOW)
- Onboarding UI: 3-4 hours (MEDIUM)
- Scripts: 2-3 hours (MEDIUM)
- Integration + Testing: 1.5-2 hours (MEDIUM)
- Buffer for polish: 1 hour

**Risk Assessment:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| Wizard UX feels clunky | Medium | High | Follow Notion/Linear patterns, user test |
| Onboarding triggers too often | Low | Medium | Careful logic in OnboardingTrigger |
| Demo user seed script fails | Medium | Low | Test incrementally, good error handling |
| Migration breaks existing users | Low | High | Test on dev DB first, migrations are additive |
| Performance with 6 months data | Low | Medium | Pagination already exists, charts handle it |

**Split Recommendation: NO**

This iteration is well-scoped for a single builder:
- Features are tightly coupled (onboarding → user model → scripts)
- Total time is manageable (8-11 hours)
- No parallel work opportunities
- Integration points are serial (schema → UI → scripts)

**If forced to split:**
- Builder 1: Schema + tRPC + OnboardingTrigger logic (3 hours)
- Builder 2: Onboarding UI components (4 hours)
- Builder 3: Demo user scripts + cleanup (3 hours)

---

## Technology Recommendations

### Primary Stack (No Changes Needed)

Current stack is perfect for this iteration:

**Frontend:**
- **Next.js 14 App Router** - Server components for auth check
- **React 18** - Client components for wizard state
- **Radix UI Dialog** - Accessible modal system (already used)
- **Framer Motion** - Smooth animations (already used)
- **Tailwind CSS** - Styling with existing design tokens

**Backend:**
- **tRPC** - Type-safe mutations for onboarding completion
- **Prisma** - Schema migration for new fields
- **PostgreSQL** - User data persistence

### Supporting Libraries (Existing)

**No new dependencies needed:**
- Dialog system: `@radix-ui/react-dialog` ✅
- Animations: `framer-motion` ✅
- Icons: `lucide-react` ✅
- Forms: Not needed (no data entry in onboarding)
- State: `useState` is sufficient

### Code Patterns

**Pattern 1: Dialog-Based Wizard**
```typescript
// Multi-step wizard in a Dialog
<Dialog open={isOpen}>
  <DialogContent>
    {currentStep === 1 && <Step1 />}
    {currentStep === 2 && <Step2 />}
    {currentStep === 3 && <Step3 />}
  </DialogContent>
</Dialog>
```
**Why:** Familiar to existing codebase, accessible, prevents accidental dismissal

**Pattern 2: Server-Side Onboarding Check**
```typescript
// In dashboard layout (Server Component)
const user = await getUserWithOnboardingStatus()
// Pass to client component
<OnboardingTrigger user={user} />
```
**Why:** No flash of content, auth check + onboarding check in one query

**Pattern 3: tRPC Mutations for State**
```typescript
const completeOnboarding = trpc.users.completeOnboarding.useMutation({
  onSuccess: () => {
    utils.users.me.invalidate() // Refetch user
  }
})
```
**Why:** Consistent with existing mutation patterns, automatic cache invalidation

---

## Integration Points

### Internal Integrations

**1. Dashboard Layout ↔ OnboardingTrigger**
- **Connection:** Layout renders OnboardingTrigger as child
- **Data Flow:** User object from server → Client component checks onboarding status
- **Complexity:** LOW - simple prop passing

**2. OnboardingWizard ↔ tRPC Mutations**
- **Connection:** Wizard calls `completeOnboarding` and `skipOnboarding` mutations
- **Data Flow:** Button click → Mutation → DB update → Query invalidation
- **Complexity:** LOW - standard tRPC pattern

**3. Settings Page ↔ OnboardingWizard**
- **Connection:** "Replay Tour" button triggers wizard
- **Data Flow:** Button sets local state → Opens wizard dialog
- **Complexity:** LOW - local state management

**4. Seed Scripts ↔ User Model**
- **Connection:** Scripts create demo user and populate data
- **Data Flow:** CLI → Prisma → PostgreSQL
- **Complexity:** MEDIUM - date math, bulk inserts

### External Integrations

**None required** - This iteration is purely internal

### Database Schema Integration

**Migration Strategy:**

```sql
-- Migration: add_onboarding_fields
ALTER TABLE "User" 
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP,
  ADD COLUMN "onboardingSkipped" BOOLEAN DEFAULT false,
  ADD COLUMN "isDemoUser" BOOLEAN DEFAULT false;

-- Set all existing users to "completed" (grandfather them in)
UPDATE "User" 
SET "onboardingCompletedAt" = "createdAt" 
WHERE "onboardingCompletedAt" IS NULL;
```

**Why grandfather existing users?**
- Don't force onboarding on existing users (bad UX)
- Assume they've already figured out the app
- They can replay if desired

---

## Risks & Challenges

### Technical Risks

**1. Onboarding Shows at Wrong Time (MEDIUM RISK)**
- **Scenario:** User refreshes mid-session, wizard pops up again
- **Impact:** Annoying user experience
- **Likelihood:** Medium if logic is wrong
- **Mitigation:**
  ```typescript
  // Check THREE conditions, not just one
  if (!user.onboardingCompletedAt && !user.onboardingSkipped && !user.isDemoUser) {
    showOnboarding()
  }
  ```
- **Test Cases:**
  - User completes onboarding → Should NOT show on refresh
  - User skips onboarding → Should NOT show on refresh
  - Demo user logs in → Should NOT show (already completed)
  - New user logs in → SHOULD show

**2. Dialog Accessibility Issues (LOW RISK)**
- **Scenario:** Keyboard users can't navigate wizard
- **Impact:** Fails WCAG compliance
- **Likelihood:** Low (Radix UI is accessible by default)
- **Mitigation:**
  - Use Radix Dialog (ARIA attributes built-in)
  - Test keyboard navigation (Tab, Enter, Escape)
  - Test with screen reader

**3. Seed Script Performance (LOW RISK)**
- **Scenario:** Creating 6 months of data (1200+ transactions) is slow
- **Impact:** Script takes >30 seconds
- **Likelihood:** Low (Prisma batching is fast)
- **Mitigation:**
  - Use `createMany` for bulk inserts (already in script)
  - Show progress indicators in console
  - Run async where possible

**4. Date Math Errors (MEDIUM RISK)**
- **Scenario:** Transactions fall outside expected date ranges
- **Impact:** Analytics charts show incorrect trends
- **Likelihood:** Medium (date math is error-prone)
- **Mitigation:**
  ```typescript
  // Use date-fns for reliability
  import { subMonths, getDaysInMonth } from 'date-fns'
  
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(new Date(), i)
    const daysInMonth = getDaysInMonth(monthDate)
    // Generate transactions...
  }
  ```

### UX Risks

**1. Wizard Feels Too Long (MEDIUM RISK)**
- **Scenario:** Users abandon after step 2
- **Impact:** Low onboarding completion rate
- **Likelihood:** Medium (industry avg: 60-70% completion)
- **Mitigation:**
  - Keep to 4 steps max
  - Add progress indicator (1 of 4)
  - Time estimate on Step 1 (2 minutes)
  - Skip button always visible

**2. Philosophy Feels Preachy (LOW RISK)**
- **Scenario:** Users dismiss onboarding as "too much talk"
- **Impact:** Brand perception issue
- **Likelihood:** Low (target audience values mindfulness)
- **Mitigation:**
  - One affirmation per step (not walls of text)
  - Visual balance (icons, spacing, imagery)
  - Tone: Warm, not preachy ("You're in control")

**3. Demo User Confusion (LOW RISK)**
- **Scenario:** User doesn't understand why data is different
- **Impact:** Thinks app is broken
- **Likelihood:** Low (clear "Demo Mode" badge)
- **Mitigation:**
  - Prominent badge in sidebar
  - Tooltip: "This account has sample data for demonstration"
  - Settings page explains demo vs real account

### Data Risks

**1. Cleanup Script Deletes Wrong User (HIGH IMPACT, LOW LIKELIHOOD)**
- **Scenario:** Script deletes data for wrong email
- **Impact:** Catastrophic data loss
- **Likelihood:** Very low (requires typo + confirmation skip)
- **Mitigation:**
  ```typescript
  const email = process.argv[2]
  
  console.log(`⚠️  WARNING: This will delete ALL data for ${email}`)
  console.log('Type "CONFIRM" to proceed:')
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  readline.question('> ', (answer: string) => {
    if (answer === 'CONFIRM') {
      // Proceed with deletion
    } else {
      console.log('❌ Cancelled')
      process.exit(0)
    }
  })
  ```

**2. Demo User Data Leaks Into Real User (MEDIUM RISK)**
- **Scenario:** Developer accidentally seeds demo data to real user
- **Impact:** Real user sees fake transactions
- **Likelihood:** Medium (easy to mix up user IDs)
- **Mitigation:**
  - Script checks `isDemoUser` flag before seeding
  - Require explicit `--force` flag to override
  - Log warnings prominently

---

## Recommendations for Planner

### 1. Build Onboarding as Single Feature (Don't Split)

**Rationale:**
- Onboarding components are tightly coupled
- Total work is 8-11 hours (reasonable for one builder)
- No parallel work opportunities (schema → UI → scripts is serial)
- Integration testing is easier with one person owning the feature

**Recommended Approach:**
- Builder 1 owns entire onboarding feature
- Builder 1 creates schema, UI, scripts, integration
- Builder 1 tests end-to-end flow
- Timeline: 1-2 days

### 2. Grandfather Existing Users (Don't Force Onboarding)

**Rationale:**
- Only 1-2 existing users (ahiya + test accounts)
- Forcing onboarding on existing users is bad UX
- Migration should set `onboardingCompletedAt` for existing users

**Recommended Approach:**
```sql
UPDATE "User" 
SET "onboardingCompletedAt" = "createdAt" 
WHERE "createdAt" < NOW();
```

### 3. Keep Onboarding Short (4 Steps Max)

**Rationale:**
- Completion rates drop after 3-4 steps
- App is simple enough to explain in 4 steps
- Philosophy + Features + Action + Completion = complete journey

**Recommended Structure:**
1. Welcome (Philosophy)
2. Features (Overview)
3. Getting Started (Optional Action)
4. Completion (Reinforcement)

### 4. Enable Replay from Day 1

**Rationale:**
- Users may skip initially, want to see it later
- Helps when showing app to others
- Low implementation cost (just a button + state)

**Recommended Approach:**
- Settings → Help → "Replay Product Tour" button
- Opens same OnboardingWizard component
- No special logic needed

### 5. Use Existing Dialog Component (Don't Reinvent)

**Rationale:**
- Radix Dialog is already used in 5+ forms
- Accessible, tested, styled
- Consistent with app UX

**Recommended Approach:**
- Wizard is just a Dialog with step state
- No custom modal implementation needed

### 6. Seed Demo User with Realistic Patterns

**Rationale:**
- Demo data should tell a story (not random noise)
- 6 months shows trends (monthly budget adherence, goal progress)
- Helps user understand analytics features

**Recommended Patterns:**
- Consistent salary ($3,500 on 15th and last day)
- Seasonal spending (higher in Nov/Dec)
- Budget adherence improves over time (shows learning)
- Goals show progress (some completed, some in progress)

### 7. Make Demo User Visually Distinct

**Rationale:**
- Prevent confusion when switching between accounts
- Remind owner this is demo data

**Recommended Approach:**
- Badge in sidebar: "Demo Mode"
- Subtle color change (gold border on sidebar)
- Tooltip: "This account has sample data"

---

## Resource Map

### Critical Files to Create

**New Files (7 components + 3 scripts):**
```
src/components/onboarding/
├── OnboardingWizard.tsx           (80 lines)
├── OnboardingStep1Welcome.tsx     (60 lines)
├── OnboardingStep2Features.tsx    (80 lines)
├── OnboardingStep3Start.tsx       (60 lines)
├── OnboardingStep4Complete.tsx    (50 lines)
├── OnboardingProgress.tsx         (30 lines)
├── OnboardingTrigger.tsx          (40 lines)
└── types.ts                       (20 lines)

scripts/
├── create-demo-user.ts            (60 lines)
├── cleanup-user-data.ts           (80 lines)
└── (enhance) seed-demo-data.ts    (+100 lines)

src/server/api/routers/
└── users.router.ts                (80 lines - new router)

prisma/
└── migrations/
    └── 20251002_add_onboarding_fields/
        └── migration.sql          (10 lines)
```

### Files to Modify

**Existing Files (4 modifications):**
```
src/app/(dashboard)/layout.tsx
  + import OnboardingTrigger
  + <OnboardingTrigger /> component

src/app/(dashboard)/settings/page.tsx
  + Replay button
  + OnboardingWizard state

src/components/dashboard/DashboardSidebar.tsx
  + Demo mode badge (conditional render)

prisma/schema.prisma
  + 3 fields to User model
```

### Key Dependencies (Already Installed)

**No new packages needed:**
- `@radix-ui/react-dialog` - Dialog system ✅
- `framer-motion` - Animations ✅
- `lucide-react` - Icons ✅
- `zod` - Validation (tRPC endpoints) ✅
- `@prisma/client` - Database ✅

### Testing Checklist

**Manual Testing Required:**

1. **Onboarding Flow**
   - [ ] New user sees wizard on first dashboard load
   - [ ] Step 1: Welcome displays correctly
   - [ ] Step 2: Features displays correctly
   - [ ] Step 3: Action buttons work (Add Account, Just Explore)
   - [ ] Step 4: Completion message displays
   - [ ] Progress indicator updates (1/4, 2/4, 3/4, 4/4)
   - [ ] Back button works (Step 2 → Step 1)
   - [ ] Skip button works (sets `onboardingSkipped = true`)
   - [ ] Completing sets `onboardingCompletedAt`
   - [ ] Refresh after completion → wizard does NOT show

2. **Replay Feature**
   - [ ] Settings → "Replay Tour" button exists
   - [ ] Clicking button opens wizard
   - [ ] Wizard works same as first-time experience
   - [ ] Can close wizard mid-replay

3. **Demo User**
   - [ ] Demo user can be created via script
   - [ ] Demo user has `isDemoUser = true`
   - [ ] Demo user has 6 months of transactions
   - [ ] Demo user has budgets for all 6 months
   - [ ] Demo user has 2 goals with progress
   - [ ] Sidebar shows "Demo Mode" badge
   - [ ] Analytics charts show 6 months of trends

4. **Real User Cleanup**
   - [ ] Cleanup script prompts for confirmation
   - [ ] All transactions deleted
   - [ ] All accounts deleted
   - [ ] All budgets deleted
   - [ ] All goals deleted
   - [ ] User record remains (not deleted)
   - [ ] Onboarding status reset
   - [ ] Next login shows wizard

5. **Edge Cases**
   - [ ] Clicking outside wizard doesn't close (Radix default)
   - [ ] Escape key closes wizard
   - [ ] Mobile responsive (dialog scales down)
   - [ ] Keyboard navigation works (Tab through buttons)
   - [ ] Screen reader announces step changes

### Time Estimates by Task

| Task | Complexity | Time | Builder |
|------|-----------|------|---------|
| Prisma schema migration | LOW | 30 min | Builder 1 |
| Users tRPC router | LOW | 1 hour | Builder 1 |
| OnboardingWizard component | MEDIUM | 2 hours | Builder 1 |
| Step components (4) | MEDIUM | 2 hours | Builder 1 |
| OnboardingTrigger logic | LOW | 30 min | Builder 1 |
| Dashboard integration | LOW | 30 min | Builder 1 |
| Settings replay button | LOW | 15 min | Builder 1 |
| Demo user script | MEDIUM | 1 hour | Builder 1 |
| Cleanup script | MEDIUM | 1 hour | Builder 1 |
| Enhance seed script | MEDIUM | 1.5 hours | Builder 1 |
| Testing & refinement | MEDIUM | 1.5 hours | Builder 1 |
| **TOTAL** | **MEDIUM** | **11.5 hours** | **1 Builder** |

---

## Questions for Planner

### Q1: Should Onboarding Be Dismissible Mid-Flow?

**Context:** User is on Step 2, clicks outside dialog or presses Escape

**Options:**
- A) Dialog closes immediately (user loses progress)
- B) Confirmation: "Are you sure? You can replay from Settings"
- C) Cannot dismiss (must complete or skip)

**Recommendation:** Option A (close immediately)
- Only 4 steps, takes 2 minutes
- Losing progress is acceptable
- "Skip" button is always visible (explicit opt-out)
- Simpler implementation

### Q2: Should Demo User See Onboarding on First Login?

**Context:** Demo user is pre-created with `onboardingCompletedAt` set

**Options:**
- A) Show onboarding (treat like new user)
- B) Don't show (assume owner will replay manually)
- C) Show special demo onboarding ("Here's what you're looking at")

**Recommendation:** Option B (don't show)
- Owner controls demo user, not end user
- Owner can replay if showing to someone
- Keeps demo user in "ready to demo" state

### Q3: Should Cleanup Script Delete User Record?

**Context:** Cleanup script removes all user data (accounts, transactions, etc.)

**Options:**
- A) Delete User record completely (requires Supabase auth deletion too)
- B) Keep User record, only delete related data
- C) Soft delete (set `isActive = false`)

**Recommendation:** Option B (keep User record)
- Maintains Supabase Auth link
- Preserves email/settings
- Only deletes financial data
- Simpler and safer

### Q4: How to Handle Onboarding for Accounts vs Dashboard?

**Context:** Middleware protects `/accounts`, `/transactions`, etc.

**Options:**
- A) Onboarding triggers only on `/dashboard`
- B) Onboarding triggers on any protected route
- C) Separate check in each route layout

**Recommendation:** Option A (dashboard only)
- Users should land on dashboard first
- Deep links bypass onboarding (acceptable)
- Simpler implementation (one trigger point)

### Q5: Should We Track Analytics on Onboarding?

**Context:** Useful to know completion rates, most-skipped steps, etc.

**Options:**
- A) Track nothing (MVP approach)
- B) Track completion/skip (simple boolean)
- C) Track per-step analytics (which step dropped off)

**Recommendation:** Option A (no tracking for MVP)
- Only 1-2 users initially
- Can add later if needed
- Privacy-friendly
- Reduces scope

### Q6: Should Onboarding Content Be Configurable?

**Context:** Hardcoded content vs. database-driven content

**Options:**
- A) Hardcoded in components (fastest)
- B) JSON config file (easy to edit)
- C) Database CMS (over-engineering)

**Recommendation:** Option A (hardcoded)
- MVP doesn't need content flexibility
- Changing content requires code deploy (acceptable)
- No content management overhead
- Can refactor later if needed

---

## Summary

### What We're Building

**Onboarding Wizard:**
- 4-step dialog-based wizard
- Philosophy-first approach (conscious money values)
- Optional (skip button always visible)
- Replayable from Settings

**User Separation:**
- Real user (ahiya.butman@gmail.com) - clean slate
- Demo user (test@wealth.com) - 6 months rich data
- Clear visual distinction (Demo Mode badge)

**Schema Changes:**
- 3 new User fields (onboardingCompletedAt, onboardingSkipped, isDemoUser)
- Additive migration (no breaking changes)

**Scripts:**
- Create demo user
- Cleanup user data
- Enhanced seed script (6 months)

### What We're NOT Building

- Complex multi-page onboarding
- Data entry forms in wizard
- Personalization/customization
- Analytics tracking
- A/B testing
- Video tutorials
- Interactive product tours (tooltips on real UI)

### Success Criteria

**Iteration 6 is complete when:**
1. New users see 4-step onboarding on first dashboard load
2. Users can skip onboarding (never shows again)
3. Users can replay from Settings
4. Demo user exists with 6 months of data
5. Real user has clean data (no test transactions)
6. Demo user shows "Demo Mode" badge
7. Onboarding takes <2 minutes to complete
8. All components styled with existing design system

### Estimated Effort

**Total Time:** 11.5 hours

**Complexity:** MEDIUM

**Team:** 1 Builder (Builder 1)

**Timeline:** 1.5-2 days

---

**End of Report**
