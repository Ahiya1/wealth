// src/server/api/routers/__tests__/analytics.router.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

import { prisma } from '@/lib/prisma'
import { appRouter } from '../../root'
import type { Context } from '../../trpc'

const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>

// Helper to create caller with mocked context
function createCaller(userId: string) {
  return appRouter.createCaller({
    prisma: mockPrisma,
    user: { id: userId },
  } as Context)
}

describe('Analytics Router', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
  })

  describe('dashboardSummary', () => {
    it('should calculate net worth from all active accounts', async () => {
      const caller = createCaller('user-1')

      const mockAccounts = [
        {
          id: 'account-1',
          userId: 'user-1',
          type: 'CHECKING',
          name: 'Checking',
          institution: 'Bank',
          balance: new Decimal(1000),
          currency: 'NIS',
          plaidAccountId: null,
          plaidAccessToken: null,
          isManual: true,
          isActive: true,
          lastSynced: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-2',
          userId: 'user-1',
          type: 'SAVINGS',
          name: 'Savings',
          institution: 'Bank',
          balance: new Decimal(5000),
          currency: 'NIS',
          plaidAccountId: null,
          plaidAccessToken: null,
          isManual: true,
          isActive: true,
          lastSynced: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-3',
          userId: 'user-1',
          type: 'CREDIT',
          name: 'Credit Card',
          institution: 'Bank',
          balance: new Decimal(-500),
          currency: 'NIS',
          plaidAccountId: null,
          plaidAccessToken: null,
          isManual: true,
          isActive: true,
          lastSynced: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.account.findMany.mockResolvedValue(mockAccounts as any)
      // Mock aggregate for income
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(0) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      // Mock aggregate for expenses
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(0) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      mockPrisma.budget.findMany.mockResolvedValue([])
      mockPrisma.transaction.findMany.mockResolvedValueOnce([]) // Recent transactions
      mockPrisma.transaction.findMany.mockResolvedValueOnce([]) // Category transactions

      const result = await caller.analytics.dashboardSummary()

      // Net worth = 1000 + 5000 - 500 = 5500
      expect(result.netWorth).toBe(5500)
    })

    it('should calculate income and expenses for current month', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date(),
          amount: new Decimal(-300), // Expense
          payee: 'Groceries',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-2',
            userId: 'user-1',
            name: 'Groceries',
            icon: null,
            color: null,
            parentId: null,
            isDefault: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: 'txn-3',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date(),
          amount: new Decimal(-150), // Expense
          payee: 'Utilities',
          categoryId: 'category-3',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-3',
            userId: 'user-1',
            name: 'Utilities',
            icon: null,
            color: null,
            parentId: null,
            isDefault: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ]

      mockPrisma.account.findMany.mockResolvedValue([])
      // Mock aggregate for income (positive amounts)
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(2000) },
        _count: { amount: 1 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      // Mock aggregate for expenses (negative amounts)
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(-450) },
        _count: { amount: 2 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      mockPrisma.budget.findMany.mockResolvedValue([])
      mockPrisma.transaction.findMany.mockResolvedValueOnce([]) // Recent transactions
      mockPrisma.transaction.findMany.mockResolvedValueOnce(mockTransactions as any) // Category transactions

      const result = await caller.analytics.dashboardSummary()

      expect(result.income).toBe(2000)
      expect(result.expenses).toBe(450) // 300 + 150
    })

    it('should return top 5 spending categories', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date(),
          amount: new Decimal(-500),
          payee: 'Rent',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', userId: 'user-1', name: 'Housing', icon: null, color: null, parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date(),
          amount: new Decimal(-300),
          payee: 'Groceries',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-2', userId: 'user-1', name: 'Food', icon: null, color: null, parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'txn-3',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date(),
          amount: new Decimal(-200),
          payee: 'More Groceries',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-2', userId: 'user-1', name: 'Food', icon: null, color: null, parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.account.findMany.mockResolvedValue([])
      // Mock aggregate for income (no income in this test)
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(0) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      // Mock aggregate for expenses
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(-1000) },
        _count: { amount: 3 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as any)
      mockPrisma.budget.findMany.mockResolvedValue([])
      mockPrisma.transaction.findMany.mockResolvedValueOnce([]) // Recent transactions
      mockPrisma.transaction.findMany.mockResolvedValueOnce(mockTransactions as any) // Category transactions

      const result = await caller.analytics.dashboardSummary()

      expect(result.topCategories).toHaveLength(2)
      // Both categories have same total (500), so either order is valid
      const categories = result.topCategories.map((c) => c.category).sort()
      expect(categories).toEqual(['Food', 'Housing'])
      expect(result.topCategories[0].amount).toBe(500)
      expect(result.topCategories[1].amount).toBe(500)
    })
  })

  describe('spendingByCategory', () => {
    it('should aggregate spending by category', async () => {
      const caller = createCaller('user-1')

      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-31')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-15'),
          amount: new Decimal(-300),
          payee: 'Groceries',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', userId: 'user-1', name: 'Food', icon: null, color: '#10b981', parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-20'),
          amount: new Decimal(-150),
          payee: 'Restaurant',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', userId: 'user-1', name: 'Food', icon: null, color: '#10b981', parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'txn-3',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-25'),
          amount: new Decimal(-100),
          payee: 'Electric Bill',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-2', userId: 'user-1', name: 'Utilities', icon: null, color: '#ef4444', parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any)

      const result = await caller.analytics.spendingByCategory({ startDate, endDate })

      expect(result).toHaveLength(2)
      expect(result[0].category).toBe('Food')
      expect(result[0].amount).toBe(450) // 300 + 150
      expect(result[0].color).toBe('#10b981')
      expect(result[1].category).toBe('Utilities')
      expect(result[1].amount).toBe(100)
    })

    it('should only include expenses (negative amounts)', async () => {
      const caller = createCaller('user-1')

      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-31')

      mockPrisma.transaction.findMany.mockResolvedValue([])

      await caller.analytics.spendingByCategory({ startDate, endDate })

      // Verify query only includes negative amounts
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: { lt: 0 },
          }),
        })
      )
    })

    it('should use default color when category has no color', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-15'),
          amount: new Decimal(-100),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', userId: 'user-1', name: 'Misc', icon: null, color: null, parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any)

      const result = await caller.analytics.spendingByCategory({
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      })

      expect(result[0].color).toBe('#9ca3af') // Default gray
    })
  })

  describe('spendingTrends', () => {
    it('should group spending by month', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-08-15'),
          amount: new Decimal(-500),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-08-25'),
          amount: new Decimal(-300),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn-3',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-09-10'),
          amount: new Decimal(-400),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any)

      const result = await caller.analytics.spendingTrends({
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-09-30'),
        groupBy: 'month',
      })

      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2025-08')
      expect(result[0].amount).toBe(800) // 500 + 300
      expect(result[1].date).toBe('2025-09')
      expect(result[1].amount).toBe(400)
    })

    it('should group spending by day when requested', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-15'),
          amount: new Decimal(-100),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-15'),
          amount: new Decimal(-50),
          payee: 'Test',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any)

      const result = await caller.analytics.spendingTrends({
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        groupBy: 'day',
      })

      expect(result).toHaveLength(1)
      expect(result[0].date).toBe('2025-10-15')
      expect(result[0].amount).toBe(150)
    })
  })

  describe('monthOverMonth', () => {
    it('should calculate income and expenses for each month', async () => {
      const caller = createCaller('user-1')

      // Mock aggregate results for each month (3 months = 6 aggregate calls: income + expenses per month)
      // Each month gets 2 aggregate calls (income and expenses)
      for (let i = 0; i < 3; i++) {
        // Mock income aggregate for month i
        mockPrisma.transaction.aggregate.mockResolvedValueOnce({
          _sum: { amount: new Decimal(3000) },
          _count: { amount: 1 },
          _avg: { amount: null },
          _min: { amount: null },
          _max: { amount: null },
        } as any)

        // Mock expenses aggregate for month i
        mockPrisma.transaction.aggregate.mockResolvedValueOnce({
          _sum: { amount: new Decimal(-800) },
          _count: { amount: 2 },
          _avg: { amount: null },
          _min: { amount: null },
          _max: { amount: null },
        } as any)
      }

      const result = await caller.analytics.monthOverMonth({ months: 3 })

      // Should return 3 months of data
      expect(result).toHaveLength(3)

      // Each month should have income and expenses
      result.forEach((month) => {
        expect(month).toHaveProperty('month')
        expect(month).toHaveProperty('income')
        expect(month).toHaveProperty('expenses')
        expect(month.income).toBe(3000)
        expect(month.expenses).toBe(800)
      })
    })

    it('should default to 6 months when not specified', async () => {
      const caller = createCaller('user-1')

      // Mock aggregate results for 6 months (12 total calls: income + expenses per month)
      for (let i = 0; i < 6; i++) {
        // Mock income aggregate for month i
        mockPrisma.transaction.aggregate.mockResolvedValueOnce({
          _sum: { amount: new Decimal(0) },
          _count: { amount: 0 },
          _avg: { amount: null },
          _min: { amount: null },
          _max: { amount: null },
        } as any)

        // Mock expenses aggregate for month i
        mockPrisma.transaction.aggregate.mockResolvedValueOnce({
          _sum: { amount: new Decimal(0) },
          _count: { amount: 0 },
          _avg: { amount: null },
          _min: { amount: null },
          _max: { amount: null },
        } as any)
      }

      const result = await caller.analytics.monthOverMonth({})

      expect(result).toHaveLength(6)
    })
  })

  describe('netWorthHistory', () => {
    it('should return current net worth as single data point', async () => {
      const caller = createCaller('user-1')

      const mockAccounts = [
        {
          id: 'account-1',
          userId: 'user-1',
          type: 'CHECKING',
          name: 'Checking',
          institution: 'Bank',
          balance: new Decimal(2000),
          currency: 'NIS',
          plaidAccountId: null,
          plaidAccessToken: null,
          isManual: true,
          isActive: true,
          lastSynced: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-2',
          userId: 'user-1',
          type: 'CREDIT',
          name: 'Credit Card',
          institution: 'Bank',
          balance: new Decimal(-500),
          currency: 'NIS',
          plaidAccountId: null,
          plaidAccessToken: null,
          isManual: true,
          isActive: true,
          lastSynced: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.account.findMany.mockResolvedValue(mockAccounts as any)

      const result = await caller.analytics.netWorthHistory()

      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(1500) // 2000 - 500
      expect(result[0]).toHaveProperty('date')
    })
  })

  describe('incomeBySource', () => {
    it('should aggregate income by category', async () => {
      const caller = createCaller('user-1')

      const mockTransactions = [
        {
          id: 'txn-1',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-15'),
          amount: new Decimal(3000),
          payee: 'Employer',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', userId: 'user-1', name: 'Salary', icon: null, color: '#10b981', parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          id: 'txn-2',
          userId: 'user-1',
          accountId: 'account-1',
          date: new Date('2025-10-20'),
          amount: new Decimal(500),
          payee: 'Side Project',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-2', userId: 'user-1', name: 'Freelance', icon: null, color: '#3b82f6', parentId: null, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any)

      const result = await caller.analytics.incomeBySource({
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      })

      expect(result).toHaveLength(2)
      expect(result[0].category).toBe('Salary')
      expect(result[0].amount).toBe(3000)
      expect(result[1].category).toBe('Freelance')
      expect(result[1].amount).toBe(500)
    })

    it('should only include income (positive amounts)', async () => {
      const caller = createCaller('user-1')

      mockPrisma.transaction.findMany.mockResolvedValue([])

      await caller.analytics.incomeBySource({
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      })

      // Verify query only includes positive amounts
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: { gt: 0 },
          }),
        })
      )
    })
  })
})
