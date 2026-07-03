/**
 * GitHub Marketplace → internal subscription sync.
 *
 * Resolves the buyer's GitHub account to an org via marketplace_account_links,
 * then mirrors the Stripe billing flow:
 *   - upsert billing_subscriptions (synthetic subscription id `ghmp_<account_id>`,
 *     same onConflict key the Stripe webhook uses) so quota-policy picks up plan_key
 *   - fulfillSubscription / revokeSubscription to keep organizations.plan in sync
 *
 * Invariants (mirrors lib/billing/fulfillment.ts):
 *   - Idempotent: same event applied N times = same DB state as once
 *   - Never throws: returns a result object; webhook always acks GitHub with 200
 *   - Unknown plan names fall back to 'trial' (safe floor, never over-entitles)
 */

import { getSupabaseAdmin } from '../supabase-server';
import { fulfillSubscription, revokeSubscription } from '../billing/fulfillment';

export type MarketplaceAction =
  | 'purchased'
  | 'pending_change'
  | 'pending_change_cancelled'
  | 'changed'
  | 'cancelled';

export type MarketplaceSyncInput = {
  action: MarketplaceAction | string;
  githubAccountId: number;
  githubLogin: string;
  planName: string;
  billingCycle: string;
};

export type MarketplaceSyncResult = {
  linked: boolean;
  applied: boolean;
  orgId?: string;
  planKey?: string;
  reason?: string;
};

/** Prefix for synthetic billing_subscriptions ids from GitHub Marketplace. */
export const GHMP_SUBSCRIPTION_PREFIX = 'ghmp_';

/**
 * Pure mapping: GitHub Marketplace plan name → internal plan key.
 * Keyword match on the listing plan name; unknown names fall back to
 * 'trial' (safe floor — never grants more quota than intended).
 */
export function mapMarketplacePlanName(planName: string | null | undefined): string {
  const name = String(planName || '').toLowerCase();
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('business')) return 'business';
  if (name.includes('pro')) return 'pro';
  return 'trial';
}

/** Pure mapping: GitHub billing cycle → period end from a given start. */
export function periodEndFrom(startMs: number, billingCycle: string | null | undefined): Date {
  const yearly = String(billingCycle || '').toLowerCase() === 'yearly';
  const days = yearly ? 365 : 30;
  return new Date(startMs + days * 24 * 60 * 60 * 1000);
}

/**
 * Apply a marketplace purchase event to the org's subscription state.
 * pending_change / pending_change_cancelled are informational only —
 * GitHub sends a follow-up `changed` event when the change takes effect.
 */
export async function syncMarketplaceSubscription(
  input: MarketplaceSyncInput
): Promise<MarketplaceSyncResult> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const { data: link, error: linkError } = await supabase
      .from('marketplace_account_links')
      .select('org_id')
      .eq('github_account_id', input.githubAccountId)
      .maybeSingle();

    if (linkError) {
      return { linked: false, applied: false, reason: `link lookup failed: ${linkError.message}` };
    }
    if (!link?.org_id) {
      return {
        linked: false,
        applied: false,
        reason: `no org linked for github account ${input.githubLogin} (${input.githubAccountId})`,
      };
    }

    const orgId: string = link.org_id;
    const planKey = mapMarketplacePlanName(input.planName);
    const syntheticId = `${GHMP_SUBSCRIPTION_PREFIX}${input.githubAccountId}`;
    const nowIso = new Date().toISOString();

    switch (input.action) {
      case 'purchased':
      case 'changed': {
        const start = Date.now();
        const { error: upsertError } = await supabase
          .from('billing_subscriptions')
          .upsert(
            {
              stripe_subscription_id: syntheticId,
              org_id: orgId,
              status: 'active',
              plan_key: planKey,
              billing_interval:
                String(input.billingCycle || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly',
              current_period_start: new Date(start).toISOString(),
              current_period_end: periodEndFrom(start, input.billingCycle).toISOString(),
              updated_at: nowIso,
            },
            { onConflict: 'stripe_subscription_id' }
          );

        if (upsertError) {
          return { linked: true, applied: false, orgId, planKey, reason: upsertError.message };
        }

        const fulfil = await fulfillSubscription(orgId, planKey, 'active');
        if (!fulfil.ok) {
          return { linked: true, applied: false, orgId, planKey, reason: fulfil.error };
        }
        return { linked: true, applied: true, orgId, planKey };
      }

      case 'cancelled': {
        const { error: cancelError } = await supabase
          .from('billing_subscriptions')
          .update({ status: 'canceled', updated_at: nowIso })
          .eq('stripe_subscription_id', syntheticId);

        if (cancelError) {
          return { linked: true, applied: false, orgId, planKey, reason: cancelError.message };
        }

        const revoke = await revokeSubscription(orgId);
        if (!revoke.ok) {
          return { linked: true, applied: false, orgId, planKey, reason: revoke.error };
        }
        return { linked: true, applied: true, orgId, planKey: 'free' };
      }

      case 'pending_change':
      case 'pending_change_cancelled':
        return {
          linked: true,
          applied: false,
          orgId,
          planKey,
          reason: 'pending change — GitHub sends a `changed` event when it takes effect',
        };

      default:
        return { linked: true, applied: false, orgId, reason: `unknown action: ${input.action}` };
    }
  } catch (err) {
    return {
      linked: false,
      applied: false,
      reason: err instanceof Error ? err.message : 'unexpected sync error',
    };
  }
}
