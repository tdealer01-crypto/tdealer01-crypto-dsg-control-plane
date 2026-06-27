import { getSupabaseAdmin } from '../supabase-server';

type ReadinessCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  message?: string;
};

type ReadinessResult = {
  ok: boolean;
  service: string;
  checks: ReadinessCheck[];
  timestamp: string;
};

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const REQUIRED_TABLES = [
  'finance_transactions',
  'finance_approval_requests',
  'finance_approval_decisions',
  'finance_governance_audit_ledger',
  'finance_workflow_action_events',
];

function envCheck(name: string): ReadinessCheck {
  return {
    name: `env:${name}`,
    ok: Boolean(process.env[name]),
    required: true,
    message: process.env[name] ? 'configured' : 'missing',
  };
}

async function tableCheck(supabase: any, table: string): Promise<ReadinessCheck> {
  const { error } = await supabase.from(table).select('id').limit(1);

  return {
    name: `table:${table}`,
    ok: !error,
    required: true,
    message: error ? error.message : 'reachable',
  };
}

export async function checkFinanceGovernanceReadiness(): Promise<ReadinessResult> {
  const checks: ReadinessCheck[] = REQUIRED_ENV.map(envCheck);
  const envOk = checks.every((check) => check.ok);

  if (!envOk) {
    return {
      ok: false,
      service: 'finance-governance',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const supabase = getSupabaseAdmin() as any;
    const tableChecks = await Promise.all(REQUIRED_TABLES.map((table) => tableCheck(supabase, table)));
    checks.push(...tableChecks);
  } catch (error) {
    checks.push({
      name: 'supabase:admin-client',
      ok: false,
      required: true,
      message: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  return {
    ok: checks.filter((check) => check.required).every((check) => check.ok),
    service: 'finance-governance',
    checks,
    timestamp: new Date().toISOString(),
  };
}
