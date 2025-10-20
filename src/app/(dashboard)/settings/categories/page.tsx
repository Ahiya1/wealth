// Categories management page - Builder-2
'use client'

import { useState } from 'react'
import { CategoryList } from '@/components/categories/CategoryList'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export default function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>()

  const handleEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategoryId(undefined)
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Categories</h1>
            <p className="text-muted-foreground leading-relaxed">Manage your transaction categories</p>
          </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2" size={16} />
          New Category
        </Button>
      </div>

      <CategoryList onEdit={handleEdit} />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategoryId ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategoryId
                  ? 'Update the category details below.'
                  : 'Add a custom category to organize your transactions.'}
              </DialogDescription>
            </DialogHeader>
            <CategoryForm categoryId={editingCategoryId} onSuccess={handleCloseDialog} />
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
