import { NextRequest, NextResponse } from 'next/server';
import { orchestrateChat } from '@/lib/hermes-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const message = String(body.message ?? body.prompt ?? body.input ?? '').trim();
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const conversationHistory = Array.isArray(body.conversationHistory)
      ? (body.conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }>)
      : [];

    const result = await orchestrateChat({ message, conversationHistory });

    return NextResponse.json(
      {
        ok: result.ok,
        response: result.response,
        meta: {
          primaryRole: result.primaryRole,
          agentsUsed: result.agentsUsed,
        },
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: 'orchestration_failed', reason, response: `Hermes Orchestrator error: ${reason}` },
      { status: 500 }
    );
  }
}
