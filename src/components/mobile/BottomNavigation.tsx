'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useScrollDirection } from '@/hooks/useScrollDirection'
import {
  primaryNavItems,
  isNavItemActive,
  isOverflowActive,
} from '@/lib/mobile-navigation'
import { MoreSheet } from './MoreSheet'
import { MoreHorizontal } from 'lucide-react'

interface BottomNavigationProps {
  className?: string
  autoHide?: boolean
}

/**
 * Bottom Navigation Component
 *
 * Mobile-first navigation bar with 5 tabs (4 primary + More overflow)
 * Features:
 * - Scroll-hide behavior (hide on down, show on up)
 * - Active state highlighting
 * - Safe area support for iPhone notch/Android gesture bar
 * - Z-index coordination (z-45, below modals at z-50)
 * - Touch target compliance (48px minimum)
 * - Dark mode support
 * - Accessibility (ARIA labels, keyboard navigation)
 */
export function BottomNavigation({
  className,
  autoHide = true,
}: BottomNavigationProps) {
  const pathname = usePathname()
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 80 })
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  // Show nav when scrolling up or at top of page
  const showNav = !autoHide || scrollDirection === 'up' || isAtTop

  // Check if More sheet should be highlighted (any overflow route active)
  const isMoreActive = isOverflowActive(pathname)

  return (
    <>
      <motion.nav
        animate={{ y: showNav ? 0 : 80 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ willChange: 'transform' }}
        className={cn(
          'fixed bottom-0 inset-x-0 z-[45]',
          'lg:hidden', // Hide on desktop
          'bg-white dark:bg-warm-gray-900',
          'border-t border-warm-gray-200 dark:border-warm-gray-700',
          'safe-area-bottom', // Safe area padding for iPhone/Android
          className
        )}
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around h-16">
          {/* Primary navigation tabs */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const active = isNavItemActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'min-w-[60px] min-h-[48px] gap-1 px-2',
                  'transition-colors duration-200',
                  'rounded-lg',
                  'hover:bg-sage-50 dark:hover:bg-sage-900/30',
                  active
                    ? 'text-sage-600 dark:text-sage-400'
                    : 'text-muted-foreground'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-6 w-6',
                    active && 'fill-sage-600/20 dark:fill-sage-400/20'
                  )}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* More button (opens sheet) */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center',
              'min-w-[60px] min-h-[48px] gap-1 px-2',
              'transition-colors duration-200',
              'rounded-lg',
              'hover:bg-sage-50 dark:hover:bg-sage-900/30',
              isMoreActive || moreSheetOpen
                ? 'text-sage-600 dark:text-sage-400'
                : 'text-muted-foreground'
            )}
            aria-label="More navigation options"
            aria-expanded={moreSheetOpen}
            aria-haspopup="dialog"
          >
            <MoreHorizontal
              className={cn(
                'h-6 w-6',
                (isMoreActive || moreSheetOpen) && 'fill-sage-600/20 dark:fill-sage-400/20'
              )}
            />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </motion.nav>

      {/* More sheet (overflow navigation) */}
      <MoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} />
    </>
  )
}
