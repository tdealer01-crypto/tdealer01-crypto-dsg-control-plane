/**
 * Zapier Revenue Automation Webhook Endpoints
 *
 * POST /api/webhooks/zapier/revenue        — payment events -> zapier_payment_events
 * POST /api/webhooks/zapier/quota          — quota/usage events -> zapier_quota_events
 * POST /api/webhooks/zapier/communication  — communication audit -> zapier_communication_events
 * GET  /api/webhooks/zapier/health         — integration health check
 *
 * Every POST request must carry an `x-zapier-signature` header: the hex
 * HMAC-SHA256 digest of the raw request body, keyed by ZAPIER_WEBHOOK_SECRET.
 * Requests that fail verification are rejected with 401 before any payload
 * parsing or database write happens.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  handleRevenueWebhook,
  handleQuotaWebhook,
  handleCommunicationWebhook,
  validateZapierSignature,
  checkZapierIntegrationHealth,
  type ZapierRevenuePayload,
  type ZapierQuotaPayload,
  type ZapierCommunicationPayload,
} from '@/lib/zapier-integrations/control-plane-api'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const segment = path?.[0] ?? ''

    const rawBody = await request.text()
    const signature = request.headers.get('x-zapier-signature')

    if (!validateZapierSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (segment === 'revenue') {
      const result = await handleRevenueWebhook(payload as ZapierRevenuePayload)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (segment === 'quota') {
      const result = await handleQuotaWebhook(payload as ZapierQuotaPayload)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (segment === 'communication') {
      const result = await handleCommunicationWebhook(payload as ZapierCommunicationPayload)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    return NextResponse.json({ error: 'Unknown webhook type' }, { status: 404 })
  } catch (error) {
    console.error('[Zapier Webhook Error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/zapier/health
 */
export async function GET() {
  const health = await checkZapierIntegrationHealth()
  return NextResponse.json({
    ...health,
    service: 'Zapier Revenue Automation Webhooks',
    timestamp: new Date().toISOString(),
  })
}
