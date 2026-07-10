/*
 * Commercial Feature Protection Middleware
 * Validates subscription before allowing access to Pro/Enterprise features
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  getSubscriptionStatus,
  canUseFeature,
  hasDecisionsAvailable,
  recordDecisionUsage,
  formatSubscriptionStatus,
  type SubscriptionTier,
} from './subscription-validator';

export interface CommercialFeatureOptions {
  feature: 'vault' | 'resolver' | 'planner' | 'executor' | 'events' | 'compliance' | 'webhook_api';
  chargeDecision?: boolean; // Record this as a decision usage (default: true)
}

/**
 * Protect a commercial feature endpoint
 * Returns error response if subscription not valid, otherwise continues
 */
export async function protectCommercialFeature(
  request: NextRequest,
  options: CommercialFeatureOptions
): Promise<NextResponse | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Unauthorized: Authentication required',
          error_code: 'auth_required',
        },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('org_members.user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Organization not found',
          error_code: 'org_not_found',
        },
        { status: 403 }
      );
    }

    const orgId = userOrg.id;

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(orgId);

    // Check if tier can use this feature
    if (!canUseFeature(subscriptionStatus.tier, options.feature)) {
      const tierName = subscriptionStatus.tier === 'none' ? 'none' : subscriptionStatus.tier;
      return NextResponse.json(
        {
          ok: false,
          error: `Commercial Feature Requires Subscription: ${options.feature} requires Pro or Enterprise tier. Current: ${tierName}`,
          error_code: 'subscription_required',
          current_tier: subscriptionStatus.tier,
          required_tier: 'pro',
          subscription_url: 'https://dsg.app/pricing',
          subscription_status: formatSubscriptionStatus(subscriptionStatus),
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Check decision quota (for Pro tier)
    if (subscriptionStatus.tier === 'pro' && options.chargeDecision !== false) {
      if (!hasDecisionsAvailable(subscriptionStatus)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Decision Limit Exceeded for this month',
            error_code: 'quota_exceeded',
            subscription_status: formatSubscriptionStatus(subscriptionStatus),
            upgrade_url: 'https://dsg.app/pricing',
          },
          { status: 429 } // 429 Too Many Requests
        );
      }

      // Record decision usage
      await recordDecisionUsage(orgId, 1);
    }

    // All checks passed - return null to continue
    return null;
  } catch (error) {
    console.error('[protect-commercial] Error validating commercial feature:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'License validation error',
        error_code: 'validation_error',
      },
      { status: 500 }
    );
  }
}
