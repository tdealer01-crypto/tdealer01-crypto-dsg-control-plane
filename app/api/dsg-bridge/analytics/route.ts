import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { dsgOneClient } from '../../../../lib/dsg-one/client';

export const dynamic = 'force-dynamic';

// GET /api/dsg-bridge/analytics
// Fetches usage metrics from dsg-one-v1 to display in the control-plane dashboard.
export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await dsgOneClient.analytics.get(session.access_token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
