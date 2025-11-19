import { CompanyTypes, createScraper } from 'israeli-bank-scrapers'
import { decryptBankCredentials } from '@/lib/encryption'
import type { BankProvider } from '@prisma/client'

// ============================================================================
// Custom Error Class
// ============================================================================

export class BankScraperError extends Error {
  constructor(
    public errorType:
      | 'INVALID_CREDENTIALS'
      | 'OTP_REQUIRED'
      | 'OTP_TIMEOUT'
      | 'NETWORK_ERROR'
      | 'SCRAPER_BROKEN'
      | 'BANK_MAINTENANCE'
      | 'ACCOUNT_BLOCKED'
      | 'PASSWORD_EXPIRED',
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'BankScraperError'
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ScrapeOptions {
  bank: BankProvider
  encryptedCredentials: string
  startDate?: Date
  endDate?: Date
  otp?: string // Optional OTP for 2FA retry
}

export interface ScrapeResult {
  success: boolean
  transactions: ImportedTransaction[]
  accountNumber?: string
  balance?: number
}

export interface ImportedTransaction {
  date: Date
  processedDate: Date
  amount: number
  description: string
  memo?: string
  status: 'completed' | 'pending'
}

// ============================================================================
// Main Scraper Function
// ============================================================================

/**
 * Scrapes transactions from Israeli bank or credit card
 *
 * @param options - Bank, credentials, date range, optional OTP
 * @returns ScrapeResult with transactions or throws BankScraperError
 *
 * @throws {BankScraperError} For all scraper failures (categorized by errorType)
 *
 * @example
 * ```typescript
 * const result = await scrapeBank({
 *   bank: 'FIBI',
 *   encryptedCredentials: connection.encryptedCredentials,
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 * })
 *
 * console.log(`Imported ${result.transactions.length} transactions`)
 * ```
 */
export async function scrapeBank(options: ScrapeOptions): Promise<ScrapeResult> {
  // 1. Decrypt credentials (in-memory only)
  const credentials = decryptBankCredentials(options.encryptedCredentials)

  // Sanitized logging (only first 3 chars of userId)
  console.log(`[scrapeBank] Bank: ${options.bank}, User: ${credentials.userId.substring(0, 3)}***`)

  // 2. Map bank to israeli-bank-scrapers CompanyTypes
  const companyId = mapBankToCompanyType(options.bank)

  // 3. Configure scraper
  const scraper = createScraper({
    companyId,
    startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
    combineInstallments: false, // Keep installments separate
    showBrowser: false, // Headless mode (production)
  })

  // 4. Prepare credentials
  const scrapeCredentials: { username: string; password: string; otp?: string } = {
    username: credentials.userId,
    password: credentials.password,
  }

  // Add OTP if provided
  if (options.otp) {
    scrapeCredentials.otp = options.otp
  }

  // 5. Execute scrape with timeout
  let result
  try {
    console.log(`[scrapeBank] Starting scrape...`)
    result = await scraper.scrape(scrapeCredentials)
    console.log(`[scrapeBank] Scrape completed, success: ${result.success}`)
  } catch (error) {
    console.error(`[scrapeBank] Network error:`, error)
    throw new BankScraperError(
      'NETWORK_ERROR',
      'Failed to connect to bank. Please check your internet connection and try again.',
      error as Error
    )
  }

  // 6. Handle scraper errors
  if (!result.success) {
    throw mapScraperError(result.errorType || 'UNKNOWN_ERROR', result.errorMessage || 'Unknown error')
  }

  // 7. Map transactions to our format
  const transactions: ImportedTransaction[] = []

  for (const account of result.accounts || []) {
    for (const txn of account.txns || []) {
      // Skip pending transactions (Iteration 18 scope)
      if (txn.status === 'pending') {
        console.log(`[scrapeBank] Skipping pending transaction: ${txn.description}`)
        continue
      }

      transactions.push({
        date: new Date(txn.date),
        processedDate: new Date(txn.processedDate),
        amount: txn.chargedAmount,
        description: txn.description,
        memo: txn.memo || undefined,
        status: txn.status as 'completed' | 'pending',
      })
    }
  }

  console.log(`[scrapeBank] Mapped ${transactions.length} completed transactions`)

  return {
    success: true,
    transactions,
    accountNumber: result.accounts?.[0]?.accountNumber,
    balance: result.accounts?.[0]?.balance,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map BankProvider enum to israeli-bank-scrapers CompanyTypes
 */
function mapBankToCompanyType(bank: BankProvider): CompanyTypes {
  switch (bank) {
    case 'FIBI':
      return CompanyTypes.otsarHahayal // FIBI uses this scraper
    case 'VISA_CAL':
      return CompanyTypes.visaCal
    default:
      throw new Error(`Unsupported bank: ${bank}`)
  }
}

/**
 * Map israeli-bank-scrapers error types to BankScraperError with user-friendly messages
 */
function mapScraperError(errorType: string, message: string): BankScraperError {
  switch (errorType) {
    case 'INVALID_PASSWORD':
      return new BankScraperError(
        'INVALID_CREDENTIALS',
        'Invalid username or password. Please check your credentials and try again.'
      )

    case 'CHANGE_PASSWORD':
      return new BankScraperError(
        'PASSWORD_EXPIRED',
        "Your password has expired. Please update it via your bank's website, then update your credentials here."
      )

    case 'ACCOUNT_BLOCKED':
      return new BankScraperError(
        'ACCOUNT_BLOCKED',
        'Account locked due to too many failed login attempts. Please contact your bank.'
      )

    case 'TIMEOUT':
      return new BankScraperError(
        'NETWORK_ERROR',
        'Connection timed out. Please check your internet connection and try again.'
      )

    case 'GENERIC':
    case 'UNKNOWN_ERROR':
      return new BankScraperError(
        'SCRAPER_BROKEN',
        'Sync temporarily unavailable. The bank may have changed their website. Our team has been notified.'
      )

    default:
      console.error(`[mapScraperError] Unknown error type: ${errorType}, message: ${message}`)
      return new BankScraperError('SCRAPER_BROKEN', `Unexpected scraper error: ${message}`)
  }
}
