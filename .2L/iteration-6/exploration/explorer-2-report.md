# Explorer 2 Report: Data Management, Cleanup Scripts, Enhanced Seed Data

## Executive Summary

Analyzed current data state for the ahiya user and designed robust data management infrastructure for Iteration 6. The ahiya user currently has **duplicate demo data** (12 accounts, 75 transactions, 4 budgets, 4 goals) that needs complete cleanup. Designed three critical scripts: cleanup script for surgical data removal, enhanced seed script for 6-month realistic demo data, and test user creation with Supabase Auth integration. All scripts include comprehensive safety features, error handling, and validation.

## Discoveries

### Current Data State (Ahiya User)

**User:** ahiya.butman@gmail.com (ID: cmg8mvria0000nsit2ts13skh)
- **Accounts:** 12 (3x duplicates of 4 accounts each)
- **Transactions:** 75 (distributed across duplicate accounts)
- **Budgets:** 4 (current month only)
- **Goals:** 4 (2 duplicates each)
- **Supabase Auth ID:** afec78e3-04fc-4f3b-b636-4d041eff4e49

**Problem Identified:** Multiple runs of `seed-demo-data.ts` created duplicate accounts without cleanup, resulting in messy data for the real user.

**Duplicate Accounts Detected:**
1. Chase Checking (3x instances, 14+18+15 transactions = 47 transactions)
2. High Yield Savings (3x instances, 0 transactions each)
3. Chase Sapphire Reserve (3x instances, 11+7+10 transactions = 28 transactions)
4. Vanguard 401k (3x instances, 0 transactions each)

**Recent Transactions Sample:**
- Employer Direct Deposit: $3,500 (multiple occurrences)
- Starbucks: -$74.33
- Comcast: -$218.12
- Chipotle: -$49.96
- Trader Joe's: -$78.11, -$64.73
- Whole Foods: -$124.28

**Conclusion:** Complete data wipe required for ahiya user to start fresh.

### Test User State

**User:** test@wealth.com - **Does NOT exist** in Prisma database
- No Supabase Auth user
- No Prisma User record
- Fresh creation required

### Database Schema Analysis

**Foreign Key Dependencies (Deletion Order):**

1. **Transactions** (no dependencies on other entities)
   - References: User, Account, Category
   - Cascade: onDelete: Cascade (User, Account)
   - Restrict: Category (prevent deletion if transactions exist)

2. **Budgets** (depends on Categories)
   - References: User, Category
   - Cascade: onDelete: Cascade (User)
   - Has: BudgetAlert children (cascade delete)

3. **Goals** (depends on Accounts)
   - References: User, Account (optional)
   - Cascade: onDelete: Cascade (User)

4. **Accounts** (has Transactions, Goals dependencies)
   - References: User
   - Cascade: onDelete: Cascade (User)
   - Has: Transactions, Goals children

5. **Categories** (has Transactions, Budgets dependencies)
   - References: User (optional for user-created)
   - Should NOT delete default categories (userId: null)

**Safe Deletion Order:**
```
1. Transactions (no children)
2. BudgetAlerts (via Budget cascade)
3. Budgets (no other children)
4. Goals (no children)
5. Accounts (transactions already deleted)
6. Categories (ONLY user-created, NOT defaults)
```

### Existing Seed Script Analysis

**Current `scripts/seed-demo-data.ts`:**
- Creates 4 accounts (hardcoded)
- Generates 25 transactions (30-day period)
- Creates 4 budgets (current month only)
- Creates 2 goals (static amounts)
- **Warning printed:** "Running this script multiple times will create duplicate accounts/transactions"
- **No cleanup mechanism:** Leads to duplicates (proven by current state)
- **No upsert logic:** Always creates new records

**Strengths:**
- Good category lookup logic
- Realistic payee names
- Proper date distribution
- Transaction variety (groceries, dining, transport, shopping, housing)

**Weaknesses:**
- Only 1 month of data (need 6 months)
- Static account balances (no evolution over time)
- No seasonal patterns
- Limited transaction variety
- No income variation
- No budget history (only current month)

## Patterns Identified

### Pattern 1: Supabase Admin Client for User Creation

**Description:** Use Supabase Admin API (service role key) to create auth users programmatically

**Use Case:** Creating test@wealth.com user with verified email, no confirmation flow

**Example:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Create user with admin privileges
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@wealth.com',
  password: 'demo1234',
  email_confirm: true, // Skip email verification
  user_metadata: { name: 'Demo User' }
})
```

**Recommendation:** YES - Essential for creating demo user without email verification loop

**Challenge:** Need SUPABASE_SERVICE_ROLE_KEY environment variable
- Available in Supabase Dashboard (Settings > API)
- For local dev: Check `supabase status` output after `supabase start`

### Pattern 2: Transaction-Based Cleanup

**Description:** Wrap all deletions in database transaction for atomicity

**Use Case:** Ensure cleanup is all-or-nothing (no partial deletions)

**Example:**
```typescript
await prisma.$transaction(async (tx) => {
  // Delete in correct order
  await tx.transaction.deleteMany({ where: { userId } })
  await tx.budget.deleteMany({ where: { userId } })
  await tx.goal.deleteMany({ where: { userId } })
  await tx.account.deleteMany({ where: { userId } })
  await tx.category.deleteMany({ where: { userId, isDefault: false } })
})
```

**Recommendation:** YES - Critical for data integrity during cleanup

### Pattern 3: Progressive Time-Based Seeding

**Description:** Generate data month-by-month with evolving balances and patterns

**Use Case:** Creating realistic 6-month history with account growth, budget adherence improvement

**Example:**
```typescript
const months = generateMonthRange(6) // Last 6 months

for (const month of months) {
  // Generate transactions for this month
  const monthTransactions = generateMonthlyTransactions(month, {
    income: getMonthlyIncome(month), // Varies for freelance
    expenses: getMonthlyExpenses(month), // Seasonal patterns
    savingsRate: getSavingsRate(month) // Improving over time
  })
  
  // Update account balances based on transactions
  updateAccountBalances(monthTransactions)
  
  // Create budgets for this month
  createMonthlyBudgets(month)
}
```

**Recommendation:** YES - Provides realistic data evolution and showcases app over time

### Pattern 4: Confirmation Prompts for Destructive Actions

**Description:** Require explicit confirmation before deleting data

**Use Case:** Prevent accidental data loss during cleanup

**Example:**
```typescript
import * as readline from 'readline/promises'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const confirmation = await rl.question(
  `\n⚠️  WARNING: This will DELETE ALL data for user: ${user.email}\n` +
  `   - ${counts.accounts} accounts\n` +
  `   - ${counts.transactions} transactions\n` +
  `   - ${counts.budgets} budgets\n` +
  `   - ${counts.goals} goals\n\n` +
  `Type "DELETE" to confirm: `
)

if (confirmation !== 'DELETE') {
  console.log('❌ Cleanup cancelled')
  process.exit(0)
}
```

**Recommendation:** YES - Essential safety feature for cleanup script

### Pattern 5: Idempotent Seed Scripts

**Description:** Scripts that can run multiple times safely (upsert pattern)

**Use Case:** Allow re-running seed script to refresh demo data without duplicates

**Example:**
```typescript
// For accounts: delete existing first, then create
await prisma.account.deleteMany({ where: { userId, isManual: true } })
const accounts = await prisma.account.createMany({ data: accountData })

// For budgets: use upsert
await prisma.budget.upsert({
  where: { userId_categoryId_month: { userId, categoryId, month } },
  update: { amount, rollover },
  create: { userId, categoryId, month, amount, rollover }
})
```

**Recommendation:** YES with modification - Better approach: cleanup first, then seed fresh

## Complexity Assessment

### High Complexity Areas

#### 1. Enhanced Seed Data Generation (6 months, 300-400 transactions)
**Complexity Factors:**
- Time-based transaction generation with realistic patterns
- Account balance evolution over 6 months
- Seasonal expense variations (holidays, summer, etc.)
- Income variability (salary + freelance)
- Budget adherence patterns (improving over time)
- Goal progress tracking aligned with transactions

**Builder Split Recommendation:** NO - Single builder can handle with structured approach

**Implementation Strategy:**
```typescript
// Month-by-month generation loop
// Helper functions for patterns:
// - getMonthlyIncome(month, patterns)
// - generateExpenses(month, category, variance)
// - calculateAccountBalance(previousBalance, monthTransactions)
// - getBudgetVariance(month, adherencePattern)
```

**Estimated Complexity:** 3-4 hours for quality implementation

#### 2. Supabase Auth Integration for Test User Creation
**Complexity Factors:**
- Admin client setup (service role key)
- Error handling (user already exists, invalid credentials)
- Prisma sync (matching Supabase Auth ID)
- Email verification bypass
- Metadata population

**Builder Split Recommendation:** NO - Straightforward with good error handling

**Key Challenges:**
- Service role key access (environment variable)
- Handling duplicate user errors gracefully
- Ensuring Prisma User record matches Supabase Auth user

**Estimated Complexity:** 1-2 hours

### Medium Complexity Areas

#### 1. Cleanup Script with Safety Features
**Complexity Notes:**
- Deletion order handling (foreign keys)
- Transaction wrapping for atomicity
- Confirmation prompts (stdin handling in Node.js)
- Detailed logging of what's deleted
- Dry-run option (show what would be deleted without deleting)

**Estimated Complexity:** 2 hours

#### 2. Script Integration & CLI Experience
**Complexity Notes:**
- npm scripts configuration
- Argument parsing (user ID, options)
- Environment variable handling
- Error messages and usage guides
- Cross-script coordination (cleanup + seed in sequence)

**Estimated Complexity:** 1 hour

### Low Complexity Areas

#### 1. Package.json Script Definitions
**Straightforward:** Add scripts like `cleanup:user`, `seed:demo`, etc.

#### 2. Data Validation Helpers
**Straightforward:** Simple count queries and assertions

## Technology Recommendations

### Primary Stack (Existing)

- **Runtime:** Node.js with tsx (already used for scripts)
  - Rationale: Matches existing script pattern (`scripts/seed-demo-data.ts`)
  - TypeScript support via `tsx` package

- **Database Client:** Prisma Client (already in use)
  - Rationale: Existing ORM, transaction support, type-safe queries
  - Import: `import { PrismaClient } from '@prisma/client'`

- **Auth Client:** @supabase/supabase-js (already installed)
  - Rationale: Required for Supabase Auth Admin API
  - Admin client needs service role key for `auth.admin.*` methods

### Supporting Libraries

#### 1. readline/promises (Node.js built-in)
**Purpose:** Interactive confirmation prompts for cleanup script
**Why needed:** User safety - confirm before destructive operations
**Example:**
```typescript
import * as readline from 'readline/promises'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question('Confirm? ')
```

#### 2. date-fns (already installed)
**Purpose:** Date manipulation for 6-month data generation
**Why needed:** Clean month range generation, date arithmetic
**Example:**
```typescript
import { subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

const months = Array.from({ length: 6 }, (_, i) => subMonths(startOfMonth(new Date()), i))
```

#### 3. superjson (already installed)
**Purpose:** Safe serialization for logging complex objects
**Why needed:** Log data previews without JSON stringify errors
**Not critical:** Can use JSON.stringify with null replacer

## Integration Points

### External APIs

#### Supabase Auth Admin API
**Purpose:** Create test@wealth.com user programmatically
**Complexity:** Low (single API call)
**Considerations:**
- **Service Role Key Required:** Must add `SUPABASE_SERVICE_ROLE_KEY` to environment
  - Local dev: Get from `supabase status` or Supabase Studio
  - Production: Get from Supabase Dashboard > Settings > API
- **Error Handling:** User already exists (422), invalid email format (400)
- **Rate Limiting:** Not a concern for one-time user creation

**Integration Code:**
```typescript
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@wealth.com',
  password: 'demo1234',
  email_confirm: true,
  user_metadata: { name: 'Demo User' }
})

if (error) {
  if (error.message.includes('already exists')) {
    console.log('User already exists, fetching...')
    // Handle existing user case
  } else {
    throw error
  }
}
```

### Internal Integrations

#### Cleanup Script ↔ Prisma Database
**Connection:** Direct Prisma Client queries with transaction wrapping
**Data Flow:**
1. User provides user ID or email
2. Script queries user and counts all related data
3. Display summary and prompt for confirmation
4. Execute deletions in transaction (correct order)
5. Log deletion counts

**Dependencies:**
- Requires valid user ID or email
- Must respect foreign key constraints
- Should NOT delete default categories (userId: null)

#### Seed Script ↔ Test User + Categories
**Connection:** Depends on user existing and default categories being seeded
**Data Flow:**
1. Validate user exists (from create-test-user.ts output or argument)
2. Fetch default categories (must run `npm run db:seed` first)
3. Generate 6 months of data (accounts, transactions, budgets, goals)
4. Insert data with proper foreign key references

**Dependencies:**
- User must exist in Prisma database
- Default categories must exist (isDefault: true, userId: null)
- Cannot run before user creation

#### Create Test User ↔ Supabase Auth + Prisma
**Connection:** Two-step process (Auth first, then Prisma)
**Data Flow:**
1. Create user in Supabase Auth (get auth user ID)
2. Create matching User record in Prisma (with supabaseAuthId)
3. Return Prisma user ID for seeding

**Dependencies:**
- Supabase must be running (`supabase start`)
- Service role key must be available
- Email must not already exist

## Risks & Challenges

### Technical Risks

#### Risk 1: Service Role Key Exposure
**Impact:** Security vulnerability if leaked (full database access)
**Mitigation Strategy:**
- Use environment variable (never hardcode)
- Add `.env.local` to `.gitignore` (already done)
- Document in README that service key is for LOCAL DEV ONLY
- For production demo user, create manually in Supabase Dashboard

**Likelihood:** Low (existing .gitignore patterns protect .env files)

#### Risk 2: Cascading Deletions Unexpected Behavior
**Impact:** Could delete more than intended if foreign keys not understood
**Mitigation Strategy:**
- Thoroughly test cleanup script on duplicate data first
- Use Prisma transaction (rollback on error)
- Log exactly what will be deleted before confirmation
- Consider dry-run mode: `--dry-run` flag to show without deleting

**Likelihood:** Medium (complex foreign key graph)

#### Risk 3: Duplicate Account Balances Don't Match Transactions
**Impact:** Net worth calculations incorrect if balances don't reflect transaction history
**Mitigation Strategy:**
- Calculate account balances from transaction sums
- Start with initial balance, apply all transactions chronologically
- Add validation: `currentBalance = initialBalance + sum(transactions)`
- Log warnings if balances don't match expected values

**Likelihood:** Medium (complex calculation logic)

### Complexity Risks

#### Risk 1: Realistic Data Patterns Too Ambitious
**Impact:** Seed script takes too long to implement with seasonal patterns, variance
**Mitigation:**
- Start with simple patterns (fixed income, expense variance)
- Add sophistication iteratively (seasonal patterns as enhancement)
- Prioritize volume (300-400 transactions) over perfect realism
- Use randomization with seed for reproducibility

**Likelihood:** Low (can simplify if needed)

#### Risk 2: Script Error Handling Insufficient
**Impact:** Scripts fail cryptically, users don't know how to fix
**Mitigation:**
- Wrap all operations in try-catch with helpful error messages
- Validate inputs before operations (user exists, categories exist)
- Provide clear usage instructions in error messages
- Log progress at each step (Creating accounts... ✓)

**Likelihood:** Medium (scripts are one-time tools, less tested)

## Recommendations for Planner

### 1. Script Development Order

**Recommended Sequence:**
1. **Cleanup Script** (scripts/cleanup-user-data.ts)
   - Build and test first on ahiya user's duplicate data
   - Validates deletion logic before creating more data
   - Provides clean slate for testing seed script

2. **Test User Creation** (scripts/create-test-user.ts)
   - Need user to exist before seeding
   - Simpler than seed script, good warmup

3. **Enhanced Seed Script** (enhance scripts/seed-demo-data.ts)
   - Most complex, benefits from other scripts being ready
   - Can test immediately after cleanup + user creation

**Rationale:** Test cleanup on real duplicate data problem, then build infrastructure for demo user

### 2. Data Volume Calibration

**Recommendation:** Start with 6 months, ~400 transactions, be ready to scale down

**Target Numbers:**
- **Accounts:** 6 (manageable variety)
- **Transactions:** 350-400 (60-70 per month)
  - Income: 2-3/month = 12-18 total
  - Expenses: 55-65/month = 330-390 total
- **Budgets:** 12 categories × 6 months = 72 budget records
- **Goals:** 4 goals with progress over 6 months

**Fallback:** If performance issues, reduce to 4 months or 250 transactions

### 3. Transaction Pattern Realism

**Recommendation:** Prioritize variety over perfect realism

**Must-Have Patterns:**
- Bi-weekly salary ($3,500 every 2 weeks)
- Monthly rent ($1,200 on 1st of month)
- Recurring bills (utilities, subscriptions)
- Variable groceries (15-20/month, $30-$80 each)
- Occasional large purchases ($200-$500, 1-2/month)

**Nice-to-Have Patterns:**
- Seasonal variance (higher shopping in Nov-Dec)
- Freelance income variance (some months higher)
- Budget adherence improving over time (overspend early months, better later)

**Skip (Over-Engineering):**
- Machine learning transaction generation
- Real merchant data scraping
- Complex economic modeling

### 4. Safety Features Priority

**Recommendation:** Implement comprehensive safety for cleanup, basic for seeding

**Cleanup Script (High Risk):**
- ✅ Confirmation prompt (type "DELETE")
- ✅ Show data summary before deletion
- ✅ Transaction wrapping (all-or-nothing)
- ✅ Dry-run mode (--dry-run flag)
- ✅ Never delete user account itself (only financial data)

**Seed Script (Lower Risk):**
- ✅ Check user exists
- ✅ Check categories exist
- ⚠️ Warn if user already has data (suggest cleanup first)
- Optional: --force flag to cleanup and seed in one run

**Test User Script (Lowest Risk):**
- ✅ Check if user already exists (idempotent)
- ✅ Clear error messages
- Optional: --reset flag to delete and recreate

### 5. Environment Variable Setup

**Recommendation:** Document service role key requirement clearly

**For Builder:**
Add to `.env.local` (create if doesn't exist):
```bash
# Get this from: supabase status (local) or Supabase Dashboard > Settings > API (cloud)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Local Development:**
```bash
supabase start
# Look for "service_role key" in output
# Copy to .env.local
```

**Alternative (If Service Key Issues):**
- Create test@wealth.com manually in Supabase Studio
- Use user ID in seed script (skip create-test-user script)

### 6. Validation Strategy

**Recommendation:** Build validation into scripts, separate validation checklist for manual testing

**Automated Validation (Built into Scripts):**
```typescript
// After seeding, automatically validate:
const validation = {
  accounts: await prisma.account.count({ where: { userId } }),
  transactions: await prisma.transaction.count({ where: { userId } }),
  budgets: await prisma.budget.count({ where: { userId } }),
  goals: await prisma.goal.count({ where: { userId } })
}

console.log('\n📊 Data Validation:')
console.log(`  Accounts: ${validation.accounts} (expected: 6)`)
console.log(`  Transactions: ${validation.transactions} (expected: 350-400)`)
console.log(`  Budgets: ${validation.budgets} (expected: 72)`)
console.log(`  Goals: ${validation.goals} (expected: 4)`)

if (validation.transactions < 300 || validation.transactions > 450) {
  console.warn('⚠️  Transaction count outside expected range')
}
```

**Manual Validation Checklist:**
- [ ] Real user (ahiya): 0 accounts, 0 transactions, 0 budgets, 0 goals
- [ ] Demo user (test@wealth.com): 6 accounts, 350-400 transactions, 72 budgets, 4 goals
- [ ] Dashboard loads for both users without errors
- [ ] Net worth chart shows 6-month trend for demo user
- [ ] Budget progress bars show realistic variance (some over, some under)
- [ ] Goal cards show progress (Emergency Fund ~53%, Vacation ~83%, Laptop ~80%, Down Payment ~20%)
- [ ] Transaction list shows variety of payees and amounts
- [ ] No duplicate accounts for demo user

## Resource Map

### Critical Files/Directories

#### `/scripts/cleanup-user-data.ts` (NEW)
**Purpose:** Delete all financial data for a specific user
**Dependencies:** @prisma/client, readline/promises
**Usage:** `npm run cleanup:user <user-id-or-email>`

#### `/scripts/create-test-user.ts` (NEW)
**Purpose:** Create test@wealth.com in Supabase Auth + Prisma
**Dependencies:** @supabase/supabase-js, @prisma/client
**Usage:** `npm run create:test-user`
**Returns:** User ID for seeding

#### `/scripts/seed-demo-data.ts` (ENHANCE EXISTING)
**Purpose:** Generate 6 months of realistic demo data
**Dependencies:** @prisma/client, date-fns
**Current:** 1 month, 25 transactions
**Target:** 6 months, 350-400 transactions, 72 budgets
**Usage:** `npm run seed:demo <user-id>`

#### `/prisma/schema.prisma` (REFERENCE)
**Purpose:** Understand foreign key relationships for deletion order
**Key Models:** User, Account, Transaction, Budget, Goal, Category

#### `/package.json` (MODIFY)
**Purpose:** Add npm scripts for cleanup, seeding, test user creation
**New Scripts:**
```json
{
  "cleanup:user": "tsx scripts/cleanup-user-data.ts",
  "seed:demo": "tsx scripts/seed-demo-data.ts",
  "create:test-user": "tsx scripts/create-test-user.ts",
  "setup:demo": "npm run create:test-user && npm run seed:demo",
  "reset:user": "npm run cleanup:user && npm run seed:demo"
}
```

### Key Dependencies

#### @supabase/supabase-js (v2.58.0, already installed)
**Why needed:** Supabase Auth Admin API for test user creation
**Key API:** `supabaseAdmin.auth.admin.createUser()`
**Config:** Requires SUPABASE_SERVICE_ROLE_KEY environment variable

#### readline/promises (Node.js built-in, v18+)
**Why needed:** Interactive confirmation prompts in cleanup script
**Key API:** `rl.question()` for user input
**Alternative:** Could use process.argv flags (--confirm) instead

#### date-fns (v3.6.0, already installed)
**Why needed:** Date manipulation for 6-month data generation
**Key Functions:** `subMonths()`, `startOfMonth()`, `eachDayOfInterval()`
**Alternative:** Could use vanilla Date methods (more verbose)

#### @prisma/client (v5.22.0, already installed)
**Why needed:** Database operations, transactions, cascading deletes
**Key Features:** Transaction support (`prisma.$transaction()`), type-safe queries
**Critical:** Deletion order must respect foreign keys

### Testing Infrastructure

#### Approach 1: Test on Real Data (Ahiya's Duplicates)
**Rationale:** Cleanup script can be validated immediately on existing duplicate data
**Process:**
1. Build cleanup script
2. Run on ahiya user (will delete 12 accounts, 75 transactions, etc.)
3. Verify: `npx tsx -e "import { PrismaClient } from '@prisma/client'; ...count query..."`
4. Success criteria: 0 accounts, 0 transactions, 0 budgets, 0 goals

**Risk Mitigation:** Dry-run mode first, then real deletion

#### Approach 2: Create Temporary Test User
**Rationale:** Test full flow (create user → seed → cleanup) without affecting real user
**Process:**
1. Create temp-test@example.com user
2. Seed with demo data
3. Test cleanup
4. Delete temp user entirely

**Trade-off:** More setup, but safer than testing on real user

#### Approach 3: Validation Queries
**Rationale:** After each script run, verify expected state
**Tools:**
```bash
# Quick validation one-liner
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'test@wealth.com' },
  include: { _count: { select: { accounts: true, transactions: true, budgets: true, goals: true } } }
}).then(u => { console.log(JSON.stringify(u, null, 2)); prisma.\$disconnect(); });
"
```

**Recommendation:** Combine approaches - dry-run on ahiya, full test on temp user, validation queries for confidence

## Questions for Planner

### Q1: Should cleanup script support bulk operations?
Currently designed for single user cleanup. Should we support:
- Cleanup all demo users at once?
- Cleanup users matching pattern (e.g., all test-* users)?
- Mass reset for development environments?

**Recommendation:** Start with single-user, can enhance later if needed

### Q2: How should we handle test user password management?
Current plan: Hardcoded password "demo1234" in script

**Options:**
- A) Hardcoded (simplest, fine for demo user)
- B) Environment variable (more secure, more setup)
- C) Random password, output to console (most secure, less convenient)

**Recommendation:** A (hardcoded) for demo user - it's meant to be easily accessible

### Q3: Should seed script be idempotent (re-runnable)?
Current design: Assumes clean slate (run after cleanup)

**Options:**
- A) Require cleanup first (fail if user has data)
- B) Auto-cleanup if data exists (destructive but convenient)
- C) Update/merge existing data (complex, fragile)

**Recommendation:** A with optional B via --force flag

### Q4: Should we preserve any data during cleanup?
Current plan: Delete ALL financial data (accounts, transactions, budgets, goals)

**Options:**
- Preserve user preferences (currency, timezone)?
- Preserve custom categories?
- Preserve anything else?

**Recommendation:** DELETE ALL financial data, preserve user account settings (already in User model, not deleted)

### Q5: What's the priority - data volume vs. realism?
If we have to choose between:
- A) 400 transactions with simple patterns
- B) 250 transactions with complex seasonal patterns

**Recommendation:** A - Volume showcases app better (charts, lists, pagination), patterns are nice-to-have

### Q6: Should we add onboarding-related fields to schema?
Iteration 6 is about onboarding + user separation. Do we need:
- User.onboardingCompletedAt (timestamp)
- User.isDemoUser (boolean flag)
- User.hasSeenTutorial (boolean)

**Recommendation:** YES - Add these fields to schema, populate in create-test-user script:
```typescript
{
  isDemoUser: true,
  onboardingCompletedAt: new Date(), // Skip onboarding for demo
  hasSeenTutorial: true
}
```

This enables different experiences for real vs. demo users.
