import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
  generateRecurringTransactionCSV,
  generateCategoryCSV,
  type RecurringTransactionExport,
  type CategoryExport,
} from '../csvExport'

describe('csvExport - Recurring Transactions', () => {
  it('should generate CSV for recurring transactions with correct formatting', () => {
    const recurringTransactions: RecurringTransactionExport[] = [
      {
        payee: 'Netflix',
        amount: new Decimal('15.99'),
        category: { name: 'Entertainment' },
        account: { name: 'Checking' },
        frequency: 'MONTHLY',
        interval: 1,
        nextScheduledDate: new Date('2025-12-01'),
        status: 'ACTIVE',
      },
      {
        payee: 'Gym Membership',
        amount: 49.99,
        category: { name: 'Health & Fitness' },
        account: { name: 'Credit Card' },
        frequency: 'MONTHLY',
        interval: 1,
        nextScheduledDate: new Date('2025-11-15'),
        status: 'ACTIVE',
      },
    ]

    const csv = generateRecurringTransactionCSV(recurringTransactions)

    // Check UTF-8 BOM
    expect(csv.charCodeAt(0)).toBe(0xFEFF)

    // Check headers
    expect(csv).toContain('Payee,Amount,Category,Account,Frequency,Next Date,Status')

    // Check data rows
    expect(csv).toContain('"Netflix"')
    expect(csv).toContain('15.99')
    expect(csv).toContain('"Entertainment"')
    expect(csv).toContain('"Checking"')
    expect(csv).toContain('"Every month"')
    expect(csv).toContain('2025-12-01')
    expect(csv).toContain('ACTIVE')

    expect(csv).toContain('"Gym Membership"')
    expect(csv).toContain('49.99')
    expect(csv).toContain('"Health & Fitness"')
  })

  it('should handle biweekly frequency correctly', () => {
    const recurringTransactions: RecurringTransactionExport[] = [
      {
        payee: 'Paycheck',
        amount: 2000,
        category: { name: 'Income' },
        account: { name: 'Checking' },
        frequency: 'BIWEEKLY',
        interval: 1,
        nextScheduledDate: new Date('2025-11-20'),
        status: 'ACTIVE',
      },
    ]

    const csv = generateRecurringTransactionCSV(recurringTransactions)

    expect(csv).toContain('"Every 2 weeks"')
  })

  it('should handle custom intervals correctly', () => {
    const recurringTransactions: RecurringTransactionExport[] = [
      {
        payee: 'Quarterly Tax',
        amount: 500,
        category: { name: 'Taxes' },
        account: { name: 'Savings' },
        frequency: 'MONTHLY',
        interval: 3,
        nextScheduledDate: new Date('2025-12-01'),
        status: 'ACTIVE',
      },
    ]

    const csv = generateRecurringTransactionCSV(recurringTransactions)

    expect(csv).toContain('"Every 3 months"')
  })

  it('should escape quotes in payee names', () => {
    const recurringTransactions: RecurringTransactionExport[] = [
      {
        payee: 'Mom\'s "Favorite" Store',
        amount: 100,
        category: { name: 'Shopping' },
        account: { name: 'Checking' },
        frequency: 'MONTHLY',
        interval: 1,
        nextScheduledDate: new Date('2025-11-15'),
        status: 'ACTIVE',
      },
    ]

    const csv = generateRecurringTransactionCSV(recurringTransactions)

    // Double quotes should be escaped
    expect(csv).toContain('Mom\'s ""Favorite"" Store')
  })

  it('should handle empty array', () => {
    const csv = generateRecurringTransactionCSV([])

    // Should have headers but no data rows
    expect(csv).toContain('Payee,Amount,Category,Account,Frequency,Next Date,Status')
    expect(csv.split('\n').length).toBe(1) // Only header row
  })
})

describe('csvExport - Categories', () => {
  it('should generate CSV for categories with correct formatting', () => {
    const categories: CategoryExport[] = [
      {
        name: 'Food & Dining',
        icon: 'utensils',
        color: '#FF6B6B',
        parentId: null,
        parent: null,
        isDefault: true,
      },
      {
        name: 'Restaurants',
        icon: 'store',
        color: '#FF8787',
        parentId: 'parent-id',
        parent: { name: 'Food & Dining' },
        isDefault: false,
      },
    ]

    const csv = generateCategoryCSV(categories)

    // Check UTF-8 BOM
    expect(csv.charCodeAt(0)).toBe(0xFEFF)

    // Check headers
    expect(csv).toContain('Name,Parent,Icon,Color,Type')

    // Check data rows
    expect(csv).toContain('"Food & Dining"')
    expect(csv).toContain('None') // No parent
    expect(csv).toContain('utensils')
    expect(csv).toContain('#FF6B6B')
    expect(csv).toContain('Default')

    expect(csv).toContain('"Restaurants"')
    expect(csv).toContain('"Food & Dining"') // Parent name
    expect(csv).toContain('store')
    expect(csv).toContain('#FF8787')
    expect(csv).toContain('Custom')
  })

  it('should handle null icon and color', () => {
    const categories: CategoryExport[] = [
      {
        name: 'Other',
        icon: null,
        color: null,
        parentId: null,
        parent: null,
        isDefault: false,
      },
    ]

    const csv = generateCategoryCSV(categories)

    expect(csv).toContain('"Other"')
    expect(csv).toContain('None,,') // Empty icon and color fields
    expect(csv).toContain('Custom')
  })

  it('should escape quotes in category names', () => {
    const categories: CategoryExport[] = [
      {
        name: 'John\'s "Special" Category',
        icon: 'tag',
        color: '#000000',
        parentId: null,
        parent: null,
        isDefault: false,
      },
    ]

    const csv = generateCategoryCSV(categories)

    // Double quotes should be escaped
    expect(csv).toContain('John\'s ""Special"" Category')
  })

  it('should handle empty array', () => {
    const csv = generateCategoryCSV([])

    // Should have headers but no data rows
    expect(csv).toContain('Name,Parent,Icon,Color,Type')
    expect(csv.split('\n').length).toBe(1) // Only header row
  })

  it('should handle parent-child relationships correctly', () => {
    const categories: CategoryExport[] = [
      {
        name: 'Parent Category',
        icon: 'folder',
        color: '#000000',
        parentId: null,
        parent: null,
        isDefault: true,
      },
      {
        name: 'Child Category',
        icon: 'file',
        color: '#111111',
        parentId: 'parent-id',
        parent: { name: 'Parent Category' },
        isDefault: false,
      },
      {
        name: 'Grandchild Category',
        icon: 'file-text',
        color: '#222222',
        parentId: 'child-id',
        parent: { name: 'Child Category' },
        isDefault: false,
      },
    ]

    const csv = generateCategoryCSV(categories)

    const lines = csv.split('\n')
    expect(lines.length).toBe(4) // Header + 3 data rows

    // Check parent relationships
    expect(csv).toContain('"Parent Category",None')
    expect(csv).toContain('"Child Category","Parent Category"')
    expect(csv).toContain('"Grandchild Category","Child Category"')
  })
})
