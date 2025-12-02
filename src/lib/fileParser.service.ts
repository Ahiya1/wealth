import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

// ============================================================================
// Constants
// ============================================================================

const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024, // 10MB
  csv: 5 * 1024 * 1024, // 5MB
  xlsx: 5 * 1024 * 1024, // 5MB
} as const

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ============================================================================
// Types
// ============================================================================

export interface ParsedTransaction {
  date: string // YYYY-MM-DD format
  amount: number // Negative for expenses
  payee: string
  description?: string
  reference?: string
}

export type FileType = 'pdf' | 'csv' | 'xlsx'

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Parse a file and extract transactions
 *
 * Routes to appropriate parser based on file type
 *
 * @param base64Data - Base64 encoded file content
 * @param fileType - Type of file (pdf, csv, xlsx)
 * @param hint - Optional hint for PDF parsing (e.g., "FIBI", "Leumi")
 * @returns Array of parsed transactions
 *
 * @throws Error if file is too large, empty, or invalid format
 */
export async function parseFile(
  base64Data: string,
  fileType: FileType,
  hint?: string
): Promise<ParsedTransaction[]> {
  // Validate file size
  const bytes = Buffer.from(base64Data, 'base64')
  const limit = FILE_SIZE_LIMITS[fileType]

  if (bytes.length > limit) {
    const limitMB = Math.round(limit / 1024 / 1024)
    throw new Error(
      `File too large. ${fileType.toUpperCase()} files must be less than ${limitMB}MB.`
    )
  }

  if (bytes.length < 100) {
    throw new Error('File is too small. It may be empty or corrupted.')
  }

  // Route to appropriate parser
  switch (fileType) {
    case 'pdf':
      return parseBankStatementPDF(base64Data, hint)
    case 'csv':
      return parseCSV(base64Data)
    case 'xlsx':
      return parseExcel(base64Data)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// ============================================================================
// PDF Parsing with Claude Vision
// ============================================================================

/**
 * Parse bank statement PDF using Claude Vision
 *
 * Uses Claude Sonnet 4.5 with document type for accurate extraction
 * of transaction data from PDF statements
 *
 * @param base64Data - Base64 encoded PDF content
 * @param hint - Optional bank name hint (e.g., "FIBI", "Leumi", "Hapoalim")
 * @returns Array of parsed transactions
 *
 * @throws Error if Claude API fails or response is invalid
 */
export async function parseBankStatementPDF(
  base64Data: string,
  hint?: string
): Promise<ParsedTransaction[]> {
  const prompt = `Extract all transactions from this ${hint || 'Israeli'} bank statement PDF.

For each transaction, extract:
- Date (YYYY-MM-DD format)
- Amount (numeric, negative for expenses, positive for income)
- Payee/Merchant name
- Description (if different from payee)
- Reference number (if available)

Return JSON array:
[
  {
    "date": "2025-11-15",
    "amount": -127.50,
    "payee": "SuperSol Jerusalem",
    "description": "Groceries",
    "reference": "123456"
  }
]

Rules:
- Negative amounts for expenses (money out)
- Positive amounts for income (money in)
- Use YYYY-MM-DD date format
- Extract ALL transactions, don't skip any
- If date is ambiguous, use context from other dates
- Return valid JSON only, no markdown`

  try {
    const message = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192, // Larger for long statements
      temperature: 0.1, // Low temperature for accuracy
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'application/pdf' as any, // PDF support not yet in SDK types
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    // Extract JSON from response
    const firstBlock = message.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error('No text content in Claude response')
    }

    const responseText = firstBlock.text

    // Extract JSON array (might be in markdown code block)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const transactions = JSON.parse(jsonMatch[0])

    // Validate and normalize
    return transactions.map(validateParsedTransaction)
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(
      'Failed to extract transactions. Try exporting as CSV.'
    )
  }
}

// ============================================================================
// CSV/Excel Parsing
// ============================================================================

/**
 * Parse CSV file and extract transactions
 *
 * Supports multiple formats:
 * - Hebrew headers (תאריך, סכום, תיאור)
 * - English headers (Date, Amount, Description)
 * - No headers (column indices)
 *
 * @param base64Data - Base64 encoded CSV content
 * @returns Array of parsed transactions
 *
 * @throws Error if CSV is empty or has unrecognized format
 */
export async function parseCSV(base64Data: string): Promise<ParsedTransaction[]> {
  try {
    // 1. Decode base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 2. Parse with xlsx (handles CSV too!)
    const workbook = XLSX.read(bytes, { type: 'array' })

    // 3. Get first sheet
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('CSV file is empty')
    }

    const worksheet = workbook.Sheets[firstSheetName]
    if (!worksheet) {
      throw new Error('CSV file is empty')
    }

    // 4. Convert to JSON
    const rows = XLSX.utils.sheet_to_json<any>(worksheet)

    if (rows.length === 0) {
      throw new Error('No data found in CSV')
    }

    // 5. Map columns to transaction fields
    return rows.map(mapCSVRowToTransaction)
  } catch (error) {
    console.error('CSV parsing error:', error)
    if (error instanceof Error && error.message.includes('CSV file is empty')) {
      throw error
    }
    if (error instanceof Error && error.message.includes('No data found in CSV')) {
      throw error
    }
    if (
      error instanceof Error &&
      error.message.includes('Unrecognized CSV format')
    ) {
      throw error
    }
    throw new Error('Failed to parse CSV file. Please check the format.')
  }
}

/**
 * Parse Excel file and extract transactions
 *
 * Automatically finds the transactions sheet if multiple sheets exist
 *
 * @param base64Data - Base64 encoded Excel content
 * @returns Array of parsed transactions
 *
 * @throws Error if Excel is empty or has unrecognized format
 */
export async function parseExcel(
  base64Data: string
): Promise<ParsedTransaction[]> {
  try {
    // Same implementation as parseCSV (xlsx handles both!)
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const workbook = XLSX.read(bytes, { type: 'array' })

    // Excel files may have multiple sheets - find transactions sheet
    const sheetName = findTransactionSheet(workbook.SheetNames)
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error('Excel file is empty or sheet not found')
    }

    const rows = XLSX.utils.sheet_to_json<any>(worksheet)

    if (rows.length === 0) {
      throw new Error('No data found in Excel file')
    }

    return rows.map(mapCSVRowToTransaction)
  } catch (error) {
    console.error('Excel parsing error:', error)
    if (
      error instanceof Error &&
      error.message.includes('No data found in Excel')
    ) {
      throw error
    }
    if (
      error instanceof Error &&
      error.message.includes('Unrecognized CSV format')
    ) {
      throw error
    }
    throw new Error('Failed to parse Excel file. Please check the format.')
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map CSV row to ParsedTransaction
 *
 * Supports multiple column formats:
 * - FIBI (Hebrew headers): תאריך, סכום, תיאור
 * - Standard English: Date, Amount, Description
 * - No headers: Column indices (0, 1, 2)
 *
 * @param row - Raw CSV row object
 * @returns ParsedTransaction
 *
 * @throws Error if row format is not recognized
 */
function mapCSVRowToTransaction(row: any): ParsedTransaction {
  // Format 1: FIBI (Hebrew headers)
  if (row['תאריך'] && row['סכום'] && row['תיאור']) {
    return {
      date: parseIsraeliDate(row['תאריך']),
      amount: parseAmount(row['סכום']),
      payee: row['תיאור'],
      description: row['פרטים נוספים'] || row['תיאור'],
    }
  }

  // Format 2: Standard English headers
  if (row.Date && row.Amount && row.Description) {
    return {
      date: parseDate(row.Date),
      amount: parseAmount(row.Amount),
      payee: row.Description,
      description: row.Details || row.Description,
      reference: row.Reference || row['Ref #'],
    }
  }

  // Format 3: Column numbers (no headers)
  if (row['0'] && row['1'] && row['2']) {
    return {
      date: parseDate(row['0']),
      amount: parseAmount(row['1']),
      payee: row['2'],
      description: row['3'] || row['2'],
    }
  }

  throw new Error(
    'Unrecognized CSV format. Please use a standard bank export.'
  )
}

/**
 * Parse Israeli date format (DD/MM/YYYY or DD.MM.YYYY)
 *
 * @param dateStr - Date string in DD/MM/YYYY or DD.MM.YYYY format
 * @returns ISO 8601 date string (YYYY-MM-DD)
 *
 * @throws Error if date format is invalid
 */
function parseIsraeliDate(dateStr: string): string {
  // Handle DD/MM/YYYY or DD.MM.YYYY
  const parts = dateStr.split(/[\/\.]/)
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }

  const day = parts[0]?.padStart(2, '0') || ''
  const month = parts[1]?.padStart(2, '0') || ''
  const year = parts[2] || ''

  return `${year}-${month}-${day}`
}

/**
 * Parse date string in various formats
 *
 * Supports: ISO 8601, DD/MM/YYYY, MM/DD/YYYY
 *
 * @param dateStr - Date string
 * @returns ISO 8601 date string (YYYY-MM-DD)
 *
 * @throws Error if date is invalid
 */
function parseDate(dateStr: string): string {
  // Try multiple formats
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Parse amount string with various formats
 *
 * Handles:
 * - Currency symbols (₪, $, €, £)
 * - Thousands separators (,)
 * - Negative notation with parentheses: (100) → -100
 *
 * @param amountStr - Amount string or number
 * @returns Numeric amount
 *
 * @throws Error if amount is invalid
 */
function parseAmount(amountStr: string | number): number {
  if (typeof amountStr === 'number') {
    return amountStr
  }

  // Remove currency symbols, thousands separators
  const cleaned = amountStr
    .replace(/[₪$€£,\s]/g, '')
    .replace('(', '-') // Parentheses for negative
    .replace(')', '')

  const amount = parseFloat(cleaned)

  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`)
  }

  return amount
}

/**
 * Find the transactions sheet in a workbook
 *
 * Looks for common sheet names in Hebrew and English
 *
 * @param sheetNames - Array of sheet names
 * @returns Name of transactions sheet (defaults to first sheet)
 */
function findTransactionSheet(sheetNames: string[]): string {
  // Look for common sheet names
  const commonNames = [
    'transactions',
    'תנועות',
    'עסקאות',
    'sheet1',
    'דף1',
  ]

  for (const common of commonNames) {
    const found = sheetNames.find((name) =>
      name.toLowerCase().includes(common.toLowerCase())
    )
    if (found) return found
  }

  // Default to first sheet
  return sheetNames[0] || ''
}

/**
 * Validate and normalize a parsed transaction
 *
 * Ensures required fields are present and in correct format
 *
 * @param raw - Raw transaction object
 * @returns Validated ParsedTransaction
 *
 * @throws Error if validation fails
 */
export function validateParsedTransaction(raw: any): ParsedTransaction {
  // Validate required fields
  if (!raw.date || raw.amount === undefined || raw.amount === null || !raw.payee) {
    throw new Error('Invalid transaction: missing required fields')
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(raw.date)) {
    throw new Error(`Invalid date format: ${raw.date}`)
  }

  // Validate amount is numeric
  if (typeof raw.amount !== 'number') {
    throw new Error(`Invalid amount: ${raw.amount}`)
  }

  return {
    date: raw.date,
    amount: raw.amount,
    payee: raw.payee,
    description: raw.description || raw.payee,
    reference: raw.reference || undefined,
  }
}
