# Builder-2 Report: Error Recovery & Deduplication

## Status
COMPLETE

## Summary
Implemented tool call deduplication to prevent re-execution of duplicate tool calls, and added retry logic with exponential backoff for the resume stream. Also improved error messages to be user-friendly rather than technical.

## Files Modified

### Implementation
- `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/chat/stream/route.ts` - Added deduplication, retry logic, and improved error messages

## Changes Made

### 1. Tool Call Deduplication (Lines 274-283)
Added deduplication logic before tool execution to prevent duplicate tool calls from being executed:

```typescript
// Deduplicate tool calls by ID to prevent re-execution
const seenToolIds = new Set<string>()
const uniqueToolCalls = toolCalls.filter((tc) => {
  if (seenToolIds.has(tc.id)) {
    console.warn('[Chat] Skipping duplicate tool call:', tc.id, tc.name)
    return false
  }
  seenToolIds.add(tc.id)
  return true
})
```

### 2. Updated Tool Execution to Use uniqueToolCalls (Lines 288-323)
Changed `toolCalls.map()` to `uniqueToolCalls.map()` in:
- Tool execution Promise.all
- claudeMessages assistant content
- Saved toolCalls in database

### 3. Resume Stream Retry Logic (Lines 341-475)
Wrapped the entire resume stream section in a retry loop with exponential backoff:

```typescript
let resumeAttempt = 0
const maxResumeAttempts = 2

while (resumeAttempt <= maxResumeAttempts) {
  try {
    const resumeStream = await claude.messages.stream({...})
    // ... process stream
    break  // Success - exit retry loop
  } catch (resumeError) {
    resumeAttempt++
    console.error(`[Chat] Resume stream attempt ${resumeAttempt} failed:`, resumeError)

    if (resumeAttempt > maxResumeAttempts) {
      // Send user-friendly error
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        error: 'I was unable to process your request. Please try again.'
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

### 4. Improved Error Messages
Changed error messages to be user-friendly:
- Tool execution fallback: `'Unable to complete this action. Please try again.'`
- Resume stream final failure: `'I was unable to process your request. Please try again.'`

## Success Criteria Met
- [x] Resume stream creation is wrapped in try-catch
- [x] Retry logic attempts up to 2 retries with exponential backoff (1s, 2s)
- [x] On final failure, error message is sent to client via SSE
- [x] Tool calls are deduplicated by ID before execution
- [x] Duplicate tool calls are logged as warnings
- [x] Improved error messages are user-friendly (not technical)

## Error Scenarios Handled

### 1. Duplicate Tool Calls
- **Scenario:** Claude API sends duplicate tool call IDs (rare but possible with streaming)
- **Handling:** Filtered out using Set-based deduplication
- **User Impact:** None - duplicates silently skipped with warning log

### 2. Resume Stream Network Failure
- **Scenario:** Network timeout, API error, or connection drop during resume stream
- **Handling:** Up to 2 automatic retries with exponential backoff (1s, 2s delays)
- **User Impact:** Brief delay while retrying, user sees friendly error only if all retries fail

### 3. Resume Stream Final Failure
- **Scenario:** All 3 attempts (1 initial + 2 retries) fail
- **Handling:** Send user-friendly error message and properly close stream
- **User Impact:** User sees "I was unable to process your request. Please try again."

### 4. Tool Execution Failure
- **Scenario:** Individual tool fails to execute (database error, validation error)
- **Handling:** Return is_error: true with user-friendly message
- **User Impact:** Claude receives error result and can respond appropriately

## Tests Summary
- **Build:** PASSING - No compilation errors
- **Lint:** PASSING - No new warnings from changes

## Patterns Followed
- **Tool Call Deduplication:** Used Set for O(1) lookup, filter before Promise.all
- **Resume Stream with Retry:** Max 2 retries, exponential backoff (1000ms * attempt)
- **Structured Logging:** All logs prefixed with `[Chat]` for filtering

## Integration Notes

### Changes for Integrator
- This build adds error recovery on top of Builder 1's core fix
- Changes are compatible with Builder 1's input_json_delta handling
- Changes are compatible with Builder 3's logging improvements

### Variables Introduced
- `seenToolIds: Set<string>` - Tracks seen tool IDs for deduplication
- `uniqueToolCalls: Array` - Filtered array of tool calls after deduplication
- `resumeAttempt: number` - Current retry attempt counter
- `maxResumeAttempts: number` - Maximum retry attempts (2)

### Key Behavior Changes
1. Tool execution now uses `uniqueToolCalls` instead of `toolCalls`
2. Resume stream failures no longer crash - they retry automatically
3. Users see friendly error messages instead of technical details

## Testing Notes

### Manual Testing
1. Test normal tool execution - should work as before
2. Test with network throttling to trigger retry logic:
   - Open DevTools > Network > Throttle to "Slow 3G"
   - Send a query that triggers tool use
   - Verify retry messages in server console
3. Verify user-friendly error message appears after all retries fail
4. Check server console for `[Chat] Resume stream attempt X failed` logs

### Verification Steps
1. Run `npm run build` - should pass
2. Run `npm run lint` - should have no new errors
3. Start dev server with `npm run dev`
4. Test AI chat with tool queries like "What's my account balance?"
