# Master Explorer 2: Dependencies & Risk Assessment

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Fix critical AI chat bugs where tool execution results are not displayed to users, causing empty message boxes after tool calls complete successfully on the server.

---

## Technology Dependencies

### 1. Anthropic SDK

**Package:** `@anthropic-ai/sdk` v0.32.1
**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/package.json` line 32

**Critical APIs Used:**
- `messages.stream()` - Streaming responses with tool use
- Model: `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
- `messages.create()` - Non-streaming for PDF parsing

**Streaming Event Types Handled:**
```typescript
// In route.ts lines 200-384
- event.type === 'content_block_delta' (text_delta)
- event.type === 'content_block_start' (tool_use)
- event.type === 'message_delta' (stop_reason: 'tool_use')
- event.type === 'message_stop'
```

**Version Compatibility:**
- SDK v0.32.1 is older (current latest is ~0.65.x)
- Locked version to avoid zod peer dependency conflicts
- Streaming API is stable, no breaking changes expected

### 2. SSE (Server-Sent Events) Implementation

**Pattern:** Custom ReadableStream with TextEncoder
**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

**SSE Protocol:**
```typescript
// Data events: lines 208, 290
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))

// Done event: lines 334, 381
controller.enqueue(encoder.encode('data: [DONE]\n\n'))

// Error event: lines 392-394
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
```

**Response Headers:**
```typescript
// Line 402-407
'Content-Type': 'text/event-stream'
'Cache-Control': 'no-cache'
'Connection': 'keep-alive'
```

### 3. React State Management (Client-Side)

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatPageClient.tsx`

**State Variables:**
```typescript
const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
```

**Optimistic Updates:**
- User message added immediately via `handleStreamingStart()`
- Empty assistant message placeholder created
- Content appended via `handleStreamingUpdate()`
- Messages refetched via `handleMessageSent()` after `[DONE]`

**Critical Flow (lines 99-146):**
1. `handleStreamingStart()` - Creates optimistic user + empty assistant message
2. `handleStreamingUpdate()` - Appends text to last message
3. `handleStreamingEnd()` - Clears streaming state
4. `handleMessageSent()` - Invalidates queries to refresh from server

### 4. tRPC Integration

**Chat Router:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/chat.router.ts`

**Procedures:**
- `chat.listSessions` - List all sessions (50 max)
- `chat.getSession` - Get session with messages
- `chat.createSession` - Create new session
- `chat.deleteSession` - Delete session (cascade messages)
- `chat.getMessages` - Get messages for session

**Note:** Streaming NOT done via tRPC - uses direct fetch to `/api/chat/stream`

### 5. Prisma Database Schema

**Models:** `/home/ahiya/Ahiya/2L/Prod/wealth/prisma/schema.prisma`

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("New Chat")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  ChatMessage[]
}

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  role        String   // 'user' | 'assistant'
  content     String   @db.Text
  toolCalls   Json?
  toolResults Json?
  createdAt   DateTime @default(now())
}
```

---

## Risk Assessment

### Critical Risk 1: Tool Result Streaming Bug

**Risk Level:** HIGH

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` lines 273-338

**Root Cause Analysis:**
The code structure shows that after tool execution:
1. Tool results are added to `claudeMessages` array (lines 257-271)
2. A new `resumeStream` is created (lines 274-281)
3. The resume stream is iterated and text deltas are enqueued (lines 284-293)
4. On `message_stop`, message is saved and `[DONE]` is sent (lines 295-337)

**Potential Issue Points:**
1. The tool input accumulation at `content_block_start` (lines 213-221) only captures the initial input, but tool inputs are streamed via `input_json_delta` events which are NOT handled
2. The `resumeStream` may fail silently with no error handling around the inner for-await loop
3. No timeout or abort handling for the resume stream

**What Could Break:**
- Empty messages when tool results stream but no text follows
- Silent failures if resume stream throws
- Incomplete tool inputs causing execution with wrong parameters

### Critical Risk 2: Tool Call Duplication

**Risk Level:** HIGH

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` lines 197-220

**Issue:** Tool calls are accumulated in an array (`toolCalls`) but there's no deduplication by `id`. If the stream is interrupted and retried, or if Claude sends duplicate tool_use blocks, the same tool could execute multiple times.

**Impact for Write Operations:**
- `create_transaction` - Could create duplicate transactions
- `create_transactions_batch` - Could double-import entire batches
- `update_transaction` - Multiple updates (less severe)
- `categorize_transactions` - Multiple AI calls (cost impact)

**Current Mitigations:**
- Batch tool has 7-day duplicate detection window
- But single `create_transaction` has NO deduplication

### Critical Risk 3: Memory Leak in Rate Limiter

**Risk Level:** MEDIUM

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` lines 36-53

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>()
```

**Issue:** Module-level Map that never cleans up old entries. Each unique userId creates an entry that persists forever.

**Impact:**
- Memory grows with unique users over time
- In a single-user app (Ahiya only), impact is minimal
- Would become critical with multiple users

**Mitigation Complexity:** LOW - Add cleanup interval

### Risk 4: Session Title Update Race Condition

**Risk Level:** LOW

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` lines 306-325, 353-372

**Issue:** Title update happens AFTER message save, not in a transaction. If server crashes between message save and title update, session stays "New Chat" forever.

**Impact:** UI annoyance, not data loss

### Risk 5: Client-Side Message State Sync

**Risk Level:** MEDIUM

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatPageClient.tsx` lines 79-83

```typescript
useEffect(() => {
  if (messages && !streamingMessageId) {
    setLocalMessages(messages as ChatMessage[])
  }
}, [messages, streamingMessageId])
```

**Issue:** If `handleStreamingEnd()` is called but `handleMessageSent()` query refetch fails, the optimistic messages may be lost or out of sync with server.

**What Could Break:**
- Message content lost if refetch fails after streaming
- Duplicate messages if optimistic message IDs conflict with server IDs

---

## Testing Requirements

### Test Scenario 1: Basic Tool Execution

**Objective:** Verify tool results are displayed after execution

**Steps:**
1. Start dev server: `pnpm dev`
2. Navigate to `/chat`
3. Send: "Analyze my spending for the last 3 months"
4. Select time range option (e.g., "last 3 months")
5. Observe response

**Expected:** Spending breakdown appears with categories and amounts
**Current Bug:** Empty message box appears

**Verification Points:**
- Server logs show tool execution completed
- Browser Network tab shows SSE data events with text
- Message appears in database with content

### Test Scenario 2: Multiple Tool Calls

**Objective:** Test chained tool execution

**Steps:**
1. Ask: "What are my accounts?"
2. Wait for response
3. Ask: "What did I spend on groceries last month?"
4. Wait for response

**Expected:** Both responses appear correctly
**Risk Check:** No duplicate API calls, no memory growth

### Test Scenario 3: Stream Interruption

**Objective:** Verify graceful handling of aborted streams

**Steps:**
1. Start a tool-invoking query
2. Click "Stop" button during tool execution
3. Send a new message

**Expected:** Previous partial response preserved, new message works
**Risk Check:** No duplicate tool executions

### Test Scenario 4: Error Recovery

**Objective:** Test error handling in resume stream

**Steps:**
1. Temporarily invalid ANTHROPIC_API_KEY
2. Start tool-invoking conversation
3. Observe error handling

**Expected:** User-friendly error message displayed
**Risk Check:** No silent failures, proper cleanup

### Test Scenario 5: Write Operation Safety

**Objective:** Verify no duplicate transactions

**Steps:**
1. Upload a small CSV file (3-5 transactions)
2. Confirm import
3. Check Transactions page for duplicates
4. Repeat import attempt

**Expected:** Duplicate detection prevents double-import
**Risk Check:** Verify `isDuplicate()` function works correctly

### Test Scenario 6: Long Conversations

**Objective:** Test 40-message context window

**Steps:**
1. Send 20+ messages in one session
2. Verify earlier messages still in context
3. Check memory usage in browser

**Expected:** Stable performance, no memory leaks

---

## Fix Strategy

### Recommended Order of Fixes

#### Phase 1: Critical Bug Fix (Blocking)

**Fix 1.1: Tool Input Accumulation**
**Priority:** P0 - Must fix first
**Dependency:** None
**File:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

The `content_block_start` event only captures the initial empty `input`. The actual input comes via `input_json_delta` events that are NOT currently handled. Add:

```typescript
if (event.type === 'content_block_delta') {
  if (event.delta.type === 'input_json_delta') {
    // Accumulate partial JSON input
    const toolCall = toolCalls.find(tc => tc.id === /* current block id */)
    if (toolCall) {
      // Accumulate partial input
    }
  }
}
```

**Risk:** LOW - Additive change, doesn't break existing flow

**Fix 1.2: Resume Stream Error Handling**
**Priority:** P0 - Prevents silent failures
**Dependency:** None
**File:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

Wrap resume stream iteration in try-catch with retry logic:

```typescript
try {
  for await (const resumeEvent of resumeStream) {
    // ... existing logic
  }
} catch (error) {
  console.error('Resume stream error:', error)
  // Send error to client
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Tool result processing failed' })}\n\n`))
  controller.close()
}
```

**Risk:** LOW - Adds safety without changing happy path

#### Phase 2: Data Integrity (High Priority)

**Fix 2.1: Tool Call Deduplication**
**Priority:** P1 - Prevents duplicate transactions
**Dependency:** Fix 1.1 (need correct tool inputs first)
**File:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

Track executed tool IDs in request scope:

```typescript
const executedToolIds = new Set<string>()

// Before tool execution:
const toolsToExecute = toolCalls.filter(tc => !executedToolIds.has(tc.id))
for (const tc of toolsToExecute) {
  executedToolIds.add(tc.id)
  // ... execute
}
```

**Risk:** LOW - Additive, no behavior change for non-duplicates

#### Phase 3: Reliability Improvements (Should-Have)

**Fix 3.1: Rate Limiter Cleanup**
**Priority:** P2 - Prevents memory leak
**Dependency:** None (independent)
**File:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

```typescript
// Add after rateLimitStore definition
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt + 60000) { // 1 min after reset
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Every minute
```

**Risk:** VERY LOW - Cleanup only, no functional impact

**Fix 3.2: Session Title Transactional Update**
**Priority:** P3 - UI polish
**Dependency:** None (independent)
**File:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

Move title generation to message save block, use transaction:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.chatMessage.create({ ... })
  const count = await tx.chatMessage.count({ where: { sessionId } })
  if (count === 2) {
    const first = await tx.chatMessage.findFirst({ ... })
    await tx.chatSession.update({ ... })
  }
})
```

**Risk:** LOW - Same behavior, just atomic

#### Phase 4: UX Improvements (Nice-to-Have)

**Fix 4.1: Tool Execution Indicator**
**Priority:** P3 - UX improvement
**Dependency:** None
**Files:**
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatMessage.tsx`
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

Send SSE event before tool execution:
```typescript
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ toolExecuting: toolCalls.map(t => t.name) })}\n\n`))
```

Handle in client:
```typescript
if (event.toolExecuting) {
  // Show "Analyzing..." indicator
}
```

**Risk:** LOW - Additive, backward compatible

### Fix Dependency Graph

```
Fix 1.1 (Tool Input Accumulation)
    |
    v
Fix 1.2 (Error Handling) -----> Fix 2.1 (Deduplication)
    |
    |--- Independent ---+
                        |
        Fix 3.1 (Rate Limiter Cleanup)
        Fix 3.2 (Session Title)
        Fix 4.1 (Tool Indicator)
```

### Safe Refactoring Approach

1. **Do NOT change SSE protocol** - Client parsing already works
2. **Do NOT change database schema** - Migration complexity unnecessary
3. **Do NOT upgrade Anthropic SDK** - Risk of zod conflicts
4. **Add, don't replace** - Wrap existing code, don't rewrite
5. **Test incrementally** - Each fix should be testable independently

---

## Critical Risks Summary

### Risk Matrix

| Risk | Severity | Likelihood | Impact | Mitigation Priority |
|------|----------|------------|--------|---------------------|
| Empty tool responses | HIGH | CERTAIN | User cannot use AI features | P0 - Fix first |
| Duplicate transactions | HIGH | MEDIUM | Data integrity | P1 - Fix second |
| Resume stream silent fail | MEDIUM | LOW | Silent errors | P0 - Fix with main bug |
| Memory leak | MEDIUM | LOW | Long-term stability | P2 - Easy fix |
| Session title stuck | LOW | LOW | UI annoyance | P3 - Polish |

### Backward Compatibility

**Existing Chat Sessions:**
- Database schema unchanged - all existing sessions preserved
- Message format unchanged - old messages will display correctly
- No migration needed

**API Compatibility:**
- SSE protocol unchanged - existing client code works
- tRPC routes unchanged - no client updates needed
- Only internal streaming logic changes

### What NOT to Touch

1. **Type definitions** (`/src/types/chat.ts`) - Already correct
2. **Chat router** (`/src/server/api/routers/chat.router.ts`) - Working correctly
3. **Prisma schema** - No changes needed
4. **Client-side state management** - Works once server sends correct data

---

## Recommendations for Master Plan

1. **Single iteration is sufficient** - All fixes are localized to 2 main files
2. **Estimated duration:** 4-6 hours for all fixes
3. **Critical path:** Fix 1.1 -> Fix 1.2 -> Fix 2.1 (3 hours)
4. **Testing overhead:** 1-2 hours for comprehensive manual testing
5. **Rollback strategy:** Git revert single commit if issues arise

---

*Exploration completed: 2025-12-03*
*This report informs master planning decisions*
