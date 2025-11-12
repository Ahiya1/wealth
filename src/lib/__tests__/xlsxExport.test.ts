import { describe, it, expect } from 'vitest'
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
} from '../xlsxExport'

describe('xlsxExport', () => {
  describe('generateTransactionExcel', () => {
    it('should generate Excel buffer for transactions', () => {
      const transactions: TransactionExport[] = [
        {
          date: new Date('2025-11-09'),
          payee: 'Test Store',
          amount: new Decimal(-50.00),
          category: { name: 'Groceries' },
          account: { name: 'Checking' },
          notes: 'Weekly shopping',
          tags: ['food', 'essentials'],
        },
        {
          date: new Date('2025-11-08'),
          payee: 'Gas Station',
          amount: 40.50,
          category: { name: 'Transportation' },
          account: { name: 'Credit Card' },
          notes: null,
          tags: [],
        },
      ]

      const buffer = generateTransactionExcel(transactions)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      // Check for Excel file signature (ZIP format)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })

    it('should handle empty transactions array', () => {
      const buffer = generateTransactionExcel([])

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('generateBudgetExcel', () => {
    it('should generate Excel buffer for budgets', () => {
      const budgets: BudgetExport[] = [
        {
          month: '2025-11',
          category: { name: 'Groceries' },
          budgetAmount: new Decimal(500),
          spentAmount: new Decimal(350.50),
          remainingAmount: new Decimal(149.50),
          status: 'UNDER_BUDGET',
        },
      ]

      const buffer = generateBudgetExcel(budgets)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })
  })

  describe('generateGoalExcel', () => {
    it('should generate Excel buffer for goals', () => {
      const goals: GoalExport[] = [
        {
          name: 'Emergency Fund',
          targetAmount: new Decimal(10000),
          currentAmount: new Decimal(5000),
          targetDate: new Date('2026-12-31'),
          linkedAccount: { name: 'Savings' },
          status: 'IN_PROGRESS',
        },
      ]

      const buffer = generateGoalExcel(goals)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })

    it('should handle goals without linked accounts', () => {
      const goals: GoalExport[] = [
        {
          name: 'Vacation',
          targetAmount: 2000,
          currentAmount: 500,
          targetDate: new Date('2026-06-01'),
          linkedAccount: null,
          status: 'NOT_STARTED',
        },
      ]

      const buffer = generateGoalExcel(goals)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('generateAccountExcel', () => {
    it('should generate Excel buffer for accounts', () => {
      const accounts: AccountExport[] = [
        {
          name: 'Checking Account',
          type: 'CHECKING',
          balance: new Decimal(2500.75),
          plaidAccountId: 'plaid_123',
          isActive: true,
          updatedAt: new Date('2025-11-09'),
        },
        {
          name: 'Manual Cash',
          type: 'CASH',
          balance: 150.00,
          plaidAccountId: null,
          isActive: true,
          updatedAt: new Date('2025-11-09'),
        },
      ]

      const buffer = generateAccountExcel(accounts)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })
  })

  describe('generateRecurringTransactionExcel', () => {
    it('should generate Excel buffer for recurring transactions', () => {
      const recurringTransactions: RecurringTransactionExport[] = [
        {
          payee: 'Netflix',
          amount: new Decimal(-15.99),
          category: { name: 'Entertainment' },
          account: { name: 'Credit Card' },
          frequency: 'MONTHLY',
          interval: 1,
          nextScheduledDate: new Date('2025-12-01'),
          status: 'ACTIVE',
        },
        {
          payee: 'Gym Membership',
          amount: -50.00,
          category: { name: 'Health' },
          account: { name: 'Checking' },
          frequency: 'BIWEEKLY',
          interval: 2,
          nextScheduledDate: new Date('2025-11-20'),
          status: 'ACTIVE',
        },
      ]

      const buffer = generateRecurringTransactionExcel(recurringTransactions)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })
  })

  describe('generateCategoryExcel', () => {
    it('should generate Excel buffer for categories', () => {
      const categories: CategoryExport[] = [
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
      ]

      const buffer = generateCategoryExcel(categories)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.toString('hex').slice(0, 8)).toBe('504b0304')
    })
  })

  describe('Buffer validation', () => {
    it('should return valid Buffer type for all generators', () => {
      const transactionBuffer = generateTransactionExcel([])
      const budgetBuffer = generateBudgetExcel([])
      const goalBuffer = generateGoalExcel([])
      const accountBuffer = generateAccountExcel([])
      const recurringBuffer = generateRecurringTransactionExcel([])
      const categoryBuffer = generateCategoryExcel([])

      expect(Buffer.isBuffer(transactionBuffer)).toBe(true)
      expect(Buffer.isBuffer(budgetBuffer)).toBe(true)
      expect(Buffer.isBuffer(goalBuffer)).toBe(true)
      expect(Buffer.isBuffer(accountBuffer)).toBe(true)
      expect(Buffer.isBuffer(recurringBuffer)).toBe(true)
      expect(Buffer.isBuffer(categoryBuffer)).toBe(true)
    })
  })
})
