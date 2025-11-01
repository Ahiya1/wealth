# Vercel Deployment Guide - Wealth App

## Prerequisites

1. Vercel account (free tier works)
2. GitHub repository connected to Vercel
3. Supabase project (or deploy Supabase locally)

## Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
DIRECT_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"

# Cron Secret (CRITICAL for security)
CRON_SECRET="[generate-with-openssl-rand-hex-32]"
```

### Optional Variables

```bash
# Plaid (for bank connections)
PLAID_CLIENT_ID="[plaid-client-id]"
PLAID_SECRET="[plaid-secret]"
PLAID_ENV="sandbox" # or "development", "production"
ENCRYPTION_KEY="[64-char-hex-key]"

# Anthropic (for AI categorization)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Resend (for emails)
RESEND_API_KEY="re_..."

# Google OAuth (optional)
GOOGLE_CLIENT_ID="[google-client-id]"
GOOGLE_CLIENT_SECRET="[google-client-secret]"
```

## Deployment Steps

### 1. Connect Repository to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Login
vercel login

# Link project
vercel link
```

### 2. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables (see above)
3. Set scope to "Production", "Preview", and "Development" as needed

**IMPORTANT:** Generate a secure `CRON_SECRET`:
```bash
openssl rand -hex 32
```
Add this to Vercel environment variables.

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploys if GitHub integration enabled)
git push origin main
```

### 4. Verify Cron Job

After deployment:

1. Check Vercel dashboard → Deployments → [Latest] → Cron Jobs
2. You should see:
   - Path: `/api/cron/generate-recurring`
   - Schedule: `0 2 * * *` (Daily at 2 AM UTC)

3. Test manually:
```bash
curl -X GET https://[your-domain].vercel.app/api/cron/generate-recurring \
  -H "Authorization: Bearer [your-CRON_SECRET]"
```

Expected response:
```json
{
  "success": true,
  "message": "Recurring transactions generated successfully",
  "results": {
    "processed": 5,
    "created": 5,
    "errors": 0
  },
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

### 5. Database Migrations

Run Prisma migrations on production:

```bash
# From local machine with production DATABASE_URL
npx prisma db push

# Or use Vercel CLI
vercel env pull .env.production
npx prisma db push
```

## Cron Job Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Format:** Standard cron syntax
- `0 2 * * *` = Every day at 2:00 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Every Sunday at midnight

### How It Works

1. Vercel automatically calls `/api/cron/generate-recurring` at scheduled time
2. Request includes `Authorization: Bearer [CRON_SECRET]` header
3. Endpoint verifies the secret matches `CRON_SECRET` env var
4. Generates all pending recurring transactions
5. Returns success/error status

### Security

- ✅ Protected by `CRON_SECRET` - only Vercel can call the endpoint
- ✅ No public access - returns 401 Unauthorized without valid secret
- ✅ Logs execution results for monitoring

## Monitoring

### Check Cron Execution Logs

1. Vercel Dashboard → Project → Deployments → [Latest]
2. Go to "Functions" tab
3. Find `/api/cron/generate-recurring`
4. View logs and execution history

### Manual Trigger (for testing)

```bash
# Test in development
curl -X GET http://localhost:3002/api/cron/generate-recurring \
  -H "Authorization: Bearer d57918b991ad6dd6a58cafcb82a7dae339ec7851eed27b9ce41936d1e8d08603"

# Test in production
curl -X GET https://wealth.vercel.app/api/cron/generate-recurring \
  -H "Authorization: Bearer [your-production-CRON_SECRET]"
```

## Troubleshooting

### Cron not running

1. **Check vercel.json is in root directory**
2. **Verify CRON_SECRET is set** in Vercel environment variables
3. **Check Vercel logs** for errors
4. **Ensure function doesn't timeout** (10s limit on free tier, 60s on Pro)

### Unauthorized errors

- Verify `CRON_SECRET` in Vercel matches the one in code
- Check the Authorization header format: `Bearer [secret]`

### Database connection issues

- Use connection pooling for serverless: `?pgbouncer=true&connection_limit=1`
- Set `DIRECT_URL` for migrations
- Check Supabase connection limits

## Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] `CRON_SECRET` generated and added (use `openssl rand -hex 32`)
- [ ] Database migrations run (`npx prisma db push`)
- [ ] vercel.json committed to repository
- [ ] First deployment successful
- [ ] Cron job visible in Vercel dashboard
- [ ] Manual cron test successful
- [ ] Logs showing successful execution
- [ ] Demo user can create/view recurring transactions
- [ ] Upcoming Bills widget shows data

## Alternative Approaches

If Vercel Cron doesn't meet your needs:

1. **External Cron Service**
   - cron-job.org (free)
   - EasyCron
   - Calls your API endpoint with the secret

2. **GitHub Actions**
   ```yaml
   - cron: '0 2 * * *'
   ```
   Triggers workflow that calls your API

3. **Upstash QStash**
   - Serverless job scheduling
   - Better for complex schedules
   - Retry logic built-in

## Cost Considerations

**Vercel Free Tier:**
- ✅ Cron jobs included
- ✅ Unlimited executions
- ⚠️ 10s function timeout (usually enough)

**Vercel Pro ($20/month):**
- ✅ 60s function timeout
- ✅ Priority support
- ✅ More concurrent executions

For most users, the **free tier is sufficient** for daily recurring transaction generation.
