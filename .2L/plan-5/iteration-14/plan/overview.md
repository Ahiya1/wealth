# 2L Iteration Plan - Wealth Export Engine Foundation

## Project Vision

Build robust backend export infrastructure supporting all 6 data types (transactions, budgets, goals, accounts, recurring transactions, categories) in 3 formats (CSV, JSON, Excel), plus complete AI-ready ZIP packages. Fix the critical Analytics export date range bug to validate foundation before building new features.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Analytics export date range bug is fixed - users can export transactions without "No data to export" errors
- [ ] All 6 data types (transactions, budgets, goals, accounts, recurring transactions, categories) export successfully in CSV format
- [ ] All 6 data types export successfully in JSON format
- [ ] All 6 data types export successfully in Excel (.xlsx) format
- [ ] Excel files open correctly in Excel 2016+, Google Sheets, and Apple Numbers
- [ ] CSV files use UTF-8 BOM and load properly in Excel with international characters
- [ ] ExportHistory database model exists with migration applied successfully
- [ ] tRPC exports router with 6 individual export endpoints is functional
- [ ] AI context generator creates valid ai-context.json with field descriptions and prompts
- [ ] Export utilities are modular, reusable, and follow established patterns
- [ ] Manual testing validates all formats work across platforms

## MVP Scope

**In Scope (Iteration 14):**
- Fix Analytics export date range bug (CRITICAL PRIORITY)
- Backend export utilities (CSV extensions, Excel generator, AI context generator)
- ExportHistory database model and migration
- tRPC exports router with 6 data type endpoints (format: CSV/JSON/EXCEL)
- Install archiver dependency for ZIP generation (Iteration 15 will use it)
- Manual testing of all export formats across platforms
- Base64 transport for binary files (Excel) over tRPC

**Out of Scope (Deferred to Iterations 15-16):**
- Export Center UI (Settings > Data & Export page) - Iteration 15
- Complete ZIP export package with README and ai-context.json - Iteration 15
- Export history display and re-download functionality - Iteration 15
- Vercel Blob Storage caching - Iteration 15
- Context export buttons on individual pages - Iteration 16
- Mobile Web Share API integration - Iteration 16
- Cleanup cron job for expired exports - Iteration 15

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 10-12 hours (3-4 parallel builders)
4. **Integration** ⏳ 30 minutes
5. **Validation** ⏳ 1 hour (manual testing)
6. **Deployment** ⏳ N/A (backend only, no UI changes)

## Timeline Estimate

- Exploration: Complete (2 explorers)
- Planning: Complete (this document)
- Building: 10-12 hours total
  - Builder-1 (Bug Fix + CSV Extensions): 2-3 hours
  - Builder-2 (Excel Generator): 3-4 hours
  - Builder-3 (AI Context + Archive Prep): 3-4 hours
  - Builder-4 (tRPC Router + Database): 3-4 hours
  - Builders can work in parallel with minimal dependencies
- Integration: 30 minutes (verify all exports work together)
- Validation: 1 hour (manual testing CSV/JSON/Excel on multiple platforms)
- Total: ~12-14 hours (including testing)

## Risk Assessment

### High Risks

**Analytics Date Bug Root Cause Unknown**
- Risk: Bug may be deeper than timezone/date format issue (e.g., tRPC serialization, Prisma query optimization)
- Likelihood: MEDIUM (explorers identified likely cause as endOfMonth boundary condition)
- Impact: CRITICAL (blocks validation of entire export infrastructure)
- Mitigation:
  - Priority 0 - fix first before any other work
  - Time-box investigation to 2 hours maximum
  - Fallback: Remove date filtering temporarily, export all transactions
  - Add comprehensive logging to tRPC query to trace actual dates passed to Prisma
  - Test with various date ranges (current month, last 6 months, custom range)

**Large Dataset Export Performance**
- Risk: Exports may timeout for users with 10k+ transactions
- Likelihood: MEDIUM (10k limit exists but may be exceeded)
- Impact: MEDIUM (some users cannot export)
- Mitigation:
  - Start with in-memory generation (works for 80% of users)
  - Add timeout monitoring (log duration in tRPC)
  - Document limit: "Exports with >10k transactions may take 30s"
  - Defer streaming to Iteration 15 if profiling shows need

### Medium Risks

**Excel File Compatibility**
- Risk: Generated .xlsx files may not open correctly in all platforms
- Likelihood: LOW (xlsx library is mature)
- Impact: MEDIUM (user frustration, support tickets)
- Mitigation:
  - Test on Excel 2016+ (Windows/Mac), Google Sheets, Apple Numbers
  - Follow library best practices for workbook creation
  - Validate cell formatting (currency, dates)

**Database Migration Conflicts**
- Risk: ExportHistory migration may conflict with other schema changes
- Likelihood: LOW (single new table, no data migration)
- Impact: LOW (migration rollback, retry)
- Mitigation:
  - Review schema with other builders before migration
  - Test on dev database first
  - Coordinate migration timing

## Integration Strategy

All builders work on isolated modules with clear contracts:

**Builder 1 → Builder 4 Integration:**
- Builder-1 extends csvExport.ts with new generators
- Builder-4 imports and uses these in tRPC endpoints
- Contract: Same function signature pattern as existing generators

**Builder 2 → Builder 4 Integration:**
- Builder-2 creates xlsxExport.ts with Excel generators
- Builder-4 imports and uses in format switching logic
- Contract: Returns Buffer (not string), same interface as CSV

**Builder 3 → Iteration 15:**
- Builder-3 creates aiContextGenerator.ts and archiveExport.ts
- Iteration 15 builders will use these for ZIP packages
- Contract: Well-documented exports, tested with sample data

**Builder 4 Database:**
- Creates ExportHistory model
- No CRUD operations in Iteration 14 (just model creation)
- Iteration 15 will add caching logic using this model

**Integration Validation:**
1. All builders push code to feature branches
2. Integration builder pulls all branches
3. Runs manual test suite (export each data type in each format)
4. Validates cross-platform compatibility (Excel, Sheets, Numbers)
5. Merges to main after all tests pass

## Deployment Plan

**Iteration 14 Deployment:**
- Backend-only changes (no UI modifications)
- Database migration required: `npx prisma migrate deploy` in production
- No user-facing features yet (tRPC endpoints exist but no UI calls them)
- Zero downtime deployment (backward compatible)

**Post-Deployment Validation:**
1. Run database migration in production
2. Verify ExportHistory table exists
3. Test tRPC endpoints via API client (Postman/Insomnia)
4. Confirm no breaking changes to existing export functionality

**Rollback Plan:**
- Database migration can be rolled back if issues arise
- No UI changes means no user-facing impact
- New code paths are not called until Iteration 15 UI is deployed

## Technical Architecture

### Component Breakdown

**Export Utilities Layer (src/lib/):**
- csvExport.ts (extend with recurring, categories)
- xlsxExport.ts (new - Excel generator)
- aiContextGenerator.ts (new - AI metadata)
- archiveExport.ts (new - ZIP utility, used in Iteration 15)

**API Layer (src/server/api/):**
- routers/exports.router.ts (new - centralized export endpoints)
- Format switching logic (CSV/JSON/EXCEL)
- Base64 encoding for binary transport

**Database Layer (prisma/):**
- schema.prisma (add ExportHistory model)
- Migration: add-export-history

**Patterns:**
- Modular export utilities (one file per format)
- tRPC protected procedures with Zod validation
- Parallel data fetching with Promise.all()
- Decimal to number conversion for CSV/Excel
- UTF-8 BOM for CSV Excel compatibility

### Data Flow

```
User triggers export (Iteration 15 UI)
  ↓
tRPC exports.exportTransactions({ format: 'EXCEL', startDate, endDate })
  ↓
Prisma query: transactions.findMany(where: { userId, date: { gte, lte } })
  ↓
Format switch:
  - CSV: generateTransactionCSV() → string → base64
  - JSON: JSON.stringify() → string → base64
  - EXCEL: generateTransactionExcel() → Buffer → base64
  ↓
Return { content: base64, filename, mimeType, recordCount }
  ↓
Client decodes base64, downloads file
```

## Dependencies

**New Dependencies to Install:**
```bash
npm install archiver
npm install --save-dev @types/archiver
```

**Existing Dependencies (Already Installed):**
- xlsx@0.18.5 (Excel generation)
- date-fns@3.6.0 (date formatting)
- @trpc/server@11.6.0 (API layer)
- @prisma/client@5.22.0 (database ORM)
- zod@3.23.8 (input validation)

**Deferred to Iteration 15:**
- @vercel/blob (cloud storage for export caching)

## Quality Assurance

### Manual Testing Checklist

**Analytics Bug Fix:**
- [ ] Export transactions from Analytics page with "Last 30 Days"
- [ ] Export transactions with "Last 6 Months"
- [ ] Export transactions with "Last Year"
- [ ] Export transactions with custom date range
- [ ] Verify CSV contains expected transaction count

**CSV Exports (6 Data Types):**
- [ ] Export transactions as CSV, open in Excel
- [ ] Export budgets as CSV, open in Google Sheets
- [ ] Export goals as CSV, verify Progress % column
- [ ] Export accounts as CSV, verify Balance formatting
- [ ] Export recurring transactions as CSV, verify Frequency
- [ ] Export categories as CSV, verify Parent column

**JSON Exports (6 Data Types):**
- [ ] Export transactions as JSON, validate structure
- [ ] Export budgets as JSON, verify Decimal conversion
- [ ] Export goals as JSON, verify ISO 8601 dates
- [ ] Export accounts as JSON, verify no plaidAccessToken
- [ ] Export recurring transactions as JSON
- [ ] Export categories as JSON, verify hierarchy

**Excel Exports (6 Data Types):**
- [ ] Export transactions as Excel, open in Excel 2016+
- [ ] Export budgets as Excel, open in Google Sheets
- [ ] Export goals as Excel, verify number formatting
- [ ] Export accounts as Excel, open in Apple Numbers
- [ ] Export recurring transactions as Excel
- [ ] Export categories as Excel

**Error Handling:**
- [ ] Export with no data, verify empty CSV with headers
- [ ] Export with invalid date range (end < start)
- [ ] Export during database connection failure

### Performance Testing

**Target Metrics:**
- 1k transactions: < 3 seconds
- 10k transactions: < 10 seconds
- Complete export (all 6 types): < 15 seconds

**Monitoring:**
- Add timing logs to tRPC export procedures
- Track file sizes and record counts
- Identify slow queries for optimization

## Builder Coordination

### Communication Protocol

**Before Starting:**
- Builders announce start in team channel
- Claim specific tasks from builder-tasks.md
- Review dependencies on other builders

**During Development:**
- Push code to feature/iteration-14-builder-X branches
- Update shared patterns.md if new patterns emerge
- Flag blockers immediately in team channel

**Code Review:**
- Peer review between builders before integration
- Integration builder validates cross-builder contracts
- Planner approves final merge to main

### Conflict Prevention

**Shared Files:**
- csvExport.ts: Builder-1 extends, others import only
- schema.prisma: Builder-4 modifies, others review
- root.ts: Builder-4 adds router, minimal conflict risk

**Independent Files:**
- xlsxExport.ts: Builder-2 exclusive
- aiContextGenerator.ts: Builder-3 exclusive
- archiveExport.ts: Builder-3 exclusive
- exports.router.ts: Builder-4 exclusive

## Next Steps

1. Review this plan with all builders
2. Assign builders to tasks (see builder-tasks.md)
3. Builders read tech-stack.md and patterns.md
4. Builder-1 starts with Priority 0 bug fix
5. Other builders can start in parallel once bug is confirmed fixed
6. Integration phase after all builders complete
7. Manual testing phase
8. Deploy to production (database migration)

---

**Plan Status:** ✅ COMPLETE
**Ready for:** Builder Execution
**Estimated Duration:** 10-12 hours
**Risk Level:** MEDIUM (Analytics bug, performance)
