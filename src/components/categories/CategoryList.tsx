// CategoryList component - Builder-2
'use client'

import { trpc } from '@/lib/trpc'
import { CategoryBadge } from './CategoryBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Archive, Edit } from 'lucide-react'

interface CategoryListProps {
  onEdit?: (categoryId: string) => void
}

export function CategoryList({ onEdit }: CategoryListProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: categories, isLoading, error } = trpc.categories.list.useQuery()

  const archiveCategory = trpc.categories.archive.useMutation({
    onSuccess: () => {
      toast({ title: 'Category archived successfully' })
      utils.categories.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-terracotta-200 bg-terracotta-50 p-4 shadow-soft">
        <p className="text-sm text-terracotta-800 leading-relaxed">Error loading categories: {error.message}</p>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-lg border border-muted bg-muted/10 p-8 text-center">
        <p className="text-muted-foreground">No categories found</p>
      </div>
    )
  }

  // Separate default and custom categories
  const defaultCategories = categories.filter((c) => c.isDefault)
  const customCategories = categories.filter((c) => !c.isDefault)

  // Group by parent/child
  const parentCategories = (cats: typeof categories) => cats.filter((c) => !c.parentId)
  const childCategories = (cats: typeof categories, parentId: string) =>
    cats.filter((c) => c.parentId === parentId)

  const renderCategory = (category: (typeof categories)[0], isChild = false) => {
    const children = childCategories(categories, category.id)
    const isDefault = category.isDefault

    return (
      <div key={category.id} className={isChild ? 'ml-6 mt-2' : ''}>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <CategoryBadge category={category} size="md" />
              {children.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {children.length} {children.length === 1 ? 'child' : 'children'}
                </span>
              )}
              {isDefault && (
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                  Default
                </span>
              )}
            </div>

            {!isDefault && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(category.id)}
                  disabled={isDefault}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Archive category "${category.name}"?`)) {
                      archiveCategory.mutate({ id: category.id })
                    }
                  }}
                  loading={archiveCategory.isPending}
                  disabled={isDefault}
                >
                  <Archive size={16} />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Render children */}
        {children.map((child) => renderCategory(child, true))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Default Categories */}
      {defaultCategories.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-semibold mb-3">Default Categories</h3>
          <div className="space-y-2">
            {parentCategories(defaultCategories).map((cat) => renderCategory(cat))}
          </div>
        </div>
      )}

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-semibold mb-3">Your Custom Categories</h3>
          <div className="space-y-2">
            {parentCategories(customCategories).map((cat) => renderCategory(cat))}
          </div>
        </div>
      )}

      {customCategories.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Custom Categories Yet</CardTitle>
            <CardDescription>
              Create your own categories to organize your transactions beyond the default ones.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
