/**
 * Trinity AI System Status
 * GET /api/trinity/status
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const hasDb = Boolean(supabase);
  const liveSettlementEnabled = process.env.TRINITY_ENABLE_LIVE_SOL_TRANSFER === 'true';

  let stats = {
    discovered: 0,
    claimed: 0,
    inProgress: 0,
    submitted: 0,
    verified: 0,
    paid: 0,
  };

  if (supabase) {
    const { data } = await supabase
      .from('trinity_jobs')
      .select('status')
      .eq('org_id', process.env.TRINITY_DEFAULT_ORG_ID || 'default-org');

    for (const row of data ?? []) {
      if (row.status === 'discovered') stats.discovered += 1;
      if (row.status === 'claimed') stats.claimed += 1;
      if (row.status === 'in_progress') stats.inProgress += 1;
      if (row.status === 'submitted') stats.submitted += 1;
      if (row.status === 'verified') stats.verified += 1;
      if (row.status === 'paid') stats.paid += 1;
    }
  }

  const m1Ready = hasDb && stats.verified > 0;
  const m2Ready = m1Ready && liveSettlementEnabled && stats.paid > 0;

  return NextResponse.json({
    ok: true,
    system: 'Trinity AI Multi-Agent System (Trinity6 with Agent OS)',
    version: '6.0',
    agents: {
      Mind: { status: 'registered', role: 'Job discovery across live bounty sources' },
      Hand: { status: 'registered', role: 'Work execution and deliverable generation' },
      Eye: { status: 'registered', role: 'Quality verification and severity-aware checks' },
      Nerve: { status: 'registered', role: 'Payment settlement and reputation management' },
      Spine: { status: 'registered', role: 'Orchestration, governance gates, and audit trail' },
      AgentOS: { status: 'registered', role: 'Dynamic agent coordination, memory, routing, executive decisions' },
    },
    governance: {
      policyVersion: '2.0',
      constraintsEnforced: 7,
      unsupportedMapsTo: 'REVIEW_OR_BLOCK',
      agentOSEnabled: true,
      orchestrationLevel: 'Trinity6',
    },
    milestones: {
      M1: { name: 'Production Cutover', status: m1Ready ? 'READY' : 'NO-GO' },
      M2: { name: 'Hardening + Launch', status: m2Ready ? 'READY' : 'NO-GO' },
    },
    flowStats: stats,
    settlement: {
      liveTransferEnabled: liveSettlementEnabled,
      noGoReason: liveSettlementEnabled ? null : 'TRINITY_ENABLE_LIVE_SOL_TRANSFER is not true',
    },
    checkedAt: new Date().toISOString(),
  });
}
