import { PrismaClient, RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { subMonths, addMonths, startOfMonth } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: tsx add-recurring-demo.ts <user-id>')
    process.exit(1)
  }

  // Get user and accounts
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { accounts: true } })
  if (!user) throw new Error('User not found')

  const checking = user.accounts.find((a) => a.name === 'Chase Checking')
  const credit = user.accounts.find((a) => a.name === 'Chase Sapphire Reserve')
  if (!checking || !credit) throw new Error('Required accounts not found')

  // Get categories
  const categories = await prisma.category.findMany({ where: { isDefault: true } })
  const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c.id]))

  const today = new Date()

  const recurringTransactions = [
    {
      userId,
      accountId: checking.id,
      amount: -14.99,
      payee: 'Netflix',
      categoryId: categoryMap['Subscriptions'] || categoryMap['Entertainment'] || '',
      notes: 'Monthly streaming subscription',
      tags: ['subscription', 'entertainment'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 3),
      dayOfMonth: 15,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
    },
    {
      userId,
      accountId: credit.id,
      amount: -9.99,
      payee: 'Spotify',
      categoryId: categoryMap['Subscriptions'] || categoryMap['Entertainment'] || '',
      notes: 'Music streaming',
      tags: ['subscription', 'music'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 5),
      dayOfMonth: 1,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: addMonths(startOfMonth(today), 1),
    },
    {
      userId,
      accountId: checking.id,
      amount: -89.99,
      payee: 'Comcast Internet',
      categoryId: categoryMap['Utilities'] || categoryMap['Housing'] || '',
      notes: 'Internet service',
      tags: ['utility', 'internet'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 6),
      dayOfMonth: 5,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: new Date(today.getFullYear(), today.getMonth() + 1, 5),
    },
    {
      userId,
      accountId: checking.id,
      amount: -75.00,
      payee: 'T-Mobile',
      categoryId: categoryMap['Utilities'] || categoryMap['Miscellaneous'] || '',
      notes: 'Phone bill',
      tags: ['utility', 'phone'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 6),
      dayOfMonth: 10,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: new Date(today.getFullYear(), today.getMonth() + 1, 10),
    },
    {
      userId,
      accountId: credit.id,
      amount: -49.99,
      payee: 'Planet Fitness',
      categoryId: categoryMap['Health'] || categoryMap['Miscellaneous'] || '',
      notes: 'Gym membership',
      tags: ['subscription', 'fitness'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 4),
      dayOfMonth: 1,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: addMonths(startOfMonth(today), 1),
    },
    {
      userId,
      accountId: checking.id,
      amount: -125.00,
      payee: 'Progressive Insurance',
      categoryId: categoryMap['Transportation'] || categoryMap['Miscellaneous'] || '',
      notes: 'Car insurance',
      tags: ['insurance', 'car'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 6),
      dayOfMonth: 20,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: new Date(today.getFullYear(), today.getMonth() + 1, 20),
    },
    {
      userId,
      accountId: checking.id,
      amount: -1200.00,
      payee: 'Oakwood Apartments',
      categoryId: categoryMap['Housing'] || '',
      notes: 'Monthly rent',
      tags: ['rent', 'housing'],
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: subMonths(today, 6),
      dayOfMonth: 1,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: addMonths(startOfMonth(today), 1),
    },
  ]

  console.log('🔄 Adding recurring transactions...')
  for (const recurring of recurringTransactions) {
    await prisma.recurringTransaction.create({ data: recurring })
    console.log(`  ✓ ${recurring.payee}`)
  }

  console.log(`\n✅ Added ${recurringTransactions.length} recurring transactions!`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
