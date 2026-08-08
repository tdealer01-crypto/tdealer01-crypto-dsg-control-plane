import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig } from '@/lib/dsg/server/supabase-rpc';
import {
  LaunchpadLaunchRow,
  mapLaunchpadRow,
  parseLaunchpadSections,
} from '@/lib/dsg/launchpad/types';

function errorStatus(message: string): number {
  if (message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED') return 403;
  if (message === 'LAUNCHPAD_NOT_FOUND') return 404;
  if (message.startsWith('LAUNCHPAD_INVALID_')) return 400;
  return 500;
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function mutateLaunch(
  method: 'PATCH' | 'DELETE',
  id: string,
  workspaceId: string,
  body?: Record<string, unknown>,
): Promise<LaunchpadLaunchRow> {
  const config = getDsgSupabaseRpcConfig();
  const url = new URL(`${config.url}/rest/v1/dsg_launchpad_launches`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('workspace_id', `eq.${workspaceId}`);

  const response = await fetch(url, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || `LAUNCHPAD_${method}_${response.status}`);

  const rows = text ? (JSON.parse(text) as LaunchpadLaunchRow[]) : [];
  if (!rows[0]) throw new Error('LAUNCHPAD_NOT_FOUND');
  return rows[0];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'write:generated-apps');
    const { id } = await params;
    if (!validUuid(id)) throw new Error('LAUNCHPAD_INVALID_ID');

    const body = (await req.json().catch(() => null)) as
      | { name?: unknown; sections?: unknown }
      | null;
    if (!body || (body.name === undefined && body.sections === undefined)) {
      throw new Error('LAUNCHPAD_INVALID_PATCH');
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 200) {
        throw new Error('LAUNCHPAD_INVALID_NAME');
      }
      patch.name = body.name.trim();
    }

    if (body.sections !== undefined) {
      const sections = parseLaunchpadSections(body.sections);
      if (!sections) throw new Error('LAUNCHPAD_INVALID_SECTIONS');
      patch.sections = sections;
    }

    const stored = await mutateLaunch('PATCH', id, actor.workspaceId, patch);
    return NextResponse.json({ ok: true, data: { launch: mapLaunchpadRow(stored) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LAUNCHPAD_UPDATE_FAILED';
    return NextResponse.json(
      { ok: false, error: { code: message } },
      { status: errorStatus(message) },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'write:generated-apps');
    const { id } = await params;
    if (!validUuid(id)) throw new Error('LAUNCHPAD_INVALID_ID');

    const deleted = await mutateLaunch('DELETE', id, actor.workspaceId);
    return NextResponse.json({ ok: true, data: { id: deleted.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LAUNCHPAD_DELETE_FAILED';
    return NextResponse.json(
      { ok: false, error: { code: message } },
      { status: errorStatus(message) },
    );
  }
}
