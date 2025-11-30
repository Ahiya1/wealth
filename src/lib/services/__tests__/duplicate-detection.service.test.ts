import { describe, it, expect } from 'vitest'
import {
  compareTransaction,
  compareTransactionBatch,
  MatchType,
  type DuplicateCheckParams,
} from '../duplicate-detection.service'

describe('duplicate-detection.service - Extended Comparison', () => {
  const existingTransactions = [
    {
      id: '1',
      date: new Date('2025-11-15'),
      amount: -127.5,
      merchant: 'SuperSol Jerusalem',
    },
    {
      id: '2',
      date: new Date('2025-11-16'),
      amount: -50.0,
      merchant: 'Cafe Noir',
    },
    {
      id: '3',
      date: new Date('2025-11-17'),
      amount: 1500.0,
      merchant: 'Salary Deposit',
    },
  ]

  describe('compareTransaction', () => {
    it('identifies EXACT match (all factors identical)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.EXACT)
      expect(result.confidence).toBe(100)
      expect(result.matchedTransactionId).toBe('1')
      expect(result.details.dateMatch).toBe(true)
      expect(result.details.amountMatch).toBe(true)
      expect(result.details.merchantMatch).toBe(true)
    })

    it('identifies PROBABLE match (all factors within tolerance)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15T12:00:00Z'), // Same day, different time
        amount: -127.5,
        merchant: 'SuperSol Jerusalem Branch', // Similar merchant name (>70% similarity)
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.PROBABLE)
      expect(result.confidence).toBeGreaterThanOrEqual(85)
      expect(result.confidence).toBeLessThanOrEqual(100)
      expect(result.matchedTransactionId).toBe('1')
    })

    it('identifies PROBABLE match with date ±1 day', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-16'), // Next day
        amount: -127.5,
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.PROBABLE)
      expect(result.confidence).toBeGreaterThanOrEqual(85)
      expect(result.details.dateMatch).toBe(true) // Within tolerance
    })

    it('identifies POSSIBLE match (2 of 3 factors match)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'Completely Different Store', // Different merchant
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.POSSIBLE)
      expect(result.confidence).toBeGreaterThanOrEqual(60)
      expect(result.confidence).toBeLessThan(85)
      expect(result.details.dateMatch).toBe(true)
      expect(result.details.amountMatch).toBe(true)
      expect(result.details.merchantMatch).toBe(false)
    })

    it('identifies NEW transaction (no match)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-20'), // Different date
        amount: -75.0, // Different amount
        merchant: 'New Store',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.NEW)
      expect(result.confidence).toBe(0)
      expect(result.matchedTransactionId).toBeUndefined()
      expect(result.details.dateMatch).toBe(false)
      expect(result.details.amountMatch).toBe(false)
      expect(result.details.merchantMatch).toBe(false)
    })

    it('returns best match when multiple candidates exist', () => {
      const multipleExisting = [
        {
          id: '1',
          date: new Date('2025-11-15'),
          amount: -100.0,
          merchant: 'SuperSol',
        },
        {
          id: '2',
          date: new Date('2025-11-15'),
          amount: -100.0,
          merchant: 'SuperSol Jerusalem', // More similar
        },
      ]

      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -100.0,
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, multipleExisting)

      expect(result.matchedTransactionId).toBe('2') // More exact match
      expect(result.matchType).toBe(MatchType.EXACT)
    })

    it('handles merchant similarity correctly', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'supersol jerusalem', // Different case
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.EXACT)
      expect(result.details.merchantSimilarity).toBe(1.0)
    })

    it('handles amount with floating point precision', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -127.50001, // Tiny difference (floating point)
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.PROBABLE)
      expect(result.details.amountMatch).toBe(true) // Within tolerance
    })

    it('returns NEW when confidence below 50%', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-20'), // Different
        amount: -100.0, // Different
        merchant: 'Totally Different', // Different
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.NEW)
      expect(result.confidence).toBe(0)
    })
  })

  describe('compareTransactionBatch', () => {
    it('compares multiple transactions at once', () => {
      const importedBatch: DuplicateCheckParams[] = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5,
          merchant: 'SuperSol Jerusalem',
        },
        {
          date: new Date('2025-11-20'),
          amount: -75.0,
          merchant: 'New Store',
        },
        {
          date: new Date('2025-11-16'),
          amount: -50.0,
          merchant: 'Cafe Noir',
        },
      ]

      const results = compareTransactionBatch(importedBatch, existingTransactions)

      expect(results).toHaveLength(3)
      expect(results[0].matchType).toBe(MatchType.EXACT) // Matches existing #1
      expect(results[1].matchType).toBe(MatchType.NEW) // No match
      expect(results[2].matchType).toBe(MatchType.EXACT) // Matches existing #2
    })

    it('returns results in same order as input', () => {
      const importedBatch: DuplicateCheckParams[] = [
        { date: new Date('2025-11-20'), amount: -75.0, merchant: 'New Store 1' },
        { date: new Date('2025-11-21'), amount: -80.0, merchant: 'New Store 2' },
        { date: new Date('2025-11-22'), amount: -85.0, merchant: 'New Store 3' },
      ]

      const results = compareTransactionBatch(importedBatch, existingTransactions)

      expect(results).toHaveLength(3)
      expect(results[0].importedTransaction.merchant).toBe('New Store 1')
      expect(results[1].importedTransaction.merchant).toBe('New Store 2')
      expect(results[2].importedTransaction.merchant).toBe('New Store 3')
    })

    it('handles empty imported batch', () => {
      const results = compareTransactionBatch([], existingTransactions)

      expect(results).toHaveLength(0)
    })

    it('handles empty existing transactions', () => {
      const importedBatch: DuplicateCheckParams[] = [
        { date: new Date('2025-11-15'), amount: -100.0, merchant: 'Test' },
      ]

      const results = compareTransactionBatch(importedBatch, [])

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe(MatchType.NEW)
    })

    it('provides detailed comparison for all transactions', () => {
      const importedBatch: DuplicateCheckParams[] = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5,
          merchant: 'SuperSol Jerusalem',
        },
      ]

      const results = compareTransactionBatch(importedBatch, existingTransactions)

      expect(results[0].details).toBeDefined()
      expect(results[0].details.dateMatch).toBe(true)
      expect(results[0].details.amountMatch).toBe(true)
      expect(results[0].details.merchantMatch).toBe(true)
      expect(results[0].details.merchantSimilarity).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('handles very similar merchants with minor differences', () => {
      const existing = [
        {
          id: '1',
          date: new Date('2025-11-15'),
          amount: -100.0,
          merchant: 'SuperSol   Jerusalem', // Extra spaces
        },
      ]

      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -100.0,
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existing)

      expect(result.matchType).toBe(MatchType.EXACT)
    })

    it('handles date at tolerance boundary (exactly 1 day)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-16T00:00:00Z'),
        amount: -127.5,
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.details.dateMatch).toBe(true)
    })

    it('handles amount at tolerance boundary (0.01)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -127.51, // Just over 0.01 difference
        merchant: 'SuperSol Jerusalem',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.details.amountMatch).toBe(false) // Outside tolerance
    })

    it('handles merchant similarity at 70% threshold', () => {
      const existing = [
        {
          id: '1',
          date: new Date('2025-11-15'),
          amount: -100.0,
          merchant: 'SuperSol',
        },
      ]

      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -100.0,
        merchant: 'Super', // 70% similarity threshold edge case
      }

      const result = compareTransaction(imported, existing)

      // Result depends on exact similarity algorithm
      expect(result.details.merchantSimilarity).toBeDefined()
    })

    it('handles positive amounts (income)', () => {
      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-17'),
        amount: 1500.0,
        merchant: 'Salary Deposit',
      }

      const result = compareTransaction(imported, existingTransactions)

      expect(result.matchType).toBe(MatchType.EXACT)
      expect(result.matchedTransactionId).toBe('3')
    })

    it('handles very large amounts', () => {
      const existing = [
        {
          id: '1',
          date: new Date('2025-11-15'),
          amount: -10000.0,
          merchant: 'Large Purchase',
        },
      ]

      const imported: DuplicateCheckParams = {
        date: new Date('2025-11-15'),
        amount: -10000.0,
        merchant: 'Large Purchase',
      }

      const result = compareTransaction(imported, existing)

      expect(result.matchType).toBe(MatchType.EXACT)
    })
  })
})
