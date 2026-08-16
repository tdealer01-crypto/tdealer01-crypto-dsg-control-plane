import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function generateRandomString(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName } = body;

    if (!agentName || typeof agentName !== 'string') {
      return NextResponse.json(
        { error: 'agentName required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[superteam/register] Supabase is not configured');
      return NextResponse.json(
        { error: 'registration_service_unavailable' },
        { status: 503 }
      );
    }

    const registration = {
      agentId: `agent_${Date.now()}_${generateRandomString(7)}`,
      claimCode: `CLAIM_${generateRandomString(6).toUpperCase()}`,
      apiKey: `sk_${generateRandomString(18)}`,
      username: agentName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 30),
    };

    const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from('dsg_agents').insert({
      id: registration.agentId,
      name: agentName,
      api_key: registration.apiKey,
      claim_code: registration.claimCode,
      username: registration.username,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[superteam/register] Supabase insert failed:', error.message);
      return NextResponse.json(
        { error: 'registration_persistence_failed' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      registration: {
        agentId: registration.agentId,
        username: registration.username,
        claimCode: registration.claimCode,
      },
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
