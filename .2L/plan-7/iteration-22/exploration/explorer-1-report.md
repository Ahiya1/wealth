# Explorer 1 Report: File Upload & Parsing Architecture

**Iteration:** 22 (Iteration 2 of Plan-7)
**Focus Area:** File Upload & Parsing Architecture
**Date:** 2025-11-30
**Agent:** Explorer-1

---

## Executive Summary

Iteration 22 builds upon the solid chat foundation from Iteration 21 to add file upload and parsing capabilities. The Anthropic SDK already integrated in the codebase supports Claude Vision for PDF parsing via the Messages API document type. The xlsx library (v0.18.5) is already installed as a devDependency and proven in production for exports - we can use it for imports too. The existing duplicate-detection.service.ts provides a robust three-factor matching algorithm that can be extended for import comparison. The transaction-import.service.ts demonstrates proven patterns for batch transaction creation with atomic operations.

**Key Findings:**

- **Claude Vision for PDFs:** Anthropic Messages API supports PDF via base64 encoding in content blocks with `type: "document"` - no external parsing libraries needed
- **CSV/Excel Parsing:** xlsx library already installed (devDependencies) and proven in exports.router.ts - can parse both formats into JSON
- **File Size Limits:** Recommend 10MB for PDFs (Claude API limit), 5MB for CSV/Excel (sufficient for 50,000+ transactions)
- **Duplicate Detection:** Existing service uses three-factor matching (date, amount, merchant) - extend for preview/comparison mode
- **Batch Creation:** transaction-import.service.ts shows atomic batch insert pattern with Prisma $transaction

---

## Iteration Context

### Iteration 22 Scope

**Vision:** "Upload bank statements, get transactions imported automatically"

**Features Covered:**
1. **Feature 3:** File Upload & Parsing (PDF via Claude Vision, CSV, Excel)
2. **Feature 4:** Smart Transaction Comparison (duplicate detection)
3. **Feature 7:** Action Tools (create/update transactions)
4. **Feature 8:** Auto-Categorization (leverage existing service)

**Deliverables:**
- Backend: fileParser.service.ts (PDF/CSV/Excel parsing)
- Backend: Claude Vision integration for PDF table extraction
- Backend: Extend duplicate-detection.service.ts for import comparison
- Backend: Write tools in chat-tools.service.ts:
  - create_transaction (single)
  - create_transactions_batch (bulk with confirmation >5)
  - update_transaction
  - categorize_transactions
- Frontend: FileUploadZone component (drag-drop + file picker)
- Frontend: TransactionPreview component with status badges
- Frontend: ConfirmationDialog for batch operations
- Frontend: Markdown rendering (react-markdown + remark-gfm)
- Validation: File size limits (10MB PDF, 5MB CSV/Excel)
- Validation: Input validation for all write operations

**Success Criteria:**
- User can drag-drop bank statement PDF into chat
- AI extracts transactions with >90% accuracy
- Duplicate detection identifies existing transactions (fuzzy matching)
- Preview shows: NEW (32), DUPLICATE (6), with clear badges
- User can review and confirm before batch import
- Transactions auto-categorized using MerchantCategoryCache
- Works with Israeli banks: FIBI, Leumi, Hapoalim, Discount

---

## Claude Vision for PDF Parsing

### How Claude Vision Works

**Anthropic Messages API Support:**

Claude supports document analysis via the Messages API by encoding PDFs as base64 and passing them in message content blocks with `type: "document"`.

**API Pattern:**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const message = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64String, // Base64 encoded PDF
          },
        },
        {
          type: 'text',
          text: 'Extract all transactions from this bank statement...',
        },
      ],
    },
  ],
})
```

**Key Points:**
- PDFs sent as base64-encoded strings
- `media_type` must be `'application/pdf'`
- Can combine document + text in same message
- Claude Vision analyzes PDF layout, tables, text
- No external PDF parsing library needed (pdfjs, pdf-parse, etc.)

### PDF File Handling

**Browser to Server Flow:**

```typescript
// Frontend: FileUploadZone component
const handleFileUpload = async (file: File) => {
  // 1. Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files supported')
  }
  
  // 2. Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('PDF must be less than 10MB')
  }
  
  // 3. Convert to base64
  const base64 = await fileToBase64(file)
  
  // 4. Send to chat (via SSE stream route)
  await sendMessageWithFile({
    sessionId,
    message: 'Please extract transactions from this bank statement',
    fileContent: base64,
    fileType: 'pdf',
  })
}

// Utility: File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // Remove data URL prefix (data:application/pdf;base64,)
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

**Backend: Parse PDF with Claude Vision**

```typescript
// fileParser.service.ts
export async function parseBankStatementPDF(
  base64Data: string,
  hint?: string // e.g., "FIBI", "Leumi", "Hapoalim"
): Promise<ParsedTransaction[]> {
  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })
  
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
  },
  ...
]

Rules:
- Negative amounts for expenses (money out)
- Positive amounts for income (money in)
- Use YYYY-MM-DD date format
- Extract ALL transactions, don't skip any
- If date is ambiguous, use context from other dates
- Return valid JSON only, no markdown`

  const message = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 8192, // Larger for long statements
    temperature: 0.1, // Low temperature for accuracy
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
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
}

interface ParsedTransaction {
  date: string
  amount: number
  payee: string
  description?: string
  reference?: string
}

function validateParsedTransaction(raw: any): ParsedTransaction {
  // Validate required fields
  if (!raw.date || !raw.amount || !raw.payee) {
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
    reference: raw.reference,
  }
}
```

### Expected Accuracy & Limitations

**Expected Performance:**
- **Standard Bank Statements (FIBI, Leumi, Hapoalim):** 90-95% accuracy
- **Credit Card Statements (Visa CAL, Max, Isracard):** 85-90% accuracy
- **Complex Layouts:** 70-80% accuracy (may require human review)

**Common Errors:**
1. **Date Ambiguity:** DD/MM vs MM/DD formats
2. **Amount Parsing:** Comma vs period as decimal separator
3. **Multi-line Descriptions:** Splitting into multiple transactions
4. **Currency Symbols:** ₪ vs NIS vs ILS
5. **Balance vs Transaction Amount:** Confusing running balance with transaction amount

**Mitigation Strategies:**
1. **Provide Bank Hint:** Pass bank name to guide parsing
2. **Show Preview:** Always show parsed transactions for user confirmation
3. **Confidence Scoring:** Flag low-confidence extractions
4. **User Corrections:** Allow manual edits before import

### File Size Limits

**Claude API Limits:**
- **Maximum File Size:** ~10MB per document
- **Maximum Tokens:** 200,000 tokens (input + output)
- **Practical Limit:** 50-100 page PDFs

**Recommended Limits:**
- **PDF:** 10MB (covers 99% of monthly statements)
- **Multi-month Statements:** Suggest splitting by month
- **Large Files:** Reject with helpful error message

**Validation Pattern:**

```typescript
const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024, // 10MB
  csv: 5 * 1024 * 1024,  // 5MB
  xlsx: 5 * 1024 * 1024, // 5MB
}

function validateFileSize(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const limit = FILE_SIZE_LIMITS[extension as keyof typeof FILE_SIZE_LIMITS]
  
  if (!limit) {
    throw new Error('Unsupported file type')
  }
  
  if (file.size > limit) {
    const limitMB = Math.round(limit / 1024 / 1024)
    throw new Error(`File too large. ${extension.toUpperCase()} files must be less than ${limitMB}MB`)
  }
}
```

---

## CSV & Excel Parsing

### xlsx Library Integration

**Already Installed:**

```json
// package.json line 98
"xlsx": "^0.18.5"  // devDependencies
```

**Proven in Production:**

The xlsx library is already used in `/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/xlsxExport.ts` for exporting transactions to Excel. We can use the same library for imports.

**Key Functions:**
- `XLSX.read(data, options)` - Parse binary file data
- `XLSX.utils.sheet_to_json(sheet)` - Convert sheet to JSON array
- Supports: .xlsx, .xls, .csv formats

### CSV Parsing Pattern

```typescript
// fileParser.service.ts
import * as XLSX from 'xlsx'

export async function parseCSV(
  base64Data: string
): Promise<ParsedTransaction[]> {
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
  
  // 4. Convert to JSON
  const rows = XLSX.utils.sheet_to_json<any>(worksheet)
  
  if (rows.length === 0) {
    throw new Error('No data found in CSV')
  }
  
  // 5. Map columns to transaction fields
  return rows.map(mapCSVRowToTransaction)
}

function mapCSVRowToTransaction(row: any): ParsedTransaction {
  // Common Israeli bank CSV formats
  
  // Format 1: FIBI
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
  
  throw new Error('Unrecognized CSV format. Please use a standard bank export.')
}

function parseIsraeliDate(dateStr: string): string {
  // Handle DD/MM/YYYY or DD.MM.YYYY
  const parts = dateStr.split(/[\/\.]/)
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }
  
  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  const year = parts[2]
  
  return `${year}-${month}-${day}`
}

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
```

### Excel Parsing Pattern

```typescript
export async function parseExcel(
  base64Data: string
): Promise<ParsedTransaction[]> {
  // Same as CSV - xlsx library handles both!
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  const workbook = XLSX.read(bytes, { type: 'array' })
  
  // Excel files may have multiple sheets
  // Try to find the transactions sheet
  const sheetName = findTransactionSheet(workbook.SheetNames)
  const worksheet = workbook.Sheets[sheetName]
  
  const rows = XLSX.utils.sheet_to_json<any>(worksheet)
  
  return rows.map(mapCSVRowToTransaction) // Same mapping logic
}

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
    const found = sheetNames.find(name => 
      name.toLowerCase().includes(common.toLowerCase())
    )
    if (found) return found
  }
  
  // Default to first sheet
  return sheetNames[0]
}
```

### Column Mapping Strategy

**Problem:** Different banks use different column headers and orders.

**Solutions:**

1. **Auto-Detection (Smart Mapping):**

```typescript
function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: -1,
    amount: -1,
    payee: -1,
    description: -1,
  }
  
  // Date column patterns
  const datePatterns = [/date/i, /תאריך/i, /תאריך עסקה/i, /תאריך ערך/i]
  mapping.date = findColumnIndex(headers, datePatterns)
  
  // Amount column patterns
  const amountPatterns = [/amount/i, /sum/i, /סכום/i, /חובה\/זכות/i]
  mapping.amount = findColumnIndex(headers, amountPatterns)
  
  // Payee/Description patterns
  const payeePatterns = [/payee/i, /description/i, /merchant/i, /תיאור/i, /שם בית עסק/i]
  mapping.payee = findColumnIndex(headers, payeePatterns)
  
  return mapping
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    for (const pattern of patterns) {
      if (pattern.test(headers[i])) {
        return i
      }
    }
  }
  return -1
}
```

2. **AI-Assisted Mapping (Use Claude):**

If auto-detection fails, use Claude to suggest mapping:

```typescript
async function suggestColumnMapping(
  headers: string[],
  sampleRows: any[]
): Promise<ColumnMapping> {
  const claude = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })
  
  const prompt = `Analyze this CSV/Excel data and identify which columns contain:
- Transaction date
- Transaction amount
- Payee/merchant name
- Description (if different from payee)

Headers: ${JSON.stringify(headers)}
Sample rows: ${JSON.stringify(sampleRows.slice(0, 3))}

Return JSON:
{
  "date": "column_name_or_index",
  "amount": "column_name_or_index",
  "payee": "column_name_or_index",
  "description": "column_name_or_index"
}`

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 512,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })
  
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  
  return JSON.parse(jsonMatch?.[0] || '{}')
}
```

---

## Duplicate Detection Extension

### Current Implementation Analysis

**Location:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/lib/services/duplicate-detection.service.ts` (117 lines)

**Current Algorithm:**

```typescript
export function isDuplicate(
  newTransaction: DuplicateCheckParams,
  existingTransactions: DuplicateCheckParams[]
): boolean {
  for (const existing of existingTransactions) {
    // Factor 1: Date match (±1 day tolerance)
    const dateDiff = Math.abs(newTransaction.date.getTime() - existing.date.getTime())
    const dateMatch = dateDiff <= 24 * 60 * 60 * 1000
    
    // Factor 2: Amount exact match (within 0.01)
    const amountMatch = Math.abs(newTransaction.amount - existing.amount) < 0.01
    
    // Factor 3: Merchant fuzzy match (70% similarity)
    const merchantMatch = isMerchantSimilar(newTransaction.merchant, existing.merchant)
    
    // All three factors must match
    if (dateMatch && amountMatch && merchantMatch) {
      return true // DUPLICATE
    }
  }
  
  return false // UNIQUE
}
```

**Key Features:**
- Three-factor matching (date, amount, merchant)
- ±1 day tolerance for date (handles timezone/processing delays)
- 0.01 tolerance for amount (floating-point precision)
- 70% similarity threshold for merchant names (Dice coefficient)
- Merchant normalization (lowercase, trim, collapse spaces)

### Extension for Import Comparison

**New Requirements:**

1. **Return match details (not just boolean)**
2. **Categorize matches: EXACT, PROBABLE, POSSIBLE, NEW**
3. **Provide confidence score (0-100%)**
4. **Support bulk comparison (performance optimization)**

**Extended Service:**

```typescript
// duplicate-detection.service.ts (extend existing)

export enum MatchType {
  EXACT = 'EXACT',         // All 3 factors match exactly
  PROBABLE = 'PROBABLE',   // All 3 factors match with tolerance
  POSSIBLE = 'POSSIBLE',   // 2 out of 3 factors match
  NEW = 'NEW',             // No match found
}

export interface ComparisonResult {
  importedTransaction: DuplicateCheckParams
  matchType: MatchType
  confidence: number // 0-100
  matchedTransaction?: DuplicateCheckParams
  matchedTransactionId?: string
  details: {
    dateMatch: boolean
    amountMatch: boolean
    merchantMatch: boolean
    merchantSimilarity?: number
  }
}

export function compareTransactionBatch(
  importedTransactions: DuplicateCheckParams[],
  existingTransactions: Array<DuplicateCheckParams & { id: string }>
): ComparisonResult[] {
  return importedTransactions.map(imported => 
    compareTransaction(imported, existingTransactions)
  )
}

export function compareTransaction(
  imported: DuplicateCheckParams,
  existingTransactions: Array<DuplicateCheckParams & { id: string }>
): ComparisonResult {
  let bestMatch: ComparisonResult | null = null
  let highestConfidence = 0
  
  for (const existing of existingTransactions) {
    const result = evaluateMatch(imported, existing)
    
    if (result.confidence > highestConfidence) {
      highestConfidence = result.confidence
      bestMatch = result
    }
    
    // Early exit on exact match
    if (result.matchType === MatchType.EXACT) {
      break
    }
  }
  
  if (!bestMatch || bestMatch.confidence < 50) {
    return {
      importedTransaction: imported,
      matchType: MatchType.NEW,
      confidence: 0,
      details: {
        dateMatch: false,
        amountMatch: false,
        merchantMatch: false,
      },
    }
  }
  
  return bestMatch
}

function evaluateMatch(
  imported: DuplicateCheckParams,
  existing: DuplicateCheckParams & { id: string }
): ComparisonResult {
  // Factor 1: Date match
  const dateDiff = Math.abs(imported.date.getTime() - existing.date.getTime())
  const dateMatch = dateDiff <= 24 * 60 * 60 * 1000
  const dateExactMatch = dateDiff === 0
  
  // Factor 2: Amount match
  const amountDiff = Math.abs(imported.amount - existing.amount)
  const amountMatch = amountDiff < 0.01
  const amountExactMatch = amountDiff === 0
  
  // Factor 3: Merchant match
  const merchantSimilarity = getMerchantSimilarity(imported.merchant, existing.merchant)
  const merchantMatch = merchantSimilarity >= 0.7
  const merchantExactMatch = merchantSimilarity === 1.0
  
  // Determine match type
  let matchType: MatchType
  let confidence: number
  
  if (dateExactMatch && amountExactMatch && merchantExactMatch) {
    matchType = MatchType.EXACT
    confidence = 100
  } else if (dateMatch && amountMatch && merchantMatch) {
    matchType = MatchType.PROBABLE
    confidence = 85 + (merchantSimilarity - 0.7) * 50 // 85-100%
  } else if (
    (dateMatch && amountMatch) ||
    (dateMatch && merchantMatch) ||
    (amountMatch && merchantMatch)
  ) {
    matchType = MatchType.POSSIBLE
    confidence = 60 + (merchantSimilarity * 20) // 60-80%
  } else {
    matchType = MatchType.NEW
    confidence = 0
  }
  
  return {
    importedTransaction: imported,
    matchType,
    confidence,
    matchedTransaction: existing,
    matchedTransactionId: existing.id,
    details: {
      dateMatch,
      amountMatch,
      merchantMatch,
      merchantSimilarity,
    },
  }
}

function getMerchantSimilarity(merchant1: string, merchant2: string): number {
  const normalized1 = normalizeMerchant(merchant1)
  const normalized2 = normalizeMerchant(merchant2)
  
  if (normalized1 === normalized2) return 1.0
  
  // Use existing compareTwoStrings from string-similarity
  return compareTwoStrings(normalized1, normalized2)
}
```

### Batch Comparison Performance

**Challenge:** Comparing 100 imported transactions against 10,000 existing = 1,000,000 comparisons

**Optimization Strategies:**

1. **Date Range Pre-filtering:**

```typescript
export function compareTransactionBatchOptimized(
  importedTransactions: DuplicateCheckParams[],
  existingTransactions: Array<DuplicateCheckParams & { id: string }>
): ComparisonResult[] {
  return importedTransactions.map(imported => {
    // Filter existing transactions to ±7 days window
    const minDate = new Date(imported.date.getTime() - 7 * 24 * 60 * 60 * 1000)
    const maxDate = new Date(imported.date.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const candidateMatches = existingTransactions.filter(existing => 
      existing.date >= minDate && existing.date <= maxDate
    )
    
    return compareTransaction(imported, candidateMatches)
  })
}
```

2. **Amount Bucketing:**

```typescript
// Pre-process existing transactions into amount buckets
const amountBuckets = new Map<number, Array<DuplicateCheckParams & { id: string }>>()

for (const existing of existingTransactions) {
  const bucket = Math.floor(existing.amount / 10) * 10 // Round to nearest 10
  if (!amountBuckets.has(bucket)) {
    amountBuckets.set(bucket, [])
  }
  amountBuckets.get(bucket)!.push(existing)
}

// When comparing, only check relevant buckets
function findCandidates(imported: DuplicateCheckParams) {
  const bucket = Math.floor(imported.amount / 10) * 10
  const candidates = [
    ...(amountBuckets.get(bucket) || []),
    ...(amountBuckets.get(bucket - 10) || []),
    ...(amountBuckets.get(bucket + 10) || []),
  ]
  return candidates
}
```

### Database Query Pattern

```typescript
// In chat-tools.service.ts
async function loadExistingForComparison(
  userId: string,
  dateRange: { start: Date; end: Date },
  prisma: PrismaClient
): Promise<Array<DuplicateCheckParams & { id: string }>> {
  // Add ±7 days buffer to date range
  const startWithBuffer = new Date(dateRange.start.getTime() - 7 * 24 * 60 * 60 * 1000)
  const endWithBuffer = new Date(dateRange.end.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startWithBuffer,
        lte: endWithBuffer,
      },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      payee: true,
      rawMerchantName: true,
    },
  })
  
  return transactions.map(t => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    merchant: t.rawMerchantName || t.payee,
  }))
}
```

---

## File Upload Patterns

### Browser File Upload

**FileUploadZone Component Pattern:**

```typescript
// src/components/chat/FileUploadZone.tsx
'use client'

import { useState, useCallback } from 'react'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  onFileUpload: (file: File, base64: string) => void
  accept?: string
  maxSize?: number
}

export function FileUploadZone({
  onFileUpload,
  accept = '.pdf,.csv,.xlsx',
  maxSize = 10 * 1024 * 1024,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const handleFile = useCallback(async (file: File) => {
    setError(null)
    
    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = accept.split(',').map(ext => ext.replace('.', ''))
    
    if (!extension || !allowedExtensions.includes(extension)) {
      setError(`Invalid file type. Allowed: ${accept}`)
      return
    }
    
    // Validate file size
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024)
      setError(`File too large. Maximum size: ${maxMB}MB`)
      return
    }
    
    // Convert to base64
    try {
      const base64 = await fileToBase64(file)
      setSelectedFile(file)
      onFileUpload(file, base64)
    } catch (err) {
      setError('Failed to read file')
    }
  }, [accept, maxSize, onFileUpload])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging 
            ? "border-sage-500 bg-sage-50 dark:bg-sage-900/20" 
            : "border-warm-gray-300 dark:border-warm-gray-600 hover:border-sage-400"
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-warm-gray-400" />
        <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mb-2">
          Drag and drop a bank statement, or click to browse
        </p>
        <p className="text-xs text-warm-gray-500">
          Supported: PDF, CSV, Excel (max {Math.round(maxSize / 1024 / 1024)}MB)
        </p>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />
      
      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
          <File className="w-5 h-5 text-sage-600" />
          <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 hover:bg-sage-100 dark:hover:bg-sage-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const base64Data = base64.split(',')[1] // Remove data URL prefix
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

### File Validation

**Comprehensive Validation Pattern:**

```typescript
// fileParser.service.ts
export interface FileValidationResult {
  valid: boolean
  error?: string
  fileType?: 'pdf' | 'csv' | 'xlsx'
  sizeBytes?: number
}

export function validateFile(file: File): FileValidationResult {
  // 1. Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  if (!extension || !['pdf', 'csv', 'xlsx', 'xls'].includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a PDF, CSV, or Excel file.',
    }
  }
  
  // 2. Check MIME type (extension can be spoofed)
  const validMimeTypes = {
    pdf: ['application/pdf'],
    csv: ['text/csv', 'text/plain', 'application/csv'],
    xlsx: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  }
  
  const expectedMimeTypes = validMimeTypes[extension as keyof typeof validMimeTypes]
  if (!expectedMimeTypes?.includes(file.type)) {
    // Allow empty MIME type for CSV (browser inconsistency)
    if (!(extension === 'csv' && file.type === '')) {
      return {
        valid: false,
        error: 'File type mismatch. The file may be corrupted.',
      }
    }
  }
  
  // 3. Check file size
  const maxSizes = {
    pdf: 10 * 1024 * 1024,  // 10MB
    csv: 5 * 1024 * 1024,   // 5MB
    xlsx: 5 * 1024 * 1024,  // 5MB
  }
  
  const maxSize = maxSizes[extension as keyof typeof maxSizes]
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024)
    return {
      valid: false,
      error: `File too large. ${extension.toUpperCase()} files must be less than ${maxMB}MB.`,
    }
  }
  
  // 4. Check minimum size (avoid empty files)
  if (file.size < 100) {
    return {
      valid: false,
      error: 'File is too small. It may be empty or corrupted.',
    }
  }
  
  return {
    valid: true,
    fileType: extension as 'pdf' | 'csv' | 'xlsx',
    sizeBytes: file.size,
  }
}
```

### Storage Approach

**Option 1: Base64 in Memory (RECOMMENDED for Iteration 22)**

**Pros:**
- Simple implementation
- No storage infrastructure needed
- Works with SSE streaming

**Cons:**
- Limited to ~10MB files (acceptable for bank statements)
- Higher memory usage during processing

**Pattern:**

```typescript
// Chat message with file
await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    message: 'Extract transactions from this statement',
    file: {
      name: file.name,
      type: file.type,
      size: file.size,
      base64Data, // Full base64 string
    },
  }),
})
```

**Option 2: Temporary Blob Storage (Future Enhancement)**

**Pros:**
- Supports larger files (100MB+)
- Lower memory footprint
- Can store for multi-step processing

**Cons:**
- Requires Vercel Blob storage setup
- More complex implementation
- Cleanup logic needed

**Pattern:**

```typescript
// Upload to blob storage first
const blob = await put(`temp/${userId}/${sessionId}/${file.name}`, file, {
  access: 'private',
  addRandomSuffix: true,
})

// Pass blob URL to chat
await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    message: 'Extract transactions from this statement',
    file: {
      blobUrl: blob.url,
      name: file.name,
      type: file.type,
    },
  }),
})

// In backend, fetch from blob and delete after processing
const response = await fetch(blobUrl)
const arrayBuffer = await response.arrayBuffer()
// ... process ...
await del(blobUrl) // Cleanup
```

**Recommendation for Iteration 22:** Use Option 1 (base64 in memory). Vercel Blob storage can be added in a future iteration if needed for larger files or audit trail.

---

## Recommended Implementation

### Step-by-Step Implementation Plan

#### Phase 1: File Parser Service (4-5 hours)

**File:** `src/lib/fileParser.service.ts`

**Tasks:**
1. Create file parser service with 3 parsing functions:
   - `parseBankStatementPDF(base64Data, hint?)` - Claude Vision
   - `parseCSV(base64Data)` - xlsx library
   - `parseExcel(base64Data)` - xlsx library
2. Implement validation functions:
   - `validateParsedTransaction(raw)` - Field validation
   - `validateFile(file)` - Type and size validation
3. Add helper functions:
   - `fileToBase64(file)` - Browser-side conversion
   - `mapCSVRowToTransaction(row)` - Column mapping
   - `detectColumnMapping(headers)` - Auto-detection
4. Handle Israeli bank formats:
   - FIBI: Hebrew column names
   - Leumi: DD/MM/YYYY date format
   - Hapoalim: Comma as decimal separator
   - Discount: Mixed Hebrew/English

**Code Structure:**

```typescript
// src/lib/fileParser.service.ts

export interface ParsedTransaction {
  date: string          // YYYY-MM-DD
  amount: number        // Negative for expenses
  payee: string
  description?: string
  reference?: string
}

export async function parseFile(
  base64Data: string,
  fileType: 'pdf' | 'csv' | 'xlsx',
  hint?: string
): Promise<ParsedTransaction[]> {
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

// ... implementation functions from patterns above
```

#### Phase 2: Extend Duplicate Detection (2-3 hours)

**File:** `src/lib/services/duplicate-detection.service.ts`

**Tasks:**
1. Add new types:
   - `MatchType` enum (EXACT, PROBABLE, POSSIBLE, NEW)
   - `ComparisonResult` interface
2. Implement new functions:
   - `compareTransactionBatch(imported, existing)` - Bulk comparison
   - `compareTransaction(imported, existing)` - Single comparison
   - `evaluateMatch(imported, existing)` - Match scoring
   - `getMerchantSimilarity(m1, m2)` - Wrapper for compareTwoStrings
3. Keep existing exports unchanged (backward compatibility)
4. Add performance optimizations (date range filtering, amount bucketing)

**Integration Points:**
- Used by chat-tools.service.ts in `compare_with_existing` tool
- Provides preview data for TransactionPreview component

#### Phase 3: Chat Tools - Write Operations (6-7 hours)

**File:** `src/server/services/chat-tools.service.ts` (extend existing from Iteration 21)

**New Tools to Add:**

1. **parse_file** - Parse uploaded file

```typescript
{
  name: 'parse_file',
  description: 'Parse transactions from uploaded bank statement (PDF, CSV, or Excel)',
  input_schema: {
    type: 'object',
    properties: {
      fileContent: { type: 'string', description: 'Base64 encoded file data' },
      fileType: { type: 'string', enum: ['pdf', 'csv', 'xlsx'] },
      hint: { type: 'string', description: 'Bank name hint for better parsing (optional)' },
    },
    required: ['fileContent', 'fileType'],
  },
}

async function parseFileTool(input: any, userId: string) {
  const transactions = await parseFile(
    input.fileContent,
    input.fileType,
    input.hint
  )
  
  return {
    content: JSON.stringify({
      success: true,
      count: transactions.length,
      transactions,
    }),
  }
}
```

2. **compare_with_existing** - Deduplicate imported transactions

```typescript
{
  name: 'compare_with_existing',
  description: 'Compare imported transactions with existing data to identify duplicates',
  input_schema: {
    type: 'object',
    properties: {
      transactions: { 
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            amount: { type: 'number' },
            payee: { type: 'string' },
          },
        },
      },
    },
    required: ['transactions'],
  },
}

async function compareWithExistingTool(input: any, userId: string, prisma: PrismaClient) {
  // Convert to DuplicateCheckParams format
  const imported = input.transactions.map((t: any) => ({
    date: new Date(t.date),
    amount: t.amount,
    merchant: t.payee,
  }))
  
  // Determine date range
  const dates = imported.map((t: any) => t.date.getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  
  // Load existing transactions
  const existing = await loadExistingForComparison(
    userId,
    { start: minDate, end: maxDate },
    prisma
  )
  
  // Compare
  const results = compareTransactionBatch(imported, existing)
  
  // Summarize
  const summary = {
    total: results.length,
    new: results.filter(r => r.matchType === MatchType.NEW).length,
    exact: results.filter(r => r.matchType === MatchType.EXACT).length,
    probable: results.filter(r => r.matchType === MatchType.PROBABLE).length,
    possible: results.filter(r => r.matchType === MatchType.POSSIBLE).length,
  }
  
  return {
    content: JSON.stringify({ summary, results }),
  }
}
```

3. **create_transaction** - Single transaction creation

```typescript
{
  name: 'create_transaction',
  description: 'Create a single transaction',
  input_schema: {
    type: 'object',
    properties: {
      accountId: { type: 'string' },
      date: { type: 'string', format: 'date' },
      amount: { type: 'number' },
      payee: { type: 'string' },
      categoryId: { type: 'string', description: 'Optional category ID' },
      notes: { type: 'string' },
    },
    required: ['accountId', 'date', 'amount', 'payee'],
  },
}

async function createTransactionTool(input: any, userId: string, prisma: PrismaClient) {
  // Validate account ownership
  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
  })
  
  if (!account || account.userId !== userId) {
    throw new Error('Account not found')
  }
  
  // Get category (default to Miscellaneous if not provided)
  let categoryId = input.categoryId
  if (!categoryId) {
    const miscCategory = await prisma.category.findFirst({
      where: { name: 'Miscellaneous', isDefault: true },
    })
    categoryId = miscCategory?.id
  }
  
  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      date: new Date(input.date),
      amount: input.amount,
      payee: input.payee,
      categoryId: categoryId!,
      notes: input.notes,
      isManual: false, // Created by AI
      categorizedBy: 'AI_SUGGESTED',
      tags: [],
    },
  })
  
  // Update account balance
  await prisma.account.update({
    where: { id: input.accountId },
    data: {
      balance: { increment: input.amount },
    },
  })
  
  return {
    content: JSON.stringify({
      success: true,
      transactionId: transaction.id,
    }),
  }
}
```

4. **create_transactions_batch** - Bulk import (requires confirmation if >5)

```typescript
{
  name: 'create_transactions_batch',
  description: 'Import multiple transactions at once. Requires user confirmation if count > 5.',
  input_schema: {
    type: 'object',
    properties: {
      accountId: { type: 'string' },
      transactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            amount: { type: 'number' },
            payee: { type: 'string' },
            description: { type: 'string' },
            categoryId: { type: 'string' },
          },
        },
      },
      confirmationRequired: { type: 'boolean', default: true },
    },
    required: ['accountId', 'transactions'],
  },
}

async function createTransactionsBatchTool(
  input: any, 
  userId: string, 
  prisma: PrismaClient
) {
  // Validation
  if (input.transactions.length > 5 && !input.confirmationRequired) {
    return {
      content: JSON.stringify({
        error: 'Batch import of >5 transactions requires user confirmation',
        requiresConfirmation: true,
        count: input.transactions.length,
      }),
    }
  }
  
  // Validate account
  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
  })
  
  if (!account || account.userId !== userId) {
    throw new Error('Account not found')
  }
  
  // Get default category
  const miscCategory = await prisma.category.findFirst({
    where: { name: 'Miscellaneous', isDefault: true },
  })
  
  // Batch insert (atomic)
  const result = await prisma.$transaction(async (tx) => {
    // Create transactions
    const created = await tx.transaction.createMany({
      data: input.transactions.map((t: any) => ({
        userId,
        accountId: input.accountId,
        date: new Date(t.date),
        amount: t.amount,
        payee: t.payee,
        categoryId: t.categoryId || miscCategory!.id,
        notes: t.description,
        rawMerchantName: t.payee,
        isManual: false,
        importSource: 'MANUAL', // Changed from FIBI/CAL
        importedAt: new Date(),
        categorizedBy: t.categoryId ? 'AI_SUGGESTED' : null,
        tags: [],
      })),
    })
    
    // Update account balance
    const totalAmount = input.transactions.reduce(
      (sum: number, t: any) => sum + t.amount,
      0
    )
    
    await tx.account.update({
      where: { id: input.accountId },
      data: {
        balance: { increment: totalAmount },
      },
    })
    
    return created.count
  })
  
  // Auto-categorize newly imported transactions
  const newTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      accountId: input.accountId,
      importedAt: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
      categoryId: miscCategory!.id,
    },
  })
  
  const categorized = await categorizeImportedTransactions(
    newTransactions,
    userId,
    prisma
  )
  
  return {
    content: JSON.stringify({
      success: true,
      imported: result,
      categorized,
    }),
  }
}
```

5. **update_transaction** - Modify existing transaction

```typescript
{
  name: 'update_transaction',
  description: 'Update an existing transaction',
  input_schema: {
    type: 'object',
    properties: {
      transactionId: { type: 'string' },
      changes: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          payee: { type: 'string' },
          categoryId: { type: 'string' },
          date: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    required: ['transactionId', 'changes'],
  },
}

async function updateTransactionTool(input: any, userId: string, prisma: PrismaClient) {
  // Validate ownership
  const existing = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
  })
  
  if (!existing || existing.userId !== userId) {
    throw new Error('Transaction not found')
  }
  
  // If amount changes, update account balance
  let balanceDelta = 0
  if (input.changes.amount !== undefined) {
    balanceDelta = input.changes.amount - Number(existing.amount)
  }
  
  // Update transaction and balance atomically
  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: input.transactionId },
      data: {
        ...input.changes,
        ...(input.changes.date && { date: new Date(input.changes.date) }),
      },
    }),
    ...(balanceDelta !== 0
      ? [
          prisma.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: balanceDelta } },
          }),
        ]
      : []),
  ])
  
  return {
    content: JSON.stringify({ success: true }),
  }
}
```

6. **categorize_transactions** - Bulk re-categorization

```typescript
{
  name: 'categorize_transactions',
  description: 'Re-categorize multiple transactions using AI',
  input_schema: {
    type: 'object',
    properties: {
      transactionIds: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['transactionIds'],
  },
}

async function categorizeTransactionsTool(
  input: any,
  userId: string,
  prisma: PrismaClient
) {
  // Load transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: input.transactionIds },
      userId, // Security: verify ownership
    },
    select: {
      id: true,
      payee: true,
      rawMerchantName: true,
      amount: true,
    },
  })
  
  // Call existing categorization service
  const results = await categorizeTransactions(
    userId,
    transactions.map(t => ({
      id: t.id,
      payee: t.rawMerchantName || t.payee,
      amount: Number(t.amount),
    })),
    prisma
  )
  
  // Update transactions with categories
  const updates = results
    .filter(r => r.categoryId)
    .map(r =>
      prisma.transaction.update({
        where: { id: r.transactionId },
        data: {
          categoryId: r.categoryId!,
          categorizedBy: r.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED',
          categorizationConfidence: r.confidence === 'high' ? 'HIGH' : 'MEDIUM',
        },
      })
    )
  
  await Promise.all(updates)
  
  return {
    content: JSON.stringify({
      success: true,
      categorized: updates.length,
      results,
    }),
  }
}
```

#### Phase 4: Frontend Components (5-6 hours)

**Components to Create:**

1. **FileUploadZone.tsx** (150-200 lines)
   - Drag-and-drop area
   - File picker fallback
   - Validation feedback
   - File preview

2. **TransactionPreview.tsx** (200-250 lines)
   - Table view of parsed transactions
   - Status badges (NEW, DUPLICATE, PROBABLE)
   - Edit capability
   - Checkboxes for selection
   - Summary stats

```typescript
// src/components/chat/TransactionPreview.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MatchType } from '@/lib/services/duplicate-detection.service'

interface TransactionPreviewProps {
  transactions: Array<{
    date: string
    amount: number
    payee: string
    matchType: MatchType
    confidence: number
  }>
  onConfirm: (selectedIds: number[]) => void
}

export function TransactionPreview({ transactions, onConfirm }: TransactionPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(transactions.map((_, i) => i).filter((_, i) => 
      transactions[i].matchType === MatchType.NEW
    ))
  )
  
  const summary = {
    new: transactions.filter(t => t.matchType === MatchType.NEW).length,
    exact: transactions.filter(t => t.matchType === MatchType.EXACT).length,
    probable: transactions.filter(t => t.matchType === MatchType.PROBABLE).length,
    possible: transactions.filter(t => t.matchType === MatchType.POSSIBLE).length,
  }
  
  return (
    <Card className="p-4 space-y-4">
      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="default" className="bg-green-500">
          {summary.new} New
        </Badge>
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          {summary.probable} Probable Duplicate
        </Badge>
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          {summary.possible} Possible Duplicate
        </Badge>
        <Badge variant="outline" className="border-red-500 text-red-600">
          {summary.exact} Exact Duplicate
        </Badge>
      </div>
      
      {/* Transaction list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transactions.map((txn, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20"
          >
            <Checkbox
              checked={selected.has(i)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selected)
                if (checked) {
                  newSelected.add(i)
                } else {
                  newSelected.delete(i)
                }
                setSelected(newSelected)
              }}
              disabled={txn.matchType === MatchType.EXACT}
            />
            
            <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
              <span>{txn.date}</span>
              <span className={txn.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                ₪{Math.abs(txn.amount).toFixed(2)}
              </span>
              <span className="truncate">{txn.payee}</span>
              <div>
                {txn.matchType === MatchType.NEW && (
                  <Badge variant="default" className="bg-green-500">New</Badge>
                )}
                {txn.matchType === MatchType.EXACT && (
                  <Badge variant="outline" className="border-red-500">Duplicate</Badge>
                )}
                {txn.matchType === MatchType.PROBABLE && (
                  <Badge variant="outline" className="border-yellow-500">
                    {txn.confidence}% match
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-warm-gray-600">
          {selected.size} transactions selected
        </p>
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
          className="px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50"
        >
          Import {selected.size} Transactions
        </button>
      </div>
    </Card>
  )
}
```

3. **ConfirmationDialog.tsx** (100-150 lines)
   - Modal for batch operations
   - Clear summary
   - Confirm/Cancel buttons

```typescript
// src/components/chat/ConfirmationDialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  count?: number
  onConfirm: () => void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  count,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {count && (
              <div className="mt-2 p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
                <span className="font-semibold text-sage-700 dark:text-sage-300">
                  {count} transactions
                </span>
                {' '}will be created.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm Import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

4. **Integrate into ChatInput.tsx** (modify existing)
   - Add FileUploadZone above input
   - Handle file uploads in message flow
   - Show loading state during parsing

#### Phase 5: Markdown Rendering (1-2 hours)

**Install Dependencies:**

```json
// package.json (add to dependencies)
"react-markdown": "^9.0.0",
"remark-gfm": "^4.0.0"
```

**MarkdownRenderer Component:**

```typescript
// src/components/chat/MarkdownRenderer.tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom renderers for better styling
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full" {...props} />
            </div>
          ),
          code: ({ node, inline, ...props }) => (
            inline ? (
              <code className="px-1 py-0.5 bg-warm-gray-100 dark:bg-warm-gray-800 rounded" {...props} />
            ) : (
              <code className="block p-3 bg-warm-gray-100 dark:bg-warm-gray-800 rounded-lg overflow-x-auto" {...props} />
            )
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

**Update ChatMessage.tsx:**

```typescript
// Use MarkdownRenderer instead of plain text
<MarkdownRenderer content={message.content} />
```

---

## Integration with Existing Services

### Leverage Existing Categorization Service

**Current Service:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/services/categorize.service.ts`

**Key Functions:**
- `categorizeTransactions(userId, transactions, prisma)` - Batch categorization
- `getMerchantCategoryFromCache(merchant, prisma)` - Cache lookup
- `cacheMerchantCategory(merchant, categoryId, prisma)` - Cache update

**Integration Pattern:**

```typescript
// In create_transactions_batch tool
async function categorizeImportedTransactions(
  transactions: Array<{ id: string; rawMerchantName: string | null; payee: string; amount: any }>,
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  if (transactions.length === 0) return 0
  
  // Prepare for categorization
  const txnsToCategorize = transactions.map(t => ({
    id: t.id,
    payee: t.rawMerchantName || t.payee,
    amount: Number(t.amount),
  }))
  
  // Call existing categorization service
  const results = await categorizeTransactions(userId, txnsToCategorize, prisma)
  
  // Batch update transactions with categories
  const updates = results
    .filter(r => r.categoryId !== null)
    .map(r =>
      prisma.transaction.update({
        where: { id: r.transactionId },
        data: {
          categoryId: r.categoryId!,
          categorizedBy: r.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED',
          categorizationConfidence: r.confidence === 'high' ? 'HIGH' : 'MEDIUM',
        },
      })
    )
  
  await Promise.all(updates)
  
  return updates.length
}
```

**Expected Performance:**
- **Cache Hit Rate:** 70-80% (from existing MerchantCategoryCache)
- **API Calls:** Only for 20-30% uncached merchants
- **Cost:** ~$0.001 per uncached transaction
- **Speed:** <2s for 50 transactions (mostly cache hits)

### Extend Transaction Import Service Patterns

**Current Service:** `/home/ahiya/Ahiya/2L/Prod/wealth/src/server/services/transaction-import.service.ts`

**Proven Patterns:**
1. **Atomic Batch Insert:** Use `prisma.$transaction` for createMany + account balance update
2. **Duplicate Detection:** Three-factor matching (already implemented)
3. **Auto-Categorization:** Batch categorization after import
4. **Budget Alerts:** Check alerts after categorization

**Reuse Pattern:**

```typescript
// In create_transactions_batch tool
async function insertTransactionsBatch(
  transactions: ParsedTransaction[],
  userId: string,
  accountId: string,
  prisma: PrismaClient
): Promise<number> {
  // Get Miscellaneous category for initial import
  const miscCategory = await prisma.category.findFirst({
    where: { name: 'Miscellaneous', isDefault: true },
  })
  
  if (!miscCategory) {
    throw new Error('Miscellaneous category not found')
  }
  
  // Atomic transaction: insert + update balance
  const result = await prisma.$transaction(async (tx) => {
    // Batch insert
    const insertResult = await tx.transaction.createMany({
      data: transactions.map(t => ({
        userId,
        accountId,
        date: new Date(t.date),
        amount: t.amount,
        payee: t.payee,
        rawMerchantName: t.payee,
        categoryId: miscCategory.id,
        notes: t.description,
        importSource: 'MANUAL', // From chat upload
        importedAt: new Date(),
        isManual: false,
        tags: [],
      })),
      skipDuplicates: true,
    })
    
    // Update account balance
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: { increment: totalAmount },
        lastSynced: new Date(),
      },
    })
    
    return insertResult.count
  })
  
  return result
}
```

---

## Testing Strategy

### Unit Tests

**File Parser Tests:**

```typescript
// src/lib/__tests__/fileParser.service.test.ts
import { parseCSV, parseExcel, validateParsedTransaction } from '../fileParser.service'

describe('fileParser.service', () => {
  describe('parseCSV', () => {
    it('parses standard CSV with English headers', async () => {
      const csv = `Date,Amount,Description
2025-11-01,-50.00,SuperSol
2025-11-02,1500.00,Salary`
      
      const base64 = Buffer.from(csv).toString('base64')
      const result = await parseCSV(base64)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: '2025-11-01',
        amount: -50.00,
        payee: 'SuperSol',
      })
    })
    
    it('handles Israeli bank CSV with Hebrew headers', async () => {
      const csv = `תאריך,סכום,תיאור
01/11/2025,-50.00,סופרסול
02/11/2025,1500.00,משכורת`
      
      const base64 = Buffer.from(csv, 'utf-8').toString('base64')
      const result = await parseCSV(base64)
      
      expect(result).toHaveLength(2)
    })
  })
  
  describe('validateParsedTransaction', () => {
    it('accepts valid transaction', () => {
      const valid = {
        date: '2025-11-15',
        amount: -127.50,
        payee: 'Test Merchant',
      }
      
      expect(() => validateParsedTransaction(valid)).not.toThrow()
    })
    
    it('rejects invalid date format', () => {
      const invalid = {
        date: '15/11/2025', // Wrong format
        amount: -127.50,
        payee: 'Test',
      }
      
      expect(() => validateParsedTransaction(invalid)).toThrow('Invalid date format')
    })
  })
})
```

**Duplicate Detection Tests:**

```typescript
// src/lib/services/__tests__/duplicate-detection.service.test.ts (extend existing)
import { compareTransaction, MatchType } from '../duplicate-detection.service'

describe('duplicate-detection.service (extended)', () => {
  describe('compareTransaction', () => {
    const existing = [
      {
        id: 'txn_1',
        date: new Date('2025-11-15'),
        amount: -127.50,
        merchant: 'SuperSol Jerusalem',
      },
    ]
    
    it('identifies exact match', () => {
      const imported = {
        date: new Date('2025-11-15'),
        amount: -127.50,
        merchant: 'SuperSol Jerusalem',
      }
      
      const result = compareTransaction(imported, existing)
      
      expect(result.matchType).toBe(MatchType.EXACT)
      expect(result.confidence).toBe(100)
    })
    
    it('identifies probable match with fuzzy merchant name', () => {
      const imported = {
        date: new Date('2025-11-15'),
        amount: -127.50,
        merchant: 'SuperSol JLM', // Similar but not exact
      }
      
      const result = compareTransaction(imported, existing)
      
      expect(result.matchType).toBe(MatchType.PROBABLE)
      expect(result.confidence).toBeGreaterThan(85)
    })
    
    it('identifies new transaction', () => {
      const imported = {
        date: new Date('2025-11-20'),
        amount: -200.00,
        merchant: 'Different Store',
      }
      
      const result = compareTransaction(imported, existing)
      
      expect(result.matchType).toBe(MatchType.NEW)
      expect(result.confidence).toBe(0)
    })
  })
})
```

### Integration Tests

**Tool Execution Tests:**

```typescript
// src/server/services/__tests__/chat-tools.service.test.ts (extend)
describe('chat-tools.service (write operations)', () => {
  describe('create_transaction tool', () => {
    it('creates transaction and updates balance', async () => {
      // Setup test user and account
      const user = await createTestUser()
      const account = await createTestAccount(user.id)
      
      // Execute tool
      const result = await executeToolCall(
        'create_transaction',
        {
          accountId: account.id,
          date: '2025-11-15',
          amount: -50.00,
          payee: 'Test Merchant',
        },
        user.id,
        prisma
      )
      
      // Verify transaction created
      const transaction = await prisma.transaction.findFirst({
        where: { userId: user.id, payee: 'Test Merchant' },
      })
      expect(transaction).not.toBeNull()
      
      // Verify balance updated
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      })
      expect(updatedAccount?.balance).toBe(account.balance - 50.00)
    })
    
    it('rejects unauthorized account access', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()
      const account = await createTestAccount(user2.id)
      
      await expect(
        executeToolCall(
          'create_transaction',
          { accountId: account.id, date: '2025-11-15', amount: -50, payee: 'Test' },
          user1.id, // Different user!
          prisma
        )
      ).rejects.toThrow('Account not found')
    })
  })
  
  describe('create_transactions_batch tool', () => {
    it('requires confirmation for >5 transactions', async () => {
      const user = await createTestUser()
      const account = await createTestAccount(user.id)
      
      const result = await executeToolCall(
        'create_transactions_batch',
        {
          accountId: account.id,
          transactions: Array(10).fill({
            date: '2025-11-15',
            amount: -50,
            payee: 'Test',
          }),
          confirmationRequired: false, // Not confirmed!
        },
        user.id,
        prisma
      )
      
      const parsed = JSON.parse(result.content)
      expect(parsed.requiresConfirmation).toBe(true)
    })
  })
})
```

---

## Risks & Challenges

### HIGH Risk: PDF Parsing Accuracy

**Challenge:**
- Israeli bank statements have varied layouts
- Hebrew text direction (RTL)
- Mixed Hebrew/English in same statement
- Multi-page statements with continued tables

**Mitigation:**
1. **Always show preview** - User can catch errors before import
2. **Confidence scoring** - Flag low-confidence extractions
3. **Bank hints** - Pass bank name to improve parsing
4. **User corrections** - Allow editing before import
5. **Fallback to CSV** - Suggest CSV export if PDF fails

### MEDIUM Risk: Duplicate Detection False Positives

**Challenge:**
- Recurring transactions (same merchant, same amount)
- Similar amounts on same day
- Merchant name variations

**Mitigation:**
1. **Show confidence scores** - Let user judge
2. **Manual override** - Allow user to mark as duplicate/new
3. **Reference number matching** - Use if available
4. **Date tolerance** - ±1 day handles most cases

### MEDIUM Risk: File Size Limits

**Challenge:**
- Users may have 6-12 month statements
- Credit card statements can be 100+ pages
- Excel files with formulas/formatting

**Mitigation:**
1. **Clear error messages** - "PDF too large. Please split by month."
2. **Suggest splitting** - "Try uploading January-June separately"
3. **CSV alternative** - "For large files, export as CSV instead"

### LOW Risk: Performance

**Challenge:**
- Parsing 500 transactions takes time
- Comparison against 10,000 existing transactions
- API calls for categorization

**Mitigation:**
1. **Streaming updates** - Show progress during processing
2. **Optimized comparison** - Date range + amount bucketing
3. **Batch categorization** - 50 transactions at a time
4. **Cache hits** - 70-80% from MerchantCategoryCache

---

## Summary

**Implementation Readiness: HIGH**

The codebase provides excellent foundations for file upload and parsing:

1. **Claude Vision:** Anthropic SDK supports PDF via base64 document type - no new libraries needed
2. **CSV/Excel:** xlsx library already installed and proven in exports - reuse for imports
3. **Duplicate Detection:** Solid three-factor algorithm exists - extend for comparison mode
4. **Batch Creation:** transaction-import.service.ts shows atomic insert pattern
5. **Categorization:** Existing service with 70-80% cache hit rate - ready to use

**Key Success Factors:**
1. Always show preview before import (catch parsing errors)
2. Provide confidence scores for duplicates (let user judge)
3. Use atomic transactions for batch operations (data consistency)
4. Leverage existing categorization service (proven, cached)
5. Implement file validation from Day 1 (security, UX)

**Estimated Effort:** 18-22 hours (matches master plan)

**Dependencies:**
- react-markdown: ^9.0.0 (NEW - add to package.json)
- remark-gfm: ^4.0.0 (NEW - add to package.json)
- All other dependencies already installed

**Next Steps:**
1. Planner creates detailed builder tasks
2. Builder-1: File parser service + duplicate detection extension
3. Builder-2: Chat tools (write operations)
4. Builder-3: Frontend components (FileUploadZone, TransactionPreview, ConfirmationDialog)
5. Integration: Connect all pieces in chat flow

---

**Report Status:** COMPLETE
**Next Step:** Planner synthesizes explorer reports into implementation plan
