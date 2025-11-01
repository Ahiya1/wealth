// src/server/api/routers/__tests__/budgets.router.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
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

describe('Budgets Router', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
  })

  describe('create', () => {
    it('should create a budget with alerts', async () => {
      const caller = createCaller('user-1')

      const mockCategory = {
        id: 'category-1',
        userId: 'user-1',
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#10b981',
        parentId: null,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      }

      mockPrisma.category.findFirst.mockResolvedValue(mockCategory as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findMany.mockResolvedValue([])
      mockPrisma.budget.create.mockResolvedValue(mockBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budgetAlert.createMany.mockResolvedValue({ count: 3 } as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.create({
        categoryId: 'category-1',
        amount: 500,
        month: '2025-10',
      })

      expect(result.id).toBe('budget-1')
      expect(result.amount).toEqual(new Decimal(500))
      expect(result.month).toBe('2025-10')

      // Verify alerts were created
      expect(mockPrisma.budgetAlert.createMany).toHaveBeenCalledWith({
        data: [
          { budgetId: 'budget-1', threshold: 75 },
          { budgetId: 'budget-1', threshold: 90 },
          { budgetId: 'budget-1', threshold: 100 },
        ],
      })
    })

    it('should create recurring budgets for future months', async () => {
      const caller = createCaller('user-1')

      const mockCategory = {
        id: 'category-1',
        userId: 'user-1',
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#10b981',
        parentId: null,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.category.findFirst.mockResolvedValue(mockCategory as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findMany.mockResolvedValue([])
      mockPrisma.budget.create.mockResolvedValue({
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
      } as Budget & { category: Category; spent?: number })
      mockPrisma.budgetAlert.createMany.mockResolvedValue({ count: 3 } as Budget & { category: Category; spent?: number })

      await caller.budgets.create({
        categoryId: 'category-1',
        amount: 500,
        month: '2025-10',
        isRecurring: true,
        createForFutureMonths: 3,
      })

      // Should create budget for current month + 3 future months = 4 total
      expect(mockPrisma.budget.create).toHaveBeenCalledTimes(4)
    })

    it('should throw NOT_FOUND for non-existent category', async () => {
      const caller = createCaller('user-1')

      mockPrisma.category.findFirst.mockResolvedValue(null)

      await expect(
        caller.budgets.create({
          categoryId: 'non-existent',
          amount: 500,
          month: '2025-10',
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw CONFLICT when budget already exists for month', async () => {
      const caller = createCaller('user-1')

      const mockCategory = {
        id: 'category-1',
        userId: 'user-1',
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#10b981',
        parentId: null,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.category.findFirst.mockResolvedValue(mockCategory as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findMany.mockResolvedValue([existingBudget] as Budget & { category: Category; spent?: number })

      await expect(
        caller.budgets.create({
          categoryId: 'category-1',
          amount: 600,
          month: '2025-10',
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should validate month format', async () => {
      const caller = createCaller('user-1')

      await expect(
        caller.budgets.create({
          categoryId: 'category-1',
          amount: 500,
          month: 'invalid-month',
        })
      ).rejects.toThrow()
    })

    it('should reject negative amounts', async () => {
      const caller = createCaller('user-1')

      await expect(
        caller.budgets.create({
          categoryId: 'category-1',
          amount: -500,
          month: '2025-10',
        })
      ).rejects.toThrow()
    })
  })

  describe('progress', () => {
    it('should calculate budget progress correctly', async () => {
      const caller = createCaller('user-1')

      const mockBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Mock: Spent $300 out of $500 budget (60%)
      mockPrisma.budget.findMany.mockResolvedValue([mockBudget] as Budget & { category: Category; spent?: number })
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(-300) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.progress({ month: '2025-10' })

      expect(result.budgets).toHaveLength(1)
      expect(result.budgets[0].budgetAmount).toBe(500)
      expect(result.budgets[0].spentAmount).toBe(300)
      expect(result.budgets[0].remainingAmount).toBe(200)
      expect(result.budgets[0].percentage).toBe(60)
      expect(result.budgets[0].status).toBe('good')
    })

    it('should mark budget as warning when 75% spent', async () => {
      const caller = createCaller('user-1')

      const mockBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Mock: Spent $380 out of $500 budget (76%)
      mockPrisma.budget.findMany.mockResolvedValue([mockBudget] as Budget & { category: Category; spent?: number })
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(-380) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.progress({ month: '2025-10' })

      expect(result.budgets[0].percentage).toBe(76)
      expect(result.budgets[0].status).toBe('warning')
    })

    it('should mark budget as over when >95% spent', async () => {
      const caller = createCaller('user-1')

      const mockBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Mock: Spent $600 out of $500 budget (120%, capped at 100%)
      mockPrisma.budget.findMany.mockResolvedValue([mockBudget] as Budget & { category: Category; spent?: number })
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(-600) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.progress({ month: '2025-10' })

      expect(result.budgets[0].spentAmount).toBe(600)
      expect(result.budgets[0].remainingAmount).toBe(-100)
      expect(result.budgets[0].percentage).toBe(100) // Capped at 100
      expect(result.budgets[0].status).toBe('over')
    })

    it('should handle budgets with no spending', async () => {
      const caller = createCaller('user-1')

      const mockBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Mock: No spending yet
      mockPrisma.budget.findMany.mockResolvedValue([mockBudget] as Budget & { category: Category; spent?: number })
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.progress({ month: '2025-10' })

      expect(result.budgets[0].spentAmount).toBe(0)
      expect(result.budgets[0].remainingAmount).toBe(500)
      expect(result.budgets[0].percentage).toBe(0)
      expect(result.budgets[0].status).toBe('good')
    })

    it('should only count expenses (negative amounts)', async () => {
      const caller = createCaller('user-1')

      mockPrisma.budget.findMany.mockResolvedValue([
        {
          id: 'budget-1',
          userId: 'user-1',
          categoryId: 'category-1',
          amount: new Decimal(500),
          month: '2025-10',
          rollover: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-1',
            name: 'Groceries',
            icon: 'shopping-cart',
            color: '#10b981',
            parentId: null,
            isDefault: false,
            isActive: true,
            userId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ] as Budget & { category: Category; spent?: number })

      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(-300) },
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      } as Budget & { category: Category; spent?: number })

      await caller.budgets.progress({ month: '2025-10' })

      // Verify query only includes negative amounts (expenses)
      expect(mockPrisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amount: { lt: 0 },
          }),
        })
      )
    })

    it('should throw BAD_REQUEST for invalid month format', async () => {
      const caller = createCaller('user-1')

      mockPrisma.budget.findMany.mockResolvedValue([
        {
          id: 'budget-1',
          userId: 'user-1',
          categoryId: 'category-1',
          amount: new Decimal(500),
          month: 'invalid',
          rollover: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-1',
            name: 'Groceries',
            icon: null,
            color: null,
            parentId: null,
            isDefault: false,
            isActive: true,
            userId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ] as Budget & { category: Category; spent?: number })

      await expect(
        caller.budgets.progress({ month: 'invalid-month' })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update budget amount', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedBudget = {
        ...existingBudget,
        amount: new Decimal(600),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPrisma.budget.findUnique.mockResolvedValueOnce(existingBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.update.mockResolvedValue(updatedBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findUnique.mockResolvedValueOnce(updatedBudget as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.update({
        id: 'budget-1',
        amount: 600,
      })

      expect(result.amount).toEqual(new Decimal(600))
    })

    it('should update rollover setting', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedBudget = {
        ...existingBudget,
        rollover: true,
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPrisma.budget.findUnique.mockResolvedValueOnce(existingBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.update.mockResolvedValue(updatedBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findUnique.mockResolvedValueOnce(updatedBudget as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.update({
        id: 'budget-1',
        rollover: true,
      })

      expect(result.rollover).toBe(true)
    })

    it('should update future months when applyToFutureMonths is true', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedBudget = {
        ...existingBudget,
        amount: new Decimal(600),
        category: {
          id: 'category-1',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#10b981',
          parentId: null,
          isDefault: false,
          isActive: true,
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      mockPrisma.budget.findUnique.mockResolvedValueOnce(existingBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.updateMany.mockResolvedValue({ count: 3 } as Budget & { category: Category; spent?: number })
      mockPrisma.budget.findUnique.mockResolvedValueOnce(updatedBudget as Budget & { category: Category; spent?: number })

      await caller.budgets.update({
        id: 'budget-1',
        amount: 600,
        applyToFutureMonths: true,
      })

      // Verify updateMany was called for future months
      expect(mockPrisma.budget.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          categoryId: 'category-1',
          month: { gte: '2025-10' },
        },
        data: { amount: 600 },
      })
    })

    it('should throw NOT_FOUND for non-existent budget', async () => {
      const caller = createCaller('user-1')

      mockPrisma.budget.findUnique.mockResolvedValue(null)

      await expect(
        caller.budgets.update({
          id: 'non-existent',
          amount: 600,
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when updating another user\'s budget', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-2', // Different user
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.budget.findUnique.mockResolvedValue(existingBudget as Budget & { category: Category; spent?: number })

      await expect(
        caller.budgets.update({
          id: 'budget-1',
          amount: 600,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('delete', () => {
    it('should delete a budget', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.budget.findUnique.mockResolvedValue(existingBudget as Budget & { category: Category; spent?: number })
      mockPrisma.budget.delete.mockResolvedValue(existingBudget as Budget & { category: Category; spent?: number })

      const result = await caller.budgets.delete({ id: 'budget-1' })

      expect(result.success).toBe(true)
      expect(mockPrisma.budget.delete).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      })
    })

    it('should throw NOT_FOUND for non-existent budget', async () => {
      const caller = createCaller('user-1')

      mockPrisma.budget.findUnique.mockResolvedValue(null)

      await expect(
        caller.budgets.delete({ id: 'non-existent' })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when deleting another user\'s budget', async () => {
      const caller = createCaller('user-1')

      const existingBudget = {
        id: 'budget-1',
        userId: 'user-2', // Different user
        categoryId: 'category-1',
        amount: new Decimal(500),
        month: '2025-10',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.budget.findUnique.mockResolvedValue(existingBudget as Budget & { category: Category; spent?: number })

      await expect(
        caller.budgets.delete({ id: 'budget-1' })
      ).rejects.toThrow(TRPCError)
    })
  })
})
