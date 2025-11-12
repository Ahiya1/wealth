import archiver from 'archiver'
import { format } from 'date-fns'

interface ExportFiles {
  'README.md': string
  'ai-context.json': string
  'summary.json': string
  'transactions.csv': string
  'budgets.csv': string
  'goals.csv': string
  'accounts.csv': string
  'recurring-transactions.csv': string
  'categories.csv': string
}

export async function createExportZIP(files: ExportFiles): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', {
      zlib: { level: 9 }  // Maximum compression
    })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    const folderName = `wealth-export-${format(new Date(), 'yyyy-MM-dd')}`

    // Add each file to ZIP with organized structure
    Object.entries(files).forEach(([filename, content]) => {
      archive.append(content, { name: `${folderName}/${filename}` })
    })

    archive.finalize()
  })
}
