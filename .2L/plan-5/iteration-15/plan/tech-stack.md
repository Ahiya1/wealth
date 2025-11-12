# Technology Stack

## Core Framework

**Decision:** Next.js 14.2.33 (App Router)

**Rationale:**
- Already established in project (Iteration 14 built on this foundation)
- Server Components enable efficient tRPC integration for server-side export generation
- App Router provides clean route structure for Settings pages
- Client Components for interactive export UI (format selectors, progress bars)
- Vercel deployment integration (seamless Blob Storage and Cron configuration)

**Alternatives Considered:**
- Pages Router: Rejected (App Router already in use, unnecessary migration)
- Other frameworks (Remix, SvelteKit): Rejected (existing infrastructure, no migration needed)

## Database

**Decision:** PostgreSQL (Neon) + Prisma 5.22.0

**Rationale:**
- ExportHistory model already exists from Iteration 14 (migration applied)
- Prisma provides type-safe queries for export data fetching
- Indexes on userId, createdAt, expiresAt optimize history queries
- No schema changes needed (Iteration 15 reuses existing models)

**Schema Strategy:**
- ExportHistory model tracks all exports (metadata, blob keys, expiration dates)
- Enums: ExportType (QUICK/COMPLETE), ExportFormat (CSV/JSON/EXCEL/ZIP), ExportDataType (TRANSACTIONS/BUDGETS/etc.)
- Relationships: ExportHistory belongs to User
- No new migrations needed (schema complete from Iteration 14)

## Cloud Storage

**Decision:** Vercel Blob Storage (@vercel/blob latest)

**Rationale:**
- Vercel-native integration (same deployment platform)
- Free tier: 1GB storage, 100GB bandwidth/month (sufficient for MVP)
- Automatic CDN distribution (fast global downloads)
- Simple API: put(), del(), list() - minimal learning curve
- Presigned URLs (secure, time-limited access without server proxying)
- Environment variable-based auth (BLOB_READ_WRITE_TOKEN)
- Graceful degradation possible (filesystem fallback for local development)

**Alternatives Considered:**
- AWS S3: Rejected (complex setup, overkill for MVP, additional AWS account needed)
- Cloudflare R2: Rejected (not Vercel-native, manual integration)
- Local filesystem: Rejected (doesn't scale, no CDN, manual cleanup needed)

**Implementation Notes:**
- Install: `npm install @vercel/blob`
- Configuration: BLOB_READ_WRITE_TOKEN from Vercel Dashboard → Storage → Create Blob Store
- Upload pattern: `await put(path, buffer, { access: 'public', contentType: 'application/zip' })`
- Download pattern: Return blob.url to client (presigned, CDN-cached)
- Delete pattern: `await del(blobKey)` in cleanup cron job
- Local development: Filesystem fallback if BLOB_READ_WRITE_TOKEN not set

## API Layer

**Decision:** tRPC 11.6.0 (protectedProcedure pattern)

**Rationale:**
- Existing exports.router from Iteration 14 (6 Quick export endpoints already implemented)
- Type-safe client-server communication (no API spec needed)
- Zod input validation (format enum, date range validation)
- protectedProcedure ensures user authentication
- Base64 encoding for binary transport (handles Buffers and strings)
- Mutation pattern for export generation (server-side processing)

**New Endpoints (Iteration 15):**
- `exports.exportComplete` - Generate full ZIP package with all data
- `exports.getExportHistory` - List last 10 exports for user
- `exports.redownloadExport` - Fetch cached export from Blob Storage

**Pattern Consistency:**
- All exports return: `{ content: base64, filename, mimeType, recordCount, fileSize }`
- Error handling: Try-catch with toast notifications
- Authentication: protectedProcedure (ctx.user.id validated)

## Frontend

**Decision:** React 18 + TypeScript 5.5.2

**Rationale:**
- Next.js 14 uses React 18 by default
- 'use client' directive for interactive components
- useState for local state (format selection, loading states)
- tRPC React hooks for server state (useQuery, useMutation)
- Type-safe props with TypeScript interfaces

**UI Component Library:** Radix UI + shadcn/ui

**Rationale:**
- Already established design system in project
- Radix primitives: Select (format dropdown), Progress (export progress bar), Toast (notifications)
- Accessible by default (keyboard navigation, ARIA attributes)
- Mobile-friendly viewport handling
- Consistent with existing Settings pages

**Styling:** Tailwind CSS 3.4.15

**Rationale:**
- Existing design tokens: warm-gray (text/backgrounds), sage (accents)
- Utility-first approach matches project style
- Responsive breakpoints: sm, md, lg
- Card components: border, shadow-soft, rounded-lg
- Typography: font-serif for headings, leading-relaxed for descriptions

**Component Structure:**
```
Settings > Data & Export page
├── Quick Exports section (6 ExportCard components)
├── Complete Export section (CompleteExportSection component)
└── Export History section (ExportHistoryTable component)
```

## Export Utilities (from Iteration 14)

**CSV Generation:** src/lib/csvExport.ts

**Functions:**
- generateTransactionCSV() - UTF-8 BOM, proper Decimal handling
- generateBudgetCSV() - Includes spent/remaining calculations
- generateGoalCSV() - Progress percentages
- generateAccountCSV() - Redacts plaidAccessToken
- generateRecurringTransactionCSV() - Human-readable frequency
- generateCategoryCSV() - Parent hierarchy

**Excel Generation:** src/lib/xlsxExport.ts

**Functions:**
- generateTransactionExcel() - Uses xlsx@0.18.5 library
- generateBudgetExcel() - Single-sheet workbooks
- generateGoalExcel() - Formatted dates and amounts
- generateAccountExcel() - Type-safe column headers
- generateRecurringTransactionExcel() - Frequency formatting
- generateCategoryExcel() - Hierarchy display

**Package:** xlsx@0.18.5 (already installed)

**AI Context Generator:** src/lib/aiContextGenerator.ts

**Purpose:** Generate ai-context.json with field descriptions, category hierarchy, AI prompt templates

**Output:**
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-11-10T...",
  "user": { "currency": "NIS", "timezone": "..." },
  "fields": { "transaction.amount": "Amount in NIS. Negative = expense", ... },
  "categories": { "hierarchy": { ... } },
  "aiPrompts": { "spendingAnalysis": "...", "budgetReview": "...", ... }
}
```

**README Generator:** src/lib/readmeGenerator.ts

**Purpose:** Generate README.md with export overview, AI usage instructions, data dictionary

**Sections:**
- Files Included (list with record counts)
- How to Analyze with AI (copy-paste instructions)
- Recommended Prompts (from ai-context.json)
- Data Dictionary (field descriptions)

**Archive Generator:** src/lib/archiveExport.ts

**Purpose:** Create ZIP packages using archiver@7.0.1

**Pattern:**
```typescript
const archive = archiver('zip', { zlib: { level: 9 } })
archive.append(content, { name: `${folderName}/${filename}` })
archive.finalize()
```

**New Utility (Iteration 15):** src/lib/summaryGenerator.ts

**Purpose:** Generate summary.json with export metadata

**Output:**
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-11-10T...",
  "user": { "email": "...", "currency": "NIS", "timezone": "..." },
  "recordCounts": { "transactions": 1247, "budgets": 12, ... },
  "dateRange": { "earliest": "2024-01-01", "latest": "2025-11-10" },
  "fileSize": 2458932,
  "format": "ZIP"
}
```

## Scheduled Jobs

**Decision:** Vercel Cron (built-in)

**Rationale:**
- No additional dependencies (integrated with Vercel deployment)
- Simple configuration in vercel.json
- CRON_SECRET authentication (already configured in project)
- Runs daily at 2 AM UTC (matches existing generate-recurring cron)
- Logs accessible in Vercel Dashboard

**Configuration:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-exports",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Alternatives Considered:**
- External cron services (cron-job.org): Rejected (unnecessary external dependency)
- Background jobs (BullMQ, Agenda): Rejected (overkill for simple daily cleanup)
- Serverless functions with manual triggers: Rejected (need automatic scheduling)

## Notifications

**Decision:** Sonner 2.0.7 (toast library)

**Rationale:**
- Already installed and used throughout app
- Simple API: `toast.success()`, `toast.error()`
- Supports descriptions: `toast.success('Export successful', { description: 'Downloaded 247 transactions' })`
- Auto-dismiss with customizable duration
- Mobile-friendly positioning

**Usage Pattern:**
```typescript
// Success
toast.success('Export successful', {
  description: `Downloaded ${recordCount} transactions`,
})

// Error
toast.error('Export failed', {
  description: 'Please try again or contact support',
})
```

## Development Tools

### Type Checking

**TypeScript 5.5.2**
- Strict mode enabled
- Prisma-generated types for database models
- tRPC-inferred types for API calls
- Zod schemas for input validation

### Code Quality

**ESLint:** eslint@9.16.0 with Next.js plugin
- Config: eslint.config.mjs
- Rules: next/core-web-vitals
- Custom rules for consistency

**Prettier:** (implied via editor config)
- 2-space indentation
- Single quotes for JSX
- Trailing commas

### Build & Deploy

**Build tool:** Next.js built-in (Turbopack for dev, Webpack for prod)
**Deployment target:** Vercel
**CI/CD:** Git push to main → Vercel auto-deploy

## Environment Variables

**Required (Iteration 15):**

```bash
# Vercel Blob Storage (NEW)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXX"
# Get from: Vercel Dashboard → Storage → Create Blob Store → Copy token
# Used for: Export caching (upload, download, delete operations)
```

**Verify Existing:**

```bash
# Database connection
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Cron authentication
CRON_SECRET="..."

# Plaid (optional, for bank connections)
PLAID_CLIENT_ID="..."
PLAID_SECRET="..."
PLAID_ENV="sandbox"
```

**Environment Setup:**

1. Copy .env.example to .env
2. Fill in BLOB_READ_WRITE_TOKEN from Vercel Dashboard
3. Verify CRON_SECRET exists (needed for cleanup cron)
4. Deploy to Vercel to apply environment variables

## Dependencies Overview

**To Install (Iteration 15):**

```bash
npm install @vercel/blob
```

**Already Installed (Iteration 14):**

```json
{
  "dependencies": {
    "@vercel/blob": "latest",          // NEW
    "archiver": "^7.0.1",              // ZIP generation
    "xlsx": "^0.18.5",                 // Excel generation
    "date-fns": "^3.6.0",              // Date formatting
    "@prisma/client": "^5.22.0",       // Database ORM
    "@trpc/server": "^11.6.0",         // API layer
    "@trpc/client": "^11.6.0",         // Client API
    "@trpc/react-query": "^11.6.0",    // React hooks
    "@tanstack/react-query": "^5.80.3", // Query management
    "zod": "^3.23.8",                  // Input validation
    "sonner": "^2.0.7",                // Toast notifications
    "lucide-react": "^0.460.0",        // Icons
    "next": "14.2.33",                 // Framework
    "react": "^18.3.1",                // UI library
    "react-dom": "^18.3.1",            // DOM rendering
    "@radix-ui/react-select": "^2.1.4", // Select dropdown
    "@radix-ui/react-progress": "^1.1.1", // Progress bar
    "tailwindcss": "^3.4.15"           // Styling
  },
  "devDependencies": {
    "@types/archiver": "^7.0.0",       // TypeScript types
    "@types/node": "^22.9.0",          // Node types
    "@types/react": "^18.3.12",        // React types
    "typescript": "^5.5.2",            // Type checking
    "eslint": "^9.16.0",               // Linting
    "vitest": "^2.1.8"                 // Testing
  }
}
```

## Performance Targets

**Export Generation:**
- Quick exports (CSV/JSON/Excel): < 3 seconds
- Complete export (ZIP package): < 15 seconds
- Export with 10k transactions: < 30 seconds (timeout warning at 15s)

**Blob Storage:**
- Upload time: < 5 seconds for 5MB ZIP
- Download time: < 2 seconds (CDN-cached)
- Re-download (cached): < 1 second (presigned URL fetch)

**UI Responsiveness:**
- Format selector interaction: < 100ms
- Export button click to loading state: < 50ms
- Progress bar updates: Every 500ms during generation
- Toast notification appearance: < 200ms

**Database Queries:**
- Export history query (last 10): < 100ms (indexed on userId, createdAt)
- Parallel data fetches (6 types): < 2 seconds total (Promise.all)

## Security Considerations

**Blob Storage Access:**
- presigned URLs with time-limited access (Vercel Blob default: 1 hour)
- BLOB_READ_WRITE_TOKEN is server-only (never exposed to client)
- Blob URLs include secure tokens (not guessable)

**Data Sanitization:**
- plaidAccessToken redacted from account exports
- User IDs not included in export files (only internal metadata)
- Email address included in summary.json (user's own data)

**Authentication:**
- All tRPC endpoints use protectedProcedure (requires user session)
- Cron job uses CRON_SECRET Bearer token (prevents unauthorized triggers)
- Export History filtered by userId (users only see their own exports)

**Rate Limiting:**
- 10k transaction limit per export (prevents memory overflow)
- Concurrent exports: 1 per user (enforced via loading state, not server-side queue)
- Blob Storage quota: 1GB free tier (graceful degradation if exceeded)

**Error Handling:**
- Blob upload failures: Fallback to direct download (no caching)
- Database errors: Logged, toast error shown, export fails gracefully
- Invalid formats: Zod validation rejects before processing
- Expired exports: Soft delete (record remains, blob deleted)

## Monitoring & Logging

**Export Performance:**
```typescript
const startTime = Date.now()
// ... export generation ...
const duration = Date.now() - startTime
console.log(`Complete export: ${duration}ms, ${recordCount} records, ${fileSize} bytes`)
```

**Blob Storage Usage:**
- Check Vercel Dashboard → Storage for usage stats
- Free tier: 1GB storage, 100GB bandwidth/month
- Upgrade to Pro ($20/month) if quota exceeded

**Cron Job Logs:**
```typescript
console.log(`Cleanup complete: ${deletedCount} exports deleted, ${freedBytes} bytes freed`)
```

**Error Tracking:**
- Vercel logs capture all server-side errors
- Client-side errors: Console logs + toast notifications
- Manual review: Check Vercel Dashboard → Logs daily

---

**Tech Stack Status:** COMPLETE
**Dependencies Verified:** YES
**Ready for:** Pattern Definition
