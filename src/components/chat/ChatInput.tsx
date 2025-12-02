'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, StopCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileUploadZone } from './FileUploadZone'

interface ChatInputProps {
  sessionId: string | null
  onMessageSent: () => void
  onStreamingUpdate?: (text: string) => void
  onStreamingStart?: (userMessage: string) => void
  onStreamingEnd?: () => void
  disabled?: boolean
}

export function ChatInput({
  sessionId,
  onMessageSent,
  onStreamingUpdate,
  onStreamingStart,
  onStreamingEnd,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{
    file: File
    base64: string
  } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleFileUpload = (file: File, base64: string) => {
    setUploadedFile({ file, base64 })
    setError(null)
  }

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || !sessionId || isStreaming) return

    const userMessage = input.trim() || 'I uploaded a file. Please analyze it.'
    const fileData = uploadedFile
    setInput('')
    setUploadedFile(null)
    setError(null)
    setIsStreaming(true)
    onStreamingStart?.(userMessage)

    try {
      abortControllerRef.current = new AbortController()
      const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 30000)

      // Prepare request body with optional file data
      const requestBody: {
        sessionId: string
        message: string
        fileContent?: string
        fileName?: string
        fileType?: string
      } = {
        sessionId,
        message: userMessage,
      }

      if (fileData) {
        requestBody.fileContent = fileData.base64
        requestBody.fileName = fileData.file.name
        requestBody.fileType = fileData.file.name.split('.').pop()?.toLowerCase()
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            setIsStreaming(false)
            onStreamingEnd?.()
            onMessageSent()
            return
          }

          try {
            const event = JSON.parse(data)
            if (event.error) {
              throw new Error(event.error)
            }
            if (event.text) {
              onStreamingUpdate?.(event.text)
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', data, parseError)
          }
        }
      }

      // If we exit the loop without [DONE], treat as complete
      setIsStreaming(false)
      onStreamingEnd?.()
      onMessageSent()
    } catch (error) {
      setIsStreaming(false)
      onStreamingEnd?.()

      if ((error as Error).name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        const message = (error as Error).message || 'Failed to send message'
        setError(message)
        console.error('Streaming error:', error)
      }
    }
  }

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    onStreamingEnd?.()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  return (
    <div className="border-t border-warm-gray-200 dark:border-warm-gray-700 bg-white dark:bg-warm-gray-900 p-4 sm:p-6">
      {error && (
        <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-center justify-between">
          <p className="text-sm text-destructive flex-1">{error}</p>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File Upload Zone */}
      {sessionId && !isStreaming && (
        <div className="mb-4">
          <FileUploadZone onFileUpload={handleFileUpload} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex gap-2"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              sessionId
                ? 'Ask about your finances...'
                : 'Select or create a session to start chatting'
            }
            disabled={isStreaming || !sessionId || disabled}
            rows={1}
            className={cn(
              'flex w-full rounded-lg bg-background px-3 py-3 text-sm shadow-soft ring-offset-background transition-all duration-200',
              'placeholder:text-muted-foreground resize-none max-h-32 overflow-y-auto',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-soft-md',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>

        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCancel}
            className="flex-shrink-0"
          >
            <StopCircle className="h-4 w-4" />
            <span className="sr-only">Stop streaming</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && !uploadedFile) || !sessionId || disabled}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </form>

      <p className="text-xs text-warm-gray-400 dark:text-warm-gray-500 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
