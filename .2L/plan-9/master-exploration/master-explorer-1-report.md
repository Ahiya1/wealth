# Master Explorer 1: Architecture & Complexity Analysis

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Fix critical bugs in the AI chat feature where tool results are not being streamed to the client after tool execution, causing empty message boxes to appear.

---

## Current Architecture

### Overview

The AI chat system uses a Server-Sent Events (SSE) streaming architecture with Claude API tool calling:

```
Client (React) <--SSE--> Next.js API Route <--Stream--> Claude API
                              |
                              v
                         Tool Execution
                              |
                              v
                         Prisma/Database
```

### Key Components

1. **`/src/app/api/chat/stream/route.ts`** (410 lines)
   - Main streaming endpoint handling SSE responses
   - Manages Claude API streaming with tool calling
   - Handles tool execution and resume streaming
   - Saves messages to database

2. **`/src/components/chat/ChatInput.tsx`** (245 lines)
   - Client-side streaming handler
   - Parses SSE events and updates UI
   - Manages abort/cancel functionality
   - Handles file uploads

3. **`/src/components/chat/ChatPageClient.tsx`** (246 lines)
   - Chat state management
   - Manages local messages with optimistic updates
   - Coordinates streaming callbacks
   - Session management

4. **`/src/server/services/chat-tools.service.ts`** (965 lines)
   - 11 tool definitions for Claude API
   - Tool execution dispatcher
   - Zod validation schemas
   - Individual tool implementations

### Streaming Flow (Normal - No Tools)

```
1. User sends message via ChatInput
2. POST /api/chat/stream with {sessionId, message}
3. User message saved to DB
4. Claude API stream created with tool definitions
5. For each text_delta event:
   - Append to fullContent
   - Send SSE: data: {"text": "..."}\n\n
6. On message_stop:
   - Save assistant message to DB
   - Send SSE: data: [DONE]\n\n
7. Client receives text chunks, updates streaming message
8. On [DONE], refetch messages from DB
```

### Streaming Flow (With Tool Calls) - BUGGY PATH

```
1-4. Same as above
5. Claude requests tool_use:
   - content_block_start: {type: "tool_use", id, name, input}
6. On message_delta with stop_reason="tool_use":
   - Execute tools via executeToolCall()
   - Build tool results array
   - Add assistant message (tool_use) to claudeMessages
   - Add user message (tool_results) to claudeMessages
   - Create resumeStream with updated messages
7. Process resumeStream:
   - For text_delta: append to fullContent, send SSE
   - For message_stop: save message, send [DONE]
```

---

## Bug Root Cause Analysis

### Critical Bug: Tool Input Not Captured

**Location:** `/src/app/api/chat/stream/route.ts` lines 213-221

**The Problem:**

```typescript
// Handle tool use blocks
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: event.content_block.input,  // BUG: This is ALWAYS empty {}
    })
  }
}
```

**Root Cause Explanation:**

In Claude's streaming API, tool inputs are NOT delivered in the `content_block_start` event. They are delivered incrementally via `input_json_delta` events within `content_block_delta` events:

```
Event sequence from Claude:
1. content_block_start: {type: "tool_use", id: "toolu_123", name: "get_spending_summary", input: {}}
2. content_block_delta: {type: "input_json_delta", partial_json: '{"start'}
3. content_block_delta: {type: "input_json_delta", partial_json: 'Date": "2025'}
4. content_block_delta: {type: "input_json_delta", partial_json: '-09-01"}'}
5. content_block_stop
```

**Current code behavior:**
- Captures tool ID and name from `content_block_start` (correct)
- Captures `input: {}` which is always empty at block start (BUG)
- Never processes `input_json_delta` events to build the full input
- Executes tools with empty input -> tools fail or return nothing useful
- Resume stream receives empty/error tool results -> generates empty response

### Evidence from Code

The code only handles these event types:
1. `content_block_delta` with `text_delta` - text streaming
2. `content_block_start` with `tool_use` - captures tool info (but input is empty)
3. `message_delta` - checks for `tool_use` stop reason
4. `message_stop` - completion

**Missing handler for:**
- `content_block_delta` with `input_json_delta` type - CRITICAL MISSING

### Secondary Issues Identified

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| No `input_json_delta` handling | route.ts:202-210 | **CRITICAL** | Tool input always empty |
| No error recovery for resume stream | route.ts:273-338 | HIGH | If resume fails, user stuck |
| Tool call duplication risk | route.ts:197-220 | MEDIUM | Duplicate transactions possible |
| Memory leak in rate limiter | route.ts:36-53 | LOW | Memory grows over time |
| Session title update not transactional | route.ts:307-325 | LOW | "New Chat" title possible |

---

## Complexity Assessment

### Overall Complexity Rating

**MEDIUM**

**Rationale:**
1. Single critical bug with clear fix path (adding input_json_delta handler)
2. Well-structured existing code - just missing a case in the event loop
3. No architectural changes needed
4. Clear separation of concerns already exists
5. Existing patterns can be followed for the fix

### Files Requiring Changes

| File | Changes | Risk Level | Complexity |
|------|---------|------------|------------|
| `/src/app/api/chat/stream/route.ts` | Add input_json_delta handler, accumulate JSON | **MEDIUM** | Medium |
| `/src/components/chat/ChatInput.tsx` | Optional: Add tool execution indicator | **LOW** | Low |
| `/src/components/chat/ChatMessage.tsx` | Optional: Show tool execution state | **LOW** | Low |

### Risk Assessment

**Medium Risk Changes (route.ts):**
- Must correctly accumulate JSON fragments
- Must parse complete JSON only after block ends
- Must handle malformed JSON gracefully
- Must ensure tool execution happens with complete input

**Low Risk Changes (client):**
- Optional UI improvements
- No core logic changes
- Can be skipped for MVP

---

## Iteration Recommendation

### Recommendation: SINGLE ITERATION

**Rationale:**
1. Single root cause (missing event handler)
2. Fix is contained to one file for critical bug
3. Clear implementation path
4. No dependencies between fixes
5. Can be tested immediately with real Claude API

### Estimated Duration
**4-6 hours**

### Task Breakdown

#### Task 1: Fix Tool Input Capture (CRITICAL)
**Estimated: 2-3 hours**

```typescript
// Add state to accumulate tool input JSON
let currentToolIndex = -1
const toolInputJsons: string[] = []

// In the event loop, add handler:
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    currentToolIndex++
    toolInputJsons[currentToolIndex] = ''
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: {}, // Will be populated later
    })
  }
}

if (event.type === 'content_block_delta') {
  if (event.delta.type === 'input_json_delta') {
    // Accumulate JSON fragments
    toolInputJsons[currentToolIndex] += event.delta.partial_json
  }
}

if (event.type === 'content_block_stop') {
  // Parse accumulated JSON and update tool input
  if (currentToolIndex >= 0 && toolInputJsons[currentToolIndex]) {
    try {
      toolCalls[currentToolIndex].input = JSON.parse(toolInputJsons[currentToolIndex])
    } catch (e) {
      console.error('Failed to parse tool input JSON:', e)
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Tool inputs are correctly captured from streaming events
- [ ] `get_spending_summary` receives proper date parameters
- [ ] All 11 tools receive correct inputs
- [ ] JSON parsing errors are handled gracefully

#### Task 2: Add Error Recovery for Resume Stream (HIGH PRIORITY)
**Estimated: 1 hour**

```typescript
// Wrap resume stream in retry logic
let retries = 0
const maxRetries = 2

while (retries <= maxRetries) {
  try {
    const resumeStream = await claude.messages.stream({...})
    // Process stream...
    break // Success, exit retry loop
  } catch (error) {
    retries++
    if (retries > maxRetries) {
      // Send user-friendly error
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        error: 'Failed to get AI response. Please try again.'
      })}\n\n`))
      break
    }
    // Exponential backoff
    await new Promise(r => setTimeout(r, 1000 * retries))
  }
}
```

**Acceptance Criteria:**
- [ ] Resume stream failures trigger retry (up to 2 times)
- [ ] Exponential backoff between retries
- [ ] User sees friendly error message if all retries fail
- [ ] Errors are logged for debugging

#### Task 3: Add Tool Execution Indicator (OPTIONAL)
**Estimated: 1 hour**

Send SSE event when tool execution starts:
```typescript
// Before tool execution
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  toolExecuting: true,
  tools: toolCalls.map(t => t.name)
})}\n\n`))
```

Client handles indicator:
```typescript
if (event.toolExecuting) {
  setToolsExecuting(event.tools)
}
```

**Acceptance Criteria:**
- [ ] "Analyzing..." indicator shows during tool execution
- [ ] Indicator disappears when text starts streaming
- [ ] Works for all tool types

#### Task 4: Add Tool Call Deduplication (OPTIONAL)
**Estimated: 30 minutes**

Track executed tool call IDs to prevent re-execution:
```typescript
const executedToolIds = new Set<string>()

// Before execution
if (executedToolIds.has(toolCall.id)) {
  console.log(`Skipping duplicate tool call: ${toolCall.id}`)
  continue
}
executedToolIds.add(toolCall.id)
```

**Acceptance Criteria:**
- [ ] Same tool call ID not executed twice
- [ ] Write operations protected from duplicates

---

## Critical Findings

### 1. ROOT CAUSE IDENTIFIED

**The bug is NOT in how SSE sends data to the client.**
**The bug is NOT in the client receiving/displaying messages.**
**The bug IS in how tool inputs are captured from the Claude stream.**

The code reads `event.content_block.input` at `content_block_start`, but Claude delivers tool inputs incrementally via `input_json_delta` events that are never processed.

### 2. FIX IS STRAIGHTFORWARD

Adding a handler for `input_json_delta` events will fix the core issue:

```typescript
// Current: Only handles text_delta
if (event.delta.type === 'text_delta') { ... }

// Need to add: Handle input_json_delta
if (event.delta.type === 'input_json_delta') { ... }
```

### 3. EXISTING ARCHITECTURE IS SOUND

- SSE streaming is correctly implemented
- Client correctly parses and displays streamed text
- Tool execution infrastructure is correct
- Database operations are correct
- Only the event parsing is incomplete

### 4. NO ARCHITECTURAL CHANGES NEEDED

This is a targeted fix to the event loop, not a refactor. The existing code structure supports the fix without modification.

### 5. RESUME STREAM WORKS CORRECTLY

The resume stream code (lines 273-338) is correct. It fails silently because it receives empty tool results (due to the input bug), not because of streaming issues.

---

## Technology Stack (Existing)

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Streaming | Server-Sent Events (SSE) |
| AI | Claude API (claude-sonnet-4-5-20250929) |
| Database | PostgreSQL via Prisma |
| Auth | Supabase Auth |
| State | React useState + tRPC |
| Validation | Zod |

---

## Recommendations for Master Plan

1. **Single iteration is sufficient** - The core bug is a missing event handler, not an architectural problem.

2. **Prioritize Task 1 (input_json_delta)** - This alone will fix 90% of the user-facing issues.

3. **Task 2 (error recovery) is high value** - Adds resilience without much complexity.

4. **Tasks 3-4 are optional polish** - Can be deferred if time is limited.

5. **Test with real API** - The fix cannot be unit tested effectively; manual testing with actual Claude API is essential.

---

## Notes & Observations

- The code shows "Iteration 22" in comments, indicating significant prior development
- The tool service is well-designed with proper validation and error handling
- Rate limiting exists but has a memory leak (low priority)
- Session title generation is functional but could fail silently (low priority)
- File upload handling appears complete but wasn't analyzed in depth

---

*Exploration completed: 2025-12-03T19:58:00+02:00*
*This report informs master planning decisions*
