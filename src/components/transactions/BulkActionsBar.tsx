'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, FolderOpen, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkCategorize?: (categoryId: string) => Promise<void>
  onBulkDelete?: () => Promise<void>
  categories?: Array<{ id: string; name: string; color?: string | null }>
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkCategorize,
  onBulkDelete,
  categories = [],
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkCategorize = async () => {
    if (!selectedCategory || !onBulkCategorize) return

    setIsProcessing(true)
    try {
      await onBulkCategorize(selectedCategory)
      onClearSelection()
    } finally {
      setIsProcessing(false)
      setSelectedCategory(undefined)
    }
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return

    setIsProcessing(true)
    try {
      await onBulkDelete()
      onClearSelection()
    } finally {
      setIsProcessing(false)
      setShowDeleteDialog(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-warm-gray-200 dark:border-warm-gray-600 bg-background p-4 shadow-soft-lg dark:shadow-none">
        <Badge variant="secondary" className="font-semibold">
          {selectedCount} selected
        </Badge>

        <div className="h-6 w-px bg-border" />

        {/* Bulk Categorize */}
        {onBulkCategorize && categories.length > 0 && (
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Change category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      {category.color && (
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkCategorize}
              disabled={!selectedCategory || isProcessing}
            >
              Apply
            </Button>
          </div>
        )}

        {/* Bulk Delete */}
        {onBulkDelete && (
          <>
            <div className="h-6 w-px bg-border" />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isProcessing}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        )}

        {/* Clear Selection */}
        <div className="h-6 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={isProcessing}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
