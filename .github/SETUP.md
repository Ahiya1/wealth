# CI/CD Setup Guide

This document explains how to set up the CI/CD pipeline for automated deployments and database migrations.

## Required GitHub Secrets

To enable the CI/CD pipeline, you need to configure the following secrets in your GitHub repository:

### Go to: Settings → Secrets and variables → Actions → New repository secret

1. **`DATABASE_URL`**
   - Production database connection URL
   - Get from Vercel: `vercel env pull .env.production`
   - Example: `postgresql://postgres.xxx:password@xxx.supabase.com:5432/postgres`

2. **`DIRECT_URL`**
   - Direct database connection URL (same as DATABASE_URL for Supabase)
   - Get from Vercel: `vercel env pull .env.production`

3. **`VERCEL_TOKEN`**
   - Vercel deployment token
   - Generate at: https://vercel.com/account/tokens
   - Name it "GitHub Actions CI/CD"

4. **`VERCEL_ORG_ID`**
   - Your Vercel organization ID
   - Found in `.vercel/project.json` as `"orgId"`
   - Current value: `team_un4MOhA19r8GT12ufq6uhg7X`

5. **`VERCEL_PROJECT_ID`**
   - Your Vercel project ID
   - Found in `.vercel/project.json` as `"projectId"`
   - Current value: `prj_fIbJTjxBvMA6Q5PwppibHUBAf5xE`

## Quick Setup Commands

```bash
# 1. Pull production credentials (already done locally)
vercel env pull .env.production --environment=production

# 2. Get values from .env.production for DATABASE_URL and DIRECT_URL
cat .env.production | grep DATABASE_URL
cat .env.production | grep DIRECT_URL

# 3. Get Vercel IDs
cat .vercel/project.json

# 4. Generate Vercel token
# Visit: https://vercel.com/account/tokens
```

## Workflow Behavior

### On Push to `main` branch:
1. ✅ Runs database migrations (`prisma migrate deploy`)
2. ✅ Builds and deploys to Vercel production
3. ✅ Application updates automatically

### On Pull Requests:
1. ✅ Runs TypeScript type checking
2. ✅ Runs linter
3. ✅ Runs tests
4. ❌ Does NOT deploy or run migrations

## Environment Files

- **`.env.development`** - Local development (committed to git as template)
- **`.env.production`** - Production credentials (NOT committed, pulled from Vercel)

## Local Development

```bash
# Use local Supabase
cp .env.development .env.local

# Start local Supabase
npx supabase start

# Run migrations locally
npx prisma migrate dev

# Start development server
npm run dev
```

## Production Deployment

```bash
# Option 1: Automatic (recommended)
git push origin main
# → Triggers GitHub Actions → Runs migrations → Deploys to Vercel

# Option 2: Manual via Vercel CLI
vercel --prod
```

## Troubleshooting

### Migration fails in CI/CD
- Check that `DATABASE_URL` and `DIRECT_URL` secrets are set correctly
- Verify secrets don't have trailing newlines or extra quotes
- Check Supabase database is accessible from GitHub Actions IP

### Vercel deployment fails
- Verify `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set
- Check token has deployment permissions
- Ensure token hasn't expired

## Security Notes

- Never commit `.env.production` to git (protected by `.gitignore`)
- Rotate tokens if exposed
- Use Vercel environment variables for production secrets
- Keep GitHub secrets up to date when credentials rotate
