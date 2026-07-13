/**
 * Zapier Revenue Automation Webhook Endpoints
 * POST endpoints for receiving webhooks from Zapier
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  handleRevenueWebhook,
  handleQuotaWebhook,
  handleCommunicationWebhook,
} from '@/lib/zapier-integrations/control-plane-api'

export const dynamic = 'force-dynamic'

/**
 * Revenue webhook endpoint
 * POST /api/webhooks/zapier/revenue
 */
export async function POST(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname
    const payload = await request.json()

    // Route to appropriate handler
    if (pathname.includes('/revenue')) {
      const result = await handleRevenueWebhook(payload)
      return NextResponse.json(
        result,
        { status: result.success ? 200 : 400 }
      )
    }

    if (pathname.includes('/quota')) {
      const result = await handleQuotaWebhook(payload)
      return NextResponse.json(
        result,
        { status: result.success ? 200 : 400 }
      )
    }

    if (pathname.includes('/communication')) {
      const result = await handleCommunicationWebhook(payload)
      return NextResponse.json(
        result,
        { status: result.success ? 200 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Unknown webhook type' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Zapier Webhook Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint
 * GET /api/webhooks/zapier/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Zapier Revenue Automation Webhooks',
    timestamp: new Date().toISOString(),
  })
}
