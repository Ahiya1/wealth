import { PrismaClient } from '@prisma/client'
import type { BankProvider, ImportSource } from '@prisma/client'
import { scrapeBank } from './bank-scraper.service'
import { categorizeTransactions } from './categorize.service'
import { isDuplicate } from '@/lib/services/duplicate-detection.service'
import type { ImportedTransaction } from './bank-scraper.service'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LOOKBACK_DAYS = 30
const MISCELLANEOUS_CATEGORY_NAME = 'Miscellaneous'

// ============================================================================
// Types
// ============================================================================

export interface ImportResult {
  imported: number
  skipped: number
  categorized: number
  errors: string[]
}

// ============================================================================
// Main Import Orchestration Function
// ============================================================================

/**
 * Import transactions from bank scraper with duplicate detection and AI categorization.
 *
 * Pipeline:
 * 1. Fetch bank connection + validate ownership
 * 2. Find or create linked Account
 * 3. Scrape transactions from bank (via bank-scraper.service)
 * 4. Load existing transactions for duplicate detection (last 90 days)
 * 5. Run duplicate detection (three-factor matching)
 * 6. Batch insert new transactions (Prisma createMany)
 * 7. Update account balance atomically
 * 8. Batch categorize using existing AI service
 *
 * @param bankConnectionId - Bank connection to sync
 * @param userId - User ID (for authorization)
 * @param startDate - Optional start date (defaults to 30 days ago)
 * @param endDate - Optional end date (defaults to today)
 * @param prismaClient - Prisma client instance
 * @returns Import result with counts (imported, skipped, categorized)
 * @throws Error if connection not found or unauthorized
 *
 * @example
 * ```typescript
 * const result = await importTransactions(
 *   'conn_123',
 *   'user_456',
 *   new Date('2025-10-15'),
 *   new Date('2025-11-15'),
 *   prisma
 * )
 * console.log(`Imported ${result.imported}, skipped ${result.skipped}`)
 * ```
 */
export async function importTransactions(
  bankConnectionId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date,
  prismaClient: PrismaClient = new PrismaClient()
): Promise<ImportResult> {
  const errors: string[] = []

  try {
    // Step 1: Fetch bank connection + validate ownership
    const connection = await prismaClient.bankConnection.findUnique({
      where: { id: bankConnectionId },
    })

    if (!connection || connection.userId !== userId) {
      throw new Error('Bank connection not found or unauthorized')
    }

    // Step 2: Find or create linked Account
    const account = await findOrCreateAccount(connection, userId, prismaClient)

    // Step 3: Determine date range (default: last 30 days)
    const endDateResolved = endDate || new Date()
    const startDateResolved =
      startDate || new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

    // Step 4: Scrape transactions from bank
    console.log(
      `[importTransactions] Scraping ${connection.bank} from ${startDateResolved.toISOString()} to ${endDateResolved.toISOString()}`
    )

    const scrapeResult = await scrapeBank({
      bank: connection.bank,
      encryptedCredentials: connection.encryptedCredentials,
      startDate: startDateResolved,
      endDate: endDateResolved,
    })

    if (!scrapeResult.success || scrapeResult.transactions.length === 0) {
      console.log('[importTransactions] No transactions found from scraper')
      return { imported: 0, skipped: 0, categorized: 0, errors: ['No transactions found'] }
    }

    console.log(
      `[importTransactions] Scraped ${scrapeResult.transactions.length} transactions from bank`
    )

    // Step 5: Load existing transactions for duplicate detection (last 90 days)
    const existingTransactions = await prismaClient.transaction.findMany({
      where: {
        userId,
        accountId: account.id,
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        date: true,
        amount: true,
        rawMerchantName: true,
        payee: true,
      },
    })

    console.log(
      `[importTransactions] Loaded ${existingTransactions.length} existing transactions for duplicate detection`
    )

    // Step 6: Run duplicate detection
    const { newTransactions, skippedCount } = deduplicateTransactions(
      scrapeResult.transactions,
      existingTransactions
    )

    console.log(
      `[importTransactions] Duplicate detection: ${newTransactions.length} new, ${skippedCount} skipped`
    )

    if (newTransactions.length === 0) {
      return { imported: 0, skipped: skippedCount, categorized: 0, errors: [] }
    }

    // Step 7: Get Miscellaneous category for initial import
    const miscCategory = await prismaClient.category.findFirst({
      where: {
        name: MISCELLANEOUS_CATEGORY_NAME,
        isDefault: true,
      },
    })

    if (!miscCategory) {
      throw new Error('Miscellaneous category not found')
    }

    // Step 8: Batch insert transactions + update account balance (atomic)
    const insertedCount = await insertTransactionsBatch(
      newTransactions,
      userId,
      account.id,
      miscCategory.id,
      connection.bank,
      prismaClient
    )

    console.log(`[importTransactions] Inserted ${insertedCount} transactions`)

    // Step 9: Fetch newly inserted transactions for categorization
    const syncStartTime = new Date(Date.now() - 5000) // 5 seconds ago to account for clock skew
    const uncategorizedTransactions = await prismaClient.transaction.findMany({
      where: {
        userId,
        accountId: account.id,
        importedAt: { gte: syncStartTime },
        categoryId: miscCategory.id,
      },
    })

    console.log(
      `[importTransactions] Found ${uncategorizedTransactions.length} transactions to categorize`
    )

    // Step 10: Batch categorize using existing AI service
    const categorizedCount = await categorizeImportedTransactions(
      uncategorizedTransactions,
      userId,
      prismaClient
    )

    console.log(`[importTransactions] Categorized ${categorizedCount} transactions`)

    return {
      imported: insertedCount,
      skipped: skippedCount,
      categorized: categorizedCount,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)
    console.error('[importTransactions] Error:', errorMessage)
    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find or create an Account linked to the bank connection
 *
 * - First tries to find existing account by institution name
 * - If not found, creates new account with initial balance 0
 *
 * @param connection - Bank connection with bank provider and account type
 * @param userId - User ID for account ownership
 * @param prisma - Prisma client instance
 * @returns Account object (found or created)
 */
async function findOrCreateAccount(
  connection: { bank: BankProvider; accountType: any; accountIdentifier: string },
  userId: string,
  prisma: PrismaClient
) {
  // Map bank provider to institution name
  const institutionName = connection.bank === 'FIBI' ? 'First International Bank' : 'Visa CAL'

  // Try to find existing account
  const existingAccount = await prisma.account.findFirst({
    where: {
      userId,
      type: connection.accountType,
      institution: institutionName,
      isActive: true,
    },
  })

  if (existingAccount) {
    console.log(`[findOrCreateAccount] Found existing account: ${existingAccount.id}`)
    return existingAccount
  }

  // Create new account
  const accountName =
    connection.accountType === 'CHECKING'
      ? `${institutionName} Checking (...${connection.accountIdentifier})`
      : `${institutionName} Credit Card (...${connection.accountIdentifier})`

  const newAccount = await prisma.account.create({
    data: {
      userId,
      type: connection.accountType,
      name: accountName,
      institution: institutionName,
      balance: 0, // Initial balance (will be updated after import)
      currency: 'NIS',
      isManual: false, // Auto-synced account
      isActive: true,
    },
  })

  console.log(`[findOrCreateAccount] Created new account: ${newAccount.id}`)
  return newAccount
}

/**
 * Deduplicate transactions using three-factor matching
 *
 * Compares scraped transactions against existing transactions to filter duplicates.
 *
 * @param scrapedTransactions - Transactions from bank scraper
 * @param existingTransactions - Existing transactions from database
 * @returns Object with newTransactions array and skippedCount
 */
function deduplicateTransactions(
  scrapedTransactions: ImportedTransaction[],
  existingTransactions: Array<{
    date: Date
    amount: any
    rawMerchantName: string | null
    payee: string
  }>
): { newTransactions: ImportedTransaction[]; skippedCount: number } {
  const newTransactions: ImportedTransaction[] = []
  let skippedCount = 0

  for (const scraped of scrapedTransactions) {
    const isDupe = isDuplicate(
      {
        date: scraped.date,
        amount: scraped.amount,
        merchant: scraped.description,
      },
      existingTransactions.map((e) => ({
        date: e.date,
        amount: Number(e.amount),
        merchant: e.rawMerchantName || e.payee,
      }))
    )

    if (isDupe) {
      skippedCount++
      console.log(
        `[deduplicateTransactions] Skipping duplicate: ${scraped.description} ${scraped.amount} on ${scraped.date.toISOString()}`
      )
    } else {
      newTransactions.push(scraped)
    }
  }

  return { newTransactions, skippedCount }
}

/**
 * Batch insert transactions and update account balance atomically
 *
 * Uses Prisma $transaction for atomic operations:
 * 1. Batch insert transactions (createMany)
 * 2. Update account balance (single increment operation)
 *
 * @param transactions - Transactions to insert
 * @param userId - User ID for ownership
 * @param accountId - Account ID to link transactions
 * @param categoryId - Initial category (Miscellaneous)
 * @param importSource - Bank provider (FIBI or CAL)
 * @param prisma - Prisma client instance
 * @returns Number of transactions inserted
 */
async function insertTransactionsBatch(
  transactions: ImportedTransaction[],
  userId: string,
  accountId: string,
  categoryId: string,
  importSource: BankProvider,
  prisma: PrismaClient
): Promise<number> {
  // Map BankProvider to ImportSource enum
  const importSourceEnum: ImportSource = importSource === 'FIBI' ? 'FIBI' : 'CAL'

  // Use Prisma $transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Batch insert transactions
    const insertResult = await tx.transaction.createMany({
      data: transactions.map((t) => ({
        userId,
        accountId,
        date: t.date,
        amount: t.amount,
        payee: t.description,
        rawMerchantName: t.description,
        categoryId,
        importSource: importSourceEnum,
        importedAt: new Date(),
        isManual: false,
        tags: [],
        notes: t.memo || null,
      })),
      skipDuplicates: true, // Skip if unique constraint violated
    })

    // Step 2: Calculate total amount for balance update
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

    // Step 3: Update account balance (single operation)
    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: { increment: totalAmount },
        lastSynced: new Date(),
      },
    })

    return insertResult.count
  })

  return result
}

/**
 * Categorize imported transactions using existing AI service
 *
 * Calls categorizeTransactions service which handles:
 * - MerchantCategoryCache lookup (70-80% hit rate)
 * - Claude API batch categorization (20-30% miss rate)
 * - Cache updates for future imports
 *
 * @param transactions - Transactions to categorize
 * @param userId - User ID for category lookup
 * @param prisma - Prisma client instance
 * @returns Number of transactions successfully categorized
 */
async function categorizeImportedTransactions(
  transactions: Array<{ id: string; rawMerchantName: string | null; payee: string; amount: any }>,
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  if (transactions.length === 0) return 0

  // Prepare for categorization
  const txnsToCategorize = transactions.map((t) => ({
    id: t.id,
    payee: t.rawMerchantName || t.payee,
    amount: Number(t.amount),
  }))

  // Call existing categorization service
  const results = await categorizeTransactions(userId, txnsToCategorize, prisma)

  // Batch update transactions with categories
  const updates = results
    .filter((r) => r.categoryId !== null)
    .map((r) => {
      const confidence = r.confidence === 'high' ? 'HIGH' : 'MEDIUM'
      const source = r.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED'

      return prisma.transaction.update({
        where: { id: r.transactionId },
        data: {
          categoryId: r.categoryId!,
          categorizedBy: source,
          categorizationConfidence: confidence,
        },
      })
    })

  await Promise.all(updates)

  return updates.length
}
