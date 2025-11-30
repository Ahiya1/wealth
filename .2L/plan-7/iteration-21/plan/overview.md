# Iteration 21: Chat Foundation & Query Tools

## Project Vision

Build a ChatGPT-style AI financial assistant inside Wealth that can answer questions about user financial data using Claude Sonnet 4.5 with streaming responses. Users can create persistent chat sessions, ask natural language questions about their spending, budgets, and accounts, and get intelligent responses backed by real-time data queries.

This iteration establishes the foundation: conversational interface, session persistence, real-time streaming, and 6 read-only financial data query tools.

## Success Criteria

- [ ] User can create a new chat session from /chat page
- [ ] User can list all their chat sessions in sidebar (ordered by most recent)
- [ ] User can delete chat sessions
- [ ] User can send messages and see them appear immediately in UI
- [ ] AI responds with streaming text (first token arrives <1 second)
- [ ] User can ask: "How much did I spend on groceries last month?" and get accurate answer
- [ ] User can ask: "Am I over budget?" and see budget status
- [ ] User can ask: "What's my net worth?" and get account balances
- [ ] Mobile responsive (works on iPhone and Android)
- [ ] Rate limiting prevents abuse (max 10 messages/minute)
- [ ] Streaming works reliably on mobile networks with timeout handling

## MVP Scope

**In Scope:**

- Chat UI with sidebar, message list, and input components
- Server-Sent Events (SSE) streaming from Claude API
- Session persistence (ChatSession and ChatMessage database models)
- 6 read-only query tools:
  1. get_transactions - filter by date, category, account
  2. get_spending_summary - spending totals by category
  3. get_budget_status - current budget vs actual spending
  4. get_account_balances - all account balances and net worth
  5. get_categories - list available categories
  6. search_transactions - free-text search across transactions
- Rate limiting (10 messages/minute, 100/hour, 300/day)
- Prompt caching for 50% cost reduction
- Mobile-first responsive design matching existing UI patterns
- Error handling and timeout detection

**Out of Scope (Future Iterations):**

- File upload and parsing (PDF/CSV/Excel) - Iteration 2
- Transaction creation/modification tools - Iteration 2
- Credit card bill resolution - Iteration 3
- Navigation integration (bottom nav/sidebar) - Iteration 3
- Session title auto-generation - Iteration 3
- Advanced context management - Future

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 14-16 hours (3 builders in parallel)
4. **Integration** ⏳ 30 minutes
5. **Validation** ⏳ 45 minutes
6. **Deployment** ⏳ Final

## Timeline Estimate

- Exploration: Complete (2 explorers analyzed codebase)
- Planning: Complete (this document)
- Building: 14-16 hours
  - Builder 1 (Backend Core): 6-7 hours
  - Builder 2 (SSE Streaming): 4-5 hours
  - Builder 3 (Frontend): 5-6 hours
- Integration: 30 minutes (merge builders, resolve conflicts)
- Validation: 45 minutes (manual testing on mobile/desktop)
- **Total: 16-20 hours**

## Risk Assessment

### High Risks

**Risk: Streaming connection drops on mobile networks**
- Impact: Users see incomplete responses or timeout errors
- Mitigation:
  - Client-side timeout detection (30 seconds)
  - Retry button on failed messages
  - Save partial responses to database for recovery
  - Heartbeat mechanism (empty SSE event every 5 seconds)
  - Test extensively with Chrome DevTools network throttling

**Risk: API cost runaway from heavy usage or abuse**
- Impact: Unexpected Claude API costs
- Mitigation:
  - Rate limiting from Day 1 (10 msg/min, 100/hour, 300/day)
  - Prompt caching implementation (50% cost reduction)
  - Token tracking in ChatMessage model
  - Monitor costs manually daily (automated alerts in future)
  - WEALTH_AI_ENABLED feature flag for emergency shutoff

### Medium Risks

**Risk: Context window overflow in long conversations**
- Impact: Old messages truncated, user loses conversation history
- Mitigation:
  - Limit message history to last 40 messages (fits in context window)
  - Token counting on message insert
  - User notification when context truncated
  - Prominent "New Session" button

**Risk: Tool execution failures**
- Impact: AI can't answer questions about financial data
- Mitigation:
  - Comprehensive error logging (console.error + future Sentry)
  - Graceful error messages ("I had trouble retrieving that data")
  - Let Claude handle via multi-turn conversation
  - 5-second timeout per tool execution
  - Reuse existing tRPC router logic (proven and reliable)

**Risk: First-time streaming implementation**
- Impact: Bugs in SSE handling, client-side parsing issues
- Mitigation:
  - Build streaming in isolation first (echo server)
  - Test SSE client before integrating Claude
  - Reference Next.js 14 App Router streaming docs
  - Test on multiple browsers (Chrome, Safari, Firefox)

### Low Risks

**Risk: Database migration conflicts**
- Impact: Prisma migration fails in production
- Mitigation:
  - ChatSession/ChatMessage models are additive (no changes to existing tables)
  - Use `prisma db push` for development
  - Create proper migration for production
  - Test migration on staging first

## Integration Strategy

### Builder Handoff Points

**Shared Types (src/types/chat.ts):**
- Builder 1 creates type definitions
- Builder 2 and Builder 3 import and use

**Database Models:**
- Builder 1 creates Prisma schema
- Builder 1 runs `npx prisma generate`
- Builders 2 and 3 use generated Prisma client types

**tRPC Router:**
- Builder 1 exports chatRouter
- Builder 1 adds to src/server/api/root.ts
- Builder 3 uses tRPC hooks (trpc.chat.*)

**SSE Route:**
- Builder 2 creates /api/chat/stream route
- Builder 3 calls from ChatPageClient component

**Chat Service:**
- Builder 1 creates chat.service.ts (non-streaming)
- Builder 2 creates streamChatResponse function (streaming variant)
- Both use shared tool execution from chat-tools.service.ts

### Integration Steps

1. **Merge Builder 1 (Backend Core) first**
   - Database models, tRPC router, tool service
   - Run `npx prisma generate` and `npx prisma db push`
   - Verify tRPC router accessible via tRPC context

2. **Merge Builder 2 (SSE Streaming) second**
   - /api/chat/stream route
   - Test route independently with curl/Postman
   - Verify SSE events stream correctly

3. **Merge Builder 3 (Frontend) last**
   - Chat page and components
   - Connect to tRPC router and SSE route
   - Test full flow end-to-end

4. **Conflict Resolution:**
   - Shared imports in src/types/chat.ts (unlikely conflict)
   - Package.json changes (none expected)
   - Prisma schema.prisma (Builder 1 only touches it)

## Deployment Plan

### Environment Configuration

**Required Environment Variables:**
- `ANTHROPIC_API_KEY` - Already configured in production (sk-ant-api03-...)
- `WEALTH_AI_ENABLED` - NEW, defaults to "true"

**Feature Flag:**
```typescript
// In .env.example
WEALTH_AI_ENABLED="true" # Set to "false" to disable AI chat feature
```

**Usage:**
```typescript
// In /api/chat/stream/route.ts
if (process.env.WEALTH_AI_ENABLED !== 'true') {
  return new Response('AI chat feature disabled', { status: 503 })
}
```

### Deployment Steps

1. **Pre-deployment:**
   - Merge all builders to main branch
   - Run tests (manual for Iteration 1)
   - Verify build succeeds (`npm run build`)

2. **Database Migration:**
   - Generate migration: `npx prisma migrate dev --name add-chat-models`
   - Apply to production: `npx prisma migrate deploy`

3. **Deploy to Vercel:**
   - Push to main branch (auto-deploys)
   - Monitor build logs for errors
   - Verify environment variables in Vercel dashboard

4. **Post-deployment Validation:**
   - Test /chat page loads
   - Create new session
   - Send test message: "What's my net worth?"
   - Verify streaming works
   - Test on mobile device (iOS Safari, Android Chrome)
   - Monitor Vercel logs for errors

5. **Rollback Plan:**
   - Set `WEALTH_AI_ENABLED=false` in Vercel dashboard
   - Redeploy previous commit if critical bug found
   - Database rollback: `prisma migrate resolve --rolled-back add-chat-models`

### Monitoring

**Day 1 Manual Checks:**
- Vercel logs: Check for errors in /api/chat/stream
- Claude API usage: Check Anthropic console for cost
- Database: Check ChatSession and ChatMessage table growth
- User feedback: Monitor for bug reports

**Cost Monitoring:**
- Target: <$5/day for 20 active users
- Alert threshold: $20/day (manual check)
- Future: Automated cost alerts via Anthropic API billing webhooks

## Notes

- This iteration does NOT modify navigation (no sidebar/bottom nav changes)
- Chat accessible via direct URL: /chat
- Navigation integration deferred to Iteration 3
- No new npm packages required (Anthropic SDK already installed)
- Reuses existing UI patterns (shadcn/ui, dark mode, mobile-first)
