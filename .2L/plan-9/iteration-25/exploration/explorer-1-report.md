# Explorer 1 Report: Deep Dive into Streaming Route Code

## Executive Summary

The streaming route at `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` has a critical bug where `input_json_delta` events from Claude's streaming API are not handled. This causes tool calls to execute with empty `{}` inputs, leading to failed or useless tool results. The fix requires adding an event handler for `input_json_delta` events and accumulating JSON fragments until `content_block_stop`.

---

## 1. Current Event Handling Analysis

### Event Types Currently Handled

The streaming loop at lines 200-384 handles these Claude API events:

| Event Type | Delta Type | Lines | Purpose |
|------------|------------|-------|---------|
| `content_block_delta` | `text_delta` | 202-209 | Streams text chunks to client |
| `content_block_start` | `tool_use` | 213-221 | Captures tool ID and name (BUG: input is empty) |
| `message_delta` | - | 224-340 | Handles `stop_reason === 'tool_use'` |
| `message_stop` | - | 343-383 | Completes stream, saves message |

### Event Types NOT Handled (The Bug)

| Missing Event | Delta Type | Impact |
|---------------|------------|--------|
| `content_block_delta` | `input_json_delta` | **CRITICAL: Tool inputs never captured** |
| `content_block_stop` | - | **IMPORTANT: Tool input JSON never finalized** |

### Current Problematic Code (Lines 200-221)

```typescript
// Process streaming events
for await (const event of claudeStream) {
  // Handle text deltas
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const text = event.delta.text
      fullContent += text

      // Send text chunk as SSE event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
    }
    // BUG: No handler for event.delta.type === 'input_json_delta'
  }

  // Handle tool use blocks
  if (event.type === 'content_block_start') {
    if (event.content_block.type === 'tool_use') {
      toolCalls.push({
        id: event.content_block.id,
        name: event.content_block.name,
        input: event.content_block.input,  // BUG: This is ALWAYS {} at block start!
      })
    }
  }
  // BUG: No handler for event.type === 'content_block_stop'
```

### Where `input_json_delta` Should Be Handled

**Exact insertion point: After line 209, before line 210**

The fix should be within the `content_block_delta` handler block:

```typescript
if (event.type === 'content_block_delta') {
  if (event.delta.type === 'text_delta') {
    // ... existing code ...
  }
  // ADD NEW HANDLER HERE
  if (event.delta.type === 'input_json_delta') {
    // Accumulate JSON fragments
  }
}
```

---

## 2. Tool Call Flow Analysis

### How Tool Calls Are Currently Collected

**Declaration (Line 197):**
```typescript
const toolCalls: Array<{ id: string; name: string; input: any }> = []
```

**Collection (Lines 213-221):**
```typescript
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: event.content_block.input,  // Always {} here
    })
  }
}
```

### How Claude Actually Sends Tool Inputs

Claude's streaming API sends tool inputs like this:

```
Event 1: content_block_start
  {type: "tool_use", id: "toolu_abc123", name: "get_spending_summary", input: {}}

Event 2-N: content_block_delta (input_json_delta)
  {type: "input_json_delta", partial_json: '{"start'}
  {type: "input_json_delta", partial_json: 'Date":"2025-01-01","end'}
  {type: "input_json_delta", partial_json: 'Date":"2025-01-31"}'}

Event N+1: content_block_stop
  {index: 0, type: "content_block_stop"}
```

The full input JSON `{"startDate":"2025-01-01","endDate":"2025-01-31"}` is delivered piece-by-piece and must be accumulated.

### Where `toolCalls` Array Is Used

**1. Tool Execution (Lines 227-255):**
```typescript
const toolResults = await Promise.all(
  toolCalls.map(async (toolCall) => {
    try {
      const result = await executeToolCall(
        toolCall.name,
        toolCall.input,  // BUG: This is {} because input_json_delta not handled
        user.id,
        prisma
      )
      // ...
    }
  })
)
```

**2. Building Assistant Message (Lines 258-266):**
```typescript
claudeMessages.push({
  role: 'assistant' as const,
  content: toolCalls.map((tc) => ({
    type: 'tool_use' as const,
    id: tc.id,
    name: tc.name,
    input: tc.input,  // Also {} here
  })) as any,
})
```

**3. Saving to Database (Line 302):**
```typescript
await prisma.chatMessage.create({
  data: {
    sessionId,
    role: 'assistant',
    content: fullContent,
    toolCalls: toolCalls,  // Saved with empty inputs
  },
})
```

### What Happens When `stop_reason === 'tool_use'`

**Lines 224-340 handle this:**

1. **Detect tool_use stop (Line 225):**
   ```typescript
   if (event.delta.stop_reason === 'tool_use') {
   ```

2. **Execute tools (Lines 227-255):**
   - Maps over `toolCalls` array
   - Calls `executeToolCall()` with empty `{}` input (THE BUG)
   - Wraps results in `tool_result` format

3. **Build continuation messages (Lines 257-271):**
   - Adds assistant message with tool_use blocks
   - Adds user message with tool_result blocks

4. **Create resume stream (Lines 273-281):**
   - Makes new Claude API call with tool results
   - Same model/temperature/system prompt

5. **Process resume stream (Lines 283-338):**
   - Handles text_delta events (streams to client)
   - Handles message_stop (saves message, closes stream)

---

## 3. Resume Stream Logic Analysis

### How the Second Claude Call Is Made

**Lines 273-281:**
```typescript
// Resume streaming with tool results
const resumeStream = await claude.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 0.3,
  system: systemPrompt,
  messages: claudeMessages,  // Now includes tool_use + tool_result
  tools: getToolDefinitions(),
})
```

**Message structure at this point:**
```typescript
claudeMessages = [
  ...history,                           // Previous messages
  { role: 'user', content: userMessage }, // Current user message
  { role: 'assistant', content: [         // Tool use block
    { type: 'tool_use', id: '...', name: '...', input: {} }  // Empty!
  ]},
  { role: 'user', content: [              // Tool results
    { type: 'tool_result', tool_use_id: '...', content: '{"error":...}' }
  ]}
]
```

### Where Resume Stream Connects to SSE

**Lines 284-338:**
```typescript
for await (const resumeEvent of resumeStream) {
  if (resumeEvent.type === 'content_block_delta') {
    if (resumeEvent.delta.type === 'text_delta') {
      const text = resumeEvent.delta.text
      fullContent += text
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
      )
    }
  }

  if (resumeEvent.type === 'message_stop') {
    // Save message, update session, send [DONE]
  }
}
```

### Gaps in Resume Stream Handling

| Gap | Lines | Impact | Fix Needed |
|-----|-------|--------|------------|
| No `input_json_delta` handling | 284-293 | If Claude requests nested tool calls, they fail too | Yes |
| No error wrapping | 273-338 | If resume stream throws, whole request fails | Optional |
| No `content_block_stop` handling | 284-338 | Would be needed for nested tool calls | Optional |

**Note:** The resume stream has the same missing handlers as the initial stream. If Claude makes nested tool calls (tool calls after tool results), they would also fail.

---

## 4. Recommended Code Changes

### Change 1: Add Tool Input Accumulation State (CRITICAL)

**Location:** After line 197, before line 199

**Add these variables:**
```typescript
let fullContent = ''
const toolCalls: Array<{ id: string; name: string; input: any }> = []

// ADD THESE NEW VARIABLES:
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []
```

### Change 2: Update `content_block_start` Handler (CRITICAL)

**Location:** Lines 213-221

**Current code:**
```typescript
// Handle tool use blocks
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: event.content_block.input,
    })
  }
}
```

**Replace with:**
```typescript
// Handle tool use blocks
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

### Change 3: Add `input_json_delta` Handler (CRITICAL)

**Location:** After line 209 (inside the `content_block_delta` block)

**Insert this code:**
```typescript
if (event.type === 'content_block_delta') {
  if (event.delta.type === 'text_delta') {
    const text = event.delta.text
    fullContent += text
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
  }
  
  // ADD THIS NEW HANDLER:
  if (event.delta.type === 'input_json_delta') {
    // Accumulate JSON fragments for the current tool
    if (currentToolIndex >= 0) {
      toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
    }
  }
}
```

### Change 4: Add `content_block_stop` Handler (CRITICAL)

**Location:** After the `content_block_start` handler (after line 221)

**Insert this code:**
```typescript
// Handle content block completion - finalize tool input JSON
if (event.type === 'content_block_stop') {
  // Parse accumulated JSON for tool inputs
  if (currentToolIndex >= 0 && toolInputJsonFragments[currentToolIndex]) {
    try {
      const parsedInput = JSON.parse(toolInputJsonFragments[currentToolIndex])
      toolCalls[currentToolIndex].input = parsedInput
    } catch (parseError) {
      console.error('Failed to parse tool input JSON:', parseError)
      console.error('Raw JSON:', toolInputJsonFragments[currentToolIndex])
      // Keep input as {} if parse fails - tool will handle gracefully
    }
  }
}
```

### Change 5: Add Same Handlers to Resume Stream (IMPORTANT)

**Location:** Lines 284-338 (resume stream processing)

The resume stream needs the same handlers for nested tool calls. Add:

```typescript
// Reset state for resume stream nested tool calls
let resumeToolIndex = -1
const resumeToolInputJsons: string[] = []
const resumeToolCalls: Array<{ id: string; name: string; input: any }> = []

for await (const resumeEvent of resumeStream) {
  if (resumeEvent.type === 'content_block_delta') {
    if (resumeEvent.delta.type === 'text_delta') {
      const text = resumeEvent.delta.text
      fullContent += text
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
      )
    }
    
    // Handle nested tool inputs
    if (resumeEvent.delta.type === 'input_json_delta') {
      if (resumeToolIndex >= 0) {
        resumeToolInputJsons[resumeToolIndex] += resumeEvent.delta.partial_json
      }
    }
  }

  // Handle nested tool block start
  if (resumeEvent.type === 'content_block_start') {
    if (resumeEvent.content_block.type === 'tool_use') {
      resumeToolIndex++
      resumeToolInputJsons[resumeToolIndex] = ''
      resumeToolCalls.push({
        id: resumeEvent.content_block.id,
        name: resumeEvent.content_block.name,
        input: {},
      })
    }
  }

  // Finalize nested tool inputs
  if (resumeEvent.type === 'content_block_stop') {
    if (resumeToolIndex >= 0 && resumeToolInputJsons[resumeToolIndex]) {
      try {
        resumeToolCalls[resumeToolIndex].input = JSON.parse(resumeToolInputJsons[resumeToolIndex])
      } catch (e) {
        console.error('Failed to parse resume tool input:', e)
      }
    }
  }

  // Note: Would need recursive tool handling for full nested tool support
  // For now, just handle text output from resume stream
  
  if (resumeEvent.type === 'message_stop') {
    // ... existing save/complete logic ...
  }
}
```

### Change 6: Add Error Recovery (OPTIONAL but Recommended)

**Location:** Wrap resume stream creation (around lines 273-281)

```typescript
// Resume streaming with tool results - with retry
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

    // Process resume stream...
    break  // Success, exit retry loop
    
  } catch (resumeError) {
    resumeAttempt++
    console.error(`Resume stream attempt ${resumeAttempt} failed:`, resumeError)
    
    if (resumeAttempt > maxResumeAttempts) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        error: 'Failed to process tool results. Please try again.'
      })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
      return
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * resumeAttempt))
  }
}
```

### Change 7: Add Deduplication (OPTIONAL)

**Location:** Before tool execution (around line 227)

```typescript
// Deduplicate tool calls by ID (safety measure)
const seenToolIds = new Set<string>()
const uniqueToolCalls = toolCalls.filter(tc => {
  if (seenToolIds.has(tc.id)) {
    console.warn(`Skipping duplicate tool call: ${tc.id}`)
    return false
  }
  seenToolIds.add(tc.id)
  return true
})

const toolResults = await Promise.all(
  uniqueToolCalls.map(async (toolCall) => {
    // ... existing execution logic ...
  })
)
```

---

## 5. Complete Fixed Code Section

Here is the complete fixed event handling section (lines 196-250):

```typescript
let fullContent = ''
const toolCalls: Array<{ id: string; name: string; input: any }> = []

// NEW: State for accumulating tool input JSON fragments
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []

// Process streaming events
for await (const event of claudeStream) {
  // Handle text deltas
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const text = event.delta.text
      fullContent += text
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
    }
    
    // NEW: Handle tool input JSON fragments
    if (event.delta.type === 'input_json_delta') {
      if (currentToolIndex >= 0) {
        toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
      }
    }
  }

  // Handle tool use block start
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

  // NEW: Handle content block stop - finalize tool input JSON
  if (event.type === 'content_block_stop') {
    if (currentToolIndex >= 0 && toolInputJsonFragments[currentToolIndex]) {
      try {
        const parsedInput = JSON.parse(toolInputJsonFragments[currentToolIndex])
        toolCalls[currentToolIndex].input = parsedInput
      } catch (parseError) {
        console.error('Failed to parse tool input JSON:', parseError)
        console.error('Raw fragments:', toolInputJsonFragments[currentToolIndex])
        // Keep input as {} - tool will handle gracefully
      }
    }
  }

  // Handle message completion (tool_use stop reason)
  if (event.type === 'message_delta') {
    if (event.delta.stop_reason === 'tool_use') {
      // ... rest of tool execution logic unchanged ...
    }
  }

  // Handle stream completion (no tools)
  if (event.type === 'message_stop') {
    // ... unchanged ...
  }
}
```

---

## 6. Testing Recommendations

### Manual Test Cases

1. **Simple query without tools:**
   - Send: "Hello, how are you?"
   - Expected: Text streams normally, no tool calls

2. **Query requiring tool call:**
   - Send: "What did I spend on groceries last month?"
   - Expected: Tool `get_transactions` called with category filter, results displayed

3. **Query with date parameters:**
   - Send: "Show my spending summary for November 2025"
   - Expected: Tool `get_spending_summary` called with correct dates, summary displayed

4. **Multiple tool calls:**
   - Send: "Compare my spending this month to last month"
   - Expected: Multiple tool calls execute correctly

5. **Error handling:**
   - Trigger a tool error (e.g., invalid date)
   - Expected: Graceful error message, not blank response

### Verification Points

After implementing the fix:

```javascript
// Add temporary logging to verify fix
if (event.type === 'content_block_stop') {
  console.log('Tool call finalized:', {
    index: currentToolIndex,
    name: toolCalls[currentToolIndex]?.name,
    input: toolCalls[currentToolIndex]?.input,  // Should NOT be {}
    rawFragments: toolInputJsonFragments[currentToolIndex]
  })
}
```

---

## 7. Summary

### Root Cause
Missing handler for `input_json_delta` events in the streaming loop.

### Critical Changes Required
1. Add `currentToolIndex` and `toolInputJsonFragments` state variables
2. Add `input_json_delta` handler inside `content_block_delta` block
3. Add `content_block_stop` handler to parse accumulated JSON
4. Update `content_block_start` handler to initialize accumulation state

### Files to Modify
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`

### Estimated Effort
- Core fix: ~1-2 hours
- Testing: ~1 hour
- Resume stream parity: ~30 minutes

### Risk Assessment
- **Low risk** - The fix adds new handlers without modifying existing logic
- **No breaking changes** - Existing text streaming continues to work
- **Backward compatible** - No client changes required for core fix

---

*Report generated: 2025-12-03*
*Explorer: 1*
*Focus: Streaming route code deep dive*
