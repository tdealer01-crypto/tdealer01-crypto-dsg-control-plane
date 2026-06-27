import { NextResponse } from 'next/server';
import { generateDraftPlan, validatePlannerInput } from '../../../../../../lib/dsg/planner/generate';
import { requireDsgAuth, dsgAuthError } from "../../../../../../lib/dsg/auth/require-dsg-auth";


export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const body = await request.json().catch(() => null);
  const input = validatePlannerInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'invalid_planner_request' }, { status: 400 });
  }

  const result = await generateDraftPlan(input);
  return NextResponse.json(result);
}
