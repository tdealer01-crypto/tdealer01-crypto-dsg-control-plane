import { getDSGCoreConfig, getDSGCoreHealth } from '../dsg-core';
import { getSupabaseAdmin } from '../supabase-server';

type CheckResult = {
  ok: boolean;
  detail?: string;
};

export type ReadinessReport = {
  ok: boolean;
  checks: {
    env: CheckResult;
    nextAuthSecret: CheckResult;
    supabaseServiceRole: CheckResult;
    dsgCoreConfig: CheckResult;
    dsgCoreHealth: CheckResult;
    financeGovernanceSurface: CheckResult;
  };
  timestamp: string;
};

function buildCheck(ok: boolean, detail?: string): CheckResult {
  return { ok, ...(detail ? { detail } : {}) };
}

export async function getDeploymentReadiness(): Promise<ReadinessReport> {
  const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DSG_CORE_MODE'];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  const envCheck = buildCheck(missingEnv.length === 0, missingEnv.length ? `missing:${missingEnv.join(',')}` : undefined);

  const nextAuthSecret = buildCheck(Boolean(process.env.NEXTAUTH_SECRET), process.env.NEXTAUTH_SECRET ? undefined : 'NEXTAUTH_SECRET missing');

  let supabaseServiceRole = buildCheck(false, 'not_checked');
  try {
    const admin = getSupabaseAdmin() as any;
    const { error } = await admin.from('organizations').select('id').limit(1);
    supabaseServiceRole = buildCheck(!error, error?.message);
  } catch (error) {
    supabaseServiceRole = buildCheck(false, error instanceof Error ? error.message : 'supabase_unreachable');
  }

  let dsgCoreConfig = buildCheck(false, 'not_checked');
  let dsgCoreHealth = buildCheck(false, 'not_checked');

  try {
    const config = getDSGCoreConfig();
    const missingRemoteUrl = config.mode === 'remote' && !config.url;
    dsgCoreConfig = buildCheck(!missingRemoteUrl, missingRemoteUrl ? 'DSG_CORE_URL missing for remote mode' : undefined);

    const health = await getDSGCoreHealth() as Record<string, unknown>;
    dsgCoreHealth = buildCheck(Boolean(health.ok), health.ok ? undefined : String(health.error ?? 'core_unreachable'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'dsg_core_unreachable';
    dsgCoreConfig = buildCheck(false, message);
    dsgCoreHealth = buildCheck(false, message);
  }

  const financeGovernanceSurface = buildCheck(
    Boolean(process.env.DSG_FINANCE_GOVERNANCE_ENABLED ?? 'true'),
    process.env.DSG_FINANCE_GOVERNANCE_ENABLED === 'false' ? 'finance_governance_disabled' : undefined
  );

  const checks = {
    env: envCheck,
    nextAuthSecret,
    supabaseServiceRole,
    dsgCoreConfig,
    dsgCoreHealth,
    financeGovernanceSurface,
  };

  return {
    ok: Object.values(checks).every((check) => check.ok),
    checks,
    timestamp: new Date().toISOString(),
  };
}
