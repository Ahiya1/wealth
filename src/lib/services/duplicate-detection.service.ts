import { compareTwoStrings } from 'string-similarity'

// ============================================================================
// Constants
// ============================================================================

const SIMILARITY_THRESHOLD = 0.7 // 70% merchant name similarity (handles variations like "SuperSol" vs "SuperSol JLM")
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000 // ±1 day (handles timezone issues)

// ============================================================================
// Types
// ============================================================================

export interface DuplicateCheckParams {
  date: Date
  amount: number
  merchant: string
}

// ============================================================================
// Main Duplicate Detection Function
// ============================================================================

/**
 * Check if a transaction is a duplicate of any existing transactions
 *
 * Uses three-factor matching:
 * 1. Date match (±1 day tolerance for timezone issues)
 * 2. Amount exact match (within 0.01 for floating point precision)
 * 3. Merchant fuzzy match (80% similarity threshold)
 *
 * All three factors must match to consider a duplicate.
 *
 * @param newTransaction - Transaction to check
 * @param existingTransactions - Array of existing transactions to compare against
 * @returns true if duplicate found, false if unique transaction
 *
 * @example
 * ```typescript
 * const isDupe = isDuplicate(
 *   { date: new Date('2025-11-15'), amount: -127.5, merchant: 'SuperSol' },
 *   existingTransactions
 * )
 * ```
 */
export function isDuplicate(
  newTransaction: DuplicateCheckParams,
  existingTransactions: DuplicateCheckParams[]
): boolean {
  for (const existing of existingTransactions) {
    // Factor 1: Date match (±1 day tolerance for timezone issues)
    const dateDiff = Math.abs(newTransaction.date.getTime() - existing.date.getTime())
    const dateMatch = dateDiff <= DATE_TOLERANCE_MS

    // Factor 2: Amount exact match (within 0.01 for floating point precision)
    const amountMatch = Math.abs(newTransaction.amount - existing.amount) < 0.01

    // Factor 3: Merchant fuzzy match (80% similarity)
    const merchantMatch = isMerchantSimilar(newTransaction.merchant, existing.merchant)

    // All three factors must match
    if (dateMatch && amountMatch && merchantMatch) {
      return true // DUPLICATE FOUND
    }
  }

  return false // UNIQUE TRANSACTION
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if two merchant names are similar enough to be considered the same
 *
 * Uses fuzzy matching with Dice coefficient algorithm (70% threshold)
 *
 * @param merchant1 - First merchant name
 * @param merchant2 - Second merchant name
 * @returns true if merchants are similar (≥70% similarity)
 *
 * @example
 * ```typescript
 * isMerchantSimilar('SuperSol Jerusalem', 'SuperSol JLM') // true (similar)
 * isMerchantSimilar('Starbucks', 'Dominos') // false (different)
 * ```
 */
export function isMerchantSimilar(merchant1: string, merchant2: string): boolean {
  const normalized1 = normalizeMerchant(merchant1)
  const normalized2 = normalizeMerchant(merchant2)

  // Exact match after normalization
  if (normalized1 === normalized2) return true

  // Fuzzy match (Dice coefficient similarity)
  const similarity = compareTwoStrings(normalized1, normalized2)
  return similarity >= SIMILARITY_THRESHOLD
}

/**
 * Normalize merchant name for comparison
 *
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces to single space
 *
 * @param name - Raw merchant name
 * @returns Normalized merchant name
 */
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}
