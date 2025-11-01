// Test utilities for tRPC router testing
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended'
import type { Session } from '@supabase/supabase-js'

/**
 * Create a mock Prisma client for testing
 */
export function createMockPrisma(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>()
}

/**
 * Create a mock tRPC context for testing
 */
export function createMockContext(userId: string = 'test-user-id') {
  const prisma = createMockPrisma()

  return {
    prisma,
    user: {
      id: userId,
      email: 'test@example.com',
      role: 'USER' as const,
      supabaseAuthId: 'supabase-auth-id',
    },
    session: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      user: {
        id: 'supabase-auth-id',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    } as Session,
  }
}

/**
 * Create a mock admin context for testing admin-only routes
 */
export function createMockAdminContext(userId: string = 'admin-user-id') {
  const context = createMockContext(userId)
  context.user.role = 'ADMIN'
  return context
}

/**
 * Helper to create test data fixtures
 */
export const fixtures = {
  user: (overrides = {}) => ({
    id: 'test-user-id',
    supabaseAuthId: 'supabase-auth-id',
    email: 'test@example.com',
    name: 'Test User',
    currency: 'NIS',
    timezone: 'America/New_York',
    role: 'USER' as const,
    subscriptionTier: 'FREE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  account: (overrides = {}) => ({
    id: 'test-account-id',
    userId: 'test-user-id',
    type: 'CHECKING' as const,
    name: 'Test Checking',
    institution: 'Test Bank',
    balance: 1000.00,
    currency: 'NIS',
    isManual: true,
    isActive: true,
    plaidAccountId: null,
    plaidAccessToken: null,
    lastSynced: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  category: (overrides = {}) => ({
    id: 'test-category-id',
    userId: null,
    name: 'Groceries',
    icon: 'shopping-cart',
    color: '#4ade80',
    parentId: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  transaction: (overrides = {}) => ({
    id: 'test-transaction-id',
    userId: 'test-user-id',
    accountId: 'test-account-id',
    date: new Date(),
    amount: -50.00,
    payee: 'Test Store',
    categoryId: 'test-category-id',
    notes: null,
    tags: [],
    plaidTransactionId: null,
    recurringTransactionId: null,
    isManual: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  budget: (overrides = {}) => ({
    id: 'test-budget-id',
    userId: 'test-user-id',
    categoryId: 'test-category-id',
    amount: 500.00,
    month: '2025-10',
    rollover: false,
    isRecurring: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  goal: (overrides = {}) => ({
    id: 'test-goal-id',
    userId: 'test-user-id',
    name: 'Emergency Fund',
    targetAmount: 10000.00,
    currentAmount: 2500.00,
    targetDate: new Date('2026-01-01'),
    linkedAccountId: null,
    type: 'SAVINGS' as const,
    isCompleted: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}
