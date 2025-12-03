# Project Vision: AI Chat Bug Fixes & Reliability Improvements

**Created:** 2025-12-03T19:55:00+02:00
**Plan:** plan-9

---

## Problem Statement

The AI chat assistant in Wealth (implemented in plan-7) is **half-functional at best**. Users are experiencing critical issues:

1. **Empty responses after function invocation** - When the AI calls tools (e.g., "analyze my spendings"), the user sees their response ("last 3 months") but the AI's follow-up message appears as an empty box with no content
2. **Chat gets out of the page sometimes** - UI/layout issues causing the chat interface to break or become unusable
3. **Overall unreliability** - The feature doesn't work consistently enough to be trusted for daily use

**Current pain points:**
- User selects an option (e.g., time range for spending analysis) but gets no response
- Tool calls execute successfully on the server but results never reach the user
- Session titles show "New Chat" instead of meaningful titles
- Potential duplicate transactions if connection resets during tool execution
- Memory leaks in the rate limiter growing over time

---

## Target Users

**Primary user:** Ahiya (solo user of Wealth app)
- Wants to ask questions about finances naturally
- Needs reliable tool execution for spending analysis, transaction imports, etc.
- Expects AI responses to actually appear after tool calls complete

---

## Core Value Proposition

**Make the AI chat feature actually work reliably** - Fix the critical bugs preventing tool results from being displayed, ensure stable streaming, and make the feature production-ready.

**Key benefits:**
1. AI responses appear consistently after every tool call
2. Spending analysis, transaction queries, and other tools work end-to-end
3. Chat interface stays stable and usable throughout sessions
4. No data loss or duplicate transactions from connection issues

---

## Root Cause Analysis

Based on code exploration of `/src/app/api/chat/stream/route.ts` and `/src/server/services/chat-tools.service.ts`:

### Critical Bug: Tool Results Not Streamed to Client

**Location:** `route.ts` lines 225-339

**Issue:** After tool execution completes:
1. Tools execute and return results
2. A second Claude stream is started to interpret the tool results
3. BUT: The second stream's output is not properly sent to the client via SSE
4. User sees empty message because text chunks from the resume stream never arrive

**Evidence from code flow:**
```
1. First stream → tool_use stop_reason → tools execute
2. Results added to messages array
3. Second stream started (lines 273-338)
4. Text deltas from second stream should go to SSE...
5. BUT: Possible issue in how encoder/controller handles the resume
```

### Secondary Issues Identified

| Issue | Location | Impact |
|-------|----------|--------|
| No error recovery for resume stream | route.ts:273-338 | If second stream fails, user stuck |
| Tool call duplication risk | route.ts:197-220 | Duplicate transactions possible |
| Memory leak in rate limiter | route.ts:36-53 | Memory grows with users over time |
| Session title update not transactional | route.ts:307-325 | "New Chat" title forever |
| No streaming indicator during tool execution | Client-side | User doesn't know tools are running |
| Tool results double-stringified | chat-tools.service.ts:240 | Harder to debug/query |

---

## Feature Breakdown

### Must-Have (MVP - Critical Fixes)

1. **Fix tool result streaming**
   - Description: Ensure text from the resume stream (after tool execution) is properly sent to client via SSE
   - User story: As a user, I want to see the AI's analysis after selecting a time range so that I can understand my spending
   - Acceptance criteria:
     - [ ] When AI calls `get_spending_summary`, the response text appears in chat
     - [ ] When AI calls `get_transactions`, the response text appears in chat
     - [ ] All 11 tools return visible responses to the user
     - [ ] No empty message boxes after tool execution

2. **Add error recovery for tool stream resumption**
   - Description: Wrap the resume stream in try-catch with retry logic
   - User story: As a user, I want the AI to recover gracefully if something goes wrong during analysis
   - Acceptance criteria:
     - [ ] If resume stream fails, retry up to 2 times with exponential backoff
     - [ ] If all retries fail, show user-friendly error message
     - [ ] Log errors for debugging

3. **Add tool execution indicator**
   - Description: Show the user that tools are being executed (not just streaming)
   - User story: As a user, I want to know when the AI is fetching my data so I don't think it's frozen
   - Acceptance criteria:
     - [ ] "Analyzing..." or similar indicator shows during tool execution
     - [ ] Indicator disappears when tool results start streaming
     - [ ] Different from regular streaming dots

4. **Fix tool call deduplication**
   - Description: Track executed tool call IDs to prevent re-execution on stream interrupt
   - User story: As a user, I want to not accidentally create duplicate transactions if my connection drops
   - Acceptance criteria:
     - [ ] Tool calls tracked by ID in request scope
     - [ ] Re-execution of same tool call ID is skipped
     - [ ] Write operations (create_transaction, create_transactions_batch) are especially protected

### Should-Have (Post-MVP Reliability)

1. **Fix rate limiter memory leak**
   - Description: Add cleanup timer to remove old entries from rateLimitStore Map
   - Acceptance criteria:
     - [ ] Entries older than 2 minutes are cleaned up
     - [ ] Cleanup runs every minute
     - [ ] Memory usage stays stable under load

2. **Make session title update transactional**
   - Description: Update title in same transaction as message save, or add retry logic
   - Acceptance criteria:
     - [ ] Sessions never stuck as "New Chat" after messages exist
     - [ ] Title updates within 5 seconds of first user message

3. **Add comprehensive error logging**
   - Description: Log all tool execution errors, stream failures, and recovery attempts
   - Acceptance criteria:
     - [ ] Errors logged with context (userId, sessionId, toolName)
     - [ ] Logs queryable for debugging user issues
     - [ ] No sensitive data in logs

### Could-Have (Future Improvements)

1. **Server-side file validation** - Validate file types by magic bytes, not just extension
2. **Message pagination** - Load messages in chunks for long sessions
3. **Markdown sanitization** - Add DOMPurify for XSS protection
4. **System prompt versioning** - Move prompts to config for A/B testing
5. **Per-tool rate limiting** - Prevent abuse of expensive operations

---

## User Flows

### Flow 1: Spending Analysis (Currently Broken)

**Current broken flow:**
1. User asks "Analyze my spendings"
2. AI responds with options (last month, last 3 months, etc.)
3. User clicks "last 3 months"
4. AI calls `get_spending_summary` tool
5. **BUG: Empty message appears** - tool results never streamed
6. User confused, retries, same result

**Expected fixed flow:**
1. User asks "Analyze my spendings"
2. AI responds with options
3. User clicks "last 3 months"
4. **"Analyzing your spending..." indicator shows**
5. AI calls `get_spending_summary` tool
6. Tool executes, returns data
7. **Resume stream sends AI interpretation to client**
8. User sees: "Here's your spending breakdown for the last 3 months: ..."
9. Formatted spending summary with categories, amounts, percentages

**Edge cases:**
- No transactions in period: Show "No transactions found" message
- Tool execution fails: Show error, offer retry
- Stream interrupted: Retry automatically, no duplicate queries

### Flow 2: Transaction Import via Chat

**Steps:**
1. User uploads bank statement via drag-drop
2. AI parses file, shows preview
3. User confirms import
4. `create_transactions_batch` tool executes
5. **With fix:** User sees confirmation with count of imported transactions
6. Transactions appear in Transactions page

**Error handling:**
- Duplicate detection: Show which transactions were skipped
- Parse failure: Show friendly error, suggest file format help

---

## Technical Requirements

**Files to modify:**
1. `/src/app/api/chat/stream/route.ts` - Main streaming logic fixes
2. `/src/components/chat/ChatInput.tsx` - Add tool execution indicator
3. `/src/components/chat/ChatMessage.tsx` - Handle tool execution states
4. `/src/server/services/chat-tools.service.ts` - Tool execution improvements

**Must support:**
- Streaming text responses via SSE
- Tool/function calling with Claude API
- Multi-turn conversations with tool results in context
- File uploads (PDF, CSV, XLSX)

**Constraints:**
- Cannot change database schema (ChatMessage model is fine as-is)
- Must maintain backward compatibility with existing chat sessions
- Must work with Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

**Testing requirements:**
- Manual testing of all 11 tools via actual chat interface
- Test streaming under network throttling
- Test tool execution with real API key (ANTHROPIC_API_KEY in .env.local)

---

## Success Criteria

**The MVP is successful when:**

1. **Tool responses always appear**
   - Metric: Manual test of all 11 tools
   - Target: 100% of tool calls result in visible AI response

2. **No empty message boxes**
   - Metric: Test 20 tool-invoking conversations
   - Target: 0 empty messages after tool execution

3. **Error recovery works**
   - Metric: Simulate stream failures
   - Target: Graceful recovery or clear error message (no silent failures)

4. **Spending analysis end-to-end**
   - Metric: Ask "analyze my spending for last 3 months"
   - Target: Receive formatted spending breakdown with categories

---

## Out of Scope

**Explicitly not included in MVP:**
- Performance optimization (message pagination)
- New AI tools or capabilities
- Mobile-specific chat improvements
- Chat history export
- Multi-language support
- Voice input

**Why:** Focus is purely on fixing critical bugs to make existing functionality work. No new features until the foundation is solid.

---

## Assumptions

1. The ANTHROPIC_API_KEY is valid and has sufficient credits
2. The Claude API is functioning normally
3. The issue is in our code, not the Claude SDK
4. Database and Prisma are working correctly
5. The bug is reproducible (not intermittent network issues)

---

## Open Questions

1. Is there a specific sequence of messages that always triggers the bug, or is it random?
2. Are there any error messages in the browser console when the empty box appears?
3. Does the server log show tool execution completing successfully?
4. Is the issue only with certain tools or all tools?

---

## Testing Plan

Since an ANTHROPIC_API_KEY is available in the directory:

1. **Start dev server:** `pnpm dev`
2. **Open chat:** Navigate to `/chat`
3. **Test basic streaming:** Send "Hello" - verify response appears
4. **Test tool invocation:** Send "Analyze my spending" → select "last 3 months"
5. **Verify fix:** Response should appear with spending breakdown
6. **Test all tools:** Run through each tool type systematically
7. **Test error cases:** Network throttling, abort mid-stream

---

## Implementation Notes

The fix likely involves ensuring that in the streaming route, when the resume stream is created after tool execution, its text deltas are properly:
1. Encoded with the SSE encoder
2. Enqueued to the response controller
3. Flushed to the client

Look specifically at how `fullContent` and `controller.enqueue()` are used in the tool resumption block vs the initial streaming block.

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
