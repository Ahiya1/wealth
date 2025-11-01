// Tests for categorization service - Builder-5C

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import {
  categorizeTransactions,
  categorizeSingleTransaction,
  getCategorizationStats,
} from '../categorize.service'

// Create a mock function that we can control in tests
const mockClaudeCreate = vi.fn()

// Mock Anthropic SDK with a factory that references the mock
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: (...args: any[]) => mockClaudeCreate(...args),
      },
    })),
  }
})

// Mock Prisma client
const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>

describe('categorizeTransactions', () => {
  beforeEach(() => {
    mockReset(prismaMock)
    // Reset and set default Claude API response
    mockClaudeCreate.mockReset()
    mockClaudeCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '[{"number": 1, "category": "Groceries"}, {"number": 2, "category": "Gas"}]',
        },
      ],
    })
  })

  it('should return cached results when merchant is in cache', async () => {
    const userId = 'user-123'
    const transactions = [
      { id: 'txn-1', payee: 'Whole Foods', amount: 125.43 },
    ]

    // Mock available categories
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Groceries', userId: null, isDefault: true, isActive: true } as any,
      { id: 'cat-2', name: 'Miscellaneous', userId: null, isDefault: true, isActive: true } as any,
    ])

    // Mock cache hit
    prismaMock.merchantCategoryCache.findUnique.mockResolvedValue({
      id: 'cache-1',
      merchant: 'whole foods',
      categoryId: 'cat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const results = await categorizeTransactions(userId, transactions, prismaMock)

    expect(results).toHaveLength(1)
    expect(results[0]).toBeDefined()
    expect(results[0]!.categoryName).toBe('Groceries')
    expect(results[0]!.categoryId).toBe('cat-1')
    expect(results[0]!.confidence).toBe('high')
  })

  it('should call Claude API for uncached transactions', async () => {
    const userId = 'user-123'
    const transactions = [
      { id: 'txn-1', payee: 'New Merchant', amount: 50.0 },
    ]

    // Mock available categories
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Groceries', userId: null, isDefault: true, isActive: true } as any,
      { id: 'cat-2', name: 'Miscellaneous', userId: null, isDefault: true, isActive: true } as any,
    ])

    // Mock cache miss
    prismaMock.merchantCategoryCache.findUnique.mockResolvedValue(null)

    // Mock cache upsert
    prismaMock.merchantCategoryCache.upsert.mockResolvedValue({} as any)

    const results = await categorizeTransactions(userId, transactions, prismaMock)

    expect(results).toHaveLength(1)
    expect(results[0]).toBeDefined()
    expect(results[0]!.categoryName).toBe('Groceries')
    expect(results[0]!.confidence).toBe('high')
    expect(prismaMock.merchantCategoryCache.upsert).toHaveBeenCalled()
  })

  it('should handle empty transaction list', async () => {
    const userId = 'user-123'
    const transactions: any[] = []

    const results = await categorizeTransactions(userId, transactions, prismaMock)

    expect(results).toHaveLength(0)
  })

  it('should batch transactions by 50', async () => {
    const userId = 'user-123'
    const transactions = Array.from({ length: 75 }, (_, i) => ({
      id: `txn-${i}`,
      payee: `Merchant ${i}`,
      amount: 10.0,
    }))

    // Mock available categories
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Miscellaneous', userId: null, isDefault: true, isActive: true } as any,
    ])

    // Mock cache misses
    prismaMock.merchantCategoryCache.findUnique.mockResolvedValue(null)
    prismaMock.merchantCategoryCache.upsert.mockResolvedValue({} as any)

    const results = await categorizeTransactions(userId, transactions, prismaMock)

    expect(results).toHaveLength(75)
  })

  it('should fallback to Miscellaneous on API error', async () => {
    const userId = 'user-123'
    const transactions = [
      { id: 'txn-1', payee: 'Test Merchant', amount: 50.0 },
    ]

    // Mock available categories
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'cat-misc', name: 'Miscellaneous', userId: null, isDefault: true, isActive: true } as any,
    ])

    // Mock cache miss
    prismaMock.merchantCategoryCache.findUnique.mockResolvedValue(null)

    // Mock Claude API to throw an error
    mockClaudeCreate.mockRejectedValueOnce(new Error('API Error'))

    const results = await categorizeTransactions(userId, transactions, prismaMock)

    expect(results).toHaveLength(1)
    expect(results[0]).toBeDefined()
    expect(results[0]!.categoryName).toBe('Miscellaneous')
    expect(results[0]!.confidence).toBe('low')
  })
})

describe('categorizeSingleTransaction', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('should categorize a single transaction', async () => {
    const userId = 'user-123'

    // Mock available categories
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Groceries', userId: null, isDefault: true, isActive: true } as any,
    ])

    // Mock cache hit
    prismaMock.merchantCategoryCache.findUnique.mockResolvedValue({
      id: 'cache-1',
      merchant: 'whole foods',
      categoryId: 'cat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await categorizeSingleTransaction(userId, 'Whole Foods', 125.43, prismaMock)

    expect(result.categoryName).toBe('Groceries')
    expect(result.categoryId).toBe('cat-1')
  })
})

describe('getCategorizationStats', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('should return categorization statistics', async () => {
    const userId = 'user-123'

    prismaMock.merchantCategoryCache.count.mockResolvedValue(50)
    prismaMock.transaction.count.mockResolvedValue(100)

    const stats = await getCategorizationStats(userId, prismaMock)

    expect(stats.totalCached).toBe(50)
    expect(stats.totalTransactions).toBe(100)
    expect(stats.cacheHitRate).toBe(50)
  })

  it('should handle zero transactions gracefully', async () => {
    const userId = 'user-123'

    prismaMock.merchantCategoryCache.count.mockResolvedValue(0)
    prismaMock.transaction.count.mockResolvedValue(0)

    const stats = await getCategorizationStats(userId, prismaMock)

    expect(stats.totalCached).toBe(0)
    expect(stats.totalTransactions).toBe(0)
    expect(stats.cacheHitRate).toBe(0)
  })
})
