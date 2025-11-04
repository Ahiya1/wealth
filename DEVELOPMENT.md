# Wealth Development Guide

Complete guide for setting up and running Wealth in development mode.

## Quick Start

```bash
# 1. Copy environment template
cp .env.development.local .env.local

# 2. Start development environment (Supabase + Next.js)
./dev.sh

# OR run services separately:
npm run db:local    # Start local Supabase
npm run dev         # Start Next.js dev server
```

## Environment Setup

### Development vs Production

Wealth supports multiple environments:

- **Development** (`NODE_ENV=development`)
  - Local Supabase via Docker
  - Hot reload with Next.js dev server
  - Verbose logging and debug mode
  - Mock data support

- **Production** (`NODE_ENV=production`)
  - Cloud Supabase on Vercel
  - Optimized builds
  - Analytics and cron jobs
  - Production-grade security

Current environment is tracked in `.2L/config.yaml`:

```yaml
current_environment: "development"  # or "production"
```

### Environment Files

- `.env.development.local` → Copy to `.env.local` for local dev
- `.env.production.local.example` → Template for production secrets
- `.env.example` → General reference

**Important:** Never commit `.env.local` or `.env.production.local` to git.

## Local Development

### Prerequisites

1. **Docker Desktop** - Required for local Supabase
2. **Node.js 20+** - JavaScript runtime
3. **npm** - Package manager

### Starting Development Environment

The easiest way to start:

```bash
./dev.sh
```

This script:
1. Checks Docker is running
2. Starts local Supabase (PostgreSQL + Auth + Storage)
3. Waits for services to be ready
4. Starts Next.js dev server on http://localhost:3000

### Local Services

When running locally, you'll have access to:

| Service | URL | Description |
|---------|-----|-------------|
| App | http://localhost:3000 | Main application |
| Supabase API | http://localhost:54421 | Database API |
| Supabase Studio | http://localhost:54423 | Database admin UI |
| Inbucket | http://localhost:54424 | Email testing |
| Database | postgresql://postgres:postgres@localhost:54432/postgres | Direct DB access |

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database (warning: deletes all data!)
npm run db:reset
```

### Demo Data

Create test users and demo data:

```bash
# Create a test user
npm run create:test-user

# Seed demo transactions and accounts
npm run seed:demo

# Clean up test data
npm run cleanup:user
```

## Mobile Development

Wealth is fully mobile-responsive:

### Mobile Features

✅ **Responsive Sidebar**
- Hamburger menu on mobile (< 1024px)
- Slide-in navigation with overlay
- Touch-friendly tap targets

✅ **Responsive Grids**
- Stats: 1 column (mobile) → 2 (tablet) → 4 (desktop)
- Forms: Stack on mobile, side-by-side on desktop

✅ **Mobile-Optimized Dialogs**
- Full-width on mobile with proper padding
- Max height with scroll
- Touch-friendly close buttons

✅ **Responsive Cards & Lists**
- Transaction cards stack information on mobile
- Tables scroll horizontally when needed
- Charts adapt to screen size

### Testing Mobile Locally

```bash
# Start dev server
npm run dev

# Access from mobile device on same network:
# http://[your-local-ip]:3000

# Or use Chrome DevTools:
# F12 → Device Toolbar (Ctrl+Shift+M)
```

## Production Deployment

### Vercel Setup

1. **Connect Repository**
   - Link GitHub repo to Vercel
   - Auto-deploys on push to `main`

2. **Environment Variables**

   Add these in Vercel Dashboard → Settings → Environment Variables:

   ```bash
   # Database (from Supabase Cloud)
   DATABASE_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres"

   # Supabase (from Supabase Cloud Dashboard → API)
   NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." # Public key
   SUPABASE_SERVICE_ROLE_KEY="eyJ..." # SECRET - mark as server-only!

   # Security
   ENCRYPTION_KEY="[64-char-hex]" # Generate: openssl rand -hex 32
   CRON_SECRET="[64-char-hex]" # Generate: openssl rand -hex 32

   # Environment
   NODE_ENV="production"
   NEXT_PUBLIC_APP_ENV="production"
   ```

3. **Deploy**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

### Supabase Cloud Setup

1. Create project at https://supabase.com
2. Run migrations: `npx supabase db push`
3. Copy connection strings and API keys to Vercel
4. Enable RLS policies in Supabase Dashboard

## Project Structure

```
wealth/
├── .2L/                          # 2L framework (planning & iterations)
│   ├── config.yaml              # Environment config, plans, iterations
│   ├── plan-*/                  # Development plans
│   └── iteration-*/             # Completed iterations
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Seed data script
│   └── migrations/              # Database migrations
├── src/
│   ├── app/                     # Next.js 14 App Router
│   │   ├── (auth)/             # Auth pages (signin, signup)
│   │   ├── (dashboard)/        # Main app pages
│   │   └── api/                # API routes + tRPC
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components
│   │   ├── dashboard/          # Dashboard-specific
│   │   ├── transactions/       # Transaction components
│   │   └── ...                 # Feature-specific folders
│   ├── lib/                    # Utilities and configs
│   │   ├── trpc/               # tRPC setup
│   │   ├── supabase/           # Supabase client
│   │   └── utils.ts            # Helper functions
│   └── server/                 # Server-side code
│       └── routers/            # tRPC routers
├── .env.development.local      # Local dev environment
├── .env.production.local       # Production secrets (not in git)
├── dev.sh                      # Development startup script
└── package.json                # Dependencies and scripts
```

## 2L Framework Integration

Wealth is built using the 2L (Keen) framework for rapid development.

### Key Files

- `.2L/config.yaml` - Project configuration
- `.2L/events.jsonl` - Development event log
- `.2L/plan-*/` - Feature plans and iterations

### Updating Environment in 2L

Edit `.2L/config.yaml`:

```yaml
current_environment: "development"  # or "production"

environments:
  development:
    url: "http://localhost:3000"
    database: "local-supabase"
    features:
      - verbose_logging
      - mock_data
      - debug_mode

  production:
    url: "https://wealth-ta2f.vercel.app"
    database: "supabase-cloud"
    features:
      - analytics
      - cron_jobs
      - email_notifications
```

## Troubleshooting

### Docker not running

```
❌ Docker is not running
```

**Solution:** Start Docker Desktop and try again.

### Port conflicts

```
Error: Port 54432 already in use
```

**Solution:**
```bash
# Stop Supabase
npm run db:stop

# Or kill the process using the port
lsof -ti:54432 | xargs kill -9
```

### Database schema mismatch

```
Error: Schema out of sync
```

**Solution:**
```bash
# Reset database and re-seed
npm run db:reset
```

### Module not found

```
Error: Cannot find module '@prisma/client'
```

**Solution:**
```bash
# Regenerate Prisma client
npm run db:generate
```

## Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test locally: `./dev.sh`
4. Commit: `git commit -am "Add feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

## Support

- Issues: https://github.com/[your-repo]/wealth/issues
- Documentation: This file and `.env.example`
- 2L Framework: `.2L/` folder

---

**Happy coding! 🚀**
