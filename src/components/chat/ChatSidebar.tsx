'use client'

import { Plus, MessageSquare } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SessionListItem } from './SessionListItem'
import type { ChatSession } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  onDeleteSession: (sessionId: string) => void
  isLoading?: boolean
  className?: string
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isLoading,
  className,
}: ChatSidebarProps) {
  return (
    <div
      className={cn(
        'w-full lg:w-80 flex flex-col border-r border-warm-gray-200 dark:border-warm-gray-700',
        'bg-warm-gray-50 dark:bg-warm-gray-900/50',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-warm-gray-200 dark:border-warm-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold text-warm-gray-900 dark:text-warm-gray-100">
            Chat Sessions
          </h2>
        </div>

        <Button onClick={onNewChat} className="w-full" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-warm-gray-200 dark:bg-warm-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No chats yet"
            description="Start a new conversation to ask questions about your finances"
          />
        ) : (
          <AnimatePresence mode="popLayout">
            {sessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
