import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { dsgOneClient } from '../../../../lib/dsg-one/client';

export const dynamic = 'force-dynamic';

// POST /api/dsg-bridge/agent-chat
// Routes a chat message to the dsg-one-v1 agent using the caller's Supabase session token.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await dsgOneClient.agent.chat(session.access_token, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data);
}
