// SSE Streaming Route for Wealth AI Chat - Builder-2
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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
  // 1. Authenticate
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
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

        // Stream from Claude API
        const claudeStream = await claude.messages.stream({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 4096,
          temperature: 0.3,
          system: systemPrompt,
          messages: claudeMessages,
          // Tool definitions will be added by Builder-1
          // tools: getToolDefinitions(),
        })

        let fullContent = ''

        // Process streaming events
        for await (const event of claudeStream) {
          // Handle text deltas
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullContent += text

              // Send text chunk as SSE event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Handle stream completion
          if (event.type === 'message_stop') {
            // Save assistant message to database
            await prisma.chatMessage.create({
              data: {
                sessionId,
                role: 'assistant',
                content: fullContent,
              },
            })

            // Update session timestamp
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            })

            // Send completion event
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        }
      } catch (error) {
        console.error('Stream error:', error)

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
