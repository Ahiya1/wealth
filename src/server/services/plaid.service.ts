// src/server/services/plaid.service.ts
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  Products,
  type TransactionsSyncRequest,
  type AccountsGetRequest,
} from 'plaid'
import type { AccountType } from '@prisma/client'

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

/**
 * Create a Link Token for Plaid Link UI
 */
export async function createLinkToken(userId: string): Promise<string> {
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: userId,
    },
    client_name: 'Wealth',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/plaid`,
  })

  return response.data.link_token
}

/**
 * Exchange a public token for an access token
 */
export async function exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  })

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  }
}

/**
 * Get accounts for an access token
 */
export async function getAccounts(accessToken: string) {
  const request: AccountsGetRequest = {
    access_token: accessToken,
  }

  const response = await plaidClient.accountsGet(request)
  return response.data.accounts
}

/**
 * Sync transactions using Plaid's transactions/sync endpoint
 * @param accessToken - Encrypted access token from Plaid
 * @param cursor - Optional cursor for pagination
 */
export async function syncTransactions(accessToken: string, cursor?: string) {
  const request: TransactionsSyncRequest = {
    access_token: accessToken,
    ...(cursor && { cursor }),
  }

  const response = await plaidClient.transactionsSync(request)

  return {
    added: response.data.added,
    modified: response.data.modified,
    removed: response.data.removed,
    nextCursor: response.data.next_cursor,
    hasMore: response.data.has_more,
  }
}

/**
 * Get institution information
 */
export async function getInstitution(institutionId: string) {
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
  })

  return response.data.institution
}

/**
 * Map Plaid account types to our AccountType enum
 */
export function mapPlaidAccountType(plaidType: string, plaidSubtype?: string | null): AccountType {
  const type = plaidType.toLowerCase()
  const subtype = plaidSubtype?.toLowerCase()

  if (type === 'depository') {
    if (subtype === 'checking') return 'CHECKING'
    if (subtype === 'savings') return 'SAVINGS'
    return 'CHECKING' // Default for depository
  }

  if (type === 'credit') return 'CREDIT'
  if (type === 'investment') return 'INVESTMENT'
  if (type === 'loan') return 'CREDIT' // Treat loans as credit

  return 'CASH' // Default fallback
}
