const DEFAULTS = { trial: 1000, pro: 10000, business: 100000, enterprise: 1000000 };

function envInt(name: string, fallback: number) { const n = Number(process.env[name] || ''); return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback; }

export function getPlanQuotaPolicy(planKey: string | null | undefined) {
  const key = String(planKey || 'trial').toLowerCase();
  return {
    planKey: key,
    executionsPer30Days: key === 'trial' ? envInt('QUOTA_TRIAL_EXECUTIONS', DEFAULTS.trial) : key === 'pro' ? envInt('QUOTA_PRO_EXECUTIONS', DEFAULTS.pro) : key === 'business' ? envInt('QUOTA_BUSINESS_EXECUTIONS', DEFAULTS.business) : envInt('QUOTA_ENTERPRISE_EXECUTIONS', DEFAULTS.enterprise),
    windowDays: 30,
  };
}

export async function getEffectiveExecutionQuotaForOrg(orgId: string, adminClient: any) {
  const { data } = await adminClient.from('billing_subscriptions').select('plan_key').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return getPlanQuotaPolicy(data?.plan_key || 'trial');
}

export function isQuotaExceeded(currentExecutions: number, quota: { executionsPer30Days: number }) {
  return currentExecutions >= quota.executionsPer30Days;
}

export function buildQuotaSummary(planKey: string | null | undefined, currentExecutions: number) {
  const policy = getPlanQuotaPolicy(planKey);
  const remaining = Math.max(0, policy.executionsPer30Days - currentExecutions);
  return { planKey: policy.planKey, executionsPer30Days: policy.executionsPer30Days, currentExecutions, remaining, nearLimit: currentExecutions >= Math.floor(policy.executionsPer30Days * 0.8), exceeded: isQuotaExceeded(currentExecutions, policy) };
}
