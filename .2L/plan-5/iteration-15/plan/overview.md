# 2L Iteration Plan - Export Center UI & Complete Package

## Project Vision

Build a unified Export Center UI in Settings > Data & Export page that replaces the "coming soon" placeholder with fully functional export capabilities. Users will be able to:

1. Export individual data types (Quick Exports) in CSV, JSON, or Excel format
2. Generate complete export packages (ZIP files) with all data, AI context, and README
3. View export history and re-download cached exports (30-day retention)
4. Benefit from Vercel Blob Storage caching for instant re-downloads

This iteration builds on the complete backend infrastructure from Iteration 14 (all export utilities, tRPC endpoints, and database models are ready). The focus is on UI integration, complete ZIP package generation, Vercel Blob Storage caching, and the 30-day cleanup automation.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Settings > Data & Export page fully replaces placeholder with Export Center
- [ ] Quick Exports section displays 6 data type cards (Transactions, Budgets, Goals, Accounts, Recurring, Categories)
- [ ] Each Quick Export card has format selector (CSV/JSON/Excel) and working export button
- [ ] Export button shows loading state during generation
- [ ] Success toast displays with record count ("Downloaded 247 transactions")
- [ ] Error states handled gracefully with clear user feedback
- [ ] Complete Export section generates ZIP package with all files
- [ ] ZIP contains: README.md, ai-context.json, summary.json, and 6 CSV files
- [ ] Complete Export uploads to Vercel Blob Storage after generation
- [ ] Export History section displays last 10 exports with metadata
- [ ] Re-download button works instantly for cached exports (Blob Storage fetch)
- [ ] Expired exports show "Generate Fresh" option instead of re-download
- [ ] 30-day cleanup cron job scheduled and functional
- [ ] Cron job deletes expired exports from both Blob Storage and database
- [ ] All exports tracked in ExportHistory model with proper metadata
- [ ] Vercel Blob Storage integration configured with BLOB_READ_WRITE_TOKEN

## MVP Scope

**In Scope:**

- Unified Export Center UI (Settings > Data & Export page)
- Quick Exports section (6 data type cards with format selectors)
- Complete Export section (ZIP package generator with progress indicator)
- Export History section (table with last 10 exports)
- Re-download functionality (instant fetch from Vercel Blob Storage)
- Vercel Blob Storage integration (upload, download, delete operations)
- 30-day cleanup cron job (automated deletion of expired exports)
- ExportHistory database tracking (all exports recorded with metadata)
- Summary.json generator utility (export metadata file)
- Graceful error handling (Blob quota exceeded, upload failures)

**Out of Scope (Post-MVP):**

- Context export buttons on individual pages (Iteration 16)
- Mobile share sheet integration (Iteration 16)
- Filter-aware exports from Transactions/Budgets pages (Iteration 16)
- Manual export deletion by users (automatic cleanup only)
- Export analytics dashboard (admin feature)
- Background jobs for large exports (streaming sufficient)
- Multi-sheet Excel workbooks (single-sheet per data type)
- Scheduled exports (automatic monthly exports)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 8-10 hours (4 parallel builders)
4. **Integration** - 30 minutes
5. **Validation** - 30 minutes
6. **Deployment** - Final

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: 8-10 hours (parallel builders)
  - Builder-15-1: Export Center UI (3-4 hours)
  - Builder-15-2: Complete Export & Blob Storage (3-4 hours)
  - Builder-15-3: Export History (2-3 hours)
  - Builder-15-4: Cleanup Cron Job (2-3 hours)
- Integration: 30 minutes
- Validation: 30 minutes
- Total: ~9-11 hours

## Risk Assessment

### High Risks

- **Vercel Blob Storage quota exhaustion (1GB free tier)**: Risk - Large exports accumulate and fill storage. Mitigation - Graceful degradation (direct download without caching if upload fails), 30-day automatic cleanup, monitoring in cron job logs. Impact - Medium (export functionality continues, just no re-download capability).

- **Large export memory overflow (10k+ transactions)**: Risk - ZIP generation consumes excessive memory and times out. Mitigation - 10k transaction limit already enforced in exports.router.ts, archiver uses streaming (doesn't buffer full ZIP), Vercel serverless has 1GB memory limit (sufficient). Impact - Low (limits already in place).

### Medium Risks

- **Blob Storage upload failures**: Risk - Network errors or API issues prevent caching. Mitigation - Try-catch with fallback to direct download, log errors for monitoring, continue without caching (UX not blocked). Impact - Low (exports still work, just no re-download).

- **Cron job partial failures**: Risk - Some blob deletions succeed, others fail. Mitigation - Continue loop on individual failures, log errors, retry on next run (records remain in DB until blob deleted). Impact - Low (orphaned blobs cleaned up eventually).

- **Complete export complexity**: Risk - Coordinating 6 data fetches + 9 file generations + ZIP + upload. Mitigation - Reuse existing utilities, test incrementally, add timing logs, sequential implementation. Impact - Medium (manageable with clear structure).

## Integration Strategy

**Component Integration:**

1. Export Center page orchestrates 3 sections (Quick, Complete, History)
2. Each section uses shared components (ExportCard, FormatSelector)
3. All sections call tRPC exports router procedures
4. Exports router uses utilities from Iteration 14 (csvExport, xlsxExport, etc.)
5. Complete export calls new summaryGenerator utility
6. archiveExport combines all files into ZIP
7. Vercel Blob Storage handles caching layer
8. ExportHistory model tracks all exports

**Data Flow:**

```
UI (Export Center)
  ↓
tRPC Client (exports.exportComplete.mutate)
  ↓
exports.router (server-side)
  ↓
Prisma (fetch 6 data types in parallel)
  ↓
Export Utilities (generate 9 files)
  ↓
archiveExport (create ZIP)
  ↓
Vercel Blob Storage (upload, get URL)
  ↓
ExportHistory (save metadata)
  ↓
Response (download URL) → Client → Browser download
```

**Shared Code:**

- tRPC endpoints: All builders call same exports.router procedures
- Export utilities: Complete export reuses all 6 CSV generators from Iteration 14
- UI components: ExportCard reused 6 times in Quick Exports section
- Error handling: Consistent toast pattern across all export actions

**Conflict Prevention:**

- Each builder works on separate files (minimal overlap)
- Builder-15-1: Frontend UI components only
- Builder-15-2: Backend export endpoint + Blob integration
- Builder-15-3: Export history tRPC endpoints + UI
- Builder-15-4: Cron job (separate API route)
- Only exports.router.ts is extended by multiple builders (clear procedure boundaries)

## Deployment Plan

**Pre-Deployment Checklist:**

1. Install @vercel/blob dependency: `npm install @vercel/blob`
2. Configure BLOB_READ_WRITE_TOKEN in Vercel Dashboard (Storage → Create Blob Store)
3. Add BLOB_READ_WRITE_TOKEN to .env and .env.example
4. Update vercel.json with cleanup cron job configuration
5. Verify CRON_SECRET exists in environment variables

**Deployment Steps:**

1. Deploy to Vercel preview environment first
2. Test complete export flow (generate → download → verify ZIP contents)
3. Test Blob Storage upload (check Vercel Dashboard → Storage for uploaded files)
4. Test export history (verify re-download works)
5. Manually trigger cleanup cron via test endpoint (verify Blob deletion)
6. Deploy to production
7. Monitor logs for any Blob Storage errors or quota warnings

**Rollback Plan:**

- If Blob Storage fails: Graceful degradation already in place (direct downloads work)
- If Export Center UI breaks: Old "coming soon" placeholder can be restored
- If cron job fails: Manual cleanup via Vercel Dashboard → Storage
- Database changes: None (ExportHistory model already exists from Iteration 14)

**Monitoring:**

- Check Vercel logs for export generation times (should be <15s for complete exports)
- Monitor Blob Storage usage in Vercel Dashboard (free tier: 1GB)
- Check cron job logs daily (successful runs, deletion counts, freed bytes)
- Watch for error patterns in toast notifications (user-reported issues)

---

**Planning Status:** COMPLETE
**Ready for:** Builder Execution
**Estimated Completion:** 9-11 hours
