import { describe, it, expect } from 'vitest'
import { generateSummary } from '../summaryGenerator'

describe('summaryGenerator', () => {
  it('should generate a valid summary JSON string', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'NIS',
        timezone: 'America/New_York',
      },
      recordCounts: {
        transactions: 100,
        budgets: 5,
        goals: 3,
        accounts: 2,
        recurringTransactions: 8,
        categories: 15,
      },
      dateRange: {
        earliest: new Date('2024-01-01'),
        latest: new Date('2024-12-31'),
      },
      fileSize: 1024000,
    }

    const result = generateSummary(input)

    // Verify it's valid JSON
    const parsed = JSON.parse(result)

    // Check structure
    expect(parsed).toHaveProperty('exportVersion', '1.0')
    expect(parsed).toHaveProperty('exportedAt')
    expect(parsed).toHaveProperty('user')
    expect(parsed).toHaveProperty('recordCounts')
    expect(parsed).toHaveProperty('dateRange')
    expect(parsed).toHaveProperty('fileSize', 1024000)
    expect(parsed).toHaveProperty('format', 'ZIP')

    // Check user data
    expect(parsed.user).toEqual({
      email: 'test@example.com',
      currency: 'NIS',
      timezone: 'America/New_York',
    })

    // Check record counts
    expect(parsed.recordCounts).toEqual(input.recordCounts)

    // Check date range formatting
    expect(parsed.dateRange).toEqual({
      earliest: '2024-01-01',
      latest: '2024-12-31',
    })
  })

  it('should handle null date range', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'NIS',
        timezone: 'America/New_York',
      },
      recordCounts: {
        transactions: 0,
        budgets: 0,
        goals: 0,
        accounts: 0,
        recurringTransactions: 0,
        categories: 0,
      },
      dateRange: null,
      fileSize: 0,
    }

    const result = generateSummary(input)
    const parsed = JSON.parse(result)

    expect(parsed.dateRange).toBeNull()
  })

  it('should generate ISO 8601 timestamp for exportedAt', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'NIS',
        timezone: 'America/New_York',
      },
      recordCounts: {
        transactions: 10,
        budgets: 1,
        goals: 1,
        accounts: 1,
        recurringTransactions: 0,
        categories: 5,
      },
      dateRange: null,
      fileSize: 512000,
    }

    const result = generateSummary(input)
    const parsed = JSON.parse(result)

    // Check ISO 8601 format
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
