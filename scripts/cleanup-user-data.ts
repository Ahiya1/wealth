import { PrismaClient } from '@prisma/client'
import * as readline from 'readline/promises'

const prisma = new PrismaClient()

async function main() {
  const userIdentifier = process.argv[2]

  if (!userIdentifier) {
    console.error('❌ Error: User identifier required')
    console.error('\nUsage:')
    console.error('  npm run cleanup:user <user-id-or-email>')
    console.error('\nExample:')
    console.error('  npm run cleanup:user ahiya.butman@gmail.com')
    console.error('  npm run cleanup:user clx1234567890')
    process.exit(1)
  }

  console.log(`🔍 Looking up user: ${userIdentifier}\n`)

  // Find user by ID or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdentifier }, { email: userIdentifier }],
    },
  })

  if (!user) {
    console.error(`❌ User not found: ${userIdentifier}`)
    process.exit(1)
  }

  console.log(`✓ Found user: ${user.email} (${user.id})`)

  // Count data to be deleted
  console.log('\n📊 Counting data to be deleted...\n')

  const counts = {
    accounts: await prisma.account.count({ where: { userId: user.id } }),
    transactions: await prisma.transaction.count({ where: { userId: user.id } }),
    budgets: await prisma.budget.count({ where: { userId: user.id } }),
    goals: await prisma.goal.count({ where: { userId: user.id } }),
    categories: await prisma.category.count({ where: { userId: user.id } }),
  }

  // Show summary
  console.log('⚠️  WARNING: This will DELETE ALL financial data for this user:')
  console.log(`   Email: ${user.email}`)
  console.log(`   User ID: ${user.id}`)
  console.log('\nData to be deleted:')
  console.log(`   - ${counts.accounts} account(s)`)
  console.log(`   - ${counts.transactions} transaction(s)`)
  console.log(`   - ${counts.budgets} budget(s)`)
  console.log(`   - ${counts.goals} goal(s)`)
  console.log(`   - ${counts.categories} custom categor(ies)`)

  if (
    counts.accounts === 0 &&
    counts.transactions === 0 &&
    counts.budgets === 0 &&
    counts.goals === 0 &&
    counts.categories === 0
  ) {
    console.log('\n✅ User has no data to clean up.')
    console.log('💡 User record will remain intact.')
    process.exit(0)
  }

  // Confirmation prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('\n⚠️  This action CANNOT be undone!')
  const confirmation = await rl.question('Type "DELETE" (all caps) to confirm: ')
  rl.close()

  if (confirmation !== 'DELETE') {
    console.log('\n❌ Cleanup cancelled. No data was deleted.')
    process.exit(0)
  }

  // Delete in transaction (all-or-nothing)
  console.log('\n🗑️  Deleting data...')

  try {
    await prisma.$transaction(async (tx) => {
      // Delete in correct order (respect foreign keys)
      const deletedTransactions = await tx.transaction.deleteMany({
        where: { userId: user.id },
      })
      console.log(`  ✓ Deleted ${deletedTransactions.count} transaction(s)`)

      const deletedBudgets = await tx.budget.deleteMany({
        where: { userId: user.id },
      })
      console.log(`  ✓ Deleted ${deletedBudgets.count} budget(s)`)

      const deletedGoals = await tx.goal.deleteMany({
        where: { userId: user.id },
      })
      console.log(`  ✓ Deleted ${deletedGoals.count} goal(s)`)

      const deletedAccounts = await tx.account.deleteMany({
        where: { userId: user.id },
      })
      console.log(`  ✓ Deleted ${deletedAccounts.count} account(s)`)

      const deletedCategories = await tx.category.deleteMany({
        where: { userId: user.id },
      })
      console.log(`  ✓ Deleted ${deletedCategories.count} custom categor(ies)`)

      // Reset onboarding status
      await tx.user.update({
        where: { id: user.id },
        data: {
          onboardingCompletedAt: null,
          onboardingSkipped: false,
        },
      })
      console.log('  ✓ Reset onboarding status')
    })

    console.log('\n✅ Cleanup complete!')
    console.log('\n💡 Next steps:')
    console.log(`   - User record still exists: ${user.email}`)
    console.log('   - User will see onboarding wizard on next login')
    console.log('   - User can add fresh financial data')
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    console.error('\n💡 No data was deleted (transaction rolled back)')
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
