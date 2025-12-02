'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { ChatSidebar } from './ChatSidebar'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
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
import type { ChatMessage } from '@/types/chat'

export function ChatPageClient() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Query sessions
  const { data: sessions, isLoading: isLoadingSessions } =
    trpc.chat.listSessions.useQuery(undefined, {
      refetchOnWindowFocus: false,
    })

  // Query messages for active session
  const { data: messages, isLoading: isLoadingMessages } =
    trpc.chat.getMessages.useQuery(
      { sessionId: activeSessionId! },
      {
        enabled: !!activeSessionId,
        refetchOnWindowFocus: false,
      }
    )

  // Create session mutation
  const createSession = trpc.chat.createSession.useMutation({
    onSuccess: (newSession) => {
      setActiveSessionId(newSession.id)
      utils.chat.listSessions.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to create chat session', {
        description: error.message,
      })
    },
  })

  // Delete session mutation
  const deleteSession = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      if (deletingSessionId === activeSessionId) {
        // If deleting active session, switch to first available session
        const remainingSessions = sessions?.filter((s) => s.id !== deletingSessionId)
        setActiveSessionId(remainingSessions?.[0]?.id || null)
      }
      utils.chat.listSessions.invalidate()
      setDeletingSessionId(null)
    },
  })

  // Auto-select first session on load
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0]!.id)
    }
  }, [sessions, activeSessionId])

  // Update local messages when query messages change
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages as ChatMessage[])
    }
  }, [messages])

  const handleNewChat = async () => {
    createSession.mutate()
  }

  const handleDeleteSession = (sessionId: string) => {
    setDeletingSessionId(sessionId)
  }

  const confirmDelete = () => {
    if (deletingSessionId) {
      deleteSession.mutate({ id: deletingSessionId })
    }
  }

  const handleStreamingStart = (userMessage: string) => {
    // Add optimistic user message first
    const userMessageId = `user-${Date.now()}`
    const optimisticUserMessage: ChatMessage = {
      id: userMessageId,
      sessionId: activeSessionId!,
      role: 'user',
      content: userMessage,
      createdAt: new Date(),
    }

    // Add optimistic streaming message for assistant
    const streamingId = `streaming-${Date.now()}`
    setStreamingMessageId(streamingId)

    const optimisticAssistantMessage: ChatMessage = {
      id: streamingId,
      sessionId: activeSessionId!,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    setLocalMessages((prev) => [...prev, optimisticUserMessage, optimisticAssistantMessage])
  }

  const handleStreamingUpdate = (text: string) => {
    setLocalMessages((prev) => {
      const updated = [...prev]
      const lastMessage = updated[updated.length - 1]
      if (lastMessage && lastMessage.id === streamingMessageId) {
        lastMessage.content += text
      }
      return updated
    })
  }

  const handleStreamingEnd = () => {
    setStreamingMessageId(null)
  }

  const handleMessageSent = () => {
    // Refetch messages after streaming completes
    utils.chat.getMessages.invalidate({ sessionId: activeSessionId! })
    // Refetch sessions to get updated title
    utils.chat.listSessions.invalidate()
  }

  const sessionToDelete = sessions?.find((s) => s.id === deletingSessionId)

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block">
        <ChatSidebar
          sessions={sessions || []}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoadingSessions || createSession.isPending}
        />
      </div>

      {/* Mobile sidebar - full screen on small devices */}
      <div className="lg:hidden w-full">
        {!activeSessionId ? (
          <ChatSidebar
            sessions={sessions || []}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            isLoading={isLoadingSessions || createSession.isPending}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Back button on mobile */}
            <div className="p-4 border-b border-warm-gray-200 dark:border-warm-gray-700 lg:hidden">
              <button
                onClick={() => setActiveSessionId(null)}
                className="text-sm text-sage-600 dark:text-sage-400 hover:underline"
              >
                � Back to sessions
              </button>
            </div>

            <ChatMessageList
              messages={localMessages}
              isLoading={isLoadingMessages}
              streamingMessageId={streamingMessageId}
            />

            <ChatInput
              sessionId={activeSessionId}
              onMessageSent={handleMessageSent}
              onStreamingUpdate={handleStreamingUpdate}
              onStreamingStart={handleStreamingStart}
              onStreamingEnd={handleStreamingEnd}
            />
          </div>
        )}
      </div>

      {/* Main chat area - desktop only */}
      <div className="hidden lg:flex lg:flex-1 flex-col">
        <ChatMessageList
          messages={localMessages}
          isLoading={isLoadingMessages}
          streamingMessageId={streamingMessageId}
        />

        <ChatInput
          sessionId={activeSessionId}
          onMessageSent={handleMessageSent}
          onStreamingUpdate={handleStreamingUpdate}
          onStreamingStart={handleStreamingStart}
          onStreamingEnd={handleStreamingEnd}
        />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingSessionId} onOpenChange={() => setDeletingSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{sessionToDelete?.title}&quot; and all its
              messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              loading={deleteSession.isPending}
              className="bg-terracotta-500 hover:bg-terracotta-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
