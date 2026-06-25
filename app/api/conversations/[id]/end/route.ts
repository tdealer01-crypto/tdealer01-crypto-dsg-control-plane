import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing Supabase env');
  }
  return createClient(url, serviceRole);
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const { id: conversationId } = resolved;
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const now = new Date().toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('conversations')
      .update({
        status: 'ended',
        ended_at: now,
        ui_edit_enabled: true,
        updated_at: now,
      })
      .eq('id', conversationId)
      .select('id, status, ui_edit_enabled')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Conversation not found or cannot be ended' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        conversationId: data.id,
        status: data.status,
        ui_edit_enabled: data.ui_edit_enabled,
        ended_at: now,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    const message = 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
