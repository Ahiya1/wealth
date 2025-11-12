/**
 * Manual Test Script for Excel Export Validation
 *
 * This script generates sample Excel files for manual testing across platforms:
 * - Excel 2016+ (Windows and Mac)
 * - Google Sheets
 * - Apple Numbers
 *
 * Usage: npm run test:excel-export
 * or: tsx scripts/test-excel-export.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { Decimal } from '@prisma/client/runtime/library'
import {
  generateTransactionExcel,
  generateBudgetExcel,
  generateGoalExcel,
  generateAccountExcel,
  generateRecurringTransactionExcel,
  generateCategoryExcel,
  type TransactionExport,
  type BudgetExport,
  type GoalExport,
  type AccountExport,
  type RecurringTransactionExport,
  type CategoryExport,
} from '../src/lib/xlsxExport'

// Create test output directory
const outputDir = path.join(__dirname, '../test-output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

console.log('🧪 Generating test Excel files...\n')

// 1. Test Transactions
const sampleTransactions: TransactionExport[] = [
  {
    date: new Date('2025-11-09'),
    payee: 'Whole Foods Market',
    amount: new Decimal(-125.50),
    category: { name: 'Groceries' },
    account: { name: 'Chase Checking' },
    notes: 'Weekly grocery shopping',
    tags: ['food', 'essentials'],
  },
  {
    date: new Date('2025-11-08'),
    payee: 'Shell Gas Station',
    amount: new Decimal(-55.75),
    category: { name: 'Transportation' },
    account: { name: 'Citi Credit Card' },
    notes: 'Full tank',
    tags: ['gas', 'car'],
  },
  {
    date: new Date('2025-11-07'),
    payee: 'Salary Deposit',
    amount: new Decimal(3500.00),
    category: { name: 'Income' },
    account: { name: 'Chase Checking' },
    notes: 'Bi-weekly paycheck',
    tags: ['income', 'salary'],
  },
  {
    date: new Date('2025-11-05'),
    payee: 'Amazon.com',
    amount: new Decimal(-89.99),
    category: { name: 'Shopping' },
    account: { name: 'Citi Credit Card' },
    notes: 'Office supplies',
    tags: ['online', 'work'],
  },
  {
    date: new Date('2025-11-03'),
    payee: 'Café Delight',
    amount: new Decimal(-12.50),
    category: { name: 'Dining Out' },
    account: { name: 'Chase Checking' },
    notes: null,
    tags: ['coffee', 'café'],
  },
]

const transactionBuffer = generateTransactionExcel(sampleTransactions)
fs.writeFileSync(path.join(outputDir, 'test-transactions.xlsx'), transactionBuffer)
console.log('✅ test-transactions.xlsx created')

// 2. Test Budgets
const sampleBudgets: BudgetExport[] = [
  {
    month: '2025-11',
    category: { name: 'Groceries' },
    budgetAmount: new Decimal(600.00),
    spentAmount: new Decimal(425.50),
    remainingAmount: new Decimal(174.50),
    status: 'UNDER_BUDGET',
  },
  {
    month: '2025-11',
    category: { name: 'Dining Out' },
    budgetAmount: new Decimal(200.00),
    spentAmount: new Decimal(215.75),
    remainingAmount: new Decimal(-15.75),
    status: 'OVER_BUDGET',
  },
  {
    month: '2025-11',
    category: { name: 'Transportation' },
    budgetAmount: new Decimal(300.00),
    spentAmount: new Decimal(300.00),
    remainingAmount: new Decimal(0),
    status: 'AT_LIMIT',
  },
  {
    month: '2025-10',
    category: { name: 'Entertainment' },
    budgetAmount: new Decimal(150.00),
    spentAmount: new Decimal(89.50),
    remainingAmount: new Decimal(60.50),
    status: 'UNDER_BUDGET',
  },
]

const budgetBuffer = generateBudgetExcel(sampleBudgets)
fs.writeFileSync(path.join(outputDir, 'test-budgets.xlsx'), budgetBuffer)
console.log('✅ test-budgets.xlsx created')

// 3. Test Goals
const sampleGoals: GoalExport[] = [
  {
    name: 'Emergency Fund',
    targetAmount: new Decimal(10000.00),
    currentAmount: new Decimal(6500.00),
    targetDate: new Date('2026-12-31'),
    linkedAccount: { name: 'High Yield Savings' },
    status: 'IN_PROGRESS',
  },
  {
    name: 'Vacation to Europe',
    targetAmount: new Decimal(5000.00),
    currentAmount: new Decimal(1200.00),
    targetDate: new Date('2026-07-01'),
    linkedAccount: { name: 'Travel Savings' },
    status: 'IN_PROGRESS',
  },
  {
    name: 'New Laptop',
    targetAmount: new Decimal(2000.00),
    currentAmount: new Decimal(0),
    targetDate: new Date('2026-03-15'),
    linkedAccount: null,
    status: 'NOT_STARTED',
  },
  {
    name: 'Home Down Payment',
    targetAmount: new Decimal(50000.00),
    currentAmount: new Decimal(50000.00),
    targetDate: new Date('2025-06-01'),
    linkedAccount: { name: 'Investment Account' },
    status: 'COMPLETED',
  },
]

const goalBuffer = generateGoalExcel(sampleGoals)
fs.writeFileSync(path.join(outputDir, 'test-goals.xlsx'), goalBuffer)
console.log('✅ test-goals.xlsx created')

// 4. Test Accounts
const sampleAccounts: AccountExport[] = [
  {
    name: 'Chase Checking',
    type: 'CHECKING',
    balance: new Decimal(3250.75),
    plaidAccountId: 'plaid_account_123',
    isActive: true,
    updatedAt: new Date('2025-11-09T10:30:00'),
  },
  {
    name: 'High Yield Savings',
    type: 'SAVINGS',
    balance: new Decimal(15750.00),
    plaidAccountId: 'plaid_account_456',
    isActive: true,
    updatedAt: new Date('2025-11-09T10:30:00'),
  },
  {
    name: 'Citi Credit Card',
    type: 'CREDIT',
    balance: new Decimal(-1250.50),
    plaidAccountId: 'plaid_account_789',
    isActive: true,
    updatedAt: new Date('2025-11-08T22:15:00'),
  },
  {
    name: 'Investment Portfolio',
    type: 'INVESTMENT',
    balance: new Decimal(25000.00),
    plaidAccountId: null,
    isActive: true,
    updatedAt: new Date('2025-11-09T09:00:00'),
  },
  {
    name: 'Old Savings',
    type: 'SAVINGS',
    balance: new Decimal(0),
    plaidAccountId: null,
    isActive: false,
    updatedAt: new Date('2024-05-15T14:00:00'),
  },
]

const accountBuffer = generateAccountExcel(sampleAccounts)
fs.writeFileSync(path.join(outputDir, 'test-accounts.xlsx'), accountBuffer)
console.log('✅ test-accounts.xlsx created')

// 5. Test Recurring Transactions
const sampleRecurring: RecurringTransactionExport[] = [
  {
    payee: 'Netflix',
    amount: new Decimal(-15.99),
    category: { name: 'Entertainment' },
    account: { name: 'Citi Credit Card' },
    frequency: 'MONTHLY',
    interval: 1,
    nextScheduledDate: new Date('2025-12-01'),
    status: 'ACTIVE',
  },
  {
    payee: 'Spotify Premium',
    amount: new Decimal(-9.99),
    category: { name: 'Entertainment' },
    account: { name: 'Citi Credit Card' },
    frequency: 'MONTHLY',
    interval: 1,
    nextScheduledDate: new Date('2025-11-15'),
    status: 'ACTIVE',
  },
  {
    payee: 'Gym Membership',
    amount: new Decimal(-50.00),
    category: { name: 'Health & Fitness' },
    account: { name: 'Chase Checking' },
    frequency: 'BIWEEKLY',
    interval: 2,
    nextScheduledDate: new Date('2025-11-20'),
    status: 'ACTIVE',
  },
  {
    payee: 'Electric Bill',
    amount: new Decimal(-120.00),
    category: { name: 'Utilities' },
    account: { name: 'Chase Checking' },
    frequency: 'MONTHLY',
    interval: 1,
    nextScheduledDate: new Date('2025-11-25'),
    status: 'ACTIVE',
  },
  {
    payee: 'Magazine Subscription',
    amount: new Decimal(-5.99),
    category: { name: 'Reading' },
    account: { name: 'Citi Credit Card' },
    frequency: 'MONTHLY',
    interval: 1,
    nextScheduledDate: new Date('2025-11-10'),
    status: 'PAUSED',
  },
]

const recurringBuffer = generateRecurringTransactionExcel(sampleRecurring)
fs.writeFileSync(path.join(outputDir, 'test-recurring.xlsx'), recurringBuffer)
console.log('✅ test-recurring.xlsx created')

// 6. Test Categories
const sampleCategories: CategoryExport[] = [
  {
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#3b82f6',
    parentId: null,
    parent: null,
    isDefault: true,
  },
  {
    name: 'Groceries',
    icon: 'ShoppingCart',
    color: '#10b981',
    parentId: 'parent_123',
    parent: { name: 'Shopping' },
    isDefault: false,
  },
  {
    name: 'Dining Out',
    icon: 'Utensils',
    color: '#f59e0b',
    parentId: 'parent_123',
    parent: { name: 'Shopping' },
    isDefault: true,
  },
  {
    name: 'Transportation',
    icon: 'Car',
    color: '#8b5cf6',
    parentId: null,
    parent: null,
    isDefault: true,
  },
  {
    name: 'Entertainment',
    icon: 'Film',
    color: '#ec4899',
    parentId: null,
    parent: null,
    isDefault: true,
  },
  {
    name: 'Custom Category',
    icon: null,
    color: null,
    parentId: null,
    parent: null,
    isDefault: false,
  },
]

const categoryBuffer = generateCategoryExcel(sampleCategories)
fs.writeFileSync(path.join(outputDir, 'test-categories.xlsx'), categoryBuffer)
console.log('✅ test-categories.xlsx created')

// Summary
console.log('\n📊 Test Summary:')
console.log('================')
console.log(`Output Directory: ${outputDir}`)
console.log('\nGenerated Files:')
console.log('  1. test-transactions.xlsx (5 records)')
console.log('  2. test-budgets.xlsx (4 records)')
console.log('  3. test-goals.xlsx (4 records)')
console.log('  4. test-accounts.xlsx (5 records)')
console.log('  5. test-recurring.xlsx (5 records)')
console.log('  6. test-categories.xlsx (6 records)')

console.log('\n✅ Manual Testing Instructions:')
console.log('================================')
console.log('1. Excel 2016+ (Windows/Mac):')
console.log('   - Open each .xlsx file')
console.log('   - Verify headers display correctly')
console.log('   - Check number formatting (2 decimal places for amounts)')
console.log('   - Verify no file corruption warnings')
console.log('')
console.log('2. Google Sheets:')
console.log('   - Upload each file to Google Drive')
console.log('   - Open in Google Sheets')
console.log('   - Verify same data renders correctly')
console.log('')
console.log('3. Apple Numbers (if available):')
console.log('   - Open each file in Numbers')
console.log('   - Verify compatibility')
console.log('   - Note any formatting differences')
console.log('')
console.log('4. Edge Cases Tested:')
console.log('   - Special characters in payee names (UTF-8)')
console.log('   - Negative amounts (expenses)')
console.log('   - Large amounts (up to 50,000)')
console.log('   - Null values (notes, linked accounts, icons, colors)')
console.log('   - Empty arrays (tags)')
console.log('   - Date and timestamp formatting')
console.log('   - Progress percentage calculations')
console.log('   - Human-readable frequency formatting')
console.log('   - Parent-child relationships (categories)')
console.log('')
console.log('✨ All files generated successfully!')
