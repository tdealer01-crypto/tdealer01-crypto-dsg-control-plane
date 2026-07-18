import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName } = body;

    if (!agentName) {
      return NextResponse.json(
        { error: 'agentName required' },
        { status: 400 }
      );
    }

    // Get temp client to register
    const tempClient = new SuperteamAgentClient('temp', agentName);
    const registration = await tempClient.registerAgent(agentName);

    // Store in database
    const supabase = createClient();
    await supabase.from('dsg_agents').insert({
      id: registration.agentId,
      name: agentName,
      api_key: registration.apiKey,
      claim_code: registration.claimCode,
      username: registration.username,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      registration: {
        agentId: registration.agentId,
        username: registration.username,
        claimCode: registration.claimCode,
        // Never return API key to client
      },
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      {
        error: 'Registration failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
