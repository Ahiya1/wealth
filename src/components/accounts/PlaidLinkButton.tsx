'use client'

import { usePlaidLink } from 'react-plaid-link'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface PlaidLinkButtonProps {
  onSuccess?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function PlaidLinkButton({ onSuccess, variant = 'default', size = 'default', className }: PlaidLinkButtonProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  // Create Link token mutation
  const createLinkToken = trpc.plaid.createLinkToken.useMutation({
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize Plaid Link',
        variant: 'destructive',
      })
    },
  })

  // Exchange public token mutation
  const exchangeToken = trpc.plaid.exchangePublicToken.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Connected ${data.accountsImported} account(s) successfully`,
      })
      utils.accounts.list.invalidate()
      utils.plaid.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect bank account',
        variant: 'destructive',
      })
    },
  })

  const { open, ready } = usePlaidLink({
    token: createLinkToken.data?.linkToken ?? null,
    onSuccess: (publicToken, metadata) => {
      exchangeToken.mutate({
        publicToken,
        institutionName: metadata.institution?.name ?? 'Unknown Institution',
      })
    },
    onExit: (error) => {
      if (error) {
        toast({
          title: 'Connection Failed',
          description: error.error_message || 'Failed to connect bank account',
          variant: 'destructive',
        })
      }
    },
  })

  const handleClick = async () => {
    // Create link token if we don't have one
    if (!createLinkToken.data?.linkToken) {
      createLinkToken.mutate(undefined, {
        onSuccess: () => {
          // Link will open automatically when ready
          open()
        },
      })
    } else {
      open()
    }
  }

  const isLoading = createLinkToken.isPending || exchangeToken.isPending

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        'Connect Bank Account'
      )}
    </Button>
  )
}
