import { Wallet, PiggyBank, CreditCard, TrendingUp, Banknote } from 'lucide-react'
import { type AccountType } from '@prisma/client'

interface AccountTypeIconProps {
  type: AccountType
  className?: string
}

const ACCOUNT_TYPE_CONFIG = {
  CHECKING: {
    icon: Wallet,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  SAVINGS: {
    icon: PiggyBank,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  CREDIT: {
    icon: CreditCard,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  INVESTMENT: {
    icon: TrendingUp,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  CASH: {
    icon: Banknote,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
  },
}

export function AccountTypeIcon({ type, className = '' }: AccountTypeIconProps) {
  const config = ACCOUNT_TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div className={`rounded-full p-2 ${config.bgColor} ${className}`}>
      <Icon className={`h-5 w-5 ${config.color}`} />
    </div>
  )
}

export function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    CHECKING: 'Checking Account',
    SAVINGS: 'Savings Account',
    CREDIT: 'Credit Card',
    INVESTMENT: 'Investment Account',
    CASH: 'Cash',
  }
  return labels[type]
}
