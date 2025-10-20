import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { ZodError } from 'zod'
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
 * Protected procedure - requires authenticated user
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  }

  return next({
    ctx: {
      user: ctx.user, // Prisma User (guaranteed non-null)
      supabaseUser: ctx.supabaseUser!,
      prisma: ctx.prisma,
    },
  })
})

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
