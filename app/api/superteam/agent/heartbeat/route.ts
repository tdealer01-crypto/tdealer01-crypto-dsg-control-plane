import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
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

    let apiKey: string | null = null;
    let agentName = 'test-agent';
    let status: 'ok' | 'degraded' | 'blocked' = 'ok';
    let lastAction = 'monitoring listings';
    let superteamHealth = null;

    // Try Supabase first
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: agent, error: agentError } = await supabase
        .from('dsg_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        console.warn(`Agent lookup error: ${agentError?.message}`);
        throw new Error('Agent not found in database');
      }

      apiKey = agent.api_key;
      agentName = agent.name;

      if (!agent.api_key) {
        status = 'blocked';
        lastAction = 'error: missing api_key';
      }

      // Update heartbeat
      const { error: updateError } = await supabase
        .from('dsg_agents')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', agentId);

      if (updateError) {
        console.warn(`Heartbeat update error: ${updateError.message}`);
      }

      // Try to get last submission
      const { data: lastSubmission } = await supabase
        .from('agent_submissions')
        .select('submitted_at')
        .eq('agent_id', agentId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSubmission) {
        lastAction = `last submission: ${new Date(lastSubmission.submitted_at).toISOString()}`;
      }
    } catch (e) {
      console.warn(`Supabase unavailable, using memory fallback: ${String(e).slice(0, 100)}`);
      // Memory fallback - agent exists if we've seen it before
      const memAgent = testMemoryStore.getAgent(agentId);
      if (!memAgent) {
        return NextResponse.json(
          { error: 'Agent not found', agentId },
          { status: 404 }
        );
      }
      apiKey = memAgent.apiKey;
      agentName = memAgent.name;
      lastAction = 'monitoring listings (memory store)';
    }

    // Check Superteam API health if API key exists
    if (apiKey && status !== 'blocked') {
      try {
        const client = new SuperteamAgentClient(apiKey, agentName);
        const healthCheck = await client.getHeartbeat();
        superteamHealth = healthCheck.data;

        if (!healthCheck.success) {
          status = 'degraded';
          lastAction = `Superteam API: ${healthCheck.error}`;
        }
      } catch (error) {
        console.warn('Superteam health check failed:', String(error).slice(0, 100));
        status = 'degraded';
        lastAction = 'Superteam API unreachable';
      }
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
      superteamHealth,
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
