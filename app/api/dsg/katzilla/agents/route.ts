import { NextResponse } from 'next/server';
import { listKatzillaAgents, getKatzillaStatus } from '@/lib/dsg/connectors/katzilla';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = getKatzillaStatus();
    if (!status.configured) {
      return NextResponse.json(
        { ok: false, error: 'KATZILLA_API_KEY_REQUIRED', status },
        { status: 503 },
      );
    }

    const result = await listKatzillaAgents();
    return NextResponse.json({ ok: result.ok, data: result, connector: status }, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'KATZILLA_AGENTS_FAILED' },
      { status: 500 },
    );
  }
}
