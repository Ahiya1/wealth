'use client'

import { useState, useEffect } from 'react'
import { Download, Share2, ShareIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPlatformInfo, type PlatformInfo } from '@/lib/exportHelpers'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  onClick: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  recordCount?: number
  className?: string
  children?: React.ReactNode
}

export function ExportButton({
  onClick,
  loading,
  disabled,
  recordCount,
  className,
  children
}: ExportButtonProps) {
  // Platform detection - client-side only to avoid SSR issues
  const [platform, setPlatform] = useState<PlatformInfo | null>(null)

  useEffect(() => {
    setPlatform(getPlatformInfo())
  }, [])

  // Platform-aware icon (default to Download during SSR)
  const Icon = platform?.hasShareAPI && platform?.isMobile
    ? (platform.isIOS ? ShareIcon : Share2)
    : Download

  // Platform-aware label (default to Export during SSR)
  const defaultLabel = platform?.hasShareAPI && platform?.isMobile
    ? 'Share'
    : 'Export'

  // Disable if no data to export
  const isDisabled = disabled || (recordCount !== undefined && recordCount === 0)

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      variant="outline"
      size="default" // 44px mobile, 40px desktop
      className={cn(
        'border-sage-200 hover:bg-sage-50 dark:border-sage-700 dark:hover:bg-sage-900',
        className
      )}
      aria-label={children ? String(children) : defaultLabel}
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}

      {children || defaultLabel}

      {recordCount !== undefined && recordCount > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          ({recordCount.toLocaleString()})
        </span>
      )}
    </Button>
  )
}
