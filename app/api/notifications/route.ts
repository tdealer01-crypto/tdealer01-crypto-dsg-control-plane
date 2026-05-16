import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getDbUserId(supabase: Awaited<ReturnType<typeof createClient>>, authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();
  return data?.id ?? null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUserId = await getDbUserId(supabase, user.id);
  if (!dbUserId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '15', 10)));
  const unreadOnly = url.searchParams.get('unread') === 'true' ||
    url.searchParams.get('filter') === 'unread';

  let query = supabase
    .from('notifications')
    .select('id, type, title, message, read, created_at', { count: 'exact' })
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  // Total unread count (always)
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', dbUserId)
    .eq('read', false);

  const { data: rows, count, error } = await query
    .range((page - 1) * limit, page * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifications = (rows ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.message,
    read: n.read,
    createdAt: n.created_at,
    relativeTime: '',
  }));

  return NextResponse.json({
    notifications,
    total: count ?? 0,
    page,
    limit,
    unread: unreadCount ?? 0,
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUserId = await getDbUserId(supabase, user.id);
  if (!dbUserId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.markAll) {
    const { error, count } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', dbUserId)
      .eq('read', false)
      .select('id', { count: 'exact' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: count ?? 0 });
  }

  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'ids must be an array or pass markAll: true' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', dbUserId)
    .in('id', body.ids as string[])
    .select('id', { count: 'exact' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: count ?? 0 });
}
