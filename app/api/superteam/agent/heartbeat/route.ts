import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import {
  getSuperteamSupabase,
  requireSuperteamAgentCredential,
  superteamErrorStatus,
} from '@/lib/superteam/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const agentId = new URL(request.url).searchParams.get('agentId')?.trim();
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

    const supabase = getSuperteamSupabase();
    const { agent, apiKey } = await requireSuperteamAgentCredential(supabase, agentId);
    const heartbeatAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('dsg_agents')
      .update({ last_heartbeat: heartbeatAt })
      .eq('id', agentId);
    if (updateError) throw new Error(`SUPERTEAM_HEARTBEAT_PERSIST_FAILED:${updateError.message}`);

    const { data: lastSubmission, error: submissionError } = await supabase
      .from('agent_submissions')
      .select('submitted_at,status')
      .eq('agent_id', agentId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (submissionError) {
      throw new Error(`SUPERTEAM_SUBMISSION_LOOKUP_FAILED:${submissionError.message}`);
    }

    let status: 'ok' | 'degraded' = 'ok';
    let superteamHealth: unknown = null;
    let externalError: string | null = null;
    try {
      const client = new SuperteamAgentClient(apiKey, agent.name);
      const health = await client.getHeartbeat();
      superteamHealth = health.data ?? null;
      if (!health.success) {
        status = 'degraded';
        externalError = 'SUPERTEAM_HEALTH_CHECK_FAILED';
      }
    } catch (error) {
      status = 'degraded';
      externalError = 'SUPERTEAM_HEALTH_CHECK_FAILED';
      console.error('[superteam/heartbeat] external health check failed:', error);
    }

    return NextResponse.json({
      success: status === 'ok',
      persisted: true,
      heartbeat: {
        status,
        agentId,
        agentName: agent.name,
        time: heartbeatAt,
        lastSubmission: lastSubmission ?? null,
        superteamHealth,
        externalError,
      },
    }, { status: status === 'ok' ? 200 : 503 });
  } catch (error) {
    return handleApiError('superteam/heartbeat', error, { status: superteamErrorStatus(error) });
  }
}
