import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { dsgOneClient } from '../../../../lib/dsg-one/client';

export const dynamic = 'force-dynamic';

// POST /api/dsg-bridge/tools
// Calls a governed tool in dsg-one-v1 on behalf of the authenticated user.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.tool) return NextResponse.json({ error: 'tool is required' }, { status: 400 });

  const result = await dsgOneClient.tools.call(session.access_token, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
