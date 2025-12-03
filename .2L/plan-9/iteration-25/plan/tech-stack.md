# Technology Stack

## Core Framework

**Decision:** Next.js 14+ with App Router

**Rationale:**
- Already in use by the project
- Server-side streaming is well-supported via ReadableStream
- No changes needed - just fixing event handling

## AI Provider

**Decision:** Anthropic Claude API via `@anthropic-ai/sdk`

**Model:** `claude-sonnet-4-5-20250929`

**Rationale:**
- Already integrated in the project
- Streaming API provides fine-grained control via events

## Anthropic SDK Streaming API Patterns

### Event Types Reference

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `content_block_start` | Start of a content block | `content_block.type`, `content_block.id`, `content_block.name` |
| `content_block_delta` | Incremental content | `delta.type` (text_delta or input_json_delta), `delta.text`, `delta.partial_json` |
| `content_block_stop` | Content block complete | `index` |
| `message_delta` | Message metadata update | `delta.stop_reason` |
| `message_stop` | Stream complete | - |

### Tool Use Flow

1. **`content_block_start`** with `type: "tool_use"`:
   ```typescript
   {
     type: 'content_block_start',
     index: 0,
     content_block: {
       type: 'tool_use',
       id: 'toolu_abc123',
       name: 'get_account_balances',
       input: {}  // Always empty at start!
     }
   }
   ```

2. **Multiple `content_block_delta`** with `type: "input_json_delta"`:
   ```typescript
   {
     type: 'content_block_delta',
     index: 0,
     delta: {
       type: 'input_json_delta',
       partial_json: '{"start'
     }
   }
   // More fragments...
   {
     type: 'content_block_delta',
     index: 0,
     delta: {
       type: 'input_json_delta',
       partial_json: 'Date":"2025-01-01"}'
     }
   }
   ```

3. **`content_block_stop`** signals block complete:
   ```typescript
   {
     type: 'content_block_stop',
     index: 0
   }
   ```

4. **`message_delta`** with `stop_reason: "tool_use"`:
   ```typescript
   {
     type: 'message_delta',
     delta: {
       stop_reason: 'tool_use',
       stop_sequence: null
     }
   }
   ```

### Critical Insight

The `input` field in `content_block_start` is ALWAYS an empty object `{}`. The actual tool input is delivered incrementally via `input_json_delta` events. This is the root cause of the bug.

## SSE Implementation Details

### Server-Side Pattern

```typescript
const encoder = new TextEncoder()

const stream = new ReadableStream({
  async start(controller) {
    // Emit text chunks
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))

    // Emit errors
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`))

    // Emit completion
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
  }
})

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
})
```

### Client-Side Parsing

Client expects:
- `data: {"text":"chunk"}\n\n` - Text to append
- `data: {"error":"message"}\n\n` - Error to display
- `data: [DONE]\n\n` - Stream complete

No client changes needed for this fix.

## TypeScript Patterns for Event Handling

### Type Narrowing for Claude Events

```typescript
for await (const event of claudeStream) {
  // Type guard for content_block_delta
  if (event.type === 'content_block_delta') {
    // Further narrow by delta type
    if (event.delta.type === 'text_delta') {
      // event.delta.text is string
    }
    if (event.delta.type === 'input_json_delta') {
      // event.delta.partial_json is string
    }
  }

  // Type guard for content_block_start
  if (event.type === 'content_block_start') {
    if (event.content_block.type === 'tool_use') {
      // event.content_block.id, .name, .input available
    }
  }

  // Type guard for content_block_stop
  if (event.type === 'content_block_stop') {
    // event.index available
  }
}
```

### Tool Call State Types

```typescript
interface ToolCall {
  id: string
  name: string
  input: Record<string, any>
}

// State variables
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []
const toolCalls: ToolCall[] = []
```

## Database

**Decision:** Prisma ORM with existing schema

**Relevant Models:**
- `ChatMessage` - stores messages with optional `toolCalls` JSON field
- `ChatSession` - stores session with title and timestamps

No schema changes needed.

## Environment Variables

Required (already configured):
- `ANTHROPIC_API_KEY`: Claude API key
- `WEALTH_AI_ENABLED`: Feature flag (must be "true")

## Dependencies

No new dependencies needed. Existing:
- `@anthropic-ai/sdk`: Claude API client
- `@prisma/client`: Database ORM
- `next`: Framework

## Performance Targets

- SSE event delivery: < 50ms latency per chunk
- Tool execution: < 5s total (database query dependent)
- Resume stream creation: < 1s

## Security Considerations

- Rate limiting: Already implemented (10 requests/minute per user)
- Session ownership: Already validated before streaming
- Authentication: Already required via Supabase

No additional security changes needed for this fix.
