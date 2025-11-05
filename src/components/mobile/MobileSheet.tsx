'use client'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * MobileSheet Component
 *
 * Responsive dialog/sheet component that adapts based on screen size:
 * - Mobile (<768px): Bottom sheet with slide-up animation
 * - Desktop (≥768px): Centered dialog modal
 *
 * Features:
 * - Safe area padding for mobile devices (iPhone notch, Android gesture bar)
 * - Smooth slide animations
 * - Drag handle affordance on mobile
 * - Keyboard-aware layout
 *
 * @example
 * <MobileSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Edit Transaction"
 *   description="Update transaction details"
 * >
 *   <TransactionForm onSuccess={() => setIsOpen(false)} />
 * </MobileSheet>
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}: MobileSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) {
    // Desktop: Render as centered dialog
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('max-w-2xl', className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile: Render as bottom sheet
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            // Positioning
            'fixed inset-x-0 bottom-0 z-50',
            // Appearance
            'rounded-t-2xl border-t bg-background',
            // Sizing & Scrolling
            'max-h-[85vh] overflow-y-auto',
            // Spacing (safe area aware)
            'p-4 pb-safe-b',
            // Animations
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
            'transition-transform duration-200',
            className
          )}
        >
          {/* Drag handle (visual affordance) */}
          <div className="mx-auto w-12 h-1 rounded-full bg-muted mb-4" />

          {/* Header */}
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {/* Content */}
          <div className="mt-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
