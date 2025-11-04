# DevOps & Deployment Workflow

**Wealth Tracker** - Production deployment and CI/CD conventions

---

## Git Workflow

### Branch Strategy

```
main (production)
  └── Protected branch
  └── Auto-deploys to Vercel on push
  └── Requires passing tests (future)
```

**Single-branch strategy:**
- We work directly on `main` for rapid iteration
- Commits trigger automatic deployment to production
- Use atomic commits with clear messages

### When to Deploy to Production

✅ **SAFE TO DEPLOY:**
- Security fixes
- Bug fixes
- Mobile responsiveness improvements
- Documentation updates
- Performance optimizations
- New features that are **fully tested locally**

⚠️ **TEST FIRST:**
- Database schema changes (run migrations in prod DB)
- Environment variable changes (update Vercel first)
- Breaking API changes (ensure backwards compatibility)
- Authentication changes (test thoroughly)

🚨 **NEVER DEPLOY:**
- Work-in-progress features
- Failing builds
- Untested code
- Code with TODO comments for critical paths

---

## Deployment Pipeline

### Automatic Deployment (Vercel)

```mermaid
git push origin main
    ↓
Vercel detects push
    ↓
npm install
    ↓
prisma generate
    ↓
next build
    ↓
Deploy to production
    ↓
https://wealth-ta2f.vercel.app
```

### Pre-Deployment Checklist

Before pushing to `main`:

- [ ] Build passes locally: `npm run build`
- [ ] Tests pass (when implemented): `npm test`
- [ ] No console errors in development
- [ ] Mobile responsive (test in Chrome DevTools)
- [ ] Environment variables documented
- [ ] Database migrations planned (if schema changed)

---

## Environment Management

### Development Environment

**URL:** http://localhost:3000
**Database:** Local Supabase (Docker)
**Features:** Verbose logging, mock data, debug mode

```bash
# Start development
./dev.sh

# Or manually
npm run db:local  # Start Supabase
npm run dev       # Start Next.js
```

### Production Environment

**URL:** https://wealth-ta2f.vercel.app
**Database:** Supabase Cloud
**Features:** Analytics, cron jobs, email notifications

**Deployment:** Automatic on push to `main`

---

## Configuration Files

### `.2L/config.yaml`

Tracks current environment and project state:

```yaml
current_environment: "development"  # or "production"

environments:
  development:
    url: "http://localhost:3000"
    database: "local-supabase"

  production:
    url: "https://wealth-ta2f.vercel.app"
    database: "supabase-cloud"
```

**When to update:**
- Switching between dev and prod work
- Adding new environment features
- Documenting deployment changes

### Environment Variables

Development: `.env.local` (gitignored)
Production: Vercel Dashboard → Environment Variables

**Critical production secrets:**
- `SUPABASE_SERVICE_ROLE_KEY` - **Server-only**
- `ENCRYPTION_KEY` - **Server-only**
- `CRON_SECRET` - **Server-only**

---

## Database Migrations

### Development

```bash
# Make schema changes in prisma/schema.prisma
npm run db:push      # Push to local DB
npm run db:generate  # Regenerate Prisma client
npm test             # Verify changes work
```

### Production

```bash
# After schema changes are committed to main:

# 1. Create migration file
npx prisma migrate dev --name descriptive_name

# 2. Commit migration
git add prisma/migrations/
git commit -m "Add migration: descriptive_name"

# 3. Push to trigger deployment
git push origin main

# 4. Vercel automatically runs:
#    - prisma generate (in postinstall)
#    - prisma migrate deploy (manual, if needed)
```

**⚠️ Breaking migrations:**
- For schema changes that break existing code:
  1. Add new fields (nullable)
  2. Deploy code that supports both old and new
  3. Migrate data
  4. Remove old fields in next release

---

## Admin User Management

### Creating Admin Users

**Production:**

```bash
# 1. Ensure user exists in Supabase Auth
#    (Sign up via app or create in Supabase Dashboard)

# 2. Load production environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# 3. Run admin creation script
npx tsx scripts/create-admin-prod.ts

# 4. Verify in app
#    Login → Visit /admin → Should see admin panel
```

**What the script does:**
1. Fetches user from Supabase Auth
2. Upserts to Prisma with `role: 'ADMIN'`
3. Sets `onboardingCompletedAt` to skip onboarding
4. Reports user ID and status

---

## Monitoring & Debugging

### Production Logs

**Vercel Dashboard:**
- Deployments → Select deployment → View logs
- Real-time logs during deployment
- Runtime logs for errors

**Key endpoints to monitor:**
- `/api/trpc/*` - tRPC API calls
- `/api/cron/generate-recurring` - Recurring transactions cron
- `/auth/callback` - Supabase auth callback

### Common Issues

**Build fails:**
```bash
# Locally test production build
npm run build

# Check Vercel logs for specific error
# Often: Missing env vars, TypeScript errors
```

**Database connection fails:**
```
# Verify environment variables in Vercel:
DATABASE_URL        - Port 6543 (pooler)
DIRECT_URL          - Port 5432 (direct)

# Test connection with Prisma Studio:
npx prisma studio
```

**User can't access admin:**
```bash
# Check user role in database
npx prisma studio
# → Users table → Find user → Check role field

# Or re-run admin script
npx tsx scripts/create-admin-prod.ts
```

---

## Cron Jobs

### Recurring Transactions

**Schedule:** Daily at 2:00 AM UTC

**Configuration:** `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/generate-recurring",
    "schedule": "0 2 * * *"
  }]
}
```

**Security:**
- Endpoint protected by `CRON_SECRET` bearer token
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`

**Monitoring:**
- Check Vercel → Cron Jobs → View runs
- Logs show: transactions processed, created, errors

---

## Security Best Practices

### Before Every Deployment

- [ ] No secrets in code (use environment variables)
- [ ] API routes use `protectedProcedure` or `adminProcedure`
- [ ] User ownership validated on data access
- [ ] Input validation with Zod schemas
- [ ] SQL injection safe (Prisma ORM)

### Production Secrets

**Generate secure secrets:**
```bash
# Encryption key
openssl rand -hex 32

# Cron secret
openssl rand -hex 32
```

**Vercel environment variable settings:**
- Mark as "Server-only": `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`
- Set environment: "Production"
- Redeploy after adding variables

---

## Rollback Strategy

### Quick Rollback

If production breaks:

1. **Vercel Dashboard:**
   - Deployments → Find last working deployment
   - Click "⋯" → "Redeploy"

2. **Git revert:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Database rollback** (if needed):
   - Restore from Supabase backup
   - Supabase → Database → Backups → Restore

---

## Release Checklist

### Pre-Release

- [ ] All features tested locally
- [ ] Mobile responsiveness verified
- [ ] Build passes: `npm run build`
- [ ] Security audit reviewed
- [ ] Database migrations planned
- [ ] Environment variables updated (if needed)

### During Release

- [ ] Push to main: `git push origin main`
- [ ] Watch Vercel deployment logs
- [ ] Verify build completes successfully

### Post-Release

- [ ] Test critical paths in production
- [ ] Verify admin access works
- [ ] Check Vercel logs for errors
- [ ] Test mobile on real device
- [ ] Monitor for first 24 hours

---

## CI/CD Future Improvements

### Planned Enhancements

1. **Automated Testing**
   - Unit tests: `npm test` (Vitest)
   - E2E tests: Playwright
   - Block merges if tests fail

2. **Staging Environment**
   - Preview deployments for testing
   - Separate Supabase project
   - Test migrations before prod

3. **Database Migration Automation**
   - Auto-run `prisma migrate deploy` on Vercel
   - Verify migrations in staging first

4. **Monitoring**
   - Sentry for error tracking
   - Uptime monitoring
   - Performance metrics

---

## Developer Onboarding

### For New Developers

1. **Clone repository**
   ```bash
   git clone [repo-url]
   cd wealth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.development.local .env.local
   # Edit .env.local with your settings
   ```

4. **Start development**
   ```bash
   ./dev.sh
   ```

5. **Read documentation**
   - `README.md` - Project overview
   - `DEVELOPMENT.md` - Development guide
   - `SECURITY_AUDIT.md` - Security practices
   - `DEVOPS.md` (this file) - Deployment workflow

---

## Summary

### Deployment Flow

```
Local development
    ↓ (test locally)
Commit to main
    ↓ (git push)
Vercel auto-deploy
    ↓ (monitor logs)
Production live
    ↓ (verify works)
Monitor for 24h
```

### Key Principles

1. **Test locally first** - `npm run build` must pass
2. **Atomic commits** - One feature/fix per commit
3. **Monitor after deploy** - Check Vercel logs
4. **Rollback ready** - Know how to revert quickly
5. **Document changes** - Update relevant .md files

---

**Questions?** See `DEVELOPMENT.md` or `SECURITY_AUDIT.md`

**Happy deploying! 🚀**
