'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BreadcrumbProps {
  pathname: string
}

export function Breadcrumb({ pathname }: BreadcrumbProps) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        const isLast = index === segments.length - 1

        return (
          <div key={href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground dark:hover:text-warm-gray-100 transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
