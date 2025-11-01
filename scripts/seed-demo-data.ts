import { PrismaClient, AccountType, GoalType, RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { subMonths, startOfMonth, getDaysInMonth, addMonths } from 'date-fns'

const prisma = new PrismaClient()

interface SeedOptions {
  userId: string
  monthsOfHistory?: number
}

function randomDecimal(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

async function seedDemoData({ userId, monthsOfHistory = 6 }: SeedOptions) {
  console.log(`🌱 Seeding ${monthsOfHistory} months of demo data...\n`)

  // Validate user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error(`❌ User not found: ${userId}`)
  }

  console.log(`✓ User found: ${user.email}\n`)

  // Check if user already has data
  const existingAccounts = await prisma.account.count({ where: { userId } })
  if (existingAccounts > 0) {
    console.warn(`⚠️  User already has ${existingAccounts} account(s)`)
    console.warn('💡 Run cleanup first: npm run cleanup:user ${userId}')
    console.warn('   or: npm run cleanup:user ${user.email}\n')
    process.exit(1)
  }

  // Fetch default categories
  console.log('Step 1: Fetching default categories...')
  const categories = await prisma.category.findMany({
    where: { isDefault: true },
  })

  if (categories.length === 0) {
    throw new Error('❌ No default categories found. Run: npm run db:seed')
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c.id]))
  console.log(`  ✓ Found ${categories.length} categories\n`)

  // Create accounts
  console.log('Step 2: Creating 6 accounts...')
  const accounts = await prisma.$transaction([
    prisma.account.create({
      data: {
        userId,
        name: 'Chase Checking',
        institution: 'Chase Bank',
        type: AccountType.CHECKING,
        balance: 0, // Will update after transactions
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'High Yield Savings',
        institution: 'Ally Bank',
        type: AccountType.SAVINGS,
        balance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Chase Sapphire Reserve',
        institution: 'Chase Bank',
        type: AccountType.CREDIT,
        balance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Vanguard 401k',
        institution: 'Vanguard',
        type: AccountType.INVESTMENT,
        balance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Robinhood',
        institution: 'Robinhood',
        type: AccountType.INVESTMENT,
        balance: 0,
        isManual: true,
      },
    }),
    prisma.account.create({
      data: {
        userId,
        name: 'Emergency Fund',
        institution: 'Ally Bank',
        type: AccountType.SAVINGS,
        balance: 0,
        isManual: true,
      },
    }),
  ])

  const [checking, savings, credit, retirement, investing, emergency] = accounts
  console.log('  ✓ Created 6 accounts\n')

  // Generate transactions for each month
  console.log(`Step 3: Generating transactions for ${monthsOfHistory} months...`)

  const allTransactions = []
  const today = new Date()

  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = subMonths(startOfMonth(today), monthOffset)
    const daysInMonth = getDaysInMonth(monthDate)

    // Income: Bi-weekly salary (15th and last day)
    const salaryDates = [15, daysInMonth]

    for (const day of salaryDates) {
      const date = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        day
      )
      allTransactions.push({
        userId,
        accountId: checking.id,
        categoryId: categoryMap['Salary'] || categoryMap['Income'] || '',
        date,
        amount: 3500.0,
        payee: 'Employer Direct Deposit',
        notes: 'Bi-weekly salary',
        tags: [],
        isManual: true,
      })
    }

    // Monthly rent (1st of month)
    allTransactions.push({
      userId,
      accountId: checking.id,
      categoryId: categoryMap['Housing'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      amount: -1200.0,
      payee: 'Landlord',
      notes: 'Monthly rent',
      tags: [],
      isManual: true,
    })

    // Generate 60-70 expense transactions per month
    const expenseCount = 60 + Math.floor(Math.random() * 10)

    for (let i = 0; i < expenseCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)

      // Random expense category
      const expenseCategories = [
        {
          category: 'Groceries',
          payees: ['Trader Joes', 'Whole Foods', 'Safeway', 'Costco'],
          range: [30, 80] as [number, number],
        },
        {
          category: 'Dining',
          payees: ['Chipotle', 'Starbucks', 'Local Cafe', 'Pizza Place'],
          range: [15, 50] as [number, number],
        },
        {
          category: 'Transportation',
          payees: ['Shell Gas', 'Uber', 'Lyft', 'Metro Card'],
          range: [20, 60] as [number, number],
        },
        {
          category: 'Shopping',
          payees: ['Amazon', 'Target', 'Nordstrom', 'Best Buy'],
          range: [25, 150] as [number, number],
        },
        {
          category: 'Utilities',
          payees: ['PG&E', 'Comcast', 'AT&T', 'Water District'],
          range: [50, 200] as [number, number],
        },
        {
          category: 'Entertainment',
          payees: ['Netflix', 'Spotify', 'AMC Theaters', 'Concert Tickets'],
          range: [10, 80] as [number, number],
        },
      ]

      const expense =
        expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      if (!expense) continue // Skip if undefined

      const payee =
        expense.payees[Math.floor(Math.random() * expense.payees.length)]
      const [min, max] = expense.range
      const amount = -(min + Math.random() * (max - min))

      allTransactions.push({
        userId,
        accountId: Math.random() > 0.3 ? credit.id : checking.id, // 70% credit, 30% checking
        categoryId: categoryMap[expense.category] || '',
        date,
        amount: Math.round(amount * 100) / 100,
        payee: payee || 'Unknown', // Ensure payee is always a string
        notes: '',
        tags: [],
        isManual: true,
      })
    }

    // Monthly savings transfer (5th of month)
    allTransactions.push({
      userId,
      accountId: checking.id,
      categoryId: categoryMap['Miscellaneous'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      amount: -500.0,
      payee: 'Transfer to Savings',
      notes: 'Monthly savings goal',
      tags: [],
      isManual: true,
    })

    allTransactions.push({
      userId,
      accountId: savings.id,
      categoryId: categoryMap['Miscellaneous'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      amount: 500.0,
      payee: 'From Checking',
      notes: 'Monthly savings goal',
      tags: [],
      isManual: true,
    })

    // Monthly 401k contribution (15th of month)
    allTransactions.push({
      userId,
      accountId: retirement.id,
      categoryId: categoryMap['Income'] || categoryMap['Miscellaneous'] || '',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
      amount: 500.0,
      payee: '401k Contribution',
      notes: 'Employer match + contribution',
      tags: [],
      isManual: true,
    })

    // Occasional investment (20% chance per month)
    if (Math.random() > 0.8) {
      const day = Math.floor(Math.random() * daysInMonth) + 1
      allTransactions.push({
        userId,
        accountId: investing.id,
        categoryId: categoryMap['Miscellaneous'] || '',
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
        amount: randomDecimal(100, 500),
        payee: 'Stock Purchase',
        notes: 'Investment',
        tags: [],
        isManual: true,
      })
    }
  }

  // Insert all transactions
  console.log(`  ✓ Inserting ${allTransactions.length} transactions...`)
  await prisma.transaction.createMany({ data: allTransactions })

  // Calculate final account balances
  console.log('  ✓ Calculating account balances...\n')
  for (const account of accounts) {
    const sum = await prisma.transaction.aggregate({
      where: { accountId: account.id },
      _sum: { amount: true },
    })

    await prisma.account.update({
      where: { id: account.id },
      data: { balance: sum._sum.amount || 0 },
    })
  }

  // Create budgets for all months
  console.log(`Step 4: Creating budgets for ${monthsOfHistory} months...`)
  const budgetCategories = [
    { category: 'Groceries', amount: 500 },
    { category: 'Dining', amount: 300 },
    { category: 'Transportation', amount: 200 },
    { category: 'Shopping', amount: 200 },
    { category: 'Housing', amount: 1200 },
    { category: 'Utilities', amount: 150 },
    { category: 'Entertainment', amount: 150 },
    { category: 'Health', amount: 100 },
    { category: 'Miscellaneous', amount: 100 },
  ]

  let budgetCount = 0
  for (let monthOffset = 0; monthOffset < monthsOfHistory; monthOffset++) {
    const monthDate = subMonths(startOfMonth(today), monthOffset)
    const monthString = monthDate.toISOString().slice(0, 7)

    for (const { category, amount } of budgetCategories) {
      const categoryId = categoryMap[category]
      if (!categoryId) continue

      await prisma.budget.upsert({
        where: {
          userId_categoryId_month: {
            userId,
            categoryId,
            month: monthString,
          },
        },
        create: {
          userId,
          categoryId,
          month: monthString,
          amount,
          rollover: Math.random() > 0.5,
        },
        update: {},
      })
      budgetCount++
    }
  }
  console.log(`  ✓ Created ${budgetCount} budgets\n`)

  // Create goals
  console.log('Step 5: Creating 4 goals...')
  await prisma.goal.createMany({
    data: [
      {
        userId,
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 5300,
        targetDate: new Date('2025-12-31'),
        type: GoalType.SAVINGS,
        linkedAccountId: emergency.id,
      },
      {
        userId,
        name: 'Vacation Fund',
        targetAmount: 3000,
        currentAmount: 2500,
        targetDate: new Date('2025-08-01'),
        type: GoalType.SAVINGS,
      },
      {
        userId,
        name: 'New Laptop',
        targetAmount: 2000,
        currentAmount: 1600,
        targetDate: new Date('2025-06-01'),
        type: GoalType.SAVINGS,
      },
      {
        userId,
        name: 'Down Payment',
        targetAmount: 50000,
        currentAmount: 10000,
        targetDate: new Date('2027-01-01'),
        type: GoalType.SAVINGS,
      },
    ],
  })
  console.log('  ✓ Created 4 goals\n')

  // Create recurring transactions
  console.log('Step 6: Creating recurring transactions...')
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
      startDate: subMonths(today, 3), // Started 3 months ago
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
      startDate: subMonths(today, monthsOfHistory),
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
      startDate: subMonths(today, monthsOfHistory),
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
      startDate: subMonths(today, monthsOfHistory),
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
      startDate: subMonths(today, monthsOfHistory),
      dayOfMonth: 1,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: addMonths(startOfMonth(today), 1),
    },
  ]

  for (const recurring of recurringTransactions) {
    await prisma.recurringTransaction.create({ data: recurring })
  }
  console.log(`  ✓ Created ${recurringTransactions.length} recurring transactions\n`)

  // Validation
  const validation = {
    accounts: await prisma.account.count({ where: { userId } }),
    transactions: await prisma.transaction.count({ where: { userId } }),
    budgets: await prisma.budget.count({ where: { userId } }),
    goals: await prisma.goal.count({ where: { userId } }),
    recurring: await prisma.recurringTransaction.count({ where: { userId } }),
  }

  console.log('═══════════════════════════════════════')
  console.log('✅ Seeding complete!\n')
  console.log('📊 Data Summary:')
  console.log(`   Accounts:     ${validation.accounts}`)
  console.log(`   Transactions: ${validation.transactions}`)
  console.log(`   Budgets:      ${validation.budgets}`)
  console.log(`   Goals:        ${validation.goals}`)
  console.log(`   Recurring:    ${validation.recurring}`)
  console.log('═══════════════════════════════════════\n')
}

// CLI usage
async function main() {
  const userId = process.argv[2]
  const monthsOfHistory = parseInt(process.argv[3] || '6', 10)

  if (!userId) {
    console.error('❌ Error: USER_ID required\n')
    console.error('Usage:')
    console.error('  npm run seed:demo <user-id> [months=6]\n')
    console.error('Example:')
    console.error('  npm run seed:demo clx1234567890')
    console.error('  npm run seed:demo clx1234567890 12\n')
    console.error('💡 Get user ID from create-test-user output or Prisma Studio')
    process.exit(1)
  }

  try {
    await seedDemoData({ userId, monthsOfHistory })
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
