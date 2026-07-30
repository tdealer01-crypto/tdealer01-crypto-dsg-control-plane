/**
 * GET /api/billing/usage
 *
 * Returns current billing usage and plan limits for the authenticated user.
 *
 * Response:
 * {
 *   current_usage: number,          // Current month executions
 *   plan_limit: number,             // Monthly execution limit
 *   overage_cost: number,           // Estimated overage cost
 *   usage_percentage: number        // Usage as percentage of limit
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { getFeatureFlagServer } from '../../../../lib/vercel-flags';

export const dynamic = 'force-dynamic';

// Plan limits (executions per month)
const PLAN_LIMITS: Record<string, number> = {
  pro: 10_000,
  business: 100_000,
  enterprise: 1_000_000,
};

// Overage costs (per 1000 executions beyond limit)
const OVERAGE_RATES: Record<string, number> = {
  pro: 0.50,
  business: 0.30,
  enterprise: 0.10,
};

export async function GET(request: Request) {
  // Check feature flag
  const billingEnabled = getFeatureFlagServer('ENABLE_BILLING_UI');
  if (!billingEnabled) {
    return NextResponse.json(
      { ok: false, error: 'Billing UI is not enabled' },
      { status: 403 }
    );
  }

  // Require authenticated user
  let profile;
  try {
    const result = await requireActiveProfile();
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    profile = result;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  // Get current month period
  const now = new Date();
  const billingPeriod = now.toISOString().slice(0, 7); // YYYY-MM format

  try {
    // Query usage counters for current month
    const { data: usageData, error: usageError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', profile.orgId)
      .eq('billing_period', billingPeriod)
      .maybeSingle();

    if (usageError) {
      console.error('Usage query error:', usageError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load usage data' },
        { status: 500 }
      );
    }

    // Get user's plan (for now, default to pro)
    // TODO: Fetch actual plan from subscriptions/billing_customers table
    const userPlan = 'pro';
    const planLimit = PLAN_LIMITS[userPlan] || 10_000;
    const overageRate = OVERAGE_RATES[userPlan] || 0.50;

    const currentUsage = usageData?.executions || 0;
    const overageAmount = Math.max(0, currentUsage - planLimit);
    const overageCost = (overageAmount / 1000) * overageRate;
    const usagePercentage = (currentUsage / planLimit) * 100;

    return NextResponse.json({
      ok: true,
      current_usage: currentUsage,
      plan_limit: planLimit,
      overage_cost: Math.round(overageCost * 100) / 100,
      usage_percentage: usagePercentage,
      billing_period: billingPeriod,
      plan: userPlan,
    });
  } catch (e) {
    console.error('Error fetching usage:', e);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
