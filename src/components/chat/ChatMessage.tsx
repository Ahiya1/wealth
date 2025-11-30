'use client'

import { motion } from 'framer-motion'
import { Bot, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { StreamingIndicator } from './StreamingIndicator'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center rounded-full h-8 w-8',
          isUser
            ? 'bg-sage-100 dark:bg-sage-900/30'
            : 'bg-warm-gray-100 dark:bg-warm-gray-800'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-sage-600 dark:text-sage-400" />
        ) : (
          <Bot className="h-4 w-4 text-warm-gray-600 dark:text-warm-gray-400" />
        )}
      </div>

      {/* Message bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]')}>
        <Card
          className={cn(
            'p-3 sm:p-4',
            isUser
              ? 'bg-sage-50 dark:bg-sage-900/30 border-sage-200 dark:border-sage-700'
              : 'bg-white dark:bg-warm-gray-900 border-warm-gray-200 dark:border-warm-gray-700'
          )}
        >
          <div className="text-sm leading-relaxed break-words">
            {message.content ? (
              isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                <MarkdownRenderer content={message.content} />
              )
            ) : (
              isStreaming && <StreamingIndicator />
            )}
          </div>
        </Card>

        {/* Timestamp */}
        <span
          className={cn(
            'text-xs text-warm-gray-400 dark:text-warm-gray-500 px-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </motion.div>
  )
}
