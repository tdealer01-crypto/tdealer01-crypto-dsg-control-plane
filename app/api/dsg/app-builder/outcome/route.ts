import { NextResponse } from 'next/server';
import { createDsgOutcomePlan, parseDsgOutcomeIntake } from '@/lib/dsg/app-builder/outcome-intake';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseDsgOutcomeIntake(body);
  if ('error' in parsed) {
    return NextResponse.json(parsed, { status: parsed.error.code === 'OUTCOME_GOAL_REQUIRED' ? 400 : 422 });
  }
  return NextResponse.json(createDsgOutcomePlan(parsed));
}
