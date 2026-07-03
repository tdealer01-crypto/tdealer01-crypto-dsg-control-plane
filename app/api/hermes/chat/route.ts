import { orchestrateChat, type OrchestratorInput, type OrchestratorResult } from '@/lib/hermes-orchestrator';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { message?: string; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = String(body?.message ?? '').trim();
  if (!message) return Response.json({ error: 'Invalid input' }, { status: 400 });

  const input: OrchestratorInput = {
    message,
    conversationHistory: Array.isArray(body?.conversationHistory) ? body.conversationHistory : [],
  };

  let result: OrchestratorResult;
  try {
    result = await orchestrateChat(input);
  } catch (err) {
    return handleApiError('api/hermes/chat', err, { status: 500 });
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
