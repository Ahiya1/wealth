'use client'

import { PageTransition } from '@/components/ui/page-transition'
import { AccountList } from './AccountList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AccountForm } from './AccountForm'
import { trpc } from '@/lib/trpc'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export function AccountListClient() {
  // Fetch all accounts for export count
  const { data: accounts } = trpc.accounts.list.useQuery({ includeInactive: true })
  const accountCount = accounts?.length || 0

  // Export logic
  const exportMutation = trpc.exports.exportAccounts.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({ format }),
    dataType: 'accounts',
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600 dark:text-sage-400">Accounts</h1>
            <p className="text-warm-gray-700 dark:text-warm-gray-300">Manage your bank accounts and credit cards</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-sage-600 hover:bg-sage-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <AccountForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Export Section */}
        <div className="flex items-center gap-3 flex-wrap">
          <FormatSelector
            value={exportHook.format}
            onChange={exportHook.setFormat}
            disabled={exportHook.isLoading}
          />

          <ExportButton
            onClick={exportHook.handleExport}
            loading={exportHook.isLoading}
            recordCount={accountCount}
          >
            Export Accounts
          </ExportButton>
        </div>

        <AccountList />
      </div>
    </PageTransition>
  )
}
