// src/server/api/routers/plaid.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  mapPlaidAccountType,
} from '@/server/services/plaid.service'
import { syncTransactionsFromPlaid, syncAllPlaidAccounts } from '@/server/services/plaid-sync.service'
import { encrypt } from '@/lib/encryption'

export const plaidRouter = router({
  /**
   * Create a Plaid Link token for connecting a bank account
   */
  createLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const linkToken = await createLinkToken(ctx.user!.id)
      return { linkToken }
    } catch (error) {
      console.error('Error creating Plaid Link token:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create Plaid Link token',
        cause: error,
      })
    }
  }),

  /**
   * Exchange a public token for an access token and import accounts
   */
  exchangePublicToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string(),
        institutionName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Exchange the public token
        const { accessToken } = await exchangePublicToken(input.publicToken)

        // Encrypt the access token before storing
        const encryptedToken = encrypt(accessToken)

        // Get accounts from Plaid
        const plaidAccounts = await getAccounts(accessToken)

        // Import accounts to database
        const importedAccounts = []
        for (const acc of plaidAccounts) {
          const account = await ctx.prisma.account.create({
            data: {
              userId: ctx.user!.id,
              type: mapPlaidAccountType(acc.type, acc.subtype),
              name: acc.name,
              institution: input.institutionName,
              balance: acc.balances.current || 0,
              currency: acc.balances.iso_currency_code || 'NIS',
              plaidAccountId: acc.account_id,
              plaidAccessToken: encryptedToken,
              isManual: false,
              lastSynced: new Date(),
            },
          })
          importedAccounts.push(account)
        }

        return {
          success: true,
          accountsImported: importedAccounts.length,
          accounts: importedAccounts,
        }
      } catch (error) {
        console.error('Error exchanging Plaid public token:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to connect bank account',
          cause: error,
        })
      }
    }),

  /**
   * Sync transactions for a specific account
   */
  syncTransactions: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await syncTransactionsFromPlaid(
          ctx.user!.id,
          input.accountId,
          ctx.prisma
        )

        return {
          success: true,
          ...result,
        }
      } catch (error) {
        console.error('Error syncing transactions:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync transactions',
          cause: error,
        })
      }
    }),

  /**
   * Sync transactions for all Plaid-connected accounts
   */
  syncAllAccounts: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await syncAllPlaidAccounts(ctx.user!.id, ctx.prisma)

      return {
        success: true,
        ...result,
      }
    } catch (error) {
      console.error('Error syncing all accounts:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sync accounts',
        cause: error,
      })
    }
  }),
})
