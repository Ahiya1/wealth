// src/server/services/plaid-sync.service.ts
import { type PrismaClient } from '@prisma/client'
import { decrypt } from '@/lib/encryption'
import { syncTransactions } from './plaid.service'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Sync transactions from Plaid for a specific account
 * Uses Plaid's transactions/sync endpoint with cursor-based pagination
 */
export async function syncTransactionsFromPlaid(
  userId: string,
  accountId: string,
  prisma: PrismaClient
): Promise<{ added: number; modified: number; removed: number }> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  if (!account.plaidAccessToken) {
    throw new Error('Account is not connected to Plaid')
  }

  if (account.userId !== userId) {
    throw new Error('Unauthorized access to account')
  }

  // Decrypt the access token
  const accessToken = decrypt(account.plaidAccessToken)

  let hasMore = true
  let cursor: string | undefined = undefined
  let addedCount = 0
  let modifiedCount = 0
  let removedCount = 0

  // Get a default "Uncategorized" category for imported transactions
  const uncategorizedCategory = await prisma.category.findFirst({
    where: {
      name: 'Miscellaneous',
      OR: [
        { userId: null }, // Default category
        { userId: userId }, // User's custom category
      ],
    },
  })

  if (!uncategorizedCategory) {
    throw new Error('Miscellaneous category not found. Please run seed script.')
  }

  // Note: Plaid amounts are converted to NIS
  // Plaid primarily supports US-based accounts (CountryCode.Us)

  // Iterate through all pages of transactions
  while (hasMore) {
    const response = await syncTransactions(accessToken, cursor)

    // Handle added transactions
    for (const txn of response.added) {
      // Plaid uses positive for debits, we use negative for expenses
      const transactionAmount = new Decimal(-txn.amount)

      await prisma.transaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        create: {
          userId: userId,
          accountId: accountId,
          plaidTransactionId: txn.transaction_id,
          date: new Date(txn.date),
          amount: transactionAmount,
          payee: txn.merchant_name || txn.name,
          categoryId: uncategorizedCategory.id,
          notes: txn.payment_channel ? `Payment channel: ${txn.payment_channel}` : null,
          tags: txn.category ? txn.category : [],
          isManual: false,
        },
        update: {
          // If transaction already exists, update it
          amount: transactionAmount,
          payee: txn.merchant_name || txn.name,
          date: new Date(txn.date),
        },
      })
      addedCount++
    }

    // Handle modified transactions
    for (const txn of response.modified) {
      const existing = await prisma.transaction.findUnique({
        where: { plaidTransactionId: txn.transaction_id },
      })

      if (existing) {
        const transactionAmount = new Decimal(-txn.amount)

        await prisma.transaction.update({
          where: { plaidTransactionId: txn.transaction_id },
          data: {
            amount: transactionAmount,
            payee: txn.merchant_name || txn.name,
            date: new Date(txn.date),
          },
        })
        modifiedCount++
      }
    }

    // Handle removed transactions
    for (const txn of response.removed) {
      await prisma.transaction.deleteMany({
        where: {
          plaidTransactionId: txn.transaction_id,
          userId: userId, // Ensure we only delete user's own transactions
        },
      })
      removedCount++
    }

    hasMore = response.hasMore
    cursor = response.nextCursor
  }

  // Update account's lastSynced timestamp
  await prisma.account.update({
    where: { id: accountId },
    data: { lastSynced: new Date() },
  })

  return {
    added: addedCount,
    modified: modifiedCount,
    removed: removedCount,
  }
}

/**
 * Sync transactions for all Plaid-connected accounts for a user
 */
export async function syncAllPlaidAccounts(
  userId: string,
  prisma: PrismaClient
): Promise<{
  accountsSynced: number
  totalAdded: number
  totalModified: number
  totalRemoved: number
}> {
  const plaidAccounts = await prisma.account.findMany({
    where: {
      userId: userId,
      isManual: false,
      isActive: true,
      plaidAccessToken: { not: null },
    },
  })

  let totalAdded = 0
  let totalModified = 0
  let totalRemoved = 0

  for (const account of plaidAccounts) {
    try {
      const result = await syncTransactionsFromPlaid(userId, account.id, prisma)
      totalAdded += result.added
      totalModified += result.modified
      totalRemoved += result.removed
    } catch (error) {
      console.error(`Failed to sync account ${account.id}:`, error)
      // Continue with other accounts even if one fails
    }
  }

  return {
    accountsSynced: plaidAccounts.length,
    totalAdded,
    totalModified,
    totalRemoved,
  }
}
