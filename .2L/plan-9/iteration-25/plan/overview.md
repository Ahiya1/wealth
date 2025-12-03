# 2L Iteration Plan - Fix AI Chat Tool Streaming

## Project Vision

Fix the critical bug in the AI chat streaming route where tool calls fail due to missing `input_json_delta` event handling. Currently, when Claude requests tool usage, the tool inputs are captured as empty objects `{}` because the incremental JSON fragments are not accumulated. This causes tools to execute with no parameters, resulting in failed or useless responses.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Tool inputs are correctly accumulated from `input_json_delta` events
- [ ] Tool inputs are properly parsed when `content_block_stop` fires
- [ ] Tools execute with complete, valid input parameters
- [ ] Tool responses appear correctly after tool invocation
- [ ] Resume stream also handles nested tool calls properly
- [ ] Error handling gracefully recovers from failures
- [ ] Rate limiter memory is cleaned up periodically

## MVP Scope

**In Scope:**

- Add `input_json_delta` event handler to accumulate tool input JSON fragments
- Add `content_block_stop` event handler to parse and finalize tool inputs
- Add state variables (`currentToolIndex`, `toolInputJsonFragments`) for tracking
- Apply same fix to resume stream section for nested tool calls
- Wrap resume stream in try-catch with retry logic
- Add tool call ID tracking to prevent duplicate execution
- Add exponential backoff for resume stream retries
- Add periodic cleanup for rate limiter entries
- Add structured logging for tool execution debugging

**Out of Scope (Post-MVP):**

- Intermediate status events to client (e.g., "Calling tool...")
- Tool execution timeouts
- Visual "Thinking..." indicator during tool execution
- Client-side changes (client implementation is correct)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - Estimated 3 builders in parallel
4. **Integration** - Estimated 15 minutes
5. **Validation** - Estimated 30 minutes (manual testing)
6. **Deployment** - Final

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: 1-2 hours (3 parallel builders)
- Integration: 15 minutes
- Validation: 30 minutes
- Total: ~2.5 hours

## Risk Assessment

### High Risks

- **JSON Parsing Failures:** Tool input JSON arrives in fragments and may be malformed. Mitigation: Wrap JSON.parse in try-catch, log raw fragments on failure, keep input as `{}` if parse fails so tool can handle gracefully.

### Medium Risks

- **Multi-Tool Tracking:** Claude may request multiple tools in sequence. Mitigation: Track tools by index, use separate accumulation arrays for each tool.
- **Resume Stream Failures:** The second Claude API call may fail. Mitigation: Add retry logic with exponential backoff.

### Low Risks

- **Breaking Existing Functionality:** The fix adds new handlers without modifying existing text streaming logic. Risk is minimal.

## Integration Strategy

All 3 builders modify the same file (`/src/app/api/chat/stream/route.ts`). Integration order:

1. **Builder 1 first** - Core fix for tool input accumulation (CRITICAL)
2. **Builder 2 second** - Error recovery and deduplication (builds on Builder 1)
3. **Builder 3 last** - Rate limiter cleanup and logging (independent, additive)

Potential conflict areas:
- Lines 196-221 (streaming event loop - all builders may touch)
- Lines 273-338 (resume stream handling - Builder 1 and 2)

Resolution strategy: Builder 1 establishes the new event handlers, Builder 2 wraps in error handling, Builder 3 adds logging.

## Deployment Plan

1. Merge all builder changes into single PR
2. Run type checking: `npm run type-check`
3. Start dev server: `npm run dev`
4. Manual testing:
   - Test simple query without tools: "Hello, who are you?"
   - Test tool query: "What's my account balance?"
   - Test date-based query: "Show my spending for November 2025"
   - Test error handling: Trigger a tool error scenario
5. Verify in browser DevTools Network tab that SSE events flow correctly
6. Commit and push
