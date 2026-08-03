/**
 * Revenue readiness report.
 *
 * Answers one question in a single call: "what is stopping this deployment
 * from turning a governed execution into an invoiced dollar?"
 *
 * Reports environment variables by NAME only — never values, never prefixes,
 * never lengths. The DB counters are aggregate only; no customer rows are
 * returned.
 */
import { getSupabaseAdmin } from '../supabase-server';

/** Env vars that must be present before any charge can be raised. */
const REQUIRED_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_METER_EVENT_NAME',
  'CRON_SECRET',
  // getSupabaseAdmin() reads both of these. Checking only the service-role key
  // let the report call Supabase satisfied while every query still failed on a
  // missing URL — precisely the guesswork this endpoint exists to remove.
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/** Env vars that unlock specific revenue features but do not block the core loop. */
const OPTIONAL_ENV = [
  'STRIPE_METER_ID',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_BUSINESS',
  'OVERAGE_RATE_USD',
] as const;

/** Cron paths declared in vercel.json that keep the revenue loop moving. */
const REVENUE_CRONS = [
  '/api/cron/flush-meter-outbox',
  '/api/cron/reconcile-meter',
  '/api/cron/usage-alerts',
  '/api/cron/trial-invite',
] as const;

export type EnvPresence = Record<string, boolean>;

export type PipelineCounts = {
  billingCustomers: number;
  outboxPending: number;
  outboxFailed: number;
  outboxSent: number;
  reachable: boolean;
  detail?: string;
};

export type RevenueReadinessReport = {
  ok: boolean;
  stage: 'blocked' | 'configured-idle' | 'flowing';
  env: {
    required: EnvPresence;
    optional: EnvPresence;
    missingRequired: string[];
  };
  pipeline: PipelineCounts;
  crons: { declared: string[] };
  blockers: string[];
  timestamp: string;
};

function presence(names: readonly string[]): EnvPresence {
  const out: EnvPresence = {};
  for (const name of names) {
    const raw = process.env[name];
    out[name] = typeof raw === 'string' && raw.trim().length > 0;
  }
  return out;
}

async function countCustomers(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('billing_customers')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countOutbox(status: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('billing_meter_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function readPipeline(): Promise<PipelineCounts> {
  try {
    const [billingCustomers, outboxPending, outboxFailed, outboxSent] = await Promise.all([
      countCustomers(),
      countOutbox('pending'),
      countOutbox('failed'),
      countOutbox('sent'),
    ]);
    return { billingCustomers, outboxPending, outboxFailed, outboxSent, reachable: true };
  } catch (error) {
    return {
      billingCustomers: 0,
      outboxPending: 0,
      outboxFailed: 0,
      outboxSent: 0,
      reachable: false,
      detail: error instanceof Error ? error.message : 'database unreachable',
    };
  }
}

export async function getRevenueReadiness(): Promise<RevenueReadinessReport> {
  const required = presence(REQUIRED_ENV);
  const optional = presence(OPTIONAL_ENV);
  const missingRequired = Object.entries(required)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  const pipeline = await readPipeline();
  const blockers: string[] = [];

  for (const name of missingRequired) {
    blockers.push(`env ${name} is not set — set it in the deployment environment`);
  }

  if (!pipeline.reachable) {
    blockers.push('billing tables unreachable — cannot confirm pipeline state');
  } else if (pipeline.billingCustomers === 0) {
    blockers.push(
      'billing_customers is empty — no org has completed Stripe Checkout, so meterExecution() exits early and nothing is ever billed',
    );
  }

  if (pipeline.outboxFailed > 0) {
    blockers.push(
      `${pipeline.outboxFailed} meter event(s) in failed state — run /api/cron/reconcile-meter?requeue=true`,
    );
  }

  // Stage reflects how far the money actually travels today, not intent.
  let stage: RevenueReadinessReport['stage'];
  if (missingRequired.length > 0 || !pipeline.reachable) {
    stage = 'blocked';
  } else if (pipeline.outboxSent > 0) {
    stage = 'flowing';
  } else {
    stage = 'configured-idle';
  }

  return {
    ok: blockers.length === 0,
    stage,
    env: { required, optional, missingRequired },
    pipeline,
    crons: { declared: [...REVENUE_CRONS] },
    blockers,
    timestamp: new Date().toISOString(),
  };
}
