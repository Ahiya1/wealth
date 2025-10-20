// Categories router - Builder-2

import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const categoriesRouter = router({
  // List all categories (default + user custom)
  list: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.category.findMany({
      where: {
        OR: [
          { userId: null, isDefault: true }, // Default categories
          { userId: ctx.user.id }, // User's custom categories
        ],
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [
        { isDefault: 'desc' }, // Default categories first
        { name: 'asc' },
      ],
    })

    return categories
  }),

  // Get single category with children
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.id },
        include: {
          parent: true,
          children: true,
          user: true,
        },
      })

      if (!category) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
      }

      // Verify access: must be default category or belong to user
      if (category.userId && category.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      return category
    }),

  // Create custom category
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if name already exists for this user
      const existing = await ctx.prisma.category.findFirst({
        where: {
          userId: ctx.user.id,
          name: input.name,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A category with this name already exists',
        })
      }

      // Verify parent exists and user has access
      if (input.parentId) {
        const parent = await ctx.prisma.category.findUnique({
          where: { id: input.parentId },
        })

        if (!parent) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent category not found' })
        }

        if (parent.userId && parent.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot use this parent category' })
        }
      }

      const category = await ctx.prisma.category.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          color: input.color,
          parentId: input.parentId,
          isDefault: false,
          isActive: true,
        },
        include: {
          parent: true,
          children: true,
        },
      })

      return category
    }),

  // Update category
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.category.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
      }

      // Cannot edit default categories
      if (existing.isDefault || !existing.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot edit default categories',
        })
      }

      // Verify ownership
      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      // Check for name conflict if renaming
      if (input.name && input.name !== existing.name) {
        const nameConflict = await ctx.prisma.category.findFirst({
          where: {
            userId: ctx.user.id,
            name: input.name,
          },
        })

        if (nameConflict) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A category with this name already exists',
          })
        }
      }

      const category = await ctx.prisma.category.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon !== undefined && { icon: input.icon }),
          ...(input.color !== undefined && { color: input.color }),
        },
        include: {
          parent: true,
          children: true,
        },
      })

      return category
    }),

  // Archive category (soft delete)
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.category.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
      }

      // Cannot archive default categories
      if (existing.isDefault || !existing.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot archive default categories',
        })
      }

      // Verify ownership
      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      // TODO: When transactions are implemented, check if any transactions use this category
      // For now, just archive it

      const category = await ctx.prisma.category.update({
        where: { id: input.id },
        data: { isActive: false },
      })

      return { success: true, category }
    }),

  // Get all default categories (public - for registration preview)
  listDefaults: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.category.findMany({
      where: {
        userId: null,
        isDefault: true,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return categories
  }),
})
