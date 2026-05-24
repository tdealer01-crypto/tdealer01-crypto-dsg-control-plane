import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

// Triggered every 5 minutes. Checks if dsg-one-v1 orchestrator has pending goals to dispatch.
// Pings the orchestrator health endpoint and logs status as evidence.
export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;

  const dsgOneUrl = process.env.DSG_ONE_V1_URL ?? 'https://dsg-one-v1.vercel.app';
  const startedAt = new Date().toISOString();

  try {
    const response = await fetch(`${dsgOneUrl}/api/dsg/agents/orchestrator`, {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    const body = response.ok ? await response.json() : null;

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      orchestratorReachable: response.ok,
      agentDescription: body?.description ?? null,
      checkedAt: startedAt,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      orchestratorReachable: false,
      error: String(err),
      checkedAt: startedAt,
      completedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
