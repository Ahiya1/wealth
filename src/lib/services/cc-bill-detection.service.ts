// src/lib/services/cc-bill-detection.service.ts

// ============================================================================
// Constants
// ============================================================================

/**
 * Credit card company payee patterns (Hebrew and English)
 * Matches common Israeli credit card companies in both languages
 */
const CC_PAYEE_PATTERNS = [
  // VISA CAL
  /visa\s*cal/i,
  /ויזה\s*כאל/,

  // ISRACARD
  /isracard/i,
  /ישראכרט/,

  // LEUMI CARD
  /leumi\s*card/i,
  /לאומי\s*קארד/,

  // MAX (MAX IT)
  /max(\s*it)?/i,
  /מקס/,

  // DINERS
  /diners/i,
  /דיינרס/,

  // AMERICAN EXPRESS / AMEX
  /american\s*express/i,
  /amex/i,
]

/**
 * Minimum amount threshold for CC bills (in NIS)
 * Filters out small refunds/adjustments that aren't actual bill payments
 */
const MIN_CC_BILL_AMOUNT = 500

// ============================================================================
// Types
// ============================================================================

export interface CreditCardBillCheckParams {
  payee: string
  amount: number
}

export interface DetectionResult {
  ccBills: CreditCardBillCheckParams[]
  regular: CreditCardBillCheckParams[]
}

// ============================================================================
// Main Detection Functions
// ============================================================================

/**
 * Check if a single transaction is a credit card bill payment
 *
 * A transaction is considered a CC bill if:
 * 1. Payee matches a known credit card company pattern
 * 2. Amount is negative (expense/payment)
 * 3. Absolute amount exceeds minimum threshold (filters out small refunds)
 *
 * @param tx - Transaction with payee and amount
 * @returns true if transaction is a credit card bill payment
 *
 * @example
 * ```typescript
 * isCreditCardBill({ payee: 'VISA CAL', amount: -1500 }) // true
 * isCreditCardBill({ payee: 'VISA CAL', amount: -200 })  // false (too small)
 * isCreditCardBill({ payee: 'Starbucks', amount: -50 })  // false (not CC company)
 * ```
 */
export function isCreditCardBill(tx: CreditCardBillCheckParams): boolean {
  // Check if payee matches any CC pattern
  const matchesPattern = CC_PAYEE_PATTERNS.some((pattern) => pattern.test(tx.payee))

  if (!matchesPattern) {
    return false
  }

  // Check if amount is negative (expense) and exceeds threshold
  // We use absolute value because CC bills are typically negative amounts
  const isExpense = tx.amount < 0
  const exceedsThreshold = Math.abs(tx.amount) > MIN_CC_BILL_AMOUNT

  return isExpense && exceedsThreshold
}

/**
 * Detect and separate credit card bills from regular transactions
 *
 * Processes a batch of transactions and returns two separate arrays:
 * - ccBills: Transactions identified as credit card bill payments
 * - regular: All other transactions
 *
 * This allows the system to exclude CC bills from import (preventing
 * double-counting since the individual purchases are already tracked).
 *
 * @param transactions - Array of transactions to analyze
 * @returns Object with separated ccBills and regular transactions
 *
 * @example
 * ```typescript
 * const result = detectCreditCardBills([
 *   { payee: 'VISA CAL', amount: -1500, date: new Date() },
 *   { payee: 'Starbucks', amount: -25, date: new Date() },
 *   { payee: 'ישראכרט', amount: -2000, date: new Date() },
 * ])
 * // result.ccBills: [VISA CAL, ישראכרט]
 * // result.regular: [Starbucks]
 * ```
 */
export function detectCreditCardBills<T extends CreditCardBillCheckParams>(
  transactions: T[]
): { ccBills: T[]; regular: T[] } {
  const ccBills: T[] = []
  const regular: T[] = []

  for (const tx of transactions) {
    if (isCreditCardBill(tx)) {
      ccBills.push(tx)
    } else {
      regular.push(tx)
    }
  }

  return { ccBills, regular }
}
