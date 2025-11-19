'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface SyncProgressModalProps {
  syncLogId: string | null
  onClose: () => void
}

/**
 * SyncProgressModal Component
 *
 * Displays real-time sync progress via polling.
 * Shows imported/skipped counts and status indicators.
 * Auto-closes on completion (SUCCESS or FAILED).
 */
export function SyncProgressModal({
  syncLogId,
  onClose,
}: SyncProgressModalProps) {
  const { data: status } = trpc.syncTransactions.status.useQuery(
    { syncLogId: syncLogId! },
    {
      refetchInterval: 2000,
      enabled: !!syncLogId,
    }
  )

  const isOpen = !!syncLogId
  const isInProgress = status?.status !== 'SUCCESS' && status?.status !== 'FAILED'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInProgress && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status?.status === 'SUCCESS' && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {status?.status === 'FAILED' && (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {isInProgress
              ? 'Syncing Transactions'
              : status?.status === 'SUCCESS'
              ? 'Sync Complete'
              : 'Sync Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress information */}
          {status && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Imported:</span>
                <span className="font-medium">
                  {status.transactionsImported} transaction
                  {status.transactionsImported !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Skipped:</span>
                <span className="font-medium">
                  {status.transactionsSkipped} duplicate
                  {status.transactionsSkipped !== 1 ? 's' : ''}
                </span>
              </div>

              {status.status === 'FAILED' && status.errorDetails && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {status.errorDetails}
                </div>
              )}

              {isInProgress && (
                <p className="text-sm text-muted-foreground">
                  Please wait while we fetch and categorize your transactions...
                </p>
              )}

              {status.status === 'SUCCESS' && (
                <p className="text-sm text-green-700">
                  Your transactions have been imported and categorized successfully!
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
