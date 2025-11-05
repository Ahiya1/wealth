// src/server/services/__tests__/recurring.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient, RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { addDays, addWeeks, addMonths, addYears, startOfDay } from 'date-fns'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

import { prisma } from '@/lib/prisma'
import {
  generatePendingRecurringTransactions,
  generateRecurringTransactionsForUser,
} from '../recurring.service'

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>

describe('Recurring Transaction Service', () => {
  beforeEach(() => {
    mockReset(mockPrisma)

    // Mock $transaction to execute the callback immediately with the mocked prisma
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockPrisma)
    })
  })

  describe('generatePendingRecurringTransactions', () => {
    it('should generate transactions for daily recurring template', async () => {
      const today = startOfDay(new Date())
      const nextDay = addDays(today, 1)

      const recurringTemplate = {
        id: 'recurring-1',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Netflix',
        categoryId: 'category-1',
        notes: 'Monthly subscription',
        tags: ['streaming'],
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate: addDays(today, -10),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)
      expect(results.errors).toBe(0)

      // Verify transaction was created
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          accountId: 'account-1',
          date: today,
          amount: -50.0,
          payee: 'Netflix',
          categoryId: 'category-1',
          notes: 'Monthly subscription',
          tags: ['streaming'],
          recurringTransactionId: 'recurring-1',
          isManual: false,
        },
      })

      // Verify next scheduled date was updated to tomorrow
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-1' },
        data: {
          lastGeneratedDate: today,
          nextScheduledDate: nextDay,
        },
      })
    })

    it('should generate transactions for weekly recurring template', async () => {
      const today = startOfDay(new Date())
      const nextWeek = addWeeks(today, 1)

      const recurringTemplate = {
        id: 'recurring-2',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -100.0,
        payee: 'Weekly Groceries',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.WEEKLY,
        interval: 1,
        startDate: addWeeks(today, -5),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is one week later
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-2' },
        data: {
          lastGeneratedDate: today,
          nextScheduledDate: nextWeek,
        },
      })
    })

    it('should generate transactions for biweekly recurring template', async () => {
      const today = startOfDay(new Date())
      const twoWeeksLater = addWeeks(today, 2)

      const recurringTemplate = {
        id: 'recurring-3',
        userId: 'user-1',
        accountId: 'account-1',
        amount: 2000.0,
        payee: 'Salary',
        categoryId: 'category-income',
        notes: 'Paycheck',
        tags: ['income'],
        frequency: RecurrenceFrequency.BIWEEKLY,
        interval: 1,
        startDate: addWeeks(today, -10),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is two weeks later
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-3' },
        data: {
          lastGeneratedDate: today,
          nextScheduledDate: twoWeeksLater,
        },
      })
    })

    it('should generate transactions for monthly recurring template', async () => {
      const today = startOfDay(new Date())
      const nextMonth = addMonths(today, 1)

      const recurringTemplate = {
        id: 'recurring-4',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -1500.0,
        payee: 'Rent',
        categoryId: 'category-housing',
        notes: 'Monthly rent',
        tags: ['housing'],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: addMonths(today, -6),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is one month later
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-4' },
        data: {
          lastGeneratedDate: today,
          nextScheduledDate: nextMonth,
        },
      })
    })

    it('should generate transactions for monthly recurring with specific day of month', async () => {
      const today = new Date(2025, 0, 15) // January 15, 2025

      const recurringTemplate = {
        id: 'recurring-5',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -75.0,
        payee: 'Credit Card Payment',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date(2024, 11, 15),
        endDate: null,
        dayOfMonth: 15,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is February 15
      const updateCall = mockPrisma.recurringTransaction.update.mock.calls[0][0]
      expect(updateCall.data.nextScheduledDate.getDate()).toBe(15)
      expect(updateCall.data.nextScheduledDate.getMonth()).toBe(1) // February
    })

    it('should generate transactions for monthly recurring on last day of month', async () => {
      const today = new Date(2025, 0, 31) // January 31, 2025

      const recurringTemplate = {
        id: 'recurring-6',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -200.0,
        payee: 'End of Month Bill',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date(2024, 11, 31),
        endDate: null,
        dayOfMonth: -1, // Last day of month
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is last day of February (28 in 2025)
      const updateCall = mockPrisma.recurringTransaction.update.mock.calls[0][0]
      expect(updateCall.data.nextScheduledDate.getMonth()).toBe(1) // February
      expect(updateCall.data.nextScheduledDate.getDate()).toBe(28) // Last day of Feb 2025
    })

    it('should generate transactions for yearly recurring template', async () => {
      const today = startOfDay(new Date())
      const nextYear = addYears(today, 1)

      const recurringTemplate = {
        id: 'recurring-7',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -500.0,
        payee: 'Annual Subscription',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.YEARLY,
        interval: 1,
        startDate: addYears(today, -2),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify next scheduled date is one year later
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-7' },
        data: {
          lastGeneratedDate: today,
          nextScheduledDate: nextYear,
        },
      })
    })

    it('should mark recurring as COMPLETED when end date is reached', async () => {
      const today = startOfDay(new Date())
      const endDate = today // End date is today

      const recurringTemplate = {
        id: 'recurring-8',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -25.0,
        payee: 'Limited Time Subscription',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: addMonths(today, -3),
        endDate: endDate,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([recurringTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify recurring was marked as COMPLETED
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'recurring-8' },
        data: {
          status: RecurringTransactionStatus.COMPLETED,
          lastGeneratedDate: today,
        },
      })
    })

    it('should skip recurring templates that are not due yet', async () => {
      mockPrisma.recurringTransaction.findMany.mockResolvedValue([])

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(0)
      expect(results.created).toBe(0)
      expect(results.errors).toBe(0)

      // Verify no transactions were created
      expect(mockPrisma.transaction.create).not.toHaveBeenCalled()
    })

    it('should skip PAUSED recurring templates', async () => {
      // The query filters by ACTIVE status, so this should return empty
      mockPrisma.recurringTransaction.findMany.mockResolvedValue([])

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(0)
      expect(results.created).toBe(0)
    })

    it('should handle errors gracefully and continue processing', async () => {
      const today = startOfDay(new Date())

      const template1 = {
        id: 'recurring-error',
        userId: 'user-1',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'Error Transaction',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: addMonths(today, -3),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const template2 = {
        ...template1,
        id: 'recurring-success',
        payee: 'Success Transaction',
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([template1, template2])

      // First $transaction call fails, second succeeds
      let callCount = 0
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Database error')
        }
        return await callback(mockPrisma)
      })

      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(2)
      expect(results.created).toBe(1)
      expect(results.errors).toBe(1)
    })

    it('should process multiple recurring templates in one run', async () => {
      const today = startOfDay(new Date())

      const templates = [
        {
          id: 'recurring-multi-1',
          userId: 'user-1',
          accountId: 'account-1',
          amount: -50.0,
          payee: 'Netflix',
          categoryId: 'category-1',
          notes: null,
          tags: [],
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: addMonths(today, -3),
          endDate: null,
          dayOfMonth: null,
          dayOfWeek: null,
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: today,
          lastGeneratedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'recurring-multi-2',
          userId: 'user-1',
          accountId: 'account-2',
          amount: -100.0,
          payee: 'Gym',
          categoryId: 'category-2',
          notes: null,
          tags: [],
          frequency: RecurrenceFrequency.MONTHLY,
          interval: 1,
          startDate: addMonths(today, -3),
          endDate: null,
          dayOfMonth: null,
          dayOfWeek: null,
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: today,
          lastGeneratedDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.recurringTransaction.findMany.mockResolvedValue(templates)
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generatePendingRecurringTransactions()

      expect(results.processed).toBe(2)
      expect(results.created).toBe(2)
      expect(results.errors).toBe(0)

      // Verify both transactions were created
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2)
      expect(mockPrisma.account.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.recurringTransaction.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('generateRecurringTransactionsForUser', () => {
    it('should generate transactions only for specified user', async () => {
      const today = startOfDay(new Date())

      const userTemplate = {
        id: 'recurring-user',
        userId: 'user-specific',
        accountId: 'account-1',
        amount: -50.0,
        payee: 'User Specific',
        categoryId: 'category-1',
        notes: null,
        tags: [],
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: addMonths(today, -3),
        endDate: null,
        dayOfMonth: null,
        dayOfWeek: null,
        status: RecurringTransactionStatus.ACTIVE,
        nextScheduledDate: today,
        lastGeneratedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.recurringTransaction.findMany.mockResolvedValue([userTemplate])
      mockPrisma.transaction.create.mockResolvedValue({} as any)
      mockPrisma.account.update.mockResolvedValue({} as any)
      mockPrisma.recurringTransaction.update.mockResolvedValue({} as any)

      const results = await generateRecurringTransactionsForUser('user-specific')

      expect(results.processed).toBe(1)
      expect(results.created).toBe(1)

      // Verify query filtered by userId
      expect(mockPrisma.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-specific',
          status: RecurringTransactionStatus.ACTIVE,
          nextScheduledDate: {
            lte: today,
          },
        },
      })
    })
  })
})
