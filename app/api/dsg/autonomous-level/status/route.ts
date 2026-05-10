import { NextResponse } from 'next/server';
import { evaluateDsgAutonomousLevelGate } from '@/lib/dsg/autonomous-level/capability-gate';

export async function GET() {
  return NextResponse.json({ ok: true, data: evaluateDsgAutonomousLevelGate() });
}
