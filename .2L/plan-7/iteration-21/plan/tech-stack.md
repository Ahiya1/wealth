# Technology Stack - Iteration 21

## Core Framework

**Decision:** Next.js 14.3.0-canary.87 (App Router)

**Rationale:**
- Already used throughout Wealth codebase (proven stable)
- App Router provides native Server Components and streaming support
- Route Handlers (src/app/api/*) ideal for SSE implementation
- Server/client component split matches chat architecture (auth on server, streaming on client)

**Alternatives Considered:**
- Remix: Not worth migration cost for one feature
- Pages Router: Lacks native streaming support
- Express API: Adds complexity, inconsistent with existing stack

## Model & API

**Decision:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`) via Anthropic Messages API

**Rationale:**
- Anthropic SDK v0.32.1 already installed and proven in production (categorize.service.ts)
- Sonnet 4.5 provides:
  - 200K context window (enough for 40 messages + tool definitions)
  - Tool Use capability (6 financial query tools)
  - Streaming support for real-time responses
  - Prompt caching (50% cost reduction on system prompt)
- Messages API provides controlled tool execution (vs Agent SDK auto-execution)
- Current model (claude-3-5-sonnet-20241022) proven for categorization, upgrade straightforward

**Configuration:**
```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const response = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  temperature: 0.3, // Balanced creativity/consistency
  stream: true, // Enable SSE streaming
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }, // Cache for 5 minutes
    },
  ],
  tools: [...toolDefinitions],
  messages: conversationHistory,
})
```

**Alternatives Considered:**
- OpenAI GPT-4: Less mature tool use, higher cost, no existing integration
- Gemini: Unproven for financial queries, API less stable
- Agent SDK: Overkill for simple tool use, less control over execution

## Database

**Decision:** PostgreSQL via Supabase + Prisma ORM 5.x

**Rationale:**
- Already used for all data (Transaction, Account, Budget, etc.)
- Prisma ORM provides type-safe queries and migrations
- Two new models fit naturally into existing schema
- No migration conflicts (additive changes only)

**Schema Strategy:**

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   // Auto-generated in Iteration 3
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId])
  @@index([userId, updatedAt(sort: Desc)])
}

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  role        String   // 'user' | 'assistant'
  content     String   @db.Text
  toolCalls   Json?    // Array of tool_use blocks
  toolResults Json?    // Array of tool_result blocks
  createdAt   DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt(sort: Asc)])
}
```

**Key Decisions:**
- `@db.Text` for message content (supports long AI responses)
- `Json` type for tool calls/results (flexible structure, matches Claude API)
- Composite indexes for efficient queries (userId + updatedAt, sessionId + createdAt)
- Cascade delete on user deletion (GDPR compliance)
- `role` as String (not Enum) for flexibility (Iteration 2 adds 'system' role)

**Migration:**
```bash
npx prisma migrate dev --name add-chat-models
npx prisma generate
npx prisma db push # Development only
```

## API Layer

**Decision:** tRPC v11 for session management + Next.js Route Handler for streaming

**Rationale:**
- tRPC already used for all API operations (13 existing routers)
- tRPC provides type safety, auth middleware, error handling
- tRPC NOT suitable for streaming (WebSocket/SSE not supported)
- Next.js Route Handlers ideal for SSE (native ReadableStream support)

**tRPC Router (chat.router.ts):**
```typescript
export const chatRouter = router({
  listSessions: protectedProcedure.query(/* ... */),
  getSession: protectedProcedure.input(z.object({ id: z.string() })).query(/* ... */),
  createSession: protectedProcedure.mutation(/* ... */),
  deleteSession: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
  getMessages: protectedProcedure.input(z.object({ sessionId: z.string() })).query(/* ... */),
})
```

**SSE Route (/api/chat/stream/route.ts):**
```typescript
export async function POST(req: NextRequest) {
  // 1. Authenticate via Supabase
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // 2. Create ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = await claude.messages.stream({
        model: 'claude-sonnet-4-5-20250514',
        messages: conversationHistory,
        tools: toolDefinitions,
      })

      for await (const event of claudeStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

## Authentication

**Decision:** Supabase Auth (existing implementation)

**Rationale:**
- Already integrated throughout codebase
- Server-side auth via createClient() from @/lib/supabase/server
- User ID available in tRPC context (ctx.user.id)
- Session verification in Route Handler via getUser()

**Implementation Notes:**
- tRPC router: Use `protectedProcedure` (requires auth)
- SSE route: Manual auth check with `getUser()` helper
- All chat operations scoped to userId (prevent data leaks)

```typescript
// tRPC context provides authenticated user
const { ctx } = protectedProcedure
console.log(ctx.user.id) // User ID from Supabase session

// Route handler requires manual check
const user = await getUser()
if (!user) return new Response('Unauthorized', { status: 401 })
```

## Frontend

**Decision:** React 18 with Next.js App Router Server/Client Components

**UI Component Library:** shadcn/ui (90+ components already installed)

**Styling:** Tailwind CSS with custom warm/sage color palette

**Rationale:**
- Entire app built with shadcn/ui (Button, Card, Input, Dialog, etc.)
- Mobile-first responsive design already established
- Dark mode support via Tailwind dark: classes
- Component composition pattern proven across 90+ existing components

**Chat-Specific Components:**

New components to create:
1. **ChatPageClient.tsx** (400 lines) - Main client component with state management
2. **ChatSidebar.tsx** (200 lines) - Session list with create/delete actions
3. **ChatMessageList.tsx** (200 lines) - Scrollable message area with auto-scroll
4. **ChatMessage.tsx** (150 lines) - Individual message bubble with role-based styling
5. **ChatInput.tsx** (200 lines) - Text input with send button and streaming state
6. **StreamingIndicator.tsx** (75 lines) - Animated typing indicator
7. **SessionListItem.tsx** (100 lines) - Single session in sidebar with delete button

Reused components:
- Button (submit, delete, new session)
- Card (message bubbles)
- Input (message text input)
- Dialog (delete confirmation)
- Skeleton (loading states)

**State Management:**

```typescript
// ChatPageClient.tsx
const [sessions, setSessions] = useState<ChatSession[]>([])
const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
const [messages, setMessages] = useState<ChatMessage[]>([])
const [input, setInput] = useState('')
const [isStreaming, setIsStreaming] = useState(false)

// tRPC queries
const { data: sessionsData } = trpc.chat.listSessions.useQuery()
const { data: messagesData } = trpc.chat.getMessages.useQuery({ sessionId: activeSessionId })

// SSE streaming
const sendMessage = async () => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ messages, sessionId: activeSessionId }),
  })

  const reader = response.body.getReader()
  // Parse SSE events and update messages state
}
```

## Tool Execution Pattern

**Decision:** Tools call existing tRPC procedures via createCaller

**Rationale:**
- Reuses all validation, authorization, error handling from existing routers
- Zero code duplication (DRY principle)
- Type-safe tool implementations
- Centralized business logic

**Pattern:**

```typescript
// chat-tools.service.ts
import { createCaller } from '@/server/api/root'
import { prisma } from '@/lib/prisma'

async function executeToolCall(toolName: string, toolInput: any, userId: string) {
  // Create authenticated caller context
  const caller = await createCaller({
    user: { id: userId },
    prisma,
  })

  switch (toolName) {
    case 'get_transactions':
      return await executeTool_getTransactions(toolInput, caller)
    case 'get_spending_summary':
      return await executeTool_getSpendingSummary(toolInput, caller)
    // ... other 4 tools
  }
}

async function executeTool_getTransactions(params: any, caller: Caller) {
  // Call existing tRPC procedure
  const result = await caller.transactions.list({
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    categoryId: params.categoryId,
    accountId: params.accountId,
    limit: params.limit || 50,
  })

  // Serialize for Claude (remove Prisma types)
  return {
    transactions: result.transactions.map(serializeTransaction),
    count: result.transactions.length,
  }
}
```

**Tool Definitions (for Claude API):**

```typescript
export const toolDefinitions = [
  {
    name: 'get_transactions',
    description: 'Retrieve user transactions with optional filters...',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date' },
        endDate: { type: 'string', description: 'ISO date' },
        categoryId: { type: 'string' },
        accountId: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'number', default: 50 },
      },
    },
  },
  // ... 5 more tools
]
```

## Environment Variables

**Required:**
```bash
# .env.example
ANTHROPIC_API_KEY="sk-ant-api03-..." # Already configured in production
WEALTH_AI_ENABLED="true" # NEW: Feature flag for emergency disable
```

**Optional:**
```bash
# Future enhancements
CHAT_RATE_LIMIT_PER_MINUTE="10"
CHAT_RATE_LIMIT_PER_HOUR="100"
CHAT_RATE_LIMIT_PER_DAY="300"
```

## Dependencies Overview

**No new production dependencies required!**

Existing dependencies used:
- `@anthropic-ai/sdk` v0.32.1 - Claude API client
- `@trpc/server` v11.x - tRPC server
- `@trpc/react-query` v11.x - tRPC client hooks
- `@prisma/client` v5.x - Database ORM
- `zod` v3.x - Schema validation
- `tailwindcss` v3.x - Styling
- `lucide-react` v0.x - Icons

**Optional (Iteration 2):**
- `react-markdown` v9.0.0 - Render markdown in AI responses
- `remark-gfm` v4.0.0 - GitHub Flavored Markdown support

## Rate Limiting

**Decision:** In-memory Map for Iteration 1, Redis/Upstash in future

**Implementation:**

```typescript
// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

// Usage in /api/chat/stream
if (!checkRateLimit(user.id, 10, 60000)) {
  return new Response('Rate limit exceeded', { status: 429 })
}
```

**Limits:**
- 10 messages per minute (prevents spam)
- 100 messages per hour (reasonable usage)
- 300 messages per day (power users)

**Future Enhancement:**
- Migrate to Upstash Redis for distributed rate limiting
- Per-user tier limits (free vs premium)
- Rate limit headers in response

## Performance Targets

- **First token latency:** <1s (p95) - streaming starts quickly
- **Full response time:** <8s (p95) - complete answer delivered
- **Database queries:** <500ms (p95) - tool execution fast
- **Session load:** <200ms (p95) - chat history loads quickly
- **API cost:** <$5/day for 20 users - prompt caching critical

## Security Considerations

**User Data Access:**
- All tools scoped to userId (prevent cross-user data leaks)
- Session ownership validated on every operation
- Tool execution uses authenticated tRPC caller

**Input Validation:**
- Zod schemas on all tRPC procedures
- Tool input validation before execution
- File size limits (future: 10MB PDF, 5MB CSV)

**Prompt Injection Prevention:**
- User messages in 'user' role only (not in system prompt)
- Tool results sanitized (no executable code)
- Claude API handles adversarial input

**Rate Limiting:**
- Prevents API cost runaway
- Mitigates abuse (spam, DOS)
- Per-user limits (not global)

**Feature Flag:**
- `WEALTH_AI_ENABLED` for emergency disable
- Can shut down AI feature without code deploy
