#!/usr/bin/env tsx
/**
 * Test script to verify transaction balance updates are working correctly
 *
 * This script tests:
 * 1. Creating income transaction increases balance
 * 2. Creating expense transaction decreases balance
 * 3. Updating transaction amount adjusts balance
 * 4. Deleting transaction reverses balance change
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBalanceUpdates() {
  console.log('🧪 Testing Transaction Balance Updates\n')

  // Find test user
  const user = await prisma.user.findFirst({
    where: { email: 'test@wealth.com' },
  })

  if (!user) {
    console.error('❌ Test user not found. Please create test@wealth.com first.')
    process.exit(1)
  }

  console.log(`✓ Found test user: ${user.email}\n`)

  // Find or create test account
  let testAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      name: 'Test Account',
    },
  })

  if (!testAccount) {
    testAccount = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Test Account',
        institution: 'Test Bank',
        type: 'CHECKING',
        balance: 1000.0, // Start with 1000
        isManual: true,
      },
    })
    console.log('✓ Created test account with initial balance: ₪1,000.00\n')
  } else {
    // Reset balance to 1000
    await prisma.account.update({
      where: { id: testAccount.id },
      data: { balance: 1000.0 },
    })
    console.log('✓ Reset test account balance to: ₪1,000.00\n')
  }

  // Get a category
  const category = await prisma.category.findFirst({
    where: { isDefault: true },
  })

  if (!category) {
    console.error('❌ No categories found. Please run seed.')
    process.exit(1)
  }

  console.log('=' .repeat(60))
  console.log('TEST 1: Income Transaction (+500)')
  console.log('=' .repeat(60))

  // Test 1: Create income transaction
  const incomeTransaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: testAccount.id,
      date: new Date(),
      amount: 500.0, // Positive = income
      payee: 'Test Salary',
      categoryId: category.id,
      isManual: true,
    },
  })

  let accountAfterIncome = await prisma.account.findUnique({
    where: { id: testAccount.id },
  })

  console.log(`Initial Balance:  ₪1,000.00`)
  console.log(`Transaction:      +₪500.00 (income)`)
  console.log(`Expected Balance: ₪1,500.00`)
  console.log(`Actual Balance:   ₪${Number(accountAfterIncome?.balance).toFixed(2)}`)

  const test1Pass = Number(accountAfterIncome?.balance) === 1500.0
  console.log(`Status: ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`)

  console.log('=' .repeat(60))
  console.log('TEST 2: Expense Transaction (-200)')
  console.log('=' .repeat(60))

  // Test 2: Create expense transaction
  const expenseTransaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: testAccount.id,
      date: new Date(),
      amount: -200.0, // Negative = expense
      payee: 'Test Store',
      categoryId: category.id,
      isManual: true,
    },
  })

  let accountAfterExpense = await prisma.account.findUnique({
    where: { id: testAccount.id },
  })

  console.log(`Previous Balance: ₪1,500.00`)
  console.log(`Transaction:      -₪200.00 (expense)`)
  console.log(`Expected Balance: ₪1,300.00`)
  console.log(`Actual Balance:   ₪${Number(accountAfterExpense?.balance).toFixed(2)}`)

  const test2Pass = Number(accountAfterExpense?.balance) === 1300.0
  console.log(`Status: ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`)

  console.log('=' .repeat(60))
  console.log('TEST 3: Update Transaction Amount (500 -> 300)')
  console.log('=' .repeat(60))

  // Test 3: Update transaction amount
  await prisma.transaction.update({
    where: { id: incomeTransaction.id },
    data: { amount: 300.0 }, // Change from 500 to 300
  })

  let accountAfterUpdate = await prisma.account.findUnique({
    where: { id: testAccount.id },
  })

  console.log(`Previous Balance:     ₪1,300.00`)
  console.log(`Original Transaction: +₪500.00`)
  console.log(`Updated Transaction:  +₪300.00`)
  console.log(`Adjustment:           -₪200.00`)
  console.log(`Expected Balance:     ₪1,100.00`)
  console.log(`Actual Balance:       ₪${Number(accountAfterUpdate?.balance).toFixed(2)}`)

  const test3Pass = Number(accountAfterUpdate?.balance) === 1100.0
  console.log(`Status: ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`)

  console.log('=' .repeat(60))
  console.log('TEST 4: Delete Expense Transaction')
  console.log('=' .repeat(60))

  // Test 4: Delete expense transaction
  await prisma.transaction.delete({
    where: { id: expenseTransaction.id },
  })

  let accountAfterDelete = await prisma.account.findUnique({
    where: { id: testAccount.id },
  })

  console.log(`Previous Balance:      ₪1,100.00`)
  console.log(`Deleted Transaction:   -₪200.00 (expense)`)
  console.log(`Reversal:              +₪200.00`)
  console.log(`Expected Balance:      ₪1,300.00`)
  console.log(`Actual Balance:        ₪${Number(accountAfterDelete?.balance).toFixed(2)}`)

  const test4Pass = Number(accountAfterDelete?.balance) === 1300.0
  console.log(`Status: ${test4Pass ? '✅ PASS' : '❌ FAIL'}\n`)

  console.log('=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))

  const allPass = test1Pass && test2Pass && test3Pass && test4Pass
  console.log(`Test 1 (Income):  ${test1Pass ? '✅' : '❌'}`)
  console.log(`Test 2 (Expense): ${test2Pass ? '✅' : '❌'}`)
  console.log(`Test 3 (Update):  ${test3Pass ? '✅' : '❌'}`)
  console.log(`Test 4 (Delete):  ${test4Pass ? '✅' : '❌'}`)
  console.log(`\nOverall: ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)

  // Cleanup
  await prisma.transaction.delete({ where: { id: incomeTransaction.id } })
  await prisma.account.delete({ where: { id: testAccount.id } })
  console.log('\n✓ Cleanup complete\n')

  await prisma.$disconnect()

  process.exit(allPass ? 0 : 1)
}

testBalanceUpdates().catch((error) => {
  console.error('❌ Test failed with error:')
  console.error(error)
  process.exit(1)
})
