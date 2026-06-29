/**
 * Trinity Execution History API
 * GET /api/trinity/history?agentId=...&limit=20
 *
 * Returns recent job executions from Supabase agent_profiles + job_executions tables.
 * Falls back to empty array when DB is not configured.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      ok: true,
      configured: false,
      executions: [],
      profile: null,
      message: 'Supabase not configured — showing empty history',
    });
  }

  try {
    // Fetch executions
    let execQuery = supabase
      .from('job_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (agentId) execQuery = execQuery.eq('agent_id', agentId);

    const { data: executions, error: execError } = await execQuery;
    if (execError) throw execError;

    // Fetch profile if agentId provided
    let profile = null;
    if (agentId) {
      const { data: profileData } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      profile = profileData;
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      executions: executions ?? [],
      profile,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      configured: true,
      executions: [],
      profile: null,
      error: String(err),
    });
  }
}
