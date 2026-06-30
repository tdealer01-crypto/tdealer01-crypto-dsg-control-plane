/**
 * DSG Gate API — Pricing & Entitlement Logic
 *
 * Controls access to POST /api/dsg/v1/gates/evaluate
 * and POST /api/dsg/v1/proofs/prove based on org tier.
 *
 * Revenue model:
 *   Free        — 50 gate evaluations / month  (lead magnet)
 *   Pro         — $99/month  — 5 000 evals / month + compliance bundle access
 *   Enterprise  — $499/month — unlimited evals + SLA + Hermes executor access
 *
 * Phase 1: in-memory quota bookkeeping.
 *   All authenticated orgs receive the free tier automatically.
 *   Phase 2 will persist usage to dsg_gate_usage and wire Stripe metered billing.
 *
 * API CONTRACT (gate evaluate / proof prove — quota exceeded):
 * {
 *   ok: false,
 *   error: "Quota exceeded — upgrade to DSG Gate Pro",
 *   requiresUpgrade: true,
 *   tier: "free",
 *   upgradeUrl: "/pricing#dsg-gate"
 * }
 * HTTP 402 Payment Required
 */

// ─── Tier definitions ────────────────────────────────────────────────────────

export interface DsgGateTier {
  tier: 'free' | 'pro' | 'enterprise';
  evalsPerMonth: number;
  priceUsdCents: number; // 0 = free
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
    priceUsdCents: 99_00, // $99/month
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
    priceUsdCents: 499_00, // $499/month
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

/**
 * Check whether an org is allowed to call the DSG gate / proof API.
 *
 * Phase 1: All authenticated orgs receive the free tier automatically.
 * Phase 2: Will query dsg_gate_entitlements + dsg_gate_usage from Supabase.
 */
export async function checkGateEntitlement(
  orgId: string | null,
): Promise<GateEntitlementCheck> {
  // Phase 1 — free tier for all authenticated callers
  return {
    allowed: true,
    tier: 'free',
    evalsRemaining: 50,
    message: orgId
      ? 'Free tier — 50 evaluations/month'
      : 'Free tier — authenticate to unlock higher limits',
    requiresPayment: false,
    upgradeUrl: '/pricing#dsg-gate',
  };
}

/**
 * Record a gate evaluation call for metered billing.
 *
 * Phase 1: console log only.
 * Phase 2: INSERT into dsg_gate_usage and fire Stripe meter event when overages apply.
 */
export async function recordGateEvaluation(
  evalId: string,
  orgId: string | null,
  route: 'gates/evaluate' | 'proofs/prove',
  gateStatus: string,
  durationMs: number,
): Promise<{ recorded: boolean; meterEventId?: string; error?: string }> {
  try {
    console.log(
      `[dsg-gate-usage] evalId=${evalId} org=${orgId ?? 'anonymous'} route=${route} status=${gateStatus} ms=${durationMs}`,
    );

    // TODO Phase 2: Insert into dsg_gate_usage table
    // TODO Phase 2: Check dsg_gate_entitlements and fire Stripe meter event on overage

    return { recorded: true };
  } catch (err) {
    console.error('[dsg-gate-record] Error recording evaluation:', err);
    return {
      recorded: false,
      error: `Failed to record evaluation: ${String(err).slice(0, 120)}`,
    };
  }
}

/**
 * Reset monthly evaluation counters (call via cron).
 * Phase 2 only — requires dsg_gate_usage table.
 */
export async function resetMonthlyGateCounters(): Promise<{
  reset: number;
  error?: string;
}> {
  return { reset: 0, error: 'Not yet implemented in Phase 1' };
}
