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

const READINESS_TIMEOUT_MS = 5_000;
type SupabaseProbeResult = {
  error: { message?: string } | null;
};

function buildCheck(ok: boolean, detail?: string): CheckResult {
  return { ok, ...(detail ? { detail } : {}) };
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = READINESS_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getDeploymentReadiness(): Promise<ReadinessReport> {
  const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DSG_CORE_MODE'];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  const envCheck = buildCheck(missingEnv.length === 0, missingEnv.length ? `missing:${missingEnv.join(',')}` : undefined);

  const nextAuthSecret = buildCheck(Boolean(process.env.NEXTAUTH_SECRET), process.env.NEXTAUTH_SECRET ? undefined : 'NEXTAUTH_SECRET missing');

  let supabaseServiceRole = buildCheck(false, 'not_checked');
  try {
    const admin = getSupabaseAdmin() as any;
    const probeResult = await withTimeout<SupabaseProbeResult>(
      admin.from('organizations').select('id').limit(1) as Promise<SupabaseProbeResult>,
      'supabase_service_role'
    );
    const error = probeResult.error;
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

    const health = await withTimeout(
      getDSGCoreHealth() as Promise<Record<string, unknown>>,
      'dsg_core_health'
    );
    dsgCoreHealth = buildCheck(Boolean(health.ok), health.ok ? undefined : String(health.error ?? 'core_unreachable'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'dsg_core_unreachable';
    dsgCoreConfig = buildCheck(false, message);
    dsgCoreHealth = buildCheck(false, message);
  }

  const financeGovernanceEnabled = parseBooleanFlag(process.env.DSG_FINANCE_GOVERNANCE_ENABLED, true);
  const financeGovernanceSurface = buildCheck(
    financeGovernanceEnabled,
    financeGovernanceEnabled ? undefined : 'finance_governance_disabled'
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
