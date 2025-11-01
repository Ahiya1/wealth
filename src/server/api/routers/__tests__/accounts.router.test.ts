// Real tests for accounts router
import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import { AccountType, Account } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { accountsRouter } from '../accounts.router'
import { createMockContext, fixtures } from '../../__tests__/test-utils'

describe('accountsRouter', () => {
  describe('list', () => {
    it('should return only active accounts by default', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccounts = [
        fixtures.account({ isActive: true }),
        // Inactive account should not be included
      ]

      ctx.prisma.account.findMany.mockResolvedValue(mockAccounts as Account[])

      const result = await caller.list({})

      expect(result).toHaveLength(1)
      expect(ctx.prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            isActive: true,
          }),
        })
      )
    })

    it('should include inactive accounts when includeInactive is true', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccounts = [
        fixtures.account({ isActive: true }),
        fixtures.account({ id: 'inactive-account', isActive: false }),
      ]

      ctx.prisma.account.findMany.mockResolvedValue(mockAccounts as Account[])

      const result = await caller.list({ includeInactive: true })

      expect(result).toHaveLength(2)
      expect(ctx.prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
          }),
        })
      )
    })

    it('should order accounts by creation date descending', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findMany.mockResolvedValue([])

      await caller.list({})

      expect(ctx.prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('get', () => {
    it('should return account by id for owner', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccount = fixtures.account()
      ctx.prisma.account.findUnique.mockResolvedValue(mockAccount as Account)

      const result = await caller.get({ id: 'test-account-id' })

      expect(result.id).toBe('test-account-id')
      expect(result.userId).toBe('test-user-id')
    })

    it('should throw NOT_FOUND for non-existent account', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findUnique.mockResolvedValue(null)

      await expect(caller.get({ id: 'non-existent-id' })).rejects.toThrow(TRPCError)
      await expect(caller.get({ id: 'non-existent-id' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should throw NOT_FOUND for account belonging to another user', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccount = fixtures.account({ userId: 'different-user-id' })
      ctx.prisma.account.findUnique.mockResolvedValue(mockAccount as Account)

      await expect(caller.get({ id: 'test-account-id' })).rejects.toThrow(TRPCError)
      await expect(caller.get({ id: 'test-account-id' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('create', () => {
    it('should create a manual account with valid data', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccount = fixtures.account()
      ctx.prisma.account.create.mockResolvedValue(mockAccount as Account)

      const result = await caller.create({
        type: AccountType.CHECKING,
        name: 'Test Checking',
        institution: 'Test Bank',
        balance: 1000.0,
      })

      expect(result.id).toBe('test-account-id')
      expect(result.isManual).toBe(true)
      expect(ctx.prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            type: AccountType.CHECKING,
            name: 'Test Checking',
            institution: 'Test Bank',
            balance: 1000.0,
            currency: 'NIS',
            isManual: true,
          }),
        })
      )
    })

    it('should default balance to 0 if not provided', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccount = fixtures.account({ balance: new Decimal(0) })
      ctx.prisma.account.create.mockResolvedValue(mockAccount as Account)

      await caller.create({
        type: AccountType.SAVINGS,
        name: 'New Savings',
        institution: 'Bank',
      })

      expect(ctx.prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: 0,
          }),
        })
      )
    })

    it('should default currency to NIS', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccount = fixtures.account()
      ctx.prisma.account.create.mockResolvedValue(mockAccount as Account)

      await caller.create({
        type: AccountType.CREDIT,
        name: 'Credit Card',
        institution: 'Bank',
      })

      expect(ctx.prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'NIS',
          }),
        })
      )
    })
  })

  describe('update', () => {
    it('should update account fields', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const existingAccount = fixtures.account()
      const updatedAccount = { ...existingAccount, name: 'Updated Name' }

      ctx.prisma.account.findUnique.mockResolvedValue(existingAccount as Account)
      ctx.prisma.account.update.mockResolvedValue(updatedAccount as Account)

      const result = await caller.update({
        id: 'test-account-id',
        name: 'Updated Name',
      })

      expect(result.name).toBe('Updated Name')
      expect(ctx.prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'test-account-id' },
          data: expect.objectContaining({
            name: 'Updated Name',
          }),
        })
      )
    })

    it('should throw NOT_FOUND for non-existent account', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findUnique.mockResolvedValue(null)

      await expect(
        caller.update({ id: 'non-existent-id', name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should throw NOT_FOUND when accessing another users account', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const existingAccount = fixtures.account({ userId: 'different-user-id' })
      ctx.prisma.account.findUnique.mockResolvedValue(existingAccount as Account)

      await expect(
        caller.update({ id: 'test-account-id', name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should support partial updates', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const existingAccount = fixtures.account()
      ctx.prisma.account.findUnique.mockResolvedValue(existingAccount as Account)
      ctx.prisma.account.update.mockResolvedValue(existingAccount as Account)

      await caller.update({
        id: 'test-account-id',
        institution: 'New Bank',
      })

      expect(ctx.prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institution: 'New Bank',
          }),
        })
      )
    })
  })

  describe('updateBalance', () => {
    it('should update account balance', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const existingAccount = fixtures.account()
      const updatedAccount = { ...existingAccount, balance: new Decimal(2500.0) }

      ctx.prisma.account.findUnique.mockResolvedValue(existingAccount as Account)
      ctx.prisma.account.update.mockResolvedValue(updatedAccount as Account)

      const result = await caller.updateBalance({
        id: 'test-account-id',
        balance: 2500.0,
      })

      expect(Number(result.balance)).toBe(2500.0)
      expect(ctx.prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'test-account-id' },
          data: { balance: 2500.0 },
        })
      )
    })

    it('should throw NOT_FOUND for non-existent account', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findUnique.mockResolvedValue(null)

      await expect(
        caller.updateBalance({ id: 'non-existent-id', balance: 1000 })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('archive', () => {
    it('should set isActive to false', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const existingAccount = fixtures.account({ isActive: true })
      const archivedAccount = { ...existingAccount, isActive: false }

      ctx.prisma.account.findUnique.mockResolvedValue(existingAccount as Account)
      ctx.prisma.account.update.mockResolvedValue(archivedAccount as any)

      const result = await caller.archive({ id: 'test-account-id' })

      expect(result.isActive).toBe(false)
      expect(ctx.prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'test-account-id' },
          data: { isActive: false },
        })
      )
    })

    it('should throw NOT_FOUND for non-existent account', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findUnique.mockResolvedValue(null)

      await expect(caller.archive({ id: 'non-existent-id' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('netWorth', () => {
    it('should calculate total net worth from active accounts', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccounts = [
        fixtures.account({ balance: new Decimal(1000) }),
        fixtures.account({ id: 'account-2', balance: new Decimal(2500) }),
        fixtures.account({ id: 'account-3', balance: new Decimal(-500) }), // Credit card
      ]

      ctx.prisma.account.findMany.mockResolvedValue(mockAccounts as Account[])

      const result = await caller.netWorth()

      expect(result.netWorth).toBe(3000) // 1000 + 2500 - 500
      expect(result.accountCount).toBe(3)
    })

    it('should group accounts by type', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      const mockAccounts = [
        fixtures.account({ type: AccountType.CHECKING, balance: new Decimal(1000) }),
        fixtures.account({ id: 'account-2', type: AccountType.CHECKING, balance: new Decimal(500) }),
        fixtures.account({ id: 'account-3', type: AccountType.SAVINGS, balance: new Decimal(5000) }),
      ]

      ctx.prisma.account.findMany.mockResolvedValue(mockAccounts as Account[])

      const result = await caller.netWorth()

      expect(result.accountsByType.CHECKING.count).toBe(2)
      expect(result.accountsByType.CHECKING.total).toBe(1500)
      expect(result.accountsByType.SAVINGS.count).toBe(1)
      expect(result.accountsByType.SAVINGS.total).toBe(5000)
    })

    it('should only include active accounts', async () => {
      const ctx = createMockContext()
      const caller = accountsRouter.createCaller(ctx)

      ctx.prisma.account.findMany.mockResolvedValue([])

      await caller.netWorth()

      expect(ctx.prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })
  })
})
