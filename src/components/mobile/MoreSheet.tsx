'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { overflowNavItems, isNavItemActive } from '@/lib/mobile-navigation'

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * More Sheet Component
 *
 * Bottom sheet dialog for overflow navigation items
 * Features:
 * - Extends Radix Dialog with bottom positioning
 * - Slide-up animation
 * - Safe area handling for iPhone/Android
 * - Active state highlighting
 * - Closes on navigation
 * - Accessibility (focus trap, ARIA, keyboard)
 */
export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const pathname = usePathname()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Bottom sheet positioning (override Dialog center positioning)
          'fixed bottom-0 left-0 right-0 top-auto',
          'translate-y-0 translate-x-0',
          // Rounded top corners only
          'rounded-t-2xl rounded-b-none',
          // Safe area padding
          'safe-area-bottom',
          // Max height (don't cover entire screen)
          'max-h-[80vh] overflow-y-auto',
          // Styling
          'bg-white dark:bg-warm-gray-900',
          'border-t border-l border-r',
          'border-warm-gray-200 dark:border-warm-gray-700',
          // Animation (slide from bottom)
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full',
          'data-[state=open]:duration-300 data-[state=closed]:duration-300',
        )}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">More</DialogTitle>
        </DialogHeader>

        {/* Navigation items */}
        <nav className="space-y-1 py-2" role="navigation" aria-label="More navigation options">
          {overflowNavItems.map((item) => {
            // TODO: Add role check for admin items
            // For now, show all items including admin
            const Icon = item.icon
            const active = isNavItemActive(pathname, item.href)

            return (
              <MoreSheetItem
                key={item.href}
                href={item.href}
                icon={Icon}
                active={active}
                onClick={() => onOpenChange(false)}
              >
                {item.label}
              </MoreSheetItem>
            )
          })}
        </nav>
      </DialogContent>
    </Dialog>
  )
}

interface MoreSheetItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}

/**
 * Individual item in the More Sheet
 * Touch target compliant (48px height)
 */
function MoreSheetItem({
  href,
  icon: Icon,
  children,
  active = false,
  onClick,
}: MoreSheetItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3',
        'px-4 py-3', // 48px touch target
        'rounded-lg',
        'transition-colors duration-200',
        'hover:bg-sage-50 dark:hover:bg-sage-900/30',
        active
          ? 'bg-sage-100 text-sage-900 dark:bg-sage-900 dark:text-sage-100'
          : 'text-warm-gray-700 dark:text-warm-gray-300'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'h-6 w-6',
          active && 'text-sage-600 dark:text-sage-400'
        )}
      />
      <span className="text-sm font-medium">{children}</span>
    </Link>
  )
}
