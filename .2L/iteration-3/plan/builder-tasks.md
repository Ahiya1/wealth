# Builder Task Breakdown - Iteration 3

## Overview

**3 primary builders** working sequentially (not parallel).

**Total Estimated Time:** 2-3 hours

**Build Order:** Builder-1 → Builder-2 → Builder-3

**Dependency Strategy:**
- Builder-2 MUST wait for Builder-1 completion (database must work)
- Builder-3 MUST wait for Builder-2 completion (auth service must be running)
- No parallel work to minimize integration risk

---

## Builder-1: Database Connection Fix

### Scope

Fix the critical database connection issue preventing user registration by switching from pooled connection to direct connection.

### Complexity Estimate

**LOW**

### Estimated Time

**15-20 minutes**

### Success Criteria

- [x] DATABASE_URL updated to direct connection (port 5432)
- [x] `npm run db:push` completes without errors
- [x] Prisma Studio accessible at http://localhost:5555
- [x] User registration creates database record
- [x] All existing tRPC procedures work
- [x] Documentation updated in .env.example
- [x] README.md updated with correct connection string

### Dependencies

**Depends on:** None (first builder)

**Blocks:** Builder-2 (needs working database)

### Files to Modify

1. **`.env.local`** - Update DATABASE_URL and DIRECT_URL
2. **`.env.example`** - Document correct connection string
3. **`README.md`** - Update database setup instructions
4. **(Optional) `package.json`** - Verify db scripts

### Implementation Steps

**Step 1: Update .env.local (5 min)**

Change from:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
```

To:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Step 2: Test database connection (5 min)**

```bash
# Push schema to verify connection
npm run db:push

# Expected output:
# "✓ Database synced in [X]ms"

# Open Prisma Studio
npx prisma studio

# Should open at http://localhost:5555 without errors
```

**Step 3: Update .env.example (3 min)**

```env
# Database (UPDATED - use direct connection for local dev)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
# Note: Do NOT use pgBouncer pooler (:54322) for local development
```

**Step 4: Update README.md (5 min)**

Find database setup section and update:

```markdown
## Database Setup

### Local Development

Wealth uses Supabase for local PostgreSQL database.

**Start Supabase:**
```bash
npm run db:local
```

**Connection:** Direct connection on port 5432 (not pooler)

**Environment Variables:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Why Direct Connection?**
- Eliminates pgBouncer pooler complexity
- All Prisma operations work reliably
- Connection pooling not needed for single developer
- Production can use pooler via DIRECT_URL if needed
```

**Step 5: Verify existing features work (5 min)**

```bash
# Start dev server
npm run dev

# Test in browser:
# 1. Try to register (should work now)
# 2. Check Prisma Studio for new user record
# 3. Test any other database operation
```

### Acceptance Criteria Checklist

- [x] `npm run db:push` succeeds without "Tenant or user not found" error
- [x] Prisma Studio opens without errors
- [x] User registration creates record in database (visible in Prisma Studio)
- [x] .env.example has correct DATABASE_URL documented
- [x] README.md database section updated with direct connection instructions
- [x] No regressions in existing tRPC procedures

### Handoff to Builder-2

**Validation before handoff:**
1. Run `npm run db:push` - should succeed
2. Open Prisma Studio - should show tables
3. Create test user - should appear in database

**Handoff notes:**
- Database connection is now stable and reliable
- Ready for Prisma schema migration (add supabaseAuthId field)
- All environment variables documented in .env.example

### Patterns to Follow

- **Database Connection:** Use patterns from `patterns.md` - "Database Connection Pattern"
- **Documentation:** Clear, concise instructions
- **Testing:** Verify no regressions

### Potential Issues & Solutions

**Issue:** Port 5432 not accessible
- **Solution:** Check Supabase is running: `npx supabase status`
- **Solution:** Restart Supabase: `npx supabase stop && npx supabase start`

**Issue:** Permission denied on database
- **Solution:** Verify credentials are correct (postgres:postgres)
- **Solution:** Check database exists: `psql -h localhost -p 5432 -U postgres -l`

**Issue:** Existing .env.local not loaded
- **Solution:** Restart dev server after .env changes
- **Solution:** Verify .env.local is in root directory (not in .env/)

### Decision

**COMPLETE** (do not split - task is simple and atomic)

---

## Builder-2: Supabase Auth Setup & Infrastructure

### Scope

Enable Supabase Auth service locally, install dependencies, create Supabase client utilities, update Prisma schema to add supabaseAuthId field, and run migration. This builder creates the foundation that Builder-3 will integrate.

### Complexity Estimate

**MEDIUM-HIGH**

### Estimated Time

**60-90 minutes**

### Success Criteria

- [x] Supabase Auth service enabled in config.toml
- [x] Inbucket email service enabled for testing
- [x] Supabase services restarted and health check passes
- [x] Dependencies installed (@supabase packages)
- [x] NextAuth packages removed
- [x] Supabase client utilities created (client.ts, server.ts)
- [x] OAuth callback route created
- [x] Prisma schema updated (supabaseAuthId added)
- [x] Migration applied successfully
- [x] Environment variables added to .env.local and .env.example
- [x] Documentation updated

### Dependencies

**Depends on:** Builder-1 (database must be working)

**Blocks:** Builder-3 (auth service must be running)

### Files to Create

1. **`src/lib/supabase/client.ts`** - Browser Supabase client
2. **`src/lib/supabase/server.ts`** - Server Supabase client
3. **`src/app/auth/callback/route.ts`** - OAuth/magic link callback handler

### Files to Modify

1. **`supabase/config.toml`** - Enable auth and Inbucket
2. **`prisma/schema.prisma`** - Add supabaseAuthId field to User model
3. **`package.json`** - Add/remove dependencies
4. **`.env.local`** - Add Supabase environment variables
5. **`.env.example`** - Document Supabase variables
6. **`README.md`** - Add Supabase Auth setup instructions

### Files to Remove

1. **`src/lib/auth.ts`** - NextAuth configuration (delete)
2. **`src/app/api/auth/[...nextauth]/route.ts`** - NextAuth handler (delete)

### Implementation Steps

**Step 1: Enable Supabase Auth Service (10 min)**

Edit `supabase/config.toml`:

```toml
[auth]
enabled = true  # CHANGE from false
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true  # Email verification
double_confirm_changes = true
max_frequency = "60s"  # Rate limit signup attempts

[inbucket]
enabled = true  # ENABLE for email testing
port = 54324
smtp_port = 54325
pop3_port = 54326
```

Restart Supabase:
```bash
npx supabase stop
npx supabase start
```

Verify auth service running:
```bash
curl http://localhost:54321/auth/v1/health
# Expected: {"date":"...","version":"v2.x.x"}
```

**Step 2: Install Dependencies (10 min)**

```bash
# Install Supabase packages
npm install @supabase/supabase-js@^2.58.0
npm install @supabase/ssr@^0.5.2
npm install @supabase/auth-ui-react@^0.4.7
npm install @supabase/auth-ui-shared@^0.1.8

# Remove NextAuth packages
npm uninstall next-auth
npm uninstall @auth/prisma-adapter
npm uninstall bcryptjs
npm uninstall @types/bcryptjs

# Verify installation
npm list @supabase/supabase-js
# Should show 2.58.0 or higher
```

**Step 3: Add Environment Variables (5 min)**

Get Supabase keys:
```bash
npx supabase status
# Copy:
# - API URL (for NEXT_PUBLIC_SUPABASE_URL)
# - anon key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
# - service_role key (for SUPABASE_SERVICE_ROLE_KEY)
```

Update `.env.local`:
```env
# Supabase (NEW - add these)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# REMOVE these (NextAuth no longer used)
# NEXTAUTH_SECRET="..."
# NEXTAUTH_URL="..."
```

Update `.env.example`:
```env
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<run: npx supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<run: npx supabase status>"
# Note: Service role key is server-only, never expose to client
```

**Step 4: Create Supabase Client Utilities (15 min)**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie setting can fail in Server Components during initial render
            // This is expected and safe to ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Same as above
          }
        },
      },
    }
  )
}
```

Test utilities:
```typescript
// Quick test in src/app/page.tsx (temporary)
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  console.log('Supabase client test:', { hasUser: !!data.user, error })
  return <div>Home</div>
}
```

**Step 5: Create OAuth Callback Route (10 min)**

Create `src/app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If no code or error, redirect to signin with error
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_error`)
}
```

**Step 6: Update Prisma Schema (10 min)**

Edit `prisma/schema.prisma`:

```prisma
model User {
  id             String   @id @default(cuid())
  supabaseAuthId String?  @unique  // NEW - nullable initially
  email          String   @unique
  name           String?
  image          String?
  passwordHash   String?  // Keep temporarily for safety
  currency       String   @default("USD")
  timezone       String   @default("America/New_York")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Keep all relations
  categories          Category[]
  accounts            Account[]
  transactions        Transaction[]
  budgets             Budget[]
  goals               Goal[]
  oauthAccounts       OAuthAccount[]        // Keep temporarily
  passwordResetTokens PasswordResetToken[]  // Keep temporarily

  @@index([supabaseAuthId])
  @@index([email])
}

// Keep OAuthAccount and PasswordResetToken models for now
// Will remove in future cleanup after testing
```

**Step 7: Run Migration (10 min)**

```bash
# Create and apply migration
npx prisma migrate dev --name add-supabase-auth-id

# Verify in Prisma Studio
npx prisma studio
# Check User table has supabaseAuthId column
```

**Step 8: Remove NextAuth Files (5 min)**

```bash
# Delete NextAuth configuration
rm src/lib/auth.ts

# Delete NextAuth API route
rm -rf src/app/api/auth

# Verify no imports of deleted files
grep -r "from '@/lib/auth'" src/
# Should return no results (or only commented out)
```

**Step 9: Update Documentation (10 min)**

Add to `README.md`:

```markdown
## Authentication

Wealth uses Supabase Auth for authentication.

### Local Setup

**1. Start Supabase:**
```bash
npm run db:local
```

**2. Configure environment variables:**
```bash
# Get Supabase credentials
npx supabase status

# Add to .env.local:
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key from status>"
SUPABASE_SERVICE_ROLE_KEY="<service_role key from status>"
```

**3. Test email flows:**
- Inbucket email testing: http://localhost:54324
- All verification emails appear here during local development

### Auth Features

- Email/password authentication with verification
- Magic link (passwordless) authentication
- OAuth providers (Google, GitHub)
- Password reset flow
- Protected routes via middleware
```

### Acceptance Criteria Checklist

- [x] `curl http://localhost:54321/auth/v1/health` returns success
- [x] Inbucket accessible at http://localhost:54324
- [x] `npm list @supabase/supabase-js` shows version 2.58.0+
- [x] NextAuth packages removed from package.json
- [x] `src/lib/supabase/client.ts` created and exports createClient
- [x] `src/lib/supabase/server.ts` created and exports createClient
- [x] `src/app/auth/callback/route.ts` created
- [x] `src/lib/auth.ts` deleted (NextAuth config removed)
- [x] User model has supabaseAuthId field (nullable)
- [x] Migration applied successfully
- [x] Prisma Studio shows supabaseAuthId column in User table
- [x] .env.local has all Supabase variables
- [x] .env.example documents Supabase variables
- [x] README.md has Supabase Auth setup instructions

### Handoff to Builder-3

**Validation before handoff:**

1. **Auth service running:**
   ```bash
   curl http://localhost:54321/auth/v1/health
   # Should return: {"date":"...","version":"..."}
   ```

2. **Supabase clients working:**
   ```bash
   npm run dev
   # Check console for "Supabase client test" log
   # Should not have errors
   ```

3. **Migration applied:**
   ```bash
   npx prisma studio
   # User table should have supabaseAuthId column
   ```

**Handoff notes:**
- Supabase Auth service is running on port 54321
- Client utilities are in `src/lib/supabase/`
- OAuth callback route is ready at `/auth/callback`
- Prisma schema has supabaseAuthId field (nullable)
- Ready for middleware, tRPC context, and auth UI integration

**Files created that Builder-3 will use:**
- `src/lib/supabase/client.ts` - Import in auth forms
- `src/lib/supabase/server.ts` - Import in middleware, tRPC context
- `src/app/auth/callback/route.ts` - Redirect target for OAuth

### Patterns to Follow

- **Supabase Clients:** Use patterns from `patterns.md` - "Supabase Client Patterns"
- **Migration:** Two-step approach (add nullable field first, clean up later)
- **Documentation:** Clear setup instructions for future developers

### Testing Requirements

**Unit Tests (Optional):**
- Test Supabase client creation
- Test environment variables loaded

**Manual Tests (Required):**
- [x] Supabase status shows all services running
- [x] Health check endpoint responds
- [x] Inbucket web UI accessible
- [x] Client utilities import without errors
- [x] Migration applied without errors
- [x] No compile errors after NextAuth removal

### Potential Issues & Solutions

**Issue:** Supabase fails to start after config changes
- **Solution:** Check config.toml syntax (valid TOML format)
- **Solution:** Check port conflicts (54321, 54324, 5432)
- **Solution:** Run `npx supabase stop && npx supabase start`

**Issue:** Auth service health check fails
- **Solution:** Wait 30 seconds for services to fully start
- **Solution:** Check `npx supabase logs` for errors
- **Solution:** Verify auth enabled in config.toml

**Issue:** Migration fails
- **Solution:** Verify DATABASE_URL is correct (from Builder-1)
- **Solution:** Check no existing column conflicts
- **Solution:** Rollback and try again: `npx prisma migrate reset`

**Issue:** Can't remove NextAuth packages
- **Solution:** Remove manually from package.json
- **Solution:** Delete node_modules and reinstall: `rm -rf node_modules && npm install`

**Issue:** Environment variables not loaded
- **Solution:** Restart dev server after adding variables
- **Solution:** Verify .env.local in root directory
- **Solution:** Check variable names exact (NEXT_PUBLIC_ prefix)

### Decision

**COMPLETE** (do not split - tasks are interdependent and sequential)

---

## Builder-3: Supabase Auth Integration

### Scope

Integrate Supabase Auth into the application by updating middleware, tRPC context, auth forms, and testing all auth flows. This builder makes authentication functional end-to-end.

### Complexity Estimate

**MEDIUM-HIGH**

### Estimated Time

**60-90 minutes**

### Success Criteria

- [x] Middleware updated to use Supabase session
- [x] tRPC context updated to use Supabase user
- [x] Protected procedures work with new context
- [x] Sign in form updated with Supabase Auth
- [x] Sign up form updated with Supabase Auth
- [x] Password reset form functional
- [x] Magic link authentication works
- [x] OAuth (Google) configured and tested
- [x] User sync to Prisma working
- [x] All auth flows tested and documented
- [x] All existing tRPC routers still work
- [x] Documentation complete

### Dependencies

**Depends on:** Builder-2 (auth service must be running, utilities created)

**Blocks:** None (final builder)

### Files to Modify

1. **`middleware.ts`** - Update to use Supabase session
2. **`src/server/api/trpc.ts`** - Update context and protectedProcedure
3. **`src/components/auth/SignInForm.tsx`** - Update with Supabase
4. **`src/components/auth/SignUpForm.tsx`** - Update with Supabase
5. **`src/components/auth/ResetPasswordForm.tsx`** - Update with Supabase
6. **`src/app/(auth)/signin/page.tsx`** - Update layout/styling
7. **`src/app/(auth)/signup/page.tsx`** - Update layout/styling
8. All tRPC routers - Test but likely no changes needed

### Files to Create

1. **`src/components/auth/MagicLinkForm.tsx`** - New passwordless option
2. **`src/components/auth/OAuthButtons.tsx`** - Social login buttons

### Implementation Steps

**Step 1: Update Middleware (15 min)**

Edit `middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Protect other authenticated routes
  const protectedPaths = ['/accounts', '/transactions', '/budgets', '/goals', '/analytics']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && (
    request.nextUrl.pathname === '/signin' ||
    request.nextUrl.pathname === '/signup'
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/accounts/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/goals/:path*',
    '/analytics/:path*',
    '/signin',
    '/signup',
  ]
}
```

**Step 2: Update tRPC Context (20 min)**

Edit `src/server/api/trpc.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/server/db'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

/**
 * Create tRPC context with Supabase Auth user
 */
export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  // Sync Supabase user to Prisma database
  let user = null
  if (supabaseUser) {
    // Try to find existing user
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
    })

    // Auto-create user in Prisma on first sign-in
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata.name || null,
          image: supabaseUser.user_metadata.avatar_url || null,
        },
      })
    }
  }

  return {
    supabase,
    supabaseUser,
    user, // Prisma user for application data
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Protected procedure - requires authenticated user
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  return next({
    ctx: {
      user: ctx.user, // Prisma User (guaranteed non-null)
      supabaseUser: ctx.supabaseUser!,
      prisma: ctx.prisma,
    },
  })
})
```

**Step 3: Update Sign In Form (15 min)**

Edit `src/components/auth/SignInForm.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      router.push(redirect)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          minLength={8}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{' '}
        <a href="/signup" className="text-primary hover:underline">
          Sign up
        </a>
      </p>
    </form>
  )
}
```

**Step 4: Update Sign Up Form (15 min)**

Edit `src/components/auth/SignUpForm.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        setError('Email already registered. Please sign in.')
        setLoading(false)
        return
      }

      // Show success message
      setCheckEmail(true)
    }

    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We sent a verification link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link to verify your account and sign in.
        </p>
        <Button onClick={() => router.push('/signin')}>
          Go to Sign In
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <a href="/signin" className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </form>
  )
}
```

**Step 5: Create Magic Link Form (10 min)**

Create `src/components/auth/MagicLinkForm.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (magicLinkError) {
      setError(magicLinkError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We sent a magic link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link to sign in instantly.
        </p>
        <Button onClick={() => setSent(false)} variant="outline">
          Send another link
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  )
}
```

**Step 6: Create OAuth Buttons (10 min)**

Create `src/components/auth/OAuthButtons.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function OAuthButtons() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleSignIn() {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      setLoading(false)
    }
    // Don't set loading false - user is being redirected
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
        variant="outline"
        className="w-full"
      >
        {loading ? 'Redirecting...' : 'Continue with Google'}
      </Button>
    </div>
  )
}
```

**Step 7: Update Password Reset Form (10 min)**

Edit `src/components/auth/ResetPasswordForm.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We sent password reset instructions to <strong>{email}</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>
    </form>
  )
}
```

**Step 8: Test All Auth Flows (30 min)**

Follow this comprehensive testing checklist:

**Email/Password Authentication:**
1. Navigate to http://localhost:3000/signup
2. Fill form and submit
3. Check Inbucket (http://localhost:54324) for verification email
4. Click verification link
5. Verify redirect to dashboard
6. Check Prisma Studio - user created with supabaseAuthId
7. Sign out
8. Sign in with same credentials
9. Verify redirect to dashboard

**Magic Link:**
1. Navigate to http://localhost:3000/signin
2. Click "Send Magic Link" (if available)
3. Enter email
4. Check Inbucket for magic link
5. Click link
6. Verify signed in and redirected to dashboard

**Protected Routes:**
1. Sign out
2. Try to visit http://localhost:3000/dashboard
3. Verify redirect to /signin?redirect=/dashboard
4. Sign in
5. Verify redirect back to /dashboard

**Session Persistence:**
1. Sign in
2. Refresh page
3. Verify still signed in
4. Close browser
5. Reopen and visit site
6. Verify still signed in (within session duration)

**tRPC Integration:**
1. Sign in
2. Navigate to dashboard (triggers tRPC calls)
3. Open DevTools Network tab
4. Verify /api/trpc requests return 200 OK
5. Sign out
6. Try to call protected tRPC procedure
7. Verify UNAUTHORIZED error

**Step 9: Update Documentation (10 min)**

Add to `README.md`:

```markdown
## Authentication Testing

### Local Email Testing

All authentication emails (verification, magic links, password reset) are sent to **Inbucket** during local development.

**Access Inbucket:** http://localhost:54324

**Test Email Flows:**
1. Sign up with test email: `test@example.com`
2. Check Inbucket for verification email
3. Click link in email
4. User is verified and can sign in

### Auth Flows Available

**Email/Password:**
- Sign up at `/signup`
- Verify email via link
- Sign in at `/signin`

**Magic Link (Passwordless):**
- Enter email at `/signin`
- Click "Send Magic Link"
- Check Inbucket for magic link
- Click to sign in

**OAuth (Google):**
- Click "Continue with Google" at `/signin`
- Authenticate with Google
- Redirects back to app

**Password Reset:**
- Click "Forgot password" at `/signin`
- Enter email
- Check Inbucket for reset link
- Click link and set new password

### Protected Routes

The following routes require authentication:
- `/dashboard`
- `/accounts`
- `/transactions`
- `/budgets`
- `/goals`
- `/analytics`

Unauthenticated users are redirected to `/signin`.
```

### Acceptance Criteria Checklist

- [x] Middleware uses Supabase session (no NextAuth references)
- [x] tRPC context gets Supabase user and syncs to Prisma
- [x] Protected procedures require authentication
- [x] Sign in form functional with Supabase
- [x] Sign up form functional with email verification
- [x] Magic link form created and functional
- [x] OAuth buttons created (Google configured)
- [x] Password reset form functional
- [x] User sync to Prisma working (check Prisma Studio)
- [x] Middleware redirects unauthenticated users
- [x] Middleware preserves redirect URL
- [x] Session persists across page refreshes
- [x] Sign out works correctly
- [x] All existing tRPC routers still work
- [x] Documentation complete with testing instructions

### Testing Requirements

**Comprehensive Auth Flow Testing:**

Use this detailed test matrix:

| Flow | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Sign Up | Fill form and submit | Verification email sent | [ ] |
| Sign Up | Check Inbucket | Email received | [ ] |
| Sign Up | Click verification link | Redirected to signin | [ ] |
| Sign In | Use verified credentials | Redirected to dashboard | [ ] |
| Sign In | Use wrong password | Error message shown | [ ] |
| Magic Link | Request magic link | Email sent to Inbucket | [ ] |
| Magic Link | Click magic link | Signed in and redirected | [ ] |
| OAuth | Click Google button | Redirected to Google | [ ] |
| OAuth | Complete Google auth | Redirected back, signed in | [ ] |
| Protected Route | Visit /dashboard signed out | Redirect to /signin | [ ] |
| Protected Route | Sign in with redirect param | Redirected to original page | [ ] |
| Session | Refresh page | Still signed in | [ ] |
| Session | Close and reopen browser | Still signed in | [ ] |
| Sign Out | Click sign out | Signed out, redirect to home | [ ] |
| tRPC | Call protected procedure | Data returned | [ ] |
| tRPC | Call while signed out | UNAUTHORIZED error | [ ] |
| Prisma | Sign up new user | User created with supabaseAuthId | [ ] |
| Prisma | Sign in existing user | User found by supabaseAuthId | [ ] |

**Pass Criteria:** All boxes checked

### Patterns to Follow

- **Authentication Flows:** Use patterns from `patterns.md` - "Authentication Flow Patterns"
- **tRPC Context:** Follow pattern exactly - auto-sync Supabase user to Prisma
- **Middleware:** Copy pattern exactly - proper cookie management
- **Error Handling:** User-friendly messages, log technical details
- **Form Validation:** Client-side + server-side validation

### Potential Issues & Solutions

**Issue:** Middleware causing infinite redirects
- **Solution:** Check matcher pattern in config
- **Solution:** Verify auth check logic (user exists vs null)
- **Solution:** Clear browser cookies and try again

**Issue:** tRPC context not finding user
- **Solution:** Verify supabaseAuthId populated in database
- **Solution:** Check user sync logic in createTRPCContext
- **Solution:** Verify Supabase session is valid

**Issue:** Email verification not working
- **Solution:** Check Inbucket is running (http://localhost:54324)
- **Solution:** Verify enable_confirmations = true in config.toml
- **Solution:** Check email sent to correct address

**Issue:** OAuth redirect fails
- **Solution:** Verify callback route exists at /auth/callback/route.ts
- **Solution:** Check additional_redirect_urls in config.toml
- **Solution:** Verify Google OAuth credentials if using Google

**Issue:** User created in Supabase but not in Prisma
- **Solution:** Check tRPC context auto-sync logic
- **Solution:** Verify Prisma connection working
- **Solution:** Check supabaseAuthId field exists in schema

**Issue:** Session doesn't persist
- **Solution:** Check cookies being set (DevTools → Application → Cookies)
- **Solution:** Verify Supabase URL is correct (localhost not 127.0.0.1)
- **Solution:** Clear cookies and sign in again

**Issue:** Protected procedures still checking old session
- **Solution:** Restart dev server after tRPC context changes
- **Solution:** Verify protectedProcedure uses ctx.user not ctx.session
- **Solution:** Check all router imports updated

### Decision

**COMPLETE** (do not split - integration must be done holistically)

---

## Builder Execution Order

### Sequential Build Flow

```
START
  ↓
Builder-1: Database Fix (15-20 min)
  ↓ [Verify: npm run db:push succeeds]
  ↓
Builder-2: Supabase Auth Setup (60-90 min)
  ↓ [Verify: curl health check succeeds]
  ↓
Builder-3: Supabase Auth Integration (60-90 min)
  ↓ [Verify: all auth flows work]
  ↓
COMPLETE
```

### Integration Validation

After all builders complete:

**Final Integration Test (30 min):**

1. **Full Auth Flow:**
   - Sign up new user
   - Verify email
   - Sign in
   - Visit all protected routes
   - Sign out

2. **tRPC Integration:**
   - Create account
   - Add transaction
   - Create budget
   - Verify all data associated with correct user

3. **Session Management:**
   - Refresh page
   - Close/reopen browser
   - Verify session persists

4. **Error Handling:**
   - Try invalid credentials
   - Try accessing protected route signed out
   - Verify proper redirects and messages

**Pass Criteria:** All tests pass without errors

### Potential Conflict Areas

**Shared File: `prisma/schema.prisma`**
- Only Builder-2 modifies this
- No conflicts

**Shared File: `package.json`**
- Only Builder-2 modifies this
- No conflicts

**Shared Files: Auth Forms**
- Only Builder-3 modifies these
- No conflicts

**Coordination Point: Environment Variables**
- Builder-1 adds DATABASE_URL
- Builder-2 adds SUPABASE_* variables
- No conflicts (different variables)

**Coordination Point: Middleware**
- Builder-3 completely rewrites
- No conflicts (single builder)

### Success Metrics

**Iteration 3 Complete When:**
- [x] Database connection reliable (no "Tenant or user not found")
- [x] Supabase Auth service running
- [x] Email/password authentication works
- [x] Magic link authentication works
- [x] OAuth configured (Google)
- [x] Protected routes secured
- [x] tRPC context uses Supabase user
- [x] User sync to Prisma working
- [x] All existing features still work
- [x] Documentation updated

**Time Target:** 2-3 hours total

**Quality Target:** All acceptance criteria met, no known bugs

---

## Notes for All Builders

### Development Best Practices

1. **Test incrementally** - Don't wait until the end
2. **Commit often** - After each major step
3. **Document issues** - Note any problems encountered
4. **Follow patterns exactly** - From patterns.md
5. **Verify handoffs** - Complete acceptance criteria before moving on

### Common Pitfalls to Avoid

1. **Don't skip environment variable updates** - App won't work
2. **Don't forget to restart dev server** - Changes won't take effect
3. **Don't ignore error messages** - They contain important info
4. **Don't modify files outside your scope** - Causes merge conflicts
5. **Don't skip testing** - Bugs compound

### Communication

**Report Progress:**
- Start of each major step
- Completion of each file
- Any blockers or issues

**Request Help If:**
- Stuck for more than 15 minutes
- Error messages unclear
- Tests failing unexpectedly
- Scope seems wrong

### Rollback Procedures

**If Major Issue in Builder-1:**
- Revert .env.local changes
- Restore pooler connection (if needed)
- Document issue in handoff notes

**If Major Issue in Builder-2:**
- Rollback Prisma migration: `npx prisma migrate reset`
- Disable auth in config.toml
- Restart Supabase: `npx supabase stop && npx supabase start`
- Document issue and hand to next builder with notes

**If Major Issue in Builder-3:**
- Revert middleware.ts
- Revert tRPC context
- Keep Builder-2 work (foundation is good)
- Document specific integration issues

### Final Notes

**This iteration is scoped for success:**
- Realistic timeline (2-3 hours not 7-10)
- Clear dependencies (sequential not parallel)
- Comprehensive testing (catch issues early)
- Detailed patterns (copy-paste examples)
- Thorough documentation (future maintainability)

**Focus on auth functionality only:**
- Frontend redesign deferred to Iteration 4
- No UI/design changes needed
- Keep existing shadcn/ui styling
- Focus purely on making auth work

**Quality over speed:**
- Better to take 3 hours and do it right
- Than rush in 2 hours and have bugs
- Test thoroughly at each step
- Document any deviations from plan

---

**End of Builder Task Breakdown**
