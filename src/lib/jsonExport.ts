interface ExportData {
  user: {
    email: string
    name: string | null
    currency: string
    timezone: string
  }
  accounts: any[]
  transactions: any[]
  budgets: any[]
  goals: any[]
  categories: any[]
}

export function generateCompleteDataJSON(data: ExportData): string {
  // Convert Prisma Decimal to number for JSON serialization
  const sanitizeDecimals = (obj: any): any => {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'object' && 'toNumber' in obj) {
      return obj.toNumber()
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDecimals)
    }
    if (typeof obj === 'object') {
      const result: any = {}
      for (const key in obj) {
        result[key] = sanitizeDecimals(obj[key])
      }
      return result
    }
    return obj
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    user: {
      email: data.user.email,
      name: data.user.name,
      currency: data.user.currency,
      timezone: data.user.timezone,
    },
    accounts: sanitizeDecimals(data.accounts),
    transactions: sanitizeDecimals(data.transactions),
    budgets: sanitizeDecimals(data.budgets),
    goals: sanitizeDecimals(data.goals),
    categories: sanitizeDecimals(data.categories),
  }

  return JSON.stringify(exportData, null, 2) // Pretty print
}

export function downloadJSON(jsonContent: string, filename: string): void {
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;'
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url) // Cleanup
}
