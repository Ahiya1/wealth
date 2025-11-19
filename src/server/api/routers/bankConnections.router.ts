import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { BankProvider, ConnectionStatus, AccountType } from '@prisma/client'
import { encryptBankCredentials } from '@/lib/encryption'
import { scrapeBank, BankScraperError } from '@/server/services/bank-scraper.service'

export const bankConnectionsRouter = router({
  /**
   * List all bank connections for authenticated user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const connections = await ctx.prisma.bankConnection.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        syncLogs: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return connections
  }),

  /**
   * Get single bank connection by ID
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, 'Connection ID required'),
      })
    )
    .query(async ({ ctx, input }) => {
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
        include: {
          syncLogs: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      // Verify ownership
      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return connection
    }),

  /**
   * Add new bank connection with encrypted credentials
   */
  add: protectedProcedure
    .input(
      z.object({
        bank: z.nativeEnum(BankProvider),
        accountType: z.nativeEnum(AccountType).refine(
          (type) => type === 'CHECKING' || type === 'CREDIT',
          { message: 'Only CHECKING and CREDIT accounts supported' }
        ),
        credentials: z.object({
          userId: z.string().min(1, 'Bank user ID required'),
          password: z.string().min(1, 'Password required'),
          otp: z.string().optional(),
        }),
        accountIdentifier: z.string().length(4, 'Must be last 4 digits'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Encrypt credentials
        const encryptedCredentials = encryptBankCredentials(input.credentials)

        // Create bank connection
        const connection = await ctx.prisma.bankConnection.create({
          data: {
            userId: ctx.user.id,
            bank: input.bank,
            accountType: input.accountType,
            encryptedCredentials,
            accountIdentifier: input.accountIdentifier,
            status: 'ACTIVE',
          },
        })

        return connection
      } catch (error) {
        console.error('Failed to add bank connection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add bank connection',
          cause: error,
        })
      }
    }),

  /**
   * Update bank connection status or credentials
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ConnectionStatus).optional(),
        credentials: z
          .object({
            userId: z.string(),
            password: z.string(),
            otp: z.string().optional(),
          })
          .optional(),
        errorMessage: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Prepare update data
      const updateData: {
        status?: ConnectionStatus
        encryptedCredentials?: string
        errorMessage?: string | null
      } = {}

      if (input.status) {
        updateData.status = input.status
      }

      if (input.credentials) {
        updateData.encryptedCredentials = encryptBankCredentials(input.credentials)
      }

      if (input.errorMessage !== undefined) {
        updateData.errorMessage = input.errorMessage
      }

      // Update connection
      const updated = await ctx.prisma.bankConnection.update({
        where: { id: input.id },
        data: updateData,
      })

      return updated
    }),

  /**
   * Delete bank connection (cascade deletes sync logs)
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Delete (cascade to sync logs via Prisma schema)
      await ctx.prisma.bankConnection.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Test bank connection by attempting to scrape with provided credentials
   *
   * Creates SyncLog record for every attempt (success or failure)
   * Updates connection status based on result
   *
   * @returns Success message or throws TRPCError
   */
  test: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        otp: z.string().length(6).optional(), // For 2FA retry
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch connection and verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank connection not found' })
      }

      if (connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      // 2. Create SyncLog record (default to FAILED, update on success)
      const syncLog = await ctx.prisma.syncLog.create({
        data: {
          bankConnectionId: connection.id,
          startedAt: new Date(),
          status: 'FAILED', // Pessimistic default
        },
      })

      try {
        // 3. Call scraper service
        const result = await scrapeBank({
          bank: connection.bank,
          encryptedCredentials: connection.encryptedCredentials,
          startDate: new Date(), // Only test connection, don't import transactions
          endDate: new Date(),
          otp: input.otp,
        })

        // 4. Update connection status to ACTIVE
        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            status: 'ACTIVE',
            lastSynced: new Date(),
            lastSuccessfulSync: new Date(),
            errorMessage: null,
          },
        })

        // 5. Update SyncLog to SUCCESS
        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'SUCCESS',
            transactionsImported: 0, // Test only, no imports
          },
        })

        return {
          success: true,
          message: 'Connection successful',
          accountNumber: result.accountNumber,
        }
      } catch (error) {
        // 6. Handle BankScraperError
        if (error instanceof BankScraperError) {
          // Update connection status based on error type
          const status = error.errorType === 'PASSWORD_EXPIRED' ? 'EXPIRED' : 'ERROR'

          await ctx.prisma.bankConnection.update({
            where: { id: connection.id },
            data: {
              status,
              errorMessage: error.message,
            },
          })

          // Update SyncLog with error details
          await ctx.prisma.syncLog.update({
            where: { id: syncLog.id },
            data: {
              completedAt: new Date(),
              status: 'FAILED',
              errorDetails: `${error.errorType}: ${error.message}`,
            },
          })

          // Special handling for OTP_REQUIRED
          if (error.errorType === 'OTP_REQUIRED') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'OTP_REQUIRED', // Client detects this specific message
            })
          }

          // Throw user-friendly error
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }

        // 7. Handle unexpected errors
        console.error('[testConnection] Unexpected error:', error)

        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'FAILED',
            errorDetails: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Connection test failed. Please try again.',
        })
      }
    }),
})
