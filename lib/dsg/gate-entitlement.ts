/**
 * DSG Gate API — Pricing & Entitlement Logic
 *
 * Controls access to DSG deterministic gate/proof APIs based on org tier.
 * Current metered routes:
 * - POST /api/dsg/v1/gates/evaluate
 * - POST /api/dsg/v1/proofs/prove
 * - POST /api/dsg/v1/encoding/prove
 *
 * Revenue model:
 *   Free        — 50 evaluations / month
 *   Pro         — $99/month  — 5 000 evals / month + compliance bundle access
 *   Enterprise  — $499/month — high-limit evals + SLA + Hermes executor access
 */

import { reportMeterEvent } from '@/lib/billing/metered';
import { insertRevenueEvent } from '@/lib/revenue/events';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export type DsgMeteredGateRoute = 'gates/evaluate' | 'proofs/prove' | 'encoding/prove';

// ─── Tier definitions ────────────────────────────────────────────────────────

export interface DsgGateTier {
  tier: 'free' | 'pro' | 'enterprise';
  evalsPerMonth: number;
  priceUsdCents: number;
  billingPeriod: 'monthly' | 'none';
  description: string;
  features: string[];
}

export const DSG_GATE_TIERS: Record<string, DsgGateTier> = {
  free: {
    tier: 'free',
    evalsPerMonth: 50,
    priceUsdCents: 0,
    billingPeriod: 'none',
    description: 'Free — 50 gate evaluations/month',
    features: [
      '50 gate evaluations / month',
      'Deterministic PASS / REVIEW / BLOCK decision',
      'proofHash + constraintSetHash + inputHash',
      'Replay-protection (nonce + idempotency-key)',
      'Public policy manifest access',
      'JSON audit log per evaluation',
    ],
  },
  pro: {
    tier: 'pro',
    evalsPerMonth: 5_000,
    priceUsdCents: 99_00,
    billingPeriod: 'monthly',
    description: 'Pro — $99/month — 5 000 gate evaluations/month',
    features: [
      '5 000 gate evaluations / month',
      'All Free features',
      'proofHash chain (hash-linked audit trail)',
      'Compliance bundle export (JSON + hashes)',
      'SBOM + CodeQL evidence access via API',
      'Multi-policy versioning',
      'Priority rate-limit (600 req/min)',
      'Email alerts on BLOCK decisions',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    evalsPerMonth: 999_999,
    priceUsdCents: 499_00,
    billingPeriod: 'monthly',
    description: 'Enterprise — $499/month — Unlimited evaluations',
    features: [
      'Unlimited gate evaluations',
      'All Pro features',
      'Hermes Controlled Executor access',
      'Credential broker (Supabase-backed secret leases)',
      'SLA — 99.9% uptime guarantee',
      'Dedicated support + Slack connect',
      'Custom policy set deployment',
      'Org-level RBAC + audit export (CSV/JSON)',
      'White-label report branding',
    ],
  },
};

// ─── Entitlement check ────────────────────────────────────────────────────────

export interface GateEntitlementCheck {
  allowed: boolean;
  tier: string;
  evalsRemaining: number;
  message: string;
  requiresPayment: boolean;
  upgradeUrl: string;
}

type GateEntitlementRow = {
  org_id: string;
  tier: 'free' | 'pro' | 'enterprise' | string;
  evals_per_month: number | null;
  stripe_customer_id?: string | null;
};

function monthBoundsUtc(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function tierSpec(tier: string | null | undefined) {
  const key = String(tier || 'free').toLowerCase();
  return DSG_GATE_TIERS[key] || DSG_GATE_TIERS.free;
}

async function getOrCreateEntitlement(orgId: string): Promise<GateEntitlementRow> {
  const supabase = getSupabaseAdmin() as any;

  const existing = await supabase
    .from('dsg_gate_entitlements')
    .select('org_id,tier,evals_per_month,stripe_customer_id')
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
      evals_per_month: DSG_GATE_TIERS.free.evalsPerMonth,
    })
    .select('org_id,tier,evals_per_month,stripe_customer_id')
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

/** Check whether an org is allowed to call a metered DSG gate/proof API. */
export async function checkGateEntitlement(
  orgId: string | null,
): Promise<GateEntitlementCheck> {
  if (!orgId) {
    return {
      allowed: true,
      tier: 'free',
      evalsRemaining: 50,
      message: 'Free tier — authenticate to unlock higher limits',
      requiresPayment: false,
      upgradeUrl: '/pricing#dsg-gate',
    };
  }

  try {
    const entitlement = await getOrCreateEntitlement(orgId);
    const plan = tierSpec(entitlement.tier);
    const evalsPerMonth = Number(entitlement.evals_per_month || plan.evalsPerMonth);
    const used = await countEvalsThisPeriod(orgId);
    const remaining = Math.max(0, evalsPerMonth - used);
    const allowed = remaining > 0;

    return {
      allowed,
      tier: plan.tier,
      evalsRemaining: remaining,
      message: allowed
        ? `${plan.tier.toUpperCase()} tier — ${remaining} evaluations remaining this period`
        : 'Quota exceeded — upgrade to DSG Gate Pro',
      requiresPayment: !allowed,
      upgradeUrl: '/pricing#dsg-gate',
    };
  } catch (error) {
    console.error('[dsg-gate-entitlement] fallback to free tier:', error);
  }

  return {
    allowed: true,
    tier: 'free',
    evalsRemaining: 50,
    message: 'Free tier — 50 evaluations/month',
    requiresPayment: false,
    upgradeUrl: '/pricing#dsg-gate',
  };
}

/** Record one metered deterministic evaluation/proof call. */
export async function recordGateEvaluation(
  evalId: string,
  orgId: string | null,
  route: DsgMeteredGateRoute,
  gateStatus: string,
  durationMs: number,
): Promise<{ recorded: boolean; meterEventId?: string; error?: string }> {
  try {
    console.log(
      `[dsg-gate-usage] evalId=${evalId} org=${orgId ?? 'anonymous'} route=${route} status=${gateStatus} ms=${durationMs}`,
    );

    if (!orgId) {
      return { recorded: true };
    }

    const supabase = getSupabaseAdmin() as any;
    const usageInsert = await supabase
      .from('dsg_gate_usage')
      .insert({
        org_id: orgId,
        eval_id: evalId,
        route,
        gate_status: gateStatus,
        duration_ms: durationMs,
        billed: false,
      })
      .select('id')
      .maybeSingle();

    if (usageInsert.error || !usageInsert.data?.id) {
      throw new Error(usageInsert.error?.message || 'failed_to_insert_dsg_gate_usage');
    }

    await insertRevenueEvent({
      orgId,
      eventType: 'dsg_gate_evaluation',
      amount: 1,
      currency: 'USD',
      source: `dsg_gate:${route}`,
      metadata: {
        evalId,
        gateStatus,
        durationMs,
      },
    });

    const entitlement = await getOrCreateEntitlement(orgId);
    const limit = Number(entitlement.evals_per_month || tierSpec(entitlement.tier).evalsPerMonth);
    const used = await countEvalsThisPeriod(orgId);
    const overage = used > limit;

    if (overage && entitlement.stripe_customer_id) {
      const meter = await reportMeterEvent(entitlement.stripe_customer_id, orgId, 1, `dsg-gate-${evalId}`);
      if (meter.ok) {
        await supabase
          .from('dsg_gate_usage')
          .update({ billed: true, meter_event_id: meter.eventId })
          .eq('id', usageInsert.data.id);
        return { recorded: true, meterEventId: meter.eventId };
      }
    }

    return { recorded: true };
  } catch (err) {
    console.error('[dsg-gate-record] Error recording evaluation:', err);
    return {
      recorded: false,
      error: `Failed to record evaluation: ${String(err).slice(0, 120)}`,
    };
  }
}

export async function resetMonthlyGateCounters(): Promise<{
  reset: number;
  error?: string;
}> {
  return { reset: 0, error: 'Not yet implemented in Phase 1' };
}
