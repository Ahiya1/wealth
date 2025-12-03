# Code Patterns & Conventions

## File Structure

```
/home/ahiya/Ahiya/2L/Prod/wealth/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── chat/
│   │           └── stream/
│   │               └── route.ts    <- PRIMARY FILE TO MODIFY
│   ├── components/
│   │   └── chat/                   <- No changes needed
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── supabase/
│   └── server/
│       └── services/
│           └── chat-tools.service.ts  <- Tool definitions (reference only)
└── prisma/
    └── schema.prisma
```

## Naming Conventions

- Variables: camelCase (`currentToolIndex`, `toolInputJsonFragments`)
- Constants: camelCase for module-level (`rateLimitStore`)
- Types/Interfaces: PascalCase (`RateLimitEntry`, `ToolCall`)
- Functions: camelCase (`checkRateLimit`, `executeToolCall`)

## Event Handling Patterns

### Pattern: Claude Stream Event Loop

**When to use:** Processing streaming events from Claude API

**Code example:**

```typescript
for await (const event of claudeStream) {
  // Handle text deltas - stream to client
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const text = event.delta.text
      fullContent += text
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
    }
  }

  // Handle tool use block start
  if (event.type === 'content_block_start') {
    if (event.content_block.type === 'tool_use') {
      // Process tool block start
    }
  }

  // Handle content block stop
  if (event.type === 'content_block_stop') {
    // Finalize any pending operations
  }

  // Handle message completion
  if (event.type === 'message_delta') {
    if (event.delta.stop_reason === 'tool_use') {
      // Execute tools and resume stream
    }
  }

  // Handle stream end
  if (event.type === 'message_stop') {
    // Save to database and close stream
  }
}
```

**Key points:**
- Use type guards to narrow event types
- Handle all relevant event types
- Order matters - some events depend on previous state

### Pattern: Input JSON Delta Accumulation (THE FIX)

**When to use:** Accumulating tool input JSON from streaming deltas

**Code example:**

```typescript
// State variables - declare before stream loop
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []
const toolCalls: Array<{ id: string; name: string; input: any }> = []

// Inside the stream loop:

// 1. On content_block_start (tool_use)
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    currentToolIndex++
    toolInputJsonFragments[currentToolIndex] = ''  // Initialize empty string
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: {},  // Will be populated later from deltas
    })
  }
}

// 2. On content_block_delta (input_json_delta)
if (event.type === 'content_block_delta') {
  if (event.delta.type === 'input_json_delta') {
    if (currentToolIndex >= 0) {
      toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
    }
  }
}

// 3. On content_block_stop
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

**Key points:**
- Initialize `toolInputJsonFragments[index]` as empty string on block start
- Accumulate `partial_json` on each delta
- Parse complete JSON on block stop
- Always wrap JSON.parse in try-catch
- Log raw fragments on parse failure for debugging

## Error Handling Patterns

### Pattern: Try-Catch with Logging

**When to use:** Wrapping risky operations like JSON parsing

**Code example:**

```typescript
try {
  const parsedInput = JSON.parse(jsonString)
  // Use parsedInput
} catch (parseError) {
  console.error('[Chat] Failed to parse tool input JSON:', parseError)
  console.error('[Chat] Raw JSON:', jsonString)
  // Graceful fallback - don't throw
}
```

**Key points:**
- Always log the error with context prefix `[Chat]`
- Log the raw data that caused the failure
- Provide graceful fallback instead of crashing

### Pattern: Resume Stream with Retry

**When to use:** Creating resume stream after tool execution

**Code example:**

```typescript
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
    for await (const resumeEvent of resumeStream) {
      // Handle events...
    }

    break  // Success - exit retry loop

  } catch (resumeError) {
    resumeAttempt++
    console.error(`[Chat] Resume stream attempt ${resumeAttempt} failed:`, resumeError)

    if (resumeAttempt > maxResumeAttempts) {
      // All retries exhausted - send error to client
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

**Key points:**
- Limit retries to prevent infinite loops (max 2 attempts)
- Use exponential backoff (1s, 2s)
- Always send error event and [DONE] on final failure
- Close controller after error

### Pattern: Tool Execution Error Handling

**When to use:** Wrapping individual tool calls

**Code example:**

```typescript
const toolResults = await Promise.all(
  toolCalls.map(async (toolCall) => {
    try {
      const result = await executeToolCall(
        toolCall.name,
        toolCall.input,
        userId,
        prisma
      )

      return {
        type: 'tool_result' as const,
        tool_use_id: toolCall.id,
        content: JSON.stringify(result),
      }
    } catch (error) {
      console.error('[Chat] Tool execution error:', toolCall.name, error)
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

**Key points:**
- Each tool call is individually wrapped
- Errors don't stop other tools from executing
- Return `is_error: true` for failed tools
- Extract error message safely with instanceof check

### Pattern: Tool Call Deduplication

**When to use:** Before executing tools to prevent duplicates

**Code example:**

```typescript
// Deduplicate tool calls by ID
const seenToolIds = new Set<string>()
const uniqueToolCalls = toolCalls.filter((tc) => {
  if (seenToolIds.has(tc.id)) {
    console.warn('[Chat] Skipping duplicate tool call:', tc.id, tc.name)
    return false
  }
  seenToolIds.add(tc.id)
  return true
})

// Execute only unique tool calls
const toolResults = await Promise.all(
  uniqueToolCalls.map(async (toolCall) => {
    // ... execution logic
  })
)
```

**Key points:**
- Use Set for O(1) lookup
- Log skipped duplicates for debugging
- Filter before Promise.all

## Logging Conventions

### Pattern: Structured Logging

**When to use:** All logging in the chat stream route

**Code example:**

```typescript
// Info level - tool execution start
console.log('[Chat] Executing tool:', toolCall.name, 'with input:', JSON.stringify(toolCall.input))

// Info level - tool execution complete
console.log('[Chat] Tool result:', toolCall.name, 'success:', !result.is_error)

// Info level - timing
const startTime = Date.now()
const result = await executeToolCall(...)
const duration = Date.now() - startTime
console.log('[Chat] Tool execution time:', toolCall.name, `${duration}ms`)

// Warning level
console.warn('[Chat] Skipping duplicate tool call:', toolCall.id)

// Error level
console.error('[Chat] Tool execution error:', toolCall.name, error)
console.error('[Chat] Failed to parse tool input JSON:', parseError)
console.error('[Chat] Raw fragments:', jsonString)
```

**Key points:**
- Always prefix with `[Chat]` for filtering
- Include context (tool name, IDs, inputs)
- Log timing for performance debugging
- Use appropriate level (log, warn, error)

## Rate Limiter Patterns

### Pattern: Periodic Cleanup with setInterval

**When to use:** Cleaning up expired rate limit entries

**Code example:**

```typescript
// At module level, after rateLimitStore declaration
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
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

**Key points:**
- Run cleanup less frequently than rate limit window (5min vs 1min)
- Only log if entries were actually removed
- Use for...of to safely delete during iteration

## Resume Stream Pattern (Complete)

**When to use:** After initial stream with tool calls

**Code example:**

```typescript
// Reset state for resume stream nested tool calls
let resumeToolIndex = -1
const resumeToolInputJsons: string[] = []
const resumeToolCalls: Array<{ id: string; name: string; input: any }> = []

for await (const resumeEvent of resumeStream) {
  // Handle text deltas
  if (resumeEvent.type === 'content_block_delta') {
    if (resumeEvent.delta.type === 'text_delta') {
      const text = resumeEvent.delta.text
      fullContent += text
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
    }

    // Handle nested tool input deltas
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
        resumeToolCalls[resumeToolIndex].input = JSON.parse(
          resumeToolInputJsons[resumeToolIndex]
        )
      } catch (e) {
        console.error('[Chat] Failed to parse resume tool input:', e)
      }
    }
  }

  // Handle stream completion
  if (resumeEvent.type === 'message_stop') {
    // Save message to DB...
    // Update session...
    // Send [DONE]...
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
    return
  }
}
```

**Key points:**
- Use separate state variables (prefixed with `resume`)
- Handle all the same event types as initial stream
- Necessary for nested tool calls (tool -> result -> another tool)

## Import Order Convention

```typescript
// 1. Next.js imports
import { NextRequest } from 'next/server'

// 2. External library imports
import Anthropic from '@anthropic-ai/sdk'

// 3. Internal lib imports
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// 4. Internal service imports
import { getToolDefinitions, executeToolCall } from '@/server/services/chat-tools.service'
```

## Code Quality Standards

- **Type Safety:** Use `as const` for literal types in objects
- **Error Messages:** Use `error instanceof Error ? error.message : 'fallback'`
- **State Variables:** Declare at start of scope, initialize explicitly
- **Comments:** Add comments for non-obvious logic (e.g., "Will be populated later")

## Security Patterns

- **Rate Limiting:** Already implemented - do not bypass
- **Session Validation:** Already implemented - do not bypass
- **User ID:** Always use Prisma `user.id`, never Supabase auth ID for DB queries
