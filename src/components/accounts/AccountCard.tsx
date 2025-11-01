'use client'

import { type Account } from '@prisma/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountTypeIcon } from './AccountTypeIcon'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cardHoverSubtle } from '@/lib/animations'

interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  onArchive?: (account: Account) => void
}

export function AccountCard({ account, onEdit, onArchive }: AccountCardProps) {
  const isDebt = account.type === 'CREDIT' && Number(account.balance) < 0

  return (
    <motion.div {...cardHoverSubtle}>
      <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600 transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <AccountTypeIcon type={account.type} className="h-10 w-10" />
          <div>
            <CardTitle className="text-lg">{account.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{account.institution}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(account)}
              aria-label="Edit account"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onArchive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onArchive(account)}
              aria-label="Archive account"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              {isDebt ? 'You owe' : 'Balance'}
            </span>
            <span
              className={`text-2xl font-bold ${
                isDebt
                  ? 'text-coral'
                  : Number(account.balance) >= 0
                  ? 'text-foreground'
                  : 'text-warm-gray-700'
              }`}
            >
              {formatCurrency(Math.abs(Number(account.balance)))}
            </span>
          </div>

          {account.lastSynced && !account.isManual && (
            <p className="text-xs text-muted-foreground">
              Last synced: {new Date(account.lastSynced).toLocaleDateString()}
            </p>
          )}

          {account.isManual && (
            <p className="text-xs text-blue-600 dark:text-blue-400">Manual Account</p>
          )}

          <Link href={`/accounts/${account.id}`}>
            <Button variant="link" className="p-0 h-auto text-sm">
              View Details →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
