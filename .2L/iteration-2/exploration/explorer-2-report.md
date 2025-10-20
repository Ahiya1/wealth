# Explorer 2 Report: Runtime Error Investigation & Chrome DevTools MCP Usage

## Executive Summary

This report provides a comprehensive investigation strategy for identifying and fixing runtime errors in the Wealth Personal Finance Dashboard using Chrome DevTools MCP and browser-based debugging. The application builds successfully with zero TypeScript errors but requires runtime testing to identify browser console errors, environment variable issues, and client-server integration problems. This report outlines systematic approaches for error discovery, categorization, and resolution.

## Discoveries

### Chrome DevTools MCP Overview

**What is Chrome DevTools MCP?**
The Chrome DevTools Model Context Protocol (MCP) is a tool that allows AI assistants to interact with Chrome browser debugging tools programmatically. It enables:
- Reading browser console logs and errors
- Inspecting network requests and responses
- Examining DOM structure and component states
- Monitoring performance metrics
- Capturing JavaScript exceptions

**How to Use Chrome DevTools MCP:**

1. **Start the Application:**
   ```bash
   npm run dev
   # Application runs at http://localhost:3000
   ```

2. **Launch Chrome with DevTools MCP:**
   The MCP server connects to Chrome's debugging protocol (CDP) to access browser internals.

3. **Navigate to Pages:**
   - Landing page: http://localhost:3000
   - Sign in: http://localhost:3000/signin
   - Dashboard: http://localhost:3000/dashboard (requires auth)
   - Each feature page (accounts, transactions, budgets, etc.)

4. **Inspect Console Errors:**
   - Read console.error() messages
   - Capture uncaught exceptions
   - Review warning messages
   - Track network failures

### Playwright MCP for Automated Testing

**Playwright MCP Capabilities:**
- Automated browser navigation
- Screenshot capture for visual inspection
- Network request interception
- Console log collection
- Error assertion and validation

**Usage Pattern:**
```javascript
// Example Playwright script for error detection
await page.goto('http://localhost:3000/dashboard')
const errors = await page.evaluate(() => {
  return window.performance.getEntries()
    .filter(entry => entry.responseStatus >= 400)
})
```

### Current Application State Analysis

**Build Status:** ✅ SUCCESS
- TypeScript compilation: 0 errors
- Production build: Completes successfully
- All 15 routes compile
- Tests: 80/88 passing (90.9%)

**Known Potential Issues:**
Based on codebase analysis, these runtime errors are likely:

1. **Missing .env.local File**
   - Impact: HIGH
   - Symptoms: Database connection failures, auth errors
   - Required variables not set

2. **Environment Variable Issues**
   - DATABASE_URL not configured
   - NEXTAUTH_SECRET missing
   - Plaid credentials absent
   - Anthropic API key not set

3. **Database Connection Errors**
   - Prisma client may fail to connect
   - Migration not run
   - Database not seeded with default categories

4. **NextAuth Session Errors**
   - NEXTAUTH_URL misconfiguration
   - Google OAuth credentials invalid
   - JWT secret generation issues

5. **tRPC Hydration Mismatches**
   - Server/client data serialization
   - Superjson transformer issues
   - Date/Decimal type handling

## Patterns Identified

### Pattern 1: Environment Variable Validation Errors

**Description:** Missing or invalid environment variables cause runtime failures despite successful builds.

**Symptoms:**
```
Error: DATABASE_URL environment variable is not set
PrismaClientInitializationError: Can't reach database server
NextAuth: NEXTAUTH_SECRET is required
```

**Detection Method:**
- Check browser console on page load
- Look for API endpoint 500 errors
- Examine network tab for failed requests

**Prevention:**
```typescript
// Add environment validation at app startup
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  // ... other required vars
})

export const env = envSchema.parse(process.env)
```

**Recommendation:** Implement environment validation middleware that runs before app initialization.

### Pattern 2: Client-Server Hydration Mismatches

**Description:** React hydration errors occur when server-rendered HTML differs from client-side React output.

**Symptoms:**
```
Warning: Text content did not match. Server: "..." Client: "..."
Hydration failed because the initial UI does not match
```

**Common Causes in This App:**
- Date formatting differences (server UTC vs client timezone)
- Decimal number rendering (Prisma Decimal vs JS number)
- Conditional rendering based on client-only state
- Random values or timestamps in SSR components

**Detection:**
- Look for red hydration warnings in console
- Check for "Hydration failed" errors
- Inspect component diffs in React DevTools

**Fix Strategy:**
```tsx
// Use client-only rendering for dynamic content
'use client'
import { useEffect, useState } from 'react'

function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  
  if (!mounted) return null
  return <div>{/* client-only content */}</div>
}
```

### Pattern 3: tRPC Client Configuration Errors

**Description:** tRPC endpoint fails due to improper client setup or URL configuration.

**Symptoms:**
```
Failed to fetch: POST http://localhost:3000/api/trpc/...
TRPCClientError: fetch failed
CORS errors (if deployed)
```

**Current Implementation Check:**
File: `/src/app/providers.tsx`
```tsx
httpBatchLink({
  url: '/api/trpc',  // Relative URL - good for SSR
  transformer: superjson,
})
```

**Potential Issues:**
- Base URL not set correctly in production
- Superjson transformer incompatibility
- Batch link configuration errors

**Recommendation:** Add error boundaries around tRPC calls and provide fallback UI.

### Pattern 4: NextAuth Session Provider Errors

**Description:** NextAuth session context not available in components.

**Symptoms:**
```
Error: useSession must be wrapped in <SessionProvider>
Session is null when it should exist
Infinite redirect loops
```

**Current Implementation:**
File: `/src/app/providers.tsx`
```tsx
<SessionProvider>
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </trpc.Provider>
</SessionProvider>
```

**Validation:**
- SessionProvider wraps all components ✅
- Proper nesting order ✅
- Client component directive present ✅

**Potential Runtime Issues:**
- NEXTAUTH_URL not matching deployment URL
- Session cookies not being set (domain mismatch)
- JWT secret changes between restarts

### Pattern 5: Prisma Client Initialization Errors

**Description:** Prisma client fails to initialize or connect to database.

**Symptoms:**
```
PrismaClientInitializationError: Can't reach database server
Error: @prisma/client did not initialize yet
Connection timeout errors
```

**Current Implementation:**
File: `/src/lib/prisma.ts` (expected pattern)
```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Common Errors:**
- Database URL malformed
- PostgreSQL not running
- Database not created
- Migrations not applied: `npx prisma migrate dev`
- No seed data: `npx prisma db seed`

### Pattern 6: Plaid Integration Errors

**Description:** Plaid SDK initialization fails or Link component doesn't load.

**Symptoms:**
```
Error: PLAID_CLIENT_ID is required
Plaid Link failed to load
Invalid Plaid credentials
```

**Expected Behavior:**
- Plaid should gracefully degrade if credentials missing
- Show placeholder UI for Plaid Link button
- Don't block other functionality

**Recommendation:** Add feature flags for optional integrations like Plaid.

## Complexity Assessment

### High Complexity Areas - Require Systematic Investigation

#### 1. Environment Variable Configuration (Priority: CRITICAL)
**Complexity:** HIGH
**Why it's complex:**
- 10+ required environment variables
- Different values for development vs production
- Security-sensitive credentials (secrets, API keys)
- Database URL format must be exact
- OAuth redirect URLs must match deployment

**Error Discovery Strategy:**
1. Create comprehensive .env.local from .env.example
2. Generate all required secrets:
   ```bash
   # NEXTAUTH_SECRET
   openssl rand -base64 32
   
   # ENCRYPTION_KEY
   openssl rand -hex 32
   ```
3. Test each service independently:
   - Database connection: `npx prisma db push`
   - NextAuth: Navigate to /signin, check console
   - Plaid: Use sandbox credentials
   - Anthropic: May skip for initial testing

**Builder Splits Needed:** 1 focused builder for environment setup

#### 2. Database Connection & Migration (Priority: CRITICAL)
**Complexity:** HIGH
**Why it's complex:**
- Requires PostgreSQL running locally or Supabase
- Schema must be synchronized
- Default categories must be seeded
- Connection pooling issues in development

**Error Discovery Strategy:**
1. Start local PostgreSQL or Supabase: `supabase start`
2. Apply migrations: `npx prisma migrate dev`
3. Generate Prisma client: `npx prisma generate`
4. Seed database: `npx prisma db seed`
5. Verify with Prisma Studio: `npx prisma studio`

**Expected Errors:**
- "Can't reach database server" - DB not running
- "Table does not exist" - Migrations not applied
- "Category not found" - Database not seeded

**Builder Splits Needed:** Covered in Iteration 2 requirements (Supabase integration)

#### 3. NextAuth Authentication Flow (Priority: HIGH)
**Complexity:** MEDIUM-HIGH
**Why it's complex:**
- JWT token generation and validation
- Google OAuth callback URL configuration
- Session cookie domain settings
- Protected route middleware

**Error Discovery Strategy:**
1. Test email/password sign up:
   - Navigate to /signup
   - Fill form, submit
   - Check console for errors
   - Verify database User record created
2. Test email/password sign in:
   - Navigate to /signin
   - Enter credentials
   - Should redirect to /dashboard
3. Test Google OAuth:
   - Click "Sign in with Google"
   - Check for redirect errors
   - Verify OAuth flow completes

**Expected Errors:**
- "NEXTAUTH_SECRET is required"
- "NEXTAUTH_URL does not match"
- "Google OAuth: Invalid client credentials"
- "Failed to create session"

**Builder Splits Needed:** 1 builder if major auth refactoring needed

#### 4. tRPC Endpoint Integration (Priority: HIGH)
**Complexity:** MEDIUM
**Why it's complex:**
- 8 routers with 50+ procedures
- Session context required for protected procedures
- Superjson serialization of Decimal/Date types
- React Query cache management

**Error Discovery Strategy:**
1. Open browser DevTools Network tab
2. Navigate to dashboard (triggers tRPC calls)
3. Filter by `/api/trpc`
4. Inspect failed requests:
   - 401 errors: Authentication issue
   - 500 errors: Server-side logic error
   - Network errors: tRPC config issue
5. Check browser console for tRPC errors
6. Verify payload/response format

**Expected Errors:**
- "TRPCClientError: UNAUTHORIZED" - Session missing
- "Input validation failed" - Zod schema mismatch
- "Prisma query failed" - Database issue
- "Failed to serialize" - Superjson problem

**Builder Splits Needed:** None (fixing individual procedures)

### Medium Complexity Areas

#### 5. Client Component Hydration (Priority: MEDIUM)
**Complexity:** MEDIUM
**Why it's complex:**
- Mix of server and client components
- Date/number formatting differences
- Conditional rendering based on session

**Error Discovery Strategy:**
1. Load each page and check for hydration warnings
2. Look for text content mismatches
3. Inspect components with dates, currency, or user-specific data
4. Test with React DevTools Profiler

**Expected Errors:**
- "Text content did not match" - formatting issue
- "Hydration failed" - conditional rendering
- "useEffect in server component" - wrong directive

**Fix Strategy:**
- Add 'use client' directive where needed
- Use client-only wrappers for dynamic content
- Ensure consistent date/number formatting

#### 6. UI Component Library Integration (Priority: MEDIUM)
**Complexity:** LOW-MEDIUM
**Why it's complex:**
- shadcn/ui components with Radix primitives
- Tailwind CSS class conflicts
- Dark mode support (if added)

**Error Discovery Strategy:**
1. Check console for React prop warnings
2. Verify all Radix components render correctly
3. Test interactive components (dialogs, dropdowns, etc.)
4. Check for styling issues

**Expected Errors:**
- "Invalid prop type" - component API mismatch
- "Component not found" - missing import
- Styling glitches - Tailwind class conflicts

### Low Complexity Areas

#### 7. Static Pages & Routing (Priority: LOW)
**Complexity:** LOW
**Why straightforward:**
- Next.js App Router handles routing
- No dynamic imports with errors
- Clear file-based structure

**Error Discovery Strategy:**
1. Navigate to all pages via browser
2. Verify routes resolve correctly
3. Check for 404 errors

#### 8. UI/UX Polish (Priority: LOW)
**Complexity:** LOW
**Why straightforward:**
- Visual consistency issues
- Loading states
- Error messages
- Responsive layout

**Error Discovery Strategy:**
1. Manual visual inspection
2. Test on mobile viewport
3. Verify loading indicators appear
4. Check error message clarity

## Technology Recommendations

### Runtime Error Detection Tools

#### Primary Tools (Already Available)

1. **Chrome DevTools MCP**
   - **Purpose:** Real-time browser console inspection
   - **Capabilities:**
     - Console error/warning collection
     - Network request monitoring
     - Performance profiling
     - Component inspection
   - **Recommendation:** Use as primary error discovery tool

2. **Playwright MCP**
   - **Purpose:** Automated browser testing and error collection
   - **Capabilities:**
     - Programmatic navigation
     - Screenshot capture
     - Console log collection
     - Network interception
   - **Recommendation:** Use for regression testing after fixes

3. **Next.js Development Server**
   - **Built-in Features:**
     - Server-side error overlay
     - Fast Refresh error reporting
     - Detailed error stack traces
   - **Recommendation:** Monitor terminal output during dev server

#### Supporting Tools

4. **React DevTools Browser Extension**
   - **Purpose:** Component tree inspection
   - **Capabilities:**
     - Component props/state inspection
     - Performance profiling
     - Hook debugging
   - **Recommendation:** Install for component-level debugging

5. **Prisma Studio**
   - **Purpose:** Database inspection
   - **Command:** `npx prisma studio`
   - **Capabilities:**
     - Browse database records
     - Verify data integrity
     - Test queries
   - **Recommendation:** Use to verify database state

### Error Logging Strategy

#### Development Environment

**Approach:** Verbose logging with stack traces

```typescript
// src/lib/logger.ts
export const logger = {
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error)
    if (error instanceof Error) {
      console.error(error.stack)
    }
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data)
  },
  info: (message: string, data?: unknown) => {
    console.info(`[INFO] ${message}`, data)
  },
}
```

**Usage:**
```typescript
try {
  await prisma.user.create(data)
} catch (error) {
  logger.error('Failed to create user', error)
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
}
```

#### Production Environment

**Approach:** Structured error tracking (future enhancement)

**Recommended Tools:**
- Sentry (error tracking)
- LogRocket (session replay)
- Vercel Analytics (performance monitoring)

**Not required for Iteration 2, but plan for future.**

## Integration Points

### Browser DevTools ↔ Application

**Connection:** Chrome DevTools Protocol (CDP)
**Purpose:** Inspect runtime errors in browser environment

**Error Categories to Monitor:**

1. **Console Errors (Red)**
   - Uncaught exceptions
   - Failed network requests
   - React errors
   - Priority: CRITICAL

2. **Console Warnings (Yellow)**
   - React hydration warnings
   - Deprecation notices
   - Performance warnings
   - Priority: HIGH

3. **Network Failures (Red in Network tab)**
   - API endpoint errors (500, 401, 404)
   - CORS issues
   - Timeout errors
   - Priority: CRITICAL

4. **React Component Errors**
   - Rendering errors
   - Hook errors
   - State management issues
   - Priority: HIGH

### Playwright ↔ Application

**Connection:** Browser automation via Playwright API
**Purpose:** Automated error detection and regression testing

**Test Script Template:**
```typescript
// tests/runtime-errors.spec.ts
import { test, expect } from '@playwright/test'

test('dashboard loads without console errors', async ({ page }) => {
  const errors: string[] = []
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  await page.goto('http://localhost:3000/dashboard')
  await page.waitForLoadState('networkidle')
  
  expect(errors).toHaveLength(0)
})

test('all main pages accessible', async ({ page }) => {
  const pages = [
    '/',
    '/signin',
    '/signup',
    '/dashboard',
    '/accounts',
    '/transactions',
    '/budgets',
    '/analytics',
    '/goals',
  ]
  
  for (const path of pages) {
    const response = await page.goto(`http://localhost:3000${path}`)
    expect(response?.status()).toBeLessThan(400)
  }
})
```

### Database ↔ Application

**Connection:** Prisma Client via DATABASE_URL
**Purpose:** Detect database connection and query errors

**Error Detection Strategy:**
1. Start database (PostgreSQL or Supabase)
2. Run migrations: `npx prisma migrate dev`
3. Seed database: `npx prisma db seed`
4. Test connection:
   ```bash
   npx prisma studio
   # Should open database browser
   ```
5. Monitor application logs for Prisma errors

**Common Database Errors:**
```
PrismaClientInitializationError: Can't reach database server
  → Database not running or wrong URL

PrismaClientKnownRequestError: Table does not exist
  → Migrations not applied

Foreign key constraint failed
  → Referential integrity issue (seed data problem)

Unique constraint failed
  → Duplicate data insertion
```

## Risks & Challenges

### Technical Risks

#### Risk 1: Missing Environment Variables Block All Functionality
**Impact:** CRITICAL
**Likelihood:** HIGH (no .env.local exists yet)
**Mitigation:**
1. Create comprehensive .env.local setup checklist
2. Add environment variable validation at app startup
3. Provide clear error messages for missing variables
4. Document each variable's purpose and how to obtain it

**Detection Method:**
- Application won't start or shows blank pages
- Console shows environment variable errors
- tRPC endpoints return 500 errors

#### Risk 2: Database Not Configured
**Impact:** CRITICAL
**Likelihood:** HIGH (Supabase not set up yet per Iteration 2)
**Mitigation:**
1. Follow Supabase integration steps systematically
2. Test database connection before proceeding
3. Verify migrations applied successfully
4. Ensure seed data loaded

**Detection Method:**
- Prisma errors in console
- All data queries fail
- Unable to sign up/sign in

#### Risk 3: NextAuth Configuration Errors
**Impact:** HIGH
**Likelihood:** MEDIUM
**Mitigation:**
1. Generate strong NEXTAUTH_SECRET
2. Set NEXTAUTH_URL to match deployment
3. Test Google OAuth with valid credentials
4. Verify session cookies are set

**Detection Method:**
- Cannot sign in/sign up
- Session is always null
- Redirect loops on protected routes
- Google OAuth fails with error

#### Risk 4: tRPC Hydration or Serialization Errors
**Impact:** MEDIUM
**Likelihood:** MEDIUM
**Mitigation:**
1. Ensure superjson transformer on both client and server
2. Test Decimal and Date serialization
3. Add error boundaries around tRPC calls
4. Verify React Query configuration

**Detection Method:**
- "Failed to serialize" errors
- Data displays incorrectly (dates, numbers)
- Hydration warnings in console
- tRPC mutations fail silently

#### Risk 5: Plaid Integration Fails
**Impact:** LOW (Plaid is optional for basic testing)
**Likelihood:** HIGH (no credentials yet)
**Mitigation:**
1. Use Plaid sandbox credentials
2. Implement graceful degradation
3. Show manual account entry as alternative
4. Add feature flag to disable Plaid

**Detection Method:**
- Plaid Link button doesn't work
- "Invalid Plaid credentials" error
- Plaid API calls return 401

### Complexity Risks

#### Risk 6: Too Many Errors to Fix in One Session
**Impact:** HIGH (blocks completion)
**Likelihood:** MEDIUM
**Mitigation:**
1. Categorize errors by priority (Critical → High → Medium → Low)
2. Fix critical errors first (environment, database, auth)
3. Create sub-builders for complex error categories
4. Document unfixed low-priority errors for future

**Builder Split Strategy:**
- Builder 1: Environment & Database Setup
- Builder 2: Authentication Fixes
- Builder 3: tRPC & API Fixes
- Builder 4: UI Component Fixes

#### Risk 7: Errors Cascade (Fixing One Reveals More)
**Impact:** MEDIUM
**Likelihood:** HIGH
**Mitigation:**
1. Fix errors in dependency order:
   - Environment → Database → Auth → API → UI
2. Re-test after each category fixed
3. Use systematic testing approach
4. Document new errors discovered

**Detection Method:**
- Fixing database errors reveals auth errors
- Fixing auth errors reveals tRPC errors
- Each fix uncovers 2-3 new issues

## Recommendations for Planner

### 1. Prioritize Environment Setup as First Task
**Rationale:** Every other feature depends on proper environment configuration. Without DATABASE_URL, NEXTAUTH_SECRET, etc., the app cannot function.

**Action Items:**
- Create .env.local setup guide
- Generate all required secrets
- Validate environment before proceeding
- Test database connection first

**Estimated Time:** 15-30 minutes

### 2. Use Supabase for Database (Per Iteration 2 Requirements)
**Rationale:** Supabase provides:
- Free PostgreSQL database
- Built-in database GUI (alternative to Prisma Studio)
- Simple local development setup
- Easy migration to production

**Action Items:**
- Install Supabase CLI: `npm install supabase --save-dev`
- Initialize: `npx supabase init`
- Start local instance: `npx supabase start`
- Configure DATABASE_URL from Supabase output

**Estimated Time:** 20-30 minutes

### 3. Implement Systematic Error Discovery Process
**Rationale:** Ad-hoc error fixing is inefficient. Use structured approach.

**Recommended Flow:**
1. **Environment Validation** → Fix all env var issues
2. **Database Connection** → Ensure Prisma connects
3. **Application Start** → Fix any startup errors
4. **Page-by-Page Testing** → Navigate to each route, collect errors
5. **Error Categorization** → Group by type (auth, tRPC, UI, etc.)
6. **Priority-Based Fixing** → Critical → High → Medium → Low

**Estimated Time:** 1-2 hours total

### 4. Create Error Discovery Checklist
**Rationale:** Ensures no pages/features are missed during testing.

**Checklist Template:**

**Public Pages:**
- [ ] Landing page (/)
- [ ] Sign in (/signin)
- [ ] Sign up (/signup)
- [ ] Reset password (/reset-password)

**Protected Pages (Require Auth):**
- [ ] Dashboard (/dashboard)
- [ ] Accounts list (/accounts)
- [ ] Account detail (/accounts/[id])
- [ ] Transactions list (/transactions)
- [ ] Transaction detail (/transactions/[id])
- [ ] Budgets (/budgets)
- [ ] Budget detail (/budgets/[month])
- [ ] Analytics (/analytics)
- [ ] Goals list (/goals)
- [ ] Goal detail (/goals/[id])
- [ ] Settings - Categories (/settings/categories)

**User Flows:**
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth (if credentials available)
- [ ] Create manual account
- [ ] Add manual transaction
- [ ] Create budget
- [ ] Create goal
- [ ] View analytics charts

**Estimated Time:** 30-45 minutes to complete checklist

### 5. Use Chrome DevTools MCP for Real-Time Error Collection
**Rationale:** Automated error collection is more reliable than manual console checking.

**Implementation:**
- Connect Chrome DevTools MCP to running application
- Navigate through all pages programmatically
- Collect console errors, warnings, and network failures
- Generate error report with stack traces

**Estimated Time:** 15-20 minutes setup + automated collection

### 6. Implement Error Boundaries for Graceful Degradation
**Rationale:** Prevent single component errors from crashing entire pages.

**Pattern:**
```tsx
// src/components/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }
    return this.props.children
  }
}
```

**Estimated Time:** 30 minutes to implement and wrap critical components

### 7. Plan for Iterative Error Fixing
**Rationale:** Not all errors need to be fixed immediately. Some are low-priority polish items.

**Priority Levels:**
- **P0 (Critical):** Blocks core functionality (auth, database, routing)
- **P1 (High):** Major features broken (transactions, budgets, goals)
- **P2 (Medium):** Minor features or edge cases (analytics charts, exports)
- **P3 (Low):** Polish, warnings, non-blocking issues

**Recommendation:**
- Fix P0 and P1 in Iteration 2
- Document P2 and P3 for future iterations
- Don't let perfect be the enemy of good

## Error Categorization Framework

### Error Classification System

#### Category 1: Environment & Configuration Errors
**Severity:** CRITICAL
**Examples:**
- Missing DATABASE_URL
- Invalid NEXTAUTH_SECRET
- Malformed environment variables
- Missing required credentials

**Detection:**
- Application fails to start
- Immediate errors on page load
- All features fail

**Fix Time:** 5-30 minutes per variable

#### Category 2: Database & Prisma Errors
**Severity:** CRITICAL
**Examples:**
- "Can't reach database server"
- "Table does not exist"
- "Prisma client not generated"
- Foreign key constraint violations

**Detection:**
- Database queries fail
- Prisma errors in console
- Cannot create/read data

**Fix Time:** 10-45 minutes (setup + testing)

#### Category 3: Authentication & Session Errors
**Severity:** CRITICAL
**Examples:**
- NextAuth session is null
- JWT token invalid
- Google OAuth redirect fails
- Infinite redirect loops

**Detection:**
- Cannot sign in/sign up
- Protected routes inaccessible
- Session always null in components

**Fix Time:** 15-60 minutes per auth flow

#### Category 4: tRPC & API Errors
**Severity:** HIGH
**Examples:**
- "TRPCClientError: UNAUTHORIZED"
- "Input validation failed"
- "Failed to serialize response"
- Network request failures

**Detection:**
- API calls fail in Network tab
- tRPC errors in console
- Data doesn't load on pages

**Fix Time:** 5-20 minutes per endpoint

#### Category 5: React Component Errors
**Severity:** MEDIUM-HIGH
**Examples:**
- "Hydration failed"
- "useEffect in server component"
- "Invalid hook call"
- Component render errors

**Detection:**
- Pages don't render correctly
- Hydration warnings in console
- UI elements missing

**Fix Time:** 10-30 minutes per component

#### Category 6: UI/Styling Errors
**Severity:** LOW-MEDIUM
**Examples:**
- Tailwind class conflicts
- Missing icons
- Layout issues
- Responsive design problems

**Detection:**
- Visual inspection
- Elements not styled correctly
- Mobile view broken

**Fix Time:** 5-15 minutes per issue

#### Category 7: External Integration Errors
**Severity:** LOW (if optional)
**Examples:**
- Plaid Link fails to load
- Claude API errors
- Email sending fails (Resend)

**Detection:**
- Integration-specific features broken
- Console shows API errors
- Graceful degradation not working

**Fix Time:** 15-45 minutes per integration

#### Category 8: Performance & Optimization Warnings
**Severity:** LOW
**Examples:**
- "Image not optimized"
- "Bundle size warning"
- "Slow render warning"
- Unused dependencies

**Detection:**
- Next.js build warnings
- Lighthouse audit results
- Performance profiling

**Fix Time:** Variable (not critical for MVP)

## Error Discovery Plan

### Phase 1: Pre-Flight Checks (15 minutes)

**Objective:** Ensure basic environment is ready

**Steps:**

1. **Verify Node.js and npm versions**
   ```bash
   node --version  # Should be 18.x or 20.x
   npm --version   # Should be 9.x or 10.x
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Verify no errors
   ```

3. **Create .env.local file**
   ```bash
   cp .env.example .env.local
   # Edit with real values
   ```

4. **Generate secrets**
   ```bash
   # NEXTAUTH_SECRET
   openssl rand -base64 32
   
   # ENCRYPTION_KEY
   openssl rand -hex 32
   ```

5. **Setup Supabase (Iteration 2 requirement)**
   ```bash
   npm install supabase --save-dev
   npx supabase init
   npx supabase start
   # Copy DATABASE_URL from output
   ```

6. **Run database migrations**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

7. **Verify build still succeeds**
   ```bash
   npm run build
   # Should complete with 0 errors
   ```

**Exit Criteria:**
- All dependencies installed
- .env.local created with all required variables
- Database running and seeded
- Build succeeds

### Phase 2: Development Server Startup (10 minutes)

**Objective:** Start application and identify startup errors

**Steps:**

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Monitor terminal output**
   - Look for startup errors
   - Verify "Ready on http://localhost:3000"
   - Check for Prisma connection logs
   - Note any warnings

3. **Test server is responding**
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

**Exit Criteria:**
- Server starts without errors
- Application accessible at localhost:3000
- No critical errors in terminal

### Phase 3: Page-by-Page Error Collection (30 minutes)

**Objective:** Navigate to every page and collect console errors

**Method:** Use Chrome DevTools MCP or manual inspection

**Testing Order:**

**Tier 1: Public Pages (No Auth Required)**
1. Landing page: http://localhost:3000
   - Check console for errors
   - Verify page renders
   - Note any warnings

2. Sign Up: http://localhost:3000/signup
   - Load page
   - Check console
   - Test form submission (creates test user)
   - Verify redirect after sign up

3. Sign In: http://localhost:3000/signin
   - Load page
   - Check console
   - Test credential sign in
   - Test Google OAuth button (may fail if no creds)
   - Verify redirect to dashboard

4. Reset Password: http://localhost:3000/reset-password
   - Load page
   - Check console
   - Test form (may not send email without Resend creds)

**Tier 2: Protected Pages (Auth Required)**

*Prerequisites: Sign in first to create session*

5. Dashboard: http://localhost:3000/dashboard
   - **CRITICAL PAGE**
   - Verify dashboard cards load
   - Check for tRPC errors
   - Note missing data or failed API calls
   - Inspect Network tab for failed requests

6. Accounts: http://localhost:3000/accounts
   - Verify account list loads (may be empty)
   - Test "Add Account" button
   - Test account creation form
   - Check Plaid Link button (may fail)

7. Transactions: http://localhost:3000/transactions
   - Verify transaction list loads (may be empty)
   - Test "Add Transaction" button
   - Test filters and search
   - Check categorization features

8. Budgets: http://localhost:3000/budgets
   - Verify budget list loads
   - Test "Create Budget" button
   - Check budget progress bars
   - Test month selector

9. Analytics: http://localhost:3000/analytics
   - **CHART-HEAVY PAGE**
   - Verify charts render (Recharts)
   - Check for data aggregation errors
   - Test date range filters

10. Goals: http://localhost:3000/goals
    - Verify goal list loads
    - Test "Create Goal" button
    - Check goal progress cards

11. Settings - Categories: http://localhost:3000/settings/categories
    - Verify category list loads (seed data)
    - Test "Add Category" button
    - Check category editing

**For Each Page, Collect:**
- Console errors (red)
- Console warnings (yellow)
- Failed network requests (Network tab)
- React errors/warnings
- Hydration mismatches
- Visual issues (take screenshots)

**Data Collection Template:**
```markdown
## Page: [Page Name]
**URL:** [URL]
**Status:** ✅ Loads / ❌ Error / ⚠️ Warning

### Console Errors:
- [Error 1]
- [Error 2]

### Console Warnings:
- [Warning 1]

### Network Failures:
- [Failed request]

### Visual Issues:
- [Issue description]

### Notes:
- [Additional observations]
```

**Exit Criteria:**
- All 11+ pages tested
- All errors documented
- Screenshots captured for visual issues
- Error log created

### Phase 4: User Flow Testing (20 minutes)

**Objective:** Test critical user journeys end-to-end

**Flow 1: Sign Up & Onboarding**
1. Sign up with email/password
2. Verify redirect to dashboard
3. Check if default categories loaded
4. Test creating first account
5. Test adding first transaction

**Flow 2: Budget Management**
1. Navigate to budgets
2. Create budget for "Groceries"
3. Verify budget appears in list
4. Navigate back to dashboard
5. Check if budget summary updated

**Flow 3: Goal Tracking**
1. Navigate to goals
2. Create savings goal
3. Test adding progress to goal
4. Verify progress bar updates
5. Check completion celebration

**Flow 4: Analytics & Insights**
1. Navigate to analytics
2. Verify charts render
3. Test date range selection
4. Export transaction data (CSV)
5. Check download works

**For Each Flow, Document:**
- Steps completed successfully
- Steps that failed
- Errors encountered
- User experience issues

**Exit Criteria:**
- All critical flows tested
- Blockers identified
- Happy path vs error path documented

### Phase 5: Error Categorization & Prioritization (15 minutes)

**Objective:** Organize all discovered errors for fixing

**Process:**

1. **Aggregate all errors from Phases 2-4**
2. **Remove duplicates**
3. **Categorize by type:**
   - Environment
   - Database
   - Authentication
   - tRPC/API
   - React/UI
   - External integrations
   - Performance/Warnings

4. **Assign priority:**
   - P0: Blocks all functionality (app won't start, database connection)
   - P1: Blocks major features (auth, transactions, budgets)
   - P2: Breaks minor features (analytics, exports)
   - P3: Warnings and polish

5. **Estimate fix time for each error**

6. **Create fix plan:**
   ```markdown
   ## Critical (P0) - Fix First
   1. [Error] - Estimated: [time] - Assigned: [builder]
   
   ## High (P1) - Fix Second
   1. [Error] - Estimated: [time] - Assigned: [builder]
   
   ## Medium (P2) - Fix If Time Permits
   1. [Error] - Estimated: [time] - Assigned: [builder]
   
   ## Low (P3) - Document for Future
   1. [Error] - Estimated: [time] - Assigned: [future iteration]
   ```

**Exit Criteria:**
- All errors categorized
- Priorities assigned
- Fix order determined
- Builders can start work

## Fix Strategy

### Systematic Error Resolution Approach

#### Step 1: Environment & Database (Critical Path)

**Builder Focus:** Foundation errors that block everything else

**Tasks:**
1. Create and validate .env.local
2. Setup Supabase local instance
3. Apply database migrations
4. Seed default categories
5. Test Prisma connection

**Validation:**
```bash
# Test database connection
npx prisma studio
# Should open without errors

# Verify seed data
# Check that categories table has 15+ default categories
```

**Expected Errors Fixed:**
- DATABASE_URL errors
- Prisma connection failures
- "Table does not exist"
- Missing default categories

**Success Criteria:**
- Database accessible
- Migrations applied
- Seed data loaded
- Prisma Studio opens successfully

#### Step 2: Authentication Setup

**Builder Focus:** Auth errors blocking protected routes

**Tasks:**
1. Verify NEXTAUTH_SECRET set correctly
2. Test email/password sign up
3. Test email/password sign in
4. Test session persistence
5. Configure Google OAuth (if credentials available)

**Validation:**
```typescript
// Test in browser console
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)
// Should return session object if signed in
```

**Expected Errors Fixed:**
- "NEXTAUTH_SECRET required"
- Session is null
- Cannot sign up/in
- Redirect loops

**Success Criteria:**
- Can sign up new user
- Can sign in with credentials
- Session persists across page reloads
- Protected routes accessible

#### Step 3: tRPC Endpoints Testing

**Builder Focus:** API connectivity and data fetching

**Tasks:**
1. Test each tRPC router systematically:
   - auth.router
   - categories.router
   - accounts.router
   - transactions.router
   - budgets.router
   - analytics.router
   - goals.router
   - plaid.router
2. Verify protected procedures require session
3. Test input validation (Zod schemas)
4. Check Decimal/Date serialization

**Validation:**
Open browser DevTools → Network tab → Filter: `/api/trpc`
- All requests should return 200 OK
- No 401 Unauthorized (unless testing without session)
- No 500 Internal Server Error
- Response payloads valid JSON

**Expected Errors Fixed:**
- "TRPCClientError: UNAUTHORIZED"
- "Input validation failed"
- "Failed to serialize"
- Network failures

**Success Criteria:**
- All tRPC procedures respond correctly
- Dashboard loads data without errors
- CRUD operations work (create account, add transaction, etc.)

#### Step 4: React Component Hydration

**Builder Focus:** Client-server rendering consistency

**Tasks:**
1. Fix hydration warnings in console
2. Add 'use client' where needed
3. Ensure consistent date/number formatting
4. Fix conditional rendering issues

**Common Patterns:**
```tsx
// Pattern 1: Client-only rendering
'use client'
import { useEffect, useState } from 'react'

export function ClientComponent() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <div>{/* client content */}</div>
}

// Pattern 2: Consistent formatting
// Use same format string on server and client
import { format } from 'date-fns'
const formatted = format(date, 'MMM d, yyyy') // Same everywhere
```

**Expected Errors Fixed:**
- "Hydration failed"
- "Text content did not match"
- "useEffect in server component"

**Success Criteria:**
- Zero hydration warnings in console
- All pages render consistently
- No client-server mismatches

#### Step 5: UI Component Polish

**Builder Focus:** Visual and interaction issues

**Tasks:**
1. Fix missing icons
2. Resolve Tailwind class conflicts
3. Ensure loading states display
4. Verify error messages are clear
5. Test mobile responsiveness

**Expected Errors Fixed:**
- Styling glitches
- Missing components
- Broken layouts
- Icon display issues

**Success Criteria:**
- All UI components render correctly
- No visual bugs
- Loading indicators work
- Error messages are user-friendly

#### Step 6: External Integrations (Optional)

**Builder Focus:** Plaid, Claude, Resend integrations

**Tasks:**
1. Test Plaid Link (if credentials available)
   - Use sandbox mode
   - Test account connection flow
   - Verify transaction import
2. Test AI categorization (if Anthropic key available)
   - Add transaction without category
   - Trigger auto-categorization
   - Verify category assigned
3. Test email sending (if Resend key available)
   - Request password reset
   - Check email delivery

**Expected Behavior:**
- Graceful degradation if credentials missing
- Clear error messages
- Feature flags or placeholder UI

**Success Criteria:**
- Integrations work if credentials provided
- App doesn't crash if credentials missing
- Alternative workflows available

### Error-Specific Fix Patterns

#### Pattern: "DATABASE_URL environment variable is not set"

**Fix:**
```bash
# In .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Validation:**
```bash
npx prisma db push
# Should succeed
```

#### Pattern: "NextAuth: NEXTAUTH_SECRET is required"

**Fix:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="[generated-secret]"
NEXTAUTH_URL="http://localhost:3000"
```

**Validation:**
Navigate to /signin, check console - no NextAuth errors

#### Pattern: "Hydration failed because the initial UI does not match"

**Fix:**
```tsx
// Before (causes hydration error)
export default function Component() {
  const now = new Date().toLocaleString() // Different on server/client
  return <div>{now}</div>
}

// After (fixed)
'use client'
export default function Component() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  
  if (!mounted) return <div>Loading...</div>
  
  const now = new Date().toLocaleString()
  return <div>{now}</div>
}
```

#### Pattern: "TRPCClientError: UNAUTHORIZED"

**Fix:**
Ensure session is available in tRPC context

```typescript
// Verify in src/server/api/trpc.ts
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { session: ctx.session } })
})
```

**Validation:**
Check that `createTRPCContext` calls `auth()` and returns session

#### Pattern: Prisma query fails with "Table does not exist"

**Fix:**
```bash
# Apply migrations
npx prisma migrate dev --name init

# Or push schema directly (dev only)
npx prisma db push
```

**Validation:**
```bash
npx prisma studio
# Should show all tables
```

## Testing Approach

### Manual Testing Checklist

**Phase 1: Smoke Tests (5 minutes)**
- [ ] Application starts without errors
- [ ] Landing page loads
- [ ] Sign up page loads
- [ ] Sign in page loads
- [ ] No console errors on public pages

**Phase 2: Authentication Tests (10 minutes)**
- [ ] Can create new user account
- [ ] Can sign in with email/password
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to sign in when not authenticated
- [ ] Dashboard loads after sign in
- [ ] Sign out works correctly

**Phase 3: Feature Tests (20 minutes)**
- [ ] Can create manual account
- [ ] Can add manual transaction
- [ ] Transaction appears in list
- [ ] Can create budget
- [ ] Budget progress calculates correctly
- [ ] Can create goal
- [ ] Goal progress updates
- [ ] Analytics page loads with charts
- [ ] Can export transactions to CSV

**Phase 4: Error Handling Tests (10 minutes)**
- [ ] Invalid sign in shows error message
- [ ] Form validation works (required fields)
- [ ] Network errors handled gracefully
- [ ] Loading states display correctly
- [ ] Error boundaries catch component errors

**Phase 5: Integration Tests (15 minutes)**
- [ ] Plaid Link button renders (even if non-functional)
- [ ] AI categorization triggers (or shows placeholder)
- [ ] Email sending attempts (or shows message if not configured)
- [ ] Database queries execute without errors
- [ ] tRPC endpoints respond correctly

### Automated Testing with Playwright

**Setup:**
```bash
npm install @playwright/test --save-dev
npx playwright install
```

**Test Script:**
```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Wealth App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text())
      }
    })
  })

  test('landing page loads without errors', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('sign up flow works', async ({ page }) => {
    await page.goto('http://localhost:3000/signup')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard loads data', async ({ page }) => {
    // Assumes user is signed in
    await page.goto('http://localhost:3000/dashboard')
    
    // Check for key dashboard components
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Net Worth')).toBeVisible()
  })

  test('all main pages accessible', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/accounts',
      '/transactions',
      '/budgets',
      '/analytics',
      '/goals',
    ]
    
    for (const path of pages) {
      const response = await page.goto(`http://localhost:3000${path}`)
      expect(response?.status()).toBeLessThan(400)
    }
  })
})
```

**Run Tests:**
```bash
# Start dev server first
npm run dev

# In another terminal
npx playwright test

# With UI mode
npx playwright test --ui
```

### Regression Testing Strategy

**After Each Fix:**
1. Re-run full page navigation checklist
2. Verify fix didn't introduce new errors
3. Check related features still work
4. Update error tracking document

**Before Declaring Complete:**
1. All P0 errors fixed
2. All P1 errors fixed
3. P2 errors documented (fix if time permits)
4. P3 errors documented for future
5. Smoke tests pass
6. Critical user flows work end-to-end

## Questions for Planner

### 1. Should we fix all errors in Iteration 2, or only critical ones?

**Context:** Some errors may be low-priority polish items.

**Options:**
- A) Fix only P0 (critical) and P1 (high) errors
- B) Fix P0, P1, and P2 (medium) errors
- C) Fix all errors including P3 (low priority)

**Recommendation:** Option A - Focus on critical and high-priority errors. Document medium and low-priority for future iterations.

### 2. How should we handle missing external API credentials?

**Context:** Plaid, Anthropic (Claude), and Resend credentials may not be available.

**Options:**
- A) Block until all credentials obtained
- B) Use mock/placeholder for missing services
- C) Implement graceful degradation (app works without them)

**Recommendation:** Option C - Implement feature flags and graceful degradation. Core features should work without external APIs.

### 3. Should Supabase integration be done before or during error fixing?

**Context:** Iteration 2 requires Supabase setup, but errors can be fixed with any database.

**Options:**
- A) Setup Supabase first, then fix errors
- B) Fix errors with current database, then migrate to Supabase
- C) Do both in parallel (different builders)

**Recommendation:** Option A - Setup Supabase first. This is a requirement and will reveal database-specific errors.

### 4. How much time should we allocate to error fixing vs new features?

**Context:** Iteration 2 has both Supabase integration (new) and error fixing.

**Options:**
- A) 80% error fixing, 20% Supabase setup
- B) 50/50 split
- C) 20% error fixing, 80% Supabase setup

**Recommendation:** Option B - Equal priority. Supabase setup is critical infrastructure, errors prevent usage.

### 5. Should we use Chrome DevTools MCP or manual testing?

**Context:** Both approaches work, MCP is more automated.

**Options:**
- A) Chrome DevTools MCP for automated error collection
- B) Manual testing with browser DevTools
- C) Combination of both

**Recommendation:** Option C - Use MCP for systematic collection, manual testing for user flows and edge cases.

### 6. What's the acceptance criteria for "runtime errors fixed"?

**Context:** Define what "done" means for this iteration.

**Options:**
- A) Zero console errors on all pages
- B) All critical errors fixed, some warnings acceptable
- C) Application functional, cosmetic issues ok

**Recommendation:** Option B - All critical errors (P0/P1) fixed, P2/P3 documented. Some warnings acceptable for MVP.

### 7. Should we add error tracking infrastructure (Sentry)?

**Context:** Production error monitoring would help but adds scope.

**Options:**
- A) Add Sentry/LogRocket now
- B) Add basic console logging
- C) Skip for MVP, add post-deployment

**Recommendation:** Option C - Focus on fixing errors now, add monitoring in future iteration.

## Resource Map

### Critical Files for Error Investigation

#### Configuration Files
- `/home/ahiya/Ahiya/wealth/.env.example` - Environment variable template
- `/home/ahiya/Ahiya/wealth/.env.local` - Actual environment (create this!)
- `/home/ahiya/Ahiya/wealth/next.config.js` - Next.js configuration
- `/home/ahiya/Ahiya/wealth/package.json` - Dependencies and scripts
- `/home/ahiya/Ahiya/wealth/tsconfig.json` - TypeScript configuration

#### Database Files
- `/home/ahiya/Ahiya/wealth/prisma/schema.prisma` - Database schema
- `/home/ahiya/Ahiya/wealth/prisma/seed.ts` - Seed data script
- `/home/ahiya/Ahiya/wealth/src/lib/prisma.ts` - Prisma client initialization

#### Authentication Files
- `/home/ahiya/Ahiya/wealth/src/lib/auth.ts` - NextAuth configuration
- `/home/ahiya/Ahiya/wealth/src/app/api/auth/[...nextauth]/route.ts` - Auth API route
- `/home/ahiya/Ahiya/wealth/src/components/auth/SignInForm.tsx` - Sign in UI
- `/home/ahiya/Ahiya/wealth/src/components/auth/SignUpForm.tsx` - Sign up UI

#### tRPC Files
- `/home/ahiya/Ahiya/wealth/src/server/api/root.ts` - Root router
- `/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts` - tRPC initialization
- `/home/ahiya/Ahiya/wealth/src/app/api/trpc/[trpc]/route.ts` - tRPC API route
- `/home/ahiya/Ahiya/wealth/src/lib/trpc.ts` - tRPC client
- `/home/ahiya/Ahiya/wealth/src/app/providers.tsx` - Client providers (React Query, SessionProvider)

#### Page Files (Likely Error Sources)
- `/home/ahiya/Ahiya/wealth/src/app/layout.tsx` - Root layout
- `/home/ahiya/Ahiya/wealth/src/app/page.tsx` - Landing page
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/accounts/page.tsx` - Accounts list
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/transactions/page.tsx` - Transactions list
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/budgets/page.tsx` - Budgets list
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/analytics/page.tsx` - Analytics (charts)
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/goals/page.tsx` - Goals list

### Key Dependencies

#### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# NextAuth (REQUIRED)
NEXTAUTH_SECRET="[openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Optional for initial testing)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Plaid (Optional - use sandbox)
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"

# Encryption (REQUIRED for Plaid)
ENCRYPTION_KEY="[openssl rand -hex 32]"

# Anthropic (Optional for AI categorization)
ANTHROPIC_API_KEY="sk-ant-..."

# Resend (Optional for emails)
RESEND_API_KEY="re_..."
```

#### Runtime Dependencies
- **PostgreSQL** or **Supabase** - Database
- **Node.js** 18.x or 20.x - Runtime
- **npm** - Package manager
- **Chrome/Chromium** - Browser for testing
- **Chrome DevTools MCP** - Error inspection (optional)
- **Playwright** - Automated testing (optional)

#### npm Scripts
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

### Testing Infrastructure

#### Manual Testing Tools
- **Chrome DevTools** - Built-in browser debugging
  - Console tab: Errors and warnings
  - Network tab: API requests
  - React DevTools: Component inspection
  - Performance tab: Profiling

#### Automated Testing Tools
- **Playwright** - Browser automation
  - Installation: `npm install @playwright/test --save-dev`
  - Run: `npx playwright test`
  - UI mode: `npx playwright test --ui`

- **Vitest** - Unit/integration tests (already installed)
  - Run: `npm run test`
  - Coverage: `npm run test:coverage`

#### Database Tools
- **Prisma Studio** - Database GUI
  - Start: `npx prisma studio`
  - URL: http://localhost:5555

- **Supabase Studio** - Database GUI (if using Supabase)
  - URL: http://localhost:54323
  - Access via `npx supabase start`

### Error Tracking Documents

Create these files during error investigation:

1. **error-log.md** - Running list of all errors found
2. **fix-checklist.md** - Checklist of errors to fix
3. **known-issues.md** - Documented P3 errors for future
4. **test-results.md** - Results of manual testing
5. **environment-setup.md** - Step-by-step environment guide

## Summary

This exploration provides a comprehensive framework for identifying and fixing runtime errors in the Wealth Personal Finance Dashboard. The key insights are:

1. **Environment setup is critical** - Most errors will stem from missing or incorrect environment variables
2. **Systematic testing approach** - Follow Phase 1-5 error discovery plan
3. **Prioritize errors** - Fix P0/P1, document P2/P3
4. **Use available tools** - Chrome DevTools MCP, Playwright, Prisma Studio
5. **Test incrementally** - Verify fixes don't introduce new errors
6. **Focus on critical path** - Database → Auth → tRPC → UI

**Estimated Total Time for Error Fixing:**
- Environment & Database setup: 30-45 minutes
- Authentication fixes: 15-30 minutes
- tRPC/API fixes: 30-60 minutes
- React component fixes: 20-40 minutes
- UI polish: 15-30 minutes
- **Total: 2-3.5 hours**

**Success Metrics:**
- Zero P0 (critical) errors
- Zero P1 (high) errors
- All pages load without console errors
- Critical user flows work end-to-end
- Application ready for manual testing and deployment

**Next Steps for Planner:**
1. Assign builders to error categories
2. Set up Supabase integration first (prerequisite)
3. Implement systematic error discovery process
4. Prioritize fixes based on this framework
5. Validate fixes with testing checklist

---

**Report Complete** - Ready for planning phase integration.
