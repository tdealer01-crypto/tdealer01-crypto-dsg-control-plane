/*
 * DSG Subscription Validator
 * Validates Stripe subscription status and tier for Commercial Features
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise' | 'none';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  active: boolean;
  orgId: string;
  customerId?: string;
  decisions_limit: number;
  decisions_used: number;
  days_remaining: number;
  expires_at?: string;
}

/**
 * Subscription tier limits (decisions per month)
 */
const TIER_LIMITS = {
  starter: 1000,
  pro: 50000,
  enterprise: -1, // unlimited
  none: 0,
};

/**
 * Check if organization has active subscription
 * Note: Requires dsg_usage_metrics table. Returns 'none' tier if tables not ready.
 */
export async function getSubscriptionStatus(orgId: string): Promise<SubscriptionStatus> {
  try {
    const supabase = getSupabaseAdmin();

    // Query organization's plan status (subscription_tier column not yet in schema)
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, plan, is_active')
      .eq('id', orgId)
      .single();

    if (error || !org) {
      return {
        tier: 'none',
        active: false,
        orgId,
        decisions_limit: 0,
        decisions_used: 0,
        days_remaining: 0,
      };
    }

    // Map plan column to subscription tier (plan column contains values like 'starter', 'pro', 'enterprise')
    const tier = (org.plan as SubscriptionTier) || 'none';
    const isActive = org.is_active || false;

    const decisionsLimit = TIER_LIMITS[tier] || 0;

    return {
      tier: isActive ? tier : 'none',
      active: isActive,
      orgId,
      decisions_limit: decisionsLimit,
      decisions_used: 0,
      days_remaining: 0,
    };
  } catch (error) {
    console.error('[subscription-validator] Error checking subscription:', error);
    return {
      tier: 'none',
      active: false,
      orgId,
      decisions_limit: 0,
      decisions_used: 0,
      days_remaining: 0,
    };
  }
}

/**
 * Check if tier has access to commercial feature
 */
export function canAccessCommercialFeature(tier: SubscriptionTier): boolean {
  return tier !== 'none';
}

/**
 * Check if tier can use specific feature
 */
export function canUseFeature(
  tier: SubscriptionTier,
  feature: 'vault' | 'resolver' | 'planner' | 'executor' | 'events' | 'compliance' | 'webhook_api'
): boolean {
  const featureTiers = {
    vault: ['pro', 'enterprise'],
    resolver: ['pro', 'enterprise'],
    planner: ['pro', 'enterprise'],
    executor: ['pro', 'enterprise'],
    events: ['pro', 'enterprise'],
    compliance: ['pro', 'enterprise'],
    webhook_api: ['pro', 'enterprise'],
  };

  return featureTiers[feature].includes(tier);
}

/**
 * Check if organization has decisions available
 */
export function hasDecisionsAvailable(status: SubscriptionStatus): boolean {
  if (status.tier === 'none') return false;
  if (status.tier === 'enterprise') return true; // unlimited
  return status.decisions_used < status.decisions_limit;
}

/**
 * Get remaining decisions for the month
 */
export function getRemainingDecisions(status: SubscriptionStatus): number {
  if (status.tier === 'none') return 0;
  if (status.tier === 'enterprise') return Number.MAX_SAFE_INTEGER;
  return Math.max(0, status.decisions_limit - status.decisions_used);
}

/**
 * Record decision usage
 * Note: Requires dsg_usage_metrics table. Silently fails if table not ready.
 */
export async function recordDecisionUsage(orgId: string, count: number = 1): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Upsert usage record (gracefully handle missing table)
    try {
      await (supabase.from('dsg_usage_metrics' as any) as any).upsert(
        {
          org_id: orgId,
          metric_month: monthStart.toISOString().split('T')[0],
          decision_count: count,
          updated_at: now.toISOString(),
        },
        { onConflict: 'org_id,metric_month' }
      );
    } catch (tableError) {
      // dsg_usage_metrics table may not exist yet - log but don't throw
      console.warn('[subscription-validator] dsg_usage_metrics table not ready yet, skipping usage record');
    }
  } catch (error) {
    console.error('[subscription-validator] Error recording decision usage:', error);
  }
}

/**
 * Format subscription status for API response
 */
export function formatSubscriptionStatus(status: SubscriptionStatus) {
  return {
    tier: status.tier,
    active: status.active,
    decisions: {
      limit: status.decisions_limit,
      used: status.decisions_used,
      remaining: getRemainingDecisions(status),
    },
    expires_at: status.expires_at,
    days_remaining: status.days_remaining,
  };
}
