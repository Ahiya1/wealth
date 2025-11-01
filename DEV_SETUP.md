# Development Environment Setup

Quick guide to get Wealth running locally with custom ports to avoid conflicts.

## Architecture Overview

**Wealth is a Next.js monolith with:**
- ✅ **No separate backend server** - all API logic in Next.js API routes
- ✅ **tRPC** - type-safe API endpoints at `src/app/api/trpc/[trpc]/route.ts`
- ✅ **Serverless functions** - API routes are serverless Next.js functions
- ✅ **Supabase** - PostgreSQL database + Auth services only

## Port Configuration

To avoid conflicts with other projects, Wealth uses custom ports:

| Service | Port | URL |
|---------|------|-----|
| Next.js Dev Server | 3000 | http://localhost:3000 |
| Supabase API | 54421 | http://localhost:54421 |
| Supabase Studio | 54423 | http://localhost:54423 |
| Supabase Inbucket (Email) | 54424 | http://localhost:54424 |
| PostgreSQL | 54432 | postgresql://postgres:postgres@localhost:54432/postgres |
| PostgreSQL Pooler | 54422 | postgresql://postgres:postgres@localhost:54422/postgres |

## Prerequisites

- **Node.js** 18.x or 20.x
- **npm** 9.x or 10.x
- **Docker Desktop** (must be running)

## First-Time Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Start Supabase to generate keys
npm run db:local

# Get credentials
npx supabase status
```

Copy the following from `npx supabase status` to `.env.local`:
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

Your `.env.local` should look like:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54432/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54432/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54421"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<from supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<from supabase status>"
```

### 3. Push Database Schema

```bash
npm run db:push
```

### 4. Seed Database (Optional)

```bash
npm run db:seed
```

## Running the Development Environment

### Option 1: Single Command (Recommended)

```bash
npm run dev:all
```

This starts both Supabase and Next.js in a single terminal with proper cleanup on exit.

### Option 2: Separate Terminals

**Terminal 1 - Start Supabase:**
```bash
npm run db:local
```

**Terminal 2 - Start Next.js:**
```bash
npm run dev
```

## Accessing Services

- **Application:** http://localhost:3000
- **Supabase Studio:** http://localhost:54423 (database management)
- **Email Testing:** http://localhost:54424 (catch all auth emails)
- **Prisma Studio:** `npm run db:studio` (alternative DB viewer)

## Stopping Services

If using `npm run dev:all`, just press `Ctrl+C`.

If running separately:
```bash
npm run db:stop  # Stop Supabase
```

## Common Commands

```bash
# Development
npm run dev              # Start Next.js only
npm run dev:all          # Start Supabase + Next.js
npm run db:local         # Start Supabase only
npm run db:stop          # Stop Supabase

# Database
npm run db:push          # Push schema changes
npm run db:reset         # Reset database (wipes data)
npm run db:studio        # Open Prisma Studio
npm run db:studio:supabase # Open Supabase Studio

# Testing
npm test                 # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage

# Build
npm run build            # Production build
npm run start            # Run production build
```

## Troubleshooting

### Port Conflicts

If you still get port conflicts, check what's using the port:

```bash
# Check specific port
lsof -i :54421

# Kill process on port
kill -9 <PID>
```

### Docker Not Running

```bash
# Check Docker status
docker ps

# If not running, start Docker Desktop
```

### Database Connection Issues

```bash
# Restart Supabase
npm run db:stop
npm run db:local

# Verify it's running
npx supabase status
```

### Environment Variable Issues

```bash
# Regenerate Prisma client
npm run db:generate

# Restart dev server after changing .env.local
```

## Project Structure

```
wealth/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/trpc/          # tRPC API endpoints (serverless)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   └── (auth)/            # Auth pages (signin/signup)
│   ├── server/                # Backend logic (runs in Next.js)
│   │   ├── api/routers/       # tRPC routers
│   │   └── services/          # Business logic services
│   ├── components/            # React components
│   └── lib/                   # Utilities, Prisma, Supabase clients
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── supabase/
│   └── config.toml            # Supabase local config (custom ports)
├── dev.sh                     # Dev environment startup script
└── .env.local                 # Local environment variables (not in git)
```

## Next Steps

1. Visit http://localhost:3000
2. Create an account at `/signup`
3. Check email at http://localhost:54424 for verification
4. Start building!
