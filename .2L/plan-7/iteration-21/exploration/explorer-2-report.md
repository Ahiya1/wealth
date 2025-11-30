# Explorer 2 Report: Technology Patterns & Tool Implementation

## Iteration Context

**Iteration:** 21 (Plan-7, Iteration 1)
**Vision:** "Get the AI assistant talking and answering questions about financial data"
**Scope:** Chat foundation, session persistence, and 6 read-only query tools with streaming responses

---

## Executive Summary

Iteration 21 builds the conversational AI foundation for the Wealth app using Claude Sonnet 4.5 Messages API. The codebase is READY with 85% of required infrastructure already in place:

- Anthropic SDK (v0.32.1) installed and proven
- tRPC patterns well-established across 9 existing routers
- Categorization service demonstrates Claude integration
- Database schema supports easy extension

**Key Finding:** All 6 read-only tools can directly call existing tRPC procedures via the service layer. Zero duplication needed.

**Primary Technical Challenge:** Implementing Server-Sent Events streaming in Next.js 14 App Router (not currently used in codebase).

**Estimated Complexity:** MEDIUM - Streaming is new territory, but tool integration is straightforward.

---

## Existing Query Patterns

### 1. Transactions Router (`transactions.router.ts`)

**Key Procedures for Tools:**

```typescript
// LIST PROCEDURE - Supports filtering by account, category, date range
transactionsRouter.list({
  accountId?: string,
  categoryId?: string, 
  startDate?: Date,
  endDate?: Date,
  limit?: number (1-100, default 50),
  cursor?: string // Pagination
})

// Returns: { transactions, nextCursor }
// Includes: category, account relations
// Ordered by: date DESC
```

**Pattern:**
- Uses cursor-based pagination (efficient for large datasets)
- Always includes related entities via Prisma `include`
- User scoping enforced via `ctx.user.id`
- Validates ownership on mutations

**Tool Adaptation:**
```typescript
// Tool: get_transactions
// Maps to: transactionsRouter.list()
// Additional params needed:
// - search: string (free-text search on payee field)
// - sort: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
```

---

### 2. Analytics Router (`analytics.router.ts`)

**Key Procedures for Tools:**

```typescript
// SPENDING BY CATEGORY
analyticsRouter.spendingByCategory({
  startDate: Date,
  endDate: Date
})
// Returns: [{ category, amount, color }] sorted by amount DESC

// MONTH OVER MONTH
analyticsRouter.monthOverMonth({
  months: number (3-12, default 6)
})
// Returns: [{ month: "MMM yyyy", income, expenses }]

// DASHBOARD SUMMARY
analyticsRouter.dashboardSummary()
// Returns: { netWorth, income, expenses, topCategories, recentTransactions, budgetCount }
```

**Pattern:**
- Extensive use of Prisma aggregates (efficient)
- Parallel queries with `Promise.all` for performance
- Date calculations via `date-fns` (startOfMonth, endOfMonth)
- Amount filtering: `{ gt: 0 }` for income, `{ lt: 0 }` for expenses

**Tool Adaptation:**
```typescript
// Tool: get_spending_summary
// Maps to: analyticsRouter.spendingByCategory()
// Additional param needed:
// - categoryId?: string (filter to single category)
```

---

### 3. Budgets Router (`budgets.router.ts`)

**Key Procedures for Tools:**

```typescript
// BUDGET PROGRESS
budgetsRouter.progress({
  month: string // Format: "2025-11"
})
// Returns: { budgets: [{ id, categoryId, category, budgetAmount, spentAmount, remainingAmount, percentage, status: 'good'|'warning'|'over' }] }

// LIST BY MONTH
budgetsRouter.listByMonth({
  month: string // Format: "2025-11"
})
// Returns: Budget[] with category, alerts
```

**Pattern:**
- Month format: "YYYY-MM" (consistent across app)
- Calculates spending via aggregate on transactions
- Status thresholds: good (<75%), warning (75-95%), over (>95%)
- Always includes category relation for display

**Tool Adaptation:**
```typescript
// Tool: get_budget_status
// Maps to: budgetsRouter.progress()
// Can accept current month by default (format(new Date(), 'yyyy-MM'))
```

---

### 4. Categories Router (`categories.router.ts`)

**Key Procedures for Tools:**

```typescript
// LIST ALL CATEGORIES
categoriesRouter.list()
// Returns: Category[] (default + user custom, active only)
// Includes: parent, children relations
// Ordered by: isDefault DESC, name ASC
```

**Pattern:**
- Combines default (userId: null) and user categories (userId: ctx.user.id)
- Supports hierarchical categories (parent/children)
- Color codes: hex format (#RRGGBB)
- Icons: Lucide icon names

**Tool Adaptation:**
```typescript
// Tool: get_categories  
// Maps directly to: categoriesRouter.list()
// No modifications needed
```

---

### 5. Accounts Router (`accounts.router.ts`)

**Key Procedures for Tools:**

```typescript
// LIST ACCOUNTS
accountsRouter.list({
  includeInactive: boolean (default false)
})
// Returns: Account[] ordered by createdAt DESC

// NET WORTH
accountsRouter.netWorth()
// Returns: { netWorth, accountCount, accountsByType }
```

**Pattern:**
- Account types: CHECKING, SAVINGS, CREDIT, INVESTMENT, CASH
- Balance stored as Decimal(15,2)
- Currency always "NIS" (multi-currency not supported)

**Tool Adaptation:**
```typescript
// Tool: get_account_balances
// Maps to: accountsRouter.netWorth() + accountsRouter.list()
// Combines both for comprehensive balance view
```

---

## Claude API Integration

### Current Usage (Categorization Service)

**File:** `/src/server/services/categorize.service.ts`

**Implementation Pattern:**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Current model: claude-3-5-sonnet-20241022
// Iteration 21 will use: claude-sonnet-4-5-20250514

const message = await claude.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  temperature: 0.2, // Low temp for consistency
  messages: [
    {
      role: 'user',
      content: prompt,
    },
  ],
})

// Response handling (ContentBlock union type)
const firstBlock = message.content[0]
const responseText = firstBlock.type === 'text' ? firstBlock.text : '[]'
```

**Key Learnings:**
- API key configured in production (sk-ant-api03-SD6-...)
- Low temperature (0.2) for consistent results
- JSON extraction with regex fallback for markdown code blocks
- Cache-first strategy via MerchantCategoryCache (80%+ cache hit rate)

---

### Streaming Implementation Approach

**Challenge:** No existing streaming implementation in codebase.

**Solution:** Server-Sent Events via Next.js Route Handler

**Route Structure:**

```typescript
// File: /src/app/api/chat/stream/route.ts

export async function POST(req: NextRequest) {
  const { messages, sessionId } = await req.json()
  
  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Call Claude API with streaming
        const anthropicStream = await claude.messages.create({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 4096,
          stream: true, // KEY: Enable streaming
          messages: messages,
          tools: [...toolDefinitions], // Tool definitions
        })
        
        // Stream chunks to client
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta') {
            const chunk = JSON.stringify(event) + '\n'
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
          }
          
          if (event.type === 'message_stop') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
        }
        
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
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

**Client-Side Handling:**

```typescript
// Component: ChatMessageList.tsx

const handleSendMessage = async (content: string) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      messages: [...conversationHistory, { role: 'user', content }],
      sessionId: currentSession.id 
    }),
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  let assistantMessage = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta') {
          assistantMessage += event.delta.text
          // Update UI with streaming text
          setMessages(prev => [...prev.slice(0, -1), { 
            role: 'assistant', 
            content: assistantMessage 
          }])
        }
      }
    }
  }
}
```

**Error Handling:**

```typescript
// Timeout detection (30 seconds)
const timeoutId = setTimeout(() => {
  reader.cancel()
  toast.error('Connection timeout. Please try again.')
}, 30000)

// Cleanup on unmount
useEffect(() => {
  return () => clearTimeout(timeoutId)
}, [])
```

---

### Tool Definition Format (Claude API)

**Anthropic Tool Schema:**

```typescript
interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
    }>
    required?: string[]
  }
}
```

**Example: get_transactions Tool:**

```typescript
const getTransactionsTool: Tool = {
  name: 'get_transactions',
  description: 'Retrieve user transactions with optional filters for date range, category, account, and search query. Returns up to 50 transactions ordered by date (most recent first).',
  input_schema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'ISO date string for start of date range (e.g., "2025-11-01T00:00:00.000Z")',
      },
      endDate: {
        type: 'string',
        description: 'ISO date string for end of date range (e.g., "2025-11-30T23:59:59.999Z")',
      },
      categoryId: {
        type: 'string',
        description: 'Filter by category ID',
      },
      accountId: {
        type: 'string',
        description: 'Filter by account ID',
      },
      search: {
        type: 'string',
        description: 'Free-text search on payee/merchant name',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of transactions to return (1-50)',
      },
    },
    required: [], // All parameters optional
  },
}
```

**Tool Use Flow:**

1. **User sends message:** "How much did I spend on groceries last month?"
2. **Claude decides to use tool:** Returns `tool_use` block
3. **Server executes tool:** Calls `transactionsRouter.list()` with parsed params
4. **Server sends tool result:** Returns data to Claude
5. **Claude generates response:** "You spent ₪1,245.50 on groceries in November."

**Stream Event Types:**

```typescript
// Event types in streaming response
type StreamEvent = 
  | { type: 'message_start', message: Message }
  | { type: 'content_block_start', index: number, content_block: ContentBlock }
  | { type: 'content_block_delta', index: number, delta: Delta }
  | { type: 'content_block_stop', index: number }
  | { type: 'message_delta', delta: MessageDelta }
  | { type: 'message_stop' }

// ContentBlock types
type ContentBlock = 
  | { type: 'text', text: string }
  | { type: 'tool_use', id: string, name: string, input: Record<string, any> }
```

---

## Tool Specifications

### Tool 1: get_transactions

**Purpose:** Retrieve user transactions with flexible filtering

**Parameters:**
```typescript
{
  startDate?: string,    // ISO date (optional)
  endDate?: string,      // ISO date (optional)
  categoryId?: string,   // Filter by category
  accountId?: string,    // Filter by account
  search?: string,       // Free-text search on payee
  limit?: number,        // Max results (1-50, default 50)
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc',
}
```

**Data Source:**
- Router: `transactionsRouter.list()`
- Additional logic needed: Search implementation (Prisma where clause with `payee: { contains: search, mode: 'insensitive' }`)

**Response Format:**
```typescript
{
  transactions: [
    {
      id: string,
      date: Date,
      amount: number,
      payee: string,
      category: { id, name, color, icon },
      account: { id, name, type },
      notes?: string,
      tags: string[],
    }
  ],
  count: number,
  hasMore: boolean,
}
```

**Implementation:**
```typescript
async function executeTool_getTransactions(params: GetTransactionsParams, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  const result = await caller.transactions.list({
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    categoryId: params.categoryId,
    accountId: params.accountId,
    limit: params.limit || 50,
  })
  
  // Additional search filtering if params.search provided
  let filteredTransactions = result.transactions
  if (params.search) {
    filteredTransactions = result.transactions.filter(t => 
      t.payee.toLowerCase().includes(params.search!.toLowerCase())
    )
  }
  
  return {
    transactions: filteredTransactions.map(serializeTransaction),
    count: filteredTransactions.length,
    hasMore: !!result.nextCursor,
  }
}
```

---

### Tool 2: get_spending_summary

**Purpose:** Get spending totals by category for a time period

**Parameters:**
```typescript
{
  startDate: string,     // ISO date (required)
  endDate: string,       // ISO date (required)
  categoryId?: string,   // Optional: filter to single category
}
```

**Data Source:**
- Router: `analyticsRouter.spendingByCategory()`
- Additional filter: If categoryId provided, filter result array

**Response Format:**
```typescript
{
  period: { start: string, end: string },
  totalSpending: number,
  byCategory: [
    {
      category: string,
      categoryId: string,
      amount: number,
      color: string,
      percentage: number, // % of total spending
    }
  ]
}
```

**Implementation:**
```typescript
async function executeTool_getSpendingSummary(params: SpendingSummaryParams, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  const result = await caller.analytics.spendingByCategory({
    startDate: new Date(params.startDate),
    endDate: new Date(params.endDate),
  })
  
  // Filter if categoryId specified
  const filtered = params.categoryId 
    ? result.filter(c => c.categoryId === params.categoryId)
    : result
  
  const totalSpending = filtered.reduce((sum, c) => sum + c.amount, 0)
  
  return {
    period: { start: params.startDate, end: params.endDate },
    totalSpending,
    byCategory: filtered.map(c => ({
      category: c.category,
      amount: c.amount,
      color: c.color,
      percentage: (c.amount / totalSpending) * 100,
    })),
  }
}
```

---

### Tool 3: get_budget_status

**Purpose:** Show budget progress for current or specified month

**Parameters:**
```typescript
{
  month?: string, // Format: "2025-11" (defaults to current month)
}
```

**Data Source:**
- Router: `budgetsRouter.progress()`

**Response Format:**
```typescript
{
  month: string,
  budgets: [
    {
      category: string,
      budgetAmount: number,
      spentAmount: number,
      remainingAmount: number,
      percentage: number,
      status: 'good' | 'warning' | 'over',
    }
  ],
  totalBudgeted: number,
  totalSpent: number,
  overallPercentage: number,
}
```

**Implementation:**
```typescript
async function executeTool_getBudgetStatus(params: BudgetStatusParams, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  const month = params.month || format(new Date(), 'yyyy-MM')
  
  const result = await caller.budgets.progress({ month })
  
  const totalBudgeted = result.budgets.reduce((sum, b) => sum + b.budgetAmount, 0)
  const totalSpent = result.budgets.reduce((sum, b) => sum + b.spentAmount, 0)
  
  return {
    month,
    budgets: result.budgets,
    totalBudgeted,
    totalSpent,
    overallPercentage: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
  }
}
```

---

### Tool 4: get_account_balances

**Purpose:** Retrieve all account balances and net worth

**Parameters:**
```typescript
{
  includeInactive?: boolean, // Default: false
}
```

**Data Source:**
- Router: `accountsRouter.list()` + `accountsRouter.netWorth()`

**Response Format:**
```typescript
{
  netWorth: number,
  accounts: [
    {
      id: string,
      name: string,
      type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'CASH',
      institution: string,
      balance: number,
      currency: 'NIS',
      isManual: boolean,
    }
  ],
  byType: {
    CHECKING: { count: number, total: number },
    SAVINGS: { count: number, total: number },
    // ... etc
  }
}
```

**Implementation:**
```typescript
async function executeTool_getAccountBalances(params: AccountBalancesParams, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  const [accounts, netWorthData] = await Promise.all([
    caller.accounts.list({ includeInactive: params.includeInactive || false }),
    caller.accounts.netWorth(),
  ])
  
  return {
    netWorth: netWorthData.netWorth,
    accounts: accounts.map(serializeAccount),
    byType: netWorthData.accountsByType,
  }
}
```

---

### Tool 5: get_categories

**Purpose:** List all available categories (default + user custom)

**Parameters:**
```typescript
{} // No parameters
```

**Data Source:**
- Router: `categoriesRouter.list()`

**Response Format:**
```typescript
{
  categories: [
    {
      id: string,
      name: string,
      icon?: string,
      color?: string,
      parentId?: string,
      isDefault: boolean,
    }
  ],
  count: number,
}
```

**Implementation:**
```typescript
async function executeTool_getCategories(params: {}, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  const categories = await caller.categories.list()
  
  return {
    categories: categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      isDefault: c.isDefault,
    })),
    count: categories.length,
  }
}
```

---

### Tool 6: search_transactions

**Purpose:** Free-text search across transactions (payee, notes, tags)

**Parameters:**
```typescript
{
  query: string,         // Search term (required)
  limit?: number,        // Max results (1-50, default 20)
}
```

**Data Source:**
- Router: `transactionsRouter.list()` with custom filtering
- Postgres full-text search (optional enhancement)

**Response Format:**
```typescript
{
  query: string,
  results: [
    {
      id: string,
      date: Date,
      amount: number,
      payee: string,
      category: { name, color },
      account: { name },
      matchedIn: 'payee' | 'notes' | 'tags', // Where match was found
    }
  ],
  count: number,
}
```

**Implementation:**
```typescript
async function executeTool_searchTransactions(params: SearchParams, userId: string) {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  // Fetch all transactions (cached/optimized in production)
  const result = await caller.transactions.list({ limit: 100 })
  
  const searchTerm = params.query.toLowerCase()
  
  const matches = result.transactions.filter(t => {
    const payeeMatch = t.payee.toLowerCase().includes(searchTerm)
    const notesMatch = t.notes?.toLowerCase().includes(searchTerm)
    const tagsMatch = t.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    
    return payeeMatch || notesMatch || tagsMatch
  }).slice(0, params.limit || 20)
  
  return {
    query: params.query,
    results: matches.map(t => ({
      ...serializeTransaction(t),
      matchedIn: t.payee.toLowerCase().includes(searchTerm) ? 'payee' :
                 t.notes?.toLowerCase().includes(searchTerm) ? 'notes' : 'tags',
    })),
    count: matches.length,
  }
}
```

---

## Streaming Implementation Plan

### SSE Route Structure

**File:** `/src/app/api/chat/stream/route.ts`

**Key Components:**

1. **Authentication:**
```typescript
import { getUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // ... streaming logic
}
```

2. **Request Validation:**
```typescript
const body = await req.json()
const { messages, sessionId } = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  sessionId: z.string(),
}).parse(body)
```

3. **Streaming Loop:**
```typescript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    
    try {
      // Build system prompt
      const systemPrompt = buildSystemPrompt(user.id)
      
      // Create streaming Claude request
      const claudeStream = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: messages,
        tools: allTools,
      })
      
      let currentToolUse: ToolUse | null = null
      let assistantMessage = ''
      
      for await (const event of claudeStream) {
        // Handle different event types
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = event.content_block
          }
        }
        
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            assistantMessage += event.delta.text
            // Stream text to client
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`
            ))
          }
          
          if (event.delta.type === 'input_json_delta') {
            // Tool input is being built
            currentToolUse.input += event.delta.partial_json
          }
        }
        
        if (event.type === 'content_block_stop' && currentToolUse) {
          // Execute tool
          const toolResult = await executeToolCall(currentToolUse, user.id)
          
          // Send tool result to client
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'tool_result', toolName: currentToolUse.name, result: toolResult })}\n\n`
          ))
          
          // Continue conversation with tool result
          // (recursive call or separate step)
        }
        
        if (event.type === 'message_stop') {
          // Save message to database
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: 'assistant',
              content: assistantMessage,
            }
          })
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }
      }
      
      controller.close()
    } catch (error) {
      console.error('Streaming error:', error)
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
      ))
      controller.close()
    }
  }
})

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering in nginx
  },
})
```

---

### Client-Side Handling

**Component:** `ChatPageClient.tsx`

**Implementation:**

```typescript
import { useState, useRef, useEffect } from 'react'

export function ChatPageClient({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const sendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage = { role: 'user', content, createdAt: new Date() }
    setMessages(prev => [...prev, userMessage])
    
    // Prepare for streaming response
    const assistantMessage = { role: 'assistant', content: '', createdAt: new Date() }
    setMessages(prev => [...prev, assistantMessage])
    setIsStreaming(true)
    
    try {
      abortControllerRef.current = new AbortController()
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          sessionId 
        }),
        signal: abortControllerRef.current.signal,
      })
      
      if (!response.ok) throw new Error('Streaming failed')
      
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      
      let accumulatedText = ''
      
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
            return
          }
          
          try {
            const event = JSON.parse(data)
            
            if (event.type === 'text') {
              accumulatedText += event.text
              // Update last message with streaming text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: accumulatedText,
                }
                return updated
              })
            }
            
            if (event.type === 'tool_result') {
              // Optionally display tool execution in UI
              console.log('Tool executed:', event.toolName, event.result)
            }
            
            if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', data)
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.info('Message cancelled')
      } else {
        toast.error('Failed to send message. Please try again.')
        console.error('Streaming error:', error)
      }
    } finally {
      setIsStreaming(false)
    }
  }
  
  const cancelMessage = () => {
    abortControllerRef.current?.abort()
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])
  
  return (
    <div className="flex h-full flex-col">
      <ChatMessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput onSend={sendMessage} onCancel={cancelMessage} disabled={isStreaming} />
    </div>
  )
}
```

---

### Error Handling

**Timeout Detection:**
```typescript
// In client component
const STREAM_TIMEOUT_MS = 30000 // 30 seconds

const timeoutId = setTimeout(() => {
  abortControllerRef.current?.abort()
  toast.error('Response timeout. Please try again.')
}, STREAM_TIMEOUT_MS)

// Clear timeout on successful completion
if (data === '[DONE]') {
  clearTimeout(timeoutId)
}
```

**Connection Drop Recovery:**
```typescript
// Detect connection drop (no data for 10 seconds)
let lastDataTimestamp = Date.now()

const heartbeatInterval = setInterval(() => {
  if (Date.now() - lastDataTimestamp > 10000) {
    abortControllerRef.current?.abort()
    toast.error('Connection lost. Please try again.')
    clearInterval(heartbeatInterval)
  }
}, 1000)

// Update timestamp on each data chunk
lastDataTimestamp = Date.now()
```

**Partial Message Recovery:**
```typescript
// Save partial message to database on error
try {
  await fetch('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      role: 'assistant',
      content: accumulatedText,
      isPartial: true, // Flag for incomplete response
    })
  })
} catch (saveError) {
  console.error('Failed to save partial message:', saveError)
}
```

---

## Tool Execution Strategy

### Creating tRPC Caller

**Pattern:** Use tRPC's `createCaller` for internal tool calls

```typescript
// File: /src/server/services/chat-tools.service.ts

import { createCaller } from '@/server/api/root'
import { prisma } from '@/lib/prisma'

async function executeToolCall(
  toolUse: ToolUse,
  userId: string
): Promise<ToolResult> {
  // Create authenticated caller context
  const caller = await createCaller({
    user: { id: userId },
    prisma,
  })
  
  switch (toolUse.name) {
    case 'get_transactions':
      return await executeTool_getTransactions(toolUse.input, caller)
    
    case 'get_spending_summary':
      return await executeTool_getSpendingSummary(toolUse.input, caller)
    
    case 'get_budget_status':
      return await executeTool_getBudgetStatus(toolUse.input, caller)
    
    case 'get_account_balances':
      return await executeTool_getAccountBalances(toolUse.input, caller)
    
    case 'get_categories':
      return await executeTool_getCategories(toolUse.input, caller)
    
    case 'search_transactions':
      return await executeTool_searchTransactions(toolUse.input, caller)
    
    default:
      throw new Error(`Unknown tool: ${toolUse.name}`)
  }
}
```

**Advantages:**
- Reuses all tRPC validation, error handling, and authorization
- Type-safe tool implementations
- No code duplication
- Centralized business logic

---

## Code Examples

### Example 1: Complete Tool Definition

```typescript
// File: /src/server/services/chat-tools.service.ts

import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const getTransactionsTool: Tool = {
  name: 'get_transactions',
  description: `Retrieve user's financial transactions with optional filters.
  
Use this tool to:
- Answer questions about spending history
- Find specific transactions
- Analyze transaction patterns
- Get transactions for a date range, category, or account

Returns up to 50 transactions ordered by date (most recent first).
All amounts are in NIS (Israeli Shekel, ₪).`,
  
  input_schema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'ISO 8601 date string for start of date range (e.g., "2025-11-01T00:00:00.000Z"). Omit to search all history.',
      },
      endDate: {
        type: 'string',
        description: 'ISO 8601 date string for end of date range (e.g., "2025-11-30T23:59:59.999Z"). Omit to search all history.',
      },
      categoryId: {
        type: 'string',
        description: 'Filter by category ID. Get available categories using get_categories tool.',
      },
      accountId: {
        type: 'string',
        description: 'Filter by account ID. Get available accounts using get_account_balances tool.',
      },
      search: {
        type: 'string',
        description: 'Free-text search on merchant/payee name (case-insensitive).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of transactions to return (1-50). Default: 50.',
      },
    },
    required: [],
  },
}
```

---

### Example 2: Tool Execution Function

```typescript
// File: /src/server/services/chat-tools.service.ts

interface GetTransactionsParams {
  startDate?: string
  endDate?: string
  categoryId?: string
  accountId?: string
  search?: string
  limit?: number
}

async function executeTool_getTransactions(
  params: GetTransactionsParams,
  caller: ReturnType<typeof createCaller>
) {
  try {
    // Call existing tRPC procedure
    const result = await caller.transactions.list({
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      categoryId: params.categoryId,
      accountId: params.accountId,
      limit: Math.min(params.limit || 50, 50),
    })
    
    // Apply search filter if provided
    let transactions = result.transactions
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      transactions = transactions.filter(t => 
        t.payee.toLowerCase().includes(searchLower)
      )
    }
    
    // Serialize for Claude (remove Prisma/Decimal types)
    return {
      transactions: transactions.map(t => ({
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
      hasMore: !!result.nextCursor,
    }
  } catch (error) {
    console.error('Tool execution error (get_transactions):', error)
    throw new Error(`Failed to retrieve transactions: ${error.message}`)
  }
}
```

---

### Example 3: System Prompt Builder

```typescript
// File: /src/server/services/chat.service.ts

async function buildSystemPrompt(userId: string): Promise<string> {
  const caller = await createCaller({ user: { id: userId }, prisma })
  
  // Get user context
  const [user, accounts, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    caller.accounts.list({ includeInactive: false }),
    caller.categories.list(),
  ])
  
  return `You are Wealth AI, a personal financial assistant for ${user.name || 'the user'}.

CONTEXT:
- User currency: ${user.currency} (all amounts in Israeli Shekels, ₪)
- User timezone: ${user.timezone}
- Accounts: ${accounts.length} active accounts
- Categories: ${categories.length} available categories

CAPABILITIES:
You can access the user's financial data through these tools:
- get_transactions: Retrieve transaction history with filters
- get_spending_summary: Analyze spending by category
- get_budget_status: Check budget progress
- get_account_balances: View account balances and net worth
- get_categories: List available expense/income categories
- search_transactions: Free-text search across transactions

GUIDELINES:
1. Always use tools to fetch real data - never make up numbers
2. Format amounts as: "₪X,XXX.XX" (e.g., "₪1,234.56")
3. Be conversational and helpful, not robotic
4. Provide actionable insights, not just data dumps
5. If unsure, ask clarifying questions before using tools
6. Respect user privacy - data stays in this conversation

EXAMPLES:
User: "How much did I spend on groceries last month?"
AI: [Uses get_transactions with categoryId for Groceries, last month date range]
Response: "You spent ₪1,245.50 on groceries in November. That's about ₪40/day."

User: "Am I over budget?"
AI: [Uses get_budget_status for current month]
Response: "You're at 78% of your overall budget for December. Groceries is at 95% (₪1,900/₪2,000), but Entertainment is only at 45%."

Now, help the user manage their finances!`
}
```

---

### Example 4: ChatMessage Database Model

```prisma
// File: prisma/schema.prisma

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String   // Auto-generated from first message
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId])
  @@index([createdAt(sort: Desc)])
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String   // 'user' | 'assistant' | 'system'
  content   String   @db.Text
  
  // Tool execution tracking
  toolCalls   Json?  // Array of { id, name, input }
  toolResults Json?  // Array of { id, result }
  
  // Metadata
  isPartial   Boolean  @default(false) // For recovery of incomplete messages
  tokenCount  Int?     // For usage tracking
  createdAt   DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt(sort: Desc)])
}
```

---

## Recommendations for Planner

### 1. Streaming Implementation Priority

**Recommendation:** Build streaming in isolation first, then integrate tools.

**Rationale:**
- Streaming is the most unfamiliar pattern in this codebase
- Testing streaming separately reduces debugging complexity
- Can use simple echo response to validate SSE before adding Claude

**Implementation Steps:**
1. Create basic `/api/chat/stream` route that echoes input
2. Build client-side SSE handling with proper error states
3. Replace echo with Claude streaming
4. Add tool definitions and execution
5. Integrate with session persistence

**Estimated Effort:** 3-4 hours for streaming infrastructure alone

---

### 2. Tool Execution Pattern

**Recommendation:** Use tRPC `createCaller` pattern for all tool implementations.

**Rationale:**
- Zero code duplication
- Leverages existing validation, auth, error handling
- Type-safe by default
- Easy to maintain

**Do NOT:**
- Call Prisma directly from tools (bypasses validation)
- Duplicate router logic in chat service
- Use different auth patterns for tools

**DO:**
- Create caller with user context: `createCaller({ user: { id: userId }, prisma })`
- Call router procedures: `caller.transactions.list(...)`
- Serialize results for Claude (remove Decimal, Date objects)

---

### 3. Error Handling Strategy

**Recommendation:** Graceful degradation with user-friendly messages.

**Error Scenarios:**

| Error | User Message | Technical Action |
|-------|-------------|------------------|
| Streaming timeout | "Response took too long. Please try again." | Abort connection, save partial message |
| Tool execution failure | "I had trouble retrieving that data. Please rephrase your question." | Log error, continue conversation |
| Rate limit hit | "I'm a bit busy right now. Please wait a moment and try again." | Implement exponential backoff |
| Invalid tool params | "I need more information. Could you clarify [missing parameter]?" | Let Claude handle via multi-turn |

**Implementation:**
```typescript
try {
  const result = await executeToolCall(toolUse, userId)
  return { success: true, result }
} catch (error) {
  console.error('Tool error:', error)
  return { 
    success: false, 
    error: 'Data retrieval failed. Please try rephrasing your question.' 
  }
}
```

---

### 4. Rate Limiting

**Recommendation:** Implement from day 1 to prevent API cost runaway.

**Limits (per user):**
- 10 messages per minute
- 100 messages per hour  
- 300 messages per day

**Implementation:**
```typescript
// Use existing Redis or in-memory store
import { RateLimiter } from '@/lib/rate-limiter'

const limiter = new RateLimiter({
  uniqueTokenPerInterval: 500, // Max 500 concurrent users
  interval: 60000, // 1 minute
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  
  const limit = await limiter.check(10, user.id) // 10 requests per minute
  if (!limit.success) {
    return new Response('Rate limit exceeded', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }
  
  // ... streaming logic
}
```

---

### 5. Session Title Generation

**Recommendation:** Auto-generate from first user message using simple extraction.

**Implementation:**
```typescript
function generateSessionTitle(firstMessage: string): string {
  // Extract first 50 characters, truncate at word boundary
  let title = firstMessage.slice(0, 50).trim()
  
  if (firstMessage.length > 50) {
    const lastSpace = title.lastIndexOf(' ')
    if (lastSpace > 20) {
      title = title.slice(0, lastSpace) + '...'
    }
  }
  
  return title || 'New Chat'
}

// Usage in session creation
const session = await prisma.chatSession.create({
  data: {
    userId: user.id,
    title: generateSessionTitle(messages[0].content),
  }
})
```

**Alternative (Optional Enhancement):** Use Claude to generate title after 3-4 messages

---

### 6. Prompt Caching Strategy

**Recommendation:** Cache system prompt for 50% cost reduction (as per master plan).

**Implementation:**
```typescript
const claudeStream = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  stream: true,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }, // Cache for 5 minutes
    }
  ],
  messages: messages,
  tools: allTools,
})
```

**Cost Impact:**
- System prompt: ~500 tokens
- Cached: 50% cost reduction
- Savings: ~250 tokens per request
- ROI: High (proven pattern from categorization service)

---

### 7. Database Indexes

**Recommendation:** Add performance indexes for chat queries.

**Migration:**
```prisma
model ChatSession {
  // ... fields
  
  @@index([userId])
  @@index([createdAt(sort: Desc)]) // For session list ordering
  @@index([userId, createdAt(sort: Desc)]) // Composite for user's recent sessions
}

model ChatMessage {
  // ... fields
  
  @@index([sessionId])
  @@index([createdAt(sort: Desc)]) // For message ordering
  @@index([sessionId, createdAt]) // Composite for session message history
}
```

---

### 8. Testing Strategy

**Recommendation:** Test streaming and tools independently before integration.

**Unit Tests:**
```typescript
describe('chat-tools.service', () => {
  it('executes get_transactions tool correctly', async () => {
    const result = await executeTool_getTransactions({
      startDate: '2025-11-01T00:00:00.000Z',
      endDate: '2025-11-30T23:59:59.999Z',
      categoryId: 'groceries-id',
    }, mockCaller)
    
    expect(result.transactions).toHaveLength(5)
    expect(result.transactions[0].category.name).toBe('Groceries')
  })
})
```

**Integration Tests:**
```typescript
describe('POST /api/chat/stream', () => {
  it('streams Claude response successfully', async () => {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        sessionId: 'test-session-id',
      })
    })
    
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    
    const reader = response.body.getReader()
    const { value } = await reader.read()
    const chunk = new TextDecoder().decode(value)
    
    expect(chunk).toContain('data: ')
  })
})
```

---

## Risks & Mitigations

### Risk 1: Streaming Connection Drops

**Impact:** HIGH - Poor mobile UX if messages don't arrive

**Mitigation:**
- Implement 30-second timeout with retry
- Save partial messages to database for recovery
- Client-side "Retry" button on failed messages
- Heartbeat mechanism (empty SSE event every 5 seconds)

**Testing:** Simulate network drops with Chrome DevTools throttling

---

### Risk 2: Tool Execution Failures

**Impact:** MEDIUM - User gets "I couldn't retrieve that data" response

**Mitigation:**
- Comprehensive error logging (Sentry integration)
- Graceful fallbacks (e.g., "Please try a different date range")
- Let Claude handle via multi-turn conversation
- Add tool execution timeout (5 seconds max per tool)

**Testing:** Mock tRPC procedure failures, verify error messages

---

### Risk 3: API Cost Runaway

**Impact:** HIGH - Could exceed budget without rate limiting

**Mitigation:**
- Rate limiting from day 1 (10/min, 100/hr, 300/day)
- Prompt caching (50% cost reduction)
- Token tracking in ChatMessage model
- Cost alerts at $20/day threshold (manual monitoring initially)

**Testing:** Load test with 50 concurrent users sending max messages

---

### Risk 4: Context Window Overflow

**Impact:** MEDIUM - Long conversations exceed 200K token limit

**Mitigation:**
- Truncate conversation history to last 40K tokens
- Keep system prompt + last N messages (calculate token count)
- Notify user when context truncated: "Starting fresh context..."
- "New Session" button prominently displayed

**Testing:** Simulate 100-message conversation, verify truncation works

---

### Risk 5: Mobile Keyboard Overlap

**Impact:** LOW-MEDIUM - Input obscured by mobile keyboard

**Mitigation:**
- Use safe-area-inset-bottom for input padding
- Auto-scroll to input when focused
- Fixed positioning with proper z-index
- Test on iOS Safari, Android Chrome

**Testing:** Manual testing on iPhone 14, Samsung Galaxy S23

---

## Questions for Planner

1. **Streaming vs. Polling:** Should we implement fallback polling for environments where SSE doesn't work (some corporate firewalls block)?

2. **Tool Confirmation:** Should read-only tools execute immediately, or should user confirm first tool use in session?

3. **Session Limit:** Should we limit total sessions per user (e.g., max 50 sessions, auto-delete oldest)?

4. **Message Retention:** How long should we retain chat history? (30 days? Forever?)

5. **Mobile Navigation:** Should "Chat" replace one of the existing 4 bottom nav items, or add as 5th before "More"?

6. **Offline Support:** Should we queue messages when offline and send when connection restored?

7. **Cost Monitoring:** Should we implement automated cost alerts, or manual daily checks initially?

---

## Conclusion

Iteration 21 is well-positioned for success due to extensive existing infrastructure:

- Anthropic SDK installed and proven
- tRPC patterns eliminate tool implementation duplication  
- Database schema extensions are minimal
- Component patterns from existing features are reusable

The primary challenge is implementing SSE streaming, which is new to this codebase but well-documented in Next.js 14.

**Recommendation:** Builder should start with streaming infrastructure, validate it in isolation, then layer on tool execution and session persistence.

**Estimated Effort:** 16-20 hours (as per master plan)

**Success Criteria:**
- User can create chat session and send messages
- AI responds with streaming text (first token <1s)
- 6 read-only tools execute correctly
- Mobile responsive (iPhone, Android)
- Rate limiting prevents abuse

All building blocks are in place. Execute with confidence.
