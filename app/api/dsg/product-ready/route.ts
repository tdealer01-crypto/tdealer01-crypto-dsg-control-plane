import {NextResponse} from 'next/server';
import {assessProductReadiness} from '@/lib/dsg/product-ready/readiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const report = assessProductReadiness();
  const status = report.level === 'BLOCKED' ? 503 : 200;
  return NextResponse.json({ok: report.level !== 'BLOCKED', data: report}, {status});
}
