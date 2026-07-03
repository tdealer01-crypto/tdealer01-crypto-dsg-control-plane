import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { syncMarketplaceSubscription } from '@/lib/marketplace/subscription-sync';

export const dynamic = 'force-dynamic';

/**
 * GitHub Marketplace Webhook Handler
 *
 * Processes marketplace purchase events:
 * - marketplace_purchase: New purchase, upgrade, downgrade
 * - marketplace_purchase.cancelled: Cancellation
 */

type MarketplaceWebhookPayload = {
  action: 'purchased' | 'pending_change' | 'pending_change_cancelled' | 'changed' | 'cancelled';
  effective_date?: string;
  sender: {
    login: string;
    id: number;
  };
  marketplace_purchase: {
    account: {
      type: 'Organization' | 'User';
      id: number;
      login: string;
      node_id: string;
    };
    billing_cycle: 'monthly' | 'yearly';
    unit_count: number;
    plan: {
      id: number;
      name: string;
      description: string;
      monthly_price_in_cents: number;
      yearly_price_in_cents: number;
      price_model: string;
      has_free_trial: boolean;
      unit_name?: string;
      bullets?: string[];
    };
  };
};

/**
 * Verify GitHub webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('Missing GITHUB_MARKETPLACE_WEBHOOK_SECRET - rejecting webhook (fail closed)');
    return false;
  }

  const hash = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedSignature = Buffer.from(`sha256=${hash}`);
  const receivedSignature = Buffer.from(signature);

  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }
  return timingSafeEqual(expectedSignature, receivedSignature);
}

/**
 * Log marketplace event to database
 */
async function logMarketplaceEvent(
  action: string,
  account: MarketplaceWebhookPayload['marketplace_purchase']['account'],
  plan: MarketplaceWebhookPayload['marketplace_purchase']['plan'],
  payload: MarketplaceWebhookPayload
) {
  try {
    const supabase = getSupabaseAdmin() as any;

    const { error } = await supabase
      .from('marketplace_events')
      .insert({
        action,
        github_login: account.login,
        github_account_id: account.id,
        account_type: account.type,
        plan_name: plan.name,
        billing_cycle: payload.marketplace_purchase.billing_cycle,
        unit_count: payload.marketplace_purchase.unit_count,
        event_data: payload,
        processed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log marketplace event:', error);
    }
  } catch (err) {
    console.error('Error logging marketplace event:', err);
    // Don't throw - webhook should still return 200 OK
  }
}

/**
 * Handle marketplace purchase changes
 */
async function handlePurchaseChange(
  action: string,
  payload: MarketplaceWebhookPayload
) {
  const { marketplace_purchase } = payload;
  const { account, plan, billing_cycle, unit_count } = marketplace_purchase;

  // Log to database
  await logMarketplaceEvent(action, account, plan, payload);

  // Sync subscription state (billing_subscriptions + organizations.plan).
  // Unlinked accounts stay logged in marketplace_events and can be replayed
  // after the org admin links their GitHub account.
  const sync = await syncMarketplaceSubscription({
    action,
    githubAccountId: account.id,
    githubLogin: account.login,
    planName: plan.name,
    billingCycle: billing_cycle,
  });

  console.log('Marketplace event processed:', {
    action,
    account: account.login,
    plan: plan.name,
    billing_cycle,
    unit_count,
    sync,
  });
}

/**
 * POST /api/webhooks/marketplace
 * Handle GitHub Marketplace webhook events
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // GitHub sends a `ping` event when the webhook is created/tested.
    // Its payload has no action/marketplace_purchase, so answer before validation.
    const githubEvent = request.headers.get('x-github-event');
    if (githubEvent === 'ping') {
      return NextResponse.json({ success: true, event: 'ping' }, { status: 200 });
    }

    // Parse payload
    let payload: MarketplaceWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      console.error('Failed to parse webhook payload:', err);
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.action || !payload.marketplace_purchase) {
      console.warn('Invalid webhook payload structure');
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    const { action } = payload;

    // Handle different actions
    switch (action) {
      case 'purchased':
      case 'changed':
      case 'pending_change':
      case 'pending_change_cancelled':
      case 'cancelled':
        await handlePurchaseChange(action, payload);
        break;
      default:
        console.warn(`Unknown marketplace action: ${action}`);
    }

    // Always return 200 OK (GitHub requires this)
    return NextResponse.json(
      { success: true, action },
      { status: 200 }
    );
  } catch (error) {
    console.error('Marketplace webhook error:', error);
    // Return 200 OK even on error - GitHub needs acknowledgment
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 200 } // Note: 200 to acknowledge receipt
    );
  }
}
