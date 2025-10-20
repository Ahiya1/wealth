// Claude AI Categorization Service - Builder-5C

import Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface TransactionToCategorize {
  id: string
  payee: string
  amount: number
}

interface CategorizationResult {
  transactionId: string
  categoryName: string
  categoryId: string | null
  confidence: 'high' | 'low'
}

/**
 * Check if a merchant is already cached
 */
async function getMerchantCategoryFromCache(
  merchant: string,
  prismaClient: PrismaClient
): Promise<string | null> {
  // Normalize merchant name for cache lookup (lowercase, trim)
  const normalizedMerchant = merchant.toLowerCase().trim()

  const cached = await prismaClient.merchantCategoryCache.findUnique({
    where: { merchant: normalizedMerchant },
    include: { category: true },
  })

  return cached?.categoryId || null
}

/**
 * Cache a merchant-category mapping
 */
async function cacheMerchantCategory(
  merchant: string,
  categoryId: string,
  prismaClient: PrismaClient
): Promise<void> {
  const normalizedMerchant = merchant.toLowerCase().trim()

  try {
    await prismaClient.merchantCategoryCache.upsert({
      where: { merchant: normalizedMerchant },
      create: {
        merchant: normalizedMerchant,
        categoryId,
      },
      update: {
        categoryId,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    // Log but don't fail if caching fails
    console.error('Failed to cache merchant category:', error)
  }
}

/**
 * Get available categories for a user (default + custom)
 */
async function getAvailableCategoriesForUser(
  userId: string,
  prismaClient: PrismaClient
): Promise<Array<{ id: string; name: string }>> {
  const categories = await prismaClient.category.findMany({
    where: {
      OR: [
        { userId: null, isDefault: true }, // Default categories
        { userId: userId }, // User's custom categories
      ],
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  })

  return categories
}

/**
 * Categorize transactions using Claude API with caching
 */
export async function categorizeTransactions(
  userId: string,
  transactions: TransactionToCategorize[],
  prismaClient: PrismaClient
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) return []

  // Get available categories for this user
  const availableCategories = await getAvailableCategoriesForUser(userId, prismaClient)
  const categoryMap = new Map(availableCategories.map((c) => [c.name.toLowerCase(), c.id]))
  const categoryNames = availableCategories.map((c) => c.name)

  // Check cache for each transaction
  const results: CategorizationResult[] = []
  const uncachedTransactions: TransactionToCategorize[] = []

  for (const txn of transactions) {
    const cachedCategoryId = await getMerchantCategoryFromCache(txn.payee, prismaClient)

    if (cachedCategoryId) {
      // Get category name for result
      const category = availableCategories.find((c) => c.id === cachedCategoryId)
      results.push({
        transactionId: txn.id,
        categoryName: category?.name || 'Miscellaneous',
        categoryId: cachedCategoryId,
        confidence: 'high', // Cache hits are high confidence
      })
    } else {
      uncachedTransactions.push(txn)
    }
  }

  // If all were cached, return early
  if (uncachedTransactions.length === 0) {
    return results
  }

  // Call Claude API for uncached transactions (batch up to 50)
  const batchSize = 50
  for (let i = 0; i < uncachedTransactions.length; i += batchSize) {
    const batch = uncachedTransactions.slice(i, i + batchSize)

    try {
      const batchResults = await categorizeBatchWithClaude(
        batch,
        categoryNames,
        categoryMap,
        prismaClient
      )
      results.push(...batchResults)
    } catch (error) {
      console.error('Claude categorization error:', error)

      // Fallback to Miscellaneous for failed batch
      const fallbackCategory = availableCategories.find(
        (c) => c.name.toLowerCase() === 'miscellaneous'
      )
      const fallbackId = fallbackCategory?.id || availableCategories[0]?.id || null

      for (const txn of batch) {
        results.push({
          transactionId: txn.id,
          categoryName: fallbackCategory?.name || 'Miscellaneous',
          categoryId: fallbackId,
          confidence: 'low',
        })
      }
    }
  }

  return results
}

/**
 * Internal function to categorize a batch using Claude API
 */
async function categorizeBatchWithClaude(
  transactions: TransactionToCategorize[],
  categoryNames: string[],
  categoryMap: Map<string, string>,
  prismaClient: PrismaClient
): Promise<CategorizationResult[]> {
  const transactionList = transactions
    .map((t, i) => `${i + 1}. ${t.payee} - $${Math.abs(t.amount).toFixed(2)}`)
    .join('\n')

  const prompt = `You are a financial categorization assistant.

Categorize these transactions into one of these categories:
${categoryNames.join(', ')}

Transactions:
${transactionList}

Return ONLY a JSON array with this exact format:
[{"number": 1, "category": "CategoryName"}, {"number": 2, "category": "CategoryName"}]

Rules:
- Use only categories from the list provided (exact spelling)
- If uncertain, use "Miscellaneous"
- Choose the most specific category available
- Return valid JSON only, no other text`

  const message = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    temperature: 0.2, // Low temperature for consistent results
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Extract text from response, handling ContentBlock union type
  const firstBlock = message.content[0]
  if (!firstBlock) {
    throw new Error('No content in Claude response')
  }

  const responseText = firstBlock.type === 'text' ? firstBlock.text : '[]'

  // Extract JSON from response (might have markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  const jsonText = jsonMatch ? jsonMatch[0] : '[]'

  let categorizations: Array<{ number: number; category: string }> = []
  try {
    categorizations = JSON.parse(jsonText)
  } catch (error) {
    console.error('Failed to parse Claude response:', error)
    throw error
  }

  // Map results back to transactions
  const results: CategorizationResult[] = []

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i]
    if (!txn) {
      continue // Skip if transaction is undefined
    }

    const cat = categorizations.find((c) => c.number === i + 1)
    const categoryName = cat?.category || 'Miscellaneous'
    const categoryId = categoryMap.get(categoryName.toLowerCase()) || null

    // Cache this merchant-category mapping
    if (categoryId) {
      await cacheMerchantCategory(txn.payee, categoryId, prismaClient)
    }

    results.push({
      transactionId: txn.id,
      categoryName,
      categoryId,
      confidence: cat ? 'high' : 'low',
    })
  }

  return results
}

/**
 * Categorize a single transaction (convenience wrapper)
 */
export async function categorizeSingleTransaction(
  userId: string,
  payee: string,
  amount: number,
  prismaClient: PrismaClient
): Promise<{ categoryName: string; categoryId: string | null }> {
  const results = await categorizeTransactions(
    userId,
    [{ id: 'temp', payee, amount }],
    prismaClient
  )

  return {
    categoryName: results[0]?.categoryName || 'Miscellaneous',
    categoryId: results[0]?.categoryId || null,
  }
}

/**
 * Get categorization statistics for a user (useful for analytics)
 */
export async function getCategorizationStats(
  userId: string,
  prismaClient: PrismaClient
): Promise<{
  totalCached: number
  totalTransactions: number
  cacheHitRate: number
}> {
  const [cachedCount, totalTransactions] = await Promise.all([
    prismaClient.merchantCategoryCache.count(),
    prismaClient.transaction.count({
      where: { userId },
    }),
  ])

  return {
    totalCached: cachedCount,
    totalTransactions,
    cacheHitRate: totalTransactions > 0 ? (cachedCount / totalTransactions) * 100 : 0,
  }
}
