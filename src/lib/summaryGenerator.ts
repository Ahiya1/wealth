import { format } from 'date-fns'

interface SummaryInput {
  user: {
    email: string
    currency: string
    timezone: string
  }
  recordCounts: {
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
  fileSize: number
}

export function generateSummary(input: SummaryInput): string {
  const summary = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    user: {
      email: input.user.email,
      currency: input.user.currency,
      timezone: input.user.timezone,
    },
    recordCounts: input.recordCounts,
    dateRange: input.dateRange ? {
      earliest: format(input.dateRange.earliest, 'yyyy-MM-dd'),
      latest: format(input.dateRange.latest, 'yyyy-MM-dd'),
    } : null,
    fileSize: input.fileSize,
    format: 'ZIP',
  }

  return JSON.stringify(summary, null, 2)
}
