import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeBank, BankScraperError } from '../bank-scraper.service'
import * as israeliBankScrapers from 'israeli-bank-scrapers'
import * as encryption from '@/lib/encryption'

// Mock israeli-bank-scrapers
vi.mock('israeli-bank-scrapers', () => ({
  createScraper: vi.fn(),
  CompanyTypes: {
    otsarHahayal: 'otsar_hahayal',
    visaCal: 'visa_cal',
  },
}))

// Mock encryption module
vi.mock('@/lib/encryption', () => ({
  decryptBankCredentials: vi.fn(),
}))

describe('bank-scraper.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for decryptBankCredentials
    vi.mocked(encryption.decryptBankCredentials).mockReturnValue({
      userId: '12345678',
      password: 'testpass123',
    })
  })

  describe('scrapeBank', () => {
    it('should successfully scrape FIBI transactions', async () => {
      // Mock scraper result
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              accountNumber: '1234567890',
              balance: 5000,
              txns: [
                {
                  date: '2024-01-15',
                  processedDate: '2024-01-15',
                  chargedAmount: 127.5,
                  description: 'SuperSal',
                  memo: 'Grocery shopping',
                  status: 'completed',
                },
                {
                  date: '2024-01-16',
                  processedDate: '2024-01-16',
                  chargedAmount: 50.0,
                  description: 'Coffee',
                  memo: '',
                  status: 'completed',
                },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      // Execute
      const result = await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(2)
      expect(result.transactions[0].description).toBe('SuperSal')
      expect(result.transactions[0].amount).toBe(127.5)
      expect(result.accountNumber).toBe('1234567890')
      expect(result.balance).toBe(5000)
    })

    it('should successfully scrape Visa CAL transactions', async () => {
      // Mock scraper result
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              accountNumber: '****1234',
              txns: [
                {
                  date: '2024-01-15',
                  processedDate: '2024-01-15',
                  chargedAmount: -200.0, // Credit card transactions are negative
                  description: 'Amazon',
                  memo: '',
                  status: 'completed',
                },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      // Execute
      const result = await scrapeBank({
        bank: 'VISA_CAL',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].amount).toBe(-200.0)
      expect(result.accountNumber).toBe('****1234')
    })

    it('should throw BankScraperError for invalid credentials', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'INVALID_PASSWORD',
          errorMessage: 'Wrong password',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toThrow(BankScraperError)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'INVALID_CREDENTIALS',
        message: expect.stringContaining('Invalid username or password'),
      })
    })

    it('should throw BankScraperError for password expired', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'CHANGE_PASSWORD',
          errorMessage: 'Password expired',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'PASSWORD_EXPIRED',
        message: expect.stringContaining('password has expired'),
      })
    })

    it('should throw BankScraperError for account blocked', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'ACCOUNT_BLOCKED',
          errorMessage: 'Account blocked',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'ACCOUNT_BLOCKED',
        message: expect.stringContaining('Account locked'),
      })
    })

    it('should skip pending transactions', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              txns: [
                {
                  status: 'completed',
                  chargedAmount: 100,
                  description: 'Completed Txn',
                  date: '2024-01-15',
                  processedDate: '2024-01-15',
                },
                {
                  status: 'pending',
                  chargedAmount: 50,
                  description: 'Pending Txn',
                  date: '2024-01-16',
                  processedDate: '2024-01-16',
                },
                {
                  status: 'completed',
                  chargedAmount: 75,
                  description: 'Another Completed',
                  date: '2024-01-17',
                  processedDate: '2024-01-17',
                },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      const result = await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      expect(result.transactions).toHaveLength(2)
      expect(result.transactions[0].description).toBe('Completed Txn')
      expect(result.transactions[1].description).toBe('Another Completed')
    })

    it('should handle network errors', async () => {
      const mockScraper = {
        scrape: vi.fn().mockRejectedValue(new Error('Network timeout')),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'NETWORK_ERROR',
        message: expect.stringContaining('Failed to connect'),
      })
    })

    it('should handle timeout errors', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'TIMEOUT',
          errorMessage: 'Connection timeout',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'NETWORK_ERROR',
        message: expect.stringContaining('timed out'),
      })
    })

    it('should handle unknown error types', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'UNKNOWN_WEIRD_ERROR',
          errorMessage: 'Something went wrong',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'SCRAPER_BROKEN',
      })
    })

    it('should pass OTP to scraper when provided', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              txns: [
                {
                  status: 'completed',
                  chargedAmount: 100,
                  description: 'Test',
                  date: '2024-01-15',
                  processedDate: '2024-01-15',
                },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
        otp: '123456',
      })

      expect(mockScraper.scrape).toHaveBeenCalledWith(
        expect.objectContaining({
          otp: '123456',
        })
      )
    })

    it('should handle empty accounts array', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      const result = await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(0)
      expect(result.accountNumber).toBeUndefined()
      expect(result.balance).toBeUndefined()
    })

    it('should use default date range if not provided', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [{ txns: [] }],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper as any)

      await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      expect(israeliBankScrapers.createScraper).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
        })
      )
    })
  })
})
