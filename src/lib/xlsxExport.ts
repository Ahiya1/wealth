import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

// Export interfaces
export interface TransactionExport {
  date: Date
  payee: string
  amount: number | Decimal
  category: { name: string }
  account: { name: string }
  notes?: string | null
  tags: string[]
}

export interface BudgetExport {
  month: string
  category: { name: string }
  budgetAmount: number | Decimal
  spentAmount: number | Decimal
  remainingAmount: number | Decimal
  status: string
}

export interface GoalExport {
  name: string
  targetAmount: number | Decimal
  currentAmount: number | Decimal
  targetDate: Date
  linkedAccount: { name: string } | null
  status: string
}

export interface AccountExport {
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

// Helper function for human-readable frequency
function formatFrequency(frequency: string, interval: number): string {
  const base = {
    'DAILY': 'day',
    'WEEKLY': 'week',
    'BIWEEKLY': 'week',
    'MONTHLY': 'month',
    'YEARLY': 'year',
  }[frequency] || frequency.toLowerCase()

  if (frequency === 'BIWEEKLY') {
    return 'Every 2 weeks'
  }

  return interval === 1 ? `Every ${base}` : `Every ${interval} ${base}s`
}

// Export function 1: Transactions
export function generateTransactionExcel(transactions: TransactionExport[]): Buffer {
  // Transform data to simple objects
  const data = transactions.map(txn => ({
    Date: format(new Date(txn.date), 'yyyy-MM-dd'),
    Payee: txn.payee,
    Category: txn.category.name,
    Account: txn.account.name,
    Amount: Number(
      typeof txn.amount === 'number'
        ? txn.amount
        : txn.amount.toString()
    ),
    Tags: txn.tags.join(', '),
    Notes: txn.notes || '',
  }))

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  // Return as Buffer for binary transport
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  }) as Buffer
}

// Export function 2: Budgets
export function generateBudgetExcel(budgets: BudgetExport[]): Buffer {
  const data = budgets.map(budget => ({
    Month: budget.month,
    Category: budget.category.name,
    Budgeted: Number(
      typeof budget.budgetAmount === 'number'
        ? budget.budgetAmount
        : budget.budgetAmount.toString()
    ),
    Spent: Number(
      typeof budget.spentAmount === 'number'
        ? budget.spentAmount
        : budget.spentAmount.toString()
    ),
    Remaining: Number(
      typeof budget.remainingAmount === 'number'
        ? budget.remainingAmount
        : budget.remainingAmount.toString()
    ),
    Status: budget.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Budgets')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Export function 3: Goals
export function generateGoalExcel(goals: GoalExport[]): Buffer {
  const data = goals.map(goal => {
    const target = Number(
      typeof goal.targetAmount === 'number'
        ? goal.targetAmount
        : goal.targetAmount.toString()
    )
    const current = Number(
      typeof goal.currentAmount === 'number'
        ? goal.currentAmount
        : goal.currentAmount.toString()
    )
    const progress = target > 0 ? (current / target) * 100 : 0

    return {
      Goal: goal.name,
      'Target Amount': target,
      'Current Amount': current,
      'Progress %': Number(progress.toFixed(1)),
      'Target Date': format(new Date(goal.targetDate), 'yyyy-MM-dd'),
      'Linked Account': goal.linkedAccount?.name || 'None',
      Status: goal.status,
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Goals')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Export function 4: Accounts
export function generateAccountExcel(accounts: AccountExport[]): Buffer {
  const data = accounts.map(account => ({
    Name: account.name,
    Type: account.type,
    Balance: Number(
      typeof account.balance === 'number'
        ? account.balance
        : account.balance.toString()
    ),
    Connected: account.plaidAccountId ? 'Plaid' : 'Manual',
    Status: account.isActive ? 'Active' : 'Inactive',
    'Last Updated': format(new Date(account.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Export function 5: Recurring Transactions
export function generateRecurringTransactionExcel(
  recurringTransactions: RecurringTransactionExport[]
): Buffer {
  const data = recurringTransactions.map(rt => ({
    Payee: rt.payee,
    Amount: Number(
      typeof rt.amount === 'number'
        ? rt.amount
        : rt.amount.toString()
    ),
    Category: rt.category.name,
    Account: rt.account.name,
    Frequency: formatFrequency(rt.frequency, rt.interval),
    'Next Date': format(new Date(rt.nextScheduledDate), 'yyyy-MM-dd'),
    Status: rt.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recurring')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// Export function 6: Categories
export function generateCategoryExcel(categories: CategoryExport[]): Buffer {
  const data = categories.map(cat => ({
    Name: cat.name,
    Parent: cat.parent?.name || 'None',
    Icon: cat.icon || '',
    Color: cat.color || '',
    Type: cat.isDefault ? 'Default' : 'Custom',
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
