import { NextRequest, NextResponse } from 'next/server';
import { runSecurityGate } from '@/skills/security-gate/skill';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionId, agentType, workspaceId, riskLevel, evidenceExists, mockState, requiresApproval } = body as {
      actionId: string;
      agentType: string;
      workspaceId: string;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      evidenceExists: boolean;
      mockState?: boolean;
      requiresApproval?: boolean;
    };

    if (!actionId || !agentType || !workspaceId) {
      return NextResponse.json({ error: 'actionId, agentType, workspaceId required' }, { status: 400 });
    }

    const result = await runSecurityGate({
      actionId,
      agentType,
      workspaceId,
      riskLevel: riskLevel ?? 'low',
      evidenceExists: evidenceExists ?? false,
      mockState: mockState ?? false,
      requiresApproval: requiresApproval ?? false,
    });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    agent: 'security-gate',
    description: 'Gate check for all agent actions. gate_allow required before any execution.',
    truthBoundary: 'Gate evaluates decisions only. Does not execute actions.',
  });
}
