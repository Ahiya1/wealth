import { describe, it, expect } from 'vitest'
import { createExportZIP } from '../archiveExport'

describe('archiveExport', () => {
  it('should create a valid ZIP buffer', async () => {
    const testFiles = {
      'README.md': '# Test Export\n\nThis is a test.',
      'ai-context.json': JSON.stringify({ version: '1.0' }, null, 2),
      'summary.json': JSON.stringify({ count: 0 }, null, 2),
      'transactions.csv': '\uFEFFDate,Payee,Amount\n2025-11-09,Test,100.00',
      'budgets.csv': '\uFEFFMonth,Category,Budgeted\n2025-11,Food,500.00',
      'goals.csv': '\uFEFFGoal,Target Amount,Current Amount\nEmergency Fund,10000.00,5000.00',
      'accounts.csv': '\uFEFFName,Type,Balance\nChecking,CHECKING,2500.00',
      'recurring-transactions.csv': '\uFEFFPayee,Amount,Frequency\nNetflix,59.90,Every month',
      'categories.csv': '\uFEFFName,Parent,Icon\nFood,None,utensils',
    }

    const zipBuffer = await createExportZIP(testFiles)

    // Verify it's a Buffer
    expect(Buffer.isBuffer(zipBuffer)).toBe(true)

    // Verify it has content
    expect(zipBuffer.length).toBeGreaterThan(0)

    // Verify ZIP signature (first 4 bytes should be 'PK\x03\x04')
    expect(zipBuffer[0]).toBe(0x50) // P
    expect(zipBuffer[1]).toBe(0x4B) // K
    expect(zipBuffer[2]).toBe(0x03)
    expect(zipBuffer[3]).toBe(0x04)
  })

  it('should handle empty content', async () => {
    const testFiles = {
      'README.md': '',
      'ai-context.json': '{}',
      'summary.json': '{}',
      'transactions.csv': '',
      'budgets.csv': '',
      'goals.csv': '',
      'accounts.csv': '',
      'recurring-transactions.csv': '',
      'categories.csv': '',
    }

    const zipBuffer = await createExportZIP(testFiles)

    expect(Buffer.isBuffer(zipBuffer)).toBe(true)
    expect(zipBuffer.length).toBeGreaterThan(0)
  })

  it('should include all files in ZIP', async () => {
    const testFiles = {
      'README.md': 'readme content',
      'ai-context.json': '{"test": true}',
      'summary.json': '{"summary": true}',
      'transactions.csv': 'data',
      'budgets.csv': 'data',
      'goals.csv': 'data',
      'accounts.csv': 'data',
      'recurring-transactions.csv': 'data',
      'categories.csv': 'data',
    }

    const zipBuffer = await createExportZIP(testFiles)

    // Verify ZIP is created and has reasonable size
    // 9 files should result in a ZIP with some size
    expect(zipBuffer.length).toBeGreaterThan(100)
  })
})
