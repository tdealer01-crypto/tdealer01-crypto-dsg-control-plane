import { NextResponse } from 'next/server';
import { getDsgDatabaseTelemetrySnapshot } from '@/lib/dsg/telemetry/database-telemetry';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getDsgDatabaseTelemetrySnapshot());
}
