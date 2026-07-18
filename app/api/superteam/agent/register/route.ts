import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { testMemoryStore } from '@/lib/superteam/test-store';
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

    if (!agentName) {
      return NextResponse.json(
        { error: 'agentName required' },
        { status: 400 }
      );
    }

    // Generate mock registration data (since we're in test mode)
    const mockRegistration = {
      agentId: `agent_${Date.now()}_${generateRandomString(7)}`,
      claimCode: `CLAIM_${generateRandomString(6).toUpperCase()}`,
      apiKey: `sk_${generateRandomString(18)}`,
      username: agentName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 30),
    };

    // Try to store in Supabase (with fallback)
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase.from('dsg_agents').insert({
        id: mockRegistration.agentId,
        name: agentName,
        api_key: mockRegistration.apiKey,
        claim_code: mockRegistration.claimCode,
        username: mockRegistration.username,
        status: 'active',
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
      }

      console.log(`✅ Agent stored in Supabase: ${mockRegistration.agentId}`);
    } catch (dbError) {
      // Fallback to memory store if DB unavailable
      console.warn(
        `⚠️ Supabase unavailable, using memory store: ${String(dbError).slice(0, 100)}`
      );
      testMemoryStore.setAgent({
        id: mockRegistration.agentId,
        name: agentName,
        apiKey: mockRegistration.apiKey,
        claimCode: mockRegistration.claimCode,
        username: mockRegistration.username,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({
      success: true,
      registration: {
        agentId: mockRegistration.agentId,
        username: mockRegistration.username,
        claimCode: mockRegistration.claimCode,
        // Never return API key to client
      },
      _testMode: process.env.NODE_ENV === 'development',
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
