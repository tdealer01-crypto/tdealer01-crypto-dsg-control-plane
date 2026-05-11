import { NextResponse } from 'next/server';
import { getDsgDatabaseTelemetrySnapshot } from '@/lib/dsg/telemetry/database-telemetry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = getDsgDatabaseTelemetrySnapshot();
  return NextResponse.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    format: 'json',
    source: '/api/dsg/telemetry/database',
    data: snapshot,
  });
}
