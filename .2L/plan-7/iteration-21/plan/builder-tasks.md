# Builder Task Breakdown - Iteration 21

## Overview

This iteration requires **3 primary builders** working in parallel with clear, non-overlapping responsibilities:

- **Builder 1:** Database & Backend Core (6-7 hours)
- **Builder 2:** SSE Streaming Route (4-5 hours)
- **Builder 3:** Frontend Components (5-6 hours)

**Total Estimated Time:** 16-20 hours

**Integration Strategy:** Sequential merge (Builder 1 → Builder 2 → Builder 3)

---

## Builder 1: Database & Backend Core

### Scope

Implement database models, tRPC router for session management, and tool service for Claude API integration. This builder creates the foundation that both Builder 2 and Builder 3 depend on.

### Complexity Estimate

**MEDIUM-HIGH**

- Database schema design: LOW (2 simple models)
- tRPC router: MEDIUM (5 procedures with auth validation)
- Tool service: MEDIUM-HIGH (6 tools + tRPC caller integration)
- Claude API integration: MEDIUM (existing pattern to follow)

### Success Criteria

- [ ] ChatSession and ChatMessage models created in Prisma schema
- [ ] `npx prisma generate` runs successfully
- [ ] `npx prisma db push` creates tables in database
- [ ] tRPC router exports chatRouter with 5 procedures
- [ ] chatRouter added to src/server/api/root.ts
- [ ] chat-tools.service.ts exports 6 tool definitions
- [ ] All tools execute successfully when called with test data
- [ ] TypeScript types exported in src/types/chat.ts
- [ ] No TypeScript errors in backend code

### Files to Create

**Total Estimated Lines: 1,100-1,300**

1. **prisma/schema.prisma** (modify, +50 lines)
   - Add ChatSession model (15 lines)
   - Add ChatMessage model (15 lines)
   - Add User relation to ChatSession (2 lines)
   - Add indexes (4 lines per model)

2. **src/types/chat.ts** (100-120 lines)
   - ChatSession interface
   - ChatMessage interface
   - ToolCall interface
   - ToolResult interface
   - API request/response types

3. **src/server/api/routers/chat.router.ts** (400-450 lines)
   - listSessions procedure
   - getSession procedure
   - createSession procedure
   - deleteSession procedure
   - getMessages procedure
   - Ownership validation logic
   - Error handling

4. **src/server/services/chat-tools.service.ts** (500-600 lines)
   - getToolDefinitions() - returns 6 tool schemas for Claude
   - executeToolCall() - dispatcher for tool execution
   - executeTool_getTransactions() - transaction query tool
   - executeTool_getSpendingSummary() - spending summary tool
   - executeTool_getBudgetStatus() - budget status tool
   - executeTool_getAccountBalances() - account balances tool
   - executeTool_getCategories() - category list tool
   - executeTool_searchTransactions() - transaction search tool
   - Zod validation schemas
   - Serialization helpers (Prisma to JSON)

5. **src/server/api/root.ts** (modify, +2 lines)
   - Import chatRouter
   - Add to appRouter

6. **.env.example** (modify, +5 lines)
   - Document WEALTH_AI_ENABLED flag

### Dependencies

**Depends on:** None (foundational)

**Blocks:**
- Builder 2 (needs tRPC types and tool service)
- Builder 3 (needs tRPC router and types)

### Implementation Notes

**Database Models:**
- Use `@db.Text` for ChatMessage.content (unbounded length)
- Use `Json` type for toolCalls and toolResults (flexible structure)
- Add composite indexes: `[userId, updatedAt(sort: Desc)]`, `[sessionId, createdAt(sort: Asc)]`
- Cascade delete: user deletion deletes sessions and messages

**tRPC Router:**
- Follow pattern from transactions.router.ts (488 lines reference)
- Use `protectedProcedure` for all procedures
- Validate session ownership on getSession, deleteSession, getMessages
- Return `TRPCError` with appropriate codes (NOT_FOUND, UNAUTHORIZED)
- Use Zod for input validation

**Tool Service:**
- Use `createCaller` pattern to call existing tRPC procedures
- DO NOT duplicate query logic (reuse transactions.router, analytics.router, etc.)
- Validate tool input with Zod schemas before execution
- Serialize Prisma types (Date → ISO string, Decimal → number)
- Handle tool execution errors gracefully (return error object, not throw)

**Key Reference Files:**
- prisma/schema.prisma (existing models for pattern reference)
- src/server/api/routers/transactions.router.ts (tRPC router pattern)
- src/server/services/categorize.service.ts (Claude API usage pattern)
- src/lib/services/duplicate-detection.service.ts (pure function pattern)

### Testing Requirements

**Manual Tests:**
1. Create session via tRPC: `trpc.chat.createSession.mutate()`
2. List sessions: `trpc.chat.listSessions.query()`
3. Get messages: `trpc.chat.getMessages.query({ sessionId })`
4. Delete session: `trpc.chat.deleteSession.mutate({ id })`
5. Execute each tool with test data (use console.log to verify output)

**Validation:**
- Ownership validation: Try accessing another user's session (should fail)
- Input validation: Send invalid tool params (should throw Zod error)
- Database: Verify tables created with correct schema

### Patterns to Follow

**From patterns.md:**
- Database Patterns: Prisma Schema Convention, Query Pattern, Mutation Pattern
- tRPC Router Patterns: Router Structure, Error Handling
- Service Layer Patterns: Tool Service Structure, createCaller usage

**Import Order:**
```typescript
// 1. React/Next.js (if applicable)
// 2. Third-party (z, Anthropic)
// 3. Internal lib (@/lib/prisma)
// 4. Internal server (@/server/api/trpc)
// 5. Types (type imports last)
```

### Potential Split Strategy

If complexity proves too high, consider splitting:

**Foundation (Primary Builder 1):**
- Database models (prisma/schema.prisma)
- TypeScript types (src/types/chat.ts)
- tRPC router skeleton (chat.router.ts with empty procedures)

**Sub-builder 1A: tRPC Router Implementation**
- Implement all 5 tRPC procedures
- Add validation and error handling
- Estimated: 2-3 hours

**Sub-builder 1B: Tool Service Implementation**
- Implement 6 tool functions
- Add tool definitions for Claude
- Add createCaller integration
- Estimated: 3-4 hours

---

## Builder 2: SSE Streaming Route

### Scope

Implement Server-Sent Events streaming route for real-time AI responses. This builder focuses on the streaming infrastructure and Claude API integration with streaming enabled.

### Complexity Estimate

**HIGH**

- SSE implementation: HIGH (new pattern for this codebase)
- Claude streaming API: MEDIUM (documented in Anthropic SDK)
- Rate limiting: LOW-MEDIUM (simple in-memory implementation)
- Error handling: MEDIUM (timeout, connection drops, partial responses)

### Success Criteria

- [ ] /api/chat/stream route responds to POST requests
- [ ] Unauthenticated requests return 401
- [ ] Rate limiting blocks users exceeding 10 messages/minute
- [ ] SSE events stream correctly (format: `data: {...}\n\n`)
- [ ] First text chunk arrives <1 second after request
- [ ] Complete response saved to database when streaming finishes
- [ ] Errors send error event and close gracefully
- [ ] Works on Chrome, Safari, Firefox (manual browser testing)

### Files to Create

**Total Estimated Lines: 250-300**

1. **src/app/api/chat/stream/route.ts** (250-300 lines)
   - POST handler with Supabase authentication
   - Feature flag check (WEALTH_AI_ENABLED)
   - Rate limiting logic (in-memory Map)
   - Request parsing and validation
   - Session ownership validation
   - User message save to database
   - Message history loading (last 40 messages)
   - System prompt building
   - Claude streaming API call
   - SSE event loop (text_delta events)
   - Assistant message save on completion
   - Error handling and timeout detection
   - Response headers (text/event-stream, no-cache)

### Dependencies

**Depends on:**
- Builder 1: ChatSession/ChatMessage models, TypeScript types
- Builder 1: Prisma client generated types

**Blocks:**
- Builder 3: Frontend needs this route to send messages

### Implementation Notes

**Authentication:**
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })
```

**Rate Limiting:**
- In-memory Map: `Map<userId, { count, resetAt }>`
- 10 messages per minute (60,000ms window)
- Return 429 status with `Retry-After` header

**SSE Format:**
```
data: {"text": "Hello"}\n\n
data: {"text": " world"}\n\n
data: [DONE]\n\n
```

**Streaming Loop:**
```typescript
for await (const event of claudeStream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    const text = event.delta.text
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
  }

  if (event.type === 'message_stop') {
    // Save to database
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
  }
}
```

**Error Handling:**
- Catch all errors in stream controller
- Send error event: `data: {"error": "message"}\n\n`
- Always close controller (prevent hanging connections)
- Log errors to console (future: Sentry)

**Tool Execution (Iteration 1):**
- NOT implemented in streaming route (too complex)
- Defer to non-streaming flow for tool use
- Streaming route only handles simple text responses

**Key Reference Files:**
- src/server/services/categorize.service.ts (Claude API usage)
- Anthropic SDK docs (streaming examples)

### Testing Requirements

**Manual Tests:**
1. Send POST request with valid session: `curl -X POST http://localhost:3000/api/chat/stream -d '{"sessionId": "...", "message": "Hello"}'`
2. Verify SSE format: Should see `data: {...}\n\n` chunks
3. Test rate limiting: Send 11 requests in 1 minute (11th should return 429)
4. Test unauthorized: Send request without auth (should return 401)
5. Test invalid session: Send request with wrong sessionId (should return 404)
6. Test on mobile: Send request from iPhone Safari (verify streaming works)

**Validation:**
- First token arrives <1 second
- Complete response saved to database
- Rate limiting resets after 1 minute
- Errors don't crash the route

### Patterns to Follow

**From patterns.md:**
- SSE Streaming Route Pattern: Complete implementation reference
- Error Handling Patterns: SSE Error Handling
- Service Layer Patterns: System prompt building

**Response Headers:**
```typescript
{
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}
```

### Potential Split Strategy

NOT RECOMMENDED - Streaming route is cohesive and splitting would add complexity.

If absolutely necessary:

**Foundation (Primary Builder 2):**
- Basic SSE echo server (no Claude, just echo input)
- Authentication and validation
- Estimated: 1-2 hours

**Sub-builder 2A: Claude Streaming Integration**
- Replace echo with Claude streaming
- Add system prompt building
- Add database saves
- Estimated: 2-3 hours

---

## Builder 3: Frontend Components

### Scope

Build ChatGPT-style UI with sidebar, message list, input, and SSE streaming client. This builder creates all user-facing components and integrates with Builder 1's tRPC router and Builder 2's SSE route.

### Complexity Estimate

**MEDIUM-HIGH**

- Component structure: MEDIUM (7 components, well-defined patterns)
- tRPC integration: LOW (existing pattern, hooks already set up)
- SSE client: MEDIUM-HIGH (new pattern, error handling complexity)
- Mobile responsive: MEDIUM (follow existing patterns)

### Success Criteria

- [ ] /chat page loads without errors
- [ ] User sees session list in sidebar
- [ ] "New Chat" button creates session and switches to it
- [ ] Delete button removes session (with confirmation)
- [ ] Message input accepts text and submits on Enter
- [ ] User message appears immediately in message list
- [ ] Streaming response updates in real-time (animated typing)
- [ ] Messages styled correctly (user: right-aligned, assistant: left-aligned)
- [ ] Mobile responsive (sidebar collapses, input stays at bottom)
- [ ] Loading states show during API calls
- [ ] Error messages display on failure

### Files to Create

**Total Estimated Lines: 1,400-1,600**

1. **src/app/(dashboard)/chat/page.tsx** (30 lines)
   - Server Component with auth check
   - Redirect to /signin if not authenticated
   - Render ChatPageClient

2. **src/components/chat/ChatPageClient.tsx** (350-400 lines)
   - Main client component with state management
   - tRPC queries: listSessions, getMessages
   - tRPC mutations: createSession, deleteSession
   - Session selection logic
   - Auto-select first session on load
   - Layout: sidebar + main area

3. **src/components/chat/ChatSidebar.tsx** (200-250 lines)
   - Session list with scroll
   - "New Chat" button at top
   - SessionListItem for each session
   - Active session highlighting
   - Empty state when no sessions
   - Mobile: collapsible sidebar

4. **src/components/chat/ChatMessageList.tsx** (200-250 lines)
   - Scrollable message area
   - Auto-scroll to bottom on new message
   - Reverse chronological display (newest at bottom)
   - Loading skeleton during initial load
   - Empty state with prompt suggestions

5. **src/components/chat/ChatMessage.tsx** (150-180 lines)
   - Message bubble with role-based styling
   - User messages: right-aligned, sage background
   - Assistant messages: left-aligned, white background
   - Timestamp display (relative time)
   - Markdown rendering (plain text for Iteration 1)

6. **src/components/chat/ChatInput.tsx** (250-300 lines)
   - Text input with auto-resize
   - Send button (disabled when empty or streaming)
   - Stop button during streaming
   - SSE streaming client logic
   - Timeout detection (30 seconds)
   - Error handling and retry
   - Mobile: fixed at bottom, safe-area-inset-bottom padding

7. **src/components/chat/StreamingIndicator.tsx** (75-100 lines)
   - Animated typing dots
   - Shows during streaming
   - Disappears when complete

8. **src/components/chat/SessionListItem.tsx** (100-120 lines)
   - Session title
   - Last message preview (first 50 chars)
   - Timestamp (relative)
   - Delete button (trash icon)
   - Active state styling

### Dependencies

**Depends on:**
- Builder 1: tRPC router (chatRouter), TypeScript types
- Builder 2: /api/chat/stream route

**Blocks:** None (final builder)

### Implementation Notes

**tRPC Integration:**
```typescript
const { data: sessions } = trpc.chat.listSessions.useQuery()
const createSession = trpc.chat.createSession.useMutation()
const deleteSession = trpc.chat.deleteSession.useMutation()
```

**SSE Streaming:**
```typescript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, message }),
  signal: abortController.signal,
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value, { stream: true })
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6)
    if (data === '[DONE]') return

    const event = JSON.parse(data)
    if (event.text) {
      // Update message state with streaming text
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1].content += event.text
        return updated
      })
    }
  }
}
```

**Mobile Responsive:**
- Sidebar: `hidden lg:block` (collapsed on mobile)
- Input: `fixed bottom-0` on mobile, `pb-safe` for keyboard
- Spacing: `space-y-4 sm:space-y-6` pattern
- Padding: `p-4 sm:p-6` pattern

**Component Reuse:**
- Button: `<Button>` from @/components/ui/button
- Card: `<Card>` for message bubbles
- Input: `<Input>` for text input
- Skeleton: `<Skeleton>` for loading states

**Styling Pattern:**
```typescript
// User message
<Card className="ml-8 bg-sage-50 dark:bg-sage-900/30">
  {message.content}
</Card>

// Assistant message
<Card className="mr-8 bg-white dark:bg-warm-gray-900">
  {message.content}
</Card>
```

**Key Reference Files:**
- src/app/(dashboard)/dashboard/page.tsx (page structure)
- src/components/transactions/TransactionList.tsx (list patterns)
- src/components/ui/button.tsx (shadcn/ui patterns)

### Testing Requirements

**Manual Tests:**
1. Create new session (verify appears in sidebar)
2. Switch between sessions (verify messages load correctly)
3. Delete session (verify confirmation dialog, session removed)
4. Send message (verify user message appears, streaming response arrives)
5. Cancel streaming (verify stop button works)
6. Test on mobile (verify sidebar collapses, input stays at bottom)
7. Test dark mode (verify colors correct)

**Validation:**
- No console errors
- tRPC queries refetch after mutations
- SSE streaming updates UI smoothly
- Mobile responsive (test on iPhone and Android)

### Patterns to Follow

**From patterns.md:**
- Frontend Component Patterns: Page Structure, Main Client Component, Chat Input with SSE Streaming
- Component Patterns: shadcn/ui usage, mobile-first responsive
- Import Order Convention

**State Management:**
```typescript
const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isStreaming, setIsStreaming] = useState(false)
```

### Potential Split Strategy

If complexity proves too high, consider splitting:

**Foundation (Primary Builder 3):**
- Chat page (page.tsx)
- ChatPageClient (main component with tRPC integration)
- ChatSidebar (session list)
- Estimated: 2-3 hours

**Sub-builder 3A: Message Display**
- ChatMessageList component
- ChatMessage component
- StreamingIndicator component
- Estimated: 2 hours

**Sub-builder 3B: Message Input & Streaming**
- ChatInput component with SSE client
- Error handling and retry logic
- Estimated: 2-3 hours

---

## Builder Execution Order

### Parallel Group 1 (Start simultaneously)

- **Builder 1** (Database & Backend Core)
  - No dependencies
  - Creates foundation for others

### Parallel Group 2 (After Builder 1 completes)

- **Builder 2** (SSE Streaming Route)
  - Depends on Builder 1's database models
  - Can start as soon as Builder 1 runs `npx prisma generate`

- **Builder 3** (Frontend Components)
  - Depends on Builder 1's tRPC router
  - Can start as soon as Builder 1 adds chatRouter to root.ts

### Integration Notes

**Merge Order:**
1. Merge Builder 1 first
   - Run `npx prisma generate`
   - Run `npx prisma db push`
   - Verify tRPC router accessible

2. Merge Builder 2 second
   - Test SSE route with curl/Postman
   - Verify streaming works

3. Merge Builder 3 last
   - Connect frontend to tRPC and SSE route
   - Test full end-to-end flow

**Potential Conflicts:**
- Minimal (each builder works on separate files)
- package.json: No changes expected
- prisma/schema.prisma: Only Builder 1 touches it
- src/server/api/root.ts: Only Builder 1 touches it

**Handoff Points:**
- Builder 1 → Builder 2: ChatSession/ChatMessage models, Prisma generated types
- Builder 1 → Builder 3: chatRouter, TypeScript types (src/types/chat.ts)
- Builder 2 → Builder 3: /api/chat/stream route (URL to call)

---

## Final Checklist

Before marking iteration complete:

- [ ] All 3 builders merged successfully
- [ ] `npm run build` succeeds with no errors
- [ ] Database migration applied: `npx prisma migrate dev --name add-chat-models`
- [ ] Manual testing complete (see Success Criteria for each builder)
- [ ] Mobile testing complete (iPhone Safari, Android Chrome)
- [ ] Rate limiting tested (10 messages in 1 minute)
- [ ] Error handling tested (network drop, timeout, invalid session)
- [ ] Code review: No console.log statements left, no `any` types
- [ ] Documentation: .env.example updated with WEALTH_AI_ENABLED

---

## Estimated Timeline

**Total: 16-20 hours**

- Builder 1: 6-7 hours
- Builder 2: 4-5 hours
- Builder 3: 5-6 hours
- Integration: 30 minutes
- Testing: 45 minutes
- Fixes: 1-2 hours buffer

**Parallel Execution:**
- Day 1 (8 hours): Builder 1 (6 hours) → Builder 2 starts (2 hours)
- Day 2 (8 hours): Builder 2 finishes (3 hours), Builder 3 (5 hours)
- Day 3 (4 hours): Integration, testing, fixes

**Sequential Execution (if builders work alone):**
- Builder 1: Days 1-2 (6-7 hours)
- Builder 2: Day 2-3 (4-5 hours)
- Builder 3: Day 3-4 (5-6 hours)
- Integration: Day 4 (30 minutes)
