// src/app/api/cron/generate-recurring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generatePendingRecurringTransactions } from '@/server/services/recurring.service'

/**
 * Cron job endpoint to generate pending recurring transactions
 *
 * This endpoint should be called daily by Vercel Cron or similar service
 * Protected by CRON_SECRET environment variable
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate-recurring",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron configuration error' },
        { status: 500 }
      )
    }

    // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
    const expectedAuth = `Bearer ${cronSecret}`

    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron request attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate pending recurring transactions
    console.log('Starting recurring transaction generation...')

    const generationResults = await generatePendingRecurringTransactions()

    console.log('Recurring transaction generation complete:', generationResults)

    return NextResponse.json({
      success: true,
      message: 'Recurring transactions generated successfully',
      results: {
        processed: generationResults.processed,
        created: generationResults.created,
        errors: generationResults.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating recurring transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering via external services
export async function POST(request: NextRequest) {
  return GET(request)
}
