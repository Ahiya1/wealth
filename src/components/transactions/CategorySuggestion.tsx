// Category suggestion component - Builder-5C
'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface CategorySuggestionProps {
  payee: string
  amount: number
  onSelect?: (categoryId: string) => void
}

/**
 * Shows AI-suggested category for a transaction
 * Useful for manual transaction entry
 */
export function CategorySuggestion({ payee, amount, onSelect }: CategorySuggestionProps) {
  const [showSuggestion, setShowSuggestion] = useState(false)

  const { data: suggestion, isLoading } = trpc.transactions.suggestCategory.useQuery(
    { payee, amount },
    {
      enabled: showSuggestion && payee.length > 0,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  )

  // Auto-hide after selection
  useEffect(() => {
    if (suggestion && onSelect) {
      setShowSuggestion(false)
    }
  }, [suggestion, onSelect])

  if (!showSuggestion) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowSuggestion(true)}
        disabled={!payee || payee.length === 0}
        className="text-xs"
      >
        <Sparkles className="mr-1 h-3 w-3" />
        Get AI Suggestion
      </Button>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span>Getting suggestion...</span>
      </div>
    )
  }

  if (!suggestion || !suggestion.categoryId) {
    return (
      <div className="text-sm text-muted-foreground">
        No suggestion available
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Suggested:</span>
      <Badge variant="outline" className="cursor-pointer hover:bg-accent">
        <Sparkles className="mr-1 h-3 w-3" />
        {suggestion.categoryName}
      </Badge>
      {onSelect && suggestion.categoryId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(suggestion.categoryId!)}
          className="text-xs"
        >
          Apply
        </Button>
      )}
    </div>
  )
}
