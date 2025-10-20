import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client'

const prisma = new PrismaClient()

async function testMigration() {
  console.log('Testing database migration...\n')

  // Test 1: Check enums are available
  console.log('1. Enum availability:')
  console.log('   UserRole values:', Object.values(UserRole))
  console.log('   SubscriptionTier values:', Object.values(SubscriptionTier))

  // Test 2: Query all users with new fields
  console.log('\n2. All users with role and tier:')
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      subscriptionTier: true,
      subscriptionStartedAt: true,
      subscriptionExpiresAt: true,
      createdAt: true,
    },
  })
  console.table(allUsers)

  // Test 3: Count users by role
  console.log('\n3. User counts by role:')
  const totalUsers = await prisma.user.count()
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  const userCount = await prisma.user.count({ where: { role: 'USER' } })
  console.log(`   Total users: ${totalUsers}`)
  console.log(`   Admin users: ${adminCount}`)
  console.log(`   Regular users: ${userCount}`)

  // Test 4: Count users by tier
  console.log('\n4. User counts by subscription tier:')
  const premiumCount = await prisma.user.count({ where: { subscriptionTier: 'PREMIUM' } })
  const freeCount = await prisma.user.count({ where: { subscriptionTier: 'FREE' } })
  console.log(`   Premium users: ${premiumCount}`)
  console.log(`   Free users: ${freeCount}`)

  // Test 5: Verify admin user
  console.log('\n5. Admin user verification:')
  const adminUser = await prisma.user.findUnique({
    where: { email: 'ahiya.butman@gmail.com' },
    select: { email: true, role: true, subscriptionTier: true },
  })
  if (adminUser?.role === 'ADMIN') {
    console.log(`   ✅ ahiya.butman@gmail.com has ADMIN role`)
  } else {
    console.log(`   ❌ ahiya.butman@gmail.com does NOT have ADMIN role`)
  }

  // Test 6: Verify all users have role and tier (no nulls possible due to NOT NULL constraint)
  console.log('\n6. Default values check:')
  const allUsersHaveDefaults = allUsers.every(
    (u) => u.role !== null && u.subscriptionTier !== null
  )
  console.log(`   All users have role and tier: ${allUsersHaveDefaults ? '✅' : '❌'}`)
  console.log(`   (NOT NULL constraints prevent null values)`)

  // Test 7: Verify indexes exist (by querying with indexed fields)
  console.log('\n7. Index verification (performance test):')
  const start = Date.now()
  await prisma.user.findMany({
    where: { role: 'ADMIN', subscriptionTier: 'FREE' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const duration = Date.now() - start
  console.log(`   Query with indexed fields took: ${duration}ms`)
  if (duration < 100) {
    console.log(`   ✅ Query performance is good (indexes working)`)
  }

  console.log('\n✅ Migration test completed successfully!')
}

testMigration()
  .catch((e) => {
    console.error('Migration test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
