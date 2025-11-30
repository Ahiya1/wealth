# Master Explorer 4 Report: Scalability & Performance Considerations

## Explorer ID
master-explorer-4

## Focus Area
Scalability & Performance Considerations

## Vision Summary
Build a ChatGPT-style AI assistant inside Wealth using Claude Sonnet 4.5 for intelligent transaction imports, duplicate detection, credit card bill resolution, financial queries, and conversational insights - all while managing API costs, streaming performance, and database query optimization.

---

## Executive Summary

Plan-7 introduces significant performance and scalability challenges that differ from previous iterations:

1. **AI API Costs**: Claude Sonnet 4.5 streaming responses with tool use require careful token management (estimated $0.003-0.015 per chat message)
2. **Database Schema**: ChatSession and ChatMessage tables will grow unbounded without retention policies
3. **Context Window Management**: Long conversations (>100 messages) require intelligent truncation to stay under 200K token limit
4. **File Processing**: PDF/CSV/Excel uploads need size limits (10MB recommended) and streaming processing to avoid memory issues
5. **Query Performance**: Financial data queries must be optimized to return <500ms for responsive chat experience
6. **Streaming Implementation**: Real-time responses require Server-Sent Events (SSE) or streaming JSON for good UX

**Performance Impact: HIGH** - This feature will be the most API-cost-intensive and performance-sensitive feature in Wealth to date.

**Recommended approach**: Start conservative (rate limits, size limits, context truncation) and scale up based on usage data.

---

## Database Schema Design

### Proposed Schema Addition

```prisma
// ============================================================================
// CHAT SYSTEM - Plan-7
// ============================================================================

enum ChatRole {
  USER
  ASSISTANT
  SYSTEM
  TOOL_CALL
  TOOL_RESULT
}

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   @db.Text // Auto-generated from first message (max 100 chars)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId])
  @@index([userId, updatedAt(sort: Desc)]) // For session list performance
  @@index([createdAt]) // For cleanup jobs
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      ChatRole
  content   String   @db.Text // User text or assistant response
  toolCalls Json?    // Array of tool calls (for TOOL_CALL role)
  toolResults Json?  // Array of tool results (for TOOL_RESULT role)
  tokenCount Int?    // Track tokens for cost/context management
  createdAt DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt]) // For message retrieval
}

// Update User model to add chat relationship
// Add to existing User model:
// chatSessions ChatSession[]
```

### Schema Design Rationale

1. **Separate ChatMessage table** (NOT JSON blob in session):
   - Enables efficient pagination of long conversations
   - Allows per-message token counting for context window management
   - Supports efficient queries for context truncation ("last N messages")
   - Better for incremental loading in UI

2. **Json for toolCalls/toolResults**:
   - Flexible schema (different tools have different parameters)
   - No need for complex normalization
   - Easier to serialize/deserialize Claude API responses
   - PostgreSQL JSONB indexing available if needed later

3. **tokenCount field**:
   - Critical for context window management
   - Enables smart truncation ("keep last N tokens, not messages")
   - Helps estimate API costs per session
   - Can be calculated on insert using Claude's tokenizer

4. **Indexes optimized for common queries**:
   - Session list: `userId, updatedAt DESC` (dashboard recent chats)
   - Message retrieval: `sessionId, createdAt` (conversation loading)
   - Cleanup: `createdAt` (delete old sessions in cron job)

### Database Size Projections

**Assumptions:**
- 100 active users
- 10 chat sessions per user per month
- Average 20 messages per session
- Average message size: 500 characters

**Monthly growth:**
- ChatSession: 1,000 rows/month × 200 bytes = 0.2 MB
- ChatMessage: 20,000 rows/month × 1 KB = 20 MB

**Annual growth:**
- ChatSession: 12,000 rows/year × 200 bytes = 2.4 MB
- ChatMessage: 240,000 rows/year × 1 KB = 240 MB

**Performance impact:** Negligible (<1GB in year 1). PostgreSQL on Supabase handles this easily.

**Retention policy recommendation:**
- Keep all sessions forever (storage is cheap)
- Implement soft delete (deletedAt field) for user privacy
- Consider archiving sessions >6 months old to cold storage if growth exceeds projections

---

## Performance Considerations

### 1. Streaming Response Implementation

**Approach:** Server-Sent Events (SSE) via Next.js Route Handler with ReadableStream

**Implementation pattern:**

```typescript
// /app/api/chat/route.ts
export async function POST(req: Request) {
  const { sessionId, message } = await req.json()

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Call Claude API with streaming
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        stream: true, // Enable streaming
        messages: [...contextMessages, { role: 'user', content: message }],
        tools: toolDefinitions,
      })

      // Stream chunks to client
      for await (const chunk of response) {
        if (chunk.type === 'content_block_delta') {
          const data = JSON.stringify({ text: chunk.delta.text })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

**Client-side handling:**

```typescript
// Frontend EventSource pattern
const eventSource = new EventSource('/api/chat')
eventSource.onmessage = (event) => {
  const { text } = JSON.parse(event.data)
  appendToMessage(text) // Update UI incrementally
}
```

**Performance characteristics:**
- **First token latency:** 500-800ms (Claude API response time)
- **Streaming speed:** ~20-50 tokens/second
- **Total response time:** 3-8 seconds for typical responses (100-400 tokens)
- **Memory usage:** Minimal (streaming, not buffering)

**Alternative approach:** tRPC subscriptions (more complex, not recommended for MVP)

### 2. Context Window Management

**Challenge:** Claude Sonnet 4.5 has 200K token context window, but optimal performance is at <50K tokens.

**Strategy:** Smart context truncation with message prioritization

**Implementation:**

```typescript
async function buildContextMessages(
  sessionId: string,
  maxTokens: number = 40000 // Leave room for response
): Promise<Array<Message>> {
  // Step 1: Always include system prompt (500 tokens)
  const systemPrompt = { role: 'system', content: FINANCIAL_ASSISTANT_PROMPT }
  let totalTokens = 500

  // Step 2: Fetch messages in reverse chronological order
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 100, // Fetch last 100 messages (usually ~20-40K tokens)
  })

  // Step 3: Include messages from newest to oldest until hitting token limit
  const includedMessages = []
  for (const msg of messages) {
    const estimatedTokens = msg.tokenCount || estimateTokens(msg.content)

    if (totalTokens + estimatedTokens > maxTokens) {
      break // Stop including older messages
    }

    includedMessages.unshift(msg) // Add to beginning (maintain chronological order)
    totalTokens += estimatedTokens
  }

  return [systemPrompt, ...includedMessages]
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  // For better accuracy, use @anthropic-ai/tokenizer (if available)
  return Math.ceil(text.length / 4)
}
```

**Token counting strategy:**
- **On message insert:** Calculate exact token count using Claude's tokenizer and store in `tokenCount` field
- **On context building:** Sum `tokenCount` fields (fast, no re-calculation)
- **Fallback:** Use character-based estimation if tokenizer unavailable

**Context truncation behavior:**
- Keep last N messages that fit in token budget
- Always keep system prompt (critical for behavior)
- Tool calls and results count toward token limit
- Warn user if context is truncated ("Earlier messages not included")

**Expected context sizes:**
- **Short conversation** (5 messages): ~2K tokens
- **Medium conversation** (20 messages): ~10K tokens
- **Long conversation** (50 messages): ~30K tokens
- **Very long** (100+ messages): Truncate to last 40K tokens

### 3. Query Optimization for Financial Data Access

**Challenge:** Chat tools will query transactions, budgets, and analytics frequently.

**Critical queries to optimize:**

#### Query 1: get_transactions (most frequent)
```typescript
// Potential issue: Slow full table scan without proper indexes
const transactions = await prisma.transaction.findMany({
  where: {
    userId,
    date: { gte: startDate, lte: endDate },
    categoryId: categoryId,
  },
  take: 50,
  orderBy: { date: 'desc' }
})
```

**Optimization:**
- Index already exists: `@@index([userId, date(sort: Desc)])` ✅
- Add composite index for category filtering: `@@index([userId, categoryId, date])`
- Use cursor-based pagination for large result sets
- **Expected performance:** <100ms for 50 transactions

#### Query 2: get_spending_summary (aggregate query)
```typescript
// Potential issue: Expensive aggregation over large datasets
const summary = await prisma.transaction.groupBy({
  by: ['categoryId'],
  where: {
    userId,
    date: { gte: startOfMonth, lte: endOfMonth },
  },
  _sum: { amount: true },
  _count: true,
})
```

**Optimization:**
- Use existing `userId, date` index ✅
- Consider materialized view for frequently accessed monthly summaries (future optimization)
- Cache results in Redis for 5 minutes (future optimization)
- **Expected performance:** 200-300ms for 100-500 transactions

#### Query 3: search_transactions (text search)
```typescript
// Potential issue: Full table scan for text search
const results = await prisma.transaction.findMany({
  where: {
    userId,
    OR: [
      { payee: { contains: searchQuery, mode: 'insensitive' } },
      { notes: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }
})
```

**Optimization:**
- PostgreSQL full-text search already enabled: `previewFeatures = ["fullTextSearch"]` ✅
- Add GIN index on payee field: `@@index([payee(ops: GinTrgmOps)])` (future)
- Limit search to last 90 days by default
- **Expected performance:** 500-800ms for fuzzy search

**Performance acceptance criteria:**
- **Read queries:** <500ms for p95
- **Write queries:** <1000ms for p95
- **Aggregations:** <1000ms for p95
- **Overall chat response:** <8 seconds for p95 (including API call)

### 4. Caching Strategies

**Level 1: MerchantCategoryCache (already implemented)**
- Caches merchant → category mappings
- Hit rate: 70-80% (based on existing data from iteration-20)
- Reduces Claude API calls by ~75%
- **Impact:** Major cost savings for transaction categorization

**Level 2: Financial data caching (NEW for chat)**
- Cache frequently accessed data in memory (Node.js Map or Redis)
- **Candidates:**
  - User's categories: Cache for 5 minutes
  - Account balances: Cache for 1 minute
  - Current month budget status: Cache for 5 minutes

```typescript
// Simple in-memory cache with TTL
const cache = new Map<string, { data: any, expires: number }>()

function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.data)
  }

  return fetchFn().then(data => {
    cache.set(key, { data, expires: Date.now() + ttlMs })
    return data
  })
}
```

**Level 3: Response caching (future optimization)**
- Cache identical queries for 30 seconds
- Example: "How much did I spend last month?" asked twice in 30 seconds
- **Implementation:** Hash question + user context → cache key
- **Risk:** Stale data if user makes changes between queries
- **Recommendation:** Only for read-only analytics queries

**Cache invalidation strategy:**
- Invalidate on write operations (create/update/delete transaction)
- Time-based expiration (TTL)
- Manual flush via admin panel (for debugging)

---

## API Cost Management

### Token Usage Estimates

**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`)
- **Input tokens:** $0.003 per 1K tokens
- **Output tokens:** $0.015 per 1K tokens

**Typical conversation breakdown:**

| Scenario | Input Tokens | Output Tokens | Cost per Message |
|----------|--------------|---------------|------------------|
| Simple query | 1,500 | 300 | $0.0045 + $0.0045 = **$0.009** |
| File upload (PDF parsing) | 5,000 | 800 | $0.015 + $0.012 = **$0.027** |
| Complex analysis | 3,000 | 1,200 | $0.009 + $0.018 = **$0.027** |
| Tool use (3 tools) | 2,000 | 500 | $0.006 + $0.0075 = **$0.014** |

**Average cost per chat message:** $0.012 (blended average)

### Usage Projections

**Scenario 1: Light usage (100 users, 10 messages/user/month)**
- Total messages: 1,000/month
- Total cost: 1,000 × $0.012 = **$12/month**

**Scenario 2: Moderate usage (100 users, 50 messages/user/month)**
- Total messages: 5,000/month
- Total cost: 5,000 × $0.012 = **$60/month**

**Scenario 3: Heavy usage (500 users, 100 messages/user/month)**
- Total messages: 50,000/month
- Total cost: 50,000 × $0.012 = **$600/month**

### Cost Optimization Strategies

#### Strategy 1: Prompt Caching (HIGH IMPACT)
**Claude's prompt caching:** Reuse system prompt and conversation history across messages

```typescript
const response = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' } // Cache system prompt
    }
  ],
  messages: [...conversationHistory] // Also cached if marked
})
```

**Savings:** ~90% reduction on cached tokens ($0.0003 input vs $0.003)
- **System prompt** (~500 tokens): Save $0.0015 per message → **~$0.001 per message**
- **Conversation history** (~2000 tokens): Save $0.006 per message → **~$0.005 per message**
- **Total savings:** ~50% reduction in input token costs

**Implementation complexity:** LOW (single parameter change)
**Recommendation:** MUST IMPLEMENT in iteration 1

#### Strategy 2: Tool Call Optimization (MEDIUM IMPACT)
**Current approach:** All tools defined in every request
**Optimized approach:** Include only relevant tools based on user intent

```typescript
// Before: 10 tools × 200 tokens = 2000 tokens per request
const allTools = [
  get_transactions,
  get_spending_summary,
  get_budget_status,
  get_account_balances,
  get_categories,
  search_transactions,
  create_transaction,
  create_transactions_batch,
  update_transaction,
  categorize_transactions,
]

// After: Selective tool inclusion based on query
function selectTools(userMessage: string): ToolDefinition[] {
  const intent = detectIntent(userMessage) // "query" | "write" | "import"

  if (intent === 'query') {
    return [get_transactions, get_spending_summary, get_budget_status] // 600 tokens
  } else if (intent === 'import') {
    return [parse_file, create_transactions_batch, compare_with_existing] // 600 tokens
  }

  return allTools // Fallback
}
```

**Savings:** ~70% reduction in tool definition tokens (2000 → 600)
- **Per message:** Save 1,400 tokens × $0.003 = **$0.0042**
- **Monthly** (5,000 messages): Save **$21/month**

**Implementation complexity:** MEDIUM (requires intent detection)
**Recommendation:** Implement in iteration 2 (post-MVP)

#### Strategy 3: Response Length Limits (LOW IMPACT)
**Current:** max_tokens: 4096 (allows verbose responses)
**Optimized:** max_tokens: 2048 (force concise responses)

**Savings:** ~30% reduction in output tokens
- **Per message:** Save 500 tokens × $0.015 = **$0.0075**
- **Monthly** (5,000 messages): Save **$37.50/month**

**Trade-off:** Less detailed responses, may frustrate users
**Recommendation:** Keep 4096 for MVP, reduce if costs exceed budget

#### Strategy 4: Rate Limiting (HIGH IMPACT for abuse prevention)
**Implementation:**

```typescript
// Redis-backed rate limiter (or in-memory for MVP)
const rateLimits = {
  messagesPerMinute: 10,
  messagesPerHour: 100,
  messagesPerDay: 300,
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `chat_rate:${userId}`
  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, 60) // 1 minute TTL
  }

  return count <= rateLimits.messagesPerMinute
}
```

**Savings:** Prevent abuse scenarios (user spamming API)
**Implementation complexity:** MEDIUM (requires Redis or in-memory store)
**Recommendation:** MUST IMPLEMENT in iteration 1 (start conservative)

### Cost Monitoring

**Implement usage tracking:**

```typescript
// Add to ChatMessage model
model ChatMessage {
  // ... existing fields
  inputTokens  Int?
  outputTokens Int?
  estimatedCost Decimal? @db.Decimal(10, 6) // Store cost for analytics
}

// Track on every API call
const usage = response.usage
await prisma.chatMessage.create({
  data: {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    estimatedCost: calculateCost(usage.input_tokens, usage.output_tokens),
    // ... other fields
  }
})
```

**Dashboard metrics:**
- Total API cost per user (daily/monthly)
- Average tokens per message
- Most expensive users (for fraud detection)
- Cost per feature (queries vs imports vs analysis)

**Alerts:**
- Daily cost exceeds $20
- Single user exceeds $10/day
- Average message cost exceeds $0.05 (indicates inefficiency)

---

## File Processing Performance

### File Size Limits

**Recommended limits:**
- **PDF:** 10 MB (typical bank statement: 500KB-2MB)
- **CSV:** 5 MB (typical export: 50KB-500KB)
- **Excel:** 5 MB (typical spreadsheet: 100KB-1MB)
- **Total upload per session:** 25 MB

**Rationale:**
- Claude Vision API limit: 32MB per request
- Next.js default body parser limit: 4MB (needs override)
- Vercel serverless function limit: 50MB memory
- User experience: >10MB uploads are rare, likely errors

### Processing Approach

**PDF Processing:**

```typescript
async function processPDF(file: File): Promise<ParsedTransactions> {
  // Step 1: Validate size
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('PDF too large (max 10MB)')
  }

  // Step 2: Convert to base64 for Claude Vision
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Step 3: Send to Claude Vision API
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          }
        },
        {
          type: 'text',
          text: 'Extract all transactions from this bank statement...'
        }
      ]
    }]
  })

  // Step 4: Parse structured response
  return parseTransactionsFromResponse(response)
}
```

**Performance characteristics:**
- **Small PDF** (500KB): 3-5 seconds
- **Medium PDF** (2MB): 8-12 seconds
- **Large PDF** (10MB): 20-30 seconds

**CSV/Excel Processing:**

```typescript
import { read, utils } from 'xlsx'

async function processSpreadsheet(file: File): Promise<ParsedTransactions> {
  // Step 1: Validate size
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large (max 5MB)')
  }

  // Step 2: Parse with XLSX library
  const arrayBuffer = await file.arrayBuffer()
  const workbook = read(arrayBuffer)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json(sheet)

  // Step 3: Validate and normalize (no AI needed for structured data)
  return normalizeTransactions(rows)
}
```

**Performance characteristics:**
- **Small CSV** (50KB, 100 rows): <100ms
- **Medium CSV** (500KB, 1000 rows): 200-500ms
- **Large CSV** (5MB, 10K rows): 1-2 seconds

### Memory Considerations

**Challenge:** Large file uploads in serverless environment (Vercel 1GB memory limit)

**Strategy:**
- **Streaming uploads:** Use Next.js streaming body parser (doesn't load entire file in memory)
- **Immediate processing:** Process and discard file data (don't store in database)
- **Chunked processing:** For very large files, process in batches of 100 transactions

**Example:**

```typescript
export const config = {
  api: {
    bodyParser: false, // Disable default parser
  }
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  // Process immediately, don't buffer
  const result = await processFileStream(file)

  // File data is garbage collected after processing
  return Response.json(result)
}
```

---

## Recommended Iteration Order

Based on dependencies, performance risks, and complexity:

### Iteration 1: Foundation (High Priority)
**Scope:**
- Database schema (ChatSession, ChatMessage)
- Basic chat UI (/chat page)
- Simple message/response flow (no tools)
- Streaming response implementation
- Session persistence (create, list, load)
- Rate limiting (10 msg/min, 100/hour)
- Prompt caching implementation

**Why first:**
- Foundation for all other features
- Validates streaming performance early
- Establishes cost monitoring baseline
- Low risk (no complex logic)

**Performance targets:**
- First token: <1s
- Full response: <5s
- Session load: <200ms
- Message insert: <100ms

**Estimated duration:** 6-8 hours

---

### Iteration 2: Query Tools (Medium Priority)
**Scope:**
- Implement read-only tools (get_transactions, get_spending_summary, etc.)
- Tool call handling in chat flow
- Financial data query optimization
- Context window management (truncation)
- Basic caching (categories, account balances)

**Why second:**
- Builds on iteration 1 foundation
- Validates query performance under AI load
- Tests context window management with real conversations
- Medium complexity (existing tRPC routers reusable)

**Performance targets:**
- Tool execution: <500ms
- Multi-tool queries: <2s total
- Query cache hit rate: >60%

**Estimated duration:** 8-10 hours

---

### Iteration 3: File Upload & Parsing (High Priority)
**Scope:**
- File upload UI (drag-and-drop)
- PDF parsing via Claude Vision
- CSV/Excel parsing
- Transaction extraction and validation
- File size limits and error handling
- Duplicate detection integration

**Why third:**
- Depends on iteration 2 (needs query tools for duplicate detection)
- Highest performance risk (large files, slow processing)
- Critical for user value proposition
- Complex error handling required

**Performance targets:**
- PDF processing: <15s for 2MB file
- CSV processing: <2s for 1MB file
- Upload success rate: >95%

**Estimated duration:** 10-12 hours

---

### Iteration 4: Write Tools & Actions (Medium Priority)
**Scope:**
- Implement write tools (create_transaction, update_transaction, etc.)
- Batch operations (create_transactions_batch)
- User confirmation flow for batch writes
- Transaction rollback on errors
- Credit card bill resolution logic

**Why fourth:**
- Depends on iteration 3 (uses parsed transaction data)
- Lower risk (similar to existing tRPC mutations)
- Can validate all previous iterations working together
- Moderate complexity

**Performance targets:**
- Single transaction creation: <200ms
- Batch insert (50 transactions): <1s
- Rollback on error: <500ms

**Estimated duration:** 8-10 hours

---

### Iteration 5: Advanced Features (Low Priority - Post-MVP)
**Scope:**
- Auto-categorization with confidence scoring
- Retroactive cleanup mode
- Session title auto-generation
- Cost analytics dashboard
- Advanced caching (Redis)
- Selective tool loading (intent detection)

**Why last:**
- Optional enhancements
- Can ship MVP without these
- Allows time to gather usage data
- Lower user impact if delayed

**Performance targets:**
- Auto-categorization: <3s for 50 transactions
- Cleanup analysis: <10s for 6 months of data

**Estimated duration:** 6-8 hours

---

## Testing Strategy

### Unit Tests (Required)

#### Database Layer
```typescript
// chatSession.test.ts
describe('ChatSession CRUD', () => {
  it('creates session with auto-generated title', async () => {
    const session = await createSession(userId, 'Help me import transactions')
    expect(session.title).toBe('Help me import transactions')
  })

  it('truncates long titles to 100 chars', async () => {
    const longTitle = 'A'.repeat(150)
    const session = await createSession(userId, longTitle)
    expect(session.title.length).toBe(100)
  })

  it('cascades delete to messages', async () => {
    const session = await createSession(userId, 'Test')
    await createMessage(session.id, 'user', 'Hello')
    await deleteSession(session.id)
    const messages = await getMessages(session.id)
    expect(messages).toHaveLength(0)
  })
})
```

#### Context Window Management
```typescript
// context-builder.test.ts
describe('buildContextMessages', () => {
  it('includes all messages if under token limit', async () => {
    const messages = await buildContextMessages(sessionId, 50000)
    expect(messages.length).toBe(10) // All 10 messages fit
  })

  it('truncates old messages if over token limit', async () => {
    const messages = await buildContextMessages(sessionId, 5000)
    expect(messages.length).toBeLessThan(10) // Truncated
    expect(messages[0].role).toBe('system') // System prompt always included
  })

  it('estimates tokens correctly for text messages', () => {
    const tokens = estimateTokens('Hello world')
    expect(tokens).toBe(3) // ~4 chars per token
  })
})
```

#### File Processing
```typescript
// file-processor.test.ts
describe('PDF Processing', () => {
  it('rejects files over 10MB', async () => {
    const largeFile = createMockFile(11 * 1024 * 1024)
    await expect(processPDF(largeFile)).rejects.toThrow('PDF too large')
  })

  it('extracts transactions from valid PDF', async () => {
    const pdf = loadTestPDF('fibi-statement.pdf')
    const result = await processPDF(pdf)
    expect(result.transactions).toHaveLength(23)
    expect(result.transactions[0]).toMatchObject({
      date: expect.any(Date),
      amount: expect.any(Number),
      description: expect.any(String),
    })
  })

  it('handles malformed PDFs gracefully', async () => {
    const corruptPDF = createMockFile(1024, 'corrupt')
    await expect(processPDF(corruptPDF)).rejects.toThrow()
  })
})
```

#### Rate Limiting
```typescript
// rate-limiter.test.ts
describe('Rate Limiter', () => {
  it('allows messages under limit', async () => {
    for (let i = 0; i < 10; i++) {
      const allowed = await checkRateLimit(userId)
      expect(allowed).toBe(true)
    }
  })

  it('blocks messages over limit', async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(userId)
    }
    const blocked = await checkRateLimit(userId)
    expect(blocked).toBe(false)
  })

  it('resets after time window', async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(userId)
    }
    await sleep(61000) // Wait 61 seconds
    const allowed = await checkRateLimit(userId)
    expect(allowed).toBe(true)
  })
})
```

### Integration Tests (Recommended)

#### End-to-End Chat Flow
```typescript
// chat-integration.test.ts
describe('Chat E2E', () => {
  it('completes full conversation with tool use', async () => {
    const session = await createSession(userId, 'Test')

    // User asks question
    const response1 = await sendMessage(session.id, 'How much did I spend last month?')
    expect(response1.role).toBe('assistant')
    expect(response1.toolCalls).toHaveLength(1)
    expect(response1.toolCalls[0].name).toBe('get_spending_summary')

    // Check tool was executed
    const messages = await getMessages(session.id)
    expect(messages).toHaveLength(3) // user, tool_call, tool_result

    // Verify assistant response uses tool result
    expect(response1.content).toContain('₪') // Contains amount
  })

  it('handles file upload and transaction import', async () => {
    const session = await createSession(userId, 'Import')
    const file = loadTestPDF('fibi-statement.pdf')

    const response = await uploadFile(session.id, file)
    expect(response.content).toContain('Found 23 transactions')

    // Verify transactions were created
    const transactions = await prisma.transaction.findMany({
      where: { userId, importSource: 'AI_IMPORT' }
    })
    expect(transactions.length).toBeGreaterThan(0)
  })
})
```

### E2E Tests (Manual for MVP)

**Test scenarios:**
1. **Happy path:** Create session → Ask question → Receive answer → Load previous session
2. **File upload:** Upload PDF → Parse transactions → Confirm import → Verify in dashboard
3. **Error handling:** Upload corrupt file → Receive clear error message
4. **Rate limiting:** Send 11 messages in 1 minute → Get rate limit error
5. **Long conversation:** Send 30 messages → Verify context truncation works
6. **Streaming:** Send message → Verify tokens stream in real-time (not buffered)

**Performance benchmarks:**
- [ ] Session load: <200ms (p95)
- [ ] Simple query response: <5s (p95)
- [ ] PDF processing: <15s for 2MB file (p95)
- [ ] Batch import (50 transactions): <3s (p95)
- [ ] First token latency: <1s (p95)

---

## Performance Monitoring & Observability

### Metrics to Track

**API Performance:**
- Response time per endpoint (p50, p95, p99)
- Token usage per message (input/output)
- API error rate (4xx, 5xx)
- Rate limit hit rate

**Database Performance:**
- Query execution time by operation
- Database connection pool usage
- Slow query log (>500ms)
- Row count growth (ChatMessage table)

**Cost Metrics:**
- Daily/monthly API cost
- Cost per user
- Cost per feature (queries vs imports)
- Cache hit rate (MerchantCategoryCache)

### Implementation

**Sentry Integration (already exists):**
```typescript
// Extend existing Sentry config
import * as Sentry from '@sentry/nextjs'

// Track custom metrics
Sentry.metrics.distribution('chat.response_time', responseTimeMs)
Sentry.metrics.increment('chat.messages_sent')
Sentry.metrics.gauge('chat.api_cost_usd', costInUSD)
```

**Custom logging:**
```typescript
// lib/logger.ts
export function logChatMetrics(metrics: {
  sessionId: string
  messageId: string
  inputTokens: number
  outputTokens: number
  executionTimeMs: number
  toolsUsed: string[]
  cost: number
}) {
  console.log('[CHAT_METRICS]', JSON.stringify(metrics))

  // Also send to analytics service (future)
  // analytics.track('chat_message', metrics)
}
```

---

## Risk Assessment

### High Risks

**Risk 1: API Cost Runaway**
- **Impact:** Unexpected $500+ bill if users abuse system
- **Mitigation:**
  - Strict rate limiting (10 msg/min, 100/hour, 300/day)
  - Daily cost alerts ($20 threshold)
  - Per-user cost caps ($10/day)
  - Prompt caching (50% cost reduction)
- **Recommendation:** Implement all mitigations in iteration 1

**Risk 2: PDF Parsing Accuracy**
- **Impact:** Users lose trust if transactions are incorrectly extracted
- **Mitigation:**
  - Always show preview before import (user confirmation required)
  - Clear confidence indicators (high/medium/low)
  - Manual edit option for parsed transactions
  - Comprehensive error messages ("Could not parse rows 15-20")
- **Recommendation:** Extensive testing with real bank statements before launch

**Risk 3: Context Window Overflow**
- **Impact:** API errors if conversation exceeds 200K tokens
- **Mitigation:**
  - Smart truncation (keep last 40K tokens)
  - Warn user when context is truncated
  - Option to start new session ("This conversation is getting long")
- **Recommendation:** Test with 100+ message conversations

### Medium Risks

**Risk 4: Streaming Connection Drops**
- **Impact:** User sees partial response, unclear if complete
- **Mitigation:**
  - Client-side timeout detection (30 seconds)
  - Retry logic with exponential backoff
  - Store partial responses in database
  - "Retry" button on failed responses
- **Recommendation:** Test on slow networks and high latency

**Risk 5: Database Growth**
- **Impact:** ChatMessage table grows to millions of rows over time
- **Mitigation:**
  - Implement retention policy (archive >6 months old)
  - Efficient indexing (already designed)
  - Monitor table size weekly
- **Recommendation:** Set up automated cleanup cron job in iteration 5

### Low Risks

**Risk 6: File Upload Size Abuse**
- **Impact:** Users upload 50MB files, slow down system
- **Mitigation:**
  - Hard limit: 10MB for PDF, 5MB for CSV
  - Client-side validation (instant feedback)
  - Server-side validation (security)
- **Recommendation:** Already planned in iteration 3

---

## Scalability Roadmap

### Phase 1: MVP (Iterations 1-4) - Support 100 users

**Infrastructure:**
- Vercel serverless functions (auto-scaling)
- Supabase PostgreSQL (10GB storage)
- In-memory caching (Node.js Map)

**Performance targets:**
- 1,000 messages/day
- <$20/day API cost
- <5s average response time

**Bottlenecks:**
- None expected at this scale

---

### Phase 2: Growth (500 users) - 3-6 months post-launch

**Infrastructure upgrades:**
- Redis for distributed caching
- Connection pooling (PgBouncer)
- Dedicated Claude API budget ($300/month)

**Performance targets:**
- 5,000 messages/day
- <$60/day API cost
- <8s p95 response time

**Optimizations:**
- Implement selective tool loading (intent detection)
- Response caching for common queries
- Database query optimization (materialized views)

---

### Phase 3: Scale (2,000+ users) - 12+ months post-launch

**Infrastructure upgrades:**
- Dedicated Supabase instance (no shared resources)
- Claude API enterprise contract (volume discounts)
- CDN for static assets

**Performance targets:**
- 20,000 messages/day
- <$200/day API cost (volume discounts)
- <10s p95 response time

**Optimizations:**
- Model fine-tuning for financial domain (reduce tokens)
- Hybrid approach (use GPT-4o-mini for simple queries)
- Advanced caching strategies (embeddings-based semantic cache)

---

## Technology Recommendations

### Production-Ready Stack

**Backend:**
- **Framework:** Next.js 14 App Router (already in use) ✅
- **API Layer:** tRPC (already in use) ✅
- **Database:** PostgreSQL on Supabase (already in use) ✅
- **ORM:** Prisma (already in use) ✅
- **AI SDK:** @anthropic-ai/sdk v0.32.1 (already installed) ✅

**New dependencies needed:**
- `xlsx` (already installed) ✅ - For CSV/Excel parsing
- `pdf-parse` or rely on Claude Vision - For PDF parsing (recommend Claude Vision)
- `@anthropic-ai/tokenizer` (optional) - For accurate token counting

**Frontend:**
- **Framework:** React 18 + TypeScript (already in use) ✅
- **UI Library:** shadcn/ui + Radix (already in use) ✅
- **Streaming:** EventSource API (browser native) ✅
- **State Management:** React Query (already in use) ✅

**Infrastructure:**
- **Hosting:** Vercel (already in use) ✅
- **Database:** Supabase Cloud (already in use) ✅
- **Caching:** In-memory (MVP) → Redis (growth phase)
- **Monitoring:** Sentry (already configured) ✅

**No new major dependencies required!** Existing stack is well-suited for this feature.

---

## Notes & Observations

### Existing Infrastructure Strengths

1. **Anthropic SDK already integrated:** categorize.service.ts shows working Claude integration with batching, error handling, and caching patterns ✅

2. **Duplicate detection service exists:** isDuplicate() function with three-factor matching (date, amount, merchant) can be reused for import flow ✅

3. **Transaction import pipeline exists:** transaction-import.service.ts has robust pipeline with:
   - Duplicate detection
   - Batch insert with atomic balance updates
   - AI categorization integration
   - Budget alert triggering
   - Comprehensive error handling ✅

4. **Performance-tested codebase:** Iteration-20 validation shows 310/310 tests passing, including analytics optimization (3-5x faster with aggregate queries) ✅

5. **Production-ready patterns:**
   - Proper database transactions (atomicity)
   - Index optimization
   - Error handling with PII sanitization
   - Health check endpoints
   - Sentry integration ✅

### Reusable Components

**From categorize.service.ts:**
- `categorizeBatchWithClaude()` - Shows proper Claude API usage with error handling
- `getMerchantCategoryFromCache()` - Cache-first pattern for cost optimization
- Token limit handling (max_tokens: 1024, batch size: 50)

**From duplicate-detection.service.ts:**
- `isDuplicate()` - Three-factor matching (date ±1 day, amount exact, merchant fuzzy 70%)
- `isMerchantSimilar()` - Fuzzy matching with normalization

**From transaction-import.service.ts:**
- `insertTransactionsBatch()` - Atomic batch insert with balance updates
- `categorizeImportedTransactions()` - AI categorization pipeline
- Error handling patterns (try/catch with error arrays)

### Critical Insights from Existing Code

1. **Claude API is fast enough:** categorize.service.ts processes 50 transactions in single batch, suggesting <5s response time for typical workloads ✅

2. **Database performance is good:** Iteration-20 shows analytics queries optimized to <500ms with proper indexing ✅

3. **Batch operations work well:** transaction-import.service.ts successfully handles bulk inserts with atomic balance updates ✅

4. **Caching provides major wins:** MerchantCategoryCache gives 70-80% hit rate, reducing API calls by 75% ✅

### Potential Issues to Watch

1. **Context window management untested:** No existing code handles long conversations or token counting - needs new implementation

2. **Streaming not implemented:** No Server-Sent Events or streaming JSON in codebase - needs new API route pattern

3. **File upload limits unclear:** No existing file upload beyond form data - needs size validation and streaming

4. **Rate limiting absent:** No rate limiting in existing code - critical for cost control in chat feature

5. **Session management new:** No session/conversation persistence patterns in codebase - needs new database models

---

## Final Recommendations

### Must-Have for Iteration 1
1. ✅ Implement prompt caching (50% cost savings)
2. ✅ Add rate limiting (10 msg/min, 100/hour, 300/day)
3. ✅ Database schema with proper indexes
4. ✅ Streaming response implementation
5. ✅ Token usage tracking for cost monitoring

### Should-Have for Iteration 2-3
1. Query result caching (60%+ hit rate)
2. Context window truncation logic
3. File size limits and validation
4. Cost alert system ($20/day threshold)

### Could-Have for Iteration 4-5
1. Selective tool loading (intent detection)
2. Response caching for identical queries
3. Redis for distributed caching
4. Advanced analytics dashboard

### Performance Acceptance Criteria

**Before shipping to production:**
- [ ] First token latency: <1s (p95)
- [ ] Full response time: <8s (p95)
- [ ] Database queries: <500ms (p95)
- [ ] Session load: <200ms (p95)
- [ ] PDF processing: <15s for 2MB file (p95)
- [ ] API cost: <$30/day for 100 users
- [ ] Cache hit rate: >60% for categorization
- [ ] Rate limit success: 100% blocking at threshold
- [ ] Zero memory leaks in 100+ message conversations
- [ ] Streaming works on mobile networks (tested on 3G)

**Testing checklist:**
- [ ] Load test with 50 concurrent users
- [ ] Stress test with 100+ message conversations
- [ ] API cost validation with 1,000 messages
- [ ] Database growth projection (6 months)
- [ ] File upload testing (1KB to 10MB PDFs)
- [ ] Network failure handling (streaming drops)
- [ ] Rate limit bypass attempts

---

**Exploration completed:** 2025-11-30 04:55 UTC

**This report informs master planning decisions for Plan-7: Wealth AI Financial Assistant**

**Key takeaway:** Existing infrastructure is well-positioned for AI chat feature. Major focus areas are streaming implementation, context management, cost optimization (prompt caching mandatory), and rate limiting. Performance risks are manageable with proper testing and monitoring.
