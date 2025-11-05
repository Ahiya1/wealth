"use client"

import { MobileSheet } from "./MobileSheet"
import { Button } from "@/components/ui/button"

interface MobileFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  onApply?: () => void
  onReset?: () => void
  title?: string
  description?: string
}

/**
 * MobileFilterSheet - Filter UI optimized for mobile bottom sheets
 *
 * Extends MobileSheet with filter-specific layout and actions.
 * Used for transaction/budget filtering on mobile devices.
 */
export function MobileFilterSheet({
  open,
  onOpenChange,
  children,
  onApply,
  onReset,
  title = "Filters",
  description,
}: MobileFilterSheetProps) {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="space-y-6 px-4 py-6">
        <div className="space-y-4">
          {children}
        </div>
        
        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background pb-safe-bottom">
          {onReset && (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="flex-1 h-12"
            >
              Reset
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              onApply?.()
              onOpenChange(false)
            }}
            className="flex-1 h-12"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </MobileSheet>
  )
}

MobileFilterSheet.displayName = "MobileFilterSheet"
