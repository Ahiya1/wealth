# 2L Iteration Plan - Wealth AI Financial Assistant (Iteration 22)

## Project Vision

Build file upload and transaction import capabilities into the Wealth AI assistant, allowing users to upload bank statements (PDF, CSV, Excel) and have transactions automatically extracted, deduplicated, categorized, and imported into their accounts.

## Success Criteria

- [ ] User can drag-drop bank statement PDF into chat interface
- [ ] AI extracts transactions from PDF using Claude Vision with >90% accuracy
- [ ] Duplicate detection identifies existing transactions using three-factor fuzzy matching
- [ ] TransactionPreview shows status badges: NEW (26), DUPLICATE (6), UNCERTAIN (3)
- [ ] User can review and confirm parsed transactions before batch import
- [ ] Transactions auto-categorize using existing MerchantCategoryCache (>60% cache hit rate)
- [ ] CSV and Excel files parse correctly with column auto-detection
- [ ] File validation works (10MB PDF, 5MB CSV/Excel limits)
- [ ] All write operations require user confirmation (>5 transactions)
- [ ] Markdown rendering works in AI responses (lists, tables, code blocks)

## MVP Scope

**In Scope:**

- File upload component (FileUploadZone) with drag-drop and file picker
- PDF parsing via Claude Vision (base64 document type)
- CSV/Excel parsing via xlsx library (already installed)
- Duplicate detection extension (comparison mode with confidence scores)
- 4 write tools: create_transaction, create_transactions_batch, update_transaction, categorize_transactions
- TransactionPreview component with status badges (NEW, DUPLICATE, UNCERTAIN)
- ConfirmationDialog for batch operations
- Markdown rendering (react-markdown + remark-gfm)
- File size validation and error handling
- Integration with existing categorization service

**Out of Scope (Post-MVP):**

- Vercel Blob storage (using base64 in-memory for now)
- Multi-account import (single account per upload)
- Manual column mapping UI (using auto-detection)
- Transaction editing in preview (confirmation only)
- Image support in markdown rendering (security concern)
- Credit card bill resolution (Iteration 23)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 12-16 hours (3 parallel builders)
4. **Integration** - 45 minutes
5. **Validation** - 30 minutes
6. **Deployment** - 15 minutes

## Timeline Estimate

- Exploration: Complete (2 reports synthesized)
- Planning: Complete (this document)
- Building: 12-16 hours
  - Builder-1: 4-5 hours (File parsing + duplicate detection)
  - Builder-2: 6-7 hours (Write tools + streaming route updates)
  - Builder-3: 5-6 hours (Frontend components)
- Integration: 45 minutes (connect all pieces)
- Validation: 30 minutes (end-to-end testing)
- Total: ~18-22 hours

## Risk Assessment

### High Risks

**PDF Parsing Accuracy for Israeli Banks**
- Risk: Hebrew text, RTL direction, varied layouts may cause parsing errors
- Mitigation: Always show preview before import, provide bank hints, allow CSV fallback
- Validation: Test with real FIBI, Leumi, Hapoalim statements

**Confirmation Flow Complexity**
- Risk: Blocking stream during user confirmation could cause UX issues
- Mitigation: Implement 60-second timeout, clear "Waiting..." indicator, store pending tool in DB
- Validation: Test timeout scenarios, connection drops during confirmation

### Medium Risks

**Duplicate Detection False Positives**
- Risk: Recurring transactions (same merchant, same amount) marked as duplicate
- Mitigation: Show confidence scores, allow manual override (future), use reference numbers when available
- Validation: Test with monthly subscriptions, recurring bills

**Large Batch Performance**
- Risk: Importing 100 transactions could take >10 seconds
- Mitigation: Limit to 100 per batch, show progress indicator, use atomic DB transactions
- Validation: Benchmark 100-transaction import, target <5 seconds

### Low Risks

**File Size Limits**
- Risk: Users may have 6-12 month statements exceeding 10MB
- Mitigation: Clear error messages, suggest splitting by month, CSV alternative
- Validation: Test with large files, verify error messages

## Integration Strategy

### Builder Output Integration

**Builder-1 (File Parsing):**
- Exports: `parseFile()`, `parseBankStatementPDF()`, `parseCSV()`, `parseExcel()`
- Exports: Extended `compareTransactionBatch()`, `ComparisonResult` type
- Consumed by: Builder-2 (write tools)

**Builder-2 (Write Tools):**
- Exports: Tool definitions in `chat-tools.service.ts`
- Exports: Updated `/api/chat/stream` route with confirmation flow
- Consumed by: Builder-3 (frontend components call via API)

**Builder-3 (Frontend Components):**
- Exports: FileUploadZone, TransactionPreview, ConfirmationDialog, MarkdownRenderer
- Consumes: Builder-2 API endpoints
- Integration point: ChatInput component

### Shared Files Coordination

**duplicate-detection.service.ts:**
- Builder-1 extends with comparison functions
- Existing `isDuplicate()` remains unchanged (backward compatibility)

**chat-tools.service.ts:**
- Builder-2 adds 4 new tool definitions
- Existing read-only tools remain unchanged

**ChatInput.tsx:**
- Builder-3 integrates FileUploadZone
- Maintains existing message sending logic

### Conflict Prevention

- Builder-1 works in `src/lib/` (new fileParser.service.ts + extends duplicate-detection)
- Builder-2 works in `src/server/services/` and `src/app/api/`
- Builder-3 works in `src/components/chat/`
- No overlapping files except integration points (ChatInput.tsx - handled in integration phase)

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All 3 builders complete and tested
- [ ] Integration tests pass (end-to-end file upload flow)
- [ ] File size limits validated (10MB PDF, 5MB CSV/Excel)
- [ ] Duplicate detection tested with real data
- [ ] Categorization cache hit rate >60%
- [ ] Markdown rendering works in dark mode
- [ ] Error handling for all edge cases

### Deployment Steps

1. Install dependencies: `npm install react-markdown remark-gfm`
2. Run database migration (if any schema changes)
3. Deploy to Vercel staging environment
4. Test with real bank statements (FIBI, Leumi)
5. Monitor Claude API costs (target <$0.10 per import)
6. Deploy to production

### Rollback Plan

- Feature flag: `WEALTH_AI_ENABLED` (can disable if issues arise)
- Database migrations are additive (no data loss risk)
- Revert to previous deployment via Vercel rollback
- File parsing issues: Suggest CSV export as fallback

### Monitoring

- Track Claude API costs per import operation
- Monitor duplicate detection accuracy (false positive rate)
- Track categorization cache hit rate
- Log parsing failures for Israeli bank statements
- Monitor file upload success/failure rate
