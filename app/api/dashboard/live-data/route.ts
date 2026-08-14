import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { handleApiError } from '../../../../lib/security/api-error';
import { getSupabaseServerCredential } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

type DashboardAgentStatusRow = {
  org_id: string;
  agent_id: string;
  name: string;
  configured_status: string;
  last_used_at: string | null;
  last_execution_at: string | null;
  actions_today: number;
  actions_this_month: number;
  monthly_limit: number;
  avg_latency_ms_24h: number | null;
  metadata: unknown;
};

type DashboardPolicyDecisionRow = {
  org_id: string;
  id: string;
  decision_at: string;
  agent_id: string | null;
  source: string | null;
  provider: string | null;
  policy: string | null;
  decision: string;
  latency_ms: number | null;
  proof_id: string | null;
  reason: string | null;
  metadata: unknown;
};

type DashboardActivityFeedRow = {
  org_id: string;
  id: string;
  created_at: string;
  agent_id: string | null;
  agent: string | null;
  action: string | null;
  result: string | null;
  duration_ms: string | null;
  detail: string | null;
  evidence_hash: string | null;
  policy_version: string | null;
  metadata: unknown;
};

type DashboardOverviewKpisRow = {
  org_id: string;
  total_agents: number;
  configured_active_agents: number;
  executions_today: number;
  executions_this_month: number;
  allow_today: number;
  block_today: number;
  avg_latency_ms_today: number | null;
  configured_monthly_limit: number;
  latest_billing_period: string | null;
  metered_executions: number;
  metered_amount_usd: number;
  monthly_revenue_usd: number | null;
  monthly_revenue_verified: boolean;
  monthly_revenue_verification_note: string | null;
};

type DashboardViewsDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: {
      dashboard_agent_status: {
        Row: DashboardAgentStatusRow;
        Relationships: [];
      };
      dashboard_policy_decisions: {
        Row: DashboardPolicyDecisionRow;
        Relationships: [];
      };
      dashboard_activity_feed: {
        Row: DashboardActivityFeedRow;
        Relationships: [];
      };
      dashboard_overview_kpis: {
        Row: DashboardOverviewKpisRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function getDashboardDataClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serverCredential = getSupabaseServerCredential();

  if (!url || !serverCredential) {
    throw new Error('Missing Supabase server environment variables');
  }

  return createClient<DashboardViewsDatabase>(url, serverCredential, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'dsg-control-plane-dashboard-live-data',
      },
    },
  });
}

function parseLimit(request: Request) {
  const raw = Number.parseInt(new URL(request.url).searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

export async function GET(request: Request) {
  try {
    const access = await requireOrgPermission('org.view_reports');
    if (access.ok !== true) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const limit = parseLimit(request);
    const admin = getDashboardDataClient();

    const [kpis, agents, decisions, activities] = await Promise.all([
      admin
        .from('dashboard_overview_kpis')
        .select('*')
        .eq('org_id', access.orgId)
        .maybeSingle(),
      admin
        .from('dashboard_agent_status')
        .select('*')
        .eq('org_id', access.orgId)
        .order('last_execution_at', { ascending: false, nullsFirst: false })
        .limit(limit),
      admin
        .from('dashboard_policy_decisions')
        .select('*')
        .eq('org_id', access.orgId)
        .order('decision_at', { ascending: false })
        .limit(limit),
      admin
        .from('dashboard_activity_feed')
        .select('*')
        .eq('org_id', access.orgId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (kpis.error) throw kpis.error;
    if (agents.error) throw agents.error;
    if (decisions.error) throw decisions.error;
    if (activities.error) throw activities.error;

    return NextResponse.json(
      {
        ok: true,
        org_id: access.orgId,
        generated_at: new Date().toISOString(),
        kpis: kpis.data ?? null,
        agents: agents.data ?? [],
        decisions: decisions.data ?? [],
        activities: activities.data ?? [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return handleApiError('api/dashboard/live-data', error);
  }
}
