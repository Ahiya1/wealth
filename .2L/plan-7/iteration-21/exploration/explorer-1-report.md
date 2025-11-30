# Explorer 1 Report: Architecture & Structure

**Iteration:** 21 (Iteration 1 of Plan-7)  
**Focus Area:** Chat Foundation & Query Tools  
**Date:** 2025-11-30  
**Agent:** Explorer-1

---

## Executive Summary

Wealth has a mature, well-structured Next.js 14 App Router application with tRPC for type-safe APIs, Prisma for database access, and Supabase for authentication. The existing architecture provides excellent patterns for implementing the chat foundation. The Anthropic SDK is already integrated and proven in production for transaction categorization. The codebase uses shadcn/ui components with a warm, calm aesthetic that should extend naturally to the chat interface.

**Key Findings:**
- **tRPC Routers:** 13 existing routers with consistent patterns (488 lines avg) - ideal foundation for `chat.router.ts`
- **Service Layer:** 6 services totaling 5,546 lines - proven pattern for `chat.service.ts` and `chat-tools.service.ts`
- **Anthropic SDK:** Already integrated in `categorize.service.ts` (306 lines) - provides template for Claude Messages API usage
- **API Routes:** 5 Next.js route handlers - Server-Sent Events (SSE) pattern needed for `/api/chat/stream`
- **UI Components:** 90+ shadcn/ui components with mobile-first design - chat UI will follow established patterns

---

## Iteration Context

### Iteration 21 Scope
**Vision:** "Get the AI assistant talking and answering questions about financial data"

**Deliverables:**
1. **Database:** ChatSession and ChatMessage Prisma models
2. **Backend:** chat.router.ts, chat.service.ts, chat-tools.service.ts
3. **Backend:** /api/chat/stream route for Server-Sent Events streaming
4. **Frontend:** /chat page with ChatPageClient component
5. **Frontend:** 7 chat components (Sidebar, MessageList, Message, Input, StreamingIndicator, etc.)
6. **Features:** 6 read-only tools for querying financial data
7. **Infrastructure:** Rate limiting, prompt caching, WEALTH_AI_ENABLED feature flag

**Success Criteria:**
- User can create, list, delete chat sessions
- User can ask: "How much did I spend on groceries last month?"
- AI queries financial data via tools and responds accurately
- Streaming responses deliver first token <1s
- Mobile responsive design matches existing patterns

---

## Current Architecture Analysis

### 1. tRPC Router Patterns

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/api/routers/`

**Existing Routers (13 total):**
- `transactions.router.ts` (488 lines) - CRUD + AI categorization endpoints
- `analytics.router.ts` (272 lines) - Dashboard summary, spending trends, MoM comparison
- `budgets.router.ts` - Budget CRUD operations
- `accounts.router.ts` - Account management
- `categories.router.ts` - Category management
- `recurring.router.ts` - Recurring transactions
- `goals.router.ts` - Goal tracking
- `users.router.ts` - User profile
- `admin.router.ts` - Admin operations
- `exports.router.ts` - Data export
- `plaid.router.ts` - Plaid integration
- `bankConnections.router.ts` - Bank scraper connections
- `syncTransactions.router.ts` - Bank sync operations

**Key Pattern Observations:**

#### A. Router Structure
```typescript
// Standard pattern from transactions.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const transactionsRouter = router({
  list: protectedProcedure
    .input(z.object({ /* validation */ }))
    .query(async ({ ctx, input }) => { /* implementation */ }),
  
  create: protectedProcedure
    .input(z.object({ /* validation */ }))
    .mutation(async ({ ctx, input }) => { /* implementation */ }),
})
```

**Implications for chat.router.ts:**
- Use `protectedProcedure` for all chat endpoints (requires authentication)
- Use Zod schemas for input validation
- Context (`ctx`) provides `user`, `prisma`, `supabase`
- Queries for reads, mutations for writes
- Average 300-500 lines per router (expect similar for chat.router.ts)

#### B. Error Handling Pattern
```typescript
// From transactions.router.ts lines 100-105
const account = await ctx.prisma.account.findUnique({
  where: { id: input.accountId },
})

if (!account || account.userId !== ctx.user.id) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Account not found',
  })
}
```

**Chat Implementation:**
- Verify session ownership before returning messages
- Use `TRPCError` with appropriate codes (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST)
- Always validate userId matches for data access

#### C. Pagination Pattern
```typescript
// From transactions.router.ts lines 42-56
orderBy: { date: 'desc' },
take: input.limit + 1,
...(input.cursor && {
  cursor: { id: input.cursor },
  skip: 1,
}),

let nextCursor: string | undefined = undefined
if (transactions.length > input.limit) {
  const nextItem = transactions.pop()
  nextCursor = nextItem!.id
}
```

**Chat Implementation:**
- Apply cursor-based pagination to session list
- Use `createdAt` or `updatedAt` for ordering
- Default limit: 20 sessions, 50 messages

#### D. Aggregation Pattern
```typescript
// From analytics.router.ts lines 11-40
const [incomeResult, expensesResult] = await Promise.all([
  ctx.prisma.transaction.aggregate({
    where: { /* filters */ },
    _sum: { amount: true },
  }),
  ctx.prisma.transaction.aggregate({ /* ... */ }),
])
```

**Chat Implementation:**
- Use aggregates for tool queries (e.g., `get_spending_summary`)
- Leverage parallel queries with `Promise.all`
- Extract `_sum.amount` for totals

---

### 2. Service Layer Patterns

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/services/`

**Existing Services (6 total, 5,546 lines):**

#### A. `categorize.service.ts` (306 lines) - CRITICAL TEMPLATE

**Key Learnings for Chat Service:**

```typescript
// Lines 6-8: Anthropic SDK initialization
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Lines 200-210: Messages API call pattern
const message = await claude.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  temperature: 0.2,
  messages: [
    {
      role: 'user',
      content: prompt,
    },
  ],
})

// Lines 213-218: Response extraction
const firstBlock = message.content[0]
if (!firstBlock) {
  throw new Error('No content in Claude response')
}
const responseText = firstBlock.type === 'text' ? firstBlock.text : '[]'
```

**Direct Application to chat.service.ts:**
- Use same Anthropic SDK instance
- Upgrade to `claude-sonnet-4-5-20250514` (newer model specified in vision)
- Use Messages API with Tool Use (NOT Agent SDK as specified in master plan)
- Extract response from `content[0].text`

**Caching Pattern (lines 23-39):**
```typescript
async function getMerchantCategoryFromCache(
  merchant: string,
  prismaClient: PrismaClient
): Promise<string | null> {
  const normalizedMerchant = merchant.toLowerCase().trim()
  const cached = await prismaClient.merchantCategoryCache.findUnique({
    where: { merchant: normalizedMerchant },
    include: { category: true },
  })
  return cached?.categoryId || null
}
```

**Adaptation for Chat:**
- Implement prompt caching (50% cost reduction per master plan)
- Cache system prompts with financial context
- Use cache headers in Messages API calls

**Batch Processing (lines 136-147):**
```typescript
const batchSize = 50
for (let i = 0; i < uncachedTransactions.length; i += batchSize) {
  const batch = uncachedTransactions.slice(i, i + batchSize)
  try {
    const batchResults = await categorizeBatchWithClaude(/* ... */)
  } catch (error) {
    // Fallback handling
  }
}
```

**Not Needed for Chat:**
- Chat processes one message at a time (no batching)
- Tool calls are sequential within a conversation turn

#### B. `transaction-import.service.ts` (465 lines) - ORCHESTRATION PATTERN

**Key Learnings:**

```typescript
// Lines 66-238: Multi-step orchestration function
export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  prismaClient: PrismaClient = new PrismaClient()
): Promise<ImportResult> {
  // Step 1: Fetch and validate
  // Step 2: Find or create account
  // Step 3: Determine date range
  // Step 4: Scrape transactions
  // Step 5: Load existing for deduplication
  // Step 6: Run duplicate detection
  // Step 7: Get category
  // Step 8: Batch insert
  // Step 9: Fetch newly inserted
  // Step 10: Categorize
  // Step 11: Check budget alerts
  return { imported, skipped, categorized, alertsTriggered, errors }
}
```

**Application to chat.service.ts:**
- Similar orchestration for chat message processing:
  1. Fetch session + validate ownership
  2. Load message history (last 40 messages for context window)
  3. Build Claude Messages API payload with tools
  4. Stream response via SSE
  5. Handle tool calls (execute, return results, continue)
  6. Save assistant message + tool calls to database
  7. Return final response

**Atomic Transactions (lines 376-409):**
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Multiple operations in single transaction
  const insertResult = await tx.transaction.createMany({ /* ... */ })
  await tx.account.update({ /* ... */ })
  return insertResult.count
})
```

**Chat Implementation:**
- Use transactions for multi-step saves (message + tool calls + tool results)
- Ensures data consistency if streaming fails mid-response

#### C. `duplicate-detection.service.ts` (117 lines) - UTILITY PATTERN

**Key Learnings:**

```typescript
// Pure functions exported for reuse
export function isDuplicate(
  newTransaction: DuplicateCheckParams,
  existingTransactions: DuplicateCheckParams[]
): boolean { /* ... */ }

export function isMerchantSimilar(merchant1: string, merchant2: string): boolean { /* ... */ }

export function normalizeMerchant(name: string): string { /* ... */ }
```

**Adaptation for Chat:**
- Create `chat-tools.service.ts` with pure functions for each tool
- Each tool function is stateless and testable
- Tools call existing routers/services internally (e.g., `get_transactions` calls `transactionsRouter.list`)

---

### 3. Anthropic SDK Integration

**Current Usage (categorize.service.ts):**

**Installed Version:**
```json
// package.json line 32
"@anthropic-ai/sdk": "0.32.1"
```

**API Key Configuration:**
```typescript
// .env.example line 95
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Model Used:**
```typescript
// categorize.service.ts line 201
model: 'claude-3-5-sonnet-20241022'
```

**Upgrade Needed for Chat:**
- Switch to `claude-sonnet-4-5-20250514` (specified in master plan line 269)
- Add Tool Use capability (existing service only uses basic prompting)
- Implement streaming response handling

**Tool Use Pattern (NEW for Chat):**
```typescript
// From Anthropic docs - need to implement
const message = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  tools: [
    {
      name: 'get_transactions',
      description: 'Fetch transactions filtered by date, category, account',
      input_schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          categoryId: { type: 'string' },
          // ...
        },
      },
    },
    // ... other 5 tools
  ],
  messages: [
    { role: 'user', content: 'How much did I spend on groceries last month?' },
  ],
})

// Handle tool_use content blocks
if (message.stop_reason === 'tool_use') {
  // Execute tools, build tool_result messages, continue conversation
}
```

**Streaming Pattern (NEW for Chat):**
```typescript
// From Anthropic docs - need to implement for /api/chat/stream
const stream = await claude.messages.stream({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  messages: [/* ... */],
  tools: [/* ... */],
})

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    // Send SSE event to client with text delta
  } else if (event.type === 'message_stop') {
    // Finalize and save to database
  }
}
```

---

### 4. Database Model Patterns

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/prisma/schema.prisma` (487 lines)

**Key Pattern Observations:**

#### A. User-Scoped Models
```prisma
// Lines 210-246: Transaction model
model Transaction {
  id        String   @id @default(cuid())
  userId    String
  // ... fields
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([userId, date(sort: Desc)])
}
```

**Chat Models (NEW):**
```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   // Auto-generated from first message
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
  role        String   // USER, ASSISTANT, TOOL_CALL, TOOL_RESULT
  content     String   @db.Text
  toolCalls   Json?    // Store tool_use blocks
  toolResults Json?    // Store tool_result blocks
  createdAt   DateTime @default(now())
  
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
  @@index([sessionId, createdAt(sort: Asc)])
}
```

**Key Decisions:**
- Use `@db.Text` for message content (unbounded length)
- Use `Json` type for tool calls/results (flexible structure)
- Add composite indexes for efficient queries
- Cascade delete on session deletion
- No token tracking in Iteration 1 (add in future if needed)

#### B. Enum Patterns
```prisma
// Lines 162-168
enum AccountType {
  CHECKING
  SAVINGS
  CREDIT
  INVESTMENT
  CASH
}
```

**Chat Enum (NEW):**
```prisma
enum ChatMessageRole {
  USER
  ASSISTANT
  TOOL_CALL
  TOOL_RESULT
}
```

OR use String field with validation in code (more flexible for future roles).

#### C. JSON Field Pattern
```prisma
// Line 401: ExportHistory model
dateRange Json? // { from: ISO string, to: ISO string }
```

**Chat Implementation:**
```prisma
// ChatMessage model
toolCalls   Json?    // Array of tool_use blocks from Claude
toolResults Json?    // Array of tool_result blocks
```

**Storage Format:**
```typescript
// toolCalls example
{
  "tool_use_blocks": [
    {
      "id": "toolu_01A2B3C4D5",
      "type": "tool_use",
      "name": "get_transactions",
      "input": { "categoryId": "cat_groceries", "month": "2025-11" }
    }
  ]
}

// toolResults example
{
  "tool_results": [
    {
      "tool_use_id": "toolu_01A2B3C4D5",
      "content": "[{\"id\": \"txn_1\", \"amount\": -127.5, ...}]"
    }
  ]
}
```

---

### 5. API Route Patterns

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/app/api/`

**Existing Routes:**
- `/api/trpc/[trpc]/route.ts` - tRPC handler (21 lines)
- `/api/webhooks/plaid/route.ts` - Webhook handler
- `/api/cron/generate-recurring/route.ts` - Cron job
- `/api/cron/cleanup-exports/route.ts` - Cron job
- `/api/health/route.ts` - Health check

**Key Pattern from tRPC Route:**

```typescript
// /api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: process.env.NODE_ENV === 'development'
      ? ({ error }) => { console.error('tRPC failed:', error.message) }
      : undefined,
  })

export { handler as GET, handler as POST }
```

**New Route Needed: `/api/chat/stream/route.ts`**

**Implementation Pattern:**

```typescript
// NEW FILE: /api/chat/stream/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamChatResponse } from '@/server/services/chat.service'

export async function POST(req: NextRequest) {
  // 1. Authenticate user (Supabase)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // 2. Parse request body
  const { sessionId, message } = await req.json()
  
  // 3. Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream from Claude Messages API
        await streamChatResponse({
          userId: user.id,
          sessionId,
          message,
          onChunk: (text: string) => {
            // Send SSE event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            )
          },
          onComplete: () => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
      } catch (error) {
        controller.error(error)
      }
    },
  })
  
  // 4. Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**SSE Format:**
```
data: {"text": "I found"}
data: {"text": " 23 grocery"}
data: {"text": " transactions"}
data: {"text": " totaling ₪"}
data: {"text": "1,847."}
data: [DONE]
```

**Error Handling:**
- Timeout after 30 seconds (per master plan line 202)
- Send error event: `data: {"error": "Request timeout"}\n\n`
- Client retries with exponential backoff

---

### 6. Frontend Component Patterns

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/components/`

**Component Count:** 90+ components

**Key UI Patterns:**

#### A. Page Structure (Server + Client Components)
```typescript
// src/app/(dashboard)/dashboard/page.tsx (60 lines)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }
  
  return (
    <PageTransition duration="slow">
      <div className="space-y-4 sm:space-y-6">
        {/* Components */}
      </div>
    </PageTransition>
  )
}
```

**Chat Page Implementation:**
```typescript
// NEW FILE: src/app/(dashboard)/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatPageClient } from '@/components/chat/ChatPageClient'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }
  
  return <ChatPageClient />
}
```

**Why Client Component:**
- Needs real-time streaming state
- SSE connection management
- Input handling and form submission
- Session switching

#### B. shadcn/ui Component Usage
```typescript
// From dashboard page
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

**Chat Components (NEW):**
- Reuse: `Card`, `Button`, `Input`, `Skeleton`, `Dialog`, `DropdownMenu`
- New: `ChatMessage`, `ChatSidebar`, `StreamingIndicator`

**Button Pattern:**
```typescript
// From ui/button.tsx lines 7-31
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-11 px-4 py-2 sm:h-10",
        sm: "h-10 rounded-lg px-3 sm:h-9",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
  }
)
```

**Chat Send Button:**
```typescript
<Button
  type="submit"
  size="icon"
  disabled={!input.trim() || isStreaming}
  loading={isStreaming}
>
  <Send className="h-4 w-4" />
</Button>
```

**Card Pattern:**
```typescript
// From ui/card.tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-soft dark:shadow-none dark:border-warm-gray-700",
        className
      )}
      {...props}
    />
  )
)
```

**Chat Message Card:**
```typescript
<Card className={cn(
  "p-4",
  message.role === 'user' 
    ? "bg-sage-50 dark:bg-sage-900/30 ml-8" 
    : "bg-white dark:bg-warm-gray-900 mr-8"
)}>
  <div className="prose dark:prose-invert max-w-none">
    {message.content}
  </div>
</Card>
```

#### C. Mobile-First Responsive Design

**Spacing Pattern:**
```typescript
// space-y-4 sm:space-y-6 pattern (lines 29)
<div className="space-y-4 sm:space-y-6">
```

**Padding Pattern:**
```typescript
// From Card component (lines 25)
className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
```

**Chat Implementation:**
- Mobile: Full-width messages, compact padding
- Desktop: Max-width constrained, generous padding
- Use `sm:` and `lg:` breakpoints consistently

#### D. Dark Mode Support

**All components use Tailwind dark mode:**
```typescript
className="text-warm-gray-900 dark:text-warm-gray-100"
className="bg-white dark:bg-warm-gray-900"
className="border-warm-gray-200 dark:border-warm-gray-700"
```

**Chat Theme:**
- User messages: `bg-sage-50 dark:bg-sage-900/30`
- Assistant messages: `bg-white dark:bg-warm-gray-900`
- Input: `bg-white dark:bg-warm-gray-800`

---

### 7. Navigation Integration

**Desktop Sidebar:**
```typescript
// src/components/dashboard/DashboardSidebar.tsx (lines 54-95)
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: Receipt },
  { title: 'Recurring', href: '/recurring', icon: Calendar },
  { title: 'Budgets', href: '/budgets', icon: PieChart },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings },
]
```

**Mobile Bottom Navigation:**
```typescript
// src/lib/mobile-navigation.ts (lines 32-53)
export const primaryNavItems: NavigationItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/budgets', icon: PieChart, label: 'Budgets' },
  { href: '/goals', icon: Target, label: 'Goals' },
]

export const overflowNavItems: NavigationItem[] = [
  { href: '/recurring', icon: Calendar, label: 'Recurring Transactions' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/admin', icon: Shield, label: 'Admin', requiresAdmin: true },
]
```

**Chat Addition (Iteration 3 per master plan):**
- Desktop: Add to `navigationItems` array
- Mobile: Add to `primaryNavItems` (replace one existing item or add to overflow)
- Icon: `MessageSquare` from lucide-react

**NOT in Iteration 1:**
- Navigation changes deferred to Iteration 3 (lines 133, 148-149 of master plan)
- Iteration 1 focuses on `/chat` page accessible via direct URL

---

## Integration Points for Chat

### 1. Where New Code Fits

**New Files to Create (Backend):**
```
src/server/api/routers/chat.router.ts           (400-500 lines)
src/server/services/chat.service.ts             (500-600 lines)
src/server/services/chat-tools.service.ts       (300-400 lines)
src/app/api/chat/stream/route.ts                (100-150 lines)
```

**New Files to Create (Frontend):**
```
src/app/(dashboard)/chat/page.tsx               (20-30 lines)
src/components/chat/ChatPageClient.tsx          (300-400 lines)
src/components/chat/ChatSidebar.tsx             (150-200 lines)
src/components/chat/ChatMessageList.tsx         (150-200 lines)
src/components/chat/ChatMessage.tsx             (100-150 lines)
src/components/chat/ChatInput.tsx               (150-200 lines)
src/components/chat/StreamingIndicator.tsx      (50-75 lines)
src/components/chat/SessionListItem.tsx         (75-100 lines)
```

**Files to Modify:**
```
prisma/schema.prisma                            (+50 lines: ChatSession, ChatMessage models)
src/server/api/root.ts                          (+2 lines: import and add chat router)
.env.example                                    (+5 lines: WEALTH_AI_ENABLED documentation)
```

**Total Estimated New Code:** 2,500-3,200 lines  
**Total Estimated Modified Code:** 60 lines

### 2. Patterns to Follow

**Router Pattern:**
```typescript
// chat.router.ts structure
export const chatRouter = router({
  // Session management
  listSessions: protectedProcedure.query(/* ... */),
  getSession: protectedProcedure.input(z.object({ id: z.string() })).query(/* ... */),
  createSession: protectedProcedure.mutation(/* ... */),
  deleteSession: protectedProcedure.input(z.object({ id: z.string() })).mutation(/* ... */),
  
  // Message management
  getMessages: protectedProcedure.input(z.object({ sessionId: z.string() })).query(/* ... */),
  sendMessage: protectedProcedure.input(z.object({ sessionId: z.string(), message: z.string() })).mutation(/* ... */),
})
```

**Service Pattern:**
```typescript
// chat.service.ts structure
export async function sendChatMessage(params: {
  userId: string
  sessionId: string
  message: string
  prisma: PrismaClient
}): Promise<ChatResponse> {
  // 1. Validate session ownership
  // 2. Load message history
  // 3. Call Claude Messages API with tools
  // 4. Handle tool calls
  // 5. Save messages
  // 6. Return response
}

export async function streamChatResponse(params: {
  userId: string
  sessionId: string
  message: string
  onChunk: (text: string) => void
  onComplete: () => void
}): Promise<void> {
  // Similar to sendChatMessage but with streaming
}
```

**Tool Service Pattern:**
```typescript
// chat-tools.service.ts structure
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  userId: string,
  prisma: PrismaClient
): Promise<ToolResult> {
  switch (toolName) {
    case 'get_transactions':
      return await getTransactionsTool(toolInput, userId, prisma)
    case 'get_spending_summary':
      return await getSpendingSummaryTool(toolInput, userId, prisma)
    // ... other 4 tools
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

async function getTransactionsTool(input: any, userId: string, prisma: PrismaClient) {
  // Call existing transactionsRouter.list logic
  // Return formatted result for Claude
}
```

**Component Pattern:**
```typescript
// ChatPageClient.tsx structure
'use client'

export function ChatPageClient() {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  
  // tRPC queries
  const { data: sessionsData } = trpc.chat.listSessions.useQuery()
  const { data: messagesData } = trpc.chat.getMessages.useQuery({ sessionId: activeSessionId })
  
  // SSE streaming handler
  const handleSendMessage = async () => {
    setIsStreaming(true)
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeSessionId, message: input }),
    })
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      // Parse SSE and update UI
    }
    
    setIsStreaming(false)
  }
  
  return (
    <div className="flex h-screen">
      <ChatSidebar sessions={sessions} activeSessionId={activeSessionId} />
      <div className="flex-1 flex flex-col">
        <ChatMessageList messages={messages} />
        <ChatInput onSend={handleSendMessage} />
      </div>
    </div>
  )
}
```

### 3. Files to Create vs Modify

**CREATE (15 new files):**

Backend (4 files):
1. `src/server/api/routers/chat.router.ts`
2. `src/server/services/chat.service.ts`
3. `src/server/services/chat-tools.service.ts`
4. `src/app/api/chat/stream/route.ts`

Frontend (8 files):
5. `src/app/(dashboard)/chat/page.tsx`
6. `src/components/chat/ChatPageClient.tsx`
7. `src/components/chat/ChatSidebar.tsx`
8. `src/components/chat/ChatMessageList.tsx`
9. `src/components/chat/ChatMessage.tsx`
10. `src/components/chat/ChatInput.tsx`
11. `src/components/chat/StreamingIndicator.tsx`
12. `src/components/chat/SessionListItem.tsx`

Types (1 file):
13. `src/types/chat.ts` (ChatSession, ChatMessage, ToolCall types)

Tests (2 files):
14. `src/server/services/__tests__/chat-tools.service.test.ts`
15. `src/server/services/__tests__/chat.service.test.ts`

**MODIFY (3 files):**

1. `prisma/schema.prisma`
   - Add ChatSession model (15 lines)
   - Add ChatMessage model (15 lines)

2. `src/server/api/root.ts`
   - Import chatRouter (1 line)
   - Add to appRouter (1 line)

3. `.env.example`
   - Add WEALTH_AI_ENABLED documentation (5 lines)

---

## Recommended Implementation Approach

### Phase 1: Database & Models (2-3 hours)

**Step 1.1: Prisma Schema**
```prisma
// Add to prisma/schema.prisma

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String
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
  role        String   // USER, ASSISTANT, TOOL_CALL, TOOL_RESULT
  content     String   @db.Text
  toolCalls   Json?
  toolResults Json?
  createdAt   DateTime @default(now())
  
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
  @@index([sessionId, createdAt(sort: Asc)])
}
```

**Step 1.2: Generate & Push**
```bash
npx prisma generate
npx prisma db push
```

**Step 1.3: TypeScript Types**
```typescript
// src/types/chat.ts
export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'USER' | 'ASSISTANT' | 'TOOL_CALL' | 'TOOL_RESULT'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  createdAt: Date
}

export interface ToolCall {
  id: string
  type: 'tool_use'
  name: string
  input: Record<string, any>
}

export interface ToolResult {
  tool_use_id: string
  content: string
}
```

### Phase 2: Tool Service (3-4 hours)

**Step 2.1: Define Tool Schemas**
```typescript
// src/server/services/chat-tools.service.ts
import { z } from 'zod'

export const toolSchemas = {
  get_transactions: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(100).default(50),
  }),
  get_spending_summary: z.object({
    month: z.string(), // Format: "2025-11"
    categoryId: z.string().optional(),
  }),
  get_budget_status: z.object({
    month: z.string(),
  }),
  get_account_balances: z.object({}),
  get_categories: z.object({}),
  search_transactions: z.object({
    query: z.string().min(1),
  }),
}
```

**Step 2.2: Implement Tools**
```typescript
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  userId: string,
  prisma: PrismaClient
): Promise<{ content: string }> {
  // Validate tool exists
  const schema = toolSchemas[toolName as keyof typeof toolSchemas]
  if (!schema) {
    throw new Error(`Unknown tool: ${toolName}`)
  }
  
  // Validate input
  const validatedInput = schema.parse(toolInput)
  
  // Execute tool
  switch (toolName) {
    case 'get_transactions':
      return await getTransactionsTool(validatedInput, userId, prisma)
    // ... other tools
    default:
      throw new Error(`Unhandled tool: ${toolName}`)
  }
}

async function getTransactionsTool(
  input: z.infer<typeof toolSchemas.get_transactions>,
  userId: string,
  prisma: PrismaClient
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.accountId && { accountId: input.accountId }),
      ...((input.startDate || input.endDate) && {
        date: {
          ...(input.startDate && { gte: new Date(input.startDate) }),
          ...(input.endDate && { lte: new Date(input.endDate) }),
        },
      }),
    },
    include: {
      category: true,
      account: true,
    },
    orderBy: { date: 'desc' },
    take: input.limit,
  })
  
  return {
    content: JSON.stringify(transactions, null, 2),
  }
}
```

**Step 2.3: Export Tool Definitions for Claude**
```typescript
export function getToolDefinitions() {
  return [
    {
      name: 'get_transactions',
      description: 'Fetch user transactions filtered by date range, category, account, or search query',
      input_schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'ISO date string (e.g., 2025-11-01)' },
          endDate: { type: 'string', description: 'ISO date string' },
          categoryId: { type: 'string', description: 'Filter by category ID' },
          accountId: { type: 'string', description: 'Filter by account ID' },
          search: { type: 'string', description: 'Search payee/description' },
          limit: { type: 'number', description: 'Max results (1-100)', default: 50 },
        },
      },
    },
    // ... other 5 tools
  ]
}
```

### Phase 3: Chat Service (4-5 hours)

**Step 3.1: Basic Message Handler**
```typescript
// src/server/services/chat.service.ts
import Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import { getToolDefinitions, executeToolCall } from './chat-tools.service'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function sendChatMessage(params: {
  userId: string
  sessionId: string
  message: string
  prisma: PrismaClient
}): Promise<{ messageId: string; content: string }> {
  const { userId, sessionId, message, prisma } = params
  
  // 1. Validate session ownership
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })
  
  if (!session || session.userId !== userId) {
    throw new Error('Session not found or unauthorized')
  }
  
  // 2. Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'USER',
      content: message,
    },
  })
  
  // 3. Load message history (last 40 messages for context)
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })
  
  // 4. Build Claude messages array
  const claudeMessages = history.map((msg) => ({
    role: msg.role === 'USER' ? 'user' : 'assistant',
    content: msg.content,
  }))
  
  // 5. Call Claude API
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(userId, prisma),
    tools: getToolDefinitions(),
    messages: claudeMessages,
  })
  
  // 6. Handle tool calls (if any)
  let finalContent = ''
  if (response.stop_reason === 'tool_use') {
    finalContent = await handleToolUse(response, userId, sessionId, prisma)
  } else {
    finalContent = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : ''
  }
  
  // 7. Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: finalContent,
    },
  })
  
  return {
    messageId: assistantMessage.id,
    content: finalContent,
  }
}
```

**Step 3.2: Tool Use Handler**
```typescript
async function handleToolUse(
  response: any,
  userId: string,
  sessionId: string,
  prisma: PrismaClient
): Promise<string> {
  // Extract tool use blocks
  const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use')
  
  // Execute each tool
  const toolResults = await Promise.all(
    toolUseBlocks.map(async (toolUse: any) => {
      const result = await executeToolCall(
        toolUse.name,
        toolUse.input,
        userId,
        prisma
      )
      
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.content,
      }
    })
  )
  
  // Save tool call message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'TOOL_CALL',
      content: JSON.stringify(toolUseBlocks),
      toolCalls: toolUseBlocks,
    },
  })
  
  // Save tool result message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'TOOL_RESULT',
      content: JSON.stringify(toolResults),
      toolResults,
    },
  })
  
  // Continue conversation with tool results
  const followUpResponse = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    messages: [
      ...buildMessageHistory(sessionId, prisma),
      {
        role: 'assistant',
        content: response.content, // Include original tool_use response
      },
      {
        role: 'user',
        content: toolResults, // Tool results as user message
      },
    ],
  })
  
  return followUpResponse.content[0]?.type === 'text'
    ? followUpResponse.content[0].text
    : ''
}
```

**Step 3.3: System Prompt Builder**
```typescript
async function buildSystemPrompt(userId: string, prisma: PrismaClient): Promise<string> {
  // Fetch user context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  })
  
  return `You are a helpful financial assistant for the Wealth personal finance app.

User Information:
- Name: ${user?.name || 'User'}
- Currency: ${user?.currency || 'NIS'} (₪)

You have access to the user's financial data through tools:
- get_transactions: Fetch transactions filtered by date, category, account
- get_spending_summary: Get spending totals by category for a period
- get_budget_status: Check current budget status
- get_account_balances: Get all account balances
- get_categories: List available categories
- search_transactions: Free-text search

Guidelines:
- Be helpful, accurate, and concise
- Format currency as: "₪X,XXX.XX"
- When asked about spending, use get_spending_summary first for totals
- For detailed breakdowns, use get_transactions
- Always cite specific numbers when giving financial advice
- If uncertain, acknowledge limitations

Remember: You are reading actual financial data. Be precise and respectful.`
}
```

### Phase 4: tRPC Router (2-3 hours)

```typescript
// src/server/api/routers/chat.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { sendChatMessage } from '@/server/services/chat.service'

export const chatRouter = router({
  // Session Management
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.prisma.chatSession.findMany({
      where: { userId: ctx.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    return sessions
  }),
  
  getSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return session
    }),
  
  createSession: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.create({
        data: {
          userId: ctx.user.id,
          title: input.title || 'New Chat',
        },
      })
      return session
    }),
  
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.id },
      })
      
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      await ctx.prisma.chatSession.delete({
        where: { id: input.id },
      })
      
      return { success: true }
    }),
  
  // Message Management
  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify session ownership
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.sessionId },
      })
      
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      const messages = await ctx.prisma.chatMessage.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: 'asc' },
      })
      
      return messages
    }),
  
  // Non-streaming message send (for initial implementation)
  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await sendChatMessage({
        userId: ctx.user.id,
        sessionId: input.sessionId,
        message: input.message,
        prisma: ctx.prisma,
      })
      
      return result
    }),
})
```

**Add to root.ts:**
```typescript
// src/server/api/root.ts
import { chatRouter } from './routers/chat.router'

export const appRouter = router({
  // ... existing routers
  chat: chatRouter,
})
```

### Phase 5: SSE Streaming Route (3-4 hours)

```typescript
// src/app/api/chat/stream/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getToolDefinitions, executeToolCall } from '@/server/services/chat-tools.service'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // 2. Parse request
  const { sessionId, message } = await req.json()
  
  // 3. Validate session
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })
  
  if (!session || session.userId !== user.id) {
    return new Response('Session not found', { status: 404 })
  }
  
  // 4. Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'USER',
      content: message,
    },
  })
  
  // 5. Load history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })
  
  // 6. Create SSE stream
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build messages
        const claudeMessages = history.map((msg) => ({
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content,
        }))
        
        // Stream from Claude
        const stream = await claude.messages.stream({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 4096,
          system: await buildSystemPrompt(user.id),
          tools: getToolDefinitions(),
          messages: claudeMessages,
        })
        
        let fullContent = ''
        
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullContent += text
              
              // Send chunk
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              )
            }
          } else if (event.type === 'message_stop') {
            // Save assistant message
            await prisma.chatMessage.create({
              data: {
                sessionId,
                role: 'ASSISTANT',
                content: fullContent,
              },
            })
            
            // Send done
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        }
      } catch (error) {
        console.error('Stream error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        )
        controller.close()
      }
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

async function buildSystemPrompt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  })
  
  return `You are a helpful financial assistant for the Wealth personal finance app.

User Information:
- Name: ${user?.name || 'User'}
- Currency: ${user?.currency || 'NIS'} (₪)

You have access to the user's financial data through tools. Be helpful, accurate, and concise.`
}
```

### Phase 6: Frontend Components (5-6 hours)

**Step 6.1: Chat Page**
```typescript
// src/app/(dashboard)/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatPageClient } from '@/components/chat/ChatPageClient'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }
  
  return <ChatPageClient />
}
```

**Step 6.2: Main Chat Client**
```typescript
// src/components/chat/ChatPageClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { ChatSidebar } from './ChatSidebar'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'

export function ChatPageClient() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  
  // Queries
  const { data: sessions, refetch: refetchSessions } = trpc.chat.listSessions.useQuery()
  const { data: messages, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  )
  
  // Mutations
  const createSession = trpc.chat.createSession.useMutation()
  const deleteSession = trpc.chat.deleteSession.useMutation()
  
  // Auto-select first session
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions])
  
  const handleNewChat = async () => {
    const newSession = await createSession.mutateAsync({ title: 'New Chat' })
    setActiveSessionId(newSession.id)
    await refetchSessions()
  }
  
  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession.mutateAsync({ id: sessionId })
    if (sessionId === activeSessionId) {
      setActiveSessionId(sessions?.[0]?.id || null)
    }
    await refetchSessions()
  }
  
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions || []}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ChatMessageList messages={messages || []} />
        <ChatInput
          sessionId={activeSessionId}
          onMessageSent={() => refetchMessages()}
        />
      </div>
    </div>
  )
}
```

**Continue with other components following established patterns...**

---

## Technical Debt to Avoid

### 1. Authentication Pitfalls

**AVOID:**
```typescript
// Don't trust client-sent user IDs
const { userId } = await req.json() // VULNERABLE!
```

**DO:**
```typescript
// Always get user from Supabase session
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })
```

### 2. Session Ownership Validation

**AVOID:**
```typescript
// Don't assume session belongs to user
const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
```

**DO:**
```typescript
// Always verify ownership
const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
if (!session || session.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}
```

### 3. Context Window Management

**AVOID:**
```typescript
// Don't load entire message history
const messages = await prisma.chatMessage.findMany({
  where: { sessionId },
})
```

**DO:**
```typescript
// Limit to last 40 messages (fits in context window)
const messages = await prisma.chatMessage.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'asc' },
  take: 40,
})
```

### 4. Tool Execution Security

**AVOID:**
```typescript
// Don't execute arbitrary tool names
const result = await executeToolCall(toolName, input, userId, prisma) // Could execute any function!
```

**DO:**
```typescript
// Whitelist allowed tools
const ALLOWED_TOOLS = ['get_transactions', 'get_spending_summary', 'get_budget_status', 'get_account_balances', 'get_categories', 'search_transactions']

if (!ALLOWED_TOOLS.includes(toolName)) {
  throw new Error(`Unauthorized tool: ${toolName}`)
}
```

### 5. Streaming Error Handling

**AVOID:**
```typescript
// Don't let errors crash the stream silently
for await (const event of stream) {
  // If error occurs here, client hangs
}
```

**DO:**
```typescript
try {
  for await (const event of stream) {
    // ...
  }
} catch (error) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
  controller.close()
}
```

### 6. Rate Limiting

**AVOID:**
```typescript
// No rate limiting = API cost explosion
export async function POST(req: NextRequest) {
  // Anyone can spam this endpoint
}
```

**DO (Iteration 1):**
```typescript
// Implement basic rate limiting
const rateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimiter.get(userId)
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }
  
  if (userLimit.count >= 10) {
    return false // 10 messages per minute
  }
  
  userLimit.count++
  return true
}
```

### 7. Database N+1 Queries

**AVOID:**
```typescript
// Loading sessions one by one
for (const session of sessions) {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
  })
}
```

**DO:**
```typescript
// Use Prisma includes
const sessions = await prisma.chatSession.findMany({
  where: { userId },
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 1, // Just the latest message for preview
    },
  },
})
```

### 8. Prompt Injection

**AVOID:**
```typescript
// User message directly into system prompt
system: `You are a financial assistant. The user's name is ${userInput}.`
```

**DO:**
```typescript
// User data only in user messages, not system prompt
system: 'You are a financial assistant.'
messages: [
  { role: 'user', content: userInput },
]
```

### 9. Memory Leaks in Streaming

**AVOID:**
```typescript
// Storing entire response in memory
let fullResponse = ''
for await (const event of stream) {
  fullResponse += event.text // Could grow unbounded
}
```

**DO:**
```typescript
// Stream chunks immediately, store final only
let fullContent = ''
for await (const event of stream) {
  const text = event.delta.text
  fullContent += text
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
}
// Only save fullContent to database after stream completes
```

### 10. Missing Environment Variables

**AVOID:**
```typescript
// App crashes if ANTHROPIC_API_KEY not set
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

**DO:**
```typescript
// Graceful error handling
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable not set')
}

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

---

## Files Analysis

### Key Files Examined

| File | Lines | Purpose | Insights for Chat |
|------|-------|---------|-------------------|
| `src/server/api/routers/transactions.router.ts` | 488 | Transaction CRUD + AI categorization | Router pattern, error handling, mutation structure |
| `src/server/api/routers/analytics.router.ts` | 272 | Dashboard analytics queries | Aggregation patterns, parallel queries |
| `src/server/services/categorize.service.ts` | 306 | Claude API integration for categorization | Anthropic SDK usage, caching, batch processing |
| `src/server/services/transaction-import.service.ts` | 465 | Bank transaction import orchestration | Multi-step workflow, atomic transactions, error handling |
| `src/lib/services/duplicate-detection.service.ts` | 117 | Fuzzy matching for duplicate detection | Pure function pattern, utility service structure |
| `src/server/api/trpc.ts` | 144 | tRPC context and procedures | Protected procedure pattern, Supabase auth integration |
| `src/app/api/trpc/[trpc]/route.ts` | 21 | tRPC Next.js route handler | Route handler pattern, context creation |
| `prisma/schema.prisma` | 487 | Database schema | Model patterns, indexes, relations, JSON fields |
| `src/components/dashboard/DashboardSidebar.tsx` | 242 | Desktop navigation | Navigation structure, mobile menu, dropdown patterns |
| `src/components/mobile/BottomNavigation.tsx` | 133 | Mobile navigation | Bottom nav pattern, SSE hiding, active states |
| `src/lib/mobile-navigation.ts` | 123 | Navigation configuration | Centralized nav config, z-index hierarchy |
| `src/components/ui/button.tsx` | 65 | Button component | shadcn/ui pattern, loading states, variants |
| `src/components/ui/card.tsx` | 67 | Card component | Layout patterns, mobile-first spacing |
| `package.json` | 101 | Dependencies | Anthropic SDK 0.32.1, Next.js 14, tRPC 11, Prisma 5 |
| `.env.example` | 169 | Environment configuration | API keys, database URLs, feature flags |

**Total Lines Examined:** ~3,310 lines across 15 critical files

---

## Recommendations for Planner

### 1. Defer Navigation Integration to Iteration 3

**Rationale:**
- Master plan already schedules navigation for Iteration 3 (line 133)
- Allows focus on core chat functionality in Iteration 1
- Chat accessible via direct URL (`/chat`) without nav changes

**Action:**
- Do NOT modify DashboardSidebar or BottomNavigation in Iteration 1
- Create `/chat` route and components first
- Test thoroughly before adding to navigation

### 2. Use Existing Anthropic SDK (No New Dependencies)

**Rationale:**
- `@anthropic-ai/sdk` version 0.32.1 already installed
- Proven in production for categorization (5+ months)
- Supports Messages API and Tool Use

**Action:**
- Upgrade model to `claude-sonnet-4-5-20250514` in service code
- Add streaming support (SDK supports it)
- No package.json changes needed

### 3. Implement Tool Use, NOT Agent SDK

**Rationale:**
- Master plan explicitly states "Messages API with Tool Use (NOT Agent SDK)" (line 258)
- Agent SDK is overkill for financial queries
- Tool Use provides controlled, user-confirmed actions

**Action:**
- Define 6 tools with input schemas (Zod validation)
- Implement tool execution in chat-tools.service.ts
- Handle tool_use stop reason in streaming

### 4. Start with Non-Streaming, Add Streaming Later

**Rationale:**
- Non-streaming is simpler to implement and debug
- Can ship working chat faster
- Streaming can be added incrementally

**Suggested Phasing:**
- **Day 1-2:** Database models + tRPC router + basic tool service
- **Day 3:** Non-streaming chat.service.ts (sendChatMessage)
- **Day 4:** Frontend components using tRPC mutation
- **Day 5:** Add SSE streaming route and upgrade frontend

### 5. Tool Service Should Call Existing Routers

**Rationale:**
- Avoid duplicating query logic
- Leverage existing validation and authorization
- Maintain single source of truth

**Pattern:**
```typescript
async function getTransactionsTool(input: any, userId: string, prisma: PrismaClient) {
  // Reuse existing router logic
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      // ... same filters as transactionsRouter.list
    },
    include: { category: true, account: true },
  })
  
  return { content: JSON.stringify(transactions) }
}
```

### 6. Session Title Auto-Generation

**Rationale:**
- Master plan specifies auto-generated titles (line 70)
- Improves UX without user friction

**Implementation:**
```typescript
async function generateSessionTitle(firstMessage: string): Promise<string> {
  // Extract first 5 words
  const words = firstMessage.split(' ').slice(0, 5).join(' ')
  return words.length < 30 ? words : words.substring(0, 27) + '...'
}

// OR use Claude to generate a title (costs 1 API call per session)
const titleResponse = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 20,
  messages: [
    {
      role: 'user',
      content: `Generate a short title (3-5 words) for this chat:\n"${firstMessage}"`
    }
  ],
})
```

### 7. Rate Limiting from Day 1

**Rationale:**
- Master plan emphasizes rate limiting (line 191)
- Prevents API cost runaway
- Simple in-memory implementation sufficient for Iteration 1

**Implementation:**
```typescript
// In /api/chat/stream/route.ts
const RATE_LIMITS = {
  messagesPerMinute: 10,
  messagesPerHour: 100,
  messagesPerDay: 300,
}

// Use Vercel KV or in-memory Map for tracking
```

### 8. Prompt Caching Strategy

**Rationale:**
- 50% cost reduction per master plan (line 18, 192)
- System prompt is same across all messages

**Implementation:**
```typescript
// Use prompt caching beta feature
const response = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }, // Cache this block
    },
  ],
  messages: claudeMessages,
})
```

### 9. Error States for Frontend

**Rationale:**
- Streaming can fail (network, timeout, API error)
- Need clear user feedback and retry mechanism

**Components Needed:**
- ErrorMessage component (red card with retry button)
- StreamingIndicator with timeout detection
- Offline state detection

### 10. Testing Strategy

**Rationale:**
- Chat involves complex async flows
- Tool execution needs validation
- Streaming needs edge case handling

**Test Coverage:**
- Unit tests for tool functions (pure functions, easy to test)
- Integration tests for tRPC router endpoints
- E2E tests for full chat flow (Playwright)

**Priority Tests:**
```typescript
// chat-tools.service.test.ts
describe('getTransactionsTool', () => {
  it('filters by date range', async () => { /* ... */ })
  it('validates user ownership', async () => { /* ... */ })
  it('limits results to 100', async () => { /* ... */ })
})

// chat.router.test.ts
describe('chatRouter.sendMessage', () => {
  it('requires authentication', async () => { /* ... */ })
  it('validates session ownership', async () => { /* ... */ })
  it('saves user and assistant messages', async () => { /* ... */ })
})
```

---

## Complexity Risks

### HIGH Risk: SSE Streaming Reliability

**Challenge:**
- Mobile networks can drop connections
- Cloudflare/Vercel may have timeout limits
- Client needs to detect and recover from failures

**Mitigation:**
- Implement timeout detection (30s per master plan)
- Provide retry button on error
- Store partial responses in database
- Fall back to non-streaming on repeated failures

### MEDIUM Risk: Context Window Overflow

**Challenge:**
- Long conversations exceed Claude's context window
- Need smart truncation without losing context

**Mitigation:**
- Limit to last 40 messages (configurable)
- Implement context window token counting
- Notify user when history truncated
- Provide "start new session" option

### MEDIUM Risk: Tool Execution Performance

**Challenge:**
- Tool queries could be slow (complex analytics)
- User waits during tool execution
- No streaming during tool calls

**Mitigation:**
- Add loading indicators during tool execution
- Optimize tool queries (use indexes, aggregates)
- Set timeout for tool execution (5s)
- Stream tool results to UI as they arrive

### LOW Risk: Database Migration

**Challenge:**
- Adding new models to production database
- Potential conflicts with existing migrations

**Mitigation:**
- Use `prisma db push` for development
- Create proper migration for production
- Test migration on staging environment
- ChatSession/ChatMessage are additive (no schema changes to existing tables)

---

## Summary

The Wealth codebase is mature, well-architected, and provides excellent foundations for implementing the chat feature. The existing Anthropic SDK integration in `categorize.service.ts` serves as a proven template. The tRPC router patterns are consistent and secure. The UI component library is comprehensive and mobile-first.

**Key Success Factors:**
1. Follow existing patterns religiously (router, service, component structure)
2. Reuse proven code (Anthropic SDK, tool logic from existing routers)
3. Implement rate limiting and security from Day 1
4. Start simple (non-streaming), add complexity incrementally
5. Test thoroughly before adding to navigation

**Estimated Effort:** 16-20 hours (matches master plan)

**Builder Readiness:** HIGH - Clear patterns, proven infrastructure, comprehensive guidance in this report.

---

**Report Status:** COMPLETE  
**Next Step:** Planner synthesizes all 3 explorer reports into detailed implementation plan for builders.
