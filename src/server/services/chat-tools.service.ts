// src/server/services/chat-tools.service.ts
import { z } from 'zod'
import { appRouter } from '@/server/api/root'
import type { PrismaClient } from '@prisma/client'
import type { ToolDefinition } from '@/types/chat'
import { startOfMonth, endOfMonth, format } from 'date-fns'

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
