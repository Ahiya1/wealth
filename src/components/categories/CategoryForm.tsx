// CategoryForm component - Builder-2
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import * as LucideIcons from 'lucide-react'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  parentId: z.string().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  categoryId?: string
  onSuccess?: () => void
}

// Popular icons for categories
const POPULAR_ICONS = [
  'ShoppingCart',
  'Utensils',
  'Car',
  'Home',
  'Heart',
  'DollarSign',
  'CreditCard',
  'Coffee',
  'ShoppingBag',
  'Tv',
  'Briefcase',
  'Zap',
  'Fuel',
  'Store',
  'Bus',
  'MoreHorizontal',
]

// Popular colors
const POPULAR_COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // orange
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#6b7280', // gray
  '#14b8a6', // teal
  '#f97316', // orange-red
  '#a855f7', // violet
]

export function CategoryForm({ categoryId, onSuccess }: CategoryFormProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: categories } = trpc.categories.list.useQuery()
  const { data: existingCategory } = trpc.categories.get.useQuery(
    { id: categoryId! },
    { enabled: !!categoryId }
  )

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Category created successfully' })
      utils.categories.list.invalidate()
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Category updated successfully' })
      utils.categories.list.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: existingCategory ? {
      name: existingCategory.name,
      icon: existingCategory.icon || undefined,
      color: existingCategory.color || undefined,
      parentId: existingCategory.parentId || undefined,
    } : {
      name: '',
      icon: 'MoreHorizontal',
      color: POPULAR_COLORS[0],
    },
  })

  const selectedIcon = watch('icon')
  const selectedColor = watch('color')

  const onSubmit = (data: CategoryFormData) => {
    if (categoryId) {
      updateCategory.mutate({ id: categoryId, ...data })
    } else {
      createCategory.mutate(data)
    }
  }

  // Parent categories only (no children as parents)
  const parentCategories = categories?.filter((c) => !c.parentId) || []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Home Office"
          disabled={!!categoryId && existingCategory?.isDefault}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <Select
          value={selectedIcon}
          onValueChange={(value) => setValue('icon', value)}
          disabled={!!categoryId && existingCategory?.isDefault}
        >
          <SelectTrigger>
            <SelectValue>
              <div className="flex items-center gap-2">
                {selectedIcon &&
                  (() => {
                    const Icon = LucideIcons[selectedIcon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>
                    return Icon ? <Icon size={16} /> : null
                  })()}
                <span>{selectedIcon || 'Select icon'}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POPULAR_ICONS.map((iconName) => {
              const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>
              return (
                <SelectItem key={iconName} value={iconName}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    <span>{iconName}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex items-center gap-2">
          <Input
            id="color"
            type="color"
            {...register('color')}
            className="w-20 h-10"
            disabled={!!categoryId && existingCategory?.isDefault}
          />
          <div className="flex gap-1 flex-wrap">
            {POPULAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? '#000' : 'transparent',
                }}
                onClick={() => setValue('color', color)}
                disabled={!!categoryId && existingCategory?.isDefault}
              />
            ))}
          </div>
        </div>
        {errors.color && <p className="text-sm text-red-600">{errors.color.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentId">Parent Category (Optional)</Label>
        <Select
          value={watch('parentId') || '__none__'}
          onValueChange={(value) => setValue('parentId', value === '__none__' ? undefined : value)}
          disabled={!!categoryId && existingCategory?.isDefault}
        >
          <SelectTrigger>
            <SelectValue placeholder="None (top-level category)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None (top-level category)</SelectItem>
            {parentCategories.map((parent) => {
              const Icon = parent.icon
                ? (LucideIcons[parent.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; style?: React.CSSProperties }>)
                : null
              return (
                <SelectItem key={parent.id} value={parent.id}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} style={{ color: parent.color || undefined }} />}
                    <span>{parent.name}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {existingCategory?.isDefault && (
        <p className="text-sm text-muted-foreground">
          Default categories cannot be edited. Create a new custom category instead.
        </p>
      )}

      <Button
        type="submit"
        loading={createCategory.isPending || updateCategory.isPending}
        disabled={!!categoryId && existingCategory?.isDefault}
      >
        {createCategory.isPending || updateCategory.isPending
          ? 'Saving...'
          : categoryId
          ? 'Update Category'
          : 'Create Category'}
      </Button>
    </form>
  )
}
