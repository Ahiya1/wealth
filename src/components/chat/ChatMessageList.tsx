'use client'

import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessageListProps {
  messages: ChatMessageType[]
  isLoading?: boolean
  streamingMessageId?: string | null
}

export function ChatMessageList({
  messages,
  isLoading,
  streamingMessageId,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessageId])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-20 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={Sparkles}
          title="Start a conversation"
          description="Ask me anything about your finances! I can help you track spending, check budgets, and analyze your financial data."
        />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
        />
      ))}
    </div>
  )
}
