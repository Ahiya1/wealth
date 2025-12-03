# Builder Task Breakdown

## Overview

3 primary builders will work in parallel on the same file.
All builders modify: `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

## Builder Assignment Strategy

- Builder 1 implements the core fix (CRITICAL)
- Builder 2 adds error recovery on top of Builder 1's changes
- Builder 3 adds cleanup and logging (independent of Builder 1 and 2)
- Integration should merge Builder 1 first, then 2, then 3

---

## Builder-1: Fix Tool Input Accumulation (CRITICAL)

### Scope

Fix the root cause bug where `input_json_delta` events are not handled, causing tool calls to execute with empty `{}` inputs. This is the most critical task and must be completed for tools to work.

### Complexity Estimate

**MEDIUM**

Changes are additive - adding new event handlers without modifying existing logic.

### Success Criteria

- [ ] State variables `currentToolIndex` and `toolInputJsonFragments` are declared after line 197
- [ ] `content_block_start` handler initializes accumulation state (`currentToolIndex++`, `toolInputJsonFragments[index] = ''`)
- [ ] `input_json_delta` handler accumulates `partial_json` fragments
- [ ] `content_block_stop` handler parses accumulated JSON and assigns to `toolCalls[index].input`
- [ ] JSON parse errors are caught and logged (not thrown)
- [ ] Resume stream section (lines 284-338) has equivalent handlers for nested tool calls
- [ ] Tools execute with complete, valid input parameters

### Files to Modify

- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

### Line-by-Line Changes

**1. Add state variables after line 197:**

```typescript
// Line 196-197 (existing)
let fullContent = ''
const toolCalls: Array<{ id: string; name: string; input: any }> = []

// ADD AFTER:
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []
```

**2. Modify `content_block_start` handler (lines 213-221):**

```typescript
// Replace lines 213-221 with:
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    currentToolIndex++
    toolInputJsonFragments[currentToolIndex] = ''
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: {},  // Will be populated from input_json_delta events
    })
  }
}
```

**3. Add `input_json_delta` handler inside `content_block_delta` block (after line 209):**

```typescript
// After line 209, inside the content_block_delta block:
if (event.delta.type === 'input_json_delta') {
  if (currentToolIndex >= 0) {
    toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
  }
}
```

**4. Add `content_block_stop` handler (after line 221):**

```typescript
// Add new handler after content_block_start handler:
if (event.type === 'content_block_stop') {
  if (currentToolIndex >= 0 && toolInputJsonFragments[currentToolIndex]) {
    try {
      const parsedInput = JSON.parse(toolInputJsonFragments[currentToolIndex])
      toolCalls[currentToolIndex].input = parsedInput
    } catch (parseError) {
      console.error('[Chat] Failed to parse tool input JSON:', parseError)
      console.error('[Chat] Raw fragments:', toolInputJsonFragments[currentToolIndex])
      // Keep input as {} - tool will handle gracefully
    }
  }
}
```

**5. Add equivalent handlers to resume stream section (lines 284-338):**

Before the `for await (const resumeEvent of resumeStream)` loop, add:

```typescript
// State for resume stream nested tool calls
let resumeToolIndex = -1
const resumeToolInputJsons: string[] = []
const resumeToolCalls: Array<{ id: string; name: string; input: any }> = []
```

Inside the resume stream loop, add handlers for:
- `content_block_start` with `tool_use` type
- `content_block_delta` with `input_json_delta` type
- `content_block_stop`

(Follow the pattern in `patterns.md` - "Resume Stream Pattern (Complete)")

### Dependencies

**Depends on:** Nothing - this is the foundation
**Blocks:** Builder 2 (error recovery wraps this logic)

### Implementation Notes

- The `input` field in `content_block_start` is ALWAYS `{}` - this is by design in Claude's API
- Tool inputs arrive incrementally via `input_json_delta` events
- `content_block_stop` signals that all fragments have been sent
- Track by index because multiple tools can be requested in sequence
- Resume stream needs the same handling for nested tool calls

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Input JSON Delta Accumulation" pattern for the core fix
- Use "Try-Catch with Logging" pattern for JSON parsing
- Use "Resume Stream Pattern (Complete)" for nested tool handling

### Testing Requirements

- Test query requiring tool: "What's my account balance?"
- Verify tool executes with actual parameters (not empty `{}`)
- Verify tool response appears in chat
- Check console logs show correct tool inputs

---

## Builder-2: Error Recovery & Deduplication (HIGH)

### Scope

Add retry logic with exponential backoff for the resume stream, and add tool call deduplication to prevent re-execution of duplicate tool calls.

### Complexity Estimate

**MEDIUM**

Wraps existing logic in try-catch, adds filtering before tool execution.

### Success Criteria

- [ ] Resume stream creation (line 274) is wrapped in try-catch
- [ ] Retry logic attempts up to 2 retries with exponential backoff (1s, 2s)
- [ ] On final failure, error message is sent to client via SSE
- [ ] Tool calls are deduplicated by ID before execution
- [ ] Duplicate tool calls are logged as warnings
- [ ] Improved error messages are user-friendly (not technical)

### Files to Modify

- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

### Implementation Details

**1. Add tool call deduplication before tool execution (before line 227):**

```typescript
// Before: const toolResults = await Promise.all(toolCalls.map(...))
// Add:
const seenToolIds = new Set<string>()
const uniqueToolCalls = toolCalls.filter((tc) => {
  if (seenToolIds.has(tc.id)) {
    console.warn('[Chat] Skipping duplicate tool call:', tc.id, tc.name)
    return false
  }
  seenToolIds.add(tc.id)
  return true
})

// Then use uniqueToolCalls instead of toolCalls in Promise.all:
const toolResults = await Promise.all(
  uniqueToolCalls.map(async (toolCall) => {
    // ... existing code
  })
)
```

**2. Wrap resume stream in retry logic (around lines 273-338):**

```typescript
// Replace the single resumeStream creation with retry loop:
let resumeAttempt = 0
const maxResumeAttempts = 2

while (resumeAttempt <= maxResumeAttempts) {
  try {
    const resumeStream = await claude.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: claudeMessages,
      tools: getToolDefinitions(),
    })

    // Process resume stream (Builder 1's code goes here)
    for await (const resumeEvent of resumeStream) {
      // ... event handling
    }

    break  // Success - exit retry loop

  } catch (resumeError) {
    resumeAttempt++
    console.error(`[Chat] Resume stream attempt ${resumeAttempt} failed:`, resumeError)

    if (resumeAttempt > maxResumeAttempts) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        error: 'Failed to process tool results. Please try again.'
      })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
      return
    }

    // Exponential backoff: 1s, 2s
    await new Promise(resolve => setTimeout(resolve, 1000 * resumeAttempt))
  }
}
```

**3. Also update the toolCalls array reference in claudeMessages.push (line 260-266):**

Use `uniqueToolCalls` instead of `toolCalls` when building the assistant message:

```typescript
claudeMessages.push({
  role: 'assistant' as const,
  content: uniqueToolCalls.map((tc) => ({
    type: 'tool_use' as const,
    id: tc.id,
    name: tc.name,
    input: tc.input,
  })) as any,
})
```

### Dependencies

**Depends on:** Builder 1 (wraps their resume stream logic)
**Blocks:** Nothing

### Implementation Notes

- Retry logic should wrap the entire resume stream creation and processing
- Exponential backoff: 1000ms * attempt (1s, 2s)
- Max 2 retries means 3 total attempts
- Send user-friendly error message, not technical details
- Always send [DONE] after error to properly close the stream

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Resume Stream with Retry" pattern
- Use "Tool Call Deduplication" pattern

### Testing Requirements

- Manually test with network throttling to trigger retry
- Verify retry messages appear in server console
- Verify user sees friendly error message on failure
- Verify no duplicate tool executions

---

## Builder-3: Rate Limiter Cleanup & Logging (MEDIUM)

### Scope

Add periodic cleanup for the rate limiter Map to prevent memory leaks, and add structured logging for tool execution to aid debugging.

### Complexity Estimate

**LOW**

Additive changes - new setInterval at module level, new console.log statements.

### Success Criteria

- [ ] setInterval runs every 5 minutes to clean expired rate limit entries
- [ ] Cleanup only logs when entries are actually removed
- [ ] Tool execution start is logged with tool name and input
- [ ] Tool execution completion is logged with success/failure status
- [ ] Tool execution timing is logged in milliseconds
- [ ] All logs are prefixed with `[Chat]` for filtering

### Files to Modify

- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

### Implementation Details

**1. Add rate limiter cleanup after line 53 (after checkRateLimit function):**

```typescript
// After the checkRateLimit function, add:

// Cleanup expired rate limit entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  let cleanedCount = 0

  for (const [userId, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(userId)
      cleanedCount++
    }
  }

  if (cleanedCount > 0) {
    console.log('[Chat] Rate limiter cleanup:', cleanedCount, 'entries removed')
  }
}, CLEANUP_INTERVAL_MS)
```

**2. Add logging inside tool execution (around lines 227-255):**

```typescript
const toolResults = await Promise.all(
  toolCalls.map(async (toolCall) => {
    // ADD: Log tool execution start
    console.log('[Chat] Executing tool:', toolCall.name, 'with input:', JSON.stringify(toolCall.input))
    const startTime = Date.now()

    try {
      const result = await executeToolCall(
        toolCall.name,
        toolCall.input,
        user.id,
        prisma
      )

      // ADD: Log success with timing
      const duration = Date.now() - startTime
      console.log('[Chat] Tool completed:', toolCall.name, `(${duration}ms)`, 'success: true')

      return {
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        content: JSON.stringify(result),
      }
    } catch (error) {
      // ADD: Log failure with timing
      const duration = Date.now() - startTime
      console.error('[Chat] Tool failed:', toolCall.name, `(${duration}ms)`, error)

      return {
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        is_error: true,
        content: error instanceof Error ? error.message : 'Tool execution failed',
      }
    }
  })
)
```

**3. Add logging for resume stream events (optional, if time permits):**

```typescript
// At resume stream start:
console.log('[Chat] Resuming stream with', toolResults.length, 'tool results')

// At resume stream completion:
console.log('[Chat] Resume stream completed')
```

### Dependencies

**Depends on:** Nothing - independent of Builder 1 and 2
**Blocks:** Nothing

### Implementation Notes

- The setInterval runs at module level, so it persists across requests
- Only log cleanup when entries are actually removed (avoid log spam)
- Use JSON.stringify for tool inputs to make them readable in logs
- Log timing helps identify slow tools
- Prefix all logs with `[Chat]` for easy filtering in production

### Patterns to Follow

Reference patterns from `patterns.md`:
- Use "Periodic Cleanup with setInterval" pattern
- Use "Structured Logging" pattern

### Testing Requirements

- Verify cleanup interval logs appear after 5 minutes (or reduce interval for testing)
- Verify tool execution logs appear with correct format
- Verify timing information is accurate
- Check server console for `[Chat]` prefixed logs

---

## Builder Execution Order

### Parallel Group (All can start simultaneously)

- Builder-1 (Core fix)
- Builder-2 (Error recovery) - but should merge AFTER Builder-1
- Builder-3 (Cleanup & logging) - can merge in any order

### Integration Order

1. **Merge Builder-1 first** - establishes the core fix
2. **Merge Builder-2 second** - wraps Builder-1's code in error handling
3. **Merge Builder-3 last** - adds independent logging

### Integration Notes

**Conflict Resolution:**

All builders modify the same file. Here's how to handle conflicts:

1. **Lines 196-200:** Builder-1 adds state variables here. Builder-3 doesn't touch this area.

2. **Lines 213-221:** Builder-1 modifies this block. Accept Builder-1's changes.

3. **Lines 227-255:** Builder-2 adds deduplication before this block. Builder-3 adds logging inside. Apply both:
   - First add Builder-2's deduplication (before the Promise.all)
   - Then add Builder-3's logging (inside the map callback)

4. **Lines 273-338:** Builder-1 adds nested tool handlers. Builder-2 wraps in retry. Apply Builder-1 first, then wrap with Builder-2's retry logic.

5. **After line 53:** Builder-3 adds setInterval. No conflict.

**Shared Files:**

Only one file is modified by all builders:
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

**Testing After Integration:**

1. Run type check: `npm run type-check`
2. Start dev server: `npm run dev`
3. Test all scenarios:
   - Simple query (no tools): "Hello"
   - Tool query: "What's my account balance?"
   - Date query: "Show spending for November"
   - Error case: Trigger tool error
4. Check server console for proper logging
