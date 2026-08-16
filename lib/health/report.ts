import { getDSGCoreHealth } from '../dsg-core';
import { getSupabaseAdmin } from '../supabase-server';
import { getDeploymentReadiness, type ReadinessReport } from '../deployment/readiness';
import { isRateLimiterConfigured } from '../security/rate-limit';

const HEALTH_TIMEOUT_MS = 5_000;
const UNAVAILABLE_CHECK = { ok: false, detail: 'health_dependency_unavailable' };
type SupabaseProbeResult = {
  error: { message?: string } | null;
};

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<T> {
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

async function probeSupabaseOrganizations(): Promise<SupabaseProbeResult> {
  const admin = getSupabaseAdmin();
  const result = await admin.from('organizations').select('id').limit(1);
  return { error: result.error };
}

function unavailableReadiness(detail: string): ReadinessReport {
  return {
    ok: false,
    checks: {
      env: UNAVAILABLE_CHECK,
      nextAuthSecret: UNAVAILABLE_CHECK,
      supabaseServiceRole: { ok: false, detail },
      dsgCoreConfig: { ok: false, detail },
      dsgCoreHealth: { ok: false, detail },
      financeGovernanceSurface: UNAVAILABLE_CHECK,
      financeGovernanceBackend: { ok: false, detail },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds the same report GET /api/health returns, as plain data (no
 * Response object) so it can be called in-process — e.g. by
 * /api/health-check-cron — without an HTTP round-trip back into this
 * same server.
 */
export async function buildHealthReport() {
  const rateLimiterConfigured = isRateLimiterConfigured();

  // Health is an operator/monitoring signal, not an abuse-sensitive action.
  // It must not consume the production rate-limit bucket; otherwise uptime
  // checks can mask a healthy service as HTTP 429. Abuse-sensitive endpoints
  // such as /api/execute remain fail-closed behind the distributed limiter.
  let dbOk = false;
  try {
    const dbResult = await withTimeout(
      probeSupabaseOrganizations(),
      'health_db'
    );
    const dbError = dbResult.error;
    dbOk = !dbError;
  } catch {
    dbOk = false;
  }

  const [coreResult, readinessResult] = await Promise.allSettled([
    withTimeout(getDSGCoreHealth(), 'health_core'),
    withTimeout(getDeploymentReadiness(), 'health_readiness', 7_000),
  ]);

  const core = coreResult.status === 'fulfilled'
    ? coreResult.value
    : {
        ok: false,
        error: coreResult.reason instanceof Error ? coreResult.reason.message : 'core_unreachable',
      };

  const readiness = readinessResult.status === 'fulfilled'
    ? readinessResult.value
    : unavailableReadiness(
        readinessResult.reason instanceof Error ? readinessResult.reason.message : 'readiness_unavailable'
      );

  const coreDetails = core as {
    status?: unknown;
    version?: unknown;
    timestamp?: unknown;
    error?: unknown;
  };

  // Strict mode remains fail-closed (rate limiter must be configured
  // alongside the full check matrix). Non-strict / self-hosted deploys
  // (e.g. Railway commercial service) can operate without the
  // distributed Redis layer — the execute gate still fails closed
  // behind the limiter while health reports as operational.
  const strictReadiness = readBoolean(process.env.READINESS_STRICT,
    process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL));
  // In non-strict mode (self-hosted / Railway commercial deploys) the
  // readiness gate already covers credentials and the environment; a
  // transient DB timeout must not take the whole service offline for
  // monitoring purposes (readiness.ok treats the live Supabase probe as
  // informational and defers to /api/finance-governance/readiness for
  // authoritative DB health). Core/DB probes remain visible in the
  // payload but do not gate health when strict is off.
  const allOk = strictReadiness
    ? core.ok && dbOk && readiness.ok && rateLimiterConfigured
    : readiness.ok;

  // DB connectivity remains visible in the payload even when it does not
  // gate health in non-strict mode.
  const dbGating = strictReadiness && !dbOk;

  const payload = {
    ok: allOk,
    service: 'dsg-control-plane',
    timestamp: new Date().toISOString(),
    core_ok: core.ok,
    db_ok: dbOk,
    error: allOk ? null : (
      dbGating ? 'db_unreachable' :
      (coreDetails.error ?? 'release_not_ready')
    ),
    rateLimiter: {
      ok: rateLimiterConfigured,
      detail: rateLimiterConfigured
        ? 'distributed rate limiter configured; health endpoint does not consume limiter bucket'
        : 'No distributed Redis configured (Upstash REST or REDIS_URL) — execute gate will fail closed',
    },
    core: {
      ok: core.ok && dbOk && readiness.ok,
      status: coreDetails.status ?? null,
      version: coreDetails.version ?? null,
      timestamp: coreDetails.timestamp ?? null,
      error: core.ok ? null : coreDetails.error ?? 'core_unreachable',
    },
    readiness,
  };

  return { payload, status: allOk ? 200 : 503 };
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}