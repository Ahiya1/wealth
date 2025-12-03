# Builder-1 Report: Fix Tool Input Accumulation (CRITICAL)

## Status
COMPLETE

## Summary
Fixed the critical bug where Claude API tool calls were executed with empty `{}` inputs. The root cause was that `input_json_delta` events were not being handled - the code was trying to use `event.content_block.input` from `content_block_start` which is always empty in streaming mode. Tool inputs are streamed incrementally via `input_json_delta` events and must be accumulated and parsed on `content_block_stop`.

## Files Modified

### Implementation
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` - Added tool input JSON accumulation for both initial stream and resume stream

## Changes Made

### 1. Added State Variables (Lines 218-220)
```typescript
let fullContent = ''
const toolCalls: Array<{ id: string; name: string; input: any }> = []
let currentToolIndex = -1
const toolInputJsonFragments: string[] = []
```
- `currentToolIndex`: Tracks which tool we're currently accumulating input for
- `toolInputJsonFragments`: Array to accumulate JSON fragments per tool

### 2. Added input_json_delta Handler in content_block_delta (Lines 234-239)
```typescript
// Accumulate tool input JSON fragments
if (event.delta.type === 'input_json_delta') {
  if (currentToolIndex >= 0) {
    toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
  }
}
```

### 3. Modified content_block_start Handler (Lines 242-253)
```typescript
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
- Increments `currentToolIndex` before pushing
- Initializes `toolInputJsonFragments[currentToolIndex]` to empty string
- Sets `input: {}` as placeholder (will be filled on content_block_stop)

### 4. Added content_block_stop Handler (Lines 255-269)
```typescript
if (event.type === 'content_block_stop') {
  const jsonFragment = toolInputJsonFragments[currentToolIndex]
  const currentToolCall = toolCalls[currentToolIndex]
  if (currentToolIndex >= 0 && jsonFragment && currentToolCall) {
    try {
      const parsedInput = JSON.parse(jsonFragment)
      currentToolCall.input = parsedInput
    } catch (parseError) {
      console.error('[Chat] Failed to parse tool input JSON:', parseError)
      console.error('[Chat] Raw fragments:', jsonFragment)
      // Keep input as {} - tool will handle gracefully
    }
  }
}
```
- Parses accumulated JSON when content block completes
- Uses const assignments for TypeScript type narrowing
- Catches and logs parse errors without crashing

### 5. Added Resume Stream State Variables (Lines 352-355)
```typescript
// State for resume stream nested tool calls
let resumeToolIndex = -1
const resumeToolInputJsons: string[] = []
const resumeToolCalls: Array<{ id: string; name: string; input: any }> = []
```

### 6. Added Resume Stream input_json_delta Handler (Lines 369-374)
```typescript
// Handle nested tool input deltas
if (resumeEvent.delta.type === 'input_json_delta') {
  if (resumeToolIndex >= 0) {
    resumeToolInputJsons[resumeToolIndex] += resumeEvent.delta.partial_json
  }
}
```

### 7. Added Resume Stream content_block_start Handler (Lines 377-388)
```typescript
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
```

### 8. Added Resume Stream content_block_stop Handler (Lines 390-401)
```typescript
// Finalize nested tool inputs
if (resumeEvent.type === 'content_block_stop') {
  const resumeJsonFragment = resumeToolInputJsons[resumeToolIndex]
  const resumeCurrentToolCall = resumeToolCalls[resumeToolIndex]
  if (resumeToolIndex >= 0 && resumeJsonFragment && resumeCurrentToolCall) {
    try {
      resumeCurrentToolCall.input = JSON.parse(resumeJsonFragment)
    } catch (e) {
      console.error('[Chat] Failed to parse resume tool input:', e)
    }
  }
}
```

## Success Criteria Met
- [x] State variables `currentToolIndex` and `toolInputJsonFragments` declared after toolCalls
- [x] `content_block_start` handler initializes accumulation state
- [x] `input_json_delta` handler accumulates `partial_json` fragments
- [x] `content_block_stop` handler parses accumulated JSON and assigns to `toolCalls[index].input`
- [x] JSON parse errors are caught and logged (not thrown)
- [x] Resume stream section has equivalent handlers for nested tool calls
- [x] TypeScript compiles without errors
- [x] ESLint passes (only pre-existing warnings)

## Tests Summary
- **TypeScript:** Compiles without errors (`npx tsc --noEmit` passes)
- **ESLint:** Passes (`npm run lint` shows only pre-existing warnings)

## Patterns Followed
- **Input JSON Delta Accumulation:** Following the pattern from patterns.md exactly
- **Try-Catch with Logging:** JSON parsing wrapped in try-catch with `[Chat]` prefixed logs
- **Resume Stream Pattern:** Separate state variables prefixed with `resume` for nested tool handling

## Integration Notes

### Key Technical Details
- The `input` field in `content_block_start` is ALWAYS `{}` in Claude's streaming API
- Tool inputs arrive incrementally via `input_json_delta` events
- `content_block_stop` signals that all fragments have been sent
- Must track by index because multiple tools can be requested in sequence
- Resume stream needs identical handling for nested tool calls (when Claude wants another tool after seeing results)

### Coordination with Other Builders
- Builder-2's deduplication code has been merged (lines 274-283)
- Builder-3's logging and rate limiter cleanup has been merged (lines 55-73, various log statements)
- All changes integrate cleanly without conflicts

## Testing Notes

### Manual Testing Steps
1. Start dev server: `npm run dev`
2. Navigate to AI chat
3. Ask a question requiring tool use: "What's my account balance?"
4. Verify tool executes with actual parameters (check server console for `[Chat] Executing tool: ... with input: {...}`)
5. Verify the input is NOT empty `{}`
6. Verify tool response appears in chat
7. Try a date-based query: "Show my spending for November"
8. Verify date parameters are passed correctly

### Expected Console Output
```
[Chat] Starting stream for session abc123
[Chat] Executing 1 tool(s) for session abc123
[Chat] Executing tool: get_balance with input: {"account_type":"all"}
[Chat] Tool get_balance completed in 150ms
[Chat] Resuming stream with 1 tool result(s) for session abc123
[Chat] Stream completed for session abc123
```

## Challenges Overcome
1. **TypeScript Type Narrowing:** Array index access returns `T | undefined`. Fixed by extracting to const variables before the condition.
2. **File Concurrent Modifications:** The file was being modified by other builders (Builder-2 and Builder-3) during my work. The integration happened automatically through the linter/formatter.
