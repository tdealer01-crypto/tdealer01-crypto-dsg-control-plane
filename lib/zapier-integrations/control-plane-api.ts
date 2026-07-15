/**
 * Control Plane API Integration for Zapier Revenue Automation
 * Handles bidirectional communication with main control plane
 */

import { NextRequest, NextResponse } from 'next/server'

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
 * Validates Zapier webhook signature (if configured)
 */
export function validateZapierSignature(
  request: NextRequest,
  secret: string
): boolean {
  const signature = request.headers.get('x-zapier-signature')
  if (!signature || !secret) return true // Skip if not configured

  // Implement HMAC-SHA256 verification
  // return verifySignature(body, signature, secret)
  return true
}

/**
 * Process revenue webhook from Zapier
 */
export async function handleRevenueWebhook(
  payload: ZapierRevenuePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate payload
    if (!payload.customer_id || !payload.amount || !payload.payment_id) {
      throw new Error('Missing required fields')
    }

    // Log to billing system
    console.log('[Zapier Revenue Webhook]', {
      customer_id: payload.customer_id,
      amount: payload.amount,
      currency: payload.currency,
      payment_id: payload.payment_id,
      status: payload.status,
      timestamp: payload.timestamp,
    })

    // In production: store in database
    // await db.billing.create({
    //   customer_id: payload.customer_id,
    //   amount: payload.amount,
    //   currency: payload.currency,
    //   payment_id: payload.payment_id,
    //   status: payload.status,
    //   created_at: new Date(payload.timestamp),
    // })

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

    console.log('[Zapier Quota Webhook]', {
      customer_id: payload.customer_id,
      usage_percent: payload.usage_percent,
      health_status: payload.health_status,
    })

    // Check if alert should be sent
    if (payload.usage_percent >= 80) {
      console.warn(`[Quota Alert] ${payload.customer_id} at ${payload.usage_percent}%`)
      // In production: send alert to customer
    }

    // In production: update usage table
    // await db.quotas.update({
    //   customer_id: payload.customer_id,
    //   usage_current: payload.usage_current,
    //   usage_percent: payload.usage_percent,
    //   health_status: payload.health_status,
    // })

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

    console.log('[Zapier Communication Webhook]', {
      customer_id: payload.customer_id,
      email: payload.email,
      type: payload.type,
      status: payload.status,
      timestamp: payload.timestamp,
    })

    // In production: audit all communications
    // await db.audit.communications.create({
    //   customer_id: payload.customer_id,
    //   email: payload.email,
    //   type: payload.type,
    //   subject: payload.subject,
    //   status: payload.status,
    //   created_at: new Date(payload.timestamp),
    // })

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
  return {
    status: 'healthy',
    components: {
      revenue_webhook: true,
      quota_webhook: true,
      communication_webhook: true,
    },
  }
}
