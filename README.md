# Wealth - Personal Finance Dashboard

A comprehensive personal finance management application built with Next.js 14, Prisma, tRPC, and Supabase.

## Features

- User authentication with Supabase Auth (email/password, magic link, and OAuth)
- Financial account management
- Transaction tracking and categorization
- Budget management with alerts
- Financial goals tracking
- Analytics and insights
- Plaid integration for automatic bank synchronization
- AI-powered transaction categorization with Anthropic Claude

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL via Supabase (local development)
- **ORM:** Prisma 5.22.0
- **API:** tRPC 11.6.0
- **Authentication:** Supabase Auth
- **UI:** Tailwind CSS + shadcn/ui + Radix UI
- **State Management:** React Query (TanStack Query)
- **Testing:** Vitest

## Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or 10.x
- Docker Desktop (for Supabase local development)

## Local Development Setup

### First-Time Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd wealth
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your values:

   **Required variables:**
   - `DATABASE_URL` - Already configured for Supabase local
   - `DIRECT_URL` - Already configured for Supabase local
   - `NEXT_PUBLIC_SUPABASE_URL` - Get from: `npx supabase status`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Get from: `npx supabase status`
   - `SUPABASE_SERVICE_ROLE_KEY` - Get from: `npx supabase status`

   **Optional variables:**
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Google OAuth
   - `PLAID_CLIENT_ID`, `PLAID_SECRET`, `ENCRYPTION_KEY` - For Plaid integration
   - `ANTHROPIC_API_KEY` - For AI transaction categorization
   - `RESEND_API_KEY` - For email sending

4. **Get Supabase credentials:**
   ```bash
   # Start Supabase to generate keys
   npm run db:local

   # Get credentials
   npx supabase status
   # Copy anon key and service_role key to .env.local

   # Generate ENCRYPTION_KEY (for Plaid - optional)
   openssl rand -hex 32
   ```

5. **Start everything with one command:**
   ```bash
   npm run dev:setup
   ```
   This will:
   - Start Supabase (downloads Docker images on first run ~2GB, takes 30-90 seconds)
   - Push database schema
   - Start Next.js dev server

6. **Open the application:**
   - Application: http://localhost:3000
   - Supabase Studio: http://localhost:54323

### Daily Development

```bash
# Start Supabase
npm run db:local

# Start Next.js dev server
npm run dev

# Open application
open http://localhost:3000
```

## Authentication

Wealth uses **Supabase Auth** for authentication (migrated from NextAuth).

### Local Setup

**1. Start Supabase:**
```bash
npm run db:local
```

**2. Configure environment variables:**
```bash
# Get Supabase credentials
npx supabase status

# Add to .env.local:
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key from status>"
SUPABASE_SERVICE_ROLE_KEY="<service_role key from status>"
```

**3. Test email flows:**
- Inbucket email testing: http://localhost:54324
- All verification emails appear here during local development

### Auth Features

- Email/password authentication with verification
- Magic link (passwordless) authentication
- OAuth providers (Google, GitHub)
- Password reset flow
- Protected routes via middleware

### Testing Authentication

**Email Testing (Local Development):**
- All auth emails sent to Inbucket: http://localhost:54324
- No real emails sent during local development
- Test signup: Use any email like `test@example.com`
- Check Inbucket for verification/magic link emails

**Auth Flows:**
1. **Sign up:** Navigate to `/signup`, create account, check Inbucket for verification email
2. **Sign in:** Navigate to `/signin`, enter credentials
3. **Magic link:** Enter email at `/signin`, check Inbucket for magic link
4. **OAuth:** Click "Continue with Google" (requires Google OAuth setup)
5. **Password reset:** Click "Forgot password", check Inbucket for reset link

## Database Setup

### Local Development

Wealth uses Supabase for local PostgreSQL database.

**Start Supabase:**
```bash
npm run db:local
```

**Connection:** Direct connection on port 5432 (not pooler)

**Environment Variables:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Why Direct Connection?**
- Eliminates pgBouncer pooler complexity
- All Prisma operations work reliably
- Connection pooling not needed for single developer
- Production can use pooler via DIRECT_URL if needed

### Available Scripts

```bash
# Supabase lifecycle
npm run db:local           # Start Supabase local services
npm run db:stop            # Stop Supabase (preserves data)
npm run db:reset           # Reset database (wipes all data, reapplies schema)
npm run db:studio:supabase # Open Supabase Studio

# Prisma operations
npm run db:generate        # Generate Prisma Client
npm run db:push            # Push schema changes to database
npm run db:migrate         # Create and apply migrations
npm run db:studio          # Open Prisma Studio
npm run db:seed            # Seed database with default data

# Combined setup
npm run dev:setup          # Start Supabase + migrate + seed + dev server
```

### Database Management Tools

**Supabase Studio** (Primary Tool)
- Access: http://localhost:54323 (after `npm run db:local`)
- Features: Visual schema editor, SQL query editor, table data browser, performance insights

**Prisma Studio** (Secondary Tool)
- Access: `npm run db:studio` (opens http://localhost:5555)
- Features: Simple table data browser, CRUD operations, relationship navigation

## Troubleshooting

### Docker Not Running

**macOS/Windows:** Open Docker Desktop app
**Linux:** `sudo systemctl start docker`

Verify Docker is running:
```bash
docker ps
```

### Port Conflicts (5432 already in use)

If you have PostgreSQL running locally:

**macOS:**
```bash
brew services stop postgresql@15
```

**Linux:**
```bash
sudo systemctl stop postgresql
```

**Alternative:** Customize Supabase port in `supabase/config.toml`

### Supabase Won't Start

```bash
# Clean up and try again
npx supabase stop --no-backup
docker compose down
npm run db:local
```

### Database Connection Error

**Error: "Tenant or user not found"**

This error typically occurs when using the pooled connection (port 54322) instead of direct connection.

**Solution:**
```bash
# 1. Verify .env.local uses direct connection (port 5432)
cat .env.local | grep DATABASE_URL
# Should output: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# 2. Restart dev server after changing .env.local
# Press Ctrl+C to stop, then:
npm run dev

# 3. Test database connection
npm run db:push
# Should output: "✓ Database synced in [X]ms"
```

**Verify Supabase is running:**
```bash
npx supabase status
# Should show "Status: RUNNING"
```

**If port 5432 not accessible:**
```bash
# Restart Supabase
npx supabase stop
npx supabase start

# Check Supabase status
npx supabase status
```

### Missing Environment Variables

**Error:** "DATABASE_URL not set" or "NEXTAUTH_SECRET is required"

**Solution:**
1. Ensure `.env.local` exists
2. Check all required variables are set
3. Restart dev server after changes

## Project Structure

```
wealth/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and configurations
│   └── server/          # tRPC server and API
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seed script
├── supabase/
│   └── config.toml      # Supabase configuration
└── public/              # Static assets
```

## Environment Variables Reference

See `.env.example` for a complete list of all environment variables with descriptions.

**Critical Variables:**
- `DATABASE_URL` - Direct connection on port 5432 (local development)
- `DIRECT_URL` - Direct connection on port 5432 (same as DATABASE_URL for local)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase API URL (http://localhost:54321)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, safe for browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-only, never expose)

**Optional Integrations:**
- Google OAuth - Requires client ID and secret
- Plaid - Requires client ID, secret, and encryption key
- Anthropic - Requires API key for AI categorization
- Resend - Requires API key for email sending

## Development Workflow

1. **Make schema changes:** Edit `prisma/schema.prisma`
2. **Apply changes:** `npm run db:push`
3. **Test changes:** `npm run dev`

## Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Build

```bash
# Production build
npm run build

# Run production build
npm run start
```

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]
