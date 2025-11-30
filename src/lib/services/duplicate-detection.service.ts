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

// ============================================================================
// Extended Comparison Functionality (Iteration 22)
// ============================================================================

/**
 * Match type classification for transaction comparison
 */
export enum MatchType {
  EXACT = 'EXACT', // All 3 factors match exactly
  PROBABLE = 'PROBABLE', // All 3 factors match with tolerance
  POSSIBLE = 'POSSIBLE', // 2 out of 3 factors match
  NEW = 'NEW', // No match found
}

/**
 * Result of comparing an imported transaction with existing transactions
 */
export interface ComparisonResult {
  importedTransaction: DuplicateCheckParams
  matchType: MatchType
  confidence: number // 0-100
  matchedTransaction?: DuplicateCheckParams
  matchedTransactionId?: string
  details: {
    dateMatch: boolean
    amountMatch: boolean
    merchantMatch: boolean
    merchantSimilarity?: number
  }
}

/**
 * Compare a batch of imported transactions with existing transactions
 *
 * Efficiently compares multiple imported transactions at once,
 * returning detailed match results for each imported transaction.
 *
 * @param importedTransactions - Array of transactions to import
 * @param existingTransactions - Array of existing transactions to compare against
 * @returns Array of ComparisonResults, one per imported transaction
 *
 * @example
 * ```typescript
 * const results = compareTransactionBatch(
 *   importedTransactions,
 *   existingTransactions.map(t => ({
 *     id: t.id,
 *     date: t.date,
 *     amount: Number(t.amount),
 *     merchant: t.rawMerchantName || t.payee,
 *   }))
 * )
 * ```
 */
export function compareTransactionBatch(
  importedTransactions: DuplicateCheckParams[],
  existingTransactions: Array<DuplicateCheckParams & { id: string }>
): ComparisonResult[] {
  return importedTransactions.map((imported) =>
    compareTransaction(imported, existingTransactions)
  )
}

/**
 * Compare a single imported transaction with existing transactions
 *
 * Finds the best match among existing transactions using three-factor
 * matching (date, amount, merchant) and returns detailed comparison results.
 *
 * @param imported - Transaction to import
 * @param existingTransactions - Array of existing transactions to compare against
 * @returns ComparisonResult with best match and confidence score
 *
 * @example
 * ```typescript
 * const result = compareTransaction(
 *   { date: new Date('2025-11-15'), amount: -127.50, merchant: 'SuperSol' },
 *   existingTransactions
 * )
 * // result.matchType: EXACT | PROBABLE | POSSIBLE | NEW
 * // result.confidence: 0-100
 * ```
 */
export function compareTransaction(
  imported: DuplicateCheckParams,
  existingTransactions: Array<DuplicateCheckParams & { id: string }>
): ComparisonResult {
  let bestMatch: ComparisonResult | null = null
  let highestConfidence = 0

  for (const existing of existingTransactions) {
    const result = evaluateMatch(imported, existing)

    if (result.confidence > highestConfidence) {
      highestConfidence = result.confidence
      bestMatch = result
    }

    // Early exit on exact match
    if (result.matchType === MatchType.EXACT) {
      break
    }
  }

  if (!bestMatch || bestMatch.confidence < 50) {
    return {
      importedTransaction: imported,
      matchType: MatchType.NEW,
      confidence: 0,
      details: {
        dateMatch: false,
        amountMatch: false,
        merchantMatch: false,
      },
    }
  }

  return bestMatch
}

/**
 * Evaluate match between imported and existing transaction
 *
 * Internal helper that calculates match type and confidence score
 * based on three-factor comparison (date, amount, merchant).
 *
 * @param imported - Transaction to import
 * @param existing - Existing transaction to compare against
 * @returns ComparisonResult with match details
 */
function evaluateMatch(
  imported: DuplicateCheckParams,
  existing: DuplicateCheckParams & { id: string }
): ComparisonResult {
  const AMOUNT_TOLERANCE = 0.01

  // Factor 1: Date match
  const dateDiff = Math.abs(imported.date.getTime() - existing.date.getTime())
  const dateMatch = dateDiff <= DATE_TOLERANCE_MS
  const dateExactMatch = dateDiff === 0

  // Factor 2: Amount match
  const amountDiff = Math.abs(imported.amount - existing.amount)
  const amountMatch = amountDiff < AMOUNT_TOLERANCE
  const amountExactMatch = amountDiff === 0

  // Factor 3: Merchant match
  const merchantSimilarity = getMerchantSimilarity(
    imported.merchant,
    existing.merchant
  )
  const merchantMatch = merchantSimilarity >= SIMILARITY_THRESHOLD
  const merchantExactMatch = merchantSimilarity === 1.0

  // Determine match type and confidence
  let matchType: MatchType
  let confidence: number

  if (dateExactMatch && amountExactMatch && merchantExactMatch) {
    matchType = MatchType.EXACT
    confidence = 100
  } else if (dateMatch && amountMatch && merchantMatch) {
    matchType = MatchType.PROBABLE
    confidence = 85 + (merchantSimilarity - 0.7) * 50 // 85-100%
  } else if (
    (dateMatch && amountMatch) ||
    (dateMatch && merchantMatch) ||
    (amountMatch && merchantMatch)
  ) {
    matchType = MatchType.POSSIBLE
    confidence = 60 + merchantSimilarity * 20 // 60-80%
  } else {
    matchType = MatchType.NEW
    confidence = 0
  }

  return {
    importedTransaction: imported,
    matchType,
    confidence,
    matchedTransaction: existing,
    matchedTransactionId: existing.id,
    details: {
      dateMatch,
      amountMatch,
      merchantMatch,
      merchantSimilarity,
    },
  }
}

/**
 * Calculate merchant name similarity
 *
 * Wrapper around string similarity comparison with normalization
 *
 * @param merchant1 - First merchant name
 * @param merchant2 - Second merchant name
 * @returns Similarity score (0-1)
 */
function getMerchantSimilarity(merchant1: string, merchant2: string): number {
  const normalized1 = normalizeMerchant(merchant1)
  const normalized2 = normalizeMerchant(merchant2)

  if (normalized1 === normalized2) return 1.0

  return compareTwoStrings(normalized1, normalized2)
}
