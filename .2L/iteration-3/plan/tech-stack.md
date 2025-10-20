# Technology Stack - Iteration 3

## Core Authentication Framework

### Decision: Supabase Auth

**Version:** @supabase/supabase-js 2.58.0+

**Rationale:**
1. **Unified platform** - Already using Supabase for database, auth integration is seamless
2. **Built-in features** - Email verification, magic links, OAuth providers out-of-the-box
3. **Production-ready** - Mature, actively maintained, used by thousands of apps
4. **Better UX** - Passwordless authentication, social login, automatic session refresh
5. **Less maintenance** - Supabase team handles security updates and bug fixes
6. **Local development** - Full auth service runs locally via Supabase CLI

**Alternatives Considered:**
- **NextAuth v5** (currently in use): Why not chosen
  - Beta version with limited support
  - Manual email verification setup required
  - No magic link support without custom implementation
  - Session management more complex
  - Requires maintaining separate auth infrastructure

- **Auth0**: Why not chosen
  - External service with costs
  - Adds another dependency
  - Overkill for current needs
  - More complex setup

**Key Packages:**
```bash
@supabase/supabase-js@^2.58.0      # Core client library (~50KB gzipped)
@supabase/ssr@^0.5.2               # Next.js App Router SSR helpers
@supabase/auth-ui-react@^0.4.7    # Pre-built auth UI components
@supabase/auth-ui-shared@^0.1.8   # Theme utilities for auth UI
```

**Packages to Remove:**
```bash
next-auth@5.0.0-beta.25            # Replaced by Supabase Auth
@auth/prisma-adapter@2.7.4         # No longer needed
bcryptjs@2.4.3                     # Supabase handles password hashing
@types/bcryptjs@2.4.6              # Type definitions no longer needed
```

## Database

### Decision: PostgreSQL via Supabase (Direct Connection)

**Connection String:** `postgresql://postgres:postgres@localhost:5432/postgres`

**Rationale:**
1. **Reliability** - Direct connection eliminates pgBouncer pooler complexity for local dev
2. **Prisma compatibility** - All Prisma operations work without limitations
3. **Simplicity** - Fewer moving parts, easier debugging
4. **Single developer** - Connection pooling not beneficial in local environment
5. **Production flexibility** - Can switch to pooler in production via DIRECT_URL

**Change from Current Setup:**
- **FROM:** Pooled connection (port 54322) with `?pgbouncer=true`
- **TO:** Direct connection (port 5432)

**Schema Strategy:**

**User Model Updates:**
```prisma
model User {
  id               String   @id @default(cuid())
  supabaseAuthId   String   @unique  // NEW - links to Supabase Auth user.id
  email            String   @unique
  name             String?
  image            String?
  currency         String   @default("USD")
  timezone         String   @default("America/New_York")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // REMOVE these - managed by Supabase Auth
  // passwordHash  String?
  // oauthAccounts OAuthAccount[]
  // passwordResetTokens PasswordResetToken[]

  // Keep all application relations
  categories    Category[]
  accounts      Account[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]

  @@index([supabaseAuthId])
  @@index([email])
}
```

**Models to Remove:**
- `OAuthAccount` - Supabase Auth handles OAuth
- `PasswordResetToken` - Supabase Auth handles password reset

**Migration Strategy:**
1. Add `supabaseAuthId` as nullable field
2. Test with new auth system
3. After validation, make `supabaseAuthId` required
4. Remove `passwordHash` field
5. Drop `OAuthAccount` and `PasswordResetToken` tables

## Authentication Implementation

### Client-Side Auth

**Library:** @supabase/ssr (createBrowserClient)

**Purpose:** Sign in/up forms, OAuth flows, client-side session management

**Implementation Pattern:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Key Features:**
- Automatic session management
- Cookie-based auth
- Auth state change listeners
- OAuth redirect handling

### Server-Side Auth

**Library:** @supabase/ssr (createServerClient)

**Purpose:** Protected routes, server components, API endpoints

**Implementation Pattern:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
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
```

**Key Features:**
- Server-side session validation
- Automatic cookie management
- Works with Next.js middleware
- Supports server components

### Auth UI Components

**Library:** @supabase/auth-ui-react

**Purpose:** Pre-built auth forms (sign in, sign up, magic link, OAuth)

**Rationale:**
- Saves 2-3 hours of form development
- Handles all edge cases (validation, errors, loading states)
- Customizable theming
- Accessible and production-ready
- Can be replaced with custom forms later if needed

**Implementation:**
```tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

<Auth
  supabaseClient={supabase}
  appearance={{ theme: ThemeSupa }}
  providers={['google']}
  redirectTo="http://localhost:3000/auth/callback"
/>
```

## API Layer

### Decision: tRPC with Supabase Context

**Current tRPC Version:** 11.6.0 (no change)

**Context Updates:**

**Before (NextAuth):**
```typescript
export const createTRPCContext = async (opts) => {
  const session = await auth()
  return { session, prisma }
}
```

**After (Supabase):**
```typescript
export const createTRPCContext = async (opts) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  let user = null
  if (supabaseUser) {
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id }
    })
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata.name
        }
      })
    }
  }

  return { supabase, supabaseUser, user, prisma }
}
```

**Protected Procedure:**
```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})
```

**Implementation Notes:**
- `ctx.user` is now Prisma User (for application data)
- `ctx.supabaseUser` is Supabase Auth user (for auth metadata)
- Auto-sync creates Prisma user on first sign-in
- Existing procedures work with minimal changes

## Environment Variables

### Required Variables

**Local Development (.env.local):**
```bash
# Database (UPDATED - direct connection)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Supabase (UPDATED - make public for client-side)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<get from: npx supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<get from: npx supabase status>"

# Email Testing (Inbucket - local only)
# Access at: http://localhost:54324

# OAuth Providers (Optional - for testing)
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# Other (Keep as-is)
ENCRYPTION_KEY="5549c0ffd20ee507fbac6a9a84e281d9fad77dfbb122f74adeb722a87cc0bcf1"

# REMOVE (NextAuth no longer needed)
# NEXTAUTH_SECRET="..."
# NEXTAUTH_URL="..."
```

**Where to Get Values:**
- **NEXT_PUBLIC_SUPABASE_URL:** Run `npx supabase status` - API URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** Run `npx supabase status` - anon key
- **SUPABASE_SERVICE_ROLE_KEY:** Run `npx supabase status` - service_role key
- **GOOGLE_CLIENT_ID/SECRET:** Google Cloud Console OAuth 2.0 credentials

**Security Notes:**
- `NEXT_PUBLIC_*` variables are exposed to client (safe for anon key)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (never expose to client)
- Service role key has admin privileges (delete users, bypass RLS)

## Supabase Configuration

### Local Supabase Setup

**File:** `supabase/config.toml`

**Changes Required:**

**Auth Service (ENABLE):**
```toml
[auth]
enabled = true  # CHANGE from false
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true  # Email verification
double_confirm_changes = true  # Re-verify on email change
```

**Inbucket Email Testing (ENABLE):**
```toml
[inbucket]
enabled = true  # ENABLE for email testing
port = 54324
smtp_port = 54325
pop3_port = 54326
```

**Email Templates (Optional Customization):**
```toml
[auth.email.template.invite]
subject = "You've been invited to Wealth"
content_path = "./supabase/templates/invite.html"

[auth.email.template.confirmation]
subject = "Confirm your email - Wealth"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.magic_link]
subject = "Your magic link - Wealth"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.recovery]
subject = "Reset your password - Wealth"
content_path = "./supabase/templates/recovery.html"
```

**OAuth Providers (Optional):**
```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
client_secret = "env(GOOGLE_CLIENT_SECRET)"
```

## Dependencies Overview

### Install These:
```bash
npm install @supabase/supabase-js@^2.58.0
npm install @supabase/ssr@^0.5.2
npm install @supabase/auth-ui-react@^0.4.7
npm install @supabase/auth-ui-shared@^0.1.8
```

### Remove These:
```bash
npm uninstall next-auth
npm uninstall @auth/prisma-adapter
npm uninstall bcryptjs
npm uninstall @types/bcryptjs
```

### Keep These (No Changes):
- `@prisma/client@5.22.0` - Database ORM
- `prisma@5.22.0` - Prisma CLI
- `@trpc/server@11.6.0` - API layer
- `@trpc/client@11.6.0` - API client
- `@trpc/react-query@11.6.0` - React Query integration
- `next@14.2.33` - Framework
- `react@18.3.1` - UI library
- `tailwindcss@3.4.1` - Styling
- All other existing dependencies

**Total Bundle Impact:**
- Add: ~85KB (Supabase packages)
- Remove: ~50KB (NextAuth packages)
- Net: +35KB gzipped

## Performance Targets

### Auth Operations
- Sign in response: < 500ms
- Session validation: < 100ms (cached)
- Magic link send: < 2s
- OAuth redirect: < 1s

### Database Operations
- User lookup: < 50ms (indexed)
- User creation: < 200ms
- Schema push: < 5s

### Page Load
- Protected route check: < 100ms
- Auth UI render: < 200ms
- First contentful paint: < 1s

## Security Considerations

### Authentication Security

**Password Requirements:**
- Minimum 8 characters
- Configurable in Supabase dashboard
- Hashed with bcrypt by Supabase (automatic)

**Email Verification:**
- Required in production (prevents fake accounts)
- Optional in local dev (faster testing)
- Configurable via `enable_confirmations`

**Session Management:**
- JWT tokens with automatic refresh
- 1 hour session duration (default)
- Refresh token valid for 30 days
- Cookies are httpOnly and secure

**OAuth Security:**
- PKCE flow for OAuth 2.0
- State parameter prevents CSRF
- Redirect URL whitelist enforced

**API Security:**
- Anonymous key rate-limited (60 req/min)
- Service role key server-only
- Row-level security (RLS) ready for future

### Database Security

**Connection Security:**
- Local dev: localhost only (not exposed)
- Production: SSL required (future)
- Connection pooling via pgBouncer (production)

**Data Protection:**
- Passwords never stored (Supabase Auth handles)
- Sensitive fields encrypted at rest (Supabase default)
- Prisma prevents SQL injection (parameterized queries)

### Middleware Protection

**Route Protection:**
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/accounts/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/goals/:path*',
    '/analytics/:path*',
  ]
}
```

**Redirect Strategy:**
- Unauthenticated → `/signin?redirect=/original-path`
- Authenticated on auth pages → `/dashboard`
- Session expired → `/signin` with toast message

## Testing Infrastructure

### Auth Flow Testing

**Tools:**
- Inbucket (http://localhost:54324) - Email testing
- Supabase Studio (http://localhost:54323) - User management
- Browser DevTools - Network/cookies inspection

**Test Scenarios:**
1. Email/password signup
2. Email verification
3. Email/password signin
4. Magic link signin
5. Password reset
6. OAuth (Google)
7. Session persistence
8. Protected route redirect
9. Sign out

### Integration Testing

**tRPC Procedures:**
- Test with authenticated context
- Test with unauthenticated context
- Verify user data available
- Test error handling

**Middleware:**
- Test route protection
- Test redirect URLs
- Test session validation
- Test performance (< 100ms)

### Manual Testing Checklist

See `builder-tasks.md` for detailed test cases per builder.

## Monitoring & Debugging

### Supabase Logs

**Access logs:**
```bash
npx supabase logs
```

**Monitor auth events:**
- User signup
- Sign in attempts
- Password resets
- OAuth flows

### Database Monitoring

**Prisma Studio:**
```bash
npx prisma studio
```

**Check user records:**
- Verify supabaseAuthId populated
- Check user creation timestamps
- Validate relations intact

### Error Tracking

**Common Errors:**
- `UNAUTHORIZED` - User not authenticated
- `Invalid refresh token` - Session expired
- `User not found` - Prisma sync issue
- `Email not confirmed` - Verification required

**Debug Tools:**
- Chrome DevTools Network tab
- Supabase logs
- Next.js server logs
- tRPC error responses
