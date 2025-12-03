# Explorer 2 Report: Client-side Streaming and Existing Patterns

## Executive Summary

The client-side streaming implementation is straightforward SSE parsing that expects `{text: string}` events. The critical bug appears to be on the server-side where tool inputs are captured incompletely via `content_block_start` - the input object at that point is empty `{}` and must be accumulated from subsequent `input_json_delta` events. This causes tools to fail or execute with empty inputs, and no text response is streamed back to the client.

## Discoveries

### Client SSE Event Parsing (ChatInput.tsx)

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatInput.tsx`

The client parses SSE events in a simple loop (lines 100-131):

```typescript
// Buffer-based line parsing
buffer += decoder.decode(value, { stream: true })
const lines = buffer.split('\n')
buffer = lines.pop() || ''

for (const line of lines) {
  if (!line.startsWith('data: ')) continue  // Only parse SSE data lines

  const data = line.slice(6).trim()
  if (data === '[DONE]') {
    // Stream complete - cleanup and notify parent
    setIsStreaming(false)
    onStreamingEnd?.()
    onMessageSent()
    return
  }

  try {
    const event = JSON.parse(data)
    if (event.error) {
      throw new Error(event.error)  // Error event from server
    }
    if (event.text) {
      onStreamingUpdate?.(event.text)  // Text chunk - append to message
    }
  } catch (parseError) {
    console.warn('Failed to parse SSE data:', data, parseError)
  }
}
```

**Key Findings:**
1. Client expects simple JSON: `{text: string}` or `{error: string}`
2. No special handling for tool-related events
3. Errors are logged but parsing continues
4. `[DONE]` sentinel triggers cleanup

### State Management (ChatPageClient.tsx)

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatPageClient.tsx`

**Message Flow:**

1. **Stream Start (handleStreamingStart):** Creates optimistic user + assistant messages
```typescript
const handleStreamingStart = (userMessage: string) => {
  const userMessageId = `user-${Date.now()}`
  const streamingId = `streaming-${Date.now()}`
  setStreamingMessageId(streamingId)
  
  setLocalMessages((prev) => [
    ...prev,
    { id: userMessageId, role: 'user', content: userMessage, ... },
    { id: streamingId, role: 'assistant', content: '', ... }  // Empty content
  ])
}
```

2. **Stream Update (handleStreamingUpdate):** Appends text to last message
```typescript
const handleStreamingUpdate = (text: string) => {
  setLocalMessages((prev) => {
    return prev.map((msg, index) => {
      if (index === prev.length - 1 && msg.id === streamingMessageId) {
        return { ...msg, content: msg.content + text }  // Append text
      }
      return msg
    })
  })
}
```

3. **Stream End (handleStreamingEnd):** Clears streaming state
```typescript
const handleStreamingEnd = () => {
  setStreamingMessageId(null)  // Enables DB messages to sync
}
```

4. **Message Sent (handleMessageSent):** Triggers refetch
```typescript
const handleMessageSent = () => {
  utils.chat.getMessages.invalidate({ sessionId: activeSessionId! })
  utils.chat.listSessions.invalidate()
}
```

**Critical Insight:** If NO text events are ever received (e.g., tool calls fail silently), the assistant message remains with `content: ''`. On refetch, the DB message replaces it, but if the DB also has empty content, the issue persists.

### Message Display (ChatMessage.tsx)

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatMessage.tsx`

```typescript
{message.content ? (
  isUser ? (
    <div className="whitespace-pre-wrap">{message.content}</div>
  ) : (
    <MarkdownRenderer content={message.content} />
  )
) : (
  isStreaming && <StreamingIndicator />  // Only show dots if streaming
)}
```

**Finding:** Empty content with `isStreaming=false` shows nothing - this is why users see blank messages.

## Patterns Identified

### SSE Event Format Pattern

**Server must emit:**
```
data: {"text":"chunk of text"}\n\n
data: {"text":"more text"}\n\n
data: [DONE]\n\n
```

**On error:**
```
data: {"error":"Error message"}\n\n
```

### Error Handling Pattern

**Logging Convention:** (from `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts`)
```typescript
console.error('Tool execution error:', error)
console.error('Stream error:', error)
```

**Pattern:**
- Use `console.error` for errors
- Include context (tool name, error object)
- Send error events to client for user-facing issues

### State Update Pattern

**Optimistic Updates:**
1. Add placeholder immediately
2. Update in place as stream arrives
3. Clear streaming flag on completion
4. Invalidate cache to sync with DB

## Complexity Assessment

### High Complexity Areas

**Tool Input Accumulation (CRITICAL BUG LOCATION)**

The server captures tool inputs incorrectly:

```typescript
// In route.ts lines 213-220
if (event.type === 'content_block_start') {
  if (event.content_block.type === 'tool_use') {
    toolCalls.push({
      id: event.content_block.id,
      name: event.content_block.name,
      input: event.content_block.input,  // BUG: This is {} at start!
    })
  }
}
```

Claude's streaming API sends tool inputs incrementally:
1. `content_block_start` - has empty `input: {}`
2. Multiple `content_block_delta` with `delta.type === 'input_json_delta'` - contains JSON fragments
3. `content_block_stop` - signals input complete

The current code ignores `input_json_delta` events, so tools execute with `{}` inputs.

### Medium Complexity Areas

**Resume Stream Handling:**
- After tool execution, a new stream is created
- Tool results text is streamed correctly
- But if initial tool call fails due to empty input, this never happens

### Low Complexity Areas

**Client-side parsing:** Simple and robust
**State management:** Standard React patterns

## Technology Recommendations

### Fix Implementation

**Server-side (route.ts):**
1. Accumulate tool input JSON deltas
2. Parse complete JSON when `content_block_stop` arrives
3. Then execute tools

```typescript
// Suggested pattern
let currentToolInput = ''
let currentToolIndex = -1

for await (const event of claudeStream) {
  if (event.type === 'content_block_start') {
    if (event.content_block.type === 'tool_use') {
      currentToolIndex = toolCalls.push({
        id: event.content_block.id,
        name: event.content_block.name,
        input: {},  // Will be populated later
      }) - 1
      currentToolInput = ''
    }
  }
  
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'input_json_delta') {
      currentToolInput += event.delta.partial_json
    }
    // ... text_delta handling
  }
  
  if (event.type === 'content_block_stop') {
    if (currentToolIndex >= 0 && currentToolInput) {
      toolCalls[currentToolIndex].input = JSON.parse(currentToolInput)
      currentToolIndex = -1
      currentToolInput = ''
    }
  }
}
```

### No Client Changes Needed

The client correctly handles any text events. The fix is purely server-side.

## Integration Points

### Server to Client

**Endpoint:** `POST /api/chat/stream`

**Request:**
```typescript
interface StreamMessageRequest {
  sessionId: string
  message: string
}
```

**Response (SSE):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"text":"Hello"}\n\n
data: {"text":", how can I help?"}\n\n
data: [DONE]\n\n
```

### Claude API Events

**Relevant event types:**
- `content_block_start` - Start of text or tool_use block
- `content_block_delta` - Incremental content (`text_delta` or `input_json_delta`)
- `content_block_stop` - Block complete
- `message_delta` - Message metadata (stop_reason)
- `message_stop` - Stream complete

## Risks & Challenges

### Technical Risks

**JSON Parsing Risk:**
- Tool input JSON comes in fragments
- Must handle malformed JSON gracefully
- Add try/catch around JSON.parse

**Multi-Tool Risk:**
- Claude might request multiple tools
- Current code handles this with array
- Input accumulation must track which tool is active

### Testing Risks

**Tool Usage Required:**
- Bug only manifests when Claude uses tools
- Need to trigger queries like "What's my balance?" or "Show spending"

## Recommendations for Planner

1. **Single File Fix:** Only `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` needs changes

2. **Add Input Accumulation:** Track `input_json_delta` events and parse complete JSON on `content_block_stop`

3. **Add Logging:** Log tool inputs before execution for debugging:
   ```typescript
   console.log('[Chat] Executing tool:', toolCall.name, 'with input:', toolCall.input)
   ```

4. **Handle Edge Cases:**
   - Empty tool inputs (should error gracefully)
   - Malformed JSON (catch and return tool error)
   - Multiple concurrent tools (track by index)

5. **Keep Client Unchanged:** The client implementation is correct and robust

## Testing Checklist

### Manual Testing Steps

1. **Start Dev Server:**
   ```bash
   cd /home/ahiya/Ahiya/2L/Prod/wealth
   npm run dev
   ```

2. **Navigate to AI Chat:**
   - URL: `http://localhost:3000/ai-chat`
   - Must be logged in

3. **Test Simple Response (No Tools):**
   - Ask: "Hello, who are you?"
   - Expected: Text streams in real-time, message shows in chat

4. **Test Tool Usage (Critical):**
   - Ask: "What's my account balance?"
   - Expected: Brief pause while tool executes, then formatted response with real data
   - Current Bug: Empty or partial message

5. **Test Multiple Tool Queries:**
   - Ask: "How much did I spend on groceries last month?"
   - Expected: `get_transactions` or `get_spending_summary` tool used, data shown

6. **Verify in Network Tab:**
   - Open DevTools > Network
   - Filter by "stream"
   - Watch SSE events in real-time
   - Look for `{"text":"..."}` events

### Expected SSE Flow (After Fix)

```
data: {"text":"Let me check"}\n\n
data: {"text":" your account balances"}\n\n
data: {"text":"."}\n\n
// (pause while tool executes)
data: {"text":"\n\nYou have"}\n\n
data: {"text":" 3 accounts with"}\n\n
data: {"text":" a total balance of"}\n\n
data: {"text":" ₪15,234.50:\n\n"}\n\n
data: {"text":"- Checking: ₪8,500\n"}\n\n
data: {"text":"- Savings: ₪6,000\n"}\n\n
data: {"text":"- Credit: -₪265.50"}\n\n
data: [DONE]\n\n
```

## Resource Map

### Critical Files

| Path | Purpose |
|------|---------|
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` | Server streaming endpoint (FIX HERE) |
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatInput.tsx` | Client SSE parsing |
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/chat/ChatPageClient.tsx` | State management |
| `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/services/chat-tools.service.ts` | Tool definitions & execution |

### Key Dependencies

| Dependency | Usage |
|------------|-------|
| `@anthropic-ai/sdk` | Claude streaming API |
| Prisma | Database operations in tools |
| tRPC | Internal API calls from tools |

## Questions for Planner

1. Should we emit intermediate events during tool execution (e.g., `{"status":"calling_tool","name":"get_balance"}`)?

2. Should we add a timeout for tool execution to prevent hanging streams?

3. Should we show users a "Thinking..." or "Checking your data..." message while tools execute?
