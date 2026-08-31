#!/usr/bin/env npx ts-node
/**
 * Production Deployment GO/NO-GO Gate
 *
 * Azure App Service is the only production authority. This gate verifies the
 * deployed HTTP surface and backing data dependencies without consulting any
 * retired hosting provider.
 */

import { createClient } from '@supabase/supabase-js';

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'TIMEOUT' | 'SKIPPED';
  details: string;
  latency_ms: number;
  error?: string;
}

interface GateDecision {
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  url: string;
  timestamp: string;
  gate_version: string;
  checks: CheckResult[];
  summary: string;
  decision_rationale: string;
  audit_trail: {
    recorded_by: string;
    recorded_at: string;
    recorded_in_db: boolean;
  };
}

const GATE_VERSION = 'v5.1-azure';
const TIMEOUT_MS = 10_000;

function timeoutResult(name: string, start: number, error: unknown): CheckResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    name,
    status: 'TIMEOUT',
    details: `Check timed out or failed: ${message}`,
    latency_ms: Date.now() - start,
    error: message,
  };
}

async function checkJsonEndpoint(
  name: string,
  url: string,
  validate: (body: any) => boolean,
  successDetails: string,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status !== 200) {
      return {
        name,
        status: 'FAIL',
        details: `Endpoint returned HTTP ${response.status}`,
        latency_ms: Date.now() - start,
      };
    }

    const body = await response.json();
    if (!validate(body)) {
      return {
        name,
        status: 'FAIL',
        details: 'Endpoint payload did not satisfy the production contract',
        latency_ms: Date.now() - start,
      };
    }

    return {
      name,
      status: 'PASS',
      details: successDetails,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return timeoutResult(name, start, error);
  }
}

function checkEnvironmentVariables(): CheckResult {
  const start = Date.now();
  const requiredVars = [
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ];
  const missing = requiredVars.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    return {
      name: 'environment_variables',
      status: 'FAIL',
      details: `Missing environment variables: ${missing.join(', ')}`,
      latency_ms: Date.now() - start,
    };
  }

  return {
    name: 'environment_variables',
    status: 'PASS',
    details: `All ${requiredVars.length} required environment variables present`,
    latency_ms: Date.now() - start,
  };
}

async function checkDatabaseConnectivity(supabaseUrl: string): Promise<CheckResult> {
  const start = Date.now();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    return {
      name: 'database_connectivity',
      status: 'SKIPPED',
      details: 'SUPABASE_SERVICE_ROLE_KEY not configured',
      latency_ms: Date.now() - start,
    };
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey);
    const { error } = await client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return {
        name: 'database_connectivity',
        status: 'FAIL',
        details: `Database connectivity failed: ${error.message}`,
        latency_ms: Date.now() - start,
      };
    }

    return {
      name: 'database_connectivity',
      status: 'PASS',
      details: 'Database connectivity verified',
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return timeoutResult('database_connectivity', start, error);
  }
}

async function checkSupabaseMigrationState(supabaseUrl: string): Promise<CheckResult> {
  const start = Date.now();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    return {
      name: 'supabase_migration_state',
      status: 'SKIPPED',
      details: 'SUPABASE_SERVICE_ROLE_KEY not configured',
      latency_ms: Date.now() - start,
    };
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client
      .from('schema_migrations')
      .select('*')
      .eq('success', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        name: 'supabase_migration_state',
        status: 'FAIL',
        details: `Migration query failed: ${error.message}`,
        latency_ms: Date.now() - start,
      };
    }

    if (!data) {
      return {
        name: 'supabase_migration_state',
        status: 'FAIL',
        details: 'No successful migrations found',
        latency_ms: Date.now() - start,
      };
    }

    return {
      name: 'supabase_migration_state',
      status: 'PASS',
      details: `Latest migration applied: ${data.version}`,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return timeoutResult('supabase_migration_state', start, error);
  }
}

async function runProductionGate(productionUrl: string): Promise<GateDecision> {
  const timestamp = new Date().toISOString();
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const checks: CheckResult[] = [];

  console.log(`\nProduction GO/NO-GO Gate ${GATE_VERSION}`);
  console.log(`Target URL: ${productionUrl}`);
  console.log(`Time: ${timestamp}\n`);

  checks.push(checkEnvironmentVariables());
  checks.push(await checkJsonEndpoint(
    'public_health_probe',
    `${productionUrl}/api/health`,
    (body) => body?.ok === true,
    'Health probe returned a healthy production payload',
  ));
  checks.push(await checkJsonEndpoint(
    'readiness_probe',
    `${productionUrl}/api/readiness`,
    (body) => body?.ok === true || body?.ready === true,
    'Readiness probe indicates ready',
  ));
  checks.push(await checkJsonEndpoint(
    'agent_status_probe',
    `${productionUrl}/api/agent/status`,
    (body) => body?.ok === true && typeof body?.commit === 'string' && typeof (body?.environment ?? body?.env) === 'string',
    'Agent status reports live commit and environment metadata',
  ));
  checks.push(await checkDatabaseConnectivity(supabaseUrl));
  checks.push(await checkSupabaseMigrationState(supabaseUrl));

  const failedChecks = checks.filter((check) => check.status === 'FAIL');
  const timeoutChecks = checks.filter((check) => check.status === 'TIMEOUT');
  const skippedChecks = checks.filter((check) => check.status === 'SKIPPED');

  let decision: GateDecision['decision'];
  let summary: string;
  let rationale: string;

  if (failedChecks.length > 0 || timeoutChecks.length > 0) {
    decision = 'NO-GO';
    const blocked = [...failedChecks, ...timeoutChecks].map((check) => check.name);
    summary = `Production NO-GO: ${blocked.length} blocking check(s).`;
    rationale = `Gate blocked by: ${blocked.join(', ')}`;
  } else if (skippedChecks.length > 0) {
    decision = 'REVIEW';
    summary = `Production REVIEW required: ${skippedChecks.length} check(s) skipped.`;
    rationale = `Manual review needed for: ${skippedChecks.map((check) => check.name).join(', ')}`;
  } else {
    decision = 'GO';
    summary = `Production GO: all ${checks.length} checks passed.`;
    rationale = 'All Azure production readiness checks passed.';
  }

  for (const check of checks) {
    console.log(`${check.status.padEnd(7)} ${check.name} (${check.latency_ms}ms) — ${check.details}`);
  }
  console.log(`\n${summary}`);

  return {
    decision,
    url: productionUrl,
    timestamp,
    gate_version: GATE_VERSION,
    checks,
    summary,
    decision_rationale: rationale,
    audit_trail: {
      recorded_by: 'production-gate-script',
      recorded_at: timestamp,
      recorded_in_db: false,
    },
  };
}

async function main() {
  const productionUrl = process.argv[2] || 'https://dsg-control-plane.azurewebsites.net';

  try {
    const url = new URL(productionUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('Production URL must be a clean HTTPS origin');
    }

    const result = await runProductionGate(url.origin);
    console.log('\n--- Machine-readable result (JSON) ---');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.decision === 'GO' ? 0 : 1);
  } catch (error) {
    console.error('Fatal error running production gate:', error);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(2);
});
