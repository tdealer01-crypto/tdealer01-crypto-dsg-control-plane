import { orchestrateChat, type OrchestratorInput, type OrchestratorResult } from '@/lib/hermes-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { message?: string; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = String(body?.message ?? '').trim();
  if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

  const input: OrchestratorInput = {
    message,
    conversationHistory: Array.isArray(body?.conversationHistory) ? body.conversationHistory : [],
  };

  let result: OrchestratorResult;
  try {
    result = await orchestrateChat(input);
  } catch (err) {
    const reason = 'Internal server error';
    return Response.json(
      {
        ok: false,
        error: 'orchestration_failed',
        reason,
        response: `Hermes Orchestrator error: ${reason}`,
      },
      { status: 500 }
    );
  }

  const status = result.ok ? 200 : 502;
  return Response.json(
    {
      ok: result.ok,
      response: result.response,
      meta: {
        primaryRole: result.primaryRole,
        agentsUsed: result.agentsUsed,
      },
    },
    { status }
  );
}
