# Technology Stack - Iteration 22

## Core Framework

**Decision:** Next.js 14.2.33 (App Router)

**Rationale:**
- Already established in codebase (maintains consistency)
- Server-Sent Events via Route Handlers for streaming
- API routes support both streaming and standard responses
- Built-in TypeScript support for type-safe development

**Alternatives Considered:**
- None (framework already established in Iteration 21)

---

## PDF Parsing

**Decision:** Anthropic Messages API with Claude Vision (base64 document type)

**Rationale:**
- No external PDF parsing library needed (reduces dependencies)
- Anthropic SDK already installed (@anthropic-ai/sdk: 0.32.1)
- Claude Vision handles complex layouts, tables, Hebrew text
- Proven accuracy for document analysis tasks
- Single API for both parsing and conversation

**Implementation:**
```typescript
const message = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 8192,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64String,
          },
        },
        { type: 'text', text: 'Extract all transactions...' },
      ],
    },
  ],
})
```

**Alternatives Considered:**
- pdfjs-dist: Complex setup, requires external worker files
- pdf-parse: Text-only extraction, poor table handling
- External OCR service: Additional API costs, latency

**File Size Limits:**
- PDF: 10MB (Claude API limit, covers 99% of monthly statements)
- Recommendation for large files: Split by month or use CSV export

---

## CSV & Excel Parsing

**Decision:** xlsx library 0.18.5 (already installed as devDependency)

**Rationale:**
- Already installed and used in xlsxExport.ts (proven in production)
- Handles both CSV and Excel formats (.xlsx, .xls)
- Fast, synchronous parsing
- No additional dependencies needed
- Zero-config for basic use cases

**Implementation:**
```typescript
import * as XLSX from 'xlsx'

const workbook = XLSX.read(bytes, { type: 'array' })
const worksheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<any>(worksheet)
```

**Column Mapping Strategy:**
- Auto-detection using regex patterns (Hebrew + English headers)
- Fallback to Claude for complex formats
- Supports: FIBI, Leumi, Hapoalim, Discount export formats

**Alternatives Considered:**
- papaparse (CSV only): Doesn't handle Excel
- csv-parser: Stream-based (unnecessary complexity for small files)

---

## Duplicate Detection

**Decision:** Extend existing duplicate-detection.service.ts with comparison mode

**Rationale:**
- Three-factor matching already proven (date ±1 day, amount exact, merchant 70% similarity)
- string-similarity library already installed (4.0.4)
- Extending service maintains backward compatibility
- No new dependencies needed

**Schema:**
```typescript
export enum MatchType {
  EXACT = 'EXACT',         // 100% match (all 3 factors exact)
  PROBABLE = 'PROBABLE',   // 85-100% confidence (fuzzy match)
  POSSIBLE = 'POSSIBLE',   // 60-85% confidence (2 of 3 factors)
  NEW = 'NEW',             // 0% confidence (no match)
}

export interface ComparisonResult {
  importedTransaction: DuplicateCheckParams
  matchType: MatchType
  confidence: number // 0-100
  matchedTransaction?: DuplicateCheckParams
  matchedTransactionId?: string
  details: {
    dateMatch: boolean
    amountMatch: boolean
    merchantMatch: boolean
    merchantSimilarity?: number
  }
}
```

**Performance Optimization:**
- Date range pre-filtering (±7 days window)
- Amount bucketing (reduce comparisons by 90%)
- Database query limited to relevant date range

---

## Write Tools

**Decision:** 4 new tools in chat-tools.service.ts using existing tRPC mutations

**Rationale:**
- Leverage existing transactionsRouter.create() and update() (battle-tested)
- No duplication of business logic
- Security already handled (account ownership, validation)
- Atomic database transactions already implemented

**Tools:**
1. **create_transaction** - Single transaction creation
2. **create_transactions_batch** - Bulk import (max 100, requires confirmation >5)
3. **update_transaction** - Modify existing transaction
4. **categorize_transactions** - Bulk re-categorization (max 50)

**Security:**
- Rate limiting: 20 write operations per hour (separate from 100 read ops/hour)
- Account ownership validated via tRPC context
- Batch size limits enforced in schema
- User confirmation required for batches >5 transactions

**Data Flow:**
```
User uploads file → FileUploadZone → API /api/chat/stream
→ parse_file tool → Claude Vision extracts transactions
→ compare_with_existing tool → Duplicate detection
→ TransactionPreview displays → User confirms
→ create_transactions_batch executes → Success response
```

---

## Auto-Categorization

**Decision:** Reuse existing categorize.service.ts with MerchantCategoryCache

**Rationale:**
- Already proven in production (Iteration 21)
- 60-80% cache hit rate reduces API calls
- Claude API batching (50 transactions at once)
- Automatic caching of new merchant-category mappings

**Implementation:**
```typescript
// In create_transactions_batch tool
const categorized = await categorizeTransactions(
  userId,
  transactions.map(t => ({ id: t.id, payee: t.payee, amount: t.amount })),
  prisma
)

// Updates MerchantCategoryCache for future imports
```

**Expected Performance:**
- Cache hit: <10ms per transaction
- Cache miss: ~100ms per transaction (Claude API call)
- Batch of 50 transactions: <2 seconds total

---

## Frontend Components

**Decision:** Radix UI primitives + custom chat components

**UI Component Library:** Radix UI (already installed)
- AlertDialog for confirmations
- Card, Badge for transaction preview
- Progress for upload/processing indicators

**Styling:** Tailwind CSS 3.4.1 with existing design system
- sage-* colors for success states (NEW transactions)
- warm-gray-* colors for neutral states (DUPLICATE)
- orange-* colors for warning states (UNCERTAIN categorization)

**Key Components:**
1. **FileUploadZone** - Drag-drop + file picker (200 lines)
2. **TransactionPreview** - Scrollable list with badges (250 lines)
3. **ConfirmationDialog** - Generic confirmation wrapper (100 lines)
4. **MarkdownRenderer** - react-markdown integration (150 lines)

**Rationale:**
- Radix UI provides accessible, headless components
- Existing design system ensures consistency
- Motion animations via framer-motion (already installed)

---

## Markdown Rendering

**Decision:** react-markdown 9.0.0 + remark-gfm 4.0.0

**Rationale:**
- Industry standard for markdown rendering in React
- GitHub Flavored Markdown support (tables, task lists)
- Safe by default (escapes HTML, prevents XSS)
- Customizable component overrides for styling

**Installation:**
```bash
npm install react-markdown remark-gfm
```

**Implementation:**
```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {message.content}
</ReactMarkdown>
```

**Features Supported:**
- Bold, italic, inline code
- Code blocks with syntax highlighting context
- Bulleted and numbered lists
- Tables (GitHub style)
- Blockquotes
- Links (open in new tab)

**Security:**
- HTML tags stripped by default
- `dangerouslySetInnerHTML` never used
- Only render markdown for assistant messages (not user messages)

**Alternatives Considered:**
- marked: Lower-level, requires more security handling
- markdown-it: More complex API
- Custom parser: Unnecessary reinvention

---

## File Storage

**Decision:** Base64 in-memory (no blob storage for MVP)

**Rationale:**
- Simpler implementation for Iteration 22
- No external storage infrastructure needed
- Acceptable for 10MB file size limit
- Works seamlessly with Server-Sent Events

**Data Flow:**
```
Client → FileReader.readAsDataURL() → base64 string
→ POST to /api/chat/stream with base64 in JSON
→ Server receives, parses, processes
→ No storage cleanup needed (ephemeral)
```

**Future Enhancement (Post-MVP):**
- Vercel Blob storage for files >10MB
- Audit trail (store uploaded files for 30 days)
- Multi-step processing with resume capability

**Trade-offs:**
- Pro: Zero infrastructure, instant implementation
- Pro: No cleanup logic needed
- Con: 10MB limit (acceptable for bank statements)
- Con: Higher memory usage during processing (mitigated by rate limiting)

---

## Development Tools

### Testing

**Framework:** Vitest 3.2.4 (already configured)

**Coverage Target:** 80% for new services (fileParser, write tools)

**Strategy:**
- Unit tests for parsing logic (CSV, Excel, PDF validation)
- Integration tests for tool execution (create, update, categorize)
- End-to-end tests for file upload flow (manual testing)

### Code Quality

**Linter:** ESLint 8.57.0 with Next.js config

**Formatter:** Prettier (via ESLint integration)

**Type Checking:** TypeScript 5.7.2 (strict mode)

**Standards:**
- All new functions must have JSDoc comments
- All tool definitions must have comprehensive input_schema
- Error messages must be user-friendly and actionable

### Build & Deploy

**Build Tool:** Next.js built-in (Turbopack in dev)

**Deployment Target:** Vercel (existing setup)

**CI/CD:** GitHub Actions (if configured, otherwise manual deploy)

---

## Environment Variables

Required for Iteration 22:

- `ANTHROPIC_API_KEY`: Claude API key (already configured from Iteration 21)
- `DATABASE_URL`: PostgreSQL connection string (already configured)
- `WEALTH_AI_ENABLED`: Feature flag (default: true)

No new environment variables needed.

---

## Dependencies Overview

### New Production Dependencies

```json
{
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0"
}
```

### Already Installed (No Changes)

```json
{
  "@anthropic-ai/sdk": "0.32.1",
  "string-similarity": "4.0.4",
  "xlsx": "^0.18.5"
}
```

### Total New Dependencies: 2 (both lightweight, well-maintained)

---

## Performance Targets

- **File Upload:** <500ms to encode and send (client-side)
- **PDF Parsing:** <15 seconds for 2MB file (Claude Vision)
- **CSV/Excel Parsing:** <1 second for 5MB file (synchronous)
- **Duplicate Detection:** <2 seconds for 100 transactions vs 10,000 existing
- **Batch Import:** <3 seconds for 50 transactions (including categorization)
- **Markdown Rendering:** <50ms initial render (no syntax highlighting)

## Security Considerations

### File Validation

- MIME type checking (prevent spoofed extensions)
- File size limits enforced (10MB PDF, 5MB CSV/Excel)
- Minimum size check (avoid empty files)
- Extension whitelist: .pdf, .csv, .xlsx, .xls only

### Input Sanitization

- All transaction data validated via Zod schemas
- Amount validation: must be non-zero, numeric
- Date validation: ISO 8601 format required
- Payee validation: max length 200 characters

### Rate Limiting

- Write operations: 20 per hour (separate bucket)
- Read operations: 100 per hour (existing from Iteration 21)
- File uploads: 10 per hour (subset of write operations)

### XSS Prevention

- React escapes text content by default
- react-markdown strips HTML tags by default
- No `dangerouslySetInnerHTML` anywhere in codebase
- User messages rendered as plain text (no markdown)

### SQL Injection Prevention

- Prisma ORM handles parameterization automatically
- No raw SQL queries used
- All database operations via tRPC procedures (validated)

---

## Cost Estimates

### Claude API Usage

**PDF Parsing (per statement):**
- Input tokens: ~5,000 (PDF content + system prompt)
- Output tokens: ~2,000 (JSON transaction array)
- Cost: ~$0.05 per PDF (using Claude Sonnet 4.5)

**Categorization (per batch of 50):**
- Input tokens: ~1,500 (transaction list + categories)
- Output tokens: ~300 (JSON categorizations)
- Cost: ~$0.01 per batch
- Cache hit: $0 (60-80% of transactions)

**Expected Monthly Cost (100 active users):**
- 200 PDF imports/month: $10
- 500 categorization batches/month (40% uncached): $5
- Total: ~$15-20/month

**Risk Mitigation:**
- Prompt caching reduces costs by 50%
- Rate limiting prevents abuse
- Cost alerts at $30/day threshold
