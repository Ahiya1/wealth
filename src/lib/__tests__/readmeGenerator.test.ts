import { describe, it, expect } from 'vitest'
import { generateReadme } from '../readmeGenerator'

describe('readmeGenerator', () => {
  it('should generate a valid README with all sections', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'NIS',
        timezone: 'Asia/Jerusalem',
      },
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
      exportedAt: new Date('2025-11-09T10:30:00Z'),
    }

    const readme = generateReadme(input)

    // Verify key sections are present
    expect(readme).toContain('# Wealth Export Package')
    expect(readme).toContain('## Export Information')
    expect(readme).toContain('## Contents')
    expect(readme).toContain('## File Formats')
    expect(readme).toContain('## Using This Data')
    expect(readme).toContain('## Data Privacy')

    // Verify user info
    expect(readme).toContain('test@example.com')
    expect(readme).toContain('NIS')
    expect(readme).toContain('Asia/Jerusalem')

    // Verify statistics
    expect(readme).toContain('150 transaction records')
    expect(readme).toContain('12 budget records')
    expect(readme).toContain('3 financial goal records')
    expect(readme).toContain('4 account records')
    expect(readme).toContain('8 recurring transaction records')
    expect(readme).toContain('15 category records')

    // Verify date range
    expect(readme).toContain('January 1, 2025')
    expect(readme).toContain('November 9, 2025')
  })

  it('should handle null date range', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      statistics: {
        transactions: 0,
        budgets: 0,
        goals: 0,
        accounts: 0,
        recurringTransactions: 0,
        categories: 0,
      },
      dateRange: null,
      exportedAt: new Date('2025-11-09T10:30:00Z'),
    }

    const readme = generateReadme(input)

    expect(readme).toContain('All time')
    expect(readme).toContain('0 transaction records')
  })

  it('should include AI analysis instructions', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'EUR',
        timezone: 'Europe/Paris',
      },
      statistics: {
        transactions: 100,
        budgets: 10,
        goals: 2,
        accounts: 3,
        recurringTransactions: 5,
        categories: 10,
      },
      dateRange: null,
      exportedAt: new Date('2025-11-09T10:30:00Z'),
    }

    const readme = generateReadme(input)

    expect(readme).toContain('AI-Powered Analysis')
    expect(readme).toContain('ai-context.json')
    expect(readme).toContain('ChatGPT or Claude')
    expect(readme).toContain('Analyze my spending patterns')
  })

  it('should include security warnings', () => {
    const input = {
      user: {
        email: 'test@example.com',
        currency: 'NIS',
        timezone: 'Asia/Jerusalem',
      },
      statistics: {
        transactions: 50,
        budgets: 5,
        goals: 1,
        accounts: 2,
        recurringTransactions: 3,
        categories: 8,
      },
      dateRange: null,
      exportedAt: new Date('2025-11-09T10:30:00Z'),
    }

    const readme = generateReadme(input)

    expect(readme).toContain('Data Privacy')
    expect(readme).toContain('sensitive financial information')
    expect(readme).toContain('Store securely')
    expect(readme).toContain('Plaid access tokens are automatically redacted')
  })
})
