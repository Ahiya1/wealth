'use client'

import { useState } from 'react'
import { Landmark, Plus, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageTransition } from '@/components/ui/page-transition'
import { ConnectionStatus } from '@prisma/client'
import { BankConnectionWizard } from '@/components/bank-connections/BankConnectionWizard'

export default function BankConnectionsPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const utils = trpc.useUtils()

  // Fetch connections
  const { data: connections, isLoading } = trpc.bankConnections.list.useQuery()

  // Delete mutation
  const deleteMutation = trpc.bankConnections.delete.useMutation({
    onSuccess: () => {
      utils.bankConnections.list.invalidate()
      toast.success('Bank connection deleted')
      setDeleteId(null)
    },
    onError: (error) => {
      toast.error('Failed to delete connection', {
        description: error.message,
      })
    },
  })

  // Status badge styling
  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'ERROR':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        )
    }
  }

  // Bank display names
  const getBankName = (bank: string) => {
    switch (bank) {
      case 'FIBI':
        return 'First International Bank'
      case 'VISA_CAL':
        return 'Visa CAL Credit Card'
      default:
        return bank
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings/bank-connections" />

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Bank Connections</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Connect your Israeli bank accounts for automatic transaction sync
            </p>
          </div>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        </div>


        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">Loading connections...</div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && connections?.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                    <Landmark className="h-6 w-6 text-sage-600 dark:text-sage-400" />
                  </div>
                </div>
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                  No bank connections
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Israeli bank account to automatically import transactions
                </p>
                <Button onClick={() => setIsWizardOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection list */}
        {!isLoading && connections && connections.length > 0 && (
          <div className="grid gap-4">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                        <Landmark className="h-5 w-5 text-sage-600 dark:text-sage-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{getBankName(connection.bank)}</CardTitle>
                        <CardDescription>
                          {connection.accountType} ending in {connection.accountIdentifier}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(connection.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(connection.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {connection.errorMessage && (
                  <CardContent>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {connection.errorMessage}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bank connection?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this bank connection and all sync history. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bank Connection Wizard */}
        <BankConnectionWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            utils.bankConnections.list.invalidate()
            toast.success('Bank connection added successfully')
          }}
        />
      </div>
    </PageTransition>
  )
}
