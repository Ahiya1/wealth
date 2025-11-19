import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importTransactions } from '../transaction-import.service'
import * as bankScraperService from '../bank-scraper.service'
import * as categorizeService from '../categorize.service'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// Mock external dependencies
vi.mock('../bank-scraper.service')
vi.mock('../categorize.service')

describe('Transaction Import Service', () => {
  let mockPrisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = mockDeep<PrismaClient>()
    mockReset(mockPrisma)
  })

  it('should import new transactions successfully', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol Jerusalem',
          status: 'completed' as const,
        },
        {
          date: new Date('2025-11-14'),
          processedDate: new Date('2025-11-14'),
          amount: -45.0,
          description: 'Starbucks Tel Aviv',
          status: 'completed' as const,
        },
      ],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    vi.mocked(categorizeService.categorizeTransactions).mockResolvedValue([
      {
        transactionId: 'txn1',
        categoryName: 'Groceries',
        categoryId: 'cat1',
        confidence: 'high',
      },
      {
        transactionId: 'txn2',
        categoryName: 'Dining',
        categoryId: 'cat2',
        confidence: 'high',
      },
    ])

    // Mock Prisma responses
    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.transaction.findMany.mockResolvedValue([]) // No existing transactions

    mockPrisma.category.findFirst.mockResolvedValue({
      id: 'misc',
      userId: null,
      name: 'Miscellaneous',
      icon: null,
      color: null,
      parentId: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Mock $transaction
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        transaction: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx)
    })

    mockPrisma.transaction.findMany
      .mockResolvedValueOnce([]) // No existing transactions (first call)
      .mockResolvedValueOnce([
        // Uncategorized transactions (second call)
        {
          id: 'txn1',
          userId: 'user1',
          accountId: 'acc1',
          date: new Date('2025-11-15'),
          amount: -127.5 as any, // Prisma returns Decimal type
          payee: 'SuperSol Jerusalem',
          categoryId: 'misc',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: false,
          rawMerchantName: 'SuperSol Jerusalem',
          importSource: 'FIBI',
          importedAt: new Date(),
          categorizedBy: null,
          categorizationConfidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn2',
          userId: 'user1',
          accountId: 'acc1',
          date: new Date('2025-11-14'),
          amount: -45.0 as any, // Prisma returns Decimal type
          payee: 'Starbucks Tel Aviv',
          categoryId: 'misc',
          notes: null,
          tags: [],
          plaidTransactionId: null,
          recurringTransactionId: null,
          isManual: false,
          rawMerchantName: 'Starbucks Tel Aviv',
          importSource: 'FIBI',
          importedAt: new Date(),
          categorizedBy: null,
          categorizationConfidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

    mockPrisma.transaction.update.mockResolvedValue({} as any)

    // Act
    const result = await importTransactions(
      'conn1',
      'user1',
      new Date('2025-11-01'),
      new Date('2025-11-30'),
      mockPrisma as unknown as PrismaClient
    )

    // Assert
    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.categorized).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(bankScraperService.scrapeBank).toHaveBeenCalledTimes(1)
    expect(categorizeService.categorizeTransactions).toHaveBeenCalledTimes(1)
  })

  it('should skip duplicate transactions', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol Jerusalem',
          status: 'completed' as const,
        },
        {
          date: new Date('2025-11-14'),
          processedDate: new Date('2025-11-14'),
          amount: -45.0,
          description: 'Starbucks Tel Aviv',
          status: 'completed' as const,
        },
      ],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    // Mock existing transaction that matches the first scraped transaction
    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.transaction.findMany.mockResolvedValueOnce([
      {
        id: 'existing1',
        userId: 'user1',
        accountId: 'acc1',
        date: new Date('2025-11-15'),
        amount: -127.5 as any, // Prisma returns Decimal type
        payee: 'SuperSol Jerusalem',
        categoryId: 'cat1',
        notes: null,
        tags: [],
        plaidTransactionId: null,
        recurringTransactionId: null,
        isManual: false,
        rawMerchantName: 'SuperSol Jerusalem',
        importSource: 'FIBI',
        importedAt: new Date(),
        categorizedBy: 'AI_CACHED',
        categorizationConfidence: 'HIGH',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    mockPrisma.category.findFirst.mockResolvedValue({
      id: 'misc',
      userId: null,
      name: 'Miscellaneous',
      icon: null,
      color: null,
      parentId: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        transaction: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }), // Only 1 new transaction
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx)
    })

    mockPrisma.transaction.findMany.mockResolvedValueOnce([
      {
        id: 'txn2',
        userId: 'user1',
        accountId: 'acc1',
        date: new Date('2025-11-14'),
        amount: -45.0 as any, // Prisma returns Decimal type
        payee: 'Starbucks Tel Aviv',
        categoryId: 'misc',
        notes: null,
        tags: [],
        plaidTransactionId: null,
        recurringTransactionId: null,
        isManual: false,
        rawMerchantName: 'Starbucks Tel Aviv',
        importSource: 'FIBI',
        importedAt: new Date(),
        categorizedBy: null,
        categorizationConfidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    vi.mocked(categorizeService.categorizeTransactions).mockResolvedValue([
      {
        transactionId: 'txn2',
        categoryName: 'Dining',
        categoryId: 'cat2',
        confidence: 'high',
      },
    ])

    mockPrisma.transaction.update.mockResolvedValue({} as any)

    // Act
    const result = await importTransactions(
      'conn1',
      'user1',
      new Date('2025-11-01'),
      new Date('2025-11-30'),
      mockPrisma as unknown as PrismaClient
    )

    // Assert
    expect(result.imported).toBe(1) // Only 1 new transaction
    expect(result.skipped).toBe(1) // 1 duplicate skipped
    expect(result.categorized).toBe(1)
  })

  it('should return zero counts when no transactions found', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Act
    const result = await importTransactions(
      'conn1',
      'user1',
      new Date('2025-11-01'),
      new Date('2025-11-30'),
      mockPrisma as unknown as PrismaClient
    )

    // Assert
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.categorized).toBe(0)
    expect(result.errors).toEqual(['No transactions found'])
  })

  it('should throw error for unauthorized access', async () => {
    // Arrange
    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'other_user', // Different user!
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Act & Assert
    await expect(
      importTransactions(
        'conn1',
        'user1',
        new Date('2025-11-01'),
        new Date('2025-11-30'),
        mockPrisma as unknown as PrismaClient
      )
    ).rejects.toThrow('Bank connection not found or unauthorized')
  })

  it('should throw error if bank connection not found', async () => {
    // Arrange
    mockPrisma.bankConnection.findUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(
      importTransactions(
        'conn1',
        'user1',
        new Date('2025-11-01'),
        new Date('2025-11-30'),
        mockPrisma as unknown as PrismaClient
      )
    ).rejects.toThrow('Bank connection not found or unauthorized')
  })

  it('should throw error if Miscellaneous category not found', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol Jerusalem',
          status: 'completed' as const,
        },
      ],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.transaction.findMany.mockResolvedValue([])

    mockPrisma.category.findFirst.mockResolvedValue(null) // Category not found!

    // Act & Assert
    await expect(
      importTransactions(
        'conn1',
        'user1',
        new Date('2025-11-01'),
        new Date('2025-11-30'),
        mockPrisma as unknown as PrismaClient
      )
    ).rejects.toThrow('Miscellaneous category not found')
  })

  it('should create new account if none exists', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol Jerusalem',
          status: 'completed' as const,
        },
      ],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)
    vi.mocked(categorizeService.categorizeTransactions).mockResolvedValue([])

    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue(null) // No existing account

    mockPrisma.account.create.mockResolvedValue({
      id: 'acc_new',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking (...1234)',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.transaction.findMany.mockResolvedValue([])

    mockPrisma.category.findFirst.mockResolvedValue({
      id: 'misc',
      userId: null,
      name: 'Miscellaneous',
      icon: null,
      color: null,
      parentId: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        transaction: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx)
    })

    // Act
    const _result = await importTransactions(
      'conn1',
      'user1',
      new Date('2025-11-01'),
      new Date('2025-11-30'),
      mockPrisma as unknown as PrismaClient
    )

    // Assert
    expect(mockPrisma.account.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user1',
        type: 'CHECKING',
        institution: 'First International Bank',
        name: 'First International Bank Checking (...1234)',
      }),
    })
  })

  it('should use default date range if not provided', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Act
    await importTransactions('conn1', 'user1', undefined, undefined, mockPrisma as unknown as PrismaClient)

    // Assert
    expect(bankScraperService.scrapeBank).toHaveBeenCalledWith(
      expect.objectContaining({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted',
      })
    )

    // Verify startDate is approximately 30 days ago
    const call = vi.mocked(bankScraperService.scrapeBank).mock.calls[0]
    const startDate = call?.[0]?.startDate
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    expect(startDate).toBeDefined()
    if (startDate) {
      expect(Math.abs(startDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(1000) // Within 1 second
    }
  })

  it('should handle categorization failures gracefully', async () => {
    // Arrange
    const mockScrapeResult = {
      success: true,
      transactions: [
        {
          date: new Date('2025-11-15'),
          processedDate: new Date('2025-11-15'),
          amount: -127.5,
          description: 'SuperSol Jerusalem',
          status: 'completed' as const,
        },
      ],
      accountNumber: '1234',
    }

    vi.mocked(bankScraperService.scrapeBank).mockResolvedValue(mockScrapeResult)

    // Categorization fails
    vi.mocked(categorizeService.categorizeTransactions).mockRejectedValue(
      new Error('Claude API timeout')
    )

    mockPrisma.bankConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      userId: 'user1',
      bank: 'FIBI',
      accountType: 'CHECKING',
      encryptedCredentials: 'encrypted',
      accountIdentifier: '1234',
      status: 'ACTIVE',
      lastSynced: null,
      lastSuccessfulSync: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.account.findFirst.mockResolvedValue({
      id: 'acc1',
      userId: 'user1',
      type: 'CHECKING',
      name: 'First International Bank Checking',
      institution: 'First International Bank',
      balance: 0 as any, // Prisma returns Decimal type
      currency: 'NIS',
      plaidAccountId: null,
      plaidAccessToken: null,
      isManual: false,
      isActive: true,
      lastSynced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.transaction.findMany.mockResolvedValueOnce([]) // No existing

    mockPrisma.category.findFirst.mockResolvedValue({
      id: 'misc',
      userId: null,
      name: 'Miscellaneous',
      icon: null,
      color: null,
      parentId: null,
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        transaction: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(tx)
    })

    mockPrisma.transaction.findMany.mockResolvedValueOnce([
      {
        id: 'txn1',
        userId: 'user1',
        accountId: 'acc1',
        date: new Date('2025-11-15'),
        amount: -127.5 as any, // Prisma returns Decimal type
        payee: 'SuperSol Jerusalem',
        categoryId: 'misc',
        notes: null,
        tags: [],
        plaidTransactionId: null,
        recurringTransactionId: null,
        isManual: false,
        rawMerchantName: 'SuperSol Jerusalem',
        importSource: 'FIBI',
        importedAt: new Date(),
        categorizedBy: null,
        categorizationConfidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    // Act & Assert - Should throw error (not gracefully handle in this version)
    await expect(
      importTransactions(
        'conn1',
        'user1',
        new Date('2025-11-01'),
        new Date('2025-11-30'),
        mockPrisma as unknown as PrismaClient
      )
    ).rejects.toThrow('Claude API timeout')
  })
})
