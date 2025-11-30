// src/server/api/routers/chat.router.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const chatRouter = router({
  /**
   * List all chat sessions for the authenticated user
   * Ordered by most recently updated first
   */
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.prisma.chatSession.findMany({
      where: { userId: ctx.user!.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return sessions
  }),

  /**
   * Get a specific chat session with all messages
   */
  getSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      // Validate ownership
      if (!session || session.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      return session
    }),

  /**
   * Create a new chat session
   */
  createSession: protectedProcedure.mutation(async ({ ctx }) => {
    const session = await ctx.prisma.chatSession.create({
      data: {
        userId: ctx.user!.id,
        title: 'New Chat',
      },
    })

    return session
  }),

  /**
   * Delete a chat session and all its messages
   */
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.id },
      })

      // Validate ownership before delete
      if (!session || session.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      // Delete session (messages will cascade delete)
      await ctx.prisma.chatSession.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Get all messages for a specific session
   */
  getMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify session ownership
      const session = await ctx.prisma.chatSession.findUnique({
        where: { id: input.sessionId },
      })

      if (!session || session.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      const messages = await ctx.prisma.chatMessage.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: 'asc' },
      })

      return messages
    }),
})
