// CategoryBadge component - Builder-2
'use client'

import { type Category } from '@prisma/client'
import * as LucideIcons from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CategoryBadgeProps {
  category: Pick<Category, 'name' | 'icon' | 'color'>
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function CategoryBadge({ category, size = 'md', showIcon = true }: CategoryBadgeProps) {
  const Icon = category.icon
    ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>)
    : LucideIcons.MoreHorizontal

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 shadow-soft ${sizeClasses[size]}`}
      style={{
        backgroundColor: category.color ? `${category.color}15` : undefined,
        color: category.color || undefined,
        borderColor: category.color || undefined,
      }}
      variant="outline"
    >
      {showIcon && Icon && (
        <Icon
          size={iconSizes[size]}
          className="flex-shrink-0"
          style={{ color: category.color || undefined }}
        />
      )}
      <span>{category.name}</span>
    </Badge>
  )
}
