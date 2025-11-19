'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'
import { RefreshCw } from 'lucide-react'

interface SyncButtonProps {
  bankConnectionId: string
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

/**
 * SyncButton Component
 *
 * Manual sync trigger with real-time progress polling.
 * Shows loading state, displays toast notifications, and automatically
 * invalidates React Query caches on successful sync.
 */
export function SyncButton({
  bankConnectionId,
  disabled,
  variant = 'outline',
  size = 'sm',
}: SyncButtonProps) {
  const [syncLogId, setSyncLogId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  // Trigger sync mutation
  const triggerSync = trpc.syncTransactions.trigger.useMutation({
    onSuccess: (result) => {
      setSyncLogId(result.syncLogId)
      toast({
        title: 'Sync started',
        description: 'Fetching transactions from bank...',
      })
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Poll for sync status (every 2 seconds)
  const { data: status } = trpc.syncTransactions.status.useQuery(
    { syncLogId: syncLogId! },
    {
      refetchInterval: 2000, // 2 seconds
      enabled: !!syncLogId,
    }
  )

  // Watch for status changes and handle completion
  useEffect(() => {
    if (!status) return

    // Stop polling on completion
    if (status.status === 'SUCCESS') {
      setSyncLogId(null)

      // Invalidate ALL related caches for complete UI refresh (8 total)
      utils.transactions.list.invalidate()
      utils.budgets.progress.invalidate()
      utils.budgets.summary.invalidate()
      utils.budgets.activeAlerts.invalidate() // NEW: Budget alerts
      utils.analytics.dashboardSummary.invalidate() // NEW: Dashboard analytics
      utils.accounts.list.invalidate() // NEW: Account balances
      utils.bankConnections.list.invalidate()
      utils.syncTransactions.history.invalidate()

      toast({
        title: 'Sync complete',
        description: `Imported ${status.transactionsImported} new transactions${
          status.transactionsSkipped > 0
            ? `, skipped ${status.transactionsSkipped} duplicates`
            : ''
        }`,
      })
    } else if (status.status === 'FAILED') {
      setSyncLogId(null)

      toast({
        title: 'Sync failed',
        description: status.errorDetails || 'Unknown error occurred',
        variant: 'destructive',
      })
    }
  }, [status, utils, setSyncLogId])

  const handleSync = () => {
    triggerSync.mutate({ bankConnectionId })
  }

  const isSyncing = triggerSync.isPending || !!syncLogId

  return (
    <Button
      onClick={handleSync}
      disabled={disabled || isSyncing}
      variant={variant}
      size={size}
      loading={isSyncing}
    >
      {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </Button>
  )
}
