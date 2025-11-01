// CategorySelect component - Builder-2
'use client'

import { trpc } from '@/lib/trpc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import * as LucideIcons from 'lucide-react'

interface CategorySelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CategorySelect({
  value,
  onValueChange,
  placeholder = 'Select category',
  disabled = false,
}: CategorySelectProps) {
  const { data: categories, isLoading } = trpc.categories.list.useQuery()

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading categories..." />
        </SelectTrigger>
      </Select>
    )
  }

  // Group categories by parent
  const parentCategories = categories?.filter((c) => !c.parentId) || []
  const childCategories = categories?.filter((c) => c.parentId) || []

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {parentCategories.map((parent) => {
          const children = childCategories.filter((c) => c.parentId === parent.id)
          const Icon = parent.icon
            ? (LucideIcons[parent.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; style?: React.CSSProperties }>)
            : null

          return (
            <div key={parent.id}>
              <SelectItem value={parent.id}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={16} style={{ color: parent.color || undefined }} />}
                  <span>{parent.name}</span>
                </div>
              </SelectItem>
              {children.map((child) => {
                const ChildIcon = child.icon
                  ? (LucideIcons[child.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; style?: React.CSSProperties }>)
                  : null

                return (
                  <SelectItem key={child.id} value={child.id} className="pl-8">
                    <div className="flex items-center gap-2">
                      {ChildIcon && (
                        <ChildIcon size={14} style={{ color: child.color || undefined }} />
                      )}
                      <span className="text-sm">{child.name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </div>
          )
        })}
      </SelectContent>
    </Select>
  )
}
