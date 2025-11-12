import { describe, it, expect } from 'vitest'
import { generateAIContext } from '../aiContextGenerator'

describe('aiContextGenerator', () => {
  it('should generate valid JSON structure', () => {
    const input = {
      user: {
        currency: 'NIS',
        timezone: 'Asia/Jerusalem',
      },
      categories: [
        {
          id: '1',
          name: 'Food',
          icon: 'utensils',
          color: '#FF5733',
          parentId: null,
        },
        {
          id: '2',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: '#33FF57',
          parentId: '1',
        },
      ],
      statistics: {
        transactions: 150,
        budgets: 12,
        goals: 3,
        accounts: 4,
        recurringTransactions: 8,
        categories: 15,
      },
      dateRange: {
        earliest: new Date('2025-01-01'),
        latest: new Date('2025-11-09'),
      },
    }

    const result = generateAIContext(input)
    const parsed = JSON.parse(result)

    expect(parsed.exportVersion).toBe('1.0')
    expect(parsed.user.currency).toBe('NIS')
    expect(parsed.user.timezone).toBe('Asia/Jerusalem')
    expect(parsed.fieldDescriptions).toBeDefined()
    expect(parsed.fieldDescriptions.transaction).toBeDefined()
    expect(parsed.categories.hierarchy).toBeDefined()
    expect(parsed.categories.hierarchy['Food']).toBeDefined()
    expect(parsed.categories.hierarchy['Groceries'].parent).toBe('Food')
    expect(parsed.enums.AccountType).toContain('CHECKING')
    expect(parsed.aiPrompts.spendingAnalysis).toContain('NIS')
    expect(parsed.statistics.recordCounts.transactions).toBe(150)
  })

  it('should handle null date range', () => {
    const input = {
      user: {
        currency: 'USD',
        timezone: 'America/New_York',
      },
      categories: [],
      statistics: {
        transactions: 0,
        budgets: 0,
        goals: 0,
        accounts: 0,
        recurringTransactions: 0,
        categories: 0,
      },
      dateRange: null,
    }

    const result = generateAIContext(input)
    const parsed = JSON.parse(result)

    expect(parsed.statistics.dateRange).toBeNull()
  })

  it('should prevent infinite loops with circular category references', () => {
    const input = {
      user: {
        currency: 'NIS',
        timezone: 'Asia/Jerusalem',
      },
      categories: [
        {
          id: '1',
          name: 'Category A',
          icon: 'icon',
          color: '#000000',
          parentId: '2', // Points to B
        },
        {
          id: '2',
          name: 'Category B',
          icon: 'icon',
          color: '#111111',
          parentId: '1', // Points to A (circular!)
        },
      ],
      statistics: {
        transactions: 0,
        budgets: 0,
        goals: 0,
        accounts: 0,
        recurringTransactions: 0,
        categories: 2,
      },
      dateRange: null,
    }

    // Should not throw or hang
    const result = generateAIContext(input)
    const parsed = JSON.parse(result)

    expect(parsed.categories.hierarchy).toBeDefined()
    expect(Object.keys(parsed.categories.hierarchy).length).toBe(2)
  })

  it('should include currency in all relevant prompts', () => {
    const input = {
      user: {
        currency: 'EUR',
        timezone: 'Europe/Paris',
      },
      categories: [],
      statistics: {
        transactions: 0,
        budgets: 0,
        goals: 0,
        accounts: 0,
        recurringTransactions: 0,
        categories: 0,
      },
      dateRange: null,
    }

    const result = generateAIContext(input)
    const parsed = JSON.parse(result)

    expect(parsed.aiPrompts.spendingAnalysis).toContain('EUR')
    expect(parsed.aiPrompts.budgetReview).toContain('EUR')
    expect(parsed.aiPrompts.goalProgress).toContain('EUR')
    expect(parsed.aiPrompts.recurringOptimization).toContain('EUR')
    expect(parsed.aiPrompts.financialHealth).toContain('EUR')
    expect(parsed.fieldDescriptions.transaction.amount).toContain('EUR')
  })
})
