# Admin User Setup Guide

Complete guide for creating and managing admin users in production.

## Overview

Admin users have elevated privileges including:
- Immediate access without email verification (pre-confirmed)
- ADMIN role in Prisma database
- Access to admin-only routes (if implemented)
- Ability to bypass onboarding flow

## Production Admin Creation

### Method 1: Supabase Dashboard (Recommended)

**Why this method:**
- Fastest (2-3 minutes total)
- Most reliable (visual confirmation)
- Zero risk of script errors
- Perfect for one-time setup

**Steps:**

1. **Navigate to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/users
   ```

2. **Click "Add user" button** (top right)

3. **Fill in form:**
   - **Email**: `ahiya.butman@gmail.com`
   - **Password**: `wealth_generator`
   - **Auto Confirm User**: ✅ **CHECKED** (critical - bypasses email verification)
   - **User Metadata**: (optional) Leave empty or add `{"name": "Ahiya"}`

4. **Click "Create user"**

5. **Verify success:**
   - User appears in user list
   - Green checkmark next to email (confirmed status)
   - Email confirmation timestamp populated

6. **Sync to Prisma database:**
   ```bash
   npx tsx scripts/create-admin-prod.ts
   ```

7. **Test login:**
   - Navigate to: `https://[your-vercel-app].vercel.app/signin`
   - Login with: `ahiya.butman@gmail.com` / `wealth_generator`
   - Expected: Redirect to /dashboard (no email verification required)

### Method 2: TypeScript Script (Fallback)

**When to use:**
- Automation for multiple environments (staging, dev)
- Batch admin user creation
- CI/CD integration

**Prerequisites:**
- Admin user must exist in Supabase Auth first (create via dashboard)
- Production environment variables loaded

**Run script:**
```bash
# Ensure production env vars loaded
npx tsx scripts/create-admin-prod.ts
```

**Expected output:**
```
🔑 Syncing production admin user...

Step 1: Fetching admin user from Supabase Auth...
  ✓ Found admin user: [uuid]
  Email: ahiya.butman@gmail.com
  Email confirmed: ✓

Step 2: Syncing admin user to Prisma database...
  ✓ Prisma user synced: [cuid]
  Role: ADMIN

✅ Admin user ready!

═══════════════════════════════════════
📧 Email:    ahiya.butman@gmail.com
🔑 Password: wealth_generator
🆔 User ID:  [cuid]
👑 Role:     ADMIN
✉️  Verified: Yes (pre-confirmed)
═══════════════════════════════════════
```

## Security Considerations

### Password Management

**Default password:** `wealth_generator`

**After first login:**
1. Navigate to: `/settings` (or wherever password change UI is located)
2. Update to secure password (12+ characters, mixed case, numbers, symbols)
3. Document new password in secure location (1Password, etc.)

**Password requirements:**
- Minimum: 6 characters (Supabase default)
- Recommended: 12+ characters with complexity

### Admin Role Privileges

The ADMIN role grants:
- Immediate access (bypasses email verification)
- Potential access to admin-only routes
- Elevated permissions in middleware/API routes

**Important:** Admin role should only be assigned to trusted application owners.

### Email Pre-Verification

**Why "Auto Confirm User" is critical:**
- Allows immediate production access
- Bypasses email verification requirement
- Prevents lockout from production app

**If not checked:**
- Admin will need to verify email before login
- May require manual verification via dashboard

## Troubleshooting

### Admin Cannot Login

**Checklist:**

1. **Verify email confirmed in Supabase:**
   - Dashboard → Authentication → Users
   - Find admin user
   - Check green checkmark next to email

2. **Check Prisma sync:**
   ```bash
   npx tsx scripts/create-admin-prod.ts
   ```
   - Should show success message
   - Verify role: ADMIN

3. **Verify role in database:**
   ```sql
   SELECT id, email, role, "supabaseAuthId"
   FROM "User"
   WHERE email = 'ahiya.butman@gmail.com';
   ```
   - Should return row with role = 'ADMIN'

4. **Check middleware logs:**
   - Review Vercel logs for auth errors
   - Verify session validation passes

5. **Try password reset:**
   - Navigate to: `/signin`
   - Click "Forgot password?"
   - Reset password via email

### Email Not Confirmed

**If green checkmark not visible:**

**Option 1: Manual verification via dashboard**
1. Dashboard → Authentication → Users
2. Click admin user row
3. Click "..." menu (top right)
4. Select "Confirm email"

**Option 2: Re-create user**
1. Delete existing admin user
2. Create new user with "Auto Confirm User" ✓ checked
3. Run sync script again

### Script Errors

**Error: "Admin user not found in Supabase Auth"**

**Solution:** Create admin via dashboard first (Method 1 steps 1-5)

**Error: "Missing required environment variables"**

**Solution:** Ensure production env vars loaded:
```bash
# Check if vars exist
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Load from .env.local if needed
export $(grep -v '^#' .env.local | xargs)
```

**Error: "Failed to list users"**

**Solution:** Verify `SUPABASE_SERVICE_ROLE_KEY` is correct:
- Dashboard → Project Settings → API
- Copy "service_role" secret (not anon key)
- Update environment variable

## Multiple Admin Users

To create additional admin users:

1. **Create in Supabase Dashboard:**
   - Use different email address
   - Check "Auto Confirm User" ✓
   - Set secure password

2. **Sync to Prisma:**
   - Modify `scripts/create-admin-prod.ts`
   - Change email filter: `u.email === 'new-admin@example.com'`
   - Run script

3. **Or use upsert directly:**
   ```typescript
   await prisma.user.upsert({
     where: { email: 'new-admin@example.com' },
     update: { role: 'ADMIN' },
     create: {
       email: 'new-admin@example.com',
       name: 'Admin Name',
       supabaseAuthId: '[uuid-from-supabase]',
       role: 'ADMIN',
       currency: 'NIS',
       onboardingCompletedAt: new Date(),
     },
   })
   ```

## Admin User Audit

To verify admin users in production:

```sql
-- List all admin users
SELECT id, email, name, role, "createdAt"
FROM "User"
WHERE role = 'ADMIN'
ORDER BY "createdAt" DESC;

-- Verify Supabase auth linkage
SELECT
  u.id as prisma_id,
  u.email,
  u.role,
  u."supabaseAuthId"
FROM "User" u
WHERE u.role = 'ADMIN';
```

## Environment Variables Reference

Required for admin user scripts:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://npylfibbutxioxjtcbvy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[secret]  # Server-only, full database access

# Database (for Prisma)
DATABASE_URL=postgresql://[pooled-connection]
DIRECT_URL=postgresql://[direct-connection]
```

## Testing Admin Access

After admin user creation, verify:

**1. Admin Login:**
```
✓ Navigate to production URL
✓ Login with admin credentials
✓ Redirected to /dashboard (no email verification block)
```

**2. Dashboard Access:**
```
✓ Can access /dashboard
✓ Can access /transactions
✓ Can access /analytics
✓ Can access /settings
```

**3. Transaction Creation:**
```
✓ Create transaction: 150.50
✓ Displays as "150.50 ₪" (NIS format)
✓ Shows in dashboard totals
✓ Appears in analytics charts
```

**4. Admin Routes (if applicable):**
```
✓ Can access /admin routes
✓ Middleware allows admin role
✓ No 403 Forbidden errors
```

## Disaster Recovery

**If admin user corrupted or locked out:**

1. **Reset via Supabase Dashboard:**
   - Navigate to: Authentication → Users
   - Find admin user
   - Click "..." → "Reset password"
   - Check email for reset link

2. **Delete and recreate:**
   - Dashboard → Users → Delete admin user
   - Follow Method 1 steps to create new admin
   - Run sync script

3. **Manual database fix:**
   ```sql
   -- Update role in Prisma
   UPDATE "User"
   SET role = 'ADMIN'
   WHERE email = 'ahiya.butman@gmail.com';
   ```

4. **Verify in Supabase Auth:**
   - Check user exists in auth.users table
   - Confirm email_confirmed_at is set
   - Verify no account lockout

## Notes

- Admin users bypass email verification (by design)
- Role assignment happens in Prisma, not Supabase Auth
- Middleware checks User.role for authorization
- Admin password should be changed after first login
- Service role key has full database access (keep secure)
- Script is idempotent (safe to run multiple times)
