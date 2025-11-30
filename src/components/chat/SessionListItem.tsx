'use client'

import { motion } from 'framer-motion'
import { Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/types/chat'

interface SessionListItemProps {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  preview?: string
}

export function SessionListItem({
  session,
  isActive,
  onClick,
  onDelete,
  preview,
}: SessionListItemProps) {
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex items-start gap-3 rounded-lg p-3 transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-sage-100 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-700'
          : 'hover:bg-warm-gray-50 dark:hover:bg-warm-gray-800/50'
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <MessageSquare
          className={cn(
            'h-4 w-4',
            isActive
              ? 'text-sage-600 dark:text-sage-400'
              : 'text-warm-gray-400 dark:text-warm-gray-500'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'text-sm font-medium truncate mb-0.5',
            isActive
              ? 'text-sage-900 dark:text-sage-100'
              : 'text-warm-gray-900 dark:text-warm-gray-100'
          )}
        >
          {session.title}
        </h4>
        {preview && (
          <p className="text-xs text-warm-gray-500 dark:text-warm-gray-400 truncate">
            {preview}
          </p>
        )}
        <p className="text-xs text-warm-gray-400 dark:text-warm-gray-500 mt-1">
          {formatTimestamp(session.updatedAt)}
        </p>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-terracotta-500" />
        <span className="sr-only">Delete session</span>
      </Button>
    </motion.div>
  )
}
