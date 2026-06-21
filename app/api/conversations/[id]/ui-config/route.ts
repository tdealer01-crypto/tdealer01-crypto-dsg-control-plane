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

async function assertUiEditEnabled(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, status, ui_edit_enabled')
    .eq('id', conversationId)
    .single();

  if (error || !data) {
    return { ok: false as const, status: 404, error: 'Conversation not found' };
  }

  if (!data.ui_edit_enabled) {
    return {
      ok: false as const,
      status: 403,
      error: 'UI config editing is only allowed after the conversation has ended',
    };
  }

  return { ok: true as const };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const conversationId = String(params.id);
    const supabase = getSupabase();

    const guard = await assertUiEditEnabled(supabase, conversationId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('ui_config')
      .eq('id', conversationId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { ok: true, ui_config: data.ui_config ?? {} },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const conversationId = String(params.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const uiConfig = (body.ui_config ?? {}) as Record<string, unknown>;

    if (!uiConfig || typeof uiConfig !== 'object') {
      return NextResponse.json(
        { error: 'ui_config object is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabase();

    const guard = await assertUiEditEnabled(supabase, conversationId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({
        ui_config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select('id, ui_config')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to update ui_config' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { ok: true, conversationId: data.id, ui_config: data.ui_config },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
