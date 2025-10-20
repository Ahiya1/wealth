# Wealth - Iteration 3: Database Connection Fix & Supabase Auth Integration

## Iteration Overview

**Goal:** Fix the database connection error and optionally integrate Supabase Auth to replace NextAuth.

**Estimated Time:** 2-3 hours

---

## Current Issues

### Critical Issue: Database Connection Error

**Error:**
```
Invalid `prisma.user.findUnique()` invocation:
Error querying the database: FATAL: Tenant or user not found
```

**Root Cause:** The DATABASE_URL is using pgBouncer pooler but missing required connection parameters.

**Current (Broken):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
```

**Should Be:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true&connection_limit=1"
```

OR use direct connection:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

---

## Objectives

### 1. Fix Database Connection (CRITICAL - P0)

**Requirements:**

1. **Update DATABASE_URL with Correct Parameters**
   - Add `connection_limit=1` to pooler URL
   - Or switch to direct connection for simplicity
   - Test user registration works

2. **Verify Prisma Client Configuration**
   - Check `src/lib/prisma.ts` is using correct connection
   - Ensure connection pooling works properly
   - Test all CRUD operations

3. **Update Documentation**
   - Fix `.env.example` with correct DATABASE_URL
   - Update README with proper connection string format
   - Add troubleshooting for "Tenant or user not found" error

### 2. Supabase Auth Integration (OPTIONAL - P1)

**Current State:**
- Using NextAuth.js with Prisma adapter
- Email/password authentication only (Google OAuth optional)
- Custom User/Account/Session tables
- Password hashing with bcryptjs

**Target State:**
- Integrate Supabase Auth alongside or replace NextAuth
- Leverage Supabase's built-in auth system
- Use Supabase Auth UI components
- Support email/password, magic links, OAuth providers
- Maintain existing authentication flow compatibility

**Requirements:**

1. **Supabase Auth Configuration**
   - Enable Auth service in `supabase/config.toml`
   - Configure auth settings (JWT expiry, password requirements)
   - Set up email templates for verification/reset

2. **Auth Integration Approach (Choose One)**

   **Option A: Hybrid Approach (Recommended for Migration)**
   - Keep NextAuth for existing users
   - Add Supabase Auth as alternative
   - Create migration path from NextAuth → Supabase Auth
   - Both systems work side-by-side

   **Option B: Full Replacement**
   - Migrate completely to Supabase Auth
   - Remove NextAuth dependency
   - Remove User/Account/Session Prisma models
   - Use Supabase auth.users table
   - Update all auth logic

3. **Auth Features to Implement**
   - Email/password signup and login
   - Email verification
   - Password reset flow
   - Magic link authentication (passwordless)
   - OAuth providers (Google, GitHub)
   - Session management
   - Protected routes middleware

4. **Database Schema Updates**
   - If Hybrid: Keep existing User model, link to Supabase auth_id
   - If Full Replacement: Remove User/Account/Session models
   - Add auth_id foreign key to all user-owned resources
   - Set up RLS (Row Level Security) policies

5. **UI/UX Updates**
   - Replace auth forms with Supabase Auth UI
   - Or build custom forms using Supabase auth API
   - Update sign in/sign up pages
   - Add email verification flow
   - Update profile settings

6. **tRPC Integration**
   - Update auth context to use Supabase session
   - Modify `protectedProcedure` to check Supabase auth
   - Update session management in tRPC

---

## Success Criteria

### Database Connection Fix (5 criteria - REQUIRED)
- [ ] 1. DATABASE_URL updated with correct connection parameters
- [ ] 2. User registration works without "Tenant or user not found" error
- [ ] 3. All Prisma CRUD operations work
- [ ] 4. Documentation updated with correct connection string
- [ ] 5. Can sign up, sign in, and access protected routes

### Supabase Auth Integration (10 criteria - OPTIONAL)
- [ ] 6. Supabase Auth service enabled and running
- [ ] 7. Email/password signup works via Supabase Auth
- [ ] 8. Email/password login works via Supabase Auth
- [ ] 9. Email verification flow functional
- [ ] 10. Password reset flow functional
- [ ] 11. Magic link authentication works
- [ ] 12. OAuth providers configured (Google)
- [ ] 13. Session management via Supabase
- [ ] 14. Protected routes use Supabase auth
- [ ] 15. All tRPC endpoints respect Supabase auth

---

## Technical Approach

### Database Connection Fix

**Quick Fix (5 minutes):**
```env
# Option 1: Use pooler with correct parameters
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true&connection_limit=1"

# Option 2: Use direct connection (simpler for dev)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Update Files:**
- `.env.local` - Fix DATABASE_URL
- `.env.example` - Update with correct format
- `README.md` - Add connection troubleshooting

### Supabase Auth Integration

**Hybrid Approach (Recommended):**

1. **Enable Supabase Auth:**
```toml
# supabase/config.toml
[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = []
jwt_expiry = 3600
enable_signup = true
```

2. **Install Supabase Client:**
```bash
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

3. **Create Supabase Client:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

4. **Update Prisma Schema (Hybrid):**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  supabaseAuthId String?  @unique // Link to Supabase auth.users
  // ... existing fields
}
```

5. **Auth Provider Component:**
```typescript
// src/components/auth/AuthProvider.tsx
'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'

export function SupabaseAuth() {
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['google']}
    />
  )
}
```

6. **Update tRPC Context:**
```typescript
// src/server/api/trpc.ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = createClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  return {
    session,
    prisma,
    supabase,
  }
}
```

---

## Build Strategy

### Phase 1: Fix Database Connection (CRITICAL)
**Builder-1:** Database Connection Fix (15-20 min)
- Fix DATABASE_URL in .env files
- Test user registration
- Update documentation
- **Must COMPLETE before Phase 2**

### Phase 2: Supabase Auth Integration (OPTIONAL)
**Builder-2:** Supabase Auth Setup (30-45 min)
- Enable Auth service
- Install dependencies
- Create Supabase client
- Configure auth settings

**Builder-3:** Auth UI & Flow (45-60 min)
- Update sign in/sign up pages
- Implement email verification
- Implement password reset
- Add OAuth providers

**Builder-4:** Auth Integration (45-60 min)
- Update tRPC context
- Modify protected procedures
- Update middleware
- Test all auth flows

---

## Testing Strategy

### Database Connection
1. Start Supabase: `npm run db:local`
2. Start app: `npm run dev`
3. Navigate to sign up: http://localhost:3000/signup
4. Fill out form and submit
5. Verify: No "Tenant or user not found" error
6. Check database: User created successfully

### Supabase Auth
1. Navigate to sign up with Supabase Auth UI
2. Test email/password signup → Verify email sent
3. Test email verification link
4. Test login with verified account
5. Test password reset flow
6. Test magic link login
7. Test Google OAuth
8. Test protected route access
9. Test session persistence
10. Test logout

---

## Out of Scope

- Supabase Auth production deployment
- Advanced RLS policies
- Multi-factor authentication (MFA)
- Phone authentication
- Social login beyond Google
- User role management
- Account deletion flows

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing auth | High | Critical | Use hybrid approach, keep NextAuth working |
| Database connection issues | Low | High | Test thoroughly, provide rollback |
| Session management conflicts | Medium | Medium | Clear session handling strategy |
| Email delivery in dev | High | Low | Use Supabase local email capture |

---

## Decision Points

### For Planner to Decide:

1. **Auth Approach:**
   - Hybrid (both NextAuth + Supabase Auth)?
   - Full replacement (Supabase Auth only)?
   - Recommendation: **Hybrid** for safety

2. **Database Connection:**
   - Use pooler with connection_limit?
   - Use direct connection?
   - Recommendation: **Direct** for simplicity in dev

3. **Priority:**
   - Fix DB connection only?
   - Fix DB + implement Supabase Auth?
   - Recommendation: **Both** for comprehensive solution

4. **Migration Strategy:**
   - Migrate existing users to Supabase Auth?
   - Keep existing users in NextAuth?
   - Recommendation: **Keep existing**, new users use Supabase

---

## Deliverables

### Minimum (Database Fix Only)
1. Fixed DATABASE_URL in all env files
2. User registration working
3. Updated documentation
4. Test confirmation report

### Full (Database + Auth)
1. Database connection fixed
2. Supabase Auth service enabled
3. Auth UI components implemented
4. Email/password auth working
5. Email verification working
6. Password reset working
7. Magic link working
8. OAuth providers configured
9. tRPC integration complete
10. All tests passing
11. Documentation updated

---

## Notes for Builders

- **Critical:** Test database connection before proceeding to auth
- **Hybrid approach:** Don't break existing NextAuth functionality
- **Email in dev:** Supabase captures emails locally, check Studio → Auth → Users
- **Sessions:** Decide between cookie-based (NextAuth) vs localStorage (Supabase)
- **RLS:** Not required for MVP, but plan for future

---

**End of Iteration 3 Requirements**
