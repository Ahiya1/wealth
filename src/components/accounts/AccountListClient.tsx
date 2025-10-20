'use client'

import { PageTransition } from '@/components/ui/page-transition'
import { AccountList } from './AccountList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AccountForm } from './AccountForm'

export function AccountListClient() {
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

        <AccountList />
      </div>
    </PageTransition>
  )
}
