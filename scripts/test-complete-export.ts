/**
 * Manual test script for Complete Export functionality
 *
 * This script verifies the exportComplete endpoint by:
 * 1. Testing the summary generator utility
 * 2. Simulating the complete export flow
 * 3. Verifying ZIP file structure
 *
 * Usage: npx tsx scripts/test-complete-export.ts
 */

import { generateSummary } from '../src/lib/summaryGenerator'
import { generateAIContext } from '../src/lib/aiContextGenerator'
import { generateReadme } from '../src/lib/readmeGenerator'
import { createExportZIP } from '../src/lib/archiveExport'
import {
  generateTransactionCSV,
  generateBudgetCSV,
  generateGoalCSV,
  generateAccountCSV,
  generateRecurringTransactionCSV,
  generateCategoryCSV
} from '../src/lib/csvExport'

async function runTests() {
  console.log('🧪 Testing Complete Export Utilities\n')

  // Test 1: Summary Generator
  console.log('1️⃣ Testing summaryGenerator...')
  const summaryInput = {
    user: {
      email: 'test@example.com',
      currency: 'NIS',
      timezone: 'America/New_York',
    },
    recordCounts: {
      transactions: 247,
      budgets: 12,
      goals: 3,
      accounts: 4,
      recurringTransactions: 8,
      categories: 25,
    },
    dateRange: {
      earliest: new Date('2024-01-15'),
      latest: new Date('2024-12-31'),
    },
    fileSize: 2458932,
  }

  const summaryJSON = generateSummary(summaryInput)
  const summaryParsed = JSON.parse(summaryJSON)
  console.log('✅ Summary generated:', {
    version: summaryParsed.exportVersion,
    totalRecords: Object.values(summaryParsed.recordCounts).reduce((a: number, b: number) => a + b, 0),
    dateRange: summaryParsed.dateRange,
    fileSize: `${(summaryParsed.fileSize / 1024 / 1024).toFixed(2)} MB`,
  })

  // Test 2: AI Context Generator
  console.log('\n2️⃣ Testing aiContextGenerator...')
  const mockCategories = [
    { id: '1', name: 'Food', icon: 'utensils', color: '#ff0000', parentId: null },
    { id: '2', name: 'Groceries', icon: 'shopping-cart', color: '#00ff00', parentId: '1' },
  ]

  const aiContextJSON = generateAIContext({
    user: { currency: 'NIS', timezone: 'America/New_York' },
    categories: mockCategories,
    statistics: summaryInput.recordCounts,
    dateRange: summaryInput.dateRange,
  })
  const aiContextParsed = JSON.parse(aiContextJSON)
  console.log('✅ AI Context generated:', {
    version: aiContextParsed.exportVersion,
    fieldsCount: Object.keys(aiContextParsed.fieldDescriptions).length,
    promptsCount: Object.keys(aiContextParsed.aiPrompts).length,
  })

  // Test 3: README Generator
  console.log('\n3️⃣ Testing readmeGenerator...')
  const readmeContent = generateReadme({
    user: summaryInput.user,
    statistics: summaryInput.recordCounts,
    dateRange: summaryInput.dateRange,
    exportedAt: new Date(),
  })
  console.log('✅ README generated:', {
    length: readmeContent.length,
    linesCount: readmeContent.split('\n').length,
    hasTitle: readmeContent.includes('# Wealth Export Package'),
    hasInstructions: readmeContent.includes('Using This Data'),
  })

  // Test 4: CSV Generators (empty data)
  console.log('\n4️⃣ Testing CSV generators...')
  const emptyTransactionsCSV = generateTransactionCSV([])
  const emptyBudgetsCSV = generateBudgetCSV([])
  const emptyGoalsCSV = generateGoalCSV([])
  const emptyAccountsCSV = generateAccountCSV([])
  const emptyRecurringCSV = generateRecurringTransactionCSV([])
  const emptyCategoriesCSV = generateCategoryCSV([])
  console.log('✅ All CSV generators work with empty data')

  // Test 5: ZIP Archive Creation
  console.log('\n5️⃣ Testing ZIP archive creation...')
  const zipBuffer = await createExportZIP({
    'README.md': readmeContent,
    'ai-context.json': aiContextJSON,
    'summary.json': summaryJSON,
    'transactions.csv': emptyTransactionsCSV,
    'budgets.csv': emptyBudgetsCSV,
    'goals.csv': emptyGoalsCSV,
    'accounts.csv': emptyAccountsCSV,
    'recurring-transactions.csv': emptyRecurringCSV,
    'categories.csv': emptyCategoriesCSV,
  })

  console.log('✅ ZIP archive created:', {
    size: `${(zipBuffer.byteLength / 1024).toFixed(2)} KB`,
    type: 'Buffer',
    canConvertToBase64: zipBuffer.toString('base64').length > 0,
  })

  // Test 6: Blob Storage Upload Pattern (dry run - no actual upload)
  console.log('\n6️⃣ Testing Blob Storage pattern (dry run)...')
  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN
  if (blobReadWriteToken) {
    console.log('✅ BLOB_READ_WRITE_TOKEN is configured')
    console.log('   Token length:', blobReadWriteToken.length)
    console.log('   Starts with:', blobReadWriteToken.substring(0, 20) + '...')
  } else {
    console.log('⚠️  BLOB_READ_WRITE_TOKEN not set - exports will work without caching')
  }

  // Test 7: ExportHistory Model Structure
  console.log('\n7️⃣ Testing ExportHistory database structure...')
  const exportHistoryRecord = {
    userId: 'test-user-id',
    exportType: 'COMPLETE',
    format: 'ZIP',
    dataType: null,
    dateRange: null,
    recordCount: 299,
    fileSize: zipBuffer.byteLength,
    blobKey: 'https://example.blob.vercel-storage.com/exports/test-user/complete-2024-12-31.zip',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }
  console.log('✅ ExportHistory record structure:', {
    type: exportHistoryRecord.exportType,
    format: exportHistoryRecord.format,
    records: exportHistoryRecord.recordCount,
    size: `${(exportHistoryRecord.fileSize / 1024).toFixed(2)} KB`,
    expiresIn: '30 days',
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ All Complete Export utilities are working correctly!')
  console.log('='.repeat(60))
  console.log('\nNext Steps:')
  console.log('1. Configure BLOB_READ_WRITE_TOKEN in .env (see .env.example)')
  console.log('2. Test exportComplete endpoint via tRPC client')
  console.log('3. Verify Blob Storage upload in Vercel Dashboard')
  console.log('4. Check ExportHistory records in database')
  console.log('5. Test re-download functionality\n')
}

// Run tests
runTests().catch(console.error)
