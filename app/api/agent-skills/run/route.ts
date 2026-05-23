import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { readSkillsLock } from '@/lib/agent-skills/lock-skill';
import { runSkillAction } from '@/lib/agent-skills/run-skill-action';

export async function GET(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:read');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const lock = await readSkillsLock();
  return NextResponse.json({
    ok: true,
    data: {
      version: lock.version,
      updatedAt: lock.updatedAt,
      skills: Object.entries(lock.skills).map(([id, entry]) => ({
        id,
        source: entry.source,
        status: entry.status,
        riskLevel: entry.riskLevel,
        description: entry.description,
        registeredAt: entry.registeredAt,
      })),
    },
  });
}

export async function POST(req: Request) {
  try {
    await requireVerifiedDsgActor(req.headers, 'skill:execute');
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_REQUIRED' } }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    skillId?: string;
    goal?: string;
    args?: Record<string, unknown>;
  } | null;

  if (!body?.skillId?.trim() || !body?.goal?.trim()) {
    return NextResponse.json(
      { ok: false, error: { code: 'SKILL_ID_AND_GOAL_REQUIRED' } },
      { status: 400 },
    );
  }

  const result = await runSkillAction({
    skillId: body.skillId.trim(),
    goal: body.goal.trim(),
    args: body.args,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: result.gateReason ?? 'SKILL_GATE_BLOCKED' },
        data: { auditId: result.auditId, gateStatus: result.gateStatus, simulated: result.simulated },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      skillId: result.skillId,
      gateStatus: result.gateStatus,
      auditId: result.auditId,
      simulated: result.simulated,
      note: 'Gate ALLOW. Execution is simulated — live skill execution requires a connected runtime sandbox.',
    },
  });
}
