/**
 * GET /api/delivery-proof/report/{run_id}
 *
 * Retrieve a delivery proof report by run_id.
 * Public endpoint — shareable via link.
 *
 * Response: delivery_proof_reports row
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ 'run-id': string }> }
) {
  const resolvedParams = await params;
  const runId = decodeURIComponent(resolvedParams['run-id']);

  if (!runId || typeof runId !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid run_id' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('delivery_proof_reports')
      .select('*')
      .eq('run_id', runId)
      .maybeSingle();

    if (error) {
      console.error('Proof report query error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error('Error fetching proof report:', e);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
