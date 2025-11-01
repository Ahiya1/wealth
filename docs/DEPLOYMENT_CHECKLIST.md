# Deployment Verification Checklist - Wealth App

This comprehensive checklist guides you through deploying the Wealth personal finance tracker to Vercel with Supabase backend. Follow each section sequentially to ensure a successful production deployment.

## Table of Contents
- [Pre-Deployment Setup](#pre-deployment-setup)
- [Environment Variables Configuration](#environment-variables-configuration)
- [Database Setup](#database-setup)
- [Vercel Project Setup](#vercel-project-setup)
- [Deployment Verification](#deployment-verification)
- [Post-Deployment Testing](#post-deployment-testing)
- [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Setup

### 1. Gather Production Credentials

#### Supabase Dashboard (https://app.supabase.com)
- [ ] Log into Supabase dashboard
- [ ] Navigate to your project (e.g., npylfibbutxioxjtcbvy)
- [ ] Go to **Settings → API**
- [ ] Copy and save the following:
  - [ ] **Project URL** (e.g., `https://npylfibbutxioxjtcbvy.supabase.co`)
  - [ ] **Anon/Public key** (starts with `eyJhbGc...`)
  - [ ] **Service Role key** (starts with `eyJhbGc...`)

#### Database Connection Strings
- [ ] Go to **Settings → Database**
- [ ] Copy **Connection string (Transaction pooler)** - Port 6543
  - Format: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- [ ] Copy **Connection string (Direct connection)** - Port 5432
  - Format: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

#### Generate Security Secrets

Run these commands and save the output:

```bash
# Generate CRON_SECRET (64 characters)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (64 characters)
openssl rand -hex 32
```

- [ ] CRON_SECRET generated: `___________________________`
- [ ] ENCRYPTION_KEY generated: `___________________________`

**IMPORTANT:** Store these secrets securely. You'll need them for Vercel configuration.

---

## Environment Variables Configuration

### 2. Prepare Environment Variables Document

Create a secure document (password manager, encrypted file) with all 7 required variables:

```bash
# DATABASE (REQUIRED)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# SUPABASE (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL="https://npylfibbutxioxjtcbvy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..." (your anon key)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." (your service role key)

# SECURITY (REQUIRED)
CRON_SECRET="your-generated-64-char-hex"
ENCRYPTION_KEY="your-generated-64-char-hex"
```

#### Critical Notes:
- [ ] DATABASE_URL **MUST** include `?pgbouncer=true&connection_limit=1`
- [ ] DATABASE_URL uses port **6543** (pooled connection)
- [ ] DIRECT_URL uses port **5432** (direct connection)
- [ ] No trailing slashes in NEXT_PUBLIC_SUPABASE_URL
- [ ] Service role key and secrets are different from anon key

---

## Database Setup

### 3. Push Prisma Schema to Production

**Prerequisites:**
- [ ] Supabase project created and running
- [ ] Database connection strings configured

#### Test Connection Locally

```bash
# Create temporary .env.production file (do NOT commit to git)
cp .env.example .env.production

# Edit .env.production with your production credentials
# Use your favorite editor: nano, vim, code, etc.
```

- [ ] `.env.production` created with production credentials
- [ ] File added to `.gitignore` (should already be there)

#### Push Schema to Production Database

```bash
# Set DATABASE_URL to production DIRECT_URL (port 5432)
export DATABASE_URL="postgresql://postgres.[ref]:[password]@....:5432/postgres"

# Push Prisma schema to production
npx prisma db push

# Expected output:
# ✔ Generated Prisma Client
# ✔ Your database is now in sync with your Prisma schema
```

- [ ] Schema push completed successfully
- [ ] No errors during migration
- [ ] Tables created: User, Account, Transaction, Category, Budget, Goal, RecurringTransaction

#### Verify Database Schema

```bash
# Open Prisma Studio connected to production
npx prisma studio
```

- [ ] Prisma Studio opens in browser
- [ ] Can see all tables listed (User, Account, Transaction, etc.)
- [ ] User.currency default is "NIS"
- [ ] Account.currency default is "NIS"

**Alternative verification via Supabase Dashboard:**
- [ ] Go to Supabase Dashboard → Database → Tables
- [ ] Verify all Prisma tables exist
- [ ] Check table schemas match prisma/schema.prisma

---

## Vercel Project Setup

### 4. Create Vercel Project

#### Option A: Vercel Dashboard (Recommended)

1. Visit https://vercel.com/new
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure project:
   - [ ] Framework preset: **Next.js** (auto-detected)
   - [ ] Root directory: `./` (default)
   - [ ] Build command: `npm run build` (default)
   - [ ] Output directory: `.next` (default)
   - [ ] Node version: 18.x or higher

5. **DO NOT deploy yet** - we need to configure environment variables first
   - [ ] Click **"Configure Project"** instead of **"Deploy"**

#### Option B: Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Link project (from repository root)
cd /path/to/wealth
vercel link

# Follow prompts:
# - Link to existing project? No
# - Project name: wealth (or your preferred name)
# - Directory: ./
```

- [ ] Vercel CLI installed
- [ ] Logged into Vercel
- [ ] Project linked successfully

### 5. Configure Environment Variables in Vercel

#### Via Vercel Dashboard

1. Go to **Settings → Environment Variables**
2. Add each variable with the following configuration:

| Variable Name | Value | Environments | Sensitive? |
|---------------|-------|--------------|------------|
| `DATABASE_URL` | `postgresql://...6543/postgres?pgbouncer=true&connection_limit=1` | Production, Preview, Development | No |
| `DIRECT_URL` | `postgresql://...5432/postgres` | Production, Preview, Development | No |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://npylfibbutxioxjtcbvy.supabase.co` | Production, Preview, Development | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (your anon key) | Production, Preview, Development | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (your service key) | Production, Preview, Development | **YES** ✓ |
| `CRON_SECRET` | Your generated 64-char hex | Production, Preview, Development | **YES** ✓ |
| `ENCRYPTION_KEY` | Your generated 64-char hex | Production, Preview, Development | **YES** ✓ |

**Checklist:**
- [ ] All 7 environment variables added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked as **Sensitive**
- [ ] `CRON_SECRET` marked as **Sensitive**
- [ ] `ENCRYPTION_KEY` marked as **Sensitive**
- [ ] All variables applied to **Production**, **Preview**, and **Development** environments
- [ ] No typos in variable names (case-sensitive!)
- [ ] DATABASE_URL includes `?pgbouncer=true&connection_limit=1`

#### Via Vercel CLI (Alternative)

```bash
# Set environment variables via CLI
vercel env add DATABASE_URL production
# Paste value when prompted

vercel env add DIRECT_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CRON_SECRET production
vercel env add ENCRYPTION_KEY production
```

### 6. Enable GitHub Integration

- [ ] Go to **Settings → Git**
- [ ] Verify GitHub repository is connected
- [ ] Enable **"Automatic Deployments"** on push to `main` branch
- [ ] Enable **"Preview Deployments"** for other branches
- [ ] Deployment branch: `main` (or your default branch)

---

## Deployment Verification

### 7. Create Preview Deployment (Test Branch)

**Why preview first?** Test deployment without affecting production.

```bash
# Create test branch
git checkout -b deployment-test

# Commit any pending changes
git add .
git commit -m "Configure Vercel deployment with production environment"

# Push to GitHub (triggers preview deployment)
git push origin deployment-test
```

- [ ] Branch created and pushed to GitHub
- [ ] Vercel automatically detected push
- [ ] Build started (check Vercel dashboard → Deployments)

### 8. Monitor Build Process

In Vercel Dashboard → Deployments → [Latest]:

- [ ] Build status: **Building...** → **Ready**
- [ ] Build time: Under 3 minutes (should be ~1-2 minutes)
- [ ] Build logs show:
  - [ ] `Prisma Client generated successfully`
  - [ ] `Compiled successfully`
  - [ ] `Creating an optimized production build`
  - [ ] No TypeScript errors
  - [ ] No environment variable warnings

### 9. Verify Preview Deployment

Once build completes:

- [ ] Preview URL generated (e.g., `https://wealth-git-deployment-test-username.vercel.app`)
- [ ] Click **"Visit"** button
- [ ] Site loads successfully (HTTPS with valid certificate)
- [ ] Homepage renders without errors

#### Browser Console Check
Press **F12** to open DevTools:
- [ ] No JavaScript errors in Console tab
- [ ] No 404 errors in Network tab
- [ ] No CORS errors
- [ ] Supabase connection initialized

#### Manual Navigation Test
- [ ] `/` (Homepage) loads
- [ ] `/signin` (Sign in page) loads
- [ ] `/signup` (Sign up page) loads
- [ ] Protected routes redirect to `/signin` (expected behavior)

---

## Post-Deployment Testing

### 10. Test Cron Endpoint

Verify the recurring transaction cron job endpoint is protected and functional.

```bash
# Replace [PREVIEW_URL] with your actual preview URL
# Replace [YOUR_CRON_SECRET] with your generated CRON_SECRET

curl -X GET https://[PREVIEW_URL]/api/cron/generate-recurring \
  -H "Authorization: Bearer [YOUR_CRON_SECRET]" \
  -v
```

#### Expected Response (Success):
```json
{
  "success": true,
  "message": "Recurring transactions generated successfully",
  "results": {
    "processed": 0,
    "created": 0,
    "errors": 0
  },
  "timestamp": "2025-11-01T12:00:00.000Z"
}
```

- [ ] HTTP Status: **200 OK**
- [ ] Response includes `"success": true`
- [ ] No 401 Unauthorized error

#### Test Unauthorized Access (Should Fail):
```bash
# Test without Authorization header (should return 401)
curl -X GET https://[PREVIEW_URL]/api/cron/generate-recurring
```

- [ ] HTTP Status: **401 Unauthorized**
- [ ] Response: `{"error": "Unauthorized"}`

### 11. Test Authentication Flow

Create a test account to verify Supabase Auth integration:

1. Navigate to `https://[PREVIEW_URL]/signup`
2. Create account:
   - [ ] Email: `test-deploy@example.com`
   - [ ] Password: `TestPassword123!`
   - [ ] Account created successfully
3. Check email for verification link (if email verification enabled)
4. Sign in:
   - [ ] Navigate to `/signin`
   - [ ] Enter credentials
   - [ ] Redirected to `/dashboard` after successful sign in

### 12. Test Database Connection

Once signed in to dashboard:

- [ ] Dashboard loads without errors
- [ ] Can create a test account (bank account)
- [ ] Can create a test transaction
- [ ] Transaction appears in dashboard
- [ ] Data persists after page refresh

**Verify in Supabase Dashboard:**
- [ ] Go to Supabase Dashboard → Database → Table Editor
- [ ] Select **User** table
- [ ] Verify new user row exists
- [ ] User.currency is "NIS"
- [ ] User.supabaseAuthId matches Supabase Auth user ID

---

## Production Deployment

### 13. Merge to Main Branch (Production Deployment)

If all preview tests pass:

```bash
# Switch to main branch
git checkout main

# Merge deployment-test branch
git merge deployment-test

# Push to GitHub (triggers production deployment)
git push origin main
```

- [ ] Merged to main successfully
- [ ] Pushed to GitHub
- [ ] Vercel production deployment triggered

### 14. Monitor Production Deployment

In Vercel Dashboard → Deployments → **Production**:

- [ ] Build status: **Building...** → **Ready**
- [ ] Production URL assigned (e.g., `https://wealth-username.vercel.app`)
- [ ] Build completes successfully
- [ ] No errors in build logs

### 15. Verify Production Deployment

- [ ] Visit production URL (HTTPS enabled)
- [ ] Homepage loads
- [ ] Sign in page loads
- [ ] Create production test account
- [ ] Dashboard loads successfully

### 16. Verify Cron Job Configuration

In Vercel Dashboard:

- [ ] Go to **Settings → Cron Jobs**
- [ ] Cron job listed:
  - Path: `/api/cron/generate-recurring`
  - Schedule: `0 2 * * *` (Daily at 2 AM UTC)
  - Status: **Active**

**Manual cron test (production):**
```bash
curl -X GET https://[PRODUCTION_URL]/api/cron/generate-recurring \
  -H "Authorization: Bearer [YOUR_CRON_SECRET]"
```

- [ ] Returns 200 OK with success response
- [ ] Logs show successful execution

---

## Security Verification

### 17. Security Checklist

- [ ] `.env.local` and `.env.production` in `.gitignore`
- [ ] No secrets committed to git repository
- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked as sensitive in Vercel
- [ ] `CRON_SECRET` marked as sensitive in Vercel
- [ ] `ENCRYPTION_KEY` marked as sensitive in Vercel
- [ ] Cron endpoint returns 401 without valid `CRON_SECRET`
- [ ] HTTPS enabled on production URL
- [ ] Row Level Security (RLS) enabled on Supabase tables (verify in Supabase Dashboard)

---

## Performance Verification

### 18. Performance Checklist

Using Chrome DevTools (F12 → Performance/Network tabs):

- [ ] First Contentful Paint (FCP): < 2 seconds
- [ ] Time to Interactive (TTI): < 3 seconds
- [ ] JavaScript bundle size: < 200 KB (first load)
- [ ] No render-blocking resources
- [ ] Images optimized (Next.js Image component used)

Using Vercel Analytics (if enabled):

- [ ] Go to Vercel Dashboard → Analytics
- [ ] Monitor Real Experience Score
- [ ] Check for any slow API routes

---

## Monitoring Setup

### 19. Configure Monitoring

#### Vercel Logs
- [ ] Go to Vercel Dashboard → Deployments → [Latest] → **Functions**
- [ ] Verify function logs are accessible
- [ ] Check for any runtime errors

#### Supabase Logs
- [ ] Go to Supabase Dashboard → Database → **Logs**
- [ ] Enable query performance tracking (optional)
- [ ] Review connection pool usage

#### Cron Job Monitoring
- [ ] Set up Vercel email notifications for failed deployments
- [ ] Monitor cron job execution logs daily (first week)
- [ ] Verify cron executes at 2 AM UTC daily

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Build fails with "Missing environment variable DATABASE_URL"
**Symptom:** Vercel build fails during Prisma generation
**Solution:**
- Verify DATABASE_URL is set in Vercel → Settings → Environment Variables
- Ensure it's applied to the correct environment (Production/Preview/Development)
- Check for typos in variable name (case-sensitive!)

#### Issue 2: "Connection pool timeout" errors
**Symptom:** App loads but database queries fail with timeout
**Solution:**
- Verify DATABASE_URL includes `?pgbouncer=true&connection_limit=1`
- Check Supabase connection limit in dashboard (max 60 connections on free tier)
- Use transaction pooler (port 6543), not direct connection (port 5432)

#### Issue 3: Cron endpoint returns 401 Unauthorized
**Symptom:** Manual curl test fails with `{"error": "Unauthorized"}`
**Solution:**
- Verify CRON_SECRET in Vercel matches secret used in curl command
- Check Authorization header format: `Authorization: Bearer [secret]`
- Ensure CRON_SECRET is applied to correct environment

#### Issue 4: Build succeeds but site shows 500 error
**Symptom:** Vercel deployment shows "Ready" but visiting URL shows error page
**Solution:**
- Check Vercel Function Logs (Settings → Functions → Logs)
- Look for missing environment variables or runtime errors
- Verify Supabase credentials are correct
- Test database connection with Prisma Studio locally

#### Issue 5: "Prisma Client not generated" error
**Symptom:** Runtime error about missing Prisma Client
**Solution:**
- Ensure `npx prisma generate` runs during build
- Check `package.json` has `postinstall` script: `"postinstall": "prisma generate"`
- Rebuild deployment in Vercel dashboard

#### Issue 6: CORS errors in browser console
**Symptom:** Browser shows CORS policy errors when calling API
**Solution:**
- Verify NEXT_PUBLIC_SUPABASE_URL matches your Supabase project URL exactly
- Check for trailing slashes in URL (should NOT have trailing slash)
- Ensure API routes are under `/api/` directory

---

## Final Verification Checklist

### Production Ready Checklist

- [ ] All 7 environment variables configured in Vercel
- [ ] Database schema pushed to production Supabase
- [ ] Preview deployment tested successfully
- [ ] Production deployment successful
- [ ] Cron job visible in Vercel dashboard and tested manually
- [ ] Authentication flow works (sign up, sign in, protected routes)
- [ ] Can create accounts, transactions, budgets, goals
- [ ] All pages load without errors
- [ ] Mobile responsive design works
- [ ] HTTPS enabled with valid SSL certificate
- [ ] No secrets exposed in browser DevTools
- [ ] Build logs show no warnings or errors
- [ ] Performance metrics acceptable (< 3s TTI)

---

## Post-Deployment Documentation

### Record Production Details

Document these for future reference:

```
Production URL: ___________________________
Supabase Project ID: ___________________________
Vercel Project ID: ___________________________
Database Host: ___________________________
Deployment Date: ___________________________
```

### Next Steps

After successful deployment:

1. **Set up monitoring alerts:**
   - Vercel deployment notifications
   - Supabase database alerts
   - Uptime monitoring (e.g., UptimeRobot, Pingdom)

2. **Create demo account:**
   - Seed database with sample data
   - Create demo user for showcasing app

3. **Documentation:**
   - Update README.md with production URL
   - Document any custom configuration
   - Create user guide

4. **Backup strategy:**
   - Supabase automatic backups enabled (7 days on free tier)
   - Export critical data weekly (optional)

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Prisma Production Best Practices:** https://www.prisma.io/docs/guides/deployment

---

**Last Updated:** 2025-11-01
**Version:** 1.0.0
**Maintained by:** Builder-1B (Deployment Configuration)
