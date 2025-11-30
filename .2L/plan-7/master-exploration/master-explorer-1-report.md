# Master Explorer 1 Report: Architecture & Complexity Analysis

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Build a ChatGPT-style AI financial assistant that lives inside Wealth, understands user financial data, can import transactions from any file format (PDF, CSV, Excel), and provides conversational insights using Claude's Messages API with Tool Use.

---

## Executive Summary

The AI Chat feature represents a **COMPLEX** architectural integration requiring 8 major must-have features across backend API, database, and frontend layers. The existing Wealth codebase provides excellent foundation: mature Next.js 14 App Router architecture, tRPC API layer, Prisma ORM, Supabase Auth, and Anthropic SDK already integrated. The feature will add ~2,500-3,500 lines of new code across 15-20 new files while extending 5-8 existing files.

**Key finding:** This is a natural extension of existing patterns, not a paradigm shift. The Anthropic SDK is already installed and used for categorization. The challenge is in orchestrating Claude's tool use for financial operations and building a responsive chat UI with streaming.

**Recommendation:** Multi-iteration approach (3 iterations) to manage complexity and validate core functionality before building advanced features.

---

## Current Architecture Overview

### Framework Patterns

**Next.js 14 with App Router**
- Modern React Server Components architecture
- Route handlers for API endpoints (`/api/trpc/[trpc]/route.ts`)
- Server-side authentication via Supabase
- Middleware for protected routes
- Standalone output optimized for Vercel deployment

**Key architectural decisions already in place:**
- Pages use async Server Components for initial data fetching
- Client components (`"use client"`) for interactive UI
- Separation of concerns: page.tsx (server) → PageClient.tsx (client)
- Example: `/transactions/page.tsx` → `TransactionListPageClient.tsx`

**File structure analysis:**
```
src/
├── app/
│   ├── (auth)/          # Auth pages (signin, signup, reset-password)
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── accounts/
│   │   ├── analytics/
│   │   ├── budgets/
│   │   ├── dashboard/   # Home dashboard
│   │   ├── goals/
│   │   ├── transactions/
│   │   └── layout.tsx   # Dashboard layout with sidebar
│   └── api/
│       ├── trpc/        # tRPC API routes
│       ├── cron/        # Scheduled jobs
│       └── webhooks/    # External webhooks (Plaid)
├── components/          # 117 React components (shadcn/ui + custom)
├── lib/                 # Utilities, helpers, services
└── server/
    ├── api/
    │   ├── routers/     # 14 tRPC routers (~4,000 lines total)
    │   └── trpc.ts      # tRPC setup with auth middleware
    └── services/        # Business logic services
```

### State Management

**React Query (TanStack Query) via tRPC**
- All server state managed through tRPC hooks
- Automatic caching, refetching, optimistic updates
- Example: `trpc.transactions.list.useQuery()`
- No Redux or Zustand - server state in React Query, local state in React

**Pattern for data fetching:**
```typescript
// Client component pattern
const { data, isLoading } = trpc.transactions.list.useQuery({
  accountId: selectedAccount,
  startDate: dateRange.from,
  endDate: dateRange.to,
})
```

**Mutations pattern:**
```typescript
const createMutation = trpc.transactions.create.useMutation({
  onSuccess: () => {
    utils.transactions.list.invalidate() // Refetch list
    toast.success('Transaction created')
  }
})
```

### API Patterns (tRPC)

**Router structure** (`src/server/api/root.ts`):
```typescript
export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  recurring: recurringRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
  admin: adminRouter,
  exports: exportsRouter,
  bankConnections: bankConnectionsRouter,
  syncTransactions: syncTransactionsRouter,
})
```

**Authentication middleware** (`src/server/api/trpc.ts`):
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authenticated user (Supabase + Prisma)
- `adminProcedure` - Requires ADMIN role
- Error logging via Sentry middleware

**Context pattern:**
```typescript
export const createTRPCContext = async () => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  // Auto-create Prisma user on first sign-in
  let user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id }
  })

  return { supabase, supabaseUser, user, prisma }
}
```

**Procedure pattern example** (from `transactions.router.ts`):
```typescript
create: protectedProcedure
  .input(z.object({
    accountId: z.string(),
    date: z.date(),
    amount: z.number(),
    payee: z.string(),
    categoryId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify ownership
    const account = await ctx.prisma.account.findUnique({
      where: { id: input.accountId }
    })
    if (account.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    // Create with transaction for balance update
    return await ctx.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.create({ ... })
      await prisma.account.update({ ... })
      return transaction
    })
  })
```

### Component Patterns (shadcn/ui)

**UI component library:** shadcn/ui (Radix UI primitives + Tailwind)
- 117 total components (mix of shadcn/ui and custom)
- Consistent design system with dark mode support
- Mobile-responsive patterns throughout

**Component structure:**
```
components/
├── ui/                  # shadcn/ui primitives (button, dialog, card, etc.)
├── [domain]/            # Domain-specific components
│   ├── [Domain]List.tsx
│   ├── [Domain]Form.tsx
│   ├── [Domain]Card.tsx
│   └── [Domain]Detail.tsx
└── [feature]/           # Feature components (dashboard, analytics, etc.)
```

**Example component patterns:**
- `TransactionList.tsx` - List view with filtering
- `TransactionForm.tsx` - Create/edit form with validation
- `TransactionCard.tsx` - Card UI for mobile
- `TransactionDetail.tsx` - Detail view

**Form handling:** React Hook Form + Zod validation
```typescript
const form = useForm<FormSchema>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
})
```

**Toast notifications:** Sonner library (`toast.success()`, `toast.error()`)

**Mobile patterns:**
- `BottomNavigation.tsx` - Sticky mobile nav
- `MobileSheet.tsx` - Slide-up sheets for actions
- Responsive breakpoints: `lg:` prefix for desktop, mobile-first by default

### Database Patterns (Prisma)

**Schema structure** (`prisma/schema.prisma`):
- 18 models covering users, accounts, transactions, budgets, goals, etc.
- Strong typing with TypeScript
- Relationship management via foreign keys
- Enums for type safety

**Existing models relevant to AI Chat:**
- `User` - Auth and profile
- `Account` - Bank accounts
- `Transaction` - Financial transactions (has categorization fields)
- `Category` - Expense/income categories
- `MerchantCategoryCache` - AI categorization cache
- `Budget` - Monthly budgets
- `Goal` - Financial goals

**Pattern for new models:**
```prisma
model Example {
  id        String   @id @default(cuid())
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Migration workflow:**
1. Update `schema.prisma`
2. Run `npm run db:push` (local) or `npm run db:migrate` (production)
3. Prisma auto-generates TypeScript types

### Anthropic SDK Integration (Existing)

**Already implemented** in `src/server/services/categorize.service.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// Current usage: Transaction categorization
const message = await claude.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  temperature: 0.2,
  messages: [{ role: 'user', content: prompt }]
})
```

**Key insights:**
- SDK already installed (`@anthropic-ai/sdk: 0.32.1`)
- Environment variable pattern established (`ANTHROPIC_API_KEY`)
- Service pattern for Claude interactions (`categorize.service.ts`)
- JSON extraction from responses already handled
- Error handling patterns established

**What's needed for AI Chat:**
- Extend to use **Tool Use** (function calling)
- Add **streaming responses** for real-time chat UX
- Create comprehensive tool definitions for financial operations
- Session/message persistence

---

## Integration Points for AI Chat

### 1. Database Schema Extensions

**NEW models to create:**

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
  @@index([createdAt(sort: Desc)])
}

model ChatMessage {
  id         String   @id @default(cuid())
  sessionId  String
  role       String   // 'user', 'assistant', 'tool_call', 'tool_result'
  content    String?  @db.Text
  toolCalls  Json?    // Claude tool calls (if role = assistant)
  toolResults Json?   // Tool execution results (if role = tool_result)
  createdAt  DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt])
}
```

**EXTEND existing Transaction model:**

```prisma
model Transaction {
  // ... existing fields ...

  // NEW fields for credit card bill resolution
  isCreditCardBill   Boolean @default(false)
  linkedCreditBillId String? // Links itemized transactions to CC bill

  // Self-reference for CC bill linking
  linkedBill     Transaction?  @relation("CreditCardBill", fields: [linkedCreditBillId], references: [id])
  itemizedCharges Transaction[] @relation("CreditCardBill")

  @@index([linkedCreditBillId])
}
```

**EXTEND Category model:**

Add system category: "Credit Card Payment" with `excludeFromAnalytics: true`

### 2. tRPC Router Extensions

**NEW router:** `src/server/api/routers/chat.router.ts`

```typescript
export const chatRouter = router({
  // Session management
  listSessions: protectedProcedure.query(async ({ ctx }) => { ... }),
  createSession: protectedProcedure.mutation(async ({ ctx }) => { ... }),
  getSession: protectedProcedure.input(z.object({ id: z.string() })).query(...),
  deleteSession: protectedProcedure.input(z.object({ id: z.string() })).mutation(...),

  // Message handling
  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.string(),
      fileAttachment: z.string().optional(), // base64 PDF/CSV
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Save user message
      // 2. Call Claude with tool use
      // 3. Execute tools as needed
      // 4. Save assistant response
      // 5. Return streaming response
    }),

  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => { ... }),
})
```

**UPDATE:** `src/server/api/root.ts`

```typescript
export const appRouter = router({
  // ... existing routers ...
  chat: chatRouter, // ADD THIS
})
```

### 3. Service Layer (New Files)

**NEW:** `src/server/services/chat.service.ts`

Main orchestrator for Claude Messages API with Tool Use:
- `createChatCompletion()` - Main entry point
- `executeToolCall()` - Route tool calls to appropriate handlers
- `streamResponse()` - Handle streaming responses
- `generateSessionTitle()` - Auto-generate from first message

**NEW:** `src/server/services/chat-tools.service.ts`

Tool definitions and execution handlers:
- Read tools: `get_transactions`, `get_spending_summary`, `get_budget_status`, etc.
- Write tools: `create_transaction`, `create_transactions_batch`, `update_transaction`, etc.
- Import tools: `parse_file`, `compare_with_existing`, `detect_credit_card_bills`

**EXTEND:** `src/server/services/categorize.service.ts`

Add function for Claude to call during imports:
- `categorizeParsedTransactions()` - Accept transactions from file parsing

**NEW:** `src/lib/fileParser.service.ts`

Handle file parsing for uploads:
- `parsePDF()` - Use Claude Vision to extract transaction tables
- `parseCSV()` - Standard CSV parsing
- `parseExcel()` - Use `xlsx` library (already installed)
- `normalizeTransactionData()` - Standardize format

### 4. API Routes (Next.js)

**NEW:** `src/app/api/chat/stream/route.ts`

Dedicated streaming endpoint for chat responses:
- Handle Server-Sent Events (SSE)
- Stream Claude responses in real-time
- Alternative to tRPC for streaming (tRPC doesn't handle SSE well)

**Pattern:**
```typescript
export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Stream Claude response chunks
      for await (const chunk of claudeStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

### 5. Frontend Pages

**NEW:** `src/app/(dashboard)/chat/page.tsx`

Server component for initial page load:
```typescript
export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  return <ChatPageClient />
}
```

**NEW:** `src/components/chat/ChatPageClient.tsx`

Main chat interface client component (~300-400 lines)

### 6. Frontend Components

**NEW components to create** (~15-20 components):

```
components/chat/
├── ChatPageClient.tsx          # Main chat page (300-400 lines)
├── ChatSidebar.tsx             # Session list sidebar (150-200 lines)
├── ChatMessageList.tsx         # Scrollable message area (100-150 lines)
├── ChatMessage.tsx             # Individual message bubble (100-150 lines)
├── ChatInput.tsx               # Message input with file upload (200-250 lines)
├── FileUploadZone.tsx          # Drag-and-drop area (100-150 lines)
├── TransactionPreview.tsx      # Preview parsed transactions (150-200 lines)
├── ConfirmationDialog.tsx      # Batch action confirmation (100 lines)
├── StreamingIndicator.tsx      # Typing indicator for AI (50 lines)
├── SessionListItem.tsx         # Sidebar session item (80-100 lines)
├── ChatToolCall.tsx            # Display tool execution (100 lines)
└── MarkdownRenderer.tsx        # Render formatted responses (80 lines)
```

**UI libraries to use:**
- `react-markdown` - Render Claude's markdown responses
- Existing shadcn/ui components: `Dialog`, `Button`, `Card`, `ScrollArea`, `Separator`
- Sonner for toast notifications

### 7. Integration with Existing Features

**Leverage existing infrastructure:**

1. **Authentication** - Use existing Supabase auth patterns
2. **Transactions router** - Chat tools will call existing tRPC procedures
3. **Categorization service** - Reuse for auto-categorizing imports
4. **MerchantCategoryCache** - Automatic learning from corrections
5. **File handling** - Extend export patterns for import
6. **Mobile UI** - Follow existing responsive patterns

**Example tool implementation:**

```typescript
// Chat tool calls existing tRPC procedure internally
async function executeTool_getTransactions(params: GetTransactionsParams, userId: string) {
  // Call existing transactions.list procedure
  const result = await caller.transactions.list({
    userId,
    ...params
  })

  return {
    success: true,
    data: result.transactions,
    summary: `Found ${result.transactions.length} transactions`
  }
}
```

### 8. Environment Configuration

**EXTEND:** `.env.example`, `.env.local`, `.env.production`

```bash
# AI Chat Feature Flag
WEALTH_AI_ENABLED=true

# Claude Model Selection
WEALTH_AI_MODEL="claude-sonnet-4-5-20250514"  # or "claude-opus-4-5-20250514"

# Anthropic API Key (already exists)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# File upload size limit (already configured)
# next.config.js: bodySizeLimit: '2mb'
```

**Feature flag usage:**

```typescript
// In ChatPage
if (process.env.WEALTH_AI_ENABLED !== 'true') {
  return <ComingSoonPage feature="AI Chat" />
}
```

---

## Feature Complexity Assessment

### Must-Have Features (MVP)

#### 1. Chat Interface (MEDIUM)
- **Complexity:** MEDIUM
- **Rationale:**
  - Straightforward React component architecture
  - Existing UI patterns to follow (shadcn/ui)
  - Streaming adds complexity but well-documented pattern
  - Mobile responsiveness requires thoughtful layout
- **Estimated effort:** 8-10 hours
- **Files:** 3-4 new components, 1 page

#### 2. Session Persistence (LOW)
- **Complexity:** LOW
- **Rationale:**
  - Standard CRUD operations
  - Prisma models straightforward
  - Similar to existing features (goals, budgets)
  - No complex business logic
- **Estimated effort:** 4-6 hours
- **Files:** 2 Prisma models, tRPC router procedures

#### 3. File Upload & Parsing (HIGH)
- **Complexity:** HIGH
- **Rationale:**
  - Claude Vision for PDF parsing is novel (not used elsewhere in app)
  - Multi-format support (PDF, CSV, Excel) requires robust parsing
  - Israeli bank format variations create edge cases
  - Error handling for malformed files is critical
  - Large file handling (2MB limit) needs validation
- **Estimated effort:** 10-12 hours
- **Files:** 1 file parser service, Claude Vision integration, upload components

#### 4. Smart Transaction Comparison (MEDIUM-HIGH)
- **Complexity:** MEDIUM-HIGH
- **Rationale:**
  - Fuzzy matching algorithm requires tuning
  - Date tolerance logic needs testing
  - Amount rounding edge cases
  - Existing duplicate detection service provides foundation
  - User confirmation flow adds UI complexity
- **Estimated effort:** 8-10 hours
- **Files:** Extend duplicate-detection.service.ts, new comparison logic, preview UI

#### 5. Credit Card Bill Resolution (HIGH)
- **Complexity:** HIGH
- **Rationale:**
  - Pattern detection for CC bills requires heuristics
  - Linking itemized transactions to bills is complex
  - Amount mismatch handling (fees, interest) needs careful logic
  - Database schema changes (self-referential relationship)
  - Analytics exclusion logic impacts existing code
- **Estimated effort:** 10-12 hours
- **Files:** Transaction model extension, detection service, linking logic, analytics updates

#### 6. Query Tools (Read-Only) (LOW-MEDIUM)
- **Complexity:** LOW-MEDIUM
- **Rationale:**
  - Mostly wrapping existing tRPC procedures
  - Tool definition boilerplate
  - Data transformation for Claude's consumption
  - 6 tools to implement but similar patterns
- **Estimated effort:** 6-8 hours
- **Files:** chat-tools.service.ts with 6 read tool handlers

#### 7. Action Tools (Write Operations) (MEDIUM-HIGH)
- **Complexity:** MEDIUM-HIGH
- **Rationale:**
  - User confirmation flow adds complexity
  - Batch operations require transaction safety
  - Balance updates must be atomic
  - Rollback on partial failures
  - Audit trail for AI-initiated actions
  - 5 write tools with varied complexity
- **Estimated effort:** 10-12 hours
- **Files:** Write tool handlers, confirmation UI, transaction safety logic

#### 8. Auto-Categorization (LOW)
- **Complexity:** LOW
- **Rationale:**
  - Already implemented in categorize.service.ts
  - Just needs integration with import flow
  - MerchantCategoryCache already exists
  - Confidence scoring already handled
- **Estimated effort:** 3-4 hours
- **Files:** Minor extensions to existing service

---

## Recommended Iteration Breakdown

### Recommendation: MULTI-ITERATION (3 Iterations)

**Rationale:**
- 8 must-have features with varied complexity levels
- Natural separation between foundation, core chat, and advanced import features
- Each iteration delivers usable value
- Reduces risk by validating core functionality before building on it
- Total estimated effort: 59-74 hours (too large for single iteration)

---

### Iteration 1: Chat Foundation & Basic Query (16-20 hours)

**Vision:** "Get the AI assistant talking and answering questions about your financial data"

**Scope:**
- Feature 1: Chat Interface (UI, streaming, mobile-responsive)
- Feature 2: Session Persistence (database models, CRUD operations)
- Feature 6: Query Tools - Read-Only (6 financial data query tools)
- Environment setup (feature flag, API keys)

**Components:**
- ChatSession & ChatMessage Prisma models
- chat.router.ts (session management + message handling)
- chat.service.ts (Claude Messages API integration with tools)
- chat-tools.service.ts (6 read tools)
- ChatPageClient.tsx + ChatSidebar + ChatMessageList + ChatMessage + ChatInput
- Streaming API route

**Why first:**
- Establishes core chat architecture
- Validates Claude Tool Use integration
- Delivers immediate value (users can ask questions)
- No risky file parsing or complex imports yet
- Foundation for iterations 2 & 3

**Success criteria:**
- User can create chat sessions
- User can ask questions: "How much did I spend on groceries last month?"
- AI queries financial data and responds accurately
- Streaming responses work smoothly
- Mobile responsive

**Estimated duration:** 16-20 hours

**Risk level:** MEDIUM
- Streaming is new pattern for this app
- Claude Tool Use not yet used in production
- UI complexity for chat interface

**Dependencies:** None (greenfield feature)

---

### Iteration 2: File Import & Transaction Creation (28-34 hours)

**Vision:** "Upload bank statements, get transactions imported automatically"

**Scope:**
- Feature 3: File Upload & Parsing (PDF via Claude Vision, CSV, Excel)
- Feature 4: Smart Transaction Comparison (duplicate detection, fuzzy matching)
- Feature 7: Action Tools - Write Operations (create transactions, batch import)
- Feature 8: Auto-Categorization (integrate existing service)

**Components:**
- fileParser.service.ts (PDF/CSV/Excel parsing)
- Claude Vision integration for PDF table extraction
- Transaction comparison logic (extend duplicate-detection.service.ts)
- Write tools in chat-tools.service.ts (create_transaction, create_transactions_batch, etc.)
- FileUploadZone.tsx component
- TransactionPreview.tsx component
- ConfirmationDialog.tsx component
- Batch import confirmation flow

**Why second:**
- Builds on chat foundation from Iteration 1
- Delivers core value proposition (automatic imports)
- Validates file parsing complexity
- Tests AI's ability to handle multi-step workflows

**Success criteria:**
- User can upload bank statement PDF
- AI extracts transactions accurately (>90% accuracy)
- Duplicate detection prevents double-entry
- User can review and confirm before import
- Transactions are categorized automatically
- Works with Israeli bank formats (FIBI, Leumi, etc.)

**Estimated duration:** 28-34 hours

**Risk level:** HIGH
- Claude Vision for PDF parsing is unproven in this domain
- Israeli bank format variations may require iteration
- File size/format edge cases

**Dependencies:**
- Requires Iteration 1 (chat foundation, tool infrastructure)
- Uses chat.service.ts tool execution framework
- Extends transactions.router.ts patterns

---

### Iteration 3: Credit Card Bill Resolution & Polish (15-20 hours)

**Vision:** "Intelligent credit card bill handling - never double-count again"

**Scope:**
- Feature 5: Credit Card Bill Resolution (detection, linking, analytics exclusion)
- UI polish (loading states, error handling, empty states)
- Advanced features: session titles, conversation context
- Documentation & testing

**Components:**
- Transaction model extension (isCreditCardBill, linkedCreditBillId fields)
- Credit card bill detection service
- Transaction linking logic
- Analytics exclusion for CC Payment category
- Bill resolution UI in chat
- Session title auto-generation
- Advanced error handling
- E2E testing

**Why third:**
- Most complex feature, benefits from prior learnings
- Optional for basic MVP (can ship without this)
- Requires understanding of import patterns from Iteration 2
- Polish based on real usage

**Success criteria:**
- AI detects credit card bill transactions
- AI prompts user to upload itemized statement
- Itemized transactions link to bill transaction
- Analytics exclude CC Payment category (no double-counting)
- Amount mismatch handling works (fees/interest)

**Estimated duration:** 15-20 hours

**Risk level:** MEDIUM-HIGH
- Complex business logic for linking
- Edge cases in amount matching
- Analytics impact requires careful testing

**Dependencies:**
- Requires Iteration 1 (chat foundation)
- Requires Iteration 2 (import infrastructure)
- Extends file parsing from Iteration 2

---

## Architectural Risks

### High Risks

**Risk 1: Claude Vision PDF Parsing Accuracy**
- **Description:** Israeli bank statement PDFs may have inconsistent formats, tables, or scanned images that Claude Vision struggles to parse accurately
- **Impact:** Could result in <90% accuracy, requiring manual correction and defeating the purpose
- **Mitigation:**
  - Start with major banks (FIBI, Leumi, Hapoalim) and test extensively
  - Implement confidence scoring for parsed data
  - Allow user to manually correct parsing errors
  - Build fallback to manual entry if parsing fails
  - Consider OCR preprocessing for scanned PDFs
- **Recommendation:** Tackle in Iteration 2, allocate extra time for testing and refinement

**Risk 2: File Size and API Limits**
- **Description:** Large PDFs (multi-month statements) may exceed Claude's token limits or Next.js body size limits
- **Impact:** Users can't upload their statements, feature is unusable
- **Mitigation:**
  - Set clear file size limits (2MB in next.config.js)
  - Guide users to split large statements
  - Implement pagination for multi-page PDFs
  - Use Claude's extended context window (200K tokens)
  - Monitor API costs for large files
- **Recommendation:** Document limits clearly, provide user guidance

**Risk 3: Tool Execution Security**
- **Description:** AI could potentially execute unintended financial operations (delete transactions, create incorrect entries)
- **Impact:** Data corruption, user trust loss, financial inaccuracies
- **Mitigation:**
  - Require user confirmation for all write operations >5 transactions
  - Audit trail for all AI-initiated actions
  - Implement rollback mechanism for batch operations
  - Scope all operations to authenticated user only
  - No deletion tools in MVP (only create/update)
  - Validate all tool inputs with Zod schemas
- **Recommendation:** Build confirmation flows in Iteration 2, test thoroughly

### Medium Risks

**Risk 4: Streaming Response Performance**
- **Description:** Server-Sent Events (SSE) for streaming may have connection issues, especially on mobile networks
- **Impact:** Poor user experience, incomplete responses
- **Mitigation:**
  - Implement reconnection logic
  - Fall back to non-streaming if connection fails
  - Buffer responses server-side
  - Test on various network conditions
  - Use Vercel's edge functions for low latency
- **Recommendation:** Test extensively in Iteration 1

**Risk 5: Claude API Costs**
- **Description:** Heavy usage (large file parsing, frequent queries) could result in high API costs
- **Impact:** Feature becomes economically unviable
- **Mitigation:**
  - Use Sonnet 4.5 (cheaper) for most operations
  - Reserve Opus 4.5 for complex tasks only
  - Implement rate limiting per user
  - Cache common queries (spending summaries)
  - Monitor costs via Anthropic dashboard
  - Set budget alerts
- **Recommendation:** Start with Sonnet 4.5, monitor usage patterns

**Risk 6: Mobile UX for Chat**
- **Description:** Chat interfaces can be challenging on mobile (small screens, keyboard issues, file uploads)
- **Impact:** Poor mobile experience in a mobile-first app
- **Mitigation:**
  - Follow existing mobile patterns (BottomNavigation, MobileSheet)
  - Test on real devices early
  - Optimize for one-handed use
  - Ensure file upload works on mobile browsers
  - Use native file picker APIs
- **Recommendation:** Mobile-first design in Iteration 1

### Low Risks

**Risk 7: Credit Card Bill Detection False Positives**
- **Description:** AI may incorrectly identify regular transactions as credit card bills
- **Impact:** Confusing user prompts, incorrect categorization
- **Mitigation:**
  - Use conservative detection heuristics (payee patterns, round amounts, recurring dates)
  - Allow user to dismiss false positives
  - Learn from user corrections
  - Provide clear explanation of why detected
- **Recommendation:** Fine-tune in Iteration 3 based on real data

**Risk 8: Session Context Management**
- **Description:** Long conversations may exceed context window, losing conversation history
- **Impact:** AI forgets earlier context, provides inconsistent answers
- **Mitigation:**
  - Implement context window management (summarize old messages)
  - Limit context to last 50 messages + system prompt
  - Use Claude's 200K token window (very large)
  - Provide "new conversation" option
- **Recommendation:** Monitor in production, implement summarization if needed

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Next.js 14.2.33 (App Router, React 18.3.1)
- TypeScript 5.7.2 (strict mode)
- tRPC 11.6.0 (type-safe API)
- Prisma 5.22.0 (PostgreSQL via Supabase)
- Supabase (Auth + Database)
- Anthropic SDK 0.32.1 (Claude AI)
- shadcn/ui + Radix UI (components)
- Tailwind CSS 3.4.1 (styling)
- React Hook Form + Zod (forms + validation)
- Sonner (toast notifications)
- Vitest (testing)
- Sentry (error tracking)

**Patterns observed:**
- Server Components for initial data fetching
- Client Components for interactivity
- tRPC for type-safe API calls
- Prisma transactions for atomicity
- Supabase Row-Level Security for data isolation
- Mobile-first responsive design
- Dark mode support
- Comprehensive error handling

**Opportunities:**
- Streaming already supported in Next.js 14 (no new dependency)
- Anthropic SDK supports streaming and tool use (no upgrade needed)
- File upload infrastructure exists (Vercel Blob for exports can be reused)
- Categorization service provides template for Claude integration

**Constraints:**
- Must use tRPC patterns (consistency)
- Must use shadcn/ui components (design system)
- Must support mobile (existing pattern)
- Must use Prisma (no raw SQL)
- Must scope to authenticated user (existing middleware)

### New Dependencies Required

**None!** All required libraries already installed:
- `@anthropic-ai/sdk: 0.32.1` - Claude AI (already installed)
- `xlsx: 0.18.5` - Excel parsing (already installed, devDependencies)
- React, Next.js built-in streaming support

**Optional (for enhancement):**
- `react-markdown` - Render Claude's markdown responses (recommended)
- `remark-gfm` - GitHub Flavored Markdown support

### Architecture Recommendations

1. **Use Messages API with Tool Use** (NOT Agent SDK)
   - Rationale: Controlled financial operations, user confirmation required
   - Agent SDK is overkill (designed for autonomous computer access)
   - Messages API is proven, cost-effective, well-documented

2. **Use Server-Sent Events for Streaming**
   - Rationale: Better UX for chat, supported in Next.js App Router
   - Fallback to polling if SSE fails

3. **Use Claude Sonnet 4.5 as Primary Model**
   - Rationale: Fast (2-5s responses), cost-effective, excellent tool use
   - Reserve Opus 4.5 for complex analysis (optional "deep mode")

4. **Implement Tool Call Confirmation UI**
   - Rationale: Financial operations require user validation
   - Batch operations (>5 transactions) always require confirmation
   - Single operations can be instant with undo option

5. **Leverage Existing Services**
   - Rationale: Don't reinvent the wheel
   - Use transactions.router.ts procedures within tools
   - Extend categorize.service.ts for imports
   - Follow duplicate-detection.service.ts patterns

---

## Files to Create/Modify

### NEW Files (Estimated 15-20 files)

**Database:**
1. `prisma/schema.prisma` - Add ChatSession, ChatMessage models (EXTEND)

**Backend Services:**
2. `src/server/services/chat.service.ts` - Main Claude orchestrator (~400-500 lines)
3. `src/server/services/chat-tools.service.ts` - Tool definitions & execution (~600-800 lines)
4. `src/lib/fileParser.service.ts` - File parsing (PDF/CSV/Excel) (~300-400 lines)
5. `src/server/services/creditCardBill.service.ts` - Bill detection & linking (~200-300 lines)

**API Routes:**
6. `src/server/api/routers/chat.router.ts` - tRPC chat procedures (~300-400 lines)
7. `src/app/api/chat/stream/route.ts` - SSE streaming endpoint (~150-200 lines)

**Frontend Pages:**
8. `src/app/(dashboard)/chat/page.tsx` - Server component wrapper (~30 lines)

**Frontend Components (12-15 components):**
9. `src/components/chat/ChatPageClient.tsx` - Main chat page (~300-400 lines)
10. `src/components/chat/ChatSidebar.tsx` - Session list (~150-200 lines)
11. `src/components/chat/ChatMessageList.tsx` - Scrollable messages (~100-150 lines)
12. `src/components/chat/ChatMessage.tsx` - Message bubble (~100-150 lines)
13. `src/components/chat/ChatInput.tsx` - Input + file upload (~200-250 lines)
14. `src/components/chat/FileUploadZone.tsx` - Drag-and-drop (~100-150 lines)
15. `src/components/chat/TransactionPreview.tsx` - Preview imports (~150-200 lines)
16. `src/components/chat/ConfirmationDialog.tsx` - Batch confirmation (~100 lines)
17. `src/components/chat/StreamingIndicator.tsx` - Typing indicator (~50 lines)
18. `src/components/chat/SessionListItem.tsx` - Session item (~80-100 lines)
19. `src/components/chat/ChatToolCall.tsx` - Tool execution display (~100 lines)
20. `src/components/chat/MarkdownRenderer.tsx` - Render responses (~80 lines)

**Estimated total new code:** 2,500-3,500 lines

### MODIFY Files (Estimated 5-8 files)

1. `src/server/api/root.ts` - Add chat router (1 line)
2. `prisma/schema.prisma` - Extend Transaction model for CC bills (~20 lines)
3. `src/server/services/categorize.service.ts` - Export functions for tools (~50 lines)
4. `src/lib/services/duplicate-detection.service.ts` - Extend for import comparison (~100 lines)
5. `src/server/api/routers/analytics.router.ts` - Exclude CC Payment category (~20 lines)
6. `.env.example` - Add WEALTH_AI_ENABLED flag (~10 lines)
7. `src/components/dashboard/DashboardSidebar.tsx` - Add "Chat" nav link (~10 lines)
8. `package.json` - Potentially add react-markdown (~2 lines)

**Estimated modified code:** 200-300 lines

---

## Notes & Observations

### Strengths of Current Architecture

1. **Excellent foundation for AI integration** - Anthropic SDK already integrated, patterns established
2. **Type-safe end-to-end** - tRPC + Prisma ensures consistency
3. **Mobile-first design** - Chat will naturally work on mobile
4. **Comprehensive auth** - Supabase provides secure user scoping
5. **Error tracking** - Sentry integration for production monitoring

### Potential Challenges

1. **File parsing accuracy** - Israeli bank PDFs may vary significantly
2. **Streaming complexity** - New pattern for this codebase
3. **Tool use orchestration** - Multi-step workflows require careful state management
4. **Cost management** - Claude API costs for large files/heavy usage

### Technical Debt Considerations

1. **No new dependencies** - Clean integration with existing stack
2. **Follow established patterns** - Reduces future maintenance burden
3. **Modular services** - Easy to extend with new tools later
4. **Testable architecture** - Services can be unit tested independently

### Future Extensibility

The architecture supports easy addition of:
- New tools (add to chat-tools.service.ts)
- New file formats (extend fileParser.service.ts)
- Voice input (add audio transcription tool)
- Proactive alerts (background job + chat notifications)
- Multi-language (i18n for chat interface)

---

**Exploration completed:** 2025-11-30
**This report informs master planning decisions**
