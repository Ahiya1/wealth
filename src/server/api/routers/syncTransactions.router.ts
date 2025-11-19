import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

// Import from Builder-1's implementation
import { importTransactions } from '@/server/services/transaction-import.service'

/**
 * Sync Transactions Router
 *
 * Handles manual transaction sync operations with progress tracking.
 * Integrates with Builder-1's import service for bank scraping and duplicate detection.
 */
export const syncTransactionsRouter = router({
  /**
   * Trigger manual sync for a bank connection
   *
   * Creates pessimistic SyncLog (default: FAILED), calls import service,
   * updates to SUCCESS on completion. Returns syncLogId for progress polling.
   */
  trigger: protectedProcedure
    .input(
      z.object({
        bankConnectionId: z.string().cuid(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verify connection ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.bankConnectionId },
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bank connection not found or unauthorized',
        })
      }

      // 2. Create SyncLog (pessimistic default: FAILED)
      const syncLog = await ctx.prisma.syncLog.create({
        data: {
          bankConnectionId: connection.id,
          startedAt: new Date(),
          status: 'FAILED', // Will update on success
        },
      })

      try {
        // 3. Call import service (from Builder-1)
        const result = await importTransactions(
          input.bankConnectionId,
          ctx.user.id,
          input.startDate,
          input.endDate,
          ctx.prisma
        )

        // 4. Update connection status
        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            lastSynced: new Date(),
            lastSuccessfulSync: new Date(),
            status: 'ACTIVE',
            errorMessage: null,
          },
        })

        // 5. Update SyncLog to SUCCESS
        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'SUCCESS',
            transactionsImported: result.imported,
            transactionsSkipped: result.skipped,
          },
        })

        // 6. Return result for UI
        return {
          success: true,
          syncLogId: syncLog.id,
          imported: result.imported,
          skipped: result.skipped,
          categorized: result.categorized,
        }
      } catch (error) {
        // 7. Handle errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Update SyncLog with error details
        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'FAILED',
            errorDetails: errorMessage,
          },
        })

        // Update connection status
        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            status: 'ERROR',
            errorMessage,
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sync failed: ${errorMessage}`,
        })
      }
    }),

  /**
   * Get sync status for polling
   *
   * Returns current status and progress counts for a sync operation.
   * Used by UI to poll every 2 seconds during sync.
   */
  status: protectedProcedure
    .input(
      z.object({
        syncLogId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const log = await ctx.prisma.syncLog.findUnique({
        where: { id: input.syncLogId },
      })

      if (!log) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sync log not found',
        })
      }

      // Verify ownership via bankConnection
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: log.bankConnectionId },
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      return {
        status: log.status,
        transactionsImported: log.transactionsImported,
        transactionsSkipped: log.transactionsSkipped,
        errorDetails: log.errorDetails,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
      }
    }),

  /**
   * Get sync history for a bank connection
   *
   * Returns last 10 sync attempts with status and counts.
   * Used to display sync history in settings or connection details.
   */
  history: protectedProcedure
    .input(
      z.object({
        bankConnectionId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.bankConnectionId },
      })

      if (!connection || connection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      // Fetch last 10 sync logs
      const logs = await ctx.prisma.syncLog.findMany({
        where: { bankConnectionId: input.bankConnectionId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      return logs
    }),
})
