import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { BankProvider, ConnectionStatus, AccountType } from '@prisma/client'
import { encryptBankCredentials, decryptBankCredentials } from '@/lib/encryption'

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
   * Test bank connection credentials (stub for Iteration 17)
   * Real implementation in Iteration 18 with israeli-bank-scrapers
   */
  test: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Decrypt credentials (verify encryption works)
      const credentials = decryptBankCredentials(connection.encryptedCredentials)

      // STUB: Always return success in Iteration 17
      // Real implementation in Iteration 18 will call israeli-bank-scrapers
      console.log(
        'Test connection stub - bank:',
        connection.bank,
        'user:',
        credentials.userId.substring(0, 3) + '***'
      )

      return {
        success: true,
        message: 'Connection test stub (real implementation in Iteration 18)',
      }
    }),
})
