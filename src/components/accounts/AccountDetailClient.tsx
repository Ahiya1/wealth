'use client'

import { PageTransition } from '@/components/ui/page-transition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountTypeIcon, getAccountTypeLabel } from '@/components/accounts/AccountTypeIcon'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AccountForm } from '@/components/accounts/AccountForm'

interface AccountDetailClientProps {
  account: any
}

export function AccountDetailClient({ account }: AccountDetailClientProps) {
  const isDebt = account.type === 'CREDIT' && Number(account.balance) < 0

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-sage-600 dark:text-sage-400">{account.name}</h1>
            <p className="text-warm-gray-700 dark:text-warm-gray-300">{account.institution}</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Account</DialogTitle>
              </DialogHeader>
              <AccountForm account={account} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <AccountTypeIcon type={account.type} className="mr-3" />
              <CardTitle className="text-sm font-medium">Account Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getAccountTypeLabel(account.type)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {isDebt ? 'Amount Owed' : 'Current Balance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  isDebt
                    ? 'text-coral dark:text-coral-400'
                    : Number(account.balance) >= 0
                    ? 'text-warm-gray-900 dark:text-warm-gray-100'
                    : 'text-warm-gray-700 dark:text-warm-gray-300'
                }`}
              >
                {formatCurrency(Math.abs(Number(account.balance)), account.currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">
                    {account.isManual ? 'Manual' : 'Connected (Plaid)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium">
                    {account.isActive ? 'Active' : 'Archived'}
                  </span>
                </div>
                {account.lastSynced && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Synced</span>
                    <span className="text-sm font-medium">
                      {new Date(account.lastSynced).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-md dark:shadow-none dark:border dark:border-warm-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <span className="text-sm font-medium">{account.currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium">
                    {new Date(account.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions section - placeholder */}
        <Card className="shadow-soft dark:shadow-none dark:border dark:border-warm-gray-700">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-muted p-8 text-center">
              <p className="text-muted-foreground">
                Transactions will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
