'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'

export function DangerZone() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const { data: user } = trpc.users.me.useQuery()

  const deleteAccount = trpc.users.deleteAccount.useMutation({
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently deleted.',
      })
      // Redirect to sign-in page after a brief delay
      setTimeout(() => {
        router.push('/signin')
      }, 1500)
    },
    onError: (error) => {
      toast({
        title: 'Deletion failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleDelete = () => {
    deleteAccount.mutate()
  }

  const handleCancel = () => {
    setShowDeleteModal(false)
    setConfirmEmail('')
    setUnderstood(false)
  }

  const canDelete = confirmEmail === user?.email && understood

  return (
    <div className="rounded-lg border-2 border-terracotta-300/50 bg-terracotta-50/50 p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-terracotta-100 p-2">
          <AlertTriangle className="h-5 w-5 text-terracotta-600" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-serif font-semibold text-terracotta-700">Danger Zone</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Once you delete your account, there is no going back. All your data will be
            permanently deleted, including:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4 leading-relaxed">
            <li>All transactions and account balances</li>
            <li>All budgets and financial goals</li>
            <li>All categories and settings</li>
            <li>Your profile and preferences</li>
          </ul>
          <p className="text-sm font-semibold text-terracotta-700 mt-4">
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Button
          variant="destructive"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </Button>
      </div>

      <AlertDialog open={showDeleteModal} onOpenChange={handleCancel}>
        <AlertDialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-terracotta-100 p-3">
              <AlertTriangle className="h-6 w-6 text-terracotta-600" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg">Delete Account</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This action cannot be undone
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium mb-2">
                All of the following will be permanently deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All your transactions</li>
                <li>All your budgets and goals</li>
                <li>All your accounts and connections</li>
                <li>Your profile and preferences</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-email" className="text-sm font-medium">
                Type your email to confirm: <span className="font-semibold">{user?.email}</span>
              </Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder="your@email.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <Label
                htmlFor="understand"
                className="text-sm font-normal leading-tight cursor-pointer"
              >
                I understand that this action is permanent and cannot be undone
              </Label>
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={handleCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!canDelete || deleteAccount.isPending}
                className="bg-terracotta-500 text-white hover:bg-terracotta-600"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
