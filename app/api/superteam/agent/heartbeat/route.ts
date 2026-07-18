import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';

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

    // Get agent from DB
    const supabase = createClient();
    const { data: agent, error: fetchError } = await supabase
      .from('dsg_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get recent activity
    const { data: lastSubmission } = await supabase
      .from('agent_submissions')
      .select('submitted_at')
      .eq('agent_id', agentId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    // Determine status
    let status: 'ok' | 'degraded' | 'blocked' = 'ok';
    let lastAction = 'monitoring listings';

    if (!agent.api_key) {
      status = 'blocked';
      lastAction = 'error: missing api_key';
    } else if (lastSubmission) {
      lastAction = `last submission: ${new Date(lastSubmission.submitted_at).toISOString()}`;
    }

    const heartbeat = {
      status,
      agentName: agent.name,
      time: new Date().toISOString(),
      version: 'earn-agent-mvp',
      capabilities: ['register', 'listings', 'submit', 'claim'],
      lastAction,
      nextAction: 'discovering opportunities',
    };

    // Update last_heartbeat
    await supabase
      .from('dsg_agents')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', agentId);

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
