// src/server/api/routers/__tests__/recurring.router.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient, RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

// Mock recurring service
vi.mock('@/server/services/recurring.service', () => ({
  generatePendingRecurringTransactions: vi.fn().mockResolvedValue({
    processed: 0,
    created: 0,
    errors: 0,
  }),
  generateRecurringTransactionsForUser: vi.fn().mockResolvedValue({
    processed: 0,
    created: 0,
    errors: 0,
  }),
}))

import { prisma } from '@/lib/prisma'
import { appRouter } from '../../root'
import type { Context } from '../../trpc'

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>

// Helper to create caller with mocked context
function createCaller(userId: string) {
  return appRouter.createCaller({
    prisma: mockPrisma,
    user: { id: userId },
  } as Context)
}

describe('Recurring Router', () => {
  beforeEach(() => {
    mockReset(mockPrisma)
  })

  describe('list', () => {
    it('should return all recurring transactions for user', async () => {
      const caller = createCaller('user-1')

      const mockRecurring = [
        {
          id: 'recurring-1',
          userId: 'user-1',
          accountId: 'account-1',
          amount: -50.0,
          payee: 'Netflix',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date('2025-01-01'),
          endDate: null,
          dayOfMonth: null,
          dayOfWeek: null,
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: new Date('2025-11-01'),
          lastGeneratedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
          account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.recurringTransaction.findMany.mockResolvedValue(mockRecurring as any)

      const result = await caller.recurring.list({})

      expect(result).toHaveLength(1)
      expect(result[0].payee).toBe('Netflix')
      expect(mockPrisma.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })
    })

    it('should filter by status when provided', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([])

      await caller.recurring.list({ status: RecurringTransactionStatus.PAUSED })

      expect(mockPrisma.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: RecurringTransactionStatus.PAUSED,
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })
    })

    it('should filter by accountId when provided', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([])

      await caller.recurring.list({ accountId: 'account-123' })

      expect(mockPrisma.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          accountId: 'account-123',
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })
    })
  })

  describe('get', () => {
    it('should return recurring transaction by id', async () => {
      const caller = createCaller('user-1')

      const mockRecurring = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
        account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
        generatedTransactions: [],
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(mockRecurring as any)

      const result = await caller.recurring.get({ id: 'recurring-1' })

      expect(result.id).toBe('recurring-1')
      expect(result.payee).toBe('Netflix')
      expect(result.generatedTransactions).toEqual([])
    })

    it('should throw NOT_FOUND for non-existent recurring transaction', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(null)

      await expect(
        caller.recurring.get({ id: 'non-existent' })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when accessing another user\'s recurring transaction', async () => {
      const caller = createCaller('user-1')

      const mockRecurring = {
        id: 'recurring-1',
        userId: 'user-2', // Different user
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(mockRecurring as any)

      await expect(
        caller.recurring.get({ id: 'recurring-1' })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('create', () => {
    it('should create recurring transaction with valid data', async () => {
      const caller = createCaller('user-1')

      const mockAccount = {
        id: 'account-1',
        userId: 'user-1',
        type: 'CHECKING',
        name: 'Checking',
        institution: 'Bank',
        balance: 1000,
        currency: 'NIS',
        plaidAccountId: null,
        plaidAccessToken: null,
        isManual: true,
        isActive: true,
        lastSynced: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCategory = {
        id: 'category-1',
        name: 'Subscriptions',
        icon: null,
        color: null,
        parentId: null,
        isDefault: false,
        isActive: true,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedRecurring = {
        id: 'recurring-new',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -15.99,
        payee: 'Spotify',
        categoryId: 'category-1',
        notes: 'Premium subscription',
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-10-01'),
        endDate: null,
        dayOfMonth: 1,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: mockCategory,
        account: mockAccount,
      }

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount as any)
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any)
      mockPrisma.recurringTransaction.create.mockResolvedValue(mockCreatedRecurring as any)

      const result = await caller.recurring.create({
        accountId: 'account-1',
        amount: -15.99,
        payee: 'Spotify',
        categoryId: 'category-1',
        notes: 'Premium subscription',
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-10-01'),
        dayOfMonth: 1,
      })

      expect(result.payee).toBe('Spotify')
      expect(result.amount).toBe(-15.99)
      expect(result.frequency).toBe(RecurrenceFrequency.MONTHLY)
    })

    it('should throw NOT_FOUND for non-existent account', async () => {
      const caller = createCaller('user-1')

      mockPrisma.account.findUnique.mockResolvedValue(null)

      await expect(
        caller.recurring.create({
          accountId: 'non-existent',
          amount: -50.0,
          payee: 'Test',
          categoryId: 'category-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when using another user\'s account', async () => {
      const caller = createCaller('user-1')

      const mockAccount = {
        id: 'account-1',
        userId: 'user-2', // Different user
        type: 'CHECKING',
        name: 'Checking',
        institution: 'Bank',
        balance: 1000,
        currency: 'NIS',
        plaidAccountId: null,
        plaidAccessToken: null,
        isManual: true,
        isActive: true,
        lastSynced: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount as any)

      await expect(
        caller.recurring.create({
          accountId: 'account-1',
          amount: -50.0,
          payee: 'Test',
          categoryId: 'category-1',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND for non-existent category', async () => {
      const caller = createCaller('user-1')

      const mockAccount = {
        id: 'account-1',
        userId: 'user-1',
        type: 'CHECKING',
        name: 'Checking',
        institution: 'Bank',
        balance: 1000,
        currency: 'NIS',
        plaidAccountId: null,
        plaidAccessToken: null,
        isManual: true,
        isActive: true,
        lastSynced: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount as any)
      mockPrisma.category.findUnique.mockResolvedValue(null)

      await expect(
        caller.recurring.create({
          accountId: 'account-1',
          amount: -50.0,
          payee: 'Test',
          categoryId: 'non-existent',
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date(),
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('update', () => {
    it('should update recurring transaction fields', async () => {
      const caller = createCaller('user-1')

      const existingRecurring = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedRecurring = {
        ...existingRecurring,
        amount: -59.99,
        notes: 'Price increased',
        category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
        account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(existingRecurring as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue(updatedRecurring as any)

      const result = await caller.recurring.update({
        id: 'recurring-1',
        amount: -59.99,
        notes: 'Price increased',
      })

      expect(result.amount).toBe(-59.99)
      expect(result.notes).toBe('Price increased')
    })

    it('should throw NOT_FOUND for non-existent recurring transaction', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(null)

      await expect(
        caller.recurring.update({
          id: 'non-existent',
          amount: -100.0,
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw NOT_FOUND when updating another user\'s recurring transaction', async () => {
      const caller = createCaller('user-1')

      const existingRecurring = {
        id: 'recurring-1',
        userId: 'user-2', // Different user
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(existingRecurring as any)

      await expect(
        caller.recurring.update({
          id: 'recurring-1',
          amount: -100.0,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('delete', () => {
    it('should delete recurring transaction', async () => {
      const caller = createCaller('user-1')

      const existingRecurring = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(existingRecurring as any)
      mockPrisma.recurringTransaction.delete.mockResolvedValue(existingRecurring as any)

      const result = await caller.recurring.delete({ id: 'recurring-1' })

      expect(result.success).toBe(true)
      expect(mockPrisma.recurringTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'recurring-1' },
      })
    })

    it('should throw NOT_FOUND for non-existent recurring transaction', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(null)

      await expect(
        caller.recurring.delete({ id: 'non-existent' })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('pause', () => {
    it('should pause active recurring transaction', async () => {
      const caller = createCaller('user-1')

      const existingRecurring = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const pausedRecurring = {
        ...existingRecurring,
        status: RecurringTransactionStatus.PAUSED,
        category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
        account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(existingRecurring as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue(pausedRecurring as any)

      const result = await caller.recurring.pause({ id: 'recurring-1' })

      expect(result.status).toBe(RecurringTransactionStatus.PAUSED)
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-1' },
        data: {
          status: RecurringTransactionStatus.PAUSED,
        },
        include: {
          category: true,
          account: true,
        },
      })
    })
  })

  describe('resume', () => {
    it('should resume paused recurring transaction', async () => {
      const caller = createCaller('user-1')

      const existingRecurring = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.PAUSED,
        nextScheduledDate: new Date('2025-11-01'),
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const activeRecurring = {
        ...existingRecurring,
        status: RecurringTransactionStatus.ACTIVE,
        category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
        account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
      }

      mockPrisma.recurringTransaction.findUnique.mockResolvedValue(existingRecurring as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue(activeRecurring as any)

      const result = await caller.recurring.resume({ id: 'recurring-1' })

      expect(result.status).toBe(RecurringTransactionStatus.ACTIVE)
    })
  })

  describe('getUpcoming', () => {
    it('should return upcoming recurring transactions within specified days', async () => {
      const caller = createCaller('user-1')

      const today = new Date()
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      const mockUpcoming = [
        {
          id: 'recurring-1',
          userId: 'user-1',
          accountId: 'account-1',
          amount: -50.0,
          payee: 'Netflix',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: new Date('2025-01-01'),
          endDate: null,
          dayOfMonth: null,
          dayOfWeek: null,
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: in7Days,
          lastGeneratedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'category-1', name: 'Entertainment', icon: null, color: null, parentId: null, isDefault: false, isActive: true, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
          account: { id: 'account-1', userId: 'user-1', type: 'CHECKING', name: 'Checking', institution: 'Bank', balance: 1000, currency: 'NIS', plaidAccountId: null, plaidAccessToken: null, isManual: true, isActive: true, lastSynced: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ]

      mockPrisma.recurringTransaction.findMany.mockResolvedValue(mockUpcoming as any)

      const result = await caller.recurring.getUpcoming({ days: 30 })

      expect(result).toHaveLength(1)
      expect(result[0].payee).toBe('Netflix')
    })

    it('should default to 30 days if not specified', async () => {
      const caller = createCaller('user-1')

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([])

      await caller.recurring.getUpcoming({})

      // Check that the query uses a 30-day window
      const callArgs = mockPrisma.recurringTransaction.findMany.mock.calls[0][0]
      expect(callArgs.where.nextScheduledDate).toBeDefined()
    })
  })

  describe('generatePending', () => {
    it('should manually trigger generation for user', async () => {
      const caller = createCaller('user-1')

      const { generateRecurringTransactionsForUser } = await import(
        '@/server/services/recurring.service'
      )

      vi.mocked(generateRecurringTransactionsForUser).mockResolvedValue({
        processed: 2,
        created: 2,
        errors: 0,
      })

      const result = await caller.recurring.generatePending()

      expect(result.processed).toBe(2)
      expect(result.created).toBe(2)
      expect(result.errors).toBe(0)
    })
  })
})
