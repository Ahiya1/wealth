// src/server/services/chat-tools.service.ts
import { z } from 'zod'
import { appRouter } from '@/server/api/root'
import type { PrismaClient } from '@prisma/client'
import type { ToolDefinition } from '@/types/chat'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { parseFile } from '@/lib/fileParser.service'
import type { FileType } from '@/lib/fileParser.service'
import { isDuplicate } from '@/lib/services/duplicate-detection.service'
import { detectCreditCardBills } from '@/lib/services/cc-bill-detection.service'
import { categorizeTransactions } from '@/server/services/categorize.service'

/**
 * Get all tool definitions for Claude API
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'get_transactions',
      description:
        'Retrieve user transactions with optional filters for date range, category, account, and search query. Returns up to 50 transactions.',
      input_schema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'ISO date string (e.g., "2025-11-01T00:00:00.000Z")',
          },
          endDate: {
            type: 'string',
            description: 'ISO date string (e.g., "2025-11-30T23:59:59.999Z")',
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
            description: 'Free-text search on payee name',
          },
          limit: {
            type: 'number',
            description: 'Max results (1-50)',
            default: 50,
          },
        },
      },
    },
    {
      name: 'get_spending_summary',
      description:
        'Get spending totals by category for a time period. Shows how much was spent in each category and percentage of total spending.',
      input_schema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'ISO date string (required)',
          },
          endDate: {
            type: 'string',
            description: 'ISO date string (required)',
          },
          categoryId: {
            type: 'string',
            description: 'Optional: filter to single category',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
    {
      name: 'get_budget_status',
      description:
        'Get current budget status showing budgeted amount vs actual spending for each category in the current month.',
      input_schema: {
        type: 'object',
        properties: {
          month: {
            type: 'string',
            description: 'Month in YYYY-MM format (e.g., "2025-11"). Defaults to current month.',
          },
        },
      },
    },
    {
      name: 'get_account_balances',
      description:
        'Get all account balances and calculate net worth. Returns all active accounts with their current balances.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_categories',
      description: 'Get list of all available spending categories with their icons and colors.',
      input_schema: {
        type: 'object',
        properties: {
          activeOnly: {
            type: 'boolean',
            description: 'Only return active categories',
            default: true,
          },
        },
      },
    },
    {
      name: 'search_transactions',
      description: 'Search transactions by payee name using full-text search. Returns matching transactions.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against payee names',
          },
          limit: {
            type: 'number',
            description: 'Max results (1-50)',
            default: 20,
          },
        },
        required: ['query'],
      },
    },
    // ========================================================================
    // WRITE TOOLS - Iteration 22
    // ========================================================================
    {
      name: 'parse_file',
      description:
        'Parse uploaded file (PDF, CSV, Excel) to extract transactions. Returns parsed transaction data for preview before importing.',
      input_schema: {
        type: 'object',
        properties: {
          base64Data: {
            type: 'string',
            description: 'Base64 encoded file content',
          },
          fileType: {
            type: 'string',
            enum: ['pdf', 'csv', 'xlsx'],
            description: 'Type of file',
          },
          hint: {
            type: 'string',
            description: 'Optional bank name hint for PDF parsing (e.g., "FIBI", "Leumi")',
          },
        },
        required: ['base64Data', 'fileType'],
      },
    },
    {
      name: 'create_transaction',
      description: 'Create a single transaction in the user account',
      input_schema: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'Account ID' },
          date: { type: 'string', description: 'Transaction date (ISO 8601)' },
          amount: { type: 'number', description: 'Amount (negative for expenses)' },
          payee: { type: 'string', description: 'Merchant/payee name' },
          categoryId: { type: 'string', description: 'Category ID' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['accountId', 'date', 'amount', 'payee', 'categoryId'],
      },
    },
    {
      name: 'create_transactions_batch',
      description:
        'Import multiple transactions at once with duplicate detection. Max 100 transactions per batch.',
      input_schema: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'Account ID to import into' },
          transactions: {
            type: 'array',
            maxItems: 100,
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Transaction date (ISO 8601)' },
                amount: { type: 'number', description: 'Amount (negative for expenses)' },
                payee: { type: 'string', description: 'Merchant/payee name' },
                categoryId: { type: 'string', description: 'Category ID (optional if autoCategorize is true)' },
                notes: { type: 'string', description: 'Optional notes' },
              },
              required: ['date', 'amount', 'payee'],
            },
          },
          autoCategorize: {
            type: 'boolean',
            description: 'Auto-categorize transactions without categoryId (default: true)',
            default: true,
          },
        },
        required: ['accountId', 'transactions'],
      },
    },
    {
      name: 'update_transaction',
      description: 'Modify an existing transaction',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID' },
          date: { type: 'string', description: 'New transaction date (ISO 8601)' },
          amount: { type: 'number', description: 'New amount' },
          payee: { type: 'string', description: 'New payee name' },
          categoryId: { type: 'string', description: 'New category ID' },
          notes: { type: 'string', description: 'New notes' },
        },
        required: ['id'],
      },
    },
    {
      name: 'categorize_transactions',
      description: 'Bulk re-categorization of transactions using AI. Max 50 transactions.',
      input_schema: {
        type: 'object',
        properties: {
          transactionIds: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string' },
            description: 'Array of transaction IDs to categorize',
          },
        },
        required: ['transactionIds'],
      },
    },
  ]
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

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
  get_budget_status: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  }),
  get_account_balances: z.object({}),
  get_categories: z.object({
    activeOnly: z.boolean().default(true),
  }),
  search_transactions: z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(50).default(20),
  }),
  parse_file: z.object({
    base64Data: z.string().min(1),
    fileType: z.enum(['pdf', 'csv', 'xlsx']),
    hint: z.string().optional(),
  }),
  create_transaction: z.object({
    accountId: z.string().min(1),
    date: z.string(), // Will be parsed to Date
    amount: z.number(),
    payee: z.string().min(1).max(200),
    categoryId: z.string().min(1),
    notes: z.string().optional(),
  }),
  create_transactions_batch: z.object({
    accountId: z.string().min(1),
    transactions: z
      .array(
        z.object({
          date: z.string(),
          amount: z.number(),
          payee: z.string().min(1).max(200),
          categoryId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .max(100),
    autoCategorize: z.boolean().default(true),
  }),
  update_transaction: z.object({
    id: z.string().min(1),
    date: z.string().optional(),
    amount: z.number().optional(),
    payee: z.string().min(1).max(200).optional(),
    categoryId: z.string().optional(),
    notes: z.string().optional(),
  }),
  categorize_transactions: z.object({
    transactionIds: z.array(z.string()).max(50),
  }),
}

// ============================================================================
// TOOL EXECUTION DISPATCHER
// ============================================================================

/**
 * Execute a tool call from Claude
 * Creates authenticated tRPC caller and dispatches to appropriate tool
 */
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  userId: string,
  prismaClient: PrismaClient
): Promise<any> {
  // Create authenticated caller context
  const caller = appRouter.createCaller({
    user: { id: userId } as any,
    prisma: prismaClient,
  } as any)

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
      return await executeTool_getTransactions(
        validatedInput as z.infer<typeof toolSchemas.get_transactions>,
        caller
      )
    case 'get_spending_summary':
      return await executeTool_getSpendingSummary(
        validatedInput as z.infer<typeof toolSchemas.get_spending_summary>,
        caller
      )
    case 'get_budget_status':
      return await executeTool_getBudgetStatus(
        validatedInput as z.infer<typeof toolSchemas.get_budget_status>,
        caller,
        userId,
        prismaClient
      )
    case 'get_account_balances':
      return await executeTool_getAccountBalances(caller)
    case 'get_categories':
      return await executeTool_getCategories(
        validatedInput as z.infer<typeof toolSchemas.get_categories>,
        caller
      )
    case 'search_transactions':
      return await executeTool_searchTransactions(
        validatedInput as z.infer<typeof toolSchemas.search_transactions>,
        caller
      )
    case 'parse_file':
      return await executeTool_parseFile(
        validatedInput as z.infer<typeof toolSchemas.parse_file>
      )
    case 'create_transaction':
      return await executeTool_createTransaction(
        validatedInput as z.infer<typeof toolSchemas.create_transaction>,
        caller
      )
    case 'create_transactions_batch':
      return await executeTool_createTransactionsBatch(
        validatedInput as z.infer<typeof toolSchemas.create_transactions_batch>,
        userId,
        caller,
        prismaClient
      )
    case 'update_transaction':
      return await executeTool_updateTransaction(
        validatedInput as z.infer<typeof toolSchemas.update_transaction>,
        caller
      )
    case 'categorize_transactions':
      return await executeTool_categorizeTransactions(
        validatedInput as z.infer<typeof toolSchemas.categorize_transactions>,
        userId,
        prismaClient
      )
    default:
      throw new Error(`Unhandled tool: ${toolName}`)
  }
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Tool: get_transactions
 * Retrieves transactions with filters
 */
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

  // Apply search filter if provided (client-side filter)
  let transactions = result.transactions
  if (input.search) {
    const searchLower = input.search.toLowerCase()
    transactions = transactions.filter((t: any) => t.payee.toLowerCase().includes(searchLower))
  }

  // Serialize for Claude (remove Prisma types)
  return {
    transactions: transactions.map((t: any) => ({
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

/**
 * Tool: get_spending_summary
 * Returns spending by category for a time period
 */
async function executeTool_getSpendingSummary(
  input: z.infer<typeof toolSchemas.get_spending_summary>,
  caller: any
) {
  const result = await caller.analytics.spendingByCategory({
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
  })

  // Filter if categoryId specified
  const filtered = input.categoryId ? result.filter((c: any) => c.categoryId === input.categoryId) : result

  const totalSpending = filtered.reduce((sum: number, c: any) => sum + Number(c.amount), 0)

  return {
    period: { start: input.startDate, end: input.endDate },
    totalSpending,
    byCategory: filtered.map((c: any) => ({
      category: c.category,
      amount: Number(c.amount),
      color: c.color,
      percentage: totalSpending > 0 ? (Number(c.amount) / totalSpending) * 100 : 0,
    })),
  }
}

/**
 * Tool: get_budget_status
 * Returns budget vs actual spending for current month
 */
async function executeTool_getBudgetStatus(
  input: z.infer<typeof toolSchemas.get_budget_status>,
  _caller: any,
  userId: string,
  prismaClient: PrismaClient
) {
  const currentMonth = input.month || format(new Date(), 'yyyy-MM')

  // Get budgets for the month
  const budgets = await prismaClient.budget.findMany({
    where: {
      userId,
      month: currentMonth,
    },
    include: {
      category: true,
    },
  })

  if (budgets.length === 0) {
    return {
      month: currentMonth,
      budgets: [],
      message: 'No budgets set for this month',
    }
  }

  // Get spending for each budgeted category
  const monthStart = startOfMonth(new Date(currentMonth + '-01'))
  const monthEnd = endOfMonth(monthStart)

  const budgetStatus = await Promise.all(
    budgets.map(async (budget) => {
      // Get total spending for this category in the month
      const transactions = await prismaClient.transaction.findMany({
        where: {
          userId,
          categoryId: budget.categoryId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
          amount: { lt: 0 }, // Only expenses
        },
      })

      const spent = Math.abs(transactions.reduce((sum, t) => sum + Number(t.amount), 0))
      const budgetAmount = Number(budget.amount)
      const remaining = budgetAmount - spent
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        amount: budgetAmount,
        spent,
        remaining,
        percentage,
      }
    })
  )

  return {
    month: currentMonth,
    budgets: budgetStatus,
  }
}

/**
 * Tool: get_account_balances
 * Returns all account balances and net worth
 */
async function executeTool_getAccountBalances(caller: any) {
  const accounts = await caller.accounts.list()

  const accountBalances = accounts.map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
    balance: Number(a.balance),
    currency: a.currency,
    isActive: a.isActive,
  }))

  const netWorth = accountBalances
    .filter((a: any) => a.isActive)
    .reduce((sum: number, a: any) => sum + a.balance, 0)

  return {
    accounts: accountBalances,
    netWorth,
    currency: 'NIS',
  }
}

/**
 * Tool: get_categories
 * Returns list of all categories
 */
async function executeTool_getCategories(
  input: z.infer<typeof toolSchemas.get_categories>,
  caller: any
) {
  const categories = await caller.categories.list()

  const filtered = input.activeOnly ? categories.filter((c: any) => c.isActive) : categories

  return {
    categories: filtered.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      isDefault: c.isDefault,
    })),
  }
}

/**
 * Tool: search_transactions
 * Searches transactions by payee name
 */
async function executeTool_searchTransactions(
  input: z.infer<typeof toolSchemas.search_transactions>,
  caller: any
) {
  // Get recent transactions and filter by search query
  const result = await caller.transactions.list({
    limit: 100, // Get more to search through
  })

  const searchLower = input.query.toLowerCase()
  const filtered = result.transactions
    .filter((t: any) => t.payee.toLowerCase().includes(searchLower))
    .slice(0, input.limit)

  return {
    query: input.query,
    transactions: filtered.map((t: any) => ({
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
    count: filtered.length,
  }
}

// ============================================================================
// WRITE TOOL IMPLEMENTATIONS - Iteration 22
// ============================================================================

/**
 * Tool: parse_file
 * Parse uploaded file and extract transactions
 */
async function executeTool_parseFile(
  input: z.infer<typeof toolSchemas.parse_file>
) {
  try {
    const allTransactions = await parseFile(
      input.base64Data,
      input.fileType as FileType,
      input.hint
    )

    // Detect and separate credit card bills from regular transactions
    const { ccBills, regular } = detectCreditCardBills(allTransactions)

    // Build warning message if CC bills detected
    let warning: string | undefined
    if (ccBills.length > 0) {
      warning = `Detected ${ccBills.length} credit card bill payment${ccBills.length > 1 ? 's' : ''} (${ccBills.map((b) => b.payee).join(', ')}). These have been excluded to prevent double-counting your expenses. Only the ${regular.length} regular transactions will be imported.`
    }

    return {
      success: true,
      count: regular.length,
      transactions: regular.map((t) => ({
        date: t.date,
        amount: t.amount,
        payee: t.payee,
        description: t.description,
        reference: t.reference,
      })),
      creditCardBills: ccBills.map((t) => ({
        date: t.date,
        amount: t.amount,
        payee: t.payee,
        description: t.description,
        reference: t.reference,
      })),
      warning,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse file',
      suggestion:
        'Please ensure the file is a valid bank statement. Try exporting as CSV if the problem persists.',
    }
  }
}

/**
 * Tool: create_transaction
 * Create a single transaction via tRPC
 */
async function executeTool_createTransaction(
  input: z.infer<typeof toolSchemas.create_transaction>,
  caller: any
) {
  const transaction = await caller.transactions.create({
    accountId: input.accountId,
    date: new Date(input.date),
    amount: input.amount,
    payee: input.payee,
    categoryId: input.categoryId,
    notes: input.notes,
    tags: [],
  })

  // Serialize for Claude
  return {
    success: true,
    transaction: {
      id: transaction.id,
      date: transaction.date.toISOString(),
      amount: Number(transaction.amount),
      payee: transaction.payee,
      category: transaction.category.name,
      account: transaction.account.name,
      notes: transaction.notes || undefined,
    },
  }
}

/**
 * Tool: create_transactions_batch
 * Bulk import with duplicate detection and auto-categorization
 */
async function executeTool_createTransactionsBatch(
  input: z.infer<typeof toolSchemas.create_transactions_batch>,
  userId: string,
  caller: any,
  prisma: PrismaClient
) {
  // Enforce batch size limit
  if (input.transactions.length > 100) {
    throw new Error('Batch size exceeds maximum of 100 transactions')
  }

  const results = {
    created: 0,
    skipped: 0,
    categorized: 0,
    transactions: [] as any[],
  }

  // Get existing transactions for duplicate detection (±7 days window)
  const dates = input.transactions.map((t: any) => new Date(t.date))
  const minDate = new Date(
    Math.min(...dates.map((d: Date) => d.getTime())) - 7 * 24 * 60 * 60 * 1000
  )
  const maxDate = new Date(
    Math.max(...dates.map((d: Date) => d.getTime())) + 7 * 24 * 60 * 60 * 1000
  )

  const existingTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      accountId: input.accountId,
      date: { gte: minDate, lte: maxDate },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      payee: true,
      rawMerchantName: true,
    },
  })

  const existingForComparison = existingTransactions.map((t) => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    merchant: t.rawMerchantName || t.payee,
  }))

  // Auto-categorize if needed
  let transactionsWithCategories = input.transactions
  if (input.autoCategorize) {
    const uncategorized = input.transactions.filter((t: any) => !t.categoryId)
    if (uncategorized.length > 0) {
      const categorizations = await categorizeTransactions(
        userId,
        uncategorized.map((t: any) => ({
          id: 'temp',
          payee: t.payee,
          amount: t.amount,
        })),
        prisma
      )

      transactionsWithCategories = input.transactions.map((t: any) => {
        if (t.categoryId) return t
        const cat = categorizations.find((c) => c.transactionId === 'temp')
        return { ...t, categoryId: cat?.categoryId || null }
      })

      results.categorized = categorizations.filter((c) => c.categoryId).length
    }
  }

  // Process each transaction
  for (const txn of transactionsWithCategories) {
    // Check for duplicate
    const isDupe = isDuplicate(
      { date: new Date(txn.date), amount: txn.amount, merchant: txn.payee },
      existingForComparison
    )

    if (isDupe) {
      results.skipped++
      continue
    }

    // Create transaction
    const created = await caller.transactions.create({
      accountId: input.accountId,
      date: new Date(txn.date),
      amount: txn.amount,
      payee: txn.payee,
      categoryId: txn.categoryId,
      notes: txn.notes,
      tags: [],
    })

    results.created++
    results.transactions.push({
      id: created.id,
      date: created.date.toISOString(),
      amount: Number(created.amount),
      payee: created.payee,
      category: created.category.name,
    })
  }

  return {
    success: true,
    ...results,
  }
}

/**
 * Tool: update_transaction
 * Modify existing transaction via tRPC
 */
async function executeTool_updateTransaction(
  input: z.infer<typeof toolSchemas.update_transaction>,
  caller: any
) {
  const updateData: any = { id: input.id }
  if (input.date) updateData.date = new Date(input.date)
  if (input.amount !== undefined) updateData.amount = input.amount
  if (input.payee) updateData.payee = input.payee
  if (input.categoryId) updateData.categoryId = input.categoryId
  if (input.notes !== undefined) updateData.notes = input.notes

  const transaction = await caller.transactions.update(updateData)

  return {
    success: true,
    transaction: {
      id: transaction.id,
      date: transaction.date.toISOString(),
      amount: Number(transaction.amount),
      payee: transaction.payee,
      category: transaction.category.name,
      notes: transaction.notes || undefined,
    },
  }
}

/**
 * Tool: categorize_transactions
 * Bulk re-categorization using AI service
 */
async function executeTool_categorizeTransactions(
  input: z.infer<typeof toolSchemas.categorize_transactions>,
  userId: string,
  prisma: PrismaClient
) {
  if (input.transactionIds.length > 50) {
    throw new Error('Cannot categorize more than 50 transactions at once')
  }

  // Load transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: input.transactionIds },
      userId,
    },
    select: {
      id: true,
      payee: true,
      amount: true,
    },
  })

  if (transactions.length === 0) {
    return {
      success: false,
      error: 'No transactions found',
    }
  }

  // Categorize via AI service - convert Decimal to number
  const categorizations = await categorizeTransactions(
    userId,
    transactions.map((t) => ({
      id: t.id,
      payee: t.payee,
      amount: Number(t.amount),
    })),
    prisma
  )

  // Update transactions with new categories
  const updateResults = await Promise.all(
    categorizations.map(async (cat) => {
      if (!cat.categoryId) return null

      await prisma.transaction.update({
        where: { id: cat.transactionId },
        data: {
          categoryId: cat.categoryId,
          categorizedBy: cat.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED',
        },
      })

      return {
        transactionId: cat.transactionId,
        categoryName: cat.categoryName,
        confidence: cat.confidence,
      }
    })
  )

  const successfulUpdates = updateResults.filter((r) => r !== null)

  return {
    success: true,
    total: input.transactionIds.length,
    categorized: successfulUpdates.length,
    results: successfulUpdates,
  }
}
