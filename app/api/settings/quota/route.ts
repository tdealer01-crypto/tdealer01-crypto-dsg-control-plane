import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getEffectiveExecutionQuotaForOrg, buildQuotaSummary } from '../../../../lib/billing/quota-policy';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store, max-age=0',
};

// Read-only quota policy surface. Additive route: does NOT enforce or mutate
// quota. Existing enforcement lives in app/api/usage and app/api/execute on
// main; this endpoint only reports the effective policy + a best-effort
// current-usage count so operators can see their plan limits.
export async function GET() {
  const access = await requireOrgRole(['org_admin', 'billing_admin', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: access.error || 'Forbidden' }, { status: access.status, headers: PRIVATE_HEADERS });

  const admin = getSupabaseAdmin();
  const policy = await getEffectiveExecutionQuotaForOrg(access.orgId, admin);

  // Best-effort current execution count for the org over the policy window.
  // usage_counters tracks executions per billing_period; degrade to 0 on error.
  let currentExecutions = 0;
  const { data } = await admin
    .from('usage_counters')
    .select('executions')
    .eq('org_id', access.orgId);
  if (Array.isArray(data)) {
    currentExecutions = data.reduce((sum, row) => sum + (Number(row.executions) || 0), 0);
  }

  const summary = buildQuotaSummary(policy.planKey, currentExecutions);
  return NextResponse.json(
    { quota: { ...summary, windowDays: policy.windowDays } },
    { headers: PRIVATE_HEADERS },
  );
}
