# Technology Stack - Iteration 6

## Core Framework

**Decision:** Next.js 14.2.23 (App Router)

**Rationale:**
- Already established in codebase
- Server Components perfect for auth + onboarding checks (no flash of content)
- Client Components for wizard state management
- Dashboard layout is Server Component (ideal insertion point for OnboardingTrigger)
- No framework changes needed

**Usage Pattern:**
- Server Component: Dashboard layout (auth check, fetch user with onboarding status)
- Client Component: OnboardingWizard and all step components
- Hybrid: OnboardingTrigger (receives server data, manages client state)

## Database

**Decision:** PostgreSQL via Prisma 5.22.0

**Rationale:**
- Existing database infrastructure
- Prisma provides transaction support (critical for cleanup script)
- Type-safe queries prevent deletion errors
- Migration system handles schema evolution cleanly
- Cascading delete behavior well-defined

**Schema Strategy:**

Add 3 fields to User model:
```prisma
model User {
  // ... existing fields ...

  // Onboarding tracking
  onboardingCompletedAt  DateTime?  @default(null)  // null = not completed
  onboardingSkipped      Boolean    @default(false)  // true = user clicked skip

  // User type flag
  isDemoUser             Boolean    @default(false)  // true for test@wealth.com
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_onboarding_user_fields
```

**Deletion Order (Foreign Keys):**
```
1. Transaction (no children)
2. Budget (no children, BudgetAlert cascades)
3. Goal (no children)
4. Account (transactions already deleted)
5. Category (only user-created, preserve defaults)
```

## Authentication

**Decision:** Supabase Auth (existing) + Admin API for test user creation

**Rationale:**
- Current auth system works well
- Admin API enables programmatic user creation (bypass email verification)
- Service role key required for admin operations
- Local Supabase instance via `supabase start`

**Implementation Notes:**

**For Regular Auth (no changes):**
- Existing middleware handles protection
- User creation via signup page

**For Test User Creation (new):**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Admin key
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@wealth.com',
  password: 'demo1234',
  email_confirm: true,  // Skip email verification
  user_metadata: { name: 'Demo User' }
})
```

**Service Role Key Setup:**
```bash
# Local development
supabase start
# Look for "service_role key" in output
# Add to .env.local

# .env.local
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## API Layer

**Decision:** tRPC (existing)

**Rationale:**
- Type-safe mutations for onboarding actions
- React Query integration for cache management
- Automatic cache invalidation after mutations
- Consistent with existing account/transaction patterns

**New Endpoints Required:**

```typescript
// src/server/api/routers/users.router.ts

export const usersRouter = createTRPCRouter({
  me: publicProcedure
    .query(async ({ ctx }) => {
      // Return current user with onboarding status
      return await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          name: true,
          isDemoUser: true,
          onboardingCompletedAt: true,
          onboardingSkipped: true,
        }
      })
    }),

  completeOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { onboardingCompletedAt: new Date() }
      })
    }),

  skipOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { onboardingSkipped: true }
      })
    }),
})
```

## Frontend

**Decision:** React 18 with Radix UI Dialog

**UI Component Library:** Radix UI (existing)
- Dialog component already used throughout app
- Accessible by default (ARIA attributes, keyboard nav)
- Composable API fits wizard pattern

**Styling:** Tailwind CSS with existing design tokens

**State Management:** React useState (local component state)
- No global state needed for wizard
- Dialog open/close managed locally
- Step progression tracked in OnboardingWizard component

**Rationale:**
- Radix Dialog is battle-tested in AccountForm, GoalForm, etc.
- Tailwind classes match existing design system
- Local state sufficient for 4-step wizard
- React Query handles server state (user onboarding status)

**Component Architecture:**
```
src/components/onboarding/
├── OnboardingWizard.tsx           # Parent container, step state
├── OnboardingStep1Welcome.tsx     # Philosophy introduction
├── OnboardingStep2Features.tsx    # Feature overview
├── OnboardingStep3Start.tsx       # Getting started action
├── OnboardingStep4Complete.tsx    # Completion message
├── OnboardingProgress.tsx         # Progress dots (1 of 4)
├── OnboardingTrigger.tsx          # Check status, show wizard
└── types.ts                       # Shared types
```

## External Integrations

### Supabase Auth Admin API

**Purpose:** Create test@wealth.com user without email verification flow

**Library:** @supabase/supabase-js v2.58.0 (already installed)

**Implementation:**
```typescript
// Admin client (service role key)
const supabaseAdmin = createClient(url, serviceRoleKey, options)

// Create user
await supabaseAdmin.auth.admin.createUser({
  email: 'test@wealth.com',
  password: 'demo1234',
  email_confirm: true
})
```

**Error Handling:**
- User already exists: Check if can fetch existing user
- Invalid email format: Validate before API call
- Service role key missing: Clear error message with setup instructions

## Development Tools

### Testing

**Framework:** Manual testing (no automated tests for MVP)

**Coverage target:** N/A (scripts are one-time tools)

**Strategy:**
- Test cleanup script on ahiya's duplicate data (real validation)
- Test seed script on fresh test user
- Manual UI testing for onboarding flow
- Validation queries to verify data counts

**Testing Checklist:**
```bash
# Cleanup validation
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'ahiya.butman@gmail.com' },
  include: { _count: { select: { accounts: true, transactions: true } } }
}).then(console.log).finally(() => prisma.\$disconnect());
"

# Seed validation
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'test@wealth.com' },
  include: { _count: { select: { accounts: true, transactions: true } } }
}).then(console.log).finally(() => prisma.\$disconnect());
"
```

### Code Quality

**Linter:** ESLint (existing config, no changes)

**Formatter:** Prettier (existing config, no changes)

**Type Checking:** TypeScript strict mode (existing)

**Patterns:**
- Follow existing component patterns (see patterns.md)
- Use Radix Dialog API consistently
- Follow tRPC router conventions

### Build & Deploy

**Build tool:** Next.js built-in (no changes)

**Deployment target:** Vercel (existing)

**CI/CD:** None required for this iteration

**Migration Strategy:**
```bash
# Development
npx prisma migrate dev --name add_onboarding_user_fields

# Production
npx prisma migrate deploy
```

## Environment Variables

Required env vars for iteration 6:

**SUPABASE_SERVICE_ROLE_KEY** (NEW)
- Purpose: Admin API access for test user creation
- Where to get it:
  - Local: `supabase start` output (look for "service_role key")
  - Cloud: Supabase Dashboard > Settings > API > service_role key
- Security: LOCAL DEV ONLY, add to .env.local, never commit
- Fallback: Create test user manually in Supabase Studio if key unavailable

**Existing vars (no changes):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL

## Dependencies Overview

No new dependencies required. All tools already installed:

**Core:**
- next: 14.2.23 (framework)
- react: 18.3.1 (UI library)
- @prisma/client: 5.22.0 (database ORM)
- @supabase/supabase-js: 2.58.0 (auth client)
- @trpc/client, @trpc/server, @trpc/react-query: 10.45.2 (API layer)

**UI Components:**
- @radix-ui/react-dialog: 1.0.5 (modal system)
- framer-motion: 11.5.4 (animations)
- lucide-react: 0.344.0 (icons)

**Utilities:**
- date-fns: 3.6.0 (date manipulation for seed script)
- zod: 3.22.4 (validation for tRPC)
- tailwindcss: 3.4.1 (styling)

**Development:**
- typescript: 5.4.2 (type safety)
- tsx: 4.7.1 (run TypeScript scripts)
- prisma: 5.22.0 (migrations, Prisma Client generation)

**Node.js Built-ins (no install needed):**
- readline/promises (confirmation prompts in cleanup script)
- fs/promises (file operations if needed)

## Performance Targets

**Onboarding Wizard:**
- Dialog open: < 100ms (Radix Dialog is fast)
- Step transition: < 50ms (local state update)
- Complete/skip mutation: < 500ms (database write)

**Seed Script:**
- 6 months of data: < 30 seconds
- 350-400 transactions: < 10 seconds insert time
- Account/budget creation: < 5 seconds

**Cleanup Script:**
- Data summary query: < 1 second
- Full deletion (transaction wrapped): < 2 seconds
- Total runtime: < 10 seconds including confirmation

**Dashboard Load (Demo User):**
- First Contentful Paint: < 1.5s (no change expected)
- Transaction list: < 500ms (pagination handles volume)
- Charts: < 1s (6 months is within performant range)

## Security Considerations

**Service Role Key:**
- Store in .env.local (never commit)
- Use only for local development
- For production demo user, create manually in Supabase Dashboard
- Document that key has full database access (use carefully)

**Cleanup Script:**
- Require explicit "DELETE" confirmation (prevent typos)
- Show data summary before deletion (user knows what they're deleting)
- Use database transactions (all-or-nothing, prevents partial deletions)
- Never delete User record itself (preserve auth link)

**Onboarding State:**
- Store completion status in database (not localStorage)
- No sensitive data in onboarding wizard
- Mutations require authentication (protectedProcedure)

**Demo User:**
- Password is "demo1234" (acceptable for demo purposes)
- isDemoUser flag is NOT a security feature (all auth is same)
- Demo badge is informational only

## Data Integrity Patterns

**Foreign Key Respect:**
```typescript
// CORRECT deletion order (cleanup script)
await prisma.$transaction(async (tx) => {
  await tx.transaction.deleteMany({ where: { userId } })      // 1. No children
  await tx.budget.deleteMany({ where: { userId } })           // 2. No children
  await tx.goal.deleteMany({ where: { userId } })             // 3. No children
  await tx.account.deleteMany({ where: { userId } })          // 4. Transactions gone
  await tx.category.deleteMany({ where: { userId } })         // 5. Only custom
})
```

**Transaction Wrapping:**
```typescript
// All-or-nothing deletion
await prisma.$transaction([
  /* deletion operations */
], {
  timeout: 10000,  // 10 second timeout
})
```

**Balance Validation:**
```typescript
// After seeding, validate account balances
const calculatedBalance = initialBalance + sum(transactions.amount)
if (Math.abs(account.currentBalance - calculatedBalance) > 0.01) {
  console.warn(`⚠️  Balance mismatch for ${account.name}`)
}
```

## Accessibility

**Dialog (Radix UI):**
- ARIA attributes automatic (role="dialog", aria-modal="true")
- Focus trap (can't tab outside dialog)
- Escape key closes dialog
- Focus returns to trigger element on close

**Keyboard Navigation:**
- Tab through buttons (Next, Back, Skip, Complete)
- Enter activates focused button
- Arrow keys don't navigate (not a carousel)

**Screen Reader:**
- Step announcements: "Step 1 of 4: Welcome"
- Progress indicator: ARIA live region
- Button labels clear and descriptive

**Mobile Responsive:**
- Dialog max-width: 600px (sm:max-w-[600px])
- Touch targets: 44px minimum (Radix default)
- Readable font sizes (1rem+)
