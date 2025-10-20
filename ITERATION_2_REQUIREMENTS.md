# Wealth - Iteration 2: Supabase Integration & Runtime Error Fixes

## Iteration Overview

**Goal:** Integrate Supabase for local development and fix all runtime errors discovered in the browser.

**Estimated Time:** 1-2 hours

---

## Objectives

### 1. Supabase Local Development Integration

**Current State:**
- App uses direct PostgreSQL connection via Prisma
- DATABASE_URL points to local PostgreSQL
- No Supabase integration

**Target State:**
- Integrate Supabase local development setup
- Use `supabase start` for local database
- Configure Prisma to work with Supabase
- Maintain all existing functionality
- Keep option for both Supabase and direct PostgreSQL

**Requirements:**

1. **Supabase CLI Setup**
   - Add Supabase CLI to dev dependencies or document installation
   - Initialize Supabase project (`supabase init`)
   - Configure local Supabase instance

2. **Database Migration**
   - Migrate existing Prisma schema to Supabase
   - Use `supabase db push` or Prisma migrations
   - Ensure all 10 models are properly migrated
   - Maintain indexes and relationships

3. **Environment Configuration**
   - Update `.env.example` with Supabase variables
   - Add `SUPABASE_URL` (local: http://localhost:54321)
   - Add `SUPABASE_ANON_KEY`
   - Add `SUPABASE_SERVICE_ROLE_KEY`
   - Keep existing DATABASE_URL for Prisma compatibility
   - Update DATABASE_URL to point to Supabase local pooler

4. **Prisma Configuration**
   - Update `prisma/schema.prisma` if needed
   - Configure connection pooling for Supabase
   - Test all Prisma operations work with Supabase

5. **Development Workflow**
   - Add npm script: `npm run db:local` → `supabase start`
   - Add npm script: `npm run db:stop` → `supabase stop`
   - Add npm script: `npm run db:reset` → `supabase db reset`
   - Update README with Supabase local dev instructions

6. **Verification**
   - All existing tRPC endpoints work
   - Authentication works
   - Data persistence works
   - Migrations can be applied
   - Seed script works

---

### 2. Runtime Error Investigation & Fixes

**Current State:**
- Application builds successfully (0 TypeScript errors)
- Runtime errors exist when opening the application in browser
- Errors not yet identified

**Target State:**
- Zero runtime errors in browser console
- All pages load without errors
- All features functional in browser
- Clean console logs (no errors or warnings)

**Process:**

1. **Error Discovery**
   - Use Chrome DevTools MCP to inspect browser console
   - Navigate to all major pages:
     - Landing page (/)
     - Sign in/Sign up pages
     - Dashboard (/dashboard)
     - Accounts page
     - Transactions page
     - Budgets page
     - Analytics page
     - Goals page
   - Document all errors found

2. **Error Categorization**
   - Critical errors (blocks functionality)
   - High priority (major features broken)
   - Medium priority (minor issues)
   - Low priority (warnings, polish)

3. **Error Fixes**
   - Fix critical and high priority errors
   - Address medium priority if time permits
   - Document low priority for future iteration

4. **Common Error Types to Look For**
   - Database connection errors (likely due to missing .env.local)
   - NextAuth configuration issues
   - tRPC client/server hydration issues
   - Missing environment variables
   - React hydration mismatches
   - API endpoint errors
   - Plaid initialization errors (expected without real credentials)

5. **Verification**
   - All pages load successfully
   - No critical errors in console
   - Authentication flow works (mock if needed)
   - Database operations work
   - Forms submit without errors

---

## Success Criteria

### Supabase Integration (5 criteria)
- [ ] 1. Supabase local instance starts successfully
- [ ] 2. Database schema migrated to Supabase
- [ ] 3. All Prisma operations work with Supabase
- [ ] 4. Seed script populates Supabase database
- [ ] 5. Documentation updated with Supabase setup instructions

### Runtime Errors (5 criteria)
- [ ] 6. Zero critical runtime errors in browser console
- [ ] 7. All pages accessible without errors
- [ ] 8. Authentication flow functional (or gracefully handles missing credentials)
- [ ] 9. Database operations work end-to-end
- [ ] 10. All tRPC endpoints respond correctly

---

## Technical Approach

### Supabase Setup Pattern

```bash
# Install Supabase CLI (if not installed)
npm install supabase --save-dev

# Initialize Supabase
npx supabase init

# Start local Supabase
npx supabase start

# Link schema
npx supabase db push --db-url $DATABASE_URL

# Get connection string
npx supabase status
```

### Prisma with Supabase

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")          // Supabase pooler URL
  directUrl = env("DIRECT_URL")            // Supabase direct URL
}
```

### Environment Variables

```env
# Supabase Local Development
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<from supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<from supabase status>"

# Database (Supabase Pooler)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

---

## Out of Scope

- Supabase production deployment
- Supabase Auth integration (keep NextAuth)
- Supabase Realtime features
- Supabase Storage integration
- Supabase Edge Functions
- Supabase Row Level Security (RLS) policies

These features are for future iterations. This iteration focuses on:
1. Getting local development working with Supabase
2. Fixing runtime errors to make app usable

---

## Testing Strategy

### Supabase Integration Testing
1. Start Supabase: `npm run db:local`
2. Check Supabase Studio: http://localhost:54323
3. Verify all tables exist
4. Run seed script: `npm run db:seed`
5. Verify seed data in Supabase Studio
6. Start app: `npm run dev`
7. Test database operations (create account, transaction, etc.)

### Runtime Error Testing
1. Open app in Chrome: http://localhost:3000
2. Open DevTools Console
3. Navigate through all pages
4. Document all errors
5. Fix errors one by one
6. Re-test until console is clean
7. Test all major features (auth, CRUD operations)

---

## Deliverables

1. **Supabase Integration**
   - Supabase initialized in project
   - Database schema migrated
   - Environment variables configured
   - npm scripts added
   - README updated

2. **Runtime Fixes**
   - All runtime errors fixed
   - Clean browser console
   - All pages functional
   - Error report document

3. **Documentation**
   - Updated README with Supabase setup
   - Troubleshooting guide for common errors
   - Development workflow documentation

---

## Notes for Builders

- Use Chrome DevTools MCP to inspect runtime errors
- Don't break existing functionality while integrating Supabase
- Keep Prisma as the ORM (don't switch to Supabase client)
- Focus on making local development smooth
- Document any blockers or issues encountered

---

**End of Iteration 2 Requirements**
