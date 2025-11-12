// scripts/test-cleanup-cron.ts
// Manual test script for cleanup cron job
import { prisma } from '@/lib/prisma'

async function testCleanupCron() {
  console.log('Testing cleanup cron job...')

  // Step 1: Create a test export record with expired date
  const testExport = await prisma.exportHistory.create({
    data: {
      userId: 'test-user-id',
      exportType: 'QUICK',
      format: 'CSV',
      dataType: 'TRANSACTIONS',
      recordCount: 100,
      fileSize: 1024,
      blobKey: null, // No actual blob for testing
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
    },
  })

  console.log('Created test export:', testExport.id)

  // Step 2: Query expired exports (same as cron job)
  const expiredExports = await prisma.exportHistory.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  console.log(`Found ${expiredExports.length} expired exports`)

  // Step 3: Simulate deletion
  console.log('Simulating deletion...')
  const deleteResult = await prisma.exportHistory.deleteMany({
    where: {
      id: { in: expiredExports.map((e) => e.id) },
    },
  })

  console.log(`Deleted ${deleteResult.count} expired exports`)

  // Step 4: Verify deletion
  const remainingExpired = await prisma.exportHistory.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  console.log(`Remaining expired exports: ${remainingExpired.length}`)

  console.log('Test complete!')
}

testCleanupCron()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })
