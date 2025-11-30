# Explorer 2 Report: Write Tools & Transaction Preview UI

## Iteration Context

**Iteration:** 22 (Plan-7, Iteration 2)
**Vision:** "Upload bank statements, get transactions imported automatically"
**Scope:** Action tools (create/update transactions), TransactionPreview UI, confirmation dialogs, and markdown rendering

---

## Executive Summary

Iteration 22 extends the chat foundation built in Iteration 21 by adding **write capabilities** and **file import UI**. The codebase provides EXCELLENT patterns for both tool execution and UI components:

- **Existing transaction mutations** in transactions.router.ts provide battle-tested create/update logic
- **BulkActionsBar** demonstrates confirmation dialogs for batch operations
- **TransactionCard** shows rich transaction display patterns
- **AlertDialog** component ready for user confirmation flows

**Key Finding:** Write tools must handle user confirmation flow BEFORE execution. Claude's streaming API supports tool use, but we need client-side confirmation for batch operations (>5 transactions).

**Primary Technical Challenge:** Implementing the confirmation flow in streaming context - AI proposes action, user confirms, then execution proceeds.

**Estimated Complexity:** MEDIUM-HIGH - Tool execution is straightforward, but confirmation flow adds complexity to streaming state management.

---

## Write Tool Specifications

### Tool 1: create_transaction

**Purpose:** Create a single transaction (used for manual entry or small imports)

**Parameters:**
```typescript
{
  accountId: string,      // Required
  date: string,           // ISO date (required)
  amount: number,         // Required (negative for expenses)
  payee: string,          // Required
  categoryId: string,     // Required
  notes?: string,         // Optional
  tags?: string[],        // Optional
}
```

**Validation:**
- Account must belong to user
- Category must exist
- Amount cannot be 0
- Date must be valid ISO string
- Payee must be non-empty

**Data Source:**
- Router: `transactionsRouter.create()`
- Already implements balance updating in transaction
- Already validates account ownership

**Response Format:**
```typescript
{
  success: true,
  transaction: {
    id: string,
    date: string,
    amount: number,
    payee: string,
    category: { id, name, color },
    account: { id, name, type },
  }
}
```

**Implementation Pattern:**
```typescript
async function executeTool_createTransaction(
  params: CreateTransactionParams,
  caller: ReturnType<typeof createCaller>
) {
  // Call existing tRPC mutation
  const transaction = await caller.transactions.create({
    accountId: params.accountId,
    date: new Date(params.date),
    amount: params.amount,
    payee: params.payee,
    categoryId: params.categoryId,
    notes: params.notes,
    tags: params.tags || [],
  })
  
  // Serialize for Claude
  return {
    success: true,
    transaction: serializeTransaction(transaction),
  }
}
```

**Security Considerations:**
- Account ownership verified by tRPC procedure
- No additional auth needed (user context from caller)
- Balance update happens atomically in DB transaction

---

### Tool 2: create_transactions_batch

**Purpose:** Bulk import transactions from file parsing (requires user confirmation if >5 transactions)

**Parameters:**
```typescript
{
  accountId: string,           // Required
  transactions: Array<{        // Required, 1-100 items
    date: string,              // ISO date
    amount: number,            // Negative for expenses
    payee: string,             // Merchant name
    categoryId?: string,       // Optional (will auto-categorize if missing)
    notes?: string,
    confidence?: 'high' | 'low', // Parsing confidence
  }>,
  autoCategorize?: boolean,    // Default: true (use categorization service)
}
```

**Validation:**
- Max 100 transactions per batch
- All dates must be valid
- All amounts must be non-zero
- Duplicate detection runs before creation

**Confirmation Flow:**
```typescript
// IF batch > 5 transactions:
// 1. Claude proposes batch with preview
// 2. Client displays TransactionPreview component
// 3. User clicks "Confirm Import" or "Cancel"
// 4. Client sends confirmation event to stream
// 5. Stream executes tool and responds
```

**Data Source:**
- Router: `transactionsRouter.create()` (in loop)
- Service: `categorizeTransactions()` for auto-categorization
- Service: `isDuplicate()` for duplicate detection

**Response Format:**
```typescript
{
  success: true,
  created: number,            // Count of created transactions
  skipped: number,            // Duplicates skipped
  categorized: number,        // Auto-categorized count
  transactions: Array<{
    id: string,
    date: string,
    amount: number,
    payee: string,
    category: { name, color },
    status: 'created' | 'duplicate',
  }>
}
```

**Implementation Pattern:**
```typescript
async function executeTool_createTransactionsBatch(
  params: CreateBatchParams,
  caller: ReturnType<typeof createCaller>,
  prismaClient: PrismaClient,
  userId: string
) {
  const results = {
    created: 0,
    skipped: 0,
    categorized: 0,
    transactions: [],
  }
  
  // Get existing transactions for duplicate detection
  const existingTransactions = await prismaClient.transaction.findMany({
    where: { userId, accountId: params.accountId },
    orderBy: { date: 'desc' },
    take: 500, // Last 500 for comparison
  })
  
  // Auto-categorize if needed
  let transactionsWithCategories = params.transactions
  if (params.autoCategorize) {
    const uncategorized = params.transactions.filter(t => !t.categoryId)
    if (uncategorized.length > 0) {
      const categorizations = await categorizeTransactions(
        userId,
        uncategorized.map(t => ({ id: 'temp', payee: t.payee, amount: t.amount })),
        prismaClient
      )
      
      // Merge categorizations
      transactionsWithCategories = params.transactions.map(t => {
        if (t.categoryId) return t
        const cat = categorizations.find(c => c.transactionId === 'temp')
        return { ...t, categoryId: cat?.categoryId || null }
      })
      
      results.categorized = categorizations.filter(c => c.categoryId).length
    }
  }
  
  // Process each transaction
  for (const txn of transactionsWithCategories) {
    // Check for duplicate
    const isDupe = isDuplicate(
      { date: new Date(txn.date), amount: txn.amount, merchant: txn.payee },
      existingTransactions.map(t => ({
        date: t.date,
        amount: t.amount.toNumber(),
        merchant: t.payee,
      }))
    )
    
    if (isDupe) {
      results.skipped++
      results.transactions.push({ ...txn, status: 'duplicate' })
      continue
    }
    
    // Create transaction
    const created = await caller.transactions.create({
      accountId: params.accountId,
      date: new Date(txn.date),
      amount: txn.amount,
      payee: txn.payee,
      categoryId: txn.categoryId!,
      notes: txn.notes,
      tags: [],
    })
    
    results.created++
    results.transactions.push({
      ...serializeTransaction(created),
      status: 'created',
    })
  }
  
  return {
    success: true,
    ...results,
  }
}
```

**Security Considerations:**
- Batch size limited to 100 to prevent abuse
- User confirmation required for >5 transactions
- Duplicate detection prevents accidental double-imports
- All transactions created in same account (no cross-account bulk imports)

---

### Tool 3: update_transaction

**Purpose:** Modify an existing transaction (category, amount, payee, notes)

**Parameters:**
```typescript
{
  transactionId: string,     // Required
  date?: string,             // Optional ISO date
  amount?: number,           // Optional
  payee?: string,            // Optional
  categoryId?: string,       // Optional
  notes?: string,            // Optional (null to clear)
  tags?: string[],           // Optional
}
```

**Validation:**
- Transaction must belong to user
- If categoryId provided, must exist
- At least one field must be updated

**Data Source:**
- Router: `transactionsRouter.update()`
- Already handles balance adjustment if amount changes

**Response Format:**
```typescript
{
  success: true,
  transaction: {
    id: string,
    date: string,
    amount: number,
    payee: string,
    category: { name, color },
    account: { name },
    notes?: string,
    tags: string[],
  }
}
```

**Implementation Pattern:**
```typescript
async function executeTool_updateTransaction(
  params: UpdateTransactionParams,
  caller: ReturnType<typeof createCaller>
) {
  const updated = await caller.transactions.update({
    id: params.transactionId,
    ...(params.date && { date: new Date(params.date) }),
    ...(params.amount !== undefined && { amount: params.amount }),
    ...(params.payee && { payee: params.payee }),
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.notes !== undefined && { notes: params.notes }),
    ...(params.tags && { tags: params.tags }),
  })
  
  return {
    success: true,
    transaction: serializeTransaction(updated),
  }
}
```

**Security Considerations:**
- Transaction ownership verified by tRPC procedure
- Balance adjustment happens atomically
- Original transaction preserved in audit log (via updatedAt timestamp)

---

### Tool 4: categorize_transactions

**Purpose:** Bulk re-categorize transactions (useful for fixing mis-categorized imports)

**Parameters:**
```typescript
{
  transactionIds: string[],  // Required, 1-50 items
  useClaude?: boolean,       // Default: true (use AI categorization)
}
```

**Validation:**
- Max 50 transactions per batch
- All transactions must belong to user

**Data Source:**
- Router: `transactionsRouter.categorizeBatch()`
- Service: `categorizeTransactions()` for AI suggestions

**Response Format:**
```typescript
{
  success: true,
  total: number,
  categorized: number,
  results: Array<{
    transactionId: string,
    categoryName: string,
    confidence: 'high' | 'low',
  }>
}
```

**Implementation Pattern:**
```typescript
async function executeTool_categorizeTransactions(
  params: CategorizeParams,
  caller: ReturnType<typeof createCaller>
) {
  // Use existing categorizeBatch procedure
  const result = await caller.transactions.categorizeBatch({
    transactionIds: params.transactionIds,
  })
  
  return {
    success: true,
    total: result.total,
    categorized: result.categorized,
    results: result.results,
  }
}
```

**Security Considerations:**
- Batch size limited to 50
- Uses existing MerchantCategoryCache (80%+ cache hit rate)
- No balance changes (categorization only)

---

## Tool Execution in Streaming Context

### Challenge: User Confirmation for Write Operations

**Problem:** Write tools (create, update, delete) should not execute automatically. User needs to confirm proposed changes.

**Solution:** Two-phase streaming with confirmation dialog.

### Phase 1: Tool Proposal (Claude suggests action)

**Stream Event Flow:**
```typescript
// 1. User: "Import these transactions from the PDF"
// 2. Claude streams tool_use event
{
  type: 'content_block_start',
  content_block: {
    type: 'tool_use',
    id: 'toolu_01ABC123',
    name: 'create_transactions_batch',
    input: {
      accountId: 'acc_123',
      transactions: [
        { date: '2025-11-15', amount: -127.5, payee: 'SuperSol', categoryId: 'groceries' },
        { date: '2025-11-16', amount: -45.0, payee: 'Cafe Neto', categoryId: 'dining' },
        // ... 30 more transactions
      ]
    }
  }
}

// 3. Server PAUSES execution, sends to client
{
  type: 'tool_confirmation_required',
  toolUseId: 'toolu_01ABC123',
  toolName: 'create_transactions_batch',
  previewData: {
    totalTransactions: 32,
    newTransactions: 26,
    duplicates: 6,
    transactions: [...], // Full transaction list for preview
  }
}

// 4. Client displays TransactionPreview component
// 5. User clicks "Confirm Import" or "Cancel"
```

### Phase 2: Tool Execution (after user confirms)

**Stream Event Flow:**
```typescript
// 1. Client sends confirmation
POST /api/chat/stream/confirm
{
  sessionId: 'session_123',
  toolUseId: 'toolu_01ABC123',
  confirmed: true,
}

// 2. Server executes tool
const result = await executeTool_createTransactionsBatch(...)

// 3. Server sends tool result to Claude
{
  type: 'tool_result',
  tool_use_id: 'toolu_01ABC123',
  content: JSON.stringify({
    success: true,
    created: 26,
    skipped: 6,
    categorized: 18,
  })
}

// 4. Claude generates final response
"Successfully imported 26 transactions! I skipped 6 duplicates and auto-categorized 18 transactions using your existing patterns."
```

### Implementation: Streaming Route with Confirmation

**File:** `/src/app/api/chat/stream/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { sessionId, message } = await req.json()
  
  // ... auth, validation
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      let pendingToolUse: ToolUse | null = null
      
      for await (const event of claudeStream) {
        // Handle tool use events
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          pendingToolUse = event.content_block
        }
        
        if (event.type === 'content_block_stop' && pendingToolUse) {
          const toolName = pendingToolUse.name
          
          // Check if tool requires confirmation
          const requiresConfirmation = isWriteTool(toolName) || 
                                       (toolName === 'create_transactions_batch' && 
                                        pendingToolUse.input.transactions.length > 5)
          
          if (requiresConfirmation) {
            // Send confirmation request to client
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'tool_confirmation_required',
                toolUseId: pendingToolUse.id,
                toolName: pendingToolUse.name,
                toolInput: pendingToolUse.input,
                previewData: await generatePreviewData(pendingToolUse),
              })}\n\n`
            ))
            
            // Wait for client confirmation (via separate endpoint)
            // Store pending tool in session state
            await prisma.chatMessage.update({
              where: { id: currentMessageId },
              data: {
                toolCalls: {
                  set: [{
                    id: pendingToolUse.id,
                    name: pendingToolUse.name,
                    input: pendingToolUse.input,
                    status: 'pending_confirmation',
                  }]
                }
              }
            })
            
            // Close stream, wait for confirmation via separate request
            controller.enqueue(encoder.encode('data: [CONFIRMATION_REQUIRED]\n\n'))
            controller.close()
            return
          }
          
          // Execute tool immediately (read-only tools)
          const toolResult = await executeToolCall(pendingToolUse, userId, prisma)
          
          // Continue streaming with tool result
          // ... (existing implementation)
        }
      }
    }
  })
  
  return new Response(stream, { headers: SSE_HEADERS })
}
```

**Confirmation Endpoint:**

```typescript
// File: /src/app/api/chat/stream/confirm/route.ts

export async function POST(req: NextRequest) {
  const { sessionId, toolUseId, confirmed } = await req.json()
  
  // ... auth, validation
  
  // Get pending tool from message
  const message = await prisma.chatMessage.findFirst({
    where: {
      sessionId,
      toolCalls: { path: '$[*].id', array_contains: toolUseId }
    }
  })
  
  if (!confirmed) {
    // User cancelled - send cancellation to Claude
    return new Response(JSON.stringify({
      type: 'tool_cancelled',
      message: 'User cancelled the operation',
    }))
  }
  
  // Execute tool
  const pendingTool = message.toolCalls.find(t => t.id === toolUseId)
  const result = await executeToolCall(pendingTool, user.id, prisma)
  
  // Resume streaming with tool result
  // ... create new stream that continues conversation
  
  return new Response(JSON.stringify({
    type: 'tool_executed',
    result,
  }))
}
```

### Simplified Alternative: Blocking Confirmation

**Trade-off:** Simpler implementation, but blocks streaming until user confirms.

```typescript
// In streaming loop
if (requiresConfirmation) {
  // Send preview to client
  controller.enqueue(encoder.encode(
    `data: ${JSON.stringify({
      type: 'tool_preview',
      toolUseId: pendingToolUse.id,
      previewData: await generatePreviewData(pendingToolUse),
    })}\n\n`
  ))
  
  // Block stream, wait for confirmation via WebSocket or separate SSE channel
  const confirmed = await waitForConfirmation(pendingToolUse.id, 60000) // 60s timeout
  
  if (!confirmed) {
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ type: 'error', message: 'Operation cancelled' })}\n\n`
    ))
    controller.close()
    return
  }
  
  // Continue with execution
  const result = await executeToolCall(pendingToolUse, userId, prisma)
  // ...
}
```

**Recommendation:** Use **Simplified Alternative** for Iteration 22. Two-phase streaming adds significant complexity. Block stream during confirmation is acceptable UX trade-off.

---

## TransactionPreview Component

### Purpose

Display parsed transactions before bulk import, allowing user to review and confirm.

### Data Structure

```typescript
interface TransactionPreviewData {
  totalTransactions: number
  newTransactions: number
  duplicates: number
  uncertainCategorizations: number
  transactions: Array<{
    date: string
    amount: number
    payee: string
    category: {
      id: string
      name: string
      color: string | null
    }
    status: 'new' | 'duplicate' | 'uncertain'
    confidence?: 'high' | 'low'
  }>
}
```

### Component Implementation

**File:** `/src/components/chat/TransactionPreview.tsx`

```typescript
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface TransactionPreviewProps {
  data: TransactionPreviewData
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
}

export function TransactionPreview({ data, onConfirm, onCancel, isProcessing }: TransactionPreviewProps) {
  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction Import Preview</span>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {data.newTransactions} NEW
            </Badge>
            {data.duplicates > 0 && (
              <Badge variant="outline" className="text-warm-gray-600">
                {data.duplicates} DUPLICATE
              </Badge>
            )}
            {data.uncertainCategorizations > 0 && (
              <Badge variant="outline" className="text-orange-600">
                {data.uncertainCategorizations} UNCERTAIN
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Summary */}
        <div className="mb-4 p-3 bg-warm-gray-50 dark:bg-warm-gray-800 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Found <strong>{data.totalTransactions}</strong> transactions.{' '}
            <strong>{data.newTransactions}</strong> will be imported,{' '}
            <strong>{data.duplicates}</strong> will be skipped as duplicates.
          </p>
        </div>
        
        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.transactions.map((txn, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                txn.status === 'duplicate' && 'opacity-50 bg-warm-gray-50 dark:bg-warm-gray-800',
                txn.status === 'new' && 'bg-white dark:bg-warm-gray-900',
                txn.status === 'uncertain' && 'border-orange-300 dark:border-orange-700'
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mr-3">
                {txn.status === 'new' && (
                  <CheckCircle className="h-5 w-5 text-sage-600" />
                )}
                {txn.status === 'duplicate' && (
                  <XCircle className="h-5 w-5 text-warm-gray-400" />
                )}
                {txn.status === 'uncertain' && (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              
              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{txn.payee}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: txn.category.color ? `${txn.category.color}15` : undefined,
                      color: txn.category.color || undefined,
                    }}
                  >
                    {txn.category.name}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(txn.date), 'MMM d, yyyy')}
                </div>
              </div>
              
              {/* Amount */}
              <div className="text-right ml-4">
                <div className={cn(
                  'font-semibold',
                  txn.amount < 0 ? 'text-warm-gray-700 dark:text-warm-gray-300' : 'text-sage-600'
                )}>
                  {txn.amount < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
                {txn.confidence === 'low' && (
                  <div className="text-xs text-orange-600">Low confidence</div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || data.newTransactions === 0}
            className="flex-1"
          >
            {isProcessing ? 'Importing...' : `Import ${data.newTransactions} Transactions`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Status Badge Legend

| Status | Badge | Meaning |
|--------|-------|---------|
| NEW | Green checkmark | Transaction will be imported |
| DUPLICATE | Gray X | Already exists, will be skipped |
| UNCERTAIN | Orange alert | Low categorization confidence |

### UX Features

1. **Visual Hierarchy:**
   - NEW transactions emphasized
   - DUPLICATE transactions dimmed
   - UNCERTAIN highlighted with orange border

2. **Scrollable List:**
   - Max height 96 (24rem)
   - Scroll for large imports (>10 transactions)
   - Sticky summary at top

3. **Clear Actions:**
   - Cancel button always available
   - Import button shows count
   - Disabled if all duplicates

4. **Confidence Indicators:**
   - Low confidence marked in orange
   - User can review before confirming

---

## ConfirmationDialog for Batch Operations

### Purpose

Generic confirmation dialog for any write operation (used beyond just imports).

### Component Implementation

**File:** `/src/components/chat/ConfirmationDialog.tsx`

```typescript
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            loading={loading}
            className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Usage Examples

**Example 1: Delete Transaction**
```typescript
<ConfirmationDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete Transaction?"
  description="This action cannot be undone. This will permanently delete the transaction and update your account balance."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="destructive"
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

**Example 2: Batch Update**
```typescript
<ConfirmationDialog
  open={showBatchDialog}
  onOpenChange={setShowBatchDialog}
  title="Update 24 Transactions?"
  description="This will change the category for all selected transactions. You can undo this by changing them back individually."
  confirmLabel="Update All"
  onConfirm={handleBatchUpdate}
  loading={isUpdating}
/>
```

### Integration with BulkActionsBar

Existing pattern in `/src/components/transactions/BulkActionsBar.tsx`:

```typescript
// Already uses AlertDialog for confirmation
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {selectedCount} transactions?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone...
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleBulkDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Recommendation:** Reuse existing AlertDialog component. No need for additional abstraction layer.

---

## Markdown Rendering for AI Responses

### Purpose

Render Claude's markdown-formatted responses with proper styling in chat bubbles.

### Dependencies to Install

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

**Status:** NOT currently installed. Must add to package.json.

### Component Implementation

**File:** `/src/components/chat/MarkdownRenderer.tsx`

```typescript
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn('markdown-content', className)}
      components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-base font-semibold mt-2 mb-1" {...props} />
        ),
        
        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside my-2 space-y-1" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="ml-4" {...props} />
        ),
        
        // Code
        code: ({ node, inline, ...props }) =>
          inline ? (
            <code
              className="px-1.5 py-0.5 rounded bg-warm-gray-100 dark:bg-warm-gray-800 text-sm font-mono"
              {...props}
            />
          ) : (
            <code
              className="block p-3 rounded-lg bg-warm-gray-100 dark:bg-warm-gray-800 text-sm font-mono overflow-x-auto my-2"
              {...props}
            />
          ),
        
        // Links
        a: ({ node, ...props }) => (
          <a
            className="text-sage-600 dark:text-sage-400 underline hover:text-sage-700"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        
        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th className="border border-warm-gray-300 dark:border-warm-gray-600 px-3 py-2 bg-warm-gray-50 dark:bg-warm-gray-800 text-left font-semibold" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="border border-warm-gray-300 dark:border-warm-gray-600 px-3 py-2" {...props} />
        ),
        
        // Emphasis
        strong: ({ node, ...props }) => (
          <strong className="font-semibold" {...props} />
        ),
        em: ({ node, ...props }) => (
          <em className="italic" {...props} />
        ),
        
        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-sage-300 dark:border-sage-700 pl-4 italic my-2 text-muted-foreground"
            {...props}
          />
        ),
        
        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-4 border-warm-gray-200 dark:border-warm-gray-700" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

### Integration with ChatMessage

**Updated File:** `/src/components/chat/ChatMessage.tsx`

```typescript
import { MarkdownRenderer } from './MarkdownRenderer'

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <motion.div {...}>
      <Card {...}>
        {isUser ? (
          // User messages: plain text
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content || (isStreaming && <StreamingIndicator />)}
          </div>
        ) : (
          // Assistant messages: markdown
          <MarkdownRenderer
            content={message.content || ''}
            className="text-sm leading-relaxed"
          />
        )}
      </Card>
    </motion.div>
  )
}
```

### Markdown Features Supported

| Feature | Syntax | Output |
|---------|--------|--------|
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Code inline | `` `code` `` | `code` |
| Code block | ` ```code``` ` | Code block with bg |
| Links | `[text](url)` | Clickable link |
| Lists | `- item` or `1. item` | Bulleted/numbered |
| Tables | GitHub Flavored | Styled table |
| Headings | `# H1` to `### H3` | Sized headings |
| Blockquotes | `> quote` | Left-bordered quote |

### Styling Approach

- **Matches chat context:** Subtle colors, not too bold
- **Dark mode support:** All colors have dark variants
- **Compact:** Reduced margins for chat bubble context
- **Accessible:** Proper contrast ratios, semantic HTML

---

## Security Considerations for Write Tools

### 1. Account Ownership Validation

**Current Implementation (Good):**
```typescript
// In transactionsRouter.create()
const account = await ctx.prisma.account.findUnique({
  where: { id: input.accountId },
})

if (!account || account.userId !== ctx.user!.id) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' })
}
```

**Recommendation:** Keep this pattern. No changes needed.

### 2. Rate Limiting for Write Operations

**Problem:** User could spam write operations, causing DB load or API abuse.

**Solution:** Additional rate limit for write tools (separate from read tools).

```typescript
// In streaming route
const writeToolNames = [
  'create_transaction',
  'create_transactions_batch',
  'update_transaction',
  'categorize_transactions',
]

if (writeToolNames.includes(toolName)) {
  const writeLimit = await checkRateLimit(userId, 20, 3600000) // 20 writes per hour
  if (!writeLimit) {
    throw new Error('Write operation rate limit exceeded. Please try again later.')
  }
}
```

**Limits:**
- Read tools: 100/hour (existing)
- Write tools: 20/hour (new)

### 3. Transaction Size Limits

**Problem:** Malicious user could try to create huge batch.

**Solution:** Enforce limits in tool schema + validation.

```typescript
// In tool definition
{
  name: 'create_transactions_batch',
  input_schema: {
    properties: {
      transactions: {
        type: 'array',
        minItems: 1,
        maxItems: 100, // Hard limit
      }
    }
  }
}

// In execution
if (params.transactions.length > 100) {
  throw new Error('Batch size exceeds maximum of 100 transactions')
}
```

### 4. SQL Injection Prevention

**Status:** Already protected by Prisma ORM.

**Evidence:**
```typescript
// Prisma handles parameterization automatically
await prisma.transaction.create({
  data: {
    payee: userProvidedPayee, // Safe - Prisma escapes
  }
})
```

**Recommendation:** No additional work needed.

### 5. XSS Prevention in Transaction Data

**Problem:** User-provided payee names, notes could contain malicious scripts.

**Solution:** Already handled by React (auto-escapes text content).

**Evidence:**
```tsx
// React escapes by default
<div>{transaction.payee}</div> // Safe - XSS prevented
```

**Additional Protection:**
```typescript
// Sanitize on input (optional, defense in depth)
import { sanitize } from 'dompurify'

const sanitizedPayee = sanitize(input.payee, { ALLOWED_TAGS: [] })
```

**Recommendation:** React's default escaping is sufficient. Don't add DOMPurify unless rendering raw HTML.

### 6. Duplicate Detection Bypass

**Problem:** Attacker could manipulate dates/amounts slightly to bypass duplicate detection.

**Solution:** Already mitigated by fuzzy matching thresholds.

**Evidence:**
```typescript
// duplicate-detection.service.ts
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000 // ±1 day
const SIMILARITY_THRESHOLD = 0.7 // 70% merchant name similarity
```

**Recommendation:** Monitor duplicate detection effectiveness. Adjust thresholds if needed.

---

## Recommended Implementation Sequence

### Phase 1: Write Tools Infrastructure (3-4 hours)

1. **Extend chat-tools.service.ts:**
   - Add 4 write tool definitions
   - Implement executeTool_* functions using tRPC callers
   - Add confirmation requirement logic

2. **Update streaming route:**
   - Add tool confirmation detection
   - Implement blocking wait for confirmation
   - Handle tool execution after confirmation

3. **Testing:**
   - Unit tests for each write tool
   - Test confirmation flow with mock tools

### Phase 2: TransactionPreview Component (2-3 hours)

1. **Create TransactionPreview.tsx:**
   - Implement component with all status badges
   - Add scrollable list with max height
   - Wire up confirm/cancel handlers

2. **Add preview data generation:**
   - Create generatePreviewData() helper
   - Run duplicate detection
   - Format data for preview

3. **Testing:**
   - Render with various transaction counts
   - Test with all duplicates
   - Test with low confidence categorizations

### Phase 3: Markdown Rendering (1-2 hours)

1. **Install dependencies:**
   ```bash
   npm install react-markdown remark-gfm
   ```

2. **Create MarkdownRenderer.tsx:**
   - Implement with component overrides
   - Style for chat context
   - Test dark mode

3. **Update ChatMessage.tsx:**
   - Use MarkdownRenderer for assistant messages
   - Keep plain text for user messages

4. **Testing:**
   - Render markdown with all features (lists, code, tables)
   - Verify dark mode styling
   - Test long content scrolling

### Phase 4: Integration & Testing (2-3 hours)

1. **End-to-end flow:**
   - User uploads PDF (simulated)
   - Claude proposes batch import
   - TransactionPreview displays
   - User confirms
   - Transactions created
   - Success message with markdown

2. **Edge cases:**
   - User cancels import
   - All transactions are duplicates
   - Network timeout during execution
   - Invalid categorization

3. **Performance:**
   - Test batch import of 100 transactions
   - Measure tool execution time
   - Verify DB transaction rollback on error

---

## Risks & Mitigations

### Risk 1: Confirmation Flow Complexity

**Impact:** HIGH - Blocking stream during confirmation could cause UX issues

**Mitigation:**
- Implement 60-second timeout for confirmation
- Show clear "Waiting for confirmation..." indicator
- Allow user to cancel via "Cancel" button
- Store pending tool in DB for recovery if connection drops

**Testing:** Simulate slow user response, verify timeout works

---

### Risk 2: Duplicate Detection Accuracy

**Impact:** MEDIUM - False positives (marking unique as duplicate) frustrate users

**Mitigation:**
- Show duplicates in preview (user can verify)
- Log all duplicate detections for analysis
- Provide manual override (future iteration)
- Monitor and adjust thresholds based on user feedback

**Testing:** Test with real bank statement data (FIBI, Leumi)

---

### Risk 3: Categorization Accuracy for Imports

**Impact:** MEDIUM - Mis-categorized transactions require manual cleanup

**Mitigation:**
- Use MerchantCategoryCache (80%+ cache hit rate from Iteration 21)
- Mark low-confidence categorizations in preview
- Allow manual category override before import
- Auto-categorization is optional (autoCategorize: false)

**Testing:** Test with 50+ merchant names, verify cache usage

---

### Risk 4: Large Batch Performance

**Impact:** MEDIUM - Importing 100 transactions could take >10 seconds

**Mitigation:**
- Limit batch size to 100 (enforced in schema)
- Show progress indicator ("Creating 45/100...")
- Use DB transaction for atomicity (all or nothing)
- Consider chunking into 25-transaction batches (future optimization)

**Testing:** Benchmark 100-transaction import, target <5 seconds

---

### Risk 5: Markdown XSS Vulnerability

**Impact:** LOW - react-markdown v9 is safe by default, but user-generated markdown could be risky

**Mitigation:**
- Only render markdown for assistant messages (not user messages)
- react-markdown escapes HTML by default
- No `dangerouslySetInnerHTML` used anywhere
- Disallow `<script>` tags in components config

**Testing:** Inject malicious markdown in assistant response, verify sanitization

---

## Questions for Planner

1. **Confirmation Timeout:** Should timeout be 60 seconds or longer? Some users might need time to review 100 transactions.

2. **Duplicate Override:** Should user be able to manually override duplicate detection in preview? Or just skip duplicates automatically?

3. **Progress Indicator:** For batch imports >50 transactions, should we show live progress ("Creating 23/87...") or just a spinner?

4. **Failed Import Handling:** If 5 out of 50 transactions fail to create, should we rollback all (atomic) or keep successful ones (partial)?

5. **Markdown Features:** Should we support images in markdown? Or just text formatting for security?

6. **Category Suggestions:** In preview, should we show alternative category suggestions for low-confidence items? Or just let user confirm/cancel?

---

## Conclusion

Iteration 22 extends the chat foundation with powerful write capabilities while maintaining security and UX quality:

**Strengths:**
- Write tools leverage existing tRPC mutations (no duplication)
- Confirmation flow provides user control over write operations
- TransactionPreview gives clear visibility before batch imports
- Duplicate detection prevents accidental double-imports
- Markdown rendering enhances AI responses

**Primary Challenges:**
- Streaming confirmation flow adds state management complexity
- Large batch imports need performance optimization
- Duplicate detection accuracy critical for user trust

**Recommendation:**
- Use **blocking confirmation** approach (simpler than two-phase streaming)
- Implement **TransactionPreview** with all status badges (NEW, DUPLICATE, UNCERTAIN)
- Install **react-markdown** + **remark-gfm** for rich formatting
- Enforce **rate limits** for write operations (20/hour separate from reads)

**Estimated Effort:** 18-22 hours (as per master plan)

**Success Criteria:**
- User can upload bank statement PDF (simulated in Iteration 22)
- AI extracts transactions with preview before import
- Duplicate detection identifies existing transactions
- Preview shows: NEW (26), DUPLICATE (6) with clear badges
- User confirms and transactions import successfully
- Auto-categorization uses MerchantCategoryCache (>60% cache hit)

All building blocks are in place. The existing transaction router, duplicate detection service, and UI patterns make this iteration highly achievable.
