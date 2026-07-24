/**
 * Control Plane API Integration for Zapier Revenue Automation
 * Verifies inbound Zapier webhook signatures and persists revenue/quota/
 * communication events emitted by the Zapier Zaps into Supabase.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdmin } from '../supabase-server'
import type { Json } from '../database.types'

export interface ZapierRevenuePayload {
  customer_id: string
  amount: number
  currency: string
  payment_id: string
  invoice_number?: string
  status: 'completed' | 'failed' | 'pending' | 'refunded'
  timestamp: string
}

export interface ZapierQuotaPayload {
  customer_id: string
  service_type: string
  quota_allocated: number
  usage_current: number
  usage_percent: number
  health_status: 'healthy' | 'warning' | 'critical'
}

export interface ZapierCommunicationPayload {
  customer_id: string
  email: string
  type: 'invoice' | 'reminder' | 'alert' | 'update'
  subject: string
  status: 'sent' | 'failed' | 'pending'
  timestamp: string
}

/**
 * Verifies the `x-zapier-signature` header against an HMAC-SHA256 digest of
 * the raw request body, keyed by ZAPIER_WEBHOOK_SECRET.
 *
 * Fails closed: missing secret, missing header, or a mismatch all return
 * false. The caller must reject the request (401) rather than skip
 * verification, matching the fail-closed convention used for cron secrets
 * and the marketplace webhook elsewhere in this codebase.
 */
export function validateZapierSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.ZAPIER_WEBHOOK_SECRET

  if (!secret) {
    console.warn('[Zapier Webhook] Missing ZAPIER_WEBHOOK_SECRET — rejecting webhook (fail closed)')
    return false
  }

  if (!signatureHeader) {
    return false
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signatureHeader)

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

/**
 * Best-effort org resolution from a Stripe customer id via billing_customers.
 * Returns null when the customer can't be matched yet — rows are still
 * persisted with org_id = null so they can be reconciled later.
 */
async function resolveOrgIdByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('billing_customers')
    .select('org_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  return data?.org_id ? String(data.org_id) : null
}

/**
 * Process revenue webhook from Zapier
 */
export async function handleRevenueWebhook(
  payload: ZapierRevenuePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.customer_id || !payload.amount || !payload.payment_id) {
      throw new Error('Missing required fields')
    }

    const orgId = await resolveOrgIdByCustomerId(payload.customer_id)
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('zapier_payment_events').upsert(
      {
        org_id: orgId,
        customer_id: payload.customer_id,
        payment_id: payload.payment_id,
        invoice_number: payload.invoice_number ?? null,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        occurred_at: payload.timestamp,
        raw_payload: payload as unknown as Json,
      },
      { onConflict: 'payment_id' }
    )

    if (error) {
      throw new Error(`failed_to_persist_payment_event: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('[Zapier Revenue Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process quota update webhook from Zapier
 */
export async function handleQuotaWebhook(
  payload: ZapierQuotaPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.customer_id || payload.usage_percent === undefined) {
      throw new Error('Missing required fields')
    }

    const orgId = await resolveOrgIdByCustomerId(payload.customer_id)
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('zapier_quota_events').insert({
      org_id: orgId,
      customer_id: payload.customer_id,
      service_type: payload.service_type,
      quota_allocated: payload.quota_allocated,
      usage_current: payload.usage_current,
      usage_percent: payload.usage_percent,
      health_status: payload.health_status,
      raw_payload: payload as unknown as Json,
    })

    if (error) {
      throw new Error(`failed_to_persist_quota_event: ${error.message}`)
    }

    if (payload.usage_percent >= 80) {
      console.warn(`[Quota Alert] ${payload.customer_id} at ${payload.usage_percent}%`)
    }

    return { success: true }
  } catch (error) {
    console.error('[Zapier Quota Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process communication audit webhook from Zapier
 */
export async function handleCommunicationWebhook(
  payload: ZapierCommunicationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.customer_id || !payload.email || !payload.type) {
      throw new Error('Missing required fields')
    }

    const orgId = await resolveOrgIdByCustomerId(payload.customer_id)
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('zapier_communication_events').insert({
      org_id: orgId,
      customer_id: payload.customer_id,
      email: payload.email,
      type: payload.type,
      subject: payload.subject ?? null,
      status: payload.status,
      occurred_at: payload.timestamp,
      raw_payload: payload as unknown as Json,
    })

    if (error) {
      throw new Error(`failed_to_persist_communication_event: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('[Zapier Communication Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Health check endpoint for Zapier integration
 */
export async function checkZapierIntegrationHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'offline'
  components: {
    revenue_webhook: boolean
    quota_webhook: boolean
    communication_webhook: boolean
  }
}> {
  const secretConfigured = Boolean(process.env.ZAPIER_WEBHOOK_SECRET)

  return {
    status: secretConfigured ? 'healthy' : 'degraded',
    components: {
      revenue_webhook: secretConfigured,
      quota_webhook: secretConfigured,
      communication_webhook: secretConfigured,
    },
  }
}
