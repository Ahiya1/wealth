// src/app/api/cron/cleanup-exports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { prisma } from '@/lib/prisma'

/**
 * Cron job endpoint to cleanup expired exports
 *
 * This endpoint should be called daily by Vercel Cron
 * Protected by CRON_SECRET environment variable
 *
 * Deletes export records older than 30 days from:
 * - Vercel Blob Storage (actual files)
 * - Database (ExportHistory records)
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-exports",
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

    // Start cleanup process
    console.log('Starting export cleanup...')

    // Step 1: Find expired exports (expiresAt < now)
    const expiredExports = await prisma.exportHistory.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })

    console.log(`Found ${expiredExports.length} expired exports to clean up`)

    // Step 2: Delete blobs from Vercel Blob Storage (individual try-catch)
    let blobsDeleted = 0
    let freedBytes = 0

    for (const exp of expiredExports) {
      if (exp.blobKey) {
        try {
          await del(exp.blobKey)
          blobsDeleted++
          freedBytes += exp.fileSize
          console.log(`Deleted blob: ${exp.blobKey}`)
        } catch (error) {
          // Log error but continue with other deletions
          console.error(`Failed to delete blob ${exp.blobKey}:`, error)
          // Continue with deletion - orphaned blobs are acceptable
        }
      }
    }

    // Step 3: Delete database records
    const deleteResult = await prisma.exportHistory.deleteMany({
      where: {
        id: { in: expiredExports.map((e) => e.id) },
      },
    })

    console.log(
      `Cleanup complete: ${deleteResult.count} records deleted, ${blobsDeleted} blobs deleted, ${freedBytes} bytes freed`
    )

    return NextResponse.json({
      success: true,
      message: 'Export cleanup completed',
      results: {
        exportsDeleted: deleteResult.count,
        blobsDeleted,
        bytesFreed: freedBytes,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error cleaning up exports:', error)
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
