'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrencyConversionSuccess } from './CurrencyConversionSuccess'
import { useToast } from '@/components/ui/use-toast'

interface Props {
  fromCurrency: string
  toCurrency: string
  onComplete?: () => void
  onError?: () => void
}

export function CurrencyConversionProgress({ fromCurrency, toCurrency, onComplete, onError }: Props) {
  const [progress, setProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [conversionResult, setConversionResult] = useState<any>(null)

  const { toast } = useToast()
  const utils = trpc.useUtils()

  // Start conversion mutation
  const convertMutation = trpc.currency.convertCurrency.useMutation({
    onSuccess: (result) => {
      setConversionResult(result)
      setProgress(100)
      // Invalidate all queries to refresh UI with new currency
      utils.invalidate()
      setTimeout(() => {
        setShowSuccess(true)
      }, 500)
    },
    onError: (error) => {
      toast({
        title: 'Conversion Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
      onError?.()
    },
  })

  // Poll conversion status every 2 seconds
  const { data: status } = trpc.currency.getConversionStatus.useQuery(undefined, {
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    enabled: !showSuccess && !convertMutation.isError,
  })

  // Start conversion on mount
  useEffect(() => {
    convertMutation.mutate({ toCurrency: toCurrency as any })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Simulate progress based on elapsed time (real progress tracking is complex)
  useEffect(() => {
    if (status?.status === 'IN_PROGRESS' && progress < 95) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Gradually increase progress, slowing down as it gets higher
          const increment = prev < 20 ? 5 : prev < 60 ? 3 : prev < 80 ? 2 : 1
          return Math.min(prev + increment, 95)
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [status, progress])

  const getStage = () => {
    if (progress < 20) return 'Fetching exchange rates'
    if (progress < 60) return 'Converting transactions'
    if (progress < 80) return 'Updating accounts'
    if (progress < 95) return 'Updating budgets and goals'
    return 'Finalizing'
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    onComplete?.()
  }

  if (showSuccess && conversionResult) {
    return (
      <CurrencyConversionSuccess
        open={showSuccess}
        onOpenChange={handleSuccessClose}
        result={conversionResult}
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
      />
    )
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">Converting Currency...</DialogTitle>
          <DialogDescription className="text-center">
            Please do not close this window. This may take up to 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-warm-gray-600">
              <span>{getStage()}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stage Checklist */}
          <div className="space-y-2 text-sm">
            <StageItem
              completed={progress > 20}
              active={progress <= 20}
              text="Fetching exchange rates"
            />
            <StageItem
              completed={progress > 60}
              active={progress > 20 && progress <= 60}
              text="Converting transactions"
            />
            <StageItem
              completed={progress > 80}
              active={progress > 60 && progress <= 80}
              text="Updating accounts"
            />
            <StageItem
              completed={progress >= 95}
              active={progress > 80 && progress < 95}
              text="Updating budgets and goals"
            />
          </div>

          {/* Spinner */}
          <div className="flex justify-center pt-2">
            <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageItem({
  completed,
  active,
  text,
}: {
  completed: boolean
  active: boolean
  text: string
}) {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <CheckCircle className="h-4 w-4 text-sage-600 flex-shrink-0" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-sage-600 flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-warm-gray-300 flex-shrink-0" />
      )}
      <span
        className={cn(
          'text-sm',
          completed && 'text-sage-700 font-medium',
          active && 'text-warm-gray-900',
          !active && !completed && 'text-warm-gray-400'
        )}
      >
        {text}
      </span>
    </div>
  )
}
