// scripts/import-visa-transactions.ts
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

const filePath = '/home/ahiya/Downloads/פירוט חיובים לכרטיס ויזה 7390 - 05.11.25.xlsx'
const userEmail = 'ahiya.butman@gmail.com'

// Hebrew category mapping to English
const categoryMap: Record<string, string> = {
  'מזון ומשקאות': 'Food & Dining',
  'מסעדות': 'Food & Dining',
  'פנאי בילוי': 'Entertainment',
  'מלונאות ואירוח': 'Travel',
  'רכב ותחבורה': 'Transportation',
  'קניות': 'Shopping',
  'בריאות': 'Healthcare',
  'חינוך': 'Education',
  'שונות': 'Other',
}

// Convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = new Date(utc_value * 1000)
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate())
}

async function main() {
  console.log('🚀 Starting Visa transaction import...\n')

  // 1. Get user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    throw new Error(`User ${userEmail} not found`)
  }

  console.log(`👤 User: ${user.email} (${user.id})\n`)

  // 2. Create or find Visa account
  let account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      name: { contains: 'ויזה' },
    },
  })

  if (!account) {
    account = await prisma.account.create({
      data: {
        userId: user.id,
        type: 'CREDIT',
        name: 'כרטיס ויזה 7390',
        institution: 'בינלאומי הראשון',
        balance: 0,
        currency: 'NIS',
        isManual: true,
      },
    })
    console.log(`✅ Created account: ${account.name}\n`)
  } else {
    console.log(`✅ Found existing account: ${account.name}\n`)
  }

  // 3. Ensure categories exist
  const categoryNames = [...new Set(Object.values(categoryMap))] // Remove duplicates
  for (const categoryName of categoryNames) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: categoryName,
      },
    })

    if (!existing) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: categoryName,
          icon: '💳',
          color: '#8B5CF6',
        },
      })
      console.log(`✅ Created category: ${categoryName}`)
    }
  }
  console.log()

  // 4. Read Excel file
  console.log('📊 Reading Excel file...\n')
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  // 5. Parse transactions (starting from row 5, which is index 5)
  const transactions = []
  for (let i = 5; i < data.length; i++) {
    const row = data[i]

    // Skip empty rows
    if (!row || !row[0]) continue

    const [dateSerial, payee, amountTx, amountCharge, txType, category, notes] = row

    // Skip if no date or payee
    if (!dateSerial || !payee) continue

    // Parse date
    let date: Date
    if (typeof dateSerial === 'number') {
      date = excelDateToJSDate(dateSerial)
    } else {
      continue // Skip invalid dates
    }

    // Parse amount (use charge amount if available, otherwise transaction amount)
    let amount = 0
    if (typeof amountCharge === 'number' && amountCharge > 0) {
      amount = amountCharge
    } else if (typeof amountTx === 'number' && amountTx > 0) {
      amount = amountTx
    } else {
      continue // Skip if no valid amount
    }

    // Map category
    const hebrewCategory = String(category || 'שונות')
    const englishCategory = categoryMap[hebrewCategory] || 'Other'

    // Get category from database
    const dbCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: englishCategory,
      },
    })

    if (!dbCategory) {
      console.warn(`⚠️  Category not found: ${englishCategory}`)
      continue
    }

    transactions.push({
      userId: user.id,
      accountId: account.id,
      categoryId: dbCategory.id,
      date,
      amount: -amount, // Negative for expenses
      payee: String(payee),
      notes: notes ? `${txType || ''} - ${notes}`.trim() : String(txType || ''),
      tags: [],
    })
  }

  console.log(`✅ Parsed ${transactions.length} transactions\n`)

  // 6. Import transactions
  let imported = 0
  let skipped = 0

  for (const tx of transactions) {
    // Check if transaction already exists (by date + amount + payee)
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        accountId: tx.accountId,
        date: tx.date,
        amount: tx.amount,
        payee: tx.payee,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.transaction.create({ data: tx })
    imported++
  }

  console.log(`\n✅ Import complete!`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped (duplicates): ${skipped}`)
  console.log(`   Total: ${transactions.length}\n`)

  // 7. Update account balance
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  await prisma.account.update({
    where: { id: account.id },
    data: { balance: totalAmount },
  })

  console.log(`💰 Account balance updated: ${totalAmount.toFixed(2)} ₪\n`)
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
