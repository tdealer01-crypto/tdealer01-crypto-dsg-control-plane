import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type AccessResult =
  | { ok: true; orgId: string }
  | { ok: false; status: number; error: string };

async function requireActiveProfile(): Promise<AccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, orgId: String(profile.org_id) };
}

function computeForecast(points: Array<{ utilization: number; alerts_count: number; timestamp: string }>) {
  if (points.length === 0) {
    return {
      next_hour_utilization: null,
      next_hour_alerts: null,
      slope_utilization_per_hour: 0,
      slope_alerts_per_hour: 0,
    };
  }

  const ordered = [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (ordered.length === 1) {
    return {
      next_hour_utilization: ordered[0].utilization,
      next_hour_alerts: ordered[0].alerts_count,
      slope_utilization_per_hour: 0,
      slope_alerts_per_hour: 0,
    };
  }

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const spanHours = Math.max(
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3_600_000,
    1
  );

  const utilizationSlope = (last.utilization - first.utilization) / spanHours;
  const alertSlope = (last.alerts_count - first.alerts_count) / spanHours;

  return {
    next_hour_utilization: Number(Math.max(0, Math.min(1, last.utilization + utilizationSlope)).toFixed(4)),
    next_hour_alerts: Math.max(0, Math.round(last.alerts_count + alertSlope)),
    slope_utilization_per_hour: Number(utilizationSlope.toFixed(4)),
    slope_alerts_per_hour: Number(alertSlope.toFixed(4)),
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireActiveProfile();
    if ('error' in access) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    const supabase = await createClient();
    const url = new URL(request.url);
    const snapshotLimit = Math.min(Number(url.searchParams.get('snapshots') || '24'), 96);
    const readinessLimit = Math.min(Number(url.searchParams.get('readiness') || '24'), 96);

    const [snapshotsRes, readinessRes, alertsRes, trendRes] = await Promise.all([
      supabase
        .from('core_monitor_snapshots')
        .select('id,snapshot_at,readiness_status,readiness_score,allow_rate,block_rate,stabilize_rate,avg_latency_ms,alerts_count,determinism_ok,audit_ok,core_health_ok')
        .eq('org_id', access.orgId)
        .order('snapshot_at', { ascending: false })
        .limit(snapshotLimit),
      supabase
        .from('readiness_history')
        .select('id,recorded_at,status,score,reason_codes,details')
        .eq('org_id', access.orgId)
        .order('recorded_at', { ascending: false })
        .limit(readinessLimit),
      supabase
        .from('alert_events')
        .select('id,level,code,message,status,source,first_seen_at,last_seen_at,occurrence_count,severity_score')
        .eq('org_id', access.orgId)
        .order('last_seen_at', { ascending: false })
        .limit(50),
      supabase
        .from('org_stats_hourly')
        .select('bucket_start,requests_count,allow_rate,block_rate,avg_latency_ms,alerts_count,determinism_ok_ratio,core_ok_ratio')
        .eq('org_id', access.orgId)
        .order('bucket_start', { ascending: false })
        .limit(24),
    ]);

    const firstError = snapshotsRes.error || readinessRes.error || alertsRes.error || trendRes.error;
    if (firstError) {
      return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
    }

    const trendPoints = (trendRes.data || []).map((row) => ({
      timestamp: String(row.bucket_start),
      utilization: Number(row.allow_rate || 0),
      alerts_count: Number(row.alerts_count || 0),
      block_rate: Number(row.block_rate || 0),
      avg_latency_ms: Number(row.avg_latency_ms || 0),
      requests_count: Number(row.requests_count || 0),
      determinism_ok_ratio: row.determinism_ok_ratio,
      core_ok_ratio: row.core_ok_ratio,
    }));

    const forecast = computeForecast(
      trendPoints.map((row) => ({
        timestamp: row.timestamp,
        utilization: row.utilization,
        alerts_count: row.alerts_count,
      }))
    );

    const openAlerts = (alertsRes.data || []).filter((item) => ['open', 'acknowledged'].includes(String(item.status)));
    const criticalOpenAlerts = openAlerts.filter((item) => String(item.level) === 'critical').length;

    const latestSnapshot = snapshotsRes.data?.[0] || null;
    const governanceProof = {
      concept_to_runtime: {
        determinism: {
          concept: 'Deterministic gate decision must remain stable for equivalent state.',
          runtime_signal: latestSnapshot?.determinism_ok ?? null,
          evidence_table: 'core_monitor_snapshots.determinism_ok',
        },
        auditability: {
          concept: 'Every safety-significant event must be traceable and queryable.',
          runtime_signal: openAlerts.length,
          evidence_table: 'alert_events + readiness_history',
        },
        zero_trust: {
          concept: 'No monitor data exposed without org-scoped active identity.',
          runtime_signal: true,
          evidence_table: 'requireActiveProfile() in this route',
        },
        formal_reasoning: {
          concept: 'Formal gate theorem claims are consumed as runtime checks, not narrative only.',
          runtime_signal: latestSnapshot?.audit_ok ?? null,
          evidence_table: 'core_monitor_snapshots.audit_ok + determinism_ok',
        },
      },
      narrative: [
        'Concept layer: DSG core verified artifact asserts determinism, safety invariance, and bounded execution.',
        'Runtime layer: monitor snapshots persist readiness and determinism health by org/time.',
        'Control layer: alert persistence keeps incident memory across sessions for audit replay.',
      ],
    };

    return NextResponse.json({
      ok: true,
      org_id: access.orgId,
      snapshot_history: snapshotsRes.data || [],
      readiness_history: readinessRes.data || [],
      alert_persistence: {
        total_recent: (alertsRes.data || []).length,
        open_recent: openAlerts.length,
        critical_open: criticalOpenAlerts,
        items: alertsRes.data || [],
      },
      trends: trendPoints,
      forecast,
      governance_proof: governanceProof,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-monitor-collector-token');
    const expected = process.env.MONITOR_COLLECTOR_TOKEN;

    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized collector call' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      org_id?: string;
      snapshot?: Record<string, unknown>;
      readiness?: Record<string, unknown>;
      alert?: Record<string, unknown>;
      trend?: Record<string, unknown>;
    };

    if (!body.org_id) {
      return NextResponse.json({ ok: false, error: 'org_id is required' }, { status: 400 });
    }

    const supabase = await createClient();

    if (body.snapshot) {
      await supabase.from('core_monitor_snapshots').insert({ org_id: body.org_id, ...body.snapshot });
    }

    if (body.readiness) {
      await supabase.from('readiness_history').insert({ org_id: body.org_id, ...body.readiness });
    }

    if (body.alert) {
      await supabase.from('alert_events').insert({ org_id: body.org_id, ...body.alert });
    }

    if (body.trend) {
      await supabase.from('org_stats_hourly').insert({ org_id: body.org_id, ...body.trend });
    }

    return NextResponse.json({ ok: true, collected_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
