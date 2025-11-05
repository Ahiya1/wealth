// scripts/preview-transactions.ts
import * as XLSX from 'xlsx'

const filePath = '/home/ahiya/Downloads/פירוט חיובים לכרטיס ויזה 7390 - 05.11.25.xlsx'

try {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath)

  // Get the first sheet
  const sheetName = workbook.SheetNames[0]
  console.log(`📊 Sheet name: ${sheetName}\n`)

  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  console.log('📋 First 10 rows:\n')
  data.slice(0, 10).forEach((row: any, i: number) => {
    console.log(`Row ${i}:`, row)
  })

  console.log(`\n📊 Total rows: ${data.length}`)

  // Try to parse as objects (using first row as headers)
  const jsonData = XLSX.utils.sheet_to_json(worksheet)

  console.log('\n📝 Column headers detected:')
  if (jsonData.length > 0) {
    console.log(Object.keys(jsonData[0]))
  }

  console.log('\n💰 Sample transaction:')
  console.log(JSON.stringify(jsonData[0], null, 2))

} catch (error) {
  console.error('❌ Error:', error)
}
