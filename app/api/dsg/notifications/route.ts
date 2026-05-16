import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

export type NotificationType = 'BUILD_COMPLETE' | 'BUILD_FAILED' | 'GOVERNANCE' | 'APPROVAL' | 'SYSTEM';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.message,
    timestamp: row.created_at,
    read: row.read,
  };
}

type RestPatchResponse = { id: string; read: boolean }[];

export async function GET(req: Request) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') ?? 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = 20;

    const config = getDsgSupabaseRpcConfig();

    const params: Record<string, string> = {
      user_id: `eq.${actor.actorId}`,
      select: 'id,type,title,message,read,created_at',
      order: 'created_at.desc',
    };

    // Build filter conditions
    if (filter === 'UNREAD') {
      params.read = 'eq.false';
    } else if (filter === 'BUILDS') {
      params.type = 'in.(BUILD_COMPLETE,BUILD_FAILED)';
    } else if (filter === 'GOVERNANCE') {
      params.type = 'eq.GOVERNANCE';
    } else if (filter === 'SYSTEM') {
      params.type = 'in.(SYSTEM,APPROVAL)';
    }

    const rows = await readDsgRest<NotificationRow[]>(config, 'dsg_notifications', params);
    const allMapped = rows.map(mapNotification);

    // Unread count is always across all notifications for this user (not just the current filter)
    const unreadRows = await readDsgRest<{ id: string }[]>(config, 'dsg_notifications', {
      user_id: `eq.${actor.actorId}`,
      read: 'eq.false',
      select: 'id',
    });
    const unreadCount = unreadRows.length;

    const total = allMapped.length;
    const items = allMapped.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({ ok: true, data: { items, total, unreadCount } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NOTIFICATIONS_FETCH_FAILED';
    const httpStatus = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status: httpStatus });
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const body = (await req.json().catch(() => null)) as { id?: string; markAll?: boolean } | null;
    const config = getDsgSupabaseRpcConfig();
    const baseUrl = `${config.url}/rest/v1/dsg_notifications`;

    if (body?.markAll) {
      // PATCH all unread notifications for this user
      const url = new URL(baseUrl);
      url.searchParams.set('user_id', `eq.${actor.actorId}`);
      url.searchParams.set('read', 'eq.false');

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ read: true }),
        cache: 'no-store',
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `NOTIFICATIONS_PATCH_${res.status}`);
      }

      const updated = (await res.json()) as RestPatchResponse;
      return NextResponse.json({ ok: true, data: { updated: updated.length } });
    }

    if (typeof body?.id === 'string') {
      const url = new URL(baseUrl);
      url.searchParams.set('id', `eq.${body.id}`);
      url.searchParams.set('user_id', `eq.${actor.actorId}`);

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ read: true }),
        cache: 'no-store',
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `NOTIFICATIONS_PATCH_${res.status}`);
      }

      const updated = (await res.json()) as RestPatchResponse;
      if (updated.length === 0) {
        return NextResponse.json(
          { ok: false, error: { code: 'NOTIFICATION_NOT_FOUND' } },
          { status: 404 },
        );
      }

      return NextResponse.json({ ok: true, data: { id: updated[0].id, read: updated[0].read } });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'NOTIFICATIONS_PATCH_INVALID_BODY' } },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NOTIFICATIONS_PATCH_FAILED';
    const httpStatus = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status: httpStatus });
  }
}
