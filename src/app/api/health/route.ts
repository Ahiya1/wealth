import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Disable caching

interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
  checks: {
    database: 'ok' | 'error'
  }
  message?: string
}

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`

    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp,
      checks: {
        database: 'ok',
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)

    const response: HealthCheckResponse = {
      status: 'error',
      timestamp,
      checks: {
        database: 'error',
      },
      message: error instanceof Error ? error.message : 'Database connection failed',
    }

    return NextResponse.json(response, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  }
}
