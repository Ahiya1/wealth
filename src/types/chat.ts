// src/types/chat.ts

/**
 * Chat Session - represents a conversation thread
 */
export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Chat Message - single message in a conversation
 */
export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[] | null
  toolResults?: ToolResult[] | null
  createdAt: Date
}

/**
 * Tool Call - Claude's request to execute a tool
 */
export interface ToolCall {
  id: string
  type: 'tool_use'
  name: string
  input: Record<string, any>
}

/**
 * Tool Result - result of tool execution
 */
export interface ToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

/**
 * Tool Definition - schema for Claude API
 */
export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      default?: any
    }>
    required?: string[]
  }
}

/**
 * Session with messages included
 */
export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[]
}

/**
 * Transaction data for tool responses (serialized, no Prisma types)
 */
export interface SerializedTransaction {
  id: string
  date: string // ISO string
  amount: number
  payee: string
  category: {
    id: string
    name: string
    color: string | null
    icon: string | null
  }
  account: {
    id: string
    name: string
    type: string
  }
  notes?: string | null
  tags: string[]
}

/**
 * Account balance data for tool responses
 */
export interface SerializedAccount {
  id: string
  name: string
  type: string
  institution: string
  balance: number
  currency: string
  isActive: boolean
}

/**
 * Category data for tool responses
 */
export interface SerializedCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  parentId: string | null
  isDefault: boolean
}

/**
 * Budget status data for tool responses
 */
export interface SerializedBudget {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  spent: number
  remaining: number
  percentage: number
  month: string
}

/**
 * Spending summary by category
 */
export interface SpendingSummary {
  category: string
  amount: number
  color: string | null
  percentage: number
}

/**
 * API request/response types for SSE streaming
 */
export interface StreamMessageRequest {
  sessionId: string
  message: string
}

export interface StreamMessageEvent {
  text?: string
  error?: string
}
