/**
 * DSG Gate API — persisted entitlement and usage-based revenue control.
 *
 * Revenue model:
 *   Free        — 50 gate evaluations / month
 *   Pro         — $99/month, 5 000 included, metered overage when configured
 *   Enterprise  — $499/month, active subscription treated as unlimited
 */

import {
  isMeteredBillingConfigured,
  reportMeterEvent,
} from '@/lib/billing/metered';
import { insertRevenueEvent } from '@/lib/revenue/events';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  decideGateRevenueAccess,
  GATE_INCLUDED_EVALS,
  type GateAccessMode,
  type GateTier,
} from './gate-revenue-policy';

export interface DsgGateTier {
  tier: GateTier;
  evalsPerMonth: number;
  priceUsdCents: number;
  billingPeriod: 'monthly' | 'none';
  description: string;
  features: string[];
}

export const DSG_GATE_TIERS: Record<GateTier, DsgGateTier> = {
  free: {
    tier: 'free',
    evalsPerMonth: GATE_INCLUDED_EVALS.free,
    priceUsdCents: 0,
    billingPeriod: 'none',
    description: 'Free — 50 gate evaluations/month',
    features: [
      '50 gate evaluations / month',
      'Deterministic PASS / REVIEW / BLOCK decision',
      'proofHash + constraintSetHash + inputHash',
      'Replay protection',
      'JSON audit log per evaluation',
    ],
  },
  pro: {
    tier: 'pro',
    evalsPerMonth: GATE_INCLUDED_EVALS.pro,
    priceUsdCents: 99_00,
    billingPeriod: 'monthly',
    description: 'Pro — $99/month — 5 000 included evaluations',
    features: [
      '5 000 included evaluations / month',
      'Metered overage when billing meter is configured',
      'Compliance bundle export',
      'Hash-linked audit trail',
      'Multi-policy versioning',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    evalsPerMonth: GATE_INCLUDED_EVALS.enterprise,
    priceUsdCents: 499_00,
    billingPeriod: 'monthly',
    description: 'Enterprise — $499/month — unlimited evaluations',
    features: [
      'Unlimited gate evaluations while subscription is active',
      'Hermes Controlled Executor access',
      'Credential broker',
      'Audit export and white-label reports',
      'Enterprise support',
    ],
  },
};

export interface GateEntitlementCheck {
  allowed: boolean;
  tier: string;
  evalsRemaining: number;
  message: string;
  requiresPayment: boolean;
  upgradeUrl: string;
  accessMode: GateAccessMode;
}

type GateEntitlementRow = {
  org_id: string;
  tier: GateTier | string;
  evals_per_month: number | null;
  subscription_status: string | null;
  overage_enabled: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function monthBoundsUtc(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function tierSpec(tier: string | null | undefined): DsgGateTier {
  const key = String(tier || 'free').toLowerCase() as GateTier;
  return DSG_GATE_TIERS[key] || DSG_GATE_TIERS.free;
}

async function getOrCreateEntitlement(orgId: string): Promise<GateEntitlementRow> {
  const supabase = getSupabaseAdmin() as any;

  const existing = await supabase
    .from('dsg_gate_entitlements')
    .select(
      'org_id,tier,evals_per_month,subscription_status,overage_enabled,stripe_customer_id,stripe_subscription_id',
    )
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as GateEntitlementRow;
  }

  const created = await supabase
    .from('dsg_gate_entitlements')
    .insert({
      org_id: orgId,
      tier: 'free',
      evals_per_month: GATE_INCLUDED_EVALS.free,
      subscription_status: 'free',
      overage_enabled: false,
    })
    .select(
      'org_id,tier,evals_per_month,subscription_status,overage_enabled,stripe_customer_id,stripe_subscription_id',
    )
    .maybeSingle();

  if (created.error || !created.data) {
    throw new Error(created.error?.message || 'failed_to_create_dsg_gate_entitlement');
  }

  return created.data as GateEntitlementRow;
}

async function countEvalsThisPeriod(orgId: string): Promise<number> {
  const supabase = getSupabaseAdmin() as any;
  const rpcResult = await supabase.rpc('dsg_gate_evals_this_period', { p_org_id: orgId });

  if (!rpcResult.error && typeof rpcResult.data === 'number') {
    return rpcResult.data;
  }

  const { startIso, endIso } = monthBoundsUtc();
  const countResult = await supabase
    .from('dsg_gate_usage')
    .select('id', { head: true, count: 'exact' })
    .eq('org_id', orgId)
    .gte('created_at', startIso)
    .lt('created_at', endIso);

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  return countResult.count || 0;
}

function messageForAccessMode(
  mode: GateAccessMode,
  tier: string,
  remaining: number,
): string {
  switch (mode) {
    case 'included_quota':
      return `${tier.toUpperCase()} tier — ${remaining} included evaluations remaining`;
    case 'metered_overage':
      return 'PRO tier — included quota used; metered overage billing is active';
    case 'subscription_inactive':
      return 'Paid subscription is not active';
    case 'billing_unavailable':
      return 'Included quota used; metered billing is not fully configured';
    case 'quota_exceeded':
    default:
      return 'Quota exceeded — upgrade to DSG Gate Pro';
  }
}

export async function checkGateEntitlement(
  orgId: string | null,
): Promise<GateEntitlementCheck> {
  if (!orgId) {
    return {
      allowed: true,
      tier: 'free',
      evalsRemaining: GATE_INCLUDED_EVALS.free,
      message: 'Free tier — authenticate to persist usage and unlock paid plans',
      requiresPayment: false,
      upgradeUrl: '/pricing#dsg-gate',
      accessMode: 'included_quota',
    };
  }

  try {
    const entitlement = await getOrCreateEntitlement(orgId);
    const plan = tierSpec(entitlement.tier);
    const evalsPerMonth = Number(entitlement.evals_per_month || plan.evalsPerMonth);
    const used = await countEvalsThisPeriod(orgId);
    const decision = decideGateRevenueAccess({
      tier: plan.tier,
      subscriptionStatus: entitlement.subscription_status,
      includedLimit: evalsPerMonth,
      used,
      overageEnabled: entitlement.overage_enabled === true,
      hasStripeCustomer: Boolean(entitlement.stripe_customer_id),
      hasStripeSubscription: Boolean(entitlement.stripe_subscription_id),
      meteringConfigured: isMeteredBillingConfigured(),
    });

    return {
      allowed: decision.allowed,
      tier: plan.tier,
      evalsRemaining: decision.remaining,
      message: messageForAccessMode(decision.accessMode, plan.tier, decision.remaining),
      requiresPayment: decision.requiresPayment,
      upgradeUrl: '/pricing#dsg-gate',
      accessMode: decision.accessMode,
    };
  } catch (error) {
    console.error('[dsg-gate-entitlement] entitlement check failed:', error);
    return {
      allowed: false,
      tier: 'unknown',
      evalsRemaining: 0,
      message: 'Billing entitlement is temporarily unavailable; execution blocked to prevent unmetered usage',
      requiresPayment: false,
      upgradeUrl: '/pricing#dsg-gate',
      accessMode: 'billing_unavailable',
    };
  }
}

async function insertUsageOnce(
  supabase: any,
  payload: Record<string, unknown>,
): Promise<{ id: string; created: boolean; billed: boolean; meterEventId?: string }> {
  const inserted = await supabase
    .from('dsg_gate_usage')
    .upsert(payload, {
      onConflict: 'org_id,eval_id',
      ignoreDuplicates: true,
    })
    .select('id,billed,meter_event_id')
    .maybeSingle();

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  if (inserted.data?.id) {
    return {
      id: String(inserted.data.id),
      created: true,
      billed: inserted.data.billed === true,
      meterEventId: inserted.data.meter_event_id || undefined,
    };
  }

  const existing = await supabase
    .from('dsg_gate_usage')
    .select('id,billed,meter_event_id')
    .eq('org_id', payload.org_id)
    .eq('eval_id', payload.eval_id)
    .maybeSingle();

  if (existing.error || !existing.data?.id) {
    throw new Error(existing.error?.message || 'failed_to_resolve_dsg_gate_usage');
  }

  return {
    id: String(existing.data.id),
    created: false,
    billed: existing.data.billed === true,
    meterEventId: existing.data.meter_event_id || undefined,
  };
}

export async function recordGateEvaluation(
  evalId: string,
  orgId: string | null,
  route: 'gates/evaluate' | 'proofs/prove',
  gateStatus: string,
  durationMs: number,
): Promise<{ recorded: boolean; meterEventId?: string; error?: string }> {
  try {
    if (!orgId) {
      return { recorded: true };
    }

    const supabase = getSupabaseAdmin() as any;
    const usage = await insertUsageOnce(supabase, {
      org_id: orgId,
      eval_id: evalId,
      route,
      gate_status: gateStatus,
      duration_ms: durationMs,
      billed: false,
    });

    if (!usage.created) {
      return { recorded: true, meterEventId: usage.meterEventId };
    }

    await insertRevenueEvent({
      orgId,
      eventType: 'dsg_gate_evaluation',
      amount: 1,
      currency: 'USD',
      source: `dsg_gate:${route}`,
      metadata: { evalId, gateStatus, durationMs },
    });

    const entitlement = await getOrCreateEntitlement(orgId);
    const plan = tierSpec(entitlement.tier);
    const limit = Number(entitlement.evals_per_month || plan.evalsPerMonth);
    const used = await countEvalsThisPeriod(orgId);
    const decision = decideGateRevenueAccess({
      tier: plan.tier,
      subscriptionStatus: entitlement.subscription_status,
      includedLimit: limit,
      used,
      overageEnabled: entitlement.overage_enabled === true,
      hasStripeCustomer: Boolean(entitlement.stripe_customer_id),
      hasStripeSubscription: Boolean(entitlement.stripe_subscription_id),
      meteringConfigured: isMeteredBillingConfigured(),
    });

    if (decision.accessMode === 'metered_overage' && entitlement.stripe_customer_id) {
      const meter = await reportMeterEvent(
        entitlement.stripe_customer_id,
        orgId,
        1,
        `dsg-gate-${evalId}`,
      );

      if (meter.ok) {
        await supabase
          .from('dsg_gate_usage')
          .update({ billed: true, meter_event_id: meter.eventId })
          .eq('id', usage.id);
        return { recorded: true, meterEventId: meter.eventId };
      }

      return { recorded: true, error: meter.error };
    }

    return { recorded: true };
  } catch (error) {
    console.error('[dsg-gate-record] usage recording failed:', error);
    return {
      recorded: false,
      error: `Failed to record evaluation: ${String(error).slice(0, 160)}`,
    };
  }
}

export async function resetMonthlyGateCounters(): Promise<{
  reset: number;
  error?: string;
}> {
  return {
    reset: 0,
    error: 'No reset required: usage is counted by Stripe subscription period',
  };
}
