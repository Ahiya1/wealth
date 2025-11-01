# Vercel Environment Variables - Quick Reference

This document provides a quick reference for configuring environment variables in Vercel for the Wealth app deployment.

## Required Environment Variables (7 Total)

All variables must be configured in **Vercel Dashboard → Settings → Environment Variables** before deployment.

### Database Configuration (2 variables)

#### `DATABASE_URL`
- **Purpose:** Runtime database queries via Prisma (uses connection pooling)
- **Value Format:** `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- **Port:** 6543 (Transaction Pooler)
- **Critical Parameters:**
  - `?pgbouncer=true` - Enables connection pooling
  - `&connection_limit=1` - Limits connections per serverless function
- **Get From:** Supabase Dashboard → Settings → Database → Connection string (Transaction pooler)
- **Environments:** Production, Preview, Development
- **Sensitive:** No (but contains password)

#### `DIRECT_URL`
- **Purpose:** Database migrations and schema operations (direct connection)
- **Value Format:** `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
- **Port:** 5432 (Direct Connection)
- **Get From:** Supabase Dashboard → Settings → Database → Connection string (Direct connection)
- **Environments:** Production, Preview, Development
- **Sensitive:** No (but contains password)

---

### Supabase Configuration (3 variables)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Purpose:** Client-side Supabase initialization
- **Value Format:** `https://[project-ref].supabase.co`
- **Example:** `https://npylfibbutxioxjtcbvy.supabase.co`
- **Get From:** Supabase Dashboard → Settings → API → Project URL
- **Environments:** Production, Preview, Development
- **Sensitive:** No (public variable, safe for client-side)
- **Note:** Must start with `https://` and NOT have trailing slash

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose:** Client-side Supabase authentication
- **Value Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT format)
- **Get From:** Supabase Dashboard → Settings → API → Project API keys → anon public
- **Environments:** Production, Preview, Development
- **Sensitive:** No (public variable, rate-limited and RLS-protected)
- **Note:** Starts with `eyJ`, typically 200+ characters

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Purpose:** Server-side admin operations (bypasses RLS)
- **Value Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT format)
- **Get From:** Supabase Dashboard → Settings → API → Project API keys → service_role
- **Environments:** Production, Preview, Development
- **Sensitive:** **YES** ✓ (CRITICAL - has full database access)
- **Security:**
  - NEVER expose to client-side code
  - Mark as "Sensitive" in Vercel dashboard
  - Bypasses Row Level Security (RLS)
  - Can perform any database operation

---

### Security Configuration (2 variables)

#### `CRON_SECRET`
- **Purpose:** Protect cron endpoints from unauthorized access
- **Generate:** `openssl rand -hex 32`
- **Value Format:** 64-character hexadecimal string
- **Example:** `d57918b991ad6dd6a58cafcb82a7dae339ec7851eed27b9ce41936d1e8d08603`
- **Environments:** Production, Preview, Development
- **Sensitive:** **YES** ✓ (CRITICAL - protects scheduled jobs)
- **How It Works:**
  - Vercel Cron sends: `Authorization: Bearer [CRON_SECRET]`
  - Endpoint verifies secret before executing
  - Without valid secret, returns 401 Unauthorized

#### `ENCRYPTION_KEY`
- **Purpose:** AES-256 encryption for sensitive data (Plaid access tokens)
- **Generate:** `openssl rand -hex 32`
- **Value Format:** 64-character hexadecimal string
- **Example:** `a1b2c3d4e5f6... (64 chars)`
- **Environments:** Production, Preview, Development
- **Sensitive:** **YES** ✓ (CRITICAL - encrypts sensitive data)
- **Note:** Required even if not using Plaid (code references it)
- **Warning:** Changing this invalidates all encrypted tokens in database

---

## Configuration Steps

### Step 1: Generate Secrets

```bash
# Generate CRON_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

Save these outputs securely before proceeding.

### Step 2: Add Variables to Vercel

1. Go to **Vercel Dashboard**
2. Select your project
3. Navigate to **Settings → Environment Variables**
4. Click **"Add New"**
5. For each variable:
   - Enter **Name** (exact case-sensitive match)
   - Paste **Value**
   - Select **Environments** (check all three: Production, Preview, Development)
   - If marked **Sensitive** above, check **"Sensitive"** checkbox
   - Click **"Save"**

### Step 3: Verify Configuration

After adding all 7 variables:

- [ ] DATABASE_URL includes `?pgbouncer=true&connection_limit=1`
- [ ] NEXT_PUBLIC_SUPABASE_URL has no trailing slash
- [ ] All NEXT_PUBLIC_* variables visible (not sensitive)
- [ ] SUPABASE_SERVICE_ROLE_KEY marked as sensitive (encrypted in UI)
- [ ] CRON_SECRET marked as sensitive
- [ ] ENCRYPTION_KEY marked as sensitive
- [ ] All variables applied to Production, Preview, and Development

---

## Variable Visibility

### Public Variables (visible in browser)
These variables are safe to expose in client-side code:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-Only Variables (NEVER expose to client)
These must remain server-side only:
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY` ← **CRITICAL**
- `CRON_SECRET` ← **CRITICAL**
- `ENCRYPTION_KEY` ← **CRITICAL**

**How to verify:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `console.log(process.env)`
4. Should ONLY see `NEXT_PUBLIC_*` variables
5. If you see `SUPABASE_SERVICE_ROLE_KEY`, **STOP IMMEDIATELY** - configuration error!

---

## Testing Environment Variables

### Test Locally

```bash
# Create .env.production (do NOT commit)
cp .env.example .env.production

# Add production values
# Run build test
npm run build

# Should complete successfully with:
# ✓ Prisma Client generated successfully
# ✓ Compiled successfully
```

### Test in Vercel Preview

1. Create test branch:
   ```bash
   git checkout -b env-test
   git push origin env-test
   ```

2. Vercel automatically deploys preview

3. Check preview deployment logs:
   - Vercel Dashboard → Deployments → [Latest Preview]
   - Look for: "Prisma Client generated successfully"
   - Look for: "Build completed successfully"

4. Test preview URL:
   - Visit preview URL (e.g., `https://wealth-git-env-test-username.vercel.app`)
   - Check browser console for environment variable errors
   - Test sign in/sign up flow

### Test Cron Endpoint

```bash
curl -X GET https://[YOUR_VERCEL_URL]/api/cron/generate-recurring \
  -H "Authorization: Bearer [YOUR_CRON_SECRET]"
```

**Expected:** `{"success": true, ...}`
**If 401:** CRON_SECRET mismatch - verify secret in Vercel matches command

---

## Common Errors and Solutions

### Error: "Missing environment variable DATABASE_URL"
**Cause:** Variable not set or not applied to correct environment
**Fix:**
1. Verify variable exists in Vercel Settings
2. Check it's applied to correct environment (Production/Preview)
3. Redeploy to trigger new build with updated env vars

### Error: "Connection pool timeout"
**Cause:** DATABASE_URL missing `?pgbouncer=true&connection_limit=1`
**Fix:**
1. Update DATABASE_URL in Vercel
2. Ensure query parameters are present
3. Redeploy

### Error: "Unauthorized" when calling Supabase
**Cause:** Incorrect SUPABASE_SERVICE_ROLE_KEY or ANON_KEY
**Fix:**
1. Copy keys again from Supabase Dashboard
2. Ensure no extra spaces or characters
3. Update in Vercel and redeploy

### Error: CORS errors in browser
**Cause:** NEXT_PUBLIC_SUPABASE_URL incorrect or has trailing slash
**Fix:**
1. Remove trailing slash from URL
2. Verify exact URL from Supabase Dashboard
3. Update in Vercel and redeploy

---

## Environment-Specific Configuration

### Production
- Use production Supabase project
- Real database with production data
- Real secrets (not test/dev secrets)
- Enable monitoring and alerts

### Preview (Test Branches)
- Can use same production database (with caution)
- Or use separate staging Supabase project
- Same secrets as production (recommended)
- Used for testing before merging to main

### Development (Local)
- Use local Supabase (`http://localhost:54421`)
- Local database (`localhost:54432`)
- Development secrets (can be shared in .env.example)
- Not required to be set in Vercel (only for `vercel dev` command)

---

## Security Best Practices

1. **Never commit secrets to git**
   - `.env.local` in `.gitignore`
   - `.env.production` in `.gitignore`
   - Use `.env.example` for variable names only

2. **Rotate secrets regularly**
   - Regenerate CRON_SECRET every 90 days
   - Regenerate ENCRYPTION_KEY with caution (invalidates encrypted data)

3. **Use different secrets per environment**
   - Production: Strong, unique secrets
   - Staging: Different secrets than production
   - Development: Can use example secrets from documentation

4. **Monitor access logs**
   - Check Vercel function logs for unauthorized cron attempts
   - Monitor Supabase logs for suspicious database queries

5. **Principle of least privilege**
   - Use ANON_KEY for client-side (rate-limited, RLS-protected)
   - Use SERVICE_ROLE_KEY only for server-side admin operations
   - Never expose SERVICE_ROLE_KEY in client-side code

---

## Quick Troubleshooting Checklist

If deployment fails or app doesn't work:

- [ ] All 7 variables configured in Vercel?
- [ ] Variables applied to correct environment?
- [ ] DATABASE_URL includes `?pgbouncer=true&connection_limit=1`?
- [ ] NEXT_PUBLIC_SUPABASE_URL has no trailing slash?
- [ ] SUPABASE_SERVICE_ROLE_KEY marked as sensitive?
- [ ] CRON_SECRET marked as sensitive?
- [ ] ENCRYPTION_KEY marked as sensitive?
- [ ] Secrets are 64 characters (hex)?
- [ ] JWT tokens start with `eyJ`?
- [ ] No typos in variable names (case-sensitive)?
- [ ] Redeployed after changing variables?

---

**Last Updated:** 2025-11-01
**Version:** 1.0.0
**Maintained by:** Builder-1B (Deployment Configuration)
