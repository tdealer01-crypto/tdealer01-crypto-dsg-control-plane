import { NextResponse } from 'next/server';
import { routeAgentCommand } from '@/lib/dsg/agent-runtime/command-router';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    command?: string;
    context?: string;
    userBenefit?: string;
  } | null;

  if (!body?.command) {
    return NextResponse.json({ ok: false, error: { message: 'AGENT_COMMAND_REQUIRED' } }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      data: routeAgentCommand({
        command: body.command,
        context: body.context,
        userBenefit: body.userBenefit,
      }),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { message: error instanceof Error ? error.message : 'AGENT_COMMAND_ROUTE_FAILED' },
    }, { status: 400 });
  }
}
