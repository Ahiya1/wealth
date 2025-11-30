import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { ZodError } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Create tRPC context with Supabase Auth user
 */
export const createTRPCContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  // Sync Supabase user to Prisma database
  let user = null
  if (supabaseUser) {
    // Try to find existing user
    user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
    })

    // Auto-create user in Prisma on first sign-in
    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata.name || null,
          image: supabaseUser.user_metadata.avatar_url || null,
        },
      })
    }
  }

  return {
    supabase,
    supabaseUser,
    user, // Prisma user for application data
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>


const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

/**
 * Error logging middleware
 * Captures all errors and sends to Sentry before throwing
 */
const errorMiddleware = t.middleware(async ({ next, ctx, path, type }) => {
  try {
    return await next({ ctx })
  } catch (error) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      user: ctx.user ? { id: ctx.user.id.substring(0, 3) + '***' } : undefined,
      tags: {
        endpoint: path,
        userId: ctx.user?.id.substring(0, 3) + '***',
      },
      contexts: {
        trpc: {
          path,
          type,
        },
      },
    })

    // Re-throw the error (tRPC will handle HTTP response)
    throw error
  }
})

/**
 * Protected (authenticated-only) procedure
 *
 * Usage: `import { protectedProcedure } from '@/server/api/trpc'`
 *
 * After this middleware, `ctx.user` is GUARANTEED to be non-null at runtime.
 * However, due to tRPC v11 type system limitations, TypeScript may still show it as nullable.
 *
 * WORKAROUND: Use the non-null assertion operator in your procedures: `ctx.user!.id`
 * This is safe because the middleware throws an UNAUTHORIZED error if user is null.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.supabaseUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  // Fetch user from database to ensure freshness and proper typing
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
  })

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    })
  }

  return next({
    ctx: {
      user, // Guaranteed non-null at runtime (but TypeScript inference doesn't recognize this)
      prisma: ctx.prisma,
      supabase: ctx.supabase,
      supabaseUser: ctx.supabaseUser,
    },
  })
}).use(errorMiddleware)

/**
 * Admin-only procedure - requires authenticated user with ADMIN role
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  // Fetch fresh role from database (don't trust stale context)
  const userWithRole = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true, email: true, role: true, subscriptionTier: true }
  })

  if (!userWithRole || userWithRole.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next({
    ctx: {
      user: userWithRole,
      prisma: ctx.prisma,
    },
  })
})
