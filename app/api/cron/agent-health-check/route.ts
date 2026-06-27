import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AGENT_TYPES = [
  'orchestrator',
  'code-evolution',
  'test-coverage',
  'deploy-monitor',
  'browser-research',
  'security-gate',
] as const;

function authorizeCron(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

// Hourly health check: pings all 6 agent endpoints in dsg-one-v1.
// Records which agents are reachable as evidence.
export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;

  const dsgOneUrl = process.env.DSG_ONE_V1_URL ?? 'https://dsg-one-v1.vercel.app';
  const checkedAt = new Date().toISOString();

  const results = await Promise.allSettled(
    AGENT_TYPES.map(async (agentType) => {
      const start = Date.now();
      const response = await fetch(`${dsgOneUrl}/api/dsg/agents/${agentType}`, {
        method: 'GET',
        signal: AbortSignal.timeout(8_000),
      });
      return {
        agentType,
        ok: response.ok,
        status: response.status,
        durationMs: Date.now() - start,
      };
    }),
  );

  const agents = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { agentType: AGENT_TYPES[i], ok: false, status: 0, durationMs: 0, error: r.reason },
  );

  const allHealthy = agents.every((a) => a.ok);

  return NextResponse.json({
    ok: allHealthy,
    agents,
    checkedAt,
    completedAt: new Date().toISOString(),
    summary: `${agents.filter((a) => a.ok).length}/${AGENT_TYPES.length} agents healthy`,
  });
}
