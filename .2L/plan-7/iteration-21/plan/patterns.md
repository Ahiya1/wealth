# Code Patterns & Conventions - Iteration 21

## File Structure

```
wealth/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── chat/
│   │   │       └── page.tsx              # Server Component (auth check)
│   │   └── api/
│   │       └── chat/
│   │           └── stream/
│   │               └── route.ts          # SSE streaming Route Handler
│   ├── components/
│   │   └── chat/
│   │       ├── ChatPageClient.tsx        # Main client component
│   │       ├── ChatSidebar.tsx           # Session list
│   │       ├── ChatMessageList.tsx       # Message display area
│   │       ├── ChatMessage.tsx           # Single message bubble
│   │       ├── ChatInput.tsx             # Text input + send
│   │       ├── StreamingIndicator.tsx    # Typing animation
│   │       └── SessionListItem.tsx       # Session in sidebar
│   ├── server/
│   │   ├── api/
│   │   │   └── routers/
│   │   │       └── chat.router.ts        # tRPC session management
│   │   └── services/
│   │       ├── chat.service.ts           # Claude API orchestration
│   │       └── chat-tools.service.ts     # Tool definitions & execution
│   ├── types/
│   │   └── chat.ts                       # TypeScript interfaces
│   └── lib/
│       └── utils/
│           └── chat-helpers.ts           # Utility functions
└── prisma/
    └── schema.prisma                     # Database models
```

## Naming Conventions

- **Components:** PascalCase (`ChatPageClient.tsx`, `ChatMessage.tsx`)
- **Files:** camelCase for utilities (`chat-helpers.ts`, `chat.service.ts`)
- **Types:** PascalCase (`ChatSession`, `ChatMessage`, `ToolCall`)
- **Functions:** camelCase (`sendChatMessage()`, `executeToolCall()`)
- **Constants:** SCREAMING_SNAKE_CASE (`TOOL_DEFINITIONS`, `RATE_LIMIT_PER_MINUTE`)
- **tRPC procedures:** camelCase (`listSessions`, `createSession`)

## Database Patterns

### Prisma Schema Convention

```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("New Chat")
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
  toolCalls   Json?
  toolResults Json?
  createdAt   DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt(sort: Asc)])
}
```

**Key Points:**
- Use `@db.Text` for unbounded text (message content)
- Use `Json` type for flexible data (tool calls/results)
- Always add indexes for query optimization
- Use `@default(cuid())` for IDs (consistent with existing models)
- `onDelete: Cascade` for cleanup (user deleted = sessions deleted)

### Query Pattern (Session List)

```typescript
// Efficient query with ordering
const sessions = await prisma.chatSession.findMany({
  where: { userId: ctx.user.id },
  orderBy: { updatedAt: 'desc' },
  take: 50,
})
```

### Query Pattern (Message History)

```typescript
// Load messages with ascending order (oldest first for conversation context)
const messages = await prisma.chatMessage.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'asc' },
  take: 40, // Last 40 messages fit in context window
})
```

### Mutation Pattern (Create Session)

```typescript
const session = await prisma.chatSession.create({
  data: {
    userId: ctx.user.id,
    title: 'New Chat', // Placeholder, auto-generated in Iteration 3
  },
})
```

### Transaction Pattern (Save User + Assistant Message)

```typescript
// Atomic message save
await prisma.$transaction(async (tx) => {
  // User message
  await tx.chatMessage.create({
    data: {
      sessionId,
      role: 'user',
      content: userMessage,
    },
  })

  // Assistant message
  await tx.chatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: assistantMessage,
      toolCalls: toolCallsJson,
      toolResults: toolResultsJson,
    },
  })

  // Update session timestamp
  await tx.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })
})
```

## tRPC Router Patterns

### Router Structure

```typescript
// src/server/api/routers/chat.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

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

      // Validate ownership
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      return session
    }),

  createSession: protectedProcedure.mutation(async ({ ctx }) => {
    const session = await ctx.prisma.chatSession.create({
      data: {
        userId: ctx.user.id,
        title: 'New Chat',
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

      // Validate ownership before delete
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      await ctx.prisma.chatSession.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

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
})
```

**Key Points:**
- Always use `protectedProcedure` (requires authentication)
- Validate ownership on every query/mutation
- Use Zod for input validation
- Throw `TRPCError` with appropriate codes (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST)
- Use `ctx.user.id` for user scoping

### Adding to Root Router

```typescript
// src/server/api/root.ts
import { chatRouter } from './routers/chat.router'

export const appRouter = router({
  // ... existing routers
  chat: chatRouter,
})

export type AppRouter = typeof appRouter
```

## Service Layer Patterns

### Chat Service Structure

```typescript
// src/server/services/chat.service.ts
import Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import { getToolDefinitions, executeToolCall } from './chat-tools.service'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface SendMessageParams {
  userId: string
  sessionId: string
  message: string
  prisma: PrismaClient
}

export async function sendChatMessage(params: SendMessageParams) {
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
      role: 'user',
      content: message,
    },
  })

  // 3. Load message history (last 40 for context)
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })

  // 4. Build Claude messages array
  const claudeMessages = history.map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }))

  // 5. Build system prompt
  const systemPrompt = await buildSystemPrompt(userId, prisma)

  // 6. Call Claude API
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    temperature: 0.3,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: getToolDefinitions(),
    messages: claudeMessages,
  })

  // 7. Handle tool use if needed
  let finalContent = ''
  if (response.stop_reason === 'tool_use') {
    finalContent = await handleToolUse(response, userId, sessionId, prisma)
  } else {
    const textBlock = response.content.find((block) => block.type === 'text')
    finalContent = textBlock?.type === 'text' ? textBlock.text : ''
  }

  // 8. Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: finalContent,
    },
  })

  return {
    messageId: assistantMessage.id,
    content: finalContent,
  }
}

async function buildSystemPrompt(userId: string, prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  })

  return `You are Wealth AI, a helpful financial assistant for ${user?.name || 'the user'}.

CONTEXT:
- User currency: ${user?.currency || 'NIS'} (Israeli Shekel, ₪)
- You have access to real financial data via tools

GUIDELINES:
1. Always use tools to fetch real data - never make up numbers
2. Format amounts as: "₪X,XXX.XX" (e.g., "₪1,234.56")
3. Be conversational and helpful, not robotic
4. Provide actionable insights, not just data dumps
5. If unsure, ask clarifying questions

EXAMPLES:
User: "How much did I spend on groceries last month?"
You: [Use get_transactions with category filter]
Response: "You spent ₪1,245.50 on groceries in November. That's about ₪40/day."

Now help the user manage their finances!`
}

async function handleToolUse(response: any, userId: string, sessionId: string, prisma: PrismaClient) {
  // Extract tool use blocks
  const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use')

  // Execute each tool
  const toolResults = await Promise.all(
    toolUseBlocks.map(async (toolUse: any) => {
      const result = await executeToolCall(toolUse.name, toolUse.input, userId, prisma)

      return {
        type: 'tool_result' as const,
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      }
    })
  )

  // Save tool call and result messages
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: 'Tool execution',
      toolCalls: toolUseBlocks,
      toolResults: toolResults,
    },
  })

  // Continue conversation with tool results
  const followUpResponse = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'assistant',
        content: response.content,
      },
      {
        role: 'user',
        content: toolResults,
      },
    ],
  })

  const textBlock = followUpResponse.content.find((block) => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : ''
}
```

### Tool Service Structure

```typescript
// src/server/services/chat-tools.service.ts
import { z } from 'zod'
import { createCaller } from '@/server/api/root'
import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

// Tool definitions for Claude API
export function getToolDefinitions() {
  return [
    {
      name: 'get_transactions',
      description: 'Retrieve user transactions with optional filters for date range, category, account, and search query',
      input_schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'ISO date string (e.g., "2025-11-01T00:00:00.000Z")' },
          endDate: { type: 'string', description: 'ISO date string' },
          categoryId: { type: 'string', description: 'Filter by category ID' },
          accountId: { type: 'string', description: 'Filter by account ID' },
          search: { type: 'string', description: 'Free-text search on payee' },
          limit: { type: 'number', description: 'Max results (1-50)', default: 50 },
        },
      },
    },
    {
      name: 'get_spending_summary',
      description: 'Get spending totals by category for a time period',
      input_schema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'ISO date string (required)' },
          endDate: { type: 'string', description: 'ISO date string (required)' },
          categoryId: { type: 'string', description: 'Optional: filter to single category' },
        },
        required: ['startDate', 'endDate'],
      },
    },
    // ... 4 more tools
  ]
}

// Zod schemas for validation
const toolSchemas = {
  get_transactions: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(50).default(50),
  }),
  get_spending_summary: z.object({
    startDate: z.string(),
    endDate: z.string(),
    categoryId: z.string().optional(),
  }),
  // ... 4 more schemas
}

// Execute tool call
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  userId: string,
  prismaClient: PrismaClient
): Promise<any> {
  // Create authenticated caller
  const caller = await createCaller({
    user: { id: userId },
    prisma: prismaClient,
  })

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
      return await executeTool_getTransactions(validatedInput, caller)
    case 'get_spending_summary':
      return await executeTool_getSpendingSummary(validatedInput, caller)
    // ... 4 more cases
    default:
      throw new Error(`Unhandled tool: ${toolName}`)
  }
}

// Tool implementations
async function executeTool_getTransactions(
  input: z.infer<typeof toolSchemas.get_transactions>,
  caller: any
) {
  const result = await caller.transactions.list({
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    categoryId: input.categoryId,
    accountId: input.accountId,
    limit: input.limit,
  })

  // Apply search filter if provided
  let transactions = result.transactions
  if (input.search) {
    const searchLower = input.search.toLowerCase()
    transactions = transactions.filter((t) =>
      t.payee.toLowerCase().includes(searchLower)
    )
  }

  // Serialize for Claude (remove Prisma types)
  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      amount: Number(t.amount),
      payee: t.payee,
      category: {
        id: t.category.id,
        name: t.category.name,
        color: t.category.color,
        icon: t.category.icon,
      },
      account: {
        id: t.account.id,
        name: t.account.name,
        type: t.account.type,
      },
      notes: t.notes || undefined,
      tags: t.tags,
    })),
    count: transactions.length,
  }
}

async function executeTool_getSpendingSummary(
  input: z.infer<typeof toolSchemas.get_spending_summary>,
  caller: any
) {
  const result = await caller.analytics.spendingByCategory({
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
  })

  // Filter if categoryId specified
  const filtered = input.categoryId
    ? result.filter((c: any) => c.categoryId === input.categoryId)
    : result

  const totalSpending = filtered.reduce((sum: number, c: any) => sum + c.amount, 0)

  return {
    period: { start: input.startDate, end: input.endDate },
    totalSpending,
    byCategory: filtered.map((c: any) => ({
      category: c.category,
      amount: c.amount,
      color: c.color,
      percentage: totalSpending > 0 ? (c.amount / totalSpending) * 100 : 0,
    })),
  }
}
```

**Key Points:**
- Tools call existing tRPC procedures (zero duplication)
- Validate input with Zod schemas
- Serialize Prisma types (Date, Decimal) to JSON-friendly types
- Return plain objects (no Prisma models)

## SSE Streaming Route Pattern

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Check feature flag
  if (process.env.WEALTH_AI_ENABLED !== 'true') {
    return new Response('AI chat feature disabled', { status: 503 })
  }

  // 3. Rate limiting
  const rateLimitOk = checkRateLimit(user.id, 10, 60000) // 10 per minute
  if (!rateLimitOk) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  // 4. Parse request
  const { sessionId, message } = await req.json()

  // 5. Validate session
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.userId !== user.id) {
    return new Response('Session not found', { status: 404 })
  }

  // 6. Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'user',
      content: message,
    },
  })

  // 7. Load history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })

  // 8. Create SSE stream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build messages
        const claudeMessages = history.map((msg) => ({
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }))

        // Stream from Claude
        const claudeStream = await claude.messages.stream({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 4096,
          temperature: 0.3,
          system: await buildSystemPrompt(user.id),
          tools: getToolDefinitions(),
          messages: claudeMessages,
        })

        let fullContent = ''

        for await (const event of claudeStream) {
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
                role: 'assistant',
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
          encoder.encode(
            `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// Rate limiting helper
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

async function buildSystemPrompt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  })

  return `You are Wealth AI, a helpful financial assistant for ${user?.name || 'the user'}.

CONTEXT:
- User currency: ${user?.currency || 'NIS'} (₪)
- You have access to real financial data via tools

GUIDELINES:
1. Always use tools to fetch real data
2. Format amounts as: "₪X,XXX.XX"
3. Be conversational and helpful
4. Provide actionable insights

Now help the user manage their finances!`
}
```

## Frontend Component Patterns

### Page Structure (Server + Client)

```typescript
// src/app/(dashboard)/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatPageClient } from '@/components/chat/ChatPageClient'

export default async function ChatPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <ChatPageClient />
}
```

### Main Client Component

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

  // tRPC queries
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
  }, [sessions, activeSessionId])

  const handleNewChat = async () => {
    const newSession = await createSession.mutateAsync()
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
      <div className="flex flex-1 flex-col">
        <ChatMessageList messages={messages || []} />
        <ChatInput sessionId={activeSessionId} onMessageSent={() => refetchMessages()} />
      </div>
    </div>
  )
}
```

### Chat Input with SSE Streaming

```typescript
// src/components/chat/ChatInput.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, StopCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ChatInputProps {
  sessionId: string | null
  onMessageSent: () => void
}

export function ChatInput({ sessionId, onMessageSent }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return

    const userMessage = input
    setInput('')
    setIsStreaming(true)

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMessage }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Streaming failed')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6)
          if (data === '[DONE]') {
            setIsStreaming(false)
            onMessageSent()
            return
          }

          try {
            const event = JSON.parse(data)
            if (event.error) {
              throw new Error(event.error)
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', data)
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        toast.info('Message cancelled')
      } else {
        toast.error('Failed to send message')
        console.error('Streaming error:', error)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const handleCancel = () => {
    abortControllerRef.current?.abort()
  }

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  return (
    <div className="border-t border-warm-gray-200 bg-white p-4 dark:border-warm-gray-700 dark:bg-warm-gray-900">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={isStreaming || !sessionId}
          className="flex-1"
        />
        {isStreaming ? (
          <Button type="button" size="icon" variant="outline" onClick={handleCancel}>
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim() || !sessionId}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
```

## Error Handling Patterns

### tRPC Error Handling

```typescript
// Throw appropriate error codes
if (!session || session.userId !== ctx.user.id) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Session not found',
  })
}

if (!input.message.trim()) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Message cannot be empty',
  })
}
```

### SSE Error Handling

```typescript
// In stream controller
try {
  // Streaming logic
} catch (error) {
  console.error('Stream error:', error)
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
  )
  controller.close()
}
```

### Client-Side Error Handling

```typescript
try {
  const response = await fetch('/api/chat/stream', { ... })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  // ... streaming logic
} catch (error) {
  if (error.name === 'AbortError') {
    toast.info('Message cancelled')
  } else {
    toast.error('Failed to send message. Please try again.')
    console.error('Streaming error:', error)
  }
}
```

## Testing Patterns

### Unit Test Example (Tool Service)

```typescript
// src/server/services/__tests__/chat-tools.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { executeToolCall } from '../chat-tools.service'
import { createCaller } from '@/server/api/root'

describe('chat-tools.service', () => {
  it('executes get_transactions tool correctly', async () => {
    const mockCaller = {
      transactions: {
        list: vi.fn().mockResolvedValue({
          transactions: [
            {
              id: '1',
              date: new Date('2025-11-15'),
              amount: -127.5,
              payee: 'Shufersal',
              category: { id: 'cat_1', name: 'Groceries', color: '#4CAF50', icon: 'ShoppingCart' },
              account: { id: 'acc_1', name: 'Main Checking', type: 'CHECKING' },
              notes: null,
              tags: [],
            },
          ],
          nextCursor: undefined,
        }),
      },
    }

    const result = await executeToolCall(
      'get_transactions',
      { categoryId: 'cat_1', limit: 50 },
      'user_123',
      {} as any // Prisma mock
    )

    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].category.name).toBe('Groceries')
  })
})
```

## Import Order Convention

```typescript
// 1. React imports
import { useState, useEffect, useRef } from 'react'

// 2. Next.js imports
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

// 3. Third-party libraries
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// 4. Internal lib imports
import { trpc } from '@/lib/trpc'
import { createClient } from '@/lib/supabase/server'

// 5. Internal server imports
import { router, protectedProcedure } from '@/server/api/trpc'
import { createCaller } from '@/server/api/root'

// 6. Internal component imports
import { Button } from '@/components/ui/button'
import { ChatSidebar } from '@/components/chat/ChatSidebar'

// 7. Type imports
import type { PrismaClient } from '@prisma/client'
import type { ChatSession, ChatMessage } from '@/types/chat'
```

## Code Quality Standards

- **TypeScript:** Strict mode enabled, no `any` except for intentional dynamic types
- **ESLint:** Follow existing .eslintrc rules (already configured)
- **Prettier:** Auto-format on save (existing config)
- **Comments:** Add comments for complex logic (tool execution, SSE parsing)
- **Error Logging:** Always log errors to console (Sentry integration in future)

## Performance Patterns

- **Database Queries:** Use `select` to limit fields, `take` for pagination
- **tRPC:** Use query invalidation sparingly (only after mutations)
- **Streaming:** Use `ReadableStream` for memory efficiency (no buffering)
- **Rate Limiting:** In-memory Map for Iteration 1 (Redis in future)

## Security Patterns

- **Authentication:** Always check user ownership on data access
- **Input Validation:** Zod schemas on all user inputs
- **SQL Injection:** Prisma parameterizes queries (safe by default)
- **XSS:** React escapes strings (safe by default)
- **Rate Limiting:** Enforce from Day 1 to prevent abuse
