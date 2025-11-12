# Builder Task Breakdown

## Overview

4 primary builders will work in parallel where possible. No splits anticipated (all tasks are MEDIUM complexity or below).

**Estimated total:** 8-10 hours (parallel execution)

## Builder Assignment Strategy

- Builder-15-1: Frontend UI components (Export Center page, cards, selectors)
- Builder-15-2: Backend complete export endpoint + Blob Storage integration
- Builder-15-3: Export history (backend queries + frontend table)
- Builder-15-4: Cleanup cron job (scheduled deletion)

**Dependencies:**
- Builder-15-3 depends on Builder-15-2 (needs exportComplete to generate history)
- All others can work in parallel

---

## Builder-15-1: Export Center UI Components

### Scope

Build the unified Export Center UI in Settings > Data & Export page, replacing the "coming soon" placeholder with fully functional Quick Exports and Complete Export sections. Create reusable components for export cards, format selectors, and progress indicators.

### Complexity Estimate

**MEDIUM**

- Reason: Multiple components with state management, tRPC integration, base64 decoding
- Challenge: Progress tracking for Complete Export, base64 → Blob → Download flow
- No split needed: Sequential implementation with clear component boundaries

### Success Criteria

- [ ] Settings > Data & Export page replaces placeholder with Export Center
- [ ] Quick Exports section displays 6 data type cards in grid layout
- [ ] Each card has format selector (CSV/JSON/Excel) and working export button
- [ ] Export buttons show loading state during generation
- [ ] Base64 content decodes correctly and triggers browser download
- [ ] Success toast displays with record count and file name
- [ ] Error states handled gracefully with clear toast messages
- [ ] Complete Export section has prominent "Export Everything" button
- [ ] Progress bar displays during Complete Export generation
- [ ] Progress bar shows step labels ("Fetching data...", "Creating archive...")
- [ ] Complete Export downloads ZIP file with correct filename
- [ ] All components use existing design system (warm-gray, sage colors)
- [ ] Mobile-responsive layout (cards stack on small screens)

### Files to Create

**Primary:**
- `src/app/(dashboard)/settings/data/page.tsx` - Export Center page (replace existing placeholder)
- `src/components/exports/ExportCard.tsx` - Reusable quick export card
- `src/components/exports/FormatSelector.tsx` - CSV/JSON/Excel dropdown
- `src/components/exports/CompleteExportSection.tsx` - ZIP export section with progress
- `src/components/exports/ExportProgressBar.tsx` - Progress indicator (optional, can use Radix Progress directly)

**Purpose:**
- page.tsx: Main Export Center orchestration (3 sections: Quick, Complete, History placeholder)
- ExportCard: Individual data type exports (used 6 times in grid)
- FormatSelector: Format dropdown (shared across all exports)
- CompleteExportSection: ZIP package generator with progress tracking
- ExportProgressBar: Reusable progress component (or use Radix Progress directly)

### Dependencies

**Depends on:** None (can start immediately)

**Blocks:** Builder-15-3 (Export History UI will be added to same page)

**Uses:**
- Existing tRPC endpoints from Iteration 14 (exports.exportTransactions, exportBudgets, etc.)
- Will use Builder-15-2's exportComplete endpoint (can mock response during development)
- Existing UI components (Card, Button, Select, Progress from shadcn/ui)

### Implementation Notes

**Export Card Pattern:**
- Use map() to render 6 cards from data array:
  ```typescript
  const exportTypes = [
    { title: 'Transactions', dataType: 'transactions', icon: <Receipt />, description: 'Export all transactions' },
    { title: 'Budgets', dataType: 'budgets', icon: <PiggyBank />, description: 'Export monthly budgets' },
    // ... 4 more
  ]
  ```
- Each card maintains local state for format selection
- tRPC useMutation for export generation
- Base64 decode pattern (see patterns.md)

**Progress Simulation:**
- Complete Export shows progress bar (0-100%)
- Simulate progress with setInterval (real streaming is complex)
- Step labels: "Fetching data..." (0-30%), "Generating files..." (30-60%), "Creating archive..." (60-90%), "Finalizing..." (90-100%)
- Clear interval on mutation success/error

**Base64 → Download Pattern:**
```typescript
const binaryString = atob(data.content)
const bytes = new Uint8Array(binaryString.length)
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i)
}
const blob = new Blob([bytes], { type: data.mimeType })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = data.filename
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
```

**Error Handling:**
- Network errors: Toast with "Please check your connection and try again"
- Server errors: Toast with error.message or fallback message
- Validation errors: Toast with specific field issue

**Design Consistency:**
- Use existing Card component with border, shadow-soft
- Button variants: default (primary actions), outline (secondary)
- Color palette: warm-gray for text, sage for accents
- Typography: font-serif for headings, leading-relaxed for descriptions
- Spacing: space-y-6 for sections, gap-4 for grids

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Export Card Component** - Full implementation example
- **Format Selector Component** - Dropdown pattern
- **Complete Export Section** - Progress tracking
- **Error Handling Patterns** - Toast notifications

### Testing Requirements

**Manual Testing:**
- [ ] Test each data type export (Transactions, Budgets, Goals, Accounts, Recurring, Categories)
- [ ] Verify each format downloads correctly (CSV opens in Excel, JSON is valid, Excel opens in Excel/Sheets)
- [ ] Test Complete Export generates ZIP with all files
- [ ] Verify ZIP extracts correctly and contains 9 files (README, ai-context, summary, 6 CSVs)
- [ ] Test loading states (buttons show "Exporting...")
- [ ] Test error states (disconnect network, verify toast appears)
- [ ] Test mobile layout (cards stack on narrow screens)

**Coverage target:** Manual testing sufficient (UI components, defer automated tests to post-MVP)

### Potential Issues

**Issue 1: Base64 decoding memory usage for large exports**
- Scenario: 10MB ZIP encoded as base64 becomes ~13MB string in memory
- Mitigation: Accept this for MVP (10k transaction limit prevents extreme sizes)
- Future: Streaming downloads via server proxy (post-MVP optimization)

**Issue 2: Progress tracking accuracy**
- Challenge: Can't track real progress without streaming server updates
- Solution: Use simulated progress with step labels (sets user expectations)
- Note: Progress jumps to 100% when mutation succeeds (acceptable UX)

---

## Builder-15-2: Complete Export & Blob Storage

### Scope

Implement the complete export ZIP package generation endpoint in tRPC exports router. Install and configure Vercel Blob Storage for caching. Create summaryGenerator utility. Integrate upload to Blob after export generation. Record all exports to ExportHistory database.

### Complexity Estimate

**MEDIUM-HIGH**

- Reason: Coordinates 6 data fetches, 9 file generations, ZIP creation, Blob upload, DB recording
- Challenge: Graceful degradation if Blob upload fails, error handling at each step
- No split needed: Sequential implementation with clear step boundaries

### Success Criteria

- [ ] `@vercel/blob` package installed via npm
- [ ] BLOB_READ_WRITE_TOKEN configured in .env and .env.example
- [ ] summaryGenerator.ts utility created and tested
- [ ] exports.exportComplete endpoint implemented in exports.router.ts
- [ ] Endpoint fetches all 6 data types in parallel (Promise.all)
- [ ] Budget calculations included (spent, remaining, status)
- [ ] Goal status calculated (COMPLETED, IN_PROGRESS, NOT_STARTED)
- [ ] Accounts sanitized (plaidAccessToken redacted)
- [ ] All 9 files generated (README, ai-context, summary, 6 CSVs)
- [ ] ZIP created using archiveExport utility
- [ ] ZIP uploaded to Vercel Blob Storage
- [ ] Upload failures handled gracefully (continue without caching)
- [ ] ExportHistory record created with blob key and metadata
- [ ] Base64-encoded ZIP returned to client
- [ ] Performance logged (duration, record count, file size)
- [ ] Complete export generates correctly and downloads successfully

### Files to Create

**Primary:**
- `src/lib/summaryGenerator.ts` - Generate summary.json for ZIP package

**Modify:**
- `src/server/api/routers/exports.router.ts` - Add exportComplete procedure (extend existing router)

**Configuration:**
- `.env.example` - Add BLOB_READ_WRITE_TOKEN documentation
- `.env` - Add BLOB_READ_WRITE_TOKEN value (get from Vercel Dashboard)

**Purpose:**
- summaryGenerator.ts: Creates metadata JSON with record counts, date ranges, user info
- exports.router.ts: New exportComplete mutation that orchestrates full ZIP generation
- Environment config: Enables Vercel Blob Storage integration

### Dependencies

**Depends on:** Iteration 14 (all export utilities, ExportHistory model, existing export endpoints)

**Blocks:** Builder-15-1 (UI will call this endpoint), Builder-15-3 (history populated by this endpoint)

**Uses:**
- csvExport.ts (6 generators from Iteration 14)
- xlsxExport.ts (not used in ZIP, only individual exports)
- aiContextGenerator.ts (from Iteration 14)
- readmeGenerator.ts (from Iteration 14)
- archiveExport.ts (from Iteration 14)
- ExportHistory model (Prisma schema from Iteration 14)

### Implementation Notes

**Vercel Blob Setup:**
1. Go to Vercel Dashboard → Project → Storage tab
2. Click "Create Database" → Select "Blob"
3. Name: "wealth-exports"
4. Copy BLOB_READ_WRITE_TOKEN to .env
5. Add to .env.example with setup instructions
6. Install package: `npm install @vercel/blob`

**Summary Generator Structure:**
```typescript
// Input: user info, record counts, date range, file size
// Output: JSON string with export metadata
// Format: See patterns.md for exact structure
```

**Complete Export Flow:**
1. Fetch all 6 data types with Promise.all() (parallel)
2. Calculate budget metrics (spent, remaining, status) - use Promise.all() again
3. Calculate goal status (completed, in progress, not started)
4. Sanitize accounts (remove plaidAccessToken)
5. Generate 6 CSV files using existing generators
6. Generate ai-context.json using aiContextGenerator
7. Generate README.md using readmeGenerator
8. Generate summary.json using summaryGenerator
9. Create ZIP using archiveExport with all 9 files
10. Upload ZIP to Vercel Blob (try-catch for graceful degradation)
11. Save ExportHistory record with blob key
12. Return base64-encoded ZIP to client

**Blob Upload Pattern:**
```typescript
let blobKey: string | null = null
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
    const path = `exports/${ctx.user.id}/complete-${timestamp}.zip`

    const blob = await put(path, zipBuffer, {
      access: 'public',
      contentType: 'application/zip',
    })

    blobKey = blob.url
    console.log(`Export uploaded to Blob: ${blobKey}`)
  } else {
    console.warn('BLOB_READ_WRITE_TOKEN not set, export not cached')
  }
} catch (error) {
  console.error('Blob upload failed:', error)
  // Continue without caching (graceful degradation)
}
```

**ExportHistory Record:**
```typescript
await ctx.prisma.exportHistory.create({
  data: {
    userId: ctx.user.id,
    exportType: 'COMPLETE',
    format: 'ZIP',
    dataType: null, // null for complete exports
    dateRange: null, // not applicable for complete exports
    recordCount: totalRecords,
    fileSize: zipBuffer.byteLength,
    blobKey, // null if upload failed
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
})
```

**Performance Logging:**
```typescript
const startTime = Date.now()
// ... export generation ...
const duration = Date.now() - startTime
console.log(`Complete export: ${duration}ms, ${totalRecords} records, ${fileSize} bytes`)
```

**Error Handling:**
- Prisma query errors: Log, throw error with user-friendly message
- File generation errors: Log, throw error (likely bug, should not happen)
- ZIP creation errors: Log, throw error (archiver is reliable)
- Blob upload errors: Log warning, continue without caching (graceful)
- Database save errors: Log, throw error (critical, must succeed)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Complete Export Endpoint** - Full implementation with all 10 steps
- **Parallel Data Fetching** - Promise.all() pattern
- **Blob Storage Upload/Download** - put() and del() patterns
- **ExportHistory Tracking** - Database record creation
- **Summary Generator** - JSON generation utility

### Testing Requirements

**Manual Testing:**
- [ ] Install @vercel/blob and verify in package.json
- [ ] Configure BLOB_READ_WRITE_TOKEN in .env
- [ ] Test summaryGenerator with sample data (verify JSON structure)
- [ ] Test exportComplete endpoint via tRPC client (generate ZIP)
- [ ] Verify ZIP structure (9 files in correct folder)
- [ ] Open README.md, ai-context.json, summary.json (verify content)
- [ ] Open each CSV file (verify data integrity)
- [ ] Check Vercel Dashboard → Storage (verify blob uploaded)
- [ ] Check database (verify ExportHistory record created)
- [ ] Test without BLOB_READ_WRITE_TOKEN (verify graceful degradation)
- [ ] Test with large dataset (1000+ transactions, verify performance <15s)

**Coverage target:** Manual testing sufficient (integration testing, defer automated tests to post-MVP)

### Potential Issues

**Issue 1: Blob Storage quota exhaustion (1GB free tier)**
- Scenario: Heavy usage fills 1GB storage
- Mitigation: Graceful degradation already in place (export without caching)
- Monitoring: Check Vercel Dashboard → Storage daily
- Upgrade path: Vercel Pro ($20/month) provides 100GB

**Issue 2: Complete export timeout (>30s for 10k transactions)**
- Scenario: Large dataset takes too long to generate
- Mitigation: 10k transaction limit already enforced, log performance
- If >30s detected: Add warning toast in UI ("Large dataset, may take 60s")
- Future: Background jobs (post-MVP)

**Issue 3: Blob upload failures (network errors)**
- Scenario: Blob API temporarily unavailable
- Mitigation: Try-catch with continue (export still works, just not cached)
- Logging: Error logged for monitoring
- UX: User still gets download, just no re-download capability

---

## Builder-15-3: Export History

### Scope

Implement export history query and re-download endpoints in tRPC exports router. Create ExportHistoryTable component to display last 10 exports with metadata and re-download buttons. Integrate table into Export Center page.

### Complexity Estimate

**MEDIUM**

- Reason: Two tRPC endpoints (query + mutation) + frontend table component
- Challenge: Cache miss scenarios (expired, blob deleted), date formatting
- No split needed: Straightforward implementation with clear patterns

### Success Criteria

- [ ] exports.getExportHistory query endpoint implemented
- [ ] Query returns last 10 exports for authenticated user
- [ ] Query calculates isExpired flag (expiresAt < now)
- [ ] exports.redownloadExport mutation endpoint implemented
- [ ] Re-download validates: ownership, expiration, blob exists
- [ ] Re-download returns blob URL for direct download
- [ ] ExportHistoryTable component created
- [ ] Table displays: Type, Format, Records, Size, Date, Actions
- [ ] File size formatted (KB/MB display)
- [ ] Date formatted ("Nov 9, 2025")
- [ ] Expired exports show "Expired" badge
- [ ] Expired exports disable re-download button
- [ ] Re-download button opens blob URL in new tab (triggers download)
- [ ] Empty state shown if no exports ("No exports yet...")
- [ ] Loading state shown while fetching history
- [ ] Table integrated into Export Center page (third section)

### Files to Create

**Primary:**
- `src/components/exports/ExportHistoryTable.tsx` - History table with re-download

**Modify:**
- `src/server/api/routers/exports.router.ts` - Add getExportHistory and redownloadExport procedures
- `src/app/(dashboard)/settings/data/page.tsx` - Add ExportHistoryTable to page (Builder-15-1 will leave placeholder)

**Purpose:**
- ExportHistoryTable.tsx: Display past exports with metadata and actions
- exports.router.ts: Query history and fetch cached exports from Blob Storage
- page.tsx: Integrate history section into Export Center

### Dependencies

**Depends on:** Builder-15-2 (needs exportComplete to populate history)

**Blocks:** None (last builder in chain)

**Uses:**
- ExportHistory model (Prisma schema from Iteration 14)
- Vercel Blob URLs (from Builder-15-2's blob upload)
- date-fns for date formatting
- Existing UI components (Card, Button, Table styling)

### Implementation Notes

**getExportHistory Query:**
```typescript
getExportHistory: protectedProcedure
  .query(async ({ ctx }) => {
    const history = await ctx.prisma.exportHistory.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return history.map((exp) => ({
      id: exp.id,
      type: exp.exportType === 'COMPLETE' ? 'Complete' : 'Quick',
      format: exp.format,
      dataType: exp.dataType,
      recordCount: exp.recordCount,
      fileSize: exp.fileSize,
      createdAt: exp.createdAt,
      expiresAt: exp.expiresAt,
      isExpired: exp.expiresAt < new Date(),
      blobKey: exp.blobKey,
    }))
  })
```

**redownloadExport Mutation:**
```typescript
redownloadExport: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const exportRecord = await ctx.prisma.exportHistory.findUnique({
      where: { id: input.id },
    })

    if (!exportRecord) {
      throw new Error('Export not found')
    }

    if (exportRecord.userId !== ctx.user.id) {
      throw new Error('Unauthorized')
    }

    if (exportRecord.expiresAt < new Date()) {
      throw new Error('Export has expired. Please generate a fresh export.')
    }

    if (!exportRecord.blobKey) {
      throw new Error('Export not cached. Please generate a fresh export.')
    }

    return {
      downloadUrl: exportRecord.blobKey,
      filename: `wealth-export-${format(exportRecord.createdAt, 'yyyy-MM-dd')}.${exportRecord.format.toLowerCase()}`,
    }
  })
```

**Table Component:**
- Use tRPC useQuery for getExportHistory
- Display loading state while fetching
- Show empty state if no history
- Format file sizes: `<1KB: "X B"`, `<1MB: "X.X KB"`, `>=1MB: "X.XX MB"`
- Format dates: `format(date, 'MMM d, yyyy')`
- Expired badge: `<span className="text-xs text-red-600">(Expired)</span>`
- Re-download: `window.open(downloadUrl, '_blank')` (opens blob URL)

**Error Handling:**
- Query errors: Show "Failed to load history" message
- Re-download errors: Toast with error.message
- Expired exports: Disable button, show "Expired" state
- Missing blob: Disable button, show "Generate Fresh" suggestion (future)

**Design Consistency:**
- Table styling: Border-b for rows, warm-gray-200 for borders
- Header: font-serif font-medium text-warm-gray-900
- Cells: text-warm-gray-700, py-3 px-4 padding
- Buttons: outline variant, size="sm"
- Empty state: Centered text with icon

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Export History Query** - getExportHistory implementation
- **Export History Table** - Full component with formatting
- **Error Handling Patterns** - Toast notifications

### Testing Requirements

**Manual Testing:**
- [ ] Generate a complete export (Builder-15-2)
- [ ] Verify export appears in history table
- [ ] Check metadata accuracy (type, format, record count, file size, date)
- [ ] Click re-download button (verify blob URL opens and download triggers)
- [ ] Wait 30 days (or manually update expiresAt in DB) and verify "Expired" badge
- [ ] Verify expired exports disable re-download button
- [ ] Test with no exports (verify empty state)
- [ ] Test with 10+ exports (verify only last 10 shown)

**Coverage target:** Manual testing sufficient (UI integration, defer automated tests to post-MVP)

### Potential Issues

**Issue 1: Blob URL expires before user clicks re-download**
- Scenario: Vercel Blob presigned URLs expire after 1 hour
- Reality: Vercel Blob URLs are permanent (not presigned), this is not an issue
- Mitigation: Not needed (blob.url is permanent until deleted)

**Issue 2: User manually deletes blob from Vercel Dashboard**
- Scenario: Blob deleted but DB record exists (blobKey points to 404)
- Mitigation: Re-download will fail (Blob API returns 404)
- UX: Show toast error "Export not available, please generate fresh"
- Future: Add health check endpoint to detect and clean up orphaned records

---

## Builder-15-4: Cleanup Cron Job

### Scope

Create Vercel Cron job to automatically delete expired exports (>30 days old) from both Vercel Blob Storage and database. Configure cron schedule in vercel.json. Implement cleanup logic following existing generate-recurring cron pattern.

### Complexity Estimate

**MEDIUM**

- Reason: Cron route implementation + Vercel config + Blob deletion logic
- Challenge: Partial failures (some blobs delete, others fail), authentication
- No split needed: Single route file with clear structure

### Success Criteria

- [ ] Cron route created at /api/cron/cleanup-exports/route.ts
- [ ] CRON_SECRET Bearer token authentication implemented
- [ ] Cron queries ExportHistory for expired exports (expiresAt < now)
- [ ] Cron deletes blobs from Vercel Blob Storage (individual try-catch)
- [ ] Cron deletes ExportHistory records from database
- [ ] Cron logs results (exports deleted, blobs deleted, bytes freed)
- [ ] Partial failures handled (continue loop on blob delete errors)
- [ ] vercel.json updated with cron configuration
- [ ] Cron scheduled for daily 2 AM UTC
- [ ] POST endpoint supported (for manual testing)
- [ ] Cron tested manually via curl or Postman
- [ ] Cron deployed and verified in Vercel Dashboard → Cron

### Files to Create

**Primary:**
- `src/app/api/cron/cleanup-exports/route.ts` - Cron endpoint for export cleanup

**Modify:**
- `vercel.json` - Add cleanup cron job to crons array

**Purpose:**
- route.ts: Automated deletion of expired exports (30+ days old)
- vercel.json: Schedule daily cleanup at 2 AM UTC

### Dependencies

**Depends on:** Builder-15-2 (needs exports in database and Blob Storage to clean up)

**Blocks:** None (cleanup is background task)

**Uses:**
- ExportHistory model (Prisma query for expired records)
- @vercel/blob del() function (delete blobs)
- CRON_SECRET for authentication (already configured)

### Implementation Notes

**Cron Configuration:**
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

**Authentication Pattern:**
```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (!cronSecret) {
  console.error('CRON_SECRET not configured')
  return NextResponse.json({ error: 'Cron configuration error' }, { status: 500 })
}

const expectedAuth = `Bearer ${cronSecret}`
if (authHeader !== expectedAuth) {
  console.warn('Unauthorized cron request attempt')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Cleanup Logic:**
```typescript
// 1. Find expired exports
const expiredExports = await prisma.exportHistory.findMany({
  where: { expiresAt: { lt: new Date() } },
})

// 2. Delete blobs (individual try-catch)
let deletedCount = 0
let freedBytes = 0

for (const exp of expiredExports) {
  if (exp.blobKey) {
    try {
      await del(exp.blobKey)
      deletedCount++
      freedBytes += exp.fileSize
    } catch (error) {
      console.error(`Failed to delete blob ${exp.blobKey}:`, error)
      // Continue with other deletions
    }
  }
}

// 3. Delete database records
await prisma.exportHistory.deleteMany({
  where: { id: { in: expiredExports.map(e => e.id) } },
})

// 4. Log results
console.log(`Cleanup complete: ${deletedCount} blobs deleted, ${freedBytes} bytes freed`)
```

**Response Format:**
```typescript
return NextResponse.json({
  success: true,
  message: 'Export cleanup completed',
  results: {
    exportsDeleted: expiredExports.length,
    blobsDeleted: deletedCount,
    bytesFreed: freedBytes,
  },
  timestamp: new Date().toISOString(),
})
```

**Error Handling:**
- CRON_SECRET missing: Return 500, log error
- Authentication failure: Return 401, log warning
- Prisma query errors: Return 500, log error
- Individual blob delete failures: Log warning, continue with others
- Database delete errors: Return 500, log error (critical)

**Manual Testing:**
```bash
# Test via curl (replace CRON_SECRET with actual value)
curl -X POST http://localhost:3000/api/cron/cleanup-exports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or create test exports with past expiresAt dates in database
# Then trigger cron manually to verify cleanup works
```

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Cron Job Pattern** - Full implementation with authentication and cleanup logic
- **Error Handling Patterns** - Individual blob delete try-catch

### Testing Requirements

**Manual Testing:**
- [ ] Update vercel.json with cron configuration
- [ ] Create test export with expiresAt in the past (manual DB update)
- [ ] Test cron locally: `curl -X POST http://localhost:3000/api/cron/cleanup-exports -H "Authorization: Bearer CRON_SECRET"`
- [ ] Verify test export deleted from database
- [ ] Verify test export's blob deleted from Vercel Blob Storage (check Dashboard)
- [ ] Check cron response (verify results JSON is correct)
- [ ] Test with invalid CRON_SECRET (verify 401 response)
- [ ] Test with multiple expired exports (verify all deleted)
- [ ] Deploy to Vercel and check Vercel Dashboard → Cron (verify job scheduled)
- [ ] Wait for scheduled run (or manually trigger via Dashboard) and verify logs

**Coverage target:** Manual testing sufficient (cron job, defer automated tests to post-MVP)

### Potential Issues

**Issue 1: Partial blob deletion failures**
- Scenario: 3 expired exports, blob delete fails for 1 due to network error
- Mitigation: Continue loop on failures, log error, retry on next run
- DB records: Keep records if blob delete fails (prevents orphaning)
- Alternative: Delete DB records regardless (simpler, accept potential orphaned blobs)
- Decision: Delete DB records regardless (orphaned blobs are acceptable, next run can't detect them anyway)

**Issue 2: Cron doesn't run as scheduled**
- Scenario: Vercel Cron service issue or configuration error
- Mitigation: Check Vercel Dashboard → Cron for run history
- Logs: Review Vercel logs for cron execution errors
- Manual fallback: Run cleanup via POST endpoint manually
- Monitoring: Check cron run logs weekly (should see daily runs)

**Issue 3: CRON_SECRET not set in production**
- Scenario: Environment variable missing, cron returns 500
- Mitigation: Verify CRON_SECRET in Vercel Dashboard → Settings → Environment Variables
- Pre-deployment: Check .env.example has CRON_SECRET documented
- Testing: Test cron in preview environment before production deploy

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Start immediately:**
- Builder-15-1: Export Center UI (can use existing tRPC endpoints, mock exportComplete response)
- Builder-15-2: Complete Export & Blob Storage (independent backend work)
- Builder-15-4: Cleanup Cron Job (can test with manually created expired exports)

### Parallel Group 2 (Depends on Group 1)

**Start after Builder-15-2 completes:**
- Builder-15-3: Export History (needs exportComplete to populate history for testing)

**Alternative:** Builder-15-3 can start in parallel if they:
1. Manually insert ExportHistory records for testing
2. Integrate with page.tsx after Builder-15-1 completes

### Integration Notes

**Merge Order:**
1. Builder-15-2 first (backend foundation, no UI changes)
2. Builder-15-1 second (UI components, calls Builder-15-2's endpoints)
3. Builder-15-3 third (adds history section to page.tsx from Builder-15-1)
4. Builder-15-4 last (cron job, independent of UI)

**Conflict Areas:**
- `exports.router.ts`: Both Builder-15-2 and Builder-15-3 extend this file
  - Solution: Builder-15-2 adds exportComplete, Builder-15-3 adds getExportHistory and redownloadExport
  - Minimal conflict (different procedures)
- `page.tsx`: Builder-15-1 creates it, Builder-15-3 adds history section
  - Solution: Builder-15-1 leaves placeholder comment for history, Builder-15-3 fills it in
- `vercel.json`: Builder-15-4 adds cron config
  - Solution: Verify existing cron entry doesn't conflict, add new entry to array

**Shared Files:**
- All builders import from `src/lib/` utilities (no conflicts, read-only)
- All builders use Prisma models (no schema changes, read/write only)
- UI builders use shadcn components (no conflicts, shared library)

---

## Post-Integration Testing

**Full Flow Test:**
1. Navigate to Settings > Data & Export
2. Test Quick Export: Export transactions as CSV
3. Verify CSV downloads and opens correctly
4. Test Complete Export: Click "Export Everything"
5. Verify progress bar displays and ZIP downloads
6. Extract ZIP and verify 9 files present
7. Check Export History section (should show 2 exports)
8. Click re-download button on complete export
9. Verify ZIP downloads instantly
10. Manually update expiresAt in database to past date
11. Refresh page, verify export shows "Expired" badge
12. Trigger cleanup cron manually
13. Verify expired export deleted from history and Blob Storage

**Performance Test:**
- Generate complete export with 1000+ transactions
- Verify completion in <15 seconds
- Verify ZIP file size reasonable (<5MB)
- Verify no memory errors or timeouts

**Error Test:**
- Disconnect network during export
- Verify toast error appears
- Reconnect and retry
- Verify export works

**Cross-Browser Test:**
- Test in Chrome, Firefox, Safari, Edge
- Verify downloads work in all browsers
- Verify progress animations smooth
- Verify table layout correct on all screen sizes

---

**Builder Tasks Status:** COMPLETE
**Ready for:** Builder Execution
**Estimated Total:** 8-10 hours (parallel execution)
