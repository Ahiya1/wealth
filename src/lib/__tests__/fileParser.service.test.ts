import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseCSV,
  parseExcel,
  validateParsedTransaction,
  type ParsedTransaction,
} from '../fileParser.service'

// Mock xlsx library
vi.mock('xlsx', () => {
  const mockRead = vi.fn()
  const mockSheetToJson = vi.fn()

  return {
    default: {
      read: mockRead,
      utils: {
        sheet_to_json: mockSheetToJson,
      },
    },
    read: mockRead,
    utils: {
      sheet_to_json: mockSheetToJson,
    },
  }
})

const XLSX = await import('xlsx')
const mockRead = XLSX.read as any
const mockSheetToJson = XLSX.utils.sheet_to_json as any

describe('fileParser.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseCSV', () => {
    it('parses standard CSV with English headers', async () => {
      const csv = `Date,Amount,Description
2025-11-01,-50.00,SuperSol
2025-11-02,1500.00,Salary`

      const mockRows = [
        { Date: '2025-11-01', Amount: '-50.00', Description: 'SuperSol' },
        { Date: '2025-11-02', Amount: '1500.00', Description: 'Salary' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const base64 = Buffer.from(csv).toString('base64')
      const result = await parseCSV(base64)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: '2025-11-01',
        amount: -50.0,
        payee: 'SuperSol',
      })
      expect(result[1]).toMatchObject({
        date: '2025-11-02',
        amount: 1500.0,
        payee: 'Salary',
      })
    })

    it('handles Israeli bank CSV with Hebrew headers', async () => {
      const mockRows = [
        { תאריך: '01/11/2025', סכום: '-50.00', תיאור: 'סופרסול' },
        { תאריך: '02/11/2025', סכום: '1500.00', תיאור: 'משכורת' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseCSV('dGVzdA==') // dummy base64

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: '2025-11-01',
        amount: -50.0,
        payee: 'סופרסול',
      })
    })

    it('handles amounts with currency symbols', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '₪50.00', Description: 'Test' },
        { Date: '2025-11-02', Amount: '$100.50', Description: 'Test2' },
        { Date: '2025-11-03', Amount: '€75.25', Description: 'Test3' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseCSV('dGVzdA==')

      expect(result[0].amount).toBe(50.0)
      expect(result[1].amount).toBe(100.5)
      expect(result[2].amount).toBe(75.25)
    })

    it('handles negative amounts with parentheses', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '(100.00)', Description: 'Test' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseCSV('dGVzdA==')

      expect(result[0].amount).toBe(-100.0)
    })

    it('handles amounts with thousands separators', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '1,234.56', Description: 'Test' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseCSV('dGVzdA==')

      expect(result[0].amount).toBe(1234.56)
    })

    it('throws error for empty CSV', async () => {
      mockRead.mockReturnValue({
        SheetNames: [],
        Sheets: {},
      } as any)

      await expect(parseCSV('dGVzdA==')).rejects.toThrow('CSV file is empty')
    })

    it('throws error for CSV with no data rows', async () => {
      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue([])

      await expect(parseCSV('dGVzdA==')).rejects.toThrow('No data found in CSV')
    })

    it('throws error for unrecognized format', async () => {
      const mockRows = [
        { UnknownColumn: 'value', AnotherColumn: 'value2' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      await expect(parseCSV('dGVzdA==')).rejects.toThrow(
        'Unrecognized CSV format'
      )
    })
  })

  describe('parseExcel', () => {
    it('parses Excel file with multiple sheets', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '-50.00', Description: 'SuperSol' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['Summary', 'Transactions', 'Details'],
        Sheets: {
          Summary: {},
          Transactions: {},
          Details: {},
        },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseExcel('dGVzdA==')

      expect(result).toHaveLength(1)
      expect(result[0].payee).toBe('SuperSol')
    })

    it('finds transactions sheet with Hebrew name', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '-50.00', Description: 'Test' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['סיכום', 'תנועות', 'פרטים'],
        Sheets: {
          סיכום: {},
          תנועות: {},
          פרטים: {},
        },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseExcel('dGVzdA==')

      expect(result).toHaveLength(1)
    })

    it('defaults to first sheet if no transaction sheet found', async () => {
      const mockRows = [
        { Date: '2025-11-01', Amount: '-50.00', Description: 'Test' },
      ]

      mockRead.mockReturnValue({
        SheetNames: ['RandomName'],
        Sheets: { RandomName: {} },
      } as any)

      mockSheetToJson.mockReturnValue(mockRows)

      const result = await parseExcel('dGVzdA==')

      expect(result).toHaveLength(1)
    })
  })

  describe('validateParsedTransaction', () => {
    it('accepts valid transaction', () => {
      const valid: ParsedTransaction = {
        date: '2025-11-15',
        amount: -127.5,
        payee: 'Test Merchant',
        description: 'Test description',
      }

      expect(() => validateParsedTransaction(valid)).not.toThrow()
    })

    it('accepts transaction without optional fields', () => {
      const valid = {
        date: '2025-11-15',
        amount: -127.5,
        payee: 'Test Merchant',
      }

      const result = validateParsedTransaction(valid)

      expect(result.description).toBe('Test Merchant') // Defaults to payee
    })

    it('rejects transaction with missing date', () => {
      const invalid = {
        amount: -127.5,
        payee: 'Test',
      }

      expect(() => validateParsedTransaction(invalid)).toThrow(
        'Invalid transaction: missing required fields'
      )
    })

    it('rejects transaction with missing amount', () => {
      const invalid = {
        date: '2025-11-15',
        payee: 'Test',
      }

      expect(() => validateParsedTransaction(invalid)).toThrow(
        'Invalid transaction: missing required fields'
      )
    })

    it('rejects transaction with missing payee', () => {
      const invalid = {
        date: '2025-11-15',
        amount: -127.5,
      }

      expect(() => validateParsedTransaction(invalid)).toThrow(
        'Invalid transaction: missing required fields'
      )
    })

    it('rejects invalid date format', () => {
      const invalid = {
        date: '15/11/2025', // Wrong format
        amount: -127.5,
        payee: 'Test',
      }

      expect(() => validateParsedTransaction(invalid)).toThrow(
        'Invalid date format'
      )
    })

    it('rejects non-numeric amount', () => {
      const invalid = {
        date: '2025-11-15',
        amount: 'not a number',
        payee: 'Test',
      }

      expect(() => validateParsedTransaction(invalid)).toThrow(
        'Invalid amount'
      )
    })

    it('accepts zero amount', () => {
      const valid = {
        date: '2025-11-15',
        amount: 0,
        payee: 'Test',
        description: 'Test',
      }

      expect(() => validateParsedTransaction(valid)).not.toThrow()
    })

    it('accepts positive amount', () => {
      const valid = {
        date: '2025-11-15',
        amount: 1500.0,
        payee: 'Salary',
      }

      const result = validateParsedTransaction(valid)

      expect(result.amount).toBe(1500.0)
    })

    it('preserves reference number if provided', () => {
      const valid = {
        date: '2025-11-15',
        amount: -127.5,
        payee: 'Test',
        reference: 'REF123456',
      }

      const result = validateParsedTransaction(valid)

      expect(result.reference).toBe('REF123456')
    })
  })
})
