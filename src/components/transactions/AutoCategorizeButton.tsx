// Auto-categorize button component - Builder-5C
'use client'

import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui/use-toast'
import { Sparkles, Loader2 } from 'lucide-react'

interface AutoCategorizeButtonProps {
  onComplete?: () => void
}

export function AutoCategorizeButton({ onComplete }: AutoCategorizeButtonProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const autoCategorize = trpc.transactions.autoCategorizeUncategorized.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Categorization Complete',
        description: data.message,
      })
      // Invalidate transaction queries to refetch with new categories
      utils.transactions.list.invalidate()
      onComplete?.()
    },
    onError: (error) => {
      toast({
        title: 'Categorization Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => autoCategorize.mutate()}
      disabled={autoCategorize.isPending}
    >
      {autoCategorize.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Categorizing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Auto-Categorize
        </>
      )}
    </Button>
  )
}
