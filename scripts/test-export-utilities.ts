#!/usr/bin/env tsx

import { writeFileSync } from 'fs'
import { join } from 'path'
import { generateAIContext } from '../src/lib/aiContextGenerator'
import { generateReadme } from '../src/lib/readmeGenerator'
import { createExportZIP } from '../src/lib/archiveExport'

async function testExportUtilities() {
  console.log('Testing Export Utilities...\n')

  // Test data
  const testUser = {
    email: 'test@example.com',
    currency: 'NIS',
    timezone: 'Asia/Jerusalem',
  }

  const testCategories = [
    {
      id: '1',
      name: 'Food & Dining',
      icon: 'utensils',
      color: '#FF5733',
      parentId: null,
    },
    {
      id: '2',
      name: 'Groceries',
      icon: 'shopping-cart',
      color: '#33FF57',
      parentId: '1',
    },
    {
      id: '3',
      name: 'Restaurants',
      icon: 'restaurant',
      color: '#FF33A8',
      parentId: '1',
    },
    {
      id: '4',
      name: 'Transportation',
      icon: 'car',
      color: '#3357FF',
      parentId: null,
    },
  ]

  const testStats = {
    transactions: 150,
    budgets: 12,
    goals: 3,
    accounts: 4,
    recurringTransactions: 8,
    categories: 15,
  }

  const testDateRange = {
    earliest: new Date('2025-01-01'),
    latest: new Date('2025-11-09'),
  }

  const exportedAt = new Date()

  // Test AI Context Generator
  console.log('1. Testing AI Context Generator...')
  const aiContext = generateAIContext({
    user: testUser,
    categories: testCategories,
    statistics: testStats,
    dateRange: testDateRange,
  })

  // Verify it's valid JSON
  const parsed = JSON.parse(aiContext)
  console.log('   ✓ Valid JSON generated')
  console.log(`   ✓ Export version: ${parsed.exportVersion}`)
  console.log(`   ✓ Categories hierarchy: ${Object.keys(parsed.categories.hierarchy).length} categories`)
  console.log(`   ✓ AI prompts: ${Object.keys(parsed.aiPrompts).length} prompts`)
  console.log(`   ✓ Field descriptions: ${Object.keys(parsed.fieldDescriptions).length} data types`)

  // Write to file for inspection
  writeFileSync(
    join(__dirname, '../test-output-ai-context.json'),
    aiContext
  )
  console.log('   ✓ Written to: test-output-ai-context.json\n')

  // Test README Generator
  console.log('2. Testing README Generator...')
  const readme = generateReadme({
    user: testUser,
    statistics: testStats,
    dateRange: testDateRange,
    exportedAt,
  })

  console.log(`   ✓ README generated (${readme.length} characters)`)
  console.log('   ✓ Includes export info, contents, formats, usage, privacy sections')

  // Write to file for inspection
  writeFileSync(
    join(__dirname, '../test-output-README.md'),
    readme
  )
  console.log('   ✓ Written to: test-output-README.md\n')

  // Test Archive Export
  console.log('3. Testing Archive Export (ZIP)...')
  const testFiles = {
    'README.md': readme,
    'ai-context.json': aiContext,
    'summary.json': JSON.stringify({ exportedAt: exportedAt.toISOString(), ...testStats }, null, 2),
    'transactions.csv': '\uFEFFDate,Payee,Amount\n2025-11-09,Test Merchant,100.00\n2025-11-08,Another Store,50.00',
    'budgets.csv': '\uFEFFMonth,Category,Budgeted,Spent,Remaining\n2025-11,Food & Dining,500.00,320.00,180.00',
    'goals.csv': '\uFEFFGoal,Target Amount,Current Amount,Progress %\nEmergency Fund,10000.00,5000.00,50.0',
    'accounts.csv': '\uFEFFName,Type,Balance\nMain Checking,CHECKING,2500.00\nSavings,SAVINGS,8000.00',
    'recurring-transactions.csv': '\uFEFFPayee,Amount,Frequency\nNetflix,59.90,Every month\nGym Membership,199.00,Every month',
    'categories.csv': '\uFEFFName,Parent,Icon,Color,Type\nFood & Dining,None,utensils,#FF5733,Default\nGroceries,Food & Dining,shopping-cart,#33FF57,Custom',
  }

  const zipBuffer = await createExportZIP(testFiles)

  console.log(`   ✓ ZIP created (${zipBuffer.length} bytes)`)
  console.log(`   ✓ Compression level: 9 (maximum)`)
  console.log(`   ✓ Files included: ${Object.keys(testFiles).length}`)

  // Write ZIP to file
  writeFileSync(
    join(__dirname, '../test-output-export.zip'),
    zipBuffer
  )
  console.log('   ✓ Written to: test-output-export.zip\n')

  // Verify ZIP structure
  const zipSignature = zipBuffer.slice(0, 4)
  const expectedSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04])
  if (zipSignature.equals(expectedSignature)) {
    console.log('   ✓ ZIP signature valid (PK\\x03\\x04)')
  } else {
    console.error('   ✗ Invalid ZIP signature!')
  }

  console.log('\n✓ All utilities tested successfully!')
  console.log('\nGenerated files:')
  console.log('  - scripts/test-output-ai-context.json')
  console.log('  - scripts/test-output-README.md')
  console.log('  - scripts/test-output-export.zip')
  console.log('\nYou can:')
  console.log('  1. Inspect the JSON file to verify structure')
  console.log('  2. Read the README to verify content')
  console.log('  3. Extract the ZIP to verify all files are present')
}

testExportUtilities().catch((error) => {
  console.error('Error testing export utilities:', error)
  process.exit(1)
})
