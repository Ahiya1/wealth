// Currency types for iteration 9

export interface SupportedCurrency {
  code: string
  name: string
  symbol: string
}

export interface ExchangeRate {
  fromCurrency: string
  toCurrency: string
  rate: string // Decimal as string for JSON serialization
  date: Date
}

export interface ConversionResult {
  success: boolean
  logId: string
  transactionCount: number
  accountCount: number
  budgetCount: number
  goalCount: number
}

export interface ConversionStatus {
  status: 'IN_PROGRESS' | 'IDLE'
  fromCurrency?: string
  toCurrency?: string
  startedAt?: Date
}

export interface ConversionLog {
  id: string
  userId: string
  fromCurrency: string
  toCurrency: string
  exchangeRate: string // Decimal as string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'
  errorMessage: string | null
  transactionCount: number
  accountCount: number
  budgetCount: number
  goalCount: number
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
}
