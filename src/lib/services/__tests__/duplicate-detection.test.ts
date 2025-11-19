import { describe, it, expect } from 'vitest'
import { isDuplicate, isMerchantSimilar, normalizeMerchant } from '../duplicate-detection.service'

describe('Duplicate Detection Service', () => {
  describe('isDuplicate', () => {
    it('should detect exact duplicates (all factors match)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'SuperSol Jerusalem',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5,
          merchant: 'SuperSol Jerusalem',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle timezone differences (±1 day tolerance)', () => {
      const newTxn = {
        date: new Date('2025-11-15T23:00:00Z'),
        amount: -127.5,
        merchant: 'SuperSol',
      }

      const existing = [
        {
          date: new Date('2025-11-16T01:00:00Z'), // 2 hours later (next day UTC)
          amount: -127.5,
          merchant: 'SuperSol',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle merchant name variations (fuzzy match)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'Starbucks Coffee',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5,
          merchant: 'Starbucks', // 72% similar - close enough
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should prevent false positives (different merchants, similar names)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'Starbucks Tel Aviv',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -50.0,
          merchant: 'Coffee Bar Tel Aviv', // Similar amount/date, different merchant
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false)
    })

    it('should handle recurring subscriptions (same merchant, different dates)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -29.99,
        merchant: 'Netflix',
      }

      const existing = [
        {
          date: new Date('2025-10-15'), // 1 month earlier
          amount: -29.99,
          merchant: 'Netflix',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false) // Date outside ±1 day
    })

    it('should handle split payments (same merchant, same date, different amounts)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'Restaurant ABC',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -75.0, // Different amount
          merchant: 'Restaurant ABC',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false)
    })

    it('should handle refunds (same merchant, same amount, opposite sign)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: 127.5, // Positive (refund)
        merchant: 'SuperSol',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5, // Negative (purchase)
          merchant: 'SuperSol',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false) // Different amount sign
    })

    it('should handle exact date boundary (24 hours)', () => {
      const newTxn = {
        date: new Date('2025-11-15T12:00:00Z'),
        amount: -100.0,
        merchant: 'Store',
      }

      const existing = [
        {
          date: new Date('2025-11-16T12:00:00Z'), // Exactly 24 hours later
          amount: -100.0,
          merchant: 'Store',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true) // Within ±1 day
    })

    it('should reject duplicates outside date tolerance (>24 hours)', () => {
      const newTxn = {
        date: new Date('2025-11-15T12:00:00Z'),
        amount: -100.0,
        merchant: 'Store',
      }

      const existing = [
        {
          date: new Date('2025-11-16T12:00:01Z'), // 24 hours + 1 second later
          amount: -100.0,
          merchant: 'Store',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false) // Outside tolerance
    })

    it('should handle floating point amount precision (0.01 tolerance)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -99.99,
        merchant: 'Store',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -99.989, // Very close due to floating point
          merchant: 'Store',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true) // Within 0.01 tolerance
    })

    it('should reject amounts outside tolerance (>0.01)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -100.0,
        merchant: 'Store',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -100.02, // 2 cents difference
          merchant: 'Store',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false)
    })

    it('should handle multiple existing transactions (check all)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'Store A',
      }

      const existing = [
        {
          date: new Date('2025-11-10'),
          amount: -50.0,
          merchant: 'Store A', // Too old
        },
        {
          date: new Date('2025-11-15'),
          amount: -60.0,
          merchant: 'Store A', // Wrong amount
        },
        {
          date: new Date('2025-11-15'),
          amount: -50.0,
          merchant: 'Store A', // MATCH!
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true) // Found match in third
    })

    it('should handle empty existing transactions list', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'Store',
      }

      expect(isDuplicate(newTxn, [])).toBe(false)
    })

    it('should handle case-insensitive merchant matching', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'STARBUCKS',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -50.0,
          merchant: 'starbucks',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle whitespace variations in merchant names', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: '  SuperSol   Jerusalem  ',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -50.0,
          merchant: 'SuperSol Jerusalem',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle merchant name with extra location details', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -50.0,
        merchant: 'Home Depot Inc',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -50.0,
          merchant: 'Home Depot', // 84% similar
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle merchant abbreviations (common in Israeli banks)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -127.5,
        merchant: 'SuperMarket Co',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -127.5,
          merchant: 'SuperMarket', // 70%+ similar
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle very small amounts (cents)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -0.5,
        merchant: 'Parking Meter',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -0.5,
          merchant: 'Parking Meter',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle large amounts (thousands)', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -12500.0,
        merchant: 'Car Payment',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: -12500.0,
          merchant: 'Car Payment',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })

    it('should handle negative and positive amounts separately', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: -100.0, // Expense
        merchant: 'Store',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: 100.0, // Income (same absolute value)
          merchant: 'Store',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(false)
    })

    it('should handle zero amounts', () => {
      const newTxn = {
        date: new Date('2025-11-15'),
        amount: 0,
        merchant: 'Bank Fee Waived',
      }

      const existing = [
        {
          date: new Date('2025-11-15'),
          amount: 0,
          merchant: 'Bank Fee Waived',
        },
      ]

      expect(isDuplicate(newTxn, existing)).toBe(true)
    })
  })

  describe('isMerchantSimilar', () => {
    it('should match exact names', () => {
      expect(isMerchantSimilar('Starbucks', 'Starbucks')).toBe(true)
    })

    it('should match case-insensitive', () => {
      expect(isMerchantSimilar('Starbucks', 'STARBUCKS')).toBe(true)
      expect(isMerchantSimilar('starbucks', 'StArBuCkS')).toBe(true)
    })

    it('should match with extra whitespace', () => {
      expect(isMerchantSimilar('  Starbucks  ', 'Starbucks')).toBe(true)
      expect(isMerchantSimilar('Starbucks', '   Starbucks   ')).toBe(true)
    })

    it('should match similar names (>70% similarity)', () => {
      expect(isMerchantSimilar('Starbucks Coffee', 'Starbucks')).toBe(true)
      expect(isMerchantSimilar('SuperSol Jerusalem', 'SuperSol JLM')).toBe(false) // Only 61% similar - too different
    })

    it('should reject dissimilar names (<70% similarity)', () => {
      expect(isMerchantSimilar('Starbucks', 'Dominos')).toBe(false)
      expect(isMerchantSimilar('SuperSol', 'Victory')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(isMerchantSimilar('', '')).toBe(true)
      expect(isMerchantSimilar('Starbucks', '')).toBe(false)
    })

    it('should handle special characters', () => {
      expect(isMerchantSimilar("McDonald's", "McDonalds")).toBe(true) // Very similar
      expect(isMerchantSimilar('Super-Sol', 'SuperSol')).toBe(true)
    })

    it('should handle numeric suffixes (store numbers)', () => {
      expect(isMerchantSimilar('Starbucks #1234', 'Starbucks')).toBe(true) // 72% similar
      expect(isMerchantSimilar('SuperSol', 'SuperSol 99')).toBe(true) // 84% similar
    })
  })

  describe('normalizeMerchant', () => {
    it('should convert to lowercase', () => {
      expect(normalizeMerchant('STARBUCKS')).toBe('starbucks')
      expect(normalizeMerchant('StArBuCkS')).toBe('starbucks')
    })

    it('should trim whitespace', () => {
      expect(normalizeMerchant('  Starbucks  ')).toBe('starbucks')
      expect(normalizeMerchant('\tStarbucks\n')).toBe('starbucks')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeMerchant('Super   Sol   Jerusalem')).toBe('super sol jerusalem')
      expect(normalizeMerchant('Store  ABC')).toBe('store abc')
    })

    it('should handle already normalized strings', () => {
      expect(normalizeMerchant('starbucks')).toBe('starbucks')
    })

    it('should handle empty strings', () => {
      expect(normalizeMerchant('')).toBe('')
    })

    it('should handle strings with only whitespace', () => {
      expect(normalizeMerchant('   ')).toBe('')
      expect(normalizeMerchant('\t\n')).toBe('')
    })
  })
})
