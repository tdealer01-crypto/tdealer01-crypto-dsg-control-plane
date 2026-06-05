import { NextResponse } from 'next/server';
import { getAccessibilityQaReport } from '@/lib/dsg/marketplace/accessibility-qa';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getAccessibilityQaReport());
}
