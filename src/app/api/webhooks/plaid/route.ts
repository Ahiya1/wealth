// src/app/api/webhooks/plaid/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncTransactionsFromPlaid } from '@/server/services/plaid-sync.service'

/**
 * Plaid webhook handler
 * Receives notifications from Plaid about transaction updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { webhook_type, webhook_code, item_id } = body

    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id })

    // Handle TRANSACTIONS webhooks
    if (webhook_type === 'TRANSACTIONS') {
      const account = await prisma.account.findFirst({
        where: { plaidAccountId: item_id },
      })

      if (!account) {
        console.warn(`Account not found for item_id: ${item_id}`)
        return NextResponse.json({ received: true })
      }

      switch (webhook_code) {
        case 'INITIAL_UPDATE':
        case 'HISTORICAL_UPDATE':
        case 'DEFAULT_UPDATE': {
          // Trigger transaction sync for this account
          try {
            await syncTransactionsFromPlaid(account.userId, account.id, prisma)
            console.log(`Synced transactions for account ${account.id}`)
          } catch (error) {
            console.error('Error syncing transactions from webhook:', error)
          }
          break
        }

        case 'TRANSACTIONS_REMOVED': {
          // Handle removed transactions
          // This is already handled in the sync service
          console.log('TRANSACTIONS_REMOVED webhook received, will be handled in next sync')
          break
        }

        default:
          console.log(`Unhandled TRANSACTIONS webhook code: ${webhook_code}`)
      }
    }

    // Handle ITEM webhooks
    if (webhook_type === 'ITEM') {
      if (webhook_code === 'ERROR') {
        // Mark account as needs reconnection
        const account = await prisma.account.findFirst({
          where: { plaidAccountId: item_id },
        })

        if (account) {
          // Could add a "status" field to Account model in future
          // For now, just log the error
          console.error(`Plaid item error for account ${account.id}`)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Plaid webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
