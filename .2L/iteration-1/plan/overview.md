# 2L Iteration Plan - Wealth Personal Finance Dashboard

## Project Vision

Wealth is a mindful, single-user personal finance dashboard that helps users build a conscious relationship with money through awareness and intentionality. The application connects to bank accounts via Plaid, tracks spending patterns with AI-powered categorization, manages budgets, and provides insights into financial health - all while maintaining a calm, non-judgmental user experience.

## Success Criteria

The MVP is complete when:

- [ ] User can register and login using email/password or Google OAuth
- [ ] User can connect a bank account via Plaid (sandbox mode)
- [ ] Transactions automatically import from connected Plaid accounts
- [ ] Transactions are automatically categorized using Claude AI
- [ ] User can manually add, edit, and categorize transactions
- [ ] User can create monthly budgets by category
- [ ] Budget progress displays in real-time with color-coded indicators
- [ ] Dashboard displays net worth, monthly income vs expenses, top spending categories, recent transactions, and budget status
- [ ] Analytics page shows spending by category chart, spending trends over time, and month-over-month comparison
- [ ] User can create and track savings goals with progress projections
- [ ] User can export transaction data to CSV
- [ ] Password reset flow works via email
- [ ] Application is fully mobile-responsive
- [ ] All critical tests pass (authentication, Plaid connection, transaction sync, budget tracking)
- [ ] Application is deployed to Vercel and accessible via public URL

## MVP Scope

**In Scope:**

- Authentication (Email/Password + Google OAuth)
- Account management (Plaid connection + manual accounts)
- Transaction tracking (auto-import, manual entry, AI categorization)
- Category management (default categories + custom)
- Budget management (monthly budgets, progress tracking, visual indicators)
- Analytics dashboard (net worth, income vs expenses, spending charts, trends)
- Goals tracking (savings goals, progress projections)
- Data export (CSV)
- Mobile-responsive design
- Password reset flow
- Core testing suite

**Out of Scope (Post-MVP):**

- Mindful finance features (reflections, gratitude journal, values alignment)
- Split transactions
- Bulk operations (bulk categorize, bulk delete)
- Budget alerts via email
- Budget rollover functionality
- Recurring transaction detection
- Advanced search/filtering
- Bill reminders
- Investment portfolio tracking
- Multi-user/family accounts
- Native mobile apps
- Receipt upload/OCR
- Cryptocurrency tracking

## Architecture Overview

**Pattern:** Layered Monolith with Service-Oriented Boundaries

**Stack:**
- Framework: Next.js 14.2 (App Router) with React Server Components
- Language: TypeScript 5.3+ (strict mode)
- Database: PostgreSQL with Prisma 5.22 ORM
- API: tRPC 10.45 for type-safe API layer
- Authentication: NextAuth.js 5.0
- UI: Tailwind CSS 3.4 + shadcn/ui components
- Charts: Recharts 2.12
- Forms: React Hook Form 7.53 + Zod 3.23 validation
- External APIs: Plaid (bank connections), Claude (AI categorization), Resend (emails)

**Layers:**
1. Presentation: Next.js App Router pages and components
2. API: tRPC routers with Zod validation
3. Service: Business logic and external integrations
4. Data: Prisma ORM + PostgreSQL

## Development Phases

1. **Exploration** - COMPLETE
   - Duration: 30 minutes
   - Outputs: Explorer reports analyzing architecture and tech stack

2. **Planning** - CURRENT (you are here)
   - Duration: ~30 minutes
   - Outputs: This plan document set

3. **Building** - 8 primary builders working in parallel/sequence
   - Duration: ~3-4 hours (parallel execution)
   - Phase 1 (Foundation): Builders 1-3 in parallel
   - Phase 2 (Core Features): Builders 4-6 after Phase 1
   - Phase 3 (Advanced): Builders 7-8 after Phase 2

4. **Integration** - Merge builder outputs
   - Duration: ~30-45 minutes
   - Activities: Merge code, resolve conflicts, verify integration

5. **Validation** - Test complete system
   - Duration: ~30-45 minutes
   - Activities: Run tests, manual testing flows, fix critical bugs

6. **Deployment** - Deploy to production
   - Duration: ~15-30 minutes
   - Activities: Configure environment, deploy to Vercel, smoke test

## Timeline Estimate

- Exploration: 30 minutes (COMPLETE)
- Planning: 30 minutes (CURRENT)
- Building: 3-4 hours (8 builders, some parallel)
- Integration: 30-45 minutes
- Validation: 30-45 minutes
- Deployment: 15-30 minutes

**Total: ~5-7 hours of autonomous development**

## Builder Organization

**8 Primary Builders** organized in 3 phases:

**Phase 1 - Foundation (Parallel):**
- Builder-1: Authentication & User Management
- Builder-2: Category Management & Seed Data
- Builder-3: Account Management (non-Plaid)

**Phase 2 - Core Features (After Phase 1):**
- Builder-4: Plaid Integration Service (standalone)
- Builder-5: Transaction Management (4 sub-builders - PRE-SPLIT)
  - Sub-5A: Core Transaction CRUD
  - Sub-5B: Plaid-Transaction Integration
  - Sub-5C: Claude AI Categorization
  - Sub-5D: Transaction UI & Filtering
- Builder-6: Budget Management (2 sub-builders)
  - Sub-6A: Budget CRUD & Progress Calculation
  - Sub-6B: Budget UI & Visualization

**Phase 3 - Advanced Features (After Phase 2):**
- Builder-7: Analytics & Dashboard
- Builder-8: Goals & Planning

## Risk Assessment

### High Risks

**Risk: Plaid Integration Complexity**
- Impact: HIGH - Core MVP feature
- Probability: MEDIUM - Well-documented but complex OAuth flow
- Mitigation:
  - Dedicated standalone Builder-4 for Plaid only
  - Use Plaid Sandbox for testing
  - Comprehensive error handling patterns provided
  - Token encryption patterns defined in advance

**Risk: Transaction Module Overload**
- Impact: HIGH - Would cause builder split mid-execution
- Probability: HIGH - Multiple complex integrations (Plaid + Claude + UI)
- Mitigation:
  - PRE-SPLIT Transaction Management into 4 sub-builders
  - Clear sub-builder interfaces and dependencies
  - Sequential execution with validation checkpoints

**Risk: Database Query Performance**
- Impact: MEDIUM - Affects user experience
- Probability: LOW - Single user, limited dataset
- Mitigation:
  - Comprehensive indexing strategy in schema
  - Database-level aggregations (not in-memory)
  - Query optimization patterns provided

### Medium Risks

**Risk: Claude API Cost Escalation**
- Impact: MEDIUM - Budget concern
- Probability: LOW - Single user, caching strategy
- Mitigation:
  - Merchant-category caching pattern
  - Batch processing (50 transactions per request)
  - Cost monitoring with rate limits

**Risk: Type Safety Complexity**
- Impact: MEDIUM - Development speed
- Probability: LOW - tRPC provides automatic type inference
- Mitigation:
  - TypeScript strict mode from start
  - Prisma generates types automatically
  - Code patterns include proper typing examples

**Risk: Mobile Responsiveness**
- Impact: MEDIUM - User experience on mobile
- Probability: LOW - Tailwind + shadcn/ui are responsive by default
- Mitigation:
  - Mobile-first CSS approach
  - Test on mobile viewport during development
  - Recharts ResponsiveContainer for charts

## Integration Strategy

### Builder Output Structure

Each builder produces:
```
/src/
  /app/              # Pages and routes
  /components/       # React components
  /server/routers/   # tRPC routers (if applicable)
  /server/services/  # Business logic services (if applicable)
  /lib/              # Utilities
  /types/            # TypeScript types
prisma/schema.prisma # Database schema additions
```

### Integration Points

**Shared Schema (prisma/schema.prisma):**
- All builders append to single schema file
- Integration: Merge schema, run migrations once
- Conflict prevention: Clear model ownership per builder

**tRPC Routers:**
- Each builder creates isolated routers
- Integration: Import and merge in root router (src/server/api/root.ts)
- No conflicts: Separate router namespaces

**Shared Components (src/components/ui/):**
- Builder-1 installs shadcn/ui components
- Other builders reference existing components
- No duplication: Use shared component library

**Shared Services:**
- Builder-4 creates PlaidService
- Builder-5 creates CategorizeService
- Other builders import services
- Clear interfaces prevent coupling

### Merge Order

1. Merge Builder-1, Builder-2, Builder-3 schemas → Run migrations
2. Install dependencies (npm install)
3. Merge Builder-4 PlaidService
4. Merge Builder-5 sub-builders (5A → 5B → 5C → 5D)
5. Merge Builder-6 sub-builders (6A → 6B)
6. Merge Builder-7 and Builder-8
7. Merge root tRPC router
8. Run type generation (prisma generate)
9. Run build (npm run build)
10. Run tests

### Conflict Prevention

**File Naming Conventions:**
- Components: `[Feature][Component].tsx` (e.g., TransactionList.tsx)
- Routes: Organized by feature folder
- tRPC routers: `[feature].router.ts`
- Services: `[feature].service.ts`

**Shared Files (Potential Conflicts):**
- `src/server/api/root.ts` - Root tRPC router (merge imports)
- `prisma/schema.prisma` - Database schema (append models)
- `src/app/layout.tsx` - Root layout (Builder-1 creates, others don't touch)
- `src/lib/trpc.ts` - tRPC client (Builder-1 creates, others don't touch)

**Conflict Resolution Strategy:**
- Schemas: Append models, verify no duplicate model names
- Root router: Add router imports to router object
- Dependencies: Merge package.json, deduplicate versions
- Types: Use namespaces to prevent naming conflicts

## Deployment Plan

**Target Platform:** Vercel (zero-config for Next.js)

**Database Hosting:** Vercel Postgres (recommended) or Neon/Supabase

**Pre-Deployment Checklist:**
1. All tests passing
2. Environment variables configured in Vercel
3. Database migrations run
4. Seed script executed (default categories)
5. Build succeeds locally
6. No TypeScript errors
7. No ESLint errors

**Environment Variables Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (for migrations)
- `NEXTAUTH_SECRET` - Session encryption key
- `NEXTAUTH_URL` - Application URL
- `GOOGLE_CLIENT_ID` - Google OAuth credentials
- `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `PLAID_CLIENT_ID` - Plaid API credentials
- `PLAID_SECRET` - Plaid API secret (sandbox)
- `PLAID_ENV` - Set to "sandbox"
- `ANTHROPIC_API_KEY` - Claude API key
- `RESEND_API_KEY` - Email service API key
- `ENCRYPTION_KEY` - 32-byte hex key for Plaid token encryption

**Deployment Steps:**
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Set build command: `npm run build`
4. Set install command: `npm install && npx prisma generate && npx prisma migrate deploy`
5. Deploy
6. Run seed script via Vercel CLI: `vercel run prisma db seed`
7. Test deployed application
8. Verify Plaid connection in sandbox mode
9. Test transaction import
10. Verify email delivery (password reset)

**Post-Deployment Verification:**
- [ ] Homepage loads
- [ ] Can register new account
- [ ] Can login
- [ ] Can connect Plaid account (sandbox)
- [ ] Transactions import
- [ ] AI categorization works
- [ ] Dashboard displays data
- [ ] Password reset email sends
- [ ] Mobile responsive

## Testing Strategy

**Unit Tests (Jest) - 80%+ coverage:**
- Utility functions (date formatting, calculations)
- Service layer functions (business logic)
- Validation schemas (Zod)
- Component logic (React Testing Library)

**Integration Tests:**
- tRPC router procedures
- Database queries (Prisma)
- External API integrations (mocked)

**E2E Tests (Playwright) - Critical flows only:**
- User registration and login
- Plaid account connection (sandbox)
- Transaction creation and categorization
- Budget creation and progress display
- Goal creation
- Password reset flow

**Manual Testing:**
- Mobile responsiveness across devices
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Data export (CSV format validation)
- Error states and edge cases

## Quality Gates

**Before Integration:**
- All builder code follows TypeScript strict mode
- No console.log statements
- All tRPC procedures have input validation (Zod)
- All database queries use Prisma (no raw SQL)
- Components follow naming conventions
- Error handling implemented for all external APIs

**Before Deployment:**
- TypeScript build succeeds with no errors
- ESLint passes (zero warnings in production code)
- All tests pass
- Lighthouse score > 85
- No critical security vulnerabilities (npm audit)
- Database migrations tested
- Seed data loads correctly

## Success Metrics

**Technical Metrics:**
- Build time < 2 minutes
- Type-safe end-to-end (zero TypeScript any types)
- Test coverage > 80%
- API response time < 200ms (p95)
- Page load time < 2s (First Contentful Paint)
- Zero production console errors

**Functional Metrics:**
- All 15 MVP success criteria met
- Password reset flow completes in < 2 minutes
- Plaid connection completes in < 1 minute
- Transaction categorization accuracy > 85%
- Dashboard loads in < 1 second

**User Experience Metrics:**
- Mobile-responsive on devices 375px+ width
- Accessible (keyboard navigation works)
- Error messages are clear and actionable
- Loading states prevent UI jank
- No broken links or 404 errors

## Notes for Builders

**Critical Patterns to Follow:**
- Always use Server Components by default, mark with 'use client' only when needed
- All tRPC procedures must validate input with Zod schemas
- Use Prisma for all database access (no raw SQL)
- Encrypt Plaid access tokens before storing
- Handle all external API errors gracefully with fallbacks
- Use shadcn/ui components for consistent UI
- Follow file structure conventions
- Add TypeScript types for all function parameters and returns
- Use descriptive variable names (no abbreviations)
- Add comments for complex business logic

**Common Pitfalls to Avoid:**
- Don't store sensitive data in logs
- Don't use client components when server components suffice
- Don't create duplicate shadcn/ui components
- Don't hardcode API URLs or secrets
- Don't use floating-point numbers for currency (use Decimal)
- Don't skip input validation on API routes
- Don't forget to invalidate React Query cache after mutations
- Don't nest tRPC routers more than 2 levels deep

**When to Ask for Help:**
- If builder complexity exceeds estimate by 50%+
- If external API integration fails repeatedly
- If type errors cannot be resolved
- If performance degrades significantly
- If tests fail consistently

---

**Plan Status:** READY FOR EXECUTION

**Next Step:** Proceed to builder-tasks.md for detailed task assignments
