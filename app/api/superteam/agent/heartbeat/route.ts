import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    let agentName = 'test-agent';
    let status: 'ok' | 'degraded' | 'blocked' = 'ok';
    let lastAction = 'monitoring listings';

    // Try Supabase first
    try {
      const supabase = await createClient();
      const { data: agent } = await (supabase
        .from('dsg_agents' as any)
        .select('*')
        .eq('id', agentId)
        .single() as any);

      if (agent) {
        agentName = agent.name;

        if (!agent.api_key) {
          status = 'blocked';
          lastAction = 'error: missing api_key';
        }

        // Update heartbeat
        await (supabase
          .from('dsg_agents' as any)
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', agentId) as any);

        // Try to get last submission
        const { data: lastSubmission } = await (supabase
          .from('agent_submissions' as any)
          .select('submitted_at')
          .eq('agent_id', agentId)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single() as any);

        if (lastSubmission) {
          lastAction = `last submission: ${new Date(lastSubmission.submitted_at).toISOString()}`;
        }
      } else {
        return NextResponse.json(
          { error: 'Agent not found', agentId },
          { status: 404 }
        );
      }
    } catch (e) {
      console.warn('Supabase unavailable, using memory fallback');
      // Memory fallback - agent exists if we've seen it before
      const memAgent = testMemoryStore.getAgent(agentId);
      if (!memAgent) {
        return NextResponse.json(
          { error: 'Agent not found', agentId },
          { status: 404 }
        );
      }
      agentName = memAgent.name;
      lastAction = 'monitoring listings (memory store)';
    }

    // Record heartbeat
    testMemoryStore.recordHeartbeat(agentId);

    const heartbeat = {
      status,
      agentName,
      time: new Date().toISOString(),
      version: 'earn-agent-mvp',
      capabilities: ['register', 'listings', 'submit', 'claim'],
      lastAction,
      nextAction: 'discovering opportunities',
    };

    return NextResponse.json({ success: true, heartbeat });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      {
        error: 'Heartbeat failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
