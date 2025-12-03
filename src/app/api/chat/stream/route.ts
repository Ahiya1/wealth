// SSE Streaming Route for Wealth AI Chat - Iteration 22
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getToolDefinitions, executeToolCall } from '@/server/services/chat-tools.service'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTitleFromMessage(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= 50) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  const truncated = cleaned.substring(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  const title = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated
  return title.charAt(0).toUpperCase() + title.slice(1) + '...'
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

// Cleanup expired rate limit entries every 5 minutes to prevent memory leaks
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  let cleanedCount = 0

  for (const [userId, entry] of rateLimitStore) {
    // Add 1 minute grace period after reset time
    if (now > entry.resetAt + 60000) {
      rateLimitStore.delete(userId)
      cleanedCount++
    }
  }

  if (cleanedCount > 0) {
    console.log('[Chat] Rate limiter cleanup:', cleanedCount, 'entries removed')
  }
}, RATE_LIMIT_CLEANUP_INTERVAL_MS)

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

async function buildSystemPrompt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  })

  return `You are Wealth AI, a helpful financial assistant for ${user?.name || 'the user'}.

CONTEXT:
- User currency: ${user?.currency || 'NIS'} (Israeli Shekel, ₪)
- You have access to real financial data via tools

GUIDELINES:
1. Always use tools to fetch real data - never make up numbers
2. Format amounts as: "₪X,XXX.XX" (e.g., "₪1,234.56")
3. Be conversational and helpful, not robotic
4. Provide actionable insights, not just data dumps
5. If unsure, ask clarifying questions

EXAMPLES:
User: "How much did I spend on groceries last month?"
You: [Use get_transactions with category filter]
Response: "You spent ₪1,245.50 on groceries in November. That's about ₪40/day."

Now help the user manage their finances!`
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  // 1. Authenticate via Supabase, then get Prisma user
  const supabase = createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get Prisma user (ChatSession.userId references Prisma User.id, not Supabase Auth ID)
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
  })

  if (!user) {
    return new Response('User not found', { status: 401 })
  }

  // 2. Check feature flag
  if (process.env.WEALTH_AI_ENABLED !== 'true') {
    return new Response('AI chat feature disabled', { status: 503 })
  }

  // 3. Rate limiting
  const rateLimitOk = checkRateLimit(user.id, 10, 60000) // 10 per minute
  if (!rateLimitOk) {
    return new Response('Rate limit exceeded. Please try again in a minute.', {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    })
  }

  // 4. Parse request
  let sessionId: string
  let message: string

  try {
    const body = await req.json()
    sessionId = body.sessionId
    message = body.message

    if (!sessionId || !message) {
      return new Response('Missing sessionId or message', { status: 400 })
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return new Response('Message must be a non-empty string', { status: 400 })
    }
  } catch (_error) {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // 5. Validate session ownership
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.userId !== user.id) {
    return new Response('Session not found', { status: 404 })
  }

  // 6. Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'user',
      content: message.trim(),
    },
  })

  // 7. Load message history (last 40 messages for context)
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })

  // 8. Create SSE stream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build Claude messages array from history
        const claudeMessages = history.map((msg) => ({
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }))

        // Get system prompt
        const systemPrompt = await buildSystemPrompt(user.id)

        // Stream from Claude API with tools
        console.log(`[Chat] Starting stream for session ${sessionId}`)
        const claudeStream = await claude.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          temperature: 0.3,
          system: systemPrompt,
          messages: claudeMessages,
          tools: getToolDefinitions(),
        })

        let fullContent = ''
        const toolCalls: Array<{ id: string; name: string; input: any }> = []
        let currentToolIndex = -1
        const toolInputJsonFragments: string[] = []

        // Process streaming events
        for await (const event of claudeStream) {
          // Handle text deltas and input JSON deltas
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullContent += text

              // Send text chunk as SSE event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }

            // Accumulate tool input JSON fragments
            if (event.delta.type === 'input_json_delta') {
              if (currentToolIndex >= 0) {
                toolInputJsonFragments[currentToolIndex] += event.delta.partial_json
              }
            }
          }

          // Handle tool use blocks
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              currentToolIndex++
              toolInputJsonFragments[currentToolIndex] = ''
              toolCalls.push({
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},  // Will be populated from input_json_delta events
              })
            }
          }

          // Handle content block stop - parse accumulated JSON
          if (event.type === 'content_block_stop') {
            const jsonFragment = toolInputJsonFragments[currentToolIndex]
            const currentToolCall = toolCalls[currentToolIndex]
            if (currentToolIndex >= 0 && jsonFragment && currentToolCall) {
              try {
                const parsedInput = JSON.parse(jsonFragment)
                currentToolCall.input = parsedInput
              } catch (parseError) {
                console.error('[Chat] Failed to parse tool input JSON:', parseError)
                console.error('[Chat] Raw fragments:', jsonFragment)
                // Keep input as {} - tool will handle gracefully
              }
            }
          }

          // Handle message completion (not stream stop yet)
          if (event.type === 'message_delta') {
            if (event.delta.stop_reason === 'tool_use') {
              // Deduplicate tool calls by ID to prevent re-execution
              const seenToolIds = new Set<string>()
              const uniqueToolCalls = toolCalls.filter((tc) => {
                if (seenToolIds.has(tc.id)) {
                  console.warn('[Chat] Skipping duplicate tool call:', tc.id, tc.name)
                  return false
                }
                seenToolIds.add(tc.id)
                return true
              })

              // Claude wants to use tools - execute them
              console.log(`[Chat] Executing ${uniqueToolCalls.length} tool(s) for session ${sessionId}`)

              const toolResults = await Promise.all(
                uniqueToolCalls.map(async (toolCall) => {
                  console.log('[Chat] Executing tool:', toolCall.name, 'with input:', JSON.stringify(toolCall.input))
                  const toolStartTime = Date.now()

                  try {
                    const result = await executeToolCall(
                      toolCall.name,
                      toolCall.input,
                      user.id,
                      prisma
                    )

                    const toolDuration = Date.now() - toolStartTime
                    console.log(`[Chat] Tool ${toolCall.name} completed in ${toolDuration}ms`)

                    return {
                      type: 'tool_result' as const,
                      tool_use_id: toolCall.id,
                      content: JSON.stringify(result),
                    }
                  } catch (error) {
                    const toolDuration = Date.now() - toolStartTime
                    console.error(`[Chat] Tool ${toolCall.name} failed in ${toolDuration}ms:`, error)
                    return {
                      type: 'tool_result' as const,
                      tool_use_id: toolCall.id,
                      is_error: true,
                      content:
                        error instanceof Error
                          ? error.message
                          : 'Unable to complete this action. Please try again.',
                    }
                  }
                })
              )

              // Continue conversation with tool results (use uniqueToolCalls for consistency)
              claudeMessages.push({
                role: 'assistant' as const,
                content: uniqueToolCalls.map((tc) => ({
                  type: 'tool_use' as const,
                  id: tc.id,
                  name: tc.name,
                  input: tc.input,
                })) as any, // Tool use content type
              })

              claudeMessages.push({
                role: 'user' as const,
                content: toolResults as any, // Tool results content type
              })

              // Resume streaming with tool results - with retry logic
              console.log(`[Chat] Resuming stream with ${toolResults.length} tool result(s) for session ${sessionId}`)

              let resumeAttempt = 0
              const maxResumeAttempts = 2

              while (resumeAttempt <= maxResumeAttempts) {
                try {
                  const resumeStream = await claude.messages.stream({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 4096,
                    temperature: 0.3,
                    system: systemPrompt,
                    messages: claudeMessages,
                    tools: getToolDefinitions(),
                  })

                  // State for resume stream nested tool calls
                  let resumeToolIndex = -1
                  const resumeToolInputJsons: string[] = []
                  const resumeToolCalls: Array<{ id: string; name: string; input: any }> = []

                  // Continue processing resume stream
                  for await (const resumeEvent of resumeStream) {
                    // Handle text deltas and input JSON deltas
                    if (resumeEvent.type === 'content_block_delta') {
                      if (resumeEvent.delta.type === 'text_delta') {
                        const text = resumeEvent.delta.text
                        fullContent += text
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                        )
                      }

                      // Handle nested tool input deltas
                      if (resumeEvent.delta.type === 'input_json_delta') {
                        if (resumeToolIndex >= 0) {
                          resumeToolInputJsons[resumeToolIndex] += resumeEvent.delta.partial_json
                        }
                      }
                    }

                    // Handle nested tool block start
                    if (resumeEvent.type === 'content_block_start') {
                      if (resumeEvent.content_block.type === 'tool_use') {
                        resumeToolIndex++
                        resumeToolInputJsons[resumeToolIndex] = ''
                        resumeToolCalls.push({
                          id: resumeEvent.content_block.id,
                          name: resumeEvent.content_block.name,
                          input: {},
                        })
                      }
                    }

                    // Finalize nested tool inputs
                    if (resumeEvent.type === 'content_block_stop') {
                      const resumeJsonFragment = resumeToolInputJsons[resumeToolIndex]
                      const resumeCurrentToolCall = resumeToolCalls[resumeToolIndex]
                      if (resumeToolIndex >= 0 && resumeJsonFragment && resumeCurrentToolCall) {
                        try {
                          resumeCurrentToolCall.input = JSON.parse(resumeJsonFragment)
                        } catch (e) {
                          console.error('[Chat] Failed to parse resume tool input:', e)
                        }
                      }
                    }

                    if (resumeEvent.type === 'message_stop') {
                      // Save assistant message with tool results (use uniqueToolCalls)
                      await prisma.chatMessage.create({
                        data: {
                          sessionId,
                          role: 'assistant',
                          content: fullContent,
                          toolCalls: uniqueToolCalls,
                        },
                      })

                      // Auto-generate session title after first exchange
                      const messageCount = await prisma.chatMessage.count({
                        where: { sessionId }
                      })

                      if (messageCount === 2) {
                        // Get first user message
                        const firstMessage = await prisma.chatMessage.findFirst({
                          where: { sessionId, role: 'user' },
                          orderBy: { createdAt: 'asc' },
                        })

                        if (firstMessage) {
                          const title = generateTitleFromMessage(firstMessage.content)
                          await prisma.chatSession.update({
                            where: { id: sessionId },
                            data: { title },
                          })
                        }
                      }

                      // Update session timestamp
                      await prisma.chatSession.update({
                        where: { id: sessionId },
                        data: { updatedAt: new Date() },
                      })

                      // Send completion event
                      console.log(`[Chat] Stream completed for session ${sessionId}`)
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                      controller.close()
                      return
                    }
                  }

                  // If we get here without returning, stream completed successfully
                  break

                } catch (resumeError) {
                  resumeAttempt++
                  console.error(`[Chat] Resume stream attempt ${resumeAttempt} failed:`, resumeError)

                  if (resumeAttempt > maxResumeAttempts) {
                    // All retries exhausted - send user-friendly error
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      error: 'I was unable to process your request. Please try again.'
                    })}\n\n`))
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                    return
                  }

                  // Exponential backoff: 1s, 2s
                  await new Promise(resolve => setTimeout(resolve, 1000 * resumeAttempt))
                }
              }
            }
          }

          // Handle stream completion (no tools)
          if (event.type === 'message_stop') {
            // Save assistant message to database
            await prisma.chatMessage.create({
              data: {
                sessionId,
                role: 'assistant',
                content: fullContent,
              },
            })

            // Auto-generate session title after first exchange
            const messageCount = await prisma.chatMessage.count({
              where: { sessionId }
            })

            if (messageCount === 2) {
              // Get first user message
              const firstMessage = await prisma.chatMessage.findFirst({
                where: { sessionId, role: 'user' },
                orderBy: { createdAt: 'asc' },
              })

              if (firstMessage) {
                const title = generateTitleFromMessage(firstMessage.content)
                await prisma.chatSession.update({
                  where: { id: sessionId },
                  data: { title },
                })
              }
            }

            // Update session timestamp
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            })

            // Send completion event
            console.log(`[Chat] Stream completed for session ${sessionId}`)
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        }
      } catch (error) {
        console.error('[Chat] Stream error:', error)

        // Send error event to client
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred'

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
        )

        controller.close()
      }
    },
  })

  // 9. Return SSE response with correct headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
