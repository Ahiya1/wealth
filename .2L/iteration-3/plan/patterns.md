# Code Patterns & Conventions - Iteration 3

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx           # Sign in page (UPDATE)
│   │   │   └── signup/page.tsx           # Sign up page (UPDATE)
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx        # Protected (no changes)
│   │   │   ├── accounts/page.tsx         # Protected (no changes)
│   │   │   └── [other pages...]          # Protected (no changes)
│   │   ├── auth/
│   │   │   └── callback/route.ts         # NEW - OAuth/magic link callback
│   │   ├── layout.tsx                    # Root layout (no changes)
│   │   └── globals.css                   # Global styles (no changes)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SignInForm.tsx            # UPDATE with Supabase
│   │   │   ├── SignUpForm.tsx            # UPDATE with Supabase
│   │   │   └── ResetPasswordForm.tsx     # UPDATE with Supabase
│   │   └── ui/                           # shadcn/ui (no changes)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # NEW - Browser client
│   │   │   └── server.ts                 # NEW - Server client
│   │   └── auth.ts                       # REMOVE - NextAuth config
│   └── server/
│       └── api/
│           ├── trpc.ts                   # UPDATE context
│           └── routers/                  # Test after changes
├── supabase/
│   └── config.toml                       # UPDATE - enable auth
├── middleware.ts                         # UPDATE - Supabase auth
├── .env.local                            # UPDATE - new variables
└── .env.example                          # UPDATE - document new vars
```

## Naming Conventions

- **Files:** camelCase (`client.ts`, `server.ts`)
- **Components:** PascalCase (`SignInForm.tsx`)
- **Functions:** camelCase (`createClient()`)
- **Types:** PascalCase (`SupabaseClient`, `AuthContext`)
- **Constants:** SCREAMING_SNAKE_CASE (`SUPABASE_URL`)

## Database Connection Pattern

### Fixed DATABASE_URL Configuration

**Before (Broken):**
```env
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
```

**After (Fixed):**
```env
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Rationale:**
- Direct connection (port 5432) eliminates pgBouncer complexity
- All Prisma operations work reliably
- Local development doesn't need connection pooling
- Production can use pooler via DIRECT_URL if needed

**Testing:**
```bash
# Verify database connection works
npm run db:push
# Should output: "✓ Database synced in [X]ms"

# Open Prisma Studio
npx prisma studio
# Should open at http://localhost:5555
```

## Supabase Client Patterns

### Pattern 1: Browser Client (Client Components)

**File:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**When to use:**
- Client components (`'use client'`)
- Sign in/up forms
- OAuth buttons
- Client-side session checks
- Real-time subscriptions (future)

**Example usage:**
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignInForm() {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error.message)
      return
    }

    router.push('/dashboard')
    router.refresh() // Refresh server components
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      handleSignIn(
        formData.get('email') as string,
        formData.get('password') as string
      )
    }}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Pattern 2: Server Client (Server Components, Route Handlers)

**File:** `src/lib/supabase/server.ts`

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
            // Cookie can't be set in Server Component
            // This is expected during initial render
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Cookie can't be removed in Server Component
          }
        },
      },
    }
  )
}
```

**When to use:**
- Server Components (default in Next.js 14)
- Route handlers (`route.ts`)
- Server Actions
- Middleware
- Protected page validation

**Example usage (Server Component):**
```tsx
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
      <h1>Welcome, {user.email}</h1>
    </div>
  )
}
```

**Example usage (Route Handler):**
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/signin?error=auth_callback_error', request.url))
}
```

## Middleware Pattern (Protected Routes)

**File:** `middleware.ts`

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

**Key points:**
- Checks Supabase session on every protected route
- Redirects unauthenticated users to `/signin`
- Preserves original URL in `redirect` param
- Redirects authenticated users away from auth pages
- Cookie management for session refresh

## tRPC Context Pattern (Updated for Supabase)

**File:** `src/server/api/trpc.ts`

### Context Creation

```typescript
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/server/db'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  // Sync Supabase user to Prisma
  let user = null
  if (supabaseUser) {
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
    user, // Prisma user (for application data)
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
```

### Protected Procedure

```typescript
import { TRPCError } from '@trpc/server'

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
    },
  })
})
```

**Key points:**
- `ctx.supabaseUser` contains Supabase Auth user metadata
- `ctx.user` contains Prisma User with relations
- Auto-sync creates Prisma user on first sign-in
- Protected procedures guarantee `ctx.user` exists
- Use `ctx.user.id` for database queries (same as before)

### Router Example (No Changes Needed)

```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const accountsRouter = router({
  // This works without changes!
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: { userId: ctx.user.id }, // ctx.user.id still works
      include: { category: true },
    })
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.account.create({
        data: {
          ...input,
          userId: ctx.user.id, // ctx.user.id still works
        },
      })
    }),
})
```

## Authentication Flow Patterns

### Pattern 1: Email/Password Sign Up

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
          name, // Stored in user_metadata
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

      // Success - show verification message
      alert('Check your email for verification link!')
      router.push('/signin')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

### Pattern 2: Email/Password Sign In

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
      router.refresh() // Refresh server components
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <a href="/reset-password" className="text-blue-500">
        Forgot password?
      </a>
    </form>
  )
}
```

### Pattern 3: Magic Link (Passwordless)

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
      <div className="text-center">
        <h2>Check your email</h2>
        <p>We sent you a magic link to {email}</p>
        <button onClick={() => setSent(false)}>
          Send another link
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>
  )
}
```

### Pattern 4: OAuth (Google)

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        {/* Google icon SVG */}
      </svg>
      {loading ? 'Redirecting...' : 'Continue with Google'}
    </button>
  )
}
```

### Pattern 5: Password Reset

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
      <div className="text-center">
        <h2>Check your email</h2>
        <p>We sent password reset instructions to {email}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  )
}
```

## Prisma Schema Pattern (Updated)

**File:** `prisma/schema.prisma`

```prisma
model User {
  id             String   @id @default(cuid())
  supabaseAuthId String   @unique // NEW - links to Supabase Auth
  email          String   @unique
  name           String?
  image          String?
  currency       String   @default("USD")
  timezone       String   @default("America/New_York")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Application relations (no changes)
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]

  @@index([supabaseAuthId])
  @@index([email])
}

// REMOVE these models (handled by Supabase Auth)
// model OAuthAccount { ... }
// model PasswordResetToken { ... }
```

**Migration steps:**
```bash
# 1. Add supabaseAuthId field (nullable initially)
npx prisma migrate dev --name add-supabase-auth-id

# 2. Test with new auth system

# 3. After validation, clean up (if desired)
# - Make supabaseAuthId required
# - Remove passwordHash field
# - Drop OAuthAccount table
# - Drop PasswordResetToken table
```

## Error Handling Pattern

### Auth Errors

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) {
  switch (error.message) {
    case 'Invalid login credentials':
      setError('Incorrect email or password')
      break
    case 'Email not confirmed':
      setError('Please check your email to verify your account')
      break
    case 'User not found':
      setError('No account found with that email')
      break
    default:
      setError('An error occurred. Please try again.')
      console.error('Auth error:', error)
  }
  return
}
```

### tRPC Errors

```typescript
import { TRPCError } from '@trpc/server'

export const accountsRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.id },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      }

      // Verify ownership
      if (account.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this account',
        })
      }

      return account
    }),
})
```

## Testing Pattern

### Manual Test Checklist

**Email/Password Authentication:**
```bash
# 1. Sign up
# - Navigate to http://localhost:3000/signup
# - Fill form: name, email, password
# - Submit
# - Check Inbucket (http://localhost:54324) for verification email
# - Click verification link
# - Verify redirect to dashboard

# 2. Sign in
# - Navigate to http://localhost:3000/signin
# - Fill form: email, password
# - Submit
# - Verify redirect to dashboard

# 3. Protected route
# - Sign out
# - Try to visit http://localhost:3000/dashboard
# - Verify redirect to /signin?redirect=/dashboard

# 4. Session persistence
# - Sign in
# - Refresh page
# - Verify still signed in

# 5. Sign out
# - Click sign out
# - Verify redirect to home page
# - Try to visit /dashboard
# - Verify redirect to /signin
```

**tRPC Integration:**
```bash
# 1. Test protected procedure
# - Sign in
# - Navigate to dashboard (triggers tRPC calls)
# - Open DevTools Network tab
# - Verify /api/trpc requests return 200 OK

# 2. Test unauthenticated request
# - Sign out
# - Open DevTools Console
# - Run: fetch('/api/trpc/accounts.list').then(r => r.json())
# - Verify UNAUTHORIZED error

# 3. Test user context
# - Sign in
# - Create account or transaction
# - Verify userId is correct in Prisma Studio
```

## Environment Variables Pattern

**File:** `.env.example`

```bash
# Database (UPDATED - direct connection)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Supabase (UPDATED - public variables for client-side)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<run: npx supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<run: npx supabase status>"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# Other (Keep as-is)
ENCRYPTION_KEY="<your-encryption-key>"

# REMOVE (NextAuth no longer needed)
# NEXTAUTH_SECRET="..."
# NEXTAUTH_URL="..."
```

**File:** `.env.local` (actual values)

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

ENCRYPTION_KEY="5549c0ffd20ee507fbac6a9a84e281d9fad77dfbb122f74adeb722a87cc0bcf1"
```

## Code Quality Standards

### TypeScript

- Always use explicit types for function parameters
- Use type inference for return types when clear
- Avoid `any` - use `unknown` if type is truly unknown
- Use discriminated unions for variants

### Async/Await

- Always handle errors with try/catch or check error return
- Use async/await instead of .then() chains
- Don't forget to set loading states

### Component Structure

```tsx
'use client' // If client component

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  // Props interface
}

export function ComponentName({ prop }: Props) {
  // 1. Hooks first
  const [state, setState] = useState()
  const supabase = createClient()

  // 2. Event handlers
  async function handleEvent() {
    // Implementation
  }

  // 3. Return JSX
  return (
    <div>
      {/* Component content */}
    </div>
  )
}
```

### Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Next.js imports
import { useRouter } from 'next/navigation'

// 3. External libraries
import { z } from 'zod'

// 4. Internal imports (absolute)
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// 5. Types
import type { User } from '@/types'

// 6. Styles (if any)
import './styles.css'
```

## Security Best Practices

1. **Never expose service role key to client**
   - Only use in server components/API routes
   - Keep in server-only environment variables

2. **Always validate user ownership**
   - Check `ctx.user.id` matches resource owner
   - Use `where: { userId: ctx.user.id }` in queries

3. **Use prepared statements**
   - Prisma handles this automatically
   - Never concatenate user input into raw queries

4. **Validate all inputs**
   - Use Zod schemas in tRPC procedures
   - Validate on both client and server

5. **Rate limit auth endpoints**
   - Supabase does this automatically (60 req/min)
   - Consider additional rate limiting for production

6. **Use HTTPS in production**
   - Update NEXT_PUBLIC_SUPABASE_URL to https://
   - Enable secure cookies
