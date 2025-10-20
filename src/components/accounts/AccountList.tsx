'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { trpc } from '@/lib/trpc'
import { AccountCard } from './AccountCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccountForm } from './AccountForm'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { type Account } from '@prisma/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Wallet, Plus } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface AccountListProps {
  includeInactive?: boolean
}

export function AccountList({ includeInactive = false }: AccountListProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [archivingAccount, setArchivingAccount] = useState<Account | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { data: accounts, isLoading, error } = trpc.accounts.list.useQuery({
    includeInactive,
  })

  const archiveAccount = trpc.accounts.archive.useMutation({
    onSuccess: () => {
      toast({ title: 'Account archived successfully' })
      utils.accounts.list.invalidate()
      utils.accounts.netWorth.invalidate()
      setArchivingAccount(null)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-coral/20 bg-coral/10 p-4">
        <p className="text-sm text-coral">Error loading accounts: {error.message}</p>
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <>
        <EmptyState
          icon={Wallet}
          title="Let's add your first account!"
          description="Connect your first account to start tracking your financial journey with mindfulness"
          action={
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-sage-600 hover:bg-sage-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          }
        />

        {/* Add Account Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
            </DialogHeader>
            <AccountForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {accounts.map((account) => (
          <motion.div key={account.id} variants={staggerItem}>
            <AccountCard
              account={account}
              onEdit={setEditingAccount}
              onArchive={setArchivingAccount}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountForm
              account={editingAccount}
              onSuccess={() => setEditingAccount(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archivingAccount} onOpenChange={() => setArchivingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{archivingAccount?.name}&quot;? This
              account will be hidden from your account list and net worth calculations.
              You can restore it later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archivingAccount) {
                  archiveAccount.mutate({ id: archivingAccount.id })
                }
              }}
              loading={archiveAccount.isPending}
              className="bg-coral hover:bg-coral/90"
            >
              {archiveAccount.isPending ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
