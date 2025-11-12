import { format } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

interface Transaction {
  date: Date
  payee: string
  amount: number | Decimal
  category: {
    name: string
  }
  account: {
    name: string
  }
  notes?: string | null
  tags: string[]
}

interface BudgetExport {
  month: string
  category: {
    name: string
  }
  budgetAmount: number | Decimal
  spentAmount: number | Decimal
  remainingAmount: number | Decimal
  status: string
}

interface GoalExport {
  name: string
  targetAmount: number | Decimal
  currentAmount: number | Decimal
  targetDate: Date
  linkedAccount: {
    name: string
  } | null
  status: string
}

interface AccountExport {
  name: string
  type: string
  balance: number | Decimal
  plaidAccountId: string | null
  isActive: boolean
  updatedAt: Date
}

export interface RecurringTransactionExport {
  payee: string
  amount: number | Decimal
  category: { name: string }
  account: { name: string }
  frequency: string
  interval: number
  nextScheduledDate: Date
  status: string
}

export interface CategoryExport {
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  parent: { name: string } | null
  isDefault: boolean
}

export function generateTransactionCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Payee', 'Category', 'Account', 'Amount', 'Tags', 'Notes']
  const headerRow = headers.join(',')

  const dataRows = transactions.map((txn) => {
    // Convert Decimal to number for CSV export
    const amount = typeof txn.amount === 'number' ? txn.amount : Number(txn.amount.toString())

    const row = [
      format(new Date(txn.date), 'yyyy-MM-dd'),
      `"${txn.payee.replace(/"/g, '""')}"`, // Escape quotes in payee name
      txn.category.name,
      txn.account.name,
      amount.toString(),
      `"${txn.tags.join(', ')}"`,
      `"${(txn.notes || '').replace(/"/g, '""')}"`, // Escape quotes in notes
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + csvContent
}

export function generateBudgetCSV(budgets: BudgetExport[]): string {
  const headers = ['Month', 'Category', 'Budgeted', 'Spent', 'Remaining', 'Status']
  const headerRow = headers.join(',')

  const dataRows = budgets.map((budget) => {
    const budgeted = typeof budget.budgetAmount === 'number'
      ? budget.budgetAmount
      : Number(budget.budgetAmount.toString())
    const spent = typeof budget.spentAmount === 'number'
      ? budget.spentAmount
      : Number(budget.spentAmount.toString())
    const remaining = typeof budget.remainingAmount === 'number'
      ? budget.remainingAmount
      : Number(budget.remainingAmount.toString())

    const row = [
      budget.month, // YYYY-MM format
      `"${budget.category.name.replace(/"/g, '""')}"`, // Escape quotes
      budgeted.toFixed(2),
      spent.toFixed(2),
      remaining.toFixed(2),
      budget.status, // 'UNDER_BUDGET' | 'OVER_BUDGET' | 'AT_LIMIT'
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + csvContent
}

export function generateGoalCSV(goals: GoalExport[]): string {
  const headers = ['Goal', 'Target Amount', 'Current Amount', 'Progress %', 'Target Date', 'Linked Account', 'Status']
  const headerRow = headers.join(',')

  const dataRows = goals.map((goal) => {
    const target = typeof goal.targetAmount === 'number'
      ? goal.targetAmount
      : Number(goal.targetAmount.toString())
    const current = typeof goal.currentAmount === 'number'
      ? goal.currentAmount
      : Number(goal.currentAmount.toString())
    const progress = target > 0 ? ((current / target) * 100).toFixed(1) : '0.0'

    const row = [
      `"${goal.name.replace(/"/g, '""')}"`,
      target.toFixed(2),
      current.toFixed(2),
      progress,
      format(new Date(goal.targetDate), 'yyyy-MM-dd'),
      goal.linkedAccount ? `"${goal.linkedAccount.name.replace(/"/g, '""')}"` : 'None',
      goal.status, // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')
  return '\uFEFF' + csvContent // UTF-8 BOM
}

export function generateAccountCSV(accounts: AccountExport[]): string {
  const headers = ['Name', 'Type', 'Balance', 'Connected', 'Status', 'Last Updated']
  const headerRow = headers.join(',')

  const dataRows = accounts.map((account) => {
    const balance = typeof account.balance === 'number'
      ? account.balance
      : Number(account.balance.toString())

    const row = [
      `"${account.name.replace(/"/g, '""')}"`,
      account.type, // 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'CASH'
      balance.toFixed(2),
      account.plaidAccountId ? 'Plaid' : 'Manual',
      account.isActive ? 'Active' : 'Inactive',
      format(new Date(account.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')
  return '\uFEFF' + csvContent
}

export function generateRecurringTransactionCSV(
  recurringTransactions: RecurringTransactionExport[]
): string {
  const headers = ['Payee', 'Amount', 'Category', 'Account', 'Frequency', 'Next Date', 'Status']
  const headerRow = headers.join(',')

  const dataRows = recurringTransactions.map((rt) => {
    // Convert Decimal to number for CSV export
    const amount = typeof rt.amount === 'number'
      ? rt.amount
      : Number(rt.amount.toString())

    // Human-readable frequency
    const frequencyText = formatFrequency(rt.frequency, rt.interval)

    const row = [
      `"${rt.payee.replace(/"/g, '""')}"`,        // Escape quotes
      amount.toFixed(2),                           // 2 decimal places
      `"${rt.category.name.replace(/"/g, '""')}"`,
      `"${rt.account.name.replace(/"/g, '""')}"`,
      `"${frequencyText}"`,
      format(new Date(rt.nextScheduledDate), 'yyyy-MM-dd'),
      rt.status,
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + csvContent
}

export function generateCategoryCSV(categories: CategoryExport[]): string {
  const headers = ['Name', 'Parent', 'Icon', 'Color', 'Type']
  const headerRow = headers.join(',')

  const dataRows = categories.map((cat) => {
    const row = [
      `"${cat.name.replace(/"/g, '""')}"`,
      cat.parent ? `"${cat.parent.name.replace(/"/g, '""')}"` : 'None',
      cat.icon || '',
      cat.color || '',
      cat.isDefault ? 'Default' : 'Custom',
    ]
    return row.join(',')
  })

  const csvContent = [headerRow, ...dataRows].join('\n')
  return '\uFEFF' + csvContent
}

// Helper function for human-readable frequency
function formatFrequency(frequency: string, interval: number): string {
  const base: Record<string, string> = {
    'DAILY': 'day',
    'WEEKLY': 'week',
    'BIWEEKLY': 'week',
    'MONTHLY': 'month',
    'YEARLY': 'year',
  }

  const baseUnit = base[frequency] || frequency.toLowerCase()

  if (frequency === 'BIWEEKLY') {
    return 'Every 2 weeks'
  }

  if (interval === 1) {
    return `Every ${baseUnit}`
  }

  return `Every ${interval} ${baseUnit}s`
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
