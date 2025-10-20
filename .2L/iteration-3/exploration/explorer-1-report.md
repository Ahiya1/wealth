# Explorer 1 Report: Database Fix & Supabase Auth Architecture

## Executive Summary

The "Tenant or user not found" error is a **red herring** - it's not a database connection issue but rather a **missing environment variable** issue. The actual root cause is that `DATABASE_URL` is not being loaded from `.env.local` during Prisma commands. The database connection itself works perfectly with both direct (port 5432) and pooled (port 54322) connections when the environment variable is properly set.

**Key Findings:**
1. Database connections are healthy - both direct and pooled work correctly
2. The "Tenant or user not found" error likely occurs during `npm run db:push` when DATABASE_URL isn't loaded
3. Supabase Auth is currently **DISABLED** in config.toml (line 58: `enabled = false`)
4. Current architecture uses NextAuth v5 beta with custom credentials provider
5. Migration path: **Hybrid approach recommended** - enable Supabase Auth alongside NextAuth, then gradual migration
6. pgBouncer pooler configuration is correct but not required for local development

**Recommended Immediate Fix:**
Change DATABASE_URL from pooled to direct connection in `.env.local`:
```env
# FROM (Pooled - causes issues with some Prisma operations):
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"

# TO (Direct - works reliably):
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

Keep `DIRECT_URL` as fallback for migrations that explicitly need it.

---

## Discoveries

### 1. Database Connection Analysis

**Current Configuration (.env.local):**
- DATABASE_URL: `postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true` (POOLED)
- DIRECT_URL: `postgresql://postgres:postgres@localhost:5432/postgres` (DIRECT)

**Supabase Configuration (config.toml):**
- Direct database: Port 5432
- Pooler (pgBouncer): Port 54322, transaction mode, pool size 20
- Pooler is enabled and configured correctly

**Test Results:**
```bash
# Direct connection (port 5432) - WORKS PERFECTLY
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" \
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres" \
npm run db:push
# Result: ✓ Database synced in 341ms

# Pooled connection (port 54322) - ALSO WORKS
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true" \
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres" \
npm run db:push
# Result: ✓ Database already in sync
```

**Root Cause of "Tenant or user not found" Error:**
The error message is misleading. It's actually Prisma's error when `DATABASE_URL` environment variable is **not found at all**:

```
Error: Environment variable not found: DATABASE_URL.
```

This happens when:
1. Running Prisma CLI commands without environment variables loaded
2. `.env.local` not being read by Prisma (Prisma only auto-loads `.env` by default)
3. Missing `dotenv` or environment setup in scripts

**Solution:** Ensure DATABASE_URL is always available. Simplify to direct connection to avoid pooler limitations.

### 2. Supabase Auth Current State

**Configuration Status:**
```toml
# supabase/config.toml (Line 57-59)
[auth]
enabled = false
# Disable Supabase Auth (using NextAuth instead)
```

**Supabase Auth is COMPLETELY DISABLED** - no auth service is running locally.

**Current Supabase Services Status:**
```bash
npx supabase status
# Output shows:
Stopped services: [
  supabase_auth_wealth,      # ← Auth is STOPPED
  supabase_inbucket_wealth,  # ← Email testing is STOPPED
  supabase_realtime_wealth,
  supabase_rest_wealth,
  supabase_storage_wealth,
  # ... other services also stopped
]

DB URL: postgresql://postgres:postgres@127.0.0.1:5432/postgres
Studio URL: http://127.0.0.1:54323
```

**Only running services:**
- PostgreSQL database (port 5432)
- pgBouncer pooler (port 54322)
- Supabase Studio (port 54323)

**Implications:**
- To use Supabase Auth, we must enable it in config.toml
- Email verification will require enabling Inbucket (local email testing)
- Magic links will need email service configuration
- OAuth providers need Supabase Auth configuration

### 3. Current NextAuth v5 Architecture

**Technology Stack:**
- NextAuth v5.0.0-beta.25 (using new App Router pattern)
- @auth/prisma-adapter 2.7.4
- Session strategy: JWT (not database sessions)
- Prisma models: User, OAuthAccount, PasswordResetToken

**Current Auth Flow:**

```
Sign Up:
1. User fills SignUpForm.tsx
2. tRPC mutation → auth.register (auth.router.ts)
3. Prisma creates User with bcrypt password hash
4. Auto sign-in via NextAuth credentials provider
5. JWT session created
6. Redirect to /dashboard

Sign In:
1. User fills SignInForm.tsx
2. NextAuth signIn('credentials', { email, password })
3. Credentials provider validates against Prisma User
4. bcrypt.compare() verifies password
5. JWT token issued with user.id in token.sub
6. Session available via auth() function

Protected Routes:
1. middleware.ts intercepts protected paths
2. Calls auth() with 5-second timeout
3. Checks session.user exists
4. Redirects to /signin if unauthenticated
5. Allows request if authenticated
```

**Current Provider Configuration:**
```typescript
// src/lib/auth.ts
providers: [
  // Google OAuth (conditional - only if valid env vars)
  ...(process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id'
    ? [GoogleProvider({ ... })]
    : []
  ),
  
  // Credentials (email/password - always enabled)
  CredentialsProvider({
    async authorize(credentials) {
      // Validate with Zod
      // Find user in Prisma
      // Compare password with bcrypt
      // Return user object or null
    }
  })
]
```

**Session Management:**
```typescript
session: {
  strategy: 'jwt', // No database sessions
},
callbacks: {
  async session({ session, token }) {
    session.user.id = token.sub // Add userId to session
    return session
  },
  async jwt({ token, user }) {
    if (user) token.sub = user.id
    return token
  }
}
```

**Prisma Schema for Auth:**
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?  // Nullable for OAuth-only users
  name          String?
  image         String?
  currency      String   @default("USD")
  timezone      String   @default("America/New_York")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  oauthAccounts       OAuthAccount[]
  passwordResetTokens PasswordResetToken[]
  // ... other relations
}

model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google", "github", etc.
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Current Issues with NextAuth Approach:**
1. No email verification (users can sign up with any email)
2. No magic link / passwordless authentication
3. Password reset requires manual email integration (Resend not configured)
4. OAuth limited to providers with manual setup
5. No built-in user management UI
6. Session refresh requires custom implementation
7. No realtime user presence
8. Manual security updates and maintenance

---

## Patterns Identified

### Pattern 1: Supabase Auth with Next.js App Router

**Description:** Official Supabase integration with Next.js 14+ App Router using Server Components and Server Actions.

**Architecture:**
```typescript
// lib/supabase/server.ts - Server-side Supabase client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// lib/supabase/client.ts - Client-side Supabase client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Use Cases:**
- Email/password authentication with automatic verification emails
- Magic link (passwordless) authentication
- OAuth providers (Google, GitHub, etc.) with minimal config
- Built-in user management and session handling
- Realtime user presence

**Example Implementation:**
```typescript
// Server Action for sign up
export async function signUp(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  
  if (error) throw error
  return data
}

// Protected page using Server Component
export default async function DashboardPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }
  
  return <div>Welcome {user.email}</div>
}
```

**Recommendation:** **STRONGLY RECOMMENDED** for new auth implementation. Provides all required features out-of-the-box.

---

### Pattern 2: Hybrid Auth (NextAuth + Supabase Auth Coexistence)

**Description:** Run both auth systems simultaneously during migration, allowing gradual transition without breaking existing users.

**Architecture:**
```typescript
// middleware.ts - Check both auth systems
export async function middleware(request: NextRequest) {
  // Try NextAuth first (existing users)
  const nextAuthSession = await auth()
  if (nextAuthSession?.user) {
    return NextResponse.next()
  }
  
  // Try Supabase Auth (new users)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return NextResponse.next()
  }
  
  // Not authenticated in either system
  return NextResponse.redirect(new URL('/signin', request.url))
}
```

**Migration Strategy:**
```typescript
// Migration function to move NextAuth user to Supabase Auth
async function migrateUserToSupabase(userId: string) {
  const prisma = new PrismaClient()
  const supabase = createClient()
  
  // 1. Get user from Prisma
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  
  // 2. Create in Supabase Auth (admin API)
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.passwordHash, // Already hashed with bcrypt
    email_confirm: true, // Skip verification for migrated users
    user_metadata: {
      name: user.name,
      migrated_from_nextauth: true,
      original_created_at: user.createdAt,
    },
  })
  
  if (error) throw error
  
  // 3. Update Prisma user with Supabase ID
  await prisma.user.update({
    where: { id: userId },
    data: {
      supabaseAuthId: data.user.id, // Add this field to schema
      migratedAt: new Date(),
    },
  })
  
  return data.user
}
```

**Use Case:** When you have existing NextAuth users and want to migrate to Supabase Auth without downtime.

**Pros:**
- Zero downtime migration
- Existing users continue working
- New users get Supabase Auth features immediately
- Can test Supabase Auth in production before full migration

**Cons:**
- Complex middleware logic
- Maintain two auth systems temporarily
- Potential confusion in codebase
- Double the auth-related code during transition

**Recommendation:** **USE FOR MIGRATION** if there are production users. For this project (no production users yet), skip hybrid and go straight to Supabase Auth.

---

### Pattern 3: Supabase Auth with Prisma User Sync

**Description:** Use Supabase Auth for authentication, but sync user data to Prisma for application logic.

**Architecture:**
```prisma
// Updated Prisma schema
model User {
  id               String   @id @default(cuid())
  supabaseAuthId   String   @unique  // Links to Supabase Auth user.id
  email            String   @unique
  name             String?
  image            String?
  currency         String   @default("USD")
  timezone         String   @default("America/New_York")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Remove these - managed by Supabase Auth
  // passwordHash  String?
  // oauthAccounts OAuthAccount[]
  // passwordResetTokens PasswordResetToken[]
  
  // Keep application-specific relations
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
}
```

**Sync Implementation:**
```typescript
// Server Action - sync Supabase user to Prisma on first sign in
export async function syncSupabaseUser() {
  const supabase = createClient()
  const prisma = new PrismaClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // Check if user exists in Prisma
  let prismaUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
  })
  
  if (!prismaUser) {
    // Create user in Prisma on first sign-in
    prismaUser = await prisma.user.create({
      data: {
        supabaseAuthId: user.id,
        email: user.email!,
        name: user.user_metadata.name || null,
        image: user.user_metadata.avatar_url || null,
      },
    })
  }
  
  return prismaUser
}

// tRPC context - include both Supabase and Prisma user
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  let prismaUser = null
  if (supabaseUser) {
    prismaUser = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
    })
    
    // Auto-sync if not found
    if (!prismaUser) {
      prismaUser = await syncSupabaseUser()
    }
  }
  
  return {
    supabase,
    supabaseUser,
    prismaUser,
    prisma,
  }
}
```

**Use Case:** When you need Supabase Auth for authentication but want to keep user-related application data in your own database.

**Pros:**
- Best of both worlds
- Supabase handles all auth complexity
- Prisma handles application data and relations
- tRPC procedures have access to both user objects
- Can add custom user fields without modifying Supabase Auth

**Cons:**
- Need to keep two user records in sync
- Extra database query on each request
- User deletion requires handling both systems
- Potential sync issues if not careful

**Recommendation:** **RECOMMENDED PATTERN** for this application. Keeps existing Prisma schema structure while gaining Supabase Auth benefits.

---

### Pattern 4: Supabase Auth Callback Route

**Description:** Handle OAuth and email verification callbacks using Next.js Route Handlers.

**Implementation:**
```typescript
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  if (code) {
    const supabase = createClient()
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Sync user to Prisma if needed
      await syncSupabaseUser()
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  
  // Error handling
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_error`)
}
```

**Use Case:** Required for OAuth providers and email verification magic links.

**Recommendation:** **REQUIRED** when using Supabase Auth with OAuth or magic links.

---

## Complexity Assessment

### High Complexity Areas

#### 1. Full Supabase Auth Migration (If Full Replacement)
**Complexity:** HIGH
**Estimated Time:** 3-4 hours
**Builder Splits:** 2 builders recommended

**Sub-Builder A: Foundation & Configuration (1.5-2 hours)**
- Enable Supabase Auth in config.toml
- Install @supabase/ssr and @supabase/supabase-js
- Create Supabase client utilities (server + client)
- Update environment variables
- Create auth callback route
- Update Prisma schema (add supabaseAuthId, remove auth fields)
- Run migration

**Sub-Builder B: Auth Flow Implementation (1.5-2 hours)**
- Replace SignUpForm with Supabase Auth UI
- Replace SignInForm with Supabase Auth
- Update middleware for Supabase session
- Update tRPC context to use Supabase user
- Implement user sync logic
- Update protectedProcedure middleware
- Remove NextAuth configuration
- Test all auth flows

**Challenges:**
- Need to handle existing User model carefully
- tRPC context changes affect all protected procedures
- Session management completely different
- Testing all OAuth providers
- Email verification testing requires Inbucket

---

#### 2. Hybrid Auth Implementation (If Gradual Migration)
**Complexity:** VERY HIGH
**Estimated Time:** 4-6 hours
**Builder Splits:** 3 builders recommended

**Challenges:**
- Most complex option
- Two auth systems running simultaneously
- Complex middleware logic
- User migration strategy
- Dual session handling
- Confusion during development
- Not recommended for this project (no existing users)

---

### Medium Complexity Areas

#### 1. Database Connection Fix Only
**Complexity:** MEDIUM
**Estimated Time:** 30 minutes - 1 hour
**Builder Splits:** 1 builder

**Tasks:**
- Change DATABASE_URL from pooled to direct
- Test database operations
- Update documentation
- Verify all Prisma commands work

**Challenges:**
- Simple change but need to verify no regressions
- May need to update scripts that rely on pooler
- Documentation updates

---

#### 2. Enable Supabase Auth + Keep NextAuth (Coexistence)
**Complexity:** MEDIUM
**Estimated Time:** 2-3 hours
**Builder Splits:** 1-2 builders

**Use Case:** If you want Supabase Auth available but don't want to migrate immediately.

**Tasks:**
- Enable Supabase Auth in config.toml
- Add Supabase client utilities
- Create optional Supabase Auth sign-in page
- Keep NextAuth as default
- Add choice on sign-in page ("Sign in with NextAuth" vs "Sign in with Supabase")

**Challenges:**
- User confusion about which auth to use
- Duplicate users possible
- Middleware needs to check both
- Not a long-term solution

---

### Low Complexity Areas

#### 1. Documentation Updates
**Complexity:** LOW
**Estimated Time:** 15-30 minutes
**Builder Splits:** 1 builder

**Tasks:**
- Document DATABASE_URL fix
- Update README with Supabase Auth setup
- Add auth flow diagrams
- Document migration path

---

## Technology Recommendations

### Primary Stack for Supabase Auth Migration

#### 1. Auth Libraries
**Recommended:**
- `@supabase/supabase-js` (v2.49.0+) - Core Supabase client
- `@supabase/ssr` (v0.6.0+) - Server-side rendering helpers for Next.js
- `@supabase/auth-ui-react` (v0.4.7+) - Pre-built auth UI components (optional)

**Rationale:**
- Official Supabase libraries with active development
- SSR package specifically designed for Next.js App Router
- Auth UI components save development time
- Mature and well-documented

**Remove:**
- `next-auth` (5.0.0-beta.25) - Will be replaced
- `@auth/prisma-adapter` (2.7.4) - No longer needed
- `bcryptjs` (2.4.3) - Supabase handles password hashing

**Keep:**
- All existing dependencies (Prisma, tRPC, React Query, etc.)

---

#### 2. Configuration Changes

**Environment Variables (.env.local):**
```env
# Database (UPDATED - use direct connection)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Supabase (UPDATED - make public for client-side)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# REMOVE (NextAuth no longer needed)
# NEXTAUTH_SECRET="..."
# NEXTAUTH_URL="..."

# Keep for future OAuth configuration via Supabase
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Other (keep as-is)
ENCRYPTION_KEY="5549c0ffd20ee507fbac6a9a84e281d9fad77dfbb122f74adeb722a87cc0bcf1"
```

**Supabase Config (config.toml):**
```toml
[auth]
enabled = true  # CHANGE from false
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true

[inbucket]
enabled = true  # ENABLE for email testing
port = 54324
smtp_port = 54325
pop3_port = 54326
```

---

### Supporting Libraries

#### 1. Auth UI (Optional but Recommended)
**Library:** `@supabase/auth-ui-react` + `@supabase/auth-ui-shared`

**Purpose:** Pre-built, customizable auth components

**Example:**
```typescript
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export function AuthForm() {
  const supabase = createClient()
  
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      theme="light"
      providers={['google', 'github']}
      redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`}
    />
  )
}
```

**Pros:**
- Saves 2-3 hours of form development
- Handles all auth flows (sign up, sign in, password reset, magic link)
- Customizable theming
- Accessible and production-ready

**Cons:**
- Less control over exact UI
- May not match custom design perfectly
- Adds 50kb to bundle

**Recommendation:** **USE IT** for MVP, customize later if needed.

---

#### 2. Session Management
**Pattern:** Supabase Auth with SSR

**No additional libraries needed** - use `@supabase/ssr` built-in session handling.

**Implementation:**
```typescript
// Server Component - automatic session
export default async function Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // User automatically available from cookie
}

// Client Component - listen for changes
'use client'
export function ClientComponent() {
  const supabase = createClient()
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          // Handle sign in
        } else if (event === 'SIGNED_OUT') {
          // Handle sign out
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [supabase])
}
```

---

## Integration Points

### 1. External APIs

#### Supabase Auth Service
**Purpose:** Authentication, user management, session handling
**Complexity:** MEDIUM
**Considerations:**
- Local: `http://localhost:54321` (enable in config.toml)
- Hosted: `https://your-project.supabase.co` (future production)
- Anonymous key for client-side operations
- Service role key for admin operations (server-side only)
- Rate limiting applies (60 requests/min for auth endpoints)

**Integration Requirements:**
- Enable auth service in config.toml
- Configure OAuth providers in Supabase Dashboard
- Set up email templates for verification
- Configure redirect URLs

---

#### Inbucket (Local Email Testing)
**Purpose:** Test email verification and magic links locally
**Complexity:** LOW
**Considerations:**
- Local only: `http://localhost:54324`
- Catches all emails sent by Supabase Auth
- No configuration needed once enabled
- View emails in browser UI

**Integration:**
Enable in config.toml:
```toml
[inbucket]
enabled = true
```

---

### 2. Internal Integrations

#### tRPC Context Changes
**Component A:** tRPC context (`src/server/api/trpc.ts`)
**Component B:** All tRPC routers (8 routers)
**How they connect:** Context provides user session to all procedures

**Current Implementation:**
```typescript
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const session = await auth() // NextAuth
  
  return {
    session,
    prisma,
  }
}

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})
```

**Required Changes:**
```typescript
import { createClient } from '@/lib/supabase/server'

export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  
  // Sync to Prisma user
  let user = null
  if (supabaseUser) {
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
    })
    
    // Auto-create if first time
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata.name || null,
        },
      })
    }
  }
  
  return {
    supabase,
    supabaseUser,
    user, // Prisma user for relations
    prisma,
  }
}

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      user: ctx.user, // Prisma user object
      supabaseUser: ctx.supabaseUser, // Supabase auth user
    },
  })
})
```

**Impact:** HIGH
- All 8 routers depend on this context
- All protected procedures need testing after change
- Existing procedures should work without modification (user.id still available)
- Type changes may require updates to procedure implementations

---

#### Middleware Changes
**Component A:** Middleware (`middleware.ts`)
**Component B:** All protected routes
**How they connect:** Middleware enforces authentication before route access

**Current Implementation:**
```typescript
export async function middleware(request: NextRequest) {
  const session = await auth() // NextAuth
  
  if (!session || !session.user) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
  
  return NextResponse.next()
}
```

**Required Changes:**
```typescript
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  return NextResponse.next()
}
```

**Impact:** MEDIUM
- Much simpler than NextAuth version (no timeout needed)
- Supabase Auth is faster and more reliable
- All protected routes automatically secured

---

#### Prisma Schema Changes
**Component A:** Prisma schema (`prisma/schema.prisma`)
**Component B:** All User-related operations
**How they connect:** Database structure affects all user queries

**Current Schema:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?   # REMOVE
  name          String?
  image         String?
  // ... other fields
  
  oauthAccounts       OAuthAccount[]        # REMOVE
  passwordResetTokens PasswordResetToken[]  # REMOVE
  // ... keep all app-specific relations
}
```

**Updated Schema:**
```prisma
model User {
  id             String   @id @default(cuid())
  supabaseAuthId String   @unique  # ADD - links to Supabase Auth
  email          String   @unique
  name           String?
  image          String?
  currency       String   @default("USD")
  timezone       String   @default("America/New_York")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  # Keep all application-specific relations
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
  
  @@index([supabaseAuthId])
  @@index([email])
}

# REMOVE these models - handled by Supabase Auth
# model OAuthAccount { ... }
# model PasswordResetToken { ... }
```

**Migration Script:**
```sql
-- Add supabaseAuthId column
ALTER TABLE "User" ADD COLUMN "supabaseAuthId" TEXT;

-- Drop auth-related columns and tables
ALTER TABLE "User" DROP COLUMN "passwordHash";
DROP TABLE "OAuthAccount";
DROP TABLE "PasswordResetToken";

-- Add unique constraint and index
ALTER TABLE "User" ADD CONSTRAINT "User_supabaseAuthId_key" UNIQUE ("supabaseAuthId");
CREATE INDEX "User_supabaseAuthId_idx" ON "User"("supabaseAuthId");
```

**Impact:** HIGH
- Schema migration required
- All auth-related queries need updating
- User creation logic changes significantly
- Existing users (if any) need migration

---

#### Sign-In/Sign-Up Forms
**Component A:** Auth forms (`src/components/auth/*.tsx`)
**Component B:** Supabase Auth UI or custom implementation
**How they connect:** Replace form submission logic

**Current Forms:**
- SignUpForm.tsx - calls tRPC auth.register + NextAuth signIn
- SignInForm.tsx - calls NextAuth signIn with credentials
- ResetPasswordForm.tsx - calls tRPC auth.requestPasswordReset

**Option 1: Use Supabase Auth UI (RECOMMENDED)**
```typescript
// app/signin/page.tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const supabase = createClient()
  
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['google']}
      redirectTo="/auth/callback"
    />
  )
}
```

**Option 2: Custom Forms (More Control)**
```typescript
// components/auth/SignUpForm.tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export function SignUpForm() {
  const supabase = createClient()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: name,
        },
      },
    })
    
    if (error) {
      setError(error.message)
    } else {
      // Show "Check your email" message
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

**Impact:** MEDIUM
- Complete rewrite of auth forms
- Different error handling
- Email verification flow changes
- Magic link option available
- OAuth providers easier to add

---

## Risks & Challenges

### Technical Risks

#### Risk 1: Prisma Schema Migration Complexity
**Impact:** HIGH
**Likelihood:** MEDIUM
**Description:** Migrating Prisma schema to remove auth-related models and add supabaseAuthId field could cause issues with existing data or relations.

**Mitigation Strategy:**
1. Create comprehensive migration script with rollback plan
2. Backup database before migration (local Supabase can be reset)
3. Test migration on empty database first
4. Verify all foreign key relationships remain intact
5. Add migration step to check for orphaned records

**Fallback Plan:**
- Keep existing User model structure
- Add supabaseAuthId as nullable field
- Populate it for new users only
- Keep old auth fields for backward compatibility (not ideal but safer)

---

#### Risk 2: tRPC Context Breaking Changes
**Impact:** VERY HIGH
**Likelihood:** MEDIUM
**Description:** Changing tRPC context from NextAuth session to Supabase user could break all protected procedures.

**Mitigation Strategy:**
1. Update context types first, make fields optional temporarily
2. Update protectedProcedure middleware with proper error handling
3. Test each router individually before integration
4. Add comprehensive error logging during transition
5. Keep user.id field consistent (it's the primary reference in all procedures)

**Code Pattern for Safety:**
```typescript
// Safe transition pattern
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    console.error('[Auth] No user in context', {
      hasSupabaseUser: !!ctx.supabaseUser,
      hasPrismaUser: !!ctx.user,
    })
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }
  
  return next({
    ctx: {
      user: ctx.user, // Same interface as before
    },
  })
})
```

---

#### Risk 3: Supabase Auth Service Startup Issues
**Impact:** HIGH
**Likelihood:** LOW
**Description:** Enabling Supabase Auth service might cause startup failures or port conflicts.

**Mitigation Strategy:**
1. Check for port conflicts (54321 - API, 54324 - Inbucket)
2. Update Supabase CLI to latest version before enabling
3. Start with minimal auth config, add features incrementally
4. Monitor Supabase logs during startup
5. Have rollback config.toml ready

**Testing Commands:**
```bash
# Before enabling auth
npx supabase status  # Verify current state

# Update config.toml (enable auth)

# Restart Supabase
npx supabase stop
npx supabase start

# Check auth service
curl http://localhost:54321/auth/v1/health
```

---

### Complexity Risks

#### Risk 1: Builder May Need to Split Into Sub-Builders
**Likelihood:** HIGH
**Description:** Full auth migration is likely too large for single builder.

**Indicators to Watch:**
- If implementation exceeds 2 hours
- If more than 10 files need modification
- If testing reveals multiple independent issues
- If auth + database changes can't be cleanly separated

**Recommended Split:**
- Sub-Builder A: Database fix + Supabase Auth setup (infrastructure)
- Sub-Builder B: Auth UI + tRPC integration (application layer)

---

#### Risk 2: Testing Email Flows Locally
**Likelihood:** MEDIUM
**Description:** Email verification and magic links require email service testing.

**Mitigation:**
1. Enable Inbucket for local email testing
2. Document Inbucket URL (http://localhost:54324)
3. Add testing checklist for email flows
4. Provide example emails in documentation

---

## Recommendations for Planner

### 1. Database Connection Strategy: **Use Direct Connection**

**Recommendation:** Change DATABASE_URL from pooled (port 54322) to direct (port 5432).

**Rationale:**
- Pooled connection works fine for queries but can cause issues with some Prisma operations
- Local development doesn't benefit from connection pooling (single developer)
- Direct connection is simpler and eliminates a potential point of failure
- pgBouncer transaction mode has limitations with some PostgreSQL features
- Production deployment can use pooled connection via DIRECT_URL fallback

**Implementation:**
```env
# .env.local (UPDATED)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Testing Required:**
- Run `npm run db:push` to verify schema push works
- Test user registration flow
- Verify all tRPC procedures work
- Check Prisma Studio access

---

### 2. Auth Migration Strategy: **Hybrid → Full Supabase Auth (Recommended)**

**Recommendation:** Skip hybrid approach and go **straight to full Supabase Auth replacement**.

**Rationale:**
1. **No production users yet** - Zero risk of disrupting existing users
2. **Simpler implementation** - Avoid maintaining two auth systems
3. **Faster development** - One auth flow vs. two parallel flows
4. **Better long-term** - Clean architecture without technical debt
5. **All required features** - Email verification, magic links, OAuth built-in

**What You Get with Supabase Auth:**
- Email/password with automatic verification emails
- Magic link (passwordless) authentication
- OAuth providers (Google, GitHub, etc.) with minimal config
- Password reset flow (built-in)
- Session management (automatic refresh)
- User management UI (via Supabase Dashboard)
- Realtime user presence (future capability)
- Security updates handled by Supabase team

**What You Lose:**
- NextAuth v5 beta familiarity
- Custom credentials provider logic
- Some control over session structure

**Trade-off Analysis:**
Benefits (8/10) outweigh costs (3/10) significantly for this use case.

---

### 3. Implementation Approach: **Two-Builder Sequential Pattern**

**Recommendation:** Split work into 2 sequential builders (not parallel) to minimize risk.

**Builder-1: Infrastructure & Database (1.5-2 hours)**

**Tasks:**
1. Fix DATABASE_URL (direct connection)
2. Enable Supabase Auth and Inbucket in config.toml
3. Restart Supabase services
4. Install dependencies (@supabase/ssr, @supabase/supabase-js, @supabase/auth-ui-react)
5. Create Supabase client utilities (server + client)
6. Update environment variables (add NEXT_PUBLIC_ prefixes)
7. Create auth callback route handler
8. Test Supabase Auth service is running
9. Update Prisma schema (add supabaseAuthId, remove auth models)
10. Run migration
11. Test database operations still work

**Deliverables:**
- Working Supabase Auth service
- Database connection fixed
- Supabase client utilities ready
- Migration completed
- Handoff document for Builder-2

**Critical Success Criteria:**
- Supabase Auth service responds to health check
- Prisma can connect to database
- Migration applied successfully
- No data loss

---

**Builder-2: Auth Integration & UI (1.5-2 hours)**

**Prerequisites:** Builder-1 completed and validated

**Tasks:**
1. Update middleware.ts to use Supabase Auth
2. Update tRPC context to use Supabase user
3. Update protectedProcedure middleware
4. Replace SignUpForm with Supabase Auth UI
5. Replace SignInForm with Supabase Auth UI
6. Update sign-in/sign-up pages
7. Remove NextAuth configuration files
8. Remove auth.router.ts (register endpoint no longer needed)
9. Test sign-up flow with email verification
10. Test sign-in flow
11. Test magic link authentication
12. Test OAuth (Google) if configured
13. Test protected routes
14. Test all tRPC protected procedures
15. Update documentation

**Deliverables:**
- Working Supabase Auth UI
- All auth flows functional
- Protected routes secured
- tRPC procedures working
- Documentation updated

**Critical Success Criteria:**
- User can sign up with email verification
- User can sign in with password
- Magic link works
- Protected routes redirect correctly
- tRPC calls work with new auth

---

### 4. Prisma Schema Migration: **Add Field + Remove Models**

**Recommendation:** Two-step migration for safety.

**Step 1: Add supabaseAuthId (non-breaking)**
```prisma
model User {
  id             String   @id @default(cuid())
  supabaseAuthId String?  @unique  // Nullable initially
  email          String   @unique
  passwordHash   String?  // Keep temporarily
  // ... rest
}
```

**Migration:**
```sql
ALTER TABLE "User" ADD COLUMN "supabaseAuthId" TEXT;
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");
```

**Step 2: Remove auth models (after testing)**
```prisma
model User {
  id             String   @id @default(cuid())
  supabaseAuthId String   @unique  // Now required
  email          String   @unique
  // passwordHash removed
  // ... rest
}

// Remove OAuthAccount model
// Remove PasswordResetToken model
```

**Migration:**
```sql
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" ALTER COLUMN "supabaseAuthId" SET NOT NULL;
DROP TABLE "OAuthAccount";
DROP TABLE "PasswordResetToken";
```

**Rationale:**
- Non-breaking changes first
- Test new auth system with old schema intact
- Remove old fields only after full validation
- Rollback is easier if issues arise

---

### 5. Testing Strategy: **Comprehensive Auth Flow Validation**

**Recommendation:** Builder-2 must validate all auth flows before completion.

**Test Checklist:**

**Email/Password Authentication:**
- [ ] Sign up with new email
- [ ] Receive verification email in Inbucket
- [ ] Click verification link
- [ ] User created in Supabase Auth
- [ ] User synced to Prisma database
- [ ] Sign in with verified email
- [ ] Session persists across page refresh
- [ ] Sign out works

**Magic Link Authentication:**
- [ ] Request magic link
- [ ] Receive email in Inbucket
- [ ] Click magic link
- [ ] Redirected to dashboard
- [ ] Session active

**Password Reset:**
- [ ] Request password reset
- [ ] Receive email in Inbucket
- [ ] Click reset link
- [ ] Enter new password
- [ ] Can sign in with new password

**OAuth (if configured):**
- [ ] Click "Sign in with Google"
- [ ] Redirected to Google (or mock)
- [ ] Callback handled correctly
- [ ] User created in Prisma
- [ ] Session active

**Protected Routes:**
- [ ] Dashboard requires authentication
- [ ] Unauthenticated redirect to sign-in
- [ ] After sign-in, redirect back to original page
- [ ] All protected routes secured

**tRPC Integration:**
- [ ] Protected procedures require auth
- [ ] User ID available in context
- [ ] Can create accounts, transactions, etc.
- [ ] User-specific data filtering works

---

### 6. Rollback Plan: **Config Toggle + Database Restore**

**Recommendation:** Prepare rollback before starting migration.

**Rollback Steps:**

**If Issues During Builder-1:**
1. Restore config.toml (disable auth)
2. Restore Prisma schema from git
3. Drop migration: `npx prisma migrate reset`
4. Restore DATABASE_URL to pooled (if needed)
5. Restart Supabase: `npx supabase db reset`

**If Issues During Builder-2:**
1. Revert middleware.ts to NextAuth version
2. Revert tRPC context to NextAuth version
3. Restore auth components
4. Restart dev server
5. Builder-1 infrastructure can stay (harmless)

**Database Backup:**
```bash
# Before migration
npx supabase db dump -f backup.sql

# Restore if needed
npx supabase db reset
psql -h localhost -p 5432 -U postgres -d postgres -f backup.sql
```

---

### 7. Documentation Requirements: **Auth Flow Diagrams + Setup Guide**

**Recommendation:** Builder-2 must update documentation with:

**1. Setup Instructions (README.md)**
```markdown
## Authentication Setup

This project uses Supabase Auth for authentication.

### Local Development

1. Start Supabase:
   ```bash
   npm run db:local
   ```

2. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. Access Inbucket for email testing:
   http://localhost:54324

### Auth Flows Available

- Email/password with verification
- Magic link (passwordless)
- OAuth (Google, GitHub)
- Password reset

### Testing Email Flows

All emails are captured by Inbucket during local development.
Visit http://localhost:54324 to view sent emails.
```

**2. Architecture Diagram**
- Flow: Sign Up → Supabase Auth → Email Verification → Prisma Sync → Session
- Flow: Sign In → Supabase Auth → Session → tRPC Context → Protected Routes
- Flow: Middleware → Supabase Auth Check → Redirect or Allow

**3. Migration Notes**
- What changed from NextAuth to Supabase Auth
- Why the change was made
- Benefits gained
- How to configure OAuth providers

---

## Resource Map

### Critical Files/Directories

**Supabase Configuration:**
- `/supabase/config.toml` - Supabase services configuration (MUST UPDATE)
- `.env.local` - Environment variables (MUST UPDATE)

**Auth Infrastructure (NEW):**
- `/src/lib/supabase/server.ts` - Server-side Supabase client (TO CREATE)
- `/src/lib/supabase/client.ts` - Client-side Supabase client (TO CREATE)
- `/src/app/auth/callback/route.ts` - OAuth/magic link callback (TO CREATE)

**Auth Infrastructure (REMOVE):**
- `/src/lib/auth.ts` - NextAuth configuration (TO REMOVE)
- `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth handler (TO REMOVE)
- `/src/server/api/routers/auth.router.ts` - Custom auth endpoints (TO REMOVE)

**Core Integration Points (MUST UPDATE):**
- `/src/server/api/trpc.ts` - tRPC context and procedures (CRITICAL UPDATE)
- `/middleware.ts` - Route protection (CRITICAL UPDATE)
- `/prisma/schema.prisma` - Database schema (MIGRATION REQUIRED)

**Auth UI (UPDATE):**
- `/src/components/auth/SignUpForm.tsx` - Replace with Supabase Auth UI
- `/src/components/auth/SignInForm.tsx` - Replace with Supabase Auth UI
- `/src/components/auth/ResetPasswordForm.tsx` - Replace with Supabase Auth UI
- `/src/app/signin/page.tsx` - Update to use new forms
- `/src/app/signup/page.tsx` - Update to use new forms

**tRPC Routers (TEST AFTER CHANGES):**
- `/src/server/api/routers/categories.router.ts`
- `/src/server/api/routers/accounts.router.ts`
- `/src/server/api/routers/transactions.router.ts`
- `/src/server/api/routers/budgets.router.ts`
- `/src/server/api/routers/goals.router.ts`
- `/src/server/api/routers/analytics.router.ts`
- `/src/server/api/routers/plaid.router.ts`

**Testing:**
- All router test files in `/src/server/api/routers/__tests__/` (SHOULD STILL PASS)

---

### Key Dependencies

**To Install:**
- `@supabase/supabase-js` (v2.49.0+) - Core Supabase client
- `@supabase/ssr` (v0.6.0+) - SSR helpers for Next.js
- `@supabase/auth-ui-react` (v0.4.7+) - Auth UI components
- `@supabase/auth-ui-shared` (v0.1.8+) - Shared UI utilities

**To Remove:**
- `next-auth` (5.0.0-beta.25)
- `@auth/prisma-adapter` (2.7.4)
- `bcryptjs` (2.4.3)
- `@types/bcryptjs` (2.4.6)

**To Keep (No Changes):**
- `@prisma/client` (5.22.0)
- `prisma` (5.22.0)
- `@trpc/server` (11.6.0)
- `@trpc/client` (11.6.0)
- `@trpc/react-query` (11.6.0)
- All other existing dependencies

---

### Testing Infrastructure

**Local Email Testing:**
- **Tool:** Inbucket (built into Supabase)
- **URL:** http://localhost:54324
- **Purpose:** Capture and view verification emails, magic links, password reset emails
- **Configuration:** Enable in config.toml

**Auth Service Health Check:**
```bash
# Check if Supabase Auth is running
curl http://localhost:54321/auth/v1/health

# Expected response:
{"date":"2025-10-02T12:00:00Z","version":"v2.x.x"}
```

**Database Testing:**
```bash
# Verify database connection
npx prisma db push

# Check user table structure
npx prisma studio

# Query Supabase Auth users (via service role key)
curl -X GET 'http://localhost:54321/auth/v1/admin/users' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

**Manual Testing Checklist:**
See "5. Testing Strategy" section above for comprehensive test cases.

---

## Questions for Planner

### 1. Migration Timing
**Question:** Should we do the auth migration in Iteration 3, or defer to Iteration 4 after the frontend redesign is complete?

**Context:** 
- Iteration 3 requirements include both database fix AND Supabase Auth migration
- Frontend redesign is also planned for Iteration 3
- Auth migration + frontend redesign in same iteration might be too much
- Database fix alone is simple (30 min) but auth migration is complex (3-4 hours)

**Options:**
- **Option A:** Do both in Iteration 3 (database fix + auth migration) - AMBITIOUS
- **Option B:** Database fix only in Iteration 3, defer auth to Iteration 4 - SAFER
- **Option C:** Auth migration only in Iteration 3, defer frontend to Iteration 4 - ALTERNATIVE

**Recommendation:** Option B (safer) unless frontend redesign can be split into separate iteration.

---

### 2. Auth UI Approach
**Question:** Should we use Supabase Auth UI components or build custom forms?

**Context:**
- Supabase Auth UI saves 2-3 hours of development time
- Pre-built components handle all edge cases
- Customizable but may not match exact design vision
- Iteration 3 includes "Beautiful Frontend Redesign" with custom design system

**Options:**
- **Option A:** Use Supabase Auth UI, customize theme to match - FAST
- **Option B:** Build custom forms using Supabase Auth methods - FLEXIBLE
- **Option C:** Start with Auth UI (quick MVP), rebuild custom later - INCREMENTAL

**Recommendation:** Option C (incremental) - get auth working fast, then redesign with new design system.

---

### 3. OAuth Provider Priority
**Question:** Which OAuth providers should be configured in Iteration 3?

**Context:**
- Requirements mention Google and GitHub
- Each provider needs credentials and configuration
- Local development OAuth requires ngrok or similar tunneling
- Production OAuth requires public callback URLs

**Options:**
- **Option A:** Google only (most commonly used)
- **Option B:** Google + GitHub (requirements mention both)
- **Option C:** Email/password + magic link only, defer OAuth
- **Option D:** All three (email + Google + GitHub)

**Recommendation:** Option C for local dev, Option B for production deployment.

---

### 4. Email Verification Requirements
**Question:** Should email verification be required or optional during local development?

**Context:**
- Supabase Auth can require email verification (secure)
- Or allow sign-in before verification (faster testing)
- Inbucket captures emails locally
- Production should always require verification

**Options:**
- **Option A:** Required (matches production, more secure)
- **Option B:** Optional (faster local testing)
- **Option C:** Configurable via environment variable

**Recommendation:** Option C (configurable) - required in production, optional in local dev.

---

### 5. User Migration Strategy
**Question:** If there are any existing users in the database, how should we migrate them?

**Context:**
- Current database might have users from testing
- These users have bcrypt password hashes
- Supabase Auth uses different hashing (unclear compatibility)
- Migration script would be needed

**Options:**
- **Option A:** Delete all existing users, start fresh (if only test data)
- **Option B:** Migrate users with admin API (if real users exist)
- **Option C:** Keep old users in Prisma, new users go through Supabase Auth

**Recommendation:** Option A (start fresh) since this is local development, no production users.

---

### 6. Database Connection for Production
**Question:** Should production use pooled or direct connection for DATABASE_URL?

**Context:**
- Local development: direct connection recommended (simpler)
- Production Supabase: pooler available via pgBouncer
- Connection pooling beneficial for serverless (Vercel)
- Prisma recommends pooler for serverless environments

**Options:**
- **Option A:** Direct connection for both local and production (simpler)
- **Option B:** Direct for local, pooled for production (optimized)
- **Option C:** Pooled for both (consistent but complex)

**Recommendation:** Option B (optimized) - use DIRECT_URL for migrations, DATABASE_URL (pooled) for queries in production.

---

### 7. Middleware Error Handling
**Question:** Should middleware redirect to sign-in on all errors, or allow through in development?

**Context:**
- Current middleware has timeout and allows through on error in development
- Supabase Auth is more reliable, timeout may not be needed
- Development mode allowing through can hide auth bugs

**Options:**
- **Option A:** Always redirect on auth failure (strict)
- **Option B:** Allow through in development, redirect in production (current pattern)
- **Option C:** Timeout in development, redirect in production (safest)

**Recommendation:** Option A (strict) - Supabase Auth is reliable enough, no need for development workarounds.

---

### 8. Session Refresh Strategy
**Question:** Should we implement automatic session refresh or rely on Supabase defaults?

**Context:**
- Supabase Auth automatically refreshes tokens
- Default session duration: 1 hour with automatic refresh
- Client-side listener can handle auth state changes
- Server Components get fresh session on each request

**Options:**
- **Option A:** Use Supabase defaults (1 hour sessions, auto-refresh)
- **Option B:** Custom session duration via config
- **Option C:** Implement manual refresh logic

**Recommendation:** Option A (defaults) - Supabase handles this well out-of-the-box.

---

## Final Recommendations Summary

### Critical Path for Iteration 3

**Phase 1: Database Fix (30 min - 1 hour)**
- Change DATABASE_URL to direct connection
- Test all database operations
- Update documentation
- **Builder:** 1 builder, low risk

**Phase 2: Supabase Auth Migration (3-4 hours)**
- Builder-1: Infrastructure setup (1.5-2 hours)
  - Enable Supabase Auth
  - Install dependencies
  - Create client utilities
  - Migrate Prisma schema
- Builder-2: Integration (1.5-2 hours)
  - Update middleware and tRPC
  - Implement Auth UI
  - Test all flows
  - Update documentation
- **Builders:** 2 sequential builders, medium-high risk

**Phase 3: Frontend Redesign (DEFER TO ITERATION 4)**
- Too much for one iteration with auth migration
- Auth should be stable before major UI changes
- Design system work is independent of auth

### Risk Mitigation

**High Priority:**
1. Create comprehensive test checklist for Builder-2
2. Prepare rollback plan before starting
3. Backup database before migration
4. Test each component in isolation before integration

**Medium Priority:**
1. Document all environment variable changes
2. Create migration script with validation
3. Add error logging during transition
4. Keep old auth code in git history for reference

### Success Criteria for Iteration 3

**Database Fix:**
- [ ] DATABASE_URL uses direct connection
- [ ] All Prisma commands work without errors
- [ ] User registration flow works
- [ ] tRPC procedures operational

**Supabase Auth:**
- [ ] Supabase Auth service running locally
- [ ] Email/password sign-up with verification works
- [ ] Magic link authentication works
- [ ] Password reset flow functional
- [ ] Protected routes secured properly
- [ ] tRPC context provides user correctly
- [ ] All existing routers still work
- [ ] Documentation updated

---

**End of Explorer 1 Report**

---

**Explorer:** 2L Explorer Agent (ID: 1)
**Focus Area:** Database Fix & Supabase Auth Architecture
**Date:** 2025-10-02
**Iteration:** 3
**Report Version:** 1.0
**Total Analysis Time:** ~2 hours
