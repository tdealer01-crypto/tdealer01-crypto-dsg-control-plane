export type DsgEntitlementDecision = {
  ok: boolean;
  planId: string | null;
  feature: string;
  quotaRemaining: number | null;
  reason: 'ALLOW' | 'NO_PLAN' | 'FEATURE_DENIED' | 'QUOTA_EXCEEDED' | 'BILLING_REQUIRED' | 'POLICY_MISSING';
  upgradePath: string | null;
};

export type DsgEntitlementInput = {
  planId?: string | null;
  feature: string;
  allowedFeatures?: string[];
  quotaRemaining?: number | null;
  billingRequired?: boolean;
  upgradePath?: string | null;
};

export function decideDsgEntitlement(input: DsgEntitlementInput): DsgEntitlementDecision {
  if (input.billingRequired && !input.planId) return { ok: false, planId: null, feature: input.feature, quotaRemaining: input.quotaRemaining ?? null, reason: 'BILLING_REQUIRED', upgradePath: input.upgradePath ?? '/enterprise/entitlement' };
  if (!input.planId) return { ok: false, planId: null, feature: input.feature, quotaRemaining: input.quotaRemaining ?? null, reason: 'NO_PLAN', upgradePath: input.upgradePath ?? '/enterprise/entitlement' };
  if (!input.allowedFeatures) return { ok: false, planId: input.planId, feature: input.feature, quotaRemaining: input.quotaRemaining ?? null, reason: 'POLICY_MISSING', upgradePath: input.upgradePath ?? '/enterprise/entitlement' };
  if (!input.allowedFeatures.includes(input.feature)) return { ok: false, planId: input.planId, feature: input.feature, quotaRemaining: input.quotaRemaining ?? null, reason: 'FEATURE_DENIED', upgradePath: input.upgradePath ?? '/enterprise/entitlement' };
  if (typeof input.quotaRemaining === 'number' && input.quotaRemaining <= 0) return { ok: false, planId: input.planId, feature: input.feature, quotaRemaining: input.quotaRemaining, reason: 'QUOTA_EXCEEDED', upgradePath: input.upgradePath ?? '/enterprise/entitlement' };
  return { ok: true, planId: input.planId, feature: input.feature, quotaRemaining: input.quotaRemaining ?? null, reason: 'ALLOW', upgradePath: null };
}
