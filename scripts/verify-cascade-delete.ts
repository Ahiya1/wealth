import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyCascadeDelete() {
  console.log('🔍 Verifying cascade delete behavior...\n')

  try {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-cascade-${Date.now()}@example.com`,
        name: 'Test Cascade User',
      },
    })
    console.log('✓ Created test user:', user.id)

    // Create a bank connection
    const connection = await prisma.bankConnection.create({
      data: {
        userId: user.id,
        bank: 'FIBI',
        accountType: 'CHECKING',
        encryptedCredentials: 'test-encrypted-data',
        accountIdentifier: '1234',
        status: 'ACTIVE',
      },
    })
    console.log('✓ Created bank connection:', connection.id)

    // Create sync logs
    const syncLog1 = await prisma.syncLog.create({
      data: {
        bankConnectionId: connection.id,
        startedAt: new Date(),
        status: 'SUCCESS',
        transactionsImported: 10,
      },
    })
    console.log('✓ Created sync log 1:', syncLog1.id)

    const syncLog2 = await prisma.syncLog.create({
      data: {
        bankConnectionId: connection.id,
        startedAt: new Date(),
        status: 'FAILED',
        errorDetails: 'Test error',
      },
    })
    console.log('✓ Created sync log 2:', syncLog2.id)

    // Verify sync logs exist
    const logsBeforeDelete = await prisma.syncLog.findMany({
      where: { bankConnectionId: connection.id },
    })
    console.log(`✓ Found ${logsBeforeDelete.length} sync logs before delete\n`)

    // Delete bank connection (should cascade to sync logs)
    console.log('🗑️  Deleting bank connection...')
    await prisma.bankConnection.delete({
      where: { id: connection.id },
    })
    console.log('✓ Bank connection deleted\n')

    // Verify sync logs were cascade deleted
    const logsAfterDelete = await prisma.syncLog.findMany({
      where: {
        id: {
          in: [syncLog1.id, syncLog2.id],
        },
      },
    })
    console.log(`📊 Sync logs after delete: ${logsAfterDelete.length}`)

    if (logsAfterDelete.length === 0) {
      console.log('✅ CASCADE DELETE VERIFIED: Sync logs were automatically deleted')
    } else {
      console.log('❌ CASCADE DELETE FAILED: Sync logs still exist')
      process.exit(1)
    }

    // Clean up test user
    await prisma.user.delete({
      where: { id: user.id },
    })
    console.log('\n✓ Cleaned up test user')

    console.log('\n✅ All cascade delete tests passed!')
  } catch (error) {
    console.error('❌ Error during verification:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyCascadeDelete()
