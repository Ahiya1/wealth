# Fix Checklist - P0/P1 Errors Only

**Total P0/P1 Errors:** 3
**Estimated Total Fix Time:** 65-80 minutes
**SPLIT Recommendation:** NO (< 10 errors, manageable in single builder)

---

## Priority Order (Fix in this order)

### Phase 1: Critical (P0) - Blocks Everything

#### Error 1: Middleware + Auth() Causes Infinite Hang

- **Priority:** P0
- **Category:** Auth/Middleware
- **Time:** 30-45 minutes
- **Status:** ⏸️ NOT FIXED

**Problem:**
The `middleware.ts` file calls `auth()` function which hangs indefinitely, blocking all requests when middleware is active. Even though middleware matcher is `/dashboard/:path*`, it seems to affect all routes.

**Location:**
- File: `/middleware.ts` (root directory)
- Lines: 1-11

**Fix Strategy:**

1. **Option 1: Conditional middleware execution (recommended)**
   ```typescript
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'
   import { auth } from '@/lib/auth'

   export async function middleware(request: NextRequest) {
     // Only run auth check for protected routes
     const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

     if (!isProtectedRoute) {
       return NextResponse.next()
     }

     try {
       // Add timeout to prevent infinite hang
       const timeoutPromise = new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Auth timeout')), 5000)
       )

       const session = await Promise.race([
         auth(),
         timeoutPromise
       ])

       if (!session) {
         return NextResponse.redirect(new URL('/signin', request.url))
       }

       return NextResponse.next()
     } catch (error) {
       console.error('Middleware auth error:', error)
       // Allow request to proceed on error to prevent complete block
       return NextResponse.next()
     }
   }

   export const config = {
     matcher: ['/dashboard/:path*', '/accounts/:path*', '/transactions/:path*', '/budgets/:path*', '/goals/:path*', '/analytics/:path*', '/settings/:path*'],
   }
   ```

2. **Option 2: Remove middleware temporarily**
   - Rely on page-level auth checks using `await auth()` in each page
   - Less secure but unblocks development

3. **Option 3: Use NextAuth v5 middleware helper**
   ```typescript
   export { auth as middleware } from '@/lib/auth'
   ```

**Testing:**
- Start dev server
- Visit http://localhost:3000 - should load immediately
- Visit http://localhost:3000/dashboard - should redirect to /signin
- Visit http://localhost:3000/signin - should load immediately

---

#### Error 2: Google OAuth Environment Variables Required But Not Set

- **Priority:** P0
- **Category:** Environment/Configuration
- **Time:** 15 minutes
- **Status:** ⏸️ PARTIALLY MITIGATED (placeholders added, but not fixed in code)

**Problem:**
Google OAuth provider uses non-null assertion (`!`) for environment variables, causing crash if variables are undefined or placeholder values.

**Location:**
- File: `src/lib/auth.ts`
- Lines: 17-20

**Current Code:**
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,  // ❌ Uses ! assertion
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,  // ❌ Expects non-null
}),
```

**Fix Strategy:**

```typescript
// src/lib/auth.ts
providers: [
  // Conditionally include Google OAuth only if credentials are provided
  ...(process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id'
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  CredentialsProvider({
    // ... existing credentials config
  }),
],
```

**Alternative (if keeping Google OAuth always):**
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // Add allowDangerousEmailAccountLinking: false to prevent issues
}),
```

**Testing:**
- Comment out GOOGLE_CLIENT_ID in .env.local
- Start dev server: `npm run dev`
- Should start without errors
- Visit /signin page
- Google OAuth button should not appear (or be disabled)
- Email/password sign in should still work

---

### Phase 2: High (P1) - Major Features Broken

#### Error 3: Seed Script Validation Error - Cannot Create Default Categories

- **Priority:** P1
- **Category:** Database/Seed
- **Time:** 20 minutes
- **Status:** ⏸️ NOT FIXED

**Problem:**
Prisma schema defines `userId` as optional in Category model, but includes it in unique constraint `@@unique([userId, name])`. Seed script tries to create global categories without userId, violating the constraint.

**Location:**
- File: `prisma/seed.ts`
- Model: `Category` in `prisma/schema.prisma`

**Error Message:**
```
PrismaClientValidationError: Argument `userId` must not be null
Invalid `prisma.category.create()` invocation
```

**Fix Strategy:**

**Option 1: Remove userId from unique constraint (RECOMMENDED)**
```prisma
// prisma/schema.prisma
model Category {
  id          String   @id @default(cuid())
  name        String   @unique  // ✅ Only name is unique
  type        CategoryType
  color       String?
  icon        String?
  userId      String?  // ✅ Optional - NULL for global categories
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... rest of model

  @@index([userId])
  // @@unique([userId, name])  ❌ REMOVE THIS
}
```

**Option 2: Make userId required and create system user**
```typescript
// prisma/seed.ts
async function seed() {
  // Create or get system user for global categories
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@wealth.local' },
    update: {},
    create: {
      email: 'system@wealth.local',
      name: 'System',
      emailVerified: new Date(),
      // No password - cannot sign in
    },
  })

  // Seed categories with system userId
  const categories = [
    { name: 'Groceries', type: 'EXPENSE', color: '#10b981', icon: 'ShoppingCart', userId: systemUser.id },
    // ... rest of categories
  ]

  await prisma.category.createMany({
    data: categories,
    skipDuplicates: true,
  })
}
```

**Option 3: Allow NULL in unique constraint (complex)**
```prisma
// This requires custom SQL migration
@@unique([userId, name], name: "user_category_unique")
// Then add partial unique index that allows NULL userId
```

**Testing:**
- Apply schema change: `npm run db:push`
- Reset database: `npm run db:reset`
- OR run seed: `npm run db:seed`
- Verify in Supabase Studio: http://localhost:54323
- Should see 15+ default categories
- Check Category table has populated data

---

## Phase Summary

**Phase 1 Total:** 2 errors, 45-60 minutes
**Phase 2 Total:** 1 error, 20 minutes

**Total Time:** 65-80 minutes (within Builder-3 budget)

---

## SPLIT Strategy

**Recommendation:** NO SPLIT NEEDED

**Justification:**
- Only 3 P0/P1 errors discovered (threshold is > 10)
- Errors are related but can be fixed sequentially
- Total estimated time: 65-80 minutes (within 90-minute budget)
- No complex dependencies between fixes
- Single builder can maintain context and fix all efficiently

**If Additional Errors Are Discovered:**
If page-by-page testing reveals > 7 more P0/P1 errors (total > 10), then consider split:
- **Builder-3A:** Middleware + Auth fixes (Errors 1-2)
- **Builder-3B:** Database + tRPC fixes (Error 3 + any new DB errors)
- **Builder-3C:** React + UI fixes (any new component errors)

---

## Dependencies Between Fixes

```
Fix Order:
1. Error 2 (Google OAuth) - FIRST (prerequisite for Error 1)
   └─> Ensures auth config is valid before fixing middleware

2. Error 1 (Middleware hang) - SECOND
   └─> Unblocks all page access for testing

3. Error 3 (Seed script) - THIRD
   └─> Enables full feature testing with categories
```

**Critical Path:** Error 1 MUST be fixed before comprehensive page testing can continue

---

## Testing After All Fixes

### Smoke Test Checklist

```bash
# 1. Clean start
npm run db:reset  # Should succeed now (Error 3 fixed)

# 2. Start application
npm run dev  # Should start without hanging (Errors 1-2 fixed)

# 3. Test public pages
curl -I http://localhost:3000  # Should return 200 immediately
curl -I http://localhost:3000/signin  # Should return 200
curl -I http://localhost:3000/signup  # Should return 200

# 4. Test authentication flow
# - Visit http://localhost:3000/signup
# - Create user: test@example.com / password123
# - Should redirect to /dashboard
# - Should NOT hang or show errors

# 5. Test protected pages
# - Visit http://localhost:3000/dashboard
# - Should load with data (or empty state)
# - No console errors

# 6. Verify categories exist
# - docker exec supabase_db_wealth psql -U postgres -c "SELECT COUNT(*) FROM \"Category\";"
# - Should show 15+ categories
```

---

## Notes for Builder-3

### Current Workarounds Applied by Builder-2

1. **Middleware Disabled:** File renamed to `middleware.ts.disabled`
   - Must re-enable and fix properly
   - Current state allows testing but security is weakened

2. **Google OAuth Placeholders:** Variables uncommented in .env.local
   - Placeholder values present but not valid credentials
   - May still cause issues during OAuth flow testing

3. **No Seed Data:** Categories table is empty
   - Manual category creation required for transaction/budget testing
   - Full app testing blocked until fixed

### Environment Status

- ✅ Supabase running (localhost:5432, :54322, :54323)
- ✅ Database schema migrated (10 tables)
- ✅ .env.local configured
- ⚠️ Middleware disabled (temporary workaround)
- ⚠️ No categories in database
- ✅ App accessible on http://localhost:3000

### Additional Testing Needed After Fixes

Once P0/P1 errors are fixed, Builder-3 should test:
- All 11+ pages for console errors
- All 4 user flows (signup, budgets, goals, analytics)
- tRPC endpoint responses
- React hydration warnings
- Database CRUD operations

**Expected Additional Errors:** 2-5 P2/P3 errors (UI polish, minor issues)

---

## Blockers for Builder-2 (Error Discovery)

Builder-2 testing was BLOCKED by Error 1 (middleware hang). Unable to:
- Use Chrome DevTools to inspect browser console
- Test all 11+ pages systematically
- Complete user flow testing
- Discover additional runtime errors

**Recommendation:** Builder-3 should fix Error 1 first, then Builder-2 can resume comprehensive testing if needed.

---

**Last Updated:** 2025-10-02
**Status:** READY FOR BUILDER-3
**Estimated Builder-3 Time:** 65-80 minutes (MEDIUM complexity, NO SPLIT)
