# Builder Task Breakdown - Iteration 22

## Overview

3 primary builders will work in parallel on file import and transaction creation features.

**Estimated total:** 18-22 hours across 3 builders

**Builder Assignment Strategy:**
- Builders work on isolated layers (lib, server, components)
- Minimal file overlap (only integration points)
- Builder-2 depends on Builder-1 exports (sequential within Builder-2)
- Builder-3 works independently until integration phase

---

## Builder-1: File Parsing & Duplicate Detection Extension

### Scope

Create file parsing service for PDF, CSV, and Excel formats, and extend duplicate detection service to support import comparison with confidence scoring.

### Complexity Estimate

**MEDIUM**

**Rationale:**
- PDF parsing via Claude Vision is straightforward (Messages API)
- CSV/Excel parsing uses existing xlsx library (proven pattern)
- Duplicate detection extension is additive (no breaking changes)
- Well-defined inputs and outputs

### Success Criteria

- [ ] PDF parsing extracts transactions with >90% accuracy (tested with real FIBI/Leumi statements)
- [ ] CSV/Excel parsing handles Hebrew and English headers
- [ ] File validation enforces size limits (10MB PDF, 5MB CSV/Excel)
- [ ] Duplicate detection returns ComparisonResult with match type and confidence
- [ ] All parsing functions have error handling with user-friendly messages
- [ ] Unit tests cover parsing logic (80% coverage)

### Files to Create

- `src/lib/fileParser.service.ts` (350-400 lines) - Main parsing service
  - `parseFile()` - Entry point (routes to PDF/CSV/Excel)
  - `parseBankStatementPDF()` - Claude Vision integration
  - `parseCSV()` - CSV parsing with column detection
  - `parseExcel()` - Excel parsing (same as CSV via xlsx)
  - `validateParsedTransaction()` - Transaction validation
  - Helper functions: `mapCSVRowToTransaction()`, `parseIsraeliDate()`, `parseDate()`, `parseAmount()`, `findTransactionSheet()`

### Files to Modify

- `src/lib/services/duplicate-detection.service.ts` (extend from 117 lines to ~250 lines)
  - Add: `MatchType` enum (EXACT, PROBABLE, POSSIBLE, NEW)
  - Add: `ComparisonResult` interface
  - Add: `compareTransactionBatch()` function
  - Add: `compareTransaction()` function
  - Add: `evaluateMatch()` helper function
  - Add: `getMerchantSimilarity()` wrapper function
  - Keep: Existing `isDuplicate()`, `isMerchantSimilar()`, `normalizeMerchant()` unchanged

### Dependencies

**Depends on:** None (uses existing libraries)

**Blocks:** Builder-2 (write tools need parsing and comparison functions)

### Implementation Notes

**PDF Parsing:**
- Use Claude Sonnet 4.5 model (`claude-sonnet-4-5-20250514`)
- Set `max_tokens: 8192` for large statements
- Set `temperature: 0.1` for consistent extraction
- Extract JSON with regex (handles markdown code blocks)
- Always return YYYY-MM-DD date format
- Negative amounts for expenses, positive for income

**CSV/Excel Parsing:**
- xlsx library already installed (devDependencies)
- Use `XLSX.read(bytes, { type: 'array' })` for both CSV and Excel
- Support multiple header formats:
  - Hebrew: תאריך, סכום, תיאור
  - English: Date, Amount, Description
  - No headers: Column indices (0, 1, 2)
- Handle date formats: DD/MM/YYYY, DD.MM.YYYY, ISO 8601
- Remove currency symbols: ₪, $, €, £
- Handle negative notation: (100) → -100

**Duplicate Detection:**
- Extend existing service (don't break backward compatibility)
- Three-factor matching: date (±1 day), amount (±0.01), merchant (70% similarity)
- Confidence scoring:
  - EXACT: 100% (all factors exact match)
  - PROBABLE: 85-100% (all factors match with tolerance)
  - POSSIBLE: 60-85% (2 of 3 factors match)
  - NEW: 0% (no match)
- Optimization: Date range pre-filtering (±7 days window)

**Error Handling:**
- File too large: "File too large. PDF files must be less than 10MB."
- Empty file: "No data found in CSV"
- Invalid format: "Unrecognized CSV format. Please use a standard bank export."
- Parsing error: "Failed to extract transactions. Try exporting as CSV."

### Patterns to Follow

Reference `patterns.md`:
- **PDF Parsing Pattern:** Lines 25-120 (parseBankStatementPDF)
- **CSV/Excel Parsing Pattern:** Lines 130-230 (parseCSV, parseExcel)
- **Duplicate Detection Extension:** Lines 250-350 (compareTransactionBatch)
- **Error Handling Pattern:** Lines 850-880

### Testing Requirements

Unit tests (vitest):
- `parseCSV()` with English headers
- `parseCSV()` with Hebrew headers (FIBI format)
- `parseExcel()` with multiple sheets
- `validateParsedTransaction()` edge cases (invalid dates, amounts)
- `parseIsraeliDate()` with DD/MM/YYYY and DD.MM.YYYY
- `parseAmount()` with various currency symbols
- `compareTransaction()` with EXACT, PROBABLE, POSSIBLE, NEW matches
- `evaluateMatch()` confidence scoring

Target: 80% code coverage

### Potential Split Strategy

Not recommended. This builder is MEDIUM complexity and well-scoped.

If time pressure is severe, could split:
- **Builder-1A:** PDF parsing only
- **Builder-1B:** CSV/Excel parsing + duplicate detection extension

But this adds integration overhead. Better to keep as single builder.

---

## Builder-2: Write Tools & Streaming Route Updates

### Scope

Add 4 write tools to chat-tools.service.ts, update streaming route to handle user confirmation flow, and integrate with existing categorization service.

### Complexity Estimate

**MEDIUM-HIGH**

**Rationale:**
- 4 new tool definitions with comprehensive schemas
- Confirmation flow adds state management complexity
- Integration with multiple existing services (tRPC, categorization, duplicate detection)
- Atomic database transactions required
- Security considerations (rate limiting, validation)

### Success Criteria

- [ ] All 4 write tools execute successfully via chat interface
- [ ] Batch operations >5 transactions require user confirmation
- [ ] Duplicate detection runs before batch import
- [ ] Auto-categorization leverages MerchantCategoryCache (>60% cache hit)
- [ ] Confirmation timeout works (60 seconds)
- [ ] Rate limiting enforces 20 write operations per hour
- [ ] All tools return serialized results for Claude
- [ ] Integration tests pass for all tools

### Files to Create

None (all modifications)

### Files to Modify

- `src/server/services/chat-tools.service.ts` (extend from ~400 lines to ~900 lines)
  - Add: `create_transaction` tool definition and executor
  - Add: `create_transactions_batch` tool definition and executor
  - Add: `update_transaction` tool definition and executor
  - Add: `categorize_transactions` tool definition and executor
  - Add: Helper functions for transaction serialization

- `src/app/api/chat/stream/route.ts` (extend from ~200 lines to ~350 lines)
  - Add: Confirmation detection logic
  - Add: Blocking wait for user confirmation (simplified approach)
  - Add: Timeout handling (60 seconds)
  - Add: Preview data generation for TransactionPreview
  - Modify: Tool execution flow to handle confirmation

### Dependencies

**Depends on:** Builder-1 (parsing and comparison functions)

**Blocks:** Builder-3 (frontend components call these APIs)

### Implementation Notes

**Tool 1: create_transaction**
- Single transaction creation
- Calls existing `transactionsRouter.create()`
- Validates account ownership (tRPC context)
- Updates account balance atomically
- Returns: `{ success, transaction }` with serialized data

**Tool 2: create_transactions_batch**
- Bulk import (max 100 transactions)
- Requires confirmation if count > 5
- Runs duplicate detection before creating
- Auto-categorizes using `categorizeTransactions()` service
- Skips duplicates, tracks created/skipped/categorized counts
- Atomic operation (all or nothing via `prisma.$transaction`)
- Returns: `{ success, created, skipped, categorized, transactions }`

**Tool 3: update_transaction**
- Modify existing transaction
- Validates transaction ownership
- Adjusts account balance if amount changes
- Atomic operation (update + balance adjustment)
- Returns: `{ success, transaction }`

**Tool 4: categorize_transactions**
- Bulk re-categorization (max 50)
- Uses existing `categorizeTransactions()` service
- Leverages MerchantCategoryCache (60-80% cache hit)
- Updates `categorizedBy` field (AI_CACHED or AI_SUGGESTED)
- Returns: `{ success, total, categorized, results }`

**Confirmation Flow (Simplified Blocking Approach):**
1. Tool use event received from Claude
2. Check if tool requires confirmation (write tool OR batch >5)
3. If yes:
   - Send preview data to client via SSE
   - Block stream (wait for confirmation)
   - Store pending tool in ChatMessage.toolCalls
   - Set 60-second timeout
4. Client displays TransactionPreview and user confirms/cancels
5. Client sends confirmation via separate POST endpoint
6. Stream resumes with tool execution or cancellation

**Rate Limiting:**
- Add separate bucket for write operations: 20 per hour
- Check before tool execution
- Return error if limit exceeded: "Write operation rate limit exceeded. Please try again later."

**Security:**
- All tools validate account/transaction ownership via tRPC
- Batch size limits enforced in schema (max 100 for batch, max 50 for categorize)
- Amount validation: must be non-zero, numeric
- Date validation: ISO 8601 format required
- Payee validation: max length 200 characters

### Patterns to Follow

Reference `patterns.md`:
- **Tool Definition Template:** Lines 380-400
- **create_transaction Tool:** Lines 410-450
- **create_transactions_batch Tool:** Lines 460-550
- **Error Handling Pattern:** Lines 850-880
- **Performance Patterns:** Lines 920-960

### Testing Requirements

Integration tests:
- `create_transaction` with valid input
- `create_transaction` with unauthorized account (should throw)
- `create_transactions_batch` with <5 transactions (no confirmation)
- `create_transactions_batch` with >5 transactions (requires confirmation)
- `create_transactions_batch` with duplicates (should skip)
- `update_transaction` with amount change (balance adjustment)
- `categorize_transactions` with cache hits (fast)
- `categorize_transactions` with cache misses (calls Claude)
- Confirmation timeout scenario (60 seconds)
- Rate limiting enforcement (21st write in 1 hour)

Target: 75% code coverage for new code

### Potential Split Strategy

If complexity is too high, consider splitting:

**Foundation (Builder-2 keeps):**
- Create chat-tools.service.ts extensions
- Add all 4 tool definitions
- Add basic executors (without confirmation flow)
- Estimate: MEDIUM

**Sub-builder 2A: Confirmation Flow**
- Update streaming route
- Add blocking confirmation logic
- Add timeout handling
- Add preview data generation
- Estimate: MEDIUM

This split makes sense if Builder-2 is overwhelmed. The tool executors can work without confirmation in testing, then 2A adds the UX layer.

---

## Builder-3: Frontend Components

### Scope

Create 4 new chat components: FileUploadZone (drag-drop file upload), TransactionPreview (parsed transaction display), ConfirmationDialog (generic confirmation wrapper), and MarkdownRenderer (rich text formatting for AI responses).

### Complexity Estimate

**MEDIUM**

**Rationale:**
- 4 independent components with clear interfaces
- UI patterns already established (Radix UI, Tailwind)
- No complex state management (props-driven)
- Well-defined visual designs from exploration reports

### Success Criteria

- [ ] FileUploadZone accepts drag-drop and file picker input
- [ ] File validation works (type and size limits)
- [ ] Base64 encoding works for all file types
- [ ] TransactionPreview displays all 3 status types (NEW, DUPLICATE, UNCERTAIN)
- [ ] Status badges are visually distinct
- [ ] Scrollable list works for 100+ transactions
- [ ] ConfirmationDialog shows clear actions (Confirm/Cancel)
- [ ] MarkdownRenderer supports lists, tables, code blocks
- [ ] Dark mode works for all components
- [ ] Mobile responsive (tested on 375px width)

### Files to Create

- `src/components/chat/FileUploadZone.tsx` (200 lines)
  - Drag-drop area with visual feedback
  - File picker fallback
  - File validation (type, size)
  - Base64 encoding utility (`fileToBase64`)
  - Error display
  - Selected file preview with remove button

- `src/components/chat/TransactionPreview.tsx` (250 lines)
  - Summary badges (NEW, DUPLICATE, UNCERTAIN counts)
  - Scrollable transaction list (max-h-96)
  - Status icons (CheckCircle, XCircle, AlertCircle)
  - Category badges with color coding
  - Amount display with color (negative=gray, positive=green)
  - Confidence indicators for low-confidence categorizations
  - Confirm/Cancel buttons with disabled states

- `src/components/chat/ConfirmationDialog.tsx` (100 lines)
  - Generic AlertDialog wrapper
  - Customizable title, description, buttons
  - Loading state support
  - Variant support (default, destructive)
  - Async onConfirm handler

- `src/components/chat/MarkdownRenderer.tsx` (150 lines)
  - ReactMarkdown integration with remark-gfm
  - Custom component overrides for styling
  - Support for: headings, lists, code, tables, links, blockquotes
  - Dark mode styling
  - Compact spacing for chat context
  - Security: HTML stripping (default behavior)

### Files to Modify

- `src/components/chat/ChatInput.tsx` (add FileUploadZone integration)
  - Add file upload state
  - Integrate FileUploadZone above input
  - Handle file upload in message submission
  - Show loading state during parsing

- `src/components/chat/ChatMessage.tsx` (add MarkdownRenderer)
  - Replace plain text with MarkdownRenderer for assistant messages
  - Keep plain text for user messages
  - Pass className for consistent styling

### Dependencies

**Depends on:** Builder-2 (API endpoints for file upload and confirmation)

**Blocks:** None (last builder in sequence)

### Implementation Notes

**FileUploadZone:**
- Use Radix UI primitives (not needed, native HTML works)
- Drag-drop events: `onDrop`, `onDragOver`, `onDragLeave`
- Visual states: isDragging (border-sage-500), normal (border-warm-gray-300)
- Hidden file input: `<input type="file" className="hidden" />`
- Click handler: Trigger file input click
- FileReader API for base64 encoding
- Extract base64 data (remove `data:application/pdf;base64,` prefix)

**TransactionPreview:**
- Use Radix UI Card component
- Map status to icon: new→CheckCircle, duplicate→XCircle, uncertain→AlertCircle
- Color coding:
  - NEW: text-sage-600
  - DUPLICATE: opacity-50, text-warm-gray-400
  - UNCERTAIN: border-orange-300
- Scrollable: `max-h-96 overflow-y-auto`
- Disable import button if `summary.new === 0`
- Show processing state: "Importing..." with disabled buttons

**ConfirmationDialog:**
- Wrapper around Radix UI AlertDialog
- Props: open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, variant, loading
- Async handler: `await onConfirm()` then close
- Disabled state: Both buttons disabled while loading
- Variant: default (sage button) or destructive (red button)

**MarkdownRenderer:**
- Install dependencies: `npm install react-markdown remark-gfm`
- Use `remarkPlugins={[remarkGfm]}` for GitHub features
- Component overrides for Tailwind styling
- Inline code: `bg-warm-gray-100`, `rounded`, `px-1.5 py-0.5`
- Block code: `block`, `p-3`, `rounded-lg`, `overflow-x-auto`
- Tables: Wrap in `<div className="overflow-x-auto">`
- Links: `target="_blank"`, `rel="noopener noreferrer"`

**ChatInput Integration:**
- Add state: `const [uploadedFile, setUploadedFile] = useState<{ file: File; base64: string } | null>(null)`
- Render FileUploadZone above textarea
- On file upload: Store file and base64 in state
- On message submit: Include file data in API request
- Clear file state after successful upload

**ChatMessage Integration:**
- Conditional rendering:
  ```tsx
  {isUser ? (
    <div>{message.content}</div>
  ) : (
    <MarkdownRenderer content={message.content} />
  )}
  ```

### Patterns to Follow

Reference `patterns.md`:
- **FileUploadZone Pattern:** Lines 600-700
- **TransactionPreview Pattern:** Lines 720-820
- **MarkdownRenderer Pattern:** Lines 980-1080
- **Import Order Convention:** Lines 1100-1120
- **Error Handling Pattern:** Lines 1150-1180

### Testing Requirements

Manual testing (visual QA):
- Drag-drop file upload (PDF, CSV, Excel)
- File validation errors (too large, wrong type)
- TransactionPreview with 50+ transactions (scrolling)
- All 3 status types visible (NEW, DUPLICATE, UNCERTAIN)
- Dark mode for all components
- Mobile responsive (375px width)
- Markdown rendering (lists, tables, code blocks, links)
- ConfirmationDialog with loading state

Component tests (optional, if time permits):
- FileUploadZone: File selection triggers onFileUpload
- TransactionPreview: Confirm button disabled when all duplicates
- MarkdownRenderer: Renders bold, italic, code correctly

### Potential Split Strategy

Not recommended. This builder is MEDIUM complexity with clear component boundaries.

If needed, could split:
- **Builder-3A:** FileUploadZone + TransactionPreview
- **Builder-3B:** ConfirmationDialog + MarkdownRenderer + ChatInput/ChatMessage integration

But better to keep as single builder for consistency.

---

## Builder Execution Order

### Parallel Group 1 (No dependencies)

**Start immediately:**
- Builder-1: File Parsing & Duplicate Detection Extension
- Builder-3: Frontend Components (can work independently)

### Sequential (Depends on Group 1)

**Start after Builder-1 completes:**
- Builder-2: Write Tools & Streaming Route Updates (needs Builder-1 exports)

**Rationale:** Builder-2 imports `parseFile()` and `compareTransactionBatch()` from Builder-1. Must wait for those exports to be ready.

### Integration Order

1. Builder-1 finishes → Export parsing and comparison functions
2. Builder-2 starts → Uses Builder-1 exports, creates write tools
3. Builder-3 finishes → Frontend components ready
4. Builder-2 finishes → API endpoints ready
5. **Integration Phase** (45 minutes):
   - Integrate FileUploadZone into ChatInput
   - Integrate MarkdownRenderer into ChatMessage
   - Test end-to-end file upload flow
   - Test confirmation flow with TransactionPreview
   - Verify markdown rendering in chat

---

## Integration Notes

### Shared Files

**duplicate-detection.service.ts:**
- Builder-1 extends this file
- MUST keep existing exports unchanged (backward compatibility)
- New exports: MatchType, ComparisonResult, compareTransactionBatch, compareTransaction

**chat-tools.service.ts:**
- Builder-2 extends this file
- Add 4 new tool definitions to existing array
- Keep existing read-only tools unchanged

**ChatInput.tsx:**
- Builder-3 integrates FileUploadZone
- Add file upload state and handlers
- Maintain existing message submission logic

**ChatMessage.tsx:**
- Builder-3 integrates MarkdownRenderer
- Conditional rendering (user=plain text, assistant=markdown)
- Maintain existing streaming indicator logic

### Potential Conflict Areas

**chat-tools.service.ts:**
- If Builder-2 starts before Builder-1 finishes, imports will fail
- **Solution:** Builder-2 MUST wait for Builder-1 completion

**ChatInput.tsx:**
- Integration happens AFTER Builder-3 finishes
- **Solution:** Builder-3 creates FileUploadZone as standalone, integration in final phase

### Success Metrics

**Builder-1:**
- All parsing functions return ParsedTransaction[]
- Duplicate detection returns ComparisonResult[]
- Unit tests pass (80% coverage)

**Builder-2:**
- All 4 tools available in chat interface
- Confirmation flow works end-to-end
- Rate limiting enforced
- Integration tests pass (75% coverage)

**Builder-3:**
- All 4 components render correctly
- Dark mode works
- Mobile responsive
- Markdown renders correctly

**Integration:**
- User can upload PDF → AI parses → TransactionPreview displays → User confirms → Transactions imported
- End-to-end time: <30 seconds for 50-transaction PDF
- Success rate: >90% for standard bank statements

---

## Risk Mitigation

### Risk: Builder-2 blocked by Builder-1 delay

**Impact:** High (Builder-2 cannot start until Builder-1 exports ready)

**Mitigation:**
- Builder-1 is MEDIUM complexity (should complete in 4-5 hours)
- Builder-3 works in parallel (reduces overall timeline)
- If Builder-1 delayed: Builder-2 can create tool definitions first, executors later

### Risk: Confirmation flow complexity

**Impact:** Medium (could take longer than estimated)

**Mitigation:**
- Use simplified blocking approach (not two-phase streaming)
- 60-second timeout prevents indefinite blocking
- Store pending tool in database (recover from connection drops)
- Clear error messages for timeout scenarios

### Risk: PDF parsing accuracy for Israeli banks

**Impact:** Medium (affects user trust if accuracy <90%)

**Mitigation:**
- Always show preview before import
- Allow manual review and cancellation
- Suggest CSV fallback if parsing fails
- Log failures for analysis and improvement

### Risk: Mobile UX for file upload

**Impact:** Low (most users upload from desktop)

**Mitigation:**
- File upload works on mobile (native file picker)
- TransactionPreview scrolls correctly on small screens
- Test on 375px width (iPhone SE)

---

## Post-Integration Checklist

- [ ] All builders complete and merged
- [ ] No TypeScript errors in codebase
- [ ] All unit tests pass (npm test)
- [ ] End-to-end file upload flow works (PDF, CSV, Excel)
- [ ] Duplicate detection identifies existing transactions
- [ ] Categorization cache hit rate >60%
- [ ] Confirmation dialog appears for batch >5
- [ ] Markdown rendering works in chat messages
- [ ] Dark mode works for all new components
- [ ] Mobile responsive (tested on 375px width)
- [ ] Rate limiting enforced (20 write ops/hour)
- [ ] File size limits enforced (10MB PDF, 5MB CSV/Excel)
- [ ] Error messages are user-friendly
- [ ] No console errors in browser
- [ ] Performance targets met (<15s PDF parsing, <3s batch import)

---

This breakdown provides clear, non-overlapping responsibilities for 3 builders with explicit dependencies and integration points.
