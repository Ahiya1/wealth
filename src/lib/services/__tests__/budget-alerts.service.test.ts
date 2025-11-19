import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { checkBudgetAlerts, resetBudgetAlerts } from '../budget-alerts.service'

// Mock Prisma
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})

describe('checkBudgetAlerts', () => {
  it('triggers alert when budget crosses 75% threshold', async () => {
    // Mock budget with 75% threshold alert
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-groceries',
        amount: 1000,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-groceries',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#4CAF50',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-1',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // Mock spending: ₪800 out of ₪1000 (80%)
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -800 },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 1 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-groceries'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.threshold).toBe(75)
    expect(result[0]?.percentage).toBe(80)
    expect(prismaMock.budgetAlert.updateMany).toHaveBeenCalledWith({
      where: {
        budgetId: 'budget-1',
        threshold: { in: [75] },
        sent: false,
      },
      data: {
        sent: true,
        sentAt: expect.any(Date),
      },
    })
  })

  it('triggers multiple alerts when crossing 90% and 100%', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-dining',
        amount: 500,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-dining',
          name: 'Dining Out',
          icon: 'utensils',
          color: '#FF9800',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-90',
            budgetId: 'budget-1',
            threshold: 90,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
          {
            id: 'alert-100',
            budgetId: 'budget-1',
            threshold: 100,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // Mock spending: ₪550 out of ₪500 (110%)
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -550 },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 2 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-dining'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.threshold)).toEqual([90, 100])
  })

  it('does not trigger alert if already sent', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-transport',
        amount: 300,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-transport',
          name: 'Transportation',
          icon: 'car',
          color: '#2196F3',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: true, // Already sent
            sentAt: new Date('2025-11-15'),
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -250 }, // 83%
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-transport'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
    expect(prismaMock.budgetAlert.updateMany).not.toHaveBeenCalled()
  })

  it('does not trigger alert if percentage below threshold', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-entertainment',
        amount: 500,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-entertainment',
          name: 'Entertainment',
          icon: 'ticket',
          color: '#9C27B0',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // Mock spending: ₪300 out of ₪500 (60%)
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -300 },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-entertainment'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
    expect(prismaMock.budgetAlert.updateMany).not.toHaveBeenCalled()
  })

  it('handles zero budget amount without division by zero', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-misc',
        amount: 0, // Zero budget
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-misc',
          name: 'Miscellaneous',
          icon: 'more-horizontal',
          color: '#757575',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -100 },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-misc'],
      '2025-11',
      prismaMock as any
    )

    // Percentage should be 0 (not Infinity or NaN)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when no budgets found', async () => {
    prismaMock.budget.findMany.mockResolvedValue([])

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-groceries'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
    expect(prismaMock.transaction.aggregate).not.toHaveBeenCalled()
  })

  it('returns empty array for empty category list', async () => {
    prismaMock.budget.findMany.mockResolvedValue([])

    const result = await checkBudgetAlerts(
      'user-1',
      [],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
  })

  it('handles transactions with zero spending', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-utilities',
        amount: 500,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-utilities',
          name: 'Utilities',
          icon: 'zap',
          color: '#FFEB3B',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // No transactions found
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-utilities'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(0)
  })

  it('correctly calculates percentage at exact threshold (75%)', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-health',
        amount: 400,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-health',
          name: 'Healthcare',
          icon: 'heart',
          color: '#E91E63',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-75',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // Exactly 75%: ₪300 out of ₪400
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: -300 },
      _count: { amount: 0 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 1 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-health'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.percentage).toBe(75)
  })

  it('processes multiple budgets in single call', async () => {
    prismaMock.budget.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-groceries',
        amount: 1000,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-groceries',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#4CAF50',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-1',
            budgetId: 'budget-1',
            threshold: 75,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
      {
        id: 'budget-2',
        userId: 'user-1',
        categoryId: 'cat-dining',
        amount: 500,
        month: '2025-11',
        rollover: false,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat-dining',
          name: 'Dining Out',
          icon: 'utensils',
          color: '#FF9800',
          isDefault: true,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        alerts: [
          {
            id: 'alert-2',
            budgetId: 'budget-2',
            threshold: 90,
            sent: false,
            sentAt: null,
            createdAt: new Date(),
          },
        ],
      } as any,
    ])

    // Mock different spending for each category
    prismaMock.transaction.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: -800 }, // Groceries: 80%
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      })
      .mockResolvedValueOnce({
        _sum: { amount: -460 }, // Dining: 92%
        _count: { amount: 0 },
        _avg: { amount: null },
        _min: { amount: null },
        _max: { amount: null },
      })

    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 1 })

    const result = await checkBudgetAlerts(
      'user-1',
      ['cat-groceries', 'cat-dining'],
      '2025-11',
      prismaMock as any
    )

    expect(result).toHaveLength(2)
    expect(result[0]?.categoryName).toBe('Groceries')
    expect(result[1]?.categoryName).toBe('Dining Out')
  })
})

describe('resetBudgetAlerts', () => {
  it('resets all alerts for a budget', async () => {
    prismaMock.budgetAlert.updateMany.mockResolvedValue({ count: 3 })

    await resetBudgetAlerts('budget-1', prismaMock as any)

    expect(prismaMock.budgetAlert.updateMany).toHaveBeenCalledWith({
      where: { budgetId: 'budget-1' },
      data: { sent: false, sentAt: null },
    })
  })
})
