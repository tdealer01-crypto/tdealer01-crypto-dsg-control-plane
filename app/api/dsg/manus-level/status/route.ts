import { NextResponse } from 'next/server';
import { evaluateManusLevelGate } from '@/lib/dsg/manus-level/capability-gate';

export async function GET() {
  return NextResponse.json({ ok: true, data: evaluateManusLevelGate() });
}
