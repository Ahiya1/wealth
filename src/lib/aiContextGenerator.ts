import { format } from 'date-fns'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
}

interface AIContextInput {
  user: {
    currency: string
    timezone: string
  }
  categories: Category[]
  statistics: {
    transactions: number
    budgets: number
    goals: number
    accounts: number
    recurringTransactions: number
    categories: number
  }
  dateRange: {
    earliest: Date
    latest: Date
  } | null
}

export function generateAIContext(input: AIContextInput): string {
  const context = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),

    user: {
      currency: input.user.currency,
      timezone: input.user.timezone,
      locale: 'en-US',
    },

    fieldDescriptions: {
      transaction: {
        date: 'Transaction date in YYYY-MM-DD format',
        amount: `Transaction amount in ${input.user.currency}. Negative values = expenses, Positive values = income`,
        payee: 'Merchant or person who received/sent payment',
        category: 'Spending category (see categories section for hierarchy)',
        account: 'Account used for transaction',
        tags: 'User-defined tags for organization (comma-separated)',
        notes: 'Optional transaction notes',
      },
      budget: {
        month: 'Budget month in YYYY-MM format',
        budgeted: `Allocated budget amount in ${input.user.currency}`,
        spent: `Actual amount spent in ${input.user.currency}`,
        remaining: `Remaining budget (budgeted - spent) in ${input.user.currency}`,
        status: 'UNDER_BUDGET (remaining > 0) | AT_LIMIT (remaining = 0) | OVER_BUDGET (remaining < 0)',
      },
      goal: {
        name: 'Goal name',
        targetAmount: `Target amount to save/pay off in ${input.user.currency}`,
        currentAmount: `Current progress amount in ${input.user.currency}`,
        progress: 'Progress percentage (0-100)',
        targetDate: 'Target completion date (YYYY-MM-DD)',
        type: 'SAVINGS | DEBT_PAYOFF | INVESTMENT',
        status: 'NOT_STARTED | IN_PROGRESS | COMPLETED',
      },
      account: {
        name: 'Account name',
        type: 'CHECKING | SAVINGS | CREDIT | INVESTMENT | CASH',
        balance: `Current account balance in ${input.user.currency}`,
        connected: 'Plaid (auto-synced) or Manual (user-entered)',
        status: 'Active or Inactive',
        lastUpdated: 'Last sync/update timestamp (YYYY-MM-DD HH:mm:ss)',
      },
      recurringTransaction: {
        payee: 'Recurring payment recipient',
        amount: `Recurring amount in ${input.user.currency}`,
        frequency: 'DAILY | WEEKLY | BIWEEKLY | MONTHLY | YEARLY',
        interval: 'Frequency multiplier (e.g., 2 for every 2 weeks)',
        nextScheduledDate: 'Next date this transaction will be generated (YYYY-MM-DD)',
        status: 'ACTIVE | PAUSED | COMPLETED | CANCELLED',
      },
      category: {
        name: 'Category name',
        parent: 'Parent category name (or None for top-level)',
        icon: 'Lucide icon name',
        color: 'Hex color code',
        type: 'Default (system) or Custom (user-created)',
      },
    },

    categories: {
      hierarchy: buildCategoryHierarchy(input.categories),
    },

    enums: {
      AccountType: ['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH'],
      BudgetStatus: ['UNDER_BUDGET', 'AT_LIMIT', 'OVER_BUDGET'],
      GoalType: ['SAVINGS', 'DEBT_PAYOFF', 'INVESTMENT'],
      GoalStatus: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      RecurrenceFrequency: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'],
      RecurringTransactionStatus: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    },

    aiPrompts: {
      spendingAnalysis: `Analyze my spending patterns in transactions.csv. Focus on: 1) Top spending categories by amount and frequency, 2) Month-over-month spending trends, 3) Unusual or one-time large transactions, 4) Opportunities to reduce spending. Provide actionable insights with specific numbers in ${input.user.currency}.`,

      budgetReview: `Review my budgets.csv against transactions.csv. Tell me: 1) Which budgets am I exceeding and why? 2) Which categories have budget remaining? 3) Suggest budget adjustments for next month based on actual spending patterns. Compare budgeted vs actual for each category in ${input.user.currency}.`,

      goalProgress: `Check my goals.csv against accounts.csv. How am I tracking toward my goals? Calculate if I'm on pace to meet target dates. How much should I save monthly to reach each goal on time? Provide recommendations to accelerate progress in ${input.user.currency}.`,

      recurringOptimization: `Analyze recurring-transactions.csv. Identify: 1) Subscriptions or recurring expenses I might not need, 2) Recurring expenses that have increased over time, 3) Opportunities to negotiate lower rates or find alternatives. Focus on subscription fatigue and unnecessary recurring charges in ${input.user.currency}.`,

      financialHealth: `Provide a comprehensive financial health assessment using all CSV files. Include: 1) Income vs expenses ratio (calculate from transactions), 2) Savings rate and emergency fund coverage, 3) Budget adherence percentage, 4) Goal progress trajectory, 5) Top 3 recommendations to improve financial health. Give me a score out of 100 and explain the rating in ${input.user.currency}.`,
    },

    statistics: {
      recordCounts: input.statistics,
      dateRange: input.dateRange ? {
        earliest: format(input.dateRange.earliest, 'yyyy-MM-dd'),
        latest: format(input.dateRange.latest, 'yyyy-MM-dd'),
      } : null,
    },
  }

  return JSON.stringify(context, null, 2)
}

function buildCategoryHierarchy(categories: Category[]): Record<string, {
  parent: string | null
  icon: string | null
  color: string | null
}> {
  const hierarchy: Record<string, { parent: string | null; icon: string | null; color: string | null }> = {}
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]))
  const visited = new Set<string>()

  for (const cat of categories) {
    // Prevent infinite loops with cycle detection
    if (visited.has(cat.id)) continue
    visited.add(cat.id)

    const parent = cat.parentId ? categoryMap.get(cat.parentId) : null

    hierarchy[cat.name] = {
      parent: parent?.name || null,
      icon: cat.icon || null,
      color: cat.color || null,
    }
  }

  return hierarchy
}
